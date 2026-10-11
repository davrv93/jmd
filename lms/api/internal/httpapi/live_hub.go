package httpapi

import (
	"encoding/json"
	"fmt"
	"sync"
)

// liveHub difunde los eventos del LIVE por lección, en memoria (dentro del proceso del LMS).
// Enviar a un canal nunca bloquea: si el buffer de un suscriptor está lleno se descarta el
// evento y se cuenta. La baja siempre va por la función devuelta en subscribe.
type liveSub struct {
	ch     chan []byte
	userID string
	staff  bool
}

type liveHub struct {
	mu          sync.Mutex
	subs        map[string]map[*liveSub]struct{}
	descartados int
}

func newLiveHub() *liveHub {
	return &liveHub{subs: map[string]map[*liveSub]struct{}{}}
}

// subscribe añade un suscriptor a la lección y devuelve su canal junto con la función de baja.
func (h *liveHub) subscribe(lesson, userID string, staff bool) (*liveSub, func()) {
	sub := &liveSub{ch: make(chan []byte, 32), userID: userID, staff: staff}
	h.mu.Lock()
	if h.subs[lesson] == nil {
		h.subs[lesson] = map[*liveSub]struct{}{}
	}
	h.subs[lesson][sub] = struct{}{}
	h.mu.Unlock()
	baja := func() {
		h.mu.Lock()
		delete(h.subs[lesson], sub)
		h.mu.Unlock()
	}
	return sub, baja
}

// enviar escribe sin bloquear; si el buffer está lleno, descarta.
func (sub *liveSub) enviar(msg []byte) {
	select {
	case sub.ch <- msg:
	default:
	}
}

// publish difunde a todos (alumnos y personal) el evento de la lección.
func (h *liveHub) publish(lesson, event string, data any) {
	b, _ := json.Marshal(data)
	msg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event, b))
	h.mu.Lock()
	defer h.mu.Unlock()
	for sub := range h.subs[lesson] {
		sub.enviar(msg)
	}
}

// publishStaff difunde solo a quienes tienen rol de personal.
func (h *liveHub) publishStaff(lesson, event string, data any) {
	b, _ := json.Marshal(data)
	msg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event, b))
	h.mu.Lock()
	defer h.mu.Unlock()
	for sub := range h.subs[lesson] {
		if sub.staff {
			sub.enviar(msg)
		}
	}
}

// publishUser difunde solo a un usuario concreto (mensajes dirigidos).
func (h *liveHub) publishUser(lesson, userID, event string, data any) {
	b, _ := json.Marshal(data)
	msg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event, b))
	h.mu.Lock()
	defer h.mu.Unlock()
	for sub := range h.subs[lesson] {
		if sub.userID == userID {
			sub.enviar(msg)
		}
	}
}

// count dice cuántos suscriptores hay en la lección.
func (h *liveHub) count(lesson string) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs[lesson])
}
