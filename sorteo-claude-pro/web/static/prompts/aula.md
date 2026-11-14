# Prompt · Aula virtual con IA (LMS)

Pega este prompt en Claude Code dentro de un proyecto vacío. Es el entregable de la sesión 4 de **Claude Code PRO**.

---

Construye un sistema de gestión de aprendizaje (LMS) para un curso en vivo. Backend en Go (o Node) con SQLite, frontend en HTML + módulos ES sin frameworks. Todo en español.

## Modelo

- `cursos` → `unidades` → `sesiones`. Cada sesión tiene fecha, hora, duración, enlace de videoclase y estado (programada, en vivo, grabada).
- Cada sesión se diseña con el **ciclo de Kolb** y guarda las cuatro fases como bloques: experiencia concreta, observación reflexiva, conceptualización abstracta y experimentación activa. Una sesión está completa cuando las cuatro fases tienen contenido.
- `silabo`: objetivos, competencias, cronograma y evaluación por unidad; se genera a partir de las sesiones y se exporta a PDF.
- `recursos`: archivos, enlaces y recursos generados; pertenecen a una sesión y a una fase de Kolb.
- `usuarios` con roles (admin, instructor, alumno) y `cohortes`.
- `calificaciones`: rúbrica por sesión, nota de 0 a 20, retroalimentación.
- `interacciones`: asistencia, preguntas en vivo, reacciones y entregas.

## Pantallas

1. **Aula**: barra lateral con unidades y sesiones; cada sesión muestra cuatro puntos (las fases de Kolb) que se encienden al completarse. Tarjeta de clase «EN VIVO» con el botón de la videoclase.
2. **Sílabo**: vista limpia y exportable.
3. **Recursos**: lista por fase; botón «Generar recurso con IA» que pide a un modelo (a través de la API del Claude) un recurso para la fase elegida, lo muestra escribiéndose y permite guardarlo o descartarlo. Marca siempre lo generado como «borrador de IA» hasta que el instructor lo apruebe.
4. **Notas**: tabla por alumno y sesión, con promedio y estado (aprobado desde 11).
5. **Interacción**: asistencia, preguntas y reacciones de la clase en vivo.
6. **Modo LIVE**: pantalla para proyectar durante la clase, con la fase de Kolb actual, el temporizador y las preguntas que llegan.

## Videoclase

Integra **Jitsi Meet** con su iframe API: una sala por sesión, el nombre del alumno precargado y el instructor como moderador. Sin dependencias de pago.

## Reglas de calidad

- Cada escritura valida en el servidor; el cliente solo pinta.
- Las claves del modelo de IA van en variables de entorno; nunca en el frontend. Comprueba su presencia con un booleano, no imprimiéndolas.
- Pruebas: una por cada regla del modelo (sesión completa solo con cuatro fases, nota entre 0 y 20, un recurso siempre tiene fase).
- Diálogos propios: nada de `alert`, `confirm` ni `prompt` nativos.
- Tema claro, tipografía legible, funciona a 360 px sin desplazamiento horizontal, respeta `prefers-reduced-motion`.

## Para ir más lejos

- Certificado de participación con código verificable en una URL pública.
- Inscripción por enlace de cohorte.
- Grabaciones: guarda el enlace al terminar la sesión y cambia el estado a «grabada».
