package httpapi

import (
	"context"
	"errors"
	"net"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// aulaFalsa es un motor en memoria.
type aulaFalsa struct {
	mu        sync.Mutex
	corriendo map[string]bool
	asistente bool
	archivos  map[string][]byte
	destino   string // host:puerto al que Dial conecta (un httptest)

	// Skills montadas: contenedor → ruta (/trabajo/skills/<nombre>/SKILL.md) → contenido.
	montadas   map[string]map[string]string
	execs      []string // todo lo que pasó por Exec (para comprobar «aula parar; aula iniciar», etc.)
	dirVersion string   // última carpeta pedida a Version
}

func (a *aulaFalsa) Crear(_ context.Context, id string) (bool, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.corriendo == nil {
		a.corriendo = map[string]bool{}
	}
	re := a.corriendo[id]
	a.corriendo[id] = true
	return re, nil
}
func (a *aulaFalsa) Estado(_ context.Context, id string) string {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.corriendo[id] {
		return "corriendo"
	}
	return "ninguno"
}

var reKeep = regexp.MustCompile(`keep="([^"]*)"`)

var reEscribe = regexp.MustCompile(`d=(/trabajo/skills/[a-z0-9-]+)`)

// ExecStdin del falso entiende el script de montaje: guarda el stdin como SKILL.md de esa carpeta.
func (a *aulaFalsa) ExecStdin(_ context.Context, nombre, script string, stdin []byte) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.montadas == nil {
		a.montadas = map[string]map[string]string{}
	}
	if a.montadas[nombre] == nil {
		a.montadas[nombre] = map[string]string{}
	}
	if m := reEscribe.FindStringSubmatch(script); m != nil {
		a.montadas[nombre][m[1]+"/SKILL.md"] = string(stdin)
	}
	return "", nil
}

func (a *aulaFalsa) Exec(_ context.Context, nombre string, cmd ...string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.execs = append(a.execs, strings.Join(cmd, " "))
	if m := reKeep.FindStringSubmatch(strings.Join(cmd, " ")); m != nil {
		// limpieza: se quedan solo las del «keep»; las demás montadas se borran
		keep := " " + m[1] + " "
		for ruta := range a.montadas[nombre] {
			n := strings.TrimSuffix(strings.TrimPrefix(ruta, "/trabajo/skills/"), "/SKILL.md")
			if !strings.Contains(keep, " "+n+" ") {
				delete(a.montadas[nombre], ruta)
			}
		}
		return "", nil
	}
	switch strings.Join(cmd, " ") {
	case "aula iniciar":
		a.asistente = true
	case "aula parar":
		a.asistente = false
	}
	if a.asistente {
		return "arrancado", nil
	}
	return "parado", nil
}
func (a *aulaFalsa) Parar(_ context.Context, _ string) error  { return nil }
func (a *aulaFalsa) Borrar(_ context.Context, _ string) error { return nil }
func (a *aulaFalsa) Listar(context.Context) ([]string, error) { return nil, nil }

// Archivos y destino de red del falso, para las pruebas del visor.
func (a *aulaFalsa) Leer(_ context.Context, _, ruta string, _ int64) ([]byte, error) {
	if b, ok := a.archivos[ruta]; ok {
		return b, nil
	}
	return nil, aula.ErrNoExiste
}
func (a *aulaFalsa) Version(_ context.Context, _, dir string) (string, error) {
	a.mu.Lock()
	a.dirVersion = dir
	a.mu.Unlock()
	return "v1", nil
}
func (a *aulaFalsa) Proyectos(context.Context, string) ([]aula.Proyecto, error) {
	return []aula.Proyecto{{Ruta: "veterinaria/index.html", Nombre: "veterinaria", Mod: 2}, {Ruta: "osito/frontend/index.html", Nombre: "Mi asistente (Robo)", Mod: 1}}, nil
}
func (a *aulaFalsa) Dial(ctx context.Context, _ string, _ int) (net.Conn, error) {
	if a.destino == "" {
		return nil, errors.New("connection refused")
	}
	var d net.Dialer
	return d.DialContext(ctx, "tcp", a.destino)
}

func TestAulaSinMotor503(t *testing.T) {
	e := newEnv(t)
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("POST", "/api/v1/aula/iniciar", profe, false, map[string]any{}, ""); r.code != 503 {
		t.Fatalf("sin motor: %d %s", r.code, r.raw)
	}
}

func TestAulaIniciarReutiliza(t *testing.T) {
	e := newEnv(t)
	e.setAula(&aulaFalsa{})
	profe := e.login("profe@x.test", "profe1234")
	r := e.call("POST", "/api/v1/aula/iniciar", profe, false, map[string]any{}, "")
	if r.code != 200 || r.body["reutilizado"] != false || r.body["asistente"] != "parado" {
		t.Fatalf("primera: %d %s", r.code, r.raw)
	}
	if n, _ := r.body["contenedor"].(string); !strings.HasPrefix(n, "curso-") || strings.Contains(n, "profe") {
		t.Errorf("el nombre no debe llevar datos personales: %q", n)
	}
	if r := e.call("POST", "/api/v1/aula/iniciar", profe, false, map[string]any{}, ""); r.body["reutilizado"] != true {
		t.Errorf("segunda debe reutilizar: %s", r.raw)
	}
	if r := e.call("POST", "/api/v1/aula/asistente", profe, false, map[string]any{"accion": "arrancar"}, ""); r.code != 200 || r.body["asistente"] != "arrancado" {
		t.Errorf("arrancar: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/aula/asistente", profe, false, map[string]any{"accion": "borrar-todo"}, ""); r.code != 400 {
		t.Errorf("acción inválida: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/aula", profe, false, nil, ""); r.body["estado"] != "corriendo" || r.body["asistente"] != "arrancado" {
		t.Errorf("estado: %s", r.raw)
	}
	_ = aula.Nombre
}

// Quien lleva más del límite sin usar su aula se detiene; los demás siguen.
func TestAulaApagaInactivos(t *testing.T) {
	f := &aulaFalsa{}
	s := &Server{Aula: f}
	ahora := time.Now().UTC()
	ultimoUsoAula.Lock()
	ultimoUsoAula.t = map[string]time.Time{"viejo": ahora.Add(-20 * time.Minute), "fresco": ahora.Add(-2 * time.Minute), "siempre": ahora.Add(-3 * time.Hour)}
	ultimoUsoAula.Unlock()
	AulasVivas = map[string]bool{"siempre": true}
	defer func() { AulasVivas = map[string]bool{} }()
	parados := s.apagarInactivos(context.Background(), ahora, 15*time.Minute)
	if len(parados) != 1 || parados[0] != aula.Nombre("viejo") {
		t.Fatalf("parados: %v (el aula «siempre» nunca se apaga)", parados)
	}
	if usoAula("fresco") == "" || usoAula("viejo") != "" {
		t.Errorf("solo el vencido sale de la lista")
	}
}
