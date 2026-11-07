package httpapi

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

func TestMarcarCruces(t *testing.T) {
	base := time.Date(2026, 11, 8, 19, 0, 0, 0, time.UTC)
	clase := func(id string, desde, minutos int) claseAgenda {
		k := nuevaClase(base.Add(time.Duration(desde)*time.Minute), minutos)
		k.ID = id
		return k
	}
	// a y b se solapan; a contiene también a c; d empieza justo cuando termina a, no se cruza.
	clases := []claseAgenda{clase("a", 0, 120), clase("b", 30, 30), clase("c", 90, 15), clase("d", 120, 60)}
	marcarCruces(clases)
	if got := clases[0].Cruces; len(got) != 2 || got[0] != "b" || got[1] != "c" {
		t.Fatalf("a se cruza con b y c: %v", got)
	}
	if got := clases[1].Cruces; len(got) != 1 || got[0] != "a" {
		t.Fatalf("b solo se cruza con a: %v", got)
	}
	if got := clases[3].Cruces; len(got) != 0 {
		t.Fatalf("empezar cuando otra termina no es cruce: %v", got)
	}
}

func TestMiHorario(t *testing.T) {
	dir := writeFixture(t)
	otro := filepath.Join(dir, "courses", "otro")
	if err := os.MkdirAll(filepath.Join(otro, "lessons"), 0o755); err != nil {
		t.Fatal(err)
	}
	archivos := map[string]string{
		"course.yaml":   "id: otro\ntitle: Otro curso\ncohorts: [c2]\nmodules:\n  - id: m1\n    title: M\n    lessons: [o1]\n",
		"lessons/o1.md": "---\nid: o1\ntitle: Clase del otro grupo\nstarts_at: 2026-10-08T19:30:00-05:00\npublished: true\n---\nHola\n",
	}
	for nombre, texto := range archivos {
		if err := os.WriteFile(filepath.Join(otro, nombre), []byte(texto), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	agenda := `clases:
  - id: l1-extra
    curso: curso
    sesion: Clase extra
    starts_at: 2026-10-08T20:00:00-05:00
    minutos: 60
    estado: por-confirmar
    nota: Solo para el instructor
  - id: l1-idea
    curso: curso
    sesion: Clase propuesta
    starts_at: 2026-10-20T19:30:00-05:00
    minutos: 60
    estado: propuesto
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
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c1", PublicURL: "http://lms.test"}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	hash, _ := auth.HashPassword("profe1234")
	if err := db.CreateUser(t.Context(), &store.User{Email: "profe@x.test", Name: "Profe", PasswordHash: hash, Roles: []string{"admin"}}); err != nil {
		t.Fatal(err)
	}
	e := &env{t: t, srv: srv, db: db, s: s}

	r := e.call("GET", "/api/v1/horario", e.register("ana@x.test"), false, nil, "")
	if r.code != 200 || r.body["zona"] != "America/Lima" {
		t.Fatalf("horario: %d %s", r.code, r.raw)
	}
	cursos := r.body["cursos"].([]any)
	if len(cursos) != 1 || cursos[0].(map[string]any)["slug"] != "curso" {
		t.Fatalf("solo sale el curso de su grupo: %s", r.raw)
	}
	por := map[string]map[string]any{}
	for _, c := range r.body["clases"].([]any) {
		k := c.(map[string]any)
		por[k["id"].(string)] = k
	}
	if por["o1"] != nil || por["l1-idea"] != nil {
		t.Fatalf("ni otro grupo ni clases propuestas: %s", r.raw)
	}
	extra, ses := por["l1-extra"], por["l1"]
	if extra == nil || ses == nil {
		t.Fatalf("faltan clases: %s", r.raw)
	}
	if extra["nota"] != nil {
		t.Fatalf("la nota interna no llega al alumno: %v", extra)
	}
	if c, _ := ses["cruces"].([]any); len(c) != 1 || c[0] != "l1-extra" {
		t.Fatalf("la sesión de 19:00 a 20:30 se cruza con la extra de las 20:00: %v", ses)
	}

	// Un administrador ve todos los cursos, pero Mi horario es de matrícula.
	r = e.call("GET", "/api/v1/horario", e.login("profe@x.test", "profe1234"), false, nil, "")
	if r.code != 200 || len(r.body["cursos"].([]any)) != 0 {
		t.Fatalf("sin grupos no hay matrícula: %d %s", r.code, r.raw)
	}
}

// Las ofertas: grupos abiertos que no son del alumno, con clases por delante y sin cruces con las suyas.
// fixtureOfertas: ana en c1 (curso «Curso de prueba», 8 de octubre) y cuatro grupos más: c2 se cruza,
// c3 encaja, c4 está cerrado y c5 repite el curso de ana en otro grupo.
func fixtureOfertas(t *testing.T) (*env, string) {
	dir := writeFixture(t) // «curso», grupo c1: sesión el 8 de octubre de 19:00 a 20:30
	cursos := map[string]string{
		// c2 se cruza: 8 de octubre a las 19:30.
		"cruza": "id: cruza\ntitle: Se cruza\ncohorts: [c2]\nmodules:\n  - id: m1\n    title: M\n    lessons: [x1]\n",
		// c3 encaja: 9 de octubre.
		"encaja": "id: encaja\ntitle: Encaja\ndescription: Un curso que cabe\ncohorts: [c3]\nmodules:\n  - id: m1\n    title: M\n    lessons: [e1]\n",
		// c5 es el mismo curso que ya lleva (mismo título), en otro grupo.
		"repite": "id: repite\ntitle: Curso de prueba · C5\ncohorts: [c5]\nmodules:\n  - id: m1\n    title: M\n    lessons: [r1]\n",
		// c4 está cerrado aunque encaje.
		"cerrado": "id: cerrado\ntitle: Cerrado\ncohorts: [c4]\nmodules:\n  - id: m1\n    title: M\n    lessons: [z1]\n",
	}
	fechas := map[string]string{"cruza": "x1|2026-10-08T19:30:00-05:00", "encaja": "e1|2026-10-09T19:30:00-05:00", "cerrado": "z1|2026-10-10T19:30:00-05:00", "repite": "r1|2026-10-11T19:30:00-05:00"}
	for slug, yaml := range cursos {
		d := filepath.Join(dir, "courses", slug)
		if err := os.MkdirAll(filepath.Join(d, "lessons"), 0o755); err != nil {
			t.Fatal(err)
		}
		id, fecha, _ := strings.Cut(fechas[slug], "|")
		lec := "---\nid: " + id + "\ntitle: Clase\nstarts_at: " + fecha + "\npublished: true\n---\nHola\n"
		if err := os.WriteFile(filepath.Join(d, "course.yaml"), []byte(yaml), 0o644); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(d, "lessons", id+".md"), []byte(lec), 0o644); err != nil {
			t.Fatal(err)
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
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c1", PublicURL: "http://lms.test",
		Inscripcion: []string{"c1", "c2", "c3", "c5", ""}}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	e := &env{t: t, srv: srv, db: db, s: s}
	return e, e.register("ana@x.test")
}

func TestOfertasDeMiHorario(t *testing.T) {
	e, ana := fixtureOfertas(t)

	antes := ahoraHorario
	t.Cleanup(func() { ahoraHorario = antes })
	ahoraHorario = func() time.Time { return time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC) }

	r := e.call("GET", "/api/v1/horario", ana, false, nil, "")
	ofs, _ := r.body["ofertas"].([]any)
	if r.code != 200 || len(ofs) != 1 {
		t.Fatalf("solo encaja c3: %d %s", r.code, r.raw)
	}
	o := ofs[0].(map[string]any)
	if o["grupo"] != "c3" || o["inscripcion"] != "/inscripcion/c3/" || len(o["clases"].([]any)) != 1 {
		t.Fatalf("oferta de c3: %v", o)
	}
	if c := o["cursos"].([]any)[0].(map[string]any); c["slug"] != "encaja" || c["descripcion"] != "Un curso que cabe" {
		t.Fatalf("curso de la oferta: %v", c)
	}

	// Un grupo que ya empezó deja de ofrecerse aunque le queden clases.
	ahoraHorario = func() time.Time { return time.Date(2026, 10, 10, 1, 0, 0, 0, time.UTC) } // 8 pm de Lima, en plena clase
	r = e.call("GET", "/api/v1/horario", ana, false, nil, "")
	if ofs, _ := r.body["ofertas"].([]any); len(ofs) != 0 {
		t.Fatalf("c3 ya empezó: %s", r.raw)
	}

	// Con todas las clases ya pasadas no hay nada que ofrecer.
	ahoraHorario = func() time.Time { return time.Date(2026, 12, 1, 12, 0, 0, 0, time.UTC) }
	r = e.call("GET", "/api/v1/horario", ana, false, nil, "")
	if ofs, _ := r.body["ofertas"].([]any); len(ofs) != 0 {
		t.Fatalf("sin clases por delante no hay oferta: %s", r.raw)
	}
}
