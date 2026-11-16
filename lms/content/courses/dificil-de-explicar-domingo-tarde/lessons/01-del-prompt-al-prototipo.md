---
id: dt-01
starts_at: 2026-11-15T17:30:00-05:00
title: "Sesión 1 · Imágenes con FLUX y animación en código: p5, Three.js, GSAP y HyperFrames"
published: true
objectives:
  - id: dt-01-o1
    title: Explicar qué es un modelo FLUX (del ruido a la imagen en pasos, variantes y licencias) y generar tu imagen base con una receta de cuatro partes
  - id: dt-01-o2
    title: Elegir los fps según el destino (12, 24, 30 o 60) y mover por tiempo, no por cuadro
  - id: dt-01-o3
    title: Animar tu imagen base en vivo con p5.js, Three.js y GSAP cambiando el código de un ejemplo
  - id: dt-01-o4
    title: Explicar cómo HyperFrames convierte HTML y GSAP en video, y pedir tu pieza a un agente con las seis partes
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: dt-01-resumen
    title: "Video resumen de la sesión (2:16): FLUX, código sin programar y el reto del recorte"
    kind: video
    file: materials/grabaciones/dt-01-resumen.mp4
    objective_ids: [dt-01-o1, dt-01-o2, dt-01-o3, dt-01-o4]
  - id: dt-01-temario
    title: "Programa del taller (PDF, v2)"
    kind: pdf
    file: materials/temario-dificil-de-explicar-v2.pdf
    objective_ids: [dt-01-o1, dt-01-o2, dt-01-o3, dt-01-o4]
  - id: dt-01-skills
    title: "skills-dificil.zip · las dos skills del taller (pedido en seis partes y animación abierta) e instalar.sh"
    kind: zip
    file: materials/skills-dificil.zip
    objective_ids: [dt-01-o4]
  - id: dt-01-capas
    title: "recursos-capas.zip · la escena del gato pirata en 9 capas (SVG con fondo transparente) para el parallax"
    kind: zip
    file: materials/recursos-capas.zip
    objective_ids: [dt-01-o3]
  - id: dt-01-m1
    title: "Black Forest Labs · los modelos FLUX"
    kind: link
    url: https://bfl.ai/
    objective_ids: [dt-01-o1]
  - id: dt-01-m2
    title: "FLUX.1 [schnell] en Hugging Face · pesos abiertos, Apache 2.0"
    kind: link
    url: https://huggingface.co/black-forest-labs/FLUX.1-schnell
    objective_ids: [dt-01-o1]
  - id: dt-01-m3
    title: "FLUX.1 [schnell] en Cloudflare Workers AI · el que usa la clase (pasos, semilla, capa gratuita)"
    kind: doc
    url: https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
    objective_ids: [dt-01-o1]
  - id: dt-01-m4
    title: "FLUX.2 · anuncio de Black Forest Labs (noviembre de 2025)"
    kind: doc
    url: https://bfl.ai/blog/flux-2
    objective_ids: [dt-01-o1]
  - id: dt-01-m5
    title: "p5.js · referencia (frameRate, millis, loadImage, image)"
    kind: doc
    url: https://p5js.org/reference/
    objective_ids: [dt-01-o2, dt-01-o3]
  - id: dt-01-m6
    title: "Three.js · documentación (Scene, PerspectiveCamera, Mesh, WebGLRenderer)"
    kind: doc
    url: https://threejs.org/docs/
    objective_ids: [dt-01-o3]
  - id: dt-01-m7
    title: "GSAP · documentación (to, from, timeline, eases)"
    kind: doc
    url: https://gsap.com/docs/v3/
    objective_ids: [dt-01-o3, dt-01-o4]
  - id: dt-01-m8
    title: "easings.net · catálogo visual de curvas de entrada y salida"
    kind: link
    url: https://easings.net
    objective_ids: [dt-01-o3]
  - id: dt-01-m9
    title: "HyperFrames en GitHub · de HTML a video MP4 (HeyGen, Apache 2.0)"
    kind: repo
    url: https://github.com/heygen-com/hyperframes
    objective_ids: [dt-01-o4]
  - id: dt-01-m10
    title: "Hugging Face Spaces con ZeroGPU · probar FLUX [dev] con GPU gratis por minutos"
    kind: doc
    url: https://huggingface.co/docs/hub/en/spaces-zerogpu
    objective_ids: [dt-01-o1]
  - id: dt-01-willie
    title: "Referencia · pieza «Willie, difícil de explicar» (HTML terminado; ábrela en el navegador, ?t=7 la deja quieta)"
    kind: zip
    file: materials/willie/index.html
    objective_ids: [dt-01-o2]
  - id: dt-01-willie-prompt
    title: "Referencia · el pedido de seis partes con el que se hizo Willie"
    kind: doc
    file: materials/willie/PROMPT.md
    objective_ids: [dt-01-o4]
  - id: dt-01-m11
    title: "Referencia · Steamboat Willie (1928) en Wikimedia Commons, dominio público"
    kind: link
    url: https://commons.wikimedia.org/wiki/File:Steamboat_Willie_(1928)_by_Walt_Disney_and_Ub_Iwerks.webm
    objective_ids: [dt-01-o2]
  - id: dt-01-m12
    title: "Referencia · los 12 principios de la animación (Thomas y Johnston)"
    kind: doc
    url: https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
    objective_ids: [dt-01-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: "Sigue la clase en vivo o en la grabación con el modo LIVE abierto. Ten tu carpeta en VS Code y tu agente listo."
    check: "Has visto la clase completa (o la grabación)"
  - id: flux
    title: Generar tu imagen base con FLUX
    tool: lms
    phase: experiencia
    description: "En la escena «Tu imagen base», escribe la receta (quién, qué hace, dónde, cómo se ve), genera al menos una imagen y elige una con «Usar como base»."
    check: "Tu imagen base aparece en el recuadro «Tu imagen base»"
  - id: p5
    title: Animar con p5.js
    tool: lms
    phase: experiencia
    description: "Elige un ejemplo (respira, flota, franjas, agua o partículas), cambia un número, pulsa Ejecutar y prueba 12 y 60 fps."
    check: "Tu imagen base se mueve con un número cambiado por ti"
  - id: three
    title: Llevarla a 3D con Three.js
    tool: lms
    phase: experiencia
    description: "Prueba postal, relieve, multiplano y cubo. Cambia la altura del relieve o la velocidad de la cámara."
    check: "Captura de tu imagen en 3D con un cambio tuyo"
  - id: gsap
    title: Darle línea de tiempo con GSAP
    tool: lms
    phase: experiencia
    description: "Prueba la entrada, la cámara, las curvas y el tifo. Cambia una duración o un ease."
    check: "Tu línea de tiempo corre con una duración o un ease cambiado por ti"
  - id: hyperframes
    title: Entender HyperFrames
    tool: lms
    phase: conceptualizacion
    description: "Arrastra el tiempo de la escena, prueba el render cuadro a cuadro y copia la plantilla index.html."
    check: "Sabes decir qué hacen class=\"clip\", data-start, data-duration y la línea de tiempo pausada"
  - id: aplicar
    title: Pedir tu pieza al agente
    tool: jmd
    phase: experimentacion
    description: "Arma el pedido en seis partes en la escena «Tu pieza», pégalo en tu agente con tu imagen base en assets/ y corrige con un segundo pedido preciso."
    check: "Tu index.html anima tu imagen base y tienes captura antes y después del segundo pedido"
  - id: entregar
    title: Entregar la tarea 1
    tool: git
    phase: experimentacion
    description: "Sube el repositorio sesion-01 con mi-pieza/, FICHA_PROMPTS.md y capturas/, y entrégalo desde el LMS (URL + commit)."
    check: "La entrega aparece en «Mis notas»"
---

## Avance de la clase

Hoy haces una imagen con IA y la pones en movimiento con código. Primero entiendes qué es **FLUX**:
un modelo que parte de ruido y, paso a paso, lo ordena hacia lo que dice tu texto. Con él generas tu
**imagen base**: una sola, que eliges y ya no regeneras. Luego entiendes los **fps** (cuántas imágenes
por segundo ves) y la mueves en vivo, dentro del modo LIVE, con tres bibliotecas: **p5.js** (dibujo
2D), **Three.js** (3D) y **GSAP** (línea de tiempo). Al final ves cómo **HyperFrames** convierte esa
misma página en un video MP4, cuadro por cuadro, y le pides tu pieza a tu agente con un pedido de
seis partes. Willie (1928) queda como referencia de cómo se animaba a mano.

### El ciclo de esta clase

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | Secciones 2, 4, 5 y 6: generas tu imagen base y la animas con p5, Three.js y GSAP. |
| **2 · Reflexión** | Sección 8: comparas con Willie y revisas lo que pediste contra lo que obtuviste. |
| **3 · Conceptos** | Secciones 1, 3 y 7: qué es FLUX, qué son los fps y cómo funciona HyperFrames. |
| **4 · Aplicación** | Sección 9 y «Tareas»: pides tu pieza al agente y entregas el repositorio `sesion-01`. |

### Bloques de la clase (90 minutos)

- 0:00 a 0:04 · Bienvenida y mapa de la clase.
- 0:04 a 0:12 · Qué son los modelos FLUX (sección 1).
- 0:12 a 0:23 · Tu imagen base (sección 2).
- 0:23 a 0:30 · fps (sección 3).
- 0:30 a 0:42 · p5.js en vivo (sección 4).
- 0:42 a 0:54 · Three.js en vivo (sección 5).
- 0:54 a 1:04 · GSAP en vivo (sección 6).
- 1:04 a 1:14 · HyperFrames: de HTML a video (sección 7).
- 1:14 a 1:17 · Referencia: Willie (sección 8).
- 1:17 a 1:27 · Tu pieza en seis partes (sección 9).
- 1:27 a 1:30 · Cierre, entregable y «Lo logré».

## 0. Antes de la clase · Experiencia

En una frase: dejas lista una carpeta vacía, un navegador al día y un agente que responde.

**Qué vas a hacer**
1. Entra a jmd-learn.online con tu cuenta y abre esta sesión en modo LIVE.
2. Crea una carpeta sin espacios, por ejemplo `sesion-01`, con una subcarpeta `mi-pieza/assets/`, y ábrela en VS Code.
3. Comprueba que tu agente responde (`jmd chat "hola"`, `claude` u `opencode`). En el aula del LIVE ya está JMD.

**Qué vas a ver:** la escena de bienvenida con el mapa de la clase.

**Si falla:** usa Chrome o Edge actualizados: Three.js necesita WebGL. Si tu agente no responde, trabaja en el aula del LIVE.

## 1. Qué son los modelos FLUX · Conceptos

En una frase: FLUX parte de ruido y en cada paso lo ordena hacia lo que dice tu texto.

**Qué vas a hacer**
1. En la escena «Qué son los modelos FLUX», pulsa **Ver los pasos** con 1, 2, 4, 8 y 28 pasos.
2. Lee la familia: FLUX.1 [schnell] (rápido, Apache 2.0, el de la clase), [dev] (más pasos, no comercial),
   [pro] y FLUX.2 [pro, flex, max] (solo API), Kontext (edita una imagen tuya) y FLUX.2 [klein] (pequeño).
3. Anota lo que tú controlas: texto, orientación, pasos y **semilla** (el ruido de partida).

**Qué vas a ver:** el ruido que se ordena paso a paso hasta la imagen. Es una ilustración: el modelo trabaja en un espacio comprimido (latente) y al final lo pasa a píxeles.

**Si falla:** si la imagen no carga, recarga la escena; la animación es local y no gasta tu cupo.

## 2. Tu imagen base · Experiencia

En una frase: generas con FLUX y eliges **una** imagen base que ya no se regenera; el movimiento lo pone el código.

**Qué vas a hacer**
1. Escribe la receta en cuatro partes: **quién**, **qué hace**, **dónde** y **cómo se ve** (el estilo). Elige la forma.
2. Pulsa **Generar con FLUX** (unos 10 s). Para una variación, cambia **una sola** parte y genera otra vez.
3. Elige tu favorita con **Usar como base**. Guárdala también en tu carpeta como `mi-pieza/assets/base.webp` (clic derecho → Guardar imagen).

**Qué vas a ver:** tus imágenes lado a lado y tu imagen base en el recuadro. Las escenas siguientes la usan sola.

**Si falla:** si se acabó tu cupo del día, elige entre las que ya tienes o sigue con la imagen de ejemplo (el gato pirata).
Sin texto dentro de la imagen: FLUX escribe mal las letras; el texto va en tu HTML.

## 3. fps · Conceptos

En una frase: los fps son cuántas imágenes por segundo ves, y la velocidad se calcula con el tiempo, no con los cuadros.

**Qué vas a hacer**
1. En «Comparar fps», mira la misma animación a 6, 12, 24 y 60 fps.
2. En «Por cuadro vs por tiempo», baja el fps del atasco: el carril «por cuadro» se vuelve lento; el de «por tiempo», no.

**Qué vas a ver:** 24 es cine, 25 o 30 video, 60 o 120 pantallas y juegos, 12 los dibujos clásicos «en dos», 30 lo que renderiza HyperFrames por defecto.

**Si falla:** nada que instalar: es una animación local.

## 4. p5.js en vivo · Experiencia

En una frase: p5 dibuja en un canvas; `draw()` se repite FPS veces por segundo y tu imagen base se mueve con el tiempo.

**Qué vas a hacer**
1. Prueba los ejemplos: respira, flota, parallax por franjas, agua y partículas.
2. Cambia un número (la amplitud, la velocidad, las franjas) y pulsa **Ejecutar** (Ctrl + Enter). Prueba 12 y 60 fps.
3. Pulsa **Descargar .html** o **Copiar código** y guárdalo en tu carpeta.

**Qué vas a ver:** tu imagen base moviéndose a la derecha; si hay un error, la línea aparece en rojo debajo del código.

**Si falla:** pulsa ↺ para volver al ejemplo original.

## 5. Three.js en vivo · Experiencia

En una frase: Three.js arma una escena 3D (cámara, malla y renderer) y tu imagen es la textura.

**Qué vas a hacer**
1. Prueba postal, relieve (lo claro sale hacia ti), multiplano (tres franjas, como la cámara de Disney de 1937) y cubo: con una sola imagen, la profundidad se nota… y la imagen se deforma.
2. Prueba las **capas**: la misma escena en 9 dibujos con fondo transparente (cielo, sol, nubes, montañas, colinas, mar, barco, olas y gaviotas), cada uno en su plano. «Parallax», «Escena viva» y «Sigue el mouse». Descárgalas de Materiales (`recursos-capas.zip`).
3. Cambia la distancia de una capa (`PROF`) o la velocidad de la cámara, y vuelve a ejecutar.

**Qué vas a ver:** tu imagen como objeto 3D con profundidad real.

**Si falla:** si ves negro, tu navegador no tiene WebGL activo; prueba Chrome.

## 6. GSAP en vivo · Experiencia

En una frase: GSAP anima propiedades de HTML con duraciones en segundos, curvas (eases) y líneas de tiempo.

**Qué vas a hacer**
1. Prueba entrada, cámara (zoom y paneo), curvas y tifo (cartulinas con `stagger`).
2. Cambia una `duration` o un `ease` (`power2.out`, `back.out(2)`, `elastic.out`) y compara.

**Qué vas a ver:** el mismo movimiento con distinto «peso». GSAP es gratis desde 2025, también para trabajos comerciales.

**Si falla:** revisa que cada `gsap.to` cierre su llave y su paréntesis; el error sale en rojo.

## 7. HyperFrames: de HTML a video · Conceptos

En una frase: HyperFrames abre tu página en Chrome sin pantalla, mueve la línea de tiempo cuadro a cuadro y FFmpeg une las fotos en un MP4.

**Qué vas a hacer**
1. Arrastra el tiempo de la escena: la línea de tiempo está **pausada** y salta a cualquier segundo.
2. Pulsa **Renderizar como HyperFrames** a 12, 24, 30 y 60 fps y mira cuántos cuadros salen.
3. Copia la plantilla `index.html` y, con tu imagen en `assets/base.webp`, prueba en tu máquina:
   ```bash
   npx hyperframes init mi-video && cd mi-video
   npx hyperframes preview
   npx hyperframes check && npx hyperframes render -o renders/mi-pieza.mp4
   ```

**Qué vas a ver:** el contador de cuadros. Las reglas: `class="clip"` con `data-start` y `data-duration`, una línea de tiempo GSAP pausada en `window.__timelines`, nada de `Math.random()` sin semilla ni `Date.now()`.

**Si falla:** el render necesita Node 22 y FFmpeg; si no los tienes, queda para la sesión 3, donde lo usamos a fondo.

## 8. Referencia: Willie (1928) · Reflexión

En una frase: Willie se filmó a 24 fps con dibujos «en dos» (12 por segundo); hoy lo miramos como referencia, no lo construimos.

**Qué vas a hacer**
1. Mira la pelota «en unos» y «en dos» en la escena.
2. Abre de Materiales la pieza «Willie, difícil de explicar» y compárala con tu imagen base en movimiento: ¿qué hace el dibujo a mano que tu código no?

**Qué vas a ver:** el mismo salto con dos texturas de movimiento.

## 9. Tu pieza en seis partes · Aplicación

En una frase: le pides tu pieza a tu agente con rol, contexto, tarea, límites, formato y comprobación.

**Qué vas a hacer**
1. En la escena «Tu pieza», escribe tu idea en una frase y elige herramienta (p5, Three.js, GSAP o HyperFrames), movimientos, fps, ciclo y formato.
2. Copia el pedido y pégalo en tu agente, en la carpeta `mi-pieza/` con `assets/base.webp`.
3. Si algo sale mal, haz un segundo pedido con **el lugar**, **el cambio** y «no toques nada más».

**Qué vas a ver:** tu `index.html` con tu imagen base en movimiento.

**Si falla:** pega el error exacto en el segundo pedido; no pidas «arréglalo» a secas.
