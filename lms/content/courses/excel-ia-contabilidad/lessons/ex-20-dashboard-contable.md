---
id: ex-20
title: "Sesión 20 · Dashboard contable"
published: true
objectives:
  - id: ex-20-o1
    title: "Calcular KPI de ventas: total, operaciones, ticket promedio, mejor mes y crecimiento"
  - id: ex-20-o2
    title: "Crear una tabla dinámica con segmentadores"
  - id: ex-20-o3
    title: "Armar un tablero con gráficos de columnas y circular"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-20-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-20-o1]
  - id: ex-20-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m5
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E01-comercial-andina.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E03-contables-pacifico.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E08-colegio-amauta.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E10-agro-valle-verde.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
cycle:
  - id: contexto
    title: "La idea del día"
    tool: lms
    phase: experiencia
    description: "Escena 1: la idea en tres frases y un diagrama."
    check: "Puedes decir con tus palabras qué vas a construir"
  - id: juego
    title: "Juego de calentamiento"
    tool: lms
    phase: reflexion
    description: "Escena 2: Pregunta y gráfico."
    check: "Terminaste el juego"
  - id: demo
    title: "Demostración guiada"
    tool: lms
    phase: conceptualizacion
    description: "Escena 3: el instructor hace el ejercicio paso a paso; tú miras y preguntas."
    check: "Viste todos los pasos de la demo"
  - id: caso
    title: "Caso práctico con tu empresa"
    tool: lms
    phase: experimentacion
    description: "Escena 4: descarga el Excel de tu empresa, resuélvelo y revisa con DeepSeek Harness."
    check: "Tu Excel tiene las celdas amarillas completas y los totales cuadran"
  - id: cierre
    title: "Cierre y repaso"
    tool: lms
    phase: reflexion
    description: "Escena 5: lista de comprobación y juego de repaso: Arma las fórmulas de los KPI."
    check: "Marcaste la lista y terminaste el juego"
---

## Dashboard contable

Con las ventas de 2025 armas un tablero: resumen por mes y canal, KPI, una tabla dinámica con segmentadores y dos gráficos.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Pregunta y gráfico» |
| Demostración guiada | 15 | KPI, tabla dinámica, segmentadores y gráficos |
| Caso práctico | 30 | Dashboard de ventas 2025 con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Arma las fórmulas de los KPI» |

### El caso práctico

1. En **Resumen**, completa venta por **mes** y por **canal**.
2. Calcula los **KPI**.
3. Crea la **tabla dinámica** con **segmentadores** de canal y mes.
4. Arma la hoja **Dashboard** con 2 gráficos y los KPI.
5. Pide a la IA 3 conclusiones para la gerencia.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es el resumen de ventas 2025 de mi dashboard (venta por mes, por canal y KPI). Revisa que los KPI estén bien calculados y redacta 3 conclusiones claras para la gerencia, con una recomendación cada una.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
