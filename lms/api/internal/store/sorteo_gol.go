package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// Sorteo con premios del instructor (ver httpapi/sorteo_gol.go): cada inscrito gira una sola vez y su resultado queda
// fijo. El índice único de premio hace que un premio único no pueda salir dos veces, aunque lleguen dos giros juntos.

// GiroGol es el resultado de una persona.
type GiroGol struct {
	Email   string `json:"email"`
	Nombre  string `json:"nombre"`
	UserID  string `json:"-"`
	Premio  string `json:"premio"` // "descuento" o el id de un premio único
	Pct     int    `json:"pct"`
	Precio  int    `json:"precio"`
	Codigo  string `json:"codigo"`
	CreadoE string `json:"creado_en"`
}

const giroGolCols = "email, nombre, user_id, premio, pct, precio, codigo, creado_en"

func scanGiroGol(row interface{ Scan(...any) error }) (*GiroGol, error) {
	g := &GiroGol{}
	err := row.Scan(&g.Email, &g.Nombre, &g.UserID, &g.Premio, &g.Pct, &g.Precio, &g.Codigo, &g.CreadoE)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return g, err
}

// GiroGolDe devuelve el giro de esa cuenta en el sorteo (ErrNotFound si aún no gira).
func (d *DB) GiroGolDe(ctx context.Context, sorteoID, userID string) (*GiroGol, error) {
	return scanGiroGol(d.sql.QueryRowContext(ctx, "SELECT "+giroGolCols+" FROM sorteo_gol WHERE sorteo_id = ? AND user_id = ?", sorteoID, userID))
}

// GuardarGiroGol anota el giro. Con un premio único ya entregado devuelve ErrPremioTomado: hay que volver a sortear.
func (d *DB) GuardarGiroGol(ctx context.Context, sorteoID string, g *GiroGol) error {
	g.CreadoE = time.Now().UTC().Format(time.RFC3339)
	_, err := d.sql.ExecContext(ctx, "INSERT INTO sorteo_gol (sorteo_id, "+giroGolCols+") VALUES (?,?,?,?,?,?,?,?,?)",
		sorteoID, correoClave(g.Email), g.Nombre, g.UserID, g.Premio, g.Pct, g.Precio, g.Codigo, g.CreadoE)
	if err != nil && strings.Contains(err.Error(), "UNIQUE") {
		if strings.Contains(err.Error(), "premio") {
			return ErrPremioTomado
		}
		return yaInscrito{"esa cuenta ya giró"}
	}
	return err
}

// ErrPremioTomado: ese premio único ya tiene dueño.
var ErrPremioTomado = errors.New("premio ya entregado")

// GirosGol lista todos los giros, los más recientes primero.
func (d *DB) GirosGol(ctx context.Context, sorteoID string) ([]*GiroGol, error) {
	rows, err := d.sql.QueryContext(ctx, "SELECT "+giroGolCols+" FROM sorteo_gol WHERE sorteo_id = ? ORDER BY creado_en DESC", sorteoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*GiroGol{}
	for rows.Next() {
		g, err := scanGiroGol(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}
