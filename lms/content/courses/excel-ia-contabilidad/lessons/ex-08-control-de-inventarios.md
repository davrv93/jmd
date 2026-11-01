---
id: ex-08
title: "Sesión 8 · Control de inventarios"
published: true
objectives:
  - id: ex-08-o1
    title: "Sumar entradas y salidas por producto con SUMAR.SI.CONJUNTO"
  - id: ex-08-o2
    title: "Calcular stock final y valor del inventario"
  - id: ex-08-o3
    title: "Crear una alerta de reposición con SI y formato condicional"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-08-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-08-o1]
  - id: ex-08-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m3
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E01-comercial-andina.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E03-contables-pacifico.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E08-colegio-amauta.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E10-agro-valle-verde.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
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
    description: "Escena 2: Semáforo del almacén."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Caza el error del inventario."
    check: "Marcaste la lista y terminaste el juego"
---

## Control de inventarios

Con los movimientos del mes calculas entradas, salidas y stock final de cada producto, su valor y una alerta de reposición pintada con formato condicional.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Semáforo del almacén» |
| Demostración guiada | 15 | SUMAR.SI.CONJUNTO, stock, SI y formato condicional |
| Caso práctico | 30 | Inventario de octubre con alertas con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Caza el error del inventario» |

### El caso práctico

1. Mira la hoja **Movimientos**.
2. En **Inventario**, suma **entradas** y **salidas** de cada producto.
3. Calcula **stock final** y **valor**.
4. Escribe la **alerta** y píntala con formato condicional.
5. Pide a la IA una lista de compras.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi hoja de inventario de octubre. Revisa que el stock final cuadre con los movimientos y arma una lista de compras para los productos en «Reponer», con cuántas unidades pedir para volver al doble del mínimo.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
