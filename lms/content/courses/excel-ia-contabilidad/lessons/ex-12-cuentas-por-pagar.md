---
id: ex-12
title: "Sesión 12 · Cuentas por pagar"
published: true
objectives:
  - id: ex-12-o1
    title: "Calcular días para vencer y prioridad de pago con SI y O"
  - id: ex-12-o2
    title: "Asignar la semana de pago con SI anidados"
  - id: ex-12-o3
    title: "Comparar pagos semanales con la caja disponible"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-12-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-12-o1]
  - id: ex-12-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m4
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E01-comercial-andina.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E03-contables-pacifico.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E08-colegio-amauta.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E10-agro-valle-verde.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
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
    description: "Escena 2: ¿Qué pago primero?."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Prioriza los pagos."
    check: "Marcaste la lista y terminaste el juego"
---

## Cuentas por pagar

Ordenas las obligaciones de noviembre por prioridad, las repartes por semana de pago y compruebas si la caja alcanza.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «¿Qué pago primero?» |
| Demostración guiada | 15 | Días para vencer, prioridad, semana y caja |
| Caso práctico | 30 | Programación de pagos de noviembre con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Prioriza los pagos» |

### El caso práctico

1. Abre la hoja **Pagos**.
2. Calcula **días para vencer** y **prioridad**.
3. Calcula la **semana de pago**.
4. Completa el cuadro **semana / a pagar / caja / ¿alcanza?**.
5. Pide a la IA qué pago mover si no alcanza.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi programación de pagos de noviembre. Revisa las prioridades y, si alguna semana la caja no alcanza, propón qué pago mover y a qué semana, sin atrasar planilla ni impuestos. Respóndeme en una tabla.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
