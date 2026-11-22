---
id: dm-tarea-02
title: "Tarea 2 · Tu landing funcionando en el teléfono"
lesson: dm-02
due_at: 2026-11-28T23:59:00-05:00
max_score: 16
autograde: false
objective_ids: [dm-02-o1, dm-02-o2, dm-02-o3, dm-02-o4]
rubric:
  - criterion: "Publicada · la landing abre desde una URL pública (GitHub Pages) en otro teléfono, sin iniciar sesión"
    levels:
      - {title: "Ausente (solo local o en el Visor)", points: 0}
      - {title: "Parcial (URL que no carga completa o con recursos rotos)", points: 1}
      - {title: "Logrado (abre completa desde otro teléfono)", points: 2}
  - criterion: "WhatsApp real · el botón abre el chat del número del negocio (wa.me/51…) con un mensaje inicial"
    levels:
      - {title: "Ausente (número de ejemplo o botón roto)", points: 0}
      - {title: "Parcial (abre el chat sin mensaje o en otra pestaña rota)", points: 1}
      - {title: "Logrado (probado: otra persona escribió por ese botón)", points: 2}
  - criterion: "Una sola meta · la landing pide una sola acción y cada sección la empuja hacia ella (si es web, cada página tiene su meta)"
    levels:
      - {title: "Ausente (varias acciones compiten)", points: 0}
      - {title: "Parcial (la meta está pero se pierde entre secciones)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Primero el teléfono · a 393 y a 360 px no hay desplazamiento horizontal y los botones miden al menos 44 px (la consola imprime true y una lista vacía)"
    levels:
      - {title: "Ausente (se desborda)", points: 0}
      - {title: "Parcial (sin desborde, pero botones chicos)", points: 1}
      - {title: "Logrado y comprobado", points: 2}
  - criterion: "Contenido real · todo sale del escrito del cliente; lo que faltaba quedó en [completar] o se completó con datos reales (ni precios, ni testimonios, ni cifras inventadas)"
    levels:
      - {title: "Ausente (datos inventados)", points: 0}
      - {title: "Parcial (un dato sin fuente)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Collage y estilo · la portada lleva el título en collage (PinePaper o el estilo dificil) y el estilo es coherente en toda la página"
    levels:
      - {title: "Ausente", points: 0}
      - {title: "Parcial (collage sin relación con el resto)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Accesibilidad · contraste AA en textos y botones, y «reducir movimiento» deja todo legible"
    levels:
      - {title: "Ausente", points: 0}
      - {title: "Parcial (contraste bien, pero el movimiento no se reduce)", points: 1}
      - {title: "Logrado", points: 2}
  - criterion: "Pedidos a la IA · el pedido de seis partes de tu landing y un segundo pedido de corrección preciso (lugar, cambio y «no toques nada más»)"
    levels:
      - {title: "Ausente", points: 0}
      - {title: "Parcial (faltan partes)", points: 1}
      - {title: "Logrado", points: 2}
---

## Fase del ciclo · Aplicación

Esta tarea cierra la sesión 2: tu landing, hecha en clase, publicada y probada en el teléfono. No se aprueba
con un cero en «Publicada» ni en «WhatsApp real».

## Qué entregar

Un repositorio git (GitHub, GitLab o Forgejo, público o con acceso para el instructor) llamado
`sesion-02`, con:

1. **`landing/index.html`** y sus recursos (la carpeta que generó `construir.mjs`), y el **`negocio.json`** con el
   contenido del cliente.
2. **La URL publicada.** Con GitHub: Settings → Pages → «Deploy from a branch», rama `main`, carpeta `/landing`
   (o `/root` si la landing está en la raíz). Pega la URL al inicio del `README.md`.
3. **`FICHA_PROMPTS.md`**: el pedido de seis partes de tu landing (Rol, Contexto, Tarea, Límites, Formato,
   Comprobación) y un segundo pedido de corrección que hayas usado de verdad.
4. **`capturas/movil-393.png`** (la landing a 393 px de ancho) y una captura del chat de WhatsApp que abrió el botón.
5. **Una frase** al final del `README.md`: el mensaje de tu pieza. La traes a la sesión 3.

## Cómo entregar

- Desde el LMS: en esta tarea, pega la URL del repositorio, la URL publicada y el SHA del commit.

Se califica el commit exacto que entregues; si subes cambios después, vuelve a entregar.
