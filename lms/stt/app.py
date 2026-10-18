"""Voz a texto de la clase: faster-whisper en CPU (int8), para el dictado de Robo.

    POST /stt     audio (webm, ogg, wav, mp3, m4a...) en el cuerpo, crudo o multipart (campo «audio»)
                  -> {texto, idioma, segundos_audio, segundos, recortado, modelo}
    GET  /salud   -> {ok, stt, modelo, cargado, cola, max_segundos, rss_mb, rss_pico_mb}

Cuida la RAM del servidor:
  - el modelo se carga al primer pedido y se suelta tras STT_REPOSO segundos sin uso (por defecto 5 min);
  - un solo trabajo a la vez (la CPU es de todos) con cola corta: si se llena responde 429;
  - tope de STT_MAX_SEGUNDOS de audio (30 s): lo que pase se corta y la respuesta dice «recortado»;
  - tope de STT_MAX_BYTES por petición.

El audio se decodifica con PyAV a mano y se le pasa a Whisper ya como muestras: faster-whisper 1.2.1 llama a
av.open(..., metadata_errors=...) en su decode_audio y eso revienta con PyAV 19.

Quién puede llamar: las aulas del LMS con el token de la clase (STT_TOKEN), y los alumnos del kit
robo-local-nube por la ruta pública del nginx (cabecera X-Aula-Nube) con su token personal del gateway
(ver nube.py), con un tope diario por alumno.
"""

from __future__ import annotations

import ctypes
import gc
import io
import logging
import os
import resource
import threading
import time

from fastapi import FastAPI, Header, HTTPException, Request

import nube

log = logging.getLogger("stt")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

TOKEN = os.environ.get("STT_TOKEN", "")
MODELO = os.environ.get("STT_MODELO", "base")
HILOS = int(os.environ.get("STT_HILOS", "2"))
IDIOMA = os.environ.get("STT_IDIOMA", "es")
HAZ = int(os.environ.get("STT_HAZ", "1"))  # beam_size: 1 = voraz, lo más rápido
REPOSO = int(os.environ.get("STT_REPOSO", "300"))
COLA_MAX = int(os.environ.get("STT_COLA", "6"))
MAX_S = float(os.environ.get("STT_MAX_SEGUNDOS", "30"))
MAX_BYTES = int(os.environ.get("STT_MAX_BYTES", str(6 * 1024 * 1024)))
POR_ALUMNO = int(os.environ.get("STT_POR_ALUMNO_DIA", "300"))
CARPETAS = [p for p in (os.environ.get("STT_MODELOS", "/app/modelos"), "/modelos") if p]
TASA = 16000

app = FastAPI(title="stt")
_modelo_lock = threading.Lock()  # un solo trabajo a la vez
_estado = threading.Lock()
_modelo = None
_ultimo = 0.0
_en_cola = 0


def _rss_mb() -> tuple[float, float]:
    """RSS actual y pico del proceso, en MB (Linux)."""
    actual = 0.0
    try:
        with open("/proc/self/status") as f:
            for linea in f:
                if linea.startswith("VmRSS:"):
                    actual = int(linea.split()[1]) / 1024
    except OSError:
        pass
    pico = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    return round(actual, 1), round(pico, 1)


def _ruta_modelo(nombre: str) -> str:
    for base in CARPETAS:
        p = os.path.join(base, nombre)
        if os.path.isfile(os.path.join(p, "model.bin")):
            return p
    # No viene en la imagen: se baja una vez al volumen /modelos.
    from faster_whisper import download_model

    destino = os.path.join("/modelos", nombre)
    log.info("bajando el modelo %s a %s", nombre, destino)
    return download_model(nombre, output_dir=destino)


def _cargar():
    global _modelo
    if _modelo is None:
        from faster_whisper import WhisperModel

        t0 = time.time()
        _modelo = WhisperModel(_ruta_modelo(MODELO), device="cpu", compute_type="int8", cpu_threads=HILOS, num_workers=1)
        log.info("modelo %s cargado en %.1fs (rss %.0f MB)", MODELO, time.time() - t0, _rss_mb()[0])
    return _modelo


def _soltar():
    global _modelo
    _modelo = None
    gc.collect()
    try:  # glibc no devuelve la memoria liberada al sistema si no se le pide
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except OSError:
        pass
    log.info("modelo soltado por reposo (rss %.0f MB)", _rss_mb()[0])


def _vigilar_reposo():
    while True:
        time.sleep(15)
        if _modelo is not None and time.time() - _ultimo > REPOSO and _modelo_lock.acquire(blocking=False):
            try:
                if _modelo is not None and time.time() - _ultimo > REPOSO:
                    _soltar()
            finally:
                _modelo_lock.release()


threading.Thread(target=_vigilar_reposo, daemon=True).start()


def decodificar(datos: bytes, max_s: float = MAX_S):
    """Audio en cualquier contenedor que entienda FFmpeg -> (muestras float32 mono 16 kHz, segundos, recortado)."""
    import av
    import numpy as np

    tope = int(max_s * TASA)
    partes, n, recortado = [], 0, False
    try:
        with av.open(io.BytesIO(datos), mode="r") as cont:
            if not cont.streams.audio:
                raise ValueError("el archivo no trae pista de audio")
            pista = cont.streams.audio[0]
            remuestreo = av.AudioResampler(format="s16", layout="mono", rate=TASA)

            def _juntar(frames):
                nonlocal n
                for fr in frames:
                    a = fr.to_ndarray().reshape(-1)
                    partes.append(a)
                    n += a.shape[0]

            for paquete in cont.demux(pista):
                for frame in paquete.decode():
                    _juntar(remuestreo.resample(frame))
                if n >= tope:
                    recortado = True
                    break
            if not recortado:
                _juntar(remuestreo.resample(None))
    except HTTPException:
        raise
    except Exception as e:  # av.FFmpegError (PyAV >= 14) o av.AVError (anteriores), formato desconocido...
        raise HTTPException(400, {"codigo": "audio_invalido", "mensaje": f"No pude leer el audio: {type(e).__name__}"})
    if not partes:
        raise HTTPException(400, {"codigo": "audio_vacio", "mensaje": "El audio llegó vacío."})
    muestras = np.concatenate(partes)
    if muestras.shape[0] > tope:
        muestras, recortado = muestras[:tope], True
    return muestras.astype(np.float32) / 32768.0, muestras.shape[0] / TASA, recortado


def _autorizar(authorization: str, x_aula_nube: str | None) -> str | None:
    if nube.es_externo(x_aula_nube):
        sub = nube.alumno(authorization)
        nube.contar(sub, "dictados", POR_ALUMNO)
        return sub
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, {"codigo": "token", "mensaje": "token de la clase inválido"})
    return None


async def _leer_audio(request: Request) -> bytes:
    tipo = request.headers.get("content-type", "")
    largo = int(request.headers.get("content-length") or 0)
    if largo > MAX_BYTES:
        raise HTTPException(413, {"codigo": "audio_grande", "mensaje": f"El audio pesa más de {MAX_BYTES // 1048576} MB: graba hasta {int(MAX_S)} s."})
    if tipo.startswith("multipart/form-data"):
        form = await request.form()
        archivo = form.get("audio") or form.get("file")
        if archivo is None or not hasattr(archivo, "read"):
            raise HTTPException(400, {"codigo": "sin_audio", "mensaje": "Manda el audio en el campo «audio»."})
        datos = await archivo.read()
    else:
        datos = await request.body()
    if len(datos) > MAX_BYTES:
        raise HTTPException(413, {"codigo": "audio_grande", "mensaje": f"El audio pesa más de {MAX_BYTES // 1048576} MB: graba hasta {int(MAX_S)} s."})
    if len(datos) < 64:
        raise HTTPException(400, {"codigo": "audio_vacio", "mensaje": "El audio llegó vacío."})
    return datos


def _transcribir(muestras) -> tuple[str, str]:
    modelo = _cargar()
    segmentos, info = modelo.transcribe(muestras, language=IDIOMA or None, beam_size=HAZ, vad_filter=False,
                                        condition_on_previous_text=False, without_timestamps=True)
    return " ".join(s.text.strip() for s in segmentos).strip(), info.language


@app.get("/salud")
def salud():
    rss, pico = _rss_mb()
    return {"ok": True, "stt": True, "modelo": MODELO, "cargado": _modelo is not None, "cola": _en_cola,
            "max_segundos": MAX_S, "rss_mb": rss, "rss_pico_mb": pico}


@app.post("/stt")
async def stt(request: Request, authorization: str = Header(default=""), x_aula_nube: str | None = Header(default=None)):
    global _en_cola, _ultimo
    _autorizar(authorization, x_aula_nube)
    datos = await _leer_audio(request)
    with _estado:
        if _en_cola >= COLA_MAX:
            raise HTTPException(429, {"codigo": "cola_llena", "mensaje": "Hay muchos dictados en cola. Reintenta en unos segundos."})
        _en_cola += 1
    try:
        import anyio

        def _trabajo():
            global _ultimo
            muestras, seg_audio, recortado = decodificar(datos)
            with _modelo_lock:
                t0 = time.time()
                texto, idioma = _transcribir(muestras)
                _ultimo = time.time()
                dur = time.time() - t0
            log.info("stt %.1fs de audio en %.2fs (rss %.0f MB)", seg_audio, dur, _rss_mb()[0])
            return {"texto": texto, "idioma": idioma, "segundos_audio": round(seg_audio, 2), "segundos": round(dur, 2),
                    "recortado": recortado, "modelo": MODELO}

        return await anyio.to_thread.run_sync(_trabajo)
    finally:
        with _estado:
            _en_cola -= 1
