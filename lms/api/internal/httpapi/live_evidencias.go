package httpapi

import (
	"context"
	"net/http"
)

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

// liveLogre: POST /api/v1/live/{lesson}/logre {"escena","hecho":true|false}. «Lo logré» del alumno: deja
// la evidencia «logre» de la escena, marca el paso del ciclo (para la insignia) y avisa al instructor.
// hecho=false deshace (la UI lo ofrece durante 10 s).
func (s *Server) liveLogre(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena string `json:"escena"`
		Hecho  bool   `json:"hecho"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	cat := s.Content.Get()
	esc := cat.Escena(l.ID, in.Escena)
	if esc == nil {
		notFound(w, "la escena")
		return
	}
	if p.Staff() {
		writeJSON(w, 200, map[string]any{"ok": true}) // el instructor no cuenta como alumno
		return
	}
	ctx := r.Context()
	if in.Hecho {
		if err := s.DB.PonerEvidencia(ctx, p.ID, l.ID, in.Escena, "logre", ""); err != nil {
			internal(w, err)
			return
		}
		if esc.Paso != "" {
			_ = s.DB.SetProgress(ctx, p.ID, l.ID, esc.Paso, true)
		}
	} else {
		if err := s.DB.QuitarEvidencia(ctx, p.ID, l.ID, in.Escena, "logre"); err != nil {
			internal(w, err)
			return
		}
		// El paso solo se desmarca si ninguna otra escena con ese paso sigue con «Lo logré».
		if esc.Paso != "" {
			otra := false
			hechas, _ := s.DB.EscenasConEvidencia(ctx, p.ID, l.ID, "logre")
			for _, id := range hechas {
				if e := cat.Escena(l.ID, id); e != nil && e.Paso == esc.Paso {
					otra = true
				}
			}
			if !otra {
				_ = s.DB.SetProgress(ctx, p.ID, l.ID, esc.Paso, false)
			}
		}
	}
	s.live.publishStaff(l.ID, "logre", map[string]any{"sub": p.ID, "nombre": p.Name, "escena": in.Escena, "hecho": in.Hecho})
	writeJSON(w, 200, map[string]any{"ok": true, "puntos": s.puntosLogre(ctx, p.ID), "suma": puntosPorLogre})
}

// puntosPorLogre es lo que vale cada «Lo logré»; el puntaje acumulado del alumno es la suma de todas sus sesiones.
const puntosPorLogre = 100

func (s *Server) puntosLogre(ctx context.Context, userID string) int {
	n, _ := s.DB.ContarEvidencias(ctx, userID, "logre")
	return n * puntosPorLogre
}

// liveLogres: GET /api/v1/live/{lesson}/logre → {"escenas":[...]} donde el alumno ya pulsó «Lo logré».
func (s *Server) liveLogres(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	hechas, err := s.DB.EscenasConEvidencia(r.Context(), p.ID, l.ID, "logre")
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"escenas": hechas, "puntos": s.puntosLogre(r.Context(), p.ID), "suma": puntosPorLogre})
}
