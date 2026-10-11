package store

import (
	"context"
	"path/filepath"
	"testing"
	"time"
)

// El estado del LIVE se crea, se lee y se actualiza (upsert sobre la misma fila).
func TestLiveSessionUpsert(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()
	now := time.Now().UTC()

	if _, err := db.LiveSession(ctx, "pa-02"); err != ErrNotFound {
		t.Fatalf("sin fila debería ser ErrNotFound, fue %v", err)
	}
	if err := db.UpsertLiveSession(ctx, &LiveSession{LessonID: "pa-02", Estado: "en_vivo", Visible: true, Modo: "guiado", IniciadaPor: "u1", IniciadaEn: &now}); err != nil {
		t.Fatal(err)
	}
	s, err := db.LiveSession(ctx, "pa-02")
	if err != nil {
		t.Fatal(err)
	}
	if s.Estado != "en_vivo" || !s.Visible || s.Modo != "guiado" || s.IniciadaPor != "u1" || s.IniciadaEn == nil {
		t.Fatalf("leída tras crear: %+v", s)
	}

	s.Escena = "03-tu-laptop"
	s.Estado = "en_vivo"
	if err := db.UpsertLiveSession(ctx, s); err != nil {
		t.Fatal(err)
	}
	s2, err := db.LiveSession(ctx, "pa-02")
	if err != nil {
		t.Fatal(err)
	}
	if s2.Estado != "en_vivo" || s2.Escena != "03-tu-laptop" {
		t.Fatalf("tras upsert: %+v", s2)
	}

	// Cerrar no borra la fila.
	s2.Estado = "cerrada"
	s2.CerradaEn = &s2.ActualizadaEn
	if err := db.UpsertLiveSession(ctx, s2); err != nil {
		t.Fatal(err)
	}
	if s3, err := db.LiveSession(ctx, "pa-02"); err != nil || s3.Estado != "cerrada" || s3.CerradaEn == nil {
		t.Fatalf("tras cerrar: %+v %v", s3, err)
	}
}
