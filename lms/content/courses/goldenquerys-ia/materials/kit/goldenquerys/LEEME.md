# GoldenQuerys — kit de la clase

Cinco negocios peruanos de mentira, con datos de enero 2025 a octubre 2026, listos para preguntarles en SQL
y ver la respuesta como tabla, gráfico, Excel, CSV, Markdown o JSON.

| Base | Negocio |
|---|---|
| `botica` | Botica con 4 sedes en Lima |
| `polleria` | Pollería con 3 locales, salón y delivery |
| `ferreteria` | Ferretería: ventas al contado y a crédito a maestros de obra |
| `academia` | Academia preuniversitaria: matrículas, pensiones y morosidad |
| `courier` | Empresa de envíos: zonas, repartidores, SLA e incidencias |

## 1. Arrancar (una vez por sesión)

```sh
cd /trabajo/goldenquerys
sh arrancar.sh
```

Debe decir **«Listo: abre goldenquerys/index.html en el visor»**. Si algo falla: `cat /trabajo/goldenquerys.log`.

## 2. Usar el estudio

Abre `goldenquerys/index.html` en el **Visor**:

1. Elige una base a la izquierda (abajo ves sus tablas; clic en una columna la pega en el editor).
2. Toca una **pregunta de ejemplo** o escribe tu SQL. `Ctrl+Enter` ejecuta.
3. Cambia de pestaña: **Tabla · Gráfico · Excel · CSV · Markdown · JSON**. Es el mismo resultado en seis formatos.

Reglas: solo `SELECT` o `WITH`, una consulta a la vez, máximo 5 000 filas y 5 segundos.
Las bases no se pueden modificar (están en solo lectura).

## 3. Reportes desde la terminal

```sh
python3 renderers/reporte.py botica                              # HTML con gráfico → reportes/
python3 renderers/reporte.py ferreteria consultas/ferreteria-cobranza-mensual.sql
bun renderers/reporte.ts polleria consultas/polleria-canales.sql # Markdown en pantalla + CSV
node renderers/reporte.mjs courier                               # tabla en consola + JSON
```

Sin archivo `.sql`, cada renderer usa «ventas por mes» (`SELECT * FROM v_ventas_mensuales`).

## 4. Pedírselo al agente de IA

El agente lee `AGENTS.md` y `ESQUEMAS.md`. Pídele en castellano, por ejemplo:

> «Hazme un reporte de la pollería que compare el Día del Padre con un domingo normal, con gráfico de barras.»

> «En la ferretería, ¿qué maestros de obra nos deben más de 60 días? Quiero un reporte para imprimir.»

Lo verás como `reportes/<nombre>.html` en el visor y en la lista «Reportes y consultas» del estudio.

## Pistas de SQL en SQLite

- Mes: `substr(fecha, 1, 7)` → `'2026-03'`
- Día de la semana: `strftime('%w', fecha)` → `'0'` domingo … `'6'` sábado
- Días entre fechas: `julianday(b) - julianday(a)`
- Filtra anuladas: `WHERE estado = 'emitida'` (botica, ferretería) / `'entregado'` (pollería)
- Hay **suciedad a propósito**: NULLs, un cliente duplicado y un monto negativo. ¡Encuéntralos!
