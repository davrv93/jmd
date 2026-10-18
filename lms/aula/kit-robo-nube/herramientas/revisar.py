"""Comprobaciones del kit que el agente no puede «dar por buenas»: las corres tú y dicen sí o no.

    python herramientas/revisar.py personalidad   personalidad.json válida (nombre, color, avatar, tono, FAQ)
    python herramientas/revisar.py modulos        los módulos 3D siguen intactos y nadie los copió a trabajo/
    python herramientas/revisar.py claves         ninguna clave ni token dentro del kit
    python herramientas/revisar.py todo           las tres

Sale con código 0 si todo está bien; si no, dice qué falla y sale con 1.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):  # consola de Windows: que las tildes no revienten
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
KIT = Path(__file__).resolve().parent.parent
ROBO = KIT / "trabajo" / "robo"
MODULOS = KIT / "modulos"
NOMBRE = re.compile(r"^[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ][0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ ._-]{0,23}$")
COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
AVATARES = ("robot", "osito")
CLAVES = [
    ("token del curso", re.compile(r"jg_[A-Za-z0-9_-]{20,}")),
    ("cabecera con clave", re.compile(r"Bearer\s+(?!\$|\{|local\b)[A-Za-z0-9._-]{16,}")),
    ("clave de OpenRouter u OpenAI", re.compile(r"sk-(?:or-v1-)?[A-Za-z0-9]{20,}")),
    ("clave de Google", re.compile(r"AIza[0-9A-Za-z_-]{30,}")),
    ("JWT", re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")),
]
# Huellas de los módulos 3D: si aparecen en trabajo/, alguien los copió o los reescribió.
HUELLAS = ("export function crearRobot", "export function crearOsito", "export function montarAvatar", "RoundedBoxGeometry extends")


def personalidad() -> list[str]:
    p = ROBO / "personalidad.json"
    if not p.is_file():
        return [f"no existe {p.relative_to(KIT)}"]
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
    except ValueError as e:
        return [f"personalidad.json no es JSON válido: {e}"]
    fallos = []
    nombre = d.get("nombre", "")
    if not isinstance(nombre, str) or not NOMBRE.match(nombre) or nombre != nombre.strip():
        fallos.append(f"nombre «{nombre}»: 1 a 24 caracteres, letras, números, espacio, punto, guion; sin comillas ni etiquetas")
    if not isinstance(d.get("color"), str) or not COLOR.match(d["color"]):
        fallos.append(f"color «{d.get('color')}»: debe ser hexadecimal #rrggbb (p. ej. #2f6bff)")
    if d.get("avatar") not in AVATARES:
        fallos.append(f"avatar «{d.get('avatar')}»: robot u osito")
    for campo, tope in (("negocio", 120), ("tono", 60), ("estilo_imagen", 200)):
        v = d.get(campo, "")
        if not isinstance(v, str) or not v.strip() or len(v) > tope:
            fallos.append(f"{campo}: texto de 1 a {tope} caracteres")
    if isinstance(d.get("estilo_imagen"), str) and re.search(r"[áéíóúñ¿¡]", d["estilo_imagen"]):
        fallos.append("estilo_imagen va en INGLÉS (sin tildes ni ñ)")
    faq = d.get("faq")
    if not isinstance(faq, list) or len(faq) != 3 or not all(isinstance(f, dict) and str(f.get("p", "")).strip() and str(f.get("r", "")).strip() for f in faq):
        fallos.append("faq: exactamente 3 preguntas, cada una {\"p\": pregunta, \"r\": respuesta}")
    app = ROBO / "app.js"
    if app.is_file():
        js = app.read_text(encoding="utf-8", errors="replace")
        if "montarAvatar(" not in js:
            fallos.append("app.js no llama a montarAvatar(...)")
        html = (ROBO / "index.html").read_text(encoding="utf-8", errors="replace") if (ROBO / "index.html").is_file() else ""
        if "hue-rotate" in js or "hue-rotate" in html:
            fallos.append("el color va por montarAvatar({color}), no con filter: hue-rotate")
    if not fallos:
        print(f"personalidad ok: {nombre} · {d['avatar']} · {d['color'].lower()} · tono «{d['tono']}»")
    return fallos


def modulos() -> list[str]:
    fallos = []
    sumas = MODULOS / "SHA256SUMS"
    if not sumas.is_file():
        return ["falta modulos/SHA256SUMS (vuelve a descomprimir el kit)"]
    for linea in sumas.read_text(encoding="utf-8").splitlines():
        if not linea.strip():
            continue
        esperado, nombre = linea.split(None, 1)
        f = MODULOS / nombre.strip().lstrip("*")
        if not f.is_file():
            fallos.append(f"falta modulos/{nombre.strip()}")
        elif hashlib.sha256(f.read_bytes()).hexdigest() != esperado:
            fallos.append(f"modulos/{nombre.strip()} fue modificado: los módulos 3D no se reescriben (vuelve a copiarlo del kit)")
    trabajo = KIT / "trabajo"
    for f in trabajo.rglob("*.js") if trabajo.is_dir() else []:
        texto = f.read_text(encoding="utf-8", errors="replace")
        if f.name in ("robot.js", "osito.js", "avatar.js", "three.module.min.js", "RoundedBoxGeometry.js") or any(h in texto for h in HUELLAS):
            fallos.append(f"{f.relative_to(KIT)} es una copia de un módulo 3D: impórtalo de /api/v1/live/pa-02/comun/ en vez de copiarlo")
    if not fallos:
        print("modulos intactos")
    return fallos


def claves() -> list[str]:
    fallos = []
    for f in KIT.rglob("*"):
        if not f.is_file() or ".venv" in f.parts or f.suffix in (".jpg", ".png", ".wav", ".webp", ".pyc") or f.stat().st_size > 2_000_000:
            continue
        if f.name == "revisar.py":
            continue
        texto = f.read_text(encoding="utf-8", errors="ignore")
        for que, rx in CLAVES:
            if rx.search(texto):
                fallos.append(f"{f.relative_to(KIT)}: parece contener un {que}. Bórralo: las claves viven fuera del kit")
    if not fallos:
        print("sin claves en el kit")
    return fallos


if __name__ == "__main__":
    orden = sys.argv[1] if len(sys.argv) > 1 else "todo"
    pruebas = {"personalidad": [personalidad], "modulos": [modulos], "claves": [claves], "todo": [personalidad, modulos, claves]}
    if orden not in pruebas:
        print(__doc__)
        sys.exit(2)
    fallos = [f for prueba in pruebas[orden] for f in prueba()]
    for f in fallos:
        print("FALLA:", f)
    sys.exit(1 if fallos else 0)
