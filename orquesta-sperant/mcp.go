package main

// Servidor MCP remoto (transporte Streamable HTTP, JSON-RPC 2.0, protocolo
// 2025-06-18) en /mcp/<token>. Responde siempre application/json (sin SSE);
// GET devuelve 405, que el estándar permite cuando no se ofrece flujo SSE.

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"
)

const protocoloMCP = "2025-06-18"

var protocolosConocidos = map[string]bool{"2025-06-18": true, "2025-03-26": true, "2024-11-05": true}

type rpcPeticion struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type rpcRespuesta struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type herramienta struct {
	Name        string         `json:"name"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"inputSchema"`
	Annotations map[string]any `json:"annotations,omitempty"`
}

func esquema(props map[string]any, req ...string) map[string]any {
	m := map[string]any{"type": "object", "properties": props, "additionalProperties": false}
	if len(req) > 0 {
		m["required"] = req
	}
	return m
}

var soloLectura = map[string]any{"readOnlyHint": true, "openWorldHint": false}

var herramientas = []herramienta{
	{"consultar_ticket", "Consultar un ticket", "Devuelve un ticket de la mesa de ayuda con su trazabilidad completa: cómo se clasificó (categoría, prioridad, área, confianza y motor), por qué, a quién se derivó, cuándo, qué correos se enviaron y cada fila de auditoría.",
		esquema(map[string]any{"id": map[string]any{"type": "integer", "description": "Número del ticket, p. ej. 1042"}}, "id"), soloLectura},
	{"tickets_derivados", "Tickets derivados", "Lista los tickets que el orquestador derivó, opcionalmente filtrados por área (comercial, cobranzas, facturacion, datos, accesos — también acepta el nombre, p. ej. «facturación») y por fecha desde (YYYY-MM-DD u «hoy»; por defecto hoy, hora de Lima).",
		esquema(map[string]any{
			"area":  map[string]any{"type": "string", "description": "Área: comercial, cobranzas, facturacion, datos o accesos"},
			"desde": map[string]any{"type": "string", "description": "Fecha desde (YYYY-MM-DD) u «hoy». Por defecto hoy."},
		}), soloLectura},
	{"cola_revision", "Cola de revisión humana", "Lista los tickets que el clasificador no derivó porque su confianza quedó bajo el umbral, con la propuesta y el motivo.",
		esquema(map[string]any{}), soloLectura},
	{"clasificar_pendientes", "Clasificar pendientes", "Ejecuta el orquestador sobre los tickets nuevos: clasifica, deriva (o manda a revisión), comenta en el simulador y envía correos a la bandeja simulada. Usa el motor configurado en la demo.",
		esquema(map[string]any{"limite": map[string]any{"type": "integer", "minimum": 1, "maximum": 20, "description": "Máximo de tickets a procesar (1–20, por defecto 5)"}}),
		map[string]any{"readOnlyHint": false, "destructiveHint": false, "idempotentHint": false, "openWorldHint": false}},
	{"aplicar_clasificacion", "Aplicar mi clasificación",
		"Aplica TU clasificación a un ticket nuevo o de la cola de revisión y lo pasa por el mismo camino del orquestador: " +
			"si la confianza queda bajo el umbral de la demo, el ticket va (o sigue) en la cola de revisión humana; si no, se deriva a la persona del área con menos carga, " +
			"se comenta en el simulador, se envía el correo a la bandeja simulada y todo queda en la auditoría con el motor «claude (claude.ai)». " +
			"Úsala cuando te pidan «revisa la cola», «resuelve los tickets dudosos» o «clasifica tú mismo el ticket 1061». " +
			"Antes llama a consultar_ticket (o a cola_revision) para leer el asunto y la descripción: no clasifiques un ticket sin haberlo leído. " +
			"Usa solo los valores de la taxonomía; si dudas entre dos categorías, baja la confianza para que decida una persona.",
		esquema(map[string]any{
			"ticket":        map[string]any{"type": "integer", "description": "Número del ticket, p. ej. 1061"},
			"categoria":     map[string]any{"type": "string", "enum": idsCategorias(), "description": "Categoría: " + describirCategorias()},
			"prioridad":     map[string]any{"type": "string", "enum": []string{"alta", "media", "baja"}, "description": "alta: operación detenida, cliente esperando o error de cobro/facturación; baja: consultas o mejoras sin urgencia; media: lo demás"},
			"area":          map[string]any{"type": "string", "enum": idsAreas(), "description": "Área que lo atiende: " + describirAreas() + ". Usa el área por defecto de la categoría, salvo una importación de pagos, que va a cobranzas."},
			"confianza":     map[string]any{"type": "number", "minimum": 0, "maximum": 1, "description": "Tu seguridad entre 0 y 1 (p. ej. 0.85). Bajo el umbral de la demo (70 % por defecto) el ticket va a revisión humana."},
			"justificacion": map[string]any{"type": "string", "description": "Una frase en español (máx. 30 palabras) con el porqué; la lee el responsable en su correo."},
		}, "ticket", "categoria", "prioridad", "area", "confianza", "justificacion"),
		map[string]any{"readOnlyHint": false, "destructiveHint": false, "idempotentHint": false, "openWorldHint": false}},
	{"resumen_hoy", "Resumen de hoy", "Resumen del día: tickets por estado, derivados hoy por área, cola de revisión, correos enviados, gasto de Claude y carga del equipo.",
		esquema(map[string]any{}), soloLectura},
	{"metricas_evaluacion", "Métricas de evaluación", "Resultados de la última evaluación contra los 60 tickets etiquetados: acierto por categoría y por área, confusiones más frecuentes, costo y tiempo por ticket, por cada motor evaluado.",
		esquema(map[string]any{}), soloLectura},
}

func (s *Servidor) mcp(w http.ResponseWriter, r *http.Request) {
	tok := r.PathValue("token")
	if subtle.ConstantTimeCompare([]byte(tok), []byte(s.tokenMCP)) != 1 {
		time.Sleep(300 * time.Millisecond)
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		http.Error(w, "Este servidor MCP no ofrece flujo SSE: usa POST.", http.StatusMethodNotAllowed)
		return
	}
	cuerpo, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		responder(w, 413, rpcRespuesta{JSONRPC: "2.0", ID: json.RawMessage("null"), Error: &rpcError{-32600, "Cuerpo demasiado grande"}})
		return
	}
	var p rpcPeticion
	if err := json.Unmarshal(cuerpo, &p); err != nil || p.JSONRPC != "2.0" || p.Method == "" {
		responder(w, 400, rpcRespuesta{JSONRPC: "2.0", ID: json.RawMessage("null"), Error: &rpcError{-32700, "JSON-RPC no válido (no se aceptan lotes)"}})
		return
	}
	// Notificación o respuesta del cliente: sin id → 202 sin cuerpo.
	if len(p.ID) == 0 || string(p.ID) == "null" {
		w.WriteHeader(http.StatusAccepted)
		return
	}
	res, rerr := s.rpc(p)
	out := rpcRespuesta{JSONRPC: "2.0", ID: p.ID}
	if rerr != nil {
		out.Error = rerr
	} else {
		out.Result = res
	}
	responder(w, 200, out)
}

func (s *Servidor) rpc(p rpcPeticion) (any, *rpcError) {
	switch p.Method {
	case "initialize":
		var in struct {
			ProtocolVersion string `json:"protocolVersion"`
		}
		_ = json.Unmarshal(p.Params, &in)
		v := protocoloMCP
		if protocolosConocidos[in.ProtocolVersion] {
			v = in.ProtocolVersion
		}
		return map[string]any{
			"protocolVersion": v,
			"capabilities":    map[string]any{"tools": map[string]any{"listChanged": false}},
			"serverInfo":      map[string]any{"name": "mesa-ayuda-demo", "title": "Mesa de ayuda (simulador estilo Sperant)", "version": "1.0.0"},
			"instructions": "Demo de orquestación: un simulador de mesa de ayuda estilo Sperant con datos ficticios (no es el sistema Sperant). " +
				"Usa consultar_ticket para la trazabilidad de un ticket, tickets_derivados para lo derivado por área y fecha, cola_revision para lo dudoso, " +
				"resumen_hoy para el día y metricas_evaluacion para el acierto medido. clasificar_pendientes ejecuta el orquestador con el motor del servidor; " +
				"aplicar_clasificacion aplica TU clasificación (después de leer el ticket con consultar_ticket) y sirve también para resolver la cola de revisión. Responde en español.",
		}, nil
	case "ping":
		return map[string]any{}, nil
	case "tools/list":
		return map[string]any{"tools": herramientas}, nil
	case "tools/call":
		var in struct {
			Name      string         `json:"name"`
			Arguments map[string]any `json:"arguments"`
		}
		if err := json.Unmarshal(p.Params, &in); err != nil {
			return nil, &rpcError{-32602, "Parámetros no válidos"}
		}
		texto, err := s.llamarHerramienta(in.Name, in.Arguments)
		if err == errHerramientaDesconocida {
			return nil, &rpcError{-32602, "Herramienta desconocida: " + in.Name}
		}
		if err != nil {
			return map[string]any{"content": []map[string]string{{"type": "text", "text": err.Error()}}, "isError": true}, nil
		}
		return map[string]any{"content": []map[string]string{{"type": "text", "text": texto}}, "isError": false}, nil
	}
	return nil, &rpcError{-32601, "Método no soportado: " + p.Method}
}

var errHerramientaDesconocida = fmt.Errorf("herramienta desconocida")

func idsCategorias() []string {
	var ids []string
	for _, c := range categorias {
		ids = append(ids, c.ID)
	}
	return ids
}

func idsAreas() []string {
	var ids []string
	for _, a := range areas {
		ids = append(ids, a.ID)
	}
	return ids
}

func describirCategorias() string {
	var p []string
	for _, c := range categorias {
		p = append(p, fmt.Sprintf("%s (%s → %s)", c.ID, c.Nombre, c.Area))
	}
	return strings.Join(p, "; ")
}

func describirAreas() string {
	var p []string
	for _, a := range areas {
		p = append(p, fmt.Sprintf("%s (%s)", a.ID, a.Nombre))
	}
	return strings.Join(p, ", ")
}

// enTaxonomia: acepta el id con o sin tildes ni mayúsculas («Facturación» →
// facturacion). "" si no está.
func enTaxonomia(v string, ids []string) string {
	n := normalizar(strings.TrimSpace(v))
	for _, id := range ids {
		if n == id {
			return id
		}
	}
	return ""
}

// clasificacionDeArgs valida los argumentos de aplicar_clasificacion contra la
// taxonomía. Los errores dicen qué valores sí valen.
func clasificacionDeArgs(a map[string]any) (int, Clasificacion, error) {
	id := argInt(a, "ticket", 0)
	if id == 0 {
		id = argInt(a, "id", 0)
	}
	if id <= 0 {
		return 0, Clasificacion{}, fmt.Errorf("falta «ticket»: el número del ticket, p. ej. 1061")
	}
	var probs []string
	cat := enTaxonomia(argStr(a, "categoria"), idsCategorias())
	if cat == "" {
		probs = append(probs, fmt.Sprintf("categoría «%s» fuera de la taxonomía; usa una de: %s", argStr(a, "categoria"), strings.Join(idsCategorias(), ", ")))
	}
	prio := enTaxonomia(argStr(a, "prioridad"), []string{"alta", "media", "baja"})
	if prio == "" {
		probs = append(probs, fmt.Sprintf("prioridad «%s» no válida; usa alta, media o baja", argStr(a, "prioridad")))
	}
	area := enTaxonomia(argStr(a, "area"), idsAreas())
	if area == "" {
		probs = append(probs, fmt.Sprintf("área «%s» fuera de la taxonomía; usa una de: %s", argStr(a, "area"), strings.Join(idsAreas(), ", ")))
	}
	conf, ok := a["confianza"].(float64)
	if !ok || math.IsNaN(conf) || conf < 0 || conf > 1 {
		probs = append(probs, fmt.Sprintf("confianza %v no válida; es un número entre 0 y 1 (p. ej. 0.85)", a["confianza"]))
	}
	just := limpio(argStr(a, "justificacion"), 400)
	if just == "" {
		probs = append(probs, "falta «justificacion»: una frase con el porqué, la lee el responsable")
	}
	if len(probs) > 0 {
		return 0, Clasificacion{}, fmt.Errorf("no apliqué nada en el ticket %d: %s", id, strings.Join(probs, "; "))
	}
	return id, Clasificacion{Categoria: cat, Prioridad: prio, Area: area, Confianza: conf, Justificacion: just}, nil
}

func (s *Servidor) mcpAplicar(a map[string]any) (string, error) {
	id, c, err := clasificacionDeArgs(a)
	if err != nil {
		return "", err
	}
	r, previo, err := s.aplicarExterna(id, c)
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	umbral := s.e.Config.Umbral
	s.mu.Unlock()
	var b strings.Builder
	origen := "nuevo"
	if previo == "en_revision" {
		origen = "de la cola de revisión"
	}
	fmt.Fprintf(&b, "Apliqué tu clasificación al ticket #%d (%s): %s · prioridad %s · %s · confianza %.0f %%.\n", id, origen,
		nombreCategoria(c.Categoria), c.Prioridad, nombreArea(c.Area), r.Clasificacion.Confianza*100)
	if r.Decision == "derivado" {
		fmt.Fprintf(&b, "Resultado: derivado a %s (la persona de %s con menos tickets abiertos). Se dejó un comentario interno y se enviaron %d correos a la bandeja simulada.\n",
			r.Responsable, nombreArea(c.Area), r.Correos)
	} else {
		fmt.Fprintf(&b, "Resultado: la confianza (%.0f %%) queda bajo el umbral (%.0f %%), así que NO se derivó: está en la cola de revisión humana y se avisó a %s por correo.\n",
			r.Clasificacion.Confianza*100, umbral*100, coordinacion.Nombre)
	}
	fmt.Fprintf(&b, "Auditoría: motor «%s», 0 tokens y US$0 para el servidor (lo cubre tu suscripción de Claude). Trazabilidad completa con consultar_ticket(%d).", motorClaudeAI, id)
	return b.String(), nil
}

func argInt(a map[string]any, k string, def int) int {
	if v, ok := a[k].(float64); ok {
		return int(v)
	}
	if v, ok := a[k].(string); ok {
		var n int
		if _, err := fmt.Sscan(strings.TrimPrefix(v, "#"), &n); err == nil {
			return n
		}
	}
	return def
}

func argStr(a map[string]any, k string) string {
	v, _ := a[k].(string)
	return strings.TrimSpace(v)
}

func hl(t *time.Time) string {
	if t == nil {
		return "—"
	}
	return t.In(lima).Format("02/01 15:04")
}

func areaDesdeTexto(x string) (string, bool) {
	n := normalizar(x)
	if n == "" {
		return "", true
	}
	for _, a := range areas {
		if n == a.ID || strings.Contains(normalizar(a.Nombre), n) || strings.Contains(n, a.ID) {
			return a.ID, true
		}
	}
	alias := map[string]string{"contabilidad": "facturacion", "factura": "facturacion", "cobranza": "cobranzas", "pagos": "cobranzas",
		"reportes": "datos", "portal": "accesos", "usuarios": "accesos", "ventas": "comercial"}
	for k, v := range alias {
		if strings.Contains(n, k) {
			return v, true
		}
	}
	return "", false
}

func (s *Servidor) llamarHerramienta(nombre string, a map[string]any) (string, error) {
	switch nombre {
	case "consultar_ticket":
		return s.mcpTicket(argInt(a, "id", 0))
	case "tickets_derivados":
		return s.mcpDerivados(argStr(a, "area"), argStr(a, "desde"))
	case "cola_revision":
		return s.mcpCola()
	case "clasificar_pendientes":
		lim := argInt(a, "limite", 5)
		if lim < 1 {
			lim = 1
		}
		if lim > 20 {
			lim = 20
		}
		rs := s.orquestarPendientes(lim)
		if len(rs) == 0 {
			return "No había tickets nuevos pendientes de clasificar.", nil
		}
		var b strings.Builder
		var costo float64
		fmt.Fprintf(&b, "Procesé %d tickets:\n", len(rs))
		for _, r := range rs {
			costo += r.Costo
			dest := "→ cola de revisión humana (confianza bajo el umbral)"
			if r.Decision == "derivado" {
				dest = "→ derivado a " + r.Responsable
			}
			fmt.Fprintf(&b, "- #%d: %s · %s · prioridad %s · confianza %.0f %% · motor %s %s\n", r.Ticket, nombreCategoria(r.Clasificacion.Categoria),
				nombreArea(r.Clasificacion.Area), r.Clasificacion.Prioridad, r.Clasificacion.Confianza*100, r.Motor, dest)
		}
		fmt.Fprintf(&b, "Costo de esta pasada: US$%.4f.", costo)
		return b.String(), nil
	case "aplicar_clasificacion":
		return s.mcpAplicar(a)
	case "resumen_hoy":
		return s.mcpResumen()
	case "metricas_evaluacion":
		return s.mcpMetricas()
	}
	return "", errHerramientaDesconocida
}

func (s *Servidor) mcpTicket(id int) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := s.ticket(id)
	if t == nil {
		return "", fmt.Errorf("no existe el ticket %d en el simulador (los tickets van del 1001 al %d)", id, s.e.SigTicket)
	}
	var b strings.Builder
	fmt.Fprintf(&b, "Ticket #%d — %s\n", t.ID, t.Asunto)
	fmt.Fprintf(&b, "Estado: %s · Solicitante: %s (%s) · Proyecto: %s · Creado: %s\n", t.Estado, t.Solicitante, t.Empresa, t.Proyecto, hl(&t.CreadoEn))
	fmt.Fprintf(&b, "Descripción: %s\n\n", t.Descripcion)
	if t.ClasificadoEn == nil {
		b.WriteString("Aún no pasó por el orquestador (estado nuevo).\n")
	} else {
		fmt.Fprintf(&b, "CLASIFICACIÓN (%s, motor: %s)\n- Categoría: %s\n- Prioridad: %s\n- Área: %s\n- Confianza: %.0f %% (umbral actual %.0f %%)\n- Por qué: %s\n\n",
			hl(t.ClasificadoEn), t.Motor, nombreCategoria(t.Categoria), t.Prioridad, nombreArea(t.Area), t.Confianza*100, s.e.Config.Umbral*100, t.Justificacion)
	}
	if p, ok := persona(t.Responsable); ok {
		fmt.Fprintf(&b, "DERIVACIÓN: a %s (%s, %s) el %s.\n", p.Nombre, p.Cargo, nombreArea(p.Area), hl(t.DerivadoEn))
	} else if t.Estado == "en_revision" {
		b.WriteString("DERIVACIÓN: no se derivó; está en la cola de revisión humana.\n")
	}
	n := 0
	for _, c := range s.e.Correos {
		if c.Ticket == id {
			if n == 0 {
				b.WriteString("\nCORREOS (bandeja simulada, no se envían de verdad)\n")
			}
			n++
			fmt.Fprintf(&b, "- %s · para %s <%s> · «%s» (plantilla %s)\n", hl(&c.En), c.Nombre, c.Para, c.Asunto, c.Plantilla)
		}
	}
	b.WriteString("\nAUDITORÍA\n")
	for _, a := range s.e.Auditoria {
		if a.Ticket != id {
			continue
		}
		extra := ""
		if a.TokEntrada+a.TokSalida > 0 {
			extra = fmt.Sprintf(" · %s · %d+%d tokens · US$%.5f", a.Modelo, a.TokEntrada, a.TokSalida, a.Costo)
		}
		fmt.Fprintf(&b, "- %s [%s] %s · %s%s · %d ms\n", hl(&a.En), a.Tipo, a.Motor, recortar(a.Salida, 220), extra, a.DuracionMs)
	}
	if len(t.Comentarios) > 0 {
		b.WriteString("\nCOMENTARIOS EN EL SIMULADOR\n")
		for _, c := range t.Comentarios {
			fmt.Fprintf(&b, "- %s · %s: %s\n", hl(&c.En), c.Autor, c.Texto)
		}
	}
	fmt.Fprintf(&b, "\nVer en el simulador: %s/tickets#%d", s.basePub, t.ID)
	return b.String(), nil
}

func (s *Servidor) mcpDerivados(area, desde string) (string, error) {
	aid, ok := areaDesdeTexto(area)
	if !ok {
		return "", fmt.Errorf("no reconozco el área «%s»; usa comercial, cobranzas, facturacion, datos o accesos", area)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	ini := inicioDia(s.ahora())
	etiqueta := "hoy"
	if desde != "" && normalizar(desde) != "hoy" {
		d, err := time.ParseInLocation("2006-01-02", desde, lima)
		if err != nil {
			return "", fmt.Errorf("fecha «%s» no válida; usa YYYY-MM-DD u «hoy»", desde)
		}
		ini, etiqueta = d, "desde el "+d.Format("02/01/2006")
	}
	var ts []*Ticket
	for _, t := range s.e.Tickets {
		if t.DerivadoEn != nil && !t.DerivadoEn.Before(ini) && (aid == "" || t.Area == aid) {
			ts = append(ts, t)
		}
	}
	sort.Slice(ts, func(i, j int) bool { return ts[i].DerivadoEn.Before(*ts[j].DerivadoEn) })
	donde := "todas las áreas"
	if aid != "" {
		donde = nombreArea(aid)
	}
	if len(ts) == 0 {
		return fmt.Sprintf("No hay tickets derivados a %s %s.", donde, etiqueta), nil
	}
	var b strings.Builder
	fmt.Fprintf(&b, "%d tickets derivados a %s %s (hora de Lima):\n", len(ts), donde, etiqueta)
	for _, t := range ts {
		resp := t.Responsable
		if p, ok := persona(t.Responsable); ok {
			resp = p.Nombre
		}
		fmt.Fprintf(&b, "- #%d %s · %s · prioridad %s · a %s · %s · confianza %.0f %% · motor %s · estado %s\n",
			t.ID, t.Asunto, nombreCategoria(t.Categoria), t.Prioridad, resp, hl(t.DerivadoEn), t.Confianza*100, t.Motor, t.Estado)
	}
	return b.String(), nil
}

func (s *Servidor) mcpCola() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var b strings.Builder
	n := 0
	for _, t := range s.e.Tickets {
		if t.Estado != "en_revision" {
			continue
		}
		n++
		fmt.Fprintf(&b, "- #%d %s · propuesta: %s → %s · confianza %.0f %% · motor %s · motivo: %s\n", t.ID, t.Asunto,
			nombreCategoria(t.Categoria), nombreArea(t.Area), t.Confianza*100, t.Motor, t.Justificacion)
	}
	if n == 0 {
		return "La cola de revisión humana está vacía.", nil
	}
	return fmt.Sprintf("%d tickets en la cola de revisión humana (umbral de confianza %.0f %%). No se derivaron: esperan a una persona.\n", n, s.e.Config.Umbral*100) + b.String() +
		fmt.Sprintf("\nPuedes resolverlos con aplicar_clasificacion (después de leer cada uno con consultar_ticket) o a mano en %s/#tickets.", s.basePub), nil
}

func (s *Servidor) mcpResumen() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.resumen()
	est := r["estados"].(map[string]int)
	var b strings.Builder
	fmt.Fprintf(&b, "Resumen al %s (hora de Lima)\n", s.ahora().In(lima).Format("02/01/2006 15:04"))
	fmt.Fprintf(&b, "- Tickets: %d en total · nuevos (pendientes) %d · en revisión %d · asignados %d · en proceso %d · resueltos %d\n",
		r["total"], est["nuevo"], est["en_revision"], est["asignado"], est["en_proceso"], est["resuelto"])
	fmt.Fprintf(&b, "- Derivados hoy: %d\n", r["derivadosHoy"])
	hoy := inicioDia(s.ahora())
	porArea := map[string]int{}
	for _, t := range s.e.Tickets {
		if t.DerivadoEn != nil && !t.DerivadoEn.Before(hoy) {
			porArea[t.Area]++
		}
	}
	for _, a := range areas {
		fmt.Fprintf(&b, "    · %s: %d\n", a.Nombre, porArea[a.ID])
	}
	correosHoy := 0
	for _, c := range s.e.Correos {
		if !c.En.Before(hoy) {
			correosHoy++
		}
	}
	fmt.Fprintf(&b, "- Correos enviados hoy (bandeja simulada): %d\n", correosHoy)
	fmt.Fprintf(&b, "- Motor activo: %s · umbral %.0f %% · modo programado: %v\n", s.e.Config.Motor, s.e.Config.Umbral*100, s.e.Config.Programado)
	fmt.Fprintf(&b, "- Gasto de Claude en la demo: US$%.4f de un tope de US$%.2f (%d llamadas)\n", s.e.Gasto, s.tope, s.e.LlamadasLLM)
	b.WriteString("- Carga del equipo (tickets abiertos):\n")
	for _, p := range equipo {
		fmt.Fprintf(&b, "    · %s (%s): %d\n", p.Nombre, nombreArea(p.Area), s.carga(p.ID))
	}
	return b.String(), nil
}

func (s *Servidor) mcpMetricas() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.e.Evaluaciones) == 0 {
		return "Todavía no se corrió ninguna evaluación. Se lanza desde " + s.basePub + "/evaluacion.", nil
	}
	var motores []string
	for m := range s.e.Evaluaciones {
		motores = append(motores, m)
	}
	sort.Strings(motores)
	var b strings.Builder
	for _, m := range motores {
		ev := s.e.Evaluaciones[m]
		fmt.Fprintf(&b, "MOTOR %s (%s) — evaluado el %s sobre %d tickets etiquetados\n", m, ev.Modelo, hl(&ev.En), ev.Total)
		fmt.Fprintf(&b, "- Acierto en categoría: %.1f %% (meta del requerimiento ≥ 90 %%)\n", ev.AciertoCategoria*100)
		fmt.Fprintf(&b, "- Acierto en área: %.1f %% (meta ≥ 95 %%)\n", ev.AciertoArea*100)
		fmt.Fprintf(&b, "- Acierto en prioridad: %.1f %%\n", ev.AciertoPrioridad*100)
		fmt.Fprintf(&b, "- Con umbral %.0f %%: %d se derivarían solos (acierto de área entre ellos %.1f %%) y %d irían a revisión\n",
			ev.Umbral*100, ev.SobreUmbral, ev.AciertoAreaAuto*100, ev.Total-ev.SobreUmbral)
		fmt.Fprintf(&b, "- Costo: US$%.4f en total, US$%.5f por ticket · tiempo medio %.0f ms por ticket\n", ev.CostoTotal, ev.CostoPorTicket, ev.MsPorTicket)
		if ev.Respaldos > 0 {
			fmt.Fprintf(&b, "- ATENCIÓN: %d tickets usaron el respaldo de reglas (Claude no respondió bien)\n", ev.Respaldos)
		}
		b.WriteString("- Acierto por categoría: ")
		var partes []string
		for _, c := range categorias {
			if a := ev.PorCategoria[c.ID]; a != nil {
				partes = append(partes, fmt.Sprintf("%s %d/%d", c.Nombre, a.Aciertos, a.Total))
			}
		}
		b.WriteString(strings.Join(partes, " · ") + "\n")
		if len(ev.Confusiones) > 0 {
			b.WriteString("- Confusiones más frecuentes: ")
			partes = nil
			for i, c := range ev.Confusiones {
				if i == 5 {
					break
				}
				partes = append(partes, fmt.Sprintf("%s → %s ×%d (%v)", nombreCategoria(c.Esperado), nombreCategoria(c.Obtenido), c.N, c.Tickets))
			}
			b.WriteString(strings.Join(partes, "; ") + "\n")
		}
		b.WriteString("\n")
	}
	return b.String(), nil
}
