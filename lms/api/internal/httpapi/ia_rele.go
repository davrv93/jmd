package httpapi

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// Relé de IA del aula: «clave de la clase» para DeepSeek Harness sin que la clave entre nunca al aula.
//
//	dsh (aula) --x-api-key: <token del aula>--> npm-proxy --> LMS /api/v1/ia/anthropic/v1/messages
//	LMS --x-api-key: <clave de la clase>--> https://api.deepseek.com/anthropic/v1/messages
//
// El alumno tiene shell en su aula, así que todo lo que hay dentro (entorno, /proc, archivos) se puede leer. Por eso
// el aula solo recibe un TOKEN propio (no la clave): «jmdia.<sub en base64url>.<HMAC>», con HMAC(secreto del LMS,
// sub + hora de arranque del contenedor). Sirve únicamente para este relé, caduca solo al apagar o recrear el aula
// (cambia la hora de arranque), deja de valer si el alumno sale del grupo con clave de la clase, y tiene tope diario de
// peticiones y de tokens. dsh habla la Messages API compatible con Anthropic (dsh-llm-deepseek): DEEPSEEK_BASE_URL
// apunta a <LMS>/api/v1/ia/anthropic y dsh pide <base>/v1/messages (SSE) y <base>/v1/files (imágenes).
//
// Qué se registra: aula (nombre hash), grupo, ruta, estado, ms y tokens. Nunca cuerpos, claves ni tokens.

// IAConfig configura el relé. nil o sin claves = relé apagado (503) y el botón pide la clave propia.
type IAConfig struct {
	// Claves por grupo (cohorte → clave de DeepSeek). Solo existen en el entorno del LMS.
	Claves map[string]string
	// Upstream: raíz de la Messages API de DeepSeek (por defecto https://api.deepseek.com/anthropic).
	Upstream string
	// URLAula: raíz del LMS vista desde el aula (por defecto LMS_PUBLIC_URL). El aula llega por npm-proxy.
	URLAula string
	// Secreto: semilla del HMAC de los tokens (la misma del aula: LMS_AULA_SECRETO o <datos>/aula-secreto).
	Secreto []byte
	// Topes por alumno y por día (hora de Lima). 0 = el valor por defecto.
	TopePeticiones int
	TopeTokens     int64
	Simultaneas    int
	// Archivo donde se guarda el uso del día (sobrevive a reinicios del LMS). Vacío = solo en memoria.
	Archivo string
	// Transport hacia DeepSeek; nil = uno propio que respeta HTTPS_PROXY.
	Transport http.RoundTripper

	once      sync.Once
	uso       *iaUso
	inicios   sync.Map // sub → iaInicio (caché corta de Aula.Inicio)
	transport http.RoundTripper
}

const (
	iaUpstreamPorDefecto  = "https://api.deepseek.com/anthropic"
	iaTopePeticionesDia   = 600
	iaTopeTokensDia       = 4_000_000
	iaSimultaneasPorDef   = 4
	iaPrefijoRuta         = "/api/v1/ia/anthropic"
	iaMaxCuerpo           = 48 << 20 // mensajes con imágenes en línea (dsh las tope a 20 MB) y subidas a Files
	iaCacheInicio         = 20 * time.Second
	iaRespuestaTimeout    = 5 * time.Minute
	iaPrefijoToken        = "jmdia."
	iaGuardarCada         = 10 * time.Second
	iaMaxLineaSSE         = 256 << 10
	iaMaxCuerpoJSONMedido = 4 << 20
)

// zonaLima: el día del tope empieza a medianoche de Lima (UTC-5, sin horario de verano).
var zonaLima = time.FixedZone("Lima", -5*3600)

// Activo: hay al menos una clave de clase y un secreto para firmar tokens.
func (c *IAConfig) Activo() bool { return c != nil && len(c.Claves) > 0 && len(c.Secreto) > 0 }

func (c *IAConfig) iniciar() {
	c.once.Do(func() {
		c.uso = cargarUso(c.Archivo)
		c.transport = c.Transport
		if c.transport == nil {
			t := http.DefaultTransport.(*http.Transport).Clone()
			t.ResponseHeaderTimeout = iaRespuestaTimeout
			t.MaxIdleConnsPerHost = 16
			c.transport = t
		}
	})
}

func (c *IAConfig) topePeticiones() int {
	if c.TopePeticiones > 0 {
		return c.TopePeticiones
	}
	return iaTopePeticionesDia
}

func (c *IAConfig) topeTokens() int64 {
	if c.TopeTokens > 0 {
		return c.TopeTokens
	}
	return iaTopeTokensDia
}

func (c *IAConfig) simultaneas() int {
	if c.Simultaneas > 0 {
		return c.Simultaneas
	}
	return iaSimultaneasPorDef
}

func (c *IAConfig) upstream() string {
	if c.Upstream != "" {
		return strings.TrimRight(c.Upstream, "/")
	}
	return iaUpstreamPorDefecto
}

// BaseAula: la DEEPSEEK_BASE_URL que recibe dsh dentro del aula.
func (c *IAConfig) BaseAula(publicURL string) string {
	base := strings.TrimRight(c.URLAula, "/")
	if base == "" {
		base = strings.TrimRight(publicURL, "/")
	}
	return base + iaPrefijoRuta
}

// GrupoCon devuelve el primer grupo de la lista que tiene clave de la clase ("" si ninguno). Orden estable.
func (c *IAConfig) GrupoCon(cohortes []string) string {
	if !c.Activo() {
		return ""
	}
	cs := append([]string(nil), cohortes...)
	sort.Strings(cs)
	for _, g := range cs {
		if c.Claves[g] != "" {
			return g
		}
	}
	return ""
}

// Token del aula de sub arrancada en inicio. Determinista: el LMS no guarda tokens.
func (c *IAConfig) Token(sub, inicio string) string {
	return iaPrefijoToken + base64.RawURLEncoding.EncodeToString([]byte(sub)) + "." + c.firma(sub, inicio)
}

func (c *IAConfig) firma(sub, inicio string) string {
	m := hmac.New(sha256.New, c.Secreto)
	m.Write([]byte("ia-aula\x00" + sub + "\x00" + inicio))
	return hex.EncodeToString(m.Sum(nil))[:40]
}

// subDeToken saca el sub de un token bien formado (sin validar la firma).
func subDeToken(tok string) (sub, mac string, ok bool) {
	resto, ok := strings.CutPrefix(tok, iaPrefijoToken)
	if !ok || len(tok) > 512 {
		return "", "", false
	}
	b64, mac, ok := strings.Cut(resto, ".")
	if !ok || len(mac) != 40 {
		return "", "", false
	}
	raw, err := base64.RawURLEncoding.DecodeString(b64)
	if err != nil || len(raw) == 0 || len(raw) > 128 {
		return "", "", false
	}
	return string(raw), mac, true
}

type iaInicio struct {
	valor string
	hasta time.Time
}

// inicioDe: Aula.Inicio con una caché de 20 s (cada mensaje del agente pasaría si no por un «docker inspect»).
func (c *IAConfig) inicioDe(ctx context.Context, m AulaMotor, sub string) string {
	if v, ok := c.inicios.Load(sub); ok {
		if e := v.(iaInicio); time.Now().Before(e.hasta) {
			return e.valor
		}
	}
	ini := m.Inicio(ctx, sub)
	c.inicios.Store(sub, iaInicio{valor: ini, hasta: time.Now().Add(iaCacheInicio)})
	return ini
}

// olvidarInicio borra la caché (al apagar el aula: el token deja de valer al instante).
func (c *IAConfig) olvidarInicio(sub string) {
	if c != nil {
		c.inicios.Delete(sub)
	}
}

// --- uso por alumno ------------------------------------------------------------------------------

// IAContador es el uso de un alumno en un día.
type IAContador struct {
	Peticiones int    `json:"peticiones"`
	Entrada    int64  `json:"tokens_entrada"` // input_tokens + caché (creación y lectura)
	Salida     int64  `json:"tokens_salida"`
	Rechazadas int    `json:"rechazadas"` // por tope
	Grupo      string `json:"grupo,omitempty"`
	Ultima     string `json:"ultima,omitempty"`
}

func (k *IAContador) tokens() int64 { return k.Entrada + k.Salida }

type iaUso struct {
	mu        sync.Mutex
	dia       string
	alumnos   map[string]*IAContador
	activos   map[string]int
	archivo   string
	guardado  time.Time
	pendiente bool
}

type iaUsoArchivo struct {
	Dia     string                 `json:"dia"`
	Alumnos map[string]*IAContador `json:"alumnos"`
}

func diaLima(t time.Time) string { return t.In(zonaLima).Format("2006-01-02") }

func cargarUso(archivo string) *iaUso {
	u := &iaUso{dia: diaLima(time.Now()), alumnos: map[string]*IAContador{}, activos: map[string]int{}, archivo: archivo}
	if archivo == "" {
		return u
	}
	raw, err := os.ReadFile(archivo)
	if err != nil {
		return u
	}
	var a iaUsoArchivo
	if json.Unmarshal(raw, &a) == nil && a.Dia == u.dia && a.Alumnos != nil {
		u.alumnos = a.Alumnos
	}
	return u
}

// alDia vacía los contadores si cambió el día (con u.mu tomado).
func (u *iaUso) alDia(ahora time.Time) {
	if d := diaLima(ahora); d != u.dia {
		u.dia, u.alumnos, u.pendiente = d, map[string]*IAContador{}, true
	}
}

func (u *iaUso) contador(sub string) *IAContador {
	k := u.alumnos[sub]
	if k == nil {
		k = &IAContador{}
		u.alumnos[sub] = k
	}
	return k
}

// guardarSiToca escribe el archivo como mucho cada 10 s (con u.mu tomado). Escritura atómica, 0600.
func (u *iaUso) guardarSiToca(ahora time.Time, forzar bool) {
	if u.archivo == "" || (!forzar && ahora.Sub(u.guardado) < iaGuardarCada) {
		return
	}
	raw, err := json.Marshal(iaUsoArchivo{Dia: u.dia, Alumnos: u.alumnos})
	if err != nil {
		return
	}
	tmp := u.archivo + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o600); err == nil {
		if os.Rename(tmp, u.archivo) == nil {
			u.guardado, u.pendiente = ahora, false
		}
	}
}

// Uso devuelve una copia del uso de hoy (sub → contador).
func (c *IAConfig) Uso() (string, map[string]IAContador) {
	c.iniciar()
	u := c.uso
	u.mu.Lock()
	defer u.mu.Unlock()
	u.alDia(time.Now())
	out := make(map[string]IAContador, len(u.alumnos))
	for k, v := range u.alumnos {
		out[k] = *v
	}
	return u.dia, out
}

// --- el relé ---------------------------------------------------------------------------------------

// Rutas que el relé deja pasar (relativas a la raíz de la Messages API).
var (
	reIAMensajes = regexp.MustCompile(`^v1/messages(/count_tokens)?$`)
	reIAFiles    = regexp.MustCompile(`^v1/files(/[A-Za-z0-9_-]{1,128}(/content)?)?$`)
)

func iaRutaPermitida(metodo, ruta string) bool {
	switch {
	case reIAMensajes.MatchString(ruta):
		return metodo == http.MethodPost
	case reIAFiles.MatchString(ruta):
		if ruta == "v1/files" {
			return metodo == http.MethodPost || metodo == http.MethodGet
		}
		return metodo == http.MethodGet || metodo == http.MethodDelete
	}
	return false
}

// iaError responde con el sobre de error de la Messages API: dsh lo entiende y muestra el mensaje.
func iaError(w http.ResponseWriter, estado int, tipo, codigo, msg string) {
	h := w.Header()
	h.Set("Content-Type", "application/json")
	h.Set("Cache-Control", "no-store")
	w.WriteHeader(estado)
	_ = json.NewEncoder(w).Encode(map[string]any{"type": "error", "error": map[string]string{"type": tipo, "code": codigo, "message": msg}})
}

func iaCredencial(r *http.Request) string {
	if k := strings.TrimSpace(r.Header.Get("X-Api-Key")); k != "" {
		return k
	}
	if a := r.Header.Get("Authorization"); strings.HasPrefix(a, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(a, "Bearer "))
	}
	return ""
}

// Cabeceras de la petición que pasan a DeepSeek; el resto (cookies, X-Forwarded-*, la credencial del aula) no.
func iaCabeceraPermitida(nombre string) bool {
	n := http.CanonicalHeaderKey(nombre)
	switch n {
	case "Content-Type", "Content-Length", "Accept", "User-Agent":
		return true
	}
	return strings.HasPrefix(n, "Anthropic-") || strings.HasPrefix(n, "X-Deepseek-") || strings.HasPrefix(n, "X-Stainless-")
}

// iaRele: /api/v1/ia/anthropic/{resto...} (todos los métodos). Sin sesión del LMS: se autentica con el token del aula.
func (s *Server) iaRele(w http.ResponseWriter, r *http.Request) {
	t0 := time.Now()
	c := s.IA
	ruta := r.PathValue("resto")
	nombre, grupo, estado := "-", "-", 0
	var med *iaMedidor
	registrar := func() {
		args := []any{"aula", nombre, "grupo", grupo, "metodo", r.Method, "ruta", "/" + ruta, "estado", estado, "ms", time.Since(t0).Milliseconds()}
		if med != nil {
			args = append(args, "tokens_entrada", med.entrada, "tokens_salida", med.salida)
		}
		slog.Info("ia", args...)
	}
	if !c.Activo() || s.Aula == nil {
		estado = 503
		iaError(w, 503, "api_error", "rele_apagado", "Este servidor no tiene la clave de DeepSeek de la clase. Usa tu propia clave (botón «Abrir DeepSeek Harness» → «Mi clave»).")
		registrar()
		return
	}
	c.iniciar()
	if len(ruta) > 256 || !iaRutaPermitida(r.Method, ruta) {
		estado = 404
		iaError(w, 404, "not_found_error", "ruta_no_permitida", "Esa ruta no pasa por el relé de la clase.")
		registrar()
		return
	}
	sub, mac, ok := subDeToken(iaCredencial(r))
	if !ok {
		estado = 401
		iaError(w, 401, "authentication_error", "token_invalido", "Token del aula no válido. Vuelve a abrir DeepSeek Harness desde el botón del LIVE.")
		registrar()
		return
	}
	nombre = aula.Nombre(sub)
	inicio := c.inicioDe(r.Context(), s.Aula, sub)
	if inicio == "" || subtle.ConstantTimeCompare([]byte(mac), []byte(c.firma(sub, inicio))) != 1 {
		// Firma mala, o token de un arranque anterior del aula (se apagó o se recreó), o aula apagada.
		estado = 401
		iaError(w, 401, "authentication_error", "token_caducado", "El token de tu aula caducó (el aula se apagó o se renovó). Vuelve a abrir DeepSeek Harness desde el botón del LIVE.")
		registrar()
		return
	}
	u, err := s.DB.UserByID(r.Context(), sub)
	if err != nil {
		estado = 401
		iaError(w, 401, "authentication_error", "token_invalido", "Token del aula no válido.")
		registrar()
		return
	}
	grupo = c.GrupoCon(u.Cohorts)
	if grupo == "" {
		grupo = "-"
		estado = 403
		iaError(w, 403, "permission_error", "sin_clave_de_clase", "Tu grupo no tiene la clave de DeepSeek de la clase. Pega tu propia clave en «Mi clave».")
		registrar()
		return
	}
	clave := c.Claves[grupo]

	// Topes del día y simultáneas.
	us := c.uso
	us.mu.Lock()
	us.alDia(time.Now())
	k := us.contador(sub)
	k.Grupo = grupo
	if k.Peticiones >= c.topePeticiones() || k.tokens() >= c.topeTokens() {
		k.Rechazadas++
		us.mu.Unlock()
		estado = 429
		// «usage limit reached» hace que dsh lo trate como cuota agotada (no reintenta en bucle).
		iaError(w, 429, "rate_limit_error", "usage_limit_reached", "Llegaste al tope de hoy de la clave de la clase (usage limit reached). Mañana se renueva; si lo necesitas antes, avisa al instructor o usa tu propia clave.")
		registrar()
		return
	}
	if us.activos[sub] >= c.simultaneas() {
		us.mu.Unlock()
		estado = 429
		iaError(w, 429, "rate_limit_error", "demasiadas_simultaneas", "Demasiadas peticiones a la vez desde tu aula; espera un momento.")
		registrar()
		return
	}
	us.activos[sub]++
	k.Peticiones++
	k.Ultima = time.Now().UTC().Format(time.RFC3339)
	us.mu.Unlock()
	defer func() {
		us.mu.Lock()
		if us.activos[sub]--; us.activos[sub] <= 0 {
			delete(us.activos, sub)
		}
		if med != nil {
			k := us.contador(sub) // el día pudo cambiar a mitad de la respuesta
			k.Entrada += med.entrada
			k.Salida += med.salida
		}
		us.guardarSiToca(time.Now(), false)
		us.mu.Unlock()
	}()
	tocarAula(sub) // usar el agente cuenta como actividad: el aula no se apaga a mitad de una tarea

	up, err := url.Parse(c.upstream())
	if err != nil {
		estado = 502
		iaError(w, 502, "api_error", "upstream", "El relé está mal configurado (LMS_IA_UPSTREAM).")
		registrar()
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, iaMaxCuerpo)
	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			destino := *up
			destino.Path = strings.TrimRight(up.Path, "/") + "/" + ruta
			destino.RawPath = ""
			destino.RawQuery = pr.In.URL.RawQuery
			pr.Out.URL = &destino
			pr.Out.Host = up.Host
			h := http.Header{}
			for n, v := range pr.In.Header {
				if iaCabeceraPermitida(n) {
					h[n] = v
				}
			}
			h.Set("X-Api-Key", clave)
			pr.Out.Header = h
		},
		Transport:     c.transport,
		FlushInterval: -1, // SSE sin búfer
		ModifyResponse: func(res *http.Response) error {
			estado = res.StatusCode
			res.Header.Del("Set-Cookie")
			res.Header.Set("Cache-Control", "no-store")
			res.Header.Set("X-Accel-Buffering", "no") // nginx del borde: streaming al instante
			if res.StatusCode == 401 || res.StatusCode == 403 {
				// El 401 de DeepSeek trae la clave enmascarada («****abcd»): no sale nada de ella hacia el aula.
				_ = res.Body.Close()
				cuerpo, _ := json.Marshal(map[string]any{"type": "error", "error": map[string]string{
					"type": "authentication_error", "code": "clave_de_clase_invalida",
					"message": "DeepSeek rechazó la clave de la clase (API key is invalid). Avisa al instructor; mientras tanto puedes usar tu propia clave.",
				}})
				res.Body = io.NopCloser(bytes.NewReader(cuerpo))
				res.ContentLength = int64(len(cuerpo))
				res.Header.Set("Content-Length", strconv.Itoa(len(cuerpo)))
				res.Header.Set("Content-Type", "application/json")
				res.Header.Del("Content-Encoding")
				return nil
			}
			med = &iaMedidor{rc: res.Body, sse: strings.HasPrefix(res.Header.Get("Content-Type"), "text/event-stream")}
			res.Body = med
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
			var tope *http.MaxBytesError
			switch {
			case errors.As(err, &tope):
				estado = 413
				iaError(w, 413, "invalid_request_error", "demasiado_grande", "La petición pasa de 48 MB.")
			case r.Context().Err() != nil:
				estado = 499
			default:
				estado = 502
				slog.Warn("ia: DeepSeek no responde", "aula", nombre, "err", err)
				iaError(w, 502, "api_error", "deepseek_no_responde", "El relé de la clase no pudo llegar a DeepSeek. Prueba otra vez en un momento.")
			}
		},
	}
	proxy.ServeHTTP(w, r)
	if med != nil {
		med.terminar()
	}
	registrar()
}

// iaMedidor deja pasar la respuesta tal cual y, de paso, lee el uso de tokens: en SSE, los eventos message_start
// (usage de entrada) y message_delta (salida acumulada); en JSON, el campo usage del cuerpo. Nunca guarda el texto.
type iaMedidor struct {
	rc      io.ReadCloser
	sse     bool
	linea   []byte
	larga   bool // la línea actual pasó del tope: se descarta
	json    []byte
	entrada int64
	salida  int64
	hecho   bool
}

type iaUsage struct {
	InputTokens              int64 `json:"input_tokens"`
	OutputTokens             int64 `json:"output_tokens"`
	CacheCreationInputTokens int64 `json:"cache_creation_input_tokens"`
	CacheReadInputTokens     int64 `json:"cache_read_input_tokens"`
}

type iaEvento struct {
	Usage   *iaUsage `json:"usage"`
	Message *struct {
		Usage *iaUsage `json:"usage"`
	} `json:"message"`
}

func (m *iaMedidor) Read(p []byte) (int, error) {
	n, err := m.rc.Read(p)
	if n > 0 {
		m.alimentar(p[:n])
	}
	return n, err
}

func (m *iaMedidor) Close() error { return m.rc.Close() }

func (m *iaMedidor) alimentar(b []byte) {
	if !m.sse {
		if len(m.json)+len(b) <= iaMaxCuerpoJSONMedido {
			m.json = append(m.json, b...)
		}
		return
	}
	for len(b) > 0 {
		i := bytes.IndexByte(b, '\n')
		if i < 0 {
			m.acumular(b)
			return
		}
		m.acumular(b[:i])
		if !m.larga {
			m.procesarLinea(m.linea)
		}
		m.linea, m.larga = m.linea[:0], false
		b = b[i+1:]
	}
}

func (m *iaMedidor) acumular(b []byte) {
	if m.larga {
		return
	}
	if len(m.linea)+len(b) > iaMaxLineaSSE {
		m.larga = true
		return
	}
	m.linea = append(m.linea, b...)
}

func (m *iaMedidor) procesarLinea(l []byte) {
	l = bytes.TrimRight(l, "\r")
	d, ok := bytes.CutPrefix(l, []byte("data:"))
	if !ok || !bytes.Contains(d, []byte(`"usage"`)) {
		return
	}
	var ev iaEvento
	if json.Unmarshal(bytes.TrimSpace(d), &ev) != nil {
		return
	}
	if ev.Message != nil {
		m.sumar(ev.Message.Usage)
	}
	m.sumar(ev.Usage)
}

// sumar toma el máximo de cada campo: en SSE los valores son acumulados (message_delta repite el total).
func (m *iaMedidor) sumar(u *iaUsage) {
	if u == nil {
		return
	}
	if e := u.InputTokens + u.CacheCreationInputTokens + u.CacheReadInputTokens; e > m.entrada {
		m.entrada = e
	}
	if u.OutputTokens > m.salida {
		m.salida = u.OutputTokens
	}
}

func (m *iaMedidor) terminar() {
	if m.hecho {
		return
	}
	m.hecho = true
	if m.sse {
		if len(m.linea) > 0 && !m.larga {
			m.procesarLinea(m.linea)
		}
		return
	}
	var ev iaEvento
	if len(m.json) > 0 && json.Unmarshal(m.json, &ev) == nil {
		m.sumar(ev.Usage)
	}
	m.json = nil
}

// iaUsoHoy: GET /api/v1/ia/uso (instructor o admin). Uso de hoy de la clave de la clase por alumno de sus grupos.
func (s *Server) iaUsoHoy(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.IA.Activo() {
		writeJSON(w, 200, map[string]any{"activo": false, "alumnos": []any{}})
		return
	}
	dia, uso := s.IA.Uso()
	type fila struct {
		Nombre string `json:"nombre"`
		Email  string `json:"email"`
		Aula   string `json:"aula"`
		IAContador
	}
	filas := []fila{}
	for sub, k := range uso {
		u, err := s.DB.UserByID(r.Context(), sub)
		if err != nil || (!p.Is("admin") && !compartenGrupo(p.Cohorts, u.Cohorts)) {
			continue
		}
		filas = append(filas, fila{Nombre: u.Name, Email: u.Email, Aula: aula.Nombre(sub), IAContador: k})
	}
	sort.Slice(filas, func(i, j int) bool { return filas[i].tokens() > filas[j].tokens() })
	writeJSON(w, 200, map[string]any{
		"activo": true, "dia": dia, "grupos": s.IA.gruposOrdenados(),
		"tope_peticiones": s.IA.topePeticiones(), "tope_tokens": s.IA.topeTokens(), "alumnos": filas,
	})
}

func (c *IAConfig) gruposOrdenados() []string {
	out := make([]string, 0, len(c.Claves))
	for g := range c.Claves {
		out = append(out, g)
	}
	sort.Strings(out)
	return out
}

// ArchivoUso: dónde se guarda el uso del día dentro de la carpeta de datos del LMS.
func ArchivoUso(dataDir string) string {
	if dataDir == "" {
		return ""
	}
	return filepath.Join(dataDir, "ia-uso.json")
}
