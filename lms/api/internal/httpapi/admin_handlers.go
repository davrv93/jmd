package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

func (s *Server) users(w http.ResponseWriter, r *http.Request, p *Principal) {
	users, err := s.DB.Users(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	out := make([]map[string]any, 0, len(users))
	for _, u := range users {
		out = append(out, map[string]any{"id": u.ID, "email": u.Email, "name": u.Name, "roles": u.Roles,
			"cohorts": u.Cohorts, "provider": u.Provider, "created_at": u.CreatedAt.UTC().Format(time.RFC3339)})
	}
	writeJSON(w, 200, out)
}

func (s *Server) updateUser(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		Name    *string  `json:"name"`
		Roles   []string `json:"roles"`
		Cohorts []string `json:"cohorts"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	// Solo nombre: no exige roles. Los certificados ya emitidos conservan el nombre de su momento.
	if in.Name != nil && in.Roles == nil && in.Cohorts == nil {
		name := strings.TrimSpace(*in.Name)
		if name == "" || len(name) > 120 {
			badRequest(w, "name: entre 1 y 120 caracteres")
			return
		}
		err := s.DB.UpdateUserName(r.Context(), r.PathValue("id"), name)
		if errors.Is(err, store.ErrNotFound) {
			notFound(w, "el usuario")
			return
		}
		if err != nil {
			internal(w, err)
			return
		}
		slog.Info("nombre de usuario cambiado", "por", p.Email, "usuario", r.PathValue("id"))
		writeJSON(w, 200, map[string]any{"ok": true, "name": name})
		return
	}
	roles := auth.NormalizeRoles(in.Roles)
	if len(roles) == 0 {
		badRequest(w, "roles: al menos uno de admin, instructor, student")
		return
	}
	if in.Name != nil {
		name := strings.TrimSpace(*in.Name)
		if name == "" || len(name) > 120 {
			badRequest(w, "name: entre 1 y 120 caracteres")
			return
		}
		if err := s.DB.UpdateUserName(r.Context(), r.PathValue("id"), name); err != nil && !errors.Is(err, store.ErrNotFound) {
			internal(w, err)
			return
		}
	}
	err := s.DB.UpdateUserRoles(r.Context(), r.PathValue("id"), roles, auth.NormalizeCohorts(in.Cohorts))
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "el usuario")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

func (s *Server) reload(w http.ResponseWriter, r *http.Request, p *Principal) {
	if err := s.Content.Reload(); err != nil {
		writeErr(w, 422, "content_error", err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "content": s.Content.Get().Fingerprint()[:12]})
}
