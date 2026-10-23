package store

import (
	"context"
	"strings"
	"time"
)

// Sorteo: rifa de cupos de un curso nuevo. Participa quien ya tiene cuenta
// (el correo debe existir en users); los ganadores entran a la cohorte del
// premio. Tablas en el schema de store.go.
type SorteoParticipante struct {
	UserID   string
	Email    string
	Nombre   string
	CreadaEn time.Time
}

type SorteoGanador struct {
	UserID    string
	Email     string
	Nombre    string
	Posicion  int
	Sorteado  time.Time
}

// SorteoYaParticipa se devuelve al anotar dos veces el mismo correo.
type yaInscrito struct{ msg string }

func (e yaInscrito) Error() string { return e.msg }

// YaInscrito dice si el error es duplicado (para responder 409).
func YaInscrito(err error) bool {
	_, ok := err.(yaInscrito)
	return ok
}

// SorteoParticipar anota al usuario una sola vez por sorteo.
func (d *DB) SorteoParticipar(ctx context.Context, sorteoID, userID, email string) error {
	_, err := d.sql.ExecContext(ctx, `INSERT INTO sorteo_participantes (sorteo_id, user_id, email, creada_en) VALUES (?,?,?,?)`,
		sorteoID, userID, strings.ToLower(strings.TrimSpace(email)), time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "PRIMARY") {
			return yaInscrito{"ese correo ya participa en este sorteo"}
		}
		return err
	}
	return nil
}

// SorteoParticipantes los anotados (con nombre), en orden de llegada.
func (d *DB) SorteoParticipantes(ctx context.Context, sorteoID string) ([]SorteoParticipante, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT p.user_id, p.email, COALESCE(u.name,''), p.creada_en FROM sorteo_participantes p LEFT JOIN users u ON u.id = p.user_id WHERE p.sorteo_id = ? ORDER BY p.creada_en`, sorteoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SorteoParticipante
	for rows.Next() {
		var p SorteoParticipante
		var creada string
		if err := rows.Scan(&p.UserID, &p.Email, &p.Nombre, &creada); err != nil {
			return nil, err
		}
		p.CreadaEn, _ = time.Parse(time.RFC3339, creada)
		out = append(out, p)
	}
	return out, rows.Err()
}

// SorteoGanadores los ya sorteados, por posición.
func (d *DB) SorteoGanadores(ctx context.Context, sorteoID string) ([]SorteoGanador, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT user_id, email, nombre, posicion, sorteado_en FROM sorteo_ganadores WHERE sorteo_id = ? ORDER BY posicion`, sorteoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SorteoGanador
	for rows.Next() {
		var g SorteoGanador
		var cuando string
		if err := rows.Scan(&g.UserID, &g.Email, &g.Nombre, &g.Posicion, &cuando); err != nil {
			return nil, err
		}
		g.Sorteado, _ = time.Parse(time.RFC3339, cuando)
		out = append(out, g)
	}
	return out, rows.Err()
}

// SorteoAgregarGanador registra al ganador en su posición.
func (d *DB) SorteoAgregarGanador(ctx context.Context, sorteoID, userID, email, nombre string, posicion int) error {
	_, err := d.sql.ExecContext(ctx, `INSERT INTO sorteo_ganadores (sorteo_id, user_id, email, nombre, posicion, sorteado_en) VALUES (?,?,?,?,?,?)`,
		sorteoID, userID, email, nombre, posicion, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "PRIMARY") {
			return nil // ya estaba: no duplica
		}
		return err
	}
	return nil
}
