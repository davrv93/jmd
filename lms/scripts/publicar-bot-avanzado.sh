#!/bin/sh
# Publica las 3 sesiones del Bot de WhatsApp avanzado · Grupo 2 y actualiza formulario y ruleta. Corre desde el Mac.
# No reinicia el LMS: el contenido se recarga en caliente.
set -e
K=~/Downloads/curdilmer.pem
cd ~/Documents/jmd
git add -A lms/content/courses/bot-whatsapp-avanzado-2 lms/content/agenda.yaml sorteo-seguridad/web/index.html lms/scripts/publicar-bot-avanzado.sh
git commit -q -m "feat(bot-avanzado): grupo 2 en tres sesiones de 45 minutos

Domingos 15, 22 y 29 de noviembre, de 7:30 a 8:15 pm.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
ssh -i $K ubuntu@3.151.56.55 'set -e
cd ~/jmd && git pull -q --ff-only
python3 - <<PY
import json,re,urllib.request
from pathlib import Path
t=Path.home().joinpath("credenciales-lms.txt").read_text()
d=json.dumps({"email":re.search(r"Usuario:\s*(\S+)",t).group(1),"password":re.search(r"Clave:\s*(\S+)",t).group(1)}).encode()
r=urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080/api/v1/auth/login",data=d,headers={"Content-Type":"application/json"}))
c=r.headers.get("Set-Cookie").split(";")[0]
q=urllib.request.Request("http://127.0.0.1:8080/api/v1/admin/reload",data=b"{}",method="POST",headers={"Cookie":c,"Content-Type":"application/json","Origin":"https://jmd-learn.online"})
print("reload",urllib.request.urlopen(q).status)
PY
curl -s https://jmd-learn.online/api/v1/inscripcion/bot-avanzado-2 | python3 -c "import json,sys;d=json.load(sys.stdin);print(\"fechas\",d[\"cursos\"][0][\"fechas\"])"'
LLAVE=$K ~/Documents/jmd/inscripcion-cursos/desplegar.sh | tail -2
LLAVE=$K ~/Documents/jmd/sorteo-seguridad/desplegar.sh | tail -2
