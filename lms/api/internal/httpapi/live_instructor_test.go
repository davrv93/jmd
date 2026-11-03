package httpapi

import (
	"net/http"
	"net/url"
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
