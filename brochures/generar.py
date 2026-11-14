"""Genera el brochure de una página de cada curso y el índice ordenado, en HTML.

Las fechas y los grupos salen del contenido del LMS; los textos, de cursos.py.
Uso: .venv/bin/python generar.py [AAAA-MM-DD de hoy]   →  salida/html/*.html   (luego: node imprimir.mjs)
"""
import base64, datetime, glob, html, io, os, re, sys
import qrcode, qrcode.image.svg, yaml
from cursos import CURSOS

AQUI = os.path.dirname(os.path.abspath(__file__))
LMS = os.path.join(AQUI, "..", "lms", "content", "courses")
HOY = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today()
WHATSAPP, WHATSAPP_VISTO = "51986149476", "986 149 476"
LOGO = open(os.path.expanduser("~/Downloads/jmd-piezas-florecen/fuentes/logo-40tsg.svg"), encoding="utf-8").read()
LOGO = re.sub(r"<\?xml.*?\?>", "", LOGO).replace('width="360" height="360"', "").replace('style="color: rgb(20, 26, 70)"', "")
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
ABR = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"]
MESL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"]
e = html.escape


def sesiones(carpeta):
    """Fechas de las sesiones de un grupo y el título del curso en el LMS."""
    curso = yaml.safe_load(open(os.path.join(LMS, carpeta, "course.yaml"), encoding="utf-8")) or {}
    fechas = []
    for f in glob.glob(os.path.join(LMS, carpeta, "lessons", "*.md")):
        m = re.match(r"---\n(.*?)\n---", open(f, encoding="utf-8").read(), re.S)
        fm = yaml.safe_load(m.group(1)) if m else {}
        if fm and fm.get("starts_at"):
            t = fm["starts_at"]
            fechas.append(t if isinstance(t, datetime.datetime) else datetime.datetime.fromisoformat(str(t)))
    return sorted(fechas), str(curso.get("title") or "")


def hora(t):
    h = t.hour % 12 or 12
    # Espacios duros: la hora no se parte entre dos líneas.
    return f"{h}:{t.minute:02d}\u00a0{'a.\u00a0m.' if t.hour < 12 else 'p.\u00a0m.'}"


def juntar(xs):
    return xs[0] if len(xs) == 1 else ", ".join(xs[:-1]) + " y " + xs[-1]


def dias_texto(fechas):
    meses = {}
    for t in fechas:
        meses.setdefault(t.month, []).append(t)
    if len({t.weekday() for t in fechas}) == 1:
        nombre = DIAS[fechas[0].weekday()].capitalize() + ("s" if len(fechas) > 1 and not DIAS[fechas[0].weekday()].endswith("s") else "")
        return nombre + " " + juntar([juntar([str(t.day) for t in ts]) + " de " + MES[m - 1] for m, ts in meses.items()])
    return juntar([f"{ABR[t.weekday()]} {t.day}" for t in fechas]) + " de " + MES[fechas[-1].month - 1]


def grupos_de(c):
    out = []
    for carpeta in c["grupos"]:
        fechas, titulo = sesiones(carpeta)
        etiqueta = (c.get("etiquetas") or {}).get(carpeta) or (re.search(r"Grupo \d+", titulo) or [""])[0] if True else ""
        if isinstance(etiqueta, re.Match):
            etiqueta = etiqueta.group(0)
        if not fechas:
            # Sin fechas en el LMS: solo cuenta como dictado si la ficha lo afirma.
            if carpeta in (c.get("dictados_sin_fecha") or []):
                out.append(dict(carpeta=carpeta, etiqueta=etiqueta, estado="dictado", texto="", inicio=None))
            continue
        d0, d1 = fechas[0].date(), fechas[-1].date()
        estado = "proximo" if d0 > HOY else "en curso" if d1 > HOY else "dictado"
        horas = {hora(t) for t in fechas}
        out.append(dict(carpeta=carpeta, etiqueta=etiqueta, estado=estado, inicio=fechas[0], fin=fechas[-1],
                        texto=dias_texto(fechas) + (" · " + horas.pop() if len(horas) == 1 else "")))
    return out


def qr_svg(texto):
    img = qrcode.make(texto, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=1)
    b = io.BytesIO(); img.save(b)
    return re.sub(r"<\?xml.*?\?>", "", b.getvalue().decode()).replace("<svg ", '<svg class="qr" ')


def imagen(ref):
    if ref.startswith("archivo:"):
        nombre = ref[8:]
    else:
        curso, escena = ref.split(":")
        nombre = f"{curso}--{escena.replace('/', '--')}.png"
    # JPEG si existe (PDF liviano para compartir); si no, la captura PNG original.
    jpg = os.path.join(AQUI, "capturas-jpg", nombre[:-4] + ".jpg")
    if os.path.exists(jpg):
        return "data:image/jpeg;base64," + base64.b64encode(open(jpg, "rb").read()).decode()
    return "data:image/png;base64," + base64.b64encode(open(os.path.join(AQUI, "capturas", nombre), "rb").read()).decode()


CSS = """
@page { size: 210mm 297mm; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0 }
:root { --tinta: #141a46; --tinta-2: #4a4f78; --acento: #5a49d6; --oro: #e2b84a; --papel: #fbf7ef; --linea: rgba(20,26,70,.14); --k: 1 }
html { font-size: calc(10.4px * var(--k)) }
body { display: flex; flex-direction: column; width: 794px; height: 1123px; overflow: hidden; background: var(--papel); color: var(--tinta);
  font-family: "Avenir Next", "Avenir", "Helvetica Neue", Arial, sans-serif; line-height: 1.38; -webkit-font-smoothing: antialiased }
.cab { position: relative; flex: none; height: 322px; padding: 30px 44px 0; background: var(--tinta); color: #fff; overflow: hidden }
.cab::after { content: ""; position: absolute; right: -90px; top: -110px; width: 380px; height: 380px; border-radius: 50%;
  background: radial-gradient(circle at 40% 45%, rgba(123,108,240,.55), rgba(123,108,240,0) 68%) }
.marca { display: flex; align-items: center; gap: 10px; position: relative; z-index: 1 }
.marca svg { width: 40px; height: 40px; color: #fff }
.marca b { font-size: 15px; font-weight: 700; letter-spacing: .01em }
.marca span { margin-left: auto; display: flex; gap: 8px }
.chip { padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; border: 1px solid rgba(255,255,255,.34); color: #e6e3ff; white-space: nowrap }
.chip.oro { background: var(--oro); border-color: var(--oro); color: var(--tinta) }
h1 { position: relative; z-index: 1; margin-top: 26px; max-width: 640px; font-size: 35px; line-height: 1.04; font-weight: 700; letter-spacing: -.025em; text-wrap: balance }
.bajada { position: relative; z-index: 1; margin-top: 12px; max-width: 600px; font: italic 15px/1.36 "Charter", "Iowan Old Style", Georgia, serif; color: #d9d5ff; text-wrap: pretty }
.fotos { position: relative; z-index: 2; display: grid; grid-template-columns: 1.32fr 1fr 1fr; gap: 12px; margin: -78px 44px 0; align-items: end }
.fotos figure { border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 14px 30px -14px rgba(20,26,70,.55), 0 0 0 1px rgba(20,26,70,.10); aspect-ratio: 16/9 }
.fotos img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top left }
.pie-foto { margin: 7px 44px 0; font-size: 10.2px; color: var(--tinta-2) }
.cuerpo { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0 34px; align-content: center; margin: 10px 44px }
h2 { margin-bottom: 8px; font-size: 1.02rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--acento) }
.bloque + .bloque { margin-top: 16px }
ul { list-style: none; display: grid; gap: 6px }
li { position: relative; padding-left: 18px; font-size: 1.2rem; text-wrap: pretty }
li::before { content: ""; position: absolute; left: 0; top: .5em; width: 8px; height: 8px; border-radius: 2px; background: var(--oro) }
.quien li::before { border-radius: 50%; background: var(--acento) }
ol { list-style: none; counter-reset: s; display: grid; gap: 8px }
ol li { counter-increment: s; padding-left: 32px }
ol li::before { content: counter(s); top: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--tinta); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700 }
ol b { display: block; font-size: 1.22rem; font-weight: 700; line-height: 1.25 }
ol span { font-size: 1.08rem; color: var(--tinta-2) }
.proyecto { margin-top: 16px; padding: 12px 14px; border-radius: 10px; background: #fff; border: 1px solid var(--linea); font-size: 1.14rem; text-wrap: pretty }
.proyecto h2 { margin-bottom: 5px }
.asi { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--linea) }
.asi div { font-size: 1.06rem; color: var(--tinta-2); text-wrap: pretty }
.asi b { display: block; margin-bottom: 2px; font-size: 1.16rem; color: var(--tinta) }
.pie { flex: none; display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center; padding: 18px 44px 20px; background: #fff; border-top: 3px solid var(--oro) }
.fechas { display: grid; gap: 3px; font-size: 12px }
.fechas b { font-weight: 700 }
.fechas .tenue { color: var(--tinta-2); font-size: 11px }
.datos { display: flex; flex-wrap: wrap; gap: 6px 8px; margin-top: 8px }
.dato { padding: 4px 10px; border-radius: 999px; background: rgba(90,73,214,.10); color: var(--tinta); font-size: 11px; font-weight: 600 }
.dato.precio { background: var(--tinta); color: #fff }
.cta { display: flex; align-items: center; gap: 14px }
.cta div { text-align: right; font-size: 11px; color: var(--tinta-2) }
.cta b { display: block; font-size: 17.5px; font-weight: 700; color: var(--tinta); letter-spacing: -.01em; font-variant-numeric: tabular-nums }
.qr { width: 84px; height: 84px; color: var(--tinta) }
"""


def brochure(c):
    gs = grupos_de(c)
    vivos = sorted([g for g in gs if g["estado"] != "dictado"], key=lambda g: g["inicio"])
    dictados = [g for g in gs if g["estado"] == "dictado"]
    proximos = [g for g in vivos if g["estado"] == "proximo"]
    if proximos:
        t = proximos[0]["inicio"]
        chip = f"Inicia {DIAS[t.weekday()]} {t.day} de {MESL[t.month - 1]}"
    elif vivos:
        chip = "En curso"
    else:
        chip = c.get("chip") or "Próxima fecha por anunciar"
    lineas = []
    for g in vivos[:4]:
        marca = " ·\u00a0en\u00a0curso" if g["estado"] == "en curso" else ""
        lineas.append(f"<span><b>{e(g['etiqueta'] + ': ' if g['etiqueta'] and len(vivos) > 1 else '')}</b>{e(g['texto'])}{marca}</span>")
    if not vivos:
        lineas.append(f"<span>{e(c.get('sin_fecha') or 'Próximo grupo por anunciar: escríbenos y te avisamos')}</span>")
    pie_foto = c.get("pie_foto") or ("El estudio que usarás en el curso: pantallas reales." if c["slug"] == "crea-contenido-openmontage"
                else "Así son las clases en vivo de JMD Learn: pantallas reales de otros cursos de la plataforma." if c.get("prestadas")
                else "Así se ve la clase en vivo: pantallas reales del curso.")
    mensaje = c.get("mensaje") or f"Hola, quiero información del curso «{c['titulo']}» de JMD Learning."
    wa = f"https://wa.me/{WHATSAPP}?text=" + __import__("urllib.parse").parse.quote(mensaje)
    datos = [f"<span class='dato'>{e(c['formato'])}</span>", "<span class='dato'>Con tu aula en jmd-learn.online</span>"]
    if c["precio"]:
        datos.append(f"<span class='dato precio'>{e(c['precio'])}</span>")
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>{e(c['titulo'])} · JMD Learning</title><style>{CSS}</style></head><body>
<header class="cab"><div class="marca">{LOGO}<b>JMD Learning</b><span><i class="chip" style="font-style:normal">{e(c['categoria'])}</i><i class="chip oro" style="font-style:normal">{e(chip)}</i></span></div>
<h1>{e(c['titulo'])}</h1><p class="bajada">{e(c['bajada'])}</p></header>
<div class="fotos">{''.join(f'<figure><img src="{imagen(i)}" alt=""></figure>' for i in c['imagenes'])}</div>
<p class="pie-foto">{pie_foto}</p>
<main class="cuerpo"><div>
<section class="bloque"><h2>Lo que aprenderás</h2><ul>{''.join(f'<li>{e(x)}</li>' for x in c['aprenderas'])}</ul></section>
<section class="bloque quien"><h2>Para quién es</h2><ul>{''.join(f'<li>{e(x)}</li>' for x in c['para_quien'])}</ul></section>
</div><div>
<section class="bloque"><h2>Temario</h2><ol>{''.join(f'<li><b>{e(a)}</b><span>{e(b)}</span></li>' for a, b in c['temario'])}</ol></section>
<section class="proyecto"><h2>Te llevas</h2>{e(c['proyecto'])}</section>
</div>
<section class="asi"><div><b>Clases en vivo</b>Cada sesión termina con algo hecho por ti, no solo visto.</div>
<div><b>Tu aula en jmd-learn.online</b>El material y la práctica guiada de cada sesión, en un solo lugar.</div>
<div><b>Insignias</b>Ganas una por cada sesión que completas.</div></section>
</main>
<footer class="pie"><div><div class="fechas">{''.join(lineas)}</div><div class="datos">{''.join(datos)}</div></div>
<div class="cta"><div>Inscripciones y consultas<b>WhatsApp {WHATSAPP_VISTO}</b>jmd-learn.online</div>{qr_svg(wa)}</div></footer>
</body></html>"""


CSS_INDICE = CSS + """
body { display: block; height: auto; min-height: 1123px; overflow: visible; padding-bottom: 30px }
.cab { height: 190px } h1 { font-size: 3rem; margin-top: 20px } .bajada { font-size: 1.3rem }
.tabla { margin: 22px 44px 0 } .tabla h2 { margin: 18px 0 8px }
.fila { display: grid; grid-template-columns: 1fr 1.3fr; gap: 16px; padding: 9px 0; border-top: 1px solid var(--linea); font-size: 1.16rem; break-inside: avoid }
.fila b { font-weight: 700 } .fila small { display: block; font-size: 1.02rem; color: var(--tinta-2) } .fila div + div { color: var(--tinta-2) }
"""


def indice():
    grupos = {"En curso": [], "Próximos inicios": [], "Fecha por confirmar · consulta disponibilidad": []}
    for c in CURSOS:
        gs = grupos_de(c)
        vivos = sorted([g for g in gs if g["estado"] != "dictado"], key=lambda g: g["inicio"])
        fechas = "<br>".join(e((g["etiqueta"] + ": " if g["etiqueta"] and len(vivos) > 1 else "") + g["texto"]) for g in vivos) or e(c.get("sin_fecha") or "Escríbenos y te avisamos del próximo grupo")
        clave = "En curso" if any(g["estado"] == "en curso" for g in vivos) else "Próximos inicios" if vivos else "Fecha por confirmar · consulta disponibilidad"
        orden = vivos[0]["inicio"] if vivos else datetime.datetime.max.replace(tzinfo=None)
        grupos[clave].append((orden.replace(tzinfo=None), f"<div class='fila'><div><b>{e(c['titulo'])}</b><small>{e(c['categoria'])} · {e(c['formato'])}{' · ' + e(c['precio']) if c['precio'] else ''}</small></div><div>{fechas}</div></div>"))
    cuerpo = "".join(f"<h2>{e(k)}</h2>" + "".join(f for _, f in sorted(v, key=lambda x: x[0])) for k, v in grupos.items() if v)
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cursos de JMD Learning</title><style>{CSS_INDICE}</style></head><body>
<header class="cab"><div class="marca">{LOGO}<b>JMD Learning</b><span><i class="chip oro" style="font-style:normal">Al {HOY.day} de {MESL[HOY.month - 1]} de {HOY.year}</i></span></div>
<h1>Nuestros cursos, en orden</h1><p class="bajada">{len(CURSOS)} cursos en vivo. Inscripciones por WhatsApp {WHATSAPP_VISTO} · jmd-learn.online</p></header>
<main class="tabla">{cuerpo}</main></body></html>"""


def exportar(destino):
    """Los mismos datos, para otras piezas (el sorteo): ficha corta, fechas, precio e imagen del brochure."""
    import json
    lista = []
    for n, c in enumerate(CURSOS, 1):
        gs = grupos_de(c)
        vivos = sorted([g for g in gs if g["estado"] != "dictado"], key=lambda g: g["inicio"])
        # Primero los grupos a los que todavía se puede entrar desde la primera sesión.
        vivos.sort(key=lambda g: (g["estado"] != "proximo", g["inicio"]))
        fechas = [((g["etiqueta"] + ": ") if g["etiqueta"] and len(vivos) > 1 else "") + g["texto"] + (" · en curso" if g["estado"] == "en curso" else "") for g in vivos]
        lista.append(dict(slug=c["slug"], titulo=c["titulo"], categoria=c["categoria"], bajada=c["bajada"], aprenderas=c["aprenderas"],
                          temario=[a for a, _ in c["temario"]], formato=c["formato"], fechas=fechas or [c.get("sin_fecha") or "Próximo grupo por anunciar"],
                          precio_texto=c["precio"] or "Precio por WhatsApp", soles=c["soles"], antes=c["antes"], brochure=f"{n:02d}-{c['slug']}"))
    json.dump(lista, open(destino, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    destino = os.path.join(AQUI, "salida", "html")
    os.makedirs(destino, exist_ok=True)
    open(os.path.join(destino, "00-indice-cursos.html"), "w", encoding="utf-8").write(indice())
    for n, c in enumerate(CURSOS, 1):
        open(os.path.join(destino, f"{n:02d}-{c['slug']}.html"), "w", encoding="utf-8").write(brochure(c))
    exportar(os.path.join(AQUI, "salida", "cursos.json"))
    print(len(CURSOS), "brochures + índice en", destino)
