package httpapi

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Inscripción aprobada desde fuera del LMS (servicio inscripcion-web: pago por Yape revisado por el instructor).
//
//	POST /api/v1/interno/inscripcion  {email, name, cohorts[], destino}
//	Cabecera X-Interno-Clave: LMS_INTERNO_CLAVE (≥ 32 caracteres). Sin clave configurada, la ruta no existe (404).
//
// Busca la cuenta por correo o la crea (alumno, con una contraseña aleatoria que nadie conoce: entra por el
// enlace y, si quiere, la cambia con «olvidé mi contraseña»). Suma los grupos sin quitar ninguno de los que ya
// tenía. Devuelve un enlace de acceso de 7 días. Todo o nada: si un grupo no existe en el catálogo, no toca la
// cuenta y lo dice. A cuentas de staff no les firma enlace (409): esas se atienden a mano.

const enlaceInscripcionVigencia = 7 * 24 * time.Hour

var internoMu sync.Mutex

func (s *Server) internoAutorizado(r *http.Request) bool {
	c := s.InternoClave
	if len(c) < 32 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Interno-Clave")), []byte(c)) == 1
}

func (s *Server) internoInscripcion(w http.ResponseWriter, r *http.Request) {
	if !s.internoAutorizado(r) {
		notFound(w, "la ruta")
		return
	}
	var in struct {
		Email   string   `json:"email"`
		Name    string   `json:"name"`
		Cohorts []string `json:"cohorts"`
		Destino string   `json:"destino"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Name = strings.Join(strings.Fields(in.Name), " ")
	if !validEmail(in.Email) {
		badRequest(w, "el correo no es válido")
		return
	}
	if in.Name == "" || len(in.Name) > 120 {
		badRequest(w, "name: entre 1 y 120 caracteres")
		return
	}
	grupos := []string{}
	for _, g := range in.Cohorts {
		g = content.TrimCohort(strings.TrimSpace(g))
		if g != "" && !slices.Contains(grupos, g) {
			grupos = append(grupos, g)
		}
	}
	if len(grupos) == 0 || len(grupos) > 10 {
		badRequest(w, "cohorts: entre 1 y 10 grupos")
		return
	}
	faltan := []string{}
	for _, g := range grupos {
		if len(s.cursosDelGrupo(g)) == 0 {
			faltan = append(faltan, g)
		}
	}
	if len(faltan) > 0 {
		writeJSON(w, 422, map[string]any{"error": "grupo_inexistente",
			"message": "Estos grupos aún no tienen curso en el LMS: " + strings.Join(faltan, ", "), "faltan": faltan})
		return
	}
	destino := destinoSeguro(strings.TrimSpace(in.Destino))
	if s.enlaceClave() == nil {
		writeErr(w, 503, "sin_semilla", "Este servidor no puede firmar enlaces (falta la semilla del aula).")
		return
	}

	internoMu.Lock()
	defer internoMu.Unlock()
	ctx := r.Context()
	creado := false
	u, err := s.DB.UserByEmail(ctx, in.Email)
	switch {
	case errors.Is(err, store.ErrNotFound):
		b := make([]byte, 24)
		if _, err := rand.Read(b); err != nil {
			internal(w, err)
			return
		}
		hash, err := auth.HashPassword(hex.EncodeToString(b))
		if err != nil {
			internal(w, err)
			return
		}
		u = &store.User{Email: in.Email, Name: in.Name, PasswordHash: hash, Roles: []string{"student"}, Cohorts: grupos}
		if err := s.DB.CreateUser(ctx, u); err != nil {
			internal(w, err)
			return
		}
		creado = true
	case err != nil:
		internal(w, err)
		return
	default:
		for _, rol := range u.Roles {
			if rol == "admin" || rol == "instructor" {
				writeErr(w, 409, "cuenta_staff", "Ese correo es de una cuenta de staff: inscríbela a mano.")
				return
			}
		}
		suma := slices.Clone(u.Cohorts)
		for _, g := range grupos {
			if !slices.Contains(suma, g) {
				suma = append(suma, g)
			}
		}
		if err := s.DB.UpdateUserRoles(ctx, u.ID, u.Roles, suma); err != nil {
			internal(w, err)
			return
		}
		u.Cohorts = suma
	}
	vence := time.Now().Add(enlaceInscripcionVigencia)
	t := s.enlaceAcceso(u.ID, vence)
	enlace := strings.TrimRight(s.PublicURL, "/") + "/api/v1/auth/enlace?t=" + url.QueryEscape(t) + "&a=" + url.QueryEscape(destino)
	slog.Info("inscripción externa aprobada", "usuario", u.ID, "creado", creado, "grupos", grupos)
	writeJSON(w, 200, map[string]any{"user_id": u.ID, "creado": creado, "name": u.Name, "cohorts": u.Cohorts,
		"enlace": enlace, "vence": vence.UTC().Format(time.RFC3339)})
}
