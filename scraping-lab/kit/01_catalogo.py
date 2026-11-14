"""01 · Catálogo HTML con modales.

Recorre la Tienda JMD de práctica página por página (?page=N) siguiendo el enlace rel="next",
con pausa entre pedidos, y guarda catalogo.csv y catalogo.json.

Antes de pedir nada lee robots.txt: respeta Crawl-delay y se salta los enlaces prohibidos
(la tienda esconde uno, la «trampa» para bots que no leen las reglas).

    ALUMNO=tu-apodo CONTACTO=tu-correo@ejemplo.com python3 01_catalogo.py
"""
import csv
import json
import os
import random
import time
from urllib import robotparser
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

LAB = os.environ.get("LAB", "https://jmd-learn.online/scraping-lab").rstrip("/")
ALUMNO = os.environ.get("ALUMNO", "sin-apodo")
CONTACTO = os.environ.get("CONTACTO", "sin-contacto")
PAUSA = float(os.environ.get("PAUSA", "1.0"))
# Identifícate: quién eres y cómo contactarte. El laboratorio lo muestra en el panel.
UA = f"KitJMD-catalogo/1.0 ({ALUMNO}; {CONTACTO})"

cliente = httpx.Client(headers={"User-Agent": UA, "X-Alumno": ALUMNO}, timeout=20, follow_redirects=True)


def pedir(url):
    """GET con reintentos: si el sitio dice 429 o 503, espera lo que pide Retry-After."""
    for intento in range(1, 6):
        r = cliente.get(url)
        if r.status_code in (429, 503):
            espera = int(r.headers.get("Retry-After", 2 ** intento))
            print(f"  {r.status_code}: el sitio pide esperar {espera} s (intento {intento})")
            time.sleep(espera)
            continue
        if r.status_code == 403:
            raise SystemExit(f"403 bloqueado: {r.text[:200]}… Espera y baja el ritmo.")
        r.raise_for_status()
        return r
    raise SystemExit(f"{url} no respondió tras 5 intentos")


# 1. Reglas primero
rp = robotparser.RobotFileParser()
rp.parse(pedir(LAB + "/robots.txt").text.splitlines())
PAUSA = max(PAUSA, float(rp.crawl_delay(UA) or 0))
inicio = LAB + "/tienda?page=1"
if not rp.can_fetch(UA, inicio):
    raise SystemExit("robots.txt no permite la tienda: me detengo")
print(f"robots.txt OK · pausa de {PAUSA} s entre pedidos · como {ALUMNO}")

# 2. Páginas: sigue rel="next" hasta que no haya más
filas, url, pagina, omitidos = [], inicio, 0, set()
while url:
    pagina += 1
    html = BeautifulSoup(pedir(url).text, "html.parser")
    for li in html.select("li.producto"):
        enlace = li.select_one("a.producto-enlace")
        filas.append({
            "id": int(li["data-id"]),
            "sku": li["data-sku"],
            "nombre": li.select_one(".nombre").get_text(strip=True),
            "categoria": li.select_one(".categoria").get_text(strip=True),
            "precio": float(li.select_one(".precio")["data-precio"]),
            "stock": int(li.select_one(".stock")["data-stock"]),
            "valoracion": float(li.select_one(".valoracion")["data-valor"]),
            "url": urljoin(url, enlace["href"]),
        })
    # Cualquier enlace que robots.txt prohíba se anota y NO se visita.
    for a in html.select("a[href]"):
        destino = urljoin(url, a["href"])
        if not rp.can_fetch(UA, destino):
            omitidos.add(destino)
    print(f"página {pagina}: {len(filas)} productos")
    sig = html.select_one('a[rel="next"]')
    url = urljoin(url, sig["href"]) if sig else None
    if url:
        time.sleep(PAUSA + random.uniform(0, 0.3))  # ritmo humano, con algo de azar

for o in sorted(omitidos):
    print(f"omitido por robots.txt: {o}")

# 3. Exportar: CSV que Excel abre con tildes (utf-8-sig) y JSON legible
with open("catalogo.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
    w.writeheader()
    w.writerows(filas)
with open("catalogo.json", "w", encoding="utf-8") as f:
    json.dump(filas, f, ensure_ascii=False, indent=2)
print(f"Listo: {len(filas)} productos en catalogo.csv y catalogo.json")
