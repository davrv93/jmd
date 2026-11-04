#!/bin/sh
# Pasa evogo-clase a la imagen con el parche del 405 y publica las skills del aula. Corre desde el Mac.
# Recrear evogo-clase corta WhatsApp de la clase unos segundos: no lo corras con alumnos vinculados en plena prueba.
set -e
K=~/Downloads/curdilmer.pem
cd ~/Documents/jmd
sed -i '' '/^  evogo-clase:/,/container_name: evogo-clase/s#image: importking/evogo:latest#image: importking/evogo:wafix-20261103#' compose.yaml
git add compose.yaml lms/aula/skills-curso/aula-apis-puertos lms/aula/dsh/AGENTS-trabajo.md lms/scripts/aulas-clase.py lms/scripts/parche-evogo-clase.sh
git commit -q -m "fix(clase): evogo-clase con la imagen que WhatsApp acepta y skill de APIs para dsh

La imagen latest fija una versión que WhatsApp rechaza con 405 y el QR nunca aparece.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
ssh -i $K ubuntu@3.151.56.55 'set -e
cd ~/jmd && git pull -q --ff-only
sudo docker exec aula-pg pg_dump -U postgres -Fc evogo_users > ~/respaldo-evogo_users-20261104.dump
sudo docker exec aula-pg pg_dump -U postgres -Fc evogo_auth > ~/respaldo-evogo_auth-20261104.dump
sudo docker compose --profile clase up -d --no-deps --no-build evogo-clase
sleep 6
sudo docker inspect evogo-clase --format "{{.Config.Image}} {{.State.Status}}"
sudo docker exec curso-b9a9db88d224cf90 sh -c "timeout 30 aula whatsapp 2>&1 | grep -avE \"[█▀▄]\" | cut -c1-100 | head -8" || true
sudo docker logs --since 40s evogo-clase 2>&1 | grep -ciE "405|outdated" || true'
