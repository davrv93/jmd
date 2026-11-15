"""Recorte con IA para las escenas LIVE del LMS (jmd-learn.online/recorte/).
POST /quitar con una imagen (PNG, JPEG o WebP; hasta 12 MB) → PNG con el fondo transparente.
Modelo IS-Net general (el mismo «isnet-general-use» de rembg) con onnxruntime, sin rembg: menos disco y RAM.
Una imagen a la vez (2 vCPU) y un tope por IP para que nadie acapare el servidor."""
import io, os, threading, time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

MODELO = os.environ.get("MODELO", "/modelo/isnet-general-use.onnx")
LADO, MAX_BYTES, MAX_SALIDA = 1024, 12 * 1024 * 1024, 2000
opts = ort.SessionOptions(); opts.intra_op_num_threads = 2; opts.inter_op_num_threads = 1
opts.enable_cpu_mem_arena = False; opts.enable_mem_pattern = False   # menos pico de RAM (el contenedor tiene tope)
SES = ort.InferenceSession(MODELO, opts, providers=["CPUExecutionProvider"])
ENTRADA = SES.get_inputs()[0].name
UNO = threading.Semaphore(1)
POR_IP, VENTANA, TOPE = defaultdict(deque), 600, 30   # 30 recortes cada 10 minutos por IP


def recortar(datos):
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(datos))).convert("RGBA")
    if max(img.size) > MAX_SALIDA:
        img.thumbnail((MAX_SALIDA, MAX_SALIDA), Image.LANCZOS)
    rgb = img.convert("RGB").resize((LADO, LADO), Image.LANCZOS)
    a = np.asarray(rgb, dtype=np.float32)
    a = a / max(float(a.max()), 1e-6) - 0.5                      # normalización de IS-Net: media 0.5, desvío 1
    x = a.transpose(2, 0, 1)[None, ...].astype(np.float32)
    pred = SES.run(None, {ENTRADA: x})[0][:, 0, :, :]
    mi, ma = float(pred.min()), float(pred.max())
    pred = (pred - mi) / max(ma - mi, 1e-6)
    mask = Image.fromarray((np.squeeze(pred) * 255).astype(np.uint8), "L").resize(img.size, Image.LANCZOS)
    alfa = np.minimum(np.asarray(img.getchannel("A"), dtype=np.uint16), np.asarray(mask, dtype=np.uint16)).astype(np.uint8)
    img.putalpha(Image.fromarray(alfa, "L"))
    out = io.BytesIO(); img.save(out, "PNG", optimize=False); return out.getvalue()


class H(BaseHTTPRequestHandler):
    def _r(self, code, cuerpo, tipo="application/json"):
        self.send_response(code); self.send_header("Content-Type", tipo); self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(cuerpo)

    def do_GET(self):
        self._r(200, b'{"ok":true}') if self.path.rstrip("/") in ("", "/salud") else self._r(404, b'{"error":"no existe"}')

    def do_POST(self):
        if self.path.rstrip("/") != "/quitar":
            return self._r(404, b'{"error":"no existe"}')
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
            t = time.time(); png = recortar(datos); q.append(ahora)
            print(f"recorte {len(datos)//1024} KB → {len(png)//1024} KB en {time.time() - t:.1f} s", flush=True)
            self._r(200, png, "image/png")
        except Exception as e:
            print("error", repr(e)[:200], flush=True)
            self._r(400, '{"error":"No pude leer esa imagen."}'.encode())
        finally:
            UNO.release()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print("recorte-ia en :8000", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8000), H).serve_forever()
