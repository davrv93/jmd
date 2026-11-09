#!/usr/bin/env bash
# Publica la página estática de inscripción de Ready Set Go! en https://jmd-learn.online/readysetgo/
#   LLAVE=~/Downloads/curdilmer.pem ~/Documents/jmd/ready-set-go-web/desplegar.sh
# Copia web/ a /var/www/readysetgo/ y, la primera vez, instala el snippet de nginx junto al de kookaburra
# (respaldo del sitio en /tmp, nginx -t antes de recargar).
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
ssh -i "$LLAVE" $H 'rm -rf ~/readysetgo-web && mkdir -p ~/readysetgo-web'
scp -q -i "$LLAVE" -r web nginx.conf $H:readysetgo-web/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
sudo mkdir -p /var/www/readysetgo
sudo rsync -a --delete ~/readysetgo-web/web/ /var/www/readysetgo/
sudo chown -R root:root /var/www/readysetgo && sudo chmod -R a+rX /var/www/readysetgo
if ! sudo test -e /etc/nginx/snippets/readysetgo.conf; then
  sudo install -m 644 ~/readysetgo-web/nginx.conf /etc/nginx/snippets/readysetgo.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-readysetgo-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/kookaburra.conf;'
assert marca in s and 'readysetgo.conf' not in s
p.write_text(s.replace(marca, marca + '\n    include /etc/nginx/snippets/readysetgo.conf;', 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
curl -s -o /dev/null -w 'readysetgo HTTPS: %{http_code}\n' https://jmd-learn.online/readysetgo/
REMOTO
