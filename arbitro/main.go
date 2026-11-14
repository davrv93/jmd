// «Árbitro · Adivina la tarjeta y entras a Claude Code PRO».
//
// Juego instantáneo, hermano de Balón de Oro: la persona escribe su nombre y
// apellido, recibe un token y tiene unas pocas jugadas (3 por defecto). En
// cada jugada ve una falta y elige qué saca el árbitro: amarilla, roja o nada.
// El servidor decide con crypto/rand si acierta, con probabilidad 1/prob (1/250
// por defecto). Lo que elige la persona no cambia esa probabilidad: si acierta,
// el árbitro saca lo que eligió; si no, saca una de las otras dos opciones, al
// azar y por igual.
//
// Premios, en este orden: el primer acierto se lleva un código 100 %, el
// segundo y el tercero un código 80 %. Los códigos los emite la API del sorteo
// de Claude Code PRO. Cuando se agotan se sigue pudiendo jugar, pero acertar ya
// no da premio.
//
// Segunda oportunidad: quien usa sus jugadas sin ganar premio tiene UN tiro
// libre. Antes del disparo dice si entra el gol (sí o no) y el servidor decide
// que acierta con probabilidad 1/prob_tiro_libre (1/2 por defecto). Acertar da
// un código 85 %; cupos_50 pone tope a esos códigos (0 = sin tope).
//
// Los ganadores del sorteo de Claude Code PRO pueden jugar, pero nunca ganan
// (ni el juego principal ni el tiro libre): la lista vive en la configuración y
// se compara palabra por palabra.
package main

import (
	"bytes"
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

var lima = time.FixedZone("Lima", -5*3600)

// Registros nuevos permitidos desde una misma conexión en un mismo día (Lima).
const topeIPDia = 12

// Dónde se usa el código ganado.
const urlMatricula = "https://jmd-learn.online/sorteo-claude/matricula?c="

// Lo que puede sacar el árbitro.
var tarjetas = []string{"amarilla", "roja", "nada"}

// Cómo se pierde el gol en el tiro libre cuando no entra.
var fallosTiroLibre = []string{"barrera", "palo", "atajada", "afuera"}

// Juego del ganador: "" = juego principal (tarjeta); este = tiro libre.
const juegoTiroLibre = "tiro_libre"

// Descuento del código del tiro libre.
const descuentoTiroLibre = 85

// Aviso para quien ya ganó en Claude Code PRO.
const avisoExcluido = "Ya ganaste en Claude Code PRO: puedes jugar, pero esta vez los cupos son para otros"

type Config struct {
	Prob      int      `json:"prob"`    // 1 acierto de cada Prob jugadas
	Jugadas   int      `json:"jugadas"` // jugadas por persona
	Premios   []int    `json:"premios"` // descuento de cada premio, en orden de entrega
	Excluidos []string `json:"excluidos"`
	// Tiro libre (segunda oportunidad).
	ProbTiroLibre int `json:"prob_tiro_libre"` // acierta 1 de cada ProbTiroLibre
	Cupos50       int `json:"cupos_50"`        // tope de códigos del tiro libre (85 %); 0 = sin tope
}

type Jugador struct {
	ID        int       `json:"id"`
	Nombre    string    `json:"nombre"`
	Token     string    `json:"token"`
	IP        string    `json:"ip"`
	CreadoEn  time.Time `json:"creadoEn"`
	Jugadas   int       `json:"jugadas"`   // jugadas ya usadas
	Aciertos  int       `json:"aciertos"`  // aciertos, con o sin premio
	Gano      bool      `json:"gano"`      // ganó un premio (cualquiera)
	TiroLibre bool      `json:"tiroLibre"` // ya usó su tiro libre
}

type Ganador struct {
	ID              int       `json:"id"`
	Jugador         int       `json:"jugador"`
	Nombre          string    `json:"nombre"`
	NombreCensurado string    `json:"nombreCensurado"`
	Descuento       int       `json:"descuento"`
	Codigo          string    `json:"codigo"` // vacío = pendiente (la API del sorteo no respondió)
	Fecha           time.Time `json:"fecha"`
	Jugada          int       `json:"jugada"`
	Tarjeta         string    `json:"tarjeta,omitempty"` // juego principal
	Juego           string    `json:"juego,omitempty"`   // "" = principal; "tiro_libre"
	Gol             *bool     `json:"gol,omitempty"`     // tiro libre: si entró
}

type Estado struct {
	Config         Config    `json:"config"`
	Siguiente      int       `json:"siguiente"`
	Jugadores      []Jugador `json:"jugadores"`
	Ganadores      []Ganador `json:"ganadores"`
	JugadasTotales int       `json:"jugadasTotales"`
	Aciertos       int       `json:"aciertos"`
	TirosLibres    int       `json:"tirosLibres"` // tiros libres pateados
	AciertosTL     int       `json:"aciertosTL"`  // de ellos, acertados
}

type Servidor struct {
	mu          sync.Mutex
	e           Estado
	archivo     string
	clave       string
	porIP       map[string]int // "ip|día" → registros
	ahora       func() time.Time
	azar        func(n int) int                     // entero uniforme en [0, n)
	pedirCodigo func(descuento int) (string, error) // código de la API del sorteo
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

// Entero uniforme en [0, n) con crypto/rand. Sin sesgo de módulo.
func azar(n int) int {
	if n <= 1 {
		return 0
	}
	x, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		panic(err)
	}
	return int(x.Int64())
}

func tarjetaValida(t string) bool {
	for _, x := range tarjetas {
		if x == t {
			return true
		}
	}
	return false
}

// Decide una jugada. Acierta con probabilidad 1/prob (nunca si está
// excluido). Si acierta, el árbitro saca lo elegido; si no, una de las otras
// dos opciones, al azar y por igual. La elección no toca la probabilidad.
func decidir(eleccion string, prob int, excluido bool, az func(int) int) (acierto bool, tarjeta string) {
	acierto = az(prob) == 0 && !excluido
	if acierto {
		return true, eleccion
	}
	otras := make([]string, 0, 2)
	for _, t := range tarjetas {
		if t != eleccion {
			otras = append(otras, t)
		}
	}
	return false, otras[az(len(otras))]
}

// Decide el tiro libre. «Sí» = la persona dice que entra. Acierta con
// probabilidad 1/prob (nunca si está excluido); el gol se elige para que la
// predicción salga bien o mal según eso. Si no entra, el modo de fallar sale
// al azar entre barrera, palo, atajada y afuera.
func decidirTiroLibre(diceGol bool, prob int, excluido bool, az func(int) int) (acierto, gol bool, resultado string) {
	acierto = az(prob) == 0 && !excluido
	gol = diceGol == acierto
	if gol {
		return acierto, true, "gol"
	}
	return acierto, false, fallosTiroLibre[az(len(fallosTiroLibre))]
}

func (s *Servidor) guardar() {
	b, _ := json.MarshalIndent(s.e, "", "  ")
	tmp := s.archivo + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("guardar: %v", err)
		return
	}
	if err := os.Rename(tmp, s.archivo); err != nil {
		log.Printf("guardar: %v", err)
	}
}

func responder(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fallo(w http.ResponseWriter, code int, msg string) {
	responder(w, code, map[string]string{"error": msg})
}

var espacios = regexp.MustCompile(`\s+`)
var nombreValido = regexp.MustCompile(`^[\p{L}\p{M}0-9 .'\-]+$`)

func limpiarNombre(n string) string {
	return strings.TrimSpace(espacios.ReplaceAllString(n, " "))
}

func clave(n string) string { return strings.ToLower(limpiarNombre(n)) }

var tildes = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n")

// ¿Es alguno de los ganadores de Claude Code PRO? Cada entrada de la lista
// debe aparecer completa, palabra por palabra, dentro del nombre («carlos
// saavedra» casa con «Carlos Saavedra Vad», no con «Carlos Pérez»).
func (c Config) excluido(nombre string) bool {
	n := " " + tildes.Replace(clave(nombre)) + " "
	for _, ex := range c.Excluidos {
		if strings.TrimSpace(ex) == "" {
			continue
		}
		todas := true
		for _, pal := range strings.Fields(tildes.Replace(strings.ToLower(ex))) {
			if !strings.Contains(n, " "+pal+" ") {
				todas = false
				break
			}
		}
		if todas {
			return true
		}
	}
	return false
}

func nombreOK(n string) bool {
	c := utf8.RuneCountInString(n)
	return c >= 3 && c <= 40 && nombreValido.MatchString(n) && strings.Contains(n, " ")
}

var particulas = map[string]bool{"de": true, "del": true, "la": true, "las": true, "los": true, "y": true}

// Nombre para publicar: solo la inicial de cada nombre y apellido, sin
// partículas («Ines Jaimes» → «I. J.», «Ana de la Cruz» → «A. C.»).
func censurar(nombre string) string {
	var ini []string
	for _, p := range strings.Fields(limpiarNombre(nombre)) {
		if particulas[strings.ToLower(p)] {
			continue
		}
		r := []rune(p)
		ini = append(ini, strings.ToUpper(string(r[0]))+".")
	}
	return strings.Join(ini, " ")
}

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return strings.Split(r.RemoteAddr, ":")[0]
}

func (s *Servidor) claveIP(ip string, t time.Time) string {
	return ip + "|" + t.In(lima).Format("2006-01-02")
}

// Ganadores del juego principal (los de la tarjeta), en orden.
func (s *Servidor) principales() []Ganador {
	var gs []Ganador
	for _, g := range s.e.Ganadores {
		if g.Juego == "" {
			gs = append(gs, g)
		}
	}
	return gs
}

// Códigos del tiro libre ya dados (85 %; los primeros salieron al 50 %).
func (s *Servidor) dados50() int { return len(s.e.Ganadores) - len(s.principales()) }

// ¿Queda código para el tiro libre? (-1 = sin tope)
func (s *Servidor) quedan50() int {
	if s.e.Config.Cupos50 <= 0 {
		return -1
	}
	return max(0, s.e.Config.Cupos50-s.dados50())
}

// ¿Puede patear su tiro libre? Ya usó todas sus jugadas, no ganó premio y no
// lo pateó todavía.
func (s *Servidor) tiroLibreDisponible(j Jugador) bool {
	return !j.Gano && !j.TiroLibre && j.Jugadas >= s.e.Config.Jugadas
}

func (s *Servidor) quedan() int {
	q := len(s.e.Config.Premios) - len(s.principales())
	if q < 0 {
		return 0
	}
	return q
}

// Descuento del próximo premio por entregar (0 si ya no quedan).
func (s *Servidor) proximoDescuento() int {
	if s.quedan() == 0 {
		return 0
	}
	return s.e.Config.Premios[len(s.principales())]
}

func (s *Servidor) jugador(token string) int {
	if token == "" {
		return -1
	}
	for i, j := range s.e.Jugadores {
		if j.Token == token {
			return i
		}
	}
	return -1
}

func (s *Servidor) ganadorDe(jugador int) *Ganador {
	for i := range s.e.Ganadores {
		if s.e.Ganadores[i].Jugador == jugador {
			return &s.e.Ganadores[i]
		}
	}
	return nil
}

// Lo que ve cualquiera: contadores, premios y ganadores con iniciales. Nunca
// el nombre completo ni el código.
func (s *Servidor) publico() map[string]any {
	cfg := s.e.Config
	ps := s.principales()
	premios := make([]map[string]any, 0, len(cfg.Premios))
	for k, d := range cfg.Premios {
		p := map[string]any{"puesto": k + 1, "descuento": d, "entregado": k < len(ps)}
		if k < len(ps) {
			p["ganador"] = censurar(ps[k].Nombre)
		}
		premios = append(premios, p)
	}
	gs := make([]map[string]any, 0, len(s.e.Ganadores))
	for _, g := range s.e.Ganadores {
		juego := g.Juego
		if juego == "" {
			juego = "tarjeta"
		}
		gs = append(gs, map[string]any{"nombre": censurar(g.Nombre), "fecha": g.Fecha, "jugada": g.Jugada, "descuento": g.Descuento, "juego": juego})
	}
	tl := map[string]any{
		"prob": fmt.Sprintf("1 de %d", cfg.ProbTiroLibre), "prob_n": cfg.ProbTiroLibre, "descuento": descuentoTiroLibre,
		"pateados": s.e.TirosLibres, "aciertos": s.e.AciertosTL, "codigos_50": s.dados50(), "cupos_50": cfg.Cupos50,
	}
	if q := s.quedan50(); q >= 0 {
		tl["quedan_50"] = q
	}
	return map[string]any{
		"tiro_libre":          tl,
		"premios":             premios,
		"quedan":              s.quedan(),
		"agotados":            s.quedan() == 0,
		"jugadas_totales":     s.e.JugadasTotales,
		"aciertos":            s.e.Aciertos,
		"prob":                fmt.Sprintf("1 de %d", cfg.Prob),
		"prob_n":              cfg.Prob,
		"jugadas_por_persona": cfg.Jugadas,
		"ganadores":           gs,
		"matricula":           urlMatricula,
		"ahora":               s.ahora().UTC(),
	}
}

func (s *Servidor) excluido(j Jugador) bool { return s.e.Config.excluido(j.Nombre) }

// Lo que ve la persona con su token.
func (s *Servidor) mio(i int) map[string]any {
	j := s.e.Jugadores[i]
	out := map[string]any{
		"t": j.Token, "nombre": j.Nombre, "jugadas": j.Jugadas, "jugadas_restantes": max(0, s.e.Config.Jugadas-j.Jugadas),
		"aciertos": j.Aciertos, "gane": j.Gano, "excluido": s.excluido(j),
		"tiro_libre_disponible": s.tiroLibreDisponible(j), "tiro_libre_usado": j.TiroLibre,
	}
	if s.excluido(j) {
		out["aviso"] = avisoExcluido
	}
	if g := s.ganadorDe(j.ID); g != nil {
		out["codigo"] = g.Codigo
		out["codigo_pendiente"] = g.Codigo == ""
		out["descuento"] = g.Descuento
		out["jugada"] = g.Jugada
		out["id"] = g.ID
		out["juego"] = g.Juego
	}
	return out
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	c := r.Header.Get("X-Clave")
	return c != "" && subtle.ConstantTimeCompare([]byte(c), []byte(s.clave)) == 1
}

func leerJSON(r *http.Request, v any, max int64) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, max)).Decode(v)
}

// Pide un código de descuento a la API del sorteo de Claude Code PRO:
// POST /api/admin/codigo {"descuento": N} con X-Clave → {"codigo": "CCP-…"}.
func pedirCodigoClaude(url, clave string) func(int) (string, error) {
	return func(descuento int) (string, error) {
		if url == "" || clave == "" {
			return "", fmt.Errorf("CLAUDE_ADMIN_URL o CLAUDE_ADMIN_CLAVE sin configurar")
		}
		cuerpo, _ := json.Marshal(map[string]int{"descuento": descuento})
		req, err := http.NewRequest("POST", strings.TrimRight(url, "/")+"/api/admin/codigo", bytes.NewReader(cuerpo))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Clave", clave)
		resp, err := (&http.Client{Timeout: 6 * time.Second}).Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return "", fmt.Errorf("la API del sorteo respondió %s", resp.Status)
		}
		var out struct {
			Codigo string `json:"codigo"`
		}
		if err := json.NewDecoder(io.LimitReader(resp.Body, 4096)).Decode(&out); err != nil || out.Codigo == "" {
			return "", fmt.Errorf("respuesta sin código")
		}
		return out.Codigo, nil
	}
}

// Pide el código para un ganador recién anotado y lo agrega a la respuesta. Se
// llama fuera del candado: la API del sorteo puede tardar. Si falla, el premio
// queda guardado con código pendiente y el admin lo completa.
func (s *Servidor) entregarCodigo(ganador Ganador, out map[string]any) {
	codigo, err := s.pedirCodigo(ganador.Descuento)
	if err != nil {
		log.Printf("código %d %% para el ganador %d: %v", ganador.Descuento, ganador.ID, err)
	}
	s.mu.Lock()
	for k := range s.e.Ganadores {
		if s.e.Ganadores[k].ID == ganador.ID {
			s.e.Ganadores[k].Codigo = codigo
		}
	}
	s.guardar()
	s.mu.Unlock()
	out["codigo"] = codigo
	out["codigo_pendiente"] = codigo == ""
	out["descuento"] = ganador.Descuento
	if codigo != "" {
		out["matricula"] = urlMatricula + codigo
	}
}

func (s *Servidor) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	estaticos := http.FileServer(http.FS(web))
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		b, err := fs.ReadFile(web, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write(b)
	})
	mux.Handle("GET /static/", estaticos)

	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.publico())
	})

	mux.HandleFunc("GET /api/yo", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		i := s.jugador(r.URL.Query().Get("t"))
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		responder(w, 200, s.mio(i))
	})

	mux.HandleFunc("POST /api/inscribir", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre string `json:"nombre"`
			Token  string `json:"t"`
		}
		if err := leerJSON(r, &in, 4096); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if i := s.jugador(in.Token); i >= 0 {
			responder(w, 200, s.mio(i))
			return
		}
		nombre := limpiarNombre(in.Nombre)
		if !nombreOK(nombre) {
			fallo(w, 400, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres).")
			return
		}
		for _, j := range s.e.Jugadores {
			if clave(j.Nombre) == clave(nombre) {
				fallo(w, 409, "Ese nombre ya jugó. Si eres tú, entra desde el mismo navegador con el que empezaste.")
				return
			}
		}
		ip := ipDe(r)
		k := s.claveIP(ip, s.ahora())
		if s.porIP[k] >= topeIPDia {
			fallo(w, 429, "Demasiados registros desde esta conexión por hoy.")
			return
		}
		s.porIP[k]++
		s.e.Siguiente++
		j := Jugador{ID: s.e.Siguiente, Nombre: nombre, Token: nuevoToken(), IP: ip, CreadoEn: s.ahora().UTC()}
		s.e.Jugadores = append(s.e.Jugadores, j)
		s.guardar()
		responder(w, 200, s.mio(len(s.e.Jugadores)-1))
	})

	mux.HandleFunc("POST /api/jugar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token    string `json:"t"`
			Eleccion string `json:"eleccion"`
		}
		if err := leerJSON(r, &in, 1024); err != nil || !tarjetaValida(in.Eleccion) {
			fallo(w, 400, "Elige amarilla, roja o sin tarjeta.")
			return
		}
		s.mu.Lock()
		i := s.jugador(in.Token)
		if i < 0 {
			s.mu.Unlock()
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		cfg := s.e.Config
		j := &s.e.Jugadores[i]
		if j.Gano {
			s.mu.Unlock()
			fallo(w, 409, "Ya acertaste: tu premio está guardado.")
			return
		}
		if j.Jugadas >= cfg.Jugadas {
			s.mu.Unlock()
			fallo(w, 409, "Se acabaron tus jugadas. Gracias por jugar.")
			return
		}
		j.Jugadas++
		s.e.JugadasTotales++
		jugada := j.Jugadas
		acierto, tarjeta := decidir(in.Eleccion, cfg.Prob, cfg.excluido(j.Nombre), s.azar)
		var ganador *Ganador
		if acierto {
			s.e.Aciertos++
			j.Aciertos++
			if d := s.proximoDescuento(); d > 0 {
				j.Gano = true
				g := Ganador{ID: len(s.e.Ganadores) + 1, Jugador: j.ID, Nombre: j.Nombre, NombreCensurado: censurar(j.Nombre),
					Descuento: d, Fecha: s.ahora().UTC(), Jugada: jugada, Tarjeta: tarjeta}
				s.e.Ganadores = append(s.e.Ganadores, g)
				ganador = &g
			}
		}
		out := map[string]any{
			"acierto": acierto, "eleccion": in.Eleccion, "tarjeta": tarjeta, "jugada": jugada,
			"jugadas_restantes": cfg.Jugadas - j.Jugadas, "quedan": s.quedan(), "agotados": s.quedan() == 0,
		}
		s.guardar()
		s.mu.Unlock()

		if ganador != nil {
			s.entregarCodigo(*ganador, out)
		}
		responder(w, 200, out)
	})

	// Segunda oportunidad: un tiro libre por persona tras perder sus jugadas.
	mux.HandleFunc("POST /api/tiro-libre", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token    string `json:"t"`
			Eleccion string `json:"eleccion"` // "si" = entra; "no" = no entra
		}
		if err := leerJSON(r, &in, 1024); err != nil || (in.Eleccion != "si" && in.Eleccion != "no") {
			fallo(w, 400, "Elige sí o no.")
			return
		}
		s.mu.Lock()
		i := s.jugador(in.Token)
		if i < 0 {
			s.mu.Unlock()
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		cfg := s.e.Config
		j := &s.e.Jugadores[i]
		switch {
		case j.Gano:
			s.mu.Unlock()
			fallo(w, 409, "Ya ganaste un premio: el tiro libre es para quien no ganó.")
			return
		case j.TiroLibre:
			s.mu.Unlock()
			fallo(w, 409, "Ya pateaste tu tiro libre. Gracias por jugar.")
			return
		case j.Jugadas < cfg.Jugadas:
			s.mu.Unlock()
			fallo(w, 409, "El tiro libre se abre cuando terminas tus jugadas.")
			return
		}
		j.TiroLibre = true
		s.e.TirosLibres++
		acierto, gol, resultado := decidirTiroLibre(in.Eleccion == "si", cfg.ProbTiroLibre, cfg.excluido(j.Nombre), s.azar)
		var ganador *Ganador
		if acierto {
			s.e.AciertosTL++
			if s.quedan50() != 0 {
				j.Gano = true
				g := Ganador{ID: len(s.e.Ganadores) + 1, Jugador: j.ID, Nombre: j.Nombre, NombreCensurado: censurar(j.Nombre),
					Descuento: descuentoTiroLibre, Fecha: s.ahora().UTC(), Jugada: 1, Juego: juegoTiroLibre, Gol: &gol}
				s.e.Ganadores = append(s.e.Ganadores, g)
				ganador = &g
			}
		}
		out := map[string]any{"acierto": acierto, "eleccion": in.Eleccion, "gol": gol, "resultado": resultado, "quedan_50": s.quedan50()}
		s.guardar()
		s.mu.Unlock()

		if ganador != nil {
			s.entregarCodigo(*ganador, out)
		}
		responder(w, 200, out)
	})

	noAutorizado := func(w http.ResponseWriter) {
		time.Sleep(400 * time.Millisecond)
		fallo(w, 401, "Clave incorrecta.")
	}
	admin := func(f func(w http.ResponseWriter, r *http.Request)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !s.esAdmin(r) {
				noAutorizado(w)
				return
			}
			s.mu.Lock()
			defer s.mu.Unlock()
			f(w, r)
		}
	}
	estadoAdmin := func() map[string]any {
		return map[string]any{
			"config": s.e.Config, "quedan": s.quedan(), "jugadasTotales": s.e.JugadasTotales, "aciertos": s.e.Aciertos,
			"tirosLibres": s.e.TirosLibres, "aciertosTL": s.e.AciertosTL, "quedan50": s.quedan50(),
			"jugadores": s.e.Jugadores, "ganadores": s.e.Ganadores, "ahora": s.ahora().UTC(),
		}
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/config", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Prob      *int      `json:"prob"`
			Jugadas   *int      `json:"jugadas"`
			Premios   *[]int    `json:"premios"`
			Excluidos *[]string `json:"excluidos"`
			ProbTL    *int      `json:"prob_tiro_libre"`
			Cupos50   *int      `json:"cupos_50"`
		}
		if err := leerJSON(r, &in, 65536); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		c := s.e.Config
		if in.Prob != nil {
			c.Prob = *in.Prob
		}
		if in.Jugadas != nil {
			c.Jugadas = *in.Jugadas
		}
		if in.Premios != nil {
			c.Premios = append([]int{}, *in.Premios...)
		}
		if in.ProbTL != nil {
			c.ProbTiroLibre = *in.ProbTL
		}
		if in.Cupos50 != nil {
			c.Cupos50 = *in.Cupos50
		}
		if in.Excluidos != nil {
			c.Excluidos = c.Excluidos[:0:0]
			for _, ex := range *in.Excluidos {
				if ex = limpiarNombre(ex); ex != "" {
					c.Excluidos = append(c.Excluidos, ex)
				}
			}
		}
		premiosOK := len(c.Premios) <= 100
		for _, d := range c.Premios {
			premiosOK = premiosOK && d >= 1 && d <= 100
		}
		if c.Prob < 1 || c.Prob > 1_000_000 || c.Jugadas < 1 || c.Jugadas > 100 || !premiosOK ||
			c.ProbTiroLibre < 1 || c.ProbTiroLibre > 1_000_000 || c.Cupos50 < 0 || c.Cupos50 > 10_000 {
			fallo(w, 400, "prob y prob_tiro_libre entre 1 y 1 000 000; jugadas entre 1 y 100; cada premio entre 1 y 100 %; cupos_50 entre 0 y 10 000.")
			return
		}
		s.e.Config = c
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Completa el código de un premio que quedó pendiente (o lo corrige). Con
	// «codigo» vacío lo vuelve a pedir a la API del sorteo, fuera del candado.
	mux.HandleFunc("POST /api/admin/codigo", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			noAutorizado(w)
			return
		}
		var in struct {
			ID     int    `json:"id"`
			Codigo string `json:"codigo"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		descuento := 0
		for _, g := range s.e.Ganadores {
			if g.ID == in.ID {
				descuento = g.Descuento
			}
		}
		s.mu.Unlock()
		if descuento == 0 {
			fallo(w, 404, "No hay un ganador con ese id.")
			return
		}
		codigo := strings.ToUpper(strings.TrimSpace(in.Codigo))
		if codigo == "" {
			var err error
			if codigo, err = s.pedirCodigo(descuento); err != nil {
				fallo(w, 502, "La API del sorteo no dio el código: "+err.Error())
				return
			}
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		for k := range s.e.Ganadores {
			if s.e.Ganadores[k].ID == in.ID {
				s.e.Ganadores[k].Codigo = codigo
				s.guardar()
				responder(w, 200, s.e.Ganadores[k])
				return
			}
		}
		fallo(w, 404, "No hay un ganador con ese id.")
	})
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.e.Jugadores, s.e.Ganadores = nil, nil
		s.e.Siguiente, s.e.JugadasTotales, s.e.Aciertos, s.e.TirosLibres, s.e.AciertosTL = 0, 0, 0, 0, 0
		s.porIP = map[string]int{}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	return mux
}

func entero(nombre string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(nombre)); err == nil && v > 0 {
		return v
	}
	return def
}

// Configuración con la que nace el estado. ARBITRO_PROB, ARBITRO_JUGADAS,
// ARBITRO_PROB_TIRO_LIBRE y ARBITRO_CUPOS_50 mandan la primera vez; después lo guardado (y lo que edite el admin) gana
// sobre el entorno. Los excluidos son los ganadores de Claude Code PRO.
func configInicial() Config {
	return Config{
		Prob: entero("ARBITRO_PROB", 250), Jugadas: entero("ARBITRO_JUGADAS", 3), Premios: []int{100, 80, 80},
		ProbTiroLibre: entero("ARBITRO_PROB_TIRO_LIBRE", 2), Cupos50: entero("ARBITRO_CUPOS_50", 0),
		Excluidos: []string{
			"Jack Castillo", "Gian Grobert", "Gian Mamani", "Raul Gamboa", "Mario Ccallo", "Mario Callo",
			"Merlin Requejo", "David Requejo", "Jhon Perez Medrano", "Jhon Perez", "John Perez Medrano",
			"Paul Huaman", "Arnold Morales", "Carlos Saavedra", "Ines Jaimes",
		},
	}
}

func main() {
	datos := os.Getenv("SORTEO_DATOS")
	if datos == "" {
		datos = "datos"
	}
	clave := os.Getenv("SORTEO_CLAVE")
	if clave == "" {
		log.Fatal("SORTEO_CLAVE es obligatoria")
	}
	if len(clave) < 12 {
		log.Printf("aviso: SORTEO_CLAVE corta (%d caracteres); usa 12 o más en producción", len(clave))
	}
	if err := os.MkdirAll(datos, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{
		archivo: filepath.Join(datos, "estado.json"), clave: clave, porIP: map[string]int{}, ahora: time.Now, azar: azar,
		pedirCodigo: pedirCodigoClaude(os.Getenv("CLAUDE_ADMIN_URL"), os.Getenv("CLAUDE_ADMIN_CLAVE")),
	}
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
	} else {
		s.e = Estado{Config: configInicial()}
		s.guardar()
	}
	if s.e.Config.ProbTiroLibre < 1 {
		s.e.Config.ProbTiroLibre = 2
	}
	for _, j := range s.e.Jugadores {
		s.porIP[s.claveIP(j.IP, j.CreadoEn)]++
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18580"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("árbitro en :%s (1 de %d, %d jugadas, premios %v, %d jugadores, %d aciertos)",
		puerto, s.e.Config.Prob, s.e.Config.Jugadas, s.e.Config.Premios, len(s.e.Jugadores), s.e.Aciertos)
	log.Fatal(srv.ListenAndServe())
}
