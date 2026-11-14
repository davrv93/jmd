// Sorteo y matrícula de «Claude Code PRO».
//
// Sorteo: cada persona deja nombre y WhatsApp y recibe un número. A la hora
// de cierre se genera una semilla secreta y se publica su huella SHA-256 con
// la de la lista; a la hora del sorteo se revela la semilla y los ganadores
// salen de ella de forma determinista, así que cualquiera puede comprobarlo
// en su navegador. Nadie, ni el organizador, sabe quién gana antes.
//
// Matrícula: formulario con modalidad (individual o dúo), cursos adicionales
// en combo y código de premio. El pago es por Yape y lo confirma el
// organizador desde /admin; solo las matrículas pagadas cuentan como cupos
// tomados.
package main

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"embed"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/mail"
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

type Oferta struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	Fechas string `json:"fechas"`
	Precio int    `json:"precio"`
}

type Config struct {
	Titulo            string    `json:"titulo"`
	Apertura          time.Time `json:"apertura"`
	Cierre            time.Time `json:"cierre"`
	Sorteo            time.Time `json:"sorteo"`
	Cupos             int       `json:"cupos"`
	MatriculadosExtra int       `json:"matriculadosExtra"`
	Cursos            int       `json:"cursos"`
	Alumnos           int       `json:"alumnos"`
	Certificados      int       `json:"certificados"`
	Yape              string    `json:"yape"`
	WhatsApp          string    `json:"whatsapp"`
	PrecioIndividual  int       `json:"precioIndividual"`
	PrecioRegular     int       `json:"precioRegular"`
	PrecioDuo         int       `json:"precioDuo"`
	DescuentoCombo    int       `json:"descuentoCombo"` // % sobre el total al sumar otro curso
	// Ganadores de sorteos anteriores: no vuelven a participar. Se comparan
	// por nombre (sin tildes, por palabras) y por celular.
	Excluidos    []string `json:"excluidos"`
	ExcluidosTel []string `json:"excluidosTel"`
	// Premios de esta edición; vacío = los seis de la primera.
	Premios []Premio `json:"premios,omitempty"`
	Horario string   `json:"horario"`
	Ofertas []Oferta `json:"ofertas"`
}

type Premio struct {
	Titulo    string `json:"titulo"`
	Descuento int    `json:"descuento"` // 0 = sin código (vacante en otro curso)
	Referido  bool   `json:"referido"`
}

// Orden de los premios: el primer número que sale se lleva el primero.
var premios = []Premio{
	{Titulo: "Inscripción GRATIS + código del 50 % para un amigo", Descuento: 100, Referido: true},
	{Titulo: "Inscripción al 50 %", Descuento: 50},
	{Titulo: "Inscripción al 50 %", Descuento: 50},
	{Titulo: "Inscripción al 80 % de descuento", Descuento: 80},
	{Titulo: "Vacante en un curso por iniciar", Descuento: 0},
	{Titulo: "Vacante en un curso por iniciar", Descuento: 0},
}

type Participante struct {
	Numero   int       `json:"numero"`
	Nombre   string    `json:"nombre"`
	Telefono string    `json:"telefono"`
	Token    string    `json:"token"`
	IP       string    `json:"ip"`
	CreadoEn time.Time `json:"creadoEn"`
}

type Codigo struct {
	Codigo    string `json:"codigo"`
	Descuento int    `json:"descuento"`
	Numero    int    `json:"numero"`
	Usado     string `json:"usado,omitempty"` // id de la matrícula que lo usó
	// Código de varios usos (p. ej. 3 vacantes por Facebook): Cupos > 1 y los
	// ids de las matrículas que ya lo usaron en Usados. Con Cupos 0 o 1 manda Usado.
	Cupos  int      `json:"cupos,omitempty"`
	Usados []string `json:"usados,omitempty"`
}

func (c *Codigo) quedan() int {
	if c.Cupos > 1 {
		return c.Cupos - len(c.Usados)
	}
	if c.Usado != "" {
		return 0
	}
	return 1
}

func (c *Codigo) usar(id string) {
	if c.Cupos > 1 {
		c.Usados = append(c.Usados, id)
		return
	}
	c.Usado = id
}

func (c *Codigo) liberar(id string) {
	if c.Cupos > 1 {
		out := c.Usados[:0]
		for _, u := range c.Usados {
			if u != id {
				out = append(out, u)
			}
		}
		c.Usados = out
		return
	}
	if c.Usado == id {
		c.Usado = ""
	}
}

type Persona struct {
	Nombre   string `json:"nombre"`
	Email    string `json:"email"`
	Telefono string `json:"telefono"`
}

type Matricula struct {
	ID       string     `json:"id"`
	Token    string     `json:"token"`
	Titular  Persona    `json:"titular"`
	Amigo    *Persona   `json:"amigo,omitempty"`
	Extras   []string   `json:"extras"`
	Codigo   string     `json:"codigo,omitempty"`
	Total    int        `json:"total"`
	Estado   string     `json:"estado"` // pendiente | pagado | anulado
	IP       string     `json:"ip"`
	CreadoEn time.Time  `json:"creadoEn"`
	PagadoEn *time.Time `json:"pagadoEn,omitempty"`
}

type Estado struct {
	Edicion       int            `json:"edicion"`
	Config        Config         `json:"config"`
	Fase          string         `json:"fase"` // inscripcion | cerrado | sorteado
	Participantes []Participante `json:"participantes"`
	Siguiente     int            `json:"siguiente"`
	Semilla       string         `json:"semilla"`
	Compromiso    string         `json:"compromiso"`
	HuellaLista   string         `json:"huellaLista"`
	Resultado     []int          `json:"resultado"`
	Codigos       []Codigo       `json:"codigos"`
	Reaperturas   int            `json:"reaperturas"`
	CerradoEn     *time.Time     `json:"cerradoEn,omitempty"`
	SorteadoEn    *time.Time     `json:"sorteadoEn,omitempty"`
	Matriculas    []Matricula    `json:"matriculas"`
}

type Servidor struct {
	mu      sync.Mutex
	e       Estado
	archivo string
	clave   string
	porIP   map[string]int
	ahora   func() time.Time
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

// Código legible para dictarlo por WhatsApp: sin 0/O ni 1/I.
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

func sha(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

// Lista canónica: un número por línea, ordenado. Es lo que resume la huella y
// lo que recorre el sorteo. Ni nombres ni teléfonos: cada participante solo
// ve su propio resultado.
func listaCanonica(ps []Participante) string {
	orden := append([]Participante(nil), ps...)
	sort.Slice(orden, func(i, j int) bool { return orden[i].Numero < orden[j].Numero })
	var b strings.Builder
	for i, p := range orden {
		if i > 0 {
			b.WriteByte('\n')
		}
		fmt.Fprintf(&b, "%d", p.Numero)
	}
	return b.String()
}

// Ganadores: en cada ronda k, los 8 primeros bytes de SHA-256(semilla:k)
// eligen uno de los números que quedan (orden ascendente). Se repite en JS.
func elegirGanadores(semilla string, numeros []int, n int) []int {
	quedan := append([]int(nil), numeros...)
	sort.Ints(quedan)
	var out []int
	for k := 0; k < n && len(quedan) > 0; k++ {
		h := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", semilla, k)))
		x := binary.BigEndian.Uint64(h[:8])
		i := int(x % uint64(len(quedan)))
		out = append(out, quedan[i])
		quedan = append(quedan[:i], quedan[i+1:]...)
	}
	return out
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
var noDigitos = regexp.MustCompile(`\D`)

func limpiarNombre(n string) string {
	return strings.TrimSpace(espacios.ReplaceAllString(n, " "))
}

func clave(n string) string { return strings.ToLower(limpiarNombre(n)) }

var tildes = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n")

// ¿Es alguno de los ganadores anteriores? Cada entrada de la lista debe
// aparecer completa, palabra por palabra, dentro del nombre («carlos
// saavedra» casa con «Carlos Saavedra Vad», no con «Carlos Pérez»).
func (c Config) excluido(nombre, tel string) bool {
	for _, t := range c.ExcluidosTel {
		if t != "" && t == tel {
			return true
		}
	}
	n := " " + tildes.Replace(clave(nombre)) + " "
	for _, ex := range c.Excluidos {
		todas := true
		for _, pal := range strings.Fields(tildes.Replace(strings.ToLower(ex))) {
			if !strings.Contains(n, " "+pal+" ") {
				todas = false
				break
			}
		}
		if todas && strings.TrimSpace(ex) != "" {
			return true
		}
	}
	return false
}

func nombreOK(n string) bool {
	c := utf8.RuneCountInString(n)
	return c >= 3 && c <= 40 && nombreValido.MatchString(n) && strings.Contains(n, " ")
}

// Celular peruano: 9 dígitos que empiezan por 9, con o sin 51 delante.
func limpiarTelefono(t string) (string, bool) {
	d := noDigitos.ReplaceAllString(t, "")
	d = strings.TrimPrefix(d, "51")
	if len(d) != 9 || d[0] != '9' {
		return "", false
	}
	return d, true
}

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return strings.Split(r.RemoteAddr, ":")[0]
}

// Participan todos, pero los ganadores de sorteos anteriores no entran al
// premio: la huella y el sorteo se calculan solo sobre los elegibles.
func (s *Servidor) elegibles() []Participante {
	var out []Participante
	for _, p := range s.e.Participantes {
		if !s.e.Config.excluido(p.Nombre, p.Telefono) {
			out = append(out, p)
		}
	}
	return out
}

func (s *Servidor) premios() []Premio {
	if len(s.e.Config.Premios) > 0 {
		return s.e.Config.Premios
	}
	return premios
}

func (s *Servidor) matriculados() int {
	n := s.e.Config.MatriculadosExtra
	for _, m := range s.e.Matriculas {
		if m.Estado == "pagado" {
			n += m.personas()
		}
	}
	return n
}

func (m Matricula) personas() int {
	if m.Amigo != nil {
		return 2
	}
	return 1
}

func (s *Servidor) premioDe(numero int) (Premio, *Codigo, *Codigo, bool) {
	for i, n := range s.e.Resultado {
		if n != numero {
			continue
		}
		var propio, referido *Codigo
		for j := range s.e.Codigos {
			c := &s.e.Codigos[j]
			if c.Numero == numero && c.Descuento == s.premios()[i].Descuento && propio == nil {
				propio = c
			} else if c.Numero == numero {
				referido = c
			}
		}
		return s.premios()[i], propio, referido, true
	}
	return Premio{}, nil, nil, false
}

// Lo que ve cualquiera (sin tokens, IP ni teléfonos, y sin la semilla hasta
// el sorteo).
func (s *Servidor) publico(token string) map[string]any {
	e := s.e
	c := e.Config
	ofertas := c.Ofertas
	if ofertas == nil {
		ofertas = []Oferta{}
	}
	out := map[string]any{
		"edicion":      e.Edicion,
		"titulo":       c.Titulo,
		"fase":         e.Fase,
		"ahora":        s.ahora(),
		"apertura":     c.Apertura,
		"cierre":       c.Cierre,
		"sorteo":       c.Sorteo,
		"abierto":      e.Fase == "inscripcion" && !s.ahora().Before(c.Apertura),
		"total":        len(e.Participantes),
		"compromiso":   e.Compromiso,
		"huellaLista":  e.HuellaLista,
		"reaperturas":  e.Reaperturas,
		"premios":      s.premios(),
		"cupos":        c.Cupos,
		"matriculados": s.matriculados(),
		"trayectoria":  map[string]int{"cursos": c.Cursos, "alumnos": c.Alumnos, "certificados": c.Certificados},
		"yape":         c.Yape,
		"whatsapp":     c.WhatsApp,
		"precios":      map[string]int{"individual": c.PrecioIndividual, "regular": c.PrecioRegular, "duo": c.PrecioDuo, "descuentoCombo": c.DescuentoCombo},
		"horario":      c.Horario,
		"ofertas":      ofertas,
		"regla":        "No participan quienes ya ganaron un sorteo anterior.",
	}
	if e.Fase != "inscripcion" {
		lista := make([]int, 0, len(e.Participantes))
		for _, p := range s.elegibles() {
			lista = append(lista, p.Numero)
		}
		out["lista"] = lista
	}
	var yo *Participante
	for i := range e.Participantes {
		if token != "" && subtle.ConstantTimeCompare([]byte(e.Participantes[i].Token), []byte(token)) == 1 {
			yo = &e.Participantes[i]
		}
	}
	if yo != nil {
		out["yo"] = map[string]any{"numero": yo.Numero, "nombre": yo.Nombre, "elegible": !e.Config.excluido(yo.Nombre, yo.Telefono)}
	}
	if e.Fase == "sorteado" {
		out["semilla"] = e.Semilla
		out["resultado"] = e.Resultado
		// Los ganadores sí se publican con nombre (es el acta del sorteo);
		// los demás participantes siguen sin aparecer.
		gan := []map[string]any{}
		for i, n := range e.Resultado {
			for _, p := range e.Participantes {
				if p.Numero == n {
					gan = append(gan, map[string]any{"numero": n, "nombre": p.Nombre, "premio": s.premios()[i].Titulo, "descuento": s.premios()[i].Descuento})
				}
			}
		}
		out["ganadores"] = gan
		if yo != nil {
			if pr, propio, ref, ok := s.premioDe(yo.Numero); ok {
				mio := map[string]any{"premio": pr.Titulo}
				if propio != nil {
					mio["codigo"] = propio.Codigo
				}
				if ref != nil {
					mio["referido"] = ref.Codigo
				}
				out["gane"] = mio
			}
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

func (s *Servidor) cerrar() error {
	if s.e.Fase != "inscripcion" {
		return fmt.Errorf("Las inscripciones ya estaban cerradas.")
	}
	if len(s.e.Participantes) == 0 {
		return fmt.Errorf("No hay participantes.")
	}
	s.e.Semilla = nuevoToken() + nuevoToken()
	s.e.Compromiso = sha(s.e.Semilla)
	s.e.HuellaLista = sha(listaCanonica(s.elegibles()))
	ahora := s.ahora().UTC()
	s.e.CerradoEn = &ahora
	s.e.Fase = "cerrado"
	s.guardar()
	return nil
}

func (s *Servidor) sortear() error {
	if s.e.Fase != "cerrado" {
		return fmt.Errorf("Primero cierra las inscripciones.")
	}
	numeros := make([]int, 0, len(s.e.Participantes))
	for _, p := range s.elegibles() {
		numeros = append(numeros, p.Numero)
	}
	s.e.Resultado = elegirGanadores(s.e.Semilla, numeros, len(s.premios()))
	for i, n := range s.e.Resultado {
		pr := s.premios()[i]
		if pr.Descuento > 0 {
			s.e.Codigos = append(s.e.Codigos, Codigo{Codigo: nuevoCodigo(), Descuento: pr.Descuento, Numero: n})
		}
		if pr.Referido {
			s.e.Codigos = append(s.e.Codigos, Codigo{Codigo: nuevoCodigo(), Descuento: 50, Numero: n})
		}
	}
	ahora := s.ahora().UTC()
	s.e.SorteadoEn = &ahora
	s.e.Fase = "sorteado"
	s.guardar()
	return nil
}

// Reloj: cierra y sortea solo, a la hora fijada.
func (s *Servidor) reloj() {
	for range time.Tick(2 * time.Second) {
		s.mu.Lock()
		ahora := s.ahora()
		c := s.e.Config
		if s.e.Fase == "inscripcion" && !c.Cierre.IsZero() && !ahora.Before(c.Cierre) && len(s.e.Participantes) > 0 {
			if err := s.cerrar(); err == nil {
				log.Printf("cierre automático: %d participantes", len(s.e.Participantes))
			}
		}
		if s.e.Fase == "cerrado" && !c.Sorteo.IsZero() && !ahora.Before(c.Sorteo) {
			if err := s.sortear(); err == nil {
				log.Printf("sorteo automático: %v", s.e.Resultado)
			}
		}
		s.mu.Unlock()
	}
}

func (s *Servidor) buscarCodigo(codigo string) *Codigo {
	codigo = strings.ToUpper(strings.TrimSpace(codigo))
	for i := range s.e.Codigos {
		if s.e.Codigos[i].Codigo == codigo {
			return &s.e.Codigos[i]
		}
	}
	return nil
}

// Total en soles. El código de premio solo vale para la modalidad
// individual. Si se suma al menos otro curso, el descuento de combo se
// aplica sobre todo el pedido.
func (s *Servidor) calcular(duo bool, extras []string, cod *Codigo) (int, []string, error) {
	c := s.e.Config
	total := c.PrecioIndividual
	personas := 1
	if duo {
		total, personas = c.PrecioDuo, 2
		if cod != nil {
			return 0, nil, fmt.Errorf("Los códigos del sorteo solo valen para la inscripción individual, no para la promoción de 2 personas.")
		}
	}
	if cod != nil {
		total = total * (100 - cod.Descuento) / 100
	}
	visto := map[string]bool{}
	var ok []string
	for _, id := range extras {
		if visto[id] {
			continue
		}
		visto[id] = true
		encontrado := false
		for _, o := range c.Ofertas {
			if o.ID == id {
				total += o.Precio * personas
				ok = append(ok, id)
				encontrado = true
			}
		}
		if !encontrado {
			return 0, nil, fmt.Errorf("Ese curso ya no está en oferta.")
		}
	}
	if len(ok) > 0 && c.DescuentoCombo > 0 {
		total = (total*(100-c.DescuentoCombo) + 50) / 100
	}
	return total, ok, nil
}

func (s *Servidor) leerPersona(p *Persona) error {
	p.Nombre = limpiarNombre(p.Nombre)
	if !nombreOK(p.Nombre) {
		return fmt.Errorf("Escribe nombre y apellido (solo letras, de 3 a 40 caracteres).")
	}
	p.Email = strings.ToLower(strings.TrimSpace(p.Email))
	if a, err := mail.ParseAddress(p.Email); err != nil || a.Address != p.Email || len(p.Email) > 80 {
		return fmt.Errorf("Revisa el correo de %s: será su usuario del aula.", p.Nombre)
	}
	t, ok := limpiarTelefono(p.Telefono)
	if !ok {
		return fmt.Errorf("Escribe un celular de 9 dígitos para %s.", p.Nombre)
	}
	p.Telefono = t
	return nil
}

// Aviso opcional al bot de WhatsApp cuando se confirma un pago.
func avisar(url string, m Matricula) {
	if url == "" {
		return
	}
	b, _ := json.Marshal(m)
	cli := &http.Client{Timeout: 10 * time.Second}
	resp, err := cli.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		log.Printf("aviso %s: %v", m.ID, err)
		return
	}
	resp.Body.Close()
	log.Printf("aviso %s: %s", m.ID, resp.Status)
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
	mux.HandleFunc("GET /matricula", pagina("matricula.html"))
	mux.HandleFunc("GET /admin", pagina("admin.html"))
	mux.HandleFunc("GET /cortesia", pagina("cortesia.html"))
	mux.HandleFunc("GET /ganadores", pagina("ganadores.html"))
	mux.HandleFunc("GET /ceremonia", pagina("ceremonia.html"))
	mux.HandleFunc("GET /bienvenida", pagina("bienvenida.html"))
	mux.Handle("GET /static/", estaticos)

	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.publico(r.URL.Query().Get("t")))
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
		for _, p := range s.e.Participantes {
			if in.Token != "" && p.Token == in.Token {
				responder(w, 200, map[string]any{"numero": p.Numero, "nombre": p.Nombre, "t": p.Token})
				return
			}
		}
		if s.e.Fase != "inscripcion" {
			fallo(w, 409, "El sorteo ya se cerró.")
			return
		}
		if s.ahora().Before(s.e.Config.Apertura) {
			fallo(w, 409, "El sorteo abre a las "+s.e.Config.Apertura.In(lima).Format("3:04 p. m.")+".")
			return
		}
		nombre := limpiarNombre(in.Nombre)
		if !nombreOK(nombre) {
			fallo(w, 400, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres).")
			return
		}
		tel, ok := limpiarTelefono(in.Telefono)
		if !ok {
			fallo(w, 400, "Escribe tu celular de 9 dígitos: por ahí te avisamos si ganas.")
			return
		}
		for _, p := range s.e.Participantes {
			if clave(p.Nombre) == clave(nombre) || p.Telefono == tel {
				fallo(w, 409, "Ya tienes número. Si eres tú, entra desde el mismo navegador con el que participaste.")
				return
			}
		}
		ip := ipDe(r)
		if s.porIP[ip] >= 8 {
			fallo(w, 429, "Demasiadas participaciones desde esta conexión.")
			return
		}
		s.porIP[ip]++
		s.e.Siguiente++
		p := Participante{Numero: s.e.Siguiente, Nombre: nombre, Telefono: tel, Token: nuevoToken(), IP: ip, CreadoEn: s.ahora().UTC()}
		s.e.Participantes = append(s.e.Participantes, p)
		s.guardar()
		responder(w, 200, map[string]any{"numero": p.Numero, "nombre": p.Nombre, "t": p.Token})
	})

	mux.HandleFunc("GET /api/codigo", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		c := s.buscarCodigo(r.URL.Query().Get("c"))
		if c == nil || c.quedan() <= 0 {
			fallo(w, 404, "Ese código no existe o ya se usó.")
			return
		}
		responder(w, 200, map[string]any{"codigo": c.Codigo, "descuento": c.Descuento, "quedan": c.quedan()})
	})

	mux.HandleFunc("POST /api/matricula", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Titular Persona  `json:"titular"`
			Amigo   *Persona `json:"amigo"`
			Extras  []string `json:"extras"`
			Codigo  string   `json:"codigo"`
		}
		if err := leerJSON(r, &in, 8192); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if err := s.leerPersona(&in.Titular); err != nil {
			fallo(w, 400, err.Error())
			return
		}
		if in.Amigo != nil {
			if err := s.leerPersona(in.Amigo); err != nil {
				fallo(w, 400, err.Error())
				return
			}
			if in.Amigo.Email == in.Titular.Email {
				fallo(w, 400, "Cada persona necesita su propio correo.")
				return
			}
		}
		personas := 1
		if in.Amigo != nil {
			personas = 2
		}
		if s.matriculados()+personas > s.e.Config.Cupos {
			fallo(w, 409, "Ya no quedan cupos en este grupo. Escríbenos por WhatsApp para la lista de espera.")
			return
		}
		var cod *Codigo
		if strings.TrimSpace(in.Codigo) != "" {
			cod = s.buscarCodigo(in.Codigo)
			if cod == nil || cod.quedan() <= 0 {
				fallo(w, 400, "Ese código no existe o ya se usó.")
				return
			}
		}
		total, extras, err := s.calcular(in.Amigo != nil, in.Extras, cod)
		if err != nil {
			fallo(w, 400, err.Error())
			return
		}
		ip := ipDe(r)
		if s.porIP["m:"+ip] >= 6 {
			fallo(w, 429, "Demasiadas matrículas desde esta conexión.")
			return
		}
		s.porIP["m:"+ip]++
		m := Matricula{ID: fmt.Sprintf("M%03d", len(s.e.Matriculas)+1), Token: nuevoToken(), Titular: in.Titular, Amigo: in.Amigo,
			Extras: extras, Total: total, Estado: "pendiente", IP: ip, CreadoEn: s.ahora().UTC()}
		if cod != nil {
			cod.usar(m.ID)
			m.Codigo = cod.Codigo
		}
		s.e.Matriculas = append(s.e.Matriculas, m)
		s.guardar()
		responder(w, 200, map[string]any{"id": m.ID, "t": m.Token, "total": m.Total})
	})

	mux.HandleFunc("GET /api/matricula", func(w http.ResponseWriter, r *http.Request) {
		t := r.URL.Query().Get("t")
		s.mu.Lock()
		defer s.mu.Unlock()
		for _, m := range s.e.Matriculas {
			if t != "" && subtle.ConstantTimeCompare([]byte(m.Token), []byte(t)) == 1 {
				responder(w, 200, map[string]any{"id": m.ID, "total": m.Total, "estado": m.Estado, "titular": m.Titular.Nombre})
				return
			}
		}
		fallo(w, 404, "No encontramos esa matrícula.")
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
		out := s.publico("")
		parts := []map[string]any{}
		for _, p := range s.e.Participantes {
			parts = append(parts, map[string]any{"numero": p.Numero, "nombre": p.Nombre, "telefono": p.Telefono, "ip": p.IP, "creadoEn": p.CreadoEn})
		}
		out["participantes"] = parts
		out["codigos"] = s.e.Codigos
		out["matriculas"] = s.e.Matriculas
		out["config"] = s.e.Config
		return out
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/config", admin(func(w http.ResponseWriter, r *http.Request) {
		var c Config
		if err := leerJSON(r, &c, 32768); err != nil {
			fallo(w, 400, "Configuración no válida: "+err.Error())
			return
		}
		if c.Cupos < 1 || c.PrecioIndividual < 1 || c.Apertura.IsZero() || c.Cierre.Before(c.Apertura) || c.Sorteo.Before(c.Cierre) {
			fallo(w, 400, "Revisa cupos, precios y horas (apertura ≤ cierre ≤ sorteo).")
			return
		}
		s.e.Config = c
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	accion := func(f func() error) http.HandlerFunc {
		return admin(func(w http.ResponseWriter, r *http.Request) {
			if err := f(); err != nil {
				fallo(w, 409, err.Error())
				return
			}
			responder(w, 200, estadoAdmin())
		})
	}
	mux.HandleFunc("POST /api/admin/cerrar", accion(s.cerrar))
	mux.HandleFunc("POST /api/admin/sortear", accion(s.sortear))
	mux.HandleFunc("POST /api/admin/reabrir", accion(func() error {
		if s.e.Fase != "cerrado" {
			return fmt.Errorf("Solo se puede reabrir antes de sortear.")
		}
		// La semilla se descarta; la reapertura queda a la vista de todos.
		s.e.Semilla, s.e.Compromiso, s.e.HuellaLista, s.e.CerradoEn = "", "", "", nil
		s.e.Reaperturas++
		s.e.Fase = "inscripcion"
		s.guardar()
		return nil
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", accion(func() error {
		// Un sorteo nuevo con la misma configuración. Las matrículas se quedan.
		s.e = Estado{Edicion: s.e.Edicion + 1, Config: s.e.Config, Fase: "inscripcion", Matriculas: s.e.Matriculas, Codigos: s.e.Codigos}
		for k := range s.porIP {
			if !strings.HasPrefix(k, "m:") {
				delete(s.porIP, k)
			}
		}
		s.guardar()
		return nil
	}))
	// Código de cortesía fuera del sorteo (número 0 = no es de un ganador).
	mux.HandleFunc("POST /api/admin/codigo", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Descuento int `json:"descuento"`
			Cupos     int `json:"cupos"` // 0 o 1 = un solo uso
		}
		if err := leerJSON(r, &in, 1024); err != nil || in.Descuento < 1 || in.Descuento > 100 || in.Cupos < 0 || in.Cupos > 100 {
			fallo(w, 400, "Descuento entre 1 y 100; cupos entre 0 y 100.")
			return
		}
		c := Codigo{Codigo: nuevoCodigo(), Descuento: in.Descuento, Cupos: in.Cupos}
		s.e.Codigos = append(s.e.Codigos, c)
		s.guardar()
		responder(w, 200, c)
	}))
	mux.HandleFunc("POST /api/admin/quitar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Numero int `json:"numero"`
		}
		if err := leerJSON(r, &in, 1024); err != nil || s.e.Fase != "inscripcion" {
			fallo(w, 409, "Solo se puede quitar a alguien mientras las inscripciones están abiertas.")
			return
		}
		quedan := s.e.Participantes[:0]
		for _, p := range s.e.Participantes {
			if p.Numero != in.Numero {
				quedan = append(quedan, p)
			}
		}
		s.e.Participantes = quedan
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/pago", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID     string `json:"id"`
			Estado string `json:"estado"`
		}
		if err := leerJSON(r, &in, 1024); err != nil || (in.Estado != "pagado" && in.Estado != "pendiente" && in.Estado != "anulado") {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		for i := range s.e.Matriculas {
			m := &s.e.Matriculas[i]
			if m.ID != in.ID {
				continue
			}
			if in.Estado == "pagado" && m.Estado != "pagado" && s.matriculados()+m.personas() > s.e.Config.Cupos {
				fallo(w, 409, "Confirmarla supera los cupos. Sube los cupos primero si quieres aceptarla.")
				return
			}
			antes := m.Estado
			m.Estado = in.Estado
			if in.Estado == "pagado" {
				ahora := s.ahora().UTC()
				m.PagadoEn = &ahora
			} else {
				m.PagadoEn = nil
			}
			if in.Estado == "anulado" && m.Codigo != "" {
				if c := s.buscarCodigo(m.Codigo); c != nil {
					c.liberar(m.ID)
				}
			}
			s.guardar()
			if in.Estado == "pagado" && antes != "pagado" {
				go avisar(os.Getenv("SORTEO_AVISO_URL"), *m)
			}
			responder(w, 200, estadoAdmin())
			return
		}
		fallo(w, 404, "No existe esa matrícula.")
	}))
	return mux
}

// Configuración inicial: sorteo hoy (o en SORTEO_FECHA) a las 12:30, cierre
// 12:44 y resultado 12:45, hora de Lima.
func configInicial(ahora time.Time) Config {
	dia := ahora.In(lima)
	if f := os.Getenv("SORTEO_FECHA"); f != "" {
		if d, err := time.ParseInLocation("2006-01-02", f, lima); err == nil {
			dia = d
		}
	}
	a := func(h, m int) time.Time { return time.Date(dia.Year(), dia.Month(), dia.Day(), h, m, 0, 0, lima) }
	return Config{
		Titulo:   "Sorteo Claude Code PRO",
		Apertura: a(12, 30), Cierre: a(12, 44), Sorteo: a(12, 45),
		Cupos: 15, Yape: "986149476", WhatsApp: "51986149476",
		PrecioIndividual: 100, PrecioRegular: 120, PrecioDuo: 130, DescuentoCombo: 30,
		Horario: "Sábados 7, 14, 21 y 28 de noviembre, 7:30 – 9:30 p.m.",
		Ofertas: []Oferta{
			{ID: "agentes-ia-g6", Nombre: "Programación agéntica: Agentes de IA (grupo 6)", Fechas: "Dom. 1, mar. 3 y mié. 4 nov · 7:30 – 9:30 p.m.", Precio: 100},
			{ID: "bi-clickhouse", Nombre: "Dashboards y BI con IA (ClickHouse)", Fechas: "Domingos 22 y 29 nov · 3:00 – 5:00 p.m.", Precio: 80},
		},
	}
}

func main() {
	datos := os.Getenv("SORTEO_DATOS")
	if datos == "" {
		datos = "datos"
	}
	clave := os.Getenv("SORTEO_CLAVE")
	if len(clave) < 12 {
		log.Fatal("SORTEO_CLAVE debe tener al menos 12 caracteres")
	}
	if err := os.MkdirAll(datos, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{archivo: filepath.Join(datos, "estado.json"), clave: clave, porIP: map[string]int{}, ahora: time.Now}
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
	} else {
		s.e = Estado{Edicion: 1, Config: configInicial(time.Now()), Fase: "inscripcion"}
		s.guardar()
	}
	for _, p := range s.e.Participantes {
		s.porIP[p.IP]++
	}
	go s.reloj()
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18560"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("sorteo en :%s (%d participantes, fase %s)", puerto, len(s.e.Participantes), s.e.Fase)
	log.Fatal(srv.ListenAndServe())
}
