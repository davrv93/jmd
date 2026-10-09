package httpapi

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/runner"
)

type runRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
}

// run: POST /api/v1/run → ejecuta código del alumno en el runner aislado.
// Ver docs/CONTRATO_CAMBIOS.md. Requiere sesión; límite por usuario.
func (s *Server) run(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.Runner.Available() {
		writeErr(w, 503, "unavailable", "el runner de código no está configurado en este servidor")
		return
	}
	if s.runLimit == nil || !s.runLimit.allow(p.ID) {
		writeErr(w, 429, "rate_limited", "demasiadas ejecuciones seguidas, espera un momento")
		return
	}
	var in runRequest
	if !readJSON(w, r, &in) {
		return
	}
	if in.Code == "" {
		badRequest(w, "falta el código a ejecutar")
		return
	}
	if !runner.Supported(in.Language) {
		badRequest(w, "lenguaje no soportado: "+in.Language)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	res, err := s.Runner.Run(ctx, in.Language, in.Code)
	if err != nil {
		if errors.Is(err, runner.ErrUnavailable) {
			writeErr(w, 503, "unavailable", err.Error())
		} else {
			badRequest(w, err.Error())
		}
		return
	}
	writeJSON(w, 200, res)
}
