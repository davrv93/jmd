package aula

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os/exec"
	"strings"
	"testing"
	"time"
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
	for _, quiere := range []string{"--memory 384m", "--memory-swap 384m", "--pids-limit 256", "--init", "--read-only", "--cap-drop ALL", "--network aula_net", "--user 10001:10001", "jmd/aula:latest sleep"} {
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

// Version: la carpeta va como argumento ($1), nunca dentro del script; se saltan cachés y logs.
func TestVersionDir(t *testing.T) {
	var vistos [][]string
	a := &Aula{}
	a.run = func(_ context.Context, args ...string) (string, error) {
		vistos = append(vistos, args)
		return "abc123def456.aaaaaa.bbbbbb\n", nil
	}
	ctx := context.Background()
	v, err := a.Version(ctx, "curso-x", "veterinaria")
	if err != nil || v != "abc123def456.aaaaaa.bbbbbb" {
		t.Fatalf("version: %q %v", v, err)
	}
	args := vistos[0]
	if args[0] != "exec" || args[1] != "curso-x" || args[len(args)-2] != "--" || args[len(args)-1] != "veterinaria" {
		t.Errorf("argumentos: %v", args)
	}
	script := args[len(args)-3]
	if strings.Contains(script, "veterinaria") {
		t.Errorf("la carpeta no va dentro del script")
	}
	for _, quiere := range []string{".bun-cache", ".cache", ".npm", "node_modules", ".git", "__pycache__", "'*.log'", "-prune"} {
		if !strings.Contains(script, quiere) {
			t.Errorf("el script debe saltarse %s", quiere)
		}
	}
	if _, err := a.Version(ctx, "curso-x", ""); err != nil || vistos[1][len(vistos[1])-1] != "" {
		t.Errorf("sin carpeta = todo /trabajo: %v %v", err, vistos[1])
	}
	for _, mala := range []string{"..", ".", "a/b", "../etc", "a b", "$(id)", "x;y", strings.Repeat("a", 200)} {
		if _, err := a.Version(ctx, "curso-x", mala); !errors.Is(err, ErrDir) {
			t.Errorf("%q debe rechazarse: %v", mala, err)
		}
	}
	if len(vistos) != 2 {
		t.Errorf("una carpeta mala no llega a ejecutar nada: %d", len(vistos))
	}
}

// AULA_SUB, AULA_DSH_URL y AULA_DSH_HOST solo con LMS_PUBLIC_URL definida; y entran en la firma (recrean el aula).
func TestArgsAulaEntornoDsh(t *testing.T) {
	sin := &Aula{}
	if j := strings.Join(sin.Args("u1"), " "); strings.Contains(j, "AULA_") {
		t.Errorf("sin PublicURL no hay variables AULA_*: %s", j)
	}
	a := &Aula{PublicURL: "https://jmd-learn.online/"}
	j := strings.Join(a.Args("u1"), " ")
	for _, quiere := range []string{"-e AULA_SUB=u1", "-e AULA_DSH_URL=https://jmd-learn.online/dsh/u1/", "-e AULA_DSH_HOST=jmd-learn.online"} {
		if !strings.Contains(j, quiere) {
			t.Errorf("falta %q en %s", quiere, j)
		}
	}
	if !strings.HasSuffix(j, "jmd/aula:latest sleep 2147483647") || !strings.Contains(j, "--label "+EtiquetaFirma+"="+a.Firma("u1")) {
		t.Errorf("imagen y firma siguen al final: %s", j)
	}
	if a.Firma("u1") == sin.Firma("u1") {
		t.Errorf("la firma debe cambiar al definir PublicURL")
	}
	if h := strings.Join((&Aula{PublicURL: "http://localhost:8080"}).Args("u1"), " "); !strings.Contains(h, "AULA_DSH_HOST=localhost:8080") {
		t.Errorf("host con puerto: %s", h)
	}
	if m := strings.Join((&Aula{PublicURL: "no-es-url"}).Args("u1"), " "); strings.Contains(m, "AULA_") {
		t.Errorf("URL inválida: nada: %s", m)
	}
}

// El relé de Dial debe salir cuando el servidor cierra aunque su entrada siga abierta (el nc de busybox no lo
// hacía y el WebSocket de dsh quedaba colgado), y pasar el cierre de la entrada como semicierre.
func TestRelayAula(t *testing.T) {
	py, err := exec.LookPath("python3")
	if err != nil {
		t.Skip("sin python3 en esta máquina")
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	puerto := fmt.Sprint(ln.Addr().(*net.TCPAddr).Port)
	correr := func(t *testing.T, cerrarEntrada bool, entrada string) (string, time.Duration) {
		cmd := exec.Command(py, "-I", "-S", "-c", RelayAula, puerto)
		in, _ := cmd.StdinPipe()
		var out bytes.Buffer
		cmd.Stdout = &out
		if err := cmd.Start(); err != nil {
			t.Fatal(err)
		}
		defer in.Close()
		_, _ = io.WriteString(in, entrada)
		if cerrarEntrada {
			in.Close()
		}
		t0 := time.Now()
		hecho := make(chan error, 1)
		go func() { hecho <- cmd.Wait() }()
		select {
		case err := <-hecho:
			if err != nil {
				t.Fatalf("el relé falló: %v", err)
			}
		case <-time.After(5 * time.Second):
			_ = cmd.Process.Kill()
			t.Fatal("el relé no salió tras cerrar el servidor (entrada abierta)")
		}
		return out.String(), time.Since(t0)
	}

	// 1) El servidor escribe y cierra; la entrada del relé sigue abierta: debe salir igual.
	go func() {
		c, err := ln.Accept()
		if err != nil {
			return
		}
		_, _ = io.WriteString(c, "hola")
		c.Close()
	}()
	if got, _ := correr(t, false, ""); got != "hola" {
		t.Fatalf("servidor que cierra: %q", got)
	}

	// 2) Semicierre: el relé manda «abc», cierra su entrada; el servidor lee hasta EOF, contesta y cierra.
	go func() {
		c, err := ln.Accept()
		if err != nil {
			return
		}
		b, _ := io.ReadAll(c)
		_, _ = io.WriteString(c, string(b)+"-fin")
		c.Close()
	}()
	if got, _ := correr(t, true, "abc"); got != "abc-fin" {
		t.Fatalf("semicierre: %q", got)
	}
}
