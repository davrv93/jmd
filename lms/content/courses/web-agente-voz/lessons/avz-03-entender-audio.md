---
id: avz-03
title: "Paso 3 · Entender un audio con Flash-Lite"
published: true
objectives:
  - {id: avz-03-o1, title: "Transcribir un audio y obtener intención, emoción y productos en JSON"}
  - {id: avz-03-o2, title: "Usar un esquema de respuesta para que la forma no cambie"}
materials:
  - {id: avz-03-video, title: "Video · Paso 3 · Entender un audio con Flash-Lite", kind: video, file: materials/grabaciones/03-entender-audio.mp4, objective_ids: [avz-03-o1]}
  - {id: avz-03-repo, title: "Repositorio en GitHub · agente-voz-gemini (Windows y Mac con Docker)", kind: repo, url: https://github.com/davrv93/agente-voz-gemini}
  - {id: avz-03-prompt, title: "Prompt para construirlo con tu asistente de IA", kind: link, url: https://github.com/davrv93/agente-voz-gemini/blob/main/prompts/3-entender-audio.md}
cycle:
  - id: ver
    title: Ver y escuchar
    tool: lms
    phase: experiencia
    description: "Mira el video del paso y escucha el audio real que generó la app."
    check: Viste el video y escuchaste el resultado
  - id: idea
    title: La idea clave
    tool: lms
    phase: conceptualizacion
    description: "Lee la idea clave de abajo y relaciónala con lo que escuchaste."
    check: Puedes explicarla con tus palabras
  - id: hacer
    title: Hazlo en tu máquina
    tool: terminal
    phase: experimentacion
    description: "Graba tu voz (o sube una nota de voz de WhatsApp) con una pregunta de tu negocio y revisa el JSON."
    check: "El JSON trae tu transcripción, una intención y una emoción que tienen sentido"
  - id: pensar
    title: ¿Qué cambiarías?
    tool: lms
    phase: reflexion
    description: "Anota qué cambiarías para tu negocio: voz, estilo, datos o reglas."
    check: Tienes al menos un cambio anotado para tu caso
---

## La idea clave

Un **esquema de respuesta** (`responseSchema`) obliga al modelo a devolver siempre los mismos campos: tu sistema puede leerlos sin adivinar. Un minuto de audio son unos 1920 tokens (32 por segundo).

## Hazlo (igual en Windows y en Mac)

Con el agente levantado (`docker compose up -d`), en la carpeta del repositorio:

```bash
docker compose run --rm agente python pasos/3_entender.py
```

También puedes hacerlo en la página **http://127.0.0.1:8090**, en la pestaña del paso.

## Constrúyelo desde cero con tu asistente de IA

Pega este prompt en Claude, DeepSeek u otro asistente, en una carpeta vacía:

```prompt
Crea la función entender(wav_bytes) que mande un audio WAV a gemini-3.5-flash-lite (generateContent)
y devuelva un JSON.
- El audio va como parte inlineData {mimeType: "audio/wav", data: base64}, junto a la instrucción
  «Transcribe el audio tal cual y clasifícalo».
- generationConfig: responseMimeType "application/json", temperature 0 y un responseSchema con:
  transcripcion (string), idioma (string), intencion (enum: consulta_producto, precio, horario,
  delivery, reclamo, saludo, otro), emocion (enum: tranquilo, contento, apurado, molesto, preocupado),
  productos (array de string) y urgente (boolean). Todos obligatorios.
- Si Google responde 500/502/503/504, reintenta 2 veces esperando 2 y 4 segundos; si sigue,
  usa gemini-3.1-flash-lite.
- Muestra también usageMetadata (tokens de entrada y salida).
```

## Practica

Graba tu voz (o sube una nota de voz de WhatsApp) con una pregunta de tu negocio y revisa el JSON.
