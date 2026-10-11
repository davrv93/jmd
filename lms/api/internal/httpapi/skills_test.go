package httpapi

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/davrv93/jmd/lms/api/internal/aula"
	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

const skillMia = "---\nname: saludo\ndescription: Saluda en español con una frase corta\n---\n# Saludo\n\n## Cuándo usar\n\nAl empezar.\n\n## Versión corta para modelos pequeños\n\n- Saluda.\n- No hables más.\n"

func cuerpoSkill(nombre string) string {
	return strings.Replace(skillMia, "name: saludo", "name: "+nombre, 1)
}

func TestSkillsCRUD(t *testing.T) {
	e := newEnv(t)
	a := e.register("a@x.test")
	r := e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": skillMia, "modelo_destino": "deepseek"}, "")
	if r.code != 201 || r.body["nombre"] != "saludo" || r.body["version"] != float64(1) || r.body["origen"] != "propia" {
		t.Fatalf("crear: %d %s", r.code, r.raw)
	}
	vars, _ := r.body["variantes"].(map[string]any)
	if len(vars) != 6 || vars["deepseek"] == vars["claude"] {
		t.Errorf("deben generarse las variantes distintas por perfil: %v", vars)
	}
	if r := e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": skillMia}, ""); r.code != 409 {
		t.Errorf("duplicada: %d", r.code)
	}
	l := e.call("GET", "/api/v1/mis-skills", a, false, nil, "")
	if l.code != 200 || len(l.list) != 1 || l.list[0]["nombre"] != "saludo" || l.list[0]["modelo_destino"] != "deepseek" {
		t.Fatalf("lista: %d %s", l.code, l.raw)
	}
	if _, hay := l.list[0]["cuerpo"]; hay {
		t.Error("la lista no lleva el cuerpo")
	}
	g := e.call("GET", "/api/v1/mis-skills/saludo", a, false, nil, "")
	if g.code != 200 || g.body["cuerpo"] != skillMia {
		t.Fatalf("leer: %d %s", g.code, g.raw)
	}
	nuevo := strings.Replace(skillMia, "Saluda.", "Saluda y despídete.", 1)
	p := e.call("PUT", "/api/v1/mis-skills/saludo", a, false, map[string]any{"cuerpo": nuevo, "modelo_destino": "nemotron"}, "")
	if p.code != 200 || p.body["version"] != float64(2) || p.body["modelo_destino"] != "nemotron" {
		t.Fatalf("guardar: %d %s", p.code, p.raw)
	}
	if r := e.call("PUT", "/api/v1/mis-skills/saludo", a, false, map[string]any{"cuerpo": cuerpoSkill("otro-nombre")}, ""); r.code != 400 || errCode(r) != "nombre_no_coincide" {
		t.Errorf("nombre distinto: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": skillMia, "modelo_destino": "inventado"}, ""); r.code != 400 {
		t.Errorf("modelo_destino inválido: %d", r.code)
	}
	if r := e.call("DELETE", "/api/v1/mis-skills/saludo", a, false, nil, ""); r.code != 204 {
		t.Fatalf("borrar: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/mis-skills/saludo", a, false, nil, ""); r.code != 404 {
		t.Errorf("tras borrar: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/mis-skills", "", false, nil, ""); r.code != 401 {
		t.Errorf("sin sesión: %d", r.code)
	}
}

// B no ve ni toca la skill de A: ni siquiera el instructor (staff) puede editarla.
func TestSkillsOtroAlumno403(t *testing.T) {
	e := newEnv(t)
	a, b := e.register("a@x.test"), e.register("b@x.test")
	if r := e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": skillMia}, ""); r.code != 201 {
		t.Fatalf("crear A: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/mis-skills/saludo", b, false, nil, ""); r.code != 404 {
		t.Errorf("GET ajena: %d", r.code)
	}
	if r := e.call("PUT", "/api/v1/mis-skills/saludo", b, false, map[string]any{"cuerpo": skillMia}, ""); r.code != 403 {
		t.Errorf("PUT ajena: %d", r.code)
	}
	if r := e.call("DELETE", "/api/v1/mis-skills/saludo", b, false, nil, ""); r.code != 403 {
		t.Errorf("DELETE ajena: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/mis-skills", b, false, nil, ""); len(r.list) != 0 {
		t.Errorf("B no debe listar nada: %s", r.raw)
	}
	profe := e.login("profe@x.test", "profe1234")
	if r := e.call("PUT", "/api/v1/mis-skills/saludo", profe, false, map[string]any{"cuerpo": skillMia}, ""); r.code != 403 {
		t.Errorf("el staff no edita skills ajenas: %d", r.code)
	}
	// El mismo nombre en cuentas distintas no se pisa.
	if r := e.call("POST", "/api/v1/mis-skills", b, false, map[string]any{"cuerpo": strings.Replace(skillMia, "Al empezar.", "Texto de B.", 1)}, ""); r.code != 201 {
		t.Fatalf("crear B: %d %s", r.code, r.raw)
	}
	if r := e.call("GET", "/api/v1/mis-skills/saludo", a, false, nil, ""); !strings.Contains(r.body["cuerpo"].(string), "Al empezar.") {
		t.Errorf("A conserva lo suyo: %s", r.raw)
	}
}

func TestSkillsFrontMatterInvalido(t *testing.T) {
	e := newEnv(t)
	a := e.register("a@x.test")
	casos := map[string]string{
		"sin description":      "---\nname: saludo\n---\ncuerpo",
		"description corta":    "---\nname: saludo\ndescription: corta\n---\ncuerpo",
		"name con mayúsculas":  "---\nname: Mi Skill\ndescription: Saluda en español con una frase corta\n---\ncuerpo",
		"name con mayúscula 2": "---\nname: miSkill\ndescription: Saluda en español con una frase corta\n---\ncuerpo",
		"name de 1 letra":      "---\nname: a\ndescription: Saluda en español con una frase corta\n---\ncuerpo",
		"name con guion doble": "---\nname: a--b\ndescription: Saluda en español con una frase corta\n---\ncuerpo",
		"sin front matter":     "solo texto",
		"demasiado grande":     "---\nname: grande\ndescription: Saluda en español con una frase corta\n---\n" + strings.Repeat("x", 65*1024),
		"description larga":    "---\nname: larga\ndescription: " + strings.Repeat("a", 301) + "\n---\ncuerpo",
	}
	for nombre, c := range casos {
		if r := e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": c}, ""); r.code != 400 {
			t.Errorf("%s: esperaba 400, fue %d %s", nombre, r.code, r.raw)
		}
	}
	if r := e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": "---\nname: 'bien-hecha'\ndescription: \"Una descripción válida y clara\"\n---\nok"}, ""); r.code != 201 {
		t.Errorf("con comillas debe valer: %d %s", r.code, r.raw)
	}
}

// newEnvSkillsCurso: el fixture normal más dos skills del curso (y una carpeta de perfiles que no cuenta).
func newEnvSkillsCurso(t *testing.T) *env {
	t.Helper()
	dir := writeFixture(t)
	sk := map[string]string{
		"skills/ordenar-ideas/SKILL.md": "---\nname: ordenar-ideas\ndescription: Ordena ideas sueltas en una lista con prioridades\n---\n# Ordenar ideas\n\n## Principios\n\n- Una idea por línea.\n",
		"skills/revisar-texto/SKILL.md": "---\nname: revisar-texto\ndescription: " + strings.Repeat("Revisa un texto con cuidado. ", 12) + "\n---\n# Revisar\n",
		"skills/_perfiles/SKILL.md":     "---\nname: no-cuenta\ndescription: No es una skill del curso\n---\n",
	}
	for rel, body := range sk {
		ruta := filepath.Join(dir, "courses", "curso", filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(ruta), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(ruta, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	cs, err := content.NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	db, err := store.Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	s := &Server{Content: cs, DB: db, InviteCode: "abc", DefaultCohort: "c1", PublicURL: "http://lms.test"}
	srv := httptest.NewServer(s.Handler())
	t.Cleanup(srv.Close)
	hash, _ := auth.HashPassword("profe1234")
	if err := db.CreateUser(t.Context(), &store.User{Email: "profe@x.test", Name: "Profe", PasswordHash: hash, Roles: []string{"admin", "instructor"}}); err != nil {
		t.Fatal(err)
	}
	return &env{t: t, srv: srv, db: db, s: s}
}

func TestSkillsCursoCopiar(t *testing.T) {
	e := newEnvSkillsCurso(t)
	a, b := e.register("a@x.test"), e.register("b@x.test")
	l := e.call("GET", "/api/v1/skills-curso", a, false, nil, "")
	if l.code != 200 || len(l.list) != 2 || l.list[0]["nombre"] != "ordenar-ideas" || l.list[1]["nombre"] != "revisar-texto" {
		t.Fatalf("skills del curso: %d %s", l.code, l.raw)
	}
	if !strings.Contains(l.list[0]["cuerpo"].(string), "Una idea por línea") {
		t.Errorf("la lista del curso lleva el cuerpo")
	}
	c := e.call("POST", "/api/v1/mis-skills/ordenar-ideas/copiar", a, false, map[string]any{}, "")
	if c.code != 201 || c.body["origen"] != "copiada" || c.body["nombre"] != "ordenar-ideas" {
		t.Fatalf("copiar: %d %s", c.code, c.raw)
	}
	if r := e.call("POST", "/api/v1/mis-skills/ordenar-ideas/copiar", a, false, map[string]any{}, ""); r.code != 409 {
		t.Errorf("segunda copia: %d", r.code)
	}
	otra := e.call("POST", "/api/v1/mis-skills/ordenar-ideas/copiar", a, false, map[string]any{"nuevo_nombre": "ordenar-mis-ideas"}, "")
	if otra.code != 201 || otra.body["nombre"] != "ordenar-mis-ideas" || !strings.Contains(otra.body["cuerpo"].(string), "name: ordenar-mis-ideas") {
		t.Fatalf("copiar con otro nombre: %d %s", otra.code, otra.raw)
	}
	if r := e.call("POST", "/api/v1/mis-skills/revisar-texto/copiar", a, false, nil, ""); r.code != 201 {
		t.Errorf("la del curso con descripción larga se copia tal cual: %d %s", r.code, r.raw)
	}
	// Y se puede editar el cuerpo sin tener que acortar la descripción.
	g := e.call("GET", "/api/v1/mis-skills/revisar-texto", a, false, nil, "")
	if r := e.call("PUT", "/api/v1/mis-skills/revisar-texto", a, false, map[string]any{"cuerpo": g.body["cuerpo"].(string) + "\nMás.\n"}, ""); r.code != 200 {
		t.Errorf("editar la copia: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/mis-skills/no-existe/copiar", a, false, nil, ""); r.code != 404 {
		t.Errorf("inexistente: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/mis-skills/_perfiles/copiar", a, false, nil, ""); r.code != 404 {
		t.Errorf("_perfiles no se copia: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/mis-skills", a, false, nil, ""); len(r.list) != 3 {
		t.Errorf("A debe tener 3: %s", r.raw)
	}
	if r := e.call("GET", "/api/v1/mis-skills", b, false, nil, ""); len(r.list) != 0 {
		t.Errorf("B no debe ver las copias de A: %s", r.raw)
	}
}

// Cada contenedor recibe solo las skills de su dueño; borrar una la quita del suyo y de nadie más.
func TestMontajeSoloPropias(t *testing.T) {
	e := newEnv(t)
	f := &aulaFalsa{}
	e.setAula(f)
	a, b := e.register("a@x.test"), e.register("b@x.test")
	ua, ub := e.idDe(a), e.idDe(b)
	for _, tok := range []string{a, b} {
		if r := e.call("POST", "/api/v1/aula/iniciar", tok, false, map[string]any{}, ""); r.code != 200 {
			t.Fatalf("iniciar: %d %s", r.code, r.raw)
		}
	}
	e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": cuerpoSkill("uno-de-a")}, "")
	e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": cuerpoSkill("saludo"), "modelo_destino": "deepseek"}, "")
	e.call("POST", "/api/v1/mis-skills", b, false, map[string]any{"cuerpo": strings.Replace(cuerpoSkill("saludo"), "Al empezar.", "Texto de B.", 1)}, "")

	ma, mb := f.montadasDe(aula.Nombre(ua)), f.montadasDe(aula.Nombre(ub))
	if len(ma) != 2 || len(mb) != 1 {
		t.Fatalf("A debe tener 2 y B 1: %v | %v", ma, mb)
	}
	if _, hay := mb["/trabajo/skills/uno-de-a/SKILL.md"]; hay {
		t.Error("la skill de A no puede llegar al contenedor de B")
	}
	if !strings.Contains(mb["/trabajo/skills/saludo/SKILL.md"], "Texto de B.") || strings.Contains(ma["/trabajo/skills/saludo/SKILL.md"], "Texto de B.") {
		t.Error("el mismo nombre en dos alumnos no se mezcla")
	}
	// Con modelo_destino deepseek se monta su variante (corta), no el cuerpo entero.
	if v := ma["/trabajo/skills/saludo/SKILL.md"]; strings.Contains(v, "Cuándo usar") || !strings.Contains(v, "Formato de salida obligatorio") {
		t.Errorf("A monta la variante de deepseek:\n%s", v)
	}
	// Borrar la de A no toca la de B.
	e.call("DELETE", "/api/v1/mis-skills/saludo", a, false, nil, "")
	ma, mb = f.montadasDe(aula.Nombre(ua)), f.montadasDe(aula.Nombre(ub))
	if len(ma) != 1 || len(mb) != 1 {
		t.Errorf("tras borrar: A %v | B %v", ma, mb)
	}
	// Con el contenedor parado no se monta nada.
	f.mu.Lock()
	f.corriendo[ua] = false
	f.mu.Unlock()
	e.call("POST", "/api/v1/mis-skills", a, false, map[string]any{"cuerpo": cuerpoSkill("nueva-de-a")}, "")
	if len(f.montadasDe(aula.Nombre(ua))) != 1 {
		t.Error("con el aula parada no se escribe")
	}
}

func (a *aulaFalsa) montadasDe(contenedor string) map[string]string {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := map[string]string{}
	for k, v := range a.montadas[contenedor] {
		out[k] = v
	}
	return out
}

// idDe devuelve el id del usuario de un token.
func (e *env) idDe(token string) string {
	e.t.Helper()
	r := e.call("GET", "/api/v1/me", token, false, nil, "")
	id, _ := r.body["id"].(string)
	if id == "" {
		e.t.Fatalf("me: %s", r.raw)
	}
	return id
}

// Una skill creada desde la terminal se importa a la cuenta de quien la creó, y solo de su contenedor.
func TestImportarSkillDeLaTerminal(t *testing.T) {
	e := newEnv(t)
	f := &aulaFalsa{archivos: map[string][]byte{"skills/hecha-en-terminal/SKILL.md": []byte(cuerpoSkill("hecha-en-terminal"))}}
	e.setAula(f)
	a := e.register("a@x.test")
	if r := e.call("POST", "/api/v1/mis-skills/importar", a, false, map[string]any{"nombre": "hecha-en-terminal"}, ""); r.code != 409 {
		t.Errorf("sin aula iniciada: %d", r.code)
	}
	e.call("POST", "/api/v1/aula/iniciar", a, false, map[string]any{}, "")
	r := e.call("POST", "/api/v1/mis-skills/importar", a, false, map[string]any{"nombre": "hecha-en-terminal"}, "")
	if r.code != 201 || r.body["origen"] != "importada" {
		t.Fatalf("importar: %d %s", r.code, r.raw)
	}
	if r := e.call("POST", "/api/v1/mis-skills/importar", a, false, map[string]any{"nombre": "hecha-en-terminal"}, ""); r.code != 409 {
		t.Errorf("segunda vez: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/mis-skills/importar", a, false, map[string]any{"nombre": "../etc"}, ""); r.code != 400 {
		t.Errorf("nombre no slug: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/mis-skills/importar", a, false, map[string]any{"nombre": "no-esta"}, ""); r.code != 404 {
		t.Errorf("inexistente: %d", r.code)
	}
}
