#!/usr/bin/env bash
# Despliega el contenedor sorteo-piramide en el EC2 3.151.56.55 (no toca los participantes ya guardados).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Probabilidades y topes: config.json (va dentro del binario; edítalo y vuelve a correr este script).
# Clave del panel: /home/ubuntu/sorteo-piramide/.env (modo 600, PIRAMIDE_CLAVE=...). Si no existe, se genera y NO se imprime.
#   Para verla: ssh -i "$LLAVE" ubuntu@3.151.56.55 'cat ~/sorteo-piramide/.env'   → panel en https://jmd-learn.online/piramide/admin
# nginx: /etc/nginx/snippets/sorteo-piramide.conf → 127.0.0.1:18680 (https://jmd-learn.online/piramide/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-piramide-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-piramide/build ~/sorteo-piramide/datos'
scp -i "$LLAVE" /tmp/sorteo-piramide-linux $H:sorteo-piramide/build/sorteo-piramide
scp -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-piramide/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/sorteo-piramide/.env ]; then (umask 077; echo "PIRAMIDE_CLAVE=$(openssl rand -hex 16)" > ~/sorteo-piramide/.env); echo "clave nueva guardada en ~/sorteo-piramide/.env"; fi
cd ~/sorteo-piramide/build && chmod 755 sorteo-piramide && sudo chown 65534:65534 ~/sorteo-piramide/datos
sudo docker build -q -t sorteo-piramide:1 . >/dev/null
sudo docker rm -f sorteo-piramide >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-piramide --restart unless-stopped --memory 64m --memory-swap 96m \
  --env-file /home/ubuntu/sorteo-piramide/.env -v /home/ubuntu/sorteo-piramide/datos:/datos \
  -p 127.0.0.1:18680:18680 sorteo-piramide:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-piramide.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-piramide.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-piramide-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'sorteo-piramide.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/sorteo-piramide.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18680/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Pirámide HTTPS: %{http_code}\n' https://jmd-learn.online/piramide/
sudo docker ps --filter name=sorteo-piramide --format '{{.Names}} {{.Status}}'
REMOTO
