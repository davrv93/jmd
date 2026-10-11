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
    examples/<archivo>.md       un ejemplo práctico: front matter YAML + cuerpo en Markdown
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
  # diapositivas embebidas: una imagen por diapositiva en slides_dir; file es la descarga
  - {id: ppt, title: Diapositivas, kind: slides, file: materials/clase-01.pptx, slides_dir: materials/clase-01-diapositivas}
  # adjunto para descargar (kind: zip · file): se sirve con su nombre de archivo
  - {id: zip, title: skills.zip, kind: zip, file: materials/skills.zip}
cycle:                           # ciclo de aprendizaje (Kolb): pasos con su herramienta y su comprobación
  - id: ver
    title: Ver la clase
    tool: zoom                   # zoom · vscode · docker · terminal · jmd · claude-code · opencode · git · lms
    phase: experiencia           # fase del ciclo de Kolb (ver abajo); si falta, se deduce
    description: …
    check: "jmd status"          # comando (o evidencia) que demuestra que el paso está hecho
---
Cuerpo en Markdown: «## Avance», los conceptos, «## Tareas»…
```

### Ciclo de aprendizaje (Kolb)

Cada sesión se recorre con el ciclo de aprendizaje experiencial de Kolb, en cuatro fases. La UI
agrupa los pasos por fase y muestra el avance de cada una:

| `phase` | Fase | Qué se hace |
| --- | --- | --- |
| `experiencia` | 1 · Experiencia concreta | Vivir la clase: ver, instalar, ejecutar, construir. |
| `reflexion` | 2 · Observación reflexiva | Mirar qué pasó: revisar, probar y preguntar. |
| `conceptualizacion` | 3 · Conceptualización abstracta | Entender el porqué: leer, escribir el plan o la skill. |
| `experimentacion` | 4 · Experimentación activa | Aplicarlo en real: entregar, desplegar. |

`phase` es opcional: si se omite, el front la deduce del `tool` y el orden (`web/src/lib/kolb.ts`).
Ponla siempre que quieras mandar sobre esa deducción.

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

## Ejemplo (`examples/*.md`)

```yaml
---
id: ej-skill-saludo              # único en todo el contenido
title: "Tu primera skill: saludo" # entre comillas si lleva «: »
summary: Una línea para la lista
tags: [skills, claude-code]
level: básico                    # básico · intermedio · avanzado (por defecto básico)
lesson: pa-01                    # opcional; la sesión debe existir en el curso
repo: {url: https://github.com/…, ref: main}   # opcional
published: true                  # si falta, publicado; false = solo lo ve el instructor
order: 1                         # opcional; primero por order, luego por título (sin order, al final)
---
Cuerpo en Markdown, con bloques de código que se puedan copiar y ejecutar.
```
