---
id: de-02
starts_at: 2026-10-29T21:15:00-05:00
title: "Sesión 2 · Web y landing que funcionan"
published: true
objectives:
  - id: de-02-o1
    title: Maquetar una web de varias páginas y una landing de una sola meta, por secciones y primero para el teléfono
  - id: de-02-o2
    title: Convertir el escrito de un cliente en el contenido de la landing sin inventar precios ni testimonios
  - id: de-02-o3
    title: Pedir a PinePaper un título en collage y una textura, y usarlos en la portada
  - id: de-02-o4
    title: Publicar la landing en una URL y probarla en el teléfono con el botón de WhatsApp real
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: de-02-temario
    title: Programa del taller (PDF, v2)
    kind: pdf
    file: materials/temario-dificil-de-explicar-v2.pdf
    objective_ids: [de-02-o1, de-02-o2, de-02-o3, de-02-o4]
  - id: de-02-m1
    title: GSAP · documentación (movimiento al hacer scroll)
    kind: doc
    url: https://gsap.com/docs/v3/
    objective_ids: [de-02-o1]
  - id: de-02-m2
    title: FLUX.1 schnell en Cloudflare Workers AI (imágenes de la landing, capa gratuita)
    kind: doc
    url: https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
    objective_ids: [de-02-o2]
  - id: de-02-m3
    title: Playwright · introducción (capturas a 393 px)
    kind: doc
    url: https://playwright.dev/docs/intro
    objective_ids: [de-02-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten a mano el texto de tu cliente o de tu negocio.
    check: Has visto la clase completa (o la grabación)
  - id: video
    title: Tu primer video hecho con código
    tool: lms
    phase: experiencia
    description: "En la escena del LIVE escribe el problema y la solución de tu negocio, elige el color de tu flor y pide el video. El servidor lo dibuja con p5.js y lo graba con HyperFrames, sin GPU."
    check: Tienes tu MP4 de 9 s y lo subiste a tu estado de WhatsApp
  - id: repaso
    title: "¡PUM! Difícil de olvidar: repaso de la sesión 1"
    tool: lms
    phase: reflexion
    description: "Diez rondas compartidas para 20 alumnos: responde sobre el pedido en seis partes, cámara y animación; después golpea hongos o revienta globos. El concepto vale 100 puntos y la destreza hasta 40."
    check: "Terminas el repaso y puedes explicar una idea que aplicarás en el pedido de tu landing"
  - id: sprites
    title: Tu mascota en sprites, sin dibujar frame por frame
    tool: jmd
    phase: experimentacion
    description: "Una pose canónica de tu mascota, ocho ediciones sobre esa misma imagen y un atlas recortado con el hocico y la base como ancla. En el LIVE el recorte y el ancla se calculan en vivo, sin GPU."
    check: El atlas se reproduce a 12 fps en tu landing y el cuerpo no tiembla
  - id: contenido
    title: Del escrito del cliente al contenido
    tool: jmd
    phase: experiencia
    description: Pega el mensaje del cliente y pide al agente que lo ordene en la plantilla de la landing, sin inventar nada.
    check: El validador no marca campos inventados ni vacíos
  - id: estilo
    title: Elegir el estilo y mirar a 393 px
    tool: vscode
    phase: reflexion
    description: Construye la misma landing en dos estilos y mírala en tu teléfono. Anota qué cambia y qué no.
    check: Captura de la landing a 393 px sin desborde horizontal
  - id: collage
    title: Pedir el collage a PinePaper
    tool: jmd
    phase: conceptualizacion
    description: Pide el título en recortes de papel con los colores del estilo y una textura discreta para el fondo de contacto.
    check: El SVG del título está en la portada
  - id: publicar
    title: Publicar y probar
    tool: jmd
    phase: experimentacion
    description: Publica la landing en su URL y abre el botón de WhatsApp desde tu teléfono.
    check: La URL abre en otro teléfono y WhatsApp llega al número del negocio
  - id: landing-sin-ia
    title: Landing sin IA (reglas y modelo local)
    tool: terminal
    phase: experimentacion
    description: Con la cuota agotada o sin gateway, saca negocio.json con el extractor por reglas (y el modelo local si está) y construye el sitio con --imagenes no.
    check: El sitio abre en el Visor con los datos correctos del cliente
  - id: entregar
    title: Entregar la tarea 2
    tool: lms
    phase: experimentacion
    description: Pega la URL publicada y el commit en la tarea 2.
    check: La entrega aparece en «Mis notas»
---

Esta guía se completa la semana de la sesión.

## Avance de la clase

Del escrito del cliente a una landing publicada: maquetación por secciones, ocho estilos, un
título en collage de PinePaper y movimiento al hacer scroll. Sales con tu landing en una URL, en
tu rubro y en el estilo que elijas, con su botón de WhatsApp real y probada en tu teléfono.

### El ciclo de esta clase

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | La misma cafetería en ocho estilos, armada desde un solo texto. |
| **2 · Reflexión** | Web o landing; qué cambia a 393 px de ancho en el teléfono. |
| **3 · Conceptos** | Maquetación por secciones, PinePaper, imágenes con FLUX y scroll. |
| **4 · Aplicación** | Tu landing publicada en una URL, con WhatsApp real. |

### Bloques de la clase (75 minutos)

- 0:00 a 0:05 · La misma cafetería en ocho estilos, de Apple a GTA 6. Qué es una landing que funciona.
- 0:05 a 0:17 · Del escrito del cliente al contenido: pegas su mensaje y el agente lo ordena; el validador avisa qué falta.
- 0:17 a 0:25 · Web o landing: una meta o varias. Qué cambia de un estilo a otro y cómo se ve a 393 px.
- 0:25 a 0:37 · Maquetación de web y landing: portada, secciones, llamada a la acción y pie; el estilo como tokens; imágenes con FLUX; movimiento al hacer scroll.
- 0:37 a 0:47 · PinePaper: un título en recortes y una textura para la portada, en SVG.
- 0:47 a 1:08 · Tu landing: tu rubro, tu estilo y tu collage. Se publica y se prueba en el teléfono.
- 1:08 a 1:12 · Prueba cruzada: otra persona abre tu landing y cumple la tarea principal sin ayuda.
- 1:12 a 1:15 · Entregable y «Lo logré».

## 1. Un contenido, ocho estilos · Experiencia

En una frase: la misma cafetería construida ocho veces sin cambiar una letra del contenido; el
estilo decide el aspecto y el movimiento.

## 2. Web o landing · Reflexión

En una frase: una landing tiene una sola meta (que te escriban); una web reparte varias metas en
varias páginas. Las dos se maquetan igual: por secciones, de arriba abajo y primero para el teléfono.

## 3. Maquetación por secciones · Conceptos

En una frase: portada con promesa y botón, beneficios, prueba social, precio, preguntas y
contacto; un solo punto focal, botones con verbo y objeto, contenido real, líneas de 45 a 75
caracteres, contraste AA y nada desbordado a 393 px.

## 4. PinePaper y las imágenes · Conceptos

En una frase: PinePaper es un servidor MCP de ilustración vectorial; le pides en palabras un título
en recortes o una textura y devuelve un SVG. Las fotos salen de FLUX, una vez por negocio, sin caras
ni manos.

## 5. Tu landing publicada · Aplicación

En una frase: construir, revisar en el visor, probar en tu teléfono y compartir el enlace para que
otra persona cumpla la tarea.

## 6. Si la IA no responde: landing por reglas · Aplicación

La cuota se acaba o el gateway se cae: la landing sale igual. El motor de la skill trae un extractor por reglas y un modelo pequeño que vive en el servidor de la clase; ninguno usa un proveedor externo.

1. Pega el texto del cliente en `/trabajo/landing/cliente.txt`.
2. Saca el JSON: `bun /opt/skills-curso/s1-landing-estilos/motor/extraer.mjs cliente.txt --modelo auto --salida negocio.json`. Las reglas ponen los datos (nombre, WhatsApp, horario, servicios, precios); el modelo local, si está, solo redacta los títulos. Lo que falte queda como `[completar]`.
3. Construye: `bun /opt/skills-curso/s1-landing-estilos/motor/construir.mjs --negocio negocio.json --estilo apple --imagenes no` y ábrelo en el Visor.

**Si falla:** `negocio.whatsapp` vacío → el texto no traía un número de 9 dígitos; escríbelo en el JSON y vuelve a construir.

## Tareas

- **Tarea 2 · Landing funcionando.** Publicada en una URL, con WhatsApp real, sin desborde a 393 px,
  contraste AA y su collage de PinePaper. Se abre la semana de la sesión.
