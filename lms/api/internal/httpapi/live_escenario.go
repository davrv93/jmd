package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// «Simula tu escenario con IA» (Hoja JMD del curso excel-ia-contabilidad): desde el reto, el alumno pide un caso NUEVO
// con el mismo formato de su hoja («una bodega con 3 trabajadores y ventas en dólares») y la IA devuelve los datos en
// JSON. La escena valida y repara la respuesta contra el esquema (hoja-motor.js) y recarga la hoja.
//
// POST /api/v1/live/{lesson}/escenario {"escena","pedido","empresa":{razon,rubro,regimen},"muestra":{…}}
//
//   - El formato NO viene del navegador: sale de escenario.json, junto a escena.html de la escena. Sin ese archivo,
//     404. Así el endpoint no sirve de chat libre: el sistema y las reglas son siempre los del caso.
//   - Usa la clave de DeepSeek de la clase del grupo del alumno (la del relé de ia_rele.go, con su tope diario de
//     peticiones y tokens) y un tope propio de escenarios por alumno y día. El instructor no tiene tope.
//   - La respuesta se recorta al esquema (tablas conocidas, filas hasta el máximo, textos cortos) antes de devolverla.
//   - Se registra lección, grupo, estado, ms y tokens; nunca el pedido, la respuesta ni la clave.

var (
	escenarioTopeDia      = 30  // escenarios por alumno y día (hora de Lima)
	escenarioMaxPedido    = 300 // caracteres del pedido
	escenarioMaxMuestra   = 8 << 10
	escenarioTimeout      = 90 * time.Second
	escenarioMaxTokens    = 4000
	escenarioModeloDefect = "deepseek-v4-flash"
)

type escColumna struct {
	Nombre   string   `json:"nombre"`
	Tipo     string   `json:"tipo"`
	Opciones []string `json:"opciones"`
	Calc     bool     `json:"calc"`
	Fija     bool     `json:"fija"`
	Derivar  string   `json:"derivar"`
	Nota     string   `json:"nota"`
	Min      *float64 `json:"min"`
}

type escTabla struct {
	Tabla      string       `json:"tabla"`
	Hoja       string       `json:"hoja"`
	Columnas   []escColumna `json:"columnas"`
	MinFilas   int          `json:"min_filas"`
	MaxFilas   int          `json:"max_filas"`
	MaxFilasIA int          `json:"max_filas_ia"`
	FilasFijas bool         `json:"filas_fijas"`
	Desde      int          `json:"desde"`
}

type esquemaEscenario struct {
	Tablas     []escTabla `json:"tablas"`
	Parametros []struct {
		Celda    string `json:"celda"`
		Etiqueta string `json:"etiqueta"`
		Tipo     string `json:"tipo"`
	} `json:"parametros"`
	Reglas []string `json:"reglas"`
	IA     *bool    `json:"ia"`
}

// datos: las columnas que escribe la IA (ni las que calcula el alumno, ni las fijas, ni las que se deducen).
func (t escTabla) datos() []escColumna {
	var out []escColumna
	for _, c := range t.Columnas {
		if !c.Calc && !c.Fija && c.Derivar == "" {
			out = append(out, c)
		}
	}
	return out
}

func describirColumnaEsc(c escColumna) string {
	tipo := map[string]string{"fecha": "fecha dd/mm/aaaa", "numero": "número", "entero": "número entero", "porcentaje": "porcentaje en decimal (0.18 = 18 %)", "texto": "texto"}[c.Tipo]
	if c.Tipo == "lista" {
		tipo = "una de: " + strings.Join(c.Opciones, " | ")
	}
	if tipo == "" {
		tipo = c.Tipo
	}
	if c.Min != nil && (c.Tipo == "numero" || c.Tipo == "entero" || c.Tipo == "porcentaje") {
		tipo += ", mínimo " + strconv.FormatFloat(*c.Min, 'f', -1, 64)
	}
	if c.Nota != "" {
		tipo += "; " + c.Nota
	}
	if c.Nombre == "" {
		return tipo
	}
	return c.Nombre + " (" + tipo + ")"
}

const sistemaEscenario = "Eres docente de contabilidad en Perú y preparas casos de práctica para Excel. Genera datos FICTICIOS y coherentes para un ejercicio, " +
	"en el MISMO formato de la hoja del alumno. Responde SOLO un objeto JSON válido: sin texto fuera del JSON, sin comentarios y sin fórmulas."

// armarPedidoEscenario: el mismo texto que arma reto.js (armarPedido) para pegarlo en DeepSeek Harness.
func armarPedidoEscenario(esq *esquemaEscenario, tema, leccion string, empresa map[string]string, pedido string, muestra json.RawMessage) string {
	var b strings.Builder
	w := func(s string) { b.WriteString(s); b.WriteByte('\n') }
	w("Sesión: " + tema + " (" + leccion + "). Empresa actual del alumno: " + empresa["razon"] + " · " + empresa["rubro"] + " · " + empresa["regimen"] + ".")
	w("Pedido del alumno: «" + pedido + "».")
	w("")
	w(`Formato de la respuesta: {"titulo": "frase corta con la empresa y el periodo", "nota": "una línea sobre los montos (moneda, supuestos)", "supuestos": ["hasta 4 supuestos: periodo, régimen, tipo de cambio…"], "parametros": {"Hoja!Celda": valor}, "tablas": {"NombreTabla": [[valores de la fila en el orden de las columnas]]}}`)
	if len(esq.Tablas) > 0 {
		w("Tablas (cada fila es una lista con las columnas en este orden; no incluyas las columnas que calcula el alumno):")
		for _, t := range esq.Tablas {
			cols := t.datos()
			if len(cols) == 0 {
				continue
			}
			partes := make([]string, len(cols))
			for i, c := range cols {
				partes[i] = describirColumnaEsc(c)
			}
			max := t.MaxFilas
			if t.MaxFilasIA > 0 && t.MaxFilasIA < max {
				max = t.MaxFilasIA
			}
			filas := "entre " + strconv.Itoa(maxInt(t.MinFilas, 1)) + " y " + strconv.Itoa(max) + " filas"
			if t.FilasFijas {
				filas = "exactamente " + strconv.Itoa(t.MinFilas) + " filas, en el mismo orden"
			}
			desde := ""
			if t.Desde > 0 {
				desde = "las primeras " + strconv.Itoa(t.Desde) + " filas no cambian, genera las siguientes; "
			}
			w("- " + t.Tabla + " (hoja " + t.Hoja + "; " + desde + filas + "): " + strings.Join(partes, " | "))
		}
	}
	if len(esq.Parametros) > 0 {
		w("Parámetros (celdas sueltas; cambia solo los que el pedido necesite):")
		for _, p := range esq.Parametros {
			w("- " + p.Celda + " «" + p.Etiqueta + "»: " + describirColumnaEsc(escColumna{Tipo: p.Tipo}))
		}
	}
	w("Reglas:")
	for _, r := range append(append([]string{}, esq.Reglas...), "Montos con punto decimal y sin separador de miles ni símbolo de moneda.",
		"Si el pedido usa otra moneda, escribe los montos en esa moneda y dilo en «nota».", "Nombres, RUC y DNI inventados (RUC de 11 dígitos que empiece con 99).") {
		w("- " + r)
	}
	if len(muestra) > 0 {
		w("")
		w("Ejemplo del formato con los datos actuales (primeras filas): " + string(muestra))
	}
	return strings.TrimRight(b.String(), "\n")
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// recortarEscenario deja solo lo que el esquema admite: así la escena nunca recibe tablas, filas o textos de más.
func recortarEscenario(esq *esquemaEscenario, in map[string]any) (map[string]any, bool) {
	out := map[string]any{}
	texto := func(v any, n int) string {
		s, _ := v.(string)
		if utf8.RuneCountInString(s) > n {
			s = string([]rune(s)[:n])
		}
		return s
	}
	out["titulo"] = texto(in["titulo"], 90)
	if v, ok := in["nota"]; ok {
		out["nota"] = texto(v, 140)
	}
	if sup, ok := in["supuestos"].([]any); ok {
		lista := []string{}
		for i, s := range sup {
			if i == 6 {
				break
			}
			lista = append(lista, texto(s, 160))
		}
		out["supuestos"] = lista
	}
	util := false
	if ps, ok := in["parametros"].(map[string]any); ok {
		validos := map[string]bool{}
		for _, p := range esq.Parametros {
			validos[p.Celda] = true
			if i := strings.LastIndex(p.Celda, "!"); i >= 0 {
				validos[p.Celda[i+1:]] = true
			}
		}
		limpio := map[string]any{}
		for k, v := range ps {
			if validos[k] {
				limpio[k] = v
				util = true
			}
		}
		out["parametros"] = limpio
	}
	if ts, ok := in["tablas"].(map[string]any); ok {
		limpio := map[string]any{}
		for _, t := range esq.Tablas {
			v, ok := ts[t.Tabla]
			if !ok {
				continue
			}
			filas, ok := v.([]any)
			if !ok {
				continue
			}
			max := t.MaxFilas
			if max <= 0 || max > 200 {
				max = 200
			}
			if len(filas) > max {
				filas = filas[:max]
			}
			limpio[t.Tabla] = filas
			util = util || len(filas) > 0
		}
		out["tablas"] = limpio
	}
	return out, util
}

// Tope propio de escenarios por alumno y día.
var escenariosHoy = struct {
	sync.Mutex
	dia string
	n   map[string]int
}{n: map[string]int{}}

func tomarEscenario(sub string) (restantes int, ok bool) {
	escenariosHoy.Lock()
	defer escenariosHoy.Unlock()
	if d := diaLima(time.Now()); d != escenariosHoy.dia {
		escenariosHoy.dia, escenariosHoy.n = d, map[string]int{}
	}
	if escenariosHoy.n[sub] >= escenarioTopeDia {
		return 0, false
	}
	escenariosHoy.n[sub]++
	return escenarioTopeDia - escenariosHoy.n[sub], true
}

func devolverEscenario(sub string) {
	escenariosHoy.Lock()
	defer escenariosHoy.Unlock()
	if escenariosHoy.n[sub] > 0 {
		escenariosHoy.n[sub]--
	}
}

// liveEscenario: POST /api/v1/live/{lesson}/escenario (autenticado).
func (s *Server) liveEscenario(w http.ResponseWriter, r *http.Request, p *Principal) {
	t0 := time.Now()
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena    string            `json:"escena"`
		Pedido    string            `json:"pedido"`
		Empresa   map[string]string `json:"empresa"`
		Muestra   json.RawMessage   `json:"muestra"`
		Capacidad map[string]int    `json:"capacidad"` // filas de cada tabla en el libro de la empresa del alumno
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, 400, "cuerpo_invalido", "no se pudo leer el pedido")
		return
	}
	esc := s.Content.Get().Escena(l.ID, strings.TrimSpace(in.Escena))
	if esc == nil {
		notFound(w, "la escena")
		return
	}
	raw, err := os.ReadFile(filepath.Join(filepath.Dir(esc.HTMLPath), "escenario.json"))
	if errors.Is(err, os.ErrNotExist) {
		writeErr(w, 404, "sin_escenario", "esta escena no tiene escenarios con IA")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	var esq esquemaEscenario
	if err := json.Unmarshal(raw, &esq); err != nil {
		internal(w, err)
		return
	}
	if esq.IA != nil && !*esq.IA {
		writeErr(w, 404, "sin_escenario", "esta escena no tiene escenarios con IA")
		return
	}
	// La tabla de cada empresa puede tener menos filas que el máximo del esquema: se pide (y se recorta) a su medida.
	for i, t := range esq.Tablas {
		if n, ok := in.Capacidad[t.Tabla]; ok && n >= 1 && n <= t.MaxFilas {
			esq.Tablas[i].MaxFilas = n
			if t.FilasFijas {
				esq.Tablas[i].MinFilas = n
			}
		}
	}
	pedido := strings.Join(strings.Fields(in.Pedido), " ")
	if n := utf8.RuneCountInString(pedido); n < 4 || n > escenarioMaxPedido {
		writeErr(w, 400, "pedido_invalido", "describe el escenario en 4 a "+strconv.Itoa(escenarioMaxPedido)+" caracteres")
		return
	}
	empresa := map[string]string{}
	for _, k := range []string{"razon", "rubro", "regimen"} {
		v := strings.Join(strings.Fields(in.Empresa[k]), " ")
		if utf8.RuneCountInString(v) > 120 {
			v = string([]rune(v)[:120])
		}
		empresa[k] = v
	}
	var muestra json.RawMessage
	if len(in.Muestra) > 0 && len(in.Muestra) <= escenarioMaxMuestra && json.Valid(in.Muestra) {
		var compacta bytes.Buffer
		if json.Compact(&compacta, in.Muestra) == nil {
			muestra = compacta.Bytes()
		}
	}

	c := s.IA
	if !c.Activo() {
		writeErr(w, 503, "sin_clave", "el LMS no tiene la clave de DeepSeek de la clase: usa «Pídeselo a DeepSeek Harness»")
		return
	}
	c.iniciar()
	grupo := c.GrupoCon(p.Cohorts)
	if grupo == "" && p.Staff() {
		if gs := c.grupos(); len(gs) > 0 {
			grupo = gs[0]
		}
	}
	if grupo == "" {
		writeErr(w, 503, "sin_clave_de_clase", "tu grupo no tiene la clave de la clase: usa «Pídeselo a DeepSeek Harness»")
		return
	}
	clave := c.claveDe(grupo)
	restantes := -1
	if !p.Staff() {
		us := c.uso
		us.mu.Lock()
		us.alDia(time.Now())
		k := us.contador(p.ID)
		lleno := k.Peticiones >= c.topePeticiones() || k.tokens() >= c.topeTokens()
		if lleno {
			k.Rechazadas++
		}
		us.mu.Unlock()
		if lleno {
			writeErr(w, 429, "tope_ia", "llegaste al tope de hoy de la clave de la clase")
			return
		}
		var ok bool
		if restantes, ok = tomarEscenario(p.ID); !ok {
			writeErr(w, 429, "tope_escenarios", "ya generaste "+strconv.Itoa(escenarioTopeDia)+" escenarios hoy")
			return
		}
	}

	modelo := strings.TrimSpace(os.Getenv("LMS_ESCENARIO_MODELO"))
	if modelo == "" {
		modelo = escenarioModeloDefect
	}
	cuerpo, _ := json.Marshal(map[string]any{
		"model":       modelo,
		"max_tokens":  escenarioMaxTokens,
		"temperature": 0.7,
		"system":      sistemaEscenario,
		"messages":    []map[string]any{{"role": "user", "content": armarPedidoEscenario(&esq, l.Title, l.ID, empresa, pedido, muestra)}},
	})
	estado, entrada, salida := 0, int64(0), int64(0)
	defer func() {
		slog.Info("escenario", "leccion", l.ID, "grupo", grupo, "estado", estado, "ms", time.Since(t0).Milliseconds(), "tokens_entrada", entrada, "tokens_salida", salida)
		if !p.Staff() {
			us := c.uso
			us.mu.Lock()
			k := us.contador(p.ID)
			k.Peticiones++
			k.Grupo = grupo
			k.Entrada += entrada
			k.Salida += salida
			k.Ultima = time.Now().UTC().Format(time.RFC3339)
			us.guardarSiToca(time.Now(), false)
			us.mu.Unlock()
		}
	}()
	fallar := func(cod int, codigo, msg string) {
		estado = cod
		if !p.Staff() {
			devolverEscenario(p.ID) // un fallo nuestro o de la IA no gasta el escenario del alumno
		}
		writeErr(w, cod, codigo, msg)
	}
	ctx, cancel := context.WithTimeout(r.Context(), escenarioTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.upstream()+"/v1/messages", bytes.NewReader(cuerpo))
	if err != nil {
		fallar(502, "upstream", "el LMS está mal configurado (LMS_IA_UPSTREAM)")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Anthropic-Version", "2023-06-01")
	req.Header.Set("X-Api-Key", clave)
	res, err := c.transport.RoundTrip(req)
	if err != nil {
		fallar(502, "ia_no_responde", "la IA de la clase no respondió; prueba otra vez o usa DeepSeek Harness")
		return
	}
	defer res.Body.Close()
	datos, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	var out struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		Usage *iaUsage `json:"usage"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.Unmarshal(datos, &out)
	if out.Usage != nil {
		entrada = out.Usage.InputTokens + out.Usage.CacheCreationInputTokens + out.Usage.CacheReadInputTokens/10
		salida = out.Usage.OutputTokens
	}
	switch {
	case res.StatusCode == 401 || res.StatusCode == 403:
		fallar(502, "clave_de_clase_invalida", "DeepSeek rechazó la clave de la clase; avisa al instructor")
		return
	case res.StatusCode == 402:
		fallar(502, "sin_saldo", "la clave de la clase no tiene saldo; avisa al instructor")
		return
	case res.StatusCode == 429:
		fallar(503, "ia_ocupada", "la IA de la clase está saturada; prueba en un momento")
		return
	case res.StatusCode != 200:
		fallar(502, "ia_error", "la IA de la clase respondió "+res.Status)
		return
	}
	texto := ""
	for _, b := range out.Content {
		if b.Type == "text" {
			texto += b.Text
		}
	}
	if i, j := strings.Index(texto, "{"), strings.LastIndex(texto, "}"); i >= 0 && j > i {
		texto = texto[i : j+1]
	}
	var obj map[string]any
	if json.Unmarshal([]byte(texto), &obj) != nil {
		fallar(502, "respuesta_rara", "la IA no devolvió un JSON válido; prueba otra vez")
		return
	}
	limpio, util := recortarEscenario(&esq, obj)
	if !util {
		fallar(502, "respuesta_vacia", "la IA no devolvió filas ni parámetros que sirvan para esta hoja; prueba con otro pedido")
		return
	}
	estado = 200
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"escenario": limpio, "motor": modelo, "restantes": restantes})
}
