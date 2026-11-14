package main

// Reclamo del premio: inscripción al curso de ClickHouse SOLO para los
// campeones del sorteo (el QR del video de campeones lleva aquí). Pide el
// dorsal ganador y el nombre con que se inscribió; cada premio se reclama una
// vez. Va en un archivo aparte: reiniciar el sorteo no lo borra.

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

type Inscripcion struct {
	Nombre  string `json:"nombre"`
	Correo  string `json:"correo"`
	Dorsal  int    `json:"dorsal,omitempty"`
	Ganador bool   `json:"ganador"`
	// El navegador traía el token con que ese dorsal se inscribió al sorteo.
	Verificado bool `json:"verificado"`
	// Nombre del dorsal en el sorteo y si comparte alguna palabra con el escrito
	// (solo es una pista para el organizador: no bloquea, se puede escribir distinto).
	NombreSorteo string    `json:"nombreSorteo"`
	Parecido     bool      `json:"parecido"`
	IP           string    `json:"ip"`
	CreadaEn     time.Time `json:"creadaEn"`
}

type Curso struct {
	archivo string
	lista   []Inscripcion
	porIP   map[string]int
}

func (c *Curso) cargar() {
	c.porIP = map[string]int{}
	if b, err := os.ReadFile(c.archivo); err == nil {
		_ = json.Unmarshal(b, &c.lista)
	}
	for _, i := range c.lista {
		c.porIP[i.IP]++
	}
}

func (c *Curso) guardar() error {
	b, _ := json.MarshalIndent(c.lista, "", "  ")
	tmp := c.archivo + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, c.archivo)
}

func (s *Servidor) rutasCurso(mux *http.ServeMux, pagina func(string) http.HandlerFunc, admin func(func(http.ResponseWriter, *http.Request)) http.HandlerFunc) {
	mux.HandleFunc("GET /inscripcion", pagina("inscripcion.html"))

	mux.HandleFunc("POST /api/curso", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre string `json:"nombre"`
			Correo string `json:"correo"`
			Dorsal string `json:"dorsal"`
			Token  string `json:"t"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		nombre := limpiarNombre(in.Nombre)
		if n := utf8.RuneCountInString(nombre); n < 3 || n > 60 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") {
			fallo(w, 400, "Escribe tu nombre y apellido.")
			return
		}
		correo := strings.ToLower(strings.TrimSpace(in.Correo))
		if a, err := mail.ParseAddress(correo); err != nil || a.Address != correo || len(correo) > 120 || !strings.Contains(correo[strings.Index(correo, "@"):], ".") {
			fallo(w, 400, "Revisa tu correo: parece que le falta algo.")
			return
		}
		dorsal, err := strconv.Atoi(strings.TrimSpace(in.Dorsal))
		if err != nil || dorsal < 1 {
			fallo(w, 400, "Escribe tu dorsal ganador (solo el número, por ejemplo 10).")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.e.Fase != "sorteado" {
			fallo(w, 409, "El premio se reclama después del sorteo.")
			return
		}
		ganador := false
		for _, g := range s.e.Resultado {
			if g == dorsal {
				ganador = true
			}
		}
		if !ganador {
			fallo(w, 403, fmt.Sprintf("El dorsal %02d no está entre los campeones. Este formulario es solo para los ganadores del sorteo.", dorsal))
			return
		}
		verificado, parecido, nombreSorteo := false, false, ""
		for _, p := range s.e.Participantes {
			if p.Numero == dorsal {
				nombreSorteo = p.Nombre
				parecido = compartenPalabra(p.Nombre, nombre)
				verificado = in.Token != "" && in.Token == p.Token
			}
		}
		for i, x := range s.curso.lista {
			if x.Dorsal != dorsal {
				continue
			}
			if x.Correo != correo {
				fallo(w, 409, "Ese premio ya fue reclamado. Si fuiste tú, escríbenos al WhatsApp 986 149 476.")
				return
			}
			s.curso.lista[i].Nombre = nombre
			s.curso.lista[i].Verificado = s.curso.lista[i].Verificado || verificado
			s.curso.lista[i].NombreSorteo, s.curso.lista[i].Parecido = nombreSorteo, parecido
			_ = s.curso.guardar()
			responder(w, 200, map[string]any{"ok": true, "ganador": true, "repetido": true})
			return
		}
		ip := ipDe(r)
		if s.curso.porIP[ip] >= 10 {
			fallo(w, 429, "Demasiadas inscripciones desde esta conexión.")
			return
		}
		s.curso.porIP[ip]++
		s.curso.lista = append(s.curso.lista, Inscripcion{Nombre: nombre, Correo: correo, Dorsal: dorsal, Ganador: true, Verificado: verificado, NombreSorteo: nombreSorteo, Parecido: parecido, IP: ip, CreadaEn: time.Now().UTC()})
		if err := s.curso.guardar(); err != nil {
			fallo(w, 500, "No se pudo guardar. Inténtalo de nuevo.")
			return
		}
		responder(w, 200, map[string]any{"ok": true, "ganador": true})
	})

	mux.HandleFunc("GET /api/admin/curso", admin(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("formato") == "csv" {
			w.Header().Set("Content-Type", "text/csv; charset=utf-8")
			w.Header().Set("Content-Disposition", `attachment; filename="inscripciones-clickhouse.csv"`)
			_, _ = w.Write([]byte("\xef\xbb\xbf"))
			cw := csv.NewWriter(w)
			_ = cw.Write([]string{"nombre", "correo", "dorsal", "nombre_en_sorteo", "nombre_parecido", "mismo_navegador", "fecha_lima"})
			lima := time.FixedZone("Lima", -5*3600)
			for _, i := range s.curso.lista {
				d := ""
				if i.Dorsal > 0 {
					d = fmt.Sprint(i.Dorsal)
				}
				si := map[bool]string{true: "sí", false: "no"}
				_ = cw.Write([]string{i.Nombre, i.Correo, d, i.NombreSorteo, si[i.Parecido], si[i.Verificado], i.CreadaEn.In(lima).Format("2006-01-02 15:04")})
			}
			cw.Flush()
			return
		}
		responder(w, 200, map[string]any{"inscripciones": s.curso.lista})
	}))
}

// sinTildes compara nombres sin importar tildes (José = Jose); la ñ se respeta.
func sinTildes(s string) string {
	return strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u").Replace(s)
}

// compartenPalabra: algún nombre o apellido en común (de 3 letras o más).
func compartenPalabra(a, b string) bool {
	pal := map[string]bool{}
	for _, w := range strings.Fields(sinTildes(clave(a))) {
		if utf8.RuneCountInString(w) >= 3 {
			pal[w] = true
		}
	}
	for _, w := range strings.Fields(sinTildes(clave(b))) {
		if pal[w] {
			return true
		}
	}
	return false
}
