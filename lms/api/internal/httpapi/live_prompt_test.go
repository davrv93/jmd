package httpapi

import (
	"strings"
	"testing"
)

func TestCalificarReglas(t *testing.T) {
	bueno := "Haz un robot 3D con Three.js que lea la personalidad de mi asistente.json y responda con mis preguntas frecuentes " +
		"en una caja de chat. Que parpadee, gire la cabeza al hablar y use los colores de mi marca. Guárdalo en la carpeta robo3d. " +
		"Comprueba que se abra en el visor sin errores en la consola."
	p, reglas, listo := calificarReglas("robot", bueno)
	if !listo || p < 90 {
		t.Fatalf("prompt completo: puntaje %d listo %v %+v", p, listo, reglas)
	}
	if _, _, listo := calificarReglas("robot", "haz un robot bonito"); listo {
		t.Fatal("un prompt de 4 palabras no debe ir al agente")
	}
	if _, reglas, listo := calificarReglas("robot", bueno+" Luego corre sudo rm -rf /trabajo/viejo"); listo {
		t.Fatalf("con comandos no debe ir al agente: %+v", reglas)
	}
	sinMotor := strings.ReplaceAll(bueno, "Three.js", "algo")
	if _, _, listo := calificarReglas("robot", sinMotor); listo {
		t.Fatal("sin decir con qué se dibuja no debe ir al agente")
	}
	if p, _, listo := calificarReglas("imagen", "Ilustración 3D de una cafetería al atardecer con luz cálida, plano general, tonos café y crema, sin texto"); !listo || p < 90 {
		t.Fatalf("imagen completa: %d %v", p, listo)
	}
}

func TestArmarPedido(t *testing.T) {
	txt := armarPedido("mejora", "Ana", "que hable con voz")
	if !strings.Contains(txt, "Ana") || !strings.Contains(txt, "YA existe") || !strings.HasSuffix(strings.TrimSpace(txt), "--- FIN DEL PEDIDO ---") {
		t.Fatalf("pedido mal armado:\n%s", txt)
	}
	if strings.Contains(txt, "{{") {
		t.Fatal("quedó una marca sin reemplazar")
	}
}

// El asistente.json del navegador queda dentro de lo que acepta construir.py (s2-robo-estilos).
func TestLimpiarAsistente(t *testing.T) {
	a := map[string]any{
		"nombre":  "Micky el ratón más simpático del barrio entero",
		"negocio": map[string]any{"nombre": "Urbantech", "whatsapp": "+51 986 149 476"},
		"preguntas_frecuentes": []any{
			map[string]any{"preguntas": []any{"horario", ""}, "respuesta": "De 9 a 6", "animo": "serio"},
			map[string]any{"pregunta": "dirección", "respuesta": "Av. Larco 123", "animo": "feliz"},
			map[string]any{"preguntas": []any{"sin respuesta"}},
			"no es objeto",
		},
		"marca":  map[string]any{"primario": "#282259", "acento": "violeta"},
		"reglas": []any{"No prometas descuentos.", 3},
	}
	limpiarAsistente(a)
	if n := []rune(a["nombre"].(string)); len(n) > 24 {
		t.Fatalf("nombre largo: %q", a["nombre"])
	}
	neg := a["negocio"].(map[string]any)
	if neg["whatsapp"] != "51986149476" || neg["rubro"] != "negocio" {
		t.Fatalf("negocio: %v", neg)
	}
	faq := a["preguntas_frecuentes"].([]any)
	if len(faq) != 2 || faq[0].(map[string]any)["animo"] != "neutral" || len(faq[0].(map[string]any)["preguntas"].([]any)) != 1 {
		t.Fatalf("faq: %v", faq)
	}
	if m := a["marca"].(map[string]any); m["primario"] != "#282259" || m["acento"] != nil {
		t.Fatalf("marca: %v", m)
	}
	if len(a["reglas"].([]any)) != 1 || a["saludo"] == "" || a["personalidad"] == "" {
		t.Fatalf("reglas/saludo/personalidad: %v", a)
	}
	vacio := map[string]any{"nombre": "X"}
	limpiarAsistente(vacio)
	if len(vacio["preguntas_frecuentes"].([]any)) != 1 {
		t.Fatalf("sin preguntas: %v", vacio)
	}
}
