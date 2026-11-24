---
id: avz-04
title: "Paso 4 · El agente: escuchar, pensar y hablar"
published: true
objectives:
  - {id: avz-04-o1, title: "Encadenar escuchar, pensar y hablar en un solo flujo"}
  - {id: avz-04-o2, title: "Medir el tiempo y el modelo de cada etapa"}
materials:
  - {id: avz-04-video, title: "Video · Paso 4 · El agente: escuchar, pensar y hablar", kind: video, file: materials/grabaciones/04-el-agente.mp4, objective_ids: [avz-04-o1]}
  - {id: avz-04-repo, title: "Repositorio en GitHub · agente-voz-gemini (Windows y Mac con Docker)", kind: repo, url: https://github.com/davrv93/agente-voz-gemini}
  - {id: avz-04-prompt, title: "Prompt para construirlo con tu asistente de IA", kind: link, url: https://github.com/davrv93/agente-voz-gemini/blob/main/prompts/4-el-agente.md}
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
    description: "Hazle al agente una pregunta que **no** esté en botica.json. ¿Inventa o deriva?"
    check: "Viste el JSON de las tres etapas y el agente derivó cuando no sabía"
  - id: pensar
    title: ¿Qué cambiarías?
    tool: lms
    phase: reflexion
    description: "Anota qué cambiarías para tu negocio: voz, estilo, datos o reglas."
    check: Tienes al menos un cambio anotado para tu caso
---

## La idea clave

Separar las etapas te deja **medir y cambiar cada una**: otro modelo para pensar u otra voz para hablar, sin tocar el resto. El paso de pensar también elige el estilo de la voz según cómo se siente el cliente.

## Hazlo (igual en Windows y en Mac)

Con el agente levantado (`docker compose up -d`), en la carpeta del repositorio:

```bash
docker compose run --rm agente python pasos/4_agente.py
```

También puedes hacerlo en la página **http://127.0.0.1:8090**, en la pestaña del paso.

## Constrúyelo desde cero con tu asistente de IA

Pega este prompt en Claude, DeepSeek u otro asistente, en una carpeta vacía:

```text
Arma el agente en tres etapas y mide cuánto tarda cada una:
1. ESCUCHAR: entender(wav) con gemini-3.5-flash-lite → JSON.
2. PENSAR: pensar(lo_que_entendio, datos_del_negocio, historial) con gemini-3.5-flash-lite.
   Prompt: «Eres el asistente de voz de un negocio. Responde en 1 o 2 frases cortas, como se habla
   por teléfono, sin listas ni emojis. Usa SOLO los datos del negocio; si la respuesta no está ahí,
   dilo y marca derivar_a_humano. Si la persona está molesta o es urgente, empieza reconociéndolo.»
   Salida JSON: respuesta (string), estilo (string: cómo debe sonar), derivar_a_humano (boolean).
3. HABLAR: convierte la respuesta en voz con gemini-3.8-flash-tts usando el estilo que eligió el paso 2.
Los datos del negocio vienen de botica.json. Imprime el JSON de cada etapa y guarda el WAV final.
```

## Practica

Hazle al agente una pregunta que **no** esté en botica.json. ¿Inventa o deriva?
