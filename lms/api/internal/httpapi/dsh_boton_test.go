package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Lo que el motor falso de las demás pruebas necesita para cumplir AulaMotor.
func (a *aulaFalsa) ExecTope(ctx context.Context, nombre, script string, stdin []byte, _ time.Duration) (string, error) {
	return a.ExecStdin(ctx, nombre, script, stdin)
}
func (a *aulaFalsa) Inicio(_ context.Context, id string) string {
	if a.Estado(context.Background(), id) == "corriendo" {
		return "2026-10-31T12:00:00.000000000Z"
	}
	return ""
}

const claveClase = "sk-xxxxxxxxxxxxxxxxxxxx" // falsa: la de prueba de siempre

// aulaDsh simula lo que hace «aula dsh …» dentro del aula y registra cada script y su stdin.
type aulaDsh struct {
	*aulaFalsa
	mu      sync.Mutex
	clave   string
	rele    string // stdin recibido por «aula dsh rele -»
	web     bool
	inicio  string
	sub     string   // el enlace que devuelve «aula dsh abrir» lleva el sub del alumno
	scripts []string // todo lo que iría en la línea de comandos («sh -c <script>»)
	stdins  []string
}

func nuevaAulaDsh() *aulaDsh {
	return &aulaDsh{aulaFalsa: &aulaFalsa{}, inicio: "2026-10-31T12:00:00.000000000Z"}
}

func (a *aulaDsh) modo() string {
	switch {
	case a.clave != "":
		return "propia"
	case a.rele != "":
		return "global"
	}
	return "ninguna"
}

func (a *aulaDsh) Exec(ctx context.Context, nombre string, cmd ...string) (string, error) {
	c := strings.Join(cmd, " ")
	a.mu.Lock()
	a.scripts = append(a.scripts, c)
	out, propio := "", true
	switch c {
	case "aula dsh modo":
		w := "parada"
		if a.web {
			w = "arrancada"
		}
		out = a.modo() + " " + w
	case "aula dsh olvidar":
		a.clave = ""
		out = "Clave borrada de esta aula."
	case "aula dsh rele borrar":
		a.rele = ""
		out = "relé borrado"
	default:
		propio = false
	}
	a.mu.Unlock()
	if propio {
		return out, nil
	}
	return a.aulaFalsa.Exec(ctx, nombre, cmd...)
}

func (a *aulaDsh) ExecTope(ctx context.Context, nombre, script string, stdin []byte, tope time.Duration) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.scripts = append(a.scripts, script)
	a.stdins = append(a.stdins, string(stdin))
	switch script {
	case "aula dsh clave -":
		a.clave = strings.TrimSpace(string(stdin))
		return "clave guardada", nil
	case "aula dsh rele -":
		a.rele = string(stdin)
		return "relé guardado", nil
	case "aula dsh abrir":
		if a.modo() == "ninguna" {
			return "Aún no me diste tu clave de DeepSeek. Primero: aula dsh clave", fmt.Errorf("exit status 3")
		}
		a.web = true
		return "Arrancando la interfaz web de dsh …\nLista.\nURL https://jmd-learn.online/dsh/" + a.sub + "/?token=ARRANQUE", nil
	}
	return "", nil
}

func (a *aulaDsh) Inicio(ctx context.Context, id string) string {
	if a.aulaFalsa.Estado(ctx, id) != "corriendo" {
		return ""
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.inicio
}

func botonEnv(t *testing.T) (*env, *aulaDsh, string, string, string) {
	t.Helper()
	f := nuevaAulaDsh()
	e, ana, beto, idAna, _ := vistaEnv(t, &aulaFalsa{})
	f.sub = idAna
	e.setAula(f)
	return e, f, ana, beto, idAna
}

// jsonReq: petición del front (cookie, JSON y Origin propio salvo que cab diga otra cosa).
func jsonReq(t *testing.T, e *env, metodo, ruta, token string, cookie bool, cab map[string]string, cuerpo any) (int, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(cuerpo)
	c := map[string]string{"Content-Type": "application/json", "Origin": "https://jmd-learn.online"}
	for k, v := range cab {
		if v == "" {
			delete(c, k)
		} else {
			c[k] = v
		}
	}
	res, raw := dshReq(t, e, metodo, ruta, token, cookie, c, string(b))
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	return res.StatusCode, m
}

func codigoErr(m map[string]any) string {
	if e, ok := m["error"].(map[string]any); ok {
		s, _ := e["code"].(string)
		return s
	}
	return ""
}

func TestDshBotonSinClave409YConClavePropia(t *testing.T) {
	e, f, ana, _, idAna := botonEnv(t)
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{}); c != 409 || codigoErr(m) != "sin_clave" {
		t.Fatalf("sin clave: %d %v", c, m)
	}
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/clave", ana, true, nil, map[string]string{"clave": "  " + claveClase + "\n"}); c != 200 || m["clave"] != "propia" {
		t.Fatalf("guardar: %d %v", c, m)
	}
	if f.clave != claveClase {
		t.Fatalf("la clave no llegó por stdin: %q", f.clave)
	}
	c, m := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{})
	if c != 200 || m["modo"] != "propia" || m["url"] != "/dsh/"+idAna+"/?token=ARRANQUE" {
		t.Fatalf("abrir: %d %v", c, m)
	}
	if c, m := jsonReq(t, e, "GET", "/api/v1/dsh", ana, true, nil, nil); c != 200 || m["clave"] != "propia" || m["web"] != true {
		t.Fatalf("estado: %d %v", c, m)
	}
	// La clave nunca va en la línea de comandos.
	for _, s := range f.scripts {
		if strings.Contains(s, claveClase) {
			t.Fatalf("la clave apareció en un script: %q", s)
		}
	}
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/olvidar", ana, true, nil, map[string]any{}); c != 200 || m["propia"] != false || f.clave != "" {
		t.Fatalf("olvidar: %d %v", c, m)
	}
}

func TestDshBotonClaveInvalida(t *testing.T) {
	e, f, ana, _, _ := botonEnv(t)
	for _, k := range []string{"", "corta", `"sk-xxxxxxxxxxxx"`, "sk-xxxx xxxx;rm -rf /", strings.Repeat("a", 300)} {
		if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/clave", ana, true, nil, map[string]string{"clave": k}); c != 400 || codigoErr(m) != "clave_invalida" {
			t.Errorf("%q: %d %v", k, c, m)
		}
	}
	if f.clave != "" {
		t.Fatal("una clave inválida llegó al aula")
	}
	if c, _ := jsonReq(t, e, "POST", "/api/v1/dsh/clave", ana, true, nil, map[string]string{"clave": claveClase, "sub": "otro"}); c != 400 {
		t.Errorf("campos de más (p. ej. el sub de otro): %d", c)
	}
}

// CSRF: con cookie, las escrituras exigen JSON y Origin propio. Sin sesión, 401.
func TestDshBotonCSRFYPermisos(t *testing.T) {
	e, f, ana, _, _ := botonEnv(t)
	for _, ruta := range []string{"/api/v1/dsh/abrir", "/api/v1/dsh/clave", "/api/v1/dsh/olvidar"} {
		cuerpo := map[string]string{"clave": claveClase}
		if ruta != "/api/v1/dsh/clave" {
			cuerpo = map[string]string{}
		}
		if c, _ := jsonReq(t, e, "POST", ruta, "", false, nil, cuerpo); c != 401 {
			t.Errorf("%s sin sesión: %d", ruta, c)
		}
		if c, _ := jsonReq(t, e, "POST", ruta, ana, true, map[string]string{"Origin": "https://evil.example"}, cuerpo); c != 403 {
			t.Errorf("%s Origin ajeno: %d", ruta, c)
		}
		if c, _ := jsonReq(t, e, "POST", ruta, ana, true, map[string]string{"Origin": "", "Sec-Fetch-Site": "cross-site"}, cuerpo); c != 403 {
			t.Errorf("%s cross-site sin Origin: %d", ruta, c)
		}
		if c, _ := jsonReq(t, e, "POST", ruta, ana, true, map[string]string{"Content-Type": "text/plain"}, cuerpo); c != 403 {
			t.Errorf("%s sin JSON: %d", ruta, c)
		}
	}
	if f.clave != "" || f.web {
		t.Fatal("una petición rechazada llegó al aula")
	}
	// Con Bearer (jmd, scripts) no aplica la regla del Origin.
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/clave", ana, false, map[string]string{"Origin": "https://evil.example"}, map[string]string{"clave": claveClase}); c != 200 {
		t.Errorf("Bearer: %d %v", c, m)
	}
	if c, _ := jsonReq(t, e, "GET", "/api/v1/dsh", "", false, nil, nil); c != 401 {
		t.Errorf("estado sin sesión: %d", c)
	}
}

func TestDshBotonSinAula503(t *testing.T) {
	e := newEnv(t)
	tok := e.register("x@x.test")
	if c, _ := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", tok, false, nil, map[string]any{}); c != 503 {
		t.Fatalf("sin motor: %d", c)
	}
}

func iaConfig(up string, claves map[string]string) *IAConfig {
	return &IAConfig{Claves: claves, Secreto: []byte("semilla-de-prueba-0123456789abcdef"), Upstream: up}
}

// Grupo con clave de la clase: al aula entra un token y la URL del relé, nunca la clave.
func TestDshBotonClaveDeLaClase(t *testing.T) {
	e, f, ana, _, idAna := botonEnv(t)
	e.s.IA = iaConfig("http://deepseek.invalid/anthropic", map[string]string{"c1": claveClase})
	if c, m := jsonReq(t, e, "GET", "/api/v1/dsh", ana, true, nil, nil); c != 200 || m["clave"] != "clase" || m["clase"] != true {
		t.Fatalf("estado: %d %v", c, m)
	}
	c, m := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{})
	if c != 200 || m["modo"] != "clase" {
		t.Fatalf("abrir: %d %v", c, m)
	}
	lineas := strings.Split(strings.TrimSpace(f.rele), "\n")
	if len(lineas) != 2 || lineas[0] != e.s.IA.Token(idAna, f.inicio) || lineas[1] != "http://lms.test/api/v1/ia/anthropic" {
		t.Fatalf("relé: %q", f.rele)
	}
	for _, s := range append(append([]string{}, f.scripts...), f.stdins...) {
		if strings.Contains(s, claveClase) {
			t.Fatalf("la clave de la clase entró al aula: %q", s)
		}
	}
	// Con clave propia, manda la propia (el relé ni se toca).
	f.rele = ""
	jsonReq(t, e, "POST", "/api/v1/dsh/clave", ana, true, nil, map[string]string{"clave": "sk-propia-yyyyyyyyyyyy"})
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{}); c != 200 || m["modo"] != "propia" || f.rele != "" {
		t.Fatalf("propia antes que la de la clase: %d %v rele=%q", c, m, f.rele)
	}
	// Un grupo que pierde la clave de la clase: se borra el relé y se pide la clave propia.
	jsonReq(t, e, "POST", "/api/v1/dsh/olvidar", ana, true, nil, map[string]any{})
	f.rele = "viejo"
	e.s.IA = iaConfig("http://deepseek.invalid/anthropic", map[string]string{"otro-grupo": claveClase})
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{}); c != 409 || f.rele != "" {
		t.Fatalf("sin grupo con clave: %d %v rele=%q", c, m, f.rele)
	}
}

func TestEnlaceDsh(t *testing.T) {
	casos := map[string]string{
		"URL https://jmd-learn.online/dsh/u1/?token=abc":   "/dsh/u1/?token=abc",
		"URL http://localhost:18932/dsh/u1/?token=abc&x=1": "/dsh/u1/?token=abc&x=1",
		"URL https://jmd-learn.online/dsh/u2/?token=abc":   "",
		"URL https://jmd-learn.online/otra/u1/":            "",
		"URL javascript:alert(1)":                          "",
		"https://jmd-learn.online/dsh/u1/":                 "",
	}
	for in, quiero := range casos {
		got, ok := enlaceDsh(in, "u1")
		if (quiero == "") == ok || got != quiero {
			t.Errorf("%q → %q %v, quiero %q", in, got, ok, quiero)
		}
	}
}

// --- relé ---------------------------------------------------------------------------------------------

type deepseekFalso struct {
	mu      sync.Mutex
	pedidos []*http.Request
	cuerpos []string
	estado  int
	cuerpo  string        // respuesta JSON si estado != 200
	pausa   chan struct{} // si no es nil, el SSE espera aquí entre el primer y el segundo evento
}

func (d *deepseekFalso) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	b, _ := io.ReadAll(r.Body)
	d.mu.Lock()
	d.pedidos = append(d.pedidos, r.Clone(context.Background()))
	d.cuerpos = append(d.cuerpos, string(b))
	estado, cuerpo, pausa := d.estado, d.cuerpo, d.pausa
	d.mu.Unlock()
	if estado != 0 && estado != 200 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(estado)
		_, _ = io.WriteString(w, cuerpo)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Set-Cookie", "rastreo=1")
	fl := w.(http.Flusher)
	_, _ = io.WriteString(w, "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":120,\"cache_read_input_tokens\":30,\"output_tokens\":1}}}\n\n")
	fl.Flush()
	if pausa != nil {
		<-pausa
	}
	_, _ = io.WriteString(w, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"TEXTO-PRIVADO\"}}\n\n")
	_, _ = io.WriteString(w, "event: message_delta\ndata: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":45}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n")
}

func releEnv(t *testing.T, ds *deepseekFalso) (*env, *aulaDsh, string, string, string) {
	t.Helper()
	e, f, ana, beto, idAna := botonEnv(t)
	up := httptest.NewServer(ds)
	t.Cleanup(up.Close)
	e.s.IA = iaConfig(up.URL+"/anthropic", map[string]string{"c1": claveClase})
	f.aulaFalsa.Crear(context.Background(), idAna)
	return e, f, ana, beto, idAna
}

func releReq(t *testing.T, e *env, metodo, ruta, token string, cab map[string]string, cuerpo string) (*http.Response, []byte) {
	t.Helper()
	req, _ := http.NewRequest(metodo, e.srv.URL+"/api/v1/ia/anthropic/"+ruta, strings.NewReader(cuerpo))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Anthropic-Version", "2023-06-01")
	if token != "" {
		req.Header.Set("X-Api-Key", token)
	}
	for k, v := range cab {
		req.Header.Set(k, v)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res, b
}

func TestIAReleReenviaConLaClaveDeLaClaseYSinBufer(t *testing.T) {
	ds := &deepseekFalso{pausa: make(chan struct{})}
	e, f, _, _, idAna := releEnv(t, ds)
	tok := e.s.IA.Token(idAna, f.inicio)

	req, _ := http.NewRequest("POST", e.srv.URL+"/api/v1/ia/anthropic/v1/messages?beta=true", strings.NewReader(`{"stream":true}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Api-Key", tok)
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("Cookie", "lms_session=SESION")
	req.Header.Set("X-Forwarded-For", "10.0.0.9")
	req.Header.Set("Anthropic-Beta", "files-api-2025-04-14")
	req.Header.Set("X-Deepseek-Harness-Session-Id", "7")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 || res.Header.Get("X-Accel-Buffering") != "no" || res.Header.Get("Set-Cookie") != "" {
		t.Fatalf("respuesta: %d %v", res.StatusCode, res.Header)
	}
	// El primer evento llega ANTES de que DeepSeek termine (sin búfer).
	primero := make([]byte, 64)
	listo := make(chan int, 1)
	go func() { n, _ := io.ReadAtLeast(res.Body, primero, 20); listo <- n }()
	select {
	case <-listo:
	case <-time.After(3 * time.Second):
		t.Fatal("el primer evento SSE no llegó mientras DeepSeek seguía: hay búfer")
	}
	if !strings.HasPrefix(string(primero), "event: message_start") {
		t.Fatalf("primer trozo: %q", primero)
	}
	close(ds.pausa)
	resto, _ := io.ReadAll(res.Body)
	if !strings.Contains(string(resto), "message_stop") {
		t.Fatalf("faltó el final: %q", resto)
	}
	ds.mu.Lock()
	p := ds.pedidos[0]
	ds.mu.Unlock()
	if p.URL.Path != "/anthropic/v1/messages" || p.URL.RawQuery != "beta=true" {
		t.Errorf("destino: %s?%s", p.URL.Path, p.URL.RawQuery)
	}
	if p.Header.Get("X-Api-Key") != claveClase || p.Header.Get("Authorization") != "" || p.Header.Get("Cookie") != "" ||
		p.Header.Get("X-Forwarded-For") != "" || p.Header.Get("Anthropic-Beta") != "files-api-2025-04-14" || p.Header.Get("X-Deepseek-Harness-Session-Id") != "7" {
		t.Errorf("cabeceras hacia DeepSeek: %v", p.Header)
	}
	_, uso := e.s.IA.Uso()
	if k := uso[idAna]; k.Peticiones != 1 || k.Entrada != 150 || k.Salida != 45 || k.Grupo != "c1" {
		t.Errorf("uso: %+v", k)
	}
}

func TestIAReleTokenInvalidoYAulaAjena(t *testing.T) {
	ds := &deepseekFalso{}
	e, f, _, _, idAna := releEnv(t, ds)
	ub, _ := e.db.UserByEmail(t.Context(), "beto@x.test")
	idBeto := ub.ID
	f.aulaFalsa.Crear(context.Background(), idBeto)
	bueno := e.s.IA.Token(idAna, f.inicio)
	deBeto := e.s.IA.Token(idBeto, f.inicio)
	_, macBeto, _ := subDeToken(deBeto)
	otroSecreto := (&IAConfig{Secreto: []byte("otro")}).Token(idAna, f.inicio)

	for nombre, tok := range map[string]string{
		"sin token":                         "",
		"basura":                            "sk-loquesea",
		"sub de Ana con la firma de Beto":   strings.Split(bueno, ".")[0] + "." + strings.Split(bueno, ".")[1] + "." + macBeto,
		"firmado con otro secreto":          otroSecreto,
		"de un arranque anterior del aula":  e.s.IA.Token(idAna, "2026-10-30T09:00:00Z"),
		"la clave de la clase como si nada": claveClase,
		"token sin prefijo":                 strings.TrimPrefix(bueno, iaPrefijoToken),
	} {
		if res, _ := releReq(t, e, "POST", "v1/messages", tok, nil, "{}"); res.StatusCode != 401 {
			t.Errorf("%s: %d", nombre, res.StatusCode)
		}
	}
	// Beto con su propio token sí pasa (su aula, su grupo).
	if res, _ := releReq(t, e, "POST", "v1/messages", deBeto, nil, "{}"); res.StatusCode != 200 {
		t.Errorf("Beto con su token: %d", res.StatusCode)
	}
	// Aula apagada: el token deja de valer (sin esperar a la caché).
	f.aulaFalsa.mu.Lock()
	f.aulaFalsa.corriendo[idAna] = false
	f.aulaFalsa.mu.Unlock()
	e.s.IA.olvidarInicio(idAna)
	if res, _ := releReq(t, e, "POST", "v1/messages", bueno, nil, "{}"); res.StatusCode != 401 {
		t.Errorf("aula apagada: %d", res.StatusCode)
	}
	// Grupo sin clave de la clase: 403.
	hash, _ := auth.HashPassword("otro-1234")
	if err := e.db.CreateUser(t.Context(), &store.User{Email: "c2@x.test", Name: "c2", PasswordHash: hash, Roles: []string{"student"}, Cohorts: []string{"c2"}}); err != nil {
		t.Fatal(err)
	}
	u2, _ := e.db.UserByEmail(t.Context(), "c2@x.test")
	f.aulaFalsa.Crear(context.Background(), u2.ID)
	res, b := releReq(t, e, "POST", "v1/messages", e.s.IA.Token(u2.ID, f.inicio), nil, "{}")
	if res.StatusCode != 403 || !strings.Contains(string(b), "permission_error") {
		t.Errorf("grupo sin clave de la clase: %d %s", res.StatusCode, b)
	}
	ds.mu.Lock()
	n := len(ds.pedidos)
	ds.mu.Unlock()
	if n != 1 {
		t.Fatalf("a DeepSeek solo debió llegar la de Beto: %d", n)
	}
}

func TestIAReleRutasNoPermitidas(t *testing.T) {
	ds := &deepseekFalso{}
	e, f, _, _, idAna := releEnv(t, ds)
	tok := e.s.IA.Token(idAna, f.inicio)
	for _, c := range []struct{ metodo, ruta string }{
		{"GET", "v1/messages"}, {"POST", "v1/complete"}, {"GET", "models"}, {"POST", "v1/files/abc"},
		{"GET", "v1/files/../../x"}, {"POST", "chat/completions"}, {"DELETE", "v1/files"},
	} {
		if res, _ := releReq(t, e, c.metodo, c.ruta, tok, nil, "{}"); res.StatusCode != 404 && res.StatusCode != 405 && res.StatusCode != 400 && res.StatusCode != 301 {
			t.Errorf("%s %s: %d", c.metodo, c.ruta, res.StatusCode)
		}
	}
	for _, c := range []struct{ metodo, ruta string }{{"POST", "v1/messages/count_tokens"}, {"GET", "v1/files"}, {"GET", "v1/files/file_1"}, {"DELETE", "v1/files/file_1"}} {
		if !iaRutaPermitida(c.metodo, c.ruta) {
			t.Errorf("debía permitir %s %s", c.metodo, c.ruta)
		}
	}
	if len(ds.pedidos) != 0 {
		t.Fatalf("una ruta no permitida llegó a DeepSeek: %d", len(ds.pedidos))
	}
}

func TestIAReleTopes(t *testing.T) {
	ds := &deepseekFalso{}
	e, f, _, _, idAna := releEnv(t, ds)
	e.s.IA.TopePeticiones = 2
	tok := e.s.IA.Token(idAna, f.inicio)
	for i := 0; i < 2; i++ {
		if res, _ := releReq(t, e, "POST", "v1/messages", tok, nil, "{}"); res.StatusCode != 200 {
			t.Fatalf("petición %d: %d", i+1, res.StatusCode)
		}
	}
	res, b := releReq(t, e, "POST", "v1/messages", tok, nil, "{}")
	if res.StatusCode != 429 || !strings.Contains(string(b), "usage_limit_reached") || !strings.Contains(string(b), "usage limit reached") {
		t.Fatalf("tope de peticiones: %d %s", res.StatusCode, b)
	}
	// Tope de tokens: ya van 390 (2 × (150 + 45)); con un tope de 300, la siguiente se rechaza.
	e.s.IA.TopePeticiones = 100
	e.s.IA.TopeTokens = 300
	if res, _ := releReq(t, e, "POST", "v1/messages", tok, nil, "{}"); res.StatusCode != 429 {
		t.Fatalf("tope de tokens: %d", res.StatusCode)
	}
	_, uso := e.s.IA.Uso()
	if k := uso[idAna]; k.Peticiones != 2 || k.Rechazadas != 2 || k.tokens() != 390 {
		t.Errorf("uso: %+v", k)
	}
	// El uso es por alumno y lo ve el instructor del grupo.
	profe := e.login("profe@x.test", "profe1234")
	r := e.call("GET", "/api/v1/ia/uso", profe, false, nil, "")
	if r.code != 200 || !strings.Contains(string(r.raw), `"peticiones":2`) || strings.Contains(string(r.raw), claveClase) {
		t.Errorf("uso del instructor: %d %s", r.code, r.raw)
	}
	ana := e.login("ana@x.test", "ana-1234")
	if r := e.call("GET", "/api/v1/ia/uso", ana, false, nil, ""); r.code != 403 {
		t.Errorf("un alumno no ve el uso: %d", r.code)
	}
}

func TestIAReleUsoSobreviveReinicio(t *testing.T) {
	arch := t.TempDir() + "/ia-uso.json"
	c := &IAConfig{Claves: map[string]string{"c1": claveClase}, Secreto: []byte("s"), Archivo: arch}
	c.iniciar()
	c.uso.mu.Lock()
	c.uso.contador("u1").Peticiones = 7
	c.uso.guardarSiToca(time.Now(), true)
	c.uso.mu.Unlock()
	c2 := &IAConfig{Claves: map[string]string{"c1": claveClase}, Secreto: []byte("s"), Archivo: arch}
	if _, uso := c2.Uso(); uso["u1"].Peticiones != 7 {
		t.Fatalf("uso tras reiniciar: %+v", uso)
	}
}

// El 401 de DeepSeek trae la clave enmascarada: no debe llegar al aula.
func TestIARele401DeDeepSeekNoFiltraLaClave(t *testing.T) {
	ds := &deepseekFalso{estado: 401, cuerpo: `{"error":{"message":"Authentication Fails, Your api key: ****xxxx is invalid","type":"authentication_error"}}`}
	e, f, _, _, idAna := releEnv(t, ds)
	res, b := releReq(t, e, "POST", "v1/messages", e.s.IA.Token(idAna, f.inicio), nil, "{}")
	if res.StatusCode != 401 || strings.Contains(string(b), "xxxx") || !strings.Contains(string(b), "authentication_error") || !strings.Contains(string(b), "API key is invalid") {
		t.Fatalf("401: %d %s", res.StatusCode, b)
	}
}

func TestIAReleApagadoSinClaves(t *testing.T) {
	e, f, _, _, idAna := botonEnv(t)
	f.aulaFalsa.Crear(context.Background(), idAna)
	if res, _ := releReq(t, e, "POST", "v1/messages", "jmdia.x.y", nil, "{}"); res.StatusCode != 503 {
		t.Fatalf("sin IA: %d", res.StatusCode)
	}
}

// En los logs: aula (hash), estado y tokens. Ni la clave, ni el token, ni el sub, ni el cuerpo.
func TestIAReleSinSecretosEnLogs(t *testing.T) {
	var buf bytes.Buffer
	var mu sync.Mutex
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&syncWriter{&mu, &buf}, nil)))
	defer slog.SetDefault(prev)
	ds := &deepseekFalso{}
	e, f, ana, _, idAna := releEnv(t, ds)
	tok := e.s.IA.Token(idAna, f.inicio)
	releReq(t, e, "POST", "v1/messages", tok, nil, `{"messages":[{"content":"PREGUNTA-PRIVADA"}]}`)
	releReq(t, e, "POST", "v1/messages", "jmdia.basura.0000000000000000000000000000000000000000", nil, "{}")
	ds.estado, ds.cuerpo = 401, `{"error":{"message":"key ****xxxx invalid"}}`
	releReq(t, e, "POST", "v1/messages", tok, nil, "{}")
	jsonReq(t, e, "POST", "/api/v1/dsh/clave", ana, true, nil, map[string]string{"clave": "sk-propia-zzzzzzzzzzzz"})
	jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{})
	mu.Lock()
	log := buf.String()
	mu.Unlock()
	if !strings.Contains(log, "msg=ia") || !strings.Contains(log, "tokens_entrada=150") || !strings.Contains(log, "estado=401") {
		t.Errorf("falta el registro de uso: %q", log)
	}
	for _, prohibido := range []string{claveClase, "xxxx", tok, strings.Split(tok, ".")[2], idAna, "PREGUNTA-PRIVADA", "TEXTO-PRIVADO", "sk-propia", "ARRANQUE"} {
		if strings.Contains(log, prohibido) {
			t.Errorf("el log contiene %q: %q", prohibido, log)
		}
	}
}

func TestIAMedidorSSETrozado(t *testing.T) {
	sse := "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":10,\"cache_creation_input_tokens\":5}}}\r\n\r\n" +
		"data: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":3}}\n\ndata: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":9,\"input_tokens\":12}}"
	for _, corte := range []int{1, 3, 7, 50} {
		m := &iaMedidor{rc: io.NopCloser(strings.NewReader("")), sse: true}
		for i := 0; i < len(sse); i += corte {
			j := min(i+corte, len(sse))
			m.alimentar([]byte(sse[i:j]))
		}
		m.terminar()
		if m.entrada != 15 || m.salida != 9 {
			t.Errorf("corte %d: entrada %d salida %d", corte, m.entrada, m.salida)
		}
	}
	m := &iaMedidor{rc: io.NopCloser(strings.NewReader(""))}
	m.alimentar([]byte(`{"id":"m","usage":{"input_tokens":4,"output_tokens":2}}`))
	m.terminar()
	if m.entrada != 4 || m.salida != 2 {
		t.Errorf("JSON: %d %d", m.entrada, m.salida)
	}
}
