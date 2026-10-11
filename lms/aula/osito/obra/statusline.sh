#!/usr/bin/env bash
# Status line de Claude Code: una linea con el estado de la obra.
#   Osito | Frontend | ########.... 40% | Animaciones de animo
#
# Ruta del estado: variable OBRA_ESTADO o estado.json junto a este script.
# Claude Code pasa un JSON por stdin que aqui se descarta.
# Falla en silencio (linea vacia) para no ensuciar la status line.

set -u

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ESTADO="${OBRA_ESTADO:-$AQUI/estado.json}"
ANCHO="${OBRA_ANCHO:-12}"

[ -r "$ESTADO" ] || exit 0

cat >/dev/null 2>&1 <&0 || true

python3 - "$ESTADO" "$ANCHO" <<'PY' 2>/dev/null
import json, sys

ruta, ancho = sys.argv[1], int(sys.argv[2])
try:
    with open(ruta, encoding="utf-8") as fh:
        d = json.load(fh)
except Exception:
    sys.exit(0)

pasos = d.get("pasos") or []
pct = max(0, min(100, int(round(float(d.get("pct") or 0)))))
llenos = round(pct / 100 * ancho)
barra = "█" * llenos + "░" * (ancho - llenos)

actual = ""
for clave in ("en_curso", "error", "pendiente"):
    for p in pasos:
        if p.get("estado") == clave:
            actual = p.get("texto", "")
            if clave == "error":
                actual = "ERROR " + actual
            break
    if actual:
        break
if not actual and pasos:
    actual = "terminado"

partes = [d.get("proyecto") or "Obra", d.get("fase") or "-", f"{barra} {pct}%"]
if actual:
    partes.append(actual)
print(" | ".join(partes))
PY
