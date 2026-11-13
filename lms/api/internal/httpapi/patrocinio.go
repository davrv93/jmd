package httpapi

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"os"
	"slices"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Inscripción de patrocinadores: /patrocinio/<código>/ deja elegir hasta maxCursosPatrocinio cursos
// (de los grupos con inscripción abierta que aún no terminan) y crea la cuenta sin pago, ya dentro de
// esos grupos. El código vive en LMS_PATROCINIO (16 caracteres o más); vacío = página cerrada. Quien
// ya tiene cuenta entra y suma los cursos. Cada patrocinador queda además en la cohorte «patrocinador»,
// que no abre ningún curso y sirve para encontrarlos en la lista de usuarios.

const (
	maxCursosPatrocinio = 5
	cohortePatrocinador = "patrocinador"
)

// codigoPatrocinio: el código de la URL coincide con LMS_PATROCINIO (comparación de tiempo constante).
func codigoPatrocinio(r *http.Request) bool {
	want := strings.TrimSpace(os.Getenv("LMS_PATROCINIO"))
	got := strings.TrimSpace(r.PathValue("codigo"))
	return len(want) >= 16 && subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}

// catalogoPatrocinio: los cursos que puede elegir un patrocinador, en orden de inicio. Son los de los
// grupos con inscripción abierta que tienen alguna clase sin terminar (inicio + 3 h > ahora).
func (s *Server) catalogoPatrocinio(ahora time.Time) []*content.Course {
	type item struct {
		c      *content.Course
		inicio time.Time
	}
	var lista []item
	for _, c := range s.Content.Get().Courses() {
		abierto := false
		for _, g := range c.Cohorts {
			if slices.Contains(s.Inscripcion, g) {
				abierto = true
			}
		}
		if !abierto {
			continue
		}
		var primera time.Time
		vigente := false
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if l.StartsAt == nil {
					continue
				}
				if primera.IsZero() || l.StartsAt.Before(primera) {
					primera = *l.StartsAt
				}
				if l.StartsAt.Add(3 * time.Hour).After(ahora) {
					vigente = true
				}
			}
		}
		if vigente {
			lista = append(lista, item{c, primera})
		}
	}
	slices.SortStableFunc(lista, func(a, b item) int { return a.inicio.Compare(b.inicio) })
	out := make([]*content.Course, len(lista))
	for i, x := range lista {
		out[i] = x.c
	}
	return out
}

// cohortesElegidas: valida la elección (1..max cursos del catálogo, sin repetir) y devuelve los grupos
// abiertos de esos cursos y sus slugs. msg != "" es el error para el 400.
func (s *Server) cohortesElegidas(ids []string) (cohortes, slugs []string, msg string) {
	cat := s.catalogoPatrocinio(time.Now())
	vistos := map[string]bool{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" || vistos[id] {
			continue
		}
		vistos[id] = true
		i := slices.IndexFunc(cat, func(c *content.Course) bool { return c.ID == id || c.Slug == id })
		if i < 0 {
			return nil, nil, "uno de los cursos elegidos ya no está disponible; recarga la página"
		}
		c := cat[i]
		for _, g := range c.Cohorts {
			if slices.Contains(s.Inscripcion, g) && !slices.Contains(cohortes, g) {
				cohortes = append(cohortes, g)
			}
		}
		slug := c.Slug
		if slug == "" {
			slug = c.ID
		}
		slugs = append(slugs, slug)
	}
	switch {
	case len(slugs) == 0:
		return nil, nil, "elige al menos un curso"
	case len(slugs) > maxCursosPatrocinio:
		return nil, nil, "puedes elegir hasta 5 cursos"
	}
	return cohortes, slugs, ""
}

// patrocinioInfo: GET /api/v1/patrocinio/{codigo} (público) → los cursos para elegir. 404 si el código no vale.
func (s *Server) patrocinioInfo(w http.ResponseWriter, r *http.Request) {
	if !codigoPatrocinio(r) {
		notFound(w, "la inscripción de patrocinadores (el enlace no es válido)")
		return
	}
	cursos := []map[string]any{}
	for _, c := range s.catalogoPatrocinio(time.Now()) {
		// Cada clase con su duración, para el calendario que arma el patrocinador mientras elige.
		type clase struct {
			Inicio  string `json:"inicio"`
			Minutos int    `json:"minutos"`
		}
		fechas, clases := []string{}, []clase{}
		porDefecto, nombre, grupo := 90, c.Title, ""
		if c.Agenda != nil {
			if c.Agenda.Minutos > 0 {
				porDefecto = c.Agenda.Minutos
			}
			if c.Agenda.Nombre != "" {
				nombre = c.Agenda.Nombre
			}
			grupo = c.Agenda.Grupo
		}
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if l.StartsAt == nil {
					continue
				}
				min := porDefecto
				if l.Duration > 0 {
					min = l.Duration
				}
				fechas = append(fechas, l.StartsAt.Format(time.RFC3339))
				clases = append(clases, clase{l.StartsAt.Format(time.RFC3339), min})
			}
		}
		slices.Sort(fechas)
		slices.SortFunc(clases, func(a, b clase) int { return strings.Compare(a.Inicio, b.Inicio) })
		cursos = append(cursos, map[string]any{"id": c.ID, "slug": c.Slug, "title": c.Title, "description": c.Description,
			"fechas": fechas, "clases": clases, "nombre": nombre, "grupo": grupo})
	}
	writeJSON(w, 200, map[string]any{"max": maxCursosPatrocinio, "cursos": cursos})
}

// patrocinioInscribir: POST /api/v1/patrocinio/{codigo} {name, email, password, cursos} → cuenta de
// alumno en los grupos elegidos y sesión abierta. 409 «ya_registrado» si el correo ya tiene cuenta.
func (s *Server) patrocinioInscribir(w http.ResponseWriter, r *http.Request) {
	if !codigoPatrocinio(r) {
		notFound(w, "la inscripción de patrocinadores (el enlace no es válido)")
		return
	}
	var in struct {
		Name     string   `json:"name"`
		Email    string   `json:"email"`
		Password string   `json:"password"`
		Cursos   []string `json:"cursos"`
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
	cohortes, slugs, msg := s.cohortesElegidas(in.Cursos)
	if msg != "" {
		badRequest(w, msg)
		return
	}
	if _, err := s.DB.UserByEmail(r.Context(), in.Email); err == nil {
		writeErr(w, 409, "ya_registrado", "ya hay una cuenta con ese correo: entra con ella y agrega los cursos")
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
	u := &store.User{Email: in.Email, Name: in.Name, PasswordHash: hash, Roles: []string{"student"}, Cohorts: append(cohortes, cohortePatrocinador)}
	if err := s.DB.CreateUser(r.Context(), u); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeErr(w, 409, "ya_registrado", "ya hay una cuenta con ese correo: entra con ella y agrega los cursos")
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
	writeJSON(w, 201, map[string]any{"token": tok, "user": fromUser(u, "", false), "cursos": slugs})
}

// patrocinioUnirme: POST /api/v1/patrocinio/{codigo}/unirme {cursos} (con sesión) suma los grupos
// elegidos a la cuenta, sin quitarle los que ya tenía.
func (s *Server) patrocinioUnirme(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !codigoPatrocinio(r) {
		notFound(w, "la inscripción de patrocinadores (el enlace no es válido)")
		return
	}
	var in struct {
		Cursos []string `json:"cursos"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	cohortes, slugs, msg := s.cohortesElegidas(in.Cursos)
	if msg != "" {
		badRequest(w, msg)
		return
	}
	cohorts := slices.Clone(p.Cohorts)
	for _, g := range append(cohortes, cohortePatrocinador) {
		if !slices.Contains(cohorts, g) {
			cohorts = append(cohorts, g)
		}
	}
	roles := p.Roles
	if len(roles) == 0 {
		roles = []string{"student"}
	}
	if err := s.DB.UpdateUserRoles(r.Context(), p.ID, roles, cohorts); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"cohorts": cohorts, "cursos": slugs})
}
