-- Ventas por canal y local
-- base: polleria
SELECT l.nombre AS local, p.canal, COUNT(*) AS pedidos, ROUND(SUM(p.total), 2) AS total_soles,
       ROUND(AVG(p.total), 2) AS ticket_promedio
FROM pedidos p JOIN locales l ON l.id = p.local_id
WHERE p.estado = 'entregado'
GROUP BY l.nombre, p.canal
ORDER BY l.nombre, total_soles DESC;
