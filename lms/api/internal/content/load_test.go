package content

import (
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// El contenido real del repo debe cargar sin errores y la clase 1 debe estar completa.
func TestRealContent(t *testing.T) {
	_, file, _, _ := runtime.Caller(0)
	dir := filepath.Join(filepath.Dir(file), "..", "..", "..", "content")
	cat, err := Load(dir)
	if err != nil {
		t.Fatalf("cargar %s: %v", dir, err)
	}
	c := cat.Course("programacion-agentica")
	if c == nil {
		t.Fatal("falta el curso programacion-agentica")
	}
	l := cat.Lesson("pa-01")
	if l == nil || !l.Published {
		t.Fatal("la clase 1 (pa-01) debe existir y estar publicada")
	}
	if len(l.Objectives) < 3 || len(l.Cycle) < 5 || len(l.Materials) < 10 {
		t.Fatalf("clase 1 incompleta: %d objetivos, %d pasos, %d materiales", len(l.Objectives), len(l.Cycle), len(l.Materials))
	}
	for _, want := range []string{"Qué es Docker", "Qué es VS Code", "agente de IA", "proveedor", "Qué es un modelo", "parámetros", "RTK", "caveman", "MCP", "skill"} {
		if !strings.Contains(l.BodyMD, want) {
			t.Errorf("la clase 1 no menciona %q", want)
		}
	}
	if !strings.Contains(l.BodyHTML, "<h2") || !strings.Contains(l.BodyHTML, "<table>") {
		t.Error("el HTML no tiene títulos o tablas")
	}
	a := cat.Assignment("tarea-01")
	if a == nil || a.LessonID != "pa-01" || a.MaxPoints() != 20 {
		t.Fatalf("tarea-01: %+v", a)
	}
	// Las diapositivas se embeben desde slides_dir: una URL por imagen, en orden.
	var deck *Material
	for i := range l.Materials {
		if len(l.Materials[i].Slides) > 0 {
			deck = &l.Materials[i]
		}
	}
	if deck == nil || len(deck.Slides) < 10 || len(deck.SlideFiles) != len(deck.Slides) {
		t.Fatalf("la clase 1 debe traer diapositivas embebidas: %+v", deck)
	}
	if !strings.HasSuffix(deck.Slides[0], "/01.webp") || !strings.HasSuffix(deck.File, ".pptx") {
		t.Errorf("diapositivas: primera %q, descarga %q", deck.Slides[0], deck.File)
	}
	for _, m := range l.Materials {
		if !strings.HasPrefix(m.URL, "https://") && !strings.HasPrefix(m.URL, "/files/") {
			t.Errorf("material %s sin URL https: %q", m.ID, m.URL)
		}
	}
	// Ejemplos: los seis, en el orden de «order», ligados a la clase 1 y con HTML.
	want := []string{"ej-skill-saludo", "ej-skill-commit", "ej-mcp-config", "ej-parametros", "ej-skills-guia", "ej-opencode-guia"}
	exs := cat.Examples(c.ID)
	if len(exs) != len(want) {
		t.Fatalf("ejemplos: %d, quería %d", len(exs), len(want))
	}
	for i, e := range exs {
		if e.ID != want[i] || cat.Example(e.ID) != e {
			t.Errorf("ejemplo %d: %q, quería %q", i, e.ID, want[i])
		}
		if e.LessonID != "" && e.LessonID != "pa-01" {
			t.Errorf("%s: sesión %q", e.ID, e.LessonID)
		}
		if !e.Published || e.Summary == "" || len(e.Tags) == 0 || !exampleLevels[e.Level] {
			t.Errorf("%s: front matter incompleto: %+v", e.ID, e)
		}
		if !strings.Contains(e.BodyHTML, "<pre><code") || !strings.Contains(e.BodyHTML, "<h2") {
			t.Errorf("%s: el HTML no tiene bloques de código o títulos", e.ID)
		}
	}
	if exs[0].LessonID != "pa-01" || exs[0].Title != "Tu primera skill en OpenCode" {
		t.Errorf("ej-skill-saludo: %+v", exs[0])
	}
}

func TestFrontMatterErrors(t *testing.T) {
	dir := t.TempDir()
	if _, err := Load(dir); err == nil {
		t.Fatal("sin carpeta courses debe fallar")
	}
}
