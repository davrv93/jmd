# PLAN DE TRABAJO: <<NOMBRE_DEL_ROBOT>>, el asistente web de <<NEGOCIO>>

Estados válidos: pendiente · en curso · hecha · bloqueada (motivo)
Avance: 0 de 15 tareas hechas (0 %)
Tiempo: construcción F0 a F5 ≈ 49 min · pruebas F6 ≈ 8 min · una sola tarea «en curso» a la vez
Versión del kit: robo-local-nube (todo por la nube del curso: no se instalan modelos; imagen solo en calidad «maxima»)
Criterios en Windows y Mac: cada tarea se comprueba con `python herramientas/verificar.py <ID>` (por ejemplo `F1-T2`), que dice PASA o FALLA sin necesitar sh, curl ni grep. Los comandos `sh` de cada tarea son la misma prueba para quien los tenga.

## Prompt para tu agente

Deja corriendo el aula local (`sh iniciar.sh`; en Windows `iniciar.bat`), prepara la terminal del agente con `. ./entorno.sh` (Windows PowerShell: `. .\entorno.ps1`), abre tu agente en la carpeta del kit y pega esto tal cual (también está en `PROMPT_ARMAR_ROBO.md`):

```text
Eres mi ingeniero de software. Vamos a construir MI robot web desde cero, tarea por tarea, en este kit.

1. Lee trabajo/plan-robo/PLAN_TRABAJO.md y los skills s2-robo-aula, s2-robo-chat, s2-robo-avatar, s2-robo-voz, s2-robo-imagen, s2-robo-flyer y s2-robo-pruebas (carpeta skills/). No escribas código todavía.
2. Hazme estas 6 preguntas, UNA por una, y espera cada respuesta: (a) nombre del robot, (b) mi negocio o idea, (c) tono de voz, (d) color principal y avatar (robot u osito), (e) tres preguntas frecuentes de mi negocio con su respuesta, (f) estilo de las imágenes y un pedido de flyer con fecha, hora y precio.
3. Valida mis respuestas: el nombre, saneado a 1-24 letras, números, espacio, punto o guion; el color, en hexadecimal #rrggbb (si digo un nombre de color, conviértelo y enséñamelo); el avatar, robot u osito. Si algo no cuadra, pregúntamelo otra vez.
4. Con mis respuestas reescribe trabajo/plan-robo/PLAN_TRABAJO.md: sustituye cada marcador en MAYÚSCULAS entre dobles flechas por mi valor (en la tabla «Personaliza aquí» escribe mi valor en la columna «Tu valor»), conserva los IDs y los criterios de aceptación y adapta los ejemplos a mi negocio. Enséñame el plan y espera mi «ok».
5. Construye en trabajo/robo, UNA tarea a la vez y en orden. Antes de cada tarea lee el skill s2-* que el plan indica.
6. Usa solo lo que ya existe: texto http://127.0.0.1:8800 (modelo "clase"), imagen y voz http://127.0.0.1:8800/imagen, dictado http://127.0.0.1:8800/stt, clave en $OSITO_TOKEN. Solo existe la calidad de imagen "maxima": "baja" y "media" no están disponibles en esta versión. No descargues modelos, no instales paquetes y no escribas claves en archivos.
7. Al terminar cada tarea ejecuta su criterio de aceptación y pégame la salida. Si falla, corrige y repite; no avances.
8. Solo si el criterio da sí, marca la tarea «hecha» en el plan con la hora y empieza la siguiente.
9. Reglas: español, respuestas cortas, comandos que funcionen en Windows y en Mac (con python; nada de bash, fork ni rutas con \), arranca y reinicia Robo con python trabajo/robo/robo.py, comprueba cada criterio también con python herramientas/verificar.py <ID>, la voz siempre apagada al inicio. El avatar se elige y se tiñe con los parámetros de montarAvatar (modulos/avatar.js): nunca copies ni reescribas los módulos 3D.

Empieza ahora por el paso 1 y la primera pregunta.
```

## Personaliza aquí

El agente te pregunta estos datos y los escribe en la columna «Tu valor». También puedes pedirle que cambie cualquiera después: todo vive en `trabajo/robo/personalidad.json` y el código lo lee de ahí.

| Dato | Qué poner | Ejemplo (bórralo) | Tu valor |
|---|---|---|---|
| `NOMBRE_DEL_ROBOT` | Nombre corto: 1 a 24 letras, números, espacio, punto o guion | Robo | |
| `NEGOCIO` | A qué te dedicas, en una frase | una tienda de ropa en Lima | |
| `TONO` | Cómo habla, en tres palabras (hasta 60 caracteres) | cercano y breve | |
| `COLOR` | Color principal en hexadecimal `#rrggbb` (si dices «verde», el agente lo convierte) | #2f6bff | |
| `AVATAR` | `robot` u `osito`; se tiñe con tu color | robot | |
| `TRES_PREGUNTAS_DE_TU_NEGOCIO` | Tres preguntas que siempre te hacen, cada una con su respuesta (PREGUNTA_1, 2 y 3) | ¿Cuál es el horario? Lunes a sábado, de 9 am a 7 pm. | |
| `ESTILO_DE_IMAGEN` | Estilo visual, escrito en INGLÉS | flat pastel illustration, soft light | |
| `PEDIDO_DE_IMAGEN` | Una imagen que le pedirías | un robot amable saludando en mi tienda | |
| `PEDIDO_DE_FLYER` | Un flyer con la fecha como «18 de octubre», la hora como «10 am» y el precio como «S/ 20» | flyer de la liquidación el sábado 18 de octubre a las 10 am a S/ 20 | |

**Reglas de las variaciones** (las comprueba `python herramientas/revisar.py personalidad`):

- El avatar se elige (`robot` u `osito`) y se tiñe SOLO con los parámetros de `montarAvatar` de `modulos/avatar.js`. Los módulos 3D (`modulos/*.js`) nunca se copian, se editan ni se reescriben (lo comprueba `python herramientas/revisar.py modulos`).
- El color siempre en hexadecimal válido; el nombre saneado (sin comillas, `<`, `>` ni emojis) y pintado como texto, nunca como HTML.
- Cambiar de avatar, de color o de nombre es editar `personalidad.json` y reiniciar Robo: el código no cambia.

## Alcance

**Hecho significa:** abres el visor en `robo` y ves a <<NOMBRE_DEL_ROBOT>>, tu <<AVATAR>> 3D teñido de <<COLOR>>. Le haces una de tus tres preguntas y responde con tu dato y cambia de ánimo. Dictas la pregunta por el micrófono (la transcribe el servidor del curso) y ves el texto antes de enviarla. Enciendes el parlante y habla (arranca apagado). Le pides una imagen en calidad máxima y un flyer con fecha, hora y precio exactos.

**No entra:** cuentas de usuario, historial guardado, WhatsApp, publicar fuera de tu máquina, descargar modelos, instalar paquetes, calidades de imagen «baja» y «media» (no disponibles en esta versión), otros avatares que no sean robot u osito.

## Contrato (se cierra antes de construir)

| Ruta | Entra | Sale |
|---|---|---|
| `GET /api/salud` | nada | `{nombre, avatar, color, llm, imagen, stt, voz}` |
| `POST /api/chat` | `{mensaje, historial: [{rol, texto}]}` | `{texto, animo, fuente}` con `animo` en feliz, pensando, sorprendido, triste, emocionado o neutral |
| `POST /api/imagen` | `{prompt, tipo: auto o imagen o flyer, calidad: maxima, orientacion}` | `{url, tipo, motor, segundos}` más `prompt_en` (imagen) o `datos` (flyer); `calidad` baja o media: 422 «no está disponible»; sin cupo: 429 con el motivo |
| `POST /api/stt` | audio (webm o wav) en el cuerpo | `{texto, segundos, recortado}` |
| `POST /api/voz` | `{texto}` | audio WAV (Piper) |

Servicios que ya existen (ver `s2-robo-aula`): texto `http://127.0.0.1:8800` con `model: "clase"`; imagen y voz `http://127.0.0.1:8800/imagen` (solo `maxima`); dictado `http://127.0.0.1:8800/stt`; clave `$OSITO_TOKEN`. El aula local los reenvía a la nube del curso con tu token, que vive fuera del kit. El visor solo reenvía `/api/chat`, `/api/imagen`, `/api/voz`, `/api/salud`, `/api/stt`, `/api/estado` y `/api/imagenes/*`.

## Fase 0: Preparación

Hito: el plan es tuyo y el entorno responde (5 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F0-T1 | Personalizar este plan con tus datos | `grep -c '<<[A-Z0-9_]*>>' trabajo/plan-robo/PLAN_TRABAJO.md` imprime `0` | 3 | — | pendiente | |
| F0-T2 | Comprobar el entorno y guardar tu personalidad | Los 4 comandos de abajo dan lo esperado | 2 | F0-T1 | pendiente | |

**F0-T1** · Pídele: pega el prompt de arriba y responde las 6 preguntas. Servicio: ninguno. Portable (Windows y Mac): `python herramientas/verificar.py F0-T1`.

**F0-T2** · Pídele: «/skill s2-robo-aula. Crea trabajo/robo, robo.py y personalidad.json con los valores de mi plan». Servicios: aula local (gateway del curso y servicio de imagen).
```sh
test -n "$OSITO_TOKEN" && echo token-ok                                    # token-ok
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8800/health      # 200 (tu token del curso vale)
curl -s http://127.0.0.1:8800/imagen/salud                                 # contiene "maxima":true y "baja":false
python herramientas/revisar.py personalidad                               # personalidad ok: <<NOMBRE_DEL_ROBOT>> · <<AVATAR>> · <<COLOR>> ...
```
Portable (Windows y Mac): `python herramientas/verificar.py F0-T2`.

## Fase 1: El robot conversa

Hito: mostrar a un compañero, en 1 minuto, a <<NOMBRE_DEL_ROBOT>> respondiendo una de tus tres preguntas con tu dato (10 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F1-T1 | Escribir el cerebro que habla con el modelo `clase` | `python -c "import cerebro; print(cerebro.chat(...))"` imprime `(texto, animo)` con tu dato | 5 | F0-T2 | pendiente | |
| F1-T2 | Levantar el servidor con `/api/salud` y `/api/chat` | `salud` da `"llm": true` y `chat` responde tu pregunta | 5 | F1-T1 | pendiente | |

**F1-T1** · Pídele: «/skill s2-robo-chat. Crea cerebro.py con mi personalidad.json». Servicio: texto `clase` del gateway del curso (DeepSeek, Qwen o GLM según disponibilidad), con razonamiento apagado: 1 a 3 s.
```sh
cd trabajo/robo && python -c "import cerebro; print(cerebro.chat('<<PREGUNTA_1>>', []))"
```
Portable (Windows y Mac): `python herramientas/verificar.py F1-T1`. Debe imprimir una tupla: el texto con la respuesta de tu pregunta 1 y un ánimo de los seis válidos.

**F1-T2** · Pídele: «/skill s2-robo-chat. Crea servidor.py con /api/salud y /api/chat y arranca con robo.py». Servicio: el mismo.
```sh
python trabajo/robo/robo.py reiniciar
curl -s localhost:8788/api/salud    # {"nombre":"<<NOMBRE_DEL_ROBOT>>","avatar":"<<AVATAR>>","color":"<<COLOR>>","llm":true,...}
curl -s -X POST localhost:8788/api/chat -H 'Content-Type: application/json' -d '{"mensaje":"<<PREGUNTA_1>>","historial":[]}'
```
Portable (Windows y Mac): `python herramientas/verificar.py F1-T2`. La segunda devuelve `texto` con tu dato y `animo` válido. Una pregunta vacía (`"mensaje":""`) devuelve 422.

## Fase 2: El robot se ve y reacciona

Hito: mostrar a un compañero, en 1 minuto, que <<NOMBRE_DEL_ROBOT>> cambia de ánimo al responder (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F2-T1 | Crear la pantalla con el avatar 3D y el chat | En el visor, `robo` muestra tu <<AVATAR>>; al preguntar pasa a «pensando» y luego cambia de ánimo | 6 | F1-T2 | pendiente | |
| F2-T2 | Poner tu nombre, tu color y tu avatar | `revisar.py personalidad` y `revisar.py modulos` dan ok; el título dice <<NOMBRE_DEL_ROBOT>>, la interfaz usa <<COLOR>> y el <<AVATAR>> sale teñido | 2 | F2-T1 | pendiente | |

**F2-T1** · Pídele: «/skill s2-robo-avatar. Crea index.html y app.js con mi avatar 3D y el chat». Servicio: los módulos del avatar que sirve el aula local (sin instalar nada).
```sh
curl -s localhost:8788/ | grep -c 'id="robot"'    # 1
```
Portable (Windows y Mac): `python herramientas/verificar.py F2-T1`. Después ábrelo en el visor: `http://127.0.0.1:8800/vista/yo/robo/` y haz tu pregunta 1.

**F2-T2** · Pídele: «/skill s2-robo-avatar. Usa mi nombre, mi color <<COLOR>> y mi avatar <<AVATAR>> desde personalidad.json, con los parámetros de montarAvatar».
```sh
python herramientas/revisar.py personalidad    # personalidad ok: <<NOMBRE_DEL_ROBOT>> · <<AVATAR>> · <<COLOR>> ...
python herramientas/revisar.py modulos         # modulos intactos
```
Portable (Windows y Mac): `python herramientas/verificar.py F2-T2`. Prueba en el visor: recarga; en la consola del navegador (F12) `robot.tipo` da `"<<AVATAR>>"` y `robot.color` da `"<<COLOR>>"`. Cambia `avatar` u otro color en `personalidad.json`, reinicia Robo y recarga: cambia sin tocar el código. Vuelve a tu valor al terminar.

## Fase 3: Voz opcional y micrófono

Hito: mostrar a un compañero, en 1 minuto, que la voz arranca apagada y que dictas una pregunta (9 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F3-T1 | Añadir el botón de parlante (voz apagada por defecto) | Al cargar dice «Voz: apagada» y no suena; al encenderlo, <<NOMBRE_DEL_ROBOT>> habla | 3 | F2-T1 | pendiente | |
| F3-T2 | Añadir el micrófono con dictado por el servidor | El `curl` de abajo devuelve un `texto` con «horario»; en el visor, Mic → hablas → Detener y el texto aparece en la caja antes de enviar | 4 | F2-T1 | pendiente | |
| F3-T3 | Probar la voz Piper del servidor | El `curl` de abajo imprime `200` y un tamaño mayor de 1000; con el parlante encendido suena la voz del servidor | 2 | F1-T2 | pendiente | |

**F3-T1, F3-T2 y F3-T3** · Pídele: «/skill s2-robo-voz. Añade el parlante apagado por defecto, la voz del servidor con la del navegador de respaldo, y el micrófono con dictado por el servidor». Servicios: dictado `http://127.0.0.1:8800/stt` (Whisper en el servidor del curso, 1 a 3 s por frase; si falla, el del navegador en Chrome) y voz Piper `http://127.0.0.1:8800/imagen/voz`.
```sh
curl -s -X POST localhost:8788/api/stt -H 'Content-Type: audio/wav' --data-binary @herramientas/prueba-voz.wav      # {"texto":"... horario ...",...}
curl -s -o trabajo/voz.wav -w '%{http_code} %{size_download}\n' -X POST localhost:8788/api/voz -H 'Content-Type: application/json' -d '{"texto":"Hola"}'   # 200 y más de 1000
```
Portable (Windows y Mac): `python herramientas/verificar.py F3-T1`, `F3-T2` y `F3-T3`.

## Fase 4: El robot dibuja

Hito: mostrar a un compañero, en 1 minuto, una imagen pedida a <<NOMBRE_DEL_ROBOT>> en calidad máxima y que «baja» dice que no está disponible (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F4-T1 | Crear `/api/imagen` con traducción a inglés, calidad máxima | `curl` devuelve `url`, `motor` `nube-maxima` y `segundos` entre 3 y 15; la URL da `200 image/jpeg`; `calidad: "baja"` da 422 «no está disponible» | 5 | F1-T2 | pendiente | |
| F4-T2 | Añadir el selector de calidad y el botón Dibujar | En el visor el selector solo deja elegir «máxima» (baja y media salen «no disponible»); el pedido se ve en el chat con motor y segundos | 3 | F4-T1, F2-T1 | pendiente | |

**F4-T1** · Pídele: «/skill s2-robo-imagen. Crea pintor.py y la ruta /api/imagen con mi ESTILO_DE_IMAGEN, solo en calidad máxima». Servicios: texto `clase` (traduce el pedido a inglés) e imagen `http://127.0.0.1:8800/imagen/generar` (FLUX en Cloudflare, ≈ 3 a 15 s, cupo diario de toda la clase).
```sh
curl -s -X POST localhost:8788/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"<<PEDIDO_DE_IMAGEN>>","tipo":"imagen","calidad":"maxima"}'
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' localhost:8788/<url devuelta>     # 200 image/jpeg
curl -s -w ' %{http_code}\n' -X POST localhost:8788/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"x","tipo":"imagen","calidad":"baja"}'   # ... no está disponible ... 422
```

Portable (Windows y Mac): `python herramientas/verificar.py F4-T1`.
**F4-T2** · Pídele: «/skill s2-robo-imagen. Añade el selector de calidad (solo máxima elegible) y el botón Dibujar a la pantalla». Prueba: pide la imagen en el visor y anota los segundos. Además `curl -s http://127.0.0.1:8800/imagen/salud` dice qué calidades hay; un `calidad: "ultra"` devuelve 422. Si se acabó el cupo del día, Robo lo dice en el chat (429): es lo esperado, no un fallo de tu código. Portable (Windows y Mac): `python herramientas/verificar.py F4-T2`.

## Fase 5: El robot hace flyers

Hito: mostrar a un compañero, en 1 minuto, un flyer con tu fecha, hora y precio exactos (9 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F5-T1 | Extraer los datos del flyer a JSON | `flyer.extraer(...)` devuelve fecha, hora y precio iguales a tu pedido | 4 | F4-T1 | pendiente | |
| F5-T2 | Componer el flyer: fondo del modelo y texto con Pillow | `datos` exactos y la imagen mide `(1080, 1350)` | 5 | F4-T1, F5-T1 | pendiente | |

**F5-T1** · Pídele: «/skill s2-robo-flyer. Crea flyer.py con la función extraer». Servicio: texto `clase` en modo JSON; el regex manda sobre fecha, hora y precio.
```sh
cd trabajo/robo && python -c "import flyer; print(flyer.extraer('<<PEDIDO_DE_FLYER>>'))"
```

Portable (Windows y Mac): `python herramientas/verificar.py F5-T1`.
**F5-T2** · Pídele: «/skill s2-robo-flyer. Termina flyer.py: pinta solo el fondo en calidad máxima y escribe el texto con Pillow». Servicios: imagen `http://127.0.0.1:8800/imagen/generar` (solo el fondo, sin letras; sin cupo, fondo liso de tu color) y Pillow (el texto).
```sh
curl -s -X POST localhost:8788/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"<<PEDIDO_DE_FLYER>>","tipo":"flyer","calidad":"maxima"}'
python -c "from PIL import Image; print(Image.open('trabajo/robo/<url devuelta>').size)"     # (1080, 1350)
```
Portable (Windows y Mac): `python herramientas/verificar.py F5-T2`. En el visor, lee en la imagen fecha, hora y precio: deben ser IGUALES a tu pedido y a `datos`.

## Fase 6: Probar y medir

Hito: mostrar la tabla de pruebas y los tiempos de tu equipo (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F6-T1 | Correr las pruebas automáticas y anotar los tiempos | `python pruebas.py` sale con código 0 y todas dicen PASA | 3 | F5-T2, F3-T2 | pendiente | |
| F6-T2 | Hacer la prueba de uso con una persona de otro equipo | `MEDICIONES.md` con 3 tareas, su tiempo, dónde dudó y UNA mejora | 5 | F6-T1 | pendiente | |

**F6-T1** · Pídele: «/skill s2-robo-pruebas. Crea pruebas.py y córrelo».
```sh
cd trabajo/robo && python pruebas.py; echo "código=$?"      # código=0
```
Portable (Windows y Mac): `python herramientas/verificar.py F6-T1`.

**F6-T2** · Pídele: «/skill pruebas-de-uso. Prepárame la hoja de 3 tareas y guarda los resultados en MEDICIONES.md». Tareas sugeridas: preguntar un dato de tu negocio, pedir una imagen, pedir el flyer. Portable (Windows y Mac): `python herramientas/verificar.py F6-T2`.

## Tiempos esperados por calidad de imagen

| Calidad | Con qué se pinta | Imagen | Flyer | Tamaño | Tu medición |
|---|---|---|---|---|---|
| baja | no disponible en esta versión | — (422) | — | — | |
| media | no disponible en esta versión | — (422) | — | — | |
| máxima | FLUX en Cloudflare (nube del curso) | ≈ 3 a 15 s | ≈ 5 a 19 s | hasta 1024 px | |

Chat: 1 a 3 s. Dictado de una frase de 5 s: 1 a 3 s. El flyer suma 2 a 4 s de extracción de datos. La máxima tiene un cupo diario para toda la clase (y quizá un tope por alumno): si se agota (error 429), Robo lo explica y el flyer sale con fondo liso. El cupo vuelve a las 00:00 UTC (19:00 en Lima). Anota la hora de cada medición.

## Lista de verificación final

- [ ] `python herramientas/verificar.py todo` dice «15 de 15 criterios pasan» (o, con sh, los comandos de cada tarea)
- [ ] `grep -c '<<[A-Z0-9_]*>>' trabajo/plan-robo/PLAN_TRABAJO.md` imprime `0`
- [ ] `curl -s localhost:8788/api/salud` dice `"llm": true`, `"imagen": true` y `"stt": true`
- [ ] `python herramientas/revisar.py todo` sale con código 0 (personalidad válida, módulos intactos, sin claves)
- [ ] El chat responde tu pregunta 1 con tu dato y un ánimo válido
- [ ] Tu avatar (robot u osito) se ve teñido de tu color y cambia de ánimo al responder
- [ ] La voz arranca apagada y suena solo al encender el parlante
- [ ] El micrófono muestra el texto dictado antes de enviar
- [ ] La imagen en calidad máxima llega y la URL da `200 image/jpeg`; «baja» dice que no está disponible
- [ ] El flyer tiene fecha, hora y precio exactos y mide 1080x1350
- [ ] `python pruebas.py` sale con código 0
- [ ] `MEDICIONES.md` tiene 3 tareas de uso, sus tiempos y una mejora

## Registro de avance

| Fecha y hora | Qué se cerró | Quién lo vio | Observación |
|---|---|---|---|
| | | | |

## Fuera de alcance (apareció durante la ejecución)

- (anota aquí lo nuevo que no entra; no lo hagas en silencio)
