---
id: ex-12
title: "Clase 12 · Cuentas por pagar"
published: true
duration: 40
objectives:
  - id: ex-12-o1
    title: "Calcular días para vencer y prioridad de pago con SI y O"
  - id: ex-12-o2
    title: "Asignar la semana de pago con SI anidados"
  - id: ex-12-o3
    title: "Comparar pagos semanales con la caja disponible"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-12-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-12-o1]
  - id: ex-12-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-12-o1]
  - id: ex-12-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m4
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E01-comercial-andina.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E03-contables-pacifico.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E08-colegio-amauta.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
  - id: ex-12-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-12/ex-12-E10-agro-valle-verde.xlsx
    objective_ids: [ex-12-o1, ex-12-o2, ex-12-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Con las deudas y la caja disponible, ¿qué pagarías esta semana y qué dejarías para después?"
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «¿Qué pago primero?» y muro con tu reflexión: ¿Qué criterio usaste para priorizar pagos y qué riesgo corres con lo que dejaste para después? Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
    check: "Publicaste tu reflexión y comentaste la de un compañero"
  - id: demo
    title: "3 · Lección y demostración"
    tool: lms
    phase: conceptualizacion
    description: "Escena 3: explicación breve y demostración paso a paso. Repásala en la guía visual del módulo."
    check: "Viste todos los pasos y puedes decir qué hace cada fórmula"
  - id: caso
    title: "4 · Reto de aplicación"
    tool: lms
    phase: experimentacion
    description: "Escena 4: un caso de tu empresa en la Hoja JMD. Escribe las fórmulas, pulsa «Revisar», simula un escenario con IA y descarga tu Excel."
    check: "La revisión de la Hoja JMD sale en verde y descargaste tu Excel"
  - id: cierre
    title: "5 · Retroalimentación y cierre"
    tool: lms
    phase: reflexion
    description: "Escena 5: lista de comprobación, juego de repaso «Prioriza los pagos» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Cuentas por pagar

Ordenas las obligaciones de noviembre por prioridad, las repartes por semana de pago y compruebas si la caja alcanza.

**Módulo 4 · Cuentas y control bancario (2 h)** · clase 2 de 3 · 40 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 5 | Con las deudas y la caja disponible, ¿qué pagarías esta semana y qué dejarías para después? |
| 2 · Foro de reflexión | 3 | Juego «¿Qué pago primero?» y tu reflexión en el muro |
| 3 · Lección y demostración | 9 | Días para vencer, prioridad, semana y caja |
| 4 · Reto de aplicación | 20 | Programación de pagos de noviembre en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 3 | Lista de comprobación, juego «Prioriza los pagos» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Abre la hoja **Pagos**.
2. Calcula **días para vencer** y **prioridad**.
3. Calcula la **semana de pago**.
4. Completa el cuadro **semana / a pagar / caja / ¿alcanza?**.
5. Pide a la IA qué pago mover si no alcanza.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi programación de pagos de noviembre. Revisa las prioridades y, si alguna semana la caja no alcanza, propón qué pago mover y a qué semana, sin atrasar planilla ni impuestos. Respóndeme en una tabla.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 4 · Cuentas y control bancario en el ciclo de Kolb

- **Experiencia concreta:** Revisar facturas pendientes, pagos parciales, registros internos y un estado de cuenta bancario.
- **Observación reflexiva:** Identificar deudas vencidas, duplicados y movimientos sin correspondencia, y discutir sus causas.
- **Conceptualización abstracta:** Calcular saldos y antigüedad de vencimientos, cruzar datos con BUSCARX y clasificar diferencias bancarias.
- **Experimentación activa:** Resolver un caso nuevo con controles de cobros y pagos y una conciliación sustentada.
- **Evidencia de aprendizaje:** Archivo Excel con cuentas pendientes y conciliación bancaria.

**Proyecto integrador:** Controlas los cobros, los pagos y el banco de tu empresa. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
