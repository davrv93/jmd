#!/usr/bin/env python3
"""construir.py — arma tu Robo a partir de asistente.json y un estilo.

    python3 construir.py --asistente asistente.json --estilo neon
    python3 construir.py --asistente asistente.json --todos

Toma el asistente de ejemplo de la clase (/opt/osito), le pone tu negocio, tu
personalidad, tus preguntas frecuentes y el estilo elegido, y deja todo en
--salida (por defecto /trabajo/mi-robo). Tus herramientas (herramientas.py)
nunca se pisan: son tu código.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ESTILOS = AQUI / "estilos"
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
ANIMOS = {"feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral"}


def estilos_disponibles() -> list[str]:
    return sorted(p.name for p in ESTILOS.iterdir() if (p / "estilo.json").exists())


# ------------------------------------------------------------------ validación


def validar(a: dict) -> list[str]:
    p: list[str] = []
    def texto(ruta: str, valor, maximo: int, obligatorio=True):
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            if obligatorio:
                p.append(f"falta «{ruta}»")
            return
        if not isinstance(valor, str):
            p.append(f"«{ruta}» debe ser texto entre comillas")
        elif len(valor) > maximo:
            p.append(f"«{ruta}» es muy largo ({len(valor)} letras; máximo {maximo})")

    texto("nombre", a.get("nombre"), 24)
    neg = a.get("negocio")
    if not isinstance(neg, dict):
        p.append("falta «negocio» con nombre, rubro y whatsapp")
        neg = {}
    texto("negocio.nombre", neg.get("nombre"), 60)
    texto("negocio.rubro", neg.get("rubro"), 80)
    wa = neg.get("whatsapp", "")
    if wa and not re.fullmatch(r"\d{9,15}", str(wa)):
        p.append("«negocio.whatsapp» van solo dígitos con código de país, por ejemplo 51986149476")
    texto("personalidad", a.get("personalidad"), 400)
    texto("saludo", a.get("saludo"), 220)
    faq = a.get("preguntas_frecuentes")
    if not isinstance(faq, list) or not faq:
        p.append("«preguntas_frecuentes» debe ser una lista con al menos una pregunta")
        faq = []
    for i, f in enumerate(faq, 1):
        if not isinstance(f, dict):
            p.append(f"la pregunta {i} debe ir entre llaves {{ }}")
            continue
        preg = f.get("preguntas") or ([f["pregunta"]] if f.get("pregunta") else [])
        if not preg or not all(isinstance(x, str) and x.strip() for x in preg):
            p.append(f"la pregunta {i} necesita «pregunta» (o una lista «preguntas»)")
        texto(f"preguntas_frecuentes[{i}].respuesta", f.get("respuesta"), 500)
        if f.get("animo") and f["animo"] not in ANIMOS:
            p.append(f"la pregunta {i}: «animo» es uno de {', '.join(sorted(ANIMOS))}")
    marca = a.get("marca") or {}
    for k in ("primario", "acento"):
        if marca.get(k) and not HEX.match(marca[k]):
            p.append(f"«marca.{k}» va en hexadecimal, por ejemplo #2f6bff")
    return p


# ------------------------------------------------------------------ piezas


def prompt_sistema(a: dict) -> str:
    neg = a["negocio"]
    datos = []
    for f in a["preguntas_frecuentes"]:
        preg = f.get("preguntas") or [f.get("pregunta")]
        datos.append(f"- {preg[0]}: {f['respuesta']}")
    contacto = ""
    if neg.get("whatsapp"):
        contacto = f"Si no sabes algo, dilo y ofrece el WhatsApp {neg['whatsapp']}."
    reglas = "\n".join(f"- {r}" for r in a.get("reglas", []))
    return f"""Eres {a['nombre']}, el asistente virtual de {neg['nombre']} ({neg['rubro']}).
Tu personalidad: {a['personalidad']}
Respondes en espanol, con frases cortas: maximo tres frases. No uses emojis.
Usa SOLO estos datos del negocio; no inventes precios, horarios ni promociones:
{chr(10).join(datos)}
{contacto}
{reglas}
Termina SIEMPRE tu respuesta con una ultima linea exactamente asi:
ANIMO: <uno de feliz|pensando|sorprendido|triste|emocionado|neutral>""".strip()


PARCHE_MOTORES = '''

# ---- s2-robo-estilos: personalidad del negocio (se lee de personalidad.json) ----
try:
    _p = json.loads((AQUI / "personalidad.json").read_text(encoding="utf-8"))
    NOMBRE = _p.get("nombre", NOMBRE)
    SYSTEM_PROMPT = _p.get("prompt", SYSTEM_PROMPT)
except FileNotFoundError:
    pass
'''

PARCHE_CHAT = '''    historial = [t.model_dump() for t in peticion.historial]
    # ---- s2-robo-estilos: primero tus herramientas (tu código, se recarga solo) ----
    try:
        import importlib
        from backend import robo_base, herramientas
        importlib.reload(herramientas)
        hecho = robo_base.responder(herramientas, peticion.mensaje)
    except Exception as e:
        import traceback
        log.exception("tus herramientas fallaron")
        marcos = [m for m in traceback.extract_tb(e.__traceback__) if m.filename.endswith("herramientas.py")]
        linea = getattr(e, "lineno", None) if isinstance(e, SyntaxError) else (marcos[-1].lineno if marcos else None)
        donde = f" en la línea {linea}" if linea else ""
        hecho = ("error", f"Mi código falló{donde} de herramientas.py: {type(e).__name__}: {e}")
    if hecho:
        nombre_h, texto_h = hecho
        animo_h = "triste" if nombre_h == "error" else "emocionado"
        return {"texto": str(texto_h), "animo": animo_h, "fuente": "herramienta", "herramienta": nombre_h}
'''

PARCHE_CODIGO = '''
# ---- s2-robo-estilos: editor de tu código (codigo.html) ----
_MIS_HERRAMIENTAS = Path(__file__).resolve().parent / "herramientas.py"


class PeticionCodigo(BaseModel):
    codigo: str = Field(..., max_length=60_000)


@app.get("/api/codigo")
def api_codigo_leer():
    return {"codigo": _MIS_HERRAMIENTAS.read_text(encoding="utf-8") if _MIS_HERRAMIENTAS.exists() else ""}


@app.post("/api/codigo")
def api_codigo_guardar(peticion: PeticionCodigo):
    try:
        compile(peticion.codigo, "herramientas.py", "exec")
    except SyntaxError as e:
        return JSONResponse({"ok": False, "linea": e.lineno, "error": f"{e.msg} (línea {e.lineno})"}, status_code=422)
    _MIS_HERRAMIENTAS.write_text(peticion.codigo, encoding="utf-8")
    return {"ok": True}


'''

ROBO_SH = '''#!/bin/sh
# robo.sh arrancar | parar | reiniciar | estado — tu Robo en el puerto 8766
cd "$(dirname "$0")" || exit 1
PID=/tmp/mi-robo.pid
PUERTO="${ROBO_PUERTO:-8766}"
vivo() { [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; }
parar() { vivo && kill "$(cat "$PID")"; rm -f "$PID"; echo parado; }
arrancar() {
  vivo && { echo "ya arrancado"; return; }
  aula parar >/dev/null 2>&1   # el asistente de ejemplo usa el mismo puerto
  OSITO_PERFIL=nube OSITO_NOMBRE=__NOMBRE__ nohup /opt/venv/bin/python -m uvicorn backend.app:app \\
    --host 0.0.0.0 --port "$PUERTO" >> /trabajo/mi-robo.log 2>&1 &
  echo $! > "$PID"; sleep 3
  if vivo; then echo "arrancado en $PUERTO: abre el visor y elige mi-robo"; else echo "no arrancó:"; tail -n 15 /trabajo/mi-robo.log; fi
}
case "${1:-estado}" in
  arrancar) arrancar ;;
  parar) parar ;;
  reiniciar) parar; sleep 1; arrancar ;;
  estado) if vivo; then echo arrancado; else echo parado; fi ;;
  *) echo "uso: sh robo.sh arrancar|parar|reiniciar|estado" >&2; exit 2 ;;
esac
'''


def reemplazar(texto: str, viejo: str, nuevo: str, archivo: str) -> str:
    if viejo not in texto:
        raise SystemExit(f"ERROR: no encontré el punto de enganche en {archivo}. ¿Cambió /opt/osito?")
    return texto.replace(viejo, nuevo, 1)


def armar_backend(a: dict, base: Path, salida: Path) -> None:
    destino = salida / "backend"
    destino.mkdir(parents=True, exist_ok=True)
    for f in (base / "backend").glob("*.py"):
        if f.name == "herramientas.py":
            continue
        shutil.copy2(f, destino / f.name)
    shutil.copy2(AQUI / "robo_base.py", destino / "robo_base.py")
    mot = (destino / "motores.py").read_text(encoding="utf-8")
    (destino / "motores.py").write_text(mot + PARCHE_MOTORES, encoding="utf-8")
    app = (destino / "app.py").read_text(encoding="utf-8")
    app = reemplazar(app, "    historial = [t.model_dump() for t in peticion.historial]\n", PARCHE_CHAT, "app.py")
    app = reemplazar(app, "# ---------------------------------------------------------------- estaticos (al final)",
                     PARCHE_CODIGO + "# ---------------------------------------------------------------- estaticos (al final)", "app.py")
    (destino / "app.py").write_text(app, encoding="utf-8")
    faq = []
    for f in a["preguntas_frecuentes"]:
        preg = f.get("preguntas") or [f["pregunta"]]
        faq.append({"preguntas": preg, "respuesta": f["respuesta"], "animo": f.get("animo", "feliz")})
    (destino / "faq.json").write_text(json.dumps(faq, ensure_ascii=False, indent=1), encoding="utf-8")
    (destino / "personalidad.json").write_text(json.dumps(
        {"nombre": a["nombre"], "prompt": prompt_sistema(a)}, ensure_ascii=False, indent=1), encoding="utf-8")
    mias = destino / "herramientas.py"
    if not mias.exists():
        texto = (AQUI / "herramientas.plantilla.py").read_text(encoding="utf-8")
        mias.write_text(texto.replace("__NEGOCIO__", a["negocio"]["nombre"]), encoding="utf-8")
        print(f"  nuevo: {mias} (tu código; ábrelo y prográmale algo)")
    else:
        print(f"  conservado: {mias} (no se pisa)")
    sh = salida / "robo.sh"
    nombre_sh = "'" + a["nombre"].replace("'", "") + "'"
    sh.write_text(ROBO_SH.replace("__NOMBRE__", nombre_sh), encoding="utf-8")
    sh.chmod(0o755)


def hex_a_0x(h: str) -> str:
    return "0x" + h.lstrip("#").lower()


def armar_frontend(a: dict, estilo: str, base: Path, destino: Path) -> None:
    conf = json.loads((ESTILOS / estilo / "estilo.json").read_text(encoding="utf-8"))
    if destino.exists():
        shutil.rmtree(destino)
    shutil.copytree(base / "frontend", destino)
    shutil.copy2(ESTILOS / estilo / "estilo.css", destino / "estilo.css")
    nombre = a["nombre"]
    marca = a.get("marca") or {}
    colores = dict(conf.get("robot", {}))
    if marca.get("primario"):
        colores["COLOR_AZUL"] = marca["primario"]
    if marca.get("acento"):
        colores["COLOR_OJO"] = marca["acento"]
    js = lambda s: json.dumps(s, ensure_ascii=False)

    html = (destino / "index.html").read_text(encoding="utf-8")
    html = re.sub(r'(<link[^>]+href="estilos\.css"[^>]*>)', r'\1\n  <link rel="stylesheet" href="estilo.css" />', html, count=1)
    html = html.replace("<title>Robo</title>", f"<title>{nombre} · {a['negocio']['nombre']}</title>", 1)
    html = html.replace('<h1 id="nombre-osito">Robo</h1>', f'<h1 id="nombre-osito">{nombre}</h1>', 1)
    html = html.replace('placeholder="Escríbele a Robo..."', f'placeholder="Escríbele a {nombre}..."', 1)
    html = html.replace("<body>", f'<body class="estilo-{estilo}">', 1)
    (destino / "index.html").write_text(html, encoding="utf-8")

    app = (destino / "app.js").read_text(encoding="utf-8")
    app = reemplazar(app, "|| 'Robo';", f"|| {js(nombre)};", "app.js")
    app = reemplazar(app, "decir(`Hola, soy ${NOMBRE_OSITO}. Puedes escribirme, hablarme por el micrófono o pedirme una imagen.`",
                     f"decir({js(a['saludo'])}", "app.js")
    app = reemplazar(app, "meta: resp.fuente === 'faq' ? 'respuesta rápida' : undefined",
                     "meta: resp.fuente === 'herramienta' ? `⚙ tu código: ${resp.herramienta}()` : resp.fuente === 'faq' ? 'respuesta rápida' : undefined", "app.js")
    (destino / "app.js").write_text(app, encoding="utf-8")

    robot = (destino / "robot.js").read_text(encoding="utf-8")
    for const, valor in colores.items():
        robot = re.sub(rf"^const {const} = 0x[0-9a-fA-F]+;", f"const {const} = {hex_a_0x(valor)};", robot, count=1, flags=re.M)
    (destino / "robot.js").write_text(robot, encoding="utf-8")


def galeria(a: dict, hechos: list[str], salida: Path) -> None:
    filas = "\n".join(
        f'<a href="{e}/index.html"><b>{e}</b><span>{json.loads((ESTILOS / e / "estilo.json").read_text(encoding="utf-8"))["descripcion"]}</span></a>'
        for e in hechos)
    (salida / "index.html").write_text(f"""<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{a['nombre']} · estilos</title>
<style>body{{font-family:system-ui,sans-serif;background:#0f1222;color:#eef1ff;margin:0;padding:32px 16px}}
h1{{margin:0 0 6px}}p{{color:#aab;margin:0 0 20px}}a{{display:block;max-width:560px;padding:16px 18px;margin:0 0 12px;border-radius:14px;
background:#1d2140;color:inherit;text-decoration:none;border:1px solid #333a66}}a:hover{{border-color:#9ad5ff}}b{{display:block;font-size:20px}}span{{color:#aab}}</style>
<h1>{a['nombre']}</h1><p>{a['negocio']['nombre']} · elige un estilo</p>{filas}
<a href="codigo.html" style="border-color:#39ff88"><b>⚙ Mi código</b><span>Programa las herramientas de {a['nombre']} en Python</span></a></html>""", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="Arma tu Robo desde asistente.json")
    ap.add_argument("--asistente", required=True)
    ap.add_argument("--estilo", choices=estilos_disponibles())
    ap.add_argument("--todos", action="store_true", help="arma todos los estilos para compararlos")
    ap.add_argument("--salida", default="/trabajo/mi-robo")
    ap.add_argument("--base", default="/opt/osito", help="asistente de ejemplo que se toma como base")
    arg = ap.parse_args()
    if not arg.estilo and not arg.todos:
        ap.error(f"elige --estilo ({', '.join(estilos_disponibles())}) o --todos")
    try:
        a = json.loads(Path(arg.asistente).read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"No encuentro {arg.asistente}. Cópialo de la plantilla: cp {AQUI}/asistente.plantilla.json asistente.json")
    except json.JSONDecodeError as e:
        sys.exit(f"El JSON está mal escrito en la línea {e.lineno}, columna {e.colno}: {e.msg}. Suele ser una coma de más o una comilla sin cerrar.")
    problemas = validar(a)
    if problemas:
        print("El asistente.json tiene problemas:")
        for x in problemas:
            print(f"  - {x}")
        sys.exit(1)
    base, salida = Path(arg.base), Path(arg.salida)
    salida.mkdir(parents=True, exist_ok=True)
    print(f"Armando a {a['nombre']} para {a['negocio']['nombre']}...")
    armar_backend(a, base, salida)
    hechos = estilos_disponibles() if arg.todos else [arg.estilo]
    for e in hechos:
        armar_frontend(a, e, base, salida / e)
        print(f"  estilo {e}: {salida / e / 'index.html'}")
    galeria(a, [p.name for p in sorted(salida.iterdir()) if (p / "estilo.css").exists()], salida)
    shutil.copy2(AQUI / "codigo.html", salida / "codigo.html")
    print("OK")
    print(f"Siguiente: sh {salida}/robo.sh reiniciar   y abre el visor en mi-robo")


if __name__ == "__main__":
    main()
