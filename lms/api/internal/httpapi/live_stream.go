package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// escribirEvento escribe un bloque SSE "event:/data:" y lo empuja al cliente.
func escribirEvento(w http.ResponseWriter, flusher http.Flusher, event string, data any) {
	b, err := json.Marshal(data)
	if err != nil {
		return
	}
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, b)
	flusher.Flush()
}

// liveStream: GET /api/v1/live/{lesson}/stream — Server-Sent Events con el estado inicial,
// los eventos del hub de la lección y un ping cada 15 s para mantener viva la conexión.
func (s *Server) liveStream(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	h := w.Header()
	h.Set("Content-Type", "text/event-stream; charset=utf-8")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	h.Set("Connection", "keep-alive")
	w.WriteHeader(200)
	w.(http.Flusher).Flush()

	flusher, ok := w.(http.Flusher)
	if !ok {
		return
	}
	fmt.Fprint(w, "retry: 2000\n\n")

	sub, baja := s.live.subscribe(l.ID, p.ID, p.Staff())
	defer baja()

	// El estado actual llega de inmediato, escrito a este cliente sin pasar por el hub
	// (así no depende de saltos de publicación ni del orden de suscripción).
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	if err != nil {
		sv = &store.LiveSession{LessonID: l.ID, Estado: "preparando", Visible: true, Modo: "guiado", ActualizadaEn: time.Now().UTC()}
		sv.ActualizadaEn = time.Now().UTC()
	}
	escribirEvento(w, flusher, "estado", liveView(sv, s.live.count(l.ID)))

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()
		case msg, ok := <-sub.ch:
			if !ok {
				return
			}
			if _, err := w.Write(msg); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
