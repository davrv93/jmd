package httpapi

import (
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/davrv93/jmd/lms/api/internal/skills"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Skills por alumno: cada cuenta guarda las suyas y nunca ve las de otra. Las del curso son de solo
// lectura y se copian a la cuenta para editarlas.

var reSlugSkill = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

const (
	maxSkillBytes   = 64 << 10 // cuerpo total de una skill
	maxSkillsAlumno = 100
	descMax         = 300  // descripción de una skill nueva
	descMaxCopia    = 1000 // las del curso traen descripciones más largas; se aceptan tal cual
)

// errSkill es un error de validación con su código de API.
type errSkill struct{ code, msg string }

func (e *errSkill) Error() string { return e.msg }

func esSlug(n string) bool { return len(n) >= 2 && len(n) <= 40 && reSlugSkill.MatchString(n) }

// validarSkill revisa el front matter (entre «---») de una skill nueva: name con forma de slug (2 a 40
// caracteres, minúsculas, dígitos y guiones), description de 10 a 300 caracteres y 64 KB como tope.
func validarSkill(cuerpo string) (nombre, descripcion string, err error) {
	return validarSkillTope(cuerpo, descMax)
}

func validarSkillTope(cuerpo string, topeDesc int) (nombre, descripcion string, err error) {
	if len(cuerpo) > maxSkillBytes {
		return "", "", &errSkill{"bad_request", "la skill pasa de 64 KB"}
	}
	nombre, descripcion, ok := skills.Cabecera(cuerpo)
	if !ok {
		return "", "", &errSkill{"bad_request", "falta el front matter: empieza con --- , name: y description: , y ciérralo con ---"}
	}
	if !esSlug(nombre) {
		return "", "", &errSkill{"bad_request", "name debe ser un slug de 2 a 40 caracteres: minúsculas, dígitos y guiones (ej. mi-skill)"}
	}
	if n := utf8.RuneCountInString(descripcion); n < 10 || n > topeDesc {
		return "", "", &errSkill{"bad_request", "description debe tener entre 10 y " + strconv.Itoa(topeDesc) + " caracteres"}
	}
	return nombre, descripcion, nil
}

func (s *Server) escribirErrSkill(w http.ResponseWriter, err error) {
	var e *errSkill
	if errors.As(err, &e) {
		writeErr(w, 400, e.code, e.msg)
		return
	}
	internal(w, err)
}

func modeloDestinoValido(m string) (string, bool) {
	if m == "" || m == "generico" {
		return "generico", true
	}
	_, ok := skills.PerfilPorID(m)
	return m, ok
}

func skillResumen(k *store.Skill) map[string]any {
	return map[string]any{
		"nombre": k.Nombre, "descripcion": k.Descripcion, "modelo_destino": k.ModeloDestino, "version": k.Version,
		"origen": k.Origen, "compartida": k.Compartida, "actualizada_en": k.ActualizadaEn.UTC().Format(time.RFC3339),
	}
}

func skillCompleta(k *store.Skill) map[string]any {
	m := skillResumen(k)
	m["cuerpo"], m["variantes"] = k.Cuerpo, k.Variantes
	return m
}

type skillIn struct {
	Cuerpo        string `json:"cuerpo"`
	ModeloDestino string `json:"modelo_destino"`
}

// misSkills: GET /api/v1/mis-skills.
func (s *Server) misSkills(w http.ResponseWriter, r *http.Request, p *Principal) {
	lista, err := s.DB.Skills(r.Context(), p.ID)
	if err != nil {
		internal(w, err)
		return
	}
	out := make([]map[string]any, 0, len(lista))
	for _, k := range lista {
		out = append(out, skillResumen(k))
	}
	writeJSON(w, 200, out)
}

// miSkill: GET /api/v1/mis-skills/{nombre}. Una skill ajena es un 404.
func (s *Server) miSkill(w http.ResponseWriter, r *http.Request, p *Principal) {
	k, err := s.DB.Skill(r.Context(), p.ID, r.PathValue("nombre"))
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "la skill")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, skillCompleta(k))
}

// crearSkill: POST /api/v1/mis-skills → 201; 409 si ya la tienes.
func (s *Server) crearSkill(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in skillIn
	if !readJSON(w, r, &in) {
		return
	}
	nombre, desc, err := validarSkill(in.Cuerpo)
	if err != nil {
		s.escribirErrSkill(w, err)
		return
	}
	modelo, ok := modeloDestinoValido(in.ModeloDestino)
	if !ok {
		badRequest(w, "modelo_destino no es un perfil conocido")
		return
	}
	if _, err := s.DB.Skill(r.Context(), p.ID, nombre); err == nil {
		writeErr(w, 409, "conflict", "ya tienes una skill con ese nombre")
		return
	} else if !errors.Is(err, store.ErrNotFound) {
		internal(w, err)
		return
	}
	if lista, err := s.DB.Skills(r.Context(), p.ID); err == nil && len(lista) >= maxSkillsAlumno {
		badRequest(w, "ya tienes el máximo de skills ("+strconv.Itoa(maxSkillsAlumno)+")")
		return
	}
	k := &store.Skill{UserID: p.ID, Nombre: nombre, Descripcion: desc, Cuerpo: in.Cuerpo, ModeloDestino: modelo, Variantes: skills.Variantes(in.Cuerpo), Origen: "propia"}
	if err := s.DB.UpsertSkill(r.Context(), k); err != nil {
		internal(w, err)
		return
	}
	s.montarSkills(r.Context(), p.ID)
	writeJSON(w, 201, skillCompleta(k))
}

// guardarSkill: PUT /api/v1/mis-skills/{nombre}. Si no es tuya (o no existe) → 403: no se distingue.
func (s *Server) guardarSkill(w http.ResponseWriter, r *http.Request, p *Principal) {
	url := r.PathValue("nombre")
	var in skillIn
	if !readJSON(w, r, &in) {
		return
	}
	actual, err := s.DB.Skill(r.Context(), p.ID, url)
	if errors.Is(err, store.ErrNotFound) {
		forbidden(w)
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	// Si no cambias la descripción de una copia del curso (más larga que 300), se acepta tal cual.
	tope := descMax
	if _, d, ok := skills.Cabecera(in.Cuerpo); ok && d == actual.Descripcion {
		tope = descMaxCopia
	}
	nombre, desc, err := validarSkillTope(in.Cuerpo, tope)
	if err != nil {
		s.escribirErrSkill(w, err)
		return
	}
	if nombre != url {
		writeErr(w, 400, "nombre_no_coincide", "el name del front matter ("+nombre+") no coincide con el de la URL ("+url+")")
		return
	}
	modelo, ok := modeloDestinoValido(in.ModeloDestino)
	if !ok {
		badRequest(w, "modelo_destino no es un perfil conocido")
		return
	}
	actual.Descripcion, actual.Cuerpo, actual.ModeloDestino, actual.Variantes = desc, in.Cuerpo, modelo, skills.Variantes(in.Cuerpo)
	if err := s.DB.UpsertSkill(r.Context(), actual); err != nil {
		internal(w, err)
		return
	}
	s.montarSkills(r.Context(), p.ID)
	writeJSON(w, 200, skillCompleta(actual))
}

// borrarSkill: DELETE /api/v1/mis-skills/{nombre} → 204. Si no es tuya (o no existe) → 403.
func (s *Server) borrarSkill(w http.ResponseWriter, r *http.Request, p *Principal) {
	err := s.DB.DeleteSkill(r.Context(), p.ID, r.PathValue("nombre"))
	if errors.Is(err, store.ErrNotFound) {
		forbidden(w)
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	s.montarSkills(r.Context(), p.ID)
	w.WriteHeader(204)
}

// skillsCurso: GET /api/v1/skills-curso. Solo lectura.
func (s *Server) skillsCurso(w http.ResponseWriter, r *http.Request, p *Principal) {
	writeJSON(w, 200, s.Content.Get().SkillsCurso(r.URL.Query().Get("course")))
}

// copiarSkill: POST /api/v1/mis-skills/{nombre}/copiar {"nuevo_nombre"?} → copia una del curso a tu cuenta.
func (s *Server) copiarSkill(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in struct {
		NuevoNombre string `json:"nuevo_nombre"`
	}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	origen := s.Content.Get().SkillCurso(r.PathValue("nombre"))
	if origen == nil {
		notFound(w, "la skill del curso")
		return
	}
	nombre := origen.Nombre
	cuerpo := origen.Cuerpo
	if n := strings.TrimSpace(in.NuevoNombre); n != "" && n != nombre {
		nombre, cuerpo = n, skills.ConNombre(cuerpo, n)
	}
	n, desc, err := validarSkillTope(cuerpo, descMaxCopia)
	if err != nil {
		s.escribirErrSkill(w, err)
		return
	}
	if n != nombre {
		badRequest(w, "la skill del curso no tiene un name válido")
		return
	}
	if _, err := s.DB.Skill(r.Context(), p.ID, nombre); err == nil {
		writeErr(w, 409, "conflict", "ya tienes una skill con ese nombre; usa nuevo_nombre")
		return
	} else if !errors.Is(err, store.ErrNotFound) {
		internal(w, err)
		return
	}
	k := &store.Skill{UserID: p.ID, Nombre: nombre, Descripcion: desc, Cuerpo: cuerpo, ModeloDestino: "generico", Variantes: skills.Variantes(cuerpo), Origen: "copiada"}
	if err := s.DB.UpsertSkill(r.Context(), k); err != nil {
		internal(w, err)
		return
	}
	s.montarSkills(r.Context(), p.ID)
	writeJSON(w, 201, skillCompleta(k))
}
