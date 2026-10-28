package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

// Cadena de Gemini para el LIVE (calificar prompts, transcribir audio). La cuota gratis de Google es por
// modelo: cuando uno responde 429 se pasa al siguiente y se le deja descansar un minuto. Los modelos se
// descubren con ListModels (GEMINI_API_KEY) y se guardan 30 min; GEMINI_MODELOS="a,b,c" fija la lista a mano.
// Se prueban hasta 8. Si Gemini no está o todos fallan, el que llama decide (las reglas fijas no dependen de esto).

const geminiMaxModelos = 8

// preferencia (medida el 28-10 con thinkingLevel «low»): primero los ligeros, luego flash, gemma y pro al final.
// Los 2.5 salen en ListModels pero responden 404 a claves nuevas: quedan al final y descansan 24 h.
var geminiPreferidos = []string{
	"gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.5-flash",
	"gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest", "gemma-4-31b-it", "gemma-4-26b-a4b-it",
	"gemini-3.1-flash-lite-preview", "gemini-2.5-flash-lite", "gemini-2.5-flash",
}

// lo que no sirve para texto→JSON: voz, imagen, música, agentes, robótica…
var geminiDescartar = []string{"tts", "image", "lyria", "robotics", "computer-use", "deep-research", "antigravity",
	"customtools", "nano-banana", "transcribe", "omni", "embedding", "aqa", "veo", "imagen", "argon", "live", "audio"}

var geminiEstado = struct {
	sync.Mutex
	lista     []string
	listaHora time.Time
	descanso  map[string]time.Time // modelo → hasta cuándo no se usa (429 / 5xx)
}{descanso: map[string]time.Time{}}

func geminiClave() string { return strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) }

// geminiCadena devuelve los modelos a probar, en orden, sin los que están descansando.
func geminiCadena(ctx context.Context, conAudio bool) []string {
	geminiEstado.Lock()
	lista, hora := geminiEstado.lista, geminiEstado.listaHora
	geminiEstado.Unlock()
	if fijos := strings.TrimSpace(os.Getenv("GEMINI_MODELOS")); fijos != "" {
		lista = nil
		for _, m := range strings.Split(fijos, ",") {
			if m = strings.TrimSpace(m); m != "" {
				lista = append(lista, m)
			}
		}
	} else if lista == nil || time.Since(hora) > 30*time.Minute {
		if l, err := geminiDescubrir(ctx); err == nil && len(l) > 0 {
			lista = l
			geminiEstado.Lock()
			geminiEstado.lista, geminiEstado.listaHora = l, time.Now()
			geminiEstado.Unlock()
		} else if lista == nil {
			lista = geminiPreferidos[:geminiMaxModelos]
		}
	}
	ahora := time.Now()
	var fuera, dentro []string
	geminiEstado.Lock()
	for _, m := range lista {
		if conAudio && strings.HasPrefix(m, "gemma") {
			continue // gemma no oye audio
		}
		if t, ok := geminiEstado.descanso[m]; ok && ahora.Before(t) {
			fuera = append(fuera, m)
			continue
		}
		dentro = append(dentro, m)
	}
	geminiEstado.Unlock()
	if len(dentro) == 0 {
		dentro = fuera // todos descansando: se reintenta igual, en el mismo orden
	}
	if len(dentro) > geminiMaxModelos {
		dentro = dentro[:geminiMaxModelos]
	}
	return dentro
}

// geminiDescubrir pide la lista de modelos de la clave y la ordena por preferencia.
func geminiDescubrir(ctx context.Context) ([]string, error) {
	key := geminiClave()
	if key == "" {
		return nil, errors.New("sin GEMINI_API_KEY")
	}
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", nil)
	req.Header.Set("x-goog-api-key", key)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var out struct {
		Models []struct {
			Name    string   `json:"name"`
			Metodos []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("ListModels: %s", resp.Status)
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(&out); err != nil {
		return nil, err
	}
	var todos []string
	for _, m := range out.Models {
		nombre := strings.TrimPrefix(m.Name, "models/")
		sirve := false
		for _, x := range m.Metodos {
			sirve = sirve || x == "generateContent"
		}
		if !sirve || !(strings.HasPrefix(nombre, "gemini-") || strings.HasPrefix(nombre, "gemma-")) {
			continue
		}
		malo := false
		for _, d := range geminiDescartar {
			malo = malo || strings.Contains(nombre, d)
		}
		if !malo {
			todos = append(todos, nombre)
		}
	}
	rango := func(n string) int {
		for i, p := range geminiPreferidos {
			if n == p {
				return i
			}
		}
		switch {
		case strings.Contains(n, "flash-lite"):
			return 100
		case strings.Contains(n, "flash"):
			return 200
		case strings.HasPrefix(n, "gemma"):
			return 300
		}
		return 400 // pro y lo demás: lentos o con poco cupo
	}
	sort.SliceStable(todos, func(i, j int) bool { return rango(todos[i]) < rango(todos[j]) })
	if len(todos) > geminiMaxModelos {
		todos = todos[:geminiMaxModelos]
	}
	return todos, nil
}

// geminiParte es una parte del mensaje: texto o audio en base64.
type geminiParte struct {
	Texto string
	Audio string // WAV en base64
}

// geminiJSON manda el pedido a la cadena y devuelve el JSON del primer modelo que responde bien.
func geminiJSON(ctx context.Context, sistema string, partes []geminiParte, maxTokens int) (map[string]any, string, error) {
	key := geminiClave()
	if key == "" {
		return nil, "", errors.New("el servidor no tiene GEMINI_API_KEY")
	}
	conAudio := false
	for _, p := range partes {
		conAudio = conAudio || p.Audio != ""
	}
	cadena := geminiCadena(ctx, conAudio)
	var ultimo error = errors.New("no hay modelos de Gemini disponibles")
	for _, modelo := range cadena {
		if ctx.Err() != nil {
			break
		}
		out, err := geminiUno(ctx, key, modelo, sistema, partes, maxTokens)
		if err == nil {
			return out, modelo, nil
		}
		ultimo = fmt.Errorf("%s: %w", modelo, err)
		var ge *geminiErr
		if errors.As(err, &ge) {
			pausa := time.Duration(0)
			switch {
			case ge.codigo == 404: // listado pero «no longer available to new users»
				pausa = 24 * time.Hour
			case ge.codigo == 429 || ge.codigo >= 500:
				pausa = time.Minute
			case ge.codigo == 400:
				pausa = 10 * time.Minute
			}
			if pausa > 0 {
				geminiEstado.Lock()
				geminiEstado.descanso[modelo] = time.Now().Add(pausa)
				geminiEstado.Unlock()
			}
		}
	}
	return nil, "", ultimo
}

type geminiErr struct {
	codigo int
	msg    string
}

func (e *geminiErr) Error() string { return fmt.Sprintf("HTTP %d %s", e.codigo, e.msg) }

func geminiUno(ctx context.Context, key, modelo, sistema string, partes []geminiParte, maxTokens int) (map[string]any, error) {
	gemma := strings.HasPrefix(modelo, "gemma")
	var ps []map[string]any
	if gemma {
		// gemma no acepta system_instruction ni modo JSON: las instrucciones van en el mismo mensaje
		ps = append(ps, map[string]any{"text": sistema + "\n\nResponde SOLO el objeto JSON, sin ``` ni texto alrededor."})
	}
	for _, p := range partes {
		if p.Audio != "" {
			ps = append(ps, map[string]any{"inline_data": map[string]string{"mime_type": "audio/wav", "data": p.Audio}})
		} else {
			ps = append(ps, map[string]any{"text": p.Texto})
		}
	}
	gen := map[string]any{"temperature": 0.3, "maxOutputTokens": maxTokens}
	cuerpo := map[string]any{"contents": []map[string]any{{"role": "user", "parts": ps}}, "generationConfig": gen}
	if !gemma && !strings.HasPrefix(modelo, "gemini-2") {
		// medido el 28-10: sin esto gemini-flash-lite-latest tarda 12-15 s; con «low», 1-7 s
		gen["thinkingConfig"] = map[string]string{"thinkingLevel": "low"}
	}
	if !gemma {
		gen["responseMimeType"] = "application/json"
		cuerpo["system_instruction"] = map[string]any{"parts": []map[string]string{{"text": sistema}}}
	}
	b, _ := json.Marshal(cuerpo)
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://generativelanguage.googleapis.com/v1beta/models/"+modelo+":generateContent", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", key)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, &geminiErr{codigo: 599, msg: "sin respuesta"}
	}
	defer resp.Body.Close()
	datos, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var out struct {
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text    string `json:"text"`
					Thought bool   `json:"thought"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	_ = json.Unmarshal(datos, &out)
	if resp.StatusCode != 200 {
		msg := resp.Status
		if out.Error != nil {
			msg = out.Error.Message
		}
		if len(msg) > 160 {
			msg = msg[:160]
		}
		return nil, &geminiErr{codigo: resp.StatusCode, msg: msg}
	}
	txt := ""
	for _, c := range out.Candidates {
		for _, p := range c.Content.Parts {
			if !p.Thought {
				txt += p.Text
			}
		}
		break
	}
	if i, j := strings.Index(txt, "{"), strings.LastIndex(txt, "}"); i >= 0 && j > i {
		txt = txt[i : j+1]
	}
	var m map[string]any
	if json.Unmarshal([]byte(txt), &m) != nil {
		return nil, &geminiErr{codigo: 502, msg: "no devolvió JSON"}
	}
	return m, nil
}
