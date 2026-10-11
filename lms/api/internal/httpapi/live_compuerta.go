package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// alumnoLive es un alumno presente en la clase, reducido a lo que la compuerta necesita.
type alumnoLive struct {
	Sub    string
	Nombre string
}

// cumplioLive es un alumno que ya cumplió la escena y por qué vía.
type cumplioLive struct {
	Sub    string `json:"sub"`
	Nombre string `json:"nombre"`
	Motivo string `json:"motivo"` // lo_logre | evidencia
}

// faltaLive es un alumno que todavía no cumple; el semáforo (T-1.13) rellena los dos últimos campos.
type faltaLive struct {
	Sub          string `json:"sub"`
	Nombre       string `json:"nombre"`
	UltimoEvento string `json:"ultimo_evento"`
	HaceS        int    `json:"hace_s"`
}

type compuertaLive struct {
	Escena     string        `json:"escena"`
	UmbralPct  int           `json:"umbral_pct"`
	Pct        int           `json:"pct"`
	Pasa       bool          `json:"pasa"`
	Cumplieron []cumplioLive `json:"cumplieron"`
	Faltan     []faltaLive   `json:"faltan"`
}

// calcularCompuerta reparte a los presentes entre quienes cumplieron (motivos[sub] != "") y quienes
// faltan. El porcentaje se redondea hacia abajo (7 de 9 es 77, no 78): "pasa" no se regala. Sin
// presentes nunca pasa.
func calcularCompuerta(presentes []alumnoLive, motivos map[string]string, umbralPct int) compuertaLive {
	c := compuertaLive{UmbralPct: umbralPct, Cumplieron: []cumplioLive{}, Faltan: []faltaLive{}}
	for _, a := range presentes {
		if m := motivos[a.Sub]; m != "" {
			c.Cumplieron = append(c.Cumplieron, cumplioLive{Sub: a.Sub, Nombre: a.Nombre, Motivo: m})
		} else {
			c.Faltan = append(c.Faltan, faltaLive{Sub: a.Sub, Nombre: a.Nombre})
		}
	}
	if n := len(presentes); n > 0 {
		c.Pct = len(c.Cumplieron) * 100 / n
		c.Pasa = c.Pct >= umbralPct
	}
	return c
}

// liveCompuerta: GET /api/v1/live/{lesson}/compuerta (staff). Quién cumplió la escena actual y quién falta.
func (s *Server) liveCompuerta(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	if err == store.ErrNotFound {
		sv = &store.LiveSession{LessonID: l.ID}
	} else if err != nil {
		internal(w, err)
		return
	}
	esc := s.Content.Get().Escena(l.ID, sv.Escena)

	ahora := time.Now().UTC()
	vivos := s.presencia.vivos(l.ID, ahora)
	presentes := make([]alumnoLive, len(vivos))
	subs := make([]string, len(vivos))
	for i, v := range vivos {
		presentes[i] = alumnoLive{Sub: v.Sub, Nombre: v.Nombre}
		subs[i] = v.Sub
	}
	umbral := 80
	if esc != nil {
		umbral = esc.UmbralPct
	}
	motivos := s.motivosCumplidos(r.Context(), l.ID, subs)
	c := calcularCompuerta(presentes, motivos, umbral)
	c.Escena = sv.Escena
	for i, f := range c.Faltan {
		for _, v := range vivos {
			if v.Sub != f.Sub {
				continue
			}
			ref := v.UltimoT
			if v.UltimoEvento != "" && !ref.IsZero() {
				c.Faltan[i].UltimoEvento, c.Faltan[i].HaceS = v.UltimoEvento, int(ahora.Sub(ref).Seconds())
			}
		}
	}
	if esc != nil && esc.Compuerta == "ninguna" {
		c.Pasa = true // sin compuerta: siempre se puede avanzar, aunque no haya nadie
	}
	writeJSON(w, 200, c)
}

// livePasarIgual: POST /api/v1/live/{lesson}/pasar-igual (staff) {"escena"}. Deja constancia de que el
// instructor avanzó sin que se cumpliera el umbral. No cambia la escena: eso lo hace PUT /escena.
func (s *Server) livePasarIgual(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena string `json:"escena"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if s.Content.Get().Escena(l.ID, in.Escena) == nil {
		notFound(w, "la escena")
		return
	}
	if err := s.DB.SetSetting(r.Context(), "live.pasar_igual."+l.ID+"."+in.Escena, time.Now().UTC().Format(time.RFC3339)); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

// motivosCumplidos dice, para cada sub, por qué vía cumplió la escena actual de la lección
// ("lo_logre", "evidencia") o "" si todavía no. Sin compuerta o con «presentes», estar basta.
func (s *Server) motivosCumplidos(ctx context.Context, lesson string, subs []string) map[string]string {
	out := map[string]string{}
	sv, err := s.DB.LiveSession(ctx, lesson)
	if err != nil {
		return out
	}
	esc := s.Content.Get().Escena(lesson, sv.Escena)
	for _, sub := range subs {
		if esc != nil && (esc.Compuerta == "ninguna" || esc.Compuerta == "presentes") {
			out[sub] = "evidencia"
			continue
		}
		tipos, err := s.DB.EvidenciaTipos(ctx, sub, lesson, sv.Escena)
		if err != nil || len(tipos) == 0 {
			continue
		}
		out[sub] = "evidencia"
		for _, t := range tipos {
			if t == "logre" {
				out[sub] = "lo_logre"
			}
		}
	}
	return out
}
