---
id: ex-05
title: "Clase 5 · Planillas"
published: true
duration: 40
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
  - id: ex-05-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-05-o1]
  - id: ex-05-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-05-o1]
  - id: ex-05-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m2
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E01-comercial-andina.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E03-contables-pacifico.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E08-colegio-amauta.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
  - id: ex-05-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-05/ex-05-E10-agro-valle-verde.xlsx
    objective_ids: [ex-05-o1, ex-05-o2, ex-05-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Revisa la planilla: ¿quién debería recibir asignación familiar y cuánto se le descuenta de pensión a cada uno?"
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Empareja la planilla» y muro con tu reflexión: ¿Qué error de cálculo es más fácil cometer en la planilla y a quién perjudica? Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «¿Quién lo pone?» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Planillas

Calculas la planilla de octubre: asignación familiar, total de remuneración, descuento de pensión con BUSCARX, neto a pagar y EsSalud.

**Módulo 2 · Gestión laboral y remuneraciones (2 h)** · clase 1 de 3 · 40 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 5 | Revisa la planilla: ¿quién debería recibir asignación familiar y cuánto se le descuenta de pensión a cada uno? |
| 2 · Foro de reflexión | 3 | Juego «Empareja la planilla» y tu reflexión en el muro |
| 3 · Lección y demostración | 9 | Asignación, BUSCARX de la tasa, neto y EsSalud |
| 4 · Reto de aplicación | 20 | Planilla de octubre en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 3 | Lista de comprobación, juego «¿Quién lo pone?» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Abre **Planilla** y mira la hoja **Tasas**.
2. Calcula **asignación familiar** y **total**.
3. Trae la **tasa** con BUSCARX y calcula **descuento** y **neto**.
4. Calcula **EsSalud** y completa el **resumen**.
5. Pide a la IA que busque filas raras.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi planilla de octubre. Revisa que la asignación familiar solo esté en quienes tienen hijos, que la tasa de pensión venga de la hoja Tasas y que el neto sea total menos descuentos. Señálame cualquier fila rara.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 2 · Gestión laboral y remuneraciones en el ciclo de Kolb

- **Experiencia concreta:** Examinar datos de trabajadores y una planilla que contiene errores de cálculo.
- **Observación reflexiva:** Comparar resultados e identificar cómo el tiempo de servicio y los conceptos remunerativos afectan los pagos.
- **Conceptualización abstracta:** Revisar los criterios laborales del caso y las fórmulas de Excel mediante ejemplos guiados.
- **Experimentación activa:** Elaborar una nueva planilla y calcular los beneficios solicitados, explicando los supuestos utilizados.
- **Evidencia de aprendizaje:** Archivo Excel con planilla, gratificaciones y CTS.

**Proyecto integrador:** Agregas la planilla, la gratificación y la CTS de los trabajadores de tu empresa. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*RMV S/ 1 230 (D.S. N.° 015-2026-TR, vigente desde el 01-10-2026; verificado el 31-10-2026). Asignación familiar 10 % de la RMV. ONP 13 %; tasas de AFP de ejemplo (consulta las vigentes en la SBS). EsSalud 9 % a cargo del empleador. Regla didáctica: sin quinta categoría ni tope de la prima de seguro.*

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
