---
id: sc-02
title: "Sesión 2 · PHP y Node: las vulnerabilidades de siempre"
published: true
starts_at: 2026-11-25T19:30:00-05:00
objectives:
  - id: sc-02-o1
    title: Encontrar y corregir inyección SQL y XSS en PHP y en Node
  - id: sc-02-o2
    title: Entender la contaminación de prototipos en Node y la deserialización insegura en PHP
  - id: sc-02-o3
    title: Auditar las dependencias con npm audit y composer audit
recording:
  url: ""
  passcode: ""
materials:
  - id: sc-02-m1
    title: npm audit · revisar las dependencias de Node
    kind: doc
    url: https://docs.npmjs.com/cli/commands/npm-audit
    objective_ids: [sc-02-o3]
  - id: sc-02-m2
    title: composer audit · revisar las dependencias de PHP
    kind: doc
    url: https://getcomposer.org/doc/03-cli.md#audit
    objective_ids: [sc-02-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: auditar
    title: Auditar dependencias
    tool: terminal
    phase: experimentacion
    description: Corre npm audit o composer audit en un proyecto, prioriza lo que salga y corrige lo más grave.
    check: Tienes la lista de hallazgos con su prioridad y al menos uno corregido
---

# PHP y Node: las vulnerabilidades de siempre

Inyección SQL, XSS, contaminación de prototipos, deserialización insegura: fallos viejos que la IA todavía
repite. Los encuentras en código real de PHP y de Node, los corriges y compruebas que quedaron cerrados.
Y revisas las dependencias, que suelen ser la puerta más grande.
