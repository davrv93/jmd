-- Envíos registrados por día de la semana
-- base: courier
SELECT CASE strftime('%w', fecha_registro)
         WHEN '1' THEN '1 lunes' WHEN '2' THEN '2 martes' WHEN '3' THEN '3 miércoles'
         WHEN '4' THEN '4 jueves' WHEN '5' THEN '5 viernes' WHEN '6' THEN '6 sábado' ELSE '7 domingo' END AS dia,
       COUNT(*) AS envios, ROUND(SUM(total), 2) AS total_soles
FROM envios
WHERE estado <> 'cancelado'
GROUP BY dia
ORDER BY dia;
