---
id: ej-skill-saludo
title: "Tu primera skill: saludo"
summary: Una skill mínima de Claude Code, de la carpeta vacía a verla funcionar.
tags: [skills, claude-code]
level: básico
lesson: pa-01
order: 1
---
Una skill es una carpeta con un `SKILL.md`. El agente lee siempre el `name` y la `description`;
el cuerpo, solo cuando tu pedido encaja con la descripción. Esta es la skill de la **Tarea 1**.

## 1. Crea la carpeta

Dentro de tu repositorio `clase-01` (alcance de proyecto, se versiona con el repo):

```bash
mkdir -p .claude/skills/saludo
```

## 2. Escribe el `SKILL.md`

`.claude/skills/saludo/SKILL.md`:

```markdown
---
name: saludo
description: Saluda al alumno por su nombre y le dice qué clase toca. Úsala cuando pidan «salúdame» o «qué toca hoy».
---
Pregunta el nombre si no lo sabes. Responde en español, en dos líneas:
1. Un saludo con el nombre.
2. La clase de hoy, leída de `clases.md` si existe; si no, di que no hay archivo.
```

Fíjate en el reparto: la **descripción dice cuándo** usarla (incluye las frases que la
disparan) y el cuerpo dice **cómo**, en pasos cortos.

## 3. Dale algo que leer

```bash
cat > clases.md <<'EOF'
- 2026-10-08 · Clase 1 · Instalar las herramientas y entender qué hay detrás
- 2026-10-15 · Clase 2 · Un proyecto desde cero con el agente
EOF
```

## 4. Pruébala

```bash
claude -p "salúdame, soy Ana"       # una sola respuesta, sin abrir la sesión
claude                              # o en la sesión: «qué toca hoy» o /saludo
```

Lo esperado, en dos líneas:

```text
¡Hola, Ana!
Hoy toca la Clase 1 · Instalar las herramientas y entender qué hay detrás.
```

## Comprobaciones

- Borra `clases.md` y repite: debe decir que no hay archivo (la rama del «si no»).
- Pide algo que no encaje («explícame este error de Docker»): la skill **no** debe cargarse.
- Si no se dispara con «salúdame», el problema casi siempre está en la `description`, no en el
  cuerpo: hazla más concreta.
