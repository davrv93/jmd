#!/usr/bin/env bash
# Despliega los usuarios sintéticos del taller QA en jmd-learn.online/qa-bots/ (EC2 3.151.56.55).
# Se corre DESDE EL MAC:  LLAVE=~/Downloads/curdilmer.pem bash qa-tienda-sol/desplegar-bots.sh
# Sube el kit (~/Documents/qa-taller-kit) a ~/qa-taller-kit del servidor, levanta el contenedor qa-bots en el
# puerto 18640 con docker compose y registra el snippet de nginx si aún no existe.
set -euo pipefail
LLAVE="${LLAVE:-$HOME/Downloads/curdilmer.pem}"
SERVIDOR="ubuntu@3.151.56.55"
KIT="${KIT:-$HOME/Documents/qa-taller-kit}"

rsync -az --delete --exclude node_modules --exclude test-results --exclude playwright-report \
  --exclude resultados --exclude 'robot/historial' --exclude 'bots/fallos*' --exclude '.git' \
  -e "ssh -i $LLAVE" "$KIT/" "$SERVIDOR:~/qa-taller-kit/"

ssh -i "$LLAVE" "$SERVIDOR" bash -s <<'REMOTO'
set -euo pipefail
cd ~/qa-taller-kit/bots
# compose lee .env (sudo no conserva las variables del entorno).
printf 'PUERTO_BOTS=18640\nBASE_URL=https://jmd-learn.online/tienda-sol/\n' > .env
sudo docker compose up -d --build --remove-orphans 2>&1 | tail -3
if ! sudo test -e /etc/nginx/snippets/qa-bots.conf; then
  sudo tee /etc/nginx/snippets/qa-bots.conf >/dev/null <<'NGINX'
# Usuarios sintéticos del taller QA: 4 bots en vivo (SSE) y fallos con evidencia (puerto 18640).
location = /qa-bots { return 302 /qa-bots/; }
location ^~ /qa-bots/ {
    proxy_pass http://127.0.0.1:18640;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 1h;
    client_max_body_size 1m;
}
NGINX
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-qa-bots-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn')
assert p.is_file() and not p.is_symlink()
s = p.read_text()
marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'qa-bots.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/qa-bots.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 40); do curl -fsS -o /dev/null http://127.0.0.1:18640/api/estado && break; sleep 3; done
curl -s -o /dev/null -w 'qa-bots HTTPS: %{http_code}\n' https://jmd-learn.online/qa-bots/
sudo docker ps --filter name=qa-bots --format '{{.Names}} {{.Status}}'
REMOTO
