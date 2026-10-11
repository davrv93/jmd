package httpapi

import (
	"context"
	"net/http"
	"sort"
	"sync"
	"time"
)

// presente es lo que el control ve de cada alumno conectado a la clase.
type presente struct {
	Nombre       string
	Escena       string
	Visto        time.Time
	UltimoEvento string    // terminal | agente | visor | error
	UltimoT      time.Time // cuándo fue
	Errores      int       // errores seguidos; cualquier otro evento lo pone a 0
}

// semaforo resume el estado de un alumno para el instructor: verde si ya cumplió; gris si no hay
// latido hace más de 40 s; rojo con 3 errores seguidos o sin actividad en 2 minutos; ámbar en lo demás.
func semaforo(p *presente, cumplio bool, ahora time.Time) string {
	if cumplio {
		return "verde"
	}
	if ahora.Sub(p.Visto) > 40*time.Second {
		return "gris"
	}
	if p.Errores >= 3 {
		return "rojo"
	}
	ref := p.UltimoT
	if ref.IsZero() {
		ref = p.Visto
	}
	if ahora.Sub(ref) > 2*time.Minute {
		return "rojo"
	}
	return "ambar"
}

// evento registra lo último que hizo el alumno. Solo el tipo importa; el detalle no se guarda.
func (ps *presencia) evento(lesson, sub, tipo string, ahora time.Time) {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	p := ps.por[lesson][sub]
	if p == nil {
		return
	}
	p.UltimoEvento, p.UltimoT = tipo, ahora
	if tipo == "error" {
		p.Errores++
	} else {
		p.Errores = 0
	}
}

// presencia guarda, por lección, el estado de cada alumno (en memoria, no en la base).
type presencia struct {
	mu  sync.Mutex
	por map[string]map[string]*presente // lección → sub del usuario
}

func newPresencia() *presencia {
	return &presencia{por: map[string]map[string]*presente{}}
}

// latido registra (o refresca) el latido de un alumno en la lección con su escena.
func (ps *presencia) latido(lesson, sub, nombre, escena string, ahora time.Time) {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	if ps.por[lesson] == nil {
		ps.por[lesson] = map[string]*presente{}
	}
	p, ok := ps.por[lesson][sub]
	if !ok {
		p = &presente{Nombre: nombre}
		ps.por[lesson][sub] = p
	}
	p.Escena, p.Visto = escena, ahora
}

// limpiarBorrables borra los presentes con el latido más viejo que antiguedad y devuelve la lista
// de los que quedan (sub → presente).
func (ps *presencia) list(lesson string) map[string]*presente {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	out := map[string]*presente{}
	for sub, p := range ps.por[lesson] {
		out[sub] = p
	}
	return out
}

// liveEvento: POST /api/v1/live/{lesson}/evento {"tipo":"terminal|agente|visor|error","detalle":"ls"}.
func (s *Server) liveEvento(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Tipo    string `json:"tipo"`
		Detalle string `json:"detalle"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	switch in.Tipo {
	case "terminal", "agente", "visor", "error":
	default:
		writeErr(w, 400, "tipo_invalido", "el tipo debe ser terminal, agente, visor o error")
		return
	}
	if len(in.Detalle) > 80 {
		writeErr(w, 400, "detalle_largo", "el detalle admite hasta 80 caracteres")
		return
	}
	if !p.Staff() {
		s.presencia.evento(l.ID, p.ID, in.Tipo, time.Now().UTC())
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

// livePresencia: POST /api/v1/live/{lesson}/latido {"escena":"03-tu-laptop"} → {"ok":true}.
func (s *Server) liveLatido(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena string `json:"escena"`
	}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	if p.Staff() {
		// El instructor no cuenta como alumno: ni en la presencia ni en la compuerta.
		writeJSON(w, 200, map[string]any{"ok": true})
		return
	}
	s.presencia.latido(l.ID, p.ID, p.Name, in.Escena, time.Now().UTC())
	s.iniciarPresencia(l.ID)
	writeJSON(w, 200, map[string]any{"ok": true})
}

// iniciarPresencia lanza (una sola vez por lección) la difusión de presencia cada 5 s. Se llama con
// el primer latido, así que también arranca solo si el LMS se reinicia con un LIVE en marcha.
func (s *Server) iniciarPresencia(lesson string) {
	s.presMu.Lock()
	defer s.presMu.Unlock()
	if s.presStop == nil {
		s.presStop = map[string]func(){}
	}
	if s.presStop[lesson] != nil {
		return
	}
	done := make(chan struct{})
	var once sync.Once
	s.presStop[lesson] = func() { once.Do(func() { close(done) }) }
	go func() {
		t := time.NewTicker(5 * time.Second)
		defer t.Stop()
		for {
			select {
			case <-done:
				return
			case <-t.C:
				s.publicarPresencia(lesson)
			}
		}
	}()
}

// pararPresencia detiene la difusión al cerrar el LIVE; el siguiente latido la reanuda.
func (s *Server) pararPresencia(lesson string) {
	s.presMu.Lock()
	defer s.presMu.Unlock()
	if stop := s.presStop[lesson]; stop != nil {
		stop()
		delete(s.presStop, lesson)
	}
}

// presenteVista es una copia de un presente con su sub, segura de leer sin el candado.
type presenteVista struct {
	Sub string
	presente
}

// vivos borra los latidos con más de 40 s y devuelve copias de los que quedan, por nombre.
func (ps *presencia) vivos(lesson string, ahora time.Time) []presenteVista {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	out := []presenteVista{}
	for sub, p := range ps.por[lesson] {
		if ahora.Sub(p.Visto) > 40*time.Second {
			delete(ps.por[lesson], sub)
			continue
		}
		out = append(out, presenteVista{Sub: sub, presente: *p})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Nombre < out[j].Nombre })
	return out
}

// publicarPresencia manda la lista completa (con semáforo) al staff y solo el número a todos.
func (s *Server) publicarPresencia(lesson string) {
	ahora := time.Now().UTC()
	vivos := s.presencia.vivos(lesson, ahora)
	subs := make([]string, len(vivos))
	for i, v := range vivos {
		subs[i] = v.Sub
	}
	motivos := s.motivosCumplidos(context.Background(), lesson, subs)
	lista := []map[string]any{}
	for _, v := range vivos {
		lista = append(lista, map[string]any{
			"sub": v.Sub, "nombre": v.Nombre, "escena": v.Escena,
			"visto":    v.Visto.Format(time.RFC3339),
			"semaforo": semaforo(&v.presente, motivos[v.Sub] != "", ahora),
		})
	}
	s.live.publishStaff(lesson, "presencia", map[string]any{"conectados": lista})
	s.live.publish(lesson, "presencia", map[string]any{"conectados": len(vivos)})
}
