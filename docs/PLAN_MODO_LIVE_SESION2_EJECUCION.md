# Plan de ejecución · Modo LIVE de la clase 2 · para DeepSeek V4.1 Flash

Este documento convierte `docs/PLAN_MODO_LIVE_SESION2.md` (plan, decisiones 1 a 12, fases 0 a 7 con 3b y 5b; la 3c está retirada) y `docs/GUION_LIVE_SESION2.md` (las 12 escenas E01 a E12) en tickets que un agente de programación rápido ejecuta uno por uno. No sustituye al plan ni al guion: cuando un ticket y el guion discrepen, manda el guion; cuando un ticket y el código real discrepen, el agente se detiene y reporta.

Fecha de redacción: 2026-10-11. Repositorio: `/Users/david.roncal/Documents/jmd`. Desde este documento no se hace commit.

## 1. Cómo usar este plan con DeepSeek V4.1 Flash

DeepSeek V4.1 Flash obedece bien listas numeradas con un verbo por paso, rutas exactas y criterios de sí o no. Se pierde con tareas grandes, con instrucciones implícitas y con «implementa lo necesario». Por eso cada ticket cabe en una o dos conversaciones de 45 minutos, nombra los archivos que puede tocar y termina con comandos cuya salida se compara literalmente.

### 1.1 Protocolo de sesión

1. Una conversación = un ticket. No se encadenan dos tickets en la misma conversación aunque sobre tiempo.
2. La conversación empieza pegando el bloque «Contexto fijo» (1.2) y a continuación el ticket completo, copiado tal cual de este documento.
3. Antes de tocar nada, el agente lee con `cat` o `sed -n` cada archivo de «Lee antes». Si un archivo no existe o una función nombrada no está donde dice el ticket, se detiene y reporta «BLOQUEADO: no coincide con el repo» con la ruta y lo que encontró. No improvisa una ruta parecida.
4. Solo crea o modifica los archivos de «Crea / modifica». Si necesita tocar otro, se detiene y lo pide.
5. Al terminar los pasos ejecuta todos los comandos de «Verifica» y pega su salida real. Si una salida no coincide con la esperada, el ticket no está hecho: corrige o reporta bloqueo.
6. Nunca hace `git commit` ni `git push`. El cierre lo revisa una persona.
7. Reporta con el formato de cierre (1.6). Sin ese formato la sesión no se da por terminada.
8. Las dependencias nuevas (Go, npm, Cargo, pip) están prohibidas salvo que el ticket las nombre en sus pasos.
9. Si el ticket pide una captura, la guarda en `/Users/david.roncal/Documents/jmd/docs/capturas-live/` con el nombre y la resolución indicados (ver 1.4).
10. Un turno = una conversación de hasta 45 minutos de agente. Un ticket de «Turnos: 2» se parte en dos conversaciones: la segunda empieza pegando el reporte de cierre de la primera.

### 1.2 Contexto fijo (pegar al inicio de cada sesión, máximo 40 líneas)

```
CONTEXTO FIJO · Modo LIVE clase 2 · repo /Users/david.roncal/Documents/jmd
- Qué es: LMS del curso «Programación agéntica». Backend Go en lms/api (módulo github.com/davrv93/jmd/lms/api,
  Go 1.26, SQLite sin CGO; rutas en lms/api/internal/httpapi/server.go con mux.Handle("GET /api/v1/..."),
  helpers writeJSON/writeErr/readJSON/badRequest/forbidden/notFound/internal en json.go, middlewares
  s.authed / s.staff / s.admin). Front Qwik City estático en lms/web (src/routes, src/components, src/lib/api.ts).
  Gateway de IA en Rust en la raíz (src/api.rs rutas axum, src/engine.rs, src/telemetry.rs, src/auth.rs) y el
  CLI jmd en src/bin/jmd (main.rs comandos, agent.rs agente, client.rs HTTP, sso.rs tokens).
- Asistente del alumno («osito»): FastAPI en /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito
  (backend/app.py, motores.py, imagen.py, flyer.py; frontend/app.js). En clase corre DENTRO del contenedor del
  alumno con OSITO_PERFIL=nube (sin torch, whisper ni diffusers), puerto interno 8766.
- Contenido del curso: lms/content/courses/programacion-agentica (lessons/02-asistente-con-skills-y-edge-ai.md es
  la clase pa-02; pasos del ciclo: ver, relevar, ollama, skills, plan, construir, voz-imagen, preguntar, entregar).
- Documentos que mandan: docs/PLAN_MODO_LIVE_SESION2.md y docs/GUION_LIVE_SESION2.md (escenas E01..E12).
- Arrancar el LMS en nativo (dos comandos, rutas absolutas):
  cd /Users/david.roncal/Documents/jmd/lms/web && npm run build && rm -rf ../api/internal/webdist/dist && cp -R dist ../api/internal/webdist/dist
  cd /Users/david.roncal/Documents/jmd/lms/api && LMS_ADDR=:8095 LMS_DATA_DIR=/tmp/lms-data LMS_CONTENT_DIR=$(pwd)/../content LMS_ADMIN_EMAIL=instructor@local.test LMS_ADMIN_PASSWORD=local-1234 LMS_ADMIN_NAME="Instructor" LMS_INVITE_CODE=local LMS_COHORT=cohorte-2026-2 LMS_PUBLIC_URL=http://localhost:8095 go run ./cmd/lms
  Login de prueba: POST http://localhost:8095/api/v1/auth/login {"email":"instructor@local.test","password":"local-1234"}.
- Tests: cd /Users/david.roncal/Documents/jmd/lms/api && go test ./...  ·  cd /Users/david.roncal/Documents/jmd/lms/web && npm run lint && npm run build.types
  Rust: cd /Users/david.roncal/Documents/jmd && cargo test  (cargo está en ~/.cargo/bin si no aparece en PATH).
  Patrón de tests Go: lms/api/internal/httpapi/api_test.go (newEnv, e.register, e.login("profe@x.test","profe1234"), e.call, errCode).
- Estilo: todo en español (UI, comentarios, campos JSON nuevos), sin emojis, sin alert/confirm/prompt nativos,
  botones con aria-label, foco visible, prefers-reduced-motion respetado, temas claro y oscuro con los tokens
  --bg --s1 --fg --accent --ok --warn --bad --ph-ec/or/ca/ea de lms/web/src/global.css.
- RAM (reglas duras): nada de Node en el contenedor de aula; sincronía por SSE, nunca WebSocket nuevo; visor
  estático servido por Go; agente del contenedor = jmd (Rust), nunca OpenCode; contenedor Alpine de 192 MB.
- NINGÚN MODELO DE IA CORRE EN EL EC2: nunca whisper, sd-turbo, Ollama, torch ni diffusers en el servidor, ni una
  instancia ni diez. Chat e imagen van por el gateway a proveedores remotos; la voz la reconoce el navegador.
- NINGÚN BINARIO EN LAS LAPTOPS para la clase: la única consola es la del LIVE (terminal, agente jmd, visor,
  todo en el contenedor del alumno). Edge AI local (Ollama, whisper, sd-turbo) es la tarea 2, en casa.
- Terminal: encadena con && y termina con && echo LISTO; recorta salidas con | tail -n 20; rutas absolutas;
  nunca imprimas claves ni tokens (test -n "$VAR" && echo presente); timeout 60 en red y builds.
- Prohibido: commit, push, rm -rf, instalar dependencias no listadas, tocar archivos fuera del ticket,
  cambiar firmas públicas existentes, borrar tests, inventar rutas HTTP que no estén en el ticket.
```

### 1.3 Reglas de código que el agente cumple sin que se le repitan

- Go: cada handler nuevo se registra en `Handler()` de `lms/api/internal/httpapi/server.go` con el método y la ruta exactos del ticket; los cuerpos JSON se leen con `readJSON` (rechaza campos desconocidos: si el ticket añade un campo al cuerpo, se añade al struct); los errores salen con `writeErr(w, código, "codigo_snake", "mensaje en español")`.
- Go: cada tabla nueva va en la constante `schema` de `lms/api/internal/store/store.go` con `CREATE TABLE IF NOT EXISTS`; cada columna nueva en una tabla existente va en la lista `adds` de `migrate()` del mismo archivo.
- Go: `go vet ./...` limpio y `gofmt -l .` sin salida.
- Qwik: componentes en `lms/web/src/components/<nombre>.tsx` con `component$`, estado con `useSignal`/`useStore`, efectos de navegador con `useVisibleTask$` (con `// eslint-disable-next-line qwik/no-use-visible-task` encima, como en `terminal.tsx`); llamadas al API solo a través del objeto `api` de `lms/web/src/lib/api.ts`.
- Qwik: una ruta nueva con parámetro se añade a `shellSections` en `server.go` y lleva `onStaticGenerate` (ver `lms/web/src/routes/lessons/[id]/index.tsx`).
- Rust: `cargo fmt --check` y `cargo clippy --all-targets` sin avisos nuevos; los tests de integración siguen `tests/gateway.rs` (proveedor falso con axum) y `tests/jmd_cli.rs` (binario `jmd` con HOME temporal).
- Python (osito): solo biblioteca estándar más lo que ya está en `requirements.txt`; el perfil nube no importa torch, faster_whisper, diffusers ni fastembed.
- Contenido: los archivos bajo `lms/content` se recargan solos a los 5 s (`content.Store.Watch`); no hace falta reiniciar.

### 1.4 Capturas

Con Playwright (`lms/scripts/_pw.mjs` resuelve `playwright-core`; no está en `lms/web`; importa de ahí, no lo instales) contra el LMS en `http://localhost:8095`:

```
cd /Users/david.roncal/Documents/jmd/lms/web && PLAYWRIGHT_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node ../scripts/captura.mjs <url> <ancho>x<alto> <ruta-png> [light|dark]
```

El guion `lms/scripts/captura.mjs` se crea en T-0.6. Carpeta: `/Users/david.roncal/Documents/jmd/docs/capturas-live/`. Nombre: `<ticket>-<vista>-<ancho>x<alto>-<tema>.png` (ejemplo `T-1.7-control-1920x1080-dark.png`).

### 1.5 Estimación

Un turno = una conversación de hasta 45 minutos. Un ticket nunca pasa de 2 turnos; si al terminar el segundo no está verde, se reporta bloqueado y se parte el ticket.

### 1.6 Formato de cierre de ticket (obligatorio)

```
TICKET: T-x.y · <título>
HECHO: <sí | parcial | bloqueado> — una frase.
ARCHIVOS CAMBIADOS:
- /ruta/absoluta/archivo (creado | modificado) — qué cambió en una línea
COMANDOS DE VERIFICACIÓN (comando → salida real, recortada a 20 líneas):
- `...` → ...
PENDIENTE O BLOQUEADO:
- <nada | qué falta y por qué, con la ruta o el error literal>
```

> Decisión del instructor (11-10): el avatar de la clase es el ROBOT, nunca el osito. Las escenas y textos visibles dicen «robot»; las rutas técnicas `/trabajo/osito/…` se conservan.

> Regla de pruebas Go: el contenido vive fuera del módulo, así que la caché de `go test` no ve sus cambios. Corre siempre `go test -count=1 ./internal/content`.

## 2. Mapa de dependencias

Un turno = una conversación de hasta 45 minutos. Riesgo: bajo (cambio local y probado), medio (toca varias piezas o infraestructura), alto (contrato nuevo, concurrencia, seguridad o refactor de código existente).

| Ticket | Fase | Título corto | Depende de | Turnos | Riesgo |
|---|---|---|---|---|---|
| T-0.1 | 0 | Entorno local verificado | — | 1 | bajo |
| T-0.2 | 0 | Gateway en producción con clave | T-0.1 | 1 | medio |
| T-0.3 | 0 | Panel IA del LMS conectado al gateway | T-0.2 | 1 | bajo |
| T-0.4 | 0 | Modelos gratis verificados y lista blanca semilla | T-0.2 | 1 | medio |
| T-0.5 | 0 | PinePaper, wireframe y motion en la Mac | — | 1 | bajo |
| T-0.6 | 0 | Guion de capturas captura.mjs | T-0.1 | 1 | bajo |
| T-0.7 | 0 | Medición de RAM con 10 contenedores Alpine | T-0.2 | 1 | medio |
| T-1.1 | 1 | Tabla live_sessions y store | T-0.1 | 1 | bajo |
| T-1.2 | 1 | Hub SSE en memoria | T-0.1 | 1 | medio |
| T-1.3 | 1 | Rutas de estado del LIVE | T-1.1 | 1 | bajo |
| T-1.4 | 1 | Stream SSE del LIVE | T-1.2, T-1.3 | 1 | medio |
| T-1.5 | 1 | Cliente api.ts y live.ts | T-1.4 | 1 | bajo |
| T-1.6 | 1 | Ruta /live/[id]/ esqueleto | T-1.5 | 1 | medio |
| T-1.7 | 1 | Vista control del instructor | T-1.6 | 2 | medio |
| T-1.8 | 1 | Vista alumno a pantalla completa | T-1.6 | 2 | medio |
| T-1.9 | 1 | Presencia por latido | T-1.4, T-1.7 | 1 | bajo |
| T-1.10 | 1 | Modo libre y retomar | T-1.7, T-1.8 | 1 | bajo |
| T-1.11 | 1 | Compuerta de avance (Go) | T-1.9, T-2.1, T-6.1 | 1 | medio |
| T-1.12 | 1 | Compuerta de avance (UI) | T-1.11 | 1 | medio |
| T-1.13 | 1 | Eventos de actividad y semáforo | T-1.9 | 2 | medio |
| T-1.14 | 1 | Mandar ayuda y mensaje a todos | T-1.12, T-1.13 | 1 | bajo |
| T-1.15 | 1 | Emparejar al azar | T-1.9 | 1 | bajo |
| T-2.1 | 2 | Esquema escena.yaml y cargador | T-0.1 | 1 | medio |
| T-2.2 | 2 | Rutas de escenas y HTML | T-2.1 | 1 | bajo |
| T-2.3 | 2 | Plantilla base y escena de prueba | T-2.2, T-0.6 | 1 | bajo |
| T-2.4 | 2 | Motor de evidencias automáticas | T-1.11, T-3.4 | 2 | alto |
| T-2.5 | 2 | E01 Bienvenida | T-2.3, T-1.8 | 2 | medio |
| T-2.6 | 2 | E02 Edge AI en una frase | T-2.3, T-0.5 | 1 | bajo |
| T-2.7 | 2 | E03 Tu laptop decide | T-2.3, T-2.4, T-3.6, T-5.5 | 1 | medio |
| T-2.8 | 2 | E04 Skills y modo piedra | T-2.3, T-2.4, T-5b.2 | 1 | medio |
| T-2.9 | 2 | E05 Mide tu consumo | T-2.3, T-5.7 | 1 | medio |
| T-2.10 | 2 | E06 Plan con criterios | T-2.3, T-2.4 | 1 | bajo |
| T-2.11 | 2 | E07 Construir 1: el chat | T-2.3, T-2.4, T-4.2, T-5.12 | 1 | medio |
| T-2.12 | 2 | E08 Construir 2: el avatar 3D | T-2.3, T-4.2 | 1 | bajo |
| T-2.13 | 2 | E09 Construir 3: la voz | T-2.3, T-2.4, T-5.12 | 1 | bajo |
| T-2.14 | 2 | E10 Construir 4: imagen y flyer | T-2.3, T-4.5, T-5.12 | 1 | medio |
| T-2.15 | 2 | E11 Probar y medir | T-2.3, T-1.15 | 1 | medio |
| T-2.16 | 2 | E12 Tu insignia | T-2.3, T-6.5 | 1 | bajo |
| T-2.17 | 2 | Capturas de respaldo y ensayo cronometrado | T-2.5 a T-2.16 | 1 | bajo |
| T-3.1 | 3 | Dockerfile jmd/aula con el backend en modo nube | T-0.1 | 2 | medio |
| T-3.2 | 3 | AGENTS.md, skills, código del osito y script aula | T-3.1 | 1 | bajo |
| T-3.3 | 3 | Paquete internal/aula (límites 192 MB) | T-3.1 | 1 | medio |
| T-3.4 | 3 | Rutas del aula y arranque del asistente | T-3.3 | 1 | medio |
| T-3.5 | 3 | Apagado por inactividad y borrado al cerrar | T-3.4, T-1.3 | 1 | medio |
| T-3.6 | 3 | Terminal al contenedor | T-3.4 | 1 | medio |
| T-3.7 | 3 | Terminal UI con pestañas y reconexión | T-3.6 | 2 | medio |
| T-3.8 | 3 | Panel de ayuda de la terminal | T-2.1, T-3.7 | 1 | bajo |
| T-3.9 | 3 | Inyección de credenciales sin clave central | T-3.4, T-5.3 | 1 | alto |
| T-3.10 | 3 | Tabla live_marcas | T-1.1 | 1 | bajo |
| T-3.11 | 3 | Interruptor piedra (caveman) | T-3.10, T-3.9 | 1 | medio |
| T-3.12 | 3 | Interruptor RTK | T-3.10, T-3.4 | 1 | medio |
| T-3.13 | 3 | Precrear contenedores y medir 10 con asistente | T-3.4, T-3.9 | 1 | medio |
| T-3b.1 | 3b | Barra de estado de jmd y --json | T-0.1 | 1 | medio |
| T-3b.2 | 3b | Costo por respuesta en el gateway | T-0.1 | 2 | medio |
| T-3b.3 | 3b | Costo del día y saldo en whoami | T-3b.2 | 1 | bajo |
| T-3b.4 | 3b | Progreso de reintentos por SSE | T-0.1 | 2 | alto |
| T-3b.5 | 3b | Línea viva y Ctrl-C en jmd | T-3b.4 | 1 | medio |
| T-3b.6 | 3b | Hook de tareas al LMS | T-0.1 | 1 | medio |
| T-3b.7 | 3b | Panel de tareas y MCP junto a la terminal | T-3b.6, T-3.7 | 1 | bajo |
| T-3b.8 | 3b | Prueba de aula con 5 alumnos | T-3b.5, T-3b.7 | 1 | bajo |
| T-3b.9 | 3b | Refactor Agent: Confirmador y Emisor | T-3b.1 | 2 | alto |
| T-3b.10 | 3b | jmd serve --embed: esqueleto | T-3b.9 | 1 | medio |
| T-3b.11 | 3b | Embed: turno y eventos | T-3b.10 | 2 | alto |
| T-3b.12 | 3b | Embed: confirmar, cancelar, skills | T-3b.11 | 1 | medio |
| T-3b.13 | 3b | Proxy Go al jmd embebido | T-3b.12, T-3.4 | 1 | medio |
| T-3b.14 | 3b | Panel Agente: historial en streaming | T-3b.13 | 2 | medio |
| T-3b.15 | 3b | Panel Agente: herramientas y cancelar | T-3b.14 | 1 | medio |
| T-3b.16 | 3b | Panel Agente: tareas, MCP, selector | T-3b.15, T-5.5 | 1 | bajo |
| T-3b.17 | 3b | Puente agente-visor-terminal y réplica al instructor | T-3b.16, T-4.1 | 2 | medio |
| T-4.1 | 4 | Visor estático /vista/{sub} desde /trabajo | T-3.3 | 2 | alto |
| T-4.2 | 4 | Relé /vista/{sub}/api al asistente del contenedor | T-4.1, T-3.4 | 1 | alto |
| T-4.3 | 4 | Plantillas aula nuevo sin bundler | T-3.2 | 1 | bajo |
| T-4.4 | 4 | Visor UI con sondeo | T-4.1, T-1.8 | 1 | medio |
| T-4.5 | 4 | Captura de evidencia del visor | T-4.4, T-6.1 | 1 | medio |
| T-4.6 | 4 | Consola del visor | T-4.1, T-4.4 | 1 | medio |
| T-5.1 | 5 | Ajustes ia.* aplicados al gateway | T-0.3 | 1 | medio |
| T-5.2 | 5 | Panel IA ampliado (UI) | T-5.1 | 1 | medio |
| T-5.3 | 5 | Tokens personales sin realm (gateway) | T-0.1 | 1 | medio |
| T-5.4 | 5 | Mi IA (Go) | T-5.3, T-5.1 | 1 | medio |
| T-5.5 | 5 | Mi IA (UI) | T-5.4 | 1 | bajo |
| T-5.6 | 5 | Uso por sub con serie (gateway) | T-0.1 | 1 | medio |
| T-5.7 | 5 | GET /api/v1/mi-uso | T-5.6, T-3.10 | 1 | medio |
| T-5.8 | 5 | Cuota extra por alumno | T-5.6 | 1 | medio |
| T-5.9 | 5 | Vista instructor de consumo | T-5.7, T-5.8 | 1 | bajo |
| T-5.10 | 5 | Imágenes remotas en el gateway | T-0.4 | 2 | alto |
| T-5.11 | 5 | Transcripción remota en el gateway | T-0.4 | 2 | alto |
| T-5.12 | 5 | Perfil nube del osito | T-5.10, T-5.11 | 2 | medio |
| T-5.13 | 5 | Mi IA: proveedor de imagen y bloque para la tarea 2 | T-5.12, T-5.5 | 1 | bajo |
| T-5.14 | 5 | Lista blanca con precio y verificación diaria | T-0.4, T-5.2 | 1 | medio |
| T-5b.1 | 5b | Tabla skills y store | T-0.1 | 1 | bajo |
| T-5b.2 | 5b | Rutas mis-skills con 403 | T-5b.1 | 2 | medio |
| T-5b.3 | 5b | Skills del curso y copiar | T-5b.2 | 1 | bajo |
| T-5b.4 | 5b | Montaje en el contenedor y sincronización | T-5b.2, T-3.4 | 2 | medio |
| T-5b.5 | 5b | Editor Mis skills (UI) | T-5b.3 | 2 | medio |
| T-5b.6 | 5b | Botón Probar en la terminal | T-5b.5, T-3.7 | 1 | bajo |
| T-5b.7 | 5b | Perfiles por modelo y variante determinista | T-5b.1 | 2 | medio |
| T-5b.8 | 5b | Adaptar a mi modelo (Go, gateway) | T-5b.7, T-5.4 | 1 | medio |
| T-5b.9 | 5b | Adaptar a mi modelo (UI con diff) | T-5b.8 | 1 | bajo |
| T-5b.10 | 5b | Zip personal y compartir | T-5b.2 | 1 | bajo |
| T-5b.11 | 5b | Inventario del instructor | T-5b.10 | 1 | bajo |
| T-6.1 | 6 | Evidencia en el progreso | T-0.1 | 1 | bajo |
| T-6.2 | 6 | Botón Lo logré con deshacer | T-6.1, T-1.8 | 1 | bajo |
| T-6.3 | 6 | Plan de trabajo desde escena.yaml (Go) | T-2.1 | 1 | bajo |
| T-6.4 | 6 | Plan y matriz (UI) | T-6.3 | 1 | bajo |
| T-6.5 | 6 | Emisión automática al cerrar | T-1.3, T-6.1 | 1 | medio |
| T-6.6 | 6 | Exportación CSV del LIVE | T-6.5, T-5.7 | 1 | bajo |
| T-7.1 | 7 | Barrido de tests | todo lo anterior | 1 | bajo |
| T-7.2 | 7 | Carga con 12 navegadores | T-7.1 | 1 | medio |
| T-7.3 | 7 | Prueba de uso con 3 alumnos | T-7.2 | 1 | bajo |
| T-7.4 | 7 | Ensayo general | T-7.3, T-2.17 | 1 | bajo |
| T-7.5 | 7 | docs/MODO_LIVE.md y ejemplo | T-7.4 | 1 | bajo |

Total: 111 tickets (0: 7 · 1: 15 · 2: 17 · 3: 13 · 3b: 17 · 4: 6 · 5: 14 · 5b: 11 · 6: 6 · 7: 5).

## 3. Tickets

Las rutas sin barra inicial son relativas a `/Users/david.roncal/Documents/jmd`. `R=/Users/david.roncal/Documents/jmd` en los comandos. `$TOK` es el token devuelto por el login de prueba del contexto fijo (`curl -s -X POST localhost:8095/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"instructor@local.test","password":"local-1234"}' | jq -r .token`); `$ALU` es el token de un alumno registrado con `POST /api/v1/auth/register {"email":"ana@local.test","name":"Ana","password":"ana-1234","invite_code":"local"}`.

### Fase 0 · Preparación

### T-0.1 · Entorno local verificado
Depende de: —  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Comprobar que el front compila, el backend arranca con la base vacía, los tests Go y Rust pasan y el login de prueba responde.
Lee antes (rutas exactas): lms/README.md · lms/api/cmd/lms/main.go · lms/web/package.json · Cargo.toml
Crea / modifica (rutas exactas, nada más): ninguno
Pasos:
1. Ejecutar el primer comando de arranque del contexto fijo (build del front y copia a `lms/api/internal/webdist/dist`).
2. Arrancar el backend con el segundo comando en segundo plano (`&`) y esperar 3 s.
3. Hacer el login de prueba y guardar el token en `$TOK`.
4. Correr `go test ./...` en `lms/api`, `npm run lint && npm run build.types` en `lms/web` y `cargo test` en la raíz.
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/health | jq -c .ok` → `true`
- `cd $R/lms/api && go test ./... 2>&1 | tail -4 | grep -c '^ok'` → `3`
- `cd $R && timeout 600 ~/.cargo/bin/cargo test 2>&1 | grep -c 'test result: ok'` → un número mayor o igual a `4`
Hecho significa (sí/no): los tres comandos dan la salida esperada y el token tiene prefijo `lms_`.
No hagas: instalar nada con npm o cargo; tocar archivos; cambiar puertos distintos de 8095.

### T-0.2 · Gateway en producción con clave
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Dejar `ai-orchestrator` corriendo en el EC2 con `OPENROUTER_API_KEY`, `GATEWAY_API_KEYS` y `ADMIN_TOKEN` definidos en `.env`, sin imprimir ninguno.
Lee antes (rutas exactas): compose.yaml · .env.example · README.md (sección «Arranque») · lms/scripts/activar-ia.sh
Crea / modifica (rutas exactas, nada más): `.env` del servidor (solo por `ssh`, nunca en el repo)
Pasos:
1. En el EC2 (`ssh` con la llave del curso, usuario `ubuntu`, carpeta del clon de `jmd`): `test -n "$(grep -E '^OPENROUTER_API_KEY=.+' .env)" && echo presente || echo falta`.
2. Si falta, el instructor la pega a mano; el agente no la escribe.
3. Comprobar igual `GATEWAY_API_KEYS` y `ADMIN_TOKEN`.
4. `sudo docker compose up -d orchestrator && echo LISTO`.
Verifica (comando exacto → salida esperada):
- `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4000/health` (en el EC2) → `200`
- `sudo docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' ai-orchestrator | awk '{print $2}'` → menos de `60MiB`
Hecho significa (sí/no): `/health` responde 200 y el contenedor usa menos de 60 MiB.
No hagas: `echo` de variables con KEY o TOKEN; `docker compose down`; editar `config.yaml` del repo.

### T-0.3 · Panel IA del LMS conectado al gateway
Depende de: T-0.2  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Guardar desde `PUT /api/v1/admin/llm` la URL `http://ai-orchestrator:4000/v1/chat/completions`, el modelo `auto` y una clave de `GATEWAY_API_KEYS`, y verificar con `POST /api/v1/admin/llm/test`.
Lee antes (rutas exactas): lms/api/internal/httpapi/llm_settings.go (`adminLLMPut`, `adminLLMTest`) · lms/web/src/components/ia-config.tsx
Crea / modifica (rutas exactas, nada más): ninguno (solo datos en la base del LMS de producción)
Pasos:
1. Con el token del instructor en producción: `curl -s -X PUT https://jmd-learn.online/api/v1/admin/llm -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"url":"http://ai-orchestrator:4000/v1/chat/completions","model":"auto","enabled":true,"key":"'"$CLAVE"'"}' | jq -c '{enabled,key_set}'`.
2. `curl -s -X POST https://jmd-learn.online/api/v1/admin/llm/test -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{}' | jq -c '{ok,status}'`.
Verifica (comando exacto → salida esperada):
- paso 1 → `{"enabled":true,"key_set":true}`
- paso 2 → `{"ok":true,"status":200}`
Hecho significa (sí/no): la prueba devuelve `ok: true` en menos de 20 s.
No hagas: poner la clave de OpenRouter en el LMS (va solo en el gateway); cambiar la URL a OpenRouter directo.

### T-0.4 · Modelos gratis verificados y lista blanca semilla
Depende de: T-0.2  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Obtener la tabla de modelos `:free` que responden hoy y dejar la lista blanca inicial (chat e imagen) en `config.yaml`.
Lee antes (rutas exactas): config.yaml (secciones `providers`, `models`, `agents`) · src/config.rs (`ModelSpec`) · docs/GUION_LIVE_SESION2.md (tabla «Proveedores remotos de respaldo»)
Crea / modifica (rutas exactas, nada más): config.yaml · docs/capturas-live/T-0.4-modelos.md (tabla de resultados)
Pasos:
1. `jmd provider openrouter test --json > /tmp/or-models.json && jq '.models | length' /tmp/or-models.json`.
2. Filtrar ids que contengan `deepseek`, `qwen`, `glm`, `kimi`, `minimax` y terminen en `:free` o cuesten menos de 0,20 USD por millón (`pricing.prompt` en `/models` de OpenRouter).
3. Probar cada candidato con `jmd chat -m <id> "Responde solo: ok"` y `time`; anotar latencia.
4. Añadir en `config.yaml` bajo `models:` una entrada por modelo que respondió en menos de 20 s, con `cost: 0` o `1` y `deployments: [{provider: openrouter, model: "<id>"}]`; crear el agente `clase:` con `chain:` ordenada por latencia y `priority: speed`.
5. Escribir la tabla (id, latencia, costo, herramientas sí/no) en `docs/capturas-live/T-0.4-modelos.md`.
Verifica (comando exacto → salida esperada):
- `grep -c 'provider: openrouter' $R/config.yaml` → al menos `6` más que antes del ticket
- `cd $R && ~/.cargo/bin/cargo test config 2>&1 | grep -c 'test result: ok'` → `1`
Hecho significa (sí/no): hay 6 o más modelos que respondieron y el agente `clase` existe.
No hagas: inventar ids de modelos; dejar un modelo que dio 404; tocar `auth:` ni `savings:`.

### T-0.5 · PinePaper, wireframe y motion en la Mac
Depende de: —  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Dejar instalados en la Mac del instructor PinePaper MCP en modo `code`, `wireframe-skill` y `motion-design-skill` para generar las animaciones de las escenas.
Lee antes (rutas exactas): instalador/README.md · docs/GUION_LIVE_SESION2.md (párrafo introductorio de «Escenas»)
Crea / modifica (rutas exactas, nada más): `~/.claude/skills/wireframe-skill/` · `~/.claude/skills/motion-design-skill/` · `~/.claude.json` (entrada MCP `pinepaper`)
Pasos:
1. `claude mcp add pinepaper -- npx -y pinepaper-mcp --mode code` (si el nombre del paquete difiere, detenerse y reportar; no probar variantes).
2. Copiar las dos skills a `~/.claude/skills/` desde la carpeta del curso que indique el instructor.
3. `claude mcp list | grep -c pinepaper`.
Verifica (comando exacto → salida esperada):
- `claude mcp list 2>/dev/null | grep -c pinepaper` → `1`
- `ls ~/.claude/skills | grep -c -E 'wireframe-skill|motion-design-skill'` → `2`
Hecho significa (sí/no): PinePaper aparece en la lista MCP y `/wireframe` responde en Claude Code.
No hagas: usar PinePaper en modo Puppeteer; instalar nada en el EC2.

### T-0.6 · Guion de capturas captura.mjs
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Crear `lms/scripts/captura.mjs` que entra con un usuario, abre una URL, fija viewport y tema y guarda un PNG.
Lee antes (rutas exactas): lms/scripts/e2e.mjs · lms/web/src/root.tsx (clave `lms.tema` en localStorage)
Crea / modifica (rutas exactas, nada más): lms/scripts/captura.mjs · docs/capturas-live/.gitkeep
Pasos:
1. Copiar el arranque de `lms/scripts/captura.mjs` (import desde `./_pw.mjs`, `PLAYWRIGHT_CHROMIUM`, `--no-sandbox`).
2. Argumentos: `url`, `WxH`, `ruta.png`, `light|dark` (opcional); variables `LMS_EMAIL`, `LMS_PASSWORD` (por defecto `instructor@local.test` / `local-1234`).
3. Entrar por `POST /api/v1/auth/login` con `page.request`, poner la cookie `lms_session` con el token, `localStorage.setItem("lms.tema", tema)`, `page.goto(url)`, esperar `networkidle`, `page.screenshot({path, fullPage:false})`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && PLAYWRIGHT_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node ../scripts/captura.mjs http://localhost:8095/courses/ 1366x768 $R/docs/capturas-live/T-0.6-cursos-1366x768-dark.png dark && test -s $R/docs/capturas-live/T-0.6-cursos-1366x768-dark.png && echo LISTO` → `LISTO`
Hecho significa (sí/no): el PNG existe, pesa más de 10 KB y muestra la lista de cursos en tema oscuro.
No hagas: añadir `playwright` (usa `_pw.mjs`); escribir el token en el PNG o en logs.

### T-0.7 · Medición de RAM con 10 contenedores Alpine
Depende de: T-0.2  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Medir en el EC2 cuánta RAM consumen 10 contenedores `alpine:3.22` en reposo con los límites del aula y anotar la memoria disponible.
Lee antes (rutas exactas): docs/PLAN_MODO_LIVE_SESION2.md (sección «Restricción dura») · lms/api/internal/runner/runner.go (flags de `ShellCmd`)
Crea / modifica (rutas exactas, nada más): docs/capturas-live/T-0.7-ram.md
Pasos:
1. En el EC2: `free -m | awk '/Mem:/{print $7}'` (disponible antes).
2. `for i in $(seq 1 10); do sudo docker run -d --rm --name medir-$i --memory 192m --cpus 0.5 --pids-limit 96 alpine:3.22 sleep 3600; done && echo LISTO`.
3. `sleep 20 && sudo docker stats --no-stream --format '{{.MemUsage}}' $(seq -f 'medir-%g' 1 10) | awk '{s+=$1} END{print s " MiB sumados"}'`.
4. `free -m | awk '/Mem:/{print $7}'` (disponible después); `for i in $(seq 1 10); do sudo docker rm -f medir-$i; done`.
5. Anotar las cuatro cifras en `docs/capturas-live/T-0.7-ram.md` y la decisión: Keycloak apagado durante el LIVE sí/no, subir a 8 GB las 3 horas sí/no.
Verifica (comando exacto → salida esperada):
- paso 3 → menos de `120 MiB sumados`
- `grep -c 'disponible' $R/docs/capturas-live/T-0.7-ram.md` → `2`
Hecho significa (sí/no): la suma de 10 contenedores vacíos está bajo 120 MiB y la decisión queda escrita.
No hagas: dejar contenedores `medir-*` vivos; parar Keycloak sin que el instructor lo pida; usar otra imagen.

### Fase 1 · Sala LIVE: sincronía, presencia, compuerta

### T-1.1 · Tabla live_sessions y store
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Añadir la tabla `live_sessions` y las funciones `LiveSession` y `UpsertLiveSession` al store.
Lee antes (rutas exactas): lms/api/internal/store/store.go (constante `schema`, `migrate`, sección «ajustes») · lms/api/internal/store/migrate_test.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/store/store.go · lms/api/internal/store/live_test.go
Pasos:
1. Añadir al final de `schema`: `CREATE TABLE IF NOT EXISTS live_sessions (lesson_id TEXT PRIMARY KEY, estado TEXT NOT NULL DEFAULT 'preparando', escena TEXT NOT NULL DEFAULT '', paso TEXT NOT NULL DEFAULT '', visible INTEGER NOT NULL DEFAULT 1, modo TEXT NOT NULL DEFAULT 'guiado', mensaje TEXT NOT NULL DEFAULT '', iniciada_por TEXT NOT NULL DEFAULT '', iniciada_en TEXT, cerrada_en TEXT, actualizada_en TEXT NOT NULL);`
2. Definir `type LiveSession struct { LessonID, Estado, Escena, Paso string; Visible bool; Modo, Mensaje, IniciadaPor string; IniciadaEn, CerradaEn *time.Time; ActualizadaEn time.Time }`.
3. `func (d *DB) LiveSession(ctx context.Context, lessonID string) (*LiveSession, error)` devuelve `ErrNotFound` si no existe.
4. `func (d *DB) UpsertLiveSession(ctx context.Context, s *LiveSession) error` con `INSERT ... ON CONFLICT(lesson_id) DO UPDATE SET ...` y `actualizada_en = now()`.
5. Test `TestLiveSessionUpsert`: crear, leer, cambiar `Escena` a `03-tu-laptop`, releer y comprobar `Estado == "en_vivo"` y `Escena`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/store -run TestLiveSessionUpsert -v 2>&1 | tail -2` → `--- PASS: TestLiveSessionUpsert` y `ok`
Hecho significa (sí/no): el test pasa y `go test ./...` sigue verde.
No hagas: tocar tablas existentes; usar otro nombre que `live_sessions`; añadir dependencias.

### T-1.2 · Hub SSE en memoria
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Crear `liveHub`, un difusor por lección en memoria con suscripción, publicación y cierre seguros.
Lee antes (rutas exactas): lms/api/internal/httpapi/term_handlers.go (patrón `slots` con mutex) · lms/api/internal/httpapi/server.go (struct `Server`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_hub.go · lms/api/internal/httpapi/live_hub_test.go · lms/api/internal/httpapi/server.go (campo `live *liveHub` y su `if s.live == nil { s.live = newLiveHub() }` en `Handler()`)
Pasos:
1. `type liveSub struct { ch chan []byte; userID string; staff bool }`; `type liveHub struct { mu sync.Mutex; subs map[string]map[*liveSub]struct{} }`.
2. `func (h *liveHub) subscribe(lesson, userID string, staff bool) (*liveSub, func())` crea el canal con buffer 32 y devuelve la función de baja.
3. `func (h *liveHub) publish(lesson, event string, data any)` serializa `event: <event>\ndata: <json>\n\n` y lo envía sin bloquear (`select` con `default`: si el buffer está lleno se descarta y se cuenta en `descartados`).
4. `func (h *liveHub) publishStaff(lesson, event string, data any)` solo a `staff`.
5. `func (h *liveHub) count(lesson string) int`.
6. Test `TestLiveHubPublica`: tres suscriptores, un `publish`, los tres reciben el mismo bytes; baja de uno, `count` baja a 2; `publishStaff` llega solo al staff.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestLiveHub -race -v 2>&1 | tail -2` → `--- PASS: TestLiveHubPublica` y `ok`
Hecho significa (sí/no): el test pasa con `-race`.
No hagas: usar WebSocket; goroutines sin cierre; canales sin buffer.

### T-1.3 · Rutas de estado del LIVE
Depende de: T-1.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Exponer iniciar, cerrar, cambiar escena, cambiar modo y leer el estado de la sesión LIVE de una lección.
Lee antes (rutas exactas): lms/api/internal/httpapi/server.go (`Handler`, `staff`) · lms/api/internal/httpapi/course_handlers.go (`visibleLesson`, `setProgress`) · lms/api/internal/httpapi/api_test.go (`newEnv`, `call`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_handlers.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go (registro de rutas)
Pasos:
1. `liveView(s *store.LiveSession, conectados int) map[string]any` → `{"lesson_id","estado","escena","paso","visible","modo","mensaje","iniciada_en","conectados","t"}` con `t` = ahora en RFC3339.
2. `POST /api/v1/live/{lesson}/iniciar` (staff, cuerpo `{}`): estado `en_vivo`, `iniciada_por = p.ID`, `iniciada_en = now`, escena = primera escena si hay (T-2.2; hasta entonces `""`); publica `estado` en el hub.
3. `POST /api/v1/live/{lesson}/cerrar` (staff): estado `cerrada`, `cerrada_en = now`; publica `cierre`.
4. `PUT /api/v1/live/{lesson}/escena` (staff, cuerpo `{"escena":"03-tu-laptop","visible":true}`): 404 `escena_desconocida` si T-2.2 ya existe y no la encuentra; guarda y publica `estado`.
5. `PUT /api/v1/live/{lesson}/modo` (staff, cuerpo `{"modo":"libre"}`; valores `guiado|libre`).
6. `GET /api/v1/live/{lesson}` (autenticado): si no hay fila, devuelve `{"estado":"preparando",...}` sin crearla.
7. Todas validan la lección con `s.Content.Get().Lesson(id)` y `visibleLesson`; 404 `not_found` si no existe.
8. Tests `TestLiveEstado` (alumno recibe 403 al iniciar; instructor inicia y cambia escena; alumno lee `escena` nueva) y `TestLiveModoInvalido` (`{"modo":"x"}` → 400).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run 'TestLive' -v 2>&1 | grep -c '^--- PASS'` → `3` (incluye el del hub)
- `curl -s -X POST localhost:8095/api/v1/live/pa-02/iniciar -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{}' | jq -c '{estado,modo}'` → `{"estado":"en_vivo","modo":"guiado"}`
Hecho significa (sí/no): los tests pasan y el `curl` responde como se indica.
No hagas: cambiar `setProgress`; crear la fila en el `GET`; aceptar el cuerpo sin `readJSON`.

### T-1.4 · Stream SSE del LIVE
Depende de: T-1.2, T-1.3  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Servir `GET /api/v1/live/{lesson}/stream` como Server-Sent Events con el estado inicial, los eventos del hub y un ping cada 15 s.
Lee antes (rutas exactas): lms/api/internal/httpapi/live_hub.go · lms/api/internal/httpapi/live_handlers.go · lms/api/internal/httpapi/server.go (`secureHeaders`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_stream.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. Cabeceras: `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`, `Connection: keep-alive`; primera línea `retry: 2000\n\n`; `http.Flusher` tras cada escritura.
2. Enviar de inmediato `event: estado` con `liveView` actual.
3. Bucle `select` sobre `sub.ch`, `time.Ticker` de 15 s (`: ping\n\n`) y `r.Context().Done()`; al salir, dar de baja la suscripción.
4. Eventos y JSON que viajan por este stream (los producen otros tickets): `estado` → liveView; `presencia` → alumnos `{"conectados":7}`, staff `{"conectados":[{"sub":"…","nombre":"Ana","escena":"03-tu-laptop","visto":"2026-10-15T19:05:00Z","semaforo":"ambar"}]}`; `logre` → `{"paso":"construir","sub":"…","total":4}`; `mensaje` → `{"texto":"cambien a modelo remoto","para":"todos|<sub>"}`; `pareja` → `{"con":["<sub>"],"vista":"/vista/<sub>/"}`; `cierre` → `{"lesson_id":"pa-02","insignias_emitidas":8}`.
5. Test `TestLiveStreamTresClientes`: tres `GET` concurrentes con `http.Client` y `context.WithTimeout(3s)`; un `PUT /escena`; cada cliente lee al menos dos bloques `event: estado` y el segundo contiene `"escena":"03-tu-laptop"`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestLiveStreamTresClientes -race -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s -N -m 3 localhost:8095/api/v1/live/pa-02/stream -H "Authorization: Bearer $TOK" | head -3` → `retry: 2000`, línea vacía, `event: estado`
Hecho significa (sí/no): el test con `-race` pasa y el `curl` muestra el evento inicial.
No hagas: usar WebSocket; bufferizar; olvidar `X-Accel-Buffering: no`; dejar la goroutine sin baja al desconectar.

### T-1.5 · Cliente api.ts y live.ts
Depende de: T-1.4  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Añadir al front los tipos y funciones del LIVE y un cliente `EventSource` con reconexión.
Lee antes (rutas exactas): lms/web/src/lib/api.ts (`req`, objeto `api`) · lms/web/src/lib/url.ts
Crea / modifica (rutas exactas, nada más): lms/web/src/lib/api.ts · lms/web/src/lib/live.ts
Pasos:
1. En `api.ts`: `export interface LiveEstado { lesson_id: string; estado: "preparando"|"en_vivo"|"cerrada"; escena: string; paso: string; visible: boolean; modo: "guiado"|"libre"; mensaje: string; iniciada_en: string|null; conectados: number; t: string }`.
2. En el objeto `api`: `liveEstado(lesson)`, `liveIniciar(lesson)`, `liveCerrar(lesson)`, `liveEscena(lesson, escena, visible)`, `liveModo(lesson, modo)` con las rutas de T-1.3.
3. En `live.ts`: `export function abrirStream(lesson: string, on: (evento: string, data: any) => void): () => void` que crea `new EventSource(`/api/v1/live/${encodeURIComponent(lesson)}/stream`)`, registra `addEventListener` para `estado`, `presencia`, `logre`, `mensaje`, `pareja`, `cierre`, y en `onerror` cierra y reabre con espera 1, 2, 4, 8 s (tope 8). Devuelve la función de cierre.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build.types 2>&1 | tail -1` → sin líneas `error`
Hecho significa (sí/no): lint y tipos limpios; `grep -c "liveEstado" src/lib/api.ts` da `1`.
No hagas: usar `fetch` manual fuera de `req`; WebSocket; cambiar firmas existentes de `api`.

### T-1.6 · Ruta /live/[id]/ esqueleto
Depende de: T-1.5  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Crear la página `/live/pa-02/` que carga el estado, abre el stream y elige la vista control o alumno según el rol.
Lee antes (rutas exactas): lms/web/src/routes/lessons/[id]/index.tsx (`onStaticGenerate`, `pathId`, `requireLogin`) · lms/web/src/routes/layout.tsx · lms/api/internal/httpapi/server.go (`shellSections`)
Crea / modifica (rutas exactas, nada más): lms/web/src/routes/live/[id]/index.tsx · lms/web/src/routes/layout.tsx (ocultar `header.top` cuando la ruta empieza por `/live/`) · lms/api/internal/httpapi/server.go (`"live": true` en `shellSections`) · lms/web/src/global.css (clases `.live`, `.live-control`, `.live-alumno`)
Pasos:
1. `onStaticGenerate` devuelve `{ params: [{ id: "_" }] }` igual que lessons.
2. `useVisibleTask$`: `api.me()`, `api.liveEstado(id)`, `abrirStream(id, …)` guardando en un `useStore<LiveState>` con `estado`, `me`, `error`, `conectados`.
3. Si `isStaff(me)` renderiza `<LiveControl>` (T-1.7), si no `<LiveAlumno>` (T-1.8); mientras, componentes `Loading`/`ErrorState` de `ui.tsx`. Hasta que existan, dos `<section>` vacías con `aria-label`.
4. `head`: título `LIVE · <lesson>`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run build 2>&1 | tail -1 && ls dist/live/_/index.html && echo LISTO` → `LISTO`
- `curl -s -o /dev/null -w "%{http_code}\n" localhost:8095/live/pa-02/` (tras copiar `dist` y reiniciar) → `200`
Hecho significa (sí/no): la ruta compila, el servidor la sirve y abre el stream (ver en la pestaña Red del navegador una petición `stream` pendiente).
No hagas: duplicar el `header` del layout; pedir datos en `routeLoader$` (el build es estático); usar WebSocket.

### T-1.7 · Vista control del instructor
Depende de: T-1.6  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Componente `LiveControl` con lista de escenas, anterior/siguiente, cronómetro por escena, mostrar/ocultar, contador de conectados y de «Lo logré» por paso, y atajos de teclado.
Lee antes (rutas exactas): lms/web/src/routes/live/[id]/index.tsx · lms/web/src/components/ui.tsx (`Tabs`, `Bar`, `Chip`) · lms/web/src/components/icon.tsx (nombres `play`, `chevronLeft`, `chevronRight`, `eye`, `users`, `clock`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-control.tsx · lms/web/src/global.css
Pasos:
1. Props: `lesson`, `estado: LiveEstado`, `escenas: Escena[]` (de T-2.2; hasta entonces lista vacía).
2. Columna izquierda: lista `.live-escenas` con botón por escena (`aria-current="true"` en la actual), número, título, fase con `data-ph`, `duracion_min`.
3. Barra inferior `.live-barra`: botones «Anterior», «Siguiente» (llaman `api.liveEscena`), «Mostrar a todos» (conmuta `visible`), «Iniciar LIVE» / «Cerrar LIVE», chip `conectados`, cronómetro `mm:ss` que se reinicia al cambiar de escena y pone clase `.pasado` (color `--warn`) al superar `duracion_min`.
4. Teclado en `document`: `ArrowRight`/`Space` siguiente, `ArrowLeft` anterior, `h` mostrar/ocultar; ignorar cuando el foco está en `input`/`textarea`.
5. Columna central: vista previa de la escena actual en `<iframe class="live-previa" sandbox="allow-scripts" src="/api/v1/live/<lesson>/escenas/<id>/html">` (ruta de T-2.2).
6. Contador «Lo logré» por paso: tabla `.live-logre` con `paso` y `n`, actualizada por el evento `logre`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-1.7-control-1920x1080-dark.png` y `...-light.png` (1920x1080) con el instructor en `/live/pa-02/`
Hecho significa (sí/no): flechas cambian la escena y el `GET /api/v1/live/pa-02` refleja la nueva en menos de 1 s.
No hagas: `window.confirm` para cerrar (usar un botón de confirmación en línea); colores fijos fuera de los tokens; escuchar teclas dentro de inputs.

### T-1.8 · Vista alumno a pantalla completa
Depende de: T-1.6  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Componente `LiveAlumno` con la escena actual en un iframe, Fullscreen API, paneles plegables (terminal, visor, agente, ayuda) y el botón «Lo logré» (lógica en T-6.2).
Lee antes (rutas exactas): lms/web/src/components/live-control.tsx · lms/web/src/routes/studio/index.tsx (patrón `studio-panel__tgl` y `studio-grid`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-alumno.tsx · lms/web/src/global.css
Pasos:
1. Layout `.live-alumno`: arriba `.live-escena` con `<iframe sandbox="allow-scripts allow-same-origin" title="Escena">` que carga `/api/v1/live/<lesson>/escenas/<id>/html?tema=<light|dark>`; se recarga al cambiar `estado.escena`.
2. Si `estado.visible === false`, mostrar `.live-cortina` con el texto «El instructor está preparando la siguiente escena».
3. Si `estado.modo === "libre"`, mostrar aviso «Modo libre: avanza a tu ritmo» y flechas propias que solo cambian el iframe local.
4. Botón «Pantalla completa» → `document.documentElement.requestFullscreen()`; `Escape` sale sin cerrar el stream; `fullscreenchange` actualiza el icono.
5. Fila inferior `.live-paneles` con cuatro botones plegables («Terminal», «Visor», «Agente», «Ayuda») con `aria-expanded`; cada uno renderiza un `<Slot>`/placeholder hasta que sus tickets existan.
6. Botón `.live-logre-btn` «Lo logré» visible solo si la escena tiene `lo_logre: true` (campo de T-2.2).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build 2>&1 | tail -1` → sin `error`
- capturas `docs/capturas-live/T-1.8-alumno-1920x1080-dark.png` y `T-1.8-alumno-1366x768-light.png` con `$ALU`
Hecho significa (sí/no): en dos navegadores, cambiar la escena en control la cambia en alumno en menos de 1 s; `Escape` sale de pantalla completa y el stream sigue abierto.
No hagas: `allow-top-navigation` en el sandbox; recargar la página al cambiar de escena; WebSocket.

### T-1.9 · Presencia por latido
Depende de: T-1.4, T-1.7  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Cada alumno manda `POST /api/v1/live/{lesson}/latido` cada 15 s y el control recibe la lista de presentes con su escena.
Lee antes (rutas exactas): lms/api/internal/httpapi/live_handlers.go · lms/api/internal/httpapi/live_hub.go · lms/web/src/components/live-alumno.tsx
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_presencia.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go · lms/web/src/lib/api.ts (`liveLatido`) · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx
Pasos:
1. `type presente struct { Nombre, Escena string; Visto time.Time; Semaforo string }`; `type presencia struct { mu sync.Mutex; por map[string]map[string]*presente }` (lección → sub) en `Server` (`s.presencia`).
2. `POST /api/v1/live/{lesson}/latido` cuerpo `{"escena":"03-tu-laptop"}` → `{"ok":true}`; actualiza `Visto`.
3. Goroutine por lección arrancada en `iniciar`: cada 5 s borra presentes con `Visto` de hace más de 40 s y publica `presencia` (lista completa al staff con `publishStaff`, `{"conectados":n}` a todos).
4. Front alumno: `setInterval` de 15 s con `api.liveLatido(lesson, escenaActual)`; limpiar en `cleanup`.
5. Front control: lista `.live-presentes` (nombre, escena, hace cuánto) alimentada por el evento `presencia`.
6. Test `TestLivePresencia`: dos alumnos mandan latido; el stream del instructor recibe `presencia` con 2 entradas.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestLivePresencia -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s -X POST localhost:8095/api/v1/live/pa-02/latido -H "Authorization: Bearer $ALU" -H 'Content-Type: application/json' -d '{"escena":"01-bienvenida"}'` → `{"ok":true}`
Hecho significa (sí/no): un alumno que cierra la pestaña desaparece de la lista en menos de 45 s.
No hagas: guardar la presencia en SQLite; mandar la lista con nombres a los alumnos; latidos más frecuentes que 15 s.

### T-1.10 · Modo libre y retomar
Depende de: T-1.7, T-1.8  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Interruptor «Modo libre / Retomar» en control que llama `PUT /modo` y aviso visible en la vista alumno.
Lee antes (rutas exactas): lms/web/src/components/live-control.tsx · lms/web/src/components/live-alumno.tsx · lms/api/internal/httpapi/live_handlers.go (`PUT /modo`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-control.tsx · lms/web/src/components/live-alumno.tsx
Pasos:
1. Control: botón `.live-modo` con `role="switch"` y `aria-checked`; texto «Modo libre» cuando guiado y «Retomar» cuando libre.
2. Alumno: al pasar a `libre`, mostrar flechas locales (T-1.8 paso 3); al volver a `guiado`, forzar el iframe a `estado.escena` y mostrar toast «El instructor retomó el control».
Verifica (comando exacto → salida esperada):
- `curl -s -X PUT localhost:8095/api/v1/live/pa-02/modo -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"modo":"libre"}' | jq -r .modo` → `libre`
- captura `docs/capturas-live/T-1.10-alumno-libre-1366x768-dark.png`
Hecho significa (sí/no): el alumno ve el aviso en menos de 1 s y al retomar vuelve a la escena del instructor.
No hagas: guardar el modo en localStorage; permitir al alumno cambiar el modo.

### T-1.11 · Compuerta de avance (Go)
Depende de: T-1.9, T-2.1, T-6.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `GET /api/v1/live/{lesson}/compuerta` devuelve, para la escena actual, quién cumplió (por «Lo logré» o evidencia), quién falta, el porcentaje y el umbral.
Lee antes (rutas exactas): lms/api/internal/httpapi/live_presencia.go · lms/api/internal/store/store.go (`ProgressByUser`, `Progress`) · lms/api/internal/content/live.go (campo `Umbral`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_compuerta.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/store/store.go (tabla `live_evidencias` y `EvidenciaExiste`) · lms/api/internal/httpapi/server.go
Pasos:
1. Tabla: `CREATE TABLE IF NOT EXISTS live_evidencias (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, escena TEXT NOT NULL, tipo TEXT NOT NULL, detalle TEXT NOT NULL DEFAULT '', t TEXT NOT NULL, PRIMARY KEY (user_id, lesson_id, escena, tipo));` y `func (d *DB) EvidenciaExiste(ctx, userID, lessonID, escena string) (bool, error)`; `func (d *DB) PonerEvidencia(ctx, userID, lessonID, escena, tipo, detalle string) error`.
2. Función pura `calcularCompuerta(presentes []alumno, cumplidos map[string]bool, umbralPct int) compuerta` con `Cumplieron`, `Faltan`, `Pct`, `Pasa bool` (Pct >= umbral; sin presentes, `Pasa=false`).
3. Handler (staff): toma la escena actual, `lo_logre` + `paso` + `umbral_pct` de T-2.1; cumplido = `progress` del paso marcado o `EvidenciaExiste`; `ultimo_evento` y `hace_s` del semáforo (T-1.13; hasta entonces `""` y `0`).
4. Respuesta: `{"escena":"04-skills","umbral_pct":80,"pct":70,"pasa":false,"cumplieron":[{"sub","nombre","motivo":"lo_logre|evidencia"}],"faltan":[{"sub","nombre","ultimo_evento":"terminal","hace_s":40}]}`.
5. `POST /api/v1/live/{lesson}/pasar-igual` (staff, `{"escena":"04-skills"}`) escribe en `settings` la clave `live.pasar_igual.<lesson>.<escena>` con la hora.
6. Test `TestCompuertaUmbral` sobre la función pura: 10 presentes y 7 cumplidos → `pct 70`, `pasa false`; 8 → `pasa true`; 0 presentes → `pasa false`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestCompuerta -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s localhost:8095/api/v1/live/pa-02/compuerta -H "Authorization: Bearer $TOK" | jq -c '{umbral_pct,pasa}'` → `{"umbral_pct":80,"pasa":false}` (sin alumnos)
Hecho significa (sí/no): test verde y la ruta responde con los campos exactos.
No hagas: avanzar la escena desde esta ruta; redondear hacia arriba el porcentaje; contar al instructor como alumno.

### T-1.12 · Compuerta de avance (UI)
Depende de: T-1.11  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): «Siguiente» consulta la compuerta y, si no pasa, muestra la lista de quién falta con tres botones: Esperar, Pasar igual, Mandar ayuda.
Lee antes (rutas exactas): lms/web/src/components/live-control.tsx · lms/web/src/lib/api.ts
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-compuerta.tsx · lms/web/src/components/live-control.tsx · lms/web/src/lib/api.ts (`liveCompuerta`, `livePasarIgual`) · lms/web/src/global.css
Pasos:
1. En «Siguiente»: `const c = await api.liveCompuerta(lesson)`; si `c.pasa` o la escena no tiene compuerta, cambiar; si no, abrir `<LiveCompuerta>`.
2. `LiveCompuerta`: cabecera «7 de 10 cumplieron (70 %, umbral 80 %)», lista `.live-faltan` con nombre, `ultimo_evento`, `hace_s` formateado; botones «Esperar» (cierra), «Pasar igual» (`api.livePasarIgual` y luego `api.liveEscena`), «Mandar ayuda» (abre T-1.14 con el alumno elegido).
3. `role="dialog"`, `aria-modal`, foco inicial en «Esperar», `Escape` = Esperar.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-1.12-compuerta-1920x1080-dark.png` con 3 faltantes simulados (tres alumnos registrados con latido y sin «Lo logré»)
Hecho significa (sí/no): con 10 alumnos y 7 cumplidos, «Siguiente» muestra 3 nombres y no avanza hasta elegir.
No hagas: `window.confirm`; avanzar automáticamente al cerrar el diálogo; ocultar el porcentaje.

### T-1.13 · Eventos de actividad y semáforo
Depende de: T-1.9  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): El panel del alumno reporta eventos (terminal, agente, visor, error) y el control pinta un semáforo verde, ámbar, rojo o gris por alumno.
Lee antes (rutas exactas): lms/api/internal/httpapi/live_presencia.go · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_presencia.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go · lms/web/src/lib/api.ts (`liveEvento`) · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx · lms/web/src/global.css
Pasos:
1. `POST /api/v1/live/{lesson}/evento` cuerpo `{"tipo":"terminal|agente|visor|error","detalle":"ls"}` → `{"ok":true}`; guarda en `presente` los campos `UltimoEvento`, `UltimoT`, `Errores` (se incrementa con `error`, se pone a 0 con cualquier otro).
2. Función pura `semaforo(p *presente, cumplio bool, ahora time.Time) string`: `verde` si cumplió; `gris` si `Visto` hace más de 40 s; `rojo` si `Errores >= 3` o sin evento en 2 min; `ambar` en otro caso. Se incluye en el evento `presencia` al staff.
3. Front alumno: llamar `api.liveEvento` con debounce de 10 s por tipo cuando se escribe en la terminal, se envía un turno al agente o se recarga el visor; `error` cuando la terminal recibe una línea que empieza por `sh:`, `Error`, `Traceback`, `command not found`.
4. Front control: punto `.semaforo.<color>` junto a cada presente, con `title` del estado y `aria-label`.
5. Test `TestSemaforo` sobre la función pura con los cuatro casos.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestSemaforo -v 2>&1 | tail -2` → `--- PASS` y `ok`
- captura `docs/capturas-live/T-1.13-semaforo-1920x1080-dark.png` con los cuatro colores (simulados con `curl` desde 4 alumnos)
Hecho significa (sí/no): cada estado se ve con el color correcto en menos de 10 s.
No hagas: mandar el contenido tecleado en la terminal (solo el tipo y un detalle de hasta 80 caracteres); colores fijos fuera de `--ok --warn --bad --muted`.

### T-1.14 · Mandar ayuda y mensaje a todos
Depende de: T-1.12, T-1.13  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): El instructor envía una línea a un alumno o a todos y aparece en su panel en menos de 2 s; «ver» abre su visor en solo lectura si lo permitió.
Lee antes (rutas exactas): lms/api/internal/httpapi/live_handlers.go · lms/api/internal/httpapi/live_hub.go · lms/web/src/components/live-compuerta.tsx
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_handlers.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go · lms/web/src/lib/api.ts (`liveMensaje`) · lms/web/src/components/live-control.tsx · lms/web/src/components/live-alumno.tsx
Pasos:
1. `POST /api/v1/live/{lesson}/mensaje` (staff) cuerpo `{"texto":"cambien a modelo remoto","para":"todos"}` o `"para":"<sub>"`; máximo 200 caracteres; publica `mensaje` (a todos o solo al `sub` con un `publishUser` nuevo en el hub); si `para` es `todos` guarda el texto en `live_sessions.mensaje`.
2. Control: campo «Mensaje a todos» con botón enviar; en la fila de cada alumno, botón «Mandar ayuda» que abre un cuadro con el texto y el botón «Ver visor» (enlace a `/vista/<sub>/`, deshabilitado si `permisos.visor` es falso; permisos en T-3.6).
3. Alumno: `.live-aviso` fija arriba con el texto y botón cerrar; desaparece sola a los 30 s.
4. Test `TestLiveMensajeDirigido`: el mensaje para `sub A` llega al stream de A y no al de B.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestLiveMensajeDirigido -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s -X POST localhost:8095/api/v1/live/pa-02/mensaje -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"texto":"hola a todos","para":"todos"}'` → `{"ok":true}`
Hecho significa (sí/no): el alumno ve el aviso en menos de 2 s; sin permiso, «Ver visor» sale deshabilitado.
No hagas: mensajes sin límite; permitir a alumnos enviar; guardar historial de mensajes.

### T-1.15 · Emparejar al azar
Depende de: T-1.9  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): `POST /api/v1/live/{lesson}/emparejar` forma pares (y un trío si hay impar) con los presentes y avisa a cada uno con quién le toca y la URL del visor del compañero.
Lee antes (rutas exactas): lms/api/internal/httpapi/live_presencia.go · lms/api/internal/httpapi/live_hub.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_parejas.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go · lms/web/src/lib/api.ts (`liveEmparejar`) · lms/web/src/components/live-control.tsx · lms/web/src/components/live-alumno.tsx
Pasos:
1. Función pura `emparejar(subs []string, semilla int64) [][]string`: baraja con `rand.New(rand.NewSource(semilla))`, agrupa de 2; si sobra uno, se une al último grupo.
2. Handler (staff): toma presentes con `Visto` reciente, guarda el resultado en memoria (`s.parejas[lesson]`), publica a cada `sub` el evento `pareja` con `{"con":[{"sub","nombre"}],"vista":"/vista/<sub-del-compañero>/"}` y devuelve la lista completa.
3. Control: botón «Emparejar» en E11 y tabla de pares; alumno: tarjeta «Te toca con Ana» con enlace al visor.
4. Test `TestEmparejar`: 10 → 5 pares de 2; 9 → 3 pares y un trío; 1 → un grupo de 1.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestEmparejar -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): test verde y cada alumno ve su pareja en menos de 2 s.
No hagas: emparejar desconectados; guardar en SQLite; dejar que un alumno quede solo si hay 3 o más presentes.

### Fase 2 · Escenas HTML vivas (el guion manda)

### T-2.1 · Esquema escena.yaml y cargador
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Definir el formato de carpeta y `escena.yaml` de las escenas y cargarlas en el catálogo de contenido con recarga en caliente.
Lee antes (rutas exactas): lms/api/internal/content/types.go · lms/api/internal/content/load.go (`loadCourse`, `Fingerprint`, `Catalog`) · lms/api/internal/content/load_test.go · lms/content/README.md
Crea / modifica (rutas exactas, nada más): lms/api/internal/content/live.go · lms/api/internal/content/live_test.go · lms/api/internal/content/load.go (llamada a `loadEscenas` dentro de `loadCourse` y campo `escenas map[string][]*Escena` en `Catalog`) · lms/content/README.md (sección «Escenas del modo LIVE») · lms/content/courses/programacion-agentica/live/pa-02/01-bienvenida/escena.yaml (ejemplo)
Pasos:
1. Carpeta por escena: `lms/content/courses/<curso>/live/<lesson>/<NN-nombre>/escena.yaml` y `escena.html` en la misma carpeta.
2. Esquema completo de `escena.yaml` (todos los campos, con el ejemplo que se escribe en el README):
```yaml
id: 01-bienvenida            # igual que la carpeta; único dentro de la lección
titulo: Bienvenida
fase: experiencia            # experiencia | reflexion | conceptualizacion | experimentacion
paso: ""                     # id de cycle[] de la lección; vacío = sin «Lo logré»
duracion_min: 5
lo_logre: true               # muestra el botón; con paso vacío registra solo evidencia
evidencia: ninguna           # ninguna | captura | comando | turno | automatica
umbral_pct: 100              # compuerta; por defecto 80
compuerta: presentes         # ninguna | lo_logre | evidencia | presentes
comandos:                    # panel de ayuda de la terminal
  - {titulo: Diagnóstico, cmd: "python3 /trabajo/osito/backend/diagnostico.py"}
tareas:                      # plan de trabajo del alumno (fase 6), opcional
  - {id: t1, titulo: "Crear PLAN_TRABAJO.md con 6 tareas"}
respaldo: captura.png        # imagen estática si el HTML no carga (fase 2.17)
```
3. `type Escena struct` con esos campos (`yaml` y `json` en snake_case) más `LessonID`, `HTMLPath` (`yaml:"-"`); `loadEscenas(dir, lessonID string) ([]*Escena, error)` recorre `live/<lesson>/*/escena.yaml` ordenado por nombre de carpeta; error si `id` no coincide con la carpeta, si falta `escena.html`, si `fase` no es una de las cuatro o si `paso` no existe en `lesson.Cycle`.
4. Defaults: `umbral_pct` 80; `compuerta` = `lo_logre` si `lo_logre` es true, si no `ninguna`; `evidencia` `ninguna`.
5. `func (c *Catalog) Escenas(lessonID string) []*Escena` y `func (c *Catalog) Escena(lessonID, id string) *Escena`.
6. Test `TestEscenasCargan` con un fixture de dos escenas (una con `paso` inexistente → error con el nombre de la carpeta).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/content -run TestEscenas -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `cd $R/lms/api && go test ./internal/content -run TestRealContent 2>&1 | tail -1` → `ok`
Hecho significa (sí/no): el ejemplo `01-bienvenida` carga sin error y el test del fixture pasa.
No hagas: leer las escenas desde SQLite; aceptar `id` distinto del nombre de la carpeta; romper `TestRealContent`.

### T-2.2 · Rutas de escenas y HTML
Depende de: T-2.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Listar las escenas de una lección y servir el HTML de cada una para el iframe, con la primera escena como valor inicial de `iniciar`.
Lee antes (rutas exactas): lms/api/internal/httpapi/live_handlers.go · lms/api/internal/content/live.go · lms/api/internal/httpapi/course_handlers.go (`courseFile`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_escenas.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/live_handlers.go · lms/api/internal/httpapi/server.go · lms/web/src/lib/api.ts (`interface Escena`, `liveEscenas`)
Pasos:
1. `GET /api/v1/live/{lesson}/escenas` (autenticado) → lista `[{id,titulo,fase,paso,duracion_min,lo_logre,evidencia,umbral_pct,compuerta,comandos,tareas,orden}]` con `orden` 1..n.
2. `GET /api/v1/live/{lesson}/escenas/{id}/html` (autenticado): lee `escena.html`, `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-cache`, `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: 'self'; font-src data:; connect-src 'self'; frame-src 'self'`; quita `X-Frame-Options` para esta ruta (poner `X-Frame-Options: SAMEORIGIN`).
3. En `iniciar`, si `escena` está vacía, poner la primera de `Escenas(lesson)`; en `PUT /escena` validar que el id existe.
4. Test `TestLiveEscenasLista`: fixture con 2 escenas → 2 elementos ordenados; `html` de una devuelve `text/html` y empieza por `<!doctype html>`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestLiveEscenas -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s localhost:8095/api/v1/live/pa-02/escenas -H "Authorization: Bearer $TOK" | jq 'length'` → `1` (solo el ejemplo, hasta T-2.5)
Hecho significa (sí/no): la lista responde y el HTML abre en el iframe de T-1.7 sin error de CSP en consola.
No hagas: servir las escenas desde `/files/`; permitir `script-src` externo; CDN.

### T-2.3 · Plantilla base y escena de prueba
Depende de: T-2.2, T-0.6  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Crear la plantilla HTML autocontenida de escena (cielo con constelaciones, cabecera con fase y número, cuerpo, pie) que respeta tema y `prefers-reduced-motion`, y la escena de prueba `00-prueba`.
Lee antes (rutas exactas): lms/web/src/global.css (líneas 10-105, tokens) · lms/web/src/lib/constelacion.ts (función `cielo`) · lms/web/src/routes/layout.tsx (constante `CIELO`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/_plantilla/escena.html · lms/content/courses/programacion-agentica/live/pa-02/00-prueba/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/00-prueba/escena.html
Pasos:
1. Un solo archivo HTML, sin `<link>` ni `<script src>` externos; `<style>` con los mismos valores de tokens que `global.css` (claro y oscuro con `@media (prefers-color-scheme: dark)` y `html[data-tema="dark"]`); un `<script>` inline de 10 líneas que lee `?tema=` de `location.search` y pone `data-tema`.
2. Estructura: `<header class="esc-cab">` con `<span class="esc-fase" data-ph="ec">Experiencia</span>` y `<span class="esc-num">E01</span>`; `<main class="esc-cuerpo">`; `<footer class="esc-pie">` con el texto «Pulsa “Lo logré” en el panel cuando termines» (el botón real vive en el panel, no en el iframe).
3. Fondo: SVG inline de constelaciones generado una vez con `cielo()` (copiar el resultado como texto; menos de 300 nodos); animación `stroke-dashoffset` de 4 s; `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }`.
4. `00-prueba`: `fase: experiencia`, `lo_logre: false`, cuerpo con un título, un párrafo y un bloque `<pre>`; `escena.yaml` sin `paso`.
Verifica (comando exacto → salida esperada):
- `grep -c -E 'https?://' $R/lms/content/courses/programacion-agentica/live/_plantilla/escena.html` → `0`
- `grep -o '<[a-zA-Z]' $R/lms/content/courses/programacion-agentica/live/_plantilla/escena.html | wc -l | awk '{print ($1<300)?"ok":"demasiados"}'` → `ok`
- capturas `docs/capturas-live/T-2.3-prueba-1920x1080-light.png`, `...-1920x1080-dark.png`, `...-1366x768-light.png`, `...-1366x768-dark.png` de `http://localhost:8095/api/v1/live/pa-02/escenas/00-prueba/html?tema=…`
Hecho significa (sí/no): cuatro capturas legibles sin desbordes; la animación se detiene con reduced-motion.
No hagas: librerías por CDN; vídeo; canvas con `requestAnimationFrame`; más de 1 MB.

### T-2.4 · Motor de evidencias automáticas
Depende de: T-1.11, T-3.4  ·  Turnos: 2  ·  Riesgo: alto
Objetivo (una frase): Un sondeo cada 10 s por alumno conectado que detecta las señales del guion y escribe `live_evidencias`, para que la compuerta cuente sin «Lo logré».
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (tabla «Evidencias automáticas por escena») · lms/api/internal/httpapi/live_compuerta.go · lms/api/internal/aula/aula.go (`Exec`, `Nombre`) · lms/api/internal/httpapi/live_presencia.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_evidencias.go · lms/api/internal/httpapi/live_evidencias_test.go · lms/api/internal/httpapi/live_handlers.go (arrancar/detener el sondeo en `iniciar`/`cerrar`)
Pasos:
1. `type detector func(ctx context.Context, s *Server, userID, lessonID string) (ok bool, detalle string, err error)` y `var detectores = map[string]detector{ "03-tu-laptop": detectarE03, "04-skills": detectarE04, "06-plan": detectarE06, "07-chat": detectarE07, "09-voz": detectarE09, "10-imagen": detectarE10, "11-probar": detectarE11 }`.
2. E03: terminal abierta (`s.termSlots` tiene al usuario o hubo evento `terminal` en 10 min) y `ia_alumno.modelo != ""` (T-5.4). E04: `SELECT COUNT(*) FROM skills WHERE user_id = ? AND origen = 'propia'` > 0 (T-5b.1). E06: `aula.Exec(nombre, "test -f /trabajo/PLAN_TRABAJO.md && echo si")` devuelve `si`. E07: `aula.Exec(nombre, "grep -c 'POST /api/chat.* 200' /trabajo/osito.log")` > 0. E09: lo mismo con `/api/stt` o evidencia `microfono` enviada por el visor (T-2.13). E10: existe fila `progress` con evidencia `captura` del paso `voz-imagen` o `ls /trabajo/osito/imagenes/*.png | wc -l` > 0. E11: existe hallazgo del alumno (T-2.15).
3. Goroutine por lección (`ticker` 10 s): para cada presente, correr el detector de la escena actual; si `ok` y no existía, `PonerEvidencia(..., "automatica", detalle)` y `publishStaff("logre", {...})`.
4. Tests con detectores falsos inyectados (`detectoresDe func() map...`): `TestEvidenciaSeEscribeUnaVez` (dos pasadas → una fila) y `TestEvidenciaErrorNoRompe` (detector con error → sin fila, sin pánico).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestEvidencia -race -v 2>&1 | grep -c '^--- PASS'` → `2`
Hecho significa (sí/no): tests verdes; con un alumno real, `PLAN_TRABAJO.md` en `/trabajo` enciende la compuerta de E06 en menos de 15 s.
No hagas: ejecutar comandos con texto del alumno interpolado (los comandos son constantes); sondear más de una vez cada 10 s; bloquear el handler HTTP con los detectores.

### T-2.5 · E01 Bienvenida
Depende de: T-2.3, T-1.8  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Escena `01-bienvenida` con las constelaciones y las letras JMD encendiéndose, el osito 3D de Three.js incrustado y el primer «Lo logré» («Estoy aquí»).
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E01) · lms/content/courses/programacion-agentica/live/_plantilla/escena.html · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/frontend/osito.js (y `index.html`, cómo carga Three.js)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/01-bienvenida/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/01-bienvenida/escena.html · lms/content/courses/programacion-agentica/live/pa-02/01-bienvenida/three.min.js (copia local, sin CDN) · lms/content/courses/programacion-agentica/live/pa-02/01-bienvenida/osito.js
Pasos:
1. `escena.yaml`: `id: 01-bienvenida`, `titulo: Bienvenida`, `fase: experiencia`, `paso: ""`, `duracion_min: 5`, `lo_logre: true`, `evidencia: ninguna`, `umbral_pct: 100`, `compuerta: presentes`, `respaldo: captura.png`.
2. Constelaciones: trazo punto a punto en 4 s (`stroke-dasharray`/`stroke-dashoffset`), luego las letras JMD con `opacity` 0→1 escalonadas 300 ms, ease-out.
3. Osito 3D: `<script src="three.min.js">` y `<script src="osito.js">` relativos (T-2.2 debe servir también archivos hermanos: añadir `GET /api/v1/live/{lesson}/escenas/{id}/{archivo}` que sirve solo `.js`, `.png`, `.svg`, `.woff2` de esa carpeta); si `WebGL` no está, mostrar `captura.png`.
4. Texto final «Hoy construyes tu asistente» a los 5 s; con reduced-motion todo aparece de golpe.
Verifica (comando exacto → salida esperada):
- `curl -s -o /dev/null -w "%{http_code}\n" localhost:8095/api/v1/live/pa-02/escenas/01-bienvenida/three.min.js -H "Authorization: Bearer $TOK"` → `200`
- `du -sk $R/lms/content/courses/programacion-agentica/live/pa-02/01-bienvenida | awk '{print ($1<1024)?"ok":"pesa"}'` → `ok`
- captura `docs/capturas-live/T-2.5-E01-1920x1080-dark.png` a los 6 s de carga
Hecho significa (sí/no): la escena renderiza con el osito saludando y, con WebGL desactivado, muestra la captura estática.
No hagas: cargar Three.js desde CDN; superar 1 MB en la carpeta; meter el botón «Lo logré» dentro del iframe.

### T-2.6 · E02 Edge AI en una frase
Depende de: T-2.3, T-0.5  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Escena `02-edge-ai` con los dos caminos animados (nube lenta con contador de dinero, laptop rápida con contador en 0) y la frase del guion.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E02) · lms/content/courses/programacion-agentica/live/_plantilla/escena.html
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/02-edge-ai/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/02-edge-ai/escena.html
Pasos:
1. `escena.yaml`: `fase: conceptualizacion`, `paso: ""`, `duracion_min: 5`, `lo_logre: false`, `compuerta: ninguna`.
2. Wireframe de dos columnas con `wireframe-skill`, ilustrado con PinePaper en modo código → SVG inline; el paquete viaja por `<animateMotion>` 6 s en la nube y 1,5 s en la laptop; contador `$0,00 → $0,12` con `<animate>` de texto en pasos; el de la laptop fijo en `$0,00`.
3. Texto: «Edge AI: el modelo corre en tu máquina. Sin nube, sin costo por consulta, tus datos no salen».
Verifica (comando exacto → salida esperada):
- `grep -c '<animateMotion' $R/lms/content/courses/programacion-agentica/live/pa-02/02-edge-ai/escena.html` → `2`
- captura `docs/capturas-live/T-2.6-E02-1920x1080-light.png`
Hecho significa (sí/no): los dos caminos se animan y nada se mueve después de 8 s.
No hagas: párrafos de más de 3 líneas; JavaScript para animar (solo SVG y CSS); CDN.

### T-2.7 · E03 Tu laptop decide
Depende de: T-2.3, T-2.4, T-3.6, T-5.5  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Escena `03-tu-laptop` con la tabla animada de niveles de imagen, el comando del diagnóstico en grande y la compuerta automática «terminal abierta y modelo elegido».
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E03) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/backend/diagnostico.py · lms/api/internal/httpapi/live_evidencias.go (`detectarE03`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/03-tu-laptop/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/03-tu-laptop/escena.html
Pasos:
1. `escena.yaml`: `fase: experiencia`, `paso: relevar`, `duracion_min: 8`, `lo_logre: false`, `evidencia: automatica`, `umbral_pct: 80`, `compuerta: evidencia`, `comandos: [{titulo: Diagnóstico de tu máquina, cmd: "python3 /trabajo/osito/backend/diagnostico.py"}, {titulo: Abrir Mi IA, cmd: ""}]`.
2. Tabla SVG de tres niveles (rápida, buena, máxima) con tres máquinas que se iluminan en secuencia (0,4 s cada una, ease-out); el comando en `<pre class="esc-cmd">`.
3. Texto bajo la tabla: «En clase todo es remoto; tu nivel local es el dato para la tarea 2».
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/live/pa-02/escenas -H "Authorization: Bearer $TOK" | jq -r '.[] | select(.id=="03-tu-laptop") | .compuerta'` → `evidencia`
- captura `docs/capturas-live/T-2.7-E03-1920x1080-dark.png`
Hecho significa (sí/no): con un alumno con terminal abierta y modelo elegido en «Mi IA», la compuerta lo cuenta como cumplido en menos de 15 s.
No hagas: pedir instalar nada en la laptop; mostrar `jmd live` (retirado); poner el botón «Lo logré».

### T-2.8 · E04 Skills y modo piedra
Depende de: T-2.3, T-2.4, T-5b.2  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Escena `04-skills` con los 14 skills como constelación interactiva y el antes/después de `piedra`; evidencia automática: existe una skill propia.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E04) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/*/SKILL.md (línea `description` de cada uno) · lms/api/internal/httpapi/live_evidencias.go (`detectarE04`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/04-skills/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/04-skills/escena.html
Pasos:
1. `escena.yaml`: `fase: experiencia`, `paso: skills`, `duracion_min: 10`, `lo_logre: true`, `evidencia: automatica`, `umbral_pct: 80`, `compuerta: evidencia`, `comandos: [{titulo: Ver mis skills, cmd: "jmd skills"}, {titulo: Probar piedra, cmd: "jmd chat \"/skill piedra explica qué es un skill\""}]`.
2. 14 estrellas `<g class="skill" tabindex="0">` con `<title>` y descripción de una línea visible al `:hover`/`:focus`; al centro, bloque «antes» (8 líneas) que colapsa a 3 con `transform: scaleY` 400 ms («squash»).
3. Texto: «Un skill son instrucciones que el agente carga cuando la tarea las necesita».
Verifica (comando exacto → salida esperada):
- `grep -c 'class="skill"' $R/lms/content/courses/programacion-agentica/live/pa-02/04-skills/escena.html` → `14`
- captura `docs/capturas-live/T-2.8-E04-1920x1080-dark.png`
Hecho significa (sí/no): las 14 estrellas tienen descripción accesible por teclado; crear una skill en «Mis skills» enciende la compuerta.
No hagas: copiar los SKILL.md completos dentro de la escena; CDN; perder las descripciones con reduced-motion.

### T-2.9 · E05 Mide tu consumo
Depende de: T-2.3, T-5.7  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Escena `05-consumo` que lee `GET /api/v1/mi-uso` cada 10 s y dibuja la línea de tokens de los últimos 10 minutos con las marcas «piedra» y «RTK», más el total de la clase para el instructor.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E05) · lms/api/internal/httpapi/mi_uso.go (JSON de T-5.7) · lms/content/courses/programacion-agentica/live/_plantilla/escena.html
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/05-consumo/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/05-consumo/escena.html
Pasos:
1. `escena.yaml`: `fase: reflexion`, `paso: ""`, `duracion_min: 5`, `lo_logre: false`, `compuerta: ninguna`.
2. `<script>` inline: `fetch("/api/v1/mi-uso", {credentials:"same-origin"})` cada 10 s (la CSP de T-2.2 permite `connect-src 'self'`); dibuja un `<polyline>` con los últimos 10 puntos de `serie` (entrada+salida) y una línea vertical por cada `marcas[]` con etiqueta «piedra» o «RTK»; cifras grandes: tokens de hoy y `cuota.pct`.
3. Si la petición falla, mostrar «Sin datos todavía» sin romper la escena.
Verifica (comando exacto → salida esperada):
- `grep -c '/api/v1/mi-uso' $R/lms/content/courses/programacion-agentica/live/pa-02/05-consumo/escena.html` → `1`
- captura `docs/capturas-live/T-2.9-E05-1920x1080-dark.png` tras dos turnos de chat y una marca piedra
Hecho significa (sí/no): el gráfico cambia a los 10 s de activar piedra y la marca aparece.
No hagas: librerías de gráficos; WebSocket; más de una petición cada 10 s.

### T-2.10 · E06 Plan con criterios
Depende de: T-2.3, T-2.4  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Escena `06-plan` con la tarea vaga que se parte en seis tarjetas con criterio sí/no y la evidencia automática `PLAN_TRABAJO.md` en `/trabajo`.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E06) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/plan-de-trabajo/SKILL.md (sección «Versión corta») · lms/api/internal/httpapi/live_evidencias.go (`detectarE06`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/06-plan/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/06-plan/escena.html
Pasos:
1. `escena.yaml`: `fase: conceptualizacion`, `paso: plan`, `duracion_min: 7`, `lo_logre: true`, `evidencia: automatica`, `umbral_pct: 80`, `compuerta: evidencia`, `comandos: [{titulo: Pedir el plan al agente, cmd: "jmd chat \"/skill plan-de-trabajo escribe PLAN_TRABAJO.md con seis tareas para construir mi asistente\""}, {titulo: Ver la obra, cmd: "python3 /trabajo/obra/obra.py estado"}]`, `tareas:` las seis del día (ids `t1..t6`: chat, corpus, avatar, voz, imagen, prueba con un compañero).
2. Tarjeta grande «haz el asistente» que se divide en 6 (PinePaper, 600 ms) y cada criterio se enciende en verde en secuencia; regla en grande «ninguna tarea sin forma de probarla».
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/live/pa-02/escenas -H "Authorization: Bearer $TOK" | jq '.[] | select(.id=="06-plan") | .tareas | length'` → `6`
- captura `docs/capturas-live/T-2.10-E06-1920x1080-light.png`
Hecho significa (sí/no): crear `/trabajo/PLAN_TRABAJO.md` desde la terminal del LIVE enciende la compuerta en menos de 15 s.
No hagas: inventar tareas distintas de las seis del guion; CDN.

### T-2.11 · E07 Construir 1: el chat
Depende de: T-2.3, T-2.4, T-4.2, T-5.12  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Escena `07-chat` con el diagrama navegador → backend → gateway, los comandos exactos del contenedor y la evidencia `POST /api/chat 200` en el log.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E07) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/arrancar.sh · lms/api/internal/httpapi/live_evidencias.go (`detectarE07`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/07-chat/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/07-chat/escena.html
Pasos:
1. `escena.yaml`: `fase: experiencia`, `paso: construir`, `duracion_min: 15`, `lo_logre: true`, `evidencia: automatica`, `umbral_pct: 80`, `compuerta: evidencia`, `comandos: [{titulo: Arrancar el asistente, cmd: "cd /trabajo/osito && OSITO_PERFIL=nube OSITO_PUERTO=8766 bash arrancar.sh --sin-recarga >> /trabajo/osito.log 2>&1 &"}, {titulo: Ver el log, cmd: "tail -n 20 /trabajo/osito.log"}, {titulo: Abrir el visor, cmd: ""}]`.
2. Tres cajas con la petición viajando (1,2 s) y el osito pasando a «hablando» con subtítulo; debajo el comando y «Abre el visor: tu asistente está en /vista/tú/».
3. Texto de respaldo: «Si el gateway no responde, el asistente contesta con tu faq.json: la lección del “no estoy seguro”».
Verifica (comando exacto → salida esperada):
- `grep -c 'OSITO_PERFIL=nube' $R/lms/content/courses/programacion-agentica/live/pa-02/07-chat/escena.yaml` → `1`
- captura `docs/capturas-live/T-2.11-E07-1920x1080-dark.png`
Hecho significa (sí/no): un alumno arranca el asistente en su contenedor, pregunta desde el visor y la compuerta lo cuenta en menos de 15 s.
No hagas: mencionar Ollama en la laptop como paso de clase; puertos distintos de 8766.

### T-2.12 · E08 Construir 2: el avatar 3D
Depende de: T-2.3, T-4.2  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Escena `08-avatar` con osito y robot lado a lado cambiando de ánimo, botones de ánimo del instructor replicados a todos, texto «Todo esto corre en tu navegador».
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E08) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/frontend/osito.js y robot.js (nombres de ánimos) · lms/api/internal/httpapi/live_handlers.go (`PUT /escena`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/08-avatar/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/08-avatar/escena.html (+ copias locales de `three.min.js`, `osito.js`, `robot.js` en la carpeta) · lms/api/internal/httpapi/live_handlers.go (campo opcional `"parametro"` en `PUT /escena`, guardado en memoria y publicado en `estado`)
Pasos:
1. `escena.yaml`: `fase: experiencia`, `paso: construir`, `duracion_min: 10`, `lo_logre: true`, `evidencia: captura`, `umbral_pct: 70`, `compuerta: lo_logre`, `comandos: [{titulo: Cambiar el nombre y el LED, cmd: "jmd chat \"/skill diseno-visual cambia el color del LED del osito a verde y el saludo a Hola, soy Tecnosito\""}]`.
2. La escena lee `parametro` (`feliz|pensando|sorprendido`) del `estado` por `postMessage` desde el panel alumno (T-1.8 reenvía cada `estado` al iframe con `iframe.contentWindow.postMessage({tipo:"estado", estado}, "*")`) y cambia el ánimo de los dos avatares.
3. Control: tres botones de ánimo que llaman `api.liveEscena(lesson, "08-avatar", true, {parametro: "feliz"})`.
Verifica (comando exacto → salida esperada):
- `curl -s -X PUT localhost:8095/api/v1/live/pa-02/escena -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"escena":"08-avatar","visible":true,"parametro":"feliz"}' | jq -r .parametro` → `feliz`
- captura `docs/capturas-live/T-2.12-E08-1920x1080-dark.png`
Hecho significa (sí/no): pulsar «pensando» en control cambia los dos avatares en todas las pantallas en menos de 1 s.
No hagas: `postMessage` con origen `*` para datos sensibles (solo el ánimo); CDN.

### T-2.13 · E09 Construir 3: la voz
Depende de: T-2.3, T-2.4, T-5.12  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Escena `09-voz` con la onda que entra al micrófono y sale como texto editable, principio UX en grande, y la evidencia «mensaje enviado por micrófono» o `POST /api/stt 200`.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E09) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/frontend/app.js (líneas 510-600, micrófono y `SpeechRecognition`) · lms/api/internal/httpapi/live_evidencias.go (`detectarE09`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/09-voz/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/09-voz/escena.html · lms/api/internal/httpapi/live_evidencias.go (`POST /api/v1/live/{lesson}/evidencia` cuerpo `{"escena":"09-voz","tipo":"microfono","detalle":"mensaje enviado"}` que llama `PonerEvidencia` para el propio alumno)
Pasos:
1. `escena.yaml`: `fase: experiencia`, `paso: voz-imagen`, `duracion_min: 10`, `lo_logre: true`, `evidencia: automatica`, `umbral_pct: 80`, `compuerta: evidencia`.
2. Onda SVG que entra, bloque «reconocimiento de voz: en clase el del navegador, en casa whisper en tu laptop», letras que aparecen; texto «muestra lo que escuchó antes de actuar».
3. El visor (T-4.4) manda la evidencia `microfono` cuando el frontend del osito envía un mensaje dictado (el frontend emite `postMessage({tipo:"evidencia", tipo_evidencia:"microfono"})` al padre, cambio en T-5.12).
Verifica (comando exacto → salida esperada):
- `curl -s -X POST localhost:8095/api/v1/live/pa-02/evidencia -H "Authorization: Bearer $ALU" -H 'Content-Type: application/json' -d '{"escena":"09-voz","tipo":"microfono","detalle":"prueba"}'` → `{"ok":true}`
- captura `docs/capturas-live/T-2.13-E09-1920x1080-light.png`
Hecho significa (sí/no): dictar y enviar desde el visor enciende la compuerta; el texto reconocido se puede corregir antes de enviar.
No hagas: mandar audio al servidor por defecto; instalar whisper en ningún lado; aceptar `tipo` fuera de `microfono|flyer|hallazgo`.

### T-2.14 · E10 Construir 4: imagen y flyer
Depende de: T-2.3, T-4.5, T-5.12  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Escena `10-imagen` con las tres piezas que encajan (LLM extrae, difusión pinta, código escribe), el bloque de datos editable y la evidencia «imagen en el visor».
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E10) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/backend/flyer.py (`extraer_datos`, `componer`) · lms/api/internal/httpapi/live_evidencias.go (`detectarE10`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/10-imagen/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/10-imagen/escena.html
Pasos:
1. `escena.yaml`: `fase: experiencia`, `paso: voz-imagen`, `duracion_min: 15`, `lo_logre: true`, `evidencia: captura`, `umbral_pct: 80`, `compuerta: evidencia`, `comandos: [{titulo: Pedir un flyer, cmd: ""}, {titulo: Ver las imágenes generadas, cmd: "ls -la /trabajo/osito/imagenes | tail -n 5"}]`.
2. Tres piezas de rompecabezas con `transform` 500 ms ease-out que encajan y revelan un flyer de ejemplo (SVG); debajo «Datos del flyer» con tres campos (fecha, hora, precio) solo ilustrativos.
3. Texto: «El modelo de difusión no escribe: el código pone el texto».
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/live/pa-02/escenas -H "Authorization: Bearer $TOK" | jq -r '.[] | select(.id=="10-imagen") | .evidencia'` → `captura`
- captura `docs/capturas-live/T-2.14-E10-1920x1080-dark.png`
Hecho significa (sí/no): generar un flyer desde el visor (proveedor remoto o demo Pillow) y «Lo logré» guarda la captura como evidencia.
No hagas: mencionar niveles locales como paso de clase (son para la tarea); CDN.

### T-2.15 · E11 Probar y medir
Depende de: T-2.3, T-1.15  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Escena `11-probar` con el guion de tres pruebas, la tabla de tiempos reales de la clase y el formulario de hallazgo con severidad.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E11) · lms/api/internal/httpapi/live_parejas.go · lms/api/internal/httpapi/live_evidencias.go
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/11-probar/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/11-probar/escena.html · lms/api/internal/httpapi/live_hallazgos.go (`POST /api/v1/live/{lesson}/hallazgo` cuerpo `{"texto":"…","severidad":1..4,"sobre":"<sub del compañero>"}` → fila en `live_evidencias` tipo `hallazgo`; `GET /api/v1/live/{lesson}/tiempos` staff → `[{sub,nombre,chat_ms,stt_ms,imagen_ms}]` leído de `/trabajo/osito.log` de cada contenedor) · lms/api/internal/httpapi/server.go · lms/web/src/components/live-alumno.tsx (formulario `.live-hallazgo`)
Pasos:
1. `escena.yaml`: `fase: reflexion`, `paso: preguntar`, `duracion_min: 10`, `lo_logre: false`, `evidencia: automatica`, `umbral_pct: 80`, `compuerta: evidencia`.
2. Guion de tres pruebas en tarjetas; tabla `.esc-tiempos` que la escena rellena con `fetch("/api/v1/live/pa-02/tiempos")` cada 10 s (solo responde al staff; el alumno ve la tabla vacía con «la llena el instructor»).
3. Formulario en el panel del alumno: texto (hasta 300), severidad 1 a 4 con descripción, botón «Registrar hallazgo».
Verifica (comando exacto → salida esperada):
- `curl -s -X POST localhost:8095/api/v1/live/pa-02/hallazgo -H "Authorization: Bearer $ALU" -H 'Content-Type: application/json' -d '{"texto":"no entendió la fecha","severidad":2,"sobre":""}'` → `{"ok":true}`
- captura `docs/capturas-live/T-2.15-E11-1920x1080-light.png`
Hecho significa (sí/no): registrar un hallazgo enciende la compuerta; el instructor ve la tabla de tiempos.
No hagas: severidades fuera de 1..4; exponer `/tiempos` a alumnos.

### T-2.16 · E12 Tu insignia
Depende de: T-2.3, T-6.5  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Escena `12-insignia` con la insignia 02 apagada que se enciende al cumplir 6 de 9 pasos, las estrellas convergiendo y el plan de seis tareas con estados.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (E12) · lms/api/internal/httpapi/insignia_png.go (forma del hexágono) · lms/api/internal/httpapi/course_handlers.go (`progress`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/12-insignia/escena.yaml · lms/content/courses/programacion-agentica/live/pa-02/12-insignia/escena.html
Pasos:
1. `escena.yaml`: `fase: experimentacion`, `paso: ver`, `duracion_min: 5`, `lo_logre: true`, `evidencia: ninguna`, `compuerta: ninguna`.
2. `fetch("/api/v1/lessons/pa-02/progress")` al cargar: si `done >= 6`, clase `.encendida` (partículas convergen 2 s y quedan quietas); si no, texto «Te faltan N pasos» y la insignia tenue; `<img src="/api/v1/insignias/programacion-agentica/pa-02.svg">` (ruta pública existente).
3. Plan de seis tareas leído de `GET /api/v1/live/pa-02/plan` (T-6.3) con estados.
Verifica (comando exacto → salida esperada):
- `grep -c '/api/v1/lessons/pa-02/progress' $R/lms/content/courses/programacion-agentica/live/pa-02/12-insignia/escena.html` → `1`
- captura `docs/capturas-live/T-2.16-E12-1920x1080-dark.png` con un alumno de 6 pasos
Hecho significa (sí/no): con 6 pasos la insignia se enciende; con 5 muestra «Te falta 1 paso».
No hagas: emitir la insignia desde la escena (lo hace T-6.5 al cerrar); CDN.

### T-2.17 · Capturas de respaldo y ensayo cronometrado
Depende de: T-2.5 a T-2.16  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Generar `captura.png` de respaldo para cada escena y correr el ensayo de 105 minutos con el cronómetro anotando tiempos reales en `escena.yaml`.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md (tabla «Resumen de tiempos») · lms/scripts/captura.mjs
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/pa-02/*/captura.png · lms/content/courses/programacion-agentica/live/pa-02/*/escena.yaml (solo `duracion_min`) · docs/capturas-live/T-2.17-ensayo.md
Pasos:
1. Para cada escena: `node ../scripts/captura.mjs http://localhost:8095/api/v1/live/pa-02/escenas/<id>/html?tema=dark 1920x1080 $R/lms/content/.../<id>/captura.png dark`.
2. Ensayo con el instructor: tabla escena, minuto de inicio, minuto de fin, desvío contra el guion; ajustar `duracion_min` si el desvío supera 3 min.
Verifica (comando exacto → salida esperada):
- `ls $R/lms/content/courses/programacion-agentica/live/pa-02/*/captura.png | wc -l` → `12`
- `awk -F': ' '/duracion_min/{s+=$2} END{print s}' $R/lms/content/courses/programacion-agentica/live/pa-02/[0-9][1-9]*/escena.yaml` → entre `100` y `110`
Hecho significa (sí/no): 12 capturas y la suma de duraciones cabe en 105 minutos.
No hagas: tocar el HTML de las escenas en este ticket; borrar `00-prueba` (déjala, no se lista si `oculta: true`; añadir ese campo booleano en T-2.1 si falta).

### Fase 3 · Terminal y contenedor de aula por alumno

### T-3.1 · Dockerfile jmd/aula con el backend en modo nube
Depende de: T-0.1  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Imagen Alpine `jmd/aula:latest` con `sh`, `curl`, `git`, `python3` y las dependencias del asistente en modo nube, más `jmd` y `rtk`, de menos de 220 MB y sin Node.
Lee antes (rutas exactas): Dockerfile (raíz; la imagen `localhost/ai-orchestrator:latest` ya trae `/usr/local/bin/jmd`) · lms/Dockerfile · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/backend/requirements.txt
Crea / modifica (rutas exactas, nada más): lms/aula/Dockerfile · lms/aula/requirements-nube.txt · lms/aula/README.md
Pasos:
1. `requirements-nube.txt`: `fastapi==0.143.0`, `uvicorn==0.54.0`, `python-multipart==0.0.32`, `httpx==0.28.1`, `numpy==2.5.3`, `pillow==12.3.0`. Nada más (sin torch, faster-whisper, diffusers, transformers, fastembed, mflux).
2. Dockerfile completo:
```dockerfile
# jmd/aula: contenedor de clase. Sin Node, sin modelos, sin socket de Docker.
FROM docker.io/library/alpine:3.22 AS rtk
ARG RTK_URL=https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-unknown-linux-musl.tar.gz
RUN apk add --no-cache curl tar && mkdir -p /out && curl -fsSL "$RTK_URL" | tar -xz -C /out && chmod +x /out/rtk

FROM docker.io/library/alpine:3.22
RUN apk add --no-cache sh curl git python3 py3-pip ca-certificates \
 && adduser -D -u 10001 -h /home/alumno alumno \
 && mkdir -p /trabajo /opt/skills-curso /opt/osito && chown -R alumno:alumno /trabajo /home/alumno
COPY requirements-nube.txt /opt/requirements-nube.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /opt/requirements-nube.txt
COPY --from=localhost/ai-orchestrator:latest /usr/local/bin/jmd /usr/local/bin/jmd
COPY --from=rtk /out/rtk /usr/local/bin/rtk
ENV HOME=/home/alumno PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin TERM=xterm-256color \
    JMD_URL=http://ai-orchestrator:4000 OSITO_PERFIL=nube OSITO_PUERTO=8766 PYTHONDONTWRITEBYTECODE=1
USER alumno
WORKDIR /trabajo
CMD ["sleep", "2147483647"]
```
3. Si la URL de `rtk` no existe (404), detenerse y reportar la URL que probaste; no inventar otra.
4. Construir en la Mac para el EC2: `docker build --platform linux/amd64 -t jmd/aula:latest $R/lms/aula` (requiere que `localhost/ai-orchestrator:latest` exista para esa plataforma: `docker build --platform linux/amd64 -t localhost/ai-orchestrator:latest $R` antes).
5. README con los dos comandos de build y el de medición.
Verifica (comando exacto → salida esperada):
- `docker run --rm --platform linux/amd64 jmd/aula:latest sh -c 'jmd --version && rtk --version && python3 -c "import fastapi, PIL; print(\"py ok\")"' 2>&1 | tail -3` → tres líneas, la última `py ok`
- `docker image inspect jmd/aula:latest --format '{{.Size}}' | awk '{print ($1<230686720)?"ok":"pesa"}'` → `ok`
- `docker run --rm --platform linux/amd64 jmd/aula:latest sh -c 'command -v node || echo sin-node'` → `sin-node`
Hecho significa (sí/no): los tres comandos dan lo esperado.
No hagas: `apk add nodejs`; `pip install torch`; correr como root; copiar la clave de ningún proveedor.

### T-3.2 · AGENTS.md, skills, código del osito y script aula
Depende de: T-3.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Meter en la imagen los 14 skills del curso en `/opt/skills-curso`, el código del osito en `/opt/osito`, un `AGENTS.md` de arranque y el script `aula` (plantillas y arranque del asistente).
Lee antes (rutas exactas): /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/ (14 carpetas) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/ · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/obra/ · src/bin/jmd/skills.rs (lee `~/.config/jmd/skills/`)
Crea / modifica (rutas exactas, nada más): lms/aula/Dockerfile (líneas `COPY`) · lms/aula/skills-curso/ (copia de los 14) · lms/aula/osito/ (copia de `osito/backend`, `osito/frontend`, `osito/arrancar.sh`, `obra/`) · lms/aula/AGENTS.md · lms/aula/bin/aula
Pasos:
1. `rsync -a --exclude __pycache__ --exclude imagenes /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/ $R/lms/aula/skills-curso/` (excluir `_perfiles`); lo mismo para `osito` y `obra`.
2. `COPY skills-curso /opt/skills-curso`, `COPY osito /opt/osito`, `COPY AGENTS.md /home/alumno/AGENTS.md`, `COPY bin/aula /usr/local/bin/aula`; en el Dockerfile crear `/home/alumno/.config/jmd/skills` como enlace a `/opt/skills-curso`.
3. `bin/aula` (sh): `aula iniciar` copia `/opt/osito` a `/trabajo/osito` si no existe y lanza `cd /trabajo/osito && OSITO_PERFIL=nube OSITO_PUERTO=8766 /opt/venv/bin/python -m uvicorn backend.app:app --host 0.0.0.0 --port 8766 >> /trabajo/osito.log 2>&1 &` guardando el PID en `/tmp/osito.pid`; `aula parar`; `aula estado` imprime `arrancado|parado`; `aula nuevo <plantilla>` (T-4.3).
4. `AGENTS.md`: 15 líneas: dónde está el trabajo (`/trabajo`), que el asistente corre en 8766 en modo nube, que no hay internet salvo el gateway, y las reglas de terminal del contexto fijo.
Verifica (comando exacto → salida esperada):
- `docker run --rm --platform linux/amd64 jmd/aula:latest sh -c 'ls /opt/skills-curso | wc -l && test -x /usr/local/bin/aula && echo LISTO'` → `14` y `LISTO`
- `docker run --rm --platform linux/amd64 jmd/aula:latest sh -c 'aula iniciar && sleep 4 && curl -s localhost:8766/api/salud | head -c 80 && aula parar'` → JSON que empieza por `{"`
Hecho significa (sí/no): 14 skills, el script funciona y el asistente arranca en modo nube dentro de la imagen.
No hagas: copiar `_perfiles`; incluir `osito/imagenes`; `pip install` de más.

### T-3.3 · Paquete internal/aula (límites 192 MB)
Depende de: T-3.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Paquete Go `aula` que construye el nombre del contenedor, los argumentos de `docker run` con límites y las operaciones crear, reutilizar, exec, parar y borrar.
Lee antes (rutas exactas): lms/api/internal/runner/runner.go (`Runner`, `ShellCmd`, `ensureImage`, `Kill`) · lms/api/cmd/lms/main.go (cómo se arma `Runner`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/aula/aula.go · lms/api/internal/aula/aula_test.go · lms/api/cmd/lms/main.go (campo `Aula`) · lms/api/internal/httpapi/server.go (campo `Aula *aula.Aula`)
Pasos:
1. `func Nombre(userID string) string` → `"curso-" + hex(sha256(userID))[:16]`; `func Volumen(userID string) string` → `"trabajo-" + mismo sufijo`.
2. `type Aula struct { Runtime, Imagen, Red string }` (`Red` por defecto `aula_net`); `func (a *Aula) Args(userID string) []string` devuelve exactamente: `run -d --name <nombre> --hostname aula --memory 192m --memory-swap 192m --cpus 0.5 --pids-limit 96 --cap-drop ALL --security-opt no-new-privileges --read-only --tmpfs /tmp:rw,exec,size=64m --tmpfs /home/alumno:rw,size=32m,uid=10001,gid=10001 -v <volumen>:/trabajo --network <red> -e HOME=/home/alumno -e JMD_URL=http://ai-orchestrator:4000 --user 10001:10001 --workdir /trabajo <imagen> sleep 2147483647`.
3. `Crear(ctx, userID) (reutilizado bool, err)` (`docker inspect -f {{.State.Running}} <nombre>`: si corre, reutiliza; si existe parado, `docker start`; si no, `docker run`), `Exec(ctx, nombre string, cmd ...string) (string, error)` con `docker exec <nombre> sh -c <cmd>` y timeout 20 s, `Parar`, `Borrar` (`docker rm -f`, nunca el volumen), `Listar() []string` (`docker ps -a --filter name=curso- --format {{.Names}}`).
4. Red: `AsegurarRed(ctx)` crea `docker network create --internal aula_net` si no existe y conecta `ai-orchestrator` con alias `ai-orchestrator` (`docker network connect --alias ai-orchestrator aula_net ai-orchestrator`, ignorando «already exists»).
5. Test `TestArgsAula`: `Args("u1")` contiene `--memory 192m`, `--pids-limit 96`, `--read-only`, no contiene `docker.sock`; `Nombre("u1")` empieza por `curso-` y tiene 22 caracteres.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/aula -run TestArgsAula -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): test verde y `go vet ./...` limpio.
No hagas: montar `/var/run/docker.sock` en el contenedor del alumno; red `bridge` por defecto; límites distintos de los indicados.

### T-3.4 · Rutas del aula y arranque del asistente
Depende de: T-3.3  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `POST /api/v1/aula/iniciar`, `POST /api/v1/aula/apagar`, `GET /api/v1/aula` y `POST /api/v1/aula/asistente` que crean el contenedor del alumno y arrancan su asistente en modo nube.
Lee antes (rutas exactas): lms/api/internal/aula/aula.go · lms/api/internal/httpapi/run_handlers.go (patrón 503 cuando no hay runner) · lms/api/internal/httpapi/api_test.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/aula_handlers.go · lms/api/internal/httpapi/aula_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. Interfaz `type aulaMotor interface { Crear(ctx, userID string) (bool, error); Exec(ctx, nombre string, cmd ...string) (string, error); Parar(ctx, nombre string) error; Borrar(ctx, nombre string) error; Listar(ctx) ([]string, error) }` en `aula_handlers.go`; `Server.Aula` la cumple; en tests se inyecta un falso en memoria.
2. `POST /api/v1/aula/iniciar` `{}` → `{"contenedor":"curso-…","reutilizado":false,"asistente":"parado"}`; 503 `unavailable` si `s.Aula == nil`; registra `ultimo_uso[userID] = now`.
3. `POST /api/v1/aula/asistente` `{"accion":"arrancar|parar"}` → ejecuta `aula iniciar` o `aula parar` dentro del contenedor y devuelve `{"asistente":"arrancado"}`.
4. `GET /api/v1/aula` → `{"contenedor","estado":"corriendo|parado|ninguno","asistente","ultimo_uso"}`; `POST /api/v1/aula/apagar` → `Parar`.
5. Tests `TestAulaIniciarReutiliza` (dos `iniciar` → segunda vez `reutilizado: true`) y `TestAulaSinMotor503`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestAula -v 2>&1 | grep -c '^--- PASS'` → `2`
- `curl -s -X POST localhost:8095/api/v1/aula/iniciar -H "Authorization: Bearer $ALU" -H 'Content-Type: application/json' -d '{}' | jq -c '{reutilizado,asistente}'` (con `LMS_RUNNER=docker`) → `{"reutilizado":false,"asistente":"parado"}`
Hecho significa (sí/no): tests verdes y el contenedor aparece en `docker ps --filter name=curso-`.
No hagas: devolver el nombre real del usuario en el nombre del contenedor; permitir `accion` fuera de los dos valores; arrancar el asistente sin pedirlo.

### T-3.5 · Apagado por inactividad y borrado al cerrar
Depende de: T-3.4, T-1.3  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Parar los contenedores sin uso durante 15 minutos y borrarlos (no los volúmenes) al cerrar el LIVE.
Lee antes (rutas exactas): lms/api/internal/httpapi/aula_handlers.go · lms/api/internal/httpapi/live_handlers.go (`cerrar`) · lms/api/cmd/lms/main.go (goroutine `cs.Watch`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/aula_reaper.go · lms/api/internal/httpapi/aula_test.go · lms/api/internal/httpapi/live_handlers.go · lms/api/cmd/lms/main.go (`go srv.AulaReaper(ctx, time.Minute)`)
Pasos:
1. `func (s *Server) AulaReaper(ctx context.Context, cada time.Duration)`: cada tick, para cada `ultimo_uso` con más de 15 min → `Parar` y log `slog.Info("aula parada por inactividad", "contenedor", nombre)`.
2. `ultimo_uso` se actualiza en: terminal (T-3.6), proxy del agente (T-3b.13), visor (T-4.1), relé API (T-4.2).
3. En `cerrar` del LIVE: `Listar` y `Borrar` cada `curso-*`; publicar `cierre`.
4. Test `TestReaperParaInactivos` con reloj inyectado (`s.ahora func() time.Time`): un contenedor con uso hace 16 min se para; uno de hace 2 min no.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestReaperParaInactivos -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): test verde; tras cerrar el LIVE, `docker ps -a --filter name=curso- -q | wc -l` da `0` y `docker volume ls --filter name=trabajo- -q | wc -l` no baja.
No hagas: `docker volume rm`; parar contenedores que no empiecen por `curso-`.

### T-3.6 · Terminal al contenedor
Depende de: T-3.4  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `GET /api/v1/term?origen=aula` abre `docker exec -it curso-<alias> sh` por el WebSocket existente, con hasta 3 sesiones por alumno y registro de permisos (terminal, visor, evidencias).
Lee antes (rutas exactas): lms/api/internal/httpapi/term_handlers.go (función `term` completa) · lms/api/internal/runner/runner.go (`ShellCmd`) · lms/api/internal/aula/aula.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/term_handlers.go · lms/api/internal/runner/runner.go (`func (r *Runner) ExecShell(ctx context.Context, contenedor string) *exec.Cmd` → `exec.CommandContext(ctx, r.Runtime, "exec", "-it", "-e", "TERM=xterm-256color", contenedor, "sh")`) · lms/api/internal/httpapi/aula_handlers.go (`PUT /api/v1/aula/permisos` `{"terminal":true,"visor":true,"evidencias":true}` y `GET` dentro de `/api/v1/aula`) · lms/api/internal/httpapi/aula_test.go
Pasos:
1. Extraer de `term` la parte posterior a `pty.Start` en `func (s *Server) servirPTY(ctx, conn, cmd *exec.Cmd)` sin cambiar su comportamiento.
2. En `term`: si `r.URL.Query().Get("origen") == "aula"`, exigir que exista el contenedor (`GET /api/v1/aula` interno: si `ninguno`, 409 `sin_aula`), usar `ExecShell`, no llamar `Kill` al cerrar (el contenedor sigue), actualizar `ultimo_uso`.
3. `slots`: clave `userID` con contador hasta 3 para `origen=aula` (hoy es 1 sin origen; mantener 1 para el Estudio).
4. Permisos en memoria por usuario (`s.permisos map[string]permisos`), por defecto todo `false` hasta que el alumno los ponga.
5. Test `TestAulaPermisos` (PUT y GET devuelven lo guardado) y `TestTermSinAula409`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run 'TestAulaPermisos|TestTermSinAula409' -v 2>&1 | grep -c '^--- PASS'` → `2`
Hecho significa (sí/no): en el navegador, la terminal del LIVE lista `/trabajo` con `ls`; abrir, cerrar y reabrir mantiene los archivos.
No hagas: cambiar la firma de `term` ni el comportamiento del Estudio; `--privileged`; WebSocket nuevo (se reutiliza el existente).

### T-3.7 · Terminal UI con pestañas y reconexión
Depende de: T-3.6  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Componente `TerminalAula` con hasta 3 pestañas, copiar y pegar, tamaño de letra, tema claro/oscuro y reconexión automática.
Lee antes (rutas exactas): lms/web/src/components/terminal.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/global.css (`.term`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/terminal-aula.tsx · lms/web/src/components/live-alumno.tsx (panel «Terminal») · lms/web/src/global.css
Pasos:
1. Copiar `terminal.tsx` a `terminal-aula.tsx` cambiando la URL a `/api/v1/term?origen=aula` y aceptando props `tema: "light"|"dark"`, `fontSize: number`, `onEvento$: QRL<(tipo: "terminal"|"error", detalle: string) => void>`.
2. Barra `.term-tabs` con hasta 3 pestañas (`+` deshabilitado al llegar a 3), cada una con su `Terminal` montado y oculto por `hidden`; botones `A−`/`A+` (12 a 18 px), «Copiar selección» (`term.getSelection()` → `navigator.clipboard.writeText`), pegar con `Ctrl+Shift+V`.
3. Tema: `theme` de xterm según prop (`background` `#16151d` oscuro, `#fbf6ee` claro).
4. Reconexión: en `onclose` no normal, esperar 1, 2, 4 s y reabrir el WebSocket sobre el mismo xterm (la shell del contenedor sigue viva); mostrar línea `[reconectando…]`.
5. Emitir `onEvento$("terminal", …)` con debounce 10 s al teclear y `"error"` cuando la salida contiene `command not found`, `Traceback`, `Error:`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build.types 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-3.7-terminal-1366x768-dark.png` con dos pestañas abiertas
Hecho significa (sí/no): cerrar y reabrir el panel mantiene la sesión del shell (`cd /trabajo/osito` sigue vigente).
No hagas: instalar addons nuevos de xterm; más de 3 pestañas; `alert` al perder conexión.

### T-3.8 · Panel de ayuda de la terminal
Depende de: T-2.1, T-3.7  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Panel lateral con los `comandos` de la escena actual (copiar con un clic) y «qué significa este error» para 15 errores comunes.
Lee antes (rutas exactas): lms/web/src/components/live-alumno.tsx · lms/web/src/components/ui.tsx (`Copy`) · lms/api/internal/content/live.go (`comandos`)
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/live/errores.yaml · lms/api/internal/content/live.go (`LoadErrores(dir)` y `Catalog.Errores()`) · lms/api/internal/httpapi/live_escenas.go (`GET /api/v1/live/errores`) · lms/web/src/components/live-ayuda.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/lib/api.ts
Pasos:
1. `errores.yaml`: lista de 15 `{patron: "command not found", titulo: "El comando no existe", que_hacer: "Revisa la ortografía…"}` (incluir `No such file or directory`, `Permission denied`, `Traceback`, `ModuleNotFoundError`, `Address already in use`, `Connection refused`, `401`, `429`, `429 quota_exceeded`, `syntax error`, `unexpected EOF`, `killed` (RAM), `timeout`, `JSONDecodeError`, `curl: (7)`).
2. Panel «Ayuda»: lista de comandos de la escena con botón copiar (`Copy`), y al recibir un evento `error` de la terminal, buscar el `patron` y mostrar la tarjeta correspondiente arriba.
3. Enlace «Ver la clase» a `/lessons/pa-02/`.
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/live/errores -H "Authorization: Bearer $ALU" | jq 'length'` → `15`
- captura `docs/capturas-live/T-3.8-ayuda-1366x768-light.png`
Hecho significa (sí/no): escribir `foo` en la terminal muestra la tarjeta «El comando no existe» en menos de 2 s.
No hagas: ejecutar comandos desde el panel sin clic del alumno; textos en inglés.

### T-3.9 · Inyección de credenciales sin clave central
Depende de: T-3.4, T-5.3  ·  Turnos: 1  ·  Riesgo: alto
Objetivo (una frase): Al iniciar el aula, el LMS escribe en el contenedor `~/.config/jmd/tokens.json` con el token personal del alumno y `/trabajo/.env` con las variables del osito; la clave de OpenRouter no entra nunca.
Lee antes (rutas exactas): src/bin/jmd/sso.rs (struct `Tokens`, `tokens_path`) · src/bin/jmd/client.rs (`Settings`, `config_path`) · lms/api/internal/httpapi/aula_handlers.go · lms/api/internal/httpapi/mi_ia.go (T-5.4, `TokenPersonal`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/aula_credenciales.go · lms/api/internal/httpapi/aula_test.go · lms/api/internal/httpapi/aula_handlers.go (llamar `inyectarCredenciales` tras `Crear`)
Pasos:
1. `~/.config/jmd/config.json`: `{"url":"http://ai-orchestrator:4000","api_key":"<jg_…>"}`; `~/.config/jmd/tokens.json`: `{"gateway_url":"http://ai-orchestrator:4000","gateway_token":"<jg_…>","gateway_token_expires":<epoch+2 días>,"lms_url":"<PublicURL>","lms_token":"<lms_… del alumno, sesión nueva con etiqueta aula>","sub":"<userID>","name":"<nombre>"}`.
2. `/trabajo/.env`: `OSITO_PERFIL=nube`, `OSITO_PUERTO=8766`, `OSITO_OLLAMA_URL=http://ai-orchestrator:4000/v1`, `OSITO_GATEWAY_TOKEN=<jg_…>`, `OSITO_MODELO=<modelo elegido en Mi IA o "clase">`, `OSITO_IMAGEN_URL=http://ai-orchestrator:4000/v1/images/generations`, `OSITO_IMAGEN_MODELO=<proveedor elegido>`, `OSITO_STT_URL=http://ai-orchestrator:4000/v1/audio/transcriptions`.
3. Escritura por `docker exec -i <nombre> sh -c 'mkdir -p ~/.config/jmd && cat > ~/.config/jmd/tokens.json && chmod 600 ~/.config/jmd/tokens.json'` con el contenido por `stdin` (añadir `ExecStdin` a la interfaz `aulaMotor`); nunca por argumento de línea de comandos.
4. Test `TestCredencialesSinClaveCentral`: con motor falso que guarda lo escrito, el contenido no contiene la cadena `sk-or-` ni el valor de `llm.key`, y sí contiene `OSITO_PERFIL=nube`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestCredencialesSinClaveCentral -v 2>&1 | tail -2` → `--- PASS` y `ok`
- dentro de un contenedor real: `docker exec curso-<alias> sh -c 'jmd chat "Responde solo: ok" 2>&1 | tail -1'` → una línea con `ok`
Hecho significa (sí/no): `jmd chat` responde por el gateway y `grep -r "sk-or" /home/alumno /trabajo` en el contenedor no devuelve nada.
No hagas: pasar tokens como argumento de `docker exec`; escribir la clave de OpenRouter; registrar el token en logs.

### T-3.10 · Tabla live_marcas
Depende de: T-1.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Guardar las marcas de tiempo de activación de piedra y RTK por alumno para dibujarlas en el gráfico de tokens.
Lee antes (rutas exactas): lms/api/internal/store/store.go · lms/api/internal/httpapi/server.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/store/store.go · lms/api/internal/store/live_test.go · lms/api/internal/httpapi/aula_handlers.go · lms/api/internal/httpapi/server.go
Pasos:
1. `CREATE TABLE IF NOT EXISTS live_marcas (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, lesson_id TEXT NOT NULL, tipo TEXT NOT NULL, t TEXT NOT NULL);` e índice por `(user_id, t)`.
2. `PonerMarca(ctx, userID, lessonID, tipo string) error` (tipo `piedra|rtk`) y `Marcas(ctx, userID string, desde time.Time) ([]Marca, error)`.
3. `POST /api/v1/aula/marcas` `{"tipo":"piedra","lesson_id":"pa-02"}` → `{"ok":true}`; 400 si `tipo` no es `piedra|rtk`.
4. Test `TestMarcas` en store: dos marcas, lectura ordenada por `t`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/store -run TestMarcas -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): test verde y la ruta responde `{"ok":true}`.
No hagas: aceptar `tipo` libre; borrar marcas.

### T-3.11 · Interruptor piedra (caveman)
Depende de: T-3.10, T-3.9  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): «Activar piedra» en el panel escribe la marca, pone `style: full` en la sesión del agente del alumno y asegura la skill `piedra` montada.
Lee antes (rutas exactas): /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/piedra/SKILL.md · src/savings.rs (`Style::parse`, `X-JMD-Style`) · lms/api/internal/httpapi/aula_handlers.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/aula_handlers.go (`POST /api/v1/aula/piedra` `{"activo":true}`) · lms/api/internal/httpapi/aula_test.go · lms/web/src/components/live-alumno.tsx (interruptor) · lms/web/src/lib/api.ts
Pasos:
1. Handler: guarda `ia_alumno.piedra` (columna de T-5.4), `PonerMarca(... "piedra")`, y ejecuta en el contenedor `mkdir -p ~/.config/jmd/skills && ln -sfn /opt/skills-curso/piedra ~/.config/jmd/skills/piedra && echo LISTO`.
2. El estilo se aplica en cada turno: el proxy del agente (T-3b.13) añade la cabecera `X-JMD-Style: full` cuando `piedra` está activo, y el panel Agente manda `"estilo":"full"` en `POST /turno`.
3. UI: `role="switch"` «Modo piedra» con texto «Respuestas cortas: menos tokens».
4. Test `TestPiedraEscribeMarca`: tras el POST, `Marcas` devuelve una fila tipo `piedra`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestPiedraEscribeMarca -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): la marca aparece en el gráfico de E05 y la siguiente respuesta del agente es más corta (telemetría `style = full`).
No hagas: instalar el proxy caveman de Node; cambiar `savings.style` global del gateway.

### T-3.12 · Interruptor RTK
Depende de: T-3.10, T-3.4  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): «Activar RTK» ejecuta `rtk init -g --auto-patch` en el contenedor, escribe la marca y muestra `rtk gain` en el panel.
Lee antes (rutas exactas): lms/api/internal/httpapi/aula_handlers.go · lms/api/internal/aula/aula.go (`Exec`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/aula_handlers.go (`POST /api/v1/aula/rtk` `{"activo":true}` → `{"ok":true,"salida":"…"}` y `GET /api/v1/aula/rtk-gain` → `{"texto":"…"}`) · lms/api/internal/httpapi/aula_test.go · lms/web/src/components/live-alumno.tsx · lms/web/src/lib/api.ts
Pasos:
1. `Exec(nombre, "rtk init -g --auto-patch 2>&1 | tail -n 5")`; si la salida contiene `error`, responder 502 `rtk_fallo` con el texto recortado a 200 caracteres.
2. `PonerMarca(... "rtk")`.
3. `rtk-gain`: `Exec(nombre, "rtk gain 2>&1 | tail -n 10")`.
4. UI: interruptor «RTK» y debajo el texto de `rtk gain` actualizado al abrir el panel.
5. Test `TestRTKEscribeMarca` con motor falso que devuelve `ok`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestRTKEscribeMarca -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): la marca aparece en E05 y `rtk gain` muestra un ahorro mayor que 0 tras tres comandos.
No hagas: ejecutar `rtk` en el host del EC2; ocultar la salida de error al alumno.

### T-3.13 · Precrear contenedores y medir 10 con asistente
Depende de: T-3.4, T-3.9  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `POST /api/v1/aula/precrear` (admin) crea el contenedor y arranca el asistente de cada alumno de la cohorte, y se mide la RAM de 10 en pico.
Lee antes (rutas exactas): lms/api/internal/httpapi/aula_handlers.go · lms/api/internal/httpapi/admin_handlers.go (`users`) · docs/PLAN_MODO_LIVE_SESION2.md (tarea 3.2 y «Antes de la clase» punto 4)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/aula_handlers.go · docs/capturas-live/T-3.13-ram-asistente.md
Pasos:
1. Handler admin: cuerpo `{"cohorte":"cohorte-2026-2"}`; para cada `student` de la cohorte: `Crear`, `inyectarCredenciales`, `Exec("aula iniciar")`; responde `{"creados":n,"fallidos":[...]}`.
2. En el EC2 con 10 alumnos de prueba: `sudo docker stats --no-stream --format '{{.MemUsage}}' $(sudo docker ps --filter name=curso- -q) | awk '{s+=$1} END{print s " MiB"}'` tras 60 s.
3. Anotar cifra, `free -m` disponible y la decisión (Keycloak apagado / subir a 8 GB 3 horas).
Verifica (comando exacto → salida esperada):
- paso 2 → menos de `1000 MiB`
- `curl -s -X POST https://jmd-learn.online/api/v1/aula/precrear -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"cohorte":"cohorte-2026-2"}' | jq .creados` → el número de alumnos de la cohorte
Hecho significa (sí/no): 10 contenedores con asistente arrancado bajo 1 GB sumados y la decisión escrita.
No hagas: precrear para `instructor`/`admin`; dejar contenedores de prueba tras medir.

### Fase 3b · `jmd` apto para clase y embebido en el LIVE

### T-3b.1 · Barra de estado de jmd y --json
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Tras cada respuesta del chat, `jmd` muestra tokens de entrada y salida del turno y acumulados, contexto usado en %, modelo y proveedor reales; con `--json` sale lo mismo como JSON.
Lee antes (rutas exactas): src/bin/jmd/client.rs (`chat_stream`, struct `ChatMeta`) · src/bin/jmd/main.rs (`struct Session`, `async fn ask`, línea `eprintln!("{}", dim(&format!("↳ …`) · src/api.rs (`meta_headers`: cabecera `x-orchestrator-upstream-model`)
Crea / modifica (rutas exactas, nada más): src/bin/jmd/client.rs · src/bin/jmd/main.rs
Pasos:
1. En `ChatMeta` añadir `pub input_tokens: Option<u64>` y `pub provider: String`; en `chat_stream` leer `v["usage"]["prompt_tokens"]` y la cabecera `x-orchestrator-provider` (añadirla en `meta_headers` de `src/api.rs` con `put("x-orchestrator-provider", provider)`; `meta_headers` recibe `provider: &str` como parámetro nuevo; actualizar sus dos llamadas en `handle`).
2. En `Session` añadir `tokens_in: u64, tokens_out: u64, contexto: u64` (ventana del modelo: 131072 por defecto; si `GET /v1/models` trae `context` para el modelo real, usarlo).
3. En `ask`, sustituir la línea `↳ …` por la barra: `↳ coding · laguna (poolside/laguna-s-2.1:free) · openrouter · 4.2 s · turno 812↑ 240↓ · sesión 4120↑ 1330↓ · contexto 3 %` (contexto = bytes del historial / 4 / ventana).
4. `jmd chat --json "…"` imprime `{"texto":…, "modelo":…, "modelo_real":…, "proveedor":…, "segundos":…, "turno":{"entrada":812,"salida":240}, "sesion":{"entrada":…,"salida":…}, "contexto_pct":3, "intentos":1, "request_id":…}` (hoy `--json` es global en `Cli`; respetarlo en `Cmd::Chat`).
5. Test unitario en `main.rs` o `client.rs`: `fn barra_estado(...) -> String` pura con un caso fijo.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test barra_estado 2>&1 | grep -c 'test result: ok'` → `1`
- `cd $R && ~/.cargo/bin/cargo clippy --all-targets 2>&1 | grep -c '^warning' ` → igual que antes del ticket (anotar el número al empezar)
Hecho significa (sí/no): la barra cambia tras cada respuesta y `--json` trae los campos listados.
No hagas: cambiar la firma de `chat_stream`; nuevas dependencias; romper `tests/jmd_cli.rs`.

### T-3b.2 · Costo por respuesta en el gateway
Depende de: T-0.1  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): El gateway calcula `cost_usd` por respuesta con precios por modelo, lo guarda en telemetría, lo devuelve en `x-orchestrator-cost-usd` y lo expone por `GET /v1/usage/{request_id}` para los streams.
Lee antes (rutas exactas): src/config.rs (`ModelSpec`, `Deployment`) · src/engine.rs (`record_success`) · src/telemetry.rs (`Row`, `record`, `open` con los `ALTER`) · src/api.rs (`handle`, rama `Reply::Json` y `Reply::Stream`, `meta_headers`) · tests/gateway.rs (`setup`, `call`, `fake_chat`)
Crea / modifica (rutas exactas, nada más): src/config.rs · src/engine.rs · src/telemetry.rs · src/api.rs · tests/gateway.rs
Pasos:
1. `config.rs`: en `ModelSpec` añadir `#[serde(default)] pub price: Price` con `pub struct Price { pub input_per_m: f64, pub output_per_m: f64 }` (0 y 0 por defecto = gratis).
2. `telemetry.rs`: columna `cost_usd REAL` en la lista de `ALTER TABLE calls ADD COLUMN`, campo `pub cost_usd: Option<f64>` en `Row`, incluirlo en `record`; `pub fn usage_of(&self, request_id: &str) -> Option<Value>` → `{"request_id","prompt_tokens","completion_tokens","cost_usd","model","provider","upstream_model"}` de la fila `final = 1`.
3. `engine.rs`: en `record_success` calcular `cost = prompt*input_per_m/1e6 + completion*output_per_m/1e6` con el `price` de `cfg.models[group]` (pasar `price: Price` como parámetro nuevo) y rellenar `Row.cost_usd`.
4. `api.rs`: en `Reply::Json`, cabecera `x-orchestrator-cost-usd` con 6 decimales y campo `orchestrator.cost_usd`; ruta nueva `.route("/v1/usage/:rid", get(usage_of))` con `gateway_auth` que devuelve `usage_of` o 404.
5. Test en `tests/gateway.rs`: `cost_is_reported_and_queryable` (modelo con `price` 1.0/2.0 y usage 1000/500 → `cost_usd` 0.002; modelo sin `price` → 0).
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway cost_is_reported -- --nocapture 2>&1 | grep -c 'test result: ok'` → `1`
- `curl -s -D - -o /dev/null localhost:4000/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"auto","messages":[{"role":"user","content":"hola"}]}' | grep -ci 'x-orchestrator-cost-usd'` → `1`
Hecho significa (sí/no): test verde, cabecera presente, `GET /v1/usage/<rid>` responde tras un stream.
No hagas: llamar a `/models` de OpenRouter en cada petición; cambiar el formato de `orchestrator` existente (solo añadir).

### T-3b.3 · Costo del día y saldo en whoami
Depende de: T-3b.2  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): `GET /v1/auth/me` incluye `usage.cost_usd_today` y `jmd whoami` muestra el costo del día y el saldo de la clave central (`GET /key` de OpenRouter, ya sondeado por `probe_balance`).
Lee antes (rutas exactas): src/api.rs (`auth_me`) · src/auth.rs (`Usage::remaining`) · src/telemetry.rs (`usage_today`) · src/quotas.rs (`balance`) · src/bin/jmd/sso.rs (`whoami`)
Crea / modifica (rutas exactas, nada más): src/telemetry.rs (`cost_today(sub, since) -> f64`) · src/api.rs · src/bin/jmd/sso.rs · tests/gateway.rs
Pasos:
1. `telemetry.rs`: `pub fn cost_today(&self, sub: &str, since: f64) -> f64` (SUM de `cost_usd` con `user = sub`, `final = 1`, `ok = 1`).
2. `auth_me`: añadir `"cost_usd_today"` dentro de `usage` y, si quien llama tiene rol `instructor` o `admin`, `"balance"` con `e.quotas.balance("openrouter")` (`limit`, `usage`, `remaining`); a los alumnos nunca el saldo.
3. `whoami`: línea `gateway: … · hoy: 12 peticiones, 4000 tokens, 0,0000 USD`; si hay `balance`, línea `saldo central: 7,31 USD de 10,00`.
4. Test `auth_me_reports_cost` en `tests/gateway.rs`.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway auth_me_reports_cost 2>&1 | grep -c 'test result: ok'` → `1`
Hecho significa (sí/no): con un modelo `:free`, `whoami` muestra `0,0000 USD` y la cuota restante.
No hagas: mostrar el saldo a alumnos; imprimir la clave.

### T-3b.4 · Progreso de reintentos por SSE
Depende de: T-0.1  ·  Turnos: 2  ·  Riesgo: alto
Objetivo (una frase): Con la cabecera `X-JMD-Progress: 1` y `stream: true`, el gateway responde 200 de inmediato y emite comentarios SSE `: progreso {…}` por cada intento, respeta `orchestrator.max_attempts` y `orchestrator.deadline_s`, y si todo falla manda `data: {"error":…}` y `data: [DONE]`.
Lee antes (rutas exactas): src/engine.rs (`run`, bucle `for model in chain`, `Attempt`) · src/api.rs (`hints`, `struct Hints` en engine.rs, `handle` rama `Reply::Stream`) · src/reliability.rs (`backoff_delay`) · tests/gateway.rs (`falls_back_on_429_and_then_cools_the_model_down`, `streaming_passthrough_and_telemetry`)
Crea / modifica (rutas exactas, nada más): src/engine.rs · src/api.rs · tests/gateway.rs
Pasos:
1. `Hints`: añadir `pub max_attempts: Option<u32>`, `pub deadline_s: Option<f64>`, `pub progress: bool`; en `hints()` leerlos de `o["max_attempts"]`, `o["deadline_s"]` y la cabecera `x-jmd-progress` == `"1"`.
2. `engine.rs`: nueva `pub async fn run_with<T,F,Fut>(&self, cfg, chain, per_try, deadline, max_attempts: Option<u32>, on_progress: &mut dyn FnMut(Progreso), call: F)` donde `pub struct Progreso { pub modelo: String, pub estado: String /* intentando | 429 | espero | cambio | fallo */, pub espera_s: f64, pub intento: u32 }`; `run` llama a `run_with` con `None` y un cierre vacío. Cortar la cadena al llegar a `max_attempts` intentos reales (no saltos).
3. `api.rs handle`: si `h.progress && stream`, crear el canal `mpsc` ANTES de llamar al motor, responder ya con `text/event-stream`, enviar `: progreso {"modelo":"laguna","estado":"intentando","intento":1}\n\n` por cada `Progreso`, y al obtener `Served` seguir con el paso a través normal; si `run_with` falla, enviar `data: {"error":{"message":"…","type":"…"}}\n\ndata: [DONE]\n\n`.
4. `deadline_s` acota `deadline` y `per_try` (`per_try.min(deadline)`).
5. Tests: `progress_comments_on_429_then_fallback` (falso que da 429 y luego 200: el cuerpo contiene `: progreso` con `"estado":"429"` y luego `data:` normales) y `max_attempts_two_stops_chain`.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway progress 2>&1 | grep -c 'test result: ok'` → `1`
- `cd $R && ~/.cargo/bin/cargo test 2>&1 | grep -c 'test result: ok'` → igual que en T-0.1 (ningún test roto)
Hecho significa (sí/no): sin la cabecera, el comportamiento actual no cambia (tests antiguos verdes); con ella, los comentarios llegan antes del primer `data:`.
No hagas: cambiar la respuesta cuando no hay `X-JMD-Progress`; usar `event:` (los comentarios `: ` son invisibles para los SDK); eliminar `run`.

### T-3b.5 · Línea viva y Ctrl-C en jmd
Depende de: T-3b.4  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `jmd` pinta una línea viva con el progreso (`intentando laguna…`, `429, espero 20 s`, `cambio a nemotron`) y `Ctrl-C` cancela el turno en menos de 1 s.
Lee antes (rutas exactas): src/bin/jmd/client.rs (`chat_stream`, bucle de líneas) · src/bin/jmd/agent.rs (`run_turn`) · src/bin/jmd/main.rs (`chat_loop`)
Crea / modifica (rutas exactas, nada más): src/bin/jmd/client.rs · src/bin/jmd/agent.rs · src/bin/jmd/main.rs
Pasos:
1. `chat_stream`: enviar cabecera `X-JMD-Progress: 1` y, en el bucle, si la línea empieza por `: progreso `, parsear el JSON y llamar `on_progress(&Progreso)` (nuevo parámetro `on_progress: impl FnMut(&str)`); limpiar la línea viva (`\r\x1b[K`) al llegar el primer `data:`.
2. En `run_turn`, el cierre pinta `eprint!("\r\x1b[K{} {}", dim("…"), texto)`.
3. Ctrl-C: en `chat_loop`, envolver `ask(...)` en `tokio::select! { r = ask(...) => r, _ = tokio::signal::ctrl_c() => { eprintln!("turno cancelado"); s.history.truncate(mark); Ok(()) } }` (el `reqwest` se aborta al soltar el futuro).
4. En clase, `Session` toma `priority: speed` y manda `orchestrator.max_attempts: 2` y `deadline_s: 60` cuando `JMD_CLASE=1`.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test jmd_cli 2>&1 | grep -c 'test result: ok'` → `1`
- contra el gateway real con un modelo saturado a propósito: `JMD_CLASE=1 jmd chat -m clase "hola" 2>&1 | grep -c -E 'intentando|espero|cambio'` → mayor o igual a `1`
Hecho significa (sí/no): el alumno nunca ve la pantalla quieta más de 5 s; Ctrl-C vuelve al prompt sin salir de `jmd`.
No hagas: matar el proceso con Ctrl-C (solo el turno); dependencias nuevas; cambiar `/v1/chat/completions` sin la cabecera.

### T-3b.6 · Hook de tareas al LMS
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Cada vez que el agente llama `todo_write`, `jmd` replica la lista a `POST /api/v1/aula/tareas` si existe `JMD_LMS_HOOK`, y el LMS la guarda en memoria por alumno con su resumen MCP.
Lee antes (rutas exactas): src/bin/jmd/agent.rs (`execute`, rama `todo_write`; `mcp_summary`) · src/bin/jmd/sso.rs (`Tokens::load`, `lms_token`) · lms/api/internal/httpapi/aula_handlers.go
Crea / modifica (rutas exactas, nada más): src/bin/jmd/agent.rs · lms/api/internal/httpapi/aula_tareas.go · lms/api/internal/httpapi/aula_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. `agent.rs`: tras `self.todos = t`, si `std::env::var("JMD_LMS_HOOK")` está, `tokio::spawn` de un `reqwest::Client::post(hook).bearer_auth(Tokens::load().lms_token)` con cuerpo `{"tareas":[{"contenido":"…","estado":"pending|in_progress|completed|cancelled"}],"mcp":[{"nombre":"lms","estado":"listo","herramientas":6}]}`; errores ignorados con `tracing::debug`.
2. Go: `POST /api/v1/aula/tareas` guarda en `s.tareas map[userID]tareasAlumno` y publica `publishStaff(lesson activa, "tareas", {sub, n, en_curso})`; `GET /api/v1/aula/tareas` devuelve las propias; `GET /api/v1/aula/tareas/{sub}` (staff) las de un alumno.
3. En T-3.9 añadir a `tokens.json` nada más; la variable `JMD_LMS_HOOK=http://lms:8080/api/v1/aula/tareas` va en `Args` de `aula.go` (`-e`).
4. Test `TestAulaTareas`: POST con 3 tareas → GET devuelve 3; alumno B recibe 403 al pedir las de A.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestAulaTareas -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `cd $R && ~/.cargo/bin/cargo build --bin jmd 2>&1 | tail -1` → `Finished`
Hecho significa (sí/no): test verde y, en el contenedor, un turno con `todo_write` deja la lista en `GET /api/v1/aula/tareas`.
No hagas: bloquear el turno esperando al LMS; mandar el historial del chat; aceptar estados fuera de los cuatro.

### T-3b.7 · Panel de tareas y MCP junto a la terminal
Depende de: T-3b.6, T-3.7  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): En el panel alumno, lista de tareas con estados (igual que `render_todos`) y servidores MCP; en control, matriz alumno × tareas en vivo.
Lee antes (rutas exactas): src/bin/jmd/agent.rs (`render_todos`: símbolos y orden) · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-tareas.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx · lms/web/src/lib/api.ts (`aulaTareas`, `aulaTareasDe`)
Pasos:
1. `LiveTareas`: encabezado «Tareas 1/3», filas con icono `check` (completada), `play` (en curso), `circle` (pendiente), `x` (cancelada) y el texto; sección «MCP» con nombre, estado y número de herramientas.
2. Alumno: sondeo `api.aulaTareas()` cada 5 s mientras el panel está abierto.
3. Control: columna «Tareas» en la lista de presentes con `n` y la tarea en curso, alimentada por el evento `tareas`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-3b.7-tareas-1366x768-dark.png`
Hecho significa (sí/no): el instructor ve avanzar las tareas de un alumno sin recargar.
No hagas: WebSocket; emojis en los estados (usar iconos de `icon.tsx`).

### T-3b.8 · Prueba de aula con 5 alumnos
Depende de: T-3b.5, T-3b.7  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Sesión de 30 minutos con 5 personas usando solo `jmd` en el contenedor (tareas de varios pasos, una skill, un MCP, un modelo saturado a propósito) y encuesta de 3 preguntas.
Lee antes (rutas exactas): docs/PLAN_MODO_LIVE_SESION2.md (tarea 3b.5) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/pruebas-de-uso/SKILL.md
Crea / modifica (rutas exactas, nada más): docs/capturas-live/T-3b.8-prueba-aula.md
Pasos:
1. Guion de 4 tareas (plan con `todo_write`, `/skill piedra`, `jmd mcp` con el servidor `lms`, pregunta con el modelo saturado) y cronómetro.
2. Encuesta: «¿Supiste en todo momento qué hacía el agente?», «¿Hubo pantalla quieta de más de 5 s?», «¿Qué te faltó ver?»; respuestas en la hoja.
Verifica (comando exacto → salida esperada):
- `grep -c '^| ' $R/docs/capturas-live/T-3b.8-prueba-aula.md` → al menos `6` (5 filas más cabecera)
Hecho significa (sí/no): ningún cuelgue; 5 de 5 responden «sí» a la primera pregunta o hay un hallazgo anotado por cada «no».
No hagas: corregir código durante la prueba; omitir hallazgos incómodos.

### T-3b.9 · Refactor Agent: Confirmador y Emisor
Depende de: T-3b.1  ·  Turnos: 2  ·  Riesgo: alto
Objetivo (una frase): Separar en `Agent` la confirmación por `stdin` y la impresión por `println!` detrás de dos traits, sin cambiar lo que ve quien usa el REPL.
Lee antes (rutas exactas): src/bin/jmd/agent.rs (completo: `confirm`, `execute`, `run_turn`, `show_result`) · src/bin/jmd/main.rs (`ask`, `chat_loop`) · tests/jmd_cli.rs (`agent_runs_builtin_tools_and_stops_repeated_calls`)
Crea / modifica (rutas exactas, nada más): src/bin/jmd/agent.rs · src/bin/jmd/main.rs
Pasos:
1. `pub enum Evento { Texto(String), Herramienta { id: String, nombre: String, args: String, requiere_confirmacion: bool }, Resultado { id: String, ok: bool, texto: String }, Tareas(Vec<Todo>), Mcp(Vec<Value>), Uso { entrada: Option<u64>, salida: Option<u64>, modelo_real: String, proveedor: String, intentos: String }, Progreso(String), Fin { motivo: String }, Error(String) }`.
2. `pub trait Emisor: Send { fn emitir(&mut self, e: Evento); }` con `pub struct EmisorTerminal` que imprime exactamente lo que hoy imprimen `execute`, `show_result`, `render_todos` y la barra de T-3b.1.
3. `#[async_trait]`-free: `pub trait Confirmador: Send { fn confirmar(&mut self, grupo: &str, call: &ToolCall, que: &str) -> std::pin::Pin<Box<dyn Future<Output = bool> + Send + '_>>; }` con `ConfirmadorTerminal` (la lógica actual de `confirm`, incluida la regla `a = siempre`).
4. `Agent` guarda `Box<dyn Emisor>` y `Box<dyn Confirmador>`; `Agent::new(mcp)` usa los de terminal; `Agent::con(mcp, emisor, confirmador)` para el embed. `run_turn` emite `Evento::Texto` por cada trozo en vez de escribir a `stdout`.
5. Correr `tests/jmd_cli.rs` sin tocarlo: debe seguir verde.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test jmd_cli 2>&1 | grep -c 'test result: ok'` → `1`
- `cd $R && ~/.cargo/bin/cargo build --release --bin jmd 2>&1 | tail -1 && echo "/todos" | ./target/release/jmd chat 2>&1 | grep -c 'sin tareas'` → `1`
Hecho significa (sí/no): tests verdes y la salida del REPL es idéntica a la de antes en una sesión de prueba manual.
No hagas: cambiar `tests/jmd_cli.rs`; añadir `async-trait` u otra dependencia; cambiar el texto de los mensajes existentes.

### T-3b.10 · jmd serve --embed: esqueleto
Depende de: T-3b.9  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Comando `jmd serve --embed` que levanta un servidor axum en `127.0.0.1:7700` con `GET /salud` y `GET /estado`.
Lee antes (rutas exactas): src/bin/jmd/main.rs (`enum Cmd`, `run`) · src/api.rs (cómo se construye un `Router` axum y `axum::serve`) · Cargo.toml (axum 0.7 ya es dependencia del crate)
Crea / modifica (rutas exactas, nada más): src/bin/jmd/embed.rs · src/bin/jmd/main.rs (`mod embed;`, variante `Serve { #[arg(long)] embed: bool, #[arg(long, default_value_t = 7700)] port: u16 }` y su rama en `run`)
Pasos:
1. `embed.rs`: `pub struct Estado` compartido en `Arc<Mutex<…>>` con `Session` (de `main.rs`, hacerla `pub(crate)`), `ocupado: bool`, `turno_actual: Option<String>`, contadores de tokens y `costo_usd`.
2. `GET /salud` → `{"ok":true,"version":"<CARGO_PKG_VERSION>"}`.
3. `GET /estado` → `{"modelo":"auto","perfil_real":"","proveedor":"","modelo_real":"","contexto_pct":0,"tokens_turno":{"entrada":0,"salida":0},"tokens_sesion":{"entrada":0,"salida":0},"costo_usd":0,"skills":["piedra","plan-de-trabajo"],"mcp":[{"nombre":"lms","estado":"listo","herramientas":6}],"tareas":[],"ocupado":false,"version":"…"}`.
4. Escuchar solo en `127.0.0.1` salvo `--host 0.0.0.0` (necesario dentro del contenedor para que el LMS llegue por la red `aula_net`: el proxy de T-3b.13 entra por `curso-<alias>:7700`); imprimir `jmd embebido en http://<host>:7700` y quedarse hasta Ctrl-C.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo build --bin jmd 2>&1 | tail -1 && (./target/debug/jmd serve --embed --port 7701 & sleep 2; curl -s localhost:7701/salud; kill %1)` → `{"ok":true,"version":"…"}`
- `ps -o rss= -p $(pgrep -f 'jmd serve --embed' | head -1) 2>/dev/null | awk '{print ($1<25600)?"ok":"pesa"}'` (con el servidor arriba) → `ok`
Hecho significa (sí/no): `/salud` y `/estado` responden y el proceso usa menos de 25 MB en reposo.
No hagas: abrir otro puerto; servir UI HTML (la dibuja el LMS); dependencias nuevas.

### T-3b.11 · Embed: turno y eventos
Depende de: T-3b.10  ·  Turnos: 2  ·  Riesgo: alto
Objetivo (una frase): `POST /turno` arranca un turno del agente en segundo plano y `GET /eventos` lo transmite por SSE con los eventos de `Evento` serializados.
Lee antes (rutas exactas): src/bin/jmd/embed.rs · src/bin/jmd/agent.rs (`Evento`, `Emisor`, `run_turn`) · src/bin/jmd/main.rs (`ask`)
Crea / modifica (rutas exactas, nada más): src/bin/jmd/embed.rs · src/bin/jmd/agent.rs (solo si falta un `Evento`)
Pasos:
1. `POST /turno` cuerpo `{"prompt":"crea index.html con un contador en Preact","modelo":"auto","perfil":null,"estilo":"full"}` → `202 {"turno":"t-17"}`; `409 {"error":"ocupado","turno":"t-16"}` si hay uno en curso. Lanza `tokio::spawn(ask(...))` guardando el `JoinHandle` en `Estado`.
2. `EmisorCanal` implementa `Emisor` enviando a un `tokio::sync::broadcast::Sender<(String, Evento)>` (turno, evento).
3. `GET /eventos`: `text/event-stream` con `retry: 1000`; cada evento `event: <nombre>\ndata: <json>\n\n` con estos nombres y cuerpos: `texto {"turno","delta"}` · `herramienta {"turno","id","nombre","args","requiere_confirmacion"}` · `resultado {"turno","id","ok","texto"}` · `tareas {"turno","tareas":[{"contenido","estado"}]}` · `mcp {"servidores":[{"nombre","estado","herramientas"}]}` · `uso {"turno","entrada","salida","costo_usd","modelo_real","proveedor","intentos"}` · `progreso {"turno","mensaje"}` · `fin {"turno","motivo":"ok|cancelado|error","texto_final"}` · `error {"turno","mensaje"}`; `: ping` cada 15 s.
4. Al terminar `ask`, emitir `uso` (de `ChatMeta`) y `fin`, actualizar `Estado` (tokens, costo con `GET /v1/usage/{rid}` de T-3b.2) y poner `ocupado = false`.
Verifica (comando exacto → salida esperada):
- con el gateway local y el embed en 7701: `(curl -s -N -m 20 localhost:7701/eventos > /tmp/ev.txt &) ; sleep 1; curl -s -X POST localhost:7701/turno -H 'Content-Type: application/json' -d '{"prompt":"Responde solo: ok","modelo":"auto"}'; sleep 15; grep -c '^event: fin' /tmp/ev.txt` → `1`
- `grep -c '^event: texto' /tmp/ev.txt` → mayor o igual a `1`
Hecho significa (sí/no): un turno completo recorre `texto` → `uso` → `fin` por SSE y `/estado` refleja los tokens.
No hagas: ejecutar dos turnos a la vez; bloquear `POST /turno` hasta el final; WebSocket.

### T-3b.12 · Embed: confirmar, cancelar, skills
Depende de: T-3b.11  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `POST /confirmar`, `POST /cancelar` y `POST /skills/recargar` completan el contrato del embed, con una prueba de integración que recorre un turno con herramienta y tarea.
Lee antes (rutas exactas): src/bin/jmd/embed.rs · src/bin/jmd/agent.rs (`Confirmador`) · tests/jmd_cli.rs (`fake_chat`, `sse_tool_call`, `agent_runs_builtin_tools_and_stops_repeated_calls`)
Crea / modifica (rutas exactas, nada más): src/bin/jmd/embed.rs · tests/jmd_embed.rs
Pasos:
1. `ConfirmadorCanal`: al pedir confirmación emite `herramienta` con `requiere_confirmacion: true` y espera en un `oneshot` guardado en `Estado.pendientes[id]`; `POST /confirmar` `{"id":"call_…","respuesta":"si|no|siempre"}` → `{"ok":true}` (404 si el id no está pendiente); `siempre` añade el grupo a `trusted`.
2. `POST /cancelar` `{}` → `handle.abort()`, emite `fin {"motivo":"cancelado"}`, `ocupado=false`, responde `{"ok":true,"turno":"t-17"}` (o `{"ok":false}` si no había turno).
3. `POST /skills/recargar` → `skills::discover(cwd)` y `{"skills":["…"]}`.
4. `tests/jmd_embed.rs`: arranca `jmd serve --embed --port 0` (añadir soporte `--port 0` que imprime el puerto real en la primera línea) contra el `fake_chat` de `jmd_cli.rs` (copiar las funciones necesarias) que pide `shell echo hola`: el test lee `/eventos`, recibe `herramienta`, responde `si`, recibe `resultado` con `hola` y `fin`.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test jmd_embed 2>&1 | grep -c 'test result: ok'` → `1`
- `curl -s -X POST localhost:7701/cancelar -H 'Content-Type: application/json' -d '{}'` (sin turno) → `{"ok":false}`
Hecho significa (sí/no): la prueba de integración pasa y cancelar responde en menos de 1 s.
No hagas: ejecutar la herramienta sin confirmación cuando `requiere_confirmacion` es true; cambiar `tests/jmd_cli.rs`.

### T-3b.13 · Proxy Go al jmd embebido
Depende de: T-3b.12, T-3.4  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `GET|POST /api/v1/aula/jmd/{resto...}` reenvía al `curso-<alias>:7700` del propio alumno, con SSE pasante sin búfer y cabecera `X-JMD-Style` cuando piedra está activo.
Lee antes (rutas exactas): lms/api/internal/httpapi/aula_handlers.go · lms/api/internal/aula/aula.go (`Nombre`) · Go stdlib `net/http/httputil` (`ReverseProxy`, `FlushInterval`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/aula_proxy.go · lms/api/internal/httpapi/aula_test.go · lms/api/internal/httpapi/server.go · lms/api/internal/httpapi/aula_handlers.go (`aula iniciar` también lanza `jmd serve --embed --host 0.0.0.0 >> /trabajo/jmd.log 2>&1 &`)
Pasos:
1. `httputil.ReverseProxy` con `Director` que fija `URL.Scheme=http`, `URL.Host = aula.Nombre(p.ID)+":7700"`, `URL.Path = "/" + resto`; `FlushInterval = -1`; `Transport` con `ResponseHeaderTimeout: 10 s` y `DisableCompression: true`.
2. Lista blanca de `resto`: `salud`, `estado`, `turno`, `eventos`, `confirmar`, `cancelar`, `skills/recargar`; otro → 404.
3. Si `ia_alumno.piedra` (T-5.4) está activo, `Director` añade `X-JMD-Style: full`.
4. Actualiza `ultimo_uso`; 409 `sin_aula` si no hay contenedor.
5. Test `TestAulaProxyAislado`: con un servidor `httptest` como destino falso (inyectar `s.aulaDestino func(userID string) string`), A llama `/estado` y recibe el cuerpo del falso de A; B con el mismo path recibe el de B; path `otro` → 404.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestAulaProxyAislado -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s -N -m 3 localhost:8095/api/v1/aula/jmd/eventos -H "Authorization: Bearer $ALU" | head -1` → `retry: 1000`
Hecho significa (sí/no): dos alumnos no pueden verse el chat y el stream llega en menos de 200 ms.
No hagas: aceptar `sub` por parámetro (siempre el de la sesión); WebSocket; bufferizar.

### T-3b.14 · Panel Agente: historial en streaming
Depende de: T-3b.13  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Componente `LiveAgente` con caja de prompt, historial que se rellena por `texto`, barra inferior (contexto %, tokens del turno y sesión, costo, modelo activo) y estado «ocupado».
Lee antes (rutas exactas): lms/web/src/lib/live.ts · lms/web/src/components/live-alumno.tsx · lms/web/src/routes/studio/index.tsx (cajas y `studio-actions`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-agente.tsx · lms/web/src/lib/api.ts (`aulaJmdEstado`, `aulaJmdTurno`) · lms/web/src/lib/live.ts (`abrirEventosAgente`) · lms/web/src/components/live-alumno.tsx · lms/web/src/global.css
Pasos:
1. `abrirEventosAgente(on)` = `EventSource("/api/v1/aula/jmd/eventos")` con los nombres de T-3b.11.
2. Historial `.agente-hilo`: burbujas `usuario` y `agente`; `texto` concatena en la última burbuja del agente; `fin` cierra el turno; `error` muestra una tira `.studio-strip.bad`.
3. Barra `.agente-barra`: `contexto 3 % · turno 812↑ 240↓ · sesión 4120↑ 1330↓ · 0,0000 USD · laguna`; se actualiza con `uso` y `GET /api/v1/aula/jmd/estado` al abrir.
4. Enviar con `Enter` (Shift+Enter = salto); mientras `ocupado`, el botón pasa a «Cancelar» (T-3b.15).
5. Cada envío llama `api.liveEvento("agente", …)` (T-1.13).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build.types 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-3b.14-agente-1366x768-dark.png` con un turno respondido
Hecho significa (sí/no): el texto aparece por trozos y la barra cambia al terminar.
No hagas: llamar al gateway directo desde el navegador; WebSocket; `alert`.

### T-3b.15 · Panel Agente: herramientas y cancelar
Depende de: T-3b.14  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Bloques de herramienta con Sí / No / Siempre, resultado plegable, botón Cancelar visible mientras responde y línea viva de reintentos.
Lee antes (rutas exactas): lms/web/src/components/live-agente.tsx · lms/web/src/lib/api.ts
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-agente.tsx · lms/web/src/lib/api.ts (`aulaJmdConfirmar`, `aulaJmdCancelar`) · lms/web/src/global.css
Pasos:
1. Evento `herramienta` → bloque `.agente-tool` con nombre, `args` en `<code>` recortado a 300 caracteres y, si `requiere_confirmacion`, tres botones «Sí», «No», «Siempre» (`aulaJmdConfirmar(id, "si|no|siempre")`); deshabilitar tras elegir.
2. Evento `resultado` → dentro del mismo bloque, `<details>` con el texto y marca `ok`/`error`.
3. Evento `progreso` → línea `.agente-vivo` con el mensaje; desaparece con el primer `texto`.
4. «Cancelar» → `aulaJmdCancelar()`; al `fin` con `cancelado`, burbuja gris «Turno cancelado».
5. Si pasan 5 s sin ningún evento durante un turno, mostrar «Esperando al modelo…» (nunca pantalla quieta).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-3b.15-agente-herramienta-1366x768-light.png` con un bloque pendiente de confirmación
Hecho significa (sí/no): un turno con `shell` muestra el bloque, «Sí» lo ejecuta y el resultado aparece; «Cancelar» corta en menos de 1 s.
No hagas: autoconfirmar; ocultar los argumentos de la herramienta; `confirm()` nativo.

### T-3b.16 · Panel Agente: tareas, MCP, selector
Depende de: T-3b.15, T-5.5  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Panel de tareas y MCP dentro del Agente, selector de modelo con la lista blanca, atajos `/skill` y `/proto`, y la caja de prompt como chat sencillo para quien no quiera la terminal.
Lee antes (rutas exactas): lms/web/src/components/live-agente.tsx · lms/web/src/components/live-tareas.tsx · lms/web/src/lib/api.ts (`miIA`, `modelosPermitidos` de T-5.4/T-5.5)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-agente.tsx
Pasos:
1. Reutilizar `LiveTareas` con los eventos `tareas` y `mcp` del embed.
2. `<select aria-label="Modelo">` con `api.modelosPermitidos()` (id, nombre, precio por millón); al cambiar, `api.miIA({modelo})` y el siguiente `POST /turno` lleva `"modelo"`.
3. Si el prompt empieza por `/skill ` o `/proto `, enviarlo tal cual (el agente lo interpreta); mostrar chip con el atajo detectado.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-3b.16-agente-completo-1920x1080-dark.png`
Hecho significa (sí/no): cambiar el modelo en el selector cambia `modelo_real` en la barra tras el siguiente turno.
No hagas: listar modelos fuera de la lista blanca; cambiar el modelo global del gateway.

### T-3b.17 · Puente agente-visor-terminal y réplica al instructor
Depende de: T-3b.16, T-4.1  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Cuando el agente escribe en `/trabajo` el visor se recarga; «Abrir en terminal» pega el comando propuesto; «Lo logré» puede adjuntar el último turno; el control recibe resumen de cada alumno cada 5 s y «ver el chat» en solo lectura si lo permitió.
Lee antes (rutas exactas): lms/web/src/components/live-agente.tsx · lms/web/src/components/live-visor.tsx (T-4.4) · lms/web/src/components/terminal-aula.tsx · lms/api/internal/httpapi/aula_proxy.go
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-agente.tsx · lms/web/src/components/live-visor.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx · lms/api/internal/httpapi/aula_proxy.go (`GET /api/v1/aula/jmd/{sub}/eventos` staff, solo si `permisos.agente`) · lms/api/internal/httpapi/aula_tareas.go (resumen `publishStaff("agente", {sub, modelo_real, tokens_sesion})` cada 5 s)
Pasos:
1. Evento `resultado` de `write_file` → `live-visor` fuerza recarga (señal compartida `visorVersion`).
2. En bloques `shell` no ejecutados, botón «Abrir en terminal» que escribe el comando en la pestaña activa (`term.paste`).
3. «Lo logré» (T-6.2) acepta `evidencia.turno` = texto final del último turno (hasta 2000 caracteres).
4. Control: columna «Agente» con modelo y tokens; botón «Ver chat» abre `LiveAgente` en modo lectura conectado al stream del alumno (deshabilitado sin permiso).
Verifica (comando exacto → salida esperada):
- pedir «crea index.html con un contador en Preact» → `curl -s -o /dev/null -w "%{http_code}\n" localhost:8095/vista/<sub>/index.html -H "Authorization: Bearer $ALU"` → `200` sin tocar la terminal
- captura `docs/capturas-live/T-3b.17-control-agente-1920x1080-dark.png`
Hecho significa (sí/no): el visor muestra el contador y el instructor ve el chat solo con permiso.
No hagas: permitir al instructor enviar turnos al chat del alumno; replicar el historial completo cada 5 s (solo el resumen).

### Fase 4 · Visor de proyectos (servido desde el servidor)

### T-4.1 · Visor estático /vista/{sub} desde /trabajo
Depende de: T-3.3  ·  Turnos: 2  ·  Riesgo: alto
Objetivo (una frase): `GET /vista/{sub}/{ruta...}` sirve el volumen `/trabajo` del contenedor del alumno como estático desde el LMS, con validación de `sub`, lista de MIME, tamaño máximo y una ruta de versión para el sondeo.
Lee antes (rutas exactas): lms/api/internal/httpapi/course_handlers.go (`courseFile`) · lms/api/internal/content/load.go (`safeRel`) · lms/api/internal/aula/aula.go · lms/api/internal/httpapi/server.go (`secureHeaders`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/vista.go · lms/api/internal/httpapi/vista_test.go · lms/api/internal/httpapi/server.go · lms/api/internal/aula/aula.go (`func (a *Aula) Leer(ctx, nombre, ruta string, max int64) ([]byte, string, error)` con `docker exec <nombre> sh -c 'test -f "$1" && cat "$1"' -- /trabajo/<ruta>` y `func (a *Aula) Version(ctx, nombre string) (string, error)` con `find /trabajo -type f -newer … | wc -l` o `ls -lR --time-style=+%s /trabajo | md5sum`)
Pasos:
1. Reglas de seguridad, en este orden: (a) `sub` debe ser igual a `p.ID` o `p.Staff()`; si no, 403 `forbidden`; (b) `ruta` pasa por `path.Clean`, no empieza por `..`, no contiene `\x00` ni `..`, y `safeRel(ruta)`; si no, 400; (c) ruta vacía o terminada en `/` → `index.html`; (d) extensión en la lista blanca: `.html .htm .css .js .mjs .json .svg .png .jpg .jpeg .gif .webp .ico .txt .md .woff .woff2 .map .wasm`; otra → 415; (e) tamaño máximo 5 MB (`max` en `Leer`); mayor → 413; (f) `Content-Type` por extensión (tabla fija, no por `DetectContentType`), `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `Content-Security-Policy: default-src 'self' https://esm.sh; script-src 'self' 'unsafe-inline' https://esm.sh; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'`.
2. `X-Frame-Options`: para `/vista/` poner `SAMEORIGIN` (el iframe del LIVE es del mismo origen).
3. `GET /api/v1/vista/version` → `{"version":"<hash>","t":"…"}` del propio alumno (para el sondeo de 2 s de T-4.4); `GET /api/v1/vista/{sub}/version` para staff.
4. `ultimo_uso` del aula se actualiza en cada petición.
5. Tests con motor falso en memoria (`Leer` devuelve archivos de un `map`): `TestVistaOtroSub403`, `TestVistaTraversal400` (`../etc/passwd`), `TestVistaMimeNoPermitido415` (`.exe`), `TestVistaSirveIndex` (`/vista/<sub>/` → `text/html` y cuerpo).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestVista -v 2>&1 | grep -c '^--- PASS'` → `4`
- con contenedor real: `docker exec curso-<alias> sh -c 'echo "<h1>hola</h1>" > /trabajo/index.html' && curl -s localhost:8095/vista/<sub>/ -H "Authorization: Bearer $ALU"` → `<h1>hola</h1>`
Hecho significa (sí/no): los cuatro tests pasan; otro alumno recibe 403; un `index.html` con React por `importmap` desde esm.sh se ve en el navegador.
No hagas: montar el volumen en el proceso del LMS; `http.FileServer` sobre rutas del host; servir `.php` ni `.py` como texto ejecutable; cachear.

### T-4.2 · Relé /vista/{sub}/api al asistente del contenedor
Depende de: T-4.1, T-3.4  ·  Turnos: 1  ·  Riesgo: alto
Objetivo (una frase): `GET|POST /vista/{sub}/api/{resto...}` se reenvía a `http://curso-<alias>:8766/api/{resto}` con 10 MB y 180 s de tope, sin WebSocket, para que el frontend del osito servido como estático hable con su backend del contenedor.
Lee antes (rutas exactas): lms/api/internal/httpapi/vista.go · lms/api/internal/httpapi/aula_proxy.go (T-3b.13, mismo patrón) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/backend/app.py (rutas `/api/chat`, `/api/stt`, `/api/imagen`, `/api/salud`, `/api/estado`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/vista_api.go · lms/api/internal/httpapi/vista_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. Misma validación de `sub` que T-4.1 (el instructor puede leer `GET`, nunca `POST`).
2. `httputil.ReverseProxy` a `curso-<alias>:8766`, `Transport.ResponseHeaderTimeout = 180 s`, `http.MaxBytesReader(w, r.Body, 10<<20)` en la entrada y `io.LimitReader` 10 MB en `ModifyResponse`; `FlushInterval = -1`.
3. Lista blanca de `resto`: `chat`, `stt`, `imagen`, `salud`, `estado`, `imagenes/…` (archivos generados); otro → 404. Cabecera `Upgrade` → 400 (sin WebSocket).
4. Si el contenedor no responde (connection refused) → 503 `asistente_apagado` con mensaje «Arranca tu asistente desde la terminal: aula iniciar».
5. Tests: `TestVistaApiReenvia` (falso en `httptest` responde `{"texto":"hola"}` a `POST /api/chat`), `TestVistaApiOtroSubPost403`, `TestVistaApiUpgrade400`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestVistaApi -v 2>&1 | grep -c '^--- PASS'` → `3`
- con el asistente arrancado: `curl -s -X POST localhost:8095/vista/<sub>/api/chat -H "Authorization: Bearer $ALU" -H 'Content-Type: application/json' -d '{"mensaje":"hola","historial":[]}' | jq -r .fuente` → `gateway` o `faq`
- en el EC2: `ps aux | grep -c -E 'whisper|diffusers|torch' | awk '{print ($1<=1)?"sin modelos":"HAY MODELOS"}'` → `sin modelos`
Hecho significa (sí/no): el chat del alumno responde desde otro navegador y el servidor no tiene procesos de modelos.
No hagas: reenviar a otro host que el contenedor del alumno; permitir WebSocket; subir los topes.

### T-4.3 · Plantillas aula nuevo sin bundler
Depende de: T-3.2  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): `aula nuevo html|react-esm|vue-esm|preact-htm|php|python-static` crea en `/trabajo` un proyecto que corre en el navegador con `importmap` o con un servidor mínimo que se apaga solo.
Lee antes (rutas exactas): lms/aula/bin/aula · docs/PLAN_MODO_LIVE_SESION2.md (fila «React, Vue, Preact en clase»)
Crea / modifica (rutas exactas, nada más): lms/aula/bin/aula · lms/aula/plantillas/<nombre>/index.html (seis carpetas) · lms/aula/README.md
Pasos:
1. `react-esm`: `<script type="importmap">{"imports":{"react":"https://esm.sh/react@18.3.1","react-dom/client":"https://esm.sh/react-dom@18.3.1/client","htm":"https://esm.sh/htm@3.1.1"}}</script>` y un contador con `htm`; `vue-esm`: `https://esm.sh/vue@3.5.13/dist/vue.esm-browser.js`; `preact-htm`: `https://esm.sh/htm@3.1.1/preact/standalone`; `html`: página plana; `php`: `index.php` + comando `php -S 0.0.0.0:8767` (solo si `php` está en la imagen; si no, el script avisa); `python-static`: `python3 -m http.server 8767`.
2. `aula nuevo <plantilla> [carpeta]` copia a `/trabajo/<carpeta>` (por defecto el nombre de la plantilla) sin sobrescribir si existe.
3. Los servidores `php`/`python` se lanzan con `timeout 900` para apagarse solos.
Verifica (comando exacto → salida esperada):
- `docker run --rm --platform linux/amd64 jmd/aula:latest sh -c 'aula nuevo react-esm && test -f /trabajo/react-esm/index.html && echo LISTO'` → `LISTO`
- `ls $R/lms/aula/plantillas | wc -l` → `6`
Hecho significa (sí/no): las seis plantillas se ven en el visor (`/vista/<sub>/react-esm/`) en menos de 10 s y el contenedor no pasa de 40 MB con una abierta.
No hagas: `npm`; CDN distinto de esm.sh; sobrescribir trabajo del alumno.

### T-4.4 · Visor UI con sondeo
Depende de: T-4.1, T-1.8  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Componente `LiveVisor` con iframe `sandbox`, barra de URL, recargar, abrir en pestaña, tamaños móvil/tablet/escritorio y recarga automática cuando cambia la versión (sondeo cada 2 s).
Lee antes (rutas exactas): lms/web/src/routes/studio/index.tsx (iframe `studio-frame` y `studio-seg`) · lms/web/src/components/live-alumno.tsx · lms/web/src/lib/api.ts
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-visor.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/lib/api.ts (`vistaVersion`) · lms/web/src/global.css
Pasos:
1. `<iframe class="visor-frame" sandbox="allow-scripts allow-same-origin allow-forms" title="Visor" src="/vista/<sub>/<ruta>">`; barra con `<input>` de ruta (relativa a `/vista/<sub>/`), botones recargar y «Abrir en pestaña» (`target=_blank rel=noopener`).
2. Tamaños: `role="radiogroup"` con 390, 820 y 100 % de ancho (clase `.visor-movil|.visor-tablet|.visor-escritorio`).
3. Sondeo: `setInterval` 2 s a `api.vistaVersion()`; si cambia, recargar el iframe; parar el sondeo cuando el panel está cerrado o la pestaña oculta (`document.hidden`).
4. Escuchar `message` del iframe: `{tipo:"evidencia", tipo_evidencia:"microfono"|"flyer"}` → `api.liveEvidencia(lesson, escena, tipo)` (ruta de T-2.13); `{tipo:"consola", ...}` lo consume T-4.6.
5. Cada recarga manual llama `api.liveEvento("visor", ruta)`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build.types 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-4.4-visor-1366x768-dark.png` en tamaño móvil
Hecho significa (sí/no): guardar `index.html` desde la terminal se refleja en el visor en menos de 3 s sin tocar nada.
No hagas: `allow-top-navigation`; sondeo menor de 2 s; WebSocket.

### T-4.5 · Captura de evidencia del visor
Depende de: T-4.4, T-6.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): «Capturar para Lo logré» guarda como evidencia el `index.html` actual (y la ruta mostrada) y el instructor la ve renderizada en su panel.
Lee antes (rutas exactas): lms/web/src/components/live-visor.tsx · lms/api/internal/httpapi/course_handlers.go (`setProgress` con `evidencia`, T-6.1) · lms/web/src/components/live-control.tsx
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-visor.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx · lms/api/internal/httpapi/live_handlers.go (`GET /api/v1/live/{lesson}/evidencias/{sub}` staff → lista de evidencias con `html` recortado a 200 KB)
Pasos:
1. Botón «Capturar» en el visor: `fetch("/vista/<sub>/" + ruta)` como texto (máximo 200 KB; si pesa más, guardar solo la ruta) y guardarlo en el estado `evidenciaPendiente = {tipo:"captura", url, html}`.
2. «Lo logré» (T-6.2) envía esa evidencia en el cuerpo exacto de T-6.1.
3. Control: en la fila del alumno, botón «Evidencias» que abre un panel con cada evidencia: `captura` se muestra en `<iframe sandbox="allow-scripts" srcdoc={html}>`, `comando`/`turno` en `<pre>`.
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/live/pa-02/evidencias/<sub> -H "Authorization: Bearer $TOK" | jq '.[0].tipo'` → `"captura"` (tras un «Lo logré» con captura)
- captura `docs/capturas-live/T-4.5-evidencia-instructor-1920x1080-light.png`
Hecho significa (sí/no): la evidencia se ve renderizada en la vista del instructor.
No hagas: librerías de screenshot (html2canvas); guardar más de 200 KB por evidencia; `allow-same-origin` en el `srcdoc` del instructor.

### T-4.6 · Consola del visor
Depende de: T-4.1, T-4.4  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Los errores de la página del alumno aparecen en un panel con archivo y línea, inyectando un script de 15 líneas solo en respuestas `text/html` de `/vista/`.
Lee antes (rutas exactas): lms/api/internal/httpapi/vista.go · lms/web/src/components/live-visor.tsx
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/vista.go · lms/api/internal/httpapi/vista_test.go · lms/web/src/components/live-visor.tsx · lms/web/src/global.css
Pasos:
1. En `vista.go`, si el `Content-Type` es `text/html`, insertar antes de `</head>` (o al inicio si no hay) `<script>window.addEventListener("error",e=>parent.postMessage({tipo:"consola",nivel:"error",mensaje:String(e.message),archivo:e.filename,linea:e.lineno},"*"));window.addEventListener("unhandledrejection",e=>parent.postMessage({tipo:"consola",nivel:"error",mensaje:String(e.reason)},"*"));</script>` (constante `scriptConsola`).
2. Front: panel `.visor-consola` plegable con las entradas (nivel, mensaje, `archivo:linea`), botón limpiar; cada error llama `api.liveEvento("error", mensaje)`.
3. Test `TestVistaInyectaConsola` (`index.html` con `</head>` sale con el script una vez; `.js` no se toca).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestVistaInyectaConsola -v 2>&1 | tail -2` → `--- PASS` y `ok`
- captura `docs/capturas-live/T-4.6-consola-1366x768-dark.png` con un `throw new Error("prueba")` en `index.html`
Hecho significa (sí/no): el `throw` aparece con archivo y línea en el panel.
No hagas: inyectar en `application/json` ni `.js`; mandar el contenido de la página al servidor.

### Fase 5 · IA por alumno, modelos, consumo y proveedores remotos

### T-5.1 · Ajustes ia.* aplicados al gateway
Depende de: T-0.3  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Ampliar el panel «IA» en el backend con cuotas, lista blanca, presupuesto y token admin del gateway, y aplicar las cuotas en el gateway por `PUT /admin/api/config` sin reiniciar.
Lee antes (rutas exactas): lms/api/internal/httpapi/llm_settings.go (claves `llm.*`, `llmConfig`, `adminLLMPut`) · src/api.rs (`get_config`, `put_config`) · src/config.rs (`AuthCfg`) · lms/api/internal/httpapi/api_test.go (`TestLLMSettings`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/ia_settings.go · lms/api/internal/httpapi/ia_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. Claves nuevas en `settings`: `ia.admin_token` (nunca se devuelve), `ia.cuota_alumno_req` (300), `ia.cuota_alumno_tok` (0), `ia.cuota_cohorte_req` (0), `ia.cuota_cohorte_tok` (0), `ia.modelos` (JSON `[{"id":"deepseek-flash","nombre":"DeepSeek V4.1 Flash","precio_in":0.05,"precio_out":0.3,"gratis":false}]`), `ia.proveedores_imagen` (JSON igual), `ia.presupuesto_usd` (10), `ia.umbral_insignia` (6).
2. `GET /api/v1/admin/ia` (admin) → todos los valores salvo el token (`admin_token_set: bool`); `PUT /api/v1/admin/ia` con los mismos campos (token opcional, vacío = conservar).
3. Tras guardar: `GET <gateway>/admin/api/config` con `Authorization: Bearer <ia.admin_token>`, modificar `auth.per_user` y `auth.per_cohort` con las cuotas y `PUT` el resultado; la URL base del gateway se deriva de `llm.url` quitando `/v1/chat/completions`. Si el gateway responde distinto de 200, el PUT del LMS guarda igual y devuelve `{"gateway_aplicado":false,"detalle":"…"}`.
4. Test `TestIAConfigAplicaGateway` con un `httptest.Server` que simula `/admin/api/config` y verifica el `per_user.requests_per_day` recibido.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestIAConfig -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s localhost:8095/api/v1/admin/ia -H "Authorization: Bearer $TOK" | jq -c '{admin_token_set, umbral_insignia}'` → `{"admin_token_set":false,"umbral_insignia":6}`
Hecho significa (sí/no): guardar cuotas cambia `auth.per_user` en el gateway sin reiniciarlo.
No hagas: devolver el token admin; tocar las claves `llm.*` existentes; `route:cache` o equivalentes.

### T-5.2 · Panel IA ampliado (UI)
Depende de: T-5.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Añadir a `ia-config.tsx` los campos exactos: token admin del gateway, cuota por alumno (peticiones y tokens por día), cuota por cohorte, lista blanca de modelos de chat con precio, proveedores de imagen, presupuesto de la clase y umbral de la insignia.
Lee antes (rutas exactas): lms/web/src/components/ia-config.tsx (estructura `St`, `guardar`, clases `ia-fields`) · lms/web/src/lib/api.ts
Crea / modifica (rutas exactas, nada más): lms/web/src/components/ia-config.tsx · lms/web/src/lib/api.ts (`iaConfig`, `saveIaConfig`, `interface IaConfig`) · lms/web/src/global.css
Pasos:
1. Segunda tarjeta «Clase en vivo» debajo de la actual con: `ia-admin-token` (password, placeholder «Guardado» si `admin_token_set`), `ia-cuota-req` y `ia-cuota-tok` (number), `ia-cohorte-req` y `ia-cohorte-tok`, `ia-presupuesto` (number, USD), `ia-umbral` (number 1-9).
2. Tabla editable «Modelos permitidos» (id, nombre, precio entrada, precio salida, gratis sí/no, botón quitar, fila vacía para añadir) y otra «Proveedores de imagen» (id, nombre, precio por imagen).
3. Guardar → `api.saveIaConfig`; tira `ok` con «Aplicado en el gateway» o `warn` con el detalle si `gateway_aplicado` es falso.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build.types 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-5.2-panel-ia-1366x768-light.png`
Hecho significa (sí/no): cambiar la cuota y guardar muestra «Aplicado en el gateway».
No hagas: mostrar el token admin guardado; `alert`.

### T-5.3 · Tokens personales sin realm (gateway)
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `POST /admin/api/tokens` emite un token personal `jg_…` para un `sub` dado sin necesitar Keycloak, con cuotas por alumno aplicadas igual que a los tokens del realm.
Lee antes (rutas exactas): src/api.rs (`auth_exchange`, `admin_tokens`, `gateway_auth`, `check_quota`) · src/telemetry.rs (`token_insert`, `token_lookup`) · src/auth.rs (`Principal`, `new_personal_token`)
Crea / modifica (rutas exactas, nada más): src/api.rs · tests/gateway.rs
Pasos:
1. Ruta `.route("/admin/api/tokens", get(admin_tokens).post(admin_token_create))`; cuerpo `{"sub":"<id>","name":"Ana","cohorts":["cohorte-2026-2"],"roles":["student"],"label":"aula pa-02","days":2}` → `201 {"token":"jg_…","expires_at":…,"sub":"<id>"}`; 400 si falta `sub`.
2. Comprobar en `gateway_auth` que los `jg_` se aceptan con `auth.issuer` vacío (hoy la rama `TOKEN_PREFIX` va antes de `cfg.auth.enabled()`: confirmar leyendo, no cambiar si ya es así) y que `check_quota` se aplica con `per_user` aunque `issuer` esté vacío (si `Usage::check` depende de `enabled()`, quitar esa dependencia solo para `per_user`).
3. Test `admin_can_mint_personal_token_without_realm`: crear token, usarlo en `/v1/chat/completions` (200), `per_user.requests_per_day = 1` → segunda petición 429.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway admin_can_mint 2>&1 | grep -c 'test result: ok'` → `1`
- `curl -s -X POST localhost:4000/admin/api/tokens -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"sub":"prueba","name":"Prueba","days":1}' | jq -r '.token[0:3]'` → `jg_`
Hecho significa (sí/no): test verde y el token funciona contra `/v1` con cuota.
No hagas: devolver tokens existentes; imprimir el token en logs; cambiar `auth_exchange`.

### T-5.4 · Mi IA (Go)
Depende de: T-5.3, T-5.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Tabla `ia_alumno` y rutas `GET/PUT /api/v1/mi-ia`, `POST /api/v1/mi-ia/token` que guardan modelo, proveedor de imagen, piedra, clave propia opcional y el token personal del gateway.
Lee antes (rutas exactas): lms/api/internal/store/store.go · lms/api/internal/httpapi/ia_settings.go · src/api.rs (`admin_token_create`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/store/store.go · lms/api/internal/httpapi/mi_ia.go · lms/api/internal/httpapi/ia_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. `CREATE TABLE IF NOT EXISTS ia_alumno (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, modelo TEXT NOT NULL DEFAULT '', proveedor_imagen TEXT NOT NULL DEFAULT '', piedra INTEGER NOT NULL DEFAULT 0, clave_propia TEXT NOT NULL DEFAULT '', token_gateway TEXT NOT NULL DEFAULT '', token_expira TEXT, actualizado_en TEXT NOT NULL);` con `IAAlumno(ctx, userID)` y `UpsertIAAlumno`.
2. `GET /api/v1/mi-ia` → `{"modelo":"deepseek-flash","proveedor_imagen":"siliconflow-flux","piedra":false,"clave_propia_set":false,"token_set":true,"token_expira":"…","modelos":[…lista blanca con precios…],"proveedores_imagen":[…]}`.
3. `PUT /api/v1/mi-ia` cuerpo `{"modelo":"…","proveedor_imagen":"…","clave_propia":"…"}`: 400 si el modelo no está en `ia.modelos`; clave vacía conserva.
4. `POST /api/v1/mi-ia/token` → llama `POST <gateway>/admin/api/tokens` con `sub = p.ID`, `name`, `cohorts`, `days: 2`; guarda el token; devuelve `{"token_set":true,"token_expira":"…"}` (el token nunca vuelve al navegador; solo va al contenedor por T-3.9). `TokenPersonal(ctx, userID) (string, error)` para uso interno (T-3.9).
5. Tests `TestMiIAModeloFueraDeLista400` y `TestMiIATokenConGatewayFalso`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestMiIA -v 2>&1 | grep -c '^--- PASS'` → `2`
Hecho significa (sí/no): tests verdes y `PUT` con un modelo fuera de la lista da 400.
No hagas: devolver `token_gateway` ni `clave_propia` en el `GET`; aceptar modelos fuera de la lista.

### T-5.5 · Mi IA (UI)
Depende de: T-5.4  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Panel «Mi IA» en el LIVE (y en `/studio/`) con selector de modelo con precio, selector de proveedor de imagen, token regenerable, clave propia opcional y consumo de hoy.
Lee antes (rutas exactas): lms/web/src/components/ia-config.tsx (patrón de formulario) · lms/web/src/components/live-alumno.tsx · lms/web/src/lib/api.ts
Crea / modifica (rutas exactas, nada más): lms/web/src/components/mi-ia.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/routes/studio/index.tsx (tarjeta `<MiIA>`) · lms/web/src/lib/api.ts (`miIA`, `saveMiIA`, `miIAToken`, `modelosPermitidos`)
Pasos:
1. `<select id="mi-ia-modelo">` con opciones `nombre · gratis` o `nombre · 0,05 / 0,30 USD por millón`; `<select id="mi-ia-imagen">`; botón «Regenerar token» (`api.miIAToken`) con la fecha de expiración; campo clave propia (password) con texto «Opcional: gasta tu propia cuenta de OpenRouter»; línea «Hoy: N peticiones, M tokens» de `GET /api/v1/mi-uso` (T-5.7; hasta entonces oculta).
2. Al cambiar modelo o proveedor, guardar al momento y toast «Guardado».
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-5.5-mi-ia-1366x768-dark.png`
Hecho significa (sí/no): cambiar el modelo cambia `modelo` en `GET /api/v1/mi-ia` y el siguiente turno del agente lo usa.
No hagas: mostrar el token; `alert`.

### T-5.6 · Uso por sub con serie (gateway)
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `GET /admin/api/usage?sub=<id>&serie=60` devuelve el uso de hoy de ese `sub` y una serie por minuto de los últimos 60 minutos.
Lee antes (rutas exactas): src/api.rs (`admin_usage`) · src/telemetry.rs (`usage_today`, SQL de `calls`) · src/auth.rs (`Usage::remaining`)
Crea / modifica (rutas exactas, nada más): src/telemetry.rs · src/api.rs · tests/gateway.rs
Pasos:
1. `telemetry.rs`: `pub fn usage_of_sub(&self, sub: &str, since: f64) -> Value` → `{"requests","tokens_in","tokens_out","cost_usd"}` y `pub fn series_of_sub(&self, sub: &str, minutes: u32) -> Vec<Value>` → `[{"minute":"2026-10-15T19:00Z","tokens_in","tokens_out","requests"}]` (agrupar por `CAST(ts/60 AS INTEGER)`), rellenando minutos vacíos con ceros.
2. `admin_usage`: si hay `?sub=`, responder `{"sub","today":{…},"quota":e.usage.remaining(...)["user"],"series":[…]}`; sin `sub`, lo de hoy.
3. Test `admin_usage_by_sub_with_series`.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway admin_usage_by_sub 2>&1 | grep -c 'test result: ok'` → `1`
- `curl -s "localhost:4000/admin/api/usage?sub=prueba&serie=60" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.series | length'` → `60`
Hecho significa (sí/no): test verde y la serie trae 60 puntos.
No hagas: devolver emails; cambiar la respuesta sin `?sub=`.

### T-5.7 · GET /api/v1/mi-uso
Depende de: T-5.6, T-3.10  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): El LMS consulta el gateway por `sub` y devuelve al alumno su uso de hoy, porcentaje de cuota, marcas de piedra y RTK y la serie de 60 minutos.
Lee antes (rutas exactas): lms/api/internal/httpapi/ia_settings.go (`ia.admin_token`) · lms/api/internal/store/store.go (`Marcas`) · lms/api/internal/httpapi/llm_settings.go (patrón de `probarLLM` con timeout)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/mi_uso.go · lms/api/internal/httpapi/ia_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. `GET /api/v1/mi-uso` → `{"sub":"…","hoy":{"peticiones":12,"tokens_entrada":4000,"tokens_salida":1200,"costo_usd":0},"cuota":{"peticiones_dia":300,"pct":4},"marcas":[{"tipo":"piedra","t":"…"}],"serie":[{"t":"…","entrada":120,"salida":40,"peticiones":2}]}`; timeout 5 s al gateway; si falla, 503 `gateway_no_responde`.
2. `GET /api/v1/admin/mi-uso/{sub}` (staff) con el mismo cuerpo para otro alumno.
3. Caché en memoria de 5 s por `sub` (para que E05 con 10 alumnos no golpee el gateway cada vez).
4. Test `TestMiUsoConGatewayFalso` (servidor `httptest` que responde a `/admin/api/usage`).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestMiUso -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s localhost:8095/api/v1/mi-uso -H "Authorization: Bearer $ALU" | jq -c '{pct: .cuota.pct, n: (.serie|length)}'` → `{"pct":<número>,"n":60}`
Hecho significa (sí/no): la cifra coincide con el Panel del gateway con diferencia menor al 2 %.
No hagas: exponer `ia.admin_token`; llamar al gateway más de una vez cada 5 s por alumno.

### T-5.8 · Cuota extra por alumno
Depende de: T-5.6  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): El gateway admite `auth.users: {<sub>: {requests_per_day, tokens_per_day}}` y el LMS expone `POST /api/v1/admin/ia/cuota-extra` «dar 20 % más».
Lee antes (rutas exactas): src/config.rs (`AuthCfg`, `cohort_quota`) · src/auth.rs (`Usage::check`, línea `let scopes = [("user", …, cfg.per_user.clone())`) · lms/api/internal/httpapi/ia_settings.go
Crea / modifica (rutas exactas, nada más): src/config.rs · src/auth.rs · tests/gateway.rs · lms/api/internal/httpapi/ia_settings.go · lms/api/internal/httpapi/ia_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. `AuthCfg`: `#[serde(default, skip_serializing_if = "BTreeMap::is_empty")] pub users: BTreeMap<String, UserQuota>` y `pub fn user_quota(&self, sub) -> UserQuota` (la del mapa o `per_user`); usar `user_quota` en `Usage::check` y `remaining`.
2. Test Rust `per_user_override_by_sub`.
3. Go: `POST /api/v1/admin/ia/cuota-extra` `{"sub":"…","pct":20}` → lee config del gateway, pone `auth.users[sub] = per_user * 1.2` (redondeo hacia arriba), `PUT` y responde `{"sub","requests_per_day":360}`.
4. Test Go `TestCuotaExtra` con gateway falso.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway per_user_override 2>&1 | grep -c 'test result: ok'` → `1`
- `cd $R/lms/api && go test ./internal/httpapi -run TestCuotaExtra -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): ambos tests verdes y el botón de T-5.9 amplía la cuota en el gateway.
No hagas: bajar cuotas con esta ruta; `pct` fuera de 1..100.

### T-5.9 · Vista instructor de consumo
Depende de: T-5.7, T-5.8  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Tabla de consumo por alumno en vivo en el control, ámbar al 80 % de cuota, rojo al 100 %, con botón «dar 20 % más».
Lee antes (rutas exactas): lms/web/src/components/live-control.tsx · lms/web/src/lib/api.ts
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-consumo.tsx · lms/web/src/components/live-control.tsx · lms/web/src/lib/api.ts (`miUsoDe`, `cuotaExtra`)
Pasos:
1. Pestaña «Consumo» en control: por presente, `api.miUsoDe(sub)` cada 10 s; columnas nombre, peticiones, tokens, costo, `%` con `Bar`, clase `.warn` ≥ 80, `.bad` ≥ 100, botón «+20 %» (`api.cuotaExtra(sub, 20)`), toast con la nueva cuota.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-5.9-consumo-1920x1080-dark.png` con un alumno en ámbar y otro en rojo (cuotas de prueba bajas)
Hecho significa (sí/no): el botón cambia `requests_per_day` del alumno en el gateway.
No hagas: sondeo menor de 10 s; mostrar emails (solo nombre).

### T-5.10 · Imágenes remotas en el gateway
Depende de: T-0.4  ·  Turnos: 2  ·  Riesgo: alto
Objetivo (una frase): `POST /v1/images/generations` en el gateway traduce al proveedor de imagen configurado (SiliconFlow o Zhipu CogView, OpenAI-compatible), con cuota y costo por `sub` y la misma telemetría.
Lee antes (rutas exactas): src/api.rs (`chat`, `handle`, `gateway_auth`, `check_quota`) · src/config.rs (`Provider`) · src/engine.rs (`record_success`) · tests/gateway.rs (`start_fake`)
Crea / modifica (rutas exactas, nada más): src/images.rs (nuevo) · src/lib.rs (`pub mod images;`) · src/api.rs (ruta) · src/config.rs (`pub image_providers: BTreeMap<String, ImageProvider>` con `base_url`, `api_key_env`, `model`, `price_per_image`, `kind: "openai" | "zhipu"`) · tests/gateway.rs · config.yaml (sección `image_providers:` con dos ejemplos comentados)
Pasos:
1. Cuerpo de entrada (formato OpenAI): `{"model":"siliconflow-flux","prompt":"…","size":"1024x1024","n":1,"response_format":"b64_json"}`; `model` elige el proveedor de `image_providers`.
2. `kind: openai` → `POST {base_url}/images/generations` tal cual; `kind: zhipu` → `POST {base_url}/images/generations` con `{"model","prompt","size"}` y respuesta `data[0].url` que el gateway descarga y convierte a `b64_json` (límite 10 MB).
3. Respuesta: `{"created":…,"data":[{"b64_json":"…"}],"orchestrator":{"request_id","provider","cost_usd"}}`; cabecera `x-orchestrator-cost-usd`.
4. Telemetría: `Row` con `agent = "image"`, `model = <id>`, `cost_usd = price_per_image`; `Usage::record(p, 0)` cuenta la petición para la cuota.
5. Timeout 120 s; errores → misma tabla de `reliability` (429 → 429 al cliente con `Retry-After`).
6. Test `image_generation_via_fake_provider` (falso que devuelve `b64_json` fijo) y `image_generation_counts_quota`.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway image_generation 2>&1 | grep -c 'test result: ok'` → `1`
- `curl -s -X POST localhost:4000/v1/images/generations -H "Authorization: Bearer $JG" -H 'Content-Type: application/json' -d '{"model":"siliconflow-flux","prompt":"un osito programador","size":"512x512"}' | jq -r '.data[0].b64_json | length'` → número mayor que `1000`
Hecho significa (sí/no): tests verdes y una imagen real llega en menos de 60 s con un token de alumno.
No hagas: ejecutar ningún modelo de imagen en el servidor; guardar imágenes en disco del gateway; CDN.

### T-5.11 · Transcripción remota en el gateway
Depende de: T-0.4  ·  Turnos: 2  ·  Riesgo: alto
Objetivo (una frase): `POST /v1/audio/transcriptions` (multipart, formato OpenAI) reenvía al proveedor de voz configurado (SiliconFlow SenseVoice o Groq Whisper) con cuota por `sub`.
Lee antes (rutas exactas): src/images.rs (T-5.10, mismo patrón) · src/api.rs · Cargo.toml (`reqwest` con feature `multipart`: añadir la feature, no un crate nuevo)
Crea / modifica (rutas exactas, nada más): src/audio.rs (nuevo) · src/lib.rs · src/api.rs · src/config.rs (`audio_providers` con `base_url`, `api_key_env`, `model`, `price_per_minute`) · Cargo.toml (feature `multipart` de reqwest) · tests/gateway.rs · config.yaml
Pasos:
1. Entrada multipart: campo `file` (máximo 10 MB, `audio/webm`, `audio/wav`, `audio/mpeg`, `audio/ogg`), `model`, `language` opcional (`es` por defecto); salida `{"text":"…","orchestrator":{…}}`.
2. Reenvío multipart al proveedor con `reqwest::multipart::Form`; timeout 60 s.
3. Telemetría `agent = "audio"`, `cost_usd = price_per_minute * duración estimada` (tamaño / 16 kB por segundo si no hay duración).
4. Test `audio_transcription_via_fake_provider`.
Verifica (comando exacto → salida esperada):
- `cd $R && ~/.cargo/bin/cargo test --test gateway audio_transcription 2>&1 | grep -c 'test result: ok'` → `1`
- `curl -s -X POST localhost:4000/v1/audio/transcriptions -H "Authorization: Bearer $JG" -F model=sensevoice -F file=@/tmp/prueba.wav | jq -r .text | wc -w` → mayor que `0`
Hecho significa (sí/no): test verde y un audio real vuelve como texto.
No hagas: instalar whisper en ningún lado; aceptar archivos de más de 10 MB; guardar el audio.

### T-5.12 · Perfil nube del osito
Depende de: T-5.10, T-5.11  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Con `OSITO_PERFIL=nube`, el backend del osito hace el chat por `OSITO_OLLAMA_URL` en formato OpenAI con `OSITO_GATEWAY_TOKEN`, la imagen por `OSITO_IMAGEN_URL`, la transcripción por `OSITO_STT_URL`, y no importa torch, whisper, diffusers ni fastembed; el frontend usa Web Speech primero y avisa al padre de las evidencias.
Lee antes (rutas exactas): /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/backend/motores.py (`chat_ollama`, `transcribir`, `generar_imagen`, `_cargar_faq`) · osito/backend/imagen.py (`resolver`, `_imagen_demo`) · osito/backend/flyer.py (`extraer_datos`, `_fondo_sd`, `_fondo_demo`) · osito/backend/app.py (`api_chat`, `api_stt`, `api_imagen`, `api_salud`) · osito/frontend/app.js (líneas 470-600 y 640-700)
Crea / modifica (rutas exactas, nada más): osito/backend/nube.py (nuevo) · osito/backend/motores.py · osito/backend/imagen.py · osito/backend/flyer.py · osito/backend/app.py · osito/frontend/app.js · osito/backend/requirements-nube.txt (igual al de T-3.1) — todos bajo /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/osito/
Pasos:
1. `nube.py`: `PERFIL = os.environ.get("OSITO_PERFIL", "local")`, `ACTIVO = PERFIL == "nube"`, `GATEWAY_TOKEN`, `IMAGEN_URL`, `IMAGEN_MODELO`, `STT_URL`; `chat_openai(mensajes, modelo) -> str` (`POST {OLLAMA_URL}/chat/completions` con `Authorization: Bearer`, cuerpo OpenAI, lee `choices[0].message.content`); `imagen_remota(prompt, ruta) -> None` (`POST IMAGEN_URL` con `b64_json`, decodifica y guarda PNG); `stt_remoto(ruta) -> dict` (multipart a `STT_URL`).
2. `motores.py`: en `chat_ollama`, si `nube.ACTIVO` llamar `nube.chat_openai` y devolver `fuente = "gateway"` desde `app.py`; `_cargar_faq` sin `fastembed` cuando `ACTIVO` (solo `_similitud_lexica`); `transcribir` → `nube.stt_remoto` si `ACTIVO`; `whisper_importable()` devuelve `False` sin importar nada cuando `ACTIVO`.
3. `imagen.py`: `capacidad()` y `resolver()` no importan `torch` cuando `nube.ACTIVO` (devuelven `{"nivel":"nube"}` y `"nube"`); `generar(...)` con motor `nube` → `nube.imagen_remota`, y si falla, `_imagen_demo`. `flyer.py`: `_fondo_sd` → `nube.imagen_remota` cuando `ACTIVO`; `extraer_datos` usa `nube.chat_openai`.
4. `app.py`: `api_salud` añade `"perfil": nube.PERFIL`, `"chat": "gateway|ollama"`, `"stt": "navegador|gateway|whisper"`, `"imagen": "gateway|demo|<motor>"`; `api_chat` devuelve `fuente: "gateway"` en nube; log de acceso de uvicorn activo (`POST /api/chat … 200` debe salir en stdout para la evidencia de E07).
5. `frontend/app.js`: con `window.SpeechRecognition` disponible, usar primero el reconocimiento del navegador (hoy es respaldo, invertir el orden: función `dictar()` intenta `SpeechRecognition` y solo si no existe graba y manda a `/api/stt`); tras enviar un mensaje dictado, `parent.postMessage({tipo:"evidencia", tipo_evidencia:"microfono"}, "*")`; tras recibir imagen, `parent.postMessage({tipo:"evidencia", tipo_evidencia:"flyer"}, "*")`; `BASE` de las peticiones = `location.pathname` sin el archivo (para que `/vista/<sub>/osito/` pida `/vista/<sub>/osito/api/...` → añadir en T-4.2 la reescritura `/<carpeta>/api/` → `/api/`: el relé acepta `api` en cualquier nivel y quita el prefijo).
6. Prueba sin torch: `python3 -m venv /tmp/vnube && /tmp/vnube/bin/pip install -r requirements-nube.txt && OSITO_PERFIL=nube OSITO_OLLAMA_URL=http://localhost:4000/v1 OSITO_GATEWAY_TOKEN=$JG /tmp/vnube/bin/python -m uvicorn backend.app:app --port 8766`.
Verifica (comando exacto → salida esperada):
- `/tmp/vnube/bin/pip list 2>/dev/null | grep -c -E '^(torch|faster-whisper|diffusers|fastembed) '` → `0`
- `curl -s localhost:8766/api/salud | jq -c '{perfil,chat}'` → `{"perfil":"nube","chat":"gateway"}`
- `curl -s -X POST localhost:8766/api/chat -H 'Content-Type: application/json' -d '{"mensaje":"hola","historial":[]}' | jq -r .fuente` → `gateway`
Hecho significa (sí/no): chat, imagen (remota o demo) y stt responden sin torch instalado; el perfil `local` sigue funcionando igual que antes (correr `python backend/prueba_api.py` con Ollama local, si está).
No hagas: cambiar el comportamiento del perfil `local`; importar torch en el camino de `nube`; dependencias nuevas.

### T-5.13 · Mi IA: proveedor de imagen y bloque para la tarea 2
Depende de: T-5.12, T-5.5  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Al cambiar modelo o proveedor en «Mi IA», el LMS reescribe `/trabajo/.env` del contenedor y reinicia el asistente; además muestra el bloque de `opencode.json` y las líneas `export OSITO_*` para la tarea 2 en casa.
Lee antes (rutas exactas): lms/api/internal/httpapi/aula_credenciales.go · lms/api/internal/httpapi/mi_ia.go · src/bin/jmd/setup.rs (`opencode_config`: forma del bloque `provider.jmd`) · lms/web/src/components/mi-ia.tsx
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/mi_ia.go (tras `PUT`, llamar `inyectarCredenciales` y `Exec("aula parar; aula iniciar")` si hay contenedor) · lms/web/src/components/mi-ia.tsx · lms/api/internal/httpapi/ia_test.go
Pasos:
1. Bloque copiable «Para tu laptop (tarea 2)»: `opencode.json` con `provider.jmd.options.baseURL = "<gateway público>/v1"` y `apiKey = "<tu token>"` (mostrar `jg_…` oculto con botón «Mostrar» que pide el token por `GET /api/v1/mi-ia/token-claro` una sola vez; esta ruta devuelve el token solo al propio alumno) y las tres líneas `export OSITO_OLLAMA_URL=…`, `export OSITO_GATEWAY_TOKEN=…`, `export OSITO_PERFIL=nube`.
2. Texto: «En clase todo esto ya está puesto en tu contenedor. En casa, con Ollama, quita OSITO_PERFIL para volver a local».
3. Test `TestMiIAReiniciaAsistente` con motor falso que registra `aula parar; aula iniciar`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestMiIAReiniciaAsistente -v 2>&1 | tail -2` → `--- PASS` y `ok`
- captura `docs/capturas-live/T-5.13-mi-ia-tarea2-1366x768-light.png`
Hecho significa (sí/no): cambiar el modelo y preguntar en el visor usa el modelo nuevo (`/api/salud` del osito lo refleja).
No hagas: mostrar el token sin acción explícita; copiar la clave de OpenRouter al bloque.

### T-5.14 · Lista blanca con precio y verificación diaria
Depende de: T-0.4, T-5.2  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): El gateway prueba cada día a las 06:00 UTC los modelos de la lista blanca y expone el resultado; el selector de «Mi IA» muestra en gris los que no respondieron.
Lee antes (rutas exactas): src/main.rs (goroutine de saldos cada 300 s) · src/api.rs (`admin_route`, `playground`) · lms/api/internal/httpapi/mi_ia.go
Crea / modifica (rutas exactas, nada más): src/main.rs · src/api.rs (`GET /v1/models/health` → `{"checked_at":…,"models":{"deepseek-flash":{"ok":true,"ms":1200}}}`) · src/engine.rs (`pub health: Mutex<Value>`) · lms/api/internal/httpapi/mi_ia.go (añade `disponible: bool` a cada modelo leyendo `/v1/models/health`) · lms/web/src/components/mi-ia.tsx (opción `disabled` con texto «sin respuesta hoy»)
Pasos:
1. Tarea en `main.rs`: al arrancar y cada 24 h, para cada modelo de `cfg.models` con `cost <= 1`, `POST` interno de `Responde solo: ok` con timeout 20 s; guardar `ok`, `ms`, `checked_at` en `engine.health`.
2. `GET /v1/models/health` con `gateway_auth`.
3. LMS: caché de 10 min del resultado; `disponible = false` → `<option disabled>`.
Verifica (comando exacto → salida esperada):
- `curl -s localhost:4000/v1/models/health -H "Authorization: Bearer $JG" | jq '.models | length'` → número de modelos con `cost <= 1`
- `cd $R && ~/.cargo/bin/cargo test 2>&1 | grep -c 'test result: ok'` → igual que en T-0.1
Hecho significa (sí/no): un modelo con id inventado aparece con `ok: false` y en gris en el selector.
No hagas: probar modelos de pago (`cost >= 2`); correr la prueba más de una vez al día; bloquear el arranque esperando la prueba.

### Fase 5b · Skills por alumno, aisladas y adaptadas a su modelo

### T-5b.1 · Tabla skills y store
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Tabla `skills` con unicidad por `(user_id, nombre)` y funciones de store para listar, leer, guardar y borrar solo lo propio.
Lee antes (rutas exactas): lms/api/internal/store/store.go (sección certificados como patrón de `scan`) · lms/api/internal/store/live_test.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/store/skills.go · lms/api/internal/store/skills_test.go · lms/api/internal/store/store.go (solo el `CREATE TABLE` en `schema`)
Pasos:
1. `CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, nombre TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '', cuerpo TEXT NOT NULL, modelo_destino TEXT NOT NULL DEFAULT 'generico', variantes_json TEXT NOT NULL DEFAULT '{}', version INTEGER NOT NULL DEFAULT 1, origen TEXT NOT NULL DEFAULT 'propia', compartida INTEGER NOT NULL DEFAULT 0, creada_en TEXT NOT NULL, actualizada_en TEXT NOT NULL, UNIQUE (user_id, nombre));` (`user_id` vacío = skill del curso, solo lectura).
2. `type Skill struct {...}`; `Skills(ctx, userID) ([]*Skill, error)`, `Skill(ctx, userID, nombre) (*Skill, error)`, `UpsertSkill(ctx, *Skill) error` (incrementa `version` si existe), `DeleteSkill(ctx, userID, nombre) error` (ErrNotFound si no es suya), `SkillsCompartidas(ctx) ([]*Skill, error)`.
3. Test `TestSkillsAisladas`: A guarda `piedra-mia`; `Skill(ctx, B, "piedra-mia")` → `ErrNotFound`; `DeleteSkill(ctx, B, "piedra-mia")` → `ErrNotFound`; segunda `UpsertSkill` de A → `version == 2`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/store -run TestSkillsAisladas -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): test verde.
No hagas: consultas sin `user_id` en el `WHERE` (salvo `SkillsCompartidas`); columnas de más.

### T-5b.2 · Rutas mis-skills con 403
Depende de: T-5b.1  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): `GET/POST /api/v1/mis-skills`, `GET/PUT/DELETE /api/v1/mis-skills/{nombre}` con validación del front matter y pruebas de aislamiento.
Lee antes (rutas exactas): lms/api/internal/store/skills.go · lms/api/internal/httpapi/question_handlers.go (patrón CRUD) · src/bin/jmd/skills.rs (`parse`: cómo lee `name`/`description`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/skills_handlers.go · lms/api/internal/httpapi/skills_test.go · lms/api/internal/httpapi/server.go · lms/web/src/lib/api.ts (`interface Skill`, `misSkills`, `miSkill`, `saveSkill`, `deleteSkill`)
Pasos:
1. `validarSkill(cuerpo string) (nombre, descripcion string, err error)`: front matter entre `---`, `name` obligatorio igual a `^[a-z0-9]+(-[a-z0-9]+)*$` (slug, 2 a 40 caracteres), `description` obligatoria (10 a 300 caracteres), cuerpo total hasta 64 KB.
2. `POST` cuerpo `{"cuerpo":"---\nname: …\ndescription: …\n---\n…","modelo_destino":"deepseek"}` → 201 con la skill; 409 si ya existe; `PUT` igual; `DELETE` → 204; `GET /mis-skills` → lista `[{nombre,descripcion,modelo_destino,version,origen,compartida,actualizada_en}]`; `GET /mis-skills/{nombre}` → con `cuerpo` y `variantes`.
3. `nombre` de la URL debe coincidir con `name` del front matter; si no, 400 `nombre_no_coincide`.
4. Tests: `TestSkillsCRUD`, `TestSkillsOtroAlumno403` (B hace GET/PUT/DELETE de la de A → 404 en GET, 403 en PUT y DELETE), `TestSkillsFrontMatterInvalido` (sin `description` → 400; `name: Mi Skill` → 400).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestSkills -v 2>&1 | grep -c '^--- PASS'` → `3`
- `curl -s -X POST localhost:8095/api/v1/mis-skills -H "Authorization: Bearer $ALU" -H 'Content-Type: application/json' -d '{"cuerpo":"---\nname: saludo\ndescription: Saluda en español con una frase corta\n---\nSaluda.","modelo_destino":"deepseek"}' | jq -r .nombre` → `saludo`
Hecho significa (sí/no): tests verdes y el `curl` crea la skill.
No hagas: permitir al staff editar skills ajenas (solo lectura en T-5b.11); aceptar `name` con mayúsculas.

### T-5b.3 · Skills del curso y copiar
Depende de: T-5b.2  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Las 14 skills del taller viven en el contenido, se listan en `GET /api/v1/skills-curso` y se copian a la cuenta con `POST /api/v1/mis-skills/{nombre}/copiar`.
Lee antes (rutas exactas): lms/api/internal/content/load.go (`loadCourse`) · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/
Crea / modifica (rutas exactas, nada más): lms/content/courses/programacion-agentica/skills/<nombre>/SKILL.md (14 copias) · lms/api/internal/content/skills.go (`Catalog.SkillsCurso(courseID)` leyendo `skills/*/SKILL.md`) · lms/api/internal/content/load.go · lms/api/internal/httpapi/skills_handlers.go · lms/api/internal/httpapi/skills_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. `rsync -a --exclude _perfiles /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/ $R/lms/content/courses/programacion-agentica/skills/`.
2. `GET /api/v1/skills-curso` → `[{nombre,descripcion,cuerpo}]` solo lectura.
3. `POST /api/v1/mis-skills/{nombre}/copiar` → crea en la cuenta con `origen: copiada`, nombre `<nombre>` (409 si ya la tiene; cuerpo opcional `{"nuevo_nombre":"…"}`).
4. Test `TestSkillsCursoCopiar` con un fixture de 2 skills de curso.
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/skills-curso -H "Authorization: Bearer $ALU" | jq 'length'` → `14`
- `cd $R/lms/api && go test ./internal/httpapi -run TestSkillsCursoCopiar -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): 14 skills listadas y la copia aparece en `mis-skills`.
No hagas: permitir editar las del curso; copiar `_perfiles`.

### T-5b.4 · Montaje en el contenedor y sincronización
Depende de: T-5b.2, T-3.4  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Al iniciar el aula y en cada cambio, el LMS escribe las skills del alumno en `/home/alumno/.config/jmd/skills/<nombre>/SKILL.md` (variante del modelo activo) y detecta skills creadas desde la terminal en `/trabajo/skills/`.
Lee antes (rutas exactas): lms/api/internal/httpapi/aula_credenciales.go (`ExecStdin`) · src/bin/jmd/skills.rs (`discover`: lee `~/.config/jmd/skills/` y `skills/` del proyecto) · lms/api/internal/httpapi/skills_handlers.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/skills_montaje.go · lms/api/internal/httpapi/skills_test.go · lms/api/internal/httpapi/skills_handlers.go (llamar `montarSkills` tras `POST/PUT/DELETE`) · lms/api/internal/httpapi/aula_handlers.go (tras `Crear`)
Pasos:
1. `montarSkills(ctx, userID)`: borra `~/.config/jmd/skills/*` salvo el enlace `piedra` y escribe cada skill propia con `ExecStdin("mkdir -p ~/.config/jmd/skills/<nombre> && cat > ~/.config/jmd/skills/<nombre>/SKILL.md")`; el contenido es `variantes[modelo_activo]` si existe, si no `cuerpo`.
2. Las 14 del curso ya están en `/opt/skills-curso` (T-3.2) y `jmd` las ve por el enlace de `~/.config/jmd/skills` creado en la imagen: no se copian.
3. Detección: cada 30 s, para contenedores vivos, `Exec("ls /trabajo/skills 2>/dev/null")`; nombres que no estén en la cuenta se publican al alumno por el stream (`evento: skill_nueva {"nombre"}`) y `POST /api/v1/mis-skills/importar {"nombre"}` la lee del contenedor (`cat /trabajo/skills/<nombre>/SKILL.md`) y la guarda.
4. Test `TestMontajeSoloPropias` con motor falso: A con 2 skills y B con 1 → cada contenedor recibe solo las suyas.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestMontajeSoloPropias -v 2>&1 | tail -2` → `--- PASS` y `ok`
- en el contenedor: `docker exec curso-<alias> sh -c 'ls ~/.config/jmd/skills'` → las propias del alumno más `piedra`
Hecho significa (sí/no): dos alumnos con una skill del mismo nombre no se ven; un cambio desde la UI llega al contenedor en menos de 5 s.
No hagas: carpeta compartida entre alumnos; interpolar `nombre` sin validar el slug.

### T-5b.5 · Editor Mis skills (UI)
Depende de: T-5b.3  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Panel «Mis skills» en el LIVE con lista, botón «Copiar del curso», editor con la plantilla (front matter, Cuándo usar, Procedimiento, Reglas duras, Lista de comprobación, Versión corta) y vista previa.
Lee antes (rutas exactas): /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/plan-de-trabajo/SKILL.md (estructura de secciones) · lms/web/src/components/live-alumno.tsx · lms/web/src/components/prose.tsx
Crea / modifica (rutas exactas, nada más): lms/web/src/components/mis-skills.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/global.css
Pasos:
1. Lista `.skills-lista` con nombre, descripción, `modelo_destino`, versión, chip `compartida`; botones «Nueva», «Copiar del curso» (lista de las 14 con botón copiar).
2. Editor: `<textarea>` monoespaciada con la plantilla precargada (las seis secciones con un párrafo guía cada una); validación en vivo del front matter (mismo regex que T-5b.2); botones «Guardar», «Borrar» (confirmación en línea, no `confirm`), «Compartir con el instructor» (T-5b.10).
3. Vista previa: render del Markdown con el componente `Prose` existente.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1 && npm run build.types 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-5b.5-mis-skills-1920x1080-dark.png`
Hecho significa (sí/no): crear una skill desde la UI y verla en `ls ~/.config/jmd/skills` del contenedor en menos de 5 s.
No hagas: editor de código pesado (CodeMirror, Monaco); `confirm`/`prompt` nativos.

### T-5b.6 · Botón Probar en la terminal
Depende de: T-5b.5, T-3.7  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): «Probar» escribe en la pestaña activa de la terminal `jmd chat "/skill <nombre> <pedido de prueba>"` y marca si el agente cargó la skill.
Lee antes (rutas exactas): lms/web/src/components/mis-skills.tsx · lms/web/src/components/terminal-aula.tsx · src/bin/jmd/agent.rs (`load_skill` imprime `↳ skill <nombre>`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/mis-skills.tsx · lms/web/src/components/terminal-aula.tsx (método expuesto `escribir(texto)` por señal compartida)
Pasos:
1. Campo «Pedido de prueba» (por defecto «explica en una frase para qué sirves») y botón «Probar» que abre el panel Terminal y escribe el comando con salto de línea.
2. Observar la salida de la terminal durante 60 s: si aparece `↳ skill <nombre>`, chip verde «El agente cargó la skill»; si no, chip ámbar «No se cargó: revisa la description».
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-5b.6-probar-1366x768-dark.png` con el chip verde
Hecho significa (sí/no): crear una skill y verla responder en la terminal en menos de 1 minuto.
No hagas: usar `opencode` (no está en el contenedor); ejecutar sin que el alumno pulse.

### T-5b.7 · Perfiles por modelo y variante determinista
Depende de: T-5b.1  ·  Turnos: 2  ·  Riesgo: medio
Objetivo (una frase): Paquete `skills` con los perfiles de `MODELOS.md` y una función que genera, sin LLM, la variante de una skill para cada perfil; al guardar se generan y guardan en `variantes_json`.
Lee antes (rutas exactas): /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/_perfiles/MODELOS.md (matriz, «Notas por familia», «Cómo convertir un SKILL.md en system prompt») · lms/api/internal/store/skills.go
Crea / modifica (rutas exactas, nada más): lms/api/internal/skills/perfiles.go · lms/api/internal/skills/perfiles_test.go · lms/api/internal/httpapi/skills_handlers.go (llamar `skills.Variantes(cuerpo)` en `POST/PUT`)
Pasos:
1. `type Perfil struct { ID, Nombre, Longitud string /* completa | corta */; Rol bool; FormatoAlFinal bool; Prohibido bool; ListaNumerada bool; MaxLineas int }` y `var Perfiles = []Perfil{ {ID:"claude", Longitud:"completa"}, {ID:"gpt", Longitud:"completa", FormatoAlFinal:true}, {ID:"deepseek", Longitud:"corta", ListaNumerada:true, FormatoAlFinal:true}, {ID:"glm", Longitud:"corta", ListaNumerada:true, FormatoAlFinal:true}, {ID:"nemotron", Longitud:"corta", Rol:true, Prohibido:true}, {ID:"ollama-pequeno", Longitud:"corta", Rol:true, FormatoAlFinal:true, MaxLineas:25} }`.
2. `func PerfilDeModelo(modeloID string) string`: contiene `deepseek` → `deepseek`; `glm` → `glm`; `nemotron` → `nemotron`; `qwen`, `gemma`, `llama` con tamaño ≤ 4b → `ollama-pequeno`; `claude` → `claude`; `gpt`, `kimi`, `minimax`, `qwen3-235b` → `gpt`; otro → `deepseek`.
3. `func Variante(cuerpo string, p Perfil) string`: `completa` → el cuerpo; `corta` → front matter + sección «## Versión corta para modelos pequeños» hasta el final (si no existe, las secciones «Principios» a «Reglas duras»); con `Rol`, anteponer `Rol: asistente técnico que sigue estas reglas.` y `Formato de salida: pasos numerados en español, sin saludos.`; con `Prohibido`, mover las frases que empiezan por «Nunca» o «No » a un bloque final «Prohibido:»; con `ListaNumerada`, convertir viñetas `- ` del procedimiento en `1.`, `2.`…; con `FormatoAlFinal`, última línea `Formato de salida obligatorio: lista numerada, un verbo por paso, en español.`; con `MaxLineas`, recortar a ese número de líneas del cuerpo (no del front matter).
4. `func Variantes(cuerpo string) map[string]string` para todos los perfiles.
5. Tests: `TestVarianteDeepSeekEsCortaYNumerada`, `TestVarianteNemotronTieneRolYProhibido`, `TestVarianteOllamaMax25`, `TestPerfilDeModelo` (tabla).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/skills -v 2>&1 | grep -c '^--- PASS'` → `4`
Hecho significa (sí/no): la misma skill en `deepseek` y `nemotron` da textos distintos y los tests lo comprueban.
No hagas: llamar al gateway aquí (eso es T-5b.8); perder el front matter; inventar perfiles fuera de MODELOS.md.

### T-5b.8 · Adaptar a mi modelo (Go, gateway)
Depende de: T-5b.7, T-5.4  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): `POST /api/v1/mis-skills/{nombre}/adaptar` pide al gateway (perfil `cheap`, token del alumno) reescribir la skill al perfil de su modelo con un prompt literal y devuelve la propuesta sin guardarla.
Lee antes (rutas exactas): lms/api/internal/skills/perfiles.go · lms/api/internal/httpapi/llm_settings.go (`probarLLM`: cómo llamar al endpoint) · lms/api/internal/httpapi/mi_ia.go (`TokenPersonal`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/skills_adaptar.go · lms/api/internal/httpapi/skills_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. Perfil destino = `PerfilDeModelo(ia_alumno.modelo)`; `max_tokens 2000`, `temperature 0.2`, modelo `cheap`, `Authorization: Bearer <token del alumno>` (así se descuenta de su cuota).
2. Prompt literal (system): «Eres un editor de skills para agentes de programación. Reescribe el SKILL.md que te doy para el perfil de modelo "<perfil>" siguiendo estas reglas tomadas de MODELOS.md: <reglas del perfil: para deepseek y glm: "listas numeradas explícitas, un verbo por ítem, evita párrafos largos de contexto, la última línea debe ser Formato de salida obligatorio: …"; para nemotron: "separa en dos bloques Rol: y Formato de salida: con un ejemplo; agrupa las reglas negativas bajo Prohibido:"; para ollama-pequeno: "máximo 25 líneas, una instrucción por turno, ejemplos antes que reglas, sin negaciones compuestas"; para gpt: "rol al inicio, reglas numeradas, repite al final: sin saludos ni cierres"; para claude: "conserva el texto completo, solo corrige errores">. Conserva intactos el front matter (name y description) y todas las frases con “nunca”, “no”, “solo”. Responde únicamente con el SKILL.md completo, sin explicaciones ni vallas de código.»; user: el cuerpo actual.
3. Respuesta `{"perfil":"deepseek","propuesta":"---\nname…","tokens":{"entrada":…,"salida":…}}`; 503 si la IA está desactivada; 429 pasa tal cual del gateway.
4. Test `TestAdaptarUsaTokenDelAlumno` con gateway falso que verifica la cabecera `Authorization` recibida y el `model: cheap`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestAdaptarUsaTokenDelAlumno -v 2>&1 | tail -2` → `--- PASS` y `ok`
Hecho significa (sí/no): la propuesta vuelve y el consumo aparece en `GET /api/v1/mi-uso` del alumno.
No hagas: guardar la propuesta sin que el alumno acepte; usar la clave central del LMS; cambiar el prompt.

### T-5b.9 · Adaptar a mi modelo (UI con diff)
Depende de: T-5b.8  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Botón «Adaptar a mi modelo» en el editor que muestra el diff línea a línea entre la skill actual y la propuesta y permite aceptar o descartar.
Lee antes (rutas exactas): lms/web/src/components/mis-skills.tsx
Crea / modifica (rutas exactas, nada más): lms/web/src/components/mis-skills.tsx · lms/web/src/lib/api.ts (`adaptarSkill`) · lms/web/src/global.css
Pasos:
1. Diff simple por líneas (función propia `diffLineas(a, b)` con LCS en TypeScript, sin librerías): filas `.diff-mas` (verde) y `.diff-menos` (rojo) con prefijo `+`/`-` visible para accesibilidad.
2. «Aceptar» pone la propuesta en el editor y guarda (`PUT`); «Descartar» cierra; mostrar tokens consumidos.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-5b.9-diff-1366x768-light.png`
Hecho significa (sí/no): el diff se ve antes de guardar y «Aceptar» cambia la versión.
No hagas: librería de diff; guardar al recibir la propuesta.

### T-5b.10 · Zip personal y compartir
Depende de: T-5b.2  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): `GET /api/v1/mis-skills.zip` descarga las skills propias con `instalar.sh` y `POST /api/v1/mis-skills/{nombre}/compartir` las marca de solo lectura para el instructor.
Lee antes (rutas exactas): lms/api/internal/httpapi/skills_handlers.go · Go stdlib `archive/zip` · /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/instalar.sh (líneas que copian a `~/.claude/skills`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/skills_zip.go · lms/api/internal/httpapi/skills_test.go · lms/api/internal/httpapi/server.go · lms/web/src/components/mis-skills.tsx (botones)
Pasos:
1. Zip con `skills/<nombre>/SKILL.md` (variante `generica`, el cuerpo) y `instalar.sh`: `#!/bin/sh` que copia cada carpeta a `~/.claude/skills/` y `~/.config/opencode/skills/` con `mkdir -p` y `cp -R`, terminando en `echo "Skills instaladas: N"`.
2. `compartir` → `compartida = 1` (y `{"compartida":false}` para retirar).
3. Test `TestSkillsZip` (dos skills → zip con 3 entradas) y `TestCompartirSoloPropia`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run 'TestSkillsZip|TestCompartirSoloPropia' -v 2>&1 | grep -c '^--- PASS'` → `2`
- `curl -s localhost:8095/api/v1/mis-skills.zip -H "Authorization: Bearer $ALU" -o /tmp/s.zip && unzip -l /tmp/s.zip | grep -c SKILL.md` → número de skills propias
Hecho significa (sí/no): el zip instala en una Mac limpia con `sh instalar.sh`.
No hagas: incluir skills del curso en el zip del alumno; compartir por defecto.

### T-5b.11 · Inventario del instructor
Depende de: T-5b.10  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): El instructor ve por alumno cuántas skills tiene, cuáles, modelo destino y última edición, y abre las compartidas en solo lectura; cualquier edición devuelve 403.
Lee antes (rutas exactas): lms/api/internal/httpapi/skills_handlers.go · lms/web/src/components/live-control.tsx
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/skills_handlers.go (`GET /api/v1/admin/skills` staff → `[{sub,nombre_alumno,skills:[{nombre,modelo_destino,actualizada_en,compartida}]}]`; `GET /api/v1/admin/skills/{sub}/{nombre}` solo si `compartida`) · lms/api/internal/httpapi/skills_test.go · lms/api/internal/httpapi/server.go · lms/web/src/components/live-control.tsx (pestaña «Skills») · lms/web/src/lib/api.ts
Pasos:
1. Matriz alumnos × número de skills con enlace «ver» (solo en compartidas) que abre el cuerpo en `Prose` sin botón de guardar.
2. Test `TestInstructorNoEditaSkills`: `PUT /api/v1/mis-skills/<nombre>` con el token del instructor sobre la skill de A → 404 (no es suya) y `PUT /api/v1/admin/skills/...` → 404 (ruta inexistente); `GET` de una no compartida → 403.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestInstructorNoEditaSkills -v 2>&1 | tail -2` → `--- PASS` y `ok`
- captura `docs/capturas-live/T-5b.11-inventario-1920x1080-light.png`
Hecho significa (sí/no): el instructor ve la matriz y no puede editar nada.
No hagas: crear rutas de edición para staff; mostrar skills no compartidas.

### Fase 6 · «Lo logré», plan de trabajo e insignia

### T-6.1 · Evidencia en el progreso
Depende de: T-0.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): `PUT /api/v1/lessons/{id}/progress/{step}` acepta `evidencia` opcional y la guarda en `progress.evidencia_json`; `GET` la devuelve.
Lee antes (rutas exactas): lms/api/internal/httpapi/course_handlers.go (`setProgress`, `progressView`) · lms/api/internal/store/store.go (`SetProgress`, `Progress`, `migrate`) · lms/api/internal/httpapi/api_test.go (`TestLessonProgressAndLinks`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/store/store.go · lms/api/internal/store/migrate_test.go · lms/api/internal/httpapi/course_handlers.go · lms/api/internal/httpapi/api_test.go · lms/web/src/lib/api.ts (`setProgress` con `evidencia?`)
Pasos:
1. `migrate`: `{"progress", "evidencia_json", "ALTER TABLE progress ADD COLUMN evidencia_json TEXT NOT NULL DEFAULT ''"}`; `SetProgress` gana parámetro `evidencia string` (JSON o vacío) y hace `INSERT ... ON CONFLICT DO UPDATE SET evidencia_json = excluded.evidencia_json WHERE excluded.evidencia_json != ''`; `Progress` devuelve también la evidencia (`map[string]ProgressEntry{DoneAt, Evidencia}`).
2. Cuerpo exacto de «Lo logré»: `{"done": true, "evidencia": {"tipo": "captura", "url": "/vista/<sub>/osito/index.html", "html": "<!doctype html>…", "comando": "", "turno": ""}}`; `tipo` ∈ `ninguna|captura|comando|turno`; `html` hasta 200 KB; `comando` y `turno` hasta 2000 caracteres; cualquier otro campo → 400 (readJSON).
3. `progressView`: `steps[id] = {"done_at": "…", "evidencia": {…} | null}`; actualizar `interface Progress` en `api.ts` y los dos usos en `lessons/[id]/index.tsx` (`!!l.progress.steps[s.id]` sigue funcionando porque el objeto es truthy; comprobar).
4. Tests: ampliar `TestLessonProgressAndLinks` con evidencia y `TestMigracionEvidencia` en store (base vieja sin la columna).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/store ./internal/httpapi -run 'TestMigracionEvidencia|TestLessonProgress' -v 2>&1 | grep -c '^--- PASS'` → `2`
- `curl -s -X PUT localhost:8095/api/v1/lessons/pa-02/progress/ver -H "Authorization: Bearer $ALU" -H 'Content-Type: application/json' -d '{"done":true,"evidencia":{"tipo":"comando","comando":"ls","url":"","html":"","turno":""}}' | jq -c '.steps.ver.evidencia.tipo'` → `"comando"`
Hecho significa (sí/no): tests verdes y la página de la sesión sigue marcando pasos como antes.
No hagas: romper `jmd` (que manda `{"done":true}` sin evidencia: debe seguir valiendo); cambiar la clave primaria de `progress`.

### T-6.2 · Botón Lo logré con deshacer
Depende de: T-6.1, T-1.8  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): «Lo logré» escribe el progreso con la evidencia que pide la escena, confirma visualmente y permite deshacer durante 10 s.
Lee antes (rutas exactas): lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-visor.tsx (`evidenciaPendiente`) · lms/web/src/lib/session.ts (`toast`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-alumno.tsx · lms/web/src/global.css
Pasos:
1. Según `escena.evidencia`: `captura` → usa `evidenciaPendiente` del visor (si no hay, la toma al pulsar); `comando` → último comando tecleado en la terminal (hasta 2000); `turno` → último texto del agente; `ninguna` → `{"tipo":"ninguna"}`.
2. `api.setProgress(lesson, escena.paso, true, evidencia)`; el botón pasa a «Hecho · Deshacer (10)» con cuenta atrás; al pulsar deshacer → `setProgress(..., false)`; a los 10 s se fija y publica `liveEvento("visor", "lo-logre")`.
3. Si la escena no tiene `paso` pero `lo_logre` es true (E01), llamar `POST /api/v1/live/{lesson}/evidencia` con `tipo: "presente"`.
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/lessons/pa-02/progress -H "Authorization: Bearer $ALU" | jq -c '.steps.construir.evidencia.tipo'` (tras pulsar en E07) → `"captura"`
- captura `docs/capturas-live/T-6.2-lo-logre-1366x768-dark.png` con la cuenta atrás visible
Hecho significa (sí/no): el progreso refleja hora y evidencia; deshacer lo quita.
No hagas: `confirm`; permitir doble envío; mandar más de 200 KB.

### T-6.3 · Plan de trabajo desde escena.yaml (Go)
Depende de: T-2.1  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): `GET /api/v1/live/{lesson}/plan` devuelve las tareas declaradas en las escenas con su estado para el alumno, y `GET /api/v1/live/{lesson}/matriz` (staff) la matriz alumnos × tareas.
Lee antes (rutas exactas): lms/api/internal/content/live.go (`tareas`) · lms/api/internal/httpapi/live_compuerta.go · lms/api/internal/store/store.go (`ProgressByUser`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_plan.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go
Pasos:
1. Tarea hecha = el `paso` de la escena que la declara está en `progress` o hay evidencia de esa escena.
2. `plan` → `[{"id":"t1","titulo":"…","escena":"06-plan","hecha":true,"t":"…"}]`; `matriz` → `{"tareas":[…],"alumnos":[{"sub","nombre","hechas":["t1","t3"]}]}`.
3. Test `TestLivePlanYMatriz` con fixture de una escena con 2 tareas.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestLivePlanYMatriz -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s localhost:8095/api/v1/live/pa-02/plan -H "Authorization: Bearer $ALU" | jq 'length'` → `6`
Hecho significa (sí/no): test verde y 6 tareas en pa-02.
No hagas: tabla nueva (se deriva de progress y evidencias); exponer `matriz` a alumnos.

### T-6.4 · Plan y matriz (UI)
Depende de: T-6.3  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Panel «Plan» del alumno con las seis tareas y su estado, y pestaña «Matriz» en control con 10 alumnos × 6 tareas.
Lee antes (rutas exactas): lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx · lms/web/src/components/ui.tsx (`Status`, `Bar`)
Crea / modifica (rutas exactas, nada más): lms/web/src/components/live-plan.tsx · lms/web/src/components/live-alumno.tsx · lms/web/src/components/live-control.tsx · lms/web/src/lib/api.ts (`livePlan`, `liveMatriz`)
Pasos:
1. Alumno: lista con icono `checkCircle`/`circle` y barra de avance; se refresca con cada `logre`.
2. Control: tabla con celdas hecha/pendiente renderizadas con los iconos `check` y `circle`, fila por alumno, columna por tarea, porcentaje final.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && npm run lint 2>&1 | tail -1` → sin `error`
- captura `docs/capturas-live/T-6.4-matriz-1920x1080-light.png` con 10 alumnos
Hecho significa (sí/no): la matriz se actualiza sin recargar al marcar un alumno.
No hagas: caracteres de emoji en las celdas; sondeo (usar el stream).

### T-6.5 · Emisión automática al cerrar
Depende de: T-1.3, T-6.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Al cerrar el LIVE, el LMS emite la insignia de la clase a quien tenga al menos `ia.umbral_insignia` pasos (por defecto 6 de 9) y lo publica en `cierre`.
Lee antes (rutas exactas): lms/api/internal/httpapi/certificados.go (`emitirLote`, `emitir`, `certIn`, `errYaEmitido`) · lms/api/internal/httpapi/live_handlers.go (`cerrar`) · lms/api/internal/httpapi/certificados_clase_test.go (`TestEmisionEnLote`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_cierre.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/live_handlers.go
Pasos:
1. `emitirPorUmbral(ctx, lesson, umbral int, p *Principal) (emitidos, omitidos)`: para cada `student` con acceso al curso, `ProgressByUser` de la lección; si `n >= umbral`, `emitir(ctx, u, ambito clase, certIn{Tipo:"participacion", Horas:2}, p)`; `errYaEmitido` → omitido «ya tiene».
2. El umbral se lee de `settings` `ia.umbral_insignia` (T-5.1; si no existe, 6) y se puede pasar en el cuerpo de `cerrar`: `{"umbral": 6, "emitir": true}` (`emitir: false` cierra sin emitir).
3. `cerrar` responde `{"lesson_id","estado":"cerrada","insignias":{"emitidos":[…],"omitidos":[…]}}` y publica `cierre` con `insignias_emitidas`.
4. Test `TestCierreEmiteConUmbral`: A con 6 pasos, B con 5 → A emitido, B omitido con motivo `faltan 1 pasos`; cerrar dos veces no duplica.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestCierreEmiteConUmbral -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s -X POST localhost:8095/api/v1/live/pa-02/cerrar -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"umbral":6,"emitir":true}' | jq -c '.insignias | {e: (.emitidos|length), o: (.omitidos|length)}'` → `{"e":<n>,"o":<m>}`
Hecho significa (sí/no): quien cumple ve la insignia en «Mis insignias» sin acción del instructor.
No hagas: emitir a staff; emitir dos veces; cambiar `emitirLote`.

### T-6.6 · Exportación CSV del LIVE
Depende de: T-6.5, T-5.7  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): `GET /api/v1/live/{lesson}/export.csv` (staff) con alumno, pasos logrados, tokens, modelo más usado, piedra y RTK activados y hora de cada «Lo logré», en UTF-8 con BOM.
Lee antes (rutas exactas): lms/api/internal/httpapi/certificados_export.go (`exportCSV`: BOM y cabeceras) · lms/api/internal/httpapi/mi_uso.go · lms/api/internal/store/store.go (`Marcas`)
Crea / modifica (rutas exactas, nada más): lms/api/internal/httpapi/live_export.go · lms/api/internal/httpapi/live_test.go · lms/api/internal/httpapi/server.go · lms/web/src/components/live-control.tsx (botón «Exportar CSV»)
Pasos:
1. Columnas exactas: `alumno, email, pasos_logrados, pasos_total, tokens_entrada, tokens_salida, costo_usd, modelo_mas_usado, piedra_activado_en, rtk_activado_en, lo_logre_<paso>` (una columna por paso del ciclo con la hora o vacío).
2. BOM `\xEF\xBB\xBF`, separador `,`, `Content-Disposition: attachment; filename="live-pa-02.csv"`.
3. Test `TestLiveExportCSV`: primera línea empieza por BOM y contiene `alumno,email`; un alumno con «ñ» en el nombre sale íntegro.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test ./internal/httpapi -run TestLiveExportCSV -v 2>&1 | tail -2` → `--- PASS` y `ok`
- `curl -s localhost:8095/api/v1/live/pa-02/export.csv -H "Authorization: Bearer $TOK" | head -c 3 | xxd -p` → `efbbbf`
Hecho significa (sí/no): el archivo abre en Excel con acentos correctos.
No hagas: separador `;`; omitir el BOM; exponer a alumnos.

### Fase 7 · Pruebas, rendimiento y ensayo general

### T-7.1 · Barrido de tests
Depende de: todo lo anterior  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Dejar `go test ./...`, `cargo test`, `npm run lint` y `npm run build.types` en verde y anotar la lista de tests nuevos.
Lee antes (rutas exactas): este documento (nombres de tests por ticket)
Crea / modifica (rutas exactas, nada más): docs/capturas-live/T-7.1-tests.md
Pasos:
1. Correr los cuatro comandos con `-race` en Go; pegar el resumen.
2. Listar los `func Test` nuevos de `lms/api/internal/httpapi/live_*_test.go`, `aula_test.go`, `vista_test.go`, `skills_test.go`, `ia_test.go` y los de `tests/gateway.rs`, `tests/jmd_embed.rs`.
Verifica (comando exacto → salida esperada):
- `cd $R/lms/api && go test -race ./... 2>&1 | grep -c -E '^(FAIL|--- FAIL)'` → `0`
- `cd $R && ~/.cargo/bin/cargo test 2>&1 | grep -c 'FAILED'` → `0`
Hecho significa (sí/no): cero fallos en los cuatro comandos.
No hagas: borrar o saltar (`t.Skip`) tests para ponerlos en verde; cambiar aserciones sin motivo escrito.

### T-7.2 · Carga con 12 navegadores
Depende de: T-7.1  ·  Turnos: 1  ·  Riesgo: medio
Objetivo (una frase): Guion Playwright con 12 contextos conectados al stream, 30 cambios de escena, terminal y visor abiertos en 5, midiendo el p95 de propagación.
Lee antes (rutas exactas): lms/scripts/e2e.mjs · lms/scripts/captura.mjs
Crea / modifica (rutas exactas, nada más): lms/scripts/live-carga.mjs · docs/capturas-live/T-7.2-carga.md
Pasos:
1. 12 alumnos registrados (`alumno01@local.test`…); cada contexto abre `/live/pa-02/` y escucha `estado`; el instructor (por `curl` desde el guion) cambia de escena 30 veces cada 4 s; se mide `t_recepción - t_envío` por alumno y evento.
2. En 5 contextos abrir Terminal y Visor.
3. Salida: p50, p95, p100 en ms, desconexiones (reconexiones del `EventSource`), RAM del LMS (`ps -o rss`).
Verifica (comando exacto → salida esperada):
- `cd $R/lms/web && PLAYWRIGHT_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node ../scripts/live-carga.mjs http://localhost:8095 2>&1 | tail -3` → línea `p95: <menos de 1000> ms` y `desconexiones: 0`
Hecho significa (sí/no): p95 menor a 1 s y cero desconexiones.
No hagas: correrlo contra producción en horario de clase; más de 12 contextos en la Mac.

### T-7.3 · Prueba de uso con 3 alumnos
Depende de: T-7.2  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): 40 minutos con 3 personas reales en remoto siguiendo el guion (entrar, terminal, agente, visor, piedra, gráfico, Lo logré) y hoja de hallazgos con severidad.
Lee antes (rutas exactas): /Users/david.roncal/Downloads/PjgFactSalud_completo/taller-agentico/skills/pruebas-de-uso/SKILL.md · docs/GUION_LIVE_SESION2.md
Crea / modifica (rutas exactas, nada más): docs/capturas-live/T-7.3-hallazgos.md
Pasos:
1. Tabla: hallazgo, severidad 1-4, escena, quién, estado (abierto/corregido).
Verifica (comando exacto → salida esperada):
- `grep -c '| 4 |' $R/docs/capturas-live/T-7.3-hallazgos.md` → `0` tras las correcciones (o cada uno marcado `corregido`)
Hecho significa (sí/no): ningún hallazgo de severidad 4 abierto.
No hagas: corregir durante la sesión; omitir hallazgos.

### T-7.4 · Ensayo general
Depende de: T-7.3, T-2.17  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Clase 2 completa en LIVE con cronómetro y grabación, 120 minutos, con contenedores precreados y lista de ajustes finales.
Lee antes (rutas exactas): docs/GUION_LIVE_SESION2.md («Antes de la clase») · docs/capturas-live/T-2.17-ensayo.md
Crea / modifica (rutas exactas, nada más): docs/capturas-live/T-7.4-ensayo-general.md
Pasos:
1. Ejecutar los 6 puntos de «Antes de la clase» y anotarlos con hora.
2. Dictar las 12 escenas; anotar por escena minuto real, compuerta (pasó/esperó/pasó igual) y fallos.
Verifica (comando exacto → salida esperada):
- `grep -c '^| E' $R/docs/capturas-live/T-7.4-ensayo-general.md` → `12`
Hecho significa (sí/no): grabación de 120 min y lista de ajustes con responsable.
No hagas: saltar escenas; cambiar código en vivo.

### T-7.5 · docs/MODO_LIVE.md y ejemplo
Depende de: T-7.4  ·  Turnos: 1  ·  Riesgo: bajo
Objetivo (una frase): Documentar cómo dictar en LIVE (atajos, compuerta, mensajes, qué hacer si cae el gateway, cómo apagar el aula) y publicar el ejemplo «Cómo funciona el modo LIVE» en el LMS.
Lee antes (rutas exactas): docs/PROGRESO.md · lms/content/courses/programacion-agentica/examples/09-plan-de-trabajo-y-obra.md (formato de ejemplo) · lms/README.md
Crea / modifica (rutas exactas, nada más): docs/MODO_LIVE.md · lms/content/courses/programacion-agentica/examples/19-modo-live.md · docs/PROGRESO.md (sección «Modo LIVE») · lms/README.md (enlace)
Pasos:
1. `MODO_LIVE.md` con secciones: Antes de la clase, Controles y atajos, Compuerta, Mensajes y ayuda, Si cae el gateway (los alumnos siguen con faq.json; reiniciar con `docker compose restart orchestrator`), Apagar el aula (`cerrar` borra contenedores; volúmenes quedan), Exportar.
2. Ejemplo `19-modo-live.md` con `lesson: pa-02`, `phase: experiencia`, `order: 19`.
Verifica (comando exacto → salida esperada):
- `curl -s localhost:8095/api/v1/examples/ej-modo-live -H "Authorization: Bearer $ALU" | jq -r .title` → `Cómo funciona el modo LIVE`
- `grep -c '^## ' $R/docs/MODO_LIVE.md` → `7`
Hecho significa (sí/no): el ejemplo se ve en Prácticas y el documento tiene las siete secciones.
No hagas: documentar `jmd live` (retirado); emojis.

## 4. Orden sugerido de sesiones

Cada sesión es un día de trabajo con dos a cuatro conversaciones de agente. Primero lo que desbloquea más (store, hub, escena.yaml, imagen del aula, tokens del gateway). Lo marcado «personas» no lo hace el agente.

| Sesión | Tickets | Qué queda demostrable al final |
|---|---|---|
| S01 | T-0.1, T-0.6, T-1.1, T-1.2, T-0.2, T-0.3 | Entorno verde, capturas automáticas, tabla y hub del LIVE; gateway en producción conectado al panel IA |
| S02 | T-0.4, T-1.3, T-1.4, T-1.5 | Lista blanca semilla; dos `curl` ven el mismo stream; cambio de escena en menos de 1 s |
| S03 | T-2.1, T-2.2, T-6.1 | Escenas cargadas desde el contenido; progreso con evidencia |
| S04 | T-1.6, T-1.7 | Control del instructor con teclado y cronómetro |
| S05 | T-1.8, T-1.9, T-1.10 | Alumno a pantalla completa, presencia, modo libre |
| S06 | T-2.3, T-0.5, T-0.7 | Plantilla de escena en claro y oscuro; medición de RAM base |
| S07 | T-3.1, T-3.2 | Imagen `jmd/aula` con el asistente en modo nube y los 14 skills |
| S08 | T-3.3, T-3.4, T-3.5 | Contenedor por alumno con límites, apagado y borrado |
| S09 | T-5.3, T-5.1, T-5.2 | Tokens personales sin realm; panel IA ampliado aplica cuotas |
| S10 | T-5.4, T-5.5, T-3.9 | Mi IA; credenciales dentro del contenedor sin clave central |
| S11 | T-3.6, T-3.7, T-3.8 | Terminal del LIVE con pestañas, reconexión y ayuda |
| S12 | T-4.1, T-4.2 | Visor estático desde /trabajo y relé al asistente del contenedor |
| S13 | T-5.10, T-5.11 | Imagen y transcripción remotas por el gateway |
| S14 | T-5.12, T-5.13 | Osito en perfil nube sin torch; Mi IA reinicia el asistente |
| S15 | T-4.3, T-4.4, T-4.5, T-4.6 | Plantillas sin bundler, visor con sondeo, captura y consola |
| S16 | T-1.11, T-1.12, T-1.13 | Compuerta de avance y semáforo |
| S17 | T-1.14, T-1.15, T-3.10, T-3.11, T-3.12 | Ayuda, pares al azar, marcas, piedra y RTK |
| S18 | T-5.6, T-5.7, T-5.8, T-5.9 | Mi uso con serie y marcas; consumo del instructor con +20 % |
| S19 | T-2.4, T-6.2, T-6.3, T-6.4 | Evidencias automáticas, Lo logré con deshacer, plan y matriz |
| S20 | T-3b.1, T-3b.2, T-3b.3 | Barra de estado de jmd, costo por respuesta y del día |
| S21 | T-3b.4, T-3b.5, T-3b.6, T-3b.7 | Reintentos visibles y cancelables; tareas replicadas al LMS |
| S22 | T-3b.9, T-3b.10 | Refactor del agente; `jmd serve --embed` con /estado |
| S23 | T-3b.11, T-3b.12, T-3b.13 | Turno completo por SSE con confirmación; proxy aislado |
| S24 | T-3b.14, T-3b.15, T-3b.16 | Panel Agente completo en el LIVE |
| S25 | T-5b.1, T-5b.2, T-5b.3, T-5b.7 | Skills por alumno con 403 y variantes por modelo |
| S26 | T-5b.4, T-5b.5, T-5b.6, T-5b.8, T-5b.9 | Montaje en el contenedor, editor con Probar, adaptar con diff |
| S27 | T-5b.10, T-5b.11, T-5.14, T-2.5, T-2.6 | Zip, inventario, lista blanca viva; E01 y E02 |
| S28 | T-2.7, T-2.8, T-2.9, T-2.10, T-2.11, T-2.12 | E03 a E08 renderizando según el guion |
| S29 | T-2.13, T-2.14, T-2.15, T-2.16, T-6.5, T-6.6, T-3b.17, T-3.13, T-2.17 | E09 a E12, emisión automática, CSV, puente agente-visor, contenedores precreados, capturas de respaldo |
| S30 | T-7.1, T-7.2, T-3b.8 (personas), T-7.3 (personas), T-7.5, T-7.4 (personas) | Tests y carga en verde; prueba de aula; hallazgos corregidos; documentación; ensayo general |

## 5. Lista de comprobación final antes de la clase (sí/no)

1. `curl -s https://jmd-learn.online/api/v1/health | jq .ok` da `true`.
2. En el EC2, `docker ps --format '{{.Names}}' | grep -c ai-orchestrator` da `1` y `/health` del gateway responde 200.
3. `test -n "$OPENROUTER_API_KEY"` dentro del contenedor del gateway da presente (sin imprimirla).
4. `GET /v1/models/health` muestra `ok: true` en al menos 4 modelos de chat de la lista blanca.
5. Una imagen de prueba vuelve por `/v1/images/generations` en menos de 60 s con un token de alumno.
6. Una transcripción de prueba vuelve por `/v1/audio/transcriptions`.
7. `POST /api/v1/aula/precrear` creó los contenedores de toda la cohorte y `docker stats` suma menos de 1 GB.
8. En el EC2, `ps aux | grep -c -E 'whisper|diffusers|torch'` da 1 (solo el grep): ningún modelo en el servidor.
9. `free -m` muestra al menos 800 MB disponibles con los contenedores arriba, o la instancia ya está en 8 GB.
10. Keycloak apagado o encendido según la decisión de T-3.13, y las cuentas locales de los 10 alumnos repartidas.
11. `GET /api/v1/live/pa-02/escenas` lista 12 escenas con `duracion_min` que suman 100 a 110.
12. Cada escena tiene `captura.png` de respaldo y abre en claro y oscuro.
13. `GET /api/v1/live/pa-02/compuerta` responde con `umbral_pct` para la primera escena con compuerta.
14. Un alumno de prueba hizo el recorrido completo: terminal, `aula iniciar`, chat desde `/vista/<sub>/osito/`, flyer, «Lo logré», y aparece en la matriz.
15. El semáforo de ese alumno pasó por ámbar y verde; el instructor vio su tarea avanzar.
16. `GET /api/v1/mi-uso` del alumno de prueba coincide con el Panel del gateway (diferencia menor al 2 %).
17. Piedra y RTK dejan marca en el gráfico de E05.
18. Cerrar un LIVE de prueba emitió la insignia al alumno con 6 pasos y no al de 5; luego se anuló esa insignia de prueba con `POST /api/v1/admin/certificados/{codigo}/anular`.
19. `export.csv` del LIVE de prueba abre en Excel con la «ñ» correcta.
20. `docs/MODO_LIVE.md` está impreso o abierto en la laptop del instructor, con el plan B de cada escena a la vista.

## 6. Qué hacer si DeepSeek se traba

Cada situación tiene la instrucción exacta que se pega en la conversación. Siempre en imperativo, sin explicaciones largas.

1. **Toca archivos de más.** «Detente. Revierte con `git checkout -- <ruta>` cada archivo que no esté en “Crea / modifica” del ticket T-x.y. Lista los archivos que quedan modificados con `git status --short`. No sigas hasta que la lista coincida con el ticket.»
2. **Inventa una ruta HTTP o un archivo.** «La ruta `<ruta>` no existe en el ticket ni en el repo. Borra lo que escribiste para ella. Usa solo las rutas listadas en el ticket. Si crees que falta una, escribe “BLOQUEADO: falta ruta” y para.»
3. **No corre los tests.** «No des el ticket por hecho. Ejecuta ahora, uno por uno, los comandos de “Verifica” y pega la salida completa de cada uno (recortada a 20 líneas). Si uno falla, corrige solo eso y vuelve a correrlo.»
4. **Cambia un contrato (firma pública, JSON existente, tabla).** «Has cambiado `<símbolo o campo>`, que otros usan. Vuelve a la firma original y añade lo nuevo como campo o función aparte. Comprueba con `rg -n "<símbolo>" lms/api src` que todos los usos compilan. Corre `go build ./...` o `cargo build`.»
5. **Se queda en bucle de reintentos.** «Para. Has probado lo mismo tres veces. Escribe en tres líneas: qué comando falla, el error literal y qué supones que pasa. No ejecutes nada más hasta que yo responda.»
6. **Mezcla español e inglés.** «Todo el texto visible, los comentarios y los nombres de campos JSON nuevos van en español. Busca con `rg -n "[A-Za-z]+ (the|and|with|error:|failed)" <archivos del ticket>` y corrige cada línea. Los identificadores de Go, Rust y TypeScript pueden quedar en inglés si ya existían.»
7. **Usa WebSocket.** «Quita el WebSocket. La sincronía del LIVE y el agente embebido van por SSE (`text/event-stream`) y `POST`. El único WebSocket permitido es el de la terminal que ya existe en `/api/v1/term`. Reescribe con `EventSource` en el front y `http.Flusher` en Go.»
8. **Instala Node, torch u otro modelo en el contenedor o en el servidor.** «Prohibido. Quita `apk add nodejs`, `pip install torch` y cualquier modelo del Dockerfile y de los scripts. El contenedor de aula solo lleva `sh`, `curl`, `git`, `python3` con `requirements-nube.txt`, `jmd` y `rtk`. Los modelos corren en la laptop (tarea 2) o en un proveedor remoto por el gateway. Vuelve a construir y comprueba con `docker run --rm jmd/aula sh -c 'command -v node || echo sin-node'`.»
