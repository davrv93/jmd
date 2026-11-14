package main

import (
	"errors"
	"path/filepath"
	"testing"
	"time"
)

func TestOpinionUnaPorNumeroYCierre(t *testing.T) {
	o, err := cargarOpiniones(filepath.Join(t.TempDir(), "o.json"))
	if err != nil {
		t.Fatal(err)
	}
	o.ahora = func() time.Time { return finOpiniones.Add(-time.Minute) }
	if n, rep, err := o.agregar("Ana", "987654321", "Muy buena charla", "1.1.1.1"); err != nil || rep || n != 1 {
		t.Fatalf("primera: %d %v %v", n, rep, err)
	}
	if n, _, err := o.agregar("Beto", "987654323", "Muy buen curso", "1.1.1.1"); err != nil || n != 2 {
		t.Fatalf("segunda: %d %v", n, err)
	}
	if n, rep, err := o.agregar("Ana", "987654321", "Otra opinión", "1.1.1.1"); err != nil || !rep || n != 1 || len(o.lista) != 2 {
		t.Fatalf("repetida conserva su número: %d %v %v", n, rep, err)
	}
	o.ahora = func() time.Time { return finOpiniones }
	if _, _, err := o.agregar("Luz", "987654322", "Llegué tarde", "1.1.1.1"); !errors.Is(err, errCerrado) {
		t.Fatalf("tras el cierre: %v", err)
	}
	if n, rep, err := o.agregar("Ana", "987654321", "Otra más", "1.1.1.1"); err != nil || !rep || n != 1 {
		t.Fatal("quien ya opinó sigue viendo el gracias tras el cierre")
	}
}

func TestOpinionSobreviveAlReinicio(t *testing.T) {
	archivo := filepath.Join(t.TempDir(), "o.json")
	o, _ := cargarOpiniones(archivo)
	o.ahora = func() time.Time { return finOpiniones.Add(-time.Hour) }
	if _, _, err := o.agregar("Ana", "987654321", "Muy buena charla", "1.1.1.1"); err != nil {
		t.Fatal(err)
	}
	otra, err := cargarOpiniones(archivo)
	if err != nil || len(otra.lista) != 1 {
		t.Fatalf("no recargó: %v", err)
	}
}
