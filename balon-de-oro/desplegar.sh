#!/usr/bin/env bash
# Redespliega el contenedor balon-de-oro en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/ruta/k.pem ./desplegar.sh
# Espera /home/ubuntu/balon-de-oro/.env en el servidor con:
#   SORTEO_CLAVE=...            clave del admin (cabecera X-Clave)
#   SORTEO_DATOS=/datos         carpeta del estado (volumen)
#   CLAUDE_ADMIN_URL=http://host.docker.internal:18560   API del sorteo de Claude
#   CLAUDE_ADMIN_CLAVE=...      su SORTEO_CLAVE
#   BALON_PROB=250 BALON_TIROS=3 BALON_VACANTES=2         valores con los que nace el estado
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/balon-de-oro-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/balon-de-oro/build ~/balon-de-oro/datos'
scp -i "$LLAVE" /tmp/balon-de-oro-linux $H:balon-de-oro/build/balon
scp -i "$LLAVE" Dockerfile $H:balon-de-oro/build/Dockerfile
ssh -i "$LLAVE" $H 'set -e; cd ~/balon-de-oro/build && chmod 755 balon && sudo chown 65534:65534 ~/balon-de-oro/datos && sudo docker build -q -t balon-de-oro:1 . &&
  sudo docker rm -f balon-de-oro >/dev/null 2>&1 || true
  sudo docker run -d --name balon-de-oro --restart unless-stopped --memory 48m --memory-swap 64m \
    --env-file /home/ubuntu/balon-de-oro/.env -v /home/ubuntu/balon-de-oro/datos:/datos \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:18575:18570 balon-de-oro:1 && sleep 1 && curl -fsS 127.0.0.1:18575/api/estado | head -c 200; echo'
