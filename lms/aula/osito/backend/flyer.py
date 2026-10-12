"""Flyers con texto real.

Un modelo de difusion dibuja bien pero no escribe. Por eso un flyer se arma en
tres pasos: el LLM local extrae los datos del pedido (titulo, fecha, hora,
precio...), sd-turbo pinta solo el fondo, y Pillow compone la tipografia encima.
"""

from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path

import httpx

from . import motores

log = logging.getLogger("osito.flyer")

ANCHO, ALTO = 1080, 1350  # 4:5, formato de redes

PALABRAS_FLYER = ("flyer", "afiche", "volante", "poster", "póster", "banner", "invitacion", "invitación",
                  "anuncio", "cartel", "publicidad", "promocion", "promoción")

ACENTOS = {
    "profesional": ((154, 213, 255), (15, 18, 34)),
    "kawaii": ((255, 179, 217), (46, 24, 44)),
    "tecnico": ((158, 240, 210), (10, 28, 30)),
}

CAMPOS = ("titulo", "subtitulo", "descripcion", "fecha", "hora", "precio", "lugar", "ponente", "contacto", "tema_visual")

MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre"
DIAS = "lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo"


def es_pedido_de_flyer(prompt: str) -> bool:
    p = prompt.lower()
    return any(k in p for k in PALABRAS_FLYER)


# ---------------------------------------------------------------- 1. datos


def _extraer_regex(prompt: str) -> dict:
    p = " " + prompt + " "
    datos = {k: "" for k in CAMPOS}
    m = re.search(rf"((?:{DIAS})\s+)?(\d{{1,2}})\s+de\s+({MESES})", p, re.I)
    if m:
        datos["fecha"] = (m.group(1) or "").strip().capitalize() + (" " if m.group(1) else "") + f"{m.group(2)} de {m.group(3).lower()}"
    m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?\s*m\.?|p\.?\s*m\.?|h(?:oras)?)\b", p, re.I)
    if m:
        datos["hora"] = f"{m.group(1)}:{m.group(2) or '00'} {m.group(3).replace('.', '').replace(' ', '').lower()}".replace(" h", " h")
    m = re.search(r"(?:s/\.?\s*|soles?\s*)(\d+)|(\d+)\s*soles", p, re.I)
    if m:
        datos["precio"] = f"S/ {m.group(1) or m.group(2)}"
    m = re.search(r"(?:ense[ñn]ando|curso de|taller de|clase de|sobre)\s+([A-Za-z0-9+#.\- ]{2,40}?)(?:\s+(?:a las|el|del|por|para|,|\.)|$)", p, re.I)
    tema = m.group(1).strip() if m else "programacion"
    datos["titulo"] = f"Taller de {tema}"
    datos["subtitulo"] = "Evento de programacion en vivo"
    datos["descripcion"] = f"Aprende {tema} desde cero con ejercicios practicos en vivo."
    datos["tema_visual"] = f"{tema} programming workshop, laptop with code, abstract geometric shapes"
    return datos


def extraer_datos(prompt: str) -> tuple[dict, str]:
    """Devuelve (datos, fuente) con fuente en {ollama, regex}."""
    base = _extraer_regex(prompt)
    if not motores.llm_disponible():
        return base, "regex"
    instrucciones = (
        "Extrae los datos de un flyer a partir del pedido del usuario. Responde SOLO un JSON con estas claves: "
        + ", ".join(CAMPOS)
        + ". Reglas: titulo de 2 a 5 palabras en espanol con el tema literal del pedido, por ejemplo 'Taller de PHP en vivo'; "
          "nunca agregues marcas, apodos ni palabras como Dummies; subtitulo de una linea de MAXIMO 36 caracteres que diga que es (taller, curso, "
          "charla, venta) y para quien; descripcion: una frase de maximo 90 caracteres sobre que aprendera el asistente; fecha como 'Domingo 11 de octubre'; hora como "
          "'6:00 pm'; precio MUY corto, de maximo 14 caracteres, como 'S/ 100', 'Gratis' o 'Desde S/ 5'; lugar si lo menciona (si no, 'En linea'); ponente si lo "
          "menciona (si no, cadena vacia); contacto si lo menciona (si no, cadena vacia); tema_visual: una frase en "
          "INGLES de 8 a 15 palabras describiendo una ilustracion de fondo SIN personas, SIN pantallas, SIN codigo y "
          "SIN letras (usa objetos, luces, formas y colores que evoquen el tema). Si un dato no esta en el pedido, deja cadena vacia. No inventes fechas ni precios."
    )
    try:
        if motores.PERFIL == "nube":
            crudo = motores.json_nube(instrucciones, prompt)
        else:
            cuerpo = {
                "model": motores.MODELO,
                "messages": [{"role": "system", "content": instrucciones}, {"role": "user", "content": prompt}],
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.1, "num_predict": 300},
            }
            if motores.MODELO.startswith("qwen3"):
                cuerpo["think"] = False
            r = httpx.post(f"{motores.OLLAMA_URL}/api/chat", json=cuerpo, timeout=60.0)
            r.raise_for_status()
            crudo = json.loads(r.json().get("message", {}).get("content", "{}"))
    except (httpx.HTTPError, ValueError) as e:
        log.warning("extraccion por ollama fallo (%s); uso regex", e)
        return base, "regex"
    datos = {k: str(crudo.get(k, "") or "").strip() for k in CAMPOS}
    # El regex manda en fecha, hora y precio cuando los encontro: son datos duros y el LLM pequeno a veces los altera.
    for k in ("fecha", "hora", "precio"):
        if base[k]:
            datos[k] = base[k]
    for k in CAMPOS:
        if not datos[k]:
            datos[k] = base[k]
    if not datos["lugar"]:
        datos["lugar"] = "En linea"
    return datos, "nube" if motores.PERFIL == "nube" else "ollama"


# ---------------------------------------------------------------- 2. fondo


def _fondo_sd(tema_visual: str, estilo: str, motor: str):
    prompt = (
        f"{motores.sujeto_para(motor, tema_visual)}, poster background, purely visual without any writing, "
        f"composition with calm empty space in the lower half, {motores.estilo_para(motor, estilo)}"
    )
    return motores.imagen.generar(motor, prompt, "vertical")


def _fondo_demo(estilo: str):
    from PIL import Image

    (r1, g1, b1), (r2, g2, b2) = {"profesional": ((28, 44, 78), (86, 128, 196)),
                                  "kawaii": ((255, 196, 214), (190, 222, 255)),
                                  "tecnico": ((16, 36, 52), (24, 110, 120))}[estilo]
    img = Image.new("RGB", (512, 640))
    px = img.load()
    for y in range(640):
        t = y / 639
        fila = (int(r1 + (r2 - r1) * t), int(g1 + (g2 - g1) * t), int(b1 + (b2 - b1) * t))
        for x in range(512):
            px[x, y] = fila
    return img


# ---------------------------------------------------------------- 3. composicion


def _envolver(d, texto: str, fuente, ancho_max: int) -> list[str]:
    lineas, actual = [], ""
    for palabra in texto.split():
        prueba = f"{actual} {palabra}".strip()
        if d.textlength(prueba, font=fuente) <= ancho_max or not actual:
            actual = prueba
        else:
            lineas.append(actual)
            actual = palabra
    if actual:
        lineas.append(actual)
    return lineas


def _titulo_ajustado(d, texto: str, ancho_max: int, tam: int = 96, minimo: int = 56):
    while tam > minimo:
        f = motores._fuente(tam)
        lineas = _envolver(d, texto, f, ancho_max)
        if len(lineas) <= 2:
            return f, lineas
        tam -= 6
    f = motores._fuente(minimo)
    return f, _envolver(d, texto, f, ancho_max)[:3]


def _chip(d, xy, texto: str, fuente, relleno, tinta, alto: int = 64, pad: int = 26) -> int:
    x, y = xy
    w = int(d.textlength(texto, font=fuente)) + pad * 2
    d.rounded_rectangle((x, y, x + w, y + alto), radius=alto // 2, fill=relleno)
    d.text((x + pad, y + alto / 2), texto, font=fuente, fill=tinta, anchor="lm")
    return w


def componer(datos: dict, fondo, estilo: str, ruta: Path) -> None:
    from PIL import Image, ImageDraw, ImageFilter

    acento, oscuro = ACENTOS[estilo]
    blanco = (255, 255, 255)
    suave = (225, 228, 240)

    # Fondo a cubrir todo el lienzo
    base = fondo.convert("RGB").resize((ANCHO, int(ANCHO * fondo.height / fondo.width)), Image.LANCZOS)
    if base.height < ALTO:
        base = fondo.convert("RGB").resize((int(ALTO * fondo.width / fondo.height), ALTO), Image.LANCZOS)
    dx, dy = (base.width - ANCHO) // 2, (base.height - ALTO) // 2
    lienzo = base.crop((dx, dy, dx + ANCHO, dy + ALTO))

    # Vineta suave arriba y degradado hacia el panel: profundidad y legibilidad de la etiqueta
    velo = Image.new("L", (1, ALTO))
    for yy in range(ALTO):
        t = yy / (ALTO - 1)
        velo.putpixel((0, yy), int(90 * max(0.0, 1 - t * 2.2) + 120 * max(0.0, (t - 0.38) / 0.62)))
    velo = velo.resize((ANCHO, ALTO))
    lienzo = Image.composite(Image.new("RGB", lienzo.size, oscuro), lienzo, velo)

    # Panel inferior translucido (vidrio oscuro) para que el texto siempre se lea
    y_panel = int(ALTO * 0.46)
    m = 56
    recorte = lienzo.crop((m, y_panel, ANCHO - m, ALTO - m)).filter(ImageFilter.GaussianBlur(18))
    lienzo.paste(recorte, (m, y_panel))
    capa = Image.new("RGBA", lienzo.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(capa)
    cd.rounded_rectangle((m, y_panel, ANCHO - m, ALTO - m), radius=40, fill=oscuro + (218,))
    cd.rounded_rectangle((m, y_panel, ANCHO - m, ALTO - m), radius=40, outline=acento + (110,), width=2)
    # Marco editorial fino
    cd.rounded_rectangle((m - 22, m - 22, ANCHO - m + 22, ALTO - m + 22), radius=56, outline=(255, 255, 255, 60), width=2)
    lienzo = Image.alpha_composite(lienzo.convert("RGBA"), capa)
    d = ImageDraw.Draw(lienzo)

    # Etiqueta superior
    etiqueta = (datos.get("subtitulo") or "Evento de programacion").upper()
    if len(etiqueta) > 38:
        etiqueta = etiqueta[:36].rstrip() + "..."
    _chip(d, (m, m), etiqueta, motores._fuente(26), oscuro + (200,), acento, alto=56, pad=22)

    # Titulo
    x = m + 48
    y = y_panel + 56
    ancho_texto = ANCHO - 2 * (m + 48)
    f_titulo, lineas = _titulo_ajustado(d, datos.get("titulo") or "Taller de programacion", ancho_texto)
    for linea in lineas:
        d.text((x + 3, y + 4), linea, font=f_titulo, fill=(0, 0, 0, 110))  # sombra sutil
        d.text((x, y), linea, font=f_titulo, fill=blanco)
        y += int(f_titulo.size * 1.12)
    y += 10
    d.line((x, y, x + 160, y), fill=acento, width=6)
    y += 36

    # Chips: fecha, hora, lugar
    f_chip = motores._fuente(30)
    relleno_chip = tuple(int(o * 0.78 + 255 * 0.22) for o in oscuro)
    cx = x
    for valor in (datos.get("fecha"), datos.get("hora"), datos.get("lugar")):
        if not valor:
            continue
        ancho_chip = int(d.textlength(valor, font=f_chip)) + 52
        if cx > x and cx + ancho_chip > ANCHO - m - 48:  # no cabe en la linea: baja a la siguiente
            cx = x
            y += 78
        w = _chip(d, (cx, y), valor, f_chip, relleno_chip, blanco)
        cx += w + 14
    y += 100

    # Zona inferior: insignia de precio a la derecha; ponente y contacto a la izquierda, alineados con ella
    precio = datos.get("precio") or ""
    f_peq = motores._fuente(24)
    alto_insignia = 128
    tam_precio = 64
    f_precio = motores._fuente(tam_precio)
    # El precio nunca ocupa mas de la mitad del ancho: si es largo, se achica la letra para no tapar el pie.
    while precio and tam_precio > 36 and d.textlength(precio, font=f_precio) + 72 > ANCHO * 0.5:
        tam_precio -= 4
        f_precio = motores._fuente(tam_precio)
    ancho_insignia = (int(d.textlength(precio, font=f_precio)) + 72) if precio else 0
    px0 = ANCHO - m - 48 - ancho_insignia
    py0 = ALTO - m - 48 - alto_insignia
    if precio:
        d.rounded_rectangle((px0, py0, px0 + ancho_insignia, py0 + alto_insignia), radius=28, fill=acento)
        d.text((px0 + 36, py0 + 30), "PRECIO", font=f_peq, fill=oscuro)
        d.text((px0 + 36, py0 + 58), precio, font=f_precio, fill=oscuro)
    ancho_izq = (px0 - 32 - x) if precio else ancho_texto

    lineas_pie = []
    if datos.get("ponente"):
        lineas_pie.append(f"Dicta: {datos['ponente']}")
    lineas_pie.append(datos.get("contacto") or "Cupos limitados")
    f_pie = motores._fuente(30)
    y_pie = py0 + 18
    for linea in lineas_pie[:2]:
        for parte in _envolver(d, linea, f_pie, ancho_izq)[:1]:
            d.text((x, y_pie), parte, font=f_pie, fill=suave)
        y_pie += 46

    # Descripcion corta entre los chips y el pie, solo si cabe
    if datos.get("descripcion"):
        f_desc = motores._fuente(32)
        lineas = _envolver(d, datos["descripcion"], f_desc, ancho_texto - 24)[:2]
        if y + len(lineas) * 44 <= py0 - 28:
            for linea in lineas:
                d.text((x, y), linea, font=f_desc, fill=suave)
                y += 44

    lienzo.convert("RGB").save(ruta, "PNG", optimize=True)


# ---------------------------------------------------------------- orquestacion


def generar_flyer(prompt: str, estilo: str, ruta: Path, calidad: str = "buena") -> dict:
    estilo = estilo if estilo in ACENTOS else "profesional"
    t0 = time.time()
    datos, fuente = extraer_datos(prompt)
    motor = motores.motor_imagen(calidad)
    fondo = None
    if motor != "demo":
        try:
            fondo = _fondo_sd(datos.get("tema_visual") or prompt, estilo, motor)
        except Exception as e:
            log.exception("fondo sd-turbo fallo, uso degradado: %s", e)
            motor = "demo"
    if fondo is None:
        fondo = _fondo_demo(estilo)
    componer(datos, fondo, estilo, ruta)
    return {"motor": f"flyer/{motor}", "segundos": round(time.time() - t0, 2), "datos": datos, "datos_por": fuente}
