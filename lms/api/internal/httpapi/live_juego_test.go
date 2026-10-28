package httpapi

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

// cfgPrueba: dos contenedores, ocho conceptos; los pares van a "a" y los impares a "b".
func cfgPrueba() *configJuego {
	c := &configJuego{Contenedores: []contenedorJuego{{ID: "a", Nombre: "A"}, {ID: "b", Nombre: "B"}}}
	for i := 0; i < 8; i++ {
		k := "a"
		if i%2 == 1 {
			k = "b"
		}
		c.Conceptos = append(c.Conceptos, struct {
			Texto      string `yaml:"texto"`
			Contenedor string `yaml:"contenedor"`
		}{Texto: string(rune('p' + i)), Contenedor: k})
	}
	return c
}

func respuesta(j *juego, b *bola, buena bool) string {
	k := j.cfg.Conceptos[b.Concepto].Contenedor
	if buena {
		return k
	}
	if k == "a" {
		return "b"
	}
	return "a"
}

func bolaLibre(t *testing.T, j *juego) *bola {
	t.Helper()
	for _, b := range j.bolas {
		if b.Estado == "libre" {
			return b
		}
	}
	t.Fatal("no hay bolas libres")
	return nil
}

// Clasificar mal devuelve la bola al centro y resta; bien la carga. No se atrapan dos a la vez.
func TestJuegoClasificar(t *testing.T) {
	now := time.Unix(1000, 0)
	j := nuevoJuego(cfgPrueba(), 1)
	ana, _ := j.unir("sa", "Ana", now)
	j.avanzar(now)
	if len(j.bolas) < 4 {
		t.Fatalf("debe haber al menos 4 bolas: %d", len(j.bolas))
	}
	b := bolaLibre(t, j)
	if _, err := j.jugar(ana, jugadaJuego{Accion: "atrapar", Bola: b.ID}, now); err != nil {
		t.Fatal(err)
	}
	otra := bolaLibre(t, j)
	if _, err := j.jugar(ana, jugadaJuego{Accion: "atrapar", Bola: otra.ID}, now); !errors.Is(err, errJuego) {
		t.Errorf("no debe atrapar dos: %v", err)
	}
	ana.Puntos = 3
	res, err := j.jugar(ana, jugadaJuego{Accion: "clasificar", Bola: b.ID, Contenedor: respuesta(j, b, false)}, now)
	if err != nil || res.OK || res.Correcto == "" || ana.Puntos != 2 || b.Estado != "libre" {
		t.Fatalf("fallo: %+v %v puntos=%d estado=%s", res, err, ana.Puntos, b.Estado)
	}
	if _, err := j.jugar(ana, jugadaJuego{Accion: "clasificar", Bola: b.ID, Contenedor: "zzz"}, now); err == nil {
		t.Errorf("clasificar una bola libre no vale")
	}
	j.jugar(ana, jugadaJuego{Accion: "atrapar", Bola: b.ID}, now)
	if _, err := j.jugar(ana, jugadaJuego{Accion: "clasificar", Bola: b.ID, Contenedor: "zzz"}, now); err == nil || errors.Is(err, errJuego) {
		t.Errorf("contenedor desconocido debe ser 400: %v", err)
	}
	res, _ = j.jugar(ana, jugadaJuego{Accion: "clasificar", Bola: b.ID, Contenedor: respuesta(j, b, true)}, now)
	if !res.OK || b.Estado != "cargada" || ana.Racha != 1 {
		t.Fatalf("acierto: %+v estado=%s racha=%d", res, b.Estado, ana.Racha)
	}
	// Retenerla de más la devuelve al centro.
	j.avanzar(now.Add(juegoCargada + time.Second))
	if b.Estado != "libre" {
		t.Errorf("cargada vencida: %s", b.Estado)
	}
}

// cargar: atrapa una bola libre y la clasifica bien.
func cargar(t *testing.T, j *juego, p *jugador, now time.Time) *bola {
	t.Helper()
	b := bolaLibre(t, j)
	if _, err := j.jugar(p, jugadaJuego{Accion: "atrapar", Bola: b.ID}, now); err != nil {
		t.Fatal(err)
	}
	if res, err := j.jugar(p, jugadaJuego{Accion: "clasificar", Bola: b.ID, Contenedor: respuesta(j, b, true)}, now); err != nil || !res.OK {
		t.Fatalf("cargar: %+v %v", res, err)
	}
	return b
}

// Atajada a tiempo: +1 al arquero y la bola es suya. Sin atajar hasta el plazo: gol, +2 al que tiró.
// Atajar clasificando mal: gol en el acto.
func TestJuegoGolYAtajada(t *testing.T) {
	now := time.Unix(1000, 0)
	j := nuevoJuego(cfgPrueba(), 2)
	ana, _ := j.unir("sa", "Ana", now)
	beto, _ := j.unir("sb", "Beto", now)
	j.avanzar(now)

	b := cargar(t, j, ana, now)
	if _, err := j.jugar(ana, jugadaJuego{Accion: "tirar", Bola: b.ID, A: ana.ID}, now); err == nil {
		t.Errorf("no se tira a uno mismo")
	}
	if _, err := j.jugar(ana, jugadaJuego{Accion: "tirar", Bola: b.ID, A: beto.ID}, now); err != nil {
		t.Fatal(err)
	}
	if _, err := j.jugar(ana, jugadaJuego{Accion: "atajar", Bola: b.ID, Contenedor: "a"}, now); err == nil {
		t.Errorf("solo ataja el dueño del arco")
	}
	casi := now.Add(juegoVuelo - 100*time.Millisecond)
	j.avanzar(casi)
	res, err := j.jugar(beto, jugadaJuego{Accion: "atajar", Bola: b.ID, Contenedor: respuesta(j, b, true)}, casi)
	if err != nil || !res.OK || beto.Atajadas != 1 || beto.Puntos != juegoAtajada || b.Estado != "cargada" || b.Dueno != "sb" {
		t.Fatalf("atajada: %+v %v %+v %+v", res, err, beto, b)
	}
	if ana.Goles != 0 {
		t.Errorf("atajada no es gol")
	}

	// Beto contraataca y Ana no ataja: al vencer el plazo, gol.
	t1 := casi.Add(time.Second)
	ana.visto, beto.visto = t1, t1
	if _, err := j.jugar(beto, jugadaJuego{Accion: "tirar", Bola: b.ID, A: ana.ID}, t1); err != nil {
		t.Fatal(err)
	}
	j.avanzar(t1.Add(juegoVuelo - time.Millisecond))
	if b.Estado != "vuelo" {
		t.Fatalf("aún vuela: %s", b.Estado)
	}
	j.avanzar(t1.Add(juegoVuelo))
	if beto.Goles != 1 || b.Estado != "libre" {
		t.Fatalf("gol al vencer: goles=%d estado=%s", beto.Goles, b.Estado)
	}
	// Tarde: la bola ya no va a su arco.
	if _, err := j.jugar(ana, jugadaJuego{Accion: "atajar", Bola: b.ID, Contenedor: "a"}, t1.Add(juegoVuelo)); err == nil {
		t.Errorf("atajar después del plazo no vale")
	}

	// Atajar mal: gol en el acto.
	t2 := t1.Add(10 * time.Second)
	ana.visto, beto.visto = t2, t2
	j.avanzar(t2)
	c := cargar(t, j, ana, t2)
	j.jugar(ana, jugadaJuego{Accion: "tirar", Bola: c.ID, A: beto.ID}, t2)
	antes := ana.Puntos
	res, _ = j.jugar(beto, jugadaJuego{Accion: "atajar", Bola: c.ID, Contenedor: respuesta(j, c, false)}, t2)
	if res.OK || ana.Goles != 1 || ana.Puntos != antes+juegoGol || c.Estado != "libre" {
		t.Fatalf("atajada mala: %+v goles=%d puntos=%d", res, ana.Goles, ana.Puntos)
	}
	tiposEv := map[string]int{}
	for _, e := range j.eventos {
		tiposEv[e.Tipo]++
	}
	if tiposEv["gol"] != 2 || tiposEv["atajada"] != 1 {
		t.Errorf("eventos: %v", tiposEv)
	}
}

// No se tira a quien se fue; la ronda vence y bloquea las jugadas; reiniciar pone todo a cero
// sin cambiar colores; la tabla del alumno es el top 5.
func TestJuegoRonda(t *testing.T) {
	now := time.Unix(1000, 0)
	j := nuevoJuego(cfgPrueba(), 3)
	var js []*jugador
	for i := 0; i < 7; i++ {
		p, _ := j.unir(string(rune('a'+i)), "J", now)
		js = append(js, p)
	}
	if js[6].Color != 6 {
		t.Errorf("color por orden de llegada: %d", js[6].Color)
	}
	j.reiniciar(60, now)
	b := cargar(t, j, js[0], now)
	tarde := now.Add(juegoInactivo + time.Second)
	js[0].visto = tarde
	j.avanzar(tarde)
	if _, err := j.jugar(js[0], jugadaJuego{Accion: "tirar", Bola: b.ID, A: js[1].ID}, tarde); err == nil {
		t.Errorf("no se tira a un ausente")
	}
	js[0].Puntos = 9
	v := j.vista("a", false, tarde)
	if len(v.Tabla) != 5 || v.TotalTabla != 7 || v.MiPuesto != 1 || len(v.Jugadores) != 1 {
		t.Errorf("vista alumno: tabla=%d total=%d puesto=%d jugadores=%d", len(v.Tabla), v.TotalTabla, v.MiPuesto, len(v.Jugadores))
	}
	if v := j.vista("x", true, tarde); len(v.Tabla) != 7 {
		t.Errorf("el staff ve la tabla entera: %d", len(v.Tabla))
	}
	fin := now.Add(61 * time.Second)
	j.avanzar(fin)
	if j.estado != "final" {
		t.Fatalf("la ronda debe terminar: %s", j.estado)
	}
	if _, err := j.jugar(js[0], jugadaJuego{Accion: "atrapar", Bola: j.bolas[0].ID}, fin); !errors.Is(err, errJuego) {
		t.Errorf("tras el final no se juega: %v", err)
	}
	j.reiniciar(0, fin) // 0 → duración por defecto
	if j.estado != "jugando" || js[0].Puntos != 0 || js[6].Color != 6 || j.duracion != juegoDuracionDef {
		t.Errorf("reiniciar: estado=%s puntos=%d color=%d dur=%d", j.estado, js[0].Puntos, js[6].Color, j.duracion)
	}
}

// Por HTTP: el alumno se une y juega; reiniciar es solo del staff; sin juego.yaml, 404.
func TestLiveJuegoRutas(t *testing.T) {
	e := newEnvEscenas(t)
	juegoLive.Lock()
	delete(juegoLive.v, "l1/02-dos") // el estado es global del proceso: que -count=N no herede la ronda
	juegoLive.Unlock()
	profe := e.login("profe@x.test", "profe1234")
	e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": "ana@x.test", "name": "Ana María Pérez", "password": "ana-1234", "invite_code": "abc"}, "")
	ana := e.login("ana@x.test", "ana-1234")

	if r := e.call("GET", "/api/v1/live/l1/juego?escena=01-uno", ana, false, nil, ""); r.code != 404 {
		t.Fatalf("sin juego.yaml: %d %s", r.code, r.raw)
	}
	// Un juego.yaml junto a escena.html de 02-dos (cfgPrueba en YAML).
	yml := "contenedores:\n  - {id: a, nombre: A}\n  - {id: b, nombre: B}\nconceptos:\n"
	for i := 0; i < 8; i++ {
		yml += "  - {texto: \"c" + string(rune('0'+i)) + "\", contenedor: " + map[bool]string{true: "a", false: "b"}[i%2 == 0] + "}\n"
	}
	html := e.s.Content.Get().Escena("l1", "02-dos").HTMLPath
	if err := os.WriteFile(filepath.Join(filepath.Dir(html), "juego.yaml"), []byte(yml), 0o644); err != nil {
		t.Fatal(err)
	}
	if r := e.call("GET", "/api/v1/live/l1/escenas/02-dos/juego.yaml", ana, false, nil, ""); r.code != 404 {
		t.Fatalf("la clave de respuestas no se sirve: %d", r.code)
	}
	r := e.call("POST", "/api/v1/live/l1/juego", ana, false, map[string]any{"escena": "02-dos", "accion": "unirse"}, "")
	if r.code != 200 || r.body["yo"] != "j1" {
		t.Fatalf("unirse: %d %s", r.code, r.raw)
	}
	js, _ := r.body["jugadores"].([]any)
	if len(js) != 1 || js[0].(map[string]any)["nombre"] != "Ana M." {
		t.Errorf("nombre corto: %v", js)
	}
	bolas, _ := r.body["bolas"].([]any)
	if len(bolas) < 4 {
		t.Fatalf("bolas: %v", r.body["bolas"])
	}
	if _, filtra := bolas[0].(map[string]any)["contenedor"]; filtra {
		t.Errorf("la respuesta no debe viajar al navegador")
	}
	id := bolas[0].(map[string]any)["id"]
	if r := e.call("POST", "/api/v1/live/l1/juego", ana, false, map[string]any{"escena": "02-dos", "accion": "atrapar", "bola": id}, ""); r.code != 200 {
		t.Errorf("atrapar: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/live/l1/juego", ana, false, map[string]any{"escena": "02-dos", "accion": "atrapar", "bola": id}, ""); r.code != 409 {
		t.Errorf("atrapar dos veces: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/live/l1/juego", ana, false, map[string]any{"escena": "02-dos", "accion": "reiniciar"}, ""); r.code != 403 {
		t.Errorf("el alumno no reinicia: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l1/juego", ana, false, map[string]any{"escena": "02-dos", "accion": "hackear"}, ""); r.code != 400 {
		t.Errorf("acción inválida: %d", r.code)
	}
	r = e.call("POST", "/api/v1/live/l1/juego", profe, false, map[string]any{"escena": "02-dos", "accion": "reiniciar", "duracion_s": 120}, "")
	if r.code != 200 || r.body["estado"] != "jugando" || r.body["staff"] != true || r.body["duracion_s"] != float64(120) {
		t.Fatalf("reiniciar: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/live/l1/juego?escena=02-dos", ana, false, nil, "")
	if r.code != 200 || r.body["estado"] != "jugando" || r.body["staff"] != false {
		t.Errorf("leer: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/live/l1/juego", profe, false, map[string]any{"escena": "02-dos", "accion": "terminar"}, ""); r.body["estado"] != "final" {
		t.Errorf("terminar: %s", r.raw)
	}
}

// La clave real de g5-02 es válida: 4 contenedores y 24 conceptos, 6 por contenedor.
func TestJuegoContenidoReal(t *testing.T) {
	_, file, _, _ := runtime.Caller(0)
	ruta := filepath.Join(filepath.Dir(file), "..", "..", "..", "content", "courses", "programacion-agentica-g5", "live", "g5-02", "11b-juego-conceptos", "juego.yaml")
	cfg, err := leerConfigJuego(ruta)
	if err != nil {
		t.Fatal(err)
	}
	por := map[string]int{}
	for _, c := range cfg.Conceptos {
		por[c.Contenedor]++
	}
	if len(cfg.Contenedores) != 4 || len(cfg.Conceptos) != 24 {
		t.Fatalf("%d contenedores, %d conceptos", len(cfg.Contenedores), len(cfg.Conceptos))
	}
	for _, k := range cfg.Contenedores {
		if por[k.ID] != 6 {
			t.Errorf("%s tiene %d conceptos", k.ID, por[k.ID])
		}
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(ruta), "escena.html")); err != nil {
		t.Error(err)
	}
}
