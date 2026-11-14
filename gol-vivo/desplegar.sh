#!/usr/bin/env bash
# Despliega el contenedor gol-vivo en el EC2 3.151.56.55 (no toca el ranking).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# nginx: /etc/nginx/snippets/gol-vivo.conf → 127.0.0.1:18655 (https://jmd-learn.online/gol-vivo/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/gol-vivo-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/gol-vivo/build ~/gol-vivo/datos'
scp -i "$LLAVE" /tmp/gol-vivo-linux $H:gol-vivo/build/gol
scp -i "$LLAVE" Dockerfile nginx.conf $H:gol-vivo/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
cd ~/gol-vivo/build && chmod 755 gol && sudo chown 65534:65534 ~/gol-vivo/datos
sudo docker build -q -t gol-vivo:1 . >/dev/null
sudo docker rm -f gol-vivo >/dev/null 2>&1 || true
sudo docker run -d --name gol-vivo --restart unless-stopped --memory 64m --memory-swap 96m \
  -v /home/ubuntu/gol-vivo/datos:/datos -p 127.0.0.1:18655:18655 gol-vivo:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/gol-vivo.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/gol-vivo.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-gol-vivo-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'gol-vivo.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/gol-vivo.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18655/api/ranking && break; sleep 1; done
curl -s -o /dev/null -w 'Gol en vivo HTTPS: %{http_code}\n' https://jmd-learn.online/gol-vivo/
sudo docker ps --filter name=gol-vivo --format '{{.Names}} {{.Status}}'
REMOTO
