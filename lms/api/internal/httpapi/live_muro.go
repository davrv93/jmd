package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// muroLive es el muro del grupo: textos cortos que los alumnos publican desde una escena del LIVE
// («presenta tu Robo», «la respuesta más graciosa», «qué te llevas») y que todos ven en vivo.
// En memoria, por lección y escena; cada alumno tiene una sola entrada por escena (volver a
// publicar la reemplaza). No se persiste: vale lo que dura la clase, igual que las votaciones.
//
// «Me gusta» (11-2026): cada entrada lleva un id público al azar (no deja ver el sub del autor) y
// los demás le dan «me gusta» con POST …/muro/like; uno por persona, nunca a la propia. Si el
// autor cambia el texto, la entrada es otra: id nuevo y los «me gusta» vuelven a cero. Cada cambio
// se avisa por el stream del LIVE (evento «muro» con la escena) para que las vistas se refresquen.
var muroLive = struct {
	sync.Mutex
	v map[string]map[string][]entradaMuro
}{v: map[string]map[string][]entradaMuro{}}

type entradaMuro struct {
	ID      string          `json:"id"`
	Sub     string          `json:"-"`
	Nombre  string          `json:"nombre"`
	Texto   string          `json:"texto"`
	Fecha   time.Time       `json:"fecha"`
	Mia     bool            `json:"mia"`
	Likes   int             `json:"likes"`
	MeGusta bool            `json:"me_gusta"`
	likers  map[string]bool // sub → dio «me gusta»
}

const muroTope = 60 // entradas por escena que se conservan (las más nuevas)

func idMuro() string {
	var b [6]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// leerMuro devuelve el muro visto por sub: la más nueva primero o, con orden «likes», las más
// gustadas primero (a igual número, la más nueva).
func leerMuro(lesson, escena, sub, orden string) []entradaMuro {
	muroLive.Lock()
	defer muroLive.Unlock()
	src := muroLive.v[lesson][escena]
	out := make([]entradaMuro, 0, len(src))
	for i := len(src) - 1; i >= 0; i-- { // más nueva primero
		e := src[i]
		e.Mia = e.Sub == sub
		e.Likes = len(e.likers)
		e.MeGusta = e.likers[sub]
		e.likers = nil
		out = append(out, e)
	}
	if orden == "likes" {
		sort.SliceStable(out, func(i, j int) bool { return out[i].Likes > out[j].Likes })
	}
	return out
}

func nombreMuro(p *Principal) string {
	n := strings.TrimSpace(p.Name)
	if n == "" {
		n = strings.SplitN(p.Email, "@", 2)[0]
	}
	if n == "" {
		return "alguien"
	}
	partes := strings.Fields(n)
	if len(partes) >= 2 {
		return partes[0] + " " + string([]rune(partes[1])[:1]) + "."
	}
	return n
}

// avisarMuro difunde a la lección que el muro de esa escena cambió.
func (s *Server) avisarMuro(lesson, escena string) {
	if s.live != nil {
		s.live.publish(lesson, "muro", map[string]string{"escena": escena})
	}
}

// liveMuroPost: POST /api/v1/live/{lesson}/muro {"escena":"08-avatar","texto":"…"} (hasta 200
// caracteres; vacío borra la entrada propia). Devuelve el muro actualizado (?orden=likes lo ordena
// por «me gusta»).
func (s *Server) liveMuroPost(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena string `json:"escena"`
		Texto  string `json:"texto"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Escena = strings.TrimSpace(in.Escena)
	in.Texto = strings.Join(strings.Fields(in.Texto), " ")
	if !idVoto.MatchString(in.Escena) {
		badRequest(w, "escena: minúsculas, dígitos, guion o guion bajo, hasta 60 caracteres")
		return
	}
	if rs := []rune(in.Texto); len(rs) > 200 {
		in.Texto = string(rs[:200])
	}
	muroLive.Lock()
	if muroLive.v[l.ID] == nil {
		muroLive.v[l.ID] = map[string][]entradaMuro{}
	}
	lista := muroLive.v[l.ID][in.Escena]
	sin := lista[:0:0]
	var previa *entradaMuro
	for i, e := range lista {
		if e.Sub != p.ID {
			sin = append(sin, e)
		} else {
			previa = &lista[i]
		}
	}
	if in.Texto != "" {
		nueva := entradaMuro{ID: idMuro(), Sub: p.ID, Nombre: nombreMuro(p), Texto: in.Texto, Fecha: time.Now().UTC(), likers: map[string]bool{}}
		if previa != nil && previa.Texto == in.Texto { // mismo texto: la misma entrada, con sus «me gusta»
			nueva.ID, nueva.likers = previa.ID, previa.likers
		}
		sin = append(sin, nueva)
	}
	if len(sin) > muroTope {
		sin = sin[len(sin)-muroTope:]
	}
	muroLive.v[l.ID][in.Escena] = sin
	muroLive.Unlock()
	s.avisarMuro(l.ID, in.Escena)
	writeJSON(w, 200, map[string]any{"entradas": leerMuro(l.ID, in.Escena, p.ID, r.URL.Query().Get("orden"))})
}

// liveMuroGet: GET /api/v1/live/{lesson}/muro?escena=…[&orden=likes] →
// {"entradas":[{id,nombre,texto,fecha,mia,likes,me_gusta}…]} (más nueva primero, o más gustada primero).
func (s *Server) liveMuroGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	escena := strings.TrimSpace(r.URL.Query().Get("escena"))
	if !idVoto.MatchString(escena) {
		badRequest(w, "falta ?escena=")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"entradas": leerMuro(l.ID, escena, p.ID, r.URL.Query().Get("orden"))})
}

// liveMuroLike: POST /api/v1/live/{lesson}/muro/like {"escena":"08-avatar","id":"a1b2c3d4e5f6"}. Pone o
// quita el «me gusta» de quien llama (uno por persona; a la propia, 403). Devuelve la entrada
// ({id,likes,me_gusta,…}) y el muro (?orden=likes lo ordena por «me gusta»).
func (s *Server) liveMuroLike(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena string `json:"escena"`
		ID     string `json:"id"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Escena, in.ID = strings.TrimSpace(in.Escena), strings.TrimSpace(in.ID)
	if !idVoto.MatchString(in.Escena) || in.ID == "" {
		badRequest(w, "faltan escena e id")
		return
	}
	if s.likeLimite != nil && !s.likeLimite.allow("muro:"+p.ID) {
		writeErr(w, 429, "rate_limited", "Demasiados «me gusta» seguidos; espera un momento.")
		return
	}
	muroLive.Lock()
	var e *entradaMuro
	lista := muroLive.v[l.ID][in.Escena]
	for i := range lista {
		if lista[i].ID == in.ID {
			e = &lista[i]
			break
		}
	}
	switch {
	case e == nil:
		muroLive.Unlock()
		notFound(w, "la entrada del muro")
		return
	case e.Sub == p.ID:
		muroLive.Unlock()
		writeErr(w, 403, "propia", "No puedes darle «me gusta» a tu propia entrada.")
		return
	}
	if e.likers == nil {
		e.likers = map[string]bool{}
	}
	if e.likers[p.ID] {
		delete(e.likers, p.ID)
	} else {
		e.likers[p.ID] = true
	}
	out := entradaMuro{ID: e.ID, Nombre: e.Nombre, Texto: e.Texto, Fecha: e.Fecha, Likes: len(e.likers), MeGusta: e.likers[p.ID]}
	muroLive.Unlock()
	s.avisarMuro(l.ID, in.Escena)
	writeJSON(w, 200, map[string]any{"entrada": out, "entradas": leerMuro(l.ID, in.Escena, p.ID, r.URL.Query().Get("orden"))})
}

// liveMuroBorrar: DELETE /api/v1/live/{lesson}/muro?escena=… (staff). Vacía el muro de esa escena.
func (s *Server) liveMuroBorrar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	escena := strings.TrimSpace(r.URL.Query().Get("escena"))
	if !idVoto.MatchString(escena) {
		badRequest(w, "falta ?escena=")
		return
	}
	muroLive.Lock()
	if muroLive.v[l.ID] != nil {
		delete(muroLive.v[l.ID], escena)
	}
	muroLive.Unlock()
	s.avisarMuro(l.ID, escena)
	writeJSON(w, 200, map[string]any{"entradas": []entradaMuro{}})
}
