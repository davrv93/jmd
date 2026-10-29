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
//   POST /api/v1/live/{lesson}/video            {frase1, frase2, marca, contacto, color} → 202 {id, estado, posicion, espera_s}
//   GET  /api/v1/live/{lesson}/video/{id}       → el estado
//   GET  /api/v1/live/{lesson}/video/{id}/mp4   → el MP4 (con Range, para que <video> pueda adelantar)

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
		Frase1   string `json:"frase1"`
		Frase2   string `json:"frase2"`
		Marca    string `json:"marca"`
		Contacto string `json:"contacto"`
		Color    string `json:"color"`
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
