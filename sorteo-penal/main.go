// «Gachapon» de JMD Learning: una máquina de cápsulas que sortea cupones de
// descuento para los cursos. El resultado se decide aquí, en el servidor, y se
// guarda: cada número de WhatsApp participa una sola vez y, si vuelve, ve lo
// mismo. Las probabilidades y los topes salen de config.json.
package main

import (
	"bytes"
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

//go:embed config.json
var configPorDefecto []byte

// cursos.json lo genera ~/Documents/jmd/brochures (catálogo con precios); aquí solo se copia.
//
//go:embed cursos.json
var cursosJSON []byte

// Lima no tiene horario de verano: un huso fijo evita depender de tzdata en el contenedor.
var lima = time.FixedZone("America/Lima", -5*3600)

type Premio struct {
	Descuento int `json:"descuento"`
	Peso      int `json:"peso"`
	Tope      int `json:"tope"` // 0 = sin tope
}

type Config struct {
	Ayuda         string   `json:"_ayuda"`
	Abierto       bool     `json:"abierto"`
	Premios       []Premio `json:"premios"`
	PesoSinPremio int      `json:"peso_sin_premio"`
	DiasVigencia  int      `json:"dias_vigencia"`
	MaxPorIPDia   int      `json:"max_por_ip_dia"`
	WhatsApp      string   `json:"whatsapp"`
	Cierra        string   `json:"cierra"` // RFC 3339: desde este instante el sorteo ya no entrega cápsulas
}

// Curso es una ficha del catálogo: lo que la página muestra en la lista de cursos.
// Soles es el precio en soles; 0 = curso gratis; nil = precio por WhatsApp.
type Curso struct {
	Slug        string   `json:"slug"`
	Titulo      string   `json:"titulo"`
	Categoria   string   `json:"categoria"`
	Bajada      string   `json:"bajada"`
	Aprenderas  []string `json:"aprenderas"`
	Formato     string   `json:"formato"`
	Fechas      []string `json:"fechas"`
	PrecioTexto string   `json:"precio_texto"`
	Soles       *float64 `json:"soles"`
	Antes       *float64 `json:"antes"`
	Brochure    string   `json:"brochure"`
}

var nombreArchivo = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*$`)

// leerCursos lee el catálogo y comprueba que cada curso tenga su imagen de brochure en web/brochures.
func leerCursos(b []byte, web fs.FS) ([]Curso, error) {
	var cs []Curso
	if err := json.Unmarshal(b, &cs); err != nil {
		return nil, fmt.Errorf("cursos: %w", err)
	}
	vistos := map[string]bool{}
	for _, c := range cs {
		switch {
		case !nombreArchivo.MatchString(c.Slug) || vistos[c.Slug]:
			return nil, fmt.Errorf("cursos: slug %q vacío, repetido o mal formado", c.Slug)
		case c.Titulo == "":
			return nil, fmt.Errorf("cursos: %s no tiene título", c.Slug)
		case c.Soles != nil && *c.Soles < 0:
			return nil, fmt.Errorf("cursos: %s tiene precio negativo", c.Slug)
		case !nombreArchivo.MatchString(c.Brochure):
			return nil, fmt.Errorf("cursos: %s no tiene brochure", c.Slug)
		}
		if _, err := fs.Stat(web, "brochures/"+c.Brochure+".webp"); err != nil {
			return nil, fmt.Errorf("cursos: falta web/brochures/%s.webp", c.Brochure)
		}
		vistos[c.Slug] = true
	}
	return cs, nil
}

var soloDigitos = regexp.MustCompile(`^[0-9]+$`)

func leerConfig(b []byte) (Config, error) {
	var c Config
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields() // una clave mal escrita debe avisar, no ignorarse
	if err := d.Decode(&c); err != nil {
		return c, fmt.Errorf("config: %w", err)
	}
	if len(c.Premios) == 0 {
		return c, errors.New("config: falta al menos un premio")
	}
	vistos := map[int]bool{}
	for _, p := range c.Premios {
		switch {
		case p.Descuento < 1 || p.Descuento > 100:
			return c, fmt.Errorf("config: descuento %d fuera de 1 a 100", p.Descuento)
		case vistos[p.Descuento]:
			return c, fmt.Errorf("config: el descuento %d está repetido", p.Descuento)
		case p.Peso < 1:
			return c, fmt.Errorf("config: el peso del %d %% debe ser 1 o más", p.Descuento)
		case p.Tope < 0:
			return c, fmt.Errorf("config: el tope del %d %% no puede ser negativo", p.Descuento)
		}
		vistos[p.Descuento] = true
	}
	switch {
	case c.PesoSinPremio < 0:
		return c, errors.New("config: peso_sin_premio no puede ser negativo")
	case c.DiasVigencia < 1 || c.DiasVigencia > 90:
		return c, errors.New("config: dias_vigencia debe estar entre 1 y 90")
	case c.MaxPorIPDia < 1:
		return c, errors.New("config: max_por_ip_dia debe ser 1 o más")
	case !soloDigitos.MatchString(c.WhatsApp):
		return c, errors.New("config: whatsapp va solo con dígitos, con el 51 adelante")
	}
	return c, nil
}

type Participante struct {
	Nombre    string     `json:"nombre"`
	WhatsApp  string     `json:"whatsapp"`         // 9 dígitos, sin el 51
	Descuento int        `json:"descuento"`        // 0 = no ganó
	Codigo    string     `json:"codigo,omitempty"` // solo si ganó
	Vence     string     `json:"vence,omitempty"`  // AAAA-MM-DD, hora de Lima
	Creado    time.Time  `json:"creado"`
	IP        string     `json:"ip"`
	Canjeado  *time.Time `json:"canjeado,omitempty"`
	Eleccion  *Eleccion  `json:"eleccion,omitempty"` // curso elegido en /canje
}

var (
	errCerrado = errors.New("sorteo cerrado")
	errMuchas  = errors.New("demasiadas participaciones desde esta conexión")
	errGuardar = errors.New("no se pudo guardar")
)

type Sorteo struct {
	mu          sync.Mutex
	cfg         Config
	archivo     string
	clave       string
	cursos      []Curso
	cursosCanje []Curso // catálogo completo, para los cupones antiguos de 70 % o más
	lista       []*Participante
	porNumero   map[string]*Participante
	porCodigo   map[string]*Participante
	azar        func(n int) int // entero en [0, n) para el sorteo; se cambia en las pruebas
	ahora       func() time.Time
}

func azarSeguro(n int) int {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		panic(err)
	}
	return int(v.Int64())
}

func nuevoSorteo(cfg Config, archivo, clave string) (*Sorteo, error) {
	s := &Sorteo{cfg: cfg, archivo: archivo, clave: clave, porNumero: map[string]*Participante{}, porCodigo: map[string]*Participante{}, azar: azarSeguro, ahora: time.Now}
	b, err := os.ReadFile(archivo)
	if errors.Is(err, fs.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(b, &s.lista); err != nil {
		return nil, fmt.Errorf("%s: %w", archivo, err)
	}
	for _, p := range s.lista {
		s.porNumero[p.WhatsApp] = p
		if p.Codigo != "" {
			s.porCodigo[p.Codigo] = p
		}
	}
	return s, nil
}

func (s *Sorteo) guardar() error {
	b, err := json.MarshalIndent(s.lista, "", " ")
	if err != nil {
		return err
	}
	tmp := s.archivo + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.archivo)
}

// entregados cuenta cuántos cupones de cada descuento ya salieron.
func (s *Sorteo) entregados() map[int]int {
	m := map[int]int{}
	for _, p := range s.lista {
		m[p.Descuento]++
	}
	return m
}

// disponibles devuelve los premios que todavía no llegan a su tope.
func (s *Sorteo) disponibles() []Premio {
	e := s.entregados()
	var out []Premio
	for _, p := range s.cfg.Premios {
		if p.Tope == 0 || e[p.Descuento] < p.Tope {
			out = append(out, p)
		}
	}
	return out
}

func (s *Sorteo) abierto() bool {
	if s.cfg.Cierra != "" {
		if t, err := time.Parse(time.RFC3339, s.cfg.Cierra); err == nil && !time.Now().Before(t) {
			return false
		}
	}
	return s.cfg.Abierto && len(s.disponibles()) > 0
}

// sortear elige entre los premios con cupo y «sin premio», en proporción a sus pesos.
// Devuelve el descuento, o 0 si no ganó.
func (s *Sorteo) sortear() int {
	disp := s.disponibles()
	total := s.cfg.PesoSinPremio
	for _, p := range disp {
		total += p.Peso
	}
	n := s.azar(total)
	for _, p := range disp {
		if n < p.Peso {
			return p.Descuento
		}
		n -= p.Peso
	}
	return 0
}

// Sin 0, O, 1, I ni L: el código se dicta por WhatsApp y no debe prestarse a confusión.
const letrasCodigo = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

func (s *Sorteo) nuevoCodigo(descuento int) string {
	for {
		b := make([]byte, 5)
		for i := range b {
			b[i] = letrasCodigo[azarSeguro(len(letrasCodigo))]
		}
		c := fmt.Sprintf("JMD-%d-%s", descuento, b)
		if s.porCodigo[c] == nil {
			return c
		}
	}
}

// vencimiento da el último día en que vale un cupón ganado en «ganado». Nunca
// cae en viernes ni sábado: si toca uno de esos días, pasa al domingo siguiente.
func vencimiento(ganado time.Time, dias int) time.Time {
	d := ganado.In(lima)
	f := time.Date(d.Year(), d.Month(), d.Day()+dias, 0, 0, 0, 0, lima)
	for f.Weekday() == time.Friday || f.Weekday() == time.Saturday {
		f = f.AddDate(0, 0, 1)
	}
	return f
}

var (
	diasSemana = [...]string{"domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"}
	meses      = [...]string{"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"}
)

func fechaLarga(f time.Time) string {
	return fmt.Sprintf("%s %d de %s de %d", diasSemana[f.Weekday()], f.Day(), meses[f.Month()-1], f.Year())
}

func fechaLargaISO(iso string) string {
	f, err := time.ParseInLocation("2006-01-02", iso, lima)
	if err != nil {
		return ""
	}
	return fechaLarga(f)
}

// jugar registra la participación de un número. Si el número ya participó,
// devuelve su resultado guardado y repetido = true.
func (s *Sorteo) jugar(nombre, numero, ip string) (p *Participante, repetido bool, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p := s.porNumero[numero]; p != nil {
		return p, true, nil
	}
	if !s.abierto() {
		return nil, false, errCerrado
	}
	ahora := s.ahora()
	desdeIP := 0
	for _, x := range s.lista {
		if x.IP == ip && ahora.Sub(x.Creado) < 24*time.Hour {
			desdeIP++
		}
	}
	if desdeIP >= s.cfg.MaxPorIPDia {
		return nil, false, errMuchas
	}
	p = &Participante{Nombre: nombre, WhatsApp: numero, Creado: ahora.UTC().Truncate(time.Second), IP: ip}
	if p.Descuento = s.sortear(); p.Descuento > 0 {
		p.Codigo = s.nuevoCodigo(p.Descuento)
		p.Vence = vencimiento(ahora, s.cfg.DiasVigencia).Format("2006-01-02")
	}
	s.lista = append(s.lista, p)
	if err := s.guardar(); err != nil { // sin guardar no hay resultado: no se muestra nada que luego no exista
		s.lista = s.lista[:len(s.lista)-1]
		log.Printf("guardar: %v", err)
		return nil, false, errGuardar
	}
	s.porNumero[numero] = p
	if p.Codigo != "" {
		s.porCodigo[p.Codigo] = p
	}
	return p, false, nil
}

// canjear marca o desmarca un cupón como canjeado.
func (s *Sorteo) canjear(codigo string, canjeado bool) (*Participante, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p := s.porCodigo[codigo]
	if p == nil {
		return nil, errors.New("no existe")
	}
	antes := p.Canjeado
	if canjeado {
		if p.Canjeado == nil {
			t := s.ahora().UTC().Truncate(time.Second)
			p.Canjeado = &t
		}
	} else {
		p.Canjeado = nil
	}
	if err := s.guardar(); err != nil {
		p.Canjeado = antes
		log.Printf("guardar: %v", err)
		return nil, errGuardar
	}
	return p, nil
}

var (
	espacios     = regexp.MustCompile(`\s+`)
	nombreValido = regexp.MustCompile(`^[\p{L}\p{M} .'\-]+$`)
	numeroLimpio = regexp.MustCompile(`^[0-9 +().\-]+$`)
	noDigito     = regexp.MustCompile(`[^0-9]`)
	celularPeru  = regexp.MustCompile(`^9[0-9]{8}$`)
)

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }

func nombreBueno(n string) bool {
	k := utf8.RuneCountInString(n)
	return k >= 2 && k <= 40 && nombreValido.MatchString(n)
}

// limpiarNumero deja el celular en 9 dígitos; acepta espacios, guiones y el +51 adelante.
func limpiarNumero(n string) (string, bool) {
	if !numeroLimpio.MatchString(n) {
		return "", false
	}
	d := noDigito.ReplaceAllString(n, "")
	if len(d) == 11 && strings.HasPrefix(d, "51") {
		d = d[2:]
	}
	return d, celularPeru.MatchString(d)
}

func responder(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fallo(w http.ResponseWriter, code int, clave, msg string) {
	responder(w, code, map[string]string{"error": msg, "motivo": clave})
}

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	if h, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return h
	}
	return r.RemoteAddr
}

func (s *Sorteo) esAdmin(r *http.Request) bool {
	return subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Clave")), []byte(s.clave)) == 1
}

type Resultado struct {
	Repetido   bool   `json:"repetido"`
	Gano       bool   `json:"gano"`
	Descuento  int    `json:"descuento"`
	Codigo     string `json:"codigo,omitempty"`
	Vence      string `json:"vence,omitempty"`
	VenceTexto string `json:"vence_texto,omitempty"`
	WhatsApp   string `json:"whatsapp"`
}

type filaResumen struct {
	Descuento  int `json:"descuento"`
	Entregados int `json:"entregados"`
	Tope       int `json:"tope"`
	Canjeados  int `json:"canjeados"`
}

func (s *Sorteo) resumen() []filaResumen {
	e := s.entregados()
	canj := map[int]int{}
	for _, p := range s.lista {
		if p.Canjeado != nil {
			canj[p.Descuento]++
		}
	}
	out := make([]filaResumen, 0, len(s.cfg.Premios))
	for _, p := range s.cfg.Premios {
		out = append(out, filaResumen{p.Descuento, e[p.Descuento], p.Tope, canj[p.Descuento]})
	}
	return out
}

func (s *Sorteo) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	archivos := http.FileServerFS(web)
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/brochures/") || strings.HasPrefix(r.URL.Path, "/fonts/") {
			w.Header().Set("Cache-Control", "public, max-age=86400") // imágenes y fuentes: no cambian entre despliegues del día
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		archivos.ServeHTTP(w, r)
	})
	s.rutasCanje(mux, http.FS(web))
	s.rutasChat(mux)
	s.rutasCatalogo(mux)
	mux.HandleFunc("GET /admin", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Robots-Tag", "noindex")
		http.ServeFileFS(w, r, web, "admin.html")
	})
	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		abierto := s.abierto()
		s.mu.Unlock()
		descuentos := make([]int, len(s.cfg.Premios))
		for i, p := range s.cfg.Premios {
			descuentos[i] = p.Descuento
		}
		responder(w, 200, map[string]any{"abierto": abierto, "descuentos": descuentos, "cursos": s.cursos, "whatsapp": s.cfg.WhatsApp})
	})
	mux.HandleFunc("POST /api/jugar", func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			Nombre   string `json:"nombre"`
			WhatsApp string `json:"whatsapp"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			fallo(w, 400, "formulario", "No pudimos leer tus datos. Vuelve a intentarlo.")
			return
		}
		nombre := limpiarNombre(p.Nombre)
		if !nombreBueno(nombre) {
			fallo(w, 400, "nombre", "Escribe tu nombre, solo con letras (de 2 a 40).")
			return
		}
		numero, ok := limpiarNumero(p.WhatsApp)
		if !ok {
			fallo(w, 400, "whatsapp", "Escribe tu WhatsApp: 9 dígitos y empieza con 9.")
			return
		}
		x, repetido, err := s.jugar(nombre, numero, ipDe(r))
		switch {
		case errors.Is(err, errCerrado):
			fallo(w, 409, "cerrado", "Los cupones de este sorteo ya se repartieron.")
			return
		case errors.Is(err, errMuchas):
			fallo(w, 429, "conexion", "Hoy ya hubo muchas participaciones desde esta conexión. Prueba con tus datos móviles o escríbenos por WhatsApp.")
			return
		case err != nil:
			fallo(w, 500, "servidor", "No pudimos registrar tu participación. Vuelve a intentarlo en un momento.")
			return
		}
		responder(w, 200, Resultado{Repetido: repetido, Gano: x.Descuento > 0, Descuento: x.Descuento, Codigo: x.Codigo, Vence: x.Vence, VenceTexto: fechaLargaISO(x.Vence), WhatsApp: x.WhatsApp})
	})
	admin := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !s.esAdmin(r) {
				fallo(w, 401, "clave", "Clave incorrecta.")
				return
			}
			h(w, r)
		}
	}
	mux.HandleFunc("GET /api/admin/participantes", admin(func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		lista := s.lista
		if lista == nil {
			lista = []*Participante{}
		}
		responder(w, 200, map[string]any{"participantes": lista, "resumen": s.resumen(), "abierto": s.abierto(), "whatsapp": s.cfg.WhatsApp})
	}))
	mux.HandleFunc("POST /api/admin/canjear", admin(func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			Codigo   string `json:"codigo"`
			Canjeado bool   `json:"canjeado"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			fallo(w, 400, "formulario", "No se pudo leer el pedido.")
			return
		}
		x, err := s.canjear(strings.ToUpper(strings.TrimSpace(p.Codigo)), p.Canjeado)
		switch {
		case errors.Is(err, errGuardar):
			fallo(w, 500, "servidor", "No se pudo guardar el cambio.")
		case err != nil:
			fallo(w, 404, "codigo", "Ese cupón no existe.")
		default:
			responder(w, 200, x)
		}
	}))
	mux.HandleFunc("GET /api/admin/csv", admin(func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=gachapon-participantes.csv")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte("\xef\xbb\xbf")) // para que Excel lea las tildes
		c := csv.NewWriter(w)
		_ = c.Write([]string{"nombre", "whatsapp", "descuento", "cupon", "vence", "participo", "canjeado"})
		for _, p := range s.lista {
			canj := ""
			if p.Canjeado != nil {
				canj = p.Canjeado.In(lima).Format("2006-01-02 15:04")
			}
			_ = c.Write([]string{sinFormula(p.Nombre), p.WhatsApp, strconv.Itoa(p.Descuento), p.Codigo, p.Vence, p.Creado.In(lima).Format("2006-01-02 15:04"), canj})
		}
		c.Flush()
	}))
	opiniones, err := cargarOpiniones(filepath.Join(filepath.Dir(s.archivo), "opiniones.json"))
	if err != nil {
		log.Fatal(err)
	}
	s.rutasOpinion(mux, opiniones, web)
	return cabeceras(mux)
}

// sinFormula evita que una hoja de cálculo ejecute como fórmula un texto escrito por un participante.
func sinFormula(v string) string {
	if v != "" && strings.ContainsRune("=+-@\t\r", rune(v[0])) {
		return "'" + v
	}
	return v
}

func cabeceras(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
		h.ServeHTTP(w, r)
	})
}

func main() {
	clave := os.Getenv("GACHAPON_CLAVE")
	if len(clave) < 12 {
		log.Fatal("GACHAPON_CLAVE debe tener al menos 12 caracteres")
	}
	cfgBytes := configPorDefecto
	if ruta := os.Getenv("GACHAPON_CONFIG"); ruta != "" {
		b, err := os.ReadFile(ruta)
		if err != nil {
			log.Fatal(err)
		}
		cfgBytes = b
	}
	cfg, err := leerConfig(cfgBytes)
	if err != nil {
		log.Fatal(err)
	}
	dir := os.Getenv("GACHAPON_DATOS")
	if dir == "" {
		dir = "datos"
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Fatal(err)
	}
	s, err := nuevoSorteo(cfg, filepath.Join(dir, "participantes.json"), clave)
	if err != nil {
		log.Fatal(err)
	}
	web, _ := fs.Sub(webFS, "web")
	if s.cursosCanje, err = leerCursos(cursosCanjeJSON, web); err != nil {
		log.Fatal(err)
	}
	// catálogo: si existe datos/cursos.json lo usa (importado por el admin)
	if b, err := os.ReadFile(filepath.Join(dir, "cursos.json")); err == nil {
		if cs, err2 := leerCursos(b, web); err2 == nil {
			s.cursos = cs
		} else {
			log.Printf("cursos.json en datos ignorado: %v", err2)
			if s.cursos, err = leerCursos(cursosJSON, web); err != nil {
				log.Fatal(err)
			}
		}
	} else {
		if s.cursos, err = leerCursos(cursosJSON, web); err != nil {
			log.Fatal(err)
		}
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18694"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 30 * time.Second}
	log.Printf("sorteo-penal en :%s (%d participantes, %d cursos, abierto: %v)", puerto, len(s.lista), len(s.cursos), s.abierto())
	log.Fatal(srv.ListenAndServe())
}
