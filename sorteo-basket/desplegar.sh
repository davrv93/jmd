#!/usr/bin/env bash
# Despliega el sorteo basket (en vivo, WebSocket) del taller «Orquestación con Qwen Coder» en el EC2 3.151.56.55 (no toca el estado ni la clave).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Público: https://jmd-learn.online/sorteo-basket/   Panel: https://jmd-learn.online/sorteo-basket/admin?k=<clave>
# Clave: /home/ubuntu/sorteo-basket/.env (modo 600, SORTEO_CLAVE=...). Si no existe, se genera y NO se imprime.
# Datos: /home/ubuntu/sorteo-basket/datos/estado.json (volumen /datos, dueño 65534): redesplegar no borra nada.
# nginx: /etc/nginx/snippets/sorteo-basket.conf → 127.0.0.1:18740, incluido en /etc/nginx/sites-enabled/jmd-learn
# después de sorteo-videos.conf (con cabeceras de WebSocket y proxy_read_timeout largo), con copia previa del sitio en /tmp y nginx -t antes de recargar (si falla, se restaura).
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/sorteo-basket-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/sorteo-basket/build ~/sorteo-basket/datos'
scp -q -i "$LLAVE" /tmp/sorteo-basket-linux $H:sorteo-basket/build/sorteo-basket
scp -q -i "$LLAVE" Dockerfile nginx.conf $H:sorteo-basket/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
cd ~/sorteo-basket
if [ ! -f .env ]; then
  (umask 077; printf 'SORTEO_CLAVE=%s\nSORTEO_DATOS=/datos\nPORT=18740\n' "$(openssl rand -hex 16)" > .env)
  echo "clave nueva guardada en ~/sorteo-basket/.env"
fi
chmod 600 .env
if ! sudo docker ps -a --format '{{.Names}}' | grep -qx sorteo-basket && sudo ss -ltn | grep -q ':18740 '; then echo "puerto 18740 ocupado"; exit 1; fi
sudo chown 65534:65534 datos && sudo chmod 700 datos
cd build && chmod 755 sorteo-basket
sudo docker build -q -t sorteo-basket:1 . >/dev/null
sudo docker rm -f sorteo-basket >/dev/null 2>&1 || true
sudo docker run -d --name sorteo-basket --restart unless-stopped --memory 64m --memory-swap 96m --read-only --cap-drop ALL \
  --security-opt no-new-privileges --env-file /home/ubuntu/sorteo-basket/.env -v /home/ubuntu/sorteo-basket/datos:/datos \
  -p 127.0.0.1:18740:18740 sorteo-basket:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/sorteo-basket.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-basket.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-sorteo-basket-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/sorteo-videos.conf;'
assert s.count(marca) == 1 and 'sorteo-basket.conf' not in s
p.write_text(s.replace(marca, marca + '\n    include /etc/nginx/snippets/sorteo-basket.conf;', 1))
PY
  if ! sudo nginx -t 2>/dev/null; then
    sudo cp -p "$(ls -t /tmp/jmd-learn.antes-sorteo-basket-* | head -1)" /etc/nginx/sites-enabled/jmd-learn
    sudo rm -f /etc/nginx/snippets/sorteo-basket.conf; echo "nginx -t falló: se restauró el sitio"; exit 1
  fi
  sudo systemctl reload nginx
else
  sudo install -m 644 nginx.conf /etc/nginx/snippets/sorteo-basket.conf && sudo nginx -t 2>/dev/null && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18740/api/salud && break; sleep 1; done
curl -s -o /dev/null -w 'Sorteo basket HTTPS: %{http_code}\n' https://jmd-learn.online/sorteo-basket/
curl -s -o /dev/null -m 3 -w 'WebSocket (101 = bien): %{http_code}\n' -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Origin: https://jmd-learn.online' \
  https://jmd-learn.online/sorteo-basket/ws || true
sudo docker ps --filter name=sorteo-basket --format '{{.Names}} {{.Status}}'
REMOTO
