-- Pedidos por hora del día (almuerzo vs. cena)
-- base: polleria
SELECT strftime('%H', fecha) || ':00' AS hora, COUNT(*) AS pedidos, ROUND(SUM(total), 2) AS total_soles
FROM pedidos
WHERE estado = 'entregado'
GROUP BY hora
ORDER BY hora;
