package httpapi

// Arena del monito (Laboratorio de caos · «Suelta al monito»).
//
// Dos equipos por lección: «tumba» (Monito Tumba Server) ataca y «server» (Monito Server) defiende.
// Cada defensor tiene en SU aula un servidor de práctica real (/trabajo/monito: una tiendita en Bun con
// SQLite en 127.0.0.1:7070 y un respaldo). Los atacantes no necesitan aula: eligen un servidor y un
// ataque, y el LMS lo ejecuta en el aula de ese defensor con docker exec. Va por turnos:
//
//	lobby → ataque (35 s) → defensa (75 s) → marcador → (el instructor abre la ronda siguiente)
//
// Durante la defensa el defensor puede usar dos botones (reiniciar la app, limpiar el disco); las otras
// dos fallas (base borrada, app atascada) se curan con prompts en DeepSeek Harness, que lee la skill
// monito-server que el LMS deja en /trabajo/.agents/skills. Un vigía revisa la salud de cada servidor
// cada pocos segundos; al cerrar la defensa, cada servidor sano suma 100 al equipo Server y cada uno
// caído suma 100 al equipo Tumba (repartidos entre quienes lo atacaron esa ronda).
//
// Seguridad: los ataques son scripts fijos (el cliente solo elige el nombre), nunca texto del alumno.
// El disco se llena solo en /tmp (tmpfs de 64 MB por aula) y deja 4 MB libres; nada toca /trabajo salvo
// la carpeta del laboratorio. Ningún ataque usa CPU ni red: el servidor compartido no lo nota.
//
// GET  /api/v1/live/{lesson}/arena            estado
// POST /api/v1/live/{lesson}/arena {accion}   unir | atacar | defender | iniciar | siguiente | reiniciar | mover

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
	arenaDefensa    = 75 * time.Second
	arenaMax        = 40
	arenaAtaquesMax = 2 // por atacante y por turno de ataque
	arenaMaxEv      = 60
	arenaVigiaCada  = 4 * time.Second
	arenaVigiaFin   = 20 * time.Minute // sin peticiones, el vigía se apaga
	arenaPuntos     = 100
	arenaLibreMinMB = 8 // la app se declara enferma con menos de esto libre en /tmp
)

var arenaCuota = cuota{cap: 30, porSeg: 8}

// Ataques: nombre → script fijo que se corre en el aula del defensor. Los cuatro primeros tienen botón o
// receta en la skill; los otros seis no: el equipo Server tiene que investigar (síntoma en el panel, causa en
// /salud, en config/, en los procesos o en la base). Todos acotados: el disco deja 4 MB libres en /tmp, los
// clones no pasan de 12 (24 procesos de 256) y nada usa CPU ni red.
var arenaAtaques = map[string]string{
	"apagar":  `pkill -f "[m]onito/servidor.js"; true`,
	"disco":   `a=$(df -m /tmp | awk 'NR==2{print $4}'); n=$((a-4)); [ "$n" -gt 0 ] && dd if=/dev/zero of=/tmp/.monito-relleno-$(date +%s) bs=1M count=$n 2>/dev/null; true`,
	"base":    `rm -f /trabajo/monito/tienda.db; true`,
	"atascar": `mkdir -p /trabajo/monito/config && echo "el monito estuvo aquí" > /trabajo/monito/config/lento.flag`,
	"fuga":    `cd /trabajo/monito && mkdir -p publico && [ -s tienda.db ] && cp tienda.db publico/clientes-$(date +%s).db; true`,
	"clones": `n=$(pgrep -f "[m]onito-clon" | wc -l); i=0
while [ $((n+i)) -lt 12 ] && [ $i -lt 6 ]; do (nohup sh -c 'while :; do sleep 30; done' monito-clon >/dev/null 2>&1 &); i=$((i+1)); done; true`,
	"pesados": `mkdir -p /tmp/subidas; a=$(df -m /tmp | awk 'NR==2{print $4}'); n=$((a-4)); i=0
while [ "$n" -ge 5 ]; do dd if=/dev/zero of=/tmp/subidas/foto-$(date +%s)-$i.raw bs=1M count=5 2>/dev/null || break; n=$((n-5)); i=$((i+1)); done; true`,
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
const arenaChequeo = `cd /trabajo/monito 2>/dev/null || { echo SIN_LAB; exit 0; }
pgrep -f "[m]onito/servidor.js" >/dev/null && echo APP_SI || echo APP_NO
curl -s -m 3 -w '\nHTTP_%{http_code}\n' http://127.0.0.1:7070/salud
[ -f config/lento.flag ] && echo LENTO
df -m /tmp | awk 'NR==2{print "LIBRE_"$4}'
[ -s tienda.db ] && echo BASE_SI || echo BASE_NO
[ "$(pgrep -f "[m]onito-clon" | wc -l)" -ge 2 ] && echo CLONES
true`

type arenaJugador struct {
	ID       string
	N        int
	Nombre   string
	Equipo   string // tumba | server
	Staff    bool
	Visto    time.Time
	Puntos   int
	Ataques  int    // usados en el turno de ataque actual
	Lab      string // server: preparando | listo | error
	Salud    string // server: ok | caido | ? (sin chequear)
	Fallas   []string
	Chequeo  time.Time
	Atacado  map[string]bool // ids de quienes lo atacaron esta ronda
	Mensaje  string          // último resultado de una defensa con botón
	Objetivo int             // tumba: n del servidor que eligió (solo para la UI)
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
	mu        sync.Mutex
	Leccion   string
	Fase      string // lobby | ataque | defensa | marcador
	Ronda     int
	Hasta     time.Time
	Jug       map[string]*arenaJugador
	sigN      int
	Ev        []arenaEvento
	sigEv     int
	Tumba     int
	Server    int
	pendiente bool // hay que puntuar la ronda con el próximo chequeo completo
	vigia     bool
	ultimaPet time.Time
	cuotas    map[string]*cubeta
}

var salasArena = struct {
	sync.Mutex
	m map[string]*salaArena
}{m: map[string]*salaArena{}}

func salaArenaDe(leccion string) *salaArena {
	salasArena.Lock()
	defer salasArena.Unlock()
	s := salasArena.m[leccion]
	if s == nil {
		s = &salaArena{Leccion: leccion, Fase: "lobby", Jug: map[string]*arenaJugador{}, cuotas: map[string]*cubeta{}}
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

func (s *salaArena) abrirRonda(now time.Time) {
	s.Ronda++
	s.Fase, s.Hasta = "ataque", now.Add(arenaAtaque)
	s.pendiente = false
	for _, j := range s.Jug {
		j.Ataques, j.Atacado, j.Mensaje = 0, map[string]bool{}, ""
	}
	s.evento(arenaEvento{Tipo: "fase", Accion: "ataque", Texto: fmt.Sprintf("Ronda %d: ¡ataca el equipo Tumba Server!", s.Ronda)}, now)
}

func (s *salaArena) abrirDefensa(now time.Time) {
	s.Fase, s.Hasta = "defensa", now.Add(arenaDefensa)
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
		if d.Salud == "ok" {
			sanos++
			d.Puntos += arenaPuntos
			rs += arenaPuntos
			continue
		}
		caidos++
		rt += arenaPuntos
		var quienes []*arenaJugador
		for id := range d.Atacado {
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
			}
		}
		if sa.Fase == "marcador" {
			sa.puntuar(now)
		}
		sa.mu.Unlock()
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
	sa := salaArenaDe(l.ID)
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
			x["lab"], x["salud"], x["fallas"] = j.Lab, j.Salud, j.Fallas
		} else {
			x["ataques"] = j.Ataques
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
	}
	if yo := sa.Jug[p.ID]; yo != nil {
		out["yo"] = map[string]any{"n": yo.N, "equipo": yo.Equipo, "ataques": yo.Ataques, "lab": yo.Lab,
			"salud": yo.Salud, "fallas": yo.Fallas, "mensaje": yo.Mensaje, "puntos": yo.Puntos}
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
	case "iniciar", "siguiente", "reiniciar", "mover":
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
			sa.abrirRonda(now)
		case "siguiente":
			switch sa.Fase {
			case "ataque":
				sa.abrirDefensa(now)
			case "defensa":
				sa.cerrarRonda(now)
			default:
				sa.puntuar(now)
				sa.abrirRonda(now)
			}
		case "reiniciar":
			sa.Fase, sa.Ronda, sa.Hasta, sa.Tumba, sa.Server, sa.pendiente = "lobby", 0, time.Time{}, 0, 0, false
			sa.Ev = nil
			for _, j := range sa.Jug {
				j.Puntos, j.Ataques, j.Atacado, j.Mensaje = 0, 0, nil, ""
			}
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
	yo.Ataques++
	yo.Objetivo = objetivo
	if d.Atacado == nil {
		d.Atacado = map[string]bool{}
	}
	d.Atacado[p.ID] = true
	sa.evento(arenaEvento{Tipo: "ataque", De: yo.N, A: d.N, Accion: ataque, Texto: yo.Nombre + " " + arenaNombreAtaque[ataque] + " " + d.Nombre}, now)
	vista := sa.vista(p, now)
	destino := aula.Nombre(d.ID)
	sa.mu.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		_, _ = s.Aula.Exec(ctx, destino, script)
	}()
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

	sa.mu.Lock()
	defer sa.mu.Unlock()
	now = time.Now()
	if yo := sa.Jug[p.ID]; yo != nil {
		yo.Mensaje = msg
	}
	sa.evento(arenaEvento{Tipo: "defensa", De: n, A: n, Accion: defensa, Texto: nombre + " " + arenaNombreDefensa[defensa]}, now)
	writeJSON(w, 200, sa.vista(p, now))
}
