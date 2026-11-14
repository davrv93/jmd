#!/usr/bin/env python3
"""Prepara atlas Ninja Race desde Ninja_Race_Kit.

Cada pose se recorta por la frontera entre centros de frame en la lámina
original; nunca se copia un componente conectado entero a una celda vecina.
Las poses se remuestrean en alfa premultiplicado para evitar halos/transparencias
claras y se anclan por los pies. También convierte el fondo original de cinco
carriles a WebP para el canvas del juego.

Uso:
  python3 procesar_personajes.py [RUTA_DEL_KIT]
"""
import math
import os
import sys
from PIL import Image, ImageDraw

CELDA_AN, CELDA_AL = 240, 204
ALTO_OBJETIVO = 174
MARGEN_X, MARGEN_PIES = 10, 7
BANDAS = [8, 6, 4]  # RUN, JUMP/FALL, HIT
DELTA_FONDO = 24
ALTO_PERSONAJE = 60
HUECO_NUM = 40
PERSONAJES = ["ninja_joven", "ninja_chunin", "ninja_renegado"]
OBSTACULOS = ["piedra_pequena", "piedra_mediana", "tronco", "valla_baja"]

# La lámina chunin trae poses pero no imprime números. Centros revisados sobre
# el arte original 1448x1086: [RUN 8, JUMP 6, HIT 4]. No inferimos frames por
# componentes (los extremos de la capa se conectan entre sí).
CENTROS_SIN_NUMERO = {
    "ninja_chunin": [
        [115, 283, 455, 628, 800, 972, 1153, 1330],
        [136, 363, 568, 802, 1054, 1295],
        [216, 533, 834, 1154],
    ],
}


def quitar_fondo(im):
    """Vuelve transparente el fondo claro conectado al borde y sus parches planos."""
    copia = im.convert("RGB")
    marca = (255, 0, 255)
    w, h = im.size
    semillas = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
                (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for punto in semillas:
        ImageDraw.floodfill(copia, punto, marca, thresh=DELTA_FONDO)

    salida = im.convert("RGBA")
    src, dst = copia.load(), salida.load()
    fondo = im.convert("RGB").getpixel((0, 0))
    for y in range(h):
        for x in range(w):
            if src[x, y] == marca:
                dst[x, y] = (0, 0, 0, 0)
                continue
            r, g, b = dst[x, y][:3]
            # El fondo gris dentro de las siluetas no conecta al borde. Solo
            # quitar tonos casi planos del papel, no luces blancas del dibujo.
            if max(abs(r - fondo[0]), abs(g - fondo[1]), abs(b - fondo[2])) <= 8:
                dst[x, y] = (0, 0, 0, 0)
    return salida


def mascara(im):
    return im.getchannel("A").point(lambda a: 255 if a > 8 else 0).convert("1")


def componentes(m):
    """Cajas 4-conexas, usadas solo para detectar filas y números, no para recortar."""
    w, h = m.size
    pix = m.load()
    visitado = bytearray(w * h)
    cajas = []
    from collections import deque

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if visitado[idx] or not pix[x, y]:
                continue
            q = deque([(x, y)])
            visitado[idx] = 1
            x0 = x1 = x
            y0 = y1 = y
            while q:
                xx, yy = q.popleft()
                x0, x1 = min(x0, xx), max(x1, xx)
                y0, y1 = min(y0, yy), max(y1, yy)
                for nx, ny in ((xx - 1, yy), (xx + 1, yy), (xx, yy - 1), (xx, yy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not visitado[ni] and pix[nx, ny]:
                            visitado[ni] = 1
                            q.append((nx, ny))
            cajas.append((x0, x1 + 1, y0, y1 + 1, x1 + 1 - x0, y1 + 1 - y0))
    return cajas


def bandas(cajas):
    altos = sorted((c for c in cajas if c[5] >= ALTO_PERSONAJE), key=lambda c: c[2])
    grupos = []
    for c in altos:
        if grupos and c[2] < grupos[-1][1]:
            a, b, items = grupos[-1]
            grupos[-1] = (a, max(b, c[3]), items + [c])
        else:
            grupos.append((c[2], c[3], [c]))
    return grupos


def centros_numeros(cajas, y0, y1, n):
    nums = [c for c in cajas if c[2] >= y1 - 6 and c[3] <= y1 + 45
            and 12 <= c[5] <= 45 and c[4] <= 60]
    nums.sort(key=lambda c: c[0])
    grupos = []
    for c in nums:
        if grupos and c[0] - grupos[-1][1] <= HUECO_NUM:
            grupos[-1] = (grupos[-1][0], max(grupos[-1][1], c[1]))
        else:
            grupos.append((c[0], c[1]))
    if len(grupos) != n:
        return None
    return [(a + b) / 2 for a, b in grupos]


def centros_fallback(nombre, fila, pose, n, w):
    if nombre in CENTROS_SIN_NUMERO:
        return CENTROS_SIN_NUMERO[nombre][fila]
    xs = sorted((c[0] + c[1]) / 2 for c in pose)
    if len(xs) == n:
        return xs
    return [(i + .5) * w / n for i in range(n)]


def bordes_en_hueco(m, centros, y0, y1):
    """Busca corte real de tinta cerca del punto medio entre poses.

    El punto medio entre números a veces atraviesa una capa o un brazo. Mover
    corte a columna vacía evita que píxeles de frame vecino acaben en atlas.
    """
    w = m.width
    alpha = m.load()
    columnas = []
    for x in range(w):
        columnas.append(sum(1 for y in range(y0, y1) if alpha[x, y]))
    bordes = [0]
    for i in range(len(centros) - 1):
        medio = (centros[i] + centros[i + 1]) / 2
        radio = max(12, min(48, (centros[i + 1] - centros[i]) * .28))
        izq = max(bordes[-1] + 1, int(medio - radio))
        der = min(w - 1, int(medio + radio))
        candidatos = range(izq, der + 1)
        corte = min(candidatos, key=lambda x: (columnas[x], abs(x - medio)))
        bordes.append(corte)
    bordes.append(w)
    return bordes


def quitar_fragmentos_borde(im):
    """Elimina componentes aislados pegados a borde del frame.

    Suelen ser brazo/capa de la pose contigua que invade la ranura original.
    Conserva siempre componente principal; conserva partículas internas grandes.
    """
    alpha = im.getchannel("A")
    w, h = im.size
    pix = alpha.load()
    visto = bytearray(w * h)
    componentes_frame = []
    from collections import deque

    for y in range(h):
        for x in range(w):
            k = y * w + x
            if visto[k] or pix[x, y] <= 8:
                continue
            q = deque([(x, y)])
            visto[k] = 1
            area, x0, x1, y0, y1 = 0, x, x, y, y
            puntos = []
            while q:
                xx, yy = q.popleft()
                puntos.append((xx, yy))
                area += 1
                x0, x1 = min(x0, xx), max(x1, xx)
                y0, y1 = min(y0, yy), max(y1, yy)
                for nx, ny in ((xx - 1, yy), (xx + 1, yy), (xx, yy - 1), (xx, yy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nk = ny * w + nx
                        if not visto[nk] and pix[nx, ny] > 8:
                            visto[nk] = 1
                            q.append((nx, ny))
            toca_lado = x0 == 0 or x1 == w - 1
            componentes_frame.append((area, toca_lado, puntos))

    if not componentes_frame:
        return im
    principal = max(range(len(componentes_frame)), key=lambda i: componentes_frame[i][0])
    for i, (area, toca_lado, puntos) in enumerate(componentes_frame):
        if i != principal and (toca_lado or area < 5):
            for x, y in puntos:
                pix[x, y] = 0
    im.putalpha(alpha)
    return im


def frames_de_lamina(nombre, ruta):
    original = Image.open(ruta).convert("RGBA")
    recortada = quitar_fondo(original)
    m = mascara(recortada)
    cajas = componentes(m)
    grupos = bandas(cajas)
    if len(grupos) != 3:
        raise SystemExit(f"{nombre}: encontré {len(grupos)} bandas, esperaba 3")

    frames = []
    for fila, ((by0, by1, pose), n) in enumerate(zip(grupos, BANDAS)):
        centros = centros_numeros(cajas, by0, by1, n)
        if centros is None:
            centros = centros_fallback(nombre, fila, pose, n, original.width)
        if len(centros) != n:
            raise SystemExit(f"{nombre}: fila {fila}, {len(centros)} centros; esperaba {n}")

        # Cortes en huecos reales, no a través de la caja del dibujo siguiente.
        bordes = bordes_en_hueco(m, centros, by0, by1)
        for i in range(n):
            x0 = max(0, math.floor(bordes[i]))
            x1 = min(original.width, math.ceil(bordes[i + 1]))
            # Usa la caja vertical de la pose que ocupa este slot, no toda la
            # franja: algunas láminas ponen el título de HIT demasiado cerca.
            pose_slot = [c for c in pose if c[0] < x1 and c[1] > x0]
            if not pose_slot:
                centro_slot = (centros[i])
                pose_slot = [min(pose, key=lambda c: abs((c[0] + c[1]) / 2 - centro_slot))]
            y0 = max(0, min(c[2] for c in pose_slot))
            y1 = min(original.height, max(c[3] for c in pose_slot))
            recorte = recortada.crop((x0, y0, x1, y1))
            recorte = quitar_fragmentos_borde(recorte)
            bbox = recorte.getchannel("A").getbbox()
            if not bbox:
                raise SystemExit(f"{nombre}: frame {fila}:{i} quedó vacío")
            pose_img = recorte.crop(bbox)
            caja_centro = x0 + (bbox[0] + bbox[2]) / 2
            frames.append({
                "image": pose_img,
                "centro": caja_centro,
                "ancla": (bordes[i] + bordes[i + 1]) / 2,
            })
    return frames


def guardar_atlas(todas, salida):
    max_h = max(f["image"].height for fs in todas.values() for f in fs)
    max_w = max(f["image"].width for fs in todas.values() for f in fs)
    k = min(ALTO_OBJETIVO / max_h, (CELDA_AN - MARGEN_X * 2) / max_w)
    for nombre, frames in todas.items():
        atlas = Image.new("RGBA", (CELDA_AN * len(frames), CELDA_AL), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            src = f["image"].convert("RGBA")
            w, h = max(1, round(src.width * k)), max(1, round(src.height * k))
            # Alfa premultiplicado durante el resize: evita halos claros/oscuros
            # cuando un frame tiene fondo transparente y se anima sobre la pista.
            resized = src.convert("RGBa").resize((w, h), Image.Resampling.LANCZOS).convert("RGBA")
            x = round(CELDA_AN / 2 + (f["centro"] - f["ancla"]) * k - w / 2)
            x = max(MARGEN_X, min(CELDA_AN - MARGEN_X - w, x))
            y = CELDA_AL - MARGEN_PIES - h
            celda = Image.new("RGBA", (CELDA_AN, CELDA_AL), (0, 0, 0, 0))
            celda.alpha_composite(resized, (x, y))
            atlas.alpha_composite(celda, (i * CELDA_AN, 0))
        p = os.path.join(salida, nombre + ".png")
        atlas.save(p, optimize=True)
        print(f"{p}: {len(frames)} poses, escala común x{k:.3f}, {os.path.getsize(p)//1024} KB")


def obstaculo(ruta, salida):
    im = quitar_fondo(Image.open(ruta).convert("RGBA"))
    bbox = im.getchannel("A").getbbox()
    if bbox:
        im.crop(bbox).save(salida, optimize=True)


def fondo_webp(ruta, salida):
    im = Image.open(ruta).convert("RGB")
    im.save(salida, "WEBP", quality=91, method=6)
    print(f"Fondo cinco carriles: {im.width}x{im.height}, {os.path.getsize(salida)//1024} KB")


def main():
    kit = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/Ninja_Race_Kit")
    if not os.path.isdir(kit):
        kit = "/tmp/ninjakit/Ninja_Race_Kit"
    aqui = os.path.dirname(os.path.abspath(__file__))
    hojas = os.path.join(aqui, "web", "static", "hojas")
    obs = os.path.join(aqui, "web", "static", "obstaculos")
    escenarios = os.path.join(aqui, "web", "static", "escenarios")
    for d in (hojas, obs, escenarios):
        os.makedirs(d, exist_ok=True)

    todas = {}
    for nombre in PERSONAJES:
        todas[nombre] = frames_de_lamina(nombre,
            os.path.join(kit, "assets", "personajes", nombre + ".png"))
    guardar_atlas(todas, hojas)

    for nombre in OBSTACULOS:
        obstaculo(os.path.join(kit, "assets", "obstaculos", nombre + ".png"),
                  os.path.join(obs, nombre + ".png"))
    fondo_webp(os.path.join(kit, "assets", "escenarios", "pista_cinco_carriles.png"),
               os.path.join(escenarios, "pista_cinco_carriles.webp"))


if __name__ == "__main__":
    main()
