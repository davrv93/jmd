---
id: ex-11
title: "Clase 11 · Cuentas por cobrar"
published: true
duration: 40
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
  - id: ex-11-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-11-o1]
  - id: ex-11-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-11-o1]
  - id: ex-11-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m4
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E01-comercial-andina.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E03-contables-pacifico.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E08-colegio-amauta.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
  - id: ex-11-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-11/ex-11-E10-agro-valle-verde.xlsx
    objective_ids: [ex-11-o1, ex-11-o2, ex-11-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Revisa las facturas por cobrar y los pagos parciales: ¿qué clientes están vencidos y cuánto deben de verdad?"
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Semáforo de cobranza» y muro con tu reflexión: ¿A qué cliente cobrarías primero y por qué? Usa la antigüedad de tu caso. Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Arma la fórmula de cobranza» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Cuentas por cobrar

Con las facturas y los pagos parciales de tus clientes calculas saldos, días vencidos y la antigüedad de cada deuda al 31/10/2026.

**Módulo 4 · Cuentas y control bancario (2 h)** · clase 1 de 3 · 40 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 5 | Revisa las facturas por cobrar y los pagos parciales: ¿qué clientes están vencidos y cuánto deben de verdad? |
| 2 · Foro de reflexión | 3 | Juego «Semáforo de cobranza» y tu reflexión en el muro |
| 3 · Lección y demostración | 9 | Vencimiento, pagos con SUMAR.SI.CONJUNTO, días y SI.CONJUNTO |
| 4 · Reto de aplicación | 20 | Antigüedad de la cartera en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 3 | Lista de comprobación, juego «Arma la fórmula de cobranza» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Mira la hoja **Pagos** (hay pagos parciales).
2. En **Cobranzas**, calcula **vencimiento**, **pagado** y **saldo**.
3. Calcula **días vencidos** y **antigüedad**.
4. Completa el **resumen por tramo**.
5. Pide a la IA un plan de cobranza.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi hoja de cuentas por cobrar al 31/10/2026 con la antigüedad de cada factura. Revisa los saldos y los tramos, y arma un plan de cobranza: a quién llamar primero y qué decirle, en una tabla corta.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 4 · Cuentas y control bancario en el ciclo de Kolb

- **Experiencia concreta:** Revisar facturas pendientes, pagos parciales, registros internos y un estado de cuenta bancario.
- **Observación reflexiva:** Identificar deudas vencidas, duplicados y movimientos sin correspondencia, y discutir sus causas.
- **Conceptualización abstracta:** Calcular saldos y antigüedad de vencimientos, cruzar datos con BUSCARX y clasificar diferencias bancarias.
- **Experimentación activa:** Resolver un caso nuevo con controles de cobros y pagos y una conciliación sustentada.
- **Evidencia de aprendizaje:** Archivo Excel con cuentas pendientes y conciliación bancaria.

**Proyecto integrador:** Controlas los cobros, los pagos y el banco de tu empresa. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
