package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// liveImagen: POST /api/v1/live/{lesson}/imagen {"prompt":"…","orientacion":"horizontal|cuadrado|vertical"}.
// Genera una imagen desde una escena del LIVE, sin pasar por la terminal del aula: el LMS reenvía el pedido
// al servicio de imagen de la clase (IMAGEN_URL, por defecto http://imagen:8000) con el token de la clase
// (LMS_AULA_TOKEN) y manda X-Alumno para que el tope diario se cuente por alumno. Devuelve la imagen tal
// cual (image/jpeg) o el error del servicio en JSON.
func (s *Server) liveImagen(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Prompt      string `json:"prompt"`
		Orientacion string `json:"orientacion"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Prompt = strings.TrimSpace(in.Prompt)
	if in.Prompt == "" || len(in.Prompt) > 1000 {
		writeErr(w, 400, "prompt_invalido", "el prompt no puede estar vacío ni pasar de 1000 caracteres")
		return
	}
	switch in.Orientacion {
	case "horizontal", "cuadrado", "vertical":
	default:
		in.Orientacion = "horizontal"
	}
	token := os.Getenv("LMS_AULA_TOKEN")
	url := strings.TrimRight(os.Getenv("IMAGEN_URL"), "/")
	if url == "" {
		url = "http://imagen:8000"
	}
	cuerpo, _ := json.Marshal(map[string]any{"prompt": in.Prompt, "calidad": "maxima", "orientacion": in.Orientacion})
	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url+"/generar", bytes.NewReader(cuerpo))
	if err != nil {
		internal(w, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Alumno", p.ID)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, 503, "imagen_no_disponible", "el servicio de imagen de la clase no responde")
		return
	}
	defer resp.Body.Close()
	datos, err := io.ReadAll(io.LimitReader(resp.Body, 12<<20))
	if err != nil {
		writeErr(w, 502, "imagen_truncada", "no se pudo leer la imagen")
		return
	}
	if resp.StatusCode != 200 {
		// el servicio responde {"detail": "…"} o {"detail": {"codigo","mensaje"}}; se pasa el mensaje tal cual
		msg := strings.TrimSpace(string(datos))
		var d struct {
			Detail any `json:"detail"`
		}
		if json.Unmarshal(datos, &d) == nil && d.Detail != nil {
			switch v := d.Detail.(type) {
			case string:
				msg = v
			case map[string]any:
				if m, ok := v["mensaje"].(string); ok {
					msg = m
				}
			}
		}
		if len(msg) > 300 {
			msg = msg[:300]
		}
		codigo := "imagen_error"
		if resp.StatusCode == 429 {
			codigo = "cupo_agotado"
		}
		writeErr(w, resp.StatusCode, codigo, msg)
		return
	}
	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "image/jpeg"
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(200)
	_, _ = w.Write(datos)
}
