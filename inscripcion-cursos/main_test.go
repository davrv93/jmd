package main

import "testing"

func TestValidar(t *testing.T) {
	bien := Pedido{Nombre: " Ana  Quispe ", Telefono: "+51 987 654 321", Correo: "ANA@correo.pe", Cursos: []string{"seguridad", "seguridad", "nada"}}
	if m := validar(&bien); m != "" {
		t.Fatal(m)
	}
	if bien.Nombre != "Ana Quispe" || bien.Telefono != "987654321" || bien.Correo != "ana@correo.pe" || len(bien.Cursos) != 1 {
		t.Fatalf("%+v", bien)
	}
	sinCurso := Pedido{Nombre: "Ana Quispe", Telefono: "987654321", Correo: "ana@correo.pe"}
	if validar(&sinCurso) == "" {
		t.Fatal("aceptó sin cursos")
	}
}

func TestSinPrecios(t *testing.T) {
	for _, c := range cursos {
		for _, v := range []string{c.Nombre, c.Horario, c.Fechas} {
			if contiene(v, "S/") {
				t.Fatalf("precio en %s", c.ID)
			}
		}
	}
}

func contiene(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
