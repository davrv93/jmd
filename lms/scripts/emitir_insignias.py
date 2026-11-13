#!/usr/bin/env python3
"""Emite las insignias de participación de los cursos ya terminados (13-11-2026).

Para cada curso de PLAN: una insignia por clase y una del curso completo a todos los inscritos
(rol student en las cohortes del curso). No duplica: quien ya tiene una vigente en ese ámbito se
salta. Tampoco reemite a quien se le anuló una (fue decisión del instructor) ni a cuentas de prueba.

Se corre EN EL SERVIDOR (lee ~/credenciales-lms.txt, que nunca se imprime):
    python3 emitir_insignias.py            # en seco: cuenta qué emitiría
    python3 emitir_insignias.py --aplicar  # emite
"""
import collections, http.cookiejar, json, re, sys, urllib.error, urllib.request

B = "http://127.0.0.1:8080"
APLICAR = "--aplicar" in sys.argv
# curso → (horas por clase, horas del curso). Salen de la duración programada (agenda.minutos).
PLAN = {
    "programacion-agentica": (2, 6), "programacion-agentica-g2": (2, 6), "programacion-agentica-g3": (2, 6),
    "programacion-agentica-g4": (2, 6), "programacion-agentica-g5": (2, 6), "programacion-agentica-g6": (2, 6),
    "programacion-agentica-g8": (2, 6),
    "pruebas-qa-ia": (4, 4),               # taller de 4 h
    "hard-to-explain-diseno": (1, 4),      # 3 sesiones de 1 h 15 min
    "charla-seguridad-ia": (1, 2),         # 2 charlas de 45 min
    "web-scraping-etico": (3, 3),          # taller de 3 h
    "dificil-de-explicar-lunes": (2, 5),   # 3 sesiones de 1 h 30 min
}
PRUEBA = re.compile(r"prueba|\btest\b|\bdemo\b|ejemplo|example", re.I)

cred = dict(re.findall(r"(?m)^(Usuario|Clave):\s*(.+)$", open("/home/ubuntu/credenciales-lms.txt").read()))
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def api(ruta, datos=None):
    req = urllib.request.Request(B + ruta, data=json.dumps(datos).encode() if datos is not None else None, headers={"Content-Type": "application/json"})
    try:
        with op.open(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


assert api("/api/v1/auth/login", {"email": cred["Usuario"].strip(), "password": cred["Clave"].strip()})[0] == 200
users = api("/api/v1/admin/users")[1]
certs = api("/api/v1/admin/certificados")[1]
vigente, anulada = set(), set()
for c in certs:
    (vigente if c["estado"] == "valido" else anulada).add((c["user_id"], c["course_id"], c.get("lesson_id") or ""))
anulada -= vigente  # anulada y vuelta a emitir: cuenta como vigente

COHORTES = {c["id"]: c.get("cohorts") for c in api("/api/v1/courses")[1]}  # el detalle del curso no las trae
tot = collections.Counter()
dudosos, pruebas = set(), set()
for cid, (h_clase, h_curso) in PLAN.items():
    est, curso = api("/api/v1/courses/" + cid)
    assert est == 200, cid
    clases = [l["id"] for m in curso["modules"] for l in m["lessons"]]
    cohortes = set(COHORTES.get(cid) or [])
    assert cohortes, f"{cid}: sin cohortes"
    alumnos = [u for u in users if "student" in (u.get("roles") or []) and cohortes & set(u.get("cohorts") or [])]
    n = collections.Counter()
    for u in alumnos:
        # Solo el nombre y la parte local del correo: el dominio test.jmd-learn.online lo usan alumnos reales sin correo propio.
        if PRUEBA.search(u.get("email", "").split("@")[0]) or PRUEBA.search(u.get("name", "")):
            pruebas.add(u["id"]); n["cuenta de prueba"] += 1
            continue
        nombre = (u.get("name") or "").strip()
        if len(nombre.split()) < 2 or re.search(r"[\d@_]", nombre):
            dudosos.add(u["id"])
        for lid, horas in [(l, h_clase) for l in clases] + [("", h_curso)]:
            clave = (u["id"], cid, lid)
            tipo = "curso" if not lid else "clase"
            if clave in vigente:
                n[f"{tipo}: ya tenía"] += 1
            elif clave in anulada:
                n[f"{tipo}: anulada antes, no se reemite"] += 1
            elif not APLICAR:
                n[f"{tipo}: se emitiría"] += 1
            else:
                cuerpo = {"user_id": u["id"], "course_id": cid, "tipo": "participacion", "horas": horas}
                if lid:
                    cuerpo["lesson_id"] = lid
                e, d = api("/api/v1/admin/certificados", cuerpo)
                n[f"{tipo}: emitida" if e == 201 else f"{tipo}: ya tenía" if e == 409 else f"{tipo}: ERROR {e}"] += 1
    tot.update(n)
    print(f"{cid:<28} inscritos {len(alumnos):>2} · clases {len(clases)} ({h_clase} h) · curso {h_curso} h · " + " · ".join(f"{k} {v}" for k, v in sorted(n.items())))
print("\nTOTAL:", dict(sorted(tot.items())))
print(f"Alumnos con nombre dudoso para un certificado (una sola palabra, dígitos o símbolos): {len(dudosos)} · cuentas de prueba saltadas: {len(pruebas)}")
print("Emitido." if APLICAR else "En seco: nada se emitió. Repite con --aplicar.")
