#!/usr/bin/env bash
# Redespliega el contenedor sorteo-claude en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/ruta/k.pem ./desplegar.sh
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-claude-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-claude/build ~/sorteo-claude/datos'
scp -i "$LLAVE" /tmp/sorteo-claude-linux $H:sorteo-claude/build/sorteo
scp -i "$LLAVE" Dockerfile $H:sorteo-claude/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/sorteo-claude/build && chmod 755 sorteo && sudo chown 65534:65534 ~/sorteo-claude/datos && sudo docker build -q -t sorteo-claude:1 . &&
  sudo docker rm -f sorteo-claude >/dev/null 2>&1 || true
  sudo docker run -d --name sorteo-claude --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/sorteo-claude/.env -v /home/ubuntu/sorteo-claude/datos:/datos \
    -p 127.0.0.1:18560:18560 -p 172.17.0.1:18560:18560 sorteo-claude:1 && sleep 1 && curl -fsS 127.0.0.1:18560/api/estado | head -c 160; echo'
