---
name: s3-pruebas-uso
description: Guion de prueba de uso del chatbot de WhatsApp con un teléfono real y una persona de otro equipo, más la lista de verificación antes de mostrarlo. Tres mensajes (pregunta del negocio, pregunta fuera del negocio, pedir una persona), tiempos de respuesta p50 y p95, severidad de hallazgos de 1 a 4 y hoja PRUEBAS_DE_USO.md. Palabras gatillo: prueba de uso, usabilidad, teléfono real, checklist, lista de verificación, hallazgos, severidad, latencia, p50, p95, demo, video de la tarea.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Prueba de uso con un teléfono real

## Cuándo usar

Al final, con `bun test pruebas/` en verde (`s3-pruebas-playwright`). Las pruebas automáticas no saben si una respuesta suena bien ni si la persona entiende que habla con un bot: eso solo se ve con alguien real. Dura 10 minutos.

## Lista de verificación (antes de llamar a nadie)

- [ ] `curl -s localhost:8766/api/salud` da `"db":true,"llm":true,"whatsapp":true`.
- [ ] La bandeja abre en el visor y el encabezado dice «Conectado».
- [ ] El número vinculado es el de PRUEBAS del equipo; nadie usa su número personal.
- [ ] La persona que prueba es de otro equipo y escribe desde SU teléfono al número de pruebas.
- [ ] Tienes un cronómetro (el del teléfono) y `PRUEBAS_DE_USO.md` abierto.

## Pasos

1. Crea `/trabajo/chatbot/PRUEBAS_DE_USO.md` con esta hoja:
   ```markdown
   # Prueba de uso · <nombre del bot> · <fecha y hora>
   Persona: <nombre o iniciales> · Equipo: <n> · Teléfono: <marca>
   | # | Tarea que se le pide | Qué escribió (literal) | Qué respondió el bot | Segundos | ¿Dudó? ¿Dónde? | Severidad |
   |---|---|---|---|---|---|---|
   | 1 | Pregunta algo que el negocio sí sabe | | | | | |
   | 2 | Pregunta algo que el negocio NO sabe | | | | | |
   | 3 | Pide hablar con una persona | | | | | |
   ## Diez tiempos seguidos (s), ordenados: p50 = el 5.º, p95 = el 10.º
   ## Una mejora (la más importante)
   ```
2. Dale a la persona SOLO la tarea, no el texto. Por ejemplo: «Averigua si hacen delivery». No le expliques la app.
3. Mide desde que envía hasta que su teléfono muestra la respuesta. Anota lo que dice en voz alta, literal.
4. Tarea 3: cuando pida una persona, tú tomas la conversación desde la bandeja y respondes. Luego pulsa «Devolver al bot».
5. Pídele diez mensajes cortos seguidos (uno cada vez que llegue la respuesta) y anota los diez tiempos.
6. Clasifica cada hallazgo:
   | Severidad | Ejemplo en un chatbot |
   |---|---|
   | 1 · cosmético | Una tilde, un emoji que sobra |
   | 2 · menor | Respuesta larga, pero correcta |
   | 3 · grave | Tarda más de 15 s; no avisa que es un bot; la bandeja no refleja el mensaje |
   | 4 · bloqueante | Inventa un precio o stock; se responde solo; habla en modo humano; escribe a alguien que no le escribió |
7. Cierra con UNA mejora y pídele al agente que la haga. Vuelve a correr `bun test pruebas/`.

## Ejemplo real

Cómo queda una hoja llenada (Panadería La Espiga, persona del equipo 4). Tarea 1: «¿hacen delivery a Surco?» → «Solo en Miraflores y San Isidro…» en 3,1 s (correcto, severidad 0). Tarea 2: «¿venden helados?» → «No tengo ese dato; ¿quieres que te pase con una persona?» (correcto). Tarea 3: pasó a «Persona» y el operador respondió en 40 s. Diez tiempos: p50 = 2,9 s, p95 = 6,4 s. Mejora: el saludo era de 3 frases; se recortó a una.

## Umbrales

- p50 menor de 8 s y p95 menor de 15 s. Si no, es severidad 3: revisa `sh chatbot.sh log` y el tamaño del historial.
- Cero hallazgos de severidad 4 para entregar.

## Errores típicos

- Explicarle a la persona qué escribir: ya no es una prueba; anota la tarea, no el texto.
- Probar desde el mismo teléfono vinculado: los mensajes llegan con `IsFromMe` y el bot los ignora (está bien que lo haga).
- Medir con la bandeja y no con el teléfono: lo que cuenta es cuando le llega al cliente.
- Sin video para la tarea: graba la pantalla del teléfono SIN cortes (1 minuto, las 3 tareas).

## Versión corta para modelos pequeños

1. Lista de verificación: salud en verde, «Conectado», número de pruebas, persona de otro equipo.
2. Tres tareas: dato del negocio, dato que no sabe, pedir una persona.
3. Anota literal, mide segundos, clasifica severidad 1 a 4.
4. Diez tiempos: p50 = 5.º, p95 = 10.º. Umbral 8 s y 15 s.
5. Guarda todo en `PRUEBAS_DE_USO.md` con UNA mejora.
