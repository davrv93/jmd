"""Motores de imagen locales, por niveles de calidad.

    rapida  -> sd-turbo      (2,4 GB, 512 px, 1-2 s en Mac M, 16 GB RAM bastan)
    buena   -> sdxl-turbo    (7 GB,  512-768 px, 4-8 s en Mac M, pide 16 GB)
    maxima  -> flux2-klein   (FLUX.2 Klein 4B en MLX a 4 bits, 4,6 GB, 1 MP, solo Apple Silicon 16 GB+)

Cada nivel cae al anterior si el modelo no esta descargado. Solo un modelo vive en
memoria a la vez: cambiar de nivel descarga el anterior.
"""

from __future__ import annotations

import gc
import logging
import os
import threading
import time

import numpy as np

log = logging.getLogger("osito.imagen")

MODO = os.environ.get("OSITO_IMAGEN", "auto").lower()  # auto | demo | sd-turbo | sdxl-turbo | flux2-klein
PASOS_EXTRA = int(os.environ.get("OSITO_SD_PASOS", "0"))  # 0 = el valor por defecto de cada motor

MOTORES = {
    "sd-turbo": {
        "repo": "stabilityai/sd-turbo",
        "archivo": "unet/diffusion_pytorch_model.fp16.safetensors",
        "pasos": 2,
        "cuadrado": (512, 512),
        "vertical": (512, 640),
        "ram_gb": 5,
    },
    "sdxl-turbo": {
        "repo": "stabilityai/sdxl-turbo",
        "archivo": "unet/diffusion_pytorch_model.fp16.safetensors",
        "pasos": 4,
        "cuadrado": (640, 640),
        "vertical": (640, 800),
        "ram_gb": 9,
    },
    "flux2-klein": {
        "repo": "mflux-community/flux2-klein-4b-mflux-q4",
        "archivo": "transformer/1.safetensors",
        "pasos": 4,
        "cuadrado": (1024, 1024),
        "vertical": (896, 1120),
        "ram_gb": 8,
    },
}
CALIDADES = {"rapida": "sd-turbo", "buena": "sdxl-turbo", "maxima": "flux2-klein"}
ORDEN = ["flux2-klein", "sdxl-turbo", "sd-turbo"]  # de mejor a mas liviano

_lock = threading.Lock()
_pipe = None
_pipe_nombre = ""
_pipe_device = ""


# ---------------------------------------------------------------- capacidad de la maquina


def _ram_gb() -> float:
    try:
        import psutil  # opcional

        return psutil.virtual_memory().total / 1e9
    except Exception:
        pass
    try:
        if os.name == "nt":
            import ctypes

            class _Mem(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                            ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]

            m = _Mem(); m.dwLength = ctypes.sizeof(_Mem)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
            return m.ullTotalPhys / 1e9
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1e9
    except Exception:
        return 0.0


def capacidad() -> dict:
    """Que acelerador hay y cuanta memoria util tiene. Se calcula una vez."""
    global _cap
    if _cap:
        return _cap
    info = {"dispositivo": "cpu", "nombre": "CPU", "memoria_gb": round(_ram_gb(), 1), "ram_gb": round(_ram_gb(), 1)}
    try:
        import torch

        if torch.cuda.is_available():
            p = torch.cuda.get_device_properties(0)
            info.update(dispositivo="cuda", nombre=p.name, memoria_gb=round(p.total_memory / 1e9, 1))
        elif torch.backends.mps.is_available():
            info.update(dispositivo="mps", nombre="Apple Silicon (memoria unificada)")
    except Exception:
        pass
    _cap = info
    return info


def tope_por_capacidad() -> str:
    """Motor mas pesado que esta maquina puede correr con holgura."""
    c = capacidad()
    try:
        import mflux  # noqa: F401

        hay_mflux = c["dispositivo"] == "mps"
    except Exception:
        hay_mflux = False
    if hay_mflux and c["ram_gb"] >= 16:
        return "flux2-klein"
    if c["dispositivo"] == "cuda":
        return "sdxl-turbo" if c["memoria_gb"] >= 6 else "sd-turbo"
    if c["dispositivo"] == "mps":
        return "sdxl-turbo" if c["ram_gb"] >= 16 else "sd-turbo"
    return "sdxl-turbo" if c["ram_gb"] >= 24 else "sd-turbo"  # CPU puro: sdxl fp32 pide ~14 GB


_cap: dict = {}


# ---------------------------------------------------------------- disponibilidad


def en_cache(nombre: str) -> bool:
    m = MOTORES.get(nombre)
    if not m:
        return False
    try:
        if nombre == "flux2-klein":
            import mflux  # noqa: F401
        from huggingface_hub import try_to_load_from_cache

        p = try_to_load_from_cache(m["repo"], m["archivo"])
        return isinstance(p, str) and os.path.exists(p)
    except Exception:
        return False


def disponibles() -> list[str]:
    return [n for n in ORDEN if en_cache(n)]


def resolver(calidad: str = "buena") -> str:
    """Devuelve el motor que se usara para esa calidad, cayendo al mas liviano disponible."""
    if MODO == "demo":
        return "demo"
    if MODO in MOTORES:
        return MODO if en_cache(MODO) else "demo"
    pedido = CALIDADES.get(calidad, "sdxl-turbo")
    tope = tope_por_capacidad()
    inicio = max(ORDEN.index(pedido), ORDEN.index(tope))  # nunca por encima de lo que aguanta la maquina
    for nombre in ORDEN[inicio:]:
        if en_cache(nombre):
            return nombre
    return "demo"


# ---------------------------------------------------------------- carga


def _descargar_actual() -> None:
    global _pipe, _pipe_nombre, _pipe_device
    if _pipe is None:
        return
    log.info("descargo %s de memoria", _pipe_nombre)
    _pipe, _pipe_nombre, _pipe_device = None, "", ""
    gc.collect()
    try:
        import torch

        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
    except Exception:
        pass


def _cargar_diffusers(nombre: str, forzar_cpu: bool = False, fp32: bool = False):
    import torch
    from diffusers import AutoPipelineForText2Image

    device = "mps" if (torch.backends.mps.is_available() and not forzar_cpu) else ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if (device != "cpu" and not fp32) else torch.float32
    t0 = time.time()
    pipe = AutoPipelineForText2Image.from_pretrained(
        MOTORES[nombre]["repo"], variant="fp16", torch_dtype=dtype, local_files_only=True
    )
    pipe.set_progress_bar_config(disable=True)
    vram = capacidad()["memoria_gb"] if device == "cuda" else 0
    if device == "cuda" and nombre == "sdxl-turbo" and vram < 10:
        pipe.enable_model_cpu_offload()  # 4-8 GB de VRAM: las piezas entran y salen de la GPU
        log.info("%s con cpu offload (VRAM %.1f GB)", nombre, vram)
    else:
        pipe = pipe.to(device)
    log.info("%s cargado en %s/%s en %.1fs", nombre, device, dtype, time.time() - t0)
    return pipe, device


def _cargar_klein():
    from huggingface_hub import snapshot_download
    from mflux.models.common.config.model_config import ModelConfig
    from mflux.models.flux2.variants.txt2img.flux2_klein import Flux2Klein

    t0 = time.time()
    ruta = snapshot_download(MOTORES["flux2-klein"]["repo"], local_files_only=True)
    modelo = Flux2Klein(model_config=ModelConfig.flux2_klein_4b(), model_path=ruta)
    log.info("flux2-klein (mflux, 4 bits) cargado en %.1fs", time.time() - t0)
    return modelo, "mlx"


def _pipeline(nombre: str, **kw):
    global _pipe, _pipe_nombre, _pipe_device
    with _lock:
        if _pipe is not None and _pipe_nombre == nombre and not kw:
            return _pipe, _pipe_device
        _descargar_actual()
        if nombre == "flux2-klein":
            _pipe, _pipe_device = _cargar_klein()
        else:
            _pipe, _pipe_device = _cargar_diffusers(nombre, **kw)
        _pipe_nombre = nombre
        return _pipe, _pipe_device


# ---------------------------------------------------------------- generacion


def generar(nombre: str, prompt: str, orientacion: str = "cuadrado", semilla: int | None = None):
    """Devuelve una imagen PIL. Lanza RuntimeError si el motor no produce nada valido."""
    m = MOTORES[nombre]
    ancho, alto = m[orientacion]
    pasos = PASOS_EXTRA or m["pasos"]
    semilla = semilla if semilla is not None else int(time.time()) % 100000
    if nombre == "flux2-klein":
        modelo, _ = _pipeline(nombre)
        with _lock:
            salida = modelo.generate_image(seed=semilla, prompt=prompt, num_inference_steps=pasos,
                                           height=alto, width=ancho, guidance=1.0)
        return salida.image
    import torch

    intentos = [dict(), dict(fp32=True), dict(forzar_cpu=True, fp32=True)]
    for i, args in enumerate(intentos):
        pipe, device = _pipeline(nombre, **args)
        with _lock:
            gen = torch.Generator(device="cpu").manual_seed(semilla)
            img = pipe(prompt, num_inference_steps=pasos, guidance_scale=0.0,
                       width=ancho, height=alto, generator=gen).images[0]
        if np.asarray(img).max() > 8:  # negra = NaN en fp16
            return img
        log.warning("%s devolvio imagen negra en %s (%s); reintento", nombre, device, args)
    raise RuntimeError(f"{nombre} no produjo imagen valida")
