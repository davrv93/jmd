package httpapi

import (
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Sorteo de GoldenQuerys con temática de fútbol: cada inscrito patea un solo penal.
//
//	GET  /api/v1/sorteo-gol/estado   (público) probabilidades y qué premios únicos quedan
//	POST /api/v1/sorteo-gol/girar    (público) {nombre, correo}: sortea o devuelve el resultado que ya tenía
//	GET  /api/v1/admin/sorteo-gol    (admin)   todos los giros, para validar los códigos que llegan por WhatsApp
//
// El sorteo se hace aquí, no en el navegador, y queda en la base: una cuenta gira una vez y un premio único sale una
// vez (índice único en store). Las probabilidades que ve el público son exactamente las de premiosGol y tramosGol, en
// partes por millón. Agotado un premio único, su probabilidad pasa a los descuentos normales.

const (
	sorteoGolID   = "goldenquerys"
	sorteoGolBase = 100 // precio del curso en soles
	golGrupo      = "goldenquerys-1"
)

type premioGol struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	PPM    int    `json:"-"`
	Pct    int    `json:"-"`
	Precio int    `json:"-"`
}

type tramoGol struct {
	Desde int `json:"desde"`
	Hasta int `json:"hasta"`
	PPM   int `json:"-"`
}

// Suman 1 000 000 entre los dos.
var (
	premiosGol = []premioGol{
		{ID: "eterna", Nombre: "Suscripción eterna", PPM: 100, Pct: 100},
		{ID: "catalogo-gratis", Nombre: "Todo el catálogo gratis", PPM: 1_000, Pct: 100},
		{ID: "catalogo-10", Nombre: "Todo el catálogo a S/ 10", PPM: 5_000, Pct: 90, Precio: 10},
		{ID: "curso-100", Nombre: "100 % de descuento en GoldenQuerys", PPM: 10_000, Pct: 100},
	}
	tramosGol = []tramoGol{
		{Desde: 20, Hasta: 39, PPM: 450_000},
		{Desde: 40, Hasta: 59, PPM: 350_000},
		{Desde: 60, Hasta: 79, PPM: 143_900},
		{Desde: 80, Hasta: 90, PPM: 40_000},
	}
)

func azarGol(n int) int {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return int(binary.BigEndian.Uint64(b[:]) % uint64(n))
}

// sortearGol elige un resultado. `tomados` son los premios únicos sin stock: sus partes por millón caen en los tramos.
func sortearGol(tomados map[string]bool) *store.GiroGol {
	r := azarGol(1_000_000)
	for _, p := range premiosGol {
		if r < p.PPM {
			if tomados[p.ID] {
				break
			}
			return &store.GiroGol{Premio: p.ID, Pct: p.Pct, Precio: p.Precio}
		}
		r -= p.PPM
	}
	total := 0
	for _, t := range tramosGol {
		total += t.PPM
	}
	r = azarGol(total)
	for _, t := range tramosGol {
		if r < t.PPM {
			pct := t.Desde + azarGol(t.Hasta-t.Desde+1)
			return &store.GiroGol{Premio: "descuento", Pct: pct, Precio: sorteoGolBase * (100 - pct) / 100}
		}
		r -= t.PPM
	}
	return &store.GiroGol{Premio: "descuento", Pct: 20, Precio: 80}
}

func codigoGol(pct int) string {
	const letras = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	c := make([]byte, 5)
	for i := range c {
		c[i] = letras[azarGol(len(letras))]
	}
	return fmt.Sprintf("GOL-%d-%s", pct, c)
}

// sinTildes: «José  PÉREZ» → «jose perez», para comparar nombres.
func sinTildes(s string) string {
	return strings.Join(strings.Fields(quitaTildes.Replace(strings.ToLower(s))), " ")
}

var quitaTildes = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n")

// nombreCoincide: el nombre escrito debe traer al menos una palabra del de la cuenta (de 3 letras o más).
func nombreCoincide(escrito, cuenta string) bool {
	palabras := strings.Fields(sinTildes(cuenta))
	for _, e := range strings.Fields(sinTildes(escrito)) {
		for _, p := range palabras {
			if len(e) >= 3 && e == p {
				return true
			}
		}
	}
	return false
}

func (s *Server) golTomados(r *http.Request) (map[string]string, int, error) {
	giros, err := s.DB.GirosGol(r.Context(), sorteoGolID)
	if err != nil {
		return nil, 0, err
	}
	tomados := map[string]string{}
	for _, g := range giros {
		if g.Premio != "descuento" {
			tomados[g.Premio] = sorteoNombre(g.Nombre)
		}
	}
	return tomados, len(giros), nil
}

// golEstado: GET /api/v1/sorteo-gol/estado.
func (s *Server) golEstado(w http.ResponseWriter, r *http.Request) {
	tomados, total, err := s.golTomados(r)
	if err != nil {
		internal(w, err)
		return
	}
	premios := []map[string]any{}
	for _, p := range premiosGol {
		ganador, tomado := tomados[p.ID]
		premios = append(premios, map[string]any{"id": p.ID, "nombre": p.Nombre, "prob": float64(p.PPM) / 10_000, "disponible": !tomado, "ganador": ganador})
	}
	tramos := []map[string]any{}
	for _, t := range tramosGol {
		tramos = append(tramos, map[string]any{"desde": t.Desde, "hasta": t.Hasta, "prob": float64(t.PPM) / 10_000})
	}
	writeJSON(w, 200, map[string]any{"giros": total, "premios": premios, "tramos": tramos, "precio": sorteoGolBase, "inscripcion": "/inscripcion/" + golGrupo})
}

func vistaGiro(g *store.GiroGol, repetido bool) map[string]any {
	nombre := fmt.Sprintf("%d %% de descuento", g.Pct)
	unico := false
	for _, p := range premiosGol {
		if p.ID == g.Premio {
			nombre, unico = p.Nombre, true
		}
	}
	return map[string]any{"premio": g.Premio, "titulo": nombre, "unico": unico, "pct": g.Pct, "precio": g.Precio, "codigo": g.Codigo, "repetido": repetido}
}

// golGirar: POST /api/v1/sorteo-gol/girar {nombre, correo}.
func (s *Server) golGirar(w http.ResponseWriter, r *http.Request) {
	if !s.golLimite.allow(clientIP(r)) {
		writeErr(w, 429, "demasiados_intentos", "Espera un minuto antes de volver a intentarlo.")
		return
	}
	var in struct {
		Nombre string `json:"nombre"`
		Correo string `json:"correo"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	nombre, correo := strings.TrimSpace(in.Nombre), strings.ToLower(strings.TrimSpace(in.Correo))
	if len(nombre) < 3 || !validEmail(correo) {
		badRequest(w, "Escribe tu nombre y el correo con el que te inscribiste.")
		return
	}
	u, err := s.DB.UserByEmail(r.Context(), correo)
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, 404, "no_inscrito", "Ese correo no está inscrito. Inscríbete gratis y vuelve a patear.")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	if !nombreCoincide(nombre, u.Name) {
		writeErr(w, 400, "nombre_distinto", "Ese nombre no coincide con el de tu inscripción.")
		return
	}
	s.golMu.Lock()
	defer s.golMu.Unlock()
	if g, err := s.DB.GiroGolDe(r.Context(), sorteoGolID, u.ID); err == nil {
		writeJSON(w, 200, vistaGiro(g, true))
		return
	} else if !errors.Is(err, store.ErrNotFound) {
		internal(w, err)
		return
	}
	tomados, _, err := s.golTomados(r)
	if err != nil {
		internal(w, err)
		return
	}
	sinStock := map[string]bool{}
	for id := range tomados {
		sinStock[id] = true
	}
	g := sortearGol(sinStock)
	g.Email, g.Nombre, g.UserID, g.Codigo = correo, u.Name, u.ID, codigoGol(g.Pct)
	if err := s.DB.GuardarGiroGol(r.Context(), sorteoGolID, g); err != nil {
		internal(w, err)
		return
	}
	slog.Info("sorteo gol", "premio", g.Premio, "pct", g.Pct)
	writeJSON(w, 200, vistaGiro(g, false))
}

// golGiros: GET /api/v1/admin/sorteo-gol.
func (s *Server) golGiros(w http.ResponseWriter, r *http.Request, p *Principal) {
	giros, err := s.DB.GirosGol(r.Context(), sorteoGolID)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"giros": giros})
}
