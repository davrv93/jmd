---
name: imagenes-locales
description: Genera imágenes y flyers con modelos de difusión que corren en la propia máquina (Edge AI, sin nube) y elige el nivel que cada equipo aguanta: sd-turbo, sdxl-turbo o FLUX.2 Klein con mflux; tubería de flyer donde el LLM extrae los datos, la difusión pinta solo el fondo y Pillow compone el texto; descargas de Hugging Face sin colgarse; medición real de memoria. Palabras gatillo: imagen local, generar imagen, flyer, afiche, póster, difusión, stable diffusion, sd-turbo, sdxl-turbo, FLUX, mflux, diffusers, Hugging Face, "las letras salen mal", "texto inventado", VRAM, "qué modelo cabe en mi máquina".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Imágenes locales: niveles, tope por máquina y flyers con texto real

## Cuándo usar

- Cuando un asistente o una app tiene que producir una imagen sin mandar nada a la nube: una lámina para el chat, un fondo, un flyer para redes.
- Cuando el pedido trae texto que debe leerse (título, fecha, hora, precio, lugar). Un modelo de difusión no sabe escribir; aquí está la tubería que lo resuelve.
- Antes de un taller en el que cada alumno correrá el modelo en su laptop: aquí está la tabla de qué cabe en qué máquina y cómo bajar los pesos sin reventar la red del aula.
- Cuando "la imagen tarda" o "se come toda la memoria" y hay que decidir con cifras, no con sensaciones.
- No lo uses para elegir la paleta ni la tipografía del flyer (eso es `diseno-visual`) ni para relevar las máquinas de los alumnos (eso es `relevar-maquinas`, que usa esta tabla).

## Principios

1. **La difusión pinta, no escribe.** Toda letra que deba leerse la compone Pillow encima del fondo. El modelo recibe la orden explícita de no dibujar texto, pantallas ni código.
2. **Los datos duros los manda un regex, no el LLM.** Fecha, hora y precio salen del pedido con expresiones regulares; el modelo pequeño solo rellena lo que el regex no encontró. Un LLM de 1,7B altera cifras y adorna nombres si se le deja.
3. **Un modelo en memoria a la vez.** Cambiar de nivel descarga el anterior. Dos modelos cargados en una máquina de 16 GB es un cuelgue seguro.
4. **El nivel lo decide la máquina, no el usuario.** El usuario pide "máxima"; el sistema le da lo máximo que su equipo aguanta y lo dice en la respuesta (`motor`), sin error.
5. **Medir la huella con la herramienta correcta.** En macOS los pesos en MPS viven fuera del RSS: `ps -o rss` miente (157 MB frente a 4,97 GB reales). Se mide con `footprint -p <pid>`.
6. **La red del aula no es un canal de descarga.** Los pesos se bajan la noche anterior o se reparten por USB; en clase solo se cargan.
7. **Primera imagen y siguientes son dos cifras distintas.** La primera incluye cargar el modelo; se reportan las dos y se dice cuál es cuál.

## Niveles y modelos (medidos el 10-10-2026 en Mac Apple Silicon, 24 GB)

| Nivel | Modelo | Peso en disco | Tiempo medido | Huella en memoria | Dónde corre |
|---|---|---|---|---|---|
| rápida | `stabilityai/sd-turbo` fp16 | 2,4 GB | 1,4 a 2,3 s por imagen de 512 px; primera ~20 s con carga | 5 GB | diffusers, cualquier GPU o CPU |
| buena | `stabilityai/sdxl-turbo` fp16 | 7 GB | 7 s el flyer en caliente, 27 s la primera | 12 GB | diffusers, 16 GB de RAM o 6 GB de VRAM |
| máxima | `mflux-community/flux2-klein-4b-mflux-q4` (FLUX.2 Klein 4B, 4 bits, mflux 0.22) | 4,6 GB | 32 a 55 s por imagen de 1 MP; flyer completo 45 s | 8 GB | solo Apple Silicon con 16 GB o más y `pip install mflux` |

Observaciones que valen más que la tabla:

- sdxl-turbo en caliente es más rápido que sd-turbo y se ve mucho mejor. Si la máquina lo aguanta, es el nivel por defecto.
- Un flyer en máxima se reparte así: 2 s de extracción con el LLM, 40 s de fondo, 1 s de composición. En rápida son unos 9 s en total.
- Todo junto en la Mac de la demo: Ollama `qwen3:1.7b` ~1,5 GB, whisper small ~0,5 GB, Chrome con Three.js ~0,4 GB, sd-turbo 5 GB. Con sdxl-turbo la suma pasa de 14 GB; en una máquina de 16 GB no queda sitio para nada más.

## Tope por máquina

Regla que aplica `tope_por_capacidad()` (fragmento abajo):

| Máquina | Acelerador que usa torch | Nivel máximo | Nota |
|---|---|---|---|
| NVIDIA con 6 GB o más de VRAM | CUDA | sdxl-turbo | con `enable_model_cpu_offload()` si hay menos de 10 GB |
| NVIDIA con menos de 6 GB | CUDA | sd-turbo | sdxl posible con offload, pero lento |
| Apple Silicon con 16 GB o más y mflux | MPS + MLX | flux2-klein | sin mflux instalado: sdxl-turbo |
| Apple Silicon con menos de 16 GB | MPS | sd-turbo | |
| Solo CPU con 24 GB o más de RAM | CPU fp32 | sdxl-turbo | fp32 pide 14 GB; 60 a 120 s por imagen |
| Solo CPU con menos de 24 GB | CPU fp32 | sd-turbo | 20 a 60 s por imagen |
| AMD en Windows (RX 5700 XT, Radeon 780M) | CPU | según RAM | Windows no tiene ROCm; no perder tiempo con DirectML |
| Intel o AMD integrada | CPU | según RAM | torch no la usa |
| RTX 50 (Blackwell) | CUDA 12.8 | según VRAM | torch normal no la ve: `pip install torch --index-url https://download.pytorch.org/whl/cu128` |

Máquinas reales relevadas para el taller: RTX 5060 8 GB (buena con offload), RTX 3050 4 GB en Ubuntu (rápida), RX 5700 XT con 32 GB (buena en CPU fp32), Radeon 780M integrada (rápida en CPU), i5 sin GPU conocida (rápida en CPU).

## Procedimiento paso a paso

### A. Diagnosticar antes de descargar

1. Corre el diagnóstico en la máquina destino: `python backend/diagnostico.py`. Imprime acelerador, memoria útil, nivel máximo y qué modelo falta descargar.
2. Anota el nivel que le toca. No descargues nada por encima de él: ocupa disco y nunca se usará.

### B. Descargar los pesos

3. Desactiva el protocolo xet y baja solo la variante fp16 con `allow_patterns`. El xet se quedó dos horas en 1,1 GB; con `HF_HUB_DISABLE_XET=1` baja a 11 MB/s sostenidos.
   ```bash
   HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sd-turbo', allow_patterns=['*.json','*.txt','tokenizer/*','scheduler/*','*/*.fp16.safetensors'])"
   ```
   Para sdxl-turbo el patrón de tokenizer es `tokenizer*/*`; para Klein no hace falta filtrar.
4. Una descarga a la vez. Dos en paralelo se frenan entre sí.
5. No juzgues el avance por el tamaño de los `.incomplete`: se reservan antes de llenarse. Mira la velocidad del proceso o el log de `huggingface_hub`.
6. En un aula: descarga la noche anterior o reparte por USB la carpeta `~/.cache/huggingface/hub/models--stabilityai--sd-turbo`. La red del aula no aguanta cinco descargas de 2,4 GB.

### C. Generar una imagen suelta

7. Pide al modelo objetos, luces, formas y colores. Nunca "código brillante", "pantalla con texto" ni "cartel que diga X": los modelos FLUX obedecen tanto el prompt positivo que "código brillante" produce letras.
8. Usa `guidance_scale=0.0` y 2 pasos en sd-turbo, 4 en sdxl-turbo y Klein. Más pasos no mejoran los turbo.
9. Si la imagen sale negra en fp16 (NaN), reintenta con fp32 y después en CPU. Detecta el negro con `np.asarray(img).max() <= 8`.

### D. Tubería de flyer (LLM extrae, difusión pinta, Pillow compone)

10. Detecta el pedido de flyer por palabras (flyer, afiche, volante, póster, banner, invitación, anuncio, cartel) o por el campo `tipo: "flyer"` del frontend.
11. Pasa primero el regex: fecha (`\d{1,2} de (enero|...)`), hora (`\d{1,2}(:\d{2})? (am|pm)`), precio (`S/ \d+` o `\d+ soles`). Lo que encuentre, manda.
12. Pide al LLM un JSON con `format: "json"`, temperatura 0,1 y claves fijas: título, subtítulo, descripción, fecha, hora, precio, lugar, ponente, contacto y `tema_visual` en inglés. La instrucción prohíbe marcas y apodos (el modelo inventó "PHP para Dummies" hasta que se le prohibió) y pide un fondo "sin personas, sin pantallas, sin código y sin letras".
13. Sustituye fecha, hora y precio por los del regex si el regex los encontró. Rellena vacíos con lo que el regex dedujo.
14. Pinta solo el fondo en vertical (512x640 en sd-turbo, 640x800 en sdxl-turbo, 896x1120 en Klein) con el `tema_visual` más el estilo y la coletilla "purely visual without any writing, calm empty space in the lower half".
15. Compón con Pillow a 1080x1350 (4:5): viñeta, panel inferior desenfocado y oscuro, etiqueta, título con sombra, línea de acento, chips de fecha, hora y lugar, descripción, pie con ponente y contacto, insignia de precio.
16. Devuelve en la respuesta los `datos` extraídos y quién los extrajo (`datos_por: ollama | regex`), para que el usuario corrija un campo y pida de nuevo sin repetir el pedido entero.

### E. Medir

17. Tiempo: `time.time()` alrededor de cada fase (extracción, fondo, composición) y repórtalas por separado.
18. Memoria en macOS: `footprint -p $(pgrep -f uvicorn | head -1) | tail -5`. En Linux con CUDA: `nvidia-smi --query-gpu=memory.used --format=csv`. Mide con el modelo cargado y una imagen ya generada, no al arrancar.

## Prompts por estilo (coletillas que funcionaron)

| Estilo | Coletilla |
|---|---|
| profesional | `elegant editorial illustration, premium corporate art, rich color grading, cinematic soft lighting, depth of field, ultra detailed` |
| kawaii | `cute kawaii illustration, pastel palette, soft rounded shapes, gentle shading, clean vector look, charming and polished` |
| técnico | `isometric technical illustration, blueprint lines, precise geometry, cool teal palette, subtle grid, crisp edges` |

Para fondos de flyer, antepón el `tema_visual` (8 a 15 palabras en inglés con objetos, luces y formas) y cierra con `poster key visual, purely visual without any writing`.

## Qué NO pedirle a un modelo de difusión

- Texto legible: títulos, fechas, precios, logotipos con nombre. sd-turbo produjo letras inventadas; Klein escribe letras cuando se le nombra "código".
- Pantallas, monitores, pizarras, carteles: terminan llenos de garabatos que parecen texto.
- Varias cosas a la vez en una máquina chica: dos modelos cargados o dos descargas en paralelo.
- Más de 4 pasos en un modelo turbo: no mejora, solo tarda.
- Que respete una cifra o un nombre propio: eso lo escribe Pillow con lo que extrajo el regex.

## Reglas duras

- Nunca se dibuja texto con el modelo de difusión. Toda tipografía la pone Pillow.
- Nunca se confía al LLM fecha, hora ni precio si el regex los encontró en el pedido.
- Nunca se carga un nivel por encima del tope de la máquina aunque el usuario lo pida: se baja al tope y se informa en `motor`.
- Nunca dos modelos de difusión en memoria a la vez; nunca dos descargas de Hugging Face en paralelo.
- Nunca se descarga en clase ni sin `HF_HUB_DISABLE_XET=1` y `allow_patterns` de fp16.
- Nunca se mide memoria en macOS con `ps -o rss`; solo con `footprint`.
- Nunca `ImageDraw` con relleno semitransparente sobre RGBA esperando mezcla: no mezcla alfa, pinta opaco. Color sólido calculado a mano o capa aparte con `Image.alpha_composite`.
- Nunca se reporta solo la primera imagen ni solo la imagen en caliente: las dos cifras, etiquetadas.

## Lista de comprobación

- [ ] `diagnostico.py` corrido en la máquina destino y nivel anotado.
- [ ] Pesos descargados con `HF_HUB_DISABLE_XET=1` y solo fp16; una descarga a la vez.
- [ ] El prompt del fondo no nombra texto, pantallas ni código.
- [ ] Regex de fecha, hora y precio pasa antes que el LLM y manda sobre él.
- [ ] La instrucción del LLM prohíbe marcas y apodos y pide `tema_visual` sin letras.
- [ ] Pillow compone a 1080x1350 con chips de color sólido y título con sombra.
- [ ] La respuesta devuelve `datos`, `datos_por`, `motor` y `segundos`.
- [ ] Tiempos medidos por fase: extracción, fondo, composición; primera y en caliente.
- [ ] Huella medida con `footprint` (macOS) o `nvidia-smi` (CUDA) con el modelo cargado.
- [ ] Un solo modelo en memoria; cambiar de nivel descarga el anterior.

## Fragmentos

Tope por máquina, versión simplificada de `backend/imagen.py`:

```python
def tope_por_capacidad(dispositivo: str, memoria_gb: float, ram_gb: float, hay_mflux: bool) -> str:
    """dispositivo: cuda | mps | cpu. memoria_gb: VRAM en cuda, RAM en el resto."""
    if dispositivo == "mps" and hay_mflux and ram_gb >= 16:
        return "flux2-klein"
    if dispositivo == "cuda":
        return "sdxl-turbo" if memoria_gb >= 6 else "sd-turbo"   # con cpu offload si < 10 GB
    if dispositivo == "mps":
        return "sdxl-turbo" if ram_gb >= 16 else "sd-turbo"
    return "sdxl-turbo" if ram_gb >= 24 else "sd-turbo"          # CPU puro: sdxl fp32 pide ~14 GB

# Al pedir una calidad, nunca por encima del tope ni de lo descargado:
ORDEN = ["flux2-klein", "sdxl-turbo", "sd-turbo"]
def resolver(pedido: str, tope: str, descargados: set[str]) -> str:
    inicio = max(ORDEN.index(pedido), ORDEN.index(tope))
    return next((n for n in ORDEN[inicio:] if n in descargados), "demo")
```

Composición con Pillow: chip de color sólido mezclado a mano y título con sombra. `ImageDraw` no mezcla alfa, así que el "22 de 255 de blanco" se calcula antes de dibujar.

```python
from PIL import Image, ImageDraw, ImageFont

def mezclar(base: tuple, encima: tuple, alfa: float) -> tuple:
    """Color sólido equivalente a pintar `encima` con opacidad `alfa` sobre `base`."""
    return tuple(int(b * (1 - alfa) + e * alfa) for b, e in zip(base, encima))

def chip(d: ImageDraw.ImageDraw, xy, texto, fuente, fondo_panel, tinta, alto=64, pad=26) -> int:
    x, y = xy
    relleno = mezclar(fondo_panel, (255, 255, 255), 0.22)      # y no (255, 255, 255, 22)
    w = int(d.textlength(texto, font=fuente)) + pad * 2
    d.rounded_rectangle((x, y, x + w, y + alto), radius=alto // 2, fill=relleno)
    d.text((x + pad, y + alto / 2), texto, font=fuente, fill=tinta, anchor="lm")
    return w

def titulo_con_sombra(d, xy, lineas, fuente):
    x, y = xy
    for linea in lineas:
        d.text((x + 3, y + 4), linea, font=fuente, fill=(0, 0, 0))     # sombra: sólida y desplazada
        d.text((x, y), linea, font=fuente, fill=(255, 255, 255))
        y += int(fuente.size * 1.12)
    return y

# Si de verdad hace falta transparencia (panel de vidrio), va en una capa aparte:
lienzo = fondo.convert("RGBA")
capa = Image.new("RGBA", lienzo.size, (0, 0, 0, 0))
ImageDraw.Draw(capa).rounded_rectangle((56, 620, 1024, 1294), radius=40, fill=(15, 18, 34, 218))
lienzo = Image.alpha_composite(lienzo, capa)
d = ImageDraw.Draw(lienzo)
```

## Versión corta para modelos pequeños

Generas imágenes con un modelo de difusión local. Sigue estas órdenes:

1. Antes de descargar, corre `python backend/diagnostico.py`. Usa el nivel que diga; no bajes modelos más grandes.
2. Niveles: rápida = sd-turbo (2,4 GB, 5 GB de RAM, 2 s en Mac M). Buena = sdxl-turbo (7 GB, 12 GB de RAM, 7 s). Máxima = FLUX.2 Klein con mflux (4,6 GB, 8 GB de RAM, 45 s, solo Mac con 16 GB o más).
3. Tope: NVIDIA con 6 GB o más de VRAM → sdxl-turbo. Menos → sd-turbo. Solo CPU con 24 GB o más → sdxl-turbo; si no, sd-turbo. AMD o Intel en Windows → CPU.
4. Descarga con `HF_HUB_DISABLE_XET=1` y solo `*.fp16.safetensors`. Una descarga a la vez. Nunca en clase.
5. El modelo de difusión NO escribe texto. Nunca le pidas letras, pantallas ni código. Pídele objetos, luces y formas.
6. Para un flyer: primero regex de fecha, hora y precio. Después el LLM devuelve un JSON con título, subtítulo, descripción, lugar, ponente, contacto y `tema_visual` en inglés sin letras. El regex manda sobre el LLM.
7. Prohíbe al LLM marcas y apodos en el título.
8. Pinta solo el fondo en vertical. Compón el texto con Pillow a 1080x1350: título con sombra, chips de fecha, hora y lugar, insignia de precio.
9. En Pillow, un chip semitransparente se dibuja con color sólido calculado a mano. `ImageDraw` no mezcla alfa.
10. Devuelve al usuario los datos extraídos para que corrija antes de regenerar.
11. Un solo modelo en memoria. Cambiar de nivel descarga el anterior.
12. Mide memoria en Mac con `footprint -p <pid>`, no con `ps`.

Prohibido: texto dibujado por el modelo. Prohibido: cargar por encima del tope. Prohibido: dos descargas o dos modelos a la vez.
