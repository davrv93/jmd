---
id: de-tarea-01
title: "Tarea 1 · Tu pieza animada y tu ficha de prompts"
lesson: de-01
due_at: 2026-10-28T23:59:00-05:00
max_score: 16
autograde: false
objective_ids: [de-01-o1, de-01-o3, de-01-o4]
rubric:
  - criterion: Mensaje y flujo · se entiende qué es la pieza y qué cuenta; las escenas se siguen de principio a fin
    levels:
      - {title: Ausente (no se entiende el mensaje o la pieza no reproduce), points: 0}
      - {title: Parcial (se entiende, pero una escena sobra o falta), points: 1}
      - {title: Logrado y comprobado (mensaje claro en una frase y cuatro escenas que lo cuentan), points: 2}
  - criterion: Pedidos a la IA · los tres pedidos de la ficha tienen rol, contexto, tarea, límites, formato y comprobación, y hay un segundo pedido de corrección preciso
    levels:
      - {title: Ausente (sin ficha o pedidos de una línea), points: 0}
      - {title: Parcial (faltan partes o la comprobación es «que funcione»), points: 1}
      - {title: Logrado (seis partes, comprobación ejecutable y una corrección con lugar, cambio y límite), points: 2}
  - criterion: Jerarquía · un solo punto focal por escena; el texto no compite con la figura
    levels:
      - {title: Ausente, points: 0}
      - {title: Parcial (una escena con dos focos), points: 1}
      - {title: Logrado, points: 2}
  - criterion: Coherencia · todo sale de los tokens (fondo tinta y pasteles o los tuyos); el estilo se sostiene de principio a fin
    levels:
      - {title: Ausente (colores al azar), points: 0}
      - {title: Parcial (un color o un efecto fuera de sistema), points: 1}
      - {title: Logrado, points: 2}
  - criterion: Contenido real · textos concretos de tu negocio o idea; nada inventado (ni precios, ni testimonios, ni cifras)
    levels:
      - {title: Ausente (lorem ipsum o datos inventados), points: 0}
      - {title: Parcial (un dato sin fuente), points: 1}
      - {title: Logrado, points: 2}
  - criterion: Responsive · la pieza se ve completa a 393 px de ancho sin desborde horizontal
    levels:
      - {title: Ausente, points: 0}
      - {title: Parcial (una escena recorta texto en el teléfono), points: 1}
      - {title: Logrado (captura a 393 px incluida), points: 2}
  - criterion: Accesibilidad · contraste AA en cada texto, foco visible en los botones y «reducir movimiento» muestra el storyboard quieto
    levels:
      - {title: Ausente, points: 0}
      - {title: Parcial (contraste bien, pero reducir movimiento no hace nada), points: 1}
      - {title: Logrado, points: 2}
  - criterion: Movimiento y ritmo · el movimiento explica; los cortes caen en la rejilla de 0,25 s; sin destellos ni cortes menores de 0,25 s
    levels:
      - {title: Ausente (movimiento decorativo o destellos), points: 0}
      - {title: Parcial (un corte fuera de la rejilla), points: 1}
      - {title: Logrado y comprobado (la suma de data-duration da la duración exacta), points: 2}
---

## Fase del ciclo · Aplicación

Esta tarea cierra el ciclo de la sesión 1: es la **aplicación** de lo que pediste y construiste
en clase. La ficha de prompts es la **reflexión** (qué pedido funcionó y por qué); las dos cuentan
en la nota. No se aprueba con un cero en «Mensaje y flujo» ni en «Accesibilidad».

## Qué entregar

Un repositorio git (GitHub, GitLab o Forgejo, público o con acceso para el instructor) llamado
`sesion-01`, con:

1. **`willie/index.html`**: la pieza del taller tal como la generó tu agente con el prompt de seis
   partes, más `willie/willie.svg` al lado. Debe abrir sin internet y durar 20,0 s. Si le hiciste un
   segundo pedido de corrección, deja esta versión corregida.

2. **`mi-pieza/index.html`**: tu propia pieza, de 8 a 20 segundos y **cuatro escenas como mínimo**,
   con el mensaje de tu negocio o de tu idea en una frase. Mismo modelo: un solo reloj, cada escena
   es una `section` con `data-start` y `data-duration`, cortes en la rejilla de 0,25 s, sin CDN ni
   fuentes remotas, y con «reducir movimiento» muestra el storyboard quieto. Puedes usar los tokens
   del taller (fondo tinta y seis pasteles) o los tuyos, pero los mismos de principio a fin. La
   duración se comprueba sumando los `data-duration`:

   ```bash
   grep -o 'data-duration="[0-9.]*"' mi-pieza/index.html | grep -o '[0-9.]*' | paste -sd+ | bc
   ```

3. **`FICHA_PROMPTS.md`**: los **tres pedidos que mejor funcionaron**, cada uno con sus seis
   partes etiquetadas (Rol, Contexto, Tarea, Límites, Formato, Comprobación), y **un segundo
   pedido de corrección** que hayas usado de verdad, con el lugar, el cambio y «no toques nada
   más». Debajo de cada uno, una línea: qué salió bien y qué tuviste que corregir.

4. **`capturas/`**: tres capturas de `mi-pieza/index.html?t=` en tres instantes distintos (por
   ejemplo `?t=0`, a mitad y al final), más una a 393 px de ancho (en el teléfono o con las
   herramientas del navegador). Nómbralas `01.png`, `02.png`, `03.png` y `movil.png`.

## Cómo entregar

- Desde el LMS: en esta tarea, pega la URL del repositorio y el SHA del commit.

Se califica el commit exacto que entregues; si subes cambios después, vuelve a entregar.
