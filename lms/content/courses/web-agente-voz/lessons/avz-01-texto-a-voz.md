---
id: avz-01
title: "Paso 1 · Texto a voz con Gemini Flash TTS"
published: true
objectives:
  - {id: avz-01-o1, title: "Convertir un texto en voz eligiendo voz y estilo"}
  - {id: avz-01-o2, title: "Leer en la respuesta cuántos tokens usó el audio"}
materials:
  - {id: avz-01-video, title: "Video · Paso 1 · Texto a voz con Gemini Flash TTS", kind: video, file: materials/grabaciones/01-texto-a-voz.mp4, objective_ids: [avz-01-o1]}
  - {id: avz-01-repo, title: "Repositorio en GitHub · agente-voz-gemini (Windows y Mac con Docker)", kind: repo, url: https://github.com/davrv93/agente-voz-gemini}
  - {id: avz-01-prompt, title: "Prompt para construirlo con tu asistente de IA", kind: link, url: https://github.com/davrv93/agente-voz-gemini/blob/main/prompts/1-hola-mundo.md}
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
    description: "Genera tres audios con la misma frase y tres voces distintas. ¿Cuál suena más a tu negocio?"
    check: "Tienes tres audios en la carpeta salida/ y elegiste una voz"
  - id: pensar
    title: ¿Qué cambiarías?
    tool: lms
    phase: reflexion
    description: "Anota qué cambiarías para tu negocio: voz, estilo, datos o reglas."
    check: Tienes al menos un cambio anotado para tu caso
---

## La idea clave

El texto dice **qué**; el estilo dice **cómo**. El estilo va aparte (`speechMetadata.style`), así que el modelo lo actúa y no lo lee en voz alta. Elige la voz por su carácter: Sulafat es cálida, Kore es firme y Puck es animada (son 30 voces prediseñadas).

## Hazlo (igual en Windows y en Mac)

Con el agente levantado (`docker compose up -d`), en la carpeta del repositorio:

```bash
docker compose run --rm agente python pasos/1_hola.py "Bienvenido a mi tienda" Puck "animado"
```

También puedes hacerlo en la página **http://127.0.0.1:8090**, en la pestaña del paso.

## Constrúyelo desde cero con tu asistente de IA

Pega este prompt en Claude, DeepSeek u otro asistente, en una carpeta vacía:

```prompt
Crea un script en Python 3.12, solo con la biblioteca estándar (urllib, json, base64), que convierta
un texto en voz con la API de Gemini.
- Modelo: gemini-3.8-flash-tts, endpoint POST
  https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent
- Llave en la cabecera x-goog-api-key, leída de la variable de entorno GEMINI_API_KEY.
  Nunca la escribas en el código ni la imprimas.
- generationConfig: responseModalities ["AUDIO"] y speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName = "Sulafat".
- El estilo («cálido y tranquilo») va en la parte del texto como speechMetadata.style, para que no se lea en voz alta.
- La respuesta trae el audio en candidates[0].content.parts[0].inlineData.data (base64, WAV de 24 kHz).
  Guárdalo como salida/hola.wav.
- Si la API responde 429 (cuota), reintenta con gemini-3.8-flash-lite-tts.
Explícame cada parte en 1 línea.
```

## Practica

Genera tres audios con la misma frase y tres voces distintas. ¿Cuál suena más a tu negocio?
