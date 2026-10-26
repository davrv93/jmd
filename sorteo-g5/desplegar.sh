#!/usr/bin/env bash
# Redespliega el contenedor sorteo-g5 en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/ruta/k.pem ./desplegar.sh
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
go test ./... && node verificar_test.mjs
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-g5-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-g5/build'
scp -i "$LLAVE" /tmp/sorteo-g5-linux $H:sorteo-g5/build/sorteo
scp -i "$LLAVE" Dockerfile $H:sorteo-g5/build/Dockerfile
scp -i "$LLAVE" sincronizar.py $H:sorteo-g5/sincronizar.py
ssh -i "$LLAVE" $H 'set -e; cd ~/sorteo-g5/build && chmod 755 sorteo && sudo docker build -q -t sorteo-g5:1 . &&
  sudo docker rm -f sorteo-g5 >/dev/null 2>&1 || true
  sudo docker run -d --name sorteo-g5 --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/sorteo-g5/.env -v /home/ubuntu/sorteo-g5/datos:/datos \
    -p 127.0.0.1:18550:18550 sorteo-g5:1 && sleep 1 && curl -fsS 127.0.0.1:18550/api/estado | head -c 200; echo'
