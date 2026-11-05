#!/usr/bin/env bash
# Despliega el contenedor sorteo-seguridad en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Clave del panel: /home/ubuntu/sorteo-seguridad/.env (modo 600, SORTEO_CLAVE=...). Si no existe, se genera y NO se imprime.
# nginx: /etc/nginx/snippets/sorteo-seguridad.conf → 127.0.0.1:18645 (https://jmd-learn.online/sorteo-seguridad/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-seguridad-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-seguridad/build ~/sorteo-seguridad/datos'
scp -i "$LLAVE" /tmp/sorteo-seguridad-linux $H:sorteo-seguridad/build/sorteo
scp -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-seguridad/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/sorteo-seguridad/.env ]; then (umask 077; echo "SORTEO_CLAVE=$(openssl rand -hex 16)" > ~/sorteo-seguridad/.env); echo "clave nueva guardada en ~/sorteo-seguridad/.env"; fi
cd ~/sorteo-seguridad/build && chmod 755 sorteo && sudo chown 65534:65534 ~/sorteo-seguridad/datos
sudo docker build -q -t sorteo-seguridad:1 . >/dev/null
sudo docker rm -f sorteo-seguridad >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-seguridad --restart unless-stopped --memory 48m --memory-swap 64m \
  --env-file /home/ubuntu/sorteo-seguridad/.env -v /home/ubuntu/sorteo-seguridad/datos:/datos \
  -p 127.0.0.1:18645:18645 sorteo-seguridad:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-seguridad.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-seguridad.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-sorteo-seguridad-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'sorteo-seguridad.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/sorteo-seguridad.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18645/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Ruleta seguridad HTTPS: %{http_code}\n' https://jmd-learn.online/sorteo-seguridad/
sudo docker ps --filter name=sorteo-seguridad --format '{{.Names}} {{.Status}}'
REMOTO
