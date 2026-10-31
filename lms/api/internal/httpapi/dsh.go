package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// DeepSeek Harness (dsh) en el aula: el comando «aula dsh web» deja la interfaz web de dsh escuchando en el
// puerto 3080 del contenedor del alumno y el LMS la publica en
//
//	/dsh/{sub}/{ruta...}      (todos los métodos y WebSocket)
//
// quitando el prefijo «/dsh/{sub}»: dsh recibe «/{ruta}» (con la query tal cual, donde viaja su token de arranque).
//
// Qué hace:
//   - Autenticación como el resto del LMS (cookie lms_session o Bearer) y el mismo permiso que el Visor
//     (vistaAcceso: el dueño, un admin o un instructor de su grupo). Un alumno NO abre el dsh de otro.
//   - Llega al contenedor igual que el Visor: Aula.Dial(sub, 3080) (relé python3 por «exec -i» a 127.0.0.1:3080), sin IPs a mano.
//   - NO arranca el aula. Si no está corriendo: 503 «aula_apagada». Si está y dsh no contesta: 502 «dsh_no_responde».
//   - Host y Origin llegan intactos (dsh valida --trusted-host y --public-url). Se añaden X-Forwarded-Host/Proto/For.
//   - Cookies: la cabecera Cookie que llega al destino NO lleva la cookie de sesión del LMS («lms_session»; se
//     distingue por su nombre, es la única que el LMS pone) ni Authorization; las demás (las de dsh) pasan.
//     En la respuesta, cada Set-Cookie se acota a Path=/dsh/{sub}/ (si dsh pone «/» o un subpath, se antepone el
//     prefijo), se quita Domain, y Secure se fija solo si la petición original era HTTPS (si dsh lo pedía y era HTTP, se quita). Un Set-Cookie
//     que intente fijar «lms_session» se descarta.
//   - Location: las redirecciones que empiezan por «/» (no «//») ganan el prefijo /dsh/{sub}; las absolutas a
//     otros hosts y las relativas quedan como están.
//   - Sin timeouts de lectura/escritura (el servidor solo fija ReadHeaderTimeout): el WebSocket vive lo que viva;
//     si un lado cierra, ReverseProxy cierra el otro. FlushInterval -1 (SSE y respuestas largas sin buffer).
//     Mientras hay un WebSocket o un SSE abierto se «toca» el aula cada 30 s para que no la apague por inactividad.
//   - Cabeceras: X-Content-Type-Options: nosniff, Referrer-Policy: same-origin y X-Accel-Buffering: no; se quitan Server y X-Powered-By
//     del destino. No se añade CSP ni frame-ancestors; X-Frame-Options es SAMEORIGIN (para que el front del LMS
//     pueda enmarcarlo) salvo que dsh mande el suyo, que manda.
//   - Cuerpos de petición hasta 32 MB (adjuntos).
//   - Única ruta sin sesión: GET/HEAD /dsh/{sub}/manifest.webmanifest, que contesta el propio LMS con una copia fija
//     (ver dshManifiestoJSON) sin tocar el aula.
//   - Registro de acceso mínimo SIN query string (el token de arranque no queda en los logs).
//
// Qué NO hace:
//   - No reescribe cuerpos (HTML/JS): si dsh emitiera URLs absolutas «/algo», romperían bajo el prefijo.
//   - No traduce cookies «__Host-…» (exigen Path=/ y el prefijo las vuelve inválidas: el navegador las rechaza).
//   - No arranca el aula ni el propio dsh.
//
// CSRF: aquí no sirve la regla de authed (escrituras con cookie solo JSON), porque dsh sube adjuntos multipart.
// En su lugar, con cookie y método que escribe (o Upgrade), el Origin debe coincidir con el Host de la petición
// o con el de PublicURL; sin Origin se rechaza solo si Sec-Fetch-Site dice cross-site. Con Bearer no aplica.

const dshPuerto = 3080

// maxDshBody: tope del cuerpo de una petición (adjuntos de dsh). Es variable para poder bajarla en las pruebas.
var maxDshBody int64 = 32 << 20

// dshRespuestaTimeout: tiempo máximo hasta la primera cabecera de respuesta (no afecta al cuerpo ni al WebSocket).
const dshRespuestaTimeout = 5 * time.Minute

func (s *Server) dshProxy(w http.ResponseWriter, r *http.Request) {
	t0 := time.Now()
	sub := r.PathValue("sub")
	nombre := aula.Nombre(sub)
	rutaLog := "-" // la ruta sin el prefijo (el id del alumno no se registra; el aula va por su nombre hash) y sin query
	registrar := func(estado int) {
		slog.Info("dsh", "aula", nombre, "metodo", r.Method, "ruta", rutaLog, "estado", estado, "ms", time.Since(t0).Milliseconds())
	}

	p, err := s.principal(r)
	if err != nil {
		internal(w, err)
		return
	}
	if p == nil {
		if (r.Method == http.MethodGet || r.Method == http.MethodHead) && r.PathValue("ruta") == "manifest.webmanifest" {
			dshManifiesto(w, r)
			rutaLog = "/manifest.webmanifest"
			registrar(200)
			return
		}
		unauthorized(w)
		registrar(401)
		return
	}
	if !s.dshOrigenValido(r, p) {
		writeErr(w, 403, "forbidden", "origen no permitido")
		registrar(403)
		return
	}
	if !s.puedeVerAlumno(r.Context(), p, sub) {
		writeErr(w, 403, "forbidden", "ese dsh es de otra persona")
		registrar(403)
		return
	}
	if !s.aulaListo(w) {
		return
	}

	// Ruta sin el prefijo, conservando la codificación original (%2F, etc.).
	esc := strings.TrimPrefix(r.URL.EscapedPath(), "/dsh/")
	i := strings.IndexByte(esc, '/')
	if i < 0 {
		esc += "/"
		i = len(esc) - 1
	}
	prefijo, resto := "/dsh/"+esc[:i], esc[i:]
	dec, err := url.PathUnescape(resto)
	if err != nil || strings.ContainsRune(dec, 0) || strings.Contains(dec, "\\") || hayPuntos(dec) {
		writeErr(w, 400, "ruta_invalida", "ruta no permitida")
		registrar(400)
		return
	}

	rutaLog = dec
	tocarAula(sub)
	https := isHTTPS(r)
	h := w.Header()
	h.Set("X-Frame-Options", "SAMEORIGIN") // el middleware general pone DENY; el front del LMS enmarca este dsh
	r.Body = http.MaxBytesReader(w, r.Body, maxDshBody)
	upgrade := r.Header.Get("Upgrade") != ""

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.Out.URL = &url.URL{Scheme: "http", Host: "dsh", Path: dec, RawPath: resto, RawQuery: pr.In.URL.RawQuery}
			pr.Out.Host = pr.In.Host // Host original (jmd-learn.online), no el del destino
			pr.Out.Header.Del("Authorization")
			pr.Out.Header.Del("Cookie")
			if c := sinCookieLMS(pr.In.Header.Values("Cookie")); c != "" {
				pr.Out.Header.Set("Cookie", c)
			}
			pr.Out.Header.Set("X-Forwarded-Host", pr.In.Host)
			pr.Out.Header.Set("X-Forwarded-Proto", map[bool]string{true: "https", false: "http"}[https])
			pr.Out.Header.Set("X-Forwarded-For", dshXFF(pr.In))
		},
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return s.Aula.Dial(ctx, sub, dshPuerto)
			},
			DisableKeepAlives:     true,
			DisableCompression:    true,
			ResponseHeaderTimeout: dshRespuestaTimeout,
		},
		FlushInterval: -1,
		ModifyResponse: func(res *http.Response) error {
			res.Header.Del("Server")
			res.Header.Del("X-Powered-By")
			res.Header.Del("Referrer-Policy")
			res.Header.Del("X-Content-Type-Options")
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("Referrer-Policy", "same-origin")
			// nginx del borde: sin búfer, para que el streaming (SSE, respuestas largas) llegue al instante.
			h.Set("X-Accel-Buffering", "no")
			if res.Header.Get("X-Frame-Options") != "" {
				h.Del("X-Frame-Options") // el de dsh manda
			}
			if loc := res.Header.Get("Location"); strings.HasPrefix(loc, "/") && !strings.HasPrefix(loc, "//") &&
				loc != prefijo && !strings.HasPrefix(loc, prefijo+"/") && !strings.HasPrefix(loc, prefijo+"?") {
				res.Header.Set("Location", prefijo+loc)
			}
			if sc := res.Header.Values("Set-Cookie"); len(sc) > 0 {
				res.Header.Del("Set-Cookie")
				for _, v := range sc {
					if nv := reescribirSetCookie(v, prefijo, https); nv != "" {
						res.Header.Add("Set-Cookie", nv)
					}
				}
			}
			if res.StatusCode == http.StatusSwitchingProtocols || strings.HasPrefix(res.Header.Get("Content-Type"), "text/event-stream") {
				go mantenerAula(r.Context(), sub)
			}
			registrar(res.StatusCode)
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
			var tope *http.MaxBytesError
			switch {
			case errors.As(err, &tope):
				writeErr(w, 413, "demasiado_grande", "la petición pasa de 32 MB")
				registrar(413)
			case r.Context().Err() != nil:
				// el navegador se fue: nadie lee la respuesta
				registrar(499)
			case s.aulaApagada(sub):
				writeErr(w, 503, "aula_apagada", "tu aula no está encendida: abre el LIVE")
				registrar(503)
			default:
				writeErr(w, 502, "dsh_no_responde", "dsh no responde en el puerto 3080 de tu aula: arranca la interfaz con «aula dsh web»")
				registrar(502)
			}
		},
	}
	proxy.ServeHTTP(w, r)
	if upgrade {
		slog.Info("dsh cierre", "aula", nombre, "ruta", rutaLog, "ms", time.Since(t0).Milliseconds())
	}
}

// dshManifiestoJSON es una copia del manifest.webmanifest de dsh 0.2.1-rc.5 (público en dsh: lo sirve sin token).
// Chrome pide el manifiesto SIN cookies (<link rel="manifest"> sin crossorigin), así que por el proxy chocaba con la
// autenticación del LMS: 401 en la consola en cada carga (medido en el e2e del 31-10-2026). Se contesta aquí, sin
// sesión y sin tocar el aula (no lanza un «docker exec» por petición anónima ni dice si el aula existe). Las URL son
// relativas: se resuelven bajo /dsh/<sub>/.
const dshManifiestoJSON = `{"name":"DeepSeek Harness","short_name":"DSH","start_url":"./","scope":"./","display":"fullscreen",` +
	`"icons":[{"src":"favicon.svg","sizes":"any","type":"image/svg+xml","purpose":"any"}]}`

func dshManifiesto(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("Content-Type", "application/manifest+json")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write([]byte(dshManifiestoJSON))
	}
}

// aulaApagada: el contenedor no está corriendo (solo se consulta cuando el reenvío ya falló).
func (s *Server) aulaApagada(sub string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return s.Aula.Estado(ctx, sub) != "corriendo"
}

// mantenerAula toca el aula cada 30 s mientras dure la conexión (ctx se cancela al terminar el handler).
func mantenerAula(ctx context.Context, sub string) {
	t := time.NewTicker(30 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			tocarAula(sub)
		}
	}
}

// dshOrigenValido: defensa CSRF/CSWSH para las peticiones con cookie que escriben o abren un WebSocket.
func (s *Server) dshOrigenValido(r *http.Request, p *Principal) bool {
	if !p.viaCookie {
		return true
	}
	if r.Header.Get("Upgrade") == "" && (r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions) {
		return true
	}
	o := r.Header.Get("Origin")
	if o == "" {
		return r.Header.Get("Sec-Fetch-Site") != "cross-site"
	}
	u, err := url.Parse(o)
	if err != nil || u.Host == "" {
		return false
	}
	if strings.EqualFold(u.Host, r.Host) || strings.EqualFold(u.Host, r.Header.Get("X-Forwarded-Host")) {
		return true
	}
	pu, err := url.Parse(s.PublicURL)
	return err == nil && pu.Host != "" && strings.EqualFold(u.Host, pu.Host)
}

// hayPuntos: algún segmento «.» o «..» (ya decodificado).
func hayPuntos(ruta string) bool {
	for _, seg := range strings.Split(ruta, "/") {
		if seg == "." || seg == ".." {
			return true
		}
	}
	return false
}

// sinCookieLMS quita de la(s) cabecera(s) Cookie la sesión del LMS y deja el resto tal cual.
func sinCookieLMS(valores []string) string {
	var out []string
	for _, v := range valores {
		for _, par := range strings.Split(v, ";") {
			par = strings.TrimSpace(par)
			if par == "" {
				continue
			}
			nombre, _, _ := strings.Cut(par, "=")
			if strings.TrimSpace(nombre) == cookieName {
				continue
			}
			out = append(out, par)
		}
	}
	return strings.Join(out, "; ")
}

// dshXFF encadena la IP del que conecta al X-Forwarded-For que ya traía (nginx).
func dshXFF(r *http.Request) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	if prev := strings.Join(r.Header.Values("X-Forwarded-For"), ", "); prev != "" {
		return prev + ", " + ip
	}
	return ip
}

// reescribirSetCookie acota la cookie de dsh al prefijo del proxy. Devuelve "" si hay que descartarla.
func reescribirSetCookie(v, prefijo string, https bool) string {
	c, err := http.ParseSetCookie(v)
	if err != nil || c.Name == cookieName {
		return ""
	}
	switch {
	case c.Path == "" || c.Path == "/" || !strings.HasPrefix(c.Path, "/"):
		c.Path = prefijo + "/"
	case c.Path == prefijo || strings.HasPrefix(c.Path, prefijo+"/"):
	default:
		c.Path = prefijo + c.Path
	}
	c.Domain = ""
	c.Secure = https
	return c.String()
}
