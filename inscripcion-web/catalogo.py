#!/usr/bin/env python3
"""Arma el «catalogo» de config.json: los grupos que se pueden canjear con un código.

  ~/Downloads/OpenMontage/.venv/bin/python catalogo.py        (necesita PyYAML)

- Los cursos en modalidad web de config.json («cursos»), sin fecha de fin.
- Los grupos en vivo que anuncia /cursos (lista CURSOS de ~/Documents/jmd/cursos-web/armar.py) cuyo curso aún no
  termina. «hasta» es el fin de su última sesión: pasado ese momento, el servidor deja de aceptarlo solo.
- De cada curso se toma su grupo propio: el que no comparte con ningún otro curso del LMS (como el pase libre),
  para no abrir de rebote otros cursos.
Imprime lo que deja fuera y por qué.
"""
import datetime as dt
import json
import pathlib
import re

import yaml

AQUI = pathlib.Path(__file__).resolve().parent
LMS = pathlib.Path.home() / "Documents/jmd/lms/content/courses"
ARMAR = pathlib.Path.home() / "Documents/jmd/cursos-web/armar.py"
LIMA = dt.timezone(dt.timedelta(hours=-5))


def fm_de(f):
    m = re.match(r"---\n(.*?)\n---", f.read_text(), re.S)
    return yaml.safe_load(m.group(1)) if m else None


def fin_del_curso(cid, y):
    fin = None
    minutos = (y.get("agenda") or {}).get("minutos")
    for f in (LMS / cid / "lessons").glob("*.md"):
        fm = fm_de(f)
        if not fm or not fm.get("starts_at") or fm.get("published") is False:
            continue
        ini = fm["starts_at"]
        ini = dt.datetime.fromisoformat(ini) if isinstance(ini, str) else ini
        if ini.tzinfo is None:
            ini = ini.replace(tzinfo=LIMA)
        f_ = ini + dt.timedelta(minutes=minutos or fm.get("duration") or 90)
        fin = f_ if fin is None or f_ > fin else fin
    return fin


def main():
    cfg_p = AQUI / "config.json"
    cfg = json.loads(cfg_p.read_text())
    cursos_de = {}  # cohorte → cursos que la usan
    yamls = {}
    for y_p in LMS.glob("*/course.yaml"):
        y = yaml.safe_load(y_p.read_text())
        yamls[y_p.parent.name] = y
        for c in y.get("cohorts") or []:
            cursos_de.setdefault(c, set()).add(y_p.parent.name)
    ahora = dt.datetime.now(LIMA)
    cat = []
    for c in cfg["cursos"]:
        cat.append({"cohorte": c["cohorte"], "titulo": c["titulo"], "tipo": "web", "hasta": ""})
    src = ARMAR.read_text()
    ids = [g for m in re.findall(r"grupos=\[(.*?)\]", src) for g in re.findall(r'"([^"]+)"', m)]
    for cid in ids:
        y = yamls.get(cid)
        if not y:
            print(f"fuera: {cid} (no está en el LMS)")
            continue
        propias = [c for c in (y.get("cohorts") or []) if cursos_de.get(c) == {cid}]
        if not propias:
            print(f"fuera: {cid} (sin grupo propio: {y.get('cohorts')})")
            continue
        fin = fin_del_curso(cid, y)
        if fin is None:
            print(f"fuera: {cid} (sin sesiones con fecha)")
            continue
        if fin <= ahora:
            print(f"fuera: {cid} (terminó el {fin:%d-%m-%Y})")
            continue
        ag = y.get("agenda") or {}
        titulo = re.sub(r"\s*\(modalidad web\)\s*$", "", str(y.get("title", cid))).strip()
        if ag.get("grupo") and "grupo" not in titulo.lower():
            titulo += f" · {ag['grupo']}"
        for c in propias:
            if any(x["cohorte"] == c for x in cat):
                continue
            cat.append({"cohorte": c, "titulo": titulo, "tipo": "vivo", "hasta": fin.isoformat()})
    cfg["catalogo"] = cat
    cfg_p.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")
    print(f"catálogo: {len(cat)} grupos ({sum(1 for x in cat if x['tipo'] == 'web')} web, "
          f"{sum(1 for x in cat if x['tipo'] == 'vivo')} en vivo) → config.json")
    for x in cat:
        print(f"  {x['cohorte']:38s} {x['tipo']:5s} {x['hasta'][:16]:16s} {x['titulo']}")


if __name__ == "__main__":
    main()
