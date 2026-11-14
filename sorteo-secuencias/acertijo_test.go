package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAcertijo(t *testing.T) {
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba-123", porIP: map[string]int{}}
	s.e = Estado{Edicion: 1, Fase: "fin", Premios: premiosIniciales(), Acertijo: acertijoPorDefecto(),
		ExcluidosHoy: []Excluido{{Nombre: "Rosa Vega", Telefono: "51900000008"}}}
	// Piero ganó este mismo cupón en el sorteo: no juega por él
	s.e.Personas = []Persona{{ID: 9, Nombre: "Piero Lanche Cerron", Telefono: "51900000009", Token: "tokpiero"}}
	s.e.Siguiente = 9
	s.e.Tickets = []Ticket{{Numero: 1, Persona: 9}}
	s.e.Pasos = []Paso{{Ronda: 0, Tipo: "ticket", Ticket: 1}, {Ronda: 0, Tipo: "premio", Ticket: 1, Premio: "combo-90"}}
	s.e.Revelados = 2
	s.e.Acertijo.Activo = true
	ts := httptest.NewServer(s.rutas())
	defer ts.Close()

	// la respuesta no sale mientras no haya ganador
	resp, _ := http.Get(ts.URL + "/api/pregunta")
	var pub map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&pub)
	resp.Body.Close()
	if _, ok := pub["acertijo"].(map[string]any)["correcta"]; ok {
		t.Fatal("la respuesta correcta no debe publicarse")
	}
	// Piero (ya tiene este cupón) no juega; Rosa, que ganó otra cosa hoy, sí
	if code, _ := post(t, ts, "/api/acertijo", "", map[string]any{"t": "tokpiero", "opcion": 1}); code != 409 {
		t.Fatal("el dueño original no juega")
	}
	if code, out := post(t, ts, "/api/acertijo", "", map[string]any{"nombre": "Rosa Vega", "telefono": "51900000008", "opcion": 2}); code != 200 {
		t.Fatalf("el acertijo es para todos: %v", out)
	}
	// Ana falla y no puede reintentar
	code, out := post(t, ts, "/api/acertijo", "", map[string]any{"nombre": "Ana Torres", "telefono": "51900000001", "opcion": 0})
	if code != 200 || out["acerto"] != false {
		t.Fatalf("Ana: %d %v", code, out)
	}
	tokAna := out["t"].(string)
	if code, _ := post(t, ts, "/api/acertijo", "", map[string]any{"t": tokAna, "opcion": 1}); code != 409 {
		t.Fatal("una sola oportunidad")
	}
	// Beto acierta y gana; Carla llega tarde
	if _, out := post(t, ts, "/api/acertijo", "", map[string]any{"nombre": "Beto Ruiz", "telefono": "51900000002", "opcion": 1}); out["acerto"] != true {
		t.Fatalf("Beto: %v", out)
	}
	if code, out := post(t, ts, "/api/acertijo", "", map[string]any{"nombre": "Carla Diaz", "telefono": "51900000003", "opcion": 1}); code != 409 || !strings.Contains(out["error"].(string), "tarde") {
		t.Fatal("después del ganador ya no se juega")
	}
	if len(s.e.Quiz) != 1 || s.e.Quiz[0].Premio != "combo-90" {
		t.Fatalf("el cupón debía quedar registrado: %+v", s.e.Quiz)
	}
}
