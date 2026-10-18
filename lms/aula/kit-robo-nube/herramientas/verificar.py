"""Criterios de aceptación del plan, en Python puro: funcionan igual en Windows, macOS y Linux (sin sh ni curl).

    python herramientas/verificar.py F1-T2       corre el criterio de una tarea y dice PASA o FALLA
    python herramientas/verificar.py todo        todas las tareas, en orden, con una tabla
    python herramientas/verificar.py puerto 8800 ¿está libre ese puerto? (si no, dice cómo ver quién lo usa)

Puertos: AULA_PUERTO (8800) y ROBO_PUERTO (8788). Sale con código 0 si pasa, 1 si falla.
Lo que solo se ve en el navegador (el avatar, la voz, el micrófono) lo recuerda al final como «a mano».
"""

from __future__ import annotations

import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

KIT = Path(__file__).resolve().parent.parent
ROBO_DIR = KIT / "trabajo" / "robo"
PLAN = KIT / "trabajo" / "plan-robo" / "PLAN_TRABAJO.md"
AULA = f"http://127.0.0.1:{os.environ.get('AULA_PUERTO', '8800')}"
ROBO = f"http://127.0.0.1:{os.environ.get('ROBO_PUERTO', '8788')}"
ANIMOS = {"feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral"}
FLYER_DEFECTO = "flyer de una liquidación el sábado 18 de octubre a las 10 am a S/ 20"


class Falla(Exception):
    pass


def http(metodo: str, url: str, cuerpo=None, datos: bytes | None = None, tipo: str | None = None, timeout: float = 200):
    """(estado, cabeceras, bytes) sin lanzar en 4xx/5xx."""
    h = {}
    if cuerpo is not None:
        datos, h["Content-Type"] = json.dumps(cuerpo).encode(), "application/json"
    if tipo:
        h["Content-Type"] = tipo
    req = urllib.request.Request(url, data=datos, method=metodo, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()
    except (urllib.error.URLError, OSError) as e:
        raise Falla(f"no responde {url} ({getattr(e, 'reason', e)}). ¿Está arrancado?")


def js(b: bytes) -> dict:
    try:
        return json.loads(b)
    except ValueError:
        return {}


def error_de(b: bytes) -> str:
    e = js(b).get("error", "")
    return e.get("message", "") if isinstance(e, dict) else str(e)


def personalidad() -> dict:
    try:
        return json.loads((ROBO_DIR / "personalidad.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise Falla("no existe o no es JSON válido: trabajo/robo/personalidad.json")


def valor_del_plan(dato: str, defecto: str) -> str:
    try:
        for linea in PLAN.read_text(encoding="utf-8").splitlines():
            if linea.startswith(f"| `{dato}` |"):
                v = [c.strip() for c in linea.strip().strip("|").split("|")][-1]
                return v if v and "<<" not in v else defecto
    except OSError:
        pass
    return defecto


def revisar(que: str) -> str:
    r = subprocess.run([sys.executable, str(KIT / "herramientas" / "revisar.py"), que], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode:
        raise Falla((r.stdout + r.stderr).strip().splitlines()[-1])
    return r.stdout.strip().splitlines()[-1]


def en_robo(codigo: str) -> str:
    """Corre Python dentro de trabajo/robo (como «cd trabajo/robo && python -c ...»)."""
    env = {**os.environ, "PYTHONUTF8": "1", "OSITO_TOKEN": os.environ.get("OSITO_TOKEN") or "local",
           "JMD_URL": os.environ.get("JMD_URL") or AULA, "IMAGEN_URL": os.environ.get("IMAGEN_URL") or AULA + "/imagen"}
    r = subprocess.run([sys.executable, "-c", codigo], cwd=ROBO_DIR, capture_output=True, text=True, env=env,
                       encoding="utf-8", errors="replace", timeout=180)
    if r.returncode:
        raise Falla((r.stderr or r.stdout).strip().splitlines()[-1][:200])
    return r.stdout.strip().splitlines()[-1]


# ---------------------------------------------------------------- un criterio por tarea


def f0_t1():
    n = len(re.findall(r"<<[A-Z0-9_]*>>", PLAN.read_text(encoding="utf-8")))
    if n:
        raise Falla(f"quedan {n} marcadores <<...>> sin tu valor en el plan")
    return "0 marcadores"


def f0_t2():
    if not os.environ.get("OSITO_TOKEN"):
        raise Falla("falta OSITO_TOKEN: prepara la terminal con . ./entorno.sh (Windows: . .\\entorno.ps1)")
    s, _, b = http("GET", AULA + "/health", timeout=20)
    if s != 200:
        raise Falla(f"/health da {s}: {js(b).get('mensaje', '')}")
    s, _, b = http("GET", AULA + "/imagen/salud", timeout=20)
    d = js(b)
    if s != 200 or not d.get("maxima") or d.get("calidades", {}).get("baja"):
        raise Falla(f"/imagen/salud: {b[:160]!r}")
    return "token-ok · health 200 · maxima ok · " + revisar("personalidad")


def f1_t1():
    p = personalidad()
    salida = en_robo(f"import cerebro, json; print(json.dumps(cerebro.chat({p['faq'][0]['p']!r}, [])))")
    texto, animo = json.loads(salida)
    if not texto or animo not in ANIMOS:
        raise Falla(f"chat devolvió {salida[:120]}")
    return f"({texto[:50]!r}..., {animo!r})"


def f1_t2():
    p = personalidad()
    s, _, b = http("GET", ROBO + "/api/salud", timeout=30)
    d = js(b)
    if s != 200 or not d.get("llm") or d.get("nombre") != p.get("nombre"):
        raise Falla(f"/api/salud: {b[:160]!r}")
    s, _, b = http("POST", ROBO + "/api/chat", {"mensaje": p["faq"][0]["p"], "historial": []})
    d = js(b)
    if s != 200 or not d.get("texto") or d.get("animo") not in ANIMOS:
        raise Falla(f"/api/chat {s}: {b[:160]!r}")
    s, _, _ = http("POST", ROBO + "/api/chat", {"mensaje": "", "historial": []})
    if s != 422:
        raise Falla(f"mensaje vacío debía dar 422 y dio {s}")
    return f"llm true · animo={d['animo']} · vacío 422"


def f2_t1():
    s, _, b = http("GET", ROBO + "/", timeout=20)
    if s != 200 or b.count(b'id="robot"') != 1:
        raise Falla('la página no tiene un id="robot"')
    return 'id="robot" presente'


def f2_t2():
    return revisar("personalidad") + " · " + revisar("modulos")


def f3_t1():
    app = (ROBO_DIR / "app.js").read_text(encoding="utf-8")
    html = (ROBO_DIR / "index.html").read_text(encoding="utf-8")
    if not re.search(r"vozActiva\s*=\s*false", app) or "Voz: apagada" not in html:
        raise Falla("la voz debe arrancar apagada (vozActiva = false y botón «Voz: apagada»)")
    return "voz apagada al cargar"


def f3_t2():
    wav = (KIT / "herramientas" / "prueba-voz.wav").read_bytes()
    s, _, b = http("POST", ROBO + "/api/stt", datos=wav, tipo="audio/wav")
    d = js(b)
    if s != 200 or "horario" not in d.get("texto", "").lower():
        raise Falla(f"/api/stt {s}: {b[:160]!r}")
    return f"«{d['texto']}» en {d.get('segundos')} s"


def f3_t3():
    s, h, b = http("POST", ROBO + "/api/voz", {"texto": "Hola"}, timeout=60)
    if s != 200 or len(b) <= 1000:
        raise Falla(f"/api/voz {s}, {len(b)} bytes: {error_de(b)}")
    return f"200 · {len(b)} bytes"


def f4_t1():
    pedido = valor_del_plan("PEDIDO_DE_IMAGEN", "un robot amable saludando")
    s, _, b = http("POST", ROBO + "/api/imagen", {"prompt": pedido, "tipo": "imagen", "calidad": "maxima"})
    d = js(b)
    if s == 429 and "cupo" in error_de(b):
        resultado = "sin cupo hoy (429) y Robo lo explicó"
    elif s != 200 or not d.get("url") or not str(d.get("motor", "")).startswith("nube-maxima"):
        raise Falla(f"/api/imagen {s}: {b[:200]!r}")
    else:
        s2, h, _ = http("GET", f"{ROBO}/{d['url']}", timeout=20)
        tipo = {k.lower(): v for k, v in h.items()}.get("content-type", "")
        if s2 != 200 or tipo != "image/jpeg":
            raise Falla(f"{d['url']} da {s2} {tipo}")
        resultado = f"{d['motor']} en {d['segundos']} s · 200 image/jpeg"
    s, _, b = http("POST", ROBO + "/api/imagen", {"prompt": "x", "tipo": "imagen", "calidad": "baja"})
    if s != 422 or "no está disponible" not in error_de(b):
        raise Falla(f"calidad baja debía dar 422 «no está disponible» y dio {s}: {b[:120]!r}")
    return resultado + " · baja 422 no disponible"


def f4_t2():
    html = (ROBO_DIR / "index.html").read_text(encoding="utf-8")
    opciones = dict(re.findall(r'<option value="(\w+)"([^>]*)>', html))
    if "maxima" not in opciones or "disabled" in opciones["maxima"]:
        raise Falla("el selector debe ofrecer «maxima»")
    if any(c in opciones and "disabled" not in opciones[c] for c in ("baja", "media")):
        raise Falla("baja y media deben salir deshabilitadas («no disponible»)")
    s, _, _ = http("POST", ROBO + "/api/imagen", {"prompt": "x", "calidad": "ultra"})
    if s != 422:
        raise Falla(f"calidad «ultra» debía dar 422 y dio {s}")
    return "selector solo con máxima · ultra 422"


def _fecha_hora_precio(pedido: str) -> dict:
    out = {}
    m = re.search(r"(\d{1,2})\s+de\s+([a-záéíóúñ]+)", pedido, re.I)
    if m:
        out["fecha"] = f"{m.group(1)} de {m.group(2).lower()}"
    m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?\s*m\.?|p\.?\s*m\.?)", pedido, re.I)
    if m:
        out["hora"] = f"{m.group(1)}:{m.group(2) or '00'} {re.sub(r'[. ]', '', m.group(3)).lower()}"
    m = re.search(r"(?:s/\.?\s*|soles?\s*)(\d+)|(\d+)\s*soles", pedido, re.I)
    if m:
        out["precio"] = f"S/ {m.group(1) or m.group(2)}"
    return out


def _comparar(datos: dict, pedido: str):
    esperado = _fecha_hora_precio(pedido)
    for k, v in esperado.items():
        ok = datos.get(k, "").endswith(v) if k == "fecha" else datos.get(k) == v
        if not ok:
            raise Falla(f"{k}: el pedido dice «{v}» y salió «{datos.get(k)}»")


def f5_t1():
    pedido = valor_del_plan("PEDIDO_DE_FLYER", FLYER_DEFECTO)
    datos = json.loads(en_robo(f"import flyer, json; print(json.dumps(flyer.extraer({pedido!r}), ensure_ascii=False))"))
    _comparar(datos, pedido)
    return f"{datos.get('fecha')} · {datos.get('hora')} · {datos.get('precio')}"


def f5_t2():
    pedido = valor_del_plan("PEDIDO_DE_FLYER", FLYER_DEFECTO)
    s, _, b = http("POST", ROBO + "/api/imagen", {"prompt": pedido, "tipo": "flyer", "calidad": "maxima"})
    d = js(b)
    if s != 200 or "datos" not in d:
        raise Falla(f"/api/imagen flyer {s}: {b[:200]!r}")
    _comparar(d["datos"], pedido)
    from PIL import Image

    tam = Image.open(ROBO_DIR / d["url"]).size
    if tam != (1080, 1350):
        raise Falla(f"el flyer mide {tam} y debe medir (1080, 1350)")
    return f"datos exactos · {tam} · {d['motor']}"


def f6_t1():
    r = subprocess.run([sys.executable, "pruebas.py", ROBO], cwd=ROBO_DIR, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env={**os.environ, "PYTHONUTF8": "1"}, timeout=900)
    print(r.stdout)
    if r.returncode:
        raise Falla(f"pruebas.py salió con código {r.returncode}")
    return "código=0"


def f6_t2():
    m = ROBO_DIR / "MEDICIONES.md"
    if not m.is_file():
        raise Falla("falta trabajo/robo/MEDICIONES.md")
    texto = m.read_text(encoding="utf-8")
    filas = [l for l in texto.splitlines() if l.startswith("|") and not set(l) <= set("|-: ")]
    if len(filas) < 4 or "mejora" not in texto.lower():
        raise Falla("MEDICIONES.md necesita 3 tareas con su tiempo y UNA mejora")
    return f"{len(filas) - 1} filas y una mejora"


CRITERIOS = {
    "F0-T1": f0_t1, "F0-T2": f0_t2, "F1-T1": f1_t1, "F1-T2": f1_t2, "F2-T1": f2_t1, "F2-T2": f2_t2,
    "F3-T1": f3_t1, "F3-T2": f3_t2, "F3-T3": f3_t3, "F4-T1": f4_t1, "F4-T2": f4_t2, "F5-T1": f5_t1,
    "F5-T2": f5_t2, "F6-T1": f6_t1, "F6-T2": f6_t2,
}
A_MANO = {
    "F2-T1": "en el visor, tu avatar pasa a «pensando» al preguntar y luego cambia de ánimo",
    "F2-T2": "en el visor (F12, consola): robot.tipo y robot.color coinciden con personalidad.json; el título es tu nombre",
    "F3-T1": "en el visor, al encender el parlante el robot habla",
    "F3-T2": "en el visor: Mic, hablas, Detener; el texto aparece en la caja antes de enviar",
    "F4-T2": "en el visor, el pedido de imagen sale en el chat con motor y segundos",
    "F5-T2": "en el visor, lee en el flyer la fecha, la hora y el precio",
}


def puerto_libre(n: int) -> bool:
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", n)) != 0


def como_ver_puerto(n: int) -> str:
    return f"netstat -ano | findstr :{n}" if os.name == "nt" else f"lsof -i :{n}"


def correr(tid: str) -> bool:
    t0 = time.time()
    try:
        detalle, ok = CRITERIOS[tid](), True
    except Falla as e:
        detalle, ok = str(e), False
    except Exception as e:  # el criterio mismo no debe reventar sin explicar
        detalle, ok = f"{type(e).__name__}: {e}", False
    print(f"{tid}: {'PASA' if ok else 'FALLA'} ({time.time() - t0:.1f} s) · {detalle}")
    if ok and tid in A_MANO:
        print(f"       a mano: {A_MANO[tid]}")
    return ok


if __name__ == "__main__":
    args = [a.upper() if a.lower().startswith("f") else a for a in sys.argv[1:]]
    if args[:1] == ["puerto"] and len(args) == 2:
        n = int(args[1])
        if puerto_libre(n):
            print(f"el puerto {n} está libre")
            sys.exit(0)
        print(f"el puerto {n} está ocupado. Para ver qué programa lo usa: {como_ver_puerto(n)}")
        sys.exit(1)
    if args[:1] == ["todo"]:
        resultados = [correr(t) for t in CRITERIOS]
        print(f"\n{sum(resultados)} de {len(resultados)} criterios pasan")
        sys.exit(0 if all(resultados) else 1)
    if len(args) == 1 and args[0] in CRITERIOS:
        sys.exit(0 if correr(args[0]) else 1)
    print(__doc__)
    sys.exit(2)
