# -*- coding: utf-8 -*-
"""Construye el curso «Excel + IA para Contabilidad, Tributación y Tesorería» desde los datos de contenido_m*.py.

Escribe: course.yaml, lessons/ex-NN-*.md y live/ex-NN/{01-contexto,02-juego,03-demo,04-caso,05-cierre}/escena.{yaml,html}.
Uso:  python3 _fuente/construir.py
No toca materials/ (los .xlsx los genera el generador del instructor, fuera del repo).
"""
import html
import importlib
import json
import os
import shutil
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CURSO = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)
EMPRESAS = json.load(open(os.path.join(AQUI, "empresas.json"), encoding="utf-8"))
CURSO_ID = "excel-ia-contabilidad"

MODULOS = [
    ("m1", "Módulo I · Registros contables y tributación", [1, 2, 3, 4]),
    ("m2", "Módulo II · Gestión laboral", [5, 6, 7]),
    ("m3", "Módulo III · Inventarios y activos", [8, 9, 10]),
    ("m4", "Módulo IV · Tesorería y gestión financiera", [11, 12, 13, 14, 15]),
    ("m5", "Módulo V · Estados financieros, auditoría y reportes", [16, 17, 18, 19, 20]),
]


def modulo_de(n):
    for mid, titulo, ses in MODULOS:
        if n in ses:
            return mid, titulo
    raise KeyError(n)


def sesiones():
    out = {}
    for m in ("contenido_m1", "contenido_m2", "contenido_m3", "contenido_m4", "contenido_m5"):
        try:
            mod = importlib.import_module(m)
        except ImportError:
            continue
        for s in mod.SESIONES:
            out[s["n"]] = s
    return out


def yaml_str(s):
    return json.dumps(s, ensure_ascii=False)


PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo_html}</title>
<!--
  Escena del modo LIVE · Excel + IA para Contabilidad (sesión {leccion}, {tipo}). Generada por _fuente/construir.py:
  edita los datos en _fuente/contenido_m*.py y vuelve a construir. Sin recursos externos; el motor está en
  live/_comun (ex.js dibuja la escena, juegos.js los minijuegos, dsh.js el botón de DeepSeek Harness).
  El movimiento se apaga con prefers-reduced-motion (ver escena.css y ex.css).
-->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/ex.css">
<style>@media (prefers-reduced-motion: reduce) {{ .a-in {{ animation: none !important; }} }}</style>
</head>
<body>
<div id="esc"></div>
{extra}<script type="application/json" id="ex-datos">{datos}</script>
<script src="../../comun/ex.js"></script>
{scripts}</body>
</html>
"""


def escribir_escena(leccion, carpeta, yml, datos, extra="", juegos=False, dsh=False):
    d = os.path.join(CURSO, "live", leccion, carpeta)
    os.makedirs(d, exist_ok=True)
    lineas = [f"id: {carpeta}"]
    for k in ("titulo", "fase", "paso", "duracion_min", "lo_logre", "evidencia", "umbral_pct", "compuerta", "dsh"):
        if k not in yml:
            continue
        v = yml[k]
        if isinstance(v, bool):
            v = "true" if v else "false"
        elif isinstance(v, str) and k == "titulo":
            v = yaml_str(v)
        lineas.append(f"{k}: {v}")
    open(os.path.join(d, "escena.yaml"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")
    scripts = ""
    if juegos:
        scripts += '<script src="../../comun/juegos.js"></script>\n'
    if dsh:
        scripts += '<script src="../../comun/dsh.js"></script>\n'
    js = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
    titulo_html = html.escape("Escena · " + yml["titulo"])
    open(os.path.join(d, "escena.html"), "w", encoding="utf-8").write(
        PLANTILLA.format(titulo_html=titulo_html, leccion=leccion, tipo=datos["tipo"], datos=js, scripts=scripts, extra=extra))


def construir_sesion(s):
    n = s["n"]
    lec = f"ex-{n:02d}"
    mid, mtit = modulo_de(n)
    base = {"leccion": lec, "sesion": n, "tema": s["titulo"], "modulo": mtit.split(" · ")[0]}
    destino = os.path.join(CURSO, "live", lec)
    if os.path.isdir(destino):
        shutil.rmtree(destino)
    c = s["contexto"]
    escribir_escena(lec, "01-contexto", {"titulo": c["corto"], "fase": "experiencia", "paso": "contexto", "duracion_min": 7, "lo_logre": False,
                                         "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "ninguna"},
                    dict(base, escena="01-contexto", tipo="contexto", fase="ec", bloque=0, titulo=c["titulo"], idea=c["idea"], hoy=c.get("hoy"), diagrama=c["diagrama"]))
    j1 = dict(s["juego1"], id=f"{lec}-j1")
    escribir_escena(lec, "02-juego", {"titulo": "Juego · " + j1["titulo"], "fase": "reflexion", "paso": "juego", "duracion_min": 3, "lo_logre": True,
                                      "evidencia": "automatica", "umbral_pct": 70, "compuerta": "evidencia"},
                    dict(base, escena="02-juego", tipo="juego", fase="or", bloque=0, titulo="Juego de calentamiento: __" + j1["titulo"] + "__",
                         intro=s.get("intro1"), juego=j1), juegos=True)
    d = s["demo"]
    escribir_escena(lec, "03-demo", {"titulo": d["corto"], "fase": "conceptualizacion", "paso": "demo", "duracion_min": 15, "lo_logre": False,
                                     "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "ninguna"},
                    dict(base, escena="03-demo", tipo="demo", fase="ca", bloque=1, titulo=d["titulo"], pasos=d["pasos"]))
    k = s["caso"]
    emp = [{x: e[x] for x in ("id", "slug", "corto", "razon", "ruc", "regimen", "rubro", "icono", "trab")} for e in EMPRESAS]
    marcador = f'<div data-jmd-dsh data-prompt="{html.escape(k["prompt"], quote=True)}"></div>\n'
    escribir_escena(lec, "04-caso", {"titulo": "Caso práctico · " + k["corto"], "fase": "experimentacion", "paso": "caso", "duracion_min": 30, "lo_logre": True,
                                     "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "lo_logre", "dsh": True},
                    dict(base, escena="04-caso", tipo="caso", fase="ea", bloque=2, titulo=k["titulo"], tareas=k["tareas"], consejo=k.get("consejo"),
                         empresas=emp, curso=CURSO_ID), extra=marcador, dsh=True)
    z = s["cierre"]
    j2 = dict(s["juego2"], id=f"{lec}-j2")
    escribir_escena(lec, "05-cierre", {"titulo": "Cierre y juego · " + j2["titulo"], "fase": "reflexion", "paso": "cierre", "duracion_min": 5, "lo_logre": True,
                                       "evidencia": "automatica", "umbral_pct": 70, "compuerta": "evidencia"},
                    dict(base, escena="05-cierre", tipo="cierre", fase="or", bloque=3, titulo=z["titulo"], checklist=z["checklist"], siguiente=z.get("siguiente"), juego=j2),
                    juegos=True)
    escribir_leccion(s, lec, mid)


def escribir_leccion(s, lec, mid):
    n = s["n"]
    obj = [{"id": f"{lec}-o{i + 1}", "title": t} for i, t in enumerate(s["objetivos"])]
    mats = [{"id": f"{lec}-empresas", "title": "Las 10 empresas ficticias del curso (fichas)", "kind": "doc", "file": "materials/empresas-ficticias.md",
             "objective_ids": [obj[0]["id"]]}]
    if s.get("guia"):
        mats.append({"id": f"{lec}-guia", "title": s["guia"][0], "kind": "doc", "file": s["guia"][1], "objective_ids": [o["id"] for o in obj]})
    gv = f"materials/guia-visual-{mid}"
    if os.path.isdir(os.path.join(CURSO, gv)):
        mats.append({"id": f"{lec}-guia-visual", "title": "Guía visual del módulo (la idea y la demo de cada sesión)", "kind": "slides", "slides_dir": gv,
                     "objective_ids": [o["id"] for o in obj]})
    for e in EMPRESAS:
        f = f"materials/casos/{lec}/{lec}-{e['id']}-{e['slug']}.xlsx"
        if os.path.exists(os.path.join(CURSO, f)):
            mats.append({"id": f"{lec}-{e['id'].lower()}", "title": f"Caso práctico · {e['id']} {e['corto']} (Excel)", "kind": "file", "file": f,
                         "objective_ids": [o["id"] for o in obj]})
    fm = ["---", f"id: {lec}", f"title: {yaml_str(f'Sesión {n} · ' + s['titulo'])}", "published: true", "objectives:"]
    for o in obj:
        fm += [f"  - id: {o['id']}", f"    title: {yaml_str(o['title'])}"]
    fm += ["recording:", '  url: ""', '  passcode: ""', "materials:"]
    for m in mats:
        fm += [f"  - id: {m['id']}", f"    title: {yaml_str(m['title'])}", f"    kind: {m['kind']}",
               f"    slides_dir: {m['slides_dir']}" if m.get("slides_dir") else f"    file: {m['file']}",
               f"    objective_ids: [{', '.join(m['objective_ids'])}]"]
    ciclo = [
        ("contexto", "La idea del día", "lms", "experiencia", "Escena 1: la idea en tres frases y un diagrama.", "Puedes decir con tus palabras qué vas a construir"),
        ("juego", "Juego de calentamiento", "lms", "reflexion", "Escena 2: " + s["juego1"]["titulo"] + ".", "Terminaste el juego"),
        ("demo", "Demostración guiada", "lms", "conceptualizacion", "Escena 3: el instructor hace el ejercicio paso a paso; tú miras y preguntas.", "Viste todos los pasos de la demo"),
        ("caso", "Caso práctico con tu empresa", "lms", "experimentacion", "Escena 4: descarga el Excel de tu empresa, resuélvelo y revisa con DeepSeek Harness.", "Tu Excel tiene las celdas amarillas completas y los totales cuadran"),
        ("cierre", "Cierre y repaso", "lms", "reflexion", "Escena 5: lista de comprobación y juego de repaso: " + s["juego2"]["titulo"] + ".", "Marcaste la lista y terminaste el juego"),
    ]
    fm.append("cycle:")
    for cid, tit, tool, ph, desc, chk in ciclo:
        fm += [f"  - id: {cid}", f"    title: {yaml_str(tit)}", f"    tool: {tool}", f"    phase: {ph}", f"    description: {yaml_str(desc)}", f"    check: {yaml_str(chk)}"]
    fm.append("---")
    k = s["caso"]
    cuerpo = [
        "", f"## {s['titulo']}", "", s["resumen"], "",
        "| Momento | Minutos | Qué haces |", "|---|---|---|",
        f"| Introducción | 10 | La idea del día y el juego «{s['juego1']['titulo']}» |",
        f"| Demostración guiada | 15 | {s['demo']['corto']} |",
        f"| Caso práctico | 30 | {k['corto']} con el Excel de tu empresa |",
        f"| Cierre | 5 | Lista de comprobación y juego «{s['juego2']['titulo']}» |", "",
        "### El caso práctico", "",
    ] + [f"{i + 1}. {t.replace('**', '**')}" for i, t in enumerate(k["tareas"])] + [
        "", "### Pide ayuda a la IA (DeepSeek Harness)", "", "> " + k["prompt"], "",
        "La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.", "",
    ]
    if s.get("nota_legal"):
        cuerpo += [f"*{s['nota_legal']}*", ""]
    cuerpo += ["Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 20 sesiones.", ""]
    nombre = f"{lec}-{s['slug']}.md"
    for viejo in os.listdir(os.path.join(CURSO, "lessons")):
        if viejo.startswith(lec + "-") and viejo != nombre:
            os.remove(os.path.join(CURSO, "lessons", viejo))
    open(os.path.join(CURSO, "lessons", nombre), "w", encoding="utf-8").write("\n".join(fm + cuerpo))


def escribir_curso(hechas):
    lineas = [
        f"id: {CURSO_ID}",
        "title: Excel + IA para Contabilidad, Tributación y Tesorería",
        "description: >",
        "  Programa corporativo de 20 sesiones prácticas de 60 minutos (10 de introducción, 15 de demostración,",
        "  30 de caso práctico y 5 de cierre). Cada participante elige una de 10 empresas peruanas ficticias y con ella",
        "  arma, sesión a sesión, sus registros de ventas y compras, la liquidación del IGV, la renta, la planilla, los",
        "  beneficios laborales, el kardex, la depreciación, la tesorería, los estados financieros, la auditoría y un",
        "  dashboard. La IA (DeepSeek Harness) es el ayudante: revisa, explica fórmulas y redacta el informe.",
        "cohorts: [atelecom-1]",
        "proyecto_final: >",
        "  Un libro de Excel de tu empresa con los 20 casos resueltos: registros, liquidaciones, planilla, beneficios,",
        "  kardex, depreciación, tesorería, estados financieros, auditoría y un dashboard con KPI y segmentadores.",
        "requisitos:",
        '  - "Excel 2021 o Microsoft 365 (BUSCARX necesita una de esas versiones; en otras se usa BUSCARV)"',
        '  - "Manejo básico de Excel: abrir un archivo, escribir en una celda y guardar"',
        '  - "Una cuenta en jmd-learn.online (inscripción del grupo atelecom-1)"',
        'dedicacion: "20 sesiones en vivo de 60 minutos · 20 horas · 80 % práctica"',
        "",
        "modules:",
    ]
    for mid, titulo, ses in MODULOS:
        ids = [f"ex-{n:02d}" for n in ses if n in hechas]
        if not ids:
            continue
        lineas += [f"  - id: {mid}", f"    title: {yaml_str(titulo)}", f"    lessons: [{', '.join(ids)}]"]
    open(os.path.join(CURSO, "course.yaml"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")


def main():
    ss = sesiones()
    for n in sorted(ss):
        construir_sesion(ss[n])
    escribir_curso(set(ss))
    print(f"{len(ss)} sesiones construidas: {', '.join(f'ex-{n:02d}' for n in sorted(ss))}")


if __name__ == "__main__":
    main()
