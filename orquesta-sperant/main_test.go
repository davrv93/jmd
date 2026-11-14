package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const tokenPrueba = "token-de-prueba-0123456789abcdef"

// llmFalso devuelve una respuesta fija y cuenta las llamadas.
type llmFalso struct {
	respuesta string
	costo     float64
	saldo     float64
	err       error
	llamadas  atomic.Int32
}

func (l *llmFalso) Nombre() string          { return "openrouter" }
func (l *llmFalso) Modelo() string          { return "falso/haiku" }
func (l *llmFalso) Saldo() (float64, error) { return l.saldo, nil }
func (l *llmFalso) Completar(_, _ string) (string, int, int, float64, bool, error) {
	l.llamadas.Add(1)
	return l.respuesta, 900, 60, l.costo, false, l.err
}

func nuevoServidor(t *testing.T, llm LLM) (*Servidor, http.Handler) {
	t.Helper()
	ahora := time.Date(2026, 10, 27, 15, 0, 0, 0, lima)
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba", tokenMCP: tokenPrueba, basePub: "http://x",
		llm: llm, tope: 0.30, saldoMin: 0.60, ahora: func() time.Time { return ahora }, porIP: map[string][]time.Time{}}
	s.sembrar()
	return s, s.rutas()
}

func pedir(t *testing.T, h http.Handler, metodo, ruta string, cuerpo any, admin bool) (int, map[string]any) {
	t.Helper()
	var b []byte
	if cuerpo != nil {
		b, _ = json.Marshal(cuerpo)
	}
	r := httptest.NewRequest(metodo, ruta, bytes.NewReader(b))
	if admin {
		r.Header.Set("X-Clave", "clave-de-prueba")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestReglasClasificanCasosClaros(t *testing.T) {
	casos := []struct{ asunto, desc, cat, area string }{
		{"Factura rechazada por SUNAT", "La factura electrónica salió rechazada con código 2800.", "contabilidad", "facturacion"},
		{"Cronograma con cuota duplicada", "La cuota 4 aparece dos veces en el cronograma de pagos.", "pagos", "cobranzas"},
		{"No puedo iniciar sesión", "Mi usuario dice contraseña vencida y no tengo permiso.", "usuarios", "accesos"},
		{"Portal del cliente no abre", "El portal de propietarios no carga.", "portal", "accesos"},
		{"Error al importar plantilla", "La importación de la plantilla de prospectos falla en la fila 10.", "importacion", "datos"},
		{"Importación de pagos del banco", "Subimos el archivo de pagos y la importación duplicó cada pago y cuota.", "importacion", "cobranzas"},
	}
	for _, c := range casos {
		got := clasificarReglas(c.asunto, c.desc)
		if got.Categoria != c.cat || got.Area != c.area {
			t.Errorf("%q → %s/%s, se esperaba %s/%s", c.asunto, got.Categoria, got.Area, c.cat, c.area)
		}
		if got.Justificacion == "" || got.Confianza <= 0 || got.Confianza > 1 {
			t.Errorf("%q: justificación o confianza no válidas: %+v", c.asunto, got)
		}
	}
	vacio := clasificarReglas("Ayuda", "Tengo un problema, llámenme")
	if vacio.Categoria != "sin_clasificar" || vacio.Confianza >= 0.7 {
		t.Errorf("un ticket sin señales debe quedar dudoso: %+v", vacio)
	}
}

func TestUmbralMandaARevisionSinDerivar(t *testing.T) {
	s, h := nuevoServidor(t, nil)
	code, out := pedir(t, h, "POST", "/api/tickets", map[string]any{"asunto": "Consulta general", "descripcion": "Hola, tengo un problema, ¿me pueden llamar?"}, false)
	if code != 201 {
		t.Fatalf("crear: %d %v", code, out)
	}
	res := out["resultado"].(map[string]any)
	if res["decision"] != "en_revision" {
		t.Fatalf("se esperaba revisión, llegó %v", res["decision"])
	}
	id := int(out["ticket"].(float64))
	tk := s.ticket(id)
	if tk.Responsable != "" || tk.Estado != "en_revision" {
		t.Fatalf("un ticket dudoso no debe asignarse: %+v", tk)
	}
	var aviso bool
	for _, c := range s.e.Correos {
		if c.Ticket == id {
			if c.Plantilla != "revision_coordinacion" {
				t.Fatalf("correo inesperado: %s", c.Plantilla)
			}
			aviso = true
		}
	}
	if !aviso {
		t.Fatal("falta el aviso a coordinación")
	}
	// Con umbral alto, hasta un ticket claro va a revisión.
	s.e.Config.Umbral = 0.99
	_, out = pedir(t, h, "POST", "/api/tickets", map[string]any{"asunto": "Factura rechazada por SUNAT", "descripcion": "La factura salió rechazada por SUNAT."}, false)
	if out["resultado"].(map[string]any)["decision"] != "en_revision" {
		t.Fatal("con umbral 0.99 debió ir a revisión")
	}
	// Ticket claro con umbral normal → derivado, asignado y dos correos.
	s.e.Config.Umbral = 0.7
	_, out = pedir(t, h, "POST", "/api/tickets", map[string]any{"asunto": "Factura rechazada por SUNAT", "descripcion": "La factura electrónica salió rechazada por SUNAT con código 2800."}, false)
	res = out["resultado"].(map[string]any)
	if res["decision"] != "derivado" || res["correos"].(float64) != 2 {
		t.Fatalf("se esperaba derivado con 2 correos: %v", res)
	}
	tk = s.ticket(int(out["ticket"].(float64)))
	if p, _ := persona(tk.Responsable); p.Area != "facturacion" {
		t.Fatalf("responsable de otra área: %+v", p)
	}
}

func TestDerivacionPorCarga(t *testing.T) {
	s, _ := nuevoServidor(t, nil)
	for _, tk := range s.e.Tickets { // vacía la carga
		tk.Estado, tk.Responsable = "resuelto", ""
	}
	s.e.Tickets[0].Responsable, s.e.Tickets[0].Estado = "rhuaman", "asignado"
	p, carga, ok := s.responsable("cobranzas")
	if !ok || p.ID != "dsalazar" || carga != 0 {
		t.Fatalf("debió elegir a quien tiene menos carga: %s (%d)", p.ID, carga)
	}
}

func TestListaBlancaRechazaYAudita(t *testing.T) {
	s, h := nuevoServidor(t, nil)
	n := len(s.e.Auditoria)
	err := s.ejecutar(Accion{Tipo: "cerrar_ticket", Ticket: 1001}, "prueba")
	if !errors.Is(err, errNoPermitida) {
		t.Fatalf("se esperaba rechazo, llegó %v", err)
	}
	if len(s.e.Auditoria) != n+1 || s.e.Auditoria[n].Tipo != "accion_rechazada" || s.e.Auditoria[n].Resultado != "rechazado" {
		t.Fatalf("el rechazo debe quedar auditado: %+v", s.e.Auditoria[n:])
	}
	if s.ticket(1001).Estado == "cerrado" {
		t.Fatal("la acción no permitida no debe tener efecto")
	}
	// Plantilla no aprobada también se rechaza.
	if err := s.ejecutar(Accion{Tipo: "enviar_correo", Ticket: 1001, Plantilla: "libre"}, "prueba"); err == nil {
		t.Fatal("una plantilla no aprobada debe rechazarse")
	}
	// Desde la API admin.
	code, out := pedir(t, h, "POST", "/api/admin/probar-lista-blanca", map[string]any{"accion": "borrar_cliente"}, true)
	if code != 200 || out["rechazada"] != true {
		t.Fatalf("admin: %d %v", code, out)
	}
	if code, _ := pedir(t, h, "POST", "/api/admin/probar-lista-blanca", nil, false); code != 401 {
		t.Fatal("sin clave debe dar 401")
	}
}

func TestClaudeRespetaElTopeYNoFingeRespaldo(t *testing.T) {
	llm := &llmFalso{respuesta: `{"categoria":"pagos","prioridad":"alta","area":"cobranzas","confianza":0.92,"justificacion":"Cuota duplicada en el cronograma."}`, costo: 0.01}
	s, _ := nuevoServidor(t, llm)
	c, tr := s.clasificar("x", "y", "claude")
	if tr.Motor != "claude" || c.Categoria != "pagos" || s.e.Gasto != 0.01 {
		t.Fatalf("debió correr Claude: %+v %+v gasto %v", c, tr, s.e.Gasto)
	}
	s.e.Gasto = 0.299 // a punto del tope
	antes := llm.llamadas.Load()
	_, tr = s.clasificar("Factura rechazada", "SUNAT rechazó la factura", "claude")
	if llm.llamadas.Load() != antes {
		t.Fatal("pasado el tope no debe llamar a Claude")
	}
	if !strings.HasPrefix(tr.Motor, "reglas (respaldo: ") || !strings.Contains(tr.Motor, "tope") {
		t.Fatalf("el respaldo debe decirlo: %q", tr.Motor)
	}
	// Respuesta inválida → respaldo declarado, nunca «claude».
	s.e.Gasto = 0
	llm.respuesta = `{"categoria":"inventada","prioridad":"alta","area":"x","confianza":2}`
	_, tr = s.clasificar("Factura rechazada", "SUNAT", "claude")
	if !strings.HasPrefix(tr.Motor, "reglas (respaldo: Claude falló") {
		t.Fatalf("respuesta inválida debe caer a reglas declarado: %q", tr.Motor)
	}
	// La fila de auditoría del ticket lleva el motor real.
	s.e.Config.Motor = "claude"
	s.e.Gasto = 0.30
	r, err := s.procesar(1049)
	if err != nil || !strings.HasPrefix(r.Motor, "reglas (respaldo") {
		t.Fatalf("procesar con tope: %v %+v", err, r)
	}
	ult := s.e.Auditoria
	var vista bool
	for _, a := range ult {
		if a.Ticket == 1049 && a.Tipo == "clasificacion" {
			vista = strings.HasPrefix(a.Motor, "reglas (respaldo")
		}
	}
	if !vista {
		t.Fatal("la auditoría debe mostrar el respaldo")
	}
}

func TestSaldoBajoNoHabilitaClaude(t *testing.T) {
	llm := &llmFalso{saldo: 0.45}
	_, h := nuevoServidor(t, llm)
	cfg := map[string]any{"motor": "claude", "umbral": 0.7, "programado": false, "intervaloMin": 5, "lote": 5}
	code, out := pedir(t, h, "POST", "/api/admin/config", cfg, true)
	if code != 409 || !strings.Contains(out["error"].(string), "mínimo") {
		t.Fatalf("con saldo 0.45 debe negarse: %d %v", code, out)
	}
	llm.saldo = 1.20
	if code, out := pedir(t, h, "POST", "/api/admin/config", cfg, true); code != 200 || out["motor"] != "claude" {
		t.Fatalf("con saldo suficiente debe habilitarse: %d %v", code, out)
	}
	_, h2 := nuevoServidor(t, nil)
	if code, _ := pedir(t, h2, "POST", "/api/admin/config", cfg, true); code != 409 {
		t.Fatal("sin clave no se habilita Claude")
	}
}

func TestEvaluacionReglas(t *testing.T) {
	_, h := nuevoServidor(t, nil)
	code, out := pedir(t, h, "POST", "/api/evaluar", map[string]any{"motor": "reglas"}, false)
	if code != 200 || out["total"].(float64) != 60 {
		t.Fatalf("evaluar: %d %v", code, out["error"])
	}
	if out["aciertoCategoria"].(float64) < 0.5 {
		t.Fatalf("acierto sospechosamente bajo: %v", out["aciertoCategoria"])
	}
	if code, _ := pedir(t, h, "POST", "/api/evaluar", map[string]any{"motor": "claude"}, false); code != 401 {
		t.Fatal("evaluar con Claude sin clave admin debe dar 401")
	}
}

func rpc(t *testing.T, h http.Handler, cuerpo string) (int, map[string]any) {
	t.Helper()
	r := httptest.NewRequest("POST", "/mcp/"+tokenPrueba, strings.NewReader(cuerpo))
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Accept", "application/json, text/event-stream")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestMCPHandshakeYHerramientas(t *testing.T) {
	_, h := nuevoServidor(t, nil)
	code, out := rpc(t, h, `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"prueba","version":"1"}}}`)
	if code != 200 {
		t.Fatalf("initialize: %d", code)
	}
	res := out["result"].(map[string]any)
	if res["protocolVersion"] != "2025-06-18" || res["capabilities"].(map[string]any)["tools"] == nil {
		t.Fatalf("initialize: %v", res)
	}
	if code, _ := rpc(t, h, `{"jsonrpc":"2.0","method":"notifications/initialized"}`); code != 202 {
		t.Fatalf("notificación: %d", code)
	}
	_, out = rpc(t, h, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)
	tools := out["result"].(map[string]any)["tools"].([]any)
	nombres := map[string]bool{}
	for _, x := range tools {
		nombres[x.(map[string]any)["name"].(string)] = true
	}
	for _, n := range []string{"consultar_ticket", "tickets_derivados", "cola_revision", "clasificar_pendientes", "aplicar_clasificacion", "resumen_hoy", "metricas_evaluacion"} {
		if !nombres[n] {
			t.Errorf("falta la herramienta %s", n)
		}
	}
	_, out = rpc(t, h, `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"consultar_ticket","arguments":{"id":1042}}}`)
	txt := out["result"].(map[string]any)["content"].([]any)[0].(map[string]any)["text"].(string)
	for _, frag := range []string{"#1042", "CLASIFICACIÓN", "Por qué", "AUDITORÍA"} {
		if !strings.Contains(txt, frag) {
			t.Errorf("consultar_ticket no trae %q:\n%s", frag, txt)
		}
	}
	_, out = rpc(t, h, `{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"tickets_derivados","arguments":{"area":"facturación"}}}`)
	txt = out["result"].(map[string]any)["content"].([]any)[0].(map[string]any)["text"].(string)
	if !strings.Contains(txt, "Facturación y contabilidad") || !strings.Contains(txt, "#10") {
		t.Errorf("tickets_derivados facturación:\n%s", txt)
	}
	_, out = rpc(t, h, `{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"clasificar_pendientes","arguments":{"limite":3}}}`)
	txt = out["result"].(map[string]any)["content"].([]any)[0].(map[string]any)["text"].(string)
	if !strings.Contains(txt, "Procesé 3 tickets") {
		t.Errorf("clasificar_pendientes:\n%s", txt)
	}
	_, out = rpc(t, h, `{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"consultar_ticket","arguments":{"id":99}}}`)
	if out["result"].(map[string]any)["isError"] != true {
		t.Error("ticket inexistente debe dar isError")
	}
	_, out = rpc(t, h, `{"jsonrpc":"2.0","id":7,"method":"metodo/raro"}`)
	if out["error"].(map[string]any)["code"].(float64) != -32601 {
		t.Error("método desconocido debe dar -32601")
	}
	_, out = rpc(t, h, `{"jsonrpc":"2.0","id":8,"method":"ping"}`)
	if out["result"] == nil {
		t.Error("ping sin resultado")
	}
	// GET → 405; token malo → 404.
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/mcp/"+tokenPrueba, nil))
	if w.Code != 405 {
		t.Errorf("GET debe dar 405, dio %d", w.Code)
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("POST", "/mcp/otro-token", strings.NewReader(`{}`)))
	if w.Code != 404 {
		t.Errorf("token malo debe dar 404, dio %d", w.Code)
	}
}

func TestSemillaSinEtiquetaEnLaAPI(t *testing.T) {
	_, h := nuevoServidor(t, nil)
	r := httptest.NewRequest("GET", "/api/tickets/1042", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if strings.Contains(w.Body.String(), `"oro"`) {
		t.Fatal("la etiqueta oro no debe publicarse en el simulador")
	}
}

func TestVistaClaudeSoloLectura(t *testing.T) {
	_, h := nuevoServidor(t, nil)
	code, out := pedir(t, h, "GET", "/api/vista-claude?herramienta=consultar_ticket&id=1042", nil, false)
	if code != 200 || !strings.Contains(out["texto"].(string), "#1042") {
		t.Fatalf("vista consultar_ticket: %d %v", code, out)
	}
	if code, _ := pedir(t, h, "GET", "/api/vista-claude?herramienta=clasificar_pendientes", nil, false); code != 400 {
		t.Fatal("la vista no debe ejecutar herramientas que escriben")
	}
}

func textoMCP(t *testing.T, out map[string]any) (string, bool) {
	t.Helper()
	res, ok := out["result"].(map[string]any)
	if !ok {
		t.Fatalf("sin result: %v", out)
	}
	return res["content"].([]any)[0].(map[string]any)["text"].(string), res["isError"] == true
}

func llamarAplicar(t *testing.T, h http.Handler, args map[string]any) (string, bool) {
	t.Helper()
	b, _ := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": 9, "method": "tools/call",
		"params": map[string]any{"name": "aplicar_clasificacion", "arguments": args}})
	_, out := rpc(t, h, string(b))
	return textoMCP(t, out)
}

func primerNuevo(t *testing.T, s *Servidor) int {
	t.Helper()
	for _, tk := range s.e.Tickets {
		if tk.Estado == "nuevo" {
			return tk.ID
		}
	}
	t.Fatal("la semilla no dejó tickets nuevos")
	return 0
}

func TestAplicarClasificacionEnListaYConEnums(t *testing.T) {
	_, h := nuevoServidor(t, nil)
	_, out := rpc(t, h, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)
	for _, x := range out["result"].(map[string]any)["tools"].([]any) {
		tool := x.(map[string]any)
		if tool["name"] != "aplicar_clasificacion" {
			continue
		}
		sch := tool["inputSchema"].(map[string]any)
		props := sch["properties"].(map[string]any)
		cats := props["categoria"].(map[string]any)["enum"].([]any)
		areasEnum := props["area"].(map[string]any)["enum"].([]any)
		if len(cats) != len(categorias) || len(areasEnum) != len(areas) {
			t.Fatalf("los enums deben salir de la taxonomía: %v / %v", cats, areasEnum)
		}
		if len(sch["required"].([]any)) != 6 {
			t.Fatalf("los seis argumentos son obligatorios: %v", sch["required"])
		}
		if !strings.Contains(tool["description"].(string), "consultar_ticket") {
			t.Fatal("la descripción debe sugerir consultar_ticket primero")
		}
		return
	}
	t.Fatal("tools/list no incluye aplicar_clasificacion")
}

func TestAplicarClasificacionDeriva(t *testing.T) {
	llm := &llmFalso{}
	s, h := nuevoServidor(t, llm)
	id := primerNuevo(t, s)
	gasto, correos := s.e.Gasto, len(s.e.Correos)
	txt, esErr := llamarAplicar(t, h, map[string]any{"ticket": id, "categoria": "contabilidad", "prioridad": "alta", "area": "facturacion",
		"confianza": 0.91, "justificacion": "La factura salió rechazada por SUNAT."})
	if esErr || !strings.Contains(txt, "derivado a") {
		t.Fatalf("debió derivarse: %s", txt)
	}
	tk := s.ticket(id)
	if p, _ := persona(tk.Responsable); tk.Estado != "asignado" || p.Area != "facturacion" {
		t.Fatalf("ticket mal derivado: %+v", tk)
	}
	if tk.Motor != motorClaudeAI || tk.Categoria != "contabilidad" || tk.Confianza != 0.91 {
		t.Fatalf("la clasificación de Claude no quedó en el ticket: %+v", tk)
	}
	if len(s.e.Correos) != correos+2 || s.e.Gasto != gasto || llm.llamadas.Load() != 0 {
		t.Fatalf("correos %d→%d, gasto %v→%v, llamadas %d", correos, len(s.e.Correos), gasto, s.e.Gasto, llm.llamadas.Load())
	}
	var clasif, deriv bool
	for _, a := range s.e.Auditoria {
		if a.Ticket != id {
			continue
		}
		if a.Tipo == "clasificacion" {
			clasif = a.Motor == motorClaudeAI && a.TokEntrada == 0 && a.TokSalida == 0 && a.Costo == 0 && a.Resultado == "ok"
		}
		deriv = deriv || a.Tipo == "derivacion"
	}
	if !clasif || !deriv {
		t.Fatalf("la auditoría debe tener la clasificación de claude.ai a costo 0 y la derivación (%v, %v)", clasif, deriv)
	}
	// Un ticket ya derivado no se vuelve a clasificar.
	if txt, esErr := llamarAplicar(t, h, map[string]any{"ticket": id, "categoria": "pagos", "prioridad": "media", "area": "cobranzas",
		"confianza": 0.9, "justificacion": "x"}); !esErr || !strings.Contains(txt, "ya fue derivado") {
		t.Fatalf("un ticket derivado debe rechazarse: %s", txt)
	}
}

func TestAplicarClasificacionBajoUmbralYResuelveLaCola(t *testing.T) {
	s, h := nuevoServidor(t, nil)
	id := primerNuevo(t, s)
	txt, esErr := llamarAplicar(t, h, map[string]any{"ticket": id, "categoria": "pagos", "prioridad": "media", "area": "cobranzas",
		"confianza": 0.4, "justificacion": "Mezcla cronograma y contrato; no está claro."})
	if esErr || !strings.Contains(txt, "cola de revisión") {
		t.Fatalf("con confianza baja debe ir a revisión: %s", txt)
	}
	tk := s.ticket(id)
	if tk.Estado != "en_revision" || tk.Responsable != "" {
		t.Fatalf("no debe derivarse: %+v", tk)
	}
	aviso := false
	for _, c := range s.e.Correos {
		aviso = aviso || (c.Ticket == id && c.Plantilla == "revision_coordinacion")
	}
	if !aviso {
		t.Fatal("falta el aviso a coordinación")
	}
	// La misma herramienta resuelve el ticket desde la cola.
	txt, esErr = llamarAplicar(t, h, map[string]any{"ticket": float64(id), "categoria": "Pagos", "prioridad": "media", "area": "Cobranzas",
		"confianza": 0.88, "justificacion": "El problema principal es la cuota duplicada."})
	if esErr || !strings.Contains(txt, "de la cola de revisión") || !strings.Contains(txt, "derivado a") {
		t.Fatalf("debió resolverse desde la cola: %s", txt)
	}
	if tk := s.ticket(id); tk.Estado != "asignado" || tk.Area != "cobranzas" {
		t.Fatalf("no quedó derivado: %+v", tk)
	}
}

func TestAplicarClasificacionRechazaValoresFueraDeTaxonomia(t *testing.T) {
	s, h := nuevoServidor(t, nil)
	id := primerNuevo(t, s)
	n := len(s.e.Auditoria)
	casos := []struct {
		args  map[string]any
		pista string
	}{
		{map[string]any{"ticket": id, "categoria": "inventada", "prioridad": "alta", "area": "facturacion", "confianza": 0.9, "justificacion": "x"}, "proyectos, cotizaciones"},
		{map[string]any{"ticket": id, "categoria": "pagos", "prioridad": "urgente", "area": "cobranzas", "confianza": 0.9, "justificacion": "x"}, "alta, media o baja"},
		{map[string]any{"ticket": id, "categoria": "pagos", "prioridad": "alta", "area": "mesa", "confianza": 0.9, "justificacion": "x"}, "comercial, cobranzas"},
		{map[string]any{"ticket": id, "categoria": "pagos", "prioridad": "alta", "area": "cobranzas", "confianza": 85.0, "justificacion": "x"}, "entre 0 y 1"},
		{map[string]any{"ticket": id, "categoria": "pagos", "prioridad": "alta", "area": "cobranzas", "confianza": 0.9, "justificacion": " "}, "justificacion"},
		{map[string]any{"ticket": 99, "categoria": "pagos", "prioridad": "alta", "area": "cobranzas", "confianza": 0.9, "justificacion": "x"}, "no existe"},
	}
	for _, c := range casos {
		txt, esErr := llamarAplicar(t, h, c.args)
		if !esErr || !strings.Contains(txt, c.pista) {
			t.Errorf("%v: se esperaba error con «%s», llegó %q", c.args, c.pista, txt)
		}
	}
	if s.ticket(id).Estado != "nuevo" || len(s.e.Auditoria) != n {
		t.Fatal("un valor inválido no debe tocar el ticket ni la auditoría")
	}
	// La vista pública no ejecuta herramientas que escriben.
	if code, _ := pedir(t, h, "GET", "/api/vista-claude?herramienta=aplicar_clasificacion", nil, false); code != 400 {
		t.Fatal("la vista no debe ejecutar aplicar_clasificacion")
	}
}
