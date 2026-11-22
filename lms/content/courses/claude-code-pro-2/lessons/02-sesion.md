---
id: ccp2-02
title: "Sesión 2 · Conducir a Claude para hacer un tablero"
published: true
starts_at: 2026-11-22T14:00:00-05:00
duration: 60
objectives:
  - id: ccp2-02-o1
    title: "Conducir a Claude en claude.ai: decir la decisión, pedir un plan y cambiar una cosa a la vez"
  - id: ccp2-02-o2
    title: "Entender la mesa de Claude y los manuales (skills), y subir el de tableros"
  - id: ccp2-02-o3
    title: "Construir un tablero de ventas como artifact y comprobar sus cifras"
recording:
  url: ""
  passcode: ""
materials:
  - id: ccp2-02-ventas
    title: "ventas-ejemplo.csv · ventas de 4 boticas (ene–oct 2026) para hacer el tablero en claude.ai"
    kind: file
    file: materials/web/ventas-ejemplo.csv
    objective_ids: [ccp2-02-o3]
  - id: ccp2-02-excel
    title: "ventas-boticas-2026.xlsx · los mismos datos en Excel, con formato de tabla"
    kind: file
    file: materials/web/ventas-boticas-2026.xlsx
    objective_ids: [ccp2-02-o3]
  - id: ccp2-02-plugin-video
    title: "Video · cómo instalar el plugin Research Academy en claude.ai (1 min, trae el panel Tablero)"
    kind: video
    file: materials/web/instalar-research-academy.mp4
    objective_ids: [ccp2-02-o1, ccp2-02-o3]
  - id: ccp2-02-plugin
    title: "Research Academy · guía de instalación del plugin (marketplace davrv93/claude-research)"
    kind: doc
    url: https://github.com/davrv93/claude-research/blob/main/plugins/research-academy/skills/research-academy/references/instalacion.md
    objective_ids: [ccp2-02-o1]
  - id: ccp2-02-skill-web
    title: "build-dashboard.zip · el manual de tableros de Anthropic, para subirlo en claude.ai (Configuración › Capacidades › Skills)"
    kind: zip
    file: materials/web/build-dashboard.zip
    objective_ids: [ccp2-02-o2, ccp2-02-o3]
  - id: ccp2-02-kit
    title: "Opcional (Claude Code) · kit-multiagente.zip · 3 subagentes, la skill build-dashboard, el hook solo-lectura y tokens_a_csv.py (descomprímelo en una carpeta nueva)"
    kind: zip
    file: materials/multiagente/kit-multiagente.zip
    objective_ids: [ccp2-02-o1, ccp2-02-o2, ccp2-02-o3]
  - id: ccp2-02-prompts
    title: "Opcional (Claude Code) · PROMPTS.md · la versión de la sesión en la terminal"
    kind: doc
    file: materials/multiagente/PROMPTS.md
    objective_ids: [ccp2-02-o1, ccp2-02-o2, ccp2-02-o3]
  - id: ccp2-02-skill
    title: "build-dashboard · la skill de dashboards de Anthropic (plugin data, Apache 2.0)"
    kind: doc
    url: https://github.com/anthropics/knowledge-work-plugins/blob/main/data/skills/build-dashboard/SKILL.md
    objective_ids: [ccp2-02-o2, ccp2-02-o3]
  - id: ccp2-02-doc-subagentes
    title: "Opcional · Claude Code · subagentes (ventana propia, herramientas, modelo)"
    kind: doc
    url: https://code.claude.com/docs/en/sub-agents
    objective_ids: [ccp2-02-o1]
  - id: ccp2-02-doc-skills
    title: "Opcional · Claude Code · skills (descripción, carga progresiva, menos de 500 líneas)"
    kind: doc
    url: https://code.claude.com/docs/en/skills
    objective_ids: [ccp2-02-o2]
  - id: ccp2-02-doc-hooks
    title: "Opcional · Claude Code · hooks (PreToolUse, código de salida 2)"
    kind: doc
    url: https://code.claude.com/docs/en/hooks
    objective_ids: [ccp2-02-o2, ccp2-02-o3]
  - id: ccp2-02-multiagente
    title: "Anthropic · How we built our multi-agent research system (90,2 % mejor, 15× tokens)"
    kind: doc
    url: https://www.anthropic.com/engineering/multi-agent-research-system
    objective_ids: [ccp2-02-o1]
  - id: ccp2-02-contexto
    title: "Anthropic · Effective context engineering for AI agents"
    kind: doc
    url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    objective_ids: [ccp2-02-o1]
  - id: ccp2-02-academy
    title: "Anthropic Academy · Introduction to subagents (curso gratuito)"
    kind: doc
    url: https://anthropic.skilljar.com/introduction-to-subagents
    objective_ids: [ccp2-02-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el domingo de 2:00 a 3:00 p.m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la sesión en el hilo o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el entregable 2
    tool: git
    phase: experimentacion
    description: "Tu tablero publicado desde claude.ai, el plan que Claude te propuso y lo que cambiaste, la captura de la comprobación de cifras y tus dos notas (pedido vago y pedido conducido)."
    check: La entrega aparece en «Mis notas»
---

## Objetivo

Conducir a Claude en claude.ai hasta un tablero de ventas que sirva para decidir: decir la decisión, pedir un plan antes de construir, cambiar una cosa a la vez y comprobar las cifras. Lo hacemos con el manual de tableros de Anthropic (skill build-dashboard) o con el panel Tablero del plugin Research Academy.

Regla de todo el curso: **cada sesión empieza con una línea base y termina con una medición.** Nada se afirma sin número.

## Entregable 2

En «Mis notas»:

1. El enlace de tu tablero publicado (en el artifact, «Publicar»).
2. El plan que Claude te propuso y lo que cambiaste.
3. La captura de la comprobación de cifras: el total de una sede según Claude y según tu Excel.
4. Tus dos notas del 1 al 10: el pedido de una frase y el pedido conducido.
