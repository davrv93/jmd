package httpapi

// Repaso de de-01 en el LIVE de de-02: 20 plazas, preguntas y destreza.
// Un solo estado por Server, con candado. Reloj, respuestas, colisiones y puntos
// son autoritativos; el navegador sólo dibuja y envía elecciones/coordenadas.
// No hay GPU, IA, goroutines de simulación ni estado persistente. Reiniciar el
// LMS pierde la partida (la UI detecta el identificador nuevo).
import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"sync"
	"time"
)

const repasoEscena = "02-pum-repaso"
const repasoMax = 20
const repasoPreguntaMS int64 = 14000
const repasoDestrezaMS int64 = 10000
const repasoCierreMS int64 = 5000
const repasoRondaMS = repasoPreguntaMS + repasoDestrezaMS + repasoCierreMS
const repasoSlotMS int64 = 1250

// Banco privado: sólo se publica la clave durante la explicación, no antes.
// Referencia: hard-to-explain-diseno/lessons/01-del-prompt-al-prototipo.md.
type repasoPregunta struct {
	Texto    string
	Opciones [3]string
	Buena    int
	Explica  string
}

var repasoBanco = []repasoPregunta{
	{"¿Qué hace comprobable un pedido?", [3]string{"Pedir que quede bonito", "Decir qué se verá o ejecutará", "Añadir muchos adjetivos"}, 1, "La sexta parte es comprobación: algo visible o ejecutable, no una opinión."},
	{"El título se corta. ¿Qué corrección sirve?", [3]string{"Hazlo más profesional", "Rehaz toda la pieza", "Ajusta sólo el título a 390 px"}, 2, "Segundo pedido preciso: lugar, cambio y límite. No tocar lo que ya funciona."},
	{"El encuadre se desplaza de lado sin acercarse. Es…", [3]string{"Un paneo", "Un zoom", "Un aplastamiento"}, 0, "El paneo recorre lateralmente la escena; el zoom cambia cuánto ocupa el sujeto."},
	{"Para dar profundidad con capas, las cercanas…", [3]string{"Quedan siempre quietas", "Se mueven igual que todas", "Se desplazan más que las lejanas"}, 2, "El paralaje separa las capas por su velocidad aparente: cerca, más desplazamiento."},
	{"Willie se agacha antes de saltar. Vemos…", [3]string{"Anticipación", "Una exportación", "Un plano general"}, 0, "La anticipación prepara la acción y ayuda a que el salto se entienda."},
	{"Al caer, el personaje se aplasta y recupera su forma. Es…", [3]string{"Un paneo", "Aplastar y estirar", "Un cambio de archivo"}, 1, "Aplastar y estirar comunica peso y elasticidad; se procura conservar el volumen."},
	{"Un movimiento rápido al inicio frena suavemente al final. Es…", [3]string{"Velocidad constante", "Un corte seco", "Una salida suave (ease-out)"}, 2, "Ease-out reduce la velocidad al final; no es moverse a velocidad constante."},
	{"¿Qué permite revisar la misma pose sin depender de reproducir antes?", [3]string{"Tiempo absoluto, como ?t=7", "Azar distinto en cada cuadro", "Sólo el botón Reproducir"}, 0, "Una línea de tiempo basada en tiempo absoluto permite volver al mismo instante."},
	{"A 120 pulsos por minuto, cada pulso dura…", [3]string{"Dos segundos", "Medio segundo", "Cinco segundos"}, 1, "60 segundos / 120 pulsos = 0,5 s. La pieza usa también una rejilla de 0,25 s."},
	{"¿Por qué hicimos la pieza con HTML, SVG y código abierto?", [3]string{"Para no revisar el resultado", "Porque el agente nunca se equivoca", "Para abrir, corregir y repetir la pieza"}, 2, "El control está en poder leer y cambiar el archivo, comprobarlo y repetirlo."},
}

type repasoAlumno struct {
	ID         string `json:"id"`
	Nombre     string `json:"nombre"`
	Puntos     int    `json:"puntos"`
	Aciertos   int    `json:"aciertos"`
	Golpes     int    `json:"golpes"`
	Instructor bool   `json:"instructor"`
	visto      time.Time
	respuestas map[int]int
	golpes     map[int]map[int]bool
	intentos   map[int64]int
}
type repasoArena struct {
	sync.Mutex
	jugadores map[string]*repasoAlumno
	partida   string
	inicio    time.Time
	cerrado   bool
	secuencia int
}

func nuevoRepaso() *repasoArena {
	return &repasoArena{jugadores: map[string]*repasoAlumno{}, partida: fmt.Sprintf("%d", time.Now().UnixNano())}
}
func (a *repasoArena) fase(now time.Time) (string, int, int64) {
	if a.inicio.IsZero() {
		return "sala", 0, 0
	}
	elapsed := now.Sub(a.inicio).Milliseconds()
	if elapsed < 0 {
		elapsed = 0
	}
	ronda := int(elapsed / repasoRondaMS)
	if ronda >= len(repasoBanco) {
		return "final", len(repasoBanco) - 1, 0
	}
	if a.cerrado {
		return "final", ronda, 0
	}
	offset := elapsed % repasoRondaMS
	start := a.inicio.UnixMilli() + int64(ronda)*repasoRondaMS
	if offset < repasoPreguntaMS {
		return "pregunta", ronda, start + repasoPreguntaMS
	}
	if offset < repasoPreguntaMS+repasoDestrezaMS {
		return "destreza", ronda, start + repasoPreguntaMS + repasoDestrezaMS
	}
	return "explicacion", ronda, start + repasoRondaMS
}
func (a *repasoArena) plazas() (alumnos, instructores int) {
	for _, j := range a.jugadores {
		if j.Instructor {
			instructores++
		} else {
			alumnos++
		}
	}
	return
}
func (a *repasoArena) unir(sub, nombre string, now time.Time) (*repasoAlumno, error) {
	return a.unirComo(sub, nombre, false, now)
}
func (a *repasoArena) unirComo(sub, nombre string, instructor bool, now time.Time) (*repasoAlumno, error) {
	if j := a.jugadores[sub]; j != nil {
		j.visto = now
		return j, nil
	}
	alumnos, profes := a.plazas()
	if !instructor && alumnos >= repasoMax {
		return nil, noVale("Las 20 plazas están ocupadas. Puedes seguir como espectador.")
	}
	if instructor && profes >= 1 {
		return nil, noVale("Otra cuenta de instructor ya ocupa la plaza de juego.")
	}
	a.secuencia++
	j := &repasoAlumno{ID: fmt.Sprintf("p%d", a.secuencia), Nombre: nombre, Instructor: instructor, visto: now, respuestas: map[int]int{}, golpes: map[int]map[int]bool{}, intentos: map[int64]int{}}
	a.jugadores[sub] = j
	return j, nil
}

// La semilla pública sólo coloca blancos; nunca contiene la respuesta ni permite
// enviar puntos. El hash es el mismo de la escena JS (aritmética uint32).
func semillaRepaso(id string, round int) uint32 {
	n := uint32(2166136261)
	for _, b := range []byte(id) {
		n = (n ^ uint32(b)) * 16777619
	}
	return n + uint32(round)*7919
}
func blancoRepaso(seed uint32, round, slot int, progress float64) (float64, float64) {
	if round%2 == 0 {
		return .18 + float64((int(seed%3)+slot)%3)*.32, .28 + float64(slot%2)*.38
	}
	phase := float64(seed%1000) / 1000 * math.Pi * 2
	return .5 + .28*math.Sin(float64(slot)*1.7+progress*2+phase), .78 - .58*progress
}

type repasoJugada struct {
	Accion    string  `json:"accion"`
	Partida   string  `json:"partida"`
	Ronda     int     `json:"ronda"`
	Respuesta *int    `json:"respuesta"`
	Slot      int     `json:"slot"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	AtMS      int64   `json:"at_ms"`
}

func (a *repasoArena) jugar(j *repasoAlumno, in repasoJugada, now time.Time) error {
	if in.Partida != a.partida {
		return noVale("La partida cambió; sincroniza y vuelve a intentarlo.")
	}
	fase, ronda, _ := a.fase(now)
	if fase == "sala" || fase == "final" || in.Ronda != ronda {
		return noVale("Esa ronda ya no está disponible.")
	}
	switch in.Accion {
	case "responder":
		if fase != "pregunta" {
			return noVale("Se cerró el tiempo de responder.")
		}
		if in.Respuesta == nil || *in.Respuesta < 0 || *in.Respuesta >= 3 {
			return fmt.Errorf("elige una de las tres respuestas")
		}
		if _, ok := j.respuestas[ronda]; ok {
			return noVale("Tu respuesta ya está guardada.")
		}
		j.respuestas[ronda] = *in.Respuesta
		if *in.Respuesta == repasoBanco[ronda].Buena {
			j.Puntos += 100
			j.Aciertos++
		}
	case "golpear":
		if fase != "destreza" {
			return noVale("El reto de destreza aún no está activo o ya terminó.")
		}
		// Hasta 650 ms de transporte y 100 ms de desfase de reloj; nunca otra ronda.
		at := in.AtMS
		if at > now.UnixMilli()+100 || at < now.UnixMilli()-650 {
			return noVale("El golpe llegó fuera de tiempo.")
		}
		start := a.inicio.UnixMilli() + int64(ronda)*repasoRondaMS + repasoPreguntaMS
		elapsed := at - start
		if elapsed < 0 || elapsed >= repasoDestrezaMS || in.Slot < 0 || in.Slot >= 8 || int(elapsed/repasoSlotMS) != in.Slot {
			return noVale("Ese blanco ya cambió.")
		}
		// No más de cuatro intentos por segundo, incluso con solicitudes paralelas.
		bucket := now.UnixMilli() / 1000
		for k := range j.intentos {
			if k < bucket-1 {
				delete(j.intentos, k)
			}
		}
		if j.intentos[bucket] >= 4 {
			return noVale("Espera un instante antes del siguiente golpe.")
		}
		j.intentos[bucket]++
		if j.golpes[ronda] == nil {
			j.golpes[ronda] = map[int]bool{}
		}
		if j.golpes[ronda][in.Slot] {
			return noVale("Ese blanco ya sumó puntos.")
		}
		x, y := blancoRepaso(semillaRepaso(j.ID, ronda), ronda, in.Slot, float64(elapsed%repasoSlotMS)/float64(repasoSlotMS))
		if math.IsNaN(in.X) || math.IsNaN(in.Y) || math.IsInf(in.X, 0) || math.IsInf(in.Y, 0) || in.X < 0 || in.X > 1 || in.Y < 0 || in.Y > 1 {
			return fmt.Errorf("coordenadas inválidas")
		}
		// Arena 2:1. Radio 0,135 alto; tolerancia 0,025 por transporte y puntero.
		if math.Hypot((in.X-x)*2, in.Y-y) > .16 {
			return noVale("Casi: apunta al centro del blanco.")
		}
		j.golpes[ronda][in.Slot] = true
		j.Golpes++
		j.Puntos += 5
	default:
		return fmt.Errorf("acción desconocida")
	}
	return nil
}
func (a *repasoArena) vista(sub string, staff bool, now time.Time) map[string]any {
	fase, ronda, vence := a.fase(now)
	tabla := []map[string]any{}
	conectados := 0
	for _, p := range a.jugadores {
		activo := now.Sub(p.visto) < 45*time.Second
		if activo {
			conectados++
		}
		tabla = append(tabla, map[string]any{"id": p.ID, "nombre": p.Nombre, "puntos": p.Puntos, "aciertos": p.Aciertos, "golpes": p.Golpes, "activo": activo})
	}
	sort.Slice(tabla, func(i, j int) bool {
		pi, pj := tabla[i]["puntos"].(int), tabla[j]["puntos"].(int)
		if pi != pj {
			return pi > pj
		}
		return tabla[i]["id"].(string) < tabla[j]["id"].(string)
	})
	var yo any
	puesto := 0
	if p := a.jugadores[sub]; p != nil {
		var elegida any
		if r, ok := p.respuestas[ronda]; ok {
			elegida = r
		}
		hitSlots := []int{}
		for s := range p.golpes[ronda] {
			hitSlots = append(hitSlots, s)
		}
		sort.Ints(hitSlots)
		yo = map[string]any{"id": p.ID, "puntos": p.Puntos, "aciertos": p.Aciertos, "golpes": p.Golpes, "respuesta": elegida, "slots": hitSlots, "semilla": semillaRepaso(p.ID, ronda), "instructor": p.Instructor}
		for i, t := range tabla {
			if t["id"] == p.ID {
				puesto = i + 1
			}
		}
	}
	if !staff && len(tabla) > 5 {
		tabla = tabla[:5]
	}
	alumnos, profesores := a.plazas()
	v := map[string]any{"instructores": profesores, "partida": a.partida, "ahora_ms": now.UnixMilli(), "fase": fase, "ronda": ronda, "rondas": len(repasoBanco), "vence_ms": vence, "staff": staff, "capacidad": repasoMax, "inscritos": alumnos, "conectados": conectados, "yo": yo, "puesto": puesto, "tabla": tabla}
	if fase != "sala" {
		q := repasoBanco[ronda]
		v["pregunta"] = map[string]any{"texto": q.Texto, "opciones": q.Opciones}
		v["reto"] = []string{"hongos", "globos"}[ronda%2]
		v["destreza_inicio_ms"] = a.inicio.UnixMilli() + int64(ronda)*repasoRondaMS + repasoPreguntaMS
	}
	if fase == "explicacion" || fase == "final" {
		v["correcta"] = repasoBanco[ronda].Buena
		v["explicacion"] = repasoBanco[ronda].Explica
	}
	return v
}
func (s *Server) repasoAcceso(w http.ResponseWriter, r *http.Request, p *Principal) bool {
	l := s.liveLeccion(w, r, p)
	if l == nil {
		return false
	}
	if l.ID != "de-02" || s.Content.Get().Escena(l.ID, repasoEscena) == nil {
		notFound(w, "el juego de repaso")
		return false
	}
	return true
}
func (s *Server) liveRepasoGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.repasoAcceso(w, r, p) {
		return
	}
	a := s.repaso
	a.Lock()
	defer a.Unlock()
	now := time.Now()
	if j := a.jugadores[p.ID]; j != nil {
		j.visto = now
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, a.vista(p.ID, p.Staff(), now))
}
func (s *Server) liveRepasoPost(w http.ResponseWriter, r *http.Request, p *Principal) {
	if !s.repasoAcceso(w, r, p) {
		return
	}
	var in repasoJugada
	if !readJSON(w, r, &in) {
		return
	}
	a := s.repaso
	a.Lock()
	defer a.Unlock()
	now := time.Now()
	switch in.Accion {
	case "iniciar", "terminar":
		if !p.Staff() {
			forbidden(w)
			return
		}
		if in.Accion == "iniciar" {
			// El instructor puede dirigir y jugar. Su plaza no desplaza a los 20 alumnos.
			_, _ = a.unirComo(p.ID, nombreMuro(p), true, now)
			a.partida = fmt.Sprintf("%d", now.UnixNano())
			a.inicio = now
			a.cerrado = false
			for id, j := range a.jugadores {
				if now.Sub(j.visto) > 45*time.Second {
					delete(a.jugadores, id)
					continue
				}
				j.Puntos = 0
				j.Aciertos = 0
				j.Golpes = 0
				j.respuestas = map[int]int{}
				j.golpes = map[int]map[int]bool{}
				j.intentos = map[int64]int{}
			}
		} else {
			a.cerrado = true
			if a.inicio.IsZero() {
				a.inicio = now
			}
		}
	case "unirse":
		if _, err := a.unirComo(p.ID, nombreMuro(p), p.Staff(), now); err != nil {
			writeErr(w, 409, "sala_llena", err.Error())
			return
		}
	case "responder", "golpear":
		j := a.jugadores[p.ID]
		if j == nil {
			writeErr(w, 409, "unirse_primero", "Entra a la partida antes de jugar.")
			return
		}
		j.visto = now
		if err := a.jugar(j, in, now); err != nil {
			if _, ok := err.(errorJuego); ok {
				writeErr(w, 409, "jugada_no_valida", err.Error())
			} else {
				badRequest(w, err.Error())
			}
			return
		}
	default:
		badRequest(w, "acción: unirse, iniciar, terminar, responder o golpear")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, a.vista(p.ID, p.Staff(), now))
}
