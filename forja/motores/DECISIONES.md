# Motores de Forja · decisiones (Anime Battle Engine + Infinite Voxel Engine)

Registro compacto. Manda `forja/ESPEC_MOTORES.md`. Rama `feat/motores-anime-voxel` (sin commit).

## Fase 1 · auditoría del framework (lo que había)

| Pieza | Dónde | Uso en los motores |
|---|---|---|
| Render del estudio | `web/app.js` + `motor/calidad.js` (Three r170) | No se toca. El motor voxel usa p5 WEBGL; el anime, p5 en 2D (`drawingContext`). |
| «Escenas» | No hay: cada plantilla Phaser es un juego entero | Nuevo `nucleo/escenas.js` (pila) y `nucleo/bucle.js` (paso fijo). |
| Recursos | `motor/sprites.js` (hoja + atlas), `escenario.js`, `texturas.js` | `nucleo/recursos.js` lee el mismo atlas: tu personaje es luchador o avatar. |
| Entrada | `plantillas/comun.js` (Phaser + `window.TACTO`) | `nucleo/entrada.js`: acciones, muestreo por paso, mando, táctil, Pointer Lock y latencia. |
| Audio | `motor/sonido.js` (síntesis por reglas) | `nucleo/audio.js` lo reutiliza: un banco de efectos con nombre. |
| Física y animación | Arcade de Phaser; poses Three en `animar.js` | Propias y deterministas (combate 2D, AABB voxel). |
| Plugins | No había | `nucleo/plugins.js`: los datos se registran; el código solo viene de módulos de confianza. |
| Dependencias | three, p5 1.11.1, phaser 4, gsap | Se suma **Anime.js 4.5.0** en `vendor/` (MIT, con licencia). Ninguna otra. |
| Cuellos de botella | Phaser + Three en una t3.small; el estudio carga `reglas.json` (705 KB) | Los motores no cargan `reglas.json`. El trabajo pesado del voxel va en Workers. |

## Arquitectura

```
web/motores/nucleo/   Game Core (bucle de paso fijo), Scene Manager, ECS ligero, Input, Seed Manager (hash + xoshiro128**),
                      ruido (simplex/perlin/fBm/ridged/warp/voronoi), pool, rejilla espacial, monitor F3, perfiles + auto,
                      audio, HUD (Anime.js), esquema (validador JSON), plugins, recursos, cola de prioridad
web/motores/anime/    estados (FSM, 27 estados), buffer (input buffer), fisica, combate (simulación), ia, director
                      (cinemáticas), jefe, modos (partida), esqueleto (animación por huesos), fx (efectos), render, juego,
                      personajes, config (esquema), agente, editor
web/motores/voxel/    bloques, biomas, generador (+estructuras, árboles), malla (greedy + AO), trabajador (Worker),
                      mundo (chunks), render (adaptador p5 WEBGL), fisica, rayo (DDA), criaturas, supervivencia,
                      persistencia (IndexedDB), ambiente, interfaz, juego, config, agente, editor
web/motores/forja/    proyecto.js (armar/ZIP/srcdoc), config.js (guardado + validación), editor.js (pestaña), agente.js
web/plantillas/       duelo-anime.js, jefe-titan.js, mundo-voxel.js, supervivencia-voxel.js, creativo-voxel.js, aventura-voxel.js
web/motor/juegos/     catálogos de las 6 plantillas, con el contrato de main (anime-comun.js, voxel-comun.js)
```

## Integración con Forja (corrección del usuario: el creador ES Forja)

- Las seis plantillas entran en `plantillas/meta.json` con `"motor": "anime" | "voxel"`; las de Phaser no lo llevan. Aparecen en «Diseña tu videojuego» y en «Plantillas de juego» sin tocar `disena.js`.
- Hay un bloque de ganchos, marcado `// >>> motores … // <<<`, en cada archivo compartido:
  - `exportar.js`: 5 líneas.
  - `mas.js`: la pestaña Editor y no adjuntar Phaser a los motores.
  - `index.html`: un botón `data-v="editor"` oculto.
  - `juegos/index.js`: 6 entradas en `CARGA`.
- `motores/forja/proyecto.js` arma el proyecto:
  - Incluye `index.html` con importmap (`motores/` y `animejs`), `datos.js`, `config.json`, `juego.js` y `LEEME.txt`.
  - Copia solo los módulos que `juego.js` importa: sigue los `import` y los `new URL('…', import.meta.url)` de los Workers.
  - Añade p5, Anime.js, `motor/sonido.js` y las hojas de sprites del estudio.
  - El mismo arreglo de archivos sirve al iframe srcdoc (importmap absoluto + `blob:`), al ZIP y a «Guardar en mi aula».
  - Medido: 39 archivos y 1,9 MB (jefe titán); 46 archivos y 2,0 MB (voxel). Ambos por debajo del tope del LMS de 150 archivos y 12 MB.
- **Tu personaje como luchador o avatar:** si el proyecto trae `assets/heroe.png`, aparece «Tu personaje» en la selección y se dibuja con su hoja de sprites. En voxel es el avatar en 3.ª persona.
- **Demos:**

  | Demo | Plantilla |
  |---|---|
  | A · Shadow Warriors | Duelo anime |
  | B · Titan Awakening | Jefe titán |
  | C · Infinite Lands | Mundo voxel |
  | D · Lost Kingdom | Aventura voxel |

  Son los valores de fábrica de cada plantilla. `motores/probar.html?plantilla=<id>` es solo un banco de pruebas para desarrollo y Playwright, no una página para alumnos.
- **Reglas (contrato de main):**
  - Cada catálogo pasa `revisar()` y cubre los 8 elementos formales.
  - Tamaño: duelo-anime 322 reglas en 101 claves; jefe-titán 319 en 108; las 4 voxel 383–384 en 104.
  - Las plantillas anime leen cada clave con `R('clave', defecto)` y la traducen a una opción del motor.
  - Las voxel tratan la clave como ruta de configuración (`'mundo.relieve'` → `config.mundo.relieve`). Una regla que quedó de fábrica no pisa lo que se cambió en el Editor.
  - Una prueba exige que cada clave aparezca literal en su plantilla.
- **Editor** (pestaña nueva, solo para plantillas de motor):
  - Incluye paneles del motor, «Describe tu juego» (agente) y el JSON completo validado.
  - Lo que admite cambio en caliente viaja por `postMessage({ forja: 'config' })`; lo demás reinicia la partida.
  - Se guarda en `localStorage` (`forja.motores.config`) y viaja en `config.json`.

## Decisiones técnicas clave

- **Determinismo:**
  - La simulación avanza en pasos fijos de 1/60 s (Fiedler), con interpolación al dibujar.
  - Ni Math.random ni el reloj de pared deciden nada del juego.
  - Hay pruebas que comparan la simulación a 30, 60 y 144 Hz y con cuadros irregulares: el estado es idéntico.
- **Combate:**
  - El daño sale de hitbox contra hurtbox, nunca del dibujo.
  - La pose se calcula del mismo `movF` que el frame data: arranque = preparación, activo = golpe, recuperación = vuelta a guardia.
  - Cada instancia de golpe guarda a quién golpeó, así no hay daño duplicado; los multigolpe usan `golpes` y `cadaGolpe`.
  - Los golpes del mismo cuadro se reúnen antes de aplicarse: hay intercambio, salvo que un lado tenga 2 o más de prioridad.
  - Combos sin infinitos: escalado, límite de malabares, duración máxima del combo, aturdimiento que decae y penalización por repetir el mismo golpe.
  - Bloqueo sin muro eterno: el aguante se gasta y la guardia se rompe.
- **FSM:**
  - La tabla es explícita: cada estado declara a dónde puede pasar por voluntad (`a`) y si acepta reacciones forzadas (`recibe`).
  - Lo que pide el jugador o la IA pasa por `intentar()`: si no está permitido, no ocurre.
  - Lo que impone el motor se valida y se cuenta. Las pruebas exigen 0 transiciones rechazadas (CPU contra CPU, 6 000 cuadros, y todos los modos).
- **IA:**
  - La estructura es un árbol de comportamiento (defensa, antiaéreo, castigo, anticipación) sobre Utility AI y planes de teclas.
  - La CPU percibe con retraso: según el nivel, ve un historial de instantáneas de hace 160–430 ms.
  - Predice tu posición con tu velocidad, aprende lo que repites y se anticipa: un humano tampoco reacciona a un golpe de 8 cuadros.
  - Usa el mismo buffer y las mismas reglas que el jugador.
- **Jefe:**
  - Es una entidad con superarmadura, varias hurtboxes con multiplicador (núcleo expuesto, mano apoyada) y ataques con aviso, activo y recuperación.
  - Tiene fases por porcentaje de vida con cinemática entre ellas.
  - Elige su ataque por utilidad, con enfriamientos y el PRNG de la partida.
- **Cinematic Director (Anime.js):**
  - El timeline se crea con `autoplay: false`.
  - El bucle hace `timeline.seek(tSim)` con el tiempo de simulación; `engine.useDefaultMainLoop = false` y `engine.update()` desde el bucle.
  - Medido en Node: `timeline.call()` se vuelve a disparar al retroceder con `seek`. Por eso los eventos de juego van en una lista propia con id, se despachan una sola vez y el combate aplica cada `impacto(i)` una vez.
  - Omitir, pausar o ir en cámara lenta produce los mismos impactos y el mismo daño; hay prueba de eso.
  - Sin cinemáticas, el daño es el mismo y llega al instante.
- **Efectos:**
  - Partículas en arreglos tipados (structure of arrays) con presupuesto por perfil; lo que no cabe se descarta y se cuenta.
  - Formas (ondas, arcos eléctricos por desplazamiento del punto medio, cortes con Bézier, haces con ruido, distorsión por franjas) salen de un pool.
  - El destello de golpe usa `ctx.filter` solo sobre el cuerpo. Antes era `source-atop`, que teñía el fondo.
  - Accesibilidad:
    - Respeta `prefers-reduced-motion` y las opciones del juego.
    - Sin sacudidas: los zooms de cinemática bajan al 30 %.
    - Destellos: como máximo 3 por segundo y tenues (WCAG 2.3.1).
- **Orientación:** el cuerpo se espeja, pero cada accesorio conserva su lado (la hombrera izquierda pasa a dibujarse detrás) y el emblema no se espeja. Con la hoja de sprites 3/4 del estudio se espeja la imagen completa, igual que en las plantillas Phaser.
- **Configuración segura:**
  - `nucleo/esquema.js` valida un subconjunto de JSON Schema.
  - Rechaza claves desconocidas, `__proto__`/`constructor`/`prototype`, funciones y valores no finitos.
  - Nada de la configuración se evalúa.
  - El agente (`forja/agente.js`) traduce texto o JSON con un léxico determinista y luego valida. No consulta un LLM mientras se juega.
- **Voxel** (detalle en el informe del fork):
  - Render y geometría:
    - p5.Geometry por chunk: uno opaco y uno transparente, nunca un `box()` por bloque.
    - Un «adaptador de geometría empaquetada» entrega TypedArrays a p5 1.11 sin copiar, y luego se sueltan los arreglos de CPU.
    - Shaders propios con la cámara en el origen (floating origin).
    - De WebGL solo se toca `CULL_FACE` y `depthMask`, y se restauran.
    - p5 1.11 suelta las texturas tras cada `model()`, así que el atlas se vuelve a fijar.
    - Greedy meshing con AO por vértice: fundir solo caras con la misma luz y AO.
  - Chunks y Workers:
    - Cada chunk es un `Uint8Array` de 16×16×H. El mallado recibe un volumen con borde de 1 bloque.
    - Pool de hasta 4 Workers; los resultados viajan como ArrayBuffer transferible.
    - Cola de prioridad por distancia y dirección de marcha; cancela lo lejano y tiene una caché con tope.
  - Generación:
    - Es una función pura de la semilla y las coordenadas (`VERSION_GENERADOR = 3`).
    - Estructuras: una por región, por hash, sin importar el orden de carga.
    - Wave Function Collapse descartado: no daba ventaja medible.
    - LOD no implementado: a distancia 10 se midieron 60 FPS con 139 draw calls.
  - Persistencia:
    - Solo deltas más el estado, en binario comprimido (CompressionStream, o RLE si no existe).
    - Con migración de formato y aviso si cambió la versión del generador.

## Anime.js 4.5.0: dónde sí y dónde no

- **Sí:**
  - Cinematic Director: zoom, foco, retrato, fondo y texto, con `seek` manual.
  - HUD:
    - Barras de vida y energía con `spring()`; `createSpring` está obsoleto en 4.5.
    - Números de daño y contador de combo.
    - Textos de habilidad con `splitText` y `stagger`.
    - Trazos SVG con `createDrawable`.
  - Menús y transiciones de los juegos.
  - Editor de hitboxes: `createDraggable` para la caja y un timeline de la pose que se puede arrastrar.
  - Voxel: avisos, medidores y paneles, y la barra rápida que se reordena arrastrando.
- **No:**
  - Partículas: van en arreglos tipados con pooling.
  - Física, frame data, hitboxes y daño.
  - Mallas voxel y todo lo que se hace por bloque o por partícula en cada cuadro.
  - Adaptador de Three.js: no hay Three en los motores.
- **Un solo motor, sin `requestAnimationFrame` propio.** Dentro de `motores/` se importa por ruta relativa: también carga en Node y comparte el módulo con el importmap `animejs` porque la URL es la misma.
- **Coste medido:** `engine.update()` del HUD tarda 0,02–0,03 ms por cuadro en Chrome (M4 Pro), incluso con 4 000 partículas en pantalla.

## Cifras medidas (Mac M4 Pro)

Headless Chrome usa la GPU real (ANGLE Metal), no un render por software. Los FPS topan en 60 por vsync: no medí por encima.

- **Duelo anime:**
  - 60 FPS; el peor cuadro, 16,8 ms.
  - Simulación de 0,12–0,21 ms y render de 0,48–1,13 ms por cuadro.
  - Prueba de estrés con 4 000 partículas al tope del presupuesto (26 347 descartadas): sigue en 60 FPS con 1,8 ms de render.
- **Jefe titán:** 60 FPS, simulación de 0,15 ms y render de 0,53–0,58 ms.
- **Node, simulación pura:** 18,8 µs por paso con 2 luchadores y 2 IA (35 285 pasos); 36 µs por paso en modo lateral con hasta 5 entidades.
- **Latencia de entrada:** medida de keydown al paso que la usa, 10–27 ms.
- **Voxel:** el informe del fork trae chunks/ms, triángulos, draw calls y memoria.

## Pruebas

- `cd forja && node --test`: 48/48.
  - `forja.test.mjs`: el de main, sin cambios.
  - `motores-anime.test.mjs`: 20 pruebas.
  - `motores-voxel.test.mjs`.
- **Visuales:**
  - `motores/pruebas/anime.cjs`: juega las dos plantillas, mide y hace capturas.
  - `motores/pruebas/anime-estudio.mjs`:
    - Las prueba dentro de Forja: iframe y pestaña Editor.
    - Comprueba que tu personaje es el luchador.
    - Descarga el ZIP y lo sirve aparte.
  - `voxel.mjs` y `voxel-estudio.mjs`: lo mismo para voxel.

## Pendientes honestos

- Los recursos que importa el alumno (sprite sheets, sonidos) tienen API (`nucleo/recursos.js importarArchivo`), pero aún no tienen botón en el Editor.
- **Modos:**
  - Arena 2.5D: los golpes respetan la profundidad, pero el dibujo es el mismo de 2D con sombra. El fondo no tiene perspectiva propia.
  - Torneo: las otras llaves no se simulan ni se muestran; solo juegas tus rondas.
- Los luchadores tienen un solo esqueleto procedural, sin animación cuadro a cuadro dibujada a mano: no hay arte original adicional. El editor ajusta frame data, cajas y colores, no las poses una por una.
- En el anime, la hora del estudio (Día, Tarde…) no cambia el escenario; el tema manda.
- Voxel:
  - Sin controles táctiles.
  - El agua y la lava no fluyen.
  - La luz emisiva solo se propaga dentro del chunk y su borde.
  - Las criaturas que deambulan no se guardan.
  - Un tirón aislado de 83 ms en Aventura, sin investigar.
- Sin probar dentro de `/vista/<alumno>/` del LMS real. El ZIP sí corre servido desde su carpeta.
- El repo no tiene `CLAUDE.md` en la raíz del monorepo ni en forja. No lo creé; este archivo es el registro.
