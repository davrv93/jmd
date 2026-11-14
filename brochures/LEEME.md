# Brochures de los cursos de JMD Learning

Un brochure de una página por curso (PDF A4 y PNG) y un índice de todos los cursos en orden.

- `cursos.py`: lo editorial de cada curso (qué significa, qué se aprende, para quién, temario, precio si es público).
- Fechas y grupos: salen solos del contenido del LMS (`lms/content/courses/<grupo>/lessons/*.md`, campo `starts_at`).
- Imágenes: escenas LIVE reales, capturadas con `capturar.mjs` a `capturas/`.

Regenerar (por ejemplo, cuando cambian las fechas):

```sh
cd brochures
.venv/bin/python generar.py        # usa la fecha de hoy para decidir «próximo», «en curso» o «ya dictado»
node imprimir.mjs                  # salida/pdf y salida/png; avisa si un texto no cabe en la página
```

Primera vez: `python3 -m venv .venv && .venv/bin/pip install qrcode pyyaml`, y capturar las escenas
de cada curso con `node capturar.mjs <curso> capturas <lección/escena>...`.
