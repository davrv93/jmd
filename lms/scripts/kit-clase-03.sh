#!/bin/sh
# kit-clase-03.sh: arma materials/clase-03-kit.zip de la clase 3 (chatbot de WhatsApp) y lo copia
# a los tres cursos. Reproducible: mismas fuentes → mismo zip (fechas fijas, orden fijo, sin atributos extra).
#
# Fuentes (no se editan aquí):
#   lms/aula/skills-curso/s3-*/SKILL.md          las skills de la clase
#   lms/aula/plantillas/plan-chatbot/            plan, prompt, indicaciones, index.html, pruebas, recursos
#   lms/content/courses/programacion-agentica/materials/clase-03-kit/LEEME.md
#
# Uso: sh lms/scripts/kit-clase-03.sh        (desde cualquier carpeta)
# Deja: materials/clase-03-kit.zip, materials/plan-chatbot/*.md y materials/clase-03-kit/recursos/ en
# programacion-agentica, y el zip y plan-chatbot/*.md en las copias -g2 y -g3.
set -eu
LMS="$(cd "$(dirname "$0")/.." && pwd)"
CURSO="$LMS/content/courses/programacion-agentica"
KIT="$CURSO/materials/clase-03-kit"
PLANTILLA="$LMS/aula/plantillas/plan-chatbot"
FECHA=202610220000          # fecha fija de la clase 3 (touch -t)

command -v zip >/dev/null || { echo "falta el comando zip" >&2; exit 1; }
[ -f "$KIT/LEEME.md" ] || { echo "falta $KIT/LEEME.md" >&2; exit 1; }

# 1) Los materiales sueltos que enlaza la lección salen de la plantilla del aula.
mkdir -p "$CURSO/materials/plan-chatbot" "$KIT/recursos"
for f in PLAN_TRABAJO.md PROMPT_ARMAR_CHATBOT.md INDICACIONES.md; do cp "$PLANTILLA/$f" "$CURSO/materials/plan-chatbot/$f"; done
rm -f "$KIT/recursos/"*.svg
cp "$PLANTILLA/recursos/"*.svg "$KIT/recursos/"

# 2) Carpeta temporal con la estructura del zip.
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
R="$TMP/clase-03-kit"
mkdir -p "$R/skills" "$R/plan-chatbot/pruebas" "$R/recursos"
cp "$KIT/LEEME.md" "$R/"
for d in "$LMS"/aula/skills-curso/s3-*; do mkdir -p "$R/skills/$(basename "$d")"; cp "$d/SKILL.md" "$R/skills/$(basename "$d")/"; done
for f in PLAN_TRABAJO.md PROMPT_ARMAR_CHATBOT.md INDICACIONES.md index.html; do cp "$PLANTILLA/$f" "$R/plan-chatbot/"; done
cp "$PLANTILLA/pruebas/"* "$R/plan-chatbot/pruebas/"
cp "$PLANTILLA/recursos/"*.svg "$R/recursos/"
mkdir -p "$R/plan-chatbot/recursos" && cp "$PLANTILLA/recursos/"*.svg "$R/plan-chatbot/recursos/"   # index.html usa recursos/logo-bot.svg

find "$R" -exec touch -t "$FECHA" {} +

# 3) Zip con orden fijo y sin campos extra (-X), y copia a los tres cursos.
SALIDA="$CURSO/materials/clase-03-kit.zip"
rm -f "$SALIDA"
(cd "$TMP" && find clase-03-kit -type f | LC_ALL=C sort | TZ=UTC zip -q -X -D "$SALIDA" -@)
for g in programacion-agentica-g2 programacion-agentica-g3 programacion-agentica-g4 programacion-agentica-g5; do
  cp "$SALIDA" "$LMS/content/courses/$g/materials/clase-03-kit.zip"
  mkdir -p "$LMS/content/courses/$g/materials/plan-chatbot"
  cp "$CURSO/materials/plan-chatbot/"*.md "$LMS/content/courses/$g/materials/plan-chatbot/"
done
echo "listo: $SALIDA ($(wc -c < "$SALIDA" | tr -d ' ') bytes, $(cd "$TMP" && find clase-03-kit -type f | wc -l | tr -d ' ') archivos)"
command -v shasum >/dev/null && shasum -a 256 "$SALIDA" | cut -c1-16 || true
