package httpapi

import (
	"context"
	"errors"
	"html"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
	"github.com/davrv93/jmd/lms/api/internal/content"
)

// Visor del modo LIVE: el LMS sirve, como estático, lo que el alumno guarda en /trabajo de su contenedor
// y reenvía las llamadas /api del asistente. Nada se monta en el proceso del LMS: todo pasa por el aula.

const maxVista = 5 << 20 // 5 MB por archivo

// mimeVista: lista cerrada de extensiones servibles y su tipo. No se adivina por contenido.
var mimeVista = map[string]string{
	".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
	".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon",
	".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
	".woff": "font/woff", ".woff2": "font/woff2", ".map": "application/json; charset=utf-8", ".wasm": "application/wasm",
}

// cspVista: la página del alumno corre en el origen del LMS, así que se acota: sus propios archivos y esm.sh.
const cspVista = "default-src 'self' https://esm.sh; script-src 'self' 'unsafe-inline' https://esm.sh; " +
	"style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'"

// scriptConsola avisa al panel de los errores de la página (T-4.6). Solo se inserta en HTML.
const scriptConsola = `<script>window.addEventListener("error",function(e){parent.postMessage({tipo:"consola",nivel:"error",mensaje:String(e.message),archivo:e.filename,linea:e.lineno},location.origin)});window.addEventListener("unhandledrejection",function(e){parent.postMessage({tipo:"consola",nivel:"error",mensaje:String(e.reason)},location.origin)});</script>`

// inyectarConsola pone scriptConsola antes de </head>, o al inicio si no hay cabecera.
func inyectarConsola(html []byte) []byte {
	s := string(html)
	if i := strings.Index(strings.ToLower(s), "</head>"); i >= 0 {
		return []byte(s[:i] + scriptConsola + s[i:])
	}
	return []byte(scriptConsola + s)
}

// vistaAcceso valida que el que pregunta sea el dueño (o el personal) y devuelve el sub del dueño.
func vistaAcceso(w http.ResponseWriter, p *Principal, sub string) bool {
	if sub != p.ID && !p.Staff() {
		writeErr(w, 403, "forbidden", "ese visor es de otra persona")
		return false
	}
	return true
}

// vistaRuta normaliza la ruta pedida. Vacía o terminada en / es index.html. ok=false si es peligrosa.
func vistaRuta(raw string) (string, bool) {
	if strings.ContainsRune(raw, 0) || strings.Contains(raw, "..") {
		return "", false
	}
	if raw == "" || strings.HasSuffix(raw, "/") {
		raw += "index.html"
	}
	clean := path.Clean(raw)
	if clean == "." || !content.SafeRel(clean) {
		return "", false
	}
	return clean, true
}

// vistaServir: GET /vista/{sub}/{ruta...}.
func (s *Server) vistaServir(w http.ResponseWriter, r *http.Request, p *Principal) {
	sub := r.PathValue("sub")
	if !vistaAcceso(w, p, sub) {
		return
	}
	if !s.aulaListo(w) {
		return
	}
	ruta, ok := vistaRuta(r.PathValue("ruta"))
	if !ok {
		writeErr(w, 400, "ruta_invalida", "ruta no permitida")
		return
	}
	ct, ok := mimeVista[strings.ToLower(path.Ext(ruta))]
	if !ok {
		writeErr(w, 415, "tipo_no_permitido", "ese tipo de archivo no se sirve en el visor")
		return
	}
	raw, err := s.Aula.Leer(r.Context(), aula.Nombre(sub), ruta, maxVista)
	switch {
	case errors.Is(err, aula.ErrNoExiste):
		vistaVacia(w, ruta)
		return
	case errors.Is(err, aula.ErrGrande):
		writeErr(w, 413, "demasiado_grande", "el archivo pasa de 5 MB")
		return
	case err != nil:
		internal(w, err)
		return
	}
	tocarAula(sub)
	if strings.HasPrefix(ct, "text/html") {
		raw = inyectarConsola(raw)
	}
	h := w.Header()
	h.Set("Content-Type", ct)
	h.Set("Cache-Control", "no-store")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "SAMEORIGIN")
	h.Set("Content-Security-Policy", cspVista)
	w.WriteHeader(200)
	_, _ = w.Write(raw)
}

// vistaVacia responde 404 con una página amable (el visor la muestra dentro de su marco).
func vistaVacia(w http.ResponseWriter, ruta string) {
	h := w.Header()
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Frame-Options", "SAMEORIGIN")
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(404)
	_, _ = w.Write([]byte(`<!doctype html><meta charset="utf-8"><meta name="color-scheme" content="light dark">` +
		`<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:0 1rem;line-height:1.5">` +
		`<h2>Todavía no hay nada aquí</h2><p>No existe <code>` + html.EscapeString(ruta) + `</code> en tu carpeta de trabajo.</p>` +
		`<p>En la terminal prueba: <code>aula nuevo html</code> y escribe <code>html/index.html</code> en la barra de arriba.</p>`))
}

// vistaVersion: GET /api/v1/vista/version (el propio alumno) y /api/v1/vista/{sub}/version (personal).
func (s *Server) vistaVersion(w http.ResponseWriter, r *http.Request, p *Principal) {
	sub := r.PathValue("sub")
	if sub == "" {
		sub = p.ID
	}
	if !vistaAcceso(w, p, sub) {
		return
	}
	if !s.aulaListo(w) {
		return
	}
	v, err := s.Aula.Version(r.Context(), aula.Nombre(sub))
	if err != nil {
		writeJSON(w, 200, map[string]any{"version": "", "t": time.Now().UTC().Format(time.RFC3339)})
		return
	}
	writeJSON(w, 200, map[string]any{"version": v, "t": time.Now().UTC().Format(time.RFC3339)})
}

// vistaProyectos: GET /api/v1/vista/proyectos (el propio alumno) y /api/v1/vista/{sub}/proyectos (personal).
func (s *Server) vistaProyectos(w http.ResponseWriter, r *http.Request, p *Principal) {
	sub := r.PathValue("sub")
	if sub == "" {
		sub = p.ID
	}
	if !vistaAcceso(w, p, sub) {
		return
	}
	if !s.aulaListo(w) {
		return
	}
	lista, err := s.Aula.Proyectos(r.Context(), aula.Nombre(sub))
	if err != nil || lista == nil {
		lista = []aula.Proyecto{}
	}
	writeJSON(w, 200, lista)
}

// restoPermitido: lo único del asistente que el visor puede alcanzar.
func restoPermitido(resto string) bool {
	switch resto {
	case "chat", "stt", "imagen", "salud", "estado":
		return true
	}
	return strings.HasPrefix(resto, "imagenes/") && content.SafeRel(strings.TrimPrefix(resto, "imagenes/"))
}

// vistaAPI: GET|POST /vista/{sub}/api/{resto...}. Reenvía al asistente del contenedor del alumno.
func (s *Server) vistaAPI(w http.ResponseWriter, r *http.Request, p *Principal) {
	sub := r.PathValue("sub")
	if !vistaAcceso(w, p, sub) {
		return
	}
	if !s.aulaListo(w) {
		return
	}
	// El personal puede mirar (GET) pero nunca actuar en nombre del alumno.
	if r.Method != http.MethodGet && sub != p.ID {
		writeErr(w, 403, "forbidden", "solo el dueño puede enviar al asistente")
		return
	}
	if r.Header.Get("Upgrade") != "" {
		writeErr(w, 400, "sin_websocket", "el visor no admite WebSocket")
		return
	}
	resto := r.PathValue("resto")
	if !restoPermitido(resto) {
		notFound(w, "la ruta")
		return
	}
	tocarAula(sub)
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.Out.URL = &url.URL{Scheme: "http", Host: "asistente", Path: "/api/" + resto, RawQuery: pr.In.URL.RawQuery}
			pr.Out.Host = "asistente"
			pr.Out.Header.Del("Cookie")
			pr.Out.Header.Del("Authorization")
		},
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return s.Aula.Dial(ctx, sub, 8766)
			},
			DisableKeepAlives:     true,
			ResponseHeaderTimeout: 180 * time.Second,
		},
		FlushInterval: -1,
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
			writeErr(w, 503, "asistente_apagado", "Arranca tu asistente desde la terminal: aula iniciar")
		},
	}
	proxy.ServeHTTP(w, r)
}
