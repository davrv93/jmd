"""Servicio local de la clase: imágenes (sd-turbo en CPU, dos calidades) y voz (Piper, opcional en el aula).

    baja   384 px, 1 paso   (la más rápida: para probar un prompt)
    media  512 px, 2 pasos  (para el entregable)

Una sola petición a la vez (la CPU es de todos) con cola corta; si la cola se llena responde 429 y el
cliente cae al motor de la nube. El modelo se carga al primer uso y se suelta tras IMAGEN_REPOSO segundos
sin pedidos, para devolver ~2,5 GB al servidor (por defecto 30 min: en clase se queda cargado).

Desde fuera (kit robo-local-nube, por la ruta pública /aula-nube/imagen/ del nginx, que pone la cabecera
X-Aula-Nube) solo existe la calidad «maxima» (Cloudflare) y la voz: «baja» y «media» responden 422
«calidad_no_disponible», /calentar no carga nada y /salud lo dice en «calidades». Así ningún alumno desde su
casa despierta sd-turbo (2,5 GB) en el servidor. El token es el personal del alumno (ver nube.py), con tope
diario por alumno. IMAGEN_LOCAL=0 apaga sd-turbo también para las aulas (deja solo la nube y la voz).
"""

import gc
import io
import logging
import os
import re
import socket
import threading
import time
from collections import OrderedDict
from urllib.parse import quote

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

import nube

log = logging.getLogger("imagen")
logging.basicConfig(level=logging.INFO)

TOKEN = os.environ.get("IMAGEN_TOKEN", "")
REPOSO = int(os.environ.get("IMAGEN_REPOSO", "1800"))
# 0 = sin sd-turbo (ni carga al arrancar ni calidades baja/media): solo Cloudflare y la voz.
LOCAL = os.environ.get("IMAGEN_LOCAL", "1") != "0"
# Topes diarios por alumno (0 = sin tope). El cupo de Cloudflare es de toda la clase: con 2 pasos FLUX gasta
# ~90 neurons por imagen, así que 9800 al día alcanzan para ~100 imágenes; 5 por alumno lo reparte.
# La nube cuenta por token personal; las aulas, por contenedor (todas comparten el token de la clase).
MAXIMA_POR_ALUMNO = int(os.environ.get("IMAGEN_MAXIMA_POR_ALUMNO", "5"))
VOZ_POR_ALUMNO = int(os.environ.get("IMAGEN_VOZ_POR_ALUMNO", "300"))
# Dos modelos locales: sd-turbo (rápido, 1-2 pasos) y DreamShaper 8 con LCM (SD 1.5 afinado: dibuja personajes
# coherentes y estilo anime; 4 pasos). «media» usa IMAGEN_MEDIA (sd-turbo | dreamshaper). DreamShaper dibuja mejor personajes pero en este servidor
# (2 vCPU) tardó 25-100 s y con colores muy saturados: el instructor lo eligió igualmente (acepta esperar); IMAGEN_MEDIA=sd-turbo vuelve al rápido.
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
CF_API = os.environ.get("CF_API_BASE", "https://api.cloudflare.com/client/v4").rstrip("/")
CF_PASOS = int(os.environ.get("CF_PASOS", "2"))
_cf_cupo = threading.Semaphore(5)
CF_TOPE = float(os.environ.get("CF_NEURONS_DIA", "9800"))  # capa gratuita: 10 000 neurons/día (se reinicia 00:00 UTC)
_cf_uso = {"dia": "", "neurons": 0.0}


def _cf_gastado() -> float:
    hoy = time.strftime("%Y-%m-%d", time.gmtime())
    if _cf_uso["dia"] != hoy:
        _cf_uso.update(dia=hoy, neurons=0.0)
    return _cf_uso["neurons"]
VOZ_DEFECTO = os.environ.get("IMAGEN_VOZ", "es_MX-claude-high")
VOCES_DIR = os.environ.get("IMAGEN_VOCES", "/voces")
VOCES = {VOZ_DEFECTO}
FORMAS = {"cuadrado": (1.0, 1.0), "vertical": (0.8, 1.0), "horizontal": (1.0, 0.5625)}
# Respaldo de «máxima»: si Cloudflare se queda sin cupo o falla, FLUX por OpenRouter (de pago, menos de un centavo de
# dólar por imagen con flux-3-image-klein) con un tope diario para toda la clase que protege el saldo.
OR_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OR_MODELO = os.environ.get("IMAGEN_OR_MODELO", "black-forest-labs/flux-3-image-klein")
OR_DIA = int(os.environ.get("IMAGEN_OR_DIA", "150"))
OR_ASPECTO = {"cuadrado": "1:1", "vertical": "4:5", "horizontal": "16:9"}
_or_uso = {"dia": "", "n": 0}


def _or_disponible() -> bool:
    hoy = time.strftime("%Y-%m-%d", time.gmtime())
    if _or_uso["dia"] != hoy:
        _or_uso.update(dia=hoy, n=0)
    return bool(OR_KEY) and _or_uso["n"] < OR_DIA

# ---------------------------------------------------------------------------------------------------------------
# Traducción del prompt al inglés (FLUX y sd-turbo entienden inglés; los alumnos escriben en español).
# Cadena, de la más barata a la de último recurso, con un presupuesto total de tiempo:
#   1. modelos gratuitos de OpenRouter (IMAGEN_TRADUCIR_MODELOS, 4 s cada uno);
#   2. DeepSeek por OpenRouter (IMAGEN_TRADUCIR_RESPALDO, de pago y muy barato, sin razonamiento);
#   3. Cloudflare Workers AI (IMAGEN_TRADUCIR_CF, ~1,2 neurons por prompt, el mismo token que FLUX);
#   4. glosario mínimo palabra a palabra (nunca falla).
# Si OpenRouter dice 401/402/403 (llave vencida o sin saldo) se salta OpenRouter 10 minutos.
# Los textos entre comillas («…», “…”, "…") son lo que el alumno quiere ver escrito: no se traducen.
# Caché LRU en memoria. En el log solo va el modelo usado y los ms, nunca el prompt del alumno.
# ---------------------------------------------------------------------------------------------------------------
TRAD_MODELOS = [m.strip() for m in os.environ.get(
    "IMAGEN_TRADUCIR_MODELOS",
    "google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free,nvidia/nemotron-3.5-lightning:free").split(",") if m.strip()]
TRAD_RESPALDO = os.environ.get("IMAGEN_TRADUCIR_RESPALDO", "deepseek/deepseek-v4.1-flash").strip()
TRAD_CF = os.environ.get("IMAGEN_TRADUCIR_CF", "@cf/meta/llama-3.1-8b-instruct-fast").strip()
TRAD_TIMEOUT = float(os.environ.get("IMAGEN_TRADUCIR_TIMEOUT", "4"))
TRAD_PRESUPUESTO = float(os.environ.get("IMAGEN_TRADUCIR_PRESUPUESTO", "9"))  # s para OpenRouter; Cloudflare tiene los suyos
TRAD_CACHE = int(os.environ.get("IMAGEN_TRADUCIR_CACHE", "1024"))
TRAD_ACTIVA = os.environ.get("IMAGEN_TRADUCIR", "1") != "0"
TRAD_SISTEMA = (
    "You turn image-generation prompts written in Spanish (or any language) into one concise English prompt for the "
    "FLUX image model. Translate faithfully: keep every object, color, material, light, style and composition detail; "
    "do not add new elements. Tokens like QTXT1 or QTXT2 are placeholders for literal text: copy them unchanged, "
    "inside double quotes. Answer with the English prompt only: no notes, no preamble, no quotes around the answer.")
_trad_lock = threading.Lock()
_trad_cache: "OrderedDict[str, tuple[str, str]]" = OrderedDict()
_trad_or_pausa = {"hasta": 0.0}

_COMILLAS = re.compile(r'«([^«»]{1,200})»|“([^“”]{1,200})”|"([^"]{1,200})"')
_ACENTOS = set("áéíóúñü¿¡ÁÉÍÓÚÑÜ")
_ES = set("de la el los las un una unos unas con sin sobre para por del al en y o que se su sus muy más fondo "
          "luz estilo foto imagen color colores cálida cálido suave dorada dorado blanco blanca negro negra "
          "mesa botella comida producto personaje hecho hecha tipo como entre bajo junto".split())
_EN = set("the a an of with without on in and or for to at by from into over under its their very more background "
          "light style photo image color colors warm soft golden white black table bottle food product character "
          "made like between next".split())
_GLOSARIO = {
    "el": "the", "la": "the", "los": "the", "las": "the", "un": "a", "una": "a", "unos": "some", "unas": "some",
    "de": "of", "del": "of the", "al": "to the", "con": "with", "sin": "without", "sobre": "on", "en": "in", "y": "and",
    "o": "or", "para": "for", "por": "by", "entre": "between", "bajo": "under", "junto": "next to", "muy": "very",
    "botella": "bottle", "frasco": "bottle", "perfume": "perfume", "dorada": "golden", "dorado": "golden",
    "plateado": "silver", "plateada": "silver", "mármol": "marble", "marmol": "marble", "madera": "wood",
    "vidrio": "glass", "cristal": "crystal", "luz": "light", "suave": "soft", "fondo": "background", "blanco": "white",
    "blanca": "white", "negro": "black", "negra": "black", "rojo": "red", "roja": "red", "azul": "blue",
    "verde": "green", "amarillo": "yellow", "amarilla": "yellow", "rosado": "pink", "rosada": "pink", "rosa": "pink",
    "morado": "purple", "morada": "purple", "naranja": "orange", "gris": "gray", "cálida": "warm", "cálido": "warm",
    "fría": "cool", "frío": "cool", "estudio": "studio", "foto": "photo", "fotografía": "photography",
    "producto": "product", "productos": "products", "comida": "food", "plato": "dish", "taza": "cup",
    "café": "coffee", "mesa": "table", "cocina": "kitchen", "hamburguesa": "burger", "ensalada": "salad",
    "postre": "dessert", "pastel": "cake", "torta": "cake", "fruta": "fruit", "frutas": "fruits", "flor": "flower",
    "flores": "flowers", "hojas": "leaves", "cielo": "sky", "mar": "sea", "playa": "beach", "montaña": "mountain",
    "ciudad": "city", "calle": "street", "noche": "night", "día": "day", "atardecer": "sunset", "letras": "lettering",
    "texto": "text", "cartel": "poster", "afiche": "poster", "volante": "flyer", "personaje": "character",
    "mujer": "woman", "hombre": "man", "niño": "boy", "niña": "girl", "gato": "cat", "perro": "dog", "caja": "box",
    "bolsa": "bag", "zapatos": "shoes", "ropa": "clothing", "vestido": "dress", "reloj": "watch", "lujo": "luxury",
    "elegante": "elegant", "moderno": "modern", "moderna": "modern", "minimalista": "minimalist",
    "realista": "realistic", "ilustración": "illustration", "dibujo": "drawing", "acuarela": "watercolor",
    "sombra": "shadow", "sombras": "shadows", "brillo": "glow", "reflejo": "reflection", "agua": "water",
    "hielo": "ice", "verano": "summer", "invierno": "winter", "grande": "large", "pequeño": "small",
    "pequeña": "small", "calidad": "quality", "detallado": "detailed", "detallada": "detailed", "logo": "logo",
    "empresa": "company", "tienda": "shop", "vitrina": "shop window", "iluminación": "lighting", "cerca": "close",
}


def _sacar_literales(texto: str) -> tuple[str, list[str]]:
    """Cambia cada texto entre comillas por "QTXTn": el modelo no lo traduce y luego se devuelve tal cual."""
    literales: list[str] = []

    def _cambio(m):
        literales.append(next(g for g in m.groups() if g is not None))
        return f'"QTXT{len(literales)}"'

    return _COMILLAS.sub(_cambio, texto), literales


def _poner_literales(texto: str, literales: list[str]) -> str:
    for i, lit in enumerate(literales, 1):
        token = f"QTXT{i}"
        if token in texto:
            texto = re.sub(r'["«“”»\']*' + token + r'["«“”»\']*', f'"{lit}"', texto)
        else:  # el modelo se lo comió: se agrega al final para que FLUX igual lo escriba
            texto = texto.rstrip(" .") + f', with the text "{lit}"'
    return texto


def _es_ingles(texto: str) -> bool:
    """True si el prompt (sin sus textos literales) ya está en inglés: no se gasta una llamada."""
    sin_lit, _ = _sacar_literales(texto)
    sin_lit = re.sub(r'"QTXT\d+"', " ", sin_lit)
    if any(c in _ACENTOS for c in sin_lit):
        return False
    palabras = re.findall(r"[a-zA-Z']+", sin_lit.lower())
    es = sum(w in _ES for w in palabras)
    en = sum(w in _EN for w in palabras)
    return en > es


def _glosario(texto: str) -> str:
    def _palabra(m):
        w = m.group(0)
        t = _GLOSARIO.get(w.lower())
        return t if t is not None else w
    return re.sub(r"[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+", _palabra, texto)


def _limpiar_salida(txt: str, original: str) -> str | None:
    txt = (txt or "").strip()
    if not txt:
        return None
    txt = re.sub(r"^(english( prompt)?|prompt|translation)\s*:\s*", "", txt, flags=re.I)
    txt = " ".join(l.strip() for l in txt.splitlines() if l.strip())
    if len(txt) >= 2 and txt[0] == txt[-1] and txt[0] in "\"'" and txt.count(txt[0]) == 2:
        txt = txt[1:-1].strip()
    if not txt or len(txt) > 3 * len(original) + 300:
        return None
    return txt


def _por_openrouter(modelo: str, texto: str, timeout: float) -> str | None:
    import httpx

    r = httpx.post("https://openrouter.ai/api/v1/chat/completions", timeout=timeout,
                   headers={"Authorization": f"Bearer {OR_KEY}", "HTTP-Referer": "https://jmd-learn.online",
                            "X-Title": "JMD imagen (traducir prompt)"},
                   json={"model": modelo, "temperature": 0.2, "max_tokens": 400, "reasoning": {"enabled": False},
                         "messages": [{"role": "system", "content": TRAD_SISTEMA}, {"role": "user", "content": texto}]})
    if r.status_code in (401, 402, 403):
        _trad_or_pausa["hasta"] = time.time() + 600
        log.warning("traducir: OpenRouter %s (llave vencida o sin saldo): se salta 10 min", r.status_code)
        return None
    if r.status_code != 200:
        return None
    try:
        return r.json()["choices"][0]["message"]["content"]
    except Exception:
        return None


def _por_cloudflare(texto: str, timeout: float) -> str | None:
    import httpx

    if not (CF_CUENTA and CF_TOKEN and TRAD_CF) or _cf_gastado() >= CF_TOPE:
        return None
    r = httpx.post(f"{CF_API}/accounts/{CF_CUENTA}/ai/run/{TRAD_CF}", timeout=timeout,
                   headers={"Authorization": f"Bearer {CF_TOKEN}"},
                   json={"temperature": 0.2, "max_tokens": 400,
                         "messages": [{"role": "system", "content": TRAD_SISTEMA}, {"role": "user", "content": texto}]})
    if r.status_code != 200:
        return None
    try:
        res = r.json()["result"]
        salida = res["response"]
    except Exception:
        return None
    if not isinstance(salida, str):
        return None
    _cf_uso["neurons"] = _cf_gastado() + float((res.get("usage") or {}).get("neurons", 1.2) or 1.2)
    return salida


def traducir(prompt: str) -> tuple[str, str, int]:
    """(prompt en inglés, modelo usado, ms). Nunca lanza: en el peor caso devuelve el glosario sobre el original."""
    t0 = time.time()
    texto = (prompt or "").strip()
    ms = lambda: int((time.time() - t0) * 1000)  # noqa: E731
    if not texto:
        return texto, "vacio", 0
    if not TRAD_ACTIVA or _es_ingles(texto):
        return texto, "ya-en-ingles" if TRAD_ACTIVA else "desactivada", ms()
    with _trad_lock:
        hit = _trad_cache.get(texto)
        if hit:
            _trad_cache.move_to_end(texto)
            log.info("traducir: cache (%s) %d ms", hit[1], ms())
            return hit[0], "cache:" + hit[1], ms()
    base, literales = _sacar_literales(texto)
    candidatos: list[tuple[str, str]] = []
    if OR_KEY:
        candidatos += [("or", m) for m in TRAD_MODELOS]
        if TRAD_RESPALDO:
            candidatos.append(("or", TRAD_RESPALDO))
    candidatos.append(("cf", TRAD_CF))
    for prov, modelo in candidatos:
        t1 = time.time()
        try:
            if prov == "or":
                resto = TRAD_PRESUPUESTO - (time.time() - t0)
                if time.time() < _trad_or_pausa["hasta"] or resto < 0.5:
                    continue
                crudo = _por_openrouter(modelo, base, min(TRAD_TIMEOUT, resto))
            else:
                crudo = _por_cloudflare(base, TRAD_TIMEOUT)
        except Exception as e:  # timeout, red, JSON roto: siguiente modelo
            log.warning("traducir: %s falló (%s) en %d ms", modelo, type(e).__name__, int((time.time() - t1) * 1000))
            continue
        en = _limpiar_salida(crudo, base)
        if not en:
            log.warning("traducir: %s sin respuesta útil en %d ms", modelo, int((time.time() - t1) * 1000))
            continue
        en = _poner_literales(en, literales)
        with _trad_lock:
            _trad_cache[texto] = (en, modelo)
            _trad_cache.move_to_end(texto)
            while len(_trad_cache) > TRAD_CACHE:
                _trad_cache.popitem(last=False)
        log.info("traducir: %s %d ms", modelo, ms())
        return en, modelo, ms()
    en = _poner_literales(_glosario(base), literales)
    log.warning("traducir: todos los modelos fallaron, glosario %d ms", ms())
    return en, "glosario", ms()


class PedidoTraducir(BaseModel):
    texto: str


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
    if not LOCAL:
        return
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


def _autorizar(authorization: str, x_aula_nube: str | None, que: str = "", tope: int = 0) -> str | None:
    """Aulas: token de la clase. Nube: token personal del alumno (y su tope diario de `que`)."""
    if nube.es_externo(x_aula_nube):
        sub = nube.alumno(authorization)
        if que:
            nube.contar(sub, que, tope)
        return sub
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "token")
    return None


def _no_disponible(calidad: str) -> HTTPException:
    return HTTPException(422, {"codigo": "calidad_no_disponible", "calidad": calidad,
                               "mensaje": f"La calidad «{calidad}» no está disponible en esta versión: solo «maxima» (FLUX en la nube del curso)."})


@app.post("/voz")
def voz(p: PedidoVoz, authorization: str = Header(default=""), x_aula_nube: str | None = Header(default=None)):
    """Texto a voz con Piper (WAV). Es liviano (<1 s por frase) y no pasa por la cola de imágenes."""
    _autorizar(authorization, x_aula_nube, "frases de voz", VOZ_POR_ALUMNO)
    texto = p.texto.strip()
    if not texto or len(texto) > 700:
        raise HTTPException(400, "texto vacío o demasiado largo")
    nombre = p.voz if p.voz in VOCES else VOZ_DEFECTO
    import wave

    from piper import PiperVoice

    if nombre not in _voces:
        _voces[nombre] = PiperVoice.load(f"{VOCES_DIR}/{nombre}.onnx")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        _voces[nombre].synthesize_wav(texto, w)
    return Response(buf.getvalue(), media_type="audio/wav")


@app.get("/salud")
def salud(x_aula_nube: str | None = Header(default=None)):
    maxima = (bool(CF_CUENTA and CF_TOKEN) and _cf_gastado() < CF_TOPE) or _or_disponible()
    local = LOCAL and not nube.es_externo(x_aula_nube)
    return {"ok": True, "cargado": sorted(_pipes), "cola": _en_cola, "maxima": maxima, "neurons_hoy": round(_cf_gastado()),
            "calidades": {"baja": local, "media": local, "maxima": maxima},
            "voz": os.path.isfile(f"{VOCES_DIR}/{VOZ_DEFECTO}.onnx")}


def _cloudflare(p: "Pedido") -> Response:
    """FLUX.1 schnell por la API REST de Cloudflare. 429 cuando el cupo diario se acaba (el cliente cae a Gemini)."""
    import base64

    import httpx
    from PIL import Image

    if not (CF_CUENTA and CF_TOKEN):
        raise HTTPException(503, "calidad máxima no configurada")
    if _cf_gastado() >= CF_TOPE:
        raise HTTPException(429, "cupo diario de Cloudflare agotado (se reinicia a las 00:00 UTC, 19:00 en Lima)")
    if not _cf_cupo.acquire(blocking=False):
        raise HTTPException(429, "cola llena")
    try:
        for intento in (1, 2):  # a veces falla con «Cog prediction failed» (409/8007): se reintenta una vez
            r = httpx.post(f"{CF_API}/accounts/{CF_CUENTA}/ai/run/{CF_MODELO}", timeout=90.0,
                           headers={"Authorization": f"Bearer {CF_TOKEN}"}, json={"prompt": p.prompt, "steps": CF_PASOS})
            if r.status_code != 409:
                break
    finally:
        _cf_cupo.release()
    if r.status_code in (429, 403) or (r.status_code >= 400 and "neurons" in r.text.lower()):
        log.warning("cloudflare: cupo o permiso (%s) %s", r.status_code, r.text[:200])
        if r.status_code == 429 or "neurons" in r.text.lower():
            _cf_uso["neurons"] = max(_cf_gastado(), CF_TOPE)  # el resto del día /salud dice «maxima»: false
        raise HTTPException(429, "cupo diario de Cloudflare agotado (se reinicia a las 00:00 UTC, 19:00 en Lima)")
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
    log.info("maxima (cloudflare) %dx%d", *img.size)
    return _formato(img, p.orientacion)


def _formato(img, orientacion: str) -> Response:
    """FLUX entrega cuadrado (o casi): se recorta al formato pedido y sale en JPEG de hasta 1024 px."""
    fa, fh = FORMAS.get(orientacion, FORMAS["cuadrado"])
    w, h = img.size
    if fa != fh:
        nw, nh = (int(h * fa / fh), h) if fa / fh < w / h else (w, int(w * fh / fa))
        img = img.crop(((w - nw) // 2, (h - nh) // 2, (w - nw) // 2 + nw, (h - nh) // 2 + nh))
    img.thumbnail((1024, 1024))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    return Response(buf.getvalue(), media_type="image/jpeg")


def _openrouter(p: "Pedido") -> Response:
    """Respaldo: FLUX por OpenRouter cuando Cloudflare no puede. Cuenta contra OR_DIA."""
    import base64
    import httpx
    from PIL import Image
    # Los FLUX de OpenRouter van por /api/v1/images (no por chat/completions): devuelve data[0].b64_json (~US$ 0,009).
    r = httpx.post("https://openrouter.ai/api/v1/images", timeout=120.0,
                   headers={"Authorization": f"Bearer {OR_KEY}", "HTTP-Referer": "https://jmd-learn.online", "X-Title": "JMD imagen (respaldo FLUX)"},
                   json={"model": OR_MODELO, "prompt": p.prompt, "aspect_ratio": OR_ASPECTO.get(p.orientacion, "1:1")})
    try:
        d = r.json()
        crudo = base64.b64decode(d["data"][0]["b64_json"])
    except Exception:
        log.warning("openrouter %s %s", r.status_code, r.text[:300])
        raise HTTPException(429 if r.status_code == 402 else 502, "el respaldo de imágenes (OpenRouter) no respondió")
    _or_uso["n"] += 1
    img = Image.open(io.BytesIO(crudo)).convert("RGB")
    log.info("maxima (openrouter %s) %dx%d · costo %s · %d hoy", OR_MODELO, *img.size, (d.get("usage") or {}).get("cost"), _or_uso["n"])
    return _formato(img, p.orientacion)


@app.post("/calentar")
def calentar(authorization: str = Header(default=""), x_aula_nube: str | None = Header(default=None)):
    """Carga el modelo en segundo plano: la primera imagen de la clase no espera el minuto de carga."""
    _autorizar(authorization, x_aula_nube)
    if nube.es_externo(x_aula_nube) or not LOCAL:
        return {"ok": True, "cargado": [], "nube": "sin modelos locales: solo «maxima»"}
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


def _aula_de(request: Request) -> str | None:
    """Nombre del contenedor de aula que pide (curso-<alumno>), por DNS inverso de Docker en aula_net.
    None para el propio servidor (127.0.0.1: scripts del profesor), que no lleva tope."""
    ip = request.client.host if request.client else ""
    if not ip or ip.startswith("127."):
        return None
    try:
        nombre = socket.gethostbyaddr(ip)[0].split(".")[0]
    except OSError:
        nombre = ""
    # El LMS genera en nombre del alumno (escenas del LIVE): manda X-Alumno y el tope se cuenta por alumno,
    # no por el contenedor del LMS. Solo se acepta del propio LMS.
    alumno = (request.headers.get("x-alumno") or "").strip()[:80]
    if nombre == "lms" and alumno:
        return "lms:" + alumno
    return "aula:" + (nombre or ip)


@app.post("/generar")
def generar(p: Pedido, request: Request, authorization: str = Header(default=""), x_aula_nube: str | None = Header(default=None)):
    global _en_cola, _ultimo
    externo = nube.es_externo(x_aula_nube)
    sub = _autorizar(authorization, x_aula_nube)
    if not p.prompt.strip() or len(p.prompt) > 1000:
        raise HTTPException(400, "prompt vacío o demasiado largo")
    if externo and p.calidad != "maxima":
        raise _no_disponible(p.calidad)
    if p.calidad == "maxima":
        quien = sub if externo else _aula_de(request)
        if quien:
            nube.contar(quien, "imágenes en calidad máxima", MAXIMA_POR_ALUMNO)
        en, trad_modelo, trad_ms = traducir(p.prompt)
        p = p.model_copy(update={"prompt": en})
        try:
            r = _cloudflare(p)
        except HTTPException as e:
            if e.status_code in (429, 502, 503) and "cola llena" not in str(e.detail) and _or_disponible():
                log.warning("cloudflare no pudo (%s %s): respaldo FLUX por OpenRouter", e.status_code, e.detail)
                r = _openrouter(p)
            else:
                raise
        return _con_traduccion(r, en, trad_modelo, trad_ms)
    if not LOCAL:
        raise _no_disponible(p.calidad)
    en, trad_modelo, trad_ms = traducir(p.prompt)
    p = p.model_copy(update={"prompt": en})
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
    return _con_traduccion(Response(buf.getvalue(), media_type="image/jpeg"), en, trad_modelo, trad_ms)


def _con_traduccion(r: Response, en: str, modelo: str, ms: int) -> Response:
    """Cabeceras para quien quiera mostrar el prompt que de verdad recibió el modelo (URL-encoded: ASCII seguro)."""
    r.headers["X-Prompt-En"] = quote(en[:1500], safe=" ,.")
    r.headers["X-Traduccion-Modelo"] = quote(modelo, safe="/:@.-_")
    r.headers["X-Traduccion-Ms"] = str(ms)
    return r


@app.post("/traducir")
def traducir_ruta(p: PedidoTraducir, authorization: str = Header(default=""), x_aula_nube: str | None = Header(default=None)):
    """Prompt de imagen al inglés para otros servicios (p. ej. los sprites del LMS en Go). Mismo token que /generar."""
    _autorizar(authorization, x_aula_nube)
    texto = (p.texto or "").strip()
    if not texto or len(texto) > 1000:
        raise HTTPException(400, "texto vacío o demasiado largo")
    en, modelo, ms = traducir(texto)
    return {"en": en, "modelo": modelo, "ms": ms}
