#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convierte un manual en Markdown a un PDF de texto real (seleccionable).

Pensado para un contenedor mínimo: solo usa la biblioteca estándar de Python
y Pillow (únicamente para leer las imágenes). Sin navegador, LaTeX ni pandoc.

Uso:
    python3 pdf.py manual.md manual.pdf [--titulo "Texto del pie"]

Desde Python:
    from pdf import md_a_pdf
    paginas = md_a_pdf(texto_md, "manual.pdf", base_dir="carpeta", pie="Mi sistema")

Markdown que entiende: títulos #, ##, ### (el primer # es la portada), párrafos
con **negrita**, *cursiva* y `código`, listas - y 1., tablas GFM, imágenes
![pie](ruta), bloques ```, citas > y --- como salto de página.
"""
import argparse
import datetime
import io
import os
import re
import sys
import unicodedata
import zlib
from urllib.parse import unquote

# ───────────────────────── Medidas de la página (A4, en puntos) ─────────────────────────
ANCHO, ALTO = 595.0, 842.0
MARGEN = 56.0
UTIL = ANCHO - 2 * MARGEN          # ancho útil para el contenido
LIMITE = ALTO - MARGEN             # hasta dónde baja el contenido (medido desde arriba)
ALTO_MAX_IMG = ALTO * 0.55         # una imagen no ocupa más del 55 % del alto

TEXTO = "0.13 0.13 0.13"           # color del texto normal
TITULO = "0.10 0.21 0.36"          # color de los títulos
GRIS = "0.42 0.42 0.42"            # pies, datos de portada

# ───────────────────────── Anchos AFM (milésimas de em), códigos 32 a 126 ─────────────────────────
_HELV = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]
_HELV_B = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]
# Signos de cp1252 fuera del ASCII: (ancho normal, ancho negrita)
_EXTRA = {
    "«": (556, 556), "»": (556, 556), "¿": (611, 611), "¡": (333, 333),
    "—": (1000, 1000), "–": (556, 556), "‘": (222, 278), "’": (222, 278),
    "“": (333, 500), "”": (333, 500), "‚": (222, 278), "„": (333, 500),
    "•": (350, 350), "…": (1000, 1000), "°": (400, 400), "€": (556, 556),
    "·": (278, 278), "ª": (370, 370), "º": (365, 365), "©": (737, 737),
    "®": (737, 737), "™": (1000, 1000), "±": (584, 584), "×": (584, 584),
    "÷": (584, 584), "½": (834, 834), "¼": (834, 834), "¾": (834, 834),
    "\u00a0": (278, 278), "‹": (333, 333), "›": (333, 333), "§": (556, 556),
    "¶": (537, 556), "µ": (556, 611), "¢": (556, 556), "£": (556, 556),
    "¥": (556, 556), "†": (556, 556), "‡": (556, 556), "‰": (1000, 1000),
    "¬": (584, 584), "¨": (333, 333), "´": (333, 333), "¸": (333, 333),
    "²": (333, 333), "³": (333, 333), "¹": (333, 333), "¦": (260, 280),
    "ß": (611, 611), "æ": (889, 889), "Æ": (1000, 1000), "ø": (611, 611),
    "Ø": (778, 778), "œ": (944, 944), "Œ": (1000, 1000), "ƒ": (556, 556),
    "ˆ": (333, 333), "˜": (333, 333), "ð": (556, 611), "Ð": (722, 722),
    "þ": (556, 611), "Þ": (667, 667), "¤": (556, 556), "¯": (333, 333),
}
_CACHE_ANCHO = {}


def _ancho_car(ch, negrita):
    """Ancho de un carácter en milésimas de em (Helvetica o Helvetica-Bold)."""
    clave = (ch, negrita)
    v = _CACHE_ANCHO.get(clave)
    if v is not None:
        return v
    tabla = _HELV_B if negrita else _HELV
    o = ord(ch)
    if 32 <= o <= 126:
        v = tabla[o - 32]
    elif ch in _EXTRA:
        v = _EXTRA[ch][1 if negrita else 0]
    else:
        # Letra acentuada: se usa el ancho de la letra base (á -> a, ñ -> n).
        base = unicodedata.normalize("NFD", ch)[0]
        ob = ord(base)
        v = tabla[ob - 32] if 32 <= ob <= 126 else (611 if negrita else 600)
    _CACHE_ANCHO[clave] = v
    return v


FACTOR_CODIGO = 0.93   # el código en línea va un poco más pequeño que el texto


def ancho(txt, estilo, tam):
    """Ancho en puntos de un texto. Estilos: r normal, b negrita, i cursiva, c código."""
    if estilo == "c":
        return len(txt) * 0.6 * tam * FACTOR_CODIGO
    neg = estilo == "b"
    return sum(_ancho_car(c, neg) for c in txt) * tam / 1000.0


def ancho_linea(frags, tam):
    return sum(ancho(t, e, tam) for t, e in frags)


# ───────────────────────── Limpieza de texto hacia cp1252 ─────────────────────────
_SUST = {
    "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "⇐": "<=", "⟶": "->", "➜": "->", "➡": "->",
    "↑": "^", "↓": "v", "✓": "Sí", "✔": "Sí", "✅": "Sí", "☑": "Sí",
    "✗": "No", "✘": "No", "❌": "No", "☐": "[ ]", "≤": "<=", "≥": ">=", "≠": "!=",
    "≈": "~", "−": "-", "‐": "-", "‑": "-", "‒": "-", "―": "—", "⁃": "-",
    "\u2009": " ", "\u202f": " ", "\u2002": " ", "\u2003": " ", "\u2007": " ",
    "\u200b": "", "\u200c": "", "\u200d": "", "\ufeff": "", "\ufe0f": "", "\u00ad": "",
    "■": "•", "▪": "•", "●": "•", "○": "o", "◦": "o", "◆": "•", "★": "*", "☆": "*",
    "▶": ">", "►": ">", "◀": "<", "│": "|", "┃": "|", "─": "-", "━": "-",
    "┌": "+", "┐": "+", "└": "+", "┘": "+", "├": "+", "┤": "+", "┬": "+", "┴": "+", "┼": "+",
    "′": "'", "″": '"', "⚠": "(!)", "∞": "inf", "√": "raíz", "∑": "suma", "π": "pi",
    "\t": "    ",
}


def limpiar(txt):
    """Deja el texto en algo que cp1252 pueda codificar. Nunca falla."""
    if not txt:
        return ""
    try:
        txt.encode("cp1252")
        if not any(ord(c) < 32 and c != "\n" for c in txt):
            return txt
    except UnicodeError:
        pass
    sal = []
    for ch in txt:
        o = ord(ch)
        if ch == "\n":
            sal.append(ch)
            continue
        if 0xE000 <= o <= 0xE07F:          # carácter escapado con \ en el Markdown
            sal.append(chr(o - 0xE000))
            continue
        if ch in _SUST:
            sal.append(_SUST[ch])
            continue
        if o < 32:
            continue
        try:
            ch.encode("cp1252")
            sal.append(ch)
            continue
        except UnicodeError:
            pass
        cat = unicodedata.category(ch)
        if o >= 0x1F000 or cat in ("So", "Sk", "Cs", "Co", "Cn", "Cf", "Mn", "Me"):
            continue                        # emojis, símbolos y marcas: fuera
        if cat == "Zs":
            sal.append(" ")
            continue
        desc = unicodedata.normalize("NFKD", ch)
        ok = ""
        for d in desc:
            try:
                d.encode("cp1252")
                if ord(d) >= 32:
                    ok += d
            except UnicodeError:
                pass
        sal.append(ok if ok else "?")
    return "".join(sal)


def esc(txt):
    """Escapa una cadena para meterla entre paréntesis en el PDF."""
    return txt.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


# ───────────────────────── Markdown en línea ─────────────────────────
_RE_INL = re.compile(
    r"(`+)(.+?)\1"                                   # 1,2 código
    r"|\*\*(.+?)\*\*"                                # 3 negrita
    r"|(?<!\w)__(.+?)__(?!\w)"                       # 4 negrita
    r"|!\[([^\]]*)\]\([^)]*\)"                       # 5 imagen en línea: queda el texto
    r"|\[([^\]]+)\]\(([^)\s]+)[^)]*\)"               # 6,7 enlace
    r"|(?<![\w*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\w*])"  # 8 cursiva
    r"|~~(.+?)~~"                                    # 9 tachado: queda el texto
)
_RE_ESC = re.compile(r"\\([!-/:-@\[-`{-~])")


def _inl(texto, base):
    out = []
    pos = 0
    for m in _RE_INL.finditer(texto):
        if m.start() > pos:
            out.append((texto[pos:m.start()], base))
        if m.group(1):
            out.append((m.group(2).strip() or " ", "c"))
        elif m.group(3) is not None or m.group(4) is not None:
            out.extend(_inl(m.group(3) if m.group(3) is not None else m.group(4), "b"))
        elif m.group(5) is not None:
            out.append((m.group(5), base))
        elif m.group(6) is not None:
            out.extend(_inl(m.group(6), base))
            url = m.group(7)
            if url.startswith("http") and url.strip("<>") != m.group(6).strip():
                out.append((" (" + url.strip("<>") + ")", base))
        elif m.group(8) is not None:
            out.extend(_inl(m.group(8), "b" if base == "b" else "i"))
        elif m.group(9) is not None:
            out.extend(_inl(m.group(9), base))
        pos = m.end()
    if pos < len(texto):
        out.append((texto[pos:], base))
    return out


def en_linea(texto, base="r"):
    """Convierte texto Markdown en tramos (texto, estilo) ya limpios para cp1252."""
    texto = re.sub(r"<br\s*/?>", "\n", texto, flags=re.I)
    texto = _RE_ESC.sub(lambda m: chr(0xE000 + ord(m.group(1))), texto)
    tramos = []
    for t, e in _inl(texto, base):
        t = limpiar(t)
        if t:
            tramos.append((t, e))
    return tramos


def texto_plano(texto):
    return "".join(t for t, _ in en_linea(texto)).replace("\n", " ").strip()


# ───────────────────────── Ajuste de línea ─────────────────────────
_RE_TOK = re.compile(r"\n|[ \t]+|[^ \t\n]+")


def _fundir(frags):
    """Une tramos seguidos del mismo estilo."""
    sal = []
    for t, e in frags:
        if sal and sal[-1][1] == e:
            sal[-1] = (sal[-1][0] + t, e)
        else:
            sal.append((t, e))
    return sal


def partir(tramos, maxw, tam):
    """Parte los tramos en líneas que no pasen de maxw puntos."""
    seq = []
    for txt, est in tramos:
        for tok in _RE_TOK.findall(txt):
            if tok == "\n":
                seq.append(("n",))
            elif tok[0] in " \t":
                seq.append(("s", est))
            elif seq and seq[-1][0] == "w":
                seq[-1][1].append((tok, est))
            else:
                seq.append(("w", [(tok, est)]))
    lineas, cur, curw, esp = [], [], 0.0, None
    for it in seq:
        if it[0] == "n":
            lineas.append(cur)
            cur, curw, esp = [], 0.0, None
            continue
        if it[0] == "s":
            if cur:
                esp = it[1]
            continue
        fr = it[1]
        ww = sum(ancho(t, e, tam) for t, e in fr)
        ew = ancho(" ", esp, tam) if (esp and cur) else 0.0
        if cur and curw + ew + ww <= maxw:
            if ew:
                cur.append((" ", esp))
            cur.extend(fr)
            curw += ew + ww
        elif ww <= maxw:
            if cur:
                lineas.append(cur)
            cur, curw = list(fr), ww
        else:
            # Palabra más ancha que la línea: se corta por caracteres.
            if cur:
                lineas.append(cur)
                cur, curw = [], 0.0
            for t, e in fr:
                trozo = ""
                for ch in t:
                    cw = ancho(ch, e, tam)
                    if curw + cw > maxw and (cur or trozo):
                        if trozo:
                            cur.append((trozo, e))
                        lineas.append(cur)
                        cur, curw, trozo = [], 0.0, ""
                    trozo += ch
                    curw += cw
                if trozo:
                    cur.append((trozo, e))
        esp = None
    if cur or not lineas:
        lineas.append(cur)
    return [_fundir(l) for l in lineas]


# ───────────────────────── Lectura del Markdown por bloques ─────────────────────────
_RE_TIT = re.compile(r"^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$")
_RE_HR = re.compile(r"^\s{0,3}([-*_])(\s*\1){2,}\s*$")
_RE_VALLA = re.compile(r"^\s{0,3}(```+|~~~+)")
_RE_ITEM = re.compile(r"^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$")
_RE_IMG = re.compile(r"^\s*!\[([^\]]*)\]\(\s*<?([^)>\"]+?)>?(?:\s+\"[^\"]*\")?\s*\)\s*$")
_RE_SEP = re.compile(r"^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$")
_RE_CITA = re.compile(r"^\s{0,3}>\s?(.*)$")


def _celdas(linea):
    s = linea.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", s)]


def _es_tabla(lineas, i):
    return (i + 1 < len(lineas) and "|" in lineas[i] and "|" in lineas[i + 1]
            and "-" in lineas[i + 1] and _RE_SEP.match(lineas[i + 1]) is not None)


def _es_inicio(lineas, i):
    ln = lineas[i]
    return bool(_RE_VALLA.match(ln) or _RE_TIT.match(ln) or _RE_HR.match(ln)
                or _RE_CITA.match(ln) or _RE_ITEM.match(ln) or _RE_IMG.match(ln)
                or _es_tabla(lineas, i))


def analizar(md):
    """Devuelve la lista de bloques del documento."""
    lineas = md.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    # Cabecera YAML (--- ... ---) al inicio: se ignora.
    if lineas and lineas[0].strip() == "---":
        for j in range(1, min(len(lineas), 40)):
            if lineas[j].strip() == "---":
                if all(":" in x or not x.strip() for x in lineas[1:j]):
                    lineas = lineas[j + 1:]
                break
    bloques = []
    i, n = 0, len(lineas)
    while i < n:
        ln = lineas[i]
        if not ln.strip():
            i += 1
            continue
        if ln.strip().startswith("<!--") and ln.strip().endswith("-->"):
            i += 1
            continue
        m = _RE_VALLA.match(ln)
        if m:
            marca = m.group(1)[:3]
            cuerpo = []
            i += 1
            while i < n and not lineas[i].strip().startswith(marca):
                cuerpo.append(lineas[i])
                i += 1
            i += 1
            bloques.append(("codigo", cuerpo))
            continue
        m = _RE_TIT.match(ln)
        if m:
            bloques.append(("h", min(len(m.group(1)), 3), m.group(2)))
            i += 1
            continue
        if _RE_HR.match(ln):
            bloques.append(("salto",))
            i += 1
            continue
        if _es_tabla(lineas, i):
            cab = _celdas(ln)
            alins = []
            for c in _celdas(lineas[i + 1]):
                alins.append("cen" if c.startswith(":") and c.endswith(":")
                             else "der" if c.endswith(":") else "izq")
            filas = []
            i += 2
            while i < n and lineas[i].strip() and "|" in lineas[i]:
                filas.append(_celdas(lineas[i]))
                i += 1
            bloques.append(("tabla", cab, alins, filas))
            continue
        m = _RE_IMG.match(ln)
        if m:
            bloques.append(("img", m.group(1).strip(), m.group(2).strip()))
            i += 1
            continue
        if _RE_CITA.match(ln):
            parrafos, cur = [], []
            while i < n and _RE_CITA.match(lineas[i]):
                t = _RE_CITA.match(lineas[i]).group(1).strip()
                if t:
                    cur.append(t)
                elif cur:
                    parrafos.append(" ".join(cur))
                    cur = []
                i += 1
            if cur:
                parrafos.append(" ".join(cur))
            if parrafos:
                bloques.append(("cita", parrafos))
            continue
        m = _RE_ITEM.match(ln)
        if m:
            items = []
            while i < n:
                m = _RE_ITEM.match(lineas[i])
                if m and not _RE_HR.match(lineas[i]):
                    sangria = len(m.group(1).replace("\t", "    "))
                    items.append([min(sangria // 2, 3), m.group(2), m.group(3)])
                    i += 1
                elif lineas[i].strip() and lineas[i][:1] in " \t" and not _es_inicio(lineas, i):
                    items[-1][2] += " " + lineas[i].strip()      # continuación del ítem
                    i += 1
                elif (not lineas[i].strip() and i + 1 < n and _RE_ITEM.match(lineas[i + 1])
                      and not _RE_HR.match(lineas[i + 1])):
                    i += 1                                        # línea en blanco entre ítems
                else:
                    break
            # Los niveles se cuentan desde la sangría más pequeña de la lista.
            base = min(it[0] for it in items)
            bloques.append(("lista", [(it[0] - base, it[1], it[2]) for it in items]))
            continue
        # Párrafo
        partes = []
        while i < n and lineas[i].strip():
            if partes and _es_inicio(lineas, i):
                break
            crudo = lineas[i]
            duro = crudo.endswith("  ") or crudo.rstrip().endswith("\\")
            partes.append(crudo.strip().rstrip("\\").strip() + ("\n" if duro else ""))
            i += 1
        bloques.append(("p", partes))
    return bloques


# ───────────────────────── Imágenes ─────────────────────────
def cargar_imagen(ruta):
    """Lee una imagen con Pillow y la deja lista para el PDF.

    Devuelve (ancho_px, alto_px, filtro, datos). Elige compresión sin pérdida
    (Flate) cuando no pesa mucho más que el JPEG: los diagramas salen nítidos.
    """
    from PIL import Image
    im = Image.open(ruta)
    im.load()
    try:
        from PIL import ImageOps
        im = ImageOps.exif_transpose(im)
    except Exception:
        pass
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        fondo = Image.new("RGB", im.size, (255, 255, 255))
        fondo.paste(im, mask=im.split()[3])
        im = fondo
    elif im.mode != "RGB":
        im = im.convert("RGB")
    w, h = im.size
    if w > 2400:                       # nunca se baja de 1600 px: el tope es 2400
        h = max(1, round(h * 2400 / w))
        w = 2400
        im = im.resize((w, h), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85, subsampling=0, optimize=True)
    jpeg = buf.getvalue()
    if w * h <= 12_000_000:
        plano = zlib.compress(im.tobytes(), 6)
        if len(plano) <= len(jpeg) * 1.6:
            return w, h, "FlateDecode", plano
    return w, h, "DCTDecode", jpeg


# ───────────────────────── Lienzo: va colocando cosas en páginas ─────────────────────────
_FUENTE = {"r": "F1", "b": "F2", "i": "F3", "c": "F4"}


class Lienzo:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.pags = [[]]
        self.y = MARGEN
        self.imagenes = []             # (ancho, alto, filtro, datos)
        self._cache_img = {}

    # -- páginas --
    def arriba(self):
        return self.y <= MARGEN + 0.5

    def nueva(self):
        self.pags.append([])
        self.y = MARGEN

    def asegurar(self, alto):
        """Si no caben «alto» puntos en lo que queda de página, pasa a la siguiente."""
        if self.y + alto > LIMITE + 0.01 and not self.arriba():
            self.nueva()

    def hueco(self, alto):
        if not self.arriba():
            self.y += alto

    def op(self, s):
        self.pags[-1].append(s)

    # -- primitivas --
    def rect(self, x, y, w, h, gris):
        self.op(f"{gris} g {x:.2f} {ALTO - y - h:.2f} {w:.2f} {h:.2f} re f")

    def marco(self, x, y, w, h, gris="0.62", grosor=0.5):
        self.op(f"{gris} G {grosor} w {x:.2f} {ALTO - y - h:.2f} {w:.2f} {h:.2f} re S")

    def raya(self, x1, y, x2, gris="0.75", grosor=0.6):
        self.op(f"{gris} G {grosor} w {x1:.2f} {ALTO - y:.2f} m {x2:.2f} {ALTO - y:.2f} l S")

    def texto(self, frags, x, y_sup, tam, interl, color=TEXTO):
        """Escribe una línea cuyo renglón empieza en y_sup (medido desde arriba)."""
        if not frags:
            return
        base = y_sup + (interl - 0.93 * tam) / 2 + 0.72 * tam
        partes = [f"BT {color} rg {x:.2f} {ALTO - base:.2f} Td"]
        for t, e in frags:
            t2 = tam * FACTOR_CODIGO if e == "c" else tam
            partes.append(f"/{_FUENTE[e]} {t2:.2f} Tf ({esc(t)}) Tj")
        partes.append("ET")
        self.op(" ".join(partes))

    def alineada(self, frags, x, w, y_sup, tam, interl, alin="izq", color=TEXTO):
        if alin == "izq":
            dx = 0.0
        else:
            libre = max(0.0, w - ancho_linea(frags, tam))
            dx = libre / 2 if alin == "cen" else libre
        self.texto(frags, x + dx, y_sup, tam, interl, color)

    # -- bloques --
    def parrafo(self, tramos, tam=10.5, interl=15.0, x=MARGEN, w=UTIL, alin="izq",
                color=TEXTO, barra=False, despues=6.0):
        for ln in partir(tramos, w, tam):
            self.asegurar(interl)
            if barra:
                self.rect(MARGEN + 2, self.y, 3, interl, "0.72")
            self.alineada(ln, x, w, self.y, tam, interl, alin, color)
            self.y += interl
        self.y += despues

    def titulo(self, nivel, txt):
        tam, interl, antes, despues = {1: (20, 25, 6, 8), 2: (15, 19, 14, 6),
                                       3: (12, 15.5, 10, 4)}[nivel]
        lineas = partir(en_linea(txt, "b"), UTIL, tam)
        self.hueco(antes)
        self.asegurar(len(lineas) * interl + despues + 40)   # que no quede huérfano al pie
        for ln in lineas:
            self.texto(ln, MARGEN, self.y, tam, interl, TITULO)
            self.y += interl
        if nivel <= 2:
            self.y += 2
            self.raya(MARGEN, self.y, MARGEN + UTIL, "0.80", 0.6)
        self.y += despues

    def lista(self, items):
        tam, interl = 10.5, 15.0
        contador = {}
        for nivel, marca, txt in items:
            x0 = MARGEN + 6 + nivel * 18
            ordenada = marca[0].isdigit()
            sangria = 20 if ordenada else 14
            lineas = partir(en_linea(txt), UTIL - (x0 - MARGEN) - sangria, tam)
            for k, ln in enumerate(lineas):
                self.asegurar(interl)
                if k == 0:
                    if ordenada:
                        etiq = [(marca.rstrip(".)") + ".", "r")]
                        dx = max(0.0, sangria - 5 - ancho_linea(etiq, tam))
                        self.texto(etiq, x0 + dx, self.y, tam, interl)
                    else:
                        self.texto([("•" if nivel == 0 else "–", "r")], x0 + 2, self.y, tam, interl)
                self.texto(ln, x0 + sangria, self.y, tam, interl)
                self.y += interl
            self.y += 1.5
        self.y += 5

    def cita(self, parrafos):
        for p in parrafos:
            self.parrafo(en_linea(p), x=MARGEN + 14, w=UTIL - 14, color="0.30 0.30 0.30",
                         barra=True, despues=0)
        self.y += 8

    def codigo(self, lineas):
        tam, interl, pad = 8.5, 11.0, 6.0
        maxc = max(10, int((UTIL - 2 * pad) / (0.6 * tam)))
        fis = []
        for l in lineas:
            l = limpiar(l.replace("\t", "    ")).replace("\n", " ").rstrip()
            if not l:
                fis.append("")
                continue
            while len(l) > maxc:           # línea larga: se corta y sigue debajo
                fis.append(l[:maxc])
                l = l[maxc:]
            fis.append(l)
        while fis and not fis[-1]:
            fis.pop()
        if not fis:
            return
        i = 0
        while i < len(fis):
            self.asegurar(2 * pad + min(3, len(fis) - i) * interl)
            caben = max(1, int((LIMITE - self.y - 2 * pad) / interl))
            trozo = fis[i:i + caben]
            alto = len(trozo) * interl + 2 * pad
            self.rect(MARGEN, self.y, UTIL, alto, "0.95")
            yy = self.y + pad
            for l in trozo:
                if l:
                    base = yy + 0.78 * tam
                    self.op(f"BT {TEXTO} rg /F4 {tam} Tf {MARGEN + pad:.2f} {ALTO - base:.2f} Td "
                            f"({esc(l)}) Tj ET")
                yy += interl
            self.y += alto
            i += caben
            if i < len(fis):
                self.nueva()
        self.y += 9

    def tabla(self, cab, alins, filas):
        tam, interl, pad = 9.0, 11.5, 4.0
        ncol = max([len(cab)] + [len(f) for f in filas])
        if ncol == 0:
            return
        cab = (cab + [""] * ncol)[:ncol]
        filas = [(f + [""] * ncol)[:ncol] for f in filas]
        alins = (alins + ["izq"] * ncol)[:ncol]
        t_cab = [en_linea(c, "b") for c in cab]
        t_fil = [[en_linea(c) for c in f] for f in filas]

        # Anchos: natural de cada columna, con mínimo (palabra más larga) y máximo.
        nat, minw = [], []
        for c in range(ncol):
            n = m = 0.0
            for tr in [t_cab[c]] + [f[c] for f in t_fil]:
                lin_w = 0.0
                for t, e in tr:
                    for seg in re.split(r"(\n)", t):
                        if seg == "\n":
                            n = max(n, lin_w)
                            lin_w = 0.0
                        else:
                            lin_w += ancho(seg, e, tam)
                            for pal in seg.split():
                                m = max(m, ancho(pal, e, tam))
                n = max(n, lin_w)
            nat.append(n + 2 * pad + 1)
            minw.append(max(30.0, min(m, 92.0) + 2 * pad + 1))
        tope = UTIL * 0.5
        w = [min(max(a, b), max(tope, b)) for a, b in zip(nat, minw)]
        if sum(w) > UTIL:
            for _ in range(12):
                exceso = sum(w) - UTIL
                if exceso <= 0.01:
                    break
                holg = [max(0.0, wi - mi) for wi, mi in zip(w, minw)]
                sh = sum(holg)
                if sh <= 0.01:
                    f = UTIL / sum(w)          # ni los mínimos caben: se encoge todo
                    w = [wi * f for wi in w]
                    break
                f = min(1.0, exceso / sh)
                w = [wi - h * f for wi, h in zip(w, holg)]
        else:
            f = UTIL / sum(w)                  # se reparte a todo el ancho útil
            w = [wi * f for wi in w]
        xs = [MARGEN]
        for wi in w[:-1]:
            xs.append(xs[-1] + wi)

        def fila(celdas, cabecera):
            alto = max(1, max(len(c) for c in celdas)) * interl + 2 * pad
            if cabecera:
                self.rect(MARGEN, self.y, sum(w), alto, "0.90")
            for c in range(ncol):
                yy = self.y + pad
                for ln in celdas[c]:
                    self.alineada(ln, xs[c] + pad, w[c] - 2 * pad, yy, tam, interl, alins[c])
                    yy += interl
                self.marco(xs[c], self.y, w[c], alto)
            self.y += alto

        l_cab = [partir(t_cab[c], w[c] - 2 * pad, tam) for c in range(ncol)]
        h_cab = max(len(c) for c in l_cab) * interl + 2 * pad
        max_lin = max(3, int((LIMITE - MARGEN - h_cab - 2 * pad) / interl))
        primera = True
        if not filas:
            self.asegurar(h_cab)
            fila(l_cab, True)
        for f in t_fil:
            lns = [partir(f[c], w[c] - 2 * pad, tam) for c in range(ncol)]
            while True:
                nlin = max(1, max(len(l) for l in lns))
                if primera:
                    # La cabecera nunca queda sola al pie de la página.
                    self.asegurar(h_cab + min(nlin, 3 if nlin > max_lin else nlin) * interl + 2 * pad)
                    fila(l_cab, True)
                    primera = False
                caben = int((LIMITE - self.y - 2 * pad) / interl + 0.001)
                if nlin > caben and (nlin <= max_lin or caben < 3):
                    self.nueva()
                    fila(l_cab, True)            # la cabecera se repite en cada página
                    caben = max(1, int((LIMITE - self.y - 2 * pad) / interl + 0.001))
                # Una fila más alta que la página se reparte en varios trozos.
                corte = min(nlin, caben)
                trozo = [l[:corte] for l in lns]
                resto = [l[corte:] for l in lns]
                fila(trozo, False)
                if not any(resto):
                    break
                lns = resto
        self.y += 10

    def imagen(self, alt, ruta, centrada_en_portada=False):
        limpio = unquote(ruta.strip())
        absoluta = limpio if os.path.isabs(limpio) else os.path.join(self.base_dir, limpio)
        info = None
        motivo = "imagen no encontrada"
        if not re.match(r"^[a-z]+://", limpio, re.I) and os.path.isfile(absoluta):
            clave = os.path.abspath(absoluta)
            if clave in self._cache_img:
                info = self._cache_img[clave]
            else:
                try:
                    w, h, filtro, datos = cargar_imagen(absoluta)
                    self.imagenes.append((w, h, filtro, datos))
                    info = (len(self.imagenes), w, h)
                    self._cache_img[clave] = info
                except Exception:
                    motivo = "imagen no legible"
        if info is None:
            self.parrafo([(limpiar(f"[{motivo}: {ruta}]"), "i")], color=GRIS,
                         alin="cen" if centrada_en_portada else "izq")
            return
        num, wpx, hpx = info
        # Ancho útil como tope; las imágenes pequeñas no se agrandan más allá de 96 ppp.
        wpt = min(UTIL, wpx * 0.75)
        hpt = wpt * hpx / wpx
        if hpt > ALTO_MAX_IMG:
            hpt = ALTO_MAX_IMG
            wpt = hpt * wpx / hpx
        pie = partir(en_linea(alt, "i"), UTIL - 40, 8.5) if alt.strip() else []
        self.asegurar(hpt + 6 + len(pie) * 11.5 + 4)
        x = MARGEN + (UTIL - wpt) / 2
        self.op(f"q {wpt:.2f} 0 0 {hpt:.2f} {x:.2f} {ALTO - self.y - hpt:.2f} cm /Im{num} Do Q")
        self.marco(x, self.y, wpt, hpt, "0.82", 0.5)
        self.y += hpt + 5
        for ln in pie:
            self.alineada(ln, MARGEN + 20, UTIL - 40, self.y, 8.5, 11.5, "cen", GRIS)
            self.y += 11.5
        self.y += 10

    def portada(self, titulo, bloques):
        """Título grande centrado y, debajo, los datos que siguen en el Markdown."""
        lineas = partir(en_linea(titulo, "b"), UTIL - 20, 28)
        self.y = max(MARGEN + 60, 270 - len(lineas) * 17)
        for ln in lineas:
            self.alineada(ln, MARGEN + 10, UTIL - 20, self.y, 28, 35, "cen", TITULO)
            self.y += 35
        self.y += 12
        self.op(f"{TITULO} RG 1.5 w {ANCHO / 2 - 45:.2f} {ALTO - self.y:.2f} m "
                f"{ANCHO / 2 + 45:.2f} {ALTO - self.y:.2f} l S")
        self.y += 24
        for b in bloques:
            if b[0] == "p":
                # En la portada cada línea del Markdown conserva su propio renglón.
                txt = "\n".join(p.rstrip("\n") for p in b[1])
                self.parrafo(en_linea(txt), tam=12, interl=18, x=MARGEN + 30, w=UTIL - 60,
                             alin="cen", color="0.33 0.33 0.33", despues=10)
            elif b[0] == "img":
                self.imagen(b[1], b[2], centrada_en_portada=True)


# ───────────────────────── Escritura del archivo PDF ─────────────────────────
def _cadena_info(txt):
    """Cadena para /Info en UTF-16 (admite cualquier carácter)."""
    return "<FEFF" + txt.encode("utf-16-be", "replace").hex().upper() + ">"


def escribir_pdf(ruta, paginas, imagenes, titulo):
    """Arma el PDF 1.4: objetos, tabla xref y trailer."""
    objs = []                                   # cuerpo de cada objeto, en bytes

    def nuevo(cuerpo=b""):
        objs.append(cuerpo)
        return len(objs)

    def flujo(dic, datos):
        return (f"<< {dic} /Length {len(datos)} >>\nstream\n".encode("latin-1")
                + datos + b"\nendstream")

    n_cat = nuevo()
    n_pags = nuevo()
    fuentes = []
    for nombre in ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Courier"):
        fuentes.append(nuevo(f"<< /Type /Font /Subtype /Type1 /BaseFont /{nombre} "
                             f"/Encoding /WinAnsiEncoding >>".encode("latin-1")))
    n_imgs = []
    for w, h, filtro, datos in imagenes:
        n_imgs.append(nuevo(flujo(
            f"/Type /XObject /Subtype /Image /Width {w} /Height {h} /ColorSpace /DeviceRGB "
            f"/BitsPerComponent 8 /Filter /{filtro}", datos)))
    rec = "/Font << " + " ".join(f"/F{i + 1} {n} 0 R" for i, n in enumerate(fuentes)) + " >>"
    if n_imgs:
        rec += " /XObject << " + " ".join(f"/Im{i + 1} {n} 0 R" for i, n in enumerate(n_imgs)) + " >>"
    rec += " /ProcSet [/PDF /Text /ImageC]"
    n_rec = nuevo(f"<< {rec} >>".encode("latin-1"))
    hijos = []
    for ops in paginas:
        crudo = "\n".join(ops).encode("cp1252", "replace")
        n_cont = nuevo(flujo("/Filter /FlateDecode", zlib.compress(crudo, 9)))
        hijos.append(nuevo(
            f"<< /Type /Page /Parent {n_pags} 0 R /MediaBox [0 0 {ANCHO:.0f} {ALTO:.0f}] "
            f"/Resources {n_rec} 0 R /Contents {n_cont} 0 R >>".encode("latin-1")))
    objs[n_cat - 1] = f"<< /Type /Catalog /Pages {n_pags} 0 R /Lang (es) >>".encode("latin-1")
    objs[n_pags - 1] = (f"<< /Type /Pages /Count {len(hijos)} /Kids ["
                        + " ".join(f"{h} 0 R" for h in hijos) + "] >>").encode("latin-1")
    ahora = datetime.datetime.now().strftime("D:%Y%m%d%H%M%S")
    n_info = nuevo(f"<< /Title {_cadena_info(titulo)} /Producer (pdf.py - documenta-sistema) "
                   f"/CreationDate ({ahora}) >>".encode("latin-1"))

    sal = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    desplaz = []
    for i, cuerpo in enumerate(objs, 1):
        desplaz.append(len(sal))
        sal += f"{i} 0 obj\n".encode("latin-1") + cuerpo + b"\nendobj\n"
    inicio_xref = len(sal)
    sal += f"xref\n0 {len(objs) + 1}\n".encode("latin-1")
    sal += b"0000000000 65535 f \n"
    for d in desplaz:
        sal += f"{d:010d} 00000 n \n".encode("latin-1")
    sal += (f"trailer\n<< /Size {len(objs) + 1} /Root {n_cat} 0 R /Info {n_info} 0 R >>\n"
            f"startxref\n{inicio_xref}\n%%EOF\n").encode("latin-1")
    carpeta = os.path.dirname(os.path.abspath(ruta))
    os.makedirs(carpeta, exist_ok=True)
    with open(ruta, "wb") as f:
        f.write(sal)
    return len(sal)


# ───────────────────────── Función principal ─────────────────────────
def md_a_pdf(md_texto, pdf_ruta, base_dir=".", pie=""):
    """Convierte Markdown a PDF. Devuelve el número de páginas escritas.

    Las rutas de las imágenes se resuelven respecto de base_dir. «pie» es el
    texto de la izquierda del pie de página (si va vacío, el título del manual).
    """
    bloques = analizar(md_texto or "")
    L = Lienzo(base_dir or ".")
    titulo_doc = ""
    for b in bloques:
        if b[0] == "h":
            titulo_doc = texto_plano(b[2])
            break
    i = 0
    hay_portada = bool(bloques) and bloques[0][0] == "h" and bloques[0][1] == 1
    if hay_portada:
        j = 1
        while j < len(bloques) and bloques[j][0] in ("p", "img") and j <= 10:
            j += 1
        L.portada(bloques[0][2], bloques[1:j])
        i = j
        if i < len(bloques):
            L.nueva()
            if bloques[i][0] == "salto":
                i += 1
    for b in bloques[i:]:
        tipo = b[0]
        if tipo == "h":
            L.titulo(b[1], b[2])
        elif tipo == "p":
            L.parrafo(en_linea(" ".join(b[1]).replace("\n ", "\n").strip()))
        elif tipo == "lista":
            L.lista(b[1])
        elif tipo == "tabla":
            L.tabla(b[1], b[2], b[3])
        elif tipo == "img":
            L.imagen(b[1], b[2])
        elif tipo == "codigo":
            L.codigo(b[1])
        elif tipo == "cita":
            L.cita(b[1])
        elif tipo == "salto":
            if L.pags[-1]:
                L.nueva()
    while len(L.pags) > 1 and not L.pags[-1]:
        L.pags.pop()

    # Pie de página: en todas menos la portada. La numeración no cuenta la portada.
    salto = 1 if hay_portada else 0
    total = len(L.pags) - salto
    izq = limpiar((pie or titulo_doc or "").replace("\n", " ").strip())
    for k, ops in enumerate(L.pags):
        if k < salto:
            continue
        der = f"Página {k + 1 - salto} de {total}"
        wd = ancho(der, "r", 8)
        tope = UTIL - wd - 20
        t = izq
        if ancho(t, "r", 8) > tope:
            while t and ancho(t + "…", "r", 8) > tope:
                t = t[:-1]
            t = t.rstrip() + "…"
        y = ALTO - 40
        ops.append(f"0.80 G 0.5 w {MARGEN:.2f} {ALTO - y:.2f} m {MARGEN + UTIL:.2f} {ALTO - y:.2f} l S")
        if t:
            ops.append(f"BT {GRIS} rg /F1 8 Tf {MARGEN:.2f} {ALTO - y - 12:.2f} Td ({esc(t)}) Tj ET")
        ops.append(f"BT {GRIS} rg /F1 8 Tf {MARGEN + UTIL - wd:.2f} {ALTO - y - 12:.2f} Td ({esc(der)}) Tj ET")

    titulo_info = titulo_doc or pie or os.path.splitext(os.path.basename(pdf_ruta))[0]
    escribir_pdf(pdf_ruta, L.pags, L.imagenes, titulo_info)
    return len(L.pags)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Convierte un manual en Markdown a PDF.")
    ap.add_argument("markdown", help="archivo .md de entrada")
    ap.add_argument("pdf", help="archivo .pdf de salida")
    ap.add_argument("--titulo", default="", help="texto del pie de página")
    a = ap.parse_args(argv)
    try:
        with open(a.markdown, "r", encoding="utf-8-sig", errors="replace") as f:
            md = f.read()
    except OSError as e:
        print(f"No se pudo leer {a.markdown}: {e}", file=sys.stderr)
        return 1
    try:
        n = md_a_pdf(md, a.pdf, os.path.dirname(os.path.abspath(a.markdown)), a.titulo)
    except OSError as e:
        print(f"No se pudo escribir {a.pdf}: {e}", file=sys.stderr)
        return 1
    kb = max(1, round(os.path.getsize(a.pdf) / 1024))
    print(f"PDF listo: {a.pdf} · {n} página{'s' if n != 1 else ''} · {kb} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
