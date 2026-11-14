"""04 · Límites: choca con el 429 a propósito, y luego aprende a no chocar.

Parte A · «a lo bruto»: pide sin pausa hasta recibir el primer 429 y muestra lo que dice el sitio
          (Retry-After, X-RateLimit-*). Se detiene en el primer 429, como haría un bot educado.
Parte B · «con modales»: espera lo que pidió el sitio y hace 30 pedidos leyendo X-RateLimit-Remaining
          y X-RateLimit-Reset para no volver a pasarse. Meta: cero 429.

    ALUMNO=tu-apodo CONTACTO=tu-correo python3 04_limites.py
    python3 04_limites.py --provocar-bloqueo   # ignora el 429 adrede para ver el 403 y su explicación (te bloquea ~1 min)
"""
import argparse
import os
import time
from collections import Counter

import httpx

LAB = os.environ.get("LAB", "https://jmd-learn.online/scraping-lab").rstrip("/")
ALUMNO = os.environ.get("ALUMNO", "sin-apodo")
CONTACTO = os.environ.get("CONTACTO", "sin-contacto")
UA = f"KitJMD-limites/1.0 ({ALUMNO}; {CONTACTO})"
URL = LAB + "/tienda?page=1"

ap = argparse.ArgumentParser()
ap.add_argument("--provocar-bloqueo", action="store_true")
ap.add_argument("--pedidos", type=int, default=30, help="pedidos de la parte B")
args = ap.parse_args()

c = httpx.Client(headers={"User-Agent": UA, "X-Alumno": ALUMNO, "Accept": "application/json"}, timeout=20)


def cab(r):
    h = r.headers
    return f"Remaining={h.get('X-RateLimit-Remaining', '?')} Reset={h.get('X-RateLimit-Reset', '-')} Retry-After={h.get('Retry-After', '-')}"


print("== Parte A · a lo bruto (sin pausa) ==")
t0, codigos, espera = time.monotonic(), Counter(), 0
for i in range(1, 200):
    r = c.get(URL)
    codigos[r.status_code] += 1
    if r.status_code != 200 or i % 5 == 0:
        print(f"  #{i:3d} {time.monotonic() - t0:5.2f} s → {r.status_code}  {cab(r)}")
    if r.status_code == 429:
        espera = int(r.headers.get("Retry-After", "10"))
        if not args.provocar_bloqueo:
            print(f"  429 tras {i} pedidos en {time.monotonic() - t0:.1f} s. El sitio dice: «{r.json()['explicacion']}»")
            break
    if r.status_code == 403:
        j = r.json()
        espera = int(r.headers.get("Retry-After", "60"))
        print(f"\n  403 BLOQUEADO hasta las {j.get('hasta')} · motivo: {j.get('motivo')}")
        print(f"  {j.get('explicacion')}")
        break
print(f"  resumen A: {dict(codigos)}")

print(f"\n== Parte B · con modales: primero espero {espera} s como pidió el sitio ==")
time.sleep(espera)
codigos, t0 = Counter(), time.monotonic()
hechos = 0
while hechos < args.pedidos:
    r = c.get(URL)
    codigos[r.status_code] += 1
    if r.status_code in (429, 403):
        e = int(r.headers.get("Retry-After", "5"))
        print(f"  {r.status_code}: espero {e} s (Retry-After)")
        time.sleep(e)
        continue
    hechos += 1
    quedan = int(r.headers.get("X-RateLimit-Remaining", "1"))
    reinicio = int(r.headers.get("X-RateLimit-Reset", "1"))
    # Si se me acaba el cupo, espero a que se renueve; si no, reparto lo que queda en el tiempo que falta.
    pausa = reinicio if quedan <= 1 else reinicio / quedan
    if hechos % 5 == 0:
        print(f"  #{hechos:3d} {time.monotonic() - t0:5.1f} s → 200  {cab(r)} · pausa {pausa:.2f} s")
    time.sleep(pausa)
print(f"  resumen B: {dict(codigos)} en {time.monotonic() - t0:.1f} s")
print("  Cero 429 = lo lograste: dejaste que el sitio marcara el ritmo." if not codigos[429] else "  Hubo 429: revisa la pausa.")

yo = c.get(LAB + "/api/yo").json()["alumno"]
print(f"\nTu ficha en el laboratorio ({yo['nick']}): {yo['pedidos']} pedidos · {yo['c429']} respuestas 429 · {yo['bloqueos']} bloqueos")
