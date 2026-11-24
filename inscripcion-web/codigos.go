package main

// Códigos de inscripción: el instructor crea un código en el panel (máximo de cursos, usos, vencimiento y grupos
// permitidos) y la persona lo canjea en /cursos marcando los cursos que quiere.
//
//	POST /api/codigo/validar {codigo}                                   → {ok, max, todos, restantes, vence, permitidas}
//	POST /api/codigo/canje   {codigo, nombre, email, telefono, cohortes, web} → {ok, cursos, cuenta, enlace?, mensaje}
//
// Seguridad: el enlace de acceso solo vuelve en la respuesta cuando la cuenta es NUEVA. Si el correo ya tenía
// cuenta, se le suman los cursos y se le dice que entre con su correo: si no, cualquiera que escriba el correo
// de otra persona se quedaría con su cuenta. Para cuentas existentes, el instructor manda el enlace desde el
// registro de canjes del panel. Los usos se gastan solo si el LMS inscribió todo (candado + escritura a disco).

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"math/big"
	"net/http"
	"net/mail"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"time"
)

type Codigo struct {
	Codigo     string    `json:"codigo"`
	Max        int       `json:"max"` // 0 = todos los permitidos
	Usos       int       `json:"usos"`
	Usados     int       `json:"usados"`
	Vence      string    `json:"vence"`      // AAAA-MM-DD (vale hasta las 23:59 de Lima); vacío = no vence
	Permitidas []string  `json:"permitidas"` // vacío = todo el catálogo
	Nota       string    `json:"nota,omitempty"`
	Activo     bool      `json:"activo"`
	Creado     time.Time `json:"creado"`
}

type Canje struct {
	ID       string    `json:"id"`
	Codigo   string    `json:"codigo"`
	Fecha    time.Time `json:"fecha"`
	Nombre   string    `json:"nombre"`
	Email    string    `json:"email"`
	Telefono string    `json:"telefono"`
	Cohortes []string  `json:"cohortes"`
	Cuenta   string    `json:"cuenta"` // nueva | existente
	IP       string    `json:"ip,omitempty"`
}

var formatoCodigo = regexp.MustCompile(`^[A-Z0-9][A-Z0-9-]{3,31}$`)

func normalizarCodigo(c string) string {
	return strings.ToUpper(strings.Join(strings.Fields(c), ""))
}

// codigoAleatorio: JMD-XXXX-XXXX sin letras que se confunden (0/O, 1/I/L).
func codigoAleatorio() string {
	const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	b := []byte("JMD-XXXX-XXXX")
	for i := range b {
		if b[i] == 'X' {
			n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(abc))))
			b[i] = abc[n.Int64()]
		}
	}
	return string(b)
}

// ---------- persistencia ----------

func (s *Servidor) cargarCodigos() error {
	for nombre, dst := range map[string]any{"codigos.json": &s.codigos, "canjes.json": &s.canjes} {
		b, err := os.ReadFile(filepath.Join(s.datos, nombre))
		if errors.Is(err, fs.ErrNotExist) {
			continue
		}
		if err != nil {
			return err
		}
		if err := json.Unmarshal(b, dst); err != nil {
			return err
		}
	}
	return nil
}

func escribirJSON(ruta string, v any) error {
	b, err := json.MarshalIndent(v, "", " ")
	if err != nil {
		return err
	}
	tmp := ruta + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, ruta)
}

// guardarCodigos: llamar con s.cmu tomado.
func (s *Servidor) guardarCodigos() error {
	if err := escribirJSON(filepath.Join(s.datos, "codigos.json"), s.codigos); err != nil {
		return err
	}
	return escribirJSON(filepath.Join(s.datos, "canjes.json"), s.canjes)
}

func (s *Servidor) buscarCodigo(c string) *Codigo {
	for _, x := range s.codigos {
		if x.Codigo == c {
			return x
		}
	}
	return nil
}

// ---------- reglas ----------

// vigentes: el catálogo sin los grupos en vivo que ya terminaron.
func (s *Servidor) vigentes() []Entrada {
	ahora := s.ahora()
	out := []Entrada{}
	for _, e := range s.cfg.Catalogo {
		if e.Hasta != "" {
			if t, err := time.Parse(time.RFC3339, e.Hasta); err == nil && !ahora.Before(t) {
				continue
			}
		}
		out = append(out, e)
	}
	return out
}

// permitidas para un código: catálogo vigente ∩ su lista (vacía = todo).
func (s *Servidor) permitidas(c *Codigo) []Entrada {
	out := []Entrada{}
	for _, e := range s.vigentes() {
		if len(c.Permitidas) == 0 || slices.Contains(c.Permitidas, e.Cohorte) {
			out = append(out, e)
		}
	}
	return out
}

type errCodigo struct {
	status int
	codigo string
	msg    string
}

func (e *errCodigo) Error() string { return e.msg }

func fallaCodigo(status int, codigo, msg string) *errCodigo { return &errCodigo{status, codigo, msg} }

// revisar comprueba que el código sirve hoy (llamar con s.cmu tomado).
func (s *Servidor) revisar(c string) (*Codigo, *errCodigo) {
	k := s.buscarCodigo(normalizarCodigo(c))
	if k == nil || !k.Activo {
		return nil, fallaCodigo(404, "codigo_invalido", "Ese código no existe. Revisa que esté bien escrito.")
	}
	if k.Vence != "" {
		if d, err := time.ParseInLocation("2006-01-02", k.Vence, lima); err == nil && !s.ahora().Before(d.AddDate(0, 0, 1)) {
			return nil, fallaCodigo(410, "codigo_vencido", "Ese código ya venció.")
		}
	}
	if k.Usados >= k.Usos {
		return nil, fallaCodigo(410, "codigo_agotado", "Ese código ya se usó todas las veces que permitía.")
	}
	return k, nil
}

func maxEfectivo(k *Codigo, perm []Entrada) int {
	if k.Max <= 0 || k.Max > len(perm) {
		return len(perm)
	}
	return k.Max
}

// ---------- público ----------

func (s *Servidor) responderCodigo(w http.ResponseWriter, e *errCodigo) {
	responder(w, e.status, map[string]any{"ok": false, "error": e.codigo, "mensaje": e.msg})
}

// entradaJSON valida origen, tipo y límite por IP, y lee el cuerpo.
func (s *Servidor) entradaJSON(w http.ResponseWriter, r *http.Request, lim *limitador, dst any) bool {
	if !s.mismoOrigen(r) || !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		s.responderCodigo(w, fallaCodigo(403, "datos", "Envía el formulario desde la página de cursos."))
		return false
	}
	if !lim.permitir(ipCliente(r), s.ahora()) {
		s.responderCodigo(w, fallaCodigo(429, "limite", "Demasiados intentos. Espera una hora o escríbenos por WhatsApp."))
		return false
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8<<10)).Decode(dst); err != nil {
		s.responderCodigo(w, fallaCodigo(400, "datos", "No pudimos leer los datos enviados."))
		return false
	}
	return true
}

func (s *Servidor) apiCodigoValidar(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Codigo string `json:"codigo"`
	}
	if !s.entradaJSON(w, r, s.limValidar, &in) {
		return
	}
	s.cmu.Lock()
	defer s.cmu.Unlock()
	k, e := s.revisar(in.Codigo)
	if e != nil {
		s.responderCodigo(w, e)
		return
	}
	perm := s.permitidas(k)
	responder(w, 200, map[string]any{"ok": true, "codigo": k.Codigo, "max": maxEfectivo(k, perm), "todos": k.Max <= 0,
		"restantes": k.Usos - k.Usados, "vence": k.Vence, "permitidas": perm})
}

func (s *Servidor) apiCodigoCanje(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Codigo   string   `json:"codigo"`
		Nombre   string   `json:"nombre"`
		Email    string   `json:"email"`
		Telefono string   `json:"telefono"`
		Cohortes []string `json:"cohortes"`
		Web      string   `json:"web"`
	}
	if !s.entradaJSON(w, r, s.limCanje, &in) {
		return
	}
	if in.Web != "" { // trampa para bots
		responder(w, 200, map[string]any{"ok": true, "cursos": []any{}, "cuenta": "nueva", "mensaje": "Listo."})
		return
	}
	nombre := limpiar(in.Nombre, 80)
	email := strings.ToLower(strings.TrimSpace(in.Email))
	tel, telOK := telefonoPeru(in.Telefono)
	switch {
	case len(strings.Fields(nombre)) < 2:
		s.responderCodigo(w, fallaCodigo(400, "datos", "Escribe tu nombre completo: nombre y apellido."))
		return
	case !correoValido(email):
		s.responderCodigo(w, fallaCodigo(400, "datos", "El correo no es válido."))
		return
	case !telOK:
		s.responderCodigo(w, fallaCodigo(400, "datos", "Escribe tu número de WhatsApp (9 dígitos, por ejemplo 987 654 321)."))
		return
	}
	cod := normalizarCodigo(in.Codigo)
	if !s.limCodigo.permitir(cod, s.ahora()) {
		s.responderCodigo(w, fallaCodigo(429, "limite", "Ese código recibió muchos intentos seguidos. Espera unos minutos."))
		return
	}

	s.cmu.Lock()
	defer s.cmu.Unlock()
	k, e := s.revisar(cod)
	if e != nil {
		s.responderCodigo(w, e)
		return
	}
	perm := s.permitidas(k)
	elegidas := []Entrada{}
	for _, c := range in.Cohortes {
		c = strings.TrimSpace(c)
		i := slices.IndexFunc(perm, func(x Entrada) bool { return x.Cohorte == c })
		if i < 0 {
			s.responderCodigo(w, fallaCodigo(400, "curso_no_permitido", "Uno de los cursos marcados no entra con este código."))
			return
		}
		if !slices.ContainsFunc(elegidas, func(x Entrada) bool { return x.Cohorte == c }) {
			elegidas = append(elegidas, perm[i])
		}
	}
	if len(elegidas) == 0 {
		s.responderCodigo(w, fallaCodigo(400, "datos", "Marca al menos un curso."))
		return
	}
	if max := maxEfectivo(k, perm); len(elegidas) > max {
		s.responderCodigo(w, fallaCodigo(400, "demasiados_cursos", "Con este código puedes marcar hasta "+itoa(max)+" cursos."))
		return
	}
	cohortes := make([]string, len(elegidas))
	for i, x := range elegidas {
		cohortes[i] = x.Cohorte
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	res, status, err := s.lmsInscribir(ctx, email, nombre, cohortes, "/courses/")
	if err != nil {
		switch {
		case status == 409:
			s.responderCodigo(w, fallaCodigo(409, "datos", "Ese correo no se puede inscribir por aquí. Escríbenos por WhatsApp."))
		case status == 422:
			s.responderCodigo(w, fallaCodigo(409, "curso_no_disponible", "Uno de los cursos todavía no abre su aula. Quítalo o escríbenos por WhatsApp."))
		default:
			log.Printf("canje %s: %v", cod, err)
			s.responderCodigo(w, fallaCodigo(502, "servicio", "No pudimos inscribirte en este momento. Intenta de nuevo en unos minutos."))
		}
		return
	}
	cuenta := "existente"
	if res.Creado {
		cuenta = "nueva"
	}
	k.Usados++
	s.canjes = append(s.canjes, &Canje{ID: nuevoID(), Codigo: k.Codigo, Fecha: s.ahora(), Nombre: nombre, Email: email,
		Telefono: tel, Cohortes: cohortes, Cuenta: cuenta, IP: ipCliente(r)})
	if err := s.guardarCodigos(); err != nil {
		log.Printf("guardar códigos: %v", err) // el LMS ya inscribió: se informa el éxito igual
	}
	log.Printf("canje %s: %d grupo(s), cuenta %s", k.Codigo, len(cohortes), cuenta)
	out := map[string]any{"ok": true, "cursos": elegidas, "cuenta": cuenta}
	if res.Creado {
		out["enlace"] = res.Enlace
		out["mensaje"] = "¡Listo! Ya estás inscrito. Entra al aula con el botón (el enlace vale 7 días)."
	} else {
		out["mensaje"] = "Ya tienes cuenta: entra con tu correo; tus cursos ya aparecen."
	}
	responder(w, 200, out)
}

func correoValido(email string) bool {
	a, err := mail.ParseAddress(email)
	if err != nil || a.Address != email || len(email) > 120 {
		return false
	}
	at := strings.Index(email, "@")
	return at > 0 && strings.Contains(email[at:], ".")
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

// ---------- panel ----------

func (s *Servidor) apiCodigosLista(w http.ResponseWriter, r *http.Request) {
	s.cmu.Lock()
	defer s.cmu.Unlock()
	cods := append([]*Codigo{}, s.codigos...) // nunca null en el JSON
	slices.Reverse(cods)
	can := append([]*Canje{}, s.canjes...)
	slices.Reverse(can)
	responder(w, 200, map[string]any{"codigos": cods, "canjes": can, "catalogo": s.cfg.Catalogo, "vigentes": s.vigentes()})
}

func (s *Servidor) apiCodigoCrear(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Codigo     string   `json:"codigo"`
		Max        int      `json:"max"`
		Usos       int      `json:"usos"`
		Vence      string   `json:"vence"`
		Permitidas []string `json:"permitidas"`
		Nota       string   `json:"nota"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 16<<10)).Decode(&in); err != nil {
		fallo(w, 400, "Datos inválidos.")
		return
	}
	cod := normalizarCodigo(in.Codigo)
	s.cmu.Lock()
	defer s.cmu.Unlock()
	if cod == "" {
		for cod == "" || s.buscarCodigo(cod) != nil {
			cod = codigoAleatorio()
		}
	}
	switch {
	case !formatoCodigo.MatchString(cod):
		fallo(w, 400, "El código lleva de 4 a 32 letras, números o guiones.")
		return
	case s.buscarCodigo(cod) != nil:
		fallo(w, 409, "Ese código ya existe.")
		return
	case in.Max < 0 || in.Max > 50:
		fallo(w, 400, "Máximo de cursos: 0 (todos) a 50.")
		return
	}
	if in.Usos == 0 {
		in.Usos = 1
	}
	if in.Usos < 1 || in.Usos > 1000 {
		fallo(w, 400, "Usos: de 1 a 1000.")
		return
	}
	if in.Vence != "" {
		if _, err := time.ParseInLocation("2006-01-02", in.Vence, lima); err != nil {
			fallo(w, 400, "Vence: fecha AAAA-MM-DD.")
			return
		}
	}
	perm := []string{}
	for _, c := range in.Permitidas {
		c = strings.TrimSpace(c)
		if c == "" || slices.Contains(perm, c) {
			continue
		}
		if !slices.ContainsFunc(s.cfg.Catalogo, func(e Entrada) bool { return e.Cohorte == c }) {
			fallo(w, 400, "El grupo "+c+" no está en el catálogo.")
			return
		}
		perm = append(perm, c)
	}
	k := &Codigo{Codigo: cod, Max: in.Max, Usos: in.Usos, Vence: in.Vence, Permitidas: perm, Nota: limpiar(in.Nota, 200),
		Activo: true, Creado: s.ahora()}
	s.codigos = append(s.codigos, k)
	if err := s.guardarCodigos(); err != nil {
		s.codigos = s.codigos[:len(s.codigos)-1]
		fallo(w, 500, "No se pudo guardar.")
		return
	}
	log.Printf("código %s creado: max %d, usos %d", cod, k.Max, k.Usos)
	responder(w, 201, k)
}

func (s *Servidor) apiCodigoDesactivar(w http.ResponseWriter, r *http.Request) {
	s.cmu.Lock()
	defer s.cmu.Unlock()
	k := s.buscarCodigo(normalizarCodigo(r.PathValue("codigo")))
	if k == nil {
		fallo(w, 404, "No existe.")
		return
	}
	k.Activo = false
	_ = s.guardarCodigos()
	responder(w, 200, k)
}

// apiCanjeEnlace: el instructor genera un enlace nuevo para alguien que canjeó (sobre todo cuentas existentes).
func (s *Servidor) apiCanjeEnlace(w http.ResponseWriter, r *http.Request) {
	s.cmu.Lock()
	var c *Canje
	for _, x := range s.canjes {
		if x.ID == r.PathValue("id") {
			cp := *x
			c = &cp
		}
	}
	s.cmu.Unlock()
	if c == nil {
		fallo(w, 404, "No existe.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	res, _, err := s.lmsInscribir(ctx, c.Email, c.Nombre, c.Cohortes, "/courses/")
	if err != nil {
		fallo(w, 502, err.Error())
		return
	}
	responder(w, 200, map[string]any{"enlace": res.Enlace, "vence": res.Vence})
}
