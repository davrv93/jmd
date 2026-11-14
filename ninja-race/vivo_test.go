package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func cerrarAdmin(t *testing.T, s *Servidor, url string) {
	t.Helper()
	req, _ := http.NewRequest("POST", url+"/api/admin/cerrar", strings.NewReader("{}"))
	req.Header.Set("X-Clave", s.clave)
	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != 200 {
		t.Fatalf("cerrar: %v %v", err, resp)
	}
	resp.Body.Close()
}

// Con premios al cierre: correr no reparte nada; el botón calcula por ranking.
func TestPremiosAlCierrePorRanking(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	s.e.Config.AlCierre, s.e.Config.SoloManual = true, true
	s.e.Config.CursoOtro = "DeepSeek Harness"
	s.e.Config.Cierre = reloj.Add(-time.Hour) // pasó la medianoche, pero es solo manual

	correr := func(nombre, tel string, ms, esq, puesto int) {
		tok := registrar(t, ts, nombre, tel)
		id := salir(t, ts, reloj, tok, ms)
		out := llegar(t, ts, tok, id, ms, esq, puesto, []int{10, 20})
		if out["premio"] != nil || out["cupo_100"] != nil {
			t.Fatalf("abierto no debe mostrar premio: %v", out)
		}
	}
	correr("Luis Paredes", "51911111111", 20000, 10, 1) // 250
	correr("Rosa Vega", "51911111112", 40000, 20, 2)    // 500: mejor, aunque perdió con los cpu
	correr("Ana Torres", "51922222222", 30000, 10, 1)   // excluida: 350
	correr("Beto Cruz", "51911111113", 3000, 2, 1)      // carrera corta: no entra
	s.mu.Lock()
	if len(s.e.Ganadores) != 0 {
		t.Fatalf("se repartieron premios antes del cierre: %v", s.e.Ganadores)
	}
	s.mu.Unlock()

	cerrarAdmin(t, s, ts.URL)
	time.Sleep(100 * time.Millisecond) // los códigos se piden aparte
	s.mu.Lock()
	defer s.mu.Unlock()
	por := map[string]Ganador{}
	for _, g := range s.e.Ganadores {
		por[g.Nombre] = g
	}
	if g := por["Rosa Vega"]; g.Descuento != 100 || g.Curso != "Claude Code PRO" || g.Puesto != 1 || g.Codigo != "CCP-100" {
		t.Errorf("el mejor puntaje debía llevarse el 100 %% de Claude: %+v", g)
	}
	if g := por["Ana Torres"]; g.Descuento != 100 || g.Curso != "DeepSeek Harness" {
		t.Errorf("la mejor excluida debía llevarse el 100 %% de DeepSeek: %+v", g)
	}
	if g := por["Luis Paredes"]; g.Descuento < 40 || g.Descuento > 70 || g.Curso != "Claude Code PRO" {
		t.Errorf("el resto, descuento de su curso: %+v", g)
	}
	if _, ok := por["Beto Cruz"]; ok {
		t.Error("una carrera corta no debía entrar al ranking")
	}
	if !s.e.Config.Cerrado {
		t.Error("el botón no cerró el sorteo")
	}
}

func TestSoloManualNoCierraALaMedianoche(t *testing.T) {
	c := Config{SoloManual: true, Cierre: time.Now().Add(-time.Hour)}
	if c.cerrada(time.Now()) {
		t.Error("solo manual no debe cerrar por la hora")
	}
	c.Cerrado = true
	if !c.cerrada(time.Now()) {
		t.Error("el botón sí cierra")
	}
}

func TestPanelVivoPideClave(t *testing.T) {
	s, ts, _ := nuevoPrueba(t)
	s.vivo = nuevoVivo()
	go s.bucleVivo()
	registrar(t, ts, "Luis Paredes", "51911111111")
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http") + "/api/admin/vivo"
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	mala, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	_ = mala.Write(ctx, websocket.MessageText, []byte(`{"clave":"otra"}`))
	if _, _, err := mala.Read(ctx); websocket.CloseStatus(err) != websocket.StatusPolicyViolation {
		t.Errorf("con clave mala debía cerrarse: %v", err)
	}

	c, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()
	_ = c.Write(ctx, websocket.MessageText, []byte(`{"clave":"`+s.clave+`"}`))
	_, msg, err := c.Read(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var foto map[string]any
	_ = json.Unmarshal(msg, &foto)
	if foto["tipo"] != "foto" || len(foto["jugadores"].([]any)) != 1 {
		t.Errorf("foto inesperada: %s", msg)
	}
}

// Cierre a la hora (9:30 p. m.): al llegar, se cierra y se reparte solo.
func TestCierreAutomaticoALaHoraReparte(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	s.e.Config.AlCierre, s.e.Config.SoloManual = true, false
	s.e.Config.Cierre = reloj.Add(10 * time.Minute)

	tok := registrar(t, ts, "Rosa Vega", "51911111112")
	id := salir(t, ts, reloj, tok, 40000)
	llegar(t, ts, tok, id, 40000, 20, 2, []int{10, 20})
	if s.cerrarSiEsLaHora() {
		t.Fatal("cerró antes de la hora")
	}
	if a := s.e.Config.anuncio(); !strings.Contains(a, "p. m.") && !strings.Contains(a, "a. m.") {
		t.Errorf("el aviso debía decir la hora del cierre: %q", a)
	}

	*reloj = reloj.Add(11 * time.Minute)
	if !s.cerrarSiEsLaHora() {
		t.Fatal("no cerró al llegar la hora")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.e.Config.Cerrado || len(s.e.Ganadores) != 1 || s.e.Ganadores[0].Descuento != 100 {
		t.Fatalf("debía cerrar y dar el 100 %% al mejor: %+v", s.e.Ganadores)
	}
}

func TestHoraLima(t *testing.T) {
	c := time.Date(2026, 10, 31, 21, 30, 0, 0, lima)
	if h := horaLima(c); h != "9:30 p. m." {
		t.Errorf("horaLima = %q", h)
	}
}
