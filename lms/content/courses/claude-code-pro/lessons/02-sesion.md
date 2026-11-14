---
id: ccp-02
title: "Sesión 2 · Reglas, plantillas y prompts: tu primer render con pocos tokens"
published: true
starts_at: 2026-11-14T19:30:00-05:00
objectives:
  - id: ccp-02-o1
    title: "Escribir las reglas de la casa (CLAUDE.md) que hacen que Claude lea menos, escriba menos y no se desvíe"
  - id: ccp-02-o2
    title: "Pedir un render con p5.js, three.js o GSAP partiendo de una plantilla y con un prompt de cinco líneas"
  - id: ccp-02-o3
    title: "Medir el mismo render sin reglas y con reglas, y bajar el gasto a la mitad"
recording:
  url: ""
  passcode: ""
materials:
  - id: ccp-02-kit
    title: "kit-render.zip · las 3 plantillas, CLAUDE.md y PROMPTS.md (descárgalo y descomprímelo en una carpeta nueva)"
    kind: zip
    file: materials/render/kit-render.zip
    objective_ids: [ccp-02-o1, ccp-02-o2]
  - id: ccp-02-reglas
    title: "CLAUDE.md · las reglas de la casa (léelas: son 20 líneas)"
    kind: doc
    file: materials/render/CLAUDE.md
    objective_ids: [ccp-02-o1]
  - id: ccp-02-prompts
    title: "PROMPTS.md · la receta de cinco líneas y prompts afinados por librería y por perfil"
    kind: doc
    file: materials/render/PROMPTS.md
    objective_ids: [ccp-02-o2]
  - id: ccp-02-p5
    title: "plantilla-p5.html · mis números en 3D con p5.js (ábrela en el navegador para ver cómo queda)"
    kind: zip
    file: materials/render/plantilla-p5.html
    objective_ids: [ccp-02-o2]
  - id: ccp-02-three
    title: "plantilla-three.html · la misma idea con three.js"
    kind: zip
    file: materials/render/plantilla-three.html
    objective_ids: [ccp-02-o2]
  - id: ccp-02-gsap
    title: "plantilla-gsap.html · barras HTML que GSAP hace entrar en cascada"
    kind: zip
    file: materials/render/plantilla-gsap.html
    objective_ids: [ccp-02-o2]
  - id: ccp-02-doc-p5
    title: "p5.js · referencia oficial (setup, draw, box, WEBGL)"
    kind: doc
    url: https://p5js.org/reference/
    objective_ids: [ccp-02-o2]
  - id: ccp-02-doc-three
    title: "three.js · documentación oficial"
    kind: doc
    url: https://threejs.org/docs/
    objective_ids: [ccp-02-o2]
  - id: ccp-02-doc-gsap
    title: "GSAP · documentación oficial (gsap.to, timeline, stagger)"
    kind: doc
    url: https://gsap.com/docs/v3/
    objective_ids: [ccp-02-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el sábado de 7:30 a 9:30 p.m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: medir
    title: Medir la línea base
    tool: terminal
    phase: experiencia
    description: "En una carpeta vacía y una sesión nueva, pide «Haz un gráfico de barras 3D con p5.js en index.html» sin reglas ni plantilla, abre index.html y publica el total de /context en la escena 3."
    check: Tu número «antes» quedó publicado en la escena 3
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la sesión en el hilo o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: reglas
    title: Poner las reglas de la casa
    tool: terminal
    phase: conceptualizacion
    description: "Descarga el kit, copia CLAUDE.md y la plantilla que elijas a una carpeta nueva y marca en la escena 5 las reglas que entendiste."
    check: CLAUDE.md y una plantilla están en tu carpeta de trabajo
  - id: pedido
    title: Afinar tu pedido
    tool: lms
    phase: conceptualizacion
    description: "Escribe tu pedido de cinco líneas en el afinador de la escena 7, corrígelo hasta que el medidor lo apruebe y publícalo."
    check: Tu pedido aparece en el muro de la escena 7
  - id: render
    title: Hacer tu render
    tool: terminal
    phase: experimentacion
    description: "Con reglas y plantilla, pide tu render con tus propios datos, ábrelo en el navegador, pégalo en el laboratorio de la escena 9 y publica el total de /context."
    check: Tu número «después» quedó publicado en la escena 9
  - id: entregar
    title: Entregar el entregable 2
    tool: git
    phase: experimentacion
    description: "index.html con tus datos, CLAUDE.md, el prompt que usaste y las dos capturas de /context (antes y después). Meta: −50 %."
    check: La entrega aparece en «Mis notas»
---

## Objetivo

Que Claude dibuje algo tuyo que se mueva en pantalla, gastando la mitad de lo que gastaría sin ayuda.

Regla de todo el curso: **cada sesión empieza con una línea base y termina con una medición.** Nada se afirma sin número.

## Las tres ideas de hoy, en palabras sencillas

- **El taxímetro.** Claude cobra por lo que lee y por lo que escribe. Escribir cuesta unas cinco veces más que leer. Un pedido largo con una respuesta larga es un viaje largo con el taxímetro corriendo.
- **Las reglas de la casa.** Un archivo `CLAUDE.md` de 20 líneas que Claude lee al empezar. Es el letrero en la puerta de la cocina: «responde corto, toca solo lo que te pedí, no expliques». Se escribe una vez y ahorra en cada pedido.
- **La plantilla.** No partas de cero. Un `index.html` que ya funciona, con un bloque `DATOS`. Claude cambia seis líneas en vez de escribir cien. Es la masa de pizza ya hecha: tú solo pones los ingredientes.

## Guion de la clase (120 minutos)

| Min | Escena | Qué pasa |
| --- | --- | --- |
| 0 | 01 Bienvenida | Qué vamos a renderizar y qué tener a la mano. Voto: qué quieres ver moverse. |
| 5 | 02 El taxímetro | Qué es un token con una analogía. Lo caro es lo que Claude escribe. |
| 11 | 03 Línea base | Todos piden el render **sin** reglas. Publican su `/context`. |
| 19 | 04 Tres librerías | p5 es el cuaderno, three.js la maqueta, GSAP el que mueve. Demos vivas. |
| 25 | 05 Reglas de la casa | Leemos `CLAUDE.md` línea por línea. Cada uno marca las que entendió. |
| 33 | 06 La plantilla | Ver el bloque `DATOS`. Pedir cambios, no obras. |
| 39 | 07 El pedido de cinco líneas | Afinador de prompts: escribes, el medidor te avisa qué sobra y qué falta. |
| 47 | 08 Juego: ¿cuánto cuesta? | Cuatro rondas: ¿qué pedido gasta menos? Votar y revelar. |
| 55 | 09 Tu render | Con reglas y plantilla, tu pedido con tus datos. Laboratorio para verlo en el LMS. Publicar `/context`. |
| 75 | 10 Antes y después | Las barras del grupo. Mediana antes, mediana después, el porcentaje. |
| 81 | 11 Llévatelo a tu trabajo | Un prompt listo por perfil: contabilidad, sistemas, diseño, oficina. |
| 87 | 12 Insignia | Resumen, fotito, entregable 2 y lo que viene. |

## Entregable 2

Tu `index.html` con tus propios datos, el `CLAUDE.md` que usaste, el prompt de cinco líneas y las dos capturas de `/context` (sin reglas y con reglas). Meta: **−50 %**.

## Para practicar en la semana

Cada día, un pedido de cinco líneas sobre tu plantilla: cambia los datos, cambia un color, cambia la velocidad, agrega un título. Mide con `/context` y anota. Los prompts afinados están en `PROMPTS.md`.
