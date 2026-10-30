package httpapi

import (
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// Carrera de recreo (Ninja Race) del modo LIVE, en memoria y por lección.
//
//   POST /api/v1/live/{lesson}/carrera/unir   {"avatar":"joven"} → entra a la sala
//   POST /api/v1/live/{lesson}/carrera/paso   {"dist":1234,"hits":1} → avance propio
//   POST /api/v1/live/{lesson}/carrera/fin    {"ms":38210} → tiempo de llegada
//   POST /api/v1/live/{lesson}/carrera/iniciar (staff) → cuenta atrás y salida común
//   POST /api/v1/live/{lesson}/carrera/reiniciar (staff) → vuelve al vestíbulo
//   GET  /api/v1/live/{lesson}/carrera        → estado: salida, corredores y puestos
//
// El cliente simula su corredor y manda su avance; aquí solo se guarda y se ordena. No hay
// física de servidor: en un recreo de clase la trampa no es el problema, la lata sí.

type corredor struct {
	ID     string  `json:"id"`
	Nombre string  `json:"nombre"`
	Avatar string  `json:"avatar"`
	Dist   float64 `json:"dist"`
	Golpes int     `json:"golpes"`
	FinMs  int64   `json:"fin_ms"`
}

type sala struct {
	mu       sync.Mutex
	Corredor map[string]*corredor
	Estado   string    // lobby | cuenta | corre | fin
	Salida   time.Time // instante común de salida
	Seed     int64
	Largo    float64 // metros de la pista
}

var salas = struct {
	sync.Mutex
	m map[string]*sala
}{m: map[string]*sala{}}

func salaDe(leccion string) *sala {
	salas.Lock()
	defer salas.Unlock()
	s := salas.m[leccion]
	if s == nil {
		s = &sala{Corredor: map[string]*corredor{}, Estado: "lobby", Largo: 840}
		salas.m[leccion] = s
	}
	return s
}

func (s *sala) puesto(ahora time.Time, c *corredor) int {
	p := 1
	for _, o := range s.Corredor {
		if o == c {
			continue
		}
		if mejor(o, c, ahora) {
			p++
		}
	}
	return p
}

// mejor: primero quien llegó antes; si nadie llegó, quien va más lejos.
func mejor(a, b *corredor, ahora time.Time) bool {
	switch {
	case a.FinMs > 0 && b.FinMs > 0:
		return a.FinMs < b.FinMs
	case a.FinMs > 0:
		return true
	case b.FinMs > 0:
		return false
	}
	return a.Dist > b.Dist
}

func (s *Server) liveCarreraEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	sala := salaDe(l.ID)
	sala.mu.Lock()
	defer sala.mu.Unlock()

	ahora := time.Now()
	faltan := int64(0)
	if sala.Estado == "cuenta" {
		faltan = sala.Salida.Sub(ahora).Milliseconds()
		if faltan <= 0 {
			sala.Estado = "corre"
			faltan = 0
		}
	}
	lista := make([]*corredor, 0, len(sala.Corredor))
	for _, c := range sala.Corredor {
		copia := *c
		lista = append(lista, &copia)
	}
	sort.Slice(lista, func(i, j int) bool { return mejor(lista[i], lista[j], ahora) })

	writeJSON(w, 200, map[string]any{
		"estado": sala.Estado, "faltan_ms": faltan, "seed": sala.Seed,
		"largo": sala.Largo, "ahora_ms": ahora.UnixMilli(),
		"salida_ms": sala.Salida.UnixMilli(), "corredores": lista, "yo": p.ID,
	})
}

func (s *Server) liveCarreraUnir(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Avatar string `json:"avatar"`
	}
	readJSONAllowEmpty(w, r, &in)
	avatar := strings.TrimSpace(in.Avatar)
	if avatar == "" || len(avatar) > 20 {
		avatar = "joven"
	}
	sala := salaDe(l.ID)
	sala.mu.Lock()
	defer sala.mu.Unlock()
	if sala.Estado == "cuenta" || sala.Estado == "corre" {
		// quien llega tarde entra a la siguiente
		c, ok := sala.Corredor[p.ID]
		if !ok {
			writeErr(w, 409, "carrera_empezada", "la carrera ya salió: espera a la siguiente")
			return
		}
		writeJSON(w, 200, map[string]any{"id": c.ID, "avatar": c.Avatar, "tarde": true})
		return
	}
	nombre := strings.TrimSpace(p.Name)
	if nombre == "" {
		nombre = "Alumno"
	}
	sala.Corredor[p.ID] = &corredor{ID: p.ID, Nombre: nombre, Avatar: avatar}
	writeJSON(w, 200, map[string]any{"id": p.ID, "avatar": avatar, "anotados": len(sala.Corredor)})
}

func (s *Server) liveCarreraPaso(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Dist   float64 `json:"dist"`
		Golpes int     `json:"golpes"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	sala := salaDe(l.ID)
	sala.mu.Lock()
	defer sala.mu.Unlock()
	c, ok := sala.Corredor[p.ID]
	if !ok {
		writeErr(w, 409, "sin_corredor", "no estás anotado en la carrera")
		return
	}
	if in.Dist > c.Dist {
		c.Dist = in.Dist
	}
	c.Golpes = in.Golpes
	writeJSON(w, 200, map[string]any{"puesto": sala.puesto(time.Now(), c), "de": len(sala.Corredor)})
}

func (s *Server) liveCarreraFin(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Ms int64 `json:"ms"`
	}
	readJSONAllowEmpty(w, r, &in)
	sala := salaDe(l.ID)
	sala.mu.Lock()
	defer sala.mu.Unlock()
	c, ok := sala.Corredor[p.ID]
	if !ok || sala.Estado == "lobby" {
		writeErr(w, 409, "sin_corredor", "no estás corriendo")
		return
	}
	if c.FinMs == 0 && in.Ms > 0 {
		c.FinMs = in.Ms
		if c.Dist < sala.Largo {
			c.Dist = sala.Largo
		}
	}
	writeJSON(w, 200, map[string]any{"puesto": sala.puesto(time.Now(), c), "de": len(sala.Corredor)})
}

func (s *Server) liveCarreraIniciar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	if !p.Staff() {
		forbidden(w)
		return
	}
	sala := salaDe(l.ID)
	sala.mu.Lock()
	defer sala.mu.Unlock()
	sala.Estado = "cuenta"
	sala.Salida = time.Now().Add(4 * time.Second)
	sala.Seed = time.Now().UnixNano() % 100000
	for _, c := range sala.Corredor {
		c.Dist, c.Golpes, c.FinMs = 0, 0, 0
	}
	writeJSON(w, 200, map[string]any{"salida_ms": sala.Salida.UnixMilli(), "seed": sala.Seed, "anotados": len(sala.Corredor)})
}

func (s *Server) liveCarreraReiniciar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	if !p.Staff() {
		forbidden(w)
		return
	}
	sala := salaDe(l.ID)
	sala.mu.Lock()
	defer sala.mu.Unlock()
	sala.Estado = "lobby"
	sala.Corredor = map[string]*corredor{}
	writeJSON(w, 200, map[string]any{"ok": true})
}
