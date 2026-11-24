---
id: sor-ej-ruleta
title: "Ruleta de un premio: siempre hay ganador"
summary: "Una ruleta de 12 casillas con un solo premio."
tags: [ruleta, azar, docker]
level: básico
lesson: sor-01
phase: experimentacion
order: 1
repo:
  url: https://github.com/davrv93/sorteos-con-ia-ejemplos/tree/main/01-ruleta-un-premio
  ref: main
---
Una ruleta de 12 casillas con un solo premio. El giro ganador se elige al azar cuando se crea el sorteo, así que nadie sabe cuál es. Cada persona gira una vez. Si al cerrar nadie acertó, el panel sortea el premio entre quienes giraron: siempre hay ganador.

## Levántalo (Windows y Mac)

```bash
cd sorteos-con-ia-ejemplos/01-ruleta-un-premio
docker compose up -d --build
```

- Sorteo: http://127.0.0.1:8101
- Panel: http://127.0.0.1:8101/admin?k=cambia-esta-clave-larga

## Qué enseña

- **Azar en el servidor:** el número del giro premiado sale de `crypto/rand` y nunca viaja a la página.
- **Una vez por persona:** por nombre y por navegador (una cookie). Es un control suave, pensado para una clase presencial o por Zoom.
- **Siempre hay ganador:** «Cerrar el sorteo» elige entre quienes giraron.

## El pedido en seis partes

Cópialo, cambia los datos por los tuyos y pégalo en tu agente.

```prompt
Rol: eres desarrollador web full stack y diseñador de juegos para clases en vivo.

Contexto: doy una clase por Zoom a unas 15 personas. Al final quiero sortear un premio. Abren el
enlace desde el celular; yo administro desde mi laptop.

Tarea: crea una ruleta de 12 casillas con un solo premio. El giro ganador (uno entre 12) se elige al
azar al crear el sorteo y quien haga ese giro gana. Si nadie acierta, al cerrar se sortea el premio
entre quienes giraron.

Límites:
- Cada persona escribe su nombre y gira una sola vez (por nombre y por navegador).
- El premio lo decide el servidor con crypto/rand. La animación solo lo revela.
- El estado se guarda en un archivo JSON dentro de un volumen de Docker (/datos).
- Panel de administración protegido con una clave que viene de una variable de entorno.
- Sin CDN ni librerías externas en la página; el sonido, con Web Audio.
- No inventes premios, fechas ni precios: usa los que te doy.
- Las casillas sin premio muestran plátanos; la del premio, una bolsa de dinero.

Formato: un servidor en Go de un solo binario que sirve la página con embed, un Dockerfile de dos
etapas (compila y corre las pruebas dentro de Docker), un compose.yaml que publica solo en 127.0.0.1
y un .env.example con una clave de ejemplo.

Comprobación:
- docker compose up -d --build y la ruleta abre en http://127.0.0.1:8101.
- Giro dos veces con el mismo nombre: la segunda me dice que ya giré.
- En /admin?k=<clave> veo la lista de giros y el botón «Cerrar el sorteo», que siempre deja un ganador.
```
