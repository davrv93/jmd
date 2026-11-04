package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// Botón «Abrir DeepSeek Harness» del LIVE: todo gráfico, sin terminal (alumnos que no la usan).
//
//	GET  /api/v1/dsh          estado: qué clave usaría (propia, de la clase o ninguna) y si la web corre. Sin secretos.
//	POST /api/v1/dsh/clave    {"clave":"sk-…"} guarda la clave PROPIA en el aula (stdin de «docker exec»; nunca en argv,
//	                          logs ni en la base del LMS). Enciende el aula si hace falta.
//	POST /api/v1/dsh/olvidar  {} borra la clave propia del aula (y para la web si corría con ella).
//	POST /api/v1/dsh/abrir    {} enciende el aula, elige la clave (propia > de la clase > ninguna: 409 «sin_clave»),
//	                          arranca «dsh web» (o lo reinicia si cambió la clave) y devuelve {url, modo}: la URL
//	                          lleva el token de arranque de dsh, que la pestaña nueva canjea al abrirse.
//
// Todos actúan SOLO sobre el aula de quien llama (no reciben sub). Con cookie, además de JSON (authed), el Origin
// debe ser el propio (dshOrigenValido). La página /deepseek/ del front los usa; el LIVE la abre en una pestaña nueva.

const (
	dshAbrirTope = 2 * time.Minute // «aula dsh abrir» espera hasta 60 s a que dsh web conteste, más el arranque
	dshClaveTope = 20 * time.Second
)

// reClaveDeepSeek: lo que «aula dsh clave» acepta (sin comillas, espacios ni texto de más).
var reClaveDeepSeek = regexp.MustCompile(`^[A-Za-z0-9._-]{8,256}$`)

// reTokenURL: para borrar el token de arranque de dsh de cualquier salida que se registre.
var reTokenURL = regexp.MustCompile(`token=[^&\s"']+`)

func sinTokens(s string) string { return reTokenURL.ReplaceAllString(s, "token=<oculto>") }

func (s *Server) dshBotonListo(w http.ResponseWriter, r *http.Request, p *Principal) bool {
	if !s.aulaListo(w) {
		return false
	}
	if r.Method != http.MethodGet && !s.dshOrigenValido(r, p) {
		writeErr(w, 403, "forbidden", "origen no permitido")
		return false
	}
	return true
}

// dshModoAula pregunta al aula (si corre) qué credencial usaría dsh y si la web está arrancada.
func (s *Server) dshModoAula(ctx context.Context, sub string) (cred string, web bool) {
	out, err := s.Aula.Exec(ctx, aula.Nombre(sub), "aula dsh modo")
	if err != nil {
		return "ninguna", false
	}
	campos := strings.Fields(lineaFinal(out))
	if len(campos) != 2 {
		return "ninguna", false
	}
	switch campos[0] {
	case "propia", "global", "ninguna":
		cred = campos[0]
	default:
		cred = "ninguna"
	}
	return cred, campos[1] == "arrancada"
}

func lineaFinal(out string) string {
	out = strings.TrimSpace(out)
	if i := strings.LastIndexByte(out, '\n'); i >= 0 {
		return strings.TrimSpace(out[i+1:])
	}
	return out
}

// dshEstado: GET /api/v1/dsh.
func (s *Server) dshEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.dshBotonListo(w, r, p) {
		return
	}
	estado := s.Aula.Estado(r.Context(), p.ID)
	grupo := s.IA.GrupoCon(p.Cohorts)
	propia, web := false, false
	if estado == "corriendo" {
		var cred string
		cred, web = s.dshModoAula(r.Context(), p.ID)
		propia = cred == "propia"
	}
	clave := "ninguna"
	switch {
	case propia:
		clave = "propia"
	case grupo != "":
		clave = "clase"
	}
	writeJSON(w, 200, map[string]any{
		"aula": estado, "clave": clave, "propia": propia, "clase": grupo != "", "web": web,
	})
}

// dshGuardarClave: POST /api/v1/dsh/clave {"clave":"…"}.
func (s *Server) dshGuardarClave(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.dshBotonListo(w, r, p) {
		return
	}
	var in struct {
		Clave string `json:"clave"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	clave := strings.Join(strings.Fields(in.Clave), "")
	clave = strings.TrimPrefix(clave, "DEEPSEEK_API_KEY=")
	in.Clave = ""
	if !reClaveDeepSeek.MatchString(clave) {
		writeErr(w, 400, "clave_invalida", "Esa clave no parece de DeepSeek: cópiala completa desde platform.deepseek.com (empieza por «sk-»), sin comillas ni espacios.")
		return
	}
	if _, err := s.Aula.Crear(r.Context(), p.ID); err != nil {
		slog.Warn("dsh: no se pudo encender el aula para guardar la clave", "aula", aula.Nombre(p.ID), "err", err)
		writeErr(w, 503, "aula_no_enciende", "No pude encender tu aula. Prueba otra vez en un momento; si sigue igual, avisa al instructor.")
		return
	}
	tocarAula(p.ID)
	out, err := s.Aula.ExecTope(r.Context(), aula.Nombre(p.ID), "aula dsh clave -", []byte(clave+"\n"), dshClaveTope)
	if err != nil {
		// El script nunca repite la clave; por si acaso, no se registra su salida tal cual.
		slog.Warn("dsh: no se pudo guardar la clave", "aula", aula.Nombre(p.ID), "salida", strings.ReplaceAll(out, clave, "<clave>"), "err", err)
		writeErr(w, 500, "clave_no_guardada", "No pude guardar la clave en tu aula. Prueba otra vez.")
		return
	}
	clave = ""
	writeJSON(w, 200, map[string]any{"clave": "propia", "propia": true})
}

// dshOlvidarClave: POST /api/v1/dsh/olvidar {}.
func (s *Server) dshOlvidarClave(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.dshBotonListo(w, r, p) {
		return
	}
	var in struct{}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	if s.Aula.Estado(r.Context(), p.ID) == "corriendo" {
		if out, err := s.Aula.Exec(r.Context(), aula.Nombre(p.ID), "aula dsh olvidar"); err != nil {
			slog.Warn("dsh: no se pudo borrar la clave", "aula", aula.Nombre(p.ID), "salida", out, "err", err)
			writeErr(w, 500, "clave_no_borrada", "No pude borrar la clave de tu aula. Prueba otra vez.")
			return
		}
	}
	// Con el aula apagada no hay nada que borrar: la clave vivía en la memoria del aula y se fue con ella.
	clave := "ninguna"
	if s.IA.GrupoCon(p.Cohorts) != "" {
		clave = "clase"
	}
	writeJSON(w, 200, map[string]any{"clave": clave, "propia": false})
}

// dshAbrir: POST /api/v1/dsh/abrir {}.
func (s *Server) dshAbrir(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.dshBotonListo(w, r, p) {
		return
	}
	var in struct{}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	if !s.dshLimite.allow(p.ID) {
		writeErr(w, 429, "demasiados_intentos", "Espera unos segundos antes de volver a abrirlo.")
		return
	}
	ctx := r.Context()
	nombre := aula.Nombre(p.ID)
	if _, err := s.Aula.Crear(ctx, p.ID); err != nil {
		slog.Warn("dsh: no se pudo encender el aula", "aula", nombre, "err", err)
		writeErr(w, 503, "aula_no_enciende", "No pude encender tu aula. Prueba otra vez en un momento; si sigue igual, avisa al instructor.")
		return
	}
	tocarAula(p.ID)
	s.montarSkills(ctx, p.ID)

	cred, _ := s.dshModoAula(ctx, p.ID)
	modo := "propia"
	if cred != "propia" {
		grupo := s.IA.GrupoCon(p.Cohorts)
		if grupo == "" {
			if cred == "global" {
				_, _ = s.Aula.Exec(ctx, nombre, "aula dsh rele borrar") // el grupo ya no tiene clave de la clase
			}
			writeErr(w, 409, "sin_clave", "Para usar DeepSeek Harness necesitas tu clave de DeepSeek.")
			return
		}
		s.IA.olvidarInicio(p.ID) // la hora de arranque recién leída: el aula pudo encenderse ahora mismo
		inicio := s.IA.inicioDe(ctx, s.Aula, p.ID)
		if inicio == "" {
			writeErr(w, 503, "aula_no_enciende", "Tu aula no terminó de encender. Prueba otra vez.")
			return
		}
		// Al aula entra el TOKEN del aula y la URL del relé; la clave de la clase se queda en el LMS.
		datos := s.IA.Token(p.ID, inicio) + "\n" + s.IA.BaseAula(s.PublicURL) + "\n"
		if out, err := s.Aula.ExecTope(ctx, nombre, "aula dsh rele -", []byte(datos), dshClaveTope); err != nil {
			slog.Warn("dsh: no se pudo preparar el relé", "aula", nombre, "salida", out, "err", err)
			writeErr(w, 500, "rele_no_preparado", "No pude preparar la clave de la clase en tu aula. Prueba otra vez.")
			return
		}
		modo = "clase"
	}

	// El selector de carpetas de dsh empieza en el home del alumno (un tmpfs vacío): sin este enlace nunca ve /trabajo.
	_, _ = s.Aula.Exec(ctx, nombre, `[ -e "$HOME/trabajo" ] || ln -s /trabajo "$HOME/trabajo"`)
	// dsh corre los comandos del agente en modo «workspace-write», que exige bubblewrap o Landlock: el aula no los
	// tiene (y en un contenedor sin privilegios no funcionarían), así que el agente no podía ejecutar nada. El aula
	// ya es el aislamiento (un contenedor por alumno, sin root): dsh arranca en «danger-full-access», sin pedir
	// aprobación. Si hay una web vieja corriendo sin ese modo, se para para que «abrir» la levante con él.
	_, _ = s.Aula.Exec(ctx, nombre, `p=$(cat /tmp/aula-dsh-web.pid 2>/dev/null); if [ -n "$p" ] && ! tr '\0' '\n' < /proc/$p/environ 2>/dev/null | grep -qx DSH_PERMISSION_MODE=danger-full-access; then aula dsh web parar >/dev/null 2>&1; fi; true`)
	out, err := s.Aula.ExecTope(ctx, nombre, "DSH_PERMISSION_MODE=danger-full-access aula dsh abrir", nil, dshAbrirTope)
	if err != nil {
		slog.Warn("dsh: «aula dsh abrir» falló", "aula", nombre, "salida", sinTokens(out), "err", err)
		if strings.Contains(out, "Aún no me diste tu clave") {
			writeErr(w, 409, "sin_clave", "Para usar DeepSeek Harness necesitas tu clave de DeepSeek.")
			return
		}
		if strings.Contains(out, "AULA_DSH_URL") {
			writeErr(w, 503, "dsh_sin_web", "Este servidor no tiene configurada la interfaz web de DeepSeek Harness (LMS_PUBLIC_URL). Avisa al instructor.")
			return
		}
		writeErr(w, 502, "dsh_no_arranca", "DeepSeek Harness no arrancó en tu aula. Prueba otra vez; si sigue igual, avisa al instructor.")
		return
	}
	enlace, ok := enlaceDsh(lineaFinal(out), p.ID)
	if !ok {
		slog.Warn("dsh: «aula dsh abrir» no devolvió un enlace válido", "aula", nombre, "salida", sinTokens(out))
		writeErr(w, 502, "dsh_no_arranca", "DeepSeek Harness no devolvió su enlace. Prueba otra vez.")
		return
	}
	slog.Info("dsh abierto por el botón", "aula", nombre, "modo", modo)
	writeJSON(w, 200, map[string]any{"url": enlace, "modo": modo})
}

// enlaceDsh valida la línea «URL <enlace>» de «aula dsh abrir» y la deja relativa (/dsh/<sub>/?token=…), para que
// la pestaña nueva se abra siempre en el mismo origen que el LMS.
func enlaceDsh(linea, sub string) (string, bool) {
	crudo, ok := strings.CutPrefix(linea, "URL ")
	if !ok {
		return "", false
	}
	u, err := url.Parse(strings.TrimSpace(crudo))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return "", false
	}
	prefijo := "/dsh/" + url.PathEscape(sub) + "/"
	if !strings.HasPrefix(u.EscapedPath(), prefijo) {
		return "", false
	}
	rel := u.EscapedPath()
	if u.RawQuery != "" {
		rel += "?" + u.RawQuery
	}
	return rel, true
}
