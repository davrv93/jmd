package aula

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

const claveGlobal = "clave-global-que-nunca-entra-al-aula"

// evoFalso imita /instance/create de Evolution Go: la primera vez crea, luego «instance already exists».
type evoFalso struct {
	mu         sync.Mutex
	creadas    map[string]string // nombre → token
	peticiones int
	apikeys    []string
}

func (f *evoFalso) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.peticiones++
	f.apikeys = append(f.apikeys, r.Header.Get("apikey"))
	if r.URL.Path != "/instance/create" || r.Method != http.MethodPost {
		http.NotFound(w, r)
		return
	}
	if r.Header.Get("apikey") != claveGlobal {
		w.WriteHeader(401)
		_, _ = w.Write([]byte(`{"error":"not authorized"}`))
		return
	}
	var in struct{ Name, Token string }
	_ = json.NewDecoder(r.Body).Decode(&in)
	if f.creadas == nil {
		f.creadas = map[string]string{}
	}
	if _, ok := f.creadas[in.Name]; ok {
		w.WriteHeader(400)
		_, _ = w.Write([]byte(`{"error":"instance already exists"}`))
		return
	}
	f.creadas[in.Name] = in.Token
	_, _ = w.Write([]byte(`{"message":"success"}`))
}

// motorFalso es un docker en memoria: contenedores con su firma, y lo que llega a psql por stdin.
type motorFalso struct {
	contenedores map[string]string // nombre → firma
	corriendo    map[string]bool
	sql          []string
	runs         [][]string
	rms          int
	pgCaido      bool
}

func (m *motorFalso) run(_ context.Context, args ...string) (string, error) {
	switch args[0] {
	case "inspect":
		n := args[len(args)-1]
		f, ok := m.contenedores[n]
		if !ok {
			return "Error: No such object", errors.New("no existe")
		}
		return map[bool]string{true: "true", false: "false"}[m.corriendo[n]] + " " + f, nil
	case "run":
		m.runs = append(m.runs, args)
		for i, a := range args {
			if a == "--name" {
				for _, b := range args {
					if strings.HasPrefix(b, EtiquetaFirma+"=") {
						m.contenedores[args[i+1]] = strings.TrimPrefix(b, EtiquetaFirma+"=")
					}
				}
				m.corriendo[args[i+1]] = true
			}
		}
	case "rm":
		m.rms++
		delete(m.contenedores, args[len(args)-1])
	case "start":
		m.corriendo[args[len(args)-1]] = true
	case "exec-stdin":
		if m.pgCaido {
			return "psql: error: connection refused", errors.New("exit status 2")
		}
		m.sql = append(m.sql, args[1]+"|"+args[2]+"|"+args[3])
	}
	return "", nil
}

func nuevoMotor() *motorFalso {
	return &motorFalso{contenedores: map[string]string{}, corriendo: map[string]bool{}}
}

func aulaConClase(t *testing.T, m *motorFalso, evo http.Handler) *Aula {
	t.Helper()
	srv := httptest.NewServer(evo)
	t.Cleanup(srv.Close)
	return &Aula{run: m.run, Clase: &Clase{
		PG: "aula-pg", EvoURL: srv.URL, EvoKey: claveGlobal, Secreto: []byte("semilla-de-prueba"),
		Proxy: "http://npm-proxy:8888",
	}}
}

func TestArgsClaseVariables(t *testing.T) {
	a := &Aula{Clase: &Clase{PG: "aula-pg", EvoURL: "http://evogo-clase:8080", EvoKey: claveGlobal, Secreto: []byte("s")}}
	j := strings.Join(a.Args("u1"), " ")
	for _, quiere := range []string{
		"DATABASE_URL=postgres://" + PGUsuario("u1") + ":" + a.Clase.PGClave("u1") + "@aula-pg:5432/" + PGBase("u1"),
		"EVO_URL=http://evogo-clase:8080", "EVO_TOKEN=" + a.Clase.EvoToken("u1"), "EVO_INSTANCE=" + Nombre("u1"),
		"EVO_WEBHOOK=http://" + Nombre("u1") + ":8766/api/webhook", "--label " + EtiquetaFirma + "=",
	} {
		if !strings.Contains(j, quiere) {
			t.Errorf("falta %q en %s", quiere, j)
		}
	}
	if strings.Contains(j, claveGlobal) {
		t.Fatalf("la GLOBAL_API_KEY no puede entrar al aula: %s", j)
	}
	if args := a.Args("u1"); args[len(args)-3] != "jmd/aula:latest" {
		t.Errorf("la imagen debe seguir antes del comando: %v", args[len(args)-4:])
	}
	// Cada alumno, su clave y su token; y son estables (idempotencia sin guardar nada).
	if a.Clase.PGClave("u1") == a.Clase.PGClave("u2") || a.Clase.EvoToken("u1") == a.Clase.EvoToken("u2") {
		t.Error("las credenciales deben depender del alumno")
	}
	if a.Clase.EvoToken("u1") != (&Clase{Secreto: []byte("s")}).EvoToken("u1") {
		t.Error("el token debe ser estable")
	}
	// Sin clase: nada de esto, y el aula de siempre.
	sin := strings.Join((&Aula{}).Args("u1"), " ")
	for _, no := range []string{"DATABASE_URL", "EVO_", "HTTPS_PROXY"} {
		if strings.Contains(sin, no) {
			t.Errorf("sin clase no debe haber %s: %s", no, sin)
		}
	}
	// Evolution sin clave global: no se ofrece WhatsApp a medias.
	if j := strings.Join((&Aula{Clase: &Clase{EvoURL: "http://x", Secreto: []byte("s")}}).Args("u1"), " "); strings.Contains(j, "EVO_TOKEN") {
		t.Errorf("sin LMS_EVO_KEY no hay instancia: %s", j)
	}
}

// Crear prepara base e instancia; repetirlo no duplica nada y la clave global solo viaja en la cabecera.
func TestCrearPreparaClaseIdempotente(t *testing.T) {
	m, evo := nuevoMotor(), &evoFalso{}
	a := aulaConClase(t, m, evo)
	ctx := context.Background()
	if re, err := a.Crear(ctx, "u1"); err != nil || re {
		t.Fatalf("primera: re=%v err=%v", re, err)
	}
	m.corriendo[Nombre("u1")] = false // se apagó por inactividad
	if re, err := a.Crear(ctx, "u1"); err != nil || !re {
		t.Fatalf("segunda: re=%v err=%v", re, err)
	}
	if re, err := a.Crear(ctx, "u1"); err != nil || !re {
		t.Fatalf("tercera (corriendo): re=%v err=%v", re, err)
	}
	if len(m.runs) != 1 || m.rms != 0 {
		t.Errorf("un solo docker run y ningún rm: runs=%d rms=%d", len(m.runs), m.rms)
	}
	if len(evo.creadas) != 1 || evo.creadas[Nombre("u1")] != a.Clase.EvoToken("u1") {
		t.Errorf("instancia: %v", evo.creadas)
	}
	if evo.peticiones != 2 { // al crear y al arrancar el parado; corriendo no se toca
		t.Errorf("peticiones a Evolution: %d", evo.peticiones)
	}
	for _, k := range evo.apikeys {
		if k != claveGlobal {
			t.Errorf("apikey: %q", k)
		}
	}
	var bases, webhooks []string
	for _, s := range m.sql {
		if strings.Contains(s, "-d evogo_users|") {
			webhooks = append(webhooks, s)
		} else {
			bases = append(bases, s)
		}
	}
	if len(bases) != 2 || len(webhooks) != 2 {
		t.Fatalf("psql: %v", m.sql)
	}
	for _, s := range webhooks {
		for _, quiere := range []string{
			"UPDATE instances SET webhook = '" + Webhook("u1") + "' WHERE name = '" + Nombre("u1") + "' AND coalesce(webhook, '') = ''",
			"SET events = 'MESSAGE'",
		} {
			if !strings.Contains(s, quiere) {
				t.Errorf("webhook sin %q: %s", quiere, s)
			}
		}
	}
	for _, s := range bases {
		partes := strings.SplitN(s, "|", 3)
		if partes[0] != "aula-pg" || !strings.HasPrefix(partes[1], "psql ") || strings.Contains(partes[1], a.Clase.PGClave("u1")) {
			t.Errorf("psql va al contenedor aula-pg y la clave solo por stdin: %q", partes[:2])
		}
		for _, quiere := range []string{
			"WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '" + PGUsuario("u1") + "')\\gexec",
			"CREATE DATABASE " + PGBase("u1") + " OWNER " + PGUsuario("u1"),
			"WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '" + PGBase("u1") + "')\\gexec",
			"REVOKE ALL ON DATABASE " + PGBase("u1") + " FROM PUBLIC",
			"PASSWORD '" + a.Clase.PGClave("u1") + "'",
		} {
			if !strings.Contains(partes[2], quiere) {
				t.Errorf("SQL sin %q:\n%s", quiere, partes[2])
			}
		}
	}
	for _, r := range m.runs {
		if strings.Contains(strings.Join(r, " "), claveGlobal) {
			t.Fatalf("la GLOBAL_API_KEY entró al docker run: %v", r)
		}
	}
}

// Un aula de antes (sin firma, 192 MiB, sin variables) se recrea; /trabajo es el mismo volumen.
func TestCrearRecreaAulaVieja(t *testing.T) {
	m := nuevoMotor()
	a := aulaConClase(t, m, &evoFalso{})
	m.contenedores[Nombre("u1")] = "<no value>"
	m.corriendo[Nombre("u1")] = true
	re, err := a.Crear(context.Background(), "u1")
	if err != nil || !re || m.rms != 1 || len(m.runs) != 1 {
		t.Fatalf("re=%v err=%v rms=%d runs=%d", re, err, m.rms, len(m.runs))
	}
	if j := strings.Join(m.runs[0], " "); !strings.Contains(j, "-v "+Volumen("u1")+":/trabajo") || !strings.Contains(j, "DATABASE_URL=") {
		t.Errorf("debe recrearse con su volumen y las variables: %s", j)
	}
	if m.contenedores[Nombre("u1")] != a.Firma("u1") {
		t.Errorf("la nueva lleva la firma vigente")
	}
}

// Si aula-pg o Evolution Go están caídos, el aula se crea igual (la clase 1 y 2 no dependen de ellos).
func TestCrearConServiciosCaidos(t *testing.T) {
	m := nuevoMotor()
	m.pgCaido = true
	a := aulaConClase(t, m, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(503) }))
	if _, err := a.Crear(context.Background(), "u1"); err != nil || len(m.runs) != 1 {
		t.Fatalf("err=%v runs=%d", err, len(m.runs))
	}
	a.Clase.EvoURL = "http://127.0.0.1:1" // nadie escucha
	if _, err := a.Crear(context.Background(), "u2"); err != nil {
		t.Fatalf("evolution sin red: %v", err)
	}
}

// Con proxy, el aula sale a internet por HTTP y HTTPS (mayúsculas y minúsculas) y lo interno no pasa por él.
func TestArgsClaseProxy(t *testing.T) {
	a := &Aula{Clase: &Clase{Proxy: "http://npm-proxy:8888"}}
	j := strings.Join(a.Args("u1"), " ")
	for _, v := range []string{"HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"} {
		if !strings.Contains(j, v+"=http://npm-proxy:8888") {
			t.Errorf("falta %s en %s", v, j)
		}
	}
	for _, interno := range []string{"ai-orchestrator", "imagen", "evogo-clase", "aula-pg", "jmrv", "lms", "npm-proxy", Nombre("u1")} {
		if !strings.Contains(j, "NO_PROXY=") || !strings.Contains(j, ","+interno) {
			t.Errorf("%s debe ir en NO_PROXY: %s", interno, j)
		}
	}
	if j2 := strings.Join((&Aula{Clase: &Clase{}}).Args("u1"), " "); strings.Contains(j2, "PROXY") {
		t.Errorf("sin LMS_AULA_PROXY no debe haber proxy: %s", j2)
	}
}
