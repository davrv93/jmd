package main

import (
	"fmt"
	"testing"
	"time"
)

func servidorPrueba(t *testing.T) *Servidor {
	t.Helper()
	s := nuevoServidor("", "")
	base := time.Date(2026, 11, 1, 9, 0, 0, 0, lima)
	s.ahora = func() time.Time { return base }
	return s
}

func TestCapacidadYNombres(t *testing.T) {
	s := servidorPrueba(t)
	for i := 0; i < maxJugadores; i++ {
		if _, msg := s.unirse(fmt.Sprintf("Héroe %d", i), "", fmt.Sprintf("10.0.%d.1", i)); msg != "" {
			t.Fatalf("jugador %d: %s", i, msg)
		}
	}
	if _, msg := s.unirse("Treinta y uno", "", "10.9.9.9"); msg == "" || msg[:11] != "Arena llena" {
		t.Fatalf("el 16.º debía ser rechazado, msg=%q", msg)
	}
	s2 := servidorPrueba(t)
	for _, malo := range []string{"P.u.t.a", "ANAL2345", "Instructor", "x"} {
		if _, msg := s2.unirse(malo, "", "1.1.1.1"); msg == "" {
			t.Errorf("%q debía rechazarse", malo)
		}
	}
	s2.unirse("Ana", "", "1.1.1.1")
	if _, msg := s2.unirse("ana", "", "1.1.1.2"); msg == "" {
		t.Error("nombre repetido debía rechazarse")
	}
}

func TestLogrosYBonos(t *testing.T) {
	s := servidorPrueba(t)
	var js []*Jugador
	for _, n := range []string{"Ana", "Beto", "Caro", "Dani"} {
		s.unirse(n, "", "10.0.0."+n)
	}
	for i := range s.e.Jugadores { // punteros estables: después de los append
		js = append(js, &s.e.Jugadores[i])
	}
	for _, j := range js {
		if msg := s.pedirLogro(j, "07"); msg != "" {
			t.Fatal(msg)
		}
	}
	if msg := s.pedirLogro(js[0], "07"); msg == "" {
		t.Error("doble solicitud debía rechazarse")
	}
	if msg := s.pedirLogro(js[0], "99"); msg == "" {
		t.Error("logro inexistente debía rechazarse")
	}
	// Se aprueban en orden Beto, Ana, Dani; Caro se rechaza.
	orden := map[string]int{"Beto": 150, "Ana": 130, "Dani": 120, "Caro": 0}
	for _, nombre := range []string{"Beto", "Ana", "Dani", "Caro"} {
		var sol Solicitud
		for _, p := range s.e.Pendientes {
			if s.jugadorID(p.Jugador).Nombre == nombre {
				sol = p
			}
		}
		if msg := s.resolver(sol.ID, nombre != "Caro"); msg != "" {
			t.Fatal(msg)
		}
	}
	for _, j := range js {
		if j.Puntos != orden[j.Nombre] {
			t.Errorf("%s: %d puntos, se esperaban %d", j.Nombre, j.Puntos, orden[j.Nombre])
		}
	}
	if len(s.e.Pendientes) != 0 {
		t.Error("la cola debía quedar vacía")
	}
	if s.tabla()[0]["nombre"] != "Beto" || s.tabla()[0]["puesto"] != 1 {
		t.Error("Beto debía ir primero")
	}
	if ev := s.e.Eventos[len(s.e.Eventos)-4]; ev.Tipo != "primero" || ev.Bono != 50 {
		t.Errorf("el primero debía marcar «primero» con bono 50: %+v", ev)
	}
	if msg := s.pedirLogro(js[0], "07"); msg == "" {
		t.Error("logro ya aprobado no se vuelve a pedir")
	}
	if msg := s.pedirLogro(js[2], "07"); msg != "" {
		t.Error("tras el rechazo se puede volver a pedir:", msg)
	}
}

func TestRelampagoPorTiempo(t *testing.T) {
	s := servidorPrueba(t)
	s.unirse("Ana", "", "1")
	s.unirse("Beto", "", "2")
	s.unirse("Caro", "", "3")
	a, b, c := &s.e.Jugadores[0], &s.e.Jugadores[1], &s.e.Jugadores[2]
	if _, msg := s.responderRelampago(a, 0); msg == "" {
		t.Error("sin relámpago no se responde")
	}
	if msg := s.lanzarRelampago(0); msg != "" {
		t.Fatal(msg)
	}
	inicio := s.ahora()
	correcta := s.preguntas[0].Correcta
	pts, msg := s.responderRelampago(a, correcta) // al instante → 100
	if msg != "" || pts != 100 {
		t.Errorf("Ana: %d, %q (esperaba 100)", pts, msg)
	}
	s.ahora = func() time.Time { return inicio.Add(10 * time.Second) }
	pts, _ = s.responderRelampago(b, correcta) // a mitad → 75
	if pts != 75 {
		t.Errorf("Beto: %d (esperaba 75)", pts)
	}
	if _, msg := s.responderRelampago(b, correcta); msg == "" {
		t.Error("no se responde dos veces")
	}
	pts, _ = s.responderRelampago(c, (correcta+1)%len(s.preguntas[0].Opciones))
	if pts != 0 {
		t.Errorf("Caro falló y sumó %d", pts)
	}
	if s.publico()["relampago"].(map[string]any)["correcta"] != nil {
		t.Error("en el aire no se revela la correcta")
	}
	s.ahora = func() time.Time { return inicio.Add(21 * time.Second) }
	if _, msg := s.responderRelampago(c, correcta); msg == "" {
		t.Error("pasado el tiempo no se responde")
	}
	rel := s.publico()["relampago"].(map[string]any)
	if rel["activo"] != false || rel["correcta"] != correcta {
		t.Errorf("terminado debía revelar: %+v", rel)
	}
	if msg := s.lanzarRelampago(-1); msg != "" {
		t.Error("al azar tras terminar:", msg)
	}
	if s.e.Relampago.Pregunta == 0 {
		t.Error("al azar no repite la usada mientras queden otras")
	}
}

func TestCorreoYPasos(t *testing.T) {
	s := servidorPrueba(t)
	s.unirse("Ana Pérez", "ana@x.pe", "1")
	s.unirse("Ana Pérez", "ANA@x.pe ", "2") // misma persona, otro dispositivo
	if s.activos() != 1 {
		t.Fatalf("el mismo correo no crea otro héroe: %d", s.activos())
	}
	s.unirse("Ana Pérez", "otra@x.pe", "3") // homónima con correo distinto: entra con inicial
	if s.activos() != 2 || s.e.Jugadores[1].Nombre != "Ana Pérez O" {
		t.Fatalf("homónima: %+v", s.e.Jugadores)
	}
	a, b := &s.e.Jugadores[0], &s.e.Jugadores[1]
	if n := s.anotarPasos(a, []string{"ver", "casos", "nada"}); n != 2 || a.Puntos != 300 {
		t.Errorf("Ana: %d nuevos, %d puntos (esperaba 2 y 300)", n, a.Puntos)
	}
	if n := s.anotarPasos(a, []string{"ver", "casos"}); n != 0 || a.Puntos != 300 {
		t.Errorf("repetir no suma: %d, %d", n, a.Puntos)
	}
	if n := s.anotarPasos(b, []string{"ver"}); n != 1 || b.Puntos != 130 {
		t.Errorf("Beto segundo en «ver»: %d, %d (esperaba 1 y 130)", n, b.Puntos)
	}
}

func TestBugYCSV(t *testing.T) {
	s := servidorPrueba(t)
	s.unirse("Ana", "", "1")
	a := &s.e.Jugadores[0]
	if msg := s.darBug(a.ID, "El reporte suma dos veces la última venta"); msg != "" {
		t.Fatal(msg)
	}
	if a.Puntos != 150 {
		t.Errorf("bug: %d puntos", a.Puntos)
	}
	if msg := s.darBug(99, "x"); msg == "" {
		t.Error("jugador inexistente")
	}
}
