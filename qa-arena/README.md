# QA Arena

Gamificación del taller «Automatización de pruebas y QA con IA» (01-11-2026). Estilo cómic 2-Tone (ska).
Servicio Go con la web embebida; estado en memoria con copia JSON en disco; SSE para el show y los jugadores.

## URLs

| Página | Local | Producción |
|---|---|---|
| Jugador (celular o laptop) | http://localhost:18630/ | https://jmd-learn.online/qa-arena/ |
| Show (compartir en Zoom) | http://localhost:18630/show | https://jmd-learn.online/qa-arena/show |
| Instructor (rol instructor/admin del LMS, sin clave) | http://localhost:18630/admin | https://jmd-learn.online/qa-arena/admin |

Identidad **del lado del servidor**: la arena toma la cookie `lms_session` de cada petición (mismo origen) y
pregunta al LMS (`ARENA_LMS`, por defecto https://jmd-learn.online) `GET /api/v1/me`; caché de 60 s por
cookie. El alta es automática en el primer `GET api/yo` (correo = clave estable; nombre = el del LMS; homónimos
con inicial). Rol `instructor`/`admin` no compite y es el admin: `/admin` y `api/admin/*` no tienen clave.
Nada que mande el cliente decide identidad ni puntos. En desarrollo, `ARENA_LOCAL=1` habilita el formulario
de nombre y abre el admin. Tope: 30 héroes activos; el show dibuja 15 en la tira y el resto en lista.

## Puntos

| Fuente | Puntos | Cómo |
|---|---|---|
| Paso del ciclo del LMS (ver, casos, pom, pruebas, motores, portal, monitoreo, preguntar, entregar) | 100 + bono 50/30/20 a los tres primeros | Automático: el servidor lee `/api/v1/lessons/qa-01/progress` con la cookie del alumno en cada `POST api/pasos` (al cargar y cada 30 s) y además refresca a todos cada 60 s con la última cookie válida (solo en memoria) |
| «Lo logré» de una escena (11 logros) | 100 + bono 50/30/20 | El jugador pide; el instructor aprueba o rechaza en el panel |
| ⚡ Relámpago (12 preguntas en `preguntas.json`) | 50 por acertar + hasta 50 por velocidad (lineal en 20 s) | El instructor lanza; se revela al terminar |
| 🐞 Bug encontrado | 150 | El instructor lo da desde el panel con el texto del bug |

## Correr en local

```bash
ARENA_LOCAL=1 go run .        # http://localhost:18630 (formulario de nombre, admin abierto)
go vet ./... && go test ./...
```

## Desplegar

```bash
LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
```

Compila para linux/amd64, sube el binario, construye `qa-arena:1` en el servidor, levanta el contenedor
(128 MiB, solo lectura, puerto 127.0.0.1:18630, volumen `qa-arena-datos`, `ARENA_LMS=https://jmd-learn.online`),
y registra `nginx.conf` como `/etc/nginx/snippets/qa-arena.conf` si no existe. No hay clave que copiar.

## API

Público (con la cookie del LMS): `GET api/estado`, `GET api/eventos` (SSE), `GET api/yo` (alta automática; `staff:true` para instructores),
`POST api/pasos` (sin cuerpo), `POST api/logro {id}`, `POST api/responder {opcion}`.
Admin (rol instructor/admin del LMS): `GET api/admin/estado`, `POST api/admin/resolver {id, ok}`,
`POST api/admin/relampago {accion: lanzar|parar, pregunta}`, `POST api/admin/bug {jugador, texto}`,
`POST api/admin/jugador {id, nombre | quitar}`, `POST api/admin/reiniciar`, `GET api/admin/csv`.
