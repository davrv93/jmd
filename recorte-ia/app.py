"""Recorte con IA para las escenas LIVE del LMS (jmd-learn.online/recorte/).
POST /quitar con una imagen (PNG, JPEG o WebP; hasta 12 MB) → PNG con el fondo transparente.
Modelo IS-Net general (el mismo «isnet-general-use» de rembg) con onnxruntime, sin rembg: menos disco y RAM.
Una imagen a la vez (2 vCPU) y un tope por IP para que nadie acapare el servidor.

Recorte SEGURO (por defecto, ?modo=seguro): nunca borra partes del personaje.
  1. La probabilidad del modelo no se usa como alfa (antes: zonas a 0,3–0,6 quedaban medio transparentes).
     Se binariza con histéresis: semillas ≥ 0,5 y crecimiento ≥ 0,08 conectado a una semilla.
  2. Si el borde de la imagen es un fondo liso (o degradado suave, como el que pide FLUX para sprites),
     también se recorta por color (relleno desde los bordes con tolerancia) y se toma la UNIÓN.
  3. Se queda la pieza principal, las que la tocan y las grandes (hojas de sprites); se borran motas.
  4. Se rellenan los huecos interiores: dentro del personaje no queda ningún agujero.
  5. Solo el contorno se suaviza (1–2 px); el interior queda 100 % opaco.
?modo=preciso: igual, pero deja abiertos los huecos que el modelo Y el color dan por fondo
(el aro de una taza, el espacio entre brazo y cuerpo) y suaviza el borde con la probabilidad del modelo."""
import io, os, threading, time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps
from scipy import ndimage as ndi

MODELO = os.environ.get("MODELO", "/modelo/isnet-general-use.onnx")
LADO, MAX_BYTES, MAX_SALIDA = 1024, 12 * 1024 * 1024, 2000
opts = ort.SessionOptions(); opts.intra_op_num_threads = 2; opts.inter_op_num_threads = 1
opts.enable_cpu_mem_arena = False; opts.enable_mem_pattern = False   # menos pico de RAM (el contenedor tiene tope)
SES = ort.InferenceSession(MODELO, opts, providers=["CPUExecutionProvider"])
ENTRADA = SES.get_inputs()[0].name
UNO = threading.Semaphore(1)
POR_IP, VENTANA, TOPE = defaultdict(deque), 600, 30   # 30 recortes cada 10 minutos por IP
ALTO, BAJO = 0.5, 0.08          # histéresis sobre la probabilidad del modelo
OCHO = np.ones((3, 3), bool)     # vecindad de 8


def probabilidad(img):
    """Probabilidad de «personaje» del IS-Net, del tamaño de la imagen (float32 0..1)."""
    rgb = img.convert("RGB").resize((LADO, LADO), Image.BILINEAR)
    a = np.asarray(rgb, dtype=np.float32)
    a = a / max(float(a.max()), 1e-6) - 0.5                      # normalización de IS-Net: media 0.5, desvío 1
    x = a.transpose(2, 0, 1)[None, ...].astype(np.float32)
    pred = SES.run(None, {ENTRADA: x})[0][0, 0]
    mi, ma = float(pred.min()), float(pred.max())
    pred = (pred - mi) / max(ma - mi, 1e-6)
    p = Image.fromarray(pred.astype(np.float32), "F").resize(img.size, Image.BILINEAR)
    return np.clip(np.asarray(p, dtype=np.float32), 0, 1)


def fondo_por_color(rgb, p):
    """Si el borde es un fondo liso o un degradado suave, devuelve (fondo, distancia, tol); si no, None.
    Ajusta por canal un polinomio de grado 2 más un término radial (viñeteo) a los píxeles del borde y a los que
    el modelo da por fondo seguro, y llama fondo a lo parecido a ese ajuste que esté conectado con el borde."""
    h, w, _ = rgb.shape
    if min(h, w) < 16:
        return None
    k = max(2, min(h, w) // 200)
    borde = np.zeros((h, w), bool); borde[:k] = borde[-k:] = True; borde[:, :k] = borde[:, -k:] = True
    ys, xs = np.nonzero(borde)
    paso = max(1, len(ys) // 20000); ys, xs = ys[::paso], xs[::paso]
    fy, fx = np.nonzero(p < 0.03)                         # fondo seguro según el modelo, para el interior del ajuste
    paso = max(1, len(fy) // 20000); fy, fx = fy[::paso], fx[::paso]
    def base(yy, xx):
        u = xx.astype(np.float32) / (w - 1) * 2 - 1; v = yy.astype(np.float32) / (h - 1) * 2 - 1
        return np.stack([np.ones_like(u), u, v, u * u, v * v, u * v, np.sqrt(u * u + v * v)], -1)
    nb = len(ys); ys, xs = np.concatenate([ys, fy]), np.concatenate([xs, fx])
    A, c = base(ys, xs), rgb[ys, xs].astype(np.float32)
    usar = np.ones(len(c), bool)
    for _ in range(3):                                    # ajuste robusto: el personaje puede tocar el borde
        coef = np.linalg.lstsq(A[usar], c[usar], rcond=None)[0]
        r = np.linalg.norm(A @ coef - c, axis=1)
        usar = r < max(12.0, 2.5 * float(np.median(r[usar])))
        if usar.sum() < 50:
            return None
    r = r[:nb]                                            # el «liso o no» lo decide solo el borde
    if (r < 20).mean() < 0.80:                           # el borde no es liso: foto con escena, no hay fondo por color
        return None
    tol = float(np.clip(2.0 * np.percentile(r[r < 20], 90) + 12, 18, 40))
    yy, xx = np.mgrid[0:h, 0:w]
    ajuste = (base(yy.ravel(), xx.ravel()) @ coef).reshape(h, w, 3)
    d = np.linalg.norm(rgb.astype(np.float32) - ajuste, axis=2)
    parecido = d < tol
    lab, n = ndi.label(parecido, OCHO)
    toca = np.unique(lab[borde & parecido]); toca = toca[toca > 0]
    return np.isin(lab, toca), d, tol, ajuste


def es_croma(ajuste):
    c = np.median(ajuste.reshape(-1, 3), axis=0)
    return float(c.max()) >= 90 and (float(c.max()) - float(c.min())) / float(c.max()) >= 0.55


def desteñir(img, rgb, m, alfa, ajuste, tol):
    """Solo en el contorno (3 px hacia dentro, 2 px hacia fuera): color sin el tinte del fondo (sin aureola verde ni
    gris), estimando la mezcla entre el personaje (el píxel interior más cercano) y el fondo ajustado. Hacia fuera,
    el alfa sale de esa mezcla; hacia dentro el alfa no baja nunca (el personaje queda 100 % opaco).
    Solo cambia un píxel si su color ES esa mezcla; si es un tercer color (pelo blanco junto a pelaje naranja)
    o el personaje se parece al fondo, no se toca. El interior nunca se toca."""
    interior = ndi.binary_erosion(m, OCHO, iterations=3)   # el color «limpio» se toma de 3 px hacia dentro
    if not interior.any():
        interior = ndi.binary_erosion(m, OCHO, iterations=1)
    banda = ndi.binary_dilation(m, OCHO, iterations=2) & ~interior
    if not interior.any() or not banda.any():
        return alfa, img
    _, (iy, ix) = ndi.distance_transform_edt(~interior, return_indices=True)
    by, bx = np.nonzero(banda)
    C = rgb[by, bx].astype(np.float32); B = ajuste[by, bx].astype(np.float32); F = rgb[iy[by, bx], ix[by, bx]].astype(np.float32)
    FB = F - B; n2 = (FB * FB).sum(1)
    distinto = n2 >= (1.5 * tol) ** 2                     # personaje y fondo de colores distintos: se puede medir
    a = np.clip(((C - B) * FB).sum(1) / np.maximum(n2, 1.0), 0, 1)
    resto = np.linalg.norm(C - (B + a[:, None] * FB), axis=1)
    distinto &= resto < max(tol, 0.12 * float(np.sqrt(np.median(n2))))   # el color se explica como mezcla fondo-personaje
    dentro = m[by, bx]                                    # dentro del personaje el alfa NO baja: solo se quita el tinte
    alfa = alfa.copy(); alfa[by, bx] = np.where(distinto & ~dentro, a, alfa[by, bx])
    limpio = np.clip(B + (C - B) / np.maximum(a, 0.05)[:, None], 0, 255)
    limpio = np.where((dentro & (a < 0.3))[:, None], F, limpio)   # casi todo fondo pero es personaje: color del vecino
    nuevo = np.where((distinto & (a < 0.98))[:, None], limpio, C)
    if es_croma(ajuste):                                  # despill clásico: el canal del croma no supera a los otros dos
        k = int(np.argmax(np.median(ajuste.reshape(-1, 3), axis=0))); o = [i for i in range(3) if i != k]
        nuevo[:, k] = np.minimum(nuevo[:, k], np.maximum(nuevo[:, o[0]], nuevo[:, o[1]]))
    px = np.asarray(img).copy(); px[by, bx, :3] = nuevo.astype(np.uint8)
    return alfa, Image.fromarray(px, "RGBA")


def recortar(datos, modo="seguro"):
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(datos))).convert("RGBA")
    if max(img.size) > MAX_SALIDA:
        img.thumbnail((MAX_SALIDA, MAX_SALIDA), Image.LANCZOS)
    w, h = img.size; area = w * h
    rgb = np.asarray(img.convert("RGB"))
    p = probabilidad(img)

    # 1. Máscara del modelo con histéresis: lo que crece desde una semilla segura es personaje entero.
    lab, n = ndi.label(p >= BAJO, OCHO)
    sem = np.unique(lab[p >= ALTO]); sem = sem[sem > 0]
    m = np.isin(lab, sem)

    # 2. Recorte por color si el fondo es liso: el personaje es la UNIÓN de los dos.
    fc = fondo_por_color(rgb, p)
    if fc is not None:
        fondo, d, tol, ajuste = fc
        if es_croma(ajuste):                              # croma: lo de color croma es fondo aunque esté encerrado
            fondo = fondo | (d < tol)
        col = ndi.binary_opening(~fondo, OCHO)           # quita el grano de compresión de 1 px sobre el fondo
        if col.sum() > 2.5 * m.sum() + 0.02 * area:       # el color se desbordó (fondo que no era liso): no se usa
            fc = None
        else:
            m |= col

    # 3. Piezas: la principal, las que la tocan, las grandes; fuera motas lejanas y pequeñas.
    lab, n = ndi.label(m, OCHO)
    if n == 0:
        m = p >= ALTO; lab, n = ndi.label(m, OCHO)
    if n > 1:
        tam = np.bincount(lab.ravel())[1:]
        mayor = int(np.argmax(tam)) + 1
        r = max(3, int(0.012 * max(w, h)))
        cerca = ndi.maximum_filter((lab == mayor).astype(np.uint8), size=2 * r + 1) > 0
        pmax = ndi.maximum(p, lab, index=np.arange(1, n + 1))
        junto = np.bincount(lab[cerca].ravel(), minlength=n + 1)[1:] > 0
        ok = (tam >= 0.0005 * area) | (tam >= 0.05 * tam.max()) | junto | ((tam >= 0.0001 * area) & (pmax >= 0.9))
        m = np.isin(lab, np.nonzero(ok)[0] + 1)

    # 4. Huecos interiores: rellenos en «seguro» (salvo croma puro que el modelo también da por fondo).
    lleno = ndi.binary_fill_holes(m)
    # Fondo de croma (verde, azul, magenta saturado): ningún personaje lleva ese color, así que un hueco que es
    # croma puro Y que el modelo da por fondo (el verde entre las patas) se abre también en «seguro».
    croma = fc is not None and es_croma(ajuste)
    if modo == "preciso" or croma:
        hl, hn = ndi.label(lleno & ~m, OCHO)
        if hn:
            fondo_ia = ndi.mean((p < 0.05).astype(np.float32), hl, index=np.arange(1, hn + 1))
            fondo_col = (ndi.mean((d < tol).astype(np.float32), hl, index=np.arange(1, hn + 1))
                         if fc is not None else np.ones(hn, np.float32))
            tam = np.bincount(hl.ravel(), minlength=hn + 1)[1:]
            abrir = (fondo_ia >= 0.95) & (fondo_col >= 0.90) & (tam >= (20 if croma and modo != "preciso" else 0.0005 * area))
            lleno &= ~np.isin(hl, np.nonzero(abrir)[0] + 1)
    m = lleno

    # 5. Borde: todo el personaje va a 255; el suavizado (1–2 px) cae hacia fuera, sobre el contorno.
    suave = ndi.gaussian_filter(m.astype(np.float32), 0.8)
    if modo == "preciso":                                  # contorno con la probabilidad del modelo (pelo, bordes finos)
        filo = m & ~ndi.binary_erosion(m, OCHO, iterations=1)
        alfa = np.where(filo, np.clip(np.maximum(p, 0.5), 0, 1), np.where(m, 1.0, suave))
    else:
        alfa = np.where(m, 1.0, suave)
    if fc is not None:                                     # fondo liso: sin aureola del color de fondo en el contorno
        alfa, img = desteñir(img, rgb, m, alfa, ajuste, tol)
    alfa = (np.clip(alfa, 0, 1) * 255 + 0.5).astype(np.uint8)
    alfa = np.minimum(alfa, np.asarray(img.getchannel("A")))
    img.putalpha(Image.fromarray(alfa, "L"))
    out = io.BytesIO(); img.save(out, "PNG", optimize=False)
    return out.getvalue(), fc is not None


class H(BaseHTTPRequestHandler):
    def _r(self, code, cuerpo, tipo="application/json", extra=None):
        self.send_response(code); self.send_header("Content-Type", tipo); self.send_header("Content-Length", str(len(cuerpo)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(cuerpo)

    def do_GET(self):
        ruta = urlsplit(self.path).path.rstrip("/")
        self._r(200, b'{"ok":true}') if ruta in ("", "/salud") else self._r(404, b'{"error":"no existe"}')

    def do_POST(self):
        u = urlsplit(self.path)
        if u.path.rstrip("/") != "/quitar":
            return self._r(404, b'{"error":"no existe"}')
        modo = (parse_qs(u.query).get("modo") or ["seguro"])[0]
        modo = modo if modo in ("seguro", "preciso") else "seguro"
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        ahora, q = time.time(), POR_IP[ip]
        while q and ahora - q[0] > VENTANA: q.popleft()
        if len(q) >= TOPE:
            return self._r(429, '{"error":"Demasiados recortes seguidos: espera unos minutos."}'.encode())
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BYTES:
            return self._r(413, '{"error":"La imagen debe pesar menos de 12 MB."}'.encode())
        datos = self.rfile.read(n)
        if not UNO.acquire(timeout=40):
            return self._r(503, '{"error":"Hay otros recortes en cola: prueba en un momento."}'.encode())
        try:
            t = time.time(); png, liso = recortar(datos, modo); q.append(ahora); s = time.time() - t
            print(f"recorte {modo} {len(datos)//1024} KB → {len(png)//1024} KB en {s:.1f} s (fondo liso: {'sí' if liso else 'no'})", flush=True)
            self._r(200, png, "image/png", {"X-Recorte-Modo": modo, "X-Recorte-Fondo-Liso": "1" if liso else "0",
                                           "X-Recorte-Segundos": f"{s:.2f}"})
        except Exception as e:
            print("error", repr(e)[:200], flush=True)
            self._r(400, '{"error":"No pude leer esa imagen."}'.encode())
        finally:
            UNO.release()

    def log_message(self, *a):
        pass


def calentar():
    """La primera pasada de onnxruntime tarda ~3 veces más: se hace al arrancar, no con el primer alumno."""
    with UNO:
        t = time.time(); b = io.BytesIO(); Image.new("RGB", (512, 512), (240, 240, 240)).save(b, "PNG")
        recortar(b.getvalue()); print(f"modelo listo en {time.time() - t:.1f} s", flush=True)


if __name__ == "__main__":
    print("recorte-ia en :8000", flush=True)
    threading.Thread(target=calentar, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", 8000), H).serve_forever()
