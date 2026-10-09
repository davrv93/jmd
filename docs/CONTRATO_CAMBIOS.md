# Cambios y añadidos al contrato

El contrato (`CONTRATO.md`) no se cambia por una sola de las partes. Aquí se anota todo lo que el
LMS expone **además** del contrato, y cualquier desviación, para que `jmd` lo adopte si le sirve.

## Añadidos (no rompen nada del contrato)

| Método y ruta | Para qué |
|---|---|
| `GET /api/v1/auth/config` | Qué formas de entrar hay: `{local, register, oidc, issuer?}` |
| `POST /api/v1/auth/login` `{email, password, label?}` → `{token, user}` | **Modo local** (sin Keycloak): el `token` sirve como `Bearer` en todo `/api/v1`. `jmd login` puede usarlo mientras no haya SSO |
| `POST /api/v1/auth/register` `{email, name, password, invite_code}` | Alta de alumno con el código de la cohorte (solo modo local) |
| `POST /api/v1/auth/logout` | Revoca el token o la sesión actual |
| `GET /api/v1/lessons/{id}/progress` · `PUT /api/v1/lessons/{id}/progress/{step}` `{done}` | Ciclo de aprendizaje: pasos hechos por el alumno |
| `GET /api/v1/lessons/{id}/questions` | Hilos de la sesión con respuestas |
| `POST /api/v1/questions/{id}/answers` `{body_md}` · `POST /api/v1/questions/{id}/resolve` `{resolved}` | Responder y marcar resuelta |
| `GET /api/v1/links?course=` | Todos los enlaces publicados (materiales, grabaciones, repos) |
| `GET /api/v1/assignments/{id}/submissions` | Entregas: las propias, o todas si es instructor |
| `POST /api/v1/submissions/{id}/grade` `{score, feedback_md}` | Calificación manual (instructor) |
| `GET /api/v1/courses/{id}/progress` | Avance de cada alumno (instructor) |
| `GET /files/{course}/{ruta}` | Archivos de materiales (p. ej. el PDF de la clase), con sesión |
| `GET /api/v1/admin/users` · `PUT /api/v1/admin/users/{id}` · `POST /api/v1/admin/reload` | Administración |
| `POST /api/v1/run` `{language, code}` | Ejecuta código del alumno en el runner aislado (ver más abajo) |

## Campos extra en respuestas del contrato

- `GET /lessons/{id}`: además de lo del contrato, `course`, `module`, `starts_at`, `published`,
  `cycle`, `content_html`, `progress`, `assignments`, `open_command`, `prev`, `next`; cada material
  lleva también `url`.
- `GET /assignments?course=`: `status` toma `pending · overdue · queued · running · graded · failed`.
- `GET /assignments/{id}`: además `description_html`, `max_score`, `lesson_id`, `course_id`,
  `status`, `my_submissions`, `submit_command`.
- `GET /grades?course=`: además `status`, `course_id`, `feedback_md`, `submission_id`.
- `GET /materials/{id}/download`: hoy los materiales son enlaces o archivos del repo; `url` es el
  enlace (o `/files/...`) y `expires_at` es informativo. Cuando haya Garage será una URL prefirmada.

## Ejemplos (2026-10-09)

Ejemplos prácticos por curso, en `content/courses/<curso>/examples/*.md` (front matter + Markdown,
se recargan solos como las sesiones). Los que llevan `published: false`, o cuelgan de una sesión
en borrador, solo los ve el instructor. Mismo control de acceso que `GET /courses/{id}`.

| Método y ruta | Para qué |
|---|---|
| `GET /api/v1/courses/{id}/examples` | Ejemplos visibles del curso, por `order` y título: `[{id, title, summary, tags, level, lesson_id, lesson_title, repo: {url, ref} \| null, published}]` |
| `GET /api/v1/examples/{id}` | Lo mismo de un ejemplo, más `content_html`, `course: {id, slug, title}`, `prev` y `next` (ids del curso; `""` si no hay) |

`GET /courses` (cada curso) y `GET /courses/{id}` llevan además `examples_total`: cuántos ve quien pregunta.

## Runner de código (2026-10-09)

Los ejemplos del LMS traen un laboratorio: el alumno edita el código y, según el lenguaje, lo
ejecuta o lo previsualiza. La previsualización web (HTML/CSS) es 100 % en el navegador; la
ejecución de Python, Node, Bash y Go pasa por este endpoint.

| Método y ruta | Para qué |
|---|---|
| `POST /api/v1/run` `{language, code}` | Ejecuta `code` y responde `{stdout, stderr, exit_code, duration_ms, timed_out}`. Requiere sesión; límite de 20 ejecuciones por minuto y por usuario. Código ≤ 64 KB |

- Aislamiento (ver `api/internal/runner`): contenedor efímero con `--network=none`, raíz de solo
  lectura, `/tmp` escribible y pequeño, sin capabilities, usuario sin privilegios, CPU/memoria/
  procesos limitados y tiempo máximo (`LMS_RUNNER_TIMEOUT`, por defecto 15 s).
- Se activa con `LMS_RUNNER=docker|podman`; vacío = desactivado y el endpoint responde
  `503 {error:{code:"unavailable"}}`. Al activarlo, el contenedor del LMS necesita acceso al socket
  del motor (aviso de seguridad en `compose.yaml`): mejor un host/VM dedicado al runner.
- No está ligado a la calificación de tareas (`autograde` sigue pendiente): es una herramienta de
  aprendizaje, no la corrección automática.

## Desviaciones (ver DECISIONES.md)

- **Sin runner todavía:** las entregas quedan en `queued` hasta que el instructor califica (pasa a
  `graded`). `checks` llega vacío.- **Modo local de identidad:** mientras no esté Keycloak, los tokens son opacos (`lms_…`). Con
  `OIDC_ISSUER` definido, los JWT del realm con `aud: lms-api` se aceptan tal como dice el contrato.

## Lo que `jmd` y el gateway añaden (2026-10-09)

- **Gateway:** `GET /v1/auth/me` (sub, cohortes, roles y uso de hoy), `POST /v1/auth/exchange`
  (access token del realm → token personal `jg_…` para OpenCode y otros clientes sin refresco),
  `DELETE /v1/auth/token`, y en administración `GET /admin/api/usage` y `GET|DELETE /admin/api/tokens`.
  Configuración en `auth:` de `config.yaml` (issuer, audiencia, cuotas por alumno y cohorte, vida de
  los tokens personales).
- **`jmd login --sso` sin Keycloak:** si `GET /api/v1/auth/config` dice `oidc: false`, pide correo y
  contraseña y usa `POST /api/v1/auth/login` (el token `lms_…` como Bearer), tal como propone este
  documento. Con `--issuer URL` va directo al realm sin pasar por el LMS.
- **MCP del LMS:** mientras el LMS no tenga `/mcp` (fase 6), `jmd mcp serve` lo expone por stdio con la
  cuenta de `jmd` (`lms_courses`, `lms_lesson`, `lms_assignments`, `lms_grades`, `lms_ask`…), y
  `jmd setup claude|opencode` lo registran como servidor `lms`.
- **`jmd lesson open`:** clona el repo en una carpeta con el nombre del repositorio y hace `checkout`
  de la `ref`; los materiales van a `./materiales/` (archivos descargados con sesión; los enlaces,
  en `materiales/enlaces.md`).
- **`jmd submit`:** sondea `GET /api/v1/submissions/{id}` unos segundos; si sigue `queued` (sin
  runner), lo dice y remite a `jmd grades`.
