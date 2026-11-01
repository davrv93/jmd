package main

import "testing"

func TestLisuras(t *testing.T) {
	malos := []string{"Puta Madre", "Juan Conchatumare", "conchatumadre", "P.u.t.a", "Puuuta Gomez", "Hijo de Puta", "Huevón Pérez",
		"Webon Total", "c0jud0 tal", "MIERDA", "Ana Ctm", "malparido x", "Pendeja Ruiz", "PUTA123", "ANAL2345", "Cabrón Ríos", "concha de tu madre"}
	buenos := []string{"Andres Riquez", "Junior Cercado Vasquez", "Lisset Mirella Huamán Camizán", "JOSÉ NILO BITÓN BRAVO",
		"Yuselenin Anquise Jihuaña", "María Concha Tuesta", "Pedro Gil", "Ana Vergara", "Luis Cabrera", "Rosa Pajares",
		"Nicolle Esquivel", "Samuel challco", "Computadora Mesa", "Analí Canales", "Ana Lucía", "Carlos Culqui", "Teresa Pera", "JUNIOR2026", "ARN123", "SHESHIN"}
	for _, m := range malos {
		if !esOfensivo(m) {
			t.Errorf("debía rechazar %q", m)
		}
	}
	for _, b := range buenos {
		if esOfensivo(b) {
			t.Errorf("rechazó por error %q", b)
		}
	}
}
