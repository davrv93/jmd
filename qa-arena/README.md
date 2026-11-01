# QA Arena

Gamificación del taller «Automatización de pruebas y QA con IA» (01-11-2026). Estilo cómic 2-Tone (ska).
Servicio Go con la web embebida; estado en memoria con copia JSON en disco; SSE para el show y los jugadores.

## URLs

| Página | Local | Producción |
|---|---|---|
| Jugador (celular o laptop) | http://localhost:18630/ | https://jmd-learn.online/qa-arena/ |
| Show (compartir en Zoom) | http://localhost:18630/show | https://jmd-learn.online/qa-arena/show |
| Instructor | http://localhost:18630/admin?clave=… | https://jmd-learn.online/qa-arena/admin?clave=… |

Identidad: en producción el jugador entra con su **sesión del LMS** (misma origen): la página llama a
`/api/v1/me` y se registra sola con nombre y correo (el correo es la clave estable: otro dispositivo = el mismo
héroe). Rol `instructor`/`admin` no compite: ve enlaces al panel y al show. En desarrollo, `ARENA_LOCAL=1`
habilita el formulario de nombre. Tope: 30 héroes activos; el show dibuja 15 en la tira y el resto en lista.

## Puntos

| Fuente | Puntos | Cómo |
|---|---|---|
| Paso del ciclo del LMS (ver, casos, pom, pruebas, motores, portal, monitoreo, preguntar, entregar) | 100 + bono 50/30/20 a los tres primeros | Automático: la página del jugador lee `/api/v1/lessons/qa-01/progress` y lo manda a `api/pasos` al cargar y cada 30 s |
| «Lo logré» de una escena (11 logros) | 100 + bono 50/30/20 | El jugador pide; el instructor aprueba o rechaza en el panel |
| ⚡ Relámpago (12 preguntas en `preguntas.json`) | 50 por acertar + hasta 50 por velocidad (lineal en 20 s) | El instructor lanza; se revela al terminar |
| 🐞 Bug encontrado | 150 | El instructor lo da desde el panel con el texto del bug |

## Correr en local

```bash
ARENA_CLAVE=clave-de-prueba-larga ARENA_LOCAL=1 go run .        # http://localhost:18630
go vet ./... && go test ./...
```

## Desplegar

```bash
LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
```

Compila para linux/amd64, sube el binario, construye `qa-arena:1` en el servidor, levanta el contenedor
(128 MiB, solo lectura, puerto 127.0.0.1:18630, volumen `qa-arena-datos`), y registra `nginx.conf` como
`/etc/nginx/snippets/qa-arena.conf` si no existe. La clave vive en `/home/ubuntu/qa-arena.env`
(`ARENA_CLAVE=…`); si falta, el script la genera y no la imprime. Para copiarla al Mac:

```bash
ssh -i ~/Downloads/curdilmer.pem ubuntu@3.151.56.55 'cut -d= -f2 ~/qa-arena.env' | pbcopy
```

## API

Público: `GET api/estado`, `GET api/eventos` (SSE), `GET api/yo`, `POST api/unirse {nombre, correo}`,
`POST api/pasos {pasos:[…]}`, `POST api/logro {id}`, `POST api/responder {opcion}`.
Admin (cabecera `X-Clave`): `GET api/admin/estado`, `POST api/admin/resolver {id, ok}`,
`POST api/admin/relampago {accion: lanzar|parar, pregunta}`, `POST api/admin/bug {jugador, texto}`,
`POST api/admin/jugador {id, nombre | quitar}`, `POST api/admin/reiniciar`, `GET api/admin/csv`.
