#!/bin/sh
# Publica «Tu escena con Veo» (sesión 3 de ¿Difícil de explicar?) con su tope de generaciones por alumno.
# Es código del API: reconstruye la imagen y recrea el LMS, así que corta el LIVE unos segundos.
# Se niega a correr con alumnos conectados; FORZAR=1 lo salta. Corre desde el Mac.
set -e
K=~/Downloads/curdilmer.pem
cd ~/Documents/jmd
git add lms/api/internal/httpapi/live_veo.go lms/api/internal/httpapi/live_veo_test.go lms/api/internal/httpapi/server.go
git add lms/content/courses/hard-to-explain-diseno/live/de-03/02-tu-escena-con-veo lms/scripts/publicar-veo-cupo.sh
git diff --cached --quiet || git commit -q -m "feat(live): escena con Veo y tope de generaciones por alumno

Cada alumno genera hasta 3 videos de 4 s con Veo 3.1 Lite; ve cuántos le quedan y
puede solicitar una ampliación, que el instructor concede desde la misma escena.
La clase tiene además un tope total (30) para que el saldo de OpenRouter no se agote.
El uso se guarda en la base: un reinicio no devuelve intentos.

Entorno opcional: LMS_VEO_TOPE, LMS_VEO_TOPE_TOTAL, LMS_VEO_SEGUNDOS, LMS_VEO_MODELO.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -q origin HEAD:main
ssh -i $K ubuntu@3.151.56.55 "FORZAR=${FORZAR:-0} sh -s" <<'REMOTO'
set -e
cat > /tmp/veo-cupo.py <<'PY'
import json, re, sys, urllib.request, urllib.error
from pathlib import Path
B = "http://127.0.0.1:8080"
t = Path.home().joinpath("credenciales-lms.txt").read_text()
d = json.dumps({"email": re.search(r"Usuario:\s*(\S+)", t).group(1), "password": re.search(r"Clave:\s*(\S+)", t).group(1)}).encode()
r = urllib.request.urlopen(urllib.request.Request(B + "/api/v1/auth/login", data=d, headers={"Content-Type": "application/json"}))
c = r.headers.get("Set-Cookie").split(";")[0]
def pedir(ruta, cookie=True):
    try:
        x = urllib.request.urlopen(urllib.request.Request(B + ruta, headers={"Cookie": c} if cookie else {}))
        return x.status, x.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
if sys.argv[1] == "conectados":
    n = 0
    for l in ("de-01", "de-02", "de-03"):
        code, raw = pedir("/api/v1/live/" + l)
        if code == 200:
            n += json.loads(raw).get("conectados") or 0
    print(n)
else:
    print("sin sesión →", pedir("/api/v1/live/de-03/veo", cookie=False)[0], "(esperado 401)")
    code, raw = pedir("/api/v1/live/de-03/veo")
    v = json.loads(raw) if code == 200 else {}
    print("cuenta →", code, {k: v.get(k) for k in ("usados", "limite", "quedan", "segundos", "modelo")})
    code, raw = pedir("/api/v1/live/de-03/veo/solicitudes")
    v = json.loads(raw) if code == 200 else {}
    print("panel instructor →", code, {k: v.get(k) for k in ("total", "tope_total", "tope", "costo_clip")})
    print("escena →", pedir("/api/v1/live/de-03/escenas/02-tu-escena-con-veo/html")[0])
PY
N=$(python3 /tmp/veo-cupo.py conectados)
if [ "$N" != "0" ] && [ "$FORZAR" != "1" ]; then echo "Hay $N alumnos conectados al LIVE: no despliego. FORZAR=1 para hacerlo igual."; rm -f /tmp/veo-cupo.py; exit 1; fi
bash ~/desplegar-lms.sh
sudo docker exec lms sh -c '[ -n "$OPENROUTER_API_KEY" ] && echo "llave de OpenRouter: presente" || echo "llave de OpenRouter: FALTA"'
python3 /tmp/veo-cupo.py verificar
rm -f /tmp/veo-cupo.py
REMOTO
