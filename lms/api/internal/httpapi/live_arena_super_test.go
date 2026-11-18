package httpapi

import (
	"encoding/json"
	"os"
	"strconv"
	"testing"
	"time"
)

// El Golpe Ozaru atraviesa el escudo, deja dos fallas, se usa una vez por partida y no gasta ataques.
func TestLiveArenaGolpeOzaru(t *testing.T) {
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

	if libre := yo(post(ana, map[string]any{"accion": "unir", "equipo": "tumba"}, 200))["super_libre"]; libre != true {
		t.Fatalf("super_libre al entrar: %v", libre)
	}
	r := post(luis, map[string]any{"accion": "unir", "equipo": "server"}, 200)
	luisN := int(yo(r)["n"].(float64))
	if yo(r)["super_libre"] != false || r.body["super"] != true {
		t.Fatalf("el defensor no tiene superpoder y la vista anuncia la función: %v %v", yo(r)["super_libre"], r.body["super"])
	}
	esperar(t, "lab de Luis listo", func() bool { return yo(e.call("GET", api, luis, false, nil, ""))["lab"] == "listo" })

	// Solo de noche (turno de ataque), solo el equipo Tumba, solo ataques conocidos y con un blanco válido.
	post(ana, map[string]any{"accion": "super", "objetivo": luisN, "ataque": "base"}, 409)
	post(profe, map[string]any{"accion": "iniciar"}, 200)
	post(luis, map[string]any{"accion": "super", "objetivo": luisN, "ataque": "base"}, 409)
	post(ana, map[string]any{"accion": "super", "objetivo": luisN, "ataque": "rm -rf /"}, 400)
	post(ana, map[string]any{"accion": "super", "objetivo": 999, "ataque": "base"}, 409)
	if yo(e.call("GET", api, ana, false, nil, ""))["super_libre"] != true {
		t.Fatal("un intento fallido no debe gastar el superpoder")
	}

	// Luis cierra conexiones: el ataque normal rebota, el Golpe Ozaru no.
	post(luis, map[string]any{"accion": "escudo"}, 200)
	post(ana, map[string]any{"accion": "atacar", "objetivo": luisN, "ataque": "base"}, 409)
	r = post(ana, map[string]any{"accion": "super", "objetivo": luisN, "ataque": "base"}, 200)
	if yo(r)["super_libre"] != false || yo(r)["ataques"].(float64) != 0 {
		t.Fatalf("tras el golpe: super_libre=%v ataques=%v", yo(r)["super_libre"], yo(r)["ataques"])
	}
	nombreLuis := ""
	for n := range fa.labs {
		nombreLuis = n
	}
	esperar(t, "dos fallas: base borrada y app apagada", func() bool { l := fa.estado(nombreLuis); return !l.base && !l.app })
	post(ana, map[string]any{"accion": "super", "objetivo": luisN, "ataque": "disco"}, 409) // una vez por partida
	hay := false
	for _, x := range r.body["eventos"].([]any) {
		if ev := x.(map[string]any); ev["accion"] == "super" {
			hay = true
		}
	}
	if !hay {
		t.Fatal("falta el evento del Golpe Ozaru")
	}

	// Partida nueva: el superpoder vuelve.
	post(profe, map[string]any{"accion": "reiniciar"}, 200)
	if yo(e.call("GET", api, ana, false, nil, ""))["super_libre"] != true {
		t.Fatal("al reiniciar la arena el superpoder debe volver")
	}
	if arenaSuperSegunda("apagar") != "atascar" || arenaSuperSegunda("clave") != "apagar" {
		t.Fatal("la segunda falla del golpe")
	}
}

// La sala sobrevive a un reinicio: se guarda en disco y se recupera con sus jugadores, equipos y puntos.
func TestArenaSalaEnDisco(t *testing.T) {
	e := newEnv(t)
	e.setAula(&aulaArena{})
	e.s.DataDir = t.TempDir()
	profe := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	luis := e.register("luis@x.test")
	vaciar := func() {
		salasArena.Lock()
		salasArena.m = map[string]*salaArena{}
		salasArena.Unlock()
	}
	vaciar()
	const api = "/api/v1/live/l1/arena"
	yo := func(r resp) map[string]any { m, _ := r.body["yo"].(map[string]any); return m }
	e.call("POST", api, ana, false, map[string]any{"accion": "unir", "equipo": "tumba"}, "")
	e.call("POST", api, luis, false, map[string]any{"accion": "unir", "equipo": "server"}, "")
	esperar(t, "lab de Luis listo", func() bool { return yo(e.call("GET", api, luis, false, nil, ""))["lab"] == "listo" })

	sa := salaArenaCon("l1", e.s.DataDir)
	sa.mu.Lock()
	for _, j := range sa.Jug {
		if j.Equipo == "tumba" {
			j.Puntos, j.SuperUsado = 150, true
		}
	}
	sa.Ronda, sa.Fase, sa.Tumba, sa.Server = 2, "marcador", 300, 100
	foto := sa.instantanea()
	sa.mu.Unlock()
	e.s.guardarArena(sa, foto)
	ruta := arenaRuta(e.s.DataDir, "l1")
	if _, err := os.Stat(ruta); err != nil {
		t.Fatalf("no se guardó la sala: %v", err)
	}

	// «Reinicio»: la memoria se vacía y la sala vuelve del disco con todo.
	vaciar()
	r := e.call("GET", api, ana, false, nil, "")
	if r.code != 200 || len(r.body["jugadores"].([]any)) != 2 || r.body["ronda"].(float64) != 2 || r.body["tumba"].(float64) != 300 {
		t.Fatalf("sala recuperada: %d %s", r.code, r.raw)
	}
	if m := yo(r); m["equipo"] != "tumba" || m["puntos"].(float64) != 150 || m["super_libre"] != false {
		t.Fatalf("ana recuperada: %v", m)
	}
	if m := yo(e.call("GET", api, luis, false, nil, "")); m["equipo"] != "server" || m["lab"] != "listo" {
		t.Fatalf("luis recuperado: %v", m)
	}

	// Un archivo viejo (otra clase) no resucita a nadie; uno con la forma que escribe arena-conservar.py sí.
	var g arenaGuardada
	datos, _ := os.ReadFile(ruta)
	if json.Unmarshal(datos, &g) != nil {
		t.Fatal("el archivo guardado no es JSON")
	}
	g.Guardado = time.Now().Add(-arenaGuardadoVale - time.Minute).UnixMilli()
	viejo, _ := json.Marshal(g)
	os.WriteFile(ruta, viejo, 0o600)
	if cargarArena(e.s.DataDir, "l1", time.Now()) != nil {
		t.Fatal("una sala vieja no debe cargarse")
	}
	semilla := `{"guardado_ms":` + strconv.FormatInt(time.Now().UnixMilli(), 10) + `,"leccion":"l1","fase":"lobby","ronda":0,"hasta":"0001-01-01T00:00:00Z","tumba":0,"server":0,"sig_n":3,
	 "jugadores":[{"ID":"u1","N":1,"Nombre":"Ana","Equipo":"tumba","Staff":false,"Puntos":40},
	              {"ID":"u2","N":2,"Nombre":"Luis","Equipo":"server","Staff":false,"Puntos":0,"Lab":"preparando","Salud":"?"},
	              {"ID":"","N":3,"Nombre":"Sin cuenta","Equipo":"tumba"}]}`
	os.WriteFile(ruta, []byte(semilla), 0o600)
	s2 := cargarArena(e.s.DataDir, "l1", time.Now())
	if s2 == nil || len(s2.Jug) != 2 || s2.Jug["u1"].Puntos != 40 || s2.Jug["u2"].Lab != "error" || s2.sigN != 3 {
		t.Fatalf("semilla: %+v", s2)
	}

	// «Quitar ausentes»: sale quien no se ve hace rato; el profe que lo pide se queda.
	ahora := time.Now()
	s2.Jug["u1"].Visto = ahora.Add(-arenaAusente - time.Second)
	s2.Jug["u2"].Visto = ahora
	if n := s2.quitarAusentes("u2", ahora); n != 1 || s2.Jug["u1"] != nil || s2.Jug["u2"] == nil {
		t.Fatalf("quitar ausentes: %d %v", n, s2.Jug)
	}
	vaciar()
	e.call("POST", api, ana, false, map[string]any{"accion": "unir", "equipo": "tumba"}, "")
	if r := e.call("POST", api, ana, false, map[string]any{"accion": "limpiar"}, ""); r.code != 403 {
		t.Fatalf("un alumno no despeja la arena: %d", r.code)
	}
	if r := e.call("POST", api, profe, false, map[string]any{"accion": "limpiar"}, ""); r.code != 200 {
		t.Fatalf("limpiar: %d %s", r.code, r.raw)
	}
}
