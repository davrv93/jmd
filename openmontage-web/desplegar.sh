#!/usr/bin/env bash
# Publica la página del curso OpenMontage en https://jmd-learn.online/openmontage/ (EC2 3.151.56.55).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
rsync -az --delete -e "ssh -i $LLAVE" web/ $H:openmontage-web/
scp -i "$LLAVE" nginx.conf $H:openmontage-web.nginx.conf
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
sudo mkdir -p /var/www/openmontage && sudo rsync -a --delete ~/openmontage-web/ /var/www/openmontage/
sudo install -m 644 ~/openmontage-web.nginx.conf /etc/nginx/snippets/openmontage-web.conf
if ! sudo grep -q "openmontage-web.conf" /etc/nginx/sites-enabled/jmd-learn; then
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-openmontage-$(date +%s)"
  sudo sed -i 's#^\(\s*\)include snippets/gq-gratis.conf;#&\n\1include /etc/nginx/snippets/openmontage-web.conf;#' /etc/nginx/sites-enabled/jmd-learn
fi
sudo nginx -t && sudo systemctl reload nginx && echo "nginx recargado"
REMOTO
