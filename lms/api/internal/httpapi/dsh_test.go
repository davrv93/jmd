package httpapi

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// dshReq hace una petición «de navegador» al LMS de prueba: Host y Origin propios, sin seguir redirecciones.
func dshReq(t *testing.T, e *env, metodo, ruta, token string, cookie bool, cab map[string]string, cuerpo string) (*http.Response, []byte) {
	t.Helper()
	req, _ := http.NewRequest(metodo, e.srv.URL+ruta, strings.NewReader(cuerpo))
	req.Host = "jmd-learn.online"
	if token != "" {
		if cookie {
			req.AddCookie(&http.Cookie{Name: cookieName, Value: token})
		} else {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}
	for k, v := range cab {
		req.Header.Set(k, v)
	}
	cli := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err := cli.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res, b
}

func TestDshReenviaSinPrefijoConHostOriginalYQuery(t *testing.T) {
	var visto struct {
		sync.Mutex
		metodo, uri, host, origin, xfh, xfp string
		cuerpo                              string
	}
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		visto.Lock()
		visto.metodo, visto.uri, visto.host, visto.origin = r.Method, r.RequestURI, r.Host, r.Header.Get("Origin")
		visto.xfh, visto.xfp, visto.cuerpo = r.Header.Get("X-Forwarded-Host"), r.Header.Get("X-Forwarded-Proto"), string(b)
		visto.Unlock()
		if r.Header.Get("Authorization") != "" {
			t.Errorf("el Bearer del LMS no debe llegar a dsh")
		}
		w.Header().Set("Server", "dsh/1")
		w.Header().Set("X-Powered-By", "node")
		w.Header().Set("Referrer-Policy", "no-referrer")
		_, _ = w.Write([]byte("ok"))
	}))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})

	cab := map[string]string{"Origin": "https://jmd-learn.online", "X-Forwarded-Proto": "https"}
	res, raw := dshReq(t, e, "POST", "/dsh/"+idAna+"/api/chat%2Fx/arch?tok=abc123&b=2", ana, false, cab, "hola")
	if res.StatusCode != 200 || string(raw) != "ok" {
		t.Fatalf("reenvío: %d %s", res.StatusCode, raw)
	}
	visto.Lock()
	defer visto.Unlock()
	if visto.metodo != "POST" || visto.uri != "/api/chat%2Fx/arch?tok=abc123&b=2" {
		t.Errorf("ruta sin prefijo y con query: %s %s", visto.metodo, visto.uri)
	}
	if visto.host != "jmd-learn.online" || visto.origin != "https://jmd-learn.online" {
		t.Errorf("Host/Origin originales: host=%q origin=%q", visto.host, visto.origin)
	}
	if visto.xfh != "jmd-learn.online" || visto.xfp != "https" || visto.cuerpo != "hola" {
		t.Errorf("X-Forwarded: %q %q cuerpo=%q", visto.xfh, visto.xfp, visto.cuerpo)
	}
	h := res.Header
	if h.Get("Server") != "" || h.Get("X-Powered-By") != "" {
		t.Errorf("Server/X-Powered-By no deben salir: %v", h)
	}
	if v := h.Values("Referrer-Policy"); len(v) != 1 || v[0] != "same-origin" {
		t.Errorf("Referrer-Policy: %v", v)
	}
	if v := h.Values("X-Content-Type-Options"); len(v) != 1 || v[0] != "nosniff" {
		t.Errorf("nosniff: %v", v)
	}
	if v := h.Values("X-Frame-Options"); len(v) != 1 || v[0] != "SAMEORIGIN" {
		t.Errorf("X-Frame-Options: %v", v)
	}
	if h.Get("Content-Security-Policy") != "" {
		t.Errorf("no se añade CSP: %v", h)
	}
}

// Todos los métodos llegan; /dsh/<sub> sin barra redirige conservando la query.
func TestDshMetodosYRaiz(t *testing.T) {
	var mu sync.Mutex
	var metodos []string
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		metodos = append(metodos, r.Method+" "+r.URL.Path)
		mu.Unlock()
	}))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	for _, m := range []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"} {
		if res, _ := dshReq(t, e, m, "/dsh/"+idAna+"/x", ana, false, nil, ""); res.StatusCode != 200 {
			t.Errorf("%s: %d", m, res.StatusCode)
		}
	}
	if len(metodos) != 7 {
		t.Errorf("deben llegar los 7 métodos: %v", metodos)
	}
	res, _ := dshReq(t, e, "GET", "/dsh/"+idAna+"?tok=1", ana, false, nil, "")
	if res.StatusCode != 307 || res.Header.Get("Location") != "/dsh/"+idAna+"/?tok=1" {
		t.Errorf("sin barra: %d %q", res.StatusCode, res.Header.Get("Location"))
	}
}

func TestDshCookiesYRedirecciones(t *testing.T) {
	var cookieVista string
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookieVista = r.Header.Get("Cookie")
		switch r.URL.Path {
		case "/":
			w.Header().Add("Set-Cookie", "sid=x; Path=/; HttpOnly; Domain=dsh.local; Secure; SameSite=Strict")
			w.Header().Add("Set-Cookie", "otra=1; Path=/api")
			w.Header().Add("Set-Cookie", "lms_session=pisada; Path=/")
			w.Header().Set("Location", "/")
			w.WriteHeader(302)
		case "/abs":
			w.Header().Set("Location", "https://otro.example/x")
			w.WriteHeader(302)
		case "/rel":
			w.Header().Set("Location", "./dentro")
			w.WriteHeader(302)
		case "/ya":
			w.Header().Set("Location", r.Header.Get("X-Prefijo")+"/z")
			w.WriteHeader(302)
		case "/proto":
			w.Header().Set("Location", "//otro.example/x")
			w.WriteHeader(302)
		default:
			w.Header().Set("Location", "/panel?a=1")
			w.WriteHeader(302)
		}
	}))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	pref := "/dsh/" + idAna

	// HTTP plano: sin Secure; Path acotado; sin Domain; la cookie del LMS no se deja fijar.
	req, _ := http.NewRequest("GET", e.srv.URL+pref+"/?tok=1", nil)
	req.Host = "jmd-learn.online"
	req.AddCookie(&http.Cookie{Name: cookieName, Value: ana})
	req.AddCookie(&http.Cookie{Name: "dsh_sid", Value: "propia"})
	req.Header.Add("Cookie", "otra_cookie=2")
	cli := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err := cli.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 302 || res.Header.Get("Location") != pref+"/" {
		t.Errorf("Location: %d %q", res.StatusCode, res.Header.Get("Location"))
	}
	if strings.Contains(cookieVista, cookieName) || strings.Contains(cookieVista, ana) {
		t.Errorf("la cookie del LMS llegó a dsh: %q", cookieVista)
	}
	if !strings.Contains(cookieVista, "dsh_sid=propia") || !strings.Contains(cookieVista, "otra_cookie=2") {
		t.Errorf("las cookies de dsh deben pasar: %q", cookieVista)
	}
	sc := res.Header.Values("Set-Cookie")
	if len(sc) != 2 {
		t.Fatalf("Set-Cookie (lms_session debe descartarse): %v", sc)
	}
	if !strings.Contains(sc[0], "sid=x") || !strings.Contains(sc[0], "Path="+pref+"/") || strings.Contains(sc[0], "Domain") ||
		strings.Contains(sc[0], "Secure") || !strings.Contains(sc[0], "HttpOnly") || !strings.Contains(sc[0], "SameSite=Strict") {
		t.Errorf("cookie 1 en HTTP: %q", sc[0])
	}
	if !strings.Contains(sc[1], "Path="+pref+"/api") {
		t.Errorf("cookie 2 con subpath: %q", sc[1])
	}

	// HTTPS (X-Forwarded-Proto): Secure se conserva.
	req2, _ := http.NewRequest("GET", e.srv.URL+pref+"/", nil)
	req2.Host = "jmd-learn.online"
	req2.Header.Set("Authorization", "Bearer "+ana)
	req2.Header.Set("X-Forwarded-Proto", "https")
	res2, _ := cli.Do(req2)
	res2.Body.Close()
	if sc := res2.Header.Values("Set-Cookie"); len(sc) != 2 || !strings.Contains(sc[0], "Secure") {
		t.Errorf("Secure con HTTPS: %v", sc)
	}

	casos := map[string]string{
		"/panel":  pref + "/panel?a=1",
		"/abs":    "https://otro.example/x",
		"/rel":    "./dentro",
		"/proto":  "//otro.example/x",
		"/ya":     pref + "/z",
		"/panel2": pref + "/panel?a=1",
	}
	for ruta, quiere := range casos {
		req, _ := http.NewRequest("GET", e.srv.URL+pref+ruta, nil)
		req.Header.Set("Authorization", "Bearer "+ana)
		req.Header.Set("X-Prefijo", pref)
		r, err := cli.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		r.Body.Close()
		if got := r.Header.Get("Location"); got != quiere {
			t.Errorf("%s: Location %q, quiero %q", ruta, got, quiere)
		}
	}
}

func TestDshPermisos(t *testing.T) {
	var llegadas int
	var mu sync.Mutex
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		llegadas++
		mu.Unlock()
	}))
	defer dsh.Close()
	e, ana, beto, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	ctx := context.Background()
	hash, _ := auth.HashPassword("inst-1234")
	mk := func(email string, cohortes []string, roles ...string) string {
		if err := e.db.CreateUser(ctx, &store.User{Email: email, Name: email, PasswordHash: hash, Roles: roles, Cohorts: cohortes}); err != nil {
			t.Fatal(err)
		}
		return e.login(email, "inst-1234")
	}
	delGrupo := mk("inst-c1@x.test", []string{"c1"}, "instructor")
	deOtro := mk("inst-c2@x.test", []string{"c2"}, "instructor")
	admin := e.login("profe@x.test", "profe1234")

	url := "/dsh/" + idAna + "/"
	if res, _ := dshReq(t, e, "GET", url, "", false, nil, ""); res.StatusCode != 401 {
		t.Errorf("sin sesión: %d", res.StatusCode)
	}
	if res, _ := dshReq(t, e, "GET", url, "token-invalido", false, nil, ""); res.StatusCode != 401 {
		t.Errorf("token inválido: %d", res.StatusCode)
	}
	if res, _ := dshReq(t, e, "GET", url, beto, false, nil, ""); res.StatusCode != 403 {
		t.Errorf("otro alumno: %d", res.StatusCode)
	}
	if res, _ := dshReq(t, e, "GET", url, beto, true, nil, ""); res.StatusCode != 403 {
		t.Errorf("otro alumno (cookie): %d", res.StatusCode)
	}
	if res, _ := dshReq(t, e, "GET", url, deOtro, false, nil, ""); res.StatusCode != 403 {
		t.Errorf("instructor de otro grupo: %d", res.StatusCode)
	}
	// Chrome pide el manifiesto sin cookies: lo contesta el LMS (copia fija), sin sesión y sin llegar a dsh.
	res, cuerpo := dshReq(t, e, "GET", url+"manifest.webmanifest", "", false, nil, "")
	if res.StatusCode != 200 || res.Header.Get("Content-Type") != "application/manifest+json" || !strings.Contains(string(cuerpo), `"start_url":"./"`) {
		t.Errorf("manifiesto sin sesión: %d %q %s", res.StatusCode, res.Header.Get("Content-Type"), cuerpo)
	}
	for _, c := range []struct{ metodo, ruta string }{{"POST", "manifest.webmanifest"}, {"GET", "sub/manifest.webmanifest"}, {"GET", "manifest.webmanifest/x"}, {"GET", "favicon.svg"}} {
		if res, _ := dshReq(t, e, c.metodo, url+c.ruta, "", false, nil, ""); res.StatusCode != 401 {
			t.Errorf("sin sesión %s %s: %d", c.metodo, c.ruta, res.StatusCode)
		}
	}
	mu.Lock()
	n := llegadas
	mu.Unlock()
	if n != 0 {
		t.Fatalf("las peticiones rechazadas no deben llegar a dsh: %d", n)
	}
	for nombre, tok := range map[string]string{"dueño": ana, "instructor del grupo": delGrupo, "admin": admin} {
		if res, _ := dshReq(t, e, "GET", url, tok, false, nil, ""); res.StatusCode != 200 {
			t.Errorf("%s: %d", nombre, res.StatusCode)
		}
	}
}

// Con cookie, una escritura (multipart incluida) pasa si el Origin es propio; de otro sitio no.
func TestDshOrigenConCookie(t *testing.T) {
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	url := "/dsh/" + idAna + "/subir"
	multi := map[string]string{"Content-Type": "multipart/form-data; boundary=x"}
	casos := []struct {
		nombre string
		origin string
		sfs    string
		quiere int
	}{
		{"mismo origen", "https://jmd-learn.online", "", 200},
		{"PublicURL", "http://lms.test", "", 200},
		{"otro sitio", "https://evil.example", "", 403},
		{"null", "null", "", 403},
		{"sin Origin, cross-site", "", "cross-site", 403},
		{"sin Origin, same-origin", "", "same-origin", 200},
	}
	for _, c := range casos {
		cab := map[string]string{"Content-Type": multi["Content-Type"]}
		if c.origin != "" {
			cab["Origin"] = c.origin
		}
		if c.sfs != "" {
			cab["Sec-Fetch-Site"] = c.sfs
		}
		if res, _ := dshReq(t, e, "POST", url, ana, true, cab, "--x--"); res.StatusCode != c.quiere {
			t.Errorf("%s: %d, quiero %d", c.nombre, res.StatusCode, c.quiere)
		}
	}
	// GET con cookie: sin exigir Origin. Con Bearer tampoco aplica.
	if res, _ := dshReq(t, e, "GET", url, ana, true, map[string]string{"Origin": "https://evil.example"}, ""); res.StatusCode != 200 {
		t.Errorf("GET con cookie: %d", res.StatusCode)
	}
	if res, _ := dshReq(t, e, "POST", url, ana, false, map[string]string{"Origin": "https://evil.example"}, "x"); res.StatusCode != 200 {
		t.Errorf("POST con Bearer: %d", res.StatusCode)
	}
}

func TestDshAulaApagada503YDshCaido502(t *testing.T) {
	f := &aulaFalsa{} // sin destino: Dial rechaza
	e, ana, _, idAna, _ := vistaEnv(t, f)
	url := "/dsh/" + idAna + "/"
	res, raw := dshReq(t, e, "GET", url, ana, false, nil, "")
	if res.StatusCode != 503 || !strings.Contains(string(raw), "aula_apagada") || !strings.Contains(string(raw), "abre el LIVE") {
		t.Errorf("aula apagada: %d %s", res.StatusCode, raw)
	}
	if f.corriendo[idAna] {
		t.Errorf("el proxy no debe arrancar el aula")
	}
	_, _ = f.Crear(context.Background(), idAna) // aula arriba, dsh sin escuchar
	res, raw = dshReq(t, e, "GET", url, ana, false, nil, "")
	if res.StatusCode != 502 || !strings.Contains(string(raw), "dsh_no_responde") || !strings.Contains(string(raw), "3080") {
		t.Errorf("dsh caído: %d %s", res.StatusCode, raw)
	}
	// Un destino que cierra sin responder también es 502.
	l, _ := net.Listen("tcp", "127.0.0.1:0")
	go func() {
		for {
			c, err := l.Accept()
			if err != nil {
				return
			}
			c.Close()
		}
	}()
	defer l.Close()
	f.destino = l.Addr().String()
	if res, _ := dshReq(t, e, "GET", url, ana, false, nil, ""); res.StatusCode != 502 {
		t.Errorf("destino que corta: %d", res.StatusCode)
	}
}

func TestDshTopeDeCuerpo(t *testing.T) {
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = io.Copy(io.Discard, r.Body) }))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	defer func(v int64) { maxDshBody = v }(maxDshBody)
	maxDshBody = 1024
	url := "/dsh/" + idAna + "/subir"
	if res, _ := dshReq(t, e, "POST", url, ana, false, nil, strings.Repeat("a", 512)); res.StatusCode != 200 {
		t.Errorf("bajo el tope: %d", res.StatusCode)
	}
	if res, _ := dshReq(t, e, "POST", url, ana, false, nil, strings.Repeat("a", 4096)); res.StatusCode != 413 {
		t.Errorf("sobre el tope: %d", res.StatusCode)
	}
	if got := int64(32 << 20); got != 33554432 {
		t.Fatal("el tope por defecto es de 32 MB")
	}
}

func TestDshRutaSucia400(t *testing.T) {
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { t.Errorf("llegó %q", r.RequestURI) }))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	for _, ruta := range []string{"a/%2e%2e/b", "%00", "a%5cb"} {
		if res, _ := dshReq(t, e, "GET", "/dsh/"+idAna+"/"+ruta, ana, false, nil, ""); res.StatusCode == 200 {
			t.Errorf("%q no debe reenviarse", ruta)
		}
	}
}

// WebSocket de punta a punta: handshake con Host y Origin originales (coder/websocket los valida en Accept),
// eco de mensajes a través del proxy y cierre propagado al destino.
func TestDshWebSocketEco(t *testing.T) {
	cerrado := make(chan struct{})
	var cookieWS, rutaWS string
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookieWS, rutaWS = r.Header.Get("Cookie"), r.RequestURI
		c, err := websocket.Accept(w, r, nil) // exige Origin = Host: solo pasa si el proxy los conservó
		if err != nil {
			t.Errorf("Accept: %v", err)
			return
		}
		defer close(cerrado)
		defer c.CloseNow()
		for {
			tipo, msg, err := c.Read(r.Context())
			if err != nil {
				return
			}
			if err := c.Write(r.Context(), tipo, append([]byte("eco:"), msg...)); err != nil {
				return
			}
		}
	}))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})

	lmsAddr := strings.TrimPrefix(e.srv.URL, "http://")
	cli := &http.Client{Transport: &http.Transport{DialContext: func(ctx context.Context, n, _ string) (net.Conn, error) {
		var d net.Dialer
		return d.DialContext(ctx, n, lmsAddr) // jmd-learn.online → el LMS de prueba
	}}}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cab := http.Header{}
	cab.Set("Origin", "http://jmd-learn.online")
	cab.Add("Cookie", cookieName+"="+ana)
	cab.Add("Cookie", "dsh_sid=propia")
	c, _, err := websocket.Dial(ctx, "ws://jmd-learn.online/dsh/"+idAna+"/ws?tok=abc", &websocket.DialOptions{HTTPClient: cli, HTTPHeader: cab})
	if err != nil {
		t.Fatalf("Dial: %v", err)
	}
	for _, m := range []string{"uno", "dos", strings.Repeat("x", 20000)} {
		if err := c.Write(ctx, websocket.MessageText, []byte(m)); err != nil {
			t.Fatal(err)
		}
		_, got, err := c.Read(ctx)
		if err != nil || string(got) != "eco:"+m {
			t.Fatalf("eco de %d bytes: %v (%d)", len(m), err, len(got))
		}
	}
	if rutaWS != "/ws?tok=abc" || strings.Contains(cookieWS, cookieName) || !strings.Contains(cookieWS, "dsh_sid=propia") {
		t.Errorf("destino vio ruta=%q cookie=%q", rutaWS, cookieWS)
	}
	// Si un lado cierra, el otro se entera.
	c.CloseNow()
	select {
	case <-cerrado:
	case <-time.After(5 * time.Second):
		t.Fatal("el cierre del cliente no llegó a dsh")
	}
}

// Y al revés: el destino cierra y el cliente lo ve.
func TestDshWebSocketCierraElDestino(t *testing.T) {
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		_ = c.Write(r.Context(), websocket.MessageText, []byte("hola"))
		_ = c.Close(websocket.StatusNormalClosure, "fin")
	}))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cab := http.Header{}
	cab.Set("Authorization", "Bearer "+ana)
	cab.Set("Origin", e.srv.URL)
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(e.srv.URL, "http")+"/dsh/"+idAna+"/ws", &websocket.DialOptions{HTTPHeader: cab})
	if err != nil {
		t.Fatalf("Dial: %v", err)
	}
	defer c.CloseNow()
	if _, m, err := c.Read(ctx); err != nil || string(m) != "hola" {
		t.Fatalf("mensaje: %v %q", err, m)
	}
	if _, _, err := c.Read(ctx); websocket.CloseStatus(err) != websocket.StatusNormalClosure {
		t.Errorf("cierre propagado: %v", err)
	}
}

// Un WebSocket desde otro sitio con la cookie del LMS se rechaza (CSWSH); sin sesión, 401.
func TestDshWebSocketOtroOrigen(t *testing.T) {
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { t.Errorf("no debe llegar") }))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	cab := map[string]string{"Upgrade": "websocket", "Connection": "Upgrade", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==", "Origin": "https://evil.example"}
	if res, _ := dshReq(t, e, "GET", "/dsh/"+idAna+"/ws", ana, true, cab, ""); res.StatusCode != 403 {
		t.Errorf("origen ajeno: %d", res.StatusCode)
	}
	if res, _ := dshReq(t, e, "GET", "/dsh/"+idAna+"/ws", "", false, cab, ""); res.StatusCode != 401 {
		t.Errorf("sin sesión: %d", res.StatusCode)
	}
}

// El registro de acceso no lleva la query (el token de arranque de dsh).
func TestDshLogSinQuery(t *testing.T) {
	var buf bytes.Buffer
	var mu sync.Mutex
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&syncWriter{&mu, &buf}, nil)))
	defer slog.SetDefault(prev)
	dsh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer dsh.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: dsh.Listener.Addr().String()})
	dshReq(t, e, "GET", "/dsh/"+idAna+"/?token=SECRETO-DE-ARRANQUE", ana, false, nil, "")
	mu.Lock()
	defer mu.Unlock()
	log := buf.String()
	if !strings.Contains(log, "msg=dsh") || !strings.Contains(log, "estado=200") {
		t.Errorf("falta la línea de acceso: %q", log)
	}
	if strings.Contains(log, "SECRETO") || strings.Contains(log, "token=") || strings.Contains(log, idAna) {
		t.Errorf("el log filtra query o id: %q", log)
	}
}

type syncWriter struct {
	mu *sync.Mutex
	w  io.Writer
}

func (s *syncWriter) Write(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.w.Write(p)
}

// Funciones puras.
func TestDshAyudantes(t *testing.T) {
	if got := sinCookieLMS([]string{"lms_session=abc; a=1", "b=2; lms_session=zzz"}); got != "a=1; b=2" {
		t.Errorf("sinCookieLMS: %q", got)
	}
	if got := sinCookieLMS([]string{"lms_session=abc"}); got != "" {
		t.Errorf("solo LMS: %q", got)
	}
	if got := reescribirSetCookie("lms_session=x; Path=/", "/dsh/u", true); got != "" {
		t.Errorf("no se deja fijar la sesión del LMS: %q", got)
	}
	if got := reescribirSetCookie("a=b; Path=/dsh/u/sub; Secure", "/dsh/u", false); !strings.Contains(got, "Path=/dsh/u/sub") || strings.Contains(got, "Secure") {
		t.Errorf("ya con prefijo: %q", got)
	}
	if got := reescribirSetCookie("a=b", "/dsh/u", true); !strings.Contains(got, "Path=/dsh/u/") || !strings.Contains(got, "Secure") {
		t.Errorf("sin Path: %q", got)
	}
}
