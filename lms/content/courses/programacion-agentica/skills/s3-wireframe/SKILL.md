---
name: s3-wireframe
description: Dibuja el wireframe en gris de la bandeja del chatbot de WhatsApp antes de programar. Escribe FLUJOS.md (tarea en una frase, flujo feliz de 5 pasos como máximo y flujos de error: número desconectado, el modelo no responde, el envío falla) y wireframe/index.html con tres pantallas (bandeja, conversación con interruptor bot/persona, estado del número) solo con cajas y etiquetas grises. Palabras gatillo: wireframe, boceto, maqueta en gris, flujo feliz, flujo de error, FLUJOS.md, pantallas de la bandeja, diseñar antes de programar.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Wireframe en gris de la bandeja

## Cuándo usar

Al empezar el chatbot, antes de `s3-prototipo` y antes de escribir una línea de backend. Mover una caja cuesta segundos; mover código, una hora. Va en gris a propósito: con color, la conversación se va al color. Lee `s3-chatbot-aula` para las rutas.

## Pasos

1. Escribe `/trabajo/chatbot/FLUJOS.md` con este molde, adaptado al negocio de `negocio.json` o del plan:
   ```markdown
   # Flujos de la bandeja de <nombre del bot>
   Tarea: el operador ve las conversaciones de WhatsApp y toma una cuando el cliente pide una persona.
   ## Flujo feliz (máximo 5 pasos)
   1. El cliente escribe «¿Cuál es el horario?» al número del negocio.
   2. La conversación aparece arriba en la bandeja con la etiqueta «Bot».
   3. El bot responde en menos de 10 s; el primer mensaje dice que es un bot.
   4. El cliente escribe «quiero hablar con una persona»; la etiqueta cambia a «Persona».
   5. El operador abre la conversación, responde y luego pulsa «Devolver al bot».
   ## Error 1 · El número se desconectó
   Qué ve: punto rojo y «Número sin vincular». Qué hace: pulsa «Mostrar QR» y escanea.
   ## Error 2 · El modelo no responde en 15 s
   Qué recibe el cliente: «Perdona, ahora no puedo responder. Una persona te escribirá pronto.» Nunca silencio.
   ## Error 3 · No se pudo enviar
   Qué ve el operador: el mensaje con borde rojo y «no se envió». Qué hace: revisa el número y reenvía.
   ```
2. Crea `/trabajo/chatbot/wireframe/index.html`: tres `<section data-pantalla>` una al lado de otra (una debajo de otra en el teléfono), SOLO grises, sin datos reales ni imágenes:
   ```html
   <!doctype html>
   <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Wireframe · bandeja</title>
   <style>
     body { margin: 1rem; font: 14px/1.4 system-ui, sans-serif; color: #333; background: #fff; }
     main { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
     section { border: 2px solid #888; border-radius: 8px; padding: .5rem; display: grid; gap: .5rem; align-content: start; }
     h2 { font-size: .9rem; margin: 0; text-transform: uppercase; color: #555; }
     .caja { background: #e5e5e5; border: 1px dashed #999; border-radius: 6px; padding: .5rem; min-height: 1.5rem; }
     .alta { min-height: 10rem; } .der { margin-left: 30%; } .izq { margin-right: 30%; }
     .error { border: 2px solid #555; background: #f2f2f2; }
   </style></head><body>
   <h1>Wireframe de la bandeja</h1>
   <main>
     <section data-pantalla="bandeja"><h2>1 · Bandeja</h2>
       <div class="caja">Cabecera: nombre del bot · estado del número</div>
       <div class="caja">Nombre · último mensaje · hora · [Bot | Persona] · sin leer</div>
       <div class="caja">Nombre · último mensaje · hora · [Bot | Persona]</div>
       <div class="caja error">Vacío: «Aún no hay mensajes. Escribe hola al número.»</div></section>
     <section data-pantalla="conversacion"><h2>2 · Conversación</h2>
       <div class="caja">← Volver · nombre · [Interruptor: Bot / Persona]</div>
       <div class="caja izq">Mensaje del cliente</div><div class="caja der">Respuesta del bot</div>
       <div class="caja der error">Mensaje con error: «no se envió»</div>
       <div class="caja">[Campo de texto] [Enviar]</div></section>
     <section data-pantalla="numero"><h2>3 · Estado del número</h2>
       <div class="caja">● Conectado · nombre de la cuenta</div>
       <div class="caja alta">QR (si no está vinculado) + «Dispositivos vinculados › Vincular»</div>
       <div class="caja error">● Caído, reintentando cada 5 s · [Pedir otro QR]</div></section>
   </main></body></html>
   ```
3. Ábrelo en el visor: `chatbot/wireframe/index.html`. Pulsa «Móvil» y comprueba que las tres pantallas se apilan.
4. Revisa con el alumno: ¿cada error dice qué pasó y qué hacer, con la acción al lado? Si el flujo feliz pasa de 5 pasos, recórtalo.

## Ejemplo real

Para una panadería, la fila de la bandeja dice «Ana · ¿Hacen delivery? · 10:42 · Bot · 1 sin leer». El estado del número muestra los tres casos que devuelve Evolution Go: `LoggedIn: true` (conectado), sin sesión (QR) y Evolution sin responder (caído).

## Errores típicos

- Colores, logos o fotos: «Solo gris, solo cajas, sin datos». El color llega en `s3-prototipo`.
- Más de tres pantallas: lo demás (reportes, usuarios) no entra hoy.
- Falta el estado vacío: la bandeja vacía es lo primero que verá el alumno.
- El error del modelo dice «Error 500»: el cliente nunca ve códigos; escribe la frase que recibe.
- Comprobación rápida: `grep -c 'data-pantalla' /trabajo/chatbot/wireframe/index.html` debe dar `3`.

## Versión corta para modelos pequeños

1. Escribe `FLUJOS.md`: tarea, flujo feliz (≤5 pasos), 3 errores con «qué ve» y «qué hace».
2. Escribe `wireframe/index.html` con 3 `<section data-pantalla>`: bandeja, conversacion, numero.
3. Solo grises (#333 a #f2f2f2), cajas con etiqueta, sin datos reales.
4. Ábrelo en el visor y prueba «Móvil».
