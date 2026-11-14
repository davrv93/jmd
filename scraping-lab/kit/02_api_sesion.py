"""02 · API con sesión, cursor y «saltos» (reanudar donde quedaste).

1. Inicia sesión: pide el formulario, saca el token CSRF, hace POST con la misma cookie
   y lee el token de la API (cabecera X-Lab-Token).
2. Recorre /api/productos siguiendo next_cursor hasta que llegue null.
3. Guarda cada página en productos_api.jsonl y el cursor en checkpoint_api.json.
   Si se corta (Ctrl+C, red, bloqueo), al volver a correrlo SALTA lo ya bajado y sigue desde el cursor.

    ALUMNO=tu-apodo CONTACTO=tu-correo python3 02_api_sesion.py --parar-en 2   # simula un corte tras 2 páginas
    ALUMNO=tu-apodo CONTACTO=tu-correo python3 02_api_sesion.py                # reanuda y termina
    python3 02_api_sesion.py --desde-cero --q taza                              # borra el avance; filtra por texto
"""
import argparse
import json
import os
import time
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

LAB = os.environ.get("LAB", "https://jmd-learn.online/scraping-lab").rstrip("/")
ALUMNO = os.environ.get("ALUMNO", "sin-apodo")
CONTACTO = os.environ.get("CONTACTO", "sin-contacto")
PAUSA = float(os.environ.get("PAUSA", "1.0"))
UA = f"KitJMD-api/1.0 ({ALUMNO}; {CONTACTO})"

SALIDA = Path("productos_api.jsonl")
CHECKPOINT = Path("checkpoint_api.json")

ap = argparse.ArgumentParser()
ap.add_argument("--q", default="", help="texto a buscar (vacío = todo el catálogo)")
ap.add_argument("--limite", type=int, default=20, help="productos por página (máx. 50)")
ap.add_argument("--parar-en", type=int, default=0, help="se corta a propósito tras N páginas")
ap.add_argument("--desde-cero", action="store_true", help="borra checkpoint y salida")
args = ap.parse_args()


def pedir(c, metodo, url, **kw):
    for intento in range(1, 6):
        r = c.request(metodo, url, **kw)
        if r.status_code in (429, 503):
            espera = int(r.headers.get("Retry-After", 2 ** intento))
            print(f"  {r.status_code}: espero {espera} s como pide Retry-After")
            time.sleep(espera)
            continue
        return r
    raise SystemExit("el sitio no responde: me detengo")


def iniciar_sesion():
    c = httpx.Client(base_url=LAB, headers={"User-Agent": UA, "X-Alumno": ALUMNO}, timeout=20, follow_redirects=True)
    form = BeautifulSoup(pedir(c, "GET", "/login").text, "html.parser")
    csrf = form.select_one('input[name="csrf_token"]')["value"]       # sale del HTML
    r = pedir(c, "POST", "/login", data={"csrf_token": csrf, "usuario": ALUMNO, "clave": "practica"})
    if r.status_code != 200:
        raise SystemExit(f"no se inició sesión ({r.status_code}): {r.text[:300]}")
    token = BeautifulSoup(r.text, "html.parser").select_one("#api-token").get_text(strip=True)
    c.headers["X-Lab-Token"] = token                                   # la cookie ya la guarda el cliente
    print(f"sesión iniciada como {ALUMNO} · cookie lab_sesion y token {token[:8]}… (no lo imprimas entero)")
    return c


if args.desde_cero:
    CHECKPOINT.unlink(missing_ok=True)
    SALIDA.unlink(missing_ok=True)

# Lo que ya tengo (para saltarlo) y dónde me quedé
ya = set()
if SALIDA.exists():
    for linea in SALIDA.read_text(encoding="utf-8").splitlines():
        if linea.strip():
            ya.add(json.loads(linea)["id"])
estado = json.loads(CHECKPOINT.read_text()) if CHECKPOINT.exists() else {}
if estado.get("q", "") != args.q:
    estado = {}                                     # otra búsqueda: el cursor viejo no sirve
if estado.get("terminado"):
    print(f"ya estaba completo: {len(ya)} productos en {SALIDA}. Usa --desde-cero para repetir.")
    raise SystemExit(0)
cursor = estado.get("cursor")
if cursor:
    print(f"reanudo desde el checkpoint: {len(ya)} productos ya bajados, salto directo al cursor guardado")

c = iniciar_sesion()
paginas = 0
while True:
    params = {"limite": args.limite, "q": args.q}
    if cursor:
        params["cursor"] = cursor
    r = pedir(c, "GET", "/api/productos", params=params)
    if r.status_code == 401:                         # sesión vencida: entro de nuevo y sigo con el mismo cursor
        print("  401: sesión vencida, vuelvo a entrar")
        c = iniciar_sesion()
        continue
    if r.status_code == 403:
        raise SystemExit(f"403 bloqueado: {r.json().get('motivo')} · vuelve a correrlo luego: reanudará solo")
    r.raise_for_status()
    datos = r.json()
    nuevos = [p for p in datos["items"] if p["id"] not in ya]
    with SALIDA.open("a", encoding="utf-8") as f:
        for p in nuevos:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")
            ya.add(p["id"])
    cursor = datos["next_cursor"]
    # El checkpoint se escribe DESPUÉS de guardar los datos: si se corta en medio, a lo mucho repites una página.
    CHECKPOINT.write_text(json.dumps({"cursor": cursor, "q": args.q, "terminado": cursor is None, "productos": len(ya)}))
    paginas += 1
    print(f"página {paginas}: +{len(nuevos)} nuevos ({len(datos['items']) - len(nuevos)} saltados) · {len(ya)}/{datos['total']}")
    if cursor is None:
        break
    if args.parar_en and paginas >= args.parar_en:
        print(f"corte simulado tras {paginas} páginas. Vuelve a correr el script: seguirá desde el checkpoint.")
        raise SystemExit(3)
    time.sleep(PAUSA)

print(f"Listo: {len(ya)} productos en {SALIDA} · checkpoint marcado como terminado")
