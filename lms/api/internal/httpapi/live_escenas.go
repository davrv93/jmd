package httpapi

import (
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// cspEscena: lo único que una escena puede hacer. Todo inline y del mismo origen; sin CDN, sin
// formularios y sin cargar nada de fuera. Las escenas son contenido nuestro, pero el iframe
// también se usa para vistas de proyectos de alumnos (fase 4), así que se parte de lo mínimo.
const cspEscena = "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; " +
	"img-src data: 'self'; font-src data:; connect-src 'self'; frame-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'"

// liveEscenasLista: GET /api/v1/live/{lesson}/escenas (autenticado). Las escenas visibles de la
// lección, en orden, con todo lo que el panel necesita (fase, paso, compuerta, comandos, tareas).
func (s *Server) liveEscenasLista(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	writeJSON(w, 200, s.Content.Get().Escenas(l.ID))
}

// liveEscenaHTML: GET /api/v1/live/{lesson}/escenas/{id}/html (autenticado). Sirve escena.html
// para el iframe. La ruta del archivo sale del catálogo (nunca del cliente), así que el id solo
// sirve para buscar: no hay forma de salir de la carpeta de escenas.
func (s *Server) liveEscenaHTML(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	e := s.Content.Get().Escena(l.ID, r.PathValue("id"))
	if e == nil {
		notFound(w, "la escena")
		return
	}
	raw, err := os.ReadFile(e.HTMLPath)
	if err != nil {
		internal(w, err)
		return
	}
	h := w.Header()
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("Cache-Control", "no-cache")
	h.Set("Content-Security-Policy", cspEscena)
	h.Set("X-Frame-Options", "SAMEORIGIN") // el middleware general pone DENY; aquí el iframe es del mismo origen
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(200)
	_, _ = w.Write(raw)
}

// escenasPublicas: las únicas escenas que se sirven sin sesión, cada una en su propia dirección. El id viene de esta
// lista, nunca del cliente: el resto de las escenas sigue pidiendo sesión.
var escenasPublicas = map[string][2]string{
	"/sorteo-goldenquerys": {"gq-01", "09-sorteo"},
	"/fuga-goldenquerys":   {"gq-01", "10-fuga"},
	"/fuga-yape":           {"gq-01", "11-fuga-yape"},
}

// escenaPublica: GET /sorteo-goldenquerys (sin sesión). Se abre como página suelta para compartirla por WhatsApp.
func (s *Server) escenaPublica(w http.ResponseWriter, r *http.Request) {
	ref, ok := escenasPublicas[strings.TrimSuffix(r.URL.Path, "/")]
	if !ok {
		notFound(w, "la página")
		return
	}
	e := s.Content.Get().Escena(ref[0], ref[1])
	if e == nil {
		notFound(w, "la página")
		return
	}
	raw, err := os.ReadFile(e.HTMLPath)
	if err != nil {
		internal(w, err)
		return
	}
	h := w.Header()
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("Cache-Control", "no-cache")
	h.Set("Content-Security-Policy", cspEscena)
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(200)
	_, _ = w.Write(raw)
}

// fugaVideo: GET /fuga-goldenquerys/video.mp4 y /fuga-yape/video.mp4 (sin sesión). El video va junto a la escena; ServeContent da los rangos
// que pide el navegador para adelantar.
func (s *Server) fugaVideo(w http.ResponseWriter, r *http.Request) {
	ref, ok := escenasPublicas[strings.TrimSuffix(r.URL.Path, "/video.mp4")]
	if !ok {
		notFound(w, "el video")
		return
	}
	e := s.Content.Get().Escena(ref[0], ref[1])
	if e == nil {
		notFound(w, "el video")
		return
	}
	f, err := os.Open(filepath.Join(filepath.Dir(e.HTMLPath), "video.mp4"))
	if err != nil {
		notFound(w, "el video")
		return
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		internal(w, err)
		return
	}
	w.Header().Set("Content-Type", "video/mp4")
	http.ServeContent(w, r, "video.mp4", st.ModTime(), f)
}

// fugaPistas: GET /api/v1/fuga/pistas (público). Las pistas de «La fuga del estadio» viven en <datos>/fuga-pistas.json,
// fuera del repo (es público), y cada una solo sale desde su hora: [{"hora": "RFC 3339", "texto": "…"}] en orden.
func (s *Server) fugaPistas(w http.ResponseWriter, r *http.Request) {
	listas := []string{}
	siguiente := ""
	var pistas []struct {
		Hora  time.Time `json:"hora"`
		Texto string    `json:"texto"`
	}
	if raw, err := os.ReadFile(filepath.Join(s.DataDir, "fuga-pistas.json")); err == nil {
		if err := json.Unmarshal(raw, &pistas); err != nil {
			internal(w, err)
			return
		}
	}
	ahora := time.Now()
	for _, p := range pistas {
		if !ahora.Before(p.Hora) {
			listas = append(listas, p.Texto)
		} else if siguiente == "" {
			siguiente = p.Hora.Format(time.RFC3339)
		}
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"pistas": listas, "siguiente": siguiente})
}

// extsEscena: lo único que una escena puede pedir como archivo hermano o común. Nada de .html,
// .yaml ni ejecutables: así escena.yaml y escena.html no se sirven por esta ruta.
var extsEscena = map[string]string{
	".js":    "text/javascript; charset=utf-8",
	".mjs":   "text/javascript; charset=utf-8",
	".css":   "text/css; charset=utf-8",
	".json":  "application/json; charset=utf-8",
	".png":   "image/png",
	".webp":  "image/webp",
	".svg":   "image/svg+xml",
	".woff2": "font/woff2",
}

// servirArchivoEscena sirve un archivo de dir por su nombre. Solo nombres simples (sin separadores
// ni puntos al inicio) y solo las extensiones de extsEscena; todo lo demás es 404, para que el
// cliente no pueda salir de la carpeta ni leer el contenido de la escena.
func servirArchivoEscena(w http.ResponseWriter, dir, nombre string) {
	ct, ok := extsEscena[strings.ToLower(filepath.Ext(nombre))]
	if !ok || dir == "" || nombre != filepath.Base(nombre) || strings.HasPrefix(nombre, ".") || strings.ContainsAny(nombre, `/\`) {
		notFound(w, "el archivo")
		return
	}
	raw, err := os.ReadFile(filepath.Join(dir, nombre))
	if errors.Is(err, fs.ErrNotExist) {
		notFound(w, "el archivo")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	h := w.Header()
	h.Set("Content-Type", ct)
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Cross-Origin-Resource-Policy", "same-origin")
	w.WriteHeader(200)
	_, _ = w.Write(raw)
}

// liveEscenaArchivo: GET /api/v1/live/{lesson}/escenas/{id}/{archivo} (autenticado). Archivos de
// la carpeta de la escena (imágenes, módulos JS propios).
func (s *Server) liveEscenaArchivo(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	e := s.Content.Get().Escena(l.ID, r.PathValue("id"))
	if e == nil {
		notFound(w, "la escena")
		return
	}
	servirArchivoEscena(w, filepath.Dir(e.HTMLPath), r.PathValue("archivo"))
}

// liveComunArchivo: GET /api/v1/live/{lesson}/comun/{archivo} (autenticado). Archivos compartidos
// por todas las escenas de la lección (Three.js, avatares).
func (s *Server) liveComunArchivo(w http.ResponseWriter, r *http.Request, p *Principal) {
	// Son librerías compartidas (Three.js, avatares), no contenido de la clase: se sirven a cualquier
	// sesión iniciada aunque la lección sea de otro grupo. El asistente de cada aula las pide por el id
	// de una lección fija, y los alumnos de otro grupo no pueden «ver» esa lección.
	l := s.Content.Get().Lesson(r.PathValue("lesson"))
	if l == nil {
		notFound(w, "la lección")
		return
	}
	servirArchivoEscena(w, s.Content.Get().ComunDir(l.ID), r.PathValue("archivo"))
}
