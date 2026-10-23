package store

import (
	"path/filepath"
	"testing"
)

func TestSorteoParticipaCualquierCorreo(t *testing.T) {
	db, err := Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := t.Context()
	// una cuenta real, para probar que se guarda su nombre
	if err := db.CreateUser(ctx, &User{Email: "ana@x.test", Name: "Ana Torres", PasswordHash: "x"}); err != nil {
		t.Fatal(err)
	}
	ana, _ := db.UserByEmail(ctx, "ana@x.test")

	// correo SIN cuenta: participa igual
	n1, err := db.SorteoParticipar(ctx, "rifa", "invitado@gmail.com", "")
	if err != nil || n1 < 1 || n1 > 9999 {
		t.Fatalf("invitado: numero=%d err=%v", n1, err)
	}
	// correo CON cuenta: participa y se guarda su user_id
	n2, err := db.SorteoParticipar(ctx, "rifa", "ANA@X.test", ana.ID)
	if err != nil || n2 == n1 {
		t.Fatalf("con cuenta: numero=%d err=%v (n1=%d)", n2, err, n1)
	}
	// repetir: mismo número, error de duplicado
	if _, err := db.SorteoParticipar(ctx, "rifa", "invitado@gmail.com", ""); !YaInscrito(err) {
		t.Fatalf("esperaba yaInscrito, llegó %v", err)
	}
	if got := db.SorteoNumeroPorEmail(ctx, "rifa", "invitado@gmail.com"); got != n1 {
		t.Fatalf("el número debe ser estable: %d != %d", got, n1)
	}
	// el nombre solo aparece si el correo tiene cuenta
	ps, err := db.SorteoParticipantes(ctx, "rifa")
	if err != nil || len(ps) != 2 {
		t.Fatalf("participantes: %+v %v", ps, err)
	}
	nombres := map[string]string{}
	for _, p := range ps {
		nombres[p.Email] = p.Nombre
	}
	if nombres["ana@x.test"] != "Ana Torres" || nombres["invitado@gmail.com"] != "" {
		t.Fatalf("nombres: %+v", nombres)
	}
	// números únicos, también frente a los premios
	if err := db.SorteoAgregarGanador(ctx, "rifa", "invitado@gmail.com", "", 1, 4242); err != nil {
		t.Fatal(err)
	}
	n3, err := db.SorteoParticipar(ctx, "rifa", "otro@gmail.com", "")
	if err != nil || n3 == 4242 || n3 == n1 || n3 == n2 {
		t.Fatalf("n3=%d err=%v no debe chocar con los tomados", n3, err)
	}
	gano, num := db.SorteoPremioPendiente(ctx, "rifa", "INVITADO@gmail.com")
	if !gano || num != 4242 {
		t.Fatalf("premio pendiente: %v %d", gano, num)
	}
	if gano, _ := db.SorteoPremioPendiente(ctx, "rifa", "nadie@gmail.com"); gano {
		t.Fatal("nadie más ganó")
	}
	gans, err := db.SorteoGanadores(ctx, "rifa")
	if err != nil || len(gans) != 1 || gans[0].Numero != 4242 {
		t.Fatalf("ganadores: %+v %v", gans, err)
	}
}

// Los datos de las tablas viejas (clave por user_id) se copian al abrir.
func TestSorteoMigraTablasViejas(t *testing.T) {
	ruta := filepath.Join(t.TempDir(), "t.db")
	db, err := Open(ruta)
	if err != nil {
		t.Fatal(err)
	}
	ctx := t.Context()
	if err := db.CreateUser(ctx, &User{Email: "viejo@x.test", Name: "Viejo", PasswordHash: "x"}); err != nil {
		t.Fatal(err)
	}
	u, _ := db.UserByEmail(ctx, "viejo@x.test")
	// simula la tabla vieja con una fila
	if _, err := db.sql.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS sorteo_participantes (
		sorteo_id TEXT NOT NULL, user_id TEXT NOT NULL, email TEXT NOT NULL, creada_en TEXT NOT NULL,
		numero INTEGER, PRIMARY KEY (sorteo_id, user_id))`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.sql.ExecContext(ctx,
		`INSERT INTO sorteo_participantes (sorteo_id, user_id, email, creada_en, numero) VALUES ('rifa',?,?,?,4711)`,
		u.ID, "Viejo@X.test", "2026-10-01T00:00:00Z"); err != nil {
		t.Fatal(err)
	}
	db.Close()
	// reabrir corre migrate(): la fila debe quedar en sorteo_jugadas
	db2, err := Open(ruta)
	if err != nil {
		t.Fatal(err)
	}
	defer db2.Close()
	if n := db2.SorteoNumeroPorEmail(t.Context(), "rifa", "viejo@x.test"); n != 4711 {
		t.Fatalf("la fila vieja debe migrar con su número: %d", n)
	}
	ps, err := db2.SorteoParticipantes(t.Context(), "rifa")
	if err != nil || len(ps) != 1 || ps[0].Nombre != "Viejo" {
		t.Fatalf("participante migrado: %+v %v", ps, err)
	}
}
