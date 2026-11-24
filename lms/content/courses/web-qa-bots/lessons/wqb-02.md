---
id: wqb-02
title: "Parte 2 · Vigila: cada caída y cada fallo, con su evidencia"
published: true
duration: 30
objectives:
  - {id: wqb-02-o1, title: "Dejar un robot que corre la suite todo el día, con su página de estado"}
  - {id: wqb-02-o2, title: "Avisar solo cuando algo cambia: se cayó, volvió o apareció un fallo nuevo"}
  - {id: wqb-02-o3, title: "Planear con la IA el siguiente paso: bots con ritmo humano, ficha del fallo y agente con contexto"}
recording:
  url: "https://us06web.zoom.us/rec/share/RrfTSWc4-05euMLRQEpEgdPyCWnI-pA3pZtM5egI0ZMA62es5bLumwXPoZ1MEGZe.BW2z8RG8HAtEcPYk?pwd=DAHS_gaZIGy92Qk1RQAAIAAAAAnSQ3VxH2ULHuYC4WPZzBO93w1mIBdveweianF8jEJANFmeMLDHnt9tYPG33xhDcTAwMDAwNA"
  passcode: "310P?X4E"
materials:
  - {id: wqb-02-repo, title: "Repo en GitHub · el robot y el vigía están en las carpetas robot/ y vigia/", kind: link, url: https://github.com/davrv93/qa-bots-ejemplos}
  - {id: wqb-02-resumen, title: "Video · Vigila en 1 minuto (resumen de la sesión en vivo)", kind: video, file: materials/grabaciones/wqb-02-vigila-resumen-1min.mp4, objective_ids: [wqb-02-o1, wqb-02-o2]}
  - {id: wqb-02-paso, title: "Video · Vigila paso a paso: siete prompts, del pedido al plan de trabajo", kind: video, file: materials/grabaciones/wqb-02-vigila-paso-a-paso.mp4, objective_ids: [wqb-02-o3]}
cycle:
  - id: ver
    title: Mira los dos videos
    tool: lms
    phase: experiencia
    description: "El resumen de un minuto y el paso a paso con los siete prompts de la sesión en vivo."
    check: Viste los dos videos
  - id: robot
    title: Enciende el robot y el vigía
    tool: terminal
    phase: experiencia
    description: "`docker compose --profile vigila up -d --build`. Abre http://127.0.0.1:3200 para ver el robot; apaga y prende la tienda (`docker compose stop tienda` y `docker compose start tienda`) y mira los avisos con `docker compose logs --no-log-prefix vigia`."
    check: El vigía avisó la caída y la recuperación
  - id: reglas
    title: Decide cuándo avisar
    tool: lms
    phase: reflexion
    description: "Escribe en el hilo tu regla de alertas para que el chat no se inunde: qué avisas, a quién y cada cuánto."
    check: Tu regla aparece en el hilo
  - id: lenta
    title: Un aviso de lentitud
    tool: claude-code
    phase: experimentacion
    description: "Con el prompt del paso 3, agrega al vigía el aviso «lenta». Pruébalo con `LATENCIA_MS=2000` en `.env` y `docker compose up -d tienda`."
    check: El vigía avisa «lenta» una sola vez y deja de avisar cuando vuelve a estar rápida
---

## Parte 2 · Vigila

Que te enteres antes que tu cliente. Las pruebas E2E revisan antes de desplegar. El robot las repite
después, todo el día, y avisa cuando algo se rompe aunque nadie haya tocado el código.

1. **El robot** corre la suite cada N minutos y muestra el semáforo, la tira de 24 horas y la película de cada
   prueba que falla.
2. **El vigía** consulta `/salud` y avisa solo cuando el estado cambia.
3. **El aviso** llega a tu WhatsApp en el proyecto final: el vigía y los bots le escriben al bot QA.

En la sesión en vivo se usó una segunda app, el Instituto «Horizonte», para planear con la IA lo que sigue:
bots con ritmo humano (un formulario de 4 campos en 30 a 45 segundos, no en 10), la ficha completa del fallo,
un agente con el contexto del caso y un oráculo independiente. Las partes 3 y final de este curso llevan esa
idea a la Tienda Sol del repositorio.

**Entregable 2:** la captura del robot en http://127.0.0.1:3200 y la del vigía avisando la caída y la
recuperación.
