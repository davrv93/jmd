#!/usr/bin/env python3
"""Prueba las cinco rutas del osito contra un servidor ya levantado en 8765.

Uso:  ../.venv/bin/python backend/prueba_api.py [http://127.0.0.1:8765]
No arranca nada: si el servidor no esta, lo dice y sale con codigo 1.
"""

from __future__ import annotations

import io
import struct
import sys
import time
import math

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765"


def wav_de_prueba(segundos: float = 2.0, hz: int = 16000) -> bytes:
    """Tono de 440 Hz; sirve para comprobar que el endpoint decodifica y no revienta."""
    n = int(segundos * hz)
    muestras = (int(8000 * math.sin(2 * math.pi * 440 * i / hz)) for i in range(n))
    datos = b"".join(struct.pack("<h", m) for m in muestras)
    cab = io.BytesIO()
    cab.write(b"RIFF" + struct.pack("<I", 36 + len(datos)) + b"WAVEfmt ")
    cab.write(struct.pack("<IHHIIHH", 16, 1, 1, hz, hz * 2, 2, 16))
    cab.write(b"data" + struct.pack("<I", len(datos)) + datos)
    return cab.getvalue()


def linea(nombre: str, r: httpx.Response, t0: float) -> None:
    ms = (time.perf_counter() - t0) * 1000
    cuerpo = r.text.replace("\n", " ")[:60]
    print(f"{nombre:<22} {r.status_code}  {ms:7.0f} ms  {cuerpo}")


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=180.0) as c:
        try:
            t0 = time.perf_counter()
            r = c.get("/api/salud")
        except httpx.HTTPError as e:
            print(f"no hay servidor en {BASE}: {e}")
            return 1
        linea("GET  /api/salud", r, t0)

        t0 = time.perf_counter()
        linea("GET  /api/estado", c.get("/api/estado"), t0)

        t0 = time.perf_counter()
        r = c.post("/api/chat", json={"mensaje": "hola, que puedes hacer?", "historial": []})
        linea("POST /api/chat", r, t0)

        t0 = time.perf_counter()
        r = c.post("/api/stt", files={"audio": ("prueba.wav", wav_de_prueba(), "audio/wav")})
        linea("POST /api/stt", r, t0)

        t0 = time.perf_counter()
        r = c.post("/api/imagen", json={"prompt": "Un osito programador en su taller", "estilo": "profesional"})
        linea("POST /api/imagen", r, t0)
    return 0


if __name__ == "__main__":
    sys.exit(main())
