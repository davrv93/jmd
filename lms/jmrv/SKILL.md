---
name: jmrv
description: Generate high-quality images from prompts with the JMRV local studio (Pollinations API). Use when the user asks to create, generate or render an image/illustration/painting from a text prompt, wants image variations with a seed, needs a transparent-background asset for HyperFrames compositing, or wants to list available image models. Triggers on "JMRV", "genera una imagen", "crea una imagen", "text to image", "prompt to image", "flux image", "imagen con pollinations".
---

# JMRV — Local Image Studio

UI web (oscura, minimalista estilo Apple) + backend FastAPI sobre la API de **Pollinations**.
Todo local: prompts dentro, PNG/JPEG en `outputs/`, metadatos en `outputs/index.json`.

## Dónde

```
~/Downloads/JMRV
├── server.py          # FastAPI backend (pollinations-client + direct download)
├── web/               # index.html, styles.css, app.js (no build step)
├── outputs/           # generated images + index.json
├── .env               # POLLINATIONS_API_KEY, JMRV_PORT
└── run.sh             # boot script (creates .venv on first run)
```

## Arranque

```bash
cd ~/Downloads/JMRV
./run.sh                 # http://127.0.0.1:8790
```

El puerto sale de `JMRV_PORT` en `.env`. `8765` está ocupado en esta máquina.

## API

| Method | Route | Purpose |
|---|---|---|
| GET  | `/api/health` | `key_configured` |
| GET  | `/api/models` | modelos de imagen para la key actual + lista de Cloudflare Workers AI |
| POST | `/api/generate` | generar + descargar + guardar en `outputs/` |
| POST | `/api/enhance` | reescribir un prompt tosco en un prompt pro denso |
| POST | `/api/remove-bg` | recortar fondo → PNG con alfa (necesita `rembg`) |
| GET  | `/api/history` | lista de imágenes guardadas + metadatos |
| DELETE | `/api/history/{file}` | borrar un archivo + su entrada |
| GET  | `/outputs/{file}` | imagen estática |

`/api/generate` body:

```json
{
  "prompt": "retrato de un astronauta, pintura al óleo, luz de ventana",
  "negative_prompt": "borrón, texto, marcas de agua",
  "provider": "pollinations",
  "model": "black-forest-labs/flux.1-schnell",
  "size": "1024x1024",
  "quality": "hd",
  "seed": 42,
  "guidance_scale": 7.0,
  "nologo": true, "private": true, "nofeed": true, "safe": false,
  "enhance": false,
  "background": "auto",
  "image": "https://…/ref.jpg"
}
```

Devuelve la entrada con `url` (`/outputs/<file>`), `bytes`, `elapsed_s`, `source_url`.

## Internamente

```python
from pollinations import Pollinations

client = Pollinations(api_key=KEY, timeout=300)
resp = client.images.generate(prompt=..., model=..., size="1024x1024")
url = resp.data[0]["url"]        # https://gen.pollinations.ai/image/<prompt>?…
```

JMRV calls the **native** `client.generate_image(...)` instead of `images.generate(...)`:
the OpenAI-style shortcut silently drops `quality` and only supports `prompt/model/size`.
The native call honours every flag (`quality`, `negative_prompt`, `guidance_scale`,
`seed`, `nologo`, `private`, `nofeed`, `safe`, `enhance`, `image`).

Then the server downloads the bytes with `Authorization: Bearer <key>` (the raw URL
returns 401 without it, so images are proxied through `/outputs/`, never loaded
directly by the browser).

Text rewriting (`/api/enhance`) and the frame sheet (`/api/frames/sheet`) go through the
**free** text endpoint `https://text.pollinations.ai/openai` (no key, no balance) via
`_free_chat`. The SDK `client.generate_text` charges the key balance — useless at 0.

## Modelos (20 con esta key)

`black-forest-labs/flux.1-schnell` (alias `flux`, rápido) ·
`black-forest-labs/flux.1.1-pro` (calidad) · `black-forest-labs/flux.2-klein-4b` ·
`black-forest-labs/flux.1-kontext-pro` (imagen→imagen) · `openai/gpt-image-2` ·
`openai/gpt-image-1.5` · `openai/gpt-image-1-mini` · `tongyi-mai/z-image-turbo` ·
`lykon/dreamshaper-8-lcm` · `microsoft/mai-image-2.6` + builds de la comunidad.

Consulta siempre `/api/models` para la lista viva; el set cambia.

## Secuencia de cuadros (animación)

Modo *Secuencia* en la UI (`#sequence`): flujo **imagen X → N cuadros más**, guiado por
una **hoja de frames**.

1. **Imagen base (X)** — selector con el historial. Si se elige una, el cuadro 1 ES esa
   X (copia, sin coste) y todos los demás cuadros se editan a partir de ella. Si no,
   el cuadro 1 se genera desde el prompt.
2. **Hoja de frames** — tabla `# | Acción | Delta` con una fila por cuadro. Botón
   *✦ Generar desde el prompt* → `POST /api/frames/sheet` (LLM gratis) desglosa el
   prompt en N beats cinemáticos coherentes (ej: pose → paso → salto → aterrizar).
   Vocabulario de acciones básicas: `hold`, `appear`, `disappear`, `enter`, `exit`,
   `move-left/right`, `walk`, `run`, `jump`, `turn`, `crouch`, `wave`, `camera-in/out`,
   `pan-left/right`, `shake`. El delta se puede editar a mano (inglés rinde mejor en
   el modelo) y las filas se añaden/quitan a mano.
3. **Candado de identidad** — los cuadros 2+ se envían con `EDIT_LOCK` (práctica BFL
   i2i: declara qué cambia Y qué debe permanecer idéntico) + la escena base + solo el
   delta del cuadro. Sin la escena base en el prompt, el modelo ignora la referencia e
   inventa otro sujeto (verificado).

```
POST   /api/frames               → { job_id, total }   (job en background, thread)
POST   /api/frames/sheet         → { sheet: [{action, delta}×N], actions }  (LLM gratis)
GET    /api/frames/{id}          → { state, completed, total, frames[], error }
                                  (si el job no está en memoria se reconstruye desde disco:
                                   frames + job.json → from_disk: true)
POST   /api/frames/{id}/resume   → continúa una secuencia pausada por falta de saldo
POST   /api/frames/{id}/extend   → { frames: total_nuevo, sheet: [beats de los cuadros
                                  NUEVOS] } — añade cuadros a una secuencia existente;
                                  funciona tras reiniciar el servidor (usa job.json)
POST   /api/frames/{id}/regenerate
       → { from_frame: N≥2, sheet?: [beats para N..total] } — borra los cuadros ≥N y
         los regenera con la hoja editada (frame 1 = base, inmutable; funciona tras
         reiniciar el servidor)
GET    /api/frames/{id}/export.mp4?fps=12
GET    /api/frames/{id}/export.gif?fps=12
GET    /api/balance              → último saldo conocido + tabla de costes
GET    /api/frames/dirs          → secuencias ya guardadas en disco
POST   /api/frames/export-dir    → arma MP4/GIF de una carpeta de cuadros en disco
GET    /api/balance/probe        → comprueba el saldo (gasta 0.0001 si hay saldo)
POST   /api/animate-local        → MP4 con ffmpeg desde un still, sin coste
```

Body de `/api/frames`: `prompt`, `sheet` (hoja, tiene prioridad) o `motion` (fallback:
línea por cuadro), `base_image` (ruta bajo `outputs/`, p.ej. `1792678257-41e3d7a1.jpg`
o `frames/<job>/frame-01.jpg`), `frames` (2-24), `provider`, `model`, `size`, `seed`,
`negative_prompt`, `background`, `anchor` (`first|previous|both`), `cutout`.

Los cuadros quedan en `outputs/frames/<job_id>/frame-NN.jpg` (+ `-alpha.png` si `cutout`).
Junto a ellos `job.json` guarda la request (prompt, hoja, base, frames) — por eso los
jobs sobreviven reinicios y se les puede **añadir cuadros**. Secuencias antiguas sin
`job.json` se ven y se exportan pero no se pueden ampliar (400 explicando el motivo).

**Bloques en la UI**: la sección *Secuencias* (encima de *Historial*) muestra cada
secuencia como tarjeta con sus cuadros dentro: ▶ reproduce la animación en la propia
tarjeta (fps del selector *FPS export*), *＋ Añadir* abre un formulario (nº de cuadros +
delta opcional) que llama a `/extend`, y MP4/GIF exportan desde disco. Clic en el
thumb carga el primer cuadro en el visor.

**Timeline (⏱ en cada tarjeta)**: modal con filmstrip editable de la secuencia.
- Cada cuadro = thumbnail + acción; clic carga ese cuadro en el visor.
- Hoja editable: acción (presets) + delta libre por fila; fila 1 deshabilitada si hay
  imagen base (es la X, inmutable). Cambios marcan la fila más antigua modificada.
- *↺ Regenerar desde cambio* → `/regenerate` (borra desde esa fila y rehace el resto
  con la hoja editada). El botón *↺* de cada fila regenera exactamente desde esa fila.
- *＋ Añadir al final* → `/extend` con N cuadros nuevos (hold).
- *✦ Rehacer hoja* → pide al LLM gratis una hoja nueva para el mismo prompt (no
  aplica hasta pulsar Regenerar). Con imagen base, fila 1 se queda en hold.
- FPS 8–60 con duración en vivo = cuadros ÷ FPS; el servidor sube el FPS si
  duraría >10 s. El máximo de cuadros es 60 (2–60).
Cada entrada lleva `action` (beat de la hoja). El MP4/GIF se arma con `ffmpeg`
(h264 yuv420p; GIF con `palettegen`/`paletteuse`). Las hojas ya generadas viven en el
job (`job["request"]["sheet"]`).

**Ancla**:
- `first` — todos los cuadros se editan desde el cuadro 1 (o la imagen base X): menos
  drift de identidad. **Es la recomendada con imagen base.**
- `previous` — cada cuadro parte del anterior: más continuo, pero acumula error (el
  rostro degrada a partir del cuadro 6-8).
- `both` — base + cuadro anterior como dos referencias (FLUX.2 acepta hasta 4).

**Consejo**: un cuadro = un cambio. Deltas cortos y mecánicos ("da un paso", "salta"),
no emociones. Acciones con anatomía humana ("left foot", "arms up") sobre un sujeto
no humano empujan al modelo a inventar un humano: usa frases neutras ("takes a step",
"leaps into the air").

## Coste y balance de pollen

El saldo es limitado. La API responde **402 `INSUFFICIENT_BALANCE`** cuando el modelo
cuesta pollen y no hay saldo. JMRV lo traduce a un error accionable (saldo, coste,
enlace de recarga) y guarda el último saldo conocido en `outputs/balance.json`.

Coste real medido por imagen a 512x512 (pollen):

| modelo | coste | notas |
|---|---|---|
| `dreamshaper` / `sana` | 0.0001 | los más baratos; aún necesitan saldo |
| `flux` | 0.0020 | |
| `z-image` | 0.0040 | |
| `flux-klein` | 0.0050 | 10 referencias |
| `gpt-image-1-mini` | 0.0095 | 16 referencias, buena identidad |
| `microsoft/mai-image-2.6-flash` | 0.0159 | |
| `gpt-image-2` | 0.0302 | mejor calidad |
| `black-forest-labs/flux.1-kontext-pro` | 0.0300 | 1 referencia, editor de imagen |

Recarga: <https://enter.pollinations.ai/top-up>.

Con saldo 0 **no hay generación por API** (el alias `flux` también cobra 0.0020).
Alternativa sin coste: **animación local** con ffmpeg sobre un still existente.

Los modelos de vídeo (veo, etc.) no están disponibles en esta key (`/video/models` = `[]`)
y `/video/{prompt}` responde 402.

## Proveedor Cloudflare Workers AI (alternativa a Pollinations)

`provider: "cloudflare"` en `/api/generate` y en el selector **Proveedor** de la UI.
Usa Workers AI en vez de Pollinations: **10.000 neuronas/día gratis** (reset 00:00 UTC),
Workers Paid cobra $0.011/1.000 de más.

```
.env:
  CLOUDFLARE_TOKEN=cfut_...
  CLOUDFLARE_ACCOUNT_ID=<32 hex>
```

Llamada directa:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/ai/run/@cf/black-forest-labs/flux-1-schnell" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"prompt":"...","steps":4}'
```

Secuencias con Cloudflare: proveedor **Cloudflare**, modelo `flux-2-klein-4b`.

**Gotcha verificado (raíz del "no conserva la misma base")**: las referencias FLUX.2
van en campos `input_image_0..3` (NO `image`) y deben medir **menos de 512×512**
(JMRV las reescala solo, `_fit_ref`). Con el campo `image` el modelo IGNORA la
referencia y hace t2i del texto: sujetos inventados cuadro a cuadro. Con el fix
verificado: zorro de cristal, 4 cuadros, misma identidad (cara, material, cola),
pose → paso → salto → parado, ~26 neuronas/cuadro a 512². FLUX.2 acepta hasta 4 refs.
Modelos sin `image_input` (`flux-1-schnell`) no sirven para secuencia.

Precios por imagen (neurons, tabla oficial) y equivalencia en cuota diaria (10.000):

| modelo | 512² | 1024² | notas |
|---|---|---|---|
| `flux-1-schnell` | ~48 | ~173 | solo `prompt` y `steps`; tamaño fijo 1024² |
| `flux-2-klein-4b` | ~26 | ~104 | genera y edita |
| `flux-2-klein-9b` | — | ~1364 | alta calidad, caro |
| `flux-2-dev` | variable | variable | multi-referencia, 18,75/tile/paso in + 37,5 out |
| `lucid-origin` | ~684 | ~2544 | Leonardo, 25% de la cuota diaria |
| `phoenix-1.0` | ~570 | ~2120 | Leonardo |

Notas verificadas:
- El esquema de `flux-1-schnell` acepta solo `prompt` y `steps`: `num_steps`, `width`,
  `height` y `seed` devuelven error 5006 ("Additional or unevaluated properties").
  El tamaño de salida es fijo 1024×1024. Pasarle `steps` no cambia el coste (172,8).
- Los modelos con edición (`flux-2-klein-*`, `flux-2-dev`, SDXL, Leonardo) exigen
  **multipart**: JSON puro devuelve 5006 "required properties at '/' are 'multipart'".
  Campos de referencia: `input_image_0..3` para FLUX.2; `image` para los legacy
  (SDXL, dreamshaper, Leonardo).
- La respuesta es `{"result": {"image": "<base64>", "usage": {"neurons": 172.8}}}`.
  Los bytes son JPEG aunque el campo diga `image`.
- `usage.neurons` solo lo devuelve `flux-1-schnell` (172,8 por imagen 1024²). El resto de
  modelos no lo incluyen: JMRV estima con la tabla oficial de precios y marca la entrada
  como `neurons_estimated`. El gasto real se ve en el dashboard de Workers AI.
- JMRV acumula el gasto en `outputs/neurons.json` (día UTC) y lo muestra en la píldora
  "neuronas: X / 10000".
- Un token de inferencia (Workers AI Read/Write) **no** puede leer el saldo real:
  `/accounts` y GraphQL devuelven vacío o "not authorized". Para leerlo hace falta otro
  token con *Account Analytics Read* + el Account ID, y consultar
  `aiInferenceAdaptiveGroups.sum.totalNeurons` (GraphQL) para la fecha UTC de hoy.
- `/ai/models` responde 10001 con un token de inferencia: la lista de modelos de CF está
  fija en `CF_IMAGE_MODELS` (server.py).

Modelos de texto a imagen en Workers AI: `flux-1-schnell`, `flux-2-klein-4b` (genera **y
edita**), `flux-2-klein-9b`, `flux-2-dev` (multi-referencia), `dreamshaper-8-lcm`,
`stable-diffusion-xl-base-1.0`, `stable-diffusion-xl-lightning`, `leonardo/lucid-origin`,
`leonardo/phoenix-1.0`.

## Animación local (sin API)

```
POST /api/animate-local
{ "file": "1792...jpg",
  "motion": "zoom_in|zoom_out|pan_left|pan_right|pan_up|pan_down",
  "seconds": 4, "fps": 24, "width": 1024, "height": 1024 }
```

Devuelve un MP4 (zoompan + h264) guardado en `outputs/`. Botón *▶ Animar* en la UI con
el resultado en pantalla. Cuesta 0 pollen y sirve para loops, parallax y previews mientras
no hay saldo.

## Reglas que importan

- **Sin alfa nativo.** Pollinations devuelve JPEG opaco y su flag `transparent=true` es
  rechazado con HTTP 400 (verificado en flux y z-image). Para un personaje con fondo
  transparente:
  1. pon **Fondo (para recorte)** = `blanco sólido` o `verde croma` — se añade la cláusula
     de fondo sólido al prompt;
  2. pulsa **✂ Quitar fondo** → rembg `u2netp` → PNG con canal alfa real.
  - `rembg` y `pillow` ya están instalados en `.venv`; el modelo (~5 MB) se descarga una
    vez en el primer recorte (~30 s) y luego es instantáneo.
  - Sin rembg: fondo verde + chroma key en el editor.
- **JPEG** es el formato por defecto.
- **Seed** = reproducibilidad. Mismo prompt + modelo + seed = misma imagen. Bloquea el
  seed (🔒) mientras iteras composición; 🎲 aleatoriza.
- **`private=true` + `nofeed=true`** saca los resultados del feed público. Déjalos activos.
- **`nologo=true`** quita la marca de agua.
- **Calidad**: `low|medium|high|hd`. `hd` es más lento y más caro.
- La generación tarda 5–60 s; timeout del servidor 300 s.
- **`background`** (`auto`/`white`/`green`) es un sufijo de prompt de JMRV, no un flag de la API.
- **Secuencia sin saldo**: el job se pausa (`state: paused`) en el primer 402 y conserva
  los cuadros ya generados. Tras recargar, `POST /api/frames/{id}/resume` continúa desde
  el último cuadro.

## Teclado


`⌘↵` generar · `Esc` cierra la lightbox.

## Seguridad

La clave vive en `~/Downloads/JMRV/.env` (nunca la commitees; `.gitignore` cubre `.venv/`,
añade `.env` si la carpeta llega a ser repo). El servidor solo escucha en `127.0.0.1`:
no lo expongas públicamente sin añadir auth.
