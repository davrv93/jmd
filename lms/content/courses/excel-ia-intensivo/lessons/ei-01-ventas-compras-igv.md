---
id: ei-01
title: "Sesión 1 · Ventas, compras e IGV"
published: true
objectives:
  - id: ei-01-o1
    title: "Calcular IGV y total en un registro de ventas hecho tabla, con la tasa en una celda"
  - id: ei-01-o2
    title: "Sacar la base y el IGV de las compras y clasificarlas"
  - id: ei-01-o3
    title: "Liquidar el IGV del mes: débito, crédito y saldo a favor con MAX"
recording:
  url: ""
  passcode: ""
materials:
  - id: ei-01-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ei-01-o1]
  - id: ei-01-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E01-comercial-andina.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E02-distribuidora-rimac.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E03-contables-pacifico.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E04-sabores-del-puerto.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E05-transportes-sol-andino.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E06-constructora-los-pinos.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E07-clinica-santa-lucia.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E08-colegio-amauta.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E09-taller-motor-rapido.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
  - id: ei-01-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ei-01/ei-01-E10-agro-valle-verde.xlsx
    objective_ids: [ei-01-o1, ei-01-o2, ei-01-o3]
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
    description: "Escena 2: ¿Gravada, exonerada o exportación?."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Arma la fórmula del IGV."
    check: "Marcaste la lista y terminaste el juego"
---

## Ventas, compras e IGV

Armas el registro de ventas y el de compras como tablas que calculan solas el IGV, y liquidas el IGV del mes: débito fiscal, crédito fiscal e IGV a pagar o saldo a favor.

Cubre los temas 1, 2 y 3 del temario de 20 sesiones.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «¿Gravada, exonerada o exportación?» |
| Demostración guiada | 15 | Tabla e IGV de ventas, base de compras y liquidación con MAX |
| Caso práctico | 30 | Ventas, compras e IGV de octubre con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Arma la fórmula del IGV» |

### El caso práctico

1. Hoja **Ventas**: fórmula del IGV (solo gravadas, tasa en N2) y del Total.
2. Hoja **Compras**: elige la clasificación y saca la base (total ÷ 1.18) y el IGV.
3. Hoja **Liquidación**: débito, crédito y saldo a favor de agosto a octubre (usa MAX).
4. Pide a la IA que revise tus tres hojas.

### Pide ayuda a la IA (DeepSeek Harness)

> Te paso mis hojas de ventas, compras y la liquidación del IGV de agosto a octubre (datos ficticios). Revisa si el IGV de cada venta está bien (18 % solo en gravadas), si el crédito fiscal toma solo compras gravadas y si el saldo a favor pasa bien al mes siguiente. Explícame en palabras simples, con las fórmulas de Excel en español.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*Liquidación didáctica simplificada: no incluye percepciones, retenciones, detracciones ni prorrata. IGV 18 % = 16 % IGV + 2 % IPM. Regla didáctica simplificada: no cubre percepciones, detracciones ni casos especiales.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 4 sesiones.
