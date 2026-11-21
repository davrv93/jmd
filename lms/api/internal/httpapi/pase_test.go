package httpapi

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// newEnvPase: el curso del fixture más dos grupos de «Vibecoding» (uno dictado con grabación, sin
// bloque agenda; otro que viene), un taller que comparte la cohorte «c1» con el curso del fixture, la
// hackathon y un curso sin fechas ni grabaciones.
func newEnvPase(t *testing.T) *env {
	t.Helper()
	dir := writeFixture(t)
	cursos := map[string]map[string]string{
		"vibe": {
			"course.yaml":   "id: vibe\ntitle: Programación agéntica (vibecoding)\ncohorts: [g1]\nagenda: {nombre: Vibecoding, grupo: Grupo 1, area: agentica, minutos: 120}\nmodules:\n  - id: m1\n    title: M\n    lessons: [v1]\n",
			"lessons/v1.md": "---\nid: v1\ntitle: Grupo 1 · Clase 1 · Instalar\nstarts_at: 2026-10-08T19:00:00-05:00\npublished: true\nrecording: {url: https://zoom.example/g1, passcode: \"g1g1\"}\n---\nHola\n",
		},
		"vibe-g2": {
			"course.yaml":   "id: vibe-g2\ntitle: Programación agéntica (vibecoding) · Grupo 2\ncohorts: [g2]\nmodules:\n  - id: m1\n    title: M\n    lessons: [w1]\n",
			"lessons/w1.md": "---\nid: w1\ntitle: Grupo 2 · Clase 1 · Instalar\npublished: true\nrecording: {url: https://zoom.example/g2, passcode: \"g2g2\"}\n---\nHola\n",
		},
		"vibe-g9": {
			"course.yaml":   "id: vibe-g9\ntitle: Programación agéntica (vibecoding) · Grupo 9\ncohorts: [g9]\nagenda: {nombre: Vibecoding, grupo: Grupo 9, minutos: 120}\nmodules:\n  - id: m1\n    title: M\n    lessons: [x1]\n",
			"lessons/x1.md": "---\nid: x1\ntitle: Grupo 9 · Clase 1 · Instalar\nstarts_at: 2030-12-05T19:00:00-05:00\npublished: false\n---\nHola\n",
		},
		"taller": {
			"course.yaml":   "id: taller\ntitle: Taller de diseño\ncohorts: [c1, taller-1]\nmodules:\n  - id: m1\n    title: M\n    lessons: [t1]\n",
			"lessons/t1.md": "---\nid: t1\ntitle: Sesión única\nstarts_at: 2026-10-22T21:15:00-05:00\npublished: true\n---\nHola\n",
		},
		"hackathon-x": {
			"course.yaml":   "id: hackathon-x\ntitle: Hackathon\ncohorts: [hk]\nmodules:\n  - id: m1\n    title: M\n    lessons: [h1]\n",
			"lessons/h1.md": "---\nid: h1\ntitle: Hackathon\nstarts_at: 2030-12-13T13:30:00-05:00\npublished: true\n---\nHola\n",
		},
		"empresa": {
			"course.yaml":   "id: empresa\ntitle: Curso a medida\ncohorts: [empresa-1]\nmodules:\n  - id: m1\n    title: M\n    lessons: [e1]\n",
			"lessons/e1.md": "---\nid: e1\ntitle: Clase 1\npublished: true\n---\nHola\n",
		},
	}
	for id, archivos := range cursos {
		if err := os.MkdirAll(filepath.Join(dir, "courses", id, "lessons"), 0o755); err != nil {
			t.Fatal(err)
		}
		for nombre, texto := range archivos {
			if err := os.WriteFile(filepath.Join(dir, "courses", id, nombre), []byte(texto), 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
	cs, err := content.NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	db, err := store.Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c0", PublicURL: "http://lms.test"}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	hash, _ := auth.HashPassword("profe1234")
	if err := db.CreateUser(t.Context(), &store.User{Email: "profe@x.test", Name: "Profe", PasswordHash: hash, Roles: []string{"admin"}}); err != nil {
		t.Fatal(err)
	}
	return &env{t: t, srv: srv, db: db, s: s}
}

func TestPaseLibre(t *testing.T) {
	e := newEnvPase(t)
	tok := e.register("jordan@x.test")
	if r := e.call("GET", "/api/v1/pase", "", false, nil, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/pase", tok, false, nil, ""); r.code != 403 {
		t.Fatalf("sin pase: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/pase/unirme", tok, false, map[string]string{"curso": "vibe"}, ""); r.code != 403 {
		t.Fatalf("sin pase no se une: %d", r.code)
	}
	u, _ := e.db.UserByEmail(t.Context(), "jordan@x.test")
	_ = e.db.UpdateUserRoles(t.Context(), u.ID, []string{"student"}, []string{cohortePaseLibre})

	r := e.call("GET", "/api/v1/pase", tok, false, nil, "")
	if r.code != 200 {
		t.Fatalf("catálogo: %d %s", r.code, r.raw)
	}
	cursos := map[string]map[string]any{}
	var orden []string
	for _, c := range r.body["cursos"].([]any) {
		m := c.(map[string]any)
		cursos[m["nombre"].(string)] = m
		orden = append(orden, m["nombre"].(string))
	}
	if _, ok := cursos["Hackathon"]; ok {
		t.Fatalf("la hackathon no entra: %v", orden)
	}
	if _, ok := cursos["Curso a medida"]; ok {
		t.Fatalf("sin fechas ni grabaciones no entra: %v", orden)
	}
	vibe := cursos["Vibecoding"]
	if vibe == nil || orden[0] != "Vibecoding" {
		t.Fatalf("Vibecoding (con un grupo por venir) va primero: %v", orden)
	}
	grupos := vibe["grupos"].([]any)
	if len(grupos) != 3 {
		t.Fatalf("G1, G2 (sin agenda, mismo título) y G9 en una sola tarjeta: %s", r.raw)
	}
	etiquetas := []string{}
	for _, g := range grupos {
		etiquetas = append(etiquetas, g.(map[string]any)["grupo"].(string))
	}
	if !slices.Equal(etiquetas, []string{"Grupo 1", "Grupo 2", "Grupo 9"}) {
		t.Fatalf("grupos en orden: %v", etiquetas)
	}
	g1, g2, g9 := grupos[0].(map[string]any), grupos[1].(map[string]any), grupos[2].(map[string]any)
	if g1["estado"] != "dictado" || g2["estado"] != "dictado" || g9["estado"] != "proximo" {
		t.Fatalf("estados: %v %v %v", g1["estado"], g2["estado"], g9["estado"])
	}
	s1 := g1["sesiones"].([]any)[0].(map[string]any)
	if g1["inscrito"] != false || s1["grabacion"] != nil || s1["tiene_grabacion"] != true || s1["titulo"] != "Instalar" {
		t.Fatalf("sin elegir el grupo no viaja la grabación: %v", s1)
	}

	// Elige el Grupo 1: queda dentro, ve la grabación y el curso.
	if r = e.call("POST", "/api/v1/pase/unirme", tok, false, map[string]string{"curso": "vibe"}, ""); r.code != 200 || r.body["curso"] != "vibe" {
		t.Fatalf("unirse: %d %s", r.code, r.raw)
	}
	u, _ = e.db.UserByEmail(t.Context(), "jordan@x.test")
	if !slices.Equal(u.Cohorts, []string{cohortePaseLibre, "g1"}) {
		t.Fatalf("cohortes: %v", u.Cohorts)
	}
	r = e.call("GET", "/api/v1/pase", tok, false, nil, "")
	g1 = r.body["cursos"].([]any)[0].(map[string]any)["grupos"].([]any)[0].(map[string]any)
	s1 = g1["sesiones"].([]any)[0].(map[string]any)
	grab, _ := s1["grabacion"].(map[string]any)
	if g1["inscrito"] != true || s1["id"] != "v1" || grab == nil || grab["url"] != "https://zoom.example/g1" || grab["passcode"] != "g1g1" {
		t.Fatalf("ya dentro ve la grabación: %v", g1)
	}
	if r = e.call("GET", "/api/v1/lessons/v1", tok, false, nil, ""); r.code != 200 {
		t.Fatalf("abre la sesión del grupo: %d", r.code)
	}
	if r = e.call("GET", "/api/v1/lessons/w1", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("otro grupo sigue cerrado: %d", r.code)
	}

	// El taller comparte «c1» con el curso del fixture: se suma su cohorte propia y el otro curso sigue cerrado.
	if r = e.call("POST", "/api/v1/pase/unirme", tok, false, map[string]string{"curso": "taller"}, ""); r.code != 200 {
		t.Fatalf("taller: %d %s", r.code, r.raw)
	}
	u, _ = e.db.UserByEmail(t.Context(), "jordan@x.test")
	if !slices.Contains(u.Cohorts, "taller-1") || slices.Contains(u.Cohorts, "c1") {
		t.Fatalf("solo la cohorte propia del taller: %v", u.Cohorts)
	}
	if r = e.call("GET", "/api/v1/courses/curso", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("el curso del fixture no se abre: %d", r.code)
	}

	// Repetir no duplica; la hackathon y lo inexistente no se pueden elegir.
	if r = e.call("POST", "/api/v1/pase/unirme", tok, false, map[string]string{"curso": "vibe"}, ""); r.code != 200 {
		t.Fatalf("repetir: %d", r.code)
	}
	u, _ = e.db.UserByEmail(t.Context(), "jordan@x.test")
	if len(u.Cohorts) != 3 {
		t.Fatalf("sin duplicados: %v", u.Cohorts)
	}
	for _, id := range []string{"hackathon-x", "empresa", "", "no-existe"} {
		if r = e.call("POST", "/api/v1/pase/unirme", tok, false, map[string]string{"curso": id}, ""); r.code != 404 {
			t.Fatalf("%q no se elige: %d", id, r.code)
		}
	}
}
