package httpapi

import "testing"

// Un alumno puede tener varias terminales (pestañas) y una colgada no lo deja fuera.
func TestSlotsVariasTerminalesPorUsuario(t *testing.T) {
	s := newSlots()
	for i := 0; i < maxTermPorUsuario; i++ {
		if !s.acquire("ana") {
			t.Fatalf("terminal %d rechazada", i+1)
		}
	}
	if s.acquire("ana") {
		t.Fatal("debió rechazar la terminal número 11")
	}
	if !s.acquire("beto") {
		t.Fatal("otro alumno no debe verse afectado")
	}
	s.release("ana")
	if !s.acquire("ana") {
		t.Fatal("al cerrar una, debe abrirse otra")
	}
}
