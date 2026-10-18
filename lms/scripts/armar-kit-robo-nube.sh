#!/bin/sh
# Arma el kit «robo-local-nube» (Robo sin modelos locales: texto, imagen, dictado y voz por la nube del curso).
#   sh lms/scripts/armar-kit-robo-nube.sh [carpeta-destino]      (por defecto: dist/)
# Deja <destino>/robo-local-nube/ y <destino>/robo-local-nube.zip. Fuente: lms/aula/kit-robo-nube/ más los
# módulos 3D de live/_comun (no se copian a mano: se toman de aquí y se sellan con SHA256SUMS).
set -eu
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
FUENTE="$RAIZ/lms/aula/kit-robo-nube"
COMUN="$RAIZ/lms/content/courses/programacion-agentica/live/_comun"
DESTINO="${1:-$RAIZ/dist}"
KIT="$DESTINO/robo-local-nube"
mkdir -p "$DESTINO"
DESTINO="$(cd "$DESTINO" && pwd)"; KIT="$DESTINO/robo-local-nube"
if [ -e "$KIT" ]; then
  [ -f "$KIT/.kit-robo-nube" ] || { echo "$KIT existe y no es un kit armado por este script: no lo toco." >&2; exit 1; }
  rm -rf "$KIT"
fi
mkdir -p "$KIT/modulos"
( cd "$FUENTE" && tar cf - --exclude '__pycache__' --exclude '.DS_Store' --exclude '.venv' . ) | ( cd "$KIT" && tar xf - )
for f in avatar.js robot.js osito.js RoundedBoxGeometry.js three.module.min.js; do cp "$COMUN/$f" "$KIT/modulos/$f"; done
if command -v sha256sum >/dev/null 2>&1; then SUMA="sha256sum"; else SUMA="shasum -a 256"; fi
( cd "$KIT/modulos" && $SUMA avatar.js robot.js osito.js RoundedBoxGeometry.js three.module.min.js > SHA256SUMS )
# PowerShell 5.1 lee como ANSI los .ps1 sin BOM: las tildes saldrían rotas.
for f in "$KIT"/*.ps1; do printf '\357\273\277' | cat - "$f" > "$f.tmp" && mv "$f.tmp" "$f"; done
chmod +x "$KIT/iniciar.sh"
printf 'robo-local-nube %s (%s)\n' "$(date -u +%Y-%m-%d)" "$(git -C "$RAIZ" rev-parse --short HEAD 2>/dev/null || echo sin-git)" > "$KIT/.kit-robo-nube"
rm -f "$DESTINO/robo-local-nube.zip"
( cd "$DESTINO" && zip -qrX robo-local-nube.zip robo-local-nube )
echo "kit: $KIT"
echo "zip: $DESTINO/robo-local-nube.zip ($(du -h "$DESTINO/robo-local-nube.zip" | cut -f1))"
