#!/bin/sh
# Publica la escena LIVE «El estudio por dentro» (copia de solo lectura del tablero de Backlot) en la sesión 3
# de ¿Difícil de explicar?, con su audio y video como materiales. Solo contenido: se recarga en caliente, sin reinicio.
# Para regenerar la copia: node lms/scripts/exportar-estudio.mjs (ver su cabecera), con Backlot en el puerto 4799.
set -e
K=~/Downloads/curdilmer.pem
C=lms/content/courses/hard-to-explain-diseno
cd ~/Documents/jmd
git add -A $C/live/de-03/03-estudio-solo-ver $C/materials/estudio-ver
git add $C/lessons/03-animacion-y-video.md lms/scripts/exportar-estudio.mjs lms/scripts/publicar-estudio-ver.sh
git diff --cached --quiet || git commit -q -m "feat(dificil-de-explicar): escena LIVE «El estudio por dentro», el tablero real en solo lectura

Copia grabada del tablero de Backlot (OpenMontage, AGPL-3.0) con dos producciones: «Mi cafetería de barrio»
y la investigación del colibrí. Se recorren las etapas, el storyboard, la música y el video; no se aprueba
ni se escribe nada y el agente no corre. El audio y el video salen de los materiales de la lección.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -q origin HEAD:main
ssh -i $K ubuntu@3.151.56.55 'set -e
cd ~/jmd && git pull -q --ff-only && git log --oneline -1
python3 - <<PY
import json,re,urllib.request
from pathlib import Path
B="http://127.0.0.1:8080"
t=Path.home().joinpath("credenciales-lms.txt").read_text()
d=json.dumps({"email":re.search(r"Usuario:\s*(\S+)",t).group(1),"password":re.search(r"Clave:\s*(\S+)",t).group(1)}).encode()
r=urllib.request.urlopen(urllib.request.Request(B+"/api/v1/auth/login",data=d,headers={"Content-Type":"application/json"}))
c=r.headers.get("Set-Cookie").split(";")[0]
q=urllib.request.Request(B+"/api/v1/admin/reload",data=b"{}",method="POST",headers={"Cookie":c,"Content-Type":"application/json","Origin":"https://jmd-learn.online"})
print("reload",urllib.request.urlopen(q).status)
e=B+"/api/v1/live/de-03/escenas/03-estudio-solo-ver/"
m="/files/hard-to-explain-diseno/materials/estudio-ver/"
datos=json.load(urllib.request.urlopen(urllib.request.Request(e+"datos.json",headers={"Cookie":c})))
rutas=[e+"html",e+"tablero.js",e+"tablero.css",e+"gsap.js"]+[e+v for v in list(datos["imagenes"].values())[:3]]+[B+m+v for v in datos["medios"].values()]
mal=0
for ruta in rutas:
    try:
        x=urllib.request.urlopen(urllib.request.Request(ruta,headers={"Cookie":c})); n=len(x.read())
        print(x.status,x.headers.get("Content-Type"),n,ruta.split("/")[-1][-48:])
    except Exception as err: mal+=1; print("ERR",str(err)[:50],ruta.split("/")[-1])
v=json.load(urllib.request.urlopen(urllib.request.Request(B+"/api/v1/live/de-03",headers={"Cookie":c})))
print("LIVE",v.get("estado"),"escena",v.get("escena"),"conectados",v.get("conectados"),"| fallos",mal)
PY'
