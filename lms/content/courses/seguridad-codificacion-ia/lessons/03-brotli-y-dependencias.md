---
id: sc-03
title: "Sesión 3 · Brotli y las dependencias que se olvidan"
published: true
starts_at: 2026-12-02T19:30:00-05:00
objectives:
  - id: sc-03-o1
    title: Entender cómo una librería de compresión desactualizada (como Brotli) pone en riesgo a todo el servidor
  - id: sc-03-o2
    title: Buscar vulnerabilidades conocidas en las dependencias con OSV-Scanner
  - id: sc-03-o3
    title: Pedir la corrección a la IA y probar que la vulnerabilidad quedó cerrada
recording:
  url: ""
  passcode: ""
materials:
  - id: sc-03-m1
    title: Brotli · el repositorio oficial de Google
    kind: repo
    url: https://github.com/google/brotli
    objective_ids: [sc-03-o1]
  - id: sc-03-m2
    title: OSV-Scanner · buscar vulnerabilidades conocidas en tus dependencias
    kind: doc
    url: https://google.github.io/osv-scanner/
    objective_ids: [sc-03-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: escanear
    title: Escanear y cerrar
    tool: terminal
    phase: experimentacion
    description: Escanea tu proyecto con OSV-Scanner, elige el hallazgo más grave, pide la corrección a la IA y vuelve a escanear.
    check: El hallazgo ya no aparece en el segundo escaneo
---

# Brotli y las dependencias que se olvidan

Lo que más se olvida no es tu código: son las librerías que vienen debajo, como las de compresión, que se
instalan una vez y nadie vuelve a tocar. Aprendes a encontrarlas, a saber si tienen vulnerabilidades
conocidas y a cerrarlas con ayuda de la IA, comprobando el resultado.
