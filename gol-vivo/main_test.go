package main

import (
	"path/filepath"
	"testing"
	"time"
)

func TestGolEsDeQuienTocoAlUltimo(t *testing.T) {
	c := nuevaCancha(filepath.Join(t.TempDir(), "r.json"))
	c.registros["a"] = &Registro{Nombre: "Ana"}
	c.ultimo, c.ultimoNom = "a", "Ana"
	c.px = arcoDer - radioPortero // el portero está lejos
	c.bx, c.by, c.bvx, c.bvy = arcoIzq+30, 40, 0, -600
	ahora := time.Now()
	gol := ""
	for i := 0; i < 30 && gol == ""; i++ {
		gol = c.avanzar(1.0/pasosSeg, ahora)
	}
	if gol != "Ana" || c.registros["a"].Goles != 1 {
		t.Fatalf("gol %q, goles %d", gol, c.registros["a"].Goles)
	}
}

func TestFueraDelArcoRebota(t *testing.T) {
	c := nuevaCancha(filepath.Join(t.TempDir(), "r.json"))
	c.bx, c.by, c.bvx, c.bvy = 50, 20, 0, -600
	for i := 0; i < 10; i++ {
		if g := c.avanzar(1.0/pasosSeg, time.Now()); g != "" {
			t.Fatal("no debía ser gol")
		}
	}
	if c.bvy < 0 {
		t.Fatal("debía rebotar")
	}
}

func TestNombre(t *testing.T) {
	if !nombreBueno("Ana Quispe") || nombreBueno("a") || nombreBueno("<script>") {
		t.Fatal("validación de nombre")
	}
}

func TestRankingOrdena(t *testing.T) {
	c := nuevaCancha(filepath.Join(t.TempDir(), "r.json"))
	c.registros["a"] = &Registro{Nombre: "Ana", Goles: 1}
	c.registros["b"] = &Registro{Nombre: "Beto", Goles: 3}
	c.registros["c"] = &Registro{Nombre: "Cero"}
	r := c.ranking(10)
	if len(r) != 2 || r[0].Nombre != "Beto" {
		t.Fatalf("%+v", r)
	}
}
