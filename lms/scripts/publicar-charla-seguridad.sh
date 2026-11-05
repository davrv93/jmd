#!/bin/sh
# Publica la ruleta y la charla gratuita de seguridad, y abre su inscripción. Corre desde el Mac.
# Recrea el LMS para leer LMS_INSCRIPCION: corta el LIVE unos segundos. No lo corras con alumnos conectados.
set -e
K=~/Downloads/curdilmer.pem
cd ~/Documents/jmd/sorteo-seguridad
LLAVE=$K ./desplegar.sh
cd ~/Documents/jmd
git add sorteo-seguridad lms/content/courses/charla-seguridad-ia lms/scripts/publicar-charla-seguridad.sh
git commit -q -m "feat(charla): charla gratuita de seguridad con su ruleta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
ssh -i $K ubuntu@3.151.56.55 'set -e
cd ~/jmd && git pull -q --ff-only
grep -q "^LMS_INSCRIPCION=.*charla-seguridad-1" .env || { cp -p .env .env.bak-20261104-charla; sed -i "/^LMS_INSCRIPCION=/s/$/,charla-seguridad-1/" .env; }
sudo docker compose up -d --no-deps --no-build lms
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:8080/api/v1/inscripcion/charla-seguridad-1 && break; sleep 2; done
curl -s -o /dev/null -w "inscripcion %{http_code}\n" https://jmd-learn.online/api/v1/inscripcion/charla-seguridad-1
curl -s -o /dev/null -w "ruleta %{http_code}\n" https://jmd-learn.online/sorteo-seguridad/
sudo docker ps --filter name=curso- --format "{{.Names}}" | wc -l'
