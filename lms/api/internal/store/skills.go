package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

// Skill es una skill de un alumno (instrucciones que el agente carga cuando las necesita).
// UserID vacío = skill del curso (solo lectura, no se guarda aquí). Variantes lleva el texto
// adaptado a cada perfil de modelo (clave = id del perfil).
type Skill struct {
	ID            string            `json:"id"`
	UserID        string            `json:"-"`
	Nombre        string            `json:"nombre"`
	Descripcion   string            `json:"descripcion"`
	Cuerpo        string            `json:"cuerpo"`
	ModeloDestino string            `json:"modelo_destino"`
	Variantes     map[string]string `json:"variantes"`
	Version       int               `json:"version"`
	Origen        string            `json:"origen"`
	Compartida    bool              `json:"compartida"`
	CreadaEn      time.Time         `json:"creada_en"`
	ActualizadaEn time.Time         `json:"actualizada_en"`
}

const skillCols = "id, user_id, nombre, descripcion, cuerpo, modelo_destino, variantes_json, version, origen, compartida, creada_en, actualizada_en"

func scanSkill(row interface{ Scan(...any) error }) (*Skill, error) {
	var s Skill
	var vj string
	var comp int
	var creada, actualizada string
	if err := row.Scan(&s.ID, &s.UserID, &s.Nombre, &s.Descripcion, &s.Cuerpo, &s.ModeloDestino, &vj, &s.Version, &s.Origen, &comp, &creada, &actualizada); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	s.Variantes = map[string]string{}
	_ = json.Unmarshal([]byte(vj), &s.Variantes)
	s.Compartida = comp == 1
	s.CreadaEn, s.ActualizadaEn = parseTime(creada), parseTime(actualizada)
	return &s, nil
}

func (d *DB) skills(ctx context.Context, where string, args ...any) ([]*Skill, error) {
	rows, err := d.sql.QueryContext(ctx, "SELECT "+skillCols+" FROM skills WHERE "+where+" ORDER BY nombre", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Skill{}
	for rows.Next() {
		s, err := scanSkill(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// Skills lista las skills propias de un alumno, por nombre.
func (d *DB) Skills(ctx context.Context, userID string) ([]*Skill, error) {
	return d.skills(ctx, "user_id = ?", userID)
}

// Skill devuelve una skill propia; ErrNotFound si no existe o es de otro alumno.
func (d *DB) Skill(ctx context.Context, userID, nombre string) (*Skill, error) {
	return scanSkill(d.sql.QueryRowContext(ctx, "SELECT "+skillCols+" FROM skills WHERE user_id = ? AND nombre = ?", userID, nombre))
}

// UpsertSkill crea la skill o, si el alumno ya tiene una con ese nombre, la reemplaza e incrementa la
// versión. Rellena ID, Version y las fechas de s.
func (d *DB) UpsertSkill(ctx context.Context, s *Skill) error {
	if s.UserID == "" {
		return errors.New("la skill necesita dueño")
	}
	vj, err := json.Marshal(s.Variantes)
	if err != nil {
		return err
	}
	if s.Variantes == nil {
		vj = []byte("{}")
	}
	if s.ModeloDestino == "" {
		s.ModeloDestino = "generico"
	}
	if s.Origen == "" {
		s.Origen = "propia"
	}
	comp := 0
	if s.Compartida {
		comp = 1
	}
	t := time.Now().UTC().Format(time.RFC3339)
	id := NewID()
	_, err = d.sql.ExecContext(ctx, `INSERT INTO skills (`+skillCols+`) VALUES (?,?,?,?,?,?,?,1,?,?,?,?)
		ON CONFLICT(user_id, nombre) DO UPDATE SET descripcion=excluded.descripcion, cuerpo=excluded.cuerpo,
		modelo_destino=excluded.modelo_destino, variantes_json=excluded.variantes_json, origen=excluded.origen,
		compartida=excluded.compartida, version=skills.version+1, actualizada_en=excluded.actualizada_en`,
		id, s.UserID, s.Nombre, s.Descripcion, s.Cuerpo, s.ModeloDestino, string(vj), s.Origen, comp, t, t)
	if err != nil {
		return err
	}
	got, err := d.Skill(ctx, s.UserID, s.Nombre)
	if err != nil {
		return err
	}
	*s = *got
	return nil
}

// DeleteSkill borra una skill propia; ErrNotFound si no es suya.
func (d *DB) DeleteSkill(ctx context.Context, userID, nombre string) error {
	res, err := d.sql.ExecContext(ctx, "DELETE FROM skills WHERE user_id = ? AND nombre = ?", userID, nombre)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// SkillsCompartidas lista las skills que los alumnos marcaron para compartir con el instructor
// (la única consulta sin filtrar por dueño; la usa el staff).
func (d *DB) SkillsCompartidas(ctx context.Context) ([]*Skill, error) {
	return d.skills(ctx, "compartida = 1")
}
