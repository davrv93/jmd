import json, sys, urllib.request, re

def api(base, path, tok=None, data=None):
    req = urllib.request.Request(base + path, method="POST" if data else "GET")
    req.add_header("Content-Type", "application/json")
    if tok: req.add_header("Authorization", "Bearer " + tok)
    body = json.dumps(data).encode() if data else None
    with urllib.request.urlopen(req, body, timeout=30) as r:
        return json.loads(r.read().decode())

def check(name, base, email, pw):
    print(f"\n===== {name} ({base}) =====")
    tok = api(base, "/api/v1/auth/login", data={"email": email, "password": pw})["token"]
    c = api(base, "/api/v1/courses/programacion-agentica", tok)
    ids = [l["id"] for m in c["modules"] for l in m["lessons"]]
    print("lecciones:", ids, "| tareas:", [a["id"] for a in c["assignments"]])
    ok = True
    for lid in ids:
        d = api(base, f"/api/v1/lessons/{lid}", tok)
        h = d.get("content_html") or ""
        cyc = d.get("cycle") or []
        phases = {p.get("phase") for p in cyc if isinstance(p, dict)}
        map_ok = "Fase" in h and "En esta clase" in h
        steps = len(cyc)
        print(f"  {lid}: pasos del ciclo={steps} fases={sorted(x for x in phases if x)} mapa_fase_en_contenido={map_ok}")
        ok &= map_ok and steps >= 4
    for aid in ["tarea-01", "tarea-02", "tarea-03"]:
        d = api(base, f"/api/v1/assignments/{aid}", tok)
        h = d.get("description_html") or ""
        has = "Fase del ciclo" in h and "Aplicaci" in h
        print(f"  {aid}: marco de fase={has}")
        ok &= has
    xs = api(base, "/api/v1/courses/programacion-agentica/examples", tok)
    xs = xs if isinstance(xs, list) else xs.get("examples", [])
    withph = [x for x in xs if x.get("phase")]
    print(f"  ejemplos: {len(xs)} con phase: {len(withph)}")
    from collections import Counter
    print("   fases:", dict(Counter(x.get("phase") for x in xs)))
    ok &= len(xs) == 17 and len(withph) == 17
    print("  RESULTADO:", "OK" if ok else "FALLO")
    return ok

a = check("LOCAL", "http://localhost:8099", "yo@ejemplo.pe", "contrasena123")
b = check("PROD", "https://jmd-learn.online", "claudedev2.itam@upeu.edu.pe", "SDCddvHEaWeEgwoomvud")
print("\nTOTAL:", "OK" if (a and b) else "FALLO")
sys.exit(0 if (a and b) else 1)
