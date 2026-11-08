package store

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Opiniones de las clases (ver httpapi/opiniones.go): cada alumno deja una por sesión, de 1 a 5
// estrellas y un texto corto; volver a enviarla la edita. Los «me gusta» van en opinion_likes, uno por
// persona y opinión. Ocultar es moderación del personal: la fila queda, pero los alumnos no la ven.

// Opinion es una fila de opiniones con su autor y sus «me gusta» vistos por quien pregunta.
type Opinion struct {
	ID            string
	UserID        string
	CourseID      string
	LessonID      string
	Estrellas     int
	Texto         string
	Oculta        bool
	CreadaEn      time.Time
	ActualizadaEn time.Time
	Nombre        string // users.name del autor (el API muestra solo el primer nombre)
	Likes         int
	MeGusta       bool // quien pregunta ya le dio «me gusta»
}

// opinionSelect lee la opinión con el nombre del autor y el conteo de «me gusta»; el primer «?» es el
// usuario que pregunta (para MeGusta).
const opinionSelect = `SELECT o.id, o.user_id, o.course_id, o.lesson_id, o.estrellas, o.texto, o.oculta,
	o.creada_en, o.actualizada_en, COALESCE(u.name, ''),
	(SELECT count(*) FROM opinion_likes k WHERE k.opinion_id = o.id),
	EXISTS (SELECT 1 FROM opinion_likes k WHERE k.opinion_id = o.id AND k.user_id = ?)
	FROM opiniones o LEFT JOIN users u ON u.id = o.user_id`

func scanOpinion(row interface{ Scan(...any) error }) (*Opinion, error) {
	o := &Opinion{}
	var creada, actualizada string
	var oculta, meGusta int
	err := row.Scan(&o.ID, &o.UserID, &o.CourseID, &o.LessonID, &o.Estrellas, &o.Texto, &oculta, &creada, &actualizada, &o.Nombre, &o.Likes, &meGusta)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	o.Oculta, o.MeGusta = oculta != 0, meGusta != 0
	o.CreadaEn, o.ActualizadaEn = parseTime(creada), parseTime(actualizada)
	return o, nil
}

// GuardarOpinion crea o edita la opinión del alumno sobre la sesión (una por alumno y sesión). Editar
// conserva el id, los «me gusta» y la moderación: una opinión oculta sigue oculta aunque se reescriba.
func (d *DB) GuardarOpinion(ctx context.Context, userID, courseID, lessonID string, estrellas int, texto string) (*Opinion, error) {
	t := now()
	_, err := d.sql.ExecContext(ctx, `INSERT INTO opiniones (id, user_id, course_id, lesson_id, estrellas, texto, creada_en, actualizada_en)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (user_id, lesson_id) DO UPDATE SET estrellas = excluded.estrellas, texto = excluded.texto,
		course_id = excluded.course_id, actualizada_en = excluded.actualizada_en`,
		NewID(), userID, courseID, lessonID, estrellas, texto, t, t)
	if err != nil {
		return nil, err
	}
	return d.OpinionDe(ctx, userID, lessonID)
}

// OpinionDe devuelve la opinión del alumno sobre la sesión (ErrNotFound si aún no opina).
func (d *DB) OpinionDe(ctx context.Context, userID, lessonID string) (*Opinion, error) {
	return scanOpinion(d.sql.QueryRowContext(ctx, opinionSelect+` WHERE o.user_id = ? AND o.lesson_id = ?`, userID, userID, lessonID))
}

// Opinion devuelve una opinión por id, con MeGusta según viewerID.
func (d *DB) Opinion(ctx context.Context, id, viewerID string) (*Opinion, error) {
	return scanOpinion(d.sql.QueryRowContext(ctx, opinionSelect+` WHERE o.id = ?`, viewerID, id))
}

// OpinionesCurso lista las opiniones del curso, las más gustadas primero y, a igual número, las más
// recientes. Sin conOcultas se omiten las que el personal ocultó.
func (d *DB) OpinionesCurso(ctx context.Context, courseID, viewerID string, conOcultas bool) ([]*Opinion, error) {
	q := `SELECT * FROM (` + opinionSelect + ` WHERE o.course_id = ?`
	if !conOcultas {
		q += ` AND o.oculta = 0`
	}
	// Columnas 11 (likes) y 9 (actualizada_en) del SELECT interno; el id desempata para un orden estable.
	q += `) ORDER BY 11 DESC, 9 DESC, 1`
	rows, err := d.sql.QueryContext(ctx, q, viewerID, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Opinion{}
	for rows.Next() {
		o, err := scanOpinion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

// AlternarMeGusta pone o quita el «me gusta» de userID en la opinión y devuelve el conteo nuevo y si
// quedó puesto. Las reglas (no a la propia, no a una oculta) las aplica el API.
func (d *DB) AlternarMeGusta(ctx context.Context, opinionID, userID string) (likes int, meGusta bool, err error) {
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, `DELETE FROM opinion_likes WHERE opinion_id = ? AND user_id = ?`, opinionID, userID)
	if err != nil {
		return 0, false, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		if _, err := tx.ExecContext(ctx, `INSERT INTO opinion_likes (opinion_id, user_id, creado_en) VALUES (?, ?, ?)`, opinionID, userID, now()); err != nil {
			return 0, false, err
		}
		meGusta = true
	}
	if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM opinion_likes WHERE opinion_id = ?`, opinionID).Scan(&likes); err != nil {
		return 0, false, err
	}
	return likes, meGusta, tx.Commit()
}

// OcultarOpinion oculta (o vuelve a mostrar) la opinión; por es quien moderó.
func (d *DB) OcultarOpinion(ctx context.Context, id string, oculta bool, por string) error {
	v := 0
	if oculta {
		v = 1
	} else {
		por = ""
	}
	res, err := d.sql.ExecContext(ctx, `UPDATE opiniones SET oculta = ?, oculta_por = ? WHERE id = ?`, v, por, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
