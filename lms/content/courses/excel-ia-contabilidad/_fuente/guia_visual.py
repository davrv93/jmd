# -*- coding: utf-8 -*-
"""Arma la guía visual de cada módulo (materials/guia-visual-mN/NN.webp) con las capturas de escritorio de las escenas
«01-contexto» y «03-demo» que deja probar.mjs:  python3 _fuente/guia_visual.py <carpeta-capturas>"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from construir import CURSO, MODULOS  # noqa: E402

caps = sys.argv[1]
for mid, _, nums in MODULOS:
    dest = os.path.join(CURSO, "materials", f"guia-visual-{mid}")
    os.makedirs(dest, exist_ok=True)
    for f in os.listdir(dest):
        os.remove(os.path.join(dest, f))
    k = 0
    for n in nums:
        for esc in ("01-contexto", "03-demo"):
            src = os.path.join(caps, f"ex-{n:02d}-{esc}-escritorio.png")
            k += 1
            Image.open(src).convert("RGB").save(os.path.join(dest, f"{k:02d}.webp"), "WEBP", quality=82, method=6)
    print(mid, k, "diapositivas")
