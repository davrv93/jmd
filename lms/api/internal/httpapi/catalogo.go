package httpapi

import (
	"net/http"
	"net/url"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
)

// Catálogo del alumno (/catalogo/): todos los grupos que vienen o están en curso, con su identidad, sus
// fechas y cómo inscribirse. Lo ve cualquiera con sesión. Solo lleva datos del contenido (nombres,
// fechas, temario) y, de la persona que pregunta, si ya está en el grupo: ningún dato de otros alumnos
// (ni cuántos hay inscritos). Las recomendaciones salen de los cursos de quien pregunta.

// identidadVista es la identidad del curso tal como la usa el front.
func identidadVista(c *content.Course) map[string]any {
	id := c.Ident
	v := map[string]any{"color": id.Color, "icono": id.Icono, "frase": id.Frase, "resultado": id.Resultado}
	if id.Nivel != "" {
		v["nivel"] = id.Nivel
	}
	if id.PortadaPath != "" {
		v["portada_url"] = "/api/v1/courses/" + url.PathEscape(c.ID) + "/cover"
	}
	return v
}

// grupoDeCurso: «Grupo 2», «Domingo mañana»… (agenda.grupo o lo que diga el título).
func grupoDeCurso(c *content.Course) string {
	if c.Agenda != nil && c.Agenda.Grupo != "" {
		return c.Agenda.Grupo
	}
	return grupoDelTitulo(c.Title)
}

// miniaturaURL es la dirección de la miniatura de una sesión, o "" si no tiene.
func miniaturaURL(l *content.Lesson) string {
	if l.MiniaturaPath == "" {
		return ""
	}
	return "/api/v1/lessons/" + url.PathEscape(l.ID) + "/miniatura"
}

// sirveImagen entrega una imagen del contenido con su tipo y una caché corta.
func sirveImagen(w http.ResponseWriter, r *http.Request, full string) {
	h := w.Header()
	h.Set("Cache-Control", "private, max-age=600")
	h.Set("X-Content-Type-Options", "nosniff")
	switch strings.ToLower(filepath.Ext(full)) {
	case ".webp":
		h.Set("Content-Type", "image/webp")
	case ".jpg", ".jpeg":
		h.Set("Content-Type", "image/jpeg")
	case ".png":
		h.Set("Content-Type", "image/png")
	case ".svg":
		h.Set("Content-Type", "image/svg+xml")
		h.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
	}
	http.ServeFile(w, r, full)
}

// courseCover: GET /api/v1/courses/{id}/cover → la imagen de portada de identidad.portada. La pide el
// catálogo para cursos en los que el alumno todavía no está, así que basta con tener sesión.
func (s *Server) courseCover(w http.ResponseWriter, r *http.Request, p *Principal) {
	c := s.Content.Get().Course(r.PathValue("id"))
	if c == nil || c.Ident.PortadaPath == "" {
		notFound(w, "la portada")
		return
	}
	sirveImagen(w, r, c.Ident.PortadaPath)
}

// lessonMiniatura: GET /api/v1/lessons/{id}/miniatura → la miniatura de la sesión (su primera escena
// LIVE), para quien puede ver la sesión.
func (s *Server) lessonMiniatura(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.Content.Get().Lesson(r.PathValue("id"))
	if l == nil || l.MiniaturaPath == "" || s.visibleLesson(p, l) == nil {
		notFound(w, "la miniatura")
		return
	}
	sirveImagen(w, r, l.MiniaturaPath)
}

// ahoraCatalogo es el reloj del catálogo; las pruebas lo fijan.
var ahoraCatalogo = time.Now

type sesionCatalogo struct {
	N       int    `json:"n"`
	Titulo  string `json:"titulo"`
	Inicio  string `json:"inicio"`
	Minutos int    `json:"minutos"`
}

type recomendacion struct {
	Razon  string `json:"razon"`
	Puntos int    `json:"puntos"`
	Orden  int    `json:"orden"`
}

type cursoCatalogo struct {
	ID          string           `json:"id"`
	Slug        string           `json:"slug"`
	Nombre      string           `json:"nombre"`
	Grupo       string           `json:"grupo"`
	Area        string           `json:"area"`
	Identidad   map[string]any   `json:"identidad"`
	Inicio      string           `json:"inicio"`
	Fin         string           `json:"fin"`
	Estado      string           `json:"estado"` // proximo · en_curso
	Minutos     int              `json:"minutos"`
	Sesiones    []sesionCatalogo `json:"sesiones"`
	Inscrito    bool             `json:"inscrito"`
	Inscripcion string           `json:"inscripcion,omitempty"` // /inscripcion/<grupo>/ si está abierta
	Recomendado *recomendacion   `json:"recomendado,omitempty"`

	inicio time.Time
	curso  *content.Course
}

// tituloSesion: el título de la sesión sin «Sesión 2 ·», «Clase 1 ·» ni el grupo. Una sesión en
// borrador muestra el título de su módulo (el temario que ya está publicado en el brochure).
func tituloSesion(l *content.Lesson, modulo string) string {
	t := l.Title
	if !l.Published && strings.TrimSpace(modulo) != "" {
		t = modulo
	}
	var out []string
	for _, p := range strings.Split(content.SinEmoji(t), " · ") {
		p = strings.TrimSpace(p)
		f := strings.Fields(strings.ToLower(p))
		if p == "" || (len(f) <= 2 && len(f) > 0 && (f[0] == "grupo" || f[0] == "clase" || f[0] == "sesión" || f[0] == "sesion")) {
			continue
		}
		out = append(out, p)
	}
	if len(out) == 0 {
		return content.SinEmoji(t)
	}
	return strings.Join(out, " · ")
}

// cursosCatalogo arma los grupos con fechas que no terminaron, ordenados por su primera sesión.
func (s *Server) cursosCatalogo(p *Principal, ahora time.Time) []*cursoCatalogo {
	var out []*cursoCatalogo
	for _, c := range s.Content.Get().Courses() {
		if len(c.Cohorts) == 0 {
			continue // sin grupo: lo ve todo el mundo y no se inscribe nadie (material abierto)
		}
		min := 90
		if c.Agenda != nil && c.Agenda.Minutos > 0 {
			min = c.Agenda.Minutos
		}
		k := &cursoCatalogo{ID: c.ID, Slug: c.Slug, Nombre: c.Nombre(), Grupo: grupoDeCurso(c), Area: c.Area(),
			Identidad: identidadVista(c), Minutos: min, Sesiones: []sesionCatalogo{}, curso: c,
			Inscrito: matriculado(p, c.Cohorts)}
		var fin time.Time
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if l.StartsAt == nil {
					continue
				}
				d := min
				if l.Duration > 0 {
					d = l.Duration
				}
				k.Sesiones = append(k.Sesiones, sesionCatalogo{Titulo: tituloSesion(l, m.Title), Inicio: l.StartsAt.Format(time.RFC3339), Minutos: d})
				if k.inicio.IsZero() || l.StartsAt.Before(k.inicio) {
					k.inicio = *l.StartsAt
				}
				if f := l.StartsAt.Add(time.Duration(d) * time.Minute); f.After(fin) {
					fin = f
				}
			}
		}
		if k.inicio.IsZero() || !ahora.Before(fin) {
			continue
		}
		slices.SortStableFunc(k.Sesiones, func(a, b sesionCatalogo) int { return strings.Compare(a.Inicio, b.Inicio) })
		for i := range k.Sesiones {
			k.Sesiones[i].N = i + 1
		}
		k.Inicio, k.Fin = k.inicio.Format(time.RFC3339), fin.Format(time.RFC3339)
		k.Estado = "proximo"
		if !ahora.Before(k.inicio) {
			k.Estado = "en_curso"
		}
		for _, g := range c.Cohorts {
			if slices.Contains(s.Inscripcion, g) {
				k.Inscripcion = "/inscripcion/" + url.PathEscape(g) + "/"
				break
			}
		}
		out = append(out, k)
	}
	slices.SortStableFunc(out, func(a, b *cursoCatalogo) int { return a.inicio.Compare(b.inicio) })
	return out
}

// recomendar marca hasta cuatro grupos que vienen y en los que la persona no está: primero los de las
// áreas que ya cursó (diciendo por qué), sin repetir un curso que ya llevó en otro grupo; después los
// que empiezan pronto y tienen la inscripción abierta.
func (s *Server) recomendar(p *Principal, lista []*cursoCatalogo, ahora time.Time) {
	type hecho struct {
		nombre string
		fin    time.Time
	}
	porArea := map[string][]hecho{}
	llevados := map[string]bool{}
	for _, c := range s.Content.Get().Courses() {
		if !matriculado(p, c.Cohorts) {
			continue
		}
		llevados[c.Nombre()] = true
		var fin time.Time
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if l.StartsAt != nil && l.StartsAt.After(fin) {
					fin = *l.StartsAt
				}
			}
		}
		porArea[c.Area()] = append(porArea[c.Area()], hecho{c.Nombre(), fin})
	}
	var candidatos []*cursoCatalogo
	vistos := map[string]bool{}
	for _, k := range lista {
		// Un curso por nombre (el grupo que empieza antes) y nunca uno que ya llevó.
		if k.Inscrito || k.Estado != "proximo" || llevados[k.Nombre] || vistos[k.Nombre] {
			continue
		}
		vistos[k.Nombre] = true
		puntos, razon := 0, ""
		if hs := porArea[k.Area]; len(hs) > 0 && k.Area != "" {
			puntos += 3 + min(len(hs), 3)
			ult := hs[0]
			for _, h := range hs[1:] {
				if h.fin.After(ult.fin) {
					ult = h
				}
			}
			razon = "Porque llevaste " + ult.nombre
		}
		dias := k.inicio.Sub(ahora).Hours() / 24
		switch {
		case dias <= 14:
			puntos += 2
		case dias <= 35:
			puntos++
		}
		if k.Inscripcion != "" {
			puntos++
			if razon == "" {
				razon = "Inscripción abierta"
			}
		}
		if razon == "" {
			razon = "Empieza pronto"
		}
		k.Recomendado = &recomendacion{Razon: razon, Puntos: puntos}
		candidatos = append(candidatos, k)
	}
	slices.SortStableFunc(candidatos, func(a, b *cursoCatalogo) int {
		if a.Recomendado.Puntos != b.Recomendado.Puntos {
			return b.Recomendado.Puntos - a.Recomendado.Puntos
		}
		return a.inicio.Compare(b.inicio)
	})
	for i, k := range candidatos {
		if i >= 4 {
			k.Recomendado = nil
			continue
		}
		k.Recomendado.Orden = i + 1
	}
}

// catalogo: GET /api/v1/catalogo → los grupos que vienen o están en curso, con identidad, sesiones,
// inscripción y, para quien pregunta, si ya está dentro y cuáles le recomendamos.
func (s *Server) catalogo(w http.ResponseWriter, r *http.Request, p *Principal) {
	ahora := ahoraCatalogo()
	lista := s.cursosCatalogo(p, ahora)
	s.recomendar(p, lista, ahora)
	areas := []string{}
	for _, k := range lista {
		if k.Area != "" && !slices.Contains(areas, k.Area) {
			areas = append(areas, k.Area)
		}
	}
	writeJSON(w, 200, map[string]any{"ahora": ahora.Format(time.RFC3339), "cursos": lista, "areas": areas})
}
