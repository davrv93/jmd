#!/usr/bin/env python3
"""Llena «Ver grabación» de cada clase con su grabación de Zoom en la nube.

Lee las grabaciones de la cuenta por la API de Zoom (app Server-to-Server OAuth), empareja cada una
con la clase cuyo `starts_at` cae más cerca de la hora en que empezó la reunión y escribe el enlace
para compartir y el código en el bloque `recording:` de la lección. Si la lección no trae el bloque,
lo añade; nunca pisa un enlace ya puesto.

    python3 lms/scripts/zoom_grabaciones.py                 # en seco: muestra qué haría
    python3 lms/scripts/zoom_grabaciones.py --aplicar       # escribe en las lecciones
    python3 lms/scripts/zoom_grabaciones.py --desde 2026-11-01 --curso programacion-agentica-g8

Credenciales en ~/.zoom-jmd.env (modo 600, fuera del repositorio):
    ZOOM_ACCOUNT_ID=…  ZOOM_CLIENT_ID=…  ZOOM_CLIENT_SECRET=…  [ZOOM_USER=correo del anfitrión]
Permiso de la app: cloud_recording:read:list_user_recordings:admin (o recording:read:admin).
El script no imprime ni guarda credenciales ni el token.

Las grabaciones hechas en la computadora (no en la nube) no aparecen en la API.
"""
import argparse, base64, calendar, datetime as dt, glob, json, os, re, sys, urllib.error, urllib.parse, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "courses")
ENV = os.path.expanduser("~/.zoom-jmd.env")
ANTES, DESPUES = 45, 75   # minutos: la reunión puede abrirse antes o empezar tarde respecto de starts_at
MINIMO = 20               # minutos: una grabación más corta es una prueba, no una clase
LIMA = dt.timezone(dt.timedelta(hours=-5))


def credenciales():
    if not os.path.exists(ENV):
        sys.exit(f"Falta {ENV}. Créalo con ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID y ZOOM_CLIENT_SECRET (chmod 600).")
    if os.stat(ENV).st_mode & 0o077:
        sys.exit(f"{ENV} lo pueden leer otros usuarios. Corre: chmod 600 {ENV}")
    c = {}
    for linea in open(ENV):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*?)\s*$", linea)
        if m and not linea.lstrip().startswith("#"):
            c[m.group(1)] = m.group(2).strip("\"'")
    faltan = [k for k in ("ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET") if not c.get(k) or c[k] == "PEGA_AQUI"]
    if faltan:
        sys.exit(f"En {ENV} falta llenar: {', '.join(faltan)}")
    return c


def pedir(url, cabeceras, datos=None):
    """GET o POST que devuelve (estado, json). Nunca imprime cabeceras: llevan el secreto o el token."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=datos, headers=cabeceras), timeout=30) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}


def token(c):
    basica = base64.b64encode(f"{c['ZOOM_CLIENT_ID']}:{c['ZOOM_CLIENT_SECRET']}".encode()).decode()
    url = "https://zoom.us/oauth/token?" + urllib.parse.urlencode({"grant_type": "account_credentials", "account_id": c["ZOOM_ACCOUNT_ID"]})
    estado, d = pedir(url, {"Authorization": "Basic " + basica}, datos=b"")
    if estado != 200 or "access_token" not in d:
        sys.exit(f"Zoom no dio el token ({estado}): {d.get('reason') or d.get('error') or d.get('message') or 'sin detalle'}. "
                 "Revisa los tres valores y que la app esté activada.")
    return d["access_token"], d.get("scope", "")


def meses(desde, hasta):
    """La API acepta como mucho un mes por consulta."""
    a = desde
    while a <= hasta:
        b = min(hasta, a.replace(day=calendar.monthrange(a.year, a.month)[1]))
        yield a, b
        a = b + dt.timedelta(days=1)


def grabaciones(tok, usuario, desde, hasta):
    cab = {"Authorization": "Bearer " + tok}
    rutas = [f"users/{urllib.parse.quote(usuario)}/recordings"] if usuario else ["users/me/recordings", "accounts/me/recordings"]
    ultimo = None
    for ruta in rutas:
        reuniones, ok = [], True
        for a, b in meses(desde, hasta):
            pagina = ""
            while True:
                q = {"from": a.isoformat(), "to": b.isoformat(), "page_size": 300}
                if pagina:
                    q["next_page_token"] = pagina
                estado, d = pedir(f"https://api.zoom.us/v2/{ruta}?" + urllib.parse.urlencode(q), cab)
                if estado != 200:
                    ok, ultimo = False, (ruta, estado, d.get("message", ""))
                    break
                reuniones += d.get("meetings", [])
                pagina = d.get("next_page_token", "")
                if not pagina:
                    break
            if not ok:
                break
        if ok:
            return ruta, reuniones
    ruta, estado, mensaje = ultimo
    sys.exit(f"Zoom rechazó la consulta de grabaciones ({ruta}: {estado} {mensaje}).\n"
             "Si habla de «scopes», añade a la app el permiso cloud_recording:read:list_user_recordings:admin "
             "(o recording:read:admin) y vuelve a activarla. Si «me» no vale, pon ZOOM_USER=<correo del anfitrión> en el archivo.")


def clases(filtro):
    out = []
    for ruta in sorted(glob.glob(os.path.join(RAIZ, "*", "lessons", "*.md"))):
        curso = ruta.split(os.sep)[-3]
        if filtro and not curso.startswith(filtro):
            continue
        fm = open(ruta).read().split("\n---\n", 1)[0]
        ini = re.search(r"(?m)^starts_at:\s*\"?([^\s\"]+)", fm)
        lid = re.search(r"(?m)^id:\s*(\S+)", fm)
        if not ini or not lid:
            continue
        try:
            cuando = dt.datetime.fromisoformat(ini.group(1))
        except ValueError:
            continue
        bloque = re.search(r'(?m)^recording:\n  url: "(.*)"\n  passcode: "(.*)"$', fm)
        out.append({"id": lid.group(1), "curso": curso, "ruta": ruta, "inicio": cuando,
                    "bloque": bloque is not None, "url": bloque.group(1) if bloque else None})
    return out


def emparejar(reuniones, lecciones):
    """Cada grabación va a la clase más cercana en hora; cada clase se queda con su grabación más larga."""
    pares, sueltas = {}, []
    for r in reuniones:
        try:
            ini = dt.datetime.fromisoformat(r["start_time"].replace("Z", "+00:00"))
        except (KeyError, ValueError):
            continue
        dur = int(r.get("duration") or 0)
        if dur < MINIMO or not r.get("share_url"):
            continue
        cerca = sorted((abs((ini - l["inicio"]).total_seconds()) / 60, l) for l in lecciones
                       if -ANTES <= (ini - l["inicio"]).total_seconds() / 60 <= DESPUES)
        if not cerca:
            sueltas.append((ini, dur, r.get("topic", "")))
            continue
        if len(cerca) > 1 and cerca[1][0] - cerca[0][0] < 10:
            sueltas.append((ini, dur, r.get("topic", "") + f"  (dudosa: {cerca[0][1]['id']} o {cerca[1][1]['id']})"))
            continue
        l = cerca[0][1]
        if l["id"] not in pares or dur > pares[l["id"]][1]:
            pares[l["id"]] = (r, dur, ini, l)
    return pares, sueltas


def escribir(leccion, url, codigo):
    t = open(leccion["ruta"]).read()
    limpio = lambda s: s.replace("\\", "").replace('"', "")
    nuevo, n = re.subn(r'(?m)^recording:\n  url: ""\n  passcode: ".*"$',
                       f'recording:\n  url: "{limpio(url)}"\n  passcode: "{limpio(codigo)}"', t, count=1)
    if not n and not re.search(r"(?m)^recording:", t.split("\n---\n", 1)[0]):
        # La lección no trae el bloque: va antes de repo:, materials: o cycle:, lo que aparezca primero.
        fm, cuerpo = t.split("\n---\n", 1)
        fm, n = re.subn(r"(?m)^(?=(?:repo|materials|cycle):)", f'recording:\n  url: "{limpio(url)}"\n  passcode: "{limpio(codigo)}"\n', fm, count=1)
        nuevo = fm + "\n---\n" + cuerpo
    if n:
        open(leccion["ruta"], "w").write(nuevo)
    return bool(n)


def main():
    p = argparse.ArgumentParser(description="Enlaza las grabaciones de Zoom en la nube con las clases del LMS.")
    p.add_argument("--aplicar", action="store_true", help="escribe en las lecciones (sin esto, solo muestra)")
    p.add_argument("--desde", default="2026-10-01", help="AAAA-MM-DD")
    p.add_argument("--hasta", default=dt.date.today().isoformat(), help="AAAA-MM-DD")
    p.add_argument("--curso", default="", help="prefijo del id del curso (p. ej. programacion-agentica)")
    a = p.parse_args()

    c = credenciales()
    tok, permisos = token(c)
    print(f"Token de Zoom: OK ({len(permisos.split())} permisos)")
    ruta, reuniones = grabaciones(tok, c.get("ZOOM_USER", ""), dt.date.fromisoformat(a.desde), dt.date.fromisoformat(a.hasta))
    print(f"Grabaciones en la nube entre {a.desde} y {a.hasta}: {len(reuniones)} ({ruta})")
    lecciones = clases(a.curso)
    pares, sueltas = emparejar(reuniones, lecciones)

    escritas = 0
    for lid in sorted(pares, key=lambda k: pares[k][2]):
        r, dur, ini, l = pares[lid]
        hora = ini.astimezone(LIMA).strftime("%d-%m %H:%M")
        codigo = r.get("password") or r.get("recording_play_passcode") or ""
        if l["url"]:
            estado = "ya tenía enlace: no se toca"
        elif a.aplicar:
            estado = "escrita" if escribir(l, r["share_url"], codigo) else "no se pudo escribir"
            escritas += estado == "escrita"
        else:
            estado = "se escribiría"
        print(f"  {lid:<10} {l['curso']:<34} {hora} · {dur:>3} min · código {'sí' if codigo else 'no'} · {estado}")
    if sueltas:
        print(f"\nGrabaciones sin clase ({len(sueltas)}):")
        for ini, dur, tema in sorted(sueltas):
            print(f"  {ini.astimezone(LIMA).strftime('%d-%m %H:%M')} · {dur:>3} min · {tema[:70]}")
    hoy = dt.datetime.now(LIMA)
    faltan = [l for l in lecciones if not l["url"] and l["id"] not in pares and l["inicio"] < hoy and l["inicio"].date() >= dt.date.fromisoformat(a.desde)]
    if faltan:
        print(f"\nClases ya dictadas sin grabación en la nube ({len(faltan)}): " + ", ".join(l["id"] for l in faltan))
    print(f"\n{'Escritas: ' + str(escritas) if a.aplicar else 'En seco: nada se escribió. Repite con --aplicar.'}")


if __name__ == "__main__":
    main()
