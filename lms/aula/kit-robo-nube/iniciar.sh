#!/bin/sh
# Arranca el aula local en http://127.0.0.1:8800 y te pide entrar con tu cuenta del curso si aún no tienes token
# (se guarda fuera de esta carpeta).
#   sh iniciar.sh            arrancar
#   sh iniciar.sh --token    volver a pedir tu token (venció o cambiaste de cuenta)
# Con JMDesign Studio no hace falta: «Plan de trabajo → Abrir → Arrancar el aula» hace lo mismo.
# Si JMDesign está en este equipo se usa su Python incluido (ya trae los paquetes: sin .venv ni pip).
# Si no, la primera vez crea el entorno de Python (~1 min, ~40 MB).
cd "$(dirname "$0")" || exit 1
export PYTHONUTF8=1
VENV="${VENV:-.venv}"
PUERTO="${AULA_PUERTO:-8800}"

# El Python incluido con JMDesign: JMDESIGN_PYTHON, o la ruta que JMDesign anota al abrirse.
python_jmdesign() {
  for p in "${JMDESIGN_PYTHON:-}" \
           "$(head -n 1 "$HOME/Library/Application Support/com.jmdesign.studio/python.txt" 2>/dev/null)" \
           "$(head -n 1 "${XDG_CONFIG_HOME:-$HOME/.config}/com.jmdesign.studio/python.txt" 2>/dev/null)"; do
    if [ -n "$p" ] && [ -x "$p" ] && "$p" -c 'import fastapi, uvicorn, httpx, PIL, multipart' 2>/dev/null; then
      echo "$p"; return 0
    fi
  done
  return 1
}

if VPY="$(python_jmdesign)"; then
  echo "Uso el Python incluido con JMDesign ($VPY)."
else
  PY=python3
  command -v python3 >/dev/null 2>&1 || PY=python
  if [ -x "$VENV/Scripts/python.exe" ]; then VPY="$VENV/Scripts/python.exe"; else VPY="$VENV/bin/python"; fi
  if [ ! -x "$VPY" ]; then
    "$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null \
      || { echo "Necesitas Python 3.10 o más nuevo (o JMDesign Studio, que lo trae): https://www.python.org/downloads/ (en Mac también: brew install python@3.12)."; exit 1; }
    echo "Creando el entorno de Python en $VENV (solo la primera vez, ~1 min)..."
    "$PY" -m venv "$VENV" || exit 1
    if [ -x "$VENV/Scripts/python.exe" ]; then VPY="$VENV/Scripts/python.exe"; else VPY="$VENV/bin/python"; fi
    "$VPY" -m pip install -q --upgrade pip
    "$VPY" -m pip install -q -r requirements.txt || exit 1
  fi
fi
"$VPY" herramientas/verificar.py puerto "$PUERTO" || { echo "Cierra ese programa o usa otro puerto: AULA_PUERTO=8801 sh iniciar.sh"; exit 1; }
if [ "${1:-}" = "--token" ] || ! "$VPY" cuenta.py ver | grep -q '^Token presente'; then
  echo "Vas a entrar con tu cuenta del curso (la del LMS) para recibir tu token personal."
  "$VPY" cuenta.py entrar || exit 1
fi
"$VPY" cuenta.py ver
echo "Aula local en http://127.0.0.1:$PUERTO  ·  nube del curso: ${JMD_NUBE:-https://jmd-learn.online/aula-nube}"
echo "Déjala abierta. Estado de tu conexión: http://127.0.0.1:$PUERTO/nube"
exec "$VPY" -m uvicorn aula_local:app --host 127.0.0.1 --port "$PUERTO"
