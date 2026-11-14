// Ingreso directo al curso «Ready Set Go! Videojuegos con IA» de JMD Learning. La persona escribe su
// nombre y su correo y listo, sin WhatsApp:
//
//   - correo nuevo: se crea su cuenta de alumno en el LMS (registro normal, contraseña al azar que nadie ve),
//     se la deja solo en el grupo ready-set-go-1 y se le muestra un enlace de ingreso válido 2 años;
//   - correo que ya tiene cuenta: NUNCA se da enlace (cualquiera podría escribir el correo de otro y entrar
//     como él). Se le suma el grupo sin tocar lo demás y se le dice que entre con su clave de siempre.
//     Las cuentas del personal (admin, instructor) no se tocan.
//
// Cada inscripción queda en <datos>/inscritos.jsonl (sin enlaces ni claves) y se ve en admin.html con clave.
package main

import (
	"bufio"
	"context"
	"crypto/subtle"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/mail"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

var lima = time.FixedZone("Lima", -5*3600) // Perú no cambia de hora

func logf(f string, a ...any) { log.Printf(f, a...) }

// ---- Horario (el de lms/content/courses/ready-set-go y el de ready-set-go-web; lo vigila main_test.go) ----

type Sesion struct {
	ID      string `json:"id"`
	Tipo    string `json:"tipo"` // clase · hackathon
	Titulo  string `json:"titulo"`
	Inicio  string `json:"inicio"` // RFC 3339 con -05:00
	Minutos int    `json:"minutos"`
	// Rótulos ya armados en hora de Lima
	Dia   string `json:"dia"`   // JUE
	Num   string `json:"num"`   // 19
	Mes   string `json:"mes"`   // NOV
	Fecha string `json:"fecha"` // Jueves 19 de noviembre
	Horas string `json:"horas"` // 9:15 – 10:45 p. m.
}

func sesion(id, tipo, titulo, inicio string, minutos int) Sesion {
	t, err := time.Parse(time.RFC3339, inicio)
	if err != nil {
		panic(err)
	}
	t = t.In(lima)
	fin := t.Add(time.Duration(minutos) * time.Minute)
	dias := []string{"Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"}
	meses := []string{"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"}
	dia := dias[t.Weekday()]
	mes := meses[t.Month()-1]
	return Sesion{ID: id, Tipo: tipo, Titulo: titulo, Inicio: inicio, Minutos: minutos,
		Dia: strings.ToUpper(quitarTildes(string([]rune(dia)[:3]))), Num: strconv.Itoa(t.Day()), Mes: strings.ToUpper(mes[:3]),
		Fecha: fmt.Sprintf("%s %d de %s", dia, t.Day(), mes), Horas: rangoHoras(t, fin)}
}

func quitarTildes(s string) string {
	return strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u").Replace(s)
}

// rangoHoras: «9:15 – 10:45 p. m.» o «11:00 a. m. – 1:00 p. m.».
func rangoHoras(a, b time.Time) string {
	h := func(t time.Time) (string, string) {
		m := "a. m."
		if t.Hour() >= 12 {
			m = "p. m."
		}
		hh := t.Hour() % 12
		if hh == 0 {
			hh = 12
		}
		return fmt.Sprintf("%d:%02d", hh, t.Minute()), m
	}
	x, mx := h(a)
	y, my := h(b)
	if mx == my {
		return x + " – " + y + " " + my
	}
	return x + " " + mx + " – " + y + " " + my
}

var horario = []Sesion{
	sesion("rsg-01", "clase", "Tu primer juego con IA: Phaser 4 y JMD Play", "2026-11-19T21:15:00-05:00", 90),
	sesion("rsg-02", "clase", "Rivales que piensan: pathfinding, estados y puntos", "2026-11-26T21:15:00-05:00", 90),
	sesion("rsg-03", "clase", "Arte, animación y música con IA", "2026-12-03T21:15:00-05:00", 90),
	sesion("rsg-04", "clase", "Tu juego terminado y publicado", "2026-12-10T21:15:00-05:00", 120),
	sesion("hackathon", "hackathon", "Hackathon Ready Set Go!", "2026-12-13T13:30:00-05:00", 345),
}

// ---- Configuración ----

type Config struct {
	Grupo      string // ready-set-go-1
	Destino    string // a dónde lleva el enlace: /courses/ready-set-go/
	Publico    string // https://jmd-learn.online
	Semilla    []byte // semilla del aula del LMS
	Anios      int    // vigencia del enlace: 2 años de calendario
	MaxPorIP   int    // por hora
	MaxPorDia  int    // en total, por día de Lima
	ClavePanel string
	Lecciones  []string // para comprobar la semilla con enlaces firmados por el LMS
}

// ---- Registro de inscripciones ----

type Inscrito struct {
	Hora    time.Time `json:"hora"`
	Nombre  string    `json:"nombre"`
	Correo  string    `json:"correo"`
	Tipo    string    `json:"tipo"` // nueva · existente · ya-inscrito · personal · nueva-sin-grupo · enlace-reemitido
	Usuario string    `json:"usuario"`
	Cambio  bool      `json:"cambio"` // si se le sumó el grupo
}

type Servidor struct {
	cfg Config
	lms *LMS

	mu          sync.Mutex // serializa las inscripciones (pocas, y así no hay carreras de «buscar y crear»)
	archivo     string
	inscritos   []Inscrito
	creadas     map[string]bool        // ids de cuentas que creó este servicio
	porIP       map[string][]time.Time // intentos de la última hora
	fallosAdmin map[string][]time.Time

	semMu     sync.Mutex
	semEstado string
	semHora   time.Time
	ahora     func() time.Time
}

func nuevoServidor(cfg Config, lms *LMS, dir string) (*Servidor, error) {
	s := &Servidor{cfg: cfg, lms: lms, archivo: filepath.Join(dir, "inscritos.jsonl"), creadas: map[string]bool{},
		porIP: map[string][]time.Time{}, fallosAdmin: map[string][]time.Time{}, ahora: time.Now}
	f, err := os.Open(s.archivo)
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		var x Inscrito
		if json.Unmarshal(sc.Bytes(), &x) == nil {
			s.recordar(x)
		}
	}
	return s, sc.Err()
}

func (s *Servidor) recordar(x Inscrito) {
	s.inscritos = append(s.inscritos, x)
	if x.Tipo == "nueva" || x.Tipo == "nueva-sin-grupo" {
		s.creadas[x.Usuario] = true
	}
}

func (s *Servidor) anotar(x Inscrito) {
	s.recordar(x)
	b, _ := json.Marshal(x)
	f, err := os.OpenFile(s.archivo, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		logf("anotar: %v", err)
		return
	}
	defer f.Close()
	if _, err := f.Write(append(b, '\n')); err != nil {
		logf("anotar: %v", err)
	}
}

func mismoDiaLima(a, b time.Time) bool {
	a, b = a.In(lima), b.In(lima)
	return a.Year() == b.Year() && a.YearDay() == b.YearDay()
}

func (s *Servidor) inscritosHoy() int {
	n, hoy := 0, s.ahora()
	for _, x := range s.inscritos {
		if x.Tipo != "enlace-reemitido" && mismoDiaLima(x.Hora, hoy) {
			n++
		}
	}
	return n
}

// cabe registra un intento de la IP y dice si entra en el límite de la última hora.
func cabe(m map[string][]time.Time, clave string, max int, ahora time.Time) bool {
	vivos := m[clave][:0]
	for _, t := range m[clave] {
		if ahora.Sub(t) < time.Hour {
			vivos = append(vivos, t)
		}
	}
	if len(vivos) >= max {
		m[clave] = vivos
		return false
	}
	m[clave] = append(vivos, ahora)
	return true
}

// ---- Validación ----

var (
	espacios     = regexp.MustCompile(`\s+`)
	nombreValido = regexp.MustCompile(`^[\p{L}\p{M}0-9 .'\-]+$`)
)

type Pedido struct {
	Nombre string `json:"nombre"`
	Correo string `json:"correo"`
	Sitio  string `json:"sitio"` // trampa para bots: el formulario la deja vacía
}

// validar limpia el pedido y devuelve el mensaje de error para la persona.
func validar(p *Pedido) string {
	p.Nombre = strings.TrimSpace(espacios.ReplaceAllString(p.Nombre, " "))
	p.Correo = strings.ToLower(strings.TrimSpace(p.Correo))
	// El LMS acepta hasta 80 bytes: con tildes, 80 letras pueden no caber.
	if n := utf8.RuneCountInString(p.Nombre); n < 3 || n > 80 || len(strings.Fields(p.Nombre)) < 2 || len(p.Nombre) > 80 || !nombreValido.MatchString(p.Nombre) || !strings.ContainsFunc(p.Nombre, esLetra) {
		return "Escribe tu nombre y apellido (de 3 a 80 letras)."
	}
	if esOfensivo(p.Nombre) {
		return "Escribe tu nombre real: así saldrá en tu certificado."
	}
	if a, err := mail.ParseAddress(p.Correo); err != nil || a.Address != p.Correo || len(p.Correo) > 120 || !strings.Contains(p.Correo[strings.LastIndex(p.Correo, "@")+1:], ".") {
		return "Escribe un correo válido."
	}
	return ""
}

func esLetra(r rune) bool { return r > '9' && r != '\'' && r != '-' && r != '.' && r != ' ' }

func esPersonal(roles []string) bool {
	return slices.Contains(roles, "admin") || slices.Contains(roles, "instructor")
}

// ---- Inscripción ----

type Resultado struct {
	Estado  string   `json:"estado"` // nueva · existente · ya-inscrito
	Nombre  string   `json:"nombre"`
	Enlace  string   `json:"enlace,omitempty"`
	Vence   string   `json:"vence,omitempty"` // 10 de noviembre de 2028
	Horario []Sesion `json:"horario"`
}

type fallaUsuario struct {
	code int
	msg  string
}

func (f *fallaUsuario) Error() string { return f.msg }

const msgLMS = "No pudimos inscribirte en este momento. Inténtalo de nuevo en unos minutos."

func (s *Servidor) inscribir(ctx context.Context, p Pedido, ip string) (*Resultado, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ahora := s.ahora()
	if s.inscritosHoy() >= s.cfg.MaxPorDia {
		return nil, &fallaUsuario{429, "Hoy ya recibimos muchas inscripciones por aquí. Vuelve mañana, por favor."}
	}
	if !cabe(s.porIP, ip, s.cfg.MaxPorIP, ahora) {
		return nil, &fallaUsuario{429, "Demasiados intentos desde tu conexión. Vuelve a intentarlo en una hora."}
	}
	res := &Resultado{Nombre: p.Nombre, Horario: horario}
	u, err := s.lms.Buscar(ctx, porCorreo(p.Correo))
	if err != nil {
		return nil, err
	}
	if u == nil {
		if ok := s.semillaUsable(ctx); !ok {
			return nil, errors.New("semilla del aula sin comprobar o distinta: no se crean cuentas")
		}
		nu, err := s.lms.Registrar(ctx, p.Nombre, p.Correo, ip)
		switch {
		case errors.Is(err, errYaExiste):
			if u, err = s.lms.Buscar(ctx, porCorreo(p.Correo)); err != nil {
				return nil, err
			}
			if u == nil {
				return nil, errors.New("registro dijo 409 pero la cuenta no aparece")
			}
		case errors.Is(err, errLimiteLMS):
			return nil, &fallaUsuario{429, "Hay muchas inscripciones a la vez. Espera un minuto y vuelve a intentarlo."}
		case err != nil:
			return nil, err
		default:
			// Solo el grupo del curso: el registro pudo meterla en la cohorte por defecto del LMS (LMS_COHORT).
			err := s.lms.Asignar(ctx, nu.ID, []string{"student"}, []string{s.cfg.Grupo})
			if err != nil {
				err = s.lms.Asignar(ctx, nu.ID, []string{"student"}, []string{s.cfg.Grupo})
			}
			if err != nil {
				s.anotar(Inscrito{Hora: ahora.UTC(), Nombre: p.Nombre, Correo: p.Correo, Tipo: "nueva-sin-grupo", Usuario: nu.ID})
				return nil, fmt.Errorf("cuenta %s creada pero sin grupo: %w", nu.ID, err)
			}
			vence := ahora.AddDate(s.cfg.Anios, 0, 0)
			res.Estado = "nueva"
			res.Enlace = urlEnlace(s.cfg.Publico, tokenEnlace(s.cfg.Semilla, nu.ID, vence), s.cfg.Destino)
			res.Vence = fechaLarga(vence)
			s.anotar(Inscrito{Hora: ahora.UTC(), Nombre: p.Nombre, Correo: p.Correo, Tipo: "nueva", Usuario: nu.ID, Cambio: true})
			return res, nil
		}
	}
	// Correo con cuenta: jamás un enlace. Se le suma el grupo y entra como siempre.
	tipo, cambio := "existente", false
	switch {
	case esPersonal(u.Roles):
		tipo = "personal" // admin o instructor: no se toca nada
	default:
		if s.creadas[u.ID] {
			tipo = "ya-inscrito"
		}
		if !slices.Contains(u.Cohorts, s.cfg.Grupo) {
			roles := u.Roles
			if len(roles) == 0 {
				roles = []string{"student"}
			}
			if err := s.lms.Asignar(ctx, u.ID, roles, append(slices.Clone(u.Cohorts), s.cfg.Grupo)); err != nil {
				return nil, err
			}
			cambio = true
		}
	}
	s.anotar(Inscrito{Hora: ahora.UTC(), Nombre: p.Nombre, Correo: p.Correo, Tipo: tipo, Usuario: u.ID, Cambio: cambio})
	res.Estado = tipo
	if tipo == "personal" {
		res.Estado = "existente" // al público no se le dice qué tipo de cuenta es
	}
	return res, nil
}

func fechaLarga(t time.Time) string {
	meses := []string{"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"}
	t = t.In(lima)
	return fmt.Sprintf("%d de %s de %d", t.Day(), meses[t.Month()-1], t.Year())
}

// semillaUsable: antes de crear una cuenta cuyo único acceso es el enlace, comprobamos que la semilla firma igual
// que el LMS. «sin-alumnos» (no hay enlace del LMS con qué comparar) se acepta: lo prueba la primera inscripción.
func (s *Servidor) semillaUsable(ctx context.Context) bool {
	e := s.estadoSemilla(ctx)
	return e == "ok" || e == "sin-alumnos"
}

func (s *Servidor) estadoSemilla(ctx context.Context) string {
	s.semMu.Lock()
	defer s.semMu.Unlock()
	if s.semEstado == "ok" || s.semEstado == "distinta" || (s.semEstado != "" && time.Since(s.semHora) < 10*time.Minute) {
		return s.semEstado
	}
	e, err := s.lms.ComprobarSemilla(ctx, s.cfg.Semilla, s.cfg.Lecciones)
	if err != nil {
		logf("comprobar semilla: %v", err)
		return "error"
	}
	if e == "distinta" {
		logf("ALERTA: la semilla no firma igual que el LMS; no se crearán cuentas nuevas")
	}
	s.semEstado, s.semHora = e, time.Now()
	return e
}

// ---- HTTP ----

func responder(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fallo(w http.ResponseWriter, code int, msg string) {
	responder(w, code, map[string]string{"error": msg})
}

// ipDe: X-Real-IP lo pone el nginx del borde; el servicio solo escucha en 127.0.0.1.
func ipDe(r *http.Request) string {
	if ip := strings.TrimSpace(r.Header.Get("X-Real-IP")); ip != "" {
		return ip
	}
	if i := strings.LastIndex(r.RemoteAddr, ":"); i > 0 {
		return strings.Trim(r.RemoteAddr[:i], "[]")
	}
	return r.RemoteAddr
}

func (s *Servidor) esAdmin(w http.ResponseWriter, r *http.Request) bool {
	ip, ahora := ipDe(r), s.ahora()
	s.mu.Lock()
	defer s.mu.Unlock()
	recientes := 0
	for _, t := range s.fallosAdmin[ip] {
		if ahora.Sub(t) < time.Hour {
			recientes++
		}
	}
	if recientes >= 10 {
		fallo(w, 429, "Demasiados intentos. Espera una hora.")
		return false
	}
	if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Clave")), []byte(s.cfg.ClavePanel)) == 1 {
		return true
	}
	s.fallosAdmin[ip] = append(s.fallosAdmin[ip], ahora)
	fallo(w, 401, "Clave incorrecta.")
	return false
}

const csp = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"

func (s *Servidor) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	archivos := http.FileServerFS(web)
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Robots-Tag", "noindex")
		archivos.ServeHTTP(w, r)
	})
	mux.HandleFunc("GET /api/horario", func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, horario)
	})
	mux.HandleFunc("GET /api/salud", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()
		reg, err := s.lms.RegistroAbierto(ctx)
		out := map[string]any{"lms": err == nil, "registro": reg}
		_, errAdmin := s.lms.Usuarios(ctx)
		out["admin"] = errAdmin == nil
		out["semilla"] = s.estadoSemilla(ctx)
		code := 200
		if err != nil || !reg || errAdmin != nil || !s.semillaUsable(ctx) {
			code = 503
		}
		responder(w, code, out)
	})
	mux.HandleFunc("POST /api/inscribir", func(w http.ResponseWriter, r *http.Request) {
		var p Pedido
		r.Body = http.MaxBytesReader(w, r.Body, 4<<10)
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			fallo(w, 400, "No pude leer el formulario.")
			return
		}
		if p.Sitio != "" { // un bot: se le contesta algo inocuo y no se toca el LMS
			responder(w, 200, Resultado{Estado: "recibido", Horario: horario})
			return
		}
		if msg := validar(&p); msg != "" {
			fallo(w, 400, msg)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
		defer cancel()
		res, err := s.inscribir(ctx, p, ipDe(r))
		var fu *fallaUsuario
		switch {
		case errors.As(err, &fu):
			fallo(w, fu.code, fu.msg)
		case err != nil:
			logf("inscribir %s: %v", p.Correo, err)
			fallo(w, 503, msgLMS)
		default:
			w.Header().Set("Referrer-Policy", "no-referrer")
			responder(w, 200, res)
		}
	})
	mux.HandleFunc("GET /api/admin/inscritos", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(w, r) {
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, map[string]any{"inscritos": s.inscritos, "hoy": s.inscritosHoy(), "tope_dia": s.cfg.MaxPorDia})
	})
	mux.HandleFunc("GET /api/admin/csv", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(w, r) {
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=ready-set-go-inscritos.csv")
		w.Header().Set("Cache-Control", "no-store")
		fmt.Fprintln(w, "hora_lima,nombre,correo,tipo,usuario_lms,grupo_sumado")
		for _, x := range s.inscritos {
			fmt.Fprintf(w, "%s,%s,%s,%s,%s,%t\n", x.Hora.In(lima).Format("2006-01-02 15:04"), csvCampo(x.Nombre), csvCampo(x.Correo), x.Tipo, x.Usuario, x.Cambio)
		}
	})
	// Enlace nuevo para quien perdió el suyo: solo cuentas que creó este servicio y que no son del personal.
	// Lo pide el instructor desde el panel después de confirmar quién es la persona.
	mux.HandleFunc("POST /api/admin/enlace", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(w, r) {
			return
		}
		var in struct {
			Usuario string `json:"usuario"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Usuario == "" {
			fallo(w, 400, "Falta el usuario.")
			return
		}
		s.mu.Lock()
		creada := s.creadas[in.Usuario]
		s.mu.Unlock()
		if !creada {
			fallo(w, 403, "Solo se reemiten enlaces de cuentas creadas aquí.")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
		defer cancel()
		u, err := s.lms.Buscar(ctx, porID(in.Usuario))
		if err != nil {
			logf("reemitir: %v", err)
			fallo(w, 503, msgLMS)
			return
		}
		if u == nil || esPersonal(u.Roles) {
			fallo(w, 404, "Esa cuenta ya no existe o no es de alumno.")
			return
		}
		if !s.semillaUsable(ctx) {
			fallo(w, 503, "La semilla no coincide con la del LMS.")
			return
		}
		ahora := s.ahora()
		vence := ahora.AddDate(s.cfg.Anios, 0, 0)
		s.mu.Lock()
		s.anotar(Inscrito{Hora: ahora.UTC(), Nombre: u.Name, Correo: u.Email, Tipo: "enlace-reemitido", Usuario: u.ID})
		s.mu.Unlock()
		responder(w, 200, map[string]string{"enlace": urlEnlace(s.cfg.Publico, tokenEnlace(s.cfg.Semilla, u.ID, vence), s.cfg.Destino), "vence": fechaLarga(vence)})
	})
	return cabeceras(mux)
}

func csvCampo(v string) string {
	if v != "" && strings.ContainsRune("=+-@", rune(v[0])) {
		v = "'" + v // que Excel no lo tome como fórmula
	}
	return `"` + strings.ReplaceAll(v, `"`, `""`) + `"`
}

func cabeceras(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", csp)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		h.ServeHTTP(w, r)
	})
}

// ---- Arranque ----

func entorno(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func entero(k string, def int) int {
	if n, err := strconv.Atoi(os.Getenv(k)); err == nil && n > 0 {
		return n
	}
	return def
}

func main() {
	faltan := []string{}
	for _, k := range []string{"RSG_CLAVE", "RSG_LMS_CORREO", "RSG_LMS_CLAVE", "RSG_SEMILLA"} {
		if strings.TrimSpace(os.Getenv(k)) == "" {
			faltan = append(faltan, k)
		}
	}
	// Una de las dos vías para crear cuentas: código de invitación o grupo puente.
	if strings.TrimSpace(os.Getenv("RSG_LMS_INVITACION")) == "" && strings.TrimSpace(os.Getenv("RSG_LMS_PUENTE")) == "" {
		faltan = append(faltan, "RSG_LMS_INVITACION o RSG_LMS_PUENTE")
	}
	if len(faltan) > 0 {
		log.Fatalf("faltan variables: %s", strings.Join(faltan, ", ")) // solo los nombres, nunca valores
	}
	if len(os.Getenv("RSG_CLAVE")) < 12 {
		log.Fatal("RSG_CLAVE debe tener al menos 12 caracteres")
	}
	cfg := Config{
		Grupo:      entorno("RSG_GRUPO", "ready-set-go-1"),
		Destino:    entorno("RSG_DESTINO", "/courses/ready-set-go/"),
		Publico:    strings.TrimRight(entorno("RSG_LMS_PUBLICO", "https://jmd-learn.online"), "/"),
		Semilla:    []byte(os.Getenv("RSG_SEMILLA")),
		Anios:      entero("RSG_VIGENCIA_ANIOS", 2),
		MaxPorIP:   entero("RSG_MAX_IP_HORA", 5),
		MaxPorDia:  entero("RSG_MAX_DIA", 300),
		ClavePanel: os.Getenv("RSG_CLAVE"),
		Lecciones:  strings.Split(entorno("RSG_LECCIONES_SEMILLA", "rsg-01"), ","),
	}
	lms := &LMS{Base: entorno("RSG_LMS_URL", "http://127.0.0.1:8080"), Correo: os.Getenv("RSG_LMS_CORREO"),
		Clave: os.Getenv("RSG_LMS_CLAVE"), Invitacion: os.Getenv("RSG_LMS_INVITACION"), Puente: os.Getenv("RSG_LMS_PUENTE"), HC: cliente()}
	for _, k := range []string{"RSG_CLAVE", "RSG_LMS_CLAVE", "RSG_LMS_INVITACION", "RSG_SEMILLA"} {
		_ = os.Unsetenv(k)
	}
	dir := entorno("RSG_DATOS", "datos")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Fatal(err)
	}
	s, err := nuevoServidor(cfg, lms, dir)
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	if reg, err := lms.RegistroAbierto(ctx); err != nil || !reg {
		logf("AVISO: el LMS no acepta registro propio ahora (LMS_INVITE_CODE vacío o LMS caído): err=%v", err)
	}
	logf("semilla: %s", s.estadoSemilla(ctx))
	cancel()
	addr := entorno("RSG_ADDR", "127.0.0.1:18690")
	srv := &http.Server{Addr: addr, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 60 * time.Second}
	logf("ingreso Ready Set Go! en %s (grupo %s, %d registros)", addr, cfg.Grupo, len(s.inscritos))
	log.Fatal(srv.ListenAndServe())
}
