package httpapi

import (
	"net/http"
	"slices"
	"sort"
	"time"
)

// Mi horario del alumno: solo los cursos de sus grupos, con todas sus fechas (también las de sesiones
// aún sin publicar, que el resto del portal esconde) y los cruces entre clases de cursos distintos.

type cursoHorario struct {
	Slug   string `json:"slug"`
	Nombre string `json:"nombre"`
	Grupo  string `json:"grupo"`
	Area   string `json:"area,omitempty"`
}

// matriculado: el alumno pertenece a un grupo del curso. El rol no cuenta: un administrador ve todos
// los cursos, pero no está matriculado en ellos.
func matriculado(p *Principal, cohortes []string) bool {
	return slices.ContainsFunc(p.Cohorts, func(g string) bool { return slices.Contains(cohortes, g) })
}

// paraAlumno quita lo que solo es del instructor: la nota interna, el enlace de inscripción y el título
// de una sesión en borrador.
func paraAlumno(k claseAgenda) claseAgenda {
	k.Nota, k.Inscripcion = "", ""
	if k.Tipo == "sesion" && !k.Publicada {
		k.Titulo = ""
	}
	return k
}

// marcarCruces anota en cada clase las que se solapan con ella. Terminar justo cuando otra empieza no
// es un cruce. Espera las clases ordenadas por inicio.
func marcarCruces(clases []claseAgenda) {
	fin := func(k claseAgenda) time.Time { return k.inicio.Add(time.Duration(k.Minutos) * time.Minute) }
	for i := range clases {
		for j := i + 1; j < len(clases) && clases[j].inicio.Before(fin(clases[i])); j++ {
			clases[i].Cruces = append(clases[i].Cruces, clases[j].ID)
			clases[j].Cruces = append(clases[j].Cruces, clases[i].ID)
		}
	}
}

// miHorario: GET /api/v1/horario → {"zona": "America/Lima", "cursos": [...], "clases": [...]}.
func (s *Server) miHorario(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	cursos, clases := []cursoHorario{}, []claseAgenda{}
	for _, c := range cat.Courses() {
		if !matriculado(p, c.Cohorts) {
			continue
		}
		ag := datosAgenda(c)
		cursos = append(cursos, cursoHorario{Slug: c.Slug, Nombre: ag.Nombre, Grupo: ag.Grupo, Area: ag.Area})
		for _, k := range s.clasesDelCurso(cat, c) {
			if k.Estado != "propuesto" {
				clases = append(clases, paraAlumno(k))
			}
		}
	}
	sort.SliceStable(clases, func(i, j int) bool { return clases[i].inicio.Before(clases[j].inicio) })
	marcarCruces(clases)
	writeJSON(w, 200, map[string]any{"zona": "America/Lima", "cursos": cursos, "clases": clases})
}
