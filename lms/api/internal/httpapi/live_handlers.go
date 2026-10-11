package httpapi

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// parametrosLive guarda en memoria el parámetro libre que el instructor manda a la escena actual
// (p. ej. el ánimo de los avatares). No se persiste: vale lo que dura la escena.
var parametrosLive = struct {
	sync.Mutex
	v map[string]string
}{v: map[string]string{}}

func parametroLive(lesson string) string {
	parametrosLive.Lock()
	defer parametrosLive.Unlock()
	return parametrosLive.v[lesson]
}

func ponerParametroLive(lesson, valor string) {
	parametrosLive.Lock()
	defer parametrosLive.Unlock()
	if valor == "" {
		delete(parametrosLive.v, lesson)
		return
	}
	parametrosLive.v[lesson] = valor
}

// parametroValido: hasta 40 caracteres en minúscula, dígitos, guion y guion bajo.
func parametroValido(v string) bool {
	if len(v) > 40 {
		return false
	}
	for _, c := range v {
		if !(c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-' || c == '_') {
			return false
		}
	}
	return true
}

// liveView es el cuerpo del estado del LIVE: lo que viaja en (GET, evento estado y stream).
func liveView(s *store.LiveSession, conectados int) map[string]any {
	var iniciada any
	if s.IniciadaEn != nil {
		iniciada = s.IniciadaEn.UTC().Format(time.RFC3339)
	}
	estado := s.Estado
	if estado == "" {
		estado = "preparando"
	}
	return map[string]any{
		"lesson_id": s.LessonID, "estado": estado, "escena": s.Escena, "paso": s.Paso,
		"visible": s.Visible, "modo": s.Modo, "mensaje": s.Mensaje, "parametro": parametroLive(s.LessonID), "iniciada_en": iniciada,
		"conectados": conectados, "t": time.Now().UTC().Format(time.RFC3339),
	}
}

// preparar: valida la lección y devuelve su FileSystem; 404 si no existe o no es visible.
func (s *Server) liveLeccion(w http.ResponseWriter, r *http.Request, p *Principal) *content.Lesson {
	l := s.Content.Get().Lesson(r.PathValue("lesson"))
	if l == nil || s.visibleLesson(p, l) == nil {
		notFound(w, "la sesión")
		return nil
	}
	return l
}

// cargar: lee la fila del LIVE sin crearla; si no hay, devuelve el estado inicial.
func (s *Server) liveCargar(w http.ResponseWriter, r *http.Request, lessonID string) {
	sv, err := s.DB.LiveSession(r.Context(), lessonID)
	if err == store.ErrNotFound {
		sv = &store.LiveSession{LessonID: lessonID, Estado: "preparando", Visible: true, Modo: "guiado"}
	} else if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, liveView(sv, s.live.count(lessonID)))
}

// liveGet: GET /api/v1/live/{lesson} — el estado actual (autenticado).
func (s *Server) liveGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	s.liveCargar(w, r, r.PathValue("lesson"))
}

// liveIniciar: POST /api/v1/live/{lesson}/iniciar (staff).
func (s *Server) liveIniciar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct{}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	if err == store.ErrNotFound {
		sv = &store.LiveSession{LessonID: l.ID, Visible: true, Modo: "guiado"}
	} else if err != nil {
		internal(w, err)
		return
	}
	if sv.Escena == "" {
		// La primera escena del contenido si existe (T-2.2); hasta entonces vacía.
		if escenas := s.Content.Get().Escenas(l.ID); len(escenas) > 0 {
			sv.Escena = escenas[0].ID
		}
	}
	now := time.Now().UTC()
	sv.Estado, sv.IniciadaPor, sv.IniciadaEn = "en_vivo", p.ID, &now
	sv.CerradaEn = nil
	if err := s.DB.UpsertLiveSession(r.Context(), sv); err != nil {
		internal(w, err)
		return
	}
	s.live.publish(l.ID, "estado", liveView(sv, s.live.count(l.ID)))
	writeJSON(w, 200, liveView(sv, s.live.count(l.ID)))
}

// liveCerrar: POST /api/v1/live/{lesson}/cerrar (staff).
func (s *Server) liveCerrar(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct{}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	if err == store.ErrNotFound {
		sv = &store.LiveSession{LessonID: l.ID}
	} else if err != nil {
		internal(w, err)
		return
	}
	now := time.Now().UTC()
	sv.Estado, sv.CerradaEn = "cerrada", &now
	if err := s.DB.UpsertLiveSession(r.Context(), sv); err != nil {
		internal(w, err)
		return
	}
	s.pararPresencia(l.ID)
	go s.borrarAulas(context.Background()) // al cerrar la clase se retiran los contenedores; /trabajo se conserva
	s.live.publish(l.ID, "cierre", liveView(sv, s.live.count(l.ID)))
	writeJSON(w, 200, liveView(sv, s.live.count(l.ID)))
}

// liveEscenaPut: PUT /api/v1/live/{lesson}/escena (staff) {"escena","visible"}.
func (s *Server) liveEscenaPut(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Escena  string `json:"escena"`
		Visible *bool  `json:"visible"`
		// Parametro: opcional; ausente conserva el actual dentro de la misma escena y lo borra al cambiar de escena.
		Parametro *string `json:"parametro"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.Parametro != nil && !parametroValido(*in.Parametro) {
		writeErr(w, 400, "parametro_invalido", "el parámetro admite hasta 40 caracteres: minúsculas, dígitos, guion y guion bajo")
		return
	}
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	if err == store.ErrNotFound {
		sv = &store.LiveSession{LessonID: l.ID, Estado: "preparando", Visible: true, Modo: "guiado"}
	} else if err != nil {
		internal(w, err)
		return
	}
	if len(s.Content.Get().Escenas(l.ID)) > 0 {
		if s.Content.Get().Escena(l.ID, in.Escena) == nil {
			writeErr(w, 404, "escena_desconocida", "la escena \""+in.Escena+"\" no existe en esta sesión")
			return
		}
	}
	if in.Escena != "" {
		if in.Escena != sv.Escena && in.Parametro == nil {
			ponerParametroLive(l.ID, "")
		}
		sv.Escena = in.Escena
	}
	if in.Parametro != nil {
		ponerParametroLive(l.ID, *in.Parametro)
	}
	if in.Visible != nil {
		sv.Visible = *in.Visible
	}
	if err := s.DB.UpsertLiveSession(r.Context(), sv); err != nil {
		internal(w, err)
		return
	}
	s.live.publish(l.ID, "estado", liveView(sv, s.live.count(l.ID)))
	writeJSON(w, 200, liveView(sv, s.live.count(l.ID)))
}

// liveModoPut: PUT /api/v1/live/{lesson}/modo (staff) {"modo":"guiado|libre"}.
func (s *Server) liveModoPut(w http.ResponseWriter, r *http.Request, p *Principal) {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return
	}
	var in struct {
		Modo string `json:"modo"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.Modo != "guiado" && in.Modo != "libre" {
		badRequest(w, "el modo debe ser guiado o libre")
		return
	}
	sv, err := s.DB.LiveSession(r.Context(), l.ID)
	if err == store.ErrNotFound {
		sv = &store.LiveSession{LessonID: l.ID, Estado: "preparando", Visible: true}
	} else if err != nil {
		internal(w, err)
		return
	}
	sv.Modo = in.Modo
	if err := s.DB.UpsertLiveSession(r.Context(), sv); err != nil {
		internal(w, err)
		return
	}
	s.live.publish(l.ID, "estado", liveView(sv, s.live.count(l.ID)))
	writeJSON(w, 200, liveView(sv, s.live.count(l.ID)))
}

// readJSONAllowEmpty acepta {} o sin cuerpo (readJSON exige algo que decodificar).
func readJSONAllowEmpty(w http.ResponseWriter, r *http.Request, v any) bool {
	if r.Body == nil || r.ContentLength == 0 {
		return true
	}
	return readJSON(w, r, v)
}

// liveActivas: GET /api/v1/live (autenticado). Las clases con el LIVE en marcha que el usuario puede ver;
// el LMS lo consulta cada pocos segundos para mostrar «Clase en vivo · Entrar» en cualquier pantalla.
func (s *Server) liveActivas(w http.ResponseWriter, r *http.Request, p *Principal) {
	ids, err := s.DB.LivesActivas(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	out := []map[string]any{}
	for _, id := range ids {
		l := s.Content.Get().Lesson(id)
		if l == nil || s.visibleLesson(p, l) == nil {
			continue
		}
		out = append(out, map[string]any{"lesson_id": l.ID, "titulo": l.Title})
	}
	writeJSON(w, 200, out)
}
