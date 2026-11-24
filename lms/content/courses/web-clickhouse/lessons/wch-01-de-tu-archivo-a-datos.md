---
id: wch-01
title: "Parte 1 · De tu archivo a datos confiables"
published: true
duration: 30
objectives:
  - {id: wch-01-o1, title: "Levantar ClickHouse con Docker y cargar tu Excel o CSV"}
  - {id: wch-01-o2, title: "Pedirle a la IA reglas de limpieza y verificar lo que responde"}
  - {id: wch-01-o3, title: "Limpiar y estructurar los datos sin perder filas ni totales"}
materials:
  - {id: wch-01-repo-ejemplos, title: "Repo en GitHub · ejemplos para levantar en Windows y Mac con Docker (videos 1–4)", kind: link, url: https://github.com/davrv93/clickhouse-bi-ejemplos}
  - {id: wch-01-resumen, title: "Video resumen · ClickHouse paso a paso: Docker en Windows, Mac y Linux, carga y limpieza", kind: video, file: materials/grabaciones/ch-01-resumen.mp4, objective_ids: [wch-01-o1, wch-01-o2, wch-01-o3]}
  - {id: wch-01-v01, title: "Video 1 · Docker en Windows, Mac y Linux, paso a paso", kind: video, file: materials/grabaciones/01-docker-windows-mac-linux.mp4}
  - {id: wch-01-v02, title: "Video 2 · Tu primer contenedor y la persistencia", kind: video, file: materials/grabaciones/02-contenedor-y-persistencia.mp4}
  - {id: wch-01-v03, title: "Video 3 · Cargar CSV y Excel con tipos correctos", kind: video, file: materials/grabaciones/03-cargar-csv-y-excel.mp4}
  - {id: wch-01-v04, title: "Video 4 · Limpieza con reglas de IA y verificación de totales", kind: video, file: materials/grabaciones/04-limpieza-reglas-ia-y-totales.mp4}
  - {id: wch-01-sucio, title: "ventas-sucio.csv · ventas de 4 boticas (ene–oct 2026) con errores a propósito para limpiar", kind: file, file: materials/ventas-sucio.csv, objective_ids: [wch-01-o1, wch-01-o3]}
  - {id: wch-01-limpio, title: "ventas-ejemplo.csv · los mismos datos ya limpios, para comparar", kind: file, file: materials/ventas-ejemplo.csv, objective_ids: [wch-01-o3]}
---
## Parte 1 · De tu archivo a datos confiables

Curso en modalidad web: mira los videos en orden y replica cada paso en tu máquina con el repositorio.

1. **Empieza por el video resumen** (9 minutos): qué es ClickHouse, por qué guarda por columnas y cómo se levanta.
2. **Video 1:** instala Docker Desktop en Windows (con WSL 2) o en Mac.
3. **Video 2:** tu primer contenedor y por qué los datos sobreviven gracias al volumen.
4. **Video 3:** carga el CSV y el Excel con los tipos correctos.
5. **Video 4:** la IA propone reglas de limpieza a partir de un perfil de la tabla (sin ver tus datos) y tú compruebas que el total cuadre.

**Para practicar:** descarga el repositorio de GitHub (botón *Code › Download ZIP* si no usas Git) y sigue su README; cada paso dice qué video lo explica. Los dos CSV de abajo son los mismos datos de ejemplo.

**Entregable:** tus datos cargados, limpios y comprobados en ClickHouse.

## Prompt de esta parte

Pégalo en Claude, DeepSeek u otro asistente junto con el perfil de tu tabla (`docker compose run --rm herramientas perfil_sql.py`). La IA ve el perfil, nunca tus datos.

```prompt
# Video 4 · Reglas de limpieza a partir del perfil
Eres analista de datos. Te paso el PERFIL de mi tabla en ClickHouse (no los datos). Propón reglas de limpieza en JSON con la forma {"reglas":[...]}. Cada regla tiene: id, columna, problema (lo que ves en el perfil), regla (una frase), sql (una expresión de ClickHouse que devuelve el valor limpio de esa columna a partir de la columna original; para las filas repetidas escribe exactamente DISTINCT) y verificacion (una consulta SQL que compruebe que la regla funcionó). La tabla limpia debe tener fecha de tipo Date. No inventes columnas ni valores que no estén en el perfil. No rellenes los datos que faltan: es mejor dejarlos nulos y decirlo.
```
