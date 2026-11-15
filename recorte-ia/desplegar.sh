#!/usr/bin/env bash
# Despliega recorte-ia (IS-Net + onnxruntime) en el EC2 3.151.56.55: https://jmd-learn.online/recorte/ → 127.0.0.1:18710.
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
ssh -i "$LLAVE" $H 'mkdir -p ~/recorte-ia'
scp -i "$LLAVE" Dockerfile app.py nginx.conf $H:recorte-ia/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
cd ~/recorte-ia
sudo docker build -q -t recorte-ia:1 . >/dev/null
sudo docker rm -f recorte-ia >/dev/null 2>&1 || true
sudo docker run -d --name recorte-ia --restart unless-stopped --memory 2000m --memory-swap 2300m --cpus 1.6 \
  -p 127.0.0.1:18710:8000 recorte-ia:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/recorte-ia.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/recorte-ia.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-recorte-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'recorte-ia.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/recorte-ia.conf;\n' + marca, 1))
PY
  sudo nginx -t 2>&1 | tail -1 && sudo systemctl reload nginx
fi
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:18710/salud && break; sleep 1; done
curl -s -o /dev/null -w 'recorte HTTPS: %{http_code}\n' https://jmd-learn.online/recorte/salud
sudo docker ps --filter name=recorte-ia --format '{{.Names}} {{.Status}}'
REMOTO
