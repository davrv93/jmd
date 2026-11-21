#!/usr/bin/env python3
"""Convierte tus transcripciones de Claude Code en tokens.csv (una fila por respuesta del modelo).

Claude Code guarda cada sesión en ~/.claude/projects/<proyecto>/<sesión>.jsonl y lo que hace
cada subagente en ~/.claude/projects/<proyecto>/<sesión>/subagents/agent-<id>.jsonl.
Este script lee esos archivos y no envía nada a internet: solo usa la biblioteca estándar.

Uso:
    python3 tokens_a_csv.py                 # últimos 30 días, todos tus proyectos
    python3 tokens_a_csv.py --dias 7        # última semana
    python3 tokens_a_csv.py --proyecto mi-dashboard

Salida: tokens.csv en la carpeta actual, y un resumen en la terminal.
Columnas: fecha, hora, proyecto, sesion, agente, tipo_agente, modelo,
          entrada, cache_escrita, cache_leida, salida
  agente = "principal" o el id del subagente; tipo_agente = el nombre del subagente (Explore, explorador…).
"""
import argparse
import csv
import datetime as dt
import json
import os
from pathlib import Path

LIMA = dt.timezone(dt.timedelta(hours=-5))
CAMPOS = ["fecha", "hora", "proyecto", "sesion", "agente", "tipo_agente", "modelo",
          "entrada", "cache_escrita", "cache_leida", "salida"]


def raiz_claude():
    base = os.environ.get("CLAUDE_CONFIG_DIR") or str(Path.home() / ".claude")
    return Path(base) / "projects"


def leer_tipo(meta):
    try:
        return json.loads(meta.read_text(encoding="utf-8")).get("agentType", "") or ""
    except (OSError, ValueError):
        return ""


def filas_de(jsonl, proyecto, sesion, agente, tipo, desde):
    # Claude Code escribe una línea por bloque de la respuesta, todas con el mismo id de mensaje,
    # y el uso va creciendo: la última línea trae la salida completa. Nos quedamos con esa.
    por_id = {}
    with open(jsonl, encoding="utf-8", errors="replace") as f:
        for linea in f:
            try:
                d = json.loads(linea)
            except ValueError:
                continue
            if d.get("type") != "assistant":
                continue
            m = d.get("message") or {}
            u = m.get("usage") or {}
            clave = m.get("id") or d.get("requestId")
            if not u or not clave:
                continue
            modelo = m.get("model", "")
            if modelo.startswith("<"):  # respuestas sintéticas del propio Claude Code
                continue
            previo = por_id.get(clave)
            if previo and (u.get("output_tokens") or 0) < previo[1]["salida"]:
                continue
            try:
                t = dt.datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00")).astimezone(LIMA)
            except (KeyError, ValueError):
                continue
            ts = previo[0] if previo else t  # la hora es la del primer bloque
            por_id[clave] = (ts, {
                "fecha": ts.date().isoformat(), "hora": ts.strftime("%H:%M"),
                "proyecto": proyecto, "sesion": sesion[:8], "agente": agente, "tipo_agente": tipo,
                "modelo": modelo,
                "entrada": u.get("input_tokens", 0) or 0,
                "cache_escrita": u.get("cache_creation_input_tokens", 0) or 0,
                "cache_leida": u.get("cache_read_input_tokens", 0) or 0,
                "salida": u.get("output_tokens", 0) or 0,
            })
    for ts, fila in por_id.values():
        if ts >= desde:
            yield fila


def nombre_proyecto(carpeta):
    # "-Users-ana-Documents-mi-dashboard" -> "mi-dashboard" (las dos últimas piezas)
    partes = [p for p in carpeta.name.split("-") if p]
    return "-".join(partes[-2:]) if partes else carpeta.name


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dias", type=int, default=30)
    ap.add_argument("--proyecto", default="", help="filtra por texto en el nombre del proyecto")
    ap.add_argument("--salida", default="tokens.csv")
    a = ap.parse_args()

    desde = dt.datetime.now(LIMA) - dt.timedelta(days=a.dias)
    raiz = raiz_claude()
    if not raiz.is_dir():
        raise SystemExit(f"No encuentro {raiz}. ¿Ya usaste Claude Code en esta computadora?")

    filas = []
    for carpeta in sorted(p for p in raiz.iterdir() if p.is_dir()):
        proyecto = nombre_proyecto(carpeta)
        if a.proyecto and a.proyecto.lower() not in carpeta.name.lower():
            continue
        for jsonl in carpeta.glob("*.jsonl"):
            sesion = jsonl.stem
            filas += filas_de(jsonl, proyecto, sesion, "principal", "", desde)
            for sub in (carpeta / sesion / "subagents").glob("agent-*.jsonl"):
                tipo = leer_tipo(sub.with_suffix(".meta.json"))
                filas += filas_de(sub, proyecto, sesion, sub.stem.replace("agent-", "")[:8], tipo, desde)

    filas.sort(key=lambda r: (r["fecha"], r["hora"]))
    with open(a.salida, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS)
        w.writeheader()
        w.writerows(filas)

    tot = lambda rs, k: sum(r[k] for r in rs)
    pri = [r for r in filas if r["agente"] == "principal"]
    sub = [r for r in filas if r["agente"] != "principal"]
    print(f"{len(filas)} respuestas en {a.salida} (últimos {a.dias} días)")
    for nombre, rs in (("principal", pri), ("subagentes", sub)):
        print(f"  {nombre:<11} entrada {tot(rs,'entrada'):>12,}  cache escrita {tot(rs,'cache_escrita'):>12,}"
              f"  cache leída {tot(rs,'cache_leida'):>14,}  salida {tot(rs,'salida'):>10,}")


if __name__ == "__main__":
    main()
