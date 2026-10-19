"""Aula local, versión nube: la misma interfaz del aula en http://127.0.0.1:8800, sin modelos en tu máquina.

    /vista/yo/<ruta>            -> archivos de ./trabajo (como el visor del LMS)
    /vista/yo/api/<ruta>        -> relé a tu Robo en el 8788 (chat, stt, imagen, voz, salud, estado, imagenes/*)
    /api/v1/live/pa-02/comun/*  -> módulos del avatar 3D (Three.js, avatar.js) de ./modulos
    /health                     -> 200 si tu token del curso vale y la nube responde
    /v1/chat/completions        -> gateway del curso (modelo «clase»), con TU token
    /imagen/salud|generar|voz   -> servicio de imagen del curso: solo calidad «maxima» (FLUX); voz Piper
    /stt  (y /imagen/stt)       -> dictado: faster-whisper en el servidor del curso
    /nube                       -> diagnóstico: token, vencimiento, cuota de hoy, servicios

En esta versión «baja» y «media» NO existen: /imagen/generar responde 422 «calidad_no_disponible».
Tu token vive fuera de esta carpeta (cuenta.py) y nunca se imprime ni se escribe en el log. Robo y tu agente
no lo ven: usan OSITO_TOKEN, que aquí vale cualquier texto.
Solo atiende a esta máquina: rechaza otro Host y las peticiones que vienen de otras páginas (Origin).
"""

from __future__ import annotations

import json
import logging
import mimetypes
import os
import time
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.background import BackgroundTask

import cuenta

AQUI = Path(__file__).resolve().parent
TRABAJO = AQUI / "trabajo"
MODULOS = AQUI / "modulos"
NUBE = os.environ.get("JMD_NUBE", "https://jmd-learn.online/aula-nube").rstrip("/")
ROBO = os.environ.get("ROBO_URL", "http://127.0.0.1:8788").rstrip("/")
PERMITIDO = {"chat", "stt", "imagen", "voz", "salud", "estado"}
CALIDADES = ("baja", "media", "maxima")
NO_DISPONIBLES = ("baja", "media")
FORMAS = ("cuadrado", "vertical", "horizontal")
MAX_AUDIO = 6 * 1024 * 1024
LOCALES = {"127.0.0.1", "localhost", "::1"}
# En Windows mimetypes lee el registro, que a veces dice text/plain para .js (y el navegador no carga los módulos).
TIPOS = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
         ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
         ".jpeg": "image/jpeg", ".webp": "image/webp", ".wav": "audio/wav", ".md": "text/plain; charset=utf-8",
         ".txt": "text/plain; charset=utf-8"}
REINTENTO = "JMDesign: Plan de trabajo, «Entrar con otra cuenta»; sin JMDesign: sh iniciar.sh --token  (Windows: iniciar.bat --token)"

log = logging.getLogger("aula_local")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
for ruidoso in ("httpx", "httpcore"):  # a nivel DEBUG imprimirían las cabeceras (con el token)
    logging.getLogger(ruidoso).setLevel(logging.WARNING)
app = FastAPI(title="Aula local (nube del curso)")
_cliente: httpx.AsyncClient | None = None
_yo: dict = {"t": 0.0, "hash": "", "estado": None}


def cliente() -> httpx.AsyncClient:
    global _cliente
    if _cliente is None:
        _cliente = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0), follow_redirects=False)
    return _cliente


def error(estado: int, codigo: str, mensaje: str) -> JSONResponse:
    return JSONResponse({"error": {"code": codigo, "message": mensaje}}, status_code=estado)


def _host_local(valor: str) -> bool:
    if not valor:
        return False
    nombre = urlsplit(valor if "//" in valor else "//" + valor).hostname or ""
    return nombre in LOCALES


@app.middleware("http")
async def solo_esta_maquina(request: Request, siguiente):
    # Otra página abierta en tu navegador no puede usar tu token a través de esta aula (CSRF, DNS rebinding).
    if not _host_local(request.headers.get("host", "")):
        return error(403, "host", "El aula local solo atiende a 127.0.0.1 o localhost.")
    origen = request.headers.get("origin")
    if origen and not _host_local(origen):  # «null» (iframe aislado, file://) también se rechaza
        return error(403, "origen", "Petición desde otra página: rechazada.")
    return await siguiente(request)


# ---------------------------------------------------------------- nube del curso


def _token() -> str | None:
    d = cuenta.leer()
    return d["token"] if d else None


def _cabeceras(tok: str, tipo: str | None = "application/json") -> dict:
    h = {"Authorization": f"Bearer {tok}"}
    if tipo:
        h["Content-Type"] = tipo
    return h


def _sin_token() -> JSONResponse:
    return error(401, "sin_token", f"Falta tu token del curso (o venció). Pídelo con: {REINTENTO}")


def _traducir(r: httpx.Response, que: str) -> JSONResponse:
    """Errores de la nube (gateway, servicios FastAPI o nginx) -> {error: {code, message}} con texto claro."""
    codigo, mensaje = "", ""
    try:
        d = r.json()
        if isinstance(d.get("error"), dict):
            codigo, mensaje = d["error"].get("type") or d["error"].get("code") or "", d["error"].get("message", "")
        elif isinstance(d.get("detail"), dict):
            codigo, mensaje = d["detail"].get("codigo", ""), d["detail"].get("mensaje", "")
        elif d.get("detail"):
            mensaje = str(d["detail"])
        elif isinstance(d.get("error"), str):
            mensaje = d["error"]
    except ValueError:
        pass
    s = r.status_code
    if s == 429 and not r.headers.get("content-type", "").startswith("application/json"):
        return error(429, "muy_rapido", f"Vas muy rápido con {que}: espera unos segundos y reintenta.")
    if s == 401:
        return error(401, "token_invalido", f"Tu token del curso venció o fue revocado. Pide otro con: {REINTENTO}")
    if s == 429:
        if "cloudflare" in mensaje.lower() or "cupo diario" in mensaje.lower():
            return error(429, "cupo_diario", "Se acabó el cupo diario de imágenes de la clase (Cloudflare). Se reinicia a las 00:00 UTC, 19:00 en Lima.")
        if codigo == "cupo_alumno" or "quota" in codigo:
            return error(429, "cupo_alumno", mensaje or "Llegaste a tu cuota de hoy.")
        return error(429, codigo or "cola_llena", mensaje or f"El servicio de {que} está ocupado: reintenta en unos segundos.")
    if s == 404:
        return error(503, "nube_sin_ruta", f"El servidor del curso aún no publica {que} para el kit. Avisa al instructor.")
    if s == 413:
        return error(413, "muy_grande", mensaje or "El archivo es demasiado grande (graba hasta 30 s).")
    if s in (502, 503, 504) or s >= 500:
        return error(503, codigo or "nube_caida", mensaje or f"El servicio de {que} del curso no responde (HTTP {s}). Prueba en un minuto.")
    return error(s, codigo or "nube", mensaje or f"La nube respondió {s} en {que}.")


async def _llamar(metodo: str, ruta: str, que: str, *, cuerpo: bytes | None = None, json_: dict | None = None,
                  tipo: str | None = "application/json", timeout: float = 120.0):
    tok = _token()
    if not tok:
        return None, _sin_token()
    try:
        r = await cliente().request(metodo, f"{NUBE}{ruta}", content=cuerpo, json=json_, timeout=timeout,
                                    headers=_cabeceras(tok, None if json_ is not None else tipo))
    except httpx.HTTPError as e:
        return None, error(503, "sin_conexion", f"No llego a la nube del curso ({type(e).__name__}). ¿Tienes internet?")
    if r.status_code >= 400:
        return None, _traducir(r, que)
    return r, None


async def _quien_soy(forzar: bool = False):
    """GET /v1/auth/me con caché de 60 s: (estado HTTP o 0 si no hay red, cuerpo)."""
    tok = _token()
    if not tok:
        return None
    import hashlib

    h = hashlib.sha256(tok.encode()).hexdigest()
    if not forzar and _yo["hash"] == h and time.time() - _yo["t"] < 60:
        return _yo["estado"]
    try:
        r = await cliente().get(f"{NUBE}/v1/auth/me", headers=_cabeceras(tok, None), timeout=10)
        estado = (r.status_code, r.json() if r.headers.get("content-type", "").startswith("application/json") else {})
    except (httpx.HTTPError, ValueError):
        estado = (0, {})
    _yo.update(t=time.time(), hash=h, estado=estado)
    return estado


@app.get("/health")
async def health():
    e = await _quien_soy()
    if e is None:
        return JSONResponse({"ok": False, "token": False, "mensaje": f"Falta tu token del curso: {REINTENTO}"}, status_code=503)
    estado, _ = e
    if estado == 200:
        return {"ok": True, "token": True, "nube": True}
    if estado == 401:
        return JSONResponse({"ok": False, "token": False, "mensaje": f"Tu token venció o fue revocado: {REINTENTO}"}, status_code=503)
    return JSONResponse({"ok": False, "token": True, "nube": False, "mensaje": "La nube del curso no responde."}, status_code=503)


@app.get("/nube")
async def diagnostico():
    d = cuenta.leer()
    out = {"nube": NUBE, "token": bool(d), "archivo_token": str(cuenta.ruta()),
           "vence": time.strftime("%d-%m-%Y", time.localtime(float(d["vence"]))) if d and d.get("vence") else None}
    e = await _quien_soy(forzar=True)
    if e:
        out["gateway"] = e[0] == 200
        uso = (e[1] or {}).get("usage", {}).get("user")
        if uso:
            out["texto_hoy"] = {"peticiones": uso.get("requests"), "tope": uso.get("requests_per_day")}
    for nombre, ruta in (("imagen", "/imagen/salud"), ("stt", "/stt/salud")):
        r, err = await _llamar("GET", ruta, nombre, timeout=10)
        out[nombre] = r.json() if r is not None else json.loads(err.body)
    return out


# ---------------------------------------------------------------- texto: gateway del curso (modelo «clase»)


async def _relevo_texto(request: Request, ruta: str):
    tok = _token()
    if not tok:
        return _sin_token()
    crudo = await request.body()
    stream = False
    if crudo and request.method == "POST":
        try:
            cuerpo = json.loads(crudo)
        except ValueError:
            return error(400, "json", "El cuerpo debe ser JSON.")
        if ruta == "/v1/chat/completions" and cuerpo.get("model") in (None, "", "auto"):
            cuerpo["model"] = "clase"
        if ruta == "/v1/chat/completions" and cuerpo.get("model") == "clase" and "reasoning" not in cuerpo:
            # «clase» puede ser un modelo que razona (DeepSeek): con max_tokens bajo gasta todo en pensar y
            # devuelve content null. Robo no necesita razonamiento: se apaga si nadie lo pidió.
            cuerpo["reasoning"] = {"enabled": False}
        stream = bool(cuerpo.get("stream"))
        crudo = json.dumps(cuerpo).encode()
    h = _cabeceras(tok)
    if request.headers.get("anthropic-version"):
        h["anthropic-version"] = request.headers["anthropic-version"]
    req = cliente().build_request(request.method, f"{NUBE}{ruta}", content=crudo or None, headers=h)
    try:
        r = await cliente().send(req, stream=True)
    except httpx.HTTPError as e:
        return error(503, "sin_conexion", f"No llego al gateway del curso ({type(e).__name__}). ¿Tienes internet?")
    if r.status_code >= 400:
        await r.aread()
        await r.aclose()
        return _traducir(r, "texto")
    if stream:
        return StreamingResponse(r.aiter_raw(), status_code=r.status_code, media_type=r.headers.get("content-type"),
                                 background=BackgroundTask(r.aclose))
    contenido = await r.aread()
    await r.aclose()
    if ruta == "/v1/chat/completions" and _sin_contenido(contenido):
        # Se le acabaron los tokens razonando: un reintento con razonamiento apagado y más tokens.
        cuerpo["reasoning"] = {"enabled": False}
        cuerpo["max_tokens"] = max(512, 3 * int(cuerpo.get("max_tokens") or 0))
        try:
            r2 = await cliente().post(f"{NUBE}{ruta}", content=json.dumps(cuerpo).encode(), headers=h, timeout=120)
        except httpx.HTTPError as e:
            return error(503, "sin_conexion", f"No llego al gateway del curso ({type(e).__name__}).")
        if r2.status_code >= 400:
            return _traducir(r2, "texto")
        if _sin_contenido(r2.content):
            return error(502, "sin_contenido", "El modelo gastó todos sus tokens razonando y no respondió. Sube max_tokens o apaga el razonamiento.")
        log.info("texto: reintento por respuesta vacía (finish_reason length)")
        contenido = r2.content
    return Response(contenido, status_code=r.status_code, media_type=r.headers.get("content-type", "application/json"))


def _sin_contenido(crudo: bytes) -> bool:
    """¿Respuesta OpenAI sin texto porque se cortó por longitud (content null, finish_reason length)?"""
    try:
        d = json.loads(crudo)
        ch = d["choices"][0]
    except (ValueError, KeyError, IndexError, TypeError):
        return False
    m = ch.get("message") or {}
    return ch.get("finish_reason") == "length" and not (m.get("content") or "").strip() and not m.get("tool_calls")


@app.post("/v1/chat/completions")
async def chat(request: Request):
    return await _relevo_texto(request, "/v1/chat/completions")


@app.get("/v1/models")
async def modelos(request: Request):
    return await _relevo_texto(request, "/v1/models")


@app.post("/v1/messages")
async def mensajes(request: Request):  # Claude Code y otros clientes con la API de Anthropic
    return await _relevo_texto(request, "/v1/messages")


@app.post("/v1/messages/count_tokens")
async def contar(request: Request):
    return await _relevo_texto(request, "/v1/messages/count_tokens")


# ---------------------------------------------------------------- imagen: solo «maxima» (FLUX en Cloudflare)


_salud_cache: dict = {"t": 0.0, "v": None}


@app.get("/imagen/salud")
async def imagen_salud():
    if _salud_cache["v"] and time.time() - _salud_cache["t"] < 15:  # Robo la consulta a menudo: 15 s de caché
        return _salud_cache["v"]
    r, err = await _llamar("GET", "/imagen/salud", "imagen", timeout=10)
    if err is not None:
        cuerpo = json.loads(err.body)
        return JSONResponse({"ok": False, "maxima": False, "calidades": {c: False for c in CALIDADES}, **cuerpo}, status_code=503)
    d = r.json()
    maxima = bool(d.get("maxima"))
    stt, _ = await _llamar("GET", "/stt/salud", "dictado", timeout=10)
    _salud_cache.update(t=time.time(), v={"ok": True, "maxima": maxima, "calidades": {"baja": False, "media": False, "maxima": maxima},
            "motores": ["nube-maxima"] if maxima else [], "voz": bool(d.get("voz")), "stt": stt is not None,
            "cola": d.get("cola", 0),
            "aviso": "En esta versión del kit solo existe la calidad «maxima» (FLUX en la nube del curso). «baja» y «media» no están disponibles."})
    return _salud_cache["v"]


@app.post("/imagen/generar")
async def imagen_generar(request: Request):
    try:
        p = await request.json()
    except ValueError:
        return error(400, "json", "El cuerpo debe ser JSON: {prompt, calidad, orientacion}.")
    prompt = str(p.get("prompt", "")).strip()
    calidad = str(p.get("calidad") or "maxima")
    orientacion = str(p.get("orientacion") or "cuadrado")
    if not prompt or len(prompt) > 1000:
        return error(400, "prompt", "El prompt está vacío o pasa de 1000 caracteres.")
    if calidad in NO_DISPONIBLES:
        return error(422, "calidad_no_disponible",
                     f"La calidad «{calidad}» no está disponible en esta versión del kit: solo existe «maxima» (FLUX en la nube del curso). Pide calidad \"maxima\".")
    if calidad not in CALIDADES:
        return error(422, "calidad_desconocida", f"Calidad «{calidad[:20]}» desconocida. La única disponible es «maxima».")
    if orientacion not in FORMAS:
        return error(422, "orientacion", "orientacion: cuadrado, vertical u horizontal.")
    if "no text" not in prompt.lower():
        prompt += ". No text, no letters."
    t0 = time.time()
    r, err = await _llamar("POST", "/imagen/generar", "imagen", timeout=150,
                           json_={"prompt": prompt, "calidad": "maxima", "orientacion": orientacion, "semilla": p.get("semilla")})
    if err is not None:
        return err
    log.info("imagen maxima %s en %.1fs", orientacion, time.time() - t0)
    return Response(r.content, media_type=r.headers.get("content-type", "image/jpeg"))


@app.post("/imagen/calentar")
async def imagen_calentar():
    return {"ok": True, "cargado": [], "nube": "nada que calentar: la calidad «maxima» corre en la nube"}


@app.post("/imagen/voz")
async def imagen_voz(request: Request):
    r, err = await _llamar("POST", "/imagen/voz", "voz", cuerpo=await request.body(), timeout=30)
    if err is not None:
        return err
    return Response(r.content, media_type="audio/wav")


# ---------------------------------------------------------------- dictado: faster-whisper en el servidor del curso


@app.post("/stt")
@app.post("/imagen/stt")
async def stt(request: Request):
    cuerpo = await request.body()
    if len(cuerpo) > MAX_AUDIO:
        return error(413, "muy_grande", "El audio pasa de 6 MB: graba hasta 30 s.")
    if len(cuerpo) < 64:
        return error(400, "audio_vacio", "El audio llegó vacío.")
    tipo = request.headers.get("content-type") or "application/octet-stream"
    r, err = await _llamar("POST", "/stt", "dictado", cuerpo=cuerpo, tipo=tipo, timeout=90)
    if err is not None:
        return err
    return r.json()


# ---------------------------------------------------------------- visor: archivos de ./trabajo y relé a Robo


def _archivo(raiz: Path, ruta: str) -> Response:
    raiz = raiz.resolve()
    p = (raiz / ruta).resolve()
    if raiz not in p.parents and p != raiz:
        return Response("no", status_code=404)
    if p.is_dir():
        p = p / "index.html"
    if not p.is_file():
        return Response("No existe: " + ruta, status_code=404, media_type="text/plain; charset=utf-8")
    tipo = TIPOS.get(p.suffix.lower()) or mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    return Response(p.read_bytes(), media_type=tipo, headers={"Cache-Control": "no-store"})


@app.get("/api/v1/live/pa-02/comun/{f:path}")
def comun(f: str):
    return _archivo(MODULOS, f)


@app.api_route("/vista/yo/api/{resto:path}", methods=["GET", "POST"])
async def rele(resto: str, request: Request):
    if resto not in PERMITIDO and not (resto.startswith("imagenes/") and ".." not in resto):
        return error(404, "not_found", "Esa ruta no pasa por el visor.")
    cuerpo = await request.body()
    if len(cuerpo) > MAX_AUDIO + 65536:
        return error(413, "muy_grande", "Petición demasiado grande.")
    try:
        r = await cliente().request(request.method, f"{ROBO}/api/{resto}", content=cuerpo, timeout=300,
                                    headers={"Content-Type": request.headers.get("content-type", "application/json")},
                                    params=request.query_params)
    except httpx.HTTPError:
        return error(503, "asistente_apagado", "Arranca tu Robo: python trabajo/robo/robo.py arrancar")
    return Response(r.content, status_code=r.status_code, media_type=r.headers.get("content-type"))


@app.get("/vista/yo/{ruta:path}")
def vista(ruta: str):
    return _archivo(TRABAJO, ruta)


@app.get("/")
def raiz():
    return Response('<meta charset="utf-8"><h3>Aula local (nube del curso)</h3><p>Tu carpeta de trabajo: <a href="/vista/yo/">/vista/yo/</a> '
                    '(abre <a href="/vista/yo/plan-robo/">plan-robo</a> o <a href="/vista/yo/robo/">robo</a>). '
                    'Estado de tu conexión: <a href="/nube">/nube</a>.</p>', media_type="text/html; charset=utf-8")
