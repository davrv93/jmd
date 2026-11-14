#!/usr/bin/env bash
# Redespliega el contenedor orquesta-sperant en el EC2 3.151.56.55 (no toca el estado ni el .env).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# El .env del servidor (~/orquesta-sperant/.env, 600) lleva ORQUESTA_CLAVE, MCP_TOKEN,
# BASE_PUBLICA y OPENROUTER_API_KEY. Se crea una sola vez, a mano.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
go vet ./...
go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/orquesta-sperant-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/orquesta-sperant/build ~/orquesta-sperant/datos && test -f ~/orquesta-sperant/.env'
scp -i "$LLAVE" /tmp/orquesta-sperant-linux $H:orquesta-sperant/build/orquesta
scp -i "$LLAVE" Dockerfile $H:orquesta-sperant/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/orquesta-sperant/build && chmod 755 orquesta && sudo chown 65534:65534 ~/orquesta-sperant/datos && sudo docker build -q -t orquesta-sperant:1 . &&
  sudo docker rm -f orquesta-sperant >/dev/null 2>&1 || true
  sudo docker run -d --name orquesta-sperant --restart unless-stopped --memory 64m --memory-swap 96m \
    --env-file /home/ubuntu/orquesta-sperant/.env -v /home/ubuntu/orquesta-sperant/datos:/datos \
    -p 127.0.0.1:18570:18570 orquesta-sperant:1 && sleep 1 && curl -fsS 127.0.0.1:18570/api/salud; echo'
