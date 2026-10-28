package httpapi

import (
	"errors"
	"fmt"
	"math"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

// juegoLive es el minijuego de la arena de conceptos (escena «Arena de conceptos» del LIVE):
// cada alumno es un robot alrededor de la arena; por el centro flotan bolas con un concepto de la
// clase. Atrapas una, la clasificas en su contenedor y, si acertaste, la tiras al arco de otro.
// El otro tiene unos segundos para atajarla clasificando el concepto nuevo que trae la bola.
//
// Como las votaciones y el muro: en memoria, por lección y escena, vale lo que dura la clase.
// La clave de respuestas (concepto → contenedor) sale de juego.yaml, junto a escena.html, y
// nunca viaja al navegador (la ruta de archivos de escena no sirve .yaml).
var juegoLive = struct {
	sync.Mutex
	v map[string]*juego
}{v: map[string]*juego{}}

const (
	juegoMaxJugadores = 40
	juegoColores      = 18               // paleta de la escena; el color es el orden de llegada
	juegoVuelo        = 5 * time.Second  // lo que tiene el arquero para atajar
	juegoAtrapada     = 12 * time.Second // para clasificar una bola atrapada antes de que vuelva al centro
	juegoCargada      = 15 * time.Second // para tirarla una vez cargada
	juegoInactivo     = 15 * time.Second // sin pedir el estado: sale de la arena y suelta su bola
	juegoEventosTope  = 16
	juegoDuracionDef  = 180
	juegoGol          = 2 // para quien tira
	juegoAtajada      = 1 // para quien ataja
	juegoRachaCada    = 3 // cada tantos aciertos seguidos, +1 de bonificación
)

// configJuego es juego.yaml: los contenedores (categorías) y los conceptos con su respuesta.
type configJuego struct {
	Contenedores []contenedorJuego `yaml:"contenedores" json:"contenedores"`
	Conceptos    []struct {
		Texto      string `yaml:"texto"`
		Contenedor string `yaml:"contenedor"`
	} `yaml:"conceptos" json:"-"`
}

type contenedorJuego struct {
	ID     string `yaml:"id" json:"id"`
	Nombre string `yaml:"nombre" json:"nombre"`
}

func (c *configJuego) validar() error {
	if n := len(c.Contenedores); n < 2 || n > 6 {
		return fmt.Errorf("juego.yaml: de 2 a 6 contenedores, hay %d", n)
	}
	ids := map[string]bool{}
	for _, k := range c.Contenedores {
		if !idVoto.MatchString(k.ID) || strings.TrimSpace(k.Nombre) == "" || ids[k.ID] {
			return fmt.Errorf("juego.yaml: contenedor inválido o repetido %q", k.ID)
		}
		ids[k.ID] = true
	}
	if n := len(c.Conceptos); n < 8 || n > 80 {
		return fmt.Errorf("juego.yaml: de 8 a 80 conceptos, hay %d", n)
	}
	textos := map[string]bool{}
	for _, x := range c.Conceptos {
		t := strings.TrimSpace(x.Texto)
		if t == "" || len([]rune(t)) > 40 || textos[t] {
			return fmt.Errorf("juego.yaml: concepto vacío, largo (más de 40) o repetido %q", t)
		}
		if !ids[x.Contenedor] {
			return fmt.Errorf("juego.yaml: el concepto %q apunta a un contenedor que no existe (%q)", t, x.Contenedor)
		}
		textos[t] = true
	}
	return nil
}

func leerConfigJuego(ruta string) (*configJuego, error) {
	raw, err := os.ReadFile(ruta)
	if err != nil {
		return nil, err
	}
	var c configJuego
	if err := yaml.Unmarshal(raw, &c); err != nil {
		return nil, fmt.Errorf("juego.yaml: %w", err)
	}
	if err := c.validar(); err != nil {
		return nil, err
	}
	return &c, nil
}

type jugador struct {
	sub        string
	ID         string
	Nombre     string
	Color      int
	Puntos     int
	Racha      int
	MejorRacha int
	Goles      int
	Atajadas   int
	Aciertos   int
	Fallos     int
	visto      time.Time
}

// Estados de una bola: libre (flota en el centro), atrapada (alguien la está clasificando),
// cargada (bien clasificada, lista para tirar) y vuelo (va hacia el arco de alguien).
type bola struct {
	ID       int
	Concepto int
	Estado   string
	Dueno    string // sub de quien la tiene o la tiró
	Hacia    string // sub del arquero (vuelo)
	Desde    time.Time
	Vence    time.Time
	X, Y     float64 // posición inicial en el centro, de 0 a 1
	VX, VY   float64 // por segundo; el navegador la hace rebotar en [0,1]
}

type eventoJuego struct {
	N        int    `json:"n"`
	Tipo     string `json:"tipo"` // gol | atajada | racha | ronda | final
	De       string `json:"de,omitempty"`
	A        string `json:"a,omitempty"`
	Concepto string `json:"concepto,omitempty"`
	Valor    int    `json:"valor,omitempty"`
	Ms       int64  `json:"ms"`
}

type juego struct {
	cfg       *configJuego
	jugadores map[string]*jugador
	orden     []*jugador
	bolas     []*bola
	sigBola   int
	sigEvento int
	eventos   []eventoJuego
	estado    string // calentamiento | jugando | final
	fin       time.Time
	duracion  int
	rnd       *rand.Rand
}

func nuevoJuego(cfg *configJuego, semilla uint64) *juego {
	return &juego{cfg: cfg, jugadores: map[string]*jugador{}, estado: "calentamiento", duracion: juegoDuracionDef,
		rnd: rand.New(rand.NewPCG(semilla, semilla^0x9e3779b97f4a7c15))}
}

var errJuego = errors.New("juego")

// errorJuego: una jugada que no vale (la bola ya no está, no es tuya…). Sale como 409 con el texto.
type errorJuego struct{ msg string }

func (e errorJuego) Error() string   { return e.msg }
func (e errorJuego) Is(t error) bool { return t == errJuego }

func noVale(msg string) error { return errorJuego{msg} }

func (j *juego) correcto(concepto int, contenedor string) bool {
	return j.cfg.Conceptos[concepto].Contenedor == contenedor
}

func (j *juego) nombreContenedor(id string) string {
	for _, k := range j.cfg.Contenedores {
		if k.ID == id {
			return k.Nombre
		}
	}
	return id
}

func (j *juego) activo(p *jugador, now time.Time) bool { return now.Sub(p.visto) <= juegoInactivo }

func (j *juego) activos(now time.Time) int {
	n := 0
	for _, p := range j.orden {
		if j.activo(p, now) {
			n++
		}
	}
	return n
}

func (j *juego) evento(e eventoJuego, now time.Time) {
	j.sigEvento++
	e.N = j.sigEvento
	e.Ms = now.UnixMilli()
	j.eventos = append(j.eventos, e)
	if len(j.eventos) > juegoEventosTope {
		j.eventos = j.eventos[len(j.eventos)-juegoEventosTope:]
	}
}

// conceptoNuevo elige un concepto que no esté ya en otra bola (si se puede) y distinto de evitar.
func (j *juego) conceptoNuevo(evitar int) int {
	usados := map[int]bool{}
	for _, b := range j.bolas {
		usados[b.Concepto] = true
	}
	libres := []int{}
	for i := range j.cfg.Conceptos {
		if !usados[i] && i != evitar {
			libres = append(libres, i)
		}
	}
	if len(libres) == 0 {
		for i := range j.cfg.Conceptos {
			if i != evitar {
				libres = append(libres, i)
			}
		}
	}
	return libres[j.rnd.IntN(len(libres))]
}

func (j *juego) soltar(b *bola, now time.Time) {
	b.Concepto = j.conceptoNuevo(b.Concepto)
	b.Estado, b.Dueno, b.Hacia = "libre", "", ""
	b.Desde, b.Vence = now, time.Time{}
	b.X, b.Y = .2+.6*j.rnd.Float64(), .2+.6*j.rnd.Float64()
	vel := .06 + .07*j.rnd.Float64()
	ang := j.rnd.Float64() * 2 * math.Pi
	b.VX, b.VY = vel*math.Cos(ang), vel*math.Sin(ang)
}

func (j *juego) bolaDe(sub string) *bola {
	for _, b := range j.bolas {
		if b.Dueno == sub && (b.Estado == "atrapada" || b.Estado == "cargada") {
			return b
		}
	}
	return nil
}

func (j *juego) buscarBola(id int) *bola {
	for _, b := range j.bolas {
		if b.ID == id {
			return b
		}
	}
	return nil
}

func (j *juego) sumarAcierto(p *jugador, now time.Time) {
	p.Aciertos++
	p.Racha++
	if p.Racha > p.MejorRacha {
		p.MejorRacha = p.Racha
	}
	if p.Racha%juegoRachaCada == 0 {
		p.Puntos++
		j.evento(eventoJuego{Tipo: "racha", De: p.ID, Valor: p.Racha}, now)
	}
}

func (j *juego) sumarFallo(p *jugador) {
	p.Fallos++
	p.Racha = 0
	if p.Puntos > 0 {
		p.Puntos--
	}
}

func (j *juego) gol(b *bola, now time.Time) {
	if t := j.jugadores[b.Dueno]; t != nil {
		t.Puntos += juegoGol
		t.Goles++
		a := ""
		if d := j.jugadores[b.Hacia]; d != nil {
			a = d.ID
			d.Racha = 0
		}
		j.evento(eventoJuego{Tipo: "gol", De: t.ID, A: a, Concepto: j.cfg.Conceptos[b.Concepto].Texto, Valor: juegoGol}, now)
	}
	j.soltar(b, now)
}

// avanzar resuelve lo que venció: tiros sin atajar (gol), bolas retenidas de más, jugadores que se
// fueron, el fin de la ronda; y repone bolas libres. Se llama con el candado puesto en cada lectura.
func (j *juego) avanzar(now time.Time) {
	if j.estado == "jugando" && !now.Before(j.fin) {
		j.estado = "final"
		j.evento(eventoJuego{Tipo: "final"}, now)
	}
	for _, b := range j.bolas {
		switch b.Estado {
		case "vuelo":
			if !now.Before(b.Vence) {
				j.gol(b, now)
			}
		case "atrapada", "cargada":
			p := j.jugadores[b.Dueno]
			if !now.Before(b.Vence) || p == nil || !j.activo(p, now) {
				j.soltar(b, now)
			}
		}
	}
	if j.estado == "final" {
		return
	}
	quiere := j.activos(now)/3 + 3 // 18 alumnos → 9 bolas: más tapa las etiquetas
	if quiere < 4 {
		quiere = 4
	}
	if quiere > 9 {
		quiere = 9
	}
	for len(j.bolas) < quiere {
		j.sigBola++
		b := &bola{ID: j.sigBola, Concepto: -1}
		j.bolas = append(j.bolas, b)
		j.soltar(b, now)
	}
}

func (j *juego) unir(sub, nombre string, now time.Time) (*jugador, error) {
	if p := j.jugadores[sub]; p != nil {
		p.visto = now
		return p, nil
	}
	if len(j.orden) >= juegoMaxJugadores {
		return nil, noVale("la arena está llena")
	}
	p := &jugador{sub: sub, ID: "j" + strconv.Itoa(len(j.orden)+1), Nombre: nombre, Color: len(j.orden) % juegoColores, visto: now}
	j.jugadores[sub] = p
	j.orden = append(j.orden, p)
	return p, nil
}

func (j *juego) porID(id string) *jugador {
	for _, p := range j.orden {
		if p.ID == id {
			return p
		}
	}
	return nil
}

type jugadaJuego struct {
	Escena     string `json:"escena"`
	Accion     string `json:"accion"`
	Bola       int    `json:"bola"`
	Contenedor string `json:"contenedor"`
	A          string `json:"a"`
	DuracionS  int    `json:"duracion_s"`
}

type resultadoJuego struct {
	OK       bool   `json:"ok"`
	Mensaje  string `json:"mensaje"`
	Correcto string `json:"correcto,omitempty"` // el contenedor bueno, cuando fallaste
}

// jugar aplica una jugada de un alumno ya unido. Las de staff (reiniciar, terminar) van aparte.
func (j *juego) jugar(p *jugador, in jugadaJuego, now time.Time) (*resultadoJuego, error) {
	if in.Accion == "unirse" {
		return &resultadoJuego{OK: true, Mensaje: "¡Estás en la arena!"}, nil
	}
	if j.estado == "final" {
		return nil, noVale("la ronda terminó: espera a que el instructor abra otra")
	}
	validarContenedor := func() error {
		for _, k := range j.cfg.Contenedores {
			if k.ID == in.Contenedor {
				return nil
			}
		}
		return fmt.Errorf("contenedor desconocido")
	}
	b := j.buscarBola(in.Bola)
	if b == nil {
		return nil, noVale("esa bola ya no está")
	}
	switch in.Accion {
	case "atrapar":
		if b.Estado != "libre" {
			return nil, noVale("¡te la ganaron!")
		}
		if j.bolaDe(p.sub) != nil {
			return nil, noVale("ya tienes una bola: clasifícala o tírala")
		}
		b.Estado, b.Dueno, b.Desde, b.Vence = "atrapada", p.sub, now, now.Add(juegoAtrapada)
		return &resultadoJuego{OK: true, Mensaje: "¡Atrapada! ¿En qué contenedor va?"}, nil

	case "clasificar":
		if b.Estado != "atrapada" || b.Dueno != p.sub {
			return nil, noVale("esa bola no la tienes tú")
		}
		if err := validarContenedor(); err != nil {
			return nil, err
		}
		if !j.correcto(b.Concepto, in.Contenedor) {
			bueno := j.nombreContenedor(j.cfg.Conceptos[b.Concepto].Contenedor)
			j.sumarFallo(p)
			j.soltar(b, now)
			return &resultadoJuego{OK: false, Mensaje: "¡Uy! Vuelve al centro (−1)", Correcto: bueno}, nil
		}
		j.sumarAcierto(p, now)
		b.Estado, b.Desde, b.Vence = "cargada", now, now.Add(juegoCargada)
		return &resultadoJuego{OK: true, Mensaje: "¡Cargada! Elige un arco y dispara"}, nil

	case "tirar":
		if b.Estado != "cargada" || b.Dueno != p.sub {
			return nil, noVale("primero atrapa y clasifica una bola")
		}
		t := j.porID(in.A)
		if t == nil || t == p {
			return nil, noVale("elige el arco de otro jugador")
		}
		if !j.activo(t, now) {
			return nil, noVale("ese jugador ya no está en la arena")
		}
		b.Estado, b.Hacia, b.Desde, b.Vence = "vuelo", t.sub, now, now.Add(juegoVuelo)
		b.Concepto = j.conceptoNuevo(b.Concepto) // el arquero ataja clasificando un concepto nuevo
		return &resultadoJuego{OK: true, Mensaje: "¡POW! Va al arco de " + t.Nombre}, nil

	case "atajar":
		if b.Estado != "vuelo" || b.Hacia != p.sub {
			return nil, noVale("esa bola no va a tu arco")
		}
		if err := validarContenedor(); err != nil {
			return nil, err
		}
		if !j.correcto(b.Concepto, in.Contenedor) {
			bueno := j.nombreContenedor(j.cfg.Conceptos[b.Concepto].Contenedor)
			p.Fallos++
			j.gol(b, now) // sin −1: ya te costó el gol
			return &resultadoJuego{OK: false, Mensaje: "¡GOL en contra!", Correcto: bueno}, nil
		}
		p.Atajadas++
		p.Puntos += juegoAtajada
		tirador := ""
		if t := j.jugadores[b.Dueno]; t != nil {
			tirador = t.ID
		}
		j.evento(eventoJuego{Tipo: "atajada", De: p.ID, A: tirador, Concepto: j.cfg.Conceptos[b.Concepto].Texto, Valor: juegoAtajada}, now)
		j.sumarAcierto(p, now)
		if j.bolaDe(p.sub) == nil { // la atajada es tuya: contraataca
			b.Estado, b.Dueno, b.Hacia, b.Desde, b.Vence = "cargada", p.sub, "", now, now.Add(juegoCargada)
		} else {
			j.soltar(b, now)
		}
		return &resultadoJuego{OK: true, Mensaje: "¡ATAJADA! (+1) y la bola es tuya"}, nil
	}
	return nil, fmt.Errorf("acción desconocida")
}

// reiniciar abre una ronda nueva: puntajes a cero (los jugadores y sus colores se quedan), bolas
// nuevas y reloj de duracion segundos.
func (j *juego) reiniciar(duracion int, now time.Time) {
	if duracion < 30 || duracion > 900 {
		duracion = juegoDuracionDef
	}
	for _, p := range j.orden {
		*p = jugador{sub: p.sub, ID: p.ID, Nombre: p.Nombre, Color: p.Color, visto: p.visto}
	}
	j.bolas, j.eventos = nil, nil
	j.estado, j.duracion, j.fin = "jugando", duracion, now.Add(time.Duration(duracion)*time.Second)
	j.evento(eventoJuego{Tipo: "ronda", Valor: duracion}, now)
	j.avanzar(now)
}

func (j *juego) terminar(now time.Time) {
	if j.estado == "jugando" {
		j.fin = now
	}
	j.avanzar(now)
}

type vistaJugador struct {
	ID         string `json:"id"`
	Nombre     string `json:"nombre"`
	Color      int    `json:"color"`
	Puntos     int    `json:"puntos"`
	Racha      int    `json:"racha"`
	MejorRacha int    `json:"mejor_racha"`
	Goles      int    `json:"goles"`
	Atajadas   int    `json:"atajadas"`
	Aciertos   int    `json:"aciertos"`
	Fallos     int    `json:"fallos"`
	Activo     bool   `json:"activo"`
}

type vistaBola struct {
	ID       int     `json:"id"`
	Concepto string  `json:"concepto"`
	Estado   string  `json:"estado"`
	Dueno    string  `json:"dueno,omitempty"`
	Hacia    string  `json:"hacia,omitempty"`
	DesdeMs  int64   `json:"desde_ms"`
	VenceMs  int64   `json:"vence_ms,omitempty"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	VX       float64 `json:"vx"`
	VY       float64 `json:"vy"`
}

type vistaJuego struct {
	AhoraMs      int64             `json:"ahora_ms"`
	Estado       string            `json:"estado"`
	FinMs        int64             `json:"fin_ms,omitempty"`
	DuracionS    int               `json:"duracion_s"`
	Staff        bool              `json:"staff"`
	Yo           string            `json:"yo"`
	MiPuesto     int               `json:"mi_puesto,omitempty"`
	Contenedores []contenedorJuego `json:"contenedores"`
	Jugadores    []vistaJugador    `json:"jugadores"`
	Bolas        []vistaBola       `json:"bolas"`
	Tabla        []vistaJugador    `json:"tabla"`
	TotalTabla   int               `json:"total_tabla"`
	Eventos      []eventoJuego     `json:"eventos"`
	Resultado    *resultadoJuego   `json:"resultado,omitempty"`
}

func (j *juego) vista(sub string, staff bool, now time.Time) vistaJuego {
	v := vistaJuego{AhoraMs: now.UnixMilli(), Estado: j.estado, DuracionS: j.duracion, Staff: staff,
		Contenedores: j.cfg.Contenedores, Jugadores: []vistaJugador{}, Bolas: []vistaBola{}, Tabla: []vistaJugador{},
		Eventos: append([]eventoJuego{}, j.eventos...)}
	if !j.fin.IsZero() {
		v.FinMs = j.fin.UnixMilli()
	}
	pub := func(s string) string {
		if p := j.jugadores[s]; p != nil {
			return p.ID
		}
		return ""
	}
	todos := make([]vistaJugador, 0, len(j.orden))
	for _, p := range j.orden {
		vj := vistaJugador{ID: p.ID, Nombre: p.Nombre, Color: p.Color, Puntos: p.Puntos, Racha: p.Racha, MejorRacha: p.MejorRacha,
			Goles: p.Goles, Atajadas: p.Atajadas, Aciertos: p.Aciertos, Fallos: p.Fallos, Activo: j.activo(p, now)}
		if vj.Activo || p.sub == sub {
			v.Jugadores = append(v.Jugadores, vj)
		}
		todos = append(todos, vj)
	}
	if p := j.jugadores[sub]; p != nil {
		v.Yo = p.ID
	}
	sort.SliceStable(todos, func(a, b int) bool {
		if todos[a].Puntos != todos[b].Puntos {
			return todos[a].Puntos > todos[b].Puntos
		}
		return todos[a].Goles+todos[a].Atajadas > todos[b].Goles+todos[b].Atajadas
	})
	for i, t := range todos {
		if t.ID == v.Yo {
			v.MiPuesto = i + 1
		}
	}
	v.TotalTabla = len(todos)
	if !staff && len(todos) > 5 {
		todos = todos[:5]
	}
	v.Tabla = todos
	for _, b := range j.bolas {
		vb := vistaBola{ID: b.ID, Concepto: j.cfg.Conceptos[b.Concepto].Texto, Estado: b.Estado, Dueno: pub(b.Dueno), Hacia: pub(b.Hacia),
			DesdeMs: b.Desde.UnixMilli(), X: b.X, Y: b.Y, VX: b.VX, VY: b.VY}
		if !b.Vence.IsZero() {
			vb.VenceMs = b.Vence.UnixMilli()
		}
		v.Bolas = append(v.Bolas, vb)
	}
	return v
}

// juegoDe busca (o crea) el juego de esa lección y escena. La escena debe existir y tener juego.yaml.
// Devuelve el juego con el candado de juegoLive PUESTO: quien llama debe soltarlo.
func (s *Server) juegoDe(w http.ResponseWriter, r *http.Request, p *Principal, escena string) *juego {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return nil
	}
	escena = strings.TrimSpace(escena)
	if !idVoto.MatchString(escena) {
		badRequest(w, "falta la escena")
		return nil
	}
	e := s.Content.Get().Escena(l.ID, escena)
	if e == nil {
		notFound(w, "la escena")
		return nil
	}
	clave := l.ID + "/" + escena
	juegoLive.Lock()
	if j := juegoLive.v[clave]; j != nil {
		return j
	}
	cfg, err := leerConfigJuego(filepath.Join(filepath.Dir(e.HTMLPath), "juego.yaml"))
	if err != nil {
		juegoLive.Unlock()
		if errors.Is(err, os.ErrNotExist) {
			notFound(w, "el juego de esa escena")
		} else {
			internal(w, err)
		}
		return nil
	}
	j := nuevoJuego(cfg, uint64(time.Now().UnixNano()))
	juegoLive.v[clave] = j
	return j
}

// liveJuegoGet: GET /api/v1/live/{lesson}/juego?escena=… → el estado completo (ver vistaJuego).
// Pedirlo cuenta como «sigo aquí» para quien ya se unió.
func (s *Server) liveJuegoGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	j := s.juegoDe(w, r, p, r.URL.Query().Get("escena"))
	if j == nil {
		return
	}
	defer juegoLive.Unlock()
	now := time.Now()
	if yo := j.jugadores[p.ID]; yo != nil {
		yo.visto = now
	}
	j.avanzar(now)
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, j.vista(p.ID, p.Staff(), now))
}

// liveJuegoPost: POST /api/v1/live/{lesson}/juego {"escena","accion",…}. Acciones del alumno:
// unirse, atrapar {bola}, clasificar {bola,contenedor}, tirar {bola,a}, atajar {bola,contenedor}.
// Del staff: reiniciar {duracion_s} (abre una ronda nueva con los puntajes a cero) y terminar.
// Cualquier jugada te une a la arena. Devuelve el estado y, en «resultado», cómo te fue.
func (s *Server) liveJuegoPost(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in jugadaJuego
	if !readJSON(w, r, &in) {
		return
	}
	j := s.juegoDe(w, r, p, in.Escena)
	if j == nil {
		return
	}
	defer juegoLive.Unlock()
	now := time.Now()
	var res *resultadoJuego
	switch in.Accion {
	case "reiniciar", "terminar":
		if !p.Staff() {
			forbidden(w)
			return
		}
		if in.Accion == "reiniciar" {
			if e := s.Content.Get().Escena(r.PathValue("lesson"), strings.TrimSpace(in.Escena)); e != nil {
				if cfg, err := leerConfigJuego(filepath.Join(filepath.Dir(e.HTMLPath), "juego.yaml")); err == nil {
					j.cfg = cfg // relee juego.yaml: se puede corregir un concepto entre rondas
				}
			}
			j.reiniciar(in.DuracionS, now)
			res = &resultadoJuego{OK: true, Mensaje: "Ronda nueva"}
		} else {
			j.terminar(now)
			res = &resultadoJuego{OK: true, Mensaje: "Ronda terminada"}
		}
	case "unirse", "atrapar", "clasificar", "tirar", "atajar":
		j.avanzar(now)
		yo, err := j.unir(p.ID, nombreMuro(p), now)
		if err == nil {
			res, err = j.jugar(yo, in, now)
		}
		if err != nil {
			if errors.Is(err, errJuego) {
				writeErr(w, 409, "conflict", err.Error())
			} else {
				badRequest(w, err.Error())
			}
			return
		}
		j.avanzar(now)
	default:
		badRequest(w, "acción: unirse, atrapar, clasificar, tirar, atajar, reiniciar o terminar")
		return
	}
	v := j.vista(p.ID, p.Staff(), now)
	v.Resultado = res
	writeJSON(w, 200, v)
}
