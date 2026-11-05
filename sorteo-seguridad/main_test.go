package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Las 8 casillas: 3 de 30 %, 2 de 40 %, 1 de 50 % y 2 de «Lleva 6».
func TestFranjas(t *testing.T) {
	cuenta := map[string]int{}
	for _, f := range franjas() {
		cuenta[f]++
	}
	if cuenta["D30"] != 3 || cuenta["D40"] != 2 || cuenta["D50"] != 1 || cuenta["D70"] != 1 || cuenta["D90"] != 1 {
		t.Fatalf("franjas = %v, esperaba 3/2/1/2", cuenta)
	}
	for _, p := range premios {
		if cuenta[p.ID] != p.Casillas {
			t.Errorf("premio %s: %d casillas, declara %d", p.ID, cuenta[p.ID], p.Casillas)
		}
	}
}

func TestSorteoReproducibleYCodigo(t *testing.T) {
	for id := 1; id <= 100; id++ {
		c, p := sortear("semilla", id)
		c2, p2 := sortear("semilla", id)
		if c != c2 || p != p2 || p != franjaDe(c) || c < 0 || c >= casillas {
			t.Fatalf("id %d: %d %s / %d %s", id, c, p, c2, p2)
		}
		cod := codigo("semilla", id, p, "987654321")
		if len(cod) < 11 || cod[:len(p)] != p || cod[len(p)+1:len(p)+5] != "4321" {
			t.Fatalf("código raro: %s", cod)
		}
	}
}

func TestLimpiarCelular(t *testing.T) {
	for in, want := range map[string]string{"987 654 321": "987654321", "+51 987654321": "987654321", "51987654321": "987654321", "12345": "12345"} {
		if got := limpiarCelular(in); got != want {
			t.Errorf("%q → %q, esperaba %q", in, got, want)
		}
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

func post(t *testing.T, url string, cuerpo any, clave string) (int, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(cuerpo)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(b))
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

func TestGirarFlujo(t *testing.T) {
	s, ts := servidorPrueba(t)
	// nombre sin apellido
	if code, _ := post(t, ts.URL+"/api/girar", map[string]any{"nombre": "Ana", "telefono": "987654321"}, ""); code != 409 {
		t.Fatalf("nombre corto: %d", code)
	}
	// celular malo
	if code, _ := post(t, ts.URL+"/api/girar", map[string]any{"nombre": "Ana Quispe", "telefono": "12345678"}, ""); code != 409 {
		t.Fatalf("celular malo: %d", code)
	}
	code, out := post(t, ts.URL+"/api/girar", map[string]any{"nombre": "Ana Quispe", "telefono": "+51 987 654 321"}, "")
	if code != 200 || out["t"] == nil || out["codigo"] == nil || out["premio"] == nil {
		t.Fatalf("giro: %d %v", code, out)
	}
	tok := out["t"].(string)
	// mismo token → repetido, mismo premio
	code, out2 := post(t, ts.URL+"/api/girar", map[string]any{"nombre": "Otro Nombre", "telefono": "911111111", "t": tok}, "")
	if code != 200 || out2["repetido"] != true || out2["codigo"] != out["codigo"] {
		t.Fatalf("repetido por token: %d %v", code, out2)
	}
	// mismo celular sin token → repetido, sin token
	code, out3 := post(t, ts.URL+"/api/girar", map[string]any{"nombre": "Ana Q", "telefono": "987654321"}, "")
	if code != 200 || out3["repetido"] != true || out3["t"] != nil || out3["codigo"] != out["codigo"] {
		t.Fatalf("repetido por celular: %d %v", code, out3)
	}
	if len(s.e.Personas) != 1 {
		t.Fatalf("personas = %d", len(s.e.Personas))
	}
	// estado público: sin teléfonos
	r, _ := http.Get(ts.URL + "/api/estado?t=" + tok)
	var est map[string]any
	_ = json.NewDecoder(r.Body).Decode(&est)
	if est["fase"] != "abierto" || est["yo"] == nil || est["resultado"] != nil {
		t.Fatalf("estado: %v", est)
	}
	// admin: validar código
	req, _ := http.NewRequest("GET", ts.URL+"/api/admin/validar?codigo="+out["codigo"].(string), nil)
	req.Header.Set("X-Clave", "clave-de-prueba-123")
	r, _ = http.DefaultClient.Do(req)
	var val map[string]any
	_ = json.NewDecoder(r.Body).Decode(&val)
	if val["valido"] != true {
		t.Fatalf("validar: %v", val)
	}
	// cerrar → no se gira más
	if code, _ := post(t, ts.URL+"/api/admin/cerrar", map[string]any{}, "clave-de-prueba-123"); code != 200 {
		t.Fatalf("cerrar: %d", code)
	}
	if code, _ := post(t, ts.URL+"/api/girar", map[string]any{"nombre": "Luis Pérez", "telefono": "922222222"}, ""); code != 409 {
		t.Fatalf("girar cerrado: %d", code)
	}
	// clave mala
	if code, _ := post(t, ts.URL+"/api/admin/cerrar", map[string]any{}, "mala"); code != 401 {
		t.Fatalf("clave mala: %d", code)
	}
}

func TestLimiteIP(t *testing.T) {
	_, ts := servidorPrueba(t)
	for i := 0; i < 10; i++ {
		if code, out := post(t, ts.URL+"/api/girar", map[string]any{"nombre": fmt.Sprintf("Persona Num%d", i), "telefono": fmt.Sprintf("9%08d", i)}, ""); code != 200 {
			t.Fatalf("giro %d: %d %v", i, code, out)
		}
	}
	if code, _ := post(t, ts.URL+"/api/girar", map[string]any{"nombre": "Una Mas", "telefono": "999999999"}, ""); code != 429 {
		t.Fatalf("límite IP: %d", code)
	}
}
