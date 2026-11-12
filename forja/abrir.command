#!/usr/bin/env bash
# Abre el estudio Forja en esta Mac: http://localhost:18697/  (doble clic en Finder o ./abrir.command)
cd "$(dirname "$0")"
if ! curl -fsS -o /dev/null http://localhost:18697/api/estado 2>/dev/null; then
  [ -d node_modules ] || npm install
  [ -f web/datos/reglas.json ] || node reglas/compilar.mjs
  FORJA_DESCARGAR=1 nohup node servidor.mjs > /tmp/forja.log 2>&1 &
  for i in $(seq 1 30); do curl -fsS -o /dev/null http://localhost:18697/api/estado 2>/dev/null && break; sleep 0.5; done
fi
open http://localhost:18697/
echo "Forja abierta en http://localhost:18697/ · para apagarla: pkill -f 'node servidor.mjs'"
