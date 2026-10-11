---
id: ej-flyer-texto-real
title: "Un flyer con texto real: LLM + difusión + Pillow"
summary: Por qué un modelo de difusión no escribe, cómo se reparte el trabajo en tres piezas y cómo pedir, revisar y corregir un flyer por la API.
tags: [imagenes-locales, difusion, flyer, edge-ai, curl]
level: intermedio
lesson: pa-02
phase: experiencia
order: 11
---
Pide a sd-turbo «un cartel que diga Liquidación 20 %» y te devuelve un cartel con garabatos que
**parecen** letras. Este ejemplo muestra por qué pasa y cómo lo resuelve el asistente del taller.

## 1. Por qué falla pedirle texto

Un modelo de difusión aprende a pintar: formas, luces, colores y texturas que se parecen a las
de millones de imágenes. **No sabe leer ni escribir.** Cuando le pides letras, pinta «cosas con
forma de letra». sd-turbo produce garabatos; FLUX dibuja letras inventadas si le nombras
«código» o «pantalla». Y en un flyer, el título, la fecha, la hora y el precio son justo lo que
no puede salir mal.

Pruébalo tú mismo con una imagen suelta (no flyer) y verás el problema:

```bash
curl -s -X POST http://localhost:8765/api/imagen \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "cartel que diga LIQUIDACION 20 por ciento", "estilo": "profesional", "tipo": "ilustracion"}'
```

Abre la `url` que devuelve. Letras que no son letras.

## 2. Las tres piezas

| Pieza | Quién | Qué hace |
|---|---|---|
| Extraer los datos | el LLM local (`qwen3:1.7b`) y un **regex** | Del pedido saca título, subtítulo, descripción, fecha, hora, precio, lugar, ponente, contacto y una descripción visual en inglés. **El regex manda** sobre fecha, hora y precio: el modelo pequeño las altera si se le deja |
| Pintar el fondo | el modelo de difusión de tu nivel | Solo el fondo, en vertical, con la orden explícita de no dibujar texto, pantallas ni código |
| Componer el texto | **Pillow** (Python) | Título con sombra, chips de fecha, hora y lugar, descripción, pie con contacto e insignia de precio. Salida 1080x1350 |

El backend entra en esta tubería cuando el pedido contiene «flyer», «afiche», «volante»,
«póster», «banner» o «invitación», o cuando mandas `tipo: "flyer"`.

## 3. Pide el flyer por la API

```bash
curl -s -X POST http://localhost:8765/api/imagen \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "flyer de la liquidación de verano de la tienda, sábado 18 de octubre a las 10 am, todo a S/ 20, en el local del centro",
    "estilo": "profesional",
    "tipo": "flyer",
    "calidad": "buena"
  }'
```

`calidad` acepta `rapida`, `buena` (por defecto) o `maxima`. Si tu máquina no aguanta el nivel
pedido, el backend baja al que sí aguanta y lo dice en `motor`, sin error.

## 4. Qué devuelve

```json
{
  "url": "/imagenes/3f2a9c1e.png",
  "motor": "flyer/sdxl-turbo",
  "segundos": 7.4,
  "datos": {
    "titulo": "Liquidación de verano",
    "subtitulo": "Todo a un solo precio",
    "descripcion": "Ropa de temporada con descuentos por un solo día.",
    "fecha": "sábado 18 de octubre",
    "hora": "10 am",
    "precio": "S/ 20",
    "lugar": "local del centro",
    "ponente": "",
    "contacto": "",
    "tema_visual": "sunlit clothing racks, pastel fabrics, soft morning light, clean shop interior"
  },
  "datos_por": "regex"
}
```

| Campo | Para qué lo miras |
|---|---|
| `motor` | Qué nivel se usó de verdad (`flyer/sd-turbo`, `flyer/sdxl-turbo`, `flyer/flux2-klein` o `flyer/demo`) |
| `segundos` | Cuánto tardó. La primera vez incluye cargar el modelo; anota la primera y la segunda por separado |
| `datos` | Lo que el LLM entendió. **Esto es lo que debes revisar** antes de compartir el flyer |
| `datos_por` | `regex` si fecha, hora y precio salieron del regex (fiable); `ollama` si las puso el modelo (revisa con más cuidado) |

Abre `http://localhost:8765/imagenes/3f2a9c1e.png`. El fondo lo pintó la difusión; **todas las
letras las puso Pillow** con los valores de `datos`. Por eso se leen.

## 5. Corregir un dato y regenerar

Supón que el modelo puso `"hora": "10 pm"` o inventó un apodo en el título. No repitas el
pedido entero: en la pantalla del asistente, el bloque **«Datos del flyer»** deja editar un
campo y pulsar «Regenerar». Por la API, mandas el pedido con el dato corregido escrito de forma
inequívoca, para que el regex lo capture:

```bash
curl -s -X POST http://localhost:8765/api/imagen \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "flyer: Liquidación de verano. sábado 18 de octubre, 10 am, S/ 20, local del centro", "estilo": "profesional", "tipo": "flyer", "calidad": "buena"}'
```

Vuelve a mirar `datos`. La fecha, la hora y el precio deben coincidir letra por letra con lo que
pediste.

## 6. El ejercicio con trampa

Genera el flyer correcto. Cambia **a propósito** la hora y regenera. Pásale el segundo flyer a
un compañero sin decirle nada y pregúntale si está bien. Si no detecta el cambio, es un hallazgo
de **severidad 4**: el sistema produjo un dato falso y el usuario no lo notó. Eso es lo que el
bloque de datos intenta evitar.

## Comprobaciones

- `datos.fecha`, `datos.hora` y `datos.precio` coinciden exactos con tu pedido.
- El fondo no tiene letras ni garabatos (si las tiene, el prompt visual nombró texto, pantallas
  o código).
- `motor` corresponde al nivel que dijo `diagnostico.py` para tu máquina.
- Tiempos de referencia: 9 s en rápida, 7 s en buena (en caliente), 45 s en máxima. En CPU, de
  25 a 60 s es normal.
