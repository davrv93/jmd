---
id: de-03
starts_at: 2026-11-05T21:15:00-05:00
title: "Sesión 3 · Animación y video con HyperFrames"
published: true
objectives:
  - id: de-03-o1
    title: Leer un video como una línea de tiempo de escenas, al pulso de la música
  - id: de-03-o2
    title: Animar en 2D y en 3D sin cansar la vista, con siluetas, texto cinético, collage y profundidad
  - id: de-03-o3
    title: Editar con pedidos al agente (orden, duración, texto, música y formato) y renderizar el MP4
  - id: de-03-o4
    title: Sacar de la misma pieza el flyer de 1080 × 1350 y el estado de 1080 × 1920
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: de-03-temario
    title: Programa del taller (PDF, v2)
    kind: pdf
    file: materials/temario-dificil-de-explicar-v2.pdf
    objective_ids: [de-03-o1, de-03-o2, de-03-o3, de-03-o4]
  - id: de-03-willie
    title: "Pieza «Willie, difícil de explicar» de la sesión 1 (el punto de partida)"
    kind: zip
    file: materials/willie/index.html
    objective_ids: [de-03-o1, de-03-o2]
  - id: de-03-m1
    title: GSAP · documentación (la línea de tiempo)
    kind: doc
    url: https://gsap.com/docs/v3/
    objective_ids: [de-03-o1, de-03-o2]
  - id: de-03-m2
    title: Three.js · documentación (el objeto 3D)
    kind: doc
    url: https://threejs.org/docs/
    objective_ids: [de-03-o2]
  - id: de-03-m3
    title: Playwright · introducción (capturas cuadro a cuadro)
    kind: doc
    url: https://playwright.dev/docs/intro
    objective_ids: [de-03-o3]
  - id: de-03-m4
    title: FFmpeg · documentación (del cuadro al MP4)
    kind: doc
    url: https://ffmpeg.org/documentation.html
    objective_ids: [de-03-o3]
cycle:
  - id: ver
    title: Ver «Difícil de explicar» en pantalla
    tool: zoom
    phase: experiencia
    description: 40 segundos, 12 escenas, siluetas en bits y música sintetizada. Trae el mensaje de tu pieza en una frase.
    check: Has visto la clase completa (o la grabación)
  - id: abrir
    title: Abrirlo en Studio
    tool: jmd
    phase: experiencia
    description: Las escenas como clips en una línea de tiempo. Pide al agente cambiar un texto y míralo al instante.
    check: El texto cambiado se ve en la vista previa
  - id: desarmar
    title: Desarmarlo
    tool: lms
    phase: reflexion
    description: "Por qué no cansa la vista: cortes al pulso, pasteles de brillo parejo, ningún corte menor de 0,25 s. Anota tres cortes y su segundo."
    check: Tu storyboard de la pieza del taller en el hilo de la sesión
  - id: conceptos
    title: Escenas, línea de tiempo, 2D y 3D
    tool: vscode
    phase: conceptualizacion
    description: Cada escena tiene inicio y duración; todo el movimiento vive en una línea de tiempo; el render la graba cuadro a cuadro. Siluetas, texto cinético, collage, tarjetas en perspectiva y un objeto 3D.
    check: Identificas en el código la escena y el segundo en que entra el título
  - id: tu-pieza
    title: Tu pieza de 15 a 20 s
    tool: jmd
    phase: experimentacion
    description: Brief, storyboard de cuatro a seis escenas, pedidos al agente, revisión automática y render a MP4.
    check: El MP4 pasa la revisión automática sin errores
  - id: formatos
    title: Otra música, flyer y estado
    tool: jmd
    phase: experimentacion
    description: La misma imagen con otra pista, y las piezas de 1080 × 1350 y 1080 × 1920 para WhatsApp.
    check: "Tres archivos: MP4 horizontal, flyer y estado vertical"
---

Esta guía se completa la semana de la sesión.

## Avance de la clase

Un video escrito en HTML: escenas al pulso, siluetas en bits, collage que cae letra a letra,
profundidad en 3D y render a MP4. De la misma pieza salen el flyer y el estado. Vemos el video,
lo abrimos como lo que es (una página web con una línea de tiempo) y lo convertimos en tu pieza.

### El ciclo de esta clase

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | «Difícil de explicar» en pantalla y abierto en Studio. |
| **2 · Reflexión** | Por qué no cansa la vista: pulso, color y cortes. |
| **3 · Conceptos** | Escenas y línea de tiempo; animación 2D y 3D. |
| **4 · Aplicación** | Tu video en MP4, con flyer y estado. |

### Bloques de la clase (75 minutos)

- 0:00 a 0:05 · «Difícil de explicar» en pantalla: 40 s, 12 escenas, siluetas en bits y música sintetizada.
- 0:05 a 0:15 · Lo abrimos en Studio: escenas como clips en una línea de tiempo. Un cambio de texto al instante.
- 0:15 a 0:23 · Desarmarlo: cortes al pulso, pasteles de brillo parejo, ningún corte de menos de 0,25 s.
- 0:23 a 0:35 · Cómo piensa HyperFrames: inicio y duración por escena; una sola línea de tiempo; render cuadro a cuadro.
- 0:35 a 0:43 · Animación 2D y 3D: siluetas, texto cinético, collage de PinePaper; tarjetas en perspectiva y un objeto 3D.
- 0:43 a 1:04 · Tu pieza de 15 a 20 s: brief, storyboard, pedidos, revisión automática y render a MP4.
- 1:04 a 1:11 · Otra música, flyer y estado.
- 1:11 a 1:15 · Entregable, «Lo logré» y cierre del taller.

## 1. El video en pantalla y en Studio · Experiencia

En una frase: cada escena es una caja que entra en un segundo y dura lo que dura; Studio la
muestra como un clip en una línea de tiempo.

## 2. Por qué no cansa la vista · Reflexión

En una frase: 120 pulsos por minuto, un compás de 2 s, cortes en la rejilla de corcheas, fondo
tinta y seis pasteles de brillo parejo para que un corte rápido no destelle.

## 3. Cómo piensa HyperFrames · Conceptos

En una frase: `<section class="clip" data-start="16" data-duration="4">` es la escena;
`tl.from("h1", { y: 80, opacity: 0 }, 16.5)` es el movimiento en la línea de tiempo; el render
recorre la línea cuadro a cuadro y graba un MP4 de 1920 × 1080 a 30 fps.

## 4. Animación 2D y 3D, con diseño · Conceptos

En una frase: siluetas en bits con tratamientos distintos sin redibujar, texto cinético al pulso,
el collage que cae letra a letra, tarjetas en perspectiva y un objeto 3D con Three.js dentro de la
misma línea de tiempo. El movimiento explica; si solo adorna, se quita.

## 5. Tu video, tu flyer y tu estado · Aplicación

En una frase: de una sola pieza salen el MP4 de 15 a 40 s, la versión con otra música, el flyer
de 1080 × 1350 y el estado de 1080 × 1920.

## Tareas

- **Tarea 3 · Video, flyer y estado.** MP4 de 15 a 40 s que pasa la revisión automática, versión
  con otra música y las dos piezas para WhatsApp, con brief y storyboard. Se abre la semana de la
  sesión.
