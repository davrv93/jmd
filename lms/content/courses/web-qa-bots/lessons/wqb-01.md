---
id: wqb-01
title: "Parte 1 · Explora: usuarios sintéticos que encuentran lo que nadie escribió"
published: true
duration: 30
objectives:
  - {id: wqb-01-o1, title: "Levantar Tienda Sol y los cuatro bots con Docker, en Windows o Mac"}
  - {id: wqb-01-o2, title: "Leer un fallo con su evidencia: captura, pasos y peticiones a la API"}
  - {id: wqb-01-o3, title: "Convertir el fallo en una prueba de Playwright que lo reproduce"}
recording:
  url: "https://us06web.zoom.us/rec/share/qAAafuJWe_XzsOeSs4kClXoh1Q_2u1D990ECLO5UduQE7d9XcJ5fPiLTNYOxLIvm.nh6V1_7OXE9h-Bak?pwd=DCQMqevzlM_1te5vlQAAIAAAAExNgIuehGyvdMMrY-go8RcHYdVgqL-QKJts4PqFY6Pngn7bxrvbEQjffrG_ouLrWTAwMDAwNA"
  passcode: "iy358*!h"
materials:
  - {id: wqb-01-repo, title: "Repo en GitHub · todos los ejemplos del curso, con Docker para Windows y Mac", kind: link, url: https://github.com/davrv93/qa-bots-ejemplos}
  - {id: wqb-00-panorama, title: "Video · Panorama del curso: explora, vigila, repara y tu WhatsApp de QA", kind: video, file: materials/grabaciones/wqb-00-panorama.mp4, objective_ids: [wqb-01-o1]}
  - {id: wqb-01-resumen, title: "Video · Explora: usuarios sintéticos que encuentran los fallos (resumen de la sesión en vivo)", kind: video, file: materials/grabaciones/wqb-01-explora-resumen.mp4, objective_ids: [wqb-01-o1, wqb-01-o2, wqb-01-o3]}
  - {id: wqb-01-prompts, title: "Prompts del curso, paso a paso", kind: link, url: https://github.com/davrv93/qa-bots-ejemplos/blob/main/prompts/README.md, objective_ids: [wqb-01-o3]}
cycle:
  - id: ver
    title: Mira el panorama y el resumen
    tool: lms
    phase: experiencia
    description: "Empieza por el video de panorama y sigue con el resumen de la sesión en vivo. La grabación completa también está disponible."
    check: Viste los dos videos
  - id: levantar
    title: Levanta la tienda y suelta los bots
    tool: terminal
    phase: experiencia
    description: "Con el repositorio: copia `.env.example` a `.env`, corre `docker compose up -d --build` y luego `docker compose --profile explora up -d --build`. Abre http://127.0.0.1:3300 y pulsa «Iniciar 4 bots»."
    check: El panel «Fallos registrados» muestra al menos un fallo
  - id: leer
    title: Lee un fallo
    tool: lms
    phase: reflexion
    description: "Abre un fallo, mira la captura, los pasos y las peticiones. Escribe en el hilo qué regla se rompió y qué usuario real lo habría sufrido. Pista: ¿`reporte-no-cuadra` es un fallo de la tienda o del oráculo?"
    check: Tu explicación aparece en el hilo
  - id: oraculo
    title: Qué es un oráculo
    tool: lms
    phase: conceptualizacion
    description: "Un bot no sabe si algo está mal: lo decide su oráculo, la regla que compara lo que pasó con lo que debía pasar. Un oráculo mal hecho da falsos positivos; el README explica uno real de este repositorio."
    check: Puedes explicar con tus palabras por qué un oráculo puede equivocarse
  - id: reproducir
    title: Del fallo a la prueba
    tool: claude-code
    phase: experimentacion
    description: "Usa el prompt del paso 2 (`prompts/README.md`) para convertir la ficha del fallo en una prueba de Playwright con los Page Objects de `pruebas/pages/`."
    check: La prueba falla en rojo por el mismo motivo que vio el bot
---

## Parte 1 · Explora

Curso en modalidad web: mira los videos en orden y replica cada paso en tu máquina con el repositorio.

Las pruebas que escribes cubren lo que ya imaginaste. Los bots recorren la tienda como personas distintas y
encuentran lo que nadie escribió.

| Bot | Cómo usa la tienda |
|---|---|
| Rosa | Cajera apurada: vende rápido, no relee |
| Luis | Cliente curioso: entra a todo, pregunta precios |
| Mía | Meticulosa: revisa cada total y cada reporte |
| Beto | Torpe: se equivoca, borra, vuelve a intentar |

Con la misma semilla repiten los mismos recorridos: un fallo que encuentran hoy lo vuelven a encontrar mañana.

**Entregable 1:** la captura de un fallo encontrado por los bots, la prueba que lo reproduce en rojo y dos
líneas sobre qué usuario real lo habría sufrido.
