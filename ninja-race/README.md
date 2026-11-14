# Ninja Race · sorteo cómic con carrera (link aparte del LMS)

Sorteo en forma de carrera ninja para **jmd learning**: **1 corredor contra 2 cpu**
(KAGE y YUKI) en tres carriles con la misma pista. Cada corredor tiene **3 vidas**:
cada choque consume una y lo frena, pero nadie queda eliminado por un golpe. El
**marcador crece mientras dure sin caerse** (10 puntos por segundo vivo y 5 por
obstáculo esquivado).

## Premios

| Resultado | Premio |
|---|---|
| **Mejor puntaje de la carrera** (le gana a los 2 cpu) | Código del **100 % de Claude Code PRO** (cupos limitados) |
| El resto | Descuento **aleatorio entre 40 % y 70 %** del mismo curso |
| Quien ya ganó el sorteo de Claude | Corre igual, pero su descuento es **para otro curso** |

Un premio por persona: la primera carrera válida decide. La duración mínima
(`min_ms`, 15 s por defecto) la fija el servidor; más corto que eso no premia.

### El participante nunca ve que ganó (cierra a medianoche)

Mientras el sorteo está **abierto**, el corredor solo ve **su posición**
(«¡Vas primero! 🥇» o «Vas 2.º de 3»), su puntaje y este aviso:

> El sorteo cierra a medianoche 🕛. Ahí se anuncian los ganadores y se entregan los cupones.

Ni `/api/terminar`, ni `/api/yo`, ni el acta pública (`/api/estado`) devuelven
premio, descuento, cupo, código, ni siquiera «ya estás premiado». El cupón sí se
emite en silencio y queda guardado para el instructor en `/admin`.

**Cierre:** automático a **medianoche de Lima** (`config.cierre`; si el estado es
viejo y no tiene, se calcula al arrancar) o a mano desde `/admin` → «Cerrado ya».
Al cerrar se publica el acta, `/api/yo` revela cada premio con su código, el QR
de WhatsApp y el enlace de matrícula, y ya **no se registra ni se corre** (409).

Cada premio sale con su **código de cupón** y un **QR** que abre WhatsApp con el
mensaje ya escrito (visible recién al cierre):

> He ganado 60 % de descuento en el curso Claude Code PRO y mi código de cupón es CCP-XXXXXX

Los códigos los emite la API del sorteo de Claude Code PRO
(`POST /api/admin/codigo {"descuento": N}`), así que valen en su matrícula:
`https://jmd-learn.online/sorteo-claude/matricula?c=<código>`.

## El servidor manda

- La **salida** la toma el servidor (`POST /api/correr`) y en `terminar` el tiempo
  válido nunca pasa de lo que él vio correr.
- Las **esquivadas** se limitan por el tiempo real: como mínimo 1,1 s entre
  obstáculos, nadie puede declarar 500 en 8 segundos.
- Los **cupos del 100 %** y el descuento aleatorio se deciden con `crypto/rand`
  en el servidor; el cliente solo reporta el puesto y los puntajes de los cpu.
- Un registro por nombre y por WhatsApp, con tope por conexión al día.

## Rutas

| Ruta | Qué hay |
|---|---|
| `GET /` | La carrera: registro, pista y premio |
| `GET /admin` | Panel del instructor (cabecera `X-Clave`) |
| `GET /api/estado` | Récord, cupos, carreras y acta (sin nombres completos) |
| `POST /api/inscribir` | `{nombre, telefono}` → token |
| `POST /api/correr` / `api/tick` / `api/terminar` | Salida, latido y llegada |
| `GET /api/qr?u=https://wa.me/…` | QR del cupón (PNG) |
| `GET,POST /api/admin/*` | `estado`, `config`, `codigo` (reemitir), `reiniciar` |

## Desarrollo

```bash
SORTEO_CLAVE=una-clave-larga go run .          # http://127.0.0.1:18595
go test ./...                                   # reglas de premio y anti-trampa
python3 procesar_personajes.py /ruta/del/kit    # regenera hojas y obstáculos
```

`procesar_personajes.py` convierte las láminas del kit `Ninja_Race_Kit` (que
traen fondo, títulos y números) en tres hojas de 18 celdas: quita el fondo,
recorta **cada frame dentro de sus límites**, filtra restos vecinos pegados al
borde y remuestrea el alfa premultiplicado para que no queden halos. También
genera `pista_cinco_carriles.webp` desde el fondo original de 1672×941.

El juego usa esa pista en 16:9 con cinco carriles dibujados; jugador y dos CPU
corren por los **tres carriles centrales**. El fondo incluye compuertas de salida
y meta, por eso queda fijo y no se tilea. En impactos, ninja permanece opaco:
invulnerabilidad se indica con un aro dorado, no con parpadeos transparentes.

**Balance de la carrera** (medido con simulación de 300 carreras): los huecos de
la pista se calculan **en segundos** (1,9 a 2,8 s, más 6,5 s de arranque limpio),
no en píxeles — antes, al subir la velocidad, los obstáculos se volvían una ráfaga
y el cpu perdía sus 3 vidas a los **16,6 s** en el 99 % de las carreras. Ahora el
cpu dura **~145 s** (sobrevive al tope de 90 s en 2 de cada 3 carreras) fallando
1 de cada 10 saltos (`F.fallaCpu`), así que el 100 % se gana corriendo de verdad.

## Despliegue (EC2 de Dilmer)

```bash
LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
```

El contenedor queda en `127.0.0.1:18595` con su volumen en `~/ninja-race/datos`
(`estado.json`). Espera `/home/ubuntu/ninja-race/.env` (permiso 600):

```
SORTEO_CLAVE=<clave del admin>
SORTEO_DATOS=/datos
CLAUDE_ADMIN_URL=http://host.docker.internal:18560
CLAUDE_ADMIN_CLAVE=<SORTEO_CLAVE del sorteo de Claude>
```

nginx (una sola vez, ver `lms/nginx/ninja-race.conf`):

```bash
ssh -i ~/Downloads/curdilmer.pem ubuntu@3.151.56.55
sudo cp ~/jmd/lms/nginx/ninja-race.conf /etc/nginx/snippets/ninja-race.conf
# dentro del server { } del 443, ANTES de «location / {»:
#   include /etc/nginx/snippets/ninja-race.conf;
sudo nginx -t && sudo systemctl reload nginx
```

Queda publicado en **`https://jmd-learn.online/ninja-race/`**, separado del LMS y
de la sesión de clase. El panel del instructor es
`https://jmd-learn.online/ninja-race/admin`.

Los excluidos se mantienen solos: al arrancar y cada 15 minutos el contenedor
lee `GET /api/admin/estado` del sorteo de Claude (`CLAUDE_ADMIN_URL` +
`CLAUDE_ADMIN_CLAVE`), agrega los participantes que ya tienen código propio y
su lista de `excluidos`/`excluidosTel`, y los une a los que cargues a mano desde
`/admin` (uno por línea; los celulares, en la lista de al lado). Quien ya ganó
allá corre igual, pero su premio es siempre el descuento del curso que elijas.
