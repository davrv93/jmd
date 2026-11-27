package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Laboratorio de ideas (curso «Design Thinking con Claude», 11-2026): la idea de cada alumno —su reto,
// la entrevista, el tablero de la lluvia de ideas, el MVP, la prueba— es un JSON que la escena del LIVE
// arma y guarda entero. Una fila por alumno y curso: así la idea sigue de una sesión a otra y de un equipo
// a otro, y el instructor puede verla. El servidor no interpreta el JSON salvo para el resumen del grupo.

const tablaLaboratorios = `CREATE TABLE IF NOT EXISTS laboratorios (
	user_id TEXT NOT NULL, course_id TEXT NOT NULL, datos TEXT NOT NULL, actualizado_en TEXT NOT NULL,
	PRIMARY KEY (user_id, course_id));`

// Laboratorio es la idea guardada de un alumno en un curso.
type Laboratorio struct {
	UserID        string
	CourseID      string
	Nombre        string // users.name (solo en el resumen del grupo)
	Datos         string // JSON tal como lo guardó la escena
	ActualizadoEn time.Time
}

// LeerLaboratorio devuelve el laboratorio del alumno en el curso, o ErrNotFound si todavía no guardó nada.
func (d *DB) LeerLaboratorio(ctx context.Context, userID, courseID string) (*Laboratorio, error) {
	l := &Laboratorio{UserID: userID, CourseID: courseID}
	var t string
	err := d.sql.QueryRowContext(ctx, `SELECT datos, actualizado_en FROM laboratorios WHERE user_id = ? AND course_id = ?`,
		userID, courseID).Scan(&l.Datos, &t)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	l.ActualizadoEn = parseTime(t)
	return l, nil
}

// GuardarLaboratorio reemplaza el laboratorio del alumno en el curso y devuelve la hora del servidor.
func (d *DB) GuardarLaboratorio(ctx context.Context, userID, courseID, datos string) (time.Time, error) {
	t := now()
	_, err := d.sql.ExecContext(ctx, `INSERT INTO laboratorios (user_id, course_id, datos, actualizado_en) VALUES (?, ?, ?, ?)
		ON CONFLICT (user_id, course_id) DO UPDATE SET datos = excluded.datos, actualizado_en = excluded.actualizado_en`,
		userID, courseID, datos, t)
	if err != nil {
		return time.Time{}, err
	}
	return parseTime(t), nil
}

// LaboratoriosCurso lista los laboratorios del curso con el nombre de cada alumno, el más reciente primero.
func (d *DB) LaboratoriosCurso(ctx context.Context, courseID string) ([]Laboratorio, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT l.user_id, COALESCE(u.name, ''), l.datos, l.actualizado_en
		FROM laboratorios l LEFT JOIN users u ON u.id = l.user_id WHERE l.course_id = ? ORDER BY l.actualizado_en DESC`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Laboratorio
	for rows.Next() {
		l := Laboratorio{CourseID: courseID}
		var t string
		if err := rows.Scan(&l.UserID, &l.Nombre, &l.Datos, &t); err != nil {
			return nil, err
		}
		l.ActualizadoEn = parseTime(t)
		out = append(out, l)
	}
	return out, rows.Err()
}
