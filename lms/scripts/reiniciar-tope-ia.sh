#!/bin/sh
# Reinicia el tope diario de IA de un alumno. Uso: sh reiniciar-tope-ia.sh <inicio del id del alumno>
# Detiene el LMS porque el uso vive en memoria: corta el LIVE y el proxy de dsh unos segundos.
set -e
[ -n "$1" ] || { echo "falta el id"; exit 1; }
ssh -i ~/Downloads/curdilmer.pem ubuntu@3.151.56.55 "ID=$1 sh -s" <<'REMOTO'
set -e
F=/var/lib/docker/volumes/jmd_lms_data/_data/ia-uso.json
sudo docker stop -t 8 lms >/dev/null
sudo cp -p "$F" "$F.antes-$ID"
sudo ID="$ID" F="$F" python3 - <<'PY'
import json, os
f, i = os.environ["F"], os.environ["ID"]
d = json.load(open(f))
n = 0
for s, k in d["alumnos"].items():
    if s.startswith(i):
        k.update(peticiones=0, tokens_entrada=0, tokens_salida=0, rechazadas=0)
        n += 1
json.dump(d, open(f, "w"))
print("contadores reiniciados:", n)
PY
sudo docker start lms >/dev/null
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:8080/api/v1/inscripcion/charla-seguridad-1 && break; sleep 1; done
curl -s -o /dev/null -w "web %{http_code}\n" https://jmd-learn.online/live/g6-03/
sudo docker ps --filter name=curso- --format "{{.Names}}" | wc -l
REMOTO
