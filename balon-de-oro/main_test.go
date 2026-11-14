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

// Servidor de prueba: azar manipulable (siempre gol o nunca gol) y API del
// sorteo simulada.
func nuevoServidor(t *testing.T, prob int) (*Servidor, http.Handler) {
	t.Helper()
	s := &Servidor{
		archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba", porIP: map[string]int{},
		ahora: func() time.Time { return time.Date(2026, 10, 27, 19, 40, 0, 0, lima) },
		azar:  azar,
		pedirCodigo: func() (string, error) {
			return "CCP-PRUEBA", nil
		},
	}
	s.e = Estado{Config: configInicial()}
	s.e.Config.Prob = prob
	return s, s.rutas()
}

var ipSiguiente int

func pedir(t *testing.T, h http.Handler, metodo, ruta string, cuerpo any, admin bool, ip string) (int, map[string]any) {
	t.Helper()
	var b []byte
	if cuerpo != nil {
		b, _ = json.Marshal(cuerpo)
	}
	r := httptest.NewRequest(metodo, ruta, bytes.NewReader(b))
	if ip == "" {
		ipSiguiente++
		ip = fmt.Sprintf("10.0.%d.%d", ipSiguiente/250, ipSiguiente%250)
	}
	r.Header.Set("X-Real-IP", ip)
	if admin {
		r.Header.Set("X-Clave", "clave-de-prueba")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func inscribir(t *testing.T, h http.Handler, nombre string) string {
	t.Helper()
	code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": nombre}, false, "")
	if code != 200 {
		t.Fatalf("inscribir %q: %d %v", nombre, code, out)
	}
	return out["t"].(string)
}

// La probabilidad respeta la configuración: con 1 de 4, 100 000 tiros dan
// 25 % ± 2.
func TestProbabilidad(t *testing.T) {
	const n = 100000
	goles := 0
	for i := 0; i < n; i++ {
		if azar(4) == 0 {
			goles++
		}
	}
	p := float64(goles) / n * 100
	if p < 23 || p > 27 {
		t.Fatalf("con 1 de 4 esperaba 25 %% ± 2, salió %.2f %%", p)
	}
	// Reparto de fallos: los tres resultados aparecen.
	vistos := map[int]bool{}
	for i := 0; i < 1000; i++ {
		vistos[azar(3)] = true
	}
	if len(vistos) != 3 {
		t.Fatalf("azar(3) no reparte entre los tres fallos: %v", vistos)
	}
}

func TestTopeDeTiros(t *testing.T) {
	s, h := nuevoServidor(t, 250)
	s.azar = func(n int) int { return 1 } // nunca gol
	tok := inscribir(t, h, "Ana Pérez")
	for i := 1; i <= 3; i++ {
		code, out := pedir(t, h, "POST", "/api/patear", map[string]string{"t": tok}, false, "")
		if code != 200 || out["gol"] != false || int(out["tiro"].(float64)) != i || int(out["tiros_restantes"].(float64)) != 3-i {
			t.Fatalf("tiro %d: %d %v", i, code, out)
		}
		r := out["resultado"].(string)
		if r != "atajado" && r != "palo" && r != "afuera" {
			t.Fatalf("resultado raro: %q", r)
		}
	}
	if code, out := pedir(t, h, "POST", "/api/patear", map[string]string{"t": tok}, false, ""); code != 409 {
		t.Fatalf("el cuarto tiro debe rechazarse, salió %d %v", code, out)
	}
	if s.e.TirosTotales != 3 {
		t.Fatalf("tiros totales: %d", s.e.TirosTotales)
	}
	code, yo := pedir(t, h, "GET", "/api/yo?t="+tok, nil, false, "")
	if code != 200 || int(yo["tiros"].(float64)) != 3 || yo["gane"] != false {
		t.Fatalf("yo: %d %v", code, yo)
	}
	// Mismo nombre normalizado = un solo registro.
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "  ana   PÉREZ "}, false, ""); code != 409 {
		t.Fatalf("el mismo nombre no debe registrarse dos veces, salió %d", code)
	}
	// Con el token, inscribir devuelve el registro existente.
	if code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Otro Nombre", "t": tok}, false, ""); code != 200 || out["nombre"] != "Ana Pérez" {
		t.Fatalf("inscribir con token: %d %v", code, out)
	}
}

func TestTopePorIP(t *testing.T) {
	_, h := nuevoServidor(t, 250)
	for i := 0; i < topeIPDia; i++ {
		if code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": fmt.Sprintf("Persona Num%d", i)}, false, "1.2.3.4"); code != 200 {
			t.Fatalf("registro %d: %d %v", i, code, out)
		}
	}
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Persona Demas"}, false, "1.2.3.4"); code != 429 {
		t.Fatalf("el registro %d desde la misma IP debe dar 429, salió %d", topeIPDia+1, code)
	}
}

func TestExcluidos(t *testing.T) {
	_, h := nuevoServidor(t, 250)
	casos := []string{"Jack Castillo", "jack castillo rojas", "Carlos Saavedra Vad", "JHON PÉREZ", "Paul Huamán Quispe", "Medrano Jhon Perez"}
	for _, n := range casos {
		code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": n}, false, "")
		if code != 400 || out["error"] != "Ya ganaste en Claude Code PRO: esta vez el balón es para otros. ¡Gracias por jugar!" {
			t.Fatalf("%q debía quedar fuera: %d %v", n, code, out)
		}
	}
	for _, n := range []string{"Carlos Pérez", "Jack Rojas", "Castillo Ana"} {
		if code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": n}, false, ""); code != 200 {
			t.Fatalf("%q sí puede jugar: %d %v", n, code, out)
		}
	}
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Ana"}, false, ""); code != 400 {
		t.Fatalf("sin apellido debe dar 400, salió %d", code)
	}
}

func TestCensura(t *testing.T) {
	casos := map[string]string{"John Nuñez": "J. N.", "Ana de la Cruz": "A. C.", "  maría   José  Rojas ": "M. J. R.", "Ines Jaimes": "I. J."}
	for in, esp := range casos {
		if got := censurar(in); got != esp {
			t.Fatalf("censurar(%q) = %q, esperaba %q", in, got, esp)
		}
	}
}

func TestGolConVacanteYSinVacante(t *testing.T) {
	s, h := nuevoServidor(t, 1) // siempre gol
	// La lista pública antes de nada.
	code, est := pedir(t, h, "GET", "/api/estado", nil, false, "")
	if code != 200 || est["prob"] != "1 de 1" || int(est["quedan"].(float64)) != 2 || est["regla"] != regla {
		t.Fatalf("estado: %d %v", code, est)
	}
	t1 := inscribir(t, h, "John Nuñez")
	code, out := pedir(t, h, "POST", "/api/patear", map[string]string{"t": t1}, false, "")
	if code != 200 || out["gol"] != true || out["resultado"] != "gol" || out["codigo"] != "CCP-PRUEBA" || int(out["quedan"].(float64)) != 1 {
		t.Fatalf("primer gol: %d %v", code, out)
	}
	if out["matricula"] != urlMatricula+"CCP-PRUEBA" {
		t.Fatalf("enlace de matrícula: %v", out["matricula"])
	}
	// Quien ya ganó no sigue pateando.
	if code, _ := pedir(t, h, "POST", "/api/patear", map[string]string{"t": t1}, false, ""); code != 409 {
		t.Fatalf("tras ganar no se patea, salió %d", code)
	}
	// Segundo gol con la API del sorteo caída: queda pendiente.
	s.pedirCodigo = func() (string, error) { return "", fmt.Errorf("sin red") }
	t2 := inscribir(t, h, "Rosa Quispe")
	code, out = pedir(t, h, "POST", "/api/patear", map[string]string{"t": t2}, false, "")
	if code != 200 || out["gol"] != true || out["codigo"] != "" || out["codigo_pendiente"] != true || int(out["quedan"].(float64)) != 0 {
		t.Fatalf("segundo gol pendiente: %d %v", code, out)
	}
	// El admin lo completa.
	code, g := pedir(t, h, "POST", "/api/admin/codigo", map[string]any{"id": 2, "codigo": "ccp-manual"}, true, "")
	if code != 200 || g["codigo"] != "CCP-MANUAL" {
		t.Fatalf("completar código: %d %v", code, g)
	}
	code, yo := pedir(t, h, "GET", "/api/yo?t="+t2, nil, false, "")
	if code != 200 || yo["gane"] != true || yo["codigo"] != "CCP-MANUAL" {
		t.Fatalf("yo tras completar: %d %v", code, yo)
	}
	// Vacantes agotadas: el gol se cuenta pero no hay código ni ganador nuevo.
	s.pedirCodigo = func() (string, error) { t.Fatal("no debe pedirse código sin vacantes"); return "", nil }
	t3 := inscribir(t, h, "Luis Torres")
	code, out = pedir(t, h, "POST", "/api/patear", map[string]string{"t": t3}, false, "")
	if code != 200 || out["gol"] != true || out["agotadas"] != true {
		t.Fatalf("gol sin vacante: %d %v", code, out)
	}
	if _, hay := out["codigo"]; hay {
		t.Fatalf("sin vacantes no debe salir código: %v", out)
	}
	if len(s.e.Ganadores) != 2 || s.e.Goles != 3 || s.e.TirosTotales != 3 {
		t.Fatalf("ganadores %d, goles %d, tiros %d", len(s.e.Ganadores), s.e.Goles, s.e.TirosTotales)
	}
	// Sigue pudiendo patear hasta su tope.
	if code, _ = pedir(t, h, "POST", "/api/patear", map[string]string{"t": t3}, false, ""); code != 200 {
		t.Fatalf("tras un gol sin premio se sigue pateando, salió %d", code)
	}
	// La lista pública censura y no filtra códigos; el admin ve todo.
	_, est = pedir(t, h, "GET", "/api/estado", nil, false, "")
	gs := est["ganadores"].([]any)
	if len(gs) != 2 || gs[0].(map[string]any)["nombre"] != "J. N." {
		t.Fatalf("ganadores públicos: %v", gs)
	}
	if _, hay := gs[0].(map[string]any)["codigo"]; hay {
		t.Fatalf("la lista pública no debe llevar código: %v", gs[0])
	}
	if code, _ = pedir(t, h, "GET", "/api/admin/estado", nil, false, ""); code != 401 {
		t.Fatalf("sin clave debe dar 401, salió %d", code)
	}
	_, adm := pedir(t, h, "GET", "/api/admin/estado", nil, true, "")
	ag := adm["ganadores"].([]any)[0].(map[string]any)
	if ag["nombre"] != "John Nuñez" || ag["codigo"] != "CCP-PRUEBA" {
		t.Fatalf("admin: %v", ag)
	}
	// Config y reinicio.
	code, adm = pedir(t, h, "POST", "/api/admin/config", map[string]any{"prob": 250, "tiros": 5, "vacantes": 3, "excluidos": []string{"Ana Mia", " "}}, true, "")
	cfg := adm["config"].(map[string]any)
	if code != 200 || int(cfg["tiros"].(float64)) != 5 || int(adm["quedan"].(float64)) != 1 || len(cfg["excluidos"].([]any)) != 1 {
		t.Fatalf("config: %d %v", code, adm)
	}
	if code, _ = pedir(t, h, "POST", "/api/admin/config", map[string]any{"prob": 0}, true, ""); code != 400 {
		t.Fatalf("prob 0 debe rechazarse, salió %d", code)
	}
	code, adm = pedir(t, h, "POST", "/api/admin/reiniciar", nil, true, "")
	if code != 200 || int(adm["goles"].(float64)) != 0 || len(s.e.Jugadores) != 0 || int(cfg["tiros"].(float64)) != 5 {
		t.Fatalf("reiniciar: %d %v", code, adm)
	}
}

func TestYashin(t *testing.T) {
	s, h := nuevoServidor(t, 1) // siempre ataja
	s.e.Config.Vacantes = 2
	// Un cupo ya salió en Balón de Oro: queda uno para los dos juegos.
	t1 := inscribir(t, h, "Ines Jaimes")
	if code, out := pedir(t, h, "POST", "/api/patear", map[string]string{"t": t1}, false, ""); code != 200 || out["codigo"] != "CCP-PRUEBA" {
		t.Fatalf("gol previo: %d %v", code, out)
	}
	// Quien ya ganó con un gol no gana otra vez atajando.
	if code, _ := pedir(t, h, "POST", "/api/atajar", map[string]string{"t": t1}, false, ""); code != 409 {
		t.Fatalf("la ganadora no debe atajar, salió %d", code)
	}
	t2 := inscribir(t, h, "Rosa Quispe")
	code, out := pedir(t, h, "POST", "/api/atajar", map[string]string{"t": t2}, false, "")
	if code != 200 || out["atajo"] != true || out["resultado"] != "atajada" || out["codigo"] != "CCP-PRUEBA" || out["agotadas"] != true {
		t.Fatalf("atajada con el último cupo: %d %v", code, out)
	}
	// Sin cupos: se ataja pero no hay premio.
	s.pedirCodigo = func() (string, error) { t.Fatal("no debe pedirse código sin vacantes"); return "", nil }
	t3 := inscribir(t, h, "Luis Torres")
	code, out = pedir(t, h, "POST", "/api/atajar", map[string]string{"t": t3}, false, "")
	if _, hay := out["codigo"]; code != 200 || out["atajo"] != true || hay {
		t.Fatalf("atajada sin cupo: %d %v", code, out)
	}
	// Tope de penales propio, aparte de los tiros de Balón de Oro.
	s.azar = func(n int) int { return 1 } // nunca ataja
	t4 := inscribir(t, h, "Mario Paz")
	for k := 1; k <= 3; k++ {
		code, out = pedir(t, h, "POST", "/api/atajar", map[string]string{"t": t4}, false, "")
		if code != 200 || out["atajo"] != false || int(out["penales_restantes"].(float64)) != 3-k {
			t.Fatalf("penal %d: %d %v", k, code, out)
		}
	}
	if code, _ = pedir(t, h, "POST", "/api/atajar", map[string]string{"t": t4}, false, ""); code != 409 {
		t.Fatalf("el cuarto penal debe rechazarse, salió %d", code)
	}
	if code, _ = pedir(t, h, "POST", "/api/patear", map[string]string{"t": t4}, false, ""); code != 200 {
		t.Fatalf("sus tiros de Balón de Oro siguen libres, salió %d", code)
	}
	// La lista pública: solo iniciales, el juego y nunca el código.
	_, est := pedir(t, h, "GET", "/api/estado", nil, false, "")
	gs := est["ganadores"].([]any)
	g0, g1 := gs[0].(map[string]any), gs[1].(map[string]any)
	if g0["nombre"] != "I. J." || g0["juego"] != "balon" || g1["nombre"] != "R. Q." || g1["juego"] != "yashin" {
		t.Fatalf("ganadores públicos: %v", gs)
	}
	if _, hay := g1["codigo"]; hay {
		t.Fatalf("la lista pública no debe llevar código: %v", g1)
	}
	if int(est["penales"].(float64)) != 5 || int(est["atajadas"].(float64)) != 2 || int(est["quedan"].(float64)) != 0 {
		t.Fatalf("contadores: %v", est)
	}
	code, yo := pedir(t, h, "GET", "/api/yo?t="+t2, nil, false, "")
	if code != 200 || yo["gane"] != true || yo["juego"] != "yashin" || yo["codigo"] != "CCP-PRUEBA" {
		t.Fatalf("yo de la arquera: %d %v", code, yo)
	}
}
