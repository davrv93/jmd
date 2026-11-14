package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// Dos alumnos de la sala de clase se sientan en la misma mesa con un robot de la máquina, el mando mueve su
// robot, se juegan las 3 rondas y cada uno queda con su partida en el ranking de la clase.
func TestMesaEnVivo(t *testing.T) {
	segundosRonda, cuentaMesa, pausaRondas, esperaDos = 2, 300*time.Millisecond, 300*time.Millisecond, 500*time.Millisecond
	pub, _, _, _ := nuevoServidor(t)
	cla, _, _, _ := nuevoServidor(t)
	cla.clase, cla.ahora = true, time.Now
	cla.e = Estado{Config: configClase()}
	srv := httptest.NewServer(rutasConClase(pub, cla))
	defer func() { srv.CloseClientConnections(); srv.Close() }()
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
	ana := post("/clase/api/inscribir", map[string]any{"nombre": "Ana Pérez", "cuenta": "u1"})["t"].(string)
	beto := post("/clase/api/inscribir", map[string]any{"nombre": "Beto Ruiz", "cuenta": "u2"})["t"].(string)
	m1 := post("/clase/api/mesa/unirse", map[string]any{"t": ana})
	m2 := post("/clase/api/mesa/unirse", map[string]any{"t": beto})
	if m1["mesa"] != m2["mesa"] || m1["asiento"].(float64) != 0 || m2["asiento"].(float64) != 1 {
		t.Fatalf("misma mesa: %v %v", m1, m2)
	}
	mesaID := m1["mesa"].(string)
	// El público no tiene mesas.
	if r, _ := http.Post(srv.URL+"/api/mesa/unirse", "application/json", strings.NewReader(`{"t":"x"}`)); r.StatusCode != 404 {
		t.Fatalf("mesa en el público: %d", r.StatusCode)
	}
	fotos := func(tok string) <-chan map[string]any {
		ch := make(chan map[string]any, 256)
		r, err := http.Get(srv.URL + "/clase/api/mesa/fotos?t=" + tok + "&mesa=" + mesaID)
		if err != nil || r.StatusCode != 200 {
			t.Fatalf("fotos: %v %v", err, r)
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
	fa, fb := fotos(ana), fotos(beto)
	go func() {
		for range fb {
		}
	}()
	esperar := func(cond func(map[string]any) bool, que string) map[string]any {
		limite := time.After(15 * time.Second)
		for {
			select {
			case f, ok := <-fa:
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
	f := esperar(func(f map[string]any) bool { return f["estado"] == "jugando" && f["m"] != nil }, "jugando")
	robots := f["m"].(map[string]any)["robots"].([]any)
	tipo := func(i int) string {
		r := robots[i].(map[string]any)
		switch {
		case r["ausente"] == true:
			return "vacío"
		case r["cpu"] == true:
			return "máquina"
		}
		return "alumno"
	}
	if tipo(0) != "alumno" || tipo(1) != "alumno" || tipo(2) != "máquina" || tipo(3) != "vacío" {
		t.Fatalf("asientos: %s %s %s %s", tipo(0), tipo(1), tipo(2), tipo(3))
	}
	c0 := robots[0].(map[string]any)["c"].(float64)
	post("/clase/api/mesa/mando", map[string]any{"t": ana, "mesa": mesaID, "dir": "derecha"})
	esperar(func(f map[string]any) bool {
		m, _ := f["m"].(map[string]any)
		return m != nil && m["robots"].([]any)[0].(map[string]any)["c"].(float64) > c0
	}, "que el robot de Ana se mueva a la derecha")
	f = esperar(func(f map[string]any) bool { return f["estado"] == "fin" && f["final"] != nil }, "el final")
	if fin := f["final"].([]any); len(fin) != 2 || fin[0].(map[string]any)["puntos"] == nil {
		t.Fatalf("final: %v", fin)
	}
	cla.mu.Lock()
	en := len(cla.ranking())
	cla.mu.Unlock()
	if en != 2 {
		t.Fatalf("ranking de la clase: %d", en)
	}
}
