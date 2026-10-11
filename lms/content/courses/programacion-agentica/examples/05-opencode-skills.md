---
id: ej-skills-guia
title: "Skills: cómo funcionan y cómo aprovecharlas"
summary: Dónde viven, cómo se cargan, cómo se escriben bien y cómo usarlas para tu propio trabajo.
tags: [skills, opencode]
level: intermedio
lesson: pa-01
phase: conceptualizacion
order: 5
---
Una skill es **contexto bajo demanda**: el agente ve el nombre y la descripción de todas tus
skills, pero solo carga el cuerpo de la que encaja con tu pedido. Puedes tener cien instaladas
sin gastar tokens hasta que una hace falta.

## Dónde van

OpenCode busca `SKILL.md` en todas estas rutas (proyecto y usuario):

| Alcance | Ruta |
|---|---|
| Proyecto (OpenCode) | `.opencode/skills/<nombre>/SKILL.md` |
| Usuario (OpenCode) | `~/.config/opencode/skills/<nombre>/SKILL.md` |
| Compatible Claude | `.claude/skills/…` y `~/.claude/skills/…` |
| Compatible agente | `.agents/skills/…` y `~/.agents/skills/…` |

Lo del **proyecto** se versiona con el repo y lo comparte el equipo; lo del **usuario** vale
para todos tus proyectos. Una skill de Claude Code sirve igual en OpenCode.

## Cómo se escribe

El front matter solo reconoce estos campos:

```markdown
---
name: informe-semanal          # obligatorio: minúsculas, guiones simples, = nombre de la carpeta
description: Genera el informe semanal del alumno en Markdown con la plantilla del curso. Úsala cuando pidan «informe de la semana».   # obligatorio: dice CUÁNDO usarla
license: MIT                   # opcional
compatibility: opencode        # opcional
metadata:                      # opcional: mapa de texto a texto
  audience: alumnos
---
## Qué hace
Rellena la plantilla del curso con los commits de la semana.

## Cómo
1. Ejecuta `python scripts/plantilla.py --semana N`.
2. Rellénala con `git log --since="1 week ago"`.
3. Guarda en `informes/semana-N.md`.
```

- `name`: 1–64 caracteres, `^[a-z0-9]+(-[a-z0-9]+)*$`, sin `--` y sin empezar/terminar en `-`.
- `description`: 1–1024 caracteres; es lo único que el agente lee **siempre**, así que di cuándo
  usarla (incluye las frases que la disparan).
- El cuerpo: pasos cortos y verificables.

## Cómo se cargan

OpenCode las lista en la herramienta `skill` y el agente la carga cuando encaja:

```text
skill({ name: "informe-semanal" })
```

Tú también puedes pedir una a mano. El control de acceso es por patrones en `opencode.json`:

```json
{ "permission": { "skill": { "*": "allow", "interno-*": "deny", "experimental-*": "ask" } } }
```

`allow` carga directo, `deny` oculta la skill, `ask` pide permiso.

## Aprovecharlas para tu trabajo

- **Repite lo que repites.** ¿Reescribes el mismo formato de informe, de commit o de PR? Eso es
  una skill: la descripción dice cuándo, el cuerpo dice cómo.
- **Usa archivos de referencia.** Una skill grande no mete todo en `SKILL.md`: apunta a
  `references/*.md` y el agente los lee solo si los necesita (mira `landing-editorial`).
- **Combina con el control.** La skill es contexto (el modelo puede ignorarla); si algo es
  innegociable, ponlo además en un hook o en una prueba.

## Si no aparece

1. El archivo se llama `SKILL.md`, en mayúsculas.
2. Tiene `name` y `description` en el front matter.
3. El `name` coincide con la carpeta y no se repite en otra ruta.
4. No está bloqueada por una regla `deny`.
