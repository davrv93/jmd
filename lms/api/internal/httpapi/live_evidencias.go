package httpapi

import "net/http"

// tiposEvidencia: lo único que un alumno puede declarar desde su visor o su panel.
var tiposEvidencia = map[string]bool{"microfono": true, "flyer": true, "hallazgo": true, "captura": true}

// liveEvidencia: POST /api/v1/live/{lesson}/evidencia {"escena","tipo","detalle"}. Registra, para el propio
// alumno, que cumplió algo de la escena. La compuerta del instructor lo cuenta junto con «Lo logré».
func (s *Server) liveEvidencia(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena  string `json:"escena"`
		Tipo    string `json:"tipo"`
		Detalle string `json:"detalle"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if !tiposEvidencia[in.Tipo] {
		writeErr(w, 400, "tipo_invalido", "el tipo debe ser microfono, flyer, hallazgo o captura")
		return
	}
	if len(in.Detalle) > 200 {
		in.Detalle = in.Detalle[:200]
	}
	if s.Content.Get().Escena(l.ID, in.Escena) == nil {
		notFound(w, "la escena")
		return
	}
	if p.Staff() {
		writeJSON(w, 200, map[string]any{"ok": true}) // el instructor no cuenta como alumno
		return
	}
	if err := s.DB.PonerEvidencia(r.Context(), p.ID, l.ID, in.Escena, in.Tipo, in.Detalle); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}
