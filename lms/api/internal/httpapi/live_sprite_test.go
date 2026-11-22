package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
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
			if r.FormValue("prompt") == "" {
				t.Errorf("klein sin prompt")
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
	t.Setenv("SPRITE_TRADUCIR", "0") // la traducción tiene sus propias pruebas abajo
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

// fakeImagenTraducir imita POST /traducir del servicio imagen con un diccionario fijo.
func fakeImagenTraducir(t *testing.T, dic map[string]string, espera time.Duration, estado int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/traducir" || r.Header.Get("Authorization") != "Bearer clase-prueba" {
			t.Errorf("pedido raro al servicio imagen: %s %q", r.URL.Path, r.Header.Get("Authorization"))
		}
		var in struct {
			Texto string `json:"texto"`
		}
		_ = json.NewDecoder(r.Body).Decode(&in)
		if espera > 0 {
			select {
			case <-time.After(espera):
			case <-r.Context().Done():
				return
			}
		}
		if estado != 200 {
			w.WriteHeader(estado)
			return
		}
		en, ok := dic[in.Texto]
		if !ok {
			en = in.Texto
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"en": en, "modelo": "prueba:free", "ms": 3})
	}))
}

// fakeCloudflarePrompt guarda el prompt que llega a FLUX.2 klein.
func fakeCloudflarePrompt(t *testing.T, prompts *[]string, mu *sync.Mutex) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(8 << 20); err != nil {
			t.Errorf("klein sin multipart: %v", err)
		}
		mu.Lock()
		*prompts = append(*prompts, r.FormValue("prompt"))
		mu.Unlock()
		w.Header().Set("cf-ai-neurons", "104")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"result": map[string]any{"image": png1x1}, "success": true})
	}))
}

func prepararSprite(t *testing.T, cf, imagen string) {
	t.Helper()
	t.Setenv("SPRITE_BASE_URL", cf)
	t.Setenv("CLOUDFLARE_TOKEN", "prueba")
	t.Setenv("CLOUDFLARE_ACCOUNT_ID", "cuenta")
	t.Setenv("SPRITE_HOJAS_POR_ALUMNO", "10")
	t.Setenv("SPRITE_NEURONAS_DIA", "100000")
	t.Setenv("IMAGEN_URL", imagen)
	t.Setenv("LMS_AULA_TOKEN", "clase-prueba")
	t.Setenv("SPRITE_TRADUCIR", "")
	spriteUso.Lock()
	spriteUso.porAlumno = map[string]int{}
	spriteUso.neuronas = map[string]float64{}
	spriteUso.Unlock()
}

func TestLiveSpriteTraduceAntesDeCloudflare(t *testing.T) {
	e := newEnv(t)
	var prompts []string
	var mu sync.Mutex
	cf := fakeCloudflarePrompt(t, &prompts, &mu)
	defer cf.Close()
	im := fakeImagenTraducir(t, map[string]string{
		"un zorro naranja con bufanda": "an orange fox with a scarf",
		"corriendo; saltando":          "running; jumping.",
	}, 0, 200)
	defer im.Close()
	prepararSprite(t, cf.URL, im.URL)

	ana := e.register("ana@x.test")
	r := e.call("POST", "/api/v1/live/l1/sprite", ana, false,
		map[string]any{"animal": "un zorro naranja con bufanda", "poses": []string{"corriendo", "saltando"}}, "")
	if r.code != 200 {
		t.Fatalf("sprite: %d %s", r.code, r.raw)
	}
	if len(prompts) != 1 {
		t.Fatalf("llamadas a FLUX: %d", len(prompts))
	}
	if !strings.Contains(prompts[0], "an orange fox with a scarf") || !strings.Contains(prompts[0], "running, jumping") {
		t.Fatalf("el prompt no llegó en inglés: %s", prompts[0])
	}
	if strings.Contains(prompts[0], "zorro") || strings.Contains(prompts[0], "corriendo") {
		t.Fatalf("quedó español en el prompt: %s", prompts[0])
	}
}

func TestLiveSpriteTraduccionLentaOFallidaUsaElOriginal(t *testing.T) {
	casos := []struct {
		nombre string
		espera time.Duration
		estado int
		dic    map[string]string
	}{
		{"lenta", 3 * time.Second, 200, map[string]string{"un gato gris": "a gray cat"}},
		{"error 500", 0, 500, nil},
		{"poses que no cuadran", 0, 200, map[string]string{"corriendo; saltando": "running and jumping"}},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			e := newEnv(t)
			var prompts []string
			var mu sync.Mutex
			cf := fakeCloudflarePrompt(t, &prompts, &mu)
			defer cf.Close()
			im := fakeImagenTraducir(t, c.dic, c.espera, c.estado)
			defer im.Close()
			prepararSprite(t, cf.URL, im.URL)
			t.Setenv("SPRITE_TRADUCIR_TIMEOUT", "150ms")

			ana := e.register("ana@x.test")
			t0 := time.Now()
			r := e.call("POST", "/api/v1/live/l1/sprite", ana, false,
				map[string]any{"animal": "un gato gris", "poses": []string{"corriendo", "saltando"}}, "")
			if r.code != 200 {
				t.Fatalf("sprite: %d %s", r.code, r.raw)
			}
			if d := time.Since(t0); d > 2*time.Second {
				t.Fatalf("la traducción frenó la hoja: %s", d)
			}
			if len(prompts) != 1 || !strings.Contains(prompts[0], "corriendo, saltando") {
				t.Fatalf("las poses debían quedar como el alumno las escribió: %v", prompts)
			}
			if c.estado != 200 || c.espera > 0 {
				if !strings.Contains(prompts[0], "un gato gris") {
					t.Fatalf("la mascota debía quedar como el alumno la escribió: %s", prompts[0])
				}
			}
		})
	}
}
