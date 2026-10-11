# Plan de trabajo · Modo LIVE de la clase 2

**Qué es.** Una forma nueva de dictar la clase 2 dentro del LMS: el instructor pulsa «Iniciar LIVE», los alumnos entran a pantalla completa y ven lo mismo que él, sincronizado. Cada bloque del ciclo de aprendizaje es una escena HTML viva con animaciones, y en cada bloque el alumno tiene a mano una terminal real, un visor de proyectos web y un asistente de IA con su propia conexión al gateway. Cuando termina un paso pulsa «Lo logré»; esos registros alimentan la insignia de la clase 2.

**Dónde vive.** Repositorio `davrv93/jmd`: backend Go en `lms/api`, front Qwik en `lms/web`, gateway `ai-orchestrator` en la raíz. Producción: `https://jmd-learn.online` (EC2 3.151.56.55, 3,8 GB de RAM).

**Hecho significa.** El instructor dicta la clase 2 completa en LIVE con 10 alumnos conectados a la vez: cambia de escena y todos la ven en menos de 1 s; cada alumno abre su terminal, genera código con su clave, lo ve correr en el visor, ve su consumo de tokens subir y bajar al activar caveman y RTK, marca «Lo logré» en cada paso y al final recibe la insignia de la clase 2 sin que nadie emita a mano.

## Qué ya existe y se reutiliza

| Pieza | Estado | Dónde |
|---|---|---|
| Ciclo de Kolb por clase con 4 fases y pasos (`cycle` con `phase`) | En producción | `content/.../lessons/*.md`, `web/src/lib/kolb.ts` |
| Progreso por paso (`PUT /api/v1/lessons/{id}/progress/{step}`) | En producción | `httpapi/course_handlers.go` |
| Terminal aislada por WebSocket (`GET /api/v1/term`), runner con socket Docker | En producción, solo en el Estudio | `httpapi`, `internal/runner`, `web/src/components/terminal.tsx` |
| Visor HTML con sandbox (Estudio de landing) | En producción, solo HTML estático | `web/src/routes/studio/index.tsx` |
| Gateway `ai-orchestrator`: formato OpenAI, cuotas por alumno y cohorte vía SSO, telemetría por `sub`, perfiles `auto/cheap/coding…`, modelos `:free` (laguna, nemotron, muse-spark, Zen) | Imagen cargada en el servidor, contenedor sin arrancar, sin claves | `compose.yaml`, `config.yaml`, `src/` |
| Configuración de IA desde el panel del instructor (`settings` en SQLite) | En producción | `httpapi/llm_settings.go` |
| Insignias por clase, emisión en lote, `solo_con_progreso` | En producción | `httpapi/certificados.go`, `badges.go` |
| Skills del taller (14) y guiones de instalación | En producción | `instalador/`, materiales de la clase 2 |

## Decisiones de arquitectura

1. **Sincronía del LIVE por SSE, no por WebSocket.** El servidor publica el estado de la sesión (`escena`, `paso`, `visible`, `t`) por `GET /api/v1/live/{lesson}/stream` (Server-Sent Events). Un solo escritor (el instructor), muchos lectores. SSE pasa por el nginx actual sin cambios y se reconecta solo.
2. **Escenas = archivos HTML en el contenido.** Cada escena es un `.html` autocontenido en `content/courses/<curso>/live/<lesson>/NN-nombre.html`, con su `escena.yaml` (título, fase, paso del ciclo al que pertenece, duración sugerida, si lleva «Lo logré»). Se versionan en git como el resto del contenido y se recargan solos. Las animaciones se generan con PinePaper MCP en modo `code` (SVG animado o HTML, sin vídeo), los wireframes con `wireframe-skill` y la coreografía con `motion-design-skill`. Nada de librerías por CDN en clase: todo inline para que funcione sin internet del alumno.
3. **Un contenedor de trabajo por alumno, no por bloque.** Al entrar al LIVE, el LMS levanta (o reutiliza) un contenedor `curso-<sub>` con la imagen `jmd/aula:latest` (Node 22, Python 3, PHP 8, Rust estable, Go, `opencode`, `rtk`, `caveman`, los 14 skills, `jmd`). La terminal y el visor hablan con ese contenedor. Se apaga tras 30 min sin uso y se borra al cerrar la sesión LIVE, salvo la carpeta `/trabajo`, que se guarda en un volumen por alumno.
4. **Visor de proyectos = proxy a un puerto del contenedor.** El alumno levanta su dev server dentro del contenedor (Vite, `ng serve`, `php -S`, `cargo run`, `python -m http.server`) en el puerto 3000; el LMS lo expone en `GET /vista/<sub>/…` con un proxy inverso autenticado (cookie del LMS) y lo muestra en un `<iframe sandbox>`. Un «visor que ejecute TSX, Vue, Angular, PHP y Rust en el navegador» no existe; lo que sí existe es un dev server por framework corriendo en el contenedor, y eso es lo que se proxea. Para HTML suelto se mantiene el visor actual.
5. **Clave de OpenRouter central, uso por alumno.** La clave vive en el gateway (`.env` del compose) y se administra desde el LMS (panel «IA» ya existente, ampliado). Cada alumno NO ve la clave: el LMS le entrega un token personal del gateway (`POST /v1/auth/exchange`) y el gateway lleva su cuota diaria (`auth.per_user`) y la de la cohorte. Opcional: un alumno puede pegar su propia clave de OpenRouter en «Mi IA» para gastar la suya.
6. **Modelos elegibles.** Lista blanca editable desde el panel: perfiles del gateway (`auto`, `cheap`, `coding`) y modelos `:free` concretos (`nvidia/nemotron-3-ultra-550b-a55b:free`, `poolside/laguna-s-2.1:free`, `muse-spark` por Zen, los `deepseek…:free` y `mimo` que estén disponibles el día de la clase; los nombres cambian y se verifican con `jmd provider openrouter test` la víspera). El alumno elige en un selector; lo que no está en la lista no se puede usar.
7. **Medición del efecto de caveman y RTK.** El gateway ya devuelve `orchestrator` y tokens por respuesta y los guarda por `sub`. El LMS consulta `/admin/api/usage?sub=` y muestra, por alumno, tokens de entrada y salida de hoy, porcentaje de su cuota y una marca cada vez que activó caveman o RTK (el contenedor avisa por un hook al LMS). Así el gráfico muestra la caída de tokens después de activarlos.
8. **«Lo logré» = progreso del ciclo.** El botón escribe `PUT /api/v1/lessons/pa-02/progress/<paso>` con `done: true` más `evidencia` opcional (captura automática del visor o el último comando). La insignia de la clase 2 se emite con `solo_con_progreso` y un umbral configurable (por defecto 6 de 9 pasos).

9. **Ningún modelo de IA corre en el EC2.** Chat, voz a texto e imagen corren en la laptop del alumno (Ollama, faster-whisper, sd-turbo) y, si una laptop no puede, en un proveedor remoto por el gateway con el token personal del alumno: modelos chinos gratis o de muy bajo costo por OpenRouter para chat (DeepSeek V4.1 Flash, Qwen3, GLM Flash, Kimi K2, MiniMax), y proveedores OpenAI-compatibles añadidos al gateway para imagen (Zhipu CogView, Alibaba Wan o Qwen-Image, SiliconFlow) y voz (SiliconFlow SenseVoice, Groq Whisper). Nunca una instancia compartida de whisper o sd-turbo en el servidor, ni diez.
10. **El guion manda.** El contenido del LIVE está escena por escena en `docs/GUION_LIVE_SESION2.md` (12 escenas E01 a E12, con lo que se ve, qué animación y con qué herramienta, qué hace el instructor, qué hace el alumno, qué valida la compuerta y el respaldo). Las tareas de la fase 2 implementan ese guion, no otro.
11. **Compuerta de avance.** «Siguiente» no cambia de escena a ciegas: muestra al instructor quién cumplió la escena (por «Lo logré» o por evidencia automática), quién falta y su último evento, y le da tres salidas: esperar, pasar igual o mandar ayuda. El umbral por escena vive en `escena.yaml` (por defecto 80 %).

## Restricción dura: casi nada de RAM

El servidor tiene 3,8 GB y Keycloak ya se lleva 500 MB. Todo lo que corra en el LIVE, en el servidor y en el navegador del alumno, se elige por consumo mínimo. Regla: **ningún proceso por alumno que pase de 40 MB en reposo**, y nada que compile o empaquete en el servidor durante la clase.

| Pieza | Elección de poca RAM | Lo que NO se usa y por qué |
|---|---|---|
| Agente de IA en el contenedor | `jmd` (binario Rust, 10 a 25 MB mientras responde) con `jmd ask` y su chat con tareas, comandos y MCP | OpenCode (Node/Bun, 150 a 300 MB por alumno). OpenCode queda en la laptop del alumno, donde ya lo instaló en la clase 1 |
| Compresión de salida | `rtk` (Rust, 5 MB) | Nada que sustituir; ya es mínimo |
| Respuestas cortas | La **skill** caveman (texto, 0 MB) y el estilo caveman del gateway (`style` por petición) | El proxy `caveman` de Node (CLI con engine) |
| Imagen del contenedor de aula | Alpine con `sh`, `curl`, `git`, `python3`, `php` (opcional), `jmd`, `rtk`, skills; menos de 150 MB; límite de 128 MB de RAM y 0,5 CPU por contenedor | Ubuntu con Node, Rust y Go (2,5 GB de imagen, 700 MB de RAM con un dev server) |
| Visor de proyectos | El propio LMS sirve **archivos estáticos** desde el volumen `/trabajo` del alumno (`GET /vista/{sub}/…`), sin proceso en el contenedor; recarga por sondeo cada 2 s | Dev servers de Vite, `ng serve`, HMR por WebSocket (150 a 400 MB cada uno) |
| React, Vue, Preact en clase | **Sin bundler**: `importmap` + módulos ES desde `esm.sh`, JSX con `htm` o Preact; Vue con `vue.esm-browser.js`; todo corre en el navegador del alumno, 0 MB en el servidor | `npm create vite`, Angular CLI, Next |
| Angular, Rust, Go, TSX con bundler | Se demuestran en la laptop del alumno con su OpenCode local y se muestra el resultado exportado (`dist/`) subido al visor | Compilar en el servidor |
| PHP y Python | `php -S` (20 MB) y `python3 -m http.server` (10 MB) solo si la escena lo pide y se apagan al cambiar de escena | Flask, Django, Laravel |
| Sincronía | SSE, una conexión por alumno, 0 procesos | WebSocket con hub en memoria |
| Animaciones de las escenas | SVG con `<animate>` y CSS; máximo 300 nodos y 1 MB por escena; PinePaper en modo código exportando SVG | Canvas con `requestAnimationFrame`, lottie-web, vídeo |
| Terminal | Shell `sh` del contenedor por el WebSocket ya existente (3 MB) | `ttyd`, `code-server`, Jupyter |
| Keycloak durante la clase | Cuentas locales para los 10 alumnos (contraseñas repartidas antes); Keycloak apagado durante el LIVE si hace falta la memoria | Mantener SSO y Keycloak (500 MB) |

Presupuesto por alumno en reposo: contenedor 8 MB + shell 3 MB + `rtk` 0 (solo al ejecutar) = **≈ 12 MB**; en uso con `jmd` respondiendo: **≈ 40 MB**. Diez alumnos: 120 MB en reposo, 400 MB en pico. LMS ≈ 60 MB, gateway ≈ 30 MB. Total en pico menor a 1 GB. Cabe en el servidor actual sin subir la instancia, con Keycloak apagado o no, y se mide en la fase 0.4.

Lo que se gana además: sin Node en el servidor no hay `npm install` en clase, no hay descargas de 300 MB por alumno y no hay dependencias que se rompan a mitad de sesión.

## Fases y tareas

Cada tarea cabe en una jornada o menos, tiene criterio de aceptación verificable y marca si va al LMS (Go o Qwik), al gateway (Rust), al contenido o a infraestructura. Orden por dependencias.

### Fase 0 · Preparación (1 día)

| # | Tarea | Dónde | Criterio de aceptación | Estado |
|---|---|---|---|---|
| 0.1 | Arrancar el gateway en producción con la clave de OpenRouter y `GATEWAY_API_KEYS`; conectar el LMS por el panel «IA» | infra | `jmd whoami` desde un alumno muestra su cuota; el Estudio genera una landing | pendiente |
| 0.2 | Verificar los modelos gratis del día: `jmd provider openrouter test`, `jmd models`; fijar la lista blanca inicial en `config.yaml` | gateway | Tabla con 6 modelos que respondieron en menos de 20 s | pendiente |
| 0.3 | Instalar en la Mac del instructor PinePaper MCP (modo `code`), `wireframe-skill` y `motion-design-skill` con el instalador del curso | infra | `claude mcp list` y `/wireframe` responden | pendiente |
| 0.4 | Medir la RAM del servidor con 10 contenedores de aula Alpine arrancados y 5 con `jmd ask` respondiendo a la vez; decidir si Keycloak se apaga durante el LIVE | infra | `docker stats` con 10 contenedores por debajo de 450 MB sumados y `free -m` con 800 MB disponibles | pendiente |

### Fase 1 · Sala LIVE: sincronía instructor-alumnos (2 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 1.1 | Modelo `live_sessions` en SQLite: lesson_id, estado (preparando, en vivo, cerrada), escena actual, paso actual, iniciada_por, iniciada_en | Go | Migración aplicada; test de store | pendiente |
| 1.2 | Rutas: `POST /api/v1/live/{lesson}/iniciar` y `/cerrar` (instructor); `PUT /api/v1/live/{lesson}/escena` (instructor); `GET /api/v1/live/{lesson}` (estado); `GET /api/v1/live/{lesson}/stream` (SSE, autenticado) | Go | Dos navegadores: cambiar escena en uno se refleja en el otro en menos de 1 s; reconexión automática al cortar la red 10 s | pendiente |
| 1.3 | Página `/live/pa-02/` a pantalla completa (Fullscreen API) con dos vistas: **control** (instructor: lista de escenas, anterior/siguiente, cronómetro, «mostrar a todos», contador de conectados y de «Lo logré» por paso) y **alumno** (la escena actual, paneles plegables de terminal, visor e IA, botón «Lo logré») | Qwik | Captura de las dos vistas; teclado: flechas y espacio cambian escena en control; Escape sale de pantalla completa sin perder la sesión | pendiente |
| 1.4 | Presencia: cada alumno manda un latido cada 15 s; el control muestra quién está conectado y en qué escena mira | Go, Qwik | Lista de presentes con retardo máximo de 20 s | pendiente |
| 1.5 | Modo «libre»: el instructor puede soltar el control para que cada alumno navegue a su ritmo, y volver a tomarlo | Go, Qwik | Interruptor en control; el alumno ve el aviso | pendiente |
| 1.6 | Compuerta de avance: al pulsar «Siguiente», `GET /api/v1/live/{lesson}/compuerta` devuelve por alumno {cumplio: bool, motivo: lo_logre|evidencia|ninguno, ultimo_evento, hace_s}; el control muestra cumplidos, faltantes y el porcentaje contra el umbral de `escena.yaml`; botones Esperar / Pasar igual / Mandar ayuda; «Pasar igual» queda registrado | Go, Qwik | Con 10 alumnos y 7 cumplidos, «Siguiente» muestra 3 nombres y no avanza hasta elegir; test del cálculo del umbral | pendiente |
| 1.7 | Semáforo por alumno en el control: verde (cumplió), ámbar (actividad en los últimos 2 min: terminal, agente o visor), rojo (sin actividad o 3 errores seguidos en la terminal), gris (desconectado); los eventos los manda el panel del alumno cada vez que ocurren | Go, Qwik | Simular cada estado con Playwright y ver el color correcto | pendiente |
| 1.8 | «Mandar ayuda»: abre la terminal o el agente del alumno en solo lectura (si lo permitió al entrar) o le envía un mensaje que aparece en su panel; «Mensaje a todos» con una línea | Go, Qwik | El alumno ve el mensaje en menos de 2 s; sin permiso, el instructor solo ve el resumen | pendiente |
| 1.9 | Emparejar alumnos al azar para la escena de pruebas (E11) y mostrar a cada uno con quién le toca y la URL del visor del compañero | Go, Qwik | 10 alumnos → 5 pares; impar → un trío | pendiente |

### Fase 2 · Escenas HTML vivas de la clase 2 (3 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 2.1 | Formato de escena: carpeta `content/.../live/pa-02/`, `escena.yaml` por escena (id, titulo, fase, paso, duracion_min, lo_logre: bool, evidencia: ninguna, captura, comando) y cargador en Go con recarga en caliente | Go, contenido | `GET /api/v1/live/pa-02/escenas` lista 12 escenas con su fase | pendiente |
| 2.2 | Plantilla base de escena: fondo del tema (cielo con constelaciones), cabecera con fase y número, cuerpo, pie con «Lo logré»; sin CDN; respeta `prefers-reduced-motion` | contenido | Una escena de prueba renderiza en claro y oscuro a 1920×1080 y 1366×768 | pendiente |
| 2.3 | Escenas E01 a E03 del guion (Bienvenida con constelaciones y Tecnosito en 3D; Edge AI en una frase con los dos caminos animados; Tu laptop decide con la tabla de niveles y el diagnóstico) | contenido | Cada una renderiza según su ficha del guion; E01 incrusta la escena Three.js del osito sin servidor; E03 detecta el nivel elegido en «Mi IA» como evidencia | pendiente |
| 2.4 | Escenas E04 a E06 (Skills como constelación con antes y después de piedra; Mide tu consumo con el gráfico vivo de tokens y las marcas de piedra y RTK; Plan con criterios con el kanban que se parte en 6) | contenido, Qwik | E05 lee `/api/v1/mi-uso` cada 10 s; E04 toma como evidencia una skill propia en la cuenta; E06 detecta `PLAN_TRABAJO.md` | pendiente |
| 2.5 | Escenas E07 a E10, la construcción del asistente (Chat con el diagrama navegador → backend → modelo local o remoto; Avatar 3D con osito y robot cambiando de ánimo; Voz con la onda que se vuelve texto; Imagen y flyer con las tres piezas que encajan) | contenido | Evidencias automáticas: `POST /api/chat 200`, `POST /api/stt 200` y la imagen en el visor; cada escena muestra el comando exacto y la línea de exportación para el modo remoto | pendiente |
| 2.6 | Escenas E11 y E12 (Probar y medir con pares al azar y la tabla de tiempos reales; Tu insignia que se enciende al cumplir 6 de 9 pasos y la tarea 2) | contenido, Qwik | E11 llena la tabla desde los logs recogidos; E12 refleja la emisión automática al cerrar | pendiente |
| 2.7 | Ensayo completo con cronómetro: 105 minutos de escenas más 15 de margen según la tabla del guion; tiempos y umbral de compuerta por escena anotados en `escena.yaml`; capturas estáticas de respaldo de cada escena | contenido | Ensayo grabado; ninguna escena pasa de su tiempo más 3 min | pendiente |

### Fase 3 · Terminal y contenedor de aula por alumno (3 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 3.1 | Imagen `jmd/aula` mínima: Alpine con `sh`, `curl`, `git`, `python3`, `php` (opcional), `jmd`, `rtk` con hooks, la skill caveman y los 14 skills del taller, `AGENTS.md` de arranque; usuario sin privilegios; sin socket de Docker; sin Node | infra | `docker run jmd/aula jmd --version && rtk --version` responde; imagen de menos de 150 MB; contenedor en reposo por debajo de 12 MB de RAM | pendiente |
| 3.2 | Ciclo de vida: `POST /api/v1/aula/iniciar` crea o reutiliza `curso-<sub>` con límites (0,5 CPU, 128 MB, `--pids-limit 64`, sin red salvo el gateway), volumen `/trabajo` por alumno; apagado tras 15 min sin uso; borrado al cerrar el LIVE | Go, infra | 10 contenedores a la vez por debajo de 450 MB sumados en pico, medido con `docker stats` | pendiente |
| 3.3 | Terminal: reutilizar `terminal.tsx` y `/api/v1/term` apuntando al contenedor del alumno; pestañas (hasta 3), copiar y pegar, tamaño de letra, tema claro y oscuro, reconexión | Qwik, Go | Abrir, cerrar y reabrir sin perder la sesión del shell | pendiente |
| 3.4 | Ayuda integrada: panel lateral con los comandos de la escena actual (copiar con un clic), «qué significa este error» para los 15 errores más comunes, y enlace a la clase | Qwik | Captura; cada escena define sus comandos en `escena.yaml` | pendiente |
| 3.5 | Inyección de credenciales: al crear el contenedor, el LMS escribe `~/.config/jmd/tokens.json` con el token personal del alumno y el modelo elegido; nunca la clave de OpenRouter. Para la laptop del alumno, «Mi IA» muestra el bloque de `opencode.json` listo para copiar | Go | Dentro del contenedor, `jmd ask` responde por el gateway; la clave central no aparece en ningún archivo | pendiente |
| 3.6 | Interruptores en la UI: «Activar caveman» enciende la skill y el estilo caveman del gateway para ese alumno; «Activar RTK» ejecuta `rtk init -g --auto-patch` en el contenedor; ambos avisan al LMS para marcar el momento en el gráfico de tokens | Qwik, Go, gateway | El gráfico muestra la marca; `rtk gain` dentro del contenedor coincide con el ahorro mostrado | pendiente |

### Fase 3b · `jmd` apto para clase y embebido en el LIVE (5 días)

`jmd` ya tiene lista de tareas (`todo_write`, `/todos`), herramientas de shell y archivos, MCP (`/mcp`, `/tools`) y skills. Le faltan tres cosas que OpenCode sí muestra y que el alumno necesita para entender lo que pasa: contexto y tokens, costo, y una respuesta clara cuando el gateway reintenta. Sin esto, el alumno ve una pantalla quieta y cree que se colgó.

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 3b.1 | Barra de estado del chat: tokens de entrada y salida del turno y acumulados de la sesión, contexto usado en % (estimado por bytes/4 sobre la ventana del modelo activo, o `/v1/messages/count_tokens` del gateway cuando esté), modelo y proveedor reales (del campo `orchestrator` de cada respuesta) | jmd (Rust) | La barra cambia tras cada respuesta; con `jmd chat --json` sale lo mismo en JSON | pendiente |
| 3b.2 | Costo: el gateway devuelve `x-orchestrator-cost-usd` por respuesta (precio del modelo desde `/models` de OpenRouter, 0 para los `:free`) y el acumulado del día por `sub`; `jmd` lo muestra en la barra y `jmd whoami` el total y el saldo de la clave central (`GET /key` de OpenRouter) | gateway, jmd | Un turno con un modelo de pago muestra centavos; con `:free` muestra 0 y la cuota diaria restante | pendiente |
| 3b.3 | Reintentos visibles y cancelables: el gateway emite eventos de progreso por streaming (`intentando nemotron-ultra`, `429, espero 20 s`, `cambio a laguna`); `jmd` los pinta en una línea viva; `Ctrl-C` cancela el turno y el gateway aborta la cadena; tiempo máximo por turno configurable (60 s en clase) con `priority: speed` y máximo 2 intentos por cadena | gateway, jmd | Simular un 429 y una caída: el alumno ve qué pasa y puede cancelar en menos de 1 s; nunca una pantalla quieta más de 5 s | pendiente |
| 3b.4 | Panel MCP y tareas en el LIVE: el LMS muestra, por alumno, la lista de tareas del chat (`todo_write` se replica al LMS por un hook de `jmd`) y los servidores MCP conectados, en el panel lateral junto a la terminal | jmd, Go, Qwik | El instructor ve las tareas de cada alumno avanzar en vivo | pendiente |
| 3b.5 | Prueba de aula con 5 alumnos usando solo `jmd` en el contenedor durante 30 min: tareas de varios pasos, una skill, un MCP, un modelo `:free` saturado a propósito | personas | Sin cuelgues; todos saben en todo momento qué está haciendo el agente (encuesta de 3 preguntas) | pendiente |

**`jmd` embebido en el LIVE.** Además de la terminal, el LIVE lleva un panel de chat propio alimentado por `jmd` corriendo dentro del contenedor del alumno. Es la misma lógica de `jmd` (herramientas, tareas, MCP, skills) con una interfaz web que el LMS dibuja: así el alumno tiene en pantalla, sin salir del LIVE, lo que OpenCode le da en la laptop.

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 3b.6 | `jmd serve --embed`: `jmd` expone en el contenedor un servidor local HTTP+SSE (puerto 7700, solo loopback) con `POST /turno` (prompt, modelo, perfil), `GET /eventos` (stream: texto por tokens, llamada a herramienta pedida, resultado, tarea actualizada, estado MCP, uso de tokens y costo, progreso de reintentos, fin), `POST /confirmar` (sí, no, siempre), `POST /cancelar`, `GET /estado` (contexto %, tokens, costo, modelo, skills cargadas, MCP) y `POST /skills/recargar`. Un proceso por alumno, menor a 25 MB en reposo | jmd (Rust) | `curl` contra el puerto dentro del contenedor recorre un turno completo con una herramienta y una tarea; prueba de integración en Rust | pendiente |
| 3b.7 | Proxy del LMS `GET/POST /api/v1/aula/jmd/{…}` → `curso-<sub>:7700`, autenticado por la sesión del alumno, con SSE pasante y sin búfer | Go | Dos alumnos no pueden verse el chat; test 403; el stream llega en menos de 200 ms | pendiente |
| 3b.8 | Panel «Agente» en el LIVE (Qwik): historial con streaming, bloques de herramienta con botones Sí / No / Siempre, panel de tareas con estados (igual al de OpenCode), panel MCP (servidores, herramientas, estado), barra inferior con contexto %, tokens del turno y de la sesión, costo, modelo activo y selector de modelo (lista blanca), botón Cancelar visible mientras responde, línea viva de reintentos; `/skill nombre` y `/proto` disponibles como atajos; tema claro y oscuro; atajos de teclado | Qwik | Captura de un turno con herramienta, tarea y reintento; el alumno nunca ve la pantalla quieta más de 5 s | pendiente |
| 3b.9 | Puente agente ↔ visor ↔ terminal: cuando el agente escribe en `/trabajo`, el visor se recarga; «Abrir en terminal» ejecuta el comando propuesto en la terminal del LIVE; «Lo logré» puede adjuntar el último turno como evidencia | Qwik, Go | Pedir «crea index.html con un contador en Preact» y verlo en el visor sin tocar la terminal | pendiente |
| 3b.10 | Replicación al instructor: tareas, tokens y modelo de cada alumno llegan al panel de control por el mismo stream (resumen cada 5 s); el instructor puede «ver el chat» de un alumno en solo lectura si el alumno lo permite | Go, Qwik | Matriz de alumnos con tareas y tokens en vivo; permiso por alumno respetado | pendiente |

Decisión: en la laptop el alumno sigue con OpenCode y su token personal del gateway; en el LIVE, el agente es `jmd` embebido (panel «Agente») más la terminal, los dos dentro del mismo contenedor de poca RAM. Lo que el alumno ve en el panel (contexto, tokens, costo, tareas, MCP, reintentos) es lo mismo que le da OpenCode en la laptop, dibujado por el LMS. Las métricas de tokens, costo y cuota del LIVE salen del gateway, así que valen para los dos clientes.

### Fase 4 · Visor de proyectos (2 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 4.1 | Visor estático autenticado `GET /vista/{sub}/{ruta…}` que sirve el volumen `/trabajo` del alumno directamente desde el LMS (sin proceso en el contenedor), con recarga por sondeo cada 2 s cuando cambia un archivo | Go | Un `index.html` con React por `importmap` y otro con Vue muestran el cambio en menos de 3 s sin ningún proceso en el contenedor | pendiente |
| 4.2 | Plantillas sin bundler: `aula nuevo html|react-esm|vue-esm|preact-htm|php|python-static` crea un proyecto que corre en el navegador con `importmap` (React, Vue y Preact desde esm.sh) o con `php -S` / `python3 -m http.server` que se apagan solos al cambiar de escena | imagen | Las 6 plantillas se ven en el visor en menos de 10 s; el contenedor no pasa de 40 MB con una abierta | pendiente |
| 4.3 | Visor en la UI: iframe `sandbox`, barra con URL, recargar, abrir en pestaña, tamaños móvil, tablet y escritorio, captura para evidencia de «Lo logré» | Qwik | Captura guardada como evidencia y visible en la vista del instructor | pendiente |
| 4.4 | Consola del visor: errores de la página en un panel (inyección de un pequeño script por el proxy solo en `text/html`) | Go, Qwik | Un `throw` en la app aparece en el panel con línea y archivo | pendiente |

### Fase 5 · IA por alumno, modelos y consumo (2 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 5.1 | Panel «IA» ampliado: clave de OpenRouter central, cuota diaria por alumno y por cohorte (tokens y peticiones), lista blanca de modelos, presupuesto total de la clase | Qwik, Go, gateway | Guardar aplica en el gateway sin reiniciar (`/admin/api/config`) | pendiente |
| 5.2 | «Mi IA» para el alumno: modelo elegido entre los permitidos, token personal regenerable, clave propia opcional, consumo de hoy | Qwik, Go | Cambiar de modelo en la UI cambia lo que usa `opencode` en el contenedor | pendiente |
| 5.3 | `GET /api/v1/mi-uso`: tokens de entrada y salida, peticiones, porcentaje de cuota, marcas de caveman y RTK, serie de los últimos 60 min; fuente: telemetría del gateway por `sub` | Go, gateway | Coincide con el Panel del gateway con diferencia menor al 2 % | pendiente |
| 5.4 | Vista del instructor: tabla de consumo por alumno en vivo, alumnos al 80 % de cuota en ámbar, al 100 % en rojo, botón «dar 20 % más» | Qwik, Go | Captura; el botón amplía la cuota en el gateway | pendiente |
| 5.6 | Proveedores remotos de respaldo en el gateway: añadir como proveedores OpenAI-compatibles los de imagen (Zhipu CogView, Alibaba Wan o Qwen-Image, SiliconFlow) y de voz (SiliconFlow SenseVoice, Groq Whisper) con `POST /v1/images/generations` y `POST /v1/audio/transcriptions` traducidos al formato de cada uno; cuota y costo por alumno igual que el chat; verificación la víspera con `jmd provider <n> test` | gateway | Un alumno sin GPU genera una imagen y transcribe un audio por el gateway con su token; costo mostrado en «Mi uso» | pendiente |
| 5.7 | Modo remoto en el asistente del alumno: el backend del osito acepta `OSITO_OLLAMA_URL`, `OSITO_STT_URL` y `OSITO_IMAGEN_URL` apuntando al gateway con el token personal; «Mi IA» muestra las tres líneas de exportación listas para copiar y un botón «usar remoto» que las escribe en `/trabajo/.env` del contenedor | Go, Qwik, osito | Cambiar a remoto y volver a local sin reinstalar nada; `GET /api/salud` del osito dice qué usa | pendiente |
| 5.8 | Lista blanca inicial de modelos chinos gratis o baratos (DeepSeek V4.1 Flash, Qwen3, GLM Flash, Kimi K2, MiniMax) con precio por millón visible en el selector; verificación automática diaria de que responden | gateway, Qwik | Selector con precio; los que no respondieron en la prueba del día salen en gris | pendiente |
| 5.5 | Chat de IA dentro del LIVE (opcional, si sobra tiempo): caja de prompt que usa el token del alumno contra el gateway, con el modelo elegido, para quien no quiera la terminal | Qwik | Respuesta en la UI con tokens contados | pendiente |

### Fase 5b · Skills por alumno, aisladas y adaptadas a su modelo (2 días)

Cada alumno escribe y usa sus propias skills sin ver las de los demás, y cada skill se guarda en la versión que entiende el modelo que ese alumno eligió. El LMS lleva el inventario y el contenedor las monta.

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 5b.1 | Modelo `skills` en SQLite: id, user_id, nombre (slug), descripcion, cuerpo (SKILL.md completo), modelo_destino, version, origen (propia, del curso, copiada), creada_en, actualizada_en. Unicidad por (user_id, nombre). Las del curso (las 14) tienen user_id vacío y son de solo lectura | Go | Migración y test de store; un alumno no puede leer ni borrar una skill de otro (test 403) | pendiente |
| 5b.2 | Rutas: `GET/POST /api/v1/mis-skills`, `GET/PUT/DELETE /api/v1/mis-skills/{nombre}`, `POST /api/v1/mis-skills/{nombre}/copiar` (desde una del curso), `GET /api/v1/skills-curso` (las 14, lectura) | Go | Crear, editar y borrar solo lo propio; validación del front matter (name, description obligatorios, name = slug) | pendiente |
| 5b.3 | Montaje aislado en el contenedor: al crear `curso-<sub>` el LMS escribe las skills del alumno en `/home/alumno/.config/opencode/skills/<nombre>/SKILL.md` y `/home/alumno/.claude/skills/`, y las 14 del curso en `/opt/skills-curso/` (solo lectura, enlazadas); cambios desde la UI se sincronizan al contenedor en menos de 5 s; cambios hechos desde la terminal (`skills/` del proyecto) se detectan y se ofrecen para guardar en el LMS | Go, imagen | Dos alumnos con skills del mismo nombre no se ven entre sí; `ls ~/.config/opencode/skills` en cada contenedor lista solo las suyas más las del curso | pendiente |
| 5b.4 | Editor de skills en el LIVE: panel «Mis skills» con lista, editor con plantilla (front matter, Cuándo usar, Procedimiento, Reglas duras, Lista de comprobación, Versión corta), vista previa, botón «Probar» que lanza en la terminal `opencode` con un prompt que la dispare y muestra si el agente la cargó | Qwik | Crear una skill desde la UI y verla responder en la terminal en menos de 1 min | pendiente |
| 5b.5 | Especialización por modelo: cada skill guarda una versión por `modelo_destino` (claude, gpt-codex, deepseek, glm, nemotron, ollama-pequeno…) siguiendo `skills/_perfiles/MODELOS.md`; al guardar, el LMS genera automáticamente la variante del modelo elegido por el alumno (longitud, estilo de instrucciones, formato de salida: completa para Claude y GPT, lista numerada explícita para DeepSeek y GLM, system prompt con rol para Nemotron, «versión corta» de 25 líneas para modelos de 1 a 4B) y monta solo esa; si el alumno cambia de modelo en «Mi IA», se regenera y se vuelve a montar | Go, Qwik | Misma skill en un alumno con `nemotron-ultra` y otro con `laguna`: los SKILL.md montados difieren según el perfil; test con dos perfiles | pendiente |
| 5b.6 | Generación asistida: botón «Adaptar a mi modelo» que pide al gateway (con el token del alumno, modelo `cheap`) reescribir la skill al perfil destino usando las reglas de `MODELOS.md` como instrucción; el alumno revisa el diff y acepta | Go, Qwik, gateway | Diff visible antes de guardar; el consumo se descuenta de la cuota del alumno y aparece en «Mi uso» | pendiente |
| 5b.7 | Paquete personal: «Descargar mis skills» (zip con `instalar.sh` que las copia a `~/.claude/skills` y `~/.config/opencode/skills` en la laptop del alumno) y «Compartir con el instructor» (solo lectura, para calificar la tarea 2) | Go, Qwik | Zip descargado instala en una Mac limpia; el instructor ve la skill compartida en su panel | pendiente |
| 5b.8 | Vista del instructor: inventario de skills por alumno (cuántas, cuáles, modelo destino, última edición) y botón «ver» en solo lectura; nunca edición | Qwik, Go | Captura de la matriz; intento de edición desde instructor devuelve 403 | pendiente |

Reglas duras de esta fase:

- Una skill vive en la cuenta de su autor; ni el instructor ni otro alumno pueden editarla. Compartir es siempre de solo lectura y por acción explícita del alumno.
- Las 14 skills del curso se montan como solo lectura; para modificarlas el alumno las copia a su cuenta y edita la copia.
- Lo que se monta en el contenedor es siempre la variante del modelo activo del alumno, nunca la genérica, para que el agente reciba instrucciones que su modelo sigue bien.
- La escena «Instala los skills» de la fase 2 pasa a usar este panel en vez del zip: el alumno crea su primera skill propia en vivo y la ve funcionar.

### Fase 6 · «Lo logré», plan de trabajo e insignia (1,5 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 6.1 | Botón «Lo logré» por escena: escribe el progreso del paso con `evidencia` (captura del visor, último comando o nada según la escena); confirmación visual; se puede deshacer en 10 s | Qwik, Go | `GET /api/v1/lessons/pa-02/progress` refleja el paso con hora y evidencia | pendiente |
| 6.2 | Plan de trabajo del alumno dentro del LIVE: las 6 tareas de la clase (de `plan-de-trabajo`) con estado hecho o pendiente, generadas desde `escena.yaml`; el instructor ve la matriz alumnos × tareas | Qwik, Go | Captura de la matriz con 10 alumnos | pendiente |
| 6.3 | Emisión automática de la insignia 02 al cerrar el LIVE: a quien cumpla el umbral (`solo_con_progreso` con mínimo de pasos configurable); correo o aviso en el LMS | Go | Al cerrar, los que cumplen ven la insignia en «Mis insignias» sin acción del instructor | pendiente |
| 6.4 | Exportación del LIVE: CSV con alumno, pasos logrados, tokens usados, modelo más usado, caveman y RTK activados, hora de cada «Lo logré» | Go | Archivo abre en Excel con acentos correctos | pendiente |

### Fase 7 · Pruebas, rendimiento y ensayo general (2 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 7.1 | Tests Go: sesiones LIVE, SSE con 3 clientes, aula (crear, reutilizar, apagar), proxy del visor, mi-uso, emisión automática | Go | `go test ./...` en verde | pendiente |
| 7.2 | Prueba de carga: 12 navegadores con Playwright conectados al SSE, cambiando 30 escenas; terminal y visor abiertos en 5 de ellos | infra | p95 de propagación de escena menor a 1 s; sin desconexiones | pendiente |
| 7.3 | Prueba de uso con 3 alumnos reales en remoto, 40 minutos, con guion: entrar, abrir terminal, generar un componente con IA, verlo en el visor, activar caveman, ver el gráfico, marcar «Lo logré» | personas | Hoja de hallazgos; ningún hallazgo de severidad 4 sin corregir | pendiente |
| 7.4 | Ensayo general de la clase 2 completa en LIVE, con cronómetro y grabación | personas | Grabación de 120 min; lista de ajustes finales | pendiente |
| 7.5 | Documentación: `docs/MODO_LIVE.md` (cómo dictar, atajos, qué hacer si se cae el gateway, cómo apagar el aula), y ejemplo en el LMS «Cómo funciona el modo LIVE» | docs, contenido | Publicado en el LMS | pendiente |

## Orden de ejecución y estimación

| Semana | Fases | Entregable demostrable |
|---|---|---|
| 1 | 0, 1, 2 (parte) | Instructor y alumnos sincronizados viendo 3 escenas con animación |
| 2 | 2 (resto), 3, 3b | Clase completa en escenas; cada alumno con su terminal, `jmd` con tokens, costo y reintentos visibles |
| 3 | 4, 5, 5b | Visor con React y Vue en caliente; consumo por alumno en vivo con marcas de caveman y RTK; skills propias aisladas y adaptadas al modelo de cada alumno |
| 4 | 6, 7 | «Lo logré», insignia automática, ensayo general |

Total estimado: 26 a 28 jornadas de desarrollo, más el ensayo.

## Riesgos y mitigación

| Riesgo | Efecto | Mitigación |
|---|---|---|
| El servidor de 3,8 GB se queda sin memoria con 10 alumnos | Terminales lentas o caídas en plena clase | Restricción de RAM de arriba: contenedores Alpine de 128 MB sin Node, `jmd` en vez de OpenCode, visor estático, SSE; medir en la fase 0.4; Keycloak apagado durante el LIVE si hace falta |
| Los modelos `:free` de OpenRouter cambian de nombre o se agotan (50 peticiones por día por clave sin créditos) | Alumnos sin IA a mitad de clase | Verificar la víspera; cargar 10 USD en la clave para subir a 1000 peticiones por día; cadena `auto` con respaldo; cuota por alumno para que nadie agote la de todos |
| `jmd` se queda quieto mientras el gateway reintenta | El alumno cree que se colgó y repite el pedido | Fase 3b.3: eventos de progreso, cancelación con Ctrl-C, 60 s máximo por turno y 2 intentos en clase |
| Un alumno pega la clave central en su código y la sube a GitHub | Clave filtrada | La clave nunca sale del gateway; los alumnos solo tienen tokens personales revocables |
| Proxy del visor expone el contenedor de otro alumno | Fuga entre alumnos | Ruta `/vista/{sub}` validada contra la sesión; test que lo cubra |
| Skills de un alumno visibles o editables por otro | Fuga de trabajo y plagio | Skills por `user_id` con pruebas de 403; montaje por contenedor, nunca carpeta compartida |
| Una skill escrita para Claude no funciona con un modelo pequeño | El alumno cree que las skills no sirven | Variante por modelo generada y montada automáticamente (5b.5); «Probar» en la terminal antes de guardar |
| PinePaper en modo Puppeteer lanza Chrome sin sandbox | Riesgo en la máquina del instructor | Usar modo `code`; las escenas se generan en la Mac del instructor, nunca en el servidor |
| Internet del aula cae | Escenas sin animación, IA sin respuesta | Escenas autocontenidas sin CDN; el LMS sigue sirviendo local; terminal y visor funcionan sin salir del servidor |
| Varias laptops no pueden con whisper o sd-turbo | Alumnos frenados en E09 y E10 | Proveedores remotos por el gateway con un selector; nunca instancias en el EC2 |
| El instructor avanza y deja gente atrás | Alumnos perdidos desde E07 | Compuerta de avance con umbral por escena y «Mandar ayuda» |
| SSE detrás de nginx con buffering | Escenas que llegan tarde | `proxy_buffering off` y `X-Accel-Buffering: no` en la ruta del stream; probado en 7.2 |

## Fuera de alcance en esta versión

- Compilar o empaquetar en el servidor (Vite, Angular CLI, Rust, Go, TSX con bundler): se hace en la laptop del alumno y se sube el resultado al visor.
- OpenCode dentro del contenedor de aula: el agente del contenedor es `jmd`; OpenCode vive en la laptop.
- Vídeo del instructor dentro del LIVE (se sigue usando Zoom o la sala física).
- Edición colaborativa del mismo archivo entre alumnos.
- Modo LIVE para las clases 1 y 3 (se crea el formato general; las escenas de esas clases se escriben después).

## Primer paso concreto

Fase 0.1: arrancar el gateway con la clave de OpenRouter desde el panel «IA» del LMS y comprobar `jmd whoami` con la cuenta de un alumno. Sin eso, nada de la fase 5 se puede medir y la clase 2 no tiene IA.
