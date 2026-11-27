package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Laboratorio de ideas (curso «Design Thinking con Claude», 11-2026). La escena del LIVE guarda la idea
// entera del alumno —reto, entrevista, tablero de la lluvia de ideas, MVP, prueba— como un JSON, para que
// siga de una sesión a otra y de un equipo a otro, y para que el instructor la vea. El JSON es de la escena:
// aquí solo se valida que sea un objeto y su tamaño; el resumen del grupo lee unos pocos campos conocidos.
//
//	GET  /api/v1/laboratorio/{curso}               el mío ({"datos": {…}|null, "actualizado_en"}); el personal
//	                                                puede pedir el de un alumno con ?alumno=<id>
//	PUT  /api/v1/laboratorio/{curso} {"datos":{…}}  guardar el mío (reemplaza; hasta 256 KB)
//	GET  /api/v1/laboratorio/{curso}/grupo          (personal) resumen de cada alumno: idea, pregunta, ideas…

const laboratorioMax = 256 << 10

func (s *Server) cursoDeLaboratorio(w http.ResponseWriter, r *http.Request, p *Principal) string {
	c := s.Content.Get().Course(r.PathValue("curso"))
	if c == nil || !s.canSeeCourse(p, c) {
		notFound(w, "el curso")
		return ""
	}
	return c.ID
}

// laboratorioGet: GET /api/v1/laboratorio/{curso}[?alumno=<id>].
func (s *Server) laboratorioGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	curso := s.cursoDeLaboratorio(w, r, p)
	if curso == "" {
		return
	}
	quien := p.ID
	if a := strings.TrimSpace(r.URL.Query().Get("alumno")); a != "" && a != p.ID {
		if !p.Staff() {
			writeErr(w, 403, "forbidden", "solo el personal puede ver el laboratorio de otro alumno")
			return
		}
		quien = a
	}
	w.Header().Set("Cache-Control", "no-store")
	l, err := s.DB.LeerLaboratorio(r.Context(), quien, curso)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, 200, map[string]any{"datos": nil, "actualizado_en": nil})
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"datos": json.RawMessage(l.Datos), "actualizado_en": l.ActualizadoEn.Format(time.RFC3339)})
}

// laboratorioPut: PUT /api/v1/laboratorio/{curso} {"datos": {…}}.
func (s *Server) laboratorioPut(w http.ResponseWriter, r *http.Request, p *Principal) {
	curso := s.cursoDeLaboratorio(w, r, p)
	if curso == "" {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, laboratorioMax+1024)
	var in struct {
		Datos json.RawMessage `json:"datos"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, 400, "cuerpo_invalido", "no se pudo leer el laboratorio (¿más de 256 KB?)")
		return
	}
	var obj map[string]any
	if len(in.Datos) == 0 || json.Unmarshal(in.Datos, &obj) != nil || obj == nil {
		writeErr(w, 422, "datos_invalidos", "el laboratorio debe ser un objeto JSON")
		return
	}
	if len(in.Datos) > laboratorioMax {
		writeErr(w, 413, "muy_grande", "el laboratorio supera 256 KB")
		return
	}
	t, err := s.DB.GuardarLaboratorio(r.Context(), p.ID, curso, string(in.Datos))
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "actualizado_en": t.Format(time.RFC3339)})
}

// laboratorioGrupo: GET /api/v1/laboratorio/{curso}/grupo (personal). Lo justo para que el instructor
// siga las ideas del grupo sin abrir cada laboratorio: el nombre de la idea, la pregunta, cuántas ideas
// hay en el tablero, la idea elegida, el MVP y el pitch.
func (s *Server) laboratorioGrupo(w http.ResponseWriter, r *http.Request, p *Principal) {
	curso := s.cursoDeLaboratorio(w, r, p)
	if curso == "" {
		return
	}
	ls, err := s.DB.LaboratoriosCurso(r.Context(), curso)
	if err != nil {
		internal(w, err)
		return
	}
	texto := func(m map[string]any, k string, n int) string {
		v, _ := m[k].(string)
		v = strings.TrimSpace(v)
		if r := []rune(v); len(r) > n {
			v = string(r[:n]) + "…"
		}
		return v
	}
	out := make([]map[string]any, 0, len(ls))
	for _, l := range ls {
		var m map[string]any
		_ = json.Unmarshal([]byte(l.Datos), &m)
		ideas := 0
		if t, ok := m["tablero"].([]any); ok {
			ideas = len(t)
		}
		out = append(out, map[string]any{
			"alumno": l.UserID, "nombre": l.Nombre, "actualizado_en": l.ActualizadoEn.Format(time.RFC3339),
			"titulo": texto(m, "titulo", 80), "reto": texto(m, "reto", 200), "hmw": texto(m, "hmw", 200),
			"ideas": ideas, "idea": texto(m, "idea", 200), "mvp": texto(m, "mvp", 300), "pitch": texto(m, "pitch", 200),
		})
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"laboratorios": out})
}
