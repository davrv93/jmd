#!/usr/bin/env bash
# Publica las páginas de cursos en https://jmd-learn.online/cursos/ (EC2 3.151.56.55).
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
rsync -az --delete -e "ssh -i $LLAVE" web/ $H:cursos-web/
scp -i "$LLAVE" nginx.conf $H:cursos-web.nginx.conf
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
sudo mkdir -p /var/www/cursos && sudo rsync -a --delete ~/cursos-web/ /var/www/cursos/
sudo install -m 644 ~/cursos-web.nginx.conf /etc/nginx/snippets/cursos-web.conf
if ! sudo grep -q "cursos-web.conf" /etc/nginx/sites-enabled/jmd-learn; then
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-cursos-$(date +%s)"
  sudo sed -i 's#^\(\s*\)include snippets/gq-gratis.conf;#&\n\1include /etc/nginx/snippets/cursos-web.conf;#' /etc/nginx/sites-enabled/jmd-learn
fi
sudo nginx -t && sudo systemctl reload nginx && echo "nginx recargado"
REMOTO
