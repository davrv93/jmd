#!/usr/bin/env bash
set -euo pipefail

# Copia el build de Astro (sitio/dist/) hacia web/ para publicarlo con el flujo existente.
# IMPORTANTE: preserva web/taller/ (página hecha a mano) y no toca ningún servidor.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$ROOT_DIR/sitio/dist/"
DST="$ROOT_DIR/web/"

if [[ ! -d "$SRC" ]]; then
  echo "No existe sitio/dist/. Ejecuta: (cd sitio && npm run build)" >&2
  exit 2
fi

mkdir -p "$DST"
rsync -a --delete --exclude 'taller/' "$SRC" "$DST"
echo "ok publicado local: $DST"
