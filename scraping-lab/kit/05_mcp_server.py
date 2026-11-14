"""05 · Tu scraper como herramienta MCP.

Un servidor MCP (FastMCP, transporte stdio) que expone la Tienda JMD de práctica a tu asistente
(Claude Code, OpenCode, Claude Desktop…). Por dentro usa la API con sesión del script 02 y respeta
Retry-After: el asistente pregunta en lenguaje natural y el scraper hace el trabajo con modales.

Herramientas:
  buscar_productos(texto, maximo)  → productos cuyo nombre, categoría o marca contiene el texto
  detalle(id)                      → ficha completa de un producto
  mi_estado()                      → tus pedidos, 429 y bloqueos según el laboratorio

Probar a mano (sin asistente):   python3 05_mcp_server.py --probar taza
Registrar en Claude Code:        claude mcp add tienda-jmd -e ALUMNO=tu-apodo -e CONTACTO=tu-correo -- python3 "$PWD/05_mcp_server.py"
(OpenCode y Claude Desktop: ver README.md)

IMPORTANTE con stdio: nunca uses print() a stdout, rompe el protocolo. Los mensajes van a stderr.
"""
import logging
import os
import re
import sys
import time

import httpx

LAB = os.environ.get("LAB", "https://jmd-learn.online/scraping-lab").rstrip("/")
ALUMNO = os.environ.get("ALUMNO", "sin-apodo")
CONTACTO = os.environ.get("CONTACTO", "sin-contacto")
UA = f"KitJMD-mcp/1.0 ({ALUMNO}; {CONTACTO})"

_cliente = None
logging.getLogger("httpx").setLevel(logging.WARNING)  # sin ruido en stderr


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def _pedir(c, metodo, url, **kw):
    for intento in range(1, 5):
        r = c.request(metodo, url, **kw)
        if r.status_code in (429, 503):
            espera = min(int(r.headers.get("Retry-After", 2 ** intento)), 30)
            log(f"{r.status_code}: espero {espera} s")
            time.sleep(espera)
            continue
        return r
    raise RuntimeError("el laboratorio no responde, intenta en un minuto")


def _sesion():
    """Inicia sesión una sola vez (CSRF + cookie + token) y reutiliza el cliente."""
    global _cliente
    if _cliente is not None:
        return _cliente
    c = httpx.Client(base_url=LAB, headers={"User-Agent": UA, "X-Alumno": ALUMNO}, timeout=20, follow_redirects=True)
    html = _pedir(c, "GET", "/login").text
    csrf = re.search(r'name="csrf_token" value="([^"]+)"', html).group(1)
    r = _pedir(c, "POST", "/login", data={"csrf_token": csrf, "usuario": ALUMNO, "clave": "practica"})
    r.raise_for_status()
    c.headers["X-Lab-Token"] = re.search(r'id="api-token">([^<]+)<', r.text).group(1)
    log(f"sesión iniciada como {ALUMNO}")
    _cliente = c
    return c


def _api(ruta, **params):
    global _cliente
    for _ in range(2):
        r = _pedir(_sesion(), "GET", ruta, params=params)
        if r.status_code == 401:          # sesión vencida: entra de nuevo
            _cliente = None
            continue
        if r.status_code == 403:
            raise RuntimeError("bloqueado por el laboratorio: " + r.json().get("motivo", ""))
        r.raise_for_status()
        return r.json()
    raise RuntimeError("no se pudo iniciar sesión")


def buscar_productos(texto: str = "", maximo: int = 10) -> list[dict]:
    """Busca productos de la Tienda JMD de práctica (datos ficticios).

    texto: palabras a buscar (inicio de palabra, sin importar tildes) en nombre, categoría, marca o descripción. Vacío = todos.
    maximo: cuántos devolver como máximo (1 a 120).
    """
    maximo = max(1, min(int(maximo), 120))
    salida, cursor = [], None
    while len(salida) < maximo:
        params = {"q": texto, "limite": min(50, maximo - len(salida))}
        if cursor:
            params["cursor"] = cursor
        datos = _api("/api/productos", **params)
        salida += [{k: p[k] for k in ("id", "nombre", "categoria", "precio", "stock", "valoracion")} for p in datos["items"]]
        cursor = datos["next_cursor"]
        if not cursor:
            break
        time.sleep(0.5)                   # con modales también dentro del asistente
    return salida


def detalle(id: int) -> dict:
    """Ficha completa de un producto de la tienda de práctica: sku, marca, precio, stock, valoración, descripción."""
    return _api(f"/api/productos/{int(id)}")


def mi_estado() -> dict:
    """Cuántos pedidos, respuestas 429 y bloqueos lleva tu apodo en el laboratorio."""
    r = httpx.get(LAB + "/api/yo", headers={"User-Agent": UA, "X-Alumno": ALUMNO}, timeout=20)
    a = r.json()["alumno"]
    return {k: a.get(k) for k in ("nick", "pedidos", "c429", "c403", "bloqueos", "items_api", "archivos", "estado")}


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--probar":
        texto = sys.argv[2] if len(sys.argv) > 2 else ""
        res = buscar_productos(texto, 5)
        log(f"buscar_productos({texto!r}, 5) → {len(res)} resultados")
        for p in res:
            log(f"  #{p['id']} {p['nombre']} · S/ {p['precio']:.2f}")
        if res:
            d = detalle(res[0]["id"])
            log(f"detalle({res[0]['id']}) → {d['sku']} · {d['marca']} · {d['descripcion'][:60]}…")
        log(f"mi_estado() → {mi_estado()}")
        raise SystemExit(0)

    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP("tienda-jmd")
    for f in (buscar_productos, detalle, mi_estado):
        mcp.tool()(f)
    mcp.run()                              # stdio por defecto
