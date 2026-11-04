# GoldenQuerys — esquemas de las bases

Generado por `_fuente/sembrar.py`. Datos ficticios, fechas del 2025-01-01 al 2026-10-31,
montos en soles (REAL, 2 decimales). Precios con IGV 18 % incluido: `total = subtotal + igv`.
Las fechas son TEXT ISO (`YYYY-MM-DD` o `YYYY-MM-DD HH:MM:SS`): usa `substr(fecha,1,7)` para el mes,
`strftime('%w', fecha)` para el día de la semana (0 = domingo) y `julianday()` para restar fechas.

**Suciedad a propósito** (para preguntas de calidad de datos): algunos NULL (teléfonos, distritos,
pesos), un cliente/alumno duplicado (mismo DNI/RUC, escrito distinto) y un registro con monto
negativo marcado como anulado/cancelado con `observacion`. Filtra `estado` antes de sumar.

## botica  (`bases/botica.sqlite`, 2328 KB)

Botica de barrio con 4 sedes en Lima (ventas con boleta/factura, productos por categoría)

- **categorias** (tabla, 10 filas): id INTEGER PK, nombre TEXT
- **clientes** (tabla, 1,501 filas): id INTEGER PK, dni TEXT, nombres TEXT, apellidos TEXT, distrito TEXT, telefono TEXT, fecha_registro TEXT
- **empleados** (tabla, 16 filas): id INTEGER PK, nombres TEXT, apellidos TEXT, cargo TEXT, sede_id INTEGER → sedes.id, fecha_ingreso TEXT
- **productos** (tabla, 67 filas): id INTEGER PK, codigo TEXT, nombre TEXT, categoria_id INTEGER → categorias.id, laboratorio TEXT, presentacion TEXT, precio_venta REAL, costo_unitario REAL, requiere_receta INTEGER
- **sedes** (tabla, 4 filas): id INTEGER PK, nombre TEXT, distrito TEXT, direccion TEXT, fecha_apertura TEXT
- **venta_detalle** (tabla, 15,837 filas): id INTEGER PK, venta_id INTEGER → ventas.id, producto_id INTEGER → productos.id, cantidad INTEGER, precio_unitario REAL, importe REAL
- **ventas** (tabla, 9,003 filas): id INTEGER PK, fecha TEXT, sede_id INTEGER → sedes.id, cliente_id INTEGER → clientes.id, empleado_id INTEGER → empleados.id, tipo_comprobante TEXT, serie_numero TEXT, medio_pago TEXT, subtotal REAL, igv REAL, total REAL, estado TEXT, observacion TEXT
- **v_top_productos** (vista, 67 filas): producto, categoria TEXT, unidades, venta_soles, margen_soles
- **v_ventas_mensuales** (vista, 22 filas): mes, operaciones, total_soles, ticket_promedio
- **v_ventas_por_sede** (vista, 88 filas): sede TEXT, mes, operaciones, total_soles

**Preguntas de negocio:**

1. ¿Cuánto vendimos cada mes?

```sql
SELECT mes, operaciones, total_soles, ticket_promedio
FROM v_ventas_mensuales;
```

2. ¿Qué sede vende más y con qué ticket promedio?

```sql
SELECT s.nombre AS sede, COUNT(*) AS ventas, ROUND(SUM(v.total),2) AS total_soles,
       ROUND(AVG(v.total),2) AS ticket_promedio
FROM ventas v JOIN sedes s ON s.id = v.sede_id
WHERE v.estado = 'emitida'
GROUP BY s.nombre
ORDER BY total_soles DESC;
```

3. Top 10 productos por margen bruto

```sql
SELECT producto, categoria, unidades, venta_soles, margen_soles
FROM v_top_productos
ORDER BY margen_soles DESC
LIMIT 10;
```

4. ¿Se venden más antigripales en invierno?

```sql
SELECT substr(v.fecha,1,7) AS mes, ROUND(SUM(d.importe),2) AS antigripales_soles
FROM venta_detalle d
JOIN ventas v ON v.id = d.venta_id
JOIN productos p ON p.id = d.producto_id
JOIN categorias c ON c.id = p.categoria_id
WHERE c.nombre = 'Antigripales' AND v.estado = 'emitida'
GROUP BY mes ORDER BY mes;
```

5. Calidad de datos: DNI duplicados y ventas negativas

```sql
SELECT 'DNI duplicado' AS problema, dni AS detalle, COUNT(*) AS casos
FROM clientes GROUP BY dni HAVING COUNT(*) > 1
UNION ALL
SELECT 'Venta con total negativo', serie_numero, 1 FROM ventas WHERE total < 0
UNION ALL
SELECT 'Clientes sin distrito', NULL, COUNT(*) FROM clientes WHERE distrito IS NULL;
```

## polleria  (`bases/polleria.sqlite`, 2908 KB)

Pollería con 3 locales: salón, para llevar, delivery propio y app

- **clientes** (tabla, 2,201 filas): id INTEGER PK, nombres TEXT, apellidos TEXT, telefono TEXT, distrito TEXT, fecha_registro TEXT
- **locales** (tabla, 3 filas): id INTEGER PK, nombre TEXT, distrito TEXT, direccion TEXT, aforo INTEGER
- **pedido_detalle** (tabla, 22,480 filas): id INTEGER PK, pedido_id INTEGER → pedidos.id, plato_id INTEGER → platos.id, cantidad INTEGER, precio_unitario REAL, importe REAL
- **pedidos** (tabla, 10,994 filas): id INTEGER PK, fecha TEXT, local_id INTEGER → locales.id, cliente_id INTEGER → clientes.id, canal TEXT, repartidor_id INTEGER → repartidores.id, medio_pago TEXT, subtotal REAL, igv REAL, costo_delivery REAL, total REAL, estado TEXT, minutos_entrega INTEGER, calificacion INTEGER, observacion TEXT
- **platos** (tabla, 17 filas): id INTEGER PK, nombre TEXT, categoria TEXT, precio REAL, costo REAL, activo INTEGER
- **repartidores** (tabla, 12 filas): id INTEGER PK, nombres TEXT, apellidos TEXT, local_id INTEGER → locales.id, vehiculo TEXT, fecha_ingreso TEXT
- **v_delivery_por_repartidor** (vista, 12 filas): repartidor, local TEXT, pedidos, minutos_promedio, calificacion
- **v_ventas_mensuales** (vista, 22 filas): mes, operaciones, total_soles, ticket_promedio
- **v_ventas_por_dia_semana** (vista, 7 filas): num_dia INT, dia, pedidos, total_soles

**Preguntas de negocio:**

1. ¿Cuánto vendimos cada mes?

```sql
SELECT mes, operaciones, total_soles, ticket_promedio
FROM v_ventas_mensuales;
```

2. ¿Qué día de la semana vendemos más?

```sql
SELECT dia, pedidos, total_soles
FROM v_ventas_por_dia_semana;
```

3. Domingos especiales vs. un domingo normal

```sql
SELECT CASE
         WHEN date(fecha) IN ('2025-06-15','2026-06-21') THEN 'Día del Padre'
         WHEN date(fecha) IN ('2025-07-20','2026-07-19') THEN 'Día del Pollo a la Brasa'
         WHEN date(fecha) IN ('2025-05-11','2026-05-10') THEN 'Día de la Madre'
         ELSE 'Domingo normal' END AS tipo_dia,
       COUNT(DISTINCT date(fecha)) AS dias,
       ROUND(SUM(total) / COUNT(DISTINCT date(fecha)), 2) AS venta_promedio_por_dia
FROM pedidos
WHERE estado = 'entregado' AND strftime('%w', fecha) = '0'
GROUP BY tipo_dia
ORDER BY venta_promedio_por_dia DESC;
```

4. Tiempo de delivery por repartidor

```sql
SELECT repartidor, local, pedidos, minutos_promedio, calificacion
FROM v_delivery_por_repartidor;
```

5. Platos más pedidos por canal

```sql
SELECT p.canal, pl.nombre AS plato, SUM(d.cantidad) AS unidades, ROUND(SUM(d.importe),2) AS total_soles
FROM pedido_detalle d
JOIN pedidos p ON p.id = d.pedido_id
JOIN platos pl ON pl.id = d.plato_id
WHERE p.estado = 'entregado'
GROUP BY p.canal, pl.nombre
ORDER BY p.canal, unidades DESC;
```

## ferreteria  (`bases/ferreteria.sqlite`, 2316 KB)

Ferretería y materiales de construcción: ventas al contado y a crédito a maestros de obra

- **categorias** (tabla, 8 filas): id INTEGER PK, nombre TEXT
- **clientes** (tabla, 421 filas): id INTEGER PK, tipo TEXT, nombre TEXT, documento TEXT, distrito TEXT, telefono TEXT, limite_credito REAL, fecha_registro TEXT
- **pagos** (tabla, 8,069 filas): id INTEGER PK, venta_id INTEGER → ventas.id, fecha TEXT, monto REAL, medio_pago TEXT
- **productos** (tabla, 33 filas): id INTEGER PK, codigo TEXT, nombre TEXT, categoria_id INTEGER → categorias.id, unidad TEXT, precio_venta REAL, costo_unitario REAL
- **sedes** (tabla, 3 filas): id INTEGER PK, nombre TEXT, distrito TEXT
- **venta_detalle** (tabla, 16,838 filas): id INTEGER PK, venta_id INTEGER → ventas.id, producto_id INTEGER → productos.id, cantidad REAL, precio_unitario REAL, importe REAL
- **ventas** (tabla, 6,998 filas): id INTEGER PK, fecha TEXT, sede_id INTEGER → sedes.id, cliente_id INTEGER → clientes.id, condicion TEXT, dias_credito INTEGER, fecha_vencimiento TEXT, subtotal REAL, igv REAL, total REAL, estado TEXT, observacion TEXT
- **v_cuentas_por_cobrar** (vista, 263 filas): venta_id INTEGER, fecha TEXT, fecha_vencimiento TEXT, cliente_id INTEGER, cliente TEXT, tipo TEXT, total REAL, pagado, saldo, dias_vencido INT
- **v_deuda_por_cliente** (vista, 135 filas): cliente_id INTEGER, cliente TEXT, tipo TEXT, facturas_pendientes, deuda_soles, max_dias_vencido
- **v_ventas_mensuales** (vista, 22 filas): mes, operaciones, total_soles, contado_soles, credito_soles

**Preguntas de negocio:**

1. Ventas por mes: contado vs. crédito

```sql
SELECT mes, contado_soles, credito_soles, total_soles
FROM v_ventas_mensuales;
```

2. ¿Quién nos debe más?

```sql
SELECT cliente, tipo, facturas_pendientes, deuda_soles, max_dias_vencido
FROM v_deuda_por_cliente
LIMIT 15;
```

3. Antigüedad de la deuda (0-30, 31-60, 61-90, +90 días)

```sql
SELECT CASE
         WHEN dias_vencido <= 0 THEN '1. Por vencer'
         WHEN dias_vencido <= 30 THEN '2. 1-30 días'
         WHEN dias_vencido <= 60 THEN '3. 31-60 días'
         WHEN dias_vencido <= 90 THEN '4. 61-90 días'
         ELSE '5. Más de 90 días' END AS tramo,
       COUNT(*) AS facturas, ROUND(SUM(saldo),2) AS saldo_soles
FROM v_cuentas_por_cobrar
GROUP BY tramo ORDER BY tramo;
```

4. Productos estrella por categoría

```sql
SELECT c.nombre AS categoria, p.nombre AS producto, p.unidad,
       SUM(d.cantidad) AS cantidad, ROUND(SUM(d.importe),2) AS venta_soles
FROM venta_detalle d
JOIN ventas v ON v.id = d.venta_id
JOIN productos p ON p.id = d.producto_id
JOIN categorias c ON c.id = p.categoria_id
WHERE v.estado = 'emitida'
GROUP BY p.id
ORDER BY venta_soles DESC
LIMIT 12;
```

5. Maestros y constructoras que superan su límite de crédito

```sql
SELECT c.nombre, c.tipo, c.limite_credito, d.deuda_soles,
       ROUND(d.deuda_soles - c.limite_credito, 2) AS exceso_soles
FROM v_deuda_por_cliente d JOIN clientes c ON c.id = d.cliente_id
WHERE d.deuda_soles > c.limite_credito
ORDER BY exceso_soles DESC;
```

## academia  (`bases/academia.sqlite`, 2652 KB)

Academia preuniversitaria: ciclos, matrículas, pensiones, morosidad y asistencia

- **alumnos** (tabla, 1,601 filas): id INTEGER PK, dni TEXT, nombres TEXT, apellidos TEXT, fecha_nacimiento TEXT, colegio_procedencia TEXT, distrito TEXT, carrera_postula TEXT, universidad_objetivo TEXT, telefono_apoderado TEXT, fecha_registro TEXT
- **asistencias** (tabla, 11,520 filas): id INTEGER PK, matricula_id INTEGER → matriculas.id, mes TEXT, sesiones_programadas INTEGER, sesiones_asistidas INTEGER
- **ciclos** (tabla, 10 filas): id INTEGER PK, nombre TEXT, tipo TEXT, fecha_inicio TEXT, fecha_fin TEXT, meses INTEGER, pension_mensual REAL, monto_matricula REAL
- **matriculas** (tabla, 2,350 filas): id INTEGER PK, alumno_id INTEGER → alumnos.id, ciclo_id INTEGER → ciclos.id, sede_id INTEGER → sedes.id, fecha_matricula TEXT, monto_matricula REAL, descuento_pct REAL, estado TEXT, fecha_retiro TEXT
- **pensiones** (tabla, 12,506 filas): id INTEGER PK, matricula_id INTEGER → matriculas.id, numero_cuota INTEGER, fecha_vencimiento TEXT, monto REAL, fecha_pago TEXT, monto_pagado REAL, medio_pago TEXT, observacion TEXT
- **sedes** (tabla, 3 filas): id INTEGER PK, nombre TEXT, distrito TEXT
- **simulacros** (tabla, 5,731 filas): id INTEGER PK, matricula_id INTEGER → matriculas.id, fecha TEXT, puntaje REAL
- **v_matriculas_mensuales** (vista, 12 filas): mes, matriculas, matricula_soles
- **v_morosidad** (vista, 723 filas): pension_id INTEGER, alumno, telefono_apoderado TEXT, ciclo TEXT, sede TEXT, numero_cuota INTEGER, fecha_vencimiento TEXT, monto REAL, dias_atraso INT
- **v_ventas_mensuales** (vista, 22 filas): mes, operaciones, total_soles

**Preguntas de negocio:**

1. Matrículas por mes (pico de enero a marzo)

```sql
SELECT mes, matriculas, matricula_soles
FROM v_matriculas_mensuales;
```

2. Cobranza de pensiones por mes

```sql
SELECT mes, operaciones AS pagos, total_soles
FROM v_ventas_mensuales;
```

3. Morosidad por ciclo y sede

```sql
SELECT ciclo, sede, COUNT(*) AS cuotas_vencidas, ROUND(SUM(monto),2) AS deuda_soles,
       ROUND(AVG(dias_atraso)) AS dias_atraso_promedio
FROM v_morosidad
GROUP BY ciclo, sede
ORDER BY deuda_soles DESC;
```

4. ¿Los que faltan más se retiran más?

```sql
SELECT m.estado, COUNT(DISTINCT m.id) AS matriculas,
       ROUND(100.0 * SUM(a.sesiones_asistidas) / SUM(a.sesiones_programadas), 1) AS pct_asistencia
FROM matriculas m JOIN asistencias a ON a.matricula_id = m.id
GROUP BY m.estado
ORDER BY pct_asistencia;
```

5. Carreras más postuladas por universidad

```sql
SELECT universidad_objetivo AS universidad, carrera_postula AS carrera, COUNT(*) AS alumnos
FROM alumnos
GROUP BY universidad, carrera
ORDER BY alumnos DESC;
```

## courier  (`bases/courier.sqlite`, 2580 KB)

Empresa de envíos (courier): envíos por zona, repartidores, SLA, incidencias y calificaciones

- **calificaciones** (tabla, 3,205 filas): id INTEGER PK, envio_id INTEGER → envios.id, puntaje INTEGER, comentario TEXT
- **clientes** (tabla, 181 filas): id INTEGER PK, razon_social TEXT, ruc TEXT, tipo TEXT, distrito TEXT, telefono TEXT, fecha_registro TEXT
- **envios** (tabla, 8,507 filas): id INTEGER PK, codigo TEXT, cliente_id INTEGER → clientes.id, zona_id INTEGER → zonas.id, repartidor_id INTEGER → repartidores.id, distrito_destino TEXT, fecha_registro TEXT, fecha_recojo TEXT, fecha_entrega TEXT, peso_kg REAL, contra_entrega INTEGER, subtotal REAL, igv REAL, total REAL, estado TEXT, observacion TEXT
- **incidencias** (tabla, 767 filas): id INTEGER PK, envio_id INTEGER → envios.id, fecha TEXT, tipo TEXT, descripcion TEXT, resuelta INTEGER
- **repartidores** (tabla, 24 filas): id INTEGER PK, nombres TEXT, apellidos TEXT, vehiculo TEXT, zona_id INTEGER → zonas.id, fecha_ingreso TEXT, activo INTEGER
- **zonas** (tabla, 8 filas): id INTEGER PK, nombre TEXT, descripcion TEXT, tarifa_base REAL, tarifa_kg_adicional REAL, sla_horas INTEGER
- **v_cumplimiento_sla** (vista, 8 filas): zona TEXT, sla_horas INTEGER, entregados, dentro_sla, pct_sla, horas_promedio
- **v_incidencias_por_repartidor** (vista, 24 filas): repartidor, zona TEXT, envios, incidencias, incidencias_x100
- **v_ventas_mensuales** (vista, 22 filas): mes, operaciones, total_soles, ticket_promedio

**Preguntas de negocio:**

1. Envíos y facturación por mes

```sql
SELECT mes, operaciones AS envios, total_soles, ticket_promedio
FROM v_ventas_mensuales;
```

2. % de entregas dentro del SLA por zona

```sql
SELECT zona, sla_horas, entregados, dentro_sla, pct_sla, horas_promedio
FROM v_cumplimiento_sla;
```

3. Repartidores con más incidencias cada 100 envíos

```sql
SELECT repartidor, zona, envios, incidencias, incidencias_x100
FROM v_incidencias_por_repartidor
LIMIT 10;
```

4. Tipos de incidencia y cuántas siguen sin resolver

```sql
SELECT tipo, COUNT(*) AS incidencias, SUM(resuelta = 0) AS sin_resolver
FROM incidencias
GROUP BY tipo
ORDER BY incidencias DESC;
```

5. Clientes que más facturan y su tasa de devolución

```sql
SELECT c.razon_social, c.tipo, COUNT(*) AS envios, ROUND(SUM(e.total),2) AS total_soles,
       ROUND(100.0 * SUM(e.estado = 'devuelto') / COUNT(*), 1) AS pct_devueltos
FROM envios e JOIN clientes c ON c.id = e.cliente_id
WHERE e.estado <> 'cancelado'
GROUP BY c.id
ORDER BY total_soles DESC
LIMIT 15;
```
