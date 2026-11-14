#!/usr/bin/env bash
# Redespliega el contenedor tempano-ia en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Espera /home/ubuntu/tempano-ia/.env (modo 600) en el servidor con:
#   SORTEO_CLAVE=...            clave del admin (cabecera X-Clave); local: ~/Documents/jmd-tempano-ia-clave.txt
#   SORTEO_DATOS=/datos         carpeta del estado (volumen)
#   CLAUDE_ADMIN_URL=http://host.docker.internal:18560   API del sorteo de Claude (solo si se activan premios)
#   CLAUDE_ADMIN_CLAVE=...      su SORTEO_CLAVE
# nginx: /etc/nginx/snippets/tempano-ia.conf → 127.0.0.1:18590 (https://jmd-learn.online/tempano-ia/),
#   con location = /tempano-ia { return 301 /tempano-ia/; } y proxy_set_header X-Real-IP $remote_addr.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/tempano-ia-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/tempano-ia/build ~/tempano-ia/datos'
scp -i "$LLAVE" /tmp/tempano-ia-linux $H:tempano-ia/build/tempano-ia
scp -i "$LLAVE" Dockerfile $H:tempano-ia/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/tempano-ia/build && chmod 755 tempano-ia && sudo chown 65534:65534 ~/tempano-ia/datos && sudo docker build -q -t tempano-ia:1 . &&
  sudo docker rm -f tempano-ia >/dev/null 2>&1 || true
  sudo docker run -d --name tempano-ia --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/tempano-ia/.env -v /home/ubuntu/tempano-ia/datos:/datos \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:18590:18590 tempano-ia:1 && sleep 1 && curl -fsS 127.0.0.1:18590/api/estado | head -c 200; echo'
