#!/bin/sh
# Publica la escena LIVE «Dirige un video» de la sesión 3 de ¿Difícil de explicar? y su material. Corre desde el Mac.
# No reinicia el LMS: el contenido se recarga en caliente.
set -e
K=~/Downloads/curdilmer.pem
C=lms/content/courses/hard-to-explain-diseno
cd ~/Documents/jmd
git add $C/live/de-03 $C/materials/demo-estudio-con-agente.mp4 $C/lessons/03-animacion-y-video.md lms/scripts/publicar-escena-estudio.sh
git commit -q -m "feat(dificil-de-explicar): escena LIVE «Dirige un video» en la sesión 3

Recorrido guiado de una producción real hecha con un agente: pedido, idea, guion,
escenas, voz y música, y video final.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
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
for ruta in ("/api/v1/lessons/de-03","/api/v1/live/de-03/escenas","/api/v1/live/de-03/escenas/01-dirige-tu-video/html","/api/v1/live/de-03/escenas/01-dirige-tu-video/video.mp4"):
    try:
        x=urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080"+ruta,headers={"Cookie":c}))
        s=x.read(); print(ruta,x.status,len(s),b"dirige" in s.lower(),b"demo-estudio" in s)
    except Exception as e: print(ruta,"ERR",str(e)[:60])
PY'
