package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"
)

func TestElegirDeterministaYSinRepetir(t *testing.T) {
	nums := []int{5, 1, 3, 2, 4, 6, 7}
	a, b := elegir("abc", nums, 3), elegir("abc", nums, 3)
	if fmt.Sprint(a) != fmt.Sprint(b) || len(a) != 3 {
		t.Fatalf("no determinista: %v %v", a, b)
	}
	visto := map[int]bool{}
	for _, n := range a {
		if visto[n] {
			t.Fatalf("repetido: %v", a)
		}
		visto[n] = true
	}
	distintos := 0
	for i := 0; i < 20; i++ {
		if fmt.Sprint(elegir(fmt.Sprint("s", i), nums, 3)) != fmt.Sprint(a) {
			distintos++
		}
	}
	if distintos < 15 {
		t.Fatalf("la semilla casi no cambia nada: %d/20", distintos)
	}
}

// Vector fijo: el JS del navegador debe dar exactamente esto (ver verificar.test.mjs).
func TestVectorFijo(t *testing.T) {
	got := elegir("semilla-de-prueba", []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 3)
	g := ganadorDe("otra-semilla", got)
	if fmt.Sprint(got) != "[5 4 7]" || g != 7 {
		t.Fatalf("vector cambiado: %v %d (actualiza verificar_test.mjs)", got, g)
	}
	if fmt.Sprint(got) != fmt.Sprint(elegir("semilla-de-prueba", []int{10, 9, 8, 7, 6, 5, 4, 3, 2, 1}, 3)) {
		t.Fatal("el orden de entrada no debería importar")
	}
}

func TestReparto(t *testing.T) {
	// Con muchas semillas, cada uno de 5 sale ganador una proporción parecida.
	cuenta := map[int]int{}
	for i := 0; i < 5000; i++ {
		f := elegir(fmt.Sprint("a", i), []int{1, 2, 3, 4, 5}, 3)
		cuenta[ganadorDe(fmt.Sprint("b", i), f)]++
	}
	for n := 1; n <= 5; n++ {
		if cuenta[n] < 850 || cuenta[n] > 1150 {
			t.Fatalf("reparto sesgado: %v", cuenta)
		}
	}
}

func TestFlujo(t *testing.T) {
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba-123", e: Estado{Edicion: 1, Titulo: "Prueba", Fase: "abierto"}}
	h := s.rutas()
	pedir := func(metodo, ruta string, cuerpo any, admin bool) (int, map[string]any) {
		b, _ := json.Marshal(cuerpo)
		r := httptest.NewRequest(metodo, ruta, bytes.NewReader(b))
		if admin {
			r.Header.Set("X-Clave", "clave-de-prueba-123")
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out
	}
	if c, _ := pedir("POST", "/api/admin/cerrar", nil, false); c != 401 {
		t.Fatalf("sin clave: %d", c)
	}
	personas := []map[string]string{{"id": "u1", "nombre": "Ana Pérez"}, {"id": "u2", "nombre": "Luis  Soto"}, {"id": "u3", "nombre": "María Quispe"}, {"id": "u4", "nombre": "José Ñahui"}}
	if c, out := pedir("POST", "/api/admin/lms", map[string]any{"personas": personas}, true); c != 200 || out["total"].(float64) != 4 {
		t.Fatalf("lms: %d %v", c, out)
	}
	if c, _ := pedir("POST", "/api/admin/agregar", map[string]string{"nombre": "Rosa Lima"}, true); c != 200 {
		t.Fatalf("agregar: %d", c)
	}
	if c, _ := pedir("POST", "/api/admin/agregar", map[string]string{"nombre": "ana perez"}, true); c != 409 {
		t.Fatalf("duplicado aceptado: %d", c)
	}
	_, est := pedir("GET", "/api/estado", nil, false)
	if n := len(est["lista"].([]any)); n != 5 {
		t.Fatalf("lista abierta: %d", n)
	}
	if bytes.Contains(mustJSON(est), []byte("u1")) || bytes.Contains(mustJSON(est), []byte("lms:")) {
		t.Fatal("el estado público filtra identificadores")
	}
	if c, _ := pedir("POST", "/api/admin/ronda1", nil, true); c != 409 {
		t.Fatalf("ronda1 sin cerrar: %d", c)
	}
	_, a := pedir("POST", "/api/admin/cerrar", nil, true)
	if a["fase"] != "cerrado" || a["semilla1"] != nil || a["compromiso1"] == "" {
		t.Fatalf("cerrar: %v", a)
	}
	// Cerrada la lista, el LMS ya no la cambia.
	pedir("POST", "/api/admin/lms", map[string]any{"personas": personas[:1]}, true)
	_, est = pedir("GET", "/api/estado", nil, false)
	if len(est["lista"].([]any)) != 5 || est["semilla1"] != nil || est["semilla2"] != nil {
		t.Fatalf("cerrado: %v", est)
	}
	pedir("POST", "/api/admin/ronda1", nil, true)
	_, est = pedir("GET", "/api/estado", nil, false)
	if est["fase"] != "finalistas" || len(est["finalistas"].([]any)) != 3 || est["semilla2"] != nil || est["ganador"] != nil {
		t.Fatalf("ronda1: %v", est)
	}
	if sha(est["semilla1"].(string)) != est["compromiso1"] {
		t.Fatal("semilla1 no coincide con su compromiso")
	}
	if sha(listaCanonica(s.e.Lista)) != est["huellaLista"] {
		t.Fatal("huella de la lista")
	}
	pedir("POST", "/api/admin/ronda2", nil, true)
	_, est = pedir("GET", "/api/estado", nil, false)
	if sha(est["semilla2"].(string)) != est["compromiso2"] {
		t.Fatal("semilla2 no coincide con su compromiso")
	}
	g := int(est["ganador"].(map[string]any)["numero"].(float64))
	if g != ganadorDe(s.e.Semilla2, s.e.Finalistas) {
		t.Fatal("ganador no determinista")
	}
	esFinal := false
	for _, f := range s.e.Finalistas {
		esFinal = esFinal || f == g
	}
	if !esFinal {
		t.Fatal("el ganador no es finalista")
	}
	if c, _ := pedir("POST", "/api/admin/ronda2", nil, true); c != 409 {
		t.Fatal("ronda2 dos veces")
	}
	_, a = pedir("POST", "/api/admin/reiniciar", nil, true)
	if a["fase"] != "abierto" || a["edicion"].(float64) != 2 || len(a["lista"].([]any)) != 5 {
		t.Fatalf("reiniciar: %v", a)
	}
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }
