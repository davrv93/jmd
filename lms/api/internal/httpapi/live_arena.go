package httpapi

// Arena del monito (Laboratorio de caos · «Suelta al monito»).
//
// Dos equipos por lección: «tumba» (Monito Tumba Server) ataca y «server» (Monito Server) defiende.
// Cada defensor tiene en SU aula un servidor de práctica real (/trabajo/monito: una tiendita en Bun con
// SQLite en 127.0.0.1:7070 y un respaldo). Los atacantes no necesitan aula: eligen un servidor y un
// ataque, y el LMS lo ejecuta en el aula de ese defensor con docker exec. Va por turnos:
//
//	lobby → ataque (35 s) → defensa (55 s) → marcador → (el instructor abre la ronda siguiente)
//
// Durante la defensa el defensor puede usar dos botones (reiniciar la app, limpiar el disco); las otras
// dos fallas (base borrada, app atascada) se curan con prompts en DeepSeek Harness, que lee la skill
// monito-server que el LMS deja en /trabajo/.agents/skills. Un vigía revisa la salud de cada servidor
// cada pocos segundos; al cerrar la defensa, cada servidor sano suma 100 al equipo Server y cada uno
// caído suma 100 al equipo Tumba (repartidos entre quienes lo atacaron esa ronda).
//
// Seguridad: los ataques son scripts fijos (el cliente solo elige el nombre), nunca texto del alumno.
// El «disco lleno» es un estado del juego, no un volcado real: la tienda tiene un cupo de 64 MB sobre el
// tamaño aparente de /tmp y los ataques de disco crean archivos huecos (sparse), que dicen pesar y no
// ocupan memoria ni disco. Nada toca /trabajo salvo la carpeta del laboratorio. Ningún ataque usa CPU,
// memoria, disco ni red: el servidor compartido no lo nota aunque ataquen todos a la vez.
//
// GET  /api/v1/live/{lesson}/arena            estado
// POST /api/v1/live/{lesson}/arena {accion}   unir | atacar | defender | escudo | kernel_panic | super | iniciar | siguiente | reiniciar | mover | limpiar

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

const (
	arenaAtaque     = 35 * time.Second
	arenaDefensa    = 55 * time.Second
	arenaMax        = 40
	arenaAtaquesMax = 2 // por atacante y por turno de ataque
	// Escudo: el defensor «cierra sus conexiones externas» un rato corto, una vez por ronda, durante el ataque.
	arenaEscudo = 10 * time.Second
	// Kernel panic: apaga a todos de golpe. El equipo Tumba lo tiene 2 veces por partida, y solo una por ronda.
	arenaKernelMax = 2
	// La partida dura 5 rondas y cada ronda da menos tiempo (ver arenaDurAtaque y arenaDurDefensa).
	arenaRondasMax  = 5
	arenaMaxEv      = 60
	arenaVigiaCada  = 4 * time.Second
	arenaVigiaFin   = 20 * time.Minute // sin peticiones, el vigía se apaga
	arenaPuntos     = 100
	arenaLibreMinMB = 8 // la app se declara enferma con menos de esto libre en su cupo de /tmp
)

// arenaLibre define en el aula la función libre: cuántos MB le quedan al «disco» de la tienda. Es un cupo
// de 64 MB sobre el tamaño aparente de los archivos de /tmp (lo mismo que calcula servidor.js), no el
// espacio real: df no lo muestra, ls -la sí.
const arenaLibre = `libre() { o=$(find /tmp -type f -exec stat -c %s {} + 2>/dev/null | awk '{s+=$1} END{print int(s/1048576)}'); echo $((64-${o:-0})); }
`

var arenaCuota = cuota{cap: 30, porSeg: 8}

// Ataques: nombre → script fijo que se corre en el aula del defensor. Los cuatro primeros tienen botón o
// receta en la skill; los otros seis no: el equipo Server tiene que investigar (síntoma en el panel, causa en
// /salud, en config/, en los procesos o en la base). Todos acotados: los de disco no escriben datos (archivos
// huecos con dd seek, nunca /dev/zero), los clones no pasan de 12 (24 procesos de 256) y nada usa CPU ni red.
var arenaAtaques = map[string]string{
	"apagar":  `pkill -f "[m]onito/servidor.js"; true`,
	"disco":   arenaLibre + `n=$(( $(libre) - 4 )); [ "$n" -gt 0 ] && dd if=/dev/null of=/tmp/.monito-relleno-$(date +%s) bs=1M seek=$n count=0 2>/dev/null; true`,
	"base":    `rm -f /trabajo/monito/tienda.db; true`,
	"atascar": `mkdir -p /trabajo/monito/config && echo "el monito estuvo aquí" > /trabajo/monito/config/lento.flag`,
	"fuga":    `cd /trabajo/monito && mkdir -p publico && [ -s tienda.db ] && cp tienda.db publico/clientes-$(date +%s).db; true`,
	"clones": `n=$(pgrep -f "[m]onito-clon" | wc -l); i=0
while [ $((n+i)) -lt 12 ] && [ $i -lt 6 ]; do (nohup sh -c 'while :; do sleep 30; done' monito-clon >/dev/null 2>&1 &); i=$((i+1)); done; true`,
	"pesados": arenaLibre + `mkdir -p /tmp/subidas; n=$(( $(libre) - 4 )); i=0
while [ "$n" -ge 5 ] && [ "$i" -lt 16 ]; do dd if=/dev/null of=/tmp/subidas/foto-$(date +%s)-$i.raw bs=1M seek=5 count=0 2>/dev/null || break; n=$((n-5)); i=$((i+1)); done; true`,
	"formulario": `cd /trabajo/monito && [ -s tienda.db ] || exit 0
cat > .formulario.js <<'FIN_JS'
import { Database } from "bun:sqlite";
const db = new Database("/trabajo/monito/tienda.db");
const ins = db.prepare("insert into productos (nombre, precio, stock) values (?, ?, ?)");
for (const f of [["", 4.5, 10], ["Mango", -3, 5], ["   ", 0, -10], ["Piña piña piña piña piña", 99999, -1]]) ins.run(...f);
db.close();
FIN_JS
bun .formulario.js >/dev/null 2>&1; rm -f .formulario.js; true`,
	"sesion": `mkdir -p /trabajo/monito/config/sesiones && echo '{"usuario":"admin","creada":"'$(date +%s)'","expira":"nunca"}' > /trabajo/monito/config/sesiones/admin-$(date +%s).json`,
	"clave":  `mkdir -p /trabajo/monito/config && echo '{"usuario":"admin","clave":"123456"}' > /trabajo/monito/config/admin.json`,
}

var arenaNombreAtaque = map[string]string{
	"apagar": "apagó la app de", "disco": "llenó el disco de", "base": "borró la base de", "atascar": "atascó la app de",
	"fuga": "soltó a los monitos en fuga con los datos de", "clones": "hizo el jutsu de clones en", "pesados": "subió archivos pesados a",
	"formulario": "llenó mal los formularios de", "sesion": "dejó la sesión abierta en", "clave": "le puso una clave débil a",
}

// Defensas con botón (las otras fallas se curan con DeepSeek Harness).
const arenaArrancar = `sh /trabajo/monito/arrancar.sh`

var arenaDefensas = map[string]string{
	"reiniciar": arenaArrancar,
	"limpiar":   `rm -f /tmp/.monito-relleno-*; echo OK`,
}

var arenaNombreDefensa = map[string]string{"reiniciar": "reinició su app", "limpiar": "limpió su disco"}

// Chequeo de salud: marcas de texto y el JSON de /salud, que arenaLeerSalud entiende.
const arenaChequeo = arenaLibre + `cd /trabajo/monito 2>/dev/null || { echo SIN_LAB; exit 0; }
pgrep -f "[m]onito/servidor.js" >/dev/null && echo APP_SI || echo APP_NO
curl -s -m 3 -w '\nHTTP_%{http_code}\n' http://127.0.0.1:7070/salud
[ -f config/lento.flag ] && echo LENTO
echo "LIBRE_$(libre)"
[ -s tienda.db ] && echo BASE_SI || echo BASE_NO
[ "$(pgrep -f "[m]onito-clon" | wc -l)" -ge 2 ] && echo CLONES
true`

type arenaJugador struct {
	ID          string
	N           int
	Nombre      string
	Equipo      string // tumba | server
	Staff       bool
	Visto       time.Time
	Puntos      int
	Ataques     int    // usados en el turno de ataque actual
	Lab         string // server: preparando | listo | error
	Salud       string // server: ok | caido | ? (sin chequear)
	Fallas      []string
	Chequeo     time.Time
	Atacado     map[string]bool // ids de quienes lo atacaron esta ronda
	Mensaje     string          // último resultado de una defensa con botón
	Objetivo    int             // tumba: n del servidor que eligió (solo para la UI)
	EscudoHasta time.Time       // server: hasta cuándo rechaza ataques (conexiones cerradas)
	EscudoRonda int             // server: ronda en la que ya usó su escudo
	SuperUsado  bool            // tumba: ya gastó su Golpe Ozaru en esta partida
	Derribado   bool            // server, con «sin cura»: cayó tras un ataque y queda caído hasta reiniciar la arena
	Verdugos    map[string]bool // server: ids de quienes lo derribaron (cobran sus puntos en las rondas siguientes)
}

type arenaEvento struct {
	ID     int    `json:"id"`
	T      int64  `json:"t"`
	Tipo   string `json:"tipo"` // ataque | defensa | fase | puntos | union
	De     int    `json:"de"`
	A      int    `json:"a"`
	Accion string `json:"accion,omitempty"`
	Texto  string `json:"texto"`
}

type salaArena struct {
	mu          sync.Mutex
	Leccion     string
	Fase        string // lobby | ataque | defensa | marcador
	Ronda       int
	Hasta       time.Time
	Jug         map[string]*arenaJugador
	SinCura     bool // el profe selló a Ema: nadie cura y lo que cae queda caído (ver live_arena_super.go)
	sigN        int
	Ev          []arenaEvento
	sigEv       int
	Tumba       int
	Server      int
	pendiente   bool // hay que puntuar la ronda con el próximo chequeo completo
	kernelRonda int  // ronda del último kernel panic (uno por ronda)
	kernelUsos  int  // kernel panics usados en la partida (máximo arenaKernelMax)
	vigia       bool
	ultimaPet   time.Time
	cuotas      map[string]*cubeta
	guardado    []byte // huella de lo último que se escribió en disco (ver live_arena_super.go)
}

var salasArena = struct {
	sync.Mutex
	m map[string]*salaArena
}{m: map[string]*salaArena{}}

func salaArenaDe(leccion string) *salaArena { return salaArenaCon(leccion, "") }

// salaArenaCon devuelve la sala de la lección; si todavía no existe, la recupera del disco (dir) o la crea.
func salaArenaCon(leccion, dir string) *salaArena {
	salasArena.Lock()
	defer salasArena.Unlock()
	s := salasArena.m[leccion]
	if s == nil {
		if s = cargarArena(dir, leccion, time.Now()); s == nil {
			s = &salaArena{Leccion: leccion, Fase: "lobby", Jug: map[string]*arenaJugador{}, cuotas: map[string]*cubeta{}}
		}
		salasArena.m[leccion] = s
	}
	return s
}

func (s *salaArena) cuota(id string, now time.Time) bool {
	if len(s.cuotas) > 400 {
		s.cuotas = map[string]*cubeta{}
	}
	c := s.cuotas[id]
	if c == nil {
		c = &cubeta{}
		s.cuotas[id] = c
	}
	return c.tomar(arenaCuota, now)
}

func (s *salaArena) evento(e arenaEvento, now time.Time) {
	s.sigEv++
	e.ID, e.T = s.sigEv, now.UnixMilli()
	s.Ev = append(s.Ev, e)
	if len(s.Ev) > arenaMaxEv {
		s.Ev = s.Ev[len(s.Ev)-arenaMaxEv:]
	}
}

func (s *salaArena) porN(n int) *arenaJugador {
	for _, j := range s.Jug {
		if j.N == n {
			return j
		}
	}
	return nil
}

// avanzar mueve los turnos con la hora; la empujan las peticiones y el vigía.
func (s *salaArena) avanzar(now time.Time) {
	switch s.Fase {
	case "ataque":
		if !now.Before(s.Hasta) {
			s.abrirDefensa(now)
		}
	case "defensa":
		if !now.Before(s.Hasta) {
			s.cerrarRonda(now)
		}
	}
}

// El tiempo se acorta con cada ronda: ataque 35, 31, 27, 23 y 19 s; defensa 55, 46, 37, 30 y 30 s (nunca menos de 30).
func arenaDurAtaque(ronda int) time.Duration {
	return max(15*time.Second, arenaAtaque-time.Duration(max(0, ronda-1))*4*time.Second)
}
func arenaDurDefensa(ronda int) time.Duration {
	return max(30*time.Second, arenaDefensa-time.Duration(max(0, ronda-1))*9*time.Second)
}

func (s *salaArena) abrirRonda(now time.Time) {
	s.Ronda++
	s.Fase, s.Hasta = "ataque", now.Add(arenaDurAtaque(s.Ronda))
	s.pendiente = false
	for _, j := range s.Jug {
		j.Ataques, j.Atacado, j.Mensaje = 0, map[string]bool{}, ""
	}
	s.evento(arenaEvento{Tipo: "fase", Accion: "ataque", Texto: fmt.Sprintf("Ronda %d de %d: ¡ataca el equipo Tumba Server! (%d s)", s.Ronda, arenaRondasMax, int(arenaDurAtaque(s.Ronda).Seconds()))}, now)
}

func (s *salaArena) abrirDefensa(now time.Time) {
	s.Fase, s.Hasta = "defensa", now.Add(arenaDurDefensa(s.Ronda))
	s.evento(arenaEvento{Tipo: "fase", Accion: "defensa", Texto: "¡Turno del equipo Server: a curar los servidores!"}, now)
}

func (s *salaArena) cerrarRonda(now time.Time) {
	s.Fase, s.Hasta = "marcador", time.Time{}
	s.pendiente = true
	s.evento(arenaEvento{Tipo: "fase", Accion: "marcador", Texto: "Tiempo: revisando los servidores…"}, now)
}

// puntuar reparte los puntos de la ronda con la salud actual de cada servidor.
func (s *salaArena) puntuar(now time.Time) {
	if !s.pendiente {
		return
	}
	s.pendiente = false
	sanos, caidos, rt, rs := 0, 0, 0, 0
	for _, d := range s.Jug {
		if d.Equipo != "server" || d.Lab != "listo" {
			continue
		}
		if d.Salud == "ok" && !(s.SinCura && d.Derribado) {
			sanos++
			d.Puntos += arenaPuntos
			rs += arenaPuntos
			continue
		}
		caidos++
		rt += arenaPuntos
		var quienes []*arenaJugador
		de := d.Atacado
		if len(de) == 0 && s.SinCura {
			de = d.Verdugos // nadie lo tocó esta ronda: cobran quienes lo derribaron
		}
		for id := range de {
			if a := s.Jug[id]; a != nil {
				quienes = append(quienes, a)
			}
		}
		for _, a := range quienes {
			a.Puntos += arenaPuntos / len(quienes)
		}
	}
	s.Server += rs
	s.Tumba += rt
	s.evento(arenaEvento{Tipo: "puntos", Texto: fmt.Sprintf("Ronda %d: %d servidores en pie (+%d Server) y %d caídos (+%d Tumba)", s.Ronda, sanos, rs, caidos, rt)}, now)
	if s.Ronda >= arenaRondasMax {
		gana := "¡Empate!"
		if s.Tumba > s.Server {
			gana = "Gana el equipo Tumba Server 🐒"
		} else if s.Server > s.Tumba {
			gana = "Gana el equipo Server 🛡️"
		}
		s.evento(arenaEvento{Tipo: "fase", Accion: "fin", Texto: fmt.Sprintf("Fin del juego tras %d rondas. %s (Tumba %d · Server %d)", arenaRondasMax, gana, s.Tumba, s.Server)}, now)
	}
}

// arenaLeerSalud traduce la salida de arenaChequeo a (salud, fallas): las marcas del shell más las fallas que
// la propia tienda declara en /salud (datos, clave, sesión, fuga…).
func arenaLeerSalud(out string) (string, []string) {
	if strings.Contains(out, "SIN_LAB") {
		return "caido", []string{"sin_lab"}
	}
	fallas := []string{}
	agregar := func(f string) {
		if f != "" && !slices.Contains(fallas, f) {
			fallas = append(fallas, f)
		}
	}
	http200 := false
	for _, l := range strings.Split(out, "\n") {
		l = strings.TrimSpace(l)
		if strings.HasPrefix(l, "{") {
			var s struct {
				Fallas []string `json:"fallas"`
			}
			if json.Unmarshal([]byte(l), &s) == nil {
				for _, f := range s.Fallas {
					agregar(f)
				}
			}
			continue
		}
		switch {
		case l == "APP_NO":
			agregar("app")
		case l == "LENTO":
			agregar("lenta")
		case l == "BASE_NO":
			agregar("base")
		case l == "CLONES":
			agregar("clones")
		case l == "HTTP_200":
			http200 = true
		case strings.HasPrefix(l, "LIBRE_"):
			if n, err := strconv.Atoi(strings.TrimPrefix(l, "LIBRE_")); err == nil && n < arenaLibreMinMB {
				agregar("disco")
			}
		}
	}
	if http200 && len(fallas) == 0 {
		return "ok", fallas
	}
	if len(fallas) == 0 {
		fallas = append(fallas, "app") // corre pero no responde 200 por otra razón
	}
	return "caido", fallas
}

// --- vigía ---------------------------------------------------------------------------------------

// vigilar revisa la salud de todos los defensores mientras la sala tenga uso.
func (s *Server) vigilarArena(sa *salaArena) {
	for {
		time.Sleep(arenaVigiaCada)
		sa.mu.Lock()
		now := time.Now()
		if now.Sub(sa.ultimaPet) > arenaVigiaFin {
			sa.vigia = false
			sa.mu.Unlock()
			return
		}
		sa.avanzar(now)
		var ids []string
		for id, j := range sa.Jug {
			if j.Equipo == "server" && j.Lab == "listo" {
				ids = append(ids, id)
			}
		}
		sa.mu.Unlock()

		res := s.chequearArena(ids)

		sa.mu.Lock()
		now = time.Now()
		for id, r := range res {
			if j := sa.Jug[id]; j != nil {
				j.Salud, j.Fallas, j.Chequeo = r.salud, r.fallas, now
				sa.marcarDerribo(j)
			}
		}
		if sa.Fase == "marcador" {
			sa.puntuar(now)
		}
		foto := sa.instantanea()
		sa.mu.Unlock()
		s.guardarArena(sa, foto)
	}
}

// revisarYa actualiza la salud de un defensor sin esperar al vigía: tras un ataque o una defensa, el cambio
// se ve en el siguiente sondeo del cliente (un segundo) y no hasta cuatro después.
func (s *Server) revisarYa(sa *salaArena, id string) {
	r, ok := s.chequearArena([]string{id})[id]
	if !ok {
		return
	}
	sa.mu.Lock()
	defer sa.mu.Unlock()
	if j := sa.Jug[id]; j != nil && j.Equipo == "server" && j.Lab == "listo" {
		j.Salud, j.Fallas, j.Chequeo = r.salud, r.fallas, time.Now()
		sa.marcarDerribo(j)
	}
}

type saludArena struct {
	salud  string
	fallas []string
}

func (s *Server) chequearArena(ids []string) map[string]saludArena {
	out := map[string]saludArena{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
			defer cancel()
			tocarAula(id)
			r, err := s.Aula.Exec(ctx, aula.Nombre(id), arenaChequeo)
			sal, fallas := arenaLeerSalud(r)
			if err != nil && r == "" {
				sal, fallas = "caido", []string{"aula"}
			}
			mu.Lock()
			out[id] = saludArena{sal, fallas}
			mu.Unlock()
		}(id)
	}
	wg.Wait()
	return out
}

// prepararLab instala (o reinstala) el servidor de práctica y la skill en el aula del defensor.
func (s *Server) prepararLab(sa *salaArena, id string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	estado := "listo"
	if _, err := s.Aula.Crear(ctx, id); err != nil {
		estado = "error"
	} else {
		tocarAula(id)
		out, err := s.Aula.ExecStdin(ctx, aula.Nombre(id), `mkdir -p /trabajo/monito && cat > /trabajo/monito/.instalar.sh && sh /trabajo/monito/.instalar.sh`, []byte(arenaInstalador))
		if err != nil || !strings.Contains(out, "LAB_OK") {
			estado = "error"
		}
	}
	sa.mu.Lock()
	defer sa.mu.Unlock()
	if j := sa.Jug[id]; j != nil {
		j.Lab = estado
		if estado == "listo" {
			j.Salud, j.Fallas = "ok", []string{}
		}
	}
}

// --- handlers ------------------------------------------------------------------------------------

func (s *Server) liveArenaSala(w http.ResponseWriter, r *http.Request, p *Principal) (*salaArena, time.Time) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return nil, time.Time{}
	}
	if !s.aulaListo(w) {
		return nil, time.Time{}
	}
	sa := salaArenaCon(l.ID, s.DataDir)
	now := time.Now()
	sa.mu.Lock()
	if !sa.cuota(p.ID, now) {
		sa.mu.Unlock()
		writeErr(w, 429, "despacio", "demasiadas peticiones: espera un momento")
		return nil, now
	}
	sa.ultimaPet = now
	if !sa.vigia {
		sa.vigia = true
		go s.vigilarArena(sa)
	}
	sa.avanzar(now)
	if yo := sa.Jug[p.ID]; yo != nil {
		yo.Visto = now
	}
	return sa, now
}

func (s *Server) liveArenaEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	sa, now := s.liveArenaSala(w, r, p)
	if sa == nil {
		return
	}
	defer sa.mu.Unlock()
	writeJSON(w, 200, sa.vista(p, now))
}

func (sa *salaArena) vista(p *Principal, now time.Time) map[string]any {
	lista := make([]*arenaJugador, 0, len(sa.Jug))
	for _, j := range sa.Jug {
		lista = append(lista, j)
	}
	sort.Slice(lista, func(i, j int) bool { return lista[i].N < lista[j].N })
	jug := make([]map[string]any, 0, len(lista))
	for _, j := range lista {
		x := map[string]any{"n": j.N, "nombre": j.Nombre, "equipo": j.Equipo, "puntos": j.Puntos, "staff": j.Staff,
			"presente": now.Sub(j.Visto) <= 30*time.Second}
		if j.Equipo == "server" {
			x["lab"] = j.Lab
			x["salud"], x["fallas"] = sa.saludVista(j)
			if j.EscudoHasta.After(now) {
				x["escudo_ms"] = j.EscudoHasta.Sub(now).Milliseconds()
			}
		} else {
			x["ataques"] = j.Ataques
			x["super_usado"] = j.SuperUsado
		}
		jug = append(jug, x)
	}
	eventos := sa.Ev
	if eventos == nil {
		eventos = []arenaEvento{} // nunca null: la escena recorre la lista
	}
	faltan := int64(0)
	if !sa.Hasta.IsZero() {
		faltan = max(0, sa.Hasta.Sub(now).Milliseconds())
	}
	out := map[string]any{
		"fase": sa.Fase, "ronda": sa.Ronda, "faltan_ms": faltan, "ahora_ms": now.UnixMilli(),
		"tumba": sa.Tumba, "server": sa.Server, "jugadores": jug, "eventos": eventos,
		"staff": p.Staff(), "ataques_max": arenaAtaquesMax, "puntuando": sa.pendiente,
		"kernel_libre": sa.Fase == "ataque" && sa.kernelRonda != sa.Ronda && sa.kernelUsos < arenaKernelMax, "kernel_restan": arenaKernelMax - sa.kernelUsos,
		"sin_cura": sa.SinCura,
		"super":    true, // la escena enseña el Golpe Ozaru y «Quitar ausentes» solo si el servidor los conoce
		"escudo_s": int(arenaEscudo.Seconds()), "rondas_max": arenaRondasMax, "fin": sa.Ronda >= arenaRondasMax && sa.Fase == "marcador" && !sa.pendiente,
	}
	if yo := sa.Jug[p.ID]; yo != nil {
		miSalud, misFallas := sa.saludVista(yo)
		out["yo"] = map[string]any{"n": yo.N, "equipo": yo.Equipo, "ataques": yo.Ataques, "lab": yo.Lab,
			"salud": miSalud, "fallas": misFallas, "mensaje": yo.Mensaje, "puntos": yo.Puntos,
			"super_libre":  yo.Equipo == "tumba" && !yo.SuperUsado,
			"escudo_libre": yo.Equipo == "server" && yo.EscudoRonda != sa.Ronda, "escudo_ms": max(0, yo.EscudoHasta.Sub(now).Milliseconds())}
	}
	return out
}

func (s *Server) liveArenaPost(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		Accion   string `json:"accion"`
		Equipo   string `json:"equipo"`
		Objetivo int    `json:"objetivo"`
		Ataque   string `json:"ataque"`
		Defensa  string `json:"defensa"`
		N        int    `json:"n"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	sa, now := s.liveArenaSala(w, r, p)
	if sa == nil {
		return
	}
	switch in.Accion {
	case "unir":
		s.arenaUnir(w, sa, p, in.Equipo, now)
	case "atacar":
		s.arenaAtacar(w, sa, p, in.Objetivo, in.Ataque, now)
	case "defender":
		s.arenaDefender(w, sa, p, in.Defensa, now)
	case "escudo":
		s.arenaEscudar(w, sa, p, now)
	case "kernel_panic":
		s.arenaKernelPanic(w, sa, p, now)
	case "super":
		s.arenaSuper(w, sa, p, in.Objetivo, in.Ataque, now)
	case "preparar":
		yo := sa.Jug[p.ID]
		if yo == nil || yo.Equipo != "server" {
			sa.mu.Unlock()
			writeErr(w, 409, "no_defensor", "solo el equipo Server tiene servidor que preparar")
			return
		}
		if sa.Fase == "ataque" {
			sa.mu.Unlock()
			writeErr(w, 409, "no_es_tu_turno", "no puedes reinstalar mientras te atacan")
			return
		}
		yo.Lab = "preparando"
		vista := sa.vista(p, now)
		sa.mu.Unlock()
		go s.prepararLab(sa, p.ID)
		writeJSON(w, 200, vista)
	case "iniciar", "siguiente", "reiniciar", "mover", "limpiar", "sin_cura":
		defer sa.mu.Unlock()
		if !p.Staff() {
			forbidden(w)
			return
		}
		switch in.Accion {
		case "iniciar":
			if sa.Fase == "ataque" || sa.Fase == "defensa" {
				writeErr(w, 409, "ronda_en_curso", "ya hay una ronda en curso")
				return
			}
			sa.puntuar(now)
			if sa.Ronda >= arenaRondasMax {
				writeErr(w, 409, "juego_terminado", fmt.Sprintf("ya se jugaron las %d rondas: mira el marcador y pulsa «Reiniciar arena» para otra partida", arenaRondasMax))
				return
			}
			sa.abrirRonda(now)
		case "siguiente":
			switch sa.Fase {
			case "ataque":
				sa.abrirDefensa(now)
			case "defensa":
				sa.cerrarRonda(now)
			default:
				sa.puntuar(now)
				if sa.Ronda >= arenaRondasMax {
					writeErr(w, 409, "juego_terminado", fmt.Sprintf("ya se jugaron las %d rondas: mira el marcador y pulsa «Reiniciar arena» para otra partida", arenaRondasMax))
					return
				}
				sa.abrirRonda(now)
			}
		case "reiniciar":
			sa.Fase, sa.Ronda, sa.Hasta, sa.Tumba, sa.Server, sa.pendiente = "lobby", 0, time.Time{}, 0, 0, false
			sa.Ev = nil
			sa.kernelRonda, sa.kernelUsos = 0, 0
			for _, j := range sa.Jug {
				j.Puntos, j.Ataques, j.Atacado, j.Mensaje = 0, 0, nil, ""
				j.EscudoRonda, j.EscudoHasta = 0, time.Time{}
				j.SuperUsado = false
				j.Derribado, j.Verdugos = false, nil
			}
		case "sin_cura":
			sa.sellarEma(!sa.SinCura, now)
		case "limpiar":
			if sa.Fase == "ataque" || sa.Fase == "defensa" {
				writeErr(w, 409, "ronda_en_curso", "espera a que termine la ronda para quitar a los ausentes")
				return
			}
			sa.quitarAusentes(p.ID, now)
		case "mover":
			j := sa.porN(in.N)
			if j == nil || (in.Equipo != "tumba" && in.Equipo != "server") {
				writeErr(w, 400, "mover_invalido", "jugador o equipo no válido")
				return
			}
			if j.Equipo != in.Equipo {
				j.Equipo = in.Equipo
				if in.Equipo == "server" && j.Lab == "" {
					j.Lab, j.Salud = "preparando", "?"
					go s.prepararLab(sa, j.ID)
				}
			}
		}
		writeJSON(w, 200, sa.vista(p, now))
	default:
		sa.mu.Unlock()
		writeErr(w, 400, "accion_invalida", "acción desconocida")
	}
}

func (s *Server) arenaUnir(w http.ResponseWriter, sa *salaArena, p *Principal, equipo string, now time.Time) {
	defer sa.mu.Unlock()
	if equipo != "tumba" && equipo != "server" {
		writeErr(w, 400, "equipo_invalido", "elige tumba o server")
		return
	}
	yo := sa.Jug[p.ID]
	if yo == nil {
		if len(sa.Jug) >= arenaMax {
			writeErr(w, 409, "sala_llena", "la arena está llena")
			return
		}
		nombre := strings.Join(strings.Fields(p.Name), " ")
		if nombre == "" {
			nombre = "Monito"
		}
		if utf8.RuneCountInString(nombre) > 22 {
			nombre = string([]rune(nombre)[:22])
		}
		yo = &arenaJugador{ID: p.ID, N: sa.sigN, Nombre: nombre, Staff: p.Staff(), Visto: now, Atacado: map[string]bool{}}
		sa.sigN++
		sa.Jug[p.ID] = yo
	} else if yo.Equipo != equipo && (sa.Fase == "ataque" || sa.Fase == "defensa") {
		writeErr(w, 409, "ronda_en_curso", "no puedes cambiar de equipo a media ronda")
		return
	}
	if yo.Equipo != equipo {
		yo.Equipo = equipo
		texto := "se unió al equipo Tumba Server 🐒"
		if equipo == "server" {
			texto = "se unió al equipo Server 🛡️"
			if yo.Lab == "" || yo.Lab == "error" {
				yo.Lab, yo.Salud = "preparando", "?"
				go s.prepararLab(sa, p.ID)
			}
		}
		sa.evento(arenaEvento{Tipo: "union", De: yo.N, Texto: yo.Nombre + " " + texto}, now)
	}
	writeJSON(w, 200, sa.vista(p, now))
}

func (s *Server) arenaAtacar(w http.ResponseWriter, sa *salaArena, p *Principal, objetivo int, ataque string, now time.Time) {
	yo := sa.Jug[p.ID]
	script, ok := arenaAtaques[ataque]
	switch {
	case yo == nil || yo.Equipo != "tumba":
		sa.mu.Unlock()
		writeErr(w, 409, "no_atacante", "solo el equipo Tumba Server ataca")
		return
	case !ok:
		sa.mu.Unlock()
		writeErr(w, 400, "ataque_invalido", "ataque desconocido")
		return
	case sa.Fase != "ataque":
		sa.mu.Unlock()
		writeErr(w, 409, "no_es_tu_turno", "espera tu turno: ahora no le toca atacar al equipo Tumba")
		return
	case yo.Ataques >= arenaAtaquesMax:
		sa.mu.Unlock()
		writeErr(w, 409, "sin_ataques", fmt.Sprintf("ya usaste tus %d ataques de esta ronda", arenaAtaquesMax))
		return
	}
	d := sa.porN(objetivo)
	if d == nil || d.Equipo != "server" || d.Lab != "listo" {
		sa.mu.Unlock()
		writeErr(w, 409, "objetivo_invalido", "ese servidor no existe o todavía se está preparando")
		return
	}
	if d.EscudoHasta.After(now) {
		faltan := int(d.EscudoHasta.Sub(now).Seconds()) + 1
		sa.mu.Unlock()
		writeErr(w, 409, "con_escudo", fmt.Sprintf("%s cerró sus conexiones: prueba en %d s o ataca a otro (no gastaste tu ataque)", d.Nombre, faltan))
		return
	}
	yo.Ataques++
	yo.Objetivo = objetivo
	if d.Atacado == nil {
		d.Atacado = map[string]bool{}
	}
	d.Atacado[p.ID] = true
	sa.evento(arenaEvento{Tipo: "ataque", De: yo.N, A: d.N, Accion: ataque, Texto: yo.Nombre + " " + arenaNombreAtaque[ataque] + " " + d.Nombre}, now)
	vista := sa.vista(p, now)
	destinoID := d.ID
	destino := aula.Nombre(destinoID)
	sa.mu.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		_, _ = s.Aula.Exec(ctx, destino, script)
		s.revisarYa(sa, destinoID)
	}()
	writeJSON(w, 200, vista)
}

// arenaEscudar: el defensor cierra sus conexiones externas unos segundos (una vez por ronda, solo mientras atacan).
// Mientras dura, los ataques a su servidor rebotan sin gastar el ataque del mono. No cura nada: solo gana tiempo.
func (s *Server) arenaEscudar(w http.ResponseWriter, sa *salaArena, p *Principal, now time.Time) {
	defer sa.mu.Unlock()
	yo := sa.Jug[p.ID]
	switch {
	case yo == nil || yo.Equipo != "server":
		writeErr(w, 409, "no_defensor", "solo el equipo Server puede cerrar conexiones")
		return
	case yo.Lab != "listo":
		writeErr(w, 409, "sin_lab", "tu servidor todavía se está preparando")
		return
	case sa.Fase != "ataque":
		writeErr(w, 409, "no_es_el_momento", "el escudo se usa mientras ataca el equipo Tumba")
		return
	case yo.EscudoRonda == sa.Ronda:
		writeErr(w, 409, "escudo_usado", "ya cerraste tus conexiones en esta ronda")
		return
	}
	yo.EscudoRonda, yo.EscudoHasta = sa.Ronda, now.Add(arenaEscudo)
	sa.evento(arenaEvento{Tipo: "defensa", De: yo.N, A: yo.N, Accion: "escudo", Texto: fmt.Sprintf("%s cerró sus conexiones externas por %d s 🛡️", yo.Nombre, int(arenaEscudo.Seconds()))}, now)
	writeJSON(w, 200, sa.vista(p, now))
}

// arenaKernelPanic: apaga la app de todos los servidores listos y sin escudo, de un golpe. Una vez por
// ronda y dos por partida para todo el equipo Tumba (o el instructor); a quien lo lanza le gasta sus ataques del turno. Es el ataque
// que tiene botón de cura («Reiniciar app»): obliga a todos a reaccionar sin dejar a nadie sin salida.
func (s *Server) arenaKernelPanic(w http.ResponseWriter, sa *salaArena, p *Principal, now time.Time) {
	yo := sa.Jug[p.ID]
	esTumba := yo != nil && yo.Equipo == "tumba"
	switch {
	case !esTumba && !p.Staff():
		sa.mu.Unlock()
		writeErr(w, 409, "no_atacante", "solo el equipo Tumba Server (o el instructor) provoca un kernel panic")
		return
	case sa.Fase != "ataque":
		sa.mu.Unlock()
		writeErr(w, 409, "no_es_tu_turno", "el kernel panic solo se lanza en el turno de ataque")
		return
	case sa.kernelUsos >= arenaKernelMax:
		sa.mu.Unlock()
		writeErr(w, 409, "kernel_agotado", fmt.Sprintf("el kernel panic ya se usó %d veces en esta partida", arenaKernelMax))
		return
	case sa.kernelRonda == sa.Ronda:
		sa.mu.Unlock()
		writeErr(w, 409, "kernel_usado", "ya hubo un kernel panic en esta ronda")
		return
	case esTumba && yo.Ataques > 0:
		sa.mu.Unlock()
		writeErr(w, 409, "sin_ataques", "el kernel panic pide tus ataques completos: ya gastaste uno en esta ronda")
		return
	}
	sa.kernelRonda = sa.Ronda
	sa.kernelUsos++
	quien, de := "El instructor", -1
	if esTumba {
		yo.Ataques = arenaAtaquesMax
		quien, de = yo.Nombre, yo.N
	}
	var ids []string
	salvados := 0
	for _, d := range sa.Jug {
		if d.Equipo != "server" || d.Lab != "listo" {
			continue
		}
		if d.EscudoHasta.After(now) {
			salvados++
			continue
		}
		if d.Atacado == nil {
			d.Atacado = map[string]bool{}
		}
		d.Atacado[p.ID] = true
		ids = append(ids, d.ID)
	}
	texto := fmt.Sprintf("%s provocó un KERNEL PANIC 💥: se apagaron %d servidores de golpe (quedan %d)", quien, len(ids), arenaKernelMax-sa.kernelUsos)
	if salvados > 0 {
		texto += fmt.Sprintf(" (%d se salvaron con el escudo)", salvados)
	}
	sa.evento(arenaEvento{Tipo: "ataque", De: de, A: -1, Accion: "kernel", Texto: texto}, now)
	vista := sa.vista(p, now)
	sa.mu.Unlock()
	script := arenaAtaques["apagar"]
	for _, id := range ids {
		go func(id string) {
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			_, _ = s.Aula.Exec(ctx, aula.Nombre(id), script)
			s.revisarYa(sa, id)
		}(id)
	}
	writeJSON(w, 200, vista)
}

func (s *Server) arenaDefender(w http.ResponseWriter, sa *salaArena, p *Principal, defensa string, now time.Time) {
	yo := sa.Jug[p.ID]
	script, ok := arenaDefensas[defensa]
	switch {
	case yo == nil || yo.Equipo != "server":
		sa.mu.Unlock()
		writeErr(w, 409, "no_defensor", "solo el equipo Server defiende")
		return
	case !ok:
		sa.mu.Unlock()
		writeErr(w, 400, "defensa_invalida", "defensa desconocida")
		return
	case sa.SinCura:
		sa.mu.Unlock()
		writeErr(w, 409, "sin_cura", "Ema está sellado: en esta partida nadie cura. Lo que cae, queda caído")
		return
	case sa.Fase != "defensa":
		sa.mu.Unlock()
		writeErr(w, 409, "no_es_tu_turno", "espera tu turno: los botones se encienden en la defensa")
		return
	case yo.Lab != "listo":
		sa.mu.Unlock()
		writeErr(w, 409, "sin_lab", "tu servidor todavía se está preparando")
		return
	}
	n, nombre := yo.N, yo.Nombre
	sa.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	out, err := s.Aula.Exec(ctx, aula.Nombre(p.ID), script)
	msg := "Listo: " + arenaNombreDefensa[defensa] + "."
	if err != nil || !strings.Contains(out, "OK") {
		msg = "No funcionó a la primera. Pídele ayuda a DeepSeek Harness."
	}
	s.revisarYa(sa, p.ID)

	sa.mu.Lock()
	defer sa.mu.Unlock()
	now = time.Now()
	if yo := sa.Jug[p.ID]; yo != nil {
		yo.Mensaje = msg
	}
	sa.evento(arenaEvento{Tipo: "defensa", De: n, A: n, Accion: defensa, Texto: nombre + " " + arenaNombreDefensa[defensa]}, now)
	writeJSON(w, 200, sa.vista(p, now))
}
