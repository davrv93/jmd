// Sorteo de las secuencias: 50 tickets, tres ganadores y tres ruletas.
//
// Cada persona elige un ticket libre del 1 al 50 (uno por persona). Al cerrar
// las inscripciones se genera una semilla secreta y se publica su huella
// SHA-256 junto con la de la lista de tickets. En cada ronda giran tres
// ruletas, todas dictadas por la semilla:
//
//  1. la de las secuencias (Fibonacci, Euler, pares, impares, primos): los
//     tickets con dueño que pertenecen a esa secuencia son los candidatos; si
//     no hay ninguno, la ruleta vuelve a girar;
//  2. la de los candidatos: sale el ticket ganador;
//  3. la de los premios que quedan: sale su premio.
//
// Cada persona gana una sola vez: cuando uno de sus tickets sale, sus demás
// tickets ya no entran a la ruleta. Los tickets extra se ganan con referidos
// (página /referidos): quien se inscribe con un código y está en el grupo da
// un ticket extra a los dos. Al terminar se revela la semilla y cualquiera
// puede rehacer el sorteo en su navegador.
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
	"math/big"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

const totalTickets = 50

// Secuencias dentro del 1 al 50. Euler: los números de dos cifras que aparecen
// seguidos en los primeros 40 dígitos de e = 2,71828182845904523536…
var secuencias = []Secuencia{
	{ID: "fibonacci", Nombre: "Fibonacci", Regla: "Cada número es la suma de los dos anteriores: 1, 2, 3, 5, 8…"},
	{ID: "euler", Nombre: "Euler", Regla: "Pares de dígitos seguidos del número e = 2,71828182845904523536…"},
	{ID: "pares", Nombre: "Pares", Regla: "Se dividen entre 2 sin residuo."},
	{ID: "impares", Nombre: "Impares", Regla: "Al dividirlos entre 2 sobra 1."},
	{ID: "primos", Nombre: "Primos", Regla: "Solo se dividen entre 1 y entre sí mismos."},
}

const digitosE = "2718281828459045235360287471352662497757"

type Secuencia struct {
	ID      string `json:"id"`
	Nombre  string `json:"nombre"`
	Regla   string `json:"regla"`
	Numeros []int  `json:"numeros"`
}

func init() {
	for i := range secuencias {
		secuencias[i].Numeros = numerosDe(secuencias[i].ID)
	}
	_ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8")
}

func numerosDe(id string) []int {
	set := map[int]bool{}
	switch id {
	case "fibonacci":
		for a, b := 1, 2; a <= totalTickets; a, b = b, a+b {
			set[a] = true
		}
	case "euler":
		for i := 0; i+1 < len(digitosE); i++ {
			n := int(digitosE[i]-'0')*10 + int(digitosE[i+1]-'0')
			if n >= 1 && n <= totalTickets {
				set[n] = true
			}
		}
	case "pares", "impares", "primos":
		for n := 1; n <= totalTickets; n++ {
			switch {
			case id == "pares" && n%2 == 0, id == "impares" && n%2 == 1, id == "primos" && esPrimo(n):
				set[n] = true
			}
		}
	}
	out := make([]int, 0, len(set))
	for n := range set {
		out = append(out, n)
	}
	sort.Ints(out)
	return out
}

func esPrimo(n int) bool {
	if n < 2 {
		return false
	}
	for d := 2; d*d <= n; d++ {
		if n%d == 0 {
			return false
		}
	}
	return true
}

// Premio: un curso con su descuento. Precio es el regular en soles; Temprano,
// el de la inscripción temprana (0 si no tiene).
type Premio struct {
	ID        string `json:"id"`
	Curso     string `json:"curso"`
	Descuento int    `json:"descuento"`
	Precio    int    `json:"precio"`
	Temprano  int    `json:"temprano,omitempty"`
	Nota      string `json:"nota,omitempty"`
}

func premiosIniciales() []Premio {
	const (
		req   = "Ingeniería de Requerimientos"
		ds    = "DeepSeek Harness"
		combo = "DeepSeek Harness + Ingeniería de Requerimientos"
		hte   = "Diseño: ¿Difícil de explicar? (Hard to Explain)"
		ag    = "Programación agéntica"
		bots  = "Bots avanzados de IA"
		qa    = "Pruebas y QA"
		seg   = "Seguridad en codificación con IA: lo que muchos olvidan"
		cc    = "Claude Code PRO"
	)
	nuevo := func(id, curso string, desc int) Premio {
		return Premio{ID: id, Curso: curso, Descuento: desc, Precio: 40, Temprano: 25}
	}
	segNota := "Brotli, PHP y Node: las vulnerabilidades que se pasan por alto."
	botsNota := "Promo 2 × 1 temprana: 2 personas por S/ 60 hasta el dom. 1 nov, 11:59 p. m."
	return []Premio{
		nuevo("req-75", req, 75),
		nuevo("ds-80", ds, 80),
		{ID: "combo-90", Curso: combo, Descuento: 90, Precio: 80, Temprano: 50, Nota: "Los dos cursos."},
		{ID: "hte-90", Curso: hte, Descuento: 90, Precio: 100},
		{ID: "ag-90", Curso: ag, Descuento: 90, Precio: 100},
		{ID: "bots-33", Curso: bots, Descuento: 33, Precio: 60, Nota: botsNota},
		{ID: "qa-75", Curso: qa, Descuento: 75, Precio: 100},
		{ID: "seg-70", Curso: seg, Descuento: 70, Precio: 40, Temprano: 25, Nota: segNota},
		{ID: "cc-85", Curso: cc, Descuento: 85, Precio: 100, Nota: "Antes S/ 120."},
		{ID: "cc-30", Curso: cc, Descuento: 30, Precio: 100, Nota: "Antes S/ 120."},
		// variaciones de los mismos cursos
		nuevo("req-50", req, 50),
		nuevo("ds-60", ds, 60),
		{ID: "qa-50", Curso: qa, Descuento: 50, Precio: 100},
		{ID: "seg-50", Curso: seg, Descuento: 50, Precio: 40, Temprano: 25, Nota: segNota},
		{ID: "bots-60", Curso: bots, Descuento: 60, Precio: 60, Nota: botsNota},
		{ID: "ag-60", Curso: ag, Descuento: 60, Precio: 100},
		{ID: "hte-60", Curso: hte, Descuento: 60, Precio: 100},
		{ID: "cc-50", Curso: cc, Descuento: 50, Precio: 100, Nota: "Antes S/ 120."},
	}
}

// Persona: quien elige tickets. Su primer ticket lo elige al inscribirse; los
// extra los gana por referidos (ver extrasDe) y los elige después.
type Persona struct {
	ID          int       `json:"id"`
	Nombre      string    `json:"nombre"`
	Telefono    string    `json:"telefono"`
	Token       string    `json:"token"`
	IP          string    `json:"ip"`
	Codigo      string    `json:"codigo,omitempty"`      // su código para referir
	ReferidoPor string    `json:"referidoPor,omitempty"` // código con el que se inscribió
	EnGrupo     bool      `json:"enGrupo"`               // el panel confirmó que está en el grupo
	CreadoEn    time.Time `json:"creadoEn"`
}

type Ticket struct {
	Numero  int  `json:"numero"`
	Persona int  `json:"persona"`
	Extra   bool `json:"extra,omitempty"`
}

// Cada referido confirmado en el grupo da un ticket extra a los dos, hasta
// topeExtras por persona.
const topeExtras = 3

// Paso: un giro de una ruleta. Se calculan todos al empezar el sorteo y se
// revelan de uno en uno con el botón «Girar» del panel.
type Paso struct {
	Ronda      int    `json:"ronda"`
	Tipo       string `json:"tipo"` // secuencia | ticket | premio
	Secuencia  string `json:"secuencia,omitempty"`
	Candidatos []int  `json:"candidatos,omitempty"`
	Vacio      bool   `json:"vacio,omitempty"`
	Ticket     int    `json:"ticket,omitempty"`
	Nombre     string `json:"nombre,omitempty"`
	Premio     string `json:"premio,omitempty"`
}

type Estado struct {
	Edicion     int        `json:"edicion"`
	Titulo      string     `json:"titulo"`
	Fase        string     `json:"fase"` // inscripcion | cerrado | sorteo | fin
	Ganadores   int        `json:"ganadores"`
	Personas    []Persona  `json:"personas"`
	Tickets     []Ticket   `json:"tickets"`
	Siguiente   int        `json:"siguiente"`
	Premios     []Premio   `json:"premios"`
	Semilla     string     `json:"semilla"`
	Compromiso  string     `json:"compromiso"`
	HuellaLista string     `json:"huellaLista"`
	Pasos       []Paso     `json:"pasos"`
	Revelados   int        `json:"revelados"`
	CerradoEn   *time.Time `json:"cerradoEn,omitempty"`
	// pregunta relámpago (quiz.go)
	QuizAbierto  bool            `json:"quizAbierto"`
	Quiz         []RespuestaQuiz `json:"quiz"`
	ExcluidosHoy []Excluido      `json:"excluidosHoy"`
	Acertijo     Acertijo        `json:"acertijo"`
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

// Fila pública de un ticket: número, persona y nombre. Es lo que resume la
// huella de la lista y lo que recorre el sorteo.
type FilaLista struct {
	Numero  int    `json:"numero"`
	Persona int    `json:"persona"`
	Nombre  string `json:"nombre"`
}

func (s *Servidor) lista() []FilaLista {
	nombre := map[int]string{}
	for _, p := range s.e.Personas {
		nombre[p.ID] = p.Nombre
	}
	out := make([]FilaLista, 0, len(s.e.Tickets))
	for _, t := range s.e.Tickets {
		out = append(out, FilaLista{t.Numero, t.Persona, nombre[t.Persona]})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Numero < out[j].Numero })
	return out
}

// Lista canónica: «número|persona|nombre» por línea, ordenada por número.
func listaCanonica(l []FilaLista) string {
	var b strings.Builder
	for i, f := range l {
		if i > 0 {
			b.WriteByte('\n')
		}
		fmt.Fprintf(&b, "%d|%d|%s", f.Numero, f.Persona, f.Nombre)
	}
	return b.String()
}

// azar: los 8 primeros bytes de SHA-256(«semilla:etiqueta:ronda:intento»)
// módulo n. El navegador lo repite igual con BigInt.
func azar(semilla, etiqueta string, ronda, intento, n int) int {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:%s:%d:%d", semilla, etiqueta, ronda, intento)))
	return int(binary.BigEndian.Uint64(h[:8]) % uint64(n))
}

// calcularSorteo arma todos los giros. Cada persona gana una sola vez: cuando
// uno de sus tickets sale, sus otros tickets dejan de ser candidatos. Si en 40
// intentos ninguna secuencia tiene candidatos (casi imposible), la ronda se
// hace con todos los tickets que quedan.
func calcularSorteo(semilla string, lista []FilaLista, premios []Premio, ganadores int) []Paso {
	persona := map[int]int{}
	nombre := map[int]string{}
	personas := map[int]bool{}
	for _, f := range lista {
		persona[f.Numero], nombre[f.Numero], personas[f.Persona] = f.Persona, f.Nombre, true
	}
	gano := map[int]bool{} // por persona
	vale := func(n int) bool { p, ok := persona[n]; return ok && !gano[p] }
	quedan := append([]Premio(nil), premios...)
	var pasos []Paso
	for r := 0; r < ganadores && len(quedan) > 0 && len(gano) < len(personas); r++ {
		var cands []int
		for k := 0; ; k++ {
			if k == 40 {
				cands = nil
				for n := 1; n <= totalTickets; n++ {
					if vale(n) {
						cands = append(cands, n)
					}
				}
				pasos = append(pasos, Paso{Ronda: r, Tipo: "secuencia", Secuencia: "todos", Candidatos: cands, Vacio: len(cands) == 0})
				break
			}
			sec := secuencias[azar(semilla, "secuencia", r, k, len(secuencias))]
			cands = nil
			for _, n := range sec.Numeros {
				if vale(n) {
					cands = append(cands, n)
				}
			}
			pasos = append(pasos, Paso{Ronda: r, Tipo: "secuencia", Secuencia: sec.ID, Candidatos: cands, Vacio: len(cands) == 0})
			if len(cands) > 0 {
				break
			}
		}
		if len(cands) == 0 {
			break
		}
		t := cands[azar(semilla, "ticket", r, 0, len(cands))]
		gano[persona[t]] = true
		pasos = append(pasos, Paso{Ronda: r, Tipo: "ticket", Ticket: t, Nombre: nombre[t]})
		i := azar(semilla, "premio", r, 0, len(quedan))
		pasos = append(pasos, Paso{Ronda: r, Tipo: "premio", Ticket: t, Premio: quedan[i].ID})
		quedan = append(quedan[:i], quedan[i+1:]...)
	}
	return pasos
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
var codigoValido = regexp.MustCompile(`^[A-Z0-9]{3,12}$`)

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }
func limpiarCodigo(c string) string {
	return strings.ToUpper(strings.NewReplacer(" ", "", "-", "", "_", "").Replace(strings.TrimSpace(c)))
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

func (s *Servidor) porCodigo(codigo string) *Persona {
	for i := range s.e.Personas {
		if codigo != "" && s.e.Personas[i].Codigo == codigo {
			return &s.e.Personas[i]
		}
	}
	return nil
}

func (s *Servidor) ticketsDe(id int) []int {
	out := []int{}
	for _, t := range s.e.Tickets {
		if t.Persona == id {
			out = append(out, t.Numero)
		}
	}
	sort.Ints(out)
	return out
}

// extrasDe: tickets extra ganados por referidos confirmados en el grupo (el
// suyo, si llegó con código, y uno por cada persona que refirió), con tope.
func (s *Servidor) extrasDe(p *Persona) int {
	n := 0
	if p.ReferidoPor != "" && p.EnGrupo && s.porCodigo(p.ReferidoPor) != nil {
		n++
	}
	if p.Codigo != "" {
		for _, q := range s.e.Personas {
			if q.ReferidoPor == p.Codigo && q.EnGrupo {
				n++
			}
		}
	}
	return min(n, topeExtras)
}

// asignarExtras da a cada persona los tickets extra que no eligió: números
// libres al azar (crypto/rand). Devuelve cuántos asignó. Con s.mu tomado.
func (s *Servidor) asignarExtras() int {
	n := 0
	for i := range s.e.Personas {
		p := &s.e.Personas[i]
		for 1+s.extrasDe(p)-len(s.ticketsDe(p.ID)) > 0 {
			var libres []int
			for k := 1; k <= totalTickets; k++ {
				if s.libre(k) {
					libres = append(libres, k)
				}
			}
			if len(libres) == 0 {
				return n
			}
			x, err := rand.Int(rand.Reader, big.NewInt(int64(len(libres))))
			if err != nil {
				return n
			}
			s.e.Tickets = append(s.e.Tickets, Ticket{Numero: libres[x.Int64()], Persona: p.ID, Extra: true})
			n++
		}
	}
	return n
}

func (s *Servidor) libre(numero int) bool {
	for _, t := range s.e.Tickets {
		if t.Numero == numero {
			return false
		}
	}
	return numero >= 1 && numero <= totalTickets
}

// misReferidos: lo que ve la persona en la página de referidos.
func (s *Servidor) misReferidos(p *Persona) []map[string]any {
	out := []map[string]any{}
	if p.Codigo == "" {
		return out
	}
	for _, q := range s.e.Personas {
		if q.ReferidoPor == p.Codigo {
			out = append(out, map[string]any{"nombre": q.Nombre, "enGrupo": q.EnGrupo})
		}
	}
	return out
}

// ganadoresRevelados: los que ya tienen ticket y premio a la vista.
func (s *Servidor) ganadoresRevelados() []map[string]any {
	out := []map[string]any{}
	nombre := map[int]string{}
	for _, f := range s.lista() {
		nombre[f.Numero] = f.Nombre
	}
	for _, p := range s.e.Pasos[:s.e.Revelados] {
		if p.Tipo == "premio" {
			out = append(out, map[string]any{"ronda": p.Ronda, "ticket": p.Ticket, "nombre": nombre[p.Ticket], "premio": p.Premio})
		}
	}
	return out
}

func (s *Servidor) publico(token string) map[string]any {
	e := s.e
	ocupados := make([]int, 0, len(e.Tickets))
	for _, t := range e.Tickets {
		ocupados = append(ocupados, t.Numero)
	}
	sort.Ints(ocupados)
	pasos := append([]Paso{}, e.Pasos[:e.Revelados]...)
	out := map[string]any{
		"edicion": e.Edicion, "titulo": e.Titulo, "fase": e.Fase, "ganadores": e.Ganadores,
		"total": totalTickets, "ocupados": ocupados, "personas": len(e.Personas),
		"secuencias": secuencias, "premios": e.Premios, "topeExtras": topeExtras,
		"compromiso": e.Compromiso, "huellaLista": e.HuellaLista,
		"pasos": pasos, "totalPasos": len(e.Pasos), "resultado": s.ganadoresRevelados(),
	}
	if e.Fase != "inscripcion" {
		out["lista"] = s.lista()
	}
	if e.Fase == "fin" {
		out["semilla"] = e.Semilla
	}
	if yo := s.personaDe(token); yo != nil {
		tickets := s.ticketsDe(yo.ID)
		extras := s.extrasDe(yo)
		out["yo"] = map[string]any{
			"id": yo.ID, "nombre": yo.Nombre, "tickets": tickets, "codigo": yo.Codigo,
			"referidoPor": yo.ReferidoPor, "enGrupo": yo.EnGrupo,
			"extras": extras, "porElegir": max(0, 1+extras-len(tickets)), "referidos": s.misReferidos(yo),
		}
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

// inscribir valida y guarda a una persona con su primer ticket. Devuelve el
// mensaje de error o "".
func (s *Servidor) inscribir(numero int, nombre, telefono, ref, ip string) (*Persona, string) {
	nombre = limpiarNombre(nombre)
	telefono = noDigitos.ReplaceAllString(telefono, "")
	ref = limpiarCodigo(ref)
	if n := utf8.RuneCountInString(nombre); n < 3 || n > 40 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") {
		return nil, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres)."
	}
	if esOfensivo(nombre) {
		return nil, "Escribe tu nombre real, sin palabras ofensivas."
	}
	if len(telefono) < 9 || len(telefono) > 15 {
		return nil, "Escribe tu WhatsApp con código de país, por ejemplo 51986149476."
	}
	if !s.libre(numero) {
		return nil, fmt.Sprintf("El ticket %02d ya tiene dueño (o no existe): elige otro del 1 al %d.", numero, totalTickets)
	}
	if ref != "" && s.porCodigo(ref) == nil {
		return nil, "Ese código de referido no existe. Revísalo o déjalo vacío."
	}
	for _, p := range s.e.Personas {
		if p.Telefono[len(p.Telefono)-9:] == telefono[len(telefono)-9:] {
			return nil, "Ese WhatsApp ya está inscrito. Entra desde el mismo navegador con el que elegiste tu ticket."
		}
	}
	s.e.Siguiente++
	p := Persona{ID: s.e.Siguiente, Nombre: nombre, Telefono: telefono, Token: nuevoToken(), IP: ip, ReferidoPor: ref, CreadoEn: time.Now().UTC()}
	s.e.Personas = append(s.e.Personas, p)
	s.e.Tickets = append(s.e.Tickets, Ticket{Numero: numero, Persona: p.ID})
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
	mux.HandleFunc("GET /referidos", pagina("referidos.html"))
	mux.HandleFunc("GET /pantalla", pagina("pantalla.html"))
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

	// ¿Existe este código? (para avisar en el formulario antes de inscribirse)
	mux.HandleFunc("GET /api/codigo", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		if p := s.porCodigo(limpiarCodigo(r.URL.Query().Get("c"))); p != nil {
			responder(w, 200, map[string]any{"existe": true, "de": strings.Fields(p.Nombre)[0]})
			return
		}
		responder(w, 200, map[string]any{"existe": false})
	})

	mux.HandleFunc("POST /api/elegir", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero   int    `json:"numero"`
			Nombre   string `json:"nombre"`
			Telefono string `json:"telefono"`
			Ref      string `json:"ref"`
			Token    string `json:"t"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "La elección de tickets ya se cerró.")
			return
		}
		// Con token: es un ticket extra ganado por referidos.
		if yo := s.personaDe(in.Token); yo != nil {
			if 1+s.extrasDe(yo)-len(s.ticketsDe(yo.ID)) <= 0 {
				fallo(w, 409, "No tienes tickets extra por elegir. Gana uno con tu código de referido.")
				return
			}
			if !s.libre(in.Numero) {
				fallo(w, 409, fmt.Sprintf("El ticket %02d ya tiene dueño: elige otro.", in.Numero))
				return
			}
			s.e.Tickets = append(s.e.Tickets, Ticket{Numero: in.Numero, Persona: yo.ID, Extra: true})
			s.guardar()
			responder(w, 200, map[string]any{"t": yo.Token, "numero": in.Numero})
			return
		}
		ip := ipDe(r)
		if s.porIP[ip] >= 6 {
			fallo(w, 429, "Demasiadas inscripciones desde esta conexión.")
			return
		}
		p, msg := s.inscribir(in.Numero, in.Nombre, in.Telefono, in.Ref, ip)
		if msg != "" {
			fallo(w, 409, msg)
			return
		}
		s.porIP[ip]++
		s.guardar()
		responder(w, 200, map[string]any{"t": p.Token, "numero": in.Numero})
	})

	// Crea el código de referido de quien ya tiene ticket.
	mux.HandleFunc("POST /api/codigo", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Codigo string `json:"codigo"`
			Token  string `json:"t"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		yo := s.personaDe(in.Token)
		if yo == nil {
			fallo(w, 404, "Primero elige tu ticket en la página del sorteo, desde este mismo navegador.")
			return
		}
		if yo.Codigo != "" {
			fallo(w, 409, "Ya tienes tu código: "+yo.Codigo)
			return
		}
		c := limpiarCodigo(in.Codigo)
		if !codigoValido.MatchString(c) {
			fallo(w, 400, "El código lleva de 3 a 12 letras o números, sin tildes ni espacios (por ejemplo ANA2026).")
			return
		}
		if esOfensivo(c) {
			fallo(w, 400, "Elige un código sin palabras ofensivas.")
			return
		}
		if s.porCodigo(c) != nil {
			fallo(w, 409, "Ese código ya lo tiene otra persona: prueba con otro.")
			return
		}
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "La elección de tickets ya se cerró.")
			return
		}
		yo.Codigo = c
		s.guardar()
		responder(w, 200, s.publico(in.Token))
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
		personas := []map[string]any{}
		for i := range s.e.Personas {
			p := &s.e.Personas[i]
			personas = append(personas, map[string]any{
				"id": p.ID, "nombre": p.Nombre, "telefono": p.Telefono, "ip": p.IP, "creadoEn": p.CreadoEn,
				"codigo": p.Codigo, "referidoPor": p.ReferidoPor, "enGrupo": p.EnGrupo,
				"tickets": s.ticketsDe(p.ID), "extras": s.extrasDe(p), "referidos": len(s.misReferidos(p)),
			})
		}
		out["personasLista"] = personas
		out["revelados"] = s.e.Revelados
		out["quiz"] = s.quizAdmin()
		out["quizAbierto"] = s.e.QuizAbierto
		out["excluidosHoy"] = s.e.ExcluidosHoy
		out["acertijo"] = s.acertijoAdmin()
		out["lista"] = s.lista()
		return out
	}
	s.rutasQuiz(mux, pagina, admin, estadoAdmin)
	s.rutasAcertijo(mux, admin, estadoAdmin)
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/anotar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero   int    `json:"numero"`
			Nombre   string `json:"nombre"`
			Telefono string `json:"telefono"`
			Ref      string `json:"ref"`
		}
		if err := leerJSON(r, &in); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "Solo se anotan tickets mientras la elección está abierta.")
			return
		}
		if _, msg := s.inscribir(in.Numero, in.Nombre, in.Telefono, in.Ref, "panel"); msg != "" {
			fallo(w, 409, msg)
			return
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Marca (o desmarca) que la persona está en el grupo: activa los tickets
	// extra de ella y de quien la refirió.
	mux.HandleFunc("POST /api/admin/grupo", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID      int  `json:"id"`
			EnGrupo bool `json:"enGrupo"`
		}
		if err := leerJSON(r, &in); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "El grupo se confirma mientras la elección está abierta.")
			return
		}
		for i := range s.e.Personas {
			if s.e.Personas[i].ID == in.ID {
				s.e.Personas[i].EnGrupo = in.EnGrupo
			}
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Corrige el nombre de alguien (o borra su código) mientras la elección
	// está abierta: después el nombre ya forma parte de la huella publicada.
	mux.HandleFunc("POST /api/admin/renombrar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID           int    `json:"id"`
			Nombre       string `json:"nombre"`
			BorrarCodigo bool   `json:"borrarCodigo"`
		}
		if err := leerJSON(r, &in); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "Los nombres se corrigen mientras la elección está abierta.")
			return
		}
		for i := range s.e.Personas {
			p := &s.e.Personas[i]
			if p.ID != in.ID {
				continue
			}
			if in.Nombre != "" {
				n := limpiarNombre(in.Nombre)
				if utf8.RuneCountInString(n) < 3 || utf8.RuneCountInString(n) > 40 || !nombreValido.MatchString(n) || esOfensivo(n) {
					fallo(w, 400, "Ese nombre no vale: de 3 a 40 letras y sin palabras ofensivas.")
					return
				}
				p.Nombre = n
			}
			if in.BorrarCodigo && p.Codigo != "" {
				// quienes llegaron con ese código se quedan sin referido
				for j := range s.e.Personas {
					if s.e.Personas[j].ReferidoPor == p.Codigo {
						s.e.Personas[j].ReferidoPor = ""
					}
				}
				p.Codigo = ""
			}
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/quitar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero int `json:"numero"`
		}
		if err := leerJSON(r, &in); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "Solo se libera un ticket mientras la elección está abierta.")
			return
		}
		quedan := s.e.Tickets[:0]
		for _, t := range s.e.Tickets {
			if t.Numero != in.Numero {
				quedan = append(quedan, t)
			}
		}
		s.e.Tickets = quedan
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Asigna al azar los tickets extra que nadie eligió.
	mux.HandleFunc("POST /api/admin/asignar-extras", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "Los extras se asignan mientras la elección está abierta.")
			return
		}
		n := s.asignarExtras()
		s.guardar()
		out := estadoAdmin()
		out["asignados"] = n
		responder(w, 200, out)
	}))
	mux.HandleFunc("POST /api/admin/cerrar", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "La elección ya estaba cerrada.")
			return
		}
		// los extras que nadie eligió se asignan al azar antes de la huella
		s.asignarExtras()
		con := map[int]bool{}
		for _, t := range s.e.Tickets {
			con[t.Persona] = true
		}
		if len(con) < s.e.Ganadores {
			fallo(w, 409, fmt.Sprintf("Hay %d personas con ticket: hacen falta al menos %d.", len(con), s.e.Ganadores))
			return
		}
		s.e.Semilla = nuevoToken() + nuevoToken()
		s.e.Compromiso = sha(s.e.Semilla)
		s.e.HuellaLista = sha(listaCanonica(s.lista()))
		ahora := time.Now().UTC()
		s.e.CerradoEn = &ahora
		s.e.Fase = "cerrado"
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/reabrir", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "Solo se puede reabrir antes de empezar el sorteo.")
			return
		}
		s.e.Semilla, s.e.Compromiso, s.e.HuellaLista, s.e.CerradoEn = "", "", "", nil
		s.e.Fase = "inscripcion"
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Empezar: calcula todos los giros; «girar» los revela de uno en uno.
	mux.HandleFunc("POST /api/admin/empezar", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "Primero cierra la elección de tickets.")
			return
		}
		s.e.Pasos = calcularSorteo(s.e.Semilla, s.lista(), s.e.Premios, s.e.Ganadores)
		s.e.Revelados = 0
		s.e.Fase = "sorteo"
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/girar", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "sorteo" {
			fallo(w, 409, "El sorteo no está en marcha.")
			return
		}
		if s.e.Revelados < len(s.e.Pasos) {
			s.e.Revelados++
		}
		if s.e.Revelados == len(s.e.Pasos) {
			s.e.Fase = "fin"
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Más rondas con la misma semilla comprometida: el cálculo es secuencial,
	// así que los giros ya revelados no cambian y los nuevos excluyen a quienes
	// ya ganaron. Vuelve a la fase de sorteo para girarlos.
	mux.HandleFunc("POST /api/admin/ampliar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Mas int `json:"mas"`
		}
		_ = leerJSON(r, &in)
		if in.Mas < 1 || in.Mas > 10 {
			in.Mas = 3
		}
		if s.e.Fase != "sorteo" && s.e.Fase != "fin" {
			fallo(w, 409, "Primero empieza el sorteo.")
			return
		}
		pasos := calcularSorteo(s.e.Semilla, s.lista(), s.e.Premios, s.e.Ganadores+in.Mas)
		if len(pasos) < len(s.e.Pasos) || !reflect.DeepEqual(pasos[:len(s.e.Pasos)], s.e.Pasos) {
			fallo(w, 500, "Los giros ya revelados no coinciden: no se amplía.")
			return
		}
		if len(pasos) == len(s.e.Pasos) {
			fallo(w, 409, "Ya no quedan personas sin premio (o premios) para más rondas.")
			return
		}
		s.e.Ganadores += in.Mas
		s.e.Pasos = pasos
		s.e.Fase = "sorteo"
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.e = Estado{Edicion: s.e.Edicion + 1, Titulo: s.e.Titulo, Fase: "inscripcion", Ganadores: s.e.Ganadores, Premios: premiosIniciales()}
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
		s.e = Estado{Edicion: 1, Titulo: "Sorteo de las secuencias", Fase: "inscripcion", Ganadores: 3, Premios: premiosIniciales()}
		s.guardar()
	}
	for _, p := range s.e.Personas {
		s.porIP[p.IP]++
	}
	// Los precios y notas de los premios se toman siempre del código (por id):
	// así se corrigen sin tocar los tickets. El descuento y el orden no cambian.
	base := map[string]Premio{}
	for _, p := range premiosIniciales() {
		base[p.ID] = p
	}
	for i, p := range s.e.Premios {
		if b, ok := base[p.ID]; ok && b.Descuento == p.Descuento {
			s.e.Premios[i].Curso, s.e.Premios[i].Precio, s.e.Premios[i].Temprano, s.e.Premios[i].Nota = b.Curso, b.Precio, b.Temprano, b.Nota
		}
	}
	s.guardar()
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18615"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("sorteo de las secuencias en :%s (%d personas, %d tickets, fase %s)", puerto, len(s.e.Personas), len(s.e.Tickets), s.e.Fase)
	log.Fatal(srv.ListenAndServe())
}
