---
id: gq-03
starts_at: 2026-11-17T18:30:00-05:00
duration: 60
title: "Curso · Sesión 2: pregúntale a tus propios archivos"
published: true
objectives:
  - id: gq-03-o1
    title: Adjuntar tus propios Excel, CSV y PDF y leer el tablero que se arma solo (totales, grupos, meses y avisos), sin subir nada
  - id: gq-03-o2
    title: Hacerle preguntas a tus archivos y distinguir cuándo responden las reglas (al instante y gratis) y cuándo hace falta la IA
  - id: gq-03-o3
    title: Comprobar cada dato que da la IA contra su cita y saber qué de tu archivo viaja a la IA y qué no
recording:
  url: ""
  passcode: ""
materials:
  - id: gq-03-video-1
    title: "Video 1 (4:02): Adjunta. Mira. Pregunta. Tu visor paso a paso"
    kind: video
    file: materials/gq-03-video-1-adjunta-mira-pregunta.mp4
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-factura
    title: "Archivo de muestra · factura de un proveedor (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/factura-compra.pdf
    objective_ids: [gq-03-o1]
  - id: gq-03-boleta
    title: "Archivo de muestra · boleta de una venta (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/boleta-venta.pdf
    objective_ids: [gq-03-o1]
  - id: gq-03-recibo
    title: "Archivo de muestra · recibo por honorarios (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/recibo-honorarios.pdf
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-extracto
    title: "Archivo de muestra · estado de cuenta del banco (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/extracto-banco.pdf
    objective_ids: [gq-03-o1]
  - id: gq-03-escaneo
    title: "Archivo de muestra · nota de crédito escaneada, solo imagen (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/nota-credito-escaneada.pdf
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-ventas
    title: "Archivo de muestra · ventas.xlsx, un Excel desordenado de octubre"
    kind: file
    file: materials/archivos-muestra/ventas.xlsx
    objective_ids: [gq-03-o1]
  - id: gq-03-gastos
    title: "Archivo de muestra · gastos.csv, separado por punto y coma"
    kind: file
    file: materials/archivos-muestra/gastos.csv
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-correo
    title: "Archivo de muestra · correo de un proveedor (texto libre)"
    kind: file
    file: materials/archivos-muestra/correo-proveedor.txt
    objective_ids: [gq-03-o2, gq-03-o3]
  - id: gq-03-kit
    title: goldenquerys-kit.zip · las 5 bases, la API de solo lectura, el skill del dashboard y el plan de trabajo
    kind: zip
    file: materials/goldenquerys-kit.zip
    objective_ids: [gq-03-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo al LIVE o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: visor
    title: "Tu visor: adjunta, mira y pregunta"
    tool: lms
    phase: experimentacion
    description: Adjuntas tus archivos (se leen en tu navegador y nada se sube), el tablero se arma solo y le haces preguntas. Primero responden las reglas; si no entienden, la IA, con cada dato atado a su cita.
    check: Tienes tu tablero con un archivo tuyo y al menos una respuesta de reglas y una de IA
  - id: cierre
    title: Qué te dijeron tus archivos
    tool: lms
    phase: reflexion
    description: Cuentas en una línea qué descubriste y te llevas la tarea de la semana.
    check: Tu línea en el muro de cierre
---

**Martes 17 de noviembre, 6:30 – 7:30 pm (hora de Lima).** Última sesión del curso.

Hoy el LIVE es tu visor. Son tres pasos y todo pasa en una sola pantalla:

1. **Adjunta** tus archivos: tu Excel o CSV de ventas, gastos o cobranzas, o un PDF (factura, boleta, recibo, estado
   de cuenta). Se leen en tu navegador: **nada se sube**. Si no tienes uno a la mano, usa los de muestra de la Botica
   Santa Kantuta (todos sus nombres, RUC, DNI, teléfonos y correos son inventados).
2. **Mira** tu tablero: se arma solo, con reglas. Total, promedio, lo primero de cada grupo, cómo te fue por día o por
   mes, y los avisos de tu archivo (filas repetidas, un TOTAL que no cuadra, celdas vacías).
3. **Pregunta**: escribe lo que quieras saber, como se lo dirías a una persona.

## Quién responde

- **Las reglas, primero.** «¿Cuánto suma?», «¿qué producto tiene más?», «¿en qué mes hubo más?», «¿cuál es el
  promedio?». Responden al instante, no cuestan nada, dan siempre lo mismo y te dicen cómo lo calcularon.
- **La IA, cuando la regla no entiende.** «¿Qué me llama la atención?», «¿por qué bajó octubre?». La IA no recibe tu
  archivo: recibe un resumen con los números ya sumados, sin las columnas de personas (clientes, proveedores) y con
  DNI, teléfonos y correos tapados. Tienes 20 preguntas con IA por día.
- **Cada dato de la IA viene con su cita.** Si la cita está en lo que se envió, sale con ✓. Si no está, sale con ✗:
  ese dato es inventado y no te debes fiar.

## Para que tu tablero salga bien

- Una tabla por hoja, con una fila de encabezados (Fecha, Producto, Total…). Los títulos de arriba no molestan.
- Una columna de montos y, si puedes, una de fecha y una de categoría (producto, rubro, medio de pago).
- Si tu Excel tiene varias hojas, se lee la primera.

## Tarea de la semana

Adjunta tres archivos reales de tu negocio, hazle tres preguntas a cada uno y anota una decisión que tomarías con lo
que te respondieron. Si un dato de la IA sale con ✗, búscalo tú en el archivo antes de usarlo.
