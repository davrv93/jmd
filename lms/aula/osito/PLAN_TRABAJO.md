# Plan de trabajo — Tecnosito, asistente avatar 3D

Proyecto demo del taller de programación agéntica. Hecho con el skill
`plan-de-trabajo` y seguido en vivo con `obra-en-vivo`. Actualizado el
10-10-2026 con lo realmente hecho y medido.

Estados válidos: pendiente · en curso · hecha · bloqueada (motivo)
Avance: 16 de 18 tareas hechas (89 %)
Comando de avance: `python3 obra/obra.py paso "<Fx-Ty nombre>" --pct <pct>` (servido en 8797 porque 8787 está ocupado en la Mac del docente)

## Alcance

Un asistente virtual con avatar 3D: un osito tierno y tecnológico con estados
de ánimo, animaciones y voz. Responde consultas con un modelo local (Ollama,
`qwen3:1.7b`), convierte audio a texto en el equipo (faster-whisper `small`) y
genera imágenes y flyers con modelos de difusión locales en tres niveles de
calidad (sd-turbo, sdxl-turbo, FLUX.2 Klein) o, si no hay modelo descargado,
con un modo demo.

**Hecho significa:** abrir `http://localhost:8766`, ver al osito respirar y
parpadear, escribirle y que responda con voz y cambie de ánimo, dictarle por
micrófono y ver el texto antes de enviarlo, pedirle una imagen y recibirla, y
pedirle un flyer con fecha, hora y precio y que esos datos salgan legibles y
correctos.

**No entra:** cuentas de usuario, historial persistente, despliegue en
servidor, modelos en la nube.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Ollama no instalado en la laptop del alumno | Respaldo por FAQ con embeddings locales (MiniLM multilingüe, umbral 0,55) |
| El modelo de difusión pesa de 2,4 a 7 GB y la red del aula no aguanta 5 descargas a la vez | Descargar la noche anterior o repartir por USB; modo demo con Pillow si no llegó |
| El protocolo xet de Hugging Face se cuelga (2 h en 1,1 GB) | `HF_HUB_DISABLE_XET=1` en toda descarga (11 MB/s sostenidos); una descarga a la vez; solo fp16 con `allow_patterns` |
| AMD en Windows no tiene ROCm; Intel y AMD integradas no las usa torch | Asignar nivel de CPU de antemano con `diagnostico.py`; avisar que tarda 25 a 60 s y que no instalen drivers |
| RTX 50 (Blackwell) no la ve el torch normal | `pip install torch --index-url https://download.pytorch.org/whl/cu128` |
| Un modelo de difusión no escribe texto legible | Tubería de flyer: LLM extrae JSON, regex manda sobre fecha/hora/precio, difusión pinta solo el fondo, Pillow compone el texto |
| El LLM pequeño altera datos o adorna el título ("PHP para Dummies") | Regex sobre datos duros, instrucción que prohíbe marcas y apodos, y los datos extraídos se muestran al usuario para corregir |
| Chrome bloquea el micrófono fuera de localhost | Servir siempre en `localhost`, nunca por IP |
| WebGL lento en laptops viejas | Oso de primitivas, menos de 60 mallas, sombras suaves de 1024 px |
| Puertos 8765 y 8787 ocupados en la Mac del docente | `lsof -i :<puerto>` antes de arrancar; 8766 y 8797 como alternativa |

## Fase 1: Osito que conversa, escucha y dibuja (hecha)

Hito: mostrar a los alumnos, en 5 minutos, al osito respondiendo por voz, transcribiendo el micrófono y devolviendo una imagen.

| ID | Tarea | Criterio de aceptación | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|
| F1-T1 | Escribir alcance, riesgos y contrato de API | Este archivo y el contrato de 5 rutas (`/api/chat`, `/api/stt`, `/api/imagen`, `/api/salud`, `/api/estado`) con JSON exacto, más el esquema de `estado.json` | — | hecha | 10-10 |
| F1-T2 | Construir el esqueleto 3D del oso con luz y sombra | Captura a 1400x900 muestra oso con sombra en el suelo | F1-T1 | hecha | 10-10 |
| F1-T3 | Implementar los estados de ánimo | `setAnimo('feliz')` cambia ojos, boca y LED en menos de 400 ms | F1-T2 | hecha | 10-10 |
| F1-T4 | Añadir animaciones base | Respira, parpadea cada 3 a 6 s, saluda al cargar | F1-T2 | hecha | 10-10 |
| F1-T5 | Dar voz en español con subtítulos | Todo lo hablado aparece en el chat; boca sincronizada | F1-T3 | hecha | 10-10 |
| F1-T6 | Convertir micrófono a texto local | Grabar 3 s en Chrome devuelve texto desde `/api/stt`; whisper small tarda 1,7 s por frase de 4 s | F1-T1 | hecha | 10-10 |
| F1-T7 | Conectar chat con Ollama y respaldo FAQ | `/api/chat` responde con `animo` válido con y sin Ollama; 1,7 s por respuesta con `qwen3:1.7b` | F1-T1 | hecha | 10-10 |
| F1-T8 | Generar imágenes con sd-turbo | `/api/imagen` devuelve PNG; motor real si sd-turbo está en caché; 2,2 s por imagen de 512 px | F1-T1 | hecha | 10-10 |
| F1-T9 | Pasar pruebas de uso y rendimiento | 5 rutas en verde con `prueba_api.py`; 60 fps en escritorio; captura a 393 px sin scroll horizontal | F1-T2 a F1-T8 | hecha | 10-10 |

Notas de la fase: se construyó con 5 agentes en paralelo sobre el contrato de F1-T1; funcionó porque el contrato estaba cerrado antes de arrancar. Un agente escribió por error en el README de otro proyecto por un `cd` encadenado: desde entonces, rutas absolutas en cada comando. `obra.py paso` duplicaba un paso ya hecho si el texto coincidía; corregido para reabrirlo.

## Fase 2: Flyers y calidad de imagen

Hito: pedir "flyer de un taller de PHP el domingo 11 de octubre a las 6 pm a S/ 100" y mostrar en 1 minuto el flyer con esos datos legibles, en el nivel de calidad que la máquina aguanta.

| ID | Tarea | Criterio de aceptación | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|
| F2-T1 | Construir la tubería de flyer (LLM extrae, difusión pinta, Pillow compone) | El flyer de PHP sale a 1080x1350 con título, chips de fecha, hora y lugar e insignia "S/ 100" legibles; el regex manda sobre fecha, hora y precio; `datos` y `datos_por` vienen en la respuesta; capturas `06-flyer-php.png` | F1-T8 | hecha | 10-10 |
| F2-T2 | Ofrecer niveles rápida, buena y máxima en `/api/imagen` | `calidad: rapida` usa sd-turbo (1,4 a 2,3 s a 512 px, 5 GB); `buena` usa sdxl-turbo (flyer 7 s en caliente, 27 s la primera, 12 GB); `maxima` usa FLUX.2 Klein 4B a 4 bits vía mflux 0.22 (32 a 55 s por imagen de 1 MP, flyer 45 s, 8 GB); cada nivel cae al anterior si falta el modelo | F2-T1 | hecha | 10-10 |
| F2-T3 | Descargar los tres modelos sin colgar la red | sd-turbo (2,4 GB), sdxl-turbo (7 GB) y `flux2-klein-4b-mflux-q4` (4,6 GB) en caché con `HF_HUB_DISABLE_XET=1` y solo fp16; `GET /api/salud` lista los tres en `motores_imagen` | — | hecha | 10-10 |
| F2-T4 | Aplicar tope por máquina y diagnóstico | `tope_por_capacidad()`: CUDA con 6 GB o más → sdxl-turbo (offload si menos de 10 GB); menos de 6 GB → sd-turbo; Apple Silicon con 16 GB y mflux → flux2-klein; solo CPU → sdxl-turbo con 24 GB o más, si no sd-turbo. `python backend/diagnostico.py` imprime acelerador, memoria, tope y qué falta | F2-T2 | hecha | 10-10 |
| F2-T5 | Relevar las máquinas de los alumnos | Tabla en `osito/README.md` con SO, RAM, GPU, VRAM, nivel y línea de torch para RTX 5060 8 GB, RTX 3050 4 GB (Ubuntu), RX 5700 XT con 32 GB, Radeon 780M integrada, i5 sin GPU conocida y la Mac del docente | F2-T4 | hecha | 10-10 |
| F2-T6 | Añadir el selector de calidad en el frontend | Tres chips (Rápida, Buena, Máxima) en `index.html`; `app.js` manda `calidad` y avisa "hasta un minuto" en máxima; la respuesta muestra el motor usado | F2-T2 | hecha | 10-10 |
| F2-T7 | Rehacer el modelo 3D del osito | Nuevo oso visible en `index.html` con los mismos nueve ánimos y 60 fps en escritorio | F1-T3 | hecho (10-10, capturas 10 y 11) | |
| F2-T8 | Probar la tubería en Windows con CUDA | `diagnostico.py` y un flyer en `buena` en la RTX 5060 con torch cu128; tiempo medido anotado aquí | F2-T4 | pendiente (no probado; solo se ha medido en la Mac) | |
| F2-T9 | Exponer `OSITO_PONENTE` como nombre del ponente por defecto del flyer | Con la variable puesta, un flyer sin ponente en el pedido muestra "Dicta: <nombre>"; sin ella, no aparece la línea | F2-T1 | pendiente | |

Medido en la Fase 2 (Mac Apple Silicon, 24 GB): la huella real se mide con `footprint -p <pid>` (`ps -o rss` da 157 MB donde hay 4,97 GB). Todo junto: Ollama ~1,5 GB, whisper ~0,5 GB, Chrome con Three.js ~0,4 GB, sd-turbo 5 GB. sdxl-turbo en caliente es más rápido que sd-turbo y se ve mucho mejor. Pillow `ImageDraw` no mezcla alfa sobre RGBA: los chips llevan color sólido calculado a mano.

## Hitos demostrables

1. Oso visible y animado sin backend (F1-T2 a F1-T4).
2. Conversación con voz (F1-T5 y F1-T7).
3. Oído e imagen (F1-T6 y F1-T8).
4. Cierre de la Fase 1 con pruebas (F1-T9).
5. Flyer con datos legibles en tres calidades (F2-T1, F2-T2, F2-T6).
6. Cada alumno sabe qué nivel le toca (F2-T4 y F2-T5).

## Registro de avance

| Fecha y hora | Qué se cerró | Quién lo vio | Observación |
|---|---|---|---|
| 2026-10-10 | Fase 1 completa, obra al 100 % | Docente | Capturas `01` a `05` en `capturas/` |
| 2026-10-10 | F2-T1 a F2-T6 | Docente | Flyer de PHP en los tres niveles: `06-flyer-php.png` (sd-turbo), `09-flyer-php-sdxl.png` (sdxl-turbo), `07-flyer-php-klein.png` (Klein) |

Se actualiza con `python3 obra/obra.py paso "<texto>"` y se ve en
`http://localhost:8797/obra.html`.

## Fuera de alcance (apareció durante la ejecución)

- Texto dibujado por el propio modelo de difusión: no se va a intentar; toda letra la pone Pillow.
- GPU AMD en Windows o integradas Intel/AMD: van por CPU; no se investigan DirectML ni ROCm.
- Dos modelos de difusión cargados a la vez: se descarga uno al cambiar de nivel.
