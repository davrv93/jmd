-- Cobranza mensual (pagos recibidos)
-- base: ferreteria
SELECT substr(fecha, 1, 7) AS mes, COUNT(*) AS pagos, ROUND(SUM(monto), 2) AS cobrado_soles
FROM pagos
GROUP BY mes
ORDER BY mes;
