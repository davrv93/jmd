package main

// Modo clase: la misma carrera del sorteo público (mismo motor, pista y ninjas), pero sin premios y
// contra los compañeros. Vive en /clase/ y lo embebe la escena LIVE del LMS.
//
// Rondas de mesa: al empezar una ronda, los alumnos presentes se reparten en mesas de hasta 3 (un
// carril cada uno); si una mesa queda con 1 o 2, KAGE y YUKI (cpu) completan los carriles. Cada
// navegador simula a su corredor y manda su estado ~10 veces por segundo; el servidor solo guarda y
// reenvía a la mesa (no hay física aquí: es un recreo de clase). La ronda dura RONDA_SEGUNDOS (90 s)
// o hasta que todos los de las mesas caen. En la primera ronda las mesas salen al azar; desde la
// segunda se arman por mejor puntaje, así los que van arriba se enfrentan entre ellos.
//
//   POST /clase/api/unirse   {nombre, t?}        → {t, id, nombre}
//   POST /clase/api/latido   {t, est?}           → vista del alumno (fase, salida, su mesa, ranking)
//   POST /clase/api/empezar  {}                  → empieza la ronda (cualquiera: alumno o la sala)
//   POST /clase/api/fin      {t, puntos, esq, ms, vidas}
//   GET  /clase/api/sala                         → todas las mesas en vivo y el ranking (proyector)
//   POST /clase/api/admin/reiniciar (X-Clave)    → borra alumnos y rondas

import (
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	claseTope      = segundosEnv("RONDA_SEGUNDOS", 90) // duración máxima de la ronda
	claseCuenta    = 6 * time.Second                   // aviso antes de la salida común
	clasePresente  = 12 * time.Second                  // sin latido en este tiempo: ya no está
	claseAusente   = 8 * time.Second                   // en carrera sin latido: su carril queda como terminó
	claseAutoLobby = 30 * time.Second                  // con 2 o más presentes, la primera ronda arranca sola
	claseAutoRes   = 25 * time.Second                  // tras los resultados, la siguiente ronda arranca sola
	claseGracia    = 6 * time.Second                   // margen tras el tope para recibir los últimos resultados
)

func segundosEnv(nombre string, def int) time.Duration {
	if n, err := strconv.Atoi(os.Getenv(nombre)); err == nil && n >= 10 && n <= 600 {
		return time.Duration(n) * time.Second
	}
	return time.Duration(def) * time.Second
}

type estCorredor struct {
	Dx     float64 `json:"dx"`
	Y      float64 `json:"y"`
	Estado string  `json:"estado"`
	Vidas  int     `json:"vidas"`
	KO     bool    `json:"ko"`
	Kamui  bool    `json:"kamui"`
	Invul  bool    `json:"invul"`
	Puntos int     `json:"puntos"`
	Esq    int     `json:"esq"`
	Ms     int     `json:"ms"`
}

func (e *estCorredor) sanear() {
	e.Dx = math.Max(-400, math.Min(600, e.Dx))
	e.Y = math.Max(-400, math.Min(0, e.Y))
	if e.Estado != "RUN" && e.Estado != "SALTO" && e.Estado != "HIT" && e.Estado != "KO" {
		e.Estado = "RUN"
	}
	e.Vidas = max(0, min(3, e.Vidas))
	e.Puntos = max(0, min(100000, e.Puntos))
	e.Esq = max(0, min(10000, e.Esq))
	e.Ms = max(0, min(int(claseTope/time.Millisecond)+5000, e.Ms))
}

type claseAlumno struct {
	ID      string
	Token   string
	Nombre  string
	Visto   time.Time
	Mejor   int
	Rondas  int
	Ganadas int
}

type claseAsiento struct {
	Alumno string // id del alumno; vacío = cpu
	Nombre string
	Est    estCorredor
	Visto  time.Time
	Fin    bool
}

type claseMesa struct {
	N        int
	Asientos []*claseAsiento // tres carriles: primero los alumnos, luego la cpu
}

type claseResultado struct {
	Mesa    int              `json:"mesa"`
	Puestos []map[string]any `json:"puestos"`
}

type clase struct {
	mu         sync.Mutex
	alumnos    map[string]*claseAlumno // por token
	orden      []*claseAlumno          // orden de llegada
	fase       string                  // lobby | cuenta | corre | resultados
	ronda      int
	salida     time.Time
	desde      time.Time // cuándo entró a la fase actual
	auto       time.Time // arranque automático previsto (cero = no hay)
	mesas      []*claseMesa
	resultados []claseResultado
	ahora      func() time.Time
	azar       func(int) int
}

func nuevaClase(ahora func() time.Time, azar func(int) int) *clase {
	return &clase{alumnos: map[string]*claseAlumno{}, fase: "lobby", ahora: ahora, azar: azar, desde: ahora()}
}

func (c *clase) presentes(ahora time.Time) []*claseAlumno {
	out := []*claseAlumno{}
	for _, a := range c.orden {
		if ahora.Sub(a.Visto) <= clasePresente {
			out = append(out, a)
		}
	}
	return out
}

func (c *clase) unirse(nombre, token string) (*claseAlumno, string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	ahora := c.ahora()
	if a := c.alumnos[token]; token != "" && a != nil {
		a.Visto = ahora
		return a, ""
	}
	nombre = limpiarNombre(nombre)
	if r := []rune(nombre); len(r) > 24 {
		nombre = string(r[:24])
	}
	if len([]rune(nombre)) < 2 || !nombreValido.MatchString(nombre) {
		return nil, "Escribe tu nombre (letras y espacios)."
	}
	// Dos «Ana» en la misma clase: la segunda sale como «Ana 2».
	base, n := nombre, 1
	for c.nombreUsado(nombre) {
		n++
		nombre = base + " " + strconv.Itoa(n)
	}
	a := &claseAlumno{ID: nuevoToken()[:10], Token: nuevoToken(), Nombre: nombre, Visto: ahora}
	c.alumnos[a.Token] = a
	c.orden = append(c.orden, a)
	c.programarAuto(ahora)
	return a, ""
}

func (c *clase) nombreUsado(n string) bool {
	k := clave(n)
	for _, a := range c.orden {
		if clave(a.Nombre) == k {
			return true
		}
	}
	return false
}

// programarAuto: en el vestíbulo, con 2 o más presentes, la primera ronda arranca sola a los 30 s.
func (c *clase) programarAuto(ahora time.Time) {
	if c.fase == "lobby" && c.auto.IsZero() && len(c.presentes(ahora)) >= 2 {
		c.auto = ahora.Add(claseAutoLobby)
	}
}

// empezar arma las mesas de la ronda y fija la salida común. Con s.mu tomado.
func (c *clase) empezarLocked(ahora time.Time) bool {
	if c.fase != "lobby" && c.fase != "resultados" {
		return false
	}
	pres := c.presentes(ahora)
	if len(pres) == 0 {
		return false
	}
	// Primera ronda: al azar. Luego por mejor puntaje (los de arriba juntos); empates, al azar.
	for i := len(pres) - 1; i > 0; i-- {
		j := c.azar(i + 1)
		pres[i], pres[j] = pres[j], pres[i]
	}
	if c.ronda > 0 {
		sort.SliceStable(pres, func(i, j int) bool { return pres[i].Mejor > pres[j].Mejor })
	}
	k := (len(pres) + 2) / 3
	base, extra := len(pres)/k, len(pres)%k
	c.mesas = c.mesas[:0]
	i := 0
	for m := 0; m < k; m++ {
		n := base
		if m < extra {
			n++
		}
		mesa := &claseMesa{N: m + 1}
		for _, a := range pres[i : i+n] {
			mesa.Asientos = append(mesa.Asientos, &claseAsiento{Alumno: a.ID, Nombre: a.Nombre, Visto: ahora, Est: estCorredor{Vidas: 3, Estado: "RUN"}})
		}
		for _, cpu := range []string{"KAGE", "YUKI"} {
			if len(mesa.Asientos) < 3 {
				mesa.Asientos = append(mesa.Asientos, &claseAsiento{Nombre: cpu, Fin: true})
			}
		}
		i += n
		c.mesas = append(c.mesas, mesa)
	}
	c.ronda++
	c.fase = "cuenta"
	c.salida = ahora.Add(claseCuenta)
	c.desde = ahora
	c.auto = time.Time{}
	c.resultados = nil
	return true
}

func (c *clase) asientoDe(id string) (*claseMesa, *claseAsiento) {
	for _, m := range c.mesas {
		for _, s := range m.Asientos {
			if s.Alumno != "" && s.Alumno == id {
				return m, s
			}
		}
	}
	return nil, nil
}

// avanzar: cuenta → corre → resultados → (sola) siguiente ronda. Se llama cada 250 ms.
func (c *clase) avanzar() {
	c.mu.Lock()
	defer c.mu.Unlock()
	ahora := c.ahora()
	switch c.fase {
	case "lobby":
		c.programarAuto(ahora)
		if !c.auto.IsZero() && !ahora.Before(c.auto) {
			if !c.empezarLocked(ahora) {
				c.auto = time.Time{}
			}
		}
	case "cuenta":
		if !ahora.Before(c.salida) {
			c.fase, c.desde = "corre", ahora
		}
	case "corre":
		todos := true
		for _, m := range c.mesas {
			for _, s := range m.Asientos {
				if s.Alumno == "" || s.Fin {
					continue
				}
				if ahora.Sub(s.Visto) > claseAusente { // cerró la pestaña: queda con lo último que mandó
					s.Fin = true
					continue
				}
				todos = false
			}
		}
		if todos || ahora.After(c.salida.Add(claseTope+claseGracia)) {
			c.cerrarRonda(ahora)
		}
	case "resultados":
		if !c.auto.IsZero() && !ahora.Before(c.auto) {
			if !c.empezarLocked(ahora) {
				c.auto = time.Time{}
			}
		}
	}
}

// cerrarRonda ordena cada mesa por puntaje (solo alumnos), suma al ranking y programa la siguiente.
func (c *clase) cerrarRonda(ahora time.Time) {
	c.resultados = c.resultados[:0]
	porID := map[string]*claseAlumno{}
	for _, a := range c.orden {
		porID[a.ID] = a
	}
	for _, m := range c.mesas {
		hum := []*claseAsiento{}
		for _, s := range m.Asientos {
			if s.Alumno != "" {
				hum = append(hum, s)
			}
		}
		sort.SliceStable(hum, func(i, j int) bool { return hum[i].Est.Puntos > hum[j].Est.Puntos })
		res := claseResultado{Mesa: m.N}
		for i, s := range hum {
			a := porID[s.Alumno]
			if a != nil {
				a.Rondas++
				a.Mejor = max(a.Mejor, s.Est.Puntos)
				if i == 0 && len(hum) > 1 && s.Est.Puntos > 0 {
					a.Ganadas++
				}
			}
			res.Puestos = append(res.Puestos, map[string]any{"nombre": s.Nombre, "puntos": s.Est.Puntos, "puesto": i + 1, "id": s.Alumno})
		}
		c.resultados = append(c.resultados, res)
	}
	c.fase, c.desde = "resultados", ahora
	if len(c.presentes(ahora)) >= 1 {
		c.auto = ahora.Add(claseAutoRes)
	}
}

func (c *clase) ranking() []map[string]any {
	l := []*claseAlumno{}
	for _, a := range c.orden {
		if a.Rondas > 0 {
			l = append(l, a)
		}
	}
	sort.SliceStable(l, func(i, j int) bool {
		if l[i].Mejor != l[j].Mejor {
			return l[i].Mejor > l[j].Mejor
		}
		return l[i].Ganadas > l[j].Ganadas
	})
	out := []map[string]any{}
	for i, a := range l {
		out = append(out, map[string]any{"puesto": i + 1, "nombre": a.Nombre, "mejor": a.Mejor, "ganadas": a.Ganadas, "rondas": a.Rondas, "id": a.ID})
	}
	return out
}

func ms(t time.Time) int64 {
	if t.IsZero() {
		return 0
	}
	return t.UnixMilli()
}

// comun: lo que ven todos (alumno y sala). Con c.mu tomado.
func (c *clase) comun(ahora time.Time) map[string]any {
	pres := c.presentes(ahora)
	nombres := make([]string, 0, len(pres))
	for _, a := range pres {
		nombres = append(nombres, a.Nombre)
	}
	return map[string]any{
		"ahora": ahora.UnixMilli(), "fase": c.fase, "ronda": c.ronda, "salida": ms(c.salida),
		"tope_ms": claseTope.Milliseconds(), "auto": ms(c.auto), "presentes": nombres,
		"ranking": c.ranking(), "resultados": c.resultados,
	}
}

func vistaAsiento(s *claseAsiento) map[string]any {
	return map[string]any{
		"nombre": s.Nombre, "humano": s.Alumno != "", "id": s.Alumno, "fin": s.Fin,
		"dx": s.Est.Dx, "y": s.Est.Y, "estado": s.Est.Estado, "vidas": s.Est.Vidas, "ko": s.Est.KO,
		"kamui": s.Est.Kamui, "invul": s.Est.Invul, "puntos": s.Est.Puntos,
	}
}

// vista del alumno: lo común más su mesa (los otros dos carriles, en orden fijo).
func (c *clase) vista(a *claseAlumno, ahora time.Time) map[string]any {
	v := c.comun(ahora)
	v["yo"] = map[string]any{"id": a.ID, "nombre": a.Nombre, "mejor": a.Mejor, "ganadas": a.Ganadas, "rondas": a.Rondas}
	if m, _ := c.asientoDe(a.ID); m != nil && c.fase != "lobby" {
		riv := []map[string]any{}
		for _, s := range m.Asientos {
			if s.Alumno != a.ID {
				riv = append(riv, vistaAsiento(s))
			}
		}
		v["mesa"] = map[string]any{"n": m.N, "rivales": riv}
	}
	return v
}

func (c *clase) sala(ahora time.Time) map[string]any {
	v := c.comun(ahora)
	mesas := []map[string]any{}
	for _, m := range c.mesas {
		as := []map[string]any{}
		for _, s := range m.Asientos {
			as = append(as, vistaAsiento(s))
		}
		mesas = append(mesas, map[string]any{"n": m.N, "asientos": as})
	}
	v["mesas"] = mesas
	return v
}

func (c *clase) reiniciar() {
	c.mu.Lock()
	defer c.mu.Unlock()
	*c = clase{alumnos: map[string]*claseAlumno{}, fase: "lobby", ahora: c.ahora, azar: c.azar, desde: c.ahora()}
}

func (s *Servidor) rutasClase(mux *http.ServeMux, pagina func(string) http.HandlerFunc, estaticos http.Handler) {
	c := s.clase
	mux.HandleFunc("GET /clase", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "clase/", http.StatusMovedPermanently)
	})
	mux.HandleFunc("GET /clase/{$}", pagina("clase.html"))
	mux.HandleFunc("GET /clase/sala", pagina("sala.html"))
	mux.Handle("GET /clase/static/", http.StripPrefix("/clase", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("v") != "" {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=3600")
		}
		estaticos.ServeHTTP(w, r)
	})))

	mux.HandleFunc("POST /clase/api/unirse", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Nombre string `json:"nombre"`
			T      string `json:"t"`
		}
		if leerJSON(r, &in, 2048) != nil {
			fallo(w, 400, "Pedido inválido.")
			return
		}
		a, err := c.unirse(in.Nombre, in.T)
		if a == nil {
			fallo(w, 400, err)
			return
		}
		c.mu.Lock()
		defer c.mu.Unlock()
		v := c.vista(a, c.ahora())
		v["t"] = a.Token
		responder(w, 200, v)
	})

	mux.HandleFunc("POST /clase/api/latido", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			T   string       `json:"t"`
			Est *estCorredor `json:"est"`
		}
		if leerJSON(r, &in, 4096) != nil {
			fallo(w, 400, "Pedido inválido.")
			return
		}
		c.mu.Lock()
		defer c.mu.Unlock()
		a := c.alumnos[in.T]
		if a == nil {
			fallo(w, 401, "Vuelve a entrar con tu nombre.")
			return
		}
		ahora := c.ahora()
		a.Visto = ahora
		if _, st := c.asientoDe(a.ID); st != nil {
			st.Visto = ahora
			if in.Est != nil && (c.fase == "corre" || c.fase == "cuenta") && !st.Fin {
				in.Est.sanear()
				st.Est = *in.Est
			}
		}
		c.programarAuto(ahora)
		responder(w, 200, c.vista(a, ahora))
	})

	mux.HandleFunc("POST /clase/api/fin", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			T      string `json:"t"`
			Puntos int    `json:"puntos"`
			Esq    int    `json:"esq"`
			Ms     int    `json:"ms"`
			Vidas  int    `json:"vidas"`
		}
		if leerJSON(r, &in, 2048) != nil {
			fallo(w, 400, "Pedido inválido.")
			return
		}
		c.mu.Lock()
		defer c.mu.Unlock()
		a := c.alumnos[in.T]
		if a == nil {
			fallo(w, 401, "Vuelve a entrar con tu nombre.")
			return
		}
		if _, st := c.asientoDe(a.ID); st != nil && !st.Fin && (c.fase == "corre" || c.fase == "cuenta") {
			st.Est.Puntos, st.Est.Esq, st.Est.Ms, st.Est.Vidas = in.Puntos, in.Esq, in.Ms, in.Vidas
			st.Est.KO = in.Vidas <= 0
			st.Est.sanear()
			st.Fin = true
		}
		responder(w, 200, c.vista(a, c.ahora()))
	})

	mux.HandleFunc("POST /clase/api/empezar", func(w http.ResponseWriter, r *http.Request) {
		c.mu.Lock()
		defer c.mu.Unlock()
		ahora := c.ahora()
		if !c.empezarLocked(ahora) {
			if c.fase == "cuenta" || c.fase == "corre" {
				fallo(w, 409, "Ya hay una ronda en marcha: entras en la siguiente.")
			} else {
				fallo(w, 409, "Todavía no hay nadie en la sala.")
			}
			return
		}
		responder(w, 200, c.sala(ahora))
	})

	mux.HandleFunc("GET /clase/api/sala", func(w http.ResponseWriter, r *http.Request) {
		c.mu.Lock()
		defer c.mu.Unlock()
		responder(w, 200, c.sala(c.ahora()))
	})

	mux.HandleFunc("POST /clase/api/admin/reiniciar", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			fallo(w, 401, "Clave incorrecta.")
			return
		}
		c.reiniciar()
		responder(w, 200, map[string]any{"ok": true})
	})
}

// limpiarLista: para pruebas y registros.
func nombresDe(l []*claseAlumno) string {
	n := make([]string, len(l))
	for i, a := range l {
		n[i] = a.Nombre
	}
	return strings.Join(n, ", ")
}
