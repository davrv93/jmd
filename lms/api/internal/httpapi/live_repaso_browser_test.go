package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// Integración real de navegador: Go, cookies y CSP reales. El reloj de la sala
// se adelanta sólo en este fixture para no esperar cinco minutos; no se simulan
// respuestas, colisiones ni puntos y no se añaden rutas de QA a producción.
func TestRepasoNavegadorReal(t *testing.T) {
	if os.Getenv("LMS_REPASO_BROWSER_QA") != "1" {
		t.Skip("activa LMS_REPASO_BROWSER_QA=1 con Node/Chrome/Playwright instalados")
	}
	e := newEnvRepaso(t)
	_, file, _, _ := runtime.Caller(0)
	lms := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", ".."))
	source := filepath.Join(lms, "content", "courses", "hard-to-explain-diseno", "live")
	dest := filepath.Dir(e.s.Content.Get().Escena("de-02", repasoEscena).HTMLPath)
	comun := filepath.Join(filepath.Dir(filepath.Dir(dest)), "_comun")
	if err := os.MkdirAll(comun, 0755); err != nil {
		t.Fatal(err)
	}
	for from, to := range map[string]string{filepath.Join(source, "de-02", repasoEscena, "escena.html"): filepath.Join(dest, "escena.html"), filepath.Join(source, "_comun", "escena.css"): filepath.Join(comun, "escena.css"), filepath.Join(source, "_comun", "p5-1.11.1.min.js"): filepath.Join(comun, "p5-1.11.1.min.js")} {
		b, err := os.ReadFile(from)
		if err != nil {
			t.Fatal(err)
		}
		if err = os.WriteFile(to, b, 0644); err != nil {
			t.Fatal(err)
		}
	}
	registered := e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": "juega@x.test", "name": "Juega", "password": "juega-1234", "invite_code": "abc"}, "")
	if registered.code != 201 {
		t.Fatal("no se pudo crear el alumno de prueba")
	}
	handler := e.s.Handler()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/__qa/frame" {
			w.Header().Set("Content-Type", "text/html")
			io.WriteString(w, `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0}iframe{width:100%;height:100%;border:0;display:block}</style></head><body><iframe title="Escena LIVE" src="/api/v1/live/de-02/escenas/02-pum-repaso/html"></iframe></body></html>`)
			return
		}
		if r.URL.Path == "/__qa/reloj" {
			var in struct {
				Fase  string `json:"fase"`
				Ronda int    `json:"ronda"`
			}
			if json.NewDecoder(r.Body).Decode(&in) != nil {
				w.WriteHeader(400)
				return
			}
			delta := int64(in.Ronda)*repasoRondaMS + 200
			if in.Fase == "destreza" {
				delta += repasoPreguntaMS
			}
			if in.Fase == "explicacion" {
				delta += repasoPreguntaMS + repasoDestrezaMS
			}
			e.s.repaso.Lock()
			e.s.repaso.inicio = time.Now().Add(-time.Duration(delta) * time.Millisecond)
			e.s.repaso.Unlock()
			writeJSON(w, 200, map[string]bool{"ok": true})
			return
		}
		handler.ServeHTTP(w, r)
	}))
	defer server.Close()
	out := os.Getenv("LMS_REPASO_QA_DIR")
	if out == "" {
		out = t.TempDir()
	}
	// Credenciales sólo del fixture temporal, nunca las de producción.
	input, _ := json.Marshal(map[string]any{"base": server.URL, "out": out, "teacher": map[string]string{"email": "profe@x.test", "password": "profe1234"}, "student": map[string]string{"email": "juega@x.test", "password": "juega-1234"}})
	cmd := exec.Command("node", filepath.Join(lms, "scripts", "probar-repaso-real.mjs"))
	cmd.Stdin = strings.NewReader(string(input))
	result, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("navegador/API real: %v\n%s", err, result)
	}
	t.Log(strings.TrimSpace(string(result)))
}
