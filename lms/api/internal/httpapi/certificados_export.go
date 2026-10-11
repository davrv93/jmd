package httpapi

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Exportación CSV para plataformas de insignias (personal). Dos formatos:
//
//   - export.csv (genérico): codigo, nombre, apellido, email, insignia, emitido_en (YYYY-MM-DD),
//     url_verificacion, url_evidencia, url_insignia_png.
//   - export-badgr.csv: las columnas de la carga masiva de Canvas Credentials / Badgr tal como las
//     lista su ayuda (Identifier, First Name, Last Name, Narrative, Evidence Narrative,
//     Evidence URL, Issue Date, Expiration Date). El plan gratuito admite 50 filas por archivo.
//
// No hay export-credly.csv: la plantilla oficial de Credly no se pudo consultar (su centro de
// ayuda responde 403 sin sesión) y no se inventan cabeceras; el genérico lleva los mismos datos
// (nombre, apellido, correo y fecha) para copiarlos a la plantilla que descargue la cuenta.
//
// UTF-8 con BOM para que Excel abra bien los acentos. Solo certificados vigentes.
// Filtro: course (obligatorio) y lesson: vacío = certificados del curso completo; <id> = esa
// clase; "*" = todos los ámbitos.

const bomUTF8 = "\xEF\xBB\xBF"

// exportFilas resuelve los filtros y devuelve los certificados vigentes con su usuario.
func (s *Server) exportFilas(w http.ResponseWriter, r *http.Request) ([]*store.Certificate, map[string]*store.User, string, bool) {
	q := r.URL.Query()
	c := s.Content.Get().Course(strings.TrimSpace(q.Get("course")))
	if c == nil {
		badRequest(w, "course: id o slug de un curso existente")
		return nil, nil, "", false
	}
	lesson := strings.TrimSpace(q.Get("lesson"))
	nombre := "certificados-" + c.ID
	var list []*store.Certificate
	var err error
	switch lesson {
	case "*":
		list, err = s.DB.Certificates(r.Context(), c.ID, "")
		nombre += "-todos"
	case "":
		list, err = s.DB.CertificatesClase(r.Context(), c.ID, "")
	default:
		l, num := lessonEnCurso(c, lesson)
		if l == nil {
			notFound(w, "la clase")
			return nil, nil, "", false
		}
		list, err = s.DB.CertificatesClase(r.Context(), c.ID, l.ID)
		nombre += fmt.Sprintf("-clase-%02d", num)
	}
	if err != nil {
		internal(w, err)
		return nil, nil, "", false
	}
	users, err := s.DB.Users(r.Context())
	if err != nil {
		internal(w, err)
		return nil, nil, "", false
	}
	byID := map[string]*store.User{}
	for _, u := range users {
		byID[u.ID] = u
	}
	vigentes := list[:0]
	for _, x := range list {
		if !x.Anulado() {
			vigentes = append(vigentes, x)
		}
	}
	return vigentes, byID, nombre, true
}

// partirNombre separa nombre y apellido de un nombre completo. Con cuatro o más palabras se
// toman dos nombres (uso común en Perú); con tres, uno; con dos, uno y uno.
func partirNombre(full string) (string, string) {
	w := strings.Fields(full)
	switch {
	case len(w) == 0:
		return "", ""
	case len(w) == 1:
		return w[0], ""
	case len(w) >= 4:
		return strings.Join(w[:2], " "), strings.Join(w[2:], " ")
	default:
		return w[0], strings.Join(w[1:], " ")
	}
}

func servirCSV(w http.ResponseWriter, nombre string, cab []string, filas [][]string) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", nombre))
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(200)
	_, _ = w.Write([]byte(bomUTF8))
	cw := csv.NewWriter(w)
	_ = cw.Write(cab)
	for _, f := range filas {
		_ = cw.Write(f)
	}
	cw.Flush()
}

// exportCSV: GET /api/v1/admin/certificados/export.csv?course=&lesson= (genérico).
func (s *Server) exportCSV(w http.ResponseWriter, r *http.Request, p *Principal) {
	list, users, nombre, ok := s.exportFilas(w, r)
	if !ok {
		return
	}
	filas := make([][]string, 0, len(list))
	for _, c := range list {
		v := s.certView(c, false)
		u := users[c.UserID]
		email, full := "", str(v["alumno"])
		if u != nil {
			email, full = u.Email, u.Name
		}
		nom, ape := partirNombre(full)
		insignia := str(v["curso"])
		if c.LessonID != "" {
			insignia = str(v["clase"])
		}
		filas = append(filas, []string{c.ID, nom, ape, email, insignia, c.EmitidoEn.UTC().Format("2006-01-02"),
			str(v["url_verificar"]), str(v["url_verificar"]), str(v["url_insignia_png"])})
	}
	servirCSV(w, nombre+".csv", []string{"codigo", "nombre", "apellido", "email", "insignia", "emitido_en", "url_verificacion", "url_evidencia", "url_insignia_png"}, filas)
}

// exportBadgrCSV: GET /api/v1/admin/certificados/export-badgr.csv?course=&lesson= con las
// columnas de la carga masiva de Canvas Credentials / Badgr. La evidencia es la ficha pública
// de verificación; la narrativa lleva el código y las horas.
func (s *Server) exportBadgrCSV(w http.ResponseWriter, r *http.Request, p *Principal) {
	list, users, nombre, ok := s.exportFilas(w, r)
	if !ok {
		return
	}
	filas := make([][]string, 0, len(list))
	for _, c := range list {
		v := s.certView(c, false)
		u := users[c.UserID]
		email, full := "", str(v["alumno"])
		if u != nil {
			email, full = u.Email, u.Name
		}
		nom, ape := partirNombre(full)
		insignia := str(v["curso"])
		if c.LessonID != "" {
			insignia = str(v["clase"])
		}
		horas, _ := v["horas"].(int)
		narr := fmt.Sprintf("%s · certificado %s %s · %d h · código %s", insignia, str(v["tipo_texto"]), str(v["curso"]), horas, c.ID)
		if c.LessonID == "" {
			narr = fmt.Sprintf("Certificado %s · %s · %d h · código %s", str(v["tipo_texto"]), insignia, horas, c.ID)
		}
		filas = append(filas, []string{email, nom, ape, narr, "Ficha pública de verificación del LMS con el PDF y la credencial Open Badges 3.0",
			str(v["url_verificar"]), c.EmitidoEn.UTC().Format("2006-01-02"), ""})
	}
	servirCSV(w, nombre+"-badgr.csv", []string{"Identifier", "First Name", "Last Name", "Narrative", "Evidence Narrative", "Evidence URL", "Issue Date", "Expiration Date"}, filas)
}

// exportAccredibleCSV: GET /api/v1/admin/certificados/export-accredible.csv?course=&lesson=.
// Cabeceras según el ejemplo de la guía de carga por hoja de cálculo de Accredible
// (Recipient Name, Recipient Email, Issued on); el resto son atributos personalizados que el
// panel permite mapear al subir. Accredible entrega su propia plantilla por grupo: si difiere,
// se mapean las columnas al importar.
func (s *Server) exportAccredibleCSV(w http.ResponseWriter, r *http.Request, p *Principal) {
	list, users, nombre, ok := s.exportFilas(w, r)
	if !ok {
		return
	}
	filas := make([][]string, 0, len(list))
	for _, c := range list {
		v := s.certView(c, false)
		u := users[c.UserID]
		email, full := "", str(v["alumno"])
		if u != nil {
			email, full = u.Email, u.Name
		}
		filas = append(filas, []string{full, email, c.EmitidoEn.UTC().Format("2006-01-02"), c.ID,
			str(v["url_verificar"]), str(v["url_insignia_png"])})
	}
	servirCSV(w, nombre+"-accredible.csv", []string{"Recipient Name", "Recipient Email", "Issued on", "Credential Code", "Verification URL", "Badge Image URL"}, filas)
}

func str(v any) string {
	s, _ := v.(string)
	return s
}
