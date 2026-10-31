#!/bin/sh
# Arma el kit para laptops: materials/kit-foto-del-sistema/ y su zip reproducible (mismo contenido -> mismo zip).
# Uso: sh armar-kit.sh        (desde cualquier carpeta; solo toca la carpeta materials/ del curso)
set -e
AQUI="$(cd "$(dirname "$0")" && pwd)"            # .../skills-curso/foto-del-sistema/motor
SKILL="$(dirname "$AQUI")"
MAT="$(cd "$SKILL/../../../content/courses/deepseek-harness/materials" && pwd)"
KIT="$MAT/kit-foto-del-sistema"
[ -f "$KIT/LEEME.md" ] || { echo "falta $KIT/LEEME.md (se escribe a mano)" >&2; exit 1; }
rm -rf "$KIT/skills" "$KIT/AGENTS.sistema.md"
mkdir -p "$KIT/skills/foto-del-sistema"
cp "$SKILL/SKILL.md" "$KIT/skills/foto-del-sistema/SKILL.md"
cp -R "$AQUI" "$KIT/skills/foto-del-sistema/motor"
rm -f "$KIT/skills/foto-del-sistema/motor/armar-kit.sh"
find "$KIT" -name .DS_Store -delete
cp "$SKILL/AGENTS.sistema.md" "$KIT/AGENTS.sistema.md"
# fechas fijas y orden fijo: el zip no cambia si el contenido no cambia
find "$KIT" -exec touch -t 202601010000 {} +
rm -f "$MAT/kit-foto-del-sistema.zip"
(cd "$MAT" && find kit-foto-del-sistema -type f | LC_ALL=C sort | zip -X -D -q -@ kit-foto-del-sistema.zip)
echo "kit: $KIT"
echo "zip: $MAT/kit-foto-del-sistema.zip ($(wc -c < "$MAT/kit-foto-del-sistema.zip") bytes)"
