package main

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const claveAdmin = "clave-admin-de-prueba-123"

func pngPrueba(t *testing.T) []byte {
	im := image.NewRGBA(image.Rect(0, 0, 120, 200))
	im.Set(1, 1, color.Black)
	var b bytes.Buffer
	if err := png.Encode(&b, im); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func servidorPrueba(t *testing.T, lms http.HandlerFunc) (*Servidor, *httptest.Server) {
	t.Helper()
	var cfg Config
	if err := json.Unmarshal(configBase, &cfg); err != nil {
		t.Fatal(err)
	}
	l := httptest.NewServer(lms)
	t.Cleanup(l.Close)
	s := &Servidor{datos: t.TempDir(), cfg: cfg, clave: claveAdmin, lmsURL: l.URL, lmsClave: strings.Repeat("k", 40),
		cliente: l.Client(), limite: nuevoLimitador(5, time.Hour), fallos: nuevoLimitador(10, time.Minute),
		origenes: []string{"https://jmd-learn.online"}, ahora: time.Now,
		limCanje: nuevoLimitador(100, time.Hour), limValidar: nuevoLimitador(100, time.Hour), limCodigo: nuevoLimitador(100, time.Hour)}
	if err := validarConfig(cfg); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(s.datos, "fotos"), 0o700); err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(s.rutas())
	t.Cleanup(srv.Close)
	return s, srv
}

func enviar(t *testing.T, srv *httptest.Server, campos map[string]string, cursos []string, foto []byte, origen string) (int, map[string]any) {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	for k, v := range campos {
		_ = w.WriteField(k, v)
	}
	for _, c := range cursos {
		_ = w.WriteField("cursos", c)
	}
	if foto != nil {
		f, _ := w.CreateFormFile("foto", "yape.png")
		_, _ = f.Write(foto)
	}
	w.Close()
	req, _ := http.NewRequest("POST", srv.URL+"/api/solicitud", &b)
	req.Header.Set("Content-Type", w.FormDataContentType())
	if origen != "" {
		req.Header.Set("Origin", origen)
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

func adminPost(t *testing.T, srv *httptest.Server, ruta, clave, cuerpo string) (int, map[string]any) {
	req, _ := http.NewRequest("POST", srv.URL+ruta, strings.NewReader(cuerpo))
	req.Header.Set("X-Clave", clave)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var m map[string]any
	_ = json.NewDecoder(res.Body).Decode(&m)
	return res.StatusCode, m
}

var datosOK = map[string]string{"nombre": "Ana Pérez", "email": "ana@correo.pe", "telefono": "987 654 321", "operacion": "12345678"}

func TestPrecios(t *testing.T) {
	var cfg Config
	_ = json.Unmarshal(configBase, &cfg)
	for n, want := range map[int]int{1: 10, 3: 20} {
		if p, ok := cfg.precio(n); !ok || p != want {
			t.Fatalf("%d cursos: %d %v", n, p, ok)
		}
	}
	for _, n := range []int{0, 2, 4} {
		if _, ok := cfg.precio(n); ok {
			t.Fatalf("%d cursos no debe valer", n)
		}
	}
	if len(cfg.Cursos) != 4 || cfg.Yape != "986 149 476" {
		t.Fatalf("config: %d cursos, yape %q", len(cfg.Cursos), cfg.Yape)
	}
}

func TestTelefono(t *testing.T) {
	for in, want := range map[string]string{"987 654 321": "51987654321", "+51 987-654-321": "51987654321", "0051987654321": "51987654321", "+1 415 555 0100": "14155550100"} {
		if got, ok := telefonoPeru(in); !ok || got != want {
			t.Fatalf("%q → %q %v", in, got, ok)
		}
	}
	for _, malo := range []string{"12345", "887654321", "51887654321"} {
		if _, ok := telefonoPeru(malo); ok {
			t.Fatalf("%q no debe valer", malo)
		}
	}
}

func TestSolicitudValida(t *testing.T) {
	s, srv := servidorPrueba(t, nil)
	c, m := enviar(t, srv, datosOK, []string{"web-clickhouse", "web-sorteos", "web-qa-bots"}, pngPrueba(t), "https://jmd-learn.online")
	if c != 201 || m["monto"] != float64(20) {
		t.Fatalf("3 cursos: %d %v", c, m)
	}
	if len(s.sols) != 1 || s.sols[0].Telefono != "51987654321" || s.sols[0].Estado != "pendiente" {
		t.Fatalf("guardada: %+v", s.sols)
	}
}

func TestSolicitudRechazos(t *testing.T) {
	s, srv := servidorPrueba(t, nil)
	foto := pngPrueba(t)
	casos := []struct {
		nombre string
		cursos []string
		foto   []byte
		origen string
		code   int
	}{
		{"dos cursos", []string{"web-clickhouse", "web-sorteos"}, foto, "https://jmd-learn.online", 400},
		{"cuatro cursos", []string{"web-clickhouse", "web-sorteos", "web-qa-bots", "web-agente-voz"}, foto, "https://jmd-learn.online", 400},
		{"curso inventado", []string{"otro"}, foto, "https://jmd-learn.online", 400},
		{"sin foto", []string{"web-clickhouse"}, nil, "https://jmd-learn.online", 400},
		{"no es imagen", []string{"web-clickhouse"}, []byte("<?php echo 1; ?> esto no es una imagen"), "https://jmd-learn.online", 400},
		{"otro origen", []string{"web-clickhouse"}, foto, "https://malo.example", 403},
	}
	for _, k := range casos {
		if c, m := enviar(t, srv, datosOK, k.cursos, k.foto, k.origen); c != k.code {
			t.Fatalf("%s: %d %v", k.nombre, c, m)
		}
	}
	if len(s.sols) != 0 {
		t.Fatalf("no debió guardar nada: %d", len(s.sols))
	}
}

func TestTrampaParaBots(t *testing.T) {
	s, srv := servidorPrueba(t, nil)
	d := map[string]string{"sitio": "http://spam"}
	for k, v := range datosOK {
		d[k] = v
	}
	if c, _ := enviar(t, srv, d, []string{"web-clickhouse"}, pngPrueba(t), "https://jmd-learn.online"); c != 200 || len(s.sols) != 0 {
		t.Fatalf("honeypot: %d, %d guardadas", c, len(s.sols))
	}
}

func TestAprobarYRechazar(t *testing.T) {
	var recibido map[string]any
	s, srv := servidorPrueba(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Interno-Clave") != strings.Repeat("k", 40) || r.URL.Path != "/api/v1/interno/inscripcion" {
			w.WriteHeader(404)
			return
		}
		_ = json.NewDecoder(r.Body).Decode(&recibido)
		_ = json.NewEncoder(w).Encode(map[string]any{"enlace": "https://lms/api/v1/auth/enlace?t=x", "vence": "2026-12-01T00:00:00Z", "creado": true})
	})
	enviar(t, srv, datosOK, []string{"web-sorteos"}, pngPrueba(t), "https://jmd-learn.online")
	id := s.sols[0].ID
	if c, _ := adminPost(t, srv, "/api/admin/aprobar/"+id, "mala", "{}"); c != 401 {
		t.Fatalf("clave mala: %d", c)
	}
	c, m := adminPost(t, srv, "/api/admin/aprobar/"+id, claveAdmin, "{}")
	if c != 200 || m["estado"] != "aprobada" || m["enlace"] == "" {
		t.Fatalf("aprobar: %d %v", c, m)
	}
	if recibido["destino"] != "/courses/web-sorteos/" || recibido["email"] != "ana@correo.pe" {
		t.Fatalf("al LMS: %v", recibido)
	}
	if c, _ := adminPost(t, srv, "/api/admin/aprobar/"+id, claveAdmin, "{}"); c != 409 {
		t.Fatalf("aprobar dos veces: %d", c)
	}
	enviar(t, srv, datosOK, []string{"web-qa-bots"}, pngPrueba(t), "https://jmd-learn.online")
	id2 := s.sols[1].ID
	if c, _ := adminPost(t, srv, "/api/admin/rechazar/"+id2, claveAdmin, `{"motivo":""}`); c != 400 {
		t.Fatalf("rechazo sin motivo: %d", c)
	}
	if c, m := adminPost(t, srv, "/api/admin/rechazar/"+id2, claveAdmin, `{"motivo":"El monto no coincide"}`); c != 200 || m["estado"] != "rechazada" {
		t.Fatalf("rechazar: %d %v", c, m)
	}
}

func TestAprobarConGrupoQueFalta(t *testing.T) {
	s, srv := servidorPrueba(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(422)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "grupo_inexistente", "faltan": []string{"web-agente-voz"}})
	})
	enviar(t, srv, datosOK, []string{"web-agente-voz"}, pngPrueba(t), "https://jmd-learn.online")
	c, m := adminPost(t, srv, "/api/admin/aprobar/"+s.sols[0].ID, claveAdmin, "{}")
	if c != 502 || !strings.Contains(m["error"].(string), "web-agente-voz") || s.sols[0].Estado != "pendiente" {
		t.Fatalf("grupo que falta: %d %v %s", c, m, s.sols[0].Estado)
	}
}
