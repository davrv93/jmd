package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/creack/pty"
)

// slots limita cuántos terminales puede tener abiertos cada usuario (uno).
type slots struct {
	mu  sync.Mutex
	has map[string]bool
}

func newSlots() *slots { return &slots{has: map[string]bool{}} }

func (s *slots) acquire(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.has[key] {
		return false
	}
	s.has[key] = true
	return true
}

func (s *slots) release(key string) {
	s.mu.Lock()
	delete(s.has, key)
	s.mu.Unlock()
}

type termResize struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

// term: GET /api/v1/term → shell interactiva DENTRO de un contenedor aislado, por WebSocket.
// El contenedor no tiene red, ni socket de Docker, ni privilegios: nunca toca el host.
func (s *Server) term(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.Runner.Available() {
		writeErr(w, 503, "unavailable", "el terminal no está configurado en este servidor")
		return
	}
	if s.termSlots == nil || !s.termSlots.acquire(p.ID) {
		writeErr(w, 429, "rate_limited", "ya tienes un terminal abierto; cierra el otro primero")
		return
	}
	defer s.termSlots.release(p.ID)

	// Solo se acepta el handshake desde el propio dominio de la app (además de la cookie SameSite).
	opts := &websocket.AcceptOptions{}
	if u, err := url.Parse(s.PublicURL); err == nil && u.Host != "" {
		opts.OriginPatterns = []string{u.Host}
	}
	conn, err := websocket.Accept(w, r, opts)
	if err != nil {
		return
	}
	defer conn.CloseNow()
	conn.SetReadLimit(1 << 16)

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()

	cmd, name := s.Runner.ShellCmd(ctx, s.TermImage)
	defer s.Runner.Kill(name)

	f, err := pty.Start(cmd)
	if err != nil {
		_ = conn.Close(websocket.StatusInternalError, "no se pudo abrir la shell")
		return
	}
	defer f.Close()

	// pty → websocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := f.Read(buf)
			if n > 0 {
				wctx, wcancel := context.WithTimeout(ctx, 5*time.Second)
				werr := conn.Write(wctx, websocket.MessageBinary, buf[:n])
				wcancel()
				if werr != nil {
					cancel()
					return
				}
			}
			if err != nil {
				_ = conn.Close(websocket.StatusNormalClosure, "shell terminó")
				return
			}
		}
	}()

	// websocket → pty (binario = teclas; texto = control de tamaño)
	for {
		typ, data, err := conn.Read(ctx)
		if err != nil {
			break
		}
		if typ == websocket.MessageText {
			var ctl termResize
			if json.Unmarshal(data, &ctl) == nil && ctl.Cols > 0 && ctl.Rows > 0 {
				_ = pty.Setsize(f, &pty.Winsize{Cols: uint16(ctl.Cols), Rows: uint16(ctl.Rows)})
			}
			continue
		}
		if _, err := f.Write(data); err != nil {
			break
		}
	}

	if cmd.Process != nil {
		_ = cmd.Process.Kill()
	}
}
