#!/usr/bin/env bash
# Despliega el contenedor inscripcion-cursos en el EC2 3.151.56.55 (no toca el estado).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Clave del panel: /home/ubuntu/inscripcion-cursos/.env (modo 600, INSCRIPCION_CLAVE=...). Si no existe, se genera y NO se imprime.
# nginx: /etc/nginx/snippets/inscripcion-cursos.conf → 127.0.0.1:18650 (https://jmd-learn.online/inscripcion-especial/), incluido en
# /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/inscripcion-cursos-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/inscripcion-cursos/build ~/inscripcion-cursos/datos'
scp -i "$LLAVE" /tmp/inscripcion-cursos-linux $H:inscripcion-cursos/build/inscripcion
scp -i "$LLAVE" Dockerfile nginx.conf $H:inscripcion-cursos/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/inscripcion-cursos/.env ]; then (umask 077; echo "INSCRIPCION_CLAVE=$(openssl rand -hex 16)" > ~/inscripcion-cursos/.env); echo "clave nueva guardada en ~/inscripcion-cursos/.env"; fi
cd ~/inscripcion-cursos/build && chmod 755 inscripcion && sudo chown 65534:65534 ~/inscripcion-cursos/datos
sudo docker build -q -t inscripcion-cursos:1 . >/dev/null
sudo docker rm -f inscripcion-cursos >/dev/null 2>&1 || true
sudo docker run -d --name inscripcion-cursos --restart unless-stopped --memory 48m --memory-swap 64m \
  --env-file /home/ubuntu/inscripcion-cursos/.env -v /home/ubuntu/inscripcion-cursos/datos:/datos \
  -p 127.0.0.1:18650:18650 inscripcion-cursos:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/inscripcion-cursos.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/inscripcion-cursos.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-inscripcion-cursos-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'inscripcion-cursos.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/inscripcion-cursos.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18650/api/cursos && break; sleep 1; done
curl -s -o /dev/null -w 'Inscripción HTTPS: %{http_code}\n' https://jmd-learn.online/inscripcion-especial/
sudo docker ps --filter name=inscripcion-cursos --format '{{.Names}} {{.Status}}'
REMOTO
