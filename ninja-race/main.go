// «Ninja Race · carrera cómic por el 100 % de Claude Code PRO».
//
// Sorteo en forma de carrera: UNA persona corre contra DOS cpu. Cada corredor
// tiene 3 vidas: cada golpe consume una y frena, pero nadie se elimina por un
// choque. El marcador crece mientras dure sin caerse (10 puntos por segundo
// vivo y 5 por obstáculo esquivado), así que cuanto más resista, más suma.
//
// Al terminar la carrera gana el 100 % de Claude Code PRO quien saque el MEJOR
// PUNTAJE de los tres corredores, siempre que quede cupo y no haya ganado
// antes en el sorteo de Claude Code PRO. Todos los demás (y los que ya ganaron
// antes, que reciben el descuento pero para OTRO curso) se llevan un
// descuento aleatorio entre 40 % y 70 % del mismo curso.
//
// Los códigos los emite la API del sorteo de Claude Code PRO
// (POST /api/admin/codigo {"descuento": N}); el QR abre wa.me con el mensaje
// del cupón ya escrito. El servidor manda: él mide el tiempo de la carrera,
// limita los obstáculos posibles y reparte los cupos.
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
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/skip2/go-qrcode"
)

//go:embed web
var webFS embed.FS

var lima = time.FixedZone("Lima", -5*3600)

// Registros nuevos permitidos desde una misma conexión en un mismo día (Lima).
const topeIPDia = 12

// Dónde se usa el código ganado (la matrícula del sorteo de Claude Code PRO).
const urlMatricula = "https://jmd-learn.online/sorteo-claude/matricula?c="

// Aviso para quien ya ganó en Claude Code PRO: juega igual, pero su descuento
// es para otro curso.
const avisoExcluido = "Ya ganaste en Claude Code PRO: corres igual, pero tu premio es del otro curso"

// Quien está en la lista de bloqueados (ganó en una carrera anterior) ya no se inscribe ni corre.
const avisoBloqueado = "Ya ganaste en una carrera anterior: esta vez le toca a los demás. ¡Gracias por jugar!"

type Config struct {
	Titulo    string `json:"titulo"`
	Curso     string `json:"curso"`      // curso del premio principal
	CursoOtro string `json:"curso_otro"` // curso del descuento de los excluidos
	WhatsApp  string `json:"whatsapp"`   // destino del QR, sin +
	Cupos100  int    `json:"cupos_100"`  // códigos 100 % disponibles
	DescMin   int    `json:"desc_min"`   // descuento mínimo del resto (40)
	DescMax   int    `json:"desc_max"`   // descuento máximo del resto (70)
	MinMs     int    `json:"min_ms"`     // duración mínima para tener premio
	MaxMs     int    `json:"max_ms"`     // tope duro de la carrera
	// El sorteo cierra SOLO a medianoche (o cuando el instructor lo cierra a
	// mano). Mientras está abierto nadie ve su premio: solo su posición.
	Cierre  time.Time `json:"cierre"`  // cierre automático (medianoche Lima)
	Cerrado bool      `json:"cerrado"` // cierre manual desde /admin
	// SoloManual: no hay cierre automático; cierra el botón del panel.
	SoloManual bool `json:"solo_manual"`
	// AlCierre: los premios se calculan al cerrar, por el mejor puntaje válido
	// de cada corredor (no carrera por carrera).
	AlCierre bool `json:"al_cierre"`
	// Ganadores de sorteos anteriores: juegan, pero nunca el 100 %. Se
	// comparan por nombre (sin tildes, palabra por palabra) y por celular.
	Excluidos    []string `json:"excluidos"`
	ExcluidosTel []string `json:"excluidosTel"`
	// Bloqueados: ganadores de una carrera anterior que esta vez no pueden jugar.
	Bloqueados    []string `json:"bloqueados"`
	BloqueadosTel []string `json:"bloqueadosTel"`
}

// Aviso que ve el participante mientras el sorteo sigue abierto.
const mensajeCierreManual = "El sorteo cierra cuando el instructor dé la señal 🏁: ahí se calculan los puntajes y se anuncian los ganadores."

func (c Config) anuncio() string {
	if c.SoloManual {
		return mensajeCierreManual
	}
	if c.Cierre.IsZero() {
		return mensajeCierreManual
	}
	return "El concurso cierra a las " + horaLima(c.Cierre) + " (hora de Lima) 🏁: ahí se calculan los puntajes y se anuncian los ganadores."
}

// horaLima: «9:30 p. m.», como se dice en Lima.
func horaLima(t time.Time) string {
	l := t.In(lima)
	h, sufijo := l.Hour(), "a. m."
	if h >= 12 {
		sufijo = "p. m."
	}
	if h = h % 12; h == 0 {
		h = 12
	}
	return fmt.Sprintf("%d:%02d %s", h, l.Minute(), sufijo)
}

// ¿El sorteo ya cerró? Por cierre manual o porque pasó la medianoche (si no es
// solo manual).
func (c Config) cerrada(ahora time.Time) bool {
	return c.Cerrado || (!c.SoloManual && !c.Cierre.IsZero() && !ahora.Before(c.Cierre))
}

// Próxima medianoche en Lima (el sorteo vive en hora de Lima, sin horario de
// verano).
func medianocheLima(t time.Time) time.Time {
	l := t.In(lima)
	return time.Date(l.Year(), l.Month(), l.Day()+1, 0, 0, 0, 0, lima)
}

type Jugador struct {
	ID           int       `json:"id"`
	Nombre       string    `json:"nombre"`
	Telefono     string    `json:"telefono"`
	Token        string    `json:"token"`
	IP           string    `json:"ip"`
	CreadoEn     time.Time `json:"creadoEn"`
	Carreras     int       `json:"carreras"` // carreras terminadas
	MejorPuntaje int       `json:"mejorPuntaje"`
	MejorValido  int       `json:"mejorValido"`  // mejor puntaje de una carrera válida (≥ min_ms)
	PuestoValido int       `json:"puestoValido"` // su puesto contra los cpu en esa carrera
	Gano         bool      `json:"gano"`         // ya tiene su premio
}

type Ganador struct {
	ID              int       `json:"id"`
	Jugador         int       `json:"jugador"`
	Nombre          string    `json:"nombre"`
	NombreCensurado string    `json:"nombreCensurado"`
	Descuento       int       `json:"descuento"` // 100 = gratis
	Codigo          string    `json:"codigo"`    // vacío = pendiente (la API falló)
	Curso           string    `json:"curso"`
	Puntaje         int       `json:"puntaje"`
	Puesto          int       `json:"puesto"`
	Excluido        bool      `json:"excluido"`
	Fecha           time.Time `json:"fecha"`
}

type Estado struct {
	Config        Config    `json:"config"`
	Siguiente     int       `json:"siguiente"`
	Jugadores     []Jugador `json:"jugadores"`
	Ganadores     []Ganador `json:"ganadores"`
	CarrerasTotal int       `json:"carrerasTotal"`
	Record        int       `json:"record"`
	RecordNombre  string    `json:"recordNombre"`
}

type Servidor struct {
	mu          sync.Mutex
	e           Estado
	archivo     string
	clave       string
	porIP       map[string]int  // "ip|día" → registros
	activas     map[int]corrida // id del jugador → su salida
	ahora       func() time.Time
	azar        func(n int) int                     // entero uniforme en [0, n)
	pedirCodigo func(descuento int) (string, error) // código de la API del sorteo
	vivo        *vivo                               // panel del instructor por WebSocket
	clase       *clase                              // modo clase: rondas de mesa sin premios (clase.go)
}

type corrida struct {
	Carrera  int       // número de carrera de esa persona
	Inicio   time.Time // cuando el servidor vio la salida
	Puntaje  int       // último puntaje que reportó el latido (para el panel en vivo)
	TiempoMs int
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

var espacios = regexp.MustCompile(`\s+`)
var nombreValido = regexp.MustCompile(`^[\p{L}\p{M}0-9 .'\-]+$`)

func limpiarNombre(n string) string {
	return strings.TrimSpace(espacios.ReplaceAllString(n, " "))
}

func clave(n string) string { return strings.ToLower(limpiarNombre(n)) }

var tildes = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n")

func digitos(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// ¿Ganó ya en el sorteo de Claude? (corre, pero su premio es del otro curso)
func (c Config) excluido(nombre, tel string) bool {
	return coincide(c.Excluidos, c.ExcluidosTel, nombre, tel)
}

// ¿Ganó en una carrera anterior? (no se inscribe ni corre)
func (c Config) bloqueado(nombre, tel string) bool {
	return coincide(c.Bloqueados, c.BloqueadosTel, nombre, tel)
}

// Los nombres se comparan palabra por palabra (cada palabra de la lista debe
// aparecer en el nombre) y los celulares por sus dígitos.
func coincide(nombres, tels []string, nombre, tel string) bool {
	n := " " + tildes.Replace(clave(nombre)) + " "
	for _, ex := range nombres {
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
	t := digitos(tel)
	if len(t) < 9 {
		return false
	}
	for _, ex := range tels {
		if e := digitos(ex); len(e) >= 9 && (t == e || strings.Contains(t, e)) {
			return true
		}
	}
	return false
}

func nombreOK(n string) bool {
	c := utf8.RuneCountInString(n)
	return c >= 3 && c <= 40 && nombreValido.MatchString(n) && strings.Contains(n, " ")
}

func telefonoOK(t string) bool {
	d := digitos(t)
	return len(d) >= 9 && len(d) <= 15
}

var particulas = map[string]bool{"de": true, "del": true, "la": true, "las": true, "los": true, "y": true}

// Nombre para publicar: solo la inicial de cada nombre y apellido, sin
// partículas («Ana de la Cruz» → «A. C.»).
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

func leerJSON(r *http.Request, v any, max int64) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, max)).Decode(v)
}

func (s *Servidor) jugador(token string) int {
	if token == "" {
		return -1
	}
	for i, j := range s.e.Jugadores {
		if subtle.ConstantTimeCompare([]byte(j.Token), []byte(token)) == 1 {
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

// Códigos 100 % que ya se entregaron y cupos que quedan.
// Cupos del 100 % por curso: el del otro curso (para quien ya ganó Claude) no
// le quita el de Claude Code PRO a nadie.
func (s *Servidor) dados100(curso string) int {
	n := 0
	for _, g := range s.e.Ganadores {
		if g.Descuento == 100 && g.Curso == curso {
			n++
		}
	}
	return n
}

func (s *Servidor) quedan100De(curso string) int {
	return max(0, s.e.Config.Cupos100-s.dados100(curso))
}
func (s *Servidor) quedan100() int { return s.quedan100De(s.e.Config.Curso) }

// El mensaje que lleva el QR a WhatsApp, con el cupón ya escrito.
func mensajePremio(descuento int, curso, codigo string) string {
	return fmt.Sprintf("He ganado %d %% de descuento en el curso %s y mi código de cupón es %s",
		descuento, curso, codigo)
}

func waURL(numero, texto string) string {
	// %20 en vez de +: wa.me escribe el mensaje tal cual en el chat.
	pegado := strings.ReplaceAll(url.QueryEscape(texto), "+", "%20")
	return "https://wa.me/" + numero + "?text=" + pegado
}

// Lo que ve cualquiera: récord, contador de carreras y, solo DESPUÉS del
// cierre, el acta con los premios. Mientras el sorteo está abierto no se
// publica nada de premios: nadie debe saber quién gana (ni el que va primero).
// Nunca el nombre completo ni el código.
func (s *Servidor) publico() map[string]any {
	cfg := s.e.Config
	cerrado := cfg.cerrada(s.ahora())
	out := map[string]any{
		"titulo":       cfg.Titulo,
		"curso":        cfg.Curso,
		"curso_otro":   cfg.CursoOtro,
		"whatsapp":     cfg.WhatsApp,
		"cupos_100":    cfg.Cupos100,
		"desc_min":     cfg.DescMin,
		"desc_max":     cfg.DescMax,
		"min_ms":       cfg.MinMs,
		"max_ms":       cfg.MaxMs,
		"carreras":     s.e.CarrerasTotal,
		"jugadores":    len(s.e.Jugadores),
		"record":       s.e.Record,
		"recordNombre": censurar(s.e.RecordNombre),
		"ganadores":    []map[string]any{},
		"matricula":    urlMatricula,
		"ahora":        s.ahora().UTC(),
		"cerrado":      cerrado,
		"cierre":       cfg.Cierre,
		"solo_manual":  cfg.SoloManual,
		"tabla":        s.tablaPublica(),
	}
	if cerrado {
		out["quedan_100"] = s.quedan100()
		for _, g := range s.e.Ganadores {
			out["ganadores"] = append(out["ganadores"].([]map[string]any), map[string]any{
				"nombre": censurar(g.Nombre), "descuento": g.Descuento, "curso": g.Curso,
				"puntaje": g.Puntaje, "puesto": g.Puesto, "fecha": g.Fecha, "excluido": g.Excluido,
			})
		}
	} else {
		out["anuncio"] = cfg.anuncio()
	}
	return out
}

// tablaPublica: el ranking que ve todo el mundo, con iniciales y sin teléfono.
// Solo entra quien tiene una carrera válida y cuenta su MEJOR carrera, no la
// suma. No dice quién va por qué curso: eso se revela al cierre. Con s.mu tomado.
func (s *Servidor) tablaPublica() []map[string]any {
	filas := []map[string]any{}
	for k, i := range s.ranking() {
		if k == topeTabla {
			break
		}
		j := s.e.Jugadores[i]
		filas = append(filas, map[string]any{
			"puesto": k + 1, "nombre": censurar(j.Nombre), "mejor": j.MejorValido, "carreras": j.Carreras,
		})
	}
	return filas
}

const topeTabla = 50

// puestoEnTabla: el puesto de un jugador en el ranking (0 si aún no tiene
// carrera válida) y cuántos hay en la tabla. Con s.mu tomado.
func (s *Servidor) puestoEnTabla(id int) (puesto, total int) {
	r := s.ranking()
	for k, i := range r {
		if s.e.Jugadores[i].ID == id {
			return k + 1, len(r)
		}
	}
	return 0, len(r)
}

// Lo que ve la persona con su token. Si el sorteo sigue abierto, aquí NO
// aparece su premio (ni siquiera que ya tiene uno): solo su posición y el
// aviso del cierre. El cupón ya está emitido y lo ve el instructor en /admin.
func (s *Servidor) mio(i int) map[string]any {
	j := s.e.Jugadores[i]
	cfg := s.e.Config
	cerrado := cfg.cerrada(s.ahora())
	out := map[string]any{
		"t": j.Token, "nombre": j.Nombre, "telefono": j.Telefono,
		"carreras": j.Carreras, "mejor": j.MejorPuntaje,
		"curso": cfg.Curso, "curso_otro": cfg.CursoOtro,
		"cerrado": cerrado, "cierre": cfg.Cierre,
		"excluido":     cfg.excluido(j.Nombre, j.Telefono),
		"mejor_valido": j.MejorValido,
	}
	out["puesto_tabla"], out["en_tabla"] = s.puestoEnTabla(j.ID)
	if cerrado {
		out["gane"] = j.Gano
		out["quedan_100"] = s.quedan100()
		if out["excluido"] == true {
			out["aviso"] = avisoExcluido
		}
		if g := s.ganadorDe(j.ID); g != nil {
			out["premio"] = map[string]any{
				"id": g.ID, "descuento": g.Descuento, "codigo": g.Codigo,
				"codigo_pendiente": g.Codigo == "", "curso": g.Curso, "puntaje": g.Puntaje,
				"puesto": g.Puesto, "wa": waURL(cfg.WhatsApp, mensajePremio(g.Descuento, g.Curso, g.Codigo)),
				"matricula": urlMatricula + g.Codigo,
			}
		}
	} else {
		// abierto: nada de premios ni de excluidos, solo la posición y el cierre
		delete(out, "excluido")
		out["anuncio"] = cfg.anuncio()
	}
	return out
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	c := r.Header.Get("X-Clave")
	return c != "" && subtle.ConstantTimeCompare([]byte(c), []byte(s.clave)) == 1
}

// Data que se lee del sorteo de Claude Code PRO para no premiar dos veces al
// mismo: su configuración de excluidos y sus participantes con código propio.
type estadoClaude struct {
	Config struct {
		Excluidos    []string `json:"excluidos"`
		ExcluidosTel []string `json:"excluidosTel"`
	} `json:"config"`
	Codigos []struct {
		Descuento int `json:"descuento"`
		Numero    int `json:"numero"`
	} `json:"codigos"`
	Participantes []struct {
		Numero   int    `json:"numero"`
		Nombre   string `json:"nombre"`
		Telefono string `json:"telefono"`
	} `json:"participantes"`
}

// Trae los ganadores del sorteo de Claude y los agrega a las listas de
// excluidos (sin borrar lo que el instructor cargó a mano). Sale mal sin
// romper nada: los excluidos locales siguen valiendo.
func (s *Servidor) sincronizarExcluidos(url, clave string) {
	if url == "" || clave == "" {
		return
	}
	req, err := http.NewRequest("GET", strings.TrimRight(url, "/")+"/api/admin/estado", nil)
	if err != nil {
		return
	}
	req.Header.Set("X-Clave", clave)
	resp, err := (&http.Client{Timeout: 6 * time.Second}).Do(req)
	if err != nil {
		log.Printf("excluidos del sorteo de Claude: %v", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		log.Printf("excluidos del sorteo de Claude: respondió %s", resp.Status)
		return
	}
	var ce estadoClaude
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&ce); err != nil {
		log.Printf("excluidos del sorteo de Claude: %v", err)
		return
	}
	ganadores := map[int]bool{}
	for _, c := range ce.Codigos {
		if c.Numero > 0 && c.Descuento > 0 {
			ganadores[c.Numero] = true
		}
	}
	nombres, celulares := append([]string{}, ce.Config.Excluidos...), append([]string{}, ce.Config.ExcluidosTel...)
	for _, p := range ce.Participantes {
		if ganadores[p.Numero] && limpiarNombre(p.Nombre) != "" {
			nombres = append(nombres, p.Nombre)
			if telefonoOK(p.Telefono) {
				celulares = append(celulares, digitos(p.Telefono))
			}
		}
	}
	s.mu.Lock()
	antes := len(s.e.Config.Excluidos) + len(s.e.Config.ExcluidosTel)
	s.e.Config.Excluidos = unir(s.e.Config.Excluidos, nombres)
	s.e.Config.ExcluidosTel = unir(s.e.Config.ExcluidosTel, celulares)
	nombresTotal, celularesTotal := len(s.e.Config.Excluidos), len(s.e.Config.ExcluidosTel)
	if nombresTotal+celularesTotal != antes {
		s.guardar()
	}
	s.mu.Unlock()
	log.Printf("excluidos del sorteo de Claude: %d nombres y %d celulares en la lista", nombresTotal, celularesTotal)
}

// Une listas sin repetir, normalizando nombres y dejando solo dígitos en los
// celulares. Nunca pasa de 500 entradas por lista.
func unir(a, b []string) []string {
	vista := map[string]bool{}
	for _, x := range a {
		vista[strings.TrimSpace(x)] = true
	}
	for _, x := range b {
		x = strings.TrimSpace(x)
		if x != "" && !vista[x] {
			a = append(a, x)
			vista[x] = true
		}
	}
	if len(a) > 500 {
		a = a[:500]
	}
	return a
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
	s.agregarPremio(ganador.ID, out)
}

// Completa la respuesta con el premio ya emitido (o el pendiente).
func (s *Servidor) agregarPremio(id int, out map[string]any) {
	s.mu.Lock()
	var g *Ganador
	for k := range s.e.Ganadores {
		if s.e.Ganadores[k].ID == id {
			g = &s.e.Ganadores[k]
		}
	}
	cfg := s.e.Config
	s.mu.Unlock()
	if g == nil {
		return
	}
	out["premio"] = map[string]any{
		"id": g.ID, "descuento": g.Descuento, "codigo": g.Codigo,
		"codigo_pendiente": g.Codigo == "", "curso": g.Curso,
		"wa":        waURL(cfg.WhatsApp, mensajePremio(g.Descuento, g.Curso, g.Codigo)),
		"matricula": urlMatricula + g.Codigo,
	}
}

// El puntaje lo calcula el servidor: 10 puntos por segundo vivo y 5 por
// obstáculo esquivado, con los obstáculos limitados por el tiempo real de la
// carrera (0,7 s entre obstáculos como mínimo: con la pista más rápida, el
// avance y el teletransporte se esquiva más seguido, pero no más que eso).
func puntajeDe(tiempoMs, esquivadas int) (puntaje, limpias int) {
	seg := float64(tiempoMs) / 1000
	if tope := int(seg/0.7) + 1; esquivadas > tope {
		esquivadas = tope
	}
	if esquivadas < 0 {
		esquivadas = 0
	}
	return int(seg*10) + esquivadas*5, esquivadas
}

func (s *Servidor) rutas() http.Handler {
	// La imagen del contenedor no trae /etc/mime.types: sin esto el mp3 saldría
	// adivinado por contenido.
	_ = mime.AddExtensionType(".mp3", "audio/mpeg")
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
	mux.HandleFunc("GET /admin", pagina("admin.html"))
	if s.clase != nil {
		s.rutasClase(mux, pagina, estaticos)
	}
	// Con ?v= el archivo no cambia nunca: un año de caché. Sin versión, una hora.
	mux.Handle("GET /static/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("v") != "" {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=3600")
		}
		estaticos.ServeHTTP(w, r)
	}))

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

	// El QR del cupón: PNG con el enlace wa.me ya escrito.
	mux.HandleFunc("GET /api/qr", func(w http.ResponseWriter, r *http.Request) {
		u := r.URL.Query().Get("u")
		if len(u) < 20 || len(u) > 700 || !strings.HasPrefix(u, "https://wa.me/") {
			fallo(w, 400, "Enlace de WhatsApp no válido.")
			return
		}
		png, err := qrcode.Encode(u, qrcode.Medium, 320)
		if err != nil {
			fallo(w, 500, "No se pudo generar el QR.")
			return
		}
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(png)
	})

	mux.HandleFunc("POST /api/inscribir", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre   string `json:"nombre"`
			Telefono string `json:"telefono"`
			Token    string `json:"t"`
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
		if s.e.Config.cerrada(s.ahora()) {
			fallo(w, 409, "El sorteo ya cerró: cerramos los registros.")
			return
		}
		nombre := limpiarNombre(in.Nombre)
		tel := digitos(in.Telefono)
		if !nombreOK(nombre) {
			fallo(w, 400, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres).")
			return
		}
		if !telefonoOK(tel) {
			fallo(w, 400, "Escribe tu número de WhatsApp con 9 a 15 dígitos.")
			return
		}
		if s.e.Config.bloqueado(nombre, tel) {
			fallo(w, 403, avisoBloqueado)
			return
		}
		for _, j := range s.e.Jugadores {
			if clave(j.Nombre) == clave(nombre) || digitos(j.Telefono) == tel {
				fallo(w, 409, "Ese nombre o número ya corrió. Si eres tú, entra desde el mismo navegador con el que empezaste.")
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
		j := Jugador{ID: s.e.Siguiente, Nombre: nombre, Telefono: tel, Token: nuevoToken(),
			IP: ip, CreadoEn: s.ahora().UTC()}
		s.e.Jugadores = append(s.e.Jugadores, j)
		s.guardar()
		s.avisar()
		responder(w, 200, s.mio(len(s.e.Jugadores)-1))
	})

	// Salida de la carrera: el servidor toma el tiempo.
	mux.HandleFunc("POST /api/correr", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.e.Config.cerrada(s.ahora()) {
			fallo(w, 409, "El sorteo ya cerró: ya no se corre.")
			return
		}
		i := s.jugador(in.Token)
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		j := &s.e.Jugadores[i]
		if s.e.Config.bloqueado(j.Nombre, j.Telefono) {
			fallo(w, 403, avisoBloqueado)
			return
		}
		if a, ok := s.activas[j.ID]; ok {
			responder(w, 200, map[string]any{"carrera": a.Carrera, "tiempo_ms": s.ahora().Sub(a.Inicio).Milliseconds()})
			return
		}
		carrera := j.Carreras + 1
		s.activas[j.ID] = corrida{Carrera: carrera, Inicio: s.ahora()}
		s.avisar()
		responder(w, 200, map[string]any{"carrera": carrera, "tiempo_ms": 0})
	})

	// Latido durante la carrera: devuelve cuánto tiempo lleva el servidor.
	mux.HandleFunc("POST /api/tick", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token    string `json:"t"`
			Carrera  int    `json:"carrera"`
			TiempoMs int    `json:"tiempo_ms"`
			Puntaje  int    `json:"puntaje"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		i := s.jugador(in.Token)
		if i < 0 {
			fallo(w, 404, "No te encontramos.")
			return
		}
		id := s.e.Jugadores[i].ID
		a, ok := s.activas[id]
		if !ok || a.Carrera != in.Carrera {
			fallo(w, 409, "Esa carrera ya terminó.")
			return
		}
		// El latido solo alimenta el panel en vivo: el puntaje que cuenta lo
		// calcula «terminar». Aun así no se acepta más de lo posible.
		elapsed := int(s.ahora().Sub(a.Inicio).Milliseconds())
		tope, _ := puntajeDe(elapsed, 1<<30)
		a.TiempoMs, a.Puntaje = min(max(in.TiempoMs, 0), elapsed), min(max(in.Puntaje, 0), tope)
		s.activas[id] = a
		s.avisar()
		responder(w, 200, map[string]any{"tiempo_ms": elapsed})
	})

	// Fin de la carrera: el servidor mide, calcula el puntaje y reparte.
	mux.HandleFunc("POST /api/terminar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token      string `json:"t"`
			Carrera    int    `json:"carrera"`
			TiempoMs   int    `json:"tiempo_ms"`
			Esquivadas int    `json:"esquivadas"`
			Vidas      int    `json:"vidas"`  // vidas que quedaron (0 = se cayó las 3)
			Puesto     int    `json:"puesto"` // puesto entre los 3 corredores (1 = ganaste)
			CPU        []int  `json:"cpu"`    // puntajes de los dos cpu
		}
		if err := leerJSON(r, &in, 4096); err != nil {
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
		j := &s.e.Jugadores[i]
		a, ok := s.activas[j.ID]
		if !ok || a.Carrera != in.Carrera {
			s.mu.Unlock()
			fallo(w, 409, "Esa carrera ya terminó. Corre de nuevo.")
			return
		}
		delete(s.activas, j.ID)

		// El tiempo válido nunca supera lo que el servidor vio correr.
		elapsed := int(s.ahora().Sub(a.Inicio).Milliseconds())
		tiempo := min(in.TiempoMs, elapsed, s.e.Config.MaxMs)
		if tiempo < 1000 {
			s.mu.Unlock()
			fallo(w, 409, "La carrera no arrancó. Vuelve a intentarlo.")
			return
		}
		puntaje, esquivadas := puntajeDe(tiempo, in.Esquivadas)
		if in.Vidas < 0 || in.Vidas > 3 {
			in.Vidas = 0
		}
		puesto := in.Puesto
		if puesto < 1 || puesto > 3 {
			puesto = 3
		}
		// Ganaste la carrera solo si le sacaste puntaje a los dos cpu.
		segui, mejorCPU := 0, 0
		for _, c := range in.CPU {
			segui++
			mejorCPU = max(mejorCPU, c)
		}
		if puesto == 1 && (segui != 2 || mejorCPU >= puntaje) {
			puesto = 2
		}
		cfg := s.e.Config
		excluido := cfg.excluido(j.Nombre, j.Telefono)

		j.Carreras++
		s.e.CarrerasTotal++
		if puntaje > j.MejorPuntaje {
			j.MejorPuntaje = puntaje
		}
		if puntaje > s.e.Record {
			s.e.Record, s.e.RecordNombre = puntaje, j.Nombre
		}
		// Un premio por persona. Con AlCierre decide su mejor carrera válida;
		// sin él, la primera carrera válida.
		var ganador *Ganador
		// Con premios al cierre, una carrera que termina después del cierre ya
		// no entra a la tabla: los premios ya se repartieron.
		valida := tiempo >= cfg.MinMs && !(cfg.AlCierre && cfg.cerrada(s.ahora()))
		if valida && puntaje > j.MejorValido {
			j.MejorValido, j.PuestoValido = puntaje, puesto
		}
		// Claude Code PRO, o el otro curso si ya ganó en el sorteo de Claude.
		curso := cfg.Curso
		if excluido {
			curso = cfg.CursoOtro
		}
		if cfg.AlCierre {
			// los premios se calculan con el botón de cierre del panel
		} else if valida && !j.Gano && puesto == 1 && s.quedan100De(curso) > 0 {
			// El mejor puntaje de la carrera se lleva el 100 % de su curso.
			ganador = s.anotar(j, 100, curso, puntaje, puesto, excluido)
		} else if valida && !j.Gano {
			// El resto: descuento aleatorio de su curso.
			desc := cfg.DescMin + azar(cfg.DescMax-cfg.DescMin+1)
			ganador = s.anotar(j, desc, curso, puntaje, puesto, excluido)
		}
		// Mientras el sorteo está abierto, el participante solo ve su posición:
		// ni premio, ni cupo, ni si ya quedó premiado. El cupón se emite igual
		// y lo guarda el instructor.
		cerrado := cfg.cerrada(s.ahora())
		out := map[string]any{
			"carrera": in.Carrera, "tiempo_ms": tiempo, "esquivadas": esquivadas,
			"puntaje": puntaje, "vidas": in.Vidas, "puesto": puesto,
			"mejor": j.MejorPuntaje, "record": s.e.Record,
			"cerrado": cerrado, "cierre": cfg.Cierre,
			"anuncio": "", "valida": valida,
		}
		if cerrado {
			out["excluido"] = excluido
			out["cupo_100"] = ganador != nil && ganador.Descuento == 100
			out["ya_premiado"] = j.Gano
			out["puede_premio"] = valida && !j.Gano
			out["quedan_100"] = s.quedan100()
			if excluido {
				out["aviso"] = avisoExcluido
			}
		} else {
			out["anuncio"] = cfg.anuncio()
		}
		s.guardar()
		s.avisar()
		id := 0
		if ganador != nil {
			id = ganador.ID
		}
		s.mu.Unlock()

		if id > 0 {
			s.entregarCodigo(*ganador, out)
			if !cerrado {
				delete(out, "premio") // abierto: el participante no ve su premio
			}
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
		out := s.publico()
		out["config"] = s.e.Config
		out["jugadores"] = s.e.Jugadores
		out["ganadores"] = s.e.Ganadores
		out["quedan_100"] = s.quedan100()
		out["activas"] = len(s.activas)
		return out
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/config", admin(func(w http.ResponseWriter, r *http.Request) {
		var in Config
		if err := leerJSON(r, &in, 65536); err != nil {
			fallo(w, 400, "Configuración no válida.")
			return
		}
		in.Curso, in.CursoOtro = limpiarNombre(in.Curso), limpiarNombre(in.CursoOtro)
		in.Titulo = limpiarNombre(in.Titulo)
		in.WhatsApp = digitos(in.WhatsApp)
		limpios := make([]string, 0, len(in.Excluidos))
		for _, ex := range in.Excluidos {
			if ex = limpiarNombre(ex); ex != "" {
				limpios = append(limpios, ex)
			}
		}
		in.Excluidos = limpios
		bloq := make([]string, 0, len(in.Bloqueados))
		for _, b := range in.Bloqueados {
			if b = limpiarNombre(b); b != "" {
				bloq = append(bloq, b)
			}
		}
		in.Bloqueados = bloq
		ok := in.Cupos100 >= 0 && in.Cupos100 <= 100 && in.DescMin >= 1 && in.DescMax <= 100 &&
			in.DescMin <= in.DescMax && in.MinMs >= 3000 && in.MaxMs > in.MinMs &&
			len(in.WhatsApp) >= 9 && in.Curso != "" && in.CursoOtro != "" &&
			(in.Cierre.IsZero() || in.Cierre.Year() >= 2020)
		if !ok {
			fallo(w, 400, "Revisa cupos (0-100), descuentos (1-100, min ≤ max), duración (min ≥ 3 s, max > min), WhatsApp, nombres de curso y la hora de cierre.")
			return
		}
		s.e.Config = in
		s.guardar()
		s.avisar()
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
	mux.HandleFunc("GET /api/admin/vivo", s.panelVivo)
	// Botón del panel: cierra el sorteo y calcula los premios por puntaje.
	mux.HandleFunc("POST /api/admin/cerrar", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			noAutorizado(w)
			return
		}
		s.mu.Lock()
		nuevos := s.cerrarYCalcular()
		s.guardar()
		out := estadoAdmin()
		s.mu.Unlock()
		s.avisar()
		go s.emitirCodigos(nuevos)
		responder(w, 200, out)
	})
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.e.Jugadores, s.e.Ganadores = nil, nil
		s.e.Siguiente, s.e.CarrerasTotal, s.e.Record, s.e.RecordNombre = 0, 0, 0, ""
		s.porIP = map[string]int{}
		s.activas = map[int]corrida{}
		s.guardar()
		s.avisar()
		responder(w, 200, estadoAdmin())
	}))
	return mux
}

// Anota un premio ya decidido (fuera de las decisiones de cupo).
func (s *Servidor) anotar(j *Jugador, descuento int, curso string, puntaje, puesto int, excluido bool) *Ganador {
	j.Gano = true
	g := Ganador{ID: len(s.e.Ganadores) + 1, Jugador: j.ID, Nombre: j.Nombre,
		NombreCensurado: censurar(j.Nombre), Descuento: descuento, Curso: curso,
		Puntaje: puntaje, Puesto: puesto, Excluido: excluido, Fecha: s.ahora().UTC()}
	s.e.Ganadores = append(s.e.Ganadores, g)
	return &g
}

func entero(nombre string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(nombre)); err == nil && v > 0 {
		return v
	}
	return def
}

// Configuración con la que nace el estado. NINJA_CUPOS_100, NINJA_MIN_MS,
// NINJA_MAX_MS, NINJA_DESC_MIN y NINJA_DESC_MAX mandan la primera vez; después
// lo guardado (y lo que edite el admin) gana sobre el entorno. Los excluidos
// son los ganadores de Claude Code PRO: sus nombres vienen de la data del
// sorteo y se pueden editar desde /admin.
func configInicial() Config {
	return Config{
		Titulo:    "Ninja Race",
		Curso:     "Claude Code PRO",
		CursoOtro: "otro curso del catálogo",
		WhatsApp:  "51986149476",
		Cupos100:  entero("NINJA_CUPOS_100", 1),
		DescMin:   entero("NINJA_DESC_MIN", 40),
		DescMax:   entero("NINJA_DESC_MAX", 70),
		MinMs:     entero("NINJA_MIN_MS", 15000),
		MaxMs:     entero("NINJA_MAX_MS", 180000),
		Cierre:    medianocheLima(time.Now()), // cierra solo a medianoche
		Excluidos: []string{
			"Jack Castillo", "Gian Grobert", "Gian Mamani", "Raul Gamboa", "Mario Ccallo", "Mario Callo",
			"Merlin Requejo", "David Requejo", "Jhon Perez Medrano", "Jhon Perez", "John Perez Medrano",
			"Paul Huaman", "Arnold Morales", "Carlos Saavedra", "Ines Jaimes",
			"Hector Javier Limahuaya Adco", "Hector Limahuaya", "Alex Mesias Diaz Toro", "Alex Diaz", "Alex Mesias",
			"David Jefferson", "Rashel Poma", "Nicolle Esquivel", "Auner Llamo", "Vitmar Aliaga", "Jhon Dilmer",
			"J0RDAN CARLOS", "Jordan Carlos",
		},
		ExcluidosTel: []string{},
	}
}

func main() {
	datos := os.Getenv("SORTEO_DATOS")
	if datos == "" {
		datos = "datos"
	}
	claveAdmin := os.Getenv("SORTEO_CLAVE")
	if claveAdmin == "" {
		log.Fatal("SORTEO_CLAVE es obligatoria")
	}
	if len(claveAdmin) < 12 {
		log.Printf("aviso: SORTEO_CLAVE corta (%d caracteres); usa 12 o más en producción", len(claveAdmin))
	}
	if err := os.MkdirAll(datos, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{
		archivo: filepath.Join(datos, "estado.json"), clave: claveAdmin,
		porIP: map[string]int{}, activas: map[int]corrida{},
		ahora: time.Now, azar: azar,
		pedirCodigo: pedirCodigoClaude(os.Getenv("CLAUDE_ADMIN_URL"), os.Getenv("CLAUDE_ADMIN_CLAVE")),
		vivo:        nuevoVivo(),
		clase:       nuevaClase(time.Now, azar),
	}
	go s.bucleVivo()
	go func() {
		for range time.Tick(250 * time.Millisecond) {
			s.clase.avanzar()
		}
	}()
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
	} else {
		s.e = Estado{Config: configInicial()}
		s.guardar()
	}
	// Estado viejo (creado antes del cierre automático): se pone a medianoche
	// para que el sorteo no se quede abierto para siempre.
	if s.e.Config.Cierre.IsZero() && !s.e.Config.Cerrado && !s.e.Config.SoloManual {
		s.e.Config.Cierre = medianocheLima(time.Now())
		s.guardar()
		log.Printf("cierre automático puesto a medianoche (%s)", s.e.Config.Cierre.In(lima).Format("2006-01-02 15:04 Lima"))
	}
	for _, j := range s.e.Jugadores {
		s.porIP[s.claveIP(j.IP, j.CreadoEn)]++
	}
	// Los ganadores del sorteo de Claude no pueden llevarse el 100 %: se
	// leen de su API al arrancar y cada 15 minutos.
	claudeURL, claudeClave := os.Getenv("CLAUDE_ADMIN_URL"), os.Getenv("CLAUDE_ADMIN_CLAVE")
	go func() {
		s.sincronizarExcluidos(claudeURL, claudeClave)
		for range time.Tick(15 * time.Minute) {
			s.sincronizarExcluidos(claudeURL, claudeClave)
		}
	}()
	// Cierre a la hora: si los premios van al cierre, se calculan solos al
	// llegar la hora, igual que con el botón del panel.
	go func() {
		for range time.Tick(5 * time.Second) {
			s.cerrarSiEsLaHora()
		}
	}()
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18595"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("ninja race en :%s (1 vs 2 cpu, 3 vidas, %d%%-%d%%, cupos 100: %d, %d corredores)",
		puerto, s.e.Config.DescMin, s.e.Config.DescMax, s.e.Config.Cupos100, len(s.e.Jugadores))
	log.Fatal(srv.ListenAndServe())
}
