---
id: qab-03
title: "Sesión 3 · Repara: la IA propone la corrección y abre el pull request"
published: true
starts_at: 2026-11-29T15:00:00-05:00
duration: 90
objectives:
  - id: qab-03-o1
    title: "Darle a la IA el fallo con su evidencia y la prueba que lo reproduce"
  - id: qab-03-o2
    title: "Que proponga el arreglo, deje la prueba en verde y abra el pull request para que tú lo apruebes"
  - id: qab-03-o3
    title: "Medir los indicadores: fallos encontrados, tiempo hasta la corrección y porcentaje de corridas en verde"
recording:
  url: ""
  passcode: ""
materials:
  - id: kit
    title: "Kit de práctica (con los bots y el robot)"
    kind: zip
    file: materials/qa-bots-kit.zip
    objective_ids: [qab-03-o1, qab-03-o2]
  - id: gh-pr
    title: "GitHub CLI: gh pr create"
    kind: doc
    url: https://cli.github.com/manual/gh_pr_create
    objective_ids: [qab-03-o2]
  - id: pw-agents
    title: "Agentes de prueba de Playwright"
    kind: doc
    url: https://playwright.dev/docs/test-agents
    objective_ids: [qab-03-o1, qab-03-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el domingo de 3:00 a 4:30 p. m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: reparar
    title: Pedir la corrección
    tool: claude-code
    phase: experiencia
    description: "Con la app en tu repositorio, pásale a tu asistente la spec en rojo y la evidencia del fallo (usa el prompt «Arreglar una prueba» de `ia/prompts.md` como base) y pídele que arregle la app, no la prueba."
    check: La spec que antes fallaba ahora pasa en verde
  - id: pr
    title: Abrir el pull request
    tool: git
    phase: experimentacion
    description: "Rama nueva, commit con el arreglo y la prueba, y `gh pr create` con la evidencia del fallo en la descripción."
    check: El pull request aparece en GitHub con la prueba en verde
  - id: revisar
    title: Revisar como aprobador
    tool: lms
    phase: reflexion
    description: Lee el diff antes de aprobar. Escribe en el hilo qué revisaste y qué le habrías rechazado a la IA.
    check: Tu revisión aparece en el hilo de la sesión
---

## Objetivo

Cerrar el ciclo: el bot encuentra, el robot avisa y la IA propone la corrección. Tú decides. Ningún cambio
entra a producción sin tu aprobación.

## Lo que recibe la IA

- La prueba que reproduce el fallo (de la sesión 1).
- La evidencia: captura, pasos y peticiones.
- La regla de negocio que se rompió, en una línea.

Con eso no adivina: tiene un criterio de terminado que se puede comprobar. La prueba pasa a verde y el resto
de la suite sigue en verde.

## Lo que revisas tú

- Que arregló la app y no relajó la prueba.
- Que el cambio es pequeño y se entiende.
- Que la descripción del pull request explica el fallo con su evidencia.

## Indicadores

| Indicador | Qué mide |
|---|---|
| Fallos encontrados | Cuántos hallazgos nuevos trajeron los bots |
| Tiempo hasta la corrección | Desde la alerta hasta el pull request aprobado |
| Corridas en verde | El porcentaje de las últimas 24 h que muestra el robot |

## Entregable final

El enlace al pull request con la corrección y la prueba en verde, y la tabla de los tres indicadores de tu
semana con los bots.
