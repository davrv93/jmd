package main

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"
)

func cfgPrueba(t *testing.T) Config {
	t.Helper()
	c, err := leerConfig(configPorDefecto)
	if err != nil {
		t.Fatal(err)
	}
	c.Fin = "2099-12-31"
	return c
}

func sorteoPrueba(t *testing.T) (*Sorteo, string) {
	t.Helper()
	archivo := filepath.Join(t.TempDir(), "cuerdas.json")
	s, err := nuevoSorteo(cfgPrueba(t), archivo, "clave-de-prueba-123", azarSeguro)
	if err != nil {
		t.Fatal(err)
	}
	return s, archivo
}

func TestConfigReal(t *testing.T) {
	c, err := leerConfig(configPorDefecto)
	if err != nil {
		t.Fatal(err)
	}
	if c.totalCuerdas() != 25 {
		t.Fatalf("cuerdas = %d, quiero 25", c.totalCuerdas())
	}
	cien := 0
	for _, p := range c.Premios {
		if p.Descuento < 60 {
			t.Errorf("descuento %d menor que 60", p.Descuento)
		}
		if p.Descuento == 100 {
			cien = p.Cantidad
		}
	}
	if cien != 2 {
		t.Fatalf("premios de 100 %% = %d, quiero 2", cien)
	}
}

func TestMazoTieneLasCantidadesDeConfig(t *testing.T) {
	s, _ := sorteoPrueba(t)
	cuenta := map[int]int{}
	for _, d := range s.mazo {
		cuenta[d]++
	}
	for _, p := range s.cfg.Premios {
		if cuenta[p.Descuento] != p.Cantidad {
			t.Errorf("%d %%: %d en el mazo, config pide %d", p.Descuento, cuenta[p.Descuento], p.Cantidad)
		}
	}
}

func TestMazoSobreviveAlReinicio(t *testing.T) {
	s, archivo := sorteoPrueba(t)
	if _, _, err := s.jugar("Ana", "987654321", "1.1.1.1", 3); err != nil {
		t.Fatal(err)
	}
	s2, err := nuevoSorteo(s.cfg, archivo, "clave-de-prueba-123", func(int) int { return 0 })
	if err != nil {
		t.Fatal(err)
	}
	for i := range s.mazo {
		if s.mazo[i] != s2.mazo[i] {
			t.Fatal("el mazo cambió al reiniciar")
		}
	}
	if s2.porCuerda[3] == nil || s2.porNumero["987654321"] == nil {
		t.Fatal("se perdió la participación al reiniciar")
	}
}

func TestCuerdaTomadaYRepetido(t *testing.T) {
	s, _ := sorteoPrueba(t)
	p, rep, err := s.jugar("Ana", "987654321", "1.1.1.1", 7)
	if err != nil || rep {
		t.Fatal(err, rep)
	}
	if p.Descuento != s.mazo[6] || p.Codigo == "" {
		t.Fatalf("premio %d, mazo %d, código %q", p.Descuento, s.mazo[6], p.Codigo)
	}
	if _, _, err := s.jugar("Beto", "912345678", "2.2.2.2", 7); err != errTomada {
		t.Fatalf("quiero errTomada, salió %v", err)
	}
	p2, rep, err := s.jugar("Ana", "987654321", "1.1.1.1", 9)
	if err != nil || !rep || p2.Cuerda != 7 {
		t.Fatalf("el mismo número debe ver su cuerda 7: %v %v %d", err, rep, p2.Cuerda)
	}
	if _, _, err := s.jugar("Beto", "912345678", "2.2.2.2", 26); err != errCuerda {
		t.Fatalf("cuerda 26: %v", err)
	}
}

func TestSeCierraConTodasTomadas(t *testing.T) {
	s, _ := sorteoPrueba(t)
	for i := 1; i <= 25; i++ {
		num := "9" + string(rune('0'+i/10)) + string(rune('0'+i%10)) + "000000"
		if _, _, err := s.jugar("Persona", num, "ip"+num, i); err != nil {
			t.Fatal(i, err)
		}
	}
	if s.abierto() {
		t.Fatal("con 25 cuerdas tomadas debe cerrarse")
	}
	if _, _, err := s.jugar("Otra", "999999999", "x", 1); err != errCerrado {
		t.Fatal(err)
	}
}

func TestVencimientoNoPasaDelFin(t *testing.T) {
	s, _ := sorteoPrueba(t)
	s.cfg.Fin = "2026-11-10"
	s.ahora = func() time.Time { return time.Date(2026, 11, 8, 15, 0, 0, 0, lima) }
	p, _, err := s.jugar("Ana", "987654321", "1", 1)
	if err != nil {
		t.Fatal(err)
	}
	if p.Vence != "2026-11-10" {
		t.Fatalf("vence %s", p.Vence)
	}
}

func TestAPI(t *testing.T) {
	s, _ := sorteoPrueba(t)
	h := s.rutas()
	pedir := func(cuerpo any) *httptest.ResponseRecorder {
		b, _ := json.Marshal(cuerpo)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("POST", "/api/jugar", bytes.NewReader(b)))
		return w
	}
	if w := pedir(map[string]any{"nombre": "Ana", "whatsapp": "987654321", "palabra": "otra", "cuerda": 1}); w.Code != 403 {
		t.Fatalf("palabra mala: %d", w.Code)
	}
	w := pedir(map[string]any{"nombre": "Ana María", "whatsapp": "987 654 321", "palabra": " cubito ", "cuerda": 4})
	if w.Code != 200 {
		t.Fatalf("jugar: %d %s", w.Code, w.Body)
	}
	var r Resultado
	_ = json.Unmarshal(w.Body.Bytes(), &r)
	if r.Cuerda != 4 || r.Descuento < 60 || r.VenceTexto == "" {
		t.Fatalf("resultado %+v", r)
	}
	e := httptest.NewRecorder()
	h.ServeHTTP(e, httptest.NewRequest("GET", "/api/estado", nil))
	var est struct {
		Cuerdas int              `json:"cuerdas"`
		Tomadas []map[string]any `json:"tomadas"`
	}
	_ = json.Unmarshal(e.Body.Bytes(), &est)
	if est.Cuerdas != 25 || len(est.Tomadas) != 1 || est.Tomadas[0]["nombre"] != "Ana" {
		t.Fatalf("estado %s", e.Body)
	}
	if bytes.Contains(e.Body.Bytes(), []byte("mazo")) || bytes.Contains(e.Body.Bytes(), []byte("descuento")) {
		t.Fatal("el estado público no debe mostrar el mazo")
	}
	a := httptest.NewRecorder()
	h.ServeHTTP(a, httptest.NewRequest("GET", "/api/admin/participantes", nil))
	if a.Code != 401 {
		t.Fatalf("admin sin clave: %d", a.Code)
	}
}
