// Package store es la base de datos del LMS (SQLite, sin CGO): usuarios, sesiones, progreso,
// preguntas y entregas. El temario no está aquí: lo lee el paquete content desde archivos.
package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// ErrNotFound se devuelve cuando no existe la fila.
var ErrNotFound = errors.New("no encontrado")

// DB envuelve la conexión.
type DB struct{ sql *sql.DB }

// Open abre (o crea) la base de datos y aplica el esquema.
func Open(path string) (*DB, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("esquema: %w", err)
	}
	return &DB{sql: db}, nil
}

// Close cierra la conexión.
func (d *DB) Close() error { return d.sql.Close() }

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  roles TEXT NOT NULL DEFAULT '[]',
  cohorts TEXT NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  done_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id, step_id)
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  score REAL,
  max_score REAL NOT NULL DEFAULT 0,
  feedback_md TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  graded_at TEXT
);
CREATE INDEX IF NOT EXISTS submissions_user ON submissions(user_id, assignment_id, created_at);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  objective_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_md TEXT NOT NULL,
  code_path TEXT NOT NULL DEFAULT '',
  code_line INTEGER NOT NULL DEFAULT 0,
  video_ts INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS questions_lesson ON questions(lesson_id, created_at);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  horas INTEGER NOT NULL DEFAULT 0,
  nota TEXT NOT NULL DEFAULT '',
  emitido_por TEXT NOT NULL,
  emitido_en TEXT NOT NULL,
  anulado_en TEXT,
  snapshot_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS certificates_user ON certificates(user_id, emitido_en);
CREATE INDEX IF NOT EXISTS certificates_course ON certificates(course_id, emitido_en);
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_md TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`

// NewID genera un id aleatorio no adivinable (32 hex).
func NewID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b[:])
}

func now() string { return time.Now().UTC().Format(time.RFC3339) }

func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339, s)
	return t
}

func jsonList(v []string) string {
	if v == nil {
		v = []string{}
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func parseList(s string) []string {
	var out []string
	_ = json.Unmarshal([]byte(s), &out)
	if out == nil {
		out = []string{}
	}
	return out
}

// --- usuarios ------------------------------------------------------------------------------

// User es una cuenta: local (con contraseña) u OIDC (sin ella).
type User struct {
	ID           string
	Email        string
	Name         string
	PasswordHash string
	Roles        []string
	Cohorts      []string
	Provider     string
	CreatedAt    time.Time
}

// HasRole dice si el usuario tiene el rol.
func (u *User) HasRole(role string) bool {
	for _, r := range u.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func scanUser(row interface{ Scan(...any) error }) (*User, error) {
	var u User
	var roles, cohorts, created string
	if err := row.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &roles, &cohorts, &u.Provider, &created); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	u.Roles, u.Cohorts, u.CreatedAt = parseList(roles), parseList(cohorts), parseTime(created)
	return &u, nil
}

const userCols = "id, email, name, password_hash, roles, cohorts, provider, created_at"

// CreateUser inserta una cuenta. El email se guarda en minúsculas.
func (d *DB) CreateUser(ctx context.Context, u *User) error {
	if u.ID == "" {
		u.ID = NewID()
	}
	if u.Provider == "" {
		u.Provider = "local"
	}
	u.Email = strings.ToLower(strings.TrimSpace(u.Email))
	_, err := d.sql.ExecContext(ctx, "INSERT INTO users ("+userCols+") VALUES (?,?,?,?,?,?,?,?)",
		u.ID, u.Email, u.Name, u.PasswordHash, jsonList(u.Roles), jsonList(u.Cohorts), u.Provider, now())
	return err
}

// UpsertOIDCUser crea o actualiza la cuenta que llega por OIDC (id = sub).
func (d *DB) UpsertOIDCUser(ctx context.Context, u *User) error {
	u.Email = strings.ToLower(strings.TrimSpace(u.Email))
	u.Provider = "oidc"
	_, err := d.sql.ExecContext(ctx, `INSERT INTO users (`+userCols+`) VALUES (?,?,?,?,?,?,?,?)
		ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, roles=excluded.roles,
		cohorts=excluded.cohorts, provider=excluded.provider`,
		u.ID, u.Email, u.Name, "", jsonList(u.Roles), jsonList(u.Cohorts), u.Provider, now())
	return err
}

// UserByEmail busca por email.
func (d *DB) UserByEmail(ctx context.Context, email string) (*User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	return scanUser(d.sql.QueryRowContext(ctx, "SELECT "+userCols+" FROM users WHERE email = ?", email))
}

// UserByID busca por id.
func (d *DB) UserByID(ctx context.Context, id string) (*User, error) {
	return scanUser(d.sql.QueryRowContext(ctx, "SELECT "+userCols+" FROM users WHERE id = ?", id))
}

// Users lista todas las cuentas.
func (d *DB) Users(ctx context.Context) ([]*User, error) {
	rows, err := d.sql.QueryContext(ctx, "SELECT "+userCols+" FROM users ORDER BY created_at")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// UpdateUserRoles cambia roles y cohortes.
func (d *DB) UpdateUserRoles(ctx context.Context, id string, roles, cohorts []string) error {
	res, err := d.sql.ExecContext(ctx, "UPDATE users SET roles = ?, cohorts = ? WHERE id = ?", jsonList(roles), jsonList(cohorts), id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// --- sesiones ------------------------------------------------------------------------------

// CreateSession guarda el hash de un token con su caducidad.
func (d *DB) CreateSession(ctx context.Context, tokenHash, userID, label string, ttl time.Duration) error {
	_, err := d.sql.ExecContext(ctx, "INSERT INTO sessions (token_hash, user_id, label, created_at, expires_at) VALUES (?,?,?,?,?)",
		tokenHash, userID, label, now(), time.Now().UTC().Add(ttl).Format(time.RFC3339))
	return err
}

// UserBySession devuelve el usuario de un token vigente.
func (d *DB) UserBySession(ctx context.Context, tokenHash string) (*User, error) {
	return scanUser(d.sql.QueryRowContext(ctx, `SELECT u.id, u.email, u.name, u.password_hash, u.roles, u.cohorts, u.provider, u.created_at
		FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`, tokenHash, now()))
}

// DeleteSession revoca un token.
func (d *DB) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := d.sql.ExecContext(ctx, "DELETE FROM sessions WHERE token_hash = ?", tokenHash)
	return err
}

// --- progreso ------------------------------------------------------------------------------

// SetProgress marca o desmarca un paso del ciclo de una sesión.
func (d *DB) SetProgress(ctx context.Context, userID, lessonID, stepID string, done bool) error {
	if !done {
		_, err := d.sql.ExecContext(ctx, "DELETE FROM progress WHERE user_id = ? AND lesson_id = ? AND step_id = ?", userID, lessonID, stepID)
		return err
	}
	_, err := d.sql.ExecContext(ctx, "INSERT OR IGNORE INTO progress (user_id, lesson_id, step_id, done_at) VALUES (?,?,?,?)",
		userID, lessonID, stepID, now())
	return err
}

// Progress devuelve step_id → fecha para una sesión y un usuario.
func (d *DB) Progress(ctx context.Context, userID, lessonID string) (map[string]time.Time, error) {
	rows, err := d.sql.QueryContext(ctx, "SELECT step_id, done_at FROM progress WHERE user_id = ? AND lesson_id = ?", userID, lessonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]time.Time{}
	for rows.Next() {
		var step, at string
		if err := rows.Scan(&step, &at); err != nil {
			return nil, err
		}
		out[step] = parseTime(at)
	}
	return out, rows.Err()
}

// ProgressCount cuenta pasos hechos por sesión para un usuario (lesson_id → n).
func (d *DB) ProgressCount(ctx context.Context, userID string) (map[string]int, error) {
	rows, err := d.sql.QueryContext(ctx, "SELECT lesson_id, COUNT(*) FROM progress WHERE user_id = ? GROUP BY lesson_id", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var id string
		var n int
		if err := rows.Scan(&id, &n); err != nil {
			return nil, err
		}
		out[id] = n
	}
	return out, rows.Err()
}

// ProgressByUser devuelve, para varias sesiones, user_id → lesson_id → pasos hechos.
func (d *DB) ProgressByUser(ctx context.Context, lessonIDs []string) (map[string]map[string]int, error) {
	out := map[string]map[string]int{}
	if len(lessonIDs) == 0 {
		return out, nil
	}
	args := make([]any, len(lessonIDs))
	for i, id := range lessonIDs {
		args[i] = id
	}
	q := "SELECT user_id, lesson_id, COUNT(*) FROM progress WHERE lesson_id IN (?" + strings.Repeat(",?", len(lessonIDs)-1) + ") GROUP BY user_id, lesson_id"
	rows, err := d.sql.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var uid, lid string
		var n int
		if err := rows.Scan(&uid, &lid, &n); err != nil {
			return nil, err
		}
		if out[uid] == nil {
			out[uid] = map[string]int{}
		}
		out[uid][lid] = n
	}
	return out, rows.Err()
}

// --- entregas ------------------------------------------------------------------------------

// Submission es una entrega: repo + commit, con su estado y nota.
type Submission struct {
	ID           string
	AssignmentID string
	UserID       string
	RepoURL      string
	CommitSHA    string
	Notes        string
	Status       string
	Score        *float64
	MaxScore     float64
	FeedbackMD   string
	CreatedAt    time.Time
	GradedAt     *time.Time
}

const subCols = "id, assignment_id, user_id, repo_url, commit_sha, notes, status, score, max_score, feedback_md, created_at, graded_at"

func scanSubmission(row interface{ Scan(...any) error }) (*Submission, error) {
	var s Submission
	var score sql.NullFloat64
	var created string
	var graded sql.NullString
	if err := row.Scan(&s.ID, &s.AssignmentID, &s.UserID, &s.RepoURL, &s.CommitSHA, &s.Notes, &s.Status, &score, &s.MaxScore, &s.FeedbackMD, &created, &graded); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if score.Valid {
		v := score.Float64
		s.Score = &v
	}
	s.CreatedAt = parseTime(created)
	if graded.Valid {
		t := parseTime(graded.String)
		s.GradedAt = &t
	}
	return &s, nil
}

// CreateSubmission inserta una entrega en estado queued.
func (d *DB) CreateSubmission(ctx context.Context, s *Submission) error {
	if s.ID == "" {
		s.ID = NewID()
	}
	if s.Status == "" {
		s.Status = "queued"
	}
	s.CreatedAt = time.Now().UTC()
	_, err := d.sql.ExecContext(ctx, "INSERT INTO submissions (id, assignment_id, user_id, repo_url, commit_sha, notes, status, max_score, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
		s.ID, s.AssignmentID, s.UserID, s.RepoURL, s.CommitSHA, s.Notes, s.Status, s.MaxScore, s.CreatedAt.Format(time.RFC3339))
	return err
}

// Submission busca por id.
func (d *DB) Submission(ctx context.Context, id string) (*Submission, error) {
	return scanSubmission(d.sql.QueryRowContext(ctx, "SELECT "+subCols+" FROM submissions WHERE id = ?", id))
}

// Submissions lista las entregas de una tarea; con userID, solo las de ese usuario.
func (d *DB) Submissions(ctx context.Context, assignmentID, userID string) ([]*Submission, error) {
	q := "SELECT " + subCols + " FROM submissions WHERE assignment_id = ?"
	args := []any{assignmentID}
	if userID != "" {
		q += " AND user_id = ?"
		args = append(args, userID)
	}
	q += " ORDER BY created_at DESC"
	rows, err := d.sql.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Submission{}
	for rows.Next() {
		s, err := scanSubmission(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// LatestSubmissions devuelve, para un usuario, la entrega más reciente de cada tarea.
func (d *DB) LatestSubmissions(ctx context.Context, userID string) (map[string]*Submission, error) {
	rows, err := d.sql.QueryContext(ctx, "SELECT "+subCols+" FROM submissions WHERE user_id = ? ORDER BY created_at ASC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]*Submission{}
	for rows.Next() {
		s, err := scanSubmission(rows)
		if err != nil {
			return nil, err
		}
		out[s.AssignmentID] = s // la última en orden ascendente gana
	}
	return out, rows.Err()
}

// GradeSubmission pone nota y comentarios.
func (d *DB) GradeSubmission(ctx context.Context, id string, score float64, feedback string) error {
	res, err := d.sql.ExecContext(ctx, "UPDATE submissions SET status = 'graded', score = ?, feedback_md = ?, graded_at = ? WHERE id = ?",
		score, feedback, now(), id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// --- preguntas -----------------------------------------------------------------------------

// Question es un hilo de una sesión.
type Question struct {
	ID          string
	LessonID    string
	ObjectiveID string
	UserID      string
	UserName    string
	BodyMD      string
	CodePath    string
	CodeLine    int
	VideoTS     int
	Resolved    bool
	CreatedAt   time.Time
	Answers     []*Answer
}

// Answer es una respuesta a una pregunta.
type Answer struct {
	ID         string
	QuestionID string
	UserID     string
	UserName   string
	BodyMD     string
	CreatedAt  time.Time
}

// CreateQuestion inserta una pregunta.
func (d *DB) CreateQuestion(ctx context.Context, q *Question) error {
	if q.ID == "" {
		q.ID = NewID()
	}
	q.CreatedAt = time.Now().UTC()
	_, err := d.sql.ExecContext(ctx, "INSERT INTO questions (id, lesson_id, objective_id, user_id, body_md, code_path, code_line, video_ts, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
		q.ID, q.LessonID, q.ObjectiveID, q.UserID, q.BodyMD, q.CodePath, q.CodeLine, q.VideoTS, q.CreatedAt.Format(time.RFC3339))
	return err
}

// Question busca una pregunta con sus respuestas.
func (d *DB) Question(ctx context.Context, id string) (*Question, error) {
	qs, err := d.questions(ctx, "q.id = ?", id)
	if err != nil {
		return nil, err
	}
	if len(qs) == 0 {
		return nil, ErrNotFound
	}
	return qs[0], nil
}

// Questions lista las preguntas de una sesión con sus respuestas.
func (d *DB) Questions(ctx context.Context, lessonID string) ([]*Question, error) {
	return d.questions(ctx, "q.lesson_id = ?", lessonID)
}

func (d *DB) questions(ctx context.Context, where string, arg any) ([]*Question, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT q.id, q.lesson_id, q.objective_id, q.user_id, u.name, q.body_md, q.code_path, q.code_line, q.video_ts, q.resolved, q.created_at
		FROM questions q JOIN users u ON u.id = q.user_id WHERE `+where+` ORDER BY q.created_at DESC`, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Question{}
	byID := map[string]*Question{}
	for rows.Next() {
		var q Question
		var resolved int
		var created string
		if err := rows.Scan(&q.ID, &q.LessonID, &q.ObjectiveID, &q.UserID, &q.UserName, &q.BodyMD, &q.CodePath, &q.CodeLine, &q.VideoTS, &resolved, &created); err != nil {
			return nil, err
		}
		q.Resolved, q.CreatedAt, q.Answers = resolved == 1, parseTime(created), []*Answer{}
		out = append(out, &q)
		byID[q.ID] = &q
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return out, nil
	}
	ids := make([]any, len(out))
	for i, q := range out {
		ids[i] = q.ID
	}
	arows, err := d.sql.QueryContext(ctx, `SELECT a.id, a.question_id, a.user_id, u.name, a.body_md, a.created_at FROM answers a JOIN users u ON u.id = a.user_id
		WHERE a.question_id IN (?`+strings.Repeat(",?", len(ids)-1)+`) ORDER BY a.created_at ASC`, ids...)
	if err != nil {
		return nil, err
	}
	defer arows.Close()
	for arows.Next() {
		var a Answer
		var created string
		if err := arows.Scan(&a.ID, &a.QuestionID, &a.UserID, &a.UserName, &a.BodyMD, &created); err != nil {
			return nil, err
		}
		a.CreatedAt = parseTime(created)
		if q := byID[a.QuestionID]; q != nil {
			q.Answers = append(q.Answers, &a)
		}
	}
	return out, arows.Err()
}

// CreateAnswer inserta una respuesta.
func (d *DB) CreateAnswer(ctx context.Context, a *Answer) error {
	if a.ID == "" {
		a.ID = NewID()
	}
	a.CreatedAt = time.Now().UTC()
	_, err := d.sql.ExecContext(ctx, "INSERT INTO answers (id, question_id, user_id, body_md, created_at) VALUES (?,?,?,?,?)",
		a.ID, a.QuestionID, a.UserID, a.BodyMD, a.CreatedAt.Format(time.RFC3339))
	return err
}

// ResolveQuestion marca (o desmarca) una pregunta como resuelta.
func (d *DB) ResolveQuestion(ctx context.Context, id string, resolved bool) error {
	v := 0
	if resolved {
		v = 1
	}
	res, err := d.sql.ExecContext(ctx, "UPDATE questions SET resolved = ? WHERE id = ?", v, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// UnansweredCount cuenta preguntas sin respuesta ni resolver por sesión.
func (d *DB) UnansweredCount(ctx context.Context) (map[string]int, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT lesson_id, COUNT(*) FROM questions q WHERE resolved = 0
		AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.question_id = q.id) GROUP BY lesson_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var id string
		var n int
		if err := rows.Scan(&id, &n); err != nil {
			return nil, err
		}
		out[id] = n
	}
	return out, rows.Err()
}

// --- ajustes -------------------------------------------------------------------------------

// Setting devuelve el valor guardado para una clave; ErrNotFound si nunca se guardó.
func (d *DB) Setting(ctx context.Context, key string) (string, error) {
	var v string
	err := d.sql.QueryRowContext(ctx, "SELECT value FROM settings WHERE key = ?", key).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return v, err
}

// SetSetting guarda (o reemplaza) el valor de una clave.
func (d *DB) SetSetting(ctx context.Context, key, value string) error {
	_, err := d.sql.ExecContext(ctx, `INSERT INTO settings (key, value, updated_at) VALUES (?,?,?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, key, value, now())
	return err
}

// --- certificados --------------------------------------------------------------------------

// Certificate es un certificado emitido a un alumno por un curso. ID es el código público
// (CD-AAAA-XXXXXX). Snapshot congela los datos tal y como estaban al emitir.
type Certificate struct {
	ID         string
	UserID     string
	CourseID   string
	Tipo       string // participacion | aprobacion
	Horas      int
	Nota       string
	EmitidoPor string
	EmitidoEn  time.Time
	AnuladoEn  *time.Time
	Snapshot   string // JSON
}

// Anulado dice si el certificado fue revocado.
func (c *Certificate) Anulado() bool { return c.AnuladoEn != nil }

const certCols = "id, user_id, course_id, tipo, horas, nota, emitido_por, emitido_en, anulado_en, snapshot_json"

func scanCertificate(row interface{ Scan(...any) error }) (*Certificate, error) {
	var c Certificate
	var emitido string
	var anulado sql.NullString
	if err := row.Scan(&c.ID, &c.UserID, &c.CourseID, &c.Tipo, &c.Horas, &c.Nota, &c.EmitidoPor, &emitido, &anulado, &c.Snapshot); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	c.EmitidoEn = parseTime(emitido)
	if anulado.Valid {
		t := parseTime(anulado.String)
		c.AnuladoEn = &t
	}
	return &c, nil
}

// ErrDuplicate indica que la clave primaria ya existe.
var ErrDuplicate = errors.New("duplicado")

// CreateCertificate inserta un certificado con el id (código) ya puesto.
func (d *DB) CreateCertificate(ctx context.Context, c *Certificate) error {
	if c.EmitidoEn.IsZero() {
		c.EmitidoEn = time.Now().UTC()
	}
	if c.Snapshot == "" {
		c.Snapshot = "{}"
	}
	_, err := d.sql.ExecContext(ctx, "INSERT INTO certificates (id, user_id, course_id, tipo, horas, nota, emitido_por, emitido_en, snapshot_json) VALUES (?,?,?,?,?,?,?,?,?)",
		c.ID, c.UserID, c.CourseID, c.Tipo, c.Horas, c.Nota, c.EmitidoPor, c.EmitidoEn.Format(time.RFC3339), c.Snapshot)
	if err != nil && strings.Contains(err.Error(), "UNIQUE") {
		return ErrDuplicate
	}
	return err
}

// Certificate busca por código.
func (d *DB) Certificate(ctx context.Context, id string) (*Certificate, error) {
	return scanCertificate(d.sql.QueryRowContext(ctx, "SELECT "+certCols+" FROM certificates WHERE id = ?", id))
}

// ActiveCertificate devuelve el certificado vigente (no anulado) de un alumno en un curso.
func (d *DB) ActiveCertificate(ctx context.Context, userID, courseID string) (*Certificate, error) {
	return scanCertificate(d.sql.QueryRowContext(ctx, "SELECT "+certCols+" FROM certificates WHERE user_id = ? AND course_id = ? AND anulado_en IS NULL ORDER BY emitido_en DESC LIMIT 1", userID, courseID))
}

// Certificates lista certificados: por curso (courseID) y/o por alumno (userID); vacío = sin filtro.
func (d *DB) Certificates(ctx context.Context, courseID, userID string) ([]*Certificate, error) {
	q := "SELECT " + certCols + " FROM certificates WHERE 1=1"
	var args []any
	if courseID != "" {
		q += " AND course_id = ?"
		args = append(args, courseID)
	}
	if userID != "" {
		q += " AND user_id = ?"
		args = append(args, userID)
	}
	q += " ORDER BY emitido_en DESC"
	rows, err := d.sql.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Certificate{}
	for rows.Next() {
		c, err := scanCertificate(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// RevokeCertificate anula un certificado; ErrNotFound si no existe o ya estaba anulado.
func (d *DB) RevokeCertificate(ctx context.Context, id string) error {
	res, err := d.sql.ExecContext(ctx, "UPDATE certificates SET anulado_en = ? WHERE id = ? AND anulado_en IS NULL", now(), id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
