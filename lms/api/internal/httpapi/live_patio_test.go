package httpapi

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
	"testing"
	"time"
)

func vaciarPatios() {
	patios.Lock()
	patios.m = map[string]*patio{}
	patios.Unlock()
}

func ptr[T any](v T) *T { return &v }

// Caben 40; el 41 entra solo si hay alguien inactivo, al que saca (y suelta lo que tenía).
func TestPatioTopeJugadores(t *testing.T) {
	now := time.Unix(1000, 0)
	s := nuevoPatio("l/e", 1)
	for i := 0; i < patioMaxJugadores; i++ {
		if _, err := s.unir(fmt.Sprintf("s%d", i), "N", now); err != nil {
			t.Fatalf("jugador %d: %v", i, err)
		}
	}
	if _, err := s.unir("extra", "X", now); !errors.Is(err, errPatio) {
		t.Fatalf("el 41 debía chocar con la sala llena: %v", err)
	}
	viejo := s.jugadores["s3"]
	if _, err := s.tomar(viejo, "pepita-1", 0); err != nil {
		t.Fatal(err)
	}
	later := now.Add(patioInactivo + time.Second)
	for i := 0; i < patioMaxJugadores; i++ {
		if i != 3 {
			s.jugadores[fmt.Sprintf("s%d", i)].visto = later
		}
	}
	j, err := s.unir("extra", "X", later)
	if err != nil || j.id != "j41" {
		t.Fatalf("debía entrar sacando al inactivo: %v %+v", err, j)
	}
	if s.jugadores["s3"] != nil || len(s.orden) != patioMaxJugadores {
		t.Errorf("el inactivo debía salir: %d", len(s.orden))
	}
	if s.objetos["pepita-1"].dueno != "" {
		t.Errorf("su objeto debía volver al mundo")
	}
	// Reconectarse devuelve al mismo jugador, con su id.
	if again, _ := s.unir("s0", "N", later); again.id != "j1" {
		t.Errorf("reconexión: %s", again.id)
	}
}

// Un objeto es de quien lo toma primero; la versión evita tomar uno que ya cambió; consumir lo renueva;
// quien se va o se queda quieto lo suelta; con la ronda terminada no se toma nada.
func TestPatioObjetos(t *testing.T) {
	now := time.Unix(1000, 0)
	s := nuevoPatio("l/e", 2)
	ana, _ := s.unir("sa", "Ana", now)
	beto, _ := s.unir("sb", "Beto", now)
	if _, err := s.tomar(ana, "n1", 0); err != nil {
		t.Fatal(err)
	}
	if _, err := s.tomar(beto, "n1", 0); !errors.Is(err, errPatio) {
		t.Errorf("Beto no puede tomar lo de Ana: %v", err)
	}
	if _, err := s.tomar(ana, "n1", 0); err != nil {
		t.Errorf("tomar otra vez lo propio vale: %v", err)
	}
	if _, err := s.soltar(beto, "n1", true); !errors.Is(err, errPatio) {
		t.Errorf("Beto no suelta lo ajeno: %v", err)
	}
	o, err := s.soltar(ana, "n1", true)
	if err != nil || o.v != 1 || o.dueno != "" {
		t.Fatalf("consumir: %+v %v", o, err)
	}
	if _, err := s.tomar(beto, "n1", 0); !errors.Is(err, errPatio) {
		t.Errorf("la versión 0 ya no existe: %v", err)
	}
	if _, err := s.tomar(beto, "n1", 1); err != nil {
		t.Errorf("la versión 1 está libre: %v", err)
	}
	if _, err := s.tomar(beto, "N_MAL", 0); err == nil || errors.Is(err, errPatio) {
		t.Errorf("id inválido debe ser 400: %v", err)
	}
	// Soltar sin consumir: misma versión.
	if o, _ := s.soltar(beto, "n1", false); o.v != 1 {
		t.Errorf("soltar sin consumir cambió la versión: %d", o.v)
	}
	s.tomar(beto, "n1", 1)
	beto.activo = true
	s.avanzar(now.Add(patioInactivo + time.Second))
	if s.objetos["n1"].dueno != "" {
		t.Errorf("Beto inactivo debía soltarlo")
	}
	s.iniciar(60, nil, 0, now)
	s.terminar(now.Add(time.Second))
	if _, err := s.tomar(ana, "n2", 0); !errors.Is(err, errPatio) {
		t.Errorf("en el final no se toma: %v", err)
	}
	if _, err := s.sumar("boveda", 5); !errors.Is(err, errPatio) {
		t.Errorf("en el final no se suma: %v", err)
	}
}

// La ronda: semilla común, reloj, todo a cero; vence sola; reiniciar vuelve a la espera.
func TestPatioRonda(t *testing.T) {
	now := time.Unix(1000, 0)
	s := nuevoPatio("l/e", 3)
	ana, _ := s.unir("sa", "Ana", now)
	if err := s.estado(ana, jugadaPatio{Puntos: ptr(30), Carga: ptr("n1")}, now); err != nil {
		t.Fatal(err)
	}
	s.tomar(ana, "n1", 0)
	s.sumar("boveda", 40)
	s.iniciar(120, ptr(uint32(777)), 200, now)
	r := s.ronda
	if r.Estado != "jugando" || r.Semilla != 777 || r.N != 1 || r.Meta != 200 || r.FinMs-r.InicioMs != 120000 {
		t.Fatalf("ronda: %+v", r)
	}
	if ana.puntos != 0 || ana.carga != "" || len(s.objetos) != 0 || len(s.contadores) != 0 {
		t.Errorf("iniciar debía limpiar: puntos=%d carga=%q objetos=%d contadores=%d", ana.puntos, ana.carga, len(s.objetos), len(s.contadores))
	}
	s.iniciar(5, nil, -3, now) // fuera de rango: duración por defecto, sin meta
	if s.ronda.DuracionS != patioDuracionDef || s.ronda.Meta != 0 || s.ronda.N != 2 {
		t.Errorf("valores por defecto: %+v", s.ronda)
	}
	s.avanzar(now.Add(time.Duration(patioDuracionDef)*time.Second + time.Millisecond))
	if s.ronda.Estado != "final" {
		t.Errorf("debía vencer: %s", s.ronda.Estado)
	}
	sem := s.ronda.Semilla
	s.reiniciar()
	if s.ronda.Estado != "espera" || s.ronda.FinMs != 0 || s.ronda.Semilla == sem {
		t.Errorf("reiniciar: %+v", s.ronda)
	}
	if n, err := s.sumar("boveda", 500); err == nil {
		t.Errorf("sumar más de %d de golpe no vale: %d", patioMaxSumar, n)
	}
	if n, _ := s.sumar("boveda", -50); n != 0 {
		t.Errorf("un contador no baja de cero: %d", n)
	}
	for i := 0; i < patioMaxContadores; i++ {
		s.sumar(fmt.Sprintf("c%d", i), 1)
	}
	if _, err := s.sumar("otro", 1); !errors.Is(err, errPatio) {
		t.Errorf("tope de contadores: %v", err)
	}
}

// Validación del estado: nada se aplica si un campo es inválido; los ausentes no cambian.
func TestPatioEstadoValida(t *testing.T) {
	now := time.Unix(1000, 0)
	s := nuevoPatio("l/e", 4)
	j, _ := s.unir("sa", "Ana", now)
	if err := s.estado(j, jugadaPatio{X: ptr(120.04), Y: ptr(80.0), Dir: ptr(2), Anim: ptr("camina"), Avatar: &avatarPatio{Color: 5, Accesorio: "casco"}}, now); err != nil {
		t.Fatal(err)
	}
	if j.x != 120 || j.y != 80 || j.dir != 2 || j.anim != "camina" || j.color != 5 || j.acc != "casco" {
		t.Fatalf("estado: %+v", j)
	}
	malos := []jugadaPatio{
		{X: ptr(math.NaN())}, {Y: ptr(math.Inf(1))}, {X: ptr(1e9)}, {Dir: ptr(9)}, {Anim: ptr("<b>")},
		{Emote: ptr(strings.Repeat("a", 30))}, {Puntos: ptr(-1)}, {Avatar: &avatarPatio{Color: 99}}, {Carga: ptr("Con Espacio")},
	}
	for i, m := range malos {
		if err := s.estado(j, m, now); err == nil {
			t.Errorf("caso %d debía fallar", i)
		}
	}
	if j.x != 120 || j.anim != "camina" {
		t.Errorf("un estado inválido no debe tocar nada: %+v", j)
	}
	s.estado(j, jugadaPatio{Emote: ptr("hola")}, now)
	v := s.instante(now.Add(time.Second))
	if len(v.Jugadores) != 1 || v.Jugadores[0].Emote != "hola" {
		t.Errorf("el emote debía viajar: %+v", v.Jugadores)
	}
	if v = s.instante(now.Add(5 * time.Second)); v.Jugadores[0].Emote != "" {
		t.Errorf("el emote caduca a los 4 s")
	}
	if err := s.evento(j, jugadaPatio{Tipo: "entrega", Texto: "¡Oro!\n+10", Valor: 10, EX: ptr(10.4), EY: ptr(20.6)}); err != nil {
		t.Fatal(err)
	}
	if e := s.eventos[0]; e.Texto != "¡Oro! +10" || *e.X != 10 || *e.Y != 21 || e.De != j.id {
		t.Errorf("evento: %+v", e)
	}
	if err := s.evento(j, jugadaPatio{Tipo: ""}); err == nil {
		t.Errorf("evento sin tipo")
	}
}

// Cubeta: 20 seguidas pasan, la 21 no; al rato vuelven fichas.
func TestPatioCuota(t *testing.T) {
	now := time.Unix(1000, 0)
	var c cubeta
	for i := 0; i < 20; i++ {
		if !c.tomar(patioCuotaEstado, now) {
			t.Fatalf("la %d debía pasar", i)
		}
	}
	if c.tomar(patioCuotaEstado, now) {
		t.Errorf("la 21 debía frenarse")
	}
	if !c.tomar(patioCuotaEstado, now.Add(200*time.Millisecond)) {
		t.Errorf("a los 200 ms ya hay fichas")
	}
}

// El instante de 25 jugadores en movimiento cabe holgado para mandarlo 10 veces por segundo.
func TestPatioInstanteLiviano(t *testing.T) {
	now := time.Unix(1000, 0)
	s := nuevoPatio("l/e", 5)
	s.iniciar(180, nil, 400, now)
	for i := 0; i < 25; i++ {
		j, _ := s.unir(fmt.Sprintf("s%d", i), "María Fernanda G.", now)
		s.estado(j, jugadaPatio{X: ptr(1234.5), Y: ptr(876.5), Dir: ptr(3), Anim: ptr("camina"), Carga: ptr("pepita-12"), Puntos: ptr(120),
			Avatar: &avatarPatio{Color: i % 12, Accesorio: "casco"}}, now)
		s.tomar(j, fmt.Sprintf("pepita-%d", i), 0)
	}
	b := mensajeSSE("instante", s.instante(now))
	if len(b) > 9000 {
		t.Errorf("instante de 25 jugadores: %d bytes", len(b))
	}
	var v instantePatio
	if err := json.Unmarshal(b[len("event: instante\ndata: "):], &v); err != nil || len(v.Jugadores) != 25 || len(v.Tabla) != patioTabla || v.Total != 25 {
		t.Errorf("instante: %v jugadores=%d tabla=%d", err, len(v.Jugadores), len(v.Tabla))
	}
}

// leerSSE abre el stream y devuelve un canal con cada bloque «event: …».
func leerSSE(t *testing.T, ctx context.Context, url, token string) <-chan string {
	t.Helper()
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != 200 {
		t.Fatalf("stream: %d", res.StatusCode)
	}
	out := make(chan string, 64)
	go func() {
		defer res.Body.Close()
		defer close(out)
		sc := bufio.NewScanner(res.Body)
		sc.Buffer(make([]byte, 1<<20), 1<<20)
		var actual []string
		for sc.Scan() {
			l := sc.Text()
			if l == "" {
				if len(actual) > 0 && strings.HasPrefix(actual[0], "event: ") {
					out <- strings.Join(actual, "\n")
				}
				actual = nil
				continue
			}
			actual = append(actual, l)
		}
	}()
	return out
}

func esperarSSE(t *testing.T, ch <-chan string, que func(string) bool) string {
	t.Helper()
	limite := time.After(4 * time.Second)
	for {
		select {
		case b, ok := <-ch:
			if !ok {
				t.Fatal("el stream se cerró")
			}
			if que(b) {
				return b
			}
		case <-limite:
			t.Fatal("no llegó el evento esperado")
		}
	}
}

// De punta a punta: acceso, validación, límites, ronda del staff, objetos y el stream a 10 Hz.
func TestPatioHTTP(t *testing.T) {
	vaciarPatios()
	e := newEnvEscenas(t)
	profe := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	beto := e.register("beto@x.test")
	post := func(tok string, in map[string]any) resp {
		return e.call("POST", "/api/v1/live/l1/patio", tok, false, in, "")
	}

	if r := e.call("GET", "/api/v1/live/l1/patio?escena=01-uno", "", false, nil, ""); r.code != 401 {
		t.Errorf("sin sesión: %d", r.code)
	}
	if r := post(ana, map[string]any{"escena": "99-no", "x": 1}); r.code != 404 {
		t.Errorf("escena desconocida: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l2/patio", ana, false, map[string]any{"escena": "01-uno"}, ""); r.code != 404 {
		t.Errorf("lección en borrador para el alumno: %d", r.code)
	}
	if r := post(ana, map[string]any{"escena": "01-uno", "accion": "iniciar"}); r.code != 403 {
		t.Errorf("el alumno no inicia: %d", r.code)
	}
	if r := post(ana, map[string]any{"escena": "01-uno", "accion": "volar"}); r.code != 400 {
		t.Errorf("acción desconocida: %d", r.code)
	}
	if r := post(ana, map[string]any{"escena": "01-uno", "zzz": 1}); r.code != 400 {
		t.Errorf("campo desconocido: %d", r.code)
	}
	if r := post(ana, map[string]any{"escena": "01-uno", "accion": "evento", "tipo": "x", "texto": strings.Repeat("a", 3000)}); r.code != 413 {
		t.Errorf("cuerpo grande: %d", r.code)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ch := leerSSE(t, ctx, e.srv.URL+"/api/v1/live/l1/patio/stream?escena=01-uno", profe)
	hola := esperarSSE(t, ch, func(b string) bool { return strings.HasPrefix(b, "event: hola") })
	if !strings.Contains(hola, `"staff":true`) || !strings.Contains(hola, `"yo":""`) {
		t.Errorf("hola del profe: %s", hola)
	}

	r := post(ana, map[string]any{"escena": "01-uno", "x": 321.5, "y": 99, "dir": 1, "anim": "camina", "avatar": map[string]any{"color": 4, "accesorio": "casco"}})
	if r.code != 200 || r.body["yo"] != "j1" {
		t.Fatalf("estado de Ana: %d %s", r.code, r.raw)
	}
	b := esperarSSE(t, ch, func(b string) bool { return strings.Contains(b, `"x":321.5`) })
	if !strings.Contains(b, `"a":"casco"`) || !strings.Contains(b, `"m":"camina"`) || !strings.Contains(b, `"n":"Alumno"`) {
		t.Errorf("instante con Ana: %s", b)
	}

	if r := post(profe, map[string]any{"escena": "01-uno", "accion": "iniciar", "duracion_s": 90, "semilla": 4242, "meta": 300}); r.code != 200 {
		t.Fatalf("iniciar: %d %s", r.code, r.raw)
	}
	esperarSSE(t, ch, func(b string) bool {
		return strings.Contains(b, `"semilla":4242`) && strings.Contains(b, `"estado":"jugando"`)
	})

	if r := post(ana, map[string]any{"escena": "01-uno", "accion": "tomar", "objeto": "pepita-3", "v": 0}); r.code != 200 {
		t.Fatalf("tomar: %d %s", r.code, r.raw)
	}
	if r := post(beto, map[string]any{"escena": "01-uno", "accion": "tomar", "objeto": "pepita-3", "v": 0}); r.code != 409 {
		t.Errorf("Beto no toma lo de Ana: %d", r.code)
	}
	if r := post(ana, map[string]any{"escena": "01-uno", "accion": "soltar", "objeto": "pepita-3", "consumir": true}); r.code != 200 {
		t.Errorf("soltar: %d %s", r.code, r.raw)
	}
	if r := post(ana, map[string]any{"escena": "01-uno", "accion": "sumar", "contador": "boveda", "valor": 10}); r.code != 200 || r.body["valor"] != float64(10) {
		t.Errorf("sumar: %d %s", r.code, r.raw)
	}
	post(ana, map[string]any{"escena": "01-uno", "accion": "evento", "tipo": "entrega", "texto": "¡Oro! +10", "valor": 10})
	b = esperarSSE(t, ch, func(b string) bool { return strings.Contains(b, `"tipo":"entrega"`) })
	if !strings.Contains(b, `"boveda":10`) || !strings.Contains(b, `{"id":"pepita-3","v":1}`) {
		t.Errorf("instante con contador y objeto: %s", b)
	}

	// Rate limit: una ráfaga de 40 estados seguidos frena alguno.
	frenados := 0
	for i := 0; i < 40; i++ {
		if r := post(beto, map[string]any{"escena": "01-uno", "x": float64(i)}); r.code == 429 {
			frenados++
		}
	}
	if frenados == 0 {
		t.Errorf("la ráfaga debía frenarse")
	}

	if r := post(profe, map[string]any{"escena": "01-uno", "accion": "terminar"}); r.code != 200 || r.body["ronda"].(map[string]any)["estado"] != "final" {
		t.Errorf("terminar: %d %s", r.code, r.raw)
	}
	if r := post(ana, map[string]any{"escena": "01-uno", "accion": "salir"}); r.code != 200 {
		t.Errorf("salir: %d", r.code)
	}
	g := e.call("GET", "/api/v1/live/l1/patio?escena=01-uno", ana, false, nil, "")
	if g.code != 200 || g.body["yo"] != "j1" {
		t.Fatalf("GET: %d %s", g.code, g.raw)
	}
	for _, j := range g.body["instante"].(map[string]any)["j"].([]any) {
		if j.(map[string]any)["id"] == "j1" {
			t.Errorf("Ana salió: no debe estar entre los activos")
		}
	}

	// El motor se sirve con su tipo; lo demás no.
	if r := e.call("GET", "/api/v1/live/l1/arena/arena-jmd.js", ana, false, nil, ""); r.code != 200 || !strings.HasPrefix(r.hdr.Get("Content-Type"), "text/javascript") || !strings.Contains(string(r.raw), "ArenaJMD") {
		t.Errorf("motor: %d %s", r.code, r.hdr.Get("Content-Type"))
	}
	if r := e.call("GET", "/api/v1/live/l1/arena/arena-jmd.css", ana, false, nil, ""); r.code != 200 || !strings.HasPrefix(r.hdr.Get("Content-Type"), "text/css") {
		t.Errorf("estilos del motor: %d", r.code)
	}
	for _, ruta := range []string{"/api/v1/live/l1/arena/nada.js", "/api/v1/live/l1/arena/..%2flive_patio.go", "/api/v1/live/zz/arena/arena-jmd.js"} {
		if r := e.call("GET", ruta, ana, false, nil, ""); r.code != 404 {
			t.Errorf("%s: %d", ruta, r.code)
		}
	}
	if r := e.call("GET", "/api/v1/live/l1/arena/arena-jmd.js", "", false, nil, ""); r.code != 401 {
		t.Errorf("motor sin sesión: %d", r.code)
	}
}
