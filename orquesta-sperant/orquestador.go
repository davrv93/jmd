package main

// Agente orquestador: por cada ticket llama al clasificador, aplica la regla
// de derivación y ejecuta acciones SOLO de la lista blanca. Cada paso queda en
// la auditoría con entrada, salida, motor, modelo, tokens, costo y duración.

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"sync"
	"time"
)

var lima = time.FixedZone("Lima", -5*3600)

type Comentario struct {
	Autor   string    `json:"autor"`
	Texto   string    `json:"texto"`
	Interno bool      `json:"interno"`
	En      time.Time `json:"en"`
}

type Ticket struct {
	ID            int          `json:"id"`
	Asunto        string       `json:"asunto"`
	Descripcion   string       `json:"descripcion"`
	Proyecto      string       `json:"proyecto"`
	Solicitante   string       `json:"solicitante"`
	Empresa       string       `json:"empresa"`
	Correo        string       `json:"correo"`
	Canal         string       `json:"canal"`
	Estado        string       `json:"estado"` // nuevo | en_revision | asignado | en_proceso | resuelto
	Categoria     string       `json:"categoria,omitempty"`
	Prioridad     string       `json:"prioridad,omitempty"`
	Area          string       `json:"area,omitempty"`
	Confianza     float64      `json:"confianza,omitempty"`
	Justificacion string       `json:"justificacion,omitempty"`
	Motor         string       `json:"motor,omitempty"`
	Responsable   string       `json:"responsable,omitempty"`
	Comentarios   []Comentario `json:"comentarios"`
	CreadoEn      time.Time    `json:"creadoEn"`
	ClasificadoEn *time.Time   `json:"clasificadoEn,omitempty"`
	DerivadoEn    *time.Time   `json:"derivadoEn,omitempty"`
}

type Correo struct {
	ID        int       `json:"id"`
	Ticket    int       `json:"ticket"`
	Para      string    `json:"para"`
	Nombre    string    `json:"nombre"`
	Asunto    string    `json:"asunto"`
	Cuerpo    string    `json:"cuerpo"`
	Plantilla string    `json:"plantilla"`
	En        time.Time `json:"en"`
}

type Auditoria struct {
	ID         int       `json:"id"`
	En         time.Time `json:"en"`
	Ticket     int       `json:"ticket"`
	Tipo       string    `json:"tipo"` // clasificacion | derivacion | revision | accion | accion_rechazada | revision_humana | evaluacion | config
	Entrada    string    `json:"entrada"`
	Salida     string    `json:"salida"`
	Motor      string    `json:"motor"`
	Modelo     string    `json:"modelo"`
	TokEntrada int       `json:"tokensEntrada"`
	TokSalida  int       `json:"tokensSalida"`
	Costo      float64   `json:"costo"`
	DuracionMs int64     `json:"duracionMs"`
	Resultado  string    `json:"resultado"` // ok | rechazado | error
}

type Config struct {
	Motor        string  `json:"motor"` // reglas | claude
	Umbral       float64 `json:"umbral"`
	Programado   bool    `json:"programado"`
	IntervaloMin int     `json:"intervaloMin"`
	Lote         int     `json:"lote"`
}

type Acierto struct {
	Total    int `json:"total"`
	Aciertos int `json:"aciertos"`
}

type Confusion struct {
	Esperado string `json:"esperado"`
	Obtenido string `json:"obtenido"`
	N        int    `json:"n"`
	Tickets  []int  `json:"tickets"`
}

type FilaEval struct {
	ID        int      `json:"id"`
	Asunto    string   `json:"asunto"`
	Oro       Etiqueta `json:"oro"`
	Pred      Etiqueta `json:"pred"`
	Confianza float64  `json:"confianza"`
	Motor     string   `json:"motor"`
	Ms        int64    `json:"ms"`
	Costo     float64  `json:"costo"`
}

type Evaluacion struct {
	Motor            string              `json:"motor"`
	Modelo           string              `json:"modelo"`
	En               time.Time           `json:"en"`
	Total            int                 `json:"total"`
	AciertoCategoria float64             `json:"aciertoCategoria"`
	AciertoArea      float64             `json:"aciertoArea"`
	AciertoPrioridad float64             `json:"aciertoPrioridad"`
	Umbral           float64             `json:"umbral"`
	SobreUmbral      int                 `json:"sobreUmbral"`
	AciertoAreaAuto  float64             `json:"aciertoAreaAuto"` // acierto de área entre los que se derivarían solos
	PorCategoria     map[string]*Acierto `json:"porCategoria"`
	PorArea          map[string]*Acierto `json:"porArea"`
	Confusiones      []Confusion         `json:"confusiones"`
	CostoTotal       float64             `json:"costoTotal"`
	CostoPorTicket   float64             `json:"costoPorTicket"`
	MsPorTicket      float64             `json:"msPorTicket"`
	Respaldos        int                 `json:"respaldos"`
	Filas            []FilaEval          `json:"filas"`
}

type Estado struct {
	Tickets      []*Ticket              `json:"tickets"`
	Correos      []Correo               `json:"correos"`
	Auditoria    []Auditoria            `json:"auditoria"`
	Config       Config                 `json:"config"`
	Gasto        float64                `json:"gasto"`
	LlamadasLLM  int                    `json:"llamadasLLM"`
	Evaluaciones map[string]*Evaluacion `json:"evaluaciones"`
	SigTicket    int                    `json:"sigTicket"`
	SigCorreo    int                    `json:"sigCorreo"`
	SigAuditoria int                    `json:"sigAuditoria"`
	SigLlegada   int                    `json:"sigLlegada"`
	UltimaPasada *time.Time             `json:"ultimaPasada,omitempty"`
	CreadoEn     time.Time              `json:"creadoEn"`
}

type Servidor struct {
	mu          sync.Mutex
	e           Estado
	archivo     string
	clave       string
	tokenMCP    string
	basePub     string
	llm         LLM
	tope        float64
	saldoMin    float64
	reservado   float64
	ahora       func() time.Time
	porIP       map[string][]time.Time
	evalEnCurso string
	evalAvance  int
	ultimoSaldo *float64
	saldoEn     time.Time
}

const (
	maxAuditoria = 3000
	maxCorreos   = 1500
	maxTickets   = 600
)

// ---------- lista blanca ----------

// Las ÚNICAS escrituras que el agente puede hacer. Cualquier otra se rechaza
// y queda registrada como accion_rechazada.
var listaBlanca = map[string]string{
	"asignar":       "Asignar el ticket a un responsable en el simulador",
	"comentar":      "Registrar un comentario interno en el ticket",
	"enviar_correo": "Enviar un correo desde una plantilla aprobada (a la bandeja simulada)",
}

type Accion struct {
	Tipo        string
	Ticket      int
	Responsable string
	Texto       string
	Plantilla   string
	Para        Persona
	Datos       map[string]string
}

var errNoPermitida = errors.New("acción fuera de la lista blanca")

// ejecutar se llama con s.mu tomado.
func (s *Servidor) ejecutar(a Accion, motor string) error {
	ent, _ := json.Marshal(map[string]any{"accion": a.Tipo, "ticket": a.Ticket, "responsable": a.Responsable, "plantilla": a.Plantilla, "para": a.Para.Correo})
	if _, ok := listaBlanca[a.Tipo]; !ok {
		s.auditar(Auditoria{Ticket: a.Ticket, Tipo: "accion_rechazada", Entrada: string(ent),
			Salida: fmt.Sprintf("Rechazada: «%s» no está en la lista blanca (%s).", a.Tipo, strings.Join(clavesLista(), ", ")),
			Motor:  motor, Resultado: "rechazado"})
		return fmt.Errorf("%w: %s", errNoPermitida, a.Tipo)
	}
	t := s.ticket(a.Ticket)
	if t == nil {
		return fmt.Errorf("ticket %d no existe", a.Ticket)
	}
	ahora := s.ahora()
	var salida string
	switch a.Tipo {
	case "asignar":
		p, ok := persona(a.Responsable)
		if !ok {
			return fmt.Errorf("responsable %q no existe", a.Responsable)
		}
		t.Responsable, t.Estado, t.DerivadoEn = p.ID, "asignado", &ahora
		salida = fmt.Sprintf("Ticket #%d asignado a %s (%s).", t.ID, p.Nombre, nombreArea(p.Area))
	case "comentar":
		t.Comentarios = append(t.Comentarios, Comentario{Autor: "Orquestador", Texto: a.Texto, Interno: true, En: ahora})
		salida = "Comentario interno registrado."
	case "enviar_correo":
		asunto, cuerpo, err := plantillaCorreo(a.Plantilla, a.Datos)
		if err != nil {
			s.auditar(Auditoria{Ticket: a.Ticket, Tipo: "accion_rechazada", Entrada: string(ent), Salida: err.Error(), Motor: motor, Resultado: "rechazado"})
			return err
		}
		s.e.SigCorreo++
		s.e.Correos = append(s.e.Correos, Correo{ID: s.e.SigCorreo, Ticket: t.ID, Para: a.Para.Correo, Nombre: a.Para.Nombre,
			Asunto: asunto, Cuerpo: cuerpo, Plantilla: a.Plantilla, En: ahora})
		if len(s.e.Correos) > maxCorreos {
			s.e.Correos = s.e.Correos[len(s.e.Correos)-maxCorreos:]
		}
		salida = fmt.Sprintf("Correo «%s» a %s <%s> (bandeja simulada).", a.Plantilla, a.Para.Nombre, a.Para.Correo)
	}
	s.auditar(Auditoria{Ticket: a.Ticket, Tipo: "accion", Entrada: string(ent), Salida: salida, Motor: motor, Resultado: "ok"})
	return nil
}

func clavesLista() []string {
	var ks []string
	for k := range listaBlanca {
		ks = append(ks, k)
	}
	sort.Strings(ks)
	return ks
}

// ---------- plantillas aprobadas ----------

var plantillas = map[string][2]string{
	"aviso_responsable": {"[Mesa de ayuda] Ticket #{id} asignado: {asunto}",
		"Hola {nombre}:\n\nSe te asignó el ticket #{id}.\n\nCategoría: {categoria}\nPrioridad: {prioridad}\nSolicitante: {solicitante} — {empresa}\nProyecto: {proyecto}\nAsunto: {asunto}\n\nPor qué te llega: {justificacion}\nConfianza del clasificador: {confianza} · motor: {motor}\n\nTiempo objetivo de primera respuesta: {sla}.\n\n— Orquestador de la mesa de ayuda (demo, datos ficticios)"},
	"acuse_solicitante": {"Recibimos tu ticket #{id}: {asunto}",
		"Hola {solicitante}:\n\nRegistramos tu solicitud «{asunto}» con el número #{id}.\nLa atenderá {responsable}, del área {area}.\nTiempo objetivo de primera respuesta: {sla}.\n\nPuedes responder a este correo para agregar información.\n\n— Mesa de ayuda (demo, datos ficticios)"},
	"revision_coordinacion": {"[Revisión] El ticket #{id} necesita una persona",
		"Hola {nombre}:\n\nEl clasificador no tiene suficiente seguridad para derivar el ticket #{id}, así que no lo derivó.\n\nAsunto: {asunto}\nPropuesta del clasificador: {categoria} → {area}\nConfianza: {confianza} (umbral {umbral}) · motor: {motor}\nMotivo: {justificacion}\n\nRevísalo en la cola de revisión y deriva a mano.\n\n— Orquestador de la mesa de ayuda (demo, datos ficticios)"},
}

func plantillaCorreo(nombre string, datos map[string]string) (string, string, error) {
	p, ok := plantillas[nombre]
	if !ok {
		return "", "", fmt.Errorf("plantilla «%s» no aprobada", nombre)
	}
	var pares []string
	for k, v := range datos {
		pares = append(pares, "{"+k+"}", v)
	}
	r := strings.NewReplacer(pares...)
	return r.Replace(p[0]), r.Replace(p[1]), nil
}

func sla(prio string) string {
	switch prio {
	case "alta":
		return "4 horas hábiles"
	case "baja":
		return "2 días hábiles"
	}
	return "1 día hábil"
}

// ---------- auditoría ----------

func (s *Servidor) auditar(a Auditoria) {
	s.e.SigAuditoria++
	a.ID = s.e.SigAuditoria
	if a.En.IsZero() {
		a.En = s.ahora()
	}
	s.e.Auditoria = append(s.e.Auditoria, a)
	if len(s.e.Auditoria) > maxAuditoria {
		s.e.Auditoria = s.e.Auditoria[len(s.e.Auditoria)-maxAuditoria:]
	}
}

func (s *Servidor) ticket(id int) *Ticket {
	for _, t := range s.e.Tickets {
		if t.ID == id {
			return t
		}
	}
	return nil
}

// ---------- clasificación con control de gasto ----------

func (s *Servidor) motorDisponible() (bool, string) {
	if s.llm == nil {
		return false, "no hay clave de Claude configurada"
	}
	if s.e.Gasto+s.reservado+maxPorLlamada > s.tope {
		return false, fmt.Sprintf("tope de gasto de la demo alcanzado (US$%.2f de US$%.2f)", s.e.Gasto, s.tope)
	}
	return true, ""
}

// clasificar NO se llama con s.mu tomado: la llamada a Claude tarda.
func (s *Servidor) clasificar(asunto, desc, motor string) (Clasificacion, Traza) {
	ini := time.Now()
	if motor == "claude" {
		s.mu.Lock()
		ok, motivo := s.motorDisponible()
		if ok {
			s.reservado += maxPorLlamada
		}
		s.mu.Unlock()
		if ok {
			usuario := "Ticket:\nAsunto: " + asunto + "\nDescripción: " + desc
			txt, in, out, costo, estimado, err := s.llm.Completar(promptSistema(), usuario)
			s.mu.Lock()
			s.reservado -= maxPorLlamada
			s.e.Gasto += costo
			s.e.LlamadasLLM++
			s.mu.Unlock()
			tr := Traza{Motor: "claude", Modelo: s.llm.Modelo() + " vía " + s.llm.Nombre(), TokEntrada: in, TokSalida: out,
				Costo: costo, CostoEstimdo: estimado, DuracionMs: time.Since(ini).Milliseconds(), SalidaCruda: recortar(txt, 600)}
			if err == nil {
				c, perr := parsearClasificacion(txt)
				if perr == nil {
					c.Confianza = math.Round(c.Confianza*100) / 100
					return c, tr
				}
				err = perr
			}
			motivo = "Claude falló: " + err.Error()
			c := clasificarReglas(asunto, desc)
			tr.Motor, tr.Respaldo = "reglas (respaldo: "+motivo+")", motivo
			tr.DuracionMs = time.Since(ini).Milliseconds()
			return c, tr
		}
		c := clasificarReglas(asunto, desc)
		return c, Traza{Motor: "reglas (respaldo: " + motivo + ")", Modelo: "palabras clave v1", Respaldo: motivo,
			DuracionMs: time.Since(ini).Milliseconds()}
	}
	c := clasificarReglas(asunto, desc)
	return c, Traza{Motor: "reglas", Modelo: "palabras clave v1", DuracionMs: time.Since(ini).Milliseconds()}
}

func recortar(s string, n int) string {
	if len([]rune(s)) <= n {
		return s
	}
	return string([]rune(s)[:n]) + "…"
}

// ---------- derivación ----------

func (s *Servidor) carga(id string) int {
	n := 0
	for _, t := range s.e.Tickets {
		if t.Responsable == id && (t.Estado == "asignado" || t.Estado == "en_proceso") {
			n++
		}
	}
	return n
}

// responsable: la persona del área con menos tickets abiertos; empate → orden
// de la lista del equipo.
func (s *Servidor) responsable(area string) (Persona, int, bool) {
	var mejor Persona
	min := -1
	for _, p := range equipo {
		if p.Area != area {
			continue
		}
		if c := s.carga(p.ID); min < 0 || c < min {
			mejor, min = p, c
		}
	}
	return mejor, min, min >= 0
}

// ---------- orquestación de un ticket ----------

type Resultado struct {
	Ticket        int           `json:"ticket"`
	Clasificacion Clasificacion `json:"clasificacion"`
	Motor         string        `json:"motor"`
	Modelo        string        `json:"modelo"`
	Decision      string        `json:"decision"` // derivado | en_revision
	Responsable   string        `json:"responsable,omitempty"`
	Correos       int           `json:"correos"`
	Costo         float64       `json:"costo"`
	DuracionMs    int64         `json:"duracionMs"`
}

func (s *Servidor) procesar(id int) (Resultado, error) {
	s.mu.Lock()
	t := s.ticket(id)
	if t == nil {
		s.mu.Unlock()
		return Resultado{}, fmt.Errorf("el ticket %d no existe", id)
	}
	if t.Estado != "nuevo" {
		s.mu.Unlock()
		return Resultado{}, fmt.Errorf("el ticket %d ya fue procesado (estado: %s)", id, t.Estado)
	}
	t.Estado = "clasificando"
	asunto, desc, motor := t.Asunto, t.Descripcion, s.e.Config.Motor
	s.mu.Unlock()

	c, tr := s.clasificar(asunto, desc, motor)

	s.mu.Lock()
	defer func() { s.guardar(); s.mu.Unlock() }()
	t = s.ticket(id)
	if t == nil { // se reinició la demo mientras tanto
		return Resultado{}, fmt.Errorf("el ticket %d ya no existe", id)
	}
	return s.aplicar(t, c, tr), nil
}

// aplicar: con s.mu tomado.
func (s *Servidor) aplicar(t *Ticket, c Clasificacion, tr Traza) Resultado {
	ahora := s.ahora()
	umbral := s.e.Config.Umbral
	ent, _ := json.Marshal(map[string]string{"asunto": t.Asunto, "descripcion": t.Descripcion})
	sal, _ := json.Marshal(c)
	salida := string(sal)
	if tr.SalidaCruda != "" && strings.HasPrefix(tr.Motor, "reglas") {
		salida += " · salida cruda de Claude: " + tr.SalidaCruda
	}
	res := "ok"
	if tr.Respaldo != "" {
		res = "error"
	}
	s.auditar(Auditoria{Ticket: t.ID, Tipo: "clasificacion", Entrada: string(ent), Salida: salida, Motor: tr.Motor, Modelo: tr.Modelo,
		TokEntrada: tr.TokEntrada, TokSalida: tr.TokSalida, Costo: tr.Costo, DuracionMs: tr.DuracionMs, Resultado: res})
	t.Categoria, t.Prioridad, t.Area, t.Confianza, t.Justificacion, t.Motor = c.Categoria, c.Prioridad, c.Area, c.Confianza, c.Justificacion, tr.Motor
	t.ClasificadoEn = &ahora
	r := Resultado{Ticket: t.ID, Clasificacion: c, Motor: tr.Motor, Modelo: tr.Modelo, Costo: tr.Costo, DuracionMs: tr.DuracionMs}
	pct := fmt.Sprintf("%.0f %%", c.Confianza*100)
	datos := map[string]string{"id": fmt.Sprint(t.ID), "asunto": t.Asunto, "categoria": nombreCategoria(c.Categoria),
		"prioridad": c.Prioridad, "area": nombreArea(c.Area), "confianza": pct, "umbral": fmt.Sprintf("%.0f %%", umbral*100),
		"motor": tr.Motor, "justificacion": c.Justificacion, "solicitante": t.Solicitante, "empresa": t.Empresa,
		"proyecto": t.Proyecto, "sla": sla(c.Prioridad)}

	if c.Confianza < umbral || !areaValida(c.Area) {
		t.Estado = "en_revision"
		r.Decision = "en_revision"
		s.auditar(Auditoria{Ticket: t.ID, Tipo: "revision", Entrada: fmt.Sprintf("confianza %.2f, umbral %.2f", c.Confianza, umbral),
			Salida: "Confianza bajo el umbral: no se deriva; pasa a la cola de revisión humana.", Motor: "regla de umbral", Resultado: "ok"})
		_ = s.ejecutar(Accion{Tipo: "comentar", Ticket: t.ID, Texto: fmt.Sprintf("Clasificación dudosa (%s, confianza %s < umbral %.0f %%). Enviado a revisión humana. Motivo: %s", nombreCategoria(c.Categoria), pct, umbral*100, c.Justificacion)}, "orquestador")
		datos["nombre"] = coordinacion.Nombre
		if s.ejecutar(Accion{Tipo: "enviar_correo", Ticket: t.ID, Plantilla: "revision_coordinacion", Para: coordinacion, Datos: datos}, "orquestador") == nil {
			r.Correos++
		}
		return r
	}
	p, carga, _ := s.responsable(c.Area)
	s.auditar(Auditoria{Ticket: t.ID, Tipo: "derivacion", Entrada: fmt.Sprintf("área %s, confianza %.2f ≥ umbral %.2f", c.Area, c.Confianza, umbral),
		Salida: fmt.Sprintf("Responsable: %s — la persona de %s con menos tickets abiertos (%d).", p.Nombre, nombreArea(c.Area), carga),
		Motor:  "regla de derivación por área y carga", Resultado: "ok"})
	if err := s.ejecutar(Accion{Tipo: "asignar", Ticket: t.ID, Responsable: p.ID}, "orquestador"); err != nil {
		log.Printf("asignar %d: %v", t.ID, err)
	}
	_ = s.ejecutar(Accion{Tipo: "comentar", Ticket: t.ID, Texto: fmt.Sprintf("Clasificado como %s · prioridad %s · confianza %s (motor: %s). Derivado a %s. %s", nombreCategoria(c.Categoria), c.Prioridad, pct, tr.Motor, p.Nombre, c.Justificacion)}, "orquestador")
	datos["nombre"], datos["responsable"] = p.Nombre, p.Nombre
	if s.ejecutar(Accion{Tipo: "enviar_correo", Ticket: t.ID, Plantilla: "aviso_responsable", Para: p, Datos: datos}, "orquestador") == nil {
		r.Correos++
	}
	sol := Persona{Nombre: t.Solicitante, Correo: t.Correo}
	if s.ejecutar(Accion{Tipo: "enviar_correo", Ticket: t.ID, Plantilla: "acuse_solicitante", Para: sol, Datos: datos}, "orquestador") == nil {
		r.Correos++
	}
	r.Decision, r.Responsable = "derivado", p.Nombre
	return r
}

// derivarManual: una persona resuelve un ticket de la cola de revisión.
func (s *Servidor) derivarManual(id int, cat, area, autor string) (Resultado, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := s.ticket(id)
	if t == nil {
		return Resultado{}, fmt.Errorf("el ticket %d no existe", id)
	}
	if t.Estado != "en_revision" {
		return Resultado{}, fmt.Errorf("el ticket %d no está en revisión", id)
	}
	if !categoriaValida(cat) || !areaValida(area) {
		return Resultado{}, errors.New("categoría o área no válida")
	}
	if autor == "" {
		autor = "Revisor humano"
	}
	s.auditar(Auditoria{Ticket: id, Tipo: "revision_humana", Entrada: fmt.Sprintf("propuesta: %s → %s", t.Categoria, t.Area),
		Salida: fmt.Sprintf("%s decidió: %s → %s", autor, nombreCategoria(cat), nombreArea(area)), Motor: "persona", Resultado: "ok"})
	prio := t.Prioridad
	if prio == "" {
		prio = "media"
	}
	c := Clasificacion{Categoria: cat, Prioridad: prio, Area: area, Confianza: 1, Justificacion: "Decisión de " + autor + " en la cola de revisión."}
	t.Estado = "nuevo"
	defer s.guardar()
	return s.aplicar(t, c, Traza{Motor: "revisión humana", Modelo: autor}), nil
}

// Motor con que queda auditada una clasificación hecha por Claude desde
// claude.ai a través del conector MCP. No pasa por la clave del servidor: la
// paga la suscripción de quien usa Claude, así que tokens y costo van en 0.
const motorClaudeAI = "claude (claude.ai)"

// aplicarExterna: una clasificación que trae Claude desde claude.ai entra por
// el MISMO camino que la del motor del servidor (umbral, derivación, comentario,
// correo y auditoría). Vale para tickets nuevos y para los de la cola de
// revisión. La clasificación ya viene validada.
func (s *Servidor) aplicarExterna(id int, c Clasificacion) (Resultado, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := s.ticket(id)
	if t == nil {
		return Resultado{}, "", fmt.Errorf("no existe el ticket %d en el simulador (van del 1001 al %d)", id, s.e.SigTicket)
	}
	previo := t.Estado
	switch t.Estado {
	case "nuevo":
	case "en_revision":
		s.auditar(Auditoria{Ticket: id, Tipo: "revision", Entrada: fmt.Sprintf("propuesta anterior: %s → %s (confianza %.2f, motor %s)", t.Categoria, t.Area, t.Confianza, t.Motor),
			Salida: "Claude retoma el ticket desde la cola de revisión (conector MCP en claude.ai).", Motor: motorClaudeAI, Resultado: "ok"})
		t.Estado = "nuevo"
	case "clasificando":
		return Resultado{}, "", fmt.Errorf("el ticket %d lo está clasificando el motor del servidor en este momento; prueba en unos segundos", id)
	default:
		quien := ""
		if p, ok := persona(t.Responsable); ok {
			quien = " a " + p.Nombre
		}
		return Resultado{}, "", fmt.Errorf("el ticket %d ya fue derivado%s (estado: %s); solo se clasifican tickets nuevos o de la cola de revisión", id, quien, t.Estado)
	}
	c.Confianza = math.Round(c.Confianza*100) / 100
	r := s.aplicar(t, c, Traza{Motor: motorClaudeAI, Modelo: "Claude en claude.ai (suscripción del usuario, vía conector MCP)"})
	s.guardar()
	return r, previo, nil
}

func (s *Servidor) pendientes(limite int) []int {
	s.mu.Lock()
	defer s.mu.Unlock()
	var ids []int
	for _, t := range s.e.Tickets {
		if t.Estado == "nuevo" {
			ids = append(ids, t.ID)
			if len(ids) == limite {
				break
			}
		}
	}
	return ids
}

func (s *Servidor) orquestarPendientes(limite int) []Resultado {
	var out []Resultado
	for _, id := range s.pendientes(limite) {
		if r, err := s.procesar(id); err == nil {
			out = append(out, r)
		}
	}
	return out
}

// programador: cada 20 s revisa si toca una pasada.
func (s *Servidor) programador() {
	for range time.Tick(20 * time.Second) {
		s.mu.Lock()
		cfg := s.e.Config
		toca := cfg.Programado && (s.e.UltimaPasada == nil || s.ahora().Sub(*s.e.UltimaPasada) >= time.Duration(cfg.IntervaloMin)*time.Minute)
		if toca {
			ahora := s.ahora()
			s.e.UltimaPasada = &ahora
		}
		s.mu.Unlock()
		if toca {
			rs := s.orquestarPendientes(cfg.Lote)
			s.mu.Lock()
			s.auditar(Auditoria{Tipo: "programado", Entrada: fmt.Sprintf("cada %d min, lote %d", cfg.IntervaloMin, cfg.Lote),
				Salida: fmt.Sprintf("Pasada programada: %d tickets procesados.", len(rs)), Motor: "programador", Resultado: "ok"})
			s.guardar()
			s.mu.Unlock()
		}
	}
}

// ---------- evaluación ----------

func (s *Servidor) evaluar(motor string) (*Evaluacion, error) {
	s.mu.Lock()
	if s.evalEnCurso != "" {
		s.mu.Unlock()
		return nil, errors.New("ya hay una evaluación en curso")
	}
	s.evalEnCurso, s.evalAvance = motor, 0
	umbral := s.e.Config.Umbral
	s.mu.Unlock()
	defer func() { s.mu.Lock(); s.evalEnCurso = ""; s.mu.Unlock() }()

	filas := make([]FilaEval, len(semilla))
	trazas := make([]Traza, len(semilla))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 4)
	ini := time.Now()
	for i, ts := range semilla {
		wg.Add(1)
		go func(i int, ts TicketSemilla) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			c, tr := s.clasificar(ts.Asunto, ts.Descripcion, motor)
			filas[i] = FilaEval{ID: ts.ID, Asunto: ts.Asunto, Oro: ts.Oro, Pred: Etiqueta{c.Categoria, c.Area, c.Prioridad},
				Confianza: c.Confianza, Motor: tr.Motor, Ms: tr.DuracionMs, Costo: tr.Costo}
			trazas[i] = tr
			s.mu.Lock()
			s.evalAvance++
			s.mu.Unlock()
		}(i, ts)
	}
	wg.Wait()
	ev := resumirEvaluacion(filas, umbral)
	ev.Motor, ev.En = motor, s.ahora()
	for _, tr := range trazas {
		if tr.Respaldo != "" {
			ev.Respaldos++
		}
		if ev.Modelo == "" || (tr.Respaldo == "" && strings.HasPrefix(tr.Motor, "claude")) {
			ev.Modelo = tr.Modelo
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.e.Evaluaciones == nil {
		s.e.Evaluaciones = map[string]*Evaluacion{}
	}
	s.e.Evaluaciones[motor] = ev
	var tin, tout int
	for _, tr := range trazas {
		tin += tr.TokEntrada
		tout += tr.TokSalida
	}
	nota := ""
	if ev.Respaldos > 0 {
		nota = fmt.Sprintf(" · %d de %d con respaldo de reglas", ev.Respaldos, ev.Total)
	}
	s.auditar(Auditoria{Tipo: "evaluacion", Entrada: fmt.Sprintf("%d tickets etiquetados, motor %s", ev.Total, motor),
		Salida: fmt.Sprintf("Acierto categoría %.1f %% · área %.1f %% · prioridad %.1f %%%s", ev.AciertoCategoria*100, ev.AciertoArea*100, ev.AciertoPrioridad*100, nota),
		Motor:  motor, Modelo: ev.Modelo, TokEntrada: tin, TokSalida: tout, Costo: ev.CostoTotal, DuracionMs: time.Since(ini).Milliseconds(), Resultado: "ok"})
	s.guardar()
	return ev, nil
}

func resumirEvaluacion(filas []FilaEval, umbral float64) *Evaluacion {
	ev := &Evaluacion{Total: len(filas), Umbral: umbral, PorCategoria: map[string]*Acierto{}, PorArea: map[string]*Acierto{}, Filas: filas}
	var cat, area, prio, auto, autoOK int
	var ms int64
	conf := map[[2]string]*Confusion{}
	for _, f := range filas {
		if ev.PorCategoria[f.Oro.Categoria] == nil {
			ev.PorCategoria[f.Oro.Categoria] = &Acierto{}
		}
		if ev.PorArea[f.Oro.Area] == nil {
			ev.PorArea[f.Oro.Area] = &Acierto{}
		}
		ev.PorCategoria[f.Oro.Categoria].Total++
		ev.PorArea[f.Oro.Area].Total++
		if f.Pred.Categoria == f.Oro.Categoria {
			cat++
			ev.PorCategoria[f.Oro.Categoria].Aciertos++
		} else {
			k := [2]string{f.Oro.Categoria, f.Pred.Categoria}
			if conf[k] == nil {
				conf[k] = &Confusion{Esperado: k[0], Obtenido: k[1]}
			}
			conf[k].N++
			conf[k].Tickets = append(conf[k].Tickets, f.ID)
		}
		if f.Pred.Area == f.Oro.Area {
			area++
			ev.PorArea[f.Oro.Area].Aciertos++
		}
		if f.Pred.Prioridad == f.Oro.Prioridad {
			prio++
		}
		if f.Confianza >= umbral {
			auto++
			if f.Pred.Area == f.Oro.Area {
				autoOK++
			}
		}
		ev.CostoTotal += f.Costo
		ms += f.Ms
	}
	n := float64(len(filas))
	if n > 0 {
		ev.AciertoCategoria, ev.AciertoArea, ev.AciertoPrioridad = float64(cat)/n, float64(area)/n, float64(prio)/n
		ev.CostoPorTicket, ev.MsPorTicket = ev.CostoTotal/n, float64(ms)/n
	}
	ev.SobreUmbral = auto
	if auto > 0 {
		ev.AciertoAreaAuto = float64(autoOK) / float64(auto)
	}
	for _, c := range conf {
		ev.Confusiones = append(ev.Confusiones, *c)
	}
	sort.Slice(ev.Confusiones, func(i, j int) bool {
		if ev.Confusiones[i].N != ev.Confusiones[j].N {
			return ev.Confusiones[i].N > ev.Confusiones[j].N
		}
		return ev.Confusiones[i].Esperado+ev.Confusiones[i].Obtenido < ev.Confusiones[j].Esperado+ev.Confusiones[j].Obtenido
	})
	return ev
}

// ---------- estado inicial ----------

func (s *Servidor) sembrar() {
	ahora := s.ahora()
	s.e = Estado{Config: Config{Motor: "reglas", Umbral: 0.7, Programado: false, IntervaloMin: 5, Lote: 5},
		Evaluaciones: map[string]*Evaluacion{}, SigTicket: 1060, CreadoEn: ahora}
	canales := []string{"portal", "correo", "teléfono", "correo", "portal"}
	n := len(semilla)
	for i, ts := range semilla {
		sol := solicitantes[i%len(solicitantes)]
		creado := ahora.Add(-time.Duration(n-i) * 11 * time.Minute)
		s.e.Tickets = append(s.e.Tickets, &Ticket{ID: ts.ID, Asunto: ts.Asunto, Descripcion: ts.Descripcion, Proyecto: ts.Proyecto,
			Solicitante: sol.Nombre, Empresa: sol.Empresa, Correo: sol.Correo, Canal: canales[i%len(canales)],
			Estado: "nuevo", Comentarios: []Comentario{}, CreadoEn: creado})
	}
	// Los primeros 48 ya pasaron por el orquestador (motor reglas) a lo largo
	// del día; los 12 últimos quedan pendientes para la demo.
	reloj := s.ahora
	for i, t := range s.e.Tickets {
		if i >= 48 {
			break
		}
		cuando := t.CreadoEn.Add(2 * time.Minute)
		s.ahora = func() time.Time { return cuando }
		c, tr := s.clasificar(t.Asunto, t.Descripcion, "reglas")
		s.aplicar(t, c, tr)
	}
	s.ahora = reloj
	// Algunos ya los empezó a atender su responsable.
	for i, t := range s.e.Tickets {
		if t.Estado == "asignado" && i < 30 && i%3 == 0 {
			t.Estado = "en_proceso"
		}
		if t.Estado == "en_proceso" && i < 12 {
			t.Estado = "resuelto"
		}
	}
}
