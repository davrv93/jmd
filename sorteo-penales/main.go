// Sorteo en vivo con tanda de penales.
//
// Cada persona escribe su nombre y recibe un número (uno por persona). El
// organizador cierra las inscripciones: en ese momento se genera una semilla
// secreta y se publica su huella SHA-256 junto con la de la lista. Al activar
// el modo ganador se revela la semilla y los ganadores salen de ella de forma
// determinista, así que cualquiera puede comprobar en su navegador que la
// semilla corresponde a la huella publicada antes y que los ganadores son los
// que dicta. Nadie, ni el organizador, sabe quién gana hasta ese momento.
//
// Los penales solo muestran el resultado: los ganadores meten los 3; los
// demás fallan al menos uno. Las direcciones salen también de la semilla.
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

type Participante struct {
	Numero   int       `json:"numero"`
	Nombre   string    `json:"nombre"`
	Token    string    `json:"token"`
	IP       string    `json:"ip"`
	CreadoEn time.Time `json:"creadoEn"`
}

type Estado struct {
	Edicion       int            `json:"edicion"`
	Titulo        string         `json:"titulo"`
	Fase          string         `json:"fase"` // inscripcion | cerrado | sorteado
	Ganadores     int            `json:"ganadores"`
	Participantes []Participante `json:"participantes"`
	Siguiente     int            `json:"siguiente"`
	Semilla       string         `json:"semilla"`
	Compromiso    string         `json:"compromiso"`
	HuellaLista   string         `json:"huellaLista"`
	Resultado     []int          `json:"resultado"`
	Reaperturas   int            `json:"reaperturas"`
	CerradoEn     *time.Time     `json:"cerradoEn,omitempty"`
	SorteadoEn    *time.Time     `json:"sorteadoEn,omitempty"`
}

type Servidor struct {
	mu      sync.Mutex
	e       Estado
	archivo string
	clave   string
	porIP   map[string]int
	curso   Curso
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

// Lista canónica: «número|nombre» por línea, ordenada por número. Es lo que
// resume la huella y lo que recorre el sorteo.
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

// Ganadores: en cada ronda k, los 8 primeros bytes de SHA-256(semilla:k)
// eligen uno de los números que quedan (orden ascendente). Se repite en JS.
func elegirGanadores(semilla string, numeros []int, n int) []int {
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

type Tiro struct {
	Resultado string `json:"resultado"` // gol | atajada | poste
	Lado      int    `json:"lado"`      // 0 izquierda, 1 centro, 2 derecha
	Alto      bool   `json:"alto"`
	Arquero   int    `json:"arquero"`
}

// Tanda de 3 penales de un número. Ganador: 3 goles. Resto: al menos un fallo.
func penales(semilla string, numero int, gana bool) []Tiro {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:penal:%d", semilla, numero)))
	patrones := [][3]bool{{false, false, false}, {true, false, false}, {false, true, false}, {false, false, true}, {true, true, false}, {true, false, true}, {false, true, true}}
	goles := [3]bool{true, true, true}
	if !gana {
		goles = patrones[int(h[0])%len(patrones)]
	}
	tiros := make([]Tiro, 3)
	for i := 0; i < 3; i++ {
		lado := int(h[1+i]) % 3
		t := Tiro{Lado: lado, Alto: h[4+i]%2 == 0}
		switch {
		case goles[i]:
			t.Resultado = "gol"
			t.Arquero = (lado + 1 + int(h[7+i])%2) % 3
		case lado != 1 && h[10+i]%3 == 0:
			t.Resultado = "poste"
			t.Arquero = (lado + 1) % 3
		default:
			t.Resultado = "atajada"
			t.Arquero = lado
		}
		tiros[i] = t
	}
	return tiros
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

func limpiarNombre(n string) string {
	return strings.TrimSpace(espacios.ReplaceAllString(n, " "))
}

func clave(n string) string { return strings.ToLower(limpiarNombre(n)) }

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return strings.Split(r.RemoteAddr, ":")[0]
}

// Lo que ve cualquiera (sin tokens ni IP, y sin la semilla hasta el sorteo).
func (s *Servidor) publico(token string) map[string]any {
	e := s.e
	out := map[string]any{
		"edicion":     e.Edicion,
		"titulo":      e.Titulo,
		"fase":        e.Fase,
		"ganadores":   e.Ganadores,
		"total":       len(e.Participantes),
		"compromiso":  e.Compromiso,
		"huellaLista": e.HuellaLista,
		"reaperturas": e.Reaperturas,
	}
	if e.Fase != "inscripcion" {
		lista := make([]map[string]any, 0, len(e.Participantes))
		for _, p := range e.Participantes {
			lista = append(lista, map[string]any{"numero": p.Numero, "nombre": p.Nombre})
		}
		out["lista"] = lista
	}
	var yo *Participante
	for i := range e.Participantes {
		if token != "" && subtle.ConstantTimeCompare([]byte(e.Participantes[i].Token), []byte(token)) == 1 {
			yo = &e.Participantes[i]
		}
	}
	if yo != nil {
		out["yo"] = map[string]any{"numero": yo.Numero, "nombre": yo.Nombre}
	}
	if e.Fase == "sorteado" {
		gan := []map[string]any{}
		esGanador := map[int]bool{}
		for _, n := range e.Resultado {
			esGanador[n] = true
			for _, p := range e.Participantes {
				if p.Numero == n {
					gan = append(gan, map[string]any{"numero": n, "nombre": p.Nombre, "penales": penales(e.Semilla, n, true)})
				}
			}
		}
		out["semilla"] = e.Semilla
		out["resultado"] = gan
		if yo != nil {
			out["misPenales"] = penales(e.Semilla, yo.Numero, esGanador[yo.Numero])
			out["gane"] = esGanador[yo.Numero]
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
	mux.Handle("GET /static/", estaticos)

	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.publico(r.URL.Query().Get("t")))
	})

	// Penales de cualquier dorsal, una vez sorteado: para verlos desde otro
	// dispositivo o sin el número guardado. No revela nada que no salga ya
	// de la semilla y la lista públicas.
	mux.HandleFunc("GET /api/penales", func(w http.ResponseWriter, r *http.Request) {
		n, err := strconv.Atoi(r.URL.Query().Get("n"))
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.e.Fase != "sorteado" {
			fallo(w, 409, "Los penales se ven cuando empieza el sorteo.")
			return
		}
		if err != nil {
			fallo(w, 400, "Escribe tu número de dorsal.")
			return
		}
		gana := false
		for _, g := range s.e.Resultado {
			if g == n {
				gana = true
			}
		}
		for _, p := range s.e.Participantes {
			if p.Numero == n {
				responder(w, 200, map[string]any{"numero": p.Numero, "nombre": p.Nombre, "gane": gana, "penales": penales(s.e.Semilla, n, gana)})
				return
			}
		}
		fallo(w, 404, fmt.Sprintf("No hay ningún jugador con el dorsal %02d.", n))
	})

	mux.HandleFunc("POST /api/inscribir", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre string `json:"nombre"`
			Token  string `json:"t"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		for _, p := range s.e.Participantes {
			if in.Token != "" && p.Token == in.Token {
				responder(w, 200, map[string]any{"numero": p.Numero, "nombre": p.Nombre, "t": p.Token})
				return
			}
		}
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "Las inscripciones ya se cerraron.")
			return
		}
		nombre := limpiarNombre(in.Nombre)
		if n := utf8.RuneCountInString(nombre); n < 3 || n > 40 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") {
			fallo(w, 400, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres).")
			return
		}
		for _, p := range s.e.Participantes {
			if clave(p.Nombre) == clave(nombre) {
				fallo(w, 409, "Ese nombre ya tiene número. Si eres tú, entra desde el mismo navegador con el que te inscribiste.")
				return
			}
		}
		ip := ipDe(r)
		if s.porIP[ip] >= 8 {
			fallo(w, 429, "Demasiadas inscripciones desde esta conexión.")
			return
		}
		s.porIP[ip]++
		s.e.Siguiente++
		p := Participante{Numero: s.e.Siguiente, Nombre: nombre, Token: nuevoToken(), IP: ip, CreadoEn: time.Now().UTC()}
		s.e.Participantes = append(s.e.Participantes, p)
		s.guardar()
		responder(w, 200, map[string]any{"numero": p.Numero, "nombre": p.Nombre, "t": p.Token})
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
	listaAdmin := func() []map[string]any {
		out := []map[string]any{}
		for _, p := range s.e.Participantes {
			out = append(out, map[string]any{"numero": p.Numero, "nombre": p.Nombre, "ip": p.IP, "creadoEn": p.CreadoEn})
		}
		return out
	}
	s.rutasCurso(mux, pagina, admin)
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		out := s.publico("")
		out["participantes"] = listaAdmin()
		responder(w, 200, out)
	}))
	mux.HandleFunc("POST /api/admin/cerrar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Ganadores int `json:"ganadores"`
		}
		_ = leerJSON(r, &in)
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "Las inscripciones ya estaban cerradas.")
			return
		}
		if in.Ganadores < 1 {
			in.Ganadores = 3
		}
		if len(s.e.Participantes) < in.Ganadores {
			fallo(w, 409, fmt.Sprintf("Hay %d inscritos: hacen falta al menos %d.", len(s.e.Participantes), in.Ganadores))
			return
		}
		s.e.Ganadores = in.Ganadores
		s.e.Semilla = nuevoToken() + nuevoToken()
		s.e.Compromiso = sha(s.e.Semilla)
		s.e.HuellaLista = sha(listaCanonica(s.e.Participantes))
		ahora := time.Now().UTC()
		s.e.CerradoEn = &ahora
		s.e.Fase = "cerrado"
		s.guardar()
		responder(w, 200, s.publico(""))
	}))
	mux.HandleFunc("POST /api/admin/reabrir", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "Solo se puede reabrir antes de sortear.")
			return
		}
		// La semilla se descarta; la reapertura queda a la vista de todos.
		s.e.Semilla, s.e.Compromiso, s.e.HuellaLista, s.e.CerradoEn = "", "", "", nil
		s.e.Reaperturas++
		s.e.Fase = "inscripcion"
		s.guardar()
		responder(w, 200, s.publico(""))
	}))
	mux.HandleFunc("POST /api/admin/sortear", admin(func(w http.ResponseWriter, r *http.Request) {
		if s.e.Fase != "cerrado" {
			fallo(w, 409, "Primero cierra las inscripciones.")
			return
		}
		numeros := make([]int, 0, len(s.e.Participantes))
		for _, p := range s.e.Participantes {
			numeros = append(numeros, p.Numero)
		}
		s.e.Resultado = elegirGanadores(s.e.Semilla, numeros, s.e.Ganadores)
		ahora := time.Now().UTC()
		s.e.SorteadoEn = &ahora
		s.e.Fase = "sorteado"
		s.guardar()
		responder(w, 200, s.publico(""))
	}))
	mux.HandleFunc("POST /api/admin/quitar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero int `json:"numero"`
		}
		if err := leerJSON(r, &in); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "Solo se puede quitar a alguien mientras las inscripciones están abiertas.")
			return
		}
		quedan := s.e.Participantes[:0]
		for _, p := range s.e.Participantes {
			if p.Numero != in.Numero {
				quedan = append(quedan, p)
			}
		}
		s.e.Participantes = quedan
		s.guardar()
		out := s.publico("")
		out["participantes"] = listaAdmin()
		responder(w, 200, out)
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Titulo string `json:"titulo"`
		}
		_ = leerJSON(r, &in)
		titulo := limpiarNombre(in.Titulo)
		if titulo == "" {
			titulo = s.e.Titulo
		}
		s.e = Estado{Edicion: s.e.Edicion + 1, Titulo: titulo, Fase: "inscripcion", Ganadores: 3}
		s.porIP = map[string]int{}
		s.guardar()
		responder(w, 200, s.publico(""))
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
	s := &Servidor{archivo: filepath.Join(datos, "estado.json"), clave: clave, porIP: map[string]int{}, curso: Curso{archivo: filepath.Join(datos, "curso.json")}}
	s.curso.cargar()
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
	} else {
		titulo := os.Getenv("SORTEO_TITULO")
		if titulo == "" {
			titulo = "Sorteo del curso de ClickHouse"
		}
		s.e = Estado{Edicion: 1, Titulo: titulo, Fase: "inscripcion", Ganadores: 3}
		s.guardar()
	}
	for _, p := range s.e.Participantes {
		s.porIP[p.IP]++
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18540"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("sorteo en :%s (%d inscritos, fase %s)", puerto, len(s.e.Participantes), s.e.Fase)
	log.Fatal(srv.ListenAndServe())
}
