package content

import (
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"unicode"
)

// Identidad es cómo se ve un curso en el portal del alumno: su color, su glifo, la frase que lo
// resume, lo que el alumno va a poder hacer al terminar y, si la hay, una imagen de portada.
// Todo es opcional en course.yaml:
//
//	identidad:
//	  color: magenta            # uno de ColoresIdentidad
//	  icono: palette            # uno de IconosIdentidad (los dibuja web/src/components/icon.tsx)
//	  frase: "Explica cualquier idea con una pieza que se ve."
//	  resultado: ["Un prototipo navegable", "Una landing publicada"]
//	  nivel: "Desde cero"       # opcional: «Desde cero», «Intermedio» o «Avanzado»
//	  portada: identidad/portada.webp   # opcional: imagen dentro de la carpeta del curso
//
// Lo que falte se completa al cargar (ver resolverIdentidades): primero con otro grupo del mismo curso
// (mismo agenda.nombre) que sí la tenga, después con lo propio del área (agenda.area) y, para la frase y
// el resultado, con la descripción y el proyecto final del curso. Un valor que no existe (color o icono
// desconocido, portada que no está) no tumba la carga: se avisa en el log y se usa el del área.
type Identidad struct {
	Color     string   `yaml:"color" json:"color"`
	Icono     string   `yaml:"icono" json:"icono"`
	Frase     string   `yaml:"frase" json:"frase"`
	Resultado []string `yaml:"resultado" json:"resultado"`
	Nivel     string   `yaml:"nivel" json:"nivel,omitempty"`
	Portada   string   `yaml:"portada" json:"-"`

	// PortadaPath es la ruta en disco de la imagen ya validada; vacía si no hay.
	PortadaPath string `yaml:"-" json:"-"`
}

// ColoresIdentidad son los colores con nombre que el front sabe pintar en claro y en oscuro con
// contraste suficiente (web/src/components/portada.css). Un color nuevo se define allí antes que aquí.
var ColoresIdentidad = []string{"violeta", "indigo", "azul", "petroleo", "teal", "verde", "oliva", "ambar", "coral", "magenta", "ciruela", "pizarra"}

// IconosIdentidad son los glifos que puede llevar un curso (nombres de web/src/components/icon.tsx).
var IconosIdentidad = []string{
	"bot", "code", "terminal", "wand", "sparkles", "zap", "docker", "box", "globe", "target", "shieldCheck",
	"video", "chat", "layers", "book", "grad", "star", "gamepad", "film", "palette", "chart", "database",
	"bug", "layout", "phone", "brain", "search", "cycle", "fileCode", "store",
}

// NivelesIdentidad: los niveles que se muestran en la tarjeta del catálogo.
var NivelesIdentidad = []string{"Desde cero", "Intermedio", "Avanzado"}

// identidadArea es lo que toma un curso de su área cuando no dice nada.
var identidadArea = map[string]Identidad{
	"agentica":       {Color: "violeta", Icono: "bot"},
	"diseno":         {Color: "magenta", Icono: "palette"},
	"datos":          {Color: "azul", Icono: "chart"},
	"seguridad":      {Color: "teal", Icono: "shieldCheck"},
	"qa":             {Color: "oliva", Icono: "bug"},
	"requerimientos": {Color: "petroleo", Icono: "target"},
	"infra":          {Color: "pizarra", Icono: "box"},
	"":               {Color: "indigo", Icono: "sparkles"},
}

// IdentidadDeArea devuelve el color y el icono por defecto de un área (o los genéricos).
func IdentidadDeArea(area string) Identidad {
	if d, ok := identidadArea[area]; ok {
		return d
	}
	return identidadArea[""]
}

// Area es el área del curso según su bloque agenda ("" si no tiene).
func (c *Course) Area() string {
	if c.Agenda == nil {
		return ""
	}
	return c.Agenda.Area
}

var reGrupoTitulo = regexp.MustCompile(`(?i)^(grupo|clase|sesi[oó]n)\s+\S+$`)

// Nombre es el nombre del curso sin el grupo ni emojis: agenda.nombre o, si no hay, el título limpio.
func (c *Course) Nombre() string {
	if c.Agenda != nil && strings.TrimSpace(c.Agenda.Nombre) != "" {
		return SinEmoji(c.Agenda.Nombre)
	}
	var out []string
	for _, p := range strings.Split(c.Title, " · ") {
		p = strings.TrimSpace(p)
		if p == "" || reGrupoTitulo.MatchString(p) {
			continue
		}
		out = append(out, p)
	}
	if len(out) == 0 {
		return SinEmoji(c.Title)
	}
	return SinEmoji(strings.Join(out, " · "))
}

// SinEmoji quita los pictogramas (🎮, ⚡…) y los espacios que dejan: la interfaz no usa emojis.
func SinEmoji(s string) string {
	s = strings.Map(func(r rune) rune {
		if r == 0xFE0F || r == 0x200D || (r >= 0x1F000 && r <= 0x1FAFF) || (r >= 0x2600 && r <= 0x27BF) || (r >= 0x2B00 && r <= 0x2BFF) {
			return -1
		}
		return r
	}, s)
	return strings.Join(strings.FieldsFunc(s, unicode.IsSpace), " ")
}

// primeraFrase: la primera oración de un texto, recortada a un largo razonable para una tarjeta.
func primeraFrase(t string) string {
	t = strings.Join(strings.Fields(SinEmoji(t)), " ")
	if t == "" {
		return ""
	}
	if i := strings.Index(t, ". "); i > 0 {
		t = t[:i+1]
	}
	const max = 150
	if r := []rune(t); len(r) > max {
		corte := string(r[:max])
		if j := strings.LastIndex(corte, " "); j > 60 {
			corte = corte[:j]
		}
		t = strings.TrimRight(corte, ",;:· ") + "…"
	}
	return t
}

// validarIdentidad revisa lo escrito en course.yaml: lo desconocido se avisa y se descarta (se usará el
// valor del área), y la portada debe ser una imagen dentro de la carpeta del curso.
func validarIdentidad(dir string, c *Course) {
	id := c.Identidad
	if id == nil {
		return
	}
	if id.Color != "" && !slices.Contains(ColoresIdentidad, id.Color) {
		slog.Warn("identidad: color desconocido; se usa el del área", "curso", c.ID, "color", id.Color)
		id.Color = ""
	}
	if id.Icono != "" && !slices.Contains(IconosIdentidad, id.Icono) {
		slog.Warn("identidad: icono desconocido; se usa el del área", "curso", c.ID, "icono", id.Icono)
		id.Icono = ""
	}
	if id.Nivel != "" && !slices.Contains(NivelesIdentidad, id.Nivel) {
		slog.Warn("identidad: nivel desconocido; no se muestra", "curso", c.ID, "nivel", id.Nivel)
		id.Nivel = ""
	}
	id.Frase = strings.TrimSpace(id.Frase)
	var res []string
	for _, r := range id.Resultado {
		if r = strings.TrimSpace(r); r != "" {
			res = append(res, r)
		}
	}
	id.Resultado = res
	if id.Portada != "" {
		if p, ok := imagenDelCurso(dir, id.Portada, MaxPortadaImagen); ok {
			id.PortadaPath = p
		} else {
			slog.Warn("identidad: portada no válida (imagen .webp/.jpg/.png/.svg de hasta 400 KB dentro del curso); se usa la generada", "curso", c.ID, "portada", id.Portada)
			id.Portada = ""
		}
	}
}

// MaxPortadaImagen es el tope de la imagen de portada; MaxMiniatura, el de una miniatura de sesión.
const (
	MaxPortadaImagen = 400 << 10
	MaxMiniatura     = 120 << 10
)

// ExtImagen son las extensiones de imagen que sirve el LMS para portadas y miniaturas.
var ExtImagen = []string{".webp", ".jpg", ".jpeg", ".png", ".svg"}

// imagenDelCurso valida una imagen (ruta relativa a la carpeta del curso) y devuelve su ruta en disco.
func imagenDelCurso(dir, rel string, max int64) (string, bool) {
	if !safeRel(rel) || !slices.Contains(ExtImagen, strings.ToLower(filepath.Ext(rel))) {
		return "", false
	}
	full := filepath.Join(dir, filepath.FromSlash(rel))
	st, err := os.Stat(full)
	if err != nil || st.IsDir() || st.Size() > max {
		return "", false
	}
	return full, true
}

// miniaturaDe busca la miniatura de una sesión: miniaturas/<sesión>.webp (o .jpg/.png) en el curso.
func miniaturaDe(dir, lessonID string) string {
	for _, ext := range []string{".webp", ".jpg", ".png"} {
		if p, ok := imagenDelCurso(dir, "miniaturas/"+lessonID+ext, MaxMiniatura); ok {
			return p
		}
	}
	return ""
}

// resolverIdentidades completa la identidad de cada curso (ver Identidad). Se llama con todos los
// cursos cargados, porque un grupo hereda de otro grupo del mismo curso.
func resolverIdentidades(cursos []*Course) {
	propia := map[string]*Identidad{} // nombre del curso → identidad escrita en algún grupo
	for _, c := range cursos {
		if c.Identidad != nil && (c.Identidad.Frase != "" || c.Identidad.Color != "" || len(c.Identidad.Resultado) > 0) {
			if _, ok := propia[c.Nombre()]; !ok {
				propia[c.Nombre()] = c.Identidad
			}
		}
	}
	for _, c := range cursos {
		r := Identidad{}
		if c.Identidad != nil {
			r = *c.Identidad
			r.Resultado = slices.Clone(c.Identidad.Resultado)
		}
		if h := propia[c.Nombre()]; h != nil && h != c.Identidad {
			if r.Color == "" {
				r.Color = h.Color
			}
			if r.Icono == "" {
				r.Icono = h.Icono
			}
			if r.Frase == "" {
				r.Frase = h.Frase
			}
			if len(r.Resultado) == 0 {
				r.Resultado = slices.Clone(h.Resultado)
			}
			if r.Nivel == "" {
				r.Nivel = h.Nivel
			}
			if r.PortadaPath == "" && h.PortadaPath != "" {
				r.PortadaPath = h.PortadaPath
			}
		}
		d := IdentidadDeArea(c.Area())
		if r.Color == "" {
			r.Color = d.Color
		}
		if r.Icono == "" {
			r.Icono = d.Icono
		}
		if r.Frase == "" {
			r.Frase = primeraFrase(c.Description)
		}
		if len(r.Resultado) == 0 && strings.TrimSpace(c.ProyectoFinal) != "" {
			r.Resultado = []string{strings.Join(strings.Fields(c.ProyectoFinal), " ")}
		}
		if r.Resultado == nil {
			r.Resultado = []string{}
		}
		c.Ident = r
	}
}
