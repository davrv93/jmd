---
id: ej-skill-saludo
title: "Tu primera skill en OpenCode"
summary: Una skill mínima, de la carpeta vacía a verla funcionar en OpenCode.
tags: [skills, opencode]
level: básico
lesson: pa-01
order: 1
---
Una skill es una carpeta con un `SKILL.md`. El agente lee siempre el `name` y la `description`;
el cuerpo, solo cuando tu pedido encaja con la descripción. Esta es la skill de la **Tarea 1**.

## 1. Crea la carpeta

Dentro de tu repositorio `clase-01` (alcance de proyecto, se versiona con el repo):

```bash
mkdir -p .opencode/skills/saludo
```

OpenCode busca las skills del proyecto en `.opencode/skills/`. Si prefieres que valgan para
todos tus proyectos, usa `~/.config/opencode/skills/`; también lee `.claude/skills/` y
`.agents/skills/`, así que una skill de Claude Code te sirve igual.

## 2. Escribe el `SKILL.md`

`.opencode/skills/saludo/SKILL.md`:

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
disparan) y el cuerpo dice **cómo**, en pasos cortos. El `name` debe ir en minúsculas, con
guiones simples, y coincidir con el nombre de la carpeta.

## 3. Dale algo que leer

```bash
cat > clases.md <<'EOF'
- 2026-10-08 · Clase 1 · Instalar las herramientas y entender qué hay detrás
- 2026-10-15 · Clase 2 · Un proyecto desde cero con el agente
EOF
```

## 4. Pruébala

```bash
opencode run "salúdame, soy Ana"   # una sola respuesta, sin abrir la sesión
opencode                           # o en la sesión: «qué toca hoy»
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
