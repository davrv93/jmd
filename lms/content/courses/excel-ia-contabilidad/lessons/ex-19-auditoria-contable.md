---
id: ex-19
title: "Clase 19 · Auditoría contable"
published: true
duration: 24
objectives:
  - id: ex-19-o1
    title: "Detectar duplicados con CONTAR.SI"
  - id: ex-19-o2
    title: "Validar IGV, totales, RUC (LARGO) y fechas con SI, ABS e Y"
  - id: ex-19-o3
    title: "Encontrar correlativos faltantes y resumir los hallazgos"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-19-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-19-o1]
  - id: ex-19-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-19-o1]
  - id: ex-19-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m6
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E01-comercial-andina.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E03-contables-pacifico.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E08-colegio-amauta.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
  - id: ex-19-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-19/ex-19-E10-agro-valle-verde.xlsx
    objective_ids: [ex-19-o1, ex-19-o2, ex-19-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Revisa el registro de ventas: busca un duplicado, un IGV mal calculado y un comprobante que falta."
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Caza los errores del registro» y muro con tu reflexión: ¿Qué hallazgo de la auditoría tiene más impacto y qué control propones para que no se repita? Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Memoria del auditor» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Auditoría contable

Auditas un registro de ventas con errores sembrados: duplicados, IGV mal calculado, totales que no cuadran, RUC incompletos, fechas fuera del periodo y correlativos faltantes.

**Módulo 6 · Estados financieros, auditoría y reportes (2 h)** · clase 4 de 5 · 24 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 3 | Revisa el registro de ventas: busca un duplicado, un IGV mal calculado y un comprobante que falta. |
| 2 · Foro de reflexión | 2 | Juego «Caza los errores del registro» y tu reflexión en el muro |
| 3 · Lección y demostración | 6 | Controles con CONTAR.SI, ABS, LARGO, Y y correlativos |
| 4 · Reto de aplicación | 11 | Auditoría del registro de ventas en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 2 | Lista de comprobación, juego «Memoria del auditor» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. En **Ventas**, completa las 6 columnas de control.
2. Pinta «Revisar» y «Sí» en rojo con formato condicional.
3. En **Correlativos**, marca los que **faltan**.
4. Completa el **resumen de hallazgos**.
5. Pide a la IA el informe de auditoría.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Te paso los resultados de mi auditoría del registro de ventas de octubre (duplicados, IGV, totales, RUC, fechas y correlativos faltantes). Redacta un informe de auditoría breve: hallazgo, riesgo y recomendación, en una tabla.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 6 · Estados financieros, auditoría y reportes en el ciclo de Kolb

- **Experiencia concreta:** Revisar datos financieros con duplicados, omisiones y reportes difíciles de interpretar.
- **Observación reflexiva:** Determinar qué errores afectan la información y qué necesita conocer la gerencia.
- **Conceptualización abstracta:** Estados financieros, análisis horizontal y vertical, indicadores, controles y herramientas de visualización.
- **Experimentación activa:** Preparar estados financieros, documentar hallazgos y presentar un dashboard con conclusiones sustentadas.
- **Evidencia de aprendizaje:** Estados financieros, reporte de hallazgos y dashboard en Excel.

**Proyecto integrador:** Cierras el libro de tu empresa con estados financieros, auditoría y el dashboard final. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
