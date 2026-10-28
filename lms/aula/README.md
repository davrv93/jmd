# jmd/aula

Imagen del contenedor que recibe cada alumno en el modo LIVE: shell, `jmd`, `rtk`, los 31 skills del curso (14 del taller, 7 `s2-robo-*` para construir a Robo y 10 `s3-*` para el chatbot de WhatsApp), las plantillas `plan-robo` y `plan-chatbot`
y el código del asistente en modo nube. Sin Node, sin modelos y sin el socket de Docker. Para la clase 3 (chatbot de WhatsApp)
trae además **Bun 1.4.2** (binario musl oficial), `psql` 16 y, como respaldo sin red, `elysia`, `@elysiajs/cors` y `postgres`
ya instalados en `/node_modules` (Bun los encuentra subiendo carpetas desde `/trabajo`).

Construir para el servidor (amd64; hacerlo en el servidor, no en el Mac):

    docker build -t localhost/ai-orchestrator:latest ..        # desde la raíz del repo, si falta
    docker build -t jmd/aula:latest lms/aula

Construir para probar en el Mac (arm64; la `localhost/ai-orchestrator:latest` del Mac es amd64):

    docker build --build-arg JMD_IMAGE=localhost/ai-orchestrator:arm64 -t jmd/aula:latest lms/aula

Medir:

    docker image inspect jmd/aula:latest --format '{{.Size}}'
    docker run --rm jmd/aula:latest sh -c 'command -v node || echo sin-node'
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
