package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// Servidor de prueba con reloj controlable y una API del sorteo de Claude
// fingida que devuelve CCP-<descuento>. Nace ABIERTO (como en la jornada):
// cada test que necesita el acta cierra el sorteo a mano.
func nuevoPrueba(t *testing.T) (*Servidor, *httptest.Server, *time.Time) {
	t.Helper()
	reloj := time.Now()
	s := &Servidor{
		archivo: filepath.Join(t.TempDir(), "estado.json"),
		clave:   "clave-de-prueba-1234",
		porIP:   map[string]int{},
		activas: map[int]corrida{},
		ahora:   func() time.Time { return reloj },
		// azar del medio: dentro del rango 40-70 siempre
		azar: func(n int) int {
			if n <= 1 {
				return 0
			}
			return n / 2
		},
		pedirCodigo: func(d int) (string, error) { return fmt.Sprintf("CCP-%03d", d), nil },
	}
	s.e = Estado{Config: configInicial()}
	s.e.Config.MinMs = 5000
	s.e.Config.MaxMs = 60000
	s.e.Config.Cupos100 = 1
	s.e.Config.Excluidos = []string{"Ana Torres"}
	s.e.Config.Cierre = reloj.Add(6 * time.Hour) // abierto; cierra a medianoche
	s.guardar()
	ts := httptest.NewServer(s.rutas())
	t.Cleanup(ts.Close)
	return s, ts, &reloj
}

// Cierra el sorteo (pasó la medianoche).
func cerrar(s *Servidor, reloj *time.Time) {
	s.e.Config.Cierre = reloj.Add(-time.Minute)
}

func pedir(t *testing.T, ts *httptest.Server, metodo, ruta string, cuerpo any) (int, map[string]any) {
	t.Helper()
	var body *bytes.Reader
	if cuerpo != nil {
		b, err := json.Marshal(cuerpo)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		body = bytes.NewReader(b)
	} else {
		body = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(metodo, ts.URL+ruta, body)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", metodo, ruta, err)
	}
	defer resp.Body.Close()
	out := map[string]any{}
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

func registrar(t *testing.T, ts *httptest.Server, nombre, tel string) string {
	t.Helper()
	code, out := pedir(t, ts, "POST", "/api/inscribir", map[string]string{"nombre": nombre, "telefono": tel})
	if code != 200 {
		t.Fatalf("registro %q: %d %v", nombre, code, out)
	}
	tok, _ := out["t"].(string)
	if tok == "" {
		t.Fatalf("registro sin token: %v", out)
	}
	return tok
}

// Salida de la carrera: el servidor toma el tiempo y corre `ms`.
func salir(t *testing.T, ts *httptest.Server, reloj *time.Time, tok string, ms int) int {
	t.Helper()
	code, out := pedir(t, ts, "POST", "/api/correr", map[string]any{"t": tok})
	if code != 200 {
		t.Fatalf("correr: %d %v", code, out)
	}
	id, _ := out["carrera"].(float64)
	*reloj = reloj.Add(time.Duration(ms) * time.Millisecond)
	return int(id)
}

// Llegada: devuelve la respuesta del cierre de carrera.
func llegar(t *testing.T, ts *httptest.Server, tok string, id, ms, esquivadas, puesto int, cpu []int) map[string]any {
	t.Helper()
	code, out := pedir(t, ts, "POST", "/api/terminar", map[string]any{
		"t": tok, "carrera": id, "tiempo_ms": ms, "esquivadas": esquivadas,
		"vidas": 2, "puesto": puesto, "cpu": cpu,
	})
	if code != 200 {
		t.Fatalf("terminar: %d %v", code, out)
	}
	return out
}

// Carrera completa dentro del sorteo cerrado (lo que ve el acta y el instructor).
func correrCerrada(t *testing.T, s *Servidor, ts *httptest.Server, reloj *time.Time, tok string, ms, esquivadas, puesto int, cpu []int) map[string]any {
	t.Helper()
	id := salir(t, ts, reloj, tok, ms)
	cerrar(s, reloj)
	return llegar(t, ts, tok, id, ms, esquivadas, puesto, cpu)
}

func TestRegistro(t *testing.T) {
	_, ts, _ := nuevoPrueba(t)

	tok := registrar(t, ts, "Luis Ramos", "51986149476")
	if tok == "" {
		t.Fatal("sin token")
	}
	if code, out := pedir(t, ts, "POST", "/api/inscribir", map[string]string{"nombre": "Luis", "telefono": "51986149476"}); code != 400 {
		t.Errorf("nombre sin apellido: esperaba 400, salió %d %v", code, out)
	}
	if code, out := pedir(t, ts, "POST", "/api/inscribir", map[string]string{"nombre": "Luis Ramos", "telefono": "12"}); code != 400 {
		t.Errorf("teléfono corto: esperaba 400, salió %d %v", code, out)
	}
	if code, out := pedir(t, ts, "POST", "/api/inscribir",
		map[string]string{"nombre": "LUIS  RAMOS", "telefono": "+51 986 149 476"}); code != 409 {
		t.Errorf("mismo corredor otra vez: esperaba 409, salió %d %v", code, out)
	}
	// El estado público nunca suelta nombres ni códigos.
	if _, out := pedir(t, ts, "GET", "/api/estado", nil); out["record"] == nil {
		t.Errorf("estado sin récord: %v", out)
	}
}

func TestMejorPuntajeSeLlevaEl100(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Rosa Vega", "51911111111")

	out := correrCerrada(t, s, ts, reloj, tok, 20000, 12, 1, []int{100, 200})

	// 20 s vivos (200) + 12 esquivadas (60)
	if p, _ := out["puntaje"].(float64); int(p) != 260 {
		t.Errorf("puntaje: esperaba 260, salió %v", out["puntaje"])
	}
	premio, _ := out["premio"].(map[string]any)
	if premio == nil {
		t.Fatalf("sin premio al cierre: %v", out)
	}
	if d, _ := premio["descuento"].(float64); int(d) != 100 {
		t.Errorf("descuento: esperaba 100, salió %v", premio["descuento"])
	}
	if c, _ := premio["codigo"].(string); c != "CCP-100" {
		t.Errorf("código: esperaba CCP-100, salió %q", premio["codigo"])
	}
	if out["cupo_100"] != true {
		t.Errorf("no marcó el cupo del 100 %%: %v", out)
	}
	if q, _ := out["quedan_100"].(float64); int(q) != 0 {
		t.Errorf("cupos restantes: esperaba 0, salió %v", out["quedan_100"])
	}
	wa, _ := premio["wa"].(string)
	if !strings.HasPrefix(wa, "https://wa.me/51986149476?text=") {
		t.Errorf("enlace de WhatsApp raro: %q", wa)
	}
	if !strings.Contains(wa, "He%20ganado%20100") || !strings.Contains(wa, "CCP-100") {
		t.Errorf("el mensaje del cupón no viene escrito: %q", wa)
	}
}

func TestElExcluidoGanaEl100DelOtroCurso(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Ana Torres", "51922222222")

	out := correrCerrada(t, s, ts, reloj, tok, 25000, 30, 1, []int{100, 200})
	premio, _ := out["premio"].(map[string]any)
	if premio == nil {
		t.Fatalf("sin premio: %v", out)
	}
	if d, _ := premio["descuento"].(float64); int(d) != 100 {
		t.Errorf("el excluido que gana la carrera debía llevarse el 100 %%, salió %v", premio["descuento"])
	}
	if c, _ := premio["curso"].(string); c != "otro curso del catálogo" {
		t.Errorf("curso del excluido: esperaba «otro curso del catálogo», salió %q", c)
	}
	if out["excluido"] != true {
		t.Errorf("no marcó al excluido al cierre: %v", out)
	}
}

func TestElExcluidoQueNoGanaSacaDescuentoDelOtroCurso(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Ana Torres", "51922222222")

	out := correrCerrada(t, s, ts, reloj, tok, 25000, 30, 2, []int{100, 9000})
	premio, _ := out["premio"].(map[string]any)
	if premio == nil {
		t.Fatalf("sin premio: %v", out)
	}
	if d, _ := premio["descuento"].(float64); int(d) < 40 || int(d) > 70 {
		t.Errorf("descuento fuera de rango: %v", premio["descuento"])
	}
	if c, _ := premio["curso"].(string); c != "otro curso del catálogo" {
		t.Errorf("curso del excluido: esperaba «otro curso del catálogo», salió %q", c)
	}
}

// Los ganadores de una carrera anterior no se inscriben ni corren.
func TestElBloqueadoNoJuega(t *testing.T) {
	s, ts, _ := nuevoPrueba(t)
	tok := registrar(t, ts, "Luis Paredes", "51933333333")
	s.mu.Lock()
	s.e.Config.Bloqueados = []string{"Mario Ccallo", "Luis Paredes"}
	s.e.Config.BloqueadosTel = []string{"51911111111"}
	s.mu.Unlock()

	if code, _ := pedir(t, ts, "POST", "/api/inscribir", map[string]string{"nombre": "Mario Ccallo", "telefono": "51955555555"}); code != 403 {
		t.Errorf("nombre bloqueado: esperaba 403, salió %d", code)
	}
	if code, _ := pedir(t, ts, "POST", "/api/inscribir", map[string]string{"nombre": "Otro Nombre", "telefono": "+51 911 111 111"}); code != 403 {
		t.Errorf("celular bloqueado: esperaba 403, salió %d", code)
	}
	if code, _ := pedir(t, ts, "POST", "/api/correr", map[string]string{"t": tok}); code != 403 {
		t.Errorf("inscrito antes del bloqueo: esperaba 403 al correr, salió %d", code)
	}
	if code, _ := pedir(t, ts, "POST", "/api/inscribir", map[string]string{"nombre": "Mario Perez", "telefono": "51966666666"}); code != 200 {
		t.Errorf("otro Mario sí juega: esperaba 200, salió %d", code)
	}
}

// Un premio por persona: la segunda carrera ya no deja otro, aunque el sorteo
// siga abierto.
func TestUnPremioPorPersona(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Marcos Luna", "51933333333")

	id := salir(t, ts, reloj, tok, 20000)
	llegar(t, ts, tok, id, 20000, 10, 1, []int{10, 20})
	id2 := salir(t, ts, reloj, tok, 20000)
	llegar(t, ts, tok, id2, 20000, 50, 1, []int{1, 2})

	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.e.Ganadores) != 1 {
		t.Errorf("salió más de un premio por persona: %d", len(s.e.Ganadores))
	}
}

func TestElTiempoDelClienteNoManda(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Ivet Rojas", "51944444444")

	// El servidor solo vio 8 s de carrera, aunque el cliente reclame 50 s y
	// 500 obstáculos esquivados.
	out := correrCerrada(t, s, ts, reloj, tok, 8000, 500, 1, []int{0, 0})
	if tm, _ := out["tiempo_ms"].(float64); int(tm) != 8000 {
		t.Errorf("tiempo: esperaba 8000 (lo que corrió), salió %v", out["tiempo_ms"])
	}
	if e, _ := out["esquivadas"].(float64); int(e) != 12 {
		t.Errorf("esquivadas topadas: esperaba 12, salió %v", out["esquivadas"])
	}
	// 8 s + 12 esquivadas = 80 + 60
	if p, _ := out["puntaje"].(float64); int(p) != 140 {
		t.Errorf("puntaje: esperaba 140, salió %v", out["puntaje"])
	}
}

func TestCarreraCortaNoPremia(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Pepe Lazo", "51955555555")

	out := correrCerrada(t, s, ts, reloj, tok, 2000, 2, 1, []int{0, 0})
	if out["premio"] != nil {
		t.Errorf("premió una carrera de 2 s: %v", out["premio"])
	}
	if v, ok := out["puede_premio"]; ok && v != false {
		t.Errorf("prometió premio sin cumplir la duración mínima: %v", out)
	}
}

func TestNoGana100SiLosCpuLeIganPuntaje(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Karl Heinz", "51966666666")

	out := correrCerrada(t, s, ts, reloj, tok, 20000, 10, 1, []int{5000})
	if p, _ := out["puesto"].(float64); int(p) == 1 {
		t.Errorf("declaró primer lugar con un cpu por delante: %v", out)
	}
	if d, _ := out["premio"].(map[string]any)["descuento"].(float64); int(d) == 100 {
		t.Error("el 100 % se fue igual")
	}
}

func TestLaCarreraNoSeTerminaDosVeces(t *testing.T) {
	_, ts, reloj := nuevoPrueba(t)
	tok := registrar(t, ts, "Nadia Soto", "51977777777")

	id := salir(t, ts, reloj, tok, 20000)
	llegada := map[string]any{"t": tok, "carrera": id, "tiempo_ms": 20000,
		"esquivadas": 10, "vidas": 1, "puesto": 3, "cpu": []int{1, 2}}
	if code, out := pedir(t, ts, "POST", "/api/terminar", llegada); code != 200 {
		t.Fatalf("primer cierre: %d %v", code, out)
	}
	if code, out := pedir(t, ts, "POST", "/api/terminar", llegada); code != 409 {
		t.Errorf("segundo cierre: esperaba 409, salió %d %v", code, out)
	}
}

func TestQRDelCupon(t *testing.T) {
	_, ts, _ := nuevoPrueba(t)
	wa := "https://wa.me/51986149476?text=" + "He%20ganado%2060%20%25%20CCP-ABC"
	req, _ := http.NewRequest("GET", ts.URL+"/api/qr?u="+wa, nil)
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatalf("qr: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 || resp.Header.Get("Content-Type") != "image/png" {
		t.Errorf("qr: %d %s", resp.StatusCode, resp.Header.Get("Content-Type"))
	}
	if resp.ContentLength <= 0 {
		t.Error("qr vacío")
	}
	// Solo enlaces de wa.me: nada de QR para cualquier URL.
	if code, out := pedir(t, ts, "GET", "/api/qr?u=https://ejemplo.com/phishing", nil); code != 400 {
		t.Errorf("qr ajeno: esperaba 400, salió %d %v", code, out)
	}
}

// El que ya ganó en Claude queda excluido de cualquier forma: mientras el
// sorteo está abierto su carril es privado y al cierre su premio es el
// descuento de OTRO curso.
func TestSincronizaExcluidosDelSorteoDeClaude(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)

	// El sorteo de Claude responde con su lista, sus códigos y sus participantes.
	falso := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Clave") != "clave-del-sorteo" {
			w.WriteHeader(401)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"config": map[string]any{
				"excluidos":    []string{"Ganador Viejo"},
				"excluidosTel": []string{"51900000001"},
			},
			"codigos": []map[string]any{
				{"codigo": "CCP-111", "descuento": 100, "numero": 7},
				{"codigo": "CCP-222", "descuento": 60, "numero": 0}, // cortesía: no excluye a nadie
			},
			"participantes": []map[string]any{
				{"numero": 7, "nombre": "Gana Dorado", "telefono": "51900000002"},
				{"numero": 9, "nombre": "Sin Premio", "telefono": "51900000003"},
			},
		})
	}))
	defer falso.Close()

	s.sincronizarExcluidos(falso.URL, "clave-del-sorteo")

	// El que ya ganó allá corre, pero no se lleva el 100 %.
	tok := registrar(t, ts, "Gana Dorado", "51900000002")
	id := salir(t, ts, reloj, tok, 30000)
	llegar(t, ts, tok, id, 30000, 20, 1, []int{10, 20})

	// El celular excluido también cuenta, aunque venga con otro nombre.
	tok2 := registrar(t, ts, "Nombre Diferente", "51900000001")
	id2 := salir(t, ts, reloj, tok2, 30000)
	llegar(t, ts, tok2, id2, 30000, 20, 1, []int{10, 20})

	// Quien no ganó allá sigue siendo elegible para el 100 %.
	tok3 := registrar(t, ts, "Sin Premio", "51900000003")
	id3 := salir(t, ts, reloj, tok3, 30000)
	llegar(t, ts, tok3, id3, 30000, 20, 1, []int{10, 20})

	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.e.Ganadores) != 3 {
		t.Fatalf("faltan premios: %d", len(s.e.Ganadores))
	}
	primero, segundo, tercero := s.e.Ganadores[0], s.e.Ganadores[1], s.e.Ganadores[2]
	// El ganador anterior de Claude que gana la carrera se lleva el 100 % del otro curso.
	if primero.Descuento != 100 || !primero.Excluido || primero.Curso != "otro curso del catálogo" {
		t.Errorf("el ganador anterior de Claude no quedó excluido: %+v", primero)
	}
	// El cupo del otro curso ya se dio: el segundo excluido saca descuento.
	if segundo.Descuento == 100 || !segundo.Excluido || segundo.Curso != "otro curso del catálogo" {
		t.Errorf("el celular excluido no marcó al corredor: %+v", segundo)
	}
	if tercero.Descuento != 100 {
		t.Errorf("un no ganador perdió el cupo: %+v", tercero)
	}
}

// ---------- sorteo abierto: el participante solo ve su posición ----------

// Mientras el sorteo está abierto nadie ve premios: ni el corredor (ni siquiera
// que ya quedó premiado), ni el acta pública. El cupón se emite igual y queda
// guardado para el instructor.
func TestAbiertoSoloVeSuPosicion(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)

	tok := registrar(t, ts, "Rosa Vega", "51911111111")
	id := salir(t, ts, reloj, tok, 20000)
	out := llegar(t, ts, tok, id, 20000, 12, 1, []int{100, 200})

	for _, campo := range []string{"premio", "cupo_100", "ya_premiado", "excluido", "quedan_100"} {
		if v, ok := out[campo]; ok {
			t.Errorf("abierto reveló %q = %v", campo, v)
		}
	}
	if out["cerrado"] != false {
		t.Errorf("cerrado debería ser false: %v", out["cerrado"])
	}
	if p, _ := out["puesto"].(float64); int(p) != 1 {
		t.Errorf("no vio su posición en la carrera: %v", out["puesto"])
	}
	if a, _ := out["anuncio"].(string); !strings.Contains(a, "cierra a las") {
		t.Errorf("falta el aviso del cierre: %q", out["anuncio"])
	}
	if v, _ := out["valida"].(bool); !v {
		t.Errorf("su carrera válida no quedó marcada: %v", out)
	}

	// ni el acta ni su ficha dicen algo de premios
	_, estado := pedir(t, ts, "GET", "/api/estado", nil)
	if g, _ := estado["ganadores"].([]any); len(g) != 0 {
		t.Errorf("el acta publicó premios con el sorteo abierto: %v", estado["ganadores"])
	}
	if _, ok := estado["quedan_100"]; ok {
		t.Errorf("el acta publicó los cupos con el sorteo abierto: %v", estado["quedan_100"])
	}
	code, yo := pedir(t, ts, "GET", "/api/yo?t="+tok, nil)
	if code != 200 {
		t.Fatalf("ficha: %d %v", code, yo)
	}
	if yo["premio"] != nil || yo["gane"] != nil {
		t.Errorf("la ficha del corredor reveló su premio: %v", yo)
	}

	// el cupón SÍ se emitió en silencio
	s.mu.Lock()
	n, codigo := len(s.e.Ganadores), ""
	if n > 0 {
		codigo = s.e.Ganadores[0].Codigo
	}
	s.mu.Unlock()
	if n != 1 || codigo == "" {
		t.Errorf("el cupón no se emitió en silencio: %d premios, código %q", n, codigo)
	}
}

// Al pasar la medianoche se revelan los premios y ya no se corre ni se
// registra nadie nuevo.
func TestElPremioSeRevelaAlCierre(t *testing.T) {
	s, ts, reloj := nuevoPrueba(t)

	tok := registrar(t, ts, "Rosa Vega", "51911111111")
	id := salir(t, ts, reloj, tok, 20000)
	abierto := llegar(t, ts, tok, id, 20000, 12, 1, []int{100, 200})
	if abierto["premio"] != nil {
		t.Fatalf("abierto ya reveló el premio: %v", abierto["premio"])
	}

	cerrar(s, reloj) // pasó la medianoche

	_, yo := pedir(t, ts, "GET", "/api/yo?t="+tok, nil)
	premio, _ := yo["premio"].(map[string]any)
	if premio == nil {
		t.Fatalf("cerrado no reveló el premio: %v", yo)
	}
	if d, _ := premio["descuento"].(float64); int(d) != 100 {
		t.Errorf("descuento revelado: %v", premio["descuento"])
	}
	wa, _ := premio["wa"].(string)
	if !strings.Contains(wa, "He%20ganado%20100") {
		t.Errorf("el QR no puede armarse sin el mensaje del cupón: %q", wa)
	}

	_, estado := pedir(t, ts, "GET", "/api/estado", nil)
	if estado["cerrado"] != true {
		t.Errorf("el estado no marcó el cierre: %v", estado["cerrado"])
	}
	if g, _ := estado["ganadores"].([]any); len(g) != 1 {
		t.Errorf("el acta no se publicó al cierre: %v", estado["ganadores"])
	}
	if code, out := pedir(t, ts, "POST", "/api/correr", map[string]any{"t": tok}); code != 409 {
		t.Errorf("se siguió corriendo después del cierre: %d %v", code, out)
	}
	if code, out := pedir(t, ts, "POST", "/api/inscribir",
		map[string]string{"nombre": "Nuevo Corredor", "telefono": "51955555559"}); code != 409 {
		t.Errorf("se siguió registrando después del cierre: %d %v", code, out)
	}
}

// El cierre cae a medianoche hora de Lima, todos los días.
func TestMedianocheLima(t *testing.T) {
	m := medianocheLima(time.Date(2026, 10, 29, 23, 30, 0, 0, lima))
	if m.Hour() != 0 || m.Day() != 30 {
		t.Errorf("esperaba el 30 a las 00:00 Lima, salió %s", m)
	}
	m2 := medianocheLima(time.Date(2026, 10, 30, 0, 0, 1, 0, lima))
	if m2.Day() != 31 {
		t.Errorf("pasada la medianoche debe ser la del día siguiente, salió %s", m2)
	}
	if (Config{Cierre: m}).cerrada(m.Add(time.Second)) != true {
		t.Error("no detectó el cierre por hora")
	}
	if (Config{Cerrado: true}).cerrada(time.Now()) != true {
		t.Error("no detectó el cierre manual")
	}
	if (Config{}).cerrada(time.Now()) != false {
		t.Error("sin cierre configurado no debería estar cerrado")
	}
}

func TestElAdminVeaTodoYElRestoNo(t *testing.T) {
	s, ts, _ := nuevoPrueba(t)
	tok := registrar(t, ts, "Omar Quispe", "51988888888")

	req, _ := http.NewRequest("GET", ts.URL+"/api/admin/estado", nil)
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatalf("admin: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != 401 {
		t.Errorf("admin sin clave: esperaba 401, salió %d", resp.StatusCode)
	}

	req, _ = http.NewRequest("GET", ts.URL+"/api/admin/estado", nil)
	req.Header.Set("X-Clave", s.clave)
	resp, err = ts.Client().Do(req)
	if err != nil {
		t.Fatalf("admin con clave: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Errorf("admin con clave: esperaba 200, salió %d", resp.StatusCode)
	}
	if tok == "" {
		t.Error("sin token de prueba")
	}
}
