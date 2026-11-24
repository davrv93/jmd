---
id: sor-ej-gachapon
title: "Gachapon: pesos, topes, cupón y catálogo"
summary: "Una máquina de cápsulas: la persona gira la manivela, caen tres cápsulas y abre una."
tags: [pesos, topes, cupones]
level: intermedio
lesson: sor-02
phase: experimentacion
order: 3
repo:
  url: https://github.com/davrv93/sorteos-con-ia-ejemplos/tree/main/03-gachapon
  ref: main
---
Una máquina de cápsulas: la persona gira la manivela, caen tres cápsulas y abre una. El descuento ya estaba decidido en el servidor. Después ve un catálogo de talleres con el precio que pagaría con su cupón y elige uno para reclamarlo por WhatsApp.

## Levántalo (Windows y Mac)

```bash
cd sorteos-con-ia-ejemplos/03-gachapon
docker compose up -d --build
```

- Sorteo: http://127.0.0.1:8103
- Panel: http://127.0.0.1:8103/admin (escribe la clave cambia-esta-clave-larga)

## Qué enseña

- **Pesos y topes:** cada descuento sale en proporción a su peso; cuando llega a su tope, su peso se reparte entre los demás (`config.json`).
- **Cupón con vencimiento:** código `CAP-<porcentaje>-XXXXX`, válido los días de `dias_vigencia`.
- **Catálogo:** `cursos.json` y una imagen por curso en `web/brochures/`. El servidor no arranca si falta una imagen.
- **Panel:** buscar, filtrar, marcar cupones como canjeados y descargar un CSV (con protección contra fórmulas de Excel).

## El pedido en seis partes

Cópialo, cambia los datos por los tuyos y pégalo en tu agente.

```prompt
Rol: eres desarrollador web full stack y diseñador de juegos con animación.

Contexto: tengo una academia con varios talleres. Quiero un sorteo de cupones de descuento con forma
de máquina de cápsulas (gachapon) que se comparte por WhatsApp y se juega en el celular.

Tarea: crea la máquina: la persona escribe su nombre y su WhatsApp, gira la manivela, caen tres
cápsulas y abre una con su descuento. Luego ve el catálogo de talleres con su precio con el cupón.

Límites:
- Descuentos 20 %, 30 %, 40 % y 50 % con pesos 50, 30, 15 y 5, y topes de 30 cupones para el 40 %
  y 10 para el 50 %, en config.json.
- Una participación por número de WhatsApp. El cupón vale 7 días y nunca vence en viernes ni sábado.
- El catálogo sale de cursos.json; cada curso tiene una imagen en web/brochures/.
- Panel con buscador, «marcar canjeado» y descarga en CSV.
- El premio lo decide el servidor con crypto/rand. La animación solo lo revela.
- El estado se guarda en un archivo JSON dentro de un volumen de Docker (/datos).
- Panel de administración protegido con una clave que viene de una variable de entorno.
- Sin CDN ni librerías externas en la página; el sonido, con Web Audio.
- No inventes premios, fechas ni precios: usa los que te doy.

Formato: un servidor en Go de un solo binario que sirve la página con embed, un Dockerfile de dos
etapas (compila y corre las pruebas dentro de Docker), un compose.yaml que publica solo en 127.0.0.1
y un .env.example con una clave de ejemplo.

Comprobación:
- docker compose up -d --build y la máquina abre en http://127.0.0.1:8103.
- Una prueba que simula 10 000 participaciones: ningún descuento pasa su tope.
- Una prueba de que el CSV escapa los nombres que empiezan con =, +, - o @.
```
