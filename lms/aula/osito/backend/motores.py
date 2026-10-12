"""Motores del osito: Ollama, FAQ por embeddings, Whisper e imagenes.

Todo lo pesado se carga de forma perezosa y una sola vez (con lock).
app.py solo orquesta; aqui vive la logica de cada motor.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import threading
import time
import uuid
from pathlib import Path

import httpx
import numpy as np

from . import flyer, imagen  # noqa: E402

log = logging.getLogger("osito.motores")

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
DIR_IMAGENES = RAIZ / "imagenes"
RUTA_FAQ = AQUI / "faq.json"

# ---------------------------------------------------------------- configuracion

OLLAMA_URL = os.environ.get("OSITO_OLLAMA_URL", "http://localhost:11434").rstrip("/")
MODELO = os.environ.get("OSITO_MODELO", "qwen3:1.7b")
NOMBRE = os.environ.get("OSITO_NOMBRE", "Robo")
# Perfil «nube» (aula del modo LIVE): el chat va al gateway de IA de la clase, sin modelos locales.
PERFIL = os.environ.get("OSITO_PERFIL", "local")
GATEWAY_URL = os.environ.get("JMD_URL", "http://ai-orchestrator:4000").rstrip("/")
GATEWAY_TOKEN = os.environ.get("OSITO_TOKEN", "")
MODELO_NUBE = os.environ.get("OSITO_MODELO_NUBE", "clase")
WHISPER_TAM = os.environ.get("OSITO_WHISPER", "small")
# fastembed no soporta intfloat/multilingual-e5-small; este es el multilingue mas cercano.
EMBED_MODELO = os.environ.get("OSITO_EMBED", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
# Con MiniLM los aciertos reales dan 0,60-0,82; con e5 darian > 0,80.
FAQ_UMBRAL = float(os.environ.get("OSITO_FAQ_UMBRAL", "0.55"))

ANIMOS = ("feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral")
ESTILOS = {
    "profesional": ("elegant editorial illustration, premium corporate art, rich color grading, cinematic soft "
                    "lighting, depth of field, ultra detailed, award winning, trending on behance"),
    "kawaii": ("cute kawaii illustration, pastel palette, soft rounded shapes, gentle shading, clean vector look, "
               "charming and polished, high detail"),
    "tecnico": ("isometric technical illustration, blueprint lines, precise geometry, cool teal palette, "
                "subtle grid, crisp edges, high detail"),
}

SYSTEM_PROMPT = f"""Eres {NOMBRE}, un robot asistente amable y curioso de un taller de programacion agentica.
Respondes en espanol peruano, calido y cercano, con frases cortas: maximo tres frases.
No uses emojis. Se honesto: si no sabes algo, di que no lo sabes.
Termina SIEMPRE tu respuesta con una ultima linea exactamente asi:
ANIMO: <uno de feliz|pensando|sorprendido|triste|emocionado|neutral>"""

RE_THINK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
# En cualquier parte del texto: el modelo pequeno a veces la pega al final del parrafo en vez de en su linea.
RE_ANIMO = re.compile(r"[\s\*\(\[]*ANIMO\s*:\s*\**\s*([a-záéíóú]+)[\s\*\)\]\.]*", re.IGNORECASE)


class ErrorOllama(Exception):
    """Ollama no respondio o respondio mal."""


# ---------------------------------------------------------------- ollama


def ollama_disponible(timeout: float = 2.0) -> bool:
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=timeout)
        r.raise_for_status()
        nombres = {m.get("name", "") for m in r.json().get("models", [])}
        return MODELO in nombres or f"{MODELO}:latest" in nombres
    except Exception:
        return False


def nube_disponible(timeout: float = 2.0) -> bool:
    """El gateway de la clase responde y hay token."""
    if not GATEWAY_TOKEN:
        return False
    try:
        return httpx.get(f"{GATEWAY_URL}/health", timeout=timeout).status_code == 200
    except Exception:
        return False


def llm_disponible() -> bool:
    return nube_disponible() if PERFIL == "nube" else ollama_disponible()


def separar_animo(texto: str) -> tuple[str, str]:
    """Quita <think>, saca la linea ANIMO y la valida."""
    texto = RE_THINK.sub("", texto)
    texto = texto.replace("<think>", "").replace("</think>", "")
    animo = "neutral"
    m = None
    for m in RE_ANIMO.finditer(texto):
        pass
    if m:
        candidato = m.group(1).lower()
        if candidato in ANIMOS:
            animo = candidato
        texto = texto[: m.start()] + texto[m.end():]
    return texto.strip(), animo


def chat_ollama(mensaje: str, historial: list[dict]) -> tuple[str, str]:
    mensajes = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turno in historial[-8:]:
        rol = "user" if turno.get("rol") == "usuario" else "assistant"
        mensajes.append({"role": rol, "content": str(turno.get("texto", ""))})
    mensajes.append({"role": "user", "content": mensaje})
    cuerpo = {
        "model": MODELO,
        "messages": mensajes,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 220},
    }
    if MODELO.startswith("qwen3"):
        cuerpo["think"] = False
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/chat", json=cuerpo, timeout=60.0)
        r.raise_for_status()
        contenido = r.json().get("message", {}).get("content", "")
    except (httpx.HTTPError, ValueError) as e:
        raise ErrorOllama(f"{type(e).__name__}: {e}") from e
    if not contenido.strip():
        raise ErrorOllama("respuesta vacia")
    return separar_animo(contenido)


def chat_nube(mensaje: str, historial: list[dict]) -> tuple[str, str]:
    """Chat por el gateway de la clase (formato OpenAI). Razonamiento apagado: responde en un par de segundos."""
    mensajes = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turno in historial[-8:]:
        rol = "user" if turno.get("rol") == "usuario" else "assistant"
        mensajes.append({"role": rol, "content": str(turno.get("texto", ""))})
    mensajes.append({"role": "user", "content": mensaje})
    cuerpo = {
        "model": MODELO_NUBE,
        "messages": mensajes,
        "temperature": 0.7,
        "max_tokens": 300,
        "reasoning": {"enabled": False},
    }
    if not GATEWAY_TOKEN:
        raise ErrorOllama("falta el token del gateway (OSITO_TOKEN)")
    try:
        r = httpx.post(f"{GATEWAY_URL}/v1/chat/completions", json=cuerpo, timeout=45.0,
                       headers={"Authorization": f"Bearer {GATEWAY_TOKEN}"})
        r.raise_for_status()
        contenido = r.json()["choices"][0]["message"].get("content") or ""
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as e:
        raise ErrorOllama(f"{type(e).__name__}: {e}") from e
    if not contenido.strip():
        raise ErrorOllama("respuesta vacia")
    return separar_animo(contenido)


def json_nube(sistema: str, usuario: str) -> dict:
    """Pide al gateway una respuesta JSON (extraccion de datos). Razonamiento apagado y temperatura baja."""
    if not GATEWAY_TOKEN:
        raise ErrorOllama("falta el token del gateway (OSITO_TOKEN)")
    cuerpo = {
        "model": MODELO_NUBE,
        "messages": [{"role": "system", "content": sistema}, {"role": "user", "content": usuario}],
        "temperature": 0.1,
        "max_tokens": 500,
        "reasoning": {"enabled": False},
        "response_format": {"type": "json_object"},
    }
    r = httpx.post(f"{GATEWAY_URL}/v1/chat/completions", json=cuerpo, timeout=45.0,
                   headers={"Authorization": f"Bearer {GATEWAY_TOKEN}"})
    r.raise_for_status()
    texto = r.json()["choices"][0]["message"].get("content") or "{}"
    texto = RE_THINK.sub("", texto).strip()
    if texto.startswith("```"):
        texto = texto.strip("`")
        texto = texto[4:] if texto.lower().startswith("json") else texto
    return json.loads(texto)


def chat_llm(mensaje: str, historial: list[dict]) -> tuple[str, str]:
    return chat_nube(mensaje, historial) if PERFIL == "nube" else chat_ollama(mensaje, historial)


# ---------------------------------------------------------------- faq por embeddings

_faq_lock = threading.Lock()
_faq_estado: dict = {}


def _normalizar(t: str) -> str:
    t = t.lower().strip()
    for a, b in zip("áéíóúüñ¿¡", "aeiouun  "):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9 ]+", " ", t).strip()


def _cargar_faq() -> dict:
    """Carga faq.json y, si puede, el modelo de embeddings. Una sola vez."""
    with _faq_lock:
        if _faq_estado:
            return _faq_estado
        entradas = json.loads(RUTA_FAQ.read_text(encoding="utf-8"))
        frases, indices = [], []
        for i, e in enumerate(entradas):
            for p in e["preguntas"]:
                frases.append(_normalizar(p))
                indices.append(i)
        _faq_estado.update(entradas=entradas, frases=frases, indices=indices, modelo=None, matriz=None)
        try:
            t0 = time.time()
            from fastembed import TextEmbedding

            modelo = TextEmbedding(EMBED_MODELO)
            matriz = np.array(list(modelo.embed(frases)), dtype=np.float32)
            matriz /= np.linalg.norm(matriz, axis=1, keepdims=True) + 1e-9
            _faq_estado.update(modelo=modelo, matriz=matriz)
            log.info("faq: embeddings %s listos en %.1fs", EMBED_MODELO, time.time() - t0)
        except Exception as e:  # sin modelo seguimos con similitud lexica
            log.warning("faq: sin embeddings (%s); uso similitud lexica", e)
        return _faq_estado


def _similitud_lexica(a: str, b: str) -> float:
    sa, sb = set(a.split()), set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / math.sqrt(len(sa) * len(sb))


def chat_faq(mensaje: str) -> tuple[str, str]:
    est = _cargar_faq()
    consulta = _normalizar(mensaje)
    if est["modelo"] is not None:
        q = np.array(list(est["modelo"].embed([consulta])), dtype=np.float32)[0]
        q /= np.linalg.norm(q) + 1e-9
        sims = est["matriz"] @ q
    else:
        sims = np.array([_similitud_lexica(consulta, f) for f in est["frases"]])
    mejor = int(sims.argmax())
    puntaje = float(sims[mejor])
    log.info("faq: '%s' -> '%s' (%.3f)", consulta[:40], est["frases"][mejor][:40], puntaje)
    if puntaje < FAQ_UMBRAL:
        return "No estoy seguro de eso todavia. Me lo explicas de otra forma?", "pensando"
    e = est["entradas"][est["indices"][mejor]]
    return e["respuesta"], e.get("animo", "neutral") if e.get("animo") in ANIMOS else "neutral"


# ---------------------------------------------------------------- whisper

_whisper_lock = threading.Lock()
_whisper_modelo = None


def whisper_importable() -> bool:
    try:
        import faster_whisper  # noqa: F401

        return True
    except Exception:
        return False


def _whisper() -> object:
    global _whisper_modelo
    with _whisper_lock:
        if _whisper_modelo is None:
            from faster_whisper import WhisperModel

            t0 = time.time()
            _whisper_modelo = WhisperModel(WHISPER_TAM, device="cpu", compute_type="int8")
            log.info("whisper %s cargado en %.1fs", WHISPER_TAM, time.time() - t0)
        return _whisper_modelo


def decodificar_audio(ruta: str, hz: int = 16000) -> np.ndarray:
    """Decodifica webm/ogg/wav/m4a a mono float32 a 16 kHz con PyAV.

    faster-whisper 1.2.1 llama a av.open(metadata_errors=...) y PyAV 19 ya no
    acepta ese argumento, asi que decodificamos nosotros y le pasamos el array.
    """
    import av

    resampler = av.AudioResampler(format="s16", layout="mono", rate=hz)
    trozos: list[np.ndarray] = []
    with av.open(ruta, mode="r") as contenedor:
        flujo = next((s for s in contenedor.streams if s.type == "audio"), None)
        if flujo is None:
            raise ValueError("el archivo no trae pista de audio")
        for cuadro in contenedor.decode(flujo):
            for c in resampler.resample(cuadro):
                trozos.append(c.to_ndarray().reshape(-1))
        for c in resampler.resample(None):
            trozos.append(c.to_ndarray().reshape(-1))
    if not trozos:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(trozos).astype(np.float32) / 32768.0


def transcribir(ruta: str) -> dict:
    modelo = _whisper()
    t0 = time.time()
    audio = decodificar_audio(ruta)
    with _whisper_lock:
        segmentos, info = modelo.transcribe(audio, language="es", vad_filter=True, beam_size=1)
        texto = " ".join(s.text.strip() for s in segmentos).strip()
    return {"texto": texto, "idioma": getattr(info, "language", "es"), "segundos": round(time.time() - t0, 2)}


# ---------------------------------------------------------------- imagenes



# sd-turbo (1-2 pasos) se estropea con estilos largos de sdxl («award winning, trending on behance»): para
# los motores locales de la clase el estilo va corto y la escena se describe primero.
ESTILOS_LOCAL = {
    "profesional": "professional photo, natural light, sharp focus, clean composition",
    "kawaii": "cute kawaii illustration, pastel colors, soft rounded shapes",
    "tecnico": "isometric technical illustration, teal palette, clean lines",
}


def sujeto_para(motor: str, texto: str) -> str:
    """Lo que hay en la imagen, en inglés para los motores locales (sd-turbo no entiende español)."""
    return imagen.a_ingles(texto) if motor.startswith("local-") else texto


def estilo_para(motor: str, estilo: str) -> str:
    return ESTILOS_LOCAL[estilo] if motor.startswith("local-") else ESTILOS[estilo]


def motor_imagen(calidad: str = "buena") -> str:
    return imagen.resolver(calidad)


def _imagen_sd(prompt: str, estilo: str, ruta: Path, motor: str) -> None:
    img = imagen.generar(motor, f"{sujeto_para(motor, prompt)}, {estilo_para(motor, estilo)}", "cuadrado")
    img.save(ruta, "PNG")


PALETAS = {
    "profesional": ((28, 44, 78), (86, 128, 196), (255, 255, 255)),
    "kawaii": ((255, 196, 214), (190, 222, 255), (90, 60, 90)),
    "tecnico": ((16, 36, 52), (24, 110, 120), (210, 240, 245)),
}


def _fuente(tam: int):
    from PIL import ImageFont

    for ruta in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
                 "/System/Library/Fonts/Helvetica.ttc", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(ruta):
            try:
                return ImageFont.truetype(ruta, tam)
            except Exception:
                continue
    return ImageFont.load_default(size=tam)


def _imagen_demo(prompt: str, estilo: str, ruta: Path) -> None:
    from PIL import Image, ImageDraw

    N = 1024
    c1, c2, tinta = PALETAS[estilo]
    base = Image.new("RGB", (N, N))
    px = base.load()
    for y in range(N):  # degradado vertical suave de dos tonos
        t = y / (N - 1)
        fila = tuple(int(c1[k] * (1 - t) + c2[k] * t) for k in range(3))
        for x in range(N):
            px[x, y] = fila
    capa = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    blanco = (255, 255, 255)
    d.ellipse((620, -180, 1180, 380), fill=blanco + (28,))
    d.ellipse((-160, 640, 360, 1160), fill=blanco + (22,))
    if estilo == "tecnico":
        for i in range(0, N, 64):
            d.line((i, 0, i, N), fill=blanco + (14,), width=1)
            d.line((0, i, N, i), fill=blanco + (14,), width=1)
    d.rounded_rectangle((760, 700, 940, 880), radius=36, fill=blanco + (36,))
    base = Image.alpha_composite(base.convert("RGBA"), capa)
    d = ImageDraw.Draw(base)
    margen = 96
    etiqueta = _fuente(30)
    d.text((margen, margen), f"{NOMBRE}  ·  {estilo}".upper(), font=etiqueta, fill=tinta + (200,))
    d.line((margen, margen + 52, margen + 120, margen + 52), fill=tinta + (200,), width=4)
    titulo = prompt.strip()[:60] or "Sin titulo"
    fuente = _fuente(72)
    lineas, actual = [], ""
    for palabra in titulo.split():
        prueba = f"{actual} {palabra}".strip()
        if d.textlength(prueba, font=fuente) <= N - 2 * margen:
            actual = prueba
        else:
            lineas.append(actual)
            actual = palabra
    lineas.append(actual)
    y = N // 2 - 44 * len(lineas)
    for linea in lineas[:4]:
        d.text((margen, y), linea, font=fuente, fill=tinta + (255,))
        y += 88
    d.text((margen, N - margen - 30), "modo demo  ·  sin modelo de difusion", font=_fuente(26), fill=tinta + (170,))
    base.convert("RGB").save(ruta, "PNG")


def generar_imagen(prompt: str, estilo: str, tipo: str = "auto", calidad: str = "buena") -> dict:
    DIR_IMAGENES.mkdir(parents=True, exist_ok=True)
    estilo = estilo if estilo in ESTILOS else "profesional"
    ident = uuid.uuid4().hex[:12]
    ruta = DIR_IMAGENES / f"{ident}.png"
    if tipo == "flyer" or (tipo == "auto" and flyer.es_pedido_de_flyer(prompt)):
        salida = flyer.generar_flyer(prompt, estilo, ruta, calidad)
        salida["url"] = f"/imagenes/{ident}.png"
        return salida
    motor = motor_imagen(calidad)
    t0 = time.time()
    if motor != "demo":
        try:
            _imagen_sd(prompt, estilo, ruta, motor)
        except Exception as e:
            log.exception("%s fallo, paso a demo: %s", motor, e)
            motor = "demo"
    if motor == "demo":
        _imagen_demo(prompt, estilo, ruta)
    return {"url": f"/imagenes/{ident}.png", "motor": motor, "segundos": round(time.time() - t0, 2)}
