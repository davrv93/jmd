package main

import (
	"net/http/httptest"
	"testing"
)

func TestPregunta(t *testing.T) {
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba-123", porIP: map[string]int{}}
	s.e = Estado{Edicion: 1, Fase: "fin", Ganadores: 1, Premios: premiosIniciales(), QuizAbierto: true,
		ExcluidosHoy: []Excluido{{Nombre: "Fernando Marín", Telefono: "51911000111"}, {Nombre: "Jorge olano"}}}
	s.e.Personas = []Persona{{ID: 1, Nombre: "Ana Torres", Telefono: "51900000001", Token: "tokana"}, {ID: 2, Nombre: "Beto Ruiz", Telefono: "51900000002", Token: "tokbeto"}}
	s.e.Siguiente = 2
	s.e.Tickets = []Ticket{{Numero: 5, Persona: 1}, {Numero: 8, Persona: 2}}
	s.e.Pasos = []Paso{{Ronda: 0, Tipo: "secuencia", Secuencia: "primos", Candidatos: []int{5}}, {Ronda: 0, Tipo: "ticket", Ticket: 5}, {Ronda: 0, Tipo: "premio", Ticket: 5, Premio: "cc-85"}}
	s.e.Revelados = 3
	ts := httptest.NewServer(s.rutas())
	defer ts.Close()

	// Ana ganó el sorteo: no participa
	if code, _ := post(t, ts, "/api/pregunta", "", map[string]any{"t": "tokana", "respuesta": "49"}); code != 409 {
		t.Fatal("quien ganó hoy no debe participar")
	}
	// excluido por teléfono y por nombre (aunque se inscriba de nuevo)
	if code, _ := post(t, ts, "/api/pregunta", "", map[string]any{"nombre": "Fer Marin", "telefono": "911000111", "respuesta": "49"}); code != 409 {
		t.Fatal("excluido por teléfono")
	}
	if code, _ := post(t, ts, "/api/pregunta", "", map[string]any{"nombre": "Jorge Olano", "telefono": "51922222222", "respuesta": "49"}); code != 409 {
		t.Fatal("excluido por nombre")
	}
	// Beto: mal, luego bien; repetir da el mismo premio
	if _, out := post(t, ts, "/api/pregunta", "", map[string]any{"t": "tokbeto", "respuesta": "48"}); out["incorrecta"] != true {
		t.Fatalf("48 no es correcto: %v", out)
	}
	_, out := post(t, ts, "/api/pregunta", "", map[string]any{"t": "tokbeto", "respuesta": " 49 "})
	premio, _ := out["premio"].(string)
	if premio == "" {
		t.Fatalf("sin premio: %v", out)
	}
	if _, out := post(t, ts, "/api/pregunta", "", map[string]any{"t": "tokbeto", "respuesta": "49"}); out["premio"] != premio || out["repetido"] != true {
		t.Fatal("un premio por persona")
	}
	// alguien que escribe el WhatsApp de Beto no recibe su token
	if _, out := post(t, ts, "/api/pregunta", "", map[string]any{"nombre": "Otro Tipo", "telefono": "51900000002", "respuesta": "49"}); out["t"] != "" {
		t.Fatal("no se entrega el token de otra persona")
	}
	// nuevo inscrito sin ticket
	code, out := post(t, ts, "/api/pregunta", "", map[string]any{"nombre": "Carla Díaz", "telefono": "51933333333", "respuesta": "cuarenta y nueve"})
	if code != 200 || out["premio"] == nil || out["t"] == "" {
		t.Fatalf("nuevo: %d %v", code, out)
	}
	if len(s.e.Tickets) != 2 {
		t.Fatal("la pregunta no crea tickets")
	}
}
