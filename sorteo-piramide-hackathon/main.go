// Sorteo de la pirámide de JMD Learning para la Hackathon Ready Set Go!
// (videojuegos con IA, domingo 13 de diciembre de 2026): cupones de 60 a 100 %
// sobre la inscripción a la hackathon sola (S/ 30), para la comunidad JMD
// Learning. Es un clon independiente de sorteo-piramide (Claude Code PRO): otro
// contenedor, otro puerto, otros datos y otro prefijo de cupón (HK-). Hay 30
// puertas; la mayoría saca de la pirámide con un descuento y unas pocas son
// trampas (descuento 0: la pirámide se cae y no hay cupón). El reparto se hace al
// azar en el servidor la primera vez que arranca (el mazo) y se guarda. El
// navegador nunca ve el mazo: solo sabe qué puertas están tomadas. Cada número de
// WhatsApp toma una sola puerta y, si vuelve, ve lo mismo. El reparto de
// descuentos sale de config.json.
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

// Lima no tiene horario de verano: un huso fijo evita depender de tzdata en el contenedor.
var lima = time.FixedZone("America/Lima", -5*3600)

type Premio struct {
	Descuento int `json:"descuento"`
	Cantidad  int `json:"cantidad"` // cuántas puertas traen este descuento
}

type Config struct {
	Ayuda        string   `json:"_ayuda"`
	Abierto      bool     `json:"abierto"`
	Premios      []Premio `json:"premios"`
	PalabraGrupo string   `json:"palabra_grupo"` // se comparte solo en el grupo de WhatsApp
	DiasVigencia int      `json:"dias_vigencia"`
	MaxPorIPDia  int      `json:"max_por_ip_dia"`
	WhatsApp     string   `json:"whatsapp"`
	Soles        int      `json:"soles"` // precio de la hackathon sola, sin descuento
	Fin          string   `json:"fin"`   // AAAA-MM-DD: último día del sorteo y de los cupones (hora de Lima)
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
		case p.Descuento < 0 || p.Descuento > 100:
			return c, fmt.Errorf("config: descuento %d fuera de 0 a 100 (0 = trampa)", p.Descuento)
		case vistos[p.Descuento]:
			return c, fmt.Errorf("config: el descuento %d está repetido", p.Descuento)
		case p.Cantidad < 1:
			return c, fmt.Errorf("config: la cantidad del %d %% debe ser 1 o más", p.Descuento)
		}
		vistos[p.Descuento] = true
	}
	premiadas := 0
	for _, p := range c.Premios {
		if p.Descuento > 0 {
			premiadas += p.Cantidad
		}
	}
	switch {
	case premiadas == 0:
		return c, errors.New("config: al menos una puerta debe dar descuento")
	case c.totalPuertas() < 2 || c.totalPuertas() > 40:
		return c, errors.New("config: entre todos los premios debe haber de 2 a 40 puertas")
	case utf8.RuneCountInString(strings.TrimSpace(c.PalabraGrupo)) < 4:
		return c, errors.New("config: palabra_grupo debe tener al menos 4 letras")
	case c.DiasVigencia < 1 || c.DiasVigencia > 90:
		return c, errors.New("config: dias_vigencia debe estar entre 1 y 90")
	case c.MaxPorIPDia < 1:
		return c, errors.New("config: max_por_ip_dia debe ser 1 o más")
	case !soloDigitos.MatchString(c.WhatsApp):
		return c, errors.New("config: whatsapp va solo con dígitos, con el 51 adelante")
	case c.Soles < 1:
		return c, errors.New("config: soles debe ser 1 o más")
	}
	if _, err := time.ParseInLocation("2006-01-02", c.Fin, lima); err != nil {
		return c, errors.New("config: fin va como AAAA-MM-DD")
	}
	return c, nil
}

func (c Config) totalPuertas() int {
	n := 0
	for _, p := range c.Premios {
		n += p.Cantidad
	}
	return n
}

type Participante struct {
	Puerta    int        `json:"puerta"` // de 1 a totalPuertas
	Nombre    string     `json:"nombre"`
	WhatsApp  string     `json:"whatsapp"` // 9 dígitos, sin el 51
	Descuento int        `json:"descuento"`
	Codigo    string     `json:"codigo,omitempty"` // vacío si fue trampa
	Vence     string     `json:"vence,omitempty"`  // AAAA-MM-DD, hora de Lima
	Creado    time.Time  `json:"creado"`
	IP        string     `json:"ip"`
	Canjeado  *time.Time `json:"canjeado,omitempty"`
}

var (
	errCerrado = errors.New("sorteo cerrado")
	errTomada  = errors.New("puerta tomada")
	errPuerta  = errors.New("puerta inexistente")
	errMuchas  = errors.New("demasiadas participaciones desde esta conexión")
	errGuardar = errors.New("no se pudo guardar")
)

type Sorteo struct {
	mu        sync.Mutex
	cfg       Config
	archivo   string
	clave     string
	mazo      []int // mazo[i] = descuento de la puerta i+1
	lista     []*Participante
	porPuerta map[int]*Participante
	porNumero map[string]*Participante
	porCodigo map[string]*Participante
	azar      func(n int) int // entero en [0, n) para barajar; se cambia en las pruebas
	ahora     func() time.Time
}

func azarSeguro(n int) int {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		panic(err)
	}
	return int(v.Int64())
}

// estadoGuardado es lo que vive en disco: el mazo y quién tomó cada puerta.
type estadoGuardado struct {
	Mazo          []int           `json:"mazo"`
	Participantes []*Participante `json:"participantes"`
}

func nuevoSorteo(cfg Config, archivo, clave string, azar func(int) int) (*Sorteo, error) {
	s := &Sorteo{cfg: cfg, archivo: archivo, clave: clave, porPuerta: map[int]*Participante{}, porNumero: map[string]*Participante{}, porCodigo: map[string]*Participante{}, azar: azar, ahora: time.Now}
	b, err := os.ReadFile(archivo)
	if errors.Is(err, fs.ErrNotExist) {
		s.mazo = barajar(cfg, azar)
		return s, s.guardar() // el mazo queda fijo desde el primer arranque
	}
	if err != nil {
		return nil, err
	}
	var e estadoGuardado
	if err := json.Unmarshal(b, &e); err != nil {
		return nil, fmt.Errorf("%s: %w", archivo, err)
	}
	if len(e.Mazo) != cfg.totalPuertas() {
		return nil, fmt.Errorf("%s: el mazo guardado tiene %d puertas y config.json pide %d; borra el archivo solo si nadie ha jugado", archivo, len(e.Mazo), cfg.totalPuertas())
	}
	s.mazo, s.lista = e.Mazo, e.Participantes
	for _, p := range s.lista {
		s.porPuerta[p.Puerta] = p
		s.porNumero[p.WhatsApp] = p
		if p.Codigo != "" {
			s.porCodigo[p.Codigo] = p
		}
	}
	return s, nil
}

// barajar arma el mazo con Fisher-Yates: cada descuento aparece tantas veces como su cantidad.
func barajar(cfg Config, azar func(int) int) []int {
	var m []int
	for _, p := range cfg.Premios {
		for range p.Cantidad {
			m = append(m, p.Descuento)
		}
	}
	for i := len(m) - 1; i > 0; i-- {
		j := azar(i + 1)
		m[i], m[j] = m[j], m[i]
	}
	return m
}

func (s *Sorteo) guardar() error {
	lista := s.lista
	if lista == nil {
		lista = []*Participante{}
	}
	b, err := json.MarshalIndent(estadoGuardado{s.mazo, lista}, "", " ")
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

// fin es el primer instante en que el sorteo ya terminó: la medianoche que sigue a cfg.Fin en Lima.
func (s *Sorteo) fin() time.Time {
	f, _ := time.ParseInLocation("2006-01-02", s.cfg.Fin, lima)
	return f.AddDate(0, 0, 1)
}

func (s *Sorteo) abierto() bool {
	return s.cfg.Abierto && s.ahora().Before(s.fin()) && len(s.lista) < len(s.mazo)
}

// Sin 0, O, 1, I ni L: el código se dicta por WhatsApp y no debe prestarse a confusión.
const letrasCodigo = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// prefijoCupon distingue estos cupones (HK-80-XXXXX) de los de la pirámide de Claude Code PRO.
const prefijoCupon = "HK"

func (s *Sorteo) nuevoCodigo(descuento int) string {
	for {
		b := make([]byte, 5)
		for i := range b {
			b[i] = letrasCodigo[azarSeguro(len(letrasCodigo))]
		}
		c := fmt.Sprintf("%s-%d-%s", prefijoCupon, descuento, b)
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

// jugar le da a un número la puerta que eligió. Si el número ya participó,
// devuelve su resultado guardado y repetido = true, sin mirar la puerta pedida.
func (s *Sorteo) jugar(nombre, numero, ip string, puerta int) (p *Participante, repetido bool, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p := s.porNumero[numero]; p != nil {
		return p, true, nil
	}
	if !s.abierto() {
		return nil, false, errCerrado
	}
	if puerta < 1 || puerta > len(s.mazo) {
		return nil, false, errPuerta
	}
	if s.porPuerta[puerta] != nil {
		return nil, false, errTomada
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
	p = &Participante{Puerta: puerta, Nombre: nombre, WhatsApp: numero, Descuento: s.mazo[puerta-1], Creado: ahora.UTC().Truncate(time.Second), IP: ip}
	if p.Descuento > 0 { // una trampa no da cupón
		p.Codigo = s.nuevoCodigo(p.Descuento)
		p.Vence = vencimiento(ahora, s.cfg.DiasVigencia).Format("2006-01-02")
		if p.Vence > s.cfg.Fin { // ningún cupón dura más que el último día del sorteo
			p.Vence = s.cfg.Fin
		}
	}
	s.lista = append(s.lista, p)
	if err := s.guardar(); err != nil { // sin guardar no hay resultado: no se muestra nada que luego no exista
		s.lista = s.lista[:len(s.lista)-1]
		log.Printf("guardar: %v", err)
		return nil, false, errGuardar
	}
	s.porPuerta[puerta] = p
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

// palabraBuena compara la palabra del grupo sin distinguir mayúsculas, tildes de más ni espacios.
func (s *Sorteo) palabraBuena(p string) bool {
	norm := func(v string) string { return strings.ToUpper(strings.Join(strings.Fields(v), "")) }
	return subtle.ConstantTimeCompare([]byte(norm(p)), []byte(norm(s.cfg.PalabraGrupo))) == 1
}

// tomadas da, por puerta, el primer nombre de quien la tomó: es lo único que ve el público.
func (s *Sorteo) tomadas() []map[string]any {
	out := []map[string]any{}
	for _, p := range s.lista {
		out = append(out, map[string]any{"puerta": p.Puerta, "nombre": strings.Fields(p.Nombre)[0]})
	}
	return out
}

func (s *Sorteo) esAdmin(r *http.Request) bool {
	return subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Clave")), []byte(s.clave)) == 1
}

type Resultado struct {
	Repetido   bool   `json:"repetido"`
	Puerta     int    `json:"puerta"`
	Escapo     bool   `json:"escapo"`
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
		out = append(out, filaResumen{p.Descuento, e[p.Descuento], p.Cantidad, canj[p.Descuento]})
	}
	return out
}

func (s *Sorteo) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	archivos := http.FileServerFS(web)
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/video/") || strings.HasPrefix(r.URL.Path, "/audio/") || strings.HasPrefix(r.URL.Path, "/img/") || strings.HasPrefix(r.URL.Path, "/fonts/") {
			w.Header().Set("Cache-Control", "public, max-age=86400") // video, audio, imágenes y fuentes: no cambian entre despliegues del día
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		archivos.ServeHTTP(w, r)
	})
	mux.HandleFunc("GET /admin", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Robots-Tag", "noindex")
		http.ServeFileFS(w, r, web, "admin.html")
	})
	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		abierto := s.abierto()
		tomadas := s.tomadas()
		s.mu.Unlock()
		responder(w, 200, map[string]any{"abierto": abierto, "puertas": len(s.mazo), "tomadas": tomadas, "soles": s.cfg.Soles, "whatsapp": s.cfg.WhatsApp})
	})
	mux.HandleFunc("POST /api/jugar", func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			Nombre   string `json:"nombre"`
			WhatsApp string `json:"whatsapp"`
			Palabra  string `json:"palabra"`
			Puerta   int    `json:"puerta"`
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
		if !s.palabraBuena(p.Palabra) {
			fallo(w, 403, "palabra", "Esa no es la palabra del grupo. Búscala en el grupo de WhatsApp de JMD Learning.")
			return
		}
		x, repetido, err := s.jugar(nombre, numero, ipDe(r), p.Puerta)
		switch {
		case errors.Is(err, errCerrado):
			fallo(w, 409, "cerrado", "Ya se tomaron todas las puertas.")
			return
		case errors.Is(err, errTomada):
			fallo(w, 409, "tomada", "Alguien tomó esa puerta justo antes que tú. Elige otra.")
			return
		case errors.Is(err, errPuerta):
			fallo(w, 400, "puerta", "Elige una puerta.")
			return
		case errors.Is(err, errMuchas):
			fallo(w, 429, "conexion", "Hoy ya hubo muchas participaciones desde esta conexión. Prueba con tus datos móviles o escríbenos por WhatsApp.")
			return
		case err != nil:
			fallo(w, 500, "servidor", "No pudimos registrar tu participación. Vuelve a intentarlo en un momento.")
			return
		}
		responder(w, 200, Resultado{Repetido: repetido, Puerta: x.Puerta, Escapo: x.Descuento > 0, Descuento: x.Descuento, Codigo: x.Codigo, Vence: x.Vence, VenceTexto: fechaLargaISO(x.Vence), WhatsApp: x.WhatsApp})
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
		w.Header().Set("Content-Disposition", "attachment; filename=piramide-hk-participantes.csv")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte("\xef\xbb\xbf")) // para que Excel lea las tildes
		c := csv.NewWriter(w)
		_ = c.Write([]string{"puerta", "nombre", "whatsapp", "descuento", "cupon", "vence", "participo", "canjeado"})
		for _, p := range s.lista {
			canj := ""
			if p.Canjeado != nil {
				canj = p.Canjeado.In(lima).Format("2006-01-02 15:04")
			}
			_ = c.Write([]string{strconv.Itoa(p.Puerta), sinFormula(p.Nombre), p.WhatsApp, strconv.Itoa(p.Descuento), p.Codigo, p.Vence, p.Creado.In(lima).Format("2006-01-02 15:04"), canj})
		}
		c.Flush()
	}))
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
		w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; media-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
		h.ServeHTTP(w, r)
	})
}

func main() {
	clave := os.Getenv("PIRAMIDE_CLAVE")
	if len(clave) < 12 {
		log.Fatal("PIRAMIDE_CLAVE debe tener al menos 12 caracteres")
	}
	cfgBytes := configPorDefecto
	if ruta := os.Getenv("PIRAMIDE_CONFIG"); ruta != "" {
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
	dir := os.Getenv("PIRAMIDE_DATOS")
	if dir == "" {
		dir = "datos"
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Fatal(err)
	}
	s, err := nuevoSorteo(cfg, filepath.Join(dir, "puertas.json"), clave, azarSeguro)
	if err != nil {
		log.Fatal(err)
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18695"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 30 * time.Second}
	log.Printf("sorteo-piramide-hk en :%s (%d de %d puertas tomadas, abierto: %v)", puerto, len(s.lista), len(s.mazo), s.abierto())
	log.Fatal(srv.ListenAndServe())
}
