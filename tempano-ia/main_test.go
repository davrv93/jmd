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

func nuevoServidor(t *testing.T) (*Servidor, http.Handler, *reloj, *[]int) {
	t.Helper()
	pedidos := &[]int{}
	rl := &reloj{t: time.Date(2026, 10, 28, 19, 30, 0, 0, lima)}
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

func partida(t *testing.T, h http.Handler, tok string) string {
	t.Helper()
	code, out := pedir(t, h, "POST", "/api/partida", map[string]string{"t": tok}, false)
	if code != 200 {
		t.Fatalf("partida: %d %v", code, out)
	}
	return out["partida"].(string)
}

func pregunta(t *testing.T, h http.Handler, tok, pid string, ronda int) (int, map[string]any) {
	t.Helper()
	return pedir(t, h, "POST", "/api/pregunta", map[string]any{"t": tok, "partida": pid, "ronda": ronda}, false)
}

func responderQ(t *testing.T, h http.Handler, tok, pid string, qid, opcion int) (int, map[string]any) {
	t.Helper()
	return pedir(t, h, "POST", "/api/responder", map[string]any{"t": tok, "partida": pid, "qid": qid, "opcion": opcion}, false)
}

func terminar(t *testing.T, h http.Handler, tok, pid string, rondas, segundos int) (int, map[string]any) {
	t.Helper()
	return pedir(t, h, "POST", "/api/terminar", map[string]any{"t": tok, "partida": pid, "rondas": rondas, "segundos": segundos}, false)
}

// Índice barajado de la opción correcta, leído del estado interno.
func correctaDe(s *Servidor, tok string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	j := s.e.Jugadores[s.jugador(tok)]
	p := j.Partidas[len(j.Partidas)-1]
	return p.Preguntas[len(p.Preguntas)-1].Correcta
}

// El banco: al menos 40, ids únicos, tres opciones distintas y no vacías,
// explicación y tema.
func TestBanco(t *testing.T) {
	if len(banco) < 40 {
		t.Fatalf("solo %d preguntas", len(banco))
	}
	ids := map[int]bool{}
	for _, b := range banco {
		if ids[b.ID] {
			t.Fatalf("id repetido %d", b.ID)
		}
		ids[b.ID] = true
		if b.Texto == "" || b.Explicacion == "" || b.Tema == "" {
			t.Fatalf("pregunta incompleta %d", b.ID)
		}
		vistas := map[string]bool{}
		for _, o := range b.Opciones {
			if strings.TrimSpace(o) == "" || vistas[o] {
				t.Fatalf("opciones vacías o repetidas en %d", b.ID)
			}
			vistas[o] = true
		}
	}
}

// La pregunta que sale por la API no trae la respuesta: ni el índice, ni el
// texto de la correcta marcado, ni la explicación, ni el orden interno.
func TestPreguntaNoFiltraRespuesta(t *testing.T) {
	_, h, _, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	pid := partida(t, h, tok)
	code, b := pedirCrudo(t, h, "POST", "/api/pregunta", map[string]any{"t": tok, "partida": pid, "ronda": 1}, false)
	if code != 200 {
		t.Fatalf("pregunta: %d %s", code, b)
	}
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	for _, k := range []string{"correcta", "respuesta", "orden", "explicacion", "texto_respuesta"} {
		if _, ok := out[k]; ok {
			t.Fatalf("la pregunta filtra %q: %s", k, b)
		}
	}
	q := preguntaPorID(int(out["qid"].(float64)))
	if strings.Contains(string(b), q.Explicacion) {
		t.Fatal("la explicación sale antes de responder")
	}
	if len(out["opciones"].([]any)) != 3 {
		t.Fatalf("opciones: %v", out["opciones"])
	}
	// El estado público y el de la persona tampoco la traen.
	_, pub := pedirCrudo(t, h, "GET", "/api/estado", nil, false)
	_, yo := pedirCrudo(t, h, "GET", "/api/yo?t="+tok, nil, false)
	for _, x := range [][]byte{pub, yo} {
		if strings.Contains(string(x), "correcta") || strings.Contains(string(x), q.Opciones[0]) {
			t.Fatalf("respuesta filtrada en %s", x)
		}
	}
}

// Las opciones se barajan: en muchas preguntas, la correcta no está siempre
// en el mismo lugar.
func TestBarajado(t *testing.T) {
	s, h, _, _ := nuevoServidor(t)
	lugares := map[int]int{}
	for k := 0; k < 20; k++ {
		tok := inscribir(t, h, fmt.Sprintf("Persona Numero%c", 'A'+k))
		pid := partida(t, h, tok)
		for r := 1; r <= 3; r++ {
			if code, _ := pregunta(t, h, tok, pid, r); code != 200 {
				t.Fatal("pregunta")
			}
			lugares[correctaDe(s, tok)]++
		}
	}
	if len(lugares) < 3 {
		t.Fatalf("la correcta cae siempre en %v", lugares)
	}
}

// Responder bien suma acierto y devuelve la respuesta para aprender; mal o
// tarde, no. Una pregunta no se responde dos veces.
func TestResponder(t *testing.T) {
	s, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	pid := partida(t, h, tok)
	_, q := pregunta(t, h, tok, pid, 1)
	qid := int(q["qid"].(float64))
	bien := correctaDe(s, tok)
	code, out := responderQ(t, h, tok, pid, qid, bien)
	if code != 200 || out["correcta"] != true || int(out["respuesta"].(float64)) != bien || out["explicacion"] == "" {
		t.Fatalf("bien: %d %v", code, out)
	}
	if code, _ := responderQ(t, h, tok, pid, qid, bien); code != 409 {
		t.Fatalf("doble respuesta: %d", code)
	}
	// Mal.
	_, q = pregunta(t, h, tok, pid, 1)
	mal := (correctaDe(s, tok) + 1) % 3
	_, out = responderQ(t, h, tok, pid, int(q["qid"].(float64)), mal)
	if out["correcta"] != false {
		t.Fatalf("mal: %v", out)
	}
	// Tercera en la misma ronda: no hay más rescates.
	if code, _ := pregunta(t, h, tok, pid, 1); code != 409 {
		t.Fatalf("tercer rescate en la ronda: %d", code)
	}
	// Tarde (más de 12 s + gracia) cuenta como fallada aunque acierte.
	_, q = pregunta(t, h, tok, pid, 2)
	rl.pasar(16 * time.Second)
	_, out = responderQ(t, h, tok, pid, int(q["qid"].(float64)), correctaDe(s, tok))
	if out["correcta"] != false || out["tarde"] != true {
		t.Fatalf("tarde: %v", out)
	}
	if out["aciertos"].(float64) != 1 {
		t.Fatalf("aciertos: %v", out["aciertos"])
	}
}

// En una partida no se repite ninguna pregunta.
func TestSinRepetir(t *testing.T) {
	s, h, _, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	pid := partida(t, h, tok)
	for r := 1; r <= 3; r++ {
		for k := 0; k < rescatesPorRonda; k++ {
			if code, _ := pregunta(t, h, tok, pid, r); code != 200 {
				t.Fatal("pregunta")
			}
		}
	}
	// Forzar muchas más directamente para ver que emitir no repite.
	s.mu.Lock()
	defer s.mu.Unlock()
	p := &s.e.Jugadores[0].Partidas[0]
	for len(p.Preguntas) < len(banco) {
		p.Preguntas = append(p.Preguntas, s.emitir(p, 1))
	}
	vistas := map[int]bool{}
	for _, q := range p.Preguntas {
		if vistas[q.QID] {
			t.Fatalf("pregunta %d repetida", q.QID)
		}
		vistas[q.QID] = true
	}
}

// Topes del puntaje: rondas 0–3, segundos ≤ tiempo real y ≤ 180, aciertos
// solo los que validó el servidor; un solo puntaje por partida.
func TestTopesPuntaje(t *testing.T) {
	s, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	pid := partida(t, h, tok)
	_, q := pregunta(t, h, tok, pid, 1)
	responderQ(t, h, tok, pid, int(q["qid"].(float64)), correctaDe(s, tok))
	rl.pasar(40 * time.Second)
	code, out := terminar(t, h, tok, pid, 99, 9999)
	if code != 200 {
		t.Fatalf("terminar: %d %v", code, out)
	}
	p := out["partida"].(map[string]any)
	if p["rondas"].(float64) != 3 || p["segundos"].(float64) != 40 || p["aciertos"].(float64) != 1 {
		t.Fatalf("topes: %v", p)
	}
	if p["puntos"].(float64) != float64(puntaje(3, 40, 1)) {
		t.Fatalf("puntos: %v", p["puntos"])
	}
	if code, _ := terminar(t, h, tok, pid, 3, 40); code != 409 {
		t.Fatalf("segundo puntaje: %d", code)
	}
	// Ganar 3 rondas en 10 s es imposible: quedan 1.
	pid = partida(t, h, tok)
	rl.pasar(10 * time.Second)
	_, out = terminar(t, h, tok, pid, 3, -5)
	p = out["partida"].(map[string]any)
	if p["rondas"].(float64) != 1 || p["segundos"].(float64) != 0 {
		t.Fatalf("rondas imposibles: %v", p)
	}
	// Muchísimo tiempo: segundos ≤ 180.
	r, sg := acotar(2, 500, time.Hour)
	if r != 2 || sg != 180 {
		t.Fatalf("acotar: %d %d", r, sg)
	}
}

// El mejor puntaje es el que queda; una partida peor no lo baja.
func TestMejorPuntaje(t *testing.T) {
	_, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	pid := partida(t, h, tok)
	rl.pasar(2 * time.Minute)
	terminar(t, h, tok, pid, 2, 100)
	pid = partida(t, h, tok)
	rl.pasar(2 * time.Minute)
	_, out := terminar(t, h, tok, pid, 0, 20)
	if out["mejor"].(float64) != float64(puntaje(2, 100, 0)) || out["record"] != false {
		t.Fatalf("mejor: %v", out)
	}
}

// Máximo 5 partidas por token y día; al día siguiente vuelven.
func TestTopePartidasDia(t *testing.T) {
	_, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	for k := 0; k < 5; k++ {
		partida(t, h, tok)
	}
	if code, _ := pedir(t, h, "POST", "/api/partida", map[string]string{"t": tok}, false); code != 429 {
		t.Fatalf("sexta partida: %d", code)
	}
	rl.pasar(24 * time.Hour)
	partida(t, h, tok)
}

// Empezar otra partida deja la anterior abandonada: ya no acepta puntaje.
func TestAbandonada(t *testing.T) {
	_, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ana Pérez")
	p1 := partida(t, h, tok)
	partida(t, h, tok)
	rl.pasar(time.Minute)
	if code, _ := terminar(t, h, tok, p1, 3, 60); code != 409 {
		t.Fatalf("abandonada aceptó puntaje: %d", code)
	}
	// Vencida.
	_, h2, rl2, _ := nuevoServidor(t)
	tok = inscribir(t, h2, "Ana Pérez")
	p := partida(t, h2, tok)
	rl2.pasar(16 * time.Minute)
	if code, _ := terminar(t, h2, tok, p, 1, 60); code != 409 {
		t.Fatalf("vencida aceptó puntaje: %d", code)
	}
}

func TestCensurar(t *testing.T) {
	casos := map[string]string{
		"Ines Jaimes":           "I. J.",
		"Ana de la Cruz":        "A. C.",
		"  josé   del  Río  ":   "J. R.",
		"María Y Los Ángeles":   "M. Á.",
		"Carlos Saavedra Vad":   "C. S. V.",
		"lucía de las Mercedes": "L. M.",
	}
	for in, want := range casos {
		if got := censurar(in); got != want {
			t.Errorf("censurar(%q) = %q, quiero %q", in, got, want)
		}
	}
}

// Lo público solo trae iniciales: nunca el nombre completo ni códigos.
func TestPublicoSoloIniciales(t *testing.T) {
	_, h, rl, _ := nuevoServidor(t)
	tok := inscribir(t, h, "Ines Jaimes")
	pid := partida(t, h, tok)
	rl.pasar(time.Minute)
	terminar(t, h, tok, pid, 1, 50)
	for _, ruta := range []string{"/api/estado", "/api/estado?pantalla=1"} {
		_, b := pedirCrudo(t, h, "GET", ruta, nil, false)
		if strings.Contains(string(b), "Ines") || strings.Contains(string(b), "Jaimes") || strings.Contains(string(b), tok) {
			t.Fatalf("%s filtra el nombre o el token: %s", ruta, b)
		}
		if !strings.Contains(string(b), "I. J.") {
			t.Fatalf("%s sin iniciales: %s", ruta, b)
		}
	}
}

// La pantalla grande trae hasta 15; la normal, 10.
func TestTopesRanking(t *testing.T) {
	_, h, rl, _ := nuevoServidor(t)
	for k := 0; k < 18; k++ {
		tok := inscribir(t, h, fmt.Sprintf("Persona Numero%c", 'A'+k))
		pid := partida(t, h, tok)
		rl.pasar(30 * time.Second)
		terminar(t, h, tok, pid, 0, k)
	}
	_, a := pedir(t, h, "GET", "/api/estado", nil, false)
	_, b := pedir(t, h, "GET", "/api/estado?pantalla=1", nil, false)
	if len(a["ranking"].([]any)) != 10 || len(b["ranking"].([]any)) != 15 {
		t.Fatalf("ranking: %d %d", len(a["ranking"].([]any)), len(b["ranking"].([]any)))
	}
	primero := b["ranking"].([]any)[0].(map[string]any)
	if primero["puntos"].(float64) != float64(puntaje(0, 17, 0)) {
		t.Fatalf("orden: %v", primero)
	}
}

// Nombres: obligatorio nombre y apellido; repetido no entra.
func TestInscribir(t *testing.T) {
	_, h, _, _ := nuevoServidor(t)
	for _, n := range []string{"", "Ana", "<script>x</script> y", strings.Repeat("a ", 30)} {
		if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": n}, false); code != 400 {
			t.Fatalf("nombre %q aceptado: %d", n, code)
		}
	}
	inscribir(t, h, "Ana Pérez")
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": "ana  pérez"}, false); code != 409 {
		t.Fatalf("repetido: %d", code)
	}
}

// Desde el LIVE la cuenta del LMS identifica: la misma cuenta recupera su token
// desde otro equipo, y dos cuentas distintas pueden tener el mismo nombre.
func TestInscribirCuentaLMS(t *testing.T) {
	_, h, _, _ := nuevoServidor(t)
	tokDe := func(nombre, cuenta string) string {
		code, r := pedir(t, h, "POST", "/api/inscribir", map[string]string{"nombre": nombre, "cuenta": cuenta}, false)
		if code != 200 {
			t.Fatalf("inscribir %q/%q: %d %v", nombre, cuenta, code, r)
		}
		return r["t"].(string)
	}
	a := tokDe("David Roncal", "u-1")
	if b := tokDe("David Roncal", "u-1"); b != a {
		t.Fatal("la misma cuenta debe recuperar su token")
	}
	if c := tokDe("David Roncal", "u-2"); c == a {
		t.Fatal("otra cuenta con el mismo nombre debe ser otro jugador")
	}
}

// Admin: sin clave no entra; sin premios, cerrar no pide códigos; con
// premios, el código lo ve solo el ganador y nunca sale en lo público.
func TestAdminYPremios(t *testing.T) {
	_, h, rl, pedidos := nuevoServidor(t)
	if code, _ := pedir(t, h, "GET", "/api/admin/estado", nil, false); code != 401 {
		t.Fatalf("admin sin clave: %d", code)
	}
	tok := inscribir(t, h, "Ana Pérez")
	pid := partida(t, h, tok)
	rl.pasar(time.Minute)
	terminar(t, h, tok, pid, 1, 30)
	if code, _ := pedir(t, h, "POST", "/api/admin/cerrar", nil, true); code != 200 {
		t.Fatal("cerrar")
	}
	if len(*pedidos) != 0 {
		t.Fatalf("sin premios pidió códigos: %v", *pedidos)
	}
	if code, _ := pedir(t, h, "POST", "/api/partida", map[string]string{"t": tok}, false); code != 409 {
		t.Fatalf("partida con el juego cerrado: %d", code)
	}
	// Reabrir y activar un premio.
	pedir(t, h, "POST", "/api/admin/abrir", nil, true)
	if code, out := pedir(t, h, "POST", "/api/admin/config", map[string]any{"premios": []int{100}}, true); code != 200 {
		t.Fatalf("config: %d %v", code, out)
	}
	pedir(t, h, "POST", "/api/admin/cerrar", nil, true)
	if len(*pedidos) != 1 {
		t.Fatalf("pedidos: %v", *pedidos)
	}
	_, yo := pedir(t, h, "GET", "/api/yo?t="+tok, nil, false)
	if yo["gane"] != true || yo["codigo"] == "" {
		t.Fatalf("ganador sin código: %v", yo)
	}
	_, pub := pedirCrudo(t, h, "GET", "/api/estado", nil, false)
	if strings.Contains(string(pub), "CCP-") || strings.Contains(string(pub), "Pérez") {
		t.Fatalf("lo público filtra el código o el nombre: %s", pub)
	}
}

// Las páginas se sirven.
func TestPaginas(t *testing.T) {
	_, h, _, _ := nuevoServidor(t)
	for _, r := range []string{"/", "/ranking", "/static/tempano.js", "/static/fisica.js", "/static/base.css"} {
		if code, _ := pedirCrudo(t, h, "GET", r, nil, false); code != 200 {
			t.Fatalf("%s: %d", r, code)
		}
	}
}

// La sala de clase (/clase/) es otro juego: inscribirse ahí con la cuenta del LMS no aparece en el público,
// acepta el nombre que mande el LMS, no tiene premios y no se queda sin partidas a la sexta.
func TestSalaClase(t *testing.T) {
	pub, _, _, _ := nuevoServidor(t)
	cla, _, _, _ := nuevoServidor(t)
	cla.clase = true
	cla.e = Estado{Config: configClase()}
	h := rutasConClase(pub, cla)
	code, yo := pedir(t, h, "POST", "/clase/api/inscribir", map[string]any{"nombre": "davrv93", "cuenta": "u-77"}, false)
	if code != 200 || yo["nombre"] != "davrv93" {
		t.Fatalf("inscribir en clase: %d %v", code, yo)
	}
	tok := yo["t"].(string)
	for k := 0; k < 6; k++ {
		if code, out := pedir(t, h, "POST", "/clase/api/partida", map[string]any{"t": tok}, false); code != 200 {
			t.Fatalf("partida %d en clase: %d %v", k+1, code, out)
		}
	}
	_, est := pedir(t, h, "GET", "/clase/api/estado", nil, false)
	if est["clase"] != true || est["inscritos"].(float64) != 1 || est["partidas_dia"].(float64) != 99 || len(est["premios"].([]any)) != 0 {
		t.Fatalf("estado de clase: %v", est)
	}
	_, est = pedir(t, h, "GET", "/api/estado", nil, false)
	if est["clase"] != false || est["inscritos"].(float64) != 0 {
		t.Fatalf("el público no debe ver la clase: %v", est)
	}
	// El token de clase no sirve en el público, y la misma cuenta entra al público como otra persona.
	if code, _ := pedir(t, h, "GET", "/api/yo?t="+tok, nil, false); code != 404 {
		t.Fatalf("token de clase en el público: %d", code)
	}
	// En el público el nombre sigue siendo obligatorio con apellido.
	if code, _ := pedir(t, h, "POST", "/api/inscribir", map[string]any{"nombre": "davrv93", "cuenta": "u-77"}, false); code != 400 {
		t.Fatalf("nombre suelto en el público: %d", code)
	}
	if n := nombreClase("  <!!> ?? ", "abc123456"); n != "Alumno 3456" {
		t.Fatalf("nombre vacío: %q", n)
	}
	if code, _ := pedirCrudo(t, h, "GET", "/clase/", nil, false); code != 200 {
		t.Fatalf("página de clase: %d", code)
	}
}
