package httpapi

import (
	"bufio"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// El alumno no puede iniciar; el staff inicia y cambia escena; el alumno la lee.
func TestLiveEstado(t *testing.T) {
	e := newEnv(t)
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": "ana@x.test", "name": "Ana", "password": "ana-1234", "invite_code": "abc"}, ""); r.code != 201 {
		t.Fatalf("registro: %d %s", r.code, r.raw)
	}
	ana := e.login("ana@x.test", "ana-1234")

	// La lección l1 existe en el fixture.
	if r := e.call("POST", "/api/v1/live/l1/iniciar", ana, false, map[string]any{}, ""); r.code != 403 {
		t.Fatalf("alumno inicia: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l1/iniciar", profe, false, map[string]any{}, ""); r.code != 200 {
		t.Fatalf("iniciar: %d %s", r.code, r.raw)
	}
	if got := e.call("PUT", "/api/v1/live/l1/escena", profe, false, map[string]any{"escena": "03-tu-laptop", "visible": true}, ""); got.code != 200 {
		t.Fatalf("escena: %d %s", got.code, got.raw)
	}
	if r := e.call("GET", "/api/v1/live/l1", ana, false, nil, ""); r.code != 200 || r.body["escena"] != "03-tu-laptop" {
		t.Fatalf("el alumno lee: %d %v", r.code, r.body)
	}
	if r := e.call("GET", "/api/v1/live/noexiste", profe, false, nil, ""); r.code != 404 {
		t.Fatalf("lección inexistente: %d", r.code)
	}
}

// Un modo distinto de guiado o libre da 400.
func TestLiveModoInvalido(t *testing.T) {
	e := newEnv(t)
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("PUT", "/api/v1/live/l1/modo", profe, false, map[string]any{"modo": "x"}, ""); r.code != 400 {
		t.Fatalf("modo inválido: %d %s", r.code, r.raw)
	}
	if r := e.call("PUT", "/api/v1/live/l1/modo", profe, false, map[string]any{"modo": "libre"}, ""); r.code != 200 {
		t.Fatalf("modo libre: %d", r.code)
	}
}

// clienteStream abre el stream y acumula los bloques que empiezan por "event: ".
func clienteStream(t *testing.T, url, token string, n int, out chan<- []string) {
	go func() {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		res, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
		if err != nil {
			out <- nil
			return
		}
		var mu sync.Mutex
		_ = &mu
		defer res.Body.Close()
		var bloques []string
		var actual []string
		sc := bufio.NewScanner(res.Body)
		sc.Buffer(make([]byte, 65536), 65536)
		for sc.Scan() {
			linea := sc.Text()
			if linea == "" {
				if len(actual) > 0 {
					bloques = append(bloques, strings.Join(actual, "\n"))
					actual = nil
					if contarEventos(bloques) >= n {
						cancel()
						out <- bloques
						return
					}
				}
				continue
			}
			actual = append(actual, linea)
		}
		out <- bloques
	}()
}

// contarEventos cuenta los bloques SSE que empiezan por "event: " (el retry: no cuenta).
func contarEventos(bloques []string) int {
	n := 0
	for _, b := range bloques {
		if strings.HasPrefix(b, "event: ") {
			n++
		}
	}
	return n
}

// Tres clientes SSE concurrentes reciben el estado inicial y el cambio de escena.
func TestLiveStreamTresClientes(t *testing.T) {
	e := newEnv(t)
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("POST", "/api/v1/live/l1/iniciar", profe, false, map[string]any{}, ""); r.code != 200 {
		t.Fatalf("iniciar: %d", r.code)
	}

	salidas := make(chan []string, 3)
	for i := 0; i < 3; i++ {
		clienteStream(t, e.srv.URL+"/api/v1/live/l1/stream", profe, 2, salidas)
	}
	time.Sleep(300 * time.Millisecond)
	if r := e.call("PUT", "/api/v1/live/l1/escena", profe, false, map[string]any{"escena": "03-tu-laptop", "visible": true}, ""); r.code != 200 {
		t.Fatalf("cambio de escena: %d", r.code)
	}

	deadline := time.After(5 * time.Second)
	for got := 0; got < 3; got++ {
		select {
		case bs := <-salidas:
			var eventos []string
			for _, b := range bs {
				if strings.HasPrefix(b, "event: ") {
					eventos = append(eventos, b)
				}
			}
			estados, nueva := 0, false
			for _, b := range eventos {
				if strings.HasPrefix(b, "event: estado") {
					estados++
					if strings.Contains(b, `"escena":"03-tu-laptop"`) {
						nueva = true
					}
				}
			}
			if estados < 2 || !nueva {
				t.Fatalf("eventos del cliente %d: %v", got, eventos)
			}
		case <-deadline:
			t.Fatalf("solo %d de 3 clientes terminaron", got)
		}
	}
}

// newEnvEscenas: el fixture normal más dos escenas en live/l1 (la segunda con un paso del ciclo).
func newEnvEscenas(t *testing.T) *env {
	t.Helper()
	dir := writeFixture(t)
	escenas := map[string]string{
		"01-uno/escena.yaml": "id: 01-uno\ntitulo: Uno\nfase: experiencia\nduracion_min: 5\n",
		"01-uno/escena.html": "<!doctype html><html><body><h1>Uno</h1></body></html>",
		"02-dos/escena.yaml": "id: 02-dos\ntitulo: Dos\nfase: reflexion\npaso: hacer\nduracion_min: 8\nlo_logre: true\numbral_pct: 70\ncomandos:\n  - {titulo: Estado, cmd: \"jmd status\"}\n",
		"02-dos/escena.html": "<!doctype html><html><body><h1>Dos</h1></body></html>",
	}
	escenas["01-uno/dato.json"] = `{"ok":true}`
	escenas["01-uno/secreto.txt"] = "no debe salir"
	for rel, body := range escenas {
		ruta := filepath.Join(dir, "courses", "curso", "live", "l1", filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(ruta), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(ruta, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	comun := filepath.Join(dir, "courses", "curso", "live", "_comun")
	if err := os.MkdirAll(comun, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(comun, "lib.js"), []byte("export const x = 1;"), 0o644); err != nil {
		t.Fatal(err)
	}
	cs, err := content.NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	db, err := store.Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c1", PublicURL: "http://lms.test"}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	hash, _ := auth.HashPassword("profe1234")
	if err := db.CreateUser(t.Context(), &store.User{Email: "profe@x.test", Name: "Profe", PasswordHash: hash, Roles: []string{"admin", "instructor"}}); err != nil {
		t.Fatal(err)
	}
	return &env{t: t, srv: srv, db: db}
}

// La lista sale en orden con los defaults aplicados; el HTML sale con CSP y SAMEORIGIN; una escena
// desconocida da 404; iniciar arranca en la primera escena; cambiar a una escena inexistente, 404.
func TestLiveEscenasLista(t *testing.T) {
	e := newEnvEscenas(t)
	profe := e.login("profe@x.test", "profe1234")

	r := e.call("GET", "/api/v1/live/l1/escenas", profe, false, nil, "")
	if r.code != 200 || len(r.list) != 2 {
		t.Fatalf("lista: %d %s", r.code, r.raw)
	}
	if r.list[0]["id"] != "01-uno" || r.list[1]["id"] != "02-dos" {
		t.Fatalf("orden: %v", r.list)
	}
	if r.list[0]["umbral_pct"] != float64(80) || r.list[0]["compuerta"] != "ninguna" {
		t.Errorf("defaults de la primera: %v", r.list[0])
	}
	if r.list[1]["compuerta"] != "lo_logre" || r.list[1]["umbral_pct"] != float64(70) || r.list[1]["orden"] != float64(2) {
		t.Errorf("la segunda: %v", r.list[1])
	}

	h := e.call("GET", "/api/v1/live/l1/escenas/02-dos/html", profe, false, nil, "")
	if h.code != 200 || !strings.HasPrefix(string(h.raw), "<!doctype html>") {
		t.Fatalf("html: %d %q", h.code, h.raw)
	}
	if ct := h.hdr.Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Errorf("Content-Type: %q", ct)
	}
	if csp := h.hdr.Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'none'") || strings.Contains(csp, "http") {
		t.Errorf("CSP: %q", csp)
	}
	if xf := h.hdr.Get("X-Frame-Options"); xf != "SAMEORIGIN" {
		t.Errorf("X-Frame-Options: %q", xf)
	}
	if n := e.call("GET", "/api/v1/live/l1/escenas/../../etc/html", profe, false, nil, ""); n.code == 200 {
		t.Errorf("ruta fuera de la carpeta: %d", n.code)
	}
	if n := e.call("GET", "/api/v1/live/l1/escenas/99-no/html", profe, false, nil, ""); n.code != 404 {
		t.Errorf("escena desconocida: %d", n.code)
	}
	if n := e.call("GET", "/api/v1/live/l1/escenas", "", false, nil, ""); n.code != 401 {
		t.Errorf("sin sesión: %d", n.code)
	}

	if i := e.call("POST", "/api/v1/live/l1/iniciar", profe, false, map[string]any{}, ""); i.code != 200 || i.body["escena"] != "01-uno" {
		t.Fatalf("iniciar debe arrancar en la primera escena: %d %v", i.code, i.body)
	}
	if n := e.call("PUT", "/api/v1/live/l1/escena", profe, false, map[string]any{"escena": "99-no", "visible": true}, ""); n.code != 404 {
		t.Errorf("escena inexistente: %d %s", n.code, n.raw)
	}
}

// Archivos hermanos y comunes: lo permitido sale con su tipo; escena.yaml, escena.html, extensiones
// fuera de lista, nombres con separadores y carpetas ajenas dan 404; sin sesión, 401.
func TestLiveEscenaArchivos(t *testing.T) {
	e := newEnvEscenas(t)
	profe := e.login("profe@x.test", "profe1234")

	if r := e.call("GET", "/api/v1/live/l1/escenas/01-uno/dato.json", profe, false, nil, ""); r.code != 200 || !strings.Contains(r.hdr.Get("Content-Type"), "application/json") {
		t.Fatalf("hermano permitido: %d %s", r.code, r.hdr.Get("Content-Type"))
	}
	if r := e.call("GET", "/api/v1/live/l1/comun/lib.js", profe, false, nil, ""); r.code != 200 || !strings.HasPrefix(r.hdr.Get("Content-Type"), "text/javascript") || r.hdr.Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("común: %d %v", r.code, r.hdr)
	}
	for _, ruta := range []string{
		"/api/v1/live/l1/escenas/01-uno/escena.yaml",
		"/api/v1/live/l1/escenas/01-uno/escena.html",
		"/api/v1/live/l1/escenas/01-uno/secreto.txt",
		"/api/v1/live/l1/escenas/01-uno/%2e%2e%2fescena.json",
		"/api/v1/live/l1/escenas/01-uno/..%2f02-dos%2fescena.html",
		"/api/v1/live/l1/escenas/01-uno/.oculto.js",
		"/api/v1/live/l1/escenas/99-no/dato.json",
		"/api/v1/live/l1/comun/nada.js",
		"/api/v1/live/l1/comun/..%2f..%2flessons%2fl1.md",
	} {
		if r := e.call("GET", ruta, profe, false, nil, ""); r.code != 404 {
			t.Errorf("%s debía dar 404, dio %d", ruta, r.code)
		}
	}
	if r := e.call("GET", "/api/v1/live/l1/comun/lib.js", "", false, nil, ""); r.code != 401 {
		t.Errorf("sin sesión: %d", r.code)
	}
}

// El parámetro libre de PUT /escena viaja en el estado, se conserva dentro de la misma escena,
// se borra al cambiar de escena y rechaza valores fuera de formato.
func TestLiveParametroEscena(t *testing.T) {
	e := newEnvEscenas(t)
	profe := e.login("profe@x.test", "profe1234")
	put := func(in map[string]any) resp { return e.call("PUT", "/api/v1/live/l1/escena", profe, false, in, "") }

	if r := put(map[string]any{"escena": "02-dos", "visible": true, "parametro": "pensando"}); r.code != 200 || r.body["parametro"] != "pensando" {
		t.Fatalf("poner parámetro: %d %s", r.code, r.raw)
	}
	if r := put(map[string]any{"escena": "02-dos", "visible": false}); r.body["parametro"] != "pensando" {
		t.Errorf("misma escena sin parámetro debe conservarlo: %v", r.body)
	}
	if r := e.call("GET", "/api/v1/live/l1", profe, false, nil, ""); r.body["parametro"] != "pensando" {
		t.Errorf("GET debe traerlo: %v", r.body)
	}
	if r := put(map[string]any{"escena": "01-uno", "visible": true}); r.body["parametro"] != "" {
		t.Errorf("otra escena lo borra: %v", r.body)
	}
	if r := put(map[string]any{"escena": "01-uno", "parametro": "Feliz!"}); r.code != 400 {
		t.Errorf("formato inválido: %d %s", r.code, r.raw)
	}
}

// Sobre la función pura: 7 de 10 no pasa con umbral 80; 8 sí; sin presentes nunca; el porcentaje baja.
func TestCompuertaUmbral(t *testing.T) {
	hacer := func(n, ok int) ([]alumnoLive, map[string]string) {
		pres := []alumnoLive{}
		mot := map[string]string{}
		for i := 0; i < n; i++ {
			sub := string(rune('a' + i))
			pres = append(pres, alumnoLive{Sub: sub, Nombre: sub})
			if i < ok {
				mot[sub] = "lo_logre"
			}
		}
		return pres, mot
	}
	p, m := hacer(10, 7)
	if c := calcularCompuerta(p, m, 80); c.Pct != 70 || c.Pasa || len(c.Faltan) != 3 || len(c.Cumplieron) != 7 {
		t.Errorf("7 de 10: %+v", c)
	}
	p, m = hacer(10, 8)
	if c := calcularCompuerta(p, m, 80); c.Pct != 80 || !c.Pasa {
		t.Errorf("8 de 10: %+v", c)
	}
	if c := calcularCompuerta(nil, nil, 80); c.Pasa || c.Pct != 0 {
		t.Errorf("sin presentes: %+v", c)
	}
	p, m = hacer(9, 7)
	if c := calcularCompuerta(p, m, 78); c.Pct != 77 || c.Pasa {
		t.Errorf("7 de 9 redondea hacia abajo: %+v", c)
	}
}

// La ruta cuenta solo a los alumnos presentes, suma la evidencia y deja pasar igual con constancia.
func TestLiveCompuertaRuta(t *testing.T) {
	e := newEnvEscenas(t)
	profe := e.login("profe@x.test", "profe1234")
	for _, n := range []string{"ana", "beto"} {
		if r := e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": n + "@x.test", "name": n, "password": n + "-1234", "invite_code": "abc"}, ""); r.code != 201 {
			t.Fatalf("registro %s: %d %s", n, r.code, r.raw)
		}
	}
	ana, beto := e.login("ana@x.test", "ana-1234"), e.login("beto@x.test", "beto-1234")
	e.call("POST", "/api/v1/live/l1/iniciar", profe, false, map[string]any{}, "")
	e.call("PUT", "/api/v1/live/l1/escena", profe, false, map[string]any{"escena": "02-dos", "visible": true}, "")
	e.call("POST", "/api/v1/live/l1/latido", ana, false, map[string]any{"escena": "02-dos"}, "")
	e.call("POST", "/api/v1/live/l1/latido", beto, false, map[string]any{"escena": "02-dos"}, "")
	e.call("POST", "/api/v1/live/l1/latido", profe, false, map[string]any{"escena": "02-dos"}, "")

	if r := e.call("GET", "/api/v1/live/l1/compuerta", ana, false, nil, ""); r.code != 403 {
		t.Fatalf("alumno no ve la compuerta: %d", r.code)
	}
	r := e.call("GET", "/api/v1/live/l1/compuerta", profe, false, nil, "")
	if r.code != 200 || r.body["pasa"] != false || r.body["umbral_pct"] != float64(70) || len(r.body["faltan"].([]any)) != 2 {
		t.Fatalf("dos presentes sin cumplir (el instructor no cuenta): %d %s", r.code, r.raw)
	}
	// Una evidencia de Ana: 1 de 2 = 50 %, sigue sin pasar con umbral 70.
	us, _ := e.db.UserByEmail(t.Context(), "ana@x.test")
	if err := e.db.PonerEvidencia(t.Context(), us.ID, "l1", "02-dos", "microfono", "x"); err != nil {
		t.Fatal(err)
	}
	r = e.call("GET", "/api/v1/live/l1/compuerta", profe, false, nil, "")
	if r.body["pct"] != float64(50) || r.body["pasa"] != false || len(r.body["cumplieron"].([]any)) != 1 {
		t.Fatalf("una evidencia: %s", r.raw)
	}
	if p := e.call("POST", "/api/v1/live/l1/pasar-igual", profe, false, map[string]any{"escena": "02-dos"}, ""); p.code != 200 {
		t.Fatalf("pasar igual: %d %s", p.code, p.raw)
	}
	if p := e.call("POST", "/api/v1/live/l1/pasar-igual", profe, false, map[string]any{"escena": "99-no"}, ""); p.code != 404 {
		t.Errorf("pasar igual a escena inexistente: %d", p.code)
	}
}

// Los cuatro colores del semáforo.
func TestSemaforo(t *testing.T) {
	ahora := time.Now().UTC()
	fresco := func() *presente { return &presente{Visto: ahora, UltimoEvento: "terminal", UltimoT: ahora} }
	if got := semaforo(fresco(), true, ahora); got != "verde" {
		t.Errorf("cumplió: %s", got)
	}
	if got := semaforo(&presente{Visto: ahora.Add(-41 * time.Second)}, false, ahora); got != "gris" {
		t.Errorf("sin latido: %s", got)
	}
	if got := semaforo(fresco(), false, ahora); got != "ambar" {
		t.Errorf("activo: %s", got)
	}
	e := fresco()
	e.Errores = 3
	if got := semaforo(e, false, ahora); got != "rojo" {
		t.Errorf("tres errores: %s", got)
	}
	q := &presente{Visto: ahora, UltimoEvento: "terminal", UltimoT: ahora.Add(-3 * time.Minute)}
	if got := semaforo(q, false, ahora); got != "rojo" {
		t.Errorf("sin actividad: %s", got)
	}
}

// El evento valida el tipo y el detalle, y alimenta lo último que hizo el alumno.
func TestLiveEvento(t *testing.T) {
	e := newEnvEscenas(t)
	e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": "ana@x.test", "name": "Ana", "password": "ana-1234", "invite_code": "abc"}, "")
	ana := e.login("ana@x.test", "ana-1234")
	e.call("POST", "/api/v1/live/l1/latido", ana, false, map[string]any{"escena": "01-uno"}, "")
	if r := e.call("POST", "/api/v1/live/l1/evento", ana, false, map[string]any{"tipo": "hackeo"}, ""); r.code != 400 {
		t.Errorf("tipo inválido: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l1/evento", ana, false, map[string]any{"tipo": "terminal", "detalle": strings.Repeat("x", 81)}, ""); r.code != 400 {
		t.Errorf("detalle largo: %d", r.code)
	}
	for _, tipo := range []string{"error", "error", "error"} {
		if r := e.call("POST", "/api/v1/live/l1/evento", ana, false, map[string]any{"tipo": tipo, "detalle": "sh: x"}, ""); r.code != 200 {
			t.Fatalf("evento: %d %s", r.code, r.raw)
		}
	}
}

// Diez presentes dan cinco pares; nueve, tres grupos con un trío; uno, un grupo de uno; nadie queda solo con 3 o más.
func TestEmparejar(t *testing.T) {
	subs := func(n int) []string {
		out := make([]string, n)
		for i := range out {
			out[i] = string(rune('a' + i))
		}
		return out
	}
	cuenta := func(g [][]string) (tamanos []int, total int) {
		for _, x := range g {
			tamanos = append(tamanos, len(x))
			total += len(x)
		}
		return
	}
	if tam, total := cuenta(emparejar(subs(10), 1)); len(tam) != 5 || total != 10 {
		t.Errorf("10: %v", tam)
	}
	g := emparejar(subs(9), 2)
	if tam, total := cuenta(g); len(tam) != 4 || total != 9 || tam[3] != 3 {
		t.Errorf("9: %v", tam)
	}
	if tam, _ := cuenta(emparejar(subs(1), 3)); len(tam) != 1 || tam[0] != 1 {
		t.Errorf("1: %v", tam)
	}
	if len(emparejar(nil, 4)) != 0 {
		t.Errorf("0 presentes")
	}
	a, b := emparejar(subs(8), 5), emparejar(subs(8), 5)
	if len(a) != len(b) || a[0][0] != b[0][0] {
		t.Errorf("misma semilla debe dar lo mismo")
	}
}

// El mensaje a uno llega solo a su stream; el mensaje a todos queda en el estado.
func TestLiveMensajeDirigido(t *testing.T) {
	e := newEnvEscenas(t)
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("POST", "/api/v1/live/l1/mensaje", profe, false, map[string]any{"texto": strings.Repeat("x", 201)}, ""); r.code != 400 {
		t.Errorf("texto largo: %d", r.code)
	}
	e.call("POST", "/api/v1/live/l1/iniciar", profe, false, map[string]any{}, "")
	if r := e.call("POST", "/api/v1/live/l1/mensaje", profe, false, map[string]any{"texto": "hola a todos", "para": "todos"}, ""); r.code != 200 {
		t.Fatalf("a todos: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/live/l1", profe, false, nil, ""); r.body["mensaje"] != "hola a todos" {
		t.Errorf("el estado guarda el mensaje: %v", r.body)
	}
	// Dirigido: probado sobre el hub (la entrega por stream ya la cubre TestLiveStreamTresClientes).
	h := newLiveHub()
	a, bajaA := h.subscribe("l1", "A", false)
	defer bajaA()
	b, bajaB := h.subscribe("l1", "B", false)
	defer bajaB()
	h.publishUser("l1", "A", "mensaje", map[string]any{"texto": "ayuda"})
	select {
	case m := <-a.ch:
		if !strings.Contains(string(m), "event: mensaje") {
			t.Errorf("A recibió otra cosa: %q", m)
		}
	default:
		t.Error("A no recibió")
	}
	select {
	case m := <-b.ch:
		t.Errorf("B no debía recibir: %q", m)
	default:
	}
}
