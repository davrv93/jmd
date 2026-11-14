// «Pogo IA» · juego de rebotar en pogo y pintar casillas, para abrir la clase
// del curso de Programación agéntica (Grupo 5). Diseño propio: cuatro robots
// con resorte en un tablero de 9 × 9 visto en perspectiva.
//
// Hermano de Témpano IA (mismo servidor): la persona escribe su nombre y
// apellido, recibe un token y juega partidas de 3 rondas contra 3 robots de
// la máquina. El tablero corre en el navegador, así que el puntaje lo informa
// el navegador; el servidor lo acota barato: emite el id de partida y anota su
// hora de inicio, valida él mismo las preguntas de los chips (el navegador
// nunca recibe la respuesta correcta antes de contestar), recorta valores
// imposibles (rondas 0–3 y cada una dura su reloj completo, casillas ≤ lo que
// dan los rebotes en el tiempo real), acepta un solo puntaje por partida y
// como mucho 5 partidas por token y día.
//
// Puntaje = rondas ganadas × 1000 + casillas de cada ronda (las cobradas con
// el chip más las que siguen pintadas al final; las pintadas con triple
// valen 3) × 10 + preguntas acertadas × 300. Los poderes del tablero
// (chip, cohete, turbo, triple, balde) traen pregunta en la mitad de los
// casos, como mucho 3 por ronda. Ranking público con el mejor puntaje de cada
// persona y solo iniciales. Hay soporte de premios como en Sopa (lista
// «premios», excluidos y cierre manual que pide códigos a la API del sorteo),
// pero nace sin premio.
package main

import (
	"bytes"
	"compress/gzip"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"math/big"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

var lima = time.FixedZone("Lima", -5*3600)

// Registros nuevos desde una misma conexión y día. Alto a propósito: en el
// aula muchos alumnos salen a internet por la misma IP.
const topeIPDia = 80

const urlMatricula = "https://jmd-learn.online/sorteo-claude/matricula?c="

// Reglas del juego.
const (
	rondasPorPartida   = 3
	segundosPorRonda   = 45
	casillasPorSegundo = 12 // turbo (un rebote cada 0,17 s), casillas triples (×3) y el balde que pinta la mesa
	chipsPorRonda      = 3
	segundosPregunta   = 8
	graciaPregunta     = 3 * time.Second  // red lenta
	minimoRondaGanada  = 40 * time.Second // la ronda dura su reloj entero (45 s)
	puntosRonda        = 1000
	puntosCasilla      = 10
	puntosAcierto      = 300
)

const topeRanking = 10
const topePantalla = 15

const avisoExcluido = "Ya ganaste en Claude Code PRO: puedes jugar y salir en el ranking, pero el premio es para otra persona"

// Pregunta entregada en una partida: el orden barajado de las opciones y
// cuál quedó como correcta. Nunca sale por la API antes de responder.
type Emitida struct {
	QID       int       `json:"qid"`
	Ronda     int       `json:"ronda"`
	Orden     [3]int    `json:"orden"`    // orden[k] = índice original de la opción k
	Correcta  int       `json:"correcta"` // índice barajado de la buena
	Emitida   time.Time `json:"emitida"`
	Elegida   int       `json:"elegida"` // -1 = sin responder / tiempo agotado
	Respuesta bool      `json:"respondida"`
	Acierto   bool      `json:"acierto"`
}

type Partida struct {
	ID        string    `json:"id"`
	Inicio    time.Time `json:"inicio"`
	Fin       time.Time `json:"fin,omitzero"`
	Estado    string    `json:"estado"` // jugando | terminada | vencida | abandonada
	Preguntas []Emitida `json:"preguntas"`
	Rondas    int       `json:"rondas"`
	Casillas  int       `json:"casillas"`
	Aciertos  int       `json:"aciertos"`
	Puntos    int       `json:"puntos"`
}

type Config struct {
	Cierre      string   `json:"cierre"`
	Premios     []int    `json:"premios"` // [] = sin premio
	PartidasDia int      `json:"partidas_dia"`
	VenceMin    int      `json:"vence_min"`
	Excluidos   []string `json:"excluidos"`
}

type Jugador struct {
	ID          int       `json:"id"`
	Nombre      string    `json:"nombre"`
	Token       string    `json:"token"`
	Cuenta      string    `json:"cuenta,omitempty"` // id de la cuenta del LMS cuando entra desde el modo LIVE
	IP          string    `json:"ip"`
	CreadoEn    time.Time `json:"creadoEn"`
	Partidas    []Partida `json:"partidas"`
	Mejor       int       `json:"mejor"` // mejor puntaje; 0 = aún sin partida terminada
	MejorRondas int       `json:"mejorRondas"`
	MejorEn     time.Time `json:"mejorEn,omitzero"`
	Jugo        bool      `json:"jugo"` // terminó al menos una partida
}

type Ganador struct {
	ID              int       `json:"id"`
	Puesto          int       `json:"puesto"`
	Jugador         int       `json:"jugador"`
	Nombre          string    `json:"nombre"`
	NombreCensurado string    `json:"nombreCensurado"`
	Descuento       int       `json:"descuento"`
	Puntos          int       `json:"puntos"`
	Codigo          string    `json:"codigo"`
	Fecha           time.Time `json:"fecha"`
}

type Estado struct {
	Config    Config    `json:"config"`
	Siguiente int       `json:"siguiente"`
	Jugadores []Jugador `json:"jugadores"`
	Ganadores []Ganador `json:"ganadores"`
	Cerrado   bool      `json:"cerrado"`
	CerradoEn time.Time `json:"cerradoEn,omitzero"`
	Partidas  int       `json:"partidas"` // partidas terminadas
}

type Servidor struct {
	mu          sync.Mutex
	e           Estado
	archivo     string
	clave       string
	porIP       map[string]int
	ahora       func() time.Time
	azar        func(n int) int
	pedirCodigo func(descuento int) (string, error)
	clase       bool // sala del modo LIVE (/clase/): estado aparte, sin premios ni tope práctico de partidas
	mesas       *mesas
	mesasUna    sync.Once
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

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

// ---------------------------------------------------------------------------
// Utilidades compartidas con Sopa y Árbitro.

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

// «Ines Jaimes» → «I. J.», «Ana de la Cruz» → «A. C.».
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

func dia(t time.Time) string { return t.In(lima).Format("2006-01-02") }

func (s *Servidor) claveIP(ip string, t time.Time) string { return ip + "|" + dia(t) }

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

func (c Config) horaCierre() time.Time {
	if c.Cierre == "" {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339, c.Cierre)
	if err != nil {
		return time.Time{}
	}
	return t
}

func (s *Servidor) terminado() bool {
	if s.e.Cerrado {
		return true
	}
	t := s.e.Config.horaCierre()
	return !t.IsZero() && !s.ahora().Before(t)
}

// ---------------------------------------------------------------------------
// Partidas.

// Marca como vencida la partida en curso si pasó el plazo.
func (s *Servidor) vencer(j *Jugador) {
	if n := len(j.Partidas); n > 0 {
		p := &j.Partidas[n-1]
		if p.Estado == "jugando" && s.ahora().Sub(p.Inicio) > time.Duration(s.e.Config.VenceMin)*time.Minute {
			p.Estado = "vencida"
		}
	}
}

func enCurso(j *Jugador) *Partida {
	if n := len(j.Partidas); n > 0 && j.Partidas[n-1].Estado == "jugando" {
		return &j.Partidas[n-1]
	}
	return nil
}

func partidaDe(j *Jugador, id string) *Partida {
	for k := range j.Partidas {
		if j.Partidas[k].ID == id {
			return &j.Partidas[k]
		}
	}
	return nil
}

// Partidas empezadas hoy (hora de Lima), cualquiera sea su estado.
func (s *Servidor) partidasHoy(j *Jugador) int {
	hoy, n := dia(s.ahora()), 0
	for _, p := range j.Partidas {
		if dia(p.Inicio) == hoy {
			n++
		}
	}
	return n
}

// Una pregunta pendiente (entregada y sin responder) que ya pasó su tiempo se
// cierra como fallada.
func (s *Servidor) caducarPregunta(p *Partida) {
	if n := len(p.Preguntas); n > 0 {
		q := &p.Preguntas[n-1]
		if !q.Respuesta && s.ahora().Sub(q.Emitida) > segundosPregunta*time.Second+graciaPregunta {
			q.Respuesta, q.Elegida, q.Acierto = true, -1, false
		}
	}
}

// Elige una pregunta que no haya salido en esta partida y baraja sus opciones.
func (s *Servidor) emitir(p *Partida, ronda int) Emitida {
	usadas := map[int]bool{}
	for _, q := range p.Preguntas {
		usadas[q.QID] = true
	}
	var libres []int
	for _, b := range banco {
		if !usadas[b.ID] {
			libres = append(libres, b.ID)
		}
	}
	id := libres[s.azar(len(libres))]
	orden := [3]int{0, 1, 2}
	for i := 2; i > 0; i-- { // Fisher–Yates
		k := s.azar(i + 1)
		orden[i], orden[k] = orden[k], orden[i]
	}
	correcta := 0
	for k, o := range orden {
		if o == 0 {
			correcta = k
		}
	}
	return Emitida{QID: id, Ronda: ronda, Orden: orden, Correcta: correcta, Emitida: s.ahora().UTC(), Elegida: -1}
}

// Lo que ve el navegador de una pregunta: texto y opciones barajadas. Sin la
// correcta.
func vistaPregunta(q Emitida, quedan int) map[string]any {
	b := preguntaPorID(q.QID)
	ops := make([]string, 3)
	for k, o := range q.Orden {
		ops[k] = b.Opciones[o]
	}
	return map[string]any{"qid": q.QID, "tema": b.Tema, "texto": b.Texto, "opciones": ops,
		"segundos": segundosPregunta, "ronda": q.Ronda, "chips_quedan": quedan}
}

func chipsEnRonda(p *Partida, ronda int) int {
	n := 0
	for _, q := range p.Preguntas {
		if q.Ronda == ronda {
			n++
		}
	}
	return n
}

// Puntaje con los valores ya acotados.
func puntaje(rondas, casillas, aciertos int) int {
	return rondas*puntosRonda + casillas*puntosCasilla + aciertos*puntosAcierto
}

// Recorta lo que informa el navegador a lo posible según el reloj del
// servidor: rondas entre 0 y 3 (y cada ronda ganada cuesta al menos
// minimoRondaGanada), casillas entre 0, lo que dan 3 rondas enteras y lo que
// da el tiempo real transcurrido a casillasPorSegundo (holgado: turbo, triple
// y balde suben mucho lo que se pinta en pocos segundos).
func acotar(rondas, casillas int, transcurrido time.Duration) (int, int) {
	rondas = min(max(rondas, 0), rondasPorPartida)
	if tope := int(transcurrido / minimoRondaGanada); rondas > tope {
		rondas = tope
	}
	casillas = min(max(casillas, 0), rondasPorPartida*segundosPorRonda*casillasPorSegundo, int(transcurrido/time.Second)*casillasPorSegundo)
	return rondas, casillas
}

// ---------------------------------------------------------------------------
// Ranking y vistas.

type fila struct {
	j       *Jugador
	excluir bool
}

func (s *Servidor) ranking() []fila {
	var fs []fila
	for i := range s.e.Jugadores {
		j := &s.e.Jugadores[i]
		if j.Jugo {
			fs = append(fs, fila{j, s.e.Config.excluido(j.Nombre)})
		}
	}
	sort.SliceStable(fs, func(a, b int) bool {
		if fs[a].j.Mejor != fs[b].j.Mejor {
			return fs[a].j.Mejor > fs[b].j.Mejor
		}
		return fs[a].j.MejorEn.Before(fs[b].j.MejorEn)
	})
	return fs
}

func (s *Servidor) puestoDe(id int) int {
	for k, f := range s.ranking() {
		if f.j.ID == id {
			return k + 1
		}
	}
	return 0
}

func (s *Servidor) filasPublicas(tope int) []map[string]any {
	out := make([]map[string]any, 0, tope)
	for k, f := range s.ranking() {
		if k >= tope {
			break
		}
		out = append(out, map[string]any{"puesto": k + 1, "nombre": censurar(f.j.Nombre), "puntos": f.j.Mejor,
			"rondas": f.j.MejorRondas, "fuera": f.excluir && len(s.e.Config.Premios) > 0})
	}
	return out
}

// Partidas en juego ahora (empezadas hace menos de 6 minutos).
func (s *Servidor) jugandoAhora() int {
	n := 0
	for i := range s.e.Jugadores {
		if p := enCurso(&s.e.Jugadores[i]); p != nil && s.ahora().Sub(p.Inicio) < 6*time.Minute {
			n++
		}
	}
	return n
}

func (s *Servidor) jugaron() int {
	n := 0
	for _, j := range s.e.Jugadores {
		if j.Jugo {
			n++
		}
	}
	return n
}

// Lo que ve cualquiera: nunca nombres completos ni códigos.
func (s *Servidor) publico(tope int) map[string]any {
	cfg := s.e.Config
	gs := make([]map[string]any, 0, len(s.e.Ganadores))
	for _, g := range s.e.Ganadores {
		gs = append(gs, map[string]any{"puesto": g.Puesto, "nombre": censurar(g.Nombre), "descuento": g.Descuento, "puntos": g.Puntos})
	}
	return map[string]any{
		"clase": s.clase, "cierre": cfg.Cierre, "cerrado": s.terminado(), "premios": cfg.Premios, "partidas_dia": cfg.PartidasDia,
		"jugaron": s.jugaron(), "inscritos": len(s.e.Jugadores), "partidas": s.e.Partidas, "jugando": s.jugandoAhora(),
		"en_ranking": len(s.ranking()), "ranking": s.filasPublicas(tope), "ganadores": gs,
		"reglas": map[string]int{"rondas": rondasPorPartida, "segundos_ronda": segundosPorRonda, "chips_ronda": chipsPorRonda,
			"segundos_pregunta": segundosPregunta, "puntos_ronda": puntosRonda, "puntos_casilla": puntosCasilla, "puntos_acierto": puntosAcierto},
		"ahora": s.ahora().UTC(),
	}
}

func (s *Servidor) mio(i int) map[string]any {
	j := &s.e.Jugadores[i]
	s.vencer(j)
	hoy := s.partidasHoy(j)
	out := map[string]any{
		"t": j.Token, "nombre": j.Nombre, "mejor": j.Mejor, "mejor_rondas": j.MejorRondas, "puesto": s.puestoDe(j.ID),
		"partidas_hoy": hoy, "partidas_quedan": max(0, s.e.Config.PartidasDia-hoy), "cerrado": s.terminado(),
		"excluido": s.e.Config.excluido(j.Nombre) && len(s.e.Config.Premios) > 0,
	}
	if out["excluido"].(bool) {
		out["aviso"] = avisoExcluido
	}
	if g := s.ganadorDe(j.ID); g != nil {
		out["gane"] = true
		out["codigo"] = g.Codigo
		out["codigo_pendiente"] = g.Codigo == ""
		out["descuento"] = g.Descuento
		if g.Codigo != "" {
			out["matricula"] = urlMatricula + g.Codigo
		}
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

// Código de descuento de la API del sorteo de Claude Code PRO.
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

// Cierra el concurso y, si hay premios configurados, elige ganadores y pide
// sus códigos fuera del candado. Con premios = [] solo cierra.
func (s *Servidor) cerrar() {
	s.mu.Lock()
	if s.e.Cerrado {
		s.mu.Unlock()
		return
	}
	s.e.Cerrado = true
	s.e.CerradoEn = s.ahora().UTC()
	var nuevos []Ganador
	puesto := 0
	for _, f := range s.ranking() {
		if puesto >= len(s.e.Config.Premios) {
			break
		}
		if f.excluir {
			continue
		}
		g := Ganador{ID: len(s.e.Ganadores) + 1, Puesto: puesto + 1, Jugador: f.j.ID, Nombre: f.j.Nombre,
			NombreCensurado: censurar(f.j.Nombre), Descuento: s.e.Config.Premios[puesto], Puntos: f.j.Mejor, Fecha: s.ahora().UTC()}
		s.e.Ganadores = append(s.e.Ganadores, g)
		nuevos = append(nuevos, g)
		puesto++
	}
	s.guardar()
	s.mu.Unlock()
	log.Printf("concurso cerrado: %d ganador(es)", len(nuevos))
	for _, g := range nuevos {
		codigo, err := s.pedirCodigo(g.Descuento)
		if err != nil {
			log.Printf("código %d %% para el ganador %d: %v", g.Descuento, g.ID, err)
			continue
		}
		s.mu.Lock()
		for k := range s.e.Ganadores {
			if s.e.Ganadores[k].ID == g.ID {
				s.e.Ganadores[k].Codigo = codigo
			}
		}
		s.guardar()
		s.mu.Unlock()
	}
}

func (s *Servidor) vigilarCierre(cada time.Duration) {
	for range time.Tick(cada) {
		s.mu.Lock()
		vence := !s.e.Cerrado && s.terminado()
		s.mu.Unlock()
		if vence {
			s.cerrar()
		}
	}
}

// ---------------------------------------------------------------------------
// Rutas.

// Archivos de /static/ leídos y comprimidos con gzip una sola vez al arrancar. three.module.min.js pasa de
// 687 KB a ~170 KB, y con ETag cada recarga de los 15 alumnos es un 304 sin cuerpo. (http.FileServer sobre
// embed no manda Last-Modified, así que el navegador lo bajaba entero cada vez.)
func estaticosComprimidos(web fs.FS) http.Handler {
	type archivo struct {
		crudo, gz  []byte
		tipo, etag string
	}
	cache := map[string]archivo{}
	_ = fs.WalkDir(web, "static", func(ruta string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		b, err := fs.ReadFile(web, ruta)
		if err != nil {
			return err
		}
		var buf bytes.Buffer
		zw, _ := gzip.NewWriterLevel(&buf, gzip.BestCompression)
		_, _ = zw.Write(b)
		_ = zw.Close()
		suma := sha256.Sum256(b)
		cache["/"+ruta] = archivo{crudo: b, gz: buf.Bytes(), tipo: mime.TypeByExtension(path.Ext(ruta)), etag: `"` + hex.EncodeToString(suma[:8]) + `"`}
		return nil
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a, ok := cache[r.URL.Path]
		if !ok {
			http.NotFound(w, r)
			return
		}
		h := w.Header()
		h.Set("Cache-Control", "public, max-age=60")
		h.Set("ETag", a.etag)
		h.Set("Vary", "Accept-Encoding")
		if r.Header.Get("If-None-Match") == a.etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		h.Set("Content-Type", a.tipo)
		cuerpo := a.crudo
		if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			h.Set("Content-Encoding", "gzip")
			cuerpo = a.gz
		}
		h.Set("Content-Length", strconv.Itoa(len(cuerpo)))
		_, _ = w.Write(cuerpo)
	})
}

func (s *Servidor) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	estaticos := estaticosComprimidos(web)
	pagina := func(archivo string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			b, err := fs.ReadFile(web, archivo)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(b)
		}
	}
	s.rutasMesa(mux)
	mux.HandleFunc("GET /{$}", pagina("index.html"))
	mux.HandleFunc("GET /ranking", pagina("ranking.html"))
	mux.Handle("GET /static/", estaticos)

	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		tope := topeRanking
		if r.URL.Query().Get("pantalla") != "" {
			tope = topePantalla
		}
		responder(w, 200, s.publico(tope))
	})

	conToken := func(w http.ResponseWriter, token string) (*Jugador, int) {
		i := s.jugador(token)
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return nil, -1
		}
		j := &s.e.Jugadores[i]
		s.vencer(j)
		return j, i
	}

	mux.HandleFunc("GET /api/yo", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		if _, i := conToken(w, r.URL.Query().Get("t")); i >= 0 {
			responder(w, 200, s.mio(i))
		}
	})

	mux.HandleFunc("POST /api/inscribir", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre string `json:"nombre"`
			Token  string `json:"t"`
			Cuenta string `json:"cuenta"` // id de la cuenta del LMS (modo LIVE); sin premios, basta para reconocerla
		}
		if err := leerJSON(r, &in, 4096); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		cuenta := strings.TrimSpace(in.Cuenta)
		if len(cuenta) > 64 {
			cuenta = ""
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if i := s.jugador(in.Token); i >= 0 {
			responder(w, 200, s.mio(i))
			return
		}
		// Desde el LIVE la misma cuenta vuelve a su jugador aunque cambie de navegador o equipo.
		if cuenta != "" {
			for i, j := range s.e.Jugadores {
				if j.Cuenta == cuenta {
					responder(w, 200, s.mio(i))
					return
				}
			}
		}
		nombre := limpiarNombre(in.Nombre)
		if s.clase && cuenta != "" {
			// En clase el nombre viene del LMS: se limpia en vez de rechazarlo.
			nombre = nombreClase(in.Nombre, cuenta)
		} else if !nombreOK(nombre) {
			fallo(w, 400, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres).")
			return
		}
		for _, j := range s.e.Jugadores {
			// Dos cuentas distintas del LMS pueden llamarse igual; el ranking sale en iniciales.
			if cuenta == "" && clave(j.Nombre) == clave(nombre) {
				fallo(w, 409, "Ese nombre ya está jugando. Si eres tú, entra desde el mismo navegador con el que empezaste.")
				return
			}
		}
		ip := ipDe(r)
		k := s.claveIP(ip, s.ahora())
		if !s.clase && s.porIP[k] >= topeIPDia {
			fallo(w, 429, "Demasiados registros desde esta conexión por hoy.")
			return
		}
		s.porIP[k]++
		s.e.Siguiente++
		s.e.Jugadores = append(s.e.Jugadores, Jugador{ID: s.e.Siguiente, Nombre: nombre, Token: nuevoToken(), Cuenta: cuenta, IP: ip, CreadoEn: s.ahora().UTC()})
		s.guardar()
		responder(w, 200, s.mio(len(s.e.Jugadores)-1))
	})

	// Empieza una partida. Si había una en curso, queda abandonada (cuenta
	// para el tope del día).
	mux.HandleFunc("POST /api/partida", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		j, _ := conToken(w, in.Token)
		if j == nil {
			return
		}
		if s.terminado() {
			fallo(w, 409, "El juego ya cerró. ¡Gracias por jugar!")
			return
		}
		if s.partidasHoy(j) >= s.e.Config.PartidasDia {
			fallo(w, 429, fmt.Sprintf("Ya jugaste tus %d partidas de hoy. Vuelve mañana.", s.e.Config.PartidasDia))
			return
		}
		if p := enCurso(j); p != nil {
			p.Estado, p.Fin = "abandonada", s.ahora().UTC()
		}
		p := Partida{ID: nuevoToken()[:16], Inicio: s.ahora().UTC(), Estado: "jugando", Preguntas: []Emitida{}}
		j.Partidas = append(j.Partidas, p)
		s.guardar()
		responder(w, 200, map[string]any{"partida": p.ID, "rondas": rondasPorPartida, "segundos_ronda": segundosPorRonda,
			"chips_ronda": chipsPorRonda, "partidas_quedan": max(0, s.e.Config.PartidasDia-s.partidasHoy(j))})
	})

	// Pregunta del chip: el robot de la persona saltó sobre un chip IA.
	mux.HandleFunc("POST /api/pregunta", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token   string `json:"t"`
			Partida string `json:"partida"`
			Ronda   int    `json:"ronda"`
		}
		if err := leerJSON(r, &in, 1024); err != nil || in.Ronda < 1 || in.Ronda > rondasPorPartida {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		j, _ := conToken(w, in.Token)
		if j == nil {
			return
		}
		p := enCurso(j)
		if p == nil || p.ID != in.Partida {
			fallo(w, 409, "Esta partida ya no está en juego.")
			return
		}
		// Si quedó una pendiente sin responder, cuenta como fallada.
		if n := len(p.Preguntas); n > 0 && !p.Preguntas[n-1].Respuesta {
			q := &p.Preguntas[n-1]
			q.Respuesta, q.Elegida, q.Acierto = true, -1, false
		}
		usados := chipsEnRonda(p, in.Ronda)
		if usados >= chipsPorRonda {
			fallo(w, 409, "Ya usaste tus chips de esta ronda.")
			return
		}
		if len(p.Preguntas) >= len(banco) {
			fallo(w, 409, "No quedan preguntas.")
			return
		}
		q := s.emitir(p, in.Ronda)
		p.Preguntas = append(p.Preguntas, q)
		s.guardar()
		responder(w, 200, vistaPregunta(q, chipsPorRonda-usados-1))
	})

	// Respuesta a la pregunta del chip. opcion = -1 si se acabó el tiempo.
	mux.HandleFunc("POST /api/responder", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token   string `json:"t"`
			Partida string `json:"partida"`
			QID     int    `json:"qid"`
			Opcion  int    `json:"opcion"`
		}
		if err := leerJSON(r, &in, 1024); err != nil || in.Opcion < -1 || in.Opcion > 2 {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		j, _ := conToken(w, in.Token)
		if j == nil {
			return
		}
		p := enCurso(j)
		if p == nil || p.ID != in.Partida || len(p.Preguntas) == 0 {
			fallo(w, 409, "Esta partida ya no está en juego.")
			return
		}
		q := &p.Preguntas[len(p.Preguntas)-1]
		if q.QID != in.QID || q.Respuesta {
			fallo(w, 409, "Esa pregunta ya se respondió.")
			return
		}
		tarde := s.ahora().Sub(q.Emitida) > segundosPregunta*time.Second+graciaPregunta
		q.Respuesta, q.Elegida = true, in.Opcion
		q.Acierto = !tarde && in.Opcion == q.Correcta
		if q.Acierto {
			p.Aciertos++
		}
		s.guardar()
		b := preguntaPorID(q.QID)
		responder(w, 200, map[string]any{"correcta": q.Acierto, "tarde": tarde, "respuesta": q.Correcta,
			"texto_respuesta": b.Opciones[0], "explicacion": b.Explicacion, "aciertos": p.Aciertos})
	})

	// Fin de la partida: el navegador informa rondas ganadas y casillas pintadas;
	// el servidor los acota y suma los aciertos que él mismo validó.
	mux.HandleFunc("POST /api/terminar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token    string `json:"t"`
			Partida  string `json:"partida"`
			Rondas   int    `json:"rondas"`
			Casillas int    `json:"casillas"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		j, i := conToken(w, in.Token)
		if j == nil {
			return
		}
		p := partidaDe(j, in.Partida)
		if p == nil {
			fallo(w, 404, "No existe esa partida.")
			return
		}
		if p.Estado != "jugando" {
			msg := "Esta partida ya tiene su puntaje."
			if p.Estado == "vencida" {
				msg = fmt.Sprintf("Esta partida venció (más de %d minutos).", s.e.Config.VenceMin)
			} else if p.Estado == "abandonada" {
				msg = "Empezaste otra partida: esta ya no cuenta."
			}
			fallo(w, 409, msg)
			return
		}
		s.caducarPregunta(p)
		p.Fin = s.ahora().UTC()
		p.Rondas, p.Casillas = acotar(in.Rondas, in.Casillas, p.Fin.Sub(p.Inicio))
		p.Puntos = puntaje(p.Rondas, p.Casillas, p.Aciertos)
		p.Estado = "terminada"
		s.e.Partidas++
		record := !j.Jugo || p.Puntos > j.Mejor
		if record {
			j.Mejor, j.MejorRondas, j.MejorEn = p.Puntos, p.Rondas, p.Fin
		}
		j.Jugo = true
		s.guardar()
		out := s.mio(i)
		out["partida"] = map[string]any{"rondas": p.Rondas, "casillas": p.Casillas, "aciertos": p.Aciertos, "puntos": p.Puntos,
			"preguntas": len(p.Preguntas)}
		out["record"] = record
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
		jug := make([]map[string]any, 0, len(s.e.Jugadores))
		for _, j := range s.e.Jugadores {
			ps := make([]map[string]any, 0, len(j.Partidas))
			for _, p := range j.Partidas {
				ps = append(ps, map[string]any{"id": p.ID, "estado": p.Estado, "inicio": p.Inicio, "rondas": p.Rondas,
					"casillas": p.Casillas, "aciertos": p.Aciertos, "preguntas": len(p.Preguntas), "puntos": p.Puntos})
			}
			jug = append(jug, map[string]any{"id": j.ID, "nombre": j.Nombre, "ip": j.IP, "creadoEn": j.CreadoEn, "mejor": j.Mejor,
				"excluido": s.e.Config.excluido(j.Nombre), "partidas": ps})
		}
		return map[string]any{"config": s.e.Config, "cerrado": s.terminado(), "cerradoEn": s.e.CerradoEn, "partidas": s.e.Partidas,
			"jugadores": jug, "ganadores": s.e.Ganadores, "ahora": s.ahora().UTC()}
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/config", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Cierre      *string   `json:"cierre"`
			Premios     *[]int    `json:"premios"`
			PartidasDia *int      `json:"partidas_dia"`
			VenceMin    *int      `json:"vence_min"`
			Excluidos   *[]string `json:"excluidos"`
		}
		if err := leerJSON(r, &in, 65536); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		c := s.e.Config
		if in.Cierre != nil {
			c.Cierre = strings.TrimSpace(*in.Cierre)
		}
		if in.Premios != nil {
			c.Premios = append([]int{}, *in.Premios...)
		}
		if in.PartidasDia != nil {
			c.PartidasDia = *in.PartidasDia
		}
		if in.VenceMin != nil {
			c.VenceMin = *in.VenceMin
		}
		if in.Excluidos != nil {
			c.Excluidos = c.Excluidos[:0:0]
			for _, ex := range *in.Excluidos {
				if ex = limpiarNombre(ex); ex != "" {
					c.Excluidos = append(c.Excluidos, ex)
				}
			}
		}
		if c.Cierre != "" {
			if _, err := time.Parse(time.RFC3339, c.Cierre); err != nil {
				fallo(w, 400, "cierre debe ser RFC3339 (p. ej. 2026-10-28T21:30:00-05:00) o vacío.")
				return
			}
		}
		premiosOK := len(c.Premios) <= 20
		for _, d := range c.Premios {
			premiosOK = premiosOK && d >= 1 && d <= 100
		}
		if !premiosOK || c.PartidasDia < 1 || c.PartidasDia > 50 || c.VenceMin < 5 || c.VenceMin > 120 {
			fallo(w, 400, "premios: de 0 a 20, cada uno entre 1 y 100 %; partidas_dia entre 1 y 50; vence_min entre 5 y 120.")
			return
		}
		s.e.Config = c
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/cerrar", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			noAutorizado(w)
			return
		}
		s.cerrar()
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, estadoAdmin())
	})
	// Vuelve a abrir el juego (no borra nada ni toca ganadores).
	mux.HandleFunc("POST /api/admin/abrir", admin(func(w http.ResponseWriter, r *http.Request) {
		s.e.Cerrado, s.e.CerradoEn = false, time.Time{}
		s.e.Config.Cierre = ""
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
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
		s.e.Siguiente, s.e.Partidas = 0, 0
		s.e.Cerrado, s.e.CerradoEn = false, time.Time{}
		s.porIP = map[string]int{}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	return mux
}

// Nace sin premio: premios = []. Para activar uno, POST /api/admin/config
// con {"premios":[100]} y luego POST /api/admin/cerrar.
// Sala de clase (modo LIVE del LMS): estado aparte del juego público, sin premios ni sorteo y con 99
// partidas por día, para que jugar en clase no gaste los intentos ni toque el ranking ni los premios públicos.
func configClase() Config {
	return Config{Cierre: "", Premios: []int{}, PartidasDia: 99, VenceMin: 15, Excluidos: []string{}}
}

var noNombre = regexp.MustCompile(`[^\p{L}\p{M}0-9 .'\-]+`)

// nombreClase deja el nombre que manda el LMS en algo que el ranking pueda mostrar: sin símbolos, hasta 40
// letras y, si no queda nada, «Alumno» con el final de la cuenta.
func nombreClase(n, cuenta string) string {
	n = limpiarNombre(noNombre.ReplaceAllString(n, " "))
	if r := []rune(n); len(r) > 40 {
		n = strings.TrimSpace(string(r[:40]))
	}
	if utf8.RuneCountInString(n) < 2 {
		c := []rune(cuenta)
		n = "Alumno " + string(c[max(0, len(c)-4):])
	}
	return n
}

// rutasConClase monta la sala pública en / y la de clase en /clase/: mismo juego, estados separados.
func rutasConClase(pub, cla *Servidor) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/clase/", http.StripPrefix("/clase", cla.rutas()))
	mux.Handle("GET /clase", http.RedirectHandler("clase/", http.StatusMovedPermanently))
	mux.Handle("/", pub.rutas())
	return mux
}

func configInicial() Config {
	return Config{Cierre: "", Premios: []int{}, PartidasDia: 5, VenceMin: 15, Excluidos: []string{}}
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
	nuevo := func(archivo string, clase bool, inicial Config) *Servidor {
		s := &Servidor{
			archivo: filepath.Join(datos, archivo), clave: clave, clase: clase, porIP: map[string]int{}, ahora: time.Now, azar: azar,
			pedirCodigo: pedirCodigoClaude(os.Getenv("CLAUDE_ADMIN_URL"), os.Getenv("CLAUDE_ADMIN_CLAVE")),
		}
		if b, err := os.ReadFile(s.archivo); err == nil {
			if err := json.Unmarshal(b, &s.e); err != nil {
				log.Fatalf("%s: %v", archivo, err)
			}
		} else {
			s.e = Estado{Config: inicial}
			s.guardar()
		}
		for _, j := range s.e.Jugadores {
			s.porIP[s.claveIP(j.IP, j.CreadoEn)]++
		}
		go s.vigilarCierre(20 * time.Second)
		return s
	}
	s := nuevo("estado.json", false, configInicial())
	cla := nuevo("estado-clase.json", true, configClase())
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18610"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: rutasConClase(s, cla), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("pogo IA en :%s (%d preguntas, %d partidas/día, premios %v, %d jugadores; sala de clase en /clase/ con %d)",
		puerto, len(banco), s.e.Config.PartidasDia, s.e.Config.Premios, len(s.e.Jugadores), len(cla.e.Jugadores))
	log.Fatal(srv.ListenAndServe())
}
