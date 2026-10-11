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
phase: conceptualizacion         # opcional; fase del ciclo de Kolb a la que pertenece el ejemplo
repo: {url: https://github.com/…, ref: main}   # opcional
published: true                  # si falta, publicado; false = solo lo ve el instructor
order: 1                         # opcional; primero por order, luego por título (sin order, al final)
---
Cuerpo en Markdown, con bloques de código que se puedan copiar y ejecutar.
```

## Escenas del modo LIVE (`live/<lección>/<NN-nombre>/`)

Cada escena es una carpeta con `escena.yaml` (metadatos) y `escena.html` (la animación). El orden
lo da el prefijo numérico de la carpeta. `live/_plantilla/` es el punto de partida: cópiala y cambia
el contenido. `live/_comun/` guarda lo que comparten todas las escenas (Three.js, avatares); se
sirve en `/api/v1/live/<lección>/comun/<archivo>`. Una escena con `oculta: true` no aparece en la
lista del instructor (sirve de referencia o de prueba). El contenido se recarga solo cada 5 s.

```yaml
id: 03-tu-laptop            # igual al nombre de la carpeta
titulo: Tu laptop y la IA local
fase: experiencia           # experiencia | reflexion | conceptualizacion | experimentacion
paso: relevar               # paso de la clase al que cuenta; "" si ninguno
duracion_min: 8
lo_logre: false             # muestra el botón «Lo logré» al alumno
evidencia: automatica       # ninguna | automatica | captura
umbral_pct: 80              # % de alumnos que debe completar para abrir la compuerta
compuerta: evidencia        # ninguna | presentes | evidencia | lo_logre
comandos:                   # lo que el alumno copia en su terminal
  - { titulo: Diagnóstico, cmd: "python3 /trabajo/osito/backend/diagnostico.py" }
respaldo: captura.png       # imagen si el navegador no tiene WebGL
oculta: false
```

Reglas de `escena.html`: todo inline (sin CDN ni fuentes externas), menos de 300 elementos y
1 MB, animación con CSS o SVG, y legible por completo con `prefers-reduced-motion`. Solo se
pueden pedir archivos `.js .mjs .json .png .webp .svg .woff2` de su carpeta o de `_comun`.
La escena recibe el tema con `?tema=dark|light` y el estado con
`postMessage({tipo:"estado", estado})` (valida `event.origin`). Para probarla:
`node lms/scripts/captura.mjs`. Al editar contenido fuera del módulo Go, corre los tests con
`go test -count=1 ./internal/content` (sin `-count=1` la caché de Go no ve el cambio).
