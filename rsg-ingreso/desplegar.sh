#!/usr/bin/env bash
# Despliega el contenedor rsg-ingreso en el EC2 3.151.56.55 (el del LMS jmd-learn.online). No toca el LMS ni su .env.
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
#
# Qué hace en el servidor:
#   1. Arma /home/ubuntu/rsg-ingreso/.env (modo 600) SIN imprimir nada secreto:
#        RSG_CLAVE           clave del panel admin.html; se genera la primera vez y se conserva después.
#        RSG_LMS_CORREO/CLAVE  cuenta admin del LMS, de ~/credenciales-lms.txt (líneas «Usuario:» y «Clave:»).
#        RSG_LMS_INVITACION  LMS_INVITE_CODE del contenedor lms (docker exec lms printenv). Si está vacío, el LMS no
#                            tiene registro propio y el script PARA: este servicio crea las cuentas por /api/v1/auth/register.
#        RSG_SEMILLA         LMS_AULA_SECRETO del contenedor lms o, si no la tiene, el archivo aula-secreto del volumen
#                            jmd_lms_data (recortado como lo hace el LMS). Firma los links de ingreso.
#        RSG_LMS_URL         http://<puerto publicado del lms> (docker port lms 8080, p. ej. 127.0.0.1:8080).
#      Las credenciales del LMS y la semilla se vuelven a leer en cada despliegue (si cambian, el servicio las sigue).
#   2. Construye la imagen rsg-ingreso:1 con el binario compilado aquí y recrea el contenedor (--network host,
#      escucha solo en 127.0.0.1:18690, datos en /home/ubuntu/rsg-ingreso/datos → /datos).
#   3. La primera vez instala /etc/nginx/snippets/rsg-ingreso.conf y lo incluye en /etc/nginx/sites-enabled/jmd-learn
#      junto a readysetgo.conf (respaldo del sitio en /tmp, nginx -t antes de recargar).
#   4. Comprueba /api/salud (LMS, registro, cuenta admin y semilla: solo booleanos) y la URL pública.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
test -z "$(gofmt -l .)" && go vet ./... && go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /tmp/rsg-ingreso-linux .
ssh -i "$LLAVE" $H 'mkdir -p ~/rsg-ingreso/build ~/rsg-ingreso/datos'
scp -q -i "$LLAVE" /tmp/rsg-ingreso-linux $H:rsg-ingreso/build/rsg-ingreso
scp -q -i "$LLAVE" Dockerfile nginx.conf $H:rsg-ingreso/build/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
set +x
umask 077
D=/home/ubuntu/rsg-ingreso
# --- .env: nada de esto se imprime; printf es interno de bash (no aparece en ps) ---
clave_panel=""
if [ -f $D/.env ]; then clave_panel=$(sed -n 's/^RSG_CLAVE=//p;T;q' $D/.env); fi
nueva_clave=0
if [ -z "$clave_panel" ]; then clave_panel=$(openssl rand -hex 16); nueva_clave=1; fi
correo=$(sed -n 's/^[[:space:]]*Usuario:[[:space:]]*//;T;s/[[:space:]\r]*$//;p;q' ~/credenciales-lms.txt)
clave_lms=$(sed -n 's/^[[:space:]]*Clave:[[:space:]]*//;T;s/[[:space:]\r]*$//;p;q' ~/credenciales-lms.txt)
case "$correo" in *@*) ;; *) echo "ERROR: ~/credenciales-lms.txt no trae un «Usuario:» con correo"; exit 1;; esac
[ ${#clave_lms} -ge 8 ] || { echo "ERROR: ~/credenciales-lms.txt no trae «Clave:»"; exit 1; }
invitacion=$(sudo docker exec lms printenv LMS_INVITE_CODE 2>/dev/null || true)
# Sin LMS_INVITE_CODE, la cuenta se crea por la inscripción de un grupo puente que ya está en LMS_INSCRIPCION
# (sin cupos gratis) y en el acto Asignar la deja solo en ready-set-go-1. Así no hay que reiniciar el LMS.
puente=${RSG_PUENTE:-taller-diseno-ia}
if [ -z "$invitacion" ]; then
  sudo docker exec lms printenv LMS_INSCRIPCION | tr ',' '\n' | grep -qx "$puente" || { echo "ERROR: el grupo puente $puente no está en LMS_INSCRIPCION"; exit 1; }
  echo "sin LMS_INVITE_CODE: las cuentas se crean por el grupo puente $puente"
fi
semilla=$(sudo docker exec lms printenv LMS_AULA_SECRETO 2>/dev/null || true)
origen_semilla="LMS_AULA_SECRETO"
if [ -z "$semilla" ]; then
  semilla=$(sudo cat /var/lib/docker/volumes/jmd_lms_data/_data/aula-secreto 2>/dev/null | tr -d '[:space:]' || true)
  origen_semilla="archivo aula-secreto"
fi
[ ${#semilla} -ge 16 ] || { echo "ERROR: no encontré la semilla del aula del LMS"; exit 1; }
puerto_lms=$(sudo docker port lms 8080/tcp | grep -m1 '^127\.0\.0\.1:' || true)
[ -n "$puerto_lms" ] || { echo "ERROR: el lms no publica 8080 en 127.0.0.1"; exit 1; }
{
  printf 'RSG_CLAVE=%s\n' "$clave_panel"
  printf 'RSG_LMS_URL=http://%s\n' "$puerto_lms"
  printf 'RSG_LMS_PUBLICO=https://jmd-learn.online\n'
  printf 'RSG_LMS_CORREO=%s\n' "$correo"
  printf 'RSG_LMS_CLAVE=%s\n' "$clave_lms"
  printf 'RSG_LMS_INVITACION=%s\n' "$invitacion"
  [ -z "$invitacion" ] && printf 'RSG_LMS_PUENTE=%s\n' "$puente"
  printf 'RSG_SEMILLA=%s\n' "$semilla"
} > $D/.env.nuevo
mv $D/.env.nuevo $D/.env
chmod 600 $D/.env
unset clave_panel correo clave_lms invitacion semilla
echo ".env listo (semilla tomada de: $origen_semilla)"
[ $nueva_clave = 1 ] && echo "clave nueva del panel guardada en $D/.env (RSG_CLAVE); léela allí, no se imprime"
# --- contenedor ---
cd $D/build && chmod 755 rsg-ingreso && sudo chown 65534:65534 $D/datos && sudo chmod 700 $D/datos
sudo docker build -q -t rsg-ingreso:1 . >/dev/null
sudo docker rm -f rsg-ingreso >/dev/null 2>&1 || true
sudo docker run -d --name rsg-ingreso --restart unless-stopped --network host --memory 48m --memory-swap 64m \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --env-file $D/.env -v $D/datos:/datos rsg-ingreso:1 >/dev/null
# --- nginx (solo la primera vez) ---
if ! sudo test -e /etc/nginx/snippets/rsg-ingreso.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/rsg-ingreso.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-rsg-ingreso-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/readysetgo.conf;'
assert marca in s and 'rsg-ingreso.conf' not in s
p.write_text(s.replace(marca, marca + '\n    include /etc/nginx/snippets/rsg-ingreso.conf;', 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
fi
# --- comprobaciones (solo booleanos y códigos) ---
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:18690/api/horario && break; sleep 1; done
echo "salud: $(curl -s http://127.0.0.1:18690/api/salud)"
curl -s -o /dev/null -w 'Ingreso HTTPS: %{http_code}\n' https://jmd-learn.online/readysetgo/ingreso/
sudo docker ps --filter name=rsg-ingreso --format '{{.Names}} {{.Status}}'
REMOTO
