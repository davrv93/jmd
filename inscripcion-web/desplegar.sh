#!/usr/bin/env bash
# Despliega la inscripción a los cursos en modalidad web (pago por Yape) en el EC2 3.151.56.55.
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Público: https://jmd-learn.online/inscripcion-web/   Panel: https://jmd-learn.online/inscripcion-web/admin
# Claves en /home/ubuntu/inscripcion-web/.env (modo 600): ADMIN_CLAVE (panel) y LMS_INTERNO_CLAVE, que es la misma que
# LMS_INTERNO_CLAVE de ~/jmd/.env. Si faltan, se generan y NO se imprimen. La del LMS solo sirve tras reiniciar el LMS.
# Datos: /home/ubuntu/inscripcion-web/datos (solicitudes.json, fotos/, config.json opcional que manda sobre la embebida).
# Red: el contenedor entra a jmd_default para hablar con el LMS (http://lms:8080) sin pasar por internet.
# nginx: /etc/nginx/snippets/inscripcion-web.conf → 127.0.0.1:18766, y bloquea /api/v1/interno/ desde fuera.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
gofmt -l . | (! grep .) && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/inscripcion-web-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/inscripcion-web/build ~/inscripcion-web/datos'
scp -q -i "$LLAVE" /tmp/inscripcion-web-linux $H:inscripcion-web/build/inscripcion-web
scp -q -i "$LLAVE" Dockerfile nginx.conf $H:inscripcion-web/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
cd ~/inscripcion-web
# La clave interna vive en los dos .env: el del LMS manda.
if ! grep -q '^LMS_INTERNO_CLAVE=.\{32,\}' ~/jmd/.env; then
  cp -p ~/jmd/.env ~/jmd/.env.antes-inscripcion-web-$(date +%Y%m%d-%H%M)
  printf '\n# Servicio inscripcion-web (pago por Yape aprobado a mano)\nLMS_INTERNO_CLAVE=%s\n' "$(openssl rand -hex 32)" >> ~/jmd/.env
  echo "LMS_INTERNO_CLAVE nueva en ~/jmd/.env: el LMS la toma al reiniciarse"
fi
interna=$(sed -n 's/^LMS_INTERNO_CLAVE=//p' ~/jmd/.env | tail -1)
admin=""; [ -f .env ] && admin=$(sed -n 's/^ADMIN_CLAVE=//p' .env | tail -1)
[ -n "$admin" ] || { admin=$(openssl rand -hex 16); echo "clave de panel nueva en ~/inscripcion-web/.env"; }
(umask 077; printf 'ADMIN_CLAVE=%s\nLMS_INTERNO_CLAVE=%s\nLMS_URL=http://lms:8080\nDATOS=/datos\nPORT=18766\nORIGENES=https://jmd-learn.online\n' "$admin" "$interna" > .env)
unset interna admin
chmod 600 .env
if ! sudo docker ps -a --format '{{.Names}}' | grep -qx inscripcion-web && sudo ss -ltn | grep -q ':18766 '; then echo "puerto 18766 ocupado"; exit 1; fi
sudo chown 65534:65534 datos && sudo chmod 700 datos
cd build && chmod 755 inscripcion-web
sudo docker build -q -t inscripcion-web:1 . >/dev/null
sudo docker rm -f inscripcion-web >/dev/null 2>&1 || true
sudo docker run -d --name inscripcion-web --restart unless-stopped --memory 64m --memory-swap 96m --read-only --cap-drop ALL \
  --security-opt no-new-privileges --env-file /home/ubuntu/inscripcion-web/.env -v /home/ubuntu/inscripcion-web/datos:/datos \
  --network jmd_default -p 127.0.0.1:18766:18766 inscripcion-web:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/inscripcion-web.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/inscripcion-web.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-inscripcion-web-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/sorteo-basket-viento.conf;'
assert s.count(marca) == 1 and 'inscripcion-web.conf' not in s
p.write_text(s.replace(marca, marca + '\n    include /etc/nginx/snippets/inscripcion-web.conf;', 1))
PY
  if ! sudo nginx -t 2>/dev/null; then
    sudo cp -p "$(ls -t /tmp/jmd-learn.antes-inscripcion-web-* | head -1)" /etc/nginx/sites-enabled/jmd-learn
    sudo rm -f /etc/nginx/snippets/inscripcion-web.conf; echo "nginx -t falló: se restauró el sitio"; exit 1
  fi
  sudo systemctl reload nginx
else
  sudo install -m 644 nginx.conf /etc/nginx/snippets/inscripcion-web.conf && sudo nginx -t 2>/dev/null && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18766/api/salud && break; sleep 1; done
sleep 2
curl -s -o /dev/null -w 'Inscripción web HTTPS: %{http_code}\n' https://jmd-learn.online/inscripcion-web/
curl -s -o /dev/null -w 'Ruta interna del LMS desde fuera (404 = bien): %{http_code}\n' -X POST https://jmd-learn.online/api/v1/interno/inscripcion
sudo docker ps --filter name=inscripcion-web --format '{{.Names}} {{.Status}}'
REMOTO
