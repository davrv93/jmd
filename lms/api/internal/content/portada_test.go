package content

import (
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func cursoConPortada(t *testing.T, portada string, archivos map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	base := map[string]string{
		"courses/curso/course.yaml":   "id: curso\ntitle: Curso\nportada: " + portada + "\nmodules:\n  - id: m1\n    title: M1\n    lessons: [l1]\n",
		"courses/curso/lessons/l1.md": leccionBase,
	}
	for k, v := range archivos {
		base["courses/curso/"+k] = v
	}
	escribir(t, dir, base)
	return dir
}

func TestPortadaCarga(t *testing.T) {
	dir := cursoConPortada(t, "portada/cuenta.html", map[string]string{
		"portada/cuenta.html": "<!doctype html><p>faltan</p>",
	})
	cat, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	c := cat.Course("curso")
	want := filepath.Join(dir, "courses", "curso", "portada", "cuenta.html")
	if c.Portada != "portada/cuenta.html" || c.PortadaPath != want {
		t.Fatalf("portada %q, ruta %q (quería %q)", c.Portada, c.PortadaPath, want)
	}
}

func TestPortadaOpcional(t *testing.T) {
	dir := cursoConEscenas(t, nil)
	cat, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if c := cat.Course("curso"); c.Portada != "" || c.PortadaPath != "" {
		t.Fatalf("sin portada en el YAML no debe haber portada: %+v", c)
	}
}

func TestPortadaErrores(t *testing.T) {
	casos := map[string]struct {
		portada  string
		archivos map[string]string
		msg      string
	}{
		"sale de la carpeta": {"../otro/portada.html", nil, "dentro de la carpeta"},
		"ruta absoluta":      {"/etc/passwd.html", nil, "dentro de la carpeta"},
		"no es html":         {"portada.js", map[string]string{"portada.js": "alert(1)"}, "debe ser un .html"},
		"no existe":          {"portada.html", nil, "no existe"},
		"muy pesada":         {"portada.html", map[string]string{"portada.html": strings.Repeat("x", MaxPortada+1)}, "máximo"},
	}
	for nombre, cs := range casos {
		t.Run(nombre, func(t *testing.T) {
			_, err := Load(cursoConPortada(t, cs.portada, cs.archivos))
			if err == nil || !strings.Contains(err.Error(), "portada") || !strings.Contains(err.Error(), cs.msg) {
				t.Fatalf("quería un error de portada con %q, salió %v", cs.msg, err)
			}
		})
	}
}

// La hackathon Ready Set Go! trae su cuenta regresiva como portada y como primera escena del LIVE de hk-01.
func TestPortadaHackathonReal(t *testing.T) {
	_, file, _, _ := runtime.Caller(0)
	cat, err := Load(filepath.Join(filepath.Dir(file), "..", "..", "..", "content"))
	if err != nil {
		t.Fatal(err)
	}
	c := cat.Course("hackathon-ready-set-go")
	if c == nil || c.PortadaPath == "" || len(c.Cohorts) != 1 || c.Cohorts[0] != "hackathon-rsg-1" {
		t.Fatalf("curso de la hackathon: %+v", c)
	}
	l := cat.Lesson("hk-01")
	if l == nil || !l.Published || l.StartsAt == nil || l.Duration != 345 ||
		l.StartsAt.UTC().Format("2006-01-02T15:04") != "2026-12-13T18:30" {
		t.Fatalf("hk-01: %+v", l)
	}
	if e := cat.Escena("hk-01", "01-cuenta-regresiva"); e == nil || e.HTMLPath != c.PortadaPath {
		t.Fatalf("la escena 01-cuenta-regresiva debe ser la misma página de la portada: %+v", e)
	}
	if !strings.Contains(l.BodyHTML, `<iframe src="/api/v1/live/hk-01/escenas/01-cuenta-regresiva/html"`) {
		t.Error("el cuerpo de hk-01 debe embeber la cuenta regresiva")
	}
}
