# Decisiones del LMS

Registro de las decisiones que se apartan del prompt original (`LMS_PROMPT_COMPLETO.txt`) o que
no estaban en él, con el porqué. El contrato con `jmd` se respeta; los añadidos van en
`CONTRATO_CAMBIOS.md`.

## 1. Front en Qwik (estático) y backend en Go, no Next.js + Node (2026-10-08)

**Pedido por el instructor**: «front ultraligero como Qwik, backend en Go».

- `lms/web`: Qwik City con el adaptador **estático**. Cada ruta se genera como HTML en el build
  (las rutas con parámetro se enumeran leyendo `lms/content`), y el navegador no ejecuta JS hasta
  que el usuario interactúa. El build pesa ~300 KB de JS en total, repartido en trozos que solo se
  bajan al hacer falta.
- `lms/api`: Go, biblioteca estándar (`net/http` con el router de Go 1.22) y cuatro dependencias:
  SQLite sin CGO (`modernc.org/sqlite`), Markdown (`goldmark`), YAML y OIDC (`go-oidc`).
- **Un solo binario**: el build del front se incrusta con `go:embed`. Un contenedor, sin Node en
  producción. En desarrollo, `npm run dev` hace proxy de `/api` al Go.
- Consecuencia: el front **no hace SSR por petición**. Los datos (cursos, sesiones, progreso)
  los pide el navegador al API con la cookie de sesión. Añadir una sesión nueva requiere
  reconstruir el front (`docker compose up --build`) para que exista su página estática; el
  contenido en sí se recarga en caliente.

## 2. Contenido en archivos versionados, no en la base de datos

«Les dejaré el avance y tareas»: el instructor escribe Markdown y YAML en `lms/content/` y hace
commit. El backend lo lee al arrancar y lo recarga cuando cambia algún archivo. Ventajas: historial
en git, revisión por PR, nada que migrar, y el agente del instructor puede escribir las clases.
La base de datos (SQLite) guarda solo lo que generan los usuarios: cuentas, sesiones, progreso,
preguntas, entregas y notas.

## 3. SQLite en vez de PostgreSQL 16 + Drizzle (por ahora)

Un archivo en un volumen, sin servicio aparte, sin CGO. Para una cohorte es más que suficiente y
mantiene «ultraligero». Todo el acceso pasa por `internal/store`, con SQL estándar, de modo que
pasar a Postgres es cambiar el driver y el DSN cuando haga falta (varias instancias, runner con
cola).

## 4. Identidad: Keycloak cuando esté, cuentas locales hoy

El contrato manda Keycloak y **no implementar OAuth a mano**. Se cumple: con `OIDC_ISSUER` el
LMS hace Authorization Code + PKCE con `go-oidc` y acepta los access tokens del realm (`aud:
lms-api`, JWKS con caché, `iss` y `exp`), leyendo `realm_access.roles` y `groups` como cohortes.
Como la primera clase es hoy y Keycloak no está levantado, hay un **modo local**: el instructor se
crea por variables de entorno y los alumnos se registran con un **código de invitación** que los
deja en la cohorte configurada. Los tokens locales (`lms_…`) se guardan como hash, con caducidad
de 30 días y revocación en `logout`. Cuando Keycloak esté, basta definir `OIDC_*`; las cuentas
locales siguen funcionando para quien las tenga.

## 5. Ciclo de aprendizaje con herramientas

Cada sesión define en su front matter un `cycle`: pasos ordenados, cada uno con la **herramienta**
(Zoom, VS Code, Docker, terminal, jmd, Claude Code/OpenCode, git, LMS) y una **comprobación**
(un comando o una evidencia). El alumno marca cada paso; el instructor ve una tabla alumno × sesión.
Es el hilo conductor de cada clase: ver → instalar → practicar → preguntar → entregar.

## 6. Materiales: enlaces y archivos del repo; Garage y Gotenberg después

Hoy los materiales son enlaces publicados (`kind: link|doc|repo|video|slides|pdf`) o archivos
dentro de `lms/content/courses/<curso>/` (`file:`), servidos solo con sesión y solo si algún
material publicado los referencia. El PDF de cada clase se genera con `lms/scripts/lesson-pdf.mjs`
desde el propio API. Subidas a Garage, conversión de PPT con Gotenberg y URLs prefirmadas quedan
para la fase 2.

## 7. Sin runner ni autocalificación todavía

Las entregas (`repo_url` + `commit_sha`) quedan en `queued` y el instructor califica con la rúbrica
y comentarios (`graded`). El runner con gVisor es la fase 5.

## 8. Seguridad aplicada

Autorización en el servidor en cada endpoint (rol + cohorte del curso + sesión publicada), errores
con el formato del contrato, cookie `HttpOnly` + `SameSite=Lax` y exigencia de `Content-Type:
application/json` en las escrituras con cookie (CSRF), límite de 10 intentos/minuto en login y
registro, cuerpos JSON acotados, rutas de archivos saneadas, cabeceras `nosniff`/`DENY`. Los
secretos solo van en variables de entorno.
