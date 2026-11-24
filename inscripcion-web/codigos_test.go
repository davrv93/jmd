package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// lmsFalso responde como la ruta interna: cuenta nueva la primera vez por correo; 422 si piden «no-existe»;
// 409 para el correo de staff.
func lmsFalso(t *testing.T) (http.HandlerFunc, *[]map[string]any) {
	var mu sync.Mutex
	vistos := map[string]bool{}
	llamadas := &[]map[string]any{}
	return func(w http.ResponseWriter, r *http.Request) {
		var in map[string]any
		_ = json.NewDecoder(r.Body).Decode(&in)
		mu.Lock()
		defer mu.Unlock()
		*llamadas = append(*llamadas, in)
		email := in["email"].(string)
		for _, c := range in["cohorts"].([]any) {
			if c == "no-existe" {
				w.WriteHeader(422)
				_ = json.NewEncoder(w).Encode(map[string]any{"faltan": []string{"no-existe"}, "message": "falta"})
				return
			}
		}
		if email == "staff@jmd.pe" {
			w.WriteHeader(409)
			_ = json.NewEncoder(w).Encode(map[string]any{"message": "staff"})
			return
		}
		creado := !vistos[email]
		vistos[email] = true
		_ = json.NewEncoder(w).Encode(map[string]any{"enlace": "https://lms/api/v1/auth/enlace?t=SECRETO", "vence": "x", "creado": creado})
	}, llamadas
}

func conCatalogo(s *Servidor) {
	s.cfg.Catalogo = []Entrada{
		{Cohorte: "web-clickhouse", Titulo: "ClickHouse", Tipo: "web"},
		{Cohorte: "web-sorteos", Titulo: "Sorteos", Tipo: "web"},
		{Cohorte: "grupo-vivo", Titulo: "En vivo", Tipo: "vivo", Hasta: time.Now().Add(24 * time.Hour).Format(time.RFC3339)},
		{Cohorte: "grupo-pasado", Titulo: "Ya terminó", Tipo: "vivo", Hasta: time.Now().Add(-time.Hour).Format(time.RFC3339)},
		{Cohorte: "no-existe", Titulo: "Sin aula", Tipo: "web"},
	}
}

func jsonPost(t *testing.T, srv *httptest.Server, ruta string, body any, cabeceras map[string]string) (int, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", srv.URL+ruta, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range cabeceras {
		req.Header.Set(k, v)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var m map[string]any
	_ = json.NewDecoder(res.Body).Decode(&m)
	return res.StatusCode, m
}

var origen = map[string]string{"Origin": "https://jmd-learn.online"}
var admin = map[string]string{"X-Clave": claveAdmin}

func crearCodigo(t *testing.T, srv *httptest.Server, body map[string]any) string {
	t.Helper()
	c, m := jsonPost(t, srv, "/api/admin/codigos", body, admin)
	if c != 201 {
		t.Fatalf("crear código: %d %v", c, m)
	}
	return m["codigo"].(string)
}

func canje(cod, email string, cohortes ...string) map[string]any {
	return map[string]any{"codigo": cod, "nombre": "Ana Pérez", "email": email, "telefono": "987654321", "cohortes": cohortes, "web": ""}
}

func TestCodigoCrearYValidar(t *testing.T) {
	h, _ := lmsFalso(t)
	s, srv := servidorPrueba(t, h)
	conCatalogo(s)
	if _, m := getAdmin(t, srv, "/api/admin/codigos"); m["codigos"] == nil || m["canjes"] == nil {
		t.Fatalf("listas vacías deben ser [] y no null: %v", m)
	}
	cod := crearCodigo(t, srv, map[string]any{"max": 2})
	if !strings.HasPrefix(cod, "JMD-") || len(cod) != 13 {
		t.Fatalf("código automático: %q", cod)
	}
	if c, _ := jsonPost(t, srv, "/api/admin/codigos", map[string]any{"codigo": strings.ToLower(cod)}, admin); c != 409 {
		t.Fatalf("duplicado: %d", c)
	}
	if c, _ := jsonPost(t, srv, "/api/admin/codigos", map[string]any{"permitidas": []string{"inventado"}}, admin); c != 400 {
		t.Fatalf("grupo fuera del catálogo: %d", c)
	}
	if c, _ := jsonPost(t, srv, "/api/admin/codigos", map[string]any{}, map[string]string{"X-Clave": "mala"}); c != 401 {
		t.Fatalf("sin clave: %d", c)
	}
	c, m := jsonPost(t, srv, "/api/codigo/validar", map[string]any{"codigo": " " + strings.ToLower(cod) + " "}, origen)
	if c != 200 || m["max"] != float64(2) || m["restantes"] != float64(1) {
		t.Fatalf("validar: %d %v", c, m)
	}
	perm := m["permitidas"].([]any)
	for _, p := range perm {
		if p.(map[string]any)["cohorte"] == "grupo-pasado" {
			t.Fatal("un grupo que ya terminó no se ofrece")
		}
	}
	if len(perm) != 4 {
		t.Fatalf("permitidas: %v", perm)
	}
	if c, m := jsonPost(t, srv, "/api/codigo/validar", map[string]any{"codigo": "JMD-NADA-NADA"}, origen); c != 404 || m["error"] != "codigo_invalido" {
		t.Fatalf("inexistente: %d %v", c, m)
	}
	if c, _ := jsonPost(t, srv, "/api/codigo/validar", map[string]any{"codigo": cod}, map[string]string{"Origin": "https://malo.example"}); c != 403 {
		t.Fatalf("otro origen: %d", c)
	}
}

func TestCanjeCuentaNuevaYExistente(t *testing.T) {
	h, llamadas := lmsFalso(t)
	s, srv := servidorPrueba(t, h)
	conCatalogo(s)
	cod := crearCodigo(t, srv, map[string]any{"max": 0, "usos": 3})
	c, m := jsonPost(t, srv, "/api/codigo/canje", canje(cod, "nueva@correo.pe", "web-clickhouse", "grupo-vivo"), origen)
	if c != 200 || m["cuenta"] != "nueva" || m["enlace"] == nil || len(m["cursos"].([]any)) != 2 {
		t.Fatalf("cuenta nueva: %d %v", c, m)
	}
	// La segunda vez el correo ya tiene cuenta: NUNCA vuelve el enlace.
	c, m = jsonPost(t, srv, "/api/codigo/canje", canje(cod, "nueva@correo.pe", "web-sorteos"), origen)
	if c != 200 || m["cuenta"] != "existente" || m["enlace"] != nil || !strings.Contains(m["mensaje"].(string), "Ya tienes cuenta") {
		t.Fatalf("cuenta existente: %d %v", c, m)
	}
	if strings.Contains(string(mustJSON(m)), "SECRETO") {
		t.Fatal("el enlace se filtró en la respuesta de una cuenta existente")
	}
	if len(*llamadas) != 2 || (*llamadas)[0]["destino"] != "/courses/" {
		t.Fatalf("llamadas al LMS: %v", *llamadas)
	}
	// El panel ve los canjes y puede generar un enlace nuevo.
	_, lista := getAdmin(t, srv, "/api/admin/codigos")
	canjes := lista["canjes"].([]any)
	if len(canjes) != 2 || lista["codigos"].([]any)[0].(map[string]any)["usados"] != float64(2) {
		t.Fatalf("registro: %v", lista)
	}
	id := canjes[0].(map[string]any)["id"].(string)
	if c, m := jsonPost(t, srv, "/api/admin/canjes/"+id+"/enlace", map[string]any{}, admin); c != 200 || m["enlace"] == nil {
		t.Fatalf("enlace desde el panel: %d %v", c, m)
	}
	if c, _ := jsonPost(t, srv, "/api/admin/canjes/"+id+"/enlace", map[string]any{}, origen); c != 401 {
		t.Fatalf("enlace sin clave: %d", c)
	}
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }

func getAdmin(t *testing.T, srv *httptest.Server, ruta string) (int, map[string]any) {
	req, _ := http.NewRequest("GET", srv.URL+ruta, nil)
	req.Header.Set("X-Clave", claveAdmin)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var m map[string]any
	_ = json.NewDecoder(res.Body).Decode(&m)
	return res.StatusCode, m
}

func TestCanjeReglas(t *testing.T) {
	h, _ := lmsFalso(t)
	s, srv := servidorPrueba(t, h)
	conCatalogo(s)
	solo := crearCodigo(t, srv, map[string]any{"max": 1, "usos": 5, "permitidas": []string{"web-clickhouse", "web-sorteos", "no-existe", "grupo-pasado"}})
	casos := []struct {
		nombre string
		body   map[string]any
		code   int
		err    string
	}{
		{"demasiados", canje(solo, "a@b.pe", "web-clickhouse", "web-sorteos"), 400, "demasiados_cursos"},
		{"fuera de los permitidos", canje(solo, "a@b.pe", "grupo-vivo"), 400, "curso_no_permitido"},
		{"ya terminó", canje(solo, "a@b.pe", "grupo-pasado"), 400, "curso_no_permitido"},
		{"ninguno", canje(solo, "a@b.pe"), 400, "datos"},
		{"sin aula en el LMS", canje(solo, "a@b.pe", "no-existe"), 409, "curso_no_disponible"},
		{"staff", canje(solo, "staff@jmd.pe", "web-clickhouse"), 409, "datos"},
		{"correo malo", canje(solo, "no-es-correo", "web-clickhouse"), 400, "datos"},
	}
	for _, k := range casos {
		if c, m := jsonPost(t, srv, "/api/codigo/canje", k.body, origen); c != k.code || m["error"] != k.err || m["ok"] != false {
			t.Fatalf("%s: %d %v", k.nombre, c, m)
		}
	}
	if s.buscarCodigo(solo).Usados != 0 || len(s.canjes) != 0 {
		t.Fatal("un canje fallido no gasta usos")
	}
	// Honeypot: dice que sí y no hace nada.
	b := canje(solo, "bot@b.pe", "web-clickhouse")
	b["web"] = "http://spam"
	if c, _ := jsonPost(t, srv, "/api/codigo/canje", b, origen); c != 200 || s.buscarCodigo(solo).Usados != 0 {
		t.Fatalf("honeypot: %d", c)
	}
}

func TestCodigoAgotadoVencidoDesactivado(t *testing.T) {
	h, _ := lmsFalso(t)
	s, srv := servidorPrueba(t, h)
	conCatalogo(s)
	uno := crearCodigo(t, srv, map[string]any{"codigo": "prueba-1", "usos": 1})
	if c, _ := jsonPost(t, srv, "/api/codigo/canje", canje(uno, "x@y.pe", "web-sorteos"), origen); c != 200 {
		t.Fatalf("primer uso: %d", c)
	}
	if c, m := jsonPost(t, srv, "/api/codigo/canje", canje(uno, "z@y.pe", "web-sorteos"), origen); c != 410 || m["error"] != "codigo_agotado" {
		t.Fatalf("agotado: %d %v", c, m)
	}
	ayer := time.Now().In(lima).AddDate(0, 0, -1).Format("2006-01-02")
	viejo := crearCodigo(t, srv, map[string]any{"vence": ayer})
	if c, m := jsonPost(t, srv, "/api/codigo/validar", map[string]any{"codigo": viejo}, origen); c != 410 || m["error"] != "codigo_vencido" {
		t.Fatalf("vencido: %d %v", c, m)
	}
	hoy := crearCodigo(t, srv, map[string]any{"vence": time.Now().In(lima).Format("2006-01-02")})
	if c, _ := jsonPost(t, srv, "/api/codigo/validar", map[string]any{"codigo": hoy}, origen); c != 200 {
		t.Fatalf("vence hoy: aún vale: %d", c)
	}
	if c, _ := jsonPost(t, srv, "/api/admin/codigos/"+hoy+"/desactivar", map[string]any{}, admin); c != 200 {
		t.Fatalf("desactivar: %d", c)
	}
	if c, m := jsonPost(t, srv, "/api/codigo/validar", map[string]any{"codigo": hoy}, origen); c != 404 || m["error"] != "codigo_invalido" {
		t.Fatalf("desactivado: %d %v", c, m)
	}
}

// Dos canjes simultáneos con el último uso: solo uno entra.
func TestCanjeConcurrente(t *testing.T) {
	h, _ := lmsFalso(t)
	s, srv := servidorPrueba(t, h)
	conCatalogo(s)
	cod := crearCodigo(t, srv, map[string]any{"usos": 1})
	var wg sync.WaitGroup
	oks := make(chan int, 8)
	for i := range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c, _ := jsonPost(t, srv, "/api/codigo/canje", canje(cod, "p"+itoa(i)+"@y.pe", "web-clickhouse"), origen)
			oks <- c
		}()
	}
	wg.Wait()
	close(oks)
	n := 0
	for c := range oks {
		if c == 200 {
			n++
		}
	}
	if n != 1 || s.buscarCodigo(cod).Usados != 1 {
		t.Fatalf("canjes aceptados: %d, usados %d", n, s.buscarCodigo(cod).Usados)
	}
}

func TestCodigoPersiste(t *testing.T) {
	h, _ := lmsFalso(t)
	s, srv := servidorPrueba(t, h)
	conCatalogo(s)
	cod := crearCodigo(t, srv, map[string]any{"usos": 2})
	jsonPost(t, srv, "/api/codigo/canje", canje(cod, "q@y.pe", "web-clickhouse"), origen)
	otro := &Servidor{datos: s.datos}
	if err := otro.cargarCodigos(); err != nil || len(otro.codigos) != 1 || otro.codigos[0].Usados != 1 || len(otro.canjes) != 1 {
		t.Fatalf("al reiniciar: %v %+v", err, otro.codigos)
	}
}
