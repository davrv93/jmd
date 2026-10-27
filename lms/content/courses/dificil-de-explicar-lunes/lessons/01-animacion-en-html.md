---
id: dl-01
starts_at: 2026-10-26T21:15:00-05:00
title: "Sesión 1 · Mickey en HTML y el generador de imágenes FLUX"
published: true
objectives:
  - id: dl-01-o1
    title: Leer un dibujo animado como una hoja de tiempos (dibujos, cuadros y audio) y una pila de capas de tono
  - id: dl-01-o2
    title: Cambiar el color, el movimiento y la profundidad de una animación con CSS, JavaScript y three.js
  - id: dl-01-o3
    title: Dibujar un personaje con las reglas de estilo de 1928 y meterlo en la escena
  - id: dl-01-o4
    title: Hacer que una página reaccione a la animación (notas, agua, avisos)
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: dl-01-kit
    title: Kit Steamboat Willie (en línea, con los cinco ejemplos)
    kind: link
    url: https://jmd-learn.online/steamboat/
    objective_ids: [dl-01-o1, dl-01-o2, dl-01-o3, dl-01-o4]
  - id: dl-01-zip
    title: El kit para descargar (kit.zip, 5 MB)
    kind: link
    url: https://jmd-learn.online/steamboat/kit.zip
    objective_ids: [dl-01-o2, dl-01-o3, dl-01-o4]
  - id: dl-01-leeme
    title: LEEME del kit · la API de kit.js y los ejercicios
    kind: doc
    url: https://jmd-learn.online/steamboat/LEEME.md
    objective_ids: [dl-01-o2]
  - id: dl-01-three
    title: Three.js · documentación
    kind: doc
    url: https://threejs.org/docs/
    objective_ids: [dl-01-o2]
  - id: dl-01-temario
    title: Programa del taller (PDF, v2)
    kind: pdf
    file: materials/temario-dificil-de-explicar-v2.pdf
    objective_ids: [dl-01-o1]
cycle:
  - id: ver
    title: Ver el remaster en pantalla
    tool: zoom
    phase: experiencia
    description: El silbido de Mickey (1928) corriendo en HTML, cambiando de paleta. Trae tu aula abierta.
    check: Has visto la clase completa (o la grabación)
  - id: abrir
    title: Qué hay dentro del kit
    tool: lms
    phase: experiencia
    description: 192 dibujos en SVG con cinco capas de tono, el barco, el cielo, el audio y escena.json.
    check: Sabes decir qué capa es la tinta y cuál el blanco
  - id: desarmar
    title: La hoja de tiempos
    tool: lms
    phase: reflexion
    description: "311 cuadros, 192 dibujos: a uno, a dos y a tres. Por qué el audio lleva el reloj."
    check: Explicas con tus palabras qué es animar «a dos»
  - id: kit
    title: Abrir el kit en tu aula
    tool: jmd
    phase: experiencia
    description: Descarga kit.zip en /trabajo/steamboat y ábrelo en el Visor.
    check: index.html del kit abre en el Visor y Mickey se mueve
  - id: colores
    title: Tu paleta
    tool: jmd
    phase: experimentacion
    description: Cinco variables CSS. Añade tu paleta a PALETAS en 01-colores.html.
    check: Mickey se ve con tus colores
  - id: notas
    title: Tus notas
    tool: jmd
    phase: experimentacion
    description: alNota() avisa en cada nota del silbido. Cambia el símbolo, el color o la animación en 02-notas.html.
    check: Las notas salen de la boca con tu cambio
  - id: three
    title: Tres planos en three.js
    tool: lms
    phase: conceptualizacion
    description: Cielo, barco y Mickey a distinta profundidad; el dibujo como textura; las notas como sprites.
    check: Identificas en 03-three.html la línea que fija la profundidad de cada plano
  - id: personaje
    title: Un personaje tuyo (opcional)
    tool: jmd
    phase: experimentacion
    description: "En tu copia del kit (04-personaje.html): pega tu SVG y dale un vuelo."
    check: Tu personaje aparece en la escena y sigue la paleta
  - id: agua
    title: Agua en el bote
    tool: jmd
    phase: experimentacion
    description: Gotas que tocan a Mickey, agua que entra al bote y una página que reacciona.
    check: Cambiaste una regla del agua y se nota
  - id: flux
    title: Tu imagen con FLUX
    tool: jmd
    phase: experimentacion
    description: Escribe un prompt en la escena, elige estilo y encuadre, copia el comando y genera la imagen en tu aula (tope 20 por persona).
    check: Tu imagen abre en el Visor
  - id: tu-pieza
    title: Tu pieza y la entrega
    tool: lms
    phase: experimentacion
    description: Dos de los cinco ejemplos, cambiados por ti, con captura. Tarea 3.
    check: Carpeta steamboat con tus dos HTML y dos capturas
  - id: landing
    title: Landing con estilo
    tool: jmd
    phase: experimentacion
    description: Pega el texto de un cliente, elige uno de los 8 diseños desde la escena (Apple, Huawei, nova 5T, Express, Inmersivo, iPad, Difícil de explicar, Atardecer Neón) y el motor arma la landing sin IA.
    check: Tu landing abre en el Visor en el estilo que elegiste
  - id: cierre
    title: Cierre del taller
    tool: zoom
    phase: reflexion
    description: Tres sesiones, un proyecto.
    check: Has visto el cierre
---

## Avance de la clase

Un dibujo animado de 1928 corre dentro de una página web: los 192 dibujos del silbido de
Mickey, en SVG, con el barco, el cielo y el audio original. Lo abres, lo recoloreas, le pones
notas, lo llevas a 3D, le sumas un personaje tuyo y le metes agua al bote. Todo con HTML, CSS y
JavaScript, y con el agente JMD al lado para lo que no sepas escribir.

Clase en vivo: lunes 26-10-2026, 9:15 a 10:45 pm. Kit: <https://jmd-learn.online/steamboat/>.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Ver | El remaster en pantalla, cambiando de paleta | — |
| 2 · Dentro | Capas de tono, fondo, audio, `escena.json` | Dices qué capa es la tinta |
| 3 · Tiempos | Dibujos a uno, a dos y a tres | Explicas «a dos» |
| 4 · Kit | `kit.zip` en `/trabajo/steamboat` | Abre en el Visor |
| 5 · Colores | Tu paleta en `01-colores.html` | Mickey con tus colores |
| 6 · Notas | Tu símbolo o animación en `02-notas.html` | Salen de la boca |
| 7 · 3D | Tres planos en `03-three.html` | Ubicas la `z` de cada plano |
| 8 · Personaje | Tu SVG en `04-personaje.html` | Aparece y sigue la paleta |
| 9 · Agua | Tu regla en `05-agua.html` | Se nota el cambio |
| · Prompts | Pedidos en vivo en las escenas 5, 6 y 9 | Tres pedidos aplicados y uno copiado al agente |
| 10 · FLUX | Tu prompt, tu estilo, tu imagen | Abre en el Visor |
| 11 · Pieza | Dos ejemplos tuyos + capturas | Tarea 1 |

## 1. Qué hay dentro · Experiencia

Cada dibujo (`celdas/c000.svg` … `c191.svg`) tiene cinco capas apiladas de clara a oscura:
`t4` blanco, `t3`, `t2`, `t1` grises y `t0` tinta. Su color es una variable CSS (`--t0` … `--t4`).
El fondo son dos imágenes (`placa.webp`, el barco con la ventana transparente; `panorama.jpg`, el
cielo que pasa). `datos/escena.json` dice qué dibujo va en cada uno de los 311 cuadros, cuánto se
mueve el cielo, el vaivén de cámara, dónde está la boca de Mickey y las 52 notas del silbido.

## 2. La hoja de tiempos · Reflexión

El film corre a 24 cuadros por segundo, pero hay 192 dibujos para 311 cuadros: 105 duran dos
cuadros, 80 duran uno (cuando el movimiento es rápido) y 7 duran tres. A eso se le llama animar
«a dos». En el kit el reloj es el audio: el cuadro que se ve sale del segundo del silbido, así la
imagen y el sonido no se separan.

## 3. Abrir el kit · Experiencia

En la terminal del aula:

```bash
cd /trabajo && curl -sLo kit.zip https://jmd-learn.online/steamboat/kit.zip
unzip -oq kit.zip -d steamboat && ls steamboat
```

Abre `/trabajo/steamboat/index.html` en el Visor. Cada ejemplo es un HTML de 60 a 150 líneas:
léelo entero, cambia una cosa, recarga, mira.

**Si falla:** el Visor no carga los dibujos → abre la copia pública en
<https://jmd-learn.online/steamboat/> y edita en tu carpeta.

## 3b. La mesa de prompts del LIVE · Aplicación

En las escenas de colores, notas, personaje y agua hay un cuadro: escribe en tus palabras lo que quieres («gorro azul y zapatos dorados», «que las notas sean corazones más grandes», «que el pájaro se pose en el gorro», «mucha lluvia») y pulsa Enter. Un intérprete local lo aplica al instante, sin cuota ni modelo. Debajo hay sugerencias: tócalas para probarlas y verás cómo cambian según lo que escribes.

Lo que la escena no sabe hacer, se lo pides al agente: el botón **Copiar para el agente** arma tu pedido en seis partes; pégalo en la terminal del aula con `jmd chat`. Así practicas las dos cosas: cambiar en vivo y pedir bien.

## 3c. FLUX: la receta del prompt · Aplicación

En la escena **E11** aprendes a pedir una imagen con método, en español y de cualquier cosa (un personaje, un objeto, una escena):

1. **La base: la receta de cuatro partes.** *Quién o qué* (el sujeto), *qué hace* (la acción), *dónde* (lugar y hora) y *cómo se ve* (el estilo: dibujo de 1928, color plano, acuarela, pixel art, línea clara o foto). Lo que no dices, el modelo lo inventa. Concreto y corto: «un gato naranja con sombrero rojo», no «un gato bonito». Hay ejemplos listos para cargar y cambiar.
2. **Una variación.** Primero generas la base tal cual. Después cambias **una sola parte**: el personaje, la acción, el lugar, o añades un objeto («con un ukelele»). Una por vez, o no se puede comparar.
3. **El color.** Blanco y negro, color plano, pastel, neón, sepia, cálido, frío; o el que decide el estilo.
4. **Generar y comparar.** El botón **Generar aquí** manda el prompt desde la misma escena (sin terminal) y en unos segundos aparecen la base y la variación **lado a lado**: ¿cambió solo lo que pedí? Para guardar una imagen: clic derecho → «Guardar imagen». Si prefieres la terminal, el mismo pedido está plegado como comando.

El prompt completo aparece a la derecha con cada parte en un color. Reglas que se repiten en clase: una cosa por vez; concreto gana; nada de texto dentro de la imagen (FLUX escribe mal las letras; el texto va en el HTML); si sale raro, quita una palabra en vez de agregar tres. En español funciona; si una palabra no la entiende, se prueba en inglés. Tope: **20 imágenes por persona** al día; la escena lleva la cuenta.

## 4. Los siete ejemplos · Aplicación

| Ejemplo | Qué tocas | La API que usa |
|---|---|---|
| `01-colores.html` | Tu paleta en `PALETAS`, o `#escena { --t4: gold }` | `s.colores({...})` |
| `02-notas.html` | Símbolos, color por tono (`n.hz`), `@keyframes subir` | `s.alNota(n => …)`, `s.aPantalla(n.boca)` |
| `03-three.html` | La `z` de cada plano, la cámara, un objeto 3D | `s.celdaSVG(k)` como textura |
| `04-personaje.html` | Tu SVG con `estilo1928()`, otro vuelo en `VUELOS` | `s.agregarPersonaje({...})`, `s.datos.cajas[celda]` |
| `05-agua.html` | `CUBIERTA`, el tope, qué pasa al 80 % | `s.toca([x, y])`, `s.capa` |
| `06-volumen.html` | Una pose en `volumen/escena.js`; la cámara | `crearVisor()`, `renderSVG()` |
| `07-webgl.html` | La luz en el *fragment shader* de `volumen/webgl.js` | `crearVisorWebGL()` |

Reglas del estilo de 1928 para tu personaje: formas redondas, tinta gruesa y uniforme, ojos
grandes con pupila, brazos y piernas de manguera (sin codos ni rodillas), manos con cuatro dedos.
Sin degradados ni sombras. Rellenos en negro, blanco y grises: `estilo1928()` los convierte en las
clases `t0…t4`, y tu personaje sigue la paleta de Mickey.

## Palabras de hoy · Conceptos

Hoja de tiempos · «A dos» · Capa de tono · Variable CSS · Silueta (`toca`) · Textura · Plano y
profundidad · Sprite · Personaje de manguera.

## Tareas · Aplicación

- Tarea 1: dos de los cinco ejemplos, cambiados por ti (uno visual y uno que reaccione), con una
  captura de cada uno.
- Entrega la carpeta `steamboat` con tus dos HTML y las capturas desde la tarea 1 del LMS, antes
  del lunes 2-11-2026.
