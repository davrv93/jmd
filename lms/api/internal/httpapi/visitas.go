package httpapi

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"
)

// Contador de las páginas públicas (sorteo y fugas): visitas y personas distintas. No guarda la IP, solo una huella
// HMAC con una clave del servidor. Si falla, la página se sirve igual: contar nunca debe romper una visita.

func (s *Server) huellaVisita(r *http.Request) string {
	clave := []byte("visitas")
	if s.IA != nil {
		clave = s.IA.Secreto
	}
	m := hmac.New(sha256.New, clave)
	m.Write([]byte("visita\x00" + clientIP(r)))
	return hex.EncodeToString(m.Sum(nil))[:24]
}

func (s *Server) contarVisita(r *http.Request, ruta string) {
	huella := s.huellaVisita(r)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := s.DB.SumarVisita(ctx, ruta, huella); err != nil {
			slog.Warn("no se pudo contar la visita", "ruta", ruta, "err", err)
		}
	}()
}

// adminVisitas: GET /api/v1/admin/visitas.
func (s *Server) adminVisitas(w http.ResponseWriter, r *http.Request, p *Principal) {
	v, err := s.DB.VisitasResumen(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"paginas": v})
}
