#!/usr/bin/env python3
"""Emite en Accredible las insignias exportadas por el LMS.

Lee el CSV generico del LMS (export.csv: codigo, nombre, apellido, email, insignia,
emitido_en, url_verificacion, url_evidencia, url_insignia_png) y crea una credencial
por fila en un grupo de Accredible. El grupo (course) se crea si no existe.

Uso:
  export ACCREDIBLE_API_KEY=...            # clave de la cuenta emisora (Accredible > Settings > API)
  python3 lms/scripts/accredible.py insignias-clase1.csv \
      --grupo "Clase 1 · Instalar las herramientas y entender qué hay detrás" \
      --curso "Programación agéntica" \
      --descripcion "Asistió a la clase 1 y completó los pasos de su ciclo de aprendizaje." \
      --enlace https://jmd-learn.online/courses/programacion-agentica/ \
      [--grupo-id 12345] [--base https://api.accredible.com/v1/] [--simular]

Endpoints y cuerpo tomados del SDK oficial accredible/acms-php-api:
  POST {base}issuer/groups   {"group": {name, course_name, course_description, course_link}}
  POST {base}credentials     {"credential": {group_id, recipient: {name, email}, issued_on, custom_attributes}}
Cabecera: Authorization: Token token="<API_KEY>". issued_on en formato AAAA-MM-DD.
El diseño de la insignia (PNG) se asigna al grupo desde el panel de Accredible, no por este guion.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request


def llamar(base: str, ruta: str, clave: str, cuerpo: dict | None = None, metodo: str = "POST") -> dict:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(base.rstrip("/") + "/" + ruta.lstrip("/"), data=datos, method=metodo)
    req.add_header("Authorization", f'Token token="{clave}"')
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        detalle = e.read().decode(errors="replace")[:300]
        raise SystemExit(f"Accredible respondio {e.code} en {ruta}: {detalle}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("csv", help="export.csv del LMS (una clase o el curso)")
    p.add_argument("--grupo", required=True, help="nombre del grupo en Accredible (uno por clase)")
    p.add_argument("--curso", default="Programación agéntica")
    p.add_argument("--descripcion", default="")
    p.add_argument("--enlace", default="")
    p.add_argument("--grupo-id", type=int, default=0, help="usar un grupo existente en vez de crearlo")
    p.add_argument("--base", default=os.environ.get("ACCREDIBLE_BASE", "https://api.accredible.com/v1/"))
    p.add_argument("--simular", action="store_true", help="no llama a la API; muestra lo que enviaria")
    a = p.parse_args()

    clave = os.environ.get("ACCREDIBLE_API_KEY", "")
    if not clave and not a.simular:
        print("Falta ACCREDIBLE_API_KEY en el entorno.", file=sys.stderr)
        return 2

    with open(a.csv, encoding="utf-8-sig", newline="") as f:
        filas = list(csv.DictReader(f))
    if not filas:
        print("El CSV no tiene filas.", file=sys.stderr)
        return 2

    grupo_id = a.grupo_id
    if not grupo_id:
        cuerpo = {"group": {"name": a.grupo, "course_name": a.curso,
                            "course_description": a.descripcion or None, "course_link": a.enlace or None}}
        if a.simular:
            print("POST issuer/groups", json.dumps(cuerpo, ensure_ascii=False))
            grupo_id = 0
        else:
            resp = llamar(a.base, "issuer/groups", clave, cuerpo)
            grupo_id = int(resp.get("group", {}).get("id") or 0)
            if not grupo_id:
                print("No se pudo leer el id del grupo:", json.dumps(resp)[:300], file=sys.stderr)
                return 1
            print("grupo creado:", grupo_id, a.grupo)

    ok = 0
    for fila in filas:
        nombre = (fila.get("nombre", "") + " " + fila.get("apellido", "")).strip()
        cred = {"credential": {
            "group_id": grupo_id,
            "recipient": {"name": nombre, "email": fila["email"]},
            "issued_on": fila.get("emitido_en", "")[:10],
            "custom_attributes": {
                "codigo_lms": fila.get("codigo", ""),
                "verificacion_lms": fila.get("url_verificacion", ""),
                "insignia_png": fila.get("url_insignia_png", ""),
            },
        }}
        if a.simular:
            print("POST credentials", json.dumps(cred, ensure_ascii=False))
            ok += 1
            continue
        resp = llamar(a.base, "credentials", clave, cred)
        cid = resp.get("credential", {}).get("id")
        url = resp.get("credential", {}).get("url", "")
        print(f"ok  {fila.get('codigo','')}  {nombre}  -> accredible {cid} {url}")
        ok += 1
        time.sleep(0.3)
    print(f"{ok} de {len(filas)} credenciales {'simuladas' if a.simular else 'emitidas'} en el grupo {grupo_id or '(nuevo)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
