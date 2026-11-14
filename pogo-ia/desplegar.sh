#!/usr/bin/env bash
# Redespliega el contenedor pogo-ia en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Espera /home/ubuntu/pogo-ia/.env (modo 600) en el servidor con:
#   SORTEO_CLAVE=...            clave del admin (cabecera X-Clave); local: ~/Documents/jmd-pogo-ia-clave.txt
#   SORTEO_DATOS=/datos         carpeta del estado (volumen)
#   CLAUDE_ADMIN_URL=http://host.docker.internal:18560   API del sorteo de Claude (solo si se activan premios)
#   CLAUDE_ADMIN_CLAVE=...      su SORTEO_CLAVE
# nginx: /etc/nginx/snippets/pogo-ia.conf → 127.0.0.1:18610 (https://jmd-learn.online/pogo-ia/),
#   con location = /pogo-ia { return 301 /pogo-ia/; } y proxy_set_header X-Real-IP $remote_addr.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/pogo-ia-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/pogo-ia/build ~/pogo-ia/datos'
scp -i "$LLAVE" /tmp/pogo-ia-linux $H:pogo-ia/build/pogo-ia
scp -i "$LLAVE" Dockerfile $H:pogo-ia/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/pogo-ia/build && chmod 755 pogo-ia && sudo chown 65534:65534 ~/pogo-ia/datos && sudo docker build -q -t pogo-ia:1 . &&
  sudo docker rm -f pogo-ia >/dev/null 2>&1 || true
  sudo docker run -d --name pogo-ia --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/pogo-ia/.env -v /home/ubuntu/pogo-ia/datos:/datos \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:18610:18610 pogo-ia:1 && sleep 1 && curl -fsS 127.0.0.1:18610/api/estado | head -c 200; echo'
