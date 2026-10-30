package httpapi

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// Trabajos efímeros: privados por alumno y lección; expiran en dos horas o al reiniciar.
// No se reintenta automáticamente un pedido cobrado. Máximo tres intentos por día y alumno.
type musicaTrabajo struct {
	ID, Alumno, Leccion, Estado, Mensaje string
	Creado                               time.Time
	Audio                                []byte
}

var musicaLive = struct {
	sync.Mutex
	trabajos map[string]*musicaTrabajo
	intentos map[string]int
	dia      string
}{trabajos: make(map[string]*musicaTrabajo), intentos: make(map[string]int)}

const musicaModelo = "google/lyria-3-clip-preview"
const musicaMaxAudio = 8 << 20

func (s *Server) liveMusicaCrear(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	if r.PathValue("lesson") != "de-02" {
		notFound(w, "la actividad")
		return
	}
	var in struct {
		Prompt string `json:"prompt"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Prompt = strings.TrimSpace(in.Prompt)
	if len(in.Prompt) < 10 || len(in.Prompt) > 2000 {
		writeErr(w, 400, "prompt_invalido", "Describe la música en entre 10 y 2000 caracteres.")
		return
	}
	key := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY"))
	if key == "" {
		writeErr(w, 503, "musica_no_configurada", "La generación musical todavía no está configurada en el servidor.")
		return
	}
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		internal(w, err)
		return
	}
	now := time.Now()
	lesson := r.PathValue("lesson")
	id := hex.EncodeToString(idBytes)
	musicaLive.Lock()
	day := now.UTC().Format("2006-01-02")
	if day != musicaLive.dia {
		musicaLive.dia = day
		musicaLive.intentos = make(map[string]int)
	}
	for k, j := range musicaLive.trabajos {
		if now.Sub(j.Creado) > 2*time.Hour {
			delete(musicaLive.trabajos, k)
		}
	}
	for _, j := range musicaLive.trabajos {
		if j.Alumno == p.ID && j.Leccion == lesson && j.Estado == "generando" {
			musicaLive.Unlock()
			writeJSON(w, 202, map[string]string{"id": j.ID, "estado": "generando"})
			return
		}
	}
	if musicaLive.intentos[p.ID] >= 3 {
		musicaLive.Unlock()
		writeErr(w, 429, "limite_musica", "Ya usaste tus tres intentos de música de hoy.")
		return
	}
	if len(musicaLive.trabajos) >= 60 {
		musicaLive.Unlock()
		writeErr(w, 503, "musica_ocupada", "La sala de música está ocupada. Intenta más tarde.")
		return
	}
	j := &musicaTrabajo{ID: id, Alumno: p.ID, Leccion: lesson, Estado: "generando", Creado: now}
	musicaLive.trabajos[id] = j
	musicaLive.intentos[p.ID]++
	musicaLive.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
		defer cancel()
		audio, err := generarMusica(ctx, http.DefaultClient, key, in.Prompt)
		musicaLive.Lock()
		defer musicaLive.Unlock()
		if err != nil {
			j.Estado = "error"
			j.Mensaje = "No se pudo generar la pista. Revisa el saldo o la disponibilidad de Lyria y vuelve a intentar."
			return
		}
		j.Audio = audio
		j.Estado = "listo"
	}()
	writeJSON(w, 202, map[string]string{"id": id, "estado": "generando"})
}

func (s *Server) liveMusicaEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	musicaLive.Lock()
	j := musicaLive.trabajos[r.PathValue("id")]
	if j == nil || j.Alumno != p.ID || j.Leccion != r.PathValue("lesson") || time.Since(j.Creado) > 2*time.Hour {
		musicaLive.Unlock()
		notFound(w, "la pista (puede haber expirado)")
		return
	}
	out := map[string]string{"id": j.ID, "estado": j.Estado, "mensaje": j.Mensaje, "modelo": musicaModelo}
	musicaLive.Unlock()
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, out)
}

func (s *Server) liveMusicaMP3(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	musicaLive.Lock()
	j := musicaLive.trabajos[r.PathValue("id")]
	if j == nil || j.Alumno != p.ID || j.Leccion != r.PathValue("lesson") || j.Estado != "listo" || time.Since(j.Creado) > 2*time.Hour {
		musicaLive.Unlock()
		notFound(w, "la pista")
		return
	}
	audio := j.Audio
	created := j.Creado
	musicaLive.Unlock()
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.URL.Query().Get("descargar") == "1" {
		w.Header().Set("Content-Disposition", `attachment; filename="mi-musica-lyria.mp3"`)
	}
	http.ServeContent(w, r, "mi-musica-lyria.mp3", created, bytes.NewReader(audio))
}

// OpenRouter exige stream=true: se reúnen los delta.audio.data (base64) en el servidor.
// El navegador solo consulta trabajos locales y recibe audio del mismo origen.
func generarMusica(ctx context.Context, client *http.Client, key, prompt string) ([]byte, error) {
	body, _ := json.Marshal(map[string]any{"model": musicaModelo, "modalities": []string{"text", "audio"}, "audio": map[string]string{"format": "mp3"}, "stream": true, "messages": []map[string]string{{"role": "user", "content": prompt}}})
	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("HTTP-Referer", "https://jmd-learn.online")
	req.Header.Set("X-Title", "JMD LMS · música Lyria")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, errors.New("proveedor musical no disponible")
	}
	return leerMusicaSSE(resp.Body)
}
func leerMusicaSSE(reader io.Reader) ([]byte, error) {
	scanner := bufio.NewScanner(io.LimitReader(reader, 24<<20))
	scanner.Buffer(make([]byte, 64<<10), 12<<20)
	var encoded strings.Builder
	done := false
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			done = true
			break
		}
		var chunk struct {
			Error   json.RawMessage `json:"error"`
			Choices []struct {
				Delta struct {
					Audio struct {
						Data string `json:"data"`
					} `json:"audio"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			return nil, errors.New("respuesta musical inválida")
		}
		if len(chunk.Error) > 0 && string(chunk.Error) != "null" {
			return nil, errors.New("error de generación musical")
		}
		for _, c := range chunk.Choices {
			encoded.WriteString(c.Delta.Audio.Data)
			if encoded.Len() > musicaMaxAudio*4/3+4 {
				return nil, errors.New("pista demasiado grande")
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	if !done {
		return nil, errors.New("pista interrumpida")
	}
	audio, err := base64.StdEncoding.DecodeString(encoded.String())
	if err != nil {
		return nil, err
	}
	if len(audio) < 128 || len(audio) > musicaMaxAudio || !(bytes.HasPrefix(audio, []byte("ID3")) || (audio[0] == 0xff && audio[1]&0xe0 == 0xe0)) {
		return nil, errors.New("el proveedor no devolvió un MP3 válido")
	}
	return audio, nil
}
