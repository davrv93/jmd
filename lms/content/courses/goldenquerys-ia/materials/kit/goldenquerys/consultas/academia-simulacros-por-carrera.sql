-- Nota promedio en simulacros por carrera
-- base: academia
SELECT a.carrera_postula AS carrera, COUNT(*) AS simulacros, ROUND(AVG(s.puntaje), 2) AS nota_promedio,
       ROUND(MAX(s.puntaje), 2) AS mejor_nota
FROM simulacros s
JOIN matriculas m ON m.id = s.matricula_id
JOIN alumnos a ON a.id = m.alumno_id
GROUP BY carrera
ORDER BY nota_promedio DESC;
