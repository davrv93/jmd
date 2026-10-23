package httpapi

import (
	"testing"
	"time"
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

// El número de rifa se asigna al anotarse, no cambia y se devuelve también al repetir.
func TestSorteoNumeroAlParticipar(t *testing.T) {
	e := newEnv(t)
	conSorteo(t, rifaDePrueba())
	if r := e.call("GET", "/api/v1/sorteo/rifa-test", "", false, nil, ""); r.code != 200 {
		t.Fatalf("info pública: %d %s", r.code, r.raw)
	}
	// correo no registrado
	if r := e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "nadie@x.test"}, ""); r.code != 404 || errCode(r) != "sin_registro" {
		t.Fatalf("sin registro: %d %s", r.code, r.raw)
	}
	// con cuenta real: se anota y le toca número
	if tok := e.register("ana@x.test"); tok == "" {
		t.Fatal("registro")
	}
	r := e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "ana@x.test"}, "")
	if r.code != 201 {
		t.Fatalf("participar: %d %s", r.code, r.raw)
	}
	num1 := r.body["numero"]
	if num1 == nil || num1.(float64) < 1 {
		t.Fatalf("sin número: %s", r.raw)
	}
	// repetir: 409 CON el mismo número
	r = e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "ana@x.test"}, "")
	if r.code != 409 || errCode(r) != "ya_participa" {
		t.Fatalf("repetido: %d %s", r.code, r.raw)
	}
	if r.body["numero"] == nil || r.body["numero"] != num1 {
		t.Fatalf("debe devolver el mismo número: %v vs %v", r.body["numero"], num1)
	}
	// otro correo con cuenta: número distinto
	e.register("ben@x.test")
	r = e.call("POST", "/api/v1/sorteo/rifa-test/participar", "", false,
		map[string]any{"email": "ben@x.test"}, "")
	if r.code != 201 || r.body["numero"] == num1 {
		t.Fatalf("número distinto: %s", r.raw)
	}
	// la info pública sigue sin filtrar correos y cuenta participantes
	info := e.call("GET", "/api/v1/sorteo/rifa-test", "", false, nil, "")
	if info.code != 200 || info.body["participantes"].(float64) != 2 {
		t.Fatalf("info: %s", info.raw) // Ana y Ben: el primer intento (correo sin registrar) fue 404
	}
}

// Sortear deja al ganador con su número, a dentro de la cohorte y no pasa del tope.
func TestSorteoSortearConNumero(t *testing.T) {
	e := newEnv(t)
	conSorteo(t, rifaDePrueba())
	ptok := e.login("profe@x.test", "profe1234")
	for _, c := range []string{"ana@x.test", "ben@x.test"} {
		e.register(c)
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
	// exactamente uno de los dos quedó dentro de la cohorte del premio
	dentro := 0
	for _, correo := range []string{"ana@x.test", "ben@x.test"} {
		u, err := e.db.UserByEmail(t.Context(), correo)
		if err != nil {
			t.Fatal(err)
		}
		for _, c := range u.Cohorts {
			if c == "coho-rifa" {
				dentro++
			}
		}
	}
	if dentro != 1 {
		t.Fatalf("en la cohorte del premio debe quedar exactamente el ganador: %d", dentro)
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
}

// Al inscribirse al grupo del curso, el cupo queda jugado ahí mismo con su número.
func TestAutoSorteoAlInscribirse(t *testing.T) {
	e := newEnv(t)
	conSorteo(t, rifaDePrueba())
	e.s.Inscripcion = []string{"c1"}
	alta := map[string]string{"name": "Carla Diaz", "email": "carla@x.test", "password": "carla-1234"}
	r := e.call("POST", "/api/v1/inscripcion/c1", "", false, alta, "")
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
	// sin sorteo abierto, la inscripción no lo menciona
	sorteos = map[string]Sorteo{}
	r = e.call("POST", "/api/v1/inscripcion/c1", "", false,
		map[string]string{"name": "Diego Rios", "email": "diego@x.test", "password": "diego-1234"}, "")
	if r.code != 201 || r.body["sorteo"] != nil {
		t.Fatalf("sin sorteo: %d %s", r.code, r.raw)
	}
}
