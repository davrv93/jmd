package content

import "testing"

// Las copias de un curso por grupo traen las mismas skills: la lista general no las repite.
func TestSkillsCursoSinDuplicadosEntreCopias(t *testing.T) {
	c := &Catalog{skillsCurso: map[string][]*SkillCurso{
		"a": {{Nombre: "piedra"}, {Nombre: "s2-robo-chat"}},
		"b": {{Nombre: "piedra"}, {Nombre: "s2-robo-chat"}, {Nombre: "solo-b"}},
	}}
	c.courses = append(c.courses, &Course{ID: "a"}, &Course{ID: "b"})
	if n := len(c.SkillsCurso("")); n != 3 {
		t.Fatalf("lista general: %d skills, quería 3", n)
	}
	if n := len(c.SkillsCurso("b")); n != 3 {
		t.Fatalf("curso b: %d skills, quería 3", n)
	}
}
