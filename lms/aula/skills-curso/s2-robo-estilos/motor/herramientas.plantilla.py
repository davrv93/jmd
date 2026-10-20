# herramientas.py — TU CÓDIGO: aquí programas a tu Robo (__NEGOCIO__).
#
# Cada función con @herramienta("palabra", ...) responde cuando el mensaje trae esa palabra
# (da igual si lleva tilde o mayúscula). Lo que devuelve es lo que Robo contesta.
# Si devuelve None, la pregunta sigue de largo a la IA.
# Guarda (Ctrl+S) y vuelve a preguntar: no hace falta reiniciar.
from backend.robo_base import herramienta, numeros, ahora_en_lima


# ============================== TU TURNO ==============================
# Reto 1 · Quita los # de las 3 líneas de abajo, pon el horario real y pregunta «¿a qué hora abren?»
#
# @herramienta("horario", "abren", "atienden")
# def horario(mensaje):
#     return "Atendemos de lunes a viernes de 9 a.m. a 6 p.m."


# Reto 2 · Una cotización: pregunta «cotiza 3» y que multiplique por tu precio.
#
# PRECIO = 25
#
# @herramienta("cotiza", "cotizacion")
# def cotizar(mensaje):
#     n = numeros(mensaje)
#     cantidad = int(n[0]) if n else 1
#     total = cantidad * PRECIO
#     return f"{cantidad} x S/ {PRECIO} = S/ {total}"


# Reto 3 · Tú decides: una herramienta nueva para tu negocio (delivery, stock, reservas...).


# ============================== EJEMPLOS ==============================
@herramienta("que hora es", "dime la hora")
def hora_lima(mensaje):
    return f"En Lima son las {ahora_en_lima():%H:%M}."


@herramienta("descuento")
def descuento(mensaje):
    n = numeros(mensaje)
    if len(n) < 2:
        return "Dime el precio y el porcentaje. Por ejemplo: descuento de 20% a 120"
    precio, porcentaje = max(n), min(n)
    final = precio * (1 - porcentaje / 100)
    return f"S/ {precio:.2f} con {porcentaje:g}% de descuento queda en S/ {final:.2f}."
