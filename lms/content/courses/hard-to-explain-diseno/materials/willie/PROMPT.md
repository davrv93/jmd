# Prompt para ejecutar · «Willie, difícil de explicar»

Pégalo entero en tu agente (JMD en el aula, Claude Code u OpenCode) desde una carpeta vacía que
tenga `willie.svg` al lado. Son las seis partes del pedido: rol, contexto, tarea, límites, formato
y comprobación. Antes, si tienes las skills instaladas, escribe `usa las skills pedido-seis-partes
y animacion-abierta`.

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

## Qué vas a ver

Una página con fondo tinta y un botón «Reproducir». Al darle, 20 segundos de cortes al pulso con
Willie en bits. Con `?t=7` la página queda quieta a mitad del paneo.

## Un buen segundo pedido

```text
En la escena 4, el zoom al plano medio llega tarde: debe terminar en el segundo 9,5, no en el 10.
Ajusta solo eso y dime qué línea cambiaste.
```

## Para exportar el MP4 (herramientas abiertas)

```bash
node render.mjs willie/index.html salida.mp4    # Playwright saca 600 cuadros a 30 fps y FFmpeg los une
```
