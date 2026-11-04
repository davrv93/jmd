-- Medios de pago por mes (¿cuánto crece Yape?)
-- base: botica
SELECT substr(fecha, 1, 7) AS mes,
       ROUND(SUM(CASE WHEN medio_pago = 'efectivo' THEN total ELSE 0 END), 2) AS efectivo_soles,
       ROUND(SUM(CASE WHEN medio_pago = 'Yape'     THEN total ELSE 0 END), 2) AS yape_soles,
       ROUND(SUM(CASE WHEN medio_pago = 'Plin'     THEN total ELSE 0 END), 2) AS plin_soles,
       ROUND(SUM(CASE WHEN medio_pago = 'tarjeta'  THEN total ELSE 0 END), 2) AS tarjeta_soles
FROM ventas
WHERE estado = 'emitida'
GROUP BY mes
ORDER BY mes;
