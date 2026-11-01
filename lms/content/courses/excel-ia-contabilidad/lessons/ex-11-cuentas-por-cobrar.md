---
id: ex-11
title: "Sesión 11 · Cuentas por cobrar"
published: true
objectives:
  - id: ex-11-o1
    title: "Sumar pagos parciales por factura y obtener el saldo"
  - id: ex-11-o2
    title: "Calcular días vencidos con fechas y MAX"
  - id: ex-11-o3
    title: "Clasificar la antigüedad con SI.CONJUNTO y resumir por tramo"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-11-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-11-o1]
  - id: ex-11-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m4
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E01-comercial-andina.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E03-contables-pacifico.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E08-colegio-amauta.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E10-agro-valle-verde.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
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
    description: "Escena 2: Semáforo de cobranza."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Arma la fórmula de cobranza."
    check: "Marcaste la lista y terminaste el juego"
---

## Cuentas por cobrar

Con las facturas y los pagos parciales de tus clientes calculas saldos, días vencidos y la antigüedad de cada deuda al 31/10/2026.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Semáforo de cobranza» |
| Demostración guiada | 15 | Vencimiento, pagos con SUMAR.SI.CONJUNTO, días y SI.CONJUNTO |
| Caso práctico | 30 | Antigüedad de la cartera con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Arma la fórmula de cobranza» |

### El caso práctico

1. Mira la hoja **Pagos** (hay pagos parciales).
2. En **Cobranzas**, calcula **vencimiento**, **pagado** y **saldo**.
3. Calcula **días vencidos** y **antigüedad**.
4. Completa el **resumen por tramo**.
5. Pide a la IA un plan de cobranza.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi hoja de cuentas por cobrar al 31/10/2026 con la antigüedad de cada factura. Revisa los saldos y los tramos, y arma un plan de cobranza: a quién llamar primero y qué decirle, en una tabla corta.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
