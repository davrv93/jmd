package main

// Mesas en vivo (solo en la sala de clase): UNA mesa para toda la clase, hasta MESA_HUMANOS alumnos (16 por
// defecto) en el mismo tablero; con menos de 4 alumnos entra además un robot de la máquina. El tablero crece
// con la gente: 9 × 9 hasta 4 robots, 13 × 13 hasta 9 y 17 × 17 hasta 17.
// El servidor corre el tablero (port de web/static/tablero.js) y manda una foto a cada navegador unas 15
// veces por segundo por SSE; los navegadores solo dibujan y mandan su dirección. Las preguntas de los
// poderes usan las mismas /api/pregunta y /api/responder de la partida de cada alumno: el robot de quien
// pregunta se queda quieto hasta que responde (o 15 s), los demás siguen. El puntaje lo calcula el
// servidor y entra al ranking de la clase.
//
// Arranque: con 3 o más alumnos, cuando alguno de la mesa (o el admin) pulsa «Empezar» o a los 20 s del
// tercero; con 2, a los 15 s del último ingreso; con 1, a los 25 s. Quien llega después entra en la
// siguiente ronda (su robot queda ausente en la que ya corre).

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	mrand "math/rand/v2"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	saltoNormal    = 0.3
	saltoTurbo     = 0.17
	saltoTriple    = 0.46
	tTurbo         = 5.0
	tTriple        = 6.0
	tMareo         = 1.6
	tAturdido      = 2.0
	vueloCohete    = 0.75
	vidaPoder      = 9.0
	tPregunta      = 15.0 // segundos que el robot espera la respuesta de su dueño
	humanosConCPU  = 4    // con menos alumnos que esto juega también la máquina
	tickMesa       = time.Second / 30
	fotoCada       = 2 // ticks entre fotos (15 por segundo)
	vidaMesaFin    = 40 * time.Second
	ausenteDespues = 8 * time.Second // sin navegador conectado: su robot pasa a la máquina
)

// humanosMesa: alumnos por mesa (MESA_HUMANOS, 16 por defecto). La máquina ocupa el asiento humanosMesa.
var humanosMesa = func() int {
	if n, err := strconv.Atoi(os.Getenv("MESA_HUMANOS")); err == nil && n >= 1 && n <= 24 {
		return n
	}
	return 16
}()

// Tiempos de la mesa (variables para que las pruebas los acorten).
var (
	cuentaMesa  = 4 * time.Second
	pausaRondas = 6 * time.Second
	esperaTres  = 20 * time.Second // con 3 o más, empieza a los 20 s del tercero (o con «Empezar»)
	esperaDos   = 15 * time.Second // con 2 alumnos sentados, empieza tras esta espera desde el último ingreso
	esperaUno   = 25 * time.Second // con 1, también (contra la máquina)
)

// segundosRonda: 45 s; MESA_SEGUNDOS lo acorta para las pruebas.
var segundosRonda = func() float64 {
	if n, err := strconv.Atoi(os.Getenv("MESA_SEGUNDOS")); err == nil && n >= 5 {
		return float64(n)
	}
	return 45
}()

var pesosPoder = []struct {
	tipo string
	peso float64
}{{"chip", 26}, {"cohete", 26}, {"turbo", 22}, {"triple", 18}, {"balde", 8}}
var dirs = map[string][2]int{"arriba": {0, -1}, "abajo": {0, 1}, "izquierda": {-1, 0}, "derecha": {1, 0}}

// ladoPara: tamaño del tablero según cuántos robots juegan.
func ladoPara(robots int) int {
	switch {
	case robots <= 4:
		return 9
	case robots <= 9:
		return 13
	default:
		return 17
	}
}

// salidas reparte k puntos de salida a lo largo del borde del tablero (empezando por una esquina).
func salidas(n, k int) [][2]int {
	var borde [][2]int
	for c := 0; c < n; c++ {
		borde = append(borde, [2]int{c, 0})
	}
	for f := 1; f < n; f++ {
		borde = append(borde, [2]int{n - 1, f})
	}
	for c := n - 2; c >= 0; c-- {
		borde = append(borde, [2]int{c, n - 1})
	}
	for f := n - 2; f >= 1; f-- {
		borde = append(borde, [2]int{0, f})
	}
	out := make([][2]int, k)
	for i := 0; i < k; i++ {
		out[i] = borde[(i*len(borde))/max(k, 1)]
	}
	return out
}

type robotM struct {
	ID        int     `json:"id"`
	Nombre    string  `json:"nombre,omitempty"`
	CPU       bool    `json:"cpu,omitempty"`
	Ausente   bool    `json:"ausente,omitempty"`
	C         int     `json:"c"`
	F         int     `json:"f"`
	DC        int     `json:"dc"`
	DF        int     `json:"df"`
	Fase      float64 `json:"fase"`
	Mareo     float64 `json:"mareo,omitempty"`
	Turbo     float64 `json:"turbo,omitempty"`
	Triple    float64 `json:"triple,omitempty"`
	Cohetes   int     `json:"cohetes,omitempty"`
	Pregunta  float64 `json:"pregunta,omitempty"` // >0: esperando la respuesta de su dueño
	maquina   bool    // robot de la máquina (no de un alumno desconectado)
	disparo   float64
	meta      *[2]int
	pendiente string // poder que espera la respuesta
}

type poderM struct {
	Tipo string  `json:"tipo"`
	C    int     `json:"c"`
	F    int     `json:"f"`
	Vida float64 `json:"vida"`
}

type vueloM struct {
	De int     `json:"de"`
	A  int     `json:"a"`
	T  float64 `json:"t"`
	C  int     `json:"c"`
	F  int     `json:"f"`
}

type tablero struct {
	T          float64
	N          int // lado
	Robots     []*robotM
	Dueno      []int8
	Valor      []int8
	Banco      []int
	Poderes    []*poderM
	Vuelos     []*vueloM
	Fin        bool
	maxPoderes int
	nivel      float64
	prox       float64
	baldes     int
	rnd        *mrand.Rand
	ev         []map[string]any
	mando      func(id int) [2]int
	tomar      func(id int, tipo string) // poder tomado por un alumno (la mesa decide si va con pregunta)
}

// MarshalJSON: foto compacta. Las casillas van en «cas»: un byte por casilla en base64, bits 0–4 = dueño + 1
// (0 = papel), bits 5–6 = valor (1 normal, 3 triple).
func (m *tablero) MarshalJSON() ([]byte, error) {
	b := make([]byte, len(m.Dueno))
	for k := range b {
		b[k] = byte(m.Dueno[k]+1) | byte(m.Valor[k])<<5
	}
	return json.Marshal(struct {
		T       float64   `json:"t"`
		N       int       `json:"n"`
		Robots  []*robotM `json:"robots"`
		Cas     string    `json:"cas"`
		Banco   []int     `json:"banco"`
		Poderes []*poderM `json:"poderes"`
		Vuelos  []*vueloM `json:"vuelos"`
		Fin     bool      `json:"fin"`
	}{m.T, m.N, m.Robots, base64.StdEncoding.EncodeToString(b), m.Banco, m.Poderes, m.Vuelos, m.Fin})
}

func (m *tablero) dentro(c, f int) bool { return c >= 0 && f >= 0 && c < m.N && f < m.N }
func distT(a, b, c, f int) int {
	return int(math.Abs(float64(a-c)) + math.Abs(float64(b-f)))
}

func (m *tablero) salto(r *robotM) float64 {
	if r.Turbo > 0 {
		return saltoTurbo
	}
	if r.Triple > 0 {
		return saltoTriple
	}
	return saltoNormal
}

func (m *tablero) ocupada(c, f, yo int) bool {
	for _, r := range m.Robots {
		if r.Ausente || r.ID == yo {
			continue
		}
		if (r.C == c && r.F == f) || (r.DC == c && r.DF == f) {
			return true
		}
	}
	return false
}

func (m *tablero) pintar(c, f, id, v int) {
	k := f*m.N + c
	if int(m.Dueno[k]) == id && int(m.Valor[k]) >= v {
		return
	}
	m.Dueno[k], m.Valor[k] = int8(id), int8(v)
	m.ev = append(m.ev, map[string]any{"tipo": "pintar", "c": c, "f": f, "id": id})
}

// conteo: total de cada robot (cobrado + pintado, las triples valen 3).
func (m *tablero) conteo() []int {
	n := make([]int, len(m.Robots))
	copy(n, m.Banco)
	for k, d := range m.Dueno {
		if d >= 0 {
			n[d] += int(m.Valor[k])
		}
	}
	return n
}

// lider: el que más tiene; -1 si hay empate arriba.
func (m *tablero) lider() int {
	n := m.conteo()
	mx, quien, empate := -1, -1, false
	for i, x := range n {
		if m.Robots[i].Ausente {
			continue
		}
		if x > mx {
			mx, quien, empate = x, i, false
		} else if x == mx {
			empate = true
		}
	}
	if empate {
		return -1
	}
	return quien
}

func (m *tablero) cobrar(id int) {
	r, n := m.Robots[id], 0
	for k, d := range m.Dueno {
		if int(d) == id {
			n += int(m.Valor[k])
			m.Dueno[k], m.Valor[k] = -1, 0
		}
	}
	m.Banco[id] += n
	m.ev = append(m.ev, map[string]any{"tipo": "cobro", "id": id, "c": r.C, "f": r.F, "n": n})
}

func (m *tablero) marear(id int, seg float64) {
	r := m.Robots[id]
	r.Mareo = math.Max(r.Mareo, seg)
	m.ev = append(m.ev, map[string]any{"tipo": "mareo", "id": id})
}

func (m *tablero) blanco(r *robotM) int {
	mejor, d := -1, math.Inf(1)
	for _, o := range m.Robots {
		if o.ID == r.ID || o.Ausente {
			continue
		}
		x := float64(distT(o.C, o.F, r.C, r.F)) + m.rnd.Float64()*0.5
		if o.Mareo > 0 {
			x += 20
		}
		if x < d {
			d, mejor = x, o.ID
		}
	}
	return mejor
}

func (m *tablero) disparar(id int) bool {
	r := m.Robots[id]
	if r.Cohetes < 1 || m.Fin {
		return false
	}
	a := m.blanco(r)
	if a < 0 {
		return false
	}
	r.Cohetes = 0
	m.Vuelos = append(m.Vuelos, &vueloM{De: id, A: a, C: r.C, F: r.F})
	m.ev = append(m.ev, map[string]any{"tipo": "lanzar", "id": id, "a": a})
	return true
}

func (m *tablero) aplicar(id int, tipo string) {
	r := m.Robots[id]
	switch tipo {
	case "chip":
		m.cobrar(id)
		return
	case "cohete":
		r.Cohetes, r.disparo = 1, 0.4+m.rnd.Float64()*1.1
	case "turbo":
		r.Turbo, r.Triple = tTurbo, 0
	case "triple":
		r.Triple, r.Turbo = tTriple, 0
	case "balde":
		for k := range m.Dueno {
			m.Dueno[k], m.Valor[k] = int8(id), 1
		}
	}
	m.ev = append(m.ev, map[string]any{"tipo": "poder", "id": id, "poder": tipo, "c": r.C, "f": r.F})
}

func (m *tablero) ponerPoder() {
	var libres [][2]int
	for f := 0; f < m.N; f++ {
		for c := 0; c < m.N; c++ {
			if m.ocupada(c, f, -1) {
				continue
			}
			lejos := true
			for _, r := range m.Robots {
				if !r.Ausente && distT(c, f, r.C, r.F) < 2 {
					lejos = false
				}
			}
			for _, p := range m.Poderes {
				if p.C == c && p.F == f {
					lejos = false
				}
			}
			if lejos {
				libres = append(libres, [2]int{c, f})
			}
		}
	}
	if len(libres) == 0 {
		return
	}
	total := 0.0
	for _, p := range pesosPoder {
		if p.tipo != "balde" || (m.baldes < 1 && m.T > 10) {
			total += p.peso
		}
	}
	x, tipo := m.rnd.Float64()*total, "chip"
	for _, p := range pesosPoder {
		if p.tipo == "balde" && !(m.baldes < 1 && m.T > 10) {
			continue
		}
		if x -= p.peso; x <= 0 {
			tipo = p.tipo
			break
		}
	}
	if tipo == "balde" {
		m.baldes++
	}
	cf := libres[m.rnd.IntN(len(libres))]
	m.Poderes = append(m.Poderes, &poderM{Tipo: tipo, C: cf[0], F: cf[1], Vida: vidaPoder})
	m.ev = append(m.ev, map[string]any{"tipo": "poderNuevo", "poder": tipo, "c": cf[0], "f": cf[1]})
}

// decidir: el robot de la máquina va a un poder cercano o a una casilla que no sea suya, mejor si es del líder.
func (m *tablero) decidir(r *robotM) [2]int {
	rnd := m.rnd
	todas := [][2]int{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}
	if rnd.Float64() > 0.55+m.nivel*0.45 {
		return todas[rnd.IntN(4)]
	}
	var meta *[2]int
	var cerca *poderM
	dc := 1 << 30
	for _, p := range m.Poderes {
		if d := distT(p.C, p.F, r.C, r.F); d < dc {
			dc, cerca = d, p
		}
	}
	if cerca != nil && float64(dc) <= 3+m.nivel*5 && rnd.Float64() < m.nivel+0.2 {
		meta = &[2]int{cerca.C, cerca.F}
	} else {
		vale := r.meta != nil && int(m.Dueno[r.meta[1]*m.N+r.meta[0]]) != r.ID && !(r.meta[0] == r.C && r.meta[1] == r.F)
		if !vale || rnd.Float64() < 0.08 {
			lid := m.lider()
			var mejor *[2]int
			puntos := math.Inf(1)
			for k := 0; k < 14; k++ {
				c, f := rnd.IntN(m.N), rnd.IntN(m.N)
				d := int(m.Dueno[f*m.N+c])
				if d == r.ID {
					continue
				}
				p := float64(distT(c, f, r.C, r.F)) + rnd.Float64()*1.2
				if d == lid && lid >= 0 && lid != r.ID {
					p -= 1.5
				}
				if d >= 0 {
					p -= 0.4 * float64(m.Valor[f*m.N+c])
				}
				if p < puntos {
					puntos, mejor = p, &[2]int{c, f}
				}
			}
			r.meta = mejor
		}
		meta = r.meta
	}
	if meta == nil {
		return [2]int{}
	}
	dx, dy := sign(meta[0]-r.C), sign(meta[1]-r.F)
	var ops [][2]int
	if dx != 0 {
		ops = append(ops, [2]int{dx, 0})
	}
	if dy != 0 {
		ops = append(ops, [2]int{0, dy})
	}
	if len(ops) == 2 && rnd.Float64() < 0.5 {
		ops[0], ops[1] = ops[1], ops[0]
	}
	for _, o := range ops {
		if !m.ocupada(r.C+o[0], r.F+o[1], r.ID) {
			return o
		}
	}
	lado := 1
	if rnd.Float64() < 0.5 {
		lado = -1
	}
	if dx != 0 {
		return [2]int{0, lado}
	}
	return [2]int{lado, 0}
}

func sign(x int) int {
	if x > 0 {
		return 1
	}
	if x < 0 {
		return -1
	}
	return 0
}

func (m *tablero) paso(dt float64) {
	if m.Fin {
		return
	}
	m.T += dt
	vivos := m.Poderes[:0]
	for _, p := range m.Poderes {
		if p.Vida -= dt; p.Vida > 0 {
			vivos = append(vivos, p)
		} else {
			m.ev = append(m.ev, map[string]any{"tipo": "poderFuera", "poder": p.Tipo, "c": p.C, "f": p.F})
		}
	}
	m.Poderes = vivos
	if len(m.Poderes) < m.maxPoderes {
		if m.prox -= dt; m.prox <= 0 && m.T < segundosRonda-3 {
			m.ponerPoder()
			m.prox = 2.5 + m.rnd.Float64()*2.5
		}
	}
	quedan := m.Vuelos[:0]
	for _, v := range m.Vuelos {
		if v.T += dt; v.T < vueloCohete {
			quedan = append(quedan, v)
			continue
		}
		o := m.Robots[v.A]
		o.Mareo = math.Max(o.Mareo, tAturdido)
		m.ev = append(m.ev, map[string]any{"tipo": "impacto", "id": v.A, "de": v.De, "c": o.C, "f": o.F})
	}
	m.Vuelos = quedan
	for _, r := range m.Robots {
		if r.Ausente {
			continue
		}
		r.Mareo = math.Max(0, r.Mareo-dt)
		r.Turbo = math.Max(0, r.Turbo-dt)
		r.Triple = math.Max(0, r.Triple-dt)
		if r.Pregunta > 0 {
			if r.Pregunta -= dt; r.Pregunta <= 0 {
				r.Pregunta, r.pendiente = 0, ""
				m.marear(r.ID, tMareo)
			}
		}
		if r.CPU && r.Cohetes > 0 {
			if r.disparo -= dt; r.disparo <= 0 {
				m.disparar(r.ID)
			}
		}
		r.Fase += dt / m.salto(r)
		if r.Fase < 1 {
			continue
		}
		r.Fase -= math.Floor(r.Fase)
		r.C, r.F = r.DC, r.DF
		v := 1
		if r.Triple > 0 {
			v = 3
		}
		m.pintar(r.C, r.F, r.ID, v)
		m.ev = append(m.ev, map[string]any{"tipo": "salto", "id": r.ID})
		for k, p := range m.Poderes {
			if p.C == r.C && p.F == r.F {
				m.Poderes = append(m.Poderes[:k], m.Poderes[k+1:]...)
				m.ev = append(m.ev, map[string]any{"tipo": "tomar", "id": r.ID, "poder": p.Tipo, "c": r.C, "f": r.F})
				if r.CPU {
					if m.rnd.Float64() < 0.5 && m.rnd.Float64() > 0.5+m.nivel*0.4 {
						m.marear(r.ID, tMareo)
					} else {
						m.aplicar(r.ID, p.Tipo)
					}
				} else if m.tomar != nil {
					m.tomar(r.ID, p.Tipo)
				}
				break
			}
		}
		var d [2]int
		if r.Mareo <= 0 && r.Pregunta <= 0 {
			if r.CPU {
				d = m.decidir(r)
			} else if m.mando != nil {
				d = m.mando(r.ID)
			}
		}
		if d == [2]int{} {
			continue
		}
		c, f := r.C+d[0], r.F+d[1]
		if !m.dentro(c, f) {
			continue
		}
		if m.ocupada(c, f, r.ID) {
			m.ev = append(m.ev, map[string]any{"tipo": "choque", "id": r.ID, "c": c, "f": f})
			continue
		}
		r.DC, r.DF = c, f
	}
	if m.T >= segundosRonda {
		m.Fin = true
	}
}

// ---------------------------------------------------------------------------
// La mesa: asientos, rondas y conexiones.

type asiento struct {
	Jugador   int    // ID del jugador
	Token     string // token del alumno
	Nombre    string
	Partida   string
	entra     int    // primera ronda que juega (quien llega tarde entra en la siguiente)
	sostiene  string // dirección apretada
	pulso     string // toque corto, se usa en el próximo rebote
	conectado int
	visto     time.Time
	bolsa     []bool // de los 6 primeros poderes, cuáles van con pregunta
	preguntas int    // preguntas en la ronda
	ganadas   int
	casillas  int
}

type mesa struct {
	mu       sync.Mutex
	ID       string
	Estado   string // esperando | cuenta | jugando | pausa | fin
	Ronda    int
	asientos []*asiento // alumnos; la máquina usa el índice humanosMesa
	m        *tablero
	creada   time.Time
	desde    time.Time // inicio del estado actual
	ingreso  time.Time // último ingreso
	tercero  time.Time // cuándo se sentó el tercero
	empezar  bool      // alguien pulsó «Empezar»
	subs     map[chan []byte]int
	ev       []map[string]any
	final    []map[string]any
	s        *Servidor
	rnd      *mrand.Rand
}

type mesas struct {
	mu sync.Mutex
	m  map[string]*mesa
}

func (s *Servidor) lasMesas() *mesas {
	s.mesasUna.Do(func() { s.mesas = &mesas{m: map[string]*mesa{}} })
	return s.mesas
}

func (ms *mesa) humanos() int {
	n := 0
	for _, a := range ms.asientos {
		if a != nil && a.Jugador > 0 {
			n++
		}
	}
	return n
}

// sentar agrega un asiento. Con ms.mu tomado.
func (ms *mesa) sentar(jid int, token, nombre string) int {
	ahora := time.Now()
	ms.asientos = append(ms.asientos, &asiento{Jugador: jid, Token: token, Nombre: nombre, visto: ahora, entra: ms.Ronda + 1})
	ms.ingreso = ahora
	if ms.humanos() == 3 {
		ms.tercero = ahora
	}
	return len(ms.asientos) - 1
}

// listaParaEmpezar: reglas de arranque de la mesa en espera. Devuelve también cuántos segundos faltan (-1 = sin reloj).
func (ms *mesa) listaParaEmpezar(ahora time.Time) (bool, float64) {
	h := ms.humanos()
	switch {
	case h >= 3:
		if ms.empezar {
			return true, 0
		}
		falta := esperaTres - ahora.Sub(ms.tercero)
		return falta <= 0, falta.Seconds()
	case h == 2:
		falta := esperaDos - ahora.Sub(ms.ingreso)
		return falta <= 0, falta.Seconds()
	case h == 1:
		falta := esperaUno - ahora.Sub(ms.creada)
		return falta <= 0, falta.Seconds()
	}
	return false, -1
}

func nuevaBolsa(r *mrand.Rand) []bool {
	for {
		b := []bool{true, true, true, false, false, false}
		r.Shuffle(len(b), func(i, j int) { b[i], b[j] = b[j], b[i] })
		ok := true
		for i := 2; i < len(b); i++ {
			if b[i] == b[i-1] && b[i] == b[i-2] {
				ok = false
			}
		}
		if ok {
			return b
		}
	}
}

// empezarRonda arma el tablero: un robot por asiento (ausente si llegó tarde), la máquina en el asiento
// humanosMesa si hay menos de 4 alumnos, y el lado del tablero según cuántos juegan. Se llama con ms.mu tomado.
func (ms *mesa) empezarRonda() {
	ms.Ronda++
	ms.crearPartidas()
	juegan := 0
	for _, a := range ms.asientos {
		if a != nil && a.Jugador > 0 && a.entra <= ms.Ronda {
			juegan++
		}
	}
	cpu := juegan < humanosConCPU
	if cpu {
		juegan++
	}
	n := ladoPara(juegan)
	total := humanosMesa + 1
	m := &tablero{N: n, Dueno: make([]int8, n*n), Valor: make([]int8, n*n), Banco: make([]int, total), Robots: make([]*robotM, total),
		Poderes: []*poderM{}, Vuelos: []*vueloM{}, maxPoderes: max(2, (juegan+3)/4),
		nivel: []float64{0.55, 0.68, 0.8}[min(ms.Ronda, 3)-1], prox: 2.5 + ms.rnd.Float64()*2, rnd: ms.rnd}
	for k := range m.Dueno {
		m.Dueno[k] = -1
	}
	puestos := salidas(n, juegan)
	p := 0
	for i := 0; i < total; i++ {
		r := &robotM{ID: i, Ausente: true}
		var a *asiento
		if i < len(ms.asientos) {
			a = ms.asientos[i]
		}
		switch {
		case a != nil && a.Jugador > 0 && a.entra <= ms.Ronda:
			r.Ausente = false
			r.Nombre = primerNombre(a.Nombre)
			r.CPU = a.conectado == 0 && time.Since(a.visto) > ausenteDespues
			a.bolsa, a.preguntas = nuevaBolsa(ms.rnd), 0
		case i == humanosMesa && cpu:
			r.Ausente, r.CPU, r.maquina, r.Nombre = false, true, true, "Bit"
		}
		if !r.Ausente {
			r.C, r.F = puestos[p][0], puestos[p][1]
			r.DC, r.DF, r.Fase = r.C, r.F, ms.rnd.Float64()*0.6
			m.Dueno[r.F*n+r.C], m.Valor[r.F*n+r.C] = int8(i), 1
			p++
		}
		m.Robots[i] = r
	}
	m.mando = func(id int) [2]int {
		if id >= len(ms.asientos) || ms.asientos[id] == nil {
			return [2]int{}
		}
		a := ms.asientos[id]
		d := a.sostiene
		if d == "" {
			d = a.pulso
		}
		a.pulso = ""
		return dirs[d]
	}
	m.tomar = func(id int, tipo string) {
		if id >= len(ms.asientos) || ms.asientos[id] == nil {
			m.aplicar(id, tipo)
			return
		}
		a := ms.asientos[id]
		conPregunta := len(a.bolsa) > 0 && a.bolsa[0] && a.preguntas < chipsPorRonda
		if len(a.bolsa) > 0 {
			a.bolsa = a.bolsa[1:]
		}
		if !conPregunta {
			m.aplicar(id, tipo)
			return
		}
		a.preguntas++
		r := m.Robots[id]
		r.Pregunta, r.pendiente = tPregunta, tipo
		m.ev = append(m.ev, map[string]any{"tipo": "pregunta", "id": id, "poder": tipo, "ronda": ms.Ronda, "partida": a.Partida})
	}
	ms.m = m
	ms.Estado, ms.desde = "jugando", time.Now()
}

func primerNombre(n string) string {
	if f := strings.Fields(n); len(f) > 0 {
		r := []rune(f[0])
		if len(r) > 12 {
			r = r[:12]
		}
		return string(r)
	}
	return "Alumno"
}

// vivir: el reloj de la mesa. Corre en su propia goroutine hasta que la mesa termina.
func (ms *mesa) vivir() {
	t := time.NewTicker(tickMesa)
	defer t.Stop()
	for n := 0; ; n++ {
		<-t.C
		ms.mu.Lock()
		ahora := time.Now()
		switch ms.Estado {
		case "esperando":
			if lista, _ := ms.listaParaEmpezar(ahora); lista {
				ms.Estado, ms.desde = "cuenta", ahora
				ms.crearPartidas()
			} else if ms.humanos() == 0 && ahora.Sub(ms.creada) > time.Minute {
				ms.Estado, ms.desde = "fin", ahora
			}
		case "cuenta":
			if ahora.Sub(ms.desde) >= cuentaMesa {
				ms.empezarRonda()
			}
		case "jugando":
			for i, a := range ms.asientos {
				if a != nil && a.Jugador > 0 && i < len(ms.m.Robots) && !ms.m.Robots[i].Ausente && !ms.m.Robots[i].maquina {
					// sin navegador conectado un rato, su robot juega solo (y vuelve a él si regresa)
					ms.m.Robots[i].CPU = a.conectado == 0 && ahora.Sub(a.visto) > ausenteDespues
				}
			}
			ms.m.paso(tickMesa.Seconds())
			ms.ev = append(ms.ev, ms.m.ev...)
			ms.m.ev = ms.m.ev[:0]
			if ms.m.Fin {
				ms.cerrarRonda()
			}
		case "pausa":
			if ahora.Sub(ms.desde) >= pausaRondas {
				ms.empezarRonda()
			}
		case "fin":
			if ahora.Sub(ms.desde) > vidaMesaFin {
				ms.mu.Unlock()
				ms.s.lasMesas().quitar(ms.ID)
				return
			}
		}
		if n%fotoCada == 0 {
			ms.enviarFoto()
		}
		ms.mu.Unlock()
	}
}

func (mm *mesas) quitar(id string) {
	mm.mu.Lock()
	defer mm.mu.Unlock()
	delete(mm.m, id)
}

// cerrarRonda suma la ronda a cada asiento y pasa a la pausa o al final.
func (ms *mesa) cerrarRonda() {
	n, lid := ms.m.conteo(), ms.m.lider()
	res := make([]map[string]any, 0, len(ms.m.Robots))
	for i, r := range ms.m.Robots {
		if r.Ausente {
			continue
		}
		if i < len(ms.asientos) && ms.asientos[i] != nil && ms.asientos[i].Jugador > 0 && !r.maquina {
			a := ms.asientos[i]
			a.casillas += n[i]
			if lid == i {
				a.ganadas++
			}
		}
		res = append(res, map[string]any{"id": i, "nombre": r.Nombre, "casillas": n[i], "gano": lid == i})
	}
	ms.ev = append(ms.ev, map[string]any{"tipo": "finRonda", "ronda": ms.Ronda, "lider": lid, "resultados": res})
	if ms.Ronda >= rondasPorPartida {
		ms.Estado, ms.desde = "fin", time.Now()
		ms.final = ms.guardarPartidas()
		return
	}
	ms.Estado, ms.desde = "pausa", time.Now()
}

// crearPartidas abre una partida para cada alumno que aún no la tiene (para las preguntas y el ranking).
// Con ms.mu tomado; toma s.mu.
func (ms *mesa) crearPartidas() {
	s := ms.s
	s.mu.Lock()
	defer s.mu.Unlock()
	cambio := false
	for _, a := range ms.asientos {
		if a == nil || a.Jugador == 0 || a.Partida != "" {
			continue
		}
		i := s.jugador(a.Token)
		if i < 0 {
			continue
		}
		j := &s.e.Jugadores[i]
		if p := enCurso(j); p != nil {
			p.Estado, p.Fin = "abandonada", s.ahora().UTC()
		}
		p := Partida{ID: nuevoToken()[:16], Inicio: s.ahora().UTC(), Estado: "jugando", Preguntas: []Emitida{}}
		j.Partidas = append(j.Partidas, p)
		a.Partida = p.ID
		cambio = true
	}
	if cambio {
		s.guardar()
	}
}

// guardarPartidas cierra la partida de cada alumno con lo que contó el servidor y devuelve el resumen final.
func (ms *mesa) guardarPartidas() []map[string]any {
	s := ms.s
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []map[string]any{}
	for i, a := range ms.asientos {
		if a == nil || a.Jugador == 0 {
			continue
		}
		fila := map[string]any{"id": i, "nombre": a.Nombre, "rondas": a.ganadas, "casillas": a.casillas}
		if k := s.jugador(a.Token); k >= 0 {
			j := &s.e.Jugadores[k]
			if p := partidaDe(j, a.Partida); p != nil && p.Estado == "jugando" {
				s.caducarPregunta(p)
				p.Fin, p.Rondas, p.Casillas = s.ahora().UTC(), a.ganadas, a.casillas
				p.Puntos = puntaje(p.Rondas, p.Casillas, p.Aciertos)
				p.Estado = "terminada"
				s.e.Partidas++
				if !j.Jugo || p.Puntos > j.Mejor {
					j.Mejor, j.MejorRondas, j.MejorEn = p.Puntos, p.Rondas, p.Fin
				}
				j.Jugo = true
				fila["aciertos"], fila["puntos"] = p.Aciertos, p.Puntos
			}
		}
		out = append(out, fila)
	}
	s.guardar()
	return out
}

// enviarFoto manda a cada navegador el estado (y los eventos desde la última foto). Con ms.mu tomado.
func (ms *mesa) enviarFoto() {
	nombres := make([]map[string]any, humanosMesa+1)
	for i, a := range ms.asientos {
		if a != nil && a.Jugador > 0 {
			nombres[i] = map[string]any{"nombre": primerNombre(a.Nombre), "alumno": true, "conectado": a.conectado > 0, "entra": a.entra}
		}
	}
	if ms.m != nil && ms.m.Robots[humanosMesa] != nil && !ms.m.Robots[humanosMesa].Ausente {
		nombres[humanosMesa] = map[string]any{"nombre": ms.m.Robots[humanosMesa].Nombre, "maquina": true}
	}
	foto := map[string]any{"mesa": ms.ID, "estado": ms.Estado, "ronda": ms.Ronda, "rondas": rondasPorPartida, "max": humanosMesa,
		"asientos": nombres, "humanos": ms.humanos(), "ev": ms.ev, "segundos_ronda": segundosRonda}
	switch ms.Estado {
	case "esperando":
		_, falta := ms.listaParaEmpezar(time.Now())
		foto["espera"] = time.Since(ms.creada).Seconds()
		foto["falta"] = math.Max(0, falta)
	case "cuenta", "pausa":
		foto["falta"] = (map[string]time.Duration{"cuenta": cuentaMesa, "pausa": pausaRondas}[ms.Estado] - time.Since(ms.desde)).Seconds()
	}
	if ms.m != nil {
		foto["m"] = ms.m
	}
	if ms.final != nil {
		foto["final"] = ms.final
	}
	b, err := json.Marshal(foto)
	ms.ev = ms.ev[:0]
	if err != nil {
		return
	}
	for ch := range ms.subs {
		select {
		case ch <- b:
		default: // navegador lento: se salta esta foto
		}
	}
}

// ---------------------------------------------------------------------------
// HTTP (solo sala de clase).

func (s *Servidor) rutasMesa(mux *http.ServeMux) {
	alumno := func(w http.ResponseWriter, token string) (int, string, bool) {
		if !s.clase {
			fallo(w, 404, "Las mesas en vivo son de la sala de clase.")
			return 0, "", false
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		i := s.jugador(token)
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return 0, "", false
		}
		return s.e.Jugadores[i].ID, s.e.Jugadores[i].Nombre, true
	}
	buscar := func(w http.ResponseWriter, id string) *mesa {
		mm := s.lasMesas()
		mm.mu.Lock()
		defer mm.mu.Unlock()
		ms := mm.m[id]
		if ms == nil {
			fallo(w, 404, "Esa mesa ya terminó.")
		}
		return ms
	}
	asientoDe := func(ms *mesa, jugador int) int {
		for i, a := range ms.asientos {
			if a != nil && a.Jugador == jugador {
				return i
			}
		}
		return -1
	}

	// Sentarse: vuelve a su mesa si ya está en una que no terminó; si no, a la mesa viva con sitio (toda la
	// clase en una: quien llega con la ronda en curso entra en la siguiente); si no hay, una nueva.
	mux.HandleFunc("POST /api/mesa/unirse", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		jid, nombre, ok := alumno(w, in.Token)
		if !ok {
			return
		}
		mm := s.lasMesas()
		mm.mu.Lock()
		defer mm.mu.Unlock()
		for _, ms := range mm.m {
			ms.mu.Lock()
			k := asientoDe(ms, jid)
			if k >= 0 && ms.Estado != "fin" {
				ms.mu.Unlock()
				responder(w, 200, map[string]any{"mesa": ms.ID, "asiento": k, "entra": ms.asientos[k].entra, "ronda": ms.Ronda})
				return
			}
			ms.mu.Unlock()
		}
		var mejor *mesa
		for _, ms := range mm.m {
			ms.mu.Lock()
			if ms.Estado != "fin" && ms.humanos() < humanosMesa && (mejor == nil || ms.Estado == "esperando" && mejor.Estado != "esperando") {
				mejor = ms
			}
			ms.mu.Unlock()
		}
		if mejor != nil {
			mejor.mu.Lock()
			k := mejor.sentar(jid, in.Token, nombre)
			if mejor.Estado != "esperando" {
				mejor.crearPartidas()
			}
			out := map[string]any{"mesa": mejor.ID, "asiento": k, "entra": mejor.asientos[k].entra, "ronda": mejor.Ronda}
			mejor.mu.Unlock()
			responder(w, 200, out)
			return
		}
		ms := &mesa{ID: nuevoToken()[:10], Estado: "esperando", creada: time.Now(), subs: map[chan []byte]int{}, s: s,
			rnd: mrand.New(mrand.NewPCG(uint64(time.Now().UnixNano()), uint64(len(mm.m)+1)))}
		ms.sentar(jid, in.Token, nombre)
		mm.m[ms.ID] = ms
		go ms.vivir()
		responder(w, 200, map[string]any{"mesa": ms.ID, "asiento": 0, "entra": 1, "ronda": 0})
	})

	// Empezar ya: con 3 o más sentados, cualquiera de la mesa (o el admin con X-Clave) arranca sin esperar.
	mux.HandleFunc("POST /api/mesa/empezar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
			Mesa  string `json:"mesa"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		admin := s.esAdmin(r)
		jid := 0
		if !admin {
			var ok bool
			if jid, _, ok = alumno(w, in.Token); !ok {
				return
			}
		}
		ms := buscar(w, in.Mesa)
		if ms == nil {
			return
		}
		ms.mu.Lock()
		defer ms.mu.Unlock()
		if !admin && asientoDe(ms, jid) < 0 {
			fallo(w, 403, "No estás en esa mesa.")
			return
		}
		if ms.Estado != "esperando" {
			responder(w, 200, map[string]any{"estado": ms.Estado})
			return
		}
		if ms.humanos() < 3 {
			fallo(w, 409, "Hacen falta al menos 3 en la mesa para empezar ya.")
			return
		}
		ms.empezar = true
		responder(w, 200, map[string]any{"estado": "cuenta"})
	})

	// Fotos de la mesa por SSE.
	mux.HandleFunc("GET /api/mesa/fotos", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		jid, _, ok := alumno(w, q.Get("t"))
		if !ok {
			return
		}
		ms := buscar(w, q.Get("mesa"))
		if ms == nil {
			return
		}
		fl, ok := w.(http.Flusher)
		if !ok {
			fallo(w, 500, "Sin streaming.")
			return
		}
		ch := make(chan []byte, 8)
		ms.mu.Lock()
		k := asientoDe(ms, jid)
		if k < 0 {
			ms.mu.Unlock()
			fallo(w, 403, "No estás en esa mesa.")
			return
		}
		ms.subs[ch] = k
		ms.asientos[k].conectado++
		ms.asientos[k].visto = time.Now()
		ms.mu.Unlock()
		defer func() {
			ms.mu.Lock()
			delete(ms.subs, ch)
			ms.asientos[k].conectado--
			ms.asientos[k].visto = time.Now()
			ms.mu.Unlock()
		}()
		h := w.Header()
		h.Set("Content-Type", "text/event-stream")
		h.Set("Cache-Control", "no-store")
		h.Set("X-Accel-Buffering", "no")
		w.WriteHeader(200)
		fmt.Fprintf(w, "event: hola\ndata: {\"asiento\":%d}\n\n", k)
		fl.Flush()
		for {
			select {
			case <-r.Context().Done():
				return
			case b := <-ch:
				if _, err := fmt.Fprintf(w, "data: %s\n\n", b); err != nil {
					return
				}
				fl.Flush()
			}
		}
	})

	// Mando: dirección apretada (dir, "" al soltar), un toque corto (pulso) o lanzar el cohete.
	mux.HandleFunc("POST /api/mesa/mando", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token    string  `json:"t"`
			Mesa     string  `json:"mesa"`
			Dir      *string `json:"dir"`
			Pulso    string  `json:"pulso"`
			Disparar bool    `json:"disparar"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		jid, _, ok := alumno(w, in.Token)
		if !ok {
			return
		}
		ms := buscar(w, in.Mesa)
		if ms == nil {
			return
		}
		ms.mu.Lock()
		defer ms.mu.Unlock()
		k := asientoDe(ms, jid)
		if k < 0 {
			fallo(w, 403, "No estás en esa mesa.")
			return
		}
		a := ms.asientos[k]
		a.visto = time.Now()
		if in.Dir != nil {
			if _, ok := dirs[*in.Dir]; ok || *in.Dir == "" {
				a.sostiene = *in.Dir
			}
		}
		if _, ok := dirs[in.Pulso]; ok {
			a.pulso = in.Pulso
		}
		if in.Disparar && ms.Estado == "jugando" && ms.m != nil && k < len(ms.m.Robots) && !ms.m.Robots[k].Ausente {
			ms.m.disparar(k)
		}
		w.WriteHeader(204)
	})

	// Resolver la pregunta del poder: el servidor mira si la última pregunta de la partida del alumno se acertó.
	mux.HandleFunc("POST /api/mesa/resolver", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
			Mesa  string `json:"mesa"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		jid, _, ok := alumno(w, in.Token)
		if !ok {
			return
		}
		ms := buscar(w, in.Mesa)
		if ms == nil {
			return
		}
		ms.mu.Lock()
		k := asientoDe(ms, jid)
		partida := ""
		if k >= 0 {
			partida = ms.asientos[k].Partida
		}
		ms.mu.Unlock()
		if k < 0 {
			fallo(w, 403, "No estás en esa mesa.")
			return
		}
		acierto := false
		s.mu.Lock()
		if i := s.jugador(in.Token); i >= 0 {
			if p := partidaDe(&s.e.Jugadores[i], partida); p != nil && len(p.Preguntas) > 0 {
				q := p.Preguntas[len(p.Preguntas)-1]
				acierto = q.Respuesta && q.Acierto
			}
		}
		s.mu.Unlock()
		ms.mu.Lock()
		defer ms.mu.Unlock()
		if ms.m == nil || ms.Estado != "jugando" || k >= len(ms.m.Robots) {
			responder(w, 200, map[string]any{"acierto": acierto})
			return
		}
		rb := ms.m.Robots[k]
		if rb.Pregunta > 0 {
			tipo := rb.pendiente
			rb.Pregunta, rb.pendiente = 0, ""
			if acierto {
				ms.m.aplicar(k, tipo)
			} else {
				ms.m.marear(k, tMareo)
			}
			ms.ev = append(ms.ev, ms.m.ev...)
			ms.m.ev = ms.m.ev[:0]
		}
		responder(w, 200, map[string]any{"acierto": acierto})
	})
}
