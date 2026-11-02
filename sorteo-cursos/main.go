// Ruleta de Cursos: sorteo relámpago del catálogo de noviembre–diciembre en
// JMD Learning. Todos ganan: la persona escribe su nombre y su celular, gira
// la ruleta de 8 casillas y recibe al instante un cupón de 30 %, 40 % o 50 %
// de descuento, o el pack «Lleva 6 cursos por S/ 100».
//
// La casilla la dicta una semilla secreta: azar(semilla, "premio", id, 0, 8),
// con id el orden de llegada. La huella SHA-256 de la semilla se publica
// desde el inicio; al cerrar, se revela la semilla y cualquiera puede rehacer
// el sorteo. El código del cupón sale de la misma semilla, así que el panel
// (o cualquiera con la semilla revelada) puede validar un código.
//
// Fases: abierto → cerrado. Nace abierto: el sorteo es de hoy.
package main

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"embed"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"mime"
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

const casillas = 8

func init() { _ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8") }

// Premio: lo que se entrega. Casillas dice cuántas de las 8 le tocan.
type Premio struct {
	ID       string `json:"id"`
	Nombre   string `json:"nombre"`
	Corto    string `json:"corto"`
	Detalle  string `json:"detalle"`
	Casillas int    `json:"casillas"`
	Color    string `json:"color"`
	Tinta    string `json:"tinta"`
}

var premios = []Premio{
	{ID: "D30", Nombre: "30 % de descuento (6 cursos por S/ 70)", Corto: "30 %", Detalle: "S/ 100 − 30 % = S/ 70 por 6 cursos.", Casillas: 3, Color: "#6cb6ff", Tinta: "#06203d"},
	{ID: "D40", Nombre: "40 % de descuento (6 cursos por S/ 60)", Corto: "40 %", Detalle: "S/ 100 − 40 % = S/ 60 por 6 cursos.", Casillas: 2, Color: "#4ee6b4", Tinta: "#06301f"},
	{ID: "D50", Nombre: "50 % de descuento (6 cursos por S/ 50)", Corto: "50 %", Detalle: "S/ 100 − 50 % = S/ 50 por 6 cursos.", Casillas: 1, Color: "#ff6b6b", Tinta: "#3d0a0a"},
	{ID: "X6", Nombre: "Pack de 6 cursos por S/ 100", Corto: "6 × S/100", Detalle: "Pagas S/ 100 y eliges 6 cursos.", Casillas: 2, Color: "#f5c542", Tinta: "#2a1d00"},
}

// patron: las 8 casillas en sentido horario desde arriba. El navegador dibuja
// la ruleta con la misma cadena (A = 30 %, B = 40 %, C = 50 %, D = 6 × S/100).
const patron = "ADBACADB"

var letraPremio = map[byte]string{'A': "D30", 'B': "D40", 'C': "D50", 'D': "X6"}

func franjaDe(i int) string { return letraPremio[patron[i]] }

func franjas() []string {
	out := make([]string, casillas)
	for i := range out {
		out[i] = franjaDe(i)
	}
	return out
}

func premioDe(id string) Premio {
	for _, p := range premios {
		if p.ID == id {
			return p
		}
	}
	return Premio{ID: id, Nombre: id, Corto: id}
}

type Persona struct {
	ID       int       `json:"id"`
	Nombre   string    `json:"nombre"`
	Telefono string    `json:"telefono"`
	Token    string    `json:"token"`
	IP       string    `json:"ip"`
	CreadoEn time.Time `json:"creadoEn"`
	Casilla  int       `json:"casilla"`
	Premio   string    `json:"premio"`
	Codigo   string    `json:"codigo"`
}

type Estado struct {
	Edicion    int        `json:"edicion"`
	Titulo     string     `json:"titulo"`
	Fase       string     `json:"fase"` // abierto | cerrado
	Personas   []Persona  `json:"personas"`
	Siguiente  int        `json:"siguiente"`
	Semilla    string     `json:"semilla"`
	Compromiso string     `json:"compromiso"`
	CerradoEn  *time.Time `json:"cerradoEn,omitempty"`
}

type Servidor struct {
	mu      sync.Mutex
	e       Estado
	archivo string
	clave   string
	porIP   map[string]int
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func sha(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func estadoNuevo(edicion int) Estado {
	semilla := nuevoToken() + nuevoToken()
	return Estado{Edicion: edicion, Titulo: "Ruleta de Cursos · JMD Learning", Fase: "abierto", Semilla: semilla, Compromiso: sha(semilla)}
}

// azar: los 8 primeros bytes de SHA-256(«semilla:etiqueta:ronda:intento»)
// módulo n. El navegador lo repite igual con BigInt.
func azar(semilla, etiqueta string, ronda, intento, n int) int {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:%s:%d:%d", semilla, etiqueta, ronda, intento)))
	return int(binary.BigEndian.Uint64(h[:8]) % uint64(n))
}

// sortear: la casilla y el premio de la persona id. Puro y reproducible.
func sortear(semilla string, id int) (casilla int, premio string) {
	casilla = azar(semilla, "premio", id, 0, casillas)
	return casilla, franjaDe(casilla)
}

// codigo: PREMIO-ÚLTIMOS4-4HEX. Los 4 hex salen de la semilla, así que el
// panel puede validar un código sin base de datos (y cualquiera, al cerrar).
func codigo(semilla string, id int, premio, telefono string) string {
	h := sha(fmt.Sprintf("%s:codigo:%d:%s", semilla, id, premio))
	return fmt.Sprintf("%s-%s-%s", premio, telefono[len(telefono)-4:], strings.ToUpper(h[:4]))
}

func (s *Servidor) entregados() map[string]int {
	out := map[string]int{}
	for _, p := range premios {
		out[p.ID] = 0
	}
	for _, p := range s.e.Personas {
		out[p.Premio]++
	}
	return out
}

func (s *Servidor) guardar() {
	b, _ := json.MarshalIndent(s.e, "", "  ")
	tmp := s.archivo + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("guardar: %v", err)
		return
	}
	if err := os.Rename(tmp, s.archivo); err != nil {
		log.Printf("guardar: %v", err)
	}
}

func responder(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fallo(w http.ResponseWriter, code int, msg string) {
	responder(w, code, map[string]string{"error": msg})
}

var espacios = regexp.MustCompile(`\s+`)
var nombreValido = regexp.MustCompile(`^[\p{L}\p{M}0-9 .'\-]+$`)
var noDigitos = regexp.MustCompile(`\D`)
var celularPeru = regexp.MustCompile(`^9\d{8}$`)

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }

// limpiarCelular: solo dígitos; acepta el 51 delante (51987654321) y lo quita.
func limpiarCelular(t string) string {
	t = noDigitos.ReplaceAllString(t, "")
	if len(t) == 11 && strings.HasPrefix(t, "51") {
		t = t[2:]
	}
	return t
}

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return strings.Split(r.RemoteAddr, ":")[0]
}

func (s *Servidor) personaDe(token string) *Persona {
	if token == "" {
		return nil
	}
	for i := range s.e.Personas {
		if subtle.ConstantTimeCompare([]byte(s.e.Personas[i].Token), []byte(token)) == 1 {
			return &s.e.Personas[i]
		}
	}
	return nil
}

func (s *Servidor) porCelular(cel string) *Persona {
	for i := range s.e.Personas {
		if s.e.Personas[i].Telefono == cel {
			return &s.e.Personas[i]
		}
	}
	return nil
}

func ficha(p *Persona) map[string]any {
	return map[string]any{"id": p.ID, "nombre": p.Nombre, "telefono": p.Telefono, "casilla": p.Casilla, "premio": p.Premio, "codigo": p.Codigo, "hora": p.CreadoEn}
}

// resultado: la lista pública de ganadores (sin teléfonos), en orden.
func (s *Servidor) resultado() []map[string]any {
	out := []map[string]any{}
	for _, p := range s.e.Personas {
		out = append(out, map[string]any{"id": p.ID, "nombre": p.Nombre, "casilla": p.Casilla, "premio": p.Premio})
	}
	return out
}

func (s *Servidor) publico(token string) map[string]any {
	e := s.e
	out := map[string]any{
		"edicion": e.Edicion, "titulo": e.Titulo, "fase": e.Fase, "personas": len(e.Personas),
		"premios": premios, "franjas": franjas(), "compromiso": e.Compromiso, "entregados": s.entregados(),
	}
	if e.Fase == "cerrado" {
		out["semilla"] = e.Semilla
		out["resultado"] = s.resultado()
	}
	if yo := s.personaDe(token); yo != nil {
		out["yo"] = ficha(yo)
	}
	return out
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	c := r.Header.Get("X-Clave")
	return c != "" && subtle.ConstantTimeCompare([]byte(c), []byte(s.clave)) == 1
}

func leerJSON(r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 4096)).Decode(v)
}

// girar valida, guarda a la persona y sortea su premio al instante.
// Devuelve la persona, o el mensaje de error.
func (s *Servidor) girar(nombre, telefono, ip string) (*Persona, string) {
	nombre = limpiarNombre(nombre)
	telefono = limpiarCelular(telefono)
	if n := utf8.RuneCountInString(nombre); n < 3 || n > 40 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") {
		return nil, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres)."
	}
	if esOfensivo(nombre) {
		return nil, "Escribe tu nombre real, sin palabras ofensivas."
	}
	if !celularPeru.MatchString(telefono) {
		return nil, "El celular debe tener 9 dígitos y empezar con 9, por ejemplo 987654321."
	}
	if s.porCelular(telefono) != nil {
		return nil, "Ese celular ya giró. Es un giro por persona."
	}
	s.e.Siguiente++
	id := s.e.Siguiente
	c, pr := sortear(s.e.Semilla, id)
	p := Persona{ID: id, Nombre: nombre, Telefono: telefono, Token: nuevoToken(), IP: ip, CreadoEn: time.Now().UTC(), Casilla: c, Premio: pr, Codigo: codigo(s.e.Semilla, id, pr, telefono)}
	s.e.Personas = append(s.e.Personas, p)
	return &s.e.Personas[len(s.e.Personas)-1], ""
}

func (s *Servidor) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	estaticos := http.FileServer(http.FS(web))
	pagina := func(nombre string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			b, err := fs.ReadFile(web, nombre)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(b)
		}
	}
	mux.HandleFunc("GET /{$}", pagina("index.html"))
	mux.HandleFunc("GET /admin", pagina("admin.html"))
	mux.Handle("GET /static/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("v") != "" {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=300")
		}
		estaticos.ServeHTTP(w, r)
	}))

	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.publico(r.URL.Query().Get("t")))
	})

	mux.HandleFunc("POST /api/girar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre   string `json:"nombre"`
			Telefono string `json:"telefono"`
			Token    string `json:"t"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if yo := s.personaDe(in.Token); yo != nil {
			out := ficha(yo)
			out["t"], out["repetido"] = yo.Token, true
			responder(w, 200, out)
			return
		}
		if s.e.Fase != "abierto" {
			fallo(w, 409, "El sorteo ya cerró.")
			return
		}
		// Mismo celular desde otro navegador: se le devuelve su premio, sin token.
		if p := s.porCelular(limpiarCelular(in.Telefono)); p != nil {
			out := ficha(p)
			out["repetido"] = true
			responder(w, 200, out)
			return
		}
		ip := ipDe(r)
		if s.porIP[ip] >= 10 {
			fallo(w, 429, "Demasiados giros desde esta conexión.")
			return
		}
		p, msg := s.girar(in.Nombre, in.Telefono, ip)
		if msg != "" {
			fallo(w, 409, msg)
			return
		}
		s.porIP[ip]++
		s.guardar()
		out := ficha(p)
		out["t"] = p.Token
		responder(w, 200, out)
	})

	admin := func(f func(w http.ResponseWriter, r *http.Request)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !s.esAdmin(r) {
				time.Sleep(400 * time.Millisecond)
				fallo(w, 401, "Clave incorrecta.")
				return
			}
			s.mu.Lock()
			defer s.mu.Unlock()
			f(w, r)
		}
	}
	estadoAdmin := func() map[string]any {
		out := s.publico("")
		lista := []map[string]any{}
		for i := range s.e.Personas {
			p := &s.e.Personas[i]
			f := ficha(p)
			f["ip"] = p.IP
			lista = append(lista, f)
		}
		out["personasLista"] = lista
		out["semilla"] = s.e.Semilla
		return out
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("GET /api/admin/csv", admin(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=ruleta-cursos.csv")
		fmt.Fprintln(w, "orden,nombre,celular,premio,codigo,casilla,hora")
		for _, p := range s.e.Personas {
			fmt.Fprintf(w, "%d,%q,%s,%s,%s,%d,%s\n", p.ID, p.Nombre, p.Telefono, premioDe(p.Premio).Nombre, p.Codigo, p.Casilla, p.CreadoEn.Format(time.RFC3339))
		}
	}))
	// Validar un código: ¿a quién pertenece y qué premio es?
	mux.HandleFunc("GET /api/admin/validar", admin(func(w http.ResponseWriter, r *http.Request) {
		c := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("codigo")))
		for i := range s.e.Personas {
			if s.e.Personas[i].Codigo == c {
				responder(w, 200, map[string]any{"valido": true, "persona": ficha(&s.e.Personas[i])})
				return
			}
		}
		responder(w, 200, map[string]any{"valido": false})
	}))
	mux.HandleFunc("POST /api/admin/renombrar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID     int    `json:"id"`
			Nombre string `json:"nombre"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		n := limpiarNombre(in.Nombre)
		if utf8.RuneCountInString(n) < 3 || utf8.RuneCountInString(n) > 40 || !nombreValido.MatchString(n) || esOfensivo(n) {
			fallo(w, 400, "Ese nombre no vale: de 3 a 40 letras y sin palabras ofensivas.")
			return
		}
		for i := range s.e.Personas {
			if s.e.Personas[i].ID == in.ID {
				s.e.Personas[i].Nombre = n
			}
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Quitar a una persona (por ejemplo, un registro de prueba). Libera su celular.
	mux.HandleFunc("POST /api/admin/quitar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID int `json:"id"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		personas := []Persona{}
		for _, p := range s.e.Personas {
			if p.ID != in.ID {
				personas = append(personas, p)
			}
		}
		s.e.Personas = personas
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/cerrar", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "abierto" {
			fallo(w, 409, "El sorteo ya estaba cerrado.")
			return
		}
		ahora := time.Now().UTC()
		s.e.CerradoEn = &ahora
		s.e.Fase = "cerrado"
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/abrir", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "El sorteo ya está abierto.")
			return
		}
		// la semilla ya se reveló: se cambia para que lo que venga siga siendo secreto
		nuevo := estadoNuevo(s.e.Edicion)
		s.e.Semilla, s.e.Compromiso, s.e.CerradoEn = nuevo.Semilla, nuevo.Compromiso, nil
		s.e.Fase = "abierto"
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.e = estadoNuevo(s.e.Edicion + 1)
		s.porIP = map[string]int{}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	return mux
}

func main() {
	datos := os.Getenv("SORTEO_DATOS")
	if datos == "" {
		datos = "datos"
	}
	clave := os.Getenv("SORTEO_CLAVE")
	if len(clave) < 12 {
		log.Fatal("SORTEO_CLAVE debe tener al menos 12 caracteres")
	}
	if err := os.MkdirAll(datos, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{archivo: filepath.Join(datos, "estado.json"), clave: clave, porIP: map[string]int{}}
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
	} else {
		s.e = estadoNuevo(1)
		s.guardar()
	}
	for _, p := range s.e.Personas {
		s.porIP[p.IP]++
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18638"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("ruleta de Cursos en :%s (%d personas, fase %s)", puerto, len(s.e.Personas), s.e.Fase)
	log.Fatal(srv.ListenAndServe())
}
