package httpapi

import (
	"context"
	"errors"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

func TestSorteoGolProbabilidades(t *testing.T) {
	total := 0
	for _, p := range premiosGol {
		total += p.PPM
	}
	for _, x := range tramosGol {
		total += x.PPM
	}
	if total != 1_000_000 {
		t.Fatalf("las probabilidades suman %d", total)
	}
	todos := map[string]bool{}
	for _, p := range premiosGol {
		todos[p.ID] = true
	}
	for i := 0; i < 50_000; i++ {
		g := sortearGol(todos) // sin premios únicos: solo descuentos de 20 a 90
		if g.Premio != "descuento" || g.Pct < 20 || g.Pct > 90 || g.Precio != 100-g.Pct {
			t.Fatalf("giro fuera de rango: %+v", g)
		}
	}
}

func TestSorteoGolUnGiroPorCuenta(t *testing.T) {
	e := newEnv(t)
	e.register("ana@x.test")
	ruta := "/api/v1/sorteo-gol/girar"
	if r := e.call("POST", ruta, "", false, map[string]string{"nombre": "Nadie", "correo": "nadie@x.test"}, ""); r.code != 404 {
		t.Fatalf("sin inscripción: %d %s", r.code, r.raw)
	}
	u, _ := e.db.UserByEmail(t.Context(), "ana@x.test")
	if r := e.call("POST", ruta, "", false, map[string]string{"nombre": "Otra Persona", "correo": "ana@x.test"}, ""); r.code != 400 {
		t.Fatalf("nombre distinto de %q: %d %s", u.Name, r.code, r.raw)
	}
	r1 := e.call("POST", ruta, "", false, map[string]string{"nombre": u.Name, "correo": "ANA@x.test"}, "")
	if r1.code != 200 || r1.body["repetido"] != false {
		t.Fatalf("primer giro: %d %s", r1.code, r1.raw)
	}
	r2 := e.call("POST", ruta, "", false, map[string]string{"nombre": u.Name, "correo": "ana@x.test"}, "")
	if r2.code != 200 || r2.body["repetido"] != true || r2.body["codigo"] != r1.body["codigo"] {
		t.Fatalf("segundo giro debía repetir el resultado: %s / %s", r1.raw, r2.raw)
	}
	if r := e.call("GET", "/api/v1/sorteo-gol/estado", "", false, nil, ""); r.code != 200 || r.body["giros"].(float64) != 1 {
		t.Fatalf("estado: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/admin/sorteo-gol", "", false, nil, ""); r.code != 401 {
		t.Fatalf("lista sin sesión: %d", r.code)
	}
}

func TestSorteoGolPremioUnicoUnaVez(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	g := &store.GiroGol{Email: "a@x.test", Nombre: "A", UserID: "u1", Premio: "eterna", Pct: 100, Codigo: "X"}
	if err := e.db.GuardarGiroGol(ctx, sorteoGolID, g); err != nil {
		t.Fatal(err)
	}
	g2 := &store.GiroGol{Email: "b@x.test", Nombre: "B", UserID: "u2", Premio: "eterna", Pct: 100, Codigo: "Y"}
	if err := e.db.GuardarGiroGol(ctx, sorteoGolID, g2); !errors.Is(err, store.ErrPremioTomado) {
		t.Fatalf("segundo dueño del premio único: %v", err)
	}
}
