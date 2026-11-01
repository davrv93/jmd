---
id: sc-01
title: "Sesión 1 · Lo que la IA no te dice: revisar código generado"
published: true
starts_at: 2026-11-18T19:30:00-05:00
objectives:
  - id: sc-01-o1
    title: Reconocer los fallos de seguridad más frecuentes del código que genera la IA (claves expuestas, entradas sin validar, permisos de más)
  - id: sc-01-o2
    title: Usar el OWASP Top 10 como lista de revisión
  - id: sc-01-o3
    title: Pedirle a la IA una revisión de seguridad y comprobar lo que responde
recording:
  url: ""
  passcode: ""
materials:
  - id: sc-01-m1
    title: OWASP Top 10 · los riesgos más críticos de las aplicaciones web
    kind: doc
    url: https://owasp.org/Top10/
    objective_ids: [sc-01-o1, sc-01-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: revisar
    title: Revisar un código generado
    tool: lms
    phase: experimentacion
    description: Pide a la IA un formulario de login y revísalo con la lista del OWASP Top 10. Anota cada fallo que encuentres.
    check: Encontraste al menos 3 fallos y sabes en qué categoría cae cada uno
---

# Lo que la IA no te dice

La IA escribe código que funciona a la primera, y por eso nadie lo revisa. En esta sesión aprendes a
mirarlo con ojos de atacante: claves dentro del código, entradas que llegan sin validar, permisos de más y
errores que cuentan demasiado. El OWASP Top 10 es tu lista de revisión.
