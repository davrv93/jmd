package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type genReq struct {
	Prompt string `json:"prompt"`
}

// skillBrief resume la skill «landing-editorial» para el modelo. Es el «system» de la generación.
const skillBrief = `Eres el sistema «landing-editorial»: produces UNA página index.html completa,
de una sola pieza, sin build, sin frameworks y sin librerías externas (salvo la fuente Inter de
Google Fonts y animaciones con JS vanilla). Estética editorial tipo Apple sobre papel blanco.

Reglas que NO se negocian:
- Paleta corta: blanco #ffffff, tinta #0a0a0b, grises #6b6b70 y #a1a1a6, línea #e7e7ea y UN solo
  color de marca con su degradado (elígelo según el rubro del brief).
- Titulares en Inter 600-700, letter-spacing -.045em, line-height .9-1. Lectura en gris,
  1-1.25rem, max-width 30-36rem.
- Una sola curva para todo: cubic-bezier(.16,1,.3,1).
- Todo tamaño con clamp(); márgenes laterales con var(--margen).
- Se animan solo transform, opacity, filter y clip-path; un único requestAnimationFrame.
- prefers-reduced-motion deja todo legible; sin JavaScript también.
- Estructura: nav de vidrio, portada centrada (titular de 3-5 palabras, remate con el degradado),
  sección «del problema a la solución», bento de servicios, cifras, método en pasos y cierre con
  llamada a la acción.
- Lenguaje llano y concreto; usa los datos del brief, no inventes teléfonos ni testimonios.

Devuelve SOLO el documento HTML completo (desde <!doctype html> hasta </html>), sin explicaciones
y sin vallas de código.`

// generate: POST /api/v1/generate {prompt} → {html}. Llama a un endpoint OpenAI-compatible
// (el gateway de la clase). Si no está configurado, responde 503.
func (s *Server) generate(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.LLM.URL == "" {
		writeErr(w, 503, "unavailable", "el gateway de IA no está configurado en este servidor")
		return
	}
	var in genReq
	if !readJSON(w, r, &in) {
		return
	}
	in.Prompt = strings.TrimSpace(in.Prompt)
	if len(in.Prompt) < 4 {
		badRequest(w, "escribe un prompt para la landing")
		return
	}
	if len(in.Prompt) > 8000 {
		badRequest(w, "el prompt es demasiado largo (máx. 8000 caracteres)")
		return
	}
	if s.runLimit == nil || !s.runLimit.allow("gen:"+p.ID) {
		writeErr(w, 429, "rate_limited", "demasiadas generaciones seguidas, espera un momento")
		return
	}
	html, err := s.llamarLLM(r.Context(), in.Prompt)
	if err != nil {
		writeErr(w, 502, "upstream", "el gateway falló: "+err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"html": html})
}

type chatMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func (s *Server) llamarLLM(ctx context.Context, prompt string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	body, _ := json.Marshal(map[string]any{
		"model":       s.LLM.Model,
		"temperature": 0.4,
		"max_tokens":  8000,
		"messages": []chatMsg{
			{Role: "system", Content: skillBrief},
			{Role: "user", Content: prompt},
		},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.LLM.URL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.LLM.Key != "" {
		req.Header.Set("Authorization", "Bearer "+s.LLM.Key)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("respondió %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", errors.New("respuesta con formato inesperado")
	}
	if len(out.Choices) == 0 {
		return "", errors.New("sin respuesta del modelo")
	}
	html := extraerHTML(out.Choices[0].Message.Content)
	if html == "" {
		return "", errors.New("el modelo devolvió una respuesta vacía")
	}
	return html, nil
}

// extraerHTML quita las vallas ```html ... ``` si el modelo las puso.
func extraerHTML(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		if i := strings.IndexByte(s, '\n'); i >= 0 {
			s = s[i+1:]
		}
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	}
	return strings.TrimSpace(s)
}
