package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// Reloj de prueba que se adelanta a mano.
type reloj struct {
	mu sync.Mutex
	t  time.Time
}

func (r *reloj) ahora() time.Time { r.mu.Lock(); defer r.mu.Unlock(); return r.t }
func (r *reloj) pasar(d time.Duration) {
	r.mu.Lock()
	r.t = r.t.Add(d)
	r.mu.Unlock()
}

// Servidor de prueba: reloj manipulable y API del sorteo simulada, que anota
// cada descuento pedido.
func nuevoServidor(t *testing.T) (*Servidor, http.Handler, *reloj, *[]int) {
	t.Helper()
	pedidos := &[]int{}
	rl := &reloj{t: time.Date(2026, 10, 28, 20, 0, 0, 0, lima)}
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba", porIP: map[string]int{}, ahora: rl.ahora, azar: azar}
	s.pedirCodigo = func(d int) (string, error) {
		*pedidos = append(*pedidos, d)
		return fmt.Sprintf("CCP-P%d-%d", d, len(*pedidos)), nil
	}
	s.e = Estado{Config: configInicial()}
	return s, s.rutas(), rl, pedidos
}

var ipSiguiente int

func pedirCrudo(t *testing.T, h http.Handler, metodo, ruta string, cuerpo any, admin bool) (int, []byte) {
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
	return w.Code, w.Body.Bytes()
}

func pedir(t *testing.T, h http.Handler, metodo, ruta string, cuerpo any, admin bool) (int, map[string]any) {
	t.Helper()
	code, b := pedirCrudo(t, h, metodo, ruta, cuerpo, admin)
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	return code, out
}

func inscribir(t *testing.T, h http.Handler, nombre string) string {
	t.Helper()
	code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": nombre}, false)
	if code != 200 {
		t.Fatalf("inscribir %q: %d %v", nombre, code, out)
	}
	return out["t"].(string)
}

func empezar(t *testing.T, h http.Handler, tok string) (int, map[string]any) {
	t.Helper()
	return pedir(t, h, "POST", "/api/empezar", map[string]string{"t": tok}, false)
}

func marcar(t *testing.T, h http.Handler, tok string, f1, c1, f2, c2 int) (int, map[string]any) {
	t.Helper()
	return pedir(t, h, "POST", "/api/marcar", map[string]any{"t": tok, "f1": f1, "c1": c1, "f2": f2, "c2": c2}, false)
}

// Intento en curso de un jugador, leído del estado del servidor (las
// posiciones nunca salen por la API).
func intentoDe(s *Servidor, tok string) Intento {
	s.mu.Lock()
	defer s.mu.Unlock()
	j := s.e.Jugadores[s.jugador(tok)]
	return j.Intentos[len(j.Intentos)-1]
}

// Resuelve el intento en curso tardando «dur» en total; devuelve la última
// respuesta.
func resolver(t *testing.T, s *Servidor, h http.Handler, rl *reloj, tok string, dur time.Duration) map[string]any {
	t.Helper()
	in := intentoDe(s, tok)
	var out map[string]any
	for k, u := range in.Tablero.Palabras {
		rl.pasar(dur / time.Duration(len(in.Tablero.Palabras)))
		f2, c2 := u.fin()
		var code int
		if k%2 == 0 {
			code, out = marcar(t, h, tok, u.F, u.C, f2, c2)
		} else { // al revés también vale
			code, out = marcar(t, h, tok, f2, c2, u.F, u.C)
		}
		if code != 200 || out["encontrada"] != true {
			t.Fatalf("marcar %s: %d %v", u.Palabra, code, out)
		}
	}
	return out
}

// Cada tablero tiene exactamente 8 palabras distintas de la lista, cada una
// escrita en su posición guardada, solo en las 4 direcciones permitidas, y
// aparece UNA sola vez en todo el tablero (en cualquier dirección).
func TestTablero(t *testing.T) {
	permitida := map[[2]int]bool{{0, 1}: true, {1, 0}: true, {1, 1}: true, {-1, 1}: true}
	enLista := map[string]bool{}
	for _, p := range lista {
		enLista[p.Palabra] = true
		if strings.ContainsAny(p.Palabra, "ÁÉÍÓÚÑ") || len(p.Palabra) > lado || p.Significado == "" {
			t.Fatalf("palabra no apta: %+v", p)
		}
	}
	vistas := map[string]bool{}
	for vuelta := 0; vuelta < 2000; vuelta++ {
		tb := generar(azar)
		if len(tb.Letras) != lado {
			t.Fatalf("filas: %d", len(tb.Letras))
		}
		for _, f := range tb.Letras {
			if len(f) != lado {
				t.Fatalf("fila de %d letras", len(f))
			}
			for _, r := range f {
				if r < 'A' || r > 'Z' {
					t.Fatalf("letra rara %q", r)
				}
			}
		}
		if len(tb.Palabras) != palabrasPorJu {
			t.Fatalf("palabras: %d", len(tb.Palabras))
		}
		distintas := map[string]bool{}
		for _, u := range tb.Palabras {
			if !enLista[u.Palabra] || distintas[u.Palabra] {
				t.Fatalf("palabra repetida o fuera de lista: %s", u.Palabra)
			}
			distintas[u.Palabra] = true
			vistas[u.Palabra] = true
			if !permitida[[2]int{u.DF, u.DC}] {
				t.Fatalf("%s en dirección prohibida (%d,%d)", u.Palabra, u.DF, u.DC)
			}
			for k := 0; k < len(u.Palabra); k++ {
				f, c := u.F+u.DF*k, u.C+u.DC*k
				if !dentro(f) || !dentro(c) || tb.Letras[f][c] != u.Palabra[k] {
					t.Fatalf("%s no está en su posición guardada", u.Palabra)
				}
			}
			if n := ocurrencias(tb.Letras, u.Palabra); n != 1 {
				t.Fatalf("%s aparece %d veces", u.Palabra, n)
			}
		}
	}
	if len(vistas) != len(lista) {
		t.Fatalf("en 2000 tableros salieron %d de %d palabras", len(vistas), len(lista))
	}
}

// Dos tableros seguidos no son iguales (ni las letras ni las palabras).
func TestAzar(t *testing.T) {
	a, b := generar(azar), generar(azar)
	if strings.Join(a.Letras, "") == strings.Join(b.Letras, "") {
		t.Fatal("dos tableros idénticos")
	}
	iguales := 0
	for i := 0; i < 50; i++ {
		x, y := generar(azar), generar(azar)
		if fmt.Sprint(x.Palabras) == fmt.Sprint(y.Palabras) {
			iguales++
		}
	}
	if iguales > 0 {
		t.Fatalf("%d pares con las mismas palabras en el mismo sitio", iguales)
	}
}

// La API nunca entrega las posiciones de las palabras que faltan.
func TestEmpezarSinPosiciones(t *testing.T) {
	_, h, _, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	code, b := pedirCrudo(t, h, "POST", "/api/empezar", map[string]string{"t": tok}, false)
	if code != 200 {
		t.Fatalf("empezar: %d", code)
	}
	var v map[string]any
	_ = json.Unmarshal(b, &v)
	if len(v["letras"].([]any)) != lado || len(v["palabras"].([]any)) != palabrasPorJu {
		t.Fatalf("vista: %v", v)
	}
	for _, x := range []string{`"f":`, `"df":`, `"dc":`, `"tablero"`} {
		if strings.Contains(string(b), x) {
			t.Fatalf("la vista filtra posiciones (%s): %s", x, b)
		}
	}
	// Pedir otra vez devuelve el mismo intento (no gasta otro).
	_, v2 := empezar(t, h, tok)
	if fmt.Sprint(v2["letras"]) != fmt.Sprint(v["letras"]) || v2["n"].(float64) != 1 {
		t.Fatal("empezar con un intento en curso debe devolver el mismo")
	}
}

// Una selección equivocada se rechaza; la correcta (en cualquier sentido) vale
// una vez; repetirla no suma.
func TestMarcar(t *testing.T) {
	s, h, _, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	empezar(t, h, tok)
	in := intentoDe(s, tok)
	u := in.Tablero.Palabras[0]
	f2, c2 := u.fin()

	// Un extremo mal: no vale.
	malo := [4]int{u.F, u.C, f2, c2}
	if dentro(c2 + 1) {
		malo[3] = c2 + 1
	} else {
		malo[3] = c2 - 1
	}
	if code, out := marcar(t, h, tok, malo[0], malo[1], malo[2], malo[3]); code != 200 || out["encontrada"] != false {
		t.Fatalf("selección equivocada aceptada: %v", out)
	}
	// Fuera del tablero: 400.
	if code, _ := marcar(t, h, tok, -1, 0, 3, 3); code != 400 {
		t.Fatalf("fuera del tablero: %d", code)
	}
	// Al revés (de la última a la primera letra) vale.
	code, out := marcar(t, h, tok, f2, c2, u.F, u.C)
	if code != 200 || out["encontrada"] != true || out["palabra"] != u.Palabra || out["significado"] == "" {
		t.Fatalf("al revés: %d %v", code, out)
	}
	// Repetida: no suma.
	_, out = marcar(t, h, tok, u.F, u.C, f2, c2)
	if out["encontrada"] != false || out["ya"] != true || out["encontradas"].(float64) != 1 {
		t.Fatalf("repetida: %v", out)
	}
	if got := intentoDe(s, tok).Fallos; got != 1 {
		t.Fatalf("fallos: %d", got)
	}
	// Token ajeno: 404.
	if code, _ := marcar(t, h, "nada", u.F, u.C, f2, c2); code != 404 {
		t.Fatalf("token ajeno: %d", code)
	}
}

// El tiempo lo pone el servidor: inicio → última palabra, en su reloj; lo que
// diga el navegador no cuenta. Menos de 15 s no vale.
func TestTiempoDelServidor(t *testing.T) {
	s, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	empezar(t, h, tok)
	out := resolver(t, s, h, rl, tok, 47*time.Second+300*time.Millisecond)
	if out["terminado"] != true || out["valido"] != true || out["ms"].(float64) != 47300 || out["puesto"].(float64) != 1 {
		t.Fatalf("fin: %v", out)
	}
	// Muy rápido: no vale y no entra al ranking.
	tok2 := inscribir(t, h, "Bot Rápido")
	empezar(t, h, tok2)
	out = resolver(t, s, h, rl, tok2, 8*time.Second)
	if out["terminado"] != true || out["valido"] != false || out["mejor_ms"].(float64) != 0 {
		t.Fatalf("tiempo imposible aceptado: %v", out)
	}
	_, est := pedir(t, h, "GET", "/api/estado", nil, false)
	if n := len(est["ranking"].([]any)); n != 1 || est["partidas"].(float64) != 1 {
		t.Fatalf("ranking con tiempo imposible: %v", est["ranking"])
	}
}

// Tres intentos como máximo; cuenta el mejor tiempo, no el último.
func TestIntentosYMejorTiempo(t *testing.T) {
	s, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	for _, d := range []time.Duration{60 * time.Second, 40 * time.Second, 90 * time.Second} {
		if code, out := empezar(t, h, tok); code != 200 {
			t.Fatalf("empezar: %d %v", code, out)
		}
		resolver(t, s, h, rl, tok, d)
	}
	if code, out := empezar(t, h, tok); code != 409 {
		t.Fatalf("cuarto intento: %d %v", code, out)
	}
	_, yo := pedir(t, h, "GET", "/api/yo?t="+tok, nil, false)
	if yo["mejor_ms"].(float64) != 40000 || yo["intentos_restantes"].(float64) != 0 {
		t.Fatalf("mejor tiempo: %v", yo)
	}
	// Un intento abandonado también cuenta como usado.
	tok2 := inscribir(t, h, "Beto Ruiz")
	empezar(t, h, tok2)
	pedir(t, h, "POST", "/api/rendirse", map[string]string{"t": tok2}, false)
	_, yo = pedir(t, h, "GET", "/api/yo?t="+tok2, nil, false)
	if yo["intentos_restantes"].(float64) != 2 || yo["actual"] != nil {
		t.Fatalf("rendirse: %v", yo)
	}
	// Uno sin terminar vence a los 20 minutos y ya no marca.
	empezar(t, h, tok2)
	rl.pasar(21 * time.Minute)
	in := intentoDe(s, tok2)
	f2, c2 := in.Tablero.Palabras[0].fin()
	if code, _ := marcar(t, h, tok2, in.Tablero.Palabras[0].F, in.Tablero.Palabras[0].C, f2, c2); code != 409 {
		t.Fatalf("intento vencido aún marca: %d", code)
	}
}

// Al cerrar gana el mejor tiempo entre quienes pueden ganar: el excluido sale
// en el ranking marcado, pero nunca gana. El premio sale una sola vez y el
// código solo lo ve el ganador.
func TestCerrar(t *testing.T) {
	s, h, rl, pedidos := nuevoServidor(t)
	jug := []struct {
		nombre string
		dur    time.Duration
	}{{"Ines Jaimes Ccori", 20 * time.Second}, {"Rashel Poma", 22 * time.Second}, {"Ana Pérez", 30 * time.Second}, {"Beto Ruiz", 45 * time.Second}}
	toks := map[string]string{}
	for _, x := range jug {
		toks[x.nombre] = inscribir(t, h, x.nombre)
		empezar(t, h, toks[x.nombre])
		resolver(t, s, h, rl, toks[x.nombre], x.dur)
	}
	_, est := pedir(t, h, "GET", "/api/estado", nil, false)
	rk := est["ranking"].([]any)
	if r0 := rk[0].(map[string]any); r0["nombre"] != "I. J. C." || r0["fuera"] != true {
		t.Fatalf("ranking[0]: %v", r0)
	}
	if r2 := rk[2].(map[string]any); r2["nombre"] != "A. P." || r2["fuera"] != false {
		t.Fatalf("ranking[2]: %v", r2)
	}
	// Sin clave: 401.
	if code, _ := pedir(t, h, "POST", "/api/admin/cerrar", nil, false); code != 401 {
		t.Fatalf("cerrar sin clave: %d", code)
	}
	if code, _ := pedir(t, h, "GET", "/api/admin/estado", nil, false); code != 401 {
		t.Fatalf("estado admin sin clave: %d", code)
	}
	if code, _ := pedir(t, h, "POST", "/api/admin/config", map[string]any{"premios": []int{100}}, false); code != 401 {
		t.Fatalf("config sin clave: %d", code)
	}
	if code, out := pedir(t, h, "POST", "/api/admin/cerrar", nil, true); code != 200 {
		t.Fatalf("cerrar: %d %v", code, out)
	}
	if len(s.e.Ganadores) != 1 || s.e.Ganadores[0].Nombre != "Ana Pérez" || s.e.Ganadores[0].Descuento != 100 || s.e.Ganadores[0].Ms != 30000 {
		t.Fatalf("ganadores: %+v", s.e.Ganadores)
	}
	// Cerrar otra vez no da otro premio.
	pedir(t, h, "POST", "/api/admin/cerrar", nil, true)
	s.cerrar()
	if len(s.e.Ganadores) != 1 || len(*pedidos) != 1 || (*pedidos)[0] != 100 {
		t.Fatalf("premio repetido: %+v %v", s.e.Ganadores, *pedidos)
	}
	// El ganador ve su código; el excluido y los demás no.
	_, yo := pedir(t, h, "GET", "/api/yo?t="+toks["Ana Pérez"], nil, false)
	if yo["gane"] != true || yo["codigo"] != "CCP-P100-1" || !strings.HasSuffix(yo["matricula"].(string), "CCP-P100-1") {
		t.Fatalf("ganador: %v", yo)
	}
	for _, n := range []string{"Ines Jaimes Ccori", "Rashel Poma", "Beto Ruiz"} {
		_, yo = pedir(t, h, "GET", "/api/yo?t="+toks[n], nil, false)
		if yo["gane"] != nil || yo["codigo"] != nil {
			t.Fatalf("%s no debía ganar: %v", n, yo)
		}
	}
	// Público: iniciales, sin códigos, sin nombres completos ni tokens.
	code, b := pedirCrudo(t, h, "GET", "/api/estado", nil, false)
	pub := string(b)
	if code != 200 || strings.Contains(pub, "CCP-") || strings.Contains(pub, "Pérez") || strings.Contains(pub, "Jaimes") ||
		strings.Contains(pub, toks["Ana Pérez"]) || !strings.Contains(pub, `"A. P."`) || !strings.Contains(pub, `"cerrado":true`) {
		t.Fatalf("estado público: %s", pub)
	}
	// Cerrado: no se empieza otro intento.
	tok := inscribir(t, h, "Carla Díaz")
	if code, _ := empezar(t, h, tok); code != 409 {
		t.Fatalf("empezar tras el cierre: %d", code)
	}
	// Reiniciar deja todo en cero.
	pedir(t, h, "POST", "/api/admin/reiniciar", nil, true)
	if len(s.e.Jugadores) != 0 || len(s.e.Ganadores) != 0 || s.e.Cerrado {
		t.Fatal("reiniciar")
	}
}

// Con premios [100, 50] salen dos ganadores elegibles; si la API falla, el
// premio queda pendiente y el admin lo completa.
func TestVariosPremiosYPendiente(t *testing.T) {
	s, h, rl, _ := nuevoServidor(t)
	if code, out := pedir(t, h, "POST", "/api/admin/config", map[string]any{"premios": []int{100, 50}, "cierre": "mañana"}, true); code != 400 {
		t.Fatalf("cierre no válido aceptado: %d %v", code, out)
	}
	if code, out := pedir(t, h, "POST", "/api/admin/config", map[string]any{"premios": []int{100, 50}}, true); code != 200 {
		t.Fatalf("config: %d %v", code, out)
	}
	falla := true
	s.pedirCodigo = func(d int) (string, error) {
		if falla {
			return "", fmt.Errorf("caída")
		}
		return fmt.Sprintf("CCP-OK%d", d), nil
	}
	for i, n := range []string{"Jack Castillo", "Ana Pérez", "Beto Ruiz", "Carla Díaz"} {
		tok := inscribir(t, h, n)
		empezar(t, h, tok)
		resolver(t, s, h, rl, tok, time.Duration(20+i*5)*time.Second)
	}
	pedir(t, h, "POST", "/api/admin/cerrar", nil, true)
	if len(s.e.Ganadores) != 2 || s.e.Ganadores[0].Nombre != "Ana Pérez" || s.e.Ganadores[1].Nombre != "Beto Ruiz" ||
		s.e.Ganadores[1].Descuento != 50 || s.e.Ganadores[0].Codigo != "" {
		t.Fatalf("ganadores: %+v", s.e.Ganadores)
	}
	falla = false
	if code, out := pedir(t, h, "POST", "/api/admin/codigo", map[string]any{"id": 2}, true); code != 200 || out["codigo"] != "CCP-OK50" {
		t.Fatalf("completar código: %d %v", code, out)
	}
}

// La hora de cierre cierra sola el concurso.
func TestCierreAutomatico(t *testing.T) {
	s, h, rl, pedidos := nuevoServidor(t)
	cierre := rl.ahora().Add(time.Hour).Format(time.RFC3339)
	pedir(t, h, "POST", "/api/admin/config", map[string]any{"cierre": cierre}, true)
	tok := inscribir(t, h, "Ana Pérez")
	empezar(t, h, tok)
	resolver(t, s, h, rl, tok, 30*time.Second)
	rl.pasar(2 * time.Hour)
	go s.vigilarCierre(5 * time.Millisecond)
	for k := 0; k < 200; k++ {
		s.mu.Lock()
		listo := len(s.e.Ganadores) == 1 && s.e.Ganadores[0].Codigo != ""
		s.mu.Unlock()
		if listo {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	if len(*pedidos) != 1 {
		t.Fatalf("cierre automático: %v", *pedidos)
	}
}

func TestExcluidosYCensura(t *testing.T) {
	c := configInicial()
	for _, n := range []string{"Inés Jaimes", "Hector Limahuaya Adco", "Alex Mesias Diaz Toro", "Jordan Carlos Ruiz", "J0RDAN CARLOS"} {
		if !c.excluido(n) {
			t.Fatalf("%q debía estar excluido", n)
		}
	}
	for _, n := range []string{"Ana Pérez", "Carlos Pérez", "Hector Ruiz"} {
		if c.excluido(n) {
			t.Fatalf("%q no debía estar excluido", n)
		}
	}
	if censurar("Ana de la Cruz") != "A. C." {
		t.Fatal(censurar("Ana de la Cruz"))
	}
}

func TestInscripcion(t *testing.T) {
	_, h, _, _ := nuevoServidor(t)
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Ana"}, false); code != 400 {
		t.Fatal("sin apellido debía fallar")
	}
	inscribir(t, h, "Ana Pérez")
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "ana  pérez"}, false); code != 409 {
		t.Fatal("nombre repetido debía fallar")
	}
	if code, _ := pedirCrudo(t, h, "GET", "/static/sopa.js", nil, false); code != 200 {
		t.Fatalf("estático: %d", code)
	}
	if code, b := pedirCrudo(t, h, "GET", "/", nil, false); code != 200 || !strings.Contains(string(b), "Sopa de letras") {
		t.Fatalf("index: %d", code)
	}
}
