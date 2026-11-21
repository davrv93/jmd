package httpapi

import (
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
)

// Pase libre (/pase/): a quien un admin le pone la cohorte «pase-libre», el LMS le muestra todo el
// catálogo agrupado por curso y le deja sumarse gratis a cualquier grupo. En los grupos ya dictados
// lo hace para ver sus sesiones y grabaciones; en los que vienen, para inscribirse. La cohorte sola
// no abre ningún curso. Quedan fuera la hackathon (es un evento con premio) y los cursos sin fechas
// ni grabaciones (talleres a medida de una empresa, cursos que todavía no tienen calendario).

const cohortePaseLibre = "pase-libre"

func tienePaseLibre(p *Principal) bool {
	return p.Is("admin") || slices.Contains(p.Cohorts, cohortePaseLibre)
}

// grupoPase es un curso del contenido (un grupo) tal como lo muestra el pase libre.
type grupoPase struct {
	c        *content.Course
	nombre   string // nombre del curso, común a todos sus grupos
	grupo    string // «Grupo 2», «Domingo mañana»
	area     string
	inicio   time.Time // primera sesión; cero si el grupo no tiene fechas (solo grabaciones)
	fin      time.Time // fin de la última sesión
	minutos  int
	grabadas int
}

var reGrupo = regexp.MustCompile(`(?i)^grupo\s+(\d+)$`)

// grupoDelTitulo: «Programación agéntica (vibecoding) · Grupo 2» → «Grupo 2».
func grupoDelTitulo(t string) string {
	for _, p := range strings.Split(t, " · ") {
		if m := reGrupo.FindStringSubmatch(strings.TrimSpace(p)); m != nil {
			return "Grupo " + m[1]
		}
	}
	return ""
}

// gruposPase: los grupos que ofrece el pase libre, cada uno con el nombre del curso al que pertenece.
// Un grupo sin bloque agenda toma el nombre de otro grupo con el mismo título (Vibecoding G2 y G4).
func (s *Server) gruposPase() []grupoPase {
	cursos := s.Content.Get().Courses()
	nombrePorTitulo := map[string]string{}
	for _, c := range cursos {
		if c.Agenda != nil && c.Agenda.Nombre != "" {
			nombrePorTitulo[tituloLimpio(c.Title)] = c.Agenda.Nombre
		}
	}
	var out []grupoPase
	for _, c := range cursos {
		if len(c.Cohorts) == 0 || strings.HasPrefix(c.ID, "hackathon") {
			continue
		}
		g := grupoPase{c: c, nombre: tituloLimpio(c.Title), grupo: grupoDelTitulo(c.Title), minutos: 90}
		if n, ok := nombrePorTitulo[g.nombre]; ok {
			g.nombre = n
		}
		if c.Agenda != nil {
			if c.Agenda.Nombre != "" {
				g.nombre = c.Agenda.Nombre
			}
			if c.Agenda.Grupo != "" {
				g.grupo = c.Agenda.Grupo
			}
			g.area = c.Agenda.Area
			if c.Agenda.Minutos > 0 {
				g.minutos = c.Agenda.Minutos
			}
		}
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if l.Recording != nil && l.Recording.URL != "" {
					g.grabadas++
				}
				if l.StartsAt == nil {
					continue
				}
				min := g.minutos
				if l.Duration > 0 {
					min = l.Duration
				}
				if g.inicio.IsZero() || l.StartsAt.Before(g.inicio) {
					g.inicio = *l.StartsAt
				}
				if f := l.StartsAt.Add(time.Duration(min) * time.Minute); f.After(g.fin) {
					g.fin = f
				}
			}
		}
		if g.inicio.IsZero() && g.grabadas == 0 {
			continue
		}
		out = append(out, g)
	}
	return out
}

// estado: «dictado» (terminó, o no tiene fechas pero sí grabaciones), «en_curso» o «proximo».
func (g grupoPase) estado(ahora time.Time) string {
	switch {
	case g.inicio.IsZero() || !ahora.Before(g.fin):
		return "dictado"
	case !ahora.Before(g.inicio):
		return "en_curso"
	}
	return "proximo"
}

// numeroDeGrupo: 7 para «Grupo 7»; -1 si la etiqueta no es de ese tipo.
func numeroDeGrupo(etiqueta string) int {
	if m := reGrupo.FindStringSubmatch(etiqueta); m != nil {
		n, _ := strconv.Atoi(m[1])
		return n
	}
	return -1
}

// cohortePropia: la cohorte que abre ese curso y ningún otro. Sumar todas las de un curso podría abrir
// cursos ajenos («grupo-1» del taller de diseño es también el nombre de otro grupo).
func (s *Server) cohortePropia(c *content.Course) string {
	usadas := map[string]int{}
	for _, o := range s.Content.Get().Courses() {
		for _, g := range o.Cohorts {
			usadas[g]++
		}
	}
	for _, g := range c.Cohorts {
		if usadas[g] == 1 {
			return g
		}
	}
	return c.Cohorts[0]
}

// paseCatalogo: GET /api/v1/pase → todo el catálogo agrupado por curso. Primero los cursos con algún
// grupo por empezar o en curso (por fecha); después los ya dictados, del más reciente al más antiguo.
// La grabación (enlace y código) solo viaja en los grupos donde ya está.
func (s *Server) paseCatalogo(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !tienePaseLibre(p) {
		writeErr(w, 403, "forbidden", "Esta página es para quien tiene pase libre.")
		return
	}
	ahora := time.Now()
	type grabacion struct {
		URL      string `json:"url"`
		Passcode string `json:"passcode,omitempty"`
	}
	type sesion struct {
		ID        string     `json:"id,omitempty"`
		Titulo    string     `json:"titulo"`
		Inicio    string     `json:"inicio,omitempty"`
		Minutos   int        `json:"minutos"`
		Publicada bool       `json:"publicada"`
		TieneGrab bool       `json:"tiene_grabacion"`
		Grabacion *grabacion `json:"grabacion,omitempty"`
	}
	type grupo struct {
		ID       string   `json:"id"`
		Slug     string   `json:"slug"`
		Grupo    string   `json:"grupo"`
		Estado   string   `json:"estado"`
		Inicio   string   `json:"inicio,omitempty"`
		Fin      string   `json:"fin,omitempty"`
		Inscrito bool     `json:"inscrito"`
		Grabadas int      `json:"grabaciones"`
		Sesiones []sesion `json:"sesiones"`
		inicio   time.Time
		fin      time.Time
		numero   int
	}
	type curso struct {
		Nombre      string   `json:"nombre"`
		Area        string   `json:"area,omitempty"`
		Descripcion string   `json:"descripcion"`
		Grupos      []*grupo `json:"grupos"`
		activo      bool
		orden       time.Time
	}
	porNombre := map[string]*curso{}
	var lista []*curso
	for _, g := range s.gruposPase() {
		c := g.c
		slug := c.Slug
		if slug == "" {
			slug = c.ID
		}
		inscrito := compartenGrupo(p.Cohorts, c.Cohorts)
		gr := &grupo{ID: c.ID, Slug: slug, Grupo: g.grupo, Estado: g.estado(ahora), Inscrito: inscrito,
			Grabadas: g.grabadas, Sesiones: []sesion{}, inicio: g.inicio, fin: g.fin, numero: numeroDeGrupo(g.grupo)}
		if !g.inicio.IsZero() {
			gr.Inicio, gr.Fin = g.inicio.Format(time.RFC3339), g.fin.Format(time.RFC3339)
		}
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if !l.Published && l.StartsAt == nil {
					continue
				}
				ss := sesion{Titulo: tituloLimpio(l.Title), Minutos: g.minutos, Publicada: l.Published,
					TieneGrab: l.Recording != nil && l.Recording.URL != ""}
				if l.Duration > 0 {
					ss.Minutos = l.Duration
				}
				if l.StartsAt != nil {
					ss.Inicio = l.StartsAt.Format(time.RFC3339)
				}
				if inscrito && l.Published {
					ss.ID = l.ID
					if ss.TieneGrab {
						ss.Grabacion = &grabacion{URL: l.Recording.URL, Passcode: l.Recording.Passcode}
					}
				}
				gr.Sesiones = append(gr.Sesiones, ss)
			}
		}
		slices.SortStableFunc(gr.Sesiones, func(a, b sesion) int { return strings.Compare(a.Inicio, b.Inicio) })
		cu := porNombre[g.nombre]
		if cu == nil {
			cu = &curso{Nombre: g.nombre}
			porNombre[g.nombre] = cu
			lista = append(lista, cu)
		}
		cu.Grupos = append(cu.Grupos, gr)
		if cu.Area == "" {
			cu.Area = g.area
		}
	}
	for _, cu := range lista {
		slices.SortStableFunc(cu.Grupos, func(a, b *grupo) int {
			if a.numero >= 0 && b.numero >= 0 {
				return a.numero - b.numero
			}
			return a.inicio.Compare(b.inicio)
		})
		// La descripción y el orden salen del grupo más reciente (el que se va a dictar o el último dictado).
		for _, gr := range cu.Grupos {
			if gr.Estado != "dictado" && (!cu.activo || gr.inicio.Before(cu.orden)) {
				cu.activo, cu.orden = true, gr.inicio
			}
		}
		if !cu.activo {
			for _, gr := range cu.Grupos {
				if gr.fin.After(cu.orden) {
					cu.orden = gr.fin
				}
			}
		}
		ref := cu.Grupos[len(cu.Grupos)-1]
		if c := s.Content.Get().Course(ref.ID); c != nil {
			cu.Descripcion = c.Description
		}
	}
	slices.SortStableFunc(lista, func(a, b *curso) int {
		switch {
		case a.activo != b.activo:
			if a.activo {
				return -1
			}
			return 1
		case a.activo:
			return a.orden.Compare(b.orden)
		}
		return b.orden.Compare(a.orden)
	})
	writeJSON(w, 200, map[string]any{"cursos": lista, "ahora": ahora.Format(time.RFC3339)})
}

// paseUnirme: POST /api/v1/pase/unirme {curso} → suma al alumno al grupo elegido, gratis y sin quitarle
// ninguno de los que ya tenía. Sirve igual para un grupo dictado (ver sus grabaciones) que para uno
// que viene (inscribirse).
func (s *Server) paseUnirme(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !tienePaseLibre(p) {
		writeErr(w, 403, "forbidden", "Esta página es para quien tiene pase libre.")
		return
	}
	var in struct {
		Curso string `json:"curso"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	id := strings.TrimSpace(in.Curso)
	grupos := s.gruposPase()
	i := slices.IndexFunc(grupos, func(g grupoPase) bool { return id != "" && (g.c.ID == id || g.c.Slug == id) })
	if i < 0 {
		notFound(w, "ese grupo en el catálogo")
		return
	}
	c := grupos[i].c
	slug := c.Slug
	if slug == "" {
		slug = c.ID
	}
	cohorts := slices.Clone(p.Cohorts)
	if !compartenGrupo(cohorts, c.Cohorts) {
		cohorts = append(cohorts, s.cohortePropia(c))
		roles := p.Roles
		if len(roles) == 0 {
			roles = []string{"student"}
		}
		if err := s.DB.UpdateUserRoles(r.Context(), p.ID, roles, cohorts); err != nil {
			internal(w, err)
			return
		}
	}
	writeJSON(w, 200, map[string]any{"cohorts": cohorts, "curso": slug})
}
