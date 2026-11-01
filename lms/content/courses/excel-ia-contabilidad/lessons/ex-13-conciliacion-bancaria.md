---
id: ex-13
title: "Sesión 13 · Conciliación bancaria"
published: true
objectives:
  - id: ex-13-o1
    title: "Marcar duplicados con CONTAR.SI y un rango que crece"
  - id: ex-13-o2
    title: "Cruzar movimientos por N.º de operación con BUSCARX y «No está»"
  - id: ex-13-o3
    title: "Armar la conciliación y comprobar que los saldos ajustados cuadran"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-13-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-13-o1]
  - id: ex-13-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m4
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E01-comercial-andina.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E03-contables-pacifico.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E08-colegio-amauta.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
  - id: ex-13-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-13/ex-13-E10-agro-valle-verde.xlsx
    objective_ids: [ex-13-o1, ex-13-o2, ex-13-o3]
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
    description: "Escena 2: Caza lo que no cuadra."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Arma la fórmula BUSCARX."
    check: "Marcaste la lista y terminaste el juego"
---

## Conciliación bancaria

Cruzas el libro bancos con el estado de cuenta usando BUSCARX: encuentras duplicados, diferencias de importe y partidas en tránsito, y cuadras los dos saldos.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Caza lo que no cuadra» |
| Demostración guiada | 15 | Duplicados, BUSCARX con «No está» y la conciliación |
| Caso práctico | 30 | Conciliación de octubre con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Arma la fórmula BUSCARX» |

### El caso práctico

1. En **Libro bancos**, marca **duplicados**.
2. Trae el **monto del banco** con BUSCARX y calcula la **diferencia**.
3. En **Banco**, marca lo que **no está** en el libro.
4. Completa la hoja **Conciliación**: la diferencia debe dar 0.
5. Pide a la IA que redacte el informe.

### Pide ayuda a la IA (DeepSeek Harness)

> Te paso mi conciliación bancaria de octubre: libro bancos, estado de cuenta y las marcas que hice con BUSCARX. Revisa si los duplicados, las diferencias y las partidas en tránsito están bien identificados y redacta el informe de conciliación en 6 líneas.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
