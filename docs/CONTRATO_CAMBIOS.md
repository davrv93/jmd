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

## Desviaciones (ver DECISIONES.md)

- **Sin runner todavía:** las entregas quedan en `queued` hasta que el instructor califica (pasa a
  `graded`). `checks` llega vacío.
- **Modo local de identidad:** mientras no esté Keycloak, los tokens son opacos (`lms_…`). Con
  `OIDC_ISSUER` definido, los JWT del realm con `aud: lms-api` se aceptan tal como dice el contrato.
