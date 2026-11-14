package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestSecuencias(t *testing.T) {
	esperado := map[string][]int{
		"fibonacci": {1, 2, 3, 5, 8, 13, 21, 34},
		"euler":     {2, 4, 13, 18, 23, 24, 26, 27, 28, 35, 36, 45, 47, 49},
		"primos":    {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47},
	}
	for _, s := range secuencias {
		if e, ok := esperado[s.ID]; ok && !reflect.DeepEqual(s.Numeros, e) {
			t.Errorf("%s = %v, esperaba %v", s.ID, s.Numeros, e)
		}
	}
	if n := len(numerosDe("pares")); n != 25 {
		t.Errorf("pares: %d", n)
	}
	if n := len(numerosDe("impares")); n != 25 {
		t.Errorf("impares: %d", n)
	}
}

func tickets(nums ...int) []FilaLista {
	var ts []FilaLista
	for _, n := range nums {
		ts = append(ts, FilaLista{Numero: n, Persona: n, Nombre: fmt.Sprintf("Persona %d", n)})
	}
	return ts
}

// Una persona con varios tickets gana una sola vez.
func TestPersonaGanaUnaVez(t *testing.T) {
	lista := []FilaLista{{1, 1, "Ana"}, {2, 1, "Ana"}, {3, 1, "Ana"}, {5, 1, "Ana"}, {8, 2, "Beto"}, {13, 3, "Ceci"}, {21, 4, "Dani"}}
	for i := 0; i < 300; i++ {
		pasos := calcularSorteo(fmt.Sprintf("s%d", i), lista, premiosIniciales(), 3)
		vistos := map[string]bool{}
		for _, p := range pasos {
			if p.Tipo == "ticket" {
				if vistos[p.Nombre] {
					t.Fatalf("s%d: %s ganó dos veces", i, p.Nombre)
				}
				vistos[p.Nombre] = true
			}
		}
		if len(vistos) != 3 {
			t.Fatalf("s%d: %d ganadores", i, len(vistos))
		}
	}
}

// Tres ganadores distintos, cada uno con un premio distinto, y el ticket
// ganador siempre sale de los candidatos de la secuencia de su ronda.
func TestSorteoUnTicketGanaUnaVez(t *testing.T) {
	for i := 0; i < 200; i++ {
		semilla := fmt.Sprintf("semilla-%d", i)
		pasos := calcularSorteo(semilla, tickets(1, 4, 9, 10, 15, 22, 33, 40, 41, 50), premiosIniciales(), 3)
		vistos, premios := map[int]bool{}, map[string]bool{}
		var cands []int
		gan := 0
		for _, p := range pasos {
			switch p.Tipo {
			case "secuencia":
				cands = p.Candidatos
			case "ticket":
				if vistos[p.Ticket] {
					t.Fatalf("%s: el ticket %d ganó dos veces", semilla, p.Ticket)
				}
				dentro := false
				for _, c := range cands {
					dentro = dentro || c == p.Ticket
				}
				if !dentro {
					t.Fatalf("%s: el ticket %d no era candidato %v", semilla, p.Ticket, cands)
				}
				vistos[p.Ticket] = true
			case "premio":
				if premios[p.Premio] {
					t.Fatalf("%s: premio repetido %s", semilla, p.Premio)
				}
				premios[p.Premio] = true
				gan++
			}
		}
		if gan != 3 {
			t.Fatalf("%s: %d ganadores", semilla, gan)
		}
	}
}

// Con un solo ticket fuera de casi todas las secuencias, la ruleta de
// secuencias gira de nuevo hasta dar con una que lo tenga.
func TestSecuenciaVaciaVuelveAGirar(t *testing.T) {
	pasos := calcularSorteo("x", tickets(50), premiosIniciales(), 3) // 50: solo par
	vacias := 0
	for _, p := range pasos {
		if p.Tipo == "secuencia" && p.Vacio {
			vacias++
		}
	}
	ultimo := pasos[len(pasos)-1]
	if ultimo.Tipo != "premio" || ultimo.Ticket != 50 || ultimo.Ronda != 0 {
		t.Fatalf("el 50 debía ganar y ahí acabar (ya no quedan tickets): %+v", pasos)
	}
	if vacias == 0 {
		t.Log("esta semilla dio pares a la primera")
	}
}

func TestDeterminista(t *testing.T) {
	a := calcularSorteo("misma", tickets(3, 7, 12, 21, 30), premiosIniciales(), 3)
	b := calcularSorteo("misma", tickets(3, 7, 12, 21, 30), premiosIniciales(), 3)
	if !reflect.DeepEqual(a, b) {
		t.Fatal("la misma semilla debe dar el mismo sorteo")
	}
}

func post(t *testing.T, ts *httptest.Server, ruta, clave string, cuerpo any) (int, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(cuerpo)
	req, _ := http.NewRequest("POST", ts.URL+ruta, bytes.NewReader(b))
	if clave != "" {
		req.Header.Set("X-Clave", clave)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

func TestFlujoCompleto(t *testing.T) {
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba-123", porIP: map[string]int{}}
	s.e = Estado{Edicion: 1, Fase: "inscripcion", Ganadores: 3, Premios: premiosIniciales()}
	ts := httptest.NewServer(s.rutas())
	defer ts.Close()

	for i, n := range []int{2, 13, 21, 34, 47} {
		code, out := post(t, ts, "/api/elegir", "", map[string]any{"numero": n, "nombre": fmt.Sprintf("Ana Torres %c", 'A'+i), "telefono": fmt.Sprintf("5198600000%d", i)})
		if code != 200 {
			t.Fatalf("elegir %d: %d %v", n, code, out)
		}
	}
	if code, _ := post(t, ts, "/api/elegir", "", map[string]any{"numero": 13, "nombre": "Otro Nombre", "telefono": "51911111111"}); code != 409 {
		t.Fatal("un ticket ocupado no debe poder elegirse")
	}
	if code, _ := post(t, ts, "/api/elegir", "", map[string]any{"numero": 9, "nombre": "Repite Fono", "telefono": "986000000"}); code != 409 {
		t.Fatal("un WhatsApp con ticket no debe elegir otro")
	}
	clave := s.clave
	// Referidos: Ana A crea su código; alguien llega con él. Hasta que el
	// panel confirme que está en el grupo, nadie gana ticket extra.
	tokA := s.e.Personas[0].Token
	if code, out := post(t, ts, "/api/codigo", "", map[string]any{"t": tokA, "codigo": "ana 2026"}); code != 200 {
		t.Fatalf("crear código: %v", out)
	}
	if code, _ := post(t, ts, "/api/codigo", "", map[string]any{"t": s.e.Personas[1].Token, "codigo": "ANA2026"}); code != 409 {
		t.Fatal("un código repetido no debe aceptarse")
	}
	if code, _ := post(t, ts, "/api/elegir", "", map[string]any{"numero": 9, "nombre": "Nuevo Amigo", "telefono": "51922222222", "ref": "NOEXISTE"}); code != 409 {
		t.Fatal("un código inexistente no debe aceptarse")
	}
	code, out := post(t, ts, "/api/elegir", "", map[string]any{"numero": 9, "nombre": "Nuevo Amigo", "telefono": "51922222222", "ref": "ana2026"})
	if code != 200 {
		t.Fatalf("inscribir referido: %v", out)
	}
	tokN := out["t"].(string)
	if code, _ := post(t, ts, "/api/elegir", "", map[string]any{"t": tokA, "numero": 10}); code != 409 {
		t.Fatal("sin confirmar el grupo no hay ticket extra")
	}
	nuevo := s.personaDe(tokN)
	if code, _ := post(t, ts, "/api/admin/grupo", clave, map[string]any{"id": nuevo.ID, "enGrupo": true}); code != 200 {
		t.Fatal("confirmar grupo")
	}
	for _, tok := range []string{tokA, tokN} {
		if code, out := post(t, ts, "/api/elegir", "", map[string]any{"t": tok, "numero": 10 + len(s.e.Tickets)}); code != 200 {
			t.Fatalf("ticket extra: %v", out)
		}
		if code, _ := post(t, ts, "/api/elegir", "", map[string]any{"t": tok, "numero": 30 + len(s.e.Tickets)}); code != 409 {
			t.Fatal("solo un extra por referido")
		}
	}
	if len(s.e.Tickets) != 8 {
		t.Fatalf("tickets: %d", len(s.e.Tickets))
	}
	// otro referido confirmado: su extra y el de Ana se asignan solos al cerrar
	s.porIP = map[string]int{}
	code, out = post(t, ts, "/api/elegir", "", map[string]any{"numero": 40, "nombre": "Otra Amiga", "telefono": "51933333333", "ref": "ANA2026"})
	if code != 200 {
		t.Fatalf("otro referido: %v", out)
	}
	post(t, ts, "/api/admin/grupo", clave, map[string]any{"id": s.personaDe(out["t"].(string)).ID, "enGrupo": true})
	if code, _ := post(t, ts, "/api/admin/cerrar", clave, nil); code != 200 {
		t.Fatal("cerrar")
	}
	if len(s.e.Tickets) != 11 || len(s.ticketsDe(s.personaDe(tokA).ID)) != 3 {
		t.Fatalf("al cerrar debían asignarse los extras: %d tickets, Ana %v", len(s.e.Tickets), s.ticketsDe(s.personaDe(tokA).ID))
	}
	if code, _ := post(t, ts, "/api/admin/empezar", clave, nil); code != 200 {
		t.Fatal("empezar")
	}
	if s.e.Semilla == "" || len(s.e.Pasos) < 9 {
		t.Fatalf("pasos: %d", len(s.e.Pasos))
	}
	resp, _ := http.Get(ts.URL + "/api/estado")
	var pub map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&pub)
	resp.Body.Close()
	if len(pub["pasos"].([]any)) != 0 || pub["semilla"] != nil {
		t.Fatal("antes de girar no se debe ver nada del resultado")
	}
	for i := 0; i < len(s.e.Pasos); i++ {
		post(t, ts, "/api/admin/girar", clave, nil)
	}
	if s.e.Fase != "fin" || len(s.ganadoresRevelados()) != 3 {
		t.Fatalf("fase %s, ganadores %d", s.e.Fase, len(s.ganadoresRevelados()))
	}
	antes := append([]Paso(nil), s.e.Pasos...)
	if code, out := post(t, ts, "/api/admin/ampliar", clave, map[string]any{"mas": 3}); code != 200 {
		t.Fatalf("ampliar: %v", out)
	}
	if !reflect.DeepEqual(s.e.Pasos[:len(antes)], antes) || s.e.Fase != "sorteo" {
		t.Fatal("ampliar no debe cambiar lo ya revelado")
	}
	for s.e.Fase == "sorteo" {
		post(t, ts, "/api/admin/girar", clave, nil)
	}
	quienes := map[string]bool{}
	for _, g := range s.ganadoresRevelados() {
		if quienes[g["nombre"].(string)] {
			t.Fatalf("%v ganó dos veces", g["nombre"])
		}
		quienes[g["nombre"].(string)] = true
	}
	if len(quienes) != 6 {
		t.Fatalf("debían ser 6 ganadores: %d", len(quienes))
	}
}
