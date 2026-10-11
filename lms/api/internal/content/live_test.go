package content

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// escribir crea archivos bajo base (rutas con /) y falla el test si algo no se puede escribir.
func escribir(t *testing.T, base string, archivos map[string]string) {
	t.Helper()
	for rel, cuerpo := range archivos {
		ruta := filepath.Join(base, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(ruta), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(ruta, []byte(cuerpo), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

const leccionBase = `---
id: l1
title: Sesión
published: true
cycle:
  - {id: ver, title: Ver, tool: zoom, description: Mira, check: visto}
---
cuerpo
`

func cursoConEscenas(t *testing.T, escenas map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	base := map[string]string{
		"courses/curso/course.yaml":   "id: curso\ntitle: Curso\nmodules:\n  - id: m1\n    title: M1\n    lessons: [l1]\n",
		"courses/curso/lessons/l1.md": leccionBase,
	}
	for k, v := range escenas {
		base["courses/curso/live/l1/"+k] = v
	}
	escribir(t, dir, base)
	return dir
}

func TestEscenasCargan(t *testing.T) {
	dir := cursoConEscenas(t, map[string]string{
		"02-dos/escena.yaml":     "id: 02-dos\ntitulo: Dos\nfase: reflexion\nlo_logre: true\numbral_pct: 60\n",
		"02-dos/escena.html":     "<!doctype html><p>2</p>",
		"01-uno/escena.yaml":     "titulo: Uno\nfase: experiencia\npaso: ver\nduracion_min: 5\n",
		"01-uno/escena.html":     "<!doctype html><p>1</p>",
		"_plantilla/escena.html": "ignorada: empieza con guion bajo",
	})
	cs, err := NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	es := cs.Get().Escenas("l1")
	if len(es) != 2 || es[0].ID != "01-uno" || es[1].ID != "02-dos" {
		t.Fatalf("orden o cantidad: %+v", es)
	}
	if es[0].UmbralPct != 80 || es[0].Compuerta != "ninguna" || es[0].Evidencia != "ninguna" {
		t.Errorf("defaults de la primera: %+v", es[0])
	}
	if es[1].UmbralPct != 60 || es[1].Compuerta != "lo_logre" || es[1].Orden != 2 {
		t.Errorf("la segunda: %+v", es[1])
	}
	if cs.Get().Escena("l1", "02-dos") == nil || cs.Get().Escena("l1", "nada") != nil {
		t.Error("Escena(): búsqueda por id")
	}
	if len(cs.Get().Escenas("otra")) != 0 {
		t.Error("una lección sin escenas devuelve lista vacía")
	}
}

func TestEscenasErrores(t *testing.T) {
	casos := map[string]struct {
		archivos map[string]string
		debe     string
	}{
		"paso inexistente": {map[string]string{
			"01-a/escena.yaml": "titulo: A\nfase: experiencia\npaso: no-existe\n", "01-a/escena.html": "<p>",
		}, "no-existe"},
		"id distinto de la carpeta": {map[string]string{
			"01-a/escena.yaml": "id: otra\ntitulo: A\nfase: experiencia\n", "01-a/escena.html": "<p>",
		}, "no coincide con la carpeta"},
		"falta escena.html": {map[string]string{
			"01-a/escena.yaml": "titulo: A\nfase: experiencia\n",
		}, "falta escena.html"},
		"fase inválida": {map[string]string{
			"01-a/escena.yaml": "titulo: A\nfase: otra\n", "01-a/escena.html": "<p>",
		}, "fase"},
	}
	for nombre, c := range casos {
		_, err := NewStore(cursoConEscenas(t, c.archivos))
		if err == nil || !strings.Contains(err.Error(), c.debe) || !strings.Contains(err.Error(), "01-a") {
			t.Errorf("%s: error %v, debía mencionar %q y la carpeta 01-a", nombre, err, c.debe)
		}
	}
}
