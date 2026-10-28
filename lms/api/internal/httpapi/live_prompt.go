package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// Sesión 3 del grupo 5: el alumno escribe el prompt de su robot en el LIVE. Aquí se califica con reglas
// fijas (siempre, sin red) y con un comentario de Gemini (si responde). Las reglas deciden si el prompt
// puede ir al agente; la IA solo da criterio: nunca reescribe el prompt.

type reglaPrompt struct {
	ID      string `json:"id"`
	OK      bool   `json:"ok"`
	Titulo  string `json:"titulo"`
	Consejo string `json:"consejo"`
	Bloquea bool   `json:"bloquea"`
	peso    int
}

type defRegla struct {
	id, titulo, consejo string
	peso                int
	bloquea             bool
	re                  *regexp.Regexp // basta con que aparezca
}

func rx(s string) *regexp.Regexp { return regexp.MustCompile(`(?i)` + s) }

// reComandos: el curso pide describir el resultado, no dictarle comandos al agente.
var reComandos = rx("(^|\\s)(sudo|rm -rf|chmod|bash |sh |curl |wget |npm (i|install)|pip install|cd /)|```|\\$ ")

var reglasPorTipo = map[string][]defRegla{
	"robot": {
		{"motor", "Dices con qué se dibuja", "Nombra la librería: Three.js (3D), p5.js, SVG animado o Canvas 2D.", 20, true,
			rx(`three|p5|svg|canvas|babylon|a-?frame|webgl`)},
		{"personalidad", "Le pides que lea tu personalidad", "Dile de dónde sale su forma de ser: la personalidad de tu asistente.json.", 15, true,
			rx(`personalidad|asistente\.json|car[aá]cter|forma de ser`)},
		{"preguntas", "Usa tus preguntas frecuentes", "Pide que responda con las preguntas frecuentes que ya configuraste.", 15, false,
			rx(`pregunta|faq|respuesta|responda|responder`)},
		{"destino", "Dices dónde guardarlo", "Indica la carpeta: robo3d (así lo abres en el Visor como robo3d/index.html).", 10, false,
			rx(`robo3d|carpeta|gu[aá]rd|index\.html`)},
		{"interaccion", "Explicas cómo se conversa", "¿Cómo le habla el cliente? Una caja de chat, botones con las preguntas, el micrófono…", 10, false,
			rx(`chat|convers|escrib|bot[oó]n|burbuja|micr[oó]fono|hable|conteste|di[aá]logo`)},
		{"aspecto", "Describes cómo se ve y se mueve", "Cuenta cómo se ve: colores de tu marca, ojos que parpadean, que gire o salude…", 10, false,
			rx(`anim|parpad|gir|mueva|muev|salud|respir|sonr|ojos|brazo|cabeza|color|marca|luz|sombra`)},
		{"comprobacion", "Dices cómo sabrás que está bien", "Termina con un criterio: «comprueba que…», «debe…», «sin errores en la consola».", 10, false,
			rx(`comprueb|verific|prueb|aseg[uú]r|debe|sin errores|que funcione|criterio`)},
	},
	"mejora": {
		{"referencia", "Hablas del robot que ya tienes", "Empieza diciendo qué mejorar del robot de robo3d, sin empezar de cero.", 20, true,
			rx(`robo3d|mi robot|el robot|robo|tu robot|que ya`)},
		{"cambio", "Pides un cambio concreto", "Un cambio claro: que hable con voz, que escuche, un fondo, una animación por ánimo…", 30, true,
			rx(`voz|hable|escuch|micr[oó]fono|anim|fondo|imagen|color|ojos|gest|salud|bot[oó]n|sonido|tama[nñ]o|luz`)},
		{"conservar", "Pides conservar lo que funciona", "Dile qué no debe romper: «sin perder el chat», «conserva los colores»…", 15, false,
			rx(`conserv|sin (perder|romper|borrar|cambiar)|mant[eé]n|igual|que siga`)},
		{"comprobacion", "Dices cómo sabrás que está bien", "Termina con un criterio: «comprueba que…», «debe…».", 15, false,
			rx(`comprueb|verific|prueb|aseg[uú]r|debe|sin errores|que funcione`)},
	},
	"whatsapp": {
		{"canal", "Dices que es por WhatsApp", "Nombra el canal: que tu robot conteste los mensajes de WhatsApp (Evolution Go).", 20, true,
			rx(`whats|evolution|wsp|wasap`)},
		{"mismo", "Pides que sea el mismo robot", "Que use la misma personalidad y las mismas preguntas frecuentes que ya configuraste.", 20, true,
			rx(`personalidad|asistente\.json|mismo|misma|preguntas|herramientas`)},
		{"recibir", "Explicas qué pasa cuando llega un mensaje", "Cuenta el camino: llega el mensaje (webhook) y tu robot responde a esa persona.", 15, false,
			rx(`webhook|mensaje|llegue|reciba|escrib|respond|conteste`)},
		{"bot", "Avisas que es un bot", "Que al primer mensaje se presente como asistente virtual del negocio.", 10, false,
			rx(`bot|asistente virtual|present|aviso|avise`)},
		{"limites", "Pones límites", "¿Qué NO debe hacer? Grupos, inventar precios, dejar sin respuesta, mostrar claves…", 15, false,
			rx(`no (debe|respond|invent|conteste)|grupo|nunca|solo (a|respond|conteste)|sin (inventar|silencio)|clave|token|disculpa`)},
		{"comprobacion", "Dices cómo sabrás que está bien", "Termina con un criterio: «comprueba que…», «debe…».", 10, false,
			rx(`comprueb|verific|prueb|aseg[uú]r|debe|sin errores|que funcione`)},
	},
	"imagen": {
		{"estilo", "Dices el estilo", "Ilustración, render 3D, acuarela, pixel art, fotografía de producto…", 25, true,
			rx(`ilustr|3d|render|acuarel|pixel|foto|cartoon|caricatur|flat|plano|minimal|[oó]leo|anime|isom[eé]tric|low.?poly|vector`)},
		{"ambiente", "Describes la luz y el ambiente", "¿Cómo es la luz? Cálida de tarde, neón de noche, estudio suave…", 20, false,
			rx(`luz|ilumin|atardec|ne[oó]n|noche|c[aá]lid|suave|brill|sombra|amanecer|ambiente|ciel`)},
		{"encuadre", "Dices el encuadre", "Plano general, primer plano, vista desde arriba, fondo despejado al centro…", 20, false,
			rx(`plano|vista|encuadr|centr|fondo|panor|horizontal|vertical|cuadrad|perspectiva|cerca|lejos`)},
		{"colores", "Nombras los colores", "Usa los colores de tu marca o una paleta: «tonos café y crema».", 15, false,
			rx(`color|tono|paleta|#[0-9a-f]{3,6}|azul|rojo|verde|amarill|naranj|morad|rosad|caf[eé]|crema|negro|blanco|dorad|plateado`)},
	},
}

// calificarReglas aplica las reglas del tipo y devuelve puntaje 0-100, la lista y si puede ir al agente.
func calificarReglas(tipo, texto string) (int, []reglaPrompt, bool) {
	defs := reglasPorTipo[tipo]
	var out []reglaPrompt
	total, ganado, bloqueado := 0, 0, false
	add := func(r reglaPrompt) {
		out = append(out, r)
		total += r.peso
		if r.OK {
			ganado += r.peso
		} else if r.Bloquea {
			bloqueado = true
		}
	}
	for _, d := range defs {
		add(reglaPrompt{ID: d.id, OK: d.re.MatchString(texto), Titulo: d.titulo, Consejo: d.consejo, Bloquea: d.bloquea, peso: d.peso})
	}
	palabras := len(strings.Fields(texto))
	minimo := 25
	if tipo != "robot" {
		minimo = 12
	}
	add(reglaPrompt{ID: "largo", OK: palabras >= minimo, Titulo: "Tiene suficiente detalle",
		Consejo: "Escribe al menos " + strconv.Itoa(minimo) + " palabras: el agente solo sabe lo que tú le cuentas.", Bloquea: palabras < minimo/2, peso: 5})
	if tipo != "imagen" {
		add(reglaPrompt{ID: "sin_comandos", OK: !reComandos.MatchString(texto), Titulo: "Describe el resultado, no comandos",
			Consejo: "Quita los comandos: di qué quieres lograr y deja que el agente decida cómo.", Bloquea: true, peso: 5})
	} else {
		add(reglaPrompt{ID: "sin_texto", OK: rx(`sin (texto|letras|palabras)`).MatchString(texto), Titulo: "Pides que no lleve letras",
			Consejo: "Los modelos de imagen escriben mal: agrega «sin texto ni letras».", peso: 5})
	}
	puntaje := 0
	if total > 0 {
		puntaje = (ganado*100 + total/2) / total
	}
	return puntaje, out, puntaje >= 60 && !bloqueado
}

const sistemaCalificar = "Eres docente de un curso de programación agéntica en Perú. Un alumno escribió un prompt para su agente de IA. " +
	"Tu trabajo es desarrollar su criterio: NUNCA reescribas el prompt ni des uno listo para copiar. " +
	"Responde SOLO un objeto JSON con: " +
	`"comentario" (dos frases cortas y amables sobre qué tan claro es el pedido), ` +
	`"fortalezas" (hasta 3 frases cortas: lo que ya está bien), ` +
	`"falta" (hasta 3 pistas cortas de lo que le falta, en forma de pista, no de texto para pegar), ` +
	`"pregunta" (una sola pregunta que le haga pensar en lo más importante que le falta), ` +
	`"puntaje" (entero 0-100). Español, tuteo, sin markdown.`

var contextoTipo = map[string]string{
	"robot":    "El prompt pide construir una página web con un robot (Three.js, p5.js, SVG o Canvas) que use la personalidad y las preguntas frecuentes de su asistente.json (de la sesión anterior), guardada en la carpeta robo3d.",
	"mejora":   "El prompt pide mejorar el robot que ya existe en la carpeta robo3d (voz, micrófono, animaciones, fondo con una imagen…).",
	"whatsapp": "El prompt pide que el mismo robot de la sesión 2 (backend FastAPI) conteste los mensajes de WhatsApp que llegan por el webhook de Evolution Go, con su personalidad y preguntas frecuentes.",
	"imagen":   "El prompt es para un modelo de imagen (FLUX): un fondo, escenario o póster para el robot del negocio del alumno.",
}

// livePrompt: POST /api/v1/live/{lesson}/prompt {"texto","tipo"}.
func (s *Server) livePrompt(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Texto string `json:"texto"`
		Tipo  string `json:"tipo"`
		SinIA bool   `json:"sin_ia"` // solo reglas: respuesta inmediata (la escena pide la IA después)
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Texto = strings.TrimSpace(in.Texto)
	if _, ok := reglasPorTipo[in.Tipo]; !ok {
		in.Tipo = "robot"
	}
	if in.Texto == "" || len(in.Texto) > 4000 {
		writeErr(w, 400, "texto_invalido", "escribe tu prompt (hasta 4000 caracteres)")
		return
	}
	puntaje, reglas, listo := calificarReglas(in.Tipo, in.Texto)
	nivel := "flojo"
	switch {
	case listo && puntaje >= 80:
		nivel = "listo"
	case listo:
		nivel = "casi"
	}
	res := map[string]any{"puntaje": puntaje, "nivel": nivel, "listo": listo, "reglas": reglas, "ia": nil}
	w.Header().Set("Cache-Control", "no-store")
	if in.SinIA {
		writeJSON(w, 200, res)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 40*time.Second)
	defer cancel()
	ia, modelo, err := geminiJSON(ctx, sistemaCalificar,
		[]geminiParte{{Texto: contextoTipo[in.Tipo] + "\n\nPrompt del alumno:\n«" + in.Texto + "»"}}, 700)
	if err == nil {
		ia["motor"] = modelo
		res["ia"] = ia
	} else {
		res["ia_error"] = "la IA no respondió a tiempo; las reglas sí te califican"
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, res)
}

// scriptPuenteOsito: en el G5 el Robo de la sesión 2 quedó en /trabajo/osito (el asistente del aula), no en
// /trabajo/mi-robo con su negocio/asistente.json. Si falta asistente.json y existe osito, lo arma desde su
// faq.json (mismo formato) y la personalidad de motores.py, para que la sesión 3 parta del robot del alumno
// y no del ejemplo de la cafetería. Nunca pisa un asistente.json que ya exista. Si el aula no tiene ningún
// Robo (el alumno no arrancó la sesión 2), «aula iniciar» le crea el base en /trabajo/osito y lo deja
// corriendo en el 8766, así el robot 3D conversa; ese asistente.json lleva origen «osito-nuevo».
const scriptPuenteOsito = `ORIGEN=osito
if [ ! -d /trabajo/osito ] && [ ! -d /trabajo/mi-robo ]; then aula iniciar >/dev/null 2>&1 || true; ORIGEN=osito-nuevo; fi
[ -f /trabajo/negocio/asistente.json ] && exit 0
[ -f /trabajo/osito/backend/faq.json ] || exit 0
export ORIGEN
mkdir -p /trabajo/negocio && /opt/venv/bin/python - <<'PY'
import json, os, pathlib, re
b = pathlib.Path("/trabajo/osito/backend")
faq = json.loads((b / "faq.json").read_text(encoding="utf-8"))
m = (b / "motores.py").read_text(encoding="utf-8") if (b / "motores.py").exists() else ""
n = re.search(r'NOMBRE\s*=\s*os\.environ\.get\(\s*"OSITO_NOMBRE"\s*,\s*"([^"]+)"', m)
nombre = n.group(1) if n else "Robo"
p = re.search(r'SYSTEM_PROMPT\s*=\s*f?"""(.*?)"""', m, re.S)
pers = p.group(1).replace("{NOMBRE}", nombre).split("Termina SIEMPRE")[0].strip() if p else "Amable y curioso."
a = {"nombre": nombre,
     "negocio": {"nombre": "Taller de programación agéntica", "rubro": "asistente del curso", "whatsapp": ""},
     "personalidad": pers, "saludo": "¡Hola! Soy " + nombre + ". ¿Qué quieres saber del taller?",
     "preguntas_frecuentes": faq if isinstance(faq, list) else [],
     "reglas": ["Si no sabes algo, dilo: no inventes."],
     "marca": {"primario": "#3b5bdb", "acento": "#ffd166"},
     "origen": os.environ.get("ORIGEN", "osito")}
t = pathlib.Path("/trabajo/negocio/asistente.json.tmp")
t.write_text(json.dumps(a, ensure_ascii=False, indent=2), encoding="utf-8")
t.replace("/trabajo/negocio/asistente.json")
print("PUENTE_OK")
PY`

// puenteOsito arma negocio/asistente.json desde /trabajo/osito si hace falta (ver scriptPuenteOsito).
func (s *Server) puenteOsito(ctx context.Context, nombre string) {
	if out, err := s.Aula.Exec(ctx, nombre, scriptPuenteOsito); err != nil {
		slog.Warn("puente osito", "aula", nombre, "err", err, "salida", strings.TrimSpace(out))
	}
}

// robotDe: carpeta del backend del Robo de la sesión 2 en el aula: /trabajo/mi-robo (skill s2-robo-estilos) o,
// si no existe, /trabajo/osito (el asistente que arranca «aula iniciar»).
func (s *Server) robotDe(ctx context.Context, nombre string) string {
	out, _ := s.Aula.Exec(ctx, nombre, `test -d /trabajo/mi-robo && echo mi-robo || echo osito`)
	if strings.TrimSpace(out) == "mi-robo" {
		return "/trabajo/mi-robo"
	}
	return "/trabajo/osito"
}

// scriptSubirRobo escribe el asistente.json que llega por stdin y arma con él /trabajo/mi-robo (skill
// s2-robo-estilos, estilo neon); si arma, deja ese backend en el 8766 en lugar del osito base.
const scriptSubirRobo = `mkdir -p /trabajo/negocio && cat > /trabajo/negocio/asistente.json.tmp &&
mv /trabajo/negocio/asistente.json.tmp /trabajo/negocio/asistente.json && echo ESCRITO
cd /trabajo/negocio && python3 /opt/skills-curso/s2-robo-estilos/motor/construir.py --asistente asistente.json --estilo neon >/tmp/construir-robo.log 2>&1 &&
{ aula parar >/dev/null 2>&1; sh /trabajo/mi-robo/robo.sh reiniciar >/dev/null 2>&1; echo ARMADO; }
true`

// liveMiRoboSubir: POST /api/v1/live/{lesson}/mi-robo {"asistente": {...}}. En la sesión 2 la escena «Diseña tu
// Robo» dejó el asistente.json en el navegador (localStorage g5-02-asistente) y casi nadie lo pasó al aula. Las
// escenas de la sesión 3 lo mandan aquí: se escribe en negocio/asistente.json solo si no hay uno o si el que hay
// lo armó el LMS desde osito (nunca pisa uno del alumno), se arma mi-robo y se responde como el GET.
func (s *Server) liveMiRoboSubir(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil || !s.aulaListo(w) {
		return
	}
	var in struct {
		Asistente map[string]any `json:"asistente"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Asistente == nil {
		writeErr(w, 400, "asistente_invalido", "no llegó un asistente.json válido")
		return
	}
	n, _ := in.Asistente["nombre"].(string)
	if strings.TrimSpace(n) == "" || len([]rune(n)) > 60 {
		writeErr(w, 400, "asistente_invalido", "a tu asistente le falta el nombre")
		return
	}
	if f, ok := in.Asistente["preguntas_frecuentes"]; ok {
		if _, lista := f.([]any); !lista {
			writeErr(w, 400, "asistente_invalido", "preguntas_frecuentes debe ser una lista")
			return
		}
	}
	if _, err := s.Aula.Crear(r.Context(), p.ID); err != nil {
		internal(w, err)
		return
	}
	tocarAula(p.ID)
	nombre := aula.Nombre(p.ID)
	if raw, err := s.Aula.Leer(r.Context(), nombre, "negocio/asistente.json", 256<<10); err == nil {
		var o struct {
			Origen string `json:"origen"`
		}
		if json.Unmarshal(raw, &o) != nil || !strings.HasPrefix(o.Origen, "osito") {
			writeErr(w, 409, "ya_tienes_asistente", "ya tienes tu asistente.json en el aula: no lo piso")
			return
		}
	} else if !errors.Is(err, aula.ErrNoExiste) {
		internal(w, err)
		return
	}
	in.Asistente["origen"] = "sesion-2"
	datos, _ := json.MarshalIndent(in.Asistente, "", "  ")
	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()
	out, err := s.Aula.ExecStdin(ctx, nombre, scriptSubirRobo, datos)
	if err != nil || !strings.Contains(out, "ESCRITO") {
		slog.Warn("subir robo", "aula", nombre, "err", err, "salida", strings.TrimSpace(out))
		writeErr(w, 502, "no_se_guardo", "no se pudo guardar tu Robo en el aula; intenta otra vez")
		return
	}
	if !strings.Contains(out, "ARMADO") {
		slog.Info("subir robo: asistente.json guardado sin armar mi-robo", "aula", nombre)
	}
	s.liveMiRobo(w, r, p)
}

// liveMiRobo: GET /api/v1/live/{lesson}/mi-robo. Lo que el alumno configuró en la sesión 2.
func (s *Server) liveMiRobo(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil || !s.aulaListo(w) {
		return
	}
	if _, err := s.Aula.Crear(r.Context(), p.ID); err != nil {
		internal(w, err)
		return
	}
	tocarAula(p.ID)
	nombre := aula.Nombre(p.ID)
	s.puenteOsito(r.Context(), nombre)
	res := map[string]any{"existe": false}
	raw, err := s.Aula.Leer(r.Context(), nombre, "negocio/asistente.json", 256<<10)
	if err == nil {
		var a struct {
			Nombre  string `json:"nombre"`
			Negocio struct {
				Nombre string `json:"nombre"`
				Rubro  string `json:"rubro"`
			} `json:"negocio"`
			Personalidad string `json:"personalidad"`
			Saludo       string `json:"saludo"`
			FAQ          []struct {
				Preguntas []string `json:"preguntas"`
			} `json:"preguntas_frecuentes"`
			Marca  map[string]string `json:"marca"`
			Origen string            `json:"origen"`
		}
		if json.Unmarshal(raw, &a) == nil {
			preg := []string{}
			for _, f := range a.FAQ {
				if len(f.Preguntas) > 0 && len(preg) < 8 {
					preg = append(preg, f.Preguntas[0])
				}
			}
			res["existe"] = true
			res["asistente"] = map[string]any{"nombre": a.Nombre, "negocio": a.Negocio, "personalidad": a.Personalidad,
				"saludo": a.Saludo, "preguntas": preg, "total_preguntas": len(a.FAQ), "marca": a.Marca, "origen": a.Origen}
		} else {
			res["error"] = "tu asistente.json no es JSON válido: el agente puede arreglarlo si se lo pides"
		}
	} else if !errors.Is(err, aula.ErrNoExiste) {
		internal(w, err)
		return
	}
	out, _ := s.Aula.Exec(r.Context(), nombre, `test -f /trabajo/robo3d/index.html && echo R; { test -d /trabajo/mi-robo || test -f /trabajo/osito/backend/app.py; } && echo M; true`)
	res["robo3d"] = strings.Contains(out, "R")
	res["mi_robo"] = strings.Contains(out, "M")
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, res)
}
