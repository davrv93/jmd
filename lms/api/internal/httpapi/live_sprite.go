package httpapi

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Sprites del alumno: una mascota canónica y seis poses generadas a partir de ella.
//
//   POST /api/v1/live/{lesson}/sprite {"animal":"un zorro naranja","poses":["corriendo",…],"base":""}
//   → {"base":"data:image/jpeg;base64,…","poses":[…],"neuronas":728,"coste":0.008,"restantes":0}
//
// La primera llamada usa FLUX.1 schnell (~96 neuronas) para la mascota; cada pose usa FLUX.2 klein
// (~104 neuronas) con la mascota como imagen de referencia, que es lo que mantiene el personaje.
// Hay dos frenos: tope de poses por alumno y día, y tope de neuronas de toda la clase.
// El recorte y el anclaje NO se hacen aquí: los hace el navegador de la escena.

// neuronasPorImagen: medido contra la API real (cabecera cf-ai-neurons).
const (
	neuronasCanonica = 96.0
	neuronasPose     = 105.0
	precioNeurona    = 0.011 / 1000 // $ por neurona (Workers AI, plan de pago)
)

var spriteUso = struct {
	sync.Mutex
	porAlumno map[string]int     // alumno|día → poses usadas
	neuronas  map[string]float64 // día → neuronas gastadas
}{porAlumno: map[string]int{}, neuronas: map[string]float64{}}

func spriteDia() string { return time.Now().UTC().Format("2006-01-02") }

func spriteTope(alumno string, poses int) (restantes int, ok bool) {
	max := 6
	if v, err := strconv.Atoi(os.Getenv("SPRITE_POSES_POR_ALUMNO")); err == nil && v > 0 {
		max = v
	}
	dia := spriteDia()
	clave := alumno + "|" + dia
	spriteUso.Lock()
	defer spriteUso.Unlock()
	usadas := spriteUso.porAlumno[clave]
	if usadas+poses > max {
		return max - usadas, false
	}
	spriteUso.porAlumno[clave] = usadas + poses
	return max - usadas - poses, true
}

func spritePresupuesto(neuronas float64) bool {
	tope := 9000.0
	if v, err := strconv.ParseFloat(os.Getenv("SPRITE_NEURONAS_DIA"), 64); err == nil && v > 0 {
		tope = v
	}
	dia := spriteDia()
	spriteUso.Lock()
	defer spriteUso.Unlock()
	if spriteUso.neuronas[dia]+neuronas > tope {
		return false
	}
	spriteUso.neuronas[dia] += neuronas
	return true
}

func spriteBase() string {
	if u := strings.TrimRight(os.Getenv("SPRITE_BASE_URL"), "/"); u != "" {
		return u + "/"
	}
	cuenta := strings.TrimSpace(os.Getenv("CLOUDFLARE_ACCOUNT_ID"))
	if cuenta == "" {
		return ""
	}
	return "https://api.cloudflare.com/client/v4/accounts/" + cuenta + "/ai/run/"
}

func cfToken() string {
	if t := strings.TrimSpace(os.Getenv("CLOUDFLARE_TOKEN")); t != "" {
		return t
	}
	return strings.TrimSpace(os.Getenv("CF_API_TOKEN"))
}

// cfPedido hace la llamada a Workers AI y devuelve la imagen en data URI y las neuronas gastadas.
func cfPedido(ctx context.Context, modelo string, cuerpo io.Reader, tipo string) (string, float64, error) {
	base := spriteBase()
	if base == "" {
		return "", 0, fmt.Errorf("el servidor no tiene CLOUDFLARE_ACCOUNT_ID")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+modelo, cuerpo)
	if err != nil {
		return "", 0, err
	}
	req.Header.Set("Authorization", "Bearer "+cfToken())
	req.Header.Set("Content-Type", tipo)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()
	datos, _ := io.ReadAll(io.LimitReader(resp.Body, 24<<20))
	var out struct {
		Result struct {
			Image string `json:"image"`
		} `json:"result"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	_ = json.Unmarshal(datos, &out)
	if resp.StatusCode != 200 || out.Result.Image == "" {
		msg := "el modelo de imagen devolvió " + resp.Status
		if len(out.Errors) > 0 && out.Errors[0].Message != "" {
			msg = out.Errors[0].Message
		}
		if len(msg) > 240 {
			msg = msg[:240]
		}
		return "", 0, fmt.Errorf("%s", msg)
	}
	neuronas := 0.0
	if v := resp.Header.Get("cf-ai-neurons"); v != "" {
		neuronas, _ = strconv.ParseFloat(v, 64)
	}
	mime := "image/jpeg"
	if strings.HasPrefix(out.Result.Image, "iVBOR") { // PNG
		mime = "image/png"
	}
	return "data:" + mime + ";base64," + out.Result.Image, neuronas, nil
}

// cfCanonica: la mascota, texto a imagen (FLUX.1 schnell, 2 pasos).
func cfCanonica(ctx context.Context, animal string) (string, float64, error) {
	prompt := "A cute cartoon mascot for a landing page: " + animal + ". Full body, side view, " +
		"flat cel shading, thick clean outline, simple shapes. Pure solid green #00FF00 background, " +
		"no shadow, no ground, no scenery, no text."
	cuerpo, _ := json.Marshal(map[string]any{"prompt": prompt, "steps": 2})
	return cfPedido(ctx, "@cf/black-forest-labs/flux-1-schnell", bytes.NewReader(cuerpo), "application/json")
}

// cfPose: la misma mascota en otra pose, con la imagen canónica como referencia (FLUX.2 klein).
func cfPose(ctx context.Context, base, pose string) (string, float64, error) {
	bin, err := base64.StdEncoding.DecodeString(base[strings.Index(base, ",")+1:])
	if err != nil {
		return "", 0, fmt.Errorf("la imagen base no es base64 válido")
	}
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	prompt := "Redraw the exact same character of the reference image: same flat cel shading, same thick " +
		"clean outline, same proportions, same colours and details. Only change the pose: " + pose + ". " +
		"Side view, full body, pure solid green #00FF00 background, no shadow, no ground, no text."
	_ = mw.WriteField("prompt", prompt)
	fw, err := mw.CreateFormFile("input_image", "mascota.png")
	if err != nil {
		return "", 0, err
	}
	if _, err := fw.Write(bin); err != nil {
		return "", 0, err
	}
	if err := mw.Close(); err != nil {
		return "", 0, err
	}
	return cfPedido(ctx, "@cf/black-forest-labs/flux-2-klein-4b", &buf, mw.FormDataContentType())
}

func (s *Server) liveSprite(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 12<<20)
	var in struct {
		Animal string   `json:"animal"`
		Poses  []string `json:"poses"`
		Base   string   `json:"base"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, 400, "cuerpo_invalido", "no se pudo leer el pedido")
		return
	}
	in.Animal = strings.TrimSpace(in.Animal)
	if in.Animal == "" || len(in.Animal) > 240 {
		writeErr(w, 400, "animal_invalido", "describe tu mascota en una frase corta (máximo 240 caracteres)")
		return
	}
	poses := make([]string, 0, len(in.Poses))
	for _, p := range in.Poses {
		if v := strings.TrimSpace(p); v != "" {
			if len(v) > 240 {
				v = v[:240]
			}
			poses = append(poses, v)
		}
	}
	if len(poses) == 0 || len(poses) > 6 {
		writeErr(w, 400, "poses_invalidas", "pide entre 1 y 6 poses")
		return
	}
	if in.Base != "" && !strings.HasPrefix(in.Base, "data:image/") {
		writeErr(w, 400, "base_invalida", "la mascota base debe venir como data:image/…;base64")
		return
	}
	if cfToken() == "" || spriteBase() == "" {
		writeErr(w, 503, "sin_cloudflare", "el servidor no tiene CLOUDFLARE_TOKEN y CLOUDFLARE_ACCOUNT_ID")
		return
	}
	restantes, ok := spriteTope(p.ID, len(poses))
	if !ok {
		writeErr(w, 429, "cupo_agotado", "ya usaste tus poses de hoy: vuelve mañana o usa tu propia hoja")
		return
	}
	if !spritePresupuesto(neuronasPose * float64(len(poses)+1)) {
		writeErr(w, 429, "sin_presupuesto", "la clase llegó a su tope de imágenes por hoy")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 180*time.Second)
	defer cancel()

	base := in.Base
	total := 0.0
	if base == "" {
		var n float64
		var err error
		base, n, err = cfCanonica(ctx, in.Animal)
		if err != nil {
			writeErr(w, 502, "motor_error", "no se pudo dibujar la mascota: "+err.Error())
			return
		}
		total += n
	}

	salida := make([]string, 0, len(poses))
	for _, pose := range poses {
		img, n, err := cfPose(ctx, base, pose)
		if err != nil {
			writeErr(w, 502, "motor_error", "no se pudo dibujar una pose: "+err.Error())
			return
		}
		total += n
		salida = append(salida, img)
	}
	coste := total * precioNeurona
	writeJSON(w, 200, map[string]any{
		"base": base, "poses": salida, "neuronas": total,
		"coste": coste, "restantes": restantes,
	})
}
