package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

func questionView(q *store.Question) map[string]any {
	answers := make([]map[string]any, 0, len(q.Answers))
	for _, a := range q.Answers {
		answers = append(answers, map[string]any{
			"id": a.ID, "user_id": a.UserID, "user_name": a.UserName, "body_md": a.BodyMD,
			"created_at": a.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	var codeRef any
	if q.CodePath != "" {
		codeRef = map[string]any{"path": q.CodePath, "line": q.CodeLine}
	}
	return map[string]any{
		"id": q.ID, "lesson_id": q.LessonID, "objective_id": q.ObjectiveID, "user_id": q.UserID, "user_name": q.UserName,
		"body_md": q.BodyMD, "code_ref": codeRef, "video_ts": q.VideoTS, "resolved": q.Resolved,
		"created_at": q.CreatedAt.UTC().Format(time.RFC3339), "answers": answers,
	}
}

type questionReq struct {
	BodyMD      string `json:"body_md"`
	ObjectiveID string `json:"objective_id"`
	CodeRef     *struct {
		Path string `json:"path"`
		Line int    `json:"line"`
	} `json:"code_ref"`
	VideoTS int `json:"video_ts"`
}

// createQuestion: contrato POST /api/v1/lessons/{id}/questions → 201 {id, url}.
func (s *Server) createQuestion(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.Content.Get().Lesson(r.PathValue("id"))
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la sesión")
		return
	}
	var in questionReq
	if !readJSON(w, r, &in) {
		return
	}
	in.BodyMD = strings.TrimSpace(in.BodyMD)
	if in.BodyMD == "" || len(in.BodyMD) > 20000 {
		badRequest(w, "body_md: entre 1 y 20000 caracteres")
		return
	}
	if in.ObjectiveID != "" {
		ok := false
		for _, o := range l.Objectives {
			if o.ID == in.ObjectiveID {
				ok = true
			}
		}
		if !ok {
			badRequest(w, "objective_id no pertenece a la sesión")
			return
		}
	}
	q := &store.Question{LessonID: l.ID, ObjectiveID: in.ObjectiveID, UserID: p.ID, BodyMD: in.BodyMD, VideoTS: in.VideoTS}
	if in.CodeRef != nil {
		q.CodePath, q.CodeLine = in.CodeRef.Path, in.CodeRef.Line
	}
	if err := s.DB.CreateQuestion(r.Context(), q); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"id": q.ID, "url": s.PublicURL + "/lessons/" + l.ID + "/#q-" + q.ID})
}

// questions: hilos de la sesión con sus respuestas.
func (s *Server) questions(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.Content.Get().Lesson(r.PathValue("id"))
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la sesión")
		return
	}
	qs, err := s.DB.Questions(r.Context(), l.ID)
	if err != nil {
		internal(w, err)
		return
	}
	out := make([]map[string]any, 0, len(qs))
	for _, q := range qs {
		out = append(out, questionView(q))
	}
	writeJSON(w, 200, out)
}

func (s *Server) loadQuestion(w http.ResponseWriter, r *http.Request, p *Principal) *store.Question {
	q, err := s.DB.Question(r.Context(), r.PathValue("id"))
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "la pregunta")
		return nil
	}
	if err != nil {
		internal(w, err)
		return nil
	}
	l := s.Content.Get().Lesson(q.LessonID)
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la pregunta")
		return nil
	}
	return q
}

// createAnswer: cualquiera del curso puede responder.
func (s *Server) createAnswer(w http.ResponseWriter, r *http.Request, p *Principal) {
	q := s.loadQuestion(w, r, p)
	if q == nil {
		return
	}
	var in struct {
		BodyMD string `json:"body_md"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.BodyMD = strings.TrimSpace(in.BodyMD)
	if in.BodyMD == "" || len(in.BodyMD) > 20000 {
		badRequest(w, "body_md: entre 1 y 20000 caracteres")
		return
	}
	a := &store.Answer{QuestionID: q.ID, UserID: p.ID, BodyMD: in.BodyMD}
	if err := s.DB.CreateAnswer(r.Context(), a); err != nil {
		internal(w, err)
		return
	}
	q, _ = s.DB.Question(r.Context(), q.ID)
	writeJSON(w, 201, questionView(q))
}

// resolveQuestion: la marca el autor o el personal.
func (s *Server) resolveQuestion(w http.ResponseWriter, r *http.Request, p *Principal) {
	q := s.loadQuestion(w, r, p)
	if q == nil {
		return
	}
	if q.UserID != p.ID && !p.Staff() {
		forbidden(w)
		return
	}
	var in struct {
		Resolved bool `json:"resolved"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if err := s.DB.ResolveQuestion(r.Context(), q.ID, in.Resolved); err != nil {
		internal(w, err)
		return
	}
	q, _ = s.DB.Question(r.Context(), q.ID)
	writeJSON(w, 200, questionView(q))
}
