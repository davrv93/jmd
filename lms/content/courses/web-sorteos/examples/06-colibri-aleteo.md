---
id: sor-ej-colibri
title: "Detén el aleteo: revelar un premio ya decidido"
summary: "Un sorteo elegante para marcas: un colibrí aletea tan rápido que solo se ve una mancha."
tags: [video, marca, revelar]
level: básico
lesson: sor-02
phase: experimentacion
order: 6
repo:
  url: https://github.com/davrv93/sorteos-con-ia-ejemplos/tree/main/06-colibri-aleteo
  ref: main
---
Un sorteo elegante para marcas: un colibrí aletea tan rápido que solo se ve una mancha. La persona toca «Detén el aleteo», el video se congela y aparece su descuento. El toque no cambia el resultado: el servidor ya lo había decidido.

## Levántalo (Windows y Mac)

```bash
cd sorteos-con-ia-ejemplos/06-colibri-aleteo
docker compose up -d --build
```

- Sorteo: http://127.0.0.1:8106
- Panel: http://127.0.0.1:8106/admin (escribe la clave cambia-esta-clave-larga)

## Qué enseña

- **Pesos y topes:** 80 % (peso 70, tope 40), 85 % (peso 15, tope 10) y sin premio (peso 15).
- **Fecha de fin:** `fin` en `config.json` cierra el sorteo y limita la vigencia de los cupones.
- **Video propio:** `web/video/` trae el colibrí generado con IA. Puedes poner tu música en `web/audio/musica.mp3`.

## El pedido en seis partes

Cópialo, cambia los datos por los tuyos y pégalo en tu agente.

```prompt
Rol: eres desarrollador web y director de arte.

Contexto: tengo una marca y quiero un sorteo de descuento que se vea premium en el celular, con un
video de un colibrí que ya tengo (web/video/escena.mp4).

Tarea: crea el sorteo «Detén el aleteo»: el colibrí aletea, la persona toca un botón, el video se
congela y aparece su resultado.

Límites:
- Descuentos 80 % (peso 70, tope 40) y 85 % (peso 15, tope 10); sin premio, peso 15. En config.json.
- Una participación por número de WhatsApp. El cupón vence a los 7 días o en la fecha «fin», lo que
  llegue primero, y nunca en viernes ni sábado.
- Tipografía serif elegante, flor roja, bokeh dorado; nada de colores chillones.
- La música es opcional: si no está el archivo, el sorteo funciona igual.
- El premio lo decide el servidor con crypto/rand. La animación solo lo revela.
- El estado se guarda en un archivo JSON dentro de un volumen de Docker (/datos).
- Panel de administración protegido con una clave que viene de una variable de entorno.
- Sin CDN ni librerías externas en la página; el sonido, con Web Audio.
- No inventes premios, fechas ni precios: usa los que te doy.

Formato: un servidor en Go de un solo binario que sirve la página con embed, un Dockerfile de dos
etapas (compila y corre las pruebas dentro de Docker), un compose.yaml que publica solo en 127.0.0.1
y un .env.example con una clave de ejemplo.

Comprobación:
- docker compose up -d --build y el sorteo abre en http://127.0.0.1:8106.
- El resultado no cambia aunque toque el botón antes o después.
- En el panel veo cuántos cupones quedan de cada descuento.
```
