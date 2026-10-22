# JMRV — Image Studio

Studio web local para crear imágenes de alta calidad con prompts, usando la API de
**Pollinations** (cliente `pollinations-client`, interfaz compatible con OpenAI).

UI oscura, minimalista estilo Apple: prompt a la izquierda, resultado a la derecha,
historial de imágenes abajo.

## Arranque

```bash
cd ~/Downloads/JMRV
./run.sh
```

Abre <http://127.0.0.1:8790>. El puerto sale de `JMRV_PORT` en `.env` (8765 está ocupado
en esta máquina).

La primera ejecución crea `.venv` e instala las dependencias. Para el recorte de fondo
(opcional) hace falta rembg:

```bash
.venv/bin/pip install "rembg[cpu]" pillow
```

## Uso rápido

1. Escribe el prompt (⌘↵ genera).
2. Opcional: **✨ Mejorar prompt** lo reescribe con un modelo de texto.
3. Elige modelo, tamaño, calidad, seed y guidance scale.
4. **Generar imagen**. La imagen se guarda en `outputs/` y aparece en el historial.

Botones de resultado: descargar, copiar URL, quitar fondo (PNG con alfa), ampliar,
reusar prompt.

## Modo Secuencia (animación por cuadros)

Interruptor arriba a la izquierda, o entra directo en `http://127.0.0.1:8790/#sequence`.

- Cuadro 1 se genera; los siguientes se **editan** a partir de una referencia
  (`/v1/images/edits`) para mantener la identidad del personaje.
- *Prompt de movimiento*: una línea por cuadro, o una línea que se aplica a todos.
- *Ancla*: `primer cuadro` (menos drift) · `cuadro anterior` (más continuo) · `ambos`.
- Salidas: `outputs/frames/<job_id>/frame-NN.jpg`, alfa opcional (`cutout`),
  export **MP4**/**GIF** con ffmpeg y botón *▶ Ver secuencia* (reproducción en el visor).

Coste: cada cuadro cobra pollen según el modelo. Sin saldo solo funcionan `dreamshaper`
y `sana` (gratis, con más drift). Recarga: <https://enter.pollinations.ai/top-up>.

## Estructura

```
server.py     backend FastAPI: /api/generate, /api/models, /api/enhance,
              /api/remove-bg, /api/history + la secuencia de cuadros
studio.py     editor de vídeo: SQLite, composiciones HyperFrames, render y verificación
web/          frontend sin build (HTML + CSS + JS)
outputs/      imágenes generadas + index.json con metadatos
outputs/studio/  proyectos del editor (assets, index.html, renders/)
outputs/studio.db  base de datos SQLite (proyectos, cuadros, versiones, presets, renders)
.agents/skills/  skills instaladas (hyperframes, video-editing, storyboard-creation…)
PLAN.md       plan de trabajo del editor
.env          POLLINATIONS_API_KEY, JMRV_PORT
SKILL.md      skill para agentes (uso, API, modelos, límite de transparencia)
```

## Notas

- Pollinations no tiene canal alfa y su flag `transparent=true` devuelve HTTP 400.
  Para un personaje con fondo transparente: pon **Fondo (para recorte)** en
  `blanco sólido` o `verde croma` y pulsa **✂ Quitar fondo** (rembg `u2netp`, ya
  instalado) → PNG con alfa real.
- JPEG por defecto.
- La clave vive en `.env`; el servidor solo escucha en `127.0.0.1`.

## Saldo de pollen

La API responde **402 `INSUFFICIENT_BALANCE`** cuando el modelo cuesta pollen y no hay
saldo. JMRV lo traduce a un error accionable (saldo, coste, enlace de recarga), lo
muestra en una barra roja y guarda el último saldo en `outputs/balance.json`.

Coste por imagen a 512²: `dreamshaper`/`sana` 0.0001 · `flux` 0.0020 · `z-image` 0.0040 ·
`flux-klein` 0.0050 · `gpt-image-1-mini` 0.0095 · `gpt-image-2` 0.0302 ·
`flux.1-kontext-pro` 0.0300. Recarga: <https://enter.pollinations.ai/top-up>.

Si una secuencia se queda sin saldo a mitad, el job queda **pausado** con los cuadros ya
generados; tras recargar, pulsa **↻ Continuar**.

Sin saldo puedes seguir animando: **▶ Animar** (ffmpeg) convierte cualquier imagen en
MP4 con zoom/pan, coste 0 pollen.

## Proveedor Cloudflare Workers AI

Selector **Proveedor** en la UI (o `provider: "cloudflare"` en `/api/generate`).
Workers AI da **10.000 neuronas/día gratis** (reset 00:00 UTC) → ~57 imágenes 1024² de
FLUX.1 Schnell al día, sin pollen.

```bash
# .env
CLOUDFLARE_TOKEN=cfut_...
CLOUDFLARE_ACCOUNT_ID=<32 hex>
```

El gasto exacto viene en `usage.neurons` de cada respuesta (solo `flux-1-schnell` lo
devuelve; el resto se estima con la tabla oficial de precios de Cloudflare). JMRV lo
acumula en `outputs/neurons.json` y lo muestra en la píldora "neuronas: X / 10000".
Un token de inferencia no puede leer el saldo real (necesita *Account Analytics Read*
+ GraphQL `aiInferenceAdaptiveGroups`).

Modelos de texto a imagen: `flux-1-schnell` (173 neuronas/1024²), `flux-2-klein-4b`
(104, genera **y edita**), `flux-2-klein-9b` (1364), `flux-2-dev` (multi-referencia),
`dreamshaper-8-lcm`, SDXL base/lightning, `leonardo/lucid-origin` (2544) y `phoenix-1.0`.

**Secuencias (imagen X → N cuadros)**: en el bloque *Secuencia* elige **imagen base X**
del historial (el cuadro 1 es esa X, sin coste) y arma la **hoja de frames** — una fila
por cuadro con acción cinemática (`walk`, `jump`, `camera-in`…) y delta; el botón
*✦ Generar desde el prompt* la rellena sola con un LLM gratis. Los cuadros 2+ se
editan de la X con candado de identidad (prompt BFL i2i: cambia solo el delta).

Con Cloudflare (`flux-2-klein-4b`): las refs van como `input_image_0..3` y <512²
(autogestionado por JMRV; con el campo `image` el modelo las ignoraba). Verificado:
zorro de cristal, 4 cuadros con la misma identidad (~26 neuronas/cuadro a 512²).

**Bloques**: cada secuencia aparece en la sección *Secuencias* como tarjeta con sus
cuadros: ▶ reproduce la animación ahí mismo, *＋ Añadir* suma cuadros a la secuencia
(funciona incluso tras reiniciar el servidor) y MP4/GIF la exportan.

**Timeline** (⏱ en cada tarjeta): filmstrip editable — cambia acción/delta de cualquier
cuadro, regenera desde esa fila (*↺*), añade al final o rehaz la hoja con el LLM gratis.
FPS 8–60 con duración en vivo (cuadros ÷ FPS); máximo 60 cuadros y 10 s por video.

## Editor de vídeo — JMRV Studio

La pestaña **Editor** es un editor de vídeo sobre **HyperFrames**. Detalle en
[`PLAN.md`](PLAN.md). Lo esencial:

- **Persistencia SQLite** (`outputs/studio.db`): proyectos, cuadros (plano, ángulo,
  cámara, duración, subtítulo), versiones, presets de configuración y renders. Las
  secuencias antiguas se importan solas.
- **Timeline**: filmstrip proporcional a la duración, playhead arrastrable, guía de
  segundos, zoom. Añadir · insertar · duplicar · borrar · **reordenar arrastrando**.
- **Cámara por cuadro**: 16 movimientos (zoom, dolly, paneo, tilt, órbita, push/pull,
  sacudida) con **intensidad** y **easing**; presets en un clic.
- **Encuadre y ángulo**: vocabulario de planos (EWS…ECU), ángulos (picado, contrapicado,
  holandés…), transiciones (corte, fundido, deslizar, barrido) y subtítulos.
- **Visor con aspect ratio**: 16:9 · 9:16 · 1:1 · 4:5, ajustar/llenar y guías de encuadre.
- **Storyboard automático**: el LLM reparte planos, ángulos, cámara, duración y subtítulos.
- **Render**: `npx hyperframes render` (MP4/GIF) + **verificación** `ffprobe` (dimensiones,
  codec, duración) y **hoja de contactos**.
- **Extras**: música (mezclada en el vídeo), **SFX** sintetizados con ffmpeg en los cortes
  (whoosh/click/riser/impact), **hoja de sprites** (asset-pipeline) y versiones.

Skills usadas como base: `hyperframes`, `hyperframes-core/cli/keyframes/animation`,
`video-editing`, `storyboard-creation`, `smooth-motion-choreography`, `asset-pipeline`,
`diagram-animate`, `isometric-animation`. `cinema4d-mcp` e `image-to-video` no se integran
(requieren Cinema 4D y una cuenta de inference.sh).

API nueva: `GET|POST /api/studio/projects`, `PATCH /projects/{id}`,
`GET|PATCH|POST|DELETE /projects/{id}/frames`, `POST /projects/{id}/storyboard`,
`GET|POST /projects/{id}/states`, `POST /projects/{id}/render`, `POST /projects/{id}/verify`,
`POST /projects/{id}/sfx`, `POST /projects/{id}/spritesheet`, `GET|POST /api/studio/presets`.
