---
id: ccp-02
title: "Sesión 2 · Reglas, plantillas y prompts: tu primer render con pocos tokens"
published: true
starts_at: 2026-11-14T19:30:00-05:00
objectives:
  - id: ccp-02-o1
    title: "Armar un Proyecto en claude.ai con las reglas de la casa en Instrucciones y la plantilla en Conocimiento, para que Claude escriba menos y no se desvíe"
  - id: ccp-02-o2
    title: "Pedir un render con p5.js, three.js o GSAP como artefacto, partiendo de la plantilla y con un prompt de cinco líneas"
  - id: ccp-02-o3
    title: "Medir lo que Claude escribe en el mismo render sin reglas y con reglas, y bajarlo a la mitad"
recording:
  url: ""
  passcode: ""
materials:
  - id: ccp-02-kit
    title: "kit-render.zip · las 3 plantillas, reglas-de-la-casa.md y PROMPTS.md (descárgalo y descomprímelo)"
    kind: zip
    file: materials/render/kit-render.zip
    objective_ids: [ccp-02-o1, ccp-02-o2]
  - id: ccp-02-reglas
    title: "reglas-de-la-casa.md · el texto para las Instrucciones de tu Proyecto (20 líneas)"
    kind: doc
    file: materials/render/reglas-de-la-casa.md
    objective_ids: [ccp-02-o1]
  - id: ccp-02-prompts
    title: "PROMPTS.md · la receta de cinco líneas y prompts afinados por librería y por perfil"
    kind: doc
    file: materials/render/PROMPTS.md
    objective_ids: [ccp-02-o2]
  - id: ccp-02-p5
    title: "plantilla-p5.html · mis números en 3D con p5.js (ábrela aquí para ver cómo queda; súbela al Conocimiento de tu Proyecto)"
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
  - id: ccp-02-doc-proyectos
    title: "claude.ai · qué son los Proyectos (instrucciones y conocimiento)"
    kind: doc
    url: https://support.claude.com/en/articles/9517075-what-are-projects
    objective_ids: [ccp-02-o1]
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
    tool: lms
    phase: experiencia
    description: "En claude.ai, en un chat nuevo fuera de cualquier Proyecto, pide «Haz un gráfico de barras 3D con p5.js…» y publica en la escena 3 cuántos tokens escribió Claude (medidor: letras ÷ 4)."
    check: Tu número «sin reglas» quedó publicado en la escena 3
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la sesión en el hilo o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: reglas
    title: Armar el Proyecto con las reglas de la casa
    tool: lectura
    phase: conceptualizacion
    description: "En claude.ai crea el Proyecto «Mi render»: pega reglas-de-la-casa.md en Instrucciones y sube una plantilla al Conocimiento. Marca en la escena 5 las reglas que entendiste."
    check: Tu Proyecto tiene las instrucciones y una plantilla
  - id: pedido
    title: Afinar tu pedido
    tool: lms
    phase: conceptualizacion
    description: "Escribe tu pedido de cinco líneas en el afinador de la escena 7, corrígelo hasta que el medidor lo apruebe y publícalo."
    check: Tu pedido aparece en el muro de la escena 7
  - id: render
    title: Hacer tu render
    tool: lms
    phase: experimentacion
    description: "En un chat nuevo dentro de tu Proyecto, pide tu render con tus propios datos, mide la respuesta en la escena 9, pega el código del artefacto en el laboratorio y publica."
    check: Tu número «con reglas» quedó publicado en la escena 9
  - id: entregar
    title: Entregar el entregable 2
    tool: lms
    phase: experimentacion
    description: "El artefacto descargado como index.html, las instrucciones de tu Proyecto, el prompt que usaste y las dos capturas del medidor (sin reglas y con reglas). Meta: −50 %."
    check: La entrega aparece en «Mis notas»
---

## Objetivo

Que Claude dibuje algo tuyo que se mueva en pantalla, escribiendo la mitad de lo que escribiría sin ayuda. Todo desde claude.ai en el navegador: sin terminal.

Regla de todo el curso: **cada sesión empieza con una línea base y termina con una medición.** Nada se afirma sin número.

## Las tres ideas de hoy, en palabras sencillas

- **El taxímetro.** Claude cobra por lo que lee y por lo que escribe. Escribir cuesta unas cinco veces más que leer. Un pedido vago con una respuesta larga es un viaje largo con el taxímetro corriendo.
- **Las reglas de la casa.** Veinte líneas pegadas en las **Instrucciones** de un Proyecto de claude.ai. Es el letrero en la puerta de la cocina: «responde corto, toca solo lo que te pedí, actualiza el artefacto, no expliques». Se escribe una vez y manda en cada chat del proyecto.
- **La plantilla.** No partas de cero. Un HTML que ya funciona, con un bloque `DATOS`, subido al **Conocimiento** del Proyecto. Claude cambia seis líneas en vez de escribir cien. Es la masa de pizza ya hecha: tú solo pones los ingredientes.

## Cómo medimos en la web

claude.ai no muestra los tokens de cada respuesta. Medimos lo que Claude **escribió**: copias el texto de la respuesta y el código del artefacto, los pegas en el medidor de la escena, y el LMS calcula letras ÷ 4. Es lo caro y es lo que las reglas recortan. Tu cuota del día la ves en Configuración → Uso.

## Guion de la clase (120 minutos)

| Min | Escena | Qué pasa |
| --- | --- | --- |
| 0 | 01 Bienvenida | Qué vamos a renderizar y qué tener a la mano. Voto: qué quieres ver moverse. |
| 5 | 02 El taxímetro | Qué es un token con una analogía. Lo caro es lo que Claude escribe. |
| 11 | 03 Línea base | Todos piden el render **sin** reglas, en un chat suelto. Miden la respuesta y publican. |
| 19 | 04 Tres librerías | p5 es el cuaderno, three.js la maqueta, GSAP el que mueve. Demos vivas. |
| 25 | 05 Reglas de la casa | Creamos el Proyecto «Mi render»: Instrucciones y Conocimiento. Cada uno marca las reglas que entendió. |
| 33 | 06 La plantilla | Ver el bloque `DATOS`. Pedir cambios, no obras. |
| 39 | 07 El pedido de cinco líneas | Afinador de prompts: escribes, el medidor te avisa qué sobra y qué falta. |
| 47 | 08 Juego: ¿cuánto cuesta? | Cuatro rondas: ¿qué pedido gasta menos? Votar y revelar. |
| 55 | 09 Tu render | Chat nuevo en el Proyecto, tu pedido con tus datos. Artefacto, medidor y laboratorio del LMS. |
| 75 | 10 Antes y después | Las barras del grupo. Mediana antes, mediana después, el porcentaje. |
| 81 | 11 Llévatelo a tu trabajo | Un prompt listo por perfil: contabilidad, sistemas, diseño, oficina. |
| 87 | 12 Insignia | Resumen, fotito, entregable 2 y lo que viene. |

## Entregable 2

El artefacto descargado como `index.html` con tus propios datos, el texto de las Instrucciones de tu Proyecto, el prompt de cinco líneas y las dos capturas del medidor (sin reglas y con reglas). Meta: **−50 %**.

## Para practicar en la semana

Cada día, un pedido de cinco líneas en un chat nuevo de tu Proyecto: cambia los datos, cambia un color, cambia la velocidad, agrega un título. Mide con el medidor y anota. Los prompts afinados están en `PROMPTS.md`.
