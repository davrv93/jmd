package httpapi

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
)

// aulaArena simula el servidor del monito dentro de cada aula: entiende el instalador, los ataques,
// las defensas y el chequeo de live_arena.go.
type aulaArena struct {
	aulaFalsa
	mu    sync.Mutex
	labs  map[string]*labFalso
	execs map[string][]string
}

type labFalso struct{ app, base, disco, lento, fuga, clones, datos, sesion, clave bool }

func (a *aulaArena) lab(nombre string) *labFalso {
	if a.labs == nil {
		a.labs = map[string]*labFalso{}
		a.execs = map[string][]string{}
	}
	if a.labs[nombre] == nil {
		a.labs[nombre] = &labFalso{}
	}
	return a.labs[nombre]
}

func (a *aulaArena) ExecStdin(_ context.Context, nombre, script string, stdin []byte) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if strings.Contains(script, ".instalar.sh") && strings.Contains(string(stdin), "LAB_OK") {
		l := a.lab(nombre)
		l.app, l.base, l.disco, l.lento = true, true, false, false
		return "LAB_OK", nil
	}
	return "", nil
}

func (a *aulaArena) Exec(_ context.Context, nombre string, cmd ...string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	c := strings.Join(cmd, " ")
	l := a.lab(nombre)
	a.execs[nombre] = append(a.execs[nombre], c)
	switch c {
	case arenaChequeo:
		var b strings.Builder
		if l.app {
			b.WriteString("APP_SI\n")
		} else {
			b.WriteString("APP_NO\n")
		}
		var js []string
		for k, v := range map[string]bool{"fuga": l.fuga, "datos": l.datos, "sesion": l.sesion, "clave": l.clave} {
			if v {
				js = append(js, `"`+k+`"`)
			}
		}
		if l.app && !l.lento {
			b.WriteString(`{"ok":false,"fallas":[` + strings.Join(js, ",") + `]}` + "\n")
		}
		if l.clones {
			b.WriteString("CLONES\n")
		}
		if l.app && l.base && !l.disco && !l.lento && len(js) == 0 && !l.clones {
			b.WriteString("HTTP_200\n")
		} else {
			b.WriteString("HTTP_503\n")
		}
		if l.lento {
			b.WriteString("LENTO\n")
		}
		if l.disco {
			b.WriteString("LIBRE_4\n")
		} else {
			b.WriteString("LIBRE_60\n")
		}
		if l.base {
			b.WriteString("BASE_SI\n")
		} else {
			b.WriteString("BASE_NO\n")
		}
		return b.String(), nil
	case arenaAtaques["apagar"]:
		l.app = false
	case arenaAtaques["disco"]:
		l.disco = true
	case arenaAtaques["base"]:
		l.base = false
	case arenaAtaques["atascar"]:
		l.lento = true
	case arenaAtaques["fuga"]:
		l.fuga = true
	case arenaAtaques["clones"]:
		l.clones = true
	case arenaAtaques["pesados"]:
		l.disco = true
	case arenaAtaques["formulario"]:
		l.datos = true
	case arenaAtaques["sesion"]:
		l.sesion = true
	case arenaAtaques["clave"]:
		l.clave = true
	case arenaDefensas["reiniciar"]:
		l.app = true
		return "OK", nil
	case arenaDefensas["limpiar"]:
		l.disco = false
		return "OK", nil
	}
	return "", nil
}

func (a *aulaArena) estado(nombre string) labFalso {
	a.mu.Lock()
	defer a.mu.Unlock()
	return *a.lab(nombre)
}

func esperar(t *testing.T, que string, f func() bool) {
	t.Helper()
	for i := 0; i < 100; i++ {
		if f() {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("no pasó: %s", que)
}

func TestLiveArena(t *testing.T) {
	e := newEnv(t)
	fa := &aulaArena{}
	e.setAula(fa)
	profe := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	luis := e.register("luis@x.test")
	salasArena.Lock()
	salasArena.m = map[string]*salaArena{}
	salasArena.Unlock()
	const api = "/api/v1/live/l1/arena"
	post := func(tok string, cuerpo map[string]any, quiere int) resp {
		t.Helper()
		r := e.call("POST", api, tok, false, cuerpo, "")
		if r.code != quiere {
			t.Fatalf("%v: %d %s", cuerpo, r.code, r.raw)
		}
		return r
	}
	yo := func(r resp) map[string]any { m, _ := r.body["yo"].(map[string]any); return m }

	// Arena vacía: las listas viajan como [] y nunca como null (la escena las recorre).
	if r := e.call("GET", api, profe, false, nil, ""); r.code != 200 || r.body["eventos"] == nil || r.body["jugadores"] == nil {
		t.Fatalf("arena vacía: %d %s", r.code, r.raw)
	}

	// Ana ataca (sin aula); Luis defiende y recibe su servidor de práctica.
	if n := yo(post(ana, map[string]any{"accion": "unir", "equipo": "tumba"}, 200))["equipo"]; n != "tumba" {
		t.Fatalf("ana: %v", n)
	}
	r := post(luis, map[string]any{"accion": "unir", "equipo": "server"}, 200)
	luisN := int(yo(r)["n"].(float64))
	esperar(t, "lab de Luis listo", func() bool {
		return yo(e.call("GET", api, luis, false, nil, ""))["lab"] == "listo"
	})
	post(ana, map[string]any{"accion": "unir", "equipo": "pirata"}, 400)

	// Fuera de turno nadie ataca; el alumno no maneja los turnos.
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "base"}, 409)
	post(ana, map[string]any{"accion": "iniciar"}, 403)
	post(profe, map[string]any{"accion": "iniciar"}, 200)

	// Turno de ataque: dos ataques por ronda, scripts fijos, al aula de Luis.
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "rm -rf /"}, 400)
	post(luis, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "base"}, 409)
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "base"}, 200)
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "disco"}, 200)
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "apagar"}, 409)
	nombreLuis := ""
	for n := range fa.labs {
		nombreLuis = n
	}
	esperar(t, "ataques aplicados", func() bool { l := fa.estado(nombreLuis); return !l.base && l.disco })
	post(luis, map[string]any{"accion": "defender", "defensa": "limpiar"}, 409) // todavía no es su turno

	// Defensa: el botón limpia el disco, pero la base solo se cura con DeepSeek Harness.
	post(profe, map[string]any{"accion": "siguiente"}, 200)
	r = post(luis, map[string]any{"accion": "defender", "defensa": "limpiar"}, 200)
	if !strings.Contains(yo(r)["mensaje"].(string), "limpió") {
		t.Fatalf("mensaje: %v", yo(r)["mensaje"])
	}
	post(luis, map[string]any{"accion": "defender", "defensa": "borrar_todo"}, 400)
	post(profe, map[string]any{"accion": "siguiente"}, 200) // cierra la ronda: el vigía puntúa

	salaArenaDe("l1").mu.Lock()
	sa := salaArenaDe("l1")
	sa.vigia = true // las pruebas no esperan al vigía: se chequea y puntúa a mano
	sa.mu.Unlock()
	res := e.s.chequearArena([]string{luisID(t, sa, luisN)})
	sa.mu.Lock()
	for id, x := range res {
		sa.Jug[id].Salud, sa.Jug[id].Fallas = x.salud, x.fallas
	}
	sa.puntuar(time.Now())
	tumba, server, salud := sa.Tumba, sa.Server, sa.Jug[luisID(t, sa, luisN)].Fallas
	sa.mu.Unlock()
	if tumba != arenaPuntos || server != 0 || len(salud) != 1 || salud[0] != "base" {
		t.Fatalf("ronda 1: tumba %d server %d fallas %v", tumba, server, salud)
	}
	if p := yo(e.call("GET", api, ana, false, nil, ""))["puntos"]; p != float64(arenaPuntos) {
		t.Fatalf("puntos de Ana: %v", p)
	}
	// Ronda 2: un ataque sin receta (fuga de datos) también tumba el servidor.
	post(profe, map[string]any{"accion": "iniciar"}, 200)
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "fuga"}, 200)
	esperar(t, "fuga aplicada", func() bool { return fa.estado(nombreLuis).fuga })
	if s, f := arenaLeerSalud(func() string { o, _ := fa.Exec(t.Context(), nombreLuis, arenaChequeo); return o }()); s != "caido" || !strings.Contains(strings.Join(f, " "), "fuga") {
		t.Fatalf("fuga no detectada: %s %v", s, f)
	}
	ev := e.call("GET", api, ana, false, nil, "").body["eventos"].([]any)
	if len(ev) < 5 {
		t.Fatalf("eventos: %v", ev)
	}
}

func luisID(t *testing.T, sa *salaArena, n int) string {
	t.Helper()
	for id, j := range sa.Jug {
		if j.N == n {
			return id
		}
	}
	t.Fatal("no está")
	return ""
}

func TestArenaLeerSalud(t *testing.T) {
	casos := []struct {
		out    string
		salud  string
		fallas string
	}{
		{"APP_SI\nHTTP_200\nLIBRE_60\nBASE_SI", "ok", ""},
		{"APP_NO\nHTTP_000\nLIBRE_60\nBASE_SI", "caido", "app"},
		{"APP_SI\nHTTP_000\nLENTO\nLIBRE_60\nBASE_SI", "caido", "lenta"},
		{"APP_SI\nHTTP_503\nLIBRE_3\nBASE_NO", "caido", "disco base"},
		{"SIN_LAB", "caido", "sin_lab"},
		{"APP_SI\nHTTP_503\nLIBRE_60\nBASE_SI", "caido", "app"},
		{"APP_SI\n{\"ok\":false,\"fallas\":[\"datos\",\"clave\"],\"libre_mb\":60}\nHTTP_503\nLIBRE_60\nBASE_SI", "caido", "datos clave"},
		{"APP_SI\n{\"ok\":false,\"fallas\":[\"disco\"]}\nHTTP_503\nLIBRE_3\nBASE_SI\nCLONES", "caido", "disco clones"},
		{"APP_SI\n{\"ok\":true,\"fallas\":[],\"libre_mb\":60}\nHTTP_200\nLIBRE_60\nBASE_SI", "ok", ""},
	}
	for _, c := range casos {
		s, f := arenaLeerSalud(c.out)
		if s != c.salud || strings.Join(f, " ") != c.fallas {
			t.Errorf("%q → %s %v, quería %s %q", c.out, s, f, c.salud, c.fallas)
		}
	}
}

// Los ataques de disco son un estado del juego: ninguno escribe datos de verdad (nada de /dev/zero ni de
// count mayor que cero), para que treinta alumnos atacando a la vez no le quiten memoria ni disco al servidor.
func TestArenaSinVolcados(t *testing.T) {
	for nombre, script := range arenaAtaques {
		if strings.Contains(script, "/dev/zero") || strings.Contains(script, "/dev/urandom") {
			t.Errorf("el ataque %s escribe datos reales: %s", nombre, script)
		}
	}
	for _, nombre := range []string{"disco", "pesados"} {
		if s := arenaAtaques[nombre]; !strings.Contains(s, "count=0") || !strings.Contains(s, "seek=") {
			t.Errorf("el ataque %s debe crear archivos huecos (dd seek=… count=0): %s", nombre, s)
		}
	}
	if strings.Contains(arenaChequeo, "df -m") {
		t.Error("el chequeo debe medir el cupo de la tienda (tamaño aparente), no el espacio real")
	}
}

// Escudo temporal del defensor y Chaos Kong (apagar a todos): reglas, límites por ronda y lo que ve la escena.
func TestLiveArenaEscudoYKong(t *testing.T) {
	e := newEnv(t)
	e.setAula(&aulaArena{})
	profe := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	beto := e.register("beto@x.test")
	luis := e.register("luis@x.test")
	mia := e.register("mia@x.test")
	salasArena.Lock()
	salasArena.m = map[string]*salaArena{}
	salasArena.Unlock()
	const api = "/api/v1/live/l1/arena"
	post := func(tok string, cuerpo map[string]any, quiere int) resp {
		t.Helper()
		r := e.call("POST", api, tok, false, cuerpo, "")
		if r.code != quiere {
			t.Fatalf("%v: %d %s", cuerpo, r.code, r.raw)
		}
		return r
	}
	yo := func(r resp) map[string]any { m, _ := r.body["yo"].(map[string]any); return m }
	post(ana, map[string]any{"accion": "unir", "equipo": "tumba"}, 200)
	post(beto, map[string]any{"accion": "unir", "equipo": "tumba"}, 200)
	luisN := int(yo(post(luis, map[string]any{"accion": "unir", "equipo": "server"}, 200))["n"].(float64))
	miaN := int(yo(post(mia, map[string]any{"accion": "unir", "equipo": "server"}, 200))["n"].(float64))
	for _, tok := range []string{luis, mia} {
		tok := tok
		esperar(t, "lab listo", func() bool { return yo(e.call("GET", api, tok, false, nil, ""))["lab"] == "listo" })
	}
	// Fuera del turno de ataque no hay escudo ni Kong.
	post(luis, map[string]any{"accion": "escudo"}, 409)
	post(ana, map[string]any{"accion": "kernel_panic"}, 409)
	post(profe, map[string]any{"accion": "iniciar"}, 200)
	// Luis cierra conexiones: el ataque rebota y Ana NO gasta su ataque; a Mía sí le entra.
	r := post(luis, map[string]any{"accion": "escudo"}, 200)
	if yo(r)["escudo_libre"] != false || yo(r)["escudo_ms"].(float64) <= 0 {
		t.Fatalf("escudo de Luis: %v", yo(r))
	}
	post(luis, map[string]any{"accion": "escudo"}, 409) // una vez por ronda
	post(ana, map[string]any{"accion": "escudo"}, 409)  // los monos no tienen escudo
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "apagar"}, 409)
	if n := yo(e.call("GET", api, ana, false, nil, ""))["ataques"]; n != float64(0) {
		t.Fatalf("el rebote gastó un ataque: %v", n)
	}
	post(ana, map[string]any{"accion": "atacar", "objetivo": miaN, "ataque": "disco"}, 200)
	// Ana ya gastó un ataque: no puede soltar a Kong. Beto sí, y Luis se salva por el escudo.
	post(ana, map[string]any{"accion": "kernel_panic"}, 409)
	r = post(beto, map[string]any{"accion": "kernel_panic"}, 200)
	if yo(r)["ataques"] != float64(arenaAtaquesMax) || r.body["kernel_libre"] != false {
		t.Fatalf("tras Kong: yo=%v kernel_libre=%v", yo(r), r.body["kernel_libre"])
	}
	post(beto, map[string]any{"accion": "kernel_panic"}, 409)  // una vez por ronda para todo el equipo
	post(profe, map[string]any{"accion": "kernel_panic"}, 409) // tampoco el instructor en la misma ronda
	ult := ""
	for _, ev := range e.call("GET", api, profe, false, nil, "").body["eventos"].([]any) {
		if m := ev.(map[string]any); m["accion"] == "kernel" {
			ult = m["texto"].(string)
		}
	}
	if !strings.Contains(ult, "se apagaron 1 servidores") || !strings.Contains(ult, "1 se salvaron") {
		t.Fatalf("evento de kernel panic: %q", ult)
	}
	// Reiniciar la arena devuelve escudo y Kong.
	post(profe, map[string]any{"accion": "reiniciar"}, 200)
	post(profe, map[string]any{"accion": "iniciar"}, 200)
	if r := e.call("GET", api, luis, false, nil, ""); r.body["kernel_libre"] != true || r.body["kernel_restan"] != float64(2) || yo(r)["escudo_libre"] != true {
		t.Fatalf("tras reiniciar: kernel_libre=%v yo=%v", r.body["kernel_libre"], yo(r))
	}
	post(profe, map[string]any{"accion": "kernel_panic"}, 200) // el instructor también puede lanzarlo (1 de 2)
	// Cinco rondas y se acaba; el tiempo se acorta; el kernel panic se agota a la segunda.
	if arenaDurAtaque(1) != 35*time.Second || arenaDurAtaque(5) != 19*time.Second || arenaDurDefensa(1) != 75*time.Second || arenaDurDefensa(5) != 39*time.Second {
		t.Fatalf("duraciones: %v %v %v %v", arenaDurAtaque(1), arenaDurAtaque(5), arenaDurDefensa(1), arenaDurDefensa(5))
	}
	for ronda := 2; ronda <= 5; ronda++ {
		post(profe, map[string]any{"accion": "siguiente"}, 200)      // → defensa
		post(profe, map[string]any{"accion": "siguiente"}, 200)      // → marcador
		r := post(profe, map[string]any{"accion": "siguiente"}, 200) // → ronda siguiente
		if r.body["ronda"] != float64(ronda) || r.body["rondas_max"] != float64(5) {
			t.Fatalf("ronda %d: %v de %v", ronda, r.body["ronda"], r.body["rondas_max"])
		}
		if ronda == 2 {
			post(ana, map[string]any{"accion": "kernel_panic"}, 200) // 2 de 2
		}
		if ronda == 3 {
			post(beto, map[string]any{"accion": "kernel_panic"}, 409) // agotado
		}
	}
	post(profe, map[string]any{"accion": "siguiente"}, 200) // → defensa de la 5
	post(profe, map[string]any{"accion": "siguiente"}, 200) // → marcador final
	post(profe, map[string]any{"accion": "siguiente"}, 409) // no hay sexta ronda
	post(profe, map[string]any{"accion": "iniciar"}, 409)
	fin := false
	for _, ev := range e.call("GET", api, profe, false, nil, "").body["eventos"].([]any) {
		if m := ev.(map[string]any); m["accion"] == "fin" {
			fin = true
		}
	}
	if !fin {
		t.Fatal("falta el evento de fin del juego")
	}
}
