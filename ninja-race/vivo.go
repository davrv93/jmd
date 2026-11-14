package main

// Panel del instructor en vivo: un WebSocket que empuja el estado de la carrera
// (quién corre ahora y con qué puntaje, el ranking y los ganadores
// provisionales) y el cierre con cálculo de premios.
//
// El navegador no puede mandar la cabecera X-Clave en un WebSocket, así que el
// primer mensaje es {"clave": "…"}; sin él en 5 s se corta. Cada cambio de
// estado llama a s.avisar(), que no bloquea: un bucle junta los avisos (como
// mucho 4 envíos por segundo) y manda la foto a todos los paneles abiertos.

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/coder/websocket"
)

type vivo struct {
	mu      sync.Mutex
	paneles map[*websocket.Conn]struct{}
	cambios chan struct{}
}

func nuevoVivo() *vivo {
	return &vivo{paneles: map[*websocket.Conn]struct{}{}, cambios: make(chan struct{}, 1)}
}

// avisar: hubo un cambio; el bucle lo manda a los paneles. Nunca bloquea y se
// puede llamar con s.mu tomado.
func (s *Servidor) avisar() {
	if s.vivo == nil {
		return
	}
	select {
	case s.vivo.cambios <- struct{}{}:
	default:
	}
}

// bucleVivo junta los avisos y manda la foto a todos los paneles.
func (s *Servidor) bucleVivo() {
	for range s.vivo.cambios {
		time.Sleep(250 * time.Millisecond)
		s.mu.Lock()
		foto, _ := json.Marshal(s.fotoVivo())
		s.mu.Unlock()
		s.vivo.mu.Lock()
		paneles := make([]*websocket.Conn, 0, len(s.vivo.paneles))
		for c := range s.vivo.paneles {
			paneles = append(paneles, c)
		}
		s.vivo.mu.Unlock()
		for _, c := range paneles {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			if err := c.Write(ctx, websocket.MessageText, foto); err != nil {
				s.vivo.mu.Lock()
				delete(s.vivo.paneles, c)
				s.vivo.mu.Unlock()
				c.CloseNow()
			}
			cancel()
		}
	}
}

// ranking: quienes tienen una carrera válida, del mejor puntaje al peor (a
// igual puntaje, quien se inscribió antes). Con s.mu tomado.
func (s *Servidor) ranking() []int {
	idx := []int{}
	for i, j := range s.e.Jugadores {
		if j.MejorValido > 0 {
			idx = append(idx, i)
		}
	}
	sort.SliceStable(idx, func(a, b int) bool {
		ja, jb := s.e.Jugadores[idx[a]], s.e.Jugadores[idx[b]]
		if ja.MejorValido != jb.MejorValido {
			return ja.MejorValido > jb.MejorValido
		}
		return ja.CreadoEn.Before(jb.CreadoEn)
	})
	return idx
}

// fotoVivo: lo que ve el panel. Con s.mu tomado.
func (s *Servidor) fotoVivo() map[string]any {
	cfg := s.e.Config
	corriendo := map[int]corrida{}
	for id, a := range s.activas {
		corriendo[id] = a
	}
	jugadores := []map[string]any{}
	puesto := map[int]int{}
	provisional := map[string]string{}
	cupos := map[string]int{cfg.Curso: s.quedan100De(cfg.Curso), cfg.CursoOtro: s.quedan100De(cfg.CursoOtro)}
	for k, i := range s.ranking() {
		j := s.e.Jugadores[i]
		puesto[j.ID] = k + 1
		curso := cfg.Curso
		if cfg.excluido(j.Nombre, j.Telefono) {
			curso = cfg.CursoOtro
		}
		if !j.Gano && cupos[curso] > 0 && provisional[curso] == "" {
			provisional[curso] = j.Nombre
		}
	}
	for _, j := range s.e.Jugadores {
		fila := map[string]any{
			"id": j.ID, "nombre": j.Nombre, "telefono": j.Telefono, "carreras": j.Carreras,
			"mejor": j.MejorPuntaje, "mejor_valido": j.MejorValido, "puesto": puesto[j.ID],
			"excluido": cfg.excluido(j.Nombre, j.Telefono), "gano": j.Gano,
		}
		if a, ok := corriendo[j.ID]; ok {
			fila["corriendo"] = true
			fila["vivo_puntaje"] = a.Puntaje
			fila["vivo_ms"] = int(s.ahora().Sub(a.Inicio).Milliseconds())
		}
		jugadores = append(jugadores, fila)
	}
	sort.SliceStable(jugadores, func(a, b int) bool {
		pa, pb := jugadores[a]["puesto"].(int), jugadores[b]["puesto"].(int)
		if (pa == 0) != (pb == 0) {
			return pa != 0
		}
		return pa < pb
	})
	return map[string]any{
		"tipo": "foto", "ahora": s.ahora().UTC(), "cerrado": cfg.cerrada(s.ahora()),
		"solo_manual": cfg.SoloManual, "al_cierre": cfg.AlCierre,
		"curso": cfg.Curso, "curso_otro": cfg.CursoOtro, "min_ms": cfg.MinMs,
		"carreras": s.e.CarrerasTotal, "en_pista": len(s.activas), "record": s.e.Record,
		"jugadores": jugadores, "provisional": provisional, "ganadores": s.e.Ganadores,
	}
}

// panelVivo: GET /api/admin/vivo (WebSocket).
func (s *Servidor) panelVivo(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	c.SetReadLimit(4096)
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	_, msg, err := c.Read(ctx)
	cancel()
	var hola struct {
		Clave string `json:"clave"`
	}
	if err != nil || json.Unmarshal(msg, &hola) != nil || hola.Clave == "" ||
		subtle.ConstantTimeCompare([]byte(hola.Clave), []byte(s.clave)) != 1 {
		time.Sleep(400 * time.Millisecond)
		c.Close(websocket.StatusPolicyViolation, "clave incorrecta")
		return
	}
	s.vivo.mu.Lock()
	s.vivo.paneles[c] = struct{}{}
	s.vivo.mu.Unlock()
	s.avisar()
	defer func() {
		s.vivo.mu.Lock()
		delete(s.vivo.paneles, c)
		s.vivo.mu.Unlock()
		c.CloseNow()
	}()
	// Solo se lee para saber cuándo se cierra el panel; además un latido cada
	// 25 s mantiene viva la conexión a través de nginx.
	go func() {
		t := time.NewTicker(25 * time.Second)
		defer t.Stop()
		for range t.C {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			err := c.Ping(ctx)
			cancel()
			if err != nil {
				return
			}
		}
	}()
	for {
		if _, _, err := c.Read(r.Context()); err != nil {
			return
		}
	}
}

// cerrarYCalcular cierra el sorteo y, si los premios van al cierre, los reparte
// por el ranking: el mejor de cada curso se lleva el 100 % (mientras haya
// cupo) y el resto, el descuento aleatorio de su curso. Con s.mu tomado.
// Devuelve los premios nuevos (los códigos se piden después, sin el candado).
func (s *Servidor) cerrarYCalcular() []Ganador {
	cfg := &s.e.Config
	cfg.Cerrado = true
	if !cfg.AlCierre {
		return nil
	}
	nuevos := []Ganador{}
	for k, i := range s.ranking() {
		j := &s.e.Jugadores[i]
		if j.Gano {
			continue
		}
		excluido := cfg.excluido(j.Nombre, j.Telefono)
		curso := cfg.Curso
		if excluido {
			curso = cfg.CursoOtro
		}
		desc := 100
		if s.quedan100De(curso) <= 0 {
			desc = cfg.DescMin + s.azar(cfg.DescMax-cfg.DescMin+1)
		}
		nuevos = append(nuevos, *s.anotar(j, desc, curso, j.MejorValido, k+1, excluido))
	}
	return nuevos
}

// cerrarSiEsLaHora: con cierre automático y premios al cierre, al llegar la
// hora cierra y reparte como el botón del panel. Devuelve si cerró.
func (s *Servidor) cerrarSiEsLaHora() bool {
	s.mu.Lock()
	cfg := s.e.Config
	if cfg.Cerrado || cfg.SoloManual || !cfg.AlCierre || cfg.Cierre.IsZero() || s.ahora().Before(cfg.Cierre) {
		s.mu.Unlock()
		return false
	}
	nuevos := s.cerrarYCalcular()
	s.guardar()
	s.mu.Unlock()
	log.Printf("cierre automático a las %s: premios calculados", horaLima(cfg.Cierre))
	s.avisar()
	s.emitirCodigos(nuevos)
	return true
}

// emitirCodigos pide a la API del sorteo el cupón de cada premio nuevo.
func (s *Servidor) emitirCodigos(nuevos []Ganador) {
	for _, g := range nuevos {
		s.entregarCodigo(g, map[string]any{})
		s.avisar()
	}
	if len(nuevos) > 0 {
		log.Printf("cierre: %d premios calculados y sus códigos pedidos", len(nuevos))
	}
}
