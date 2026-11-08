package httpapi

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"math"
	"math/rand/v2"
	"net/http"
	"path"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"
)

// Patio de la «Arena JMD»: la sala genérica de tiempo real sobre la que corren los juegos de clase del LIVE
// (docs/ARENA_JMD.md). Cada alumno manda su estado chico (posición, dirección, animación, emote, lo que
// carga, puntos, avatar) y el servidor guarda el último de cada uno y lo difunde en «instantes» de ~10 Hz por
// SSE a todos los de esa lección y escena. El servidor no conoce las reglas de cada juego: solo es dueño de la
// ronda (semilla común, inicio y fin), de unos pocos contadores compartidos (la meta del equipo) y de los
// objetos del mundo («este pepita la tomó Ana»), para que dos personas no se lleven lo mismo.
//
//	GET  /api/v1/live/{lesson}/patio/stream?escena=…   SSE: «hola» al conectar y luego «instante»
//	GET  /api/v1/live/{lesson}/patio?escena=…          el instante actual (sin SSE)
//	POST /api/v1/live/{lesson}/patio {"escena","accion",…}
//	     alumno: estado (por defecto), evento, tomar, soltar, sumar, salir
//	     staff:  iniciar {duracion_s, semilla?, meta?}, terminar, reiniciar
//	GET  /api/v1/live/{lesson}/arena/{archivo}          el motor del cliente (arena-jmd.js y .css)
//
// Como el muro y la arena de conceptos: en memoria, por lección y escena; vale lo que dura la clase.
var patios = struct {
	sync.Mutex
	m map[string]*patio
}{m: map[string]*patio{}}

const (
	patioMaxJugadores  = 40
	patioMaxSubs       = 120 // conexiones SSE por sala (alumnos con dos pestañas, el proyector, el instructor)
	patioInactivo      = 20 * time.Second
	patioTick          = 100 * time.Millisecond // ~10 Hz
	patioLatido        = 2 * time.Second        // con la sala quieta, un instante igual cada 2 s (hora y presencia)
	patioMaxCuerpo     = 2048                   // bytes por POST
	patioMaxObjetos    = 300
	patioMaxContadores = 8
	patioMaxEventos    = 24 // por instante; los que sobran se descartan
	patioTabla         = 10
	patioDuracionDef   = 180
	patioMaxCoord      = 100000
	patioMaxPuntos     = 1000000
	patioMaxSumar      = 100
	patioMaxMeta       = 1000000
)

// Límites por jugador (cubeta de fichas): capacidad y fichas por segundo.
var (
	patioCuotaEstado = cuota{cap: 20, porSeg: 15}
	patioCuotaEvento = cuota{cap: 6, porSeg: 2}
	patioCuotaAccion = cuota{cap: 12, porSeg: 6} // tomar, soltar, sumar
)

// idPatio: identificadores cortos que manda el cliente (accesorio, animación, emote, objeto, contador…).
var idPatio = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,23}$`)

type cuota struct {
	cap    float64
	porSeg float64
}

type cubeta struct {
	fichas float64
	ultimo time.Time
}

func (c *cubeta) tomar(q cuota, now time.Time) bool {
	if c.ultimo.IsZero() {
		c.fichas = q.cap
	} else {
		c.fichas = math.Min(q.cap, c.fichas+now.Sub(c.ultimo).Seconds()*q.porSeg)
	}
	c.ultimo = now
	if c.fichas < 1 {
		return false
	}
	c.fichas--
	return true
}

type avatarPatio struct {
	Color     int    `json:"color"`
	Accesorio string `json:"accesorio"`
}

type jugadorPatio struct {
	sub     string
	id      string
	nombre  string
	color   int
	acc     string
	x, y    float64
	dir     int
	anim    string
	emote   string
	emoteMs int64
	carga   string
	equipo  string
	puntos  int
	visto   time.Time
	activo  bool // último valor difundido, para saber si cambió
	limEst  cubeta
	limEv   cubeta
	limAcc  cubeta
}

type objetoPatio struct {
	v     int
	dueno string // sub
}

type eventoPatio struct {
	N     int    `json:"n"`
	De    string `json:"de,omitempty"`
	Tipo  string `json:"tipo"`
	Texto string `json:"texto,omitempty"`
	Valor int    `json:"valor,omitempty"`
	X     *int   `json:"x,omitempty"`
	Y     *int   `json:"y,omitempty"`
}

type rondaPatio struct {
	N         int    `json:"n"`
	Estado    string `json:"estado"` // espera | jugando | final
	Semilla   uint32 `json:"semilla"`
	InicioMs  int64  `json:"inicio_ms,omitempty"`
	FinMs     int64  `json:"fin_ms,omitempty"`
	DuracionS int    `json:"duracion_s"`
	Meta      int    `json:"meta,omitempty"`
}

type subPatio struct {
	ch    chan []byte
	sub   string
	staff bool
}

// poner deja el mensaje en el buzón sin bloquear; si está lleno tira el más viejo (el instante nuevo lo
// reemplaza todo).
func (c *subPatio) poner(msg []byte) {
	for i := 0; i < 4; i++ {
		select {
		case c.ch <- msg:
			return
		default:
			select {
			case <-c.ch:
			default:
			}
		}
	}
}

type patio struct {
	mu         sync.Mutex
	clave      string
	jugadores  map[string]*jugadorPatio
	orden      []*jugadorPatio
	sigID      int
	objetos    map[string]*objetoPatio
	contadores map[string]int
	ronda      rondaPatio
	eventos    []eventoPatio // pendientes del próximo instante
	sigEvento  int
	subs       map[*subPatio]struct{}
	corriendo  bool
	sucio      bool
	ultimo     time.Time
	rnd        *rand.Rand
}

func nuevoPatio(clave string, semilla uint64) *patio {
	p := &patio{clave: clave, jugadores: map[string]*jugadorPatio{}, objetos: map[string]*objetoPatio{},
		contadores: map[string]int{}, subs: map[*subPatio]struct{}{},
		rnd: rand.New(rand.NewPCG(semilla, semilla^0x9e3779b97f4a7c15))}
	p.ronda = rondaPatio{Estado: "espera", Semilla: p.rnd.Uint32(), DuracionS: patioDuracionDef}
	return p
}

// errPatio: una jugada que no vale ahora (objeto ajeno, sala llena, ronda terminada). Sale como 409.
var errPatio = errors.New("patio")

type errorPatio struct{ msg string }

func (e errorPatio) Error() string   { return e.msg }
func (e errorPatio) Is(t error) bool { return t == errPatio }

func noValePatio(msg string) error { return errorPatio{msg} }

func (s *patio) esActivo(j *jugadorPatio, now time.Time) bool {
	return !j.visto.IsZero() && now.Sub(j.visto) <= patioInactivo
}

// unir devuelve el jugador de sub; si no existe lo crea. Con la sala llena, saca al que lleva más tiempo
// inactivo; si todos están activos, la sala está llena.
func (s *patio) unir(sub, nombre string, now time.Time) (*jugadorPatio, error) {
	if j := s.jugadores[sub]; j != nil {
		if !s.esActivo(j, now) {
			s.sucio = true
		}
		j.visto = now
		j.nombre = nombre
		return j, nil
	}
	if len(s.orden) >= patioMaxJugadores {
		var peor *jugadorPatio
		for _, j := range s.orden {
			if !s.esActivo(j, now) && (peor == nil || j.visto.Before(peor.visto)) {
				peor = j
			}
		}
		if peor == nil {
			return nil, noValePatio("la sala está llena (40 jugadores)")
		}
		s.quitar(peor)
	}
	s.sigID++
	j := &jugadorPatio{sub: sub, id: "j" + strconv.Itoa(s.sigID), nombre: nombre, color: (s.sigID - 1) % 12, visto: now, dir: 0}
	s.jugadores[sub] = j
	s.orden = append(s.orden, j)
	s.sucio = true
	return j, nil
}

func (s *patio) quitar(j *jugadorPatio) {
	s.soltarTodo(j.sub)
	delete(s.jugadores, j.sub)
	for i, o := range s.orden {
		if o == j {
			s.orden = append(s.orden[:i], s.orden[i+1:]...)
			break
		}
	}
	s.sucio = true
}

// soltarTodo devuelve al mundo lo que tenía sub (se fue o se quedó quieto demasiado).
func (s *patio) soltarTodo(sub string) {
	for _, o := range s.objetos {
		if o.dueno == sub {
			o.dueno = ""
			s.sucio = true
		}
	}
	if j := s.jugadores[sub]; j != nil && j.carga != "" {
		j.carga = ""
	}
}

// avanzar cierra la ronda vencida y suelta lo de quien se fue. Se llama con el candado puesto.
func (s *patio) avanzar(now time.Time) {
	if s.ronda.Estado == "jugando" && s.ronda.FinMs > 0 && now.UnixMilli() >= s.ronda.FinMs {
		s.ronda.Estado = "final"
		s.sucio = true
	}
	for _, j := range s.orden {
		a := s.esActivo(j, now)
		if a != j.activo {
			j.activo = a
			s.sucio = true
			if !a {
				s.soltarTodo(j.sub)
			}
		}
	}
}

func textoPatio(t string, max int) string {
	t = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return ' '
		}
		return r
	}, t)
	t = strings.Join(strings.Fields(t), " ")
	if rs := []rune(t); len(rs) > max {
		t = string(rs[:max])
	}
	return t
}

func idValido(v string) bool { return v == "" || idPatio.MatchString(v) }

func coordValida(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0) && math.Abs(v) <= patioMaxCoord
}

type jugadaPatio struct {
	Escena    string       `json:"escena"`
	Accion    string       `json:"accion"`
	X         *float64     `json:"x"`
	Y         *float64     `json:"y"`
	Dir       *int         `json:"dir"`
	Anim      *string      `json:"anim"`
	Emote     *string      `json:"emote"`
	Carga     *string      `json:"carga"`
	Equipo    *string      `json:"equipo"`
	Puntos    *int         `json:"puntos"`
	Avatar    *avatarPatio `json:"avatar"`
	Objeto    string       `json:"objeto"`
	V         int          `json:"v"`
	Consumir  bool         `json:"consumir"`
	Contador  string       `json:"contador"`
	Valor     int          `json:"valor"`
	Tipo      string       `json:"tipo"`
	Texto     string       `json:"texto"`
	EX        *float64     `json:"ex"`
	EY        *float64     `json:"ey"`
	DuracionS int          `json:"duracion_s"`
	Semilla   *uint32      `json:"semilla"`
	Meta      int          `json:"meta"`
}

// estado aplica los campos presentes; los ausentes no cambian. Valida todo antes de tocar nada.
func (s *patio) estado(j *jugadorPatio, in jugadaPatio, now time.Time) error {
	if (in.X != nil && !coordValida(*in.X)) || (in.Y != nil && !coordValida(*in.Y)) {
		return fmt.Errorf("x e y: números finitos de hasta %d", patioMaxCoord)
	}
	if in.Dir != nil && (*in.Dir < 0 || *in.Dir > 7) {
		return fmt.Errorf("dir: de 0 a 7")
	}
	for _, v := range []*string{in.Anim, in.Emote, in.Carga, in.Equipo} {
		if v != nil && !idValido(*v) {
			return fmt.Errorf("anim, emote, carga y equipo: minúsculas, dígitos, guion o guion bajo (hasta 24)")
		}
	}
	if in.Puntos != nil && (*in.Puntos < 0 || *in.Puntos > patioMaxPuntos) {
		return fmt.Errorf("puntos: de 0 a %d", patioMaxPuntos)
	}
	if in.Avatar != nil && (in.Avatar.Color < 0 || in.Avatar.Color > 31 || !idValido(in.Avatar.Accesorio)) {
		return fmt.Errorf("avatar: color de 0 a 31 y accesorio corto")
	}
	if in.X != nil {
		j.x = math.Round(*in.X*10) / 10
	}
	if in.Y != nil {
		j.y = math.Round(*in.Y*10) / 10
	}
	if in.Dir != nil {
		j.dir = *in.Dir
	}
	if in.Anim != nil {
		j.anim = *in.Anim
	}
	if in.Emote != nil {
		j.emote = *in.Emote
		if j.emote != "" {
			j.emoteMs = now.UnixMilli() // el mismo emote dos veces vuelve a salir
		}
	}
	if in.Carga != nil {
		j.carga = *in.Carga
	}
	if in.Equipo != nil {
		j.equipo = *in.Equipo
	}
	if in.Puntos != nil {
		j.puntos = *in.Puntos
	}
	if in.Avatar != nil {
		j.color, j.acc = in.Avatar.Color, in.Avatar.Accesorio
	}
	s.sucio = true
	return nil
}

func (s *patio) evento(j *jugadorPatio, in jugadaPatio) error {
	if in.Tipo == "" || !idPatio.MatchString(in.Tipo) {
		return fmt.Errorf("tipo: minúsculas, dígitos, guion o guion bajo (hasta 24)")
	}
	e := eventoPatio{Tipo: in.Tipo, Texto: textoPatio(in.Texto, 80), Valor: in.Valor}
	if j != nil {
		e.De = j.id
	}
	if in.EX != nil && in.EY != nil && coordValida(*in.EX) && coordValida(*in.EY) {
		x, y := int(math.Round(*in.EX)), int(math.Round(*in.EY))
		e.X, e.Y = &x, &y
	}
	s.sigEvento++
	e.N = s.sigEvento
	s.eventos = append(s.eventos, e)
	if len(s.eventos) > patioMaxEventos {
		s.eventos = s.eventos[len(s.eventos)-patioMaxEventos:]
	}
	s.sucio = true
	return nil
}

// tomar: el objeto pasa a ser de j si está libre y en la versión que el cliente ve. Un objeto que nunca se
// tocó está libre en la versión 0.
func (s *patio) tomar(j *jugadorPatio, id string, v int) (*objetoPatio, error) {
	if !idPatio.MatchString(id) || v < 0 {
		return nil, fmt.Errorf("objeto: minúsculas, dígitos, guion o guion bajo (hasta 24); v ≥ 0")
	}
	if s.ronda.Estado == "final" {
		return nil, noValePatio("la ronda terminó")
	}
	o := s.objetos[id]
	if o == nil {
		if len(s.objetos) >= patioMaxObjetos {
			return nil, noValePatio("el mundo ya no tiene sitio para más objetos")
		}
		o = &objetoPatio{}
		s.objetos[id] = o
	}
	if o.v != v {
		return nil, noValePatio("ese objeto ya cambió")
	}
	if o.dueno != "" && o.dueno != j.sub {
		return nil, noValePatio("¡te lo ganaron!")
	}
	o.dueno = j.sub
	s.sucio = true
	return o, nil
}

// soltar: devuelve el objeto al mundo; con consumir pasa a la versión siguiente (en el cliente es un
// objeto nuevo: otra carta, otro lugar).
func (s *patio) soltar(j *jugadorPatio, id string, consumir bool) (*objetoPatio, error) {
	o := s.objetos[id]
	if o == nil || o.dueno != j.sub {
		return nil, noValePatio("ese objeto no lo tienes tú")
	}
	o.dueno = ""
	if consumir {
		o.v++
	}
	if j.carga == id {
		j.carga = ""
	}
	s.sucio = true
	return o, nil
}

func (s *patio) sumar(nombre string, valor int) (int, error) {
	if !idPatio.MatchString(nombre) || valor < -patioMaxSumar || valor > patioMaxSumar {
		return 0, fmt.Errorf("contador corto y valor de −%d a %d", patioMaxSumar, patioMaxSumar)
	}
	if s.ronda.Estado == "final" {
		return 0, noValePatio("la ronda terminó")
	}
	if _, ok := s.contadores[nombre]; !ok && len(s.contadores) >= patioMaxContadores {
		return 0, noValePatio("hay demasiados contadores")
	}
	n := s.contadores[nombre] + valor
	if n < 0 {
		n = 0
	}
	if n > patioMaxMeta*10 {
		n = patioMaxMeta * 10
	}
	s.contadores[nombre] = n
	s.sucio = true
	return n, nil
}

// iniciar abre una ronda: semilla común, reloj, puntos y cargas a cero, objetos y contadores nuevos.
// Los jugadores se quedan (con su color y su avatar).
func (s *patio) iniciar(duracion int, semilla *uint32, meta int, now time.Time) {
	if duracion < 20 || duracion > 1800 {
		duracion = patioDuracionDef
	}
	if meta < 0 || meta > patioMaxMeta {
		meta = 0
	}
	sem := s.rnd.Uint32()
	if semilla != nil {
		sem = *semilla
	}
	s.limpiarRonda()
	s.ronda = rondaPatio{N: s.ronda.N + 1, Estado: "jugando", Semilla: sem, InicioMs: now.UnixMilli(),
		FinMs: now.Add(time.Duration(duracion) * time.Second).UnixMilli(), DuracionS: duracion, Meta: meta}
	s.sucio = true
}

func (s *patio) terminar(now time.Time) {
	if s.ronda.Estado == "jugando" {
		s.ronda.Estado, s.ronda.FinMs = "final", now.UnixMilli()
		s.sucio = true
	}
}

// reiniciar vuelve al calentamiento: sin reloj, todo a cero y semilla nueva.
func (s *patio) reiniciar() {
	s.limpiarRonda()
	s.ronda = rondaPatio{N: s.ronda.N + 1, Estado: "espera", Semilla: s.rnd.Uint32(), DuracionS: s.ronda.DuracionS}
	s.sucio = true
}

func (s *patio) limpiarRonda() {
	for _, j := range s.orden {
		j.puntos, j.carga, j.emote, j.anim = 0, "", "", ""
	}
	s.objetos = map[string]*objetoPatio{}
	s.contadores = map[string]int{}
	s.eventos = nil
}

// Vistas del instante. Claves cortas: viajan ~10 veces por segundo a cada alumno.
type vistaJugadorPatio struct {
	ID      string  `json:"id"`
	Nombre  string  `json:"n"`
	Color   int     `json:"c"`
	Acc     string  `json:"a,omitempty"`
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
	Dir     int     `json:"d"`
	Anim    string  `json:"m,omitempty"`
	Emote   string  `json:"e,omitempty"`
	EmoteMs int64   `json:"es,omitempty"`
	Carga   string  `json:"k,omitempty"`
	Equipo  string  `json:"q,omitempty"`
	Puntos  int     `json:"p"`
}

type vistaTablaPatio struct {
	ID     string `json:"id"`
	Nombre string `json:"n"`
	Color  int    `json:"c"`
	Acc    string `json:"a,omitempty"`
	Puntos int    `json:"p"`
	Activo bool   `json:"on"`
}

type vistaObjetoPatio struct {
	ID    string `json:"id"`
	V     int    `json:"v"`
	Dueno string `json:"d,omitempty"`
}

type instantePatio struct {
	T          int64               `json:"t"`
	Ronda      rondaPatio          `json:"r"`
	Contadores map[string]int      `json:"c"`
	Jugadores  []vistaJugadorPatio `json:"j"`
	Tabla      []vistaTablaPatio   `json:"tb"`
	Total      int                 `json:"tt"`
	Objetos    []vistaObjetoPatio  `json:"o"`
	Eventos    []eventoPatio       `json:"ev,omitempty"`
}

func (s *patio) instante(now time.Time) instantePatio {
	v := instantePatio{T: now.UnixMilli(), Ronda: s.ronda, Contadores: map[string]int{}, Jugadores: []vistaJugadorPatio{},
		Tabla: []vistaTablaPatio{}, Objetos: []vistaObjetoPatio{}, Eventos: s.eventos}
	for k, n := range s.contadores {
		v.Contadores[k] = n
	}
	pub := map[string]string{}
	tabla := make([]vistaTablaPatio, 0, len(s.orden))
	for _, j := range s.orden {
		pub[j.sub] = j.id
		on := s.esActivo(j, now)
		if on {
			vj := vistaJugadorPatio{ID: j.id, Nombre: j.nombre, Color: j.color, Acc: j.acc, X: j.x, Y: j.y, Dir: j.dir,
				Anim: j.anim, Carga: j.carga, Equipo: j.equipo, Puntos: j.puntos}
			if j.emote != "" && now.UnixMilli()-j.emoteMs < 4000 {
				vj.Emote, vj.EmoteMs = j.emote, j.emoteMs
			}
			v.Jugadores = append(v.Jugadores, vj)
		}
		if on || j.puntos > 0 {
			tabla = append(tabla, vistaTablaPatio{ID: j.id, Nombre: j.nombre, Color: j.color, Acc: j.acc, Puntos: j.puntos, Activo: on})
		}
	}
	sort.SliceStable(tabla, func(a, b int) bool { return tabla[a].Puntos > tabla[b].Puntos })
	v.Total = len(tabla)
	if len(tabla) > patioTabla {
		tabla = tabla[:patioTabla]
	}
	v.Tabla = tabla
	ids := make([]string, 0, len(s.objetos))
	for id, o := range s.objetos {
		if o.v > 0 || o.dueno != "" {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)
	for _, id := range ids {
		o := s.objetos[id]
		v.Objetos = append(v.Objetos, vistaObjetoPatio{ID: id, V: o.v, Dueno: pub[o.dueno]})
	}
	return v
}

// mensajeSSE arma el bloque «event:/data:».
func mensajeSSE(evento string, dato any) []byte {
	b, _ := json.Marshal(dato)
	var buf bytes.Buffer
	buf.Grow(len(b) + len(evento) + 16)
	buf.WriteString("event: ")
	buf.WriteString(evento)
	buf.WriteString("\ndata: ")
	buf.Write(b)
	buf.WriteString("\n\n")
	return buf.Bytes()
}

// difundir: un tic del bucle. Si algo cambió (o pasó el latido), arma un solo instante y lo deja en el
// buzón de cada conexión. Devuelve false cuando ya no queda nadie conectado.
func (s *patio) difundir(now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.subs) == 0 {
		s.corriendo = false
		return false
	}
	s.avanzar(now)
	if !s.sucio && now.Sub(s.ultimo) < patioLatido {
		return true
	}
	msg := mensajeSSE("instante", s.instante(now))
	s.sucio, s.ultimo, s.eventos = false, now, nil
	for c := range s.subs {
		c.poner(msg)
	}
	return true
}

func (s *patio) bucle() {
	t := time.NewTicker(patioTick)
	defer t.Stop()
	for now := range t.C {
		if !s.difundir(now) {
			return
		}
	}
}

// patioDe busca (o crea) la sala de esa lección y escena; la escena debe existir. Responde el error al
// cliente y devuelve nil si no se puede.
func (s *Server) patioDe(w http.ResponseWriter, r *http.Request, p *Principal, escena string) *patio {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return nil
	}
	escena = strings.TrimSpace(escena)
	if !idVoto.MatchString(escena) {
		badRequest(w, "falta la escena")
		return nil
	}
	if s.Content.Get().Escena(l.ID, escena) == nil {
		notFound(w, "la escena")
		return nil
	}
	clave := l.ID + "/" + escena
	patios.Lock()
	defer patios.Unlock()
	sala := patios.m[clave]
	if sala == nil {
		sala = nuevoPatio(clave, uint64(time.Now().UnixNano()))
		patios.m[clave] = sala
	}
	return sala
}

// livePatioStream: GET /api/v1/live/{lesson}/patio/stream?escena=… — SSE. Al conectar: «hola»
// {yo, staff, nombre} y el instante actual; luego un «instante» por cada tic con cambios (~10 Hz) y uno
// cada 2 s con la sala quieta.
func (s *Server) livePatioStream(w http.ResponseWriter, r *http.Request, p *Principal) {
	sala := s.patioDe(w, r, p, r.URL.Query().Get("escena"))
	if sala == nil {
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		internal(w, errors.New("sin flush"))
		return
	}
	c := &subPatio{ch: make(chan []byte, 4), sub: p.ID, staff: p.Staff()}
	sala.mu.Lock()
	if len(sala.subs) >= patioMaxSubs {
		sala.mu.Unlock()
		writeErr(w, 429, "rate_limited", "la sala tiene demasiadas conexiones")
		return
	}
	sala.subs[c] = struct{}{}
	if !sala.corriendo {
		sala.corriendo = true
		go sala.bucle()
	}
	now := time.Now()
	sala.avanzar(now)
	yo := ""
	if j := sala.jugadores[p.ID]; j != nil {
		yo = j.id
	}
	hola := mensajeSSE("hola", map[string]any{"yo": yo, "staff": p.Staff(), "nombre": nombreMuro(p), "t": now.UnixMilli()})
	primero := mensajeSSE("instante", sala.instante(now))
	sala.mu.Unlock()
	defer func() {
		sala.mu.Lock()
		delete(sala.subs, c)
		sala.mu.Unlock()
	}()

	h := w.Header()
	h.Set("Content-Type", "text/event-stream; charset=utf-8")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(200)
	if _, err := w.Write(append(append([]byte("retry: 1500\n\n"), hola...), primero...)); err != nil {
		return
	}
	flusher.Flush()
	ping := time.NewTicker(15 * time.Second)
	defer ping.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ping.C:
			if _, err := w.Write([]byte(": ping\n\n")); err != nil {
				return
			}
			flusher.Flush()
		case msg := <-c.ch:
			if _, err := w.Write(msg); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

// livePatioGet: GET /api/v1/live/{lesson}/patio?escena=… — el instante actual y quién eres, sin SSE.
func (s *Server) livePatioGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	sala := s.patioDe(w, r, p, r.URL.Query().Get("escena"))
	if sala == nil {
		return
	}
	sala.mu.Lock()
	now := time.Now()
	sala.avanzar(now)
	yo := ""
	if j := sala.jugadores[p.ID]; j != nil {
		yo = j.id
	}
	v := sala.instante(now)
	v.Eventos = nil // los eventos solo viajan por el stream
	sala.mu.Unlock()
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"yo": yo, "staff": p.Staff(), "instante": v})
}

// livePatioPost: POST /api/v1/live/{lesson}/patio. Ver el comentario del principio y docs/ARENA_JMD.md.
func (s *Server) livePatioPost(w http.ResponseWriter, r *http.Request, p *Principal) {
	r.Body = http.MaxBytesReader(w, r.Body, patioMaxCuerpo)
	var in jugadaPatio
	if !readJSON(w, r, &in) {
		return
	}
	sala := s.patioDe(w, r, p, in.Escena)
	if sala == nil {
		return
	}
	sala.mu.Lock()
	defer sala.mu.Unlock()
	now := time.Now()
	sala.avanzar(now)
	if in.Accion == "" {
		in.Accion = "estado"
	}
	switch in.Accion {
	case "iniciar", "terminar", "reiniciar":
		if !p.Staff() {
			forbidden(w)
			return
		}
		switch in.Accion {
		case "iniciar":
			sala.iniciar(in.DuracionS, in.Semilla, in.Meta, now)
		case "terminar":
			sala.terminar(now)
		default:
			sala.reiniciar()
		}
		writeJSON(w, 200, map[string]any{"ok": true, "ronda": sala.ronda, "t": now.UnixMilli()})
		return
	case "salir":
		if j := sala.jugadores[p.ID]; j != nil {
			sala.soltarTodo(j.sub)
			j.visto = time.Time{}
			sala.sucio = true
		}
		writeJSON(w, 200, map[string]any{"ok": true})
		return
	case "estado", "evento", "tomar", "soltar", "sumar":
	default:
		badRequest(w, "acción: estado, evento, tomar, soltar, sumar, salir, iniciar, terminar o reiniciar")
		return
	}
	j, err := sala.unir(p.ID, nombreMuro(p), now)
	if err != nil {
		writeErr(w, 409, "conflict", err.Error())
		return
	}
	j.activo = true
	lim, q := &j.limAcc, patioCuotaAccion
	switch in.Accion {
	case "estado":
		lim, q = &j.limEst, patioCuotaEstado
	case "evento":
		lim, q = &j.limEv, patioCuotaEvento
	}
	if !lim.tomar(q, now) {
		writeErr(w, 429, "rate_limited", "vas muy rápido: espera un momento")
		return
	}
	out := map[string]any{"ok": true, "yo": j.id, "t": now.UnixMilli()}
	switch in.Accion {
	case "estado":
		err = sala.estado(j, in, now)
	case "evento":
		err = sala.evento(j, in)
	case "tomar":
		var o *objetoPatio
		if o, err = sala.tomar(j, in.Objeto, in.V); err == nil {
			j.carga = in.Objeto
			out["objeto"] = vistaObjetoPatio{ID: in.Objeto, V: o.v, Dueno: j.id}
		}
	case "soltar":
		var o *objetoPatio
		if o, err = sala.soltar(j, in.Objeto, in.Consumir); err == nil {
			out["objeto"] = vistaObjetoPatio{ID: in.Objeto, V: o.v}
		}
	case "sumar":
		var n int
		if n, err = sala.sumar(in.Contador, in.Valor); err == nil {
			out["valor"] = n
		}
	}
	if err != nil {
		if errors.Is(err, errPatio) {
			writeErr(w, 409, "conflict", err.Error())
		} else {
			badRequest(w, err.Error())
		}
		return
	}
	writeJSON(w, 200, out)
}

// El motor del cliente vive dentro del binario: una sola copia para todos los cursos, con la misma versión
// que la API que habla. Las escenas lo cargan con una ruta relativa: <script src="../../arena/arena-jmd.js">.
//
//go:embed arena
var arenaFS embed.FS

// liveArenaArchivo: GET /api/v1/live/{lesson}/arena/{archivo} (autenticado, como /comun). Solo los
// archivos de la carpeta arena, con las extensiones de extsEscena.
func (s *Server) liveArenaArchivo(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.Content.Get().Lesson(r.PathValue("lesson")) == nil {
		notFound(w, "la lección")
		return
	}
	nombre := r.PathValue("archivo")
	ct, ok := extsEscena[strings.ToLower(path.Ext(nombre))]
	if !ok || nombre != path.Base(nombre) || strings.HasPrefix(nombre, ".") || strings.ContainsAny(nombre, `/\`) {
		notFound(w, "el archivo")
		return
	}
	raw, err := fs.ReadFile(arenaFS, "arena/"+nombre)
	if err != nil {
		notFound(w, "el archivo")
		return
	}
	h := w.Header()
	h.Set("Content-Type", ct)
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Cross-Origin-Resource-Policy", "same-origin")
	w.WriteHeader(200)
	_, _ = w.Write(raw)
}
