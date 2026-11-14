package httpapi

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// envConPortada: el fixture de siempre, con «portada: portada.html» en el course.yaml.
func envConPortada(t *testing.T) *env {
	t.Helper()
	dir := writeFixture(t)
	curso := filepath.Join(dir, "courses", "curso")
	yml, err := os.ReadFile(filepath.Join(curso, "course.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(curso, "course.yaml"), append(yml, []byte("portada: portada.html\n")...), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(curso, "portada.html"), []byte("<!doctype html><p>Faltan 3 días</p>"), 0o644); err != nil {
		t.Fatal(err)
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
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c1", PublicURL: "http://lms.test"}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	return &env{t: t, srv: srv, db: db, s: s}
}

func TestPortadaDelCurso(t *testing.T) {
	e := envConPortada(t)
	tok := e.register("alumno@x.test")

	if r := e.call("GET", "/api/v1/courses/curso", tok, false, nil, ""); r.code != 200 || r.body["portada"] != true {
		t.Fatalf("el curso debe anunciar su portada: %d %s", r.code, r.raw)
	}
	r := e.call("GET", "/api/v1/courses/curso/portada", tok, true, nil, "")
	if r.code != 200 || !strings.Contains(string(r.raw), "Faltan 3 días") {
		t.Fatalf("portada: %d %s", r.code, r.raw)
	}
	if ct := r.hdr.Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Errorf("Content-Type %q", ct)
	}
	if r.hdr.Get("X-Frame-Options") != "SAMEORIGIN" || r.hdr.Get("Content-Security-Policy") != cspEscena {
		t.Errorf("cabeceras de iframe: XFO %q, CSP %q", r.hdr.Get("X-Frame-Options"), r.hdr.Get("Content-Security-Policy"))
	}

	// Sin sesión no hay portada, y fuera del grupo tampoco.
	if r := e.call("GET", "/api/v1/courses/curso/portada", "", false, nil, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
	otro := e.register("otro@x.test")
	u, _ := e.db.UserByEmail(t.Context(), "otro@x.test")
	_ = e.db.UpdateUserRoles(t.Context(), u.ID, []string{"student"}, []string{"c9"})
	if r := e.call("GET", "/api/v1/courses/curso/portada", otro, false, nil, ""); r.code != 404 {
		t.Fatalf("fuera del grupo: %d", r.code)
	}
}

func TestPortadaAusente(t *testing.T) {
	e := newEnv(t)
	tok := e.register("alumno@x.test")
	if r := e.call("GET", "/api/v1/courses/curso", tok, false, nil, ""); r.code != 200 || r.body["portada"] != false {
		t.Fatalf("sin portada el curso dice portada=false: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/courses/curso/portada", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("sin portada: %d", r.code)
	}
}
