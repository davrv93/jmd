# PLAN DE TRABAJO: <<NOMBRE_DEL_ROBOT>>, el asistente web de <<NEGOCIO>>

Estados válidos: pendiente · en curso · hecha · bloqueada (motivo)
Avance: 0 de 15 tareas hechas (0 %)
Tiempo: construcción F0 a F5 ≈ 46 min · pruebas F6 ≈ 8 min · una sola tarea «en curso» a la vez

## Prompt para tu agente

Abre `jmd` en tu terminal del aula y pega esto tal cual (también está en `PROMPT_ARMAR_ROBO.md`):

```text
Eres mi ingeniero de software en el aula. Vamos a construir MI robot web desde cero, tarea por tarea.

1. Lee /trabajo/plan-robo/PLAN_TRABAJO.md y los skills s2-robo-aula, s2-robo-chat, s2-robo-avatar, s2-robo-voz, s2-robo-imagen, s2-robo-flyer y s2-robo-pruebas. No escribas código todavía.
2. Hazme estas 6 preguntas, UNA por una, y espera cada respuesta: (a) nombre del robot, (b) mi negocio o idea, (c) tono de voz, (d) color principal, (e) tres preguntas frecuentes de mi negocio con su respuesta, (f) estilo de las imágenes y un pedido de flyer con fecha, hora y precio.
3. Con mis respuestas reescribe /trabajo/plan-robo/PLAN_TRABAJO.md: sustituye cada marcador en MAYÚSCULAS entre dobles flechas por mi valor (en la tabla «Personaliza aquí» escribe mi valor en la columna «Tu valor»), conserva los IDs y los criterios de aceptación y adapta los ejemplos a mi negocio. Enséñame el plan y espera mi «ok».
4. Construye en /trabajo/robo, UNA tarea a la vez y en orden. Antes de cada tarea lee el skill s2-* que el plan indica.
5. Usa solo lo que ya existe: texto http://ai-orchestrator:4000 (modelo "clase"), imagen http://imagen:8000, clave en $OSITO_TOKEN. No descargues modelos ni escribas claves en archivos.
6. Al terminar cada tarea ejecuta su criterio de aceptación y pégame la salida. Si falla, corrige y repite; no avances.
7. Solo si el criterio da sí, marca la tarea «hecha» en el plan con la hora y empieza la siguiente.
8. Reglas: español, respuestas cortas, rutas absolutas, sin bash (usa sh), la voz siempre apagada al inicio.

Empieza ahora por el paso 1 y la primera pregunta.
```

## Personaliza aquí

El agente te pregunta estos datos y los escribe en la columna «Tu valor». También puedes pedirle que cambie cualquiera después.

| Dato | Qué poner | Ejemplo (bórralo) | Tu valor |
|---|---|---|---|
| `NOMBRE_DEL_ROBOT` | Nombre corto | Robo | |
| `NEGOCIO` | A qué te dedicas, en una frase | una tienda de ropa en Lima | |
| `TONO` | Cómo habla, en tres palabras | cercano y breve | |
| `COLOR` | Color principal en hexadecimal | #2f6bff | |
| `TRES_PREGUNTAS_DE_TU_NEGOCIO` | Tres preguntas que siempre te hacen, cada una con su respuesta (PREGUNTA_1, 2 y 3) | ¿Cuál es el horario? Lunes a sábado, de 9 am a 7 pm. | |
| `ESTILO_DE_IMAGEN` | Estilo visual, escrito en INGLÉS | flat pastel illustration, soft light | |
| `PEDIDO_DE_IMAGEN` | Una imagen que le pedirías | un robot amable saludando en mi tienda | |
| `PEDIDO_DE_FLYER` | Un flyer con la fecha como «18 de octubre», la hora como «10 am» y el precio como «S/ 20» | flyer de la liquidación el sábado 18 de octubre a las 10 am a S/ 20 | |

## Alcance

**Hecho significa:** abres el visor en `robo` y ves a <<NOMBRE_DEL_ROBOT>>, un robot 3D. Le haces una de tus tres preguntas y responde con tu dato y cambia de ánimo. Dictas la pregunta por el micrófono y ves el texto antes de enviarla. Enciendes el parlante y habla (arranca apagado). Le pides una imagen y un flyer con fecha, hora y precio exactos.

**No entra:** cuentas de usuario, historial guardado, WhatsApp, publicar fuera del aula, descargar modelos.

## Contrato (se cierra antes de construir)

| Ruta | Entra | Sale |
|---|---|---|
| `GET /api/salud` | nada | `{nombre, llm, imagen}` |
| `POST /api/chat` | `{mensaje, historial: [{rol, texto}]}` | `{texto, animo, fuente}` con `animo` en feliz, pensando, sorprendido, triste, emocionado o neutral |
| `POST /api/imagen` | `{prompt, tipo: auto o imagen o flyer, calidad: baja o media o maxima, orientacion}` | `{url, tipo, motor, segundos}` más `prompt_en` (imagen) o `datos` (flyer) |
| `POST /api/voz` (opcional) | `{texto}` | audio WAV (Piper); el visor la reenvía |

Servicios que ya existen en el aula (ver `s2-robo-aula`): texto `http://ai-orchestrator:4000` con `model: "clase"`; imagen y voz `http://imagen:8000`; clave `$OSITO_TOKEN`. El visor solo reenvía `/api/chat`, `/api/imagen`, `/api/voz`, `/api/salud`, `/api/stt` y `/api/estado`.

## Fase 0: Preparación

Hito: el plan es tuyo y el entorno responde (5 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F0-T1 | Personalizar este plan con tus datos | `grep -c '<<[A-Z0-9_]*>>' /trabajo/plan-robo/PLAN_TRABAJO.md` imprime `0` | 3 | — | pendiente | |
| F0-T2 | Comprobar el entorno y guardar tu personalidad | Los 4 comandos de abajo dan lo esperado | 2 | F0-T1 | pendiente | |

**F0-T1** · Pídele: pega el prompt de arriba y responde las 6 preguntas. Servicio: ninguno.

**F0-T2** · Pídele: «/skill s2-robo-aula. Crea /trabajo/robo, robo.sh y personalidad.json con los valores de mi plan». Servicios: gateway de texto y servicio de imagen.
```sh
test -n "$OSITO_TOKEN" && echo token-ok                                   # token-ok
curl -s -o /dev/null -w '%{http_code}\n' http://ai-orchestrator:4000/health   # 200
curl -s http://imagen:8000/salud                                          # contiene "ok":true
python3 -c "import json;print(json.load(open('/trabajo/robo/personalidad.json'))['nombre'])"   # <<NOMBRE_DEL_ROBOT>>
```

## Fase 1: El robot conversa

Hito: mostrar a un compañero, en 1 minuto, a <<NOMBRE_DEL_ROBOT>> respondiendo una de tus tres preguntas con tu dato (10 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F1-T1 | Escribir el cerebro que habla con el modelo `clase` | `python3 -c "import cerebro; print(cerebro.chat(...))"` imprime `(texto, animo)` con tu dato | 5 | F0-T2 | pendiente | |
| F1-T2 | Levantar el servidor con `/api/salud` y `/api/chat` | `salud` da `"llm": true` y `chat` responde tu pregunta | 5 | F1-T1 | pendiente | |

**F1-T1** · Pídele: «/skill s2-robo-chat. Crea cerebro.py con mi personalidad.json». Servicio: texto `clase` (DeepSeek, Qwen o GLM según disponibilidad), con razonamiento apagado: 1 a 3 s.
```sh
cd /trabajo/robo && python3 -c "import cerebro; print(cerebro.chat('<<PREGUNTA_1>>', []))"
```
Debe imprimir una tupla: el texto con la respuesta de tu pregunta 1 y un ánimo de los seis válidos.

**F1-T2** · Pídele: «/skill s2-robo-chat. Crea servidor.py con /api/salud y /api/chat y arranca con robo.sh». Servicio: el mismo.
```sh
sh /trabajo/robo/robo.sh reiniciar
curl -s localhost:8766/api/salud    # {"nombre":"<<NOMBRE_DEL_ROBOT>>","llm":true}
curl -s -X POST localhost:8766/api/chat -H 'Content-Type: application/json' -d '{"mensaje":"<<PREGUNTA_1>>","historial":[]}'
```
La segunda devuelve `texto` con tu dato y `animo` válido. Una pregunta vacía (`"mensaje":""`) devuelve 422.

## Fase 2: El robot se ve y reacciona

Hito: mostrar a un compañero, en 1 minuto, que <<NOMBRE_DEL_ROBOT>> cambia de ánimo al responder (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F2-T1 | Crear la pantalla con el robot 3D y el chat | En el visor, `robo` muestra el robot; al preguntar pasa a «pensando» y luego cambia de ánimo | 6 | F1-T2 | pendiente | |
| F2-T2 | Poner tu nombre y tu color | El título dice <<NOMBRE_DEL_ROBOT>> y la interfaz usa <<COLOR>> | 2 | F2-T1 | pendiente | |

**F2-T1** · Pídele: «/skill s2-robo-avatar. Crea index.html y app.js con el robot 3D y el chat». Servicio: el módulo del robot que sirve el LMS (sin instalar nada).
```sh
curl -s localhost:8766/ | grep -c 'id="robot"'    # 1
```
Después ábrelo en el visor: selecciona `robo` (o escribe `robo/index.html`) y haz tu pregunta 1.

**F2-T2** · Pídele: «/skill s2-robo-avatar. Cambia el color de la interfaz a <<COLOR>> y tiñe el robot de ese tono». Prueba: recarga el visor y compara con tu valor de la tabla.

## Fase 3: Voz opcional y micrófono

Hito: mostrar a un compañero, en 1 minuto, que la voz arranca apagada y que dictas una pregunta (6 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F3-T1 | Añadir el botón de parlante (voz apagada por defecto) | Al cargar dice «Voz: apagada» y no suena; al encenderlo, <<NOMBRE_DEL_ROBOT>> habla | 3 | F2-T1 | pendiente | |
| F3-T2 | Añadir el micrófono a texto | Pulsas Mic en Chrome, dices tu pregunta y el texto aparece en la caja antes de enviar | 3 | F2-T1 | pendiente | |
| F3-T3 | (Opcional) Probar la voz Piper del servidor | El `curl` de abajo imprime `200` y un tamaño mayor de 1000 | 2 | F1-T2 | pendiente | |

**F3-T1 y F3-T2** · Pídele: «/skill s2-robo-voz. Añade el parlante apagado por defecto y el micrófono». Servicios: voz y dictado del navegador (sin servidor, sin descargas).

**F3-T3** · Servicio: Piper, voz es_MX del servicio de imagen. Solo `curl` (el visor no reenvía `/api/voz`).
```sh
curl -s -o /tmp/voz.wav -w '%{http_code} %{size_download}\n' -X POST http://imagen:8000/voz -H "Authorization: Bearer $OSITO_TOKEN" -H 'Content-Type: application/json' -d '{"texto":"Hola"}'
```

## Fase 4: El robot dibuja

Hito: mostrar a un compañero, en 1 minuto, una imagen pedida a <<NOMBRE_DEL_ROBOT>> en calidad baja y otra en media (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F4-T1 | Crear `/api/imagen` con traducción a inglés y calidad | `curl` devuelve `url`, `motor` `local-baja` y `segundos` cerca de 6; la URL da `200 image/jpeg` | 5 | F1-T2 | pendiente | |
| F4-T2 | Añadir el selector de calidad y el botón Dibujar | En el visor, el pedido de imagen se ve en el chat con motor y segundos | 3 | F4-T1, F2-T1 | pendiente | |

**F4-T1** · Pídele: «/skill s2-robo-imagen. Crea pintor.py y la ruta /api/imagen con mi ESTILO_DE_IMAGEN». Servicios: texto `clase` (traduce el pedido a inglés) e imagen `http://imagen:8000/generar`. Baja ≈ 6 s, media ≈ 13 s, máxima ≈ 3 a 10 s.
```sh
curl -s -X POST localhost:8766/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"<<PEDIDO_DE_IMAGEN>>","tipo":"imagen","calidad":"baja"}'
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' localhost:8766/<url devuelta>     # 200 image/jpeg
```

**F4-T2** · Pídele: «/skill s2-robo-imagen. Añade el selector de calidad y el botón Dibujar a la pantalla». Prueba: pide la imagen en baja y en media y anota los segundos. Además `curl -s http://imagen:8000/salud` dice si `maxima` está disponible; un `calidad: "ultra"` devuelve 422.

## Fase 5: El robot hace flyers

Hito: mostrar a un compañero, en 1 minuto, un flyer con tu fecha, hora y precio exactos (9 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F5-T1 | Extraer los datos del flyer a JSON | `flyer.extraer(...)` devuelve fecha, hora y precio iguales a tu pedido | 4 | F4-T1 | pendiente | |
| F5-T2 | Componer el flyer: fondo del modelo y texto con Pillow | `datos` exactos y la imagen mide `(1080, 1350)` | 5 | F4-T1, F5-T1 | pendiente | |

**F5-T1** · Pídele: «/skill s2-robo-flyer. Crea flyer.py con la función extraer». Servicio: texto `clase` en modo JSON; el regex manda sobre fecha, hora y precio.
```sh
cd /trabajo/robo && python3 -c "import flyer; print(flyer.extraer('<<PEDIDO_DE_FLYER>>'))"
```

**F5-T2** · Pídele: «/skill s2-robo-flyer. Termina flyer.py: pinta solo el fondo y escribe el texto con Pillow». Servicios: imagen `http://imagen:8000/generar` (solo el fondo, sin letras) y Pillow (el texto).
```sh
curl -s -X POST localhost:8766/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"<<PEDIDO_DE_FLYER>>","tipo":"flyer","calidad":"baja"}'
python3 -c "from PIL import Image; print(Image.open('/trabajo/robo/<url devuelta>').size)"     # (1080, 1350)
```
En el visor, lee en la imagen fecha, hora y precio: deben ser IGUALES a tu pedido y a `datos`.

## Fase 6: Probar y medir

Hito: mostrar la tabla de pruebas y los tiempos de tu equipo (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F6-T1 | Correr las pruebas automáticas y anotar los tiempos | `python3 pruebas.py` sale con código 0 y todas dicen PASA | 3 | F5-T2, F3-T2 | pendiente | |
| F6-T2 | Hacer la prueba de uso con una persona de otro equipo | `MEDICIONES.md` con 3 tareas, su tiempo, dónde dudó y UNA mejora | 5 | F6-T1 | pendiente | |

**F6-T1** · Pídele: «/skill s2-robo-pruebas. Crea pruebas.py y córrelo con --maxima».
```sh
cd /trabajo/robo && python3 pruebas.py --maxima; echo "código=$?"      # código=0
```

**F6-T2** · Pídele: «/skill pruebas-de-uso. Prepárame la hoja de 3 tareas y guarda los resultados en MEDICIONES.md». Tareas sugeridas: preguntar un dato de tu negocio, pedir una imagen, pedir el flyer.

## Tiempos esperados por calidad de imagen

| Calidad | Con qué se pinta | Imagen | Flyer | Tamaño | Tu medición |
|---|---|---|---|---|---|
| baja | sd-turbo local, 1 paso | ≈ 6 s | ≈ 8 a 10 s | 384 px | |
| media | sd-turbo local, 2 pasos | ≈ 13 s | ≈ 15 a 17 s | 512 px | |
| máxima | FLUX en Cloudflare | ≈ 3 a 10 s | ≈ 5 a 14 s | hasta 1024 px | |

Chat: 1 a 3 s. El flyer suma 2 a 4 s de extracción de datos. Baja y media comparten cola con toda la clase y la primera imagen tras un rato sin uso tarda más. La máxima tiene cupo diario: si se agota (error 429), Robo pinta en media. Anota la hora de cada medición.

## Lista de verificación final

- [ ] `grep -c '<<[A-Z0-9_]*>>' /trabajo/plan-robo/PLAN_TRABAJO.md` imprime `0`
- [ ] `curl -s localhost:8766/api/salud` dice `"llm": true` e `"imagen": true`
- [ ] El chat responde tu pregunta 1 con tu dato y un ánimo válido
- [ ] El robot se ve en el visor y cambia de ánimo al responder
- [ ] La voz arranca apagada y suena solo al encender el parlante
- [ ] El micrófono muestra el texto antes de enviar
- [ ] La imagen en calidad baja tarda cerca de 6 s y la URL da `200 image/jpeg`
- [ ] El flyer tiene fecha, hora y precio exactos y mide 1080x1350
- [ ] `python3 pruebas.py` sale con código 0
- [ ] `MEDICIONES.md` tiene 3 tareas de uso, sus tiempos y una mejora
- [ ] `grep -rnE "Bearer [A-Za-z0-9_-]{16,}" /trabajo/robo` no imprime nada (ninguna clave en archivos)

## Registro de avance

| Fecha y hora | Qué se cerró | Quién lo vio | Observación |
|---|---|---|---|
| | | | |

## Fuera de alcance (apareció durante la ejecución)

- (anota aquí lo nuevo que no entra; no lo hagas en silencio)
