-- Morosos para llamar hoy (más de 30 días de atraso)
-- base: academia
SELECT alumno, telefono_apoderado, ciclo, sede, COUNT(*) AS cuotas, ROUND(SUM(monto), 2) AS deuda_soles,
       MAX(dias_atraso) AS max_dias_atraso
FROM v_morosidad
WHERE dias_atraso > 30
GROUP BY alumno, ciclo
ORDER BY deuda_soles DESC
LIMIT 30;
