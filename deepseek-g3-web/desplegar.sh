#!/usr/bin/env bash
# Publica la creación de cuenta de DeepSeek Harness G3 en https://jmd-learn.online/deepseek-g3/ (EC2 3.151.56.55).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
rsync -az --delete -e "ssh -i $LLAVE" web/ $H:deepseek-g3-web/
scp -i "$LLAVE" nginx.conf $H:deepseek-g3-web.nginx.conf
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
sudo mkdir -p /var/www/deepseek-g3 && sudo rsync -a --delete ~/deepseek-g3-web/ /var/www/deepseek-g3/
sudo install -m 644 ~/deepseek-g3-web.nginx.conf /etc/nginx/snippets/deepseek-g3-web.conf
if ! sudo grep -q "deepseek-g3-web.conf" /etc/nginx/sites-enabled/jmd-learn; then
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-deepseek-g3-$(date +%s)"
  sudo sed -i 's#^\(\s*\)include snippets/gq-gratis.conf;#&\n\1include /etc/nginx/snippets/deepseek-g3-web.conf;#' /etc/nginx/sites-enabled/jmd-learn
fi
sudo nginx -t && sudo systemctl reload nginx && echo "nginx recargado"
REMOTO
