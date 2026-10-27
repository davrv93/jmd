package httpapi

import (
	"net/http"
	"regexp"
	"strings"
	"sync"
)

// votosLive guarda en memoria las votaciones de las escenas del LIVE: lección → escena → alumno → opción.
// Una escena pregunta algo con chips (¿qué máquina tienes?, ¿qué estilo eliges?), cada alumno vota una
// vez (volver a votar cambia su voto) y la escena pinta el % del grupo. No se persiste: vale lo que dura
// la clase, igual que parametrosLive.
var votosLive = struct {
	sync.Mutex
	v map[string]map[string]map[string]string
}{v: map[string]map[string]map[string]string{}}

var idVoto = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,59}$`)

type conteoVotos struct {
	Total    int            `json:"total"`
	Opciones map[string]int `json:"opciones"`
	Mia      string         `json:"mia"`
}

func contarVotos(lesson, escena, sub string) conteoVotos {
	votosLive.Lock()
	defer votosLive.Unlock()
	c := conteoVotos{Opciones: map[string]int{}}
	for alumno, opcion := range votosLive.v[lesson][escena] {
		c.Total++
		c.Opciones[opcion]++
		if alumno == sub {
			c.Mia = opcion
		}
	}
	return c
}

// liveVoto: POST /api/v1/live/{lesson}/voto {"escena":"03-tu-laptop","opcion":"sin-gpu"}. Opción vacía
// retira el voto. Devuelve el conteo actualizado.
func (s *Server) liveVoto(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena string `json:"escena"`
		Opcion string `json:"opcion"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Escena = strings.TrimSpace(in.Escena)
	in.Opcion = strings.TrimSpace(in.Opcion)
	if !idVoto.MatchString(in.Escena) || (in.Opcion != "" && !idVoto.MatchString(in.Opcion)) {
		badRequest(w, "escena y opción: minúsculas, dígitos, guion o guion bajo, hasta 60 caracteres")
		return
	}
	votosLive.Lock()
	if votosLive.v[l.ID] == nil {
		votosLive.v[l.ID] = map[string]map[string]string{}
	}
	if votosLive.v[l.ID][in.Escena] == nil {
		votosLive.v[l.ID][in.Escena] = map[string]string{}
	}
	if in.Opcion == "" {
		delete(votosLive.v[l.ID][in.Escena], p.ID)
	} else {
		votosLive.v[l.ID][in.Escena][p.ID] = in.Opcion
	}
	votosLive.Unlock()
	writeJSON(w, 200, contarVotos(l.ID, in.Escena, p.ID))
}

// liveVotos: GET /api/v1/live/{lesson}/votos?escena=… → {"total":N,"opciones":{"sin-gpu":3,…},"mia":"sin-gpu"}.
func (s *Server) liveVotos(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	escena := strings.TrimSpace(r.URL.Query().Get("escena"))
	if !idVoto.MatchString(escena) {
		badRequest(w, "falta ?escena=")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, contarVotos(l.ID, escena, p.ID))
}

// liveVotosReiniciar: DELETE /api/v1/live/{lesson}/votos?escena=… (staff). Borra los votos de esa escena.
func (s *Server) liveVotosReiniciar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	escena := strings.TrimSpace(r.URL.Query().Get("escena"))
	if !idVoto.MatchString(escena) {
		badRequest(w, "falta ?escena=")
		return
	}
	votosLive.Lock()
	if votosLive.v[l.ID] != nil {
		delete(votosLive.v[l.ID], escena)
	}
	votosLive.Unlock()
	writeJSON(w, 200, contarVotos(l.ID, escena, p.ID))
}
