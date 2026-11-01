---
id: ex-14
title: "Sesión 14 · Flujo de caja"
published: true
objectives:
  - id: ex-14-o1
    title: "Sumar ingresos y egresos por mes y calcular el flujo neto"
  - id: ex-14-o2
    title: "Encadenar saldo inicial y saldo final de mes a mes"
  - id: ex-14-o3
    title: "Detectar meses bajo la caja mínima y el monto que falta"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-14-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-14-o1]
  - id: ex-14-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m4
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E01-comercial-andina.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E03-contables-pacifico.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E08-colegio-amauta.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E10-agro-valle-verde.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
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
    description: "Escena 2: ¿Entra, sale o no es caja?."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Calcula la caja."
    check: "Marcaste la lista y terminaste el juego"
---

## Flujo de caja

Proyectas seis meses de ingresos y egresos, encadenas los saldos y detectas qué meses quedan bajo la caja mínima.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «¿Entra, sale o no es caja?» |
| Demostración guiada | 15 | Totales, flujo neto, saldos encadenados y alerta |
| Caso práctico | 30 | Flujo de caja de seis meses con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Calcula la caja» |

### El caso práctico

1. Abre la hoja **Flujo** (meses en columnas).
2. Calcula **totales**, **flujo neto** y **saldo final**.
3. Encadena el **saldo inicial** de cada mes.
4. Marca los meses bajo la **caja mínima** y cuánto falta.
5. Pide a la IA tres ideas para esos meses.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es mi flujo de caja proyectado de noviembre 2026 a abril 2027. Revisa que el saldo pase bien de un mes a otro y, para los meses que quedan bajo la caja mínima, dame tres ideas concretas para cubrirlos (cobrar antes, postergar, financiar).

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
