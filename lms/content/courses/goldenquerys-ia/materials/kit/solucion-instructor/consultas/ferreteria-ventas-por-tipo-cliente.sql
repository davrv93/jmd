-- Ventas por tipo de cliente y sede
-- base: ferreteria
SELECT s.nombre AS sede, COALESCE(c.tipo, 'sin cliente (boleta simple)') AS tipo_cliente,
       COUNT(*) AS ventas, ROUND(SUM(v.total), 2) AS total_soles
FROM ventas v
JOIN sedes s ON s.id = v.sede_id
LEFT JOIN clientes c ON c.id = v.cliente_id
WHERE v.estado = 'emitida'
GROUP BY s.nombre, tipo_cliente
ORDER BY s.nombre, total_soles DESC;
