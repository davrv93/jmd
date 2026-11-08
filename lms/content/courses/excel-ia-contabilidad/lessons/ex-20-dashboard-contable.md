---
id: ex-20
title: "Clase 20 · Dashboard contable"
published: true
duration: 24
objectives:
  - id: ex-20-o1
    title: "Calcular KPI de ventas: total, operaciones, ticket promedio, mejor mes y crecimiento"
  - id: ex-20-o2
    title: "Crear una tabla dinámica con segmentadores"
  - id: ex-20-o3
    title: "Armar un tablero con gráficos de columnas y circular"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-20-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-20-o1]
  - id: ex-20-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-20-o1]
  - id: ex-20-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m6
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E01-comercial-andina.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E03-contables-pacifico.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E08-colegio-amauta.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
  - id: ex-20-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-20/ex-20-E10-agro-valle-verde.xlsx
    objective_ids: [ex-20-o1, ex-20-o2, ex-20-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Con un año de ventas, ¿qué le dirías a la gerencia en una frase? Busca el mes y el canal más fuertes."
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Pregunta y gráfico» y muro con tu reflexión: ¿Qué tiene que saber la gerencia en 30 segundos al ver tu dashboard? Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Arma las fórmulas de los KPI» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
  - id: evidencia
    title: "Evidencia del Módulo 6"
    tool: lms
    phase: experimentacion
    description: "Entrega en «Tareas» la evidencia del módulo: Estados financieros, reporte de hallazgos y dashboard en Excel. Incluye una breve explicación de tus decisiones. Puedes corregir y volver a entregar después de la retroalimentación."
    check: "Entregaste la evidencia del módulo"
---

## Dashboard contable

Con las ventas de 2025 armas un tablero: resumen por mes y canal, KPI, una tabla dinámica con segmentadores y dos gráficos.

**Módulo 6 · Estados financieros, auditoría y reportes (2 h)** · clase 5 de 5 · 24 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 3 | Con un año de ventas, ¿qué le dirías a la gerencia en una frase? Busca el mes y el canal más fuertes. |
| 2 · Foro de reflexión | 2 | Juego «Pregunta y gráfico» y tu reflexión en el muro |
| 3 · Lección y demostración | 6 | KPI, tabla dinámica, segmentadores y gráficos |
| 4 · Reto de aplicación | 11 | Dashboard de ventas 2025 en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 2 | Lista de comprobación, juego «Arma las fórmulas de los KPI» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. En **Resumen**, completa venta por **mes** y por **canal**.
2. Calcula los **KPI**.
3. Crea la **tabla dinámica** con **segmentadores** de canal y mes.
4. Arma la hoja **Dashboard** con 2 gráficos y los KPI.
5. Pide a la IA 3 conclusiones para la gerencia.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es el resumen de ventas 2025 de mi dashboard (venta por mes, por canal y KPI). Revisa que los KPI estén bien calculados y redacta 3 conclusiones claras para la gerencia, con una recomendación cada una.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 6 · Estados financieros, auditoría y reportes en el ciclo de Kolb

- **Experiencia concreta:** Revisar datos financieros con duplicados, omisiones y reportes difíciles de interpretar.
- **Observación reflexiva:** Determinar qué errores afectan la información y qué necesita conocer la gerencia.
- **Conceptualización abstracta:** Estados financieros, análisis horizontal y vertical, indicadores, controles y herramientas de visualización.
- **Experimentación activa:** Preparar estados financieros, documentar hallazgos y presentar un dashboard con conclusiones sustentadas.
- **Evidencia de aprendizaje:** Estados financieros, reporte de hallazgos y dashboard en Excel.

**Proyecto integrador:** Cierras el libro de tu empresa con estados financieros, auditoría y el dashboard final. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
