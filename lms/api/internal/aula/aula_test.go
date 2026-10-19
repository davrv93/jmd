package aula

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestArgsAulaClaveDeJmd(t *testing.T) {
	j := strings.Join((&Aula{Token: "gw-prueba"}).Args("u1"), " ")
	if !strings.Contains(j, "JMD_API_KEY=gw-prueba") {
		t.Errorf("jmd lee JMD_API_KEY: %s", j)
	}
	if strings.Contains(strings.Join((&Aula{}).Args("u1"), " "), "JMD_API_KEY") {
		t.Error("sin token no hay clave")
	}
}

func TestArgsAula(t *testing.T) {
	a := &Aula{}
	j := strings.Join(a.Args("u1"), " ")
	for _, quiere := range []string{"--memory 384m", "--memory-swap 384m", "--pids-limit 96", "--read-only", "--cap-drop ALL", "--network aula_net", "--user 10001:10001", "jmd/aula:latest sleep"} {
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
	a := &Aula{}
	a.run = func(_ context.Context, args ...string) (string, error) {
		llamadas = append(llamadas, args[0])
		switch args[0] {
		case "inspect":
			if estado == "ninguno" {
				return "Error: No such object", errors.New("no existe")
			}
			if args[2] == "{{.State.Running}}" {
				return map[string]string{"corriendo": "true", "parado": "false"}[estado], nil
			}
			return map[string]string{"corriendo": "true", "parado": "false"}[estado] + " " + a.Firma("u1"), nil
		case "run":
			estado = "corriendo"
		case "start":
			estado = "corriendo"
		}
		return "", nil
	}
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

// Un aula parada con una imagen anterior a la última reconstrucción se recrea; corriendo, se respeta.
func TestCrearRenuevaImagenVieja(t *testing.T) {
	corriendo, imagenSuya := false, "sha256:vieja"
	var llamadas []string
	a := &Aula{}
	a.run = func(_ context.Context, args ...string) (string, error) {
		llamadas = append(llamadas, strings.Join(args[:2], " "))
		switch {
		case args[0] == "inspect" && args[2] == "{{.Image}}":
			return imagenSuya, nil
		case args[0] == "inspect":
			return map[bool]string{true: "true", false: "false"}[corriendo] + " " + a.Firma("u1"), nil
		case args[0] == "image":
			return "sha256:nueva", nil
		case args[0] == "run":
			corriendo, imagenSuya = true, "sha256:nueva"
		}
		return "", nil
	}
	ctx := context.Background()
	corriendo = true
	if re, _ := a.Crear(ctx, "u1"); !re || strings.Contains(strings.Join(llamadas, ","), "rm") {
		t.Fatalf("corriendo no se toca aunque la imagen sea vieja: %v", llamadas)
	}
	corriendo, llamadas = false, nil
	if re, err := a.Crear(ctx, "u1"); err != nil || !re {
		t.Fatalf("re=%v err=%v", re, err)
	}
	j := strings.Join(llamadas, ",")
	if !strings.Contains(j, "rm -f") || !strings.Contains(j, "run -d") || strings.Contains(j, "start") {
		t.Fatalf("parada con imagen vieja debe recrearse: %v", llamadas)
	}
	corriendo, llamadas = false, nil
	if _, _ = a.Crear(ctx, "u1"); !strings.Contains(strings.Join(llamadas, ","), "start") {
		t.Fatalf("parada con la imagen al día solo arranca: %v", llamadas)
	}
}
