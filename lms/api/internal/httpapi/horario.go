package httpapi

import (
	"net/http"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
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

// ahoraHorario es el reloj de Mi horario; las pruebas lo fijan.
var ahoraHorario = time.Now

// ofertaHorario es un grupo con inscripción abierta que cabe en el horario del alumno: ninguna de sus
// clases futuras se cruza con las suyas. Inscribirse es entrar al grupo, así que la oferta reúne todos
// sus cursos y todas sus clases.
type ofertaHorario struct {
	Grupo       string        `json:"grupo"`
	Nombre      string        `json:"nombre"`
	NombreGrupo string        `json:"nombre_grupo"`
	Area        string        `json:"area,omitempty"`
	Inscripcion string        `json:"inscripcion"`
	Cursos      []cursoOferta `json:"cursos"`
	Clases      []claseOferta `json:"clases"`

	primera time.Time
}

type cursoOferta struct {
	Slug        string `json:"slug"`
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion,omitempty"`
}

type claseOferta struct {
	Inicio  string `json:"inicio"`
	Fin     string `json:"fin"`
	Minutos int    `json:"minutos"`
}

// nombreBase: el nombre del curso sin « · <grupo>», para reconocer el mismo curso en otro grupo.
func nombreBase(c *content.Course) string {
	ag := datosAgenda(c)
	return strings.TrimSpace(strings.TrimSuffix(ag.Nombre, " · "+ag.Grupo))
}

func finClase(k claseAgenda) time.Time { return k.inicio.Add(time.Duration(k.Minutos) * time.Minute) }

// seCruzan: alguna clase de a se solapa con alguna de b. Terminar justo cuando otra empieza no cuenta.
func seCruzan(a, b []claseAgenda) bool {
	for _, x := range a {
		for _, y := range b {
			if x.inicio.Before(finClase(y)) && y.inicio.Before(finClase(x)) {
				return true
			}
		}
	}
	return false
}

// ofertas: los grupos con inscripción abierta en los que el alumno no está, que aún no empezaron y
// cuyas clases no se cruzan con las clases por delante del alumno. Un grupo en el que ya está pendiente de pago
// («<grupo>-pago») o que repite un curso suyo no se le ofrece.
func (s *Server) ofertas(cat *content.Catalog, p *Principal, suyas []claseAgenda, ahora time.Time) []ofertaHorario {
	porDelante := func(ks []claseAgenda) []claseAgenda {
		var out []claseAgenda
		for _, k := range ks {
			if k.Estado != "propuesto" && finClase(k).After(ahora) {
				out = append(out, k)
			}
		}
		return out
	}
	ocupado := porDelante(suyas)
	// El mismo curso en otro grupo (otro horario) tampoco se ofrece a quien ya lo lleva.
	llevo := map[string]bool{}
	for _, c := range cat.Courses() {
		if matriculado(p, c.Cohorts) {
			llevo[nombreBase(c)] = true
		}
	}
	out := []ofertaHorario{}
	vistos := map[string]bool{}
	for _, g := range s.Inscripcion {
		g = content.TrimCohort(strings.TrimSpace(g))
		if g == "" || vistos[g] || slices.Contains(p.Cohorts, g) || slices.Contains(p.Cohorts, g+"-pago") {
			continue
		}
		vistos[g] = true
		cursos := s.cursosDelGrupo(g)
		if len(cursos) == 0 || slices.ContainsFunc(cursos, func(c *content.Course) bool { return matriculado(p, c.Cohorts) || llevo[nombreBase(c)] }) {
			continue
		}
		var clases []claseAgenda
		empezo := false
		for _, c := range cursos {
			for _, k := range s.clasesDelCurso(cat, c) {
				if k.Estado == "propuesto" {
					continue
				}
				empezo = empezo || !k.inicio.After(ahora)
				clases = append(clases, k)
			}
		}
		// Un grupo que ya empezó no se ofrece: entrar a mitad de curso es otra conversación.
		if len(clases) == 0 || empezo || seCruzan(clases, ocupado) {
			continue
		}
		sort.SliceStable(clases, func(i, j int) bool { return clases[i].inicio.Before(clases[j].inicio) })
		ag := datosAgenda(cursos[0])
		o := ofertaHorario{Grupo: g, Nombre: ag.Nombre, NombreGrupo: ag.Grupo, Area: ag.Area, Inscripcion: "/inscripcion/" + g + "/", primera: clases[0].inicio}
		if len(cursos) > 1 {
			o.Nombre = nombreGrupo(g)
		}
		for _, c := range cursos {
			o.Cursos = append(o.Cursos, cursoOferta{Slug: c.Slug, Nombre: datosAgenda(c).Nombre, Descripcion: strings.TrimSpace(c.Description)})
		}
		for _, k := range clases {
			o.Clases = append(o.Clases, claseOferta{Inicio: k.Inicio, Fin: k.Fin, Minutos: k.Minutos})
		}
		out = append(out, o)
	}
	// Primero lo que empieza antes.
	sort.SliceStable(out, func(i, j int) bool { return out[i].primera.Before(out[j].primera) })
	return out
}

// miHorario: GET /api/v1/horario → {"zona": "America/Lima", "cursos": [...], "clases": [...], "ofertas": [...]}.
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
	writeJSON(w, 200, map[string]any{"zona": "America/Lima", "cursos": cursos, "clases": clases,
		"ofertas": s.ofertas(cat, p, clases, ahoraHorario())})
}
