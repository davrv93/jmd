---
id: wqb-03
title: "Parte 3 · Repara: la IA propone la corrección y tú apruebas"
published: true
duration: 30
objectives:
  - {id: wqb-03-o1, title: "Darle a la IA el fallo con su evidencia y pedirle que arregle la app, no la prueba"}
  - {id: wqb-03-o2, title: "Revisar la sugerencia antes de aprobarla y comprobarla con los bots"}
  - {id: wqb-03-o3, title: "Abrir el pull request con la evidencia para que otra persona lo apruebe"}
materials:
  - {id: wqb-03-video, title: "Video · Repara: la IA propone, tú apruebas", kind: video, file: materials/grabaciones/wqb-03-repara.mp4, objective_ids: [wqb-03-o1, wqb-03-o2, wqb-03-o3]}
  - {id: wqb-03-prompts, title: "Prompts de los pasos 4 y 5", kind: link, url: https://github.com/davrv93/qa-bots-ejemplos/blob/main/prompts/README.md, objective_ids: [wqb-03-o1, wqb-03-o3]}
  - {id: wqb-03-gh-pr, title: "GitHub CLI: gh pr create", kind: doc, url: https://cli.github.com/manual/gh_pr_create, objective_ids: [wqb-03-o3]}
cycle:
  - id: ver
    title: Mira el video
    tool: lms
    phase: experiencia
    description: "Un fallo real de la tienda, la sugerencia de la IA, lo que se corrige a mano y la comprobación con los bots."
    check: Viste el video
  - id: pedir
    title: Pide la corrección
    tool: claude-code
    phase: experimentacion
    description: "Con el prompt del paso 4 y la prueba en rojo de la parte 1, pide a tu asistente que arregle la app. Si propone cambiar la prueba, detente y pregunta por qué."
    check: La prueba que antes fallaba ahora pasa en verde
  - id: revisar
    title: Revisa como aprobador
    tool: lms
    phase: reflexion
    description: "Lee el cambio antes de aprobar. En el video la IA acertó la línea pero inventó selectores en la prueba. Escribe en el hilo qué revisaste y qué le habrías rechazado."
    check: Tu revisión aparece en el hilo
  - id: comprobar
    title: Compruébalo con los bots
    tool: terminal
    phase: conceptualizacion
    description: "Vuelve a soltar a los bots con la misma semilla. Los fallos que arreglaste no deben volver. Si alguno sigue, decide si es un fallo de la app o del oráculo."
    check: Los fallos corregidos ya no aparecen
  - id: pr
    title: Abre el pull request
    tool: git
    phase: experimentacion
    description: "Con el prompt del paso 5: rama nueva, commit con el arreglo y la prueba, y `gh pr create` con la evidencia del fallo."
    check: El pull request aparece en GitHub con la prueba en verde
---

## Parte 3 · Repara

Cierra el ciclo: el bot encuentra, el vigía avisa y la IA propone la corrección. Tú decides: ningún cambio
entra sin tu aprobación.

**Lo que recibe la IA:** la prueba que reproduce el fallo, la evidencia del bot y la regla rota en una línea.
Con eso tiene un criterio de terminado que se puede comprobar.

**Lo que revisas tú:**

- Que arregló la app y no relajó la prueba.
- Que el cambio es pequeño y se entiende.
- Que la prueba usa los Page Objects de verdad y no selectores inventados.

**Comprobado en el repositorio:** con la corrección de `venta.js`, los bots con la misma semilla dejaron de
encontrar los fallos de promoción y de pago. El fallo `reporte-no-cuadra` siguió saliendo. Es un falso
positivo del oráculo: en local los cuatro bots comparten una tienda. Arreglar el oráculo es el ejercicio del
paso 2b.

**Entregable 3:** el enlace al pull request con la corrección y la prueba en verde.

## Prompts de esta parte

Pégalos en tu asistente de código (Claude Code, OpenCode, Cursor…) abierto en la carpeta del repositorio. Cada uno dice qué archivo tocar y cómo comprobarlo.

```prompt
# Paso 4 · Repara: que la IA proponga la corrección
Esta prueba falla en rojo: <ruta de la spec>. La regla que rompe la app es: <una línea>.
La evidencia del bot es: <captura o pasos>.
Arregla la APP, no la prueba. Haz el cambio mínimo. Después corre la prueba y todo
pruebas/specs/ y muéstrame que pasan en verde. Si para arreglarlo tienes que cambiar la prueba,
detente y explícame por qué antes de hacerlo.
```

```prompt
# Paso 5 · Repara: el pull request para que tú apruebes
Crea una rama fix/<regla>, haz commit del arreglo y de la prueba, y abre el pull request con
gh pr create. En la descripción pon: la regla rota, la evidencia del bot (pasos y captura),
qué cambiaste y la salida de la prueba en verde. No hagas merge: lo apruebo yo.
```

