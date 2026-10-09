package httpapi

import (
	"net/http"

	"github.com/davrv93/jmd/lms/api/internal/content"
)

// exampleVisible: los ejemplos en borrador, o de una sesión en borrador, solo los ve el personal.
func (s *Server) exampleVisible(p *Principal, e *content.Example) bool {
	if p.Staff() {
		return true
	}
	if !e.Published {
		return false
	}
	if l := s.Content.Get().Lesson(e.LessonID); l != nil && !l.Published {
		return false
	}
	return true
}

// visibleExamples son los ejemplos del curso que ve p, en su orden.
func (s *Server) visibleExamples(p *Principal, courseID string) []*content.Example {
	out := []*content.Example{}
	for _, e := range s.Content.Get().Examples(courseID) {
		if s.exampleVisible(p, e) {
			out = append(out, e)
		}
	}
	return out
}

// exampleView: {id, title, summary, tags, level, lesson_id, lesson_title, repo, published}.
func (s *Server) exampleView(e *content.Example) map[string]any {
	var lessonTitle string
	if l := s.Content.Get().Lesson(e.LessonID); l != nil {
		lessonTitle = l.Title
	}
	return map[string]any{
		"id": e.ID, "title": e.Title, "summary": e.Summary, "tags": e.Tags, "level": e.Level,
		"lesson_id": e.LessonID, "lesson_title": lessonTitle, "repo": e.Repo, "published": e.Published,
	}
}

// courseExamples: GET /api/v1/courses/{id}/examples → ejemplos visibles, en orden.
func (s *Server) courseExamples(w http.ResponseWriter, r *http.Request, p *Principal) {
	c := s.Content.Get().Course(r.PathValue("id"))
	if c == nil || !s.canSeeCourse(p, c) {
		notFound(w, "el curso")
		return
	}
	out := []map[string]any{}
	for _, e := range s.visibleExamples(p, c.ID) {
		out = append(out, s.exampleView(e))
	}
	writeJSON(w, 200, out)
}

// example: GET /api/v1/examples/{id} → la vista de lista más el HTML, el curso y prev/next.
func (s *Server) example(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	e := cat.Example(r.PathValue("id"))
	if e == nil {
		notFound(w, "el ejemplo")
		return
	}
	c := cat.Course(e.CourseID)
	if c == nil || !s.canSeeCourse(p, c) || !s.exampleVisible(p, e) {
		notFound(w, "el ejemplo")
		return
	}
	var prev, next string
	list := s.visibleExamples(p, c.ID)
	for i, x := range list {
		if x.ID == e.ID {
			if i > 0 {
				prev = list[i-1].ID
			}
			if i+1 < len(list) {
				next = list[i+1].ID
			}
		}
	}
	out := s.exampleView(e)
	out["content_html"] = e.BodyHTML
	out["course"] = map[string]any{"id": c.ID, "slug": c.Slug, "title": c.Title}
	out["prev"], out["next"] = prev, next
	writeJSON(w, 200, out)
}
