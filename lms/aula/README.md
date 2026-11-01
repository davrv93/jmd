# jmd/aula

Imagen del contenedor que recibe cada alumno en el modo LIVE: shell, `jmd`, `rtk`, los 31 skills del curso (14 del taller, 7 `s2-robo-*` para construir a Robo y 10 `s3-*` para el chatbot de WhatsApp), las plantillas `plan-robo` y `plan-chatbot`
y el código del asistente en modo nube. Sin modelos locales y sin el socket de Docker. Trae **Node 24** solo para
**DeepSeek Harness** (`dsh` 0.2.1-rc.5, fijado) del curso del mismo nombre (ver la sección «DeepSeek Harness dentro del aula»). Para la clase 3 (chatbot de WhatsApp)
trae además **Bun 1.4.2** (binario musl oficial), `psql` 16 y, como respaldo sin red, `elysia`, `@elysiajs/cors` y `postgres`
ya instalados en `/node_modules` (Bun los encuentra subiendo carpetas desde `/trabajo`).

Construir para el servidor (amd64; hacerlo en el servidor, no en el Mac):

    docker build -t localhost/ai-orchestrator:latest ..        # desde la raíz del repo, si falta
    docker build -t jmd/aula:latest lms/aula

Construir para probar en el Mac (arm64; la `localhost/ai-orchestrator:latest` del Mac es amd64):

    docker build --build-arg JMD_IMAGE=localhost/ai-orchestrator:arm64 -t jmd/aula:latest lms/aula

Medir:

    docker image inspect jmd/aula:latest --format '{{.Size}}'
    docker run --rm jmd/aula:latest sh -c 'node -v; dsh --version'
    docker run --rm jmd/aula:latest sh -c 'aula iniciar && sleep 4 && curl -s localhost:8766/api/salud; aula parar'

## Clase 3: Bun + Elysia + PostgreSQL + Evolution Go

Dentro del aula (si el LMS tiene configurado el perfil `clase`, ver `docs/DEPLOY_MODO_LIVE.md` §6):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgres://alumno_<hash>:<clave>@aula-pg:5432/aula_<hash>` (una base y un rol por alumno; solo él entra) |
| `EVO_URL` | `http://evogo-clase:8080` |
| `EVO_TOKEN` | token de SU instancia (la GLOBAL_API_KEY nunca entra al aula) |
| `EVO_INSTANCE` | nombre de la instancia (= nombre del contenedor, `curso-<hash>`) |
| `EVO_WEBHOOK` | `http://curso-<hash>:8766/api/webhook`: donde Evolution Go entrega los mensajes |
| `HTTPS_PROXY`, `HTTP_PROXY` (y en minúsculas) | `http://npm-proxy:8888`: la única salida a internet; hoy abre todo (`lms/clase/npm-proxy/permitidos`) |
| `NO_PROXY` | lo interno de `aula_net` (ai-orchestrator, imagen, evogo-clase, aula-pg, jmrv, lms, npm-proxy, el propio `curso-<hash>`) |
| `BUN_INSTALL_CACHE_DIR` | `/trabajo/.bun-cache` (el home es un tmpfs de 32 MB) |

- El webhook (`EVO_WEBHOOK`, evento `MESSAGE`) lo deja guardado el LMS al crear el aula, escribiendo en la base de
  evolution-go en `aula-pg` (no llama a `/instance/connect`, que arrancaría WhatsApp y pediría QR para cada alumno de
  cualquier clase). Así sirve también el QR que pida el propio front del alumno con `GET /instance/qr`.
- `aula whatsapp`: muestra el estado de la instancia, vuelve a fijar el webhook (`POST /instance/connect` con
  `EVO_WEBHOOK`) y, si no está vinculada, deja el QR en `/trabajo/qr.png` (se renueva ~2,5 min; verlo en el Visor como
  `qr.png`). El código del alumno **no** debe llamar a `/instance/connect` sin `webhookUrl`: lo dejaría vacío
  (se arregla con `aula whatsapp` o al volver a abrir el aula).
- Postgres: el `sql`/`new SQL()` de Bun abre 10 conexiones de golpe; el rol del alumno admite 15 y las ociosas se cierran
  a los 10 min (Bun.sql y postgres.js reconectan solos). Si se quiere menos carga: `new SQL({ url: process.env.DATABASE_URL, max: 3 })`.
- `aula db`: abre `psql "$DATABASE_URL"` (acepta argumentos: `aula db -c "select 1"`).
- El backend del alumno escucha en el **8766** (`aula parar` libera el puerto del asistente). El Visor reenvía
  `/vista/<sub>/api/<lo-que-sea>` (GET/POST/PUT/PATCH/DELETE del dueño; el personal solo GET) a ese puerto.
- Las aulas creadas antes de este cambio se **recrean solas** la próxima vez que el alumno abre su terminal o su aula: el
  contenedor lleva la etiqueta `jmd.aula.firma` y, si no coincide con la configuración actual, el LMS lo borra y lo crea de
  nuevo con el mismo volumen `/trabajo`.

Memoria (medido el 13-10-2026 en arm64, aula en red interna con el proxy): asistente en marcha 84 MiB del cgroup;
`bun add elysia @elysiajs/cors postgres` 2 s y pico de 150 MiB (con caché de archivos); asistente + Elysia sirviendo 300
peticiones: 119 MiB (anónima 57 MiB; uvicorn 43 MiB y Bun 24 MiB de RSS), 24 procesos. Cabía en 192 MiB pero justo, y los
tmpfs (`/tmp` 64 MB y el home 32 MB) cuentan en el mismo tope: por eso el aula pasa a **384 MiB** (`LMS_AULA_MEMORIA`).
Con 13 alumnos son 5 GB de tope en el servidor de 8 GB; el uso real ronda 120 MiB por aula.

Probar en el Mac:

    docker run --rm jmd/aula:latest sh -c 'bun --version; psql --version'

## DeepSeek Harness dentro del aula

El curso «DeepSeek Harness» corre `dsh` (0.2.1-rc.5) dentro del aula. **El aula sí sale a internet**, pero solo por el
proxy de la clase (`HTTPS_PROXY=http://npm-proxy:8888`, puertos 80 y 443; ver `lms/clase/npm-proxy/`): `aula_net` es
una red `--internal` sin salida directa, y eso no cambia. `dsh` respeta `HTTPS_PROXY`/`NO_PROXY` por sí solo (su paquete
`dsh-http-proxy` instala el despachador de `fetch`): no hace falta `NODE_USE_ENV_PROXY`. La telemetría de `dsh` sale
**directa** (no por el proxy, por diseño de dsh), así que además queda apagada: `DSH_TELEMETRY_DISABLED=1` y
`DSH_TELEMETRY_MODE=DISABLED` en el `ENV`, y `dsh/aula.patch.yml` (pasado con `--patch`) apaga «Upload Session Log»
(`session-log-deepseek`, que por defecto sube a DeepSeek el registro de la sesión) y el exportador OTLP.

Qué hay dónde:

| Pieza | Dónde | Notas |
|---|---|---|
| Node 24.22.2 (musl) | `/usr/local/bin/node` | etapa `node:24.22.2-alpine` (arg `NODE_VERSION`); la etapa falla si Node < 24.9 |
| dsh 0.2.1-rc.5 | `/opt/dsh` y `/usr/local/bin/dsh` | `dsh/instalar.sh`: `npm install --ignore-scripts` y adelgazado (859 MB a 301 MB: un solo `zod` compartido en vez de 50, sin LibreOffice-WASM ni sherpa-onnx, sin mapas/READMEs). Nativos para musl: `node-pty` compilado en la etapa (solo trae prebuilds de glibc) y sin el `koffi` de glibc: con `gcompat` ambos cargaban y daban *Segmentation fault* al mandar el primer mensaje desde `dsh web` |
| capa del aula | `/opt/dsh-aula.patch.yml` | session-log y OTLP apagados |
| resumen de uso | `/usr/local/lib/aula-dsh-uso.mjs` | lo usa `aula dsh "tarea"` (lee `--json`, sin `jq`) |
| comando | `aula dsh clave \| olvidar \| "tarea" \| web [parar] \| estado` | `bin/aula` |
| comandos del botón del LMS | `aula dsh clave -` (clave por stdin), `aula dsh rele - \| borrar`, `aula dsh modo`, `aula dsh abrir` | los usa el botón «Abrir DeepSeek Harness» (ver abajo) |
| estado en el aula | clave `~/.aula-dsh/clave` o relé `~/.aula-dsh/rele` (0600), `DSH_HOME=~/.dsh`, `/tmp/aula-dsh-web.{pid,log,url,firma,modo}` | todo en tmpfs; nada en `/trabajo` (el Visor lo sirve) |

Peso añadido a la imagen: node 122 MB + dsh 301 MB = ~423 MB en disco (~100 MB comprimido). Reconstruir:
`docker build -t jmd/aula:latest lms/aula` (la etapa `dsh` baja ~250 MB de npm: 1 a 5 min según la red).

Variables que el LMS inyecta al crear el aula para la interfaz web (si faltan, `aula dsh web` lo dice y deja el modo terminal):

| Variable | Valor |
|---|---|
| `AULA_SUB` | id del alumno |
| `AULA_DSH_URL` | URL pública raíz de SU interfaz, termina en `/` (p. ej. `https://jmd-learn.online/dsh/<sub>/`) |
| `AULA_DSH_HOST` | autoridad pública (p. ej. `jmd-learn.online`) |

`aula dsh web` lanza `dsh --profile web --no-open --port 3080 --host 127.0.0.1 --public-url "$AULA_DSH_URL"
--trusted-host "$AULA_DSH_HOST"` en segundo plano. El LMS debe reenviar `/dsh/<sub>/...` (quitando el prefijo, WebSocket
incluido) al 3080 del aula por `exec -i` + un relé python3 a `127.0.0.1:3080` (`Aula.Dial`; no `nc`: el de busybox no cierra al cerrar el servidor, ver `lms/api/internal/httpapi/dsh.go`). El servidor
escucha solo en el loopback del contenedor (ni las demás aulas de la red ni el host lo ven) y exige el token de la URL
(sin token: 401); la cookie que entrega es `HttpOnly`/`SameSite=Strict`.

La clave de DeepSeek es del alumno (`aula dsh clave`, se pide sin eco). `dsh --profile headless` ignora la clave guardada
en Ajustes y lee solo `DEEPSEEK_API_KEY`, `<cwd>/.env` o `$DSH_HOME/.env`; por eso `aula` la guarda en `~/.aula-dsh/clave` (tmpfs
del home, 0600, jamás en `/trabajo`) y la pone en el entorno del proceso hijo, sin pasarla por la línea de comandos. Límite: el
agente de `dsh` corre en el mismo usuario y su shell hereda el entorno, así que puede leerla; es la clave del propio alumno.

### Botón «Abrir DeepSeek Harness» (sin terminal)

Para alumnos que no usan la terminal, el LIVE tiene un botón que hace todo esto solo: enciende el aula, guarda la clave
(formulario del LMS, que la escribe por stdin con `aula dsh clave -`), corre `aula dsh abrir` (arranca o reutiliza
`dsh web`; si cambió la clave lo reinicia: `/tmp/aula-dsh-web.firma` guarda la huella de la credencial, nunca la
clave) y abre dsh en una pestaña nueva ya autenticado. Para los grupos con **clave de la clase**, al aula no entra la
clave sino un token del aula y la URL del relé del LMS (`~/.aula-dsh/rele`; `aula` exporta `DEEPSEEK_BASE_URL` y
`DEEPSEEK_SEARCH_BASE_URL` apuntando al LMS y el token como `DEEPSEEK_API_KEY`). Prioridad: clave propia > clave de la
clase > formulario. Qué poner en una escena, variables, topes y seguridad: [`docs/BOTON_DEEPSEEK_HARNESS.md`](../../docs/BOTON_DEEPSEEK_HARNESS.md).

### Memoria con dsh

Medido el 31-10-2026 en arm64 (aula con las opciones reales de `aula.go`, red interna, proxy; clave FALSA, así que el modelo
no respondió: una sesión real con herramientas pesa más):

| Situación | Memoria del cgroup |
|---|---|
| aula en reposo | 2 MiB |
| `dsh web` en reposo (RSS del proceso 212 MiB) | ~155 MiB, pico 175 MiB al cargar la página |
| tarea `dsh` headless (RSS pico 150 MiB) | pico 127 MiB |
| asistente de Osito (`aula iniciar`) | ~47 MiB |
| web + Osito + página cargada + tarea headless a la vez | pico 375 MiB (con 768 MiB; con 384 MiB: 294 MiB, sin OOM) |

`~/.dsh` ocupa 60 KB tras arrancar (cabe de sobra en el tmpfs de 32 MB). `NODE_OPTIONS=--max-old-space-size=...` no baja el
reposo (lo pesado es código y módulos, no el heap) y la tarea headless no mejoró con 96 MB (178 a 197 MiB de RSS, una medición): **no se fija**.
Arranque en frío: `dsh --version` 0,12 s; tarea headless hasta el 401 4,3 s; `aula dsh web` hasta el enlace 5,2 s.
Recomendación: **`LMS_AULA_MEMORIA=768m`** para las clases con dsh (512m basta si solo se usa la web o la terminal por
separado; 384m queda justo en cuanto una sesión real abre herramientas). El tope no es una reserva: 13 aulas a 768m son 10 GB de
tope, pero el uso real ronda los 160 a 300 MiB por aula con dsh.
