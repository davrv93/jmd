---
id: qab-01
title: "Sesión 1 · Explora: usuarios sintéticos que encuentran lo que nadie escribió"
published: true
starts_at: 2026-11-15T15:00:00-05:00
duration: 90
objectives:
  - id: qab-01-o1
    title: "Soltar cuatro usuarios sintéticos sobre tu Tienda Sol y verlos trabajar en vivo"
  - id: qab-01-o2
    title: "Leer un fallo con su evidencia: captura, pasos con localizadores y peticiones a la API"
  - id: qab-01-o3
    title: "Convertir el fallo en una prueba de Playwright que lo reproduce"
recording:
  url: ""
  passcode: ""
materials:
  - id: kit
    title: "Kit de práctica (con los bots y el robot)"
    kind: zip
    file: materials/qa-bots-kit.zip
    objective_ids: [qab-01-o1, qab-01-o3]
  - id: demo
    title: "Los 4 bots en vivo"
    kind: link
    url: https://jmd-learn.online/qa-bots/
    objective_ids: [qab-01-o1, qab-01-o2]
  - id: tienda
    title: "Tu Tienda Sol en la nube"
    kind: link
    url: https://jmd-learn.online/tienda-sol/
    objective_ids: [qab-01-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo el domingo de 3:00 a 4:30 p. m. (hora de Lima) o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: bots
    title: Soltar los cuatro bots
    tool: terminal
    phase: experiencia
    description: "Desde el kit: `cd pruebas && npm install`, vuelve a la raíz y corre `BASE_URL=https://jmd-learn.online/tienda-sol/ node bots/bots.mjs`. Abre http://localhost:3300 y pulsa «Iniciar 4 bots»."
    check: El panel «Fallos registrados» muestra al menos un fallo
  - id: leer
    title: Leer un fallo
    tool: lms
    phase: reflexion
    description: Abre un fallo, mira la captura, los pasos y las peticiones. Escribe en el hilo qué regla se rompió y qué usuario real lo habría sufrido.
    check: Tu explicación aparece en el hilo de la sesión
  - id: reproducir
    title: Reproducir con Playwright
    tool: terminal
    phase: experimentacion
    description: "Descarga la spec del fallo, cópiala a `pruebas/specs/` y córrela: `BASE_URL=… npx playwright test specs/reproducir-*.spec.ts`."
    check: La prueba falla en rojo por el mismo motivo que vio el bot
---

## Objetivo

Que tu sistema tenga usuarios que no se cansan. Las pruebas que escribes cubren lo que ya imaginaste; los
bots recorren la tienda como personas distintas y encuentran lo que nadie escribió.

## Los cuatro bots

| Bot | Cómo usa la tienda |
|---|---|
| Rosa | Cajera apurada: vende rápido, no relee |
| Luis | Cliente curioso: entra a todo, pregunta precios |
| Mía | Meticulosa: revisa cada total y cada reporte |
| Beto | Torpe: se equivoca, borra, vuelve a intentar |

Mueven el mouse en curvas, teclean letra por letra y dudan. Con la misma semilla repiten los mismos viajes,
así que un fallo encontrado hoy se vuelve a encontrar mañana.

## De un fallo a una prueba

1. El bot rompe una regla (un total que no cuadra, un botón que no responde).
2. Queda la evidencia: captura, los pasos con sus localizadores y las peticiones a la API.
3. El panel genera `reproducir-<id>.spec.ts`. Esa prueba en rojo es el pedido de corrección más claro que
   puedes entregar: el error se repite en cualquier máquina.

Corre la tienda con `BUGS=0` y vuelve a soltar a los bots: lo que siga fallando es un hallazgo de verdad.

## Entregable 1

La captura de un fallo encontrado por los bots, la spec que lo reproduce en rojo y dos líneas sobre qué
usuario real lo habría sufrido.
