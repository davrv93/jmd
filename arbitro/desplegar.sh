#!/usr/bin/env bash
# Redespliega el contenedor arbitro en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Espera /home/ubuntu/arbitro/.env (modo 600) en el servidor con:
#   SORTEO_CLAVE=...            clave del admin (cabecera X-Clave)
#   SORTEO_DATOS=/datos         carpeta del estado (volumen)
#   CLAUDE_ADMIN_URL=http://host.docker.internal:18560   API del sorteo de Claude
#   CLAUDE_ADMIN_CLAVE=...      su SORTEO_CLAVE
#   ARBITRO_PROB=250 ARBITRO_JUGADAS=3 ARBITRO_PROB_TIRO_LIBRE=2 ARBITRO_CUPOS_50=0   valores con los que nace el estado
# nginx: /etc/nginx/snippets/arbitro.conf → 127.0.0.1:18580 (https://jmd-learn.online/arbitro/).
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/arbitro-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/arbitro/build ~/arbitro/datos'
scp -i "$LLAVE" /tmp/arbitro-linux $H:arbitro/build/arbitro
scp -i "$LLAVE" Dockerfile $H:arbitro/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/arbitro/build && chmod 755 arbitro && sudo chown 65534:65534 ~/arbitro/datos && sudo docker build -q -t arbitro:1 . &&
  sudo docker rm -f arbitro >/dev/null 2>&1 || true
  sudo docker run -d --name arbitro --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/arbitro/.env -v /home/ubuntu/arbitro/datos:/datos \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:18580:18580 arbitro:1 && sleep 1 && curl -fsS 127.0.0.1:18580/api/estado | head -c 200; echo'
