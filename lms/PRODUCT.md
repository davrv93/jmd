# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Instructor** (también admin): dicta todos los cursos de JMD Learning en vivo por Zoom, en hora de Lima. Suele abrir el LMS **en el celular, justo antes de clase**, para ver qué toca hoy o mañana y entrar rápido a la mesa LIVE.
- **Alumnos**: se inscriben por enlace (`/inscripcion/<grupo>`) y siguen sesiones, tareas, ejemplos y logros de sus grupos.

## Product Purpose

LMS propio de JMD Learning (jmd-learn.online) para talleres cortos de IA aplicada (programación agéntica, Claude Code, diseño y video con IA, QA, seguridad, Python, bots de WhatsApp). Lleva el temario, la clase en vivo (mesa LIVE con escenas, juegos y votaciones), tareas con rúbrica, notas y certificados. Éxito para el instructor: saber qué clase tiene y abrirla en segundos, sin buscar en un Excel.

## Operating Context

- Cada grupo es un curso en `content/courses/<curso>/` con su cohorte; cada sesión es un Markdown con `starts_at` (hora de Lima, `-05:00`).
- Varios grupos del mismo curso corren en paralelo (p. ej. «Difícil de explicar» lunes, domingo mañana y domingo tarde); hay días con dos o tres clases seguidas.
- La inscripción y el cobro pasan por WhatsApp y Yape; el instructor comparte enlaces de inscripción por chat.
- El contenido se publica con `git pull` + recarga; el código del front y del API se despliega con `~/desplegar-lms.sh` y requiere autorización explícita.

## Capabilities and Constraints

- Front Qwik City estático (`lms/web`) incrustado en un binario Go (`lms/api`); rutas `/api/v1`, roles `admin`, `instructor`, `student`.
- El contenido es la fuente de verdad del temario y del horario; la base de datos solo guarda usuarios, progreso, preguntas y entregas.
- Horario: cada `course.yaml` lleva `agenda: {nombre, grupo, area, minutos}` y una sesión puede fijar `duration`; las clases sin curso en el LMS (propuestas o por confirmar) viven en `content/agenda.yaml`. El calendario del instructor está en `/instructor/agenda/` (API `GET /api/v1/instructor/agenda`).

## Brand Commitments

- Nombre: **JMD Learning**. Interfaz en español de Perú, trato de «tú», horas en formato de 12 h («7:30 p. m.»).
- Identidad visual ya establecida en `lms/web/src/global.css` (lavanda, tinta, violeta con oro de apoyo, tema claro y oscuro).

## Evidence on Hand

- Horario real de noviembre–diciembre 2026: `~/Downloads/horario-jmd/horario-jmd-noviembre-2026.xlsx` y las fechas `starts_at` de las sesiones.
- No hay testimonios, cifras de alumnos ni precios en el contenido; no inventarlos.

## Product Principles

1. Lo de hoy primero: la siguiente acción del instructor (entrar a la clase) a un toque.
2. El contenido manda: el horario sale de los archivos del curso, no de una copia aparte.
3. Celular antes que escritorio para el instructor; densidad para planificar solo donde se pide.
4. Honestidad de estado: lo propuesto y lo por confirmar se ve distinto de lo confirmado.
