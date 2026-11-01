---
id: ex-03
title: "Sesión 3 · IGV: liquidación mensual"
published: true
objectives:
  - id: ex-03-o1
    title: "Calcular débito y crédito fiscal por mes con SUMAR.SI.CONJUNTO de dos condiciones"
  - id: ex-03-o2
    title: "Arrastrar el saldo a favor de un mes al siguiente con MAX"
  - id: ex-03-o3
    title: "Explicar con palabras simples por qué un mes sale a pagar y otro no"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-03-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-03-o1]
  - id: ex-03-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m1
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E01-comercial-andina.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E03-contables-pacifico.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E08-colegio-amauta.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E10-agro-valle-verde.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
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
    description: "Escena 2: Contrarreloj del IGV."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Ordena la liquidación."
    check: "Marcaste la lista y terminaste el juego"
---

## IGV: liquidación mensual

Juntas ventas y compras de tres meses y calculas, mes a mes, si toca pagar IGV o si queda saldo a favor para el siguiente.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Contrarreloj del IGV» |
| Demostración guiada | 15 | Débito y crédito por mes y saldo que pasa |
| Caso práctico | 30 | Liquidación de IGV de agosto a octubre con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Ordena la liquidación» |

### El caso práctico

1. Mira las hojas **Ventas** y **Compras** (ya traen el IGV y el mes).
2. En **Liquidación**, calcula ventas gravadas, débito y crédito de cada mes.
3. Calcula el **resultado** de cada mes.
4. Separa **a pagar** y **saldo a favor** con MAX; pasa el saldo al mes siguiente.
5. Pide a la IA que lo explique como al gerente.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi liquidación de IGV de agosto a octubre. Comprueba que el saldo a favor de cada mes pasa bien al mes siguiente y explícame con palabras simples por qué un mes salió a pagar y otro no.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*Liquidación didáctica simplificada: no incluye percepciones, retenciones, detracciones ni prorrata.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
