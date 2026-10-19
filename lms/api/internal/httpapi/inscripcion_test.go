package httpapi

import (
	"slices"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// La inscripción por enlace solo vale para los grupos abiertos y deja al alumno dentro del grupo.
func TestInscripcionPorEnlace(t *testing.T) {
	e := newEnv(t)
	alta := map[string]string{"name": "Ana Torres", "email": "Ana@X.test", "password": "ana-12345"}
	if r := e.call("GET", "/api/v1/inscripcion/c1", "", false, nil, ""); r.code != 404 {
		t.Fatalf("sin abrir debe ser 404: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/inscripcion/c1", "", false, alta, ""); r.code != 404 {
		t.Fatalf("sin abrir no inscribe: %d", r.code)
	}
	e.s.Inscripcion = []string{"c1", "vacio"}
	if r := e.call("GET", "/api/v1/inscripcion/vacio", "", false, nil, ""); r.code != 404 {
		t.Fatalf("grupo abierto sin cursos: %d", r.code)
	}
	r := e.call("GET", "/api/v1/inscripcion/c1", "", false, nil, "")
	if r.code != 200 || r.body["nombre"] != "C1" || len(r.body["cursos"].([]any)) != 1 {
		t.Fatalf("info: %d %s", r.code, r.raw)
	}
	if r = e.call("POST", "/api/v1/inscripcion/c1", "", false, map[string]string{"name": "Ana", "email": "a@x.test", "password": "ana-12345"}, ""); r.code != 400 {
		t.Fatalf("sin apellido: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/inscripcion/c1", "", false, alta, "")
	if r.code != 201 || r.body["token"] == nil {
		t.Fatalf("inscripción: %d %s", r.code, r.raw)
	}
	u, err := e.db.UserByEmail(t.Context(), "ana@x.test")
	if err != nil || u.Name != "Ana Torres" || !slices.Equal(u.Cohorts, []string{"c1"}) || !slices.Equal(u.Roles, []string{"student"}) {
		t.Fatalf("cuenta: %+v %v", u, err)
	}
	tok := r.body["token"].(string)
	if r = e.call("GET", "/api/v1/courses", tok, false, nil, ""); r.code != 200 || len(r.list) != 1 {
		t.Fatalf("debe ver el curso del grupo: %s", r.raw)
	}
	if r = e.call("POST", "/api/v1/inscripcion/c1", "", false, alta, ""); r.code != 409 || errCode(r) != "ya_registrado" {
		t.Fatalf("correo repetido: %d %s", r.code, r.raw)
	}
}

// Quien ya tiene cuenta se une al grupo sin perder los que tenía.
func TestUnirseAGrupo(t *testing.T) {
	e := newEnv(t)
	tok := e.register("viejo@x.test")
	u, _ := e.db.UserByEmail(t.Context(), "viejo@x.test")
	_ = e.db.UpdateUserRoles(t.Context(), u.ID, []string{"student"}, []string{"grupo-2"})
	if r := e.call("POST", "/api/v1/inscripcion/c1/unirme", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("cerrado: %d", r.code)
	}
	e.s.Inscripcion = []string{"c1"}
	if r := e.call("POST", "/api/v1/inscripcion/c1/unirme", "", false, nil, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
	for i := 0; i < 2; i++ { // dos veces: no duplica
		if r := e.call("POST", "/api/v1/inscripcion/c1/unirme", tok, false, nil, ""); r.code != 200 {
			t.Fatalf("unirme: %d %s", r.code, r.raw)
		}
	}
	u, _ = e.db.UserByEmail(t.Context(), "viejo@x.test")
	if !slices.Equal(u.Cohorts, []string{"grupo-2", "c1"}) {
		t.Fatalf("cohortes: %v", u.Cohorts)
	}
}

// Un instructor que no es admin ve solo los cursos y los alumnos de sus grupos.
func TestInstructorSoloSusGrupos(t *testing.T) {
	e := newEnv(t)
	alumno := e.register("alumno@x.test") // cohorte c1 (la del curso)
	au, _ := e.db.UserByEmail(t.Context(), "alumno@x.test")
	hash, _ := auth.HashPassword("profe-otro1")
	if err := e.db.CreateUser(t.Context(), &store.User{Email: "otro@x.test", Name: "Otro", PasswordHash: hash, Roles: []string{"instructor"}, Cohorts: []string{"grupo-4"}}); err != nil {
		t.Fatal(err)
	}
	if err := e.db.CreateUser(t.Context(), &store.User{Email: "suyo@x.test", Name: "Suyo", PasswordHash: hash, Roles: []string{"instructor"}, Cohorts: []string{"c1"}}); err != nil {
		t.Fatal(err)
	}
	otro, suyo, admin := e.login("otro@x.test", "profe-otro1"), e.login("suyo@x.test", "profe-otro1"), e.login("profe@x.test", "profe1234")
	_ = alumno

	cases := []struct {
		name, tok string
		cursos    int
		progreso  int
		vista     int
	}{
		{"instructor de otro grupo", otro, 0, 404, 403},
		{"instructor del grupo", suyo, 1, 200, 0},
		{"admin", admin, 1, 200, 0},
	}
	for _, c := range cases {
		if r := e.call("GET", "/api/v1/courses", c.tok, false, nil, ""); r.code != 200 || len(r.list) != c.cursos {
			t.Errorf("%s: cursos %d, quería %d", c.name, len(r.list), c.cursos)
		}
		if r := e.call("GET", "/api/v1/courses/curso/progress", c.tok, false, nil, ""); r.code != c.progreso {
			t.Errorf("%s: progreso %d, quería %d", c.name, r.code, c.progreso)
		}
		if r := e.call("GET", "/api/v1/lessons/l1", c.tok, false, nil, ""); (r.code == 200) != (c.cursos == 1) {
			t.Errorf("%s: sesión %d", c.name, r.code)
		}
		if c.vista != 0 {
			if r := e.call("GET", "/api/v1/vista/"+au.ID+"/version", c.tok, false, nil, ""); r.code != c.vista {
				t.Errorf("%s: visor del alumno %d, quería %d", c.name, r.code, c.vista)
			}
		}
	}
	if !(&Server{}).puedeVerAlumno(t.Context(), &Principal{ID: "x", Roles: []string{"admin"}}, au.ID) {
		t.Error("el admin ve a cualquier alumno")
	}
}
