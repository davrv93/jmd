package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

// Video del alumno desde una escena del LIVE (taller ¿Difícil de explicar?, sesión 2): el LMS reenvía al
// servicio render de la clase (RENDER_URL, por defecto http://render:8000; ver lms/render) con el token de
// la clase (LMS_AULA_TOKEN) y X-Alumno. El servicio guarda la cola, el tope diario y qué video es de quién.
//
//   POST /api/v1/live/{lesson}/video            {frase1, frase2, marca, contacto, color, cielo, acento, efectos, narracion, voz} → 202 {id, estado, posicion, espera_s}
//   GET  /api/v1/live/{lesson}/video/{id}       → el estado
//   GET  /api/v1/live/{lesson}/video/{id}/mp4   → el MP4 (con Range, para que <video> pueda adelantar)
//   POST /api/v1/live/{lesson}/video/ideas      {idea, marca} → tres variaciones del guion (Gemini; si falla, fijas)

var idVideo = regexp.MustCompile(`^[a-f0-9]{16}$`)

func renderURL() string {
	if u := strings.TrimRight(os.Getenv("RENDER_URL"), "/"); u != "" {
		return u
	}
	return "http://render:8000"
}

// renderPedido arma el pedido al servicio render con el token de la clase y el alumno.
func renderPedido(ctx context.Context, metodo, ruta string, cuerpo io.Reader, alumno string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, metodo, renderURL()+ruta, cuerpo)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("LMS_AULA_TOKEN"))
	req.Header.Set("X-Alumno", alumno)
	if cuerpo != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, nil
}

// renderJSON pasa al navegador la respuesta JSON del servicio tal cual (código y cuerpo), sin agrandarla.
func renderJSON(w http.ResponseWriter, resp *http.Response) {
	datos, err := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if err != nil || !json.Valid(datos) {
		writeErr(w, 502, "render_respuesta_invalida", "el servicio de video respondió algo que no se pudo leer")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(resp.StatusCode)
	_, _ = w.Write(datos)
}

// liveVideoCrear: POST /api/v1/live/{lesson}/video.
func (s *Server) liveVideoCrear(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Frase1    string          `json:"frase1"`
		Frase2    string          `json:"frase2"`
		Marca     string          `json:"marca"`
		Contacto  string          `json:"contacto"`
		Color     string          `json:"color"`
		Cielo     string          `json:"cielo"`
		Acento    string          `json:"acento"`
		Efectos   map[string]bool `json:"efectos"`
		Narracion string          `json:"narracion"`
		Voz       string          `json:"voz"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	cuerpo, _ := json.Marshal(in)
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	req, err := renderPedido(ctx, http.MethodPost, "/render", bytes.NewReader(cuerpo), p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, 503, "render_no_disponible", "el servicio de video de la clase no responde")
		return
	}
	defer resp.Body.Close()
	renderJSON(w, resp)
}

// liveVideoEstado: GET /api/v1/live/{lesson}/video/{id}.
func (s *Server) liveVideoEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	id := r.PathValue("id")
	if !idVideo.MatchString(id) {
		notFound(w, "el video")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	req, err := renderPedido(ctx, http.MethodGet, "/render/"+id, nil, p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, 503, "render_no_disponible", "el servicio de video de la clase no responde")
		return
	}
	defer resp.Body.Close()
	renderJSON(w, resp)
}

// liveVideoMP4: GET /api/v1/live/{lesson}/video/{id}/mp4. Pasa Range y las cabeceras de rango para que el
// reproductor de la escena pueda adelantar; con ?descargar=1 el navegador lo guarda como archivo.
func (s *Server) liveVideoMP4(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	id := r.PathValue("id")
	if !idVideo.MatchString(id) {
		notFound(w, "el video")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()
	req, err := renderPedido(ctx, http.MethodGet, "/render/"+id+"/mp4", nil, p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	if rg := r.Header.Get("Range"); rg != "" {
		req.Header.Set("Range", rg)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeErr(w, 503, "render_no_disponible", "el servicio de video de la clase no responde")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 && resp.StatusCode != 206 {
		renderJSON(w, resp)
		return
	}
	for _, h := range []string{"Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"} {
		if v := resp.Header.Get(h); v != "" {
			w.Header().Set(h, v)
		}
	}
	w.Header().Set("Cache-Control", "private, max-age=3600")
	if r.URL.Query().Get("descargar") == "1" {
		w.Header().Set("Content-Disposition", `attachment; filename="mi-video-`+id[:6]+`.mp4"`)
	}
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

// ---------- variaciones del guion con IA ----------

const sistemaIdeasVideo = `Eres guionista de videos verticales de 9 segundos para el estado de WhatsApp de un pequeño negocio.
El video muestra una flor bajo una tormenta que luego florece al sol: la tormenta es el problema del cliente y la flor es la solución del negocio.
Con la idea y el nombre del negocio que te den, escribe exactamente 3 variaciones con estilos distintos: "Inspirador", "Directo" y "Divertido".
Reglas: español neutro y correcto (tildes y signos); no inventes precios, cifras, premios ni testimonios; nada de emojis.
frase1: el problema, máximo 55 caracteres, termina en "…". frase2: la solución, empieza con "…", máximo 55 caracteres.
narracion: una o dos oraciones que se leen en voz alta en 7 segundos (máximo 22 palabras) y nombran el negocio.
flor: blanca | rosada | amarilla | lila | coral | celeste. cielo: dorado | rosa | celeste | noche. acento: verde | amarillo | rosa | celeste | blanco.
Responde solo JSON: {"variaciones":[{"estilo":"…","frase1":"…","frase2":"…","narracion":"…","flor":"…","cielo":"…","acento":"…"}]}`

type variacionVideo struct {
	Estilo    string `json:"estilo"`
	Frase1    string `json:"frase1"`
	Frase2    string `json:"frase2"`
	Narracion string `json:"narracion"`
	Flor      string `json:"flor"`
	Cielo     string `json:"cielo"`
	Acento    string `json:"acento"`
}

func recorte(s string, max int) string {
	s = strings.Join(strings.Fields(s), " ")
	if r := []rune(s); len(r) > max {
		return string(r[:max])
	}
	return s
}

func elegir(v string, opciones []string, defecto string) string {
	for _, o := range opciones {
		if v == o {
			return v
		}
	}
	return defecto
}

// ideasFijas: si Gemini no responde, la clase sigue con tres variaciones armadas con la idea del alumno.
func ideasFijas(idea, marca string) []variacionVideo {
	if marca == "" {
		marca = "tu negocio"
	}
	return []variacionVideo{
		{"Inspirador", "Cuando todo parece cuesta arriba…", "…cada buena decisión florece", "Cuando todo parece cuesta arriba, cada buena decisión florece. " + marca + " te acompaña.", "blanca", "dorado", "verde"},
		{"Directo", "¿Sin tiempo para atender a todos?…", "…" + recorte(marca, 30) + " lo resuelve", recorte(idea, 90) + ". " + marca + " lo resuelve por ti.", "amarilla", "celeste", "amarillo"},
		{"Divertido", "Tu día parece una tormenta…", "…y de pronto sale el sol", "Si tu día parece una tormenta, tranquilo: con " + marca + " sale el sol.", "rosada", "rosa", "rosa"},
	}
}

// liveVideoIdeas: POST /api/v1/live/{lesson}/video/ideas {"idea","marca"} → {"variaciones":[3], "modelo"}.
func (s *Server) liveVideoIdeas(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Idea  string `json:"idea"`
		Marca string `json:"marca"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Idea, in.Marca = recorte(in.Idea, 240), recorte(in.Marca, 28)
	if len([]rune(in.Idea)) < 8 {
		writeErr(w, 400, "idea_corta", "cuéntame tu idea en una frase: qué haces y qué problema resuelves")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()
	pedido := "Idea: " + in.Idea + "\nNegocio: " + in.Marca
	out, modelo, err := geminiJSON(ctx, sistemaIdeasVideo, []geminiParte{{Texto: pedido}}, 900)
	var vs []variacionVideo
	if err == nil {
		if crudo, e := json.Marshal(out["variaciones"]); e == nil {
			_ = json.Unmarshal(crudo, &vs)
		}
	}
	limpias := make([]variacionVideo, 0, 3)
	for _, v := range vs {
		v.Frase1, v.Frase2, v.Narracion = recorte(v.Frase1, 60), recorte(v.Frase2, 60), recorte(v.Narracion, 160)
		if v.Frase1 == "" || v.Frase2 == "" {
			continue
		}
		v.Estilo = recorte(v.Estilo, 20)
		v.Flor = elegir(v.Flor, []string{"blanca", "rosada", "amarilla", "lila", "coral", "celeste"}, "blanca")
		v.Cielo = elegir(v.Cielo, []string{"dorado", "rosa", "celeste", "noche"}, "dorado")
		v.Acento = elegir(v.Acento, []string{"verde", "amarillo", "rosa", "celeste", "blanco"}, "verde")
		limpias = append(limpias, v)
		if len(limpias) == 3 {
			break
		}
	}
	if len(limpias) == 0 {
		limpias, modelo = ideasFijas(in.Idea, in.Marca), "plantilla"
	}
	writeJSON(w, 200, map[string]any{"variaciones": limpias, "modelo": modelo})
}
