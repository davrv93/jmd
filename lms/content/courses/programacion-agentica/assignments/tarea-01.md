---
id: tarea-01
title: Tarea 1 · Tu entorno listo y tu primera skill
lesson: pa-01
due_at: 2026-10-15T23:59:00-05:00
max_score: 20
autograde: false
objective_ids: [pa-01-o1, pa-01-o3]
rubric:
  - criterion: Entorno instalado con evidencia (VS Code, Docker, jmd, agente)
    levels:
      - {title: Sin evidencia, points: 0}
      - {title: Parcial (falta alguna pieza o comprobación), points: 4}
      - {title: Completo (las cuatro comprobaciones en verde), points: 8}
  - criterion: Skill `saludo` correcta (front matter válido, descripción que dice cuándo usarla, instrucciones claras)
    levels:
      - {title: No entregada, points: 0}
      - {title: Funciona pero la descripción o los pasos son vagos, points: 4}
      - {title: Funciona y está bien escrita, points: 8}
  - criterion: Reflexión (qué hizo el agente, qué aceptaste y qué no, y por qué)
    levels:
      - {title: No hay, points: 0}
      - {title: Superficial, points: 2}
      - {title: Concreta, con ejemplos, points: 4}
---

## Qué entregar

Un repositorio git (GitHub, GitLab o Forgejo, público o con acceso para el instructor) llamado
`clase-01`, con:

1. **`EVIDENCIA.md`** con la salida literal de estos comandos (bloques de código) y una captura
   de pantalla del agente corriendo en la terminal de VS Code:

   ```bash
   code --version
   docker run --rm hello-world
   jmd status
   ```

2. **`.claude/skills/saludo/SKILL.md`**: tu primera skill. Debe tener `name` y `description`
   en el front matter y, debajo, instrucciones en pasos. Pídele al agente «salúdame» y pega su
   respuesta en `EVIDENCIA.md`.

3. **`REFLEXION.md`** (10–15 líneas): qué le pediste al agente en el paso «practicar», qué
   archivos creó, qué comandos quiso ejecutar, qué aceptaste y qué no, y por qué.

## Cómo entregar

- Desde el LMS: en esta tarea, pega la URL del repositorio y el SHA del commit.
- Desde la terminal, dentro del repo: `jmd submit tarea-01` (envía el `origin` y el `HEAD`).

Se califica el commit exacto que entregues; si subes cambios después, vuelve a entregar.
