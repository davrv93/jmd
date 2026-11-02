#!/usr/bin/env bash
# Despliega el contenedor sorteo-cursos en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Clave del panel: /home/ubuntu/sorteo-cursos/.env (modo 600, SORTEO_CLAVE=...). Si no existe, se genera y NO se imprime.
# nginx: /etc/nginx/snippets/sorteo-cursos.conf → 127.0.0.1:18638 (https://jmd-learn.online/ruleta-cursos/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-cursos-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-cursos/build ~/sorteo-cursos/datos'
scp -i "$LLAVE" /tmp/sorteo-cursos-linux $H:sorteo-cursos/build/sorteo
scp -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-cursos/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/sorteo-cursos/.env ]; then (umask 077; echo "SORTEO_CLAVE=$(openssl rand -hex 16)" > ~/sorteo-cursos/.env); echo "clave nueva guardada en ~/sorteo-cursos/.env"; fi
cd ~/sorteo-cursos/build && chmod 755 sorteo && sudo chown 65534:65534 ~/sorteo-cursos/datos
sudo docker build -q -t sorteo-cursos:1 . >/dev/null
sudo docker rm -f sorteo-cursos >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-cursos --restart unless-stopped --memory 48m --memory-swap 64m \
  --env-file /home/ubuntu/sorteo-cursos/.env -v /home/ubuntu/sorteo-cursos/datos:/datos \
  -p 127.0.0.1:18638:18638 sorteo-cursos:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-cursos.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-cursos.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-sorteo-cursos-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'sorteo-cursos.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/sorteo-cursos.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18638/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Ruleta Cursos HTTPS: %{http_code}\n' https://jmd-learn.online/ruleta-cursos/
sudo docker ps --filter name=sorteo-cursos --format '{{.Names}} {{.Status}}'
REMOTO
