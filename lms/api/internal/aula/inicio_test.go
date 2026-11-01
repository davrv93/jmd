package aula

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestInicio(t *testing.T) {
	casos := []struct {
		salida string
		err    error
		quiero string
	}{
		{"true 2026-10-31T21:42:01.123456789Z", nil, "2026-10-31T21:42:01.123456789Z"},
		{"false 2026-10-31T21:42:01Z", nil, ""},
		{"true 0001-01-01T00:00:00Z", nil, ""},
		{"", errors.New("no such container"), ""},
		{"true", nil, ""},
	}
	for _, c := range casos {
		var args []string
		a := &Aula{run: func(_ context.Context, x ...string) (string, error) { args = x; return c.salida, c.err }}
		if got := a.Inicio(context.Background(), "u1"); got != c.quiero {
			t.Errorf("%q: %q, quiero %q", c.salida, got, c.quiero)
		}
		if strings.Join(args, " ") != "inspect -f {{.State.Running}} {{.State.StartedAt}} "+Nombre("u1") {
			t.Errorf("args: %q", args)
		}
	}
}

func TestExecTopePasaStdinSinArgv(t *testing.T) {
	var args []string
	a := &Aula{run: func(_ context.Context, x ...string) (string, error) { args = x; return "ok", nil }}
	if _, err := a.ExecTope(context.Background(), "curso-x", "aula dsh clave -", []byte("sk-secreta\n"), time.Second); err != nil {
		t.Fatal(err)
	}
	// El falso recibe stdin como último argumento; en el real va por cmd.Stdin. El script no lleva la clave.
	if len(args) != 4 || args[2] != "aula dsh clave -" || strings.Contains(args[2], "sk-secreta") {
		t.Fatalf("args: %q", args)
	}
}
