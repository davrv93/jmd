package httpapi

import (
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
)

// canSeeCourse: el personal ve todo; el alumno, los cursos de su cohorte (o sin cohortes).
func (s *Server) canSeeCourse(p *Principal, c *content.Course) bool {
	if p.Staff() || len(c.Cohorts) == 0 {
		return true
	}
	for _, mine := range p.Cohorts {
		for _, want := range c.Cohorts {
			if mine == want {
				return true
			}
		}
	}
	return false
}

// visibleLesson: las sesiones en borrador solo las ve el personal.
func (s *Server) visibleLesson(p *Principal, l *content.Lesson) *content.Course {
	c := s.Content.Get().Course(l.CourseID)
	if c == nil || !s.canSeeCourse(p, c) || (!l.Published && !p.Staff()) {
		return nil
	}
	return c
}

func roleIn(p *Principal) string {
	if p.Staff() {
		return "instructor"
	}
	return "student"
}

// courses: contrato GET /api/v1/courses → [{id, slug, title, role}].
func (s *Server) courses(w http.ResponseWriter, r *http.Request, p *Principal) {
	out := []map[string]any{}
	for _, c := range s.Content.Get().Courses() {
		if !s.canSeeCourse(p, c) {
			continue
		}
		total, published := 0, 0
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				total++
				if l.Published {
					published++
				}
			}
		}
		out = append(out, map[string]any{
			"id": c.ID, "slug": c.Slug, "title": c.Title, "role": roleIn(p), "description": c.Description,
			"cohorts": c.Cohorts, "lessons_total": total, "lessons_published": published,
			"examples_total": len(s.visibleExamples(p, c.ID)),
		})
	}
	writeJSON(w, 200, out)
}

// course: contrato GET /api/v1/courses/{id} → módulos y sesiones, más tareas y progreso.
func (s *Server) course(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	c := cat.Course(r.PathValue("id"))
	if c == nil || !s.canSeeCourse(p, c) {
		notFound(w, "el curso")
		return
	}
	done, err := s.DB.ProgressCount(r.Context(), p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	modules := []map[string]any{}
	for _, m := range c.Modules {
		lessons := []map[string]any{}
		for _, l := range m.Lessons {
			if !l.Published && !p.Staff() {
				continue
			}
			lessons = append(lessons, map[string]any{
				"id": l.ID, "title": l.Title, "starts_at": l.StartsAt, "published": l.Published,
				"objectives": len(l.Objectives), "steps": len(l.Cycle), "steps_done": done[l.ID],
			})
		}
		modules = append(modules, map[string]any{"id": m.ID, "title": m.Title, "lessons": lessons})
	}
	assignments, err := s.assignmentList(r, p, c.ID)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{
		"id": c.ID, "slug": c.Slug, "title": c.Title, "description": c.Description, "role": roleIn(p),
		"modules": modules, "assignments": assignments, "examples_total": len(s.visibleExamples(p, c.ID)),
	})
}

// lesson: contrato GET /api/v1/lessons/{id} con el ciclo, el contenido en HTML y el progreso.
func (s *Server) lesson(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	l := cat.Lesson(r.PathValue("id"))
	if l == nil {
		notFound(w, "la sesión")
		return
	}
	c := s.visibleLesson(p, l)
	if c == nil {
		notFound(w, "la sesión")
		return
	}
	prog, err := s.DB.Progress(r.Context(), p.ID, l.ID)
	if err != nil {
		internal(w, err)
		return
	}
	materials := make([]map[string]any, 0, len(l.Materials))
	for _, m := range l.Materials {
		materials = append(materials, map[string]any{"id": m.ID, "title": m.Title, "kind": m.Kind, "url": m.URL, "objective_ids": m.ObjectiveIDs, "slides": m.Slides})
	}
	var prev, next string
	var flat []*content.Lesson
	for _, m := range c.Modules {
		for _, x := range m.Lessons {
			if x.Published || p.Staff() {
				flat = append(flat, x)
			}
		}
	}
	for i, x := range flat {
		if x.ID == l.ID {
			if i > 0 {
				prev = flat[i-1].ID
			}
			if i+1 < len(flat) {
				next = flat[i+1].ID
			}
		}
	}
	assignments := []map[string]any{}
	for _, a := range cat.Assignments(c.ID) {
		if a.LessonID == l.ID {
			assignments = append(assignments, map[string]any{"id": a.ID, "title": a.Title, "due_at": a.DueAt})
		}
	}
	var moduleTitle string
	for _, m := range c.Modules {
		if m.ID == l.ModuleID {
			moduleTitle = m.Title
		}
	}
	writeJSON(w, 200, map[string]any{
		"id": l.ID, "title": l.Title, "starts_at": l.StartsAt, "published": l.Published,
		"course":       map[string]any{"id": c.ID, "slug": c.Slug, "title": c.Title},
		"module":       map[string]any{"id": l.ModuleID, "title": moduleTitle},
		"objectives":   l.Objectives,
		"recording":    l.Recording,
		"repo":         l.Repo,
		"materials":    materials,
		"cycle":        l.Cycle,
		"content_html": l.BodyHTML,
		"progress":     progressView(l, prog),
		"assignments":  assignments,
		"open_command": "jmd lesson open " + l.ID,
		"prev":         prev, "next": next,
	})
}

func progressView(l *content.Lesson, prog map[string]time.Time) map[string]any {
	steps := map[string]any{}
	done := 0
	for _, st := range l.Cycle {
		if t, ok := prog[st.ID]; ok {
			steps[st.ID] = t.UTC().Format(time.RFC3339)
			done++
		} else {
			steps[st.ID] = nil
		}
	}
	return map[string]any{"steps": steps, "done": done, "total": len(l.Cycle)}
}

// materialDownload: contrato GET /api/v1/materials/{id}/download → {url, expires_at, filename}.
// Hoy los materiales son enlaces publicados; cuando haya archivos (Garage) aquí irá la URL prefirmada.
func (s *Server) materialDownload(w http.ResponseWriter, r *http.Request, p *Principal) {
	m, l := s.Content.Get().Material(r.PathValue("id"))
	if m == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "el material")
		return
	}
	writeJSON(w, 200, map[string]any{
		"url": m.URL, "expires_at": time.Now().UTC().Add(10 * time.Minute).Format(time.RFC3339),
		"filename": m.Title, "kind": m.Kind,
	})
}

// links: todos los enlaces publicados de los cursos visibles (?course= filtra).
func (s *Server) links(w http.ResponseWriter, r *http.Request, p *Principal) {
	cat := s.Content.Get()
	only := r.URL.Query().Get("course")
	out := []map[string]any{}
	for _, c := range cat.Courses() {
		if !s.canSeeCourse(p, c) || (only != "" && c.ID != only && c.Slug != only) {
			continue
		}
		for _, m := range c.Modules {
			for _, l := range m.Lessons {
				if !l.Published && !p.Staff() {
					continue
				}
				for _, mat := range l.Materials {
					out = append(out, map[string]any{
						"id": mat.ID, "title": mat.Title, "kind": mat.Kind, "url": mat.URL,
						"lesson_id": l.ID, "lesson_title": l.Title, "course_id": c.ID, "course_title": c.Title,
						"objective_ids": mat.ObjectiveIDs,
					})
				}
				if l.Recording != nil {
					out = append(out, map[string]any{
						"id": l.ID + "-recording", "title": "Grabación · " + l.Title, "kind": "video", "url": l.Recording.URL,
						"lesson_id": l.ID, "lesson_title": l.Title, "course_id": c.ID, "course_title": c.Title, "objective_ids": []string{},
					})
				}
				if l.Repo != nil {
					out = append(out, map[string]any{
						"id": l.ID + "-repo", "title": "Código · " + l.Title + " (" + l.Repo.Ref + ")", "kind": "repo", "url": l.Repo.URL,
						"lesson_id": l.ID, "lesson_title": l.Title, "course_id": c.ID, "course_title": c.Title, "objective_ids": []string{},
					})
				}
			}
		}
	}
	writeJSON(w, 200, out)
}

// --- progreso del ciclo de aprendizaje ---------------------------------------------------

func (s *Server) progress(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.Content.Get().Lesson(r.PathValue("id"))
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la sesión")
		return
	}
	prog, err := s.DB.Progress(r.Context(), p.ID, l.ID)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, progressView(l, prog))
}

func (s *Server) setProgress(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.Content.Get().Lesson(r.PathValue("id"))
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la sesión")
		return
	}
	step := r.PathValue("step")
	found := false
	for _, st := range l.Cycle {
		if st.ID == step {
			found = true
		}
	}
	if !found {
		notFound(w, "el paso")
		return
	}
	var in struct {
		Done bool `json:"done"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if err := s.DB.SetProgress(r.Context(), p.ID, l.ID, step, in.Done); err != nil {
		internal(w, err)
		return
	}
	prog, err := s.DB.Progress(r.Context(), p.ID, l.ID)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, progressView(l, prog))
}

// courseProgress (personal): avance de cada alumno por sesión.
func (s *Server) courseProgress(w http.ResponseWriter, r *http.Request, p *Principal) {
	c := s.Content.Get().Course(r.PathValue("id"))
	if c == nil {
		notFound(w, "el curso")
		return
	}
	var ids []string
	totals := map[string]int{}
	lessons := []map[string]any{}
	for _, m := range c.Modules {
		for _, l := range m.Lessons {
			ids = append(ids, l.ID)
			totals[l.ID] = len(l.Cycle)
			lessons = append(lessons, map[string]any{"id": l.ID, "title": l.Title, "steps": len(l.Cycle)})
		}
	}
	byUser, err := s.DB.ProgressByUser(r.Context(), ids)
	if err != nil {
		internal(w, err)
		return
	}
	users, err := s.DB.Users(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	students := []map[string]any{}
	for _, u := range users {
		if !u.HasRole("student") {
			continue
		}
		pr := &Principal{Roles: u.Roles, Cohorts: u.Cohorts}
		if !s.canSeeCourse(pr, c) {
			continue
		}
		students = append(students, map[string]any{
			"id": u.ID, "name": u.Name, "email": u.Email, "cohorts": u.Cohorts, "lessons": byUser[u.ID],
		})
	}
	writeJSON(w, 200, map[string]any{"course_id": c.ID, "lessons": lessons, "students": students})
}

// courseFile sirve un archivo del curso (materials/*.pdf…) solo a quien puede ver el curso.
func (s *Server) courseFile(w http.ResponseWriter, r *http.Request, p *Principal) {
	c := s.Content.Get().Course(r.PathValue("course"))
	rel := r.PathValue("path")
	if c == nil || !s.canSeeCourse(p, c) || !content.SafeRel(rel) {
		notFound(w, "el archivo")
		return
	}
	// Solo archivos que algún material publicado referencia (no se expone la carpeta entera).
	allowed := false
	for _, m := range c.Modules {
		for _, l := range m.Lessons {
			if !l.Published && !p.Staff() {
				continue
			}
			for _, mat := range l.Materials {
				if mat.File == rel || slices.Contains(mat.SlideFiles, rel) {
					allowed = true
				}
			}
		}
	}
	if !allowed {
		notFound(w, "el archivo")
		return
	}
	full := filepath.Join(content.CourseDir(s.Content.Dir(), c.ID), filepath.FromSlash(rel))
	if st, err := os.Stat(full); err != nil || st.IsDir() {
		notFound(w, "el archivo")
		return
	}
	w.Header().Set("Cache-Control", "private, max-age=300")
	// Tipos explícitos: la imagen alpine no trae /etc/mime.types y .pptx no está en la tabla de Go.
	// Los adjuntos (.zip, .pptx) se descargan con su nombre; PDF e imágenes se ven en el navegador.
	switch ext := strings.ToLower(filepath.Ext(rel)); ext {
	case ".pdf":
		w.Header().Set("Content-Type", "application/pdf")
	case ".webp", ".png", ".jpg", ".jpeg":
		w.Header().Set("Content-Type", mime.TypeByExtension(ext))
	case ".pptx":
		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
		w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": filepath.Base(rel)}))
	case ".zip":
		w.Header().Set("Content-Type", "application/zip")
		w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": filepath.Base(rel)}))
	}
	http.ServeFile(w, r, full)
}
