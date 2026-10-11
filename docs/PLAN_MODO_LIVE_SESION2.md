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

## Fases y tareas

Cada tarea cabe en una jornada o menos, tiene criterio de aceptación verificable y marca si va al LMS (Go o Qwik), al gateway (Rust), al contenido o a infraestructura. Orden por dependencias.

### Fase 0 · Preparación (1 día)

| # | Tarea | Dónde | Criterio de aceptación | Estado |
|---|---|---|---|---|
| 0.1 | Arrancar el gateway en producción con la clave de OpenRouter y `GATEWAY_API_KEYS`; conectar el LMS por el panel «IA» | infra | `jmd whoami` desde un alumno muestra su cuota; el Estudio genera una landing | pendiente |
| 0.2 | Verificar los modelos gratis del día: `jmd provider openrouter test`, `jmd models`; fijar la lista blanca inicial en `config.yaml` | gateway | Tabla con 6 modelos que respondieron en menos de 20 s | pendiente |
| 0.3 | Instalar en la Mac del instructor PinePaper MCP (modo `code`), `wireframe-skill` y `motion-design-skill` con el instalador del curso | infra | `claude mcp list` y `/wireframe` responden | pendiente |
| 0.4 | Medir la RAM del servidor con 10 contenedores de aula arrancados; si no cabe, subir la instancia (t3.medium, 4 GB, o t3.large) durante la clase | infra | `free -m` con 10 contenedores y 400 MB libres como mínimo | pendiente |

### Fase 1 · Sala LIVE: sincronía instructor-alumnos (2 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 1.1 | Modelo `live_sessions` en SQLite: lesson_id, estado (preparando, en vivo, cerrada), escena actual, paso actual, iniciada_por, iniciada_en | Go | Migración aplicada; test de store | pendiente |
| 1.2 | Rutas: `POST /api/v1/live/{lesson}/iniciar` y `/cerrar` (instructor); `PUT /api/v1/live/{lesson}/escena` (instructor); `GET /api/v1/live/{lesson}` (estado); `GET /api/v1/live/{lesson}/stream` (SSE, autenticado) | Go | Dos navegadores: cambiar escena en uno se refleja en el otro en menos de 1 s; reconexión automática al cortar la red 10 s | pendiente |
| 1.3 | Página `/live/pa-02/` a pantalla completa (Fullscreen API) con dos vistas: **control** (instructor: lista de escenas, anterior/siguiente, cronómetro, «mostrar a todos», contador de conectados y de «Lo logré» por paso) y **alumno** (la escena actual, paneles plegables de terminal, visor e IA, botón «Lo logré») | Qwik | Captura de las dos vistas; teclado: flechas y espacio cambian escena en control; Escape sale de pantalla completa sin perder la sesión | pendiente |
| 1.4 | Presencia: cada alumno manda un latido cada 15 s; el control muestra quién está conectado y en qué escena mira | Go, Qwik | Lista de presentes con retardo máximo de 20 s | pendiente |
| 1.5 | Modo «libre»: el instructor puede soltar el control para que cada alumno navegue a su ritmo, y volver a tomarlo | Go, Qwik | Interruptor en control; el alumno ve el aviso | pendiente |

### Fase 2 · Escenas HTML vivas de la clase 2 (3 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 2.1 | Formato de escena: carpeta `content/.../live/pa-02/`, `escena.yaml` por escena (id, titulo, fase, paso, duracion_min, lo_logre: bool, evidencia: ninguna, captura, comando) y cargador en Go con recarga en caliente | Go, contenido | `GET /api/v1/live/pa-02/escenas` lista 12 escenas con su fase | pendiente |
| 2.2 | Plantilla base de escena: fondo del tema (cielo con constelaciones), cabecera con fase y número, cuerpo, pie con «Lo logré»; sin CDN; respeta `prefers-reduced-motion` | contenido | Una escena de prueba renderiza en claro y oscuro a 1920×1080 y 1366×768 | pendiente |
| 2.3 | Escenas de **Experiencia** (3): «Edge AI en tu laptop» (animación PinePaper de datos que no salen de la laptop), «Instala los skills» (terminal guiada), «Construye el asistente» (plan de trabajo vivo con obra) | contenido | Cada escena con animación de entrada coreografiada según `motion-design-skill` (tabla de duraciones y easing) | pendiente |
| 2.4 | Escenas de **Reflexión** (2): «Voz y flyer: qué entendió el modelo» (bloque de datos editables), «Mide tu consumo» (gráfico de tokens del alumno en vivo, antes y después de caveman y RTK) | contenido, Qwik | El gráfico lee `/api/v1/mi-uso` y se actualiza cada 10 s | pendiente |
| 2.5 | Escenas de **Conceptos** (4): «Qué es Edge AI», «Skills y modo piedra», «Plan con criterios verificables», «Niveles de imagen por máquina», cada una con un wireframe generado con `wireframe-skill` convertido a ilustración animada (PinePaper, modo código, SVG) | contenido | Texto de cada concepto en una frase, una analogía y un diagrama animado; sin párrafos de más de 3 líneas | pendiente |
| 2.6 | Escenas de **Aplicación** (3): «Probar y medir» (guion de 3 tareas), «Tu flyer» (visor con la imagen generada), «Cierre: tu insignia» (vista previa de la insignia 02 que se enciende al cumplir el umbral) | contenido | «Lo logré» en cada una registra progreso | pendiente |
| 2.7 | Ensayo completo con cronómetro: 120 minutos, 12 escenas, tiempos por escena anotados en `escena.yaml` | contenido | Ensayo grabado; ninguna escena pasa de 12 min | pendiente |

### Fase 3 · Terminal y contenedor de aula por alumno (3 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 3.1 | Imagen `jmd/aula`: Ubuntu 24.04 con Node 22, Python 3.12, PHP 8.3, Rust estable, Go 1.23, `opencode`, `rtk` con hooks activos, `caveman` (CLI, skills y MCP), los 14 skills del taller, `jmd`, `AGENTS.md` de arranque; usuario sin privilegios; sin acceso al socket de Docker | infra | `docker run jmd/aula opencode --version && rtk --version && caveman --version` responde; imagen de menos de 2,5 GB | pendiente |
| 3.2 | Ciclo de vida: `POST /api/v1/aula/iniciar` crea o reutiliza `curso-<sub>` con límites (1 CPU, 768 MB, sin red salvo gateway y npm/pypi por lista blanca), volumen `/trabajo` por alumno; apagado tras 30 min sin uso; borrado al cerrar el LIVE | Go, infra | 10 contenedores a la vez en el servidor sin superar el 85 % de RAM | pendiente |
| 3.3 | Terminal: reutilizar `terminal.tsx` y `/api/v1/term` apuntando al contenedor del alumno; pestañas (hasta 3), copiar y pegar, tamaño de letra, tema claro y oscuro, reconexión | Qwik, Go | Abrir, cerrar y reabrir sin perder la sesión del shell | pendiente |
| 3.4 | Ayuda integrada: panel lateral con los comandos de la escena actual (copiar con un clic), «qué significa este error» para los 15 errores más comunes, y enlace a la clase | Qwik | Captura; cada escena define sus comandos en `escena.yaml` | pendiente |
| 3.5 | Inyección de credenciales: al crear el contenedor, el LMS escribe `~/.config/opencode/opencode.json` con la URL del gateway y el token personal del alumno y el modelo elegido; nunca la clave de OpenRouter | Go | Dentro del contenedor, `opencode` responde con el gateway; la clave central no aparece en ningún archivo | pendiente |
| 3.6 | Interruptores en la UI: «Activar caveman» y «Activar RTK» ejecutan en el contenedor los comandos reales (`caveman setup --install`, `rtk init -g --opencode --auto-patch`) y avisan al LMS para marcar el momento en el gráfico de tokens | Qwik, Go | El gráfico muestra la marca; `rtk gain` dentro del contenedor coincide con el ahorro mostrado | pendiente |

### Fase 4 · Visor de proyectos (2 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 4.1 | Proxy inverso autenticado `GET /vista/{sub}/{ruta…}` hacia `curso-<sub>:3000`, con WebSocket para el HMR de Vite y Angular | Go | Un proyecto Vite con React y otro con Vue muestran cambios en caliente en el iframe | pendiente |
| 4.2 | Plantillas de arranque en el contenedor: `aula nuevo react|vue|angular|html|php|rust-axum|python-flask` crea el proyecto y lo levanta en el 3000 | imagen | Las 7 plantillas levantan en menos de 60 s en el servidor | pendiente |
| 4.3 | Visor en la UI: iframe `sandbox`, barra con URL, recargar, abrir en pestaña, tamaños móvil, tablet y escritorio, captura para evidencia de «Lo logré» | Qwik | Captura guardada como evidencia y visible en la vista del instructor | pendiente |
| 4.4 | Consola del visor: errores de la página en un panel (inyección de un pequeño script por el proxy solo en `text/html`) | Go, Qwik | Un `throw` en la app aparece en el panel con línea y archivo | pendiente |

### Fase 5 · IA por alumno, modelos y consumo (2 días)

| # | Tarea | Dónde | Criterio | Estado |
|---|---|---|---|---|
| 5.1 | Panel «IA» ampliado: clave de OpenRouter central, cuota diaria por alumno y por cohorte (tokens y peticiones), lista blanca de modelos, presupuesto total de la clase | Qwik, Go, gateway | Guardar aplica en el gateway sin reiniciar (`/admin/api/config`) | pendiente |
| 5.2 | «Mi IA» para el alumno: modelo elegido entre los permitidos, token personal regenerable, clave propia opcional, consumo de hoy | Qwik, Go | Cambiar de modelo en la UI cambia lo que usa `opencode` en el contenedor | pendiente |
| 5.3 | `GET /api/v1/mi-uso`: tokens de entrada y salida, peticiones, porcentaje de cuota, marcas de caveman y RTK, serie de los últimos 60 min; fuente: telemetría del gateway por `sub` | Go, gateway | Coincide con el Panel del gateway con diferencia menor al 2 % | pendiente |
| 5.4 | Vista del instructor: tabla de consumo por alumno en vivo, alumnos al 80 % de cuota en ámbar, al 100 % en rojo, botón «dar 20 % más» | Qwik, Go | Captura; el botón amplía la cuota en el gateway | pendiente |
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
| 2 | 2 (resto), 3 | Clase completa en escenas; cada alumno con su terminal y su IA en el contenedor |
| 3 | 4, 5, 5b | Visor con React y Vue en caliente; consumo por alumno en vivo con marcas de caveman y RTK; skills propias aisladas y adaptadas al modelo de cada alumno |
| 4 | 6, 7 | «Lo logré», insignia automática, ensayo general |

Total estimado: 18 a 19 jornadas de desarrollo, más el ensayo.

## Riesgos y mitigación

| Riesgo | Efecto | Mitigación |
|---|---|---|
| El servidor de 3,8 GB no aguanta 10 contenedores con Node y Rust | Terminales lentas o caídas en plena clase | Medir en la fase 0; subir a 8 GB solo durante la clase (bajar después); límites de memoria por contenedor; Rust y Angular como opcionales |
| Los modelos `:free` de OpenRouter cambian de nombre o se agotan (50 peticiones por día por clave sin créditos) | Alumnos sin IA a mitad de clase | Verificar la víspera; cargar 10 USD en la clave para subir a 1000 peticiones por día; cadena `auto` con respaldo; cuota por alumno para que nadie agote la de todos |
| Un alumno pega la clave central en su código y la sube a GitHub | Clave filtrada | La clave nunca sale del gateway; los alumnos solo tienen tokens personales revocables |
| Proxy del visor expone el contenedor de otro alumno | Fuga entre alumnos | Ruta `/vista/{sub}` validada contra la sesión; test que lo cubra |
| Skills de un alumno visibles o editables por otro | Fuga de trabajo y plagio | Skills por `user_id` con pruebas de 403; montaje por contenedor, nunca carpeta compartida |
| Una skill escrita para Claude no funciona con un modelo pequeño | El alumno cree que las skills no sirven | Variante por modelo generada y montada automáticamente (5b.5); «Probar» en la terminal antes de guardar |
| PinePaper en modo Puppeteer lanza Chrome sin sandbox | Riesgo en la máquina del instructor | Usar modo `code`; las escenas se generan en la Mac del instructor, nunca en el servidor |
| Internet del aula cae | Escenas sin animación, IA sin respuesta | Escenas autocontenidas sin CDN; el LMS sigue sirviendo local; terminal y visor funcionan sin salir del servidor |
| SSE detrás de nginx con buffering | Escenas que llegan tarde | `proxy_buffering off` y `X-Accel-Buffering: no` en la ruta del stream; probado en 7.2 |

## Fuera de alcance en esta versión

- Ejecutar frameworks en el navegador sin contenedor (no existe para TSX, Vue, Angular, PHP ni Rust).
- Vídeo del instructor dentro del LIVE (se sigue usando Zoom o la sala física).
- Edición colaborativa del mismo archivo entre alumnos.
- Modo LIVE para las clases 1 y 3 (se crea el formato general; las escenas de esas clases se escriben después).

## Primer paso concreto

Fase 0.1: arrancar el gateway con la clave de OpenRouter desde el panel «IA» del LMS y comprobar `jmd whoami` con la cuenta de un alumno. Sin eso, nada de la fase 5 se puede medir y la clase 2 no tiene IA.
