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
REPOSO = int(os.environ.get("IMAGEN_REPOSO", "1800"))
# Dos modelos locales: sd-turbo (rápido, 1-2 pasos) y DreamShaper 8 con LCM (SD 1.5 afinado: dibuja personajes
# coherentes y estilo anime; 4 pasos). «media» usa IMAGEN_MEDIA (dreamshaper | sd-turbo).
MODELOS = {
    "sd-turbo": {"repo": "stabilityai/sd-turbo", "variant": "fp16", "guidance": 0.0},
    "dreamshaper": {"repo": "Lykon/dreamshaper-8-lcm", "variant": None, "guidance": 1.0},
}
COLA_MAX = int(os.environ.get("IMAGEN_COLA", "14"))
_MEDIA = os.environ.get("IMAGEN_MEDIA", "dreamshaper")
# calidad -> (modelo, pasos, lado mayor)
CALIDADES = {"baja": ("sd-turbo", 1, 384), "media": (_MEDIA, 4, 512) if _MEDIA == "dreamshaper" else ("sd-turbo", 2, 512)}
# «máxima»: FLUX.1 schnell en Cloudflare Workers AI (capa gratuita: 10 000 neurons al día). La cuenta y el token
# viven solo aquí, nunca en las aulas. Sin ellos la calidad máxima no se ofrece y el aula usa Gemini.
CF_CUENTA = os.environ.get("CF_ACCOUNT_ID", "")
CF_TOKEN = os.environ.get("CF_API_TOKEN", "")
CF_MODELO = os.environ.get("CF_MODELO", "@cf/black-forest-labs/flux-1-schnell")
CF_PASOS = int(os.environ.get("CF_PASOS", "3"))
_cf_cupo = threading.Semaphore(5)
CF_TOPE = float(os.environ.get("CF_NEURONS_DIA", "9800"))  # capa gratuita: 10 000 neurons/día (se reinicia 00:00 UTC)
_cf_uso = {"dia": "", "neurons": 0.0}


def _cf_gastado() -> float:
    hoy = time.strftime("%Y-%m-%d", time.gmtime())
    if _cf_uso["dia"] != hoy:
        _cf_uso.update(dia=hoy, neurons=0.0)
    return _cf_uso["neurons"]
VOZ_DEFECTO = os.environ.get("IMAGEN_VOZ", "es_MX-claude-high")
VOCES = {VOZ_DEFECTO}
FORMAS = {"cuadrado": (1.0, 1.0), "vertical": (0.8, 1.0), "horizontal": (1.0, 0.5625)}

app = FastAPI(title="imagen")
_cpu = threading.Lock()
_estado = threading.Lock()
_pipes: dict = {}  # nombre -> pipeline cargado
_ultimo = 0.0
_en_cola = 0


def _cargar(nombre: str):
    import torch
    from diffusers import AutoPipelineForText2Image

    if nombre in _pipes:
        return _pipes[nombre]
    m = MODELOS[nombre]
    listo = f"/modelos/{nombre}-bf16"
    t0 = time.time()
    torch.set_num_threads(int(os.environ.get("IMAGEN_HILOS", "2")))
    # Copia ya convertida a bf16: cargarla evita convertir en cada arranque en frío (de ~45 s a pocos segundos).
    if os.path.isdir(listo):
        pipe = AutoPipelineForText2Image.from_pretrained(listo, torch_dtype=torch.bfloat16, low_cpu_mem_usage=True)
    else:
        kw = {"variant": m["variant"]} if m["variant"] else {}
        pipe = AutoPipelineForText2Image.from_pretrained(m["repo"], torch_dtype=torch.bfloat16, low_cpu_mem_usage=True,
                                                         safety_checker=None, **kw)
        try:
            pipe.save_pretrained(listo + ".tmp", safe_serialization=True)
            os.rename(listo + ".tmp", listo)
        except Exception as e:  # sin escribir la copia seguimos igual
            log.warning("no se guardó la copia bf16: %s", e)
    pipe.set_progress_bar_config(disable=True)
    _pipes[nombre] = pipe
    log.info("modelo %s cargado en %.1fs", nombre, time.time() - t0)
    return pipe


def _soltar_si_ocioso():
    while True:
        time.sleep(30)
        with _estado:
            if _pipes and time.time() - _ultimo > REPOSO and _cpu.acquire(blocking=False):
                try:
                    _pipes.clear()
                    gc.collect()
                    log.info("modelos descargados por reposo")
                finally:
                    _cpu.release()


threading.Thread(target=_soltar_si_ocioso, daemon=True).start()


def _precalentar():
    global _ultimo
    _ultimo = time.time()
    for nombre in dict.fromkeys(m for m, _, _ in CALIDADES.values()):
        with _cpu:
            _cargar(nombre)


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
    return {"ok": True, "cargado": sorted(_pipes), "cola": _en_cola, "maxima": bool(CF_CUENTA and CF_TOKEN) and _cf_gastado() < CF_TOPE, "neurons_hoy": round(_cf_gastado())}


def _cloudflare(p: "Pedido") -> Response:
    """FLUX.1 schnell por la API REST de Cloudflare. 429 cuando el cupo diario se acaba (el cliente cae a Gemini)."""
    import base64

    import httpx
    from PIL import Image

    if not (CF_CUENTA and CF_TOKEN):
        raise HTTPException(503, "calidad máxima no configurada")
    if _cf_gastado() >= CF_TOPE:
        raise HTTPException(429, "cupo diario de Cloudflare agotado")
    if not _cf_cupo.acquire(blocking=False):
        raise HTTPException(429, "cola llena")
    try:
        for intento in (1, 2):  # a veces falla con «Cog prediction failed» (409/8007): se reintenta una vez
            r = httpx.post(f"https://api.cloudflare.com/client/v4/accounts/{CF_CUENTA}/ai/run/{CF_MODELO}", timeout=90.0,
                           headers={"Authorization": f"Bearer {CF_TOKEN}"}, json={"prompt": p.prompt, "steps": CF_PASOS})
            if r.status_code != 409:
                break
    finally:
        _cf_cupo.release()
    if r.status_code in (429, 403) or (r.status_code >= 400 and "neurons" in r.text.lower()):
        log.warning("cloudflare: cupo o permiso (%s) %s", r.status_code, r.text[:200])
        raise HTTPException(429, "cupo de Cloudflare agotado")
    if r.status_code != 200:
        log.warning("cloudflare %s %s", r.status_code, r.text[:300])
        raise HTTPException(502, "cloudflare")
    ct = r.headers.get("content-type", "")
    if ct.startswith("image/"):
        crudo = r.content
    else:
        res = r.json()["result"]
        crudo = base64.b64decode(res["image"])
        _cf_uso["neurons"] = _cf_gastado() + float((res.get("usage") or {}).get("neurons", 173))
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
        for nombre in dict.fromkeys(m for m, _, _ in CALIDADES.values()):
            with _cpu:
                _cargar(nombre)

    faltan = [m for m, _, _ in CALIDADES.values() if m not in _pipes]
    if faltan:
        threading.Thread(target=_tarea, daemon=True).start()
    return {"ok": True, "cargado": sorted(_pipes)}


@app.post("/generar")
def generar(p: Pedido, authorization: str = Header(default="")):
    global _en_cola, _ultimo
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "token")
    if not p.prompt.strip() or len(p.prompt) > 1000:
        raise HTTPException(400, "prompt vacío o demasiado largo")
    if p.calidad == "maxima":
        return _cloudflare(p)
    modelo, pasos, lado = CALIDADES.get(p.calidad, CALIDADES["media"])
    ancho, alto = _dimensiones(p.orientacion, lado)
    with _estado:
        if _en_cola >= COLA_MAX:
            raise HTTPException(429, "cola llena")
        _en_cola += 1
    try:
        with _cpu:
            import numpy as np
            import torch

            pipe = _cargar(modelo)
            gen = torch.Generator(device="cpu").manual_seed(p.semilla if p.semilla is not None else int(time.time()) % 100000)
            t0 = time.time()
            img = pipe(p.prompt, num_inference_steps=pasos, guidance_scale=MODELOS[modelo]["guidance"], width=ancho, height=alto, generator=gen).images[0]
            log.info("%s/%s %dx%d en %.1fs", p.calidad, modelo, ancho, alto, time.time() - t0)
            if np.asarray(img).max() <= 8:
                raise HTTPException(502, "imagen negra")
            _ultimo = time.time()
    finally:
        with _estado:
            _en_cola -= 1
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=88)
    return Response(buf.getvalue(), media_type="image/jpeg")
