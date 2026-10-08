package httpapi

import (
	"errors"
	"net/http"
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
		Roles   []string `json:"roles"`
		Cohorts []string `json:"cohorts"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	roles := auth.NormalizeRoles(in.Roles)
	if len(roles) == 0 {
		badRequest(w, "roles: al menos uno de admin, instructor, student")
		return
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
