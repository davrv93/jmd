# Progreso del LMS

## Fase 0-1 (hecho, 2026-10-08): base, identidad, cursos y la clase 1

**Plan:** levantar un LMS mínimo pero completo para dar la primera clase hoy: login, cursos →
módulos → sesiones con objetivos, enlaces publicados, ciclo de aprendizaje con herramientas,
preguntas, tareas con entrega y nota, y el contrato `/api/v1` para `jmd`.

**Hecho**

- `lms/api` (Go): contrato 2.2 completo salvo lo que depende de servicios que no existen aún
  (Garage, runner), más los añadidos de `CONTRATO_CAMBIOS.md`. Pruebas de contrato con
  `httptest` (`go test ./...`): formato de errores, roles y cohortes, borradores ocultos,
  progreso, entregas y notas, preguntas, CSRF, archivos.
- `lms/web` (Qwik estático): entrar/registro/SSO, cursos, curso, sesión (objetivos, grabación,
  repo, ciclo con checkboxes, enlaces por objetivo, contenido, tareas, preguntas), tarea (enunciado,
  rúbrica, entrega, mis entregas; calificación si eres instructor), enlaces, mis notas,
  instructor (avance alumno × sesión).
- `lms/content`: curso **Programación agéntica**, **Clase 1** (instalación de jmd, VS Code y
  Docker; qué son Docker, VS Code, un agente, un proveedor, un modelo, los parámetros, RTK,
  caveman, MCP, skills con ejemplos) con 9 pasos de ciclo y 16 enlaces, **Tarea 1** con rúbrica,
  y el **PDF** de la clase.
- `docker compose up --build` levanta el gateway y el LMS; CI compila front, API e imagen.
- Prueba de punta a punta con Chromium (registro → sesión → marcar pasos → pregunta → entrega →
  instructor califica → sin sesión redirige al login).

**No hecho (siguientes fases)**

- Keycloak levantado con el realm `lms` exportado (`infra/keycloak/realm.json`) y federación con
  Google/GitHub/Microsoft. El código OIDC está listo; falta el servicio y probarlo.
- Fase 2: subida de archivos a Garage, PPT → PDF con Gotenberg, visor PDF.js.
- Fase 3: árbol de archivos y diffs del repo de la sesión, Sandpack.
- Fase 5: runner con gVisor y autocalificación.
- Fase 6: servidor MCP del LMS en `/mcp`.
- ~~`jmd`: `login --sso`, `courses`, `lesson open`, `submit`, `grades`, `ask` contra este API.~~
  **Hecho (2026-10-09, v0.4.0):** `jmd login --sso` (PKCE con navegador, `--device`, y modo local
  con correo y contraseña mientras no haya Keycloak), `logout`, `whoami`, `token`, `courses`,
  `course`, `lesson`, `lesson open`, `materials pull`, `assignments`, `assignment`, `submit`,
  `grades`, `ask --line`; el gateway valida los access tokens del realm (`aud: ai-gateway`) con
  cuotas por alumno y cohorte y emite tokens personales; `jmd setup claude|opencode` conectan a
  los agentes con la cuenta (`apiKeyHelper`) y registran el MCP `lms` (`jmd mcp serve`). Probado
  de punta a punta contra un realm y un LMS simulados (`tests/jmd_cli.rs`, `tests/gateway.rs`).
  Falta probarlo contra Keycloak de verdad cuando esté levantado.
