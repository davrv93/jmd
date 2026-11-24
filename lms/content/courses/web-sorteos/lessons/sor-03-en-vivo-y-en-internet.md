---
id: sor-03
title: "Parte 3 · En vivo y en internet"
published: true
duration: 30
objectives:
  - {id: sor-03-o1, title: "Hacer un juego de habilidad en vivo donde el servidor es el árbitro"}
  - {id: sor-03-o2, title: "Administrar una ronda en vivo desde el panel: abrir, pausar y cerrar"}
  - {id: sor-03-o3, title: "Publicar tu sorteo en un servidor con HTTPS sin exponer la clave"}
materials:
  - {id: sor-03-repo, title: "Repo en GitHub · ejemplo 05 (canasta con viento) y el prompt para publicar", kind: link, url: https://github.com/davrv93/sorteos-con-ia-ejemplos}
  - {id: sor-03-v05, title: "Video 5 · Canasta con viento", kind: video, file: materials/grabaciones/05-canasta-con-viento.mp4, objective_ids: [sor-03-o1, sor-03-o2]}
cycle:
  - id: ver
    title: Mira el video 5
    tool: lms
    phase: experiencia
    description: Un juego de basket de 25 segundos con viento, una tabla en vivo y un panel para el profe.
    check: Viste el video
  - id: jugar
    title: Juega con dos pantallas
    tool: docker
    phase: experiencia
    description: En 05-canasta-con-viento, levántalo, abre el panel y pulsa «Abrir». Juega en dos pestañas y mira cómo se mueve la tabla en vivo.
    check: Las dos pestañas aparecen en la tabla en vivo
  - id: arbitro
    title: ¿Quién decide si entró?
    tool: lms
    phase: reflexion
    description: Anota qué datos manda la página y qué decide el servidor en cada tiro. ¿Qué pasaría si la página dijera «entró» por su cuenta?
    check: Tienes la lista de lo que decide cada lado
  - id: publicar
    title: Publicar sin regalar tu clave
    tool: terminal
    phase: conceptualizacion
    description: Lee el pedido para publicar — contenedor solo en 127.0.0.1, nginx con HTTPS delante y la clave en un .env con permisos 600.
    check: Puedes explicar por qué el contenedor no se publica directo a internet
  - id: final
    title: Tu proyecto final
    tool: claude-code
    phase: experimentacion
    description: Tu propio sorteo o juego, con tus premios y topes, levantado con Docker. Si tienes servidor, publícalo con el pedido de esta parte.
    check: Tu sorteo funciona y su panel pide clave
---
## Parte 3 · En vivo y en internet

**Canasta con viento (video 5):** cada persona tiene 25 segundos para meter 6 canastas mientras el
viento cambia. El servidor manda el viento, mide cada tiro y decide si entró; la página solo dibuja.
La tabla se actualiza en vivo para todos por WebSocket.

El juego empieza en pausa. Ábrelo desde el panel antes de compartir el enlace:

```bash
cd sorteos-con-ia-ejemplos/05-canasta-con-viento
docker compose up -d --build
# panel: http://127.0.0.1:8105/admin?k=cambia-esta-clave-larga  → «Abrir»
```

La dificultad está en `config.json`: la fuerza máxima del viento, la tolerancia del tiro y la
velocidad del medidor.

### Publicar en tu servidor

Cuando tu sorteo funciona en tu computadora, este pedido lo deja en internet con HTTPS:

```text
Rol: eres administrador de sistemas Linux.

Contexto: tengo un servidor Ubuntu con Docker y nginx, y el dominio [midominio.com] con HTTPS.
Quiero publicar el sorteo de la carpeta [04-puertas-piramide] en https://[midominio.com]/piramide/.

Tarea: publica el sorteo detrás de nginx en esa ruta.

Límites:
- El contenedor escucha solo en 127.0.0.1; nginx es el único que da la cara a internet.
- Contenedor de solo lectura, sin capacidades (cap_drop ALL), con límite de memoria y un volumen
  para los datos.
- Genera la clave del panel en el servidor, guárdala en un .env con permisos 600 y no la imprimas.
- Antes de tocar la configuración de nginx, haz una copia; valida con nginx -t antes de recargar.
- No reinicies ni toques otros contenedores.

Formato: los comandos en orden y el bloque location de nginx.

Comprobación: curl -I https://[midominio.com]/piramide/ responde 200 y /piramide/admin sin clave
responde 401 o 404.
```

### Antes de usarlo con gente real

- Cambia el número de WhatsApp de ejemplo (`51900000000`) por el tuyo, y la clave del panel.
- Pide solo los datos que necesitas para entregar el premio y di para qué los usas.

**Proyecto final:** tu propio sorteo o juego, con tus premios, levantado con Docker y con su panel protegido.
