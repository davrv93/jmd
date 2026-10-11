package httpapi

import (
	"context"
	"strings"
	"sync"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// aulaFalsa es un motor en memoria.
type aulaFalsa struct {
	mu        sync.Mutex
	corriendo map[string]bool
	asistente bool
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
func (a *aulaFalsa) Exec(_ context.Context, _ string, cmd ...string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
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
