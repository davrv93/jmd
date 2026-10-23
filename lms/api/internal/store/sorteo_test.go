package store

import (
	"path/filepath"
	"testing"
)

func TestSorteoNumeroDeRifa(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := t.Context()
	correos := []string{"a@x.test", "b@x.test", "c@x.test", "d@x.test"}
	for i, correo := range correos {
		if err := db.CreateUser(ctx, &User{Email: correo, Name: "Persona", PasswordHash: "x"}); err != nil {
			t.Fatalf("alta %d: %v", i, err)
		}
	}
	uids := []string{}
	for _, correo := range correos {
		u, err := db.UserByEmail(ctx, correo)
		if err != nil {
			t.Fatal(err)
		}
		uids = append(uids, u.ID)
	}
	numeros := map[int]bool{}
	for i, uid := range uids[:3] { // los tres primeros se anotan; el cuarto es el viejo (backfill)
		n, err := db.SorteoParticipar(ctx, "rifa", uid, "A@X.test")
		if err != nil || n < 1 || n > 9999 {
			t.Fatalf("participante %d: numero=%d err=%v", i, n, err)
		}
		if numeros[n] {
			t.Fatalf("número repetido: %d", n)
		}
		numeros[n] = true
		if db.SorteoNumeroDe(ctx, "rifa", uid) != n {
			t.Fatalf("SorteoNumeroDe no devuelve %d", n)
		}
	}
	// el mismo usuario no se anota dos veces (y no cambia de número)
	if _, err := db.SorteoParticipar(ctx, "rifa", uids[0], "a@x.test"); !YaInscrito(err) {
		t.Fatalf("esperaba ya_inscrito, llegó %v", err)
	}
	if db.SorteoNumeroDe(ctx, "rifa", uids[0]) != db.SorteoNumeroDe(ctx, "rifa", uids[0]) {
		t.Fatal("el número debe ser estable")
	}
	// un sorteo distinto tiene su propia baraja
	n2, err := db.SorteoParticipar(ctx, "otra-rifa", uids[0], "a@x.test")
	if err != nil || n2 < 1 {
		t.Fatalf("otro sorteo: %d %v", n2, err)
	}
	// el backfill completa las filas de antes del cambio (número NULL)
	if _, err := db.sql.ExecContext(ctx,
		`INSERT INTO sorteo_participantes (sorteo_id, user_id, email, creada_en) VALUES ('rifa',?,?, '2026-10-01T00:00:00Z')`,
		uids[3], "d@x.test"); err != nil {
		t.Fatal(err)
	}
	ps, err := db.SorteoParticipantes(ctx, "rifa")
	if err != nil {
		t.Fatal(err)
	}
	vistos := map[int]bool{}
	for _, p := range ps {
		if p.Numero < 1 || vistos[p.Numero] {
			t.Fatalf("participante sin número o repetido: %+v", p)
		}
		vistos[p.Numero] = true
	}
	// ganador con su número
	if err := db.SorteoAgregarGanador(ctx, "rifa", uids[0], "a@x.test", "Persona", 1, 4242); err != nil {
		t.Fatal(err)
	}
	gans, err := db.SorteoGanadores(ctx, "rifa")
	if err != nil || len(gans) != 1 || gans[0].Numero != 4242 || gans[0].Posicion != 1 {
		t.Fatalf("ganador: %+v %v", gans, err)
	}
}
