---
id: hk-01
title: "Hackathon Ready Set Go! · Tu videojuego de fútbol con IA"
starts_at: 2026-12-13T13:30:00-05:00
duration: 345
published: true
objectives:
  - {id: hk-01-o1, title: "Construir en una tarde un videojuego de fútbol con tu propia IA"}
  - {id: hk-01-o2, title: "Dejar tu juego en un repositorio público para la presentación final"}
  - {id: hk-01-o3, title: "Presentar tu juego ante el jurado y competir por S/ 280"}
materials:
  - {id: cuenta, title: "Cuenta regresiva a pantalla completa", kind: link, url: "/api/v1/live/hk-01/escenas/01-cuenta-regresiva/html"}
  - {id: bases, title: "Bases, cronograma e inscripción (jmd-learn.online/readysetgo)", kind: link, url: "https://jmd-learn.online/readysetgo/", objective_ids: [hk-01-o1]}
  # El clip de la chilena lo usa la cuenta regresiva (/files/… solo sirve archivos declarados como material).
  - {id: chilena, title: "Video: la chilena de Football Lab (clip sin sonido)", kind: video, file: materials/chilena-loop.mp4}
cycle:
  - id: cuenta
    title: Mira la cuenta regresiva y las bases
    tool: lms
    phase: experiencia
    description: "Abre la pestaña «Contenido»: ahí corren la cuenta regresiva, el cronograma, los criterios y las reglas."
    check: Sabes a qué hora empieza y cómo se califica
  - id: repo
    title: Prepara tu repositorio público
    tool: git
    phase: experimentacion
    description: Crea el repositorio público donde vas a subir tu juego; lo necesitas para la presentación final.
    check: "git remote -v"
  - id: presentar
    title: Presenta tu juego
    tool: lms
    phase: experimentacion
    description: "Desarrollo hasta las 5:30 p. m.; de 5:30 a 7:00 p. m. se revisan los proyectos y a las 7:00 p. m. es la premiación."
    check: Presentaste tu juego con su repositorio público
---
<iframe src="/api/v1/live/hk-01/escenas/01-cuenta-regresiva/html" title="Cuenta regresiva a la Hackathon Ready Set Go!" loading="eager" style="display:block;width:100%;height:540px;border:0;border-radius:14px;overflow:hidden"></iframe>

## Hackathon Ready Set Go!

**Domingo 13 de diciembre, de 1:30 a 7:15 p. m. (hora de Lima).**

Una tarde para crear, probar y presentar tu videojuego de fútbol hecho con IA. El mejor se lleva
**S/ 280**.

**Requisito:** haber llevado un curso con JMD Learning. Si te inscribiste a Curso + Hackathon, ya lo
cumples.

## Cronograma

| Hora (Lima) | Qué pasa |
| --- | --- |
| 1:30 p. m. | Inicio de la hackathon |
| 1:30 – 1:40 | Bienvenida y explicación del reto |
| 1:40 – 2:30 | Presentación de los patrocinadores |
| 2:30 – 5:30 | Desarrollo (cierra a las 5:30) |
| 5:30 – 7:00 | Revisión de los proyectos |
| 7:00 – 7:15 | **Premiación (S/ 280)** |
| 7:15 p. m. | Fin |

## Así se califica

1. Jugabilidad
2. Apariencia
3. Facilidad de uso
4. Ambiente / Entorno
5. Animación
6. Bonus (creatividad)

Y hay **5 criterios secretos**. Descúbrelos jugando.

## Reglas

- Único requisito para participar: haber llevado un curso con JMD Learning.
- Se permite usar IA.
- Cada participante usa su propia IA.
- Repositorio público para la presentación final.
