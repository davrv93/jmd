package httpapi

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// newEnvCatalogo: el fixture más cinco grupos con fechas alrededor del 22-11-2026 (el reloj del
// catálogo se fija ahí): uno dictado, uno en curso, dos que vienen del área de diseño y uno de datos.
func newEnvCatalogo(t *testing.T) *env {
	t.Helper()
	dir := writeFixture(t)
	curso := func(id, cohorte, area, nombre, grupo string, inicios ...string) map[string]string {
		m := map[string]string{}
		var ids []string
		for i, ini := range inicios {
			lid := id + "-" + string(rune('1'+i))
			ids = append(ids, lid)
			pub := "false"
			if i == 0 {
				pub = "true"
			}
			m["lessons/"+lid+".md"] = "---\nid: " + lid + "\ntitle: Grupo 1 · Clase " + string(rune('1'+i)) + " · Tema " + lid + "\nstarts_at: " + ini + "\npublished: " + pub + "\n---\nHola\n"
		}
		m["course.yaml"] = "id: " + id + "\ntitle: " + nombre + " · " + grupo + "\ndescription: Un curso de " + nombre + ". Fechas y precio.\ncohorts: [" + cohorte + "]\n" +
			"agenda: {nombre: " + nombre + ", grupo: " + grupo + ", area: " + area + ", minutos: 60}\nmodules:\n  - id: m1\n    title: \"Sesión 1 · Lo primero\"\n    lessons: [" + strings.Join(ids, ", ") + "]\n"
		return m
	}
	cursos := map[string]map[string]string{
		"pasado":    curso("pasado", "g-pasado", "diseno", "Diseño viejo", "Grupo 1", "2026-10-01T19:00:00-05:00"),
		"en-curso":  curso("en-curso", "g-curso", "datos", "Datos ya", "Grupo 1", "2026-11-15T19:00:00-05:00", "2026-11-29T19:00:00-05:00"),
		"diseno-1":  curso("diseno-1", "g-dis1", "diseno", "Video con IA", "Grupo 1", "2026-11-30T19:00:00-05:00", "2026-12-02T19:00:00-05:00"),
		"diseno-2":  curso("diseno-2", "g-dis2", "diseno", "Video con IA", "Grupo 2", "2027-01-10T19:00:00-05:00"),
		"datos-sql": curso("datos-sql", "g-sql", "datos", "SQL con IA", "Grupo 1", "2026-11-25T19:00:00-05:00"),
	}
	cursos["diseno-1"]["course.yaml"] += "identidad:\n  color: coral\n  icono: film\n  frase: Videos que venden.\n"
	for id, archivos := range cursos {
		for nombre, texto := range archivos {
			ruta := filepath.Join(dir, "courses", id, nombre)
			if err := os.MkdirAll(filepath.Dir(ruta), 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(ruta, []byte(texto), 0o644); err != nil {
				t.Fatal(err)
			}
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
	e := newEnv(t)
	e.s.Content, e.s.DB = cs, db
	e.db = db
	e.s.Inscripcion = []string{"g-dis1"}
	viejo := ahoraCatalogo
	ahoraCatalogo = func() time.Time { return time.Date(2026, 11, 22, 12, 0, 0, 0, lima) }
	t.Cleanup(func() { ahoraCatalogo = viejo })
	return e
}

func TestCatalogo(t *testing.T) {
	e := newEnvCatalogo(t)
	if r := e.call("GET", "/api/v1/catalogo", "", false, nil, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
	tok := e.register("ana@x.test")
	u, _ := e.db.UserByEmail(t.Context(), "ana@x.test")
	// Ana llevó el curso de diseño que ya pasó y está en el de datos en curso.
	_ = e.db.UpdateUserRoles(t.Context(), u.ID, []string{"student"}, []string{"g-pasado", "g-curso"})
	// Otro alumno en el grupo de SQL: su presencia no debe notarse en el catálogo de Ana.
	otro := e.register("beto@x.test")
	ub, _ := e.db.UserByEmail(t.Context(), "beto@x.test")
	_ = e.db.UpdateUserRoles(t.Context(), ub.ID, []string{"student"}, []string{"g-sql"})

	r := e.call("GET", "/api/v1/catalogo", tok, false, nil, "")
	if r.code != 200 {
		t.Fatalf("catálogo: %d %s", r.code, r.raw)
	}
	if strings.Contains(string(r.raw), "beto@x.test") || strings.Contains(string(r.raw), ub.ID) {
		t.Fatal("el catálogo no lleva datos de otros alumnos")
	}
	por := map[string]map[string]any{}
	var orden []string
	for _, x := range r.body["cursos"].([]any) {
		m := x.(map[string]any)
		por[m["id"].(string)] = m
		orden = append(orden, m["id"].(string))
	}
	if _, ok := por["pasado"]; ok {
		t.Fatalf("lo ya dictado no entra: %v", orden)
	}
	if strings.Join(orden, ",") != "en-curso,datos-sql,diseno-1,diseno-2" {
		t.Fatalf("orden por primera sesión: %v", orden)
	}
	if por["en-curso"]["estado"] != "en_curso" || por["en-curso"]["inscrito"] != true || por["en-curso"]["recomendado"] != nil {
		t.Fatalf("en curso, inscrita, sin recomendar: %v", por["en-curso"])
	}
	d1 := por["diseno-1"]
	if d1["estado"] != "proximo" || d1["inscripcion"] != "/inscripcion/g-dis1/" || d1["nombre"] != "Video con IA" || d1["grupo"] != "Grupo 1" {
		t.Fatalf("diseno-1: %v", d1)
	}
	ses := d1["sesiones"].([]any)
	if len(ses) != 2 || ses[1].(map[string]any)["titulo"] != "Lo primero" || ses[0].(map[string]any)["titulo"] != "Tema diseno-1-1" {
		t.Fatalf("sesiones (la publicada con su título; la otra con el del módulo, sin «Sesión 1 ·»): %v", ses)
	}
	id := d1["identidad"].(map[string]any)
	if id["color"] != "coral" || id["frase"] != "Videos que venden." {
		t.Fatalf("identidad: %v", id)
	}
	rec := d1["recomendado"].(map[string]any)
	if rec["razon"] != "Porque llevaste Diseño viejo" || rec["orden"].(float64) != 1 {
		t.Fatalf("diseño primero, por lo que llevó: %v", rec)
	}
	if por["diseno-2"]["recomendado"] != nil {
		t.Fatal("un solo grupo por curso en las recomendaciones")
	}
	if por["datos-sql"]["recomendado"] == nil || por["datos-sql"]["inscrito"] != false {
		t.Fatalf("datos-sql se recomienda (área de datos) y Ana no está: %v", por["datos-sql"])
	}

	// Beto ve el mismo catálogo, con su propio estado.
	r = e.call("GET", "/api/v1/catalogo", otro, false, nil, "")
	for _, x := range r.body["cursos"].([]any) {
		m := x.(map[string]any)
		if m["id"] == "datos-sql" && m["inscrito"] != true {
			t.Fatal("Beto está en datos-sql")
		}
		if m["id"] == "en-curso" && m["inscrito"] != false {
			t.Fatal("Beto no está en en-curso")
		}
	}

	// La lista de cursos y el detalle traen la identidad ya resuelta.
	r = e.call("GET", "/api/v1/courses/en-curso", tok, false, nil, "")
	if r.code != 200 || r.body["identidad"].(map[string]any)["color"] != "azul" || r.body["nombre"] != "Datos ya" {
		t.Fatalf("detalle: %d %v", r.code, r.body["identidad"])
	}
	// Portada e imagen: 404 si no hay (sin fugas de ruta).
	if r := e.call("GET", "/api/v1/courses/en-curso/cover", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("sin portada: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/lessons/en-curso-1/miniatura", tok, false, nil, ""); r.code != 404 {
		t.Fatalf("sin miniatura: %d", r.code)
	}
}

func TestMiniaturaSoloParaQuienVeLaSesion(t *testing.T) {
	e := newEnvCatalogo(t)
	dir := e.s.Content.Dir()
	ruta := filepath.Join(dir, "courses", "en-curso", "miniaturas", "en-curso-1.webp")
	if err := os.MkdirAll(filepath.Dir(ruta), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(ruta, []byte("RIFF0000WEBPVP8 "), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := e.s.Content.Reload(); err != nil {
		t.Fatal(err)
	}
	dentro := e.register("ana@x.test")
	u, _ := e.db.UserByEmail(t.Context(), "ana@x.test")
	_ = e.db.UpdateUserRoles(t.Context(), u.ID, []string{"student"}, []string{"g-curso"})
	fuera := e.register("beto@x.test")
	if r := e.call("GET", "/api/v1/lessons/en-curso-1/miniatura", dentro, false, nil, ""); r.code != 200 || r.hdr.Get("Content-Type") != "image/webp" {
		t.Fatalf("alumna del grupo: %d %s", r.code, r.hdr.Get("Content-Type"))
	}
	if r := e.call("GET", "/api/v1/lessons/en-curso-1/miniatura", fuera, false, nil, ""); r.code != 404 {
		t.Fatalf("fuera del grupo: %d", r.code)
	}
	r := e.call("GET", "/api/v1/courses/en-curso", dentro, false, nil, "")
	l := r.body["modules"].([]any)[0].(map[string]any)["lessons"].([]any)[0].(map[string]any)
	if l["miniatura"] != "/api/v1/lessons/en-curso-1/miniatura" {
		t.Fatalf("la sesión anuncia su miniatura: %v", l)
	}
}
