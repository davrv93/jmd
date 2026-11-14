package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// Servidor de prueba: azar manipulable y API del sorteo simulada, que anota
// cada descuento pedido.
func nuevoServidor(t *testing.T, prob int) (*Servidor, http.Handler, *[]int) {
	t.Helper()
	pedidos := &[]int{}
	s := &Servidor{
		archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba", porIP: map[string]int{},
		ahora: func() time.Time { return time.Date(2026, 10, 27, 19, 40, 0, 0, lima) },
		azar:  azar,
	}
	s.pedirCodigo = func(d int) (string, error) {
		*pedidos = append(*pedidos, d)
		return fmt.Sprintf("CCP-P%d-%d", d, len(*pedidos)), nil
	}
	s.e = Estado{Config: configInicial()}
	s.e.Config.Prob = prob
	return s, s.rutas(), pedidos
}

var ipSiguiente int

func pedirCrudo(t *testing.T, h http.Handler, metodo, ruta string, cuerpo any, admin bool, ip string) (int, []byte) {
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
	return w.Code, w.Body.Bytes()
}

func pedir(t *testing.T, h http.Handler, metodo, ruta string, cuerpo any, admin bool, ip string) (int, map[string]any) {
	t.Helper()
	code, b := pedirCrudo(t, h, metodo, ruta, cuerpo, admin, ip)
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	return code, out
}

func inscribir(t *testing.T, h http.Handler, nombre string) (string, map[string]any) {
	t.Helper()
	code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": nombre}, false, "")
	if code != 200 {
		t.Fatalf("inscribir %q: %d %v", nombre, code, out)
	}
	return out["t"].(string), out
}

func jugar(t *testing.T, h http.Handler, tok, eleccion string) (int, map[string]any) {
	t.Helper()
	return pedir(t, h, "POST", "/api/jugar", map[string]string{"t": tok, "eleccion": eleccion}, false, "")
}

func tiroLibre(t *testing.T, h http.Handler, tok, eleccion string) (int, map[string]any) {
	t.Helper()
	return pedir(t, h, "POST", "/api/tiro-libre", map[string]string{"t": tok, "eleccion": eleccion}, false, "")
}

// La probabilidad respeta la configuración y no depende de la elección: con 1
// de 4, 60 000 jugadas aciertan 25 % ± 1,5 por cada opción. Al fallar, el
// árbitro saca una de las OTRAS dos, mitad y mitad, nunca la elegida.
func TestProbabilidad(t *testing.T) {
	const n = 60000
	for _, el := range tarjetas {
		aciertos, otras := 0, map[string]int{}
		for i := 0; i < n; i++ {
			ac, tar := decidir(el, 4, false, azar)
			if ac {
				aciertos++
				if tar != el {
					t.Fatalf("acierto con tarjeta distinta: %q vs %q", tar, el)
				}
				continue
			}
			if tar == el {
				t.Fatalf("al fallar no puede salir lo elegido (%q)", el)
			}
			otras[tar]++
		}
		p := float64(aciertos) / n * 100
		if p < 23.5 || p > 26.5 {
			t.Fatalf("eligiendo %q con 1 de 4 esperaba 25 %% ± 1,5, salió %.2f %%", el, p)
		}
		if len(otras) != 2 {
			t.Fatalf("al fallar deben salir las otras dos: %v", otras)
		}
		for tar, c := range otras {
			q := float64(c) / float64(n-aciertos) * 100
			if q < 48 || q > 52 {
				t.Fatalf("eligiendo %q, %q salió %.2f %% de los fallos (esperaba 50 ± 2)", el, tar, q)
			}
		}
	}
	// Tiro libre con 1 de 2: acierta la mitad, diga sí o no.
	for _, dice := range []bool{true, false} {
		ac := 0
		for i := 0; i < n; i++ {
			a, gol, res := decidirTiroLibre(dice, 2, false, azar)
			if a != (gol == dice) || (gol && res != "gol") || (!gol && res == "gol") {
				t.Fatalf("tiro libre incoherente: dice %v, acierto %v, gol %v, %q", dice, a, gol, res)
			}
			if a {
				ac++
			}
		}
		if p := float64(ac) / n * 100; p < 48.5 || p > 51.5 {
			t.Fatalf("tiro libre 1 de 2 diciendo %v: %.2f %%", dice, p)
		}
	}
	// El valor por defecto es 1 de 250.
	if c := configInicial(); c.Prob != 250 || c.Jugadas != 3 || c.ProbTiroLibre != 2 || c.Cupos50 != 0 {
		t.Fatalf("config inicial: %+v", c)
	}
}

func TestTopeDeJugadas(t *testing.T) {
	s, h, _ := nuevoServidor(t, 250)
	s.azar = func(n int) int { return 1 } // nunca acierta
	tok, _ := inscribir(t, h, "Ana Pérez")
	for i := 1; i <= 3; i++ {
		code, out := jugar(t, h, tok, "roja")
		if code != 200 || out["acierto"] != false || out["tarjeta"] == "roja" || int(out["jugada"].(float64)) != i || int(out["jugadas_restantes"].(float64)) != 3-i {
			t.Fatalf("jugada %d: %d %v", i, code, out)
		}
	}
	if code, out := jugar(t, h, tok, "roja"); code != 409 {
		t.Fatalf("la cuarta jugada debe rechazarse, salió %d %v", code, out)
	}
	if code, _ := jugar(t, h, tok, "verde"); code != 400 {
		t.Fatalf("una elección inválida debe dar 400, salió %d", code)
	}
	if s.e.JugadasTotales != 3 {
		t.Fatalf("jugadas totales: %d", s.e.JugadasTotales)
	}
	code, yo := pedir(t, h, "GET", "/api/yo?t="+tok, nil, false, "")
	if code != 200 || int(yo["jugadas"].(float64)) != 3 || yo["gane"] != false || yo["tiro_libre_disponible"] != true {
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
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Ana"}, false, ""); code != 400 {
		t.Fatalf("sin apellido debe dar 400, salió %d", code)
	}
}

func TestTopePorIP(t *testing.T) {
	_, h, _ := nuevoServidor(t, 250)
	for i := 0; i < topeIPDia; i++ {
		if code, out := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": fmt.Sprintf("Persona Num%d", i)}, false, "1.2.3.4"); code != 200 {
			t.Fatalf("registro %d: %d %v", i, code, out)
		}
	}
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Persona Demas"}, false, "1.2.3.4"); code != 429 {
		t.Fatalf("el registro %d desde la misma IP debe dar 429, salió %d", topeIPDia+1, code)
	}
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "Persona Demas"}, false, "5.6.7.8"); code != 200 {
		t.Fatalf("otra IP sí puede, salió %d", code)
	}
}

// Los ganadores de Claude Code PRO juegan, pero nunca ganan: ni con prob 1 ni
// en el tiro libre.
func TestExcluidoJuegaPeroNoGana(t *testing.T) {
	s, h, pedidos := nuevoServidor(t, 1) // siempre acierta
	s.e.Config.ProbTiroLibre = 1
	s.azar = func(n int) int { return 0 }
	for _, n := range []string{"Ines Jaimes", "jack castillo rojas", "Carlos Saavedra Vad", "JHON PÉREZ", "Paul Huamán Quispe"} {
		tok, out := inscribir(t, h, n)
		if out["excluido"] != true || out["aviso"] != avisoExcluido {
			t.Fatalf("%q debía llegar marcado como excluido: %v", n, out)
		}
		for i := 1; i <= 3; i++ {
			code, r := jugar(t, h, tok, "amarilla")
			if code != 200 || r["acierto"] != false || r["tarjeta"] == "amarilla" {
				t.Fatalf("%q jugada %d no debe acertar: %d %v", n, i, code, r)
			}
		}
		code, r := tiroLibre(t, h, tok, "si")
		if code != 200 || r["acierto"] != false || r["gol"] != false {
			t.Fatalf("%q no debe ganar el tiro libre: %d %v", n, code, r)
		}
	}
	if len(s.e.Ganadores) != 0 || len(*pedidos) != 0 {
		t.Fatalf("ningún excluido gana: %v, pedidos %v", s.e.Ganadores, *pedidos)
	}
	for _, n := range []string{"Carlos Pérez", "Jack Rojas", "Ines Rojas"} {
		if _, out := inscribir(t, h, n); out["excluido"] != false {
			t.Fatalf("%q no está excluido: %v", n, out)
		}
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

// Premios en orden: 100 → 80 → 80 → agotados. Sin premio se sigue jugando.
func TestOrdenDePremios(t *testing.T) {
	s, h, pedidos := nuevoServidor(t, 1) // siempre acierta
	code, est := pedir(t, h, "GET", "/api/estado", nil, false, "")
	if code != 200 || est["prob"] != "1 de 1" || int(est["quedan"].(float64)) != 3 || len(est["premios"].([]any)) != 3 {
		t.Fatalf("estado inicial: %d %v", code, est)
	}
	esperados := []int{100, 80, 80}
	nombres := []string{"John Nuñez", "Rosa Quispe", "Luis Torres"}
	for k, n := range nombres {
		tok, _ := inscribir(t, h, n)
		code, out := jugar(t, h, tok, "roja")
		if code != 200 || out["acierto"] != true || out["tarjeta"] != "roja" || int(out["descuento"].(float64)) != esperados[k] {
			t.Fatalf("ganador %d: %d %v", k+1, code, out)
		}
		if out["codigo"] == "" || out["matricula"] != urlMatricula+out["codigo"].(string) {
			t.Fatalf("código y matrícula: %v", out)
		}
		// Quien ya ganó no sigue jugando ni patea el tiro libre.
		if code, _ := jugar(t, h, tok, "roja"); code != 409 {
			t.Fatalf("tras ganar no se juega, salió %d", code)
		}
		if code, _ := tiroLibre(t, h, tok, "si"); code != 409 {
			t.Fatalf("un ganador de %d %% no patea el tiro libre, salió %d", esperados[k], code)
		}
	}
	if fmt.Sprint(*pedidos) != "[100 80 80]" {
		t.Fatalf("descuentos pedidos a la API: %v", *pedidos)
	}
	// Agotados: el acierto se cuenta, pero sin código ni ganador nuevo.
	s.pedirCodigo = func(int) (string, error) { t.Fatal("no debe pedirse código sin premios"); return "", nil }
	tok, _ := inscribir(t, h, "Mario Paz")
	code, out := jugar(t, h, tok, "nada")
	if _, hay := out["codigo"]; code != 200 || out["acierto"] != true || out["agotados"] != true || hay {
		t.Fatalf("acierto sin premio: %d %v", code, out)
	}
	if code, _ = jugar(t, h, tok, "nada"); code != 200 {
		t.Fatalf("tras acertar sin premio se sigue jugando, salió %d", code)
	}
	if len(s.e.Ganadores) != 3 || s.e.Aciertos != 5 {
		t.Fatalf("ganadores %d, aciertos %d", len(s.e.Ganadores), s.e.Aciertos)
	}
	_, est = pedir(t, h, "GET", "/api/estado", nil, false, "")
	if est["agotados"] != true || int(est["quedan"].(float64)) != 0 {
		t.Fatalf("estado agotado: %v", est)
	}
}

func TestCodigoPendiente(t *testing.T) {
	s, h, _ := nuevoServidor(t, 1)
	s.pedirCodigo = func(int) (string, error) { return "", fmt.Errorf("sin red") }
	tok, _ := inscribir(t, h, "Rosa Quispe")
	code, out := jugar(t, h, tok, "amarilla")
	if code != 200 || out["acierto"] != true || out["codigo"] != "" || out["codigo_pendiente"] != true || int(out["descuento"].(float64)) != 100 {
		t.Fatalf("premio pendiente: %d %v", code, out)
	}
	if _, hay := out["matricula"]; hay {
		t.Fatalf("sin código no hay enlace: %v", out)
	}
	_, yo := pedir(t, h, "GET", "/api/yo?t="+tok, nil, false, "")
	if yo["gane"] != true || yo["codigo_pendiente"] != true {
		t.Fatalf("yo pendiente: %v", yo)
	}
	// El admin lo vuelve a pedir: con la API caída da 502 y sigue pendiente.
	if code, _ := pedir(t, h, "POST", "/api/admin/codigo", map[string]any{"id": 1}, true, ""); code != 502 {
		t.Fatalf("reintento con la API caída: %d", code)
	}
	// Con la API de vuelta, el reintento trae el código con su descuento.
	var pedido int
	s.pedirCodigo = func(d int) (string, error) { pedido = d; return "CCP-REINTENTO", nil }
	code, g := pedir(t, h, "POST", "/api/admin/codigo", map[string]any{"id": 1}, true, "")
	if code != 200 || g["codigo"] != "CCP-REINTENTO" || pedido != 100 {
		t.Fatalf("reintento: %d %v (descuento %d)", code, g, pedido)
	}
	// O lo escribe a mano.
	code, g = pedir(t, h, "POST", "/api/admin/codigo", map[string]any{"id": 1, "codigo": "ccp-manual"}, true, "")
	if code != 200 || g["codigo"] != "CCP-MANUAL" {
		t.Fatalf("completar código: %d %v", code, g)
	}
	_, yo = pedir(t, h, "GET", "/api/yo?t="+tok, nil, false, "")
	if yo["codigo"] != "CCP-MANUAL" || yo["codigo_pendiente"] != false {
		t.Fatalf("yo tras completar: %v", yo)
	}
	if code, _ := pedir(t, h, "POST", "/api/admin/codigo", map[string]any{"id": 9}, true, ""); code != 404 {
		t.Fatalf("id inexistente: %d", code)
	}
}

// La lista pública: solo iniciales, nunca nombres completos ni códigos.
func TestPublicoConIniciales(t *testing.T) {
	s, h, _ := nuevoServidor(t, 1)
	s.e.Config.ProbTiroLibre = 1
	tok, _ := inscribir(t, h, "Rosa Quispe")
	jugar(t, h, tok, "roja")
	s.e.Config.Prob = 1_000_000
	s.azar = func(n int) int {
		if n == 1_000_000 {
			return 5 // la tarjeta nunca acierta
		}
		return 0
	}
	tok2, _ := inscribir(t, h, "Luis Torres")
	for i := 0; i < 3; i++ {
		jugar(t, h, tok2, "roja")
	}
	if code, out := tiroLibre(t, h, tok2, "si"); code != 200 || out["gol"] != true || int(out["descuento"].(float64)) != 85 {
		t.Fatalf("tiro libre: %d %v", code, out)
	}
	code, b := pedirCrudo(t, h, "GET", "/api/estado", nil, false, "")
	cuerpo := string(b)
	if code != 200 {
		t.Fatalf("estado: %d", code)
	}
	for _, prohibido := range []string{"Rosa", "Quispe", "Luis", "Torres", "CCP-", "codigo\"", "token"} {
		if strings.Contains(cuerpo, prohibido) {
			t.Fatalf("la lista pública filtra %q: %s", prohibido, cuerpo)
		}
	}
	var est map[string]any
	_ = json.Unmarshal(b, &est)
	gs := est["ganadores"].([]any)
	g0, g1 := gs[0].(map[string]any), gs[1].(map[string]any)
	if g0["nombre"] != "R. Q." || int(g0["descuento"].(float64)) != 100 || g0["juego"] != "tarjeta" ||
		g1["nombre"] != "L. T." || int(g1["descuento"].(float64)) != 85 || g1["juego"] != "tiro_libre" {
		t.Fatalf("ganadores públicos: %v", gs)
	}
	p0 := est["premios"].([]any)[0].(map[string]any)
	if p0["ganador"] != "R. Q." || p0["entregado"] != true {
		t.Fatalf("premio 1: %v", p0)
	}
	tl := est["tiro_libre"].(map[string]any)
	if int(tl["pateados"].(float64)) != 1 || int(tl["codigos_50"].(float64)) != 1 {
		t.Fatalf("contadores del tiro libre: %v", tl)
	}
	if _, hay := tl["quedan_50"]; hay {
		t.Fatalf("sin tope no se muestran los que quedan: %v", tl)
	}
	// El 50 % no ocupa un puesto del juego principal.
	if int(est["quedan"].(float64)) != 2 {
		t.Fatalf("quedan del principal: %v", est["quedan"])
	}
}

func TestAdmin(t *testing.T) {
	s, h, _ := nuevoServidor(t, 250)
	for _, ruta := range []string{"/api/admin/config", "/api/admin/codigo", "/api/admin/reiniciar"} {
		if code, _ := pedir(t, h, "POST", ruta, map[string]any{}, false, ""); code != 401 {
			t.Fatalf("%s sin clave debe dar 401, salió %d", ruta, code)
		}
	}
	if code, _ := pedir(t, h, "GET", "/api/admin/estado", nil, false, ""); code != 401 {
		t.Fatalf("estado admin sin clave debe dar 401, salió %d", code)
	}
	code, adm := pedir(t, h, "POST", "/api/admin/config", map[string]any{"prob": 100, "jugadas": 5, "premios": []int{100, 80}, "excluidos": []string{"Ana Mia", " "}, "prob_tiro_libre": 3, "cupos_50": 4}, true, "")
	cfg := adm["config"].(map[string]any)
	if code != 200 || int(cfg["jugadas"].(float64)) != 5 || int(adm["quedan"].(float64)) != 2 || len(cfg["excluidos"].([]any)) != 1 ||
		int(cfg["prob_tiro_libre"].(float64)) != 3 || int(cfg["cupos_50"].(float64)) != 4 {
		t.Fatalf("config: %d %v", code, adm)
	}
	for _, malo := range []map[string]any{{"prob": 0}, {"premios": []int{100, 0}}, {"prob_tiro_libre": 0}, {"cupos_50": -1}} {
		if code, _ := pedir(t, h, "POST", "/api/admin/config", malo, true, ""); code != 400 {
			t.Fatalf("%v debe rechazarse, salió %d", malo, code)
		}
	}
	inscribir(t, h, "Ana Pérez")
	code, adm = pedir(t, h, "POST", "/api/admin/reiniciar", nil, true, "")
	if code != 200 || int(adm["jugadasTotales"].(float64)) != 0 || len(s.e.Jugadores) != 0 || s.e.Config.Jugadas != 5 {
		t.Fatalf("reiniciar: %d %v", code, adm)
	}
}

// Tiro libre: se abre solo tras perder las jugadas, una vez, da 50 % y
// respeta el tope cupos_50.
func TestTiroLibre(t *testing.T) {
	s, h, pedidos := nuevoServidor(t, 1_000_000)
	s.azar = func(n int) int {
		if n == 1_000_000 {
			return 7 // la tarjeta nunca acierta
		}
		return 0 // el tiro libre siempre acierta
	}
	tok, _ := inscribir(t, h, "Ana Pérez")
	for i := 1; i <= 3; i++ {
		if code, _ := tiroLibre(t, h, tok, "si"); code != 409 {
			t.Fatalf("con %d jugadas usadas el tiro libre está cerrado, salió %d", i-1, code)
		}
		if code, out := jugar(t, h, tok, "amarilla"); code != 200 || out["acierto"] != false {
			t.Fatalf("jugada %d: %d %v", i, code, out)
		}
	}
	if code, _ := tiroLibre(t, h, tok, "talvez"); code != 400 {
		t.Fatalf("elección inválida: %d", code)
	}
	code, out := tiroLibre(t, h, tok, "no")
	if code != 200 || out["acierto"] != true || out["gol"] != false || out["resultado"] == "gol" || int(out["descuento"].(float64)) != 85 || out["codigo"] == "" {
		t.Fatalf("tiro libre ganado diciendo «no»: %d %v", code, out)
	}
	if fmt.Sprint(*pedidos) != "[85]" {
		t.Fatalf("debió pedirse un código 50 %%: %v", *pedidos)
	}
	if code, _ := tiroLibre(t, h, tok, "si"); code != 409 {
		t.Fatalf("un solo tiro libre por persona, salió %d", code)
	}
	_, yo := pedir(t, h, "GET", "/api/yo?t="+tok, nil, false, "")
	if yo["gane"] != true || yo["juego"] != "tiro_libre" || int(yo["descuento"].(float64)) != 85 || yo["tiro_libre_disponible"] != false {
		t.Fatalf("yo tras el tiro libre: %v", yo)
	}
	// Sin acierto: un solo intento y mensaje de cierre en la página.
	s.azar = func(n int) int { return 1 }
	tok2, _ := inscribir(t, h, "Luis Torres")
	for i := 0; i < 3; i++ {
		jugar(t, h, tok2, "nada")
	}
	code, out = tiroLibre(t, h, tok2, "si")
	if code != 200 || out["acierto"] != false || out["gol"] != false {
		t.Fatalf("tiro libre perdido: %d %v", code, out)
	}
	if code, _ := tiroLibre(t, h, tok2, "no"); code != 409 {
		t.Fatalf("no hay segundo tiro libre, salió %d", code)
	}
	// Tope cupos_50: con 1 y uno ya dado, acertar no da código.
	s.e.Config.Cupos50 = 1
	s.azar = func(n int) int {
		if n == 1_000_000 {
			return 7
		}
		return 0
	}
	tok3, _ := inscribir(t, h, "Mario Paz")
	for i := 0; i < 3; i++ {
		jugar(t, h, tok3, "roja")
	}
	code, out = tiroLibre(t, h, tok3, "si")
	if _, hay := out["codigo"]; code != 200 || out["acierto"] != true || hay || int(out["quedan_50"].(float64)) != 0 {
		t.Fatalf("tiro libre sin cupo 50 %%: %d %v", code, out)
	}
	_, est := pedir(t, h, "GET", "/api/estado", nil, false, "")
	tl := est["tiro_libre"].(map[string]any)
	if int(tl["pateados"].(float64)) != 3 || int(tl["codigos_50"].(float64)) != 1 || int(tl["quedan_50"].(float64)) != 0 {
		t.Fatalf("contadores: %v", tl)
	}
}
