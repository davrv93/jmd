package httpapi

// Arena del monito, segunda parte: el superpoder del equipo Tumba, la limpieza de ausentes y la sala
// guardada en disco.
//
// Golpe Ozaru (POST {accion: "super", objetivo, ataque}): una vez por partida, cada mono del equipo Tumba
// se transforma con la luna. Su golpe atraviesa el escudo del defensor y deja dos fallas a la vez: la que
// eligió y la app apagada (si eligió apagar, la app atascada). No gasta sus ataques de la ronda. Sigue
// siendo seguro: son los mismos scripts fijos de arenaAtaques, uno después del otro.
//
// Sala en disco: la sala vivía solo en memoria y un reinicio del LMS dejaba la arena vacía a media clase.
// Ahora el vigía la escribe en <datos>/arena-<lección>.json cada vez que cambia y se vuelve a leer al
// crearla. Un archivo de más de arenaGuardadoVale se ignora: es de otra clase.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

const (
	arenaGuardadoVale = 3 * time.Hour
	arenaAusente      = 2 * time.Minute // «Quitar ausentes» saca a quien no se ve hace más de esto
)

// arenaSuperSegunda: la falla que acompaña a la elegida en el Golpe Ozaru.
func arenaSuperSegunda(ataque string) string {
	if ataque == "apagar" {
		return "atascar"
	}
	return "apagar"
}

func (s *Server) arenaSuper(w http.ResponseWriter, sa *salaArena, p *Principal, objetivo int, ataque string, now time.Time) {
	yo := sa.Jug[p.ID]
	script, ok := arenaAtaques[ataque]
	switch {
	case yo == nil || yo.Equipo != "tumba":
		sa.mu.Unlock()
		writeErr(w, 409, "no_atacante", "el Golpe Ozaru es del equipo Tumba Server")
		return
	case !ok:
		sa.mu.Unlock()
		writeErr(w, 400, "ataque_invalido", "ataque desconocido")
		return
	case sa.Fase != "ataque":
		sa.mu.Unlock()
		writeErr(w, 409, "no_es_tu_turno", "el Golpe Ozaru solo sale de noche: espera el turno de ataque")
		return
	case yo.SuperUsado:
		sa.mu.Unlock()
		writeErr(w, 409, "super_usado", "ya usaste tu Golpe Ozaru en esta partida")
		return
	}
	d := sa.porN(objetivo)
	if d == nil || d.Equipo != "server" || d.Lab != "listo" {
		sa.mu.Unlock()
		writeErr(w, 409, "objetivo_invalido", "elige primero un servidor que ya esté listo (no gastaste tu superpoder)")
		return
	}
	segunda := arenaSuperSegunda(ataque)
	conEscudo := d.EscudoHasta.After(now)
	yo.SuperUsado = true
	yo.Objetivo = objetivo
	if d.Atacado == nil {
		d.Atacado = map[string]bool{}
	}
	d.Atacado[p.ID] = true
	texto := fmt.Sprintf("%s se transformó en OZARU 🌕 y aplastó el servidor de %s: dos fallas a la vez", yo.Nombre, d.Nombre)
	if conEscudo {
		texto += " (el escudo no alcanzó)"
	}
	sa.evento(arenaEvento{Tipo: "ataque", De: yo.N, A: d.N, Accion: "super", Texto: texto}, now)
	sa.evento(arenaEvento{Tipo: "ataque", De: yo.N, A: d.N, Accion: ataque, Texto: yo.Nombre + " " + arenaNombreAtaque[ataque] + " " + d.Nombre}, now)
	sa.evento(arenaEvento{Tipo: "ataque", De: yo.N, A: d.N, Accion: segunda, Texto: yo.Nombre + " " + arenaNombreAtaque[segunda] + " " + d.Nombre}, now)
	vista := sa.vista(p, now)
	destinoID := d.ID
	destino := aula.Nombre(destinoID)
	sa.mu.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_, _ = s.Aula.Exec(ctx, destino, script)
		_, _ = s.Aula.Exec(ctx, destino, arenaAtaques[segunda])
		s.revisarYa(sa, destinoID)
	}()
	writeJSON(w, 200, vista)
}

// quitarAusentes saca de la sala a quien no se ve hace rato (cuentas de prueba, gente que se fue). Solo
// entre rondas, para no dejar un ataque sin dueño; el instructor nunca se quita a sí mismo.
func (sa *salaArena) quitarAusentes(yoID string, now time.Time) int {
	n := 0
	for id, j := range sa.Jug {
		if id == yoID || now.Sub(j.Visto) <= arenaAusente {
			continue
		}
		delete(sa.Jug, id)
		n++
	}
	if n > 0 {
		sa.evento(arenaEvento{Tipo: "union", Texto: fmt.Sprintf("El profe despejó la arena: salieron %d monitos que ya no estaban", n)}, now)
	}
	return n
}

// --- sala en disco -------------------------------------------------------------------------------

type arenaGuardada struct {
	Guardado    int64           `json:"guardado_ms"`
	Leccion     string          `json:"leccion"`
	Fase        string          `json:"fase"`
	Ronda       int             `json:"ronda"`
	Hasta       time.Time       `json:"hasta"`
	Tumba       int             `json:"tumba"`
	Server      int             `json:"server"`
	SigN        int             `json:"sig_n"`
	Pendiente   bool            `json:"pendiente"`
	KernelRonda int             `json:"kernel_ronda"`
	KernelUsos  int             `json:"kernel_usos"`
	Jug         []*arenaJugador `json:"jugadores"`
}

var arenaNoArchivo = regexp.MustCompile(`[^A-Za-z0-9_-]`)

func arenaRuta(dir, leccion string) string {
	return filepath.Join(dir, "arena-"+arenaNoArchivo.ReplaceAllString(leccion, "_")+".json")
}

// instantanea arma lo que se guarda. Se llama con el candado de la sala tomado.
func (sa *salaArena) instantanea() arenaGuardada {
	g := arenaGuardada{Leccion: sa.Leccion, Fase: sa.Fase, Ronda: sa.Ronda, Hasta: sa.Hasta, Tumba: sa.Tumba, Server: sa.Server,
		SigN: sa.sigN, Pendiente: sa.pendiente, KernelRonda: sa.kernelRonda, KernelUsos: sa.kernelUsos}
	for _, j := range sa.Jug {
		c := *j
		c.Fallas = append([]string(nil), j.Fallas...)
		c.Atacado = make(map[string]bool, len(j.Atacado))
		for k, v := range j.Atacado {
			c.Atacado[k] = v
		}
		g.Jug = append(g.Jug, &c)
	}
	return g
}

// guardarArena escribe la sala si cambió desde la última vez. Sin carpeta de datos no hace nada.
func (s *Server) guardarArena(sa *salaArena, g arenaGuardada) {
	if s.DataDir == "" {
		return
	}
	// La marca de «visto» y el chequeo cambian en cada vuelta: no cuentan como cambio.
	clave := g
	clave.Jug = make([]*arenaJugador, len(g.Jug))
	for i, j := range g.Jug {
		c := *j
		c.Visto, c.Chequeo = time.Time{}, time.Time{}
		clave.Jug[i] = &c
	}
	huella, err := json.Marshal(clave)
	if err != nil {
		return
	}
	sa.mu.Lock()
	igual := bytes.Equal(huella, sa.guardado)
	sa.mu.Unlock()
	if igual {
		return
	}
	g.Guardado = time.Now().UnixMilli()
	datos, err := json.Marshal(g)
	if err != nil {
		return
	}
	ruta := arenaRuta(s.DataDir, sa.Leccion)
	tmp := ruta + ".tmp"
	if os.WriteFile(tmp, datos, 0o600) != nil || os.Rename(tmp, ruta) != nil {
		return
	}
	sa.mu.Lock()
	sa.guardado = huella
	sa.mu.Unlock()
}

// cargarArena devuelve la sala guardada de esa lección, o nil si no hay, está vieja o no se entiende.
func cargarArena(dir, leccion string, now time.Time) *salaArena {
	if dir == "" {
		return nil
	}
	datos, err := os.ReadFile(arenaRuta(dir, leccion))
	if err != nil {
		return nil
	}
	var g arenaGuardada
	if json.Unmarshal(datos, &g) != nil || g.Leccion != leccion || now.Sub(time.UnixMilli(g.Guardado)) > arenaGuardadoVale {
		return nil
	}
	sa := &salaArena{Leccion: leccion, Fase: g.Fase, Ronda: g.Ronda, Hasta: g.Hasta, Tumba: g.Tumba, Server: g.Server,
		sigN: g.SigN, pendiente: g.Pendiente, kernelRonda: g.KernelRonda, kernelUsos: g.KernelUsos,
		Jug: map[string]*arenaJugador{}, cuotas: map[string]*cubeta{}}
	switch sa.Fase {
	case "lobby", "ataque", "defensa", "marcador":
	default:
		sa.Fase = "lobby"
	}
	for _, j := range g.Jug {
		if j == nil || j.ID == "" || (j.Equipo != "tumba" && j.Equipo != "server") || len(sa.Jug) >= arenaMax {
			continue
		}
		if j.Atacado == nil {
			j.Atacado = map[string]bool{}
		}
		if j.Fallas == nil {
			j.Fallas = []string{}
		}
		if j.Equipo == "server" && j.Lab != "listo" {
			j.Lab = "error" // nadie lo estaba preparando ya: la escena lo vuelve a pedir sola
		}
		j.Visto = now // un respiro para que su navegador vuelva a saludar antes de darlo por ausente
		sa.Jug[j.ID] = j
		if j.N >= sa.sigN {
			sa.sigN = j.N + 1
		}
	}
	if len(sa.Jug) == 0 {
		return nil
	}
	sa.evento(arenaEvento{Tipo: "union", Texto: "El servidor se reinició y la arena sigue donde estaba 🐒"}, now)
	return sa
}
