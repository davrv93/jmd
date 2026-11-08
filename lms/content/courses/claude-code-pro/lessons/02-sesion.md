---
id: ccp-02
title: "Sesión 2 · Plan recursivo y cerebro de proyecto"
published: true
starts_at: 2026-11-14T19:30:00-05:00
objectives:
  - id: ccp-02-o1
    title: "Escribir un PLAN.md recursivo con criterio de parada y prueba por fase"
  - id: ccp-02-o2
    title: "Usar Cortex como memoria del proyecto y Graphify para consultar el grafo de código"
  - id: ccp-02-o3
    title: "Construir el backend BI: modelo estrella en DuckDB, ingesta de CSV y API de métricas con pruebas"
recording:
  url: ""
  passcode: ""
materials:
  - id: ccp-02-video
    title: "Video: el agente que no pierde el hilo"
    kind: file
    file: materials/video-ccp-02.mp4
    objective_ids: [ccp-02-o1, ccp-02-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el sábado de 7:30 a 9:30 p.m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: medir
    title: Medir la línea base
    tool: terminal
    phase: experiencia
    description: "En una sesión nueva de Claude Code, pide «¿qué hace este proyecto, en qué quedamos y cuál es el siguiente paso?» y publica el total de /context en la escena 3."
    check: Tu número «antes» quedó publicado en la escena 3
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la sesión en el hilo o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: plan
    title: Escribir el PLAN.md recursivo
    tool: terminal
    phase: conceptualizacion
    description: "En modo plan, pide un PLAN.md que divida cada tarea hasta la hoja (1 cosa, 1 sesión, 1 prueba) y publica cuántas hojas tiene en la escena 8."
    check: Tu PLAN.md tiene hojas con criterio de parada y quedó publicado
  - id: cerebro
    title: Encender el cerebro del proyecto
    tool: terminal
    phase: conceptualizacion
    description: "CLAUDE.md de 40 líneas o menos, el grafo con graphify update . y tus 3 decisiones en Cortex (o en una sección «Decisiones» de CLAUDE.md)."
    check: graphify query responde y tu CLAUDE.md quedó publicado en la escena 9
  - id: construir
    title: Construir el backend hoja por hoja
    tool: terminal
    phase: experimentacion
    description: "Una hoja por vuelta: prueba, código mínimo, verde y [x] en PLAN.md. Publica cuántas métricas tienen prueba verde en la escena 10."
    check: Al menos la ingesta y una métrica con prueba verde
  - id: entregar
    title: Entregar el entregable 2
    tool: git
    phase: experimentacion
    description: "API con 10 métricas probadas, PLAN.md, grafo del proyecto y una sesión retomada en frío con un traspaso de menos de 2.000 tokens."
    check: La entrega aparece en «Mis notas»
---

## Objetivo

Que Claude trabaje horas sin perder el hilo ni releer el repositorio.

Regla de todo el curso: **cada sesión empieza con una línea base y termina con una medición.** Nada se afirma sin número.

## Entregable 2

API con 10 métricas probadas, PLAN.md, grafo del proyecto y una sesión retomada en frío con un traspaso de menos de 2.000 tokens.
