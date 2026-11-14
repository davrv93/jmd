#!/usr/bin/env bash
# Redespliega el contenedor sopa-ia en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Espera /home/ubuntu/sopa-ia/.env (modo 600) en el servidor con:
#   SORTEO_CLAVE=...            clave del admin (cabecera X-Clave)
#   SORTEO_DATOS=/datos         carpeta del estado (volumen)
#   CLAUDE_ADMIN_URL=http://host.docker.internal:18560   API del sorteo de Claude
#   CLAUDE_ADMIN_CLAVE=...      su SORTEO_CLAVE
# nginx: /etc/nginx/snippets/sopa-ia.conf → 127.0.0.1:18585 (https://jmd-learn.online/sopa-ia/).
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sopa-ia-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sopa-ia/build ~/sopa-ia/datos'
scp -i "$LLAVE" /tmp/sopa-ia-linux $H:sopa-ia/build/sopa-ia
scp -i "$LLAVE" Dockerfile $H:sopa-ia/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/sopa-ia/build && chmod 755 sopa-ia && sudo chown 65534:65534 ~/sopa-ia/datos && sudo docker build -q -t sopa-ia:1 . &&
  sudo docker rm -f sopa-ia >/dev/null 2>&1 || true
  sudo docker run -d --name sopa-ia --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/sopa-ia/.env -v /home/ubuntu/sopa-ia/datos:/datos \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:18585:18585 sopa-ia:1 && sleep 1 && curl -fsS 127.0.0.1:18585/api/estado | head -c 200; echo'
