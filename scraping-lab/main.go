// Laboratorio de scraping JMD: sitio de práctica para el taller «Web scraping ético con IA»
// (lección ws-01 de JMD Learning). Todo es ficticio y se genera de forma determinista al arrancar:
// una tienda con 120 productos, una API con sesión (formulario con token CSRF, cookie y cabecera
// X-Lab-Token) y paginación por cursor, 200 archivos CSV para practicar una cola de descarga y un
// límite de pedidos por alumno (429 con Retry-After y, si se insiste, 403 temporal).
//
// El panel /scraping-lab/panel muestra en vivo, por apodo, cuántos pedidos hizo cada alumno, cuántos
// 429 y bloqueos recibió y cuántos archivos bajó. Nada se guarda en disco: reiniciar el contenedor
// deja el laboratorio en cero.
//
// Todas las rutas viven bajo /scraping-lab/ (igual en local y detrás de nginx, que no reescribe la ruta).
package main

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	mrand "math/rand/v2"
	"net"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed web
var webFS embed.FS

//go:embed kit
var kitFS embed.FS

const P = "/scraping-lab" // prefijo público

var lima = time.FixedZone("America/Lima", -5*3600)

// ---------- Datos ficticios ----------

type Producto struct {
	ID          int     `json:"id"`
	SKU         string  `json:"sku"`
	Nombre      string  `json:"nombre"`
	Categoria   string  `json:"categoria"`
	Precio      float64 `json:"precio"`
	Stock       int     `json:"stock"`
	Valoracion  float64 `json:"valoracion"`
	Resenas     int     `json:"resenas"`
	Marca       string  `json:"marca"`
	Descripcion string  `json:"descripcion"`
}

type Archivo struct {
	N      int    `json:"-"`
	Nombre string `json:"nombre"`
	URL    string `json:"url"`
	Bytes  int    `json:"bytes"`
	SHA256 string `json:"sha256"`
	datos  []byte
}

var (
	productos []Producto
	archivos  []Archivo
	porNombre = map[string]int{}
)

func generar() {
	r := mrand.New(mrand.NewPCG(2026, 1108))
	cats := map[string][]string{
		"Cocina":     {"Taza", "Olla", "Sartén", "Tabla de picar", "Termo", "Cucharón"},
		"Útiles":     {"Cuaderno", "Lapicero", "Mochila", "Resaltador", "Agenda", "Estuche"},
		"Tecnología": {"Audífonos", "Cargador", "Mouse", "Teclado", "Parlante", "Cable USB-C"},
		"Hogar":      {"Cojín", "Lámpara", "Manta", "Maceta", "Reloj de pared", "Organizador"},
		"Deporte":    {"Pelota", "Tomatodo", "Mat de yoga", "Soga", "Gorra", "Muñequera"},
	}
	orden := []string{"Cocina", "Útiles", "Tecnología", "Hogar", "Deporte"}
	adj := []string{"Andino", "Compacto", "Clásico", "Pro", "Lima", "Cusqueño", "Ligero", "Plus", "Mini", "Selva", "Eco", "Nazca"}
	colores := []string{"rojo", "azul", "verde", "negro", "turquesa", "mostaza", "lila", "blanco"}
	marcas := []string{"Cóndor", "Vicuña", "Totora", "Huarango", "Quinual", "Lúcuma"}
	for i := 1; i <= 120; i++ {
		c := orden[r.IntN(len(orden))]
		base := cats[c][r.IntN(len(cats[c]))]
		col := colores[r.IntN(len(colores))]
		p := Producto{
			ID: i, SKU: fmt.Sprintf("JMD-%04d", 1000+i*7),
			Nombre:     fmt.Sprintf("%s %s %s", base, adj[r.IntN(len(adj))], col),
			Categoria:  c,
			Precio:     float64(r.IntN(18000)+490) / 100,
			Stock:      r.IntN(60),
			Valoracion: float64(25+r.IntN(26)) / 10,
			Resenas:    r.IntN(400),
			Marca:      marcas[r.IntN(len(marcas))],
		}
		p.Descripcion = fmt.Sprintf("%s de la marca ficticia %s, color %s. Producto inventado para practicar scraping: no se vende ni existe.", base, p.Marca, col)
		productos = append(productos, p)
	}
	tiendas := []string{"Miraflores", "Surco", "Arequipa", "Trujillo", "Cusco", "Piura", "Huancayo", "Iquitos"}
	for n := 1; n <= 200; n++ {
		var b bytes.Buffer
		b.WriteString("fecha,tienda,producto_id,sku,cantidad,precio_unitario,total\n")
		filas := 15 + r.IntN(20)
		for k := 0; k < filas; k++ {
			p := productos[r.IntN(len(productos))]
			cant := 1 + r.IntN(5)
			d := time.Date(2026, time.Month(1+r.IntN(10)), 1+r.IntN(28), 0, 0, 0, 0, lima)
			fmt.Fprintf(&b, "%s,%s,%d,%s,%d,%.2f,%.2f\n", d.Format("2006-01-02"), tiendas[r.IntN(len(tiendas))], p.ID, p.SKU, cant, p.Precio, p.Precio*float64(cant))
		}
		nombre := fmt.Sprintf("reporte-%03d.csv", n)
		sum := sha256.Sum256(b.Bytes())
		archivos = append(archivos, Archivo{N: n, Nombre: nombre, URL: P + "/descargas/archivo/" + nombre, Bytes: b.Len(), SHA256: hex.EncodeToString(sum[:]), datos: b.Bytes()})
		porNombre[nombre] = n - 1
	}
}

// ---------- Configuración del límite ----------

type Limites struct {
	Pedidos    int           // pedidos permitidos por ventana
	Ventana    time.Duration // ventana deslizante
	Tolerancia int           // 429 que se aguantan en un minuto antes de bloquear
	Castigo    time.Duration // duración del bloqueo (403)
}

func envInt(k string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(k)); err == nil && v > 0 {
		return v
	}
	return def
}

// ---------- Estado por alumno ----------

type Alumno struct {
	Nick        string    `json:"nick"`
	Pedidos     int       `json:"pedidos"`
	OK          int       `json:"ok"`
	C429        int       `json:"c429"`
	C403        int       `json:"c403"`
	C500        int       `json:"c500"`
	Bloqueos    int       `json:"bloqueos"`
	Trampas     int       `json:"trampas"`
	Robots      int       `json:"robots"`
	Archivos    int       `json:"archivos"`
	Paginas     int       `json:"paginas"`
	ItemsAPI    int       `json:"items_api"`
	Login       bool      `json:"login"`
	UAOK        bool      `json:"ua_identificado"`
	UA          string    `json:"ua"`
	Primero     time.Time `json:"primero"`
	Ultimo      time.Time `json:"ultimo"`
	Estado      string    `json:"estado"`
	BloqueoHast time.Time `json:"bloqueado_hasta,omitempty"`

	marcas     []time.Time // pedidos dentro de la ventana
	mal        []time.Time // 429 del último minuto
	vistos     map[int]bool
	paginas    map[int]bool
	intentos   map[int]int
	ultimo429  time.Time
	ultimoMotv string
}

type Sesion struct {
	Nick   string
	Token  string
	Creada time.Time
}

type Lab struct {
	mu       sync.Mutex
	lim      Limites
	alumnos  map[string]*Alumno
	sesiones map[string]*Sesion // id de cookie → sesión
	pre      map[string]string  // cookie previa → token CSRF
	ahora    func() time.Time
	tpl      *template.Template
	kitZip   []byte
}

var nickRe = regexp.MustCompile(`[^a-z0-9_-]+`)

func limpiarNick(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ñ", "n", " ", "-").Replace(s)
	s = nickRe.ReplaceAllString(s, "")
	if len(s) > 24 {
		s = s[:24]
	}
	if len(s) < 2 {
		return ""
	}
	return s
}

func ipDe(r *http.Request) string {
	if v := r.Header.Get("X-Real-IP"); v != "" {
		return v
	}
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

// nickDe identifica al alumno: cabecera X-Alumno, ?alumno=, la sesión o la cookie lab_alumno.
// Sin apodo, cuenta como «anon-<huella de la IP>»: en el aula todos salen por la misma IP, por eso se pide apodo.
func (l *Lab) nickDe(r *http.Request) string {
	if n := limpiarNick(r.Header.Get("X-Alumno")); n != "" {
		return n
	}
	if n := limpiarNick(r.URL.Query().Get("alumno")); n != "" {
		return n
	}
	if c, err := r.Cookie("lab_sesion"); err == nil {
		l.mu.Lock()
		s := l.sesiones[c.Value]
		l.mu.Unlock()
		if s != nil {
			return s.Nick
		}
	}
	if c, err := r.Cookie("lab_alumno"); err == nil {
		if n := limpiarNick(c.Value); n != "" {
			return n
		}
	}
	h := sha256.Sum256([]byte("lab:" + ipDe(r)))
	return "anon-" + hex.EncodeToString(h[:3])
}

// uaIdentificado: un bot educado dice quién es y cómo contactarlo (correo o URL entre paréntesis).
func uaIdentificado(ua string) bool {
	l := strings.ToLower(ua)
	if l == "" || strings.HasPrefix(l, "python-httpx") || strings.HasPrefix(l, "python-requests") || strings.HasPrefix(l, "curl/") || strings.HasPrefix(l, "python-urllib") {
		return false
	}
	return strings.Contains(l, "@") || strings.Contains(l, "http") || strings.Contains(l, "contacto")
}

func (l *Lab) alumno(nick string) *Alumno {
	a := l.alumnos[nick]
	if a == nil {
		if len(l.alumnos) > 3000 { // tope de memoria: se olvida al más antiguo
			var viejo string
			var t time.Time
			for k, v := range l.alumnos {
				if viejo == "" || v.Ultimo.Before(t) {
					viejo, t = k, v.Ultimo
				}
			}
			delete(l.alumnos, viejo)
		}
		a = &Alumno{Nick: nick, Primero: l.ahora(), vistos: map[int]bool{}, paginas: map[int]bool{}, intentos: map[int]int{}}
		l.alumnos[nick] = a
	}
	return a
}

type veredicto struct {
	ok         bool
	codigo     int
	retryAfter int
	restantes  int
	reinicio   int
	hasta      time.Time
	motivo     string
}

// cobrar registra un pedido limitado y decide si pasa, si recibe 429 o si está bloqueado (403).
func (l *Lab) cobrar(a *Alumno, ua string) veredicto {
	now := l.ahora()
	a.Pedidos++
	a.Ultimo = now
	a.UA = ua
	if len(a.UA) > 120 {
		a.UA = a.UA[:120]
	}
	a.UAOK = uaIdentificado(ua)
	if now.Before(a.BloqueoHast) {
		a.C403++
		return veredicto{codigo: 403, retryAfter: int(a.BloqueoHast.Sub(now).Seconds()) + 1, hasta: a.BloqueoHast, motivo: a.ultimoMotv}
	}
	corte := now.Add(-l.lim.Ventana)
	k := 0
	for _, t := range a.marcas {
		if t.After(corte) {
			a.marcas[k] = t
			k++
		}
	}
	a.marcas = a.marcas[:k]
	if len(a.marcas) >= l.lim.Pedidos {
		a.C429++
		a.ultimo429 = now
		m1 := now.Add(-time.Minute)
		j := 0
		for _, t := range a.mal {
			if t.After(m1) {
				a.mal[j] = t
				j++
			}
		}
		a.mal = append(a.mal[:j], now)
		if len(a.mal) > l.lim.Tolerancia {
			l.bloquear(a, "Seguiste pidiendo después de recibir "+strconv.Itoa(len(a.mal))+" respuestas 429 en un minuto, sin esperar lo que decía Retry-After.")
			a.C403++
			return veredicto{codigo: 403, retryAfter: int(l.lim.Castigo.Seconds()), hasta: a.BloqueoHast, motivo: a.ultimoMotv}
		}
		espera := a.marcas[0].Add(l.lim.Ventana).Sub(now)
		ra := int(espera.Seconds()) + 1
		return veredicto{codigo: 429, retryAfter: ra, reinicio: ra}
	}
	a.marcas = append(a.marcas, now)
	reinicio := int(a.marcas[0].Add(l.lim.Ventana).Sub(now).Seconds()) + 1
	return veredicto{ok: true, codigo: 200, restantes: l.lim.Pedidos - len(a.marcas), reinicio: reinicio}
}

func (l *Lab) bloquear(a *Alumno, motivo string) {
	a.Bloqueos++
	a.BloqueoHast = l.ahora().Add(l.lim.Castigo)
	a.ultimoMotv = motivo
	a.mal = nil
}

func (a *Alumno) estado(now time.Time) string {
	switch {
	case now.Before(a.BloqueoHast):
		return "bloqueado"
	case now.Sub(a.ultimo429) < 15*time.Second:
		return "frenado"
	case now.Sub(a.Ultimo) < 30*time.Second:
		return "activo"
	}
	return "en pausa"
}

// ---------- HTTP ----------

func quiereJSON(r *http.Request) bool {
	return strings.HasPrefix(r.URL.Path, P+"/api/") || strings.Contains(r.Header.Get("Accept"), "application/json")
}

func escribirJSON(w http.ResponseWriter, codigo int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(codigo)
	e := json.NewEncoder(w)
	e.SetEscapeHTML(false)
	e.SetIndent("", "  ")
	_ = e.Encode(v)
}

// limitado envuelve una ruta con el límite por alumno.
func (l *Lab) limitado(h func(http.ResponseWriter, *http.Request, *Alumno)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		nick := l.nickDe(r)
		l.mu.Lock()
		a := l.alumno(nick)
		v := l.cobrar(a, r.UserAgent())
		l.mu.Unlock()
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(l.lim.Pedidos))
		w.Header().Set("X-RateLimit-Window", strconv.Itoa(int(l.lim.Ventana.Seconds())))
		w.Header().Set("X-Lab-Alumno", nick)
		if !v.ok {
			w.Header().Set("Retry-After", strconv.Itoa(v.retryAfter))
			w.Header().Set("X-RateLimit-Remaining", "0")
			w.Header().Set("Cache-Control", "no-store")
			if v.codigo == 429 {
				if quiereJSON(r) {
					escribirJSON(w, 429, map[string]any{"error": "demasiados pedidos", "retry_after": v.retryAfter,
						"explicacion": fmt.Sprintf("Máximo %d pedidos cada %d s por alumno. Espera %d s (cabecera Retry-After) y sigue más despacio.", l.lim.Pedidos, int(l.lim.Ventana.Seconds()), v.retryAfter)})
					return
				}
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(429)
				l.pagina(w, "limite", map[string]any{"Titulo": "429 · Más despacio", "Retry": v.retryAfter, "Pedidos": l.lim.Pedidos, "Ventana": int(l.lim.Ventana.Seconds()), "Nick": nick})
				return
			}
			if quiereJSON(r) {
				escribirJSON(w, 403, map[string]any{"error": "bloqueado", "retry_after": v.retryAfter, "hasta": v.hasta.In(lima).Format("15:04:05"), "motivo": v.motivo,
					"explicacion": "Bloqueo temporal del laboratorio. Un sitio real podría bloquearte por días o para siempre. No cambies de apodo para esquivarlo: espera y baja el ritmo."})
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(403)
			l.pagina(w, "bloqueado", map[string]any{"Titulo": "403 · Bloqueado", "Retry": v.retryAfter, "Hasta": v.hasta.In(lima).Format("15:04:05"), "Motivo": v.motivo, "Nick": nick})
			return
		}
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(v.restantes))
		w.Header().Set("X-RateLimit-Reset", strconv.Itoa(v.reinicio))
		h(w, r, a)
	}
}

// contar actualiza un contador del alumno bajo el candado.
func (l *Lab) contar(f func()) {
	l.mu.Lock()
	f()
	l.mu.Unlock()
}

func (l *Lab) pagina(w http.ResponseWriter, nombre string, datos map[string]any) {
	if datos == nil {
		datos = map[string]any{}
	}
	datos["P"] = P
	datos["Cuerpo"] = nombre
	if w.Header().Get("Content-Type") == "" {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	}
	if err := l.tpl.ExecuteTemplate(w, "base", datos); err != nil {
		log.Printf("plantilla %s: %v", nombre, err)
	}
}

func azarHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// ---------- Rutas ----------

const porPagina = 12

func (l *Lab) tienda(w http.ResponseWriter, r *http.Request, a *Alumno) {
	total := (len(productos) + porPagina - 1) / porPagina
	pag, err := strconv.Atoi(r.URL.Query().Get("page"))
	if r.URL.Query().Get("page") == "" {
		pag, err = 1, nil
	}
	if err != nil || pag < 1 || pag > total {
		w.WriteHeader(404)
		l.pagina(w, "error", map[string]any{"Titulo": "Página inexistente", "Texto": fmt.Sprintf("La tienda tiene páginas de 1 a %d. Cuando no hay enlace «Siguiente», ya terminaste.", total)})
		return
	}
	if n := limpiarNick(r.URL.Query().Get("alumno")); n != "" {
		http.SetCookie(w, &http.Cookie{Name: "lab_alumno", Value: n, Path: P, MaxAge: 86400, SameSite: http.SameSiteLaxMode})
	}
	l.contar(func() {
		if !a.paginas[pag] {
			a.paginas[pag] = true
			a.Paginas = len(a.paginas)
		}
		a.OK++
	})
	ini := (pag - 1) * porPagina
	fin := min(ini+porPagina, len(productos))
	var nums []int
	for i := 1; i <= total; i++ {
		nums = append(nums, i)
	}
	l.pagina(w, "tienda", map[string]any{"Titulo": fmt.Sprintf("Tienda JMD de práctica · página %d", pag), "Productos": productos[ini:fin],
		"Pag": pag, "Total": total, "Ant": pag - 1, "Sig": pag + 1, "HaySig": pag < total, "Nums": nums, "Nick": a.Nick})
}

func (l *Lab) producto(w http.ResponseWriter, r *http.Request, a *Alumno) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id < 1 || id > len(productos) {
		w.WriteHeader(404)
		l.pagina(w, "error", map[string]any{"Titulo": "Producto inexistente", "Texto": "Ese producto no existe en la tienda de práctica."})
		return
	}
	l.contar(func() { a.OK++ })
	l.pagina(w, "producto", map[string]any{"Titulo": productos[id-1].Nombre, "Prod": productos[id-1]})
}

func (l *Lab) privado(w http.ResponseWriter, r *http.Request, a *Alumno) {
	l.contar(func() { a.Robots++; a.OK++ })
	l.pagina(w, "privado", map[string]any{"Titulo": "Zona privada", "Nick": a.Nick})
}

func (l *Lab) trampa(w http.ResponseWriter, r *http.Request, a *Alumno) {
	var motivo string
	var hasta time.Time
	l.contar(func() {
		a.Trampas++
		l.bloquear(a, "Seguiste un enlace oculto que robots.txt prohíbe (/scraping-lab/trampa/). Una persona no lo ve; solo un bot que no lee las reglas llega ahí.")
		motivo, hasta = a.ultimoMotv, a.BloqueoHast
	})
	w.Header().Set("Retry-After", strconv.Itoa(int(l.lim.Castigo.Seconds())))
	if quiereJSON(r) {
		escribirJSON(w, 403, map[string]any{"error": "bloqueado", "motivo": motivo})
		return
	}
	w.WriteHeader(403)
	l.pagina(w, "bloqueado", map[string]any{"Titulo": "403 · Caíste en la trampa", "Retry": int(l.lim.Castigo.Seconds()), "Hasta": hasta.In(lima).Format("15:04:05"), "Motivo": motivo, "Nick": a.Nick})
}

func (l *Lab) loginForm(w http.ResponseWriter, r *http.Request, a *Alumno) {
	pre := azarHex(16)
	csrf := azarHex(16)
	l.contar(func() {
		if len(l.pre) > 5000 {
			l.pre = map[string]string{}
		}
		l.pre[pre] = csrf
		a.OK++
	})
	http.SetCookie(w, &http.Cookie{Name: "lab_pre", Value: pre, Path: P, HttpOnly: true, MaxAge: 1800, SameSite: http.SameSiteLaxMode})
	l.pagina(w, "login", map[string]any{"Titulo": "Inicia sesión", "CSRF": csrf, "Nick": strings.TrimPrefix(a.Nick, "anon-")})
}

func (l *Lab) loginPost(w http.ResponseWriter, r *http.Request, a *Alumno) {
	if err := r.ParseForm(); err != nil {
		w.WriteHeader(400)
		l.pagina(w, "error", map[string]any{"Titulo": "Formulario inválido", "Texto": err.Error()})
		return
	}
	var esperado string
	c, err := r.Cookie("lab_pre")
	if err == nil {
		l.mu.Lock()
		esperado = l.pre[c.Value]
		delete(l.pre, c.Value)
		l.mu.Unlock()
	}
	falla := func(codigo int, texto string) {
		if quiereJSON(r) {
			escribirJSON(w, codigo, map[string]any{"error": texto})
			return
		}
		w.WriteHeader(codigo)
		l.pagina(w, "error", map[string]any{"Titulo": "No se inició sesión", "Texto": texto, "Volver": P + "/login"})
	}
	if esperado == "" || r.PostForm.Get("csrf_token") != esperado {
		falla(403, "El token CSRF no coincide o falta la cookie lab_pre. Pide de nuevo /scraping-lab/login con la MISMA sesión (cookie) y manda el csrf_token del formulario.")
		return
	}
	nick := limpiarNick(r.PostForm.Get("usuario"))
	if nick == "" || strings.HasPrefix(nick, "anon-") {
		falla(400, "Usuario inválido: usa tu apodo (2 a 24 letras, números, - o _).")
		return
	}
	if r.PostForm.Get("clave") != "practica" {
		falla(401, "Clave incorrecta. En este laboratorio la clave de práctica es «practica».")
		return
	}
	id, tok := azarHex(18), "lab_"+azarHex(16)
	l.mu.Lock()
	if len(l.sesiones) > 5000 {
		l.sesiones = map[string]*Sesion{}
	}
	l.sesiones[id] = &Sesion{Nick: nick, Token: tok, Creada: l.ahora()}
	al := l.alumno(nick)
	al.Login = true
	al.OK++
	l.mu.Unlock()
	http.SetCookie(w, &http.Cookie{Name: "lab_sesion", Value: id, Path: P, HttpOnly: true, MaxAge: 7200, SameSite: http.SameSiteLaxMode})
	http.SetCookie(w, &http.Cookie{Name: "lab_pre", Value: "", Path: P, MaxAge: -1})
	if quiereJSON(r) {
		escribirJSON(w, 200, map[string]any{"ok": true, "nick": nick, "token": tok})
		return
	}
	l.pagina(w, "sesion", map[string]any{"Titulo": "Sesión iniciada", "Nick": nick, "Token": tok})
}

// sesionAPI exige la cookie lab_sesion Y la cabecera X-Lab-Token de esa sesión.
func (l *Lab) sesionAPI(w http.ResponseWriter, r *http.Request, exigirToken bool) *Sesion {
	c, err := r.Cookie("lab_sesion")
	if err != nil {
		escribirJSON(w, 401, map[string]any{"error": "sin sesión", "explicacion": "Falta la cookie lab_sesion. Inicia sesión en /scraping-lab/login (GET para el csrf_token, luego POST) con un cliente que guarde cookies."})
		return nil
	}
	l.mu.Lock()
	s := l.sesiones[c.Value]
	if s != nil && l.ahora().Sub(s.Creada) > 2*time.Hour {
		delete(l.sesiones, c.Value)
		s = nil
	}
	l.mu.Unlock()
	if s == nil {
		escribirJSON(w, 401, map[string]any{"error": "sesión vencida", "explicacion": "La cookie ya no vale (dura 2 h o el laboratorio se reinició). Vuelve a iniciar sesión."})
		return nil
	}
	if exigirToken && r.Header.Get("X-Lab-Token") != s.Token {
		escribirJSON(w, 401, map[string]any{"error": "token inválido", "explicacion": "La API pide la cabecera X-Lab-Token con el token que te dio el inicio de sesión (también en GET /scraping-lab/api/token)."})
		return nil
	}
	return s
}

func (l *Lab) apiToken(w http.ResponseWriter, r *http.Request, a *Alumno) {
	s := l.sesionAPI(w, r, false)
	if s == nil {
		return
	}
	l.contar(func() { a.OK++ })
	escribirJSON(w, 200, map[string]any{"token": s.Token, "nick": s.Nick, "cabecera": "X-Lab-Token"})
}

var sinTildes = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ñ", "n")

// coincide busca por inicio de palabra, sin tildes ni mayúsculas: «taza» encuentra «Taza» pero no «mostaza».
func coincide(texto, q string) bool {
	norm := func(s string) []string {
		return strings.FieldsFunc(sinTildes.Replace(strings.ToLower(s)), func(r rune) bool {
			return !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9')
		})
	}
	palabras := norm(texto)
	for _, b := range norm(q) {
		ok := false
		for _, w := range palabras {
			if strings.HasPrefix(w, b) {
				ok = true
				break
			}
		}
		if !ok {
			return false
		}
	}
	return true
}

type cursor struct {
	O int    `json:"o"`
	Q string `json:"q"`
}

func codCursor(c cursor) string {
	b, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(b)
}

func (l *Lab) apiProductos(w http.ResponseWriter, r *http.Request, a *Alumno) {
	if l.sesionAPI(w, r, true) == nil {
		return
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	lim, _ := strconv.Atoi(r.URL.Query().Get("limite"))
	if lim <= 0 {
		lim = 20
	}
	lim = min(lim, 50)
	off := 0
	if cs := r.URL.Query().Get("cursor"); cs != "" {
		raw, err := base64.RawURLEncoding.DecodeString(cs)
		var c cursor
		if err != nil || json.Unmarshal(raw, &c) != nil || c.O < 0 || c.Q != q {
			escribirJSON(w, 400, map[string]any{"error": "cursor inválido", "explicacion": "Usa el next_cursor tal cual lo devolvió la respuesta anterior, con el mismo q. No se inventa ni se edita."})
			return
		}
		off = c.O
	}
	var lista []Producto
	if q == "" {
		lista = productos
	} else {
		for _, p := range productos {
			if coincide(p.Nombre+" "+p.Categoria+" "+p.Marca+" "+p.Descripcion, q) {
				lista = append(lista, p)
			}
		}
	}
	fin := min(off+lim, len(lista))
	items := []Producto{}
	if off < len(lista) {
		items = lista[off:fin]
	}
	var sig any
	if fin < len(lista) {
		sig = codCursor(cursor{O: fin, Q: q})
	}
	l.contar(func() { a.OK++; a.ItemsAPI += len(items) })
	escribirJSON(w, 200, map[string]any{"items": items, "next_cursor": sig, "total": len(lista), "limite": lim})
}

func (l *Lab) apiProducto(w http.ResponseWriter, r *http.Request, a *Alumno) {
	if l.sesionAPI(w, r, true) == nil {
		return
	}
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id < 1 || id > len(productos) {
		escribirJSON(w, 404, map[string]any{"error": "producto inexistente"})
		return
	}
	l.contar(func() { a.OK++ })
	escribirJSON(w, 200, productos[id-1])
}

func (l *Lab) descargasIndice(w http.ResponseWriter, r *http.Request, a *Alumno) {
	l.contar(func() { a.OK++ })
	l.pagina(w, "descargas", map[string]any{"Titulo": "Descargas de práctica", "Archivos": archivos})
}

func (l *Lab) apiDescargas(w http.ResponseWriter, r *http.Request, a *Alumno) {
	l.contar(func() { a.OK++ })
	escribirJSON(w, 200, map[string]any{"total": len(archivos), "archivos": archivos,
		"nota": "Algunos archivos fallan a propósito (500 o 503 con Retry-After): reintenta con espera. Uno está dañado para siempre: regístralo y sigue."})
}

// archivo sirve un CSV. Fallos deterministas por alumno: múltiplos de 17 dan 500 en el primer intento,
// múltiplos de 29 dan 503 con Retry-After: 2 en los dos primeros, y el 137 está dañado siempre.
func (l *Lab) archivo(w http.ResponseWriter, r *http.Request, a *Alumno) {
	i, ok := porNombre[r.PathValue("nombre")]
	if !ok {
		http.Error(w, "no existe", 404)
		return
	}
	f := archivos[i]
	var intento int
	l.contar(func() { a.intentos[f.N]++; intento = a.intentos[f.N] })
	switch {
	case f.N == 137:
		l.contar(func() { a.C500++ })
		http.Error(w, "500: archivo dañado en el servidor (este nunca se arregla: anótalo y sigue)", 500)
		return
	case f.N%29 == 0 && intento <= 2:
		l.contar(func() { a.C500++ })
		w.Header().Set("Retry-After", "2")
		http.Error(w, "503: el servidor de archivos está ocupado, vuelve en 2 s", 503)
		return
	case f.N%17 == 0 && intento <= 1:
		l.contar(func() { a.C500++ })
		http.Error(w, "500: error pasajero, reintenta con espera", 500)
		return
	}
	l.contar(func() {
		a.OK++
		if !a.vistos[f.N] {
			a.vistos[f.N] = true
			a.Archivos = len(a.vistos)
		}
	})
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Length", strconv.Itoa(len(f.datos)))
	w.Header().Set("ETag", `"`+f.SHA256[:16]+`"`)
	_, _ = w.Write(f.datos)
}

func (l *Lab) foto(now time.Time) []Alumno {
	out := make([]Alumno, 0, len(l.alumnos))
	for _, a := range l.alumnos {
		c := *a
		c.Estado = a.estado(now)
		c.marcas, c.mal, c.vistos, c.paginas, c.intentos = nil, nil, nil, nil, nil
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Ultimo.After(out[j].Ultimo) })
	return out
}

func (l *Lab) apiPanel(w http.ResponseWriter, r *http.Request) {
	l.mu.Lock()
	lista := l.foto(l.ahora())
	l.mu.Unlock()
	w.Header().Set("Cache-Control", "no-store")
	escribirJSON(w, 200, map[string]any{"alumnos": lista, "limite": l.lim.Pedidos, "ventana": int(l.lim.Ventana.Seconds()),
		"tolerancia": l.lim.Tolerancia, "castigo": int(l.lim.Castigo.Seconds()), "hora": l.ahora().In(lima).Format("15:04:05")})
}

func (l *Lab) apiYo(w http.ResponseWriter, r *http.Request) {
	nick := l.nickDe(r)
	l.mu.Lock()
	a := l.alumnos[nick]
	var c Alumno
	restantes := l.lim.Pedidos
	if a != nil {
		now := l.ahora()
		c = *a
		c.Estado = a.estado(now)
		n := 0
		for _, t := range a.marcas {
			if t.After(now.Add(-l.lim.Ventana)) {
				n++
			}
		}
		restantes -= n
	} else {
		c = Alumno{Nick: nick, Estado: "sin pedidos"}
	}
	c.marcas, c.mal, c.vistos, c.paginas, c.intentos = nil, nil, nil, nil, nil
	l.mu.Unlock()
	escribirJSON(w, 200, map[string]any{"alumno": c, "restantes_en_ventana": max(restantes, 0), "limite": l.lim.Pedidos, "ventana": int(l.lim.Ventana.Seconds())})
}

func (l *Lab) robots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	fmt.Fprintf(w, `# Laboratorio de scraping JMD: reglas para bots (sitio de práctica, datos ficticios)
# Límite: %d pedidos cada %d s por alumno. Identifícate en el User-Agent (nombre y contacto).
# Términos de uso: %s/terminos

User-agent: BotSinModales
Disallow: /

User-agent: *
Crawl-delay: 1
Disallow: %s/privado/
Disallow: %s/trampa/
Allow: %s/
`, l.lim.Pedidos, int(l.lim.Ventana.Seconds()), P, P, P, P)
}

func (l *Lab) kitArchivo(w http.ResponseWriter, r *http.Request) {
	nombre := r.PathValue("nombre")
	b, err := kitFS.ReadFile("kit/" + nombre)
	if err != nil || strings.Contains(nombre, "/") {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	if strings.HasSuffix(nombre, ".user.js") {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	}
	_, _ = w.Write(b)
}

func armarZip() []byte {
	var buf bytes.Buffer
	z := zip.NewWriter(&buf)
	_ = fs.WalkDir(kitFS, "kit", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		b, _ := kitFS.ReadFile(p)
		h := &zip.FileHeader{Name: "kit-scraping-lab/" + strings.TrimPrefix(p, "kit/"), Method: zip.Deflate}
		h.Modified = time.Date(2026, 11, 8, 12, 0, 0, 0, lima)
		h.SetMode(0o644)
		f, _ := z.CreateHeader(h)
		_, _ = f.Write(b)
		return nil
	})
	_ = z.Close()
	return buf.Bytes()
}

func (l *Lab) kitLista() []string {
	var out []string
	ents, _ := kitFS.ReadDir("kit")
	for _, e := range ents {
		out = append(out, e.Name())
	}
	return out
}

func nuevoLab(lim Limites) *Lab {
	funcs := template.FuncMap{
		"soles": func(f float64) string { return fmt.Sprintf("S/ %.2f", f) },
		"estrellas": func(v float64) string {
			n := int(v + 0.5)
			return strings.Repeat("★", n) + strings.Repeat("☆", 5-n)
		},
	}
	tpl := template.Must(template.New("").Funcs(funcs).ParseFS(webFS, "web/*.html"))
	return &Lab{lim: lim, alumnos: map[string]*Alumno{}, sesiones: map[string]*Sesion{}, pre: map[string]string{},
		ahora: time.Now, tpl: tpl, kitZip: armarZip()}
}

func (l *Lab) rutas() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET "+P+"/{$}", func(w http.ResponseWriter, r *http.Request) {
		if n := limpiarNick(r.URL.Query().Get("alumno")); n != "" {
			http.SetCookie(w, &http.Cookie{Name: "lab_alumno", Value: n, Path: P, MaxAge: 86400, SameSite: http.SameSiteLaxMode})
			http.Redirect(w, r, P+"/", http.StatusSeeOther)
			return
		}
		var nick string
		if c, err := r.Cookie("lab_alumno"); err == nil {
			nick = limpiarNick(c.Value)
		}
		l.pagina(w, "inicio", map[string]any{"Titulo": "Laboratorio de scraping JMD", "Nick": nick, "Lim": l.lim.Pedidos,
			"Ventana": int(l.lim.Ventana.Seconds()), "Tol": l.lim.Tolerancia, "Castigo": int(l.lim.Castigo.Seconds()), "Kit": l.kitLista()})
	})
	m.HandleFunc("GET "+P, func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, P+"/", http.StatusMovedPermanently) })
	m.HandleFunc("GET "+P+"/robots.txt", l.robots)
	m.HandleFunc("GET "+P+"/terminos", func(w http.ResponseWriter, r *http.Request) {
		l.pagina(w, "terminos", map[string]any{"Titulo": "Términos de uso", "Lim": l.lim.Pedidos, "Ventana": int(l.lim.Ventana.Seconds())})
	})
	m.HandleFunc("GET "+P+"/panel", func(w http.ResponseWriter, r *http.Request) {
		l.pagina(w, "panel", map[string]any{"Titulo": "Panel del laboratorio", "Lim": l.lim.Pedidos, "Ventana": int(l.lim.Ventana.Seconds())})
	})
	m.HandleFunc("GET "+P+"/api/panel", l.apiPanel)
	m.HandleFunc("GET "+P+"/api/yo", l.apiYo)
	m.HandleFunc("GET "+P+"/api/salud", func(w http.ResponseWriter, r *http.Request) {
		escribirJSON(w, 200, map[string]any{"ok": true, "productos": len(productos), "archivos": len(archivos)})
	})
	m.HandleFunc("GET "+P+"/estilo.css", func(w http.ResponseWriter, r *http.Request) {
		b, _ := webFS.ReadFile("web/estilo.css")
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
		w.Header().Set("Cache-Control", "max-age=300")
		_, _ = w.Write(b)
	})
	m.HandleFunc("GET "+P+"/kit.zip", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/zip")
		w.Header().Set("Content-Disposition", `attachment; filename="kit-scraping-lab.zip"`)
		_, _ = w.Write(l.kitZip)
	})
	m.HandleFunc("GET "+P+"/kit/{nombre}", l.kitArchivo)

	m.HandleFunc("GET "+P+"/tienda", l.limitado(l.tienda))
	m.HandleFunc("GET "+P+"/tienda/producto/{id}", l.limitado(l.producto))
	m.HandleFunc("GET "+P+"/privado/", l.limitado(l.privado))
	m.HandleFunc("GET "+P+"/trampa/", l.limitado(l.trampa))
	m.HandleFunc("GET "+P+"/login", l.limitado(l.loginForm))
	m.HandleFunc("POST "+P+"/login", l.limitado(l.loginPost))
	m.HandleFunc("GET "+P+"/api/token", l.limitado(l.apiToken))
	m.HandleFunc("GET "+P+"/api/productos", l.limitado(l.apiProductos))
	m.HandleFunc("GET "+P+"/api/productos/{id}", l.limitado(l.apiProducto))
	m.HandleFunc("GET "+P+"/descargas/", l.limitado(l.descargasIndice))
	m.HandleFunc("GET "+P+"/api/descargas", l.limitado(l.apiDescargas))
	m.HandleFunc("GET "+P+"/descargas/archivo/{nombre}", l.limitado(l.archivo))
	return cabeceras(m)
}

func cabeceras(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Lab", "JMD scraping-lab")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		h.ServeHTTP(w, r)
	})
}

func main() {
	generar()
	lim := Limites{
		Pedidos:    envInt("LAB_LIMITE", 20),
		Ventana:    time.Duration(envInt("LAB_VENTANA", 10)) * time.Second,
		Tolerancia: envInt("LAB_TOLERANCIA", 10),
		Castigo:    time.Duration(envInt("LAB_CASTIGO", 60)) * time.Second,
	}
	l := nuevoLab(lim)
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18685"
	}
	host := os.Getenv("HOST") // vacío = todas las interfaces (en Docker); el -p 127.0.0.1 lo deja local al servidor
	srv := &http.Server{Addr: host + ":" + puerto, Handler: l.rutas(), ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout: 20 * time.Second, WriteTimeout: 30 * time.Second, MaxHeaderBytes: 32 << 10}
	log.Printf("laboratorio en http://127.0.0.1:%s%s/ · límite %d pedidos/%s, tolerancia %d, castigo %s", puerto, P, lim.Pedidos, lim.Ventana, lim.Tolerancia, lim.Castigo)
	log.Fatal(srv.ListenAndServe())
}
