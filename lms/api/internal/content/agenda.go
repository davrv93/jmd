package content

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"
)

// AgendaExtra es una clase del calendario del instructor que no sale de una sesión del LMS: un curso
// propuesto, o una clase anunciada que aún no tiene sesión. Vive en content/agenda.yaml.
type AgendaExtra struct {
	ID       string     `yaml:"id"`
	Curso    string     `yaml:"curso"` // opcional: id o slug del curso al que se suma (toma su nombre, grupo y numeración)
	Nombre   string     `yaml:"nombre"`
	Grupo    string     `yaml:"grupo"`
	Sesion   string     `yaml:"sesion"`
	StartsAt *time.Time `yaml:"starts_at"`
	Minutos  int        `yaml:"minutos"`
	Area     string     `yaml:"area"`
	Estado   string     `yaml:"estado"` // propuesto · por-confirmar
	Nota     string     `yaml:"nota"`
}

var estadosAgenda = map[string]bool{"propuesto": true, "por-confirmar": true}

// loadAgenda lee dir/agenda.yaml (opcional): {clases: [...]}.
func loadAgenda(dir string) ([]*AgendaExtra, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "agenda.yaml"))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var doc struct {
		Clases []*AgendaExtra `yaml:"clases"`
	}
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		return nil, fmt.Errorf("agenda.yaml: %w", err)
	}
	vistos := map[string]bool{}
	for i, a := range doc.Clases {
		switch {
		case a.ID == "" || (a.Nombre == "" && a.Curso == ""):
			return nil, fmt.Errorf("agenda.yaml: la clase %d no tiene id, o le faltan nombre y curso", i+1)
		case vistos[a.ID]:
			return nil, fmt.Errorf("agenda.yaml: id repetido: %s", a.ID)
		case a.StartsAt == nil:
			return nil, fmt.Errorf("agenda.yaml: %s no tiene starts_at", a.ID)
		case a.Minutos <= 0:
			return nil, fmt.Errorf("agenda.yaml: %s no tiene minutos", a.ID)
		case !estadosAgenda[a.Estado]:
			return nil, fmt.Errorf("agenda.yaml: %s tiene estado %q (usa propuesto o por-confirmar)", a.ID, a.Estado)
		}
		vistos[a.ID] = true
	}
	return doc.Clases, nil
}

// Agenda devuelve las clases extra del calendario del instructor, en el orden del archivo.
func (c *Catalog) Agenda() []*AgendaExtra { return c.agenda }
