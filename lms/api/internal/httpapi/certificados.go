package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Certificados verificables. El personal emite uno por alumno y curso; cualquiera con el código
// puede verificarlo y descargar el PDF sin iniciar sesión (/api/v1/verificar/{codigo}). Los
// datos del emisor se guardan en settings (cert.*) y se congelan en snapshot_json al emitir,
// así que cambiarlos después no altera los certificados ya entregados.

const (
	keyCertEmisor     = "cert.emisor"
	keyCertRUC        = "cert.ruc"
	keyCertInstructor = "cert.instructor"
	keyCertCargo      = "cert.cargo"
	keyCertURL        = "cert.url"

	defaultCertEmisor = "Consultoría Digital"
	defaultCertRUC    = "10732672546"
	defaultCertHoras  = 6
	defaultClaseHoras = 2 // horas por defecto de una insignia de clase
)

// certSettings es la configuración vigente del emisor.
type certSettings struct {
	Emisor     string
	RUC        string
	Instructor string
	Cargo      string
	URL        string // base pública sin barra final
}

type certCache struct {
	mu     sync.Mutex
	loaded bool
	cfg    certSettings
}

var reRUC = regexp.MustCompile(`^[0-9]{11}$`)

// certConfig devuelve la configuración del emisor: lo guardado en la base y, si falta, los
// valores por defecto (emisor y RUC fijos, instructor = nombre del admin de arranque, URL =
// LMS_PUBLIC_URL).
func (s *Server) certConfig(ctx context.Context) (certSettings, error) {
	if s.cert == nil {
		s.cert = &certCache{}
	}
	s.cert.mu.Lock()
	defer s.cert.mu.Unlock()
	if s.cert.loaded {
		return s.cert.cfg, nil
	}
	cfg := certSettings{Emisor: defaultCertEmisor, RUC: defaultCertRUC, URL: strings.TrimRight(s.PublicURL, "/")}
	if s.DB != nil {
		for _, it := range []struct {
			key string
			dst *string
		}{{keyCertEmisor, &cfg.Emisor}, {keyCertRUC, &cfg.RUC}, {keyCertInstructor, &cfg.Instructor}, {keyCertCargo, &cfg.Cargo}, {keyCertURL, &cfg.URL}} {
			v, err := s.DB.Setting(ctx, it.key)
			if errors.Is(err, store.ErrNotFound) {
				continue
			}
			if err != nil {
				return certSettings{}, err
			}
			if strings.TrimSpace(v) != "" {
				*it.dst = v
			}
		}
		if cfg.Instructor == "" {
			// Primer admin dado de alta (la cuenta de LMS_ADMIN_*).
			if users, err := s.DB.Users(ctx); err == nil {
				for _, u := range users {
					if u.HasRole("admin") {
						cfg.Instructor = u.Name
						break
					}
				}
			}
		}
	}
	cfg.URL = strings.TrimRight(cfg.URL, "/")
	s.cert.cfg, s.cert.loaded = cfg, true
	return cfg, nil
}

func (s *Server) invalidarCert() {
	if s.cert == nil {
		return
	}
	s.cert.mu.Lock()
	s.cert.loaded = false
	s.cert.mu.Unlock()
}

func certConfigView(c certSettings) map[string]any {
	return map[string]any{"emisor": c.Emisor, "ruc": c.RUC, "instructor": c.Instructor, "cargo": c.Cargo, "url": c.URL}
}

// adminCertConfigGet: GET /api/v1/admin/certificados/config.
func (s *Server) adminCertConfigGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	cfg, err := s.certConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, certConfigView(cfg))
}

// adminCertConfigPut: PUT /api/v1/admin/certificados/config {emisor, ruc, instructor, cargo, url}.
func (s *Server) adminCertConfigPut(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		Emisor     string `json:"emisor"`
		RUC        string `json:"ruc"`
		Instructor string `json:"instructor"`
		Cargo      string `json:"cargo"`
		URL        string `json:"url"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Emisor, in.RUC, in.Instructor = strings.TrimSpace(in.Emisor), strings.TrimSpace(in.RUC), strings.TrimSpace(in.Instructor)
	in.Cargo, in.URL = strings.TrimSpace(in.Cargo), strings.TrimRight(strings.TrimSpace(in.URL), "/")
	if in.Emisor == "" {
		badRequest(w, "falta el nombre del emisor")
		return
	}
	if !reRUC.MatchString(in.RUC) {
		badRequest(w, "el RUC debe tener exactamente 11 dígitos")
		return
	}
	if in.Instructor == "" {
		badRequest(w, "falta el nombre del instructor que firma")
		return
	}
	if in.URL != "" && !urlValida(in.URL) {
		badRequest(w, "la URL pública debe empezar por http:// o https:// e incluir el servidor")
		return
	}
	if len([]rune(in.Cargo)) > 80 || len([]rune(in.Emisor)) > 120 || len([]rune(in.Instructor)) > 120 {
		badRequest(w, "texto demasiado largo (emisor e instructor 120, cargo 80 caracteres)")
		return
	}
	ctx := r.Context()
	for k, v := range map[string]string{keyCertEmisor: in.Emisor, keyCertRUC: in.RUC, keyCertInstructor: in.Instructor, keyCertCargo: in.Cargo, keyCertURL: in.URL} {
		if err := s.DB.SetSetting(ctx, k, v); err != nil {
			internal(w, err)
			return
		}
	}
	s.invalidarCert()
	cfg, err := s.certConfig(ctx)
	if err != nil {
		internal(w, err)
		return
	}
	slog.Info("configuración de certificados cambiada", "por", p.Email, "emisor", cfg.Emisor, "ruc", cfg.RUC, "instructor", cfg.Instructor)
	writeJSON(w, 200, certConfigView(cfg))
}

// --- emisión -------------------------------------------------------------------------------

// certSnapshot son los datos congelados al emitir (van en snapshot_json).
type certSnapshot struct {
	Alumno     string `json:"alumno"`
	Curso      string `json:"curso"`
	CursoSlug  string `json:"curso_slug"`
	Emisor     string `json:"emisor"`
	RUC        string `json:"ruc"`
	Instructor string `json:"instructor"`
	Cargo      string `json:"cargo"`
	Horas      int    `json:"horas"`
	URL        string `json:"url"`
	Salt       string `json:"salt"` // sal del hash de identidad de la insignia (Open Badges)

	// Insignia de clase (lesson_id no vacío): número de orden en el curso y título de la clase.
	LessonID string `json:"lesson_id,omitempty"`
	ClaseNum int    `json:"clase_num,omitempty"`
	Clase    string `json:"clase,omitempty"`
}

func parseSnapshot(c *store.Certificate) certSnapshot {
	var sn certSnapshot
	_ = json.Unmarshal([]byte(c.Snapshot), &sn)
	if sn.Horas == 0 {
		sn.Horas = c.Horas
	}
	return sn
}

// Alfabeto del código público: mayúsculas y dígitos sin O/0/I/1, para leerlo y dictarlo sin dudas.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// newCertCode genera CD-<año>-<6 caracteres>.
func newCertCode(year int) string {
	var b [6]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	out := make([]byte, 6)
	for i, x := range b {
		out[i] = codeAlphabet[int(x)%len(codeAlphabet)]
	}
	return fmt.Sprintf("CD-%d-%s", year, out)
}

var reCode = regexp.MustCompile(`^CD-[0-9]{4}-[A-Z2-9]{6}$`)

// normCode admite minúsculas y espacios alrededor; devuelve "" si el formato no cuadra.
func normCode(raw string) string {
	c := strings.ToUpper(strings.TrimSpace(raw))
	if !reCode.MatchString(c) {
		return ""
	}
	return c
}

var tiposCert = map[string]string{"participacion": "de participación", "aprobacion": "de aprobación"}

// certIn son los parámetros de emisión comunes al alta individual y al lote.
type certIn struct {
	CourseID string `json:"course_id"`
	LessonID string `json:"lesson_id"` // vacío = certificado del curso completo
	Tipo     string `json:"tipo"`
	Horas    *int   `json:"horas"`
	Nota     string `json:"nota"`
}

// certAmbito es lo que se emite: el curso y, si es insignia de clase, la clase y su número.
type certAmbito struct {
	Curso *content.Course
	Clase *content.Lesson // nil = curso completo
	Num   int             // número de orden de la clase en el curso (1..n)
}

func (a certAmbito) lessonID() string {
	if a.Clase == nil {
		return ""
	}
	return a.Clase.ID
}

// validarCertIn normaliza tipo/horas/nota y resuelve curso y clase. Devuelve el mensaje de error
// para 400 y el código 404 ("el curso"/"la clase") cuando no existen.
func (s *Server) validarCertIn(in *certIn) (certAmbito, int, string) {
	in.Tipo = strings.TrimSpace(in.Tipo)
	if in.Tipo == "" {
		in.Tipo = "participacion"
	}
	if _, ok := tiposCert[in.Tipo]; !ok {
		return certAmbito{}, 400, "tipo: participacion o aprobacion"
	}
	in.Nota = strings.TrimSpace(in.Nota)
	if len([]rune(in.Nota)) > 200 {
		return certAmbito{}, 400, "nota: 200 caracteres como mucho"
	}
	c := s.Content.Get().Course(strings.TrimSpace(in.CourseID))
	if c == nil {
		return certAmbito{}, 404, "el curso"
	}
	a := certAmbito{Curso: c}
	in.LessonID = strings.TrimSpace(in.LessonID)
	if in.LessonID != "" {
		a.Clase, a.Num = lessonEnCurso(c, in.LessonID)
		if a.Clase == nil {
			return certAmbito{}, 404, "la clase"
		}
	}
	horas := defaultCertHoras
	if a.Clase != nil {
		horas = defaultClaseHoras
	}
	if in.Horas != nil {
		horas = *in.Horas
	}
	if horas < 1 || horas > 2000 {
		return certAmbito{}, 400, "horas: entre 1 y 2000"
	}
	in.Horas = &horas
	return a, 0, ""
}

// lessonEnCurso busca la clase dentro del curso y devuelve su número de orden (1..n).
func lessonEnCurso(c *content.Course, lessonID string) (*content.Lesson, int) {
	n := 0
	for _, m := range c.Modules {
		for _, l := range m.Lessons {
			n++
			if l.ID == lessonID {
				return l, n
			}
		}
	}
	return nil, 0
}

var rePrefijoClase = regexp.MustCompile(`^(?i)(clase|sesi[oó]n)\s*[0-9]+\s*[·:.-]\s*`)

// tituloClase arma «Clase N · <título>» sin duplicar el prefijo si el título ya lo trae.
func tituloClase(num int, titulo string) string {
	t := rePrefijoClase.ReplaceAllString(strings.TrimSpace(titulo), "")
	return fmt.Sprintf("Clase %d · %s", num, t)
}

// errYaEmitido: el alumno ya tiene un certificado vigente en ese ámbito.
type errYaEmitido struct{ Codigo string }

func (e errYaEmitido) Error() string { return "ya emitido: " + e.Codigo }

// emitir crea el certificado para un alumno en el ámbito dado. Comprueba la unicidad por
// (alumno, curso, clase), congela el snapshot y reintenta el código si colisiona.
func (s *Server) emitir(ctx context.Context, u *store.User, a certAmbito, in certIn, p *Principal) (*store.Certificate, error) {
	if prev, err := s.DB.ActiveCertificate(ctx, u.ID, a.Curso.ID, a.lessonID()); err == nil {
		return prev, errYaEmitido{prev.ID}
	} else if !errors.Is(err, store.ErrNotFound) {
		return nil, err
	}
	cfg, err := s.certConfig(ctx)
	if err != nil {
		return nil, err
	}
	var salt [16]byte
	_, _ = rand.Read(salt[:])
	sn := certSnapshot{Alumno: u.Name, Curso: a.Curso.Title, CursoSlug: a.Curso.Slug, Emisor: cfg.Emisor, RUC: cfg.RUC,
		Instructor: cfg.Instructor, Cargo: cfg.Cargo, Horas: *in.Horas, URL: cfg.URL, Salt: hex.EncodeToString(salt[:])}
	if a.Clase != nil {
		sn.LessonID, sn.ClaseNum, sn.Clase = a.Clase.ID, a.Num, tituloClase(a.Num, a.Clase.Title)
	}
	snb, _ := json.Marshal(sn)
	var cert *store.Certificate
	for i := 0; i < 5; i++ {
		cert = &store.Certificate{ID: newCertCode(time.Now().UTC().Year()), UserID: u.ID, CourseID: a.Curso.ID, LessonID: a.lessonID(),
			Tipo: in.Tipo, Horas: *in.Horas, Nota: in.Nota, EmitidoPor: p.ID, Snapshot: string(snb)}
		err = s.DB.CreateCertificate(ctx, cert)
		if !errors.Is(err, store.ErrDuplicate) {
			break
		}
	}
	if err != nil {
		return nil, err
	}
	return cert, nil
}

// emitirCertificado: POST /api/v1/admin/certificados {user_id, course_id, lesson_id?, tipo, horas, nota?}.
// Con lesson_id emite una insignia de clase (horas por defecto 2). 409 si el alumno ya tiene uno
// vigente en ese ámbito (devuelve el código existente).
func (s *Server) emitirCertificado(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		UserID string `json:"user_id"`
		certIn
	}
	if !readJSON(w, r, &in) {
		return
	}
	a, code, msg := s.validarCertIn(&in.certIn)
	switch code {
	case 400:
		badRequest(w, msg)
		return
	case 404:
		notFound(w, msg)
		return
	}
	ctx := r.Context()
	u, err := s.DB.UserByID(ctx, in.UserID)
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "el alumno")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	cert, err := s.emitir(ctx, u, a, in.certIn, p)
	var ya errYaEmitido
	if errors.As(err, &ya) {
		var e apiError
		e.Error.Code, e.Error.Message = "ya_emitido", "el alumno ya tiene el certificado "+ya.Codigo+" en este "+ambitoTexto(a)
		writeJSON(w, 409, map[string]any{"error": e.Error, "codigo": ya.Codigo})
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	slog.Info("certificado emitido", "codigo", cert.ID, "alumno", u.Email, "curso", a.Curso.ID, "clase", a.lessonID(), "tipo", in.Tipo, "por", p.Email)
	writeJSON(w, 201, s.certView(cert, true))
}

func ambitoTexto(a certAmbito) string {
	if a.Clase != nil {
		return "clase"
	}
	return "curso"
}

// emitirLote: POST /api/v1/admin/certificados/lote {course_id, lesson_id?, tipo, horas?, nota?,
// solo_con_progreso}. Emite a todos los alumnos (rol student) de las cohortes del curso que aún
// no tengan uno vigente en ese ámbito. Con solo_con_progreso, solo a quienes tengan al menos un
// paso del ciclo marcado en la clase (o en alguna clase del curso, si es el certificado del curso).
func (s *Server) emitirLote(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		certIn
		SoloConProgreso bool `json:"solo_con_progreso"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	a, code, msg := s.validarCertIn(&in.certIn)
	switch code {
	case 400:
		badRequest(w, msg)
		return
	case 404:
		notFound(w, msg)
		return
	}
	ctx := r.Context()
	users, err := s.DB.Users(ctx)
	if err != nil {
		internal(w, err)
		return
	}
	var progreso map[string]map[string]int
	if in.SoloConProgreso {
		var ids []string
		if a.Clase != nil {
			ids = []string{a.Clase.ID}
		} else {
			for _, m := range a.Curso.Modules {
				for _, l := range m.Lessons {
					ids = append(ids, l.ID)
				}
			}
		}
		if progreso, err = s.DB.ProgressByUser(ctx, ids); err != nil {
			internal(w, err)
			return
		}
	}
	type emitido struct {
		Codigo string `json:"codigo"`
		Alumno string `json:"alumno"`
		UserID string `json:"user_id"`
		Email  string `json:"email"`
	}
	type omitido struct {
		Alumno string `json:"alumno"`
		UserID string `json:"user_id"`
		Email  string `json:"email"`
		Motivo string `json:"motivo"`
		Codigo string `json:"codigo,omitempty"`
	}
	emitidos, omitidos := []emitido{}, []omitido{}
	for _, u := range users {
		if !u.HasRole("student") || !s.canSeeCourse(&Principal{Roles: u.Roles, Cohorts: u.Cohorts}, a.Curso) {
			continue
		}
		if in.SoloConProgreso {
			n := 0
			for _, k := range progreso[u.ID] {
				n += k
			}
			if n == 0 {
				omitidos = append(omitidos, omitido{Alumno: u.Name, UserID: u.ID, Email: u.Email, Motivo: "sin progreso en la " + ambitoTexto(a)})
				continue
			}
		}
		cert, err := s.emitir(ctx, u, a, in.certIn, p)
		var ya errYaEmitido
		if errors.As(err, &ya) {
			omitidos = append(omitidos, omitido{Alumno: u.Name, UserID: u.ID, Email: u.Email, Motivo: "ya tiene uno vigente", Codigo: ya.Codigo})
			continue
		}
		if err != nil {
			internal(w, err)
			return
		}
		emitidos = append(emitidos, emitido{Codigo: cert.ID, Alumno: u.Name, UserID: u.ID, Email: u.Email})
	}
	slog.Info("certificados emitidos en lote", "por", p.Email, "curso", a.Curso.ID, "clase", a.lessonID(), "tipo", in.Tipo,
		"horas", *in.Horas, "solo_con_progreso", in.SoloConProgreso, "emitidos", len(emitidos), "omitidos", len(omitidos))
	writeJSON(w, 200, map[string]any{"course_id": a.Curso.ID, "lesson_id": a.lessonID(), "emitidos": emitidos, "omitidos": omitidos})
}

// certView arma la ficha de un certificado. priv añade user_id, email, nota y emitido_por (solo
// personal o el propio alumno); la vista pública nunca los lleva.
func (s *Server) certView(c *store.Certificate, priv bool) map[string]any {
	sn := parseSnapshot(c)
	base := sn.URL
	if base == "" {
		base = strings.TrimRight(s.PublicURL, "/")
	}
	estado := "valido"
	var anulado any
	if c.Anulado() {
		estado = "anulado"
		anulado = c.AnuladoEn.UTC().Format(time.RFC3339)
	}
	insignia := base + "/api/v1/insignias/" + c.CourseID
	ambito := "curso"
	if c.LessonID != "" {
		insignia += "/" + c.LessonID
		ambito = "clase"
	}
	out := map[string]any{
		"codigo": c.ID, "estado": estado, "alumno": sn.Alumno, "curso": sn.Curso, "course_id": c.CourseID,
		"ambito": ambito, "lesson_id": c.LessonID, "clase": sn.Clase, "clase_num": sn.ClaseNum,
		"tipo": c.Tipo, "tipo_texto": tiposCert[c.Tipo], "horas": sn.Horas, "emisor": sn.Emisor, "ruc": sn.RUC,
		"instructor": sn.Instructor, "cargo": sn.Cargo, "emitido_en": c.EmitidoEn.UTC().Format(time.RFC3339), "anulado_en": anulado,
		"url_verificar": base + "/verificar/" + c.ID + "/", "url_pdf": base + "/api/v1/certificados/" + c.ID + "/pdf",
		"url_badge": base + "/api/v1/certificados/" + c.ID + "/badge.json", "url_badge_jwt": base + "/api/v1/certificados/" + c.ID + "/badge.jwt",
		"url_insignia": insignia + ".svg", "url_insignia_png": insignia + ".png",
	}
	if priv {
		out["user_id"], out["nota"], out["emitido_por"] = c.UserID, c.Nota, c.EmitidoPor
	}
	return out
}

// listarCertificados: GET /api/v1/admin/certificados?course=<id> (personal).
func (s *Server) listarCertificados(w http.ResponseWriter, r *http.Request, p *Principal) {
	course := r.URL.Query().Get("course")
	if course != "" {
		if c := s.Content.Get().Course(course); c != nil {
			course = c.ID
		}
	}
	list, err := s.DB.Certificates(r.Context(), course, "")
	if err != nil {
		internal(w, err)
		return
	}
	out := make([]map[string]any, 0, len(list))
	for _, c := range list {
		out = append(out, s.certView(c, true))
	}
	writeJSON(w, 200, out)
}

// anularCertificado: POST /api/v1/admin/certificados/{codigo}/anular (admin).
func (s *Server) anularCertificado(w http.ResponseWriter, r *http.Request, p *Principal) {
	code := normCode(r.PathValue("codigo"))
	if code == "" {
		notFound(w, "el certificado")
		return
	}
	err := s.DB.RevokeCertificate(r.Context(), code)
	if errors.Is(err, store.ErrNotFound) {
		if c, e2 := s.DB.Certificate(r.Context(), code); e2 == nil && c.Anulado() {
			writeErr(w, 409, "ya_anulado", "el certificado ya estaba anulado")
			return
		}
		notFound(w, "el certificado")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	c, err := s.DB.Certificate(r.Context(), code)
	if err != nil {
		internal(w, err)
		return
	}
	slog.Info("certificado anulado", "codigo", code, "por", p.Email)
	writeJSON(w, 200, s.certView(c, true))
}

// misCertificados: GET /api/v1/certificados (alumno autenticado: solo los suyos).
func (s *Server) misCertificados(w http.ResponseWriter, r *http.Request, p *Principal) {
	list, err := s.DB.Certificates(r.Context(), "", p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	out := make([]map[string]any, 0, len(list))
	for _, c := range list {
		out = append(out, s.certView(c, true))
	}
	writeJSON(w, 200, out)
}

// verificar: GET /api/v1/verificar/{codigo} (público). Nunca devuelve email ni nota.
func (s *Server) verificar(w http.ResponseWriter, r *http.Request) {
	code := normCode(r.PathValue("codigo"))
	noExiste := func() {
		writeJSON(w, 200, map[string]any{"codigo": strings.ToUpper(strings.TrimSpace(r.PathValue("codigo"))), "estado": "no_existe"})
	}
	if code == "" {
		noExiste()
		return
	}
	c, err := s.DB.Certificate(r.Context(), code)
	if errors.Is(err, store.ErrNotFound) {
		noExiste()
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, s.certView(c, false))
}

// certificadoPDF: GET /api/v1/certificados/{codigo}/pdf (público: quien tiene el código).
func (s *Server) certificadoPDF(w http.ResponseWriter, r *http.Request) {
	code := normCode(r.PathValue("codigo"))
	if code == "" {
		notFound(w, "el certificado")
		return
	}
	c, err := s.DB.Certificate(r.Context(), code)
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "el certificado")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	sn := parseSnapshot(c)
	base := sn.URL
	if base == "" {
		base = strings.TrimRight(s.PublicURL, "/")
	}
	pdf, err := renderCertPDF(certPDFData{
		Codigo: c.ID, Alumno: sn.Alumno, Curso: sn.Curso, Tipo: c.Tipo, Horas: sn.Horas, Emisor: sn.Emisor, RUC: sn.RUC,
		Instructor: sn.Instructor, Cargo: sn.Cargo, EmitidoEn: c.EmitidoEn, Anulado: c.Anulado(), Base: base,
		Clase: sn.Clase, ClaseNum: sn.ClaseNum,
	})
	if err != nil {
		internal(w, err)
		return
	}
	servePDF(w, "certificado-"+c.ID+".pdf", pdf)
}

// muestraPDF: GET /api/v1/admin/certificados/muestra.pdf (admin): vista previa con datos ficticios
// y la configuración actual del emisor.
func (s *Server) muestraPDF(w http.ResponseWriter, r *http.Request, p *Principal) {
	cfg, err := s.certConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	curso := "Programación agéntica (vibecoding)"
	if cs := s.Content.Get().Courses(); len(cs) > 0 {
		curso = cs[0].Title
	}
	pdf, err := renderCertPDF(certPDFData{
		Codigo: "CD-" + fmt.Sprint(time.Now().UTC().Year()) + "-MUESTR", Alumno: "Ana María Quispe Huamán", Curso: curso, Tipo: "participacion",
		Horas: defaultCertHoras, Emisor: cfg.Emisor, RUC: cfg.RUC, Instructor: cfg.Instructor, Cargo: cfg.Cargo,
		EmitidoEn: time.Now(), Base: cfg.URL, Muestra: true,
	})
	if err != nil {
		internal(w, err)
		return
	}
	servePDF(w, "certificado-muestra.pdf", pdf)
}

func servePDF(w http.ResponseWriter, name string, b []byte) {
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", name))
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(200)
	_, _ = w.Write(b)
}
