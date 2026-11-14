#!/usr/bin/env bash
# Despliega el contenedor sorteo-selva en el EC2 3.151.56.55 (no toca los participantes ya guardados).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Probabilidades y topes: config.json (va dentro del binario; edítalo y vuelve a correr este script).
# Clave del panel: /home/ubuntu/sorteo-selva/.env (modo 600, SELVA_CLAVE=...). Si no existe, se genera y NO se imprime.
#   Para verla: ssh -i "$LLAVE" ubuntu@3.151.56.55 'cat ~/sorteo-selva/.env'   → panel en https://jmd-learn.online/selva/admin
# nginx: /etc/nginx/snippets/sorteo-selva.conf → 127.0.0.1:18675 (https://jmd-learn.online/selva/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-selva-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-selva/build ~/sorteo-selva/datos'
scp -i "$LLAVE" /tmp/sorteo-selva-linux $H:sorteo-selva/build/sorteo-selva
scp -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-selva/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/sorteo-selva/.env ]; then (umask 077; echo "SELVA_CLAVE=$(openssl rand -hex 16)" > ~/sorteo-selva/.env); echo "clave nueva guardada en ~/sorteo-selva/.env"; fi
cd ~/sorteo-selva/build && chmod 755 sorteo-selva && sudo chown 65534:65534 ~/sorteo-selva/datos
sudo docker build -q -t sorteo-selva:1 . >/dev/null
sudo docker rm -f sorteo-selva >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-selva --restart unless-stopped --memory 64m --memory-swap 96m \
  --env-file /home/ubuntu/sorteo-selva/.env -v /home/ubuntu/sorteo-selva/datos:/datos \
  -p 127.0.0.1:18675:18675 sorteo-selva:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-selva.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-selva.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-selva-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'sorteo-selva.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/sorteo-selva.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18675/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Selva HTTPS: %{http_code}\n' https://jmd-learn.online/selva/
sudo docker ps --filter name=sorteo-selva --format '{{.Names}} {{.Status}}'
REMOTO
