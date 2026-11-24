---
id: sor-01
title: "Parte 1 · El sorteo justo: el servidor decide"
published: true
duration: 30
objectives:
  - {id: sor-01-o1, title: "Explicar por qué el premio se decide en el servidor y la animación solo lo revela"}
  - {id: sor-01-o2, title: "Levantar un sorteo de ejemplo con Docker en Windows o Mac y usar su panel"}
  - {id: sor-01-o3, title: "Pedirle a un agente un sorteo completo con el pedido en seis partes"}
materials:
  - {id: sor-01-repo, title: "Repo en GitHub · los seis sorteos de ejemplo, listos para levantar con Docker", kind: link, url: https://github.com/davrv93/sorteos-con-ia-ejemplos}
  - {id: sor-01-v00, title: "Video · Introducción: seis sorteos y la regla de oro", kind: video, file: materials/grabaciones/00-introduccion.mp4, objective_ids: [sor-01-o1]}
  - {id: sor-01-v01, title: "Video 1 · La ruleta de un solo premio", kind: video, file: materials/grabaciones/01-ruleta-un-premio.mp4, objective_ids: [sor-01-o1, sor-01-o2]}
  - {id: sor-01-v02, title: "Video 2 · Ruleta con cupos limitados", kind: video, file: materials/grabaciones/02-ruleta-con-cupos.mp4, objective_ids: [sor-01-o2, sor-01-o3]}
cycle:
  - id: ver
    title: Mira la introducción y el video 1
    tool: lms
    phase: experiencia
    description: Seis sorteos en dos minutos y, luego, la ruleta de un premio paso a paso.
    check: Viste los dos videos
  - id: jugar
    title: Levanta la ruleta en tu computadora
    tool: docker
    phase: experiencia
    description: Descarga el repositorio, entra a 01-ruleta-un-premio y ejecuta docker compose up -d --build. Gira desde tu celular o desde otra pestaña.
    check: La ruleta abre en http://127.0.0.1:8101 y tu giro aparece en el panel
  - id: pensar
    title: ¿Dónde se decide el premio?
    tool: lms
    phase: reflexion
    description: Responde con tus palabras qué pasaría si el premio se decidiera en la página y no en el servidor. Pista — cualquiera puede abrir las herramientas del navegador.
    check: Tienes tu respuesta en una o dos frases
  - id: seis
    title: El pedido en seis partes
    tool: lms
    phase: conceptualizacion
    description: Rol, contexto, tarea, límites, formato y comprobación. Mira el video 2 y compara su pedido con la plantilla de esta parte.
    check: Puedes decir qué va en cada una de las seis partes
  - id: crear
    title: Pide tu ruleta a tu agente
    tool: claude-code
    phase: experimentacion
    description: Copia la plantilla, cambia los datos por los de tu clase o tu tienda y pídesela a tu agente (Claude Code, OpenCode o DeepSeek).
    check: Tu ruleta se levanta con docker compose y respeta tus topes
---
## Parte 1 · El sorteo justo: el servidor decide

Curso en modalidad web: mira los videos en orden y replica cada paso en tu computadora con el repositorio.

1. **Introducción** (2 a 3 minutos): los seis ejemplos y la regla de oro.
2. **Video 1:** la ruleta de un solo premio. El giro ganador se elige al crear el sorteo y siempre hay ganador.
3. **Video 2:** la ruleta con cupos. Pocos premios grandes, nadie se va sin descuento, y el reclamo por WhatsApp con QR.

### La regla de oro

> El premio lo decide **el servidor**, con azar criptográfico (`crypto/rand`). La animación solo lo revela.

Si el premio se decidiera en la página, cualquiera podría verlo o cambiarlo desde el navegador. Por
eso, en los seis ejemplos, la página solo dibuja y el servidor guarda el resultado.

### Levanta el primer ejemplo (Windows y Mac)

Con Docker Desktop abierto:

```bash
git clone https://github.com/davrv93/sorteos-con-ia-ejemplos.git
cd sorteos-con-ia-ejemplos/01-ruleta-un-premio
docker compose up -d --build
```

Sin Git: en GitHub, botón **Code › Download ZIP**. Abre **http://127.0.0.1:8101** y el panel en
**http://127.0.0.1:8101/admin?k=cambia-esta-clave-larga**.

### El pedido en seis partes

| Parte | Responde a |
|---|---|
| 1 · Rol | ¿Quién debe ser el agente? |
| 2 · Contexto | ¿Para quién es y en qué situación se usa? |
| 3 · Tarea | ¿Qué debe hacer? Una sola tarea, con un verbo. |
| 4 · Límites | ¿Qué no debe hacer ni inventar? |
| 5 · Formato | ¿Cómo quieres recibir el resultado? |
| 6 · Comprobación | ¿Cómo sabremos que está bien? Algo que se ve o se ejecuta. |

Copia esta plantilla, cambia lo que está entre corchetes y pégala en tu agente:

```prompt
Rol: eres desarrollador web full stack y diseñador de juegos para eventos en vivo.

Contexto: hago un sorteo para [mi clase / mi tienda / mi evento] de [número] personas. Lo abren
desde el celular, con un QR o un enlace de WhatsApp. Yo lo administro desde mi laptop.

Tarea: crea el sorteo «[nombre]»: [la mecánica en una o dos frases].

Límites:
- El premio lo decide el servidor con crypto/rand. La animación solo lo revela.
- Una participación por persona (por número de WhatsApp o por navegador).
- Topes de premios en un archivo config.json, no en el código.
- El estado se guarda en un archivo JSON dentro de un volumen de Docker.
- Panel de administración protegido con una clave que viene de una variable de entorno.
- Sin librerías externas en la página ni CDN; todo el sonido con Web Audio.
- No inventes premios, fechas ni precios: usa los que te doy.

Formato: un servidor en Go de un solo binario que sirve la página (embed), un Dockerfile de dos
etapas, un compose.yaml que publica en 127.0.0.1 y un .env.example con la clave de ejemplo.

Comprobación:
- docker compose up -d --build levanta el sorteo en http://127.0.0.1:[puerto].
- Juego dos veces con el mismo número: la segunda vez no me deja volver a jugar.
- Pruebas en Go que simulan 10 000 participaciones y confirman que nadie pasa los topes.
```

Reglas que conviene repetir en cada pedido:

1. Una tarea por pedido. Si son tres cosas, son tres pedidos.
2. La comprobación es algo que se ve o se ejecuta: un archivo, un comando, una prueba que pasa.
3. Nunca le pegues al agente una clave real. Usa la clave de ejemplo.
4. Usa `127.0.0.1` y no `localhost`.
5. Si algo no se puede comprobar, que el agente lo diga en lugar de darlo por hecho.

Los pedidos exactos de cada ejemplo están en la sección **Ejemplos** del curso y en el `PROMPT.md` de cada carpeta.

**Entregable:** tu ruleta, con tus premios, levantada en tu computadora.
