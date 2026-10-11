# Osito (Tecnosito) — backend

Mascota del taller de programacion agentica: un osito que conversa, escucha
por el microfono, genera imagenes y cambia de animo. Este backend (FastAPI)
sirve la pantalla de `frontend/` y expone la API que ella consume. Todo corre
en la propia maquina (Edge AI): Ollama para el texto, faster-whisper para la
voz, sd-turbo o una lamina de demostracion para las imagenes.

## Requisitos

- macOS o Linux con Python 3.11+ (probado con 3.13 en Apple Silicon).
- [Ollama](https://ollama.com) corriendo en `http://localhost:11434` con el
  modelo `qwen3:1.7b` (`ollama pull qwen3:1.7b`). Sin Ollama el osito sigue
  respondiendo con la FAQ (`backend/faq.json`).
- Opcional: `ffmpeg` para pruebas de audio desde la terminal (el servidor no lo
  necesita: decodifica con PyAV).

## Arranque

```bash
cd osito
./arrancar.sh                # crea ../.venv si falta, instala y arranca con recarga
./arrancar.sh --sin-recarga  # para demostraciones
```

Abre `http://127.0.0.1:8765`. Si el puerto esta ocupado, `OSITO_PUERTO=8766 ./arrancar.sh`.

La primera llamada a cada motor es lenta (carga perezosa): whisper small tarda
~1 s en cargar, sd-turbo ~6 s, el modelo de embeddings de la FAQ ~3 s.

## Variables de entorno

| Variable            | Por defecto                | Para que sirve                                                   |
|---------------------|----------------------------|------------------------------------------------------------------|
| `OSITO_MODELO`      | `qwen3:1.7b`               | Modelo de Ollama. Con `qwen3*` se desactiva el razonamiento.     |
| `OSITO_NOMBRE`      | `Tecnosito`                | Nombre del osito en el system prompt y en las laminas demo.      |
| `OSITO_WHISPER`     | `small`                    | Tamano de faster-whisper (`tiny`, `base`, `small`...). CPU int8. |
| `OSITO_IMAGEN`      | `auto`                     | `auto` usa sd-turbo si esta en cache, si no demo; `sd-turbo`; `demo`. |
| `OSITO_OLLAMA_URL`  | `http://localhost:11434`   | Donde vive Ollama. Apuntarla a `http://localhost:1` fuerza la FAQ. |
| `OSITO_EMBED`       | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Modelo fastembed para la FAQ. |
| `OSITO_FAQ_UMBRAL`  | `0.55`                     | Similitud minima (coseno) para aceptar una respuesta de la FAQ.  |
| `OSITO_SD_PASOS`    | `2`                        | Pasos de sd-turbo (1 a 4).                                       |
| `OSITO_PUERTO`      | `8765`                     | Puerto de `arrancar.sh`.                                         |

## Activar sd-turbo

El modelo pesa ~2,4 GB (variante fp16). Descargalo una vez:

```bash
../.venv/bin/python -c "from diffusers import AutoPipelineForText2Image as P; P.from_pretrained('stabilityai/sd-turbo', variant='fp16')"
```

Con `OSITO_IMAGEN=auto` el servidor lo detecta en la cache de Hugging Face
(`unet/diffusion_pytorch_model.fp16.safetensors`) y lo usa en `mps` (Apple
Silicon, float16) o en `cpu` (float32). Si la salida saliera negra, reintenta
solo con float32 y luego con CPU. Medido en un Mac M-series: carga 5,8 s,
primera imagen ~20 s (incluye carga), siguientes ~2,3 s a 512x512 y 2 pasos.

## API

| Ruta                | Entrada                                                          | Salida                                                          |
|---------------------|------------------------------------------------------------------|-----------------------------------------------------------------|
| `POST /api/chat`    | `{"mensaje", "historial": [{"rol": "usuario"\|"osito", "texto"}]}` | `{"texto", "animo", "fuente": "ollama"\|"faq"}`                 |
| `POST /api/stt`     | multipart, campo `audio` (webm/ogg/wav/m4a)                      | `{"texto", "idioma", "segundos"}`                               |
| `POST /api/imagen`  | `{"prompt", "estilo": "profesional"\|"kawaii"\|"tecnico"}`        | `{"url": "/imagenes/<id>.png", "motor": "sd-turbo"\|"demo", "segundos"}` |
| `GET  /api/salud`   | —                                                                | `{"ollama": bool, "whisper": bool, "imagen", "modelo"}`         |
| `GET  /api/estado`  | —                                                                | contenido de `../obra/estado.json` o `{"proyecto":"","pct":0,"pasos":[]}` |
| `GET  /`            | —                                                                | `frontend/index.html`; `/imagenes/` sirve los PNG generados     |

`animo` es uno de `feliz`, `pensando`, `sorprendido`, `triste`, `emocionado`,
`neutral`: el modelo lo elige en la ultima linea `ANIMO: ...`, que se recorta
de la respuesta. Errores: siempre JSON `{"error": "..."}` (422 si falta un
campo, 502 si el motor fallo). Documentacion interactiva en `/api/docs`.

Prueba rapida con el servidor levantado:

```bash
../.venv/bin/python backend/prueba_api.py            # 8765
../.venv/bin/python backend/prueba_api.py http://127.0.0.1:8766
```

## Notas sobre el audio

Chrome manda `audio/webm;codecs=opus` y muchas veces sin nombre de archivo:
el servidor deduce la extension del `content-type` y decodifica con PyAV
(`av`), que trae su propio ffmpeg. faster-whisper 1.2.1 no es compatible con
PyAV 19 (`av.open(metadata_errors=...)`), por eso `motores.decodificar_audio`
hace la decodificacion y le pasa el array a 16 kHz. Probado con wav y
webm/opus generados con `ffmpeg`.

## Limitaciones honestas

- Ollama **no** genera imagenes: eso lo hace sd-turbo o el modo demo (lamina
  con Pillow). El modo demo no dibuja el prompt, solo lo titula.
- sd-turbo en CPU tarda 20–60 s por imagen; en `mps` unos 2–3 s.
- whisper `small` en CPU corre a ~1x tiempo real; `tiny` es mas rapido y menos
  preciso. Sin voz (ruido, tono puro) devuelve texto vacio, no error.
- fastembed no soporta `intfloat/multilingual-e5-small`; se usa MiniLM
  multilingue, cuyas similitudes para aciertos reales van de 0,60 a 0,82, de
  ahi el umbral 0,55 (con e5 seria 0,80). Si no puede cargar el modelo, la
  FAQ cae a similitud lexica.
- Un solo proceso: las peticiones pesadas (imagen, voz) se serializan con locks.

## Flyers con texto real

Un modelo de difusion no sabe escribir. Cuando el pedido contiene "flyer", "afiche",
"volante", "poster", "banner" o "invitacion" (o el frontend manda `tipo: "flyer"`),
`backend/flyer.py` arma la pieza en tres pasos:

1. El LLM local extrae un JSON con titulo, subtitulo, descripcion, fecha, hora, precio,
   lugar, ponente, contacto y una descripcion visual en ingles. Un regex manda sobre
   fecha, hora y precio para que el modelo pequeno no los altere.
2. sd-turbo pinta solo el fondo (512x640, sin texto).
3. Pillow compone la tipografia: etiqueta, titulo, chips de fecha/hora/lugar,
   descripcion, ponente, contacto e insignia de precio. Salida 1080x1350 (4:5).

La respuesta de `/api/imagen` trae `motor: "flyer/sd-turbo"` y los `datos` extraidos,
asi el usuario puede corregir un campo y pedir de nuevo. Tarda 8 a 10 s en un Mac M.

## Niveles de calidad de imagen

`/api/imagen` acepta `calidad`: `rapida`, `buena` (por defecto) o `maxima`. Cada nivel cae al
anterior si su modelo no esta descargado. `GET /api/salud` lista en `motores_imagen` los que hay.

| Nivel | Modelo | Peso | Tiempo medido (Mac M, 24 GB) | RAM | Requisito |
|---|---|---|---|---|---|
| rapida | sd-turbo fp16 | 2,4 GB | 1,4 a 2,3 s a 512 px | 5 GB | diffusers, cualquier GPU o CPU |
| buena | sdxl-turbo fp16 | 7 GB | 5 a 7 s a 640x800 (flyer completo 7 s) | 12 GB | diffusers, 16 GB de RAM |
| maxima | FLUX.2 Klein 4B, 4 bits | 4,6 GB | 32 a 55 s a 1 MP | 8 GB | `pip install mflux`, solo Apple Silicon |

Descargas (una sola vez; usar `HF_HUB_DISABLE_XET=1` porque el protocolo xet se queda colgado en
algunas redes):

```bash
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sd-turbo', allow_patterns=['*.json','*.txt','tokenizer/*','scheduler/*','*/*.fp16.safetensors'])"
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sdxl-turbo', allow_patterns=['*.json','*.txt','tokenizer*/*','scheduler/*','*/*.fp16.safetensors'])"
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('mflux-community/flux2-klein-4b-mflux-q4')"
```

Un flyer en `maxima` tarda unos 45 s (2 s de extraccion con el LLM + 40 s de fondo + 1 s de
composicion). En `rapida`, unos 9 s. Ejemplos en `../capturas/06-flyer-php.png` (sd-turbo),
`../capturas/09-flyer-php-sdxl.png` (sdxl-turbo) y `../capturas/07-flyer-php-klein.png` (Klein).

## Maquinas de los alumnos (relevadas el 08-10-2026)

Correr `python backend/diagnostico.py` en cada laptop: dice el acelerador, la memoria y el
nivel de imagen que le toca. El backend aplica ese tope solo: pedir `maxima` en una maquina
que solo aguanta `rapida` devuelve `rapida` sin error.

| Alumno | Maquina | torch usa | Nivel | Tiempo por imagen (estimado) | Nota de instalacion |
|---|---|---|---|---|---|
| Junior | Win10, 16 GB, RTX 5060 8 GB, i5-14400F | CUDA | buena (sdxl-turbo con cpu offload) | 2 a 4 s | RTX 50 necesita torch con CUDA 12.8: `pip install torch --index-url https://download.pytorch.org/whl/cu128` |
| Alex | Ubuntu 24.04, 16 GB, RTX 3050 4 GB, i5-11300H | CUDA | rapida (sd-turbo en VRAM); buena posible con offload, lenta | 2 s / 15 s | `pip install torch --index-url https://download.pytorch.org/whl/cu126` |
| Kelvin | Win11, 32 GB, RX 5700 XT, Ryzen 3700X | CPU (AMD en Windows no tiene ROCm) | buena en CPU fp32 (14 GB de RAM) | 60 a 120 s; rapida 20 a 30 s | torch normal de PyPI; no intentar DirectML |
| Aron | Win11, 16 GB, Radeon 780M integrada, Ryzen 8700G | CPU | rapida | 25 a 40 s | torch normal; la iGPU no se usa |
| David R. | Windows, 16 GB, i5, GPU por verificar | CPU salvo que tenga NVIDIA | rapida | 30 a 60 s | si tiene NVIDIA, torch cu126 |
| Docente | Mac Apple Silicon, 24 GB | MPS + MLX | maxima (FLUX.2 Klein) | 45 s; buena 7 s | `pip install mflux` |

Reglas que aplica `imagen.tope_por_capacidad()`:

- CUDA con 6 GB o mas de VRAM: `sdxl-turbo` (con `enable_model_cpu_offload` si hay menos de 10 GB). Menos de 6 GB: `sd-turbo`.
- Apple Silicon con 16 GB o mas y mflux instalado: `flux2-klein`. Sin mflux: `sdxl-turbo`.
- Solo CPU: `sdxl-turbo` si hay 24 GB o mas de RAM (fp32 pide 14 GB), si no `sd-turbo`.

Para la clase: que cada alumno descargue solo el nivel que le toca, por USB o la noche anterior.
`sd-turbo` (2,4 GB) alcanza para todos; `sdxl-turbo` (7 GB) solo Junior, Kelvin y el docente.
Whisper `small` y `qwen3:1.7b` corren en CPU en todas estas maquinas.
