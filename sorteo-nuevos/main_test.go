package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"
)

const claveDePrueba = "clave-solo-para-pruebas"

func sorteoDePrueba(t *testing.T, cfg Config) *Sorteo {
	t.Helper()
	s, err := nuevoSorteo(cfg, filepath.Join(t.TempDir(), "p.json"), claveDePrueba)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func configBase(t *testing.T) Config {
	t.Helper()
	cfg, err := leerConfig(configPorDefecto)
	if err != nil {
		t.Fatal(err)
	}
	cfg.MaxPorIPDia = 1 << 30
	return cfg
}

func numero(i int) string { return "9" + strings.Repeat("0", 8-len(itoa(i))) + itoa(i) }

func itoa(i int) string {
	b, _ := json.Marshal(i)
	return string(b)
}

func TestConfigPorDefecto(t *testing.T) {
	cfg, err := leerConfig(configPorDefecto)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.PesoSinPremio != 0 {
		t.Fatal("todas las cápsulas deben tener premio")
	}
	for _, p := range cfg.Premios {
		if p.Descuento < 20 || p.Descuento > 50 {
			t.Fatalf("descuento %d fuera de 20 a 50 %%", p.Descuento)
		}
	}
	if cfg.Premios[0].Descuento != 20 || cfg.Premios[0].Tope != 0 {
		t.Fatal("el 20 % debe existir y no tener tope: así el sorteo nunca se queda sin premio")
	}
}

func TestCatalogoDeCursos(t *testing.T) {
	web, _ := fs.Sub(webFS, "web")
	cs, err := leerCursos(cursosJSON, web)
	if err != nil {
		t.Fatal(err)
	}
	if len(cs) != 1 || cs[0].Slug != "seguridad-codificacion-ia" {
		t.Fatalf("solo %d cursos", len(cs))
	}
	conPrecio, gratis, porWhatsApp := 0, 0, 0
	for _, c := range cs {
		if c.Bajada == "" || len(c.Aprenderas) < 2 || len(c.Fechas) == 0 || c.PrecioTexto == "" {
			t.Fatalf("%s: ficha incompleta", c.Slug)
		}
		switch {
		case c.Soles == nil:
			porWhatsApp++
		case *c.Soles == 0:
			gratis++
		default:
			conPrecio++
		}
	}
	if conPrecio == 0 {
		t.Fatal("ningún curso tiene precio")
	}
	t.Logf("%d con precio, %d gratis, %d con precio por WhatsApp", conPrecio, gratis, porWhatsApp)
	// un curso sin imagen debe frenar el arranque, no fallar al abrir el brochure
	if _, err := leerCursos([]byte(`[{"slug":"x","titulo":"X","brochure":"no-existe"}]`), web); err == nil {
		t.Fatal("debía rechazar un brochure que no existe")
	}
	if _, err := leerCursos([]byte(`[{"slug":"x","titulo":"X","brochure":"../../main"}]`), web); err == nil {
		t.Fatal("debía rechazar un nombre de brochure con ruta")
	}
}

func TestConfigRechazaErrores(t *testing.T) {
	for _, malo := range []string{
		`{"premios":[],"dias_vigencia":7,"max_por_ip_dia":5,"whatsapp":"51"}`,
		`{"premios":[{"descuento":70,"peso":0,"tope":0}],"dias_vigencia":7,"max_por_ip_dia":5,"whatsapp":"51"}`,
		`{"premios":[{"descuento":170,"peso":1,"tope":0}],"dias_vigencia":7,"max_por_ip_dia":5,"whatsapp":"51"}`,
		`{"premios":[{"descuento":70,"peso":1,"tope":0}],"dias_vigencia":0,"max_por_ip_dia":5,"whatsapp":"51"}`,
		`{"premios":[{"descuento":70,"peso":1,"tope":0}],"dias_vigencia":7,"max_por_ip_dia":5,"whatsapp":"51","pesos":1}`,
	} {
		if _, err := leerConfig([]byte(malo)); err == nil {
			t.Fatalf("debía rechazar %s", malo)
		}
	}
}

func TestMismoNumeroMismoResultado(t *testing.T) {
	s := sorteoDePrueba(t, configBase(t))
	a, rep, err := s.jugar("Ana Quispe", "987654321", "1.1.1.1")
	if err != nil || rep {
		t.Fatalf("primera vez: %v %v", rep, err)
	}
	for i := 0; i < 50; i++ {
		b, rep, err := s.jugar("Otro Nombre", "987654321", "2.2.2.2")
		if err != nil || !rep || b != a {
			t.Fatalf("debía devolver el mismo resultado: %v %v", rep, err)
		}
	}
	if len(s.lista) != 1 {
		t.Fatalf("se guardaron %d participaciones", len(s.lista))
	}
	// y sobrevive a un reinicio: se lee del archivo
	s2, err := nuevoSorteo(s.cfg, s.archivo, claveDePrueba)
	if err != nil {
		t.Fatal(err)
	}
	c, rep, err := s2.jugar("Ana", "987654321", "3.3.3.3")
	if err != nil || !rep || c.Descuento != a.Descuento || c.Codigo != a.Codigo || c.Vence != a.Vence {
		t.Fatalf("tras reiniciar cambió el resultado: %+v vs %+v", c, a)
	}
}

func TestTopeDelMayorDescuento(t *testing.T) {
	cfg := configBase(t)
	s := sorteoDePrueba(t, cfg)
	// el azar más favorable posible: siempre cae en el 50 % mientras tenga cupo
	s.azar = func(n int) int { return n - 1 - cfg.PesoSinPremio }
	tope := 0
	for _, p := range cfg.Premios {
		if p.Descuento == 50 {
			tope = p.Tope
		}
	}
	cien := 0
	for i := 0; i < tope+40; i++ {
		p, _, err := s.jugar("Ana", numero(i), "1.1.1.1")
		if err != nil {
			t.Fatal(err)
		}
		if p.Descuento == 50 {
			cien++
			if i >= tope {
				t.Fatalf("salió un 50 %% después del tope (participación %d)", i+1)
			}
		}
	}
	if cien != tope {
		t.Fatalf("salieron %d cupones de 50 %%, el tope es %d", cien, tope)
	}
}

func TestSeCierraCuandoNoQuedanPremios(t *testing.T) {
	cfg := Config{Abierto: true, Premios: []Premio{{70, 1, 2}}, PesoSinPremio: 0, DiasVigencia: 7, MaxPorIPDia: 100, WhatsApp: "51"}
	s := sorteoDePrueba(t, cfg)
	for i := 0; i < 2; i++ {
		if p, _, err := s.jugar("Ana", numero(i), "1.1.1.1"); err != nil || p.Descuento != 70 {
			t.Fatalf("%+v %v", p, err)
		}
	}
	if _, _, err := s.jugar("Ana", numero(9), "1.1.1.1"); !errors.Is(err, errCerrado) {
		t.Fatalf("debía estar cerrado: %v", err)
	}
	if p, rep, err := s.jugar("Ana", numero(0), "1.1.1.1"); err != nil || !rep || p.Descuento != 70 {
		t.Fatal("quien ya participó debe seguir viendo su cupón con el sorteo cerrado")
	}
	cfg.Abierto = false
	s = sorteoDePrueba(t, cfg)
	if _, _, err := s.jugar("Ana", numero(1), "1.1.1.1"); !errors.Is(err, errCerrado) {
		t.Fatal("abierto: false debe cerrar el sorteo")
	}
}

func TestProporciones(t *testing.T) {
	cfg := configBase(t)
	for i := range cfg.Premios {
		cfg.Premios[i].Tope = 0
	}
	s := sorteoDePrueba(t, cfg)
	total := cfg.PesoSinPremio
	for _, p := range cfg.Premios {
		total += p.Peso
	}
	const n = 40000
	cuenta := map[int]int{}
	for i := 0; i < n; i++ {
		cuenta[s.sortear()]++
	}
	esperado := map[int]int{}
	for _, p := range cfg.Premios {
		esperado[p.Descuento] = p.Peso
	}
	for d, peso := range esperado {
		quiere, sale := float64(peso)/float64(total), float64(cuenta[d])/n
		if sale < quiere-0.02 || sale > quiere+0.02 {
			t.Fatalf("descuento %d: sale %.3f, debía rondar %.3f", d, sale, quiere)
		}
	}
}

func TestVencimientoNuncaEnViernesNiSabado(t *testing.T) {
	inicio := time.Date(2026, 11, 1, 0, 30, 0, 0, lima)
	for h := 0; h < 24*400; h += 5 { // cada 5 horas durante más de un año
		ganado := inicio.Add(time.Duration(h) * time.Hour)
		for dias := 1; dias <= 21; dias++ {
			f := vencimiento(ganado, dias)
			if f.Weekday() == time.Friday || f.Weekday() == time.Saturday {
				t.Fatalf("ganado %s + %d días vence un %s", ganado, dias, diasSemana[f.Weekday()])
			}
			g := ganado.In(lima)
			minimo := time.Date(g.Year(), g.Month(), g.Day()+dias, 0, 0, 0, 0, lima)
			if f.Before(minimo) || f.Sub(minimo) > 48*time.Hour {
				t.Fatalf("ganado %s + %d días: vence %s", ganado, dias, f)
			}
		}
	}
	// un cupón ganado de noche en UTC sigue contando el día de Lima
	f := vencimiento(time.Date(2026, 11, 6, 2, 0, 0, 0, time.UTC), 7) // jueves 5, 9 p. m. en Lima
	if got := fechaLarga(f); got != "jueves 12 de noviembre de 2026" {
		t.Fatal(got)
	}
	if got := fechaLarga(vencimiento(time.Date(2026, 11, 6, 15, 0, 0, 0, lima), 7)); got != "domingo 15 de noviembre de 2026" {
		t.Fatal(got) // ganado un viernes: +7 es viernes, pasa al domingo
	}
}

func TestCodigoUnicoYConFormato(t *testing.T) {
	cfg := Config{Abierto: true, Premios: []Premio{{90, 1, 0}}, DiasVigencia: 7, MaxPorIPDia: 1 << 30, WhatsApp: "51"}
	s := sorteoDePrueba(t, cfg)
	formato := regexp.MustCompile(`^JMD-90-[A-HJKMNP-Z2-9]{5}$`)
	vistos := map[string]bool{}
	for i := 0; i < 300; i++ {
		p, _, err := s.jugar("Ana", numero(i), "1.1.1.1")
		if err != nil {
			t.Fatal(err)
		}
		if !formato.MatchString(p.Codigo) || vistos[p.Codigo] {
			t.Fatalf("código %q repetido o mal formado", p.Codigo)
		}
		vistos[p.Codigo] = true
	}
}

func TestSinPremioNoLlevaCupon(t *testing.T) {
	cfg := Config{Abierto: true, Premios: []Premio{{70, 1, 0}}, PesoSinPremio: 5, DiasVigencia: 7, MaxPorIPDia: 10, WhatsApp: "51"}
	s := sorteoDePrueba(t, cfg)
	s.azar = func(n int) int { return n - 1 }
	p, _, err := s.jugar("Ana", "987654321", "1.1.1.1")
	if err != nil || p.Descuento != 0 || p.Codigo != "" || p.Vence != "" {
		t.Fatalf("%+v %v", p, err)
	}
}

func TestTopePorConexion(t *testing.T) {
	cfg := configBase(t)
	cfg.MaxPorIPDia = 3
	s := sorteoDePrueba(t, cfg)
	reloj := time.Date(2026, 11, 5, 10, 0, 0, 0, lima)
	s.ahora = func() time.Time { return reloj }
	for i := 0; i < 3; i++ {
		if _, _, err := s.jugar("Ana", numero(i), "1.1.1.1"); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := s.jugar("Ana", numero(3), "1.1.1.1"); !errors.Is(err, errMuchas) {
		t.Fatalf("debía frenar la cuarta: %v", err)
	}
	if _, _, err := s.jugar("Ana", numero(4), "2.2.2.2"); err != nil {
		t.Fatal("otra conexión sí puede")
	}
	if _, rep, err := s.jugar("Ana", numero(0), "1.1.1.1"); err != nil || !rep {
		t.Fatal("ver el propio resultado no cuenta para el tope")
	}
	reloj = reloj.Add(25 * time.Hour)
	if _, _, err := s.jugar("Ana", numero(3), "1.1.1.1"); err != nil {
		t.Fatal("al día siguiente debe poder")
	}
}

func TestNombreYNumero(t *testing.T) {
	if !nombreBueno("Ana María Quispe-Ñahui") || nombreBueno("a") || nombreBueno("<script>") || nombreBueno("=cmd|x") {
		t.Fatal("validación de nombre")
	}
	for entra, sale := range map[string]string{"987654321": "987654321", "987 654 321": "987654321", "+51 987-654-321": "987654321", "51987654321": "987654321"} {
		if n, ok := limpiarNumero(entra); !ok || n != sale {
			t.Fatalf("%q -> %q %v", entra, n, ok)
		}
	}
	for _, malo := range []string{"", "12345678", "887654321", "9876543210", "98765432a1x", "5198765432"} {
		if _, ok := limpiarNumero(malo); ok {
			t.Fatalf("debía rechazar %q", malo)
		}
	}
}

func pedir(t *testing.T, h http.Handler, metodo, ruta, clave, cuerpo string) *httptest.ResponseRecorder {
	t.Helper()
	r := httptest.NewRequest(metodo, ruta, bytes.NewBufferString(cuerpo))
	if clave != "" {
		r.Header.Set("X-Clave", clave)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestAdministracionPideClave(t *testing.T) {
	s := sorteoDePrueba(t, configBase(t))
	h := s.rutas()
	for _, x := range [][2]string{{"GET", "/api/admin/participantes"}, {"GET", "/api/admin/csv"}, {"POST", "/api/admin/canjear"}} {
		for _, clave := range []string{"", "otra-clave-cualquiera", claveDePrueba + "x"} {
			if w := pedir(t, h, x[0], x[1], clave, `{}`); w.Code != 401 {
				t.Fatalf("%s %s con clave %q: %d", x[0], x[1], clave, w.Code)
			}
		}
	}
	if w := pedir(t, h, "GET", "/api/admin/participantes", claveDePrueba, ""); w.Code != 200 {
		t.Fatalf("con la clave correcta: %d", w.Code)
	}
	if w := pedir(t, h, "GET", "/admin", "", ""); w.Code != 200 || strings.Contains(w.Body.String(), claveDePrueba) {
		t.Fatal("la página del panel se sirve sin datos ni clave adentro")
	}
}

func TestFlujoPorHTTP(t *testing.T) {
	cfg := Config{Abierto: true, Premios: []Premio{{80, 1, 0}}, DiasVigencia: 7, MaxPorIPDia: 10, WhatsApp: "51986149476"}
	s := sorteoDePrueba(t, cfg)
	uno := 25.0
	s.cursos = []Curso{{Slug: "uno", Titulo: "Uno", Soles: &uno, Brochure: "01-programacion-agentica"}, {Slug: "dos", Titulo: "Dos", Brochure: "09-python-api"}}
	s.ahora = func() time.Time { return time.Date(2026, 11, 5, 20, 0, 0, 0, lima) }
	h := s.rutas()
	if w := pedir(t, h, "POST", "/api/jugar", "", `{"nombre":"Ana","whatsapp":"12345"}`); w.Code != 400 {
		t.Fatalf("número malo: %d", w.Code)
	}
	if w := pedir(t, h, "POST", "/api/jugar", "", `{"nombre":"<b>","whatsapp":"987654321"}`); w.Code != 400 {
		t.Fatalf("nombre malo: %d", w.Code)
	}
	var a, b Resultado
	w := pedir(t, h, "POST", "/api/jugar", "", `{"nombre":"Ana Quispe","whatsapp":"987 654 321"}`)
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &a) != nil {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if !a.Gano || a.Descuento != 80 || a.Repetido || a.VenceTexto != "jueves 12 de noviembre de 2026" || a.Vence != "2026-11-12" {
		t.Fatalf("%+v", a)
	}
	w = pedir(t, h, "POST", "/api/jugar", "", `{"nombre":"Ana","whatsapp":"+51987654321"}`)
	if json.Unmarshal(w.Body.Bytes(), &b); !b.Repetido || b.Codigo != a.Codigo {
		t.Fatalf("%+v", b)
	}
	// canjear y deshacer
	w = pedir(t, h, "POST", "/api/admin/canjear", claveDePrueba, `{"codigo":"`+strings.ToLower(a.Codigo)+`","canjeado":true}`)
	if w.Code != 200 || s.lista[0].Canjeado == nil {
		t.Fatalf("canjear: %d", w.Code)
	}
	if w := pedir(t, h, "POST", "/api/admin/canjear", claveDePrueba, `{"codigo":"JMD-80-NOHAY","canjeado":true}`); w.Code != 404 {
		t.Fatalf("cupón inexistente: %d", w.Code)
	}
	s2, _ := nuevoSorteo(cfg, s.archivo, claveDePrueba)
	if s2.lista[0].Canjeado == nil {
		t.Fatal("el canje no se guardó")
	}
	w = pedir(t, h, "POST", "/api/admin/canjear", claveDePrueba, `{"codigo":"`+a.Codigo+`","canjeado":false}`)
	if w.Code != 200 || s.lista[0].Canjeado != nil {
		t.Fatal("deshacer el canje")
	}
	w = pedir(t, h, "GET", "/api/admin/csv", claveDePrueba, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), a.Codigo) {
		t.Fatal("csv")
	}
	w = pedir(t, h, "GET", "/api/estado", "", "")
	if w.Code != 200 || strings.Contains(w.Body.String(), "peso") {
		t.Fatalf("estado: %d %s", w.Code, w.Body) // las probabilidades no se publican
	}
	if !strings.Contains(w.Body.String(), `"soles":25`) || !strings.Contains(w.Body.String(), `"soles":null`) {
		t.Fatalf("estado sin precios de cursos: %s", w.Body)
	}
	if w := pedir(t, h, "GET", "/brochures/01-programacion-agentica.webp", "", ""); w.Code != 200 || w.Header().Get("Content-Type") != "image/webp" {
		t.Fatalf("brochure: %d %s", w.Code, w.Header().Get("Content-Type"))
	}
}
