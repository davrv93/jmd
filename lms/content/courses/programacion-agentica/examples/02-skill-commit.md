---
id: ej-skill-commit
title: Skill de commits convencionales
summary: El agente escribe el mensaje de commit con Conventional Commits y un hook de git lo valida.
tags: [skills, git]
level: intermedio
lesson: pa-01
order: 2
---
La skill le dice al agente **cómo** escribir el mensaje; un hook `commit-msg` comprueba que lo
hizo bien. Así no dependes de que el modelo «se acuerde»: si se equivoca, git rechaza el commit.

## 1. La skill

`.claude/skills/commit/SKILL.md`:

```markdown
---
name: commit
description: Escribe mensajes de commit con Conventional Commits (feat, fix, docs…) en español y en imperativo. Úsala al pedir «haz commit».
---
1. Corre `git diff --staged`. Si no hay nada preparado, pregunta qué incluir.
2. Tipo: feat · fix · docs · refactor · test · chore. Ámbito entre paréntesis si es claro.
3. Primera línea ≤ 72 caracteres, en imperativo («añade», no «añadido»).
4. Cuerpo: el porqué, no el qué. Enséñame el mensaje antes de ejecutar `git commit`.
```

## 2. El hook que lo valida

```bash
cat > .git/hooks/commit-msg <<'EOF'
#!/bin/sh
# Primera línea: tipo(ámbito opcional): descripción, en 72 caracteres como mucho.
linea=$(head -n 1 "$1")
echo "$linea" | grep -Eq '^(feat|fix|docs|refactor|test|chore)(\([a-z0-9-]+\))?: .+' || {
  echo "commit-msg: usa Conventional Commits, p. ej. «feat(api): añade ejemplos»" >&2; exit 1; }
[ "$(printf '%s' "$linea" | wc -m)" -le 72 ] || {
  echo "commit-msg: la primera línea pasa de 72 caracteres" >&2; exit 1; }
EOF
chmod +x .git/hooks/commit-msg
```

Pruébalo a mano antes de dárselo al agente:

```bash
git commit --allow-empty -m "cambios varios"          # rechazado
git commit --allow-empty -m "docs: añade la guía"     # aceptado
```

## 3. Úsala

```bash
echo "# Clase 1" > NOTAS.md && git add NOTAS.md
claude      # y pide: «haz commit»
```

El agente debe leer el diff, proponerte algo como el bloque de abajo y esperar tu visto bueno:

```text
docs(notas): añade las notas de la clase 1

Para tener a mano los comandos de instalación sin abrir el LMS.
```

## Para pensar

- La skill es **contexto** (puede fallar); el hook es **control** (no falla). En un equipo, el
  hook va en el repositorio (p. ej. con `core.hooksPath`) y la skill en `.claude/skills/`.
- Si añades un tipo (`perf`, `ci`), cámbialo en los dos sitios.
