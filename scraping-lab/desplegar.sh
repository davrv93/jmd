#!/usr/bin/env bash
# Despliega el Laboratorio de scraping JMD en el EC2 3.151.56.55 → https://jmd-learn.online/scraping-lab/
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Sin secretos ni datos en disco: todo vive en memoria (reiniciar el contenedor deja el panel en cero).
# Límite por alumno: variables LAB_* del Dockerfile (20 pedidos / 10 s, tolerancia 10 respuestas 429, castigo 60 s).
# nginx: /etc/nginx/snippets/scraping-lab.conf → 127.0.0.1:18685, incluido en /etc/nginx/sites-enabled/jmd-learn
# (es archivo, no symlink) antes de tienda-sol.conf, con nginx -t antes de recargar. Solo se toca la primera vez.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/scraping-lab-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/scraping-lab/build'
scp -i "$LLAVE" /tmp/scraping-lab-linux $H:scraping-lab/build/scraping-lab
scp -i "$LLAVE" Dockerfile nginx.conf $H:scraping-lab/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
cd ~/scraping-lab/build && chmod 755 scraping-lab
sudo docker build -q -t scraping-lab:1 . >/dev/null
sudo docker rm -f scraping-lab >/dev/null 2>&1 || true
sudo docker run -d --name scraping-lab --restart unless-stopped --memory 64m --memory-swap 96m \
  -p 127.0.0.1:18685:18685 scraping-lab:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/scraping-lab.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/scraping-lab.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-scraping-lab-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'scraping-lab.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/scraping-lab.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
else
  sudo install -m 644 nginx.conf /etc/nginx/snippets/scraping-lab.conf && sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18685/scraping-lab/api/salud && break; sleep 1; done
curl -s -o /dev/null -w 'Laboratorio HTTPS: %{http_code}\n' https://jmd-learn.online/scraping-lab/
curl -s -o /dev/null -w 'robots.txt: %{http_code}\n' https://jmd-learn.online/scraping-lab/robots.txt
curl -s -o /dev/null -w 'kit.zip: %{http_code} (%{size_download} bytes)\n' https://jmd-learn.online/scraping-lab/kit.zip
sudo docker ps --filter name=scraping-lab --format '{{.Names}} {{.Status}}'
REMOTO
