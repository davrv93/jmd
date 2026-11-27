# Rosa 3D

Avatar 3D de Rosa Huamán (personaje ficticio de práctica, sesión 1). En producción:

| archivo | qué es |
|---|---|
| `live/_comun/rosa3d.js` | fachada ES5 (`window.Rosa3D`): `disponible()` y `montar()`. Nota de integración arriba. |
| `live/_comun/rosa3d-motor.js` | motor empaquetado (Three.js r170 + GLTFLoader + `motor.js`), se pide en `montar()` |
| `materials/rosa3d/rosa.glb` | modelo, se sirve por `/files/` (declararlo como material de dtc-01) |
| `materials/rosa3d/LICENCIA-Rocketbox.md` | origen y licencia MIT del avatar |

## Por qué así

- **CSP de las escenas**: sin `blob:`, sin `wasm-unsafe-eval`, sin workers. Por eso no hay Draco, meshopt ni KTX2, y las
  texturas del `.glb` no las decodifica GLTFLoader (crea URL `blob:`; `connect-src 'self'` lo bloquea): `motor.js` trae un
  complemento que usa `createImageBitmap(Blob)` (no pasa por la CSP) o, si no hay, una URL `data:` (`img-src data:`).
- **`.glb` en `materials/`**: `extsEscena` no sirve `.glb` junto a la escena. Por `/files/` sí, con `Content-Length`,
  `Last-Modified` y caché de 5 min, pero solo si un material publicado lo declara.
- **Tamaño**: 3,4 MB. Las formas de cara van en accesores dispersos (3,7 MB → 0,13 MB).
- **Movimiento**: procedural sobre el esqueleto Biped (respiración, peso, cabeceos al hablar, parpadeo, sacadas, mirada
  que se aparta según el gesto, mano al pecho en el descubierto). Los clips de Mixamo que hay en el equipo son de fútbol.

## Render (1.2.0)

- **Piel**: «wrap» por canal (borde de sombra rojizo), poros (normales de detalle procedurales en mosaico, solo en la
  piel), rugosidad por zonas (zona T más brillante, mejillas mate), rubor en mejillas, nariz y orejas y un 10 % menos de
  saturación (en la textura). Oclusión de contacto del cuello junto al borde de la chompa (atributo calculado al cargar).
- **Ojos**: brillo de córnea quieto respecto de la luz (el brillo pintado del iris de Rocketbox se borró), sombra de la
  órbita en la esclera, capa húmeda (clearcoat) en córnea y labios.
- **Pelo**: el moño en dos pasadas (núcleo opaco con recorte al 50 % + bordes con mezcla sin escribir profundidad); el
  pelo pintado del cráneo con mechones y un brillo anisótropo muy suave hacia el moño.
- **Luz**: sombra VSM desenfocada (PCF en `calidad: 'baja'`), clave tibia de ventana de día y de lámpara de noche,
  fondo de cuarto desenfocado (ventana, repisa, planta; desenfoque de caja por software) con bokeh, viñeta y grano CSS.

## Render (1.3.0)

- **Pelo de verdad en el cráneo**: al cargar se generan ~740 mechones (láminas con un atlas de hebras procedural) que
  salen de la línea del pelo y de las sienes y van pegados al cráneo hacia el moño, en tres capas; más ~70 cabellitos en
  las sienes y ~34 pelos que se escapan en la coronilla. Piel 100 % del hueso de la cabeza, dos pasadas (núcleo con
  recorte + bordes con mezcla) y brillo anisótropo roto entre hebras. ~39 mil vértices. En `calidad: 'baja'` no se
  generan; en un equipo justo (`auto`, con dpr ya en 1,25) se apaga la pasada suave y su sombra antes de bajar a dpr 1.
- **Cara**: cavidad horneada (divergencia del mapa de normales: párpados, aletas de la nariz, surcos, comisuras, orejas)
  en la oclusión del ORM, también a media fuerza para la luz directa; sombra del párpado y las pestañas sobre el ojo;
  línea húmeda en el párpado inferior; variación de melanina, pecas y dos lunares chicos; más vello (sheen) y más rotura
  del especular por los poros.
- **Fondo**: el rincón de la oficina de Rosa en Surquillo (ventana con rejas y cielo «panza de burro» sobre azoteas con
  tanques, estante metálico con archivadores de palanca, calendario de pared, fluorescente, borde del escritorio con
  papeles), por planos con desenfoque distinto; de noche, ventana oscura con luces lejanas y lámpara tibia.

## Rehacer

1. `motor.js` → `THREE_NODE_MODULES=/ruta/node_modules ./construir.sh` (three@0.170.0 y esbuild).
2. Modelo (`herramientas/`): bajar `Female_Adult_11` de Rocketbox (FBX `_facial` + TGA) a `$ROSA3D_TRABAJO/dl/fa11`,
   pasar las TGA a PNG en `$ROSA3D_TRABAJO/rosa3d/tex/src`, levantar `servidor.mjs` (puerto 18745, `THREE_DIR` = three
   con `examples/jsm`), y correr `correr.mjs /build/convertir.html` (FBX → `geometria.glb` + máscaras),
   `texturas.mjs` (piel, ORM, húmedo, pelo) y `empaquetar.mjs` (→ `rosa.glb`).
