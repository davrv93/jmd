#!/usr/bin/env bash
# Despliega el contenedor gachapon en el EC2 3.151.56.55 (no toca los participantes ya guardados).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Probabilidades y topes: config.json (va dentro del binario; edítalo y vuelve a correr este script).
# Cursos, precios y brochures: salen de ../brochures/salida y van dentro del binario. Para refrescarlos antes de desplegar:
#   cp ../brochures/salida/cursos.json . && cp ../brochures/salida/webp/*.webp web/brochures/
# Clave del panel: /home/ubuntu/gachapon/.env (modo 600, GACHAPON_CLAVE=...). Si no existe, se genera y NO se imprime.
#   Para verla: ssh -i "$LLAVE" ubuntu@3.151.56.55 'cat ~/gachapon/.env'   → panel en https://jmd-learn.online/gachapon/admin
# nginx: /etc/nginx/snippets/gachapon.conf → 127.0.0.1:18660 (https://jmd-learn.online/gachapon/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/gachapon-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/gachapon/build ~/gachapon/datos'
scp -i "$LLAVE" /tmp/gachapon-linux $H:gachapon/build/gachapon
scp -i "$LLAVE" Dockerfile nginx.conf $H:gachapon/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/gachapon/.env ]; then (umask 077; echo "GACHAPON_CLAVE=$(openssl rand -hex 16)" > ~/gachapon/.env); echo "clave nueva guardada en ~/gachapon/.env"; fi
cd ~/gachapon/build && chmod 755 gachapon && sudo chown 65534:65534 ~/gachapon/datos
sudo docker build -q -t gachapon:1 . >/dev/null
sudo docker rm -f gachapon >/dev/null 2>&1 || true
sudo docker run -d --name gachapon --restart unless-stopped --memory 48m --memory-swap 64m \
  --env-file /home/ubuntu/gachapon/.env -v /home/ubuntu/gachapon/datos:/datos \
  -p 127.0.0.1:18660:18660 gachapon:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/gachapon.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/gachapon.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-gachapon-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'gachapon.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/gachapon.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18660/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Gachapon HTTPS: %{http_code}\n' https://jmd-learn.online/gachapon/
sudo docker ps --filter name=gachapon --format '{{.Names}} {{.Status}}'
REMOTO
