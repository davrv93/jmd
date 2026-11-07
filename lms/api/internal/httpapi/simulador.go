package httpapi

import (
	"net/http"
	"slices"
	"sort"
	"strings"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Simulador de Mi horario: el instructor ve la portada exactamente como la vería un alumno (sus
// cursos, su calendario y las ofertas que le encajan), o como la vería alguien con los grupos que él
// elija. Solo cuenta lo que el instructor ya ve: los grupos de sus cursos y los alumnos de esos grupos.

type grupoSimulador struct {
	ID     string   `json:"id"`
	Nombre string   `json:"nombre"`
	Cursos []string `json:"cursos"`
}

type alumnoSimulador struct {
	ID     string   `json:"id"`
	Nombre string   `json:"nombre"`
	Email  string   `json:"email"`
	Grupos []string `json:"grupos"`
}

// gruposVisibles: los grupos de los cursos que ve el instructor, con los cursos de cada uno.
func (s *Server) gruposVisibles(p *Principal) []grupoSimulador {
	por := map[string]*grupoSimulador{}
	for _, c := range s.Content.Get().Courses() {
		if !s.canSeeCourse(p, c) {
			continue
		}
		for _, g := range c.Cohorts {
			g = content.TrimCohort(g)
			if por[g] == nil {
				por[g] = &grupoSimulador{ID: g, Nombre: datosAgenda(c).Grupo}
			}
			por[g].Cursos = append(por[g].Cursos, datosAgenda(c).Nombre)
		}
	}
	out := make([]grupoSimulador, 0, len(por))
	for _, g := range por {
		out = append(out, *g)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Cursos[0]+out[i].ID < out[j].Cursos[0]+out[j].ID })
	return out
}

// alumnoVisible: una cuenta de alumno (sin rol de staff) con algún grupo de los que ve el instructor.
func alumnoVisible(u *store.User, visibles map[string]bool) bool {
	if u.HasRole("instructor") || u.HasRole("admin") {
		return false
	}
	return slices.ContainsFunc(u.Cohorts, func(g string) bool { return visibles[strings.TrimSuffix(g, "-pago")] })
}

func idsGrupos(gs []grupoSimulador) map[string]bool {
	m := make(map[string]bool, len(gs))
	for _, g := range gs {
		m[g.ID] = true
	}
	return m
}

// simulador: GET /api/v1/instructor/simulador (staff) → {"alumnos": [...], "grupos": [...]}.
func (s *Server) simulador(w http.ResponseWriter, r *http.Request, p *Principal) {
	grupos := s.gruposVisibles(p)
	visibles := idsGrupos(grupos)
	users, err := s.DB.Users(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	alumnos := []alumnoSimulador{}
	for _, u := range users {
		if alumnoVisible(u, visibles) {
			alumnos = append(alumnos, alumnoSimulador{ID: u.ID, Nombre: u.Name, Email: u.Email, Grupos: u.Cohorts})
		}
	}
	sort.Slice(alumnos, func(i, j int) bool { return strings.ToLower(alumnos[i].Nombre) < strings.ToLower(alumnos[j].Nombre) })
	writeJSON(w, 200, map[string]any{"alumnos": alumnos, "grupos": grupos})
}

// simuladorHorario: GET /api/v1/instructor/simulador/horario?alumno=<id>&grupos=a,b (staff) → Mi horario
// de ese alumno. Con «grupos» (aunque vaya vacío) se simulan esos grupos en vez de los del alumno; los
// grupos que el instructor no ve se ignoran.
func (s *Server) simuladorHorario(w http.ResponseWriter, r *http.Request, p *Principal) {
	visibles := idsGrupos(s.gruposVisibles(p))
	sim := &Principal{Roles: []string{"student"}}
	if id := r.URL.Query().Get("alumno"); id != "" {
		u, err := s.DB.UserByID(r.Context(), id)
		if err != nil || !alumnoVisible(u, visibles) {
			notFound(w, "ese alumno")
			return
		}
		sim.ID, sim.Name, sim.Email, sim.Cohorts = u.ID, u.Name, u.Email, u.Cohorts
	}
	if r.URL.Query().Has("grupos") {
		sim.Cohorts = nil
		for _, g := range strings.Split(r.URL.Query().Get("grupos"), ",") {
			if g = content.TrimCohort(strings.TrimSpace(g)); visibles[g] && !slices.Contains(sim.Cohorts, g) {
				sim.Cohorts = append(sim.Cohorts, g)
			}
		}
	}
	out := s.horarioDe(sim)
	out["simulado"] = map[string]any{"alumno": sim.Name, "grupos": sim.Cohorts}
	writeJSON(w, 200, out)
}
