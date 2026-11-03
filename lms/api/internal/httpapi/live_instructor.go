package httpapi

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// Herramientas del instructor en el LIVE:
//
//	GET  /api/v1/live/{lesson}/accesos   (staff) un enlace por alumno del curso que inicia su sesión y lo deja en el LIVE
//	GET  /api/v1/auth/enlace?t=…&a=…     (sin sesión) canjea el enlace: abre la sesión del alumno y redirige a «a»
//	POST /api/v1/dsh/ver/{sub}           (staff) el enlace a la interfaz web de DeepSeek Harness de ese alumno
//
// El enlace de acceso es una credencial: quien lo tenga entra como ese alumno hasta que caduca (12 h). No se guarda
// en la base: «<sub base64url>.<vence unix>.<HMAC>», firmado con una clave derivada de la semilla del aula. Se
// reparte por el chat de la clase; si uno se filtra, basta esperar a que caduque (o cambiar la semilla del aula).

const enlaceVigencia = 12 * time.Hour

func (s *Server) enlaceClave() []byte {
	if s.IA == nil || len(s.IA.Secreto) == 0 {
		return nil
	}
	m := hmac.New(sha256.New, s.IA.Secreto)
	m.Write([]byte("enlace-de-acceso"))
	return m.Sum(nil)
}

func firmaEnlace(clave []byte, sub string, vence int64) string {
	m := hmac.New(sha256.New, clave)
	m.Write([]byte(sub + "\x00" + strconv.FormatInt(vence, 10)))
	return hex.EncodeToString(m.Sum(nil))[:40]
}

func (s *Server) enlaceAcceso(sub string, vence time.Time) string {
	clave := s.enlaceClave()
	if clave == nil {
		return ""
	}
	v := vence.Unix()
	return base64.RawURLEncoding.EncodeToString([]byte(sub)) + "." + strconv.FormatInt(v, 10) + "." + firmaEnlace(clave, sub, v)
}

// leerEnlace valida firma y vencimiento y devuelve el sub.
func (s *Server) leerEnlace(t string, ahora time.Time) (string, bool) {
	clave := s.enlaceClave()
	partes := strings.Split(t, ".")
	if clave == nil || len(partes) != 3 || len(t) > 400 {
		return "", false
	}
	raw, err := base64.RawURLEncoding.DecodeString(partes[0])
	if err != nil || len(raw) == 0 {
		return "", false
	}
	v, err := strconv.ParseInt(partes[1], 10, 64)
	if err != nil || ahora.Unix() > v {
		return "", false
	}
	sub := string(raw)
	if subtle.ConstantTimeCompare([]byte(partes[2]), []byte(firmaEnlace(clave, sub, v))) != 1 {
		return "", false
	}
	return sub, true
}

// destinoSeguro: solo rutas del propio sitio («/algo», nunca «//host» ni «/\host»).
func destinoSeguro(a string) string {
	if !strings.HasPrefix(a, "/") || strings.HasPrefix(a, "//") || strings.ContainsAny(a, "\\\r\n") || len(a) > 300 {
		return "/"
	}
	return a
}

// liveAccesos: GET /api/v1/live/{lesson}/accesos.
func (s *Server) liveAccesos(w http.ResponseWriter, r *http.Request, p *Principal) {
	lesson := s.Content.Get().Lesson(r.PathValue("lesson"))
	if lesson == nil {
		writeErr(w, 404, "not_found", "no existe esa sesión")
		return
	}
	curso := s.Content.Get().Course(lesson.CourseID)
	if curso == nil {
		writeErr(w, 404, "not_found", "no existe el curso de esa sesión")
		return
	}
	if !p.Is("admin") && !compartenGrupo(p.Cohorts, curso.Cohorts) {
		writeErr(w, 403, "forbidden", "no eres instructor de este grupo")
		return
	}
	if s.enlaceClave() == nil {
		writeErr(w, 503, "sin_semilla", "Este servidor no puede firmar enlaces (falta la semilla del aula).")
		return
	}
	usuarios, err := s.DB.Users(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	vence := time.Now().Add(enlaceVigencia)
	destino := "/live/" + url.PathEscape(lesson.ID) + "/"
	type fila struct {
		Sub    string `json:"sub"`
		Nombre string `json:"nombre"`
		Email  string `json:"email"`
		URL    string `json:"url"`
	}
	filas := []fila{}
	for _, u := range usuarios {
		esStaff := false
		for _, rol := range u.Roles {
			if rol == "admin" || rol == "instructor" {
				esStaff = true
			}
		}
		if esStaff || !compartenGrupo(u.Cohorts, curso.Cohorts) {
			continue
		}
		t := s.enlaceAcceso(u.ID, vence)
		filas = append(filas, fila{Sub: u.ID, Nombre: u.Name, Email: u.Email,
			URL: strings.TrimRight(s.PublicURL, "/") + "/api/v1/auth/enlace?t=" + url.QueryEscape(t) + "&a=" + url.QueryEscape(destino)})
	}
	sort.Slice(filas, func(i, j int) bool { return strings.ToLower(filas[i].Nombre) < strings.ToLower(filas[j].Nombre) })
	slog.Info("enlaces de acceso generados", "por", p.Email, "sesion", lesson.ID, "alumnos", len(filas))
	writeJSON(w, 200, map[string]any{"vence": vence.UTC().Format(time.RFC3339), "curso": curso.Title, "alumnos": filas})
}

// authEnlace: GET /api/v1/auth/enlace?t=…&a=/live/…/.
func (s *Server) authEnlace(w http.ResponseWriter, r *http.Request) {
	sub, ok := s.leerEnlace(r.URL.Query().Get("t"), time.Now())
	if !ok {
		http.Redirect(w, r, "/?enlace=caducado", http.StatusSeeOther)
		return
	}
	u, err := s.DB.UserByID(r.Context(), sub)
	if err != nil {
		http.Redirect(w, r, "/?enlace=caducado", http.StatusSeeOther)
		return
	}
	if _, err := s.startSession(w, r, u, "enlace"); err != nil {
		internal(w, err)
		return
	}
	slog.Info("entrada por enlace de acceso", "usuario", u.Email)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Referrer-Policy", "no-referrer")
	http.Redirect(w, r, destinoSeguro(r.URL.Query().Get("a")), http.StatusSeeOther)
}

// dshVer: POST /api/v1/dsh/ver/{sub}. El instructor abre el DeepSeek Harness de un alumno (el mismo que él ve: puede
// escribirle para ayudarlo). No arranca nada: si el alumno no lo abrió todavía, 409.
func (s *Server) dshVer(w http.ResponseWriter, r *http.Request, p *Principal) {
	sub := r.PathValue("sub")
	if !s.aulaListo(w) || !s.vistaAcceso(w, r, p, sub) {
		return
	}
	if !s.dshOrigenValido(r, p) {
		writeErr(w, 403, "forbidden", "origen no permitido")
		return
	}
	if s.Aula.Estado(r.Context(), sub) != "corriendo" {
		writeErr(w, 409, "aula_apagada", "Su aula está apagada: todavía no abrió la terminal ni DeepSeek Harness.")
		return
	}
	out, err := s.Aula.Exec(r.Context(), aula.Nombre(sub), "cat /tmp/aula-dsh-web.url 2>/dev/null")
	enlace, ok := enlaceDsh("URL "+strings.TrimSpace(out), sub)
	if err != nil || !ok {
		writeErr(w, 409, "dsh_cerrado", "Todavía no abrió DeepSeek Harness.")
		return
	}
	slog.Info("instructor abre el dsh de un alumno", "por", p.Email, "aula", aula.Nombre(sub))
	writeJSON(w, 200, map[string]any{"url": enlace})
}
