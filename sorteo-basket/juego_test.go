package main

import (
	"encoding/json"
	"errors"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type reloj struct{ t time.Time }

func (r *reloj) ahora() time.Time      { return r.t }
func (r *reloj) pasar(d time.Duration) { r.t = r.t.Add(d) }
func cfgPrueba(t *testing.T) Config {
	t.Helper()
	var c Config
	if err := json.Unmarshal(configBase, &c); err != nil {
		t.Fatal(err)
	}
	c.AbiertoAlIni = true
	c.PorIP = 0
	return c
}

// juegoPrueba: azar de crypto/rand de verdad, reloj controlado.
func juegoPrueba(t *testing.T) (*Juego, *reloj) {
	r := &reloj{t: time.Date(2026, 11, 22, 20, 0, 0, 0, lima)}
	j := NuevoJuego(cfgPrueba(t))
	j.ahora = r.ahora
	j.est.Creado = r.t
	return j, r
}

func entrar(t *testing.T, j *Juego, i int) *Jugador {
	t.Helper()
	nombres := []string{"Ana", "Beto", "Carla", "Dario", "Elena", "Fabio", "Gina", "Hugo", "Irma", "Jose", "Karen", "Luis", "Mara", "Nico", "Olga", "Pablo", "Rosa", "Saul", "Tania", "Ulises"}
	p, err := j.Entrar(nombres[i%len(nombres)]+" Prueba"+string(rune('a'+i/len(nombres))), "9"+pad8(i), "1.1.1.1", uint32(i))
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func pad8(i int) string {
	s := "00000000" + itoa(i)
	return s[len(s)-8:]
}

func itoa(i int) string { b, _ := json.Marshal(i); return string(b) }

// tiroPerfecto calcula el e que deja el medidor en el centro de la franja y lo dispara a tiempo.
func tiroPerfecto(t *testing.T, j *Juego, r *reloj, id string) (Tiro, *Victoria) {
	t.Helper()
	r.pasar(3 * time.Second)
	f, w := j.NuevaFase(id)
	if w != 0 {
		t.Fatalf("espera %d tras 3 s", w)
	}
	// tri(e/P + X) = C en la subida: e/P + X = C/2 (mod 1)
	u := f.C/2 - f.X
	u -= math.Floor(u)
	e := int(math.Round(u * float64(f.P)))
	r.pasar(time.Duration(e) * time.Millisecond)
	tr, v, err := j.Tirar(id, f.ID, e, 300)
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(float64(tr.M-tr.C)) > 2 {
		t.Fatalf("medidor %d lejos del centro %d", tr.M, tr.C)
	}
	return tr, v
}

func forzarAcierto(j *Juego) func() {
	orig := j.azar
	j.azar = func(n int) int {
		if n == 10000 {
			return 0
		}
		return orig(n)
	}
	return func() { j.azar = orig }
}

func TestValidaciones(t *testing.T) {
	j, _ := juegoPrueba(t)
	if _, err := j.Entrar("Ana", "987654321", "ip", 1); err != ErrNombre {
		t.Fatalf("sin apellido: %v", err)
	}
	if _, err := j.Entrar("Ana Ruiz", "887654321", "ip", 1); err != ErrTel {
		t.Fatalf("tel que no empieza en 9: %v", err)
	}
	a, err := j.Entrar("Ána  Ruiz", "+51 987 654 321", "ip", 1)
	if err != nil || a.Tel != "987654321" {
		t.Fatalf("válido: %v %+v", err, a)
	}
	b, err := j.Entrar("ana ruiz", "987654321", "ip", 2)
	if err != nil || b != a {
		t.Fatal("mismo nombre y WhatsApp debe devolver al mismo jugador")
	}
	if _, err := j.Entrar("Otra Persona", "987654321", "ip", 1); err != ErrTelUsado {
		t.Fatalf("WhatsApp con otro nombre: %v", err)
	}
	if _, err := j.Entrar("Ana Ruiz", "912345678", "ip", 1); err != ErrNomUsado {
		t.Fatalf("nombre con otro WhatsApp: %v", err)
	}
	if corto("josé pérez díaz") != "José P." {
		t.Fatal(corto("josé pérez díaz"))
	}
}

func TestLimiteDeTiros(t *testing.T) {
	j, r := juegoPrueba(t)
	p := entrar(t, j, 0)
	f, _ := j.NuevaFase(p.ID)
	if _, _, err := j.Tirar(p.ID, f.ID, 0, 300); err != nil {
		t.Fatal(err)
	}
	f, w := j.NuevaFase(p.ID)
	if w != 2500 {
		t.Fatalf("espera = %d, quería 2500", w)
	}
	r.pasar(2400 * time.Millisecond)
	if _, _, err := j.Tirar(p.ID, f.ID, 2400, 300); !errors.Is(err, ErrEspera) {
		t.Fatalf("a los 2,4 s: %v", err)
	}
	r.pasar(100 * time.Millisecond)
	if _, _, err := j.Tirar(p.ID, f.ID, 2500, 300); err != nil {
		t.Fatalf("a los 2,5 s: %v", err)
	}
	// fase vieja o repetida: rechazada
	if _, _, err := j.Tirar(p.ID, f.ID, 0, 300); !errors.Is(err, ErrFase) {
		t.Fatalf("fase repetida: %v", err)
	}
	if p.Tiros != 2 {
		t.Fatalf("tiros = %d", p.Tiros)
	}
}

func TestPausaYCierre(t *testing.T) {
	j, _ := juegoPrueba(t)
	p := entrar(t, j, 0)
	j.Abrir(false)
	f, _ := j.NuevaFase(p.ID)
	if _, _, err := j.Tirar(p.ID, f.ID, 0, 300); err != ErrPausa {
		t.Fatalf("en pausa: %v", err)
	}
	j.Abrir(true)
	j.Cerrar(true)
	if _, _, err := j.Tirar(p.ID, f.ID, 0, 300); err != ErrCerrado {
		t.Fatalf("cerrado: %v", err)
	}
}

// El cliente no puede elegir un instante fuera de [transcurrido − holgura, transcurrido].
func TestRelojDelServidor(t *testing.T) {
	j, r := juegoPrueba(t)
	p := entrar(t, j, 0)
	f, _ := j.NuevaFase(p.ID)
	r.pasar(5000 * time.Millisecond)
	tr, _, err := j.Tirar(p.ID, f.ID, 99999, 300) // dice «del futuro»: se recorta a 5000
	if err != nil {
		t.Fatal(err)
	}
	if want := int(math.Round(tri(5000/float64(f.P)+f.X) * 1000)); tr.M != want {
		t.Fatalf("medidor %d, quería %d", tr.M, want)
	}
	r.pasar(3 * time.Second)
	f, _ = j.NuevaFase(p.ID)
	r.pasar(4000 * time.Millisecond)
	tr, _, _ = j.Tirar(p.ID, f.ID, 10, 300) // dice «muy temprano»: se recorta a 3700
	if want := int(math.Round(tri(3700/float64(f.P)+f.X) * 1000)); tr.M != want {
		t.Fatalf("medidor %d, quería %d", tr.M, want)
	}
}

// Un tiro perfecto no es seguro y uno descuidado casi nunca entra.
func TestDificultad(t *testing.T) {
	j, r := juegoPrueba(t)
	j.cfg.Meta = 1 << 30
	p := entrar(t, j, 0)
	const n = 4000
	ok := 0
	for i := 0; i < n; i++ {
		if tr, _ := tiroPerfecto(t, j, r, p.ID); tr.Ok {
			ok++
		}
		p.Aciertos = 0
	}
	tasa := float64(ok) / n
	if tasa < 0.38 || tasa > 0.52 {
		t.Fatalf("tiro perfecto entra %.2f, quería ≈ 0,45", tasa)
	}
	if j.probabilidad(5) > 0.02 || j.probabilidad(1.5) > 0.2 {
		t.Fatal("un tiro descuidado entra demasiado")
	}
}

func TestPrimerosEnLlegarATres(t *testing.T) {
	j, r := juegoPrueba(t)
	defer forzarAcierto(j)()
	ps := []*Jugador{}
	for i := 0; i < 8; i++ {
		ps = append(ps, entrar(t, j, i))
	}
	// rondas: cada ronda todos aciertan uno, en orden. Los 6 primeros en llegar a 3 ganan.
	var vic []*Victoria
	for ronda := 0; ronda < 4; ronda++ {
		for _, p := range ps {
			if _, v := tiroPerfecto(t, j, r, p.ID); v != nil {
				vic = append(vic, v)
			}
		}
	}
	if len(vic) != 6 {
		t.Fatalf("ganadores = %d, quería 6", len(vic))
	}
	for i, v := range vic {
		if v.Orden != i+1 || v.Jugador != ps[i].ID {
			t.Fatalf("ganador %d = %s (orden %d), quería %s", i, v.Jugador, v.Orden, ps[i].ID)
		}
	}
	for _, p := range ps[6:] {
		if p.Gano != 0 || p.Aciertos < 3 {
			t.Fatalf("%s llegó a %d y gano=%d; sin cupos no gana pero sigue jugando", p.ID, p.Aciertos, p.Gano)
		}
	}
	// nadie gana dos veces: sigue tirando hasta 6 aciertos
	for k := 0; k < 3; k++ {
		if _, v := tiroPerfecto(t, j, r, ps[0].ID); v != nil {
			t.Fatal("ganó dos veces")
		}
	}
}

func TestReparticionDePremios(t *testing.T) {
	for vuelta := 0; vuelta < 200; vuelta++ {
		j, r := juegoPrueba(t)
		restore := forzarAcierto(j)
		ps := []*Jugador{}
		for i := 0; i < 9; i++ {
			ps = append(ps, entrar(t, j, i))
		}
		cuenta := map[string]int{}
		grupos := map[string]int{}
		for ronda := 0; ronda < 3; ronda++ {
			for _, p := range ps {
				_, v := tiroPerfecto(t, j, r, p.ID)
				if v != nil {
					cuenta[v.Premio]++
					if v.Premio == "qwen" {
						if v.Grupo != "G3" && v.Grupo != "G2" {
							t.Fatalf("grupo inválido %q", v.Grupo)
						}
						grupos[v.Grupo]++
					} else if v.Grupo != "" {
						t.Fatalf("videos no lleva grupo: %q", v.Grupo)
					}
				}
				for id, n := range j.est.Restantes {
					if n < 0 {
						t.Fatalf("cupos negativos en %s", id)
					}
				}
			}
		}
		restore()
		if cuenta["qwen"] != 3 || cuenta["videos"] != 3 {
			t.Fatalf("vuelta %d: reparto %v, quería 3 + 3", vuelta, cuenta)
		}
		if j.est.Restantes["qwen"] != 0 || j.est.Restantes["videos"] != 0 || len(j.est.Ganadores) != 6 {
			t.Fatalf("restantes %v, ganadores %d", j.est.Restantes, len(j.est.Ganadores))
		}
	}
}

// Cada cupo restante pesa lo mismo: con 3 + 1, el primer premio sale «qwen» ≈ 75 % de las veces.
func TestPesoPorCupo(t *testing.T) {
	j, _ := juegoPrueba(t)
	j.est.Restantes = map[string]int{"qwen": 3, "videos": 1}
	q := 0
	const n = 8000
	for i := 0; i < n; i++ {
		p := &Jugador{ID: "x"}
		j.est.Restantes = map[string]int{"qwen": 3, "videos": 1}
		j.est.Ganadores = nil
		if v := j.premiar(p); v.Premio == "qwen" {
			q++
		}
	}
	if f := float64(q) / n; f < 0.72 || f > 0.78 {
		t.Fatalf("qwen salió %.3f, quería ≈ 0,75", f)
	}
	j.est.Restantes = map[string]int{"qwen": 0, "videos": 0}
	if j.premiar(&Jugador{ID: "y"}) != nil {
		t.Fatal("sin cupos no debe haber premio")
	}
	j.est.Restantes = map[string]int{"qwen": 0, "videos": 2}
	for i := 0; i < 2; i++ {
		if v := j.premiar(&Jugador{ID: "z"}); v == nil || v.Premio != "videos" {
			t.Fatal("con qwen agotado debe salir videos")
		}
	}
	if j.premiar(&Jugador{ID: "w"}) != nil || j.est.Restantes["videos"] != 0 {
		t.Fatal("cupos de videos mal descontados")
	}
}

func TestPersistencia(t *testing.T) {
	j, r := juegoPrueba(t)
	restore := forzarAcierto(j)
	p := entrar(t, j, 0)
	q := entrar(t, j, 1)
	for i := 0; i < 3; i++ {
		tiroPerfecto(t, j, r, p.ID)
	}
	tiroPerfecto(t, j, r, q.ID)
	restore()
	dir := t.TempDir()
	alm := &almacen{ruta: filepath.Join(dir, "estado.json"), j: j}
	if err := alm.guardar(); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(alm.ruta)
	if err != nil {
		t.Fatal(err)
	}
	if fi, _ := os.Stat(alm.ruta); fi.Mode().Perm() != 0o600 {
		t.Fatalf("permisos %v", fi.Mode().Perm())
	}
	k := NuevoJuego(cfgPrueba(t))
	if err := k.Cargar(b); err != nil {
		t.Fatal(err)
	}
	p2 := k.PorToken(p.Token)
	if p2 == nil || p2.Aciertos != 3 || p2.Gano != 1 || k.porID[q.ID].Aciertos != 1 {
		t.Fatalf("no se recuperó el jugador: %+v", p2)
	}
	if len(k.est.Ganadores) != 1 || k.Quedan() != 5 {
		t.Fatalf("ganadores %d, quedan %d", len(k.est.Ganadores), k.Quedan())
	}
	// tras reiniciar el servidor se puede seguir tirando con el mismo token
	k.ahora = r.ahora
	f, _ := k.NuevaFase(p2.ID)
	r.pasar(time.Second)
	if _, _, err := k.Tirar(p2.ID, f.ID, 1000, 300); err != nil {
		t.Fatal(err)
	}
	k.Reiniciar()
	if k.Quedan() != 6 || len(k.est.Jugadores) != 0 || k.PorToken(p.Token) != nil {
		t.Fatal("reiniciar no limpió")
	}
}

// Al cerrar: exactamente un 80 % (paga 20 %) y, para los demás que tiraron, el acceso web por S/ 10; ganadores y
// quienes no tiraron quedan fuera.
func TestConsuelos(t *testing.T) {
	j, r := juegoPrueba(t)
	restore := forzarAcierto(j)
	ps := []*Jugador{}
	for i := 0; i < 12; i++ {
		ps = append(ps, entrar(t, j, i))
	}
	// 2 ganadores: los dos primeros meten 3
	for k := 0; k < 3; k++ {
		tiroPerfecto(t, j, r, ps[0].ID)
		tiroPerfecto(t, j, r, ps[1].ID)
	}
	restore()
	// del 2 al 10 tiran una vez; el 11 no tira
	for _, p := range ps[2:11] {
		tiroPerfecto(t, j, r, p.ID)
	}
	if len(j.est.AccesoWeb)+len(j.est.Especiales) != 0 {
		t.Fatal("no debe haber premios de consuelo antes de cerrar")
	}
	j.Cerrar(true)
	esp, web := 0, 0
	for _, p := range ps {
		con, paga := j.consuelo(p.ID)
		switch {
		case p.Gano > 0 || p.Tiros == 0:
			if con != "" {
				t.Fatalf("%s (gano=%d, tiros=%d) no debe tener consuelo: %q", p.ID, p.Gano, p.Tiros, con)
			}
		case con == "esp":
			esp++
			if paga != 20 {
				t.Fatalf("el especial paga %d, quería 20", paga)
			}
		case con == "web":
			web++
		default:
			t.Fatalf("%s tiró y no ganó, pero no tiene consuelo", p.ID)
		}
	}
	if esp != 1 || web != 8 {
		t.Fatalf("especial %d, acceso web %d (quería 1 y 8)", esp, web)
	}
	// cerrar otra vez no vuelve a sortear
	antes, _ := json.Marshal(j.est.AccesoWeb)
	antesE := j.est.Especiales[0]
	j.Cerrar(true)
	j.Cerrar(false)
	j.Cerrar(true)
	despues, _ := json.Marshal(j.est.AccesoWeb)
	if string(antes) != string(despues) || j.est.Especiales[0] != antesE || len(j.est.Especiales) != 1 {
		t.Fatal("cerrar dos veces cambió los premios de consuelo")
	}
	// sobrevive a un reinicio del servidor
	b, err := j.Volcar()
	if err != nil {
		t.Fatal(err)
	}
	k := NuevoJuego(cfgPrueba(t))
	if err := k.Cargar(b); err != nil {
		t.Fatal(err)
	}
	for _, p := range ps {
		a1, a2 := j.consuelo(p.ID)
		b1, b2 := k.consuelo(p.ID)
		if a1 != b1 || a2 != b2 {
			t.Fatalf("%s: %s/%d antes, %s/%d después del reinicio", p.ID, a1, a2, b1, b2)
		}
	}
	// quien llega después y tira recibe el premio web al volver a cerrar, sin un segundo 80 %
	k.ahora = r.ahora
	k.Cerrar(false)
	tarde := entrar(t, k, 15)
	tiroPerfecto(t, k, r, tarde.ID)
	k.Cerrar(true)
	if con, _ := k.consuelo(tarde.ID); con != "web" {
		t.Fatalf("el que llegó tarde: %q", con)
	}
	if len(k.est.Especiales) != 1 {
		t.Fatal("salió un segundo 80 %")
	}
}

// El 80 % cae en cualquiera de los que tiraron, con la misma probabilidad.
func TestEspecialAlAzar(t *testing.T) {
	especial := map[int]int{}
	for v := 0; v < 600; v++ {
		j, _ := juegoPrueba(t)
		ps := []*Jugador{}
		for i := 0; i < 6; i++ {
			p := entrar(t, j, i)
			p.Tiros = 1
			ps = append(ps, p)
		}
		j.Cerrar(true)
		n := 0
		for i, p := range ps {
			if con, _ := j.consuelo(p.ID); con == "esp" {
				especial[i]++
				n++
			}
		}
		if n != 1 || len(j.est.AccesoWeb) != 5 {
			t.Fatalf("especiales %d, web %d", n, len(j.est.AccesoWeb))
		}
	}
	for i := 0; i < 6; i++ {
		if especial[i] < 60 || especial[i] > 145 {
			t.Fatalf("el 80 %% cayó %d veces en el jugador %d de 600 (quería ≈ 100)", especial[i], i)
		}
	}
}

// Datos guardados con el formato anterior («pagas el 30/50/60 %»): al cargar pasan al premio web; el especial queda.
func TestMigracionConsuelos(t *testing.T) {
	viejo := `{"abierto":false,"cerrado":true,"restantes":{"qwen":0,"videos":0},
		"jugadores":[{"id":"a1","token":"ta","nombre":"Ana Ruiz","tiros":3},{"id":"b2","token":"tb","nombre":"Beto Paz","tiros":2},
			{"id":"c3","token":"tc","nombre":"Carla Soto","tiros":1},{"id":"d4","token":"td","nombre":"Dora Luna","tiros":0}],
		"ganadores":[],"consuelos":{"a1":20,"b2":50,"c3":30},"especiales":["a1"]}`
	j := NuevoJuego(cfgPrueba(t))
	if err := j.Cargar([]byte(viejo)); err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"a1": "esp", "b2": "web", "c3": "web", "d4": ""}
	for id, w := range want {
		if con, _ := j.consuelo(id); con != w {
			t.Fatalf("%s: %q, quería %q", id, con, w)
		}
	}
	b, _ := j.Volcar()
	if strings.Contains(string(b), `"consuelos"`) {
		t.Fatal("el formato viejo sigue en el archivo")
	}
	// cerrar de nuevo no cambia nada
	j.Cerrar(true)
	if len(j.est.AccesoWeb) != 2 || len(j.est.Especiales) != 1 {
		t.Fatalf("web %d, especiales %d", len(j.est.AccesoWeb), len(j.est.Especiales))
	}
}
