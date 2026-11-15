package main

import (
	"math"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// Chatbot sin dependencias externas: responde sobre cursos, sorteo, canje
// y trámites usando el catálogo y la config que ya tiene el sorteo.

var reNoLetra = regexp.MustCompile(`[^a-z0-9]+`)
var tildes = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n")

func normT(s string) string {
	s = strings.ToLower(s)
	s = tildes.Replace(s)
	return reNoLetra.ReplaceAllString(s, " ")
}

func contiene(haystack, needle string) bool { return strings.Contains(" "+haystack+" ", " "+needle+" ") }

func (s *Sorteo) responderChat(texto string) map[string]any {
	q := normT(texto)
	qTrim := strings.TrimSpace(q)
	if qTrim == "" {
		return chatBase("¡Hola! Soy el asistente de JMD Learning. Pregúntame por cursos, precio, fechas, descuentos o tu cupón. ¿En qué te ayudo?", nil)
	}
	// saludos
	if tokens(q, "hola", "buenas", "buenos dias", "buenas tardes", "hey", "holis") {
		return chatBase("¡Hola! 👋 Soy el asistente de JMD. Puedo contarte sobre el taller **¿Difícil de explicar? ¡No!** (hoy 5:30 p. m.), el sorteo, tu cupón y cómo canjearlo. ¿Qué quieres saber?", []string{"¿Qué cursos hay?", "¿Cómo funciona el sorteo?", "¿Cómo canjeo mi cupón?", "Precio y fechas"})
	}
	if tokens(q, "gracias", "muchas gracias") {
		return chatBase("¡De nada! Si necesitas algo más, aquí estoy. ¿Quieres que te muestre los cursos disponibles?", []string{"Ver cursos", "¿Qué descuento hay?", "¿Cuánto cuesta con descuento?"})
	}
	// intenciones específicas: se evalúan con prioridad
	switch {
	case tokens(q, "precio", "cuanto cuesta", "costo", "pagar", "soles"):
		return chatPrecio(s)
	case tokens(q, "fecha", "cuando", "horario", "dia", "hora"):
		return chatFechas(s, q)
	case tokens(q, "sorteo", "descuento", "cupon", "gachapon", "premio", "tarjeta", "tiro libre", "sorteo"):
		if tokens(q, "como funciona", "reglas", "como juego", "como participar") {
			return chatSorteo(s)
		}
		if tokens(q, "vence", "vencimiento", "cuando vence", "hasta cuando") {
			return chatBase(sTextoVence(), []string{"¿Cómo canjeo?", "Ver cursos"})
		}
		return chatSorteo(s)
	case tokens(q, "canje", "canjear", "usar cupon", "codigo", "elegir curso", "jmd-"):
		return chatCanje()
	case tokens(q, "python", "regalo", "api python"):
		return chatBase("En este sorteo el premio es el taller **¿Difícil de explicar? ¡No!** a **S/ 10** (en vez de S/ 100). Para otros cursos, escríbenos por WhatsApp.", []string{"Quiero jugar", "Hablar por WhatsApp"})
	case tokens(q, "dificil", "diseno", "taller", "aprendere", "aprender", "temario", "video", "landing", "prototipo"):
		return chatCursoSlug(s, "dificil-de-explicar-domingo-tarde")
	case tokens(q, "curso", "cursos", "catalogo", "que ensenan", "aprender"):
		return chatCatalogo(s)
	case tokens(q, "hackathon", "hackaton"):
		return chatBase("El cupón vale solo para el taller **¿Difícil de explicar? ¡No!** de hoy (5:30 – 7:00 p. m.). Para otros cursos, escríbenos por WhatsApp.", []string{"Ver cursos del sorteo", "Hablar por WhatsApp"})
	case tokens(q, "whatsapp", "contacto", "escribir", "numero"):
		wa := s.cfg.WhatsApp
		return chatBase("Escríbenos por WhatsApp al **+"+wa+"**: te respondemos sobre tu cupón, pagos y acceso al aula.", []string{"Abrir WhatsApp", "Ver cursos"})
	case tokens(q, "donde", "lugar", "presencial", "virtual", "en vivo", "zoom"):
		return chatBase("Todos los cursos son **en vivo por videollamada** (3 sesiones de 1 h 15 min). Quedan grabados si te pierdes una clase.", []string{"Fechas y horarios", "Ver cursos"})
	}

	// búsqueda difusa por título/categoría
	if cur := buscarCurso(s, q); cur != nil {
		return chatCurso(cur)
	}

	// fallback: muestra catálogo + reglas
	return chatBase("Puedo ayudarte con esto:\n\n• **Taller**: ¿Difícil de explicar? ¡No!, hoy 5:30 – 7:00 p. m. — S/ 100, con tu cupón S/ 10.\n• **Sorteo**: público, sin cuenta; los 3 primeros entran gratis y el resto puede ganar hasta 90 %.\n• **Canje**: elige tu curso en /canje?c=TU-CODIGO y valida con tu WhatsApp.\n\n¿Sobre qué quieres que profundice?", []string{"Ver cursos con descuento", "¿Cómo funciona el sorteo?", "¿Cómo canjeo mi cupón?", "Precio y fechas"})
}

func tokens(q string, words ...string) bool {
	for _, w := range words {
		nw := normT(w)
		if strings.Contains(q, nw) {
			return true
		}
	}
	return false
}

func chatBase(texto string, sugerencias []string) map[string]any {
	m := map[string]any{"texto": texto}
	if len(sugerencias) > 0 {
		m["sugerencias"] = sugerencias
	}
	return m
}

func chatPrecio(s *Sorteo) map[string]any {
	var b strings.Builder
	b.WriteString("El taller cuesta **S/ 100** (precio normal). Con tu cupón pagas:\n\n")
	for _, p := range s.cfg.Premios {
		if p.Descuento == 100 {
			b.WriteString("• **100 %** → **gratis** (1 cupo)\n")
		} else {
			antes := 100.0
			con := math.Round(antes * (100 - float64(p.Descuento)) / 100)
			b.WriteString("• **" + itoa(p.Descuento) + " %** → S/ " + solesStr(con) + " (en lugar de S/ 100)\n")
		}
	}
	b.WriteString("\nEl cupón vale para el taller de hoy, 5:30 – 7:00 p. m.")
	return chatBase(b.String(), []string{"Ver cursos", "¿Cómo canjeo?", "Fechas y horarios"})
}

func chatFechas(s *Sorteo, q string) map[string]any {
	var b strings.Builder
	b.WriteString("Fechas de los cursos del sorteo:\n\n")
	for _, c := range s.cursos {
		b.WriteString("• **" + c.Titulo + "** — " + strings.Join(c.Fechas, " · ") + " · " + c.Formato + "\n")
	}
	b.WriteString("\nTodos **en vivo** y grabados. El cupón vale para cualquiera de los dos.")
	return chatBase(b.String(), []string{"¿Cuánto cuesta con descuento?", "Quiero jugar", "Hablar por WhatsApp"})
}

func sTextoVence() string {
	return "Tu cupón vale para el taller de hoy, domingo 15 de noviembre, de 5:30 a 7:00 p. m. (Lima). Úsalo en /canje antes de la clase."
}

func chatSorteo(s *Sorteo) map[string]any {
	txt := "Sorteo de penales de **¿Difícil de explicar? ¡No!**:\n\n" +
		"1. Escribe tu nombre y WhatsApp (9 dígitos) y dale a *Quiero jugar*. No necesitas cuenta.\n" +
		"2. Juega: adivina la tarjeta del árbitro y, si hace falta, el tiro libre.\n" +
		"3. Los **3 primeros** entran **gratis**; el resto puede ganar **hasta 90 %** → pagas **S/ 10** en lugar de S/ 100.\n\n" +
		"El sorteo cierra **hoy domingo 15 nov a las 5:30 p. m.** (Lima), cuando empieza el taller."
	return chatBase(txt, []string{"Quiero jugar", "Ver cursos", "¿Cómo canjeo mi cupón?"})
}

func sProbabilidades(s *Sorteo) string {
	var b strings.Builder
	b.WriteString("Probabilidades y cupos actuales: ")
	for i, p := range s.cfg.Premios {
		if i > 0 {
			b.WriteString(" · ")
		}
		entregados := 0
		for _, x := range s.lista {
			if x.Descuento == p.Descuento {
				entregados++
			}
		}
		b.WriteString(itoa(p.Descuento) + "% (peso " + itoa(p.Peso) + ", tope " + itoa(p.Tope) + ", van " + itoa(entregados) + ")")
	}
	return b.String()
}

func chatCanje() map[string]any {
	return chatBase("Para canjear tu cupón:\n\n1. Ve a **/canje?c=TU-CODIGO** (o dale a *Elegir mi curso* cuando veas tu premio).\n2. Elige uno de los cursos de la lista — verás el precio ya con descuento.\n3. Escribe **el mismo WhatsApp** con el que ganaste y dale a *Inscribirme*.\n4. Te confirmamos el pago y tu acceso por WhatsApp.\n\n¿Ya tienes tu código? Si no, juega primero.", []string{"Ir a /canje", "Ver cursos", "Hablar por WhatsApp"})
}

func chatCatalogo(s *Sorteo) map[string]any {
	var b strings.Builder
	b.WriteString("Catálogo del sorteo (" + itoa(len(s.cursos)) + " cursos):\n\n")
	for _, c := range s.cursos {
		b.WriteString("• **" + c.Titulo + "** — " + c.Categoria + " · " + c.PrecioTexto + " · " + c.Bajada + "\n")
	}
	b.WriteString("\nPregúntame por el taller y te cuento qué aprenderás y a qué hora es.")
	cards := []map[string]string{}
	for _, c := range s.cursos {
		cards = append(cards, map[string]string{"titulo": c.Titulo, "categoria": c.Categoria, "fechas": strings.Join(c.Fechas, " · "), "precio": c.PrecioTexto, "slug": c.Slug, "brochure": c.Brochure})
	}
	return map[string]any{"texto": b.String(), "sugerencias": []string{"¿Qué aprenderé?", "¿Cuánto cuesta?", "Fechas y horarios"}, "cursos": cards}
}

func chatCursoSlug(s *Sorteo, slug string) map[string]any {
	for i := range s.cursos {
		if s.cursos[i].Slug == slug {
			return chatCurso(&s.cursos[i])
		}
	}
	return chatCatalogo(s)
}

func chatCurso(c *Curso) map[string]any {
	b := "**" + c.Titulo + "** — " + c.Categoria + " · " + c.PrecioTexto + "\n" + c.Bajada + "\n\n"
	b += "**Aprenderás:**\n"
	for _, a := range c.Aprenderas {
		b += "• " + a + "\n"
	}
	b += "\n**Formato:** " + c.Formato + " · **Fechas:** " + strings.Join(c.Fechas, " · ") + "\n"
	b += "\n¿Quieres este curso con tu cupón? Juega y luego canjéalo."
	return map[string]any{"texto": b, "sugerencias": []string{"¿Cuánto cuesta con 50%?", "¿Cuándo es?", "Ver el otro curso", "Quiero jugar"}, "curso": c.Slug}
}

func buscarCurso(s *Sorteo, q string) *Curso {
	var mejor *Curso
	best := 0
	qs := strings.Fields(q)
	for i := range s.cursos {
		p := 0
		nt := normT(s.cursos[i].Titulo + " " + s.cursos[i].Categoria + " " + s.cursos[i].Bajada)
		for _, w := range qs {
			if len(w) < 3 {
				continue
			}
			if strings.Contains(nt, w) {
				p++
			}
		}
		if p > best {
			best = p
			mejor = &s.cursos[i]
		}
	}
	if best >= 1 {
		return mejor
	}
	return nil
}

func solesStr(n float64) string {
	if n == float64(int(n)) {
		return strconv.Itoa(int(n))
	}
	return strconv.FormatFloat(n, 'f', 2, 64)
}

func itoa(n int) string { return strconv.Itoa(n) }

func fmtSprintf(a string, b ...any) string { return fmt.Sprintf(a, b...) }

// evitar import cycle: implementación simple sin fmt para no ensuciar
func init() { _ = sort.StringSlice{} }

func (s *Sorteo) rutasChat(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/chat", func(w http.ResponseWriter, r *http.Request) {
		var q struct {
			Texto  string `json:"texto"`
			Estado map[string]any `json:"estado"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 4<<10)
		if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
			fallo(w, 400, "formulario", "No pudimos leer tu mensaje.")
			return
		}
		t := strings.TrimSpace(q.Texto)
		if len([]rune(t)) > 500 {
			t = string([]rune(t)[:500])
		}
		if t == "" {
			fallo(w, 400, "texto", "Escribe una pregunta.")
			return
		}
		s.mu.Lock()
		resp := s.responderChat(t)
		s.mu.Unlock()
		responder(w, 200, resp)
	})
	mux.HandleFunc("GET /api/chat/salud", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, map[string]any{"ok": true, "cursos": len(s.cursos), "abierto": s.abierto()})
	})
}
