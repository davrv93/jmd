-- Calificación promedio y entregas tarde por zona
-- base: courier
SELECT z.nombre AS zona, COUNT(*) AS calificaciones, ROUND(AVG(c.puntaje), 2) AS puntaje_promedio,
       SUM(c.puntaje <= 2) AS clientes_molestos
FROM calificaciones c
JOIN envios e ON e.id = c.envio_id
JOIN zonas z ON z.id = e.zona_id
GROUP BY z.id
ORDER BY puntaje_promedio;
