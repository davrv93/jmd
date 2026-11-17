package httpapi

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

const entenderTextoBoleta = "BOLETA DE VENTA ELECTRÓNICA\nBOTICA SAN JUAN S.A.C.\nRUC: 20000000001\nB001-00012345\n" +
	"Fecha de emisión:   14/03/2026\nCliente: ****\nOP. GRAVADA S/ 42.20\nIGV S/ 7.60\nIMPORTE TOTAL S/ 49.80\n"

const entenderBuena = `{"tipo_documento":"Boleta de venta electrónica","categoria":"venta","confianza":0.86,` +
	`"resumen":"Boleta de una botica por S/ 49.80.","campos":[{"nombre":"RUC del emisor","valor":"20000000001","evidencia":"RUC: 20000000001"}],"dudas":[]}`

// entenderFalso es un OpenRouter de mentira: cada modelo responde con lo que diga «responder».
type entenderFalso struct {
	mu        sync.Mutex
	modelos   []string
	malos     int // pedidos sin la clave, sin JSON pedido o sin el texto
	responder func(modelo string) (status int, contenido string)
}

func (f *entenderFalso) llamados() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.modelos...)
}

func entenderCompletion(contenido string) string {
	b, _ := json.Marshal(map[string]any{
		"id": "gen-1", "model": "x",
		"choices": []any{map[string]any{"message": map[string]any{"role": "assistant", "content": contenido}, "finish_reason": "stop"}},
		"usage":   map[string]int{"prompt_tokens": 1234, "completion_tokens": 321},
	})
	return string(b)
}

// entenderEnv: la lección l1 del fixture (grupo c1), clave de prueba y OpenRouter falso.
func entenderEnv(t *testing.T, responder func(modelo string) (int, string)) (*env, *entenderFalso) {
	t.Helper()
	e := newEnv(t)
	f := &entenderFalso{responder: responder}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Model          string            `json:"model"`
			Messages       []json.RawMessage `json:"messages"`
			ResponseFormat map[string]string `json:"response_format"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		f.mu.Lock()
		f.modelos = append(f.modelos, in.Model)
		if r.URL.Path != "/chat/completions" || r.Header.Get("Authorization") != "Bearer prueba" || in.ResponseFormat["type"] != "json_object" || len(in.Messages) == 0 {
			f.malos++
		}
		resp := f.responder
		f.mu.Unlock()
		status, contenido := resp(in.Model)
		switch status {
		case -1: // se cuelga hasta que el LMS se canse
			select {
			case <-r.Context().Done():
			case <-time.After(3 * time.Second):
			}
			return
		case 200:
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(entenderCompletion(contenido)))
		default:
			w.WriteHeader(status)
			_, _ = w.Write([]byte(`{"error":{"code":` + jsonNum(status) + `,"message":"falla de prueba"}}`))
		}
	}))
	base, cliente, plazo := entenderBaseURL, entenderCliente, entenderTimeout
	entenderBaseURL, entenderCliente, entenderTimeout = srv.URL, srv.Client(), 300*time.Millisecond
	t.Setenv("OPENROUTER_API_KEY", "prueba")
	t.Setenv("LMS_ENTENDER_GRATIS", "libre/uno:free, libre/dos:free")
	t.Setenv("LMS_ENTENDER_PAGO", "pago/barato")
	for _, k := range []string{"LMS_ENTENDER_TOPE", "LMS_ENTENDER_TOPE_PAGO", "LMS_ENTENDER_TOPE_PAGO_GLOBAL"} {
		t.Setenv(k, "")
	}
	entenderReiniciar()
	t.Cleanup(func() {
		srv.Close()
		entenderBaseURL, entenderCliente, entenderTimeout = base, cliente, plazo
		entenderReiniciar()
	})
	return e, f
}

func jsonNum(n int) string { b, _ := json.Marshal(n); return string(b) }

func entenderPost(e *env, p *Principal, cuerpo any) *httptest.ResponseRecorder {
	var raw []byte
	if s, ok := cuerpo.(string); ok {
		raw = []byte(s)
	} else {
		raw, _ = json.Marshal(cuerpo)
	}
	r := httptest.NewRequest("POST", "/api/v1/live/l1/entender", bytes.NewReader(raw))
	r.Header.Set("Content-Type", "application/json")
	r.SetPathValue("lesson", "l1")
	w := httptest.NewRecorder()
	e.s.liveEntender(w, r, p)
	return w
}

func entenderPedido() map[string]any {
	return map[string]any{
		"nombre": "boleta-marzo.pdf", "tipo": "pdf", "texto": entenderTextoBoleta,
		"campos_reglas": map[string]any{"ruc": []string{"20000000001"}, "montos": []string{"S/ 49.80"}},
		"categorias":    []string{"venta", "compra", "gasto", "bancario", "planilla", "otro"},
	}
}

type entenderOut struct {
	TipoDocumento string          `json:"tipo_documento"`
	Categoria     string          `json:"categoria"`
	Confianza     float64         `json:"confianza"`
	Resumen       string          `json:"resumen"`
	Campos        []entenderCampo `json:"campos"`
	Dudas         []string        `json:"dudas"`
	Motor         entenderMotor   `json:"motor"`
	Restantes     int             `json:"restantes"`
	RestantesPago int             `json:"restantes_pago"`
	Error         *string         `json:"error"`
}

func entenderLeer(t *testing.T, w *httptest.ResponseRecorder, codigo int) entenderOut {
	t.Helper()
	if w.Code != codigo {
		t.Fatalf("esperaba %d y llegó %d: %s", codigo, w.Code, w.Body.String())
	}
	var out entenderOut
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err, w.Body.String())
	}
	if codigo != 200 && (out.Error == nil || *out.Error == "") {
		t.Fatalf("el error debe ser {\"error\": \"<mensaje>\"}: %s", w.Body.String())
	}
	return out
}

var (
	entAna   = &Principal{ID: "ana", Name: "Ana", Cohorts: []string{"c1"}}
	entBeto  = &Principal{ID: "beto", Name: "Beto", Cohorts: []string{"c1"}}
	entProfe = &Principal{ID: "profe", Name: "Profe", Roles: []string{"instructor"}, Cohorts: []string{"c1"}}
)

func TestEntenderGratisPrimero(t *testing.T) {
	e, f := entenderEnv(t, func(string) (int, string) { return 200, entenderBuena })
	out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	if out.Motor.Modelo != "libre/uno:free" || !out.Motor.Gratis || out.Motor.Intentos != 1 ||
		out.Motor.TokensEntrada != 1234 || out.Motor.TokensSalida != 321 || out.Restantes != 19 || out.RestantesPago != 6 {
		t.Fatalf("motor o topes: %+v", out)
	}
	if out.TipoDocumento != "Boleta de venta electrónica" || out.Categoria != "venta" || out.Confianza != 0.86 || len(out.Campos) != 1 {
		t.Fatalf("respuesta: %+v", out)
	}
	if f.malos != 0 {
		t.Fatal("el pedido a OpenRouter no llevó clave, response_format o mensajes")
	}
}

func TestEntenderGratisFallaYUsaPago(t *testing.T) {
	e, f := entenderEnv(t, func(m string) (int, string) {
		switch m {
		case "libre/uno:free":
			return 429, "" // el gratuito está saturado
		case "libre/dos:free":
			return -1, "" // se cuelga: vence el plazo por modelo
		}
		return 200, entenderBuena
	})
	t0 := time.Now()
	out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	if out.Motor.Modelo != "pago/barato" || out.Motor.Gratis || out.Motor.Intentos != 3 || out.Restantes != 19 || out.RestantesPago != 5 {
		t.Fatalf("debía responder el de pago: %+v", out.Motor)
	}
	if got := strings.Join(f.llamados(), ","); got != "libre/uno:free,libre/dos:free,pago/barato" {
		t.Fatal("orden de la cadena:", got)
	}
	if time.Since(t0) > 3*time.Second {
		t.Fatal("no respetó el plazo por modelo")
	}
}

func TestEntenderJSONBasura(t *testing.T) {
	respuestas := map[string]string{
		"libre/uno:free": "Claro, aquí tienes el análisis: es una boleta.",
		"libre/dos:free": "<think>a ver…</think>\n```json\n" + entenderBuena + "\n```\nEspero que te sirva.",
	}
	var mu sync.Mutex
	e, f := entenderEnv(t, func(m string) (int, string) {
		mu.Lock()
		defer mu.Unlock()
		return 200, respuestas[m]
	})
	// el primero no trae JSON; el segundo lo trae envuelto: se rescata
	out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	if out.Motor.Modelo != "libre/dos:free" || out.Motor.Intentos != 2 || out.TipoDocumento == "" || len(out.Campos) != 1 {
		t.Fatalf("JSON envuelto: %+v", out)
	}

	// todos devuelven basura (el de pago responde 200, así que ese intento sí se cobra): 503 y la consulta se devuelve
	mu.Lock()
	respuestas = map[string]string{"libre/uno:free": "no sé", "libre/dos:free": `{"hola": 1}`, "pago/barato": `{"tipo_documento": "Bol`}
	mu.Unlock()
	entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 503)
	if n := len(f.llamados()); n != 5 {
		t.Fatal("debía probar los tres modelos; llamados:", n)
	}
	mu.Lock()
	respuestas = map[string]string{"libre/uno:free": entenderBuena}
	mu.Unlock()
	out = entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	if out.Restantes != 18 || out.RestantesPago != 5 {
		t.Fatalf("el 503 no debía gastar consulta pero sí el pago cobrado: restantes %d, pago %d", out.Restantes, out.RestantesPago)
	}
}

func TestEntenderEvidencia(t *testing.T) {
	contenido := `{"tipo_documento":"Boleta","categoria":"Venta","confianza":86,"resumen":"ok","campos":[
		{"nombre":"RUC del emisor","valor":"20000000001","evidencia":"RUC: 20000000001"},
		{"nombre":"Fecha de emisión","valor":"2026-03-14","evidencia":"Fecha de emisión: 14/03/2026"},
		{"nombre":"Total","valor":"59.80","evidencia":"TOTAL A PAGAR S/ 59.80"},
		{"nombre":"Cliente","valor":"Juan Pérez","evidencia":""},
		{"nombre":"Total","valor":49.8,"evidencia":"IMPORTE TOTAL S/ 49.80"}],
		"dudas":["no se ve el medio de pago"]}`
	var mu sync.Mutex
	e, _ := entenderEnv(t, func(string) (int, string) { mu.Lock(); defer mu.Unlock(); return 200, contenido })
	out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	if len(out.Campos) != 3 {
		t.Fatalf("debían quedar 3 campos: %+v", out.Campos)
	}
	for _, c := range out.Campos {
		if !strings.Contains(entenderTextoBoleta, c.Evidencia) || c.Evidencia == "" {
			t.Fatalf("evidencia que no está literal en el texto: %q", c.Evidencia)
		}
	}
	// la fecha venía con un solo espacio: se devuelve el fragmento tal cual está en el texto
	if out.Campos[1].Evidencia != "Fecha de emisión:   14/03/2026" || out.Campos[2].Valor != "49.8" {
		t.Fatalf("campos: %+v", out.Campos)
	}
	if out.Categoria != "venta" || out.Confianza != 0.86 {
		t.Fatalf("categoría o confianza: %q %v", out.Categoria, out.Confianza)
	}
	if len(out.Dudas) != 2 || !strings.Contains(out.Dudas[1], "Se descartaron 2 campo(s)") {
		t.Fatalf("dudas: %q", out.Dudas)
	}

	// categoría fuera de la lista del alumno → «otro»
	mu.Lock()
	contenido = `{"tipo_documento":"Boleta","categoria":"venta","confianza":0.5,"resumen":"ok","campos":[],"dudas":[]}`
	mu.Unlock()
	pedido := entenderPedido()
	pedido["categorias"] = []string{"ingreso", "egreso"}
	if out = entenderLeer(t, entenderPost(e, entAna, pedido), 200); out.Categoria != "otro" {
		t.Fatal("categoría no permitida:", out.Categoria)
	}
}

func TestEntenderTopePorAlumno(t *testing.T) {
	e, _ := entenderEnv(t, func(string) (int, string) { return 200, entenderBuena })
	t.Setenv("LMS_ENTENDER_TOPE", "2")
	entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	if out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200); out.Restantes != 0 {
		t.Fatal("restantes:", out.Restantes)
	}
	w := entenderPost(e, entAna, entenderPedido())
	if out := entenderLeer(t, w, 429); !strings.Contains(*out.Error, "medianoche") || w.Header().Get("Retry-After") == "" {
		t.Fatal("el 429 debe decir cuándo se renueva:", *out.Error)
	}
	entenderLeer(t, entenderPost(e, entBeto, entenderPedido()), 200) // el tope es de cada alumno
	// el personal tiene 5 veces el tope
	for i := 0; i < 10; i++ {
		entenderLeer(t, entenderPost(e, entProfe, entenderPedido()), 200)
	}
	entenderLeer(t, entenderPost(e, entProfe, entenderPedido()), 429)
}

func TestEntenderTopePagoPorAlumno(t *testing.T) {
	gratisCaidos := true
	var mu sync.Mutex
	e, _ := entenderEnv(t, func(m string) (int, string) {
		mu.Lock()
		defer mu.Unlock()
		if strings.HasSuffix(m, ":free") && gratisCaidos {
			return 503, ""
		}
		return 200, entenderBuena
	})
	t.Setenv("LMS_ENTENDER_TOPE_PAGO", "1")
	if out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200); out.Motor.Gratis || out.RestantesPago != 0 {
		t.Fatalf("primera de pago: %+v", out.Motor)
	}
	if out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 429); !strings.Contains(*out.Error, "modelo de pago") || !strings.Contains(*out.Error, "medianoche") {
		t.Fatal("mensaje del tope de pago:", *out.Error)
	}
	// con los gratuitos de vuelta sigue pudiendo; el 429 no le gastó consulta
	mu.Lock()
	gratisCaidos = false
	mu.Unlock()
	if out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200); !out.Motor.Gratis || out.Restantes != 18 {
		t.Fatalf("después del tope de pago: %+v restantes %d", out.Motor, out.Restantes)
	}
}

func TestEntenderTopePagoGlobal(t *testing.T) {
	e, _ := entenderEnv(t, func(m string) (int, string) {
		if strings.HasSuffix(m, ":free") {
			return 429, ""
		}
		return 200, entenderBuena
	})
	t.Setenv("LMS_ENTENDER_TOPE_PAGO_GLOBAL", "1")
	entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	if out := entenderLeer(t, entenderPost(e, entBeto, entenderPedido()), 429); !strings.Contains(*out.Error, "la clase ya agotó") {
		t.Fatal("mensaje del tope global:", *out.Error)
	}
}

func TestEntenderPagoRechazadoNoGastaCupo(t *testing.T) {
	sinSaldo := true
	var mu sync.Mutex
	e, _ := entenderEnv(t, func(m string) (int, string) {
		mu.Lock()
		defer mu.Unlock()
		if strings.HasSuffix(m, ":free") {
			return 429, ""
		}
		if sinSaldo {
			return 402, ""
		}
		return 200, entenderBuena
	})
	t.Setenv("LMS_ENTENDER_TOPE_PAGO", "1")
	entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 503)
	mu.Lock()
	sinSaldo = false
	mu.Unlock()
	if out := entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200); out.Restantes != 19 || out.RestantesPago != 0 {
		t.Fatalf("el 402 no se cobra: %+v", out)
	}
}

func TestEntenderTopeConcurrente(t *testing.T) {
	e, _ := entenderEnv(t, func(string) (int, string) { return 200, entenderBuena })
	t.Setenv("LMS_ENTENDER_TOPE", "3")
	var wg sync.WaitGroup
	var mu sync.Mutex
	codigos := map[int]int{}
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			w := entenderPost(e, entAna, entenderPedido())
			mu.Lock()
			codigos[w.Code]++
			mu.Unlock()
		}()
	}
	wg.Wait()
	if codigos[200] != 3 || codigos[429] != 9 {
		t.Fatal("con 12 a la vez y tope 3:", codigos)
	}
}

func TestEntenderLimitesDeEntrada(t *testing.T) {
	e, f := entenderEnv(t, func(string) (int, string) { return 200, entenderBuena })
	pedido := func(cambios map[string]any) map[string]any {
		p := entenderPedido()
		for k, v := range cambios {
			p[k] = v
		}
		return p
	}
	entenderLeer(t, entenderPost(e, entAna, pedido(map[string]any{"texto": strings.Repeat("a", 12001)})), 413)
	entenderLeer(t, entenderPost(e, entAna, pedido(map[string]any{"pregunta": strings.Repeat("¿", 601)})), 413)
	entenderLeer(t, entenderPost(e, entAna, pedido(map[string]any{"relleno": strings.Repeat("x", 70<<10)})), 413)
	entenderLeer(t, entenderPost(e, entAna, pedido(map[string]any{"texto": " \n "})), 400)
	entenderLeer(t, entenderPost(e, entAna, pedido(map[string]any{"tipo": "docx"})), 400)
	entenderLeer(t, entenderPost(e, entAna, pedido(map[string]any{"campos_reglas": []string{"x"}})), 400)
	entenderLeer(t, entenderPost(e, entAna, `{"texto": `), 400)
	if n := len(f.llamados()); n != 0 {
		t.Fatal("un pedido inválido llegó a OpenRouter:", n)
	}
	// 12 000 caracteres con tilde (24 KB) entran: se cuentan caracteres, no bytes; los opcionales pueden faltar
	out := entenderLeer(t, entenderPost(e, entAna, map[string]any{"nombre": "notas.txt", "tipo": "TXT", "texto": strings.Repeat("á", 12000)}), 200)
	if out.Restantes != 19 {
		t.Fatal("restantes:", out.Restantes)
	}
	t.Setenv("OPENROUTER_API_KEY", "")
	entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 503)
}

func TestEntenderAcceso(t *testing.T) {
	e, f := entenderEnv(t, func(string) (int, string) { return 200, entenderBuena })
	ajeno := &Principal{ID: "ajeno", Cohorts: []string{"c2"}}
	entenderLeer(t, entenderPost(e, ajeno, entenderPedido()), 403)
	// sesión en borrador: solo el personal
	r := httptest.NewRequest("POST", "/api/v1/live/l2/entender", strings.NewReader(`{}`))
	r.SetPathValue("lesson", "l2")
	w := httptest.NewRecorder()
	e.s.liveEntender(w, r, entAna)
	entenderLeer(t, w, 403)
	r = httptest.NewRequest("POST", "/api/v1/live/nada/entender", strings.NewReader(`{}`))
	r.SetPathValue("lesson", "nada")
	w = httptest.NewRecorder()
	e.s.liveEntender(w, r, entAna)
	entenderLeer(t, w, 404)
	if n := len(f.llamados()); n != 0 {
		t.Fatal("un pedido sin permiso llegó a OpenRouter:", n)
	}

	// por la ruta real: sin sesión 401; alumno del grupo c1 entra
	if res := e.call("POST", "/api/v1/live/l1/entender", "", false, entenderPedido(), ""); res.code != 401 {
		t.Fatal("sin sesión:", res.code)
	}
	token := e.register("alumna@x.test")
	res := e.call("POST", "/api/v1/live/l1/entender", token, false, entenderPedido(), "")
	if res.code != 200 || res.body["categoria"] != "venta" {
		t.Fatalf("alumna del grupo: %d %s", res.code, res.raw)
	}
}

// El registro solo lleva conteos, tiempos y el modelo: nunca el texto ni lo que respondió el modelo.
func TestEntenderNoRegistraElTexto(t *testing.T) {
	e, _ := entenderEnv(t, func(m string) (int, string) {
		if m == "libre/uno:free" {
			return 200, "BOTICA SAN JUAN no es JSON"
		}
		return 200, entenderBuena
	})
	var buf bytes.Buffer
	antes := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, nil)))
	t.Cleanup(func() { slog.SetDefault(antes) })
	entenderLeer(t, entenderPost(e, entAna, entenderPedido()), 200)
	log := buf.String()
	if !strings.Contains(log, "modelo=libre/dos:free") || !strings.Contains(log, "motivo=json_invalido") {
		t.Fatal("falta el registro:", log)
	}
	for _, secreto := range []string{"BOTICA", "20000000001", "49.80", "boleta-marzo", "prueba"} {
		if strings.Contains(log, secreto) {
			t.Fatalf("el registro filtró %q: %s", secreto, log)
		}
	}
}
