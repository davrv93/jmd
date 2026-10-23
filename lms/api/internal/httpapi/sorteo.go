package httpapi

import (
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Sorteo de cupos para un curso nuevo: el formulario pide el correo con el
// que el alumno se registró (debe existir en users). Ganan 6 personas como
// máximo dentro de la ventana; al sortear, cada ganador entra a la cohorte
// del premio automáticamente.

// Sorteo describe una rifa. Hoy hay una; el mapa deja abrir otras.
type Sorteo struct {
	ID           string
	Titulo       string
	Subtitulo    string
	Descripcion  string
	Flyer        string // ruta pública del flyer
	CursoID      string
	Cohorte      string
	MaxGanadores int
	Inicia       time.Time
	Termina      time.Time
}

var lima = time.FixedZone("PET", -5*3600)

var sorteos = map[string]Sorteo{
	"potencia-agentes": {
		ID:           "potencia-agentes",
		Titulo:       "⚡ Menos tokens. Más poder",
		Subtitulo:    "Potencia tus agentes con RTK, Cortex, Graphify y Caveman",
		Descripcion:  "Sorteo de 6 cupos para el taller nuevo. Participa con el correo con el que te registraste en los cursos. Solo se puede ganar una vez y el sorteo cierra en 4 días.",
		Flyer:        "/sorteo-potencia.jpg",
		CursoID:      "potencia-agentes",
		Cohorte:      "potencia-agentes-1",
		MaxGanadores: 6,
		Inicia:       time.Date(2026, 10, 22, 0, 0, 0, 0, lima),
		Termina:      time.Date(2026, 10, 26, 23, 59, 59, 0, lima),
	},
}

func sorteoAbierto(s Sorteo, ahora time.Time) bool {
	return !ahora.Before(s.Inicia) && !ahora.After(s.Termina)
}

// nombreCorto: "Auner Llamo" → "Auner L." (lo público no muestra el correo).
func sorteoNombre(nombre string) string {
	p := strings.Fields(nombre)
	if len(p) == 0 {
		return "Participante"
	}
	if len(p) == 1 {
		return p[0]
	}
	ini := []rune(p[1])
	return p[0] + " " + string(ini[:1]) + "."
}

// correoMascarado: "auner0511@gmail.com" → "a***@gmail.com".
func correoMascarado(email string) string {
	p := strings.SplitN(email, "@", 2)
	if len(p) != 2 || p[0] == "" {
		return "***"
	}
	return string([]rune(p[0])[:1]) + "***@" + p[1]
}

// sorteoInfo: GET /api/v1/sorteo/{id} (público) → el sorteo, cuántos van y quiénes ganaron.
func (s *Server) sorteoInfo(w http.ResponseWriter, r *http.Request) {
	def, ok := sorteos[strings.TrimSpace(r.PathValue("id"))]
	if !ok {
		notFound(w, "ese sorteo no existe")
		return
	}
	part, err := s.DB.SorteoParticipantes(r.Context(), def.ID)
	if err != nil {
		internal(w, err)
		return
	}
	gans, err := s.DB.SorteoGanadores(r.Context(), def.ID)
	if err != nil {
		internal(w, err)
		return
	}
	ahora := time.Now()
	abierto := sorteoAbierto(def, ahora) && len(gans) < def.MaxGanadores
	pubs := []map[string]any{}
	for _, g := range gans {
		pubs = append(pubs, map[string]any{"nombre": sorteoNombre(g.Nombre), "correo": correoMascarado(g.Email), "posicion": g.Posicion})
	}
	writeJSON(w, 200, map[string]any{
		"id": def.ID, "titulo": def.Titulo, "subtitulo": def.Subtitulo, "descripcion": def.Descripcion,
		"flyer": def.Flyer, "max_ganadores": def.MaxGanadores,
		"inicia": def.Inicia.Format("2006-01-02"), "termina": def.Termina.Format("2006-01-02"),
		"abierto": abierto, "participantes": len(part), "ganadores": pubs,
		"quedan": max(0, def.MaxGanadores-len(gans)),
	})
}

// sorteoParticipar: POST /api/v1/sorteo/{id}/participar {email} → anota una vez.
// El correo debe existir en la plataforma (es con el que se registró al curso).
func (s *Server) sorteoParticipar(w http.ResponseWriter, r *http.Request) {
	def, ok := sorteos[strings.TrimSpace(r.PathValue("id"))]
	if !ok {
		notFound(w, "ese sorteo no existe")
		return
	}
	if !sorteoAbierto(def, time.Now()) {
		writeErr(w, 410, "cerrado", "el sorteo ya cerró")
		return
	}
	var in struct {
		Email string `json:"email"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if !validEmail(in.Email) {
		badRequest(w, "escribe un correo válido")
		return
	}
	u, err := s.DB.UserByEmail(r.Context(), in.Email)
	if err != nil {
		writeErr(w, 404, "sin_registro", "ese correo no está registrado en ningún curso: regístrate primero y vuelve")
		return
	}
	if err := s.DB.SorteoParticipar(r.Context(), def.ID, u.ID, u.Email); err != nil {
		if store.YaInscrito(err) {
			writeErr(w, 409, "ya_participa", "ese correo ya está participando: cada correo juega una vez")
			return
		}
		internal(w, err)
		return
	}
	part, _ := s.DB.SorteoParticipantes(r.Context(), def.ID)
	writeJSON(w, 201, map[string]any{"ok": true, "participantes": len(part)})
}

// sorteoSortear: POST /api/v1/sorteo/{id}/sortear (staff) {cantidad?} → elige al
// azar entre los anotados (sin repetir ganadores), los mete a la cohorte del
// premio y devuelve quiénes salieron. Como máximo MaxGanadores en total.
func (s *Server) sorteoSortear(w http.ResponseWriter, r *http.Request, p *Principal) {
	def, ok := sorteos[strings.TrimSpace(r.PathValue("id"))]
	if !ok {
		notFound(w, "ese sorteo no existe")
		return
	}
	var in struct {
		Cantidad int `json:"cantidad"`
	}
	_ = readJSONAllowEmpty(w, r, &in)
	part, err := s.DB.SorteoParticipantes(r.Context(), def.ID)
	if err != nil {
		internal(w, err)
		return
	}
	gans, err := s.DB.SorteoGanadores(r.Context(), def.ID)
	if err != nil {
		internal(w, err)
		return
	}
	restan := def.MaxGanadores - len(gans)
	if restan <= 0 {
		writeErr(w, 409, "completo", "ya salieron los 6 ganadores")
		return
	}
	ya := map[string]bool{}
	for _, g := range gans {
		ya[g.UserID] = true
	}
	var bolsa []store.SorteoParticipante
	for _, c := range part {
		if !ya[c.UserID] {
			bolsa = append(bolsa, c)
		}
	}
	if len(bolsa) == 0 {
		writeErr(w, 409, "sin_candidatos", "no hay participantes nuevos para sortear")
		return
	}
	n := in.Cantidad
	if n <= 0 || n > restan {
		n = restan
	}
	if n > len(bolsa) {
		n = len(bolsa)
	}
	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
	rnd.Shuffle(len(bolsa), func(i, j int) { bolsa[i], bolsa[j] = bolsa[j], bolsa[i] })
	salieron := []map[string]any{}
	for i, c := range bolsa[:n] {
		pos := len(gans) + i + 1
		if err := s.DB.SorteoAgregarGanador(r.Context(), def.ID, c.UserID, c.Email, c.Nombre, pos); err != nil {
			internal(w, err)
			return
		}
		// El premio entra solo: suma la cohorte sin quitar las que ya tenía.
		if u, err := s.DB.UserByID(r.Context(), c.UserID); err == nil {
			cohorts := u.Cohorts
			tiene := false
			for _, k := range cohorts {
				if k == def.Cohorte {
					tiene = true
				}
			}
			if !tiene {
				roles := u.Roles
				if len(roles) == 0 {
					roles = []string{"student"}
				}
				_ = s.DB.UpdateUserRoles(r.Context(), c.UserID, roles, append(cohorts, def.Cohorte))
			}
			_ = u
		}
		salieron = append(salieron, map[string]any{"nombre": sorteoNombre(c.Nombre), "correo": correoMascarado(c.Email), "posicion": pos})
	}
	writeJSON(w, 200, map[string]any{"ganadores": salieron, "quedan": max(0, def.MaxGanadores-(len(gans)+len(salieron)))})
}
