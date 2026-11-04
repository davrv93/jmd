package httpapi

import (
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// El enlace de acceso abre la sesión del alumno y lo lleva al LIVE; caducado o tocado, no.
func TestEnlaceDeAcceso(t *testing.T) {
	e, _, _, _, idAna := botonEnv(t)
	e.s.IA = iaConfig("http://deepseek.invalid/anthropic", nil)
	tok := e.s.enlaceAcceso(idAna, time.Now().Add(time.Hour))
	cli := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	pedir := func(t0, a string) *http.Response {
		res, err := cli.Get(e.srv.URL + "/api/v1/auth/enlace?t=" + url.QueryEscape(t0) + "&a=" + url.QueryEscape(a))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		return res
	}
	res := pedir(tok, "/live/x/")
	if res.StatusCode != 303 || res.Header.Get("Location") != "/live/x/" || !strings.Contains(res.Header.Get("Set-Cookie"), "lms_session=") {
		t.Fatalf("enlace bueno: %d %q %q", res.StatusCode, res.Header.Get("Location"), res.Header.Get("Set-Cookie"))
	}
	if res := pedir(tok, "//malo.example/"); res.Header.Get("Location") != "/" {
		t.Fatalf("destino externo: %q", res.Header.Get("Location"))
	}
	for _, malo := range []string{tok + "x", e.s.enlaceAcceso(idAna, time.Now().Add(-time.Minute)), "basura"} {
		if res := pedir(malo, "/live/x/"); res.Header.Get("Set-Cookie") != "" || !strings.Contains(res.Header.Get("Location"), "enlace=caducado") {
			t.Fatalf("enlace malo %q: %q", malo, res.Header.Get("Location"))
		}
	}
}

func TestAccesosSoloStaff(t *testing.T) {
	e, _, ana, _, _ := botonEnv(t)
	e.s.IA = iaConfig("http://deepseek.invalid/anthropic", nil)
	if c, _ := jsonReq(t, e, "GET", "/api/v1/live/l1/accesos", ana, true, nil, nil); c != 403 {
		t.Fatalf("alumno pidiendo enlaces: %d", c)
	}
}

// La dirección pública no pide sesión y no sirve ninguna otra escena.
func TestEscenaPublicaSinSesion(t *testing.T) {
	e := newEnv(t)
	if r := e.call("GET", "/sorteo-goldenquerys", "", false, nil, ""); r.code != 404 { // la lección gq-01 no está en el catálogo de prueba
		t.Fatalf("sin la escena en el catálogo: %d %s", r.code, r.raw)
	}
	if _, ok := escenasPublicas["/api/v1/live/gq-01/escenas/01-bienvenida/html"]; ok {
		t.Fatal("otra escena quedó pública")
	}
}

// Una pista no sale antes de su hora, aunque el archivo ya esté en el servidor.
func TestFugaPistasPorHora(t *testing.T) {
	e := newEnv(t)
	e.s.DataDir = t.TempDir()
	ya, luego := time.Now().Add(-time.Minute).Format(time.RFC3339), time.Now().Add(time.Hour).Format(time.RFC3339)
	raw := `[{"hora":"` + ya + `","texto":"primera"},{"hora":"` + luego + `","texto":"secreta"}]`
	if err := os.WriteFile(filepath.Join(e.s.DataDir, "fuga-pistas.json"), []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}
	r := e.call("GET", "/api/v1/fuga/pistas", "", false, nil, "")
	if r.code != 200 || strings.Contains(string(r.raw), "secreta") || !strings.Contains(string(r.raw), "primera") || r.body["siguiente"] == "" {
		t.Fatalf("pistas: %d %s", r.code, r.raw)
	}
}

// Las visitas se cuentan por persona sin guardar la IP.
func TestVisitasPublicas(t *testing.T) {
	e := newEnv(t)
	ctx := t.Context()
	for _, h := range []string{"a", "a", "b"} {
		if err := e.db.SumarVisita(ctx, "/fuga-yape", h); err != nil {
			t.Fatal(err)
		}
	}
	v, err := e.db.VisitasResumen(ctx)
	if err != nil || len(v) != 1 || v[0].Visitas != 3 || v[0].Personas != 2 {
		t.Fatalf("resumen: %+v %v", v, err)
	}
	if r := e.call("GET", "/api/v1/admin/visitas", "", false, nil, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
}

// Pasada la hora de cierre, la fuga no entrega la caja; el sorteo sigue abierto.
func TestFugaCierra(t *testing.T) {
	e := newEnv(t)
	antes := cierreFuga
	t.Cleanup(func() { cierreFuga = antes })
	cierreFuga = time.Now().Add(-time.Minute)
	r := e.call("GET", "/fuga-yape", "", false, nil, "")
	if r.code != 200 || !strings.Contains(string(r.raw), "La fuga terminó") {
		t.Fatalf("fuga cerrada: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/sorteo-goldenquerys", "", false, nil, ""); strings.Contains(string(r.raw), "La fuga terminó") {
		t.Fatal("el sorteo no debía cerrarse")
	}
}
