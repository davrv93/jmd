package store

import (
	"context"
	"database/sql"
	"errors"
	"math/rand/v2"
	"strings"
	"time"
)

// Sorteo: rifa de cupos de un curso nuevo. Participa quien ya tiene cuenta
// (el correo debe existir en users); al anotarse recibe un NÚMERO aleatorio
// que no cambia — el sorteo se hace sobre esos números, fijados desde el
// registro. Los ganadores entran a la cohorte del premio. Tablas en store.go.

type SorteoParticipante struct {
	UserID   string
	Email    string
	Nombre   string
	Numero   int // 0 = aún sin asignar (el backfill lo completa)
	CreadaEn time.Time
}

type SorteoGanador struct {
	UserID   string
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

// SorteoParticipar anota al usuario y le asigna su número de rifa (aleatorio,
// único dentro del sorteo; se reintentan las colisiones). Devuelve el número.
func (d *DB) SorteoParticipar(ctx context.Context, sorteoID, userID, email string) (int, error) {
	correo := strings.ToLower(strings.TrimSpace(email))
	creada := time.Now().UTC().Format(time.RFC3339)
	for intento := 0; intento < 16; intento++ {
		numero := rand.IntN(9999) + 1
		_, err := d.sql.ExecContext(ctx,
			`INSERT INTO sorteo_participantes (sorteo_id, user_id, email, numero, creada_en) VALUES (?,?,?,?,?)`,
			sorteoID, userID, correo, numero, creada)
		if err == nil {
			return numero, nil
		}
		msg := err.Error()
		if strings.Contains(msg, "UNIQUE") {
			if strings.Contains(msg, "user_id") {
				return 0, yaInscrito{"ese correo ya participa en este sorteo"}
			}
			continue // número tomado: otro
		}
		return 0, err
	}
	return 0, errors.New("no se pudo asignar un número de rifa")
}

// SorteoNumeroDe el número de quien ya participa (0 si no está).
func (d *DB) SorteoNumeroDe(ctx context.Context, sorteoID, userID string) int {
	var n sql.NullInt64
	_ = d.sql.QueryRowContext(ctx,
		`SELECT numero FROM sorteo_participantes WHERE sorteo_id = ? AND user_id = ?`,
		sorteoID, userID).Scan(&n)
	if n.Valid {
		return int(n.Int64)
	}
	return 0
}

// sorteoBackfill completa los números que falten (filas de antes del cambio).
// Se hace en la lectura: es una sola corrida y después no hay NULL.
func (d *DB) sorteoBackfill(ctx context.Context, sorteoID string) {
	rows, err := d.sql.QueryContext(ctx,
		`SELECT user_id FROM sorteo_participantes WHERE sorteo_id = ? AND (numero IS NULL OR numero = 0)`, sorteoID)
	if err != nil {
		return
	}
	var faltan []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			faltan = append(faltan, id)
		}
	}
	rows.Close()
	for _, uid := range faltan {
		for intento := 0; intento < 16; intento++ {
			numero := rand.IntN(9999) + 1
			_, err := d.sql.ExecContext(ctx,
				`UPDATE sorteo_participantes SET numero = ? WHERE sorteo_id = ? AND user_id = ? AND (numero IS NULL OR numero = 0)`,
				numero, sorteoID, uid)
			if err == nil || strings.Contains(err.Error(), "no rows") {
				break
			}
			if strings.Contains(err.Error(), "UNIQUE") && !strings.Contains(err.Error(), "user_id") {
				continue
			}
			break
		}
	}
}

// SorteoParticipantes los anotados (con nombre y número), en orden de llegada.
func (d *DB) SorteoParticipantes(ctx context.Context, sorteoID string) ([]SorteoParticipante, error) {
	d.sorteoBackfill(ctx, sorteoID)
	rows, err := d.sql.QueryContext(ctx, `SELECT p.user_id, p.email, COALESCE(u.name,''), COALESCE(p.numero,0), p.creada_en
		FROM sorteo_participantes p LEFT JOIN users u ON u.id = p.user_id WHERE p.sorteo_id = ? ORDER BY p.creada_en`, sorteoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SorteoParticipante
	for rows.Next() {
		var p SorteoParticipante
		var creada string
		if err := rows.Scan(&p.UserID, &p.Email, &p.Nombre, &p.Numero, &creada); err != nil {
			return nil, err
		}
		p.CreadaEn, _ = time.Parse(time.RFC3339, creada)
		out = append(out, p)
	}
	return out, rows.Err()
}

// SorteoGanadores los ya sorteados, por posición.
func (d *DB) SorteoGanadores(ctx context.Context, sorteoID string) ([]SorteoGanador, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT user_id, email, nombre, COALESCE(numero,0), posicion, sorteado_en
		FROM sorteo_ganadores WHERE sorteo_id = ? ORDER BY posicion`, sorteoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SorteoGanador
	for rows.Next() {
		var g SorteoGanador
		var cuando string
		if err := rows.Scan(&g.UserID, &g.Email, &g.Nombre, &g.Numero, &g.Posicion, &cuando); err != nil {
			return nil, err
		}
		g.Sorteado, _ = time.Parse(time.RFC3339, cuando)
		out = append(out, g)
	}
	return out, rows.Err()
}

// SorteoAgregarGanador registra al ganador en su posición (con su número).
func (d *DB) SorteoAgregarGanador(ctx context.Context, sorteoID, userID, email, nombre string, posicion, numero int) error {
	_, err := d.sql.ExecContext(ctx,
		`INSERT INTO sorteo_ganadores (sorteo_id, user_id, email, nombre, posicion, numero, sorteado_en) VALUES (?,?,?,?,?,?,?)`,
		sorteoID, userID, email, nombre, posicion, numero, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "PRIMARY") {
			return nil // ya estaba: no duplica
		}
		return err
	}
	return nil
}
