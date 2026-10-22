---
id: de-ej-willie
title: "Willie, difícil de explicar: la pieza completa con skills y prompt"
summary: Instalar las dos skills, pegar el prompt de seis partes, ver la pieza, corregirla con un segundo pedido y exportarla a MP4 con herramientas abiertas.
tags: [prompts, skills, animacion, html]
level: básico
lesson: de-01
phase: experimentacion
order: 1
---
El ejemplo práctico de la sesión 1 de principio a fin: un agente (JMD, Claude Code u OpenCode), dos
skills y un pedido de seis partes producen una pieza animada de 20 segundos con Willie (Steamboat
Willie, 1928, dominio público) al timón, en el estilo «Difícil de explicar». Todo con HTML, CSS,
SVG y JavaScript: se abre sin internet y se exporta a MP4 con Playwright y FFmpeg.

## 1. Preparar la carpeta

Descarga de Materiales `willie.svg` (la silueta en bits: no se redibuja) y `skills-dificil.zip`.

```bash
mkdir taller-ia && cd taller-ia
# copia aquí willie.svg y descomprime skills-dificil.zip
bash instalar.sh .          # macOS, Linux y WSL; en Windows: .\instalar.ps1
jmd skills                  # debe listar pedido-seis-partes y animacion-abierta
```

`instalar.sh` copia las dos skills a `~/.claude/skills/` (Claude Code y OpenCode leen esa carpeta)
y a `~/.config/jmd/skills/`, y deja en `prompts/` la versión corta de cada una para modelos
pequeños. Termina con «Skills encontrados : 2».

## 2. Pedir la pieza

Abre el agente en la carpeta y escribe primero:

```text
usa las skills pedido-seis-partes y animacion-abierta
```

Después pega el prompt completo. Son las seis partes: rol, contexto, tarea, límites, formato y
comprobación.

```text
Rol: Eres animador 2D y desarrollador front-end. Trabajas solo con herramientas abiertas: HTML, CSS,
SVG y JavaScript sin librerías. No usas servicios de video por IA ni recursos de internet.

Contexto: Taller «¿Difícil de explicar? ¡No!», sesión 1. El público son diseñadores y emprendedores
que no programan. La pieza se ve en el visor del aula (1920 × 1080) y en un teléfono.

Tarea: Crea willie/index.html, una pieza animada de 20 segundos con Willie (Steamboat Willie, 1928,
dominio público) al timón, en el estilo «Difícil de explicar»: fondo tinta #14122b, seis pasteles de
brillo parejo (#F4C2CF, #F7D1A6, #EFE6A4, #BDE6CC, #BDD7F3, #D6C5F0), cortes al pulso de 120 bpm
(rejilla de 0,25 s) y la silueta en bits que te doy en willie.svg (no la redibujes).

Límites: Solo el diseño de 1928: gorra, sin guantes, ojos de pastel, blanco y negro. Nada de
imágenes externas, fuentes remotas ni CDN. Ningún corte dura menos de 0,25 s. Sin destellos: nunca
dos cambios de fondo de alto contraste seguidos. Todo el movimiento depende de un solo reloj: nada
se anima por su cuenta. Con «reducir movimiento» activo se muestra el storyboard quieto. Texto con
contraste AA sobre su fondo.

Formato: Un solo archivo HTML. Cada escena es <section class="clip" data-start="s" data-duration="s">.
Diez escenas: 1 encendido (0–2 s), 2 título letra a letra (2–4 s), 3 ráfaga de 8 cortes de 0,25 s
con cuatro tratamientos de la silueta (4–6 s), 4 plano general con paneo y zoom a plano medio
(6–10 s), 5 profundidad con tres capas a distinta velocidad (10–13 s), 6 salto con aplastar y
estirar y anticipación (13–16 s), 7 «¿Difícil de explicar?» (16–18 s), 8 «¡No!» (18–19 s),
9 créditos: hecho con HTML, abierto y gratis (19–20 s). Botones: reproducir y pausa; ?t=segundos
salta a ese instante y queda en pausa.

Comprobación: Abro index.html?t=7 y veo el paneo a mitad de camino, quieto. Al reproducir, la pieza
dura 20,0 s y termina en «¡No!» con los créditos. Con prefers-reduced-motion activo nada se mueve.
Al final dime qué archivos creaste y qué escena te costó más.
```

El agente pide confirmación para escribir `willie/index.html` (responde `s`) y termina diciendo
qué creó y qué escena le costó más.

## 3. Qué vas a ver

Abre `willie/index.html` en el navegador: fondo tinta y un botón «Reproducir». Al darle, 20
segundos de cortes al pulso con Willie en bits. Con `willie/index.html?t=7` la página queda quieta
a mitad del paneo de la escena 4. Los instantes de inicio de cada escena son 0, 2, 4, 6, 10, 13,
16, 18 y 19 s: recórrelos con `?t=` para revisar una por una.

Si la pieza cargó una librería de internet, usó un Mickey redibujado o no dura 20 s, el agente se
saltó un límite: díselo con la palabra exacta del límite.

## 4. El segundo pedido

Corregir es señalar el lugar, decir el cambio y acotar:

```text
En la escena 4, el zoom al plano medio llega tarde: debe terminar en el segundo 9,5, no en el 10.
Ajusta solo eso y dime qué línea cambiaste.
```

Nunca «mejóralo». Toma una captura antes y otra después: van en `capturas/` de la tarea 1.

## 5. Exportar a MP4 con herramientas abiertas

`render.mjs` (en Materiales) abre la pieza con Playwright en `?t=` para cada cuadro, saca 600
capturas a 30 fps y las une con FFmpeg. Una sola vez:

```bash
npm i playwright && npx playwright install chromium     # el navegador para las capturas
# FFmpeg: brew install ffmpeg · sudo apt install ffmpeg · winget install ffmpeg
```

Y después:

```bash
node render.mjs willie/index.html salida.mp4                       # 1920 × 1080, 30 fps
node render.mjs willie/index.html estado.mp4 --ancho 1080 --alto 1920   # versión vertical
```

El mismo cuadro da siempre el mismo resultado: el cuadro 210 es el segundo 7,0 exacto.

## 6. Versión corta para DeepSeek u Ollama

Para un modelo pequeño bastan tarea, límites y comprobación; el rol y el contexto van en una línea:

```text
Eres animador 2D; solo HTML, CSS, SVG y JS sin librerías. Taller de diseño, público que no programa.
Tarea: crea willie/index.html, pieza de 20 s con la silueta willie.svg (no la redibujes) al pulso de
120 bpm, fondo #14122b y seis pasteles; cada escena <section class="clip" data-start data-duration>;
?t= fija y pausa. Escenas: encendido, título, ráfaga de 8 cortes, paneo y zoom, 3 capas de
profundidad, salto con aplastar y estirar, pregunta, respuesta, créditos.
Límites: sin CDN, cortes de 0,25 s o más, sin destellos, un solo reloj, reducir movimiento → storyboard.
Comprobación: ?t=7 queda quieto a mitad del paneo; dura 20,0 s; dime qué archivos creaste.
```
