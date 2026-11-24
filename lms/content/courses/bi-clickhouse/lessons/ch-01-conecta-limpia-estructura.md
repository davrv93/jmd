---
id: ch-01
title: "Sesión 1 · De tu archivo a datos confiables"
starts_at: 2026-11-29T15:00:00-05:00
duration: 120
published: true
objectives:
  - {id: ch-01-o1, title: "Levantar ClickHouse con Docker y cargar tu Excel, CSV o Access"}
  - {id: ch-01-o2, title: "Pedirle a Claude o DeepSeek la consulta de limpieza y verificar lo que responde"}
  - {id: ch-01-o3, title: "Limpiar y estructurar los datos sin perder filas ni totales"}
materials:
  - {id: ch-01-resumen, title: "Video · Sesión 1 paso a paso: Docker en Windows, Mac y Linux, carga y limpieza en ClickHouse", kind: video, file: materials/grabaciones/ch-01-resumen.mp4, objective_ids: [ch-01-o1, ch-01-o2, ch-01-o3]}
  - {id: ch-01-v01, title: "Video 1 · Docker en Windows, Mac y Linux, paso a paso", kind: video, file: materials/grabaciones/01-docker-windows-mac-linux.mp4}
  - {id: ch-01-v02, title: "Video 2 · Tu primer contenedor y la persistencia", kind: video, file: materials/grabaciones/02-contenedor-y-persistencia.mp4}
  - {id: ch-01-v03, title: "Video 3 · Cargar CSV y Excel con tipos correctos", kind: video, file: materials/grabaciones/03-cargar-csv-y-excel.mp4}
  - {id: ch-01-v04, title: "Video 4 · Limpieza con reglas de IA y verificación de totales", kind: video, file: materials/grabaciones/04-limpieza-reglas-ia-y-totales.mp4}
  - {id: ch-01-sucio, title: "ventas-sucio.csv · ventas de 4 boticas (ene–oct 2026) con errores a propósito para limpiar", kind: file, file: materials/ventas-sucio.csv, objective_ids: [ch-01-o1, ch-01-o3]}
  - {id: ch-01-limpio, title: "ventas-ejemplo.csv · los mismos datos ya limpios, para comparar", kind: file, file: materials/ventas-ejemplo.csv, objective_ids: [ch-01-o3]}
---
## Sesión 1 · De tu archivo a datos confiables

**Domingo 29 de noviembre, 3:00 – 5:00 p. m. (hora de Lima).** En vivo por Zoom; la clase queda grabada.

- **Qué es ClickHouse:** una base analítica por columnas, por qué se separa de la base que vende y en qué se diferencia de DuckDB.
- **Levanta tu servidor:** ClickHouse con Docker en Windows, Mac o Linux, con los mismos comandos.
- **Carga tu archivo:** Excel, CSV o Access a una tabla, sin perder filas.
- **Limpia con IA:** Claude o DeepSeek proponen la consulta; tú compruebas filas y totales antes y después.
- **Estructura:** tabla de hechos y catálogos, con los tipos de dato correctos.

**Entregable:** tus datos cargados, limpios y comprobados en ClickHouse, listos para el dashboard de la sesión 2.

El video de la sesión repasa todo paso a paso, para que lo repliques a tu ritmo.
