---
id: ccp-04
title: "Sesión 4 · Un editor de video con Claude: HyperFrames, QA y pruebas"
published: true
starts_at: 2026-11-28T19:30:00-05:00
objectives:
  - id: ccp-04-o1
    title: "Programar con Claude Code un editor de video sencillo: línea de tiempo, textos, imágenes y música"
  - id: ccp-04-o2
    title: "Renderizar el video con HyperFrames y revisarlo cuadro a cuadro"
  - id: ccp-04-o3
    title: "Hacer QA y pruebas: casos por riesgo, pruebas automáticas en verde y la medición de tokens"
recording:
  url: ""
  passcode: ""
materials:
  - id: ccp-04-kit
    title: "editor-video.zip · 3 imágenes, una música suave y proyecto-ejemplo.json para armar tu editor (descomprímelo en una carpeta nueva)"
    kind: zip
    file: materials/editor-video/editor-video.zip
    objective_ids: [ccp-04-o1, ccp-04-o2, ccp-04-o3]
  - id: ccp-04-hyperframes
    title: "HyperFrames · guía de inicio (documentación oficial)"
    kind: doc
    url: https://hyperframes.heygen.com/quickstart
    objective_ids: [ccp-04-o2]
  - id: ccp-04-hyperframes-codigo
    title: "HyperFrames · código abierto en GitHub (Apache 2.0)"
    kind: doc
    url: https://github.com/heygen-com/hyperframes
    objective_ids: [ccp-04-o2]
  - id: ccp-04-ffmpeg
    title: "FFmpeg · descarga (HyperFrames lo necesita para armar el MP4)"
    kind: doc
    url: https://ffmpeg.org/download.html
    objective_ids: [ccp-04-o2]
  - id: ccp-04-node-test
    title: "Node.js · el probador integrado (node --test), para las pruebas automáticas"
    kind: doc
    url: https://nodejs.org/api/test.html
    objective_ids: [ccp-04-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el sábado de 7:30 a 9:30 p.m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la sesión en el hilo o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el entregable 4
    tool: git
    phase: experimentacion
    description: "Tu editor de video funcionando, un video de 15 a 30 segundos renderizado con HyperFrames, el informe de QA con sus casos y las pruebas en verde, y el reporte de tokens de todo el curso."
    check: La entrega aparece en «Mis notas»
---

## Objetivo

Programar con Claude Code un editor de video pequeño y de verdad: una página donde armas una línea de tiempo con textos, imágenes y música, y que exporta una composición de HyperFrames. Luego renderizas el MP4 con HyperFrames y lo pruebas como lo haría un equipo de QA: casos por riesgo, pruebas automáticas y una revisión cuadro a cuadro del video.

Regla de todo el curso: **cada sesión empieza con una línea base y termina con una medición.** Nada se afirma sin número.

## Qué vas a necesitar

- Claude Code con tu plan Pro.
- Node.js 22 o superior, FFmpeg y Google Chrome (compruébalo con `npx hyperframes doctor`).
- Unas imágenes y una canción tuyas, o las del kit de la sesión.

## Entregable 4

En «Mis notas»:

1. Tu editor de video funcionando (repositorio o carpeta comprimida).
2. Un video de 15 a 30 segundos renderizado con HyperFrames desde tu editor.
3. El informe de QA: los casos que probaste, cuáles pasaron, cuáles fallaron y qué corregiste.
4. Las pruebas automáticas en verde (captura de la terminal).
5. El reporte de tokens de todo el curso: cuánto de tu plan gastaste en cada sesión.
