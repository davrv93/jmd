#!/usr/bin/env bash
# Publica en jmd-learn.online el contenido que ya está en origin/main: git pull en el servidor y
# recarga del catálogo del LMS (POST /api/v1/admin/reload). No reinicia el contenedor.
# Uso: ~/Documents/jmd/lms/scripts/recargar-contenido.sh
set -euo pipefail
K=${LLAVE:-$HOME/Downloads/curdilmer.pem}
ssh -i "$K" ubuntu@3.151.56.55 'set -e
cd ~/jmd && git pull -q --ff-only && git log -1 --oneline
python3 - <<PY
import json,re,urllib.request
from pathlib import Path
t=Path.home().joinpath("credenciales-lms.txt").read_text()
d=json.dumps({"email":re.search(r"Usuario:\s*(\S+)",t).group(1),"password":re.search(r"Clave:\s*(\S+)",t).group(1)}).encode()
r=urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080/api/v1/auth/login",data=d,headers={"Content-Type":"application/json"}))
c=r.headers.get("Set-Cookie").split(";")[0]
h={"Cookie":c,"Content-Type":"application/json","Origin":"https://jmd-learn.online"}
x=urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080/api/v1/admin/reload",data=b"{}",method="POST",headers=h))
print("reload", x.status, x.read().decode()[:300])
PY'
