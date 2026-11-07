package httpapi

import (
	"net/http"
	"slices"
	"sort"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
)

// Calendario del instructor: todas las sesiones con fecha de los cursos que ve, más las clases extra
// de content/agenda.yaml (propuestas o por confirmar), en orden de inicio.

// minutosSesion es la duración por omisión cuando ni la sesión ni el curso la dicen.
const minutosSesion = 90

type claseAgenda struct {
	ID          string   `json:"id"`
	Tipo        string   `json:"tipo"` // sesion · extra
	Nombre      string   `json:"nombre"`
	Grupo       string   `json:"grupo"`
	Titulo      string   `json:"titulo"`
	CursoSlug   string   `json:"curso_slug,omitempty"`
	Area        string   `json:"area,omitempty"`
	Numero      int      `json:"numero,omitempty"`
	Total       int      `json:"total,omitempty"`
	Inicio      string   `json:"inicio"`
	Fin         string   `json:"fin"`
	Minutos     int      `json:"minutos"`
	Live        bool     `json:"live"`
	Publicada   bool     `json:"publicada"`
	Inscripcion string   `json:"inscripcion,omitempty"` // grupo con inscripción abierta por enlace
	Estado      string   `json:"estado"`                // confirmado · propuesto · por-confirmar
	Nota        string   `json:"nota,omitempty"`
	Cruces      []string `json:"cruces,omitempty"` // Mi horario: ids de las clases que se solapan con esta

	inicio time.Time
}

func nuevaClase(inicio time.Time, minutos int) claseAgenda {
	return claseAgenda{inicio: inicio, Inicio: inicio.Format(time.RFC3339),
		Fin: inicio.Add(time.Duration(minutos) * time.Minute).Format(time.RFC3339), Minutos: minutos}
}

// clasesDelCurso: las sesiones con fecha de un curso y las clases extra que se le suman, numeradas juntas.
func (s *Server) clasesDelCurso(cat *content.Catalog, c *content.Course) []claseAgenda {
	ag := datosAgenda(c)
	abierto := ""
	for _, g := range c.Cohorts {
		if slices.Contains(s.Inscripcion, g) {
			abierto = g
			break
		}
	}
	type item struct {
		inicio time.Time
		l      *content.Lesson
		x      *content.AgendaExtra
	}
	var items []item
	for _, m := range c.Modules {
		for _, l := range m.Lessons {
			if l.StartsAt != nil {
				items = append(items, item{inicio: *l.StartsAt, l: l})
			}
		}
	}
	for _, a := range cat.Agenda() {
		if a.Curso != "" && (a.Curso == c.ID || a.Curso == c.Slug) {
			items = append(items, item{inicio: *a.StartsAt, x: a})
		}
	}
	sort.SliceStable(items, func(i, j int) bool { return items[i].inicio.Before(items[j].inicio) })
	clases := make([]claseAgenda, 0, len(items))
	for i, it := range items {
		var k claseAgenda
		if l := it.l; l != nil {
			minutos := ag.Minutos
			if l.Duration > 0 {
				minutos = l.Duration
			}
			k = nuevaClase(it.inicio, minutos)
			k.ID, k.Tipo, k.Titulo = l.ID, "sesion", l.Title
			k.Live, k.Publicada, k.Estado = len(cat.Escenas(l.ID)) > 0, l.Published, "confirmado"
		} else {
			a := it.x
			k = nuevaClase(it.inicio, a.Minutos)
			k.ID, k.Tipo, k.Titulo, k.Estado, k.Nota = a.ID, "extra", a.Sesion, a.Estado, a.Nota
		}
		k.Nombre, k.Grupo, k.CursoSlug, k.Area = ag.Nombre, ag.Grupo, c.Slug, ag.Area
		k.Numero, k.Total, k.Inscripcion = i+1, len(items), abierto
		clases = append(clases, k)
	}
	return clases
}

// datosAgenda: nombre, grupo, área y duración de un curso, con los valores por omisión.
func datosAgenda(c *content.Course) content.CourseAgenda {
	ag := content.CourseAgenda{Nombre: c.Title, Minutos: minutosSesion}
	if len(c.Cohorts) > 0 {
		ag.Grupo = nombreGrupo(c.Cohorts[0])
	}
	if a := c.Agenda; a != nil {
		if a.Nombre != "" {
			ag.Nombre = a.Nombre
		}
		if a.Grupo != "" {
			ag.Grupo = a.Grupo
		}
		if a.Minutos > 0 {
			ag.Minutos = a.Minutos
		}
		ag.Area = a.Area
	}
	return ag
}

// instructorAgenda: GET /api/v1/instructor/agenda (staff) → {"zona": "America/Lima", "clases": [...]}.
func (s *Server) instructorAgenda(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	clases := []claseAgenda{}
	for _, c := range cat.Courses() {
		if s.canSeeCourse(p, c) {
			clases = append(clases, s.clasesDelCurso(cat, c)...)
		}
	}
	for _, a := range cat.Agenda() {
		if a.Curso != "" {
			continue // ya salió dentro de su curso (o el curso no es visible para quien pregunta)
		}
		k := nuevaClase(*a.StartsAt, a.Minutos)
		k.ID, k.Tipo, k.Nombre, k.Grupo, k.Titulo = a.ID, "extra", a.Nombre, a.Grupo, a.Sesion
		k.Area, k.Estado, k.Nota = a.Area, a.Estado, a.Nota
		clases = append(clases, k)
	}
	sort.SliceStable(clases, func(i, j int) bool { return clases[i].inicio.Before(clases[j].inicio) })
	writeJSON(w, 200, map[string]any{"zona": "America/Lima", "clases": clases})
}
