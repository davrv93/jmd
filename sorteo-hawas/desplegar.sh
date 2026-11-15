#!/usr/bin/env bash
# Despliega el contenedor sorteo-hawas en el EC2 3.151.56.55 (no toca los participantes ya guardados).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Probabilidades y topes: config.json (va dentro del binario; edítalo y vuelve a correr este script).
# Cursos, precios y brochures: salen de ../brochures/salida y van dentro del binario. Para refrescarlos antes de desplegar:
#   cp ../brochures/salida/cursos.json . && cp ../brochures/salida/webp/*.webp web/brochures/
# Clave del panel: /home/ubuntu/sorteo-hawas/.env (modo 600, GACHAPON_CLAVE=...). Si no existe, se genera y NO se imprime.
#   Para verla: ssh -i "$LLAVE" ubuntu@3.151.56.55 'cat ~/sorteo-hawas/.env'   → panel en https://jmd-learn.online/sorteo-hawas/admin
# nginx: /etc/nginx/snippets/sorteo-hawas.conf → 127.0.0.1:18701 (https://jmd-learn.online/sorteo-hawas/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./...   # sin go test: las pruebas son del gachapon original
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-hawas-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-hawas/build ~/sorteo-hawas/datos'
scp -i "$LLAVE" /tmp/sorteo-hawas-linux $H:sorteo-hawas/build/sorteo-hawas
scp -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-hawas/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/sorteo-hawas/.env ]; then (umask 077; echo "GACHAPON_CLAVE=$(openssl rand -hex 16)" > ~/sorteo-hawas/.env); echo "clave nueva guardada en ~/sorteo-hawas/.env"; fi
cd ~/sorteo-hawas/build && chmod 755 sorteo-hawas && sudo chown 65534:65534 ~/sorteo-hawas/datos
sudo docker build -q -t sorteo-hawas:1 . >/dev/null
sudo docker rm -f sorteo-hawas >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-hawas --restart unless-stopped --memory 48m --memory-swap 64m \
  --env-file /home/ubuntu/sorteo-hawas/.env -v /home/ubuntu/sorteo-hawas/datos:/datos \
  -p 127.0.0.1:18701:18701 sorteo-hawas:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-hawas.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-hawas.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-sorteo-hawas-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'sorteo-hawas.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/sorteo-hawas.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18701/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Gachapon HTTPS: %{http_code}\n' https://jmd-learn.online/sorteo-hawas/
sudo docker ps --filter name=sorteo-hawas --format '{{.Names}} {{.Status}}'
REMOTO
