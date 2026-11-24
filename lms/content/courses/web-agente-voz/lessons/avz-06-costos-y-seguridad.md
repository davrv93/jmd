---
id: avz-06
title: "Paso 6 · Costos, cuotas y seguridad"
published: true
objectives:
  - {id: avz-06-o1, title: "Calcular los tokens de un audio antes de mandarlo"}
  - {id: avz-06-o2, title: "Proteger la llave y poner límites que cuiden tu cuota"}
materials:
  - {id: avz-06-video, title: "Video · Paso 6 · Costos, cuotas y seguridad", kind: video, file: materials/grabaciones/06-costos-y-seguridad.mp4, objective_ids: [avz-06-o1]}
  - {id: avz-06-repo, title: "Repositorio en GitHub · agente-voz-gemini (Windows y Mac con Docker)", kind: repo, url: https://github.com/davrv93/agente-voz-gemini}
  - {id: avz-06-prompt, title: "Prompt para construirlo con tu asistente de IA", kind: link, url: https://github.com/davrv93/agente-voz-gemini/blob/main/prompts/6-costos-y-seguridad.md}
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
    description: "Pídele a tu asistente de IA la auditoría del prompt 6 sobre tu copia del repositorio."
    check: "Tienes la lista de qué datos van a Google y los límites que vas a usar"
  - id: pensar
    title: ¿Qué cambiarías?
    tool: lms
    phase: reflexion
    description: "Anota qué cambiarías para tu negocio: voz, estilo, datos o reglas."
    check: Tienes al menos un cambio anotado para tu caso
---

## La idea clave

La llave vive en el servidor, **nunca** en el navegador. El servidor corta pedidos de más de 8 MB, audios de más de 60 s y más de 60 pedidos por hora por IP. Si se acaba la cuota de Flash TTS, pasa a Flash-Lite TTS y la página dice qué modelo respondió. Precios vigentes: [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing).

## Hazlo (igual en Windows y en Mac)

Con el agente levantado (`docker compose up -d`), en la carpeta del repositorio:

```bash
docker compose run --rm agente python pasos/6_costos.py
```

También puedes hacerlo en la página **http://127.0.0.1:8090**, en la pestaña del paso.

## Constrúyelo desde cero con tu asistente de IA

Pega este prompt en Claude, DeepSeek u otro asistente, en una carpeta vacía:

```text
Revisa mi agente de voz como lo haría un auditor:
1. ¿La llave de Gemini puede llegar al navegador por algún camino (HTML, JS, respuestas JSON, logs)?
2. ¿Qué pasa si alguien manda 1000 pedidos o un audio de 2 horas? Propón límites concretos.
3. Agrega un script que use el endpoint countTokens de Gemini para decir cuántos tokens cuesta un audio
   antes de mandarlo (la documentación dice 32 tokens por segundo).
4. Explica en una tabla qué datos personales viajan a Google en cada etapa y qué le diría a un cliente
   en un aviso de privacidad.
No inventes precios: enlaza https://ai.google.dev/gemini-api/docs/pricing.
```

## Practica

Pídele a tu asistente de IA la auditoría del prompt 6 sobre tu copia del repositorio.
