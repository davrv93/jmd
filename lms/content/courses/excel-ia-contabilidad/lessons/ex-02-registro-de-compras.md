---
id: ex-02
title: "Sesión 2 · Registro de compras"
published: true
objectives:
  - id: ex-02-o1
    title: "Clasificar compras con una lista desplegable (validación de datos)"
  - id: ex-02-o2
    title: "Separar base imponible e IGV a partir del importe total"
  - id: ex-02-o3
    title: "Resumir compras por clasificación y calcular el crédito fiscal del mes"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-02-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-02-o1]
  - id: ex-02-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m1
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E01-comercial-andina.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E03-contables-pacifico.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E08-colegio-amauta.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E10-agro-valle-verde.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
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
    description: "Escena 2: ¿Qué compré?."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Del total a la base."
    check: "Marcaste la lista y terminaste el juego"
---

## Registro de compras

Registras las facturas de tus proveedores: eliges su clasificación de una lista, separas base e IGV del total y sumas el crédito fiscal.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «¿Qué compré?» |
| Demostración guiada | 15 | Lista desplegable, base e IGV desde el total |
| Caso práctico | 30 | Registro de compras de octubre con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Del total a la base» |

### El caso práctico

1. Abre la hoja **Compras**.
2. Elige la **Clasificación** de cada factura en la lista.
3. Calcula la **Base** (Total ÷ 1,18) y el **IGV** (Total − Base).
4. Completa el **resumen** y el crédito fiscal.
5. Pide a la IA que revise tu clasificación.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es mi registro de compras de octubre. Revisa si la clasificación de cada factura (Mercadería, Servicio, Gasto administrativo, Activo fijo) tiene sentido según el proveedor y el concepto, y si la base y el IGV están bien sacados del total.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*Regla didáctica: solo se usa como crédito fiscal el IGV de compras con factura y relacionadas con el negocio.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
