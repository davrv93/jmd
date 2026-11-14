package main

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type mesaPrueba struct {
	t    *testing.T
	srv  *httptest.Server
	cla  *Servidor
	post func(ruta string, cuerpo any) map[string]any
}

func armarMesa(t *testing.T) *mesaPrueba {
	t.Helper()
	pub, _, _, _ := nuevoServidor(t)
	cla, _, _, _ := nuevoServidor(t)
	cla.clase, cla.ahora = true, time.Now
	cla.e = Estado{Config: configClase()}
	srv := httptest.NewServer(rutasConClase(pub, cla))
	t.Cleanup(func() { srv.CloseClientConnections(); srv.Close() })
	post := func(ruta string, cuerpo any) map[string]any {
		b, _ := json.Marshal(cuerpo)
		r, err := http.Post(srv.URL+ruta, "application/json", bytes.NewReader(b))
		if err != nil {
			t.Fatal(err)
		}
		defer r.Body.Close()
		var out map[string]any
		_ = json.NewDecoder(r.Body).Decode(&out)
		if r.StatusCode >= 300 {
			t.Fatalf("%s: %d %v", ruta, r.StatusCode, out)
		}
		return out
	}
	return &mesaPrueba{t: t, srv: srv, cla: cla, post: post}
}

func (p *mesaPrueba) alumno(nombre, cuenta string) string {
	return p.post("/clase/api/inscribir", map[string]any{"nombre": nombre, "cuenta": cuenta})["t"].(string)
}

func (p *mesaPrueba) fotos(tok, mesaID string) <-chan map[string]any {
	ch := make(chan map[string]any, 256)
	r, err := http.Get(p.srv.URL + "/clase/api/mesa/fotos?t=" + tok + "&mesa=" + mesaID)
	if err != nil || r.StatusCode != 200 {
		p.t.Fatalf("fotos: %v %v", err, r)
	}
	go func() {
		defer r.Body.Close()
		sc := bufio.NewScanner(r.Body)
		sc.Buffer(make([]byte, 1<<20), 1<<20)
		for sc.Scan() {
			if l := sc.Text(); strings.HasPrefix(l, "data: {\"") && strings.Contains(l, "\"estado\"") {
				var f map[string]any
				if json.Unmarshal([]byte(l[6:]), &f) == nil {
					select {
					case ch <- f:
					default:
					}
				}
			}
		}
		close(ch)
	}()
	return ch
}

func esperarFoto(t *testing.T, ch <-chan map[string]any, cond func(map[string]any) bool, que string) map[string]any {
	t.Helper()
	limite := time.After(20 * time.Second)
	for {
		select {
		case f, ok := <-ch:
			if !ok {
				t.Fatalf("se cerró el stream esperando %s", que)
			}
			if cond(f) {
				return f
			}
		case <-limite:
			t.Fatalf("no llegó: %s", que)
		}
	}
}

func robotsDe(f map[string]any) []any { return f["m"].(map[string]any)["robots"].([]any) }

func tipoRobot(robots []any, i int) string {
	r := robots[i].(map[string]any)
	switch {
	case r["ausente"] == true:
		return "vacío"
	case r["cpu"] == true:
		return "máquina"
	}
	return "alumno"
}

// Dos alumnos de la sala de clase se sientan en la misma mesa con un robot de la máquina (asiento
// humanosMesa), el mando mueve su robot, se juegan las 3 rondas y cada uno queda con su partida en el ranking.
func TestMesaEnVivo(t *testing.T) {
	segundosRonda, cuentaMesa, pausaRondas, esperaDos = 2, 300*time.Millisecond, 300*time.Millisecond, 500*time.Millisecond
	p := armarMesa(t)
	ana, beto := p.alumno("Ana Pérez", "u1"), p.alumno("Beto Ruiz", "u2")
	m1 := p.post("/clase/api/mesa/unirse", map[string]any{"t": ana})
	m2 := p.post("/clase/api/mesa/unirse", map[string]any{"t": beto})
	if m1["mesa"] != m2["mesa"] || m1["asiento"].(float64) != 0 || m2["asiento"].(float64) != 1 {
		t.Fatalf("misma mesa: %v %v", m1, m2)
	}
	mesaID := m1["mesa"].(string)
	if r, _ := http.Post(p.srv.URL+"/api/mesa/unirse", "application/json", strings.NewReader(`{"t":"x"}`)); r.StatusCode != 404 {
		t.Fatalf("mesa en el público: %d", r.StatusCode)
	}
	fa, fb := p.fotos(ana, mesaID), p.fotos(beto, mesaID)
	go func() {
		for range fb {
		}
	}()
	f := esperarFoto(t, fa, func(f map[string]any) bool { return f["estado"] == "jugando" && f["m"] != nil }, "jugando")
	robots := robotsDe(f)
	if len(robots) != humanosMesa+1 || tipoRobot(robots, 0) != "alumno" || tipoRobot(robots, 1) != "alumno" || tipoRobot(robots, 2) != "vacío" || tipoRobot(robots, humanosMesa) != "máquina" {
		t.Fatalf("asientos: %d robots, %s %s %s %s", len(robots), tipoRobot(robots, 0), tipoRobot(robots, 1), tipoRobot(robots, 2), tipoRobot(robots, humanosMesa))
	}
	if n := f["m"].(map[string]any)["n"].(float64); n != 9 {
		t.Fatalf("con 3 robots el tablero es de 9: %v", n)
	}
	cas, _ := base64.StdEncoding.DecodeString(f["m"].(map[string]any)["cas"].(string))
	if len(cas) != 81 {
		t.Fatalf("cas: %d bytes", len(cas))
	}
	c0 := robots[0].(map[string]any)["c"].(float64)
	p.post("/clase/api/mesa/mando", map[string]any{"t": ana, "mesa": mesaID, "dir": "derecha"})
	esperarFoto(t, fa, func(f map[string]any) bool {
		m, _ := f["m"].(map[string]any)
		return m != nil && m["robots"].([]any)[0].(map[string]any)["c"].(float64) > c0
	}, "que el robot de Ana se mueva a la derecha")
	f = esperarFoto(t, fa, func(f map[string]any) bool { return f["estado"] == "fin" && f["final"] != nil }, "el final")
	if fin := f["final"].([]any); len(fin) != 2 || fin[0].(map[string]any)["puntos"] == nil {
		t.Fatalf("final: %v", fin)
	}
	p.cla.mu.Lock()
	en := len(p.cla.ranking())
	p.cla.mu.Unlock()
	if en != 2 {
		t.Fatalf("ranking de la clase: %d", en)
	}
}

// Toda la clase en una mesa: 16 alumnos caben, el 17.º abre otra; con 3 sentados «Empezar» arranca sin esperar;
// el tablero es de 17 × 17, sin robot de la máquina, con los 16 repartidos por el borde y sin dos en la misma casilla.
func TestMesaDeDieciseis(t *testing.T) {
	segundosRonda, cuentaMesa, pausaRondas, esperaTres = 3, 200*time.Millisecond, 200*time.Millisecond, time.Hour
	p := armarMesa(t)
	var toks []string
	var mesaID string
	for i := 0; i < 17; i++ {
		tok := p.alumno(fmt.Sprintf("Alumno %02d Apellido", i), fmt.Sprintf("c%d", i))
		toks = append(toks, tok)
		r := p.post("/clase/api/mesa/unirse", map[string]any{"t": tok})
		switch {
		case i == 0:
			mesaID = r["mesa"].(string)
		case i < 16 && r["mesa"] != mesaID:
			t.Fatalf("el alumno %d no cayó en la mesa de la clase: %v", i, r)
		case i == 16 && r["mesa"] == mesaID:
			t.Fatalf("el 17.º debía abrir otra mesa: %v", r)
		}
		if i == 2 {
			// Con 3 sentados ya se puede empezar, pero esperamos a los demás: esperaTres es una hora.
			if code, _ := pedirCrudo(t, p.cla.rutas(), "POST", "/api/mesa/empezar", map[string]any{"t": tok, "mesa": "x"}, false); code != 404 {
				t.Fatalf("empezar en mesa inexistente: %d", code)
			}
		}
	}
	if code, out := pedir(t, rutasConClase(p.cla, p.cla), "POST", "/clase/api/mesa/empezar", map[string]any{"t": toks[5], "mesa": mesaID}, false); code != 200 || out["estado"] != "cuenta" {
		t.Fatalf("empezar: %d %v", code, out)
	}
	fa := p.fotos(toks[0], mesaID)
	f := esperarFoto(t, fa, func(f map[string]any) bool { return f["estado"] == "jugando" && f["m"] != nil }, "jugando")
	m := f["m"].(map[string]any)
	if m["n"].(float64) != 17 {
		t.Fatalf("lado: %v", m["n"])
	}
	robots := robotsDe(f)
	vistos := map[string]bool{}
	for i := 0; i < 16; i++ {
		if tipoRobot(robots, i) != "alumno" {
			t.Fatalf("robot %d: %s", i, tipoRobot(robots, i))
		}
		r := robots[i].(map[string]any)
		c, fl := int(r["c"].(float64)), int(r["f"].(float64))
		if c != 0 && c != 16 && fl != 0 && fl != 16 {
			t.Fatalf("robot %d no sale del borde: %d,%d", i, c, fl)
		}
		k := fmt.Sprint(c, fl)
		if vistos[k] {
			t.Fatalf("dos robots en %s", k)
		}
		vistos[k] = true
	}
	if tipoRobot(robots, 16) != "vacío" {
		t.Fatalf("con 16 alumnos no juega la máquina: %s", tipoRobot(robots, 16))
	}
	if b, _ := json.Marshal(f); len(b) > 7000 {
		t.Fatalf("foto de %d bytes (se esperaban ≤ 7000)", len(b))
	} else {
		t.Logf("foto de 17 × 17 con 16 robots: %d bytes", len(b))
	}
	f = esperarFoto(t, fa, func(f map[string]any) bool { return f["estado"] == "fin" && f["final"] != nil }, "el final")
	if fin := f["final"].([]any); len(fin) != 16 {
		t.Fatalf("final con %d filas", len(fin))
	}
}

// Quien llega con la ronda en curso entra en la siguiente: su robot está ausente ahora y juega después; con 5
// alumnos el tablero es de 13 y no hay máquina.
func TestMesaLlegaTarde(t *testing.T) {
	segundosRonda, cuentaMesa, pausaRondas, esperaTres = 3, 200*time.Millisecond, 300*time.Millisecond, 200*time.Millisecond
	p := armarMesa(t)
	var toks []string
	var mesaID string
	for i := 0; i < 4; i++ {
		tok := p.alumno(fmt.Sprintf("Temprano %d", i), fmt.Sprintf("t%d", i))
		toks = append(toks, tok)
		r := p.post("/clase/api/mesa/unirse", map[string]any{"t": tok})
		if i == 0 {
			mesaID = r["mesa"].(string)
		}
	}
	fa := p.fotos(toks[0], mesaID)
	f := esperarFoto(t, fa, func(f map[string]any) bool { return f["estado"] == "jugando" && f["m"] != nil }, "jugando")
	if n := f["m"].(map[string]any)["n"].(float64); n != 9 {
		t.Fatalf("con 4 alumnos el tablero es de 9: %v", n)
	}
	tarde := p.alumno("Tarde Llego", "t9")
	r := p.post("/clase/api/mesa/unirse", map[string]any{"t": tarde})
	if r["mesa"] != mesaID || r["asiento"].(float64) != 4 || r["entra"].(float64) != 2 {
		t.Fatalf("tarde: %v", r)
	}
	f = esperarFoto(t, fa, func(f map[string]any) bool { return f["estado"] == "jugando" && f["m"] != nil }, "foto con el tardío sentado")
	if tipoRobot(robotsDe(f), 4) != "vacío" {
		t.Fatalf("el tardío debía estar ausente en la ronda 1: %s", tipoRobot(robotsDe(f), 4))
	}
	f = esperarFoto(t, fa, func(f map[string]any) bool {
		return f["estado"] == "jugando" && f["ronda"].(float64) == 2 && f["m"] != nil
	}, "ronda 2")
	if tipoRobot(robotsDe(f), 4) != "alumno" || f["m"].(map[string]any)["n"].(float64) != 13 || tipoRobot(robotsDe(f), humanosMesa) != "vacío" {
		t.Fatalf("ronda 2: tardío %s, lado %v, máquina %s", tipoRobot(robotsDe(f), 4), f["m"].(map[string]any)["n"], tipoRobot(robotsDe(f), humanosMesa))
	}
	if sal := salidas(13, 5); len(sal) != 5 || sal[0] != [2]int{0, 0} {
		t.Fatalf("salidas: %v", sal)
	}
}
