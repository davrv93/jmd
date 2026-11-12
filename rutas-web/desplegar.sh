#!/usr/bin/env bash
# Publica las rutas profesionales en https://jmd-learn.online/rutas/ (EC2 3.151.56.55).
#   ~/Downloads/OpenMontage/.venv/bin/python armar.py && LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
rsync -az --delete -e "ssh -i $LLAVE" web/ $H:rutas-web/
scp -i "$LLAVE" nginx.conf $H:rutas-web.nginx.conf
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
sudo mkdir -p /var/www/rutas && sudo rsync -a --delete ~/rutas-web/ /var/www/rutas/
sudo install -m 644 ~/rutas-web.nginx.conf /etc/nginx/snippets/rutas-web.conf
if ! sudo grep -q "rutas-web.conf" /etc/nginx/sites-enabled/jmd-learn; then
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-rutas-$(date +%s)"
  sudo sed -i 's#^\(\s*\)include /etc/nginx/snippets/cursos-web.conf;#&\n\1include /etc/nginx/snippets/rutas-web.conf;#' /etc/nginx/sites-enabled/jmd-learn
  sudo grep -q "rutas-web.conf" /etc/nginx/sites-enabled/jmd-learn || { echo "no se pudo incluir el snippet"; exit 1; }
fi
sudo nginx -t 2>&1 | tail -1 && sudo systemctl reload nginx && echo "nginx recargado"
REMOTO
for p in "" desarrollo-de-software-con-ia/ datos-y-bi-con-ia/; do curl -s -o /dev/null -w "rutas/$p %{http_code}\n" "https://jmd-learn.online/rutas/$p"; done
