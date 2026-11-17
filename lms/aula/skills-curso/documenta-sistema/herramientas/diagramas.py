#!/usr/bin/env python3
"""Diagramas para la documentación de un sistema, sin navegador ni Graphviz.

Convierte las piezas de un ``modelo.json`` en diagramas usando solo la
biblioteca estándar de Python y Pillow:

- ``diagrama_proceso``  -> BPMN 2.0 (.bpmn, importable en bpmn.io) + SVG + PNG
- ``diagrama_clases``   -> Mermaid classDiagram (.mmd) + SVG + PNG
- ``diagrama_flujo``    -> Mermaid flowchart TD (.mmd) + SVG + PNG
- ``diagrama_pantalla`` -> esquema tipo «wireframe» en SVG + PNG

Todo se dibuja sobre la clase ``Lienzo``, que guarda las primitivas una sola
vez y las saca por dos caminos (``svg()`` y ``png()``): así el SVG y el PNG
siempre coinciden.

Uso de prueba:  python3 diagramas.py modelo.json carpeta_salida
"""
from __future__ import annotations

import json
import math
import os
import re
import sys
import unicodedata
from functools import lru_cache

try:  # Pillow solo hace falta para medir con precisión y para el PNG
    from PIL import Image, ImageColor, ImageDraw, ImageFont
except ImportError:  # pragma: no cover - en el contenedor siempre está
    Image = ImageColor = ImageDraw = ImageFont = None

# ----------------------------------------------------------------------------
# Colores y constantes
# ----------------------------------------------------------------------------
TINTA = "#1f2937"
BORDE = "#334155"
GRIS = "#64748b"
GRIS_CLARO = "#94a3b8"
ACENTO = "#2563eb"
VERDE = "#16a34a"
ROJO = "#dc2626"
BLANCO = "#ffffff"
FONDOS_CARRIL = ["#f8fafc", "#eff6ff"]       # pastel alternos
CABECERAS_CARRIL = ["#e2e8f0", "#dbeafe"]
FAMILIA_SVG = "DejaVu Sans, Arial, sans-serif"
ESCALA_PNG = 2                 # el PNG sale al doble para que se vea nítido
MAX_PIXELES_INTERNOS = 30_000_000   # tope de memoria para el suavizado

# En una relación de herencia, «de» es la clase hija y «a» la clase padre
# («de» hereda de «a»). En Mermaid queda:  Padre <|-- Hija
HERENCIA_DE_ES_HIJA = True

_FUENTES = [
    ("/usr/share/fonts/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial.ttf",
     "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ("/Library/Fonts/Arial Unicode.ttf", "/Library/Fonts/Arial Unicode.ttf"),
]


# ----------------------------------------------------------------------------
# Fuentes y medición de texto
# ----------------------------------------------------------------------------
@lru_cache(maxsize=None)
def _ruta_fuente(negrita: bool):
    """Primera fuente que exista de la lista (None si no hay ninguna)."""
    for normal, gruesa in _FUENTES:
        if os.path.exists(normal):
            if negrita and os.path.exists(gruesa):
                return gruesa
            return normal
    return None


@lru_cache(maxsize=256)
def _fuente(tam: int, negrita: bool = False):
    """Fuente de Pillow al tamaño pedido, con último recurso load_default."""
    ruta = _ruta_fuente(negrita)
    if ruta:
        try:
            return ImageFont.truetype(ruta, tam)
        except OSError:
            pass
    try:
        return ImageFont.load_default(tam)
    except TypeError:  # Pillow antiguo: load_default no acepta tamaño
        return ImageFont.load_default()


@lru_cache(maxsize=None)
def _holgura() -> float:
    """Margen al medir: DejaVu (la del SVG) es más ancha que Arial."""
    ruta = _ruta_fuente(False) or ""
    return 1.0 if "dejavu" in ruta.lower() else 1.12


def _medir(texto: str, tam: float = 12, negrita: bool = False) -> float:
    """Ancho aproximado del texto en píxeles del lienzo."""
    if not texto:
        return 0.0
    if ImageFont is None:
        return 0.6 * tam * len(texto)
    f = _fuente(64, negrita)
    try:
        ancho = f.getlength(texto)
    except Exception:
        return 0.6 * tam * len(texto)
    return ancho * tam / float(getattr(f, "size", 10)) * _holgura()


def _partir(texto: str, ancho: float, tam: float = 12, negrita: bool = False,
            max_lineas: int | None = None) -> list[str]:
    """Ajuste de línea por palabras; corta palabras que no caben."""
    lineas: list[str] = []
    for parrafo in str(texto).split("\n"):
        actual = ""
        for palabra in parrafo.split():
            prueba = palabra if not actual else actual + " " + palabra
            if _medir(prueba, tam, negrita) <= ancho:
                actual = prueba
                continue
            if actual:
                lineas.append(actual)
                actual = ""
            # la palabra sola no cabe: se parte por letras
            while _medir(palabra, tam, negrita) > ancho and len(palabra) > 1:
                corte = len(palabra) - 1
                while corte > 1 and _medir(palabra[:corte], tam, negrita) > ancho:
                    corte -= 1
                lineas.append(palabra[:corte])
                palabra = palabra[corte:]
            actual = palabra
        if actual or not parrafo.strip():
            lineas.append(actual)
    while lineas and not lineas[-1]:
        lineas.pop()
    if max_lineas and len(lineas) > max_lineas:
        lineas = lineas[:max_lineas]
        lineas[-1] = _recortar(lineas[-1] + "…", ancho, tam, negrita, forzar=True)
    return lineas or [""]


def _recortar(texto: str, ancho: float, tam: float = 12, negrita: bool = False,
              forzar: bool = False) -> str:
    """Una sola línea que quepa en el ancho, con puntos suspensivos."""
    texto = str(texto)
    if _medir(texto, tam, negrita) <= ancho and not forzar:
        return texto
    base = texto.rstrip("…")
    while base and _medir(base + "…", tam, negrita) > ancho:
        base = base[:-1]
    return (base.rstrip() + "…") if base else "…"


def _limpio(valor) -> str:
    """Texto sin saltos ni caracteres de control (no válidos en XML)."""
    if valor is None:
        return ""
    if isinstance(valor, dict):
        for clave in ("nombre", "etiqueta", "texto", "titulo", "id"):
            if valor.get(clave):
                valor = valor[clave]
                break
        else:
            valor = ""
    s = str(valor)
    s = "".join(c if (c >= " " or c in "\n\t") else " " for c in s)
    return re.sub(r"[ \t\r]+", " ", s.replace("\n", " ")).strip()


def _xml(texto) -> str:
    """Escapa & < > y comillas para XML (texto o atributo)."""
    return (str(texto).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _n(v: float) -> str:
    """Número corto para SVG/BPMN."""
    s = f"{float(v):.1f}"
    return s[:-2] if s.endswith(".0") else s


def _sin_tildes(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", str(texto))
                   if not unicodedata.combining(c))


def _ident(texto: str, defecto: str = "x") -> str:
    """Identificador ASCII seguro: letras, dígitos y guion bajo."""
    s = re.sub(r"[^A-Za-z0-9_]+", "_", _sin_tildes(texto)).strip("_")
    return s or defecto


def _unico(candidato: str, usados: set) -> str:
    final, i = candidato, 2
    while final in usados:
        final = f"{candidato}_{i}"
        i += 1
    usados.add(final)
    return final


# ----------------------------------------------------------------------------
# Lienzo: primitivas con dos salidas (SVG y PNG)
# ----------------------------------------------------------------------------
class Lienzo:
    """Guarda primitivas de dibujo y las exporta a SVG y a PNG idénticos."""

    def __init__(self, ancho: float = 100, alto: float = 100, fondo: str = BLANCO):
        self.ancho = ancho
        self.alto = alto
        self.fondo = fondo
        self.ops: list[tuple] = []

    def tamano(self, ancho: float, alto: float) -> None:
        self.ancho, self.alto = ancho, alto

    # -- medición ------------------------------------------------------------
    medir = staticmethod(_medir)
    partir = staticmethod(_partir)
    recortar = staticmethod(_recortar)

    # -- primitivas ----------------------------------------------------------
    def rect(self, x, y, w, h, relleno=None, borde=BORDE, grosor=1.5, radio=0):
        self.ops.append(("rect", float(x), float(y), float(w), float(h),
                         relleno, borde, grosor, radio))

    def rect_redondeado(self, x, y, w, h, radio=8, relleno=None, borde=BORDE,
                        grosor=1.5):
        self.rect(x, y, w, h, relleno, borde, grosor, radio)

    def circulo(self, cx, cy, r, relleno=None, borde=BORDE, grosor=1.5):
        self.ops.append(("circ", float(cx), float(cy), float(r), relleno,
                         borde, grosor))

    def poligono(self, puntos, relleno=None, borde=BORDE, grosor=1.5):
        self.ops.append(("poli", [(float(x), float(y)) for x, y in puntos],
                         relleno, borde, grosor))

    def rombo(self, cx, cy, w, h, relleno=None, borde=BORDE, grosor=1.5):
        self.poligono([(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2),
                       (cx - w / 2, cy)], relleno, borde, grosor)

    def linea(self, puntos, color=BORDE, grosor=1.5, flecha=False,
              discontinua=False):
        """Línea o polilínea; con ``flecha`` lleva punta rellena al final."""
        pts = [(float(x), float(y)) for x, y in puntos]
        if len(pts) < 2:
            return
        punta = None
        if flecha:
            (x0, y0), (x1, y1) = pts[-2], pts[-1]
            largo = math.hypot(x1 - x0, y1 - y0)
            if largo > 0.01:
                ux, uy = (x1 - x0) / largo, (y1 - y0) / largo
                la, an = 10.0, 4.5
                bx, by = x1 - ux * la, y1 - uy * la
                punta = [(x1, y1), (bx - uy * an, by + ux * an),
                         (bx + uy * an, by - ux * an)]
                if largo > la:
                    pts[-1] = (x1 - ux * (la - 1), y1 - uy * (la - 1))
        self.ops.append(("linea", pts, color, grosor, bool(discontinua)))
        if punta:
            self.ops.append(("poli", punta, color, None, 0))

    def texto(self, x, y, texto, tam=12, color=TINTA, negrita=False,
              ancla="centro", ancho=None, valign="medio", max_lineas=None,
              giro=0, interlinea=1.25) -> float:
        """Texto centrado o alineado, con ajuste de línea si se da ``ancho``.

        ``ancla``: inicio | centro | fin.  ``valign``: arriba | medio | abajo.
        ``giro=-90`` lo escribe en vertical (de abajo hacia arriba).
        Devuelve el alto ocupado.
        """
        texto = "" if texto is None else str(texto)
        if ancho:
            lineas = _partir(texto, ancho, tam, negrita, max_lineas)
        else:
            lineas = texto.split("\n")
        il = tam * interlinea
        alto = il * len(lineas)
        if giro:
            x0 = x - alto / 2 + il / 2
            for i, ln in enumerate(lineas):
                if ln:
                    self.ops.append(("texto", float(x0 + i * il), float(y), ln,
                                     tam, color, negrita, "centro", giro))
            return alto
        if valign == "medio":
            y0 = y - alto / 2 + il / 2
        elif valign == "arriba":
            y0 = y + il / 2
        else:
            y0 = y - alto + il / 2
        for i, ln in enumerate(lineas):
            if ln:
                self.ops.append(("texto", float(x), float(y0 + i * il), ln, tam,
                                 color, negrita, ancla, 0))
        return alto

    # -- salida SVG ----------------------------------------------------------
    def svg(self) -> str:
        w, h = math.ceil(self.ancho), math.ceil(self.alto)
        s = ['<?xml version="1.0" encoding="UTF-8"?>',
             f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
             f'viewBox="0 0 {w} {h}" font-family="{FAMILIA_SVG}">',
             f'<rect x="0" y="0" width="{w}" height="{h}" fill="{self.fondo}"/>']

        def trazo(relleno, borde, grosor):
            a = f' fill="{relleno or "none"}"'
            if borde and grosor:
                a += f' stroke="{borde}" stroke-width="{_n(grosor)}"'
            return a

        for op in self.ops:
            t = op[0]
            if t == "rect":
                _, x, y, rw, rh, relleno, borde, grosor, radio = op
                r = f' rx="{_n(radio)}" ry="{_n(radio)}"' if radio else ""
                s.append(f'<rect x="{_n(x)}" y="{_n(y)}" width="{_n(rw)}" '
                         f'height="{_n(rh)}"{r}{trazo(relleno, borde, grosor)}/>')
            elif t == "circ":
                _, cx, cy, r, relleno, borde, grosor = op
                s.append(f'<circle cx="{_n(cx)}" cy="{_n(cy)}" r="{_n(r)}"'
                         f'{trazo(relleno, borde, grosor)}/>')
            elif t == "poli":
                _, pts, relleno, borde, grosor = op
                p = " ".join(f"{_n(x)},{_n(y)}" for x, y in pts)
                s.append(f'<polygon points="{p}"{trazo(relleno, borde, grosor)}'
                         ' stroke-linejoin="round"/>')
            elif t == "linea":
                _, pts, color, grosor, disc = op
                p = " ".join(f"{_n(x)},{_n(y)}" for x, y in pts)
                d = ' stroke-dasharray="6 4"' if disc else ""
                s.append(f'<polyline points="{p}" fill="none" stroke="{color}" '
                         f'stroke-width="{_n(grosor)}" stroke-linejoin="round" '
                         f'stroke-linecap="round"{d}/>')
            elif t == "texto":
                _, x, y, ln, tam, color, negrita, ancla, giro = op
                a = {"inicio": "start", "centro": "middle", "fin": "end"}[ancla]
                peso = ' font-weight="bold"' if negrita else ""
                g = (f' transform="rotate({_n(giro)} {_n(x)} {_n(y)})"'
                     if giro else "")
                s.append(f'<text x="{_n(x)}" y="{_n(y + 0.35 * tam)}" '
                         f'font-size="{_n(tam)}" fill="{color}" '
                         f'text-anchor="{a}"{peso}{g}>{_xml(ln)}</text>')
        s.append("</svg>")
        return "\n".join(s) + "\n"

    # -- salida PNG ----------------------------------------------------------
    def png(self, ruta: str) -> str:
        if Image is None:
            raise RuntimeError("Falta Pillow: no se puede escribir el PNG.")
        # Se dibuja más grande y se reduce para suavizar los bordes, mientras
        # la imagen interna no pase del tope de memoria.
        k = float(ESCALA_PNG)
        for extra in (2.0, 1.5, 1.0):
            k = ESCALA_PNG * extra
            if self.ancho * k * self.alto * k <= MAX_PIXELES_INTERNOS:
                break
        img = Image.new("RGB", (math.ceil(self.ancho * k),
                                math.ceil(self.alto * k)), self.fondo)
        d = ImageDraw.Draw(img)

        def g(grosor):
            return max(1, int(round(grosor * k)))

        for op in self.ops:
            t = op[0]
            if t == "rect":
                _, x, y, w, h, relleno, borde, grosor, radio = op
                caja = [x * k, y * k, (x + w) * k, (y + h) * k]
                contorno = borde if (borde and grosor) else None
                if radio:
                    d.rounded_rectangle(caja, radius=radio * k, fill=relleno,
                                        outline=contorno, width=g(grosor or 1))
                else:
                    d.rectangle(caja, fill=relleno, outline=contorno,
                                width=g(grosor or 1))
            elif t == "circ":
                _, cx, cy, r, relleno, borde, grosor = op
                d.ellipse([(cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k],
                          fill=relleno, outline=borde if grosor else None,
                          width=g(grosor or 1))
            elif t == "poli":
                _, pts, relleno, borde, grosor = op
                p = [(x * k, y * k) for x, y in pts]
                if relleno:
                    d.polygon(p, fill=relleno)
                if borde and grosor:
                    d.line(p + [p[0], p[1]], fill=borde, width=g(grosor),
                           joint="curve")
            elif t == "linea":
                _, pts, color, grosor, disc = op
                p = [(x * k, y * k) for x, y in pts]
                if disc:
                    for tramo in _trocear(p, 6 * k, 4 * k):
                        d.line(tramo, fill=color, width=g(grosor))
                else:
                    d.line(p, fill=color, width=g(grosor), joint="curve")
            elif t == "texto":
                self._png_texto(img, d, k, *op[1:])
        final = (math.ceil(self.ancho * ESCALA_PNG),
                 math.ceil(self.alto * ESCALA_PNG))
        if img.size != final:
            img = img.resize(final, Image.LANCZOS)
        img.save(ruta)
        return ruta

    @staticmethod
    def _png_texto(img, d, k, x, y, ln, tam, color, negrita, ancla, giro):
        f = _fuente(max(4, int(round(tam * k))), negrita)
        a = {"inicio": "l", "centro": "m", "fin": "r"}[ancla]
        base = (y + 0.35 * tam) * k
        if not giro:
            try:
                d.text((x * k, base), ln, font=f, fill=color, anchor=a + "s")
            except (ValueError, TypeError):  # fuente de mapa de bits sin anclas
                w = d.textlength(ln, font=f)
                x0 = x * k - (0 if a == "l" else w / 2 if a == "m" else w)
                d.text((x0, y * k - 6), ln, font=f, fill=color)
            return
        # Texto girado: se dibuja aparte, se gira y se pega con su máscara
        try:
            ancho = int(f.getlength(ln)) + 12
        except Exception:
            ancho = int(len(ln) * tam * k * 0.6) + 12
        alto = int(tam * k * 2)
        r, gg, b = ImageColor.getrgb(color)[:3]
        capa = Image.new("RGBA", (ancho, alto), (r, gg, b, 0))
        dc = ImageDraw.Draw(capa)
        try:
            dc.text((ancho / 2, alto / 2 + 0.35 * tam * k), ln, font=f,
                    fill=(r, gg, b, 255), anchor="ms")
        except (ValueError, TypeError):
            dc.text((6, alto / 4), ln, font=f, fill=(r, gg, b, 255))
        capa = capa.rotate(-giro, expand=True)
        img.paste(capa, (int(round(x * k - capa.width / 2)),
                         int(round(y * k - capa.height / 2))), capa)

    def guardar(self, base: str) -> list[str]:
        """Escribe base.svg y base.png y devuelve las dos rutas."""
        rutas = [base + ".svg", base + ".png"]
        with open(rutas[0], "w", encoding="utf-8") as fh:
            fh.write(self.svg())
        self.png(rutas[1])
        return rutas


def _trocear(pts, lleno, hueco):
    """Parte una polilínea en tramos para dibujarla discontinua."""
    tramos, pinta, resto = [], True, lleno
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        largo = math.hypot(x1 - x0, y1 - y0)
        if largo < 0.01:
            continue
        ux, uy = (x1 - x0) / largo, (y1 - y0) / largo
        pos = 0.0
        while pos < largo:
            paso = min(resto, largo - pos)
            if pinta:
                tramos.append([(x0 + ux * pos, y0 + uy * pos),
                               (x0 + ux * (pos + paso), y0 + uy * (pos + paso))])
            pos += paso
            resto -= paso
            if resto <= 0.01:
                pinta = not pinta
                resto = lleno if pinta else hueco
    return tramos


def _preparar(base: str) -> str:
    """Quita la extensión si vino y crea la carpeta de destino."""
    base = str(base)
    carpeta = os.path.dirname(base)
    if carpeta:
        os.makedirs(carpeta, exist_ok=True)
    return base


def _escribir(ruta: str, contenido: str) -> str:
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(contenido)
    return ruta


# ============================================================================
# 1. PROCESO (BPMN)
# ============================================================================
P_MARGEN = 20
P_TITULO = 40
P_CAB_POOL = 30        # banda con el nombre del proceso
P_CAB_CARRIL = 30      # banda con el nombre del carril
P_PAD_IZQ = 45
P_PAD_DER = 50
P_PAD_CARRIL = 10
P_TAREA_W, P_TAREA_H = 150, 70
P_EVENTO = 36
P_COMPUERTA = 50
P_HUECO = 60           # espacio entre columnas
P_PASO = P_TAREA_W + P_HUECO
P_FILA = 130           # alto de cada fila dentro de un carril

_TIPOS_NODO = ("inicio", "fin", "tarea", "decision")
_ALIAS_TIPO = {"start": "inicio", "end": "fin", "task": "tarea",
               "gateway": "decision", "compuerta": "decision",
               "decisión": "decision", "final": "fin"}


def _validar_proceso(proceso: dict):
    """Normaliza el proceso y lanza ValueError si algo no cuadra."""
    if not isinstance(proceso, dict):
        raise ValueError("El proceso debe ser un objeto (dict) con «nodos» y «flujos».")
    nombre = _limpio(proceso.get("nombre")) or "Proceso"
    carriles_in = list(proceso.get("carriles") or [])
    nodos_in = list(proceso.get("nodos") or [])
    flujos_in = list(proceso.get("flujos") or [])
    if not nodos_in:
        raise ValueError(f"El proceso «{nombre}» no tiene nodos: agrega al menos uno en «nodos».")
    if not carriles_in:  # sin carriles: uno solo con el nombre del proceso
        carriles_in = [{"id": "proceso", "nombre": nombre}]
        for n in nodos_in:
            if isinstance(n, dict) and n.get("carril") is None:
                n = n  # se resuelve abajo con el carril único
    carriles = []
    for c in carriles_in:
        if not isinstance(c, dict) or not str(c.get("id") or "").strip():
            raise ValueError("Hay un carril sin «id» en «carriles».")
        cid = str(c["id"])
        if any(x["id"] == cid for x in carriles):
            raise ValueError(f"El carril «{cid}» está repetido en «carriles».")
        carriles.append({"id": cid, "nombre": _limpio(c.get("nombre")) or cid})
    ids_carril = [c["id"] for c in carriles]

    nodos: dict[str, dict] = {}
    for n in nodos_in:
        if not isinstance(n, dict) or not str(n.get("id") or "").strip():
            raise ValueError("Hay un nodo sin «id» en «nodos».")
        nid = str(n["id"])
        if nid in nodos:
            raise ValueError(f"El id de nodo «{nid}» está repetido en «nodos».")
        tipo = str(n.get("tipo") or "tarea").strip().lower()
        tipo = _ALIAS_TIPO.get(tipo, tipo)
        if tipo not in _TIPOS_NODO:
            raise ValueError(f"El nodo «{nid}» tiene el tipo «{n.get('tipo')}», que no se "
                             "conoce. Tipos válidos: inicio, fin, tarea, decision.")
        carril = n.get("carril")
        if carril is None and len(ids_carril) == 1:
            carril = ids_carril[0]
        carril = "" if carril is None else str(carril)
        if carril not in ids_carril:
            raise ValueError(
                f"El nodo «{nid}» nombra el carril «{carril}», que no existe. "
                f"Carriles definidos: {', '.join(ids_carril)}.")
        nodos[nid] = {"id": nid, "tipo": tipo, "carril": carril,
                      "nombre": _limpio(n.get("nombre")) or ("" if tipo == "decision" else nid)}

    flujos = []
    for i, f in enumerate(flujos_in, 1):
        if not isinstance(f, dict):
            raise ValueError(f"El flujo n.º {i} no es un objeto con «de» y «a».")
        de, a = str(f.get("de", "")), str(f.get("a", ""))
        for extremo, valor in (("de", de), ("a", a)):
            if valor not in nodos:
                raise ValueError(
                    f"El flujo n.º {i} («{de}» → «{a}») nombra en «{extremo}» el nodo "
                    f"«{valor}», que no existe en «nodos».")
        flujos.append({"de": de, "a": a, "nombre": _limpio(f.get("nombre"))})
    return nombre, carriles, nodos, flujos


def _columnas(nodos: dict, flujos: list):
    """Columna de cada nodo = camino más largo ignorando aristas de retorno."""
    salidas = {n: [] for n in nodos}
    entradas = {n: 0 for n in nodos}
    for i, f in enumerate(flujos):
        salidas[f["de"]].append((i, f["a"]))
        entradas[f["a"]] += 1
    # 1) DFS iterativo: arista hacia un nodo «en curso» = arista de retorno
    retorno: set[int] = set()
    estado = {n: 0 for n in nodos}      # 0 sin ver, 1 en curso, 2 cerrado
    raices = ([n for n, d in nodos.items() if d["tipo"] == "inicio"]
              + [n for n in nodos if entradas[n] == 0] + list(nodos))
    for raiz in raices:
        if estado[raiz]:
            continue
        estado[raiz] = 1
        pila = [(raiz, iter(salidas[raiz]))]
        while pila:
            actual, it = pila[-1]
            for i, destino in it:
                if estado[destino] == 0:
                    estado[destino] = 1
                    pila.append((destino, iter(salidas[destino])))
                    break
                if estado[destino] == 1:
                    retorno.add(i)
            else:
                estado[actual] = 2
                pila.pop()
    # 2) Orden topológico (Kahn) sobre lo que queda, que ya no tiene ciclos
    delante = {n: [] for n in nodos}
    grado = {n: 0 for n in nodos}
    for i, f in enumerate(flujos):
        if i not in retorno:
            delante[f["de"]].append(f["a"])
            grado[f["a"]] += 1
    col = {n: 0 for n in nodos}
    cola = [n for n in nodos if grado[n] == 0]
    sin_previos = set(cola)
    while cola:
        n = cola.pop(0)
        for m in delante[n]:
            col[m] = max(col[m], col[n] + 1)
            grado[m] -= 1
            if grado[m] == 0:
                cola.append(m)
    # 3) Un nodo sin previos se acerca a su primer sucesor (flecha más corta)
    for n in sin_previos:
        if delante[n]:
            col[n] = max(0, min(col[m] for m in delante[n]) - 1)
    return col, retorno, delante


def _simplificar(pts):
    """Quita puntos repetidos y puntos intermedios alineados."""
    limpio = []
    for p in pts:
        p = (round(p[0], 1), round(p[1], 1))
        if not limpio or (abs(p[0] - limpio[-1][0]) > 0.05 or abs(p[1] - limpio[-1][1]) > 0.05):
            limpio.append(p)
    i = 1
    while i < len(limpio) - 1:
        a, b, c = limpio[i - 1], limpio[i], limpio[i + 1]
        if (abs(a[0] - b[0]) < 0.05 and abs(b[0] - c[0]) < 0.05) or \
           (abs(a[1] - b[1]) < 0.05 and abs(b[1] - c[1]) < 0.05):
            limpio.pop(i)
        else:
            i += 1
    return limpio


def _seg_toca_caja(p, q, caja, margen) -> bool:
    """¿El segmento (horizontal o vertical) pasa por dentro de la caja?"""
    l, t = caja[0] - margen, caja[1] - margen
    r, b = caja[0] + caja[2] + margen, caja[1] + caja[3] + margen
    if abs(p[1] - q[1]) < 0.05:
        return t < p[1] < b and max(p[0], q[0]) > l and min(p[0], q[0]) < r
    return l < p[0] < r and max(p[1], q[1]) > t and min(p[1], q[1]) < b


def _relacion_segmentos(s1, s2):
    """'solape' si van montados, 'cruce' si se cortan en cruz, None si nada."""
    (a, b), (c, d) = s1, s2
    h1, h2 = abs(a[1] - b[1]) < 0.05, abs(c[1] - d[1]) < 0.05
    if h1 and h2:
        if abs(a[1] - c[1]) < 5 and (min(max(a[0], b[0]), max(c[0], d[0]))
                                     - max(min(a[0], b[0]), min(c[0], d[0]))) > 3:
            return "solape"
        return None
    if not h1 and not h2:
        if abs(a[0] - c[0]) < 5 and (min(max(a[1], b[1]), max(c[1], d[1]))
                                     - max(min(a[1], b[1]), min(c[1], d[1]))) > 3:
            return "solape"
        return None
    hor, ver = (s1, s2) if h1 else (s2, s1)
    x, y = ver[0][0], hor[0][1]
    if (min(hor[0][0], hor[1][0]) < x < max(hor[0][0], hor[1][0])
            and min(ver[0][1], ver[1][1]) < y < max(ver[0][1], ver[1][1])):
        return "cruce"
    return None


def _disponer_proceso(proceso: dict) -> dict:
    """Calcula TODAS las posiciones. De aquí salen el SVG, el PNG y el BPMNDI."""
    nombre, carriles, nodos, flujos = _validar_proceso(proceso)
    col, retorno, delante = _columnas(nodos, flujos)
    previos = {n: [] for n in nodos}
    for n, destinos in delante.items():
        for m in destinos:
            previos[m].append(n)

    # Filas dentro de cada carril: si la celda (columna, fila) está ocupada,
    # el nodo baja a la siguiente fila y el carril crece.
    ocupadas: dict[str, set] = {c["id"]: set() for c in carriles}
    fila: dict[str, int] = {}
    for nid in sorted(nodos, key=lambda n: (col[n], list(nodos).index(n))):
        car = nodos[nid]["carril"]
        deseada = 0
        for p in previos[nid]:
            if nodos[p]["carril"] == car and p in fila:
                deseada = fila[p]
                break
        f = deseada
        if (col[nid], f) in ocupadas[car]:
            f = 0
            while (col[nid], f) in ocupadas[car]:
                f += 1
        ocupadas[car].add((col[nid], f))
        fila[nid] = f

    n_cols = max(col.values()) + 1
    x_pool, y_pool = P_MARGEN, P_MARGEN + P_TITULO
    x_cols = x_pool + P_CAB_POOL + P_CAB_CARRIL + P_PAD_IZQ
    ancho_pool = (P_CAB_POOL + P_CAB_CARRIL + P_PAD_IZQ + n_cols * P_PASO
                  - P_HUECO + P_PAD_DER)

    def canal_x(c):   # pasillo vertical a la derecha de la columna c
        return x_cols + c * P_PASO + P_TAREA_W + P_HUECO / 2

    # Carriles apilados
    y = y_pool
    canales_y: list[float] = []
    for i, c in enumerate(carriles):
        filas = 1 + max([f for (_, f) in ocupadas[c["id"]]], default=0)
        alto = 2 * P_PAD_CARRIL + filas * P_FILA
        c["caja"] = (x_pool + P_CAB_POOL, y, ancho_pool - P_CAB_POOL, alto)
        c["indice"] = i
        c["y_filas"] = y + P_PAD_CARRIL
        c["nodos"] = [n for n in nodos if nodos[n]["carril"] == c["id"]]
        for f in range(filas + 1):
            canales_y.append(y + P_PAD_CARRIL + f * P_FILA)
        y += alto
    alto_pool = y - y_pool
    por_id = {c["id"]: c for c in carriles}

    # Cajas de los nodos y de sus rótulos
    etiquetas: dict[str, tuple] = {}
    for nid, d in nodos.items():
        cx = x_cols + col[nid] * P_PASO + P_TAREA_W / 2
        cy = por_id[d["carril"]]["y_filas"] + fila[nid] * P_FILA + P_FILA / 2
        if d["tipo"] == "tarea":
            w, h = P_TAREA_W, P_TAREA_H
        elif d["tipo"] == "decision":
            w = h = P_COMPUERTA
        else:
            w = h = P_EVENTO
        d.update(col=col[nid], fila=fila[nid], cx=cx, cy=cy,
                 caja=(cx - w / 2, cy - h / 2, w, h))
        if d["tipo"] == "decision" and d["nombre"]:
            etiquetas[nid] = (cx - 70, cy - h / 2 - 34, 140, 31)
        elif d["tipo"] in ("inicio", "fin") and d["nombre"]:
            etiquetas[nid] = (cx - 60, cy + h / 2 + 3, 120, 42)

    # ---- Trazado de flechas ortogonales ------------------------------------
    trazados: list[tuple] = []          # (segmento, origen, destino)
    lados_salida: dict[str, set] = {n: set() for n in nodos}
    lados_usados: dict[str, set] = {n: set() for n in nodos}

    def lados(caja):
        l, t, w, h = caja
        return l, t, l + w, t + h, l + w / 2, t + h / 2

    def candidatos(de, a, es_retorno):
        A, B = nodos[de], nodos[a]
        al, at, ar, ab, acx, acy = lados(A["caja"])
        bl, bt, br, bb, bcx, bcy = lados(B["caja"])
        ca, cb = A["col"], B["col"]
        lista = []
        if not es_retorno and bl > ar:
            if abs(acy - bcy) < 0.5:
                lista.append(([(ar, acy), (bl, bcy)], "derecha", "izquierda"))
            for d in (0, -9, 9):
                for xm in (canal_x(ca) + d, canal_x(cb - 1) + d):
                    lista.append(([(ar, acy), (xm, acy), (xm, bcy), (bl, bcy)],
                                  "derecha", "izquierda"))
            if bcy > ab + 6:
                lista.append(([(acx, ab), (acx, bcy), (bl, bcy)], "abajo", "izquierda"))
            if bcy < at - 6:
                lista.append(([(acx, at), (acx, bcy), (bl, bcy)], "arriba", "izquierda"))
            if acy < bt - 12:
                lista.append(([(ar, acy), (bcx, acy), (bcx, bt)], "derecha", "arriba"))
            if acy > bb + 12:
                lista.append(([(ar, acy), (bcx, acy), (bcx, bb)], "derecha", "abajo"))
        return lista

    def generales(de, a):
        """Rutas por un pasillo horizontal: sirven para retornos y atascos."""
        A, B = nodos[de], nodos[a]
        al, at, ar, ab, acx, acy = lados(A["caja"])
        bl, bt, br, bb, bcx, bcy = lados(B["caja"])
        ca, cb = A["col"], B["col"]
        y_min = min(at, bt) - P_FILA - 20
        y_max = max(ab, bb) + P_FILA + 20
        lista = []
        for base_y in canales_y:
            if not (y_min <= base_y <= y_max):
                continue
            for dy in (0, -7, 7):
                yc = base_y + dy
                if yc < y_pool + 4 or yc > y_pool + alto_pool - 4:
                    continue
                for d in (0, 9, -9):
                    for salida in ("arriba", "abajo", "derecha"):
                        if salida == "arriba":
                            if yc > at - 6:
                                continue
                            ini = [(acx, at), (acx, yc)]
                        elif salida == "abajo":
                            if yc < ab + 6:
                                continue
                            ini = [(acx, ab), (acx, yc)]
                        else:
                            xa = canal_x(ca) + d
                            ini = [(ar, acy), (xa, acy), (xa, yc)]
                        if salida != "derecha" and d:
                            continue
                        for entrada in ("arriba", "abajo", "izquierda"):
                            if entrada == "arriba":
                                if yc > bt - 14:
                                    continue
                                fin = [(bcx, yc), (bcx, bt)]
                            elif entrada == "abajo":
                                if yc < bb + 14:
                                    continue
                                fin = [(bcx, yc), (bcx, bb)]
                            else:
                                xb = canal_x(cb - 1) - d
                                fin = [(xb, yc), (xb, bcy), (bl, bcy)]
                            lista.append((ini + fin, salida, entrada))
        return lista

    def costo(pts, de, a, salida, entrada, es_retorno=False):
        c = 10.0 * (len(pts) - 2)
        segs = list(zip(pts, pts[1:]))
        c += sum(abs(p[0] - q[0]) + abs(p[1] - q[1]) for p, q in segs) / 40.0
        ultimo = segs[-1]
        if abs(ultimo[0][0] - ultimo[1][0]) + abs(ultimo[0][1] - ultimo[1][1]) < 12:
            c += 300
        # retroceder sobre uno mismo (ir y volver por la misma línea)
        for (p, q), (r, s) in zip(segs, segs[1:]):
            if (q[0] - p[0]) * (s[0] - r[0]) + (q[1] - p[1]) * (s[1] - r[1]) < 0:
                c += 500
        es_compuerta = nodos[de]["tipo"] == "decision"
        if not es_compuerta and salida != "derecha":
            c += 25
        if nodos[a]["tipo"] != "decision" and entrada != "izquierda" and not es_retorno:
            c += 25   # un retorno sí puede entrar por arriba o por abajo
        if es_compuerta and salida in lados_salida[de]:
            c += 200
        for p, q in segs:
            for nid, d in nodos.items():
                propio = nid in (de, a)
                if _seg_toca_caja(p, q, d["caja"], -1 if propio else 7):
                    c += 1000
            for nid, caja in etiquetas.items():
                if nid in (de, a):
                    continue
                if _seg_toca_caja(p, q, caja, 0):
                    c += 150
            for seg2, de2, a2 in trazados:
                rel = _relacion_segmentos((p, q), seg2)
                if rel == "solape":
                    if de2 != de and a2 != a:
                        c += 400
                elif rel == "cruce":
                    c += 25
        return c

    orden = sorted(range(len(flujos)), key=lambda i: (
        i in retorno,
        abs(nodos[flujos[i]["a"]]["col"] - nodos[flujos[i]["de"]]["col"]),
        abs(nodos[flujos[i]["a"]]["cy"] - nodos[flujos[i]["de"]]["cy"]), i))
    for i in orden:
        f = flujos[i]
        de, a = f["de"], f["a"]
        es_retorno = i in retorno or nodos[a]["col"] <= nodos[de]["col"]
        mejor, mejor_c = None, None
        for pts, salida, entrada in candidatos(de, a, es_retorno):
            pts = _simplificar(pts)
            c = costo(pts, de, a, salida, entrada, es_retorno)
            if mejor_c is None or c < mejor_c:
                mejor, mejor_c = (pts, salida, entrada), c
        if mejor_c is None or mejor_c >= 140:
            for pts, salida, entrada in generales(de, a):
                pts = _simplificar(pts)
                if len(pts) < 2:
                    continue
                c = costo(pts, de, a, salida, entrada, es_retorno)
                if mejor_c is None or c < mejor_c:
                    mejor, mejor_c = (pts, salida, entrada), c
        if mejor is None:  # no debería pasar; línea directa de emergencia
            A, B = nodos[de], nodos[a]
            mejor = ([(A["cx"], A["cy"]), (B["cx"], B["cy"])], "derecha", "izquierda")
        pts, salida, entrada = mejor
        f.update(puntos=pts, salida=salida, entrada=entrada, retorno=i in retorno)
        lados_salida[de].add(salida)
        lados_usados[de].add(salida)
        lados_usados[a].add(entrada)
        for seg in zip(pts, pts[1:]):
            trazados.append((seg, de, a))
        # rótulo del flujo, junto al origen
        if f["nombre"]:
            (x0, y0), (x1, y1) = pts[0], pts[1]
            if abs(y0 - y1) < 0.05:
                f["rotulo"] = (x0 + 6, y0 - 9, "inicio")
            elif y1 > y0:
                f["rotulo"] = (x0 + 7, y0 + 11, "inicio")
            else:
                f["rotulo"] = (x0 + 7, y0 - 10, "inicio")

    # Rótulo de cada compuerta: encima; si una flecha usa el vértice de
    # arriba, se corre a la izquierda para no quedar atravesado.
    for nid, d in nodos.items():
        if d["tipo"] == "decision":
            d["rotulo_corrido"] = "arriba" in lados_usados[nid]

    return {
        "nombre": nombre,
        "ancho": x_pool + ancho_pool + P_MARGEN,
        "alto": y_pool + alto_pool + P_MARGEN,
        "pool": (x_pool, y_pool, ancho_pool, alto_pool),
        "carriles": carriles, "nodos": nodos, "flujos": flujos,
    }


def _es_sistema(carril: dict) -> bool:
    texto = _sin_tildes(f"{carril['id']} {carril['nombre']}").lower()
    return "sistema" in texto


def _dibujar_proceso(g: dict) -> Lienzo:
    L = Lienzo(g["ancho"], g["alto"])
    px, py, pw, ph = g["pool"]
    L.texto(px, P_MARGEN + P_TITULO / 2 - 4,
            _recortar("Proceso: " + g["nombre"], g["ancho"] - 2 * P_MARGEN, 16, True),
            tam=16, negrita=True, ancla="inicio")
    # pool y carriles
    L.rect(px, py, pw, ph, relleno=BLANCO, borde=BORDE, grosor=1.5)
    L.rect(px, py, P_CAB_POOL, ph, relleno="#cbd5e1", borde=BORDE, grosor=1.5)
    L.texto(px + P_CAB_POOL / 2, py + ph / 2,
            _recortar(g["nombre"], ph - 16, 12, True), tam=12, negrita=True, giro=-90)
    sistema = {}
    for c in g["carriles"]:
        x, y, w, h = c["caja"]
        i = c["indice"] % 2
        L.rect(x, y, w, h, relleno=FONDOS_CARRIL[i], borde=BORDE, grosor=1.2)
        L.rect(x, y, P_CAB_CARRIL, h, relleno=CABECERAS_CARRIL[i], borde=BORDE, grosor=1.2)
        L.texto(x + P_CAB_CARRIL / 2, y + h / 2,
                _recortar(c["nombre"], h - 12, 12, True), tam=12, negrita=True, giro=-90)
        sistema[c["id"]] = _es_sistema(c)
    # flechas (debajo de los nodos)
    for f in g["flujos"]:
        L.linea(f["puntos"], color=BORDE, grosor=1.5, flecha=True)
    # nodos
    for nid, d in g["nodos"].items():
        x, y, w, h = d["caja"]
        cx, cy = d["cx"], d["cy"]
        if d["tipo"] == "tarea":
            relleno = "#eef2ff" if sistema[d["carril"]] else BLANCO
            L.rect_redondeado(x, y, w, h, radio=8, relleno=relleno, borde=BORDE, grosor=1.5)
            L.texto(cx, cy, d["nombre"], tam=12, ancho=w - 16, max_lineas=4)
        elif d["tipo"] == "decision":
            L.rombo(cx, cy, w, h, relleno="#fffbeb", borde=BORDE, grosor=1.5)
            L.linea([(cx - 7, cy - 7), (cx + 7, cy + 7)], color=BORDE, grosor=2.2)
            L.linea([(cx - 7, cy + 7), (cx + 7, cy - 7)], color=BORDE, grosor=2.2)
        elif d["tipo"] == "inicio":
            L.circulo(cx, cy, w / 2, relleno="#dcfce7", borde=VERDE, grosor=2)
        else:
            L.circulo(cx, cy, w / 2, relleno="#fee2e2", borde=ROJO, grosor=4)
    # rótulos de eventos, compuertas y flujos (encima de todo)
    for nid, d in g["nodos"].items():
        x, y, w, h = d["caja"]
        if d["tipo"] == "decision" and d["nombre"]:
            if d.get("rotulo_corrido"):
                L.texto(d["cx"] - 10, y + 6, d["nombre"], tam=11, negrita=True,
                        ancla="fin", ancho=120, valign="abajo", max_lineas=3)
            else:
                L.texto(d["cx"], y - 4, d["nombre"], tam=11, negrita=True,
                        ancho=140, valign="abajo", max_lineas=2)
        elif d["tipo"] in ("inicio", "fin") and d["nombre"]:
            L.texto(d["cx"], y + h + 4, d["nombre"], tam=11, ancho=120,
                    valign="arriba", max_lineas=3)
    for f in g["flujos"]:
        if f.get("rotulo"):
            x, y, ancla = f["rotulo"]
            L.texto(x, y, f["nombre"], tam=11, color=ACENTO, negrita=True, ancla=ancla)
    return L


def _bpmn(g: dict) -> str:
    """BPMN 2.0 con BPMNDI; las coordenadas son las mismas del dibujo."""
    usados: set = set()
    id_proceso = _unico("Proceso_" + _ident(g["nombre"], "1"), usados)
    id_colab = _unico("Colaboracion_1", usados)
    id_part = _unico("Participante_1", usados)
    id_carril = {c["id"]: _unico("Carril_" + _ident(c["id"]), usados) for c in g["carriles"]}
    id_nodo = {n: _unico("Nodo_" + _ident(n), usados) for n in g["nodos"]}
    id_flujo = [_unico(f"Flujo_{i}", usados) for i in range(1, len(g["flujos"]) + 1)]
    sistema = {c["id"]: _es_sistema(c) for c in g["carriles"]}
    entran = {n: [] for n in g["nodos"]}
    salen = {n: [] for n in g["nodos"]}
    for fid, f in zip(id_flujo, g["flujos"]):
        salen[f["de"]].append(fid)
        entran[f["a"]].append(fid)

    x = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
         'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
         'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" '
         'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
         'id="Definiciones_1" targetNamespace="http://bpmn.io/schema/bpmn" '
         'exporter="diagramas.py" exporterVersion="1.0">',
         f'  <bpmn:collaboration id="{id_colab}">',
         f'    <bpmn:participant id="{id_part}" name="{_xml(g["nombre"])}" '
         f'processRef="{id_proceso}"/>',
         '  </bpmn:collaboration>',
         f'  <bpmn:process id="{id_proceso}" name="{_xml(g["nombre"])}" isExecutable="false">',
         f'    <bpmn:laneSet id="{_unico("Carriles_1", usados)}">']
    for c in g["carriles"]:
        if c["nodos"]:
            x.append(f'      <bpmn:lane id="{id_carril[c["id"]]}" name="{_xml(c["nombre"])}">')
            for n in c["nodos"]:
                x.append(f'        <bpmn:flowNodeRef>{id_nodo[n]}</bpmn:flowNodeRef>')
            x.append('      </bpmn:lane>')
        else:
            x.append(f'      <bpmn:lane id="{id_carril[c["id"]]}" name="{_xml(c["nombre"])}"/>')
    x.append('    </bpmn:laneSet>')
    for nid, d in g["nodos"].items():
        etiqueta = {"inicio": "startEvent", "fin": "endEvent",
                    "decision": "exclusiveGateway"}.get(d["tipo"])
        if etiqueta is None:
            etiqueta = "serviceTask" if sistema[d["carril"]] else "userTask"
        d["bpmn"] = etiqueta
        nombre = f' name="{_xml(d["nombre"])}"' if d["nombre"] else ""
        hijos = ([f'      <bpmn:incoming>{f}</bpmn:incoming>' for f in entran[nid]]
                 + [f'      <bpmn:outgoing>{f}</bpmn:outgoing>' for f in salen[nid]])
        if hijos:
            x.append(f'    <bpmn:{etiqueta} id="{id_nodo[nid]}"{nombre}>')
            x.extend(hijos)
            x.append(f'    </bpmn:{etiqueta}>')
        else:
            x.append(f'    <bpmn:{etiqueta} id="{id_nodo[nid]}"{nombre}/>')
    for fid, f in zip(id_flujo, g["flujos"]):
        nombre = f' name="{_xml(f["nombre"])}"' if f["nombre"] else ""
        x.append(f'    <bpmn:sequenceFlow id="{fid}"{nombre} '
                 f'sourceRef="{id_nodo[f["de"]]}" targetRef="{id_nodo[f["a"]]}"/>')
    x.append('  </bpmn:process>')

    # ---- BPMNDI ------------------------------------------------------------
    def limites(caja, sangria="        "):
        return (f'{sangria}<dc:Bounds x="{_n(caja[0])}" y="{_n(caja[1])}" '
                f'width="{_n(caja[2])}" height="{_n(caja[3])}"/>')

    x.append('  <bpmndi:BPMNDiagram id="BPMNDiagram_1">')
    x.append(f'    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="{id_colab}">')
    x.append(f'      <bpmndi:BPMNShape id="{id_part}_di" bpmnElement="{id_part}" '
             'isHorizontal="true">')
    x.append(limites(g["pool"]))
    x.append('      </bpmndi:BPMNShape>')
    for c in g["carriles"]:
        cid = id_carril[c["id"]]
        x.append(f'      <bpmndi:BPMNShape id="{cid}_di" bpmnElement="{cid}" isHorizontal="true">')
        x.append(limites(c["caja"]))
        x.append('      </bpmndi:BPMNShape>')
    for nid, d in g["nodos"].items():
        marca = ' isMarkerVisible="true"' if d["tipo"] == "decision" else ""
        x.append(f'      <bpmndi:BPMNShape id="{id_nodo[nid]}_di" '
                 f'bpmnElement="{id_nodo[nid]}"{marca}>')
        x.append(limites(d["caja"]))
        cx, (bx, by, bw, bh) = d["cx"], d["caja"]
        if d["nombre"] and d["tipo"] == "decision":
            x.append('        <bpmndi:BPMNLabel>')
            if d.get("rotulo_corrido"):
                x.append(limites((cx - 130, by - 36, 120, 42), "          "))
            else:
                x.append(limites((cx - 70, by - 32, 140, 28), "          "))
            x.append('        </bpmndi:BPMNLabel>')
        elif d["nombre"] and d["tipo"] in ("inicio", "fin"):
            x.append('        <bpmndi:BPMNLabel>')
            x.append(limites((cx - 60, by + bh + 4, 120, 28), "          "))
            x.append('        </bpmndi:BPMNLabel>')
        x.append('      </bpmndi:BPMNShape>')
    for fid, f in zip(id_flujo, g["flujos"]):
        x.append(f'      <bpmndi:BPMNEdge id="{fid}_di" bpmnElement="{fid}">')
        for px, py in f["puntos"]:
            x.append(f'        <di:waypoint x="{_n(px)}" y="{_n(py)}"/>')
        if f.get("rotulo"):
            rx, ry, _ = f["rotulo"]
            ancho = max(12, round(_medir(f["nombre"], 11, True)) + 2)
            x.append('        <bpmndi:BPMNLabel>')
            x.append(limites((rx, ry - 7, ancho, 14), "          "))
            x.append('        </bpmndi:BPMNLabel>')
        x.append('      </bpmndi:BPMNEdge>')
    x.append('    </bpmndi:BPMNPlane>')
    x.append('  </bpmndi:BPMNDiagram>')
    x.append('</bpmn:definitions>')
    return "\n".join(x) + "\n"


def diagrama_proceso(proceso: dict, base: str) -> list[str]:
    """Proceso con carriles -> base.bpmn (BPMN 2.0 + DI), base.svg y base.png.

    Lanza ValueError (en español, nombrando el id culpable) si un nodo nombra
    un carril inexistente o un flujo nombra un nodo inexistente.
    """
    base = _preparar(base)
    g = _disponer_proceso(proceso)
    rutas = [_escribir(base + ".bpmn", _bpmn(g))]
    rutas += _dibujar_proceso(g).guardar(base)
    return rutas


# ============================================================================
# 2. CLASES
# ============================================================================
_TIPOS_REL = {"asociacion": "-->", "composicion": "*--", "agregacion": "o--",
              "herencia": "<|--", "dependencia": "..>"}
_RESERVADAS_MMD = {"class", "end", "note", "direction", "namespace", "link",
                   "click", "callback", "style", "classdiagram", "cssclass"}


def _tipo_relacion(valor) -> str:
    t = _sin_tildes(str(valor or "asociacion")).strip().lower()
    return t if t in _TIPOS_REL else "asociacion"


def _recta_en_caja(p, q, caja):
    """Liang-Barsky: tramo (t0, t1) de p→q que cae dentro de la caja, o None."""
    l, t, w, h = caja
    dx, dy = q[0] - p[0], q[1] - p[1]
    t0, t1 = 0.0, 1.0
    for pp, qq in ((-dx, p[0] - l), (dx, l + w - p[0]), (-dy, p[1] - t), (dy, t + h - p[1])):
        if abs(pp) < 1e-9:
            if qq < 0:
                return None
            continue
        r = qq / pp
        if pp < 0:
            if r > t1:
                return None
            t0 = max(t0, r)
        else:
            if r < t0:
                return None
            t1 = min(t1, r)
    return (t0, t1) if t0 < t1 else None


def _se_cruzan(a, b, c, d) -> bool:
    def o(p, q, r):
        v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
        return (v > 1e-9) - (v < -1e-9)
    return o(a, b, c) * o(a, b, d) < 0 and o(c, d, a) * o(c, d, b) < 0


def _normalizar_clases(clases, relaciones):
    lista, vistos = [], {}
    for c in clases or []:
        if isinstance(c, str):
            c = {"nombre": c}
        nombre = _limpio(c.get("nombre"))
        if not nombre or nombre in vistos:
            continue
        vistos[nombre] = len(lista)
        lista.append({"nombre": nombre,
                      "atributos": [_limpio(a) for a in (c.get("atributos") or []) if _limpio(a)],
                      "operaciones": [_limpio(o) for o in (c.get("operaciones") or []) if _limpio(o)]})
    rels = []
    for r in relaciones or []:
        if not isinstance(r, dict):
            continue
        de, a = _limpio(r.get("de")), _limpio(r.get("a"))
        if not de or not a:
            continue
        for extremo in (de, a):   # clase nombrada pero no declarada: caja vacía
            if extremo not in vistos:
                vistos[extremo] = len(lista)
                lista.append({"nombre": extremo, "atributos": [], "operaciones": []})
        rels.append({"de": de, "a": a, "tipo": _tipo_relacion(r.get("tipo")),
                     "nombre": _limpio(r.get("nombre")),
                     "cardinalidad": _limpio(r.get("cardinalidad"))})
    return lista, rels


def _mermaid_clases(clases, rels) -> str:
    usados: set = set()
    ident = {}
    for c in clases:
        base = _ident(c["nombre"], "Clase")
        if base[0].isdigit():
            base = "C_" + base
        if base.lower() in _RESERVADAS_MMD:
            base += "_"
        ident[c["nombre"]] = _unico(base, usados)

    def miembro(texto):
        s = texto.replace("{", "(").replace("}", ")").replace('"', "'").replace("`", "'")
        return s.replace("<", "~").replace(">", "~").replace(";", ",").strip()

    def etiqueta(texto):
        return texto.replace('"', "'").replace("`", "'").replace("[", "(").replace("]", ")")

    m = ["classDiagram"]
    if not clases:   # Mermaid no acepta un diagrama de clases sin nada dentro
        m.append('    class SinClases["Sin clases"]')
    for c in clases:
        i = ident[c["nombre"]]
        cab = f"class {i}" if i == c["nombre"] else f'class {i}["{etiqueta(c["nombre"])}"]'
        miembros = [miembro(x) for x in c["atributos"] + c["operaciones"]]
        miembros = [x for x in miembros if x]
        if miembros:
            m.append(f"    {cab} {{")
            m.extend(f"        {x}" for x in miembros)
            m.append("    }")
        else:
            m.append(f"    {cab}")
    for r in rels:
        de, a = ident[r["de"]], ident[r["a"]]
        card = re.sub(r'["`\n]', "", r["cardinalidad"])
        card = f' "{card}"' if card else ""
        nombre = re.sub(r'[:;#"`\n]', " ", r["nombre"]).strip()
        nombre = f" : {nombre}" if nombre else ""
        if r["tipo"] == "herencia":
            padre, hija = (a, de) if HERENCIA_DE_ES_HIJA else (de, a)
            m.append(f"    {padre} <|-- {hija}{nombre}")
        else:
            m.append(f"    {de} {_TIPOS_REL[r['tipo']]}{card} {a}{nombre}")
    return "\n".join(m) + "\n"


def diagrama_clases(clases: list, relaciones: list, base: str) -> list[str]:
    """Clases UML -> base.mmd (Mermaid classDiagram), base.svg y base.png.

    Tipos de relación: asociacion, composicion, agregacion, herencia,
    dependencia. En «herencia», «de» es la hija y «a» la clase padre.
    """
    base = _preparar(base)
    clases, rels = _normalizar_clases(clases, relaciones)
    rutas = [_escribir(base + ".mmd", _mermaid_clases(clases, rels))]

    TAM, LINEA, CAB = 11, 17, 32
    MARGEN, TITULO, HUECO_X, HUECO_Y = 30, 34, 130, 100
    n = len(clases)
    for c in clases:
        textos = c["atributos"] + c["operaciones"]
        ancho = max([_medir(c["nombre"], 13, True) + 28]
                    + [_medir(t, TAM) + 22 for t in textos] + [170])
        c["w"] = min(300.0, math.ceil(ancho))
        c["h_attr"] = max(1, len(c["atributos"])) * LINEA + 10
        c["h_oper"] = max(1, len(c["operaciones"])) * LINEA + 10
        c["h"] = CAB + c["h_attr"] + c["h_oper"]
    if n <= 3:
        n_cols = max(1, n)
    elif n == 4:
        n_cols = 2
    elif n <= 9:
        n_cols = 3
    else:
        n_cols = 4
    n_filas = max(1, math.ceil(n / n_cols))
    celda_w = (max([c["w"] for c in clases], default=170)) + HUECO_X
    nombres = [c["nombre"] for c in clases]
    por_nombre = {c["nombre"]: c for c in clases}

    def geometria(orden):
        """orden: lista de huecos de la rejilla (nombre de clase o None)."""
        cajas, y = {}, MARGEN + TITULO
        for f in range(n_filas):
            fila = orden[f * n_cols:(f + 1) * n_cols]
            alto = max([por_nombre[x]["h"] for x in fila if x], default=0)
            for i, x in enumerate(fila):
                if x:
                    c = por_nombre[x]
                    cx = MARGEN + i * celda_w + celda_w / 2
                    cajas[x] = (cx - c["w"] / 2, y + (alto - c["h"]) / 2, c["w"], c["h"])
            if alto:
                y += alto + HUECO_Y
        return cajas, y - HUECO_Y

    def centro(caja):
        return (caja[0] + caja[2] / 2, caja[1] + caja[3] / 2)

    def costo(orden):
        cajas, _ = geometria(orden)
        tramos, total = [], 0.0
        for r in rels:
            if r["de"] == r["a"]:
                continue
            p, q = centro(cajas[r["de"]]), centro(cajas[r["a"]])
            tramos.append((p, q))
            total += math.hypot(q[0] - p[0], q[1] - p[1]) / 100.0
            for nombre, caja in cajas.items():
                if nombre in (r["de"], r["a"]):
                    continue
                inflada = (caja[0] - 8, caja[1] - 8, caja[2] + 16, caja[3] + 16)
                if _recta_en_caja(p, q, inflada):
                    total += 100
        for i in range(len(tramos)):
            for j in range(i + 1, len(tramos)):
                if _se_cruzan(*tramos[i], *tramos[j]):
                    total += 10
        return total

    # Mejora local: intercambia huecos mientras bajen cruces y longitudes
    orden = nombres + [None] * (n_filas * n_cols - n)
    if rels and n > 1:
        mejor = costo(orden)
        for _ in range(30):
            cambio = False
            for i in range(len(orden)):
                for j in range(i + 1, len(orden)):
                    if orden[i] is None and orden[j] is None:
                        continue
                    orden[i], orden[j] = orden[j], orden[i]
                    c = costo(orden)
                    if c < mejor - 1e-6:
                        mejor, cambio = c, True
                    else:
                        orden[i], orden[j] = orden[j], orden[i]
            if not cambio:
                break
    cajas, y_fin = geometria(orden)
    usadas_cols = max([i % n_cols for i, x in enumerate(orden) if x], default=0) + 1

    L = Lienzo(MARGEN * 2 + usadas_cols * celda_w, y_fin + MARGEN + 10)
    L.texto(MARGEN, MARGEN + 6, "Diagrama de clases", tam=16, negrita=True, ancla="inicio")
    if not clases:
        L.tamano(420, 120)
        L.texto(MARGEN, 80, "No hay clases que dibujar.", tam=12, color=GRIS, ancla="inicio")

    # relaciones (debajo de las cajas)
    pares: dict = {}
    for r in rels:
        pares.setdefault(frozenset((r["de"], r["a"])), []).append(r)
    rotulos = []
    for grupo in pares.values():
        for k, r in enumerate(grupo):
            A, B = cajas[r["de"]], cajas[r["a"]]
            discontinua = r["tipo"] == "dependencia"
            if r["de"] == r["a"]:      # relación de una clase consigo misma
                l, t, w, h = A
                pts = [(l + w - 30, t), (l + w - 30, t - 22 - 10 * k),
                       (l + w + 24 + 10 * k, t - 22 - 10 * k),
                       (l + w + 24 + 10 * k, t + 26), (l + w, t + 26)]
                L.linea(pts, color=BORDE, grosor=1.4, flecha=True, discontinua=discontinua)
                rotulos.append((l + w + 24, t - 34 - 10 * k, r, 9999.0, 1.0, 0.0))
                continue
            p, q = centro(A), centro(B)
            largo = math.hypot(q[0] - p[0], q[1] - p[1]) or 1.0
            ux, uy = (q[0] - p[0]) / largo, (q[1] - p[1]) / largo
            # varias relaciones entre el mismo par: líneas paralelas separadas
            signo = 1 if r["de"] <= r["a"] else -1
            des = (k - (len(grupo) - 1) / 2) * 22 * signo
            p = (p[0] - uy * des, p[1] + ux * des)
            q = (q[0] - uy * des, q[1] + ux * des)
            ta = _recta_en_caja(p, q, A)
            tb = _recta_en_caja(p, q, B)
            s = ta[1] if ta else 0.0
            e = tb[0] if tb else 1.0
            ini = (p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s)
            fin = (p[0] + (q[0] - p[0]) * e, p[1] + (q[1] - p[1]) * e)
            nx, ny = -uy, ux
            tipo = r["tipo"]
            if tipo in ("composicion", "agregacion"):      # rombo en «de»
                m1 = (ini[0] + ux * 9, ini[1] + uy * 9)
                m2 = (ini[0] + ux * 18, ini[1] + uy * 18)
                L.linea([m2, fin], color=BORDE, grosor=1.4)
                L.poligono([ini, (m1[0] + nx * 5.5, m1[1] + ny * 5.5), m2,
                            (m1[0] - nx * 5.5, m1[1] - ny * 5.5)],
                           relleno=TINTA if tipo == "composicion" else BLANCO,
                           borde=BORDE, grosor=1.4)
            elif tipo == "herencia":                       # triángulo en el padre
                if HERENCIA_DE_ES_HIJA:
                    punta, cola, sx, sy = fin, ini, -ux, -uy
                else:
                    punta, cola, sx, sy = ini, fin, ux, uy
                b = (punta[0] + sx * 15, punta[1] + sy * 15)
                L.linea([cola, b], color=BORDE, grosor=1.4)
                L.poligono([punta, (b[0] + nx * 8, b[1] + ny * 8),
                            (b[0] - nx * 8, b[1] - ny * 8)],
                           relleno=BLANCO, borde=BORDE, grosor=1.4)
            else:                                          # flecha abierta en «a»
                L.linea([ini, fin], color=BORDE, grosor=1.4, discontinua=discontinua)
                b = (fin[0] - ux * 12, fin[1] - uy * 12)
                L.linea([(b[0] + nx * 6, b[1] + ny * 6), fin,
                         (b[0] - nx * 6, b[1] - ny * 6)], color=BORDE, grosor=1.4)
            rotulos.append(((ini[0] + fin[0]) / 2, (ini[1] + fin[1]) / 2, r,
                            math.hypot(fin[0] - ini[0], fin[1] - ini[1]), ux, uy))

    # cajas de tres compartimentos
    for c in clases:
        x, y, w, h = cajas[c["nombre"]]
        L.rect(x, y, w, h, relleno=BLANCO, borde=BORDE, grosor=1.5)
        L.rect(x, y, w, CAB, relleno="#e0e7ff", borde=BORDE, grosor=1.5)
        L.texto(x + w / 2, y + CAB / 2, _recortar(c["nombre"], w - 16, 13, True),
                tam=13, negrita=True)
        yy = y + CAB + 5
        for a in c["atributos"]:
            L.texto(x + 10, yy + LINEA / 2, _recortar(a, w - 20, TAM), tam=TAM, ancla="inicio")
            yy += LINEA
        y2 = y + CAB + c["h_attr"]
        L.linea([(x, y2), (x + w, y2)], color=BORDE, grosor=1.2)
        yy = y2 + 5
        for o in c["operaciones"]:
            L.texto(x + 10, yy + LINEA / 2, _recortar(o, w - 20, TAM), tam=TAM, ancla="inicio")
            yy += LINEA

    # nombre y cardinalidad en el punto medio, sobre fondo blanco
    for mx, my, r, largo, ux, uy in rotulos:
        partes = [t for t in (r["nombre"], r["cardinalidad"]) if t]
        if not partes:
            continue
        texto = " · ".join(partes)
        ancho = _medir(texto, 11) + 12
        # línea corta: el rótulo va al costado para no tapar el marcador
        if largo < ancho * abs(ux) + 20 * abs(uy) + 46:
            if abs(ux) >= abs(uy):
                my -= 19
            else:
                mx += ancho / 2 + 8
        mx = min(max(mx, ancho / 2 + 4), L.ancho - ancho / 2 - 4)
        L.rect(mx - ancho / 2, my - 10, ancho, 20, relleno=BLANCO, borde="#cbd5e1",
               grosor=1, radio=4)
        L.texto(mx, my, texto, tam=11, color=ACENTO)
    return rutas + L.guardar(base)


# ============================================================================
# 3. FLUJO DE USO
# ============================================================================
def _mmd_texto(texto: str) -> str:
    """Texto seguro para ir entre comillas en un flowchart de Mermaid."""
    s = _limpio(texto).replace("#", "#35;").replace('"', "#quot;")
    s = s.replace("<", "#lt;").replace(">", "#gt;").replace("`", "'")
    return s or " "


def diagrama_flujo(flujo: dict, base: str) -> list[str]:
    """Flujo paso a paso -> base.mmd (flowchart TD), base.svg y base.png."""
    base = _preparar(base)
    if not isinstance(flujo, dict):
        raise ValueError("El flujo debe ser un objeto (dict) con «nombre» y «pasos».")
    nombre = _limpio(flujo.get("nombre")) or _limpio(flujo.get("id")) or "Flujo"
    rol = _limpio(flujo.get("rol"))
    pasos = []
    for p in flujo.get("pasos") or []:
        if isinstance(p, str):
            p = {"accion": p}
        pasos.append({k: _limpio(p.get(k)) or "—" for k in ("pantalla", "accion", "resultado")})

    # ---- Mermaid -----------------------------------------------------------
    titulo = nombre + (f" · Rol: {rol}" if rol else "")
    m = ["flowchart TD", f'    T(["{_mmd_texto(titulo)}"])']
    for i, p in enumerate(pasos, 1):
        m.append(f'    P{i}A["{_mmd_texto(f"{i}. Pantalla: " + p["pantalla"])}"]')
        m.append(f'    P{i}B["{_mmd_texto(p["accion"])}"]')
        m.append(f'    P{i}C(["{_mmd_texto(p["resultado"])}"])')
    for i in range(1, len(pasos) + 1):
        previo = "T" if i == 1 else f"P{i - 1}C"
        m.append(f"    {previo} --> P{i}A")
        m.append(f"    P{i}A --> P{i}B")
        m.append(f"    P{i}B --> P{i}C")
    rutas = [_escribir(base + ".mmd", "\n".join(m) + "\n")]

    # ---- Dibujo ------------------------------------------------------------
    MARGEN, TAM, IL = 24, 12, 15
    x_num = MARGEN + 15
    x1, w1 = MARGEN + 44, 200
    x2, w2 = x1 + w1 + 46, 300
    x3, w3 = x2 + w2 + 46, 250
    ancho = x3 + w3 + MARGEN
    HUECO = 38
    filas = []
    for p in pasos:
        lineas = [_partir(p["pantalla"], w1 - 22, TAM, True),
                  _partir(p["accion"], w2 - 22, TAM),
                  _partir(p["resultado"], w3 - 26, TAM)]
        filas.append(max(50, max(len(x) for x in lineas) * IL + 24))
    y = MARGEN
    L = Lienzo(ancho, 100)
    alto_t = L.texto(MARGEN, y, "Flujo: " + nombre, tam=17, negrita=True, ancla="inicio",
                     ancho=ancho - 2 * MARGEN, valign="arriba", max_lineas=2)
    y += alto_t + 8
    if rol:
        w_rol = _medir("Rol: " + rol, 12, True) + 24
        L.rect_redondeado(MARGEN, y, w_rol, 26, radio=13, relleno="#dbeafe",
                          borde=ACENTO, grosor=1.2)
        L.texto(MARGEN + w_rol / 2, y + 13, "Rol: " + rol, tam=12, negrita=True, color=ACENTO)
        y += 26 + 14
    for x, w, t in ((x1, w1, "PANTALLA"), (x2, w2, "ACCIÓN"), (x3, w3, "RESULTADO")):
        L.texto(x + w / 2, y + 8, t, tam=10.5, negrita=True, color=GRIS)
    y += 24
    if not pasos:
        L.texto(MARGEN, y + 10, "Este flujo no tiene pasos.", tam=12, color=GRIS, ancla="inicio")
        y += 30
    for i, (p, h) in enumerate(zip(pasos, filas)):
        cy = y + h / 2
        L.circulo(x_num, cy, 14, relleno=ACENTO, borde=ACENTO, grosor=1)
        L.texto(x_num, cy, str(i + 1), tam=12, negrita=True, color=BLANCO)
        L.rect_redondeado(x1, y, w1, h, radio=5, relleno="#eff6ff", borde=ACENTO, grosor=1.5)
        L.texto(x1 + w1 / 2, cy, p["pantalla"], tam=TAM, negrita=True, ancho=w1 - 22)
        L.rect_redondeado(x2, y, w2, h, radio=5, relleno=BLANCO, borde=BORDE, grosor=1.5)
        L.texto(x2 + w2 / 2, cy, p["accion"], tam=TAM, ancho=w2 - 22)
        L.rect_redondeado(x3, y, w3, h, radio=min(18, h / 2), relleno="#f0fdf4",
                          borde=VERDE, grosor=1.5)
        L.texto(x3 + w3 / 2, cy, p["resultado"], tam=TAM, ancho=w3 - 26)
        L.linea([(x1 + w1, cy), (x2, cy)], flecha=True)
        L.linea([(x2 + w2, cy), (x3, cy)], flecha=True)
        if i < len(pasos) - 1:   # del resultado a la pantalla del paso siguiente
            ym = y + h + HUECO / 2
            L.linea([(x3 + w3 / 2, y + h), (x3 + w3 / 2, ym), (x1 + w1 / 2, ym),
                     (x1 + w1 / 2, y + h + HUECO)], color=GRIS, flecha=True)
            y += h + HUECO
        else:
            y += h
    L.tamano(ancho, y + MARGEN)
    return rutas + L.guardar(base)


# ============================================================================
# 4. ESQUEMA DE PANTALLA
# ============================================================================
def diagrama_pantalla(pantalla: dict, base: str) -> list[str]:
    """Esquema («wireframe») de una pantalla -> base.svg y base.png.

    No es una captura: es un dibujo de la estructura (campos, botones, tablas).
    """
    base = _preparar(base)
    if not isinstance(pantalla, dict):
        raise ValueError("La pantalla debe ser un objeto (dict).")
    nombre = _limpio(pantalla.get("nombre")) or _limpio(pantalla.get("id")) or "Pantalla"
    url = _limpio(pantalla.get("url")) or "/"
    campos = [_limpio(c) for c in (pantalla.get("campos") or []) if _limpio(c)]
    botones = [_limpio(b) for b in (pantalla.get("botones") or []) if _limpio(b)]
    menu = [_limpio(x) for x in (pantalla.get("menu") or []) if _limpio(x)]
    nota = _limpio(pantalla.get("nota"))
    tablas = []
    for t in pantalla.get("tablas") or []:
        if isinstance(t, str):
            t = {"nombre": t}
        if isinstance(t, (list, tuple)):
            t = {"columnas": list(t)}
        tablas.append({"nombre": _limpio(t.get("nombre")),
                       "columnas": [_limpio(c) for c in (t.get("columnas") or []) if _limpio(c)]})

    ANCHO, MARGEN, PAD = 760, 20, 28
    vx, vy, vw = MARGEN, 46, ANCHO - 2 * MARGEN
    cx0, cw = vx + PAD, vw - 2 * PAD

    def dibujar(L: Lienzo, alto_ventana: float) -> float:
        L.texto(MARGEN, 24, "Esquema de la pantalla, no es una captura", tam=11.5,
                color=GRIS, negrita=True, ancla="inicio")
        # marco de ventana con barra y URL
        L.rect_redondeado(vx, vy, vw, alto_ventana, radio=10, relleno=BLANCO,
                          borde=BORDE, grosor=1.5)
        L.rect_redondeado(vx + 2, vy + 2, vw - 4, 36, radio=8, relleno="#e2e8f0",
                          borde=None, grosor=0)
        L.rect(vx + 2, vy + 26, vw - 4, 12, relleno="#e2e8f0", borde=None, grosor=0)
        L.linea([(vx, vy + 38), (vx + vw, vy + 38)], color=BORDE, grosor=1.5)
        for i in range(3):
            L.circulo(vx + 20 + i * 18, vy + 19, 5.5, relleno="#cbd5e1", borde=GRIS_CLARO, grosor=1)
        L.rect_redondeado(vx + 78, vy + 8, vw - 98, 22, radio=11, relleno=BLANCO,
                          borde=GRIS_CLARO, grosor=1)
        L.texto(vx + 92, vy + 19, _recortar(url, vw - 126, 11), tam=11, color=GRIS, ancla="inicio")
        y = vy + 38
        # menú como barra superior
        if menu:
            x, filas_menu, posiciones = cx0, 1, []
            for item in menu:
                w = _medir(item, 12) + 26
                if x + w > cx0 + cw and x > cx0:
                    x, filas_menu = cx0, filas_menu + 1
                posiciones.append((x, filas_menu - 1, item))
                x += w
            alto_menu = 10 + filas_menu * 26
            L.rect(vx + 2, y, vw - 4, alto_menu, relleno="#f1f5f9", borde=None, grosor=0)
            L.linea([(vx + 2, y + alto_menu), (vx + vw - 2, y + alto_menu)], color="#cbd5e1", grosor=1)
            for x, f, item in posiciones:
                L.texto(x, y + 5 + f * 26 + 13, _recortar(item, cw, 12), tam=12, ancla="inicio")
            y += alto_menu
        y += 22
        # título
        y += L.texto(cx0, y, nombre, tam=20, negrita=True, ancla="inicio", ancho=cw,
                     valign="arriba", max_lineas=2) + 14
        # campos como cajas de texto rotuladas
        if campos:
            cols = 2 if len(campos) > 4 else 1
            ancho_c = (cw - (cols - 1) * 24) / cols if cols == 2 else min(cw, 420)
            for i, campo in enumerate(campos):
                x = cx0 + (i % cols) * (ancho_c + 24)
                yy = y + (i // cols) * 58
                L.texto(x, yy + 8, _recortar(campo, ancho_c, 11.5), tam=11.5, color=TINTA,
                        negrita=True, ancla="inicio")
                L.rect_redondeado(x, yy + 19, ancho_c, 30, radio=4, relleno="#f8fafc",
                                  borde=GRIS_CLARO, grosor=1.2)
            y += math.ceil(len(campos) / cols) * 58 + 8
        # botones
        if botones:
            x = cx0
            for i, b in enumerate(botones):
                texto = _recortar(b, cw - 36, 12, True)
                w = _medir(texto, 12, True) + 36
                if x + w > cx0 + cw and x > cx0:
                    x, y = cx0, y + 44
                if i == 0:
                    L.rect_redondeado(x, y, w, 34, radio=6, relleno=ACENTO, borde=ACENTO, grosor=1.2)
                    L.texto(x + w / 2, y + 17, texto, tam=12, negrita=True, color=BLANCO)
                else:
                    L.rect_redondeado(x, y, w, 34, radio=6, relleno=BLANCO, borde=ACENTO, grosor=1.2)
                    L.texto(x + w / 2, y + 17, texto, tam=12, negrita=True, color=ACENTO)
                x += w + 12
            y += 34 + 22
        # tablas: cabeceras y dos filas vacías
        for t in tablas:
            if t["nombre"]:
                L.texto(cx0, y + 8, _recortar(t["nombre"], cw, 13, True), tam=13,
                        negrita=True, ancla="inicio")
                y += 24
            columnas = t["columnas"] or ["…"]
            ancho_col = cw / len(columnas)
            L.rect(cx0, y, cw, 30, relleno="#e2e8f0", borde=BORDE, grosor=1.2)
            L.rect(cx0, y + 30, cw, 56, relleno=BLANCO, borde=BORDE, grosor=1.2)
            L.linea([(cx0, y + 58), (cx0 + cw, y + 58)], color="#cbd5e1", grosor=1)
            for i, col in enumerate(columnas):
                if i:
                    L.linea([(cx0 + i * ancho_col, y), (cx0 + i * ancho_col, y + 86)],
                            color="#cbd5e1", grosor=1)
                tam = 11 if len(columnas) <= 6 else 9.5
                L.texto(cx0 + i * ancho_col + ancho_col / 2, y + 15,
                        _recortar(col, ancho_col - 8, tam, True), tam=tam, negrita=True)
            y += 86 + 22
        if not (campos or botones or tablas):
            L.texto(cx0, y + 8, "(Sin campos, botones ni tablas registrados)", tam=11.5,
                    color=GRIS, ancla="inicio")
            y += 34
        # nota al pie
        if nota:
            lineas = _partir("Nota: " + nota, cw - 24, 11.5)
            alto_n = len(lineas) * 15 + 16
            L.rect_redondeado(cx0, y, cw, alto_n, radio=6, relleno="#fefce8",
                              borde="#ca8a04", grosor=1)
            L.texto(cx0 + 12, y + 8, "Nota: " + nota, tam=11.5, ancla="inicio",
                    ancho=cw - 24, valign="arriba", interlinea=15 / 11.5)
            y += alto_n + 8
        return y + 16

    # dos pasadas: la primera solo mide el alto, la segunda dibuja con el marco
    fin = dibujar(Lienzo(ANCHO, 100), 100)
    L = Lienzo(ANCHO, fin + MARGEN)
    dibujar(L, fin - vy)
    return L.guardar(base)


# ============================================================================
# CLI de prueba
# ============================================================================
def generar_todo(modelo: dict, carpeta: str) -> list[str]:
    """Genera todos los diagramas que encuentre en el modelo."""
    os.makedirs(carpeta, exist_ok=True)
    rutas: list[str] = []
    if modelo.get("proceso"):
        rutas += diagrama_proceso(modelo["proceso"], os.path.join(carpeta, "proceso"))
    if modelo.get("clases"):
        rutas += diagrama_clases(modelo["clases"], modelo.get("relaciones") or [],
                                 os.path.join(carpeta, "clases"))
    usados: set = set()
    for i, f in enumerate(modelo.get("flujos") or [], 1):
        nombre = _unico(_ident(str(f.get("id") or i), str(i)), usados)
        rutas += diagrama_flujo(f, os.path.join(carpeta, f"flujo-{nombre}"))
    usados = set()
    for i, p in enumerate(modelo.get("pantallas") or [], 1):
        nombre = _unico(_ident(str(p.get("id") or i), str(i)), usados)
        rutas += diagrama_pantalla(p, os.path.join(carpeta, f"pantalla-{nombre}"))
    return rutas


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Uso: python3 diagramas.py modelo.json carpeta_salida", file=sys.stderr)
        return 2
    try:
        with open(argv[1], encoding="utf-8") as fh:
            modelo = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        print(f"No se pudo leer el modelo «{argv[1]}»: {e}", file=sys.stderr)
        return 1
    try:
        rutas = generar_todo(modelo, argv[2])
    except ValueError as e:
        print(f"Error en el modelo: {e}", file=sys.stderr)
        return 1
    for r in rutas:
        print(r)
    if not rutas:
        print("El modelo no trae «proceso», «clases», «flujos» ni «pantallas».", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
