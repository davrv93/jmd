#!/bin/sh
# Publica las escenas del LIVE de la charla de seguridad y las activa. No reinicia el LMS.
set -e
K=~/Downloads/curdilmer.pem
cd ~/Documents/jmd
git add lms/content/courses/charla-seguridad-ia lms/scripts/publicar-escenas-charla.sh
git commit -q -m "feat(charla): escenas del LIVE de seguridad

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
h={"Cookie":c,"Content-Type":"application/json","Origin":"https://jmd-learn.online"}
for ruta in ("/api/v1/admin/reload","/api/v1/live/cs-01/iniciar"):
    print(ruta,urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080"+ruta,data=b"{}",method="POST",headers=h)).status)
print("escena",json.load(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080/api/v1/live/cs-01",headers=h)))["escena"])
PY'
