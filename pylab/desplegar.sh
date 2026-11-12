#!/usr/bin/env bash
# Publica el Laboratorio Python en https://jmd-learn.online/pylab/ (EC2 3.151.56.55). Son solo archivos: sin contenedor.
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Pyodide (13 MB) va en web/pyodide; se copió de node_modules/pyodide (npm i) y está en git para no depender de npm al desplegar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
rsync -az --delete -e "ssh -i $LLAVE" web/ $H:pylab-web/
scp -q -i "$LLAVE" nginx.conf $H:pylab.nginx.conf
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
sudo mkdir -p /var/www/pylab && sudo rsync -a --delete ~/pylab-web/ /var/www/pylab/
sudo install -m 644 ~/pylab.nginx.conf /etc/nginx/snippets/pylab.conf
if ! sudo grep -q "snippets/pylab.conf" /etc/nginx/sites-enabled/jmd-learn; then
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-pylab-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'pylab.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/pylab.conf;\n' + marca, 1))
PY
fi
if sudo nginx -t 2>/dev/null; then sudo systemctl reload nginx && echo "nginx recargado"; else sudo nginx -t; echo "nginx NO se recargó: revisa pylab.conf"; exit 1; fi
REMOTO
for f in "" worker.js ejercicios/py-01.json pyodide/pyodide.asm.wasm; do curl -s -o /dev/null -H "Accept-Encoding: gzip" -w "pylab/$f %{http_code} %{content_type} %{size_download} bytes\n" "https://jmd-learn.online/pylab/$f"; done
