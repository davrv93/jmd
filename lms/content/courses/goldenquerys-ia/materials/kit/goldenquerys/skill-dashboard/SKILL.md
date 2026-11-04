---
name: dashboard-sql
description: Construye un dashboard web de un negocio a partir de una base SQLite que se consulta por la API de GoldenQuerys (/api/esquema y /api/consulta), con indicadores, gráficos de Chart.js y filtros que vuelven a consultar. Palabras gatillo: dashboard, tablero, reporte dinámico, golden query, pregunta de oro, KPI, indicador, gráfico, SQL, mi negocio.
---

# Dashboard SQL · GoldenQuerys

## Cuándo usar
- El alumno quiere ver los datos de su negocio (archivo `MI_NEGOCIO.txt`) en un dashboard.
- Hay que convertir una pregunta en español en SQL y mostrar el resultado.
- No lo uses para modificar las bases: son de solo lectura.

## Lo que ya existe (no lo reescribas)
- Las 5 bases en `goldenquerys/bases/<negocio>.sqlite`: botica, polleria, ferreteria, academia, courier.
- La API de solo lectura en `http://127.0.0.1:8766` (la arranca `sh goldenquerys/arrancar.sh`):
  - `GET /api/bases` lista las bases.
  - `GET /api/esquema?db=<negocio>` da tablas, vistas, columnas, tipos y filas.
  - `GET /api/consulta?db=<negocio>&sql=<SELECT urlencoded>` devuelve `{columnas, filas, total, ms, truncado}`.
    Solo acepta un SELECT o WITH. Máximo 5000 filas y 5 s.
- El visor del LMS muestra `/trabajo/<ruta>` y reenvía todo lo que empiece por `/api/` al puerto 8766.

## Cómo se trabaja (en este orden)
1. **Explora antes de escribir.** Lee el esquema con `curl -s "localhost:8766/api/esquema?db=<negocio>"`. Nombra las 3 tablas que importan y su relación.
2. **Pregunta de oro → SQL → prueba.** Cada consulta se prueba con curl antes de usarla:
   `curl -s "localhost:8766/api/consulta?db=<negocio>" --get --data-urlencode "sql=SELECT ..."`.
   Si `filas` sale vacío o un total parece raro, revisa los JOIN y los datos anulados o negativos.
3. **Guarda las consultas** que funcionan en `goldenquerys/consultas/<negocio>-<tema>.sql`, con un comentario `-- Pregunta: ...` arriba.
4. **Construye el dashboard** en un solo archivo `goldenquerys/dashboard/index.html` (receta abajo).
5. **Verifica en el visor** `goldenquerys/dashboard/index.html`: los números deben coincidir con tus curl.

## Receta del dashboard
- Un solo HTML con su `<style>` y su `<script>`. Sin frameworks ni build.
- Chart.js fijo: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>`.
- Llama a la API con ruta ABSOLUTA `/api/...`. El visor la redirige sola; una ruta relativa no funciona.
- Estructura mínima:
  - Cabecera con el nombre del negocio.
  - Filtros: fecha desde y fecha hasta (más sede o local si la base la tiene).
  - 3 tarjetas de indicador (KPI).
  - 2 gráficos: uno en el tiempo y uno de ranking.
  - Una tabla con el detalle del ranking.
- Al cambiar un filtro, todo se vuelve a consultar.
- Formato de soles: `new Intl.NumberFormat("es-PE", {style: "currency", currency: "PEN"})`.

Ayudante para consultar (úsalo tal cual):
```js
const DB = "botica"; // el negocio de MI_NEGOCIO.txt
async function q(sql) {
  const r = await fetch("/api/consulta?db=" + DB + "&sql=" + encodeURIComponent(sql));
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Error en la consulta");
  return j; // { columnas, filas, total, ms }
}
```

Filtros sin inyección: las fechas vienen de `<input type="date">`. Valida que cumplan `/^\d{4}-\d{2}-\d{2}$/` antes de ponerlas en el SQL.

## Criterio de terminado
- `dashboard/index.html` abre en el visor sin errores en la consola del visor.
- Muestra 3 KPI y 2 gráficos con datos reales.
- Cambiar las fechas cambia los números.
- Cada KPI se puede repetir con un curl y da lo mismo.

## Errores comunes
- `fetch("api/consulta")` sin la barra inicial: en el visor da 404. Usa `/api/consulta`.
- Chart.js sobre el mismo canvas dos veces: destruye el gráfico anterior (`grafico.destroy()`) antes de crearlo otra vez.
- Fechas guardadas como texto: compáralas con `date(fecha) BETWEEN '2026-01-01' AND '2026-03-31'`.
- Ventas anuladas o negativas: exclúyelas, salvo que la pregunta sea de calidad de datos.
