---
id: dr2-03
title: "Sesión 3 · La IA construye, tú compruebas"
published: true
starts_at: 2026-12-17T19:30:00-05:00
objectives:
  - id: dr2-03-o1
    title: Entregar el pitch y los criterios a un agente en DeepSeek Harness para que construya el módulo
  - id: dr2-03-o2
    title: Comprobar el módulo contra cada criterio y pedir correcciones precisas
  - id: dr2-03-o3
    title: Medir lo que costó en tokens y dejar el módulo documentado
recording:
  url: ""
  passcode: ""
materials:
  - id: dr2-03-m1
    title: DeepSeek · documentación de la API (claves y precios)
    kind: doc
    url: https://api-docs.deepseek.com/
    objective_ids: [dr2-03-o1, dr2-03-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: construir
    title: Que la IA construya
    tool: terminal
    phase: experimentacion
    description: Dale al agente tu pitch y tus criterios. No le pidas «haz el sistema»; pídele el módulo del pitch, nada más.
    check: El módulo corre en tu aula
  - id: comprobar
    title: Comprobar criterio por criterio
    tool: lms
    phase: reflexion
    description: Marca cada criterio como cumplido o no. Para cada uno que falle, escribe una corrección de una frase y vuelve a probar.
    check: Todos tus criterios están cumplidos o anotados con su corrección
---

# La IA construye, tú compruebas

Con el pitch y los criterios, el agente ya sabe qué construir y qué no. Tu trabajo cambia: no escribes el
código, **compruebas** que el módulo hace lo que acordaste, criterio por criterio, y pides correcciones
precisas cuando algo falla.

Al final mides cuánto costó en tokens y dejas el módulo con su documentación: mapa, pitch, criterios y
resultado de cada comprobación.
