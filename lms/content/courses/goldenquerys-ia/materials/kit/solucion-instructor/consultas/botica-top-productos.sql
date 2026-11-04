-- Top 15 productos por venta y margen
-- base: botica
SELECT producto, categoria, unidades, venta_soles, margen_soles,
       ROUND(100.0 * margen_soles / venta_soles, 1) AS margen_pct
FROM v_top_productos
ORDER BY venta_soles DESC
LIMIT 15;
