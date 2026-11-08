package store

import (
	"context"
	"path/filepath"
	"testing"
)

// Una base de antes de las opiniones gana las dos tablas al abrirse; la opinión es una por alumno y
// sesión, y la lista va por «me gusta» y, a igual número, por la más reciente.
func TestOpinionesTablasYOrden(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "o.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	// Simula una base vieja: sin las tablas nuevas, y se vuelve a abrir.
	if _, err := db.sql.Exec(`DROP TABLE opinion_likes; DROP TABLE opiniones;`); err != nil {
		t.Fatal(err)
	}
	db.Close()
	db, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	usuarios := []string{}
	for _, n := range []string{"Ana", "Beto", "Caro"} {
		u := &User{Email: n + "@x", Name: n + " Pérez", Roles: []string{"student"}}
		if err := db.CreateUser(ctx, u); err != nil {
			t.Fatal(err)
		}
		usuarios = append(usuarios, u.ID)
	}
	ana, beto, caro := usuarios[0], usuarios[1], usuarios[2]
	oa, err := db.GuardarOpinion(ctx, ana, "curso", "l1", 4, "uno")
	if err != nil {
		t.Fatal(err)
	}
	ob, _ := db.GuardarOpinion(ctx, beto, "curso", "l1", 5, "dos")
	oc, _ := db.GuardarOpinion(ctx, caro, "curso", "l1", 3, "tres")
	// Editar: mismo id, texto nuevo.
	if o, err := db.GuardarOpinion(ctx, ana, "curso", "l1", 2, "uno bis"); err != nil || o.ID != oa.ID || o.Estrellas != 2 || o.Texto != "uno bis" || o.Nombre != "Ana Pérez" {
		t.Fatalf("editar: %+v %v", o, err)
	}
	// Fechas fijas para que el desempate no dependa del reloj: Ana la más vieja, Caro la más nueva.
	for id, f := range map[string]string{oa.ID: "2026-01-01T00:00:00Z", ob.ID: "2026-02-01T00:00:00Z", oc.ID: "2026-03-01T00:00:00Z"} {
		if _, err := db.sql.Exec(`UPDATE opiniones SET actualizada_en = ? WHERE id = ?`, f, id); err != nil {
			t.Fatal(err)
		}
	}
	// Un «me gusta» para Ana: va primero; Beto y Caro empatan en cero y gana la más reciente (Caro).
	if n, on, err := db.AlternarMeGusta(ctx, oa.ID, beto); err != nil || n != 1 || !on {
		t.Fatalf("me gusta: %d %v %v", n, on, err)
	}
	lista, err := db.OpinionesCurso(ctx, "curso", beto, false)
	if err != nil || len(lista) != 3 {
		t.Fatalf("lista: %v %v", lista, err)
	}
	if lista[0].ID != oa.ID || lista[1].ID != oc.ID || lista[2].ID != ob.ID || !lista[0].MeGusta || lista[0].Likes != 1 {
		t.Fatalf("orden: %s %s %s", lista[0].Texto, lista[1].Texto, lista[2].Texto)
	}
	// Quitar el «me gusta» y ocultar.
	if n, on, _ := db.AlternarMeGusta(ctx, oa.ID, beto); n != 0 || on {
		t.Fatalf("quitar: %d %v", n, on)
	}
	if err := db.OcultarOpinion(ctx, oc.ID, true, "profe"); err != nil {
		t.Fatal(err)
	}
	if l, _ := db.OpinionesCurso(ctx, "curso", beto, false); len(l) != 2 {
		t.Fatalf("sin ocultas: %d", len(l))
	}
	if l, _ := db.OpinionesCurso(ctx, "curso", beto, true); len(l) != 3 {
		t.Fatalf("con ocultas: %d", len(l))
	}
	if err := db.OcultarOpinion(ctx, "nada", true, "profe"); err != ErrNotFound {
		t.Fatalf("ocultar inexistente: %v", err)
	}
	// Borrar al usuario borra su opinión y sus «me gusta» (ON DELETE CASCADE).
	if _, err := db.sql.Exec(`DELETE FROM users WHERE id = ?`, caro); err != nil {
		t.Fatal(err)
	}
	if l, _ := db.OpinionesCurso(ctx, "curso", beto, true); len(l) != 2 {
		t.Fatalf("tras borrar usuario: %d", len(l))
	}
}
