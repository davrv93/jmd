---
id: ei-03
title: "Sesión 3 · Cobranzas, conciliación y flujo de caja"
published: true
objectives:
  - id: ei-03-o1
    title: "Clasificar las cuentas por cobrar por antigüedad de vencimiento"
  - id: ei-03-o2
    title: "Conciliar libro y banco: duplicados, BUSCARX y saldos ajustados"
  - id: ei-03-o3
    title: "Proyectar el flujo de caja y detectar los meses sin liquidez"
recording:
  url: ""
  passcode: ""
materials:
  - id: ei-03-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ei-03-o1]
  - id: ei-03-e01
    title: "Caso práctico · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E01-comercial-andina.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e02
    title: "Caso práctico · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E02-distribuidora-rimac.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e03
    title: "Caso práctico · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E03-contables-pacifico.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e04
    title: "Caso práctico · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E04-sabores-del-puerto.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e05
    title: "Caso práctico · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E05-transportes-sol-andino.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e06
    title: "Caso práctico · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E06-constructora-los-pinos.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e07
    title: "Caso práctico · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E07-clinica-santa-lucia.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e08
    title: "Caso práctico · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E08-colegio-amauta.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e09
    title: "Caso práctico · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E09-taller-motor-rapido.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
  - id: ei-03-e10
    title: "Caso práctico · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ei-03/ei-03-E10-agro-valle-verde.xlsx
    objective_ids: [ei-03-o1, ei-03-o2, ei-03-o3]
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

## Cobranzas, conciliación y flujo de caja

Clasificas las cuentas por cobrar por antigüedad, concilias el libro de bancos con el extracto usando BUSCARX y proyectas el flujo de caja para ver si alcanza el efectivo.

Cubre los temas 11, 13 y 14 del temario de 20 sesiones.

| Momento | Minutos | Qué haces |
|---|---|---|
| Introducción | 10 | La idea del día y el juego «Caza lo que no cuadra» |
| Demostración guiada | 15 | Antigüedad, duplicados, BUSCARX y saldo de caja |
| Caso práctico | 30 | Cobranzas, conciliación y flujo con el Excel de tu empresa |
| Cierre | 5 | Lista de comprobación y juego «Arma la fórmula BUSCARX» |

### El caso práctico

1. Hoja **Cobranzas**: vencimiento, saldo, días vencidos y tramo de antigüedad.
2. Hoja **Conciliación**: marca duplicados y cruza libro y banco con BUSCARX.
3. Comprueba que los saldos ajustados del libro y del banco cuadran.
4. Hoja **Flujo**: saldo final de cada mes y alerta si falta caja.
5. Pide a la IA que explique cada diferencia de la conciliación.

### Pide ayuda a la IA (DeepSeek Harness)

> Te paso mis cobranzas, la conciliación bancaria y el flujo de caja (datos ficticios). Revisa el tramo de antigüedad de cada factura, explica cada partida que no cuadra entre el libro de bancos y el extracto, y dime en qué mes del flujo falta caja y cuánto. Usa fórmulas de Excel en español.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 4 sesiones.
