# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas que llegan por el QR del flyer o por un enlace de WhatsApp, casi siempre desde el celular y con poco tiempo. Quieren saber en segundos qué ganan, jugar una vez y quedarse con su cupón para el taller de hoy.

## Product Purpose

Es el sorteo público de JMD Learning para el taller **Web scraping ético con IA** (Grupo 2, hoy domingo 15-11-2026, de 5:00 a 6:30 p. m., hora de Lima).

- Todos los que juegan ganan el 83 % de descuento: el taller baja de S/ 60 a S/ 10.
- Una sola persona gana el 100 %, es decir, el taller gratis.
- El servidor sortea el premio una sola vez, al registrarse. El juego solo lo revela.

El éxito es que la persona juegue, vea su código y vaya al canje antes de la clase.

## Positioning

El sorteo es público y sin cuenta: basta el nombre y el WhatsApp. No tiene letra pequeña, porque todos ganan y el único premio mayor se reparte al azar mientras la gente juega.

## Operating Context

- **Llegada:** por el flyer «Sorteo de penales» (`~/Downloads/sorteo-scraping-flyer`), con la foto 3D del penal y el QR.
- **Canje:** en `/sorteo-scraping/canje?c=CÓDIGO`, validando con WhatsApp.
- **Administración:** en `/sorteo-scraping/admin`, por URL. No se enlaza desde la página pública.
- **Cierre:** el sorteo cierra hoy a las 5:00 p. m.

## Capabilities and Constraints

- Servidor en Go con la web embebida (`web/`), desplegado con `desplegar.sh`.
- Un juego por WhatsApp. El premio viene de `config.json`: 83 % para todos y 100 % con tope de 1, al azar.
- CSP estricta del servidor; sin fuentes ni scripts externos.
- **Confirmado por el usuario (15-11-2026):** solo lo esencial. Sin asistente flotante, sin reglas largas, sin etiquetas y sin enlace a Admin. La ayuda va solo por WhatsApp (986 149 476).

## Brand Commitments

- **Marca:** JMD Learning (`web/logo.svg`).
- **Estilo:** el del flyer, confirmado por el usuario. Azul noche, foto 3D del penal (jugador original de espaldas con el 10 dorado, sin marcas), título blanco con «ético» en dorado y sello rojo del 83 %.
- **Palabras prohibidas:** nunca «ya pe» ni «principiantes».
- **Imágenes:** nada de celebridades reales ni marcas de terceros.

## Evidence on Hand

- Precio real: S/ 60. Con el cupón, S/ 10.
- Fecha y hora del taller, según el LMS (`web-scraping-etico-2`).
- No hay testimonios ni cifras de alumnos: no inventarlos.

## Product Principles

1. Se entiende en una pantalla: qué gano, qué hago y hasta cuándo.
2. Una sola acción por paso.
3. Honestidad visible: todos ganan el 83 % y solo uno gana el 100 %.
4. Primero el celular.
