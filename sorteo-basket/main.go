// Sorteo «basket» del taller «Orquestación con Qwen Coder» (JMD Learning): cada persona entra con su nombre y su
// WhatsApp, recibe un muñequito y tira al aro en una cancha compartida en vivo (WebSocket). El servidor decide
// todo: emite la fase del medidor, calcula el valor con su propio reloj, sortea el resultado con crypto/rand y
// difunde la trayectoria. Los primeros en llegar a 3 aciertos se llevan un cupo sorteado entre los que quedan.
// Estado en /datos/estado.json; la clave del panel en SORTEO_CLAVE (archivo .env del servidor, modo 600).
package main

import (
	"context"
	"crypto/subtle"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/coder/websocket"
)

//go:embed web
var web embed.FS

//go:embed config.json
var configBase []byte

var lima = time.FixedZone("Lima", -5*3600)

const maxClientes = 400

// maxPorIP: pantallas abiertas desde una misma IP (las operadoras móviles comparten IP entre clientes).
var maxPorIP = 60

// ---------- persistencia ----------

type almacen struct {
	mu    sync.Mutex
	ruta  string
	j     *Juego
	sucio atomic.Bool
}

func (a *almacen) guardar() error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.sucio.Store(false)
	b, err := a.j.Volcar()
	if err != nil {
		return err
	}
	tmp := a.ruta + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, a.ruta)
}

func (a *almacen) bucle() {
	for range time.Tick(time.Second) {
		if a.sucio.Load() {
			if err := a.guardar(); err != nil {
				log.Printf("guardar: %v", err)
			}
		}
	}
}

// ---------- hub ----------

type cliente struct {
	conn  *websocket.Conn
	send  chan []byte
	ip    string
	jid   string // protegido por hub.mu
	rtt   atomic.Int64
	cerro sync.Once
}

func (c *cliente) cerrar(motivo string) {
	c.cerro.Do(func() { go c.conn.Close(websocket.StatusPolicyViolation, motivo) })
}

type hub struct {
	mu        sync.Mutex
	clientes  map[*cliente]struct{}
	porIP     map[string]int
	tiros     [][]any
	eventos   []any
	sucio     bool
	ultimoEst time.Time
	j         *Juego
	alm       *almacen
}

func nuevoHub(j *Juego, a *almacen) *hub {
	return &hub{clientes: map[*cliente]struct{}{}, porIP: map[string]int{}, j: j, alm: a}
}

func (h *hub) marcar() {
	h.mu.Lock()
	h.sucio = true
	h.mu.Unlock()
}

func (h *hub) enLinea() map[string]bool {
	on := map[string]bool{}
	for c := range h.clientes {
		if c.jid != "" {
			on[c.jid] = true
		}
	}
	return on
}

func (h *hub) difundir(b []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clientes {
		select {
		case c.send <- b:
		default:
			c.cerrar("lento")
		}
	}
}

func enviar(c *cliente, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	select {
	case c.send <- b:
	default:
		c.cerrar("lento")
	}
}

// bucle: cada 100 ms junta los tiros y avisos pendientes en un solo mensaje, y el estado completo como mucho
// cada 400 ms y solo si cambió algo (inscripción, conexión, ganador, panel).
func (h *hub) bucle() {
	for range time.Tick(100 * time.Millisecond) {
		h.mu.Lock()
		tiros, eventos := h.tiros, h.eventos
		h.tiros, h.eventos = nil, nil
		var est []byte
		if h.sucio && time.Since(h.ultimoEst) >= 400*time.Millisecond {
			h.sucio = false
			h.ultimoEst = time.Now()
			on := h.enLinea()
			h.mu.Unlock()
			est = h.j.Publico(on)
		} else {
			h.mu.Unlock()
		}
		if len(tiros) > 0 {
			b, _ := json.Marshal(map[string]any{"t": "tiros", "l": tiros})
			h.difundir(b)
		}
		for _, e := range eventos {
			b, _ := json.Marshal(e)
			h.difundir(b)
		}
		if est != nil {
			h.difundir(est)
		}
	}
}

func tiroJSON(t Tiro) []any {
	ok := 0
	if t.Ok {
		ok = 1
	}
	return []any{t.Jugador, t.R, ok, t.D, t.M, t.C, t.Aciertos, t.Tiros}
}

// Publico: estado para todas las pantallas. Solo nombre corto, nunca el WhatsApp.
func (j *Juego) Publico(on map[string]bool) []byte {
	j.mu.Lock()
	defer j.mu.Unlock()
	js := make([][]any, 0, len(j.est.Jugadores))
	for _, p := range j.est.Jugadores {
		o := 0
		if on[p.ID] {
			o = 1
		}
		js = append(js, []any{p.ID, corto(p.Nombre), p.Semilla, p.Num, p.Aciertos, p.Tiros, p.Gano, o})
	}
	gs := make([][]any, 0, len(j.est.Ganadores))
	for _, g := range j.est.Ganadores {
		p := j.porID[g.Jugador]
		if p == nil {
			continue
		}
		gs = append(gs, []any{g.Orden, p.ID, corto(p.Nombre), p.Semilla, p.Num, g.Premio, g.Grupo})
	}
	out := map[string]any{"t": "est", "ab": j.est.Abierto, "ce": j.est.Cerrado, "r": j.est.Restantes, "j": js, "g": gs,
		"ahora": time.Now().UnixMilli()}
	if j.est.Cerrado {
		out["ceT"] = j.ahora().Sub(j.est.CerradoEn).Milliseconds()
		// el descuento grande se anuncia en público; los demás porcentajes solo los ve cada jugador
		esp := [][]any{}
		for _, id := range j.est.Especiales {
			if p := j.porID[id]; p != nil {
				esp = append(esp, []any{p.ID, corto(p.Nombre), p.Semilla, p.Num})
			}
		}
		out["esp"] = esp
		out["nc"] = len(j.est.Consuelos)
	}
	b, _ := json.Marshal(out)
	return b
}

func (j *Juego) cfgPublica() map[string]any {
	return map[string]any{"t": "cfg", "meta": j.cfg.Meta, "espera": j.cfg.EsperaMs, "premios": j.cfg.Premios,
		"taller": j.cfg.Taller, "titulo": j.cfg.Titulo, "revelar": j.cfg.RevelarMs, "consuelo": j.cfg.Consuelo,
		"whatsapp": j.cfg.WhatsApp}
}

// yo: datos del propio jugador, con su descuento si ya se sorteó. Se llama con j.mu tomado.
func (j *Juego) yo(p *Jugador) map[string]any {
	paga, esp := j.consuelo(p.ID)
	return map[string]any{"t": "yo", "id": p.ID, "token": p.Token, "corto": corto(p.Nombre), "s": p.Semilla,
		"num": p.Num, "a": p.Aciertos, "n": p.Tiros, "gano": p.Gano, "paga": paga, "esp": esp}
}

func faseJSON(f *Fase, espera int) map[string]any {
	return map[string]any{"t": "fase", "f": f.ID, "p": f.P, "c": f.C, "h": f.H, "x": f.X, "w": espera}
}

func (h *hub) atender(w http.ResponseWriter, r *http.Request) {
	o := r.Header.Get("Origin")
	if u, err := url.Parse(o); o == "" || err != nil || !strings.EqualFold(u.Host, r.Host) {
		http.Error(w, "origen no permitido", http.StatusForbidden)
		return
	}
	ip := ipDe(r)
	h.mu.Lock()
	if len(h.clientes) >= maxClientes || h.porIP[ip] >= maxPorIP {
		h.mu.Unlock()
		http.Error(w, "lleno", http.StatusServiceUnavailable)
		return
	}
	h.porIP[ip]++
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		if h.porIP[ip]--; h.porIP[ip] <= 0 {
			delete(h.porIP, ip)
		}
		h.mu.Unlock()
	}()

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{CompressionMode: websocket.CompressionDisabled})
	if err != nil {
		return
	}
	conn.SetReadLimit(2048)
	c := &cliente{conn: conn, send: make(chan []byte, 96), ip: ip}
	c.rtt.Store(300)
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	h.mu.Lock()
	h.clientes[c] = struct{}{}
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.clientes, c)
		if c.jid != "" {
			h.sucio = true
		}
		h.mu.Unlock()
		conn.CloseNow()
	}()

	// escritor
	go func() {
		defer cancel()
		for {
			select {
			case <-ctx.Done():
				return
			case b := <-c.send:
				wctx, wc := context.WithTimeout(ctx, 5*time.Second)
				err := conn.Write(wctx, websocket.MessageText, b)
				wc()
				if err != nil {
					return
				}
			}
		}
	}()
	// ping: mide la latencia (para la holgura del tiro) y corta conexiones muertas
	go func() {
		t := time.NewTicker(8 * time.Second)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				pctx, pc := context.WithTimeout(ctx, 10*time.Second)
				ini := time.Now()
				err := conn.Ping(pctx)
				pc()
				if err != nil {
					cancel()
					return
				}
				ms := time.Since(ini).Milliseconds()
				c.rtt.Store((c.rtt.Load()*2 + ms) / 3)
			}
		}
	}()

	enviar(c, h.j.cfgPublica())
	h.mu.Lock()
	on := h.enLinea()
	h.mu.Unlock()
	select {
	case c.send <- h.j.Publico(on):
	default:
	}

	var (
		cubo     = 12.0
		ultCubo  = time.Now()
		ultEntra time.Time
	)
	for {
		_, b, err := conn.Read(ctx)
		if err != nil {
			return
		}
		// 8 mensajes por segundo, con ráfagas de 12
		ahora := time.Now()
		cubo += ahora.Sub(ultCubo).Seconds() * 8
		ultCubo = ahora
		if cubo > 12 {
			cubo = 12
		}
		if cubo < 1 {
			continue
		}
		cubo--
		var m struct {
			T      string `json:"t"`
			Token  string `json:"token"`
			Nombre string `json:"nombre"`
			Tel    string `json:"tel"`
			S      uint32 `json:"s"`
			F      uint32 `json:"f"`
			E      int    `json:"e"`
		}
		if json.Unmarshal(b, &m) != nil {
			continue
		}
		switch m.T {
		case "hola":
			if p := h.j.PorToken(m.Token); m.Token != "" && p != nil {
				h.vincular(c, p)
			} else {
				enviar(c, map[string]any{"t": "muestra", "s": SemillaNueva()})
			}
		case "otro":
			enviar(c, map[string]any{"t": "muestra", "s": SemillaNueva()})
		case "entrar":
			if ahora.Sub(ultEntra) < 700*time.Millisecond {
				continue
			}
			ultEntra = ahora
			p, err := h.j.Entrar(m.Nombre, m.Tel, ip, m.S)
			if err != nil {
				enviar(c, map[string]any{"t": "error", "de": "entrar", "m": err.Error()})
				continue
			}
			h.alm.sucio.Store(true)
			h.vincular(c, p)
		case "tiro":
			h.mu.Lock()
			jid := c.jid
			h.mu.Unlock()
			if jid == "" {
				continue
			}
			hol := int(c.rtt.Load()) + 150
			hol = max(200, min(hol, 700))
			t, v, err := h.j.Tirar(jid, m.F, m.E, hol)
			switch {
			case errors.Is(err, ErrEspera), errors.Is(err, ErrFase):
				if f, w := h.j.NuevaFase(jid); f != nil {
					enviar(c, faseJSON(f, w))
				}
				continue
			case err != nil:
				enviar(c, map[string]any{"t": "error", "de": "tiro", "m": err.Error()})
				continue
			}
			tj := tiroJSON(t)
			enviar(c, map[string]any{"t": "tiro", "l": tj})
			if f, w := h.j.NuevaFase(jid); f != nil {
				enviar(c, faseJSON(f, w))
			}
			h.mu.Lock()
			h.tiros = append(h.tiros, tj)
			if v != nil {
				h.eventos = append(h.eventos, map[string]any{"t": "gana", "o": v.Orden, "id": v.Jugador, "corto": v.Corto,
					"s": v.Semilla, "num": v.Num, "p": v.Premio, "g": v.Grupo})
				h.sucio = true
			}
			h.mu.Unlock()
			if v != nil {
				if err := h.alm.guardar(); err != nil {
					log.Printf("guardar ganador: %v", err)
				}
			} else {
				h.alm.sucio.Store(true)
			}
		}
	}
}

// avisarPersonales manda a cada pantalla con jugador su propio resultado (tras cerrar el sorteo).
func (h *hub) avisarPersonales() {
	h.mu.Lock()
	pares := map[*cliente]string{}
	for c := range h.clientes {
		if c.jid != "" {
			pares[c] = c.jid
		}
	}
	h.mu.Unlock()
	for c, id := range pares {
		h.j.mu.Lock()
		p := h.j.porID[id]
		var m map[string]any
		if p != nil {
			m = h.j.yo(p)
		}
		h.j.mu.Unlock()
		if m != nil {
			enviar(c, m)
		}
	}
}

func (h *hub) vincular(c *cliente, p *Jugador) {
	h.mu.Lock()
	c.jid = p.ID
	h.sucio = true
	h.mu.Unlock()
	h.j.mu.Lock()
	m := h.j.yo(p)
	h.j.mu.Unlock()
	enviar(c, m)
	if f, w := h.j.NuevaFase(p.ID); f != nil {
		enviar(c, faseJSON(f, w))
	}
}

// ---------- http ----------

func escribir(w http.ResponseWriter, cod int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(cod)
	json.NewEncoder(w).Encode(v)
}

func ipDe(r *http.Request) string {
	if ip := strings.TrimSpace(r.Header.Get("X-Real-IP")); ip != "" {
		return ip
	}
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

func cabeceras(w http.ResponseWriter) {
	w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
}

func cargarConfig() Config {
	b := configBase
	if ruta := os.Getenv("SORTEO_CONFIG"); ruta != "" {
		var err error
		if b, err = os.ReadFile(ruta); err != nil {
			log.Fatalf("SORTEO_CONFIG: %v", err)
		}
	}
	var cfg Config
	if err := json.Unmarshal(b, &cfg); err != nil {
		log.Fatalf("config.json: %v", err)
	}
	if err := cfg.validar(); err != nil {
		log.Fatal(err)
	}
	return cfg
}

func main() {
	clave := os.Getenv("SORTEO_CLAVE")
	if v, err := strconv.Atoi(os.Getenv("SORTEO_MAX_CONEX_IP")); err == nil && v > 0 {
		maxPorIP = v
	}
	dir := os.Getenv("SORTEO_DATOS")
	if dir == "" {
		dir = "."
	}
	j := NuevoJuego(cargarConfig())
	alm := &almacen{ruta: filepath.Join(dir, "estado.json"), j: j}
	if b, err := os.ReadFile(alm.ruta); err == nil {
		if err := j.Cargar(b); err != nil {
			log.Fatalf("estado.json ilegible, no lo piso: %v", err)
		}
	} else if err := alm.guardar(); err != nil {
		log.Fatalf("no puedo escribir %s: %v", alm.ruta, err)
	}
	go alm.bucle()
	h := nuevoHub(j, alm)
	go h.bucle()

	esAdmin := func(r *http.Request) bool {
		k := r.Header.Get("X-Clave")
		if k == "" {
			k = r.URL.Query().Get("k")
		}
		return clave != "" && subtle.ConstantTimeCompare([]byte(k), []byte(clave)) == 1
	}

	estaticos, _ := fs.Sub(web, "web")
	archivos := http.FileServer(http.FS(estaticos))
	mux := http.NewServeMux()
	pagina := func(nombre string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			b, _ := web.ReadFile("web/" + nombre)
			cabeceras(w)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-store")
			w.Write(b)
		}
	}
	mux.HandleFunc("GET /{$}", pagina("index.html"))
	mux.HandleFunc("GET /admin", func(w http.ResponseWriter, r *http.Request) {
		if !esAdmin(r) {
			http.NotFound(w, r)
			return
		}
		pagina("admin.html")(w, r)
	})
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".html") || strings.HasSuffix(r.URL.Path, "/") {
			http.NotFound(w, r)
			return
		}
		cabeceras(w)
		if strings.HasPrefix(r.URL.Path, "/fonts/") || strings.HasPrefix(r.URL.Path, "/img/") {
			w.Header().Set("Cache-Control", "public, max-age=604800")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		archivos.ServeHTTP(w, r)
	})
	mux.HandleFunc("GET /api/salud", func(w http.ResponseWriter, r *http.Request) { escribir(w, 200, map[string]bool{"ok": true}) })
	mux.HandleFunc("GET /ws", h.atender)

	admin := func(f func()) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !esAdmin(r) {
				http.NotFound(w, r)
				return
			}
			if f != nil {
				f()
				h.marcar()
				if err := alm.guardar(); err != nil {
					log.Printf("guardar: %v", err)
				}
			}
			h.mu.Lock()
			on := h.enLinea()
			conectados := len(h.clientes)
			h.mu.Unlock()
			escribir(w, 200, j.Panel(on, conectados))
		}
	}
	mux.HandleFunc("GET /api/admin/estado", admin(nil))
	mux.HandleFunc("POST /api/admin/abrir", admin(func() { j.Abrir(true) }))
	mux.HandleFunc("POST /api/admin/pausar", admin(func() { j.Abrir(false) }))
	mux.HandleFunc("POST /api/admin/cerrar", admin(func() { j.Cerrar(true); go h.avisarPersonales() }))
	mux.HandleFunc("POST /api/admin/reabrir", admin(func() { j.Cerrar(false) }))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func() {
		if b, err := j.Volcar(); err == nil {
			os.WriteFile(filepath.Join(dir, fmt.Sprintf("estado-%s.json", time.Now().In(lima).Format("20060102-150405"))), b, 0o600)
		}
		j.Reiniciar()
	}))

	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18740"
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: mux, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		s := make(chan os.Signal, 1)
		signal.Notify(s, syscall.SIGTERM, syscall.SIGINT)
		<-s
		if err := alm.guardar(); err != nil {
			log.Printf("guardar al salir: %v", err)
		}
		os.Exit(0)
	}()
	log.Printf("sorteo-basket en :%s (jugadores %d, cupos que quedan %d)", puerto, len(j.est.Jugadores), j.Quedan())
	log.Fatal(srv.ListenAndServe())
}

// Panel: todo, con nombre completo y WhatsApp, solo para el panel con clave.
func (j *Juego) Panel(on map[string]bool, conectados int) map[string]any {
	j.mu.Lock()
	defer j.mu.Unlock()
	type fila struct {
		ID       string `json:"id"`
		Nombre   string `json:"nombre"`
		Corto    string `json:"corto"`
		Tel      string `json:"tel"`
		Semilla  uint32 `json:"s"`
		Num      int    `json:"num"`
		Aciertos int    `json:"a"`
		Tiros    int    `json:"n"`
		Gano     int    `json:"gano"`
		EnLinea  bool   `json:"on"`
		Hora     string `json:"hora"`
		Paga     int    `json:"paga"`
		Especial bool   `json:"esp"`
	}
	js := []fila{}
	for _, p := range j.est.Jugadores {
		paga, esp := j.consuelo(p.ID)
		js = append(js, fila{p.ID, p.Nombre, corto(p.Nombre), p.Tel, p.Semilla, p.Num, p.Aciertos, p.Tiros, p.Gano, on[p.ID], p.Creado.In(lima).Format("15:04"), paga, esp})
	}
	type gan struct {
		Orden   int    `json:"orden"`
		Nombre  string `json:"nombre"`
		Tel     string `json:"tel"`
		Premio  string `json:"premio"`
		Grupo   string `json:"grupo"`
		Tiros   int    `json:"tiros"`
		Hora    string `json:"hora"`
		Semilla uint32 `json:"s"`
		Num     int    `json:"num"`
	}
	gs := []gan{}
	for _, g := range j.est.Ganadores {
		p := j.porID[g.Jugador]
		if p == nil {
			continue
		}
		gs = append(gs, gan{g.Orden, p.Nombre, p.Tel, g.Premio, g.Grupo, g.Tiros, g.Hora.In(lima).Format("15:04:05"), p.Semilla, p.Num})
	}
	return map[string]any{"abierto": j.est.Abierto, "cerrado": j.est.Cerrado, "restantes": j.est.Restantes,
		"premios": j.cfg.Premios, "meta": j.cfg.Meta, "consuelo": j.cfg.Consuelo, "jugadores": js, "ganadores": gs, "conectados": conectados}
}
