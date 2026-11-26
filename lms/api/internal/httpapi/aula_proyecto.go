package httpapi

import (
	"archive/tar"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
	"github.com/davrv93/jmd/lms/api/internal/content"
)

// Proyecto que una herramienta del mismo origen (Forja, en el LIVE de Ready Set Go) guarda en el aula del alumno:
//
//	POST /api/v1/aula/proyecto {"carpeta":"juego-laberinto","archivos":[{"ruta":"index.html","b64":"…"},…]}
//	→ {"ok":true,"carpeta":"juego-laberinto","ruta":"juego-laberinto/index.html","sub":"<id>","archivos":14,"bytes":2345678}
//
// Se escribe en /trabajo/<carpeta>/ y el Visor del LIVE lo lista como un proyecto más (carpeta con index.html),
// así el alumno lo recupera desde cualquier computadora. No se borra nada: los archivos con el mismo nombre se
// reemplazan y lo demás que el alumno haya creado en esa carpeta se queda.
//
// Los archivos llegan en base64 dentro de JSON y viajan al contenedor como un tar por stdin (nada en la línea
// de comandos del host). Solo se aceptan extensiones de una página web y su audio.

var reCarpetaProyecto = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,47}$`)

var extProyecto = map[string]bool{
	".html": true, ".js": true, ".mjs": true, ".json": true, ".css": true, ".txt": true, ".md": true,
	".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true, ".svg": true,
	".wav": true, ".mp3": true, ".ogg": true,
}

const (
	maxProyectoBytes    = 12 << 20 // ya decodificados
	maxProyectoArchivos = 150
)

// El Visor también tiene que servir el audio de los juegos (Forja exporta sus sonidos como .wav).
func init() {
	for ext, ct := range map[string]string{".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"} {
		if _, ok := mimeVista[ext]; !ok {
			mimeVista[ext] = ct
		}
	}
}

type archivoProyecto struct {
	Ruta string `json:"ruta"`
	B64  string `json:"b64"`
}

// tarProyecto valida cada ruta y arma el tar (con sus carpetas) que se desempaca en /trabajo/<carpeta>.
func tarProyecto(archivos []archivoProyecto) ([]byte, int, error) {
	if len(archivos) == 0 {
		return nil, 0, fmt.Errorf("el proyecto no trae archivos")
	}
	if len(archivos) > maxProyectoArchivos {
		return nil, 0, fmt.Errorf("el proyecto trae %d archivos; el máximo es %d", len(archivos), maxProyectoArchivos)
	}
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	ahora := time.Now()
	carpetas, vistos, total, conIndex := map[string]bool{}, map[string]bool{}, 0, false
	for _, a := range archivos {
		ruta := strings.TrimPrefix(strings.TrimSpace(a.Ruta), "./")
		if ruta == "" || strings.ContainsRune(ruta, 0) || strings.Contains(ruta, "..") || strings.HasPrefix(ruta, "/") ||
			strings.Contains(ruta, "\\") || path.Clean(ruta) != ruta || !content.SafeRel(ruta) || strings.Count(ruta, "/") > 4 {
			return nil, 0, fmt.Errorf("ruta no permitida: %q", a.Ruta)
		}
		if !extProyecto[strings.ToLower(path.Ext(ruta))] {
			return nil, 0, fmt.Errorf("tipo de archivo no permitido: %q", ruta)
		}
		if vistos[ruta] {
			return nil, 0, fmt.Errorf("archivo repetido: %q", ruta)
		}
		vistos[ruta] = true
		datos, err := base64.StdEncoding.DecodeString(a.B64)
		if err != nil {
			return nil, 0, fmt.Errorf("%q no viene en base64", ruta)
		}
		total += len(datos)
		if total > maxProyectoBytes {
			return nil, 0, fmt.Errorf("el proyecto pasa de %d MB", maxProyectoBytes>>20)
		}
		if ruta == "index.html" {
			conIndex = true
		}
		// las carpetas van antes que sus archivos (el tar de busybox no las crea solo)
		for d := path.Dir(ruta); d != "."; d = path.Dir(d) {
			if !carpetas[d] {
				carpetas[d] = true
				if err := tw.WriteHeader(&tar.Header{Name: d + "/", Typeflag: tar.TypeDir, Mode: 0o755, ModTime: ahora}); err != nil {
					return nil, 0, err
				}
			}
		}
		if err := tw.WriteHeader(&tar.Header{Name: ruta, Typeflag: tar.TypeReg, Mode: 0o644, Size: int64(len(datos)), ModTime: ahora}); err != nil {
			return nil, 0, err
		}
		if _, err := tw.Write(datos); err != nil {
			return nil, 0, err
		}
	}
	if !conIndex {
		return nil, 0, fmt.Errorf("falta index.html: sin él el Visor no lo muestra")
	}
	if err := tw.Close(); err != nil {
		return nil, 0, err
	}
	return buf.Bytes(), total, nil
}

// aulaProyecto: POST /api/v1/aula/proyecto. Solo escribe en el aula de quien llama.
func (s *Server) aulaProyecto(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.aulaListo(w) {
		return
	}
	var in struct {
		Carpeta  string            `json:"carpeta"`
		Archivos []archivoProyecto `json:"archivos"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxProyectoBytes*4/3+(1<<20))
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeErr(w, 400, "cuerpo_invalido", "no se pudo leer el proyecto (¿pasa de 12 MB?)")
		return
	}
	if !reCarpetaProyecto.MatchString(in.Carpeta) {
		writeErr(w, 400, "carpeta_invalida", "la carpeta solo puede tener minúsculas, números y guiones (máximo 48)")
		return
	}
	sort.SliceStable(in.Archivos, func(i, j int) bool { return in.Archivos[i].Ruta < in.Archivos[j].Ruta })
	paquete, total, err := tarProyecto(in.Archivos)
	if err != nil {
		writeErr(w, 400, "proyecto_invalido", err.Error())
		return
	}
	ctx := r.Context()
	if _, err := s.Aula.Crear(ctx, p.ID); err != nil {
		slog.Warn("proyecto: no se pudo encender el aula", "aula", aula.Nombre(p.ID), "err", err)
		writeErr(w, 503, "aula_no_disponible", "tu aula no pudo encenderse; prueba otra vez en unos segundos")
		return
	}
	tocarAula(p.ID)
	script := `set -e; d=/trabajo/` + in.Carpeta + `; mkdir -p "$d"; tar -x -f - -C "$d"; echo guardado`
	out, err := s.Aula.ExecTope(ctx, aula.Nombre(p.ID), script, paquete, 60*time.Second)
	if err != nil || !strings.Contains(out, "guardado") {
		slog.Warn("proyecto: no se pudo escribir", "aula", aula.Nombre(p.ID), "err", err, "salida", strings.TrimSpace(out))
		writeErr(w, 502, "no_guardado", "no se pudo guardar en tu aula; prueba otra vez")
		return
	}
	writeJSON(w, 200, map[string]any{
		"ok": true, "carpeta": in.Carpeta, "ruta": in.Carpeta + "/index.html", "sub": p.ID,
		"archivos": len(in.Archivos), "bytes": total,
	})
}
