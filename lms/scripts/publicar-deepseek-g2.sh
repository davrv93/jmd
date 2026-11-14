#!/bin/sh
# Publica DeepSeek Harness · Grupo 2, abre su inscripción y lo agrega al formulario. Corre desde el Mac.
# Recrea el LMS para leer LMS_INSCRIPCION: corta el LIVE unos segundos. No lo corras con alumnos conectados.
set -e
K=~/Downloads/curdilmer.pem
cd ~/Documents/jmd
git add lms/content/courses/deepseek-harness-2 lms/scripts/publicar-deepseek-g2.sh
git commit -q -m "feat(deepseek-harness): grupo 2 en jueves 12 y miércoles 18 y 25 de noviembre

La sesión 1 va a las 9:45 pm porque Python termina a las 9:30; las otras dos, a las 9:15 pm.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
ssh -i $K ubuntu@3.151.56.55 'set -e
cd ~/jmd && git pull -q --ff-only
grep -q "^LMS_INSCRIPCION=.*deepseek-harness-2" .env || { cp -p .env .env.bak-20261105-deepseek2; sed -i "/^LMS_INSCRIPCION=/s/$/,deepseek-harness-2/" .env; }
sudo docker compose up -d --no-deps --no-build lms
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:8080/api/v1/inscripcion/deepseek-harness-2 && break; sleep 2; done
curl -s https://jmd-learn.online/api/v1/inscripcion/deepseek-harness-2 | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[\"cursos\"][0][\"id\"],d[\"cursos\"][0][\"fechas\"])"
curl -s -o /dev/null -w "pagina %{http_code}\n" https://jmd-learn.online/inscripcion/deepseek-harness-2/'
LLAVE=$K ~/Documents/jmd/inscripcion-cursos/desplegar.sh | tail -2
