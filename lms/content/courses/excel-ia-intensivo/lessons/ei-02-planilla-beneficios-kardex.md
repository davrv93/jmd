---
id: ei-02
title: "Sesión 2 · Planilla, gratificación, CTS y Kardex"
published: true
objectives:
  - id: ei-02-o1
    title: "Calcular el neto de la planilla con SI y BUSCARX"
  - id: ei-02-o2
    title: "Calcular la gratificación y la CTS con los meses computables"
  - id: ei-02-o3
    title: "Valorizar las salidas con el costo promedio ponderado móvil"
recording:
  url: ""
  passcode: ""
materials:
  - id: ei-02-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ei-02-o1]
  - id: ei-02-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E01-comercial-andina.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E02-distribuidora-rimac.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E03-contables-pacifico.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E04-sabores-del-puerto.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E05-transportes-sol-andino.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E06-constructora-los-pinos.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E07-clinica-santa-lucia.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E08-colegio-amauta.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E09-taller-motor-rapido.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
  - id: ei-02-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ei-02/ei-02-E10-agro-valle-verde.xlsx
    objective_ids: [ei-02-o1, ei-02-o2, ei-02-o3]
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
    description: "Escena 2: Empareja la planilla."
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

## Planilla, gratificación, CTS y Kardex

Calculas el neto de la planilla, la gratificación y la CTS con los meses computables, y valorizas el almacén con un Kardex de costo promedio ponderado móvil.

Cubre los temas 5, 6, 7 y 9 del temario de 20 sesiones.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Empareja la planilla» |
| Demostración guiada | 15 | Neto con SI y BUSCARX, gratificación, CTS y costo promedio |
| Caso práctico | 30 | Planilla, beneficios y Kardex con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Calcula el promedio» |

### El caso práctico

1. Hoja **Planilla**: asignación familiar con SI, tasa de pensión con BUSCARX (hoja Tasas) y neto.
2. Hoja **Gratificación**: meses computables y gratificación con su bonificación.
3. Hoja **CTS**: remuneración computable, meses y días.
4. Hoja **Kardex**: costo promedio después de cada compra y valor de cada salida.
5. Pide a la IA que revise un trabajador y un movimiento del Kardex.

### Pide ayuda a la IA (DeepSeek Harness)

> Te paso la planilla, la gratificación, la CTS y el Kardex de mi empresa (datos ficticios). Elige un trabajador y comprueba paso a paso su neto, su gratificación y su CTS; luego revisa si el costo promedio del Kardex cambia bien después de cada compra. Explícame con fórmulas de Excel en español.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*RMV S/ 1 230 (D.S. N.° 015-2026-TR, vigente desde el 01-10-2026; verificado el 31-10-2026). Asignación familiar 10 % de la RMV. ONP 13 %; tasas de AFP de ejemplo (consulta las vigentes en la SBS). EsSalud 9 % a cargo del empleador. Regla didáctica: sin quinta categoría ni tope de la prima de seguro.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 4 sesiones.
