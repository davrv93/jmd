// Package aula administra el contenedor de clase de cada alumno (imagen jmd/aula): lo crea con
// límites estrictos, lo reutiliza, ejecuta comandos dentro y lo apaga o borra. Nunca monta el
// socket de Docker ni usa la red por defecto.
package aula

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"os/exec"
	"sort"
	"strings"
	"sync"
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
		// jmd ve, desde cualquier carpeta, las skills propias (que el LMS escribe en /trabajo/skills) y las del
		// curso. Las del curso no pueden ir en ~/.config/jmd/skills: el home es un tmpfs y tapa el enlace
		// que trae la imagen.
		"-e", "JMD_SKILLS=/trabajo/skills:/opt/skills-curso",
		"--user", "10001:10001", "--workdir", "/trabajo",
	}
	if a.Token != "" {
		// jmd lee la clave de JMD_API_KEY; el asistente, OSITO_TOKEN.
		args = append(args, "-e", "OSITO_TOKEN="+a.Token, "-e", "JMD_TOKEN="+a.Token, "-e", "JMD_API_KEY="+a.Token)
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

// ExecStdin ejecuta un script de shell dentro del contenedor y le pasa stdin (para escribir archivos
// sin interpolar su contenido en la línea de comandos). Tope de 20 s.
func (a *Aula) ExecStdin(ctx context.Context, nombre, script string, stdin []byte) (string, error) {
	if a.run != nil {
		return a.run(ctx, "exec-stdin", nombre, script, string(stdin))
	}
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, a.Runtime, "exec", "-i", nombre, "sh", "-c", script)
	cmd.Stdin = bytes.NewReader(stdin)
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
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

// Errores de Leer.
var (
	ErrNoExiste = errors.New("el archivo no existe")
	ErrGrande   = errors.New("el archivo es demasiado grande")
)

// Leer devuelve el contenido de un archivo de /trabajo del alumno (ruta relativa a /trabajo, ya validada
// por el llamador). Falla con ErrNoExiste si no es un archivo y con ErrGrande si pasa de max bytes.
func (a *Aula) Leer(ctx context.Context, nombre, ruta string, max int64) ([]byte, error) {
	if a.run != nil {
		out, err := a.run(ctx, "leer", nombre, ruta)
		if err != nil {
			return nil, ErrNoExiste
		}
		return []byte(out), nil
	}
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	script := `f="/trabajo/$1"; test -f "$f" || exit 3; s=$(stat -c %s "$f"); [ "$s" -le "$2" ] || exit 4; cat "$f"`
	cmd := exec.CommandContext(ctx, a.Runtime, "exec", nombre, "sh", "-c", script, "--", ruta, fmt.Sprint(max))
	out, err := cmd.Output()
	if err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			switch ee.ExitCode() {
			case 3:
				return nil, ErrNoExiste
			case 4:
				return nil, ErrGrande
			}
		}
		return nil, err
	}
	return out, nil
}

// Version es una huella corta del contenido de /trabajo (fechas y nombres), sin contar logs ni cachés.
// Cambia cuando el alumno guarda un archivo: el visor la sondea para recargarse solo.
func (a *Aula) Version(ctx context.Context, nombre string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	script := `find /trabajo \( -name '*.log' -o -name __pycache__ -o -name .git -o -name node_modules \) -prune -o -type f -exec stat -c '%Y %n' {} + 2>/dev/null | sort | md5sum | cut -c1-12`
	out, err := a.exec(ctx, "exec", nombre, "sh", "-c", script)
	return strings.TrimSpace(out), err
}

// Dial abre una conexión TCP al puerto del contenedor del alumno SIN depender de la red: lanza
// «exec -i nc 127.0.0.1 <puerto>» dentro del contenedor y usa su entrada y salida como conexión. Así el
// LMS funciona igual si corre en el host o en un contenedor, y el aula puede seguir en una red interna.
func (a *Aula) Dial(ctx context.Context, userID string, puerto int) (net.Conn, error) {
	cmd := exec.Command(a.Runtime, "exec", "-i", Nombre(userID), "nc", "127.0.0.1", fmt.Sprint(puerto))
	in, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	out, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	return &conexionExec{cmd: cmd, in: in, out: out}, nil
}

// conexionExec adapta un proceso a net.Conn. No soporta plazos: el llamador usa cierres con contexto.
type conexionExec struct {
	cmd  *exec.Cmd
	in   io.WriteCloser
	out  io.ReadCloser
	once sync.Once
}

type direccionExec struct{}

func (direccionExec) Network() string { return "exec" }
func (direccionExec) String() string  { return "aula" }

func (c *conexionExec) Read(p []byte) (int, error)  { return c.out.Read(p) }
func (c *conexionExec) Write(p []byte) (int, error) { return c.in.Write(p) }
func (c *conexionExec) Close() error {
	c.once.Do(func() {
		_ = c.in.Close()
		if c.cmd.Process != nil {
			_ = c.cmd.Process.Kill()
		}
		go func() { _ = c.cmd.Wait() }()
	})
	return nil
}
func (c *conexionExec) LocalAddr() net.Addr                { return direccionExec{} }
func (c *conexionExec) RemoteAddr() net.Addr               { return direccionExec{} }
func (c *conexionExec) SetDeadline(t time.Time) error      { return nil }
func (c *conexionExec) SetReadDeadline(t time.Time) error  { return nil }
func (c *conexionExec) SetWriteDeadline(t time.Time) error { return nil }

// Proyecto es una carpeta de /trabajo con un index.html que el visor puede mostrar.
type Proyecto struct {
	Ruta   string `json:"ruta"`   // relativa a /trabajo, p. ej. "veterinaria/index.html"
	Nombre string `json:"nombre"` // para mostrar
	Mod    int64  `json:"mod"`    // última modificación (segundos Unix)
}

// Proyectos lista, del más reciente al más antiguo, las carpetas de /trabajo (hasta 3 niveles) que tienen
// un index.html: lo que el alumno va creando. El asistente («osito/frontend») va con su nombre propio y el
// resto de /trabajo/osito no cuenta. El index.html de la raíz es solo la puerta al asistente y no se lista.
func (a *Aula) Proyectos(ctx context.Context, nombre string) ([]Proyecto, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	script := `find /trabajo -maxdepth 3 -name index.html \( -path '*/node_modules' -o -path '*/.git' \) -prune -o -name index.html -not -path '/trabajo/osito/*' -not -path '/trabajo/index.html' -exec stat -c '%Y %n' {} + 2>/dev/null; [ -f /trabajo/osito/frontend/index.html ] && stat -c '%Y %n' /trabajo/osito/frontend/index.html`
	out, _ := a.exec(ctx, "exec", nombre, "sh", "-c", script)
	var res []Proyecto
	for _, l := range strings.Split(out, "\n") {
		campos := strings.SplitN(strings.TrimSpace(l), " ", 2)
		if len(campos) != 2 || !strings.HasPrefix(campos[1], "/trabajo/") {
			continue
		}
		var mod int64
		if _, err := fmt.Sscan(campos[0], &mod); err != nil {
			continue
		}
		ruta := strings.TrimPrefix(campos[1], "/trabajo/")
		nom := strings.TrimSuffix(strings.TrimSuffix(ruta, "index.html"), "/")
		if ruta == "osito/frontend/index.html" {
			nom = "Mi asistente (Robo)"
		}
		if nom == "" {
			nom = ruta
		}
		res = append(res, Proyecto{Ruta: ruta, Nombre: nom, Mod: mod})
	}
	sort.Slice(res, func(i, j int) bool { return res[i].Mod > res[j].Mod })
	return res, nil
}
