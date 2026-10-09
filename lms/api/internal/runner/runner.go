// Package runner ejecuta código de alumnos en contenedores efímeros y aislados.
//
// Es la pieza de más riesgo del LMS: el código que corre aquí es NO confiable. Por eso cada
// ejecución va en un contenedor sin red, con raíz de solo lectura, un /tmp escribible y pequeño,
// sin privilegios (capabilities descartadas, usuario sin privilegios), con CPU/memoria/procesos
// limitados y un tiempo máximo. El binario del contenedor (docker o podman) se elige por entorno.
//
// Si no se configura, el runner queda deshabilitado y el endpoint responde 503: el LMS sigue
// funcionando sin ejecutar código.
package runner

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// Result es el resultado de una ejecución.
type Result struct {
	Stdout     string `json:"stdout"`
	Stderr     string `json:"stderr"`
	ExitCode   int    `json:"exit_code"`
	DurationMS int64  `json:"duration_ms"`
	TimedOut   bool   `json:"timed_out"`
}

// language describe cómo ejecutar un lenguaje dentro del contenedor.
type language struct {
	image  string
	script string // recibe el código por stdin y lo ejecuta; se pasa a `sh -c`
}

// supported: solo lenguajes con imagen oficial ligera. Bash usa Alpine; Python, Node y Go sus imágenes.
var supported = map[string]language{
	"bash":   {image: "alpine:3.20", script: "cat > /tmp/main.sh && sh /tmp/main.sh"},
	"sh":     {image: "alpine:3.20", script: "cat > /tmp/main.sh && sh /tmp/main.sh"},
	"python": {image: "python:3.12-alpine", script: "cat > /tmp/main.py && python /tmp/main.py"},
	"node":   {image: "node:22-alpine", script: "cat > /tmp/main.js && node /tmp/main.js"},
	"go":     {image: "golang:1.22-alpine", script: "cat > /tmp/main.go && cd /tmp && go run main.go"},
}

// Languages devuelve los lenguajes soportados (para la UI).
func Languages() []string { return []string{"bash", "python", "node", "go"} }

// Supported dice si el lenguaje se puede ejecutar.
func Supported(lang string) bool { _, ok := supported[normalize(lang)]; return ok }

func normalize(lang string) string {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "py", "python3", "python":
		return "python"
	case "js", "javascript", "node", "nodejs":
		return "node"
	case "shell", "sh", "bash":
		return "bash"
	case "golang", "go":
		return "go"
	}
	return strings.ToLower(strings.TrimSpace(lang))
}

// Runner ejecuta código. Zero value = deshabilitado.
type Runner struct {
	Runtime   string        // "docker" o "podman"; vacío = deshabilitado
	Timeout   time.Duration // tope por ejecución
	MaxOutput int           // bytes de stdout/stderr conservados
}

// Available dice si el runner está configurado.
func (r *Runner) Available() bool { return r != nil && r.Runtime != "" }

// ErrUnavailable: el runner no está configurado en el servidor.
var ErrUnavailable = errors.New("el runner de código no está configurado en el servidor")

const maxCode = 64 << 10 // 64 KB de código

// Run ejecuta code en el lenguaje dado y devuelve su salida. Respeta r.Timeout.
func (r *Runner) Run(ctx context.Context, lang, code string) (Result, error) {
	if !r.Available() {
		return Result{}, ErrUnavailable
	}
	if len(code) > maxCode {
		return Result{}, fmt.Errorf("el código supera %d KB", maxCode>>10)
	}
	l, ok := supported[normalize(lang)]
	if !ok {
		return Result{}, fmt.Errorf("lenguaje no soportado: %s", lang)
	}
	r.ensureImage(ctx, l.image)
	timeout := r.Timeout
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	max := r.MaxOutput
	if max <= 0 {
		max = 64 << 10
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	name := "lmsrun-" + randHex(6)
	args := []string{
		"run", "--rm", "-i", "--name", name,
		"--network=none", "--read-only",
		"--tmpfs", "/tmp:rw,exec,size=256m,mode=1777",
		"--memory", "512m", "--memory-swap", "512m",
		"--cpus", "0.5", "--pids-limit", "128",
		"--cap-drop", "ALL", "--security-opt", "no-new-privileges",
		"--user", "65534:65534",
		"--workdir", "/tmp",
		"-e", "HOME=/tmp",
		"-e", "PYTHONDONTWRITEBYTECODE=1",
		"-e", "GOCACHE=/tmp/.cache", "-e", "GOPATH=/tmp/go",
		l.image, "sh", "-c", l.script,
	}

	var stdout, stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, r.Runtime, args...)
	cmd.Stdin = strings.NewReader(code)
	cmd.Stdout = &limitedWriter{w: &stdout, n: max}
	cmd.Stderr = &limitedWriter{w: &stderr, n: max}
	cmd.WaitDelay = 2 * time.Second

	start := time.Now()
	err := cmd.Run()
	res := Result{
		Stdout:     stdout.String(),
		Stderr:     stderr.String(),
		DurationMS: time.Since(start).Milliseconds(),
		TimedOut:   ctx.Err() == context.DeadlineExceeded,
	}
	if res.TimedOut {
		// El contenedor puede haber quedado vivo: se fuerza su borrado.
		cleanCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		_ = exec.CommandContext(cleanCtx, r.Runtime, "rm", "-f", name).Run()
		cancel()
		res.Stderr += "\n[se agotó el tiempo de " + timeout.String() + "]"
		return res, nil
	}
	var exit *exec.ExitError
	switch {
	case err == nil:
		res.ExitCode = 0
	case errors.As(err, &exit):
		res.ExitCode = exit.ExitCode()
	default:
		return Result{}, err
	}
	return res, nil
}

// ensureImage descarga la imagen la primera vez, en silencio, para que el «docker pull» no
// contamine la salida (stderr) que ve el alumno. Si ya está local, no hace nada.
func (r *Runner) ensureImage(ctx context.Context, image string) {
	if exec.CommandContext(ctx, r.Runtime, "image", "inspect", image).Run() == nil {
		return
	}
	pullCtx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	_ = exec.CommandContext(pullCtx, r.Runtime, "pull", "-q", image).Run()
}

// DefaultTermImage es la imagen por defecto para la shell interactiva.
const DefaultTermImage = "python:3.12-alpine"

// ShellCmd arma una shell interactiva AISLADA (para el terminal del estudio). Mismas barreras que
// Run: sin red, sin socket, raíz de solo lectura, tmpfs con exec en /tmp, sin capabilities, usuario
// sin privilegios, CPU/memoria/procesos limitados. Devuelve también el nombre del contenedor para
// poder matarlo. El llamador la ejecuta con un PTY y respeta ctx para el cierre.
func (r *Runner) ShellCmd(ctx context.Context, image string) (*exec.Cmd, string) {
	if image == "" {
		image = DefaultTermImage
	}
	r.ensureImage(ctx, image)
	name := "lmsterm-" + randHex(6)
	args := []string{
		"run", "--rm", "-it", "--name", name,
		"--network=none", "--read-only",
		"--tmpfs", "/tmp:rw,exec,size=128m,mode=1777",
		"--memory", "512m", "--memory-swap", "512m",
		"--cpus", "0.5", "--pids-limit", "128",
		"--cap-drop", "ALL", "--security-opt", "no-new-privileges",
		"--user", "65534:65534",
		"--workdir", "/tmp",
		"-e", "HOME=/tmp", "-e", "TERM=xterm-256color",
		image, "sh",
	}
	return exec.CommandContext(ctx, r.Runtime, args...), name
}

// Kill borra un contenedor por nombre (best-effort, para el cierre del terminal).
func (r *Runner) Kill(name string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = exec.CommandContext(ctx, r.Runtime, "rm", "-f", name).Run()
}

// limitedWriter escribe como mucho n bytes y descarta el resto.
type limitedWriter struct {
	w io.Writer
	n int
}

func (l *limitedWriter) Write(p []byte) (int, error) {
	if l.n <= 0 {
		return len(p), nil
	}
	if len(p) > l.n {
		p = p[:l.n]
	}
	l.n -= len(p)
	_, err := l.w.Write(p)
	return len(p), err
}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = io.ReadFull(rand.Reader, b)
	return hex.EncodeToString(b)
}

// ParseTimeout lee «30s», «1m» o segundos sueltos; vacío → por defecto.
func ParseTimeout(v string) time.Duration {
	if strings.TrimSpace(v) == "" {
		return 15 * time.Second
	}
	if d, err := time.ParseDuration(v); err == nil {
		return d
	}
	if s, err := strconv.Atoi(v); err == nil {
		return time.Duration(s) * time.Second
	}
	return 15 * time.Second
}
