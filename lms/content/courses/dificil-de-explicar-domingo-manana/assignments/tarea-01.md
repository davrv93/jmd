---
id: dm-tarea-01
title: "Tarea 1 · Tu imagen base en movimiento y tu ficha de prompts"
lesson: dm-01
due_at: 2026-11-21T23:59:00-05:00
max_score: 16
autograde: false
objective_ids: [dm-01-o1, dm-01-o2, dm-01-o3, dm-01-o4]
rubric:
  - criterion: "Imagen base · la receta FLUX tiene sus cuatro partes (quién, qué hace, dónde, cómo se ve), hay una variación que cambia una sola parte y la base elegida está en assets/"
    levels:
      - {title: "Ausente (sin receta o sin imagen)", points: 0}
      - {title: "Parcial (falta una parte o la variación cambia varias cosas)", points: 1}
      - {title: "Logrado (receta completa, variación de una parte y base en la carpeta)", points: 2}
  - criterion: "Movimiento por tiempo · la animación se calcula con el tiempo (millis, performance.now o segundos de GSAP), no sumando por cuadro"
    levels:
      - {title: "Ausente (suma píxeles por cuadro)", points: 0}
      - {title: "Parcial (una parte por tiempo y otra por cuadro)", points: 1}
      - {title: "Logrado y comprobado (a 12 y a 60 fps va igual de rápido)", points: 2}
  - criterion: "fps con criterio · el index.html dice a cuántos fps corre y la ficha explica por qué (dónde se va a ver)"
    levels:
      - {title: "Ausente", points: 0}
      - {title: "Parcial (fps sin justificar)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Herramienta bien usada · p5, Three.js o GSAP con al menos dos movimientos que se entienden (o HyperFrames con el MP4 renderizado)"
    levels:
      - {title: "Ausente (un solo movimiento o la imagen quieta)", points: 0}
      - {title: "Parcial (dos movimientos que compiten)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Pedidos a la IA · el pedido tiene rol, contexto, tarea, límites, formato y comprobación, y hay un segundo pedido de corrección preciso"
    levels:
      - {title: "Ausente (sin ficha o pedidos de una línea)", points: 0}
      - {title: "Parcial (faltan partes o la comprobación es «que funcione»)", points: 1}
      - {title: "Logrado (seis partes, comprobación ejecutable y una corrección con lugar, cambio y límite)", points: 2}
  - criterion: "Foco · un solo punto de atención; el movimiento explica la idea, no decora"
    levels:
      - {title: "Ausente", points: 0}
      - {title: "Parcial (dos focos a la vez)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Accesibilidad · «reducir movimiento» deja la imagen quieta y el texto (si hay) tiene contraste AA"
    levels:
      - {title: "Ausente", points: 0}
      - {title: "Parcial (contraste bien, pero reducir movimiento no hace nada)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Contenido real · la idea y los textos son tuyos; nada inventado (ni precios, ni testimonios, ni cifras)"
    levels:
      - {title: "Ausente (lorem ipsum o datos inventados)", points: 0}
      - {title: "Parcial (un dato sin fuente)", points: 1}
      - {title: "Logrado", points: 2}
---

## Fase del ciclo · Aplicación

Esta tarea cierra el ciclo de la sesión 1: es la **aplicación** de lo que hiciste en clase. La ficha de
prompts es la **reflexión** (qué receta y qué pedido funcionaron y por qué); las dos cuentan en la nota.
No se aprueba con un cero en «Imagen base» ni en «Movimiento por tiempo».

## Qué entregar

Un repositorio git (GitHub, GitLab o Forgejo, público o con acceso para el instructor) llamado
`sesion-01`, con:

1. **`mi-pieza/assets/base.webp`** (o `.png` / `.jpg`): tu imagen base hecha con FLUX, la que elegiste en clase.

2. **`mi-pieza/index.html`**: tu imagen base en movimiento con **p5.js, Three.js o GSAP** (puedes partir
   de un ejemplo del LIVE con «Descargar .html»). Un ciclo de 4 a 10 segundos, movimiento calculado con
   el **tiempo**, los fps escritos en el código y «reducir movimiento» que deja la imagen quieta.
   Si usaste **HyperFrames**, agrega también `mi-pieza/renders/mi-pieza.mp4`.

3. **`FICHA_PROMPTS.md`**:
   - la **receta FLUX** de tu base (quién, qué hace, dónde, cómo se ve) y la **variación** que probaste;
   - el **pedido de seis partes** que le diste a tu agente (Rol, Contexto, Tarea, Límites, Formato, Comprobación);
   - un **segundo pedido de corrección** que hayas usado de verdad, con el lugar, el cambio y «no toques nada más»;
   - una línea: a cuántos fps corre tu pieza y por qué (dónde se va a ver).

4. **`capturas/`**: `antes.png` y `despues.png` (antes y después del segundo pedido) y `movil.png` a 393 px de ancho.

## Cómo entregar

- Desde el LMS: en esta tarea, pega la URL del repositorio y el SHA del commit.

Se califica el commit exacto que entregues; si subes cambios después, vuelve a entregar.
