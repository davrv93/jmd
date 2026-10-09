package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// authConfig dice al front qué formas de entrar hay.
func (s *Server) authConfig(w http.ResponseWriter, r *http.Request) {
	cfg := map[string]any{
		"local":    true,
		"register": s.InviteCode != "",
		"oidc":     s.OIDC != nil,
	}
	if s.OIDC != nil {
		cfg["issuer"] = s.OIDC.Issuer()
	}
	writeJSON(w, 200, cfg)
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Label    string `json:"label"` // p. ej. "jmd" cuando el token es para el CLI
}

// loginLocal: email + contraseña → cookie y token (el token sirve de Bearer para jmd).
func (s *Server) loginLocal(w http.ResponseWriter, r *http.Request) {
	var in loginReq
	if !readJSON(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if !s.login.allow(clientIP(r)) || !s.login.allow("email:"+in.Email) {
		writeErr(w, 429, "rate_limited", "demasiados intentos; espera un minuto")
		return
	}
	u, err := s.DB.UserByEmail(r.Context(), in.Email)
	if errors.Is(err, store.ErrNotFound) || (err == nil && !auth.CheckPassword(u.PasswordHash, in.Password)) {
		writeErr(w, 401, "invalid_credentials", "correo o contraseña incorrectos")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	tok, err := s.startSession(w, r, u, in.Label)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"token": tok, "user": fromUser(u, "", false)})
}

type registerReq struct {
	Email      string `json:"email"`
	Name       string `json:"name"`
	Password   string `json:"password"`
	InviteCode string `json:"invite_code"`
}

// register: alta de alumno con el código de invitación de la cohorte.
func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	if s.InviteCode == "" {
		writeErr(w, 404, "not_found", "el registro está desactivado; pide tu cuenta al instructor")
		return
	}
	var in registerReq
	if !readJSON(w, r, &in) {
		return
	}
	if !s.login.allow(clientIP(r)) {
		writeErr(w, 429, "rate_limited", "demasiados intentos; espera un minuto")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Name = strings.TrimSpace(in.Name)
	switch {
	case in.InviteCode != s.InviteCode:
		writeErr(w, 403, "invalid_invite", "el código de invitación no es válido")
		return
	case !validEmail(in.Email):
		badRequest(w, "correo inválido")
		return
	case len(in.Name) < 2 || len(in.Name) > 80:
		badRequest(w, "el nombre debe tener entre 2 y 80 caracteres")
		return
	case len(in.Password) < 8 || len(in.Password) > 128:
		badRequest(w, "la contraseña debe tener al menos 8 caracteres")
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		internal(w, err)
		return
	}
	u := &store.User{Email: in.Email, Name: in.Name, PasswordHash: hash, Roles: []string{"student"}, Cohorts: []string{}}
	if s.DefaultCohort != "" {
		u.Cohorts = []string{s.DefaultCohort}
	}
	if err := s.DB.CreateUser(r.Context(), u); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeErr(w, 409, "conflict", "ya hay una cuenta con ese correo")
			return
		}
		internal(w, err)
		return
	}
	tok, err := s.startSession(w, r, u, "web")
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"token": tok, "user": fromUser(u, "", false)})
}

func validEmail(e string) bool {
	a, err := mail.ParseAddress(e)
	return err == nil && a.Address == e && len(e) <= 254
}

// logout revoca la sesión actual y borra la cookie.
func (s *Server) logout(w http.ResponseWriter, r *http.Request, p *Principal) {
	if p.tokenHash != "" {
		if err := s.DB.DeleteSession(r.Context(), p.tokenHash); err != nil {
			internal(w, err)
			return
		}
	}
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: "", Path: "/", HttpOnly: true, MaxAge: -1, SameSite: http.SameSiteLaxMode, Secure: isHTTPS(r)})
	out := map[string]any{"ok": true}
	if s.OIDC != nil && p.Provider == "oidc" {
		if u := s.OIDC.EndSessionURL(); u != "" {
			out["end_session_url"] = u
		}
	}
	writeJSON(w, 200, out)
}

// --- OIDC (Keycloak) -----------------------------------------------------------------------

const oidcCookie = "lms_oidc"

// oidcStart redirige al realm con state y PKCE S256.
func (s *Server) oidcStart(w http.ResponseWriter, r *http.Request) {
	if s.OIDC == nil {
		writeErr(w, 404, "not_found", "SSO no configurado")
		return
	}
	state, verifier := auth.RandomString(16), auth.RandomString(32)
	next := r.URL.Query().Get("next")
	if !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") {
		next = "/courses/"
	}
	http.SetCookie(w, &http.Cookie{Name: oidcCookie, Value: state + "." + verifier + "." + url.QueryEscape(next), Path: "/auth/oidc/",
		HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: isHTTPS(r), MaxAge: 600})
	http.Redirect(w, r, s.OIDC.AuthURL(state, verifier), http.StatusFound)
}

// oidcCallback canjea el code, crea la cuenta si hace falta y abre sesión.
func (s *Server) oidcCallback(w http.ResponseWriter, r *http.Request) {
	if s.OIDC == nil {
		writeErr(w, 404, "not_found", "SSO no configurado")
		return
	}
	c, err := r.Cookie(oidcCookie)
	if err != nil {
		badRequest(w, "falta la cookie del inicio de sesión; vuelve a intentarlo")
		return
	}
	parts := strings.SplitN(c.Value, ".", 3)
	if len(parts) != 3 || parts[0] != r.URL.Query().Get("state") {
		badRequest(w, "state inválido")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: oidcCookie, Value: "", Path: "/auth/oidc/", MaxAge: -1})
	if e := r.URL.Query().Get("error"); e != "" {
		writeErr(w, 401, "oidc_error", e+": "+r.URL.Query().Get("error_description"))
		return
	}
	claims, err := s.OIDC.Exchange(r.Context(), r.URL.Query().Get("code"), parts[1])
	if err != nil {
		writeErr(w, 401, "oidc_error", err.Error())
		return
	}
	u, err := s.upsertOIDC(r.Context(), claims)
	if err != nil {
		internal(w, err)
		return
	}
	if _, err := s.startSession(w, r, u, "web"); err != nil {
		internal(w, err)
		return
	}
	next, _ := url.QueryUnescape(parts[2])
	if !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") {
		next = "/courses/"
	}
	http.Redirect(w, r, next, http.StatusFound)
}

// me: contrato GET /api/v1/me.
func (s *Server) me(w http.ResponseWriter, r *http.Request, p *Principal) {
	writeJSON(w, 200, map[string]any{
		"id": p.ID, "email": p.Email, "name": p.Name, "roles": p.Roles, "cohorts": p.Cohorts,
		"provider": p.Provider, "server_time": time.Now().UTC().Format(time.RFC3339),
	})
}
