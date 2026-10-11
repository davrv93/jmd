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
es `assignments/tarea-NN.md` con su rúbrica, y un ejemplo es `examples/NN-titulo.md`. Añade el id
de la sesión al módulo en `course.yaml`, haz commit, y el servidor lo recarga solo. Las páginas con
id (`/lessons/<id>/`, `/assignments/<id>/`, `/examples/<id>/`…) se generan una sola vez y el servidor
las sirve para cualquier id, así que el contenido nuevo no obliga a reconstruir el front.

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

## Insignias por clase y publicación en Credly, Badgr o Accredible

Además del certificado del curso, cada clase tiene su **insignia de clase** (microcredencial):
un certificado con `lesson_id`, tipo participación o aprobación, 2 horas por defecto y título
«Clase N · …». Se emite una por alumno desde el avance del curso o **en lote** a toda la cohorte
(`POST /api/v1/admin/certificados/lote`, con la opción «solo a quienes marcaron progreso»). El
PDF de una insignia de clase dice CONSTANCIA; el código (`CD-AAAA-XXXXXX`), la verificación
pública y la credencial Open Badges 3.0 son los mismos que en el certificado del curso.

Lo que exporta el LMS por clase (público, sin sesión):

- `GET /api/v1/insignias/<curso>/<clase>.png` · imagen 600x600 (hexágono con el número de la
  clase). Es la que piden Credly y Badgr al crear la plantilla. También `.svg` y, para el curso,
  `/api/v1/insignias/<curso>.png`.
- `GET /api/v1/insignias/<curso>/<clase>.json` · el logro (Achievement OB3) con los criterios
  («asistir y completar el ciclo de la clase») y `alignment` con los objetivos de la clase.
- Por alumno: `badge.json` (OpenBadgeCredential), `badge.jwt` (firmada, verificable con
  `/.well-known/jwks.json`) y la ficha `/verificar/<codigo>/`.

Y para el personal, el CSV de carga masiva (`?course=<curso>&lesson=<clase>`; sin `lesson`
exporta los certificados del curso; `lesson=*`, todo):

- `GET /api/v1/admin/certificados/export.csv` · genérico, UTF-8 con BOM (Excel):
  `codigo, nombre, apellido, email, insignia, emitido_en (YYYY-MM-DD), url_verificacion,
  url_evidencia, url_insignia_png`.
- `GET /api/v1/admin/certificados/export-badgr.csv` · columnas de la carga masiva de **Canvas
  Credentials / Badgr** tal como las lista su ayuda (`Identifier, First Name, Last Name,
  Narrative, Evidence Narrative, Evidence URL, Issue Date, Expiration Date`; el plan gratuito
  admite 50 filas por archivo). Fuente verificada el 11-10-2026:
  https://community.instructure.com/t5/Canvas-Badges/Awarding-badges-to-a-group-of-recipients-in-bulk/ta-p/528741
  (a ella redirige support.badgr.com). El formato de `Issue Date` no aparece en el texto de la
  página; se envía `YYYY-MM-DD` y, si la plataforma lo rechaza, basta cambiar la columna.
- **No hay `export-credly.csv`**: la plantilla oficial de Credly
  (support.credly.com, artículo 360021221471) responde 403 sin sesión y no se verificó, así que
  no se inventan cabeceras. Credly solo acepta su propia plantilla descargada desde la cuenta;
  copia ahí las columnas del CSV genérico (nombre, apellido, correo, fecha).

Pasos manuales en la plataforma (una sola vez por clase):

1. Crear la **organización emisora**. Credly exige cuenta de organización (de pago en general);
   Badgr / Canvas Credentials tiene emisor gratuito.
2. Crear una **plantilla de insignia por clase**: subir el PNG de la clase, pegar el nombre
   («Clase 1 · Instalar las herramientas…»), la descripción (la del `.json`) y la URL de
   criterios `<base>/courses/programacion-agentica/`.
3. **Importar el CSV** de esa clase (en Credly, la plantilla descargada de la cuenta con los
   datos del genérico; en Badgr, `export-badgr.csv` y emparejar columnas en la pantalla de
   importación).

### Accredible

- `GET /api/v1/admin/certificados/export-accredible.csv?course=&lesson=` · columnas
  `Recipient Name, Recipient Email, Issued on, Credential Code, Verification URL, Badge Image
  URL`. Las tres primeras son las del ejemplo de la guía de carga por hoja de cálculo de
  Accredible; las otras tres se mapean como atributos personalizados en la pantalla de
  importación (Accredible descarga una plantilla por grupo y deja emparejar columnas; si su
  plantilla trae otros nombres, se eligen al subir). Fecha `YYYY-MM-DD`.
- `lms/scripts/accredible.py` · emite por la API: crea el grupo (`POST issuer/groups`) y una
  credencial por fila (`POST credentials` con `recipient`, `issued_on` y `custom_attributes`),
  con `Authorization: Token token="<clave>"` contra `https://api.accredible.com/v1/`.
  Endpoints y cuerpos tomados del SDK oficial `accredible/acms-php-api` (verificado el
  11-10-2026); `--simular` muestra las llamadas sin enviarlas. La imagen de la insignia se
  asigna al grupo desde el panel de Accredible (editor de diseños), no por la API.
- Pasos: crear la cuenta emisora en Accredible (su prueba cubre pocos destinatarios; el acceso a la
  API puede ser un complemento de pago, confirmarlo con ellos) → crear un **grupo por clase** con
  el nombre de la clase y la URL de criterios → en el diseño de la insignia subir el PNG de
  `/api/v1/insignias/<curso>/<clase>.png` → importar el CSV o correr el guion.

No hace falta ninguna plataforma para que las credenciales valgan: ya son Open Badges 3.0
verificables por sí mismas (JSON + JWT firmado + lista de revocación). Un alumno puede importar
el `badge.json` a una mochila como Badgr Backpack o añadir la insignia a LinkedIn con el botón de
«Mis insignias», que enlaza a la ficha pública de verificación.

## Documentación

- [`docs/CONTRATO.md`](../docs/CONTRATO.md): contrato con `jmd` (copia literal).
- [`docs/CONTRATO_CAMBIOS.md`](../docs/CONTRATO_CAMBIOS.md): lo que el LMS añade al contrato.
- [`docs/DECISIONES.md`](../docs/DECISIONES.md): por qué Qwik + Go, contenido en archivos, SQLite, modo local.
- [`docs/PROGRESO.md`](../docs/PROGRESO.md): qué hay y qué falta por fase.
