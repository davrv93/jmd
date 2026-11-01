// Sorteo QA: 50 números y descuentos en el taller
// «Automatización de pruebas y QA con inteligencia artificial».
//
// Cada persona agarra un número libre del 1 al 50 (uno por persona) y ve su
// premio al instante: la ruleta de 50 casillas (1 = 100 % en Ingeniería de
// Requerimientos, 6 = 80 % en el taller QA, 18 = 70 %, 25 = 60 %) cae en la
// casilla que dicta una semilla secreta: azar(semilla, "premio", número, 0, 50).
// Hay tope de cupones (1 y 6 en las dos primeras bandas); cuando una banda se
// agota, esos números pasan a la banda siguiente.
//
// La huella SHA-256 de la semilla se publica desde el principio; al cerrar la
// inscripción se revela la semilla y cualquiera puede rehacer el sorteo en su
// navegador, en el orden en que la gente eligió.
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
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

const (
	totalNumeros = 50
	casillas     = 50 // casillas de la ruleta de premios
	cursoTaller  = "Automatización de pruebas y QA con inteligencia artificial"
	precioTaller = 100
)

func init() { _ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8") }

// Premio: un descuento sobre un curso. Casillas dice cuántas de las 50 le
// tocan en la ruleta; Tope, cuántos cupones hay como máximo (0 = sin tope).
// El orden de la lista es el orden en que se baja de banda cuando se agota.
type Premio struct {
	ID        string `json:"id"`
	Descuento int    `json:"descuento"`
	Casillas  int    `json:"casillas"`
	Tope      int    `json:"tope"`
	Color     string `json:"color"`
	Nombre    string `json:"nombre"`
	Curso     string `json:"curso"`
	Precio    int    `json:"precio"`
}

const cursoReq = "Ingeniería de Requerimientos"

var premios = []Premio{
	{ID: "req100", Descuento: 100, Casillas: 1, Tope: 1, Color: "#ffd166", Nombre: "Requerimientos gratis", Curso: cursoReq, Precio: 40},
	{ID: "80", Descuento: 80, Casillas: 6, Tope: 6, Color: "#8fd3c7", Nombre: "Premio mayor", Curso: cursoTaller, Precio: precioTaller},
	{ID: "70", Descuento: 70, Casillas: 18, Tope: 0, Color: "#a9c9f5", Nombre: "70 %", Curso: cursoTaller, Precio: precioTaller},
	{ID: "60", Descuento: 60, Casillas: 25, Tope: 0, Color: "#e8e3f8", Nombre: "60 %", Curso: cursoTaller, Precio: precioTaller},
}

// franjaDe: qué premio hay en la casilla i (0..49). La 0 es el 100 % en
// Requerimientos; las de la forma 8k+4 (4, 12, 20, 28, 36 y 44), el 80 %; de
// las 43 restantes, la k-ésima es 70 % cuando floor((k+1)·18/43) supera
// floor(k·18/43) (18 casillas), y las otras 25 son 60 %. El navegador repite
// la misma regla.
func franjaDe(i int) string {
	if i == 0 {
		return "req100"
	}
	if i%8 == 4 {
		return "80"
	}
	k := i - 1 - (i+3)/8 // cuántas casillas de 70/60 hay antes de la i
	if (k+1)*18/43 > k*18/43 {
		return "70"
	}
	return "60"
}

func franjas() []string {
	out := make([]string, casillas)
	for i := range out {
		out[i] = franjaDe(i)
	}
	return out
}

// conTope: la banda que de verdad se entrega. Si la de la casilla ya llegó a
// su tope, baja a la siguiente de la lista. entregados cuenta por banda.
func conTope(banda string, entregados map[string]int) string {
	for i, p := range premios {
		if p.ID != banda {
			continue
		}
		for j := i; j < len(premios); j++ {
			if premios[j].Tope == 0 || entregados[premios[j].ID] < premios[j].Tope {
				return premios[j].ID
			}
		}
	}
	return premios[len(premios)-1].ID
}

type Persona struct {
	ID       int       `json:"id"`
	Nombre   string    `json:"nombre"`
	Telefono string    `json:"telefono"`
	Token    string    `json:"token"`
	IP       string    `json:"ip"`
	CreadoEn time.Time `json:"creadoEn"`
}

// Ticket: el número de una persona y su premio, sorteado al instante.
type Ticket struct {
	Numero  int    `json:"numero"`
	Persona int    `json:"persona"`
	Casilla int    `json:"casilla"`
	Banda   string `json:"banda"`  // lo que marcó la ruleta
	Premio  string `json:"premio"` // lo que se entrega (tras el tope)
}

type Estado struct {
	Edicion    int        `json:"edicion"`
	Titulo     string     `json:"titulo"`
	Fase       string     `json:"fase"` // inscripcion | cerrado
	Personas   []Persona  `json:"personas"`
	Tickets    []Ticket   `json:"tickets"` // en orden de elección
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
	return Estado{Edicion: edicion, Titulo: "Sorteo QA", Fase: "inscripcion", Semilla: semilla, Compromiso: sha(semilla)}
}

// azar: los 8 primeros bytes de SHA-256(«semilla:etiqueta:ronda:intento»)
// módulo n. El navegador lo repite igual con BigInt.
func azar(semilla, etiqueta string, ronda, intento, n int) int {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:%s:%d:%d", semilla, etiqueta, ronda, intento)))
	return int(binary.BigEndian.Uint64(h[:8]) % uint64(n))
}

// sortear calcula el premio de un número nuevo según la semilla y los tickets
// ya entregados (en orden). Es puro: la comprobación del navegador lo repite.
func sortear(semilla string, numero int, previos []Ticket) (casilla int, banda, premio string) {
	entregados := map[string]int{}
	for _, t := range previos {
		entregados[t.Premio]++
	}
	casilla = azar(semilla, "premio", numero, 0, casillas)
	banda = franjaDe(casilla)
	return casilla, banda, conTope(banda, entregados)
}

func (s *Servidor) entregados() map[string]int {
	out := map[string]int{}
	for _, p := range premios {
		out[p.ID] = 0
	}
	for _, t := range s.e.Tickets {
		out[t.Premio]++
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

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }

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

func (s *Servidor) ticketDe(id int) *Ticket {
	for i := range s.e.Tickets {
		if s.e.Tickets[i].Persona == id {
			return &s.e.Tickets[i]
		}
	}
	return nil
}

func (s *Servidor) libre(numero int) bool {
	for _, t := range s.e.Tickets {
		if t.Numero == numero {
			return false
		}
	}
	return numero >= 1 && numero <= totalNumeros
}

// resultado: la lista pública de ganadores, en orden de elección.
func (s *Servidor) resultado() []map[string]any {
	nombre := map[int]string{}
	for _, p := range s.e.Personas {
		nombre[p.ID] = p.Nombre
	}
	out := []map[string]any{}
	for i, t := range s.e.Tickets {
		out = append(out, map[string]any{"orden": i + 1, "numero": t.Numero, "persona": t.Persona, "nombre": nombre[t.Persona], "casilla": t.Casilla, "banda": t.Banda, "premio": t.Premio})
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
	quedan := map[string]int{}
	ent := s.entregados()
	for _, p := range premios {
		if p.Tope > 0 {
			quedan[p.ID] = max(0, p.Tope-ent[p.ID])
		}
	}
	out := map[string]any{
		"edicion": e.Edicion, "titulo": e.Titulo, "fase": e.Fase,
		"total": totalNumeros, "ocupados": ocupados, "personas": len(e.Personas),
		"premios": premios, "franjas": franjas(), "curso": cursoTaller, "precio": precioTaller,
		"compromiso": e.Compromiso, "entregados": ent, "quedan": quedan, "resultado": s.resultado(),
	}
	if e.Fase == "cerrado" {
		out["semilla"] = e.Semilla
	}
	if yo := s.personaDe(token); yo != nil {
		t := s.ticketDe(yo.ID)
		out["yo"] = map[string]any{"id": yo.ID, "nombre": yo.Nombre, "numero": t.Numero, "casilla": t.Casilla, "banda": t.Banda, "premio": t.Premio}
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

// inscribir valida, guarda a la persona con su número y sortea su premio al
// instante. Devuelve el mensaje de error o "".
func (s *Servidor) inscribir(numero int, nombre, telefono, ip string) (*Persona, *Ticket, string) {
	nombre = limpiarNombre(nombre)
	telefono = noDigitos.ReplaceAllString(telefono, "")
	if n := utf8.RuneCountInString(nombre); n < 3 || n > 40 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") {
		return nil, nil, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres)."
	}
	if esOfensivo(nombre) {
		return nil, nil, "Escribe tu nombre real, sin palabras ofensivas."
	}
	if len(telefono) < 9 || len(telefono) > 15 {
		return nil, nil, "Escribe tu WhatsApp con código de país, por ejemplo 51986149476."
	}
	if !s.libre(numero) {
		return nil, nil, fmt.Sprintf("El número %02d ya tiene dueño (o no existe): elige otro del 1 al %d.", numero, totalNumeros)
	}
	for _, p := range s.e.Personas {
		if p.Telefono[len(p.Telefono)-9:] == telefono[len(telefono)-9:] {
			return nil, nil, "Ese WhatsApp ya tiene su número. Entra desde el mismo navegador con el que lo elegiste."
		}
	}
	s.e.Siguiente++
	p := Persona{ID: s.e.Siguiente, Nombre: nombre, Telefono: telefono, Token: nuevoToken(), IP: ip, CreadoEn: time.Now().UTC()}
	s.e.Personas = append(s.e.Personas, p)
	c, b, pr := sortear(s.e.Semilla, numero, s.e.Tickets)
	s.e.Tickets = append(s.e.Tickets, Ticket{Numero: numero, Persona: p.ID, Casilla: c, Banda: b, Premio: pr})
	return &s.e.Personas[len(s.e.Personas)-1], &s.e.Tickets[len(s.e.Tickets)-1], ""
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

	mux.HandleFunc("POST /api/elegir", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero   int    `json:"numero"`
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
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "La inscripción ya se cerró.")
			return
		}
		if yo := s.personaDe(in.Token); yo != nil {
			fallo(w, 409, fmt.Sprintf("Ya tienes tu número: el %02d. Es uno por persona.", s.ticketDe(yo.ID).Numero))
			return
		}
		ip := ipDe(r)
		if s.porIP[ip] >= 6 {
			fallo(w, 429, "Demasiadas inscripciones desde esta conexión.")
			return
		}
		p, t, msg := s.inscribir(in.Numero, in.Nombre, in.Telefono, ip)
		if msg != "" {
			fallo(w, 409, msg)
			return
		}
		s.porIP[ip]++
		s.guardar()
		responder(w, 200, map[string]any{"t": p.Token, "numero": t.Numero, "casilla": t.Casilla, "banda": t.Banda, "premio": t.Premio})
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
			t := s.ticketDe(p.ID)
			personas = append(personas, map[string]any{
				"id": p.ID, "nombre": p.Nombre, "telefono": p.Telefono, "ip": p.IP, "creadoEn": p.CreadoEn,
				"numero": t.Numero, "premio": t.Premio, "banda": t.Banda,
			})
		}
		out["personasLista"] = personas
		return out
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("GET /api/admin/csv", admin(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=sorteo-qa.csv")
		fmt.Fprintln(w, "orden,numero,nombre,whatsapp,premio,ruleta,hora")
		for i, t := range s.e.Tickets {
			for _, p := range s.e.Personas {
				if p.ID == t.Persona {
					fmt.Fprintf(w, "%d,%d,%q,%s,%s,%s,%s\n", i+1, t.Numero, p.Nombre, p.Telefono, t.Premio, t.Banda, p.CreadoEn.Format(time.RFC3339))
				}
			}
		}
	}))
	mux.HandleFunc("POST /api/admin/anotar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero   int    `json:"numero"`
			Nombre   string `json:"nombre"`
			Telefono string `json:"telefono"`
		}
		if err := leerJSON(r, &in); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "Solo se anotan números mientras la inscripción está abierta.")
			return
		}
		if _, _, msg := s.inscribir(in.Numero, in.Nombre, in.Telefono, "panel"); msg != "" {
			fallo(w, 409, msg)
			return
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Corrige un nombre (por ejemplo, ofensivo). El premio no cambia.
	mux.HandleFunc("POST /api/admin/renombrar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero int    `json:"numero"`
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
		for _, t := range s.e.Tickets {
			if t.Numero == in.Numero {
				for i := range s.e.Personas {
					if s.e.Personas[i].ID == t.Persona {
						s.e.Personas[i].Nombre = n
					}
				}
			}
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Libera un número y borra a su dueño. Ojo: cambia el orden de los topes
	// para quien eligió después, así que solo mientras está abierta y con cuidado.
	mux.HandleFunc("POST /api/admin/quitar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero int `json:"numero"`
		}
		if err := leerJSON(r, &in); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "Solo se libera un número mientras la inscripción está abierta.")
			return
		}
		tickets, personas := []Ticket{}, []Persona{}
		quitada := 0
		for _, t := range s.e.Tickets {
			if t.Numero == in.Numero {
				quitada = t.Persona
			} else {
				tickets = append(tickets, t)
			}
		}
		for _, p := range s.e.Personas {
			if p.ID != quitada {
				personas = append(personas, p)
			}
		}
		s.e.Tickets, s.e.Personas = tickets, personas
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Cerrar revela la semilla: desde ahí cualquiera puede comprobar.
	mux.HandleFunc("POST /api/admin/cerrar", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "La inscripción ya estaba cerrada.")
			return
		}
		ahora := time.Now().UTC()
		s.e.CerradoEn = &ahora
		s.e.Fase = "cerrado"
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/reabrir", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "La inscripción no está cerrada.")
			return
		}
		// la semilla ya se reveló: se cambia para que lo que venga siga siendo secreto
		nuevo := estadoNuevo(s.e.Edicion)
		s.e.Semilla, s.e.Compromiso, s.e.CerradoEn = nuevo.Semilla, nuevo.Compromiso, nil
		s.e.Fase = "inscripcion"
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
		puerto = "18635"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("sorteo QA en :%s (%d personas, fase %s)", puerto, len(s.e.Personas), s.e.Fase)
	log.Fatal(srv.ListenAndServe())
}
