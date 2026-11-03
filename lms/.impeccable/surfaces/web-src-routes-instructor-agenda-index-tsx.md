---
version: 1
slug: "web-src-routes-instructor-agenda-index-tsx"
primary_target: "web/src/routes/instructor/agenda/index.tsx"
related_targets: []
---

# Calendario del instructor (/instructor/agenda/)

Modo: Operate. Instructor en el celular, minutos antes de clase; también la laptop para planificar.
Tarea: saber qué clase toca y entrar a la mesa LIVE en un toque; copiar el enlace de inscripción de un grupo; abrir la sesión.
Datos: GET /api/v1/instructor/agenda (sesiones con starts_at de cada curso + content/agenda.yaml).
Estados: en vivo, hoy, próxima, dictada, propuesto, por confirmar; sin clases; error; cargando.

## Direction contract

THESIS: La agenda se organiza por grupo, no por calendario: cada grupo activo es una fila con su próxima sesión, su avance (2 de 3) y sus acciones. Rechaza la rejilla mensual de calendario y el tablero de métricas.

OWN-WORLD: El mundo del LMS sin cambios: lavanda y tinta, violeta para acciones y selección, oro para lo próximo, colores de área como punto y barra de avance. Inter, cifras tabulares para horas y fechas. Superficies s1 con línea fina; nada de bordes laterales de color.

STORY: El instructor abre Instructor → Agenda, ve de inmediato si hay clase hoy y a qué hora, entra a la mesa; si no, ve qué grupo sale primero y qué tan avanzado va cada uno.

FIRST VIEWPORT: Arriba, la clase de hoy (o la próxima) ocupa la primera pantalla del celular: nombre del curso como título, grupo y sesión, hora en cifras grandes, cuenta regresiva y un único botón grande «Entrar a la mesa» (o «Abrir sesión» sin LIVE). Debajo, «Grupos activos» ordenados por próxima sesión: columna fija de fecha y hora a la izquierda en cifras tabulares grandes, nombre y grupo, barra de avance, y acciones Copiar enlace y Sesión.

FORM: Por grupo, posición 4 de mi lista ordenada (1 Hoy primero, 2 Semana en tira, 3 Riel del día, 4 Por grupo, 5 Mes con puntos, 6 Cuenta regresiva, 7 Boletos). Aportes: columna horaria fija (Tablero de salidas), la clase de hoy dueña de la primera pantalla (Una clase por pantalla). seed:bbda3efb95f36f13

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
