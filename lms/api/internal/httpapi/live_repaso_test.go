package httpapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
)

func enteroRepaso(n int) *int { return &n }
func TestRepasoVeinteSimultaneos(t *testing.T) {
	a := nuevoRepaso()
	now := time.Unix(5000, 0)
	a.inicio = now
	var wg sync.WaitGroup
	errs := make(chan error, 40)
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			a.Lock()
			defer a.Unlock()
			j, err := a.unir(fmt.Sprint(i), fmt.Sprintf("Persona %d", i), now)
			if err != nil {
				errs <- err
				return
			}
			in := repasoJugada{Accion: "responder", Partida: a.partida, Ronda: 0, Respuesta: enteroRepaso(repasoBanco[0].Buena)}
			if err = a.jugar(j, in, now); err != nil {
				errs <- err
			}
			if j.Puntos != 100 {
				errs <- fmt.Errorf("puntos de %s: %d", j.ID, j.Puntos)
			}
		}(i)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Error(err)
	}
	if len(a.jugadores) != 20 {
		t.Fatalf("jugadores: %d", len(a.jugadores))
	}
	if _, err := a.unir("extra", "Extra", now); err == nil {
		t.Fatal("admitió al jugador 21")
	}
	if _, err := a.unir("1", "Vuelve", now); err != nil {
		t.Fatal("la reconexión consume otra plaza", err)
	}
	v := a.vista("1", false, now)
	if len(v["tabla"].([]map[string]any)) != 5 {
		t.Fatal("top 5")
	}
	if v["yo"] == nil {
		t.Fatal("falta mi marcador")
	}
	raw, _ := json.Marshal(v)
	if strings.Contains(string(raw), "correcta") || strings.Contains(string(raw), "explicacion") {
		t.Fatal("se filtró la respuesta durante la pregunta")
	}
}
func TestRepasoPuntosRelojYRepeticion(t *testing.T) {
	a := nuevoRepaso()
	start := time.Unix(10000, 0)
	a.inicio = start
	j, _ := a.unir("uno", "Uno", start)
	in := repasoJugada{Accion: "responder", Partida: a.partida, Ronda: 0}
	if a.jugar(j, in, start) == nil {
		t.Fatal("respuesta ausente aceptada")
	}
	in.Respuesta = enteroRepaso(repasoBanco[0].Buena)
	if err := a.jugar(j, in, start); err != nil {
		t.Fatal(err)
	}
	if a.jugar(j, in, start) == nil || j.Puntos != 100 {
		t.Fatal("respuesta duplicada suma")
	}
	skill := start.Add(time.Duration(repasoPreguntaMS) * time.Millisecond)
	for slot := 0; slot < 8; slot++ {
		now := skill.Add(time.Duration(int64(slot)*repasoSlotMS+500) * time.Millisecond)
		x, y := blancoRepaso(semillaRepaso(j.ID, 0), 0, slot, .4)
		hit := repasoJugada{Accion: "golpear", Partida: a.partida, Ronda: 0, Slot: slot, X: x, Y: y, AtMS: now.UnixMilli()}
		if err := a.jugar(j, hit, now); err != nil {
			t.Fatal(err)
		}
		if a.jugar(j, hit, now) == nil {
			t.Fatal("duplicado suma")
		}
	}
	if j.Puntos != 140 || j.Golpes != 8 {
		t.Fatalf("separar concepto y destreza: %+v", j)
	}
	// Ni coordenadas ajenas, ni eventos antiguos, ni rondas de otra partida.
	j.golpes[0] = map[int]bool{}
	now := skill.Add(500 * time.Millisecond)
	for _, hit := range []repasoJugada{
		{Accion: "golpear", Partida: a.partida, Ronda: 0, Slot: 0, X: 0, Y: 0, AtMS: now.UnixMilli()},
		{Accion: "golpear", Partida: a.partida, Ronda: 0, Slot: 0, X: .5, Y: .5, AtMS: now.Add(-time.Second).UnixMilli()},
		{Accion: "golpear", Partida: "vieja", Ronda: 0, Slot: 0, X: .5, Y: .5, AtMS: now.UnixMilli()},
	} {
		if a.jugar(j, hit, now) == nil {
			t.Fatal("jugada inválida aceptada")
		}
	}
	if j.Puntos != 140 {
		t.Fatal("cambió puntos con golpe inválido")
	}
	v := a.vista("uno", false, start.Add(25*time.Second))
	if v["fase"] != "explicacion" || v["correcta"] != repasoBanco[0].Buena {
		t.Fatal("falta explicación")
	}
	if f, r, _ := a.fase(start.Add(290 * time.Second)); f != "final" || r != 9 {
		t.Fatal("fin de 10 rondas", f, r)
	}
}
func TestRepasoGlobosYTolerancia(t *testing.T) {
	a := nuevoRepaso()
	start := time.Unix(20000, 0)
	a.inicio = start
	j, _ := a.unir("uno", "Uno", start)
	skill := start.Add(time.Duration(repasoRondaMS+repasoPreguntaMS) * time.Millisecond)
	at := skill.Add(600 * time.Millisecond)
	x, y := blancoRepaso(semillaRepaso(j.ID, 1), 1, 0, .48)
	in := repasoJugada{Accion: "golpear", Partida: a.partida, Ronda: 1, Slot: 0, X: x, Y: y, AtMS: at.UnixMilli()}
	if err := a.jugar(j, in, at.Add(200*time.Millisecond)); err != nil {
		t.Fatal("latencia razonable", err)
	}
	if j.Puntos != 5 {
		t.Fatal("la destreza da oportunidad sin acertar concepto")
	}
	// El cuarto intento por segundo es el último: no hay puntaje enviado por cliente.
	j.golpes[1] = map[int]bool{}
	j.intentos[at.UnixMilli()/1000] = 4
	if a.jugar(j, in, at) == nil {
		t.Fatal("falta limitar spam")
	}
}
func newEnvRepaso(t *testing.T) *env {
	e := newEnvEscenas(t)
	dir := writeFixture(t)
	// Fixture aislado con la lección real; no se modifican otros cursos.
	err := filepath.WalkDir(dir, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		raw, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(p, []byte(strings.ReplaceAll(string(raw), "l1", "de-02")), 0644)
	})
	if err != nil {
		t.Fatal(err)
	}
	folder := filepath.Join(dir, "courses", "curso", "live", "de-02", repasoEscena)
	if err = os.MkdirAll(folder, 0755); err != nil {
		t.Fatal(err)
	}
	for file, body := range map[string]string{"escena.yaml": "id: " + repasoEscena + "\ntitulo: Repaso\nfase: reflexion\npaso: hacer\n", "escena.html": "<!doctype html><h1>Repaso</h1>"} {
		if err = os.WriteFile(filepath.Join(folder, file), []byte(body), 0644); err != nil {
			t.Fatal(err)
		}
	}
	cs, err := content.NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	e.s.Content = cs
	return e
}
func TestRepasoHTTPPermisosYContenido(t *testing.T) {
	e := newEnvRepaso(t)
	profe := e.login("profe@x.test", "profe1234")
	e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": "juega@x.test", "name": "Juega", "password": "juega-1234", "invite_code": "abc"}, "")
	student := e.login("juega@x.test", "juega-1234")
	url := "/api/v1/live/de-02/repaso"
	if r := e.call("GET", url, "", false, nil, ""); r.code != 401 {
		t.Fatal("debe autenticar", r.code)
	}
	if r := e.call("POST", url, student, false, map[string]any{"accion": "iniciar"}, ""); r.code != 403 {
		t.Fatal("alumno inicia", r.code)
	}
	if r := e.call("POST", url, student, false, map[string]any{"accion": "unirse"}, ""); r.code != 200 || r.body["inscritos"] != float64(1) {
		t.Fatal("unirse", r.code, r.raw)
	}
	r := e.call("POST", url, profe, false, map[string]any{"accion": "iniciar"}, "")
	if r.code != 200 || r.body["fase"] != "pregunta" {
		t.Fatal("iniciar", r.code, r.raw)
	}
	if r.body["yo"] == nil {
		t.Fatal("el instructor debe entrar al iniciar")
	}
	if v := e.call("POST", url, profe, false, map[string]any{"accion": "unirse"}, ""); v.code != 200 {
		t.Fatal("el instructor también puede unirse", v.code)
	}
	if v := e.call("POST", url, profe, false, map[string]any{"accion": "responder", "partida": r.body["partida"], "ronda": 0, "respuesta": repasoBanco[0].Buena}, ""); v.code != 200 {
		t.Fatal("el instructor no pudo responder", v.code)
	}
	if _, ok := r.body["correcta"]; ok {
		t.Fatal("filtra respuesta")
	}
	body := map[string]any{"accion": "responder", "partida": r.body["partida"], "ronda": 0, "respuesta": repasoBanco[0].Buena}
	if r = e.call("POST", url, student, false, body, ""); r.code != 200 {
		t.Fatal("responder", r.raw)
	}
	if r = e.call("POST", url, student, false, body, ""); r.code != 409 {
		t.Fatal("replay", r.code)
	}
	if r = e.call("POST", url, student, false, map[string]any{"accion": "terminar"}, ""); r.code != 403 {
		t.Fatal("alumno cierra")
	}
	if r = e.call("GET", "/api/v1/live/l2/repaso", profe, false, nil, ""); r.code != 404 {
		t.Fatal("se habilitó en otra lección", r.code)
	}
	if r = e.call("POST", url, profe, false, map[string]any{"accion": "terminar"}, ""); r.code != 200 || r.body["fase"] != "final" {
		t.Fatal("cerrar", r.raw)
	}
}

func TestRepasoInstructorConSalaLlena(t *testing.T) {
	a := nuevoRepaso()
	now := time.Unix(5000, 0)
	a.inicio = now
	for i := 0; i < 20; i++ {
		if _, err := a.unir(fmt.Sprint(i), "Alumno", now); err != nil {
			t.Fatal(err)
		}
	}
	prof, err := a.unirComo("profe", "Instructor", true, now)
	if err != nil {
		t.Fatal(err)
	}
	if len(a.jugadores) != 21 || !prof.Instructor {
		t.Fatal("el instructor debe tener una plaza adicional")
	}
	if alumnos, profes := a.plazas(); alumnos != 20 || profes != 1 {
		t.Fatal("cupo incorrecto", alumnos, profes)
	}
	if _, err = a.unirComo("otro-profe", "Otro instructor", true, now); err == nil {
		t.Fatal("cupo de instructor sin límite")
	}
	answer := repasoJugada{Accion: "responder", Partida: a.partida, Ronda: 0, Respuesta: enteroRepaso(repasoBanco[0].Buena)}
	if err = a.jugar(prof, answer, now); err != nil {
		t.Fatal(err)
	}
	at := now.Add(14500 * time.Millisecond)
	x, y := blancoRepaso(semillaRepaso(prof.ID, 0), 0, 0, .4)
	if err = a.jugar(prof, repasoJugada{Accion: "golpear", Partida: a.partida, Ronda: 0, Slot: 0, X: x, Y: y, AtMS: at.UnixMilli()}, at); err != nil {
		t.Fatal(err)
	}
	if prof.Puntos != 105 || prof.Golpes != 1 {
		t.Fatal("el instructor no suma", prof.Puntos, prof.Golpes)
	}
}
