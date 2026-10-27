package httpapi

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

// muroLive es el muro del grupo: textos cortos que los alumnos publican desde una escena del LIVE
// («presenta tu Robo», «la respuesta más graciosa», «qué te llevas») y que todos ven en vivo.
// En memoria, por lección y escena; cada alumno tiene una sola entrada por escena (volver a
// publicar la reemplaza). No se persiste: vale lo que dura la clase, igual que las votaciones.
var muroLive = struct {
	sync.Mutex
	v map[string]map[string][]entradaMuro
}{v: map[string]map[string][]entradaMuro{}}

type entradaMuro struct {
	Sub    string    `json:"-"`
	Nombre string    `json:"nombre"`
	Texto  string    `json:"texto"`
	Fecha  time.Time `json:"fecha"`
	Mia    bool      `json:"mia"`
}

const muroTope = 60 // entradas por escena que se conservan (las más nuevas)

func leerMuro(lesson, escena, sub string) []entradaMuro {
	muroLive.Lock()
	defer muroLive.Unlock()
	src := muroLive.v[lesson][escena]
	out := make([]entradaMuro, 0, len(src))
	for i := len(src) - 1; i >= 0; i-- { // más nueva primero
		e := src[i]
		e.Mia = e.Sub == sub
		out = append(out, e)
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

// liveMuroPost: POST /api/v1/live/{lesson}/muro {"escena":"08-avatar","texto":"…"} (hasta 200
// caracteres; vacío borra la entrada propia). Devuelve el muro actualizado.
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
	for _, e := range lista {
		if e.Sub != p.ID {
			sin = append(sin, e)
		}
	}
	if in.Texto != "" {
		sin = append(sin, entradaMuro{Sub: p.ID, Nombre: nombreMuro(p), Texto: in.Texto, Fecha: time.Now().UTC()})
	}
	if len(sin) > muroTope {
		sin = sin[len(sin)-muroTope:]
	}
	muroLive.v[l.ID][in.Escena] = sin
	muroLive.Unlock()
	writeJSON(w, 200, map[string]any{"entradas": leerMuro(l.ID, in.Escena, p.ID)})
}

// liveMuroGet: GET /api/v1/live/{lesson}/muro?escena=… → {"entradas":[{nombre,texto,fecha,mia}…]} (más nueva primero).
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
	writeJSON(w, 200, map[string]any{"entradas": leerMuro(l.ID, escena, p.ID)})
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
	writeJSON(w, 200, map[string]any{"entradas": []entradaMuro{}})
}
