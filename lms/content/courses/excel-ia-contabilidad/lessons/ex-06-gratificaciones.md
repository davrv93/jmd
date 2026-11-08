---
id: ex-06
title: "Clase 6 · Gratificaciones"
published: true
duration: 40
objectives:
  - id: ex-06-o1
    title: "Calcular la remuneración computable de la gratificación"
  - id: ex-06-o2
    title: "Contar meses completos del semestre con SIFECHA y MIN"
  - id: ex-06-o3
    title: "Calcular gratificación proporcional y bonificación extraordinaria del 9 %"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-06-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-06-o1]
  - id: ex-06-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-06-o1]
  - id: ex-06-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m2
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E01-comercial-andina.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E03-contables-pacifico.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E08-colegio-amauta.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
  - id: ex-06-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-06/ex-06-E10-agro-valle-verde.xlsx
    objective_ids: [ex-06-o1, ex-06-o2, ex-06-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Mira las fechas de ingreso: ¿todos cobran la gratificación completa? Señala a quién le toca menos y por qué."
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «¿Cuántos meses cuentan?» y muro con tu reflexión: ¿Cómo cambia la gratificación con el tiempo de servicio? Usa el caso de un trabajador de tu empresa. Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Calcula la gratificación» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Gratificaciones

Calculas la gratificación de diciembre de cada trabajador: remuneración computable, meses completos del semestre con SIFECHA y la bonificación del 9 %.

**Módulo 2 · Gestión laboral y remuneraciones (2 h)** · clase 2 de 3 · 40 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 5 | Mira las fechas de ingreso: ¿todos cobran la gratificación completa? Señala a quién le toca menos y por qué. |
| 2 · Foro de reflexión | 3 | Juego «¿Cuántos meses cuentan?» y tu reflexión en el muro |
| 3 · Lección y demostración | 9 | Remuneración computable, meses con SIFECHA y bonificación |
| 4 · Reto de aplicación | 20 | Gratificación de diciembre en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 3 | Lista de comprobación, juego «Calcula la gratificación» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Abre la hoja **Gratificación**.
2. Calcula **asignación familiar** y **remuneración computable**.
3. Cuenta los **meses** con SIFECHA y MIN.
4. Calcula **gratificación**, **bonificación** y **total**.
5. Pide a la IA que revise los meses de quienes entraron en 2026.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Revisa mi hoja de gratificaciones de diciembre 2026. Comprueba los meses computables de quienes ingresaron en 2026 (solo cuentan meses calendario completos, máximo 6) y explícame la fórmula SIFECHA que usé.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 2 · Gestión laboral y remuneraciones en el ciclo de Kolb

- **Experiencia concreta:** Examinar datos de trabajadores y una planilla que contiene errores de cálculo.
- **Observación reflexiva:** Comparar resultados e identificar cómo el tiempo de servicio y los conceptos remunerativos afectan los pagos.
- **Conceptualización abstracta:** Revisar los criterios laborales del caso y las fórmulas de Excel mediante ejemplos guiados.
- **Experimentación activa:** Elaborar una nueva planilla y calcular los beneficios solicitados, explicando los supuestos utilizados.
- **Evidencia de aprendizaje:** Archivo Excel con planilla, gratificaciones y CTS.

**Proyecto integrador:** Agregas la planilla, la gratificación y la CTS de los trabajadores de tu empresa. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Regla didáctica del régimen laboral general: una remuneración por semestre completo, 1/6 por mes calendario completo y bonificación extraordinaria del 9 % (aporte a EsSalud). No incluye faltas, conceptos variables ni regímenes especiales (micro y pequeña empresa).*

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
