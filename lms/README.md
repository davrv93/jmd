# LMS · Programación agéntica

Plataforma del curso: clases con objetivos, **ciclo de aprendizaje con herramientas**, enlaces
publicados, preguntas, tareas con rúbrica y notas. Front **Qwik** estático (sin JS hasta que
interactúas) incrustado en un backend **Go** de un solo binario; el temario vive en archivos
(`content/`) y se versiona con git.

```
lms/
  content/   cursos, sesiones (Markdown + YAML) y tareas: aquí dejas el avance y las tareas
  api/       backend Go: /api/v1 (contrato con jmd), login, progreso, preguntas, entregas, front embebido
  web/       front Qwik City (build estático)
  scripts/   lesson-pdf.mjs: el PDF de una clase · e2e.mjs: prueba de punta a punta con Chromium
```

## Arrancar

Con la raíz del repo (`docker compose up` levanta también el gateway de IA):

```bash
cp .env.example .env     # rellena LMS_ADMIN_EMAIL, LMS_ADMIN_PASSWORD, LMS_INVITE_CODE, LMS_COHORT
docker compose up -d --build lms      # o: podman compose up -d --build lms
```

Abre http://localhost:8080. Entra con la cuenta del instructor; los alumnos se registran con el
**código de invitación** y quedan en la cohorte `LMS_COHORT`, que es la que tiene acceso al curso
(`cohorts:` en `content/courses/*/course.yaml`).

Sin contenedores:

```bash
cd lms/web && npm ci && npm run build          # front → web/dist
cd ../api && ./scripts/build.sh                # copia el front y compila bin/lms
LMS_ADMIN_EMAIL=yo@edu LMS_ADMIN_PASSWORD=larga LMS_INVITE_CODE=clase LMS_COHORT=cohorte-2026-2 ./bin/lms
```

En desarrollo: `go run ./cmd/lms` en `api/` (puerto 8080) y `npm run dev` en `web/` (puerto
5173 con proxy de `/api`).

## Escribir una clase

Todo está documentado en [`content/README.md`](content/README.md). En resumen: un archivo
`content/courses/<curso>/lessons/NN-titulo.md` con front matter (objetivos, grabación, repo,
materiales, ciclo de aprendizaje) y el cuerpo en Markdown (avance, conceptos, tareas); una tarea
es `assignments/tarea-NN.md` con su rúbrica. Añade el id de la sesión al módulo en `course.yaml`,
haz commit, y el servidor lo recarga solo (si es una sesión **nueva**, reconstruye el front para
que exista su página: `docker compose up -d --build lms`).

El PDF de una clase:

```bash
cd lms/web && LMS_EMAIL=yo@edu LMS_PASSWORD=… node ../scripts/lesson-pdf.mjs http://localhost:8080 pa-01 ../content/courses/programacion-agentica/materials/clase-01.pdf
```

y se publica como material con `kind: pdf` y `file: materials/clase-01.pdf`.

## Identidad

- **Hoy (modo local):** instructor por variables de entorno; alumnos con código de invitación;
  token `lms_…` como `Bearer` para `jmd` (`POST /api/v1/auth/login`).
- **Con Keycloak:** define `OIDC_ISSUER` (`https://auth.<dominio>/realms/lms`), `OIDC_CLIENT_ID`
  (`lms-web`) y, si el cliente es confidencial, `OIDC_CLIENT_SECRET`. El botón «Entrar con mi
  cuenta (SSO)» aparece solo, y los access tokens del realm con `aud: lms-api` valen en `/api/v1`
  tal como dice el [contrato](../docs/CONTRATO.md). Roles del realm: `admin`, `instructor`,
  `student`; grupos = cohortes.

## Pruebas

```bash
cd lms/api && go test ./...                    # contrato, roles, progreso, entregas, preguntas, archivos
cd lms/web && npm run build                    # typecheck + lint + build estático
# punta a punta (con el servidor arriba en :8080 y Chromium):
cd lms/web && PLAYWRIGHT_CHROMIUM=/ruta/a/chrome node ../scripts/e2e.mjs http://localhost:8080
```

## Documentación

- [`docs/CONTRATO.md`](../docs/CONTRATO.md): contrato con `jmd` (copia literal).
- [`docs/CONTRATO_CAMBIOS.md`](../docs/CONTRATO_CAMBIOS.md): lo que el LMS añade al contrato.
- [`docs/DECISIONES.md`](../docs/DECISIONES.md): por qué Qwik + Go, contenido en archivos, SQLite, modo local.
- [`docs/PROGRESO.md`](../docs/PROGRESO.md): qué hay y qué falta por fase.
