// Sorteo del Grupo 5 «Programación agéntica», con la estética «Difícil de explicar».
//
// La lista sale de los inscritos del LMS (un script del servidor la empuja
// mientras está abierta) más los nombres que añada el organizador. Al cerrar
// la lista se numeran los participantes, se generan DOS semillas secretas y se
// publican sus huellas SHA-256 junto con la de la lista canónica:
//
//   - Ronda 1 revela la semilla 1: de ella salen, de forma determinista, los
//     3 finalistas.
//   - Ronda 2 revela la semilla 2: de ella sale el único ganador entre los 3.
//
// Cualquiera puede comprobar en su navegador que cada semilla corresponde a la
// huella publicada antes y que el resultado es el que dicta. Nadie, ni el
// organizador, sabe el resultado antes de cada ronda.
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

const Finalistas = 3

type Persona struct {
	ID     string `json:"id"` // lms:<huella> o man:<azar>; nunca se publica
	Nombre string `json:"nombre"`
	Origen string `json:"origen"` // lms | manual
}

type Participante struct {
	Numero int    `json:"numero"`
	Nombre string `json:"nombre"`
}

type Estado struct {
	Edicion     int            `json:"edicion"`
	Titulo      string         `json:"titulo"`
	Fase        string         `json:"fase"` // abierto | cerrado | finalistas | ganador
	LMS         []Persona      `json:"lms"`
	Manuales    []Persona      `json:"manuales"`
	Excluidos   []string       `json:"excluidos"`
	SincEn      *time.Time     `json:"sincEn,omitempty"`
	Lista       []Participante `json:"lista"` // congelada al cerrar
	Semilla1    string         `json:"semilla1"`
	Semilla2    string         `json:"semilla2"`
	Compromiso1 string         `json:"compromiso1"`
	Compromiso2 string         `json:"compromiso2"`
	HuellaLista string         `json:"huellaLista"`
	Finalistas  []int          `json:"finalistas"`
	Ganador     int            `json:"ganador"`
	Reaperturas int            `json:"reaperturas"`
	CerradoEn   *time.Time     `json:"cerradoEn,omitempty"`
	Ronda1En    *time.Time     `json:"ronda1En,omitempty"`
	Ronda2En    *time.Time     `json:"ronda2En,omitempty"`
}

type Servidor struct {
	mu      sync.Mutex
	e       Estado
	archivo string
	clave   string
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

var espacios = regexp.MustCompile(`\s+`)
var nombreValido = regexp.MustCompile(`^[\p{L}\p{M}0-9 .'\-]+$`)

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }

func sinTildes(s string) string {
	return strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "à", "a", "è", "e").Replace(s)
}
func claveOrden(n string) string { return sinTildes(strings.ToLower(limpiarNombre(n))) }

// Lista canónica: «número|nombre» por línea, ordenada por número.
func listaCanonica(ps []Participante) string {
	orden := append([]Participante(nil), ps...)
	sort.Slice(orden, func(i, j int) bool { return orden[i].Numero < orden[j].Numero })
	var b strings.Builder
	for i, p := range orden {
		if i > 0 {
			b.WriteByte('\n')
		}
		fmt.Fprintf(&b, "%d|%s", p.Numero, p.Nombre)
	}
	return b.String()
}

// En cada paso k, los 8 primeros bytes de SHA-256(semilla:k) eligen uno de
// los números que quedan (orden ascendente). Se repite igual en JS.
func elegir(semilla string, numeros []int, n int) []int {
	quedan := append([]int(nil), numeros...)
	sort.Ints(quedan)
	var out []int
	for k := 0; k < n && len(quedan) > 0; k++ {
		h := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", semilla, k)))
		x := binary.BigEndian.Uint64(h[:8])
		i := int(x % uint64(len(quedan)))
		out = append(out, quedan[i])
		quedan = append(quedan[:i], quedan[i+1:]...)
	}
	return out
}

// Participantes vigentes (LMS + manuales − excluidos), sin repetir nombre,
// en orden alfabético. Es lo que se numera al cerrar.
func (e *Estado) vigentes() []Persona {
	fuera := map[string]bool{}
	for _, id := range e.Excluidos {
		fuera[id] = true
	}
	visto := map[string]bool{}
	var out []Persona
	for _, p := range append(append([]Persona(nil), e.LMS...), e.Manuales...) {
		k := claveOrden(p.Nombre)
		if fuera[p.ID] || visto[k] || k == "" {
			continue
		}
		visto[k] = true
		out = append(out, p)
	}
	sort.SliceStable(out, func(i, j int) bool { return claveOrden(out[i].Nombre) < claveOrden(out[j].Nombre) })
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

func nombreDe(lista []Participante, n int) string {
	for _, p := range lista {
		if p.Numero == n {
			return p.Nombre
		}
	}
	return ""
}

// Lo que ve cualquiera: solo nombres, y cada semilla solo tras su ronda.
func (s *Servidor) publico() map[string]any {
	e := s.e
	out := map[string]any{
		"edicion": e.Edicion, "titulo": e.Titulo, "fase": e.Fase,
		"compromiso1": e.Compromiso1, "compromiso2": e.Compromiso2, "huellaLista": e.HuellaLista,
		"reaperturas": e.Reaperturas, "nFinalistas": Finalistas,
	}
	if e.Fase == "abierto" {
		nombres := []map[string]any{}
		for i, p := range e.vigentes() {
			nombres = append(nombres, map[string]any{"numero": i + 1, "nombre": p.Nombre})
		}
		out["lista"] = nombres
	} else {
		out["lista"] = e.Lista
	}
	if e.Fase == "finalistas" || e.Fase == "ganador" {
		fin := []Participante{}
		for _, n := range e.Finalistas {
			fin = append(fin, Participante{n, nombreDe(e.Lista, n)})
		}
		out["semilla1"] = e.Semilla1
		out["finalistas"] = fin
	}
	if e.Fase == "ganador" {
		out["semilla2"] = e.Semilla2
		out["ganador"] = Participante{e.Ganador, nombreDe(e.Lista, e.Ganador)}
	}
	return out
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	c := r.Header.Get("X-Clave")
	return c != "" && subtle.ConstantTimeCompare([]byte(c), []byte(s.clave)) == 1
}

func leerJSON(r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 256<<10)).Decode(v)
}

func (s *Servidor) cerrar() error {
	v := s.e.vigentes()
	if len(v) < 2 {
		return fmt.Errorf("Hay %d participante(s): hacen falta al menos 2.", len(v))
	}
	s.e.Lista = make([]Participante, len(v))
	for i, p := range v {
		s.e.Lista[i] = Participante{i + 1, p.Nombre}
	}
	s.e.Semilla1 = nuevoToken() + nuevoToken()
	s.e.Semilla2 = nuevoToken() + nuevoToken()
	s.e.Compromiso1, s.e.Compromiso2 = sha(s.e.Semilla1), sha(s.e.Semilla2)
	s.e.HuellaLista = sha(listaCanonica(s.e.Lista))
	ahora := time.Now().UTC()
	s.e.CerradoEn = &ahora
	s.e.Fase = "cerrado"
	return nil
}

func (s *Servidor) ronda1() {
	nums := make([]int, len(s.e.Lista))
	for i, p := range s.e.Lista {
		nums[i] = p.Numero
	}
	s.e.Finalistas = elegir(s.e.Semilla1, nums, Finalistas)
	ahora := time.Now().UTC()
	s.e.Ronda1En = &ahora
	s.e.Fase = "finalistas"
}

// El ganador sale de la semilla 2 entre los finalistas (en orden ascendente).
func ganadorDe(semilla2 string, finalistas []int) int {
	g := elegir(semilla2, finalistas, 1)
	return g[0]
}

func (s *Servidor) ronda2() {
	s.e.Ganador = ganadorDe(s.e.Semilla2, s.e.Finalistas)
	ahora := time.Now().UTC()
	s.e.Ronda2En = &ahora
	s.e.Fase = "ganador"
}

// Vuelve a «abierto» con la misma lista viva; descarta semillas y resultados.
func (s *Servidor) reiniciar() {
	e := s.e
	s.e = Estado{Edicion: e.Edicion + 1, Titulo: e.Titulo, Fase: "abierto", LMS: e.LMS, Manuales: e.Manuales, Excluidos: e.Excluidos, SincEn: e.SincEn}
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
	mux.Handle("GET /static/", estaticos)
	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.publico())
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
	vistaAdmin := func() map[string]any {
		out := s.publico()
		fuera := map[string]bool{}
		for _, id := range s.e.Excluidos {
			fuera[id] = true
		}
		todas := []map[string]any{}
		for _, p := range append(append([]Persona(nil), s.e.LMS...), s.e.Manuales...) {
			todas = append(todas, map[string]any{"id": p.ID, "nombre": p.Nombre, "origen": p.Origen, "excluido": fuera[p.ID]})
		}
		out["personas"] = todas
		out["sincEn"] = s.e.SincEn
		return out
	}
	enAbierto := func(w http.ResponseWriter) bool {
		if s.e.Fase != "abierto" {
			fallo(w, 409, "La lista ya está cerrada. Reinicia el sorteo para cambiarla.")
			return false
		}
		return true
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) { responder(w, 200, vistaAdmin()) }))

	// El script del servidor empuja aquí los inscritos del LMS. Cerrada la
	// lista, se ignora: lo sorteado no cambia.
	mux.HandleFunc("POST /api/admin/lms", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Personas []Persona `json:"personas"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		if s.e.Fase != "abierto" {
			responder(w, 200, map[string]any{"ok": true, "ignorado": true, "fase": s.e.Fase})
			return
		}
		var lms []Persona
		for _, p := range in.Personas {
			n := limpiarNombre(p.Nombre)
			if p.ID == "" || n == "" || utf8.RuneCountInString(n) > 60 {
				continue
			}
			lms = append(lms, Persona{ID: "lms:" + sha(p.ID)[:16], Nombre: n, Origen: "lms"})
		}
		s.e.LMS = lms
		ahora := time.Now().UTC()
		s.e.SincEn = &ahora
		s.guardar()
		responder(w, 200, map[string]any{"ok": true, "total": len(s.e.vigentes())})
	}))
	mux.HandleFunc("POST /api/admin/agregar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre string `json:"nombre"`
		}
		if err := leerJSON(r, &in); err != nil || !enAbierto(w) {
			if err != nil {
				fallo(w, 400, "Datos no válidos.")
			}
			return
		}
		n := limpiarNombre(in.Nombre)
		if c := utf8.RuneCountInString(n); c < 3 || c > 60 || !nombreValido.MatchString(n) {
			fallo(w, 400, "Escribe un nombre (solo letras, de 3 a 60 caracteres).")
			return
		}
		for _, p := range s.e.vigentes() {
			if claveOrden(p.Nombre) == claveOrden(n) {
				fallo(w, 409, "Ese nombre ya está en la lista.")
				return
			}
		}
		s.e.Manuales = append(s.e.Manuales, Persona{ID: "man:" + nuevoToken()[:12], Nombre: n, Origen: "manual"})
		s.guardar()
		responder(w, 200, vistaAdmin())
	}))
	mux.HandleFunc("POST /api/admin/excluir", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID       string `json:"id"`
			Excluido bool   `json:"excluido"`
		}
		if err := leerJSON(r, &in); err != nil || !enAbierto(w) {
			if err != nil {
				fallo(w, 400, "Datos no válidos.")
			}
			return
		}
		if strings.HasPrefix(in.ID, "man:") && in.Excluido {
			q := s.e.Manuales[:0]
			for _, p := range s.e.Manuales {
				if p.ID != in.ID {
					q = append(q, p)
				}
			}
			s.e.Manuales = q
		} else {
			q := []string{}
			for _, id := range s.e.Excluidos {
				if id != in.ID {
					q = append(q, id)
				}
			}
			if in.Excluido {
				q = append(q, in.ID)
			}
			s.e.Excluidos = q
		}
		s.guardar()
		responder(w, 200, vistaAdmin())
	}))
	mux.HandleFunc("POST /api/admin/cerrar", admin(func(w http.ResponseWriter, r *http.Request) {
		if !enAbierto(w) {
			return
		}
		if err := s.cerrar(); err != nil {
			fallo(w, 409, err.Error())
			return
		}
		s.guardar()
		responder(w, 200, vistaAdmin())
	}))
	mux.HandleFunc("POST /api/admin/reabrir", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "Solo se puede reabrir antes de la ronda 1.")
			return
		}
		s.e.Lista, s.e.Semilla1, s.e.Semilla2, s.e.Compromiso1, s.e.Compromiso2, s.e.HuellaLista, s.e.CerradoEn = nil, "", "", "", "", "", nil
		s.e.Reaperturas++
		s.e.Fase = "abierto"
		s.guardar()
		responder(w, 200, vistaAdmin())
	}))
	mux.HandleFunc("POST /api/admin/ronda1", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "Primero cierra la lista.")
			return
		}
		s.ronda1()
		s.guardar()
		responder(w, 200, vistaAdmin())
	}))
	mux.HandleFunc("POST /api/admin/ronda2", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "finalistas" {
			fallo(w, 409, "Primero lanza la ronda 1.")
			return
		}
		s.ronda2()
		s.guardar()
		responder(w, 200, vistaAdmin())
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.reiniciar()
		s.guardar()
		responder(w, 200, vistaAdmin())
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
	s := &Servidor{archivo: filepath.Join(datos, "estado.json"), clave: clave}
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
	} else {
		titulo := os.Getenv("SORTEO_TITULO")
		if titulo == "" {
			titulo = "Sorteo del Grupo 5 · Programación agéntica"
		}
		s.e = Estado{Edicion: 1, Titulo: titulo, Fase: "abierto"}
		s.guardar()
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18550"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("sorteo-g5 en :%s (fase %s)", puerto, s.e.Fase)
	log.Fatal(srv.ListenAndServe())
}
