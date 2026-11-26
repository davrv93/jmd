package httpapi

import (
	"archive/tar"
	"bytes"
	"context"
	"encoding/base64"
	"io"
	"strings"
	"testing"
	"time"
)

// aulaProyecto: el motor falso desempaca el tar que llega por stdin para comprobar qué se escribiría.
type aulaProyecto_ struct {
	*aulaFalsa
	script string
	dest   map[string]string
}

func (a *aulaProyecto_) ExecTope(_ context.Context, _ string, script string, stdin []byte, _ time.Duration) (string, error) {
	a.script, a.dest = script, map[string]string{}
	tr := tar.NewReader(bytes.NewReader(stdin))
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
		if h.Typeflag == tar.TypeReg {
			b, _ := io.ReadAll(tr)
			a.dest[h.Name] = string(b)
		}
	}
	return "guardado\n", nil
}

func b64(s string) string { return base64.StdEncoding.EncodeToString([]byte(s)) }

func TestAulaProyectoGuarda(t *testing.T) {
	e, ana, _, idAna, _ := vistaEnv(t, &aulaFalsa{})
	f := &aulaProyecto_{aulaFalsa: &aulaFalsa{}}
	e.setAula(f)
	cuerpo := map[string]any{"carpeta": "juego-laberinto", "archivos": []map[string]string{
		{"ruta": "index.html", "b64": b64("<h1>juego</h1>")},
		{"ruta": "assets/sonidos/salto.wav", "b64": b64("RIFF")},
		{"ruta": "forja.json", "b64": b64(`{"v":1}`)},
	}}
	r := e.call("POST", "/api/v1/aula/proyecto", ana, false, cuerpo, "")
	if r.code != 200 {
		t.Fatalf("guardar: %d %s", r.code, r.raw)
	}
	if !strings.Contains(string(r.raw), `"ruta":"juego-laberinto/index.html"`) || !strings.Contains(string(r.raw), idAna) {
		t.Fatalf("respuesta: %s", r.raw)
	}
	if !strings.Contains(f.script, "/trabajo/juego-laberinto") || f.dest["index.html"] != "<h1>juego</h1>" || f.dest["assets/sonidos/salto.wav"] != "RIFF" {
		t.Fatalf("script %q, archivos %v", f.script, f.dest)
	}
	if mimeVista[".wav"] != "audio/wav" {
		t.Fatalf("el Visor no sirve .wav")
	}
}

func TestAulaProyectoRechaza(t *testing.T) {
	e, ana, _, _, _ := vistaEnv(t, &aulaFalsa{})
	e.setAula(&aulaProyecto_{aulaFalsa: &aulaFalsa{}})
	casos := []map[string]any{
		{"carpeta": "../x", "archivos": []map[string]string{{"ruta": "index.html", "b64": b64("a")}}},
		{"carpeta": "Juego", "archivos": []map[string]string{{"ruta": "index.html", "b64": b64("a")}}},
		{"carpeta": "j", "archivos": []map[string]string{{"ruta": "../index.html", "b64": b64("a")}}},
		{"carpeta": "j", "archivos": []map[string]string{{"ruta": "/etc/index.html", "b64": b64("a")}}},
		{"carpeta": "j", "archivos": []map[string]string{{"ruta": "index.html", "b64": b64("a")}, {"ruta": "x.sh", "b64": b64("a")}}},
		{"carpeta": "j", "archivos": []map[string]string{{"ruta": "juego.js", "b64": b64("a")}}},
		{"carpeta": "j", "archivos": []map[string]string{{"ruta": "index.html", "b64": "%%%"}}},
	}
	for i, c := range casos {
		if r := e.call("POST", "/api/v1/aula/proyecto", ana, false, c, ""); r.code != 400 {
			t.Fatalf("caso %d: %d %s", i, r.code, r.raw)
		}
	}
	if r := e.call("POST", "/api/v1/aula/proyecto", "", false, casos[0], ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
}
