package aula

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestArgsAula(t *testing.T) {
	a := &Aula{}
	j := strings.Join(a.Args("u1"), " ")
	for _, quiere := range []string{"--memory 192m", "--memory-swap 192m", "--pids-limit 96", "--read-only", "--cap-drop ALL", "--network aula_net", "--user 10001:10001", "jmd/aula:latest sleep"} {
		if !strings.Contains(j, quiere) {
			t.Errorf("falta %q en %s", quiere, j)
		}
	}
	if strings.Contains(j, "docker.sock") || strings.Contains(j, "--network bridge") {
		t.Errorf("argumentos peligrosos: %s", j)
	}
	if n := Nombre("u1"); !strings.HasPrefix(n, "curso-") || len(n) != 22 {
		t.Errorf("nombre: %q", n)
	}
	if Nombre("u1") == Nombre("u2") || !strings.HasPrefix(Volumen("u1"), "trabajo-") {
		t.Errorf("nombre y volumen deben depender del usuario")
	}
}

// Crear: sin contenedor lo crea; con uno corriendo lo reutiliza; con uno parado lo arranca.
func TestCrearReutiliza(t *testing.T) {
	estado := "ninguno"
	var llamadas []string
	a := &Aula{run: func(_ context.Context, args ...string) (string, error) {
		llamadas = append(llamadas, args[0])
		switch args[0] {
		case "inspect":
			if estado == "ninguno" {
				return "Error: No such object", errors.New("no existe")
			}
			return map[string]string{"corriendo": "true", "parado": "false"}[estado], nil
		case "run":
			estado = "corriendo"
		case "start":
			estado = "corriendo"
		}
		return "", nil
	}}
	ctx := context.Background()
	if re, err := a.Crear(ctx, "u1"); err != nil || re {
		t.Fatalf("primera vez: re=%v err=%v", re, err)
	}
	if re, _ := a.Crear(ctx, "u1"); !re {
		t.Errorf("segunda vez debe reutilizar")
	}
	estado = "parado"
	if re, _ := a.Crear(ctx, "u1"); !re || llamadas[len(llamadas)-1] != "start" {
		t.Errorf("parado debe arrancar: %v", llamadas)
	}
	if got := a.Estado(ctx, "u1"); got != "corriendo" {
		t.Errorf("estado: %s", got)
	}
}
