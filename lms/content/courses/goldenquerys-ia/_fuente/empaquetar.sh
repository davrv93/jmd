#!/bin/sh
# GoldenQuerys — regenera las bases y el zip del kit que baja el alumno.
# Uso: sh _fuente/empaquetar.sh   → materials/goldenquerys-kit.zip (raíz del zip: goldenquerys/)
# El zip lleva solo lo que el alumno NO construye: las bases, la API de solo lectura, el skill y el plan.
# El estudio, los renderers y los reportes de ejemplo quedan en materials/kit/solucion-instructor/.
set -e
CURSO="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$CURSO/_fuente/sembrar.py"
KIT="$CURSO/materials/kit/goldenquerys"
[ -f "$KIT/ESQUEMAS.md" ] && mv -f "$KIT/ESQUEMAS.md" "$CURSO/materials/kit/solucion-instructor/ESQUEMAS.md"
cd "$CURSO/materials/kit"
rm -f "$CURSO/materials/goldenquerys-kit.zip"
zip -qr -X "$CURSO/materials/goldenquerys-kit.zip" \
  goldenquerys/bases/*.sqlite goldenquerys/servidor.py goldenquerys/arrancar.sh \
  goldenquerys/skill-dashboard goldenquerys/PLAN_TRABAJO.md goldenquerys/LEEME.md goldenquerys/AGENTS.md
ls -l "$CURSO/materials/goldenquerys-kit.zip"
unzip -l "$CURSO/materials/goldenquerys-kit.zip"
