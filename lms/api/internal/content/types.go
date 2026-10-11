// Package content carga los cursos, sesiones, tareas y ejemplos desde archivos (YAML + Markdown).
//
// El contenido es la fuente de verdad del temario y se versiona con git: el instructor deja el
// avance y las tareas haciendo commit. Nada de esto va a la base de datos; ahí solo quedan los
// usuarios, el progreso, las preguntas y las entregas.
package content

import "time"

// Course es un curso con sus módulos en orden.
type Course struct {
	ID          string   `yaml:"id" json:"id"`
	Slug        string   `yaml:"slug" json:"slug"`
	Title       string   `yaml:"title" json:"title"`
	Description string   `yaml:"description" json:"description"`
	Cohorts     []string `yaml:"cohorts" json:"cohorts"`
	Modules     []Module `yaml:"modules" json:"modules"`
}

// Module agrupa sesiones. En el YAML lleva los ids; Lessons se rellena al cargar.
type Module struct {
	ID        string    `yaml:"id" json:"id"`
	Title     string    `yaml:"title" json:"title"`
	LessonIDs []string  `yaml:"lessons" json:"-"`
	Lessons   []*Lesson `yaml:"-" json:"lessons"`
}

// Lesson es una sesión: front matter + cuerpo en Markdown (ya convertido a HTML).
type Lesson struct {
	ID         string      `yaml:"id" json:"id"`
	Title      string      `yaml:"title" json:"title"`
	StartsAt   *time.Time  `yaml:"starts_at" json:"starts_at"`
	Published  bool        `yaml:"published" json:"published"`
	Objectives []Objective `yaml:"objectives" json:"objectives"`
	Recording  *Recording  `yaml:"recording" json:"recording"`
	Repo       *Repo       `yaml:"repo" json:"repo"`
	Materials  []Material  `yaml:"materials" json:"materials"`
	Cycle      []CycleStep `yaml:"cycle" json:"cycle"`

	// Rellenados al cargar.
	CourseID  string `yaml:"-" json:"course_id"`
	ModuleID  string `yaml:"-" json:"module_id"`
	BodyMD    string `yaml:"-" json:"-"`
	BodyHTML  string `yaml:"-" json:"content_html"`
	SourceRel string `yaml:"-" json:"-"`
}

// Objective es un objetivo de aprendizaje de la sesión.
type Objective struct {
	ID    string `yaml:"id" json:"id"`
	Title string `yaml:"title" json:"title"`
}

// Recording es el enlace de la grabación (Zoom) con su código.
type Recording struct {
	URL      string `yaml:"url" json:"url"`
	Passcode string `yaml:"passcode" json:"passcode,omitempty"`
}

// Repo es el repositorio de código de la sesión y su referencia.
type Repo struct {
	URL string `yaml:"url" json:"url"`
	Ref string `yaml:"ref" json:"ref"`
}

// Material es un material publicado: hoy, enlaces (link, doc, repo, video, slides, pdf).
type Material struct {
	ID           string   `yaml:"id" json:"id"`
	Title        string   `yaml:"title" json:"title"`
	Kind         string   `yaml:"kind" json:"kind"`
	URL          string   `yaml:"url" json:"url"`
	File         string   `yaml:"file" json:"-"` // ruta relativa a la carpeta del curso (p. ej. materials/clase-01.pdf)
	ObjectiveIDs []string `yaml:"objective_ids" json:"objective_ids"`

	// SlidesDir es una carpeta de imágenes (una por diapositiva, en orden alfabético) que el
	// front muestra en un visor embebido; File queda como la descarga (.pptx o .pdf).
	SlidesDir  string   `yaml:"slides_dir" json:"-"`
	SlideFiles []string `yaml:"-" json:"-"`      // rutas relativas al curso, para autorizar /files
	Slides     []string `yaml:"-" json:"slides"` // URLs de las imágenes
}

// CycleStep es un paso del ciclo de aprendizaje: qué hacer, con qué herramienta y cómo comprobarlo.
//
// Phase sitúa el paso en una de las cuatro fases del ciclo de Kolb (aprendizaje experiencial):
// experiencia · reflexion · conceptualizacion · experimentacion. Si se omite en el contenido,
// el front la deduce del orden y la herramienta (ver web/src/lib/kolb.ts).
type CycleStep struct {
	ID          string `yaml:"id" json:"id"`
	Title       string `yaml:"title" json:"title"`
	Tool        string `yaml:"tool" json:"tool"`
	Phase       string `yaml:"phase" json:"phase,omitempty"`
	Description string `yaml:"description" json:"description"`
	Check       string `yaml:"check" json:"check"`
}

// Assignment es una tarea con su rúbrica. El enunciado va en el cuerpo Markdown.
type Assignment struct {
	ID           string            `yaml:"id" json:"id"`
	Title        string            `yaml:"title" json:"title"`
	LessonID     string            `yaml:"lesson" json:"lesson_id"`
	DueAt        *time.Time        `yaml:"due_at" json:"due_at"`
	MaxScore     float64           `yaml:"max_score" json:"max_score"`
	Autograde    bool              `yaml:"autograde" json:"autograde"`
	ObjectiveIDs []string          `yaml:"objective_ids" json:"objective_ids"`
	Rubric       []RubricCriterion `yaml:"rubric" json:"rubric"`

	CourseID        string `yaml:"-" json:"course_id"`
	DescriptionMD   string `yaml:"-" json:"description_md"`
	DescriptionHTML string `yaml:"-" json:"description_html"`
}

// Example es un ejemplo práctico del curso: front matter + cuerpo en Markdown (ya en HTML).
type Example struct {
	ID       string   `yaml:"id" json:"id"`
	Title    string   `yaml:"title" json:"title"`
	Summary  string   `yaml:"summary" json:"summary"`
	Tags     []string `yaml:"tags" json:"tags"`
	Level    string   `yaml:"level" json:"level"`      // básico · intermedio · avanzado
	LessonID string   `yaml:"lesson" json:"lesson_id"` // opcional
	// Phase sitúa el ejemplo en una fase del ciclo de Kolb (experiencia · reflexion ·
	// conceptualizacion · experimentacion). Opcional.
	Phase     string `yaml:"phase" json:"phase,omitempty"`
	Repo      *Repo  `yaml:"repo" json:"repo"`
	Published bool   `yaml:"published" json:"published"` // true si falta la clave
	Order     int    `yaml:"order" json:"order"`         // 0 = sin orden (van al final, por título)

	CourseID string `yaml:"-" json:"course_id"`
	BodyMD   string `yaml:"-" json:"-"`
	BodyHTML string `yaml:"-" json:"content_html"`
}

// Niveles válidos de un ejemplo.
var exampleLevels = map[string]bool{"básico": true, "intermedio": true, "avanzado": true}

// RubricCriterion es un criterio con sus niveles y puntos.
type RubricCriterion struct {
	Criterion string        `yaml:"criterion" json:"criterion"`
	Levels    []RubricLevel `yaml:"levels" json:"levels"`
}

// RubricLevel es un nivel de un criterio.
type RubricLevel struct {
	Title  string  `yaml:"title" json:"title"`
	Points float64 `yaml:"points" json:"points"`
}

// MaxPoints es la suma del nivel más alto de cada criterio.
func (a *Assignment) MaxPoints() float64 {
	if a.MaxScore > 0 {
		return a.MaxScore
	}
	var total float64
	for _, c := range a.Rubric {
		var best float64
		for _, l := range c.Levels {
			if l.Points > best {
				best = l.Points
			}
		}
		total += best
	}
	return total
}
