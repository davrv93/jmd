---
id: sor-ej-canasta
title: "Canasta con viento: habilidad en vivo, el servidor arbitra"
summary: "Un juego de habilidad en vivo: cada persona tiene 25 segundos para meter 6 canastas mientras el viento cambia de dirección y de fuerza."
tags: [tiempo-real, websocket, habilidad]
level: avanzado
lesson: sor-03
phase: experimentacion
order: 5
repo:
  url: https://github.com/davrv93/sorteos-con-ia-ejemplos/tree/main/05-canasta-con-viento
  ref: main
---
Un juego de habilidad en vivo: cada persona tiene 25 segundos para meter 6 canastas mientras el viento cambia de dirección y de fuerza. Quien lo logra gana un cupo. La tabla en vivo muestra a todos los jugadores. Cuando el profe pulsa «Cerrar sorteo», entre quienes no ganaron se sortea un premio de consuelo.

## Levántalo (Windows y Mac)

```bash
cd sorteos-con-ia-ejemplos/05-canasta-con-viento
docker compose up -d --build
```

- Sorteo: http://127.0.0.1:8105
- Panel: http://127.0.0.1:8105/admin?k=cambia-esta-clave-larga

## Qué enseña

- **El servidor es el árbitro:** manda el viento, mide el tiempo de cada tiro y decide si entró. La página solo dibuja.
- **Tiempo real:** una conexión WebSocket por pantalla; la tabla y los cupos se actualizan para todos.
- **El profe controla la ronda:** abrir, pausar, cerrar y reabrir desde el panel.
- **Dificultad en `config.json`:** fuerza máxima del viento, tolerancia del tiro y velocidad del medidor.

## El pedido en seis partes

Cópialo, cambia los datos por los tuyos y pégalo en tu agente.

```text
Rol: eres desarrollador de juegos web en tiempo real.

Contexto: al final de mi clase en vivo quiero un minijuego de habilidad para sortear 2 cupos. Juegan
desde el celular mientras yo proyecto la tabla en vivo.

Tarea: crea un juego de basket: cada persona tiene 25 segundos para meter 6 canastas con un medidor
de tiro, mientras el viento cambia cada 3 segundos.

Límites:
- El servidor manda el viento, guarda el tiempo de cada tiro y decide si entró; la página solo dibuja
  y avisa en qué milisegundo se tocó el botón.
- WebSocket para la tabla en vivo; un límite de conexiones por IP.
- El juego empieza en pausa: yo lo abro, pauso y cierro desde el panel.
- Al cerrar, entre quienes tiraron y no ganaron, se sortea un premio de consuelo con crypto/rand.
- Dificultad en config.json (viento máximo, tolerancia, periodos del medidor).
- El premio lo decide el servidor con crypto/rand. La animación solo lo revela.
- El estado se guarda en un archivo JSON dentro de un volumen de Docker (/datos).
- Panel de administración protegido con una clave que viene de una variable de entorno.
- Sin CDN ni librerías externas en la página; el sonido, con Web Audio.
- No inventes premios, fechas ni precios: usa los que te doy.

Formato: un servidor en Go de un solo binario que sirve la página con embed, un Dockerfile de dos
etapas (compila y corre las pruebas dentro de Docker), un compose.yaml que publica solo en 127.0.0.1
y un .env.example con una clave de ejemplo.

Comprobación:
- docker compose up -d --build y el juego abre en http://127.0.0.1:8105.
- Pruebas que simulan tiros perfectos y tiros tarde: el servidor acepta los primeros y rechaza los
  segundos, sin importar lo que diga la página.
- Con el juego en pausa, el servidor rechaza los tiros.
```
