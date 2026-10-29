package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// vistaEnv prepara un servidor con aula falsa y dos alumnos registrados; devuelve sus tokens e ids.
func vistaEnv(t *testing.T, f *aulaFalsa) (e *env, ana, beto, idAna, idBeto string) {
	t.Helper()
	e = newEnv(t)
	e.setAula(f)
	for _, n := range []string{"ana", "beto"} {
		if r := e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": n + "@x.test", "name": n, "password": n + "-1234", "invite_code": "abc"}, ""); r.code != 201 {
			t.Fatalf("registro %s: %d %s", n, r.code, r.raw)
		}
	}
	ana, beto = e.login("ana@x.test", "ana-1234"), e.login("beto@x.test", "beto-1234")
	ua, _ := e.db.UserByEmail(t.Context(), "ana@x.test")
	ub, _ := e.db.UserByEmail(t.Context(), "beto@x.test")
	return e, ana, beto, ua.ID, ub.ID
}

func TestVistaOtroSub403(t *testing.T) {
	e, _, beto, idAna, _ := vistaEnv(t, &aulaFalsa{archivos: map[string][]byte{"index.html": []byte("<h1>hola</h1>")}})
	if r := e.call("GET", "/vista/"+idAna+"/", beto, false, nil, ""); r.code != 403 {
		t.Fatalf("otro alumno: %d %s", r.code, r.raw)
	}
}

func TestVistaTraversal400(t *testing.T) {
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{})
	for _, ruta := range []string{"../etc/passwd", "a/../../x.html", "%2e%2e/secreto.txt"} {
		if r := e.call("GET", "/vista/"+idAna+"/"+ruta, ana, false, nil, ""); r.code != 400 && r.code != 403 && r.code != 404 { // el mux limpia «..» y el sub resultante ya no es el suyo
			t.Errorf("%q debe rechazarse: %d", ruta, r.code)
		}
	}
}

func TestVistaMimeNoPermitido415(t *testing.T) {
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{archivos: map[string][]byte{"x.exe": []byte("MZ"), "app.py": []byte("print(1)")}})
	for _, ruta := range []string{"x.exe", "app.py"} {
		if r := e.call("GET", "/vista/"+idAna+"/"+ruta, ana, false, nil, ""); r.code != 415 {
			t.Errorf("%s: %d", ruta, r.code)
		}
	}
}

func TestVistaSirveIndex(t *testing.T) {
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{archivos: map[string][]byte{
		"index.html": []byte("<html><head><title>x</title></head><body><h1>hola</h1></body></html>"),
		"app.js":     []byte("console.log(1)"),
	}})
	r := e.call("GET", "/vista/"+idAna+"/", ana, false, nil, "")
	if r.code != 200 || !strings.HasPrefix(r.hdr.Get("Content-Type"), "text/html") || !strings.Contains(string(r.raw), "<h1>hola</h1>") {
		t.Fatalf("index: %d %s", r.code, r.raw)
	}
	if r.hdr.Get("Cache-Control") != "no-store" || r.hdr.Get("X-Frame-Options") != "SAMEORIGIN" || !strings.Contains(r.hdr.Get("Content-Security-Policy"), "esm.sh") {
		t.Errorf("cabeceras: %v", r.hdr)
	}
	if n := strings.Count(string(r.raw), "<script>"); n != 1 {
		t.Errorf("el HTML debe llevar el script de consola una vez: %d", n)
	}
	if j := e.call("GET", "/vista/"+idAna+"/app.js", ana, false, nil, ""); strings.Contains(string(j.raw), "consola") || j.code != 200 {
		t.Errorf("el .js no se toca: %d %s", j.code, j.raw)
	}
	if n := e.call("GET", "/vista/"+idAna+"/falta.html", ana, false, nil, ""); n.code != 404 {
		t.Errorf("inexistente: %d", n.code)
	}
}

func TestVistaRutaCarpetaYTrabajo(t *testing.T) {
	casos := map[string]string{
		"":                              "index.html",
		"mesa-ayuda":                    "mesa-ayuda/index.html",
		"trabajo/mesa-ayuda":            "mesa-ayuda/index.html",
		"/trabajo/mesa-ayuda/public/":   "mesa-ayuda/public/index.html",
		"trabajo":                       "index.html",
		"mesa-ayuda/public/kanban.html": "mesa-ayuda/public/kanban.html",
	}
	for in, want := range casos {
		if got, ok := vistaRuta(in); !ok || got != want {
			t.Errorf("vistaRuta(%q) = %q, %v; quiero %q", in, got, ok, want)
		}
	}
	if _, ok := vistaRuta("trabajo/../etc/passwd"); ok {
		t.Error("«..» debe rechazarse")
	}
}

func TestVistaInyectaConsola(t *testing.T) {
	if got := string(inyectarConsola([]byte("<p>x</p>"))); !strings.Contains(got, `return R.test(u)?b+u:u`) || !strings.Contains(got, `R=/^\/(api|imagenes)\//`) {
		t.Errorf("falta el reenvío de /api/ al visor: %s", got)
	}
	if got := string(inyectarConsola([]byte("<html><head></head><body></body></html>"))); strings.Count(got, "<script>") != 1 || strings.Index(got, "<script>") > strings.Index(got, "</head>") {
		t.Errorf("antes de </head>: %s", got)
	}
	if got := string(inyectarConsola([]byte("<p>sin cabecera</p>"))); !strings.HasPrefix(got, "<script>") {
		t.Errorf("sin cabecera va al inicio: %s", got)
	}
}

func TestVistaVersion(t *testing.T) {
	e, ana, beto, idAna, _ := vistaEnv(t, &aulaFalsa{})
	if r := e.call("GET", "/api/v1/vista/version", ana, false, nil, ""); r.code != 200 || r.body["version"] != "v1" {
		t.Errorf("propia: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/vista/"+idAna+"/version", beto, false, nil, ""); r.code != 403 {
		t.Errorf("ajena: %d", r.code)
	}
}

// ?dir= acota la huella al proyecto que se mira; solo un segmento limpio.
func TestVistaVersionDir(t *testing.T) {
	f := &aulaFalsa{}
	e, ana, _, idAna, _ := vistaEnv(t, f)
	if r := e.call("GET", "/api/v1/vista/version?dir=veterinaria", ana, false, nil, ""); r.code != 200 || f.dirVersion != "veterinaria" {
		t.Errorf("dir propia: %d %q %s", r.code, f.dirVersion, r.raw)
	}
	if r := e.call("GET", "/api/v1/vista/"+idAna+"/version?dir=mi-app_1.0", ana, false, nil, ""); r.code != 200 || f.dirVersion != "mi-app_1.0" {
		t.Errorf("dir con sub: %d %q", r.code, f.dirVersion)
	}
	if r := e.call("GET", "/api/v1/vista/version", ana, false, nil, ""); r.code != 200 || f.dirVersion != "" {
		t.Errorf("sin dir = todo /trabajo: %d %q", r.code, f.dirVersion)
	}
	for _, mala := range []string{"..", ".", "a/b", "a%2Fb", "%2E%2E", "a%20b", "x%3Brm", "%24%28id%29"} {
		f.dirVersion = "sin-llamar"
		if r := e.call("GET", "/api/v1/vista/version?dir="+mala, ana, false, nil, ""); r.code != 400 || f.dirVersion != "sin-llamar" {
			t.Errorf("dir %q debe dar 400 sin llegar al aula: %d %q", mala, r.code, f.dirVersion)
		}
	}
}

func TestVistaApiReenvia(t *testing.T) {
	asist := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/chat" || r.Method != "POST" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"texto":"hola","fuente":"nube"}`))
	}))
	defer asist.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: asist.Listener.Addr().String()})
	r := e.call("POST", "/vista/"+idAna+"/api/chat", ana, false, map[string]any{"mensaje": "hola"}, "")
	if r.code != 200 || r.body["texto"] != "hola" {
		t.Fatalf("reenvío: %d %s", r.code, r.raw)
	}
}

// Clase 3: el backend del alumno (Bun + Elysia en el 8766) recibe cualquier ruta bajo /api/ y cualquier
// método de escritura del dueño; el personal solo mira; nada de «..».
func TestVistaApiBackendDelAlumno(t *testing.T) {
	var vistos []string
	back := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		vistos = append(vistos, r.Method+" "+r.URL.RequestURI())
		if r.Header.Get("Cookie") != "" || r.Header.Get("Authorization") != "" {
			t.Errorf("las credenciales del LMS no llegan al aula: %v", r.Header)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ruta":"` + r.URL.Path + `"}`))
	}))
	defer back.Close()
	e, ana, beto, idAna, _ := vistaEnv(t, &aulaFalsa{destino: back.Listener.Addr().String()})
	base := "/vista/" + idAna + "/api/"
	for _, c := range []struct{ metodo, ruta string }{
		{"GET", "mensajes?desde=3"}, {"POST", "mensajes"}, {"GET", "whatsapp/qr"}, {"PUT", "mensajes/7"},
		{"PATCH", "mensajes/7"}, {"DELETE", "mensajes/7"}, {"POST", "webhook"},
	} {
		var cuerpo any
		if c.metodo != "GET" && c.metodo != "DELETE" {
			cuerpo = map[string]any{"texto": "hola"}
		}
		r := e.call(c.metodo, base+c.ruta, ana, false, cuerpo, "")
		if quiere := "/api/" + strings.SplitN(c.ruta, "?", 2)[0]; r.code != 200 || r.body["ruta"] != quiere {
			t.Errorf("%s %s: %d %s", c.metodo, c.ruta, r.code, r.raw)
		}
	}
	if len(vistos) == 0 || vistos[0] != "GET /api/mensajes?desde=3" {
		t.Errorf("la consulta debe pasar tal cual: %v", vistos)
	}
	// El personal mira (GET) pero no escribe; otro alumno, nada.
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("GET", base+"whatsapp/qr", profe, false, nil, ""); r.code != 200 {
		t.Errorf("el personal puede mirar: %d", r.code)
	}
	for _, m := range []string{"POST", "PUT", "PATCH", "DELETE"} {
		if r := e.call(m, base+"mensajes", profe, false, map[string]any{}, ""); r.code != 403 {
			t.Errorf("personal %s: %d", m, r.code)
		}
	}
	if r := e.call("GET", base+"mensajes", beto, false, nil, ""); r.code != 403 {
		t.Errorf("otro alumno: %d", r.code)
	}
	// Rutas sucias: nunca llegan al aula. («a//b» y «./x» sin codificar los limpia el mux con una redirección.)
	antes := len(vistos)
	for _, ruta := range []string{"%2e%2e/secreto", "a/%2e%2e/%2e%2e/x", "a%2f%2fb", "%2e/x", "a%5cb", "%00"} {
		r := e.call("POST", base+ruta, ana, false, map[string]any{}, "")
		if r.code == 200 {
			t.Errorf("%q no debe reenviarse: %d %s", ruta, r.code, r.raw)
		}
	}
	if len(vistos) != antes {
		t.Errorf("una ruta sucia llegó al aula: %v", vistos[antes:])
	}
	for _, ruta := range []string{"x", "a/b.json"} {
		if !restoPermitido(ruta) {
			t.Errorf("%q debe pasar", ruta)
		}
	}
	for _, ruta := range []string{"", "..", "../x", "a/../b", "/x", "a//b", "a\\b", "a\x00b", strings.Repeat("a", 600)} {
		if restoPermitido(ruta) {
			t.Errorf("%q no debe pasar", ruta)
		}
	}
}

// La CSP deja al front (Lit desde esm.sh) llamar a su /vista/<sub>/api y mostrar el QR como data: o png.
func TestVistaCSPClase3(t *testing.T) {
	for _, quiere := range []string{"script-src 'self' 'unsafe-inline' https://esm.sh", "connect-src 'self'", "img-src 'self' data: blob:"} {
		if !strings.Contains(cspVista, quiere) {
			t.Errorf("CSP sin %q: %s", quiere, cspVista)
		}
	}
}

func TestVistaApiAsistenteApagado503(t *testing.T) {
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{})
	if r := e.call("POST", "/vista/"+idAna+"/api/chat", ana, false, map[string]any{"mensaje": "hola"}, ""); r.code != 503 || !strings.Contains(string(r.raw), "aula iniciar") {
		t.Errorf("apagado: %d %s", r.code, r.raw)
	}
}

func TestVistaApiOtroSubPost403(t *testing.T) {
	e, _, beto, idAna, _ := vistaEnv(t, &aulaFalsa{})
	if r := e.call("POST", "/vista/"+idAna+"/api/chat", beto, false, map[string]any{}, ""); r.code != 403 {
		t.Errorf("ajeno: %d", r.code)
	}
	// El instructor puede mirar (GET) pero no enviar.
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("POST", "/vista/"+idAna+"/api/chat", profe, false, map[string]any{}, ""); r.code != 403 {
		t.Errorf("el personal no envía en nombre del alumno: %d", r.code)
	}
}

func TestVistaApiUpgrade400(t *testing.T) {
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{})
	req, _ := http.NewRequest("GET", e.srv.URL+"/vista/"+idAna+"/api/estado", nil)
	req.Header.Set("Authorization", "Bearer "+ana)
	req.Header.Set("Upgrade", "websocket")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 400 {
		t.Errorf("upgrade: %d", resp.StatusCode)
	}
}

var _ = aula.Nombre

func TestVistaProyectos(t *testing.T) {
	e, ana, beto, idAna, _ := vistaEnv(t, &aulaFalsa{})
	r := e.call("GET", "/api/v1/vista/proyectos", ana, false, nil, "")
	if r.code != 200 || len(r.list) != 2 || r.list[0]["ruta"] != "veterinaria/index.html" {
		t.Fatalf("propios: %d %s", r.code, r.raw)
	}
	if o := e.call("GET", "/api/v1/vista/"+idAna+"/proyectos", beto, false, nil, ""); o.code != 403 {
		t.Errorf("ajenos: %d", o.code)
	}
}

// Lo que el agente escribe cambia cada vez: «api/chat» relativo desde una carpeta, la URL armada con la carpeta de
// la página o la imagen del backend. Todo llega al 8766 del aula; una imagen que sí es archivo se sirve como archivo.
func TestVistaRutasAnidadas(t *testing.T) {
	for ruta, quiere := range map[string]string{
		"mickey/api/chat": "/api/chat", "api/chat": "/api/chat", "a/b/api/x/y": "/api/x/y",
		"imagenes/f.png": "/imagenes/f.png", "mickey/imagenes/f.png": "/imagenes/f.png",
	} {
		if got, ok := rutaBackend(ruta); !ok || got != quiere {
			t.Errorf("%q → %q %v (quería %q)", ruta, got, ok, quiere)
		}
	}
	for _, ruta := range []string{"mickey/index.html", "api", "mickey/api", "mi-api/x", "api/../x", "api/a//b"} {
		if got, ok := rutaBackend(ruta); ok {
			t.Errorf("%q no debe ir al backend: %q", ruta, got)
		}
	}
	var vistos []string
	back := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		vistos = append(vistos, r.Method+" "+r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ruta":"` + r.URL.Path + `"}`))
	}))
	defer back.Close()
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{destino: back.Listener.Addr().String()})
	if r := e.call("POST", "/vista/"+idAna+"/mickey/api/chat", ana, false, map[string]any{"mensaje": "hola"}, ""); r.code != 200 || r.body["ruta"] != "/api/chat" {
		t.Fatalf("POST anidado: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/vista/"+idAna+"/mickey/api/salud", ana, false, nil, ""); r.code != 200 || r.body["ruta"] != "/api/salud" {
		t.Fatalf("GET anidado: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/vista/"+idAna+"/imagenes/f.png", ana, false, nil, ""); r.code != 200 || r.body["ruta"] != "/imagenes/f.png" {
		t.Fatalf("imagen del backend: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/vista/"+idAna+"/mickey/index.html", ana, false, map[string]any{}, ""); r.code != 404 {
		t.Fatalf("POST a un archivo: %d", r.code)
	}
}
