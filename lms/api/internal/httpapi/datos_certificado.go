package httpapi

import (
	"context"
	"encoding/csv"
	"errors"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Datos para el certificado: el alumno confirma su nombre completo (tal como irá impreso) y el
// correo donde quiere recibir el certificado. El nombre se congela en el certificado al emitirlo
// (ver emitir); el instructor descarga la lista en CSV con quién falta.
//
//   GET  /api/v1/mis-datos-certificado          los datos del alumno (o los de su cuenta como sugerencia)
//   PUT  /api/v1/mis-datos-certificado          {nombre, correo}
//   GET  /api/v1/admin/certificados/datos.csv   todos los alumnos, con «pendiente» si no los llenaron

type datosCertIn struct {
	Nombre string `json:"nombre"`
	Correo string `json:"correo"`
}

func datosCertView(dc *store.DatosCertificado, p *Principal) map[string]any {
	v := map[string]any{"nombre": "", "correo": "", "completo": false, "sugerido_nombre": p.Name, "sugerido_correo": p.Email}
	if dc != nil {
		v["nombre"], v["correo"], v["completo"] = dc.Nombre, dc.Correo, true
		v["actualizado_en"] = dc.ActualizadoEn.Format(time.RFC3339)
	}
	return v
}

func (s *Server) misDatosCertificado(w http.ResponseWriter, r *http.Request, p *Principal) {
	dc, err := s.DB.DatosCertificado(r.Context(), p.ID)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		internal(w, err)
		return
	}
	writeJSON(w, 200, datosCertView(dc, p))
}

// limpiarNombre quita espacios de más: «  ana   maría » → «ana maría».
func limpiarNombre(s string) string { return strings.Join(strings.Fields(s), " ") }

func (s *Server) guardarDatosCertificado(w http.ResponseWriter, r *http.Request, p *Principal) {
	var in datosCertIn
	if !readJSON(w, r, &in) {
		return
	}
	nombre := limpiarNombre(in.Nombre)
	correo := strings.ToLower(strings.TrimSpace(in.Correo))
	switch {
	case utf8.RuneCountInString(nombre) < 5 || len(strings.Fields(nombre)) < 2:
		badRequest(w, "escribe tu nombre completo: nombres y apellidos")
		return
	case utf8.RuneCountInString(nombre) > 120:
		badRequest(w, "el nombre no puede pasar de 120 caracteres")
		return
	case strings.ContainsAny(nombre, "<>{}[]\\/|@#$%^*=_~`\"0123456789"):
		badRequest(w, "el nombre solo lleva letras, espacios, apóstrofo, punto o guion")
		return
	case !validEmail(correo):
		badRequest(w, "el correo no es válido")
		return
	}
	dc := &store.DatosCertificado{UserID: p.ID, Nombre: nombre, Correo: correo}
	if err := s.DB.SetDatosCertificado(r.Context(), dc); err != nil {
		internal(w, err)
		return
	}
	slog.Info("datos de certificado guardados", "alumno", p.Email)
	writeJSON(w, 200, datosCertView(dc, p))
}

// nombreCertificado es el nombre que va impreso: el que el alumno confirmó o, si no lo hizo, el de
// su cuenta.
func (s *Server) nombreCertificado(ctx context.Context, u *store.User) string {
	if dc, err := s.DB.DatosCertificado(ctx, u.ID); err == nil && dc.Nombre != "" {
		return dc.Nombre
	}
	return u.Name
}

// exportDatosCertificado: CSV (UTF-8 con BOM, para Excel) con todos los alumnos. Filtro opcional
// cohort=<id> (un grupo). Primero los pendientes, luego por nombre.
func (s *Server) exportDatosCertificado(w http.ResponseWriter, r *http.Request, p *Principal) {
	users, err := s.DB.Users(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	datos, err := s.DB.TodosDatosCertificado(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	cohort := strings.TrimSpace(r.URL.Query().Get("cohort"))
	lima, errLoc := time.LoadLocation("America/Lima")
	if errLoc != nil {
		lima = time.FixedZone("Lima", -5*3600)
	}
	type fila struct {
		estado, nombre, correo, nombreCuenta, emailCuenta, grupos, actualizado string
	}
	var filas []fila
	for _, u := range users {
		if !u.HasRole("student") {
			continue
		}
		if cohort != "" && !contiene(u.Cohorts, cohort) {
			continue
		}
		if !p.Is("admin") && !compartenGrupo(p.Cohorts, u.Cohorts) {
			continue // un instructor solo exporta a los alumnos de sus grupos
		}
		f := fila{estado: "pendiente", nombreCuenta: u.Name, emailCuenta: u.Email, grupos: strings.Join(u.Cohorts, " ")}
		if dc := datos[u.ID]; dc != nil {
			f.estado, f.nombre, f.correo = "listo", dc.Nombre, dc.Correo
			f.actualizado = dc.ActualizadoEn.In(lima).Format("2006-01-02 15:04")
		}
		filas = append(filas, f)
	}
	sort.SliceStable(filas, func(i, j int) bool {
		if filas[i].estado != filas[j].estado {
			return filas[i].estado == "pendiente"
		}
		return strings.ToLower(filas[i].nombreCuenta) < strings.ToLower(filas[j].nombreCuenta)
	})
	nombre := "datos-certificado"
	if cohort != "" {
		nombre += "-" + cohort
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+nombre+`.csv"`)
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write([]byte(bomUTF8))
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"estado", "nombre_completo", "correo_certificado", "nombre_en_cuenta", "email_cuenta", "grupos", "actualizado_lima"})
	for _, f := range filas {
		_ = cw.Write([]string{f.estado, f.nombre, f.correo, f.nombreCuenta, f.emailCuenta, f.grupos, f.actualizado})
	}
	cw.Flush()
}

