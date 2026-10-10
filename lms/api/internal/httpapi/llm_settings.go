package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Configuración de la IA del Estudio desde el panel del instructor. Lo guardado en la base
// (tabla settings) manda sobre las variables de entorno LMS_LLM_*, que quedan como valor
// inicial mientras la base esté vacía. Se cachea en memoria y el caché se tira al guardar, así
// que /generate usa siempre la configuración vigente y no la de arranque.

const (
	keyLLMURL     = "llm.url"
	keyLLMKey     = "llm.key"
	keyLLMModel   = "llm.model"
	keyLLMEnabled = "llm.enabled"
)

// llmSettings es la configuración vigente (base de datos o, en su defecto, entorno).
type llmSettings struct {
	URL     string
	Key     string
	Model   string
	Enabled bool
}

// Activa dice si la generación puede atender peticiones.
func (c llmSettings) Activa() bool { return c.Enabled && c.URL != "" }

type llmCache struct {
	mu     sync.Mutex
	loaded bool
	cfg    llmSettings
}

// llmConfig devuelve la configuración vigente. Sin base de datos (pruebas de rutas estáticas)
// usa solo el entorno.
func (s *Server) llmConfig(ctx context.Context) (llmSettings, error) {
	if s.llm == nil {
		s.llm = &llmCache{}
	}
	s.llm.mu.Lock()
	defer s.llm.mu.Unlock()
	if s.llm.loaded {
		return s.llm.cfg, nil
	}
	cfg := llmSettings{URL: s.LLM.URL, Key: s.LLM.Key, Model: s.LLM.Model, Enabled: s.LLM.URL != ""}
	if s.DB != nil {
		read := func(key string) (string, bool, error) {
			v, err := s.DB.Setting(ctx, key)
			if errors.Is(err, store.ErrNotFound) {
				return "", false, nil
			}
			return v, err == nil, err
		}
		for _, it := range []struct {
			key string
			dst *string
		}{{keyLLMURL, &cfg.URL}, {keyLLMKey, &cfg.Key}, {keyLLMModel, &cfg.Model}} {
			v, ok, err := read(it.key)
			if err != nil {
				return llmSettings{}, err
			}
			if ok {
				*it.dst = v
			}
		}
		v, ok, err := read(keyLLMEnabled)
		if err != nil {
			return llmSettings{}, err
		}
		if ok {
			cfg.Enabled = v == "1"
		} else {
			cfg.Enabled = cfg.URL != ""
		}
	}
	if cfg.Model == "" {
		cfg.Model = "auto"
	}
	s.llm.cfg, s.llm.loaded = cfg, true
	return cfg, nil
}

// invalidarLLM tira el caché; la próxima lectura vuelve a la base.
func (s *Server) invalidarLLM() {
	if s.llm == nil {
		return
	}
	s.llm.mu.Lock()
	s.llm.loaded = false
	s.llm.mu.Unlock()
}

// keyHint devuelve «…» más los últimos 4 caracteres de la clave, nunca la clave entera.
func keyHint(key string) string {
	if key == "" {
		return ""
	}
	r := []rune(key)
	if len(r) <= 4 {
		return "…" + strings.Repeat("•", len(r))
	}
	return "…" + string(r[len(r)-4:])
}

func llmView(c llmSettings) map[string]any {
	return map[string]any{
		"url":      c.URL,
		"model":    c.Model,
		"enabled":  c.Enabled,
		"key_set":  c.Key != "",
		"key_hint": keyHint(c.Key),
	}
}

// urlValida exige http(s) con host.
func urlValida(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != ""
}

// adminLLMGet: GET /api/v1/admin/llm → configuración sin la clave.
func (s *Server) adminLLMGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	cfg, err := s.llmConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, llmView(cfg))
}

// adminLLMPut: PUT /api/v1/admin/llm {url, model, enabled, key?}. Clave vacía o ausente = se
// conserva la guardada.
func (s *Server) adminLLMPut(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		URL     string  `json:"url"`
		Model   string  `json:"model"`
		Enabled bool    `json:"enabled"`
		Key     *string `json:"key"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.URL = strings.TrimSpace(in.URL)
	in.Model = strings.TrimSpace(in.Model)
	if in.URL != "" && !urlValida(in.URL) {
		badRequest(w, "la URL debe empezar por http:// o https:// e incluir el servidor")
		return
	}
	if in.Enabled && in.URL == "" {
		badRequest(w, "para activar la IA hace falta la URL del endpoint")
		return
	}
	if in.Model == "" {
		in.Model = "auto"
	}
	actual, err := s.llmConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	key := actual.Key
	cambioClave := false
	if in.Key != nil && strings.TrimSpace(*in.Key) != "" {
		key = strings.TrimSpace(*in.Key)
		cambioClave = true
	}
	enabled := "0"
	if in.Enabled {
		enabled = "1"
	}
	ctx := r.Context()
	for k, v := range map[string]string{keyLLMURL: in.URL, keyLLMKey: key, keyLLMModel: in.Model, keyLLMEnabled: enabled} {
		if err := s.DB.SetSetting(ctx, k, v); err != nil {
			internal(w, err)
			return
		}
	}
	s.invalidarLLM()
	cfg, err := s.llmConfig(ctx)
	if err != nil {
		internal(w, err)
		return
	}
	slog.Info("configuración de IA cambiada", "por", p.Email, "user_id", p.ID, "url", cfg.URL, "model", cfg.Model,
		"enabled", cfg.Enabled, "key_set", cfg.Key != "", "key_changed", cambioClave, "at", time.Now().UTC().Format(time.RFC3339))
	writeJSON(w, 200, llmView(cfg))
}

// adminLLMTest: POST /api/v1/admin/llm/test {url?, model?, key?} → {ok, status, ms, model, detail}.
// Hace una petición mínima de chat con 20 s de tope. Lo que falte en el cuerpo sale de lo guardado.
func (s *Server) adminLLMTest(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		URL   string `json:"url"`
		Model string `json:"model"`
		Key   string `json:"key"`
	}
	if r.ContentLength != 0 {
		if !readJSON(w, r, &in) {
			return
		}
	}
	saved, err := s.llmConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	cfg := llmSettings{URL: strings.TrimSpace(in.URL), Model: strings.TrimSpace(in.Model), Key: strings.TrimSpace(in.Key)}
	if cfg.URL == "" {
		cfg.URL = saved.URL
	}
	if cfg.Model == "" {
		cfg.Model = saved.Model
	}
	if cfg.Key == "" {
		cfg.Key = saved.Key
	}
	if cfg.URL == "" {
		writeJSON(w, 200, map[string]any{"ok": false, "status": 0, "ms": 0, "model": cfg.Model, "detail": "falta la URL del endpoint"})
		return
	}
	if !urlValida(cfg.URL) {
		writeJSON(w, 200, map[string]any{"ok": false, "status": 0, "ms": 0, "model": cfg.Model, "detail": "la URL debe empezar por http:// o https://"})
		return
	}
	res := probarLLM(r.Context(), cfg)
	slog.Info("prueba de conexión de IA", "por", p.Email, "url", cfg.URL, "model", cfg.Model, "ok", res["ok"], "status", res["status"], "ms", res["ms"])
	writeJSON(w, 200, res)
}

// probarLLM manda «Responde solo: ok» y resume la respuesta sin filtrar la clave.
func probarLLM(ctx context.Context, cfg llmSettings) map[string]any {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	out := map[string]any{"ok": false, "status": 0, "ms": 0, "model": cfg.Model, "detail": ""}
	body, _ := json.Marshal(map[string]any{
		"model":       cfg.Model,
		"temperature": 0,
		"max_tokens":  16,
		"messages":    []chatMsg{{Role: "user", Content: "Responde solo: ok"}},
	})
	t0 := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, bytes.NewReader(body))
	if err != nil {
		out["detail"] = recortar(sinClave(err.Error(), cfg.Key))
		return out
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.Key != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.Key)
	}
	resp, err := http.DefaultClient.Do(req)
	out["ms"] = int(time.Since(t0).Milliseconds())
	if err != nil {
		msg := err.Error()
		if errors.Is(err, context.DeadlineExceeded) {
			msg = "sin respuesta en 20 s"
		}
		out["detail"] = recortar(sinClave(msg, cfg.Key))
		return out
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	out["ms"] = int(time.Since(t0).Milliseconds())
	out["status"] = resp.StatusCode
	if resp.StatusCode != http.StatusOK {
		out["detail"] = recortar(sinClave("respondió "+resp.Status+": "+strings.TrimSpace(string(raw)), cfg.Key))
		return out
	}
	var parsed struct {
		Model   string `json:"model"`
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		out["detail"] = "respondió 200 pero no con el formato de chat/completions (¿es la URL completa del endpoint?)"
		return out
	}
	if parsed.Model != "" {
		out["model"] = parsed.Model
	}
	if len(parsed.Choices) == 0 {
		out["detail"] = "respondió 200 sin «choices»: el modelo no contestó"
		return out
	}
	out["ok"] = true
	out["detail"] = recortar(strings.TrimSpace(limpiarRazonamiento(parsed.Choices[0].Message.Content)))
	return out
}

// sinClave quita la clave del texto si el proveedor la devolvió en el mensaje de error.
func sinClave(s, key string) string {
	if key == "" {
		return s
	}
	return strings.ReplaceAll(s, key, "[clave]")
}

// recortar deja el texto en 200 caracteres como mucho.
func recortar(s string) string {
	r := []rune(s)
	if len(r) <= 200 {
		return s
	}
	return string(r[:199]) + "…"
}

// llmStatus: GET /api/v1/llm/status → {enabled, model} para cualquier usuario autenticado.
// Sin URL ni clave: solo lo que el Estudio necesita para pintar el chip.
func (s *Server) llmStatus(w http.ResponseWriter, r *http.Request, p *Principal) {
	cfg, err := s.llmConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"enabled": cfg.Activa(), "model": cfg.Model})
}
