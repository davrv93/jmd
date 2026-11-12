// Isla Gomita pública: la carrera de plataformas del LIVE, sin cuenta del LMS.
//
// Cada jugador se identifica con una cookie aleatoria y escribe su nombre al unirse.
// La sala arranca sola 60 s después del primer anotado (o 5 s si se llena) y vuelve
// al vestíbulo 45 s después de cerrar. El instructor puede dar la salida o reiniciar
// entrando una vez a /admin?k=<GOMITA_CLAVE>, que deja una cookie de staff.
//
//	GET  /api/carrera            estado de la sala
//	POST /api/carrera/unir       {"avatar":"gatito","nombre":"Ana"}
//	POST /api/carrera/paso       {"dist":123,"golpes":1}
//	POST /api/carrera/fin        {"ms":38210}
//	POST /api/carrera/iniciar    (staff)
//	POST /api/carrera/reiniciar  (staff)
package main

import (
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"io/fs"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

const (
	largo        = 840.0
	maxCorr      = 15
	esperaAuto   = 60 * time.Second
	esperaLlena  = 5 * time.Second
	cuentaAtras  = 4 * time.Second
	limiteManga  = 7*time.Minute + 30*time.Second
	vueltaLobby  = 45 * time.Second
	cookieID     = "gomita_id"
	cookieStaff  = "gomita_staff"
	maxCuerpo    = 2048
	avatarMaxLen = 20
	nombreMaxLen = 24
)

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
	corr     map[string]*corredor
	estado   string // lobby | cuenta | corre | fin
	salida   time.Time
	auto     time.Time // salida automática programada (solo en lobby)
	cierre   time.Time // cuándo pasó a «fin»
	seed     int64
	lastSeen map[string]time.Time
}

var s = &sala{corr: map[string]*corredor{}, estado: "lobby", lastSeen: map[string]time.Time{}}

func mejor(a, b *corredor) bool {
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

func (s *sala) todosLlegaron() bool {
	if len(s.corr) == 0 {
		return false
	}
	for _, c := range s.corr {
		if c.FinMs == 0 {
			return false
		}
	}
	return true
}

func (s *sala) puesto(c *corredor) int {
	p := 1
	for _, o := range s.corr {
		if o != c && mejor(o, c) {
			p++
		}
	}
	return p
}

func (s *sala) arrancar(ahora time.Time) {
	s.estado = "cuenta"
	s.salida = ahora.Add(cuentaAtras)
	s.auto = time.Time{}
	s.seed = ahora.UnixNano() % 100000
	for _, c := range s.corr {
		c.Dist, c.Golpes, c.FinMs = 0, 0, 0
	}
}

func (s *sala) aLobby() {
	s.estado = "lobby"
	s.corr = map[string]*corredor{}
	s.salida, s.auto, s.cierre = time.Time{}, time.Time{}, time.Time{}
}

// avanzar aplica los relojes: salida automática, cuenta atrás, cierre y vuelta al vestíbulo.
func (s *sala) avanzar(ahora time.Time) {
	for id, t := range s.lastSeen {
		if ahora.Sub(t) > 15*time.Minute {
			delete(s.lastSeen, id)
		}
	}
	// En el vestíbulo, quien cerró la pestaña sin correr sale de la lista a los 20 s.
	if s.estado == "lobby" {
		for id := range s.corr {
			if ahora.Sub(s.lastSeen[id]) > 20*time.Second {
				delete(s.corr, id)
			}
		}
		if len(s.corr) == 0 {
			s.auto = time.Time{}
		}
		if !s.auto.IsZero() && !ahora.Before(s.auto) {
			s.arrancar(ahora)
		}
	}
	if s.estado == "cuenta" && !ahora.Before(s.salida) {
		s.estado = "corre"
	}
	if s.estado == "corre" && (s.todosLlegaron() || ahora.Sub(s.salida) > limiteManga) {
		s.estado, s.cierre = "fin", ahora
	}
	if s.estado == "fin" && !s.cierre.IsZero() && ahora.Sub(s.cierre) > vueltaLobby {
		s.aLobby()
	}
}

func main() {
	clave := os.Getenv("GOMITA_CLAVE")
	if len(clave) < 16 {
		log.Print("GOMITA_CLAVE ausente o corta: el modo instructor queda apagado")
		clave = ""
	}
	esStaff := func(r *http.Request) bool {
		c, err := r.Cookie(cookieStaff)
		return err == nil && clave != "" && subtle.ConstantTimeCompare([]byte(c.Value), []byte(clave)) == 1
	}
	idDe := func(w http.ResponseWriter, r *http.Request) string {
		if c, err := r.Cookie(cookieID); err == nil && len(c.Value) == 32 {
			if _, err := hex.DecodeString(c.Value); err == nil {
				return c.Value
			}
		}
		b := make([]byte, 16)
		_, _ = rand.Read(b)
		id := hex.EncodeToString(b)
		http.SetCookie(w, &http.Cookie{Name: cookieID, Value: id, Path: "/", MaxAge: 86400 * 30,
			HttpOnly: true, Secure: r.Header.Get("X-Forwarded-Proto") == "https", SameSite: http.SameSiteLaxMode})
		return id
	}
	leer := func(w http.ResponseWriter, r *http.Request, v any) bool {
		r.Body = http.MaxBytesReader(w, r.Body, maxCuerpo)
		if err := json.NewDecoder(r.Body).Decode(v); err != nil && err.Error() != "EOF" {
			errJSON(w, 400, "cuerpo_invalido", "petición inválida")
			return false
		}
		return true
	}

	mux := http.NewServeMux()
	sub, _ := fs.Sub(webFS, "web")
	estaticos := http.FileServer(http.FS(sub))
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		estaticos.ServeHTTP(w, r)
	})

	mux.HandleFunc("GET /admin", func(w http.ResponseWriter, r *http.Request) {
		k := r.URL.Query().Get("k")
		if clave == "" || subtle.ConstantTimeCompare([]byte(k), []byte(clave)) != 1 {
			http.Error(w, "clave incorrecta", http.StatusForbidden)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: cookieStaff, Value: clave, Path: "/", MaxAge: 86400 * 30,
			HttpOnly: true, Secure: r.Header.Get("X-Forwarded-Proto") == "https", SameSite: http.SameSiteStrictMode})
		http.Redirect(w, r, "./", http.StatusSeeOther)
	})

	mux.HandleFunc("GET /api/carrera", func(w http.ResponseWriter, r *http.Request) {
		id := idDe(w, r)
		ahora := time.Now()
		s.mu.Lock()
		defer s.mu.Unlock()
		s.lastSeen[id] = ahora
		s.avanzar(ahora)
		lista := make([]corredor, 0, len(s.corr))
		for _, c := range s.corr {
			lista = append(lista, *c)
		}
		sort.Slice(lista, func(i, j int) bool { return mejor(&lista[i], &lista[j]) })
		faltan := int64(0)
		if s.estado == "cuenta" {
			faltan = s.salida.Sub(ahora).Milliseconds()
		}
		auto := int64(0)
		if !s.auto.IsZero() {
			auto = s.auto.UnixMilli()
		}
		salida := int64(0)
		if !s.salida.IsZero() {
			salida = s.salida.UnixMilli()
		}
		okJSON(w, map[string]any{"estado": s.estado, "faltan_ms": faltan, "seed": s.seed, "largo": largo,
			"ahora_ms": ahora.UnixMilli(), "salida_ms": salida, "auto_ms": auto,
			"corredores": lista, "yo": id, "staff": esStaff(r)})
	})

	mux.HandleFunc("POST /api/carrera/unir", func(w http.ResponseWriter, r *http.Request) {
		id := idDe(w, r)
		var in struct{ Avatar, Nombre string }
		if !leer(w, r, &in) {
			return
		}
		avatar := strings.TrimSpace(in.Avatar)
		if avatar == "" || len(avatar) > avatarMaxLen {
			avatar = "gatito"
		}
		nombre := limpiaNombre(in.Nombre)
		if utf8.RuneCountInString(nombre) < 2 {
			errJSON(w, 400, "sin_nombre", "escribe tu nombre para unirte")
			return
		}
		ahora := time.Now()
		s.mu.Lock()
		defer s.mu.Unlock()
		s.lastSeen[id] = ahora
		s.avanzar(ahora)
		if s.estado != "lobby" {
			if c, ok := s.corr[id]; ok {
				okJSON(w, map[string]any{"id": c.ID, "avatar": c.Avatar, "tarde": true})
				return
			}
			errJSON(w, 409, "carrera_empezada", "la carrera ya salió: espera a la siguiente")
			return
		}
		if c, ok := s.corr[id]; ok {
			c.Avatar, c.Nombre = avatar, nombre
		} else {
			if len(s.corr) >= maxCorr {
				errJSON(w, 409, "sala_llena", "la sala está llena (15): espera a la siguiente")
				return
			}
			s.corr[id] = &corredor{ID: id, Nombre: nombre, Avatar: avatar}
		}
		if s.auto.IsZero() {
			s.auto = ahora.Add(esperaAuto)
		}
		if len(s.corr) >= maxCorr && s.auto.Sub(ahora) > esperaLlena {
			s.auto = ahora.Add(esperaLlena)
		}
		okJSON(w, map[string]any{"id": id, "avatar": avatar, "anotados": len(s.corr)})
	})

	mux.HandleFunc("POST /api/carrera/paso", func(w http.ResponseWriter, r *http.Request) {
		id := idDe(w, r)
		var in struct {
			Dist   float64 `json:"dist"`
			Golpes int     `json:"golpes"`
		}
		if !leer(w, r, &in) {
			return
		}
		ahora := time.Now()
		s.mu.Lock()
		defer s.mu.Unlock()
		s.lastSeen[id] = ahora
		s.avanzar(ahora)
		c, ok := s.corr[id]
		if !ok {
			errJSON(w, 409, "sin_corredor", "no estás anotado en la carrera")
			return
		}
		if s.estado == "corre" && in.Dist > c.Dist && in.Dist <= largo {
			c.Dist = in.Dist
		}
		c.Golpes = in.Golpes
		okJSON(w, map[string]any{"puesto": s.puesto(c), "de": len(s.corr)})
	})

	mux.HandleFunc("POST /api/carrera/fin", func(w http.ResponseWriter, r *http.Request) {
		id := idDe(w, r)
		var in struct {
			Ms int64 `json:"ms"`
		}
		if !leer(w, r, &in) {
			return
		}
		ahora := time.Now()
		s.mu.Lock()
		defer s.mu.Unlock()
		s.lastSeen[id] = ahora
		c, ok := s.corr[id]
		if !ok || s.estado == "lobby" || s.estado == "cuenta" {
			errJSON(w, 409, "sin_corredor", "no estás corriendo")
			return
		}
		// El tiempo que manda el cliente no puede ser menor que lo que de verdad pasó desde la salida.
		pasado := ahora.Sub(s.salida).Milliseconds()
		if c.FinMs == 0 && in.Ms > 0 && s.estado == "corre" {
			if in.Ms < pasado-3000 {
				in.Ms = pasado
			}
			c.FinMs = in.Ms
			c.Dist = largo
		}
		s.avanzar(ahora)
		okJSON(w, map[string]any{"puesto": s.puesto(c), "de": len(s.corr)})
	})

	mux.HandleFunc("POST /api/carrera/iniciar", func(w http.ResponseWriter, r *http.Request) {
		if !esStaff(r) {
			errJSON(w, 403, "prohibido", "solo el instructor da la salida")
			return
		}
		ahora := time.Now()
		s.mu.Lock()
		defer s.mu.Unlock()
		s.arrancar(ahora)
		okJSON(w, map[string]any{"salida_ms": s.salida.UnixMilli(), "seed": s.seed, "anotados": len(s.corr)})
	})

	mux.HandleFunc("POST /api/carrera/reiniciar", func(w http.ResponseWriter, r *http.Request) {
		if !esStaff(r) {
			errJSON(w, 403, "prohibido", "solo el instructor reinicia la sala")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		s.aLobby()
		okJSON(w, map[string]any{"ok": true})
	})

	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18693"
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: mux, ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second}
	log.Printf("isla-gomita en :%s", puerto)
	log.Fatal(srv.ListenAndServe())
}

func limpiaNombre(n string) string {
	n = strings.Join(strings.Fields(n), " ")
	var b strings.Builder
	for _, r := range n {
		if r < 32 || r == '<' || r == '>' {
			continue
		}
		b.WriteRune(r)
	}
	n = b.String()
	if utf8.RuneCountInString(n) > nombreMaxLen {
		n = string([]rune(n)[:nombreMaxLen])
	}
	return strings.TrimSpace(n)
}

func okJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(v)
}

func errJSON(w http.ResponseWriter, st int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(st)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": code, "message": msg}})
}
