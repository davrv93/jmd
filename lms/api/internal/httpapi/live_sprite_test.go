package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// png1x1: PNG mínimo válido para que el endpoint tenga algo que devolver.
var png1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=="

// fakeCloudflare imita Workers AI: JSON para schnell y multipart para klein.
func fakeCloudflare(t *testing.T, neuronas string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
			t.Errorf("llamada sin token: %s", r.URL.Path)
		}
		switch {
		case strings.Contains(r.URL.Path, "flux-2-klein-4b"):
			if err := r.ParseMultipartForm(8 << 20); err != nil {
				t.Errorf("klein sin multipart: %v", err)
			}
			if r.FormValue("prompt") == "" || r.MultipartForm == nil || len(r.MultipartForm.File["input_image"]) == 0 {
				t.Errorf("klein sin prompt o sin imagen de referencia")
			}
		default:
			var in map[string]any
			if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in["prompt"] == "" {
				t.Errorf("schnell sin prompt: %v", err)
			}
		}
		w.Header().Set("cf-ai-neurons", neuronas)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"image": png1x1}, "success": true})
	}))
}

func TestLiveSpriteGeneraBaseYPoses(t *testing.T) {
	e := newEnv(t)
	srv := fakeCloudflare(t, "104.2")
	defer srv.Close()
	t.Setenv("SPRITE_BASE_URL", srv.URL)
	t.Setenv("CLOUDFLARE_TOKEN", "prueba")
	t.Setenv("CLOUDFLARE_ACCOUNT_ID", "cuenta")
	t.Setenv("SPRITE_HOJAS_POR_ALUMNO", "2")
	t.Setenv("SPRITE_NEURONAS_DIA", "100000")
	spriteUso.Lock()
	spriteUso.porAlumno = map[string]int{}
	spriteUso.neuronas = map[string]float64{}
	spriteUso.Unlock()

	ana := e.register("ana@x.test")
	pedido := map[string]any{
		"animal": "un zorro naranja con bufanda",
		"poses":  []string{"corriendo", "saltando", "sentado", "parado", "durmiendo", "saludando"},
	}
	r := e.call("POST", "/api/v1/live/l1/sprite", ana, false, pedido, "")
	if r.code != 200 {
		t.Fatalf("sprite: %d %s", r.code, r.raw)
	}
	hoja, _ := r.body["hoja"].(string)
	if !strings.HasPrefix(hoja, "data:image/png;base64,") {
		t.Fatalf("hoja rara: %.40s", hoja)
	}
	if n, _ := r.body["poses"].(float64); n != 6 {
		t.Fatalf("poses pedidas: %v", r.body["poses"])
	}
	if n, _ := r.body["neuronas"].(float64); n <= 0 {
		t.Fatalf("neuronas: %v", r.body["neuronas"])
	}

	// El tope por defecto son 2 hojas por alumno y día: la tercera ya no cabe.
	if r := e.call("POST", "/api/v1/live/l1/sprite", ana, false, pedido, ""); r.code != 200 {
		t.Fatalf("segunda hoja: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/live/l1/sprite", ana, false, pedido, ""); r.code != 429 {
		t.Fatalf("tercera hoja: %d %s", r.code, r.raw)
	}
}

func TestLiveSpriteSinCredenciales(t *testing.T) {
	e := newEnv(t)
	t.Setenv("SPRITE_BASE_URL", "")
	t.Setenv("CLOUDFLARE_ACCOUNT_ID", "")
	t.Setenv("CLOUDFLARE_TOKEN", "")
	t.Setenv("CF_API_TOKEN", "")
	spriteUso.Lock()
	spriteUso.porAlumno = map[string]int{}
	spriteUso.neuronas = map[string]float64{}
	spriteUso.Unlock()

	ana := e.register("ana@x.test")
	r := e.call("POST", "/api/v1/live/l1/sprite", ana, false,
		map[string]any{"animal": "un gato", "poses": []string{"corriendo"}}, "")
	if r.code != 503 {
		t.Fatalf("sin credenciales: %d %s", r.code, r.raw)
	}
}

func TestLiveSpriteRechazaPedidoVacio(t *testing.T) {
	e := newEnv(t)
	ana := e.register("ana@x.test")
	if r := e.call("POST", "/api/v1/live/l1/sprite", ana, false,
		map[string]any{"animal": "  ", "poses": []string{}}, ""); r.code != 400 {
		t.Fatalf("animal vacío: %d %s", r.code, r.raw)
	}
	// Siete poses se recortan a seis; sin credenciales responde 503, no 400.
	if r := e.call("POST", "/api/v1/live/l1/sprite", ana, false,
		map[string]any{"animal": "un gato", "poses": []string{"a", "b", "c", "d", "e", "f", "g"}}, ""); r.code == 400 {
		t.Fatalf("siete poses no debería ser 400: %s", r.raw)
	}
}

var _ = base64.StdEncoding
