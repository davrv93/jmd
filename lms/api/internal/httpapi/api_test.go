package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// fixture: un curso con una sesión publicada, una en borrador y una tarea.
func writeFixture(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	course := filepath.Join(dir, "courses", "curso")
	for _, d := range []string{"lessons", "assignments", "materials"} {
		if err := os.MkdirAll(filepath.Join(course, d), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	files := map[string]string{
		"course.yaml": `id: curso
title: Curso de prueba
cohorts: [c1]
modules:
  - id: m1
    title: Módulo 1
    lessons: [l1, l2]
`,
		"lessons/l1.md": `---
id: l1
title: Sesión publicada
starts_at: 2026-10-08T19:00:00-05:00
published: true
objectives:
  - {id: o1, title: Objetivo 1}
recording: {url: https://zoom.example/rec, passcode: "1234"}
repo: {url: https://github.com/x/y, ref: main}
materials:
  - {id: mat1, title: Enlace, kind: link, url: https://example.com, objective_ids: [o1]}
  - {id: mat2, title: PDF, kind: pdf, file: materials/clase.pdf, objective_ids: [o1]}
cycle:
  - {id: ver, title: Ver, tool: zoom, description: Mira, check: visto}
  - {id: hacer, title: Hacer, tool: terminal, description: Haz, check: "jmd status"}
---
## Hola

Contenido **Markdown** con tabla:

| a | b |
|---|---|
| 1 | 2 |
`,
		"lessons/l2.md": `---
id: l2
title: Borrador
published: false
---
secreto
`,
		"materials/clase.pdf": "%PDF-1.4 falso",
		"assignments/t1.md": `---
id: t1
title: Tarea 1
lesson: l1
due_at: 2030-01-01T00:00:00Z
rubric:
  - criterion: C1
    levels: [{title: no, points: 0}, {title: sí, points: 10}]
---
Enunciado.
`,
	}
	for name, body := range files {
		if err := os.WriteFile(filepath.Join(course, name), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

type env struct {
	t   *testing.T
	srv *httptest.Server
	db  *store.DB
}

func newEnv(t *testing.T) *env {
	t.Helper()
	cs, err := content.NewStore(writeFixture(t))
	if err != nil {
		t.Fatal(err)
	}
	db, err := store.Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c1", PublicURL: "http://lms.test"}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	// instructor
	hash, _ := auth.HashPassword("profe1234")
	if err := db.CreateUser(t.Context(), &store.User{Email: "profe@x.test", Name: "Profe", PasswordHash: hash, Roles: []string{"admin", "instructor"}}); err != nil {
		t.Fatal(err)
	}
	return &env{t: t, srv: srv, db: db}
}

type resp struct {
	code int
	body map[string]any
	list []map[string]any
	raw  []byte
	hdr  http.Header
}

// call hace una petición; token va como Bearer (como jmd) o como cookie si cookie=true.
func (e *env) call(method, path, token string, cookie bool, body any, contentType string) resp {
	e.t.Helper()
	var rb *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rb = bytes.NewReader(b)
	} else {
		rb = bytes.NewReader(nil)
	}
	req, _ := http.NewRequest(method, e.srv.URL+path, rb)
	if body != nil {
		if contentType == "" {
			contentType = "application/json"
		}
		req.Header.Set("Content-Type", contentType)
	}
	if token != "" {
		if cookie {
			req.AddCookie(&http.Cookie{Name: cookieName, Value: token})
		} else {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer res.Body.Close()
	var buf bytes.Buffer
	_, _ = buf.ReadFrom(res.Body)
	r := resp{code: res.StatusCode, raw: buf.Bytes(), hdr: res.Header}
	if bytes.HasPrefix(bytes.TrimSpace(r.raw), []byte("[")) {
		_ = json.Unmarshal(r.raw, &r.list)
	} else {
		_ = json.Unmarshal(r.raw, &r.body)
	}
	return r
}

func (e *env) login(email, pw string) string {
	e.t.Helper()
	r := e.call("POST", "/api/v1/auth/login", "", false, map[string]string{"email": email, "password": pw}, "")
	if r.code != 200 {
		e.t.Fatalf("login %s: %d %s", email, r.code, r.raw)
	}
	return r.body["token"].(string)
}

func (e *env) register(email string) string {
	e.t.Helper()
	r := e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": email, "name": "Alumno", "password": "alumno1234", "invite_code": "abc"}, "")
	if r.code != 201 {
		e.t.Fatalf("register: %d %s", r.code, r.raw)
	}
	return r.body["token"].(string)
}

func errCode(r resp) string {
	if e, ok := r.body["error"].(map[string]any); ok {
		return e["code"].(string)
	}
	return ""
}

func TestErrorFormatAndAuth(t *testing.T) {
	e := newEnv(t)
	r := e.call("GET", "/api/v1/me", "", false, nil, "")
	if r.code != 401 || errCode(r) != "unauthorized" {
		t.Fatalf("sin token: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/nada", "", false, nil, "")
	if r.code != 404 || errCode(r) != "not_found" {
		t.Fatalf("ruta inexistente: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/auth/login", "", false, map[string]string{"email": "profe@x.test", "password": "mal"}, "")
	if r.code != 401 || errCode(r) != "invalid_credentials" {
		t.Fatalf("login mal: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": "a@x.test", "name": "A", "password": "alumno1234", "invite_code": "otro"}, "")
	if r.code != 403 || errCode(r) != "invalid_invite" {
		t.Fatalf("registro con código malo: %d %s", r.code, r.raw)
	}
}

func TestMeAndCourses(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	r := e.call("GET", "/api/v1/me", tok, false, nil, "")
	if r.code != 200 || r.body["email"] != "ana@x.test" {
		t.Fatalf("me: %d %s", r.code, r.raw)
	}
	roles, _ := r.body["roles"].([]any)
	cohorts, _ := r.body["cohorts"].([]any)
	if len(roles) != 1 || roles[0] != "student" || len(cohorts) != 1 || cohorts[0] != "c1" {
		t.Fatalf("roles/cohortes: %s", r.raw)
	}
	// la cookie también vale
	r = e.call("GET", "/api/v1/me", tok, true, nil, "")
	if r.code != 200 {
		t.Fatalf("me con cookie: %d", r.code)
	}
	r = e.call("GET", "/api/v1/courses", tok, false, nil, "")
	if r.code != 200 || len(r.list) != 1 || r.list[0]["id"] != "curso" || r.list[0]["role"] != "student" {
		t.Fatalf("courses: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/courses/curso", tok, false, nil, "")
	if r.code != 200 {
		t.Fatalf("course: %d %s", r.code, r.raw)
	}
	mods := r.body["modules"].([]any)
	lessons := mods[0].(map[string]any)["lessons"].([]any)
	if len(lessons) != 1 || lessons[0].(map[string]any)["id"] != "l1" {
		t.Fatalf("el alumno no debe ver el borrador: %s", r.raw)
	}
	// el instructor sí lo ve
	ptok := e.login("profe@x.test", "profe1234")
	r = e.call("GET", "/api/v1/courses/curso", ptok, false, nil, "")
	lessons = r.body["modules"].([]any)[0].(map[string]any)["lessons"].([]any)
	if len(lessons) != 2 {
		t.Fatalf("el instructor debe ver el borrador: %s", r.raw)
	}
	if r = e.call("GET", "/api/v1/lessons/l2", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("borrador para alumno: %d", r.code)
	}
	if r = e.call("GET", "/api/v1/lessons/l2", ptok, false, nil, ""); r.code != 200 {
		t.Fatalf("borrador para instructor: %d", r.code)
	}
}

func TestCohortGate(t *testing.T) {
	e := newEnv(t)
	tok := e.register("otro@x.test")
	// lo sacamos de la cohorte
	u, _ := e.db.UserByEmail(t.Context(), "otro@x.test")
	_ = e.db.UpdateUserRoles(t.Context(), u.ID, []string{"student"}, []string{"c9"})
	r := e.call("GET", "/api/v1/courses", tok, false, nil, "")
	if r.code != 200 || len(r.list) != 0 {
		t.Fatalf("fuera de la cohorte debe ver 0 cursos: %s", r.raw)
	}
	if r = e.call("GET", "/api/v1/lessons/l1", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("sesión de otro curso: %d", r.code)
	}
}

func TestLessonProgressAndLinks(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	r := e.call("GET", "/api/v1/lessons/l1", tok, false, nil, "")
	if r.code != 200 {
		t.Fatalf("lesson: %d %s", r.code, r.raw)
	}
	if !strings.Contains(r.body["content_html"].(string), "<table>") || !strings.Contains(r.body["content_html"].(string), "<strong>Markdown</strong>") {
		t.Fatalf("markdown sin convertir: %s", r.body["content_html"])
	}
	if r.body["open_command"] != "jmd lesson open l1" || r.body["recording"].(map[string]any)["passcode"] != "1234" {
		t.Fatalf("campos: %s", r.raw)
	}
	prog := r.body["progress"].(map[string]any)
	if prog["total"].(float64) != 2 || prog["done"].(float64) != 0 {
		t.Fatalf("progreso inicial: %v", prog)
	}
	r = e.call("PUT", "/api/v1/lessons/l1/progress/hacer", tok, false, map[string]bool{"done": true}, "")
	if r.code != 200 || r.body["done"].(float64) != 1 || r.body["steps"].(map[string]any)["hacer"] == nil {
		t.Fatalf("marcar paso: %d %s", r.code, r.raw)
	}
	if r = e.call("PUT", "/api/v1/lessons/l1/progress/inventado", tok, false, map[string]bool{"done": true}, ""); r.code != 404 {
		t.Fatalf("paso inexistente: %d", r.code)
	}
	r = e.call("PUT", "/api/v1/lessons/l1/progress/hacer", tok, false, map[string]bool{"done": false}, "")
	if r.body["done"].(float64) != 0 {
		t.Fatalf("desmarcar: %s", r.raw)
	}
	r = e.call("GET", "/api/v1/courses/curso", tok, false, nil, "")
	l := r.body["modules"].([]any)[0].(map[string]any)["lessons"].([]any)[0].(map[string]any)
	if l["steps"].(float64) != 2 {
		t.Fatalf("steps en el curso: %v", l)
	}
	r = e.call("GET", "/api/v1/links", tok, false, nil, "")
	if r.code != 200 || len(r.list) != 4 { // 2 materiales + grabación + repo
		t.Fatalf("links: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/materials/mat1/download", tok, false, nil, "")
	if r.code != 200 || r.body["url"] != "https://example.com" || r.body["expires_at"] == nil {
		t.Fatalf("download: %d %s", r.code, r.raw)
	}
}

func TestCourseFiles(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	r := e.call("GET", "/api/v1/lessons/l1", tok, false, nil, "")
	mats := r.body["materials"].([]any)
	if mats[1].(map[string]any)["url"] != "/files/curso/materials/clase.pdf" {
		t.Fatalf("url del archivo: %s", r.raw)
	}
	r = e.call("GET", "/files/curso/materials/clase.pdf", tok, false, nil, "")
	if r.code != 200 || !strings.HasPrefix(string(r.raw), "%PDF") || r.hdr.Get("Content-Type") != "application/pdf" {
		t.Fatalf("archivo: %d %q %s", r.code, r.hdr.Get("Content-Type"), r.raw)
	}
	if r = e.call("GET", "/files/curso/materials/clase.pdf", "", false, nil, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
	if r = e.call("GET", "/files/curso/course.yaml", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("archivo no referenciado: %d", r.code)
	}
	if r = e.call("GET", "/files/curso/materials/../course.yaml", tok, false, nil, ""); r.code == 200 {
		t.Fatalf("path traversal: %d", r.code)
	}
}

func TestSubmissionsAndGrades(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	ptok := e.login("profe@x.test", "profe1234")
	r := e.call("GET", "/api/v1/assignments?course=curso", tok, false, nil, "")
	if r.code != 200 || len(r.list) != 1 || r.list[0]["status"] != "pending" {
		t.Fatalf("assignments: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/assignments/t1", tok, false, nil, "")
	if r.code != 200 || r.body["max_score"].(float64) != 10 || r.body["autograde"] != false || r.body["description_md"] != "Enunciado.\n" {
		t.Fatalf("assignment: %d %s", r.code, r.raw)
	}
	bad := e.call("POST", "/api/v1/assignments/t1/submissions", tok, false, map[string]string{"repo_url": "ftp://x", "commit_sha": "zz"}, "")
	if bad.code != 400 {
		t.Fatalf("validación: %d %s", bad.code, bad.raw)
	}
	r = e.call("POST", "/api/v1/assignments/t1/submissions", tok, false, map[string]string{"repo_url": "https://github.com/ana/clase-01", "commit_sha": "ABCDEF1", "notes": "hola"}, "")
	if r.code != 201 || r.body["status"] != "queued" {
		t.Fatalf("submit: %d %s", r.code, r.raw)
	}
	id := r.body["id"].(string)
	r = e.call("GET", "/api/v1/submissions/"+id, tok, false, nil, "")
	if r.code != 200 || r.body["commit_sha"] != "abcdef1" || r.body["score"] != nil {
		t.Fatalf("submission: %d %s", r.code, r.raw)
	}
	// otro alumno no la ve
	other := e.register("otro@x.test")
	if r = e.call("GET", "/api/v1/submissions/"+id, other, false, nil, ""); r.code != 404 {
		t.Fatalf("entrega ajena: %d", r.code)
	}
	// el alumno no califica
	if r = e.call("POST", "/api/v1/submissions/"+id+"/grade", tok, false, map[string]any{"score": 10}, ""); r.code != 403 {
		t.Fatalf("alumno calificando: %d", r.code)
	}
	r = e.call("GET", "/api/v1/assignments/t1/submissions", ptok, false, nil, "")
	if r.code != 200 || len(r.list) != 1 || r.list[0]["user"] == nil {
		t.Fatalf("lista para el instructor: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/submissions/"+id+"/grade", ptok, false, map[string]any{"score": 8, "feedback_md": "bien"}, "")
	if r.code != 200 || r.body["status"] != "graded" || r.body["score"].(float64) != 8 {
		t.Fatalf("grade: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/grades?course=curso", tok, false, nil, "")
	if r.code != 200 || len(r.list) != 1 || r.list[0]["score"].(float64) != 8 || r.list[0]["max_score"].(float64) != 10 || r.list[0]["graded_at"] == nil {
		t.Fatalf("grades: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/assignments?course=curso", tok, false, nil, "")
	if r.list[0]["status"] != "graded" {
		t.Fatalf("status tras calificar: %s", r.raw)
	}
}

func TestQuestions(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	ptok := e.login("profe@x.test", "profe1234")
	r := e.call("POST", "/api/v1/lessons/l1/questions", tok, false, map[string]any{"body_md": "¿Por qué 429?", "code_ref": map[string]any{"path": "src/main.rs", "line": 3}, "video_ts": 120}, "")
	if r.code != 201 || !strings.HasPrefix(r.body["url"].(string), "http://lms.test/lessons/l1/#q-") {
		t.Fatalf("question: %d %s", r.code, r.raw)
	}
	qid := r.body["id"].(string)
	r = e.call("GET", "/api/v1/lessons/l1/questions", tok, false, nil, "")
	if r.code != 200 || len(r.list) != 1 || r.list[0]["code_ref"].(map[string]any)["line"].(float64) != 3 || r.list[0]["user_name"] != "Alumno" {
		t.Fatalf("list: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/questions/"+qid+"/answers", ptok, false, map[string]string{"body_md": "Porque la cuota se agotó."}, "")
	if r.code != 201 || len(r.body["answers"].([]any)) != 1 {
		t.Fatalf("answer: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/questions/"+qid+"/resolve", ptok, false, map[string]bool{"resolved": true}, "")
	if r.code != 200 || r.body["resolved"] != true {
		t.Fatalf("resolve: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/lessons/l1/questions", tok, false, map[string]any{"body_md": "x", "objective_id": "nope"}, "")
	if r.code != 400 {
		t.Fatalf("objective inválido: %d", r.code)
	}
}

func TestCookieWritesNeedJSON(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	r := e.call("PUT", "/api/v1/lessons/l1/progress/ver", tok, true, map[string]bool{"done": true}, "text/plain")
	if r.code != 403 {
		t.Fatalf("escritura con cookie sin JSON debe ser 403: %d %s", r.code, r.raw)
	}
	r = e.call("PUT", "/api/v1/lessons/l1/progress/ver", tok, true, map[string]bool{"done": true}, "")
	if r.code != 200 {
		t.Fatalf("con JSON: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/auth/logout", tok, true, map[string]any{}, "")
	if r.code != 200 {
		t.Fatalf("logout: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/me", tok, false, nil, ""); r.code != 401 {
		t.Fatalf("token revocado: %d", r.code)
	}
}

func TestAdminAndReload(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	ptok := e.login("profe@x.test", "profe1234")
	if r := e.call("GET", "/api/v1/admin/users", tok, false, nil, ""); r.code != 403 {
		t.Fatalf("alumno en admin: %d", r.code)
	}
	r := e.call("GET", "/api/v1/admin/users", ptok, false, nil, "")
	if r.code != 200 || len(r.list) != 2 {
		t.Fatalf("users: %d %s", r.code, r.raw)
	}
	r = e.call("POST", "/api/v1/admin/reload", ptok, false, map[string]any{}, "")
	if r.code != 200 {
		t.Fatalf("reload: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/courses/curso/progress", ptok, false, nil, "")
	if r.code != 200 || len(r.body["students"].([]any)) != 1 {
		t.Fatalf("progress del curso: %d %s", r.code, r.raw)
	}
}
