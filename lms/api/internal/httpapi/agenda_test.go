package httpapi

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

func TestInstructorAgenda(t *testing.T) {
	dir := writeFixture(t)
	agenda := `clases:
  - id: despliega-01
    nombre: Despliega tu app con IA
    grupo: Grupo 1
    sesion: Sesión 1
    starts_at: 2026-10-01T19:30:00-05:00
    minutos: 75
    area: infra
    estado: propuesto
  - id: l1-extra
    curso: curso
    sesion: Clase extra
    starts_at: 2026-10-15T19:30:00-05:00
    minutos: 60
    estado: por-confirmar
`
	if err := os.WriteFile(filepath.Join(dir, "agenda.yaml"), []byte(agenda), 0o644); err != nil {
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
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c1", PublicURL: "http://lms.test", Inscripcion: []string{"c1"}}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	hash, _ := auth.HashPassword("profe1234")
	if err := db.CreateUser(t.Context(), &store.User{Email: "profe@x.test", Name: "Profe", PasswordHash: hash, Roles: []string{"admin", "instructor"}}); err != nil {
		t.Fatal(err)
	}
	e := &env{t: t, srv: srv, db: db, s: s}

	if r := e.call("GET", "/api/v1/instructor/agenda", e.register("ana@x.test"), false, nil, ""); r.code != 403 {
		t.Fatalf("un alumno no ve la agenda: %d", r.code)
	}
	r := e.call("GET", "/api/v1/instructor/agenda", e.login("profe@x.test", "profe1234"), false, nil, "")
	if r.code != 200 || r.body["zona"] != "America/Lima" {
		t.Fatalf("agenda: %d %s", r.code, r.raw)
	}
	clases := r.body["clases"].([]any)
	if len(clases) != 3 {
		t.Fatalf("esperaba la sesión con fecha y las dos clases extra: %s", r.raw)
	}
	extra, ses, suma := clases[0].(map[string]any), clases[1].(map[string]any), clases[2].(map[string]any)
	if extra["id"] != "despliega-01" || extra["estado"] != "propuesto" || extra["fin"] != "2026-10-01T20:45:00-05:00" {
		t.Fatalf("la clase extra va primero (1 oct) con su fin: %v", extra)
	}
	if ses["id"] != "l1" || ses["minutos"] != float64(90) || ses["fin"] != "2026-10-08T20:30:00-05:00" ||
		ses["numero"] != float64(1) || ses["total"] != float64(2) || ses["inscripcion"] != "c1" || ses["estado"] != "confirmado" {
		t.Fatalf("sesión: %v", ses)
	}
	if suma["id"] != "l1-extra" || suma["curso_slug"] != "curso" || suma["nombre"] != "Curso de prueba" || suma["numero"] != float64(2) ||
		suma["estado"] != "por-confirmar" || suma["tipo"] != "extra" {
		t.Fatalf("la clase extra con curso se suma a su grupo: %v", suma)
	}
}
