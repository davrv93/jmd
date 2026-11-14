package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func nuevoServidor(t *testing.T, ahora time.Time) (*Servidor, http.Handler) {
	t.Helper()
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba", porIP: map[string]int{}, ahora: func() time.Time { return ahora }}
	s.e = Estado{Edicion: 1, Config: configInicial(ahora), Fase: "inscripcion"}
	return s, s.rutas()
}

var ipSiguiente int

func pedir(t *testing.T, h http.Handler, metodo, ruta string, cuerpo any, admin bool) (int, map[string]any) {
	t.Helper()
	var b []byte
	if cuerpo != nil {
		b, _ = json.Marshal(cuerpo)
	}
	r := httptest.NewRequest(metodo, ruta, bytes.NewReader(b))
	ipSiguiente++
	r.Header.Set("X-Real-IP", fmt.Sprintf("10.0.%d.%d", ipSiguiente/250, ipSiguiente%250))
	if admin {
		r.Header.Set("X-Clave", "clave-de-prueba")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestNoAbreAntesDeHora(t *testing.T) {
	antes := time.Date(2026, 10, 27, 12, 0, 0, 0, lima)
	_, h := nuevoServidor(t, antes)
	code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Ana Pérez", "telefono": "987654321"}, false)
	if code != 409 {
		t.Fatalf("esperaba 409 antes de las 12:30, salió %d %v", code, out)
	}
}

func TestSorteoCompleto(t *testing.T) {
	ahora := time.Date(2026, 10, 27, 12, 35, 0, 0, lima)
	s, h := nuevoServidor(t, ahora)
	for i := 0; i < 10; i++ {
		code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": fmt.Sprintf("Persona %c", 'A'+i), "telefono": fmt.Sprintf("9876543%02d", i)}, false)
		if code != 200 {
			t.Fatalf("inscribir %d: %d %v", i, code, out)
		}
	}
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Otra Persona", "telefono": "987654300"}, false); code != 409 {
		t.Fatalf("el mismo celular no debe participar dos veces, salió %d", code)
	}
	// El reloj cierra y sortea solo.
	s.ahora = func() time.Time { return time.Date(2026, 10, 27, 12, 45, 1, 0, lima) }
	s.mu.Lock()
	if err := s.cerrar(); err != nil {
		t.Fatal(err)
	}
	if err := s.sortear(); err != nil {
		t.Fatal(err)
	}
	s.mu.Unlock()
	if len(s.e.Resultado) != len(premios) {
		t.Fatalf("esperaba %d ganadores, salieron %d", len(premios), len(s.e.Resultado))
	}
	// 4 premios con código + 1 referido.
	if len(s.e.Codigos) != 5 {
		t.Fatalf("esperaba 5 códigos, hay %d", len(s.e.Codigos))
	}
	if sha(s.e.Semilla) != s.e.Compromiso {
		t.Fatal("la semilla no corresponde al compromiso")
	}
	numeros := []int{}
	for _, p := range s.e.Participantes {
		numeros = append(numeros, p.Numero)
	}
	if fmt.Sprint(elegirGanadores(s.e.Semilla, numeros, len(premios))) != fmt.Sprint(s.e.Resultado) {
		t.Fatal("el sorteo no es reproducible")
	}
}

func TestMatriculaConCodigoYCombo(t *testing.T) {
	ahora := time.Date(2026, 10, 27, 12, 35, 0, 0, lima)
	s, h := nuevoServidor(t, ahora)
	s.e.Codigos = []Codigo{{Codigo: "CCP-ABCDEF", Descuento: 80, Numero: 1}}
	titular := map[string]string{"nombre": "Ana Pérez", "email": "ana@ejemplo.pe", "telefono": "987654321"}

	// Individual con 80 % y un curso más: (100 * 0,2 + 80) * 0,7 = 70.
	code, out := pedir(t, h, "POST", "/api/matricula", map[string]any{"titular": titular, "extras": []string{"bi-clickhouse"}, "codigo": "ccp-abcdef"}, false)
	if code != 200 || out["total"].(float64) != 70 {
		t.Fatalf("total esperado 70, salió %d %v", code, out)
	}
	// El código ya se usó.
	code, _ = pedir(t, h, "POST", "/api/matricula", map[string]any{"titular": titular, "codigo": "CCP-ABCDEF"}, false)
	if code != 400 {
		t.Fatalf("un código usado debe rechazarse, salió %d", code)
	}
	// Dúo con un curso más: (130 + 80 * 2) * 0,7 = 203.
	amigo := map[string]string{"nombre": "Luis Rojas", "email": "luis@ejemplo.pe", "telefono": "912345678"}
	code, out = pedir(t, h, "POST", "/api/matricula", map[string]any{"titular": titular, "amigo": amigo, "extras": []string{"bi-clickhouse"}}, false)
	if code != 200 || out["total"].(float64) != 203 {
		t.Fatalf("total dúo esperado 203, salió %d %v", code, out)
	}
	// Los códigos no valen en dúo.
	s.e.Codigos = append(s.e.Codigos, Codigo{Codigo: "CCP-ZZZZZZ", Descuento: 50, Numero: 2})
	code, _ = pedir(t, h, "POST", "/api/matricula", map[string]any{"titular": titular, "amigo": amigo, "codigo": "CCP-ZZZZZZ"}, false)
	if code != 400 {
		t.Fatalf("el código en dúo debe rechazarse, salió %d", code)
	}

	// Solo los pagos confirmados cuentan como cupos.
	if s.matriculados() != 0 {
		t.Fatalf("sin pagos no debe haber matriculados, hay %d", s.matriculados())
	}
	code, _ = pedir(t, h, "POST", "/api/admin/pago", map[string]string{"id": "M002", "estado": "pagado"}, true)
	if code != 200 || s.matriculados() != 2 {
		t.Fatalf("tras pagar el dúo debe haber 2 matriculados, hay %d (%d)", s.matriculados(), code)
	}
}

func TestCuposLlenos(t *testing.T) {
	ahora := time.Date(2026, 10, 27, 12, 35, 0, 0, lima)
	s, h := nuevoServidor(t, ahora)
	s.e.Config.MatriculadosExtra = 15
	code, _ := pedir(t, h, "POST", "/api/matricula", map[string]any{"titular": map[string]string{"nombre": "Ana Pérez", "email": "ana@ejemplo.pe", "telefono": "987654321"}}, false)
	if code != 409 {
		t.Fatalf("con los 15 cupos tomados debe rechazar, salió %d", code)
	}
}

func TestExcluidos(t *testing.T) {
	c := Config{Excluidos: []string{"Carlos Saavedra", "Raúl Gamboa"}, ExcluidosTel: []string{"987000111"}}
	casos := map[string]bool{"Carlos Saavedra": true, "carlos saavedra vad": true, "Raul Alberto Gamboa Flores": true, "Carlos Pérez": false, "Saavedra Luis": false}
	for n, esperado := range casos {
		if c.excluido(n, "900000000") != esperado {
			t.Errorf("%q: esperaba %v", n, esperado)
		}
	}
	if !c.excluido("Otra Persona", "987000111") {
		t.Error("el celular excluido debe bloquear")
	}
}

func TestCodigoVariosUsos(t *testing.T) {
	c := Codigo{Codigo: "CCP-TEST", Descuento: 100, Cupos: 3}
	if c.quedan() != 3 {
		t.Fatalf("quedan %d", c.quedan())
	}
	c.usar("M001")
	c.usar("M002")
	if c.quedan() != 1 {
		t.Fatalf("quedan %d tras dos usos", c.quedan())
	}
	c.liberar("M001")
	if c.quedan() != 2 {
		t.Fatalf("quedan %d tras liberar", c.quedan())
	}
	c.usar("M003")
	c.usar("M004")
	if c.quedan() != 0 {
		t.Fatalf("debería estar agotado: %d", c.quedan())
	}
	u := Codigo{Codigo: "CCP-UNO", Descuento: 50}
	u.usar("M009")
	if u.quedan() != 0 || u.Usado != "M009" {
		t.Fatal("el código de un uso sigue mandando por Usado")
	}
}
