---
id: ipt-04
title: "Qué gasta tu cuota de Claude"
published: true
objectives:
  - id: ipt-04-o1
    title: "Explicar con tus palabras qué es un token y en qué se diferencian la entrada nueva, la caché y la salida"
  - id: ipt-04-o2
    title: "Leer la medición de dos chats y decir dónde ahorra el kit Research Academy y dónde no"
  - id: ipt-04-o3
    title: "Repetir el experimento con una tarea propia y sacar una conclusión con tus propios números"
recording:
  url: ""
  passcode: ""
cycle:
  - id: leer
    title: Leer la lección
    tool: lms
    phase: conceptualizacion
    description: "Lee la lección completa, la tabla de los dos chats y las tres cifras para recordar."
    check: "Puedes decir en una frase qué es la salida y por qué es lo más caro"
  - id: medir
    title: Medir tus dos chats
    tool: lms
    phase: experimentacion
    description: "Haz la misma tarea en dos chats nuevos, uno sin el panel y otro con /research-academy, y pide la medición al final de cada uno."
    check: "Tienes los dos bloques de medición copiados"
  - id: entregar
    title: Entregar la actividad
    tool: lms
    phase: reflexion
    description: "Entrega los dos bloques de medición y una línea de conclusión, y responde las preguntas de autoevaluación."
    check: "Actividad entregada y 3 de 3 preguntas bien"
---

# Qué gasta tu cuota de Claude

## Para qué sirve

Para entender por qué tu cuota de Claude se acaba y qué parte puedes cuidar tú.
Verás con números reales dónde ahorra el kit Research Academy y dónde no.

## Primero, cuatro palabras

- **Token**: un pedacito de texto. Claude cuenta en tokens todo lo que lee y escribe.
- **Entrada nueva**: lo que Claude lee por primera vez, como tu mensaje.
- **Caché**: memoria de corto plazo. *Escribir en caché* es guardar texto; *leer de caché* es reutilizarlo, a cerca del 10 % del precio.
- **Salida**: lo que Claude escribe para ti. Es lo más caro: cada token cuesta unas 5 veces uno de entrada.

¿Por qué hay una **base que se repite**? En cada respuesta Claude relee las reglas y herramientas de claude.ai y la conversación anterior. Esa base no la pone el kit.

## Qué medimos

El 7 de noviembre de 2026 hicimos la misma tarea en dos chats nuevos con Sonnet, cinco mensajes cada uno: «escribe en JavaScript una función que valide un DNI peruano de 8 dígitos». Al final pedimos «dime cuántos tokens usamos en esta sesión».

| Concepto | Sin panel | Con panel |
|---|---:|---:|
| Mensajes | 5 | 5 |
| Entrada nueva | 16 | 14 |
| Escritos en caché | 14 315 | 15 992 |
| Leídos de caché | 531 968 | 536 685 |
| Salida | 3 462 | 1 386 |

Reparto estimado del chat sin panel: instrucciones de Claude 79 %, conversación 19 %. Con panel: instrucciones de Claude 90 %, conversación 6 %, conector del panel 1,4 %.

## Tres cifras para recordar

- **−60 % de salida**: Claude escribió 1 386 tokens en vez de 3 462.
- **Base igual, unos 107 000 tokens por mensaje**, leídos de caché en los dos chats.
- **Cerca de −10 % de costo total**, al ponderar la caché leída a 10 % y la salida a 5 veces.

## Cómo se lee

- La caché leída es el número más grande, pero el más barato.
- La caché casi no cambia entre los dos chats: el kit no toca la base de claude.ai.
- El ahorro está en la salida: con el panel, Claude escribe menos para la misma tarea.
- El conector del panel ocupa solo 1,4 % del reparto. Instalarlo cuesta poco.

## Qué hacer en casa

1. Abre un chat nuevo por tema, para que la conversación vieja no engorde la base.
2. Pide con `/research-academy` al inicio de tu mensaje.
3. Apaga la búsqueda web nativa de Claude y deja encendido solo el conector **research-academy-panel**.

## Actividad evaluable

Repite el experimento con una tarea tuya (una carta, un cálculo, un resumen): dos chats nuevos, mismo modelo y mismos mensajes, uno sin panel y otro con él. Entrega los dos bloques de medición y una línea de conclusión.

| Criterio | Puntos |
|---|---:|
| Los dos chats usan la misma tarea, el mismo modelo y la misma cantidad de mensajes | 6 |
| Entregas los dos bloques de medición completos, copiados tal cual | 6 |
| Tu conclusión cita tus propios números y dice dónde hubo ahorro y dónde no | 8 |
| **Total** | **20** |

## Autoevaluación

**1. ¿Qué es lo más caro por token?**
a) La caché leída · **b) La salida (correcta)** · c) La entrada nueva

**2. ¿Por qué casi no cambió la caché leída entre los dos chats?**
**a) Porque es la base fija de claude.ai, no del kit (correcta)** · b) Porque el panel la borra · c) Porque Sonnet no usa caché

**3. En una tarea chica como la del DNI, ¿dónde estuvo el ahorro?**
a) En la entrada nueva · b) En la caché escrita · **c) En la salida (correcta)**

---

*Advertencias.* El reparto por grupos (instrucciones, conversación, conector) es una estimación de Claude, no una cifra exacta. En tareas chicas el ahorro está solo en la salida. Con archivos como PDF o Excel la diferencia debería ser mayor, porque el archivo no entra a Claude, pero esa medición todavía no está hecha.
