package main

import (
	"fmt"
	"testing"
	"time"
)

// Con 300 personas los topes se respetan: 10 gratis y 2 de 90 % como máximo,
// y cada casilla cae en una franja de su premio.
func TestTopes(t *testing.T) {
	s := &Servidor{e: Estado{Fase: "abierto"}, cierre: time.Now().Add(time.Hour), porIP: map[string]int{}, azar: azarSeguro}
	for i := 0; i < 300; i++ {
		p, msg := s.girar("Ana Prueba", fmt.Sprintf("9%08d", i), i%2 == 0, "1.1.1.1")
		if msg != "" {
			t.Fatal(msg)
		}
		if franjas[p.Casilla] != p.Premio {
			t.Fatalf("casilla %d es %s, premio %s", p.Casilla, franjas[p.Casilla], p.Premio)
		}
	}
	e := s.entregados()
	if e["G100"] != 10 || e["D90"] != 2 {
		t.Fatalf("topes: %v", e)
	}
	if e["D30"]+e["D35"]+e["D40"] != 288 {
		t.Fatalf("resto: %v", e)
	}
}

func TestPrecios(t *testing.T) {
	casos := []struct {
		base, desc int
		quiere     string
	}{
		{precioTaller, 100, "S/ 0"}, {precioTaller, 90, "S/ 1.50"}, {precioTaller, 40, "S/ 9"},
		{precioTaller, 35, "S/ 9.75"}, {precioTaller, 30, "S/ 10.50"},
		{precioCertificado, 90, "S/ 2.50"}, {precioCertificado, 35, "S/ 16.25"}, {precioCertificado, 30, "S/ 17.50"},
	}
	for _, c := range casos {
		if g := soles(pagar(c.base, c.desc)); g != c.quiere {
			t.Errorf("%d − %d %% = %s, quiere %s", c.base, c.desc, g, c.quiere)
		}
	}
}

func TestUnGiroPorCelular(t *testing.T) {
	s := &Servidor{e: Estado{Fase: "abierto"}, cierre: time.Now().Add(time.Hour), porIP: map[string]int{}, azar: azarSeguro}
	if _, msg := s.girar("Ana Prueba", "987654321", false, "x"); msg != "" {
		t.Fatal(msg)
	}
	if _, msg := s.girar("Otra Persona", "51 987 654 321", false, "x"); msg == "" {
		t.Fatal("dejó girar dos veces con el mismo celular")
	}
}

func TestCierre(t *testing.T) {
	s := &Servidor{e: Estado{Fase: "abierto"}, cierre: time.Now().Add(-time.Minute)}
	if s.abierto(time.Now()) {
		t.Fatal("sigue abierto después del cierre")
	}
}
