#!/usr/bin/env bash
# Despliega Forja (estudio de personajes) en el EC2 3.151.56.55 → https://jmd-learn.online/forja/
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Compila las reglas, corre las pruebas, sube el código y el modelo de embeddings (129 MB, solo la primera vez),
# construye la imagen en el servidor y levanta el contenedor «forja» en 127.0.0.1:18697 con tope de 1000 MB
# (el modelo de embeddings ocupa unos 600 MB mientras está cargado; con 512 MB el contenedor moría por falta de memoria).
# En reposo usa unos 60 MB: el modelo vive en un proceso hijo que se crea al necesitarlo y se mata a los 10 min sin uso.
# El modelo se sube desde ./modelos (lo descarga la Mac una sola vez con: FORJA_DESCARGAR=1 node servidor.mjs).
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
node reglas/compilar.mjs | tail -1
node --test >/dev/null && echo "pruebas OK"
test -d modelos/Xenova/multilingual-e5-small || { echo "falta ./modelos: corre una vez FORJA_DESCARGAR=1 node servidor.mjs"; exit 1; }
ssh -i "$LLAVE" $H 'mkdir -p ~/forja/src ~/forja/modelos ~/forja/datos'
rsync -az --delete --exclude /node_modules --exclude /modelos --exclude /datos --exclude .git -e "ssh -i $LLAVE" ./ $H:forja/src/
rsync -az -e "ssh -i $LLAVE" modelos/ $H:forja/modelos/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
if ! sudo docker ps -a --format '{{.Names}}' | grep -qx forja && sudo ss -ltn | grep -q ':18697 '; then echo "puerto 18697 ocupado"; exit 1; fi
# clave del instructor para borrar publicaciones de la galería: se genera una vez y NO se imprime (está en ~/forja/.env)
if [ ! -f ~/forja/.env ]; then (umask 077; echo "FORJA_CLAVE=$(openssl rand -hex 16)" > ~/forja/.env); fi
sudo chown 65534:65534 ~/forja/datos
cd ~/forja/src
sudo docker build -q -t forja:1 . >/dev/null
sudo docker rm -f forja >/dev/null 2>&1 || true
sudo docker run -d --name forja --restart unless-stopped --memory 1000m --memory-swap 1000m --cpus 1 \
  --env-file /home/ubuntu/forja/.env -v /home/ubuntu/forja/modelos:/app/modelos:ro -v /home/ubuntu/forja/datos:/datos \
  -p 127.0.0.1:18697:18697 forja:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/forja.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/forja.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-forja-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'forja.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/forja.conf;\n' + marca, 1))
PY
  sudo nginx -t 2>&1 | tail -1 && sudo systemctl reload nginx
fi
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:18697/api/estado 2>/dev/null && break; sleep 1; done
curl -s -m 5 http://127.0.0.1:18697/api/estado || echo 'el servidor no responde: mira sudo docker logs forja'; echo
sudo docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' forja
REMOTO
sleep 1
curl -s -o /dev/null -w 'Forja HTTPS: %{http_code}\n' https://jmd-learn.online/forja/
