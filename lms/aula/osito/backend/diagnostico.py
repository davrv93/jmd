"""Diagnostico de la maquina del alumno: que nivel de imagen le toca y que falta.

    python backend/diagnostico.py
"""

from __future__ import annotations

import platform
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import imagen  # noqa: E402

c = imagen.capacidad()
tope = imagen.tope_por_capacidad()
hay = imagen.disponibles()

print(f"Sistema      : {platform.system()} {platform.release()} ({platform.machine()})")
print(f"Python       : {platform.python_version()}")
print(f"Acelerador   : {c['dispositivo']} - {c['nombre']}")
print(f"Memoria util : {c['memoria_gb']} GB (RAM total {c['ram_gb']} GB)")
print(f"Ollama       : {'si' if shutil.which('ollama') else 'NO instalado'}")
print()
print(f"Nivel maximo de imagen para esta maquina: {tope}")
for nombre in imagen.ORDEN:
    estado = "descargado" if nombre in hay else "falta"
    cabe = imagen.ORDEN.index(nombre) >= imagen.ORDEN.index(tope)
    print(f"  {nombre:12s} {estado:11s} {'usable' if cabe else 'no cabe aqui'}")
print()
if c["dispositivo"] == "cpu":
    print("Sin GPU usable por torch: sd-turbo tarda 20-60 s por imagen. Suficiente para la clase.")
    if "AMD" in c["nombre"] or platform.system() == "Windows":
        print("GPU AMD o Intel en Windows: torch no la usa; es normal, no pierdas tiempo con drivers.")
elif c["dispositivo"] == "cuda" and c["memoria_gb"] < 10:
    print("VRAM justa: sdxl-turbo corre con cpu offload (mas lento, pero corre).")
