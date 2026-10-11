package httpapi

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// AulaMotor es lo que el servidor necesita del paquete aula (así las pruebas inyectan un falso).
type AulaMotor interface {
	Crear(ctx context.Context, userID string) (bool, error)
	Estado(ctx context.Context, userID string) string
	Exec(ctx context.Context, nombre string, cmd ...string) (string, error)
	Parar(ctx context.Context, nombre string) error
	Borrar(ctx context.Context, nombre string) error
	Listar(ctx context.Context) ([]string, error)
}

// ultimoUsoAula guarda, en memoria, cuándo usó cada alumno su aula (para el apagado por inactividad).
var ultimoUsoAula = struct {
	sync.Mutex
	t map[string]time.Time
}{t: map[string]time.Time{}}

func tocarAula(userID string) {
	ultimoUsoAula.Lock()
	ultimoUsoAula.t[userID] = time.Now().UTC()
	ultimoUsoAula.Unlock()
}

func usoAula(userID string) string {
	ultimoUsoAula.Lock()
	defer ultimoUsoAula.Unlock()
	if t, ok := ultimoUsoAula.t[userID]; ok {
		return t.Format(time.RFC3339)
	}
	return ""
}

// aulaListo responde 503 si el servidor no tiene el aula configurada.
func (s *Server) aulaListo(w http.ResponseWriter) bool {
	if s.Aula == nil {
		writeErr(w, 503, "unavailable", "el aula no está configurada en este servidor")
		return false
	}
	return true
}

func (s *Server) estadoAsistente(ctx context.Context, userID string) string {
	out, err := s.Aula.Exec(ctx, aula.Nombre(userID), "aula estado")
	if err != nil {
		return "parado"
	}
	if strings.Contains(out, "arrancado") {
		return "arrancado"
	}
	return "parado"
}

// aulaIniciar: POST /api/v1/aula/iniciar. Crea (o reutiliza) el contenedor del alumno.
func (s *Server) aulaIniciar(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.aulaListo(w) {
		return
	}
	var in struct{}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	reutilizado, err := s.Aula.Crear(r.Context(), p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	tocarAula(p.ID)
	writeJSON(w, 200, map[string]any{
		"contenedor": aula.Nombre(p.ID), "reutilizado": reutilizado, "asistente": s.estadoAsistente(r.Context(), p.ID),
	})
}

// aulaEstado: GET /api/v1/aula.
func (s *Server) aulaEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.aulaListo(w) {
		return
	}
	estado := s.Aula.Estado(r.Context(), p.ID)
	asistente := "parado"
	if estado == "corriendo" {
		asistente = s.estadoAsistente(r.Context(), p.ID)
	}
	writeJSON(w, 200, map[string]any{
		"contenedor": aula.Nombre(p.ID), "estado": estado, "asistente": asistente, "ultimo_uso": usoAula(p.ID),
	})
}

// aulaAsistente: POST /api/v1/aula/asistente {"accion":"arrancar|parar"}.
func (s *Server) aulaAsistente(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.aulaListo(w) {
		return
	}
	var in struct {
		Accion string `json:"accion"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	var cmd string
	switch in.Accion {
	case "arrancar":
		cmd = "aula iniciar"
	case "parar":
		cmd = "aula parar"
	default:
		writeErr(w, 400, "accion_invalida", `la acción debe ser "arrancar" o "parar"`)
		return
	}
	if s.Aula.Estado(r.Context(), p.ID) != "corriendo" {
		writeErr(w, 409, "sin_aula", "primero inicia tu aula")
		return
	}
	if _, err := s.Aula.Exec(r.Context(), aula.Nombre(p.ID), cmd); err != nil {
		internal(w, err)
		return
	}
	tocarAula(p.ID)
	writeJSON(w, 200, map[string]any{"asistente": s.estadoAsistente(r.Context(), p.ID)})
}

// aulaApagar: POST /api/v1/aula/apagar. Detiene el contenedor; /trabajo se conserva.
func (s *Server) aulaApagar(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.aulaListo(w) {
		return
	}
	if err := s.Aula.Parar(r.Context(), aula.Nombre(p.ID)); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"estado": "parado"})
}
