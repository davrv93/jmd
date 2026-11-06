package httpapi

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Veo para alumnos, con presupuesto. Cada alumno tiene un tope de generaciones (3 si no se
// configura otro) que el instructor amplía a pedido, y la clase entera tiene un tope total.
// El uso se guarda en la base, así que un reinicio no devuelve intentos a nadie.
//
// Entorno: LMS_VEO_MODELO, LMS_VEO_SEGUNDOS, LMS_VEO_TOPE (por alumno) y LMS_VEO_TOPE_TOTAL.

// veoEscena: la actividad solo existe en las lecciones que traen esta escena.
var veoEscena = "02-tu-escena-con-veo"

const veoClave = "veo_cuenta"
const veoMaxVideo = 40 << 20

type veoSolicitud struct {
	Nombre string `json:"nombre"`
	Fecha  string `json:"fecha"`
}

// veoCuenta es lo que se guarda: generaciones usadas y ampliaciones por alumno, y quién pidió más.
type veoCuenta struct {
	Usados      map[string]int          `json:"usados"`
	Extra       map[string]int          `json:"extra"`
	Nombres     map[string]string       `json:"nombres"`
	Solicitudes map[string]veoSolicitud `json:"solicitudes"`
}

type veoTrabajo struct {
	ID, Alumno, Leccion, Estado, Mensaje string
	Creado                               time.Time
	Video                                []byte
}

var veoLive = struct {
	sync.Mutex
	trabajos map[string]*veoTrabajo
}{trabajos: make(map[string]*veoTrabajo)}

// veoGenerar se sustituye en las pruebas: ninguna prueba llama al proveedor.
var veoGenerar = generarVeo

func veoEntero(nombre string, defecto, min, max int) int {
	n, err := strconv.Atoi(strings.TrimSpace(os.Getenv(nombre)))
	if err != nil || n < min || n > max {
		return defecto
	}
	return n
}

func veoModelo() string {
	if m := strings.TrimSpace(os.Getenv("LMS_VEO_MODELO")); m != "" {
		return m
	}
	return "google/veo-3.1-lite"
}
func veoSegundos() int  { return veoEntero("LMS_VEO_SEGUNDOS", 4, 4, 8) }
func veoTope() int      { return veoEntero("LMS_VEO_TOPE", 3, 0, 50) }
func veoTopeTotal() int { return veoEntero("LMS_VEO_TOPE_TOTAL", 30, 0, 5000) }

// veoCostoClip estima en dólares lo que cuesta una generación; 0 si el modelo no tiene tarifa conocida.
// Tarifa de OpenRouter para Veo 3.1 Lite a 720p sin audio: US$ 0,03 por segundo (05-11-2026).
func veoCostoClip() float64 {
	if veoModelo() == "google/veo-3.1-lite" {
		return 0.03 * float64(veoSegundos())
	}
	return 0
}

func (s *Server) veoLeer(ctx context.Context) veoCuenta {
	c := veoCuenta{}
	if raw, err := s.DB.Setting(ctx, veoClave); err == nil && raw != "" {
		_ = json.Unmarshal([]byte(raw), &c)
	}
	if c.Usados == nil {
		c.Usados = map[string]int{}
	}
	if c.Extra == nil {
		c.Extra = map[string]int{}
	}
	if c.Nombres == nil {
		c.Nombres = map[string]string{}
	}
	if c.Solicitudes == nil {
		c.Solicitudes = map[string]veoSolicitud{}
	}
	return c
}

func (s *Server) veoGuardar(ctx context.Context, c veoCuenta) error {
	raw, err := json.Marshal(c)
	if err != nil {
		return err
	}
	return s.DB.SetSetting(ctx, veoClave, string(raw))
}

func (c veoCuenta) total() int {
	n := 0
	for _, v := range c.Usados {
		n += v
	}
	return n
}

// veoActividad devuelve la lección si el alumno puede verla y trae la escena de Veo.
func (s *Server) veoActividad(w http.ResponseWriter, r *http.Request, p *Principal) bool {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return false
	}
	if s.Content.Get().Escena(l.ID, veoEscena) == nil {
		notFound(w, "la actividad")
		return false
	}
	return true
}

func (s *Server) veoResumen(c veoCuenta, p *Principal, lesson string) map[string]any {
	limite := veoTope() + c.Extra[p.ID]
	out := map[string]any{
		"usados": c.Usados[p.ID], "limite": limite, "quedan": max(0, limite-c.Usados[p.ID]),
		"solicitud": c.Solicitudes[p.ID].Fecha != "", "modelo": veoModelo(), "segundos": veoSegundos(),
		"clase_agotada": c.total() >= veoTopeTotal(),
	}
	veoLive.Lock()
	var ultimo *veoTrabajo
	for _, j := range veoLive.trabajos {
		if j.Alumno == p.ID && j.Leccion == lesson && (ultimo == nil || j.Creado.After(ultimo.Creado)) {
			ultimo = j
		}
	}
	if ultimo != nil {
		out["trabajo"] = map[string]string{"id": ultimo.ID, "estado": ultimo.Estado, "mensaje": ultimo.Mensaje}
	}
	veoLive.Unlock()
	return out
}

// liveVeoCuenta: GET /api/v1/live/{lesson}/veo → cuántas generaciones usó y cuántas le quedan.
func (s *Server) liveVeoCuenta(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.veoActividad(w, r, p) {
		return
	}
	veoLive.Lock()
	c := s.veoLeer(r.Context())
	veoLive.Unlock()
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, s.veoResumen(c, p, r.PathValue("lesson")))
}

// liveVeoCrear: POST /api/v1/live/{lesson}/veo {"prompt","formato"} → 202 {"id"}. Cuenta el intento
// al aceptarlo; solo lo devuelve si el proveedor rechazó el pedido antes de generar.
func (s *Server) liveVeoCrear(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.veoActividad(w, r, p) {
		return
	}
	var in struct {
		Prompt  string `json:"prompt"`
		Formato string `json:"formato"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Prompt = strings.TrimSpace(in.Prompt)
	if len(in.Prompt) < 10 || len(in.Prompt) > 1500 {
		writeErr(w, 400, "prompt_invalido", "Describe tu escena en entre 10 y 1500 caracteres.")
		return
	}
	formato := elegir(in.Formato, []string{"16:9", "9:16"}, "9:16")
	key := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY"))
	if key == "" {
		writeErr(w, 503, "veo_no_configurado", "La generación de video todavía no está configurada en el servidor.")
		return
	}
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		internal(w, err)
		return
	}
	id, lesson, now := hex.EncodeToString(idBytes), r.PathValue("lesson"), time.Now()

	veoLive.Lock()
	for k, j := range veoLive.trabajos {
		if now.Sub(j.Creado) > 2*time.Hour {
			delete(veoLive.trabajos, k)
		}
	}
	for _, j := range veoLive.trabajos {
		if j.Alumno == p.ID && j.Estado == "generando" {
			veoLive.Unlock()
			writeJSON(w, 202, map[string]string{"id": j.ID, "estado": "generando"})
			return
		}
	}
	c := s.veoLeer(r.Context())
	if c.Usados[p.ID] >= veoTope()+c.Extra[p.ID] {
		veoLive.Unlock()
		writeErr(w, 429, "limite_veo", "Ya usaste tus generaciones de Veo. Puedes solicitar una ampliación.")
		return
	}
	if c.total() >= veoTopeTotal() {
		veoLive.Unlock()
		writeErr(w, 429, "limite_clase", "La clase ya usó todas sus generaciones de Veo. Avisa al instructor.")
		return
	}
	c.Usados[p.ID]++
	c.Nombres[p.ID] = p.Name
	if err := s.veoGuardar(r.Context(), c); err != nil {
		veoLive.Unlock()
		internal(w, err)
		return
	}
	j := &veoTrabajo{ID: id, Alumno: p.ID, Leccion: lesson, Estado: "generando", Creado: now}
	veoLive.trabajos[id] = j
	veoLive.Unlock()

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Minute)
		defer cancel()
		video, cobrado, err := veoGenerar(ctx, http.DefaultClient, key, in.Prompt, formato)
		veoLive.Lock()
		defer veoLive.Unlock()
		if err != nil {
			j.Estado = "error"
			j.Mensaje = "No se pudo generar el video. Este intento sí contó."
			if !cobrado {
				// El proveedor no llegó a generar: el intento vuelve al alumno.
				c := s.veoLeer(ctx)
				if c.Usados[j.Alumno] > 0 {
					c.Usados[j.Alumno]--
					_ = s.veoGuardar(ctx, c)
				}
				j.Mensaje = "El proveedor rechazó el pedido. Este intento no contó: cambia la descripción y prueba otra vez."
			}
			return
		}
		j.Video = video
		j.Estado = "listo"
	}()
	writeJSON(w, 202, map[string]string{"id": id, "estado": "generando"})
}

func veoDelAlumno(r *http.Request, p *Principal) *veoTrabajo {
	j := veoLive.trabajos[r.PathValue("id")]
	if j == nil || j.Alumno != p.ID || j.Leccion != r.PathValue("lesson") || time.Since(j.Creado) > 2*time.Hour {
		return nil
	}
	return j
}

// liveVeoEstado: GET /api/v1/live/{lesson}/veo/{id} → estado del trabajo del propio alumno.
func (s *Server) liveVeoEstado(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.veoActividad(w, r, p) {
		return
	}
	veoLive.Lock()
	j := veoDelAlumno(r, p)
	if j == nil {
		veoLive.Unlock()
		notFound(w, "el video (puede haber expirado)")
		return
	}
	out := map[string]string{"id": j.ID, "estado": j.Estado, "mensaje": j.Mensaje}
	veoLive.Unlock()
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, out)
}

// liveVeoMP4: GET /api/v1/live/{lesson}/veo/{id}/mp4 → el video del propio alumno.
func (s *Server) liveVeoMP4(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.veoActividad(w, r, p) {
		return
	}
	veoLive.Lock()
	j := veoDelAlumno(r, p)
	if j == nil || j.Estado != "listo" {
		veoLive.Unlock()
		notFound(w, "el video")
		return
	}
	video, creado := j.Video, j.Creado
	veoLive.Unlock()
	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.URL.Query().Get("descargar") == "1" {
		w.Header().Set("Content-Disposition", `attachment; filename="mi-escena-veo.mp4"`)
	}
	http.ServeContent(w, r, "mi-escena-veo.mp4", creado, bytes.NewReader(video))
}

// liveVeoSolicitar: POST /api/v1/live/{lesson}/veo/ampliar → el alumno pide más generaciones.
func (s *Server) liveVeoSolicitar(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.veoActividad(w, r, p) {
		return
	}
	veoLive.Lock()
	defer veoLive.Unlock()
	c := s.veoLeer(r.Context())
	if c.Solicitudes[p.ID].Fecha == "" {
		c.Solicitudes[p.ID] = veoSolicitud{Nombre: p.Name, Fecha: time.Now().UTC().Format(time.RFC3339)}
		c.Nombres[p.ID] = p.Name
		if err := s.veoGuardar(r.Context(), c); err != nil {
			internal(w, err)
			return
		}
	}
	writeJSON(w, 200, map[string]bool{"solicitud": true})
}

// liveVeoSolicitudes: GET /api/v1/live/{lesson}/veo/solicitudes (staff) → uso por alumno y pedidos.
func (s *Server) liveVeoSolicitudes(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.veoActividad(w, r, p) {
		return
	}
	veoLive.Lock()
	c := s.veoLeer(r.Context())
	veoLive.Unlock()
	type fila struct {
		Alumno   string `json:"alumno"`
		Nombre   string `json:"nombre"`
		Usados   int    `json:"usados"`
		Limite   int    `json:"limite"`
		Pidio    bool   `json:"pidio"`
		PidioHoy string `json:"pidio_fecha,omitempty"`
	}
	filas := []fila{}
	for id, nombre := range c.Nombres {
		filas = append(filas, fila{Alumno: id, Nombre: nombre, Usados: c.Usados[id], Limite: veoTope() + c.Extra[id],
			Pidio: c.Solicitudes[id].Fecha != "", PidioHoy: c.Solicitudes[id].Fecha})
	}
	sort.Slice(filas, func(i, j int) bool {
		if filas[i].Pidio != filas[j].Pidio {
			return filas[i].Pidio
		}
		return filas[i].Nombre < filas[j].Nombre
	})
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"alumnos": filas, "total": c.total(), "tope_total": veoTopeTotal(), "tope": veoTope(),
		"costo_clip": veoCostoClip()})
}

// liveVeoAmpliar: POST /api/v1/live/{lesson}/veo/ampliar/{alumno} {"extra"} (staff) → da más generaciones.
func (s *Server) liveVeoAmpliar(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.veoActividad(w, r, p) {
		return
	}
	var in struct {
		Extra int `json:"extra"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.Extra < 1 || in.Extra > 10 {
		badRequest(w, "la ampliación va de 1 a 10 generaciones")
		return
	}
	alumno := r.PathValue("alumno")
	veoLive.Lock()
	defer veoLive.Unlock()
	c := s.veoLeer(r.Context())
	if _, ok := c.Nombres[alumno]; !ok {
		notFound(w, "el alumno")
		return
	}
	c.Extra[alumno] += in.Extra
	delete(c.Solicitudes, alumno)
	if err := s.veoGuardar(r.Context(), c); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]int{"limite": veoTope() + c.Extra[alumno]})
}

// generarVeo pide el video a OpenRouter y espera a que termine. «cobrado» es falso solo cuando el
// proveedor rechazó el pedido al enviarlo: desde ahí en adelante se asume que hubo costo.
func generarVeo(ctx context.Context, client *http.Client, key, prompt, formato string) (video []byte, cobrado bool, err error) {
	pedir := func(metodo, url string, cuerpo io.Reader) (*http.Response, error) {
		req, err := http.NewRequestWithContext(ctx, metodo, url, cuerpo)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+key)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("HTTP-Referer", "https://jmd-learn.online")
		req.Header.Set("X-Title", "JMD LMS · escena con Veo")
		return client.Do(req)
	}
	body, _ := json.Marshal(map[string]any{"model": veoModelo(), "prompt": prompt, "duration": veoSegundos(),
		"resolution": "720p", "aspect_ratio": formato, "generate_audio": false})
	resp, err := pedir("POST", "https://openrouter.ai/api/v1/videos", bytes.NewReader(body))
	if err != nil {
		return nil, false, err
	}
	var trabajo struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	err = json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&trabajo)
	resp.Body.Close()
	if resp.StatusCode >= 300 || err != nil || trabajo.ID == "" {
		return nil, false, errors.New("el proveedor de video rechazó el pedido")
	}
	for trabajo.Status != "completed" {
		if trabajo.Status == "failed" || trabajo.Status == "cancelled" || trabajo.Status == "expired" {
			return nil, true, errors.New("el proveedor no terminó el video")
		}
		select {
		case <-ctx.Done():
			return nil, true, ctx.Err()
		case <-time.After(veoPausa):
		}
		resp, err = pedir("GET", "https://openrouter.ai/api/v1/videos/"+trabajo.ID, nil)
		if err != nil {
			return nil, true, err
		}
		err = json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&trabajo)
		resp.Body.Close()
		if err != nil {
			return nil, true, err
		}
	}
	resp, err = pedir("GET", "https://openrouter.ai/api/v1/videos/"+trabajo.ID+"/content", nil)
	if err != nil {
		return nil, true, err
	}
	defer resp.Body.Close()
	video, err = io.ReadAll(io.LimitReader(resp.Body, veoMaxVideo+1))
	if err != nil || resp.StatusCode != 200 || len(video) > veoMaxVideo || len(video) < 12 || string(video[4:8]) != "ftyp" {
		return nil, true, errors.New("el proveedor no devolvió un MP4 válido")
	}
	return video, true, nil
}

// veoPausa: cada cuánto se consulta el trabajo en el proveedor.
var veoPausa = 5 * time.Second
