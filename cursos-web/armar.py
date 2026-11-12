#!/usr/bin/env python3
"""Genera una página pública por cada curso que aún no empieza, en https://jmd-learn.online/cursos/<slug>/,
más el índice /cursos/. Mismo diseño que /openmontage/ (inscripción por WhatsApp con QR).

Datos: el LMS (~/Documents/jmd/lms/content/courses: descripción, proyecto final, requisitos, sesiones con fecha y
hora) y el brochure (~/Documents/jmd/brochures/salida/cursos.json: bajada, «aprenderás», precio). Lo que no está en
ninguno (precio de BI, IA para todos, Potencia) sale de flyers o queda como «Consulta el precio por WhatsApp».

Uso:  ~/Downloads/OpenMontage/.venv/bin/python armar.py      (necesita PyYAML)
      LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
"""
import datetime as dt
import html
import json
import os
import pathlib
import re
import subprocess
import urllib.parse

import yaml

AQUI = pathlib.Path(__file__).resolve().parent
WEB = AQUI / "web"
LMS = pathlib.Path.home() / "Documents/jmd/lms/content/courses"
BROCHURE = {c["slug"]: c for c in json.load(open(pathlib.Path.home() / "Documents/jmd/brochures/salida/cursos.json"))}
VIDEOS = pathlib.Path.home() / "Downloads/web-con-ia-jmd"
WA = "51986149476"
WA_TXT = "986 149 476"
HOY = dt.datetime(2026, 11, 11, 16, 0)
DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
DIAS_L = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"]

# slug web, grupos del LMS, slug del brochure, precio, video promo (ruta, vertical?), color de acento
CURSOS = [
    dict(slug="claude-code-pro", grupos=["claude-code-pro-2"], br="claude-code-pro", precio="S/ 100",
         video=("claude-pro2-22/video/renders/claude-code-pro2-22s-whatsapp.mp4", True), acento="#ff8a3d"),
    dict(slug="web-scraping-etico", grupos=["web-scraping-etico-2"], br="web-scraping-etico", precio="S/ 60",
         video=("scraping-agente/video/renders/scraping-agente-whatsapp.mp4", False), acento="#ff8a3d"),
    dict(slug="diseno-y-edicion-con-ia", grupos=["dificil-de-explicar-domingo-manana", "dificil-de-explicar-domingo-tarde"],
         br="dificil-de-explicar", precio="S/ 100", acento="#ff5c7a"),
    dict(slug="bot-whatsapp-avanzado", grupos=["bot-whatsapp-avanzado-2"], br="bot-whatsapp-avanzado",
         precio="S/ 25", antes="S/ 50", video=("bot-avanzado30/video/renders/bot-avanzado-30s.mp4", False), acento="#f6cf47"),
    # IA para todos (dom 7:30–9:00 p. m.) choca con Bot de WhatsApp avanzado G2 (dom 7:30–8:15 p. m.): fuera hasta resolverlo.
    dict(slug="ingenieria-de-requerimientos", grupos=["diseno-de-requerimientos", "diseno-de-requerimientos-2", "diseno-de-requerimientos-3"],
         br="ingenieria-de-requerimientos", precio="S/ 40", acento="#9be37d"),
    dict(slug="tienda-web-facturacion", grupos=["tienda-web-facturacion", "tienda-web-facturacion-2"], br=None,
         precio="S/ 25", antes="S/ 50", video=("tienda35/video/renders/tienda-virtual-35s.mp4", False), acento="#5cc8cd"),
    dict(slug="deepseek-harness", grupos=["deepseek-harness"], br="deepseek-harness", precio="S/ 40", acento="#7cc6ff"),
    dict(slug="diseno-de-interfaces", grupos=["diseno-interfaces"], br="diseno-interfaces", precio="S/ 40",
         nota_precio="las tres sesiones", acento="#ff5c7a"),
    dict(slug="seguridad-con-ia", grupos=["seguridad-codificacion-ia"], br="seguridad-codificacion-ia", precio="S/ 100", acento="#e10600"),
    dict(slug="potencia-tus-agentes", grupos=["potencia-agentes-2"], br="potencia-agentes", precio=None, acento="#f3c45a"),
    dict(slug="dashboards-bi-con-ia", grupos=["bi-clickhouse"], br=None, precio="S/ 50", antes="S/ 80", acento="#f6cf47"),
    dict(slug="programacion-agentica", grupos=["programacion-agentica-g9", "programacion-agentica-g10"], br="programacion-agentica",
         precio="S/ 100", video=("vibecoding-g9/renders/vibecoding-g9-25s-whatsapp.mp4", True), acento="#e10600"),
    dict(slug="pruebas-y-qa-con-ia", grupos=["pruebas-qa-ia-2"], br="pruebas-qa-ia", precio="S/ 100", acento="#9be37d"),
]


def leer_curso(cid):
    y = yaml.safe_load(open(LMS / cid / "course.yaml"))
    lecciones = {}
    for f in (LMS / cid / "lessons").glob("*.md"):
        t = f.read_text()
        m = re.match(r"---\n(.*?)\n---", t, re.S)
        if not m:
            continue
        fm = yaml.safe_load(m.group(1))
        lecciones[fm["id"]] = fm
    ses = []
    for mod in y.get("modules", []):
        for lid in mod.get("lessons", []):
            fm = lecciones.get(lid)
            if not fm or not fm.get("starts_at"):
                continue
            ini = fm["starts_at"]
            if isinstance(ini, str):
                ini = dt.datetime.fromisoformat(ini)
            ini = ini.replace(tzinfo=None)
            minutos = (y.get("agenda") or {}).get("minutos") or fm.get("duration") or 90
            ses.append(dict(titulo=fm.get("title") or mod["title"], ini=ini, fin=ini + dt.timedelta(minutes=minutos)))
    ses.sort(key=lambda s: s["ini"])
    return y, ses


def hora(d):
    h = d.hour % 12 or 12
    s = f"{h}:{d.minute:02d}"
    return s, ("a. m." if d.hour < 12 else "p. m.")


def rango(a, b):
    ha, pa = hora(a)
    hb, pb = hora(b)
    return f"{ha} – {hb} {pb}" if pa == pb else f"{ha} {pa} – {hb} {pb}"


def fecha_corta(d):
    return f"{DIAS[d.weekday()]} {d.day} {MESES[d.month - 1]}"


def limpiar_titulo(t):
    t = re.sub(r"^Grupo \d+ · ", "", t)
    return t


def nombre_grupo(y, cid):
    g = (y.get("agenda") or {}).get("grupo") or ""
    return g if g else cid


def esc(s):
    return html.escape(str(s), quote=True)


def qr_svg(url, ruta):
    js = ('const QR=require("qrcode"),fs=require("fs");QR.toString(process.argv[1],{type:"svg",errorCorrectionLevel:"M",margin:1,'
          'color:{dark:"#1d1406",light:"#ffffff"}},(e,s)=>{if(e)throw e;fs.writeFileSync(process.argv[2],s)});')
    subprocess.run(["node", "-e", js, url, str(ruta)], check=True,
                   env={**os.environ, "NODE_PATH": str(VIDEOS / "plugin35/tools/node_modules")})


def video_web(origen, destino, vertical):
    if destino.exists() and destino.stat().st_mtime > origen.stat().st_mtime:
        return
    escala = "720:1280" if vertical else "1280:720"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(origen), "-vf", f"scale={escala}:force_original_aspect_ratio=decrease,pad={escala}:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
                    "-movflags", "+faststart", str(destino)], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", "3", "-i", str(destino), "-frames:v", "1", "-q:v", "4",
                    str(destino.with_suffix(".jpg"))], check=True)


CSS = """
  :root { --fondo:#0f0c0a; --tarjeta:#1a1512; --linea:#33291f; --tinta:#fbf5ec; --suave:#c8baa6; --acento:ACENTO; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:radial-gradient(120% 60% at 50% 0%, #2c2219 0%, var(--fondo) 55%); color:var(--tinta);
    font-family:Inter, -apple-system, "Helvetica Neue", Arial, sans-serif; line-height:1.5; }
  a { color:inherit; }
  .envoltura { max-width:1000px; margin:0 auto; padding:24px 16px 64px; }
  .marca { font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--suave); font-weight:600; text-decoration:none; }
  header { display:grid; gap:16px; padding:24px 0 8px; }
  .chip { justify-self:start; background:var(--acento); color:#140d08; font-weight:800; font-size:14px; padding:6px 14px; border-radius:99px; }
  h1 { font-family:"EB Garamond", Georgia, serif; font-weight:700; font-size:clamp(36px, 7vw, 64px); line-height:1.04; }
  .bajada { color:var(--suave); font-size:clamp(16px, 2.3vw, 19px); max-width:680px; }
  .datos { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; }
  .dato { background:var(--tarjeta); border:1px solid var(--linea); border-radius:16px; padding:14px 16px; }
  .dato span { display:block; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--suave); }
  .dato b { display:block; font-size:17px; margin-top:4px; }
  .dato b.precio { font-size:30px; color:var(--acento); }
  .dato s { color:var(--suave); font-size:15px; margin-left:6px; }
  .acciones { display:flex; flex-wrap:wrap; gap:12px; }
  .boton { display:inline-flex; align-items:center; text-decoration:none; font-weight:800; font-size:17px; padding:15px 22px; border-radius:14px; }
  .boton.wa { background:#25d366; color:#06210f; }
  .boton.sec { border:1px solid var(--linea); }
  .boton:focus-visible { outline:3px solid #fff; outline-offset:3px; }
  h2 { font-family:"EB Garamond", Georgia, serif; font-size:clamp(26px, 4.5vw, 38px); margin:48px 0 6px; }
  .sub { color:var(--suave); margin-bottom:16px; }
  .video { display:grid; gap:16px; align-items:start; }
  @media (min-width:760px) { .video.vert { grid-template-columns:300px 1fr; } }
  figure { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; overflow:hidden; }
  figure video { display:block; width:100%; height:auto; background:#000; }
  .lista { list-style:none; display:grid; gap:10px; }
  .lista li { display:flex; gap:10px; }
  .lista li::before { content:"✦"; color:var(--acento); }
  .grupos { display:grid; gap:14px; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); }
  .grupo { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; padding:16px; }
  .grupo h3 { font-size:18px; margin-bottom:8px; }
  .ses { display:grid; grid-template-columns:auto 1fr; gap:4px 12px; padding:8px 0; border-top:1px solid var(--linea); font-size:15px; }
  .ses:first-of-type { border-top:0; }
  .ses .cuando { color:var(--acento); font-weight:800; white-space:nowrap; }
  .ses .que { color:var(--tinta); }
  .ses .hora { grid-column:2; color:var(--suave); font-size:14px; }
  .caja { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; padding:16px 18px; }
  .inscripcion { margin-top:48px; display:grid; gap:20px; align-items:center; background:linear-gradient(135deg, #2a1d14, #1a1512); border:1px solid var(--linea); border-radius:22px; padding:22px; }
  @media (min-width:760px) { .inscripcion { grid-template-columns:1fr 260px; padding:30px; } }
  .inscripcion h2 { margin-top:0; }
  .pasos { list-style:none; display:grid; gap:10px; margin:12px 0 18px; counter-reset:paso; }
  .pasos li { display:flex; gap:10px; }
  .pasos li::before { content:counter(paso); counter-increment:paso; flex:0 0 28px; height:28px; border-radius:50%; background:var(--acento); color:#140d08; font-weight:800; display:grid; place-items:center; font-size:14px; }
  .qr { background:#fff; border-radius:18px; padding:14px; justify-self:center; width:100%; max-width:260px; }
  .qr img { display:block; width:100%; height:auto; }
  .qr p { color:#1d1406; text-align:center; font-weight:800; font-size:14px; margin-top:8px; }
  footer { margin-top:44px; color:var(--suave); font-size:13px; text-align:center; }
  footer a { text-decoration:underline; }
"""

CABEZA = """<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} · JMD Learning</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{titulo} · JMD Learning">
<meta property="og:description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@500;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
"""


def pagina(c, resumenes):
    datos = []
    for cid in c["grupos"]:
        y, ses = leer_curso(cid)
        if ses and ses[-1]["ini"] > HOY:
            datos.append((cid, y, ses))
    y0 = datos[0][1]
    br = BROCHURE.get(c["br"]) if c.get("br") else None
    titulo = re.sub(r"\s*·\s*(Grupo \d+|Grupo del domingo.*)$", "", y0["title"]).strip()
    titulo = re.sub(r"^[^\wÁÉÍÓÚ¿¡]+", "", titulo).strip()
    if c["slug"] == "diseno-y-edicion-con-ia":
        titulo = "¿Difícil de explicar? ¡No! Diseño y edición con IA"
    bajada = (br or {}).get("bajada") or " ".join(str(y0.get("description", "")).split())
    aprendes = (br or {}).get("aprenderas") or []
    proyecto = " ".join(str(y0.get("proyecto_final") or "").split())
    requisitos = y0.get("requisitos") or []
    primera = min(s["ini"] for _, _, ses in datos for s in ses if s["ini"] > HOY)
    chip = f"Próximo inicio: {DIAS_L[primera.weekday()].lower()} {primera.day} de {['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'][primera.month - 1]}"
    n_ses = len(datos[0][2])
    min_ses = int((datos[0][2][0]["fin"] - datos[0][2][0]["ini"]).total_seconds() // 60)
    dur = f"{min_ses // 60} h" + (f" {min_ses % 60} min" if min_ses % 60 else "") if min_ses >= 60 else f"{min_ses} min"
    formato = f"{n_ses} sesión en vivo de {dur}" if n_ses == 1 else f"{n_ses} sesiones en vivo de {dur}"
    msg = f"Hola, quiero inscribirme en el curso {titulo}"
    wa = f"https://wa.me/{WA}?text={urllib.parse.quote(msg)}"
    carpeta = WEB / c["slug"]
    carpeta.mkdir(parents=True, exist_ok=True)
    qr_svg(wa, carpeta / "qr.svg")
    precio = c.get("precio")
    if precio:
        antes = "<s>" + esc(c["antes"]) + "</s>" if c.get("antes") else ""
        nota = '<span style="text-transform:none;letter-spacing:0">' + esc(c["nota_precio"]) + "</span>" if c.get("nota_precio") else ""
        precio_html = '<b class="precio">' + esc(precio) + antes + "</b>" + nota
    else:
        precio_html = '<b>Consulta por WhatsApp</b>'
    # grupos y sesiones
    bloques = []
    for cid, y, ses in datos:
        filas = "".join(
            f'<div class="ses"><span class="cuando">{esc(fecha_corta(s["ini"]))}</span><span class="que">{esc(limpiar_titulo(s["titulo"]))}</span>'
            f'<span class="hora">{esc(rango(s["ini"], s["fin"]))} (hora de Lima)</span></div>' for s in ses)
        nombre = nombre_grupo(y, cid)
        empezo = ses[0]["ini"] <= HOY
        bloques.append(f'<div class="grupo"><h3>{esc(nombre)}{" · en curso" if empezo else ""}</h3>{filas}</div>')
    video_html = ""
    if c.get("video"):
        ruta, vert = c["video"]
        dest = carpeta / "promo.mp4"
        video_web(VIDEOS / ruta, dest, vert)
        lado = ('<div class="caja"><b>Mira el video</b><p class="sub" style="margin:6px 0 0">Un resumen de lo que vas a construir en el curso.</p></div>' if vert else "")
        clase = "video vert" if vert else "video"
        video_html = ('<h2>El curso en un minuto</h2><div class="' + clase + '"><figure><video src="promo.mp4" poster="promo.jpg" '
                      'controls playsinline preload="none"></video></figure>' + lado + '</div>')
    aprende_html = ""
    if aprendes:
        aprende_html = '<h2>Qué vas a aprender</h2><ul class="lista">' + "".join(f"<li>{esc(a)}</li>" for a in aprendes) + "</ul>"
    proyecto_html = f'<h2>Tu proyecto final</h2><div class="caja"><p>{esc(proyecto)}</p></div>' if proyecto else ""
    req_html = ""
    if requisitos:
        req_html = '<h2>Qué necesitas</h2><ul class="lista">' + "".join(f"<li>{esc(r)}</li>" for r in requisitos) + "</ul>"
    desc = f"{bajada} {formato}. Inscripción por WhatsApp."
    h = CABEZA.format(titulo=esc(titulo), desc=esc(desc[:300]), css=CSS.replace("ACENTO", c["acento"])) + f"""<body>
<div class="envoltura">
  <a class="marca" href="../">✦ JMD Learning · Cursos en vivo</a>
  <header>
    <p class="chip">{esc(chip)}</p>
    <h1>{esc(titulo)}</h1>
    <p class="bajada">{esc(bajada)}</p>
    <div class="datos">
      <div class="dato"><span>Formato</span><b>{esc(formato)}</b></div>
      <div class="dato"><span>Dónde</span><b>En vivo por Zoom</b></div>
      <div class="dato"><span>Grupos</span><b>{len(datos)} {"grupo" if len(datos) == 1 else "grupos"} con fecha</b></div>
      <div class="dato"><span>Inversión</span>{precio_html}</div>
    </div>
    <div class="acciones">
      <a class="boton wa" href="{esc(wa)}">Inscríbete por WhatsApp</a>
      <a class="boton sec" href="#fechas">Ver fechas</a>
    </div>
  </header>
  {video_html}
  {aprende_html}
  <h2 id="fechas">Fechas y horarios</h2>
  <p class="sub">Elige tu grupo. Todas las sesiones son en vivo por Zoom, en hora de Lima.</p>
  <div class="grupos">{"".join(bloques)}</div>
  {proyecto_html}
  {req_html}
  <section class="inscripcion">
    <div>
      <h2>Inscríbete</h2>
      <ol class="pasos">
        <li>Escanea el código o toca el botón: se abre WhatsApp con tu mensaje listo.</li>
        <li>Dinos qué grupo prefieres y te enviamos los datos de pago.</li>
        <li>Recibes tu acceso al aula virtual y el enlace de Zoom.</li>
      </ol>
      <a class="boton wa" href="{esc(wa)}">WhatsApp {WA_TXT}</a>
    </div>
    <div class="qr"><img src="qr.svg" alt="Código QR que abre WhatsApp para inscribirte"><p>Escanea para inscribirte</p></div>
  </section>
  <footer>JMD Learning · <a href="../">Todos los cursos</a> · jmd-learn.online</footer>
</div>
</body>
</html>
"""
    (carpeta / "index.html").write_text(h, encoding="utf-8")
    resumenes.append(dict(slug=c["slug"], titulo=titulo, bajada=bajada, primera=primera, precio=precio, acento=c["acento"],
                          grupos=len(datos)))
    print(f"ok {c['slug']:30s} {len(datos)} grupo(s), inicio {primera:%d-%m %H:%M}, precio {precio}")


def indice(res):
    res.sort(key=lambda r: r["primera"])
    tarjetas = "".join(
        f'<a class="curso" href="{r["slug"]}/" style="--acento:{r["acento"]}"><span class="cuando">{esc(fecha_corta(r["primera"]))}</span>'
        f'<b>{esc(r["titulo"])}</b><p>{esc(r["bajada"])}</p><span class="pie">{esc(r["precio"] or "Precio por WhatsApp")} · '
        f'{r["grupos"]} {"grupo" if r["grupos"] == 1 else "grupos"}</span></a>' for r in res)
    extra = """
  .cursos { display:grid; gap:14px; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); margin-top:20px; }
  .curso { display:grid; align-content:start; gap:6px; text-decoration:none; background:var(--tarjeta); border:1px solid var(--linea); border-top:4px solid var(--acento); border-radius:18px; padding:16px; }
  .curso:hover, .curso:focus-visible { border-color:var(--acento); outline:none; }
  .curso .cuando { color:var(--acento); font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:.06em; }
  .curso b { font-size:19px; line-height:1.25; }
  .curso p { color:var(--suave); font-size:14px; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
  .curso .pie { font-weight:700; font-size:14px; }
"""
    wa = f"https://wa.me/{WA}?text={urllib.parse.quote('Hola, quiero información de los cursos de JMD Learning')}"
    h = CABEZA.format(titulo="Cursos en vivo", desc="Próximos cursos en vivo de JMD Learning: IA, agentes, diseño, datos y seguridad. Inscripción por WhatsApp.",
                      css=CSS.replace("ACENTO", "#f3c45a") + extra) + f"""<body>
<div class="envoltura">
  <p class="marca">✦ JMD Learning</p>
  <header>
    <h1>Próximos cursos en vivo</h1>
    <p class="bajada">Cursos prácticos con IA, en vivo por Zoom. Elige el tuyo y escríbenos por WhatsApp para inscribirte.</p>
    <div class="acciones"><a class="boton wa" href="{esc(wa)}">WhatsApp {WA_TXT}</a><a class="boton sec" href="/rutas/">Ver rutas profesionales</a></div>
  </header>
  <div class="cursos">{tarjetas}
    <a class="curso" href="../openmontage/" style="--acento:#ff5c7a"><span class="cuando">dom 15 nov</span><b>Crea contenido con OpenMontage</b><p>Produce videos para tu negocio con un agente de IA.</p><span class="pie">S/ 50 con certificado</span></a>
    <a class="curso" href="../readysetgo/" style="--acento:#9be37d"><span class="cuando">jue 19 nov</span><b>Ready Set Go! Haz tu videojuego con IA</b><p>Curso y hackathon del domingo 13 de diciembre.</p><span class="pie">Curso S/ 30 · con hackathon S/ 40</span></a>
  </div>
  <footer>JMD Learning · jmd-learn.online · WhatsApp {WA_TXT}</footer>
</div>
</body>
</html>
"""
    (WEB / "index.html").write_text(h, encoding="utf-8")


if __name__ == "__main__":
    WEB.mkdir(parents=True, exist_ok=True)
    res = []
    for c in CURSOS:
        pagina(c, res)
    indice(res)
