#!/usr/bin/env python3
"""Enciende las aulas de una clase antes de que empiece, con DeepSeek Harness listo y sus skills.

Corre en el servidor. Entra como instructor, pide los enlaces de acceso del LIVE y, con cada uno, hace lo mismo
que el alumno al abrir su aula. Las sesiones viven solo en la memoria de este proceso y se cierran al terminar.
No imprime enlaces, tokens ni nombres.

Uso: python3 aulas-clase.py <lección> [--probar] [--minutos N]
  --probar     solo comprueba el acceso de instructor y cuenta alumnos
  --minutos N  mantiene las aulas encendidas N minutos (se apagan a los 15 sin uso)
"""
import http.client, json, os, re, subprocess, sys, time, urllib.parse
from pathlib import Path

HOST, PUERTO, ORIGEN = "127.0.0.1", 8080, "https://jmd-learn.online"
REPO = Path(os.environ.get("AULA_DIR", Path.home() / "jmd" / "lms" / "aula"))
CADA = 8 * 60

PREPARAR = r"""
mkdir -p /trabajo/.agents/skills
cd /opt/skills-curso
for d in s3-*; do
  rm -rf "/trabajo/.agents/skills/$d"
  cp -R "$d" /trabajo/.agents/skills/
  # dsh descarta la skill si el YAML no valida, y estas descripciones llevan «: » sin comillas
  sed -E -i '/^description: [^"]/{s/"/\\"/g;s/^description: (.*)$/description: "\1"/}' "/trabajo/.agents/skills/$d/SKILL.md"
done
"""


def pedir(metodo, ruta, cookie=None, cuerpo=None):
    c = http.client.HTTPConnection(HOST, PUERTO, timeout=120)
    h = {"Origin": ORIGEN}
    if cookie:
        h["Cookie"] = cookie
    datos = None
    if cuerpo is not None:
        datos = json.dumps(cuerpo)
        h["Content-Type"] = "application/json"
    c.request(metodo, ruta, datos, h)
    r = c.getresponse()
    texto = r.read()
    sesion = next((m.group(1) for k, v in r.getheaders() if k.lower() == "set-cookie"
                   for m in [re.match(r"(lms_session=[^;]+)", v)] if m), None)
    c.close()
    return r.status, texto, sesion


def instructor():
    linea = Path.home().joinpath("credenciales-lms.txt").read_text(encoding="utf-8")
    usuario = re.search(r"Usuario:\s*(\S+)", linea).group(1)
    clave = re.search(r"Clave:\s*(\S+)", linea).group(1)
    estado, _, sesion = pedir("POST", "/api/v1/auth/login", cuerpo={"email": usuario, "password": clave})
    if estado != 200 or not sesion:
        sys.exit(f"login del instructor: {estado}")
    return sesion


def contenedor(cookie):
    estado, texto, _ = pedir("POST", "/api/v1/aula/iniciar", cookie, {})
    if estado != 200:
        return estado, None
    return estado, json.loads(texto)["contenedor"]


def instalar(nombre):
    d = ["sudo", "docker", "exec", "-i", nombre]
    subprocess.run(d + ["sh", "-s"], input=PREPARAR.encode(), check=True, capture_output=True)
    tar = subprocess.run(["tar", "-C", str(REPO / "skills-curso"), "-cf", "-", "aula-apis-puertos"], capture_output=True, check=True)
    subprocess.run(d + ["tar", "-C", "/trabajo/.agents/skills", "-xf", "-"], input=tar.stdout, check=True, capture_output=True)
    agentes = (REPO / "dsh" / "AGENTS-trabajo.md").read_bytes()
    subprocess.run(d + ["sh", "-c", "[ -e /trabajo/AGENTS.md ] || cat > /trabajo/AGENTS.md"], input=agentes, check=True, capture_output=True)


def comprobar(nombre):
    orden = ('printf "%s " "$(ls /trabajo/.agents/skills | wc -l)"; [ -n "$EVO_TOKEN" ] && printf "evo "; '
             'psql "$DATABASE_URL" -tAc "select 1" >/dev/null 2>&1 && printf "pg "; '
             'curl -s -m 5 -o /dev/null "$EVO_URL/" && printf "red "; '
             'curl -s -m 5 -o /dev/null localhost:3080/ && printf "dsh "')
    r = subprocess.run(["sudo", "docker", "exec", nombre, "sh", "-c", orden], capture_output=True, text=True)
    return r.stdout.strip()


def main():
    leccion = sys.argv[1]
    minutos = int(sys.argv[sys.argv.index("--minutos") + 1]) if "--minutos" in sys.argv else 0
    jefe = instructor()
    estado, texto, _ = pedir("GET", f"/api/v1/live/{leccion}/accesos", jefe)
    if estado != 200:
        sys.exit(f"accesos: {estado}")
    alumnos = json.loads(texto)["alumnos"]
    print("alumnos:", len(alumnos), flush=True)
    if "--probar" in sys.argv:
        pedir("POST", "/api/v1/auth/logout", jefe, {})
        return

    sesiones, fallos = [], 0
    for i, a in enumerate(alumnos, 1):
        u = urllib.parse.urlsplit(a["url"])
        estado, _, cookie = pedir("GET", f"{u.path}?{u.query}")
        if not cookie:
            print(f"{i:2} enlace falló: {estado}", flush=True)
            fallos += 1
            continue
        sesiones.append(cookie)
        estado, nombre = contenedor(cookie)
        if not nombre:
            print(f"{i:2} aula falló: {estado}", flush=True)
            fallos += 1
            continue
        try:
            instalar(nombre)
        except subprocess.CalledProcessError as e:
            print(f"{i:2} skills fallaron: {e.returncode}", flush=True)
            fallos += 1
        estado, texto, _ = pedir("POST", "/api/v1/dsh/abrir", cookie, {})
        if estado != 200:
            print(f"{i:2} dsh falló: {estado} {texto[:90].decode(errors='replace')}", flush=True)
            fallos += 1
        print(f"{i:2} {nombre[:12]}… {comprobar(nombre)}", flush=True)
    print("fallos:", fallos, flush=True)

    fin = time.time() + minutos * 60
    while time.time() < fin:
        time.sleep(min(CADA, max(1, fin - time.time())))
        caidas = sum(1 for c in sesiones if pedir("POST", "/api/v1/aula/iniciar", c, {})[0] != 200)
        print(time.strftime("%H:%M"), "encendidas", len(sesiones) - caidas, "de", len(sesiones), flush=True)
    for c in sesiones + [jefe]:
        pedir("POST", "/api/v1/auth/logout", c, {})
    print("sesiones cerradas", flush=True)


if __name__ == "__main__":
    main()
