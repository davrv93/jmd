---
id: sor-ej-cupos
title: "Ruleta con cupos limitados, QR y WhatsApp"
summary: "Una ruleta de descuentos donde nadie se va sin premio, pero los premios grandes son pocos: 1 beca del 100 %, 3 cupones de S/ 29, 6 de S/ 32 y S/ 35 para todos los demás."
tags: [ruleta, cupos, whatsapp]
level: básico
lesson: sor-01
phase: experimentacion
order: 2
repo:
  url: https://github.com/davrv93/sorteos-con-ia-ejemplos/tree/main/02-ruleta-con-cupos
  ref: main
---
Una ruleta de descuentos donde nadie se va sin premio, pero los premios grandes son pocos: 1 beca del 100 %, 3 cupones de S/ 29, 6 de S/ 32 y S/ 35 para todos los demás. Cuando se acaba un premio, sale de la ruleta. Al ganar, la persona ve su código, un botón de WhatsApp con el mensaje ya escrito y un QR.

## Levántalo (Windows y Mac)

```bash
cd sorteos-con-ia-ejemplos/02-ruleta-con-cupos
docker compose up -d --build
```

- Sorteo: http://127.0.0.1:8102
- Panel: http://127.0.0.1:8102/admin?k=cambia-esta-clave-larga

## Qué enseña

- **Cupos con tope:** el servidor lleva la cuenta y no entrega más de lo que dice el stock.
- **Una vez por número:** el WhatsApp de 9 dígitos es la llave; si alguien repite, el servidor lo rechaza.
- **Cierre automático:** la fecha de `SORTEO_CIERRE` apaga el sorteo y la página muestra la cuenta regresiva.
- **Precio en una tabla:** lo que se paga sale de una tabla de premios, nunca de calcular porcentajes, para que ningún redondeo regale dinero.

## El pedido en seis partes

Cópialo, cambia los datos por los tuyos y pégalo en tu agente.

```text
Rol: eres desarrollador web full stack y diseñador de juegos de promoción.

Contexto: vendo un taller de S/ 40 y quiero una ruleta de descuentos que se comparte por WhatsApp.
La abren desde el celular.

Tarea: crea una ruleta de 16 casillas con estos premios: 1 beca del 100 %, 3 cupones de S/ 29,
6 cupones de S/ 32 y, para todos los demás, S/ 35.

Límites:
- Una participación por número de WhatsApp (9 dígitos, empieza con 9). Si repite, se rechaza.
- Cuando un premio llega a su tope, sale de la ruleta. Lo que se paga sale de una tabla, no de un
  cálculo con porcentajes.
- El sorteo cierra en la fecha de la variable SORTEO_CIERRE y la página muestra una cuenta regresiva.
- Al ganar: código del cupón, botón de WhatsApp con el mensaje ya escrito y un QR generado en la
  página (sin servicios externos).
- El premio lo decide el servidor con crypto/rand. La animación solo lo revela.
- El estado se guarda en un archivo JSON dentro de un volumen de Docker (/datos).
- Panel de administración protegido con una clave que viene de una variable de entorno.
- Sin CDN ni librerías externas en la página; el sonido, con Web Audio.
- No inventes premios, fechas ni precios: usa los que te doy.

Formato: un servidor en Go de un solo binario que sirve la página con embed, un Dockerfile de dos
etapas (compila y corre las pruebas dentro de Docker), un compose.yaml que publica solo en 127.0.0.1
y un .env.example con una clave de ejemplo.

Comprobación:
- docker compose up -d --build y la ruleta abre en http://127.0.0.1:8102.
- Una prueba que simula 1000 giros: sale 1 beca, 3 de S/ 29, 6 de S/ 32 y el resto S/ 35.
- En /admin?k=<clave> veo cuántos cupones quedan de cada premio.
```
