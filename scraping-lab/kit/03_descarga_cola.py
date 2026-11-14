"""03 · Descarga masiva con cola (asyncio).

- Lee la lista de 200 archivos de /api/descargas (nombre, url, tamaño y sha256).
- Mete en la cola solo los que FALTAN: si el archivo ya está y su sha256 cuadra, lo salta.
- N trabajadores sacan de la cola. Un «semáforo de ritmo» compartido reparte los pedidos para no pasar
  el límite del sitio, aunque haya muchos trabajadores.
- Reintenta 500/502/503/504 con espera exponencial (1, 2, 4, 8 s + azar) y respeta Retry-After en 429/503.
- Si llega un 403 (bloqueo), TODOS los trabajadores se detienen el tiempo que pide el sitio.
- Escribe en .part y renombra al final: un corte nunca deja un archivo a medias que parezca bueno.

    ALUMNO=tu-apodo CONTACTO=tu-correo python3 03_descarga_cola.py
    TRABAJADORES=8 python3 03_descarga_cola.py      # más trabajadores NO es más rápido: el ritmo lo pone el sitio
"""
import asyncio
import hashlib
import os
import random
import sys
import time
from pathlib import Path

import httpx

LAB = os.environ.get("LAB", "https://jmd-learn.online/scraping-lab").rstrip("/")
ALUMNO = os.environ.get("ALUMNO", "sin-apodo")
CONTACTO = os.environ.get("CONTACTO", "sin-contacto")
TRABAJADORES = int(os.environ.get("TRABAJADORES", "4"))
REINTENTOS = int(os.environ.get("REINTENTOS", "5"))
UA = f"KitJMD-cola/1.0 ({ALUMNO}; {CONTACTO})"
CARPETA = Path(os.environ.get("CARPETA", "descargas"))


class Ritmo:
    """Deja pasar un pedido cada `intervalo` segundos, compartido por todos los trabajadores."""

    def __init__(self, intervalo):
        self.intervalo = intervalo
        self.siguiente = 0.0
        self.candado = asyncio.Lock()
        self.pausa_hasta = 0.0          # la fija un 403 o un 429: frena a todos

    async def turno(self):
        async with self.candado:
            ahora = time.monotonic()
            espera = max(self.siguiente, self.pausa_hasta) - ahora
            if espera > 0:
                await asyncio.sleep(espera)
            self.siguiente = time.monotonic() + self.intervalo

    def frenar(self, segundos):
        self.pausa_hasta = max(self.pausa_hasta, time.monotonic() + segundos)


def sha256(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


class Barra:
    def __init__(self, total):
        self.total, self.ok, self.mal, self.reint, self.t0 = total, 0, 0, 0, time.monotonic()

    def pintar(self):
        hechos = self.ok + self.mal
        ancho = 30
        lleno = int(ancho * hechos / self.total) if self.total else ancho
        seg = time.monotonic() - self.t0
        sys.stderr.write(f"\r[{'#' * lleno}{'.' * (ancho - lleno)}] {hechos}/{self.total} · ok {self.ok} · fallidos {self.mal} · reintentos {self.reint} · {seg:5.1f} s ")
        sys.stderr.flush()


async def bajar(cliente, ritmo, arch, barra):
    destino = CARPETA / arch["nombre"]
    for intento in range(1, REINTENTOS + 1):
        await ritmo.turno()
        try:
            r = await cliente.get(arch["url"])
        except httpx.TransportError as e:
            r, error = None, str(e)
        if r is not None and r.status_code == 200:
            datos = r.content
            if hashlib.sha256(datos).hexdigest() != arch["sha256"]:
                error = "sha256 no cuadra"
            else:
                parcial = destino.with_suffix(".part")
                parcial.write_bytes(datos)
                parcial.replace(destino)          # atómico: o está entero o no está
                return True
        elif r is not None:
            error = f"HTTP {r.status_code}"
            if r.status_code in (429, 403) or (r.status_code == 503 and "Retry-After" in r.headers):
                espera = int(r.headers.get("Retry-After", "5"))
                ritmo.frenar(espera)              # el sitio manda: frena a TODOS
                if r.status_code == 403:
                    sys.stderr.write(f"\n403: el sitio nos bloqueó {espera} s. Todos esperan.\n")
                barra.reint += 1
                barra.pintar()
                continue
            if r.status_code not in (500, 502, 504):
                break                             # 404 y compañía: reintentar no sirve
        if intento == REINTENTOS:
            break
        espera = min(2 ** (intento - 1), 8) + random.uniform(0, 0.5)    # 1, 2, 4, 8 s + azar
        barra.reint += 1
        barra.pintar()
        await asyncio.sleep(espera)
    sys.stderr.write(f"\n  {arch['nombre']}: me rindo tras {intento} intentos ({error})\n")
    return False


async def trabajador(cola, cliente, ritmo, barra, fallidos):
    while True:
        arch = await cola.get()
        try:
            if await bajar(cliente, ritmo, arch, barra):
                barra.ok += 1
            else:
                barra.mal += 1
                fallidos.append(arch["nombre"])
            barra.pintar()
        finally:
            cola.task_done()


async def main():
    CARPETA.mkdir(exist_ok=True)
    cab = {"User-Agent": UA, "X-Alumno": ALUMNO}
    limites = httpx.Limits(max_connections=TRABAJADORES)
    async with httpx.AsyncClient(headers=cab, timeout=20, limits=limites) as cliente:
        r = await cliente.get(LAB + "/api/descargas")
        r.raise_for_status()
        lista = r.json()["archivos"]
        # El ritmo sale de las cabeceras del propio sitio: N pedidos cada V segundos (+10 % de margen).
        n = int(r.headers.get("X-RateLimit-Limit", "20"))
        v = int(r.headers.get("X-RateLimit-Window", "10"))
        ritmo = Ritmo(v / n * 1.1)
        for p in CARPETA.glob("*.part"):
            p.unlink()                            # restos de un corte anterior
        pendientes = [a for a in lista if not ((CARPETA / a["nombre"]).exists() and sha256(CARPETA / a["nombre"]) == a["sha256"])]
        saltados = len(lista) - len(pendientes)
        print(f"{len(lista)} archivos en el índice · {saltados} ya estaban (saltados) · {len(pendientes)} en cola")
        print(f"{TRABAJADORES} trabajadores · un pedido cada {ritmo.intervalo:.2f} s (límite del sitio: {n} cada {v} s)")
        if not pendientes:
            print("Nada que bajar: todo está y el sha256 cuadra.")
            return
        cola = asyncio.Queue()
        for a in pendientes:
            a["url"] = str(httpx.URL(LAB).join(a["url"]))  # la API da rutas absolutas del sitio
            cola.put_nowait(a)
        barra, fallidos = Barra(len(pendientes)), []
        tareas = [asyncio.create_task(trabajador(cola, cliente, ritmo, barra, fallidos)) for _ in range(TRABAJADORES)]
        await cola.join()
        for t in tareas:
            t.cancel()
        sys.stderr.write("\n")
        Path("fallidos.txt").write_text("\n".join(sorted(fallidos)) + ("\n" if fallidos else ""))
        print(f"Listo: {barra.ok} bajados, {saltados} saltados, {len(fallidos)} fallidos (en fallidos.txt) en {time.monotonic() - barra.t0:.0f} s")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nCortado. Vuelve a correrlo: saltará lo que ya bajaste.")
