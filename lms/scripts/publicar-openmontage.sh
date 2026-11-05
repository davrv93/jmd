#!/bin/sh
# Publica Crea contenido con OpenMontage, abre su inscripción y lo agrega al formulario. Corre desde el Mac.
# Recrea el LMS para leer LMS_INSCRIPCION: corta el LIVE unos segundos. No lo corras con alumnos conectados.
set -e
K=~/Downloads/curdilmer.pem
cd ~/Documents/jmd
git add lms/content/courses/crea-contenido-openmontage lms/scripts/publicar-openmontage.sh
git commit -q -m "feat(openmontage): curso de 4 sesiones los domingos de noviembre

Domingos 8, 15, 22 y 29, de 12:00 a 1:00 pm.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
ssh -i $K ubuntu@3.151.56.55 'set -e
cd ~/jmd && git pull -q --ff-only
grep -q "^LMS_INSCRIPCION=.*openmontage-1" .env || { cp -p .env .env.bak-20261105-openmontage; sed -i "/^LMS_INSCRIPCION=/s/$/,openmontage-1/" .env; }
sudo docker compose up -d --no-deps --no-build lms
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:8080/api/v1/inscripcion/openmontage-1 && break; sleep 2; done
curl -s https://jmd-learn.online/api/v1/inscripcion/openmontage-1 | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[\"cursos\"][0][\"id\"],d[\"cursos\"][0][\"fechas\"])"
curl -s -o /dev/null -w "pagina %{http_code}\n" https://jmd-learn.online/inscripcion/openmontage-1/'
LLAVE=$K ~/Documents/jmd/inscripcion-cursos/desplegar.sh | tail -2
