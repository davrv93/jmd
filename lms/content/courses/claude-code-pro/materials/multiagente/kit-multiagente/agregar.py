#!/usr/bin/env python3
"""Pre-agrega tokens.csv para el dashboard. Lo determinista lo hace este script, no el modelo.

    python3 agregar.py                     # escribe datos.json (unas pocas decenas de filas)
    python3 agregar.py --resumen           # imprime los KPI: el revisor los compara con el dashboard
    python3 agregar.py --html dashboard.html
        # mete datos.json dentro de <script id="datos" type="application/json"></script>
        # para que el modelo nunca tenga que escribir los datos (escribir es lo caro)

Solo biblioteca estándar. No envía nada a internet.
"""
import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

NUM = ("entrada", "cache_escrita", "cache_leida", "salida")


def leer(ruta):
    with open(ruta, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            for k in NUM:
                r[k] = int(r[k] or 0)
            yield r


def agregar(filas):
    dias = defaultdict(lambda: {"principal": 0, "subagentes": 0, "cache_leida": 0})
    modelos = defaultdict(int)
    ses = {}
    for r in filas:
        sub = r["agente"] != "principal"
        d = dias[(r["fecha"], r["proyecto"])]
        d["subagentes" if sub else "principal"] += r["salida"]
        d["cache_leida"] += r["cache_leida"]
        modelos[(r["proyecto"], r["modelo"])] += r["salida"]
        s = ses.setdefault(r["sesion"], {"sesion": r["sesion"], "proyecto": r["proyecto"], "inicio": r["fecha"],
                                         "fin": r["fecha"], "respuestas": 0, "salida": 0, "salida_subagentes": 0,
                                         "cache_leida": 0, "subagentes": set()})
        s["inicio"], s["fin"] = min(s["inicio"], r["fecha"]), max(s["fin"], r["fecha"])
        s["respuestas"] += 1
        s["salida"] += r["salida"]
        s["cache_leida"] += r["cache_leida"]
        if sub:
            s["salida_subagentes"] += r["salida"]
            s["subagentes"].add(r["agente"])
    for s in ses.values():
        s["subagentes"] = len(s["subagentes"])
    return {
        "columnas": {
            "dias": "fecha, proyecto, principal, subagentes, cache_leida (tokens de salida por día)",
            "modelos": "proyecto, modelo, salida",
            "sesiones": "sesion, proyecto, inicio, fin, respuestas, salida, salida_subagentes, cache_leida, subagentes",
        },
        "proyectos": sorted({p for _, p in dias}),
        "dias": [{"fecha": f, "proyecto": p, **v} for (f, p), v in sorted(dias.items())],
        "modelos": [{"proyecto": p, "modelo": m, "salida": v} for (p, m), v in sorted(modelos.items())],
        "sesiones": sorted(ses.values(), key=lambda s: -s["salida"]),
    }


def resumen(d):
    sal = sum(x["principal"] + x["subagentes"] for x in d["dias"])
    sub = sum(x["subagentes"] for x in d["dias"])
    cache = sum(x["cache_leida"] for x in d["dias"])
    print(f"tokens de salida  {sal:,}")
    print(f"cache leída       {cache:,}")
    print(f"% subagentes      {100 * sub / sal:.1f} %" if sal else "% subagentes      —")
    print(f"días activos      {len({x['fecha'] for x in d['dias']})}")
    print(f"sesiones          {len(d['sesiones'])}  ·  proyectos {len(d['proyectos'])}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="tokens.csv")
    ap.add_argument("--resumen", action="store_true")
    ap.add_argument("--html", help="dashboard al que se le inyectan los datos")
    a = ap.parse_args()

    d = agregar(leer(a.csv))
    Path("datos.json").write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    if a.resumen:
        resumen(d)
    if a.html:
        p = Path(a.html)
        html = p.read_text(encoding="utf-8")
        patron = re.compile(r'(<script id="datos" type="application/json">)(.*?)(</script>)', re.S)
        if not patron.search(html):
            raise SystemExit(f'{a.html} no tiene <script id="datos" type="application/json"></script>')
        datos = json.dumps(d, ensure_ascii=False).replace("</", "<\\/")
        p.write_text(patron.sub(lambda m: m.group(1) + datos + m.group(3), html, count=1), encoding="utf-8")
        print(f"datos inyectados en {a.html}")
    if not (a.resumen or a.html):
        print(f"datos.json: {len(d['dias'])} días×proyecto, {len(d['modelos'])} modelos, {len(d['sesiones'])} sesiones")


if __name__ == "__main__":
    main()
