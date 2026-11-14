package main

import (
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"
)

func nuevaClasePrueba(t *testing.T) (*Servidor, *httptest.Server, *time.Time) {
	t.Helper()
	reloj := time.Now()
	ahora := func() time.Time { return reloj }
	sinAzar := func(n int) int { return 0 }
	s := &Servidor{
		archivo: filepath.Join(t.TempDir(), "estado.json"), clave: "clave-de-prueba-1234",
		porIP: map[string]int{}, activas: map[int]corrida{}, ahora: ahora, azar: sinAzar,
		clase: nuevaClase(ahora, sinAzar),
	}
	s.e = Estado{Config: configInicial()}
	ts := httptest.NewServer(s.rutas())
	t.Cleanup(ts.Close)
	return s, ts, &reloj
}

func unirseClase(t *testing.T, ts *httptest.Server, nombre string) string {
	t.Helper()
	code, out := pedir(t, ts, "POST", "/clase/api/unirse", map[string]any{"nombre": nombre})
	if code != 200 {
		t.Fatalf("unirse %s: %d %v", nombre, code, out)
	}
	return out["t"].(string)
}

// Las mesas se reparten parejas: nunca una mesa de 1 si se puede evitar; la cpu completa los carriles.
func TestClaseMesasParejas(t *testing.T) {
	casos := map[int][]int{1: {1}, 2: {2}, 3: {3}, 4: {2, 2}, 5: {3, 2}, 7: {3, 2, 2}, 10: {3, 3, 2, 2}}
	for n, quiero := range casos {
		reloj := time.Now()
		c := nuevaClase(func() time.Time { return reloj }, func(int) int { return 0 })
		for i := 0; i < n; i++ {
			c.unirse("Alumno "+string(rune('A'+i)), "")
		}
		c.mu.Lock()
		if !c.empezarLocked(reloj) {
			t.Fatalf("%d alumnos: no empezó", n)
		}
		if len(c.mesas) != len(quiero) {
			t.Fatalf("%d alumnos: %d mesas, quería %d", n, len(c.mesas), len(quiero))
		}
		for i, m := range c.mesas {
			hum := 0
			for _, s := range m.Asientos {
				if s.Alumno != "" {
					hum++
				}
			}
			if hum != quiero[i] || len(m.Asientos) != 3 {
				t.Fatalf("%d alumnos, mesa %d: %d alumnos y %d carriles; quería %d y 3", n, i+1, hum, len(m.Asientos), quiero[i])
			}
		}
		c.mu.Unlock()
	}
}

// Una ronda completa por HTTP: dos alumnos, salida común, latidos que llegan al rival, fin y ranking.
func TestClaseRondaCompleta(t *testing.T) {
	s, ts, reloj := nuevaClasePrueba(t)
	ana := unirseClase(t, ts, "Ana")
	beto := unirseClase(t, ts, "Beto")
	if code, _ := pedir(t, ts, "POST", "/clase/api/unirse", map[string]any{"nombre": "ana"}); code != 200 {
		t.Fatalf("el segundo «ana» debe entrar como «ana 2»")
	}
	if code, out := pedir(t, ts, "POST", "/clase/api/empezar", map[string]any{}); code != 200 || out["fase"] != "cuenta" {
		t.Fatalf("empezar: %d %v", code, out)
	}
	if code, _ := pedir(t, ts, "POST", "/clase/api/empezar", map[string]any{}); code != 409 {
		t.Fatalf("no debe empezar dos rondas a la vez")
	}
	*reloj = reloj.Add(claseCuenta + time.Second)
	s.clase.avanzar()
	_, v := pedir(t, ts, "POST", "/clase/api/latido", map[string]any{"t": ana, "est": map[string]any{"dx": 120, "y": -50, "estado": "SALTO", "vidas": 3, "puntos": 140}})
	if v["fase"] != "corre" {
		t.Fatalf("fase: %v", v["fase"])
	}
	_, vb := pedir(t, ts, "POST", "/clase/api/latido", map[string]any{"t": beto})
	mesa := vb["mesa"].(map[string]any)
	var vioAna bool
	for _, r := range mesa["rivales"].([]any) {
		m := r.(map[string]any)
		if m["nombre"] == "Ana" && m["puntos"].(float64) == 140 && m["estado"] == "SALTO" {
			vioAna = true
		}
	}
	if !vioAna {
		t.Fatalf("Beto no ve el estado de Ana: %v", mesa)
	}
	pedir(t, ts, "POST", "/clase/api/fin", map[string]any{"t": ana, "puntos": 900, "vidas": 0})
	pedir(t, ts, "POST", "/clase/api/fin", map[string]any{"t": beto, "puntos": 400, "vidas": 0})
	// «ana 2» se unió pero no latió durante la carrera: a los 8 s su carril se da por terminado.
	*reloj = reloj.Add(claseAusente + time.Second)
	s.clase.avanzar()
	_, sala := pedir(t, ts, "GET", "/clase/api/sala", nil)
	if sala["fase"] != "resultados" {
		t.Fatalf("la ronda debía cerrar: %v", sala["fase"])
	}
	rk := sala["ranking"].([]any)
	if len(rk) == 0 || rk[0].(map[string]any)["nombre"] != "Ana" || rk[0].(map[string]any)["ganadas"].(float64) != 1 {
		t.Fatalf("ranking: %v", rk)
	}
	if sala["auto"].(float64) == 0 {
		t.Fatalf("la siguiente ronda debe quedar programada")
	}
}

// El público no cambia: sin clase, /clase/ no existe.
func TestClaseNoAfectaAlPublico(t *testing.T) {
	_, ts, _ := nuevoPrueba(t)
	if code, _ := pedir(t, ts, "GET", "/clase/api/sala", nil); code != 404 {
		t.Fatalf("sin modo clase no debe haber /clase: %d", code)
	}
}
