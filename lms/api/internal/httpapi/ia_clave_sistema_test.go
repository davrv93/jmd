package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// DeepSeek falso solo para /user/balance: 200 con la clave buena, 401 con cualquier otra.
func saldoFalso(t *testing.T, buena string) *httptest.Server {
	t.Helper()
	ds := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/user/balance" {
			http.NotFound(w, r)
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+buena {
			w.WriteHeader(401)
			_, _ = w.Write([]byte(`{"error":{"message":"Authentication Fails, Your api key: ****xxxx is invalid"}}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"is_available":true,"balance_infos":[{"currency":"USD","total_balance":"9.50"}]}`))
	}))
	t.Cleanup(ds.Close)
	return ds
}

// La clave del sistema se guarda desde el panel, enciende el relé en caliente para los grupos elegidos y nunca
// vuelve al navegador.
func TestClaveSistemaDeepSeek(t *testing.T) {
	e, f, ana, _, _ := botonEnv(t)
	ds := saldoFalso(t, claveClase)
	e.s.IA = iaConfig(ds.URL+"/anthropic", nil)
	admin := e.login("profe@x.test", "profe1234")
	ruta := "/api/v1/admin/ia/deepseek"

	if c, _ := jsonReq(t, e, "GET", ruta, ana, true, nil, nil); c != 403 {
		t.Fatalf("alumno leyendo la clave del sistema: %d", c)
	}
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{}); c != 409 || codigoErr(m) != "sin_clave" {
		t.Fatalf("sin clave del sistema: %d %v", c, m)
	}
	c, m := jsonReq(t, e, "GET", ruta, admin, true, nil, nil)
	if c != 200 || m["clave_puesta"] != false || m["disponible"] != true {
		t.Fatalf("estado inicial: %d %v", c, m)
	}
	if cs, _ := m["cohortes"].([]any); len(cs) == 0 {
		t.Fatalf("sin grupos del catálogo: %v", m)
	}
	// Clave rechazada por DeepSeek: no se guarda.
	if c, m := jsonReq(t, e, "PUT", ruta, admin, true, nil, map[string]any{"clave": "sk-mala-zzzzzzzzzzzz", "grupos": []string{"c1"}}); c != 400 || codigoErr(m) != "clave_rechazada" {
		t.Fatalf("clave mala: %d %v", c, m)
	}
	if c, m := jsonReq(t, e, "PUT", ruta, admin, true, nil, map[string]any{"clave": claveClase, "grupos": []string{}}); c != 400 || codigoErr(m) != "sin_grupos" {
		t.Fatalf("sin grupos: %d %v", c, m)
	}
	res, raw := dshReq(t, e, "PUT", ruta, admin, true, map[string]string{"Content-Type": "application/json", "Origin": "https://jmd-learn.online"},
		`{"clave":" `+claveClase+` ","grupos":["c1"," c1"]}`)
	if res.StatusCode != 200 || strings.Contains(string(raw), claveClase) {
		t.Fatalf("guardar: %d %s", res.StatusCode, raw)
	}
	if !strings.Contains(string(raw), `"saldo":"9.50 USD"`) || !strings.Contains(string(raw), `"clave_pista":"…xxxx"`) {
		t.Fatalf("vista tras guardar: %s", raw)
	}
	// En caliente: el alumno de c1 abre con la clave de la clase, sin reiniciar nada.
	if c, m := jsonReq(t, e, "POST", "/api/v1/dsh/abrir", ana, true, nil, map[string]any{}); c != 200 || m["modo"] != "clase" {
		t.Fatalf("abrir con la clave del sistema: %d %v", c, m)
	}
	for _, s := range append(append([]string{}, f.scripts...), f.stdins...) {
		if strings.Contains(s, claveClase) {
			t.Fatalf("la clave del sistema entró al aula: %q", s)
		}
	}
	// Cambiar solo los grupos conserva la clave.
	if c, m := jsonReq(t, e, "PUT", ruta, admin, true, nil, map[string]any{"grupos": []string{"otro"}}); c != 200 || m["clave_puesta"] != true {
		t.Fatalf("solo grupos: %d %v", c, m)
	}
	if e.s.IA.GrupoCon([]string{"c1"}) != "" || e.s.IA.GrupoCon([]string{"otro"}) != "otro" {
		t.Fatal("los grupos no se aplicaron en caliente")
	}
	// Otro arranque del LMS la carga de la base.
	e.s.IA = iaConfig(ds.URL+"/anthropic", nil)
	e.s.CargarClaveSistema(t.Context())
	if e.s.IA.GrupoCon([]string{"otro"}) != "otro" {
		t.Fatal("no se cargó de la base al arrancar")
	}
	if c, m := jsonReq(t, e, "POST", ruta+"/probar", admin, true, nil, map[string]any{}); c != 200 || m["ok"] != true {
		t.Fatalf("probar la guardada: %d %v", c, m)
	}
	if c, m := jsonReq(t, e, "DELETE", ruta, admin, true, nil, nil); c != 200 || m["clave_puesta"] != false {
		t.Fatalf("quitar: %d %v", c, m)
	}
	if e.s.IA.Activo() {
		t.Fatal("el relé siguió activo sin clave")
	}
}
