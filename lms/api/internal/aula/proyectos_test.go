package aula

import "testing"

func TestProyectosDe(t *testing.T) {
	out := `100 /trabajo/index.html
200 /trabajo/landing/index.html
210 /trabajo/landing/gracias.html
300 /trabajo/mesa-ayuda/public/p5-obra.html
310 /trabajo/mesa-ayuda/public/kanban.html
400 /trabajo/goldenquerys/dashboard/index.html
150 /trabajo/osito/frontend/index.html
basura`
	got := proyectosDe(out)
	quiero := []string{"goldenquerys/dashboard", "mesa-ayuda/public/kanban.html", "mesa-ayuda/public/p5-obra.html", "landing", "Mi asistente (Robo)"}
	if len(got) != len(quiero) {
		t.Fatalf("got %+v", got)
	}
	for i, q := range quiero {
		if got[i].Nombre != q {
			t.Errorf("%d: %q, quiero %q (%+v)", i, got[i].Nombre, q, got)
		}
	}
}
