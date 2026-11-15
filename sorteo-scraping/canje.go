package main

// Página de canje de cupones: /canje?c=JMD-90-XXXXX. Muestra el cupón y los
// cursos donde se puede usar, con el precio ya descontado, y guarda el curso
// que elige el ganador. Para elegir hay que escribir el WhatsApp con el que se
// ganó el cupón: el código solo no basta. El cobro y el «canjeado» siguen a mano
// en el panel.

import (
	_ "embed"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

// cursos-canje.json es el catálogo completo con precio (de ../brochures/salida/cursos.json).
//
//go:embed cursos-canje.json
var cursosCanjeJSON []byte

// Los cupones de 70 % o más se entregaron cuando el gachapon tenía todo el
// catálogo, y se respetan para cualquier curso. Los de ahora (20 a 50 %) valen
// solo para el catálogo actual del gachapon.
const descuentoCatalogoCompleto = 70

type Eleccion struct {
	Slug   string    `json:"slug"`
	Titulo string    `json:"titulo"`
	Fecha  time.Time `json:"fecha"`
}

func (s *Sorteo) cursosDelCupon(p *Participante) []Curso {
	if p.Descuento >= descuentoCatalogoCompleto {
		return s.cursosCanje
	}
	return s.cursos
}

func (s *Sorteo) vencido(p *Participante) bool {
	return p.Vence < s.ahora().In(lima).Format("2006-01-02")
}

var (
	errSinCupon  = errors.New("cupón inexistente")
	errOtroNum   = errors.New("número distinto")
	errVencido   = errors.New("cupón vencido")
	errCanjeado  = errors.New("cupón ya canjeado")
	errSinCurso  = errors.New("curso no válido para el cupón")
	codigoLimpio = strings.NewReplacer(" ", "", "\t", "")
)

func (s *Sorteo) elegirCurso(codigo, numero, slug string) (*Participante, *Curso, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p := s.porCodigo[codigo]
	if p == nil {
		return nil, nil, errSinCupon
	}
	if p.WhatsApp != numero {
		return nil, nil, errOtroNum
	}
	if p.Canjeado != nil {
		return nil, nil, errCanjeado
	}
	if s.vencido(p) {
		return nil, nil, errVencido
	}
	var curso *Curso
	for i, c := range s.cursosDelCupon(p) {
		if c.Slug == slug {
			curso = &s.cursosDelCupon(p)[i]
			break
		}
	}
	if curso == nil {
		return nil, nil, errSinCurso
	}
	antes := p.Eleccion
	p.Eleccion = &Eleccion{Slug: curso.Slug, Titulo: curso.Titulo, Fecha: s.ahora().UTC().Truncate(time.Second)}
	if err := s.guardar(); err != nil {
		p.Eleccion = antes
		return nil, nil, errGuardar
	}
	return p, curso, nil
}

func (s *Sorteo) rutasCanje(mux *http.ServeMux, web http.FileSystem) {
	mux.HandleFunc("GET /canje", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Robots-Tag", "noindex")
		f, err := web.Open("canje.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		http.ServeContent(w, r, "canje.html", time.Time{}, f)
	})
	mux.HandleFunc("GET /api/canje", func(w http.ResponseWriter, r *http.Request) {
		codigo := strings.ToUpper(codigoLimpio.Replace(r.URL.Query().Get("c")))
		s.mu.Lock()
		defer s.mu.Unlock()
		p := s.porCodigo[codigo]
		if p == nil {
			fallo(w, 404, "codigo", "No encontramos ese cupón. Revisa que esté bien escrito.")
			return
		}
		eleccion := ""
		if p.Eleccion != nil {
			eleccion = p.Eleccion.Slug
		}
		responder(w, 200, map[string]any{
			"codigo": p.Codigo, "nombre": strings.Fields(p.Nombre)[0], "descuento": p.Descuento,
			"vence": p.Vence, "vence_texto": fechaLargaISO(p.Vence), "vencido": s.vencido(p),
			"canjeado": p.Canjeado != nil, "eleccion": eleccion,
			"cursos": s.cursosDelCupon(p), "whatsapp": s.cfg.WhatsApp,
		})
	})
	mux.HandleFunc("POST /api/canje", func(w http.ResponseWriter, r *http.Request) {
		var q struct {
			Codigo   string `json:"codigo"`
			WhatsApp string `json:"whatsapp"`
			Slug     string `json:"slug"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<10)
		if json.NewDecoder(r.Body).Decode(&q) != nil {
			fallo(w, 400, "formulario", "No pudimos leer tus datos. Vuelve a intentarlo.")
			return
		}
		numero, ok := limpiarNumero(q.WhatsApp)
		if !ok {
			fallo(w, 400, "whatsapp", "Escribe tu WhatsApp: 9 dígitos y empieza con 9.")
			return
		}
		p, c, err := s.elegirCurso(strings.ToUpper(codigoLimpio.Replace(q.Codigo)), numero, q.Slug)
		switch {
		case errors.Is(err, errSinCupon):
			fallo(w, 404, "codigo", "No encontramos ese cupón.")
		case errors.Is(err, errOtroNum):
			fallo(w, 403, "whatsapp", "Ese no es el WhatsApp con el que ganaste el cupón.")
		case errors.Is(err, errCanjeado):
			fallo(w, 409, "canjeado", "Este cupón ya se usó.")
		case errors.Is(err, errVencido):
			fallo(w, 409, "vencido", "Este cupón ya venció.")
		case errors.Is(err, errSinCurso):
			fallo(w, 400, "curso", "Elige uno de los cursos de la lista.")
		case err != nil:
			fallo(w, 500, "servidor", "No pudimos guardar tu elección. Vuelve a intentarlo.")
		default:
			responder(w, 200, map[string]any{"ok": true, "slug": c.Slug, "titulo": c.Titulo, "nombre": p.Nombre})
		}
	})
}
