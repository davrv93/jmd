// «Gol en vivo»: cancha pública compartida. Todas las personas conectadas
// empujan el mismo balón contra un portero robot, y el gol es de quien lo tocó
// al último. El servidor simula la cancha y guarda el ranking.
package main

import (
	"context"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"io/fs"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/coder/websocket"
)

//go:embed web
var webFS embed.FS

const (
	ancho, alto   = 600.0, 900.0
	arcoIzq       = 170.0
	arcoDer       = 430.0
	radioJugador  = 18.0
	radioBalon    = 12.0
	radioPortero  = 24.0
	yPortero      = 46.0
	velJugador    = 300.0
	velPortero    = 105.0
	velPatada     = 620.0
	ayudaArco     = 0.7
	friccion      = 0.982
	pasosSeg      = 30
	envioCada     = 2 // envía el estado cada 2 pasos: 15 veces por segundo
	festejo       = 2500 * time.Millisecond
	balonQuieto   = 9 * time.Second
	maxConectados = 120
	maxPorIP      = 8
)

type Registro struct {
	Nombre string    `json:"nombre"`
	Goles  int       `json:"goles"`
	Ultimo time.Time `json:"ultimo"`
}

type Jugador struct {
	id     int
	token  string
	nombre string
	x, y   float64
	destX  float64
	destY  float64
	ip     string
	salida chan []byte
	cerrar context.CancelFunc
}

type Cancha struct {
	mu          sync.Mutex
	jugadores   map[int]*Jugador
	registros   map[string]*Registro
	archivo     string
	sigID       int
	bx, by      float64
	bvx, bvy    float64
	px          float64
	ultimo      string // token de quien tocó el balón al último
	ultimoNom   string
	festejoHast time.Time
	tocado      time.Time
	paso        int
	sucio       bool
}

func nuevaCancha(archivo string) *Cancha {
	c := &Cancha{jugadores: map[int]*Jugador{}, registros: map[string]*Registro{}, archivo: archivo, px: ancho / 2, tocado: time.Now()}
	c.centrar()
	return c
}

func (c *Cancha) centrar() {
	c.bx, c.by, c.bvx, c.bvy = ancho/2, alto*0.55, 0, 0
	c.ultimo, c.ultimoNom = "", ""
}

func acotar(v, a, b float64) float64 { return math.Max(a, math.Min(b, v)) }

// avanzar mueve la cancha dt segundos. Devuelve el nombre de quien anotó, si alguien anotó.
func (c *Cancha) avanzar(dt float64, ahora time.Time) string {
	if ahora.Before(c.festejoHast) {
		return ""
	}
	if !c.festejoHast.IsZero() {
		c.festejoHast = time.Time{}
		c.centrar()
		c.tocado = ahora
	}
	for _, j := range c.jugadores {
		dx, dy := j.destX-j.x, j.destY-j.y
		if d := math.Hypot(dx, dy); d > 1 {
			paso := math.Min(d, velJugador*dt)
			j.x += dx / d * paso
			j.y += dy / d * paso
		}
		if d := math.Hypot(c.bx-j.x, c.by-j.y); d < radioJugador+radioBalon {
			if d < 0.01 {
				d = 0.01
			}
			nx, ny := (c.bx-j.x)/d, (c.by-j.y)/d
			c.bx, c.by = j.x+nx*(radioJugador+radioBalon), j.y+ny*(radioJugador+radioBalon)
			// cada toque se inclina un poco hacia el arco: con muchos jugadores el balón no se queda en medio
			ax, ay := ancho/2-c.bx, -c.by
			da := math.Hypot(ax, ay) + 0.01
			kx, ky := nx+ax/da*ayudaArco, ny+ay/da*ayudaArco
			dk := math.Hypot(kx, ky) + 0.01
			c.bvx, c.bvy = kx/dk*velPatada, ky/dk*velPatada
			c.ultimo, c.ultimoNom, c.tocado = j.token, j.nombre, ahora
		}
	}
	// el portero sigue el balón por la línea del arco con un vaivén: deja huecos para rematar
	objetivo := c.bx + math.Sin(float64(c.paso)/18)*70
	c.px += acotar(objetivo-c.px, -velPortero*dt, velPortero*dt)
	c.px = acotar(c.px, arcoIzq+radioPortero, arcoDer-radioPortero)
	if d := math.Hypot(c.bx-c.px, c.by-yPortero); d < radioPortero+radioBalon {
		if d < 0.01 {
			d = 0.01
		}
		nx, ny := (c.bx-c.px)/d, math.Abs(c.by-yPortero)/d
		c.bx, c.by = c.px+nx*(radioPortero+radioBalon), yPortero+ny*(radioPortero+radioBalon)
		c.bvx, c.bvy = nx*velPatada*0.8, ny*velPatada*0.8+120
		c.ultimo, c.ultimoNom = "", ""
	}
	c.bx += c.bvx * dt
	c.by += c.bvy * dt
	f := math.Pow(friccion, dt*pasosSeg)
	c.bvx *= f
	c.bvy *= f
	if c.bx < radioBalon || c.bx > ancho-radioBalon {
		c.bx = acotar(c.bx, radioBalon, ancho-radioBalon)
		c.bvx = -c.bvx * 0.8
	}
	if c.by > alto-radioBalon {
		c.by, c.bvy = alto-radioBalon, -c.bvy*0.8
	}
	if c.by < radioBalon {
		if c.bx > arcoIzq+radioBalon && c.bx < arcoDer-radioBalon {
			return c.anotar(ahora)
		}
		c.by, c.bvy = radioBalon, -c.bvy*0.8
	}
	if math.Hypot(c.bvx, c.bvy) > 8 {
		c.tocado = ahora
	} else if ahora.Sub(c.tocado) > balonQuieto {
		c.centrar()
		c.tocado = ahora
	}
	return ""
}

func (c *Cancha) anotar(ahora time.Time) string {
	c.festejoHast = ahora.Add(festejo)
	c.bvx, c.bvy = 0, 0
	nombre := c.ultimoNom
	if r := c.registros[c.ultimo]; r != nil {
		r.Goles++
		r.Ultimo = ahora
		c.sucio = true
	}
	if nombre == "" {
		return "Autogol del bot"
	}
	return nombre
}

type Fila struct {
	Nombre string `json:"n"`
	Goles  int    `json:"g"`
}

func (c *Cancha) ranking(n int) []Fila {
	rs := make([]*Registro, 0, len(c.registros))
	for _, r := range c.registros {
		if r.Goles > 0 {
			rs = append(rs, r)
		}
	}
	sort.Slice(rs, func(i, j int) bool {
		if rs[i].Goles != rs[j].Goles {
			return rs[i].Goles > rs[j].Goles
		}
		return rs[i].Ultimo.Before(rs[j].Ultimo)
	})
	if len(rs) > n {
		rs = rs[:n]
	}
	out := make([]Fila, len(rs))
	for i, r := range rs {
		out[i] = Fila{r.Nombre, r.Goles}
	}
	return out
}

func (c *Cancha) guardar() {
	b, _ := json.Marshal(c.registros)
	tmp := c.archivo + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("guardar: %v", err)
		return
	}
	if err := os.Rename(tmp, c.archivo); err != nil {
		log.Printf("guardar: %v", err)
	}
}

func (c *Cancha) enviar(b []byte) {
	for _, j := range c.jugadores {
		select {
		case j.salida <- b:
		default: // conexión lenta: pierde este cuadro, no frena a los demás
		}
	}
}

func (c *Cancha) estado() []byte {
	p := make([][3]int, 0, len(c.jugadores))
	for _, j := range c.jugadores {
		p = append(p, [3]int{j.id, int(j.x), int(j.y)})
	}
	b, _ := json.Marshal(map[string]any{"t": "s", "b": [2]int{int(c.bx), int(c.by)}, "k": int(c.px), "p": p})
	return b
}

func (c *Cancha) resumen() []byte {
	nombres := map[int]string{}
	for _, j := range c.jugadores {
		nombres[j.id] = j.nombre
	}
	b, _ := json.Marshal(map[string]any{"t": "r", "j": nombres, "r": c.ranking(10)})
	return b
}

func (c *Cancha) correr(ctx context.Context) {
	reloj := time.NewTicker(time.Second / pasosSeg)
	defer reloj.Stop()
	ultimoResumen := time.Now()
	for {
		select {
		case <-ctx.Done():
			return
		case ahora := <-reloj.C:
			c.mu.Lock()
			gol := c.avanzar(1.0/pasosSeg, ahora)
			c.paso++
			if gol != "" {
				b, _ := json.Marshal(map[string]string{"t": "g", "n": gol})
				c.enviar(b)
				c.enviar(c.resumen())
				if c.sucio {
					c.guardar()
					c.sucio = false
				}
			}
			if c.paso%envioCada == 0 {
				c.enviar(c.estado())
			}
			if ahora.Sub(ultimoResumen) > 2*time.Second {
				ultimoResumen = ahora
				c.enviar(c.resumen())
			}
			c.mu.Unlock()
		}
	}
}

var (
	espacios     = regexp.MustCompile(`\s+`)
	nombreValido = regexp.MustCompile(`^[\p{L}\p{M}0-9 .'\-]+$`)
)

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }

func nombreBueno(n string) bool {
	k := utf8.RuneCountInString(n)
	return k >= 2 && k <= 24 && nombreValido.MatchString(n) && !esOfensivo(n)
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func responder(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}

func (c *Cancha) sumar(token, nombre string) (string, int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if r := c.registros[token]; token != "" && r != nil {
		r.Nombre = nombre
		c.guardar()
		return token, r.Goles
	}
	token = nuevoToken()
	c.registros[token] = &Registro{Nombre: nombre}
	c.guardar()
	return token, 0
}

func (c *Cancha) conectar(w http.ResponseWriter, r *http.Request) {
	token, ip := r.URL.Query().Get("t"), ipDe(r)
	c.mu.Lock()
	reg := c.registros[token]
	porIP := 0
	for _, j := range c.jugadores {
		if j.ip == ip {
			porIP++
		}
	}
	lleno := len(c.jugadores) >= maxConectados || porIP >= maxPorIP
	c.mu.Unlock()
	if reg == nil {
		http.Error(w, "entra con tu nombre", http.StatusUnauthorized)
		return
	}
	if lleno {
		http.Error(w, "cancha llena", http.StatusServiceUnavailable)
		return
	}
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: []string{"jmd-learn.online", "localhost:*", "127.0.0.1:*"}})
	if err != nil {
		return
	}
	defer conn.CloseNow()
	conn.SetReadLimit(256)
	ctx, cancelar := context.WithCancel(r.Context())
	defer cancelar()

	c.mu.Lock()
	for _, j := range c.jugadores { // la misma persona en otra pestaña: gana la nueva
		if j.token == token {
			j.cerrar()
		}
	}
	c.sigID++
	x := 100 + float64(c.sigID*97%400)
	j := &Jugador{id: c.sigID, token: token, nombre: reg.Nombre, x: x, y: alto - 80, destX: x, destY: alto - 80, ip: ip, salida: make(chan []byte, 8), cerrar: cancelar}
	c.jugadores[j.id] = j
	yo, _ := json.Marshal(map[string]any{"t": "y", "id": j.id, "goles": reg.Goles})
	j.salida <- yo
	j.salida <- c.resumen()
	c.mu.Unlock()
	defer func() {
		c.mu.Lock()
		delete(c.jugadores, j.id)
		c.mu.Unlock()
	}()

	go func() {
		defer cancelar()
		for {
			_, b, err := conn.Read(ctx)
			if err != nil {
				return
			}
			var m struct {
				X float64 `json:"x"`
				Y float64 `json:"y"`
			}
			if json.Unmarshal(b, &m) != nil || math.IsNaN(m.X) || math.IsNaN(m.Y) {
				continue
			}
			c.mu.Lock()
			j.destX, j.destY = acotar(m.X, radioJugador, ancho-radioJugador), acotar(m.Y, radioJugador, alto-radioJugador)
			c.mu.Unlock()
		}
	}()
	for {
		select {
		case <-ctx.Done():
			return
		case b := <-j.salida:
			wctx, listo := context.WithTimeout(ctx, 3*time.Second)
			err := conn.Write(wctx, websocket.MessageText, b)
			listo()
			if err != nil {
				return
			}
		}
	}
}

func (c *Cancha) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	archivos := http.FileServerFS(web)
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		archivos.ServeHTTP(w, r)
	})
	mux.HandleFunc("GET /api/ws", c.conectar)
	mux.HandleFunc("GET /api/ranking", func(w http.ResponseWriter, r *http.Request) {
		c.mu.Lock()
		defer c.mu.Unlock()
		responder(w, 200, map[string]any{"ranking": c.ranking(10), "conectados": len(c.jugadores)})
	})
	mux.HandleFunc("POST /api/entrar", func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			Nombre string `json:"nombre"`
			Token  string `json:"token"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			responder(w, 400, map[string]string{"error": "No pude leer tu nombre."})
			return
		}
		nombre := limpiarNombre(p.Nombre)
		if !nombreBueno(nombre) {
			responder(w, 400, map[string]string{"error": "Escribe un nombre de 2 a 24 letras."})
			return
		}
		token, goles := c.sumar(p.Token, nombre)
		responder(w, 200, map[string]any{"token": token, "goles": goles})
	})
	return mux
}

func main() {
	dir := os.Getenv("GOL_DATOS")
	if dir == "" {
		dir = "datos"
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Fatal(err)
	}
	c := nuevaCancha(filepath.Join(dir, "ranking.json"))
	if b, err := os.ReadFile(c.archivo); err == nil {
		if err := json.Unmarshal(b, &c.registros); err != nil {
			log.Fatal(err)
		}
	}
	go c.correr(context.Background())
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18655"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: c.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("gol en vivo en :%s (%d registros)", puerto, len(c.registros))
	log.Fatal(srv.ListenAndServe())
}
