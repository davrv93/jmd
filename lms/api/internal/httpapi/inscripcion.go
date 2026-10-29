package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"

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
	resp := map[string]any{"grupo": g, "nombre": nombreGrupo(g), "cursos": out}
	if total, ok := s.CuposGratis[g]; ok {
		ocupados, err := s.ocupados(r.Context(), g)
		if err != nil {
			internal(w, err)
			return
		}
		resp["cupos"] = map[string]any{"total": total, "ocupados": ocupados, "quedan": max(0, total-ocupados)}
		if s.WhatsAppPago != "" {
			resp["whatsapp"] = s.WhatsAppPago
		}
	}
	writeJSON(w, 200, resp)
}

// cuposMu serializa «contar vacantes + crear la cuenta»: dos inscripciones a la vez no se llevan la última.
var cuposMu sync.Mutex

// ocupados: cuentas que ya están dentro del grupo (las pendientes de pago van en «<grupo>-pago» y no cuentan).
func (s *Server) ocupados(ctx context.Context, g string) (int, error) {
	us, err := s.DB.Users(ctx)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, u := range us {
		// El personal asignado al grupo (instructor, admin) no ocupa vacante.
		if slices.Contains(u.Cohorts, g) && !slices.Contains(u.Roles, "admin") && !slices.Contains(u.Roles, "instructor") {
			n++
		}
	}
	return n, nil
}

// cohorteDeIngreso: el grupo mismo mientras haya vacante gratuita; si no, «<grupo>-pago» (pendiente).
func (s *Server) cohorteDeIngreso(ctx context.Context, g string) (string, bool, error) {
	total, ok := s.CuposGratis[g]
	if !ok {
		return g, false, nil
	}
	n, err := s.ocupados(ctx, g)
	if err != nil {
		return "", false, err
	}
	if n < total {
		return g, false, nil
	}
	return g + "-pago", true, nil
}

// avisoPago: lo que ve quien llegó cuando ya no quedaban vacantes gratuitas.
func (s *Server) avisoPago(g, nombre, email string) map[string]any {
	out := map[string]any{"pendiente_pago": true,
		"mensaje": "Las vacantes gratuitas del " + nombreGrupo(g) + " ya se ocuparon. Para completar tu inscripción envía un WhatsApp y coordina el pago."}
	if s.WhatsAppPago != "" {
		texto := "Hola, me inscribí al " + nombreGrupo(g) + " de Programación agéntica (" + nombre + ", " + email + ") y quiero coordinar el pago."
		out["whatsapp"] = "https://wa.me/" + s.WhatsAppPago + "?text=" + url.QueryEscape(texto)
	}
	return out
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
	cuposMu.Lock()
	defer cuposMu.Unlock()
	cohorte, pendiente, err := s.cohorteDeIngreso(r.Context(), g)
	if err != nil {
		internal(w, err)
		return
	}
	u := &store.User{Email: in.Email, Name: in.Name, PasswordHash: hash, Roles: []string{"student"}, Cohorts: []string{cohorte}}
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
	if pendiente {
		resp := s.avisoPago(g, in.Name, in.Email)
		resp["token"], resp["user"], resp["cursos"] = tok, fromUser(u, "", false), []string{}
		writeJSON(w, 201, resp)
		return
	}
	cursos := s.slugsDelGrupo(g)
	resp := map[string]any{"token": tok, "user": fromUser(u, "", false), "cursos": cursos}
	// Sorteo del curso: el cupo queda jugado aquí mismo, con su número aleatorio.
	if auto := s.sorteosAutomaticos(r.Context(), cursos, u.ID, u.Email); auto != nil {
		resp["sorteo"] = auto
	}
	writeJSON(w, 201, resp)
}

// unirseAGrupo: POST /api/v1/inscripcion/{grupo}/unirme (con sesión) suma el grupo a la cuenta.
func (s *Server) unirseAGrupo(w http.ResponseWriter, r *http.Request, p *Principal) {
	g, ok := s.grupoAbierto(r)
	if !ok || len(s.cursosDelGrupo(g)) == 0 {
		notFound(w, "la inscripción de ese grupo (está cerrada o no existe)")
		return
	}
	cohorts := p.Cohorts
	cuposMu.Lock()
	defer cuposMu.Unlock()
	cohorte, pendiente := g, false
	if !slices.Contains(cohorts, g) {
		var err error
		if cohorte, pendiente, err = s.cohorteDeIngreso(r.Context(), g); err != nil {
			internal(w, err)
			return
		}
	}
	if !slices.Contains(cohorts, g) && !slices.Contains(cohorts, cohorte) {
		cohorts = append(slices.Clone(cohorts), cohorte)
		roles := p.Roles
		if len(roles) == 0 {
			roles = []string{"student"}
		}
		if err := s.DB.UpdateUserRoles(r.Context(), p.ID, roles, cohorts); err != nil {
			internal(w, err)
			return
		}
	}
	if pendiente || slices.Contains(cohorts, g+"-pago") && !slices.Contains(cohorts, g) {
		resp := s.avisoPago(g, p.Name, p.Email)
		resp["grupo"], resp["cohorts"], resp["cursos"] = g, cohorts, []string{}
		writeJSON(w, 200, resp)
		return
	}
	cursos := s.slugsDelGrupo(g)
	resp := map[string]any{"grupo": g, "cohorts": cohorts, "cursos": cursos}
	// Al sumarse al grupo también queda jugado el sorteo del curso (con su número).
	if auto := s.sorteosAutomaticos(r.Context(), cursos, p.ID, p.Email); auto != nil {
		resp["sorteo"] = auto
	}
	writeJSON(w, 200, resp)
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
