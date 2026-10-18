"""Quién llama desde fuera: la ruta pública /aula-nube/ del nginx (kit robo-local-nube).

nginx pone «X-Aula-Nube: 1» en todo lo que entra por esa ruta y pisa lo que mande el cliente, así que la
cabecera no se puede falsificar desde internet. Esas peticiones traen el token personal del alumno (jg_…,
el que emite el gateway con POST /v1/auth/exchange), que se valida contra el gateway (GET /v1/auth/me) y se
guarda en caché unos minutos por su hash (el token nunca se escribe en el log). Las peticiones de las aulas
del LMS (red interna, sin la cabecera) siguen con el token de la clase, como antes.

Este archivo está repetido en lms/imagen/nube.py: los dos servicios se construyen por separado. Si cambias
uno, copia el otro (las pruebas comprueban que son iguales).
"""

from __future__ import annotations

import hashlib
import os
import threading
import time

import httpx
from fastapi import HTTPException

GATEWAY = os.environ.get("NUBE_GATEWAY_URL", "http://ai-orchestrator:4000").rstrip("/")
CACHE_S = int(os.environ.get("NUBE_CACHE_S", "180"))

_lock = threading.Lock()
_cache: dict[str, tuple[float, str]] = {}  # hash del token -> (vence, sub)
_uso: dict[tuple[str, str, str], int] = {}  # (sub, qué, día UTC) -> veces


def es_externo(cabecera: str | None) -> bool:
    return (cabecera or "").strip() == "1"


def _error(estado: int, codigo: str, mensaje: str) -> HTTPException:
    return HTTPException(estado, {"codigo": codigo, "mensaje": mensaje})


def alumno(authorization: str) -> str:
    """El `sub` del alumno dueño del token, o una HTTPException clara (401, 403 o 503)."""
    token = authorization[7:].strip() if authorization[:7].lower() == "bearer " else ""
    if not token:
        raise _error(401, "sin_token", "Falta tu token del curso. Vuelve a correr iniciar (sh iniciar.sh o iniciar.bat).")
    h = hashlib.sha256(token.encode()).hexdigest()
    ahora = time.time()
    with _lock:
        c = _cache.get(h)
        if c and c[0] > ahora:
            return c[1]
    try:
        r = httpx.get(f"{GATEWAY}/v1/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=6.0)
    except httpx.HTTPError:
        raise _error(503, "gateway_caido", "No pude comprobar tu token: el gateway del curso no responde. Prueba en un minuto.")
    if r.status_code == 401:
        raise _error(401, "token_invalido", "Tu token del curso venció o fue revocado. Pide otro: sh iniciar.sh --token (o iniciar.bat --token).")
    if r.status_code != 200:
        raise _error(503, "gateway_caido", f"El gateway del curso respondió {r.status_code} al comprobar tu token.")
    sub = (r.json() or {}).get("sub")
    if not sub:
        raise _error(403, "sin_cuenta", "Ese token no es de una cuenta del curso. Entra con tu cuenta: sh iniciar.sh --token.")
    with _lock:
        if len(_cache) > 5000:
            _cache.clear()
        _cache[h] = (ahora + CACHE_S, str(sub))
    return str(sub)


def contar(sub: str, que: str, tope: int) -> int:
    """Suma un uso de hoy (UTC) para el alumno; 429 si ya llegó a su tope (0 = sin tope)."""
    dia = time.strftime("%Y-%m-%d", time.gmtime())
    with _lock:
        for k in [k for k in _uso if k[2] != dia]:
            del _uso[k]
        n = _uso.get((sub, que, dia), 0)
        if tope and n >= tope:
            raise _error(429, "cupo_alumno", f"Llegaste a tu tope de hoy ({tope}) para {que}. Se reinicia a las 00:00 UTC (19:00 en Lima).")
        _uso[(sub, que, dia)] = n + 1
        return n + 1
