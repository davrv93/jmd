package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// fixture: un curso con una sesión publicada, una en borrador, una tarea y dos ejemplos.
func writeFixture(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	course := filepath.Join(dir, "courses", "curso")
	for _, d := range []string{"lessons", "assignments", "materials", "examples"} {
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
		// sin «published»: queda publicado
		"examples/e1.md": `---
id: e1
title: Ejemplo publicado
summary: Una línea
tags: [skills, git]
level: intermedio
lesson: l1
repo: {url: https://github.com/x/ej, ref: v1}
order: 1
---
Corre ` + "`jmd status`" + `.
`,
		"examples/e2.md": `---
id: e2
title: Ejemplo en borrador
published: false
order: 2
---
secreto
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

// Un alumno con cuenta local que entra luego por SSO con el mismo correo conserva su cuenta.
func TestOIDCReusesLocalAccount(t *testing.T) {
	e := newEnv(t)
	e.register("ana@x.test")
	local, err := e.db.UserByEmail(t.Context(), "ana@x.test")
	if err != nil {
		t.Fatal(err)
	}
	s := &Server{DB: e.db}
	c := &auth.Claims{Sub: "kc-123", Email: "Ana@x.test", Name: "Ana", Groups: []string{"/c1"}}
	c.RealmAccess.Roles = []string{"student", "offline_access"}
	u, err := s.upsertOIDC(t.Context(), c)
	if err != nil {
		t.Fatalf("upsertOIDC: %v", err)
	}
	if u.ID != local.ID || len(u.Cohorts) != 1 || u.Cohorts[0] != "c1" {
		t.Fatalf("debía reutilizar la cuenta local %s, obtuve %+v", local.ID, u)
	}
	// Y una cuenta nueva del realm se crea con el sub como id.
	c2 := &auth.Claims{Sub: "kc-456", Email: "nuevo@x.test", Name: "Nuevo"}
	u2, err := s.upsertOIDC(t.Context(), c2)
	if err != nil || u2.ID != "kc-456" || u2.Roles[0] != "student" {
		t.Fatalf("cuenta nueva: %+v %v", u2, err)
	}
}

func TestExamples(t *testing.T) {
	e := newEnv(t)
	tok := e.register("ana@x.test")
	ptok := e.login("profe@x.test", "profe1234")

	r := e.call("GET", "/api/v1/courses/curso/examples", tok, false, nil, "")
	if r.code != 200 || len(r.list) != 1 {
		t.Fatalf("el alumno solo ve el publicado: %d %s", r.code, r.raw)
	}
	ex := r.list[0]
	if ex["id"] != "e1" || ex["level"] != "intermedio" || ex["published"] != true || ex["lesson_id"] != "l1" ||
		ex["lesson_title"] != "Sesión publicada" || ex["summary"] != "Una línea" || len(ex["tags"].([]any)) != 2 ||
		ex["repo"].(map[string]any)["ref"] != "v1" {
		t.Fatalf("campos del ejemplo: %s", r.raw)
	}
	if _, ok := ex["content_html"]; ok {
		t.Fatalf("la lista no lleva el HTML: %s", r.raw)
	}
	r = e.call("GET", "/api/v1/courses/curso/examples", ptok, false, nil, "")
	if r.code != 200 || len(r.list) != 2 || r.list[1]["id"] != "e2" || r.list[1]["repo"] != nil || r.list[1]["level"] != "básico" {
		t.Fatalf("el instructor ve los dos, en orden: %s", r.raw)
	}
	if r = e.call("GET", "/api/v1/courses/nada/examples", tok, false, nil, ""); r.code != 404 || errCode(r) != "not_found" {
		t.Fatalf("curso inexistente: %d %s", r.code, r.raw)
	}

	r = e.call("GET", "/api/v1/examples/e1", tok, false, nil, "")
	if r.code != 200 || !strings.Contains(r.body["content_html"].(string), "<code>jmd status</code>") ||
		r.body["course"].(map[string]any)["slug"] != "curso" || r.body["prev"] != "" || r.body["next"] != "" {
		t.Fatalf("ejemplo para el alumno: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/examples/e1", ptok, false, nil, "")
	if r.code != 200 || r.body["next"] != "e2" {
		t.Fatalf("el instructor tiene siguiente: %s", r.raw)
	}
	r = e.call("GET", "/api/v1/examples/e2", ptok, false, nil, "")
	if r.code != 200 || r.body["prev"] != "e1" || r.body["published"] != false || r.body["lesson_id"] != "" {
		t.Fatalf("borrador para el instructor: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/examples/e2", tok, false, nil, ""); r.code != 404 || errCode(r) != "not_found" {
		t.Fatalf("borrador para el alumno: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/examples/nope", ptok, false, nil, ""); r.code != 404 || errCode(r) != "not_found" {
		t.Fatalf("ejemplo inexistente: %d %s", r.code, r.raw)
	}

	// examples_total cuenta lo que ve cada uno.
	if r = e.call("GET", "/api/v1/courses/curso", tok, false, nil, ""); r.body["examples_total"].(float64) != 1 {
		t.Fatalf("examples_total del alumno: %s", r.raw)
	}
	if r = e.call("GET", "/api/v1/courses", ptok, false, nil, ""); r.list[0]["examples_total"].(float64) != 2 {
		t.Fatalf("examples_total del instructor: %s", r.raw)
	}

	// Fuera de la cohorte, ni la lista ni el detalle.
	u, _ := e.db.UserByEmail(t.Context(), "ana@x.test")
	_ = e.db.UpdateUserRoles(t.Context(), u.ID, []string{"student"}, []string{"c9"})
	if r = e.call("GET", "/api/v1/examples/e1", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("ejemplo de otro curso: %d", r.code)
	}
}

// Las páginas con parámetro que no se prerenderizaron caen en /<sección>/_/.
func TestStaticShellFallback(t *testing.T) {
	web := fstest.MapFS{
		"index.html":               {Data: []byte("inicio")},
		"404.html":                 {Data: []byte("no está")},
		"lessons/_/index.html":     {Data: []byte("shell de sesiones")},
		"lessons/_/q-data.json":    {Data: []byte(`{"shell":true,"href":"/lessons/_/"}`)},
		"lessons/pa-01/index.html": {Data: []byte("pa-01 prerenderizada")},
	}
	h := (&Server{Web: web}).Handler()
	get := func(p string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", p, nil))
		return w
	}
	body := func(w *httptest.ResponseRecorder) string { b, _ := io.ReadAll(w.Result().Body); return string(b) }

	w := get("/lessons/pa-99/")
	if w.Code != 200 || body(w) != "shell de sesiones" || !strings.HasPrefix(w.Header().Get("Content-Type"), "text/html") ||
		w.Header().Get("Cache-Control") != "no-cache" {
		t.Fatalf("shell: %d %q %v", w.Code, body(w), w.Header())
	}
	w = get("/lessons/pa-99")
	if w.Code != 301 || w.Header().Get("Location") != "/lessons/pa-99/" {
		t.Fatalf("redirección: %d %v", w.Code, w.Header())
	}
	w = get("/lessons/pa-99/q-data.json")
	// La ruta genérica serializada se cambia por la pedida (si no, Qwik la pone en la barra).
	if w.Code != 200 || body(w) != `{"shell":true,"href":"/lessons/pa-99/"}` || !strings.HasPrefix(w.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("q-data del shell: %d %q %v", w.Code, body(w), w.Header())
	}
	if w = get("/lessons/pa-01/"); w.Code != 200 || body(w) != "pa-01 prerenderizada" {
		t.Fatalf("la prerenderizada manda: %d %q", w.Code, body(w))
	}
	if w = get("/nope/x/"); w.Code != 404 || body(w) != "no está" {
		t.Fatalf("sección sin shell: %d %q", w.Code, body(w))
	}
	if w = get("/examples/x/"); w.Code != 404 {
		t.Fatalf("sección sin _ en el build: %d", w.Code)
	}
	if w = get("/lessons/a/b/"); w.Code != 404 {
		t.Fatalf("dos segmentos: %d", w.Code)
	}
}
