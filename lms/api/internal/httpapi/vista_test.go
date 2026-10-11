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

func TestVistaInyectaConsola(t *testing.T) {
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
	if n := e.call("POST", "/vista/"+idAna+"/api/secreto", ana, false, map[string]any{}, ""); n.code != 404 {
		t.Errorf("fuera de la lista blanca: %d", n.code)
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
