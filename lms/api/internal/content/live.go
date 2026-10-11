package content

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"gopkg.in/yaml.v3"
)

// Escena es una diapositiva viva del modo LIVE: una carpeta con escena.yaml + escena.html bajo
// lms/content/courses/<curso>/live/<lección>/<NN-nombre>/.
type Escena struct {
	ID          string     `yaml:"id" json:"id"`
	Titulo      string     `yaml:"titulo" json:"titulo"`
	Fase        string     `yaml:"fase" json:"fase"`
	Paso        string     `yaml:"paso" json:"paso"`
	DuracionMin int        `yaml:"duracion_min" json:"duracion_min"`
	LoLogre     bool       `yaml:"lo_logre" json:"lo_logre"`
	Evidencia   string     `yaml:"evidencia" json:"evidencia"`
	UmbralPct   int        `yaml:"umbral_pct" json:"umbral_pct"`
	Compuerta   string     `yaml:"compuerta" json:"compuerta"`
	Comandos    []EscCmd   `yaml:"comandos" json:"comandos"`
	Tareas      []EscTarea `yaml:"tareas" json:"tareas"`
	Respaldo    string     `yaml:"respaldo" json:"respaldo,omitempty"`
	Oculta      bool       `yaml:"oculta" json:"oculta,omitempty"`

	LessonID string `yaml:"-" json:"lesson_id"`
	HTMLPath string `yaml:"-" json:"-"`
	Orden    int    `yaml:"-" json:"orden"`
}

// EscCmd es un comando sugerido en el panel de ayuda de la terminal.
type EscCmd struct {
	Titulo string `yaml:"titulo" json:"titulo"`
	Cmd    string `yaml:"cmd" json:"cmd"`
}

// EscTarea es una tarea del plan de trabajo declarada por la escena (fase 6).
type EscTarea struct {
	ID     string `yaml:"id" json:"id"`
	Titulo string `yaml:"titulo" json:"titulo"`
}

// fases válidas para escena.yaml (las mismas del ciclo de Kolb).
var fasesEscena = []string{"experiencia", "reflexion", "conceptualizacion", "experimentacion"}

// loadEscenas lee las escenas de una lección ordenadas por nombre de carpeta.
func loadEscenas(dir, lessonID string, lesson *Lesson) ([]*Escena, error) {
	base := filepath.Join(dir, "live", lessonID)
	entradas, err := os.ReadDir(base)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []*Escena
	for _, e := range entradas {
		if !e.IsDir() || strings.HasPrefix(e.Name(), "_") {
			continue
		}
		carpeta := filepath.Join(base, e.Name())
		raw, err := os.ReadFile(filepath.Join(carpeta, "escena.yaml"))
		if err != nil {
			return nil, fmt.Errorf("live/%s/%s: %w", lessonID, e.Name(), err)
		}
		var es Escena
		if err := yaml.Unmarshal(raw, &es); err != nil {
			return nil, fmt.Errorf("live/%s/%s/escena.yaml: %w", lessonID, e.Name(), err)
		}
		if es.ID == "" {
			es.ID = e.Name()
		}
		if es.ID != e.Name() {
			return nil, fmt.Errorf("live/%s/%s/escena.yaml: el id %q no coincide con la carpeta", lessonID, e.Name(), es.ID)
		}
		if html, err := os.Stat(filepath.Join(carpeta, "escena.html")); err != nil || html.IsDir() {
			return nil, fmt.Errorf("live/%s/%s: falta escena.html", lessonID, e.Name())
		}
		if !slices.Contains(fasesEscena, es.Fase) {
			return nil, fmt.Errorf("live/%s/%s/escena.yaml: la fase %q no es una de las cuatro", lessonID, e.Name(), es.Fase)
		}
		if es.Paso != "" {
			ok := false
			for _, st := range lesson.Cycle {
				if st.ID == es.Paso {
					ok = true
				}
			}
			if !ok {
				return nil, fmt.Errorf("live/%s/%s/escena.yaml: el paso %q no existe en el ciclo de la sesión", lessonID, e.Name(), es.Paso)
			}
		}
		// Defaults.
		if es.UmbralPct == 0 {
			es.UmbralPct = 80
		}
		if es.Compuerta == "" {
			if es.LoLogre {
				es.Compuerta = "lo_logre"
			} else {
				es.Compuerta = "ninguna"
			}
		}
		if es.Evidencia == "" {
			es.Evidencia = "ninguna"
		}
		es.LessonID = lessonID
		es.HTMLPath = filepath.Join(carpeta, "escena.html")
		es.Orden = len(out) + 1
		out = append(out, &es)
	}
	return out, nil
}

// Escenas lista las escenas visibles de una lección (las ocultas no se listan).
func (c *Catalog) Escenas(lessonID string) []*Escena {
	todas := c.escenas[lessonID]
	out := []*Escena{}
	for _, e := range todas {
		if !e.Oculta {
			out = append(out, e)
		}
	}
	return out
}

// Escena busca una escena por id dentro de una lección.
func (c *Catalog) Escena(lessonID, id string) *Escena {
	for _, e := range c.escenas[lessonID] {
		if e.ID == id {
			return e
		}
	}
	return nil
}

// ComunDir es la carpeta de archivos que comparten las escenas de una lección (live/_comun:
// Three.js, los avatares, utilidades). Vacía si la lección no tiene escenas. Las carpetas que
// empiezan por «_» no se cargan como escenas.
func (c *Catalog) ComunDir(lessonID string) string {
	for _, e := range c.escenas[lessonID] {
		// HTMLPath = <curso>/live/<lección>/<escena>/escena.html
		return filepath.Join(filepath.Dir(filepath.Dir(filepath.Dir(e.HTMLPath))), "_comun")
	}
	return ""
}
