package httpapi

import (
	"net/url"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

func TestSimuladorDeHorario(t *testing.T) {
	e, ana := fixtureOfertas(t)
	hash, _ := auth.HashPassword("profe1234")
	if err := e.db.CreateUser(t.Context(), &store.User{Email: "profe@x.test", Name: "Profe", PasswordHash: hash, Roles: []string{"admin"}}); err != nil {
		t.Fatal(err)
	}
	profe := e.login("profe@x.test", "profe1234")
	antes := ahoraHorario
	t.Cleanup(func() { ahoraHorario = antes })
	ahoraHorario = func() time.Time { return time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC) }

	// Un alumno no puede simular.
	if r := e.call("GET", "/api/v1/instructor/simulador", ana, false, nil, ""); r.code != 403 {
		t.Fatalf("alumno al simulador: %d", r.code)
	}

	r := e.call("GET", "/api/v1/instructor/simulador", profe, false, nil, "")
	alumnos, _ := r.body["alumnos"].([]any)
	if r.code != 200 || len(alumnos) != 1 || len(r.body["grupos"].([]any)) != 5 {
		t.Fatalf("una alumna (el profe no cuenta) y cinco grupos: %d %s", r.code, r.raw)
	}
	id := alumnos[0].(map[string]any)["id"].(string)

	// Como ana: su curso y la oferta de c3, igual que en su propio Mi horario.
	r = e.call("GET", "/api/v1/instructor/simulador/horario?alumno="+id, profe, false, nil, "")
	if r.code != 200 || len(r.body["cursos"].([]any)) != 1 || len(r.body["ofertas"].([]any)) != 1 {
		t.Fatalf("horario de ana: %d %s", r.code, r.raw)
	}
	if sim := r.body["simulado"].(map[string]any); sim["alumno"] == "" {
		t.Fatalf("simulado: %v", sim)
	}

	// Con grupos elegidos a mano: solo c3 (el inexistente se ignora); ya no se le ofrece c3, sí c1 y c5.
	r = e.call("GET", "/api/v1/instructor/simulador/horario?"+url.Values{"grupos": {"c3,nada"}}.Encode(), profe, false, nil, "")
	cursos := r.body["cursos"].([]any)
	if r.code != 200 || len(cursos) != 1 || cursos[0].(map[string]any)["slug"] != "encaja" {
		t.Fatalf("simular c3: %d %s", r.code, r.raw)
	}
	for _, o := range r.body["ofertas"].([]any) {
		if o.(map[string]any)["grupo"] == "c3" {
			t.Fatalf("no se ofrece el grupo que ya tiene: %s", r.raw)
		}
	}

	if r := e.call("GET", "/api/v1/instructor/simulador/horario?alumno=nadie", profe, false, nil, ""); r.code != 404 {
		t.Fatalf("alumno inexistente: %d", r.code)
	}
}
