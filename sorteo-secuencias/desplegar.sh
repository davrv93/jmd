#!/usr/bin/env bash
# Redespliega el contenedor sorteo-secuencias en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Espera /home/ubuntu/sorteo-secuencias/.env (modo 600) con SORTEO_CLAVE=...
# nginx: /etc/nginx/snippets/sorteo-secuencias.conf → 127.0.0.1:18615 (https://jmd-learn.online/sorteo-secuencias/).
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-secuencias-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-secuencias/build ~/sorteo-secuencias/datos'
scp -i "$LLAVE" /tmp/sorteo-secuencias-linux $H:sorteo-secuencias/build/sorteo
scp -i "$LLAVE" Dockerfile $H:sorteo-secuencias/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/sorteo-secuencias/build && chmod 755 sorteo && sudo chown 65534:65534 ~/sorteo-secuencias/datos && sudo docker build -q -t sorteo-secuencias:1 . &&
  sudo docker rm -f sorteo-secuencias >/dev/null 2>&1 || true
  sudo docker run -d --name sorteo-secuencias --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/sorteo-secuencias/.env -v /home/ubuntu/sorteo-secuencias/datos:/datos \
    -p 127.0.0.1:18615:18615 sorteo-secuencias:1 && sleep 1 && curl -fsS 127.0.0.1:18615/api/estado | head -c 160; echo'
