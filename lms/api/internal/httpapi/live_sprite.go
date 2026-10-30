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
	max := 2
	for _, nombre := range []string{"SPRITE_HOJAS_POR_ALUMNO", "SPRITE_POSES_POR_ALUMNO"} {
		if v, err := strconv.Atoi(os.Getenv(nombre)); err == nil && v > 0 {
			max = v
			break
		}
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
		cuenta = strings.TrimSpace(os.Getenv("CF_ACCOUNT_ID"))
	}
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

// cfHoja: una sola generación con las seis poses en rejilla 3x2. Medido: FLUX.2 klein no usa la
// imagen de referencia (la ignora aunque se mande), así que la consistencia se consigue dibujando
// las seis poses en la MISMA imagen, no en seis llamadas.
func cfHoja(ctx context.Context, animal string, poses []string) (string, float64, error) {
	prompt := "Sprite sheet for a 2D game: exactly 2 rows and 3 columns, six drawings of THE SAME cute " +
		"cartoon character, identical design in every cell (same head, same colours, same thick outline, " +
		"same size), full body. The character is " + animal + ". Six poses: " + strings.Join(poses, "; ") +
		". Flat cel shading, pure solid green #00FF00 background, wide green space between the six " +
		"drawings, no grid lines, no text, no shadow."
	cuerpo, _ := json.Marshal(map[string]any{"prompt": prompt, "steps": 4})
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
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var in struct {
		Animal string   `json:"animal"`
		Poses  []string `json:"poses"`
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
	poses := make([]string, 0, 6)
	for _, p := range in.Poses {
		if v := strings.TrimSpace(p); v != "" {
			if len(v) > 120 {
				v = v[:120]
			}
			poses = append(poses, v)
		}
	}
	if len(poses) == 0 {
		writeErr(w, 400, "poses_invalidas", "pide al menos una pose")
		return
	}
	if len(poses) > 6 {
		poses = poses[:6]
	}
	if cfToken() == "" || spriteBase() == "" {
		writeErr(w, 503, "sin_cloudflare", "el servidor no tiene CLOUDFLARE_TOKEN y CLOUDFLARE_ACCOUNT_ID")
		return
	}
	restantes, ok := spriteTope(p.ID, 1)
	if !ok {
		writeErr(w, 429, "cupo_agotado", "ya usaste tus hojas de hoy: usa la de ejemplo o vuelve mañana")
		return
	}
	if !spritePresupuesto(neuronasPose) {
		writeErr(w, 429, "sin_presupuesto", "la clase llegó a su tope de imágenes por hoy")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	hoja, neuronas, err := cfHoja(ctx, in.Animal, poses)
	if err != nil {
		writeErr(w, 502, "motor_error", "no se pudo dibujar la hoja: "+err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{
		"hoja": hoja, "poses": len(poses), "neuronas": neuronas,
		"coste": neuronas * precioNeurona, "restantes": restantes,
	})
}
