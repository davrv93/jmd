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
