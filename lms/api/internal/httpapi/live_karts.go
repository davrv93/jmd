package httpapi

import (
	"math"
	"math/rand/v2"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// Karts del arpa: carrera de karts multijugador del modo LIVE (hasta 20 pilotos, el instructor también
// corre), en memoria y por lección. La pista es el arpa del logo de JMD Learning flotando en el espacio.
//
//	GET  /api/v1/live/{lesson}/karts             estado legible: sala, pilotos y puestos (vestíbulo y podio)
//	POST /api/v1/live/{lesson}/karts/unir        {"color":3} → entra a la sala o cambia de color (máx. 20)
//	POST /api/v1/live/{lesson}/karts/salir       deja la sala (solo en el vestíbulo)
//	POST /api/v1/live/{lesson}/karts/tick        estado propio (~8 Hz) → todos los karts, eventos y obstáculos
//	POST /api/v1/live/{lesson}/karts/iniciar     (staff) cuenta atrás y salida común
//	POST /api/v1/live/{lesson}/karts/reiniciar   (staff) vuelve al vestíbulo con los pilotos presentes
//
// Cada cliente simula su propio kart y manda en un solo POST su posición, rumbo, velocidad y avance (en
// vueltas); la respuesta trae a todos los demás. Una petición por tick y nada más: a 20 pilotos y 8 Hz son
// ~160 peticiones por segundo de ~1 KB. El servidor es dueño de lo que importa para el resultado: la
// salida, las vueltas (con tope de velocidad, así que nadie se teletransporta a la meta), el tiempo de
// llegada, qué poder sale de cada caja (según el puesto) y quién golpeó a quién.

const (
	kartsMax        = 20
	kartsVueltas    = 3
	kartsCuenta     = 5 * time.Second  // de «Iniciar carrera» a la salida (vuelo de cámara + 3, 2, 1)
	kartsLimite     = 6 * time.Minute  // tope duro de una carrera
	kartsCierre     = 45 * time.Second // tras el primero en llegar, los demás tienen esto para terminar
	kartsAusente    = 12 * time.Second // sin ticks: deja de contar para «llegaron todos»
	kartsLobbyFuera = 30 * time.Second // en el vestíbulo, quien no se ve en este tiempo sale de la sala
	kartsCoordMax   = 3000.0           // la pista entra holgada en ±3000
	kartsVMax       = 110.0            // velocidad máxima creíble (con turbo y cuerda)
	kartsRitmoMax   = 1.0 / 16         // vueltas por segundo: nadie da una vuelta en menos de 16 s
	kartsHolgura    = 0.02             // vueltas de margen por fluctuación de red
	kartsColores    = 20
	kartsMaxEvent   = 64
	kartsMaxObs     = 36
	kartsObsVida    = 30 * time.Second
	kartsCajaCada   = 1500 * time.Millisecond
	kartsGolpeDist  = 10.0 // unidades: margen por la latencia entre lo que ve el atacante y lo guardado
	kartsGolpeCada  = 1200 * time.Millisecond
	kartsCliCalla   = 2 * time.Second // la pestaña dueña dejó de mandar ticks (se recargó o se cerró)
)

// Poderes «relacionados con Claude». El id viaja por la red; el nombre visible lo pone la escena.
const (
	pwNada      = ""
	pwCache     = "cache"     // Caché de prompts: turbo
	pwSubagente = "subagente" // Subagente: busca al líder y lo frena
	pwCompactar = "compactar" // Compactar contexto: escudo que quita los frenos
	pwHaiku     = "haiku"     // Haiku: ligero y rápido
	pwOpus      = "opus"      // Opus: pesado, empuja a los demás
	pwTokens    = "tokens"    // Lluvia de tokens: obstáculos detrás
	pwPlan      = "plan"      // Modo plan: muestra la mejor línea
)

// kartsPoderes: el orden fija el código numérico que va en cada kart del tick (0 = ninguno).
var kartsPoderes = []string{pwNada, pwCache, pwSubagente, pwCompactar, pwHaiku, pwOpus, pwTokens, pwPlan}

var kartsDuracion = map[string]time.Duration{
	pwCache: 2500 * time.Millisecond, pwCompactar: 5 * time.Second, pwHaiku: 5 * time.Second,
	pwOpus: 5 * time.Second, pwPlan: 8 * time.Second, pwSubagente: 400 * time.Millisecond, pwTokens: 400 * time.Millisecond,
}

// Pesos por tramo del pelotón: adelante salen defensas, atrás salen los que remontan.
var kartsPesos = [3]map[string]int{
	{pwCache: 3, pwCompactar: 3, pwTokens: 4, pwHaiku: 2, pwPlan: 1, pwOpus: 1},
	{pwCache: 3, pwCompactar: 2, pwTokens: 2, pwHaiku: 2, pwPlan: 1, pwSubagente: 2, pwOpus: 2},
	{pwCache: 3, pwCompactar: 1, pwTokens: 1, pwHaiku: 2, pwPlan: 2, pwSubagente: 3, pwOpus: 3},
}

var kartsCuota = cuota{cap: 40, porSeg: 20} // por usuario, entre GET y tick (dos pestañas a 8 Hz caben)

type piloto struct {
	N      int // número estable dentro de la sala (va en lugar del id en cada tick)
	ID     string
	Nombre string
	Color  int
	Staff  bool
	Cli    string    // pestaña que maneja el kart (otra pestaña solo mira)
	CliT   time.Time // último tick de esa pestaña: si calla, la recarga toma el control sola
	Grilla int       // casilla de salida

	X, Z, A, V float64
	P          float64   // avance en vueltas (0 → 3)
	PT         time.Time // cuándo se aceptó P por última vez (tope de ritmo)
	FinMs      int64     // ms desde la salida; 0 = no llegó
	Visto      time.Time
	TS         time.Time // último estado recibido

	Poder  string    // en la mano
	Activo string    // en uso
	Hasta  time.Time // fin del poder en uso
	CajaT  time.Time
	GolpeT time.Time // último golpe recibido
}

type kartEvento struct {
	ID int    `json:"id"`
	Tp string `json:"tp"` // poder | golpe | choque | bloqueo | meta
	De int    `json:"de"` // número de piloto (-1 = nadie)
	A  int    `json:"a"`
	Pw string `json:"pw,omitempty"`
	Ms int64  `json:"ms,omitempty"` // subagente: ms hasta el impacto; meta: tiempo de llegada
	T  int64  `json:"t"`            // hora del servidor (ms)
}

type kartObs struct {
	ID  int
	X   float64
	Z   float64
	De  int
	Exp time.Time
}

type salaKarts struct {
	mu     sync.Mutex
	Estado string // lobby | cuenta | corre | fin
	Salida time.Time
	Fin1   time.Time // llegó el primero
	Pil    map[string]*piloto
	sigN   int
	Rv     int // versión de la lista de pilotos (nombres, colores)
	Ev     []kartEvento
	sigEv  int
	Obs    []kartObs
	Ov     int
	sigObs int
	cuotas map[string]*cubeta
}

var salasKarts = struct {
	sync.Mutex
	m map[string]*salaKarts
}{m: map[string]*salaKarts{}}

func salaKartsDe(leccion string) *salaKarts {
	salasKarts.Lock()
	defer salasKarts.Unlock()
	s := salasKarts.m[leccion]
	if s == nil {
		s = &salaKarts{Estado: "lobby", Pil: map[string]*piloto{}, cuotas: map[string]*cubeta{}, Rv: 1, Ov: 1}
		salasKarts.m[leccion] = s
	}
	return s
}

// cuota: cubeta por usuario. Sin esto, una pestaña con un bucle roto tumba la sala de todos.
func (s *salaKarts) cuota(id string, now time.Time) bool {
	if len(s.cuotas) > 400 {
		s.cuotas = map[string]*cubeta{}
	}
	c := s.cuotas[id]
	if c == nil {
		c = &cubeta{}
		s.cuotas[id] = c
	}
	return c.tomar(kartsCuota, now)
}

func (s *salaKarts) evento(e kartEvento, now time.Time) {
	s.sigEv++
	e.ID, e.T = s.sigEv, now.UnixMilli()
	s.Ev = append(s.Ev, e)
	if len(s.Ev) > kartsMaxEvent {
		s.Ev = s.Ev[len(s.Ev)-kartsMaxEvent:]
	}
}

// ranking: primero los que llegaron (por tiempo), luego por avance.
func (s *salaKarts) ranking() []*piloto {
	out := make([]*piloto, 0, len(s.Pil))
	for _, p := range s.Pil {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool {
		a, b := out[i], out[j]
		switch {
		case a.FinMs > 0 && b.FinMs > 0:
			if a.FinMs != b.FinMs {
				return a.FinMs < b.FinMs
			}
		case a.FinMs > 0:
			return true
		case b.FinMs > 0:
			return false
		default:
			if a.P != b.P {
				return a.P > b.P
			}
		}
		return a.N < b.N
	})
	return out
}

func (s *salaKarts) porNumero(n int) *piloto {
	for _, p := range s.Pil {
		if p.N == n {
			return p
		}
	}
	return nil
}

// avanzar mueve la máquina de estados con la hora: la sala no tiene goroutine propia, la empujan las peticiones.
func (s *salaKarts) avanzar(now time.Time) {
	switch s.Estado {
	case "lobby":
		for id, p := range s.Pil {
			if now.Sub(p.Visto) > kartsLobbyFuera {
				delete(s.Pil, id)
				s.Rv++
			}
		}
	case "cuenta":
		if !now.Before(s.Salida) {
			s.Estado = "corre"
		}
	}
	if s.Estado != "corre" {
		return
	}
	if now.Sub(s.Salida) > kartsLimite || (!s.Fin1.IsZero() && now.Sub(s.Fin1) > kartsCierre) {
		s.Estado = "fin"
		return
	}
	llegaron, enPista := 0, 0
	for _, p := range s.Pil {
		if p.FinMs > 0 {
			llegaron++
		} else if now.Sub(p.Visto) <= kartsAusente {
			enPista++
		}
	}
	if enPista == 0 && (llegaron > 0 || now.Sub(s.Salida) > 20*time.Second) {
		s.Estado = "fin"
	}
}

func (s *salaKarts) colorLibre(pide int, yo string) int {
	usado := map[int]bool{}
	for id, p := range s.Pil {
		if id != yo {
			usado[p.Color] = true
		}
	}
	if pide >= 0 && pide < kartsColores && !usado[pide] {
		return pide
	}
	for c := 0; c < kartsColores; c++ {
		if !usado[c] {
			return c
		}
	}
	return 0
}

// limpiarCarrera deja a un piloto listo para otra salida.
func (p *piloto) limpiarCarrera() {
	p.X, p.Z, p.A, p.V, p.P, p.FinMs = 0, 0, 0, 0, 0, 0
	p.Poder, p.Activo = pwNada, pwNada
	p.Hasta, p.CajaT, p.GolpeT, p.PT, p.TS = time.Time{}, time.Time{}, time.Time{}, time.Time{}, time.Time{}
}

func (p *piloto) activo(now time.Time) string {
	if p.Activo != pwNada && now.Before(p.Hasta) {
		return p.Activo
	}
	return pwNada
}

func kartsCodigo(pw string) int {
	for i, x := range kartsPoderes {
		if x == pw {
			return i
		}
	}
	return 0
}

// sortearPoder: el poder de una caja según el tramo del pelotón (0 = punta, 1 = medio, 2 = cola).
func sortearPoder(puesto, de int, r *rand.Rand) string {
	tramo := 0
	if de > 1 {
		f := float64(puesto-1) / float64(de-1)
		switch {
		case f > 0.65:
			tramo = 2
		case f > 0.25:
			tramo = 1
		}
	}
	pesos := kartsPesos[tramo]
	total := 0
	for _, pw := range kartsPoderes {
		total += pesos[pw]
	}
	n := r.IntN(total)
	for _, pw := range kartsPoderes {
		if n < pesos[pw] {
			return pw
		}
		n -= pesos[pw]
	}
	return pwCache
}

var kartsAzar = struct {
	sync.Mutex
	r *rand.Rand
}{r: rand.New(rand.NewPCG(uint64(time.Now().UnixNano()), 0x4a4d44))}

func finito(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) }

func acotar(v, lo, hi float64) float64 { return math.Max(lo, math.Min(hi, v)) }

func r1(v float64) float64 { return math.Round(v*10) / 10 }

// --- handlers ----------------------------------------------------------------------------------

// liveKartsSala resuelve la lección y la sala, con la cuota del usuario ya cobrada. Devuelve la sala
// bloqueada: quien llama hace defer sk.mu.Unlock().
func (s *Server) liveKartsSala(w http.ResponseWriter, r *http.Request, p *Principal) (*salaKarts, time.Time) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return nil, time.Time{}
	}
	sk := salaKartsDe(l.ID)
	now := time.Now()
	sk.mu.Lock()
	if !sk.cuota(p.ID, now) {
		sk.mu.Unlock()
		writeErr(w, 429, "despacio", "demasiadas peticiones: espera un momento")
		return nil, now
	}
	sk.avanzar(now)
	return sk, now
}

func (s *Server) liveKartsEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	sk, now := s.liveKartsSala(w, r, p)
	if sk == nil {
		return
	}
	defer sk.mu.Unlock()
	if yo := sk.Pil[p.ID]; yo != nil {
		yo.Visto = now
	}
	orden := sk.ranking()
	if sk.Estado == "lobby" {
		sort.Slice(orden, func(i, j int) bool { return orden[i].N < orden[j].N })
	}
	pilotos := make([]map[string]any, 0, len(orden))
	for i, x := range orden {
		pilotos = append(pilotos, map[string]any{
			"n": x.N, "id": x.ID, "nombre": x.Nombre, "color": x.Color, "staff": x.Staff,
			"p": math.Round(x.P*1000) / 1000, "fin_ms": x.FinMs, "puesto": i + 1,
			"presente": now.Sub(x.Visto) <= kartsAusente,
		})
	}
	faltan := int64(0)
	if sk.Estado == "cuenta" {
		faltan = max(0, sk.Salida.Sub(now).Milliseconds())
	}
	cierre := int64(0)
	if !sk.Fin1.IsZero() {
		cierre = sk.Fin1.Add(kartsCierre).UnixMilli()
	}
	writeJSON(w, 200, map[string]any{
		"estado": sk.Estado, "faltan_ms": faltan, "salida_ms": msO(sk.Salida), "ahora_ms": now.UnixMilli(),
		"cierre_ms": cierre, "vueltas": kartsVueltas, "max": kartsMax, "pilotos": pilotos,
		"yo": p.ID, "staff": p.Staff(), "rv": sk.Rv,
	})
}

func msO(t time.Time) int64 {
	if t.IsZero() {
		return 0
	}
	return t.UnixMilli()
}

func (s *Server) liveKartsUnir(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		Color *int `json:"color"`
	}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	sk, now := s.liveKartsSala(w, r, p)
	if sk == nil {
		return
	}
	defer sk.mu.Unlock()
	pide := -1
	if in.Color != nil {
		pide = *in.Color
	}
	if yo := sk.Pil[p.ID]; yo != nil {
		yo.Visto = now
		if sk.Estado == "lobby" && pide >= 0 && pide != yo.Color {
			yo.Color = sk.colorLibre(pide, p.ID)
			sk.Rv++
		}
		writeJSON(w, 200, map[string]any{"n": yo.N, "color": yo.Color, "pilotos": len(sk.Pil)})
		return
	}
	if sk.Estado == "cuenta" || sk.Estado == "corre" {
		writeErr(w, 409, "carrera_empezada", "la carrera ya salió: entras en la siguiente")
		return
	}
	if len(sk.Pil) >= kartsMax {
		writeErr(w, 409, "sala_llena", "la sala está llena (20 pilotos)")
		return
	}
	nombre := strings.Join(strings.Fields(p.Name), " ")
	if nombre == "" {
		nombre = "Piloto"
	}
	if utf8.RuneCountInString(nombre) > 24 {
		nombre = string([]rune(nombre)[:24])
	}
	yo := &piloto{N: sk.sigN, ID: p.ID, Nombre: nombre, Color: sk.colorLibre(pide, p.ID), Staff: p.Staff(), Visto: now}
	sk.sigN++
	sk.Pil[p.ID] = yo
	sk.Rv++
	writeJSON(w, 200, map[string]any{"n": yo.N, "color": yo.Color, "pilotos": len(sk.Pil)})
}

func (s *Server) liveKartsSalir(w http.ResponseWriter, r *http.Request, p *Principal) {
	sk, _ := s.liveKartsSala(w, r, p)
	if sk == nil {
		return
	}
	defer sk.mu.Unlock()
	if sk.Estado == "cuenta" || sk.Estado == "corre" {
		writeErr(w, 409, "carrera_empezada", "no puedes salir a media carrera")
		return
	}
	if _, ok := sk.Pil[p.ID]; ok {
		delete(sk.Pil, p.ID)
		sk.Rv++
	}
	writeJSON(w, 200, map[string]any{"ok": true, "pilotos": len(sk.Pil)})
}

func (s *Server) liveKartsIniciar(w http.ResponseWriter, r *http.Request, p *Principal) {
	sk, now := s.liveKartsSala(w, r, p)
	if sk == nil {
		return
	}
	defer sk.mu.Unlock()
	if !p.Staff() {
		forbidden(w)
		return
	}
	// quien cerró la pestaña en el vestíbulo no ocupa casilla
	for id, x := range sk.Pil {
		if id != p.ID && now.Sub(x.Visto) > kartsAusente {
			delete(sk.Pil, id)
		}
	}
	if len(sk.Pil) == 0 {
		writeErr(w, 409, "sin_pilotos", "nadie se ha unido todavía")
		return
	}
	orden := make([]*piloto, 0, len(sk.Pil))
	for _, x := range sk.Pil {
		x.limpiarCarrera()
		orden = append(orden, x)
	}
	kartsAzar.Lock()
	kartsAzar.r.Shuffle(len(orden), func(i, j int) { orden[i], orden[j] = orden[j], orden[i] })
	kartsAzar.Unlock()
	for i, x := range orden {
		x.Grilla = i
	}
	sk.Estado = "cuenta"
	sk.Salida = now.Add(kartsCuenta)
	sk.Fin1 = time.Time{}
	sk.Obs = nil
	sk.Ov++
	sk.Rv++
	writeJSON(w, 200, map[string]any{"salida_ms": sk.Salida.UnixMilli(), "pilotos": len(sk.Pil)})
}

func (s *Server) liveKartsReiniciar(w http.ResponseWriter, r *http.Request, p *Principal) {
	sk, now := s.liveKartsSala(w, r, p)
	if sk == nil {
		return
	}
	defer sk.mu.Unlock()
	if !p.Staff() {
		forbidden(w)
		return
	}
	for id, x := range sk.Pil {
		if id != p.ID && now.Sub(x.Visto) > kartsAusente {
			delete(sk.Pil, id)
			continue
		}
		x.limpiarCarrera()
	}
	sk.Estado = "lobby"
	sk.Salida, sk.Fin1 = time.Time{}, time.Time{}
	sk.Obs = nil
	sk.Ov++
	sk.Rv++
	writeJSON(w, 200, map[string]any{"ok": true, "pilotos": len(sk.Pil)})
}

type kartTickIn struct {
	X     float64 `json:"x"`
	Z     float64 `json:"z"`
	A     float64 `json:"a"`
	V     float64 `json:"v"`
	P     float64 `json:"p"`
	Cli   string  `json:"cli"`
	Own   bool    `json:"own"`
	Sin   bool    `json:"sin"`   // aún sin estado propio (pestaña recién abierta): solo leer
	Caja  *int    `json:"caja"`  // tocó una caja (índice; el servidor decide el poder)
	Usa   bool    `json:"usa"`   // presionó Espacio
	Golpe *int    `json:"golpe"` // con Opus activo, chocó a este piloto
	Toma  *int    `json:"toma"`  // pisó este obstáculo
	Ev    int     `json:"ev"`    // último evento visto (-1 = solo dame el cursor)
	Ov    int     `json:"ov"`    // versión de obstáculos que tiene
	Rv    int     `json:"rv"`    // versión de la lista de pilotos que tiene
}

// liveKartsTick: una petición por tick. Guarda el estado propio (si esta pestaña maneja el kart), aplica
// cajas, poderes, golpes y obstáculos, y devuelve a todos en formato compacto:
//
//	k: [[n, x, z, a, v, p, poder|llegó<<4|ausente<<5, edad_ms], …]   orden: [n…] por puesto
//	r: [[n, nombre, color, staff], …] solo si cambió (rv)              ob: [[id, x, z], …] solo si cambió (ov)
func (s *Server) liveKartsTick(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in kartTickIn
	if !readJSON(w, r, &in) {
		return
	}
	sk, now := s.liveKartsSala(w, r, p)
	if sk == nil {
		return
	}
	defer sk.mu.Unlock()

	yo := sk.Pil[p.ID]
	dueno := false
	if yo != nil {
		yo.Visto = now
		cli := strings.TrimSpace(in.Cli)
		if len(cli) > 40 {
			cli = cli[:40]
		}
		if yo.Cli == "" || yo.Cli == cli || in.Own || now.Sub(yo.CliT) > kartsCliCalla {
			yo.Cli, yo.CliT, dueno = cli, now, true
		}
	}
	if yo != nil && dueno && !in.Sin {
		sk.aplicarTick(yo, &in, now)
	}

	// obstáculos vencidos
	if len(sk.Obs) > 0 {
		vivos := sk.Obs[:0]
		for _, o := range sk.Obs {
			if now.Before(o.Exp) {
				vivos = append(vivos, o)
			}
		}
		if len(vivos) != len(sk.Obs) {
			sk.Ov++
		}
		sk.Obs = vivos
	}

	orden := sk.ranking()
	k := make([][]float64, 0, len(orden))
	ord := make([]int, 0, len(orden))
	puesto := 0
	for i, x := range orden {
		ord = append(ord, x.N)
		if x == yo {
			puesto = i + 1
		}
		flags := kartsCodigo(x.activo(now))
		if x.FinMs > 0 {
			flags |= 1 << 4
		}
		if now.Sub(x.Visto) > kartsAusente {
			flags |= 1 << 5
		}
		edad := 0.0
		if !x.TS.IsZero() {
			edad = float64(min(9999, now.Sub(x.TS).Milliseconds()))
		}
		k = append(k, []float64{float64(x.N), r1(x.X), r1(x.Z), math.Round(x.A*100) / 100, r1(x.V),
			math.Round(x.P*1000) / 1000, float64(flags), edad})
	}
	out := map[string]any{"e": sk.Estado, "t": now.UnixMilli(), "sal": msO(sk.Salida), "k": k, "orden": ord,
		"rv": sk.Rv, "ov": sk.Ov, "evn": sk.sigEv}
	if !sk.Fin1.IsZero() {
		out["cierre"] = sk.Fin1.Add(kartsCierre).UnixMilli()
	}
	if in.Rv != sk.Rv {
		lista := make([][]any, 0, len(sk.Pil))
		for _, x := range sk.Pil {
			lista = append(lista, []any{x.N, x.Nombre, x.Color, x.Staff, x.Grilla})
		}
		out["r"] = lista
	}
	if in.Ov != sk.Ov {
		obs := make([][]float64, 0, len(sk.Obs))
		for _, o := range sk.Obs {
			obs = append(obs, []float64{float64(o.ID), r1(o.X), r1(o.Z)})
		}
		out["ob"] = obs
	}
	if in.Ev >= 0 {
		evs := []kartEvento{}
		for _, e := range sk.Ev {
			if e.ID > in.Ev {
				evs = append(evs, e)
			}
		}
		if len(evs) > 20 {
			evs = evs[len(evs)-20:]
		}
		out["ev"] = evs
	}
	if yo != nil {
		hasta := int64(0)
		if yo.activo(now) != pwNada {
			hasta = yo.Hasta.UnixMilli()
		}
		out["yo"] = map[string]any{"n": yo.N, "poder": yo.Poder, "activo": yo.activo(now), "hasta": hasta,
			"p": math.Round(yo.P*1000) / 1000, "fin_ms": yo.FinMs, "puesto": puesto, "dueno": dueno,
			"grilla": yo.Grilla, "x": r1(yo.X), "z": r1(yo.Z), "a": math.Round(yo.A*100) / 100}
	}
	writeJSON(w, 200, out)
}

// aplicarTick: el estado y las acciones de quien maneja el kart. La sala está bloqueada.
func (s *salaKarts) aplicarTick(yo *piloto, in *kartTickIn, now time.Time) {
	if !finito(in.X) || !finito(in.Z) || !finito(in.A) || !finito(in.V) || !finito(in.P) {
		return
	}
	corre := s.Estado == "corre" && yo.FinMs == 0
	yo.X = acotar(in.X, -kartsCoordMax, kartsCoordMax)
	yo.Z = acotar(in.Z, -kartsCoordMax, kartsCoordMax)
	yo.A = math.Remainder(in.A, 2*math.Pi)
	yo.V = acotar(in.V, -30, kartsVMax)
	yo.TS = now
	if s.Estado == "cuenta" || s.Estado == "lobby" {
		yo.V = 0
	}
	if !corre {
		return
	}

	// Avance con tope de ritmo: el cliente manda su avance absoluto y aquí no se acepta más de lo que
	// permite el tiempo transcurrido. Si una respuesta se pierde, el siguiente tick lo corrige solo.
	desde := yo.PT
	if desde.IsZero() || desde.Before(s.Salida) {
		desde = s.Salida
	}
	tope := yo.P + now.Sub(desde).Seconds()*kartsRitmoMax + kartsHolgura
	nuevo := acotar(in.P, 0, tope)
	if nuevo < yo.P-0.25 {
		nuevo = yo.P // un salto grande hacia atrás es un cliente que perdió su estado, no alguien en reversa
	}
	if nuevo != yo.P {
		yo.P, yo.PT = nuevo, now
	}
	if yo.P >= kartsVueltas {
		yo.P = kartsVueltas
		yo.FinMs = max(1, now.Sub(s.Salida).Milliseconds())
		yo.Poder, yo.Activo = pwNada, pwNada
		if s.Fin1.IsZero() {
			s.Fin1 = now
		}
		puesto := 0
		for _, x := range s.Pil {
			if x.FinMs > 0 {
				puesto++
			}
		}
		s.evento(kartEvento{Tp: "meta", De: yo.N, A: puesto, Ms: yo.FinMs}, now)
		return
	}

	// Caja: el servidor elige el poder según el puesto. Una caja cada 1,5 s y una sola en la mano.
	if in.Caja != nil && yo.Poder == pwNada && now.Sub(yo.CajaT) >= kartsCajaCada {
		orden := s.ranking()
		puesto := 1
		for i, x := range orden {
			if x == yo {
				puesto = i + 1
			}
		}
		kartsAzar.Lock()
		yo.Poder = sortearPoder(puesto, len(orden), kartsAzar.r)
		kartsAzar.Unlock()
		yo.CajaT = now
	}

	if in.Usa && yo.Poder != pwNada {
		pw := yo.Poder
		yo.Poder = pwNada
		yo.Activo, yo.Hasta = pw, now.Add(kartsDuracion[pw])
		ev := kartEvento{Tp: "poder", De: yo.N, A: -1, Pw: pw}
		switch pw {
		case pwSubagente:
			// busca al líder; si el líder eres tú, al segundo
			for _, x := range s.ranking() {
				if x != yo && x.FinMs == 0 {
					ev.A = x.N
					gap := math.Abs(x.P - yo.P)
					ev.Ms = int64(acotar(1200+gap*6000, 1200, 3500))
					break
				}
			}
		case pwTokens:
			atras := 9.0
			cx, cz := yo.X-math.Cos(yo.A)*atras, yo.Z-math.Sin(yo.A)*atras
			lx, lz := -math.Sin(yo.A), math.Cos(yo.A)
			for _, lado := range []float64{-5.5, 0, 5.5} {
				s.sigObs++
				s.Obs = append(s.Obs, kartObs{ID: s.sigObs, X: cx + lx*lado - math.Cos(yo.A)*math.Abs(lado)*0.4,
					Z: cz + lz*lado - math.Sin(yo.A)*math.Abs(lado)*0.4, De: yo.N, Exp: now.Add(kartsObsVida)})
			}
			if len(s.Obs) > kartsMaxObs {
				s.Obs = s.Obs[len(s.Obs)-kartsMaxObs:]
			}
			s.Ov++
		}
		s.evento(ev, now)
	}

	// Golpe de Opus: solo con Opus activo, contra alguien cerca según lo guardado.
	if in.Golpe != nil && yo.activo(now) == pwOpus {
		if v := s.porNumero(*in.Golpe); v != nil && v != yo && v.FinMs == 0 &&
			math.Hypot(v.X-yo.X, v.Z-yo.Z) <= kartsGolpeDist && now.Sub(v.GolpeT) >= kartsGolpeCada {
			v.GolpeT = now
			tp := "golpe"
			if v.activo(now) == pwCompactar {
				tp = "bloqueo"
			}
			s.evento(kartEvento{Tp: tp, De: yo.N, A: v.N, Pw: pwOpus}, now)
		}
	}

	// Obstáculo pisado: desaparece para todos.
	if in.Toma != nil {
		for i, o := range s.Obs {
			if o.ID == *in.Toma {
				s.Obs = append(s.Obs[:i], s.Obs[i+1:]...)
				s.Ov++
				tp := "choque"
				if yo.activo(now) == pwCompactar {
					tp = "bloqueo"
				}
				s.evento(kartEvento{Tp: tp, De: o.De, A: yo.N, Pw: pwTokens}, now)
				break
			}
		}
	}
}
