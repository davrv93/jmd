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
  - El destello de golpe mezcla los colores del cuerpo hacia el blanco (antes `ctx.filter`, que en GPU por software costaba un cuadro entero por cuerpo; antes aún `source-atop`, que teñía el fondo).
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

## Render y escenarios del anime (26-11-2026)

Todo es presentación: el render lee el combate y nunca escribe en él. Las 38 pruebas siguen verdes.

- **Nueve escenarios originales** en `anime/escenarios.js`: Plaza de los faroles, Azotea bajo la tormenta, Mercado de neón, Dojo del amanecer, Bosque de bambú, Puerto al atardecer, Cantera del templo (la del titán), Ruinas del desierto y Templo del cielo.
  - Cada uno: cielo, tres o cuatro planos con paralaje y perspectiva atmosférica (cuanto más lejos, más niebla), un suelo en perspectiva y vida animada (faroles que se mecen, lluvia y relámpagos, neón que parpadea, brasas, hojas, banderas, cascadas, gaviotas).
  - La regla `limites.escenarioTema` elige uno o una elección: `hora` (la hora de tu escenario en Forja, `DATOS.hora`; sin ella, la del reloj), `rotar` (uno distinto por pelea) o `elemento` (trueno → tormenta…). La historia usa el escenario de cada capítulo.
  - `config.defecto('duelo-anime')` ya no fija `escenario`: antes pisaba la regla y el alumno nunca veía el escenario que elegía.
- **Suelo en perspectiva real:** la cámara está a 168 px del suelo; la fila `y` está a profundidad `d = 168 / (y − 300)`. La textura se pinta en (x de mundo, profundidad) y se copia en franjas de 3 px con su escala. Las juntas que se alejan se dibujan como rectas hacia el punto de fuga (en la textura salían escalonadas).
- **Reflejos** en suelos pulidos (plaza, azotea, mercado, dojo, cielo): el plano del fondo espejado y desvanecido UNA vez, las luces animadas espejadas y los luchadores espejados sobre su punto de apoyo, tenues.
- **Luchadores:** sombra de celuloide del lado contrario a la luz del escenario, filo de contraluz del lado de la luz, luz de ambiente que los tiñe, torso en V con faja, extremidades que se afinan, ojo con iris y brillo. La geometría (largos, ángulos, IK) no cambió: el puño sigue cayendo en su hitbox. La hoja de sprites del estudio se tiñe con la luz del escenario y lleva filo de contraluz.
- **Efectos:** chispa de golpe en estrella, escudo al bloquear, cuadros de impacto (inversión → negro con estallido blanco desde el golpe), sacudida con ruido y un giro mínimo, estelas en cinta que se afina, aura de llamas, partículas por lotes y brasas como halos.
- **Etalonaje horneado:** el degradado de cada escenario se mezcla (`soft-light`) una vez en el cielo, las capas y el suelo. En cada cuadro solo queda la viñeta.
- **GL por software:** si `capacidades()` detecta SwiftShader o llvmpipe, el cuadro se rasteriza en un lienzo de CPU (`willReadFrequently`) y se copia entero. Medido con SwiftShader: cada trazo en la GPU emulada costaba lo que 10 en CPU. En ese modo la resolución no baja (copiar sin escalar es lo rápido) y las traslaciones se redondean.
- **Perfiles:** `bajo` quita reflejos, rayos de luz, lluvia y lo que va delante; menos postimágenes. `render.medir = {}` mide el costo de cada parte (con lienzo de CPU, `getImageData` obliga a rasterizar).
- **Arreglo colateral:** el director reenviaba cada evento de cinemática con su tipo original (`{ tipo: 'cine:' + e.tipo, ...e }`): el «fin» de cada escena mostraba «EMPATE» y los impactos y sonidos de las cinemáticas nunca se veían ni sonaban.

## Render y escenarios del voxel (26-11-2026)

Antes: luz plana por cara, cielo de dos colores, agua lisa, texturas de ruido píxel a píxel; se parecía demasiado a un juego de bloques famoso. La jugabilidad no cambió (física, aparición, apuntado, criaturas, controles).

- **Luz en lineal** (`render.js`): sol o luna direccional con N·L por cara (lo iluminado cálido, la sombra fría), cielo hemisférico por la luz de cielo del vértice, AO más marcado, luz de bloques cálida que se apaga en charcos, mínimo frío. Al final, en cada shader: exposición, ACES, gradación por hora/bioma/clima (lift, gain, saturación), viñeta y tramado.
- **Malla** (`malla.js`): la luz de cielo y de bloques va SUAVIZADA por esquina (promedio de las 4 celdas; las opacas no cuentan) → copas y antorchas en degradado. Cuesta 4–5 % más triángulos (medido en 25 chunks). Cada cara trae el clima de su columna (`codigoClima`) para teñir césped, hojas y hierba; en el agua, las esquinas guardan la tierra vecina → espuma de orilla.
- **Sombras:** `alto`/`ultra` tienen mapa de sombras ortográfico (2048/3072 px, caja de ±48/±72 bloques ajustada a la rejilla de texeles, caras traseras, PCF bilineal). Se redibuja solo si la caja se movió 2 bloques, el sol giró, cambió la geometría o pasaron 30 cuadros. `bajo`/`medio` usan la luz de cielo como sombra falsa.
- **Cielo y niebla:** degradado con banda del amanecer/atardecer, disco del sol y halo, luna con fase y halo, estrellas que giran, nubes de fBm. La niebla es el MISMO color del cielo en esa dirección (esconde el borde de los chunks) más bruma baja en los valles; el fin de la niebla sigue la distancia real del perfil.
- **Agua y plantas:** olas en la normal, fresnel, reflejo del cielo (bajo tierra no), brillo del sol, espuma, cáusticas bajo el agua; el color del agua es por bioma y cambia despacio (por cara salía en escalones: costuras rectas). Hojas y plantas se mecen con el viento y dejan pasar la luz a contraluz.
- **Posproceso** solo en `alto`/`ultra` (`CALIDAD` en `render.js`): MSAA 2×/4×, bloom a ¼ de resolución y rayos de sol (desenfoque radial del brillo). La calidad automática los quita al bajar de perfil: probado forzando cuadros lentos (alto → medio → bajo y vuelta, sin errores).
- **Ojo que se adapta:** bajo tierra (techo opaco y varios bloques bajo la superficie) la exposición sube despacio; de noche también. Las criaturas y el avatar toman la luz de las lámparas cercanas (`luzEn`, caché por celda).
- **Atlas** (`atlas.js`): dirección de arte «diorama andino» con paletas cortas y manchas grandes (ruido periódico, sin costura): mampostería poligonal, adobe, lana tejida, ichu, cantuta/campanilla/amancay, tronco claro moteado, jacarandá. Las recetas de plugins siguen con el pintor anterior.
- **Escenarios** (`VERSION_GENERADOR = 4`): prados de flores por manchas y de un color, helechos, arbustos con bayas, rocas medio enterradas, jacarandá, árboles dorados, robles grandes, lianas en la selva, senderos de tierra en las aldeas y una ruina nueva (columnata con arco, columnas caídas, enredaderas y farol encendido). Bloques 41–48 agregados al final: las partidas guardadas siguen valiendo (avisan del cambio de versión).
- **Primera vista:** se aparece en un claro (sin árboles cerca, `gen.arbolEn`) y se mira hacia lo más despejado (rayos cada bloque y dos a los lados).
- **Medido** (M4 Pro, 1280×720, sin vsync): 540–750 FPS en los cuatro perfiles, ~1,4 ms de CPU de render por cuadro; con vsync, 60 FPS en `alto` (el automático elige `alto` en la GPU real). Con SwiftShader el cuello son los vértices, no los píxeles (bajar la resolución no cambia los FPS).

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

- **Render nuevo (26-11-2026), con la máquina cargada por otros procesos:**
  - Chrome sin interfaz con GPU (ANGLE Metal): 60 FPS en los nueve escenarios y en el titán; peor cuadro 17 ms.
  - Con SwiftShader (GL por software, lienzo de CPU): 3,6–6 ms por cuadro rasterizado y 57–61 FPS. El render anterior daba 24–31 FPS ahí.
  - Por partes en CPU (plaza): fondo 1,3 ms, suelo 1,2, luchadores 0,9, efectos 0,3, viñeta 0,1.
  - Dentro del estudio con SwiftShader, la propia página del estudio da 9 FPS con el juego sin dibujar: el cuello no es el juego.

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
  - Arena 2.5D: los golpes respetan la profundidad y el suelo ya tiene perspectiva, pero el luchador del fondo casi no se achica.
  - Torneo: las otras llaves no se simulan ni se muestran; solo juegas tus rondas.
- Los luchadores tienen un solo esqueleto procedural, sin animación cuadro a cuadro dibujada a mano: no hay arte original adicional. El editor ajusta frame data, cajas y colores, no las poses una por una.
- Escenarios: los planos lejanos no se escalan con el zoom (a propósito, por rendimiento) y los reflejos no siguen la perspectiva del suelo. Las ramas de bambú no se mecen.
- Voxel:
  - Sin controles táctiles.
  - El agua y la lava no fluyen.
  - La luz emisiva solo se propaga dentro del chunk y su borde (las criaturas sí la toman de las lámparas vecinas).
  - El mapa de sombras cubre ±48 bloques (alto); más allá, sombra falsa. Las hojas se mecen pero su sombra no.
  - Las criaturas que deambulan no se guardan.
  - Un tirón aislado de 83 ms en Aventura, sin investigar.
- Sin probar dentro de `/vista/<alumno>/` del LMS real. El ZIP sí corre servido desde su carpeta.
- El repo no tiene `CLAUDE.md` en la raíz del monorepo ni en forja. No lo creé; este archivo es el registro.
