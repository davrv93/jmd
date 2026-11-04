# AGENTS.md — GoldenQuerys (para el agente de IA)

Trabajas dentro del aula (Alpine). Carpeta del kit: `/trabajo/goldenquerys`. Responde y escribe en
castellano peruano (textos, comentarios, títulos, nombres de archivo en minúsculas-con-guiones).

## Qué hay

| Ruta | Qué es |
|---|---|
| `bases/*.sqlite` | 5 bases SQLite: `botica`, `polleria`, `ferreteria`, `academia`, `courier` |
| `ESQUEMAS.md` | **Léelo primero**: tablas, columnas, FKs, vistas, filas y 5 preguntas con SQL por giro |
| `servidor.py` | API de solo lectura en `http://127.0.0.1:8766` (se arranca con `sh arrancar.sh`) |
| `index.html`, `app.js`, `app.css` | Estudio de reportes (no lo rompas; si lo cambias, cambia poco) |
| `renderers/` | `reporte.py` (HTML+SVG), `reporte.ts` (bun: Markdown+CSV), `reporte.mjs` (node: JSON) |
| `consultas/*.sql` | Consultas guardadas. Primera línea `-- Título`, segunda `-- base: <base>` |
| `reportes/` | Aquí van los reportes que generes (`.html`, `.csv`, `.json`) |

Disponibles: python3 (sqlite3), bun (bun:sqlite), node 24 (node:sqlite), curl. **No hay** pandas,
matplotlib, openpyxl ni el CLI `sqlite3`: no intentes instalarlos.

## Reglas que no se negocian

1. **Nunca modifiques los `.sqlite`** (ni INSERT/UPDATE/DELETE/CREATE, ni los reemplaces). Son de solo lectura.
   Si necesitas datos derivados, calcúlalos en la consulta (CTE `WITH`) o en el reporte.
2. La API solo acepta **una** sentencia que empiece con `SELECT` o `WITH`; máximo 5 000 filas y 5 s.
3. En páginas HTML, llama a la API **siempre con ruta absoluta** `fetch("/api/consulta?…")`
   (el visor reescribe `/api/...` hacia el aula). Nunca `http://127.0.0.1:8766/...` dentro de una página.
4. Librerías en el navegador solo por CDN https, p. ej. `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`.
5. Montos en soles: muestra `S/ 1,234.50`. Filtra registros anulados (`estado`) antes de sumar.

## API

```
GET  /api/salud                          → {"ok": true, "bases": [...]}
GET  /api/bases                          → bases con giro, n.º de tablas, tamaño y preguntas de ejemplo
GET  /api/esquema?db=botica              → tablas/vistas, columnas, tipos, PK/FK y filas
GET  /api/consulta?db=botica&sql=SELECT… → {columnas, filas, total, ms, truncado}
POST /api/consulta  {"db": "botica", "sql": "SELECT …"}
GET  /api/reportes                       → reportes/*.html y consultas/*.sql con su título
```

Errores: HTTP 400 con `{"error": "…"}` en castellano (incluye el mensaje de SQLite).

## Cómo hacer un reporte nuevo a partir de un pedido en castellano

1. Identifica la base y las tablas en `ESQUEMAS.md` (las vistas `v_*` ya resuelven lo común).
2. **Prueba el SQL con curl** antes de escribir la página:
   ```sh
   curl -s -G http://127.0.0.1:8766/api/consulta --data-urlencode db=polleria \
        --data-urlencode "sql=SELECT dia, pedidos, total_soles FROM v_ventas_por_dia_semana"
   ```
   (Si responde «Connection refused»: `sh arrancar.sh`.)
3. Guarda el SQL en `consultas/<base>-<tema>.sql` con `-- Título` y `-- base: <base>` arriba.
4. Elige el formato:
   - **Reporte dinámico** (recomendado): crea `reportes/<base>-<tema>.html` con la plantilla de abajo.
   - **Reporte estático**: `python3 renderers/reporte.py <base> consultas/<archivo>.sql` (HTML+SVG, sin internet).
   - Tabla Markdown/CSV: `bun renderers/reporte.ts …` · JSON: `node renderers/reporte.mjs …`
5. Verifica: `curl -s http://127.0.0.1:8766/api/reportes` debe listar tu archivo; dile al usuario que lo abra en el
   visor como `goldenquerys/reportes/<nombre>.html`.

### Plantilla de reporte dinámico (`reportes/<base>-<tema>.html`)

```html
<!doctype html>
<html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ventas por día de la semana · pollería</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
 body{margin:0;background:#0f1115;color:#e9e6df;font:14px/1.5 system-ui,sans-serif}
 main{max-width:1000px;margin:auto;padding:24px 16px} h1{color:#e0b44c}
 .tarjeta{background:#171a21;border:1px solid #2b303b;border-radius:12px;padding:16px;margin-bottom:16px;overflow:auto}
 table{border-collapse:collapse;width:100%} th,td{padding:6px 10px;border-bottom:1px solid #2b303b;text-align:left}
 td.num{text-align:right} #error{color:#ff8a7a}
</style></head><body><main>
<h1>Ventas por día de la semana</h1>
<p id="error"></p>
<div class="tarjeta" style="height:360px"><canvas id="g"></canvas></div>
<div class="tarjeta"><table id="t"></table></div>
<script>
const DB = 'polleria';
const SQL = `SELECT dia, pedidos, total_soles FROM v_ventas_por_dia_semana`;
const soles = (v) => 'S/ ' + v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
fetch('/api/consulta?db=' + DB + '&sql=' + encodeURIComponent(SQL))   // ruta ABSOLUTA /api/...
  .then((r) => r.json())
  .then((d) => {
    if (d.error) throw new Error(d.error);
    const i = (c) => d.columnas.indexOf(c);
    new Chart(document.getElementById('g'), {
      type: 'bar',
      data: { labels: d.filas.map((f) => f[i('dia')]),
              datasets: [{ label: 'Ventas (S/)', data: d.filas.map((f) => f[i('total_soles')]), backgroundColor: '#e0b44c' }] },
      options: { maintainAspectRatio: false },
    });
    document.getElementById('t').innerHTML =
      '<tr>' + d.columnas.map((c) => `<th>${c}</th>`).join('') + '</tr>' +
      d.filas.map((f) => '<tr>' + f.map((v, k) =>
        `<td class="${typeof v === 'number' ? 'num' : ''}">${/soles/.test(d.columnas[k]) ? soles(v) : v ?? ''}</td>`).join('') + '</tr>').join('');
  })
  .catch((e) => (document.getElementById('error').textContent = 'Error: ' + e.message));
</script>
</main></body></html>
```

## Resumen de bases (detalle completo en `ESQUEMAS.md`)

- **botica**: `sedes`, `categorias`, `productos`, `clientes`, `empleados`, `ventas` (cabecera, `estado` emitida/anulada),
  `venta_detalle`. Vistas: `v_ventas_mensuales`, `v_ventas_por_sede`, `v_top_productos`.
- **polleria**: `locales`, `platos`, `clientes`, `repartidores`, `pedidos` (`canal`: salón/delivery/para llevar/app,
  `minutos_entrega`, `calificacion`), `pedido_detalle`. Vistas: `v_ventas_mensuales`, `v_ventas_por_dia_semana`,
  `v_delivery_por_repartidor`.
- **ferreteria**: `sedes`, `categorias`, `productos`, `clientes` (`tipo`, `limite_credito`), `ventas` (`condicion`
  contado/crédito, `fecha_vencimiento`), `venta_detalle`, `pagos`. Vistas: `v_ventas_mensuales`, `v_cuentas_por_cobrar`,
  `v_deuda_por_cliente`.
- **academia**: `sedes`, `ciclos`, `alumnos`, `matriculas`, `pensiones` (`fecha_pago` NULL = impaga), `asistencias`
  (mensual), `simulacros`. Vistas: `v_ventas_mensuales` (cobranza), `v_matriculas_mensuales`, `v_morosidad`.
- **courier**: `zonas` (`sla_horas`), `repartidores`, `clientes`, `envios`, `incidencias`, `calificaciones`.
  Vistas: `v_ventas_mensuales`, `v_cumplimiento_sla`, `v_incidencias_por_repartidor`.

Todas tienen `v_ventas_mensuales(mes, operaciones, total_soles, …)`. Fechas TEXT ISO; fecha de corte de deudas: `2026-10-31`.
