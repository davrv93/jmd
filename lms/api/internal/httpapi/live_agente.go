package httpapi

import (
	"context"
	_ "embed"
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// El alumno escribe su prompt en la escena y el LMS se lo pasa a SU agente («jmd chat --auto») dentro de su
// aula, con las reglas del curso delante (reglas_robo3d.md). La corrida vive en el LMS, no en la petición:
// si el alumno recarga la escena, sigue y GET la retoma. Una corrida por alumno a la vez.

//go:embed reglas_robo3d.md
var reglasRobo3D string

//go:embed reglas_whatsapp.md
var reglasWhatsApp string

// roboAPI es el módulo con el que las páginas del alumno hablan con el backend de su Robo (chat, voz, imagen,
// dictado). Lo que escribe el agente cambia en cada corrida; esta pieza no: el LMS la deja en el aula y las
// reglas piden copiarla e importarla en vez de escribir fetch a mano.
//
//go:embed robo_api.js
var roboAPI []byte

// dejarRoboAPI escribe /trabajo/negocio/robo-api.js (siempre la versión del LMS).
func (s *Server) dejarRoboAPI(ctx context.Context, nombre string) {
	if out, err := s.Aula.ExecStdin(ctx, nombre, `mkdir -p /trabajo/negocio && cat > /trabajo/negocio/robo-api.js.tmp && mv /trabajo/negocio/robo-api.js.tmp /trabajo/negocio/robo-api.js`, roboAPI); err != nil {
		slog.Warn("robo-api.js", "aula", nombre, "err", err, "salida", strings.TrimSpace(out))
	}
}

const agenteTope = 8 * time.Minute

type corridaAgente struct {
	mu        sync.Mutex
	texto     string
	inicio    time.Time
	fin       time.Time
	terminada bool
	ok        bool
	ruta      string
	archivos  []string
	log       []string
	aviso     chan struct{} // se cierra (y se cambia) cada vez que hay algo nuevo
}

var corridas = struct {
	sync.Mutex
	m map[string]*corridaAgente
}{m: map[string]*corridaAgente{}}

func (c *corridaAgente) agregar(l string) {
	c.mu.Lock()
	c.log = append(c.log, l)
	if len(c.log) > 400 {
		c.log = c.log[len(c.log)-400:]
	}
	close(c.aviso)
	c.aviso = make(chan struct{})
	c.mu.Unlock()
}

func (c *corridaAgente) terminar(ok bool, ruta string, archivos []string) {
	c.mu.Lock()
	c.terminada, c.ok, c.ruta, c.archivos, c.fin = true, ok, ruta, archivos, time.Now()
	close(c.aviso)
	c.aviso = make(chan struct{})
	c.mu.Unlock()
}

// ExecStreamer lo implementa *aula.Aula; las pruebas pueden no tenerlo.
type ExecStreamer interface {
	ExecStream(ctx context.Context, nombre, script string, stdin []byte, linea func(string)) error
}

var reANSI = regexp.MustCompile(`\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07`)

func limpiarLinea(l string) string {
	if i := strings.LastIndex(l, "\r"); i >= 0 && i < len(l)-1 {
		l = l[i+1:]
	}
	l = reANSI.ReplaceAllString(l, "")
	l = strings.TrimRight(l, " \r\t")
	if len(l) > 400 {
		l = l[:400] + "…"
	}
	return l
}

// armarPedido junta las reglas del curso con el prompt del alumno, tal cual lo escribió.
func armarPedido(tipo, nombre, texto string) string {
	return armarPedidoEn(tipo, nombre, texto, "/trabajo/mi-robo")
}

// armarPedidoEn es armarPedido con la carpeta del backend del robot (mi-robo u osito).
func armarPedidoEn(tipo, nombre, texto, robot string) string {
	modo := "Construye el robot desde cero en /trabajo/robo3d (si ya existe, reemplázalo por lo que pide el alumno)."
	if tipo == "mejora" {
		modo = "El robot YA existe en /trabajo/robo3d: modifícalo, no lo borres ni empieces de cero; conserva lo que funciona."
	}
	if tipo == "whatsapp" {
		modo = ""
	}
	base := reglasRobo3D
	if tipo == "whatsapp" {
		base = reglasWhatsApp
	}
	r := strings.ReplaceAll(base, "{{ALUMNO}}", nombre)
	r = strings.ReplaceAll(r, "{{MODO}}", modo)
	r = strings.ReplaceAll(r, "{{ROBOT}}", robot)
	return r + "\n\n--- PEDIDO DEL ALUMNO (escrito por él, respétalo) ---\n" + texto + "\n--- FIN DEL PEDIDO ---\n"
}

// liveAgentePost: POST /api/v1/live/{lesson}/agente {"texto","tipo"} → NDJSON con la salida del agente.
func (s *Server) liveAgentePost(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil || !s.aulaListo(w) {
		return
	}
	st, ok := s.Aula.(ExecStreamer)
	if !ok {
		writeErr(w, 503, "sin_agente", "este servidor no puede correr el agente desde el LIVE")
		return
	}
	var in struct {
		Texto string `json:"texto"`
		Tipo  string `json:"tipo"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Texto = strings.TrimSpace(in.Texto)
	if in.Tipo != "mejora" && in.Tipo != "whatsapp" {
		in.Tipo = "robot"
	}
	if len(in.Texto) > 4000 {
		writeErr(w, 400, "texto_invalido", "el prompt pasa de 4000 caracteres")
		return
	}
	if _, _, listo := calificarReglas(in.Tipo, in.Texto); !listo {
		writeErr(w, 422, "prompt_flojo", "a tu prompt le falta algo importante: califícalo y revisa lo marcado en rojo")
		return
	}
	corridas.Lock()
	if c := corridas.m[p.ID]; c != nil {
		c.mu.Lock()
		ocupado := !c.terminada
		c.mu.Unlock()
		if ocupado {
			corridas.Unlock()
			writeErr(w, 409, "agente_ocupado", "tu agente todavía está trabajando en el pedido anterior")
			return
		}
	}
	c := &corridaAgente{texto: in.Texto, inicio: time.Now(), aviso: make(chan struct{})}
	corridas.m[p.ID] = c
	corridas.Unlock()

	if _, err := s.Aula.Crear(r.Context(), p.ID); err != nil {
		c.agregar("no se pudo abrir tu aula: " + err.Error())
		c.terminar(false, "", nil)
		internal(w, err)
		return
	}
	tocarAula(p.ID)
	s.montarSkills(r.Context(), p.ID)
	nombre := aula.Nombre(p.ID)
	s.puenteOsito(r.Context(), nombre)
	s.dejarRoboAPI(r.Context(), nombre)
	robot := s.robotDe(r.Context(), nombre)
	pedido := armarPedidoEn(in.Tipo, p.Name, in.Texto, robot)
	go s.correrAgente(st, c, nombre, p.ID, pedido, in.Tipo, robot)
	s.liveAgenteSeguir(w, r, c)
}

func (s *Server) correrAgente(st ExecStreamer, c *corridaAgente, nombre, userID, pedido, tipo, robot string) {
	ctx, cancel := context.WithTimeout(context.Background(), agenteTope+30*time.Second)
	defer cancel()
	// el pedido va por stdin: así no se interpreta nada de lo que escribió el alumno
	script := `P=$(cat); cd /trabajo && mkdir -p robo3d && touch /tmp/.agente-inicio && timeout ` + itoaDur(agenteTope) + ` jmd chat --auto "$P" 2>&1; echo "__fin $?"`
	codigo := ""
	err := st.ExecStream(ctx, nombre, script, []byte(pedido), func(l string) {
		l = limpiarLinea(l)
		if strings.HasPrefix(l, "__fin ") {
			codigo = strings.TrimPrefix(l, "__fin ")
			return
		}
		if l != "" {
			c.agregar(l)
			tocarAula(userID)
		}
	})
	if err != nil {
		slog.Warn("agente LIVE", "aula", nombre, "err", err)
	}
	if codigo == "124" {
		c.agregar("⏱ el agente llegó al tope de " + itoaDur(agenteTope) + " s; reviso lo que dejó hecho")
	}
	ctx2, cancel2 := context.WithTimeout(context.Background(), 40*time.Second)
	defer cancel2()
	// El robot va en robo3d/ salvo que el alumno pida otra carpeta (p. ej. «guárdalo en mickey»): vale el
	// index.html que el agente escribió en esta corrida, con robo3d primero.
	carpeta := "robo3d"
	if tipo == "whatsapp" {
		carpeta = strings.TrimPrefix(robot, "/trabajo/") + "/backend"
	} else if nuevo, _ := s.Aula.Exec(ctx2, nombre, scriptIndexNuevo); strings.TrimSpace(nuevo) != "" {
		carpeta = strings.TrimSpace(nuevo)
	}
	out, _ := s.Aula.Exec(ctx2, nombre, `cd /trabajo && find `+carpeta+` -maxdepth 2 -type f ! -name '*.log' ! -name '*.pyc' 2>/dev/null | sort | head -n 30`)
	var archivos []string
	for _, l := range strings.Split(out, "\n") {
		if l = strings.TrimSpace(l); l != "" {
			archivos = append(archivos, l)
		}
	}
	listo := false
	for _, a := range archivos {
		listo = listo || a == carpeta+"/index.html"
	}
	// el backend de la sesión 2 responde /api/chat, /api/voz y /api/stt a la página 3D
	// con WhatsApp el backend cambió: osito se reinicia (aula iniciar no relanza si ya corre)
	reiniciar := `aula iniciar 2>&1 | tail -n 1`
	if tipo == "whatsapp" {
		reiniciar = `aula parar >/dev/null 2>&1; aula iniciar 2>&1 | tail -n 1`
	}
	arr, _ := s.Aula.Exec(ctx2, nombre, `if [ -f /trabajo/mi-robo/robo.sh ]; then sh /trabajo/mi-robo/robo.sh reiniciar 2>&1 | tail -n 1; else `+reiniciar+`; fi`)
	if strings.TrimSpace(arr) != "" {
		c.agregar("▶ backend de tu robot: " + strings.TrimSpace(arr))
	}
	ruta := map[bool]string{true: carpeta + "/index.html"}[listo]
	if tipo == "whatsapp" {
		// listo = el backend importa sin errores y tiene la ruta del webhook
		chk, _ := s.Aula.Exec(ctx2, nombre, `cd `+robot+` 2>/dev/null && grep -q "/api/webhook" backend/*.py && /opt/venv/bin/python -c "import backend.app" >/dev/null 2>&1 && echo WEBHOOK_OK`)
		listo, ruta = strings.Contains(chk, "WEBHOOK_OK"), ""
		if !listo {
			c.agregar("✗ tu backend no quedó con /api/webhook o no importa sin errores: revisa lo que dijo tu agente")
		}
	} else if !listo {
		c.agregar("✗ no quedó /trabajo/robo3d/index.html: revisa lo que dijo tu agente y mejora el prompt")
	}
	c.terminar(listo, ruta, archivos)
}

// scriptIndexNuevo: carpeta (relativa a /trabajo, hasta 2 niveles) del index.html que el agente escribió en
// esta corrida; robo3d si está entre ellas. Fuera quedan el Robo de la sesión 2 y lo que no es del alumno.
const scriptIndexNuevo = `cd /trabajo 2>/dev/null && [ -f /tmp/.agente-inicio ] || exit 0
l=$(find . -maxdepth 3 -name index.html -newer /tmp/.agente-inicio ! -path './osito/*' ! -path './mi-robo/*' ! -path './skills/*' ! -path '*/node_modules/*' 2>/dev/null | sed 's|^\./||; s|/index.html$||' | grep -v '^index.html$')
printf '%s\n' "$l" | grep -qx robo3d && { echo robo3d; exit 0; }
printf '%s\n' "$l" | grep -v '^$' | head -n 1`

func itoaDur(d time.Duration) string { return strconv.Itoa(int(d.Seconds())) }

// liveAgenteSeguir escribe la corrida como NDJSON hasta que termina o el alumno se va.
func (s *Server) liveAgenteSeguir(w http.ResponseWriter, r *http.Request, c *corridaAgente) {
	h := w.Header()
	h.Set("Content-Type", "application/x-ndjson; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Accel-Buffering", "no") // nginx: entregar cada línea al momento
	w.WriteHeader(200)
	fl, _ := w.(http.Flusher)
	enc := json.NewEncoder(w)
	_ = enc.Encode(map[string]any{"t": "inicio", "motor": "jmd"})
	if fl != nil {
		fl.Flush()
	}
	enviadas := 0
	latido := time.NewTicker(15 * time.Second)
	defer latido.Stop()
	for {
		c.mu.Lock()
		nuevas := append([]string(nil), c.log[min(enviadas, len(c.log)):]...)
		enviadas = len(c.log)
		terminada, ok, ruta, archivos, seg := c.terminada, c.ok, c.ruta, c.archivos, int(time.Since(c.inicio).Seconds())
		if terminada {
			seg = int(c.fin.Sub(c.inicio).Seconds())
		}
		aviso := c.aviso
		c.mu.Unlock()
		for _, l := range nuevas {
			_ = enc.Encode(map[string]string{"t": "log", "x": l})
		}
		if terminada {
			_ = enc.Encode(map[string]any{"t": "fin", "ok": ok, "ruta": ruta, "segundos": seg, "archivos": archivos})
			if fl != nil {
				fl.Flush()
			}
			return
		}
		if fl != nil {
			fl.Flush()
		}
		select {
		case <-r.Context().Done():
			return
		case <-aviso:
		case <-latido.C:
			_ = enc.Encode(map[string]any{"t": "latido", "segundos": seg})
		}
	}
}

// liveAgenteGet: GET /api/v1/live/{lesson}/agente — la última corrida (para retomarla).
func (s *Server) liveAgenteGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	corridas.Lock()
	c := corridas.m[p.ID]
	corridas.Unlock()
	if c == nil {
		writeJSON(w, 200, map[string]any{"corriendo": false, "fin": false})
		return
	}
	if r.URL.Query().Get("seguir") == "1" {
		s.liveAgenteSeguir(w, r, c)
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	log := c.log
	if len(log) > 60 {
		log = log[len(log)-60:]
	}
	seg := int(time.Since(c.inicio).Seconds())
	if c.terminada {
		seg = int(c.fin.Sub(c.inicio).Seconds())
	}
	writeJSON(w, 200, map[string]any{"corriendo": !c.terminada, "fin": c.terminada, "ok": c.ok, "ruta": c.ruta,
		"inicio": c.inicio.UTC().Format(time.RFC3339), "segundos": seg, "log": log, "texto": c.texto, "archivos": c.archivos})
}
