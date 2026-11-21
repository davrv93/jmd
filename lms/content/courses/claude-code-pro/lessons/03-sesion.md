---
id: ccp-03
title: "Sesión 3 · Multiagente y contexto acotado"
published: true
starts_at: 2026-11-21T19:30:00-05:00
objectives:
  - id: ccp-03-o1
    title: "Repartir el trabajo entre subagentes de lectura, construcción y revisión, con worktrees en paralelo"
  - id: ccp-03-o2
    title: "Escribir hooks y skills propias, y saber cuándo se activan"
  - id: ccp-03-o3
    title: "Construir el dashboard y un chat de texto a SQL con guardas de solo lectura"
recording:
  url: ""
  passcode: ""
materials:
  - id: ccp-03-kit
    title: "kit-multiagente.zip · 3 subagentes, la skill build-dashboard, el hook solo-lectura y tokens_a_csv.py (descomprímelo en una carpeta nueva)"
    kind: zip
    file: materials/multiagente/kit-multiagente.zip
    objective_ids: [ccp-03-o1, ccp-03-o2, ccp-03-o3]
  - id: ccp-03-prompts
    title: "PROMPTS.md · los pasos y los prompts de la sesión, del 0 al entregable"
    kind: doc
    file: materials/multiagente/PROMPTS.md
    objective_ids: [ccp-03-o1, ccp-03-o2, ccp-03-o3]
  - id: ccp-03-skill
    title: "build-dashboard · la skill de dashboards de Anthropic (plugin data, Apache 2.0)"
    kind: doc
    url: https://github.com/anthropics/knowledge-work-plugins/blob/main/data/skills/build-dashboard/SKILL.md
    objective_ids: [ccp-03-o2, ccp-03-o3]
  - id: ccp-03-doc-subagentes
    title: "Claude Code · subagentes (ventana propia, herramientas, modelo)"
    kind: doc
    url: https://code.claude.com/docs/en/sub-agents
    objective_ids: [ccp-03-o1]
  - id: ccp-03-doc-skills
    title: "Claude Code · skills (descripción, carga progresiva, menos de 500 líneas)"
    kind: doc
    url: https://code.claude.com/docs/en/skills
    objective_ids: [ccp-03-o2]
  - id: ccp-03-doc-hooks
    title: "Claude Code · hooks (PreToolUse, código de salida 2)"
    kind: doc
    url: https://code.claude.com/docs/en/hooks
    objective_ids: [ccp-03-o2, ccp-03-o3]
  - id: ccp-03-multiagente
    title: "Anthropic · How we built our multi-agent research system (90,2 % mejor, 15× tokens)"
    kind: doc
    url: https://www.anthropic.com/engineering/multi-agent-research-system
    objective_ids: [ccp-03-o1]
  - id: ccp-03-contexto
    title: "Anthropic · Effective context engineering for AI agents"
    kind: doc
    url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    objective_ids: [ccp-03-o1]
  - id: ccp-03-academy
    title: "Anthropic Academy · Introduction to subagents (curso gratuito)"
    kind: doc
    url: https://anthropic.skilljar.com/introduction-to-subagents
    objective_ids: [ccp-03-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el sábado de 7:30 a 9:30 p.m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la sesión en el hilo o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el entregable 3
    tool: git
    phase: experimentacion
    description: "Dashboard funcionando y chat que responde 20 preguntas de evaluación con 18 o más correctas y ninguna escritura posible."
    check: La entrega aparece en «Mis notas»
---

## Objetivo

Repartir el trabajo entre agentes sin que el contexto principal se infle.

Regla de todo el curso: **cada sesión empieza con una línea base y termina con una medición.** Nada se afirma sin número.

## Entregable 3

Dashboard funcionando y chat que responde 20 preguntas de evaluación con 18 o más correctas y ninguna escritura posible.
