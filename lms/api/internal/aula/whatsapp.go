package aula

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// EstadoWhatsApp es lo que el LIVE muestra del WhatsApp del alumno (sesión 3 del G5): si su instancia de
// Evolution Go está vinculada y, si no, el QR para escanear. Lo pide el LMS con el token del alumno: el
// alumno no corre «aula whatsapp» ni ve ningún token.
type EstadoWhatsApp struct {
	Conectado bool   `json:"conectado"`
	Vinculado bool   `json:"vinculado"`
	Nombre    string `json:"nombre,omitempty"`
	QR        string `json:"qr,omitempty"` // data:image/png;base64,… (solo sin vincular)
	QRHora    string `json:"qr_hora,omitempty"`
}

// ErrSinWhatsApp: el LMS no tiene Evolution Go configurado.
var ErrSinWhatsApp = errors.New("este servidor no tiene WhatsApp para la clase")

// el QR se pide como mucho cada 15 s por alumno: pedirlo de más reinicia el emparejamiento en el fork
var ultimoQR = struct {
	sync.Mutex
	m map[string]EstadoWhatsApp
	t map[string]time.Time
}{m: map[string]EstadoWhatsApp{}, t: map[string]time.Time{}}

func (c *Clase) evo(ctx context.Context, metodo, ruta, token string, cuerpo any, espera time.Duration) (map[string]any, error) {
	var r io.Reader
	if cuerpo != nil {
		b, _ := json.Marshal(cuerpo)
		r = bytes.NewReader(b)
	}
	ctx, cancel := context.WithTimeout(ctx, espera)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, metodo, strings.TrimRight(c.EvoURL, "/")+ruta, r)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", token)
	req.Header.Set("Content-Type", "application/json")
	res, err := (&http.Client{Timeout: espera}).Do(req)
	if err != nil {
		return nil, fmt.Errorf("Evolution Go no responde: %w", err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if res.StatusCode/100 != 2 {
		return nil, fmt.Errorf("Evolution Go respondió %d: %.160s", res.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	return out, nil
}

// WhatsApp crea la instancia si falta, deja guardado el webhook (POST /instance/connect, como «aula whatsapp»)
// y devuelve el estado; con conQR y sin vincular, también el QR.
func (a *Aula) WhatsApp(ctx context.Context, userID string, conQR bool) (EstadoWhatsApp, error) {
	c := a.Clase
	if !c.EvoActivo() {
		return EstadoWhatsApp{}, ErrSinWhatsApp
	}
	if err := c.asegurarInstancia(ctx, userID); err != nil {
		return EstadoWhatsApp{}, err
	}
	tok := c.EvoToken(userID)
	st, err := c.evo(ctx, http.MethodGet, "/instance/status", tok, nil, 10*time.Second)
	if err != nil {
		return EstadoWhatsApp{}, err
	}
	d, _ := st["data"].(map[string]any)
	e := EstadoWhatsApp{}
	e.Conectado, _ = d["Connected"].(bool)
	e.Vinculado, _ = d["LoggedIn"].(bool)
	e.Nombre, _ = d["Name"].(string)
	// connect guarda el webhook; con la sesión ya corriendo solo actualiza la configuración
	if _, err := c.evo(ctx, http.MethodPost, "/instance/connect", tok,
		map[string]any{"webhookUrl": Webhook(userID), "subscribe": []string{"MESSAGE"}}, 15*time.Second); err != nil {
		return e, err
	}
	if e.Vinculado || !conQR {
		return e, nil
	}
	ultimoQR.Lock()
	previo, hace := ultimoQR.m[userID], time.Since(ultimoQR.t[userID])
	ultimoQR.Unlock()
	if previo.QR != "" && hace < 15*time.Second {
		e.QR, e.QRHora = previo.QR, previo.QRHora
		return e, nil
	}
	q, err := c.evo(ctx, http.MethodGet, "/instance/qr", tok, nil, 30*time.Second)
	if err != nil {
		return e, err
	}
	qd, _ := q["data"].(map[string]any)
	if png, _ := qd["qrcode"].(string); strings.HasPrefix(png, "data:image") {
		e.QR, e.QRHora = png, time.Now().UTC().Format(time.RFC3339)
		ultimoQR.Lock()
		ultimoQR.m[userID], ultimoQR.t[userID] = e, time.Now()
		ultimoQR.Unlock()
	}
	return e, nil
}
