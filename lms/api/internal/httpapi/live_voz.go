package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// liveVoz: POST /api/v1/live/{lesson}/voz {"texto"} → audio/wav. Texto a voz con Piper, en el servicio
// de imagen de la clase (IMAGEN_URL /voz, token de la clase, X-Alumno para el tope). Si falla, la escena
// usa la voz del navegador.
func (s *Server) liveVoz(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Texto string `json:"texto"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Texto = strings.TrimSpace(in.Texto)
	if in.Texto == "" || len([]rune(in.Texto)) > 700 {
		writeErr(w, 400, "texto_invalido", "escribe algo para leer (hasta 700 caracteres)")
		return
	}
	url := strings.TrimRight(os.Getenv("IMAGEN_URL"), "/")
	if url == "" {
		url = "http://imagen:8000"
	}
	cuerpo, _ := json.Marshal(map[string]string{"texto": in.Texto})
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url+"/voz", bytes.NewReader(cuerpo))
	if err != nil {
		internal(w, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("LMS_AULA_TOKEN"))
	req.Header.Set("X-Alumno", p.ID)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, 503, "voz_no_disponible", "la voz del servidor no responde: usa la del navegador")
		return
	}
	defer resp.Body.Close()
	datos, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if resp.StatusCode != 200 {
		writeErr(w, 503, "voz_no_disponible", "la voz del servidor no respondió ("+resp.Status+"): usa la del navegador")
		return
	}
	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(200)
	_, _ = w.Write(datos)
}

// liveTranscribir: POST /api/v1/live/{lesson}/transcribir {"audio":"<WAV base64>"} → {"texto","motor"}.
// Respaldo del dictado cuando el navegador no reconoce voz: Gemini oye el audio (cadena de modelos).
func (s *Server) liveTranscribir(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Audio string `json:"audio"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, 400, "cuerpo_invalido", "no se pudo leer el audio (¿más de 25 s?)")
		return
	}
	in.Audio = strings.TrimPrefix(strings.TrimSpace(in.Audio), "data:audio/wav;base64,")
	if in.Audio == "" {
		writeErr(w, 400, "sin_audio", "no llegó audio")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	out, modelo, err := geminiJSON(ctx,
		`Transcribe palabra por palabra lo que dice la persona en el audio (español de Perú), con tildes y signos. `+
			`Responde SOLO {"texto": "…"}. Si no se entiende nada, {"texto": ""}.`,
		[]geminiParte{{Texto: "Transcribe este audio."}, {Audio: in.Audio}}, 600)
	if err != nil {
		writeErr(w, 502, "sin_transcripcion", "no se pudo transcribir ahora; prueba otra vez o escribe el texto")
		return
	}
	texto, _ := out["texto"].(string)
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"texto": strings.TrimSpace(texto), "motor": modelo})
}

// WhatsAppMotor lo implementa *aula.Aula cuando el LMS tiene Evolution Go (perfil «clase»).
type WhatsAppMotor interface {
	WhatsApp(ctx context.Context, userID string, conQR bool) (aula.EstadoWhatsApp, error)
}

// liveWhatsApp: POST /api/v1/live/{lesson}/whatsapp {"qr":true} → estado de la instancia del alumno, el QR si
// no está vinculada y si su robot ya escucha en /api/webhook. Reemplaza a «aula whatsapp» en la sesión 3.
func (s *Server) liveWhatsApp(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil || !s.aulaListo(w) {
		return
	}
	wm, ok := s.Aula.(WhatsAppMotor)
	if !ok {
		writeErr(w, 503, "sin_whatsapp", "este servidor no tiene WhatsApp para la clase")
		return
	}
	var in struct {
		QR bool `json:"qr"`
	}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	if _, err := s.Aula.Crear(r.Context(), p.ID); err != nil {
		internal(w, err)
		return
	}
	tocarAula(p.ID)
	e, err := wm.WhatsApp(r.Context(), p.ID, in.QR)
	if errors.Is(err, aula.ErrSinWhatsApp) {
		writeErr(w, 503, "sin_whatsapp", err.Error())
		return
	}
	if err != nil {
		writeErr(w, 502, "evolution_error", err.Error())
		return
	}
	code, _ := s.Aula.Exec(r.Context(), aula.Nombre(p.ID),
		`curl -s -m 5 -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{}" http://127.0.0.1:8766/api/webhook || true`)
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"conectado": e.Conectado, "vinculado": e.Vinculado, "nombre": e.Nombre,
		"qr": e.QR, "qr_hora": e.QRHora, "robot_escucha": strings.TrimSpace(code) == "200"})
}
