// Ruleta del monito: inscripción con descuento al taller «Laboratorio de caos ·
// Suelta al monito» de JMD Learning (mar 17-11-2026, 7:30–9:00 p. m., Lima).
//
// La persona pulsa «Girar», escribe nombre, celular y si quiere certificado, y
// la ruleta le da un descuento sobre su precio (S/ 15 el taller, S/ 25 con
// certificado). El servidor decide el premio con topes estrictos: 10 «gratis»
// y 2 de 90 %; el resto sale 30, 35 o 40 %. Luego la página la lleva a
// WhatsApp con su código y el instructor confirma la inscripción a mano en el
// panel (/admin).
package main

import (
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"math/big"
	"mime"
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

func init() { _ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8") }

// Precios en céntimos para no arrastrar decimales.
const (
	precioTaller      = 1500
	precioCertificado = 2500
)

// Premio: Tope 0 = sin tope. Peso = probabilidad relativa mientras quede stock.
type Premio struct {
	ID        string `json:"id"`
	Nombre    string `json:"nombre"`
	Descuento int    `json:"descuento"` // porcentaje
	Tope      int    `json:"tope"`
	Peso      int    `json:"peso"`
}

var premios = []Premio{
	{ID: "G100", Nombre: "¡Gratis!", Descuento: 100, Tope: 10, Peso: 28},
	{ID: "D90", Nombre: "90 % de descuento", Descuento: 90, Tope: 2, Peso: 6},
	{ID: "D40", Nombre: "40 % de descuento", Descuento: 40, Peso: 20},
	{ID: "D35", Nombre: "35 % de descuento", Descuento: 35, Peso: 22},
	{ID: "D30", Nombre: "30 % de descuento", Descuento: 30, Peso: 24},
}

// franjas: las casillas de la ruleta en sentido horario desde arriba. El
// navegador dibuja la misma lista; el servidor elige una casilla del premio.
var franjas = []string{"G100", "D30", "D35", "D40", "G100", "D30", "D90", "D35", "G100", "D40", "D30", "D35"}

func premioDe(id string) Premio {
	for _, p := range premios {
		if p.ID == id {
			return p
		}
	}
	return Premio{ID: id, Nombre: id}
}

// pagar: precio final en céntimos tras el descuento.
func pagar(base, descuento int) int { return base * (100 - descuento) / 100 }

func soles(c int) string {
	if c%100 == 0 {
		return fmt.Sprintf("S/ %d", c/100)
	}
	return fmt.Sprintf("S/ %d.%02d", c/100, c%100)
}

type Persona struct {
	ID          int       `json:"id"`
	Nombre      string    `json:"nombre"`
	Telefono    string    `json:"telefono"`
	Certificado bool      `json:"certificado"`
	Token       string    `json:"token"`
	IP          string    `json:"ip"`
	CreadoEn    time.Time `json:"creadoEn"`
	Casilla     int       `json:"casilla"`
	Premio      string    `json:"premio"`
	Base        int       `json:"base"`
	Paga        int       `json:"paga"`
	Codigo      string    `json:"codigo"`
	Confirmado  bool      `json:"confirmado"`
}

type Estado struct {
	Edicion   int       `json:"edicion"`
	Fase      string    `json:"fase"` // abierto | cerrado
	Personas  []Persona `json:"personas"`
	Siguiente int       `json:"siguiente"`
}

type Servidor struct {
	mu      sync.Mutex
	e       Estado
	archivo string
	clave   string
	cierre  time.Time
	porIP   map[string]int
	azar    func(n int) int
}

func azarSeguro(n int) int {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		panic(err)
	}
	return int(v.Int64())
}

func nuevoToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func (s *Servidor) entregados() map[string]int {
	out := map[string]int{}
	for _, p := range premios {
		out[p.ID] = 0
	}
	for _, p := range s.e.Personas {
		out[p.Premio]++
	}
	return out
}

// quedan: stock restante por premio (-1 = sin tope).
func (s *Servidor) quedan() map[string]int {
	ent := s.entregados()
	out := map[string]int{}
	for _, p := range premios {
		if p.Tope == 0 {
			out[p.ID] = -1
		} else {
			out[p.ID] = max(0, p.Tope-ent[p.ID])
		}
	}
	return out
}

// sortear: premio por peso entre los que aún tienen stock, y una casilla de ese premio.
func (s *Servidor) sortear() (premio string, casilla int) {
	q := s.quedan()
	total := 0
	for _, p := range premios {
		if q[p.ID] != 0 {
			total += p.Peso
		}
	}
	r := s.azar(total)
	for _, p := range premios {
		if q[p.ID] == 0 {
			continue
		}
		if r < p.Peso {
			premio = p.ID
			break
		}
		r -= p.Peso
	}
	var casillas []int
	for i, f := range franjas {
		if f == premio {
			casillas = append(casillas, i)
		}
	}
	return premio, casillas[s.azar(len(casillas))]
}

func codigo(premio, telefono string) string {
	return fmt.Sprintf("MONO-%s-%s-%s", strings.TrimLeft(premio, "DG"), telefono[len(telefono)-4:], strings.ToUpper(nuevoToken()[:4]))
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
var celularPeru = regexp.MustCompile(`^9\d{8}$`)

func limpiarNombre(n string) string { return strings.TrimSpace(espacios.ReplaceAllString(n, " ")) }

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
	return strings.Split(r.RemoteAddr, ":")[0]
}

func (s *Servidor) personaDe(token string) *Persona {
	if token == "" {
		return nil
	}
	for i := range s.e.Personas {
		if subtle.ConstantTimeCompare([]byte(s.e.Personas[i].Token), []byte(token)) == 1 {
			return &s.e.Personas[i]
		}
	}
	return nil
}

func (s *Servidor) porCelular(cel string) *Persona {
	for i := range s.e.Personas {
		if s.e.Personas[i].Telefono == cel {
			return &s.e.Personas[i]
		}
	}
	return nil
}

func ficha(p *Persona) map[string]any {
	return map[string]any{"id": p.ID, "nombre": p.Nombre, "telefono": p.Telefono, "certificado": p.Certificado,
		"casilla": p.Casilla, "premio": p.Premio, "premioNombre": premioDe(p.Premio).Nombre, "base": soles(p.Base),
		"paga": soles(p.Paga), "pagaCentimos": p.Paga, "codigo": p.Codigo, "confirmado": p.Confirmado, "hora": p.CreadoEn}
}

// abierto: fase abierta y antes del cierre (la hora de inicio de la clase).
func (s *Servidor) abierto(ahora time.Time) bool {
	return s.e.Fase == "abierto" && ahora.Before(s.cierre)
}

func (s *Servidor) publico(token string) map[string]any {
	out := map[string]any{
		"edicion": s.e.Edicion, "abierto": s.abierto(time.Now()), "cierre": s.cierre, "personas": len(s.e.Personas),
		"premios": premios, "franjas": franjas, "quedan": s.quedan(),
	}
	if yo := s.personaDe(token); yo != nil {
		out["yo"] = ficha(yo)
	}
	return out
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	c := r.Header.Get("X-Clave")
	return c != "" && subtle.ConstantTimeCompare([]byte(c), []byte(s.clave)) == 1
}

func leerJSON(r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 4096)).Decode(v)
}

// girar valida, guarda a la persona y sortea su premio al instante.
func (s *Servidor) girar(nombre, telefono string, certificado bool, ip string) (*Persona, string) {
	nombre = limpiarNombre(nombre)
	telefono = limpiarCelular(telefono)
	if n := utf8.RuneCountInString(nombre); n < 3 || n > 40 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") {
		return nil, "Escribe tu nombre y apellido (solo letras, de 3 a 40 caracteres)."
	}
	if esOfensivo(nombre) {
		return nil, "Escribe tu nombre real, sin palabras ofensivas."
	}
	if !celularPeru.MatchString(telefono) {
		return nil, "El celular debe tener 9 dígitos y empezar con 9, por ejemplo 987654321."
	}
	if s.porCelular(telefono) != nil {
		return nil, "Ese celular ya giró. Es un giro por persona."
	}
	s.e.Siguiente++
	pr, c := s.sortear()
	base := precioTaller
	if certificado {
		base = precioCertificado
	}
	p := Persona{ID: s.e.Siguiente, Nombre: nombre, Telefono: telefono, Certificado: certificado, Token: nuevoToken(), IP: ip,
		CreadoEn: time.Now().UTC(), Casilla: c, Premio: pr, Base: base, Paga: pagar(base, premioDe(pr).Descuento), Codigo: codigo(pr, telefono)}
	s.e.Personas = append(s.e.Personas, p)
	return &s.e.Personas[len(s.e.Personas)-1], ""
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
	mux.HandleFunc("GET /admin", pagina("admin.html"))
	mux.Handle("GET /static/", estaticos)

	mux.HandleFunc("GET /api/estado", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.publico(r.URL.Query().Get("t")))
	})

	mux.HandleFunc("POST /api/girar", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre      string `json:"nombre"`
			Telefono    string `json:"telefono"`
			Certificado bool   `json:"certificado"`
			Token       string `json:"t"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if yo := s.personaDe(in.Token); yo != nil {
			out := ficha(yo)
			out["t"], out["repetido"] = yo.Token, true
			responder(w, 200, out)
			return
		}
		if !s.abierto(time.Now()) {
			fallo(w, 409, "Las inscripciones con ruleta ya cerraron.")
			return
		}
		if p := s.porCelular(limpiarCelular(in.Telefono)); p != nil {
			out := ficha(p)
			out["repetido"] = true
			responder(w, 200, out)
			return
		}
		ip := ipDe(r)
		if s.porIP[ip] >= 8 {
			fallo(w, 429, "Demasiados giros desde esta conexión.")
			return
		}
		p, msg := s.girar(in.Nombre, in.Telefono, in.Certificado, ip)
		if msg != "" {
			fallo(w, 409, msg)
			return
		}
		s.porIP[ip]++
		s.guardar()
		out := ficha(p)
		out["t"] = p.Token
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
		out := s.publico("")
		out["fase"] = s.e.Fase
		out["entregados"] = s.entregados()
		lista := []map[string]any{}
		for i := range s.e.Personas {
			f := ficha(&s.e.Personas[i])
			f["ip"] = s.e.Personas[i].IP
			lista = append(lista, f)
		}
		out["personasLista"] = lista
		return out
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("GET /api/admin/csv", admin(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=ruleta-monito.csv")
		fmt.Fprintln(w, "orden,nombre,celular,certificado,premio,paga,codigo,confirmado,hora")
		for _, p := range s.e.Personas {
			fmt.Fprintf(w, "%d,%q,%s,%t,%q,%q,%s,%t,%s\n", p.ID, p.Nombre, p.Telefono, p.Certificado, premioDe(p.Premio).Nombre, soles(p.Paga), p.Codigo, p.Confirmado, p.CreadoEn.Format(time.RFC3339))
		}
	}))
	mux.HandleFunc("POST /api/admin/confirmar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID         int  `json:"id"`
			Confirmado bool `json:"confirmado"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		for i := range s.e.Personas {
			if s.e.Personas[i].ID == in.ID {
				s.e.Personas[i].Confirmado = in.Confirmado
			}
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/quitar", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ID int `json:"id"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		personas := []Persona{}
		for _, p := range s.e.Personas {
			if p.ID != in.ID {
				personas = append(personas, p)
			}
		}
		s.e.Personas = personas
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/fase", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Fase string `json:"fase"`
		}
		if err := leerJSON(r, &in); err != nil || (in.Fase != "abierto" && in.Fase != "cerrado") {
			fallo(w, 400, "Fase no válida.")
			return
		}
		s.e.Fase = in.Fase
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	return mux
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
	cierre, err := time.Parse(time.RFC3339, envO("SORTEO_CIERRE", "2026-11-17T19:30:00-05:00"))
	if err != nil {
		log.Fatal("SORTEO_CIERRE no válido")
	}
	if err := os.MkdirAll(datos, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{archivo: filepath.Join(datos, "estado.json"), clave: clave, cierre: cierre, porIP: map[string]int{}, azar: azarSeguro}
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
	} else {
		s.e = Estado{Edicion: 1, Fase: "abierto"}
		s.guardar()
	}
	for _, p := range s.e.Personas {
		s.porIP[p.IP]++
	}
	puerto := envO("PORT", "18712")
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("ruleta del monito en :%s (%d personas, cierre %s)", puerto, len(s.e.Personas), cierre.Format(time.RFC3339))
	log.Fatal(srv.ListenAndServe())
}

func envO(k, porDefecto string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return porDefecto
}
