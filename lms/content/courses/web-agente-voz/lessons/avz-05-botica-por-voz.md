---
id: avz-05
title: "Paso 5 · Una botica que atiende por voz"
published: true
objectives:
  - {id: avz-05-o1, title: "Sostener una conversación de varias vueltas con historial"}
  - {id: avz-05-o2, title: "Poner reglas de negocio: qué responder y cuándo derivar a una persona"}
materials:
  - {id: avz-05-video, title: "Video · Paso 5 · Una botica que atiende por voz", kind: video, file: materials/grabaciones/05-botica-por-voz.mp4, objective_ids: [avz-05-o1]}
  - {id: avz-05-repo, title: "Repositorio en GitHub · agente-voz-gemini (Windows y Mac con Docker)", kind: repo, url: https://github.com/davrv93/agente-voz-gemini}
  - {id: avz-05-prompt, title: "Prompt para construirlo con tu asistente de IA", kind: link, url: https://github.com/davrv93/agente-voz-gemini/blob/main/prompts/5-botica-por-voz.md}
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
    description: "Cambia app/botica.json por los datos de tu negocio, reinicia con docker compose restart y prueba tres preguntas reales."
    check: "Tu agente responde con tus datos y deriva lo que no sabe"
  - id: pensar
    title: ¿Qué cambiarías?
    tool: lms
    phase: reflexion
    description: "Anota qué cambiarías para tu negocio: voz, estilo, datos o reglas."
    check: Tienes al menos un cambio anotado para tu caso
---

## La idea clave

Si no está en tus datos, **no lo inventa**: la regla vive en el prompt de pensar («usa solo los datos del negocio; si no sabe, deriva»). Las reglas que nunca se rompen (no recomendar dosis, ante una emergencia pedir que llamen al 106) están en `app/botica.json`.

## Hazlo (igual en Windows y en Mac)

Con el agente levantado (`docker compose up -d`), en la carpeta del repositorio:

```bash
docker compose run --rm agente python pasos/5_botica.py
```

También puedes hacerlo en la página **http://127.0.0.1:8090**, en la pestaña del paso.

## Constrúyelo desde cero con tu asistente de IA

Pega este prompt en Claude, DeepSeek u otro asistente, en una carpeta vacía:

```text
Crea un servidor en Python (http.server, sin dependencias) y una página HTML de un solo archivo.
- La página graba el micrófono con MediaRecorder o acepta un archivo de audio (también .ogg de WhatsApp)
  y lo convierte en el navegador a WAV mono de 16 kHz con OfflineAudioContext.
- Lo manda en base64 a POST /api/agente junto con el historial de la conversación.
- El servidor corre escuchar → pensar → hablar y devuelve el JSON de cada etapa y el audio.
- La página muestra la conversación como un chat (cliente a la derecha, agente a la izquierda),
  reproduce la respuesta y guarda el historial para la siguiente pregunta.
- La llave GEMINI_API_KEY solo vive en el servidor: nunca en el HTML ni en el JavaScript.
- Límites del servidor: 8 MB por pedido, 60 s de audio, 600 caracteres de texto,
  60 pedidos por hora por IP.
- Empaquétalo con un Dockerfile (python:3.12-slim, usuario sin privilegios) y un docker-compose.yml
  que publique solo en 127.0.0.1.
```

## Practica

Cambia app/botica.json por los datos de tu negocio, reinicia con docker compose restart y prueba tres preguntas reales.
