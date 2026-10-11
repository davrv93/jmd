package content

import (
	"os"
	"path/filepath"
	"sort"

	"github.com/davrv93/jmd/lms/api/internal/skills"
)

// SkillCurso es una skill del curso (solo lectura): se copia a la cuenta del alumno para editarla.
type SkillCurso struct {
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion"`
	Cuerpo      string `json:"cuerpo"`
}

// loadSkillsCurso lee skills/<nombre>/SKILL.md del curso. Las carpetas que empiezan por «_» (perfiles,
// notas) no son skills. El nombre sale del front matter; si falta, de la carpeta.
func loadSkillsCurso(dir string) []*SkillCurso {
	files, _ := filepath.Glob(filepath.Join(dir, "skills", "*", "SKILL.md"))
	sort.Strings(files)
	var out []*SkillCurso
	for _, f := range files {
		carpeta := filepath.Base(filepath.Dir(f))
		if carpeta[0] == '_' {
			continue
		}
		raw, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		nombre, desc, _ := skills.Cabecera(string(raw))
		if nombre == "" {
			nombre = carpeta
		}
		out = append(out, &SkillCurso{Nombre: nombre, Descripcion: desc, Cuerpo: string(raw)})
	}
	return out
}

// SkillsCurso devuelve las skills del curso (courseID vacío = las de todos los cursos), por nombre.
func (c *Catalog) SkillsCurso(courseID string) []*SkillCurso {
	var out []*SkillCurso
	for _, co := range c.courses {
		if courseID == "" || co.ID == courseID {
			out = append(out, c.skillsCurso[co.ID]...)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Nombre < out[j].Nombre })
	return out
}

// SkillCurso busca una skill del curso por nombre.
func (c *Catalog) SkillCurso(nombre string) *SkillCurso {
	for _, s := range c.SkillsCurso("") {
		if s.Nombre == nombre {
			return s
		}
	}
	return nil
}
