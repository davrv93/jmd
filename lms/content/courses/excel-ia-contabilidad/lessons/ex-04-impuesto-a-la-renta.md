---
id: ex-04
title: "Sesión 4 · Impuesto a la Renta"
published: true
objectives:
  - id: ex-04-o1
    title: "Separar gastos deducibles y no deducibles con SUMAR.SI.CONJUNTO"
  - id: ex-04-o2
    title: "Calcular el impuesto según el régimen de tu empresa (General, MYPE Tributario o RER) con SI"
  - id: ex-04-o3
    title: "Comparar el impuesto anual con los pagos a cuenta"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-04-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-04-o1]
  - id: ex-04-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m1
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E01-comercial-andina.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E03-contables-pacifico.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E08-colegio-amauta.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
  - id: ex-04-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-04/ex-04-E10-agro-valle-verde.xlsx
    objective_ids: [ex-04-o1, ex-04-o2, ex-04-o3]
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
    description: "Escena 2: Memoria de regímenes."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Caza el gasto mal marcado."
    check: "Marcaste la lista y terminaste el juego"
---

## Impuesto a la Renta

Con los ingresos y gastos del año de tu empresa calculas, según su régimen, el impuesto anual (o las cuotas del RER) y los pagos a cuenta.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Memoria de regímenes» |
| Demostración guiada | 15 | Deducibles, renta neta e impuesto con SI |
| Caso práctico | 30 | Renta 2026 según tu régimen con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Caza el gasto mal marcado» |

### El caso práctico

1. Mira el **régimen** de tu empresa (ficha o celda de arriba).
2. Calcula los **pagos a cuenta** (o las **cuotas RER**) de cada mes.
3. Suma ingresos y gastos **deducibles** / **no deducibles**.
4. Calcula la **renta neta** y el **impuesto** de tu régimen.
5. Pide a la IA que lo explique al gerente.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi hoja de Impuesto a la Renta 2026. Revisa mis fórmulas, dime si apliqué bien la tasa del régimen de mi empresa y explícame el resultado como se lo explicaría al gerente, en 5 líneas.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*Cálculo didáctico simplificado. Tasas usadas: Régimen General 29,5 % de la renta neta; MYPE Tributario 10 % hasta 15 UIT y 29,5 % por el exceso; RER 1,5 % de los ingresos netos mensuales. UIT 2026 = S/ 5 500 (D.S. N.° 301-2025-EF). Pagos a cuenta simplificados (1,5 % General, 1 % MYPE). Verifica la norma vigente antes de usarlo en un caso real.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
