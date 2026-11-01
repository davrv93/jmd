---
id: ex-10
title: "Sesión 10 · Depreciación"
published: true
objectives:
  - id: ex-10-o1
    title: "Traer la tasa de depreciación de cada activo con BUSCARX"
  - id: ex-10-o2
    title: "Calcular depreciación anual, mensual y meses de uso"
  - id: ex-10-o3
    title: "Obtener depreciación acumulada (con tope en el costo) y valor en libros"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-10-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-10-o1]
  - id: ex-10-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada sesión)"
    kind: slides
    slides_dir: materials/guia-visual-m3
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E01-comercial-andina.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E03-contables-pacifico.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E08-colegio-amauta.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E10-agro-valle-verde.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
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
    description: "Escena 2: Memoria de tasas."
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
    description: "Escena 5: lista de comprobación y juego de repaso: Calcula la depreciación."
    check: "Marcaste la lista y terminaste el juego"
---

## Depreciación

Calculas la depreciación lineal de los activos fijos de tu empresa con la tasa de su categoría, la acumulada al 31/12/2026 y su valor en libros.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Memoria de tasas» |
| Demostración guiada | 15 | BUSCARX de la tasa, acumulada con MIN y valor en libros |
| Caso práctico | 30 | Depreciación al 31/12/2026 con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Calcula la depreciación» |

### El caso práctico

1. Mira la hoja **Tasas**.
2. En **Activos**, trae la **tasa** con BUSCARX.
3. Calcula depreciación **anual**, **mensual** y **meses de uso**.
4. Calcula **acumulada** (con MIN) y **valor en libros**.
5. Pide a la IA que explique el valor en libros.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi hoja de depreciación al 31/12/2026. Revisa que cada tasa corresponda a su categoría, que la acumulada no pase del costo y explícame en palabras simples qué es el valor en libros.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

*Porcentajes máximos tributarios del art. 22 del Reglamento de la Ley del Impuesto a la Renta (edificaciones 5 %, vehículos 20 %, maquinaria 10 %, equipos de procesamiento de datos 25 %, otros bienes 10 %), usados como ejemplo. Didáctico: se cuenta desde el mes de adquisición.*

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.
