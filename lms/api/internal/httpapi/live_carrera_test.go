package httpapi

import (
	"testing"
	"time"
)

func TestLiveCarreraVs(t *testing.T) {
	e := newEnv(t)
	profe := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	luis := e.register("luis@x.test")
	salas.Lock()
	salas.m = map[string]*sala{}
	salas.Unlock()

	// dos alumnos se anotan con avatares distintos
	if r := e.call("POST", "/api/v1/live/l1/carrera/unir", ana, false, map[string]any{"avatar": "joven"}, ""); r.code != 200 {
		t.Fatalf("unir ana: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/live/l1/carrera/unir", luis, false, map[string]any{"avatar": "sabio"}, ""); r.code != 200 {
		t.Fatalf("unir luis: %d %s", r.code, r.raw)
	}
	r := e.call("GET", "/api/v1/live/l1/carrera", ana, false, nil, "")
	if r.code != 200 || r.body["estado"] != "lobby" {
		t.Fatalf("estado lobby: %d %v", r.code, r.body)
	}
	if got, _ := r.body["corredores"].([]any); len(got) != 2 {
		t.Fatalf("corredores: %v", r.body["corredores"])
	}

	// solo el staff inicia
	if r := e.call("POST", "/api/v1/live/l1/carrera/iniciar", ana, false, map[string]any{}, ""); r.code != 403 {
		t.Fatalf("alumno inicia: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l1/carrera/iniciar", profe, false, map[string]any{}, ""); r.code != 200 {
		t.Fatalf("iniciar: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/live/l1/carrera", ana, false, nil, "")
	if r.body["estado"] != "cuenta" {
		t.Fatalf("estado tras iniciar: %v", r.body["estado"])
	}
	if salida, _ := r.body["salida_ms"].(float64); salida <= 0 {
		t.Fatalf("salida_ms: %v", r.body["salida_ms"])
	}

	// ana avanza y luis se queda: ana va primera
	if r := e.call("POST", "/api/v1/live/l1/carrera/paso", ana, false, map[string]any{"dist": 420.0, "golpes": 1}, ""); r.code != 200 {
		t.Fatalf("paso ana: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/live/l1/carrera/paso", luis, false, map[string]any{"dist": 120.0, "golpes": 3}, ""); r.code != 200 {
		t.Fatalf("paso luis: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/live/l1/carrera", luis, false, nil, "")
	primero := r.body["corredores"].([]any)[0].(map[string]any)
	if primero["avatar"] != "joven" {
		t.Fatalf("el primero debería ser joven: %v", primero)
	}

	// ana llega y su tiempo manda sobre la distancia
	if r := e.call("POST", "/api/v1/live/l1/carrera/fin", ana, false, map[string]any{"ms": 38000}, ""); r.code != 200 {
		t.Fatalf("fin ana: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/live/l1/carrera/paso", luis, false, map[string]any{"dist": 830.0}, ""); r.code != 200 {
		t.Fatalf("paso luis 2: %d", r.code)
	}
	r = e.call("GET", "/api/v1/live/l1/carrera", luis, false, nil, "")
	primero = r.body["corredores"].([]any)[0].(map[string]any)
	if primero["avatar"] != "joven" {
		t.Fatalf("quien llegó debe ir primero: %v", primero)
	}

	// el estado dice quién es staff y la manga cierra sola cuando llegaron todos
	if r := e.call("POST", "/api/v1/live/l1/carrera/fin", luis, false, map[string]any{"ms": 39200}, ""); r.code != 200 {
		t.Fatalf("fin luis: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/live/l1/carrera", luis, false, nil, "")
	if r.body["estado"] != "fin" {
		t.Fatalf("estado tras llegar todos: %v", r.body["estado"])
	}
	if r.body["staff"] != false {
		t.Fatalf("staff de alumno: %v", r.body["staff"])
	}
	r = e.call("GET", "/api/v1/live/l1/carrera", profe, false, nil, "")
	if r.body["staff"] != true {
		t.Fatalf("staff de profe: %v", r.body["staff"])
	}

	// límite duro: una sala sin nadie que termine se cierra a los 60 s y no deja la escena colgada
	salas.Lock()
	salas.m["l1"] = &sala{Corredor: map[string]*corredor{
		ana: {ID: ana, Nombre: "Ana", Avatar: "joven", Dist: 120},
	}, Estado: "corre", Salida: time.Now().Add(-61 * time.Second), Largo: 840}
	salas.Unlock()
	if r := e.call("GET", "/api/v1/live/l1/carrera", ana, false, nil, ""); r.body["estado"] != "fin" {
		t.Fatalf("corte a 60 s: %v", r.body["estado"])
	}

	// reiniciar deja el vestíbulo vacío
	if r := e.call("POST", "/api/v1/live/l1/carrera/reiniciar", profe, false, map[string]any{}, ""); r.code != 200 {
		t.Fatalf("reiniciar: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/live/l1/carrera", profe, false, nil, "")
	if r.body["estado"] != "lobby" {
		t.Fatalf("tras reiniciar: %v", r.body["estado"])
	}
}
