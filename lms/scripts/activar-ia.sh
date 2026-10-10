#!/usr/bin/env bash
# Conecta el Estudio de landing del LMS a un modelo de IA.
#
# Dos modos:
#   1) Proveedor directo (sin gateway):   activar-ia.sh directo <URL_OPENAI_COMPATIBLE> <CLAVE> [MODELO]
#        ej. activar-ia.sh directo https://openrouter.ai/api/v1 sk-or-... openrouter/auto
#   2) Gateway de la clase (ai-orchestrator en este mismo compose):
#        activar-ia.sh gateway <CLAVE_DE_GATEWAY>
#      Antes, pon en .env las claves de proveedor (OPENROUTER_API_KEY, GEMINI_API_KEY...) y
#      GATEWAY_API_KEYS=<CLAVE_DE_GATEWAY>; la imagen localhost/ai-orchestrator:latest debe existir.
#
# Escribe LMS_LLM_URL / LMS_LLM_KEY / LMS_LLM_MODEL en .env (sin imprimir la clave), recrea el
# contenedor lms (sin build) y comprueba /api/v1/health. Se ejecuta desde la raiz del repo.

set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f .env ] || { echo "No hay .env en $(pwd)"; exit 1; }

modo="${1:-}"
pon() {  # pon CLAVE VALOR : reemplaza o agrega la linea en .env
  local k="$1" v="$2"
  if grep -qE "^$k=" .env; then
    sed -i.bak "s#^$k=.*#$k=$v#" .env && rm -f .env.bak
  else
    printf '%s=%s\n' "$k" "$v" >> .env
  fi
}

case "$modo" in
  directo)
    url="${2:?URL del proveedor}"; clave="${3:?clave}"; modelo="${4:-auto}"
    pon LMS_LLM_URL "$url"; pon LMS_LLM_KEY "$clave"; pon LMS_LLM_MODEL "$modelo"
    ;;
  gateway)
    clave="${2:?clave de gateway (una de GATEWAY_API_KEYS)}"
    pon LMS_LLM_URL "http://ai-orchestrator:4000/v1"; pon LMS_LLM_KEY "$clave"; pon LMS_LLM_MODEL "auto"
    sudo docker compose up -d orchestrator
    ;;
  apagar)
    pon LMS_LLM_URL ""; pon LMS_LLM_KEY ""
    ;;
  *)
    sed -n 2,13p "$0"; exit 1 ;;
esac

sudo docker compose up -d --no-build lms
sleep 4
echo "LMS_LLM_URL: $(grep -E '^LMS_LLM_URL=' .env | cut -d= -f2-)"
echo "LMS_LLM_KEY definida: $([ -n "$(grep -E '^LMS_LLM_KEY=' .env | cut -d= -f2-)" ] && echo si || echo no)"
sudo docker logs lms --since 30s 2>&1 | grep -iE "generaci|LLM|escuchando" | tail -3
