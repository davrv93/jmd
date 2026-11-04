#!/bin/sh
# GoldenQuerys — regenera las bases, el reporte de ejemplo y el zip del kit.
# Uso: sh _fuente/empaquetar.sh   → materials/goldenquerys-kit.zip (raíz del zip: goldenquerys/)
set -e
CURSO="$(cd "$(dirname "$0")/.." && pwd)"
KIT="$CURSO/materials/kit/goldenquerys"
python3 "$CURSO/_fuente/sembrar.py"
cd "$KIT"
rm -f reportes/*.html reportes/*.csv reportes/*.json
python3 renderers/reporte.py botica
python3 renderers/reporte.py ferreteria consultas/ferreteria-cobranza-mensual.sql
cd "$CURSO/materials/kit"
rm -f "$CURSO/materials/goldenquerys-kit.zip"
zip -qr -X "$CURSO/materials/goldenquerys-kit.zip" goldenquerys \
  -x 'goldenquerys/.servidor.pid' 'goldenquerys/goldenquerys.log' '*/__pycache__/*' '*.DS_Store'
ls -l "$CURSO/materials/goldenquerys-kit.zip"
unzip -l "$CURSO/materials/goldenquerys-kit.zip" | tail -n 1
