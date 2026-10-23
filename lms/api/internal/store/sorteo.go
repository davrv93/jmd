package store

import (
	"context"
	"errors"
	"math/rand/v2"
	"strings"
	"time"
)

// Sorteo: rifa de cupos. Participa CUALQUIER correo — con cuenta o sin ella
// (no es requisito estar inscrito). Al anotarse recibe un NÚMERO aleatorio que
// no cambia; el sorteo se hace sobre esos números, fijados desde el registro.
// Los ganadores con cuenta entran a la cohorte del premio; los que no tienen
// cuenta la reciben al inscribirse después con ese mismo correo.

type SorteoParticipante struct {
	Email    string
	Nombre   string // de users si ese correo tiene cuenta; "" si no
	Numero   int    // 0 = aún sin asignar (el backfill lo completa)
	UserID   string // "" = participó sin cuenta
	CreadaEn time.Time
}

type SorteoGanador struct {
	Email    string
	Nombre   string
	Numero   int
	Posicion int
	Sorteado time.Time
}

// SorteoYaParticipa se devuelve al anotar dos veces el mismo correo.
type yaInscrito struct{ msg string }

func (e yaInscrito) Error() string { return e.msg }

// YaInscrito dice si el error es duplicado (para responder 409).
func YaInscrito(err error) bool {
	_, ok := err.(yaInscrito)
	return ok
}

func correoClave(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// numerosUsados devuelve los números ya tomados en el sorteo (jugadas y premios).
func (d *DB) numerosUsados(ctx context.Context, sorteoID string) (map[int]bool, error) {
	usados := map[int]bool{}
	for _, q := range []string{
		`SELECT numero FROM sorteo_jugadas WHERE sorteo_id = ? AND numero IS NOT NULL`,
		`SELECT numero FROM sorteo_premios WHERE sorteo_id = ? AND numero IS NOT NULL`,
	} {
		rows, err := d.sql.QueryContext(ctx, q, sorteoID)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var n int
			if rows.Scan(&n) == nil {
				usados[n] = true
			}
		}
		rows.Close()
	}
	return usados, nil
}

// numeroLibre elige un número aleatorio (1–9999) que no esté tomado.
func (d *DB) numeroLibre(ctx context.Context, sorteoID string) (int, error) {
	usados, err := d.numerosUsados(ctx, sorteoID)
	if err != nil {
		return 0, err
	}
	for intento := 0; intento < 200; intento++ {
		n := rand.IntN(9999) + 1
		if !usados[n] {
			return n, nil
		}
	}
	return 0, errors.New("no quedan números libres en este sorteo")
}

// SorteoParticipar anota un correo y le da su número de rifa (único y estable).
// `userID` es opcional: "" cuando participa alguien sin cuenta.
func (d *DB) SorteoParticipar(ctx context.Context, sorteoID, email, userID string) (int, error) {
	correo := correoClave(email)
	if correo == "" {
		return 0, errors.New("correo vacío")
	}
	if n := d.SorteoNumeroPorEmail(ctx, sorteoID, correo); n > 0 {
		return 0, yaInscrito{"ese correo ya participa en este sorteo"}
	}
	numero, err := d.numeroLibre(ctx, sorteoID)
	if err != nil {
		return 0, err
	}
	_, err = d.sql.ExecContext(ctx,
		`INSERT INTO sorteo_jugadas (sorteo_id, email, user_id, numero, creada_en) VALUES (?,?,?,?,?)`,
		sorteoID, correo, userID, numero, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "PRIMARY") {
			return 0, yaInscrito{"ese correo ya participa en este sorteo"}
		}
		return 0, err
	}
	return numero, nil
}

// SorteoNumeroPorEmail el número de ese correo (0 si no participa).
func (d *DB) SorteoNumeroPorEmail(ctx context.Context, sorteoID, email string) int {
	var n int
	err := d.sql.QueryRowContext(ctx,
		`SELECT COALESCE(numero,0) FROM sorteo_jugadas WHERE sorteo_id = ? AND email = ?`,
		sorteoID, correoClave(email)).Scan(&n)
	if err != nil {
		return 0
	}
	return n
}

// sorteoBackfill completa los números que falten (filas migradas sin número).
func (d *DB) sorteoBackfill(ctx context.Context, sorteoID string) {
	rows, err := d.sql.QueryContext(ctx,
		`SELECT email FROM sorteo_jugadas WHERE sorteo_id = ? AND (numero IS NULL OR numero = 0)`, sorteoID)
	if err != nil {
		return
	}
	var faltan []string
	for rows.Next() {
		var e string
		if rows.Scan(&e) == nil {
			faltan = append(faltan, e)
		}
	}
	rows.Close()
	for _, correo := range faltan {
		n, err := d.numeroLibre(ctx, sorteoID)
		if err != nil {
			return
		}
		_, _ = d.sql.ExecContext(ctx,
			`UPDATE sorteo_jugadas SET numero = ? WHERE sorteo_id = ? AND email = ? AND (numero IS NULL OR numero = 0)`,
			n, sorteoID, correo)
	}
}

// SorteoParticipantes los anotados, con el nombre de su cuenta si la tienen.
func (d *DB) SorteoParticipantes(ctx context.Context, sorteoID string) ([]SorteoParticipante, error) {
	d.sorteoBackfill(ctx, sorteoID)
	rows, err := d.sql.QueryContext(ctx,
		`SELECT j.email, COALESCE(u.name,''), COALESCE(j.numero,0), j.user_id, j.creada_en
		 FROM sorteo_jugadas j LEFT JOIN users u ON lower(u.email) = j.email
		 WHERE j.sorteo_id = ? ORDER BY j.creada_en`, sorteoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SorteoParticipante
	for rows.Next() {
		var p SorteoParticipante
		var creada string
		if err := rows.Scan(&p.Email, &p.Nombre, &p.Numero, &p.UserID, &creada); err != nil {
			return nil, err
		}
		p.CreadaEn, _ = time.Parse(time.RFC3339, creada)
		out = append(out, p)
	}
	return out, rows.Err()
}

// SorteoGanadores los ya sorteados, por posición.
func (d *DB) SorteoGanadores(ctx context.Context, sorteoID string) ([]SorteoGanador, error) {
	rows, err := d.sql.QueryContext(ctx,
		`SELECT email, nombre, COALESCE(numero,0), posicion, sorteado_en
		 FROM sorteo_premios WHERE sorteo_id = ? ORDER BY posicion`, sorteoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SorteoGanador
	for rows.Next() {
		var g SorteoGanador
		var cuando string
		if err := rows.Scan(&g.Email, &g.Nombre, &g.Numero, &g.Posicion, &cuando); err != nil {
			return nil, err
		}
		g.Sorteado, _ = time.Parse(time.RFC3339, cuando)
		out = append(out, g)
	}
	return out, rows.Err()
}

// SorteoPremioPendiente dice si ese correo ya ganó (y con qué número). Sirve
// para entregarle la cohorte cuando se inscriba después sin haber tenido cuenta.
func (d *DB) SorteoPremioPendiente(ctx context.Context, sorteoID, email string) (bool, int) {
	var n int
	err := d.sql.QueryRowContext(ctx,
		`SELECT COALESCE(numero,0) FROM sorteo_premios WHERE sorteo_id = ? AND email = ?`,
		sorteoID, correoClave(email)).Scan(&n)
	if err != nil {
		return false, 0
	}
	return true, n
}

// SorteoAgregarGanador registra al ganador en su posición (con su número).
func (d *DB) SorteoAgregarGanador(ctx context.Context, sorteoID, email, nombre string, posicion, numero int) error {
	_, err := d.sql.ExecContext(ctx,
		`INSERT INTO sorteo_premios (sorteo_id, email, nombre, numero, posicion, sorteado_en) VALUES (?,?,?,?,?,?)`,
		sorteoID, correoClave(email), nombre, numero, posicion, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "PRIMARY") {
			return nil // ya estaba: no duplica
		}
		return err
	}
	return nil
}
