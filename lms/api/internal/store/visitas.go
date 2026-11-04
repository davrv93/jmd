package store

import (
	"context"
	"time"
)

// Visitas de las páginas públicas. La huella es un HMAC de la IP: sirve para contar personas distintas, no para
// saber quiénes son (ver httpapi/visitas.go).

// VisitaResumen cuenta una ruta.
type VisitaResumen struct {
	Ruta     string `json:"ruta"`
	Visitas  int    `json:"visitas"`
	Personas int    `json:"personas"`
	Ultima   string `json:"ultima"`
}

// SumarVisita anota una visita de esa huella a la ruta.
func (d *DB) SumarVisita(ctx context.Context, ruta, huella string) error {
	ahora := time.Now().UTC().Format(time.RFC3339)
	_, err := d.sql.ExecContext(ctx, `INSERT INTO visitas_publicas (ruta, huella, veces, ultima) VALUES (?,?,1,?)
		ON CONFLICT (ruta, huella) DO UPDATE SET veces = veces + 1, ultima = excluded.ultima`, ruta, huella, ahora)
	return err
}

// VisitasResumen devuelve el total por ruta.
func (d *DB) VisitasResumen(ctx context.Context) ([]VisitaResumen, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT ruta, SUM(veces), COUNT(*), MAX(ultima) FROM visitas_publicas GROUP BY ruta ORDER BY ruta`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []VisitaResumen{}
	for rows.Next() {
		var v VisitaResumen
		if err := rows.Scan(&v.Ruta, &v.Visitas, &v.Personas, &v.Ultima); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
