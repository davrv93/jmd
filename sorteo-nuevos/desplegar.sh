#!/usr/bin/env bash
# Despliega el contenedor sorteo-nuevos en el EC2 3.151.56.55 (no toca los participantes ya guardados).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Probabilidades y topes: config.json (va dentro del binario; edítalo y vuelve a correr este script).
# Cursos, precios y brochures: salen de ../brochures/salida y van dentro del binario. Para refrescarlos antes de desplegar:
#   cp ../brochures/salida/cursos.json . && cp ../brochures/salida/webp/*.webp web/brochures/
# Clave del panel: /home/ubuntu/sorteo-nuevos/.env (modo 600, GACHAPON_CLAVE=...). Si no existe, se genera y NO se imprime.
#   Para verla: ssh -i "$LLAVE" ubuntu@3.151.56.55 'cat ~/sorteo-nuevos/.env'   → panel en https://jmd-learn.online/sorteo-nuevos/admin
# nginx: /etc/nginx/snippets/sorteo-nuevos.conf → 127.0.0.1:18692 (https://jmd-learn.online/sorteo-nuevos/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./...   # sin go test: las pruebas son del gachapon original
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-nuevos-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-nuevos/build ~/sorteo-nuevos/datos'
scp -i "$LLAVE" /tmp/sorteo-nuevos-linux $H:sorteo-nuevos/build/sorteo-nuevos
scp -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-nuevos/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/sorteo-nuevos/.env ]; then (umask 077; echo "GACHAPON_CLAVE=$(openssl rand -hex 16)" > ~/sorteo-nuevos/.env); echo "clave nueva guardada en ~/sorteo-nuevos/.env"; fi
cd ~/sorteo-nuevos/build && chmod 755 sorteo-nuevos && sudo chown 65534:65534 ~/sorteo-nuevos/datos
sudo docker build -q -t sorteo-nuevos:1 . >/dev/null
sudo docker rm -f sorteo-nuevos >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-nuevos --restart unless-stopped --memory 48m --memory-swap 64m \
  --env-file /home/ubuntu/sorteo-nuevos/.env -v /home/ubuntu/sorteo-nuevos/datos:/datos \
  -p 127.0.0.1:18692:18692 sorteo-nuevos:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-nuevos.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-nuevos.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-sorteo-nuevos-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'sorteo-nuevos.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/sorteo-nuevos.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18692/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Gachapon HTTPS: %{http_code}\n' https://jmd-learn.online/sorteo-nuevos/
sudo docker ps --filter name=sorteo-nuevos --format '{{.Names}} {{.Status}}'
REMOTO
