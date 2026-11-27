package httpapi

import (
	"strings"
	"testing"
)

// El laboratorio se guarda por alumno y curso, se lee de vuelta tal cual, cada alumno ve solo el suyo y
// el personal ve el de cualquiera y el resumen del grupo.
func TestLaboratorioGuardarLeerYGrupo(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana Torres")
	beto := e.alumnoCon("beto@x.test", "Beto")

	r := e.call("GET", "/api/v1/laboratorio/curso", ana, false, nil, "")
	if r.code != 200 || r.body["datos"] != nil {
		t.Fatalf("vacío al inicio: %d %s", r.code, r.raw)
	}
	datos := map[string]any{"titulo": "Citas a tiempo", "hmw": "¿Cómo podríamos…?", "tablero": []any{map[string]any{"t": "idea 1"}, map[string]any{"t": "idea 2"}}}
	r = e.call("PUT", "/api/v1/laboratorio/curso", ana, false, map[string]any{"datos": datos}, "")
	if r.code != 200 || r.body["actualizado_en"] == nil {
		t.Fatalf("guardar: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/laboratorio/curso", ana, false, nil, "")
	d, _ := r.body["datos"].(map[string]any)
	if r.code != 200 || d["titulo"] != "Citas a tiempo" || len(d["tablero"].([]any)) != 2 {
		t.Fatalf("leer el mío: %d %s", r.code, r.raw)
	}
	// Beto no ve el de Ana ni el resumen del grupo.
	r = e.call("GET", "/api/v1/laboratorio/curso", beto, false, nil, "")
	if r.code != 200 || r.body["datos"] != nil {
		t.Fatalf("Beto ve su laboratorio vacío: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/laboratorio/curso?alumno=x", beto, false, nil, ""); r.code != 403 {
		t.Fatalf("un alumno no lee el de otro: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/laboratorio/curso/grupo", beto, false, nil, ""); r.code != 403 {
		t.Fatalf("el resumen es del personal: %d %s", r.code, r.raw)
	}
	// El personal ve el resumen con lo esencial de cada idea.
	r = e.call("GET", "/api/v1/laboratorio/curso/grupo", e.login("profe@x.test", "profe1234"), false, nil, "")
	if r.code != 200 {
		t.Fatalf("grupo: %d %s", r.code, r.raw)
	}
	ls := r.body["laboratorios"].([]any)
	if len(ls) != 1 || ls[0].(map[string]any)["titulo"] != "Citas a tiempo" || ls[0].(map[string]any)["ideas"] != float64(2) {
		t.Fatalf("resumen del grupo: %s", r.raw)
	}
	if strings.Contains(string(r.raw), "ana@x.test") {
		t.Fatalf("el resumen no expone correos: %s", r.raw)
	}
}

// Validación: debe ser un objeto JSON; un curso que no existe es 404.
func TestLaboratorioValidacion(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana")
	if r := e.call("PUT", "/api/v1/laboratorio/curso", ana, false, map[string]any{"datos": []any{1, 2}}, ""); r.code != 422 {
		t.Fatalf("una lista no es un laboratorio: %d %s", r.code, r.raw)
	}
	if r := e.call("PUT", "/api/v1/laboratorio/curso", ana, false, map[string]any{}, ""); r.code != 422 {
		t.Fatalf("sin datos: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/laboratorio/no-existe", ana, false, nil, ""); r.code != 404 {
		t.Fatalf("curso inexistente: %d %s", r.code, r.raw)
	}
}
