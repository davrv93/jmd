#!/usr/bin/env bash
# Despliega el robot de pruebas del taller en jmd-learn.online/qa-robot/ (EC2 3.151.56.55).
# Se corre DESDE EL MAC:  LLAVE=~/Downloads/curdilmer.pem bash qa-tienda-sol/desplegar-robot.sh
# Sube el kit (~/Documents/qa-taller-kit) a ~/qa-taller-kit del servidor, levanta Lightpanda + robot
# en el puerto 18625 con docker compose y registra el snippet de nginx si aún no existe.
set -euo pipefail
LLAVE="${LLAVE:-$HOME/Downloads/curdilmer.pem}"
SERVIDOR="ubuntu@3.151.56.55"
KIT="${KIT:-$HOME/Documents/qa-taller-kit}"

rsync -az --delete --exclude node_modules --exclude test-results --exclude playwright-report \
  --exclude resultados --exclude 'robot/historial' --exclude '.git' \
  -e "ssh -i $LLAVE" "$KIT/" "$SERVIDOR:~/qa-taller-kit/"

ssh -i "$LLAVE" "$SERVIDOR" bash -s <<'REMOTO'
set -euo pipefail
cd ~/qa-taller-kit/robot
# compose lee .env (sudo no conserva las variables del entorno).
printf 'PUERTO_ROBOT=18625\nBASE_URL=https://jmd-learn.online/tienda-sol/\nCADA_MIN=10\n' > .env
sudo docker rm -f qa-robot qa-robot-lightpanda >/dev/null 2>&1 || true   # versiones previas (Lightpanda) que ocupaban el puerto
sudo docker compose up -d --build --remove-orphans 2>&1 | tail -3
if ! sudo test -e /etc/nginx/snippets/qa-robot.conf; then
  sudo tee /etc/nginx/snippets/qa-robot.conf >/dev/null <<'NGINX'
# Robot de pruebas del taller QA: página de estado + reporte HTML (puerto 18625).
location = /qa-robot { return 302 /qa-robot/; }
location ^~ /qa-robot/ {
    proxy_pass http://127.0.0.1:18625;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
}
NGINX
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-qa-robot-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn')
assert p.is_file() and not p.is_symlink()
s = p.read_text()
marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'qa-robot.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/qa-robot.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:18625/ && break; sleep 2; done
curl -s -o /dev/null -w 'qa-robot HTTPS: %{http_code}\n' https://jmd-learn.online/qa-robot/
sudo docker ps --filter name=qa-robot --format '{{.Names}} {{.Status}}'
REMOTO
