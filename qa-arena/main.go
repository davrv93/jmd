// QA Arena: gamificación del taller «Automatización de pruebas y QA con IA».
// Hasta 15 jugadores con héroe de cómic, logros aprobados por el instructor,
// preguntas relámpago con bono por velocidad y «bug encontrado». Estado en
// memoria con copia JSON en disco; el show y los jugadores reciben cambios por SSE.
package main

import (
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/csv"
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
)

//go:embed web
var webFS embed.FS

//go:embed preguntas.json
var preguntasJSON []byte

const (
	maxJugadores     = 30
	maxEnTira        = 15
	puntosLogro      = 100
	puntosRelampago  = 50
	bonoVelocidadMax = 50
	puntosBug        = 150
	duracionRelam    = 20 * time.Second
)

var bonoPrimeros = []int{50, 30, 20}

// Logro es un «Lo logré» de una escena del taller.
type Logro struct {
	ID     string `json:"id"`
	Escena string `json:"escena"`
	Titulo string `json:"titulo"`
}

// Paso es un paso del ciclo de la lección qa-01 del LMS: se premia solo, sin aprobación,
// cuando el alumno lo marca en el LMS (el frontend del jugador lo lee y lo manda).
type Paso struct {
	ID     string `json:"id"`
	Titulo string `json:"titulo"`
}

var pasos = []Paso{
	{"ver", "Entré al taller"}, {"casos", "Caso con semilla, pasos y resultado"}, {"pom", "Entendí POM"},
	{"pruebas", "3 rojos y 20 verdes"}, {"motores", "Tabla de 3 motores"}, {"portal", "Portal y traza"},
	{"monitoreo", "Alerta disparada"}, {"preguntar", "Pregunté con evidencia"}, {"entregar", "Entregué URL + commit"},
}

func pasoDe(id string) *Paso {
	for i := range pasos {
		if pasos[i].ID == id {
			return &pasos[i]
		}
	}
	return nil
}

var logros = []Logro{
	{"01", "01-escanea-tu-tienda", "Mi tienda en la nube"},
	{"02", "02-tienda-sol", "Vi el bug con mis ojos"},
	{"05", "05-casos-y-pom", "Mi caso en 3 decisiones"},
	{"07", "07-correr-pruebas", "3 rojos y 20 verdes"},
	{"09", "09-correr-motores", "Tabla de 3 motores"},
	{"10", "10-reporte", "Encontré el POST en la traza"},
	{"11", "11-semilla-del-usuario", "Reproduje el error del usuario"},
	{"13", "13-grafana", "Disparé la alerta"},
	{"15", "15-robot-todo-el-dia", "Mi robot tiene URL"},
	{"16", "16-informe-de-pruebas", "Informe NO APTO con argumentos"},
	{"17", "17-preguntar", "Entregué URL + commit"},
}

type Pregunta struct {
	Texto    string   `json:"texto"`
	Opciones []string `json:"opciones"`
	Correcta int      `json:"correcta"`
	Porque   string   `json:"porque"`
}

type Jugador struct {
	ID       int       `json:"id"`
	Nombre   string    `json:"nombre"`
	Correo   string    `json:"-"`
	Token    string    `json:"-"`
	IP       string    `json:"-"`
	Puntos   int       `json:"puntos"`
	CreadoEn time.Time `json:"creadoEn"`
	Activo   bool      `json:"activo"`
}

// Solicitud es un «Lo logré» esperando al instructor.
type Solicitud struct {
	ID      int       `json:"id"`
	Jugador int       `json:"jugador"`
	Logro   string    `json:"logro"`
	En      time.Time `json:"en"`
}

type Respuesta struct {
	Opcion int       `json:"opcion"`
	En     time.Time `json:"en"`
	Puntos int       `json:"puntos"`
}

type Relampago struct {
	Activo    bool              `json:"activo"`
	Pregunta  int               `json:"pregunta"`
	Inicio    time.Time         `json:"inicio"`
	Fin       time.Time         `json:"fin"`
	Respuesta map[int]Respuesta `json:"respuestas"`
	Usadas    []int             `json:"usadas"`
}

// Evento es lo que el show anima: logro, relámpago, bug, primero.
type Evento struct {
	ID      int       `json:"id"`
	Tipo    string    `json:"tipo"`
	Jugador int       `json:"jugador"`
	Nombre  string    `json:"nombre"`
	Texto   string    `json:"texto"`
	Puntos  int       `json:"puntos"`
	Bono    int       `json:"bono"`
	En      time.Time `json:"en"`
}

type Estado struct {
	Jugadores   []Jugador        `json:"jugadores"`
	Pendientes  []Solicitud      `json:"pendientes"`
	Aprobados   map[string][]int `json:"aprobados"` // logro → jugadores en orden de aprobación
	Rechazados  map[string][]int `json:"rechazados"`
	Pasos       map[string][]int `json:"pasos"` // paso del LMS → jugadores en orden de llegada
	Relampago   Relampago        `json:"relampago"`
	Eventos     []Evento         `json:"eventos"`
	SigSolicit  int              `json:"sigSolicitud"`
	SigEvento   int              `json:"sigEvento"`
	ActualizaEn time.Time        `json:"actualizadoEn"`
}

type Servidor struct {
	mu        sync.Mutex
	e         Estado
	archivo   string
	clave     string
	preguntas []Pregunta
	porIP     map[string]int
	oyentes   map[chan []byte]struct{}
	ahora     func() time.Time
	local     bool // ARENA_LOCAL=1: permite entrar con nombre tecleado (sin LMS)
}

var lima = func() *time.Location {
	l, err := time.LoadLocation("America/Lima")
	if err != nil {
		return time.FixedZone("Lima", -5*3600)
	}
	return l
}()

func nuevoServidor(archivo, clave string) *Servidor {
	var pq []Pregunta
	if err := json.Unmarshal(preguntasJSON, &pq); err != nil {
		log.Fatalf("preguntas.json: %v", err)
	}
	s := &Servidor{archivo: archivo, clave: clave, preguntas: pq, porIP: map[string]int{}, oyentes: map[chan []byte]struct{}{}, ahora: func() time.Time { return time.Now().In(lima) }}
	s.e = estadoVacio()
	if archivo != "" {
		if b, err := os.ReadFile(archivo); err == nil {
			if err := json.Unmarshal(b, &s.e); err != nil {
				log.Fatalf("%s: %v", archivo, err)
			}
			if s.e.Aprobados == nil {
				s.e.Aprobados = map[string][]int{}
			}
			if s.e.Rechazados == nil {
				s.e.Rechazados = map[string][]int{}
			}
			if s.e.Relampago.Respuesta == nil {
				s.e.Relampago.Respuesta = map[int]Respuesta{}
			}
			if s.e.Pasos == nil {
				s.e.Pasos = map[string][]int{}
			}
		}
	}
	for _, j := range s.e.Jugadores {
		s.porIP[j.IP]++
	}
	return s
}

func estadoVacio() Estado {
	return Estado{Aprobados: map[string][]int{}, Rechazados: map[string][]int{}, Pasos: map[string][]int{}, Relampago: Relampago{Pregunta: -1, Respuesta: map[int]Respuesta{}}}
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func azarHasta(n int) int {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return int(uint32(b[0])<<24|uint32(b[1])<<16|uint32(b[2])<<8|uint32(b[3])) % n
}

// guardar escribe la copia en disco (si hay archivo) y avisa a los oyentes SSE.
// Se llama con el candado tomado.
func (s *Servidor) guardar() {
	s.e.ActualizaEn = s.ahora()
	if s.archivo != "" {
		b, _ := json.MarshalIndent(s.e, "", "  ")
		tmp := s.archivo + ".tmp"
		if err := os.WriteFile(tmp, b, 0o600); err != nil {
			log.Printf("guardar: %v", err)
		} else if err := os.Rename(tmp, s.archivo); err != nil {
			log.Printf("guardar: %v", err)
		}
	}
	msg, _ := json.Marshal(s.publico())
	for c := range s.oyentes {
		select {
		case c <- msg:
		default:
		}
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

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	h, _, _ := strings.Cut(r.RemoteAddr, ":")
	return h
}

func leerJSON(r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 4096)).Decode(v)
}

func (s *Servidor) jugadorDe(token string) *Jugador {
	if token == "" {
		return nil
	}
	for i := range s.e.Jugadores {
		j := &s.e.Jugadores[i]
		if j.Activo && subtle.ConstantTimeCompare([]byte(j.Token), []byte(token)) == 1 {
			return j
		}
	}
	return nil
}

func (s *Servidor) jugadorID(id int) *Jugador {
	for i := range s.e.Jugadores {
		if s.e.Jugadores[i].ID == id {
			return &s.e.Jugadores[i]
		}
	}
	return nil
}

func (s *Servidor) activos() int {
	n := 0
	for _, j := range s.e.Jugadores {
		if j.Activo {
			n++
		}
	}
	return n
}

// unirse crea un jugador (o devuelve el que ya tiene ese correo: misma persona
// desde otro dispositivo). Devuelve el mensaje de error o "".
func (s *Servidor) unirse(nombre, correo, ip string) (*Jugador, string) {
	nombre = limpiarNombre(nombre)
	correo = strings.ToLower(strings.TrimSpace(correo))
	if correo != "" {
		for i := range s.e.Jugadores {
			if j := &s.e.Jugadores[i]; j.Activo && j.Correo == correo {
				return j, ""
			}
		}
		if len([]rune(nombre)) > 24 {
			nombre = string([]rune(nombre)[:24])
		}
	}
	if len([]rune(nombre)) < 2 || len([]rune(nombre)) > 24 || !nombreValido.MatchString(nombre) {
		return nil, "Escribe un nombre de 2 a 24 letras."
	}
	if esOfensivo(nombre) || strings.EqualFold(nombre, "instructor") {
		return nil, "Ese nombre no entra a la arena. Prueba otro."
	}
	for _, j := range s.e.Jugadores {
		if j.Activo && strings.EqualFold(j.Nombre, nombre) {
			if correo != "" {
				nombre += " " + strings.ToUpper(correo[:1])
			} else {
				return nil, "Ya hay un héroe con ese nombre. Agrega una inicial."
			}
		}
	}
	if s.activos() >= maxJugadores {
		return nil, fmt.Sprintf("Arena llena: ya hay %d héroes. Mira el show.", maxJugadores)
	}
	if correo == "" && !s.local && s.porIP[ip] >= 4 {
		return nil, "Demasiados héroes desde esta red."
	}
	id := 1
	for _, j := range s.e.Jugadores {
		if j.ID >= id {
			id = j.ID + 1
		}
	}
	j := Jugador{ID: id, Nombre: nombre, Correo: correo, Token: nuevoToken(), IP: ip, CreadoEn: s.ahora(), Activo: true}
	s.e.Jugadores = append(s.e.Jugadores, j)
	s.porIP[ip]++
	s.evento("entra", &s.e.Jugadores[len(s.e.Jugadores)-1], "¡"+nombre+" entra a la arena!", 0, 0)
	return &s.e.Jugadores[len(s.e.Jugadores)-1], ""
}

func (s *Servidor) evento(tipo string, j *Jugador, texto string, puntos, bono int) {
	s.e.SigEvento++
	ev := Evento{ID: s.e.SigEvento, Tipo: tipo, Texto: texto, Puntos: puntos, Bono: bono, En: s.ahora()}
	if j != nil {
		ev.Jugador, ev.Nombre = j.ID, j.Nombre
	}
	s.e.Eventos = append(s.e.Eventos, ev)
	if len(s.e.Eventos) > 200 {
		s.e.Eventos = s.e.Eventos[len(s.e.Eventos)-200:]
	}
}

func logroDe(id string) *Logro {
	for i := range logros {
		if logros[i].ID == id {
			return &logros[i]
		}
	}
	return nil
}

func contiene(xs []int, x int) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}

// pedirLogro encola un «Lo logré». Devuelve el mensaje de error o "".
func (s *Servidor) pedirLogro(j *Jugador, logroID string) string {
	if logroDe(logroID) == nil {
		return "Ese logro no existe."
	}
	if contiene(s.e.Aprobados[logroID], j.ID) {
		return "Ese logro ya es tuyo."
	}
	for _, p := range s.e.Pendientes {
		if p.Jugador == j.ID && p.Logro == logroID {
			return "Ya está en la cola del instructor."
		}
	}
	s.e.SigSolicit++
	s.e.Pendientes = append(s.e.Pendientes, Solicitud{ID: s.e.SigSolicit, Jugador: j.ID, Logro: logroID, En: s.ahora()})
	return ""
}

// resolver aprueba o rechaza una solicitud pendiente. Al aprobar: 100 puntos y
// bono 50/30/20 a los tres primeros de ese logro.
func (s *Servidor) resolver(solicitudID int, ok bool) string {
	idx := -1
	for i, p := range s.e.Pendientes {
		if p.ID == solicitudID {
			idx = i
		}
	}
	if idx < 0 {
		return "Esa solicitud ya no está en la cola."
	}
	p := s.e.Pendientes[idx]
	s.e.Pendientes = append(s.e.Pendientes[:idx], s.e.Pendientes[idx+1:]...)
	j := s.jugadorID(p.Jugador)
	if j == nil {
		return ""
	}
	l := logroDe(p.Logro)
	if !ok {
		s.e.Rechazados[p.Logro] = append(s.e.Rechazados[p.Logro], j.ID)
		s.evento("rechazo", j, "Todavía no: "+l.Titulo, 0, 0)
		return ""
	}
	puesto := len(s.e.Aprobados[p.Logro])
	bono := 0
	if puesto < len(bonoPrimeros) {
		bono = bonoPrimeros[puesto]
	}
	s.e.Aprobados[p.Logro] = append(s.e.Aprobados[p.Logro], j.ID)
	j.Puntos += puntosLogro + bono
	tipo := "logro"
	if puesto == 0 {
		tipo = "primero"
	}
	s.evento(tipo, j, l.Titulo, puntosLogro, bono)
	return ""
}

// lanzarRelampago abre una pregunta (índice, o -1 para una al azar no usada).
func (s *Servidor) lanzarRelampago(idx int) string {
	if s.e.Relampago.Activo && s.ahora().Before(s.e.Relampago.Fin) {
		return "Ya hay un relámpago en el aire."
	}
	if idx < 0 {
		libres := []int{}
		for i := range s.preguntas {
			if !contiene(s.e.Relampago.Usadas, i) {
				libres = append(libres, i)
			}
		}
		if len(libres) == 0 {
			s.e.Relampago.Usadas = nil
			for i := range s.preguntas {
				libres = append(libres, i)
			}
		}
		idx = libres[azarHasta(len(libres))]
	}
	if idx >= len(s.preguntas) {
		return "Esa pregunta no existe."
	}
	n := s.ahora()
	s.e.Relampago = Relampago{Activo: true, Pregunta: idx, Inicio: n, Fin: n.Add(duracionRelam), Respuesta: map[int]Respuesta{}, Usadas: append(s.e.Relampago.Usadas, idx)}
	s.evento("relampago", nil, "⚡ Pregunta relámpago", 0, 0)
	return ""
}

func (s *Servidor) pararRelampago() {
	if s.e.Relampago.Activo {
		s.e.Relampago.Fin = s.ahora()
		s.e.Relampago.Activo = false
	}
}

// responderRelampago anota la respuesta de un jugador. Correcta = 50 + hasta 50
// por velocidad (lineal con el tiempo restante).
func (s *Servidor) responderRelampago(j *Jugador, opcion int) (int, string) {
	r := &s.e.Relampago
	n := s.ahora()
	if r.Pregunta < 0 || !r.Activo || !n.Before(r.Fin) {
		return 0, "El relámpago ya pasó."
	}
	if _, ya := r.Respuesta[j.ID]; ya {
		return 0, "Ya respondiste."
	}
	pq := s.preguntas[r.Pregunta]
	if opcion < 0 || opcion >= len(pq.Opciones) {
		return 0, "Opción no válida."
	}
	pts := 0
	if opcion == pq.Correcta {
		resta := r.Fin.Sub(n)
		pts = puntosRelampago + int(float64(bonoVelocidadMax)*resta.Seconds()/duracionRelam.Seconds()+0.5)
		j.Puntos += pts
		s.evento("acierto", j, "acertó el relámpago", pts, 0)
	}
	r.Respuesta[j.ID] = Respuesta{Opcion: opcion, En: n, Puntos: pts}
	return pts, ""
}

// anotarPasos premia los pasos del ciclo del LMS que el alumno ya marcó y que la
// arena aún no le había contado: 100 puntos cada uno y bono 50/30/20 a los tres
// primeros por paso. Devuelve cuántos pasos nuevos se premiaron.
func (s *Servidor) anotarPasos(j *Jugador, ids []string) int {
	nuevos := 0
	for _, id := range ids {
		ps := pasoDe(id)
		if ps == nil || contiene(s.e.Pasos[id], j.ID) {
			continue
		}
		puesto := len(s.e.Pasos[id])
		bono := 0
		if puesto < len(bonoPrimeros) {
			bono = bonoPrimeros[puesto]
		}
		s.e.Pasos[id] = append(s.e.Pasos[id], j.ID)
		j.Puntos += puntosLogro + bono
		tipo := "paso"
		if puesto == 0 {
			tipo = "primero"
		}
		s.evento(tipo, j, ps.Titulo, puntosLogro, bono)
		nuevos++
	}
	return nuevos
}

func (s *Servidor) darBug(jugadorID int, texto string) string {
	j := s.jugadorID(jugadorID)
	if j == nil || !j.Activo {
		return "Ese jugador no está en la arena."
	}
	texto = limpiarNombre(texto)
	if len([]rune(texto)) > 140 {
		texto = string([]rune(texto)[:140])
	}
	if texto == "" {
		texto = "encontró un bug de verdad"
	}
	j.Puntos += puntosBug
	s.evento("bug", j, texto, puntosBug, 0)
	return ""
}

func (s *Servidor) tabla() []map[string]any {
	js := []Jugador{}
	for _, j := range s.e.Jugadores {
		if j.Activo {
			js = append(js, j)
		}
	}
	sort.SliceStable(js, func(a, b int) bool {
		if js[a].Puntos != js[b].Puntos {
			return js[a].Puntos > js[b].Puntos
		}
		return js[a].CreadoEn.Before(js[b].CreadoEn)
	})
	out := []map[string]any{}
	for i, j := range js {
		logrosDe := []string{}
		for _, l := range logros {
			if contiene(s.e.Aprobados[l.ID], j.ID) {
				logrosDe = append(logrosDe, l.ID)
			}
		}
		pasosDe := []string{}
		for _, ps := range pasos {
			if contiene(s.e.Pasos[ps.ID], j.ID) {
				pasosDe = append(pasosDe, ps.ID)
			}
		}
		out = append(out, map[string]any{"puesto": i + 1, "id": j.ID, "nombre": j.Nombre, "puntos": j.Puntos, "logros": logrosDe, "pasos": pasosDe})
	}
	return out
}

// publico es el estado que ven el show y los jugadores (sin tokens ni IP).
func (s *Servidor) publico() map[string]any {
	n := s.ahora()
	r := s.e.Relampago
	rel := map[string]any{"activo": false}
	if r.Pregunta >= 0 {
		pq := s.preguntas[r.Pregunta]
		enAire := r.Activo && n.Before(r.Fin)
		resp := []map[string]any{}
		for id, x := range r.Respuesta {
			if j := s.jugadorID(id); j != nil {
				resp = append(resp, map[string]any{"id": id, "nombre": j.Nombre, "puntos": x.Puntos, "opcion": x.Opcion})
			}
		}
		sort.Slice(resp, func(a, b int) bool { return resp[a]["puntos"].(int) > resp[b]["puntos"].(int) })
		rel = map[string]any{"activo": enAire, "texto": pq.Texto, "opciones": pq.Opciones, "fin": r.Fin, "inicio": r.Inicio,
			"restanteMs": max(0, int(r.Fin.Sub(n).Milliseconds())), "respondieron": len(r.Respuesta), "numero": r.Pregunta + 1}
		if !enAire {
			rel["correcta"] = pq.Correcta
			rel["porque"] = pq.Porque
			rel["resultados"] = resp
		}
	}
	ev := []Evento{}
	if len(s.e.Eventos) > 30 {
		ev = append(ev, s.e.Eventos[len(s.e.Eventos)-30:]...)
	} else {
		ev = append(ev, s.e.Eventos...)
	}
	return map[string]any{
		"ahora": n, "jugadores": s.activos(), "maximo": maxJugadores, "enTira": maxEnTira, "local": s.local, "tabla": s.tabla(), "logros": logros, "pasos": pasos,
		"relampago": rel, "eventos": ev, "pendientes": len(s.e.Pendientes), "actualizadoEn": s.e.ActualizaEn,
	}
}

func (s *Servidor) mio(j *Jugador) map[string]any {
	estado := map[string]string{}
	for _, l := range logros {
		switch {
		case contiene(s.e.Aprobados[l.ID], j.ID):
			estado[l.ID] = "aprobado"
		case contiene(s.e.Rechazados[l.ID], j.ID):
			estado[l.ID] = "rechazado"
		}
	}
	for _, p := range s.e.Pendientes {
		if p.Jugador == j.ID {
			estado[p.Logro] = "pendiente"
		}
	}
	puesto := 0
	for _, f := range s.tabla() {
		if f["id"] == j.ID {
			puesto = f["puesto"].(int)
		}
	}
	var resp *Respuesta
	if x, ok := s.e.Relampago.Respuesta[j.ID]; ok {
		resp = &x
	}
	pasosDe := []string{}
	for _, ps := range pasos {
		if contiene(s.e.Pasos[ps.ID], j.ID) {
			pasosDe = append(pasosDe, ps.ID)
		}
	}
	return map[string]any{"id": j.ID, "nombre": j.Nombre, "puntos": j.Puntos, "puesto": puesto, "logros": estado, "pasos": pasosDe, "respuesta": resp}
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	c := r.Header.Get("X-Clave")
	return c != "" && subtle.ConstantTimeCompare([]byte(c), []byte(s.clave)) == 1
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
	mux.HandleFunc("GET /show", pagina("show.html"))
	mux.HandleFunc("GET /admin", pagina("admin.html"))
	mux.Handle("GET /static/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=120")
		estaticos.ServeHTTP(w, r)
	}))

	token := func(r *http.Request) string {
		if c, err := r.Cookie("arena"); err == nil {
			return c.Value
		}
		return r.Header.Get("X-Token")
	}

	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.publico())
	})
	mux.HandleFunc("GET /api/yo", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		j := s.jugadorDe(token(r))
		if j == nil {
			responder(w, 200, map[string]any{"jugador": nil})
			return
		}
		responder(w, 200, map[string]any{"jugador": s.mio(j)})
	})
	mux.HandleFunc("POST /api/unirse", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Nombre, Correo string }
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if in.Correo == "" && !s.local {
			fallo(w, 400, "Entra desde el LMS para que la arena sepa quién eres.")
			return
		}
		if j := s.jugadorDe(token(r)); j != nil && in.Correo == "" {
			responder(w, 200, map[string]any{"jugador": s.mio(j), "token": j.Token})
			return
		}
		j, msg := s.unirse(in.Nombre, in.Correo, ipDe(r))
		if msg != "" {
			code := 400
			if strings.HasPrefix(msg, "Arena llena") {
				code = 409
			}
			fallo(w, code, msg)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: "arena", Value: j.Token, Path: "/", MaxAge: 86400, HttpOnly: true, SameSite: http.SameSiteLaxMode})
		s.guardar()
		responder(w, 201, map[string]any{"jugador": s.mio(j), "token": j.Token})
	})
	mux.HandleFunc("POST /api/pasos", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Pasos []string }
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		j := s.jugadorDe(token(r))
		if j == nil {
			fallo(w, 401, "Entra a la arena primero.")
			return
		}
		if n := s.anotarPasos(j, in.Pasos); n > 0 {
			s.guardar()
		}
		responder(w, 200, map[string]any{"jugador": s.mio(j)})
	})
	mux.HandleFunc("POST /api/logro", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ ID string }
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		j := s.jugadorDe(token(r))
		if j == nil {
			fallo(w, 401, "Entra a la arena primero.")
			return
		}
		if msg := s.pedirLogro(j, in.ID); msg != "" {
			fallo(w, 400, msg)
			return
		}
		s.guardar()
		responder(w, 200, map[string]any{"jugador": s.mio(j)})
	})
	mux.HandleFunc("POST /api/responder", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Opcion int }
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		j := s.jugadorDe(token(r))
		if j == nil {
			fallo(w, 401, "Entra a la arena primero.")
			return
		}
		pts, msg := s.responderRelampago(j, in.Opcion)
		if msg != "" {
			fallo(w, 400, msg)
			return
		}
		s.guardar()
		responder(w, 200, map[string]any{"puntos": pts, "jugador": s.mio(j)})
	})
	mux.HandleFunc("GET /api/eventos", func(w http.ResponseWriter, r *http.Request) {
		fl, ok := w.(http.Flusher)
		if !ok {
			fallo(w, 500, "sin streaming")
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Accel-Buffering", "no")
		c := make(chan []byte, 8)
		s.mu.Lock()
		s.oyentes[c] = struct{}{}
		primero, _ := json.Marshal(s.publico())
		s.mu.Unlock()
		defer func() {
			s.mu.Lock()
			delete(s.oyentes, c)
			s.mu.Unlock()
		}()
		fmt.Fprintf(w, "event: estado\ndata: %s\n\n", primero)
		fl.Flush()
		latido := time.NewTicker(15 * time.Second)
		defer latido.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case m := <-c:
				fmt.Fprintf(w, "event: estado\ndata: %s\n\n", m)
				fl.Flush()
			case <-latido.C:
				fmt.Fprint(w, ": latido\n\n")
				fl.Flush()
			}
		}
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
		out := s.publico()
		pend := []map[string]any{}
		for i := len(s.e.Pendientes) - 1; i >= 0; i-- {
			p := s.e.Pendientes[i]
			j := s.jugadorID(p.Jugador)
			l := logroDe(p.Logro)
			if j == nil || l == nil {
				continue
			}
			pend = append(pend, map[string]any{"id": p.ID, "jugador": j.ID, "nombre": j.Nombre, "logro": l.ID, "titulo": l.Titulo, "en": p.En, "puesto": len(s.e.Aprobados[l.ID]) + 1})
		}
		out["pendientesLista"] = pend
		pq := []map[string]any{}
		for i, p := range s.preguntas {
			pq = append(pq, map[string]any{"i": i, "texto": p.Texto, "usada": contiene(s.e.Relampago.Usadas, i)})
		}
		out["preguntas"] = pq
		js := []map[string]any{}
		for _, j := range s.e.Jugadores {
			js = append(js, map[string]any{"id": j.ID, "nombre": j.Nombre, "puntos": j.Puntos, "activo": j.Activo})
		}
		out["jugadoresLista"] = js
		return out
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/resolver", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID int
			OK bool
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		if msg := s.resolver(in.ID, in.OK); msg != "" {
			fallo(w, 400, msg)
			return
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/relampago", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Accion   string
			Pregunta int
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		if in.Accion == "parar" {
			s.pararRelampago()
		} else {
			if msg := s.lanzarRelampago(in.Pregunta); msg != "" {
				fallo(w, 400, msg)
				return
			}
			fin := s.e.Relampago.Fin
			go func() {
				time.Sleep(time.Until(fin) + 200*time.Millisecond)
				s.mu.Lock()
				defer s.mu.Unlock()
				if s.e.Relampago.Fin.Equal(fin) {
					s.e.Relampago.Activo = false
					s.guardar()
				}
			}()
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/bug", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Jugador int
			Texto   string
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		if msg := s.darBug(in.Jugador, in.Texto); msg != "" {
			fallo(w, 400, msg)
			return
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/jugador", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID     int
			Nombre string
			Quitar bool
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		j := s.jugadorID(in.ID)
		if j == nil {
			fallo(w, 404, "No existe.")
			return
		}
		if in.Quitar {
			j.Activo = false
			s.porIP[j.IP]--
		} else if n := limpiarNombre(in.Nombre); n != "" && len([]rune(n)) <= 24 {
			j.Nombre = n
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.e = estadoVacio()
		s.porIP = map[string]int{}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("GET /api/admin/csv", admin(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=qa-arena.csv")
		cw := csv.NewWriter(w)
		_ = cw.Write([]string{"puesto", "nombre", "puntos", "logros"})
		for _, f := range s.tabla() {
			_ = cw.Write([]string{strconv.Itoa(f["puesto"].(int)), f["nombre"].(string), strconv.Itoa(f["puntos"].(int)), strings.Join(f["logros"].([]string), " ")})
		}
		cw.Flush()
	}))
	return mux
}

func main() {
	datos := os.Getenv("ARENA_DATOS")
	if datos == "" {
		datos = "datos"
	}
	clave := os.Getenv("ARENA_CLAVE")
	if len(clave) < 12 {
		log.Fatal("ARENA_CLAVE debe tener al menos 12 caracteres")
	}
	if err := os.MkdirAll(datos, 0o700); err != nil {
		log.Fatal(err)
	}
	s := nuevoServidor(filepath.Join(datos, "arena.json"), clave)
	s.local = os.Getenv("ARENA_LOCAL") == "1"
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18630"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("QA Arena en :%s (%d héroes, %d preguntas, clave admin: %v, modo local: %v)", puerto, s.activos(), len(s.preguntas), clave != "", s.local)
	log.Fatal(srv.ListenAndServe())
}
