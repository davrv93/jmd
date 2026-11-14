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
	archivo := filepath.Join(t.TempDir(), "puertas.json")
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
	if c.totalPuertas() != 30 {
		t.Fatalf("puertas = %d, quiero 30", c.totalPuertas())
	}
	cien := 0
	for _, p := range c.Premios {
		if p.Descuento != 0 && p.Descuento < 60 {
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
	if s2.porPuerta[3] == nil || s2.porNumero["987654321"] == nil {
		t.Fatal("se perdió la participación al reiniciar")
	}
}

func TestPuertaTomadaYRepetido(t *testing.T) {
	s, _ := sorteoPrueba(t)
	p, rep, err := s.jugar("Ana", "987654321", "1.1.1.1", 7)
	if err != nil || rep {
		t.Fatal(err, rep)
	}
	if p.Descuento != s.mazo[6] || (p.Descuento > 0) != (p.Codigo != "") {
		t.Fatalf("premio %d, mazo %d, código %q", p.Descuento, s.mazo[6], p.Codigo)
	}
	if _, _, err := s.jugar("Beto", "912345678", "2.2.2.2", 7); err != errTomada {
		t.Fatalf("quiero errTomada, salió %v", err)
	}
	p2, rep, err := s.jugar("Ana", "987654321", "1.1.1.1", 9)
	if err != nil || !rep || p2.Puerta != 7 {
		t.Fatalf("el mismo número debe ver su puerta 7: %v %v %d", err, rep, p2.Puerta)
	}
	if _, _, err := s.jugar("Beto", "912345678", "2.2.2.2", 31); err != errPuerta {
		t.Fatalf("puerta 31: %v", err)
	}
}

func TestSeCierraConTodasTomadas(t *testing.T) {
	s, _ := sorteoPrueba(t)
	for i := 1; i <= len(s.mazo); i++ {
		num := "9" + string(rune('0'+i/10)) + string(rune('0'+i%10)) + "000000"
		if _, _, err := s.jugar("Persona", num, "ip"+num, i); err != nil {
			t.Fatal(i, err)
		}
	}
	if s.abierto() {
		t.Fatal("con todas las puertas tomadas debe cerrarse")
	}
	if _, _, err := s.jugar("Otra", "999999999", "x", 1); err != errCerrado {
		t.Fatal(err)
	}
}

func TestVencimientoNoPasaDelFin(t *testing.T) {
	s, _ := sorteoPrueba(t)
	s.cfg.Fin = "2026-11-10"
	s.ahora = func() time.Time { return time.Date(2026, 11, 8, 15, 0, 0, 0, lima) }
	premiada := 0
	for i, d := range s.mazo {
		if d > 0 {
			premiada = i + 1
			break
		}
	}
	p, _, err := s.jugar("Ana", "987654321", "1", premiada)
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
	if w := pedir(map[string]any{"nombre": "Ana", "whatsapp": "987654321", "palabra": "otra", "puerta": 1}); w.Code != 403 {
		t.Fatalf("palabra mala: %d", w.Code)
	}
	premiada := 0
	for i, d := range s.mazo {
		if d > 0 {
			premiada = i + 1
			break
		}
	}
	w := pedir(map[string]any{"nombre": "Ana María", "whatsapp": "987 654 321", "palabra": " sombrero ", "puerta": premiada})
	if w.Code != 200 {
		t.Fatalf("jugar: %d %s", w.Code, w.Body)
	}
	var r Resultado
	_ = json.Unmarshal(w.Body.Bytes(), &r)
	if r.Puerta != premiada || !r.Escapo || r.Descuento < 60 || r.VenceTexto == "" {
		t.Fatalf("resultado %+v", r)
	}
	e := httptest.NewRecorder()
	h.ServeHTTP(e, httptest.NewRequest("GET", "/api/estado", nil))
	var est struct {
		Puertas int              `json:"puertas"`
		Tomadas []map[string]any `json:"tomadas"`
	}
	_ = json.Unmarshal(e.Body.Bytes(), &est)
	if est.Puertas != 30 || len(est.Tomadas) != 1 || est.Tomadas[0]["nombre"] != "Ana" {
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

func TestTrampaSinCupon(t *testing.T) {
	s, _ := sorteoPrueba(t)
	trampa := 0
	for i, d := range s.mazo {
		if d == 0 {
			trampa = i + 1
			break
		}
	}
	if trampa == 0 {
		t.Fatal("el mazo de config.json debe tener trampas")
	}
	p, _, err := s.jugar("Ana", "987654321", "1", trampa)
	if err != nil {
		t.Fatal(err)
	}
	if p.Descuento != 0 || p.Codigo != "" || p.Vence != "" {
		t.Fatalf("trampa con cupón: %+v", p)
	}
	p2, rep, err := s.jugar("Ana", "987654321", "1", trampa+1)
	if err != nil || !rep || p2.Puerta != trampa {
		t.Fatal("quien cayó en la trampa no puede volver a jugar", err, rep)
	}
}
