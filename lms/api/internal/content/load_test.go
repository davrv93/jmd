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
	for _, m := range l.Materials {
		if !strings.HasPrefix(m.URL, "https://") && !strings.HasPrefix(m.URL, "/files/") {
			t.Errorf("material %s sin URL https: %q", m.ID, m.URL)
		}
	}
}

func TestFrontMatterErrors(t *testing.T) {
	dir := t.TempDir()
	if _, err := Load(dir); err == nil {
		t.Fatal("sin carpeta courses debe fallar")
	}
}
