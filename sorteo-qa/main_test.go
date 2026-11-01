package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Las 50 casillas de la ruleta: 1 de Requerimientos, 6 de 80 %, 18 de 70 % y 25 de 60 %.
func TestFranjas(t *testing.T) {
	cuenta := map[string]int{}
	for _, f := range franjas() {
		cuenta[f]++
	}
	if cuenta["req100"] != 1 || cuenta["80"] != 6 || cuenta["70"] != 18 || cuenta["60"] != 25 {
		t.Fatalf("franjas = %v, esperaba 1/6/18/25", cuenta)
	}
	for _, p := range premios {
		if cuenta[p.ID] != p.Casillas {
			t.Errorf("premio %s: %d casillas, declara %d", p.ID, cuenta[p.ID], p.Casillas)
		}
	}
}

// Los topes: nunca más de 3 cupones de 100 % ni 15 de 90 %; al agotarse una
// banda, el número baja a la siguiente. Y el sorteo es reproducible.
func TestTopesYReproducible(t *testing.T) {
	for i := 0; i < 200; i++ {
		semilla := fmt.Sprintf("s%d", i)
		var tickets []Ticket
		for n := 1; n <= totalNumeros; n++ {
			c, b, p := sortear(semilla, n, tickets)
			c2, b2, p2 := sortear(semilla, n, tickets)
			if c != c2 || b != b2 || p != p2 {
				t.Fatal("no reproducible")
			}
			if b != franjaDe(c) || c != azar(semilla, "premio", n, 0, casillas) {
				t.Fatalf("%s: casilla %d banda %s", semilla, c, b)
			}
			tickets = append(tickets, Ticket{Numero: n, Persona: n, Casilla: c, Banda: b, Premio: p})
		}
		ent := map[string]int{}
		for _, tk := range tickets {
			ent[tk.Premio]++
			// solo se baja de banda, nunca se sube
			orden := map[string]int{"req100": 0, "80": 1, "70": 2, "60": 3}
			if orden[tk.Premio] < orden[tk.Banda] {
				t.Fatalf("%s: banda %s entregó %s", semilla, tk.Banda, tk.Premio)
			}
		}
		if ent["req100"] > 1 || ent["80"] > 6 || ent["req100"]+ent["80"]+ent["70"]+ent["60"] != totalNumeros {
			t.Fatalf("%s: entregados %v", semilla, ent)
		}
	}
	if p := conTope("req100", map[string]int{"req100": 1}); p != "80" {
		t.Fatalf("Requerimientos agotado → %s", p)
	}
	if p := conTope("req100", map[string]int{"req100": 1, "80": 6}); p != "70" {
		t.Fatalf("dos bandas agotadas → %s", p)
	}
	if p := conTope("80", map[string]int{"80": 6}); p != "70" {
		t.Fatalf("80 agotado → %s", p)
	}
}

func servidorPrueba(t *testing.T) (*Servidor, *httptest.Server) {
	t.Helper()
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba-123", porIP: map[string]int{}}
	s.e = estadoNuevo(1)
	ts := httptest.NewServer(s.rutas())
	t.Cleanup(ts.Close)
	return s, ts
}

func pedir(t *testing.T, ts *httptest.Server, metodo, ruta string, cuerpo any, clave string) (int, map[string]any) {
	t.Helper()
	var b bytes.Buffer
	if cuerpo != nil {
		_ = json.NewEncoder(&b).Encode(cuerpo)
	}
	req, _ := http.NewRequest(metodo, ts.URL+ruta, &b)
	req.Header.Set("Content-Type", "application/json")
	if clave != "" {
		req.Header.Set("X-Clave", clave)
	}
	r, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(r.Body).Decode(&out)
	return r.StatusCode, out
}

func TestFlujo(t *testing.T) {
	s, ts := servidorPrueba(t)
	clave := s.clave
	c, r := pedir(t, ts, "POST", "/api/elegir", map[string]any{"numero": 7, "nombre": "Ana Torres", "telefono": "51999000111"}, "")
	if c != 200 || r["t"] == "" || r["premio"] == nil {
		t.Fatalf("elegir: %d %v", c, r)
	}
	token, premio := r["t"].(string), r["premio"]
	// mismo ticket → mismo premio al recargar
	_, e := pedir(t, ts, "GET", "/api/estado?t="+token, nil, "")
	yo := e["yo"].(map[string]any)
	if yo["numero"].(float64) != 7 || yo["premio"] != premio {
		t.Fatalf("yo: %v (premio %v)", yo, premio)
	}
	if e["semilla"] != nil || e["compromiso"] == "" {
		t.Fatal("la semilla no debe verse antes de cerrar; el compromiso sí")
	}
	// uno por persona
	if c, _ := pedir(t, ts, "POST", "/api/elegir", map[string]any{"numero": 8, "nombre": "Ana Torres", "telefono": "51999000111", "t": token}, ""); c != 409 {
		t.Fatalf("segundo número con token: %d", c)
	}
	if c, _ := pedir(t, ts, "POST", "/api/elegir", map[string]any{"numero": 9, "nombre": "Ana Dos", "telefono": "+51 999 000 111"}, ""); c != 409 {
		t.Fatalf("mismo WhatsApp: %d", c)
	}
	if c, _ := pedir(t, ts, "POST", "/api/elegir", map[string]any{"numero": 7, "nombre": "Beto Luna", "telefono": "51999000222"}, ""); c != 409 {
		t.Fatalf("número ocupado: %d", c)
	}
	if c, _ := pedir(t, ts, "POST", "/api/elegir", map[string]any{"numero": 10, "nombre": "Puta Madre", "telefono": "51999000333"}, ""); c != 409 {
		t.Fatalf("nombre ofensivo: %d", c)
	}
	if c, _ := pedir(t, ts, "POST", "/api/admin/cerrar", nil, "mala"); c != 401 {
		t.Fatalf("clave mala: %d", c)
	}
	if c, _ := pedir(t, ts, "POST", "/api/admin/cerrar", nil, clave); c != 200 {
		t.Fatalf("cerrar: %d", c)
	}
	if c, _ := pedir(t, ts, "POST", "/api/elegir", map[string]any{"numero": 11, "nombre": "Tarde Llega", "telefono": "51999000444"}, ""); c != 409 {
		t.Fatalf("elegir tras cerrar: %d", c)
	}
	_, e = pedir(t, ts, "GET", "/api/estado", nil, "")
	if e["fase"] != "cerrado" || e["semilla"] == nil || sha(e["semilla"].(string)) != e["compromiso"] {
		t.Fatalf("cierre: %v", e)
	}
	res := e["resultado"].([]any)[0].(map[string]any)
	if res["premio"] != premio || res["nombre"] != "Ana Torres" {
		t.Fatalf("resultado: %v", res)
	}
	// la comprobación pública: casilla = azar(semilla, "premio", 7, 0, 50)
	if int(res["casilla"].(float64)) != azar(e["semilla"].(string), "premio", 7, 0, casillas) {
		t.Fatal("la casilla no sale de la semilla")
	}
}
