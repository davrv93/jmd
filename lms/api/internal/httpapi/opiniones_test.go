package httpapi

import (
	"strings"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// alumnoCon registra un alumno del grupo c1 con ese nombre y devuelve su token.
func (e *env) alumnoCon(email, nombre string) string {
	e.t.Helper()
	r := e.call("POST", "/api/v1/auth/register", "", false, map[string]string{"email": email, "name": nombre, "password": "alumno1234", "invite_code": "abc"}, "")
	if r.code != 201 {
		e.t.Fatalf("registro %s: %d %s", email, r.code, r.raw)
	}
	return r.body["token"].(string)
}

// Una opinión por alumno y sesión: volver a enviarla la edita (mismo id, conserva los «me gusta»).
func TestOpinionUnaPorSesionYEditar(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana María Torres")
	beto := e.alumnoCon("beto@x.test", "Beto")

	r := e.call("GET", "/api/v1/lessons/l1/opinion", ana, false, nil, "")
	if r.code != 200 || r.body["opinion"] != nil || r.body["puede"] != true {
		t.Fatalf("sin opinión todavía: %d %s", r.code, r.raw)
	}
	r = e.call("PUT", "/api/v1/lessons/l1/opinion", ana, false, map[string]any{"estrellas": 4, "texto": "  Muy   buena\n\nclase <b>hola</b>  "}, "")
	if r.code != 200 {
		t.Fatalf("guardar: %d %s", r.code, r.raw)
	}
	id := r.body["id"].(string)
	if r.body["texto"] != "Muy buena clase <b>hola</b>" || r.body["nombre"] != "Ana" || r.body["mia"] != true {
		t.Fatalf("texto limpio y primer nombre: %s", r.raw)
	}
	if strings.Contains(string(r.raw), "ana@x.test") || strings.Contains(string(r.raw), "Torres") {
		t.Fatalf("la vista deja ver el correo o el apellido: %s", r.raw)
	}
	// Beto le da «me gusta»; Ana edita y el «me gusta» sigue.
	if r := e.call("POST", "/api/v1/opiniones/"+id+"/like", beto, false, map[string]any{}, ""); r.code != 200 || r.body["likes"] != float64(1) || r.body["me_gusta"] != true {
		t.Fatalf("like: %d %s", r.code, r.raw)
	}
	r = e.call("PUT", "/api/v1/lessons/l1/opinion", ana, false, map[string]any{"estrellas": 5, "texto": "Mejor de lo que pensé"}, "")
	if r.code != 200 || r.body["id"] != id || r.body["estrellas"] != float64(5) || r.body["likes"] != float64(1) {
		t.Fatalf("editar: %d %s", r.code, r.raw)
	}
	r = e.call("GET", "/api/v1/courses/curso/opiniones", beto, false, nil, "")
	if r.code != 200 || r.body["total"] != float64(1) || r.body["promedio"] != float64(5) {
		t.Fatalf("lista del curso: %d %s", r.code, r.raw)
	}
	ops := r.body["opiniones"].([]any)
	if len(ops) != 1 || ops[0].(map[string]any)["lesson_title"] != "Sesión publicada" || ops[0].(map[string]any)["mia"] != false {
		t.Fatalf("una sola opinión, con la sesión: %s", r.raw)
	}
	if _, ok := ops[0].(map[string]any)["oculta"]; ok {
		t.Fatalf("el alumno no ve la marca de moderación: %s", r.raw)
	}
}

// Validación: estrellas de 1 a 5, texto de hasta 400 caracteres, sin lisuras; el texto es opcional.
func TestOpinionValidacion(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana")
	for _, c := range []struct {
		body map[string]any
		code int
	}{
		{map[string]any{"estrellas": 0, "texto": "x"}, 400},
		{map[string]any{"estrellas": 6, "texto": "x"}, 400},
		{map[string]any{"estrellas": 3, "texto": strings.Repeat("a", 401)}, 400},
		{map[string]any{"estrellas": 3, "texto": "esta clase fue una mierda"}, 422},
		{map[string]any{"estrellas": 3, "texto": "p.u.t.a clase"}, 422},
		{map[string]any{"estrellas": 3, "texto": "Aprendí a publicar la web online con Mari, conecté todo"}, 200},
		{map[string]any{"estrellas": 2}, 200},
		{map[string]any{"estrellas": 3, "texto": strings.Repeat("ñ", 400)}, 200},
	} {
		if r := e.call("PUT", "/api/v1/lessons/l1/opinion", ana, false, c.body, ""); r.code != c.code {
			t.Errorf("%v: %d %s", c.body, r.code, r.raw)
		}
	}
	// El personal no opina; una sesión en borrador no existe para el alumno.
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("PUT", "/api/v1/lessons/l1/opinion", profe, false, map[string]any{"estrellas": 5}, ""); r.code != 403 {
		t.Errorf("el personal opina: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/lessons/l1/opinion", profe, false, nil, ""); r.code != 200 || r.body["puede"] != false {
		t.Errorf("el personal ve que no puede: %d %s", r.code, r.raw)
	}
	if r := e.call("PUT", "/api/v1/lessons/l2/opinion", ana, false, map[string]any{"estrellas": 5}, ""); r.code != 404 {
		t.Errorf("sesión en borrador: %d %s", r.code, r.raw)
	}
}

// Nadie se da «me gusta» a sí mismo; el «me gusta» se alterna, uno por persona.
func TestOpinionLikeAlternaYNoPropia(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana")
	beto := e.alumnoCon("beto@x.test", "Beto")
	profe := e.login("profe@x.test", "profe1234")
	id := e.call("PUT", "/api/v1/lessons/l1/opinion", ana, false, map[string]any{"estrellas": 4, "texto": "bien"}, "").body["id"].(string)

	if r := e.call("POST", "/api/v1/opiniones/"+id+"/like", ana, false, map[string]any{}, ""); r.code != 403 || errCode(r) != "propia" {
		t.Fatalf("me gusta a la propia: %d %s", r.code, r.raw)
	}
	for i, want := range []struct {
		likes float64
		me    bool
	}{{1, true}, {0, false}, {1, true}} {
		r := e.call("POST", "/api/v1/opiniones/"+id+"/like", beto, false, map[string]any{}, "")
		if r.code != 200 || r.body["likes"] != want.likes || r.body["me_gusta"] != want.me {
			t.Fatalf("vuelta %d: %d %s", i, r.code, r.raw)
		}
	}
	// El personal también da «me gusta».
	if r := e.call("POST", "/api/v1/opiniones/"+id+"/like", profe, false, map[string]any{}, ""); r.code != 200 || r.body["likes"] != float64(2) {
		t.Fatalf("me gusta del personal: %d %s", r.code, r.raw)
	}
	r := e.call("GET", "/api/v1/courses/curso/opiniones", beto, false, nil, "")
	op := r.body["opiniones"].([]any)[0].(map[string]any)
	if op["likes"] != float64(2) || op["me_gusta"] != true {
		t.Fatalf("lista con mi «me gusta»: %s", r.raw)
	}
	if r := e.call("POST", "/api/v1/opiniones/noexiste/like", beto, false, map[string]any{}, ""); r.code != 404 {
		t.Fatalf("opinión inexistente: %d", r.code)
	}
}

// Acceso: quien no ve el curso no ve ni toca sus opiniones; sin sesión, 401.
func TestOpinionAcceso(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana")
	id := e.call("PUT", "/api/v1/lessons/l1/opinion", ana, false, map[string]any{"estrellas": 4, "texto": "bien"}, "").body["id"].(string)

	hash, _ := auth.HashPassword("otro-1234")
	if err := e.db.CreateUser(t.Context(), &store.User{Email: "c2@x.test", Name: "Otro", PasswordHash: hash, Roles: []string{"student"}, Cohorts: []string{"c2"}}); err != nil {
		t.Fatal(err)
	}
	otro := e.login("c2@x.test", "otro-1234")
	if r := e.call("GET", "/api/v1/courses/curso/opiniones", otro, false, nil, ""); r.code != 404 {
		t.Errorf("otro grupo lee: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/opiniones/"+id+"/like", otro, false, map[string]any{}, ""); r.code != 404 {
		t.Errorf("otro grupo da me gusta: %d", r.code)
	}
	if r := e.call("PUT", "/api/v1/lessons/l1/opinion", otro, false, map[string]any{"estrellas": 1}, ""); r.code != 404 {
		t.Errorf("otro grupo opina: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/courses/curso/opiniones", "", false, nil, ""); r.code != 401 {
		t.Errorf("sin sesión: %d", r.code)
	}
	// Un alumno no modera.
	if r := e.call("PUT", "/api/v1/opiniones/"+id+"/oculta", ana, false, map[string]any{"oculta": true}, ""); r.code != 403 {
		t.Errorf("alumno oculta: %d", r.code)
	}
	// Con cookie, una escritura sin JSON se rechaza (CSRF).
	if r := e.call("POST", "/api/v1/opiniones/"+id+"/like", otro, true, "x", "text/plain"); r.code != 403 {
		t.Errorf("cookie sin JSON: %d", r.code)
	}
}

// Ocultar: desaparece para los alumnos (lista, promedio y «me gusta»); el personal la sigue viendo marcada.
func TestOpinionOculta(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana")
	beto := e.alumnoCon("beto@x.test", "Beto")
	profe := e.login("profe@x.test", "profe1234")
	idA := e.call("PUT", "/api/v1/lessons/l1/opinion", ana, false, map[string]any{"estrellas": 1, "texto": "spam spam"}, "").body["id"].(string)
	e.call("PUT", "/api/v1/lessons/l1/opinion", beto, false, map[string]any{"estrellas": 5, "texto": "genial"}, "")

	if r := e.call("PUT", "/api/v1/opiniones/"+idA+"/oculta", profe, false, map[string]any{"oculta": true}, ""); r.code != 200 || r.body["oculta"] != true {
		t.Fatalf("ocultar: %d %s", r.code, r.raw)
	}
	r := e.call("GET", "/api/v1/courses/curso/opiniones", beto, false, nil, "")
	if r.body["total"] != float64(1) || r.body["promedio"] != float64(5) || len(r.body["opiniones"].([]any)) != 1 {
		t.Fatalf("el alumno ya no la ve: %s", r.raw)
	}
	if r := e.call("POST", "/api/v1/opiniones/"+idA+"/like", beto, false, map[string]any{}, ""); r.code != 404 {
		t.Fatalf("me gusta a una oculta: %d", r.code)
	}
	r = e.call("GET", "/api/v1/courses/curso/opiniones", profe, false, nil, "")
	ops := r.body["opiniones"].([]any)
	if len(ops) != 2 || r.body["total"] != float64(1) {
		t.Fatalf("el personal ve las dos: %s", r.raw)
	}
	ocultas := 0
	for _, o := range ops {
		if o.(map[string]any)["oculta"] == true {
			ocultas++
		}
	}
	if ocultas != 1 {
		t.Fatalf("una marcada como oculta: %s", r.raw)
	}
	// Editarla no la vuelve a mostrar; mostrarla, sí.
	e.call("PUT", "/api/v1/lessons/l1/opinion", ana, false, map[string]any{"estrellas": 2, "texto": "otra cosa"}, "")
	if r := e.call("GET", "/api/v1/courses/curso/opiniones", beto, false, nil, ""); r.body["total"] != float64(1) {
		t.Fatalf("editar no la muestra: %s", r.raw)
	}
	e.call("PUT", "/api/v1/opiniones/"+idA+"/oculta", profe, false, map[string]any{"oculta": false}, "")
	if r := e.call("GET", "/api/v1/courses/curso/opiniones", beto, false, nil, ""); r.body["total"] != float64(2) {
		t.Fatalf("mostrar de nuevo: %s", r.raw)
	}
}

// Orden: más «me gusta» primero (el desempate por fecha se prueba en store).
func TestOpinionOrden(t *testing.T) {
	e := newEnv(t)
	toks := map[string]string{}
	for _, n := range []string{"Ana", "Beto", "Caro", "Dani"} {
		toks[n] = e.alumnoCon(strings.ToLower(n)+"@x.test", n)
	}
	ids := map[string]string{}
	for _, n := range []string{"Ana", "Beto", "Caro"} {
		ids[n] = e.call("PUT", "/api/v1/lessons/l1/opinion", toks[n], false, map[string]any{"estrellas": 3, "texto": "de " + n}, "").body["id"].(string)
	}
	// Beto: dos «me gusta»; Caro: uno; Ana: ninguno.
	e.call("POST", "/api/v1/opiniones/"+ids["Beto"]+"/like", toks["Ana"], false, map[string]any{}, "")
	e.call("POST", "/api/v1/opiniones/"+ids["Beto"]+"/like", toks["Dani"], false, map[string]any{}, "")
	e.call("POST", "/api/v1/opiniones/"+ids["Caro"]+"/like", toks["Dani"], false, map[string]any{}, "")
	r := e.call("GET", "/api/v1/courses/curso/opiniones", toks["Dani"], false, nil, "")
	var orden []string
	for _, o := range r.body["opiniones"].([]any) {
		orden = append(orden, o.(map[string]any)["nombre"].(string))
	}
	if strings.Join(orden, ",") != "Beto,Caro,Ana" {
		t.Fatalf("orden: %v", orden)
	}
}
