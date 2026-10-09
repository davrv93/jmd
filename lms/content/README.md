# Contenido del LMS

El contenido de los cursos vive aquí, en archivos, y se versiona con git: el instructor deja el
avance de cada clase y las tareas haciendo commit. El backend (`lms/api`) lo lee al arrancar y
lo recarga solo cuando cambia algún archivo (cada 5 s mira las fechas de modificación).

```
content/
  courses/<slug>/
    course.yaml                 curso: módulos y el orden de las sesiones
    lessons/<archivo>.md        una sesión: front matter YAML + cuerpo en Markdown
    assignments/<archivo>.md    una tarea: front matter YAML + enunciado en Markdown
```

## `course.yaml`

```yaml
id: programacion-agentica        # también es el slug
title: Programación agéntica
description: …
cohorts: [cohorte-2026-2]        # grupos (cohortes) con acceso; vacío = cualquier alumno
modules:
  - id: fundamentos
    title: Módulo 1 · Fundamentos
    lessons: [pa-01, pa-02]      # ids de las sesiones, en orden
```

## Sesión (`lessons/*.md`)

```yaml
---
id: pa-01
title: Clase 1 · …
starts_at: 2026-10-08T19:00:00-05:00
published: true                  # false = solo la ve el instructor
objectives:
  - {id: pa-01-o1, title: …}
recording: {url: https://…zoom…, passcode: "…"}   # opcional; abre en pestaña nueva
repo: {url: https://github.com/…, ref: main}      # opcional; `jmd lesson open pa-01` lo clona
materials:                       # enlaces publicados; kind: link · video · slides · pdf · repo · doc
  - {id: m1, title: …, kind: link, url: https://…, objective_ids: [pa-01-o1]}
cycle:                           # ciclo de aprendizaje: pasos con su herramienta y su comprobación
  - id: ver
    title: Ver la clase
    tool: zoom                   # zoom · vscode · docker · terminal · jmd · claude-code · opencode · git · lms
    description: …
    check: "jmd status"          # comando (o evidencia) que demuestra que el paso está hecho
---
Cuerpo en Markdown: «## Avance», los conceptos, «## Tareas»…
```

## Tarea (`assignments/*.md`)

```yaml
---
id: tarea-01
title: Tarea 1 · …
lesson: pa-01
due_at: 2026-10-15T23:59:00-05:00
max_score: 20
autograde: false
rubric:
  - criterion: …
    levels:
      - {title: No cumple, points: 0}
      - {title: Cumple, points: 10}
---
Enunciado en Markdown.
```
