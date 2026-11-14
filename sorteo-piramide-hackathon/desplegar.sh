#!/usr/bin/env bash
# Despliega el contenedor sorteo-piramide-hk (pirámide de la Hackathon Ready Set Go!) en el EC2 3.151.56.55.
# No toca los participantes ya guardados ni el sorteo original (sorteo-piramide, /piramide/, puerto 18680).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Probabilidades y topes: config.json (va dentro del binario; edítalo y vuelve a correr este script).
# Clave del panel: /home/ubuntu/sorteo-piramide-hk/.env (modo 600, PIRAMIDE_CLAVE=...), propia de este sorteo.
# Si no existe, se genera y NO se imprime.
#   Para verla: ssh -i "$LLAVE" ubuntu@3.151.56.55 'cat ~/sorteo-piramide-hk/.env'
#   → panel en https://jmd-learn.online/piramide-hackathon/admin
# nginx: /etc/nginx/snippets/sorteo-piramide-hk.conf → 127.0.0.1:18695 (https://jmd-learn.online/piramide-hackathon/),
# incluido en /etc/nginx/sites-enabled/jmd-learn (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-piramide-hk-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-piramide-hk/build ~/sorteo-piramide-hk/datos'
scp -i "$LLAVE" /tmp/sorteo-piramide-hk-linux $H:sorteo-piramide-hk/build/sorteo-piramide-hk
scp -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-piramide-hk/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if [ ! -f ~/sorteo-piramide-hk/.env ]; then (umask 077; echo "PIRAMIDE_CLAVE=$(openssl rand -hex 16)" > ~/sorteo-piramide-hk/.env); echo "clave nueva guardada en ~/sorteo-piramide-hk/.env"; fi
cd ~/sorteo-piramide-hk/build && chmod 755 sorteo-piramide-hk && sudo chown 65534:65534 ~/sorteo-piramide-hk/datos
sudo docker build -q -t sorteo-piramide-hk:1 . >/dev/null
sudo docker rm -f sorteo-piramide-hk >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-piramide-hk --restart unless-stopped --memory 64m --memory-swap 96m \
  --env-file /home/ubuntu/sorteo-piramide-hk/.env -v /home/ubuntu/sorteo-piramide-hk/datos:/datos \
  -p 127.0.0.1:18695:18695 sorteo-piramide-hk:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-piramide-hk.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-piramide-hk.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-piramide-hk-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'sorteo-piramide-hk.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/sorteo-piramide-hk.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18695/api/estado && break; sleep 1; done
curl -s -o /dev/null -w 'Pirámide de la hackathon HTTPS: %{http_code}\n' https://jmd-learn.online/piramide-hackathon/
curl -s -o /dev/null -w 'Pirámide original HTTPS: %{http_code}\n' https://jmd-learn.online/piramide/
sudo docker ps --filter name=sorteo-piramide --format '{{.Names}} {{.Status}}'
REMOTO
