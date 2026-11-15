package httpapi

import (
	"fmt"
	"testing"
	"time"
)

func kartsSalaPrueba(t *testing.T) *salaKarts {
	t.Helper()
	salasKarts.Lock()
	defer salasKarts.Unlock()
	return salasKarts.m["l1"]
}

// kartsMover deja la sala corriendo desde hace d (para que el tope de ritmo permita avanzar).
func kartsMover(t *testing.T, d time.Duration) {
	t.Helper()
	sk := kartsSalaPrueba(t)
	sk.mu.Lock()
	defer sk.mu.Unlock()
	sk.Estado = "corre"
	sk.Salida = time.Now().Add(-d)
	for _, p := range sk.Pil {
		p.PT = time.Time{}
	}
}

func kartsYo(r resp) map[string]any {
	yo, _ := r.body["yo"].(map[string]any)
	return yo
}

func TestLiveKarts(t *testing.T) {
	e := newEnv(t)
	profe := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	luis := e.register("luis@x.test")
	salasKarts.Lock()
	salasKarts.m = map[string]*salaKarts{}
	salasKarts.Unlock()
	tick := func(tok string, cuerpo map[string]any) resp {
		t.Helper()
		if _, ok := cuerpo["cli"]; !ok {
			cuerpo["cli"] = "pestana-" + tok[len(tok)-6:]
		}
		if _, ok := cuerpo["ev"]; !ok {
			cuerpo["ev"] = 0
		}
		r := e.call("POST", "/api/v1/live/l1/karts/tick", tok, false, cuerpo, "")
		if r.code != 200 {
			t.Fatalf("tick: %d %s", r.code, r.raw)
		}
		return r
	}

	// vestíbulo: dos alumnos y el instructor se unen; los colores no se repiten
	for _, tok := range []string{ana, luis, profe} {
		if r := e.call("POST", "/api/v1/live/l1/karts/unir", tok, false, map[string]any{"color": 2}, ""); r.code != 200 {
			t.Fatalf("unir: %d %s", r.code, r.raw)
		}
	}
	r := e.call("GET", "/api/v1/live/l1/karts", ana, false, nil, "")
	pilotos, _ := r.body["pilotos"].([]any)
	if r.code != 200 || r.body["estado"] != "lobby" || len(pilotos) != 3 || r.body["max"] != float64(20) {
		t.Fatalf("vestíbulo: %d %v", r.code, r.body)
	}
	colores := map[float64]bool{}
	for _, x := range pilotos {
		colores[x.(map[string]any)["color"].(float64)] = true
	}
	if len(colores) != 3 || !colores[2] {
		t.Fatalf("colores repetidos o sin el pedido: %v", colores)
	}
	if r.body["staff"] != false {
		t.Fatalf("staff de alumno: %v", r.body["staff"])
	}
	idAna := r.body["yo"].(string)
	idLuis := e.call("GET", "/api/v1/live/l1/karts", luis, false, nil, "").body["yo"].(string)
	idProfe := e.call("GET", "/api/v1/live/l1/karts", profe, false, nil, "").body["yo"].(string)

	// el instructor corre como cualquiera, pero sale de la sala para probar el resto con dos
	if r := e.call("POST", "/api/v1/live/l1/karts/salir", profe, false, map[string]any{}, ""); r.code != 200 || r.body["pilotos"] != float64(2) {
		t.Fatalf("salir: %d %s", r.code, r.raw)
	}

	// solo el staff da la salida
	if r := e.call("POST", "/api/v1/live/l1/karts/iniciar", ana, false, map[string]any{}, ""); r.code != 403 {
		t.Fatalf("alumno inicia: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l1/karts/iniciar", profe, false, map[string]any{}, ""); r.code != 200 {
		t.Fatalf("iniciar: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/live/l1/karts", ana, false, nil, "")
	if r.body["estado"] != "cuenta" || r.body["salida_ms"].(float64) <= r.body["ahora_ms"].(float64) {
		t.Fatalf("cuenta atrás: %v", r.body)
	}
	// en la cuenta nadie avanza y nadie nuevo entra
	if y := kartsYo(tick(ana, map[string]any{"x": 10, "z": 5, "a": 1, "v": 50, "p": 0.5})); y["p"] != float64(0) {
		t.Fatalf("avanzó en la cuenta: %v", y)
	}
	if r := e.call("POST", "/api/v1/live/l1/karts/unir", profe, false, map[string]any{}, ""); r.code != 409 || errCode(r) != "carrera_empezada" {
		t.Fatalf("unir tarde: %d %s", r.code, r.raw)
	}

	// a 30 s de la salida nadie puede llevar más de 30/16 + holgura vueltas: el servidor recorta
	kartsMover(t, 30*time.Second)
	y := kartsYo(tick(ana, map[string]any{"x": 10, "z": 5, "a": 1, "v": 500, "p": 2.9}))
	if p := y["p"].(float64); p > 30.0/16+kartsHolgura+0.01 || p < 1.8 {
		t.Fatalf("tope de ritmo: %v", p)
	}
	r = tick(luis, map[string]any{"x": 0, "z": 0, "a": 0, "v": 30, "p": 0.6})
	orden := r.body["orden"].([]any)
	nAna := kartsSalaPrueba(t).Pil[idAna].N
	nLuis := kartsSalaPrueba(t).Pil[idLuis].N
	if int(orden[0].(float64)) != nAna || kartsYo(r)["puesto"] != float64(2) {
		t.Fatalf("orden: %v yo=%v", orden, kartsYo(r))
	}
	for _, k := range r.body["k"].([]any) {
		f := k.([]any)
		if int(f[0].(float64)) == nAna && f[4].(float64) != kartsVMax {
			t.Fatalf("velocidad sin recortar: %v", f)
		}
	}
	if _, ok := r.body["r"]; ok {
		// la lista llegó porque luis mandó rv=0; con la versión al día ya no viaja
		rv := r.body["rv"]
		if r2 := tick(luis, map[string]any{"x": 0, "z": 0, "a": 0, "v": 30, "p": 0.6, "rv": rv}); r2.body["r"] != nil {
			t.Fatalf("la lista viaja aunque no cambió")
		}
	} else {
		t.Fatalf("sin lista de pilotos: %v", r.body)
	}

	// otra pestaña de ana no mueve el kart si no toma el control
	if y := kartsYo(tick(ana, map[string]any{"x": 999, "z": 999, "a": 0, "v": 1, "p": 0.1, "cli": "otra"})); y["dueno"] != false || y["x"] == float64(999) {
		t.Fatalf("pestaña ajena manejó: %v", y)
	}
	if y := kartsYo(tick(ana, map[string]any{"x": 12, "z": 5, "a": 1, "v": 40, "p": 1.9, "cli": "otra", "own": true})); y["dueno"] != true || y["x"] != float64(12) {
		t.Fatalf("tomar el control: %v", y)
	}
	// si la pestaña dueña calla (se recargó), la nueva toma el control sin tocar una tecla
	sk0 := kartsSalaPrueba(t)
	sk0.mu.Lock()
	sk0.Pil[idAna].CliT = time.Now().Add(-3 * time.Second)
	sk0.mu.Unlock()
	if y := kartsYo(tick(ana, map[string]any{"x": 12, "z": 5, "a": 1, "v": 40, "p": 1.9, "cli": "recargada", "sin": true})); y["dueno"] != true {
		t.Fatalf("la pestaña recargada no tomó el control: %v", y)
	}
	if y := kartsYo(tick(ana, map[string]any{"x": 12, "z": 5, "a": 1, "v": 40, "p": 1.9, "cli": "otra"})); y["dueno"] != false {
		t.Fatalf("la pestaña vieja sigue mandando: %v", y)
	}
	tick(ana, map[string]any{"x": 12, "z": 5, "a": 1, "v": 40, "p": 1.9, "cli": "otra", "own": true})

	// una pestaña recién abierta (sin estado) no pisa el avance guardado, y un salto grande hacia atrás no cuenta
	if y := kartsYo(tick(ana, map[string]any{"x": 0, "z": 0, "a": 0, "v": 0, "p": 0, "cli": "otra", "sin": true})); y["p"].(float64) < 1.8 || y["x"] != float64(12) {
		t.Fatalf("tick sin estado pisó el avance: %v", y)
	}
	if y := kartsYo(tick(ana, map[string]any{"x": 12, "z": 5, "a": 1, "v": 40, "p": 0.2, "cli": "otra"})); y["p"].(float64) < 1.8 {
		t.Fatalf("salto hacia atrás aceptado: %v", y)
	}

	// caja: el servidor elige el poder; con uno en la mano no se toma otro
	y = kartsYo(tick(ana, map[string]any{"x": 12, "z": 5, "a": 1, "v": 40, "p": 1.9, "cli": "otra", "caja": 3}))
	if y["poder"] == "" {
		t.Fatalf("la caja no dio poder: %v", y)
	}

	// Subagente: va al líder; si el líder eres tú, al segundo
	sk := kartsSalaPrueba(t)
	sk.mu.Lock()
	sk.Pil[idAna].Poder = pwSubagente
	sk.mu.Unlock()
	r = tick(ana, map[string]any{"x": 12, "z": 5, "a": 1, "v": 40, "p": 1.9, "cli": "otra", "usa": true, "ev": -1})
	if kartsYo(r)["poder"] != "" || kartsYo(r)["activo"] != pwSubagente {
		t.Fatalf("usar subagente: %v", kartsYo(r))
	}
	r = tick(luis, map[string]any{"x": 0, "z": 0, "a": 0, "v": 30, "p": 0.6, "ev": 0})
	var sub map[string]any
	for _, ev := range r.body["ev"].([]any) {
		if m := ev.(map[string]any); m["pw"] == pwSubagente {
			sub = m
		}
	}
	if sub == nil || int(sub["a"].(float64)) != nLuis || sub["ms"].(float64) < 1200 {
		t.Fatalf("evento de subagente: %v", r.body["ev"])
	}
	evn := r.body["evn"].(float64)

	// Lluvia de tokens: tres obstáculos detrás; luis pisa uno y desaparece para todos
	sk.mu.Lock()
	sk.Pil[idAna].Poder = pwTokens
	sk.mu.Unlock()
	r = tick(ana, map[string]any{"x": 100, "z": 0, "a": 0, "v": 40, "p": 1.9, "cli": "otra", "usa": true})
	obs := r.body["ob"].([]any)
	if len(obs) != 3 {
		t.Fatalf("obstáculos: %v", r.body["ob"])
	}
	for _, o := range obs {
		if x := o.([]any)[1].(float64); x >= 100 {
			t.Fatalf("el obstáculo no quedó detrás: %v", o)
		}
	}
	idObs := int(obs[1].([]any)[0].(float64))
	r = tick(luis, map[string]any{"x": 91, "z": 0, "a": 0, "v": 30, "p": 0.6, "toma": idObs, "ev": evn, "ov": 0})
	if got := r.body["ob"].([]any); len(got) != 2 {
		t.Fatalf("obstáculo pisado sigue: %v", got)
	}
	choque := false
	for _, ev := range r.body["ev"].([]any) {
		m := ev.(map[string]any)
		if m["tp"] == "choque" && int(m["a"].(float64)) == nLuis && int(m["de"].(float64)) == nAna {
			choque = true
		}
	}
	if !choque {
		t.Fatalf("sin evento de choque: %v", r.body["ev"])
	}
	evn = r.body["evn"].(float64)

	// Opus: golpea solo con el poder activo y de cerca
	r = tick(ana, map[string]any{"x": 95, "z": 0, "a": 0, "v": 40, "p": 1.9, "cli": "otra", "golpe": nLuis})
	sk.mu.Lock()
	sk.Pil[idAna].Activo, sk.Pil[idAna].Hasta = pwOpus, time.Now().Add(3*time.Second)
	sk.mu.Unlock()
	tick(ana, map[string]any{"x": 300, "z": 0, "a": 0, "v": 40, "p": 1.9, "cli": "otra", "golpe": nLuis}) // lejos
	tick(ana, map[string]any{"x": 95, "z": 0, "a": 0, "v": 40, "p": 1.9, "cli": "otra", "golpe": nLuis})  // cerca
	r = tick(luis, map[string]any{"x": 91, "z": 0, "a": 0, "v": 30, "p": 0.6, "ev": evn})
	golpes := 0
	for _, ev := range r.body["ev"].([]any) {
		if m := ev.(map[string]any); m["tp"] == "golpe" && int(m["a"].(float64)) == nLuis {
			golpes++
		}
	}
	if golpes != 1 {
		t.Fatalf("golpes de opus: %d %v", golpes, r.body["ev"])
	}
	for _, k := range r.body["k"].([]any) {
		f := k.([]any)
		if int(f[0].(float64)) == nAna && int(f[6].(float64))&15 != kartsCodigo(pwOpus) {
			t.Fatalf("el kart de ana no muestra Opus: %v", f)
		}
	}

	// llegada: tiempo del servidor, evento de meta; cuando llegan todos, la carrera cierra sola
	kartsMover(t, 3*time.Minute)
	y = kartsYo(tick(ana, map[string]any{"x": 1, "z": 1, "a": 0, "v": 40, "p": 3.0, "cli": "otra"}))
	if y["fin_ms"].(float64) < 170000 || y["puesto"] != float64(1) {
		t.Fatalf("llegada de ana: %v", y)
	}
	if r := e.call("GET", "/api/v1/live/l1/karts", luis, false, nil, ""); r.body["estado"] != "corre" || r.body["cierre_ms"].(float64) <= 0 {
		t.Fatalf("tras el primero: %v", r.body)
	}
	tick(luis, map[string]any{"x": 1, "z": 1, "a": 0, "v": 40, "p": 3.0})
	r = e.call("GET", "/api/v1/live/l1/karts", luis, false, nil, "")
	pod := r.body["pilotos"].([]any)
	if r.body["estado"] != "fin" || pod[0].(map[string]any)["id"] != idAna || pod[1].(map[string]any)["puesto"] != float64(2) {
		t.Fatalf("podio: %v", r.body)
	}

	// reiniciar: vestíbulo con los mismos pilotos, en cero
	if r := e.call("POST", "/api/v1/live/l1/karts/reiniciar", ana, false, map[string]any{}, ""); r.code != 403 {
		t.Fatalf("alumno reinicia: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l1/karts/reiniciar", profe, false, map[string]any{}, ""); r.code != 200 {
		t.Fatalf("reiniciar: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/live/l1/karts", ana, false, nil, "")
	if r.body["estado"] != "lobby" || len(r.body["pilotos"].([]any)) != 2 || r.body["pilotos"].([]any)[0].(map[string]any)["fin_ms"] != float64(0) {
		t.Fatalf("tras reiniciar: %v", r.body)
	}

	// en el vestíbulo, quien cerró la pestaña sale solo de la sala
	sk.mu.Lock()
	sk.Pil[idLuis].Visto = time.Now().Add(-time.Minute)
	sk.mu.Unlock()
	if r := e.call("GET", "/api/v1/live/l1/karts", ana, false, nil, ""); len(r.body["pilotos"].([]any)) != 1 {
		t.Fatalf("ausente en el vestíbulo: %v", r.body["pilotos"])
	}

	// sala llena a los 20 (el instructor también cuenta)
	sk.mu.Lock()
	for i := 0; len(sk.Pil) < kartsMax; i++ {
		id := fmt.Sprintf("bot-%d", i)
		sk.Pil[id] = &piloto{N: 100 + i, ID: id, Nombre: id, Visto: time.Now()}
	}
	sk.mu.Unlock()
	if r := e.call("POST", "/api/v1/live/l1/karts/unir", profe, false, map[string]any{}, ""); r.code != 409 || errCode(r) != "sala_llena" {
		t.Fatalf("sala llena: %d %s", r.code, r.raw)
	}
	_ = idProfe

	// tope duro: una carrera abandonada se cierra sola
	sk.mu.Lock()
	sk.Estado, sk.Salida, sk.Fin1 = "corre", time.Now().Add(-kartsLimite-time.Second), time.Time{}
	sk.mu.Unlock()
	if r := e.call("GET", "/api/v1/live/l1/karts", ana, false, nil, ""); r.body["estado"] != "fin" {
		t.Fatalf("tope duro: %v", r.body["estado"])
	}

	// cuota por usuario: una pestaña desbocada recibe 429
	limitado := false
	for i := 0; i < 80 && !limitado; i++ {
		limitado = e.call("GET", "/api/v1/live/l1/karts", luis, false, nil, "").code == 429
	}
	if !limitado {
		t.Fatal("sin límite de peticiones")
	}
}

func TestSortearPoderPorTramo(t *testing.T) {
	r := kartsAzar.r
	cuenta := func(puesto, de int) map[string]int {
		m := map[string]int{}
		for i := 0; i < 3000; i++ {
			m[sortearPoder(puesto, de, r)]++
		}
		return m
	}
	punta, cola := cuenta(1, 20), cuenta(20, 20)
	if punta[pwSubagente] != 0 {
		t.Fatalf("el líder no debe sacar subagente: %v", punta)
	}
	if cola[pwSubagente] == 0 || cola[pwOpus] <= punta[pwOpus] {
		t.Fatalf("la cola debe sacar más ataques: punta=%v cola=%v", punta, cola)
	}
	if solo := cuenta(1, 1); solo[pwNada] != 0 {
		t.Fatalf("nunca sale «ninguno»: %v", solo)
	}
}
