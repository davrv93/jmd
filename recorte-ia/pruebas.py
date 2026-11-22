"""Pruebas del recorte seguro: casos reales del curso + sintéticos. Compara antes/después y arma la lámina
materials/recorte-antes-despues.png del curso «Difícil de explicar · Domingo tarde».
Falla (código 1) si algún píxel interior de un personaje con máscara de referencia no queda 100 % opaco.
  uv venv .venv && uv pip install --python .venv/bin/python onnxruntime==1.20.1 numpy==2.1.3 pillow==11.0.0 scipy==1.14.1
  curl -L -o /tmp/isnet-general-use.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx
  MODELO=/tmp/isnet-general-use.onnx .venv/bin/python pruebas.py"""
import io, os, sys, time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as ndi

AQUI = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("MODELO", "/tmp/isnet-general-use.onnx")
sys.path.insert(0, AQUI)
import app  # noqa

CURSO = os.path.join(AQUI, "..", "lms", "content", "courses", "dificil-de-explicar-domingo-tarde")
DT2 = CURSO + "/live/dt-02"


def viejo(datos):
    img = Image.open(io.BytesIO(datos)).convert("RGBA")
    rgb = img.convert("RGB").resize((1024, 1024), Image.LANCZOS)
    a = np.asarray(rgb, dtype=np.float32); a = a / max(float(a.max()), 1e-6) - 0.5
    pred = app.SES.run(None, {app.ENTRADA: a.transpose(2, 0, 1)[None].astype(np.float32)})[0][:, 0]
    pred = (pred - pred.min()) / max(pred.max() - pred.min(), 1e-6)
    mask = Image.fromarray((np.squeeze(pred) * 255).astype(np.uint8), "L").resize(img.size, Image.LANCZOS)
    alfa = np.minimum(np.asarray(img.getchannel("A")), np.asarray(mask))
    img.putalpha(Image.fromarray(alfa.astype(np.uint8)))
    return img


def a_bytes(img, fmt="WEBP", q=88):
    b = io.BytesIO(); img.save(b, fmt, quality=q) if fmt != "PNG" else img.save(b, "PNG"); return b.getvalue()


def sobre(rgba, fondo):
    """Compone un RGBA con alfa conocido sobre un fondo (color o array) → (RGB, máscara verdad)."""
    w, h = rgba.size
    if isinstance(fondo, tuple):
        base = Image.new("RGB", (w, h), fondo)
    else:
        base = fondo
    base = base.copy(); base.paste(rgba, (0, 0), rgba)
    return base, np.asarray(rgba.getchannel("A")) > 127


def degradado(w, h, c0=(250, 248, 244), c1=(205, 200, 192)):
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / 1.42
    a = np.array(c0, np.float32) * (1 - r[..., None]) + np.array(c1, np.float32) * r[..., None]
    return Image.fromarray(a.astype(np.uint8))


def personaje(w=768, h=768, contorno=True, piel=(242, 230, 218), camisa=(246, 246, 246), trazo=(34, 30, 28)):
    """Personaje sintético con zonas claras parecidas al fondo, brazos finos y ojos blancos."""
    lienzo = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(lienzo)
    s = trazo if contorno else None; ow = 4 if contorno else 0
    # brazos finos (3 px) y piernas
    d.line([(300, 360), (190, 470), (150, 430)], fill=trazo + (255,), width=3)
    d.line([(468, 360), (590, 300), (620, 250)], fill=trazo + (255,), width=3)
    d.line([(350, 560), (330, 700)], fill=trazo + (255,), width=6); d.line([(418, 560), (440, 700)], fill=trazo + (255,), width=6)
    d.rounded_rectangle([290, 330, 478, 570], 30, fill=camisa + (255,), outline=(s + (255,)) if s else None, width=ow)
    d.ellipse([270, 110, 498, 330], fill=piel + (255,), outline=(s + (255,)) if s else None, width=ow)
    for cx in (345, 423):                                       # ojos blancos con pupila
        d.ellipse([cx - 26, 180, cx + 26, 240], fill=(255, 255, 255, 255), outline=(trazo + (255,)) if contorno else None, width=2)
        d.ellipse([cx - 9, 200, cx + 9, 222], fill=(20, 20, 20, 255))
    d.arc([340, 250, 428, 300], 20, 160, fill=trazo + (255,), width=3)
    return lienzo


def casos():
    hoja = Image.open(DT2 + "/02a2-sprites-poses/hoja.webp").convert("RGBA")
    atlas = Image.open(DT2 + "/02a2-sprites-poses/atlas.png").convert("RGBA").crop((0, 0, 1280, 199))
    ninja = Image.open(DT2 + "/10-ninja-break/n_joven.webp").convert("RGBA").resize((480, 480), Image.LANCZOS)
    p1 = personaje()
    p2 = personaje(contorno=False, piel=(226, 214, 200), camisa=(214, 214, 210))
    out = [
        ("Hoja de poses sobre gris claro", *sobre(hoja, (241, 241, 241))),
        ("Hoja de poses sobre blanco", *sobre(hoja, (255, 255, 255))),
        ("Hoja de poses sobre verde", *sobre(hoja, (0, 177, 64))),
        ("Tira de sprites sobre blanco", *sobre(atlas, (252, 252, 252))),
        ("Ninja del juego sobre crema", *sobre(ninja, (244, 238, 226))),
        ("Sintético: ojos blancos, camisa clara, brazos de 3 px", *sobre(p1, (240, 240, 240))),
        ("Sintético sobre degradado (viñeteo)", *sobre(p1, degradado(768, 768))),
        ("Sintético sin contorno, tonos cercanos al fondo", *sobre(p2, (238, 236, 232))),
        ("Sintético sobre verde", *sobre(p1, (0, 177, 64))),
    ]
    reales = [("Base de ejemplo del curso", Image.open(CURSO + "/live/_comun/base-ejemplo.webp").convert("RGB"), None),
              ("Recorte con verde de la escena", Image.open(DT2 + "/02a3-sprites-recorte/verde.webp").convert("RGB"), None)]
    return out + reales


def metricas(alfa, gt):
    if gt is None:
        return None
    interior = ndi.binary_erosion(gt, iterations=2)
    fuera = ~ndi.binary_dilation(ndi.binary_fill_holes(gt), iterations=3)
    return dict(interior=int(interior.sum()), transp=int((alfa[interior] < 255).sum()),
                medio=int((alfa[interior] < 128).sum()), visible=int((alfa[interior] < 230).sum()), sobra=float((alfa[fuera] > 127).sum() / max(gt.sum(), 1)))


def tablero(w, h, c=14):
    yy, xx = np.mgrid[0:h, 0:w]
    t = (((yy // c) + (xx // c)) % 2).astype(np.uint8)
    a = np.where(t[..., None] == 1, np.array([214, 214, 214], np.uint8), np.array([250, 250, 250], np.uint8))
    return Image.fromarray(a.astype(np.uint8))


def sobre_tablero(rgba):
    base = tablero(*rgba.size).convert("RGBA"); base.alpha_composite(rgba); return base.convert("RGB")


def huecos(alfa, gt):
    """Marca en rojo los píxeles interiores del personaje que quedaron transparentes."""
    if gt is None:
        return None
    interior = ndi.binary_erosion(gt, iterations=2)
    return interior & (alfa < 230)


def main():
    filas = []; ok_total = True; tiempos = []
    for nombre, rgb, gt in casos():
        datos = a_bytes(rgb, "WEBP", 90)
        v = viejo(datos)
        t = time.time(); png, liso = app.recortar(datos, "seguro"); s = time.time() - t; tiempos.append(s)
        n = Image.open(io.BytesIO(png)).convert("RGBA")
        pr, _ = app.recortar(datos, "preciso")
        mv = metricas(np.asarray(v.getchannel("A")), gt); mn = metricas(np.asarray(n.getchannel("A")), gt)
        linea = f"{nombre[:52]:52s} liso={'sí' if liso else 'no'} {s:4.2f}s"
        if mv:
            linea += (f" | antes: {mv['transp']:6d}/{mv['interior']} interiores no opacos ({mv['medio']} bajo 50 %)"
                      f" | después: {mn['transp']} ({mn['medio']}) sobra {mn['sobra']:.3f}")
            ok_total &= mn["transp"] == 0
        print(linea, flush=True)
        filas.append((nombre, rgb, v, n, mv, mn, huecos(np.asarray(v.getchannel("A")), gt), huecos(np.asarray(n.getchannel("A")), gt)))
    print("TODOS LOS INTERIORES OPACOS:", ok_total, "| tiempo medio local", f"{np.mean(tiempos):.2f}s")
    lamina(filas)
    return ok_total


def lamina(filas):
    W = 1500; col = (W - 80) // 3; pad = 20
    try:
        f1 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 30)
        f2 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 19)
        f3 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 22)
    except OSError:
        f1 = f2 = f3 = ImageFont.load_default()
    bloques = []
    for nombre, rgb, v, n, mv, mn, hv, hn in filas:
        esc = col / rgb.size[0]; hh = int(rgb.size[1] * esc)
        if hh > 360:
            esc = 360 / rgb.size[1]; hh = 360
        ww = int(rgb.size[0] * esc)
        def celda(im, marca=None):
            c = sobre_tablero(im) if im.mode == "RGBA" else im.convert("RGB")
            if marca is not None and marca.any():
                a = np.asarray(c).copy(); mm = ndi.binary_dilation(marca, iterations=2)
                a[mm] = (225, 29, 72); c = Image.fromarray(a)
            return c.resize((ww, hh), Image.LANCZOS)
        bloques.append((nombre, celda(rgb), celda(v, hv), celda(n, hn), mv, mn, hh))
    H = 150 + sum(b[6] + 92 for b in bloques)
    L = Image.new("RGB", (W, H), (250, 248, 244)); d = ImageDraw.Draw(L)
    d.text((40, 32), "Recorte con IA: antes y después del recorte seguro", font=f1, fill=(28, 25, 23))
    d.text((40, 76), "Rojo = píxel del personaje que quedó borrado o con más de 10 % de transparencia. Tablero = zona transparente.",
           font=f2, fill=(87, 83, 78))
    for i, t in enumerate(("Imagen que se sube", "Antes: probabilidad cruda del modelo", "Ahora: recorte seguro")):
        d.text((40 + i * (col + 20), 116), t, font=f3, fill=(28, 25, 23))
    y = 150
    for nombre, c0, c1, c2, mv, mn, hh in bloques:
        d.text((40, y + 4), nombre, font=f2, fill=(28, 25, 23))
        if mv:
            d.text((40 + col + 20, y + 4), f"{mv["visible"]:,} px del personaje borrados o transparentes".replace(",", " "), font=f2,
                   fill=(190, 18, 60) if mv["visible"] else (21, 128, 61))
            d.text((40 + 2 * (col + 20), y + 4), f"{mn["visible"]:,} px del personaje borrados o transparentes".replace(",", " "), font=f2,
                   fill=(190, 18, 60) if mn["visible"] else (21, 128, 61))
        else:
            d.text((40 + col + 20, y + 4), "foto real sin máscara de referencia", font=f2, fill=(87, 83, 78))
        y += 36
        for i, c in enumerate((c0, c1, c2)):
            L.paste(c, (40 + i * (col + 20), y))
        y += hh + 56
    dest = CURSO + "/materials/recorte-antes-despues.png"
    L.save(dest, optimize=True); print("lámina:", dest, L.size)


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
