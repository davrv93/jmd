#!/usr/bin/env python3
"""Empuja al sorteo los inscritos del cohort del LMS mientras la lista está abierta.

Corre en el servidor como root (lo lanza el timer sorteo-g5-sync cada minuto).
Lee una COPIA de la base del LMS hecha con la API de respaldo de SQLite sobre
una conexión de solo lectura: nunca escribe en la base del LMS. Solo envía al
sorteo el id interno y el nombre (nada de correos).
"""
import json, os, sqlite3, sys, tempfile, unicodedata, urllib.request

LMS_DB = os.environ.get("LMS_DB", "/var/lib/docker/volumes/jmd_lms_data/_data/lms.db")
COHORTES = [c.strip() for c in os.environ.get("COHORTES", "grupo-5").split(",") if c.strip()]
SORTEO = os.environ.get("SORTEO_URL", "http://127.0.0.1:18550")
CORREOS_FUERA = {"prueba.tecnica.g5@jmd-learn.online"}
NOMBRES_FUERA = {"david roncal"}
COHORTES_FUERA = {"cuenta-reemplazada", "prueba-descartada"}


def normal(s):
    s = unicodedata.normalize("NFD", " ".join((s or "").split()).lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def clave():
    env = os.environ.get("SORTEO_ENV", os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    for linea in open(env):
        if linea.startswith("SORTEO_CLAVE="):
            return linea.split("=", 1)[1].strip()
    sys.exit("sin SORTEO_CLAVE")


def personas():
    with tempfile.TemporaryDirectory() as tmp:
        copia = os.path.join(tmp, "lms.db")
        src = sqlite3.connect(f"file:{LMS_DB}?mode=ro", uri=True)
        dst = sqlite3.connect(copia)
        src.backup(dst)
        src.close()
        out = []
        for uid, correo, nombre, roles, cohortes in dst.execute("SELECT id, email, name, roles, cohorts FROM users"):
            roles, cohortes = set(json.loads(roles or "[]")), set(json.loads(cohortes or "[]"))
            correo = (correo or "").lower()
            if not cohortes & set(COHORTES) or cohortes & COHORTES_FUERA:
                continue
            if roles & {"admin", "instructor"} or correo in CORREOS_FUERA or "davrv93" in correo:
                continue
            if normal(nombre) in NOMBRES_FUERA or "(borrar)" in (nombre or "").lower():
                continue
            out.append({"id": uid, "nombre": " ".join(nombre.split())})
        dst.close()
        return out


def main():
    estado = json.load(urllib.request.urlopen(SORTEO + "/api/estado", timeout=5))
    if estado.get("fase") != "abierto":
        return
    ps = personas()
    req = urllib.request.Request(SORTEO + "/api/admin/lms", data=json.dumps({"personas": ps}).encode(),
                                 headers={"Content-Type": "application/json", "X-Clave": clave()}, method="POST")
    r = json.load(urllib.request.urlopen(req, timeout=5))
    print(f"{len(ps)} del LMS ({','.join(COHORTES)}); en la lista: {r.get('total')}")


if __name__ == "__main__":
    main()
