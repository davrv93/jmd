---
id: sor-ej-piramide
title: "Pirámide de 30 puertas con mazo fijo"
summary: "Una pirámide con 30 puertas: 22 sacan a la persona con un descuento de 60 % a 100 % y 8 son trampas."
tags: [mazo-fijo, aventura]
level: intermedio
lesson: sor-02
phase: experimentacion
order: 4
repo:
  url: https://github.com/davrv93/sorteos-con-ia-ejemplos/tree/main/04-puertas-piramide
  ref: main
---
Una pirámide con 30 puertas: 22 sacan a la persona con un descuento de 60 % a 100 % y 8 son trampas. Lo que hay detrás de cada puerta se baraja una sola vez, al primer arranque, y queda guardado. Cada persona abre una puerta; las que ya se abrieron quedan selladas con el nombre de quien las tomó. Para entrar hace falta la palabra del grupo.

## Levántalo (Windows y Mac)

```bash
cd sorteos-con-ia-ejemplos/04-puertas-piramide
docker compose up -d --build
```

- Sorteo: http://127.0.0.1:8104
- Panel: http://127.0.0.1:8104/admin (escribe la clave cambia-esta-clave-larga)

## Qué enseña

- **Mazo fijo:** el reparto exacto está en `config.json` (8 trampas, 7 de 60 %, 5 de 70 %, 5 de 80 %, 3 de 90 % y 2 de 100 %). Se baraja una vez y queda en `/datos/puertas.json`. La página nunca lo ve.
- **Elegir rápido o lento no cambia nada:** lo que hay detrás de cada puerta ya estaba decidido.
- **Palabra del grupo:** solo entra quien la conoce (`palabra_grupo`, aquí `PIRAMIDE`).
- **Regalo:** quien gana elige «Es para mí» o «Es un regalo»; los dos abren WhatsApp con el texto escrito.

## El pedido en seis partes

Cópialo, cambia los datos por los tuyos y pégalo en tu agente.

```text
Rol: eres desarrollador web full stack y diseñador de juegos de aventura.

Contexto: tengo un grupo de WhatsApp de unos 30 alumnos. Quiero premiarlos con un sorteo de un solo
intento que se sienta como una aventura.

Tarea: crea una pirámide de 30 puertas en filas de 2, 4, 6, 8 y 10. Detrás de cada puerta hay un
descuento o una trampa. La persona elige una puerta y la abre.

Límites:
- Reparto exacto en config.json: 8 trampas, 7 de 60 %, 5 de 70 %, 5 de 80 %, 3 de 90 % y 2 de 100 %.
- El mazo se baraja una sola vez en el servidor y se guarda; la página nunca lo ve.
- Para entrar hace falta la palabra del grupo (en config.json), comparada sin distinguir mayúsculas.
- Una puerta por número de WhatsApp. Las puertas tomadas muestran solo el primer nombre.
- Si es trampa, la pirámide se derrumba y suena un trombón triste; si gana, una marcha de aventura
  propia (no la de ninguna película).
- El premio lo decide el servidor con crypto/rand. La animación solo lo revela.
- El estado se guarda en un archivo JSON dentro de un volumen de Docker (/datos).
- Panel de administración protegido con una clave que viene de una variable de entorno.
- Sin CDN ni librerías externas en la página; el sonido, con Web Audio.
- No inventes premios, fechas ni precios: usa los que te doy.

Formato: un servidor en Go de un solo binario que sirve la página con embed, un Dockerfile de dos
etapas (compila y corre las pruebas dentro de Docker), un compose.yaml que publica solo en 127.0.0.1
y un .env.example con una clave de ejemplo.

Comprobación:
- docker compose up -d --build y la pirámide abre en http://127.0.0.1:8104.
- Una prueba que abre las 30 puertas: salen exactamente 8 trampas y 22 premios con ese reparto.
- Con una palabra equivocada, el servidor responde 403.
```
