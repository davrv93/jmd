package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

const esquemaPrueba = `{"v":1,"tablas":[{"tabla":"Ventas","hoja":"Ventas","min_filas":1,"max_filas":3,"filas_fijas":false,"columnas":[
 {"col":"A","nombre":"Fecha","tipo":"fecha"},{"col":"G","nombre":"Operación","tipo":"lista","opciones":["Gravada","Exonerada"]},
 {"col":"H","nombre":"Valor de venta","tipo":"numero","min":0},{"col":"I","nombre":"IGV","calc":true}]}],
 "parametros":[{"celda":"Ventas!N2","etiqueta":"Tasa IGV","tipo":"porcentaje"}],"reglas":["Fechas dentro del mes del caso."],"ia":true}`

// iaFalsaMensajes responde como la Messages API de DeepSeek (sin streaming) con el texto que se le diga.
type iaFalsaMensajes struct {
	mu      sync.Mutex
	cuerpos []map[string]any
	claves  []string
	estado  int
	texto   string
}

func (f *iaFalsaMensajes) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var b map[string]any
	_ = json.NewDecoder(r.Body).Decode(&b)
	f.mu.Lock()
	f.cuerpos = append(f.cuerpos, b)
	f.claves = append(f.claves, r.Header.Get("X-Api-Key")+"|"+r.URL.Path)
	estado, texto := f.estado, f.texto
	f.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	if estado != 0 && estado != 200 {
		w.WriteHeader(estado)
		_, _ = io.WriteString(w, `{"type":"error","error":{"type":"authentication_error","message":"API key ****abcd is invalid"}}`)
		return
	}
	out, _ := json.Marshal(map[string]any{"content": []map[string]any{{"type": "thinking", "thinking": "…"}, {"type": "text", "text": texto}},
		"usage": map[string]any{"input_tokens": 900, "output_tokens": 400}})
	_, _ = w.Write(out)
}

func escenarioEnv(t *testing.T, ia *iaFalsaMensajes, conEsquema bool) (*env, string) {
	t.Helper()
	e := newEnvEscenas(t)
	if conEsquema {
		esc := e.s.Content.Get().Escena("l1", "01-uno")
		if err := os.WriteFile(filepath.Join(filepath.Dir(esc.HTMLPath), "escenario.json"), []byte(esquemaPrueba), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if ia != nil {
		up := httptest.NewServer(ia)
		t.Cleanup(up.Close)
		e.s.IA = iaConfig(up.URL+"/anthropic", map[string]string{"c1": claveClase})
	}
	if r := e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": "ana@x.test", "name": "Ana", "password": "ana-1234", "invite_code": "abc"}, ""); r.code != 201 {
		t.Fatalf("registro: %d %s", r.code, r.raw)
	}
	escenariosHoy.Lock()
	escenariosHoy.n = map[string]int{}
	escenariosHoy.Unlock()
	return e, e.login("ana@x.test", "ana-1234")
}

func pedirEscenario(t *testing.T, e *env, tok string, cuerpo map[string]any) (int, map[string]any) {
	t.Helper()
	return jsonReq(t, e, "POST", "/api/v1/live/l1/escenario", tok, true, nil, cuerpo)
}

var pedidoBodega = map[string]any{"escena": "01-uno", "pedido": "una bodega con 3 trabajadores y ventas en dólares",
	"empresa": map[string]string{"razon": "Clínica Santa Lucía S.A.C.", "rubro": "Clínica dental", "regimen": "MYPE Tributario"},
	"muestra": map[string]any{"tablas": map[string]any{"Ventas": []any{[]any{"01/10/2026", "Gravada", 646.8}}}}}

func TestEscenarioUsaLaClaveDeLaClaseYRecortaAlEsquema(t *testing.T) {
	ia := &iaFalsaMensajes{texto: "Aquí va:\n```json\n" + `{"titulo":"Bodega Don Lucho · noviembre 2026","nota":"Montos en US$","supuestos":["TC 3,75"],
		"parametros":{"Ventas!N2":0.18,"Z99":5},"tablas":{"Ventas":[["05/11/2026","Gravada",100],["06/11/2026","Exonerada",50],["07/11/2026","Gravada",20],["08/11/2026","Gravada",9]],
		"Inventada":[[1,2,3]]},"script":"<b>no</b>"}` + "\n```"}
	e, ana := escenarioEnv(t, ia, true)
	c, m := pedirEscenario(t, e, ana, pedidoBodega)
	if c != 200 {
		t.Fatalf("escenario: %d %v", c, m)
	}
	esc := m["escenario"].(map[string]any)
	tablas := esc["tablas"].(map[string]any)
	if len(tablas) != 1 || len(tablas["Ventas"].([]any)) != 3 {
		t.Fatalf("debe quedar solo Ventas con 3 filas (max_filas): %v", tablas)
	}
	if ps := esc["parametros"].(map[string]any); len(ps) != 1 || ps["Ventas!N2"] != 0.18 {
		t.Fatalf("parámetros: %v", ps)
	}
	if _, hay := esc["script"]; hay || esc["titulo"] != "Bodega Don Lucho · noviembre 2026" || m["motor"] != escenarioModeloDefect {
		t.Fatalf("respuesta: %v", m)
	}
	if len(ia.claves) != 1 || ia.claves[0] != claveClase+"|/anthropic/v1/messages" {
		t.Fatalf("debe usar la clave de la clase contra /v1/messages: %v", ia.claves)
	}
	b := ia.cuerpos[0]
	usuario := b["messages"].([]any)[0].(map[string]any)["content"].(string)
	for _, debe := range []string{"una bodega con 3 trabajadores", "Ventas (hoja Ventas; entre 1 y 3 filas): Fecha (fecha dd/mm/aaaa) | Operación (una de: Gravada | Exonerada) | Valor de venta (número, mínimo 0)",
		"Ventas!N2 «Tasa IGV»", "Fechas dentro del mes del caso.", `"646.8`[1:], "Clínica Santa Lucía"} {
		if !strings.Contains(usuario, debe) {
			t.Errorf("el pedido no trae %q:\n%s", debe, usuario)
		}
	}
	if strings.Contains(usuario, "IGV (") {
		t.Error("el pedido no debe pedir la columna que calcula el alumno")
	}
	if !strings.Contains(b["system"].(string), "SOLO un objeto JSON") || b["model"] != escenarioModeloDefect {
		t.Errorf("sistema o modelo: %v %v", b["system"], b["model"])
	}
	// cuenta en el uso del día de la clave de la clase
	_, uso := e.s.IA.Uso()
	var k IAContador
	for _, v := range uso {
		k = v
	}
	if k.Peticiones != 1 || k.Entrada != 900 || k.Salida != 400 || k.Grupo != "c1" {
		t.Fatalf("uso: %+v", k)
	}
}

func TestEscenarioSinClaveSinEsquemaYPedidoMalo(t *testing.T) {
	e, ana := escenarioEnv(t, nil, true)
	if c, m := pedirEscenario(t, e, ana, pedidoBodega); c != 503 || codigoErr(m) != "sin_clave" {
		t.Fatalf("sin clave: %d %v", c, m)
	}
	e2, ana2 := escenarioEnv(t, &iaFalsaMensajes{texto: "{}"}, false)
	if c, m := pedirEscenario(t, e2, ana2, pedidoBodega); c != 404 || codigoErr(m) != "sin_escenario" {
		t.Fatalf("sin escenario.json: %d %v", c, m)
	}
	ia := &iaFalsaMensajes{texto: "{}"}
	e3, ana3 := escenarioEnv(t, ia, true)
	for _, p := range []string{"", "ab", strings.Repeat("x", escenarioMaxPedido+1)} {
		if c, m := pedirEscenario(t, e3, ana3, map[string]any{"escena": "01-uno", "pedido": p}); c != 400 || codigoErr(m) != "pedido_invalido" {
			t.Fatalf("pedido %q: %d %v", p, c, m)
		}
	}
	if c, _ := pedirEscenario(t, e3, ana3, map[string]any{"escena": "99-no", "pedido": "una bodega"}); c != 404 {
		t.Fatalf("escena inexistente: %d", c)
	}
	if c, _ := pedirEscenario(t, e3, "", pedidoBodega); c != 401 {
		t.Fatalf("sin sesión: %d", c)
	}
	if len(ia.cuerpos) != 0 {
		t.Fatal("ningún pedido inválido debe llegar a la IA")
	}
}

func TestEscenarioRespuestaRaraClaveMalaYTope(t *testing.T) {
	ia := &iaFalsaMensajes{texto: "No puedo ayudarte con eso."}
	e, ana := escenarioEnv(t, ia, true)
	if c, m := pedirEscenario(t, e, ana, pedidoBodega); c != 502 || codigoErr(m) != "respuesta_rara" {
		t.Fatalf("texto sin JSON: %d %v", c, m)
	}
	ia.texto = `{"titulo":"x","tablas":{"Otra":[[1]]}}`
	if c, m := pedirEscenario(t, e, ana, pedidoBodega); c != 502 || codigoErr(m) != "respuesta_vacia" {
		t.Fatalf("sin nada útil: %d %v", c, m)
	}
	ia.estado = 401
	c, m := pedirEscenario(t, e, ana, pedidoBodega)
	if c != 502 || codigoErr(m) != "clave_de_clase_invalida" {
		t.Fatalf("clave rechazada: %d %v", c, m)
	}
	if raw, _ := json.Marshal(m); strings.Contains(string(raw), "abcd") || strings.Contains(string(raw), claveClase) {
		t.Fatalf("no debe filtrar nada de la clave: %s", raw)
	}
	// los fallos no gastan escenarios; el tope sí corta
	ia.estado, ia.texto = 200, `{"tablas":{"Ventas":[["05/11/2026","Gravada",1]]}}`
	viejo := escenarioTopeDia
	escenarioTopeDia = 2
	t.Cleanup(func() { escenarioTopeDia = viejo })
	for i := 0; i < 2; i++ {
		if c, m := pedirEscenario(t, e, ana, pedidoBodega); c != 200 {
			t.Fatalf("escenario %d: %d %v", i+1, c, m)
		}
	}
	if c, m := pedirEscenario(t, e, ana, pedidoBodega); c != 429 || codigoErr(m) != "tope_escenarios" {
		t.Fatalf("tope: %d %v", c, m)
	}
	// el instructor no tiene tope
	profe := e.login("profe@x.test", "profe1234")
	if c, m := pedirEscenario(t, e, profe, pedidoBodega); c != 200 {
		t.Fatalf("instructor: %d %v", c, m)
	}
}

// La tabla de la empresa del alumno puede ser más chica que el máximo del esquema: se pide y se recorta a su medida.
func TestEscenarioRespetaLaCapacidadDeLaEmpresa(t *testing.T) {
	ia := &iaFalsaMensajes{texto: `{"tablas":{"Ventas":[["05/11/2026","Gravada",1],["06/11/2026","Gravada",2],["07/11/2026","Gravada",3]]}}`}
	e, ana := escenarioEnv(t, ia, true)
	cuerpo := map[string]any{"escena": "01-uno", "pedido": "una bodega pequeña", "capacidad": map[string]int{"Ventas": 2, "Otra": 50}}
	c, m := pedirEscenario(t, e, ana, cuerpo)
	if c != 200 || len(m["escenario"].(map[string]any)["tablas"].(map[string]any)["Ventas"].([]any)) != 2 {
		t.Fatalf("capacidad 2: %d %v", c, m)
	}
	usuario := ia.cuerpos[0]["messages"].([]any)[0].(map[string]any)["content"].(string)
	if !strings.Contains(usuario, "entre 1 y 2 filas") {
		t.Fatalf("el pedido debe decir la capacidad de la empresa:\n%s", usuario)
	}
	// una capacidad mayor que la del esquema no se acepta
	cuerpo["capacidad"] = map[string]int{"Ventas": 999}
	if c, m := pedirEscenario(t, e, ana, cuerpo); c != 200 || len(m["escenario"].(map[string]any)["tablas"].(map[string]any)["Ventas"].([]any)) != 3 {
		t.Fatalf("capacidad 999 se ignora (máximo 3): %d %v", c, m)
	}
}
