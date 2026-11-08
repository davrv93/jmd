---
id: ex-14
title: "Clase 14 · Flujo de caja"
published: true
duration: 60
objectives:
  - id: ex-14-o1
    title: "Sumar ingresos y egresos por mes y calcular el flujo neto"
  - id: ex-14-o2
    title: "Encadenar saldo inicial y saldo final de mes a mes"
  - id: ex-14-o3
    title: "Detectar meses bajo la caja mínima y el monto que falta"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-14-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-14-o1]
  - id: ex-14-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-14-o1]
  - id: ex-14-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m5
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E01-comercial-andina.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E03-contables-pacifico.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E08-colegio-amauta.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
  - id: ex-14-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-14/ex-14-E10-agro-valle-verde.xlsx
    objective_ids: [ex-14-o1, ex-14-o2, ex-14-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. La empresa vende bien, pero en algún mes no le alcanza la caja. Mira ingresos y egresos e intenta ubicar ese mes."
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «¿Entra, sale o no es caja?» y muro con tu reflexión: ¿Por qué vender no garantiza tener efectivo? Señala el mes de mayor presión de pagos en tu caso. Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Calcula la caja» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Flujo de caja

Proyectas seis meses de ingresos y egresos, encadenas los saldos y detectas qué meses quedan bajo la caja mínima.

**Módulo 5 · Planificación financiera y presupuesto (2 h)** · clase 1 de 2 · 60 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 7 | La empresa vende bien, pero en algún mes no le alcanza la caja. Mira ingresos y egresos e intenta ubicar ese mes. |
| 2 · Foro de reflexión | 4 | Juego «¿Entra, sale o no es caja?» y tu reflexión en el muro |
| 3 · Lección y demostración | 14 | Totales, flujo neto, saldos encadenados y alerta |
| 4 · Reto de aplicación | 30 | Flujo de caja de seis meses en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 5 | Lista de comprobación, juego «Calcula la caja» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Abre la hoja **Flujo** (meses en columnas).
2. Calcula **totales**, **flujo neto** y **saldo final**.
3. Encadena el **saldo inicial** de cada mes.
4. Marca los meses bajo la **caja mínima** y cuánto falta.
5. Pide a la IA tres ideas para esos meses.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es mi flujo de caja proyectado de noviembre 2026 a abril 2027. Revisa que el saldo pase bien de un mes a otro y, para los meses que quedan bajo la caja mínima, dame tres ideas concretas para cubrirlos (cobrar antes, postergar, financiar).

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 5 · Planificación financiera y presupuesto en el ciclo de Kolb

- **Experiencia concreta:** Examinar una empresa que registra ventas, pero tiene dificultades para pagar sus obligaciones.
- **Observación reflexiva:** Debatir por qué vender no garantiza efectivo disponible y reconocer los periodos de mayor presión de pagos.
- **Conceptualización abstracta:** Flujo de caja, saldos iniciales y finales, presupuesto y desviaciones mediante un ejemplo guiado.
- **Experimentación activa:** Diseñar una proyección y probar escenarios con cambios en ventas, plazos de cobro y gastos.
- **Evidencia de aprendizaje:** Archivo Excel con flujo de caja, presupuesto y escenarios comentados.

**Proyecto integrador:** Proyectas la caja de tu empresa y comparas su presupuesto con lo ejecutado. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
