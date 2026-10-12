"""Servicio local de la clase: imágenes (sd-turbo en CPU, dos calidades) y voz (Piper, opcional en el aula).

    baja   384 px, 1 paso   (la más rápida: para probar un prompt)
    media  512 px, 2 pasos  (para el entregable)

Una sola petición a la vez (la CPU es de todos) con cola corta; si la cola se llena responde 429 y el
cliente cae al motor de la nube. El modelo se carga al primer uso y se suelta tras IMAGEN_REPOSO segundos
sin pedidos, para devolver ~2,5 GB al servidor (por defecto 30 min: en clase se queda cargado).
"""

import gc
import io
import logging
import os
import threading
import time

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

log = logging.getLogger("imagen")
logging.basicConfig(level=logging.INFO)

TOKEN = os.environ.get("IMAGEN_TOKEN", "")
REPO = os.environ.get("IMAGEN_REPO", "stabilityai/sd-turbo")
REPOSO = int(os.environ.get("IMAGEN_REPOSO", "1800"))
LISTO = os.environ.get("IMAGEN_LISTO", "/modelos/sd-turbo-bf16")
COLA_MAX = int(os.environ.get("IMAGEN_COLA", "6"))
CALIDADES = {"baja": (1, 384), "media": (2, 512)}  # (pasos, lado mayor)
# «máxima»: FLUX.1 schnell en Cloudflare Workers AI (capa gratuita: 10 000 neurons al día). La cuenta y el token
# viven solo aquí, nunca en las aulas. Sin ellos la calidad máxima no se ofrece y el aula usa Gemini.
CF_CUENTA = os.environ.get("CF_ACCOUNT_ID", "")
CF_TOKEN = os.environ.get("CF_API_TOKEN", "")
CF_MODELO = os.environ.get("CF_MODELO", "@cf/black-forest-labs/flux-1-schnell")
CF_PASOS = int(os.environ.get("CF_PASOS", "4"))
_cf_cupo = threading.Semaphore(3)
VOZ_DEFECTO = os.environ.get("IMAGEN_VOZ", "es_MX-claude-high")
VOCES = {VOZ_DEFECTO}
FORMAS = {"cuadrado": (1.0, 1.0), "vertical": (0.8, 1.0), "horizontal": (1.0, 0.5625)}

app = FastAPI(title="imagen")
_cpu = threading.Lock()
_estado = threading.Lock()
_pipe = None
_ultimo = 0.0
_en_cola = 0


def _cargar():
    global _pipe
    import torch
    from diffusers import AutoPipelineForText2Image

    t0 = time.time()
    torch.set_num_threads(int(os.environ.get("IMAGEN_HILOS", "2")))
    # Copia ya convertida a bf16: cargarla evita convertir fp16 -> bf16 en cada arranque en frío (de ~45 s a pocos segundos).
    if os.path.isdir(LISTO):
        _pipe = AutoPipelineForText2Image.from_pretrained(LISTO, torch_dtype=torch.bfloat16, low_cpu_mem_usage=True)
    else:
        _pipe = AutoPipelineForText2Image.from_pretrained(REPO, variant="fp16", torch_dtype=torch.bfloat16, low_cpu_mem_usage=True)
        try:
            _pipe.save_pretrained(LISTO + ".tmp", safe_serialization=True)
            os.rename(LISTO + ".tmp", LISTO)
        except Exception as e:  # sin escribir la copia seguimos igual
            log.warning("no se guardó la copia bf16: %s", e)
    _pipe.set_progress_bar_config(disable=True)
    log.info("modelo cargado en %.1fs", time.time() - t0)


def _soltar_si_ocioso():
    global _pipe
    while True:
        time.sleep(30)
        with _estado:
            if _pipe is not None and time.time() - _ultimo > REPOSO and _cpu.acquire(blocking=False):
                try:
                    _pipe = None
                    gc.collect()
                    log.info("modelo descargado por reposo")
                finally:
                    _cpu.release()


threading.Thread(target=_soltar_si_ocioso, daemon=True).start()


def _precalentar():
    global _ultimo
    _ultimo = time.time()
    with _cpu:
        if _pipe is None:
            _cargar()


# Al arrancar el contenedor el modelo ya empieza a cargarse: la primera imagen de la clase no espera.
threading.Thread(target=_precalentar, daemon=True).start()


class Pedido(BaseModel):
    prompt: str
    orientacion: str = "cuadrado"
    calidad: str = "media"
    semilla: int | None = None


def _dimensiones(orientacion: str, lado: int) -> tuple[int, int]:
    fa, fh = FORMAS.get(orientacion, FORMAS["cuadrado"])
    # Los modelos de difusión piden múltiplos de 8.
    return (int(lado * fa) // 8 * 8, int(lado * fh) // 8 * 8)


class PedidoVoz(BaseModel):
    texto: str
    voz: str = ""


_voces: dict = {}


@app.post("/voz")
def voz(p: PedidoVoz, authorization: str = Header(default="")):
    """Texto a voz con Piper (WAV). Es liviano (<1 s por frase) y no pasa por la cola de imágenes."""
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "token")
    texto = p.texto.strip()
    if not texto or len(texto) > 700:
        raise HTTPException(400, "texto vacío o demasiado largo")
    nombre = p.voz if p.voz in VOCES else VOZ_DEFECTO
    import wave

    from piper import PiperVoice

    if nombre not in _voces:
        _voces[nombre] = PiperVoice.load(f"/voces/{nombre}.onnx")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        _voces[nombre].synthesize_wav(texto, w)
    return Response(buf.getvalue(), media_type="audio/wav")


@app.get("/salud")
def salud():
    return {"ok": True, "cargado": _pipe is not None, "cola": _en_cola, "maxima": bool(CF_CUENTA and CF_TOKEN)}


def _cloudflare(p: "Pedido") -> Response:
    """FLUX.1 schnell por la API REST de Cloudflare. 429 cuando el cupo diario se acaba (el cliente cae a Gemini)."""
    import base64

    import httpx
    from PIL import Image

    if not (CF_CUENTA and CF_TOKEN):
        raise HTTPException(503, "calidad máxima no configurada")
    if not _cf_cupo.acquire(blocking=False):
        raise HTTPException(429, "cola llena")
    try:
        r = httpx.post(f"https://api.cloudflare.com/client/v4/accounts/{CF_CUENTA}/ai/run/{CF_MODELO}", timeout=90.0,
                       headers={"Authorization": f"Bearer {CF_TOKEN}"}, json={"prompt": p.prompt, "steps": CF_PASOS})
    finally:
        _cf_cupo.release()
    if r.status_code in (429, 403) or (r.status_code >= 400 and "neurons" in r.text.lower()):
        log.warning("cloudflare: cupo o permiso (%s) %s", r.status_code, r.text[:200])
        raise HTTPException(429, "cupo de Cloudflare agotado")
    if r.status_code != 200:
        log.warning("cloudflare %s %s", r.status_code, r.text[:300])
        raise HTTPException(502, "cloudflare")
    ct = r.headers.get("content-type", "")
    crudo = r.content if ct.startswith("image/") else base64.b64decode(r.json()["result"]["image"])
    img = Image.open(io.BytesIO(crudo)).convert("RGB")
    # FLUX entrega cuadrado: se recorta al formato pedido.
    fa, fh = FORMAS.get(p.orientacion, FORMAS["cuadrado"])
    w, h = img.size
    if fa != fh:
        nw, nh = (int(h * fa / fh), h) if fa / fh < w / h else (w, int(w * fh / fa))
        img = img.crop(((w - nw) // 2, (h - nh) // 2, (w - nw) // 2 + nw, (h - nh) // 2 + nh))
    img.thumbnail((1024, 1024))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    log.info("maxima (cloudflare) %dx%d", *img.size)
    return Response(buf.getvalue(), media_type="image/jpeg")


@app.post("/calentar")
def calentar(authorization: str = Header(default="")):
    """Carga el modelo en segundo plano: la primera imagen de la clase no espera el minuto de carga."""
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "token")
    global _ultimo
    _ultimo = time.time()

    def _tarea():
        with _cpu:
            if _pipe is None:
                _cargar()

    if _pipe is None:
        threading.Thread(target=_tarea, daemon=True).start()
    return {"ok": True, "cargado": _pipe is not None}


@app.post("/generar")
def generar(p: Pedido, authorization: str = Header(default="")):
    global _en_cola, _ultimo
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "token")
    if not p.prompt.strip() or len(p.prompt) > 1000:
        raise HTTPException(400, "prompt vacío o demasiado largo")
    if p.calidad == "maxima":
        return _cloudflare(p)
    pasos, lado = CALIDADES.get(p.calidad, CALIDADES["media"])
    ancho, alto = _dimensiones(p.orientacion, lado)
    with _estado:
        if _en_cola >= COLA_MAX:
            raise HTTPException(429, "cola llena")
        _en_cola += 1
    try:
        with _cpu:
            import numpy as np
            import torch

            if _pipe is None:
                _cargar()
            gen = torch.Generator(device="cpu").manual_seed(p.semilla if p.semilla is not None else int(time.time()) % 100000)
            t0 = time.time()
            img = _pipe(p.prompt, num_inference_steps=pasos, guidance_scale=0.0, width=ancho, height=alto, generator=gen).images[0]
            log.info("%s %dx%d en %.1fs", p.calidad, ancho, alto, time.time() - t0)
            if np.asarray(img).max() <= 8:
                raise HTTPException(502, "imagen negra")
            _ultimo = time.time()
    finally:
        with _estado:
            _en_cola -= 1
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=88)
    return Response(buf.getvalue(), media_type="image/jpeg")
