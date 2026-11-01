---
id: ex-05
title: "Sesión 5 · Planillas"
published: true
objectives:
  - id: ex-05-o1
    title: "Calcular asignación familiar y total de remuneración con SI"
  - id: ex-05-o2
    title: "Traer la tasa de pensión de una tabla con BUSCARX"
  - id: ex-05-o3
    title: "Obtener neto a pagar, EsSalud y el costo total de la planilla"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-05-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-05-o1]
  - id: ex-05-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m2
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E01-comercial-andina.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E03-contables-pacifico.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E08-colegio-amauta.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E10-agro-valle-verde.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
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
    description: "Escena 5: lista de comprobación y juego de repaso: ¿Quién lo pone?."
    check: "Marcaste la lista y terminaste el juego"
---

## Planillas

Calculas la planilla de octubre: asignación familiar, total de remuneración, descuento de pensión con BUSCARX, neto a pagar y EsSalud.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Empareja la planilla» |
| Demostración guiada | 15 | Asignación, BUSCARX de la tasa, neto y EsSalud |
| Caso práctico | 30 | Planilla de octubre con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «¿Quién lo pone?» |

### El caso práctico

1. Abre **Planilla** y mira la hoja **Tasas**.
2. Calcula **asignación familiar** y **total**.
3. Trae la **tasa** con BUSCARX y calcula **descuento** y **neto**.
4. Calcula **EsSalud** y completa el **resumen**.
5. Pide a la IA que busque filas raras.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi planilla de octubre. Revisa que la asignación familiar solo esté en quienes tienen hijos, que la tasa de pensión venga de la hoja Tasas y que el neto sea total menos descuentos. Señálame cualquier fila rara.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*RMV S/ 1 230 (D.S. N.° 015-2026-TR, vigente desde el 01-10-2026; verificado el 31-10-2026). Asignación familiar 10 % de la RMV. ONP 13 %; tasas de AFP de ejemplo (consulta las vigentes en la SBS). EsSalud 9 % a cargo del empleador. Regla didáctica: sin quinta categoría ni tope de la prima de seguro.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
