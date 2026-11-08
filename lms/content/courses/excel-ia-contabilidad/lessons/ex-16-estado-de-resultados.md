---
id: ex-16
title: "Clase 16 · Estado de resultados"
published: true
duration: 24
objectives:
  - id: ex-16-o1
    title: "Traer cada rubro desde los saldos con SUMAR.SI.CONJUNTO"
  - id: ex-16-o2
    title: "Encadenar utilidad bruta, operativa, antes de impuestos y neta"
  - id: ex-16-o3
    title: "Calcular el impuesto didáctico según régimen y los márgenes"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-16-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-16-o1]
  - id: ex-16-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-16-o1]
  - id: ex-16-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m6
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E01-comercial-andina.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E03-contables-pacifico.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E08-colegio-amauta.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
  - id: ex-16-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-16/ex-16-E10-agro-valle-verde.xlsx
    objective_ids: [ex-16-o1, ex-16-o2, ex-16-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Con los saldos de las cuentas, intenta armar la utilidad del año. ¿Qué cuentas restan y en qué orden?"
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Ordena el estado de resultados» y muro con tu reflexión: ¿Qué rubro del estado de resultados se lleva la mayor parte de las ventas en tu empresa? Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Calcula los márgenes» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Estado de resultados

Con los saldos de las cuentas de resultados armas el estado de resultados 2025: utilidades encadenadas, impuesto según régimen y márgenes.

**Módulo 6 · Estados financieros, auditoría y reportes (2 h)** · clase 1 de 5 · 24 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 3 | Con los saldos de las cuentas, intenta armar la utilidad del año. ¿Qué cuentas restan y en qué orden? |
| 2 · Foro de reflexión | 2 | Juego «Ordena el estado de resultados» y tu reflexión en el muro |
| 3 · Lección y demostración | 6 | Rubros, utilidades, impuesto y márgenes |
| 4 · Reto de aplicación | 11 | Estado de resultados 2025 en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 2 | Lista de comprobación, juego «Calcula los márgenes» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Mira la hoja **Saldos**.
2. En **EERR**, trae cada rubro con SUMAR.SI.CONJUNTO.
3. Calcula las **utilidades** encadenadas.
4. Calcula el **impuesto** de tu régimen y los **márgenes**.
5. Pide a la IA que lo explique al gerente.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es mi estado de resultados 2025. Revisa que cada utilidad esté bien encadenada y explícale al gerente, en 6 líneas y sin tecnicismos, qué márgenes tenemos y dónde se nos va la plata.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 6 · Estados financieros, auditoría y reportes en el ciclo de Kolb

- **Experiencia concreta:** Revisar datos financieros con duplicados, omisiones y reportes difíciles de interpretar.
- **Observación reflexiva:** Determinar qué errores afectan la información y qué necesita conocer la gerencia.
- **Conceptualización abstracta:** Estados financieros, análisis horizontal y vertical, indicadores, controles y herramientas de visualización.
- **Experimentación activa:** Preparar estados financieros, documentar hallazgos y presentar un dashboard con conclusiones sustentadas.
- **Evidencia de aprendizaje:** Estados financieros, reporte de hallazgos y dashboard en Excel.

**Proyecto integrador:** Cierras el libro de tu empresa con estados financieros, auditoría y el dashboard final. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Impuesto didáctico sin adiciones ni deducciones: Régimen General 29,5 %; MYPE Tributario 10 % hasta 15 UIT y 29,5 % por el exceso (UIT 2025 = S/ 5 350); RER: el impuesto se pagó como cuota mensual (se muestra 0).*

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
