---
id: tarea-03
title: Tarea 3 · Tu asistente responde por WhatsApp
lesson: pa-03
due_at: 2026-10-29T23:59:00-05:00
max_score: 20
autograde: false
objective_ids: [pa-03-o2, pa-03-o3]
rubric:
  - criterion: Video de 1 minuto con tres preguntas respondidas por WhatsApp (del corpus, fuera del corpus y «quiero hablar con una persona»)
    levels:
      - {title: No hay video o el bot no responde, points: 0}
      - {title: Responde una o dos; o responde las tres pero inventa datos o no avisa que es un bot, points: 5}
      - {title: Responde las tres como corresponde y el primer mensaje dice que es un bot, points: 10}
  - criterion: Capturas de la bandeja con esas tres conversaciones
    levels:
      - {title: Sin capturas, points: 0}
      - {title: Las conversaciones se ven pero falta alguna o no se distingue el modo humano/bot, points: 3}
      - {title: Las tres conversaciones visibles, con el modo de cada una y la tomada por una persona, points: 6}
  - criterion: REFLEXION.md de 10 líneas (qué hizo el agente solo, qué hubo que corregirle, qué aprendiste)
    levels:
      - {title: No hay, points: 0}
      - {title: Superficial, sin ejemplos concretos, points: 2}
      - {title: Concreta, con ejemplos de lo que aceptaste y lo que no, points: 4}
---

## Fase del ciclo · Aplicación

Esta tarea cierra el ciclo de la clase 3: es la **aplicación** (desplegar y probar en real). La
`REFLEXION.md` es la vuelta de **reflexión** que entregas por escrito; las dos cuentan en la nota.

## Qué entregar

Un repositorio git (GitHub, GitLab o Forgejo, público o con acceso para el instructor) llamado
`clase-03`, con:

1. **`README.md`** con el **enlace al video** (YouTube no listado, Drive o similar, con acceso
   para el instructor). El video dura **1 minuto como máximo** y muestra, con el teléfono en
   pantalla, a un compañero **de otro equipo** escribiendo tres mensajes a tu número de
   pruebas y el asistente respondiendo:

   | # | El compañero escribe | Lo que debe verse |
   |---|---|---|
   | 1 | Una pregunta del corpus de tu tienda (stock, precio, horario, envío) | Respuesta correcta |
   | 2 | Una pregunta fuera del corpus | El bot dice que no sabe y ofrece lo que sí sabe |
   | 3 | «Quiero hablar con una persona» | El bot avisa que pasa a una persona; alguien toma la conversación desde la bandeja y responde |

   El primer mensaje del bot debe decir que es un bot. Sin cortes que escondan la espera: si
   tarda 8 segundos, se ven los 8 segundos.

2. **`capturas/`** con las capturas de la **bandeja** mostrando esas tres conversaciones. Debe
   verse el modo de cada una (bot o humano) y, en la tercera, el interruptor en «humano».

3. **`REFLEXION.md`** (10 líneas): qué hizo el agente solo, qué hubo que corregirle (con un
   ejemplo concreto: qué propuso y qué cambiaste) y qué aprendiste del curso.

Opcional, suma a la evidencia pero no a la nota: `FLUJOS.md`, `WIREFRAME.html`,
`pruebas/webhook-hola.json` y `MEDICIONES.md` de la clase.

## Lo que no va en el repositorio

- **`.env`** con la `AUTHENTICATION_API_KEY` o cualquier otra clave. Sube `.env.example` con los
  nombres y sin valores. Si subes una clave por error, cámbiala en Evolution y haz un commit
  nuevo; la clave vieja sigue en el historial.
- Números de teléfono personales ni capturas con conversaciones de personas que no sean del
  curso.

## Cómo entregar

- Desde el LMS: en esta tarea, pega la URL del repositorio y el SHA del commit.

Se califica el commit exacto que entregues; si subes cambios después, vuelve a entregar.
