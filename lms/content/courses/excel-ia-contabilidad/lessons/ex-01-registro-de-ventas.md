---
id: ex-01
title: "Sesión 1 · Registro de ventas"
published: true
objectives:
  - id: ex-01-o1
    title: "Convertir un rango en tabla inteligente y fijar la tasa del IGV en una celda"
  - id: ex-01-o2
    title: "Calcular IGV y total con SI y REDONDEAR solo para operaciones gravadas"
  - id: ex-01-o3
    title: "Resumir las ventas del mes con SUMAR.SI.CONJUNTO y CONTAR.SI"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-01-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-01-o1]
  - id: ex-01-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m1
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E01-comercial-andina.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E03-contables-pacifico.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E08-colegio-amauta.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
  - id: ex-01-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-01/ex-01-E10-agro-valle-verde.xlsx
    objective_ids: [ex-01-o1, ex-01-o2, ex-01-o3]
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

## Registro de ventas

Conviertes los comprobantes del mes en una tabla inteligente que calcula sola el IGV y el total, y armas un resumen del mes.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «¿Gravada, exonerada o exportación?» |
| Demostración guiada | 15 | Tabla, IGV con SI y resumen con SUMAR.SI.CONJUNTO |
| Caso práctico | 30 | Registro de ventas de octubre con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Arma la fórmula del IGV» |

### El caso práctico

1. Abre la hoja **Ventas**: ya están los 24 comprobantes.
2. Escribe la fórmula del **IGV** (solo gravadas, tasa en N2).
3. Escribe la fórmula del **Total**.
4. Completa el **resumen** de la derecha.
5. Pide a la IA que revise tu hoja.

### Pide ayuda a la IA (DeepSeek Harness)

> Te paso mi registro de ventas de octubre (columnas Fecha, Tipo, Serie, Cliente, Operación, Valor de venta, IGV, Total). Revisa qué filas tienen el IGV mal calculado (18 % solo en gravadas) y explícame la fórmula correcta en Excel en español.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*IGV 18 % = 16 % IGV + 2 % IPM. Regla didáctica simplificada: no cubre percepciones, detracciones ni casos especiales.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
