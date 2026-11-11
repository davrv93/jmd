package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Asistente entrenado con embeddings (G8 clase 3, «Ponte al día»): el alumno escribe sus preguntas y respuestas
// (o sube un Excel), el LMS las convierte en vectores con Workers AI (bge-m3, multilingüe) y luego redacta la
// respuesta SOLO con los fragmentos más parecidos. Usa la cuenta de Cloudflare del LMS (la de los sprites):
// el alumno no necesita ninguna clave.

const (
	modeloEmbeddings = "@cf/baai/bge-m3"
	modeloRespuesta  = "@cf/meta/llama-3.1-8b-instruct-fast"
	maxTextosLote    = 96
	maxLargoTexto    = 1500
)

// topes por alumno y por hora: embeddings (lotes) y respuestas
var topeIA = struct {
	sync.Mutex
	m map[string][]time.Time
}{m: map[string][]time.Time{}}

func dentroDelTope(clave string, max int) bool {
	topeIA.Lock()
	defer topeIA.Unlock()
	hace := time.Now().Add(-time.Hour)
	l := topeIA.m[clave][:0:0]
	for _, t := range topeIA.m[clave] {
		if t.After(hace) {
			l = append(l, t)
		}
	}
	if len(l) >= max {
		topeIA.m[clave] = l
		return false
	}
	topeIA.m[clave] = append(l, time.Now())
	return true
}

// cfJSON llama a un modelo de Workers AI con cuerpo JSON y devuelve «result».
func cfJSON(ctx context.Context, modelo string, cuerpo any) (json.RawMessage, error) {
	base := spriteBase()
	if base == "" || cfToken() == "" {
		return nil, errSinCF
	}
	b, _ := json.Marshal(cuerpo)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+modelo, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cfToken())
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	datos, _ := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	var out struct {
		Result json.RawMessage `json:"result"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	_ = json.Unmarshal(datos, &out)
	if resp.StatusCode != 200 || len(out.Result) == 0 {
		msg := resp.Status
		if len(out.Errors) > 0 {
			msg = out.Errors[0].Message
		}
		return nil, fmt.Errorf("Workers AI: %.200s", msg)
	}
	return out.Result, nil
}

var errSinCF = fmt.Errorf("el servidor no tiene Cloudflare Workers AI configurado")

// liveEmbeddings: POST /api/v1/live/{lesson}/embeddings {"textos":[…]} → {"vectores":[[…]], "modelo", "dim"}.
func (s *Server) liveEmbeddings(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Textos []string `json:"textos"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if len(in.Textos) == 0 || len(in.Textos) > maxTextosLote {
		writeErr(w, 422, "textos", fmt.Sprintf("Manda entre 1 y %d textos por vez.", maxTextosLote))
		return
	}
	for i, t := range in.Textos {
		t = strings.TrimSpace(t)
		if t == "" {
			t = "(vacío)"
		}
		if r := []rune(t); len(r) > maxLargoTexto {
			t = string(r[:maxLargoTexto])
		}
		in.Textos[i] = t
	}
	if !dentroDelTope("emb:"+p.ID, 120) {
		writeErr(w, 429, "tope", "Llegaste al tope de entrenamientos de esta hora. Espera unos minutos.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	res, err := cfJSON(ctx, modeloEmbeddings, map[string]any{"text": in.Textos})
	if err == errSinCF {
		writeErr(w, 503, "sin_servicio", err.Error())
		return
	}
	if err != nil {
		writeErr(w, 502, "embeddings_error", err.Error())
		return
	}
	var out struct {
		Data [][]float64 `json:"data"`
	}
	if json.Unmarshal(res, &out) != nil || len(out.Data) != len(in.Textos) {
		writeErr(w, 502, "embeddings_error", "Workers AI devolvió un formato inesperado")
		return
	}
	dim := 0
	if len(out.Data) > 0 {
		dim = len(out.Data[0])
	}
	writeJSON(w, 200, map[string]any{"vectores": out.Data, "modelo": modeloEmbeddings, "dim": dim})
}

// liveResponder: POST /api/v1/live/{lesson}/responder {"pregunta","negocio","fragmentos":[{pregunta,respuesta}]}.
func (s *Server) liveResponder(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Pregunta   string `json:"pregunta"`
		Negocio    string `json:"negocio"`
		Fragmentos []struct {
			Pregunta  string `json:"pregunta"`
			Respuesta string `json:"respuesta"`
		} `json:"fragmentos"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Pregunta = strings.TrimSpace(in.Pregunta)
	if in.Pregunta == "" || len([]rune(in.Pregunta)) > 600 {
		writeErr(w, 422, "pregunta", "Escribe una pregunta de hasta 600 caracteres.")
		return
	}
	if len(in.Fragmentos) > 5 {
		in.Fragmentos = in.Fragmentos[:5]
	}
	if !dentroDelTope("resp:"+p.ID, 200) {
		writeErr(w, 429, "tope", "Llegaste al tope de preguntas de esta hora. Espera unos minutos.")
		return
	}
	corta := func(s string, n int) string {
		if r := []rune(strings.TrimSpace(s)); len(r) > n {
			return string(r[:n])
		}
		return strings.TrimSpace(s)
	}
	var datos strings.Builder
	for i, f := range in.Fragmentos {
		fmt.Fprintf(&datos, "[%d] P: %s\nR: %s\n", i+1, corta(f.Pregunta, 400), corta(f.Respuesta, 1200))
	}
	negocio := corta(in.Negocio, 120)
	if negocio == "" {
		negocio = "el negocio"
	}
	sistema := "Eres el asistente virtual de " + negocio + ". Respondes en español, breve (máximo 3 oraciones), amable y claro. " +
		"Usa SOLO la información de DATOS. Si la respuesta no está en DATOS, di que no tienes ese dato y sugiere escribir al negocio. " +
		"No inventes precios, horarios, direcciones ni productos. No menciones la palabra DATOS ni los números de fragmento."
	usuario := "DATOS:\n" + datos.String() + "\nPregunta del cliente: " + in.Pregunta
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	res, err := cfJSON(ctx, modeloRespuesta, map[string]any{
		"messages":    []map[string]string{{"role": "system", "content": sistema}, {"role": "user", "content": usuario}},
		"max_tokens":  300,
		"temperature": 0.2,
	})
	if err == errSinCF {
		writeErr(w, 503, "sin_servicio", err.Error())
		return
	}
	if err != nil {
		writeErr(w, 502, "respuesta_error", err.Error())
		return
	}
	var out struct {
		Response string `json:"response"`
	}
	if json.Unmarshal(res, &out) != nil || strings.TrimSpace(out.Response) == "" {
		writeErr(w, 502, "respuesta_error", "Workers AI no devolvió texto")
		return
	}
	writeJSON(w, 200, map[string]any{"respuesta": strings.TrimSpace(out.Response), "modelo": modeloRespuesta})
}
