package httpapi

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Inscripción de patrocinadores: /patrocinio/<código>/ deja elegir hasta maxCursosPatrocinio cursos
// (todos los que aún no terminan, salvo la hackathon) y crea la cuenta sin pago, ya dentro de esos
// grupos. Los códigos viven en LMS_PATROCINIO, separados por comas, cada uno con su tope de cursos:
// «código:5,otrocódigo:2» (sin «:N», el tope es maxCursosPatrocinio). Cada código tiene 16 caracteres
// o más; vacío = página cerrada. Quien
// ya tiene cuenta entra y suma los cursos. Cada patrocinador queda además en la cohorte «patrocinador»,
// que no abre ningún curso y sirve para encontrarlos en la lista de usuarios.

const (
	maxCursosPatrocinio = 5
	cohortePatrocinador = "patrocinador"
)

// codigoPatrocinio: si el código de la URL es uno de LMS_PATROCINIO, devuelve su tope de cursos
// (comparación de tiempo constante con cada código configurado).
func codigoPatrocinio(r *http.Request) (int, bool) {
	got := []byte(strings.TrimSpace(r.PathValue("codigo")))
	tope, ok := 0, false
	for _, item := range strings.Split(os.Getenv("LMS_PATROCINIO"), ",") {
		cod, n := strings.TrimSpace(item), maxCursosPatrocinio
		if i := strings.LastIndex(cod, ":"); i > 0 {
			if v, err := strconv.Atoi(cod[i+1:]); err == nil && v >= 1 && v <= 20 {
				n = v
			}
			cod = cod[:i]
		}
		if len(cod) >= 16 && subtle.ConstantTimeCompare(got, []byte(cod)) == 1 {
			tope, ok = n, true
		}
	}
	return tope, ok
}

// catalogoPatrocinio: los cursos que puede elegir un patrocinador, en orden de inicio: todos los que
// tienen grupo y alguna clase sin terminar (inicio + 3 h > ahora). No depende de LMS_INSCRIPCION: el
// patrocinador ve también los grupos nuevos. La hackathon queda fuera (es un evento con premio).
func (s *Server) catalogoPatrocinio(ahora time.Time) []*content.Course {
	type item struct {
		c      *content.Course
		inicio time.Time
	}
	var lista []item
	for _, c := range s.Content.Get().Courses() {
		if len(c.Cohorts) == 0 || strings.HasPrefix(c.ID, "hackathon") {
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
func (s *Server) cohortesElegidas(ids []string, tope int) (cohortes, slugs []string, msg string) {
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
			if !slices.Contains(cohortes, g) {
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
	case len(slugs) > tope:
		return nil, nil, fmt.Sprintf("puedes elegir hasta %d %s", tope, map[bool]string{true: "curso", false: "cursos"}[tope == 1])
	}
	return cohortes, slugs, ""
}

// patrocinioInfo: GET /api/v1/patrocinio/{codigo} (público) → los cursos para elegir. 404 si el código no vale.
func (s *Server) patrocinioInfo(w http.ResponseWriter, r *http.Request) {
	tope, ok := codigoPatrocinio(r)
	if !ok {
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
		porDefecto, nombre, grupo, area := 90, c.Title, "", ""
		if c.Agenda != nil {
			if c.Agenda.Minutos > 0 {
				porDefecto = c.Agenda.Minutos
			}
			if c.Agenda.Nombre != "" {
				nombre = c.Agenda.Nombre
			}
			grupo, area = c.Agenda.Grupo, c.Agenda.Area
		}
		// Lo que va a aprender: cada clase publicada con su título limpio y sus objetivos.
		type tema struct {
			Titulo    string   `json:"titulo"`
			Objetivos []string `json:"objetivos"`
		}
		temario := []tema{}
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if l.Published {
					t := tema{Titulo: tituloLimpio(l.Title), Objetivos: []string{}}
					for _, o := range l.Objectives {
						t.Objetivos = append(t.Objetivos, o.Title)
					}
					temario = append(temario, t)
				}
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
			"fechas": fechas, "clases": clases, "nombre": nombre, "grupo": grupo, "area": area, "temario": temario,
			"proyecto_final": c.ProyectoFinal, "requisitos": c.Requisitos, "dedicacion": c.Dedicacion})
	}
	writeJSON(w, 200, map[string]any{"max": tope, "cursos": cursos})
}

// patrocinioInscribir: POST /api/v1/patrocinio/{codigo} {name, email, password, cursos} → cuenta de
// alumno en los grupos elegidos y sesión abierta. 409 «ya_registrado» si el correo ya tiene cuenta.
func (s *Server) patrocinioInscribir(w http.ResponseWriter, r *http.Request) {
	tope, ok := codigoPatrocinio(r)
	if !ok {
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
	cohortes, slugs, msg := s.cohortesElegidas(in.Cursos, tope)
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
	tope, ok := codigoPatrocinio(r)
	if !ok {
		notFound(w, "la inscripción de patrocinadores (el enlace no es válido)")
		return
	}
	var in struct {
		Cursos []string `json:"cursos"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	cohortes, slugs, msg := s.cohortesElegidas(in.Cursos, tope)
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

// tituloLimpio: «Grupo 8 · Clase 1 · Tu asistente…» → «Tu asistente…» (el grupo y el número se ven aparte).
func tituloLimpio(t string) string {
	var out []string
	for _, p := range strings.Split(t, " · ") {
		f := strings.Fields(strings.ToLower(strings.TrimSpace(p)))
		if len(f) > 0 && len(f) <= 2 && (f[0] == "grupo" || f[0] == "clase" || f[0] == "sesión" || f[0] == "sesion") {
			continue
		}
		out = append(out, strings.TrimSpace(p))
	}
	if len(out) == 0 {
		return t
	}
	return strings.Join(out, " · ")
}
