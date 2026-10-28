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

// liveAnalizar: POST /api/v1/live/{lesson}/analizar {"oido":"…","dicho":"…","audio":"<WAV en base64>"}.
// La escena de voz manda lo que entendió el reconocedor del navegador (oido), si el alumno la escribió,
// la frase que quiso decir (dicho) y, si lo grabó, el audio (respaldo cuando el navegador no reconoce voz;
// el modelo lo oye y transcribe). El LMS le pide a un modelo vía OpenRouter (OPENROUTER_API_KEY; modelo
// LMS_ANALISIS_MODELO, por defecto google/gemini-2.5-flash) que corrija la transcripción, señale qué palabras
// confundió, deduzca la intención y responda como Robo. Devuelve el JSON del modelo más "motor".
func (s *Server) liveAnalizar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Oido  string `json:"oido"`
		Dicho string `json:"dicho"`
		Audio string `json:"audio"`
	}
	// el audio (WAV de 16 kHz, hasta ~25 s) no cabe en el límite general de readJSON
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, 400, "cuerpo_invalido", "no se pudo leer el pedido (¿audio de más de 25 s?)")
		return
	}
	in.Oido, in.Dicho = strings.TrimSpace(in.Oido), strings.TrimSpace(in.Dicho)
	in.Audio = strings.TrimPrefix(in.Audio, "data:audio/wav;base64,")
	if (in.Oido == "" && in.Audio == "") || len(in.Oido) > 600 || len(in.Dicho) > 600 {
		writeErr(w, 400, "texto_invalido", "manda el texto dictado (hasta 600 caracteres) o el audio grabado")
		return
	}
	key := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY"))
	if key == "" {
		writeErr(w, 503, "sin_openrouter", "el servidor no tiene OPENROUTER_API_KEY: el análisis con IA no está disponible")
		return
	}
	modelo := os.Getenv("LMS_ANALISIS_MODELO")
	if modelo == "" {
		modelo = "google/gemini-2.5-flash"
	}
	sistema := "Eres Robo, el asistente de un negocio pequeño en Perú, y ayudas a alumnos a revisar el reconocimiento de voz. " +
		"Recibes lo que entendió el reconocedor del navegador y, a veces, lo que la persona quiso decir. " +
		"Responde SOLO un objeto JSON con estas claves: " +
		`"corregido" (la frase bien escrita en español, con tildes y signos), ` +
		`"errores" (lista de {"oyo","era","por_que"} con cada palabra que el reconocedor confundió; lista vacía si no hubo), ` +
		`"precision" (entero 0-100: qué tanto acertó el reconocedor), ` +
		`"intencion" (qué pide la persona, en pocas palabras), ` +
		`"respuesta" (lo que Robo le contestaría, una o dos frases cortas y amables; si falta un dato del negocio dilo sin inventarlo), ` +
		`"consejo" (un consejo corto para dictar mejor la próxima vez). ` +
		`Si recibes audio, agrega "transcripcion" (lo que tú oyes en el audio, palabra por palabra) y compara con lo que entendió el reconocedor; ` +
		`si no hubo reconocedor, toma tu transcripción como lo entendido. Sin texto fuera del JSON.`
	usuario := "Lo que entendió el reconocedor: «" + in.Oido + "»"
	if in.Oido == "" {
		usuario = "El reconocedor del navegador no entendió nada; solo hay audio."
	}
	if in.Dicho != "" {
		usuario += "\nLo que la persona quiso decir: «" + in.Dicho + "»"
	}
	contenido := []map[string]any{{"type": "text", "text": usuario}}
	if in.Audio != "" {
		contenido = append(contenido, map[string]any{"type": "input_audio", "input_audio": map[string]string{"data": in.Audio, "format": "wav"}})
	}
	cuerpo, _ := json.Marshal(map[string]any{
		"model":           modelo,
		"temperature":     0.2,
		"max_tokens":      600,
		"response_format": map[string]string{"type": "json_object"},
		"messages": []map[string]any{
			{"role": "system", "content": sistema},
			{"role": "user", "content": contenido},
		},
	})
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(cuerpo))
	if err != nil {
		internal(w, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("HTTP-Referer", "https://jmd-learn.online")
	req.Header.Set("X-Title", "JMD LMS · LIVE voz")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, 503, "openrouter_no_responde", "OpenRouter no respondió: "+err.Error())
		return
	}
	defer resp.Body.Close()
	datos, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var out struct {
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	_ = json.Unmarshal(datos, &out)
	if resp.StatusCode != 200 || out.Error != nil || len(out.Choices) == 0 {
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
	// algunos modelos envuelven el JSON en ```json … ```: se recorta al primer { y al último }
	txt := out.Choices[0].Message.Content
	if i, j := strings.Index(txt, "{"), strings.LastIndex(txt, "}"); i >= 0 && j > i {
		txt = txt[i : j+1]
	}
	var analisis map[string]any
	if json.Unmarshal([]byte(txt), &analisis) != nil {
		writeErr(w, 502, "respuesta_rara", "el modelo no devolvió un JSON válido")
		return
	}
	analisis["motor"] = modelo
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, analisis)
}
