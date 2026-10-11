"""Backend del osito: FastAPI que sirve el frontend y expone la API.

Arranque (desde osito/):  ../.venv/bin/uvicorn backend.app:app --port 8765
Los motores pesados viven en motores.py y se cargan al primer uso.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend import motores

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("osito")

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
DIR_FRONTEND = RAIZ / "frontend"
RUTA_ESTADO = (AQUI / ".." / ".." / "obra" / "estado.json").resolve()
ESTADO_VACIO = {"proyecto": "", "pct": 0, "pasos": []}
EXTENSIONES_AUDIO = {".webm", ".ogg", ".wav", ".m4a", ".mp3", ".mp4", ".flac", ".oga", ".opus"}

app = FastAPI(title="Osito", version="1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def registrar_peticion(request: Request, call_next):
    t0 = time.perf_counter()
    try:
        respuesta = await call_next(request)
    except Exception as e:  # ultima red: nunca un 500 sin JSON
        log.exception("error no controlado en %s %s", request.method, request.url.path)
        respuesta = JSONResponse({"error": f"{type(e).__name__}: {e}"}, status_code=500)
    ms = (time.perf_counter() - t0) * 1000
    log.info("%s %s -> %s en %.0f ms", request.method, request.url.path, respuesta.status_code, ms)
    return respuesta


@app.exception_handler(RequestValidationError)
async def campo_invalido(_: Request, exc: RequestValidationError):
    detalle = "; ".join(f"{'.'.join(str(p) for p in e.get('loc', []))}: {e.get('msg')}" for e in exc.errors())
    return JSONResponse({"error": f"peticion invalida: {detalle}"}, status_code=422)


# ---------------------------------------------------------------- modelos


class Turno(BaseModel):
    rol: str = "usuario"
    texto: str = ""


class PeticionChat(BaseModel):
    mensaje: str = Field(min_length=1, max_length=4000)
    historial: list[Turno] = Field(default_factory=list)


class PeticionImagen(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    estilo: str = "profesional"
    tipo: str = "auto"  # auto | ilustracion | flyer
    calidad: str = "buena"  # rapida | buena | maxima


# ---------------------------------------------------------------- rutas de la API


@app.post("/api/chat")
def api_chat(peticion: PeticionChat):
    historial = [t.model_dump() for t in peticion.historial]
    try:
        texto, animo = motores.chat_llm(peticion.mensaje, historial)
        return {"texto": texto, "animo": animo, "fuente": "nube" if motores.PERFIL == "nube" else "ollama"}
    except motores.ErrorOllama as e:
        log.warning("ollama no respondio (%s); uso FAQ", e)
    try:
        texto, animo = motores.chat_faq(peticion.mensaje)
        return {"texto": texto, "animo": animo, "fuente": "faq"}
    except Exception as e:
        log.exception("el respaldo FAQ tambien fallo")
        return JSONResponse({"error": f"ni Ollama ni la FAQ pudieron responder: {e}"}, status_code=502)


@app.post("/api/stt")
async def api_stt(audio: UploadFile = File(...)):
    nombre = audio.filename or "audio.webm"
    extension = Path(nombre).suffix.lower()
    if extension not in EXTENSIONES_AUDIO:
        # Chrome manda audio/webm;codecs=opus aunque el nombre no traiga extension
        tipo = (audio.content_type or "").split(";")[0].split("/")[-1]
        extension = f".{tipo}" if tipo in {e[1:] for e in EXTENSIONES_AUDIO} else ".webm"
    datos = await audio.read()
    if not datos:
        return JSONResponse({"error": "el campo 'audio' llego vacio"}, status_code=422)
    with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp:
        tmp.write(datos)
        ruta = tmp.name
    try:
        return motores.transcribir(ruta)
    except Exception as e:
        log.exception("stt fallo")
        return JSONResponse({"error": f"no pude transcribir el audio: {e}"}, status_code=502)
    finally:
        try:
            os.unlink(ruta)
        except OSError:
            pass


@app.post("/api/imagen")
def api_imagen(peticion: PeticionImagen):
    if peticion.estilo not in motores.ESTILOS:
        return JSONResponse(
            {"error": f"estilo invalido; usa uno de {', '.join(motores.ESTILOS)}"}, status_code=422
        )
    try:
        return motores.generar_imagen(peticion.prompt, peticion.estilo, peticion.tipo, peticion.calidad)
    except Exception as e:
        log.exception("imagen fallo")
        return JSONResponse({"error": f"no pude generar la imagen: {e}"}, status_code=502)


@app.get("/api/salud")
def api_salud():
    return {
        "ollama": motores.ollama_disponible() if motores.PERFIL != "nube" else False,
        "llm": motores.llm_disponible(),
        "perfil": motores.PERFIL,
        "whisper": motores.whisper_importable(),
        "imagen": motores.motor_imagen(),
        "motores_imagen": motores.imagen.disponibles(),
        "maquina": motores.imagen.capacidad(),
        "tope_imagen": motores.imagen.tope_por_capacidad(),
        "modelo": motores.MODELO_NUBE if motores.PERFIL == "nube" else motores.MODELO,
    }


@app.get("/api/estado")
def api_estado():
    try:
        return json.loads(RUTA_ESTADO.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return ESTADO_VACIO
    except (OSError, ValueError) as e:
        log.warning("estado.json ilegible: %s", e)
        return ESTADO_VACIO


@app.get("/")
def raiz():
    indice = DIR_FRONTEND / "index.html"
    if indice.exists():
        return FileResponse(indice)
    return JSONResponse({"error": "falta frontend/index.html; la API sigue viva en /api/salud"}, status_code=404)


# ---------------------------------------------------------------- estaticos (al final)

motores.DIR_IMAGENES.mkdir(parents=True, exist_ok=True)
app.mount("/imagenes", StaticFiles(directory=str(motores.DIR_IMAGENES)), name="imagenes")
if DIR_FRONTEND.is_dir():
    app.mount("/", StaticFiles(directory=str(DIR_FRONTEND), html=True), name="frontend")
else:
    log.warning("no existe %s; solo se sirve la API", DIR_FRONTEND)
