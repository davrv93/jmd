---
name: animacion-abierta
description: Construir piezas animadas y video con herramientas abiertas y gratuitas (HTML, CSS, SVG, JavaScript, Playwright y FFmpeg; GSAP y Three.js si hace falta), con cinemática, cámara, profundidad y principios de animación, en el estilo «Difícil de explicar». Úsala cuando el usuario pida una animación, un video, un flyer animado, un estado de WhatsApp, una intro, o diga "anímalo", "haz que se mueva", "render a MP4", "estilo difícil de explicar", "Willie" o "Steamboat Willie". No usa Sora, Seedance ni otros generadores cerrados.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Animación abierta: la pieza como línea de tiempo

## Cuándo usar

Cuando haya que producir algo que se mueve y que se pueda renderizar a video: una pieza de 15 a
40 s, un flyer animado, un estado vertical, la intro de una landing. La pieza se escribe en HTML
con un solo reloj, se revisa en el navegador y se exporta a MP4 con Playwright y FFmpeg. Todo es
abierto: se puede abrir, leer, copiar, corregir y volver a renderizar con el mismo resultado.

## Por qué no un generador cerrado (Sora, Seedance y parecidos)

No es que sean malos. Es que no sirven para aprender ni para producir con control:

0. **Pueden desaparecer.** OpenAI anunció el 24 de marzo de 2026 que discontinuaba Sora: la app se
   apagó el 26 de abril y la API el 24 de septiembre de 2026, sin sucesor. Seedance 2.0 recibió en
   febrero de 2026 cartas de cese de Disney y de la MPA y cambió sus filtros en marzo. Lo que
   construyes sobre un servicio cerrado hereda su calendario.
1. **No se puede abrir.** Pesos cerrados: no corre en tu máquina, no se ajusta a tu estilo, no se
   audita. Con HTML abres el archivo y ves por qué una escena entra en el segundo 16.
2. **No se repite.** El mismo pedido da otro video. Aquí el cuadro 210 es siempre el mismo cuadro.
3. **La política cambia sin aviso.** Qué personajes, qué estilos y qué países se permiten lo decide
   la empresa cada mes. Steamboat Willie es de dominio público y aun así puede ser bloqueado.
4. **Cuesta por segundo y pide tarjeta.** Para un aula de 30 personas no escala. Un HTML renderiza
   gratis en cualquier laptop.
5. **No enseña el principio.** Si el modelo hace el paneo, nadie aprende qué es un paneo. Aquí el
   paneo es una línea: `transform: translateX(...)` sobre el mundo.

Si el usuario insiste en un generador, se usa para **texturas o fondos sueltos**, nunca para la
pieza entera, y se dice qué parte vino de ahí.

## El modelo mental: escena, reloj, render

- **Escena**: `<section class="clip" data-start="16" data-duration="4">`. Fuera de su ventana no se
  ve. Dentro, recibe `--p` (progreso 0 a 1) y `--pe` (progreso con ease-in-out).
- **Reloj**: un solo `t` en segundos. `requestAnimationFrame` lo avanza; `?t=7` lo fija y pausa.
  Nada usa `animation:` de CSS con su propio tiempo, salvo lo decorativo que no entra al render.
- **Pulso**: 120 bpm. Compás = 2 s, negra = 0,5 s, corchea = 0,25 s. Todo corte cae en la rejilla y
  ninguno dura menos de 0,25 s.
- **Render**: Playwright abre `index.html?t=` para cada cuadro (30 fps) y saca una captura; FFmpeg
  las une en MP4 (`libx264`, `yuv420p`). La versión vertical 1080 × 1920 y el flyer 1080 × 1350
  salen de la misma pieza cambiando el viewport.

## Estilo «Difícil de explicar»

Tokens: fondo tinta `#14122b`; seis pasteles de brillo parejo `#F4C2CF` rosa, `#F7D1A6` melocotón,
`#EFE6A4` limón, `#BDE6CC` menta, `#BDD7F3` cielo, `#D6C5F0` lila; hueso `#FBF7F0`. Las figuras
son **siluetas en bits**: una rejilla de píxeles convertida en un solo trazo SVG
(`shape-rendering: crispEdges`). La misma silueta acepta cuatro tratamientos sin redibujarla:
plano (relleno), puntos (un círculo por píxel), 1 bit (negro sobre hueso) y moneda (relleno con
borde del pastel vecino). Texto cinético: las palabras entran al pulso; un título en collage cae
letra a letra. Viene de la estética del video «Hard to Explain» de The Strokes (2001, Roman Coppola
y Johannes Gamble): collage de metraje encontrado, cortes al ritmo, repetición, actuación impasible
y color plano. Nosotros no usamos metraje ajeno: cada figura se dibuja con código.

## Cinemática en 2D, traducida a código

| Concepto | Qué es | En la pieza |
|---|---|---|
| Plano general · medio · primer plano | Cuánto del sujeto entra en cuadro | `scale(1)`, `scale(1.8)`, `scale(3.2)` sobre el mundo |
| Paneo (pan) | La cámara gira en horizontal | `translateX` del mundo, en sentido contrario al que mira |
| Tilt | Gira en vertical | `translateY` del mundo |
| Travelling (dolly) vs zoom | Mover la cámara vs cambiar la lente | travelling: cambia el paralaje; zoom: solo `scale` |
| Profundidad (multiplano, 1937) | Capas a distinta distancia a distinta velocidad | 3 capas: fondo ×0,2, medio ×0,6, frente ×1,2 |
| Perspectiva | Tarjetas que se inclinan | `perspective: 900px; rotateY(...)` |
| Corte en acción | Cambiar de plano en medio de un movimiento | el corte cae en la negra donde el salto está arriba |
| Efecto Kuleshov | Dos planos seguidos crean un sentido nuevo | Willie quieto + «¿Difícil?» → la cara «pregunta» |

## Principios de animación que sí usamos (Thomas y Johnston, 1981)

1. **Aplastar y estirar**: `scale(1.15, .85)` al tocar el suelo, `scale(.9, 1.1)` en el aire.
2. **Anticipación**: antes de saltar, se agacha una corchea.
3. **Timing**: cuántos cuadros dura cada cosa; aquí lo dicta el pulso.
4. **Entradas y salidas suaves**: `--pe` con ease-in-out; lo mecánico va lineal a propósito.
5. **Arcos**: el salto es una parábola, no una línea.
6. **Acción secundaria**: el timón gira mientras Willie se balancea.
7. **Exageración**: el salto es más alto de lo posible.
8. **Puesta en escena**: un punto focal por escena; el texto nunca compite con la figura.

## Reglas de diseño en movimiento

- El movimiento explica; si solo adorna, se quita.
- Un efecto por rol: todos los títulos entran igual en toda la pieza.
- Sin destellos: nunca dos fondos de alto contraste seguidos; ningún corte menor de 0,25 s.
- Contraste AA de cada texto sobre su fondo (tinta sobre pastel, hueso sobre tinta).
- `prefers-reduced-motion: reduce` → se muestra el storyboard: cada escena como cuadro quieto.
- Sin CDN, fuentes remotas ni imágenes externas: la pieza se abre sin internet.

## Steamboat Willie: qué se puede usar

El corto de 1928 está en dominio público en Estados Unidos desde el 1 de enero de 2024. En Perú,
la obra audiovisual tiene 70 años desde su publicación (Decreto Legislativo 822), así que también.
Se usa **solo el diseño de 1928**: gorra de marinero, sin guantes, ojos de pastel, blanco y negro,
cuerpo de manguera. No se usan los guantes blancos (1929), el color, las pupilas ni el Mickey
moderno, que siguen protegidos. El nombre «Mickey Mouse» es marca registrada: la pieza lo llama
**Willie** y no se usa como logo ni para vender un producto propio. Si hay duda, se consulta a un
abogado o a INDECOPI antes de usarlo con fines comerciales.

## Procedimiento

1. Pide el brief en una frase y el storyboard en una tabla: escena, inicio, duración, qué pasa.
   Si el usuario no lo tiene, propón uno de 6 a 10 escenas sobre la rejilla del pulso.
2. Escribe `index.html` con el reloj, las escenas y los tokens. Las figuras entran como `<svg>`
   inline con un solo `<path>` por capa.
3. Abre la pieza con `?t=` en tres instantes (inicio, mitad y final de la escena más larga) y
   describe qué se ve en cada uno.
4. Revisa: cortes en la rejilla, ninguno menor de 0,25 s, contraste, reducir movimiento, duración
   total exacta.
5. Si se pide MP4: `node render.mjs index.html salida.mp4` (Playwright + FFmpeg). Para el
   vertical: `--ancho 1080 --alto 1920`.
6. Informa: archivos creados, duración, cuántas escenas y qué comprobación pasó o falló.

## Herramientas abiertas que conviene conocer

- Crear: Krita (con el plugin AI Diffusion si hay GPU), Blender y Grease Pencil, Pencil2D,
  OpenToonz, Inkscape, PinePaper (MCP) para collage vectorial.
- Mover: CSS y la Web Animations API, GSAP (gratis desde 2025), anime.js, Three.js para 3D,
  p5.js para generativo.
- Generar: ComfyUI con modelos de pesos abiertos (Wan, LTX-Video, HunyuanVideo, FLUX) en tu GPU o
  en capas gratuitas (Hugging Face Spaces con ZeroGPU, Google Colab, Kaggle).
- Editar y renderizar: FFmpeg, Playwright, Kdenlive, Shotcut.
- Publicar: GitHub Pages, Cloudflare Pages, Netlify.

## Versión corta (modelos pequeños)

```text
Pieza HTML con un reloj: cada escena <section class="clip" data-start data-duration>; ?t= fija y
pausa. 120 bpm, cortes en múltiplos de 0,25 s, sin destellos. Fondo #14122b y seis pasteles.
Silueta: willie.svg inline, no redibujar. Cámara = transform del mundo. Profundidad = 3 capas a
distinta velocidad. Salto con aplastar y estirar y anticipación. Reducir movimiento → storyboard.
Sin CDN. Al final: archivos creados y comprobación.
```
