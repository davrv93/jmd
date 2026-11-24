---
id: avz-02
title: "Paso 2 · Dos voces en una sola llamada"
published: true
objectives:
  - {id: avz-02-o1, title: "Generar un diálogo de dos personajes con voces distintas"}
  - {id: avz-02-o2, title: "Usar etiquetas como <short pause> y <laugh> dentro del texto"}
materials:
  - {id: avz-02-video, title: "Video · Paso 2 · Dos voces en una sola llamada", kind: video, file: materials/grabaciones/02-dos-voces.mp4, objective_ids: [avz-02-o1]}
  - {id: avz-02-repo, title: "Repositorio en GitHub · agente-voz-gemini (Windows y Mac con Docker)", kind: repo, url: https://github.com/davrv93/agente-voz-gemini}
  - {id: avz-02-prompt, title: "Prompt para construirlo con tu asistente de IA", kind: link, url: https://github.com/davrv93/agente-voz-gemini/blob/main/prompts/2-voces-y-dialogo.md}
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
    description: "Escribe en la pestaña 2 un diálogo real de tu negocio (un cliente y quien atiende) con al menos una etiqueta."
    check: "Tu diálogo suena con dos voces y la etiqueta se nota donde la pusiste"
  - id: pensar
    title: ¿Qué cambiarías?
    tool: lms
    phase: reflexion
    description: "Anota qué cambiarías para tu negocio: voz, estilo, datos o reglas."
    check: Tienes al menos un cambio anotado para tu caso
---

## La idea clave

Gemini acepta **hasta 2 personajes** por pedido: cada línea es una parte con su `speechMetadata.speaker` y su estilo. Si necesitas más personajes, genera cada turno por separado y une los audios.

## Hazlo (igual en Windows y en Mac)

Con el agente levantado (`docker compose up -d`), en la carpeta del repositorio:

```bash
docker compose run --rm agente python pasos/2_dialogo.py
```

También puedes hacerlo en la página **http://127.0.0.1:8090**, en la pestaña del paso.

## Constrúyelo desde cero con tu asistente de IA

Pega este prompt en Claude, DeepSeek u otro asistente, en una carpeta vacía:

```text
Agrega una función dialogo(lineas, voces) al script anterior.
- lineas es una lista de (personaje, texto, estilo); voces es {personaje: voz}. Máximo 2 personajes.
- Cada línea es una parte distinta de contents con speechMetadata: {speaker, style}.
- speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs lleva un {speaker, voiceConfig.prebuiltVoiceConfig.voiceName} por personaje.
- Prueba con un cliente (voz Puck) y una boticaria (voz Kore) hablando del delivery.
- Usa etiquetas dentro del texto como <short pause> y <laugh>.
Valida que haya exactamente 2 personajes y que cada línea tenga texto; si no, error claro en español.
```

## Practica

Escribe en la pestaña 2 un diálogo real de tu negocio (un cliente y quien atiende) con al menos una etiqueta.
