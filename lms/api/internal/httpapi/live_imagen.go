package httpapi

import (
	"bytes"
	"context"
	"encoding/base64"
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
		Base        string `json:"base"`      // data:image/…;base64,… de la imagen base; con ella la variación la hace OpenRouter
		Cambio      string `json:"cambio"`    // lo único que debe cambiar respecto a la base (en español)
		ConTexto    bool   `json:"con_texto"` // el cambio es escribir este texto sobre la base (flyer terminado)
	}
	// la imagen base en base64 pasa del límite general de readJSON
	r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, 400, "cuerpo_invalido", "no se pudo leer el pedido (¿imagen base de más de 8 MB?)")
		return
	}
	in.Prompt = strings.TrimSpace(in.Prompt)
	if in.Prompt == "" || len(in.Prompt) > 1000 {
		writeErr(w, 400, "prompt_invalido", "el prompt no puede estar vacío ni pasar de 1000 caracteres")
		return
	}
	if in.Base != "" {
		s.liveImagenVariacion(w, r, p, in.Base, in.Cambio, in.Prompt, in.ConTexto)
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

// liveImagenVariacion: la variación se hace SOBRE la imagen base con un modelo de edición de imágenes vía
// OpenRouter (OPENROUTER_API_KEY; modelo LMS_IMAGEN_MODELO, por defecto google/gemini-2.5-flash-image).
// Así el personaje, el encuadre y el estilo se conservan y cambia solo lo pedido. Devuelve image/png.
func (s *Server) liveImagenVariacion(w http.ResponseWriter, r *http.Request, p *Principal, base, cambio, prompt string, conTexto bool) {
	key := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY"))
	if key == "" {
		writeErr(w, 503, "sin_openrouter", "el servidor no tiene OPENROUTER_API_KEY: la variación con imagen base no está disponible")
		return
	}
	if !strings.HasPrefix(base, "data:image/") || len(base) > 8<<20 {
		writeErr(w, 400, "base_invalida", "la imagen base debe venir como data:image/…;base64 y pesar menos de 8 MB")
		return
	}
	modelo := os.Getenv("LMS_IMAGEN_MODELO")
	if modelo == "" {
		modelo = "google/gemini-2.5-flash-image"
	}
	cambio = strings.TrimSpace(cambio)
	if len(cambio) > 400 {
		cambio = cambio[:400]
	}
	instr := "Edita esta imagen. Conserva exactamente el mismo personaje (o sujeto), su diseño, proporciones, encuadre, estilo de dibujo y paleta. " +
		"Cambia solo esto: " + cambio + ". No agregues texto ni letras. Devuelve una sola imagen con la misma orientación."
	if conTexto && cambio != "" {
		instr = "Convierte esta imagen en un flyer terminado. Conserva el fondo, su estilo, su composición y su paleta. " +
			"Escribe encima, en español y con la ortografía exacta (respeta tildes, mayúsculas, signos y números), solo este texto: " + cambio + ". " +
			"Letras grandes y legibles, con buen contraste sobre el fondo y jerarquía clara: título arriba y grande, precio destacado. " +
			"No inventes otras palabras, ni marcas, ni textos de relleno. Devuelve una sola imagen vertical."
	} else if cambio == "" {
		instr = "Vuelve a dibujar esta imagen conservando el personaje, el encuadre y el estilo, siguiendo esta descripción: " + prompt + ". No agregues texto ni letras."
	}
	cuerpo, _ := json.Marshal(map[string]any{
		"model":      modelo,
		"modalities": []string{"image", "text"},
		"messages": []map[string]any{{
			"role": "user",
			"content": []map[string]any{
				{"type": "text", "text": instr},
				{"type": "image_url", "image_url": map[string]string{"url": base}},
			},
		}},
	})
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(cuerpo))
	if err != nil {
		internal(w, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("HTTP-Referer", "https://jmd-learn.online")
	req.Header.Set("X-Title", "JMD LMS · LIVE")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, 503, "openrouter_no_responde", "OpenRouter no respondió: "+err.Error())
		return
	}
	defer resp.Body.Close()
	datos, _ := io.ReadAll(io.LimitReader(resp.Body, 24<<20))
	var out struct {
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
		Choices []struct {
			Message struct {
				Content string `json:"content"`
				Images  []struct {
					ImageURL struct {
						URL string `json:"url"`
					} `json:"image_url"`
				} `json:"images"`
			} `json:"message"`
		} `json:"choices"`
	}
	_ = json.Unmarshal(datos, &out)
	if resp.StatusCode != 200 || out.Error != nil {
		msg := "OpenRouter devolvió " + resp.Status
		if out.Error != nil && out.Error.Message != "" {
			msg = out.Error.Message
		}
		if len(msg) > 300 {
			msg = msg[:300]
		}
		codigo := "openrouter_error"
		if resp.StatusCode == 402 {
			codigo = "sin_saldo"
		}
		writeErr(w, 502, codigo, msg)
		return
	}
	if len(out.Choices) == 0 || len(out.Choices[0].Message.Images) == 0 {
		txt := ""
		if len(out.Choices) > 0 {
			txt = strings.TrimSpace(out.Choices[0].Message.Content)
		}
		if len(txt) > 200 {
			txt = txt[:200]
		}
		writeErr(w, 502, "sin_imagen", "el modelo no devolvió imagen"+map[bool]string{true: ": " + txt, false: ""}[txt != ""])
		return
	}
	url := out.Choices[0].Message.Images[0].ImageURL.URL
	coma := strings.Index(url, ",")
	if !strings.HasPrefix(url, "data:image/") || coma < 0 {
		writeErr(w, 502, "imagen_rara", "el modelo devolvió una imagen en un formato inesperado")
		return
	}
	ct := strings.TrimSuffix(strings.TrimPrefix(url[:coma], "data:"), ";base64")
	bin, err := base64.StdEncoding.DecodeString(url[coma+1:])
	if err != nil {
		writeErr(w, 502, "imagen_rara", "no se pudo decodificar la imagen")
		return
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Motor", modelo)
	w.WriteHeader(200)
	_, _ = w.Write(bin)
}
