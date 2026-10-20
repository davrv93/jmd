"""robo_base.py — la plomería de las herramientas. La escribe el motor: no la edites.

Tu código va en herramientas.py.
"""
import re
import unicodedata
from datetime import datetime, timedelta, timezone


def _limpio(texto):
    sin_tildes = unicodedata.normalize("NFD", str(texto).lower())
    return "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")


def herramienta(*palabras):
    """Marca una función como herramienta: responde si el mensaje trae una de estas palabras."""
    def marcar(funcion):
        funcion._palabras = [_limpio(p) for p in palabras]
        return funcion
    return marcar


def numeros(texto):
    """Saca los números de un mensaje: 'precio 120 con 15%' -> [120.0, 15.0]."""
    return [float(n.replace(",", ".")) for n in re.findall(r"\d+(?:[.,]\d+)?", texto)]


def ahora_en_lima():
    return datetime.now(timezone(timedelta(hours=-5)))


def responder(modulo, mensaje):
    """Busca en tu módulo la herramienta que corresponde al mensaje y la corre.

    Gana la palabra que coincide más larga: «horario» le gana a «hora».
    """
    m = _limpio(mensaje)
    candidatas = []
    for funcion in vars(modulo).values():
        palabras = getattr(funcion, "_palabras", None)
        if callable(funcion) and palabras:
            largo = max((len(p) for p in palabras if p in m), default=0)
            if largo:
                candidatas.append((largo, funcion))
    for _, funcion in sorted(candidatas, key=lambda c: -c[0]):
        respuesta = funcion(mensaje)
        if respuesta:
            return (funcion.__name__, respuesta)
    return None
