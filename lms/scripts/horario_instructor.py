#!/usr/bin/env python3
"""Horario del instructor y cruces pendientes, a partir del contenido del LMS.

Lee lms/content/courses/*/course.yaml y lessons/*.md (starts_at, duration o agenda.minutos)
y escribe docs/HORARIO_INSTRUCTOR.md con:
  - las clases que faltan, día por día;
  - un resumen por curso con su enlace de inscripción (si el grupo está en LMS_INSCRIPCION);
  - los cruces: clases que se pisan, clases seguidas sin 15 minutos de margen,
    clases en la franja que el instructor no puede (lunes a jueves de 6 a 9 p. m.)
    y en el sábado bíblico (viernes desde 6 p. m. hasta el sábado 6:30 p. m.).

Uso (desde ~/Documents/jmd):
  LMS_INSCRIPCION="$(ssh -i ~/Downloads/curdilmer.pem ubuntu@3.151.56.55 \
      "grep -o 'LMS_INSCRIPCION=.*' ~/jmd/.env | cut -d= -f2")" \
  python3 lms/scripts/horario_instructor.py [AAAA-MM-DD]

La fecha opcional es «desde cuándo» (por defecto, hoy en Lima). Solo biblioteca estándar.
"""
import datetime as D
import glob
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CURSOS = os.path.join(RAIZ, "lms", "content", "courses")
SALIDA = os.path.join(RAIZ, "docs", "HORARIO_INSTRUCTOR.md")
LIMA = D.timezone(D.timedelta(hours=-5))
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]
MARGEN = D.timedelta(minutes=15)

# Cursos que dicta otra persona: salen en el horario, pero no cuentan para los cruces del instructor.
OTRO_INSTRUCTOR = {"python-api"}

# Datos que no están en el LMS y que el dueño dio por otro lado. Se listan como cruces pendientes.
AVISOS_EXTERNOS = [
    "Chatbot avanzado (Grupo 2): el LMS lo tiene los domingos a las 7:30 p. m., pero su video promocional "
    "anuncia domingos 15, 22 y 29 de noviembre de 2:00 a 3:00 p. m. Si vale la hora del video, se cruza "
    "con Claude Code PRO Grupo 2 (domingos 2:00 a 3:00 p. m.). Hay que decidir cuál es la buena y corregir el otro.",
]


def campo(texto, nombre):
    m = re.search(rf"^{nombre}:\s*(.+)$", texto, re.M)
    return m.group(1).strip().strip('"') if m else ""


def hora(t):
    h = t.strftime("%I:%M").lstrip("0")
    return f"{h} {'a. m.' if t.hour < 12 else 'p. m.'}"


def fecha(t):
    return f"{DIAS[t.weekday()]} {t.day} de {MESES[t.month]}"


def cargar(desde):
    clases = []
    for y in sorted(glob.glob(os.path.join(CURSOS, "*", "course.yaml"))):
        carpeta = os.path.dirname(y)
        cy = open(y, encoding="utf-8").read()
        ag = re.search(r"^agenda:\s*\{(.*)\}", cy, re.M)
        ag = dict(re.findall(r'(\w+):\s*"?([^",}]+)"?', ag.group(1))) if ag else {}
        cohortes = re.findall(r"[\w-]+", (re.search(r"^cohorts:\s*\[(.*)\]", cy, re.M) or [None, ""])[1])
        for f in sorted(glob.glob(os.path.join(carpeta, "lessons", "*.md"))):
            lt = open(f, encoding="utf-8").read().split("\n---", 1)[0]
            s = campo(lt, "starts_at")
            if not s:
                continue
            ini = D.datetime.fromisoformat(s).astimezone(LIMA)
            if ini.date() < desde:
                continue
            mins = int(campo(lt, "duration") or ag.get("minutos") or 120)
            clases.append({
                "ini": ini, "fin": ini + D.timedelta(minutes=mins), "min": mins,
                "curso": os.path.basename(carpeta), "titulo": campo(cy, "title"),
                "nombre": ag.get("nombre", campo(cy, "title")), "grupo": ag.get("grupo", ""),
                "sesion": campo(lt, "title"), "cohortes": cohortes,
            })
    return sorted(clases, key=lambda c: c["ini"])


def cruces(clases):
    clases = [c for c in clases if c["curso"] not in OTRO_INSTRUCTOR]
    malos = []
    for i, a in enumerate(clases):
        for b in clases[i + 1:]:
            if b["ini"] >= a["fin"] + MARGEN:
                break
            if b["ini"] < a["fin"]:
                malos.append(("Se pisan", a, b))
            else:
                malos.append(("Seguidas sin 15 min de margen", a, b))
    franja = []
    for c in clases:
        d, t0, t1 = c["ini"].weekday(), c["ini"].time(), c["fin"].time()
        if d <= 3 and t0 < D.time(21) and t1 > D.time(18):
            franja.append(("Lunes a jueves entre 6 y 9 p. m.", c))
        if (d == 4 and t1 > D.time(18)) or (d == 5 and t0 < D.time(18, 30)):
            franja.append(("Sábado bíblico", c))
    return malos, franja


def nombre(c):
    n = f"{c['nombre']} · {c['grupo']}" if c["grupo"] else c["nombre"]
    return n + " (lo dicta otra persona)" if c["curso"] in OTRO_INSTRUCTOR else n


def escribir(clases, abiertos, desde):
    malos, franja = cruces(clases)
    L = [f"# Horario del instructor · JMD Learning",
         "",
         f"Generado el {D.datetime.now(LIMA):%d-%m-%Y %H:%M} (hora de Lima) desde el contenido del LMS, "
         f"con las clases desde el {fecha(D.datetime.combine(desde, D.time(), LIMA))}. "
         "Para regenerarlo: `python3 lms/scripts/horario_instructor.py` (instrucciones dentro del script).",
         "",
         "Reglas del instructor: no da clases del viernes a la puesta del sol al sábado a la puesta del sol "
         "(sábado bíblico), ni de lunes a jueves entre 6:00 y 9:00 p. m. Entre clases deja al menos 15 minutos.",
         "",
         "## Cruces pendientes",
         ""]
    n = 0
    for tipo, a, b in malos:
        n += 1
        L.append(f"{n}. **{tipo}** el {fecha(a['ini'])}: {nombre(a)} ({hora(a['ini'])} a {hora(a['fin'])}) "
                 f"y {nombre(b)} ({hora(b['ini'])} a {hora(b['fin'])}).")
    for tipo, c in franja:
        n += 1
        L.append(f"{n}. **{tipo}**: {nombre(c)}, {fecha(c['ini'])} de {hora(c['ini'])} a {hora(c['fin'])}")
    for aviso in AVISOS_EXTERNOS:
        n += 1
        L.append(f"{n}. **Dato contradictorio**: {aviso}")
    if franja:
        L += ["", "Las clases en la franja de lunes a jueves de 6 a 9 p. m. pueden ser de otro instructor; "
              "si las dicta él, hay que moverlas."]
    if not n:
        L.append("Ninguno.")

    L += ["", "## Cursos y grupos", "",
          "| Curso | Grupo | Sesiones | Horario | Inscripción |", "|---|---|---|---|---|"]
    por = {}
    for c in clases:
        por.setdefault(c["curso"], []).append(c)
    for k, cs in sorted(por.items(), key=lambda kv: kv[1][0]["ini"]):
        c0 = cs[0]
        dias = ", ".join(f"{DIAS[c['ini'].weekday()][:3]} {c['ini'].day}/{c['ini'].month}" for c in cs)
        horas = sorted({f"{hora(c['ini'])} a {hora(c['fin'])}" for c in cs})
        ins = [f"[{g}](https://jmd-learn.online/inscripcion/{g}/)" for g in c0["cohortes"] if g in abiertos]
        L.append(f"| {c0['nombre']} | {c0['grupo'] or '—'} | {len(cs)}: {dias} | {'; '.join(horas)} | "
                 f"{', '.join(ins) or 'cerrada'} |")

    L += ["", "## Día por día", ""]
    dia = None
    for c in clases:
        if c["ini"].date() != dia:
            dia = c["ini"].date()
            L += ["", f"### {fecha(c['ini']).capitalize()}"]
        L.append(f"- {hora(c['ini'])} a {hora(c['fin'])} · **{nombre(c)}** · {c['sesion']}")
    open(SALIDA, "w", encoding="utf-8").write("\n".join(L) + "\n")
    return n


if __name__ == "__main__":
    desde = D.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else D.datetime.now(LIMA).date()
    abiertos = {g.strip() for g in os.environ.get("LMS_INSCRIPCION", "").split(",") if g.strip()}
    cl = cargar(desde)
    n = escribir(cl, abiertos, desde)
    print(f"{len(cl)} clases, {n} cruces pendientes → {SALIDA}")
