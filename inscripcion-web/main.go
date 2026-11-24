// Inscripción a los cursos en modalidad web de JMD Learning, con pago por Yape revisado a mano.
//
// El alumno elige 1 curso (S/ 10) o 3 cursos (S/ 20), deja sus datos y adjunta la captura de su Yape.
// La solicitud queda pendiente. El instructor la revisa en /admin y, al aprobarla, este servicio le pide
// al LMS (POST /api/v1/interno/inscripcion, por la red interna de Docker) que cree o reutilice la cuenta,
// sume los grupos y firme un enlace de acceso de 7 días, que el panel manda por WhatsApp.
//
// Datos en /datos: solicitudes.json y fotos/<id>.<ext> (fuera de la web). Claves en el entorno:
// ADMIN_CLAVE (panel) y LMS_INTERNO_CLAVE (LMS). Ninguna se imprime.
package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/mail"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"
)

//go:embed web
var web embed.FS

//go:embed config.json
var configBase []byte

var lima = time.FixedZone("Lima", -5*3600)

const maxFoto = 6 << 20

type Curso struct {
	ID          string   `json:"id"`
	Cohorte     string   `json:"cohorte"`
	Titulo      string   `json:"titulo"`
	Corto       string   `json:"corto"`
	Descripcion string   `json:"descripcion"`
	Incluye     []string `json:"incluye"`
	Destino     string   `json:"destino"`
}

type Config struct {
	Titulo        string  `json:"titulo"`
	Yape          string  `json:"yape"`
	WhatsApp      string  `json:"whatsapp"`
	PrecioUno     int     `json:"precio_uno"`
	PrecioPaquete int     `json:"precio_paquete"`
	CursosPaquete int     `json:"cursos_paquete"`
	Cursos        []Curso `json:"cursos"`
	// Catalogo: los grupos que se pueden canjear con un código (los web y los en vivo que aún no terminan).
	Catalogo []Entrada `json:"catalogo"`
}

type Entrada struct {
	Cohorte string `json:"cohorte"`
	Titulo  string `json:"titulo"`
	Tipo    string `json:"tipo"`  // web | vivo
	Hasta   string `json:"hasta"` // RFC 3339; vacío = sin fin. Pasada esa hora ya no se canjea.
}

func (c *Config) curso(id string) *Curso {
	for i := range c.Cursos {
		if c.Cursos[i].ID == id {
			return &c.Cursos[i]
		}
	}
	return nil
}

// precio: 1 curso → PrecioUno; exactamente CursosPaquete → PrecioPaquete; otra cantidad no vale.
func (c *Config) precio(n int) (int, bool) {
	switch n {
	case 1:
		return c.PrecioUno, true
	case c.CursosPaquete:
		return c.PrecioPaquete, true
	}
	return 0, false
}

type Solicitud struct {
	ID        string    `json:"id"`
	Creada    time.Time `json:"creada"`
	Nombre    string    `json:"nombre"`
	Email     string    `json:"email"`
	Telefono  string    `json:"telefono"`
	Cursos    []string  `json:"cursos"`
	Monto     int       `json:"monto"`
	Operacion string    `json:"operacion,omitempty"`
	Foto      string    `json:"foto"`
	IP        string    `json:"ip,omitempty"`
	Estado    string    `json:"estado"` // pendiente | aprobada | rechazada
	Motivo    string    `json:"motivo,omitempty"`
	Nota      string    `json:"nota,omitempty"`
	Resuelta  time.Time `json:"resuelta,omitempty"`
	Enlace    string    `json:"enlace,omitempty"`
	Vence     string    `json:"vence,omitempty"`
	CuentaNew bool      `json:"cuenta_nueva,omitempty"`
}

type Servidor struct {
	mu       sync.Mutex
	datos    string
	cfg      Config
	sols     []*Solicitud
	clave    string
	lmsURL   string
	lmsClave string
	cliente  *http.Client
	limite   *limitador
	fallos   *limitador
	origenes []string
	ahora    func() time.Time

	// Códigos de canje (codigos.go): su propio candado, para no frenar el formulario de Yape.
	cmu        sync.Mutex
	codigos    []*Codigo
	canjes     []*Canje
	limCanje   *limitador
	limValidar *limitador
	limCodigo  *limitador
}

// ---------- persistencia ----------

func (s *Servidor) cargar() error {
	b, err := os.ReadFile(filepath.Join(s.datos, "solicitudes.json"))
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	return json.Unmarshal(b, &s.sols)
}

// guardar escribe con archivo temporal y rename (llamar con s.mu tomado).
func (s *Servidor) guardar() error {
	b, err := json.MarshalIndent(s.sols, "", " ")
	if err != nil {
		return err
	}
	tmp := filepath.Join(s.datos, "solicitudes.json.tmp")
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, filepath.Join(s.datos, "solicitudes.json"))
}

func (s *Servidor) buscar(id string) *Solicitud {
	for _, x := range s.sols {
		if x.ID == id {
			return x
		}
	}
	return nil
}

// ---------- límites ----------

type limitador struct {
	mu      sync.Mutex
	max     int
	ventana time.Duration
	marcas  map[string][]time.Time
}

func nuevoLimitador(max int, ventana time.Duration) *limitador {
	return &limitador{max: max, ventana: ventana, marcas: map[string][]time.Time{}}
}

func (l *limitador) permitir(k string, t time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	v := l.marcas[k][:0]
	for _, m := range l.marcas[k] {
		if t.Sub(m) < l.ventana {
			v = append(v, m)
		}
	}
	if len(v) >= l.max {
		l.marcas[k] = v
		return false
	}
	l.marcas[k] = append(v, t)
	if len(l.marcas) > 5000 { // memoria acotada: se olvida a todos
		l.marcas = map[string][]time.Time{}
	}
	return true
}

func ipCliente(r *http.Request) string {
	if x := strings.TrimSpace(r.Header.Get("X-Real-IP")); x != "" {
		return x
	}
	h, _, _ := net.SplitHostPort(r.RemoteAddr)
	return h
}

// ---------- utilidades HTTP ----------

func responder(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fallo(w http.ResponseWriter, code int, msg string) {
	responder(w, code, map[string]string{"error": msg})
}

func nuevoID() string {
	b := make([]byte, 9)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// mismoOrigen: las escrituras públicas solo desde la propia página (CSRF y formularios de terceros).
func (s *Servidor) mismoOrigen(r *http.Request) bool {
	if o := r.Header.Get("Origin"); o != "" {
		return slices.Contains(s.origenes, o)
	}
	return r.Header.Get("Sec-Fetch-Site") == "same-origin"
}

// tipoImagen mira los bytes, no la extensión ni lo que diga el navegador.
func tipoImagen(b []byte) string {
	switch {
	case len(b) > 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF:
		return "jpg"
	case len(b) > 8 && bytes.Equal(b[:8], []byte("\x89PNG\r\n\x1a\n")):
		return "png"
	case len(b) > 12 && string(b[:4]) == "RIFF" && string(b[8:12]) == "WEBP":
		return "webp"
	}
	return ""
}

var soloDigitos = regexp.MustCompile(`\D`)

// telefonoPeru devuelve 51XXXXXXXXX para un celular peruano (9 dígitos que empiezan en 9), o los dígitos
// tal cual si viene con otro código de país (8 a 15 dígitos).
func telefonoPeru(t string) (string, bool) {
	d := soloDigitos.ReplaceAllString(t, "")
	d = strings.TrimPrefix(d, "00")
	switch {
	case len(d) == 9 && d[0] == '9':
		return "51" + d, true
	case len(d) == 11 && strings.HasPrefix(d, "519"):
		return d, true
	case len(d) >= 10 && len(d) <= 15 && !strings.HasPrefix(d, "51"):
		return d, true
	}
	return "", false
}

func limpiar(t string, max int) string {
	t = strings.Join(strings.Fields(t), " ")
	if len([]rune(t)) > max {
		t = string([]rune(t)[:max])
	}
	return t
}

// ---------- público ----------

func (s *Servidor) apiCursos(w http.ResponseWriter, r *http.Request) {
	responder(w, 200, s.cfg)
}

func (s *Servidor) apiSolicitud(w http.ResponseWriter, r *http.Request) {
	if !s.mismoOrigen(r) {
		fallo(w, 403, "Envía el formulario desde la página de inscripción.")
		return
	}
	ip := ipCliente(r)
	if !s.limite.permitir(ip, s.ahora()) {
		fallo(w, 429, "Ya enviaste varias solicitudes. Espera una hora o escríbenos por WhatsApp.")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxFoto+64<<10)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		fallo(w, 400, "La foto es muy pesada (máximo 6 MB) o el envío llegó incompleto.")
		return
	}
	defer r.MultipartForm.RemoveAll()
	if r.FormValue("sitio") != "" { // trampa para bots: el campo está oculto
		responder(w, 200, map[string]any{"ok": true})
		return
	}
	nombre := limpiar(r.FormValue("nombre"), 80)
	email := strings.ToLower(strings.TrimSpace(r.FormValue("email")))
	tel, telOK := telefonoPeru(r.FormValue("telefono"))
	operacion := limpiar(soloDigitos.ReplaceAllString(r.FormValue("operacion"), ""), 20)
	if len(strings.Fields(nombre)) < 2 {
		fallo(w, 400, "Escribe tu nombre completo: nombre y apellido.")
		return
	}
	if a, err := mail.ParseAddress(email); err != nil || a.Address != email || len(email) > 120 || !strings.Contains(email[strings.Index(email, "@"):], ".") {
		fallo(w, 400, "El correo no es válido.")
		return
	}
	if !telOK {
		fallo(w, 400, "Escribe tu número de WhatsApp (9 dígitos, por ejemplo 987 654 321).")
		return
	}
	var cursos []string
	for _, c := range r.MultipartForm.Value["cursos"] {
		if s.cfg.curso(c) == nil {
			fallo(w, 400, "Uno de los cursos elegidos no existe.")
			return
		}
		if !slices.Contains(cursos, c) {
			cursos = append(cursos, c)
		}
	}
	monto, ok := s.cfg.precio(len(cursos))
	if !ok {
		fallo(w, 400, fmt.Sprintf("Elige 1 curso (S/ %d) o %d cursos (S/ %d).", s.cfg.PrecioUno, s.cfg.CursosPaquete, s.cfg.PrecioPaquete))
		return
	}
	f, _, err := r.FormFile("foto")
	if err != nil {
		fallo(w, 400, "Adjunta la captura de tu Yape.")
		return
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, maxFoto+1))
	if err != nil || len(b) > maxFoto {
		fallo(w, 400, "La foto es muy pesada (máximo 6 MB).")
		return
	}
	ext := tipoImagen(b)
	if ext == "" {
		fallo(w, 400, "La captura debe ser una imagen JPG, PNG o WEBP.")
		return
	}
	if ext != "webp" {
		if cfg, _, err := image.DecodeConfig(bytes.NewReader(b)); err != nil || cfg.Width < 50 || cfg.Height < 50 || cfg.Width*cfg.Height > 40e6 {
			fallo(w, 400, "No pudimos leer la imagen. Prueba con otra captura.")
			return
		}
	}
	sol := &Solicitud{ID: nuevoID(), Creada: s.ahora(), Nombre: nombre, Email: email, Telefono: tel, Cursos: cursos,
		Monto: monto, Operacion: operacion, IP: ip, Estado: "pendiente"}
	sol.Foto = sol.ID + "." + ext
	s.mu.Lock()
	defer s.mu.Unlock()
	pend := 0
	for _, x := range s.sols {
		if x.Email == email && x.Estado == "pendiente" {
			pend++
		}
	}
	if pend >= 3 {
		fallo(w, 429, "Ya tienes solicitudes pendientes con ese correo. Te escribimos apenas las revisemos.")
		return
	}
	if err := os.WriteFile(filepath.Join(s.datos, "fotos", sol.Foto), b, 0o600); err != nil {
		log.Printf("foto: %v", err)
		fallo(w, 500, "No pudimos guardar la foto. Intenta de nuevo.")
		return
	}
	s.sols = append(s.sols, sol)
	if err := s.guardar(); err != nil {
		log.Printf("guardar: %v", err)
		fallo(w, 500, "No pudimos guardar tu solicitud. Intenta de nuevo.")
		return
	}
	log.Printf("solicitud %s: %d curso(s), S/ %d", sol.ID, len(cursos), monto)
	responder(w, 201, map[string]any{"ok": true, "id": sol.ID, "monto": monto})
}

// ---------- panel ----------

func (s *Servidor) admin(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := ipCliente(r)
		k := r.Header.Get("X-Clave")
		if len(s.clave) < 16 || subtle.ConstantTimeCompare([]byte(k), []byte(s.clave)) != 1 {
			if !s.fallos.permitir(ip, s.ahora()) {
				fallo(w, 429, "Demasiados intentos. Espera unos minutos.")
				return
			}
			fallo(w, 401, "Clave incorrecta.")
			return
		}
		h(w, r)
	}
}

func (s *Servidor) apiLista(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	out := slices.Clone(s.sols)
	s.mu.Unlock()
	sort.SliceStable(out, func(i, j int) bool {
		pi, pj := out[i].Estado == "pendiente", out[j].Estado == "pendiente"
		if pi != pj {
			return pi
		}
		return out[i].Creada.After(out[j].Creada)
	})
	responder(w, 200, map[string]any{"solicitudes": out, "config": s.cfg})
}

func (s *Servidor) apiFoto(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	sol := s.buscar(r.PathValue("id"))
	s.mu.Unlock()
	if sol == nil {
		fallo(w, 404, "No existe.")
		return
	}
	b, err := os.ReadFile(filepath.Join(s.datos, "fotos", sol.Foto))
	if err != nil {
		fallo(w, 404, "La foto no está.")
		return
	}
	tipos := map[string]string{"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
	w.Header().Set("Content-Type", tipos[tipoImagen(b)])
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Content-Security-Policy", "default-src 'none'")
	_, _ = w.Write(b)
}

type respuestaLMS struct {
	Enlace  string   `json:"enlace"`
	Vence   string   `json:"vence"`
	Creado  bool     `json:"creado"`
	Faltan  []string `json:"faltan"`
	Mensaje string   `json:"message"`
}

func (s *Servidor) inscribirEnLMS(ctx context.Context, sol *Solicitud) (*respuestaLMS, error) {
	cohortes := []string{}
	destino := "/courses/"
	for _, id := range sol.Cursos {
		c := s.cfg.curso(id)
		if c == nil {
			return nil, fmt.Errorf("el curso %s ya no está en la configuración", id)
		}
		cohortes = append(cohortes, c.Cohorte)
	}
	if len(sol.Cursos) == 1 {
		destino = s.cfg.curso(sol.Cursos[0]).Destino
	}
	out, code, err := s.lmsInscribir(ctx, sol.Email, sol.Nombre, cohortes, destino)
	if err == nil {
		return out, nil
	}
	if code == 422 && len(out.Faltan) > 0 {
		return nil, fmt.Errorf("todavía no existen en el LMS: %s. No se inscribió en nada; apruébala cuando estén", strings.Join(out.Faltan, ", "))
	}
	return nil, err
}

// lmsInscribir llama a la ruta interna del LMS. Devuelve la respuesta, el código HTTP y un error legible.
// La respuesta trae el enlace de acceso: quien llama decide a quién se lo muestra.
func (s *Servidor) lmsInscribir(ctx context.Context, email, nombre string, cohortes []string, destino string) (*respuestaLMS, int, error) {
	body, _ := json.Marshal(map[string]any{"email": email, "name": nombre, "cohorts": cohortes, "destino": destino})
	req, _ := http.NewRequestWithContext(ctx, "POST", s.lmsURL+"/api/v1/interno/inscripcion", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Interno-Clave", s.lmsClave)
	res, err := s.cliente.Do(req)
	if err != nil {
		return &respuestaLMS{}, 0, errors.New("el LMS no respondió")
	}
	defer res.Body.Close()
	var out respuestaLMS
	_ = json.NewDecoder(io.LimitReader(res.Body, 1<<16)).Decode(&out)
	switch {
	case res.StatusCode == 200 && out.Enlace != "":
		return &out, 200, nil
	case out.Mensaje != "":
		return &out, res.StatusCode, fmt.Errorf("el LMS dijo: %s", out.Mensaje)
	}
	return &out, res.StatusCode, fmt.Errorf("el LMS respondió %d", res.StatusCode)
}

func (s *Servidor) apiAprobar(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	s.mu.Lock()
	sol := s.buscar(id)
	if sol == nil || sol.Estado != "pendiente" {
		s.mu.Unlock()
		fallo(w, 409, "La solicitud no está pendiente.")
		return
	}
	copia := *sol
	s.mu.Unlock()
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	res, err := s.inscribirEnLMS(ctx, &copia)
	s.mu.Lock()
	defer s.mu.Unlock()
	sol = s.buscar(id)
	if err != nil {
		sol.Nota = err.Error()
		_ = s.guardar()
		fallo(w, 502, err.Error())
		return
	}
	sol.Estado, sol.Resuelta, sol.Enlace, sol.Vence, sol.CuentaNew, sol.Nota = "aprobada", s.ahora(), res.Enlace, res.Vence, res.Creado, ""
	if err := s.guardar(); err != nil {
		log.Printf("guardar: %v", err)
	}
	log.Printf("solicitud %s aprobada (cuenta nueva: %v)", id, res.Creado)
	responder(w, 200, sol)
}

func (s *Servidor) apiRechazar(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Motivo string `json:"motivo"`
	}
	_ = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&in)
	motivo := limpiar(in.Motivo, 200)
	if motivo == "" {
		fallo(w, 400, "Escribe el motivo del rechazo.")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	sol := s.buscar(r.PathValue("id"))
	if sol == nil || sol.Estado != "pendiente" {
		fallo(w, 409, "La solicitud no está pendiente.")
		return
	}
	sol.Estado, sol.Motivo, sol.Resuelta = "rechazada", motivo, s.ahora()
	_ = s.guardar()
	responder(w, 200, sol)
}

// apiBorrar quita una solicitud y su foto (pruebas o duplicados).
func (s *Servidor) apiBorrar(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := r.PathValue("id")
	i := slices.IndexFunc(s.sols, func(x *Solicitud) bool { return x.ID == id })
	if i < 0 {
		fallo(w, 404, "No existe.")
		return
	}
	_ = os.Remove(filepath.Join(s.datos, "fotos", s.sols[i].Foto))
	s.sols = slices.Delete(s.sols, i, i+1)
	_ = s.guardar()
	responder(w, 200, map[string]bool{"ok": true})
}

// ---------- arranque ----------

func cabeceras(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		h.ServeHTTP(w, r)
	})
}

func (s *Servidor) rutas() http.Handler {
	m := http.NewServeMux()
	sub, _ := fs.Sub(web, "web")
	pagina := func(nombre string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			b, _ := fs.ReadFile(sub, nombre)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(b)
		}
	}
	m.HandleFunc("GET /{$}", pagina("index.html"))
	m.HandleFunc("GET /admin", pagina("admin.html"))
	m.HandleFunc("GET /api/salud", func(w http.ResponseWriter, r *http.Request) { responder(w, 200, map[string]bool{"ok": true}) })
	m.HandleFunc("GET /api/cursos", s.apiCursos)
	m.HandleFunc("POST /api/solicitud", s.apiSolicitud)
	m.HandleFunc("GET /api/admin/solicitudes", s.admin(s.apiLista))
	m.HandleFunc("GET /api/admin/foto/{id}", s.admin(s.apiFoto))
	m.HandleFunc("POST /api/admin/aprobar/{id}", s.admin(s.apiAprobar))
	m.HandleFunc("POST /api/admin/rechazar/{id}", s.admin(s.apiRechazar))
	m.HandleFunc("POST /api/admin/borrar/{id}", s.admin(s.apiBorrar))
	m.HandleFunc("POST /api/codigo/validar", s.apiCodigoValidar)
	m.HandleFunc("POST /api/codigo/canje", s.apiCodigoCanje)
	m.HandleFunc("GET /api/admin/codigos", s.admin(s.apiCodigosLista))
	m.HandleFunc("POST /api/admin/codigos", s.admin(s.apiCodigoCrear))
	m.HandleFunc("POST /api/admin/codigos/{codigo}/desactivar", s.admin(s.apiCodigoDesactivar))
	m.HandleFunc("POST /api/admin/canjes/{id}/enlace", s.admin(s.apiCanjeEnlace))
	return cabeceras(m)
}

func leerConfig(datos string) (Config, error) {
	b := configBase
	if x, err := os.ReadFile(filepath.Join(datos, "config.json")); err == nil {
		b = x // la del servidor manda: se cambian títulos o precios sin recompilar
	}
	var c Config
	if err := json.Unmarshal(b, &c); err != nil {
		return c, err
	}
	return c, validarConfig(c)
}

func validarConfig(c Config) error {
	if c.PrecioUno <= 0 || c.PrecioPaquete <= 0 || c.CursosPaquete < 2 || len(c.Cursos) < c.CursosPaquete {
		return errors.New("config.json: precios o cantidad de cursos inválidos")
	}
	for _, e := range c.Catalogo {
		if e.Cohorte == "" || e.Titulo == "" {
			return fmt.Errorf("config.json: catálogo incompleto %q", e.Cohorte)
		}
		if e.Hasta != "" {
			if _, err := time.Parse(time.RFC3339, e.Hasta); err != nil {
				return fmt.Errorf("config.json: «hasta» de %s: %v", e.Cohorte, err)
			}
		}
	}
	for _, k := range c.Cursos {
		if k.ID == "" || k.Cohorte == "" || k.Titulo == "" || !strings.HasPrefix(k.Destino, "/") {
			return fmt.Errorf("config.json: curso incompleto %q", k.ID)
		}
	}
	return nil
}

func main() {
	datos := envOr("DATOS", "/datos")
	cfg, err := leerConfig(datos)
	if err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(datos, "fotos"), 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{datos: datos, cfg: cfg, clave: os.Getenv("ADMIN_CLAVE"), lmsURL: strings.TrimRight(envOr("LMS_URL", "http://lms:8080"), "/"),
		lmsClave: os.Getenv("LMS_INTERNO_CLAVE"), cliente: &http.Client{Timeout: 20 * time.Second},
		limite: nuevoLimitador(12, time.Hour), fallos: nuevoLimitador(10, 15*time.Minute),
		origenes: strings.Split(envOr("ORIGENES", "https://jmd-learn.online"), ","), ahora: func() time.Time { return time.Now().In(lima) },
		limCanje: nuevoLimitador(10, time.Hour), limValidar: nuevoLimitador(30, time.Hour), limCodigo: nuevoLimitador(20, 10*time.Minute)}
	if len(s.clave) < 16 || len(s.lmsClave) < 32 {
		log.Fatal("faltan ADMIN_CLAVE (≥16) o LMS_INTERNO_CLAVE (≥32)")
	}
	if err := s.cargar(); err != nil {
		log.Fatal(err)
	}
	if err := s.cargarCodigos(); err != nil {
		log.Fatal(err)
	}
	srv := &http.Server{Addr: ":" + envOr("PORT", "18766"), Handler: s.rutas(), ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout: 2 * time.Minute, WriteTimeout: 2 * time.Minute, IdleTimeout: time.Minute}
	go func() {
		c := make(chan os.Signal, 1)
		signal.Notify(c, syscall.SIGTERM, os.Interrupt)
		<-c
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
	}()
	log.Printf("inscripcion-web en %s (%d cursos)", srv.Addr, len(cfg.Cursos))
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func envOr(k, d string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return d
}
