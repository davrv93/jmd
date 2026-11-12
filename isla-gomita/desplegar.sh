#!/usr/bin/env bash
# Despliega Isla Gomita pública en el EC2 3.151.56.55 (sala en memoria: redesplegar vacía la sala).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Clave del instructor: /home/ubuntu/isla-gomita/.env (modo 600, GOMITA_CLAVE=...). Si no existe, se genera y NO se imprime.
#   Modo instructor: abrir una vez https://jmd-learn.online/isla-gomita/admin?k=<clave> (deja cookie de staff).
# nginx: /etc/nginx/snippets/isla-gomita.conf → 127.0.0.1:18693, incluido en /etc/nginx/sites-enabled/jmd-learn
# antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/isla-gomita-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/isla-gomita/build'
scp -i "$LLAVE" /tmp/isla-gomita-linux $H:isla-gomita/build/isla-gomita
scp -i "$LLAVE" Dockerfile nginx.conf $H:isla-gomita/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/isla-gomita/.env ]; then (umask 077; echo "GOMITA_CLAVE=$(openssl rand -hex 16)" > ~/isla-gomita/.env); echo "clave nueva guardada en ~/isla-gomita/.env"; fi
if ! sudo docker ps -a --format '{{.Names}}' | grep -qx isla-gomita && sudo ss -ltn | grep -q ':18693 '; then echo "puerto 18693 ocupado"; exit 1; fi
cd ~/isla-gomita/build && chmod 755 isla-gomita
sudo docker build -q -t isla-gomita:1 . >/dev/null
sudo docker rm -f isla-gomita >/dev/null 2>&1 || true
sudo docker run -d --name isla-gomita --restart unless-stopped --memory 32m --memory-swap 48m \
  --env-file /home/ubuntu/isla-gomita/.env -p 127.0.0.1:18693:18693 isla-gomita:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/isla-gomita.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/isla-gomita.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-isla-gomita-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'isla-gomita.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/isla-gomita.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18693/api/carrera && break; sleep 1; done
curl -s -o /dev/null -w 'Isla Gomita HTTPS: %{http_code}\n' https://jmd-learn.online/isla-gomita/
sudo docker ps --filter name=isla-gomita --format '{{.Names}} {{.Status}}'
REMOTO
