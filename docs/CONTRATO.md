# Contrato LMS ⇄ jmd ⇄ gateway (v1)

Copia literal del contrato del prompt del LMS (`docs/LMS_PROMPT_COMPLETO.txt`). Es la fuente de verdad compartida con `jmd`; los cambios se anotan en `CONTRATO_CAMBIOS.md`, nunca aquí.
### 2.1 Identidad (Keycloak, realm `lms`)

| Cosa | Valor |
|---|---|
| Issuer | `https://auth.<dominio>/realms/lms` (descubrimiento en `/.well-known/openid-configuration`) |
| Cliente CLI | `jmd-cli`, **público**, sin secreto |
| Flujo principal | Authorization Code + PKCE `S256` |
| Redirección | `http://127.0.0.1:{puerto}/callback`, con cualquier puerto (loopback, RFC 8252). `jmd` abre un puerto libre, lanza el navegador y espera el `code` |
| Flujo sin navegador | Device Authorization Grant (`jmd login --device`): muestra la URL y el código |
| Scopes | `openid profile email offline_access lms:read lms:submit ai:use` |
| Audiencias del access token | `lms-api` (el LMS) y `ai-gateway` (el gateway de IA). Un *audience mapper* en Keycloak añade las dos |
| Claims usados | `sub`, `email`, `name`, `realm_access.roles` (`admin` · `instructor` · `student`), `groups` (cohortes, p. ej. `/cohorte-2026-1`) |
| Vida | access token 15 min · refresh 30 días con rotación · revocación en `jmd logout` |
| Guardado en el cliente | llavero del sistema (macOS Keychain, Windows Credential Manager, Secret Service); si no hay llavero, `~/.config/jmd/tokens.json` con permisos 600 |

### 2.2 API del LMS para `jmd` y para MCP (`/api/v1`, Bearer = access token)

Errores con el mismo formato en todos los endpoints:
`{"error": {"code": "not_found", "message": "…"}}` y el código HTTP que corresponda.

| Método y ruta | Respuesta (lo mínimo que `jmd` usa) |
|---|---|
| `GET /api/v1/me` | `{id, email, name, roles: [...], cohorts: [...]}` |
| `GET /api/v1/courses` | `[{id, slug, title, role}]` |
| `GET /api/v1/courses/{id}` | `{id, title, modules: [{id, title, lessons: [{id, title, starts_at, published}]}]}` |
| `GET /api/v1/lessons/{id}` | `{id, title, objectives: [{id, title}], recording: {url, passcode?} \| null, repo: {url, ref} \| null, materials: [{id, title, kind, objective_ids}]}` |
| `GET /api/v1/materials/{id}/download` | `{url, expires_at, filename}`: URL prefirmada (Garage) |
| `GET /api/v1/assignments?course={id}` | `[{id, title, due_at, status}]` |
| `GET /api/v1/assignments/{id}` | `{id, title, description_md, due_at, rubric: [...], autograde: bool}` |
| `POST /api/v1/assignments/{id}/submissions` | Cuerpo `{repo_url, commit_sha, notes?}` → `201 {id, status: "queued"}` |
| `GET /api/v1/submissions/{id}` | `{id, status: queued\|running\|graded\|failed, score?, max_score?, feedback_md?, checks: [...]}` |
| `GET /api/v1/grades?course={id}` | `[{assignment_id, title, score, max_score, graded_at}]` |
| `POST /api/v1/lessons/{id}/questions` | Cuerpo `{body_md, code_ref?: {path, line}, video_ts?: seconds}` → `201 {id, url}` |

### 2.3 Comandos de `jmd` que dependen del LMS (los implementa este repo)

| Comando | Hace |
|---|---|
| `jmd login --sso [--issuer URL]` / `--device` | OIDC según 2.1; guarda los tokens; `jmd whoami` muestra `/me` |
| `jmd logout` | Revoca el refresh token y lo borra |
| `jmd courses` · `jmd course <id>` | Lista cursos y su temario |
| `jmd lesson <id>` | Objetivos, materiales, grabación, repo |
| `jmd lesson open <id>` | `git clone` del repo en la ref de la sesión y descarga de los materiales a `./materiales/` |
| `jmd materials pull <lesson>` | Solo los materiales |
| `jmd assignments` · `jmd assignment <id>` | Tareas y enunciado |
| `jmd submit <assignment>` | Envía el `origin` y el `HEAD` del repo actual (pide confirmación si hay cambios sin commit o sin push) y sigue el estado hasta la nota |
| `jmd grades` | Notas |
| `jmd ask <lesson> "…"` | Publica una pregunta; con `--line archivo:N` cita código |
| `jmd setup claude\|opencode` | Además de lo actual, registra el servidor MCP del LMS en el agente |

### 2.4 Gateway de IA con la misma cuenta

- El gateway acepta, además de las claves estáticas, **access tokens del realm** con audiencia
  `ai-gateway`. Los valida con el JWKS del issuer (con caché) y comprueba `exp`, `iss` y `aud`.
- Cuotas por usuario y por cohorte (peticiones/día y tokens/día) configurables en su UI. La
  telemetría registra `sub` y la cohorte, y no guarda el email.
- `jmd chat`, Claude Code y OpenCode usan el token del alumno. `jmd` lo refresca antes de que
  venza, y para Claude Code se usa `apiKeyHelper`, un comando que devuelve un token fresco.
