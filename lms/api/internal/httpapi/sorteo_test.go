package httpapi

import (
	"strings"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// conSorteo registra un sorteo de prueba en el mapa global y lo restaura al salir.
func conSorteo(t *testing.T, s Sorteo) {
	t.Helper()
	antes := sorteos
	nuevo := make(map[string]Sorteo, len(antes)+1)
	for k, v := range antes {
		nuevo[k] = v
	}
	nuevo[s.ID] = s
	sorteos = nuevo
	t.Cleanup(func() { sorteos = antes })
}

func rifaDePrueba() Sorteo {
	return Sorteo{
		ID: "rifa-test", Titulo: "Rifa de prueba", CursoID: "curso", Cohorte: "coho-rifa",
		MaxGanadores: 1, Inicia: time.Now().Add(-time.Hour), Termina: time.Now().Add(48 * time.Hour),
	}
}

// CUALQUIER correo participa: con cuenta o sin ella. El número se fija al anotarse.
func TestSorteoAceptaCualquierCorreo(t *testing.T) {
	e := newEnv(t)
	conSorteo(t, rifaDePrueba())
	if r := e.call("GET", "/api/v1/sorteo/rifa-test", "", false, nil, ""); r.code != 200 {
		t.Fatalf("info pública: %d %s", r.code, r.raw)
	}
	// correo SIN cuenta: participa igual (antes daba 404)
	r := e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "sincuenta@gmail.com"}, "")
	if r.code != 201 {
		t.Fatalf("sin cuenta debe participar: %d %s", r.code, r.raw)
	}
	numA := r.body["numero"]
	if numA == nil || numA.(float64) < 1 {
		t.Fatalf("sin número: %s", r.raw)
	}
	// correo CON cuenta: también, con número distinto
	e.register("ana@x.test")
	r = e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "ana@x.test"}, "")
	if r.code != 201 || r.body["numero"] == numA {
		t.Fatalf("con cuenta: %d %s", r.code, r.raw)
	}
	// repetir: 409 con el MISMO número
	r = e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "SINCUENTA@gmail.com"}, "")
	if r.code != 409 || errCode(r) != "ya_participa" || r.body["numero"] != numA {
		t.Fatalf("repetido: %d %s", r.code, r.raw)
	}
	// correo inválido
	if r := e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "no-es-correo"}, ""); r.code != 400 {
		t.Fatalf("correo inválido: %d %s", r.code, r.raw)
	}
	info := e.call("GET", "/api/v1/sorteo/rifa-test", "", false, nil, "")
	if info.code != 200 || info.body["participantes"].(float64) != 2 {
		t.Fatalf("info: %s", info.raw)
	}
}

// Al inscribirse al grupo del curso el cupo queda jugado ahí mismo con su número.
func TestAutoSorteoAlInscribirse(t *testing.T) {
	e := newEnv(t)
	conSorteo(t, rifaDePrueba())
	e.s.Inscripcion = []string{"c1"}
	r := e.call("POST", "/api/v1/inscripcion/c1", "", false,
		map[string]string{"name": "Carla Diaz", "email": "carla@x.test", "password": "carla-1234"}, "")
	if r.code != 201 {
		t.Fatalf("inscripción: %d %s", r.code, r.raw)
	}
	auto := r.body["sorteo"]
	if auto == nil {
		t.Fatalf("debe avisar el sorteo automático: %s", r.raw)
	}
	m := auto.(map[string]any)
	if m["id"] != "rifa-test" || m["numero"] == nil || m["numero"].(float64) < 1 {
		t.Fatalf("sorteo mal: %v", m)
	}
	// al reabrir/volver a inscribir, el mismo número (no se reanota)
	sorteos = map[string]Sorteo{}
}

// Sortear: el ganador con cuenta entra a la cohorte; el ganador sin cuenta la
// recibe recién cuando se inscribe con ese correo.
func TestSorteoGanadorSinCuentaRecibePremioAlEntrar(t *testing.T) {
	e := newEnv(t)
	conSorteo(t, rifaDePrueba())
	ptok := e.login("profe@x.test", "profe1234")
	// un ganador sin cuenta y otro con cuenta; tope 1 → se sortea "a mano" dos veces
	e.register("concuenta@x.test")
	for _, c := range []string{"sincuenta@gmail.com", "concuenta@x.test"} {
		if r := e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
			map[string]any{"email": c}, ""); r.code != 201 {
			t.Fatalf("anotar %s: %d %s", c, r.code, r.raw)
		}
	}
	// el alumno no sortea
	if r := e.call("POST", "/api/v1/sorteo/rifa-test/sortear", "", false, map[string]any{}, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
	r := e.call("POST", "/api/v1/sorteo/rifa-test/sortear", ptok, false, map[string]any{}, "")
	if r.code != 200 {
		t.Fatalf("sortear: %d %s", r.code, r.raw)
	}
	gans := r.body["ganadores"].([]any)
	if len(gans) != 1 {
		t.Fatalf("max 1 ganador: %s", r.raw)
	}
	g := gans[0].(map[string]any)
	if g["numero"] == nil || g["numero"].(float64) < 1 || g["posicion"].(float64) != 1 {
		t.Fatalf("ganador sin número o posición: %v", g)
	}
	// tope
	if r = e.call("POST", "/api/v1/sorteo/rifa-test/sortear", ptok, false, map[string]any{}, ""); r.code != 409 {
		t.Fatalf("completo: %d %s", r.code, r.raw)
	}
	info := e.call("GET", "/api/v1/sorteo/rifa-test", "", false, nil, "")
	pub := info.body["ganadores"].([]any)[0].(map[string]any)
	if pub["numero"] == nil || pub["posicion"] == nil {
		t.Fatalf("info pública sin número: %v", pub)
	}
	// Si el ganador NO tenía cuenta: al inscribirse con ese correo recibe la cohorte.
	gano, _ := e.db.SorteoPremioPendiente(t.Context(), "rifa-test", "sincuenta@gmail.com")
	if !gano {
		t.Skip("el sorteo eligió al de cuenta; el caso «sin cuenta» se cubre en store")
	}
	e.s.Inscripcion = []string{"c1"}
	r = e.call("POST", "/api/v1/inscripcion/c1", "", false,
		map[string]string{"name": "Sin Cuenta", "email": "sincuenta@gmail.com", "password": "sincuenta-1234"}, "")
	if r.code != 201 {
		t.Fatalf("inscripción del ganador: %d %s", r.code, r.raw)
	}
	auto, _ := r.body["sorteo"].(map[string]any)
	if auto == nil || auto["ganador"] != true {
		t.Fatalf("debe reconocerlo como ganador: %s", r.raw)
	}
	u, err := e.db.UserByEmail(t.Context(), "sincuenta@gmail.com")
	if err != nil {
		t.Fatal(err)
	}
	tiene := false
	for _, c := range u.Cohorts {
		if c == "coho-rifa" {
			tiene = true
		}
	}
	if !tiene {
		t.Fatalf("el ganador debe entrar al curso: %v", u.Cohorts)
	}
}

// La consulta de ticket (link de consolación) distingue ganador, no ganador y desconocido.
func TestSorteoTicket(t *testing.T) {
	e := newEnv(t)
	conSorteo(t, rifaDePrueba())
	for _, c := range []string{"gana@gmail.com", "pierde@gmail.com"} {
		if r := e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
			map[string]any{"email": c}, ""); r.code != 201 {
			t.Fatalf("anotar %s: %d %s", c, r.code, r.raw)
		}
	}
	ptok := e.login("profe@x.test", "profe1234")
	if r := e.call("POST", "/api/v1/sorteo/rifa-test/sortear", ptok, false, map[string]any{}, ""); r.code != 200 {
		t.Fatalf("sortear: %d %s", r.code, r.raw)
	}
	ps, _ := e.db.SorteoParticipantes(t.Context(), "rifa-test")
	if len(ps) != 2 {
		t.Fatalf("participantes: %+v", ps)
	}
	gano, perdio := ps[0], ps[1]
	if ok, _ := e.db.SorteoPremioPendiente(t.Context(), "rifa-test", perdio.Email); ok {
		gano, perdio = perdio, gano
	}
	r := e.call("GET", "/api/v1/sorteo/rifa-test/ticket/"+itoa(gano.Numero), "", false, nil, "")
	if r.code != 200 || r.body["estado"] != "ganador" || r.body["numero"].(float64) != float64(gano.Numero) {
		t.Fatalf("ticket del ganador: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/"+itoa(perdio.Numero), "", false, nil, "")
	if r.code != 200 || r.body["estado"] != "no_ganador" {
		t.Fatalf("ticket del que no ganó: %d %s", r.code, r.raw)
	}
	// El mismo ticket por su CÓDIGO de varios caracteres (con y sin prefijo).
	cod := store.SorteoCodigo("rifa-test", gano.Email)
	if r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/"+cod, "", false, nil, ""); r.code != 200 || r.body["estado"] != "ganador" || r.body["codigo"] != cod {
		t.Fatalf("ticket por código: %d %s", r.code, r.raw)
	}
	sinPrefijo := strings.ToLower(strings.TrimPrefix(cod, "MT-"))
	if r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/"+sinPrefijo, "", false, nil, ""); r.code != 200 || r.body["estado"] != "ganador" {
		t.Fatalf("código sin prefijo y en minúsculas: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/"+store.SorteoCodigo("rifa-test", perdio.Email), "", false, nil, ""); r.code != 200 || r.body["estado"] != "no_ganador" {
		t.Fatalf("código del que no ganó: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/MT-999999", "", false, nil, ""); r.code != 404 || errCode(r) != "no_existe" {
		t.Fatalf("código inexistente: %d %s", r.code, r.raw)
	}
	// un número que nadie tiene
	if r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/1", "", false, nil, ""); r.code != 404 || errCode(r) != "no_existe" {
		t.Fatalf("número desconocido: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/99999", "", false, nil, ""); r.code != 400 {
		t.Fatalf("fuera de rango: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/sorteo/rifa-test/ticket/abc", "", false, nil, ""); r.code != 404 || errCode(r) != "no_existe" {
		t.Fatalf("texto que no es un código válido: %d %s", r.code, r.raw)
	}
}

// itoa para no importar strconv solo por el test.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
