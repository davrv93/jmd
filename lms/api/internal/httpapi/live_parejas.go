package httpapi

import (
	"math/rand"
	"net/http"
	"time"
	"unicode/utf8"
)

// emparejar baraja los subs con la semilla y los agrupa de dos en dos. Si sobra uno se une al último
// grupo (queda un trío); con un solo sub, un grupo de uno. Es pura: la misma semilla da lo mismo.
func emparejar(subs []string, semilla int64) [][]string {
	if len(subs) == 0 {
		return [][]string{}
	}
	b := append([]string(nil), subs...)
	rand.New(rand.NewSource(semilla)).Shuffle(len(b), func(i, j int) { b[i], b[j] = b[j], b[i] })
	grupos := [][]string{}
	for i := 0; i+1 < len(b); i += 2 {
		grupos = append(grupos, []string{b[i], b[i+1]})
	}
	if len(b)%2 == 1 {
		if len(grupos) == 0 {
			grupos = append(grupos, []string{b[len(b)-1]})
		} else {
			grupos[len(grupos)-1] = append(grupos[len(grupos)-1], b[len(b)-1])
		}
	}
	return grupos
}

// parejaVista es lo que ve un alumno: con quién le toca y dónde está el visor del compañero.
type parejaVista struct {
	Con   []map[string]string `json:"con"`
	Vista string              `json:"vista"`
}

// parejaDe arma la vista de `sub` dentro de su grupo (los demás integrantes).
func parejaDe(grupo []alumnoLive, sub string) parejaVista {
	v := parejaVista{Con: []map[string]string{}}
	for _, a := range grupo {
		if a.Sub == sub {
			continue
		}
		v.Con = append(v.Con, map[string]string{"sub": a.Sub, "nombre": a.Nombre})
		if v.Vista == "" {
			v.Vista = "/vista/" + a.Sub + "/"
		}
	}
	return v
}

// liveEmparejar: POST /api/v1/live/{lesson}/emparejar (staff). Forma grupos con los alumnos presentes,
// avisa a cada uno con el evento `pareja` y devuelve todos los grupos. Se guarda en memoria.
func (s *Server) liveEmparejar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	ahora := time.Now().UTC()
	vivos := s.presencia.vivos(l.ID, ahora)
	nombres := map[string]string{}
	subs := make([]string, len(vivos))
	for i, v := range vivos {
		subs[i], nombres[v.Sub] = v.Sub, v.Nombre
	}
	grupos := [][]alumnoLive{}
	for _, g := range emparejar(subs, ahora.UnixNano()) {
		gr := make([]alumnoLive, len(g))
		for i, sub := range g {
			gr[i] = alumnoLive{Sub: sub, Nombre: nombres[sub]}
		}
		grupos = append(grupos, gr)
	}
	s.presMu.Lock()
	if s.parejas == nil {
		s.parejas = map[string][][]alumnoLive{}
	}
	s.parejas[l.ID] = grupos
	s.presMu.Unlock()
	for _, g := range grupos {
		for _, a := range g {
			s.live.publishUser(l.ID, a.Sub, "pareja", parejaDe(g, a.Sub))
		}
	}
	writeJSON(w, 200, map[string]any{"grupos": grupos})
}

// liveParejaGet: GET /api/v1/live/{lesson}/pareja. Con quién le toca al que pregunta (lista vacía si nadie).
func (s *Server) liveParejaGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	s.presMu.Lock()
	grupos := s.parejas[l.ID]
	s.presMu.Unlock()
	for _, g := range grupos {
		for _, a := range g {
			if a.Sub == p.ID {
				writeJSON(w, 200, parejaDe(g, p.ID))
				return
			}
		}
	}
	writeJSON(w, 200, parejaVista{Con: []map[string]string{}})
}

// liveMensaje: POST /api/v1/live/{lesson}/mensaje (staff) {"texto","para":"todos"|"<sub>"}.
// A todos: se guarda en el estado (lo ve quien entre tarde) y viaja en `estado`. A uno: solo el evento `mensaje`.
func (s *Server) liveMensaje(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Texto string `json:"texto"`
		Para  string `json:"para"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if n := utf8.RuneCountInString(in.Texto); n > 200 {
		writeErr(w, 400, "texto_largo", "el mensaje admite hasta 200 caracteres")
		return
	}
	if in.Para == "" {
		in.Para = "todos"
	}
	if in.Para != "todos" {
		s.live.publishUser(l.ID, in.Para, "mensaje", map[string]any{"texto": in.Texto})
		writeJSON(w, 200, map[string]any{"ok": true})
		return
	}
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	if err != nil {
		internal(w, err)
		return
	}
	sv.Mensaje = in.Texto
	if err := s.DB.UpsertLiveSession(r.Context(), sv); err != nil {
		internal(w, err)
		return
	}
	s.live.publish(l.ID, "estado", liveView(sv, s.live.count(l.ID)))
	writeJSON(w, 200, map[string]any{"ok": true})
}
