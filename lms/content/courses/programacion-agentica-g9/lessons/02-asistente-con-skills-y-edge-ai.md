---
id: g9-02
starts_at: 2026-12-06T18:30:00-05:00
title: "Grupo 9 · Clase 2 · Chatbot básico web"
published: true
objectives:
  - id: g9-02-o1
    title: "Escribir el conocimiento tipo FAQ de tu negocio como faq.json (preguntas con 3–4 variantes, respuestas cortas)"
  - id: g9-02-o2
    title: "Construir con el agente un chatbot web básico: widget (HTML/CSS/JS) embebido en tu landing + backend mínimo (Node o Bun) que responde desde faq.json y usa el modelo del gateway solo cuando no hay match"
  - id: g9-02-o3
    title: "Probar el chatbot con 3 personas reales y medir tiempos de respuesta"
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: g9-02-m1
    title: Descargar Ollama
    kind: link
    url: https://ollama.com/download
    objective_ids: [g9-02-o2]
  - id: g9-02-m2
    title: Modelo qwen3 en Ollama
    kind: link
    url: https://ollama.com/library/qwen3
    objective_ids: [g9-02-o2]
  - id: g9-02-ejemplo
    title: "Ejemplo en vivo: chatbot de JMD Learning"
    kind: link
    url: https://jmd-learn.online/chatbot/
    objective_ids: [g9-02-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten a mano tu landing de la clase 1 (o un index.html simple) y una terminal lista.
    check: Has visto la clase completa (o la grabación)
  - id: faq
    title: "Escribir tu FAQ en faq.json"
    tool: editor
    phase: conceptualizacion
    description: "Escribe el conocimiento de tu negocio como un archivo faq.json con preguntas (3–4 variantes) y respuestas cortas, listas para que el bot responda sin inventar."
    check: "faq.json es JSON válido y tiene al menos 10 entradas con variantes reales"
  - id: widget
    title: "Agregar el widget de chat a tu landing"
    tool: web
    phase: experimentacion
    description: "Inserta un widget de chat (HTML/CSS/JS, sin frameworks) en tu landing de la clase 1: abre/cierra, envía mensajes y muestra respuestas."
    check: "En celular se puede chatear y el botón no tapa el contenido"
  - id: backend
    title: "Backend mínimo con fallback al gateway"
    tool: terminal
    phase: experiencia
    description: "Levanta un backend pequeño (Node o Bun) que responde primero desde faq.json y, solo si no hay match, consulta al modelo del gateway con la FAQ como contexto (apiKey en GATEWAY_API_KEY, nunca en el frontend)."
    check: "Una pregunta del FAQ responde con fuente=faq; una fuera responde «no sé» y ofrece WhatsApp"
  - id: probar
    title: "Probar con 3 personas y medir"
    tool: lms
    phase: reflexion
    description: "Haz 3 pruebas reales: mide tiempos, detecta confusiones y ajusta faq.json sin cambiar el comportamiento seguro (no inventar)."
    check: "Tienes 3 tiempos y 3 hallazgos (o 3 confirmaciones) anotados"
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica al menos una pregunta sobre la clase en este LMS o responde una de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la tarea 2
    tool: git
    phase: experimentacion
    description: Sube el repositorio clase-02 con faq.json, el widget, el backend y capturas de pruebas, y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy conviertes tu landing de la clase 1 en un producto que **responde solo**: un **chatbot web básico**.
Primero escribes el conocimiento real de tu negocio como `faq.json`. Luego lo conectas a un widget
de chat embebido en tu landing y a un backend mínimo.

Importante: el bot **responde desde tu FAQ**. Solo cuando no hay match consulta al modelo del gateway.
Y aun así se rige por una regla: **si no está en la FAQ, dice que no sabe y ofrece WhatsApp**.

Clase en vivo: *iba a ser sábado*; pasa a **domingo 06-12-2026**, de **6:30 a 8:30 p. m.** (hora de Lima).

| Bloque | Fase | Qué haces | Comprobación |
|---|---|---|---|
| 1 · FAQ | Conceptualización | Escribes `faq.json` con variantes reales | JSON válido y ≥ 10 entradas |
| 2 · Widget | Experimentación | Insertas el chat en tu landing | En celular abre/cierra y conversa |
| 3 · Backend | Experiencia | Sirves `/api/chat` y lees `faq.json` | `curl` responde 200 |
| 4 · Fallback | Experimentación | Llamas al gateway solo si no hay match | Fuera del FAQ: «no sé» + WhatsApp |
| 5 · Pruebas | Reflexión | Pruebas con 3 personas y mides | 3 tiempos anotados |

## 1. Qué problema resuelve tu chatbot · Conceptualización

Un chatbot útil no es el que “habla bonito”, sino el que **reduce fricción**: responde lo repetitivo
(horarios, pagos, delivery, requisitos) y **pasa a humano** cuando no sabe.

Regla del curso: tu bot no “adivina” ni “rellena”. Si no está en tu `faq.json`, responde:
«No lo sé todavía. Si quieres, escríbenos por WhatsApp y te ayudamos.»

**Si falla:** si el bot inventa, el problema no es el modelo: es que no le pusiste la regla o no
le diste el contexto correcto.

## 2. Escribe tu faq.json · Conceptualización

Tu FAQ es un archivo de conocimiento **corto y verificable**. Cada entrada:

- `questions`: 3–4 variantes reales (con palabras distintas; con y sin tilde).
- `answer`: 1–2 frases, sin marketing innecesario.

Pídele al agente que lo escriba y luego revísalo como si fueras cliente.

```prompt
# faq.json de mi negocio
Escribe un archivo faq.json para mi negocio.

Formato exacto:
- Un arreglo JSON.
- Cada elemento tiene: {"questions": [..], "answer": "..."}.

Reglas:
- 10 a 15 entradas.
- Cada "questions" tiene 3 o 4 variantes (palabras distintas, con y sin tilde, sin repetir la misma frase).
- Cada "answer" tiene 1 o 2 frases, concretas, sin inventar.
- Español neutro.

Mi negocio:
- Nombre: [NOMBRE]
- Qué vendo/hago: [OFERTA]
- Ciudad: [CIUDAD]
- WhatsApp para escalar: https://wa.me/[NUMERO_CON_51]?text=[MENSAJE]

Temas mínimos: horario, dirección o zona, precios o cómo cotizar, medios de pago, tiempos de entrega/atención, cambios/devoluciones, contacto, reservas/citas (si aplica).

Antes de escribir el JSON final, propón la lista de 10–15 temas (títulos) y espera mi “ok”.
```

**Si falla:** si te salen respuestas largas, recuérdale: «máximo 2 frases». Si te faltan variantes,
pídele: «cada pregunta con 4 formas, sin sinónimos obvios repetidos».

## 3. Inserta el widget de chat en tu landing · Experimentación

El widget vive en el frontend (tu landing), pero **no tiene llaves** ni decide nada serio: solo
manda el texto y muestra la respuesta.

Requisitos mínimos del widget:

- Botón flotante “Chat”.
- Ventana con historial, input y enviar.
- Se ve bien en celular (no tapa el botón de WhatsApp de tu landing).

**Si falla:** si no te muestra nada, abre la consola del navegador y mira si hay error de CORS o
si la URL del backend está mal.

## 4. Backend mínimo: FAQ primero, gateway solo si no hay match · Experiencia

El backend (Node o Bun) cumple tres trabajos:

1. Lee `faq.json`.
2. Intenta hacer match (normaliza: minúsculas, sin tildes, sin signos).
3. Si no hay match, consulta al modelo del gateway usando **GATEWAY_API_KEY** en el servidor.

```prompt
# Widget + backend del chatbot (con criterios de aceptación)
Construye un chatbot web básico para mi landing de la clase 1.

Frontend (sin frameworks):
- Un widget embebible (HTML/CSS/JS) que se puede pegar en mi landing.
- Enviar mensaje por fetch a POST /api/chat y mostrar la respuesta.

Backend (elige UNO: Node o Bun):
- Un servidor HTTP con POST /api/chat.
- Lee faq.json (en la raíz del proyecto).
- Responde primero desde faq.json.
- Solo si no hay match, llama al modelo del gateway OpenAI-compatible:
  - Base URL: [LA_DEL_GATEWAY]
  - API key: variable de entorno GATEWAY_API_KEY (nunca en el frontend).
  - Pasa la FAQ como contexto (por ejemplo en un mensaje de sistema o como bloque de contexto) y exige la regla de “no inventar”.

Reglas del bot (OBLIGATORIO):
- Si la respuesta no está en la FAQ, debe decir exactamente que no lo sabe y ofrecer WhatsApp.
- Nunca inventa precios, stock, horarios ni direcciones.

Salida esperada:
- Un comando para correrlo en local.
- Un ejemplo de curl para probar /api/chat.

Criterios de aceptación (sí/no):
1) Con una pregunta del FAQ, responde con el texto del FAQ.
2) Con una pregunta fuera del FAQ, responde “No lo sé” (o equivalente claro) y ofrece WhatsApp.
3) El frontend no contiene ninguna clave ni baseURL privada.
4) Responde en menos de 8 s en una laptop promedio (si el FAQ hace match, menos de 200 ms).
```

**Si falla:**

- `401` o `403`: tu variable `GATEWAY_API_KEY` no está en esa terminal.
- CORS: permite solo el origen de tu landing en local (`http://localhost:...`).
- El modelo “se sale” de la regla: refuerza el prompt del backend: “responde SOLO con FAQ; si no, no sabes”.

## 5. Prueba con 3 personas y mide · Reflexión

Tu trabajo aquí no es “ver si funciona”, sino **medir** y **detectar confusiones**.

1. Pide a 3 personas que hagan 3 preguntas (una del FAQ, una fuera y una con faltas de ortografía).
2. Mide el tiempo desde “Enviar” hasta respuesta. Anota 3 tiempos.
3. Anota 3 hallazgos (o 3 confirmaciones), por ejemplo: “no entendió ‘horariooo’ → agregar variante”.

**Si falla:** si tarda mucho en fallback, tu bot debe responder igual de seguro: “no sé + WhatsApp”.
El tiempo lento es un hallazgo, no una excusa para inventar.

## Palabras de hoy · Conceptos

**FAQ**: lista de preguntas frecuentes, escrita para responder sin improvisar. **Widget**: componente pequeño embebido en tu página.
**Backend**: servidor que guarda llaves y toma decisiones. **Gateway**: un endpoint OpenAI-compatible que expone un modelo con tu clave.
**Fallback**: plan B cuando no hay match en la FAQ.

## Tareas · Aplicación

**Tarea 2 · Tu chatbot web responde con tu FAQ**: entrega `faq.json`, tu widget y tu backend, más 3 pruebas con capturas y tiempos. Detalle y rúbrica en la pestaña Tareas.
