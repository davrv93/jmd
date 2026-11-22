#!/bin/sh
# Captura un tablero a PNG con Chrome headless: página completa y solo la portada (sección 04).
# Uso: sh capturar.sh tablero.html   → tablero.png y tablero-portada.png al lado
# Necesita Google Chrome (o chromium) y ffmpeg para recortar la portada.
set -e
H="$1"; [ -f "$H" ] || { echo "Uso: sh capturar.sh tablero.html" >&2; exit 2; }
A="$(cd "$(dirname "$H")" && pwd)/$(basename "$H")"; B="${A%.html}"
CH=""
for c in "$CHROME" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" google-chrome chromium chromium-browser; do
  [ -z "$c" ] && continue
  if [ -x "$c" ]; then CH="$c"; break; fi
  if command -v "$c" >/dev/null 2>&1; then CH="$c"; break; fi
done
[ -n "$CH" ] || { echo "No encuentro Chrome. Pon su ruta en CHROME=..." >&2; exit 1; }
DOM=$("$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=1440,1200 --dump-dom "file://$A" 2>/dev/null)
ALTO=$(printf '%s' "$DOM" | sed -n 's/.*data-alto="\([0-9]*\)".*/\1/p' | head -1); ALTO=${ALTO:-8000}
POR=$(printf '%s' "$DOM" | sed -n 's/.*data-portada="\([0-9,]*\)".*/\1/p' | head -1)
"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=1440,$ALTO --screenshot="$B.png" "file://$A" 2>/dev/null
echo "Página completa: $B.png (1440 × $ALTO)"
if [ -n "$POR" ] && command -v ffmpeg >/dev/null 2>&1; then
  Y=${POR%,*}; AL=${POR#*,}
  ffmpeg -loglevel error -y -i "$B.png" -vf "crop=1440:$AL:0:$Y" "$B-portada.png"
  echo "Portada: $B-portada.png"
fi
