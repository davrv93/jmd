#!/usr/bin/env python3
"""Genera briefs de flyers con DeepSeek (por OpenRouter) siguiendo reglas.json.

Uso:
  OPENROUTER_API_KEY=... python3 briefs.py --reglas reglas.json --salida briefs.json [--n 100]
  python3 briefs.py --uno "Vendo perfumes árabes en Los Olivos" --salida mio.json

La llave se lee del entorno (o de un .env con --env); nunca se imprime.
Solo usa la biblioteca estándar de Python.
"""
import argparse, json, os, sys, time, urllib.request, urllib.error, concurrent.futures as cf

MODELO = os.environ.get("FLYER_MODELO", "deepseek/deepseek-v4-flash-0731")
URL = "https://openrouter.ai/api/v1/chat/completions"
# Con DEEPSEEK_API_KEY se llama directo a la API de DeepSeek (sin OpenRouter).
DIRECTO = bool(os.environ.get("DEEPSEEK_API_KEY"))
if DIRECTO:
    MODELO = os.environ.get("FLYER_MODELO", "deepseek-chat")
    URL = "https://api.deepseek.com/chat/completions"


def llave(env_path):
    k = os.environ.get("DEEPSEEK_API_KEY", "") or os.environ.get("OPENROUTER_API_KEY", "")
    if not k and env_path and os.path.exists(env_path):
        for linea in open(env_path, encoding="utf-8"):
            if linea.startswith("OPENROUTER_API_KEY="):
                k = linea.split("=", 1)[1].strip().strip('"').strip("'")
    if not k:
        sys.exit("Falta OPENROUTER_API_KEY")
    return k


def sistema(reglas):
    r = reglas
    fuentes = ", ".join(f["id"] for f in r["fuentes"])
    visuales = ", ".join(r["visuales"])
    limites = "; ".join(f"{k}: máx. {v} palabras" for k, v in r["max_palabras"].items())
    return f"""Eres director de arte de una agencia peruana. Escribes briefs de flyers para negocios FICTICIOS de Perú.
Reglas duras:
- Español de Perú, claro y concreto. Sin emojis. Sin signos de exclamación repetidos.
- Límites de palabras por bloque: {limites}.
- Nada de cerdo (ni chicharrón, lechón, tocino, jamón, chancho), nada de alcohol, nada de terror ni temas sobrenaturales.
- No inventes números de teléfono: la marca usa un usuario tipo @nombre y la frase "pedidos por WhatsApp".
- Precios en soles con formato "S/ 49" o "S/ 49.90". Ofertas creíbles.
- Paleta en hex de 6 dígitos: fondo, superficie, texto, acento, texto_acento. Regla 60-30-10: fondo 60 %, superficie 30 %, acento 10 %.
  El texto sobre el fondo debe tener contraste >= 4.5:1; texto_acento sobre acento >= 4.5:1.
- Tipografías: elige SOLO de esta lista: {fuentes}. Un par: titulo y cuerpo (distintos).
- visual: elige uno de: {visuales}.
Devuelve SOLO JSON válido."""


def pedido(slots):
    ejemplo = {
        "id": "f001", "rubro": "perfumes", "familia": "heroe", "formato": "feed",
        "nombre": "Aurea Esencias", "distrito": "Miraflores",
        "gancho": "Tu firma en el aire", "producto": "Eau de parfum 100 ml",
        "beneficio": "Notas de vainilla y ámbar que duran todo el día",
        "oferta": "2 x S/ 189", "cta": "Pide por WhatsApp", "marca": "@aureaesencias",
        "extra": {"items": [], "codigo": "", "antes": "", "despues": ""},
        "paleta": {"fondo": "#1B1410", "superficie": "#2A211B", "texto": "#F5EDE3", "acento": "#C9A45C", "texto_acento": "#1B1410"},
        "tipografias": {"titulo": "playfair", "cuerpo": "inter"},
        "visual": "frasco", "tono": "lujo cálido"
    }
    return ("Completa un brief por cada ranura. Respeta id, rubro, familia y formato de la ranura.\n"
            "Familia 'menu': extra.items con 4 objetos {nombre, precio}. Familia 'cupon': extra.codigo (6-10 letras/números en mayúscula). "
            "Familia 'antes-despues': extra.antes y extra.despues (máx. 5 palabras cada uno). En las demás deja extra vacío.\n"
            "Que los nombres, ganchos, paletas y tonos sean muy distintos entre sí. No copies el nombre, los textos ni la paleta del ejemplo: es solo el formato.\n"
            "Varía fondos: claros, oscuros, pastel, saturados, tierra; no todos oscuros.\n"
            f"Ejemplo de un brief: {json.dumps(ejemplo, ensure_ascii=False)}\n"
            f"Ranuras: {json.dumps(slots, ensure_ascii=False)}\n"
            'Responde {"briefs": [ ... ]}')


def llamar(k, sist, usuario, intentos=3):
    datos = {
        "model": MODELO,
        "messages": [{"role": "system", "content": sist}, {"role": "user", "content": usuario}],
        "response_format": {"type": "json_object"},
        "temperature": 1.0,
        "max_tokens": 8000,
    }
    if not DIRECTO:
        datos["reasoning"] = {"effort": "none"}
    cuerpo = json.dumps(datos).encode()
    ultimo = None
    for i in range(intentos):
        try:
            req = urllib.request.Request(URL, data=cuerpo, headers={
                "Authorization": "Bearer " + k, "Content-Type": "application/json",
                "X-Title": "JMD flyers"})
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            txt = d["choices"][0]["message"]["content"].strip()
            if txt.startswith("```"):
                txt = txt.strip("`").split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(txt)["briefs"], d.get("usage", {})
        except urllib.error.HTTPError as e:
            ultimo = f"HTTP {e.code}: {e.read()[:300].decode('utf-8', 'replace')}"
            time.sleep(2 + i * 2)
        except Exception as e:  # noqa: BLE001
            ultimo = f"{type(e).__name__}: {str(e)[:200]}"
            time.sleep(2 + i * 2)
    raise RuntimeError(f"fallo tras {intentos} intentos: {ultimo}")


def ranuras(reglas, n):
    rubros = [r["id"] for r in reglas["rubros"]]
    familias = [f["id"] for f in reglas["familias"]]
    out = []
    for i in range(n):
        r, k = i % len(rubros), i // len(rubros)
        out.append({"id": f"f{i+1:03d}", "rubro": rubros[r],
                    "familia": familias[(r + k) % len(familias)],
                    "formato": "historia" if k % 3 == 2 else "feed"})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reglas", default=os.path.join(os.path.dirname(__file__), "..", "reglas.json"))
    ap.add_argument("--salida", required=True)
    ap.add_argument("--n", type=int, default=100)
    ap.add_argument("--lote", type=int, default=10)
    ap.add_argument("--env", default="")
    ap.add_argument("--uno", default="", help="describe tu negocio: genera 3 briefs para él")
    ap.add_argument("--rehacer", default="", help="briefs.json existente: rehace los que repiten nombre o gancho")
    a = ap.parse_args()
    reglas = json.load(open(a.reglas, encoding="utf-8"))
    k = llave(a.env)
    sist = sistema(reglas)
    if a.uno:
        fams = ["heroe", "dividido", "tarjeta"]
        slots = [{"id": f"mio{i+1}", "rubro": "segun la descripcion", "familia": f, "formato": "feed"} for i, f in enumerate(fams)]
        briefs, _ = llamar(k, sist, f"Negocio real del alumno: {a.uno}\nUsa su rubro y su nombre si lo da.\n" + pedido(slots))
        json.dump(briefs, open(a.salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{len(briefs)} briefs -> {a.salida}")
        return
    if a.rehacer:
        previos = json.load(open(a.rehacer, encoding="utf-8"))
        vistos, repetidos = set(), []
        for b in previos:
            claves = (b.get("nombre", "").lower(), b.get("gancho", "").lower())
            if claves[0] in vistos or claves[1] in vistos:
                repetidos.append(b)
            vistos.update(claves)
        evitar = sorted({b.get("nombre", "") for b in previos} | {b.get("gancho", "") for b in previos})
        slots = [{k: b[k] for k in ("id", "rubro", "familia", "formato")} for b in repetidos]
        nuevos = []
        for i in range(0, len(slots), 8):
            bs, _ = llamar(k, sist, "NO uses ninguno de estos nombres ni ganchos (ya existen): " + json.dumps(evitar, ensure_ascii=False) + "\n" + pedido(slots[i:i + 8]))
            nuevos.extend(bs)
        por_id = {b["id"]: b for b in nuevos}
        final = [por_id.get(b["id"], b) for b in previos]
        json.dump(final, open(a.salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"rehechos {len(por_id)} de {len(repetidos)} repetidos -> {a.salida}")
        return
    slots = ranuras(reglas, a.n)
    lotes = [slots[i:i + a.lote] for i in range(0, len(slots), a.lote)]
    todos, tokens = [], 0
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=len(lotes)) as ex:
        futs = {ex.submit(llamar, k, sist, pedido(l)): l for l in lotes}
        for f in cf.as_completed(futs):
            try:
                b, u = f.result()
                todos.extend(b)
                tokens += u.get("total_tokens", 0)
            except Exception as e:  # noqa: BLE001
                print("lote fallido:", e, file=sys.stderr)
    todos.sort(key=lambda b: b.get("id", ""))
    json.dump(todos, open(a.salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(todos)} briefs en {time.time()-t0:.1f} s, {tokens} tokens, modelo {MODELO} -> {a.salida}")


if __name__ == "__main__":
    main()
