---
id: ex-09
title: "Sesión 9 · Kardex · promedio ponderado móvil"
published: true
objectives:
  - id: ex-09-o1
    title: "Registrar entradas, salidas y saldos de un kardex valorizado"
  - id: ex-09-o2
    title: "Recalcular el costo promedio ponderado móvil después de cada compra"
  - id: ex-09-o3
    title: "Obtener el costo de ventas del mes y el valor final del inventario"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-09-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-09-o1]
  - id: ex-09-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m3
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E01-comercial-andina.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E03-contables-pacifico.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E08-colegio-amauta.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
  - id: ex-09-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-09/ex-09-E10-agro-valle-verde.xlsx
    objective_ids: [ex-09-o1, ex-09-o2, ex-09-o3]
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
    description: "Escena 2: Columnas del kardex."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Calcula el promedio."
    check: "Marcaste la lista y terminaste el juego"
---

## Kardex · promedio ponderado móvil

Llevas el kardex valorizado de un producto: cada compra recalcula el costo promedio y cada salida se valoriza al promedio vigente.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Columnas del kardex» |
| Demostración guiada | 15 | Entradas, salidas al promedio y saldos |
| Caso práctico | 30 | Kardex del producto principal con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Calcula el promedio» |

### El caso práctico

1. Abre la hoja **Kardex** (fila 5 = saldo inicial).
2. Escribe en la fila 6 las fórmulas de **entrada**, **salida** y **saldo**.
3. Copia las fórmulas hasta la **última fila**.
4. Revisa el **costo de ventas** y el **valor final**.
5. Pide a la IA que busque el primer error.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es mi kardex por promedio ponderado móvil. Revisa fila por fila que cada salida use el costo promedio del saldo anterior y que el saldo final cuadre. Dime en qué fila está el primer error, si hay alguno.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*Método del promedio ponderado móvil, uno de los métodos de valuación aceptados (didáctico: no incluye devoluciones ni mermas).*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
