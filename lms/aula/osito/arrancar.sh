#!/usr/bin/env bash
# Arranca el backend del osito en http://127.0.0.1:8765
# Uso: ./arrancar.sh [--sin-recarga]
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$AQUI/../.venv"
RECARGA="--reload"
[[ "${1:-}" == "--sin-recarga" ]] && RECARGA=""

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Creando entorno virtual en $VENV ..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip
fi

if ! "$VENV/bin/python" -c "import fastapi, uvicorn, faster_whisper, fastembed, PIL, diffusers" 2>/dev/null; then
  echo "Instalando dependencias ..."
  "$VENV/bin/pip" install -r "$AQUI/backend/requirements.txt"
fi

export OSITO_MODELO="${OSITO_MODELO:-qwen3:1.7b}"
export OSITO_NOMBRE="${OSITO_NOMBRE:-Tecnosito}"
export OSITO_WHISPER="${OSITO_WHISPER:-small}"
export OSITO_IMAGEN="${OSITO_IMAGEN:-auto}"
export OSITO_OLLAMA_URL="${OSITO_OLLAMA_URL:-http://localhost:11434}"
PUERTO="${OSITO_PUERTO:-8765}"

echo "Osito: $OSITO_NOMBRE con $OSITO_MODELO, whisper $OSITO_WHISPER, imagen $OSITO_IMAGEN"
echo "Abre http://127.0.0.1:$PUERTO"
cd "$AQUI"
exec "$VENV/bin/uvicorn" backend.app:app --host 127.0.0.1 --port "$PUERTO" $RECARGA
