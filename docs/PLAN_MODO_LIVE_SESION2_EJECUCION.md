# Plan de ejecución · Modo LIVE de la clase 2 · para DeepSeek V4.1 Flash

Este documento convierte `docs/PLAN_MODO_LIVE_SESION2.md` (plan, decisiones 1 a 12, fases 0 a 7 con 3b, 3c y 5b) y `docs/GUION_LIVE_SESION2.md` (las 12 escenas E01 a E12) en tickets que un agente de programación rápido puede ejecutar uno por uno. No sustituye al plan ni al guion: cuando un ticket y el guion discrepen, manda el guion; cuando un ticket y el código real discrepen, el agente se detiene y reporta.

Fecha de redacción: 2026-10-11. Repositorio: `/Users/david.roncal/Documents/jmd` (rama `main`). No se hace commit desde este documento.

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
8. Las dependencias nuevas (Go, npm, Cargo) están prohibidas salvo que el ticket las nombre en sus pasos.
9. Si el ticket pide una captura, la guarda en `/Users/david.roncal/Documents/jmd/docs/capturas-live/` con el nombre y la resolución indicados (Playwright con `PLAYWRIGHT_CHROMIUM`, ver 1.4).
10. Un turno = una conversación de hasta 45 minutos de agente. Un ticket de «Turnos: 2» se parte en dos conversaciones: la segunda empieza pegando el reporte de cierre de la primera.

### 1.2 Contexto fijo (pegar al inicio de cada sesión, máximo 40 líneas)

```
CONTEXTO FIJO · Modo LIVE clase 2 · repo /Users/david.roncal/Documents/jmd
- Qué es: LMS del curso «Programación agéntica». Backend Go en lms/api (módulo github.com/davrv93/jmd/lms/api,
  Go 1.26, SQLite sin CGO, rutas en lms/api/internal/httpapi/server.go con mux.Handle("GET /api/v1/..."),
  helpers writeJSON/writeErr/readJSON/badRequest/forbidden/notFound/internal en json.go, middlewares
  s.authed / s.staff / s.admin). Front Qwik City estático en lms/web (src/routes, src/components, src/lib/api.ts).
  Gateway de IA en Rust en la raíz (src/api.rs rutas axum, src/engine.rs, src/telemetry.rs, src/auth.rs) y el
  CLI jmd en src/bin/jmd (main.rs comandos, agent.rs agente, client.rs HTTP, lms.rs cliente del LMS, sso.rs tokens).
- Contenido del curso: lms/content/courses/programacion-agentica (lessons/02-asistente-con-skills-y-edge-ai.md
  es la clase pa-02; sus pasos del ciclo: ver, relevar, ollama, skills, plan, construir, voz-imagen, preguntar, entregar).
- Documentos que mandan: docs/PLAN_MODO_LIVE_SESION2.md y docs/GUION_LIVE_SESION2.md (escenas E01..E12).
- Arrancar el LMS en nativo (dos comandos, rutas absolutas):
  cd /Users/david.roncal/Documents/jmd/lms/web && npm run build && rm -rf ../api/internal/webdist/dist && cp -R dist ../api/internal/webdist/dist
  cd /Users/david.roncal/Documents/jmd/lms/api && LMS_ADDR=:8095 LMS_DATA_DIR=/tmp/lms-data LMS_CONTENT_DIR=$(pwd)/../content LMS_ADMIN_EMAIL=instructor@local.test LMS_ADMIN_PASSWORD=local-1234 LMS_ADMIN_NAME="Instructor" LMS_INVITE_CODE=local LMS_COHORT=cohorte-2026-2 LMS_PUBLIC_URL=http://localhost:8095 go run ./cmd/lms
  Login de prueba: POST http://localhost:8095/api/v1/auth/login {"email":"instructor@local.test","password":"local-1234"}.
- Tests: cd /Users/david.roncal/Documents/jmd/lms/api && go test ./...   ·   cd /Users/david.roncal/Documents/jmd/lms/web && npm run lint && npm run build.types
  Rust: cd /Users/david.roncal/Documents/jmd && cargo test  (cargo está en ~/.cargo/bin si no aparece en PATH).
  Patrón de tests Go: lms/api/internal/httpapi/api_test.go (newEnv, e.register, e.login("profe@x.test","profe1234"), e.call, errCode).
- Estilo: todo en español (UI, comentarios, nombres de campos JSON nuevos), sin emojis, sin alert/confirm/prompt
  nativos, botones con aria-label, foco visible, respetar prefers-reduced-motion y los temas claro/oscuro
  (tokens --bg --s1 --fg --accent --ok --warn --bad --ph-ec/or/ca/ea de lms/web/src/global.css).
- RAM (reglas duras): nada de Node en el contenedor de aula; sincronía por SSE, nunca WebSocket nuevo;
  visor estático servido por Go; agente del contenedor = jmd (Rust), nunca OpenCode; contenedor Alpine 128 MB.
- NINGÚN MODELO DE IA CORRE EN EL EC2: nunca whisper, sd-turbo, Ollama ni difusión en el servidor, ni una
  instancia ni diez. Los modelos corren en la laptop del alumno o en un proveedor remoto por el gateway.
- La laptop del alumno entra al LIVE con `jmd live <código>`: una conexión saliente (SSE para recibir, POST
  para enviar). El contenedor Alpine del servidor es solo respaldo.
- Terminal: encadena con && y termina con && echo LISTO; recorta salidas con | tail -n 20; rutas absolutas;
  nunca imprimas claves ni tokens (test -n "$VAR" && echo presente); timeout 60 en red y builds.
- Prohibido: commit, push, rm -rf, instalar dependencias no listadas, tocar archivos fuera del ticket,
  cambiar firmas públicas existentes, borrar tests, inventar rutas HTTP que no estén en el ticket.
```

### 1.3 Reglas de código que el agente debe cumplir sin que se le repitan

- Go: cada handler nuevo se registra en `Handler()` de `lms/api/internal/httpapi/server.go` con el método y la ruta exactos del ticket; los cuerpos JSON se leen con `readJSON` (rechaza campos desconocidos: si el ticket añade un campo al cuerpo, hay que añadirlo al struct); los errores salen con `writeErr(w, código, "codigo_snake", "mensaje en español")`.
- Go: cada tabla nueva va en la constante `schema` de `lms/api/internal/store/store.go` con `CREATE TABLE IF NOT EXISTS`; cada columna nueva en una tabla existente va en la lista `adds` de `migrate()` del mismo archivo.
- Go: `go vet ./...` limpio y `gofmt -l .` sin salida.
- Qwik: componentes en `lms/web/src/components/<nombre>.tsx` con `component$`, estado con `useSignal`/`useStore`, efectos de navegador con `useVisibleTask$` (lleva `// eslint-disable-next-line qwik/no-use-visible-task` encima, como en `terminal.tsx`); llamadas al API solo a través de `lms/web/src/lib/api.ts` añadiendo funciones al objeto `api`.
- Qwik: una ruta nueva con parámetro se añade a `shellSections` en `server.go` y a `onStaticGenerate` del archivo de la ruta (ver `lms/web/src/routes/lessons/[id]/index.tsx`).
- Rust: `cargo fmt --check` y `cargo clippy --all-targets` sin avisos nuevos; los tests de integración siguen `tests/gateway.rs` (proveedor falso con axum) y `tests/jmd_cli.rs` (binario `jmd` con HOME temporal).
- Contenido: los archivos bajo `lms/content` se recargan solos a los 5 s (`content.Store.Watch`), no hace falta reiniciar.

### 1.4 Capturas

Las capturas se toman con Playwright (ya está `playwright-core` en `lms/web`) contra el LMS en `http://localhost:8095`:

```
cd /Users/david.roncal/Documents/jmd/lms/web && PLAYWRIGHT_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node ../scripts/captura.mjs <url> <ancho>x<alto> <ruta-png> [light|dark]
```

El guion `lms/scripts/captura.mjs` se crea en T-0.6. Carpeta de destino: `/Users/david.roncal/Documents/jmd/docs/capturas-live/`. Nombre: `<ticket>-<vista>-<ancho>x<alto>-<tema>.png` (ejemplo `T-1.7-control-1920x1080-dark.png`).

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
