package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// Vector calculado aparte con Python (hmac + hashlib), copiando la fórmula de live_instructor.go del LMS.
func TestTokenComoElLMS(t *testing.T) {
	semilla := []byte("semilla-de-prueba-0123456789abcdef0123456789")
	got := tokenEnlace(semilla, "0f6c2a9e-usuario-prueba", time.Unix(1893456000, 0))
	const want = "MGY2YzJhOWUtdXN1YXJpby1wcnVlYmE.1893456000.527995973f76165bbcf642f98170c959af27fac6"
	if got != want {
		t.Fatalf("token\n got %s\nwant %s", got, want)
	}
	if !firmaValida(semilla, want) || firmaValida([]byte("otra"), want) || firmaValida(semilla, want[:len(want)-1]+"0") {
		t.Fatal("firmaValida")
	}
	u := urlEnlace("https://jmd-learn.online/", want, "/courses/ready-set-go/")
	if u != "https://jmd-learn.online/api/v1/auth/enlace?t="+want+"&a=%2Fcourses%2Fready-set-go%2F" {
		t.Fatal(u)
	}
}

func TestValidar(t *testing.T) {
	bien := Pedido{Nombre: "  Ana   María Quispe ", Correo: " ANA@Correo.PE "}
	if m := validar(&bien); m != "" {
		t.Fatal(m)
	}
	if bien.Nombre != "Ana María Quispe" || bien.Correo != "ana@correo.pe" {
		t.Fatalf("%+v", bien)
	}
	for _, p := range []Pedido{
		{Nombre: "Al", Correo: "a@b.pe"},
		{Nombre: strings.Repeat("ñ", 41), Correo: "a@b.pe"}, // 41 letras pero 82 bytes: el LMS no lo acepta
		{Nombre: "<script>", Correo: "a@b.pe"},
		{Nombre: "123", Correo: "a@b.pe"},
		{Nombre: "Juan Huevón", Correo: "a@b.pe"},
		{Nombre: "p.u.t.a madre", Correo: "a@b.pe"},
		{Nombre: "Ana Quispe", Correo: "ana"},
		{Nombre: "Ana Quispe", Correo: "Ana <ana@b.pe>"},
		{Nombre: "Ana Quispe", Correo: "ana@localhost"},
	} {
		if validar(&p) == "" {
			t.Errorf("aceptó %+v", p)
		}
	}
	if p := (Pedido{Nombre: "Rosa Concha", Correo: "rosa@x.pe"}); validar(&p) != "" {
		t.Error("rechazó el apellido Concha")
	}
}

// ---- LMS de mentira con las mismas rutas ----

type lmsFalso struct {
	mu          sync.Mutex
	usuarios    []Usuario
	puts        []Usuario
	registros   int
	logouts     int
	semilla     []byte
	sinRegistro bool
}

func (f *lmsFalso) servir(t *testing.T) *httptest.Server {
	mux := http.NewServeMux()
	esc := func(w http.ResponseWriter, code int, v any) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(code)
		_ = json.NewEncoder(w).Encode(v)
	}
	admin := func(r *http.Request) bool { return r.Header.Get("Authorization") == "Bearer lms_admin" }
	mux.HandleFunc("POST /api/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		var in map[string]string
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in["email"] != "profe@jmd.pe" || in["password"] != "clave-admin-larga" {
			esc(w, 401, map[string]string{"error": "x"})
			return
		}
		esc(w, 200, map[string]string{"token": "lms_admin"})
	})
	mux.HandleFunc("GET /api/v1/auth/config", func(w http.ResponseWriter, r *http.Request) {
		esc(w, 200, map[string]bool{"register": !f.sinRegistro})
	})
	mux.HandleFunc("POST /api/v1/auth/register", func(w http.ResponseWriter, r *http.Request) {
		var in map[string]string
		_ = json.NewDecoder(r.Body).Decode(&in)
		f.mu.Lock()
		defer f.mu.Unlock()
		if in["invite_code"] != "codigo-clase" {
			esc(w, 403, nil)
			return
		}
		if len(in["password"]) < 32 {
			t.Errorf("contraseña corta: %d", len(in["password"]))
		}
		if r.Header.Get("X-Forwarded-For") == "" {
			t.Error("register sin X-Forwarded-For")
		}
		for _, u := range f.usuarios {
			if u.Email == in["email"] {
				esc(w, 409, nil)
				return
			}
		}
		f.registros++
		u := Usuario{ID: "u-" + strconv.Itoa(len(f.usuarios)+1), Email: in["email"], Name: in["name"], Roles: []string{"student"}, Cohorts: []string{"cohorte-defecto"}}
		f.usuarios = append(f.usuarios, u)
		esc(w, 201, map[string]any{"token": "lms_alumno", "user": u})
	})
	mux.HandleFunc("POST /api/v1/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		f.logouts++
		f.mu.Unlock()
		esc(w, 200, map[string]bool{"ok": true})
	})
	mux.HandleFunc("GET /api/v1/admin/users", func(w http.ResponseWriter, r *http.Request) {
		if !admin(r) {
			esc(w, 401, nil)
			return
		}
		f.mu.Lock()
		defer f.mu.Unlock()
		esc(w, 200, f.usuarios)
	})
	mux.HandleFunc("PUT /api/v1/admin/users/{id}", func(w http.ResponseWriter, r *http.Request) {
		if !admin(r) {
			esc(w, 401, nil)
			return
		}
		var in struct{ Roles, Cohorts []string }
		_ = json.NewDecoder(r.Body).Decode(&in)
		f.mu.Lock()
		defer f.mu.Unlock()
		for i := range f.usuarios {
			if f.usuarios[i].ID == r.PathValue("id") {
				f.usuarios[i].Roles, f.usuarios[i].Cohorts = in.Roles, in.Cohorts
				f.puts = append(f.puts, f.usuarios[i])
				esc(w, 200, map[string]bool{"ok": true})
				return
			}
		}
		esc(w, 404, nil)
	})
	mux.HandleFunc("GET /api/v1/live/{lesson}/accesos", func(w http.ResponseWriter, r *http.Request) {
		tok := tokenEnlace(f.semilla, "alumno-viejo", time.Now().Add(12*time.Hour))
		esc(w, 200, map[string]any{"alumnos": []map[string]string{{"url": "https://x/api/v1/auth/enlace?t=" + url.QueryEscape(tok) + "&a=%2F"}}})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

var semillaPrueba = []byte("semilla-del-aula-para-pruebas-0123456789")

func armar(t *testing.T, f *lmsFalso) *Servidor {
	t.Helper()
	if f.semilla == nil {
		f.semilla = semillaPrueba
	}
	srv := f.servir(t)
	lms := &LMS{Base: srv.URL, Correo: "profe@jmd.pe", Clave: "clave-admin-larga", Invitacion: "codigo-clase", HC: cliente()}
	cfg := Config{Grupo: "ready-set-go-1", Destino: "/courses/ready-set-go/", Publico: "https://jmd-learn.online", Semilla: semillaPrueba,
		Anios: 2, MaxPorIP: 5, MaxPorDia: 300, ClavePanel: "clave-del-panel-123", Lecciones: []string{"rsg-01"}}
	s, err := nuevoServidor(cfg, lms, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestCorreoNuevoRecibeEnlace(t *testing.T) {
	f := &lmsFalso{}
	s := armar(t, f)
	res, err := s.inscribir(context.Background(), Pedido{Nombre: "Ana Quispe", Correo: "ana@correo.pe"}, "1.2.3.4")
	if err != nil {
		t.Fatal(err)
	}
	if res.Estado != "nueva" || res.Enlace == "" || f.registros != 1 || f.logouts != 1 {
		t.Fatalf("%+v registros=%d logouts=%d", res, f.registros, f.logouts)
	}
	if u := f.usuarios[0]; !slices.Equal(u.Cohorts, []string{"ready-set-go-1"}) || !slices.Equal(u.Roles, []string{"student"}) {
		t.Fatalf("la cuenta nueva quedó en %v %v (debe salir de la cohorte por defecto)", u.Roles, u.Cohorts)
	}
	l, _ := url.Parse(res.Enlace)
	tok := l.Query().Get("t")
	if !firmaValida(semillaPrueba, tok) || !strings.HasPrefix(tok, "dS0x.") || l.Query().Get("a") != "/courses/ready-set-go/" {
		t.Fatalf("enlace %s", res.Enlace)
	}
	v, _ := strconv.ParseInt(strings.Split(tok, ".")[1], 10, 64)
	if d := time.Until(time.Unix(v, 0)); d < 730*24*time.Hour || d > 731*24*time.Hour {
		t.Fatalf("vigencia %v", d)
	}
	// El mismo correo otra vez: ya no hay enlace (podría escribirlo otra persona).
	res, err = s.inscribir(context.Background(), Pedido{Nombre: "Otra Persona", Correo: "ana@correo.pe"}, "5.6.7.8")
	if err != nil || res.Estado != "ya-inscrito" || res.Enlace != "" || f.registros != 1 {
		t.Fatalf("segunda vez: %+v %v", res, err)
	}
	// El registro queda sin enlaces
	b, _ := os.ReadFile(s.archivo)
	if strings.Contains(string(b), "auth/enlace") || strings.Contains(string(b), tok) || strings.Count(string(b), "\n") != 2 {
		t.Fatalf("inscritos.jsonl: %s", b)
	}
}

func TestCorreoExistenteSinEnlace(t *testing.T) {
	f := &lmsFalso{usuarios: []Usuario{{ID: "viejo", Email: "Luis@Correo.pe", Name: "Luis", Roles: []string{"student"}, Cohorts: []string{"grupo-9", "claude-pro-1"}}}}
	s := armar(t, f)
	res, err := s.inscribir(context.Background(), Pedido{Nombre: "Quien Sea", Correo: "luis@correo.pe"}, "1.2.3.4")
	if err != nil {
		t.Fatal(err)
	}
	if res.Estado != "existente" || res.Enlace != "" || f.registros != 0 {
		t.Fatalf("%+v", res)
	}
	if strings.Contains(mustJSON(res), "Luis\"") {
		t.Fatal("devolvió el nombre guardado en el LMS")
	}
	if u := f.usuarios[0]; !slices.Equal(u.Cohorts, []string{"grupo-9", "claude-pro-1", "ready-set-go-1"}) || !slices.Equal(u.Roles, []string{"student"}) {
		t.Fatalf("grupos: %v %v", u.Roles, u.Cohorts)
	}
	// Ya estaba: no se vuelve a escribir.
	if _, err := s.inscribir(context.Background(), Pedido{Nombre: "Quien Sea", Correo: "luis@correo.pe"}, "1.2.3.4"); err != nil || len(f.puts) != 1 {
		t.Fatalf("puts=%d %v", len(f.puts), err)
	}
}

func TestPersonalNoSeToca(t *testing.T) {
	for _, roles := range [][]string{{"admin", "instructor"}, {"instructor"}, {"student", "admin"}} {
		f := &lmsFalso{usuarios: []Usuario{{ID: "profe", Email: "profe@jmd.pe", Roles: roles, Cohorts: []string{"grupo-9"}}}}
		s := armar(t, f)
		res, err := s.inscribir(context.Background(), Pedido{Nombre: "Quien Sea", Correo: "profe@jmd.pe"}, "1.2.3.4")
		if err != nil || res.Estado != "existente" || res.Enlace != "" || len(f.puts) != 0 || f.registros != 0 {
			t.Fatalf("%v: %+v puts=%d %v", roles, res, len(f.puts), err)
		}
	}
}

func TestSemillaDistintaNoCreaCuentas(t *testing.T) {
	f := &lmsFalso{semilla: []byte("la-semilla-de-verdad-es-otra-0123456789")}
	s := armar(t, f)
	if _, err := s.inscribir(context.Background(), Pedido{Nombre: "Ana Quispe", Correo: "ana@correo.pe"}, "1.2.3.4"); err == nil || f.registros != 0 {
		t.Fatalf("creó la cuenta con una semilla que no abre: %v", err)
	}
}

func TestLimites(t *testing.T) {
	f := &lmsFalso{}
	s := armar(t, f)
	for i := 0; i < 5; i++ {
		if _, err := s.inscribir(context.Background(), Pedido{Nombre: "Ana Quispe", Correo: "a" + strconv.Itoa(i) + "@correo.pe"}, "9.9.9.9"); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.inscribir(context.Background(), Pedido{Nombre: "Ana Quispe", Correo: "z@correo.pe"}, "9.9.9.9"); err == nil || !strings.Contains(err.Error(), "Demasiados") {
		t.Fatalf("sexta desde la misma IP: %v", err)
	}
	s.ahora = func() time.Time { return time.Now().Add(61 * time.Minute) }
	if _, err := s.inscribir(context.Background(), Pedido{Nombre: "Ana Quispe", Correo: "z@correo.pe"}, "9.9.9.9"); err != nil {
		t.Fatalf("pasada la hora: %v", err)
	}
	s.ahora = time.Now
	s.cfg.MaxPorDia = len(s.inscritos)
	if _, err := s.inscribir(context.Background(), Pedido{Nombre: "Ana Quispe", Correo: "y@correo.pe"}, "8.8.8.8"); err == nil || !strings.Contains(err.Error(), "mañana") {
		t.Fatalf("tope del día: %v", err)
	}
}

func TestHTTP(t *testing.T) {
	f := &lmsFalso{}
	s := armar(t, f)
	h := s.rutas()
	pedir := func(metodo, ruta, cuerpo string, cab ...string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(metodo, ruta, bytes.NewBufferString(cuerpo))
		for i := 0; i+1 < len(cab); i += 2 {
			r.Header.Set(cab[i], cab[i+1])
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	if w := pedir("POST", "/api/inscribir", `{"nombre":"Bot Bot","correo":"bot@x.pe","sitio":"http://spam"}`); w.Code != 200 || f.registros != 0 || strings.Contains(w.Body.String(), "enlace") {
		t.Fatalf("trampa: %d %s", w.Code, w.Body)
	}
	if w := pedir("POST", "/api/inscribir", `{"nombre":"Ana","correo":"no-es-correo"}`); w.Code != 400 {
		t.Fatalf("correo malo: %d", w.Code)
	}
	if w := pedir("POST", "/api/inscribir", `basura`); w.Code != 400 {
		t.Fatalf("json malo: %d", w.Code)
	}
	w := pedir("POST", "/api/inscribir", `{"nombre":"Ana Quispe","correo":"ana@x.pe"}`, "X-Real-IP", "7.7.7.7")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"estado":"nueva"`) || w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("Content-Security-Policy") == "" {
		t.Fatalf("alta: %d %s", w.Code, w.Body)
	}
	if w := pedir("GET", "/api/admin/inscritos", "", "X-Clave", "mala"); w.Code != 401 {
		t.Fatalf("panel sin clave: %d", w.Code)
	}
	if w := pedir("GET", "/api/admin/inscritos", "", "X-Clave", "clave-del-panel-123"); w.Code != 200 || !strings.Contains(w.Body.String(), "ana@x.pe") || strings.Contains(w.Body.String(), "auth/enlace") {
		t.Fatalf("panel: %d %s", w.Code, w.Body)
	}
	if w := pedir("POST", "/api/admin/enlace", `{"usuario":"u-1"}`, "X-Clave", "clave-del-panel-123"); w.Code != 200 || !strings.Contains(w.Body.String(), "auth/enlace") {
		t.Fatalf("reemitir: %d %s", w.Code, w.Body)
	}
	f.usuarios = append(f.usuarios, Usuario{ID: "ajeno", Email: "x@y.pe", Roles: []string{"student"}})
	if w := pedir("POST", "/api/admin/enlace", `{"usuario":"ajeno"}`, "X-Clave", "clave-del-panel-123"); w.Code != 403 {
		t.Fatalf("reemitir cuenta ajena: %d", w.Code)
	}
	for i := 0; i < 12; i++ {
		pedir("GET", "/api/admin/csv", "", "X-Clave", "mala", "X-Real-IP", "6.6.6.6")
	}
	if w := pedir("GET", "/api/admin/csv", "", "X-Clave", "clave-del-panel-123", "X-Real-IP", "6.6.6.6"); w.Code != 429 {
		t.Fatalf("fuerza bruta del panel: %d", w.Code)
	}
}

// El horario es el del LMS (starts_at y duration de cada lección) y ninguna sesión cae en sábado bíblico.
func TestHorarioComoElLMS(t *testing.T) {
	dir := filepath.Join("..", "lms", "content", "courses", "ready-set-go", "lessons")
	archivos, _ := filepath.Glob(filepath.Join(dir, "*.md"))
	if len(archivos) == 0 {
		t.Skip("sin el contenido del LMS al lado")
	}
	reInicio := regexp.MustCompile(`(?m)^starts_at:\s*(\S+)`)
	reDur := regexp.MustCompile(`(?m)^duration:\s*(\d+)`)
	reID := regexp.MustCompile(`(?m)^id:\s*(\S+)`)
	vistas := 0
	for _, a := range archivos {
		b, _ := os.ReadFile(a)
		id, ini := reID.FindSubmatch(b), reInicio.FindSubmatch(b)
		if id == nil || ini == nil {
			continue
		}
		min := 90 // course.yaml: agenda.minutos
		if d := reDur.FindSubmatch(b); d != nil {
			min, _ = strconv.Atoi(string(d[1]))
		}
		for _, s := range horario {
			if s.ID == string(id[1]) {
				vistas++
				a, _ := time.Parse(time.RFC3339, s.Inicio)
				b, _ := time.Parse(time.RFC3339, string(ini[1]))
				if !a.Equal(b) || s.Minutos != min {
					t.Errorf("%s: aquí %s %d min, LMS %s %d min", s.ID, s.Inicio, s.Minutos, ini[1], min)
				}
			}
		}
	}
	if vistas != 4 {
		t.Fatalf("clases comparadas: %d", vistas)
	}
	for _, s := range horario {
		a, _ := time.Parse(time.RFC3339, s.Inicio)
		a = a.In(lima)
		b := a.Add(time.Duration(s.Minutos) * time.Minute)
		for _, x := range []time.Time{a, b} {
			if (x.Weekday() == time.Friday && x.Hour() >= 18) || (x.Weekday() == time.Saturday && (x.Hour() < 18 || x.Hour() == 18 && x.Minute() < 30)) {
				t.Errorf("%s cae en sábado bíblico", s.ID)
			}
		}
	}
	if h := horario[3].Horas; h != "9:15 – 11:15 p. m." {
		t.Fatalf("última clase: %q", h)
	}
	if h := horario[4]; h.Horas != "1:30 – 7:15 p. m." || h.Fecha != "Domingo 13 de diciembre" {
		t.Fatalf("hackathon: %+v", h)
	}
}

func mustJSON(v any) string { b, _ := json.Marshal(v); return string(b) }
