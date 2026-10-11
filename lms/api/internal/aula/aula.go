// Package aula administra el contenedor de clase de cada alumno (imagen jmd/aula): lo crea con
// límites estrictos, lo reutiliza, ejecuta comandos dentro y lo apaga o borra. Nunca monta el
// socket de Docker ni usa la red por defecto.
package aula

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// Aula guarda la configuración común de todos los contenedores de clase.
type Aula struct {
	Runtime string // "docker" o "podman"
	Imagen  string // por defecto jmd/aula:latest
	Red     string // red interna del aula; por defecto aula_net
	Token   string // token del gateway de IA que recibe el asistente (OSITO_TOKEN); vacío = sin IA en la nube

	// run permite sustituir la ejecución del binario en las pruebas.
	run func(ctx context.Context, args ...string) (string, error)
}

func (a *Aula) imagen() string {
	if a.Imagen == "" {
		return "jmd/aula:latest"
	}
	return a.Imagen
}

func (a *Aula) red() string {
	if a.Red == "" {
		return "aula_net"
	}
	return a.Red
}

func sufijo(userID string) string {
	h := sha256.Sum256([]byte(userID))
	return hex.EncodeToString(h[:])[:16]
}

// Nombre es el nombre del contenedor del alumno. No lleva datos personales: solo un hash.
func Nombre(userID string) string { return "curso-" + sufijo(userID) }

// Volumen es el volumen que guarda /trabajo del alumno.
func Volumen(userID string) string { return "trabajo-" + sufijo(userID) }

// Args devuelve los argumentos exactos de «docker run» del contenedor del alumno.
func (a *Aula) Args(userID string) []string {
	args := []string{
		"run", "-d", "--name", Nombre(userID), "--hostname", "aula",
		"--memory", "192m", "--memory-swap", "192m", "--cpus", "0.5", "--pids-limit", "96",
		"--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--read-only",
		"--tmpfs", "/tmp:rw,exec,size=64m",
		"--tmpfs", "/home/alumno:rw,size=32m,uid=10001,gid=10001",
		"-v", Volumen(userID) + ":/trabajo",
		"--network", a.red(),
		"-e", "HOME=/home/alumno", "-e", "JMD_URL=http://ai-orchestrator:4000",
		"--user", "10001:10001", "--workdir", "/trabajo",
	}
	if a.Token != "" {
		args = append(args, "-e", "OSITO_TOKEN="+a.Token, "-e", "JMD_TOKEN="+a.Token)
	}
	return append(args, a.imagen(), "sleep", "2147483647")
}

func (a *Aula) exec(ctx context.Context, args ...string) (string, error) {
	if a.run != nil {
		return a.run(ctx, args...)
	}
	out, err := exec.CommandContext(ctx, a.Runtime, args...).CombinedOutput()
	return strings.TrimSpace(string(out)), err
}

// Crear deja corriendo el contenedor del alumno. Devuelve true si ya existía y se reutilizó.
func (a *Aula) Crear(ctx context.Context, userID string) (bool, error) {
	nombre := Nombre(userID)
	out, err := a.exec(ctx, "inspect", "-f", "{{.State.Running}}", nombre)
	if err == nil {
		if out == "true" {
			return true, nil
		}
		if o, err := a.exec(ctx, "start", nombre); err != nil {
			return false, fmt.Errorf("no se pudo arrancar el aula: %s", o)
		}
		return true, nil
	}
	if o, err := a.exec(ctx, a.Args(userID)...); err != nil {
		return false, fmt.Errorf("no se pudo crear el aula: %s", o)
	}
	return false, nil
}

// Estado devuelve "corriendo", "parado" o "ninguno".
func (a *Aula) Estado(ctx context.Context, userID string) string {
	out, err := a.exec(ctx, "inspect", "-f", "{{.State.Running}}", Nombre(userID))
	switch {
	case err != nil:
		return "ninguno"
	case out == "true":
		return "corriendo"
	}
	return "parado"
}

// Exec ejecuta un comando de shell dentro del contenedor, con tope de 20 s.
func (a *Aula) Exec(ctx context.Context, nombre string, cmd ...string) (string, error) {
	if len(cmd) == 0 {
		return "", errors.New("falta el comando")
	}
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	return a.exec(ctx, "exec", nombre, "sh", "-c", strings.Join(cmd, " "))
}

// Parar detiene el contenedor sin borrarlo: el volumen /trabajo se conserva.
func (a *Aula) Parar(ctx context.Context, nombre string) error {
	_, err := a.exec(ctx, "stop", "-t", "2", nombre)
	return err
}

// Borrar elimina el contenedor. Nunca borra el volumen del alumno.
func (a *Aula) Borrar(ctx context.Context, nombre string) error {
	_, err := a.exec(ctx, "rm", "-f", nombre)
	return err
}

// Listar devuelve los nombres de todos los contenedores de aula, corriendo o no.
func (a *Aula) Listar(ctx context.Context) ([]string, error) {
	out, err := a.exec(ctx, "ps", "-a", "--filter", "name=curso-", "--format", "{{.Names}}")
	if err != nil {
		return nil, err
	}
	res := []string{}
	for _, l := range strings.Split(out, "\n") {
		if l = strings.TrimSpace(l); l != "" {
			res = append(res, l)
		}
	}
	return res, nil
}

// AsegurarRed crea la red interna del aula (sin salida a internet) y conecta el gateway de IA a ella.
func (a *Aula) AsegurarRed(ctx context.Context, gateway string) error {
	if out, err := a.exec(ctx, "network", "create", "--internal", a.red()); err != nil && !strings.Contains(out, "already exists") {
		return fmt.Errorf("no se pudo crear la red del aula: %s", out)
	}
	if gateway == "" {
		return nil
	}
	if out, err := a.exec(ctx, "network", "connect", "--alias", "ai-orchestrator", a.red(), gateway); err != nil &&
		!strings.Contains(out, "already exists") && !strings.Contains(out, "already connected") {
		return fmt.Errorf("no se pudo conectar el gateway al aula: %s", out)
	}
	return nil
}

// ShellCmd arma «docker exec -it» a la shell del contenedor del alumno, ya dentro de /trabajo.
// El llamador la ejecuta con un PTY.
func (a *Aula) ShellCmd(ctx context.Context, userID string) *exec.Cmd {
	return exec.CommandContext(ctx, a.Runtime, "exec", "-it", "-e", "TERM=xterm-256color", "-w", "/trabajo", Nombre(userID), "sh")
}
