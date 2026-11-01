package main

// Identidad desde el LMS: la arena no se fía de nada que venga del cliente. Toma la
// cookie de sesión del LMS (lms_session, mismo origen) y pregunta a /api/v1/me quién
// es; con esa misma cookie lee /api/v1/lessons/qa-01/progress para premiar los pasos.
// Las cookies de los jugadores se guardan solo en memoria para el refresco periódico.

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

const cookieLMS = "lms_session"
const leccionArena = "qa-01"

type Identidad struct {
	ID    string   `json:"id"`
	Email string   `json:"email"`
	Name  string   `json:"name"`
	Roles []string `json:"roles"`
}

func (i *Identidad) Staff() bool {
	for _, r := range i.Roles {
		if r == "instructor" || r == "admin" {
			return true
		}
	}
	return false
}

type entradaCache struct {
	id    *Identidad // nil = la sesión no vale (también se cachea, 60 s)
	hasta time.Time
}

var clienteLMS = &http.Client{Timeout: 3 * time.Second}

// lmsGET hace GET al LMS reenviando solo la cookie de sesión.
func (s *Servidor) lmsGET(ruta, cookie string) (int, []byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "GET", strings.TrimRight(s.lms, "/")+ruta, nil)
	if err != nil {
		return 0, nil, err
	}
	req.AddCookie(&http.Cookie{Name: cookieLMS, Value: cookie})
	req.Header.Set("Accept", "application/json")
	resp, err := clienteLMS.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	return resp.StatusCode, b, nil
}

// identidadDe resuelve la cookie contra el LMS, con caché de 60 s por huella de la cookie.
func (s *Servidor) identidadDe(cookie string) *Identidad {
	if cookie == "" {
		return nil
	}
	h := sha256.Sum256([]byte(cookie))
	k := hex.EncodeToString(h[:8])
	s.cacheMu.Lock()
	if e, ok := s.cache[k]; ok && time.Now().Before(e.hasta) {
		s.cacheMu.Unlock()
		return e.id
	}
	s.cacheMu.Unlock()
	var id *Identidad
	if code, b, err := s.lmsGET("/api/v1/me", cookie); err == nil && code == 200 {
		var x Identidad
		if json.Unmarshal(b, &x) == nil && x.Email != "" {
			id = &x
		}
	}
	s.cacheMu.Lock()
	s.cache[k] = entradaCache{id: id, hasta: time.Now().Add(60 * time.Second)}
	if len(s.cache) > 500 {
		for kk, e := range s.cache {
			if time.Now().After(e.hasta) {
				delete(s.cache, kk)
			}
		}
	}
	s.cacheMu.Unlock()
	return id
}

// quienEs: identidad del LMS de la petición y la cookie con la que se obtuvo.
func (s *Servidor) quienEs(r *http.Request) (*Identidad, string) {
	c, err := r.Cookie(cookieLMS)
	if err != nil || c.Value == "" {
		return nil, ""
	}
	return s.identidadDe(c.Value), c.Value
}

// progresoLMS devuelve los ids de los pasos marcados en la lección del taller.
// ok=false si la sesión ya no vale (401) o el LMS no respondió.
func (s *Servidor) progresoLMS(cookie string) (hechos []string, ok bool) {
	code, b, err := s.lmsGET("/api/v1/lessons/"+leccionArena+"/progress", cookie)
	if err != nil || code != 200 {
		return nil, false
	}
	var p struct {
		Steps map[string]any `json:"steps"`
	}
	if json.Unmarshal(b, &p) != nil {
		return nil, false
	}
	for id, v := range p.Steps {
		if v != nil {
			hechos = append(hechos, id)
		}
	}
	return hechos, true
}

// premiarPasos lee el progreso con la cookie del jugador y concede los pasos nuevos.
// Se llama SIN el candado tomado (hace red). Devuelve los pasos nuevos.
func (s *Servidor) premiarPasos(jugadorID int, cookie string) int {
	hechos, ok := s.progresoLMS(cookie)
	s.mu.Lock()
	defer s.mu.Unlock()
	if !ok {
		if s.identidadDe(cookie) == nil {
			delete(s.sesiones, jugadorID)
		}
		return 0
	}
	j := s.jugadorID(jugadorID)
	if j == nil || !j.Activo {
		return 0
	}
	n := s.anotarPasos(j, hechos)
	if n > 0 {
		s.guardar()
	}
	return n
}

// refrescarTodos repasa el progreso de los jugadores con sesión conocida (cada 60 s).
func (s *Servidor) refrescarTodos() {
	s.mu.Lock()
	copia := map[int]string{}
	for id, c := range s.sesiones {
		copia[id] = c
	}
	s.mu.Unlock()
	for id, c := range copia {
		s.premiarPasos(id, c)
	}
}
