package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
	"github.com/davrv93/jmd/lms/api/internal/skills"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Montaje de las skills propias en el contenedor del alumno.
//
// Dónde: /trabajo/skills/<nombre>/SKILL.md. El home del alumno es un tmpfs de 32 MB y
// ~/.config/jmd/skills apunta (solo lectura) a las 14 del curso en /opt/skills-curso, así que ahí no
// se puede escribir. jmd busca las skills del PROYECTO en «skills/» del directorio donde corre
// (src/bin/jmd/skills.rs, `discover`), y la terminal del aula arranca en /trabajo: por eso
// /trabajo/skills/ es una ruta que jmd descubre sola, sin configuración, y que además queda en el
// volumen del alumno (sobrevive a recrear el contenedor).
//
// Cada carpeta montada lleva un archivo vacío «.lms»: así se sabe cuáles escribió el LMS (y se
// pueden quitar al borrar la skill) y cuáles creó el alumno desde la terminal (esas se detectan y se
// ofrecen para importar, pero nunca se borran).

const rutaSkillsAula = "/trabajo/skills"

var montajeLock sync.Map // userID → *sync.Mutex

// textoMontado es lo que se escribe en el contenedor: la variante del modelo destino de la skill si
// existe, y si no el cuerpo completo.
func textoMontado(k *store.Skill) string {
	if _, ok := skills.PerfilPorID(k.ModeloDestino); ok {
		if v := k.Variantes[k.ModeloDestino]; strings.TrimSpace(v) != "" {
			return v
		}
	}
	return k.Cuerpo
}

// montarSkills escribe las skills PROPIAS del alumno en su contenedor (solo si está corriendo) y quita las
// que el LMS montó antes y ya no están en su cuenta. Nunca toca el contenedor de otro alumno: el
// contenedor sale del userID y la consulta lleva el userID en el WHERE.
func (s *Server) montarSkills(ctx context.Context, userID string) {
	if s.Aula == nil || s.DB == nil || s.Aula.Estado(ctx, userID) != "corriendo" {
		return
	}
	mu, _ := montajeLock.LoadOrStore(userID, &sync.Mutex{})
	mu.(*sync.Mutex).Lock()
	defer mu.(*sync.Mutex).Unlock()
	lista, err := s.DB.Skills(ctx, userID)
	if err != nil {
		return
	}
	cont := aula.Nombre(userID)
	var keep []string
	for _, k := range lista {
		if !esSlug(k.Nombre) { // el nombre va dentro de un script: solo slugs
			continue
		}
		keep = append(keep, k.Nombre)
		script := fmt.Sprintf(`d=%s/%s; mkdir -p "$d" && cat > "$d/SKILL.md" && : > "$d/.lms"`, rutaSkillsAula, k.Nombre)
		_, _ = s.Aula.ExecStdin(ctx, cont, script, []byte(textoMontado(k)))
	}
	sort.Strings(keep)
	limpiar := fmt.Sprintf(`keep=" %s "; cd %s 2>/dev/null || exit 0; for d in *; do [ -f "$d/.lms" ] || continue; case "$keep" in *" $d "*) ;; *) rm -rf "$d";; esac; done`,
		strings.Join(keep, " "), rutaSkillsAula)
	_, _ = s.Aula.Exec(ctx, cont, limpiar)
}

// skillsDetectadas lista las carpetas de /trabajo/skills con SKILL.md que el alumno creó (sin la marca
// «.lms») y no están en su cuenta.
func (s *Server) skillsDetectadas(ctx context.Context, userID string) []string {
	if s.Aula == nil || s.Aula.Estado(ctx, userID) != "corriendo" {
		return nil
	}
	out, err := s.Aula.Exec(ctx, aula.Nombre(userID),
		fmt.Sprintf(`for d in %s/*/; do [ -f "${d}SKILL.md" ] && [ ! -f "${d}.lms" ] && basename "$d"; done; true`, rutaSkillsAula))
	if err != nil {
		return nil
	}
	propias, err := s.DB.Skills(ctx, userID)
	if err != nil {
		return nil
	}
	tengo := map[string]bool{}
	for _, k := range propias {
		tengo[k.Nombre] = true
	}
	res := []string{}
	for _, n := range strings.Fields(out) {
		if esSlug(n) && !tengo[n] {
			res = append(res, n)
		}
	}
	return res
}

// misSkillsDetectadas: GET /api/v1/mis-skills/detectadas → {"nombres":[…]}.
func (s *Server) misSkillsDetectadas(w http.ResponseWriter, r *http.Request, p *Principal) {
	writeJSON(w, 200, map[string]any{"nombres": s.skillsDetectadas(r.Context(), p.ID)})
}

// importarSkill: POST /api/v1/mis-skills/importar {"nombre"} lee /trabajo/skills/<nombre>/SKILL.md del
// contenedor del propio alumno y la guarda en su cuenta.
func (s *Server) importarSkill(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.aulaListo(w) {
		return
	}
	var in struct {
		Nombre string `json:"nombre"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if !esSlug(in.Nombre) {
		badRequest(w, "nombre inválido: usa un slug (minúsculas, dígitos y guiones)")
		return
	}
	if s.Aula.Estado(r.Context(), p.ID) != "corriendo" {
		writeErr(w, 409, "sin_aula", "primero inicia tu aula")
		return
	}
	raw, err := s.Aula.Leer(r.Context(), aula.Nombre(p.ID), "skills/"+in.Nombre+"/SKILL.md", maxSkillBytes)
	if err != nil {
		notFound(w, "la skill en tu terminal")
		return
	}
	nombre, desc, err := validarSkillTope(string(raw), descMaxCopia)
	if err != nil {
		s.escribirErrSkill(w, err)
		return
	}
	if nombre != in.Nombre {
		writeErr(w, 400, "nombre_no_coincide", "el name del front matter ("+nombre+") no coincide con la carpeta ("+in.Nombre+")")
		return
	}
	if _, err := s.DB.Skill(r.Context(), p.ID, nombre); err == nil {
		writeErr(w, 409, "conflict", "ya tienes una skill con ese nombre")
		return
	}
	k := &store.Skill{UserID: p.ID, Nombre: nombre, Descripcion: desc, Cuerpo: string(raw), ModeloDestino: "generico", Variantes: skills.Variantes(string(raw)), Origen: "importada"}
	if err := s.DB.UpsertSkill(r.Context(), k); err != nil {
		internal(w, err)
		return
	}
	s.montarSkills(r.Context(), p.ID)
	writeJSON(w, 201, skillCompleta(k))
}

// publishUsuarioTodas manda un evento a un alumno en cualquier lección que tenga abierta.
func (h *liveHub) publishUsuarioTodas(userID, event string, data any) {
	h.mu.Lock()
	lecciones := make([]string, 0, len(h.subs))
	for l := range h.subs {
		lecciones = append(lecciones, l)
	}
	h.mu.Unlock()
	for _, l := range lecciones {
		h.publishUser(l, userID, event, data)
	}
}

var skillsAvisadas = struct {
	sync.Mutex
	v map[string]bool // userID + "/" + nombre
}{v: map[string]bool{}}

// avisarSkillsNuevas revisa los contenedores de quien usó su aula hace poco y avisa (evento skill_nueva)
// de las skills creadas desde la terminal que aún no están en su cuenta. Una vez por skill.
func (s *Server) avisarSkillsNuevas(ctx context.Context) {
	if s.Aula == nil || s.live == nil {
		return
	}
	ultimoUsoAula.Lock()
	ids := make([]string, 0, len(ultimoUsoAula.t))
	for id := range ultimoUsoAula.t {
		ids = append(ids, id)
	}
	ultimoUsoAula.Unlock()
	for _, id := range ids {
		nuevas := s.skillsDetectadas(ctx, id)
		skillsAvisadas.Lock()
		for k := range skillsAvisadas.v {
			if strings.HasPrefix(k, id+"/") && !contiene(nuevas, strings.TrimPrefix(k, id+"/")) {
				delete(skillsAvisadas.v, k) // ya la importó o la borró
			}
		}
		var avisar []string
		for _, n := range nuevas {
			if !skillsAvisadas.v[id+"/"+n] {
				skillsAvisadas.v[id+"/"+n] = true
				avisar = append(avisar, n)
			}
		}
		skillsAvisadas.Unlock()
		for _, n := range avisar {
			s.live.publishUsuarioTodas(id, "skill_nueva", map[string]string{"nombre": n})
		}
	}
}

func contiene(l []string, x string) bool {
	for _, v := range l {
		if v == x {
			return true
		}
	}
	return false
}

// vigilarSkills busca cada 30 s skills creadas desde la terminal. Se detiene con ctx.
func (s *Server) vigilarSkills(ctx context.Context) {
	go func() {
		t := time.NewTicker(30 * time.Second)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				s.avisarSkillsNuevas(ctx)
			}
		}
	}()
}
