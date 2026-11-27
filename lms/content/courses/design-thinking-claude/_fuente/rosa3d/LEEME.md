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

## Rehacer

1. `motor.js` → `THREE_NODE_MODULES=/ruta/node_modules ./construir.sh` (three@0.170.0 y esbuild).
2. Modelo (`herramientas/`): bajar `Female_Adult_11` de Rocketbox (FBX `_facial` + TGA) a `$ROSA3D_TRABAJO/dl/fa11`,
   pasar las TGA a PNG en `$ROSA3D_TRABAJO/rosa3d/tex/src`, levantar `servidor.mjs` (puerto 18745, `THREE_DIR` = three
   con `examples/jsm`), y correr `correr.mjs /build/convertir.html` (FBX → `geometria.glb` + máscaras),
   `texturas.mjs` (piel, ORM, húmedo, pelo) y `empaquetar.mjs` (→ `rosa.glb`).
