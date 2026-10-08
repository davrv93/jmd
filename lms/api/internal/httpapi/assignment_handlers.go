package httpapi

import (
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

var shaRe = regexp.MustCompile(`^[0-9a-f]{7,40}$`)

func subView(sub *store.Submission) map[string]any {
	var graded any
	if sub.GradedAt != nil {
		graded = sub.GradedAt.UTC().Format(time.RFC3339)
	}
	return map[string]any{
		"id": sub.ID, "assignment_id": sub.AssignmentID, "user_id": sub.UserID, "status": sub.Status,
		"repo_url": sub.RepoURL, "commit_sha": sub.CommitSHA, "notes": sub.Notes,
		"score": sub.Score, "max_score": sub.MaxScore, "feedback_md": sub.FeedbackMD, "checks": []any{},
		"created_at": sub.CreatedAt.UTC().Format(time.RFC3339), "graded_at": graded,
	}
}

func assignmentStatus(a *content.Assignment, latest *store.Submission) string {
	if latest != nil {
		return latest.Status // queued · running · graded · failed
	}
	if a.DueAt != nil && time.Now().After(*a.DueAt) {
		return "overdue"
	}
	return "pending"
}

// assignmentList construye [{id, title, due_at, status}] para un curso visible.
func (s *Server) assignmentList(r *http.Request, p *Principal, courseID string) ([]map[string]any, error) {
	latest, err := s.DB.LatestSubmissions(r.Context(), p.ID)
	if err != nil {
		return nil, err
	}
	out := []map[string]any{}
	for _, a := range s.Content.Get().Assignments(courseID) {
		if l := s.Content.Get().Lesson(a.LessonID); l != nil && !l.Published && !p.Staff() {
			continue
		}
		item := map[string]any{"id": a.ID, "title": a.Title, "due_at": a.DueAt, "lesson_id": a.LessonID,
			"course_id": a.CourseID, "max_score": a.MaxPoints(), "status": assignmentStatus(a, latest[a.ID])}
		if sub := latest[a.ID]; sub != nil {
			item["submission_id"], item["score"] = sub.ID, sub.Score
		}
		out = append(out, item)
	}
	return out, nil
}

// assignments: contrato GET /api/v1/assignments?course={id}.
func (s *Server) assignments(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	q := r.URL.Query().Get("course")
	out := []map[string]any{}
	for _, c := range cat.Courses() {
		if !s.canSeeCourse(p, c) || (q != "" && c.ID != q && c.Slug != q) {
			continue
		}
		items, err := s.assignmentList(r, p, c.ID)
		if err != nil {
			internal(w, err)
			return
		}
		out = append(out, items...)
	}
	writeJSON(w, 200, out)
}

func (s *Server) visibleAssignment(p *Principal, id string) *content.Assignment {
	cat := s.Content.Get()
	a := cat.Assignment(id)
	if a == nil {
		return nil
	}
	c := cat.Course(a.CourseID)
	if c == nil || !s.canSeeCourse(p, c) {
		return nil
	}
	if l := cat.Lesson(a.LessonID); l != nil && !l.Published && !p.Staff() {
		return nil
	}
	return a
}

// assignment: contrato GET /api/v1/assignments/{id}.
func (s *Server) assignment(w http.ResponseWriter, r *http.Request, p *Principal) {
	a := s.visibleAssignment(p, r.PathValue("id"))
	if a == nil {
		notFound(w, "la tarea")
		return
	}
	mine, err := s.DB.Submissions(r.Context(), a.ID, p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	subs := make([]map[string]any, 0, len(mine))
	for _, sub := range mine {
		subs = append(subs, subView(sub))
	}
	var latest *store.Submission
	if len(mine) > 0 {
		latest = mine[0]
	}
	var lessonTitle string
	if l := s.Content.Get().Lesson(a.LessonID); l != nil {
		lessonTitle = l.Title
	}
	writeJSON(w, 200, map[string]any{
		"id": a.ID, "title": a.Title, "description_md": a.DescriptionMD, "description_html": a.DescriptionHTML,
		"due_at": a.DueAt, "rubric": a.Rubric, "autograde": a.Autograde, "max_score": a.MaxPoints(),
		"objective_ids": a.ObjectiveIDs, "lesson_id": a.LessonID, "lesson_title": lessonTitle, "course_id": a.CourseID,
		"status": assignmentStatus(a, latest), "my_submissions": subs, "submit_command": "jmd submit " + a.ID,
	})
}

type submissionReq struct {
	RepoURL   string `json:"repo_url"`
	CommitSHA string `json:"commit_sha"`
	Notes     string `json:"notes"`
}

// createSubmission: contrato POST /api/v1/assignments/{id}/submissions → 201 {id, status: "queued"}.
func (s *Server) createSubmission(w http.ResponseWriter, r *http.Request, p *Principal) {
	a := s.visibleAssignment(p, r.PathValue("id"))
	if a == nil {
		notFound(w, "la tarea")
		return
	}
	var in submissionReq
	if !readJSON(w, r, &in) {
		return
	}
	in.RepoURL, in.CommitSHA = strings.TrimSpace(in.RepoURL), strings.ToLower(strings.TrimSpace(in.CommitSHA))
	u, err := url.Parse(in.RepoURL)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" {
		badRequest(w, "repo_url debe ser una URL https del repositorio")
		return
	}
	if !shaRe.MatchString(in.CommitSHA) {
		badRequest(w, "commit_sha debe ser un SHA de git (7 a 40 caracteres hexadecimales)")
		return
	}
	if len(in.Notes) > 4000 {
		badRequest(w, "notes: máximo 4000 caracteres")
		return
	}
	sub := &store.Submission{AssignmentID: a.ID, UserID: p.ID, RepoURL: in.RepoURL, CommitSHA: in.CommitSHA, Notes: in.Notes, MaxScore: a.MaxPoints()}
	if err := s.DB.CreateSubmission(r.Context(), sub); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 201, map[string]any{"id": sub.ID, "status": sub.Status})
}

// submission: contrato GET /api/v1/submissions/{id}; la ve su autor o el personal.
func (s *Server) submission(w http.ResponseWriter, r *http.Request, p *Principal) {
	sub, err := s.DB.Submission(r.Context(), r.PathValue("id"))
	if errors.Is(err, store.ErrNotFound) || (err == nil && sub.UserID != p.ID && !p.Staff()) {
		notFound(w, "la entrega")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, subView(sub))
}

// listSubmissions: el personal ve todas las de la tarea (con el alumno); el alumno, las suyas.
func (s *Server) listSubmissions(w http.ResponseWriter, r *http.Request, p *Principal) {
	a := s.visibleAssignment(p, r.PathValue("id"))
	if a == nil {
		notFound(w, "la tarea")
		return
	}
	userID := p.ID
	if p.Staff() {
		userID = ""
	}
	subs, err := s.DB.Submissions(r.Context(), a.ID, userID)
	if err != nil {
		internal(w, err)
		return
	}
	names := map[string]string{}
	if p.Staff() {
		users, err := s.DB.Users(r.Context())
		if err != nil {
			internal(w, err)
			return
		}
		for _, u := range users {
			names[u.ID] = u.Name + " <" + u.Email + ">"
		}
	}
	out := make([]map[string]any, 0, len(subs))
	for _, sub := range subs {
		v := subView(sub)
		if n, ok := names[sub.UserID]; ok {
			v["user"] = n
		}
		out = append(out, v)
	}
	writeJSON(w, 200, out)
}

// gradeSubmission (personal): nota manual con comentarios.
func (s *Server) gradeSubmission(w http.ResponseWriter, r *http.Request, p *Principal) {
	sub, err := s.DB.Submission(r.Context(), r.PathValue("id"))
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "la entrega")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	var in struct {
		Score      float64 `json:"score"`
		FeedbackMD string  `json:"feedback_md"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.Score < 0 || (sub.MaxScore > 0 && in.Score > sub.MaxScore) {
		badRequest(w, "score fuera de rango")
		return
	}
	if err := s.DB.GradeSubmission(r.Context(), sub.ID, in.Score, in.FeedbackMD); err != nil {
		internal(w, err)
		return
	}
	sub, _ = s.DB.Submission(r.Context(), sub.ID)
	writeJSON(w, 200, subView(sub))
}

// grades: contrato GET /api/v1/grades?course={id} → [{assignment_id, title, score, max_score, graded_at}].
func (s *Server) grades(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	q := r.URL.Query().Get("course")
	latest, err := s.DB.LatestSubmissions(r.Context(), p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	out := []map[string]any{}
	for _, c := range cat.Courses() {
		if !s.canSeeCourse(p, c) || (q != "" && c.ID != q && c.Slug != q) {
			continue
		}
		for _, a := range cat.Assignments(c.ID) {
			sub := latest[a.ID]
			if sub == nil {
				continue
			}
			var graded any
			if sub.GradedAt != nil {
				graded = sub.GradedAt.UTC().Format(time.RFC3339)
			}
			out = append(out, map[string]any{
				"assignment_id": a.ID, "title": a.Title, "course_id": c.ID, "status": sub.Status,
				"score": sub.Score, "max_score": sub.MaxScore, "graded_at": graded, "feedback_md": sub.FeedbackMD,
				"submission_id": sub.ID,
			})
		}
	}
	writeJSON(w, 200, out)
}
