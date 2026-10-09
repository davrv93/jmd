// Package httpapi expone el API REST del LMS (/api/v1, contrato v1), el login y el front.
package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/runner"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Server junta el contenido, la base de datos, la autenticación y el front.
type Server struct {
	Content       *content.Store
	DB            *store.DB
	OIDC          *auth.OIDC // nil si no hay Keycloak configurado
	InviteCode    string     // vacío = sin registro propio
	DefaultCohort string     // cohorte de quien se registra con el código
	PublicURL     string     // https://lms.<dominio> (para las URLs de las preguntas)
	SessionTTL    time.Duration
	Web           fs.FS      // build del front; nil = solo API
	Runner        *runner.Runner // ejecuta código de los alumnos; nil/deshabilitado = sin /run

	login    *limiter
	runLimit *limiter
}

// Principal es quien hace la petición, venga por cookie, token local o JWT del realm.
type Principal struct {
	ID        string   `json:"id"`
	Email     string   `json:"email"`
	Name      string   `json:"name"`
	Roles     []string `json:"roles"`
	Cohorts   []string `json:"cohorts"`
	Provider  string   `json:"provider"`
	tokenHash string
	viaCookie bool
}

// Is dice si tiene el rol.
func (p *Principal) Is(role string) bool {
	for _, r := range p.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// Staff es instructor o admin.
func (p *Principal) Staff() bool { return p.Is("instructor") || p.Is("admin") }

const cookieName = "lms_session"

// Handler monta todas las rutas.
func (s *Server) Handler() http.Handler {
	if s.SessionTTL == 0 {
		s.SessionTTL = 30 * 24 * time.Hour
	}
	if s.login == nil {
		s.login = newLimiter(10, time.Minute)
	}
	if s.runLimit == nil {
		s.runLimit = newLimiter(20, time.Minute)
	}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true, "content": s.Content.Get().Fingerprint()[:12]})
	})
	mux.HandleFunc("GET /api/v1/auth/config", s.authConfig)
	mux.HandleFunc("POST /api/v1/auth/login", s.loginLocal)
	mux.HandleFunc("POST /api/v1/auth/register", s.register)
	mux.Handle("POST /api/v1/auth/logout", s.authed(s.logout))
	mux.HandleFunc("GET /auth/oidc/start", s.oidcStart)
	mux.HandleFunc("GET /auth/oidc/callback", s.oidcCallback)

	// Contrato 2.2
	mux.Handle("GET /api/v1/me", s.authed(s.me))
	mux.Handle("GET /api/v1/courses", s.authed(s.courses))
	mux.Handle("GET /api/v1/courses/{id}", s.authed(s.course))
	mux.Handle("GET /api/v1/lessons/{id}", s.authed(s.lesson))
	mux.Handle("GET /api/v1/materials/{id}/download", s.authed(s.materialDownload))
	mux.Handle("GET /api/v1/assignments", s.authed(s.assignments))
	mux.Handle("GET /api/v1/assignments/{id}", s.authed(s.assignment))
	mux.Handle("POST /api/v1/assignments/{id}/submissions", s.authed(s.createSubmission))
	mux.Handle("GET /api/v1/submissions/{id}", s.authed(s.submission))
	mux.Handle("GET /api/v1/grades", s.authed(s.grades))
	mux.Handle("POST /api/v1/lessons/{id}/questions", s.authed(s.createQuestion))

	// Añadidos (ver docs/CONTRATO_CAMBIOS.md): progreso del ciclo, hilos, enlaces, calificación, ejemplos.
	mux.Handle("GET /api/v1/lessons/{id}/progress", s.authed(s.progress))
	mux.Handle("PUT /api/v1/lessons/{id}/progress/{step}", s.authed(s.setProgress))
	mux.Handle("GET /api/v1/lessons/{id}/questions", s.authed(s.questions))
	mux.Handle("POST /api/v1/questions/{id}/answers", s.authed(s.createAnswer))
	mux.Handle("POST /api/v1/questions/{id}/resolve", s.authed(s.resolveQuestion))
	mux.Handle("GET /api/v1/links", s.authed(s.links))
	mux.Handle("GET /files/{course}/{path...}", s.authed(s.courseFile))
	mux.Handle("GET /api/v1/assignments/{id}/submissions", s.authed(s.listSubmissions))
	mux.Handle("POST /api/v1/submissions/{id}/grade", s.authed(s.staff(s.gradeSubmission)))
	mux.Handle("GET /api/v1/courses/{id}/progress", s.authed(s.staff(s.courseProgress)))
	mux.Handle("GET /api/v1/courses/{id}/examples", s.authed(s.courseExamples))
	mux.Handle("GET /api/v1/examples/{id}", s.authed(s.example))
	mux.Handle("POST /api/v1/run", s.authed(s.run))
	mux.Handle("GET /api/v1/admin/users", s.authed(s.admin(s.users)))
	mux.Handle("PUT /api/v1/admin/users/{id}", s.authed(s.admin(s.updateUser)))
	mux.Handle("POST /api/v1/admin/reload", s.authed(s.admin(s.reload)))

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeErr(w, 404, "not_found", "ruta no encontrada: "+r.Method+" "+r.URL.Path)
	})
	if s.Web != nil {
		mux.Handle("/", s.static())
	}
	return secureHeaders(mux)
}

func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

// --- autenticación -------------------------------------------------------------------------

type handler func(w http.ResponseWriter, r *http.Request, p *Principal)

// authed resuelve el principal o responde 401. Con cookie, las escrituras exigen JSON (CSRF).
func (s *Server) authed(h handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, err := s.principal(r)
		if err != nil {
			internal(w, err)
			return
		}
		if p == nil {
			unauthorized(w)
			return
		}
		if p.viaCookie && r.Method != http.MethodGet && r.Method != http.MethodHead {
			if ct := r.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
				writeErr(w, 403, "forbidden", "las escrituras con cookie deben enviar Content-Type: application/json")
				return
			}
		}
		h(w, r, p)
	})
}

func (s *Server) staff(h handler) handler {
	return func(w http.ResponseWriter, r *http.Request, p *Principal) {
		if !p.Staff() {
			forbidden(w)
			return
		}
		h(w, r, p)
	}
}

func (s *Server) admin(h handler) handler {
	return func(w http.ResponseWriter, r *http.Request, p *Principal) {
		if !p.Is("admin") {
			forbidden(w)
			return
		}
		h(w, r, p)
	}
}

// principal busca el token en Authorization: Bearer y, si no, en la cookie.
func (s *Server) principal(r *http.Request) (*Principal, error) {
	ctx := r.Context()
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
		tok := strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
		if strings.HasPrefix(tok, auth.TokenPrefix) {
			return s.fromSession(ctx, tok, false)
		}
		if s.OIDC != nil {
			claims, err := s.OIDC.VerifyAccessToken(ctx, tok)
			if err != nil {
				slog.Debug("jwt rechazado", "err", err)
				return nil, nil
			}
			u, err := s.upsertOIDC(ctx, claims)
			if err != nil {
				return nil, err
			}
			return fromUser(u, "", false), nil
		}
		return nil, nil
	}
	if c, err := r.Cookie(cookieName); err == nil && c.Value != "" {
		return s.fromSession(ctx, c.Value, true)
	}
	return nil, nil
}

func (s *Server) fromSession(ctx context.Context, tok string, cookie bool) (*Principal, error) {
	hash := auth.HashToken(tok)
	u, err := s.DB.UserBySession(ctx, hash)
	if errors.Is(err, store.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return fromUser(u, hash, cookie), nil
}

func fromUser(u *store.User, hash string, cookie bool) *Principal {
	return &Principal{ID: u.ID, Email: u.Email, Name: u.Name, Roles: u.Roles, Cohorts: u.Cohorts,
		Provider: u.Provider, tokenHash: hash, viaCookie: cookie}
}

func (s *Server) upsertOIDC(ctx context.Context, c *auth.Claims) (*store.User, error) {
	roles := auth.NormalizeRoles(c.RealmAccess.Roles)
	if len(roles) == 0 {
		roles = []string{"student"}
	}
	name := c.Name
	if name == "" {
		name = c.Email
	}
	cohorts := auth.NormalizeCohorts(c.Groups)
	// Cuenta local creada antes del SSO con el mismo correo: se reutiliza (mismo id) para no
	// perder progreso, preguntas ni entregas, y toma los roles y cohortes del realm. Es seguro
	// porque en el realm no hay registro propio y los correos los da de alta el instructor.
	if prev, err := s.DB.UserByEmail(ctx, strings.ToLower(strings.TrimSpace(c.Email))); err == nil && prev.ID != c.Sub {
		if err := s.DB.UpdateUserRoles(ctx, prev.ID, roles, cohorts); err != nil {
			return nil, err
		}
		prev.Roles, prev.Cohorts = roles, cohorts
		return prev, nil
	}
	u := &store.User{ID: c.Sub, Email: c.Email, Name: name, Roles: roles, Cohorts: cohorts}
	if err := s.DB.UpsertOIDCUser(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

// startSession crea el token, lo guarda y lo pone en la cookie.
func (s *Server) startSession(w http.ResponseWriter, r *http.Request, u *store.User, label string) (string, error) {
	tok := auth.NewToken()
	if err := s.DB.CreateSession(r.Context(), auth.HashToken(tok), u.ID, label, s.SessionTTL); err != nil {
		return "", err
	}
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: tok, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode,
		Secure: isHTTPS(r), MaxAge: int(s.SessionTTL.Seconds()),
	})
	return tok, nil
}

func isHTTPS(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func clientIP(r *http.Request) string {
	if xf := r.Header.Get("X-Forwarded-For"); xf != "" {
		return strings.TrimSpace(strings.Split(xf, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// --- front estático ------------------------------------------------------------------------

// jsonString codifica s como cadena JSON (con comillas), apta también dentro de <script>.
func jsonString(s string) []byte {
	b, _ := json.Marshal(s)
	return b
}

// shellSections son las rutas con parámetro: el front solo prerenderiza /<sección>/_/.
var shellSections = map[string]bool{"lessons": true, "assignments": true, "courses": true, "instructor": true, "examples": true}

// shellFor da el archivo genérico (<sección>/_/index.html o q-data.json) para /<sección>/<x>/ y
// /<sección>/<x>/q-data.json; "" si la ruta no es de ese tipo. p viene limpia (path.Clean).
func shellFor(p string, slash bool) string {
	seg := strings.Split(strings.TrimPrefix(p, "/"), "/")
	if len(seg) < 2 || !shellSections[seg[0]] || seg[1] == "" || seg[1] == "_" {
		return ""
	}
	switch {
	case len(seg) == 2 && slash:
		return seg[0] + "/_/index.html"
	case len(seg) == 3 && seg[2] == "q-data.json":
		return seg[0] + "/_/q-data.json"
	}
	return ""
}

// static sirve el build de Qwik: /ruta/ → /ruta/index.html; /build/* con caché larga.
// Las páginas con parámetro que no se prerenderizaron caen en /<sección>/_/ (F5 y contenido nuevo).
func (s *Server) static() http.Handler {
	files := http.FS(s.Web)
	fileServer := http.FileServer(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Clean("/" + r.URL.Path)
		if strings.HasPrefix(p, "/build/") || strings.HasPrefix(p, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		if !strings.HasSuffix(r.URL.Path, "/") && path.Ext(p) == "" {
			// Qwik genera /ruta/index.html; con la barra final no hace falta redirección.
			if _, err := fs.Stat(s.Web, strings.TrimPrefix(p, "/")+"/index.html"); err == nil {
				http.Redirect(w, r, p+"/", http.StatusMovedPermanently)
				return
			}
			if shell := shellFor(p, true); shell != "" {
				if _, err := fs.Stat(s.Web, shell); err == nil {
					http.Redirect(w, r, p+"/", http.StatusMovedPermanently)
					return
				}
			}
		}
		if _, err := fs.Stat(s.Web, strings.TrimPrefix(strings.TrimSuffix(p, "/")+"/index.html", "/")); err != nil {
			if _, err := fs.Stat(s.Web, strings.TrimPrefix(p, "/")); err != nil {
				if shell := shellFor(p, strings.HasSuffix(r.URL.Path, "/")); shell != "" {
					if f, err := fs.ReadFile(s.Web, shell); err == nil {
						// La página genérica lleva serializada su ruta ("/lessons/_/"); Qwik la usa como
						// URL de la página y, en la navegación sin recarga, la escribiría en la barra.
						// Se cambia por la ruta pedida, escapada como cadena JSON.
						f = bytes.ReplaceAll(f, []byte(`"/`+path.Dir(shell)+`/"`), jsonString(path.Dir(strings.TrimSuffix(p, "/q-data.json")+"/x")+"/"))
						// ServeContent toma el tipo del nombre (text/html o application/json).
						http.ServeContent(w, r, path.Base(shell), time.Time{}, bytes.NewReader(f))
						return
					}
				}
				if f, err := fs.ReadFile(s.Web, "404.html"); err == nil {
					w.Header().Set("Content-Type", "text/html; charset=utf-8")
					w.WriteHeader(404)
					_, _ = w.Write(f)
					return
				}
				http.NotFound(w, r)
				return
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}
