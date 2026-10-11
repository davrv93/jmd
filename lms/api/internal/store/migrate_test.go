package store

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
)

// Una base creada antes de las insignias por clase (sin certificates.lesson_id) debe abrirse y
// ganar la columna sin perder las filas.
func TestMigracionLessonID(t *testing.T) {
	path := filepath.Join(t.TempDir(), "viejo.db")
	raw, err := sql.Open("sqlite", "file:"+path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = raw.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL DEFAULT '', roles TEXT NOT NULL DEFAULT '[]', cohorts TEXT NOT NULL DEFAULT '[]', provider TEXT NOT NULL DEFAULT 'local', created_at TEXT NOT NULL);
CREATE TABLE certificates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, course_id TEXT NOT NULL, tipo TEXT NOT NULL, horas INTEGER NOT NULL DEFAULT 0, nota TEXT NOT NULL DEFAULT '', emitido_por TEXT NOT NULL, emitido_en TEXT NOT NULL, anulado_en TEXT, snapshot_json TEXT NOT NULL DEFAULT '{}');
INSERT INTO users (id, email, name, created_at) VALUES ('u1', 'a@x', 'A', '2026-01-01T00:00:00Z');
INSERT INTO certificates (id, user_id, course_id, tipo, horas, emitido_por, emitido_en) VALUES ('CD-2026-ABCDEF', 'u1', 'curso', 'participacion', 6, 'p', '2026-01-02T00:00:00Z');`)
	if err != nil {
		t.Fatal(err)
	}
	raw.Close()
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	c, err := db.Certificate(context.Background(), "CD-2026-ABCDEF")
	if err != nil || c.LessonID != "" || c.CourseID != "curso" {
		t.Fatalf("certificado tras migrar: %+v %v", c, err)
	}
	if _, err := db.ActiveCertificate(context.Background(), "u1", "curso", ""); err != nil {
		t.Fatalf("vigente del curso tras migrar: %v", err)
	}
	if _, err := db.ActiveCertificate(context.Background(), "u1", "curso", "l1"); err != ErrNotFound {
		t.Fatalf("la clase l1 no debería tener certificado: %v", err)
	}
	// Abrir dos veces no falla (migración idempotente).
	db2, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	db2.Close()
}
