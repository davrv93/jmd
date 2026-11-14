// «Sopa de letras IA · El mejor tiempo gana una vacante en Claude Code PRO».
//
// Juego contra el reloj, hermano de Árbitro y Balón de Oro: la persona escribe
// su nombre y apellido, recibe un token y tiene 3 intentos. En cada intento el
// SERVIDOR arma una sopa de letras nueva con crypto/rand (12×12, 8 palabras de
// IA sacadas al azar de una lista de ~30), guarda dónde quedó cada palabra y la
// hora de inicio. El navegador solo recibe las letras y la lista de palabras;
// cada selección (primera y última letra) se valida en el servidor. Cuando
// aparecen las 8, el servidor anota el tiempo = ahora − inicio. El reloj del
// navegador es solo para mirar. Un tiempo imposible (menos de 15 s) no cuenta.
//
// Ranking público: el mejor tiempo de cada persona, solo con iniciales. Al
// cerrar el concurso (el admin o la hora de cierre) gana el mejor tiempo entre
// quienes pueden ganar: los ganadores de Claude Code PRO juegan y salen en el
// ranking, pero nunca ganan (la lista vive en la configuración y se compara
// palabra por palabra). El premio es un código de la API del sorteo de Claude
// Code PRO que solo ve el ganador en su navegador.
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

// Registros nuevos permitidos desde una misma conexión en un mismo día (Lima).
const topeIPDia = 12

// Dónde se usa el código ganado.
const urlMatricula = "https://jmd-learn.online/sorteo-claude/matricula?c="

// Tamaño del tablero y palabras por intento.
const (
	lado          = 12
	palabrasPorJu = 8
)

// Selecciones equivocadas permitidas en un intento antes de anularlo (frena a
// quien prueba todas las combinaciones a ciegas).
const topeFallos = 150

// Puestos visibles en el ranking público.
const topeRanking = 10

// Aviso para quien ya ganó en Claude Code PRO.
const avisoExcluido = "Ya ganaste en Claude Code PRO: puedes jugar y salir en el ranking, pero esta vez el premio es para otra persona"

// Palabra de la lista con su significado en castellano sencillo (el mini
// glosario que aparece cuando la encuentras).
type Palabra struct {
	Palabra     string `json:"palabra"`
	Significado string `json:"significado"`
}

// Lista de palabras: fáciles, sin tildes ni Ñ.
var lista = []Palabra{
	{"DATOS", "La información (números, textos, fotos) de la que aprende una IA."},
	{"MODELO", "El «cerebro» que arma la IA después de aprender de muchos ejemplos."},
	{"PROMPT", "Lo que le escribes a la IA para pedirle algo."},
	{"CHATBOT", "Programa que conversa contigo por escrito, como Claude."},
	{"ROBOT", "Máquina que se mueve y hace tareas por sí sola."},
	{"AGENTE", "IA que no solo responde: usa herramientas y hace tareas por ti."},
	{"TOKEN", "Pedacito de texto que la IA lee y cuenta; así se mide su uso."},
	{"NEURONA", "Pieza pequeña de una red neuronal: suma señales y decide cuánto pasa."},
	{"ALGORITMO", "Lista de pasos ordenados para resolver un problema."},
	{"APRENDER", "Mejorar con ejemplos, sin que alguien escriba cada regla."},
	{"IMAGEN", "Foto o dibujo que la IA puede reconocer o crear."},
	{"VOZ", "La IA puede escucharte y también hablarte."},
	{"CODIGO", "Instrucciones escritas para que la computadora haga algo."},
	{"NUBE", "Computadoras en internet donde corre la IA, no en tu celular."},
	{"PIXEL", "Puntito de color; miles de ellos forman una imagen."},
	{"ETIQUETA", "La respuesta correcta que acompaña a un ejemplo: «esto es un gato»."},
	{"PATRON", "Algo que se repite y que la IA aprende a reconocer."},
	{"PREGUNTA", "Lo que le pides a la IA; mientras más clara, mejor la respuesta."},
	{"RESPUESTA", "Lo que la IA te devuelve; conviene revisarla siempre."},
	{"MEMORIA", "Lo que la IA recuerda de la conversación."},
	{"CONTEXTO", "Todo lo que la IA tiene a la vista para responder en ese momento."},
	{"ENTRENAR", "Enseñarle a un modelo con muchos ejemplos hasta que acierte."},
	{"PREDECIR", "Adivinar lo que viene según lo aprendido, como la siguiente palabra."},
	{"SENSOR", "Pieza que mide el mundo: luz, sonido, temperatura o movimiento."},
	{"VISION", "Cuando la IA «ve» y entiende lo que hay en una foto o un video."},
	{"TEXTO", "Palabras escritas: la materia prima de los chatbots."},
	{"IDEA", "La pones tú: la IA ayuda, pero la idea es tuya."},
	{"LOGICA", "Razonar paso a paso para llegar a una conclusión."},
	{"RED", "Red neuronal: muchas neuronas conectadas en capas."},
	{"PRUEBA", "Revisar que la IA responda bien antes de confiar en ella."},
}

// Direcciones permitidas (fila, columna): derecha, abajo, diagonal hacia abajo
// a la derecha y diagonal hacia arriba a la derecha. Nada al revés: es para
// quien recién empieza.
var direcciones = [][2]int{{0, 1}, {1, 0}, {1, 1}, {-1, 1}}

// Letras de relleno.
const abecedario = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// Dónde quedó una palabra: primera letra (F, C) y dirección (DF, DC).
type Ubicada struct {
	Palabra string `json:"palabra"`
	F       int    `json:"f"`
	C       int    `json:"c"`
	DF      int    `json:"df"`
	DC      int    `json:"dc"`
}

func (u Ubicada) fin() (int, int) {
	n := len(u.Palabra) - 1
	return u.F + u.DF*n, u.C + u.DC*n
}

type Tablero struct {
	Letras   []string  `json:"letras"`   // lado filas de lado letras
	Palabras []Ubicada `json:"palabras"` // en el orden en que se colocaron
}

type Intento struct {
	N           int       `json:"n"` // 1, 2, 3…
	Inicio      time.Time `json:"inicio"`
	Tablero     Tablero   `json:"tablero"`
	Encontradas []string  `json:"encontradas"` // palabras ya halladas, en orden
	Fallos      int       `json:"fallos"`
	Estado      string    `json:"estado"` // jugando | terminado | invalido | vencido | abandonado
	Ms          int64     `json:"ms"`     // tiempo del servidor al terminar
	Fin         time.Time `json:"fin,omitzero"`
}

type Config struct {
	Cierre    string   `json:"cierre"`    // RFC3339; "" = abierto hasta que el admin cierre
	Premios   []int    `json:"premios"`   // descuento por puesto: [100] = solo el 1.º
	Intentos  int      `json:"intentos"`  // intentos por persona
	MinimoMs  int64    `json:"minimo_ms"` // menos que esto es un tiempo imposible
	VenceMin  int      `json:"vence_min"` // un intento sin terminar vence a los N minutos
	Excluidos []string `json:"excluidos"`
}

type Jugador struct {
	ID       int       `json:"id"`
	Nombre   string    `json:"nombre"`
	Token    string    `json:"token"`
	IP       string    `json:"ip"`
	CreadoEn time.Time `json:"creadoEn"`
	Intentos []Intento `json:"intentos"`
	MejorMs  int64     `json:"mejorMs"` // 0 = aún sin tiempo válido
	MejorEn  time.Time `json:"mejorEn,omitzero"`
}

type Ganador struct {
	ID              int       `json:"id"`
	Puesto          int       `json:"puesto"` // puesto del premio (1, 2…)
	Jugador         int       `json:"jugador"`
	Nombre          string    `json:"nombre"`
	NombreCensurado string    `json:"nombreCensurado"`
	Descuento       int       `json:"descuento"`
	Ms              int64     `json:"ms"`
	Codigo          string    `json:"codigo"` // vacío = pendiente (la API del sorteo no respondió)
	Fecha           time.Time `json:"fecha"`
}

type Estado struct {
	Config    Config    `json:"config"`
	Siguiente int       `json:"siguiente"`
	Jugadores []Jugador `json:"jugadores"`
	Ganadores []Ganador `json:"ganadores"`
	Cerrado   bool      `json:"cerrado"`
	CerradoEn time.Time `json:"cerradoEn,omitzero"`
	Partidas  int       `json:"partidas"` // intentos terminados con tiempo válido
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

// ---------------------------------------------------------------------------
// El tablero.

// ¿Cuántas veces aparece la palabra en el tablero, leyendo en las 8
// direcciones? Sirve para garantizar que cada palabra está UNA sola vez (ni
// repetida por el relleno, ni al revés en otro lado).
func ocurrencias(letras []string, palabra string) int {
	n := 0
	for f := 0; f < lado; f++ {
		for c := 0; c < lado; c++ {
			for df := -1; df <= 1; df++ {
				for dc := -1; dc <= 1; dc++ {
					if df == 0 && dc == 0 {
						continue
					}
					k := 0
					for ; k < len(palabra); k++ {
						ff, cc := f+df*k, c+dc*k
						if ff < 0 || ff >= lado || cc < 0 || cc >= lado || letras[ff][cc] != palabra[k] {
							break
						}
					}
					if k == len(palabra) {
						n++
					}
				}
			}
		}
	}
	return n
}

// Elige n palabras distintas al azar; descarta las que contienen a otra ya
// elegida o están contenidas en ella (TEXTO dentro de CONTEXTO, RED dentro de
// PREDECIR), porque aparecerían dos veces.
func elegirPalabras(az func(int) int, n int) []string {
	quedan := make([]string, len(lista))
	for i, p := range lista {
		quedan[i] = p.Palabra
	}
	var out []string
	for len(out) < n && len(quedan) > 0 {
		k := az(len(quedan))
		p := quedan[k]
		quedan = append(quedan[:k], quedan[k+1:]...)
		choca := false
		for _, o := range out {
			if strings.Contains(o, p) || strings.Contains(p, o) {
				choca = true
				break
			}
		}
		if !choca {
			out = append(out, p)
		}
	}
	return out
}

// Arma un tablero nuevo: elige las palabras, las coloca de la más larga a la
// más corta en una dirección y posición al azar (pueden cruzarse si comparten
// letra), rellena el resto y comprueba que cada palabra aparece una sola vez.
func generar(az func(int) int) Tablero {
	for vuelta := 0; vuelta < 500; vuelta++ {
		elegidas := elegirPalabras(az, palabrasPorJu)
		orden := append([]string{}, elegidas...)
		sort.SliceStable(orden, func(i, j int) bool { return len(orden[i]) > len(orden[j]) })
		var g [lado][lado]byte
		var puestas []Ubicada
		ok := true
		for _, p := range orden {
			puesta := false
			for prueba := 0; prueba < 400 && !puesta; prueba++ {
				d := direcciones[az(len(direcciones))]
				f, c := az(lado), az(lado)
				n := len(p) - 1
				ff, cc := f+d[0]*n, c+d[1]*n
				if ff < 0 || ff >= lado || cc < 0 || cc >= lado {
					continue
				}
				cabe := true
				for k := 0; k < len(p); k++ {
					x := g[f+d[0]*k][c+d[1]*k]
					if x != 0 && x != p[k] {
						cabe = false
						break
					}
				}
				if !cabe {
					continue
				}
				for k := 0; k < len(p); k++ {
					g[f+d[0]*k][c+d[1]*k] = p[k]
				}
				puestas = append(puestas, Ubicada{Palabra: p, F: f, C: c, DF: d[0], DC: d[1]})
				puesta = true
			}
			if !puesta {
				ok = false
				break
			}
		}
		if !ok {
			continue
		}
		letras := make([]string, lado)
		for f := 0; f < lado; f++ {
			fila := make([]byte, lado)
			for c := 0; c < lado; c++ {
				if g[f][c] == 0 {
					g[f][c] = abecedario[az(len(abecedario))]
				}
				fila[c] = g[f][c]
			}
			letras[f] = string(fila)
		}
		unicas := true
		for _, u := range puestas {
			if ocurrencias(letras, u.Palabra) != 1 {
				unicas = false
				break
			}
		}
		if unicas {
			return Tablero{Letras: letras, Palabras: puestas}
		}
	}
	panic("no se pudo armar el tablero")
}

func significado(p string) string {
	for _, x := range lista {
		if x.Palabra == p {
			return x.Significado
		}
	}
	return ""
}

// ---------------------------------------------------------------------------
// Utilidades compartidas con Árbitro.

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

// ---------------------------------------------------------------------------
// Reglas del concurso.

// Hora de cierre configurada (cero si no hay).
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

// ¿Ya no se puede jugar? (el admin cerró o pasó la hora de cierre)
func (s *Servidor) terminado() bool {
	if s.e.Cerrado {
		return true
	}
	t := s.e.Config.horaCierre()
	return !t.IsZero() && !s.ahora().Before(t)
}

// Marca como vencido el intento en curso si pasó el plazo.
func (s *Servidor) vencer(j *Jugador) {
	if n := len(j.Intentos); n > 0 {
		in := &j.Intentos[n-1]
		if in.Estado == "jugando" && s.ahora().Sub(in.Inicio) > time.Duration(s.e.Config.VenceMin)*time.Minute {
			in.Estado = "vencido"
		}
	}
}

// Intento en curso (nil si no hay).
func actual(j *Jugador) *Intento {
	if n := len(j.Intentos); n > 0 && j.Intentos[n-1].Estado == "jugando" {
		return &j.Intentos[n-1]
	}
	return nil
}

type fila struct {
	j       *Jugador
	excluir bool
}

// Ranking completo: el mejor tiempo de cada persona, de menor a mayor; a
// igual tiempo, primero quien lo hizo antes.
func (s *Servidor) ranking() []fila {
	var fs []fila
	for i := range s.e.Jugadores {
		j := &s.e.Jugadores[i]
		if j.MejorMs > 0 {
			fs = append(fs, fila{j, s.e.Config.excluido(j.Nombre)})
		}
	}
	sort.SliceStable(fs, func(a, b int) bool {
		if fs[a].j.MejorMs != fs[b].j.MejorMs {
			return fs[a].j.MejorMs < fs[b].j.MejorMs
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

func (s *Servidor) jugaron() int {
	n := 0
	for _, j := range s.e.Jugadores {
		if len(j.Intentos) > 0 {
			n++
		}
	}
	return n
}

// Lo que ve cualquiera: contadores, ranking y ganadores con iniciales. Nunca
// el nombre completo, ni el código, ni dónde están las palabras.
func (s *Servidor) publico() map[string]any {
	cfg := s.e.Config
	rk := s.ranking()
	filas := make([]map[string]any, 0, topeRanking)
	for k, f := range rk {
		if k >= topeRanking {
			break
		}
		filas = append(filas, map[string]any{"puesto": k + 1, "nombre": censurar(f.j.Nombre), "ms": f.j.MejorMs, "fuera": f.excluir})
	}
	gs := make([]map[string]any, 0, len(s.e.Ganadores))
	for _, g := range s.e.Ganadores {
		gs = append(gs, map[string]any{"puesto": g.Puesto, "nombre": censurar(g.Nombre), "descuento": g.Descuento, "ms": g.Ms})
	}
	return map[string]any{
		"cierre":               cfg.Cierre,
		"cerrado":              s.terminado(),
		"premios":              cfg.Premios,
		"intentos_por_persona": cfg.Intentos,
		"minimo_ms":            cfg.MinimoMs,
		"vence_min":            cfg.VenceMin,
		"jugaron":              s.jugaron(),
		"inscritos":            len(s.e.Jugadores),
		"partidas":             s.e.Partidas,
		"en_ranking":           len(rk),
		"ranking":              filas,
		"ganadores":            gs,
		"matricula":            urlMatricula,
		"ahora":                s.ahora().UTC(),
	}
}

// Vista de un intento para el navegador: letras, palabras con su significado y
// las ya encontradas con sus extremos. Las posiciones de las que faltan NO van.
func (s *Servidor) vistaIntento(in *Intento) map[string]any {
	pals := make([]Palabra, 0, len(in.Tablero.Palabras))
	for _, u := range in.Tablero.Palabras {
		pals = append(pals, Palabra{u.Palabra, significado(u.Palabra)})
	}
	sort.Slice(pals, func(a, b int) bool { return pals[a].Palabra < pals[b].Palabra })
	ens := make([]map[string]any, 0, len(in.Encontradas))
	for _, p := range in.Encontradas {
		for _, u := range in.Tablero.Palabras {
			if u.Palabra == p {
				f2, c2 := u.fin()
				ens = append(ens, map[string]any{"palabra": p, "f1": u.F, "c1": u.C, "f2": f2, "c2": c2})
			}
		}
	}
	return map[string]any{
		"n": in.N, "letras": in.Tablero.Letras, "palabras": pals, "encontradas": ens, "total": len(in.Tablero.Palabras),
		"transcurrido_ms": s.ahora().Sub(in.Inicio).Milliseconds(), "vence_min": s.e.Config.VenceMin,
	}
}

// Lo que ve la persona con su token.
func (s *Servidor) mio(i int) map[string]any {
	j := &s.e.Jugadores[i]
	s.vencer(j)
	hist := make([]map[string]any, 0, len(j.Intentos))
	for _, in := range j.Intentos {
		h := map[string]any{"n": in.N, "estado": in.Estado}
		if in.Estado == "terminado" || in.Estado == "invalido" {
			h["ms"] = in.Ms
		}
		hist = append(hist, h)
	}
	out := map[string]any{
		"t": j.Token, "nombre": j.Nombre, "intentos_usados": len(j.Intentos),
		"intentos_restantes": max(0, s.e.Config.Intentos-len(j.Intentos)), "mejor_ms": j.MejorMs,
		"puesto": s.puestoDe(j.ID), "excluido": s.e.Config.excluido(j.Nombre), "historial": hist, "cerrado": s.terminado(),
	}
	if out["excluido"].(bool) {
		out["aviso"] = avisoExcluido
	}
	if in := actual(j); in != nil {
		out["actual"] = s.vistaIntento(in)
	}
	if g := s.ganadorDe(j.ID); g != nil {
		out["gane"] = true
		out["codigo"] = g.Codigo
		out["codigo_pendiente"] = g.Codigo == ""
		out["descuento"] = g.Descuento
		out["puesto_premio"] = g.Puesto
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

// Cierra el concurso: elige a los ganadores entre quienes pueden ganar (uno
// por cada premio configurado) y pide sus códigos a la API del sorteo, FUERA
// del candado. Si ya estaba cerrado no hace nada: el premio sale una sola vez.
// Si la API falla, el premio queda guardado con código pendiente.
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
			NombreCensurado: censurar(f.j.Nombre), Descuento: s.e.Config.Premios[puesto], Ms: f.j.MejorMs, Fecha: s.ahora().UTC()}
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

// Cierre automático: cuando pasa la hora de cierre, cierra solo.
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

func dentro(x int) bool { return x >= 0 && x < lado }

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
				fallo(w, 409, "Ese nombre ya está jugando. Si eres tú, entra desde el mismo navegador con el que empezaste.")
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

	// Empieza un intento (o devuelve el que está en curso, con su reloj).
	mux.HandleFunc("POST /api/empezar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		i := s.jugador(in.Token)
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		j := &s.e.Jugadores[i]
		s.vencer(j)
		if a := actual(j); a != nil {
			responder(w, 200, s.vistaIntento(a))
			return
		}
		if s.terminado() {
			fallo(w, 409, "El concurso ya cerró. Gracias por jugar.")
			return
		}
		if len(j.Intentos) >= s.e.Config.Intentos {
			fallo(w, 409, "Ya usaste tus intentos. Tu mejor tiempo es el que cuenta.")
			return
		}
		j.Intentos = append(j.Intentos, Intento{N: len(j.Intentos) + 1, Inicio: s.ahora().UTC(), Tablero: generar(s.azar), Estado: "jugando", Encontradas: []string{}})
		s.guardar()
		responder(w, 200, s.vistaIntento(&j.Intentos[len(j.Intentos)-1]))
	})

	// Valida una selección (primera y última letra, en cualquier orden).
	mux.HandleFunc("POST /api/marcar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
			F1    int    `json:"f1"`
			C1    int    `json:"c1"`
			F2    int    `json:"f2"`
			C2    int    `json:"c2"`
		}
		if err := leerJSON(r, &in, 1024); err != nil || !dentro(in.F1) || !dentro(in.C1) || !dentro(in.F2) || !dentro(in.C2) {
			fallo(w, 400, "Selección no válida.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		i := s.jugador(in.Token)
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		j := &s.e.Jugadores[i]
		s.vencer(j)
		a := actual(j)
		if a == nil {
			if n := len(j.Intentos); n > 0 && j.Intentos[n-1].Estado == "vencido" {
				fallo(w, 409, fmt.Sprintf("Este intento venció (más de %d minutos).", s.e.Config.VenceMin))
				return
			}
			fallo(w, 409, "No tienes un intento en curso.")
			return
		}
		if s.terminado() {
			fallo(w, 409, "El concurso ya cerró. Gracias por jugar.")
			return
		}
		out := map[string]any{"encontrada": false, "total": len(a.Tablero.Palabras)}
		hallada := ""
		ya := false
		for _, u := range a.Tablero.Palabras {
			f2, c2 := u.fin()
			ida := u.F == in.F1 && u.C == in.C1 && f2 == in.F2 && c2 == in.C2
			vuelta := u.F == in.F2 && u.C == in.C2 && f2 == in.F1 && c2 == in.C1
			if !ida && !vuelta {
				continue
			}
			for _, e := range a.Encontradas {
				if e == u.Palabra {
					ya = true
				}
			}
			if !ya {
				hallada = u.Palabra
				out["f1"], out["c1"], out["f2"], out["c2"] = u.F, u.C, f2, c2
			}
			break
		}
		switch {
		case ya:
			out["ya"] = true
		case hallada == "":
			a.Fallos++
			if a.Fallos > topeFallos {
				a.Estado = "invalido"
				a.Fin = s.ahora().UTC()
				out["anulado"] = true
				out["mensaje"] = "Demasiadas selecciones equivocadas: este intento no cuenta."
				out["intentos_restantes"] = max(0, s.e.Config.Intentos-len(j.Intentos))
			}
		default:
			a.Encontradas = append(a.Encontradas, hallada)
			out["encontrada"] = true
			out["palabra"] = hallada
			out["significado"] = significado(hallada)
		}
		out["encontradas"] = len(a.Encontradas)
		if len(a.Encontradas) == len(a.Tablero.Palabras) {
			// Las 8: el tiempo lo pone el servidor.
			a.Fin = s.ahora().UTC()
			a.Ms = a.Fin.Sub(a.Inicio).Milliseconds()
			out["terminado"] = true
			out["ms"] = a.Ms
			if a.Ms < s.e.Config.MinimoMs {
				a.Estado = "invalido"
				out["valido"] = false
				out["mensaje"] = fmt.Sprintf("Tiempo imposible (menos de %d s): este intento no cuenta.", s.e.Config.MinimoMs/1000)
			} else {
				a.Estado = "terminado"
				s.e.Partidas++
				out["valido"] = true
				if j.MejorMs == 0 || a.Ms < j.MejorMs {
					j.MejorMs, j.MejorEn = a.Ms, a.Fin
					out["record"] = true
				}
			}
			out["mejor_ms"] = j.MejorMs
			out["puesto"] = s.puestoDe(j.ID)
			out["intentos_restantes"] = max(0, s.e.Config.Intentos-len(j.Intentos))
		}
		s.guardar()
		responder(w, 200, out)
	})

	// Abandona el intento en curso (cuenta como usado).
	mux.HandleFunc("POST /api/rendirse", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		i := s.jugador(in.Token)
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		j := &s.e.Jugadores[i]
		s.vencer(j)
		if a := actual(j); a != nil {
			a.Estado = "abandonado"
			a.Fin = s.ahora().UTC()
			s.guardar()
		}
		responder(w, 200, s.mio(i))
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
	// Vista del admin: nombres completos y códigos, pero sin los tableros.
	estadoAdmin := func() map[string]any {
		jug := make([]map[string]any, 0, len(s.e.Jugadores))
		for _, j := range s.e.Jugadores {
			hist := make([]map[string]any, 0, len(j.Intentos))
			for _, in := range j.Intentos {
				hist = append(hist, map[string]any{"n": in.N, "estado": in.Estado, "ms": in.Ms, "encontradas": len(in.Encontradas), "fallos": in.Fallos, "inicio": in.Inicio})
			}
			jug = append(jug, map[string]any{"id": j.ID, "nombre": j.Nombre, "ip": j.IP, "creadoEn": j.CreadoEn, "mejorMs": j.MejorMs,
				"excluido": s.e.Config.excluido(j.Nombre), "intentos": hist})
		}
		return map[string]any{
			"config": s.e.Config, "cerrado": s.terminado(), "cerradoEn": s.e.CerradoEn, "partidas": s.e.Partidas,
			"jugadores": jug, "ganadores": s.e.Ganadores, "ahora": s.ahora().UTC(),
		}
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/config", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Cierre    *string   `json:"cierre"`
			Premios   *[]int    `json:"premios"`
			Intentos  *int      `json:"intentos"`
			MinimoMs  *int64    `json:"minimo_ms"`
			VenceMin  *int      `json:"vence_min"`
			Excluidos *[]string `json:"excluidos"`
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
		if in.Intentos != nil {
			c.Intentos = *in.Intentos
		}
		if in.MinimoMs != nil {
			c.MinimoMs = *in.MinimoMs
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
				fallo(w, 400, "cierre debe ser RFC3339 (p. ej. 2026-11-01T21:00:00-05:00) o vacío.")
				return
			}
		}
		premiosOK := len(c.Premios) >= 1 && len(c.Premios) <= 20
		for _, d := range c.Premios {
			premiosOK = premiosOK && d >= 1 && d <= 100
		}
		if !premiosOK || c.Intentos < 1 || c.Intentos > 20 || c.MinimoMs < 0 || c.MinimoMs > 600_000 || c.VenceMin < 1 || c.VenceMin > 240 {
			fallo(w, 400, "premios: de 1 a 20, cada uno entre 1 y 100 %; intentos entre 1 y 20; minimo_ms entre 0 y 600 000; vence_min entre 1 y 240.")
			return
		}
		s.e.Config = c
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	// Cierra el concurso y entrega los premios (una sola vez).
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
		s.e.Siguiente, s.e.Partidas = 0, 0
		s.e.Cerrado, s.e.CerradoEn = false, time.Time{}
		s.porIP = map[string]int{}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	return mux
}

// Configuración con la que nace el estado; después manda lo que edite el
// admin. Los excluidos son los ganadores de Claude Code PRO: la lista de
// Árbitro más sus ganadores del 50 % (con variantes cortas del nombre).
func configInicial() Config {
	return Config{
		Cierre: "", Premios: []int{100}, Intentos: 3, MinimoMs: 15_000, VenceMin: 20,
		Excluidos: []string{
			"Jack Castillo", "Gian Grobert", "Gian Mamani", "Raul Gamboa", "Mario Ccallo", "Mario Callo",
			"Merlin Requejo", "David Requejo", "Jhon Perez Medrano", "Jhon Perez", "John Perez Medrano",
			"Paul Huaman", "Arnold Morales", "Carlos Saavedra", "Ines Jaimes",
			// Ganadores del 50 % en Árbitro (27-10-2026).
			"Hector Javier Limahuaya Adco", "Hector Limahuaya", "Alex Mesias Diaz Toro", "Alex Diaz", "Alex Mesias",
			"David Jefferson", "Rashel Poma", "Nicolle Esquivel", "Auner Llamo", "Vitmar Aliaga", "Jhon Dilmer",
			"J0RDAN CARLOS", "Jordan Carlos",
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
		puerto = "18585"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	go s.vigilarCierre(20 * time.Second)
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("sopa de letras IA en :%s (%d intentos, premios %v, cierre %q, %d jugadores)",
		puerto, s.e.Config.Intentos, s.e.Config.Premios, s.e.Config.Cierre, len(s.e.Jugadores))
	log.Fatal(srv.ListenAndServe())
}
