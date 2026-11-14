// «Balón de Oro · Mete gol y entras gratis».
//
// Juego instantáneo, no sorteo diferido: la persona escribe su nombre y
// apellido, recibe un token y tiene unos pocos tiros (BALON_TIROS, 3 por
// defecto). Cada tiro mete gol con probabilidad 1/BALON_PROB (1/250 por
// defecto) decidida en el servidor con crypto/rand. Hay BALON_VACANTES premios
// (2 por defecto): al meter gol con vacante libre, el servidor pide un código
// 100 % a la API del sorteo de Claude Code PRO y se lo muestra al ganador.
// Cuando las vacantes se agotan se sigue pudiendo patear, pero el gol ya no da
// premio.
//
// «Yashin» es el mismo juego al revés: la persona es la arquera o el arquero y
// cada penal que le patean lo ataja con la misma probabilidad 1/BALON_PROB.
// Usa la misma inscripción, sus propios BALON_TIROS intentos y las mismas
// vacantes: un cupo ganado en cualquiera de los dos juegos cuenta para ambos.
//
// Los ganadores del sorteo de Claude Code PRO no participan: la lista vive en
// la configuración y se compara palabra por palabra, como en el sorteo.
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

// Condición de esta edición: la página la dice grande.
const regla = "Esta vez no participa ningún ganador de Claude Code PRO"

// Registros nuevos permitidos desde una misma conexión en un mismo día (Lima).
const topeIPDia = 12

// Dónde se usa el código ganado.
const urlMatricula = "https://jmd-learn.online/sorteo-claude/matricula?c="

var fallos = []string{"atajado", "palo", "afuera"}

// Cómo entra el penal cuando el arquero no lo ataja (Yashin).
var golesRecibidos = []string{"angulo", "otro_lado", "centro"}

type Config struct {
	Prob      int      `json:"prob"`     // 1 gol de cada Prob tiros
	Tiros     int      `json:"tiros"`    // tiros por persona
	Vacantes  int      `json:"vacantes"` // premios 100 %
	Excluidos []string `json:"excluidos"`
}

type Jugador struct {
	ID       int       `json:"id"`
	Nombre   string    `json:"nombre"`
	Token    string    `json:"token"`
	IP       string    `json:"ip"`
	CreadoEn time.Time `json:"creadoEn"`
	Tiros    int       `json:"tiros"`    // tiros ya usados
	Goles    int       `json:"goles"`    // goles, con o sin premio
	Gano     bool      `json:"gano"`     // ganó un cupo (gol o atajada con vacante libre)
	Atajadas int       `json:"atajadas"` // penales de Yashin ya recibidos
	Atajo    int       `json:"atajo"`    // penales de Yashin atajados, con o sin premio
}

type Ganador struct {
	ID              int       `json:"id"`
	Jugador         int       `json:"jugador"`
	Nombre          string    `json:"nombre"`
	NombreCensurado string    `json:"nombreCensurado"`
	Codigo          string    `json:"codigo"` // vacío = pendiente (la API del sorteo no respondió)
	Fecha           time.Time `json:"fecha"`
	Tiro            int       `json:"tiro"`
	Juego           string    `json:"juego,omitempty"` // "" = Balón de Oro (gol); "yashin" = atajada
}

type Estado struct {
	Config       Config    `json:"config"`
	Siguiente    int       `json:"siguiente"`
	Jugadores    []Jugador `json:"jugadores"`
	Ganadores    []Ganador `json:"ganadores"`
	TirosTotales int       `json:"tirosTotales"`
	Goles        int       `json:"goles"`
	Penales      int       `json:"penales"`         // penales de Yashin pateados
	AtajadasOK   int       `json:"atajadasTotales"` // de ellos, atajados
}

type Servidor struct {
	mu          sync.Mutex
	e           Estado
	archivo     string
	clave       string
	porIP       map[string]int // "ip|día" → registros
	ahora       func() time.Time
	azar        func(n int) int        // entero uniforme en [0, n)
	pedirCodigo func() (string, error) // código 100 % de la API del sorteo
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

// Código legible para dictarlo por WhatsApp: sin 0/O ni 1/I. Solo se usa si
// hace falta un código local; el normal lo emite la API del sorteo.
func nuevoCodigo() string {
	const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	for i := range b {
		b[i] = letras[int(b[i])%len(letras)]
	}
	return "CCP-" + string(b)
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
// partículas («John Nuñez» → «J. N.», «Ana de la Cruz» → «A. C.»).
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

func (s *Servidor) quedan() int {
	q := s.e.Config.Vacantes - len(s.e.Ganadores)
	if q < 0 {
		return 0
	}
	return q
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

// Lo que ve cualquiera: contadores, vacantes y ganadores censurados. Nunca el
// nombre completo ni el código.
func (s *Servidor) publico() map[string]any {
	cfg := s.e.Config
	gs := make([]map[string]any, 0, len(s.e.Ganadores))
	for _, g := range s.e.Ganadores {
		juego := g.Juego
		if juego == "" {
			juego = "balon"
		}
		gs = append(gs, map[string]any{"nombre": censurar(g.Nombre), "fecha": g.Fecha, "tiro": g.Tiro, "juego": juego})
	}
	return map[string]any{
		"vacantes":          cfg.Vacantes,
		"quedan":            s.quedan(),
		"agotadas":          s.quedan() == 0,
		"tiros_totales":     s.e.TirosTotales,
		"goles":             s.e.Goles,
		"penales":           s.e.Penales,
		"atajadas":          s.e.AtajadasOK,
		"prob":              fmt.Sprintf("1 de %d", cfg.Prob),
		"prob_n":            cfg.Prob,
		"tiros_por_persona": cfg.Tiros,
		"ganadores":         gs,
		"regla":             regla,
		"matricula":         urlMatricula,
		"ahora":             s.ahora().UTC(),
	}
}

// Lo que ve la persona con su token.
func (s *Servidor) mio(i int) map[string]any {
	j := s.e.Jugadores[i]
	restan := s.e.Config.Tiros - j.Tiros
	if restan < 0 {
		restan = 0
	}
	out := map[string]any{
		"t": j.Token, "nombre": j.Nombre, "tiros": j.Tiros, "tiros_restantes": restan,
		"goles": j.Goles, "gane": j.Gano,
		"atajadas": j.Atajadas, "atajadas_restantes": max(0, s.e.Config.Tiros-j.Atajadas), "atajo": j.Atajo,
	}
	if g := s.ganadorDe(j.ID); g != nil {
		out["codigo"] = g.Codigo
		out["codigo_pendiente"] = g.Codigo == ""
		out["tiro"] = g.Tiro
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

// Pide un código de cortesía 100 % a la API del sorteo de Claude Code PRO.
func pedirCodigoClaude(url, clave string) func() (string, error) {
	return func() (string, error) {
		if url == "" || clave == "" {
			return "", fmt.Errorf("CLAUDE_ADMIN_URL o CLAUDE_ADMIN_CLAVE sin configurar")
		}
		req, err := http.NewRequest("POST", strings.TrimRight(url, "/")+"/api/admin/codigo", bytes.NewReader([]byte(`{"descuento":100}`)))
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

// Pide el código 100 % para un ganador recién anotado y lo agrega a la
// respuesta. Se llama fuera del candado: la API del sorteo puede tardar. Si
// falla, el cupo queda guardado con código pendiente y el admin lo completa.
func (s *Servidor) entregarCodigo(ganador *Ganador, out map[string]any) {
	codigo, err := s.pedirCodigo()
	if err != nil {
		log.Printf("código para %q (ganador %d): %v", ganador.Nombre, ganador.ID, err)
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
	if codigo != "" {
		out["matricula"] = urlMatricula + codigo
	}
}

func (s *Servidor) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	estaticos := http.FileServer(http.FS(web))
	pagina := func(nombre string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			b, err := fs.ReadFile(web, nombre)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(b)
		}
	}
	mux.HandleFunc("GET /{$}", pagina("index.html"))
	mux.HandleFunc("GET /flyer", pagina("flyer.html"))
	mux.HandleFunc("GET /yashin", pagina("yashin.html"))
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
		if s.e.Config.excluido(nombre) {
			fallo(w, 400, "Ya ganaste en Claude Code PRO: esta vez el balón es para otros. ¡Gracias por jugar!")
			return
		}
		for _, j := range s.e.Jugadores {
			if clave(j.Nombre) == clave(nombre) {
				fallo(w, 409, "Ese nombre ya pateó. Si eres tú, entra desde el mismo navegador con el que empezaste.")
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

	mux.HandleFunc("POST /api/patear", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
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
			fallo(w, 409, "Ya metiste gol: tu cupo está guardado.")
			return
		}
		if j.Tiros >= cfg.Tiros {
			s.mu.Unlock()
			fallo(w, 409, "Se acabaron tus tiros. Gracias por jugar.")
			return
		}
		j.Tiros++
		s.e.TirosTotales++
		tiro := j.Tiros
		gol := s.azar(cfg.Prob) == 0
		resultado := "gol"
		var ganador *Ganador
		if gol {
			s.e.Goles++
			j.Goles++
			if s.quedan() > 0 {
				j.Gano = true
				g := Ganador{ID: len(s.e.Ganadores) + 1, Jugador: j.ID, Nombre: j.Nombre, NombreCensurado: censurar(j.Nombre), Fecha: s.ahora().UTC(), Tiro: tiro}
				s.e.Ganadores = append(s.e.Ganadores, g)
				ganador = &g
			}
		} else {
			resultado = fallos[s.azar(len(fallos))]
		}
		restan := cfg.Tiros - j.Tiros
		out := map[string]any{"gol": gol, "tiro": tiro, "tiros_restantes": restan, "resultado": resultado, "quedan": s.quedan(), "agotadas": s.quedan() == 0}
		s.guardar()
		s.mu.Unlock()

		if ganador != nil {
			s.entregarCodigo(ganador, out)
		}
		responder(w, 200, out)
	})

	mux.HandleFunc("POST /api/atajar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
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
			fallo(w, 409, "Ya ganaste tu cupo: está guardado.")
			return
		}
		if j.Atajadas >= cfg.Tiros {
			s.mu.Unlock()
			fallo(w, 409, "Ya te patearon tus penales. Gracias por jugar.")
			return
		}
		j.Atajadas++
		s.e.Penales++
		penal := j.Atajadas
		atajo := s.azar(cfg.Prob) == 0
		resultado := "atajada"
		var ganador *Ganador
		if atajo {
			s.e.AtajadasOK++
			j.Atajo++
			if s.quedan() > 0 {
				j.Gano = true
				g := Ganador{ID: len(s.e.Ganadores) + 1, Jugador: j.ID, Nombre: j.Nombre, NombreCensurado: censurar(j.Nombre), Fecha: s.ahora().UTC(), Tiro: penal, Juego: "yashin"}
				s.e.Ganadores = append(s.e.Ganadores, g)
				ganador = &g
			}
		} else {
			resultado = golesRecibidos[s.azar(len(golesRecibidos))]
		}
		restan := cfg.Tiros - j.Atajadas
		out := map[string]any{"atajo": atajo, "penal": penal, "penales_restantes": restan, "resultado": resultado, "quedan": s.quedan(), "agotadas": s.quedan() == 0}
		s.guardar()
		s.mu.Unlock()

		if ganador != nil {
			s.entregarCodigo(ganador, out)
		}
		responder(w, 200, out)
	})

	admin := func(f func(w http.ResponseWriter, r *http.Request)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !s.esAdmin(r) {
				time.Sleep(400 * time.Millisecond)
				fallo(w, 401, "Clave incorrecta.")
				return
			}
			s.mu.Lock()
			defer s.mu.Unlock()
			f(w, r)
		}
	}
	estadoAdmin := func() map[string]any {
		return map[string]any{
			"config": s.e.Config, "quedan": s.quedan(), "tirosTotales": s.e.TirosTotales, "goles": s.e.Goles,
			"penales": s.e.Penales, "atajadas": s.e.AtajadasOK,
			"jugadores": s.e.Jugadores, "ganadores": s.e.Ganadores, "ahora": s.ahora().UTC(),
		}
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/config", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Prob      *int      `json:"prob"`
			Tiros     *int      `json:"tiros"`
			Vacantes  *int      `json:"vacantes"`
			Excluidos *[]string `json:"excluidos"`
		}
		if err := leerJSON(r, &in, 65536); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		c := s.e.Config
		if in.Prob != nil {
			c.Prob = *in.Prob
		}
		if in.Tiros != nil {
			c.Tiros = *in.Tiros
		}
		if in.Vacantes != nil {
			c.Vacantes = *in.Vacantes
		}
		if in.Excluidos != nil {
			c.Excluidos = c.Excluidos[:0:0]
			for _, ex := range *in.Excluidos {
				if ex = limpiarNombre(ex); ex != "" {
					c.Excluidos = append(c.Excluidos, ex)
				}
			}
		}
		if c.Prob < 1 || c.Prob > 1_000_000 || c.Tiros < 1 || c.Tiros > 100 || c.Vacantes < 0 || c.Vacantes > 1000 {
			fallo(w, 400, "prob entre 1 y 1 000 000; tiros entre 1 y 100; vacantes entre 0 y 1000.")
			return
		}
		s.e.Config = c
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Completa el código de un gol que quedó pendiente (o lo corrige).
	mux.HandleFunc("POST /api/admin/codigo", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID     int    `json:"id"`
			Codigo string `json:"codigo"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		codigo := strings.ToUpper(strings.TrimSpace(in.Codigo))
		if codigo == "" {
			codigo = nuevoCodigo()
		}
		for k := range s.e.Ganadores {
			if s.e.Ganadores[k].ID == in.ID {
				s.e.Ganadores[k].Codigo = codigo
				s.guardar()
				responder(w, 200, s.e.Ganadores[k])
				return
			}
		}
		fallo(w, 404, "No hay un ganador con ese id.")
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.e.Jugadores, s.e.Ganadores = nil, nil
		s.e.Siguiente, s.e.TirosTotales, s.e.Goles, s.e.Penales, s.e.AtajadasOK = 0, 0, 0, 0, 0
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

// Configuración con la que nace el estado. BALON_PROB, BALON_TIROS y
// BALON_VACANTES mandan la primera vez; después lo guardado (y lo que edite el
// admin) gana sobre el entorno.
func configInicial() Config {
	return Config{
		Prob: entero("BALON_PROB", 250), Tiros: entero("BALON_TIROS", 3), Vacantes: entero("BALON_VACANTES", 2),
		Excluidos: []string{
			"Jack Castillo", "Gian Grobert", "Gian Mamani", "Raul Gamboa", "Mario Ccallo", "Mario Callo",
			"Merlin Requejo", "David Requejo", "Jhon Perez Medrano", "Jhon Perez", "John Perez Medrano",
			"Paul Huaman", "Arnold Morales", "Carlos Saavedra",
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
	for _, j := range s.e.Jugadores {
		s.porIP[s.claveIP(j.IP, j.CreadoEn)]++
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18570"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("balón de oro en :%s (1 de %d, %d tiros, %d vacantes, %d jugadores, %d goles)",
		puerto, s.e.Config.Prob, s.e.Config.Tiros, s.e.Config.Vacantes, len(s.e.Jugadores), s.e.Goles)
	log.Fatal(srv.ListenAndServe())
}
