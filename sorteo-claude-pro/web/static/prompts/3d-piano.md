# Prompt: piano con estrellas (canvas 2D + WebAudio)

Copia todo este texto en Claude Code, dentro de una carpeta vacía, y pídele que lo construya.
Es el mismo encargo con el que se hizo la escena «Piano» del curso.

---

Quiero un piano de dos octavas en una sola página web (`index.html` + `piano.js`), sin librerías, que suene
con **WebAudio** (síntesis, sin archivos de audio) y que al tocar cada tecla dispare un estallido de estrellas
sobre un cielo nocturno dibujado en un `canvas` 2D. Debe correr fluido en un teléfono de gama media.

## Teclado

- 15 teclas blancas: de C3 a C5 (C D E F G A B por octava, más el C5 final). Teclas negras en C#, D#, F#, G#, A#
  de cada octava, colocadas a 0,68 del ancho de la blanca anterior y con el 64 % de su ancho.
- Frecuencia por nota: `440 · 2^((semitono + (octava + 1) · 12 − 69) / 12)`.
- Cada tecla es un `div` posicionado en porcentaje para que el teclado se adapte a cualquier ancho. Etiqueta
  pequeña «C3», «C4», «C5» en los do. `touch-action: manipulation` para que no haya retraso al tocar.
- Al pulsar (`pointerdown`) la tecla se ilumina 0,4 s en tono cálido y suena la nota.

## Sonido

- Crea el `AudioContext` en el primer toque y reutilízalo (política de autoplay de los navegadores).
- Cadena de salida: ganancia → compresor dinámico → destino, más una **reverberación** por convolución cuyo
  impulso es ruido con caída exponencial de 2,2 s, mezclada al 28 %.
- Cada nota: cinco osciladores `sawtooth` desafinados (−12, −5, 0, +6, +13 cents) → filtro paso bajo con Q 4
  cuya frecuencia cae de 10× a 2× la nota durante la duración → envolvente de ganancia (ataque 10 ms, caída
  exponencial hasta 0,0008 en duración + 0,4 s).
- Botón «▶ Tocar la escala»: recorre las 15 blancas cada 0,17 s y remata con un acorde (teclas 7, 9, 11 y 14)
  de 1,8 s con un estallido grande.

## Cielo y estrellas

- Canvas que cubre el área sobre el teclado, con `devicePixelRatio` aplicado al tamaño real.
- Fondo: 70 estrellas fijas que titilan con un seno desfasado por estrella.
- Al sonar una tecla: un **rayo** de luz vertical desde la tecla (trapecio con degradado que se desvanece) y
  28 partículas (90 en el acorde) lanzadas hacia arriba con gravedad, fricción y vida que decrece; el 35 % se
  dibuja como estrella de ocho puntas y el resto como círculo. Paleta: blanco, crema, salmón, celeste y arcilla.
- Una **mano** en SVG recorre el teclado durante la escala y «pulsa» con una animación de 0,16 s.

## Contrato y calidad

- Exporta `piano(el)` que monta todo dentro de `el` y devuelve `{ pausar, reanudar }` para detener el bucle
  de dibujo cuando la escena no está a la vista.
- Con `prefers-reduced-motion`: suena, pero sin partículas ni rayos.
- Sin `alert`, `confirm` ni `prompt`. Textos en español. Estilos con prefijo propio.
- Mide el canvas al montar y al cambiar el tamaño de la ventana.
- Verifica con capturas a 390 px y 900 px: las negras deben quedar alineadas entre las blancas y la mano
  debe terminar sobre la última tecla.
- Comprueba en consola que no hay errores y que el `AudioContext` pasa a `running` tras el primer toque;
  en iOS no suena nada hasta que el usuario toca la pantalla.
