package httpapi

import (
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Inscripción por enlace: /inscripcion/<grupo> abre un formulario (nombre completo, correo y
// contraseña) que crea la cuenta de alumno ya dentro del grupo. La URL es la invitación: solo
// funciona para los grupos de LMS_INSCRIPCION, así que cerrar la inscripción es quitar el grupo de
// esa lista. Quien ya tiene cuenta entra con ella y pulsa «Unirme», que le suma el grupo sin quitarle
// los que ya tenía.

// grupoAbierto devuelve el grupo pedido si tiene la inscripción abierta.
func (s *Server) grupoAbierto(r *http.Request) (string, bool) {
	g := content.TrimCohort(strings.TrimSpace(r.PathValue("grupo")))
	return g, g != "" && slices.Contains(s.Inscripcion, g)
}

// cursosDelGrupo son los cursos que verá quien entre al grupo.
func (s *Server) cursosDelGrupo(g string) []*content.Course {
	var out []*content.Course
	for _, c := range s.Content.Get().Courses() {
		if slices.Contains(c.Cohorts, g) {
			out = append(out, c)
		}
	}
	return out
}

// inscripcionInfo: GET /api/v1/inscripcion/{grupo} (público) → el grupo y sus cursos, para la portada
// del formulario. 404 si la inscripción de ese grupo no está abierta.
func (s *Server) inscripcionInfo(w http.ResponseWriter, r *http.Request) {
	g, ok := s.grupoAbierto(r)
	cursos := s.cursosDelGrupo(g)
	if !ok || len(cursos) == 0 {
		notFound(w, "la inscripción de ese grupo (está cerrada o no existe)")
		return
	}
	out := []map[string]any{}
	for _, c := range cursos {
		fechas := []string{}
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if l.StartsAt != nil {
					fechas = append(fechas, l.StartsAt.Format("2006-01-02T15:04:05Z07:00"))
				}
			}
		}
		out = append(out, map[string]any{"id": c.ID, "slug": c.Slug, "title": c.Title, "description": c.Description,
			"requisitos": c.Requisitos, "proyecto_final": c.ProyectoFinal, "fechas": fechas})
	}
	writeJSON(w, 200, map[string]any{"grupo": g, "nombre": nombreGrupo(g), "cursos": out})
}

// nombreGrupo: «grupo-4» → «Grupo 4».
func nombreGrupo(g string) string {
	n := strings.ReplaceAll(g, "-", " ")
	if n == "" {
		return n
	}
	return strings.ToUpper(n[:1]) + n[1:]
}

// inscribirse: POST /api/v1/inscripcion/{grupo} {name, email, password} → cuenta de alumno en el
// grupo y sesión abierta. Si el correo ya tiene cuenta, 409 «ya_registrado»: que entre y se una.
func (s *Server) inscribirse(w http.ResponseWriter, r *http.Request) {
	g, ok := s.grupoAbierto(r)
	if !ok || len(s.cursosDelGrupo(g)) == 0 {
		notFound(w, "la inscripción de ese grupo (está cerrada o no existe)")
		return
	}
	var in struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if !s.login.allow(clientIP(r)) {
		writeErr(w, 429, "rate_limited", "demasiados intentos; espera un minuto")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Name = strings.Join(strings.Fields(in.Name), " ")
	switch {
	case len(strings.Fields(in.Name)) < 2 || len(in.Name) > 80:
		badRequest(w, "escribe tu nombre completo: nombre y apellido")
		return
	case !validEmail(in.Email):
		badRequest(w, "el correo no es válido")
		return
	case len(in.Password) < 8 || len(in.Password) > 128:
		badRequest(w, "la contraseña debe tener al menos 8 caracteres")
		return
	}
	if _, err := s.DB.UserByEmail(r.Context(), in.Email); err == nil {
		writeErr(w, 409, "ya_registrado", "ya hay una cuenta con ese correo: entra con ella y únete al "+nombreGrupo(g))
		return
	} else if !errors.Is(err, store.ErrNotFound) {
		internal(w, err)
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		internal(w, err)
		return
	}
	u := &store.User{Email: in.Email, Name: in.Name, PasswordHash: hash, Roles: []string{"student"}, Cohorts: []string{g}}
	if err := s.DB.CreateUser(r.Context(), u); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeErr(w, 409, "ya_registrado", "ya hay una cuenta con ese correo: entra con ella y únete al "+nombreGrupo(g))
			return
		}
		internal(w, err)
		return
	}
	tok, err := s.startSession(w, r, u, "web")
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"token": tok, "user": fromUser(u, "", false), "cursos": s.slugsDelGrupo(g)})
}

// unirseAGrupo: POST /api/v1/inscripcion/{grupo}/unirme (con sesión) suma el grupo a la cuenta.
func (s *Server) unirseAGrupo(w http.ResponseWriter, r *http.Request, p *Principal) {
	g, ok := s.grupoAbierto(r)
	if !ok || len(s.cursosDelGrupo(g)) == 0 {
		notFound(w, "la inscripción de ese grupo (está cerrada o no existe)")
		return
	}
	cohorts := p.Cohorts
	if !slices.Contains(cohorts, g) {
		cohorts = append(slices.Clone(cohorts), g)
		roles := p.Roles
		if len(roles) == 0 {
			roles = []string{"student"}
		}
		if err := s.DB.UpdateUserRoles(r.Context(), p.ID, roles, cohorts); err != nil {
			internal(w, err)
			return
		}
	}
	writeJSON(w, 200, map[string]any{"grupo": g, "cohorts": cohorts, "cursos": s.slugsDelGrupo(g)})
}

// slugsDelGrupo: a dónde mandar al alumno al terminar (el primer curso del grupo).
func (s *Server) slugsDelGrupo(g string) []string {
	out := []string{}
	for _, c := range s.cursosDelGrupo(g) {
		id := c.Slug
		if id == "" {
			id = c.ID
		}
		out = append(out, id)
	}
	return out
}
