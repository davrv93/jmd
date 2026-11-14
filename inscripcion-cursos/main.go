// Inscripción especial a cursos de JMD Learning. La persona marca los cursos
// que quiere, deja su nombre, celular y correo, y la solicitud queda guardada
// para que el equipo la confirme. No muestra precios ni crea cuentas en el LMS.
package main

import (
	"crypto/subtle"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/mail"
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

const maxPorIP = 20

// Curso: una opción del formulario. Cada grupo de un curso es una opción.
type Curso struct {
	ID      string `json:"id"`
	Nombre  string `json:"nombre"`
	Area    string `json:"area"`
	Horario string `json:"horario"`
	Fechas  string `json:"fechas"`
}

var cursos = []Curso{
	{"claude-code-pro", "Claude Code PRO", "IA agéntica", "Sábados · 7:30–9:30 p. m.", "7, 14, 21 y 28 nov"},
	{"vibecoding-g8", "Programación agéntica (vibecoding) · Grupo 8", "IA agéntica", "7:30–9:30 p. m.", "Dom 8, mar 10 y mié 11 nov"},
	{"potencia-agentes", "Potencia tus agentes", "IA agéntica", "9:30–10:45 p. m.", "Dom 8, mar 10 y mié 11 nov"},
	{"deepseek-harness", "DeepSeek Harness", "IA agéntica", "Martes · 7:30–9:00 p. m.", "17 y 24 nov, 1 dic"},
	{"deepseek-harness-g2", "DeepSeek Harness · Grupo 2", "IA agéntica", "Jue 9:45–11:15 p. m. · Mié 9:15–10:45 p. m.", "Jue 12, mié 18 y 25 nov"},
	{"openmontage", "Crea contenido con OpenMontage", "IA agéntica", "Domingos · 9:00–10:00 p. m.", "15, 22, 29 nov y 6 dic"},
	{"bot-whatsapp-g2", "Bot de WhatsApp avanzado · Grupo 2", "IA agéntica", "Domingos · 7:30–8:15 p. m.", "15, 22 y 29 nov"},
	{"web-scraping", "Web scraping ético con IA", "Datos y backend", "Domingo · 3:00–6:00 p. m.", "8 nov · sesión única"},
	{"python-api", "Python: de cero a tu API", "Datos y backend", "Jueves · 7:30–9:30 p. m.", "12, 19 y 26 nov"},
	{"goldenquerys", "GoldenQuerys con IA", "Datos y backend", "Martes · 6:30–7:15 p. m.", "10 y 17 nov · por confirmar"},
	{"requerimientos-g1", "Ingeniería de Requerimientos · Grupo 1", "Requerimientos", "Lunes · 7:30–9:00 p. m.", "16, 23 y 30 nov"},
	{"requerimientos-g2", "Ingeniería de Requerimientos · Grupo 2", "Requerimientos", "Jueves · 7:30–9:00 p. m.", "3, 10 y 17 dic"},
	{"requerimientos-g3", "Ingeniería de Requerimientos · Grupo 3", "Requerimientos", "Domingos · 10:00–11:30 a. m.", "6, 13 y 20 dic"},
	{"dificil-manana", "¿Difícil de explicar? ¡No! · Domingo mañana", "Diseño", "Domingos · 10:00–11:30 a. m.", "15, 22 y 29 nov"},
	{"dificil-tarde", "¿Difícil de explicar? ¡No! · Domingo tarde", "Diseño", "Domingos · 5:30–7:00 p. m.", "15, 22 y 29 nov"},
	{"diseno-interfaces", "Diseño de interfaces", "Diseño", "Martes · 9:15–10:45 p. m.", "17 y 24 nov, 1 dic"},
	{"seguridad", "Seguridad en codificación con IA", "Seguridad y QA", "Miércoles · 7:30–9:00 p. m.", "18 y 25 nov, 2 dic"},
	{"qa-g2", "Pruebas y QA con IA · Grupo 2", "Seguridad y QA", "Domingo · 2:00–6:00 p. m.", "6 dic · sesión única"},
	{"excel-ia", "Excel + IA para Contabilidad, Tributación y Tesorería", "Negocio", "Por confirmar", "Fecha por confirmar"},
}

// Solicitud: lo que deja una persona. El celular la identifica: si vuelve, se actualiza.
type Solicitud struct {
	Nombre    string    `json:"nombre"`
	Telefono  string    `json:"telefono"`
	Correo    string    `json:"correo"`
	Cursos    []string  `json:"cursos"`
	IP        string    `json:"ip"`
	CreadoEn  time.Time `json:"creado_en"`
	EditadoEn time.Time `json:"editado_en"`
}

type Servidor struct {
	mu          sync.Mutex
	solicitudes []*Solicitud
	archivo     string
	clave       string
	porIP       map[string]int
}

var (
	espacios     = regexp.MustCompile(`\s+`)
	nombreValido = regexp.MustCompile(`^[\p{L}\p{M}0-9 .'\-]+$`)
	noDigitos    = regexp.MustCompile(`\D`)
	celularPeru  = regexp.MustCompile(`^9\d{8}$`)
)

func cursoPorID(id string) *Curso {
	for i := range cursos {
		if cursos[i].ID == id {
			return &cursos[i]
		}
	}
	return nil
}

func (s *Servidor) guardar() {
	b, _ := json.MarshalIndent(s.solicitudes, "", "  ")
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

func limpiarCelular(t string) string {
	t = noDigitos.ReplaceAllString(t, "")
	if len(t) == 11 && strings.HasPrefix(t, "51") {
		t = t[2:]
	}
	return t
}

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}

type Pedido struct {
	Nombre   string   `json:"nombre"`
	Telefono string   `json:"telefono"`
	Correo   string   `json:"correo"`
	Cursos   []string `json:"cursos"`
	Sitio    string   `json:"sitio"` // trampa para bots: el formulario la deja vacía
}

// validar limpia el pedido y devuelve el mensaje de error para la persona.
func validar(p *Pedido) string {
	p.Nombre = strings.TrimSpace(espacios.ReplaceAllString(p.Nombre, " "))
	p.Telefono = limpiarCelular(p.Telefono)
	p.Correo = strings.ToLower(strings.TrimSpace(p.Correo))
	if n := utf8.RuneCountInString(p.Nombre); n < 3 || n > 80 || !nombreValido.MatchString(p.Nombre) || esOfensivo(p.Nombre) {
		return "Escribe tu nombre y apellido."
	}
	if !celularPeru.MatchString(p.Telefono) {
		return "Escribe tu celular de 9 dígitos."
	}
	if a, err := mail.ParseAddress(p.Correo); err != nil || a.Address != p.Correo || len(p.Correo) > 120 {
		return "Escribe un correo válido."
	}
	vistos, elegidos := map[string]bool{}, []string{}
	for _, id := range p.Cursos {
		if cursoPorID(id) != nil && !vistos[id] {
			vistos[id] = true
			elegidos = append(elegidos, id)
		}
	}
	if len(elegidos) == 0 {
		return "Marca al menos un curso."
	}
	p.Cursos = elegidos
	return ""
}

func (s *Servidor) inscribir(p Pedido, ip string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	ahora := time.Now().UTC()
	for _, x := range s.solicitudes {
		if x.Telefono == p.Telefono {
			x.Nombre, x.Correo, x.Cursos, x.EditadoEn = p.Nombre, p.Correo, p.Cursos, ahora
			s.guardar()
			return ""
		}
	}
	if s.porIP[ip] >= maxPorIP {
		return "Demasiadas inscripciones desde esta conexión. Escríbenos por WhatsApp."
	}
	s.porIP[ip]++
	s.solicitudes = append(s.solicitudes, &Solicitud{Nombre: p.Nombre, Telefono: p.Telefono, Correo: p.Correo, Cursos: p.Cursos, IP: ip, CreadoEn: ahora, EditadoEn: ahora})
	s.guardar()
	return ""
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	return subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Clave")), []byte(s.clave)) == 1
}

func (s *Servidor) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	archivos := http.FileServerFS(web)
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Robots-Tag", "noindex")
		archivos.ServeHTTP(w, r)
	})
	mux.HandleFunc("GET /api/cursos", func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, cursos)
	})
	mux.HandleFunc("POST /api/inscribir", func(w http.ResponseWriter, r *http.Request) {
		var p Pedido
		r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			fallo(w, 400, "No pude leer el formulario.")
			return
		}
		if p.Sitio != "" { // un bot: se le contesta bien y no se guarda
			responder(w, 200, map[string]bool{"ok": true})
			return
		}
		if msg := validar(&p); msg != "" {
			fallo(w, 400, msg)
			return
		}
		if msg := s.inscribir(p, ipDe(r)); msg != "" {
			fallo(w, 429, msg)
			return
		}
		responder(w, 200, map[string]bool{"ok": true})
	})
	mux.HandleFunc("GET /api/admin/solicitudes", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			fallo(w, 401, "Clave incorrecta.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.solicitudes)
	})
	mux.HandleFunc("GET /api/admin/csv", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			fallo(w, 401, "Clave incorrecta.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=inscripciones.csv")
		fmt.Fprintln(w, "nombre,celular,correo,cursos,hora")
		for _, x := range s.solicitudes {
			nombres := make([]string, 0, len(x.Cursos))
			for _, id := range x.Cursos {
				if c := cursoPorID(id); c != nil {
					nombres = append(nombres, c.Nombre)
				}
			}
			fmt.Fprintf(w, "%q,%s,%q,%q,%s\n", x.Nombre, x.Telefono, x.Correo, strings.Join(nombres, " | "), x.EditadoEn.Format(time.RFC3339))
		}
	})
	return mux
}

func main() {
	clave := os.Getenv("INSCRIPCION_CLAVE")
	if len(clave) < 12 {
		log.Fatal("INSCRIPCION_CLAVE debe tener al menos 12 caracteres")
	}
	dir := os.Getenv("INSCRIPCION_DATOS")
	if dir == "" {
		dir = "datos"
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{archivo: filepath.Join(dir, "solicitudes.json"), clave: clave, porIP: map[string]int{}}
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.solicitudes); err != nil {
			log.Fatal(err)
		}
	}
	for _, x := range s.solicitudes {
		s.porIP[x.IP]++
	}
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18650"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("inscripción especial en :%s (%d solicitudes)", puerto, len(s.solicitudes))
	log.Fatal(srv.ListenAndServe())
}
