package content

import (
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"
)

func cursoIdent(id, yamlExtra string) map[string]string {
	return map[string]string{
		"courses/" + id + "/course.yaml": "id: " + id + "\ntitle: \"Curso " + id + " · Grupo 1\"\ndescription: Aprende a hacer algo útil con IA. Tres sesiones por Zoom.\nproyecto_final: Un proyecto publicado.\n" + yamlExtra +
			"modules:\n  - id: m1\n    title: M1\n    lessons: [" + id + "-1]\n",
		"courses/" + id + "/lessons/l1.md": strings.Replace(leccionBase, "id: l1", "id: "+id+"-1", 1),
	}
}

func TestIdentidadDefectosYHerencia(t *testing.T) {
	dir := t.TempDir()
	archivos := map[string]string{}
	add := func(m map[string]string) {
		for k, v := range m {
			archivos[k] = v
		}
	}
	// a: identidad completa; b: otro grupo del mismo curso, sin identidad (hereda de a); c: solo área;
	// d: valores que no existen (se descartan) y portada que no está.
	add(cursoIdent("a", "agenda: {nombre: Diseño con IA, grupo: Grupo 1, area: diseno}\nidentidad:\n  color: coral\n  icono: film\n  frase: Explica con video.\n  resultado: [Un video publicado, \"  \"]\n  nivel: Desde cero\n"))
	add(cursoIdent("b", "agenda: {nombre: Diseño con IA, grupo: Grupo 2, area: diseno}\n"))
	add(cursoIdent("c", "agenda: {nombre: Datos, grupo: Grupo 1, area: datos}\n"))
	add(cursoIdent("d", "agenda: {nombre: Otro, area: qa}\nidentidad:\n  color: arcoiris\n  icono: unicornio\n  nivel: Para expertos\n  portada: identidad/no-existe.webp\n"))
	add(map[string]string{"courses/a/identidad/portada.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>"})
	archivos["courses/a/course.yaml"] = strings.Replace(archivos["courses/a/course.yaml"], "  nivel: Desde cero\n", "  nivel: Desde cero\n  portada: identidad/portada.svg\n", 1)
	escribir(t, dir, archivos)
	cat, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	a, b, c, d := cat.Course("a").Ident, cat.Course("b").Ident, cat.Course("c").Ident, cat.Course("d").Ident
	if a.Color != "coral" || a.Icono != "film" || a.Frase != "Explica con video." || !slices.Equal(a.Resultado, []string{"Un video publicado"}) || a.Nivel != "Desde cero" {
		t.Fatalf("a: %+v", a)
	}
	if a.PortadaPath != filepath.Join(dir, "courses", "a", "identidad", "portada.svg") {
		t.Fatalf("portada de a: %q", a.PortadaPath)
	}
	if b.Color != "coral" || b.Icono != "film" || b.Frase != a.Frase || b.PortadaPath != a.PortadaPath {
		t.Fatalf("b hereda de a (mismo agenda.nombre): %+v", b)
	}
	if c.Color != "azul" || c.Icono != "chart" || c.Frase != "Aprende a hacer algo útil con IA." || !slices.Equal(c.Resultado, []string{"Un proyecto publicado."}) {
		t.Fatalf("c toma lo del área y la descripción: %+v", c)
	}
	if d.Color != "oliva" || d.Icono != "bug" || d.Nivel != "" || d.PortadaPath != "" {
		t.Fatalf("d descarta lo desconocido y usa el área qa: %+v", d)
	}
}

func TestIdentidadMiniatura(t *testing.T) {
	dir := t.TempDir()
	archivos := cursoIdent("a", "")
	archivos["courses/a/miniaturas/a-1.webp"] = "RIFF....WEBP"
	escribir(t, dir, archivos)
	cat, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if l := cat.Lesson("a-1"); l == nil || !strings.HasSuffix(l.MiniaturaPath, filepath.Join("miniaturas", "a-1.webp")) {
		t.Fatalf("miniatura: %+v", l)
	}
}

func TestNombreYFrase(t *testing.T) {
	c := &Course{Title: "🎮 Ready Set Go! Haz tu videojuego · Grupo 2"}
	if got := c.Nombre(); got != "Ready Set Go! Haz tu videojuego" {
		t.Fatalf("nombre: %q", got)
	}
	c.Agenda = &CourseAgenda{Nombre: "⚡ Potencia tus agentes"}
	if got := c.Nombre(); got != "Potencia tus agentes" {
		t.Fatalf("nombre de la agenda: %q", got)
	}
	largo := strings.Repeat("palabra ", 40)
	if f := primeraFrase(largo); len([]rune(f)) > 151 || !strings.HasSuffix(f, "…") {
		t.Fatalf("frase recortada: %q", f)
	}
}

// En el contenido real, toda identidad escrita usa colores, iconos y niveles válidos, y la portada que
// nombra existe: si no, el portal mostraría la del área sin avisar a nadie.
func TestIdentidadRealValida(t *testing.T) {
	_, file, _, _ := runtime.Caller(0)
	dir := filepath.Join(filepath.Dir(file), "..", "..", "..", "content")
	cat, err := Load(dir)
	if err != nil {
		t.Fatalf("cargar: %v", err)
	}
	for _, c := range cat.Courses() {
		if c.Identidad == nil {
			continue
		}
		raw := *c.Identidad
		if !slices.Contains(ColoresIdentidad, c.Ident.Color) || !slices.Contains(IconosIdentidad, c.Ident.Icono) {
			t.Errorf("%s: color %q / icono %q", c.ID, c.Ident.Color, c.Ident.Icono)
		}
		if raw.Color == "" && raw.Icono == "" && raw.Frase == "" {
			t.Errorf("%s: bloque identidad vacío", c.ID)
		}
		if raw.Portada != "" && raw.PortadaPath == "" {
			t.Errorf("%s: la portada %q no se encontró", c.ID, raw.Portada)
		}
		if c.Ident.Frase == "" {
			t.Errorf("%s: sin frase", c.ID)
		}
		for _, x := range append([]string{c.Ident.Frase}, c.Ident.Resultado...) {
			if strings.Contains(strings.ToLower(x), "principiante") {
				t.Errorf("%s: no se usa «principiantes»: %q", c.ID, x)
			}
		}
	}
}
