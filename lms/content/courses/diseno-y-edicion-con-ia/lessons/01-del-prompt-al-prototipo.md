---
id: de-01
starts_at: 2026-10-22T21:15:00-05:00
title: "Sesión 1 · Del prompt al prototipo: tu primera pieza animada con IA abierta"
published: true
objectives:
  - id: de-01-o1
    title: Escribir un pedido a la IA con sus seis partes y corregirlo con un segundo pedido preciso
  - id: de-01-o2
    title: Entender por qué trabajamos con herramientas abiertas y capas gratuitas, y no con Sora ni Seedance
  - id: de-01-o3
    title: Nombrar cámara, profundidad, estilo y principios de animación en una pieza y pedirlos con palabras
  - id: de-01-o4
    title: Construir con tu agente la pieza «Willie, difícil de explicar» y empezar la tuya
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: de-01-diapositivas
    title: Diapositivas de la sesión 1
    kind: slides
    file: materials/clase-01-diapositivas.pptx
    slides_dir: materials/clase-01-diapositivas
    objective_ids: [de-01-o1, de-01-o2, de-01-o3, de-01-o4]
  - id: de-01-temario
    title: Programa del taller (PDF, v2)
    kind: pdf
    file: materials/temario-dificil-de-explicar-v2.pdf
    objective_ids: [de-01-o1, de-01-o2, de-01-o3, de-01-o4]
  - id: de-01-willie
    title: "Pieza «Willie, difícil de explicar» (HTML, ábrela en el navegador; ?t=7 la deja quieta)"
    kind: zip
    file: materials/willie/index.html
    objective_ids: [de-01-o3, de-01-o4]
  - id: de-01-prompt
    title: Prompt para ejecutar (seis partes)
    kind: doc
    file: materials/willie/PROMPT.md
    objective_ids: [de-01-o1, de-01-o4]
  - id: de-01-svg
    title: willie.svg · la silueta en bits (cópiala junto al prompt)
    kind: zip
    file: materials/willie/willie.svg
    objective_ids: [de-01-o4]
  - id: de-01-render
    title: render.mjs · exportar a MP4 con Playwright y FFmpeg
    kind: zip
    file: materials/willie/render.mjs
    objective_ids: [de-01-o4]
  - id: de-01-skills
    title: skills-dificil.zip · las dos skills del taller e instalar.sh
    kind: zip
    file: materials/skills-dificil.zip
    objective_ids: [de-01-o1, de-01-o3]
  - id: de-01-m1
    title: Steamboat Willie (1928) en Wikimedia Commons, copia completa en dominio público
    kind: link
    url: https://commons.wikimedia.org/wiki/File:Steamboat_Willie_(1928)_by_Walt_Disney_and_Ub_Iwerks.webm
    objective_ids: [de-01-o2]
  - id: de-01-m2
    title: Public Domain Day 2024 (Duke) · qué entró en dominio público y qué no
    kind: doc
    url: https://web.law.duke.edu/cspd/publicdomainday/2024/
    objective_ids: [de-01-o2]
  - id: de-01-m3
    title: Aviso de OpenAI sobre el cierre de Sora
    kind: doc
    url: https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation
    objective_ids: [de-01-o2]
  - id: de-01-m4
    title: Hollywood Reporter · la carta de cese de la MPA a ByteDance por Seedance 2.0
    kind: link
    url: https://www.hollywoodreporter.com/business/business-news/mpa-cease-and-desist-bytedance-seedance-2-0-1236510957/
    objective_ids: [de-01-o2]
  - id: de-01-m5
    title: Los 12 principios de la animación (Thomas y Johnston)
    kind: doc
    url: https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
    objective_ids: [de-01-o3]
  - id: de-01-m6
    title: La cámara multiplano (Disney, 1937) · de dónde sale la profundidad por capas
    kind: doc
    url: https://en.wikipedia.org/wiki/Multiplane_camera
    objective_ids: [de-01-o3]
  - id: de-01-m7
    title: easings.net · catálogo visual de curvas de entrada y salida
    kind: link
    url: https://easings.net
    objective_ids: [de-01-o3]
  - id: de-01-m8
    title: GSAP · documentación de eases
    kind: doc
    url: https://gsap.com/docs/v3/Eases/
    objective_ids: [de-01-o3]
  - id: de-01-m9
    title: Wan 2.2 en Hugging Face (modelo de video de pesos abiertos, Apache 2.0)
    kind: link
    url: https://huggingface.co/Wan-AI
    objective_ids: [de-01-o2]
  - id: de-01-m10
    title: LTX-2 (Lightricks) · video con audio, pesos abiertos
    kind: link
    url: https://huggingface.co/Lightricks/LTX-2
    objective_ids: [de-01-o2]
  - id: de-01-m11
    title: ComfyUI · el editor de nodos para correr modelos abiertos
    kind: repo
    url: https://github.com/comfyanonymous/ComfyUI
    objective_ids: [de-01-o2]
  - id: de-01-m12
    title: Hugging Face Spaces con ZeroGPU · GPU gratis por minutos
    kind: doc
    url: https://huggingface.co/docs/hub/en/spaces-zerogpu
    objective_ids: [de-01-o2]
  - id: de-01-m13
    title: Kaggle · 30 horas de GPU por semana sin tarjeta
    kind: doc
    url: https://www.kaggle.com/page/GPU-tips-and-tricks
    objective_ids: [de-01-o2]
  - id: de-01-m14
    title: Blender MCP · tu agente controla Blender
    kind: repo
    url: https://github.com/ahujasid/blender-mcp
    objective_ids: [de-01-o3]
  - id: de-01-m15
    title: Skills oficiales de Anthropic (pptx, canvas-design, frontend-design y más)
    kind: repo
    url: https://github.com/anthropics/skills
    objective_ids: [de-01-o1]
cycle:
  - id: ver
    title: Ver la pieza y la clase
    tool: zoom
    phase: experiencia
    description: Mira «Willie, difícil de explicar» en pantalla y la clase en vivo o en la grabación. Ten abierta una carpeta vacía en VS Code y tu agente listo.
    check: Has visto la clase completa (o la grabación)
  - id: skills
    title: Instalar las dos skills
    tool: jmd
    phase: experiencia
    description: Descarga skills-dificil.zip, descomprímelo y corre el instalador. Copia pedido-seis-partes y animacion-abierta a tu agente.
    check: "jmd skills lista pedido-seis-partes y animacion-abierta"
  - id: pedido
    title: Escribir tu pedido en seis partes
    tool: jmd
    phase: conceptualizacion
    description: Toma el pedido vago de tu pieza y conviértelo en uno con rol, contexto, tarea, límites, formato y comprobación.
    check: Tu pedido tiene las seis etiquetas y una comprobación ejecutable
  - id: construir
    title: Construir Willie
    tool: jmd
    phase: experiencia
    description: Pega el prompt del taller junto a willie.svg y deja que el agente escriba willie/index.html. Ábrelo en el navegador.
    check: "willie/index.html?t=7 muestra el paneo quieto a mitad"
  - id: revisar
    title: Revisar y corregir
    tool: vscode
    phase: reflexion
    description: Compara lo pedido con lo obtenido escena por escena. Escribe un segundo pedido con el lugar, el cambio y «no toques nada más».
    check: Captura antes y después del segundo pedido
  - id: principios
    title: Nombrar tres principios
    tool: lms
    phase: conceptualizacion
    description: En el hilo de la sesión, nombra tres cosas que viste en la pieza (un plano, un movimiento de cámara, un principio de animación) y en qué segundo pasan.
    check: Tu pregunta o respuesta aparece en el hilo de la sesión
  - id: aplicar
    title: Empezar tu pieza
    tool: jmd
    phase: experimentacion
    description: Escribe el mensaje de tu pieza en una frase, un storyboard de cuatro escenas y pídesela al agente con las seis partes.
    check: Tu index.html con 4 escenas reproduce de principio a fin
  - id: entregar
    title: Entregar la tarea 1
    tool: git
    phase: experimentacion
    description: Sube el repositorio sesion-01 con willie/, mi-pieza/, FICHA_PROMPTS.md y capturas/, y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas»
---

## Avance de la clase

Hoy aprendes a pedirle bien a un agente de IA y lo compruebas con una pieza que se mueve.
El hilo de la clase es «Willie, difícil de explicar»: 20 segundos con Willie (el Mickey de 1928,
en dominio público) al timón, cortes al pulso de 120 bpm y la silueta dibujada en bits.
Está hecha solo con HTML, CSS, SVG y JavaScript: se abre sin internet y se exporta a MP4 con
herramientas abiertas. Tú le das al agente un pedido de seis partes y dos skills; él escribe el
código. Al final tienes la pieza del taller corriendo en tu navegador, tu propia pieza empezada y
una ficha con los pedidos que mejor funcionaron.

### El ciclo de esta clase

Esta sesión se recorre con el **ciclo de aprendizaje**. Las secciones no van en el orden de las
fases: la clase alterna ver, entender y construir. El título de cada sección lleva su fase al final.

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | Secciones 0, 1, 5 y 6: preparas la carpeta, ves la pieza, instalas las skills y construyes Willie. |
| **2 · Reflexión** | Sección 7: comparas lo pedido con lo obtenido y corriges con un segundo pedido. |
| **3 · Conceptos** | Secciones 2, 3 y 4: por qué abierto, cámara y principios, el pedido en seis partes. |
| **4 · Aplicación** | Sección 8 y «Tareas»: empiezas tu pieza y entregas el repositorio `sesion-01`. |

### Bloques de la clase (75 minutos)

- 0:00 a 0:05 · Ver la pieza y qué se entrega hoy (sección 1).
- 0:05 a 0:12 · El estilo «Difícil de explicar» y por qué Willie (secciones 1 y 2).
- 0:12 a 0:20 · Por qué abierto y gratuito, y no Sora ni Seedance (sección 2).
- 0:20 a 0:32 · Cámara, profundidad y principios de animación (sección 3).
- 0:32 a 0:42 · El pedido en seis partes (sección 4).
- 0:42 a 0:50 · Skills y herramientas: instalar (sección 5).
- 0:50 a 1:06 · Construir Willie y empezar tu pieza (secciones 6 y 8).
- 1:06 a 1:11 · Revisar y corregir (sección 7).
- 1:11 a 1:15 · Cierre, entregable y «Lo logré».

## 0. Antes de la clase · Experiencia

En una frase: dejas lista una carpeta vacía y un agente que responde, para no perder los primeros
minutos instalando.

**Qué vas a hacer**
1. Entra a jmd-learn.online con tu cuenta y abre esta sesión. Si no tienes cuenta, pide el código
   de invitación al instructor.
2. Crea una carpeta sin espacios, por ejemplo `taller-ia`, y ábrela en VS Code.
3. Comprueba que tu agente responde. En el aula del LIVE ya está JMD; en tu máquina vale
   cualquiera de los tres:
   ```bash
   jmd chat "hola"          # el agente del taller
   claude                   # Claude Code
   opencode                 # OpenCode
   ```
4. Descarga de Materiales `willie.svg` y «Prompt para ejecutar» y guárdalos dentro de la carpeta.

**Qué vas a ver:** La carpeta con dos archivos, `willie.svg` y `PROMPT.md`, y el agente contestando.

**Si falla:** Si ningún agente responde, trabaja en el aula del LIVE: ahí JMD ya está instalado.
Si `jmd` no existe, el instalador está en el README del repositorio del curso.

## 1. La pieza y el estilo · Experiencia

En una frase: ves 20 segundos de video hechos con una página web y un reloj, y los lees como una
línea de tiempo.

Analogía: una pieza animada es un cómic con cronómetro. Cada viñeta entra en su segundo y dura
lo que dura.

El estilo se llama «Difícil de explicar» por el video de **Hard to Explain** de The Strokes
(2001, dirigido por Roman Coppola y Johannes Gamble): un collage de metraje encontrado, cortes al
ritmo, repetición, color plano y una banda que toca sin actuar. Nosotros tomamos el ritmo y el
collage, pero no el metraje ajeno: cada figura se dibuja con código. Las reglas del estilo:

- Fondo tinta `#14122b` y seis pasteles de brillo parejo: rosa, melocotón, limón, menta, cielo y lila.
- Pulso de 120 bpm: un compás son 2 s, una negra 0,5 s y una corchea 0,25 s. Todo corte cae en esa
  rejilla y ninguno dura menos de 0,25 s.
- Siluetas en bits: una rejilla de píxeles convertida en un solo trazo. La misma silueta acepta
  cuatro tratamientos (plano, puntos, 1 bit y moneda) sin redibujarla.
- Texto cinético: las palabras entran al pulso; el título cae letra a letra.

**Qué vas a hacer**
1. Abre «Pieza «Willie, difícil de explicar»» desde Materiales y dale a Reproducir.
2. Vuelve a abrirla con `?t=7` al final de la dirección. Queda quieta a mitad del paneo.
3. Anota en qué segundo cambia de escena. Compara con la rejilla de 0,25 s.

**Qué vas a ver:** Diez escenas en 20 segundos: encendido, título, ráfaga de ocho cortes, plano
general con paneo, profundidad, salto, pregunta, respuesta y créditos.

**Si falla:** Si el navegador no reproduce, revisa que no tengas activado «reducir movimiento» en
el sistema: con esa opción la pieza muestra el storyboard quieto a propósito.

## 2. Por qué Willie y por qué abierto · Conceptos

En una frase: usamos un personaje que podemos usar y herramientas que podemos abrir.

**Willie.** *Steamboat Willie* (1928) entró en dominio público en Estados Unidos el 1 de enero
de 2024. En Perú, el Decreto Legislativo 822 da a la obra audiovisual 70 años desde su
publicación, así que también. Lo que se puede usar es **solo el diseño de 1928**: gorra de
marinero, sin guantes, ojos de pastel, blanco y negro, cuerpo de manguera. Los guantes blancos
(1929), el color, las pupilas y el Mickey moderno siguen protegidos, y «Mickey Mouse» es marca
registrada: por eso la pieza lo llama Willie y no lo usa como logo ni para vender nada.

**Abierto.** No es que Sora o Seedance sean malos. Es que no sirven para aprender ni para producir
con control. Datos verificados por búsqueda web el 22 de octubre de 2026 (pueden cambiar):

| | Sora (OpenAI) | Seedance 2.0 (ByteDance) | Abierto (HTML, Wan 2.2, LTX-2) |
|---|---|---|---|
| ¿Existe hoy? | No. Cierre anunciado el 24-03-2026; la app se apagó el 26-04-2026 y la API el 24-09-2026 | Sí, en CapCut, Dreamina y la API de BytePlus | Sí, y el archivo es tuyo para siempre |
| Qué pasó con los personajes | Política de exclusión en octubre de 2025, cambiada en tres días por las quejas | Cartas de cese de Disney y la MPA en febrero de 2026; filtros y marcas de agua añadidos en marzo | Steamboat Willie se usa porque la ley lo permite, no porque un filtro lo deje |
| Precio | Sora 2 Pro: 0,70 US$ por segundo a 1080p | Unos 0,37 US$ por segundo a 1080p | Un HTML renderiza gratis; Wan 2.2 (Apache 2.0) hace un clip de 5 s a 720p en una GPU de consumo |
| ¿Se repite el resultado? | No: sin semilla, cada pedido daba otro video | No garantizado | Sí: el cuadro 210 es siempre el mismo cuadro |
| ¿Se puede abrir y corregir? | No: pesos cerrados | No: pesos cerrados | Sí: abres el archivo y cambias una línea |
| Para un aula de 30 | Tarjeta de crédito y mayoría de edad | Tarjeta para pasar de la prueba | Hugging Face ZeroGPU: 5 min de GPU al día gratis; Kaggle: 30 h de GPU por semana sin tarjeta |

El argumento que más importa en este taller es el último de la fila «¿se puede abrir?»: si el
modelo hace el paneo, nadie aprende qué es un paneo. Aquí el paneo es una línea de código que
puedes leer.

**Qué vas a hacer**
1. Abre el aviso de OpenAI sobre el cierre de Sora (Materiales) y lee las dos fechas.
2. Abre la copia de *Steamboat Willie* en Wikimedia Commons y mira los primeros 25 segundos:
   Willie al timón, silbando.

**Qué vas a ver:** La fuente original de la silueta que vas a animar y la prueba de que un
servicio cerrado puede desaparecer en siete meses.

**Si falla:** Si una página no abre, el dato está también en las diapositivas con su fecha.

## 3. Cámara, profundidad y principios · Conceptos

En una frase: todo lo que hace una cámara de cine se escribe aquí como una transformación del
«mundo».

Analogía: la cámara no se mueve; movemos el escenario delante de ella, como en un teatro de
sombras.

| Concepto | Qué es | En la pieza |
|---|---|---|
| Plano general · medio · primer plano | Cuánto del sujeto entra en cuadro | `scale(1)`, `scale(1.8)`, `scale(3.2)` sobre el mundo |
| Paneo | La cámara gira en horizontal | `translateX` del mundo, en sentido contrario al que mira |
| Tilt | Gira en vertical | `translateY` del mundo |
| Travelling vs zoom | Mover la cámara vs cambiar la lente | travelling: cambia el paralaje; zoom: solo `scale` |
| Profundidad (multiplano, 1937) | Capas a distinta distancia a distinta velocidad | 3 capas: fondo ×0,2, medio ×0,6, frente ×1,2 |
| Perspectiva | Tarjetas que se inclinan | `perspective: 900px; rotateY(...)` |
| Corte en acción | Cambiar de plano en medio de un movimiento | el corte cae en la negra donde el salto está arriba |
| Efecto Kuleshov | Dos planos seguidos crean un sentido nuevo | Willie quieto + «¿Difícil?» hace que la cara «pregunte» |

De los doce principios de Thomas y Johnston (1981), hoy usamos ocho: aplastar y estirar,
anticipación, timing, entradas y salidas suaves, arcos, acción secundaria, exageración y puesta
en escena. En *Steamboat Willie* ya están casi todos: el balanceo de cadera es un arco, el silbido
mientras gira el timón es acción secundaria y los animales que suenan como instrumentos son
exageración.

Reglas de diseño en movimiento: el movimiento explica y, si solo adorna, se quita; un efecto por
rol; sin destellos; contraste AA de cada texto; con «reducir movimiento» se muestra el storyboard.

**Qué vas a hacer**
1. Vuelve a la pieza y busca el paneo (escena 4), la profundidad (escena 5) y el salto (escena 6).
2. En el hilo de la sesión, escribe tres cosas que viste y en qué segundo pasan. Por ejemplo:
   «6 a 10 s: plano general y paneo; 10 a 13 s: tres capas a distinta velocidad; 14 s: aplastar y
   estirar al caer».

**Qué vas a ver:** Tu mensaje en el hilo y los de tus compañeros. Casi todos nombran el salto; pocos
ven la anticipación justo antes.

**Si falla:** Si no distingues paneo de travelling, mira el fondo: en el paneo todo se mueve igual;
en el travelling las capas cercanas corren más.

## 4. El pedido en seis partes · Conceptos

En una frase: un buen pedido se parece a un buen encargo a una persona.

Analogía: es la orden que dejas en una imprenta: quién eres, para qué es, qué quieres, qué no
toquen, en qué formato lo recoges y cómo sabrán que quedó bien.

| Parte | Responde a | En el pedido de Willie |
|---|---|---|
| 1 · Rol | ¿Quién debe ser el agente? | Animador 2D y desarrollador front-end; solo herramientas abiertas |
| 2 · Contexto | ¿Para quién y en qué situación? | Taller de diseño, público que no programa, visor y teléfono |
| 3 · Tarea | ¿Qué, con un solo verbo? | Crea `willie/index.html`, 20 s con Willie al timón |
| 4 · Límites | ¿Qué no debe hacer ni inventar? | Solo el diseño de 1928; sin CDN; ningún corte menor de 0,25 s |
| 5 · Formato | ¿Cómo lo recibo? | Un HTML; cada escena es una `section` con `data-start` y `data-duration` |
| 6 · Comprobación | ¿Cómo sabremos que está bien? | `?t=7` muestra el paneo quieto a mitad; dura 20,0 s |

Vago: «Hazme una animación bonita de Mickey.» El agente rellena los huecos: colores al azar, un
Mickey moderno que no se puede usar, una librería de internet y una duración cualquiera.

Claro: el prompt completo que tienes en Materiales. Una tarea, seis partes, y una comprobación
que se ejecuta sin opinar.

**Qué vas a hacer**
1. Escribe el pedido vago de tu propia pieza en una línea.
2. Con la skill `pedido-seis-partes`, pídele al agente que lo complete:
   ```text
   Usa la skill pedido-seis-partes. Mi pedido vago es: [tu línea]. Devuélveme el pedido completo
   con las seis partes etiquetadas y deja entre corchetes lo que solo yo sé.
   ```
3. Revisa que la comprobación sea algo que se ve o se ejecuta, no «que funcione».

**Qué vas a ver:** Un bloque con seis etiquetas y uno o dos corchetes con preguntas para ti.

**Si falla:** Si el agente escribe tres tareas, son tres pedidos. Pídele que deje solo la primera.

## 5. Skills y herramientas · Experiencia

En una frase: instalas dos fichas de instrucciones que tu agente lee solo cuando las necesita.

Analogía: una skill es la receta pegada en la pared de la cocina; el cocinero la mira cuando le
toca ese plato.

Las dos de hoy: `pedido-seis-partes` (cómo pedir y cómo corregir) y `animacion-abierta` (la pieza
como línea de tiempo, el estilo, la cámara, los principios y las reglas sobre Willie).

**Qué vas a hacer**
1. Descarga `skills-dificil.zip` de Materiales y descomprímelo dentro de tu carpeta.
2. Corre el instalador:
   ```bash
   bash instalar.sh .          # macOS, Linux y WSL
   ```
   ```powershell
   .\instalar.ps1              # Windows (PowerShell)
   ```
3. Comprueba que tu agente las ve:
   ```bash
   jmd skills
   ```
   En el aula del LIVE las dos ya están cargadas: `jmd skills` las lista.

**Qué vas a ver:** `instalar.sh` termina con «Skills encontrados : 2» y `jmd skills` muestra las
dos. Claude Code y OpenCode leen la misma carpeta `~/.claude/skills/`.

**Si falla:** Si dice 0, estás fuera de la carpeta donde descomprimiste. Entra y repite: no rompe
nada.

Herramientas abiertas que conviene conocer, por familia:

- **Crear:** Krita (con el plugin AI Diffusion si tienes GPU), Blender y Grease Pencil, Pencil2D,
  OpenToonz, Inkscape, PinePaper (MCP) para collage vectorial.
- **Mover:** CSS y la Web Animations API, GSAP (gratis del todo desde 2025), anime.js, Three.js
  para 3D, p5.js para generativo.
- **Generar:** ComfyUI con modelos de pesos abiertos: Wan 2.2 (Apache 2.0), LTX-2, HunyuanVideo,
  FLUX para imágenes.
- **Editar y renderizar:** FFmpeg, Playwright, Kdenlive, Shotcut.
- **Publicar:** GitHub Pages, Cloudflare Pages, Netlify.
- **Skills y MCP para el agente:** las skills oficiales de Anthropic, Blender MCP, servidores MCP de
  ComfyUI y de Hugging Face.

Capas gratuitas para trabajar sin GPU propia (cifras del 22 de octubre de 2026): Hugging Face
Spaces con ZeroGPU, 5 minutos de GPU al día; Kaggle, 30 horas de GPU por semana sin tarjeta;
Google Colab, una T4 por sesión; Cloudflare Workers AI con FLUX schnell para imágenes; GitHub
Pages y Cloudflare Pages para publicar.

## 6. Construir Willie · Experiencia

En una frase: pegas el prompt del taller y el agente escribe la pieza entera.

**Qué vas a hacer**
1. En tu carpeta, con `willie.svg` al lado, abre el agente y escribe:
   ```text
   usa las skills pedido-seis-partes y animacion-abierta
   ```
2. Pega el prompt completo de «Prompt para ejecutar» (Materiales). Confirma los archivos que
   pide escribir.
3. Abre `willie/index.html` en el navegador y dale a Reproducir.
4. Abre `willie/index.html?t=7`.

**Qué vas a ver:** Fondo tinta, el botón Reproducir y 20 segundos de cortes al pulso. Con `?t=7`,
el paneo quieto a mitad de camino. El agente termina diciendo qué archivos creó y qué escena le
costó más.

**Si falla:** Si la pieza usa una librería de internet, el agente se saltó un límite: pídele «sin
CDN ni fuentes remotas; reemplaza la librería por CSS y JavaScript propios». Si redibujó a Willie,
pídele que use `willie.svg` tal cual. Si dura más o menos de 20 s, pídele la suma de los
`data-duration`.

## 7. Revisar y corregir · Reflexión

En una frase: comparas lo pedido con lo obtenido y corriges con palabras exactas.

**Qué vas a hacer**
1. Recorre las diez escenas con `?t=` en el inicio de cada una (0, 2, 4, 6, 10, 13, 16, 18, 19).
2. Toma una captura de la escena que peor salió.
3. Escribe un segundo pedido con el lugar, el cambio y el límite:
   ```text
   En la escena 4, el zoom al plano medio llega tarde: debe terminar en el segundo 9,5, no en el 10.
   Ajusta solo eso y dime qué línea cambiaste.
   ```
4. Toma la captura después.

**Qué vas a ver:** El agente responde con una sola línea cambiada. Las dos capturas van a `capturas/`.

**Si falla:** Si el agente cambió más de lo pedido, pídele que lo deshaga y repita con «no toques
nada más». Nunca «mejóralo».

## 8. Tu pieza · Aplicación

En una frase: el mensaje de tu negocio o de tu idea en una frase, cuatro escenas y un pedido de
seis partes.

**Qué vas a hacer**
1. Escribe el mensaje en una frase y tres imágenes que lo cuenten.
2. Haz el storyboard en una tabla: escena, inicio, duración y qué pasa. Cuatro escenas sobre la
   rejilla de 0,25 s, de 8 a 20 s en total.
3. Pídesela al agente con las seis partes (usa el pedido que completaste en la sección 4) en una
   carpeta `mi-pieza/`.
4. Reprodúcela y guarda tres capturas con `?t=`.

**Qué vas a ver:** `mi-pieza/index.html` reproduce de principio a fin con tu mensaje y tus colores.

**Si falla:** Si no tienes un negocio, anima el nombre del taller o un dato que quieras explicar.
Mejor cuatro escenas bien hechas que diez.

## Tareas

- **Tarea 1 · Tu pieza y tu ficha de prompts.** Repositorio `sesion-01` con `willie/`,
  `mi-pieza/`, `FICHA_PROMPTS.md` y `capturas/`. Vence el miércoles 28 de octubre a las 11:59 p. m.
  Los detalles y la rúbrica están en la tarea.
