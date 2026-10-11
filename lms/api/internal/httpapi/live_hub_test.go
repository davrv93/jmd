package httpapi

import (
	"bytes"
	"testing"
	"time"
)

// Tres suscriptores reciben lo mismo; la baja quita; publishStaff llega solo al personal.
func TestLiveHubPublica(t *testing.T) {
	h := newLiveHub()
	s1, b1 := h.subscribe("l", "a", false)
	s2, b2 := h.subscribe("l", "b", false)
	s3, b3 := h.subscribe("l", "c", true)
	defer b1()
	defer b3()
	if h.count("l") != 3 {
		t.Fatalf("conectados: %d", h.count("l"))
	}
	h.publish("l", "estado", map[string]any{"escena": "03-tu-laptop"})

	msg := []byte("event: estado\ndata: {\"escena\":\"03-tu-laptop\"}\n\n")
	for _, s := range []*liveSub{s1, s2, s3} {
		select {
		case got := <-s.ch:
			if !bytes.Equal(got, msg) {
				t.Fatalf("cuerpo distinto en %s: %q", s.userID, got)
			}
		case <-time.After(time.Second):
			t.Fatalf("el suscriptor %s no recibió nada", s.userID)
		}
	}

	b2()
	if h.count("l") != 2 {
		t.Fatalf("tras la baja: %d", h.count("l"))
	}

	// Solo al personal.
	h.publishStaff("l", "presencia", map[string]any{"conectados": 2})
	select {
	case <-s3.ch:
	case <-time.After(time.Second):
		t.Fatal("staff no recibió publishStaff")
	}
	select {
	case <-s1.ch:
		t.Fatal("el alumno no debe recibir publishStaff")
	default:
	}
	select {
	case <-s2.ch:
		t.Fatal("el suscriptor de baja no debe recibir")
	default:
	}

	// A un solo usuario.
	h.publishUser("l", "a", "mensaje", map[string]any{"texto": "hola"})
	select {
	case got := <-s1.ch:
		if !bytes.HasPrefix(got, []byte("event: mensaje\n")) {
			t.Fatalf("evento dirigido mal: %q", got)
		}
	case <-time.After(time.Second):
		t.Fatal("publishUser no llegó a A")
	}
	select {
	case <-s3.ch:
		t.Fatal("publishUser no debe llegar a otro usuario")
	default:
	}

	// Un buffer lleno no bloquea al publicador.
	for i := 0; i < 40; i++ {
		h.publish("l", "ping", nil)
	}
}
