package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Opiniones de las clases (11-2026). Después de cada sesión, el alumno deja de 1 a 5 estrellas y un
// texto corto (opcional, hasta 400 caracteres); una por sesión, y volver a enviarla la edita. Los
// demás (alumnos y personal con acceso al curso) le dan «me gusta», uno por persona y nunca a la
// propia. El personal puede ocultar una opinión: deja de verse para los alumnos y no cuenta en el
// promedio. El texto es texto plano: el front nunca lo pinta como HTML.
//
//	GET  /api/v1/courses/{id}/opiniones   resumen y lista del curso (canSeeCourse)
//	GET  /api/v1/lessons/{id}/opinion     la mía de esa sesión y si puedo opinar (sesión visible)
//	PUT  /api/v1/lessons/{id}/opinion     crear o editar la mía (alumno, sesión visible y ya empezada)
//	POST /api/v1/opiniones/{id}/like      poner o quitar mi «me gusta» (acceso al curso; no la propia)
//	PUT  /api/v1/opiniones/{id}/oculta    ocultar o mostrar (personal con acceso al curso)

const opinionMax = 400 // caracteres del texto

// primerNombre: solo el primer nombre del autor; sin nombre, nada que lo identifique.
func primerNombre(nombre string) string {
	if f := strings.Fields(nombre); len(f) > 0 {
		return f[0]
	}
	return "Alguien del curso"
}

// limpiarTexto: sin caracteres de control y con los espacios (saltos de línea incluidos) juntados en uno.
func limpiarTexto(s string) string {
	s = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || r == '​' || r == ' ' || r == ' ' {
			return ' '
		}
		return r
	}, s)
	return strings.Join(strings.Fields(s), " ")
}

// vistaOpinion es lo que ve quien pregunta: primer nombre del autor, nunca su id ni su correo.
func (s *Server) vistaOpinion(o *store.Opinion, p *Principal, cat *content.Catalog) map[string]any {
	v := map[string]any{
		"id": o.ID, "nombre": primerNombre(o.Nombre), "estrellas": o.Estrellas, "texto": o.Texto,
		"likes": o.Likes, "me_gusta": o.MeGusta, "mia": o.UserID == p.ID,
		"lesson_id": o.LessonID, "fecha": o.ActualizadaEn.UTC().Format(time.RFC3339),
	}
	if l := cat.Lesson(o.LessonID); l != nil {
		v["lesson_title"] = l.Title
	}
	if p.Staff() {
		v["oculta"] = o.Oculta
	}
	return v
}

// claseEmpezada: se opina de una clase que ya empezó (por su hora o porque el LIVE ya arrancó).
func (s *Server) claseEmpezada(r *http.Request, l *content.Lesson) bool {
	if l.StartsAt == nil || !time.Now().Before(l.StartsAt.Add(-15*time.Minute)) {
		return true
	}
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	return err == nil && sv.IniciadaEn != nil
}

// motivoNoOpina: por qué esta persona no puede opinar de la sesión ("" = sí puede).
func (s *Server) motivoNoOpina(r *http.Request, p *Principal, l *content.Lesson) string {
	switch {
	case p.Staff():
		return "El personal no opina sobre las clases; puede moderar las opiniones desde el curso."
	case !s.claseEmpezada(r, l):
		return "Podrás opinar cuando empiece la clase."
	}
	return ""
}

// opinionesCurso: GET /api/v1/courses/{id}/opiniones → {promedio, total, opiniones:[…]} (las más
// gustadas primero; a igual número, las más recientes). El personal ve también las ocultas, marcadas;
// el promedio y el total cuentan solo las visibles.
func (s *Server) opinionesCurso(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	c := cat.Course(r.PathValue("id"))
	if c == nil || !s.canSeeCourse(p, c) {
		notFound(w, "el curso")
		return
	}
	ops, err := s.DB.OpinionesCurso(r.Context(), c.ID, p.ID, p.Staff())
	if err != nil {
		internal(w, err)
		return
	}
	lista := make([]map[string]any, 0, len(ops))
	total, suma := 0, 0
	for _, o := range ops {
		if !o.Oculta {
			total++
			suma += o.Estrellas
		}
		lista = append(lista, s.vistaOpinion(o, p, cat))
	}
	promedio := 0.0
	if total > 0 {
		promedio = float64(int(float64(suma)/float64(total)*10+0.5)) / 10 // un decimal
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"promedio": promedio, "total": total, "opiniones": lista})
}

// miOpinion: GET /api/v1/lessons/{id}/opinion → {opinion: {…}|null, puede: bool, motivo: "…"}.
func (s *Server) miOpinion(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.Content.Get().Lesson(r.PathValue("id"))
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la sesión")
		return
	}
	var vista any
	o, err := s.DB.OpinionDe(r.Context(), p.ID, l.ID)
	switch {
	case err == nil:
		vista = s.vistaOpinion(o, p, s.Content.Get())
	case !errors.Is(err, store.ErrNotFound):
		internal(w, err)
		return
	}
	motivo := s.motivoNoOpina(r, p, l)
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"opinion": vista, "puede": motivo == "", "motivo": motivo})
}

// guardarOpinion: PUT /api/v1/lessons/{id}/opinion {"estrellas":1-5,"texto":"…"} → la opinión guardada.
func (s *Server) guardarOpinion(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.Content.Get().Lesson(r.PathValue("id"))
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la sesión")
		return
	}
	var in struct {
		Estrellas int    `json:"estrellas"`
		Texto     string `json:"texto"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if m := s.motivoNoOpina(r, p, l); m != "" {
		writeErr(w, 403, "no_puede_opinar", m)
		return
	}
	in.Texto = limpiarTexto(in.Texto)
	switch {
	case in.Estrellas < 1 || in.Estrellas > 5:
		badRequest(w, "Elige de 1 a 5 estrellas.")
		return
	case len([]rune(in.Texto)) > opinionMax:
		badRequest(w, "Tu opinión pasa de 400 caracteres; acórtala un poco.")
		return
	case tieneLisuras(in.Texto):
		writeErr(w, 422, "lisuras", "Tu opinión tiene palabras que no van aquí. Escríbela de otra forma.")
		return
	}
	if !s.opinionLimite.allow("op:" + p.ID) {
		writeErr(w, 429, "rate_limited", "Guardaste muchas veces seguidas; espera un minuto.")
		return
	}
	o, err := s.DB.GuardarOpinion(r.Context(), p.ID, l.CourseID, l.ID, in.Estrellas, in.Texto)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, s.vistaOpinion(o, p, s.Content.Get()))
}

// opinionVisible busca la opinión y comprueba que quien llama puede verla: acceso a su curso y, si
// está oculta, ser del personal. Responde 404 si no.
func (s *Server) opinionVisible(w http.ResponseWriter, r *http.Request, p *Principal) *store.Opinion {
	o, err := s.DB.Opinion(r.Context(), r.PathValue("id"), p.ID)
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "la opinión")
		return nil
	}
	if err != nil {
		internal(w, err)
		return nil
	}
	c := s.Content.Get().Course(o.CourseID)
	if c == nil || !s.canSeeCourse(p, c) || (o.Oculta && !p.Staff()) {
		notFound(w, "la opinión")
		return nil
	}
	return o
}

// opinionLike: POST /api/v1/opiniones/{id}/like → {id, likes, me_gusta}. Pone o quita el «me gusta».
func (s *Server) opinionLike(w http.ResponseWriter, r *http.Request, p *Principal) {
	o := s.opinionVisible(w, r, p)
	if o == nil {
		return
	}
	if o.UserID == p.ID {
		writeErr(w, 403, "propia", "No puedes darle «me gusta» a tu propia opinión.")
		return
	}
	if !s.likeLimite.allow("op:" + p.ID) {
		writeErr(w, 429, "rate_limited", "Demasiados «me gusta» seguidos; espera un momento.")
		return
	}
	likes, meGusta, err := s.DB.AlternarMeGusta(r.Context(), o.ID, p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"id": o.ID, "likes": likes, "me_gusta": meGusta})
}

// opinionOcultar: PUT /api/v1/opiniones/{id}/oculta {"oculta":true|false} (personal) → {id, oculta}.
func (s *Server) opinionOcultar(w http.ResponseWriter, r *http.Request, p *Principal) {
	o := s.opinionVisible(w, r, p)
	if o == nil {
		return
	}
	var in struct {
		Oculta bool `json:"oculta"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if err := s.DB.OcultarOpinion(r.Context(), o.ID, in.Oculta, p.ID); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"id": o.ID, "oculta": in.Oculta})
}
