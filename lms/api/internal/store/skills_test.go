package store

import (
	"context"
	"path/filepath"
	"testing"
)

// Cada alumno solo ve y toca lo suyo; la versión sube al guardar de nuevo.
func TestSkillsAisladas(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()

	a := &Skill{UserID: "A", Nombre: "piedra-mia", Descripcion: "Respuestas secas", Cuerpo: "---\nname: piedra-mia\n---\nx", Variantes: map[string]string{"deepseek": "corta"}}
	if err := db.UpsertSkill(ctx, a); err != nil {
		t.Fatal(err)
	}
	if a.Version != 1 || a.ID == "" || a.ModeloDestino != "generico" || a.Origen != "propia" {
		t.Fatalf("tras crear: %+v", a)
	}
	if _, err := db.Skill(ctx, "B", "piedra-mia"); err != ErrNotFound {
		t.Fatalf("B no debe ver la de A: %v", err)
	}
	if err := db.DeleteSkill(ctx, "B", "piedra-mia"); err != ErrNotFound {
		t.Fatalf("B no debe borrar la de A: %v", err)
	}
	if l, _ := db.Skills(ctx, "B"); len(l) != 0 {
		t.Fatalf("B no debe listar nada: %v", l)
	}
	a2 := &Skill{UserID: "A", Nombre: "piedra-mia", Descripcion: "Respuestas secas v2", Cuerpo: "v2"}
	if err := db.UpsertSkill(ctx, a2); err != nil {
		t.Fatal(err)
	}
	if a2.Version != 2 || a2.Descripcion != "Respuestas secas v2" || a2.ID != a.ID {
		t.Fatalf("segunda: %+v", a2)
	}
	// El mismo nombre en otra cuenta es otra skill.
	b := &Skill{UserID: "B", Nombre: "piedra-mia", Cuerpo: "de B"}
	if err := db.UpsertSkill(ctx, b); err != nil || b.Version != 1 {
		t.Fatalf("B: %+v %v", b, err)
	}
	if g, _ := db.Skill(ctx, "A", "piedra-mia"); g.Cuerpo != "v2" {
		t.Fatalf("A conserva lo suyo: %+v", g)
	}
	// Compartidas: solo las marcadas.
	b.Compartida = true
	if err := db.UpsertSkill(ctx, b); err != nil {
		t.Fatal(err)
	}
	if c, _ := db.SkillsCompartidas(ctx); len(c) != 1 || c[0].UserID != "B" {
		t.Fatalf("compartidas: %v", c)
	}
	if err := db.DeleteSkill(ctx, "A", "piedra-mia"); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Skill(ctx, "A", "piedra-mia"); err != ErrNotFound {
		t.Fatalf("tras borrar: %v", err)
	}
}
