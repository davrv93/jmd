---
id: ex-19
title: "Sesión 19 · Auditoría contable"
published: true
objectives:
  - id: ex-19-o1
    title: "Detectar duplicados con CONTAR.SI"
  - id: ex-19-o2
    title: "Validar IGV, totales, RUC (LARGO) y fechas con SI, ABS e Y"
  - id: ex-19-o3
    title: "Encontrar correlativos faltantes y resumir los hallazgos"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-19-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-19-o1]
  - id: ex-19-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m5
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E01-comercial-andina.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E03-contables-pacifico.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E08-colegio-amauta.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E10-agro-valle-verde.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
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
    description: "Escena 2: Caza los errores del registro."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Memoria del auditor."
    check: "Marcaste la lista y terminaste el juego"
---

## Auditoría contable

Auditas un registro de ventas con errores sembrados: duplicados, IGV mal calculado, totales que no cuadran, RUC incompletos, fechas fuera del periodo y correlativos faltantes.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Caza los errores del registro» |
| Demostración guiada | 15 | Controles con CONTAR.SI, ABS, LARGO, Y y correlativos |
| Caso práctico | 30 | Auditoría del registro de ventas con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Memoria del auditor» |

### El caso práctico

1. En **Ventas**, completa las 6 columnas de control.
2. Pinta «Revisar» y «Sí» en rojo con formato condicional.
3. En **Correlativos**, marca los que **faltan**.
4. Completa el **resumen de hallazgos**.
5. Pide a la IA el informe de auditoría.

### Pide ayuda a la IA (DeepSeek Harness)

> Te paso los resultados de mi auditoría del registro de ventas de octubre (duplicados, IGV, totales, RUC, fechas y correlativos faltantes). Redacta un informe de auditoría breve: hallazgo, riesgo y recomendación, en una tabla.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
