package httpapi

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"slices"
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
	// InscripcionGrupo: grupo cuya inscripción por enlace se ofrece en la
	// página del sorteo («¡Inscríbete ya!»). Vacío = sin botón.
	InscripcionGrupo string
	// WhatsApp (solo dígitos con código de país) y el texto que se prellena al
	// abrir el chat: la vía de inscripción que anuncia el sorteo.
	WhatsApp      string
	WhatsAppTexto string
	// FechasTexto: el horario del taller tal como se anuncia (una línea).
	FechasTexto string
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
		Descripcion:  "Tres clases en vivo: 8, 10 y 11 de noviembre, de 9:30 a 10:45 pm. Potencia tus agentes con RTK, Cortex, Graphify y Caveman. Para inscribirte, envía un mensaje al WhatsApp 986 149 476 y te damos tu cupo.",
		Flyer:        "/sorteo-potencia.jpg",
		CursoID:      "potencia-agentes",
		Cohorte:      "potencia-agentes-1",
		InscripcionGrupo: "potencia-agentes-1",
		WhatsApp:      "51986149476",
		WhatsAppTexto: "Hola, quiero inscribirme al taller ⚡ Menos tokens. Más poder (8, 10 y 11 de noviembre, 9:30–10:45 pm).",
		FechasTexto:  "Clases 8, 10 y 11 de noviembre · 9:30 a 10:45 pm",
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
		pubs = append(pubs, map[string]any{"nombre": sorteoNombre(g.Nombre), "correo": correoMascarado(g.Email),
			"posicion": g.Posicion, "numero": g.Numero})
	}
	writeJSON(w, 200, map[string]any{
		"id": def.ID, "titulo": def.Titulo, "subtitulo": def.Subtitulo, "descripcion": def.Descripcion,
		"flyer": def.Flyer, "max_ganadores": def.MaxGanadores,
		"inicia": def.Inicia.Format("2006-01-02"), "termina": def.Termina.Format("2006-01-02"),
		"abierto": abierto, "participantes": len(part), "ganadores": pubs,
		"quedan": max(0, def.MaxGanadores-len(gans)),
		"inscripcion": inscripcionURL(def),
		"whatsapp": whatsappVisible(def),
		"whatsapp_bonito": waBonito(def.WhatsApp),
		"whatsapp_url": whatsappURL(def),
		"fechas_texto": def.FechasTexto,
	})
}

// kind: solo los dígitos del número, tal como se muestra/apunta.
func whatsappVisible(def Sorteo) string {
	return def.WhatsApp
}

// whatsappURL: enlace wa.me con el texto ya escrito (vacío si no hay número).
func whatsappURL(def Sorteo) string {
	if def.WhatsApp == "" {
		return ""
	}
	u := "https://wa.me/" + def.WhatsApp
	if def.WhatsAppTexto != "" {
		u += "?text=" + url.QueryEscape(def.WhatsAppTexto)
	}
	return u
}

// waBonito: "51986149476" → "986 149 476" (para escribirlo en el anuncio).
func waBonito(numero string) string {
	d := strings.TrimPrefix(numero, "51")
	if len(d) == 9 {
		return d[:3] + " " + d[3:6] + " " + d[6:]
	}
	return numero
}

// inscripcionURL: el enlace de registro que ofrece la página del sorteo.
func inscripcionURL(def Sorteo) string {
	if def.InscripcionGrupo == "" {
		return ""
	}
	return "/inscripcion/" + def.InscripcionGrupo + "/"
}

// sorteoParticipar: POST /api/v1/sorteo/{id}/participar {email} → anota una vez.
// CUALQUIER correo participa: no hace falta tener cuenta ni estar inscrito. Si
// el correo sí tiene cuenta se guarda su nombre y, si gana, entra solo al curso.
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
	if !s.login.allow("sorteo:" + clientIP(r)) {
		writeErr(w, 429, "rate_limited", "demasiados intentos desde esta conexión; espera un minuto")
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
	userID := ""
	if u, err := s.DB.UserByEmail(r.Context(), in.Email); err == nil {
		userID = u.ID
	}
	numero, err := s.DB.SorteoParticipar(r.Context(), def.ID, in.Email, userID)
	if err != nil {
		if store.YaInscrito(err) {
			// Ya jugaba: se le devuelve SU número (el mismo desde que se anotó).
			writeJSON(w, 409, map[string]any{
				"error": map[string]any{"code": "ya_participa",
					"message": "ese correo ya está participando: cada correo juega una vez"},
				"numero": s.DB.SorteoNumeroPorEmail(r.Context(), def.ID, in.Email),
			})
			return
		}
		internal(w, err)
		return
	}
	part, _ := s.DB.SorteoParticipantes(r.Context(), def.ID)
	writeJSON(w, 201, map[string]any{"ok": true, "participantes": len(part), "numero": numero})
}

// sorteosAutomaticos: al inscribirse (o al unirse) al grupo, el cupo del sorteo
// del curso queda jugado con su número aleatorio, sin botón extra. Devuelve el
// sorteo aplicado (para que la respuesta lo avise) o nil. Nunca rompe la
// inscripción: cualquier fallo se ignora.
func (s *Server) sorteosAutomaticos(ctx context.Context, cursos []string, userID, email string) map[string]any {
	for _, def := range sorteos {
		if !slices.Contains(cursos, def.CursoID) || !sorteoAbierto(def, time.Now()) {
			continue
		}
		// Ganó antes de tener cuenta: al entrar ahora se le entrega el premio,
		// aunque el sorteo ya tenga todos sus cupos repartidos.
		if gano, numero := s.DB.SorteoPremioPendiente(ctx, def.ID, email); gano {
			if userID != "" {
				s.darCohorte(ctx, userID, def.Cohorte)
			}
			return map[string]any{"id": def.ID, "titulo": def.Titulo, "numero": numero, "ganador": true}
		}
		if gans, err := s.DB.SorteoGanadores(ctx, def.ID); err == nil && len(gans) >= def.MaxGanadores {
			continue
		}
		numero, err := s.DB.SorteoParticipar(ctx, def.ID, email, userID)
		if err != nil && !store.YaInscrito(err) {
			continue
		}
		if numero == 0 {
			numero = s.DB.SorteoNumeroPorEmail(ctx, def.ID, email)
		}
		return map[string]any{"id": def.ID, "titulo": def.Titulo, "numero": numero}
	}
	return nil
}

// darCohorte suma una cohorte al usuario sin quitarle las que ya tenía.
func (s *Server) darCohorte(ctx context.Context, userID, cohorte string) {
	if userID == "" || cohorte == "" {
		return
	}
	u, err := s.DB.UserByID(ctx, userID)
	if err != nil {
		return
	}
	for _, c := range u.Cohorts {
		if c == cohorte {
			return
		}
	}
	roles := u.Roles
	if len(roles) == 0 {
		roles = []string{"student"}
	}
	_ = s.DB.UpdateUserRoles(ctx, userID, roles, append(slices.Clone(u.Cohorts), cohorte))
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
		writeErr(w, 409, "completo", fmt.Sprintf("ya salieron los %d ganadores", def.MaxGanadores))
		return
	}
	ya := map[string]bool{}
	for _, g := range gans {
		ya[g.Email] = true
	}
	var bolsa []store.SorteoParticipante
	for _, c := range part {
		if !ya[c.Email] {
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
		// El nombre del premio: el de su cuenta si la tiene (participó con correo a secas).
		nombre := c.Nombre
		if err := s.DB.SorteoAgregarGanador(r.Context(), def.ID, c.Email, nombre, pos, c.Numero); err != nil {
			internal(w, err)
			return
		}
		// El premio entra solo: suma la cohorte sin quitar las que ya tenía.
		// Quien participó sin cuenta la recibe al inscribirse con ese correo.
		if u, err := s.DB.UserByEmail(r.Context(), c.Email); err == nil && u != nil {
			s.darCohorte(r.Context(), u.ID, def.Cohorte)
		}
		salieron = append(salieron, map[string]any{"nombre": sorteoNombre(nombre), "correo": correoMascarado(c.Email),
			"posicion": pos, "numero": c.Numero})
	}
	writeJSON(w, 200, map[string]any{"ganadores": salieron, "quedan": max(0, def.MaxGanadores-(len(gans)+len(salieron)))})
}
