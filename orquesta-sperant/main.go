// Demo «Claude orquestando una mesa de ayuda estilo Sperant».
//
// Un solo binario: simulador de tickets (stand-in de Sperant, datos
// ficticios), agente orquestador con clasificador intercambiable (reglas o
// Claude), derivación por área y carga, lista blanca de acciones, bandeja de
// correo simulada, auditoría, evaluación contra 60 tickets etiquetados y un
// servidor MCP remoto para ver todo desde Claude.
package main

import (
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

//go:embed web
var webFS embed.FS

func (s *Servidor) guardar() {
	b, _ := json.Marshal(s.e)
	tmp := s.archivo + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("guardar: %v", err)
		return
	}
	if err := os.Rename(tmp, s.archivo); err != nil {
		log.Printf("guardar: %v", err)
	}
}

func responder(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fallo(w http.ResponseWriter, code int, msg string) {
	responder(w, code, map[string]string{"error": msg})
}

func leerJSON(r *http.Request, v any, max int64) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, max)).Decode(v)
}

func (s *Servidor) esAdmin(r *http.Request) bool {
	c := r.Header.Get("X-Clave")
	return c != "" && subtle.ConstantTimeCompare([]byte(c), []byte(s.clave)) == 1
}

func ipDe(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	h := r.RemoteAddr
	if i := strings.LastIndex(h, ":"); i > 0 {
		h = h[:i]
	}
	return h
}

// limite: n acciones por hora por IP (crear tickets, evaluar). Con s.mu tomado.
func (s *Servidor) limite(ip, tipo string, n int) bool {
	k := tipo + "|" + ip
	ahora := time.Now()
	var vivos []time.Time
	for _, t := range s.porIP[k] {
		if ahora.Sub(t) < time.Hour {
			vivos = append(vivos, t)
		}
	}
	if len(vivos) >= n {
		s.porIP[k] = vivos
		return false
	}
	s.porIP[k] = append(vivos, ahora)
	return true
}

func limpio(s string, max int) string {
	s = strings.TrimSpace(strings.ReplaceAll(s, "\r", ""))
	if utf8.RuneCountInString(s) > max {
		s = string([]rune(s)[:max])
	}
	return s
}

// vistaTicket: lo que se publica de un ticket (sin etiqueta oro).
func vistaTicket(t *Ticket) map[string]any {
	m := map[string]any{
		"id": t.ID, "asunto": t.Asunto, "descripcion": t.Descripcion, "proyecto": t.Proyecto, "solicitante": t.Solicitante,
		"empresa": t.Empresa, "correo": t.Correo, "canal": t.Canal, "estado": t.Estado, "categoria": t.Categoria,
		"categoriaNombre": nombreCategoria(t.Categoria), "prioridad": t.Prioridad, "area": t.Area, "areaNombre": nombreArea(t.Area),
		"confianza": t.Confianza, "justificacion": t.Justificacion, "motor": t.Motor, "responsable": t.Responsable,
		"comentarios": t.Comentarios, "creadoEn": t.CreadoEn, "clasificadoEn": t.ClasificadoEn, "derivadoEn": t.DerivadoEn,
	}
	if p, ok := persona(t.Responsable); ok {
		m["responsableNombre"] = p.Nombre
	}
	return m
}

func (s *Servidor) configPublica() map[string]any {
	prov, modelo := "", ""
	if s.llm != nil {
		prov, modelo = s.llm.Nombre(), s.llm.Modelo()
	}
	return map[string]any{"motor": s.e.Config.Motor, "umbral": s.e.Config.Umbral, "programado": s.e.Config.Programado,
		"intervaloMin": s.e.Config.IntervaloMin, "lote": s.e.Config.Lote, "gasto": s.e.Gasto, "tope": s.tope,
		"llamadasLLM": s.e.LlamadasLLM, "claudeConfigurado": s.llm != nil, "proveedor": prov, "modelo": modelo,
		"listaBlanca": listaBlanca, "evalEnCurso": s.evalEnCurso, "evalAvance": s.evalAvance, "evalTotal": len(semilla)}
}

func inicioDia(t time.Time) time.Time {
	l := t.In(lima)
	return time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, lima)
}

func (s *Servidor) resumen() map[string]any {
	cuenta := map[string]int{}
	porArea := map[string]int{}
	hoy := inicioDia(s.ahora())
	derivadosHoy := 0
	for _, t := range s.e.Tickets {
		cuenta[t.Estado]++
		if t.DerivadoEn != nil && t.Area != "" {
			porArea[t.Area]++
			if !t.DerivadoEn.Before(hoy) {
				derivadosHoy++
			}
		}
	}
	feed := []Auditoria{}
	for i := len(s.e.Auditoria) - 1; i >= 0 && len(feed) < 18; i-- {
		feed = append(feed, s.e.Auditoria[i])
	}
	var acierto any
	if ev := s.e.Evaluaciones[s.e.Config.Motor]; ev != nil {
		acierto = map[string]any{"motor": ev.Motor, "categoria": ev.AciertoCategoria, "area": ev.AciertoArea, "en": ev.En}
	} else {
		for _, ev := range s.e.Evaluaciones {
			acierto = map[string]any{"motor": ev.Motor, "categoria": ev.AciertoCategoria, "area": ev.AciertoArea, "en": ev.En}
		}
	}
	carga := []map[string]any{}
	for _, p := range equipo {
		carga = append(carga, map[string]any{"id": p.ID, "nombre": p.Nombre, "area": p.Area, "areaNombre": nombreArea(p.Area), "abiertos": s.carga(p.ID)})
	}
	return map[string]any{"estados": cuenta, "total": len(s.e.Tickets), "derivadosHoy": derivadosHoy, "porArea": porArea,
		"correos": len(s.e.Correos), "auditoria": len(s.e.Auditoria), "acierto": acierto, "feed": feed,
		"config": s.configPublica(), "carga": carga, "ahora": s.ahora()}
}

func (s *Servidor) rutas() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	estaticos := http.FileServer(http.FS(web))
	pagina := func(nombre string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			b, err := fs.ReadFile(web, nombre)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(b)
		}
	}
	for ruta, archivo := range map[string]string{"/{$}": "index.html", "/tickets": "tickets.html", "/bandeja": "bandeja.html",
		"/auditoria": "auditoria.html", "/evaluacion": "evaluacion.html", "/conectar": "conectar.html", "/admin": "admin.html"} {
		mux.HandleFunc("GET "+ruta, pagina(archivo))
	}
	mux.Handle("GET /static/", estaticos)
	mux.HandleFunc("/mcp/{token}", s.mcp)

	mux.HandleFunc("GET /api/salud", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, map[string]any{"ok": true, "tickets": len(s.e.Tickets), "motor": s.e.Config.Motor, "claudeConfigurado": s.llm != nil})
	})
	mux.HandleFunc("GET /api/resumen", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, s.resumen())
	})
	// Vista «así lo ves desde Claude»: la misma respuesta que devuelve la
	// herramienta MCP, sin exponer el token. Solo herramientas de lectura.
	mux.HandleFunc("GET /api/vista-claude", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		h := q.Get("herramienta")
		args := map[string]any{}
		switch h {
		case "consultar_ticket":
			id, _ := strconv.Atoi(q.Get("id"))
			args["id"] = float64(id)
		case "tickets_derivados":
			args["area"], args["desde"] = q.Get("area"), q.Get("desde")
		case "cola_revision", "resumen_hoy", "metricas_evaluacion":
		default:
			fallo(w, 400, "Esta vista solo muestra herramientas de lectura.")
			return
		}
		txt, err := s.llamarHerramienta(h, args)
		if err != nil {
			responder(w, 200, map[string]any{"herramienta": h, "argumentos": args, "texto": err.Error(), "error": true})
			return
		}
		responder(w, 200, map[string]any{"herramienta": h, "argumentos": args, "texto": txt, "error": false})
	})
	mux.HandleFunc("GET /api/taxonomia", func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, map[string]any{"categorias": categorias, "areas": areas, "equipo": equipo, "coordinacion": coordinacion,
			"plantillas": plantillas, "listaBlanca": listaBlanca})
	})

	// ---- API del simulador (stand-in de Sperant) ----
	mux.HandleFunc("GET /api/tickets", func(w http.ResponseWriter, r *http.Request) {
		q := normalizar(r.URL.Query().Get("q"))
		estado, area := r.URL.Query().Get("estado"), r.URL.Query().Get("area")
		s.mu.Lock()
		defer s.mu.Unlock()
		out := []map[string]any{}
		for i := len(s.e.Tickets) - 1; i >= 0; i-- {
			t := s.e.Tickets[i]
			if estado != "" && t.Estado != estado || area != "" && t.Area != area {
				continue
			}
			if q != "" && !strings.Contains(normalizar(fmt.Sprint(t.ID, " ", t.Asunto, " ", t.Descripcion, " ", t.Solicitante, " ", t.Empresa)), q) {
				continue
			}
			out = append(out, vistaTicket(t))
		}
		responder(w, 200, map[string]any{"tickets": out})
	})
	mux.HandleFunc("GET /api/tickets/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.PathValue("id"))
		s.mu.Lock()
		defer s.mu.Unlock()
		t := s.ticket(id)
		if t == nil {
			fallo(w, 404, "No existe el ticket.")
			return
		}
		aud := []Auditoria{}
		for _, a := range s.e.Auditoria {
			if a.Ticket == id {
				aud = append(aud, a)
			}
		}
		cor := []Correo{}
		for _, c := range s.e.Correos {
			if c.Ticket == id {
				cor = append(cor, c)
			}
		}
		responder(w, 200, map[string]any{"ticket": vistaTicket(t), "auditoria": aud, "correos": cor})
	})
	mux.HandleFunc("POST /api/tickets", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Asunto, Descripcion, Solicitante, Empresa, Correo, Proyecto string
			Procesar                                                    *bool
		}
		if err := leerJSON(r, &in, 16384); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		in.Asunto, in.Descripcion = limpio(in.Asunto, 140), limpio(in.Descripcion, 1500)
		if utf8.RuneCountInString(in.Asunto) < 5 || utf8.RuneCountInString(in.Descripcion) < 10 {
			fallo(w, 400, "Escribe un asunto (mín. 5 caracteres) y una descripción (mín. 10).")
			return
		}
		s.mu.Lock()
		if !s.limite(ipDe(r), "crear", 30) {
			s.mu.Unlock()
			fallo(w, 429, "Demasiados tickets desde tu conexión en la última hora. Prueba más tarde.")
			return
		}
		if len(s.e.Tickets) >= maxTickets {
			s.mu.Unlock()
			fallo(w, 409, "La demo llegó a su máximo de tickets. Pide que la reinicien desde /admin.")
			return
		}
		t := s.nuevoTicket(in.Asunto, in.Descripcion, limpio(in.Solicitante, 60), limpio(in.Empresa, 60), limpio(in.Correo, 80), limpio(in.Proyecto, 60), "portal")
		s.guardar()
		s.mu.Unlock()
		if in.Procesar != nil && !*in.Procesar {
			responder(w, 201, map[string]any{"ticket": t.ID})
			return
		}
		res, err := s.procesar(t.ID)
		if err != nil {
			fallo(w, 500, err.Error())
			return
		}
		responder(w, 201, map[string]any{"ticket": t.ID, "resultado": res})
	})
	mux.HandleFunc("POST /api/tickets/{id}/procesar", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.PathValue("id"))
		res, err := s.procesar(id)
		if err != nil {
			fallo(w, 409, err.Error())
			return
		}
		responder(w, 200, res)
	})
	mux.HandleFunc("POST /api/tickets/{id}/derivar", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.PathValue("id"))
		var in struct{ Categoria, Area, Autor string }
		if err := leerJSON(r, &in, 4096); err != nil {
			fallo(w, 400, "Datos no válidos.")
			return
		}
		res, err := s.derivarManual(id, in.Categoria, in.Area, limpio(in.Autor, 60))
		if err != nil {
			fallo(w, 409, err.Error())
			return
		}
		responder(w, 200, res)
	})
	mux.HandleFunc("POST /api/tickets/{id}/comentar", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.PathValue("id"))
		var in struct{ Texto, Autor string }
		if err := leerJSON(r, &in, 8192); err != nil || limpio(in.Texto, 1000) == "" {
			fallo(w, 400, "Escribe un comentario.")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		t := s.ticket(id)
		if t == nil {
			fallo(w, 404, "No existe el ticket.")
			return
		}
		autor := limpio(in.Autor, 60)
		if autor == "" {
			autor = "Usuario del simulador"
		}
		t.Comentarios = append(t.Comentarios, Comentario{Autor: autor, Texto: limpio(in.Texto, 1000), En: s.ahora()})
		s.guardar()
		responder(w, 200, vistaTicket(t))
	})
	mux.HandleFunc("POST /api/tickets/{id}/estado", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.PathValue("id"))
		var in struct{ Estado string }
		_ = leerJSON(r, &in, 1024)
		if in.Estado != "en_proceso" && in.Estado != "resuelto" && in.Estado != "asignado" {
			fallo(w, 400, "Estado no válido (asignado, en_proceso, resuelto).")
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		t := s.ticket(id)
		if t == nil || t.Responsable == "" {
			fallo(w, 409, "Solo se cambia el estado de un ticket ya asignado.")
			return
		}
		t.Estado = in.Estado
		s.guardar()
		responder(w, 200, vistaTicket(t))
	})
	mux.HandleFunc("POST /api/tickets/{id}/asignar", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.PathValue("id"))
		var in struct{ Responsable string }
		_ = leerJSON(r, &in, 1024)
		s.mu.Lock()
		defer s.mu.Unlock()
		p, ok := persona(in.Responsable)
		t := s.ticket(id)
		if !ok || t == nil || p.ID == coordinacion.ID {
			fallo(w, 400, "Ticket o responsable no válido.")
			return
		}
		ahora := s.ahora()
		t.Responsable, t.Area, t.DerivadoEn = p.ID, p.Area, &ahora
		if t.Estado == "nuevo" || t.Estado == "en_revision" {
			t.Estado = "asignado"
		}
		s.auditar(Auditoria{Ticket: id, Tipo: "reasignacion_manual", Entrada: in.Responsable, Salida: "Reasignado a mano a " + p.Nombre, Motor: "persona", Resultado: "ok"})
		s.guardar()
		responder(w, 200, vistaTicket(t))
	})
	mux.HandleFunc("POST /api/orquestar", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Limite int }
		_ = leerJSON(r, &in, 1024)
		if in.Limite < 1 || in.Limite > 20 {
			in.Limite = 10
		}
		s.mu.Lock()
		ok := s.limite(ipDe(r), "orquestar", 30)
		s.mu.Unlock()
		if !ok {
			fallo(w, 429, "Demasiadas pasadas desde tu conexión en la última hora.")
			return
		}
		rs := s.orquestarPendientes(in.Limite)
		responder(w, 200, map[string]any{"procesados": len(rs), "resultados": rs})
	})
	mux.HandleFunc("GET /api/bandeja", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		out := make([]Correo, 0, 200)
		for i := len(s.e.Correos) - 1; i >= 0 && len(out) < 300; i-- {
			out = append(out, s.e.Correos[i])
		}
		responder(w, 200, map[string]any{"correos": out, "total": len(s.e.Correos)})
	})
	mux.HandleFunc("GET /api/auditoria", func(w http.ResponseWriter, r *http.Request) {
		tipo := r.URL.Query().Get("tipo")
		tk, _ := strconv.Atoi(r.URL.Query().Get("ticket"))
		s.mu.Lock()
		defer s.mu.Unlock()
		out := []Auditoria{}
		for i := len(s.e.Auditoria) - 1; i >= 0 && len(out) < 500; i-- {
			a := s.e.Auditoria[i]
			if tipo != "" && a.Tipo != tipo || tk != 0 && a.Ticket != tk {
				continue
			}
			out = append(out, a)
		}
		var costo float64
		var tin, tout int
		for _, a := range s.e.Auditoria {
			if a.Tipo == "clasificacion" {
				costo += a.Costo
				tin += a.TokEntrada
				tout += a.TokSalida
			}
		}
		responder(w, 200, map[string]any{"filas": out, "total": len(s.e.Auditoria), "costoClasificaciones": costo,
			"tokensEntrada": tin, "tokensSalida": tout, "gasto": s.e.Gasto, "tope": s.tope})
	})
	mux.HandleFunc("GET /api/evaluacion", func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, map[string]any{"evaluaciones": s.e.Evaluaciones, "config": s.configPublica(),
			"categorias": categorias, "areas": areas})
	})
	// Evaluar con reglas es público y gratis; con Claude pide la clave admin.
	mux.HandleFunc("POST /api/evaluar", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Motor string }
		_ = leerJSON(r, &in, 1024)
		if in.Motor == "" {
			in.Motor = "reglas"
		}
		if in.Motor != "reglas" && in.Motor != "claude" {
			fallo(w, 400, "Motor no válido.")
			return
		}
		if in.Motor == "claude" {
			if !s.esAdmin(r) {
				fallo(w, 401, "Evaluar con Claude consume saldo: hazlo desde /admin con la clave.")
				return
			}
			if err := s.verificarSaldo(); err != nil {
				fallo(w, 409, err.Error())
				return
			}
		}
		s.mu.Lock()
		ok := s.limite(ipDe(r), "evaluar", 20)
		s.mu.Unlock()
		if !ok {
			fallo(w, 429, "Demasiadas evaluaciones desde tu conexión en la última hora.")
			return
		}
		if in.Motor == "claude" { // tarda ~1 min: en segundo plano
			go func() {
				if _, err := s.evaluar("claude"); err != nil {
					log.Printf("evaluar claude: %v", err)
				}
			}()
			responder(w, 202, map[string]any{"iniciada": true})
			return
		}
		ev, err := s.evaluar(in.Motor)
		if err != nil {
			fallo(w, 409, err.Error())
			return
		}
		responder(w, 200, ev)
	})

	// ---- admin ----
	admin := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !s.esAdmin(r) {
				time.Sleep(400 * time.Millisecond)
				fallo(w, 401, "Clave incorrecta.")
				return
			}
			h(w, r)
		}
	}
	estadoAdmin := func() map[string]any {
		m := s.configPublica()
		m["mcpURL"] = s.basePub + "/mcp/" + s.tokenMCP
		m["saldo"] = s.ultimoSaldo
		m["saldoMin"] = s.saldoMin
		if !s.saldoEn.IsZero() {
			m["saldoEn"] = s.saldoEn
		}
		m["pendientes"] = 0
		for _, t := range s.e.Tickets {
			if t.Estado == "nuevo" {
				m["pendientes"] = m["pendientes"].(int) + 1
			}
		}
		return m
	}
	mux.HandleFunc("GET /api/admin/estado", admin(func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/config", admin(func(w http.ResponseWriter, r *http.Request) {
		var in Config
		if err := leerJSON(r, &in, 4096); err != nil {
			fallo(w, 400, "Configuración no válida.")
			return
		}
		if in.Motor != "reglas" && in.Motor != "claude" || in.Umbral < 0.3 || in.Umbral > 0.99 || in.IntervaloMin < 1 || in.IntervaloMin > 120 || in.Lote < 1 || in.Lote > 20 {
			fallo(w, 400, "Revisa los valores: motor reglas|claude, umbral 0.30–0.99, intervalo 1–120 min, lote 1–20.")
			return
		}
		s.mu.Lock()
		cambiaAClaude := in.Motor == "claude" && s.e.Config.Motor != "claude"
		s.mu.Unlock()
		if cambiaAClaude {
			if err := s.verificarSaldo(); err != nil {
				fallo(w, 409, err.Error())
				return
			}
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		antes, _ := json.Marshal(s.e.Config)
		s.e.Config = in
		despues, _ := json.Marshal(in)
		s.auditar(Auditoria{Tipo: "config", Entrada: string(antes), Salida: string(despues), Motor: "admin", Resultado: "ok"})
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/saldo", admin(func(w http.ResponseWriter, r *http.Request) {
		err := s.verificarSaldo()
		s.mu.Lock()
		defer s.mu.Unlock()
		m := estadoAdmin()
		if err != nil {
			m["aviso"] = err.Error()
		}
		responder(w, 200, m)
	}))
	mux.HandleFunc("POST /api/admin/reiniciar", admin(func(w http.ResponseWriter, r *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.evalEnCurso != "" {
			fallo(w, 409, "Hay una evaluación en curso; espera a que termine.")
			return
		}
		gasto, llamadas, evs := s.e.Gasto, s.e.LlamadasLLM, s.e.Evaluaciones
		s.sembrar()
		// El gasto NO se reinicia: el tope es de toda la demo.
		s.e.Gasto, s.e.LlamadasLLM, s.e.Evaluaciones = gasto, llamadas, evs
		s.auditar(Auditoria{Tipo: "config", Entrada: "reinicio", Salida: "Demo reiniciada: 60 tickets, 48 procesados, 12 pendientes. El gasto acumulado se conserva.", Motor: "admin", Resultado: "ok"})
		s.guardar()
		responder(w, 200, estadoAdmin())
	}))
	mux.HandleFunc("POST /api/admin/llegada", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct{ N int }
		_ = leerJSON(r, &in, 1024)
		if in.N < 1 || in.N > 10 {
			in.N = 3
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		ids := []int{}
		for i := 0; i < in.N && len(s.e.Tickets) < maxTickets; i++ {
			ll := llegadas[s.e.SigLlegada%len(llegadas)]
			sol := solicitantes[(s.e.SigLlegada*5+3)%len(solicitantes)]
			s.e.SigLlegada++
			t := s.nuevoTicket(ll.Asunto, ll.Descripcion, sol.Nombre, sol.Empresa, sol.Correo, ll.Proyecto, "correo")
			ids = append(ids, t.ID)
		}
		s.guardar()
		responder(w, 200, map[string]any{"creados": ids})
	}))
	// Demostración de la lista blanca: el agente intenta una acción no
	// declarada y se rechaza (queda en la auditoría).
	mux.HandleFunc("POST /api/admin/probar-lista-blanca", admin(func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Accion string }
		_ = leerJSON(r, &in, 1024)
		if in.Accion == "" {
			in.Accion = "cerrar_ticket"
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		id := 0
		if len(s.e.Tickets) > 0 {
			id = s.e.Tickets[0].ID
		}
		err := s.ejecutar(Accion{Tipo: limpio(in.Accion, 40), Ticket: id}, "orquestador (prueba)")
		s.guardar()
		msg := "La acción se ejecutó (estaba en la lista blanca)."
		if err != nil {
			msg = err.Error()
		}
		responder(w, 200, map[string]any{"resultado": msg, "rechazada": err != nil})
	}))
	mux.HandleFunc("GET /api/admin/mcp", admin(func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, map[string]any{"url": s.basePub + "/mcp/" + s.tokenMCP})
	}))
	return mux
}

func (s *Servidor) nuevoTicket(asunto, desc, sol, emp, correo, proy, canal string) *Ticket {
	if sol == "" {
		sol = "Visitante de la demo"
	}
	if emp == "" {
		emp = "Empresa de prueba"
	}
	if correo == "" || !strings.Contains(correo, "@") {
		correo = "visitante@demo-cliente.example"
	}
	if proy == "" {
		proy = "Sin especificar"
	}
	s.e.SigTicket++
	t := &Ticket{ID: s.e.SigTicket, Asunto: asunto, Descripcion: desc, Solicitante: sol, Empresa: emp, Correo: correo,
		Proyecto: proy, Canal: canal, Estado: "nuevo", Comentarios: []Comentario{}, CreadoEn: s.ahora()}
	s.e.Tickets = append(s.e.Tickets, t)
	return t
}

// verificarSaldo: antes de habilitar Claude. Sin clave → error; con
// OpenRouter, saldo de la cuenta < mínimo → error. No toma s.mu al llamar.
func (s *Servidor) verificarSaldo() error {
	if s.llm == nil {
		return fmt.Errorf("no hay clave de Claude configurada en el servidor (ANTHROPIC_API_KEY u OPENROUTER_API_KEY)")
	}
	s.mu.Lock()
	ok, motivo := s.motorDisponible()
	s.mu.Unlock()
	if !ok {
		return fmt.Errorf("no se habilita Claude: %s", motivo)
	}
	saldo, err := s.llm.Saldo()
	if s.llm.Nombre() == "anthropic" {
		return nil // la API de Anthropic no expone saldo; manda el tope de la demo
	}
	if err != nil {
		return fmt.Errorf("no se pudo consultar el saldo de OpenRouter (%v); por seguridad no se habilita Claude", err)
	}
	s.mu.Lock()
	s.ultimoSaldo, s.saldoEn = &saldo, s.ahora()
	s.mu.Unlock()
	if saldo < s.saldoMin {
		return fmt.Errorf("saldo de OpenRouter US$%.2f, por debajo del mínimo US$%.2f: no se habilita Claude (la cuenta es compartida)", saldo, s.saldoMin)
	}
	return nil
}

func tokenAleatorio() string {
	b := make([]byte, 18)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func envFloat(k string, def float64) float64 {
	if v, err := strconv.ParseFloat(os.Getenv(k), 64); err == nil && v > 0 {
		return v
	}
	return def
}

func main() {
	datos := os.Getenv("ORQUESTA_DATOS")
	if datos == "" {
		datos = "datos"
	}
	clave := os.Getenv("ORQUESTA_CLAVE")
	if len(clave) < 12 {
		log.Fatal("ORQUESTA_CLAVE debe tener al menos 12 caracteres")
	}
	token := os.Getenv("MCP_TOKEN")
	if len(token) < 24 {
		log.Fatal("MCP_TOKEN debe tener al menos 24 caracteres")
	}
	base := strings.TrimRight(os.Getenv("BASE_PUBLICA"), "/")
	if base == "" {
		base = "http://localhost:18570"
	}
	if err := os.MkdirAll(datos, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &Servidor{archivo: filepath.Join(datos, "estado.json"), clave: clave, tokenMCP: token, basePub: base,
		llm: llmDesdeEntorno(), tope: envFloat("TOPE_USD", 0.30), saldoMin: envFloat("SALDO_MINIMO_USD", 0.60),
		ahora: time.Now, porIP: map[string][]time.Time{}}
	if b, err := os.ReadFile(s.archivo); err == nil {
		if err := json.Unmarshal(b, &s.e); err != nil {
			log.Fatalf("estado.json: %v", err)
		}
		for _, t := range s.e.Tickets {
			if t.Estado == "clasificando" { // se cortó a medias
				t.Estado = "nuevo"
			}
		}
		if s.e.Evaluaciones == nil {
			s.e.Evaluaciones = map[string]*Evaluacion{}
		}
	} else {
		s.sembrar()
		s.guardar()
	}
	// Si el motor guardado es Claude pero ya no hay clave, se vuelve a reglas
	// y queda escrito.
	if s.e.Config.Motor == "claude" && s.llm == nil {
		s.e.Config.Motor = "reglas"
		s.auditar(Auditoria{Tipo: "config", Entrada: "arranque", Salida: "Motor Claude sin clave: se vuelve a reglas.", Motor: "sistema", Resultado: "ok"})
		s.guardar()
	}
	go s.programador()
	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "18570"
	}
	if _, err := strconv.Atoi(puerto); err != nil {
		log.Fatal("PORT no válido")
	}
	prov := "ninguno"
	if s.llm != nil {
		prov = s.llm.Nombre() + " · " + s.llm.Modelo()
	}
	srv := &http.Server{Addr: ":" + puerto, Handler: s.rutas(), ReadHeaderTimeout: 5 * time.Second}
	log.Printf("orquesta-sperant en :%s (%d tickets, motor %s, Claude: %s, tope US$%.2f)", puerto, len(s.e.Tickets), s.e.Config.Motor, prov, s.tope)
	log.Fatal(srv.ListenAndServe())
}
