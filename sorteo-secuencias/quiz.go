package main

// La pregunta relámpago (/pregunta): quien responde bien «¿Cuánto es 7 × 7?»
// se lleva un premio al azar del catálogo. Entra quien ya tenía ticket (se le
// reconoce por el navegador) o se inscribe ahí mismo con nombre y WhatsApp.
// Un premio por persona, y no participan los que ya ganaron hoy: los
// ganadores revelados de este sorteo y la lista de excluidos que carga el
// panel (por ejemplo, los ganadores de la Ninja Race).

import (
	"crypto/rand"
	"math/big"
	"net/http"
	"strings"
	"time"
)

type Excluido struct {
	Nombre   string `json:"nombre"`
	Telefono string `json:"telefono"`
}

type RespuestaQuiz struct {
	Persona int       `json:"persona"`
	Premio  string    `json:"premio"`
	Fecha   time.Time `json:"fecha"`
}

const respuestaQuiz = 49

func respuestaCorrecta(r string) bool {
	r = strings.ToLower(strings.Join(strings.Fields(r), " "))
	r = strings.TrimSuffix(r, ".")
	return r == "49" || r == "cuarenta y nueve" || r == "cuarentainueve" || r == "cuarentaynueve"
}

func ultimos9(t string) string {
	t = noDigitos.ReplaceAllString(t, "")
	if len(t) > 9 {
		return t[len(t)-9:]
	}
	return t
}

// claveNombre: el nombre sin tildes ni mayúsculas, para comparar.
func claveNombre(n string) string { return strings.Join(normalizar(n, false), " ") }

// yaGanoHoy: ganó en este sorteo (revelado) o está en la lista de excluidos
// por teléfono o por nombre. Con s.mu tomado.
func (s *Servidor) yaGanoHoy(p *Persona) bool {
	for _, g := range s.ganadoresRevelados() {
		for _, t := range s.ticketsDe(p.ID) {
			if g["ticket"] == t {
				return true
			}
		}
	}
	tel, nom := ultimos9(p.Telefono), claveNombre(p.Nombre)
	for _, x := range s.e.ExcluidosHoy {
		if (x.Telefono != "" && ultimos9(x.Telefono) == tel) || (x.Nombre != "" && claveNombre(x.Nombre) == nom) {
			return true
		}
	}
	return false
}

func (s *Servidor) respuestaDe(id int) *RespuestaQuiz {
	for i := range s.e.Quiz {
		if s.e.Quiz[i].Persona == id {
			return &s.e.Quiz[i]
		}
	}
	return nil
}

func (s *Servidor) premioPorID(id string) *Premio {
	for i := range s.e.Premios {
		if s.e.Premios[i].ID == id {
			return &s.e.Premios[i]
		}
	}
	return nil
}

// quizPublico: lo que ve la página de la pregunta. Con s.mu tomado.
func (s *Servidor) quizPublico(token string) map[string]any {
	ganadores := []map[string]any{}
	nombre := map[int]string{}
	for _, p := range s.e.Personas {
		nombre[p.ID] = p.Nombre
	}
	for i := len(s.e.Quiz) - 1; i >= 0; i-- {
		q := s.e.Quiz[i]
		ganadores = append(ganadores, map[string]any{"nombre": censurarNombre(nombre[q.Persona]), "premio": q.Premio})
	}
	out := map[string]any{"abierto": s.e.QuizAbierto, "premios": s.e.Premios, "ganadores": ganadores}
	out["acertijo"] = s.acertijoPublico(s.personaDe(token))
	if yo := s.personaDe(token); yo != nil {
		mio := map[string]any{"nombre": yo.Nombre, "tickets": s.ticketsDe(yo.ID), "yaGano": s.yaGanoHoy(yo)}
		if q := s.respuestaDe(yo.ID); q != nil {
			mio["premio"] = q.Premio
			mio["yaGano"] = false
		}
		out["yo"] = mio
	}
	return out
}

// censurarNombre: «Ana Torres» → «Ana T.» para la lista pública.
func censurarNombre(n string) string {
	partes := strings.Fields(n)
	if len(partes) < 2 {
		return n
	}
	return partes[0] + " " + strings.ToUpper(string([]rune(partes[1])[:1])) + "."
}

func azarPremio(n int) int {
	x, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		return 0
	}
	return int(x.Int64())
}

func (s *Servidor) rutasQuiz(mux *http.ServeMux, pagina func(string) http.HandlerFunc, admin func(func(http.ResponseWriter, *http.Request)) http.HandlerFunc, estadoAdmin func() map[string]any) {
	mux.HandleFunc("GET /pregunta", pagina("pregunta.html"))

	mux.HandleFunc("GET /api/pregunta", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.quizPublico(r.URL.Query().Get("t")))
	})

	mux.HandleFunc("POST /api/pregunta", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token     string `json:"t"`
			Nombre    string `json:"nombre"`
			Telefono  string `json:"telefono"`
			Respuesta string `json:"respuesta"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if !s.e.QuizAbierto {
			fallo(w, 409, "La pregunta ya se cerró. ¡Gracias por participar!")
			return
		}
		yo := s.personaDe(in.Token)
		porToken, nuevo := yo != nil, false
		if yo == nil {
			// sin ticket en este navegador: se inscribe aquí (o se le
			// reconoce por su WhatsApp si ya estaba inscrito)
			nombre := limpiarNombre(in.Nombre)
			tel := noDigitos.ReplaceAllString(in.Telefono, "")
			if n := len([]rune(nombre)); n < 3 || n > 40 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") || esOfensivo(nombre) {
				fallo(w, 400, "Escribe tu nombre y apellido reales (solo letras, sin palabras ofensivas).")
				return
			}
			if len(tel) < 9 || len(tel) > 15 {
				fallo(w, 400, "Escribe tu WhatsApp con código de país, por ejemplo 51986149476.")
				return
			}
			for i := range s.e.Personas {
				if ultimos9(s.e.Personas[i].Telefono) == ultimos9(tel) {
					yo = &s.e.Personas[i]
				}
			}
			if yo == nil {
				ip := ipDe(r)
				if s.porIP[ip] >= 6 {
					fallo(w, 429, "Demasiadas inscripciones desde esta conexión.")
					return
				}
				s.porIP[ip]++
				s.e.Siguiente++
				s.e.Personas = append(s.e.Personas, Persona{ID: s.e.Siguiente, Nombre: nombre, Telefono: tel, Token: nuevoToken(), IP: ip, CreadoEn: time.Now().UTC()})
				yo = &s.e.Personas[len(s.e.Personas)-1]
				nuevo = true
			}
		}
		token := ""
		if nuevo || porToken {
			token = yo.Token // nunca a quien solo escribió un WhatsApp ajeno
		}
		if q := s.respuestaDe(yo.ID); q != nil {
			responder(w, 200, map[string]any{"t": token, "nombre": yo.Nombre, "premio": q.Premio, "repetido": true})
			return
		}
		if s.yaGanoHoy(yo) {
			if nuevo {
				s.guardar()
			}
			fallo(w, 409, "Hoy ya ganaste un premio 🎉: esta pregunta es para los que aún no ganan. ¡Gracias por jugar!")
			return
		}
		if !respuestaCorrecta(in.Respuesta) {
			if nuevo {
				s.guardar()
			}
			responder(w, 200, map[string]any{"t": token, "nombre": yo.Nombre, "incorrecta": true})
			return
		}
		p := s.e.Premios[azarPremio(len(s.e.Premios))]
		s.e.Quiz = append(s.e.Quiz, RespuestaQuiz{Persona: yo.ID, Premio: p.ID, Fecha: time.Now().UTC()})
		s.guardar()
		responder(w, 200, map[string]any{"t": token, "nombre": yo.Nombre, "premio": p.ID})
	})

	mux.HandleFunc("POST /api/admin/pregunta", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Abierto   *bool      `json:"abierto"`
			Excluidos []Excluido `json:"excluidos"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		if in.Abierto != nil {
			s.e.QuizAbierto = *in.Abierto
		}
		if in.Excluidos != nil {
			s.e.ExcluidosHoy = in.Excluidos
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
}

// quizAdmin: respuestas con nombre, WhatsApp y premio para el panel.
func (s *Servidor) quizAdmin() []map[string]any {
	out := []map[string]any{}
	for _, q := range s.e.Quiz {
		for _, p := range s.e.Personas {
			if p.ID == q.Persona {
				out = append(out, map[string]any{"nombre": p.Nombre, "telefono": p.Telefono, "premio": q.Premio, "fecha": q.Fecha})
			}
		}
	}
	return out
}

// ---------- acertijo con alternativas (un solo premio) ----------
// Una pregunta de opción múltiple por un cupón concreto: cada persona responde
// UNA vez (con 4 alternativas se podría adivinar probando) y el primero que
// acierta se lleva el cupón. La respuesta correcta nunca sale del servidor
// mientras el cupón no tenga dueño.

type IntentoAcertijo struct {
	Persona int       `json:"persona"`
	Opcion  int       `json:"opcion"`
	Fecha   time.Time `json:"fecha"`
}

type Acertijo struct {
	Activo   bool              `json:"activo"`
	Pregunta string            `json:"pregunta"`
	Opciones []string          `json:"opciones"`
	Correcta int               `json:"correcta"`
	Premio   string            `json:"premio"`
	Origen   string            `json:"origen"` // de quién era el cupón
	Ganador  int               `json:"ganador"`
	Intentos []IntentoAcertijo `json:"intentos"`
}

func acertijoPorDefecto() Acertijo {
	return Acertijo{
		Pregunta: "Recuerdo todo lo que me dices… hasta que me dices demasiado. No vivo en un disco: me miden en tokens. Y cada vez que abres un chat nuevo, nazco vacía. ¿Qué soy?",
		Opciones: []string{"La memoria caché", "La ventana de contexto", "El prompt del sistema", "La base de datos vectorial"},
		Correcta: 1,
		Premio:   "combo-90",
		Origen:   "Piero Lanche",
	}
}

// yaTieneEsteCupon: el acertijo es para todos, salvo quien ya tiene ese mismo
// cupón (el que lo regaló y quien lo ganó antes): ganarlo otra vez no le sirve.
// Con s.mu tomado.
func (s *Servidor) yaTieneEsteCupon(p *Persona) bool {
	premio := s.e.Acertijo.Premio
	for _, g := range s.ganadoresRevelados() {
		if g["premio"] == premio {
			for _, t := range s.ticketsDe(p.ID) {
				if g["ticket"] == t {
					return true
				}
			}
		}
	}
	for _, q := range s.e.Quiz {
		if q.Persona == p.ID && q.Premio == premio && s.e.Acertijo.Ganador != p.ID {
			return true
		}
	}
	return false
}

func (s *Servidor) intentoDe(id int) *IntentoAcertijo {
	for i := range s.e.Acertijo.Intentos {
		if s.e.Acertijo.Intentos[i].Persona == id {
			return &s.e.Acertijo.Intentos[i]
		}
	}
	return nil
}

func (s *Servidor) nombreDe(id int) string {
	for _, p := range s.e.Personas {
		if p.ID == id {
			return p.Nombre
		}
	}
	return ""
}

// acertijoPublico: sin la respuesta correcta mientras no haya ganador.
func (s *Servidor) acertijoPublico(yo *Persona) map[string]any {
	a := s.e.Acertijo
	out := map[string]any{"activo": a.Activo, "pregunta": a.Pregunta, "opciones": a.Opciones, "premio": a.Premio, "origen": a.Origen}
	if a.Ganador != 0 {
		out["ganador"] = censurarNombre(s.nombreDe(a.Ganador))
		out["correcta"] = a.Correcta
	}
	if yo != nil {
		mio := map[string]any{"excluido": s.yaTieneEsteCupon(yo), "gane": a.Ganador == yo.ID}
		if it := s.intentoDe(yo.ID); it != nil {
			mio["respondio"] = true
			mio["opcion"] = it.Opcion
		}
		out["yo"] = mio
	}
	return out
}

// identificar: la persona del token, o la que se inscribe con nombre y
// WhatsApp (o se reconoce por su WhatsApp). Devuelve persona, token a
// entregar y mensaje de error. Con s.mu tomado.
func (s *Servidor) identificar(token, nombre, tel, ip string) (*Persona, string, string) {
	if yo := s.personaDe(token); yo != nil {
		return yo, yo.Token, ""
	}
	nombre = limpiarNombre(nombre)
	tel = noDigitos.ReplaceAllString(tel, "")
	if n := len([]rune(nombre)); n < 3 || n > 40 || !nombreValido.MatchString(nombre) || !strings.Contains(nombre, " ") || esOfensivo(nombre) {
		return nil, "", "Escribe tu nombre y apellido reales (solo letras, sin palabras ofensivas)."
	}
	if len(tel) < 9 || len(tel) > 15 {
		return nil, "", "Escribe tu WhatsApp con código de país, por ejemplo 51986149476."
	}
	for i := range s.e.Personas {
		if ultimos9(s.e.Personas[i].Telefono) == ultimos9(tel) {
			return &s.e.Personas[i], "", "" // sin token: solo escribió un WhatsApp
		}
	}
	if s.porIP[ip] >= 6 {
		return nil, "", "Demasiadas inscripciones desde esta conexión."
	}
	s.porIP[ip]++
	s.e.Siguiente++
	s.e.Personas = append(s.e.Personas, Persona{ID: s.e.Siguiente, Nombre: nombre, Telefono: tel, Token: nuevoToken(), IP: ip, CreadoEn: time.Now().UTC()})
	p := &s.e.Personas[len(s.e.Personas)-1]
	return p, p.Token, ""
}

func (s *Servidor) rutasAcertijo(mux *http.ServeMux, admin func(func(http.ResponseWriter, *http.Request)) http.HandlerFunc, estadoAdmin func() map[string]any) {
	mux.HandleFunc("POST /api/acertijo", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Token    string `json:"t"`
			Nombre   string `json:"nombre"`
			Telefono string `json:"telefono"`
			Opcion   int    `json:"opcion"`
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		a := &s.e.Acertijo
		if !a.Activo {
			fallo(w, 409, "El acertijo está cerrado.")
			return
		}
		if a.Ganador != 0 {
			fallo(w, 409, "¡Llegaste tarde! El cupón ya tiene dueño: "+censurarNombre(s.nombreDe(a.Ganador))+".")
			return
		}
		if in.Opcion < 0 || in.Opcion >= len(a.Opciones) {
			fallo(w, 400, "Elige una de las alternativas.")
			return
		}
		yo, token, msg := s.identificar(in.Token, in.Nombre, in.Telefono, ipDe(r))
		if msg != "" {
			fallo(w, 400, msg)
			return
		}
		if s.yaTieneEsteCupon(yo) {
			s.guardar()
			fallo(w, 409, "Tú ya tienes este mismo cupón 🎉: déjaselo a otra persona.")
			return
		}
		if it := s.intentoDe(yo.ID); it != nil {
			fallo(w, 409, "Ya respondiste: es una sola oportunidad por persona.")
			return
		}
		a.Intentos = append(a.Intentos, IntentoAcertijo{Persona: yo.ID, Opcion: in.Opcion, Fecha: time.Now().UTC()})
		acerto := in.Opcion == a.Correcta
		if acerto {
			a.Ganador = yo.ID
			s.e.Quiz = append(s.e.Quiz, RespuestaQuiz{Persona: yo.ID, Premio: a.Premio, Fecha: time.Now().UTC()})
		}
		s.guardar()
		responder(w, 200, map[string]any{"t": token, "nombre": yo.Nombre, "acerto": acerto, "premio": a.Premio})
	})

	mux.HandleFunc("POST /api/admin/acertijo", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Activo  *bool `json:"activo"`
			Reponer bool  `json:"reponer"` // vuelve al acertijo por defecto (borra intentos)
		}
		if err := leerJSON(r, &in); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		if in.Reponer || s.e.Acertijo.Pregunta == "" {
			activo := s.e.Acertijo.Activo
			s.e.Acertijo = acertijoPorDefecto()
			s.e.Acertijo.Activo = activo
		}
		if in.Activo != nil {
			s.e.Acertijo.Activo = *in.Activo
		}
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
}

// acertijoAdmin: intentos con nombre y si acertaron, para el panel.
func (s *Servidor) acertijoAdmin() map[string]any {
	a := s.e.Acertijo
	intentos := []map[string]any{}
	for _, it := range a.Intentos {
		op := ""
		if it.Opcion >= 0 && it.Opcion < len(a.Opciones) {
			op = a.Opciones[it.Opcion]
		}
		intentos = append(intentos, map[string]any{"nombre": s.nombreDe(it.Persona), "opcion": op, "acerto": it.Opcion == a.Correcta, "fecha": it.Fecha})
	}
	return map[string]any{"activo": a.Activo, "pregunta": a.Pregunta, "origen": a.Origen, "premio": a.Premio, "ganador": s.nombreDe(a.Ganador), "intentos": intentos}
}
