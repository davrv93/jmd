package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func labDePrueba(t *testing.T) (*Lab, *time.Time) {
	t.Helper()
	if len(productos) == 0 {
		generar()
	}
	l := nuevoLab(Limites{Pedidos: 3, Ventana: 10 * time.Second, Tolerancia: 2, Castigo: 30 * time.Second})
	ahora := time.Date(2026, 11, 8, 15, 0, 0, 0, lima)
	l.ahora = func() time.Time { return ahora }
	return l, &ahora
}

func pedir(h http.Handler, ruta, nick string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("GET", ruta, nil)
	r.Header.Set("X-Alumno", nick)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestLimite429YBloqueo(t *testing.T) {
	l, ahora := labDePrueba(t)
	h := l.rutas()
	for i := 0; i < 3; i++ {
		if c := pedir(h, P+"/tienda", "ana").Code; c != 200 {
			t.Fatalf("pedido %d: %d", i, c)
		}
	}
	w := pedir(h, P+"/tienda", "ana")
	if w.Code != 429 || w.Header().Get("Retry-After") == "" {
		t.Fatalf("esperaba 429 con Retry-After, llegó %d", w.Code)
	}
	if c := pedir(h, P+"/tienda", "beto").Code; c != 200 {
		t.Fatalf("otro alumno no debe pagar por ana: %d", c)
	}
	pedir(h, P+"/tienda", "ana")
	if c := pedir(h, P+"/tienda", "ana").Code; c != 403 {
		t.Fatalf("tras la tolerancia esperaba 403, llegó %d", c)
	}
	*ahora = ahora.Add(31 * time.Second)
	if c := pedir(h, P+"/tienda", "ana").Code; c != 200 {
		t.Fatalf("pasado el castigo esperaba 200, llegó %d", c)
	}
}

func TestTrampaBloquea(t *testing.T) {
	l, _ := labDePrueba(t)
	h := l.rutas()
	if c := pedir(h, P+"/trampa/x", "cata").Code; c != 403 {
		t.Fatalf("trampa: %d", c)
	}
	if c := pedir(h, P+"/tienda", "cata").Code; c != 403 {
		t.Fatalf("después de la trampa: %d", c)
	}
}

func TestBusquedaPorPalabra(t *testing.T) {
	if !coincide("Taza Ligero azul", "taza") || coincide("Olla Nazca mostaza", "taza") || !coincide("Útiles", "utiles") {
		t.Fatal("coincide no busca por inicio de palabra sin tildes")
	}
}

func TestAPIExigeSesion(t *testing.T) {
	l, _ := labDePrueba(t)
	w := pedir(l.rutas(), P+"/api/productos", "dani")
	if w.Code != 401 || !strings.Contains(w.Body.String(), "sin sesión") {
		t.Fatalf("API sin sesión: %d %s", w.Code, w.Body.String())
	}
}

func TestDatosDeterministas(t *testing.T) {
	if len(productos) == 0 {
		generar()
	}
	if len(productos) != 120 || len(archivos) != 200 || productos[4].Nombre != "Cuaderno Plus verde" {
		t.Fatalf("datos cambiaron: %d %d %q", len(productos), len(archivos), productos[4].Nombre)
	}
}
