#!/usr/bin/env bash
# Despliega QA Arena en el EC2 3.151.56.55 (https://jmd-learn.online/qa-arena/, puerto 18630). No borra el estado.
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Sin clave: el instructor se reconoce por su sesión del LMS (rol instructor/admin). ARENA_LMS apunta al LMS.
# nginx: copia nginx.conf a /etc/nginx/snippets/qa-arena.conf y lo incluye en sites-enabled/jmd-learn si aún no está.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/qa-arena-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/qa-arena/build'
scp -i "$LLAVE" /tmp/qa-arena-linux $H:qa-arena/build/arena
scp -i "$LLAVE" Dockerfile nginx.conf $H:qa-arena/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
cd ~/qa-arena/build && chmod 755 arena
sudo docker build -q -t qa-arena:1 . >/dev/null
sudo docker volume create qa-arena-datos >/dev/null
sudo docker rm -f qa-arena >/dev/null 2>&1 || true
sudo docker run -d --name qa-arena --restart unless-stopped --memory=128m --memory-swap=160m --pids-limit=64 \
  --read-only --security-opt=no-new-privileges --cap-drop=ALL \
  -e ARENA_LMS=https://jmd-learn.online -v qa-arena-datos:/data -p 127.0.0.1:18630:18630 qa-arena:1 >/dev/null
sudo chown 65534:65534 "$(sudo docker volume inspect qa-arena-datos -f '{{.Mountpoint}}')"
if ! sudo test -e /etc/nginx/snippets/qa-arena.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/qa-arena.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-qa-arena-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'qa-arena.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/qa-arena.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18630/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'QA Arena HTTPS: %{http_code}\n' https://jmd-learn.online/qa-arena/
sudo docker ps --filter name=qa-arena --format '{{.Names}} {{.Status}}'
REMOTO
