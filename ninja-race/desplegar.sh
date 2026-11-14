#!/usr/bin/env bash
# Redespliega el contenedor ninja-race en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Espera /home/ubuntu/ninja-race/.env (modo 600) en el servidor con:
#   SORTEO_CLAVE=...              clave del admin (cabecera X-Clave)
#   SORTEO_DATOS=/datos           carpeta del estado (volumen)
#   CLAUDE_ADMIN_URL=http://host.docker.internal:18560   API del sorteo de Claude
#   CLAUDE_ADMIN_CLAVE=...        su SORTEO_CLAVE (sirve para pedir códigos y
#                                 para leer cada 15 min quién ya ganó allá:
#                                 esos quedan excluidos del 100 %)
# nginx: /etc/nginx/snippets/ninja-race.conf → 127.0.0.1:18595 (https://jmd-learn.online/ninja-race/).
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/ninja-race-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/ninja-race/build ~/ninja-race/datos'
scp -i "$LLAVE" /tmp/ninja-race-linux $H:ninja-race/build/ninja
scp -i "$LLAVE" Dockerfile $H:ninja-race/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/ninja-race/build && chmod 755 ninja && sudo chown 65534:65534 ~/ninja-race/datos && sudo docker build -q -t ninja-race:1 . &&
  sudo docker rm -f ninja-race >/dev/null 2>&1 || true
  sudo docker run -d --name ninja-race --restart unless-stopped --memory 64m --memory-swap 96m \
    --env-file /home/ubuntu/ninja-race/.env -v /home/ubuntu/ninja-race/datos:/datos \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:18595:18595 ninja-race:1 && sleep 1 && curl -fsS 127.0.0.1:18595/api/estado | head -c 200; echo'