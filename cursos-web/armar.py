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
WEB = pathlib.Path(os.environ.get("CURSOS_WEB") or AQUI / "web")  # en el servidor, la carpeta de la nueva versión
LMS = pathlib.Path(os.environ.get("CURSOS_LMS") or pathlib.Path.home() / "Documents/jmd/lms/content/courses")
# Marcar cursos + canje de código (backend en inscripcion-web: /inscripcion-web/api/codigo/{validar,canje}).
# Se enciende solo cuando ese backend responde; con CODIGO=0 en el entorno las páginas salen sin casillas ni barra.
CODIGO = os.environ.get("CODIGO", "1") == "1"
_USOS = None


def cohorte_de(cid):
    """La cohorte propia del curso (la que no comparte con ningún otro course.yaml); None si no tiene."""
    global _USOS
    if _USOS is None:
        _USOS = {}
        for f in LMS.glob("*/course.yaml"):
            for co in (yaml.safe_load(open(f)) or {}).get("cohorts") or []:
                _USOS[co] = _USOS.get(co, 0) + 1
    for co in (yaml.safe_load(open(LMS / cid / "course.yaml")) or {}).get("cohorts") or []:
        if _USOS.get(co) == 1:
            return co
    return None


def casilla(cohorte, nombre, texto="Marcar"):
    if not (CODIGO and cohorte):
        return ""
    return (f'<label class="marcar"><input type="checkbox" data-cohorte="{esc(cohorte)}" data-nombre="{esc(nombre)}">'
            f'<span>{esc(texto)}</span></label>')


OCULTAR = """<script>
/* Regla del usuario: en /cursos solo lo que aún no comienza, siempre. La página es estática, así que al abrirla
   (y cada minuto) se ocultan los grupos cuya primera sesión ya pasó: tarjetas, casillas «Marcar» y grupos de cada curso. */
(function () {
  var D = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], M = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
  var DL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], ML = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
  function lima(t) { return new Date(t - 5 * 3600e3); }
  function filtrar() {
    var ahora = Date.now();
    var paso = function (v) { var t = Date.parse(v); return !isNaN(t) && t <= ahora; };
    document.querySelectorAll("[data-inicio]").forEach(function (e) {
      var fue = paso(e.getAttribute("data-inicio"));
      e.hidden = fue;
      e.querySelectorAll("input[data-cohorte]").forEach(function (i) { i.disabled = fue; if (fue) i.checked = false; });
    });
    document.querySelectorAll("[data-inicios]").forEach(function (c) {
      var quedan = c.getAttribute("data-inicios").split(",").filter(function (v) { return v && !paso(v); });
      c.hidden = quedan.length === 0;
      if (!quedan.length) return;
      var d = lima(Math.min.apply(null, quedan.map(Date.parse)));
      var cu = c.querySelector(".cuando"); if (cu) cu.textContent = D[d.getUTCDay()] + " " + d.getUTCDate() + " " + M[d.getUTCMonth()];
      var pie = c.querySelector(".pie[data-precio]"); if (pie) pie.textContent = pie.getAttribute("data-precio") + " · " + quedan.length + (quedan.length === 1 ? " grupo" : " grupos");
    });
    var vivos = document.getElementById("vivos");
    if (vivos) {
      var vis = Array.prototype.some.call(vivos.children, function (c) { return !c.hidden; });
      var v = document.getElementById("vivos-vacio"); if (v) v.hidden = vis;
    }
    var grupos = document.querySelectorAll(".grupos > .grupo[data-inicio]");
    if (grupos.length) {
      var abiertos = Array.prototype.filter.call(grupos, function (g) { return !g.hidden; });
      var vac = document.querySelector(".grupos + .vacio"); if (vac) vac.hidden = abiertos.length > 0;
      var ng = document.querySelector("[data-ngrupos]");
      if (ng) ng.textContent = abiertos.length + (abiertos.length === 1 ? " grupo" : " grupos") + " por empezar";
      var chip = document.querySelector("[data-chip]");
      if (chip) {
        if (abiertos.length) {
          var p = lima(Math.min.apply(null, abiertos.map(function (g) { return Date.parse(g.getAttribute("data-inicio")); })));
          chip.textContent = "Próximo inicio: " + DL[p.getUTCDay()] + " " + p.getUTCDate() + " de " + ML[p.getUTCMonth()];
        } else chip.textContent = "Grupos de este curso ya iniciados";
      }
    }
    document.dispatchEvent(new CustomEvent("cursos:filtrado"));
  }
  filtrar();
  setInterval(filtrar, 60000);
})();
</script>"""


def pie_codigo(prefijo):
    return OCULTAR + (f'<script src="{prefijo}marcar.js" defer></script>' if CODIGO else "")
_BR_MAC = pathlib.Path.home() / "Documents/jmd/brochures/salida/cursos.json"
_BR_COPIA = AQUI / "datos/brochure-cursos.json"  # copia en git: el servidor no tiene la carpeta de brochures
if _BR_MAC.exists():
    _BR_COPIA.write_bytes(_BR_MAC.read_bytes())
BROCHURE = {c["slug"]: c for c in json.load(open(_BR_COPIA))}
VIDEOS = pathlib.Path.home() / "Downloads/web-con-ia-jmd"
WA = "51986149476"
WA_TXT = "986 149 476"
HOY = dt.datetime.now(dt.timezone(dt.timedelta(hours=-5))).replace(tzinfo=None)  # ahora mismo, hora de Lima
DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
DIAS_L = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"]

# slug web, grupos del LMS, slug del brochure, precio, video promo (ruta, vertical?), color de acento
CURSOS = [
    # Pedido el 22-11-2026: vie 27 nov, 4 y 11 dic, 3:00 p. m., S/ 40. Dictado por ponente certificado DTPC®. Brochure PDF.
    dict(slug="design-thinking-con-claude", grupos=["design-thinking-claude"], br=None, precio="S/ 40",
         video=("design-thinking/design-thinking-venta-57s.mp4", True), acento="#E58B63",
         pdf=pathlib.Path.home() / "Downloads/brochures-jmd/design-thinking-claude/Design-Thinking-con-Claude.pdf"),
    # Pedido el 21-11-2026: lun 23, mar 24 y mié 25 nov, 3:00 p. m. Ruleta de descuentos en /sorteo-videos/ (piso S/ 18, 1 gratis).
    dict(slug="videos-con-ia-para-tu-negocio", grupos=["videos-ia-negocio"], br=None, precio="S/ 25", acento="#ff8a3d"),
    dict(slug="claude-code-pro", grupos=["claude-code-pro-2"], br="claude-code-pro", precio="S/ 100",
         video=("claude-pro2-22/video/renders/claude-code-pro2-22s-whatsapp.mp4", True), acento="#ff8a3d"),
    dict(slug="web-scraping-etico", grupos=["web-scraping-etico-2"], br="web-scraping-etico", precio="S/ 15",
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
    # Los 7 cursos nuevos (flyer «Nuevos cursos», 11-11-2026): sin brochure, salen del LMS. Precios del flyer.
    dict(slug="orquestacion-qwen-coder", grupos=["orquestacion-qwen-coder"], br=None, precio="S/ 50", acento="#ff8a3d"),
    dict(slug="videojuegos-con-ia", grupos=["ready-set-go-2"], br=None, precio="S/ 50", acento="#7cc6ff"),
    dict(slug="tutoriales-en-video", grupos=["tutoriales-en-video"], br=None, precio="S/ 25", acento="#f6cf47"),
    dict(slug="pwa-app-movil", grupos=["pwa-app-movil"], br=None, precio="S/ 35", acento="#9be37d"),
    dict(slug="maestro-cerebros-ia", grupos=["maestro-cerebros-ia"], br=None, precio="S/ 35", acento="#ff5c7a"),
    dict(slug="gsap-avanzado", grupos=["gsap-avanzado"], br=None, precio="S/ 20", acento="#5cc8cd"),
    dict(slug="docker-vs-podman", grupos=["docker-vs-podman"], br=None, precio="S/ 30", acento="#7cc6ff"),
]


# Cursos en modalidad web (a tu ritmo, en video). Se pagan por Yape en /inscripcion-web/ y se aprueban en su panel.
# repo=None mientras el curso no esté publicado en el LMS: no se promete lo que no se puede ver.
WEB_CURSOS = [
    dict(lms="web-clickhouse", repo="https://github.com/davrv93/clickhouse-bi-ejemplos", acento="#f6cf47"),
    dict(lms="web-sorteos", repo="https://github.com/davrv93/sorteos-con-ia-ejemplos", acento="#ff5c7a"),
    dict(lms="web-agente-voz", repo="https://github.com/davrv93/agente-voz-gemini", acento="#7cc6ff"),
    dict(lms="web-qa-bots", repo="https://github.com/davrv93/qa-bots-ejemplos", acento="#9be37d"),
]
INSCRIPCION_WEB = "https://jmd-learn.online/inscripcion-web/"


def tarjetas_web():
    out = []
    for w in WEB_CURSOS:
        y = yaml.safe_load(open(LMS / w["lms"] / "course.yaml"))
        titulo = re.sub(r"\s*\(modalidad web\)\s*$", "", y["title"]).strip()
        bajada = " ".join(str(y.get("description", "")).split())
        bajada = re.sub(r"^Curso a tu ritmo, en video\.\s*", "", bajada)
        repo = (f'<a class="enl" href="{esc(w["repo"])}" rel="noopener">Ver el repositorio en GitHub</a>' if w["repo"]
                else '<span class="enl gris">Repositorio y videos: en preparación</span>')
        out.append(f'<div class="curso" style="--acento:{w["acento"]}"><span class="cuando">A tu ritmo · en video</span>'
                   f'<b>{esc(titulo)}</b><p>{esc(bajada)}</p>{repo}'
                   f'<span class="pie">S/ 10 · o 3 cursos por S/ 20</span>'
                   f'<div class="marcas">{casilla(w["lms"], titulo)}</div></div>')
    return "".join(out)


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
            if not fm or not fm.get("starts_at") or fm.get("published") is False:  # despublicada: no se anuncia
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
    """QR en SVG (oscuro sobre blanco). Usa la librería qrcode de Python; si no está (en el Mac), la de Node."""
    try:
        import qrcode
    except ImportError:
        qrcode = None
    if qrcode:
        q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=1)
        q.add_data(url)
        q.make(fit=True)
        m = q.get_matrix()
        n = len(m)
        d = "".join(f"M{x} {y}h1v1h-1z" for y, fila in enumerate(m) for x, v in enumerate(fila) if v)
        ruta.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
                        f'<rect width="{n}" height="{n}" fill="#ffffff"/><path fill="#1d1406" d="{d}"/></svg>')
        return
    js = ('const QR=require("qrcode"),fs=require("fs");QR.toString(process.argv[1],{type:"svg",errorCorrectionLevel:"M",margin:1,'
          'color:{dark:"#1d1406",light:"#ffffff"}},(e,s)=>{if(e)throw e;fs.writeFileSync(process.argv[2],s)});')
    subprocess.run(["node", "-e", js, url, str(ruta)], check=True,
                   env={**os.environ, "NODE_PATH": os.environ.get("NODE_PATH") or "/Users/david.roncal/Downloads/PjgFactSalud_completo/output/taller-grupo-3/video/node_modules"})


def video_web(origen, destino, vertical):
    """True si el video queda en la página. En el servidor no están los originales: se reusa el que ya estaba publicado."""
    if not origen.exists():
        return destino.exists()
    if destino.exists() and destino.stat().st_mtime > origen.stat().st_mtime:
        return True
    escala = "720:1280" if vertical else "1280:720"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(origen), "-vf", f"scale={escala}:force_original_aspect_ratio=decrease,pad={escala}:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
                    "-movflags", "+faststart", str(destino)], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", "3", "-i", str(destino), "-frames:v", "1", "-q:v", "4",
                    str(destino.with_suffix(".jpg"))], check=True)
    return True


CSS = """
  :root { --fondo:#0f0c0a; --tarjeta:#1a1512; --linea:#33291f; --tinta:#fbf5ec; --suave:#c8baa6; --acento:ACENTO; }
  * { box-sizing:border-box; margin:0; padding:0; }
  [hidden] { display:none !important; }
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
    if not datos:  # todos sus grupos ya terminaron: sale del índice (su página vieja queda en web/)
        print(f"-- {c['slug']:<30} sin sesiones futuras: fuera del índice")
        return
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
    bloques, marcas = [], []
    for cid, y, ses in datos:
        filas = "".join(
            f'<div class="ses"><span class="cuando">{esc(fecha_corta(s["ini"]))}</span><span class="que">{esc(limpiar_titulo(s["titulo"]))}</span>'
            f'<span class="hora">{esc(rango(s["ini"], s["fin"]))} (hora de Lima)</span></div>' for s in ses)
        nombre = nombre_grupo(y, cid)
        empezo = ses[0]["ini"] <= HOY
        co = cohorte_de(cid)
        ini = ses[0]["ini"].isoformat() + "-05:00"
        if not empezo:  # regla del usuario: en /cursos solo lo que aún no comienza
            marcas.append((co, nombre, ses[0]["ini"]))
        bloques.append(f'<div class="grupo" data-inicio="{ini}"><h3>{esc(nombre)}{" · en curso" if empezo else ""}</h3>{filas}'
                       f'{"" if empezo else casilla(co, titulo + " · " + nombre, "Marcar este curso")}</div>')
    video_html = ""
    if c.get("video"):
        ruta, vert = c["video"]
        dest = carpeta / "promo.mp4"
        hay_video = video_web(VIDEOS / ruta, dest, vert)
        lado = ('<div class="caja"><b>Mira el video</b><p class="sub" style="margin:6px 0 0">Un resumen de lo que vas a construir en el curso.</p></div>' if vert else "")
        clase = "video vert" if vert else "video"
        video_html = ('<h2>El curso en un minuto</h2><div class="' + clase + '"><figure><video src="promo.mp4" poster="promo.jpg" '
                      'controls playsinline preload="none"></video></figure>' + lado + '</div>') if hay_video else ""
    pdf_html = ""
    if c.get("pdf") and (pathlib.Path(c["pdf"]).exists() or (carpeta / "brochure.pdf").exists()):  # en el servidor se reusa el publicado
        if pathlib.Path(c["pdf"]).exists():
            (carpeta / "brochure.pdf").write_bytes(pathlib.Path(c["pdf"]).read_bytes())
        pdf_html = '\n      <a class="boton sec" href="brochure.pdf" download>Descargar brochure (PDF)</a>'
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
    <p class="chip" data-chip>{esc(chip)}</p>
    <h1>{esc(titulo)}</h1>
    <p class="bajada">{esc(bajada)}</p>
    <div class="datos">
      <div class="dato"><span>Formato</span><b>{esc(formato)}</b></div>
      <div class="dato"><span>Dónde</span><b>En vivo por Zoom</b></div>
      <div class="dato"><span>Grupos</span><b data-ngrupos>{len(datos)} {"grupo" if len(datos) == 1 else "grupos"} con fecha</b></div>
      <div class="dato"><span>Inversión</span>{precio_html}</div>
    </div>
    <div class="acciones">
      <a class="boton wa" href="{esc(wa)}">Inscríbete por WhatsApp</a>
      <a class="boton sec" href="#fechas">Ver fechas</a>{pdf_html}
    </div>
  </header>
  {video_html}
  {aprende_html}
  <h2 id="fechas">Fechas y horarios</h2>
  <p class="sub">Elige tu grupo. Todas las sesiones son en vivo por Zoom, en hora de Lima.</p>
  <div class="grupos">{"".join(bloques)}</div>
  <p class="vacio caja" hidden>Los grupos de este curso ya empezaron. Escríbenos por WhatsApp y te avisamos cuando abra el próximo, o <a href="../">mira los próximos cursos</a>.</p>
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
{pie_codigo("../")}
</body>
</html>
"""
    (carpeta / "index.html").write_text(h, encoding="utf-8")
    if marcas:  # solo grupos que aún no empiezan entran al índice
        resumenes.append(dict(slug=c["slug"], titulo=titulo, bajada=bajada, primera=min(m[2] for m in marcas), precio=precio,
                              acento=c["acento"], grupos=len(marcas), marcas=marcas))
    else:
        print(f"-- {c['slug']:<30} todos sus grupos ya empezaron: fuera del índice (la página sigue en su URL)")
        return
    print(f"ok {c['slug']:30s} {len(datos)} grupo(s), inicio {primera:%d-%m %H:%M}, precio {precio}")


def indice(res):
    res.sort(key=lambda r: r["primera"])
    def marcas_html(r):
        ms = r.get("marcas", [])
        if len(ms) == 1:
            co, n, i = ms[0]
            return (f'<div class="marcas"><span data-inicio="{i.isoformat()}-05:00">'
                    + casilla(co, r["titulo"] + " · " + n) + "</span></div>")
        return '<div class="marcas">' + "".join(
            f'<span data-inicio="{i.isoformat()}-05:00">' + casilla(co, r["titulo"] + " · " + n, "Marcar " + n) + "</span>"
            for co, n, i in ms) + "</div>"
    tarjetas = "".join(
        f'<div class="curso" data-inicios="{",".join(i.isoformat() + "-05:00" for _, _, i in r["marcas"])}" style="--acento:{r["acento"]}"><a class="ir" href="{r["slug"]}/"><span class="cuando">{esc(fecha_corta(r["primera"]))}</span>'
        f'<b>{esc(r["titulo"])}</b><p>{esc(r["bajada"])}</p><span class="pie" data-precio="{esc(r["precio"] or "Precio por WhatsApp")}">{esc(r["precio"] or "Precio por WhatsApp")} · '
        f'{r["grupos"]} {"grupo" if r["grupos"] == 1 else "grupos"}</span></a>{marcas_html(r)}</div>' for r in res)

    fijas = ""  # OpenMontage y Ready Set Go ya empezaron: regla «solo lo que aún no comienza»
    extra = """
  .cursos { display:grid; gap:14px; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); margin-top:20px; }
  .curso { display:grid; align-content:start; gap:10px; background:var(--tarjeta); border:1px solid var(--linea); border-top:4px solid var(--acento); border-radius:18px; padding:16px; }
  .curso:hover, .curso:focus-within { border-color:var(--acento); }
  .curso .ir { display:grid; gap:6px; text-decoration:none; border-radius:10px; }
  .curso .ir:focus-visible { outline:3px solid #fff; outline-offset:4px; }
  .marcas { display:flex; flex-wrap:wrap; gap:8px; }
  .curso .cuando { color:var(--acento); font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:.06em; }
  .curso b { font-size:19px; line-height:1.25; }
  .curso p { color:var(--suave); font-size:14px; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
  .curso .pie { font-weight:700; font-size:14px; }
  .curso .enl { font-weight:700; font-size:14px; color:var(--acento); }
  .curso .enl.gris { color:var(--suave); font-weight:600; }
  .oferta { margin-top:56px; display:grid; gap:12px; }
  .oferta h2 { margin:0; }
  .oferta .sub { margin:0; max-width:720px; }
"""
    wa = f"https://wa.me/{WA}?text={urllib.parse.quote('Hola, quiero información de los cursos de JMD Learning')}"
    h = CABEZA.format(titulo="Cursos en vivo", desc="Próximos cursos en vivo de JMD Learning y cursos en modalidad web a tu ritmo: IA, agentes, diseño, datos y seguridad.",
                      css=CSS.replace("ACENTO", "#f3c45a") + extra) + f"""<body>
<div class="envoltura">
  <p class="marca">✦ JMD Learning</p>
  <header>
    <h1>Próximos cursos en vivo</h1>
    <p class="bajada">Cursos prácticos con IA, en vivo por Zoom. Elige el tuyo y escríbenos por WhatsApp para inscribirte.{" ¿Tienes un código? Marca tus cursos y canjéalo aquí mismo." if CODIGO else ""}</p>
    <div class="acciones"><a class="boton wa" href="{esc(wa)}">WhatsApp {WA_TXT}</a><a class="boton sec" href="/rutas/">Ver rutas profesionales</a></div>
  </header>
  <div class="cursos" id="vivos">{tarjetas}
    {fijas}
  </div>
  <p class="vacio caja" id="vivos-vacio" hidden>Todos los grupos anunciados ya empezaron. Escríbenos por WhatsApp y te avisamos del próximo, o mira los cursos en modalidad web, que empiezas cuando quieras.</p>
  <section class="oferta" id="modalidad-web">
    <h2>Cursos en modalidad web</h2>
    <p class="sub">A tu ritmo, con videos paso a paso y un repositorio con los ejemplos listos para Windows y Mac. S/ 10 por curso, o elige 3 cursos por S/ 20 en total. Pagas por Yape y adjuntas la foto del pago.</p>
    <div class="acciones"><a class="boton wa" href="{INSCRIPCION_WEB}">Inscríbete en modalidad web</a></div>
    <div class="cursos">{tarjetas_web()}</div>
  </section>
  <footer>JMD Learning · jmd-learn.online · WhatsApp {WA_TXT}</footer>
</div>
{pie_codigo("")}
</body>
</html>
"""
    (WEB / "index.html").write_text(h, encoding="utf-8")


# Cursos del LMS que no se anuncian en /cursos: eventos con premio y cursos de otro instructor.
EXCLUIR = ("hackathon-", "python-api")
ACENTOS = ["#ff8a3d", "#7cc6ff", "#9be37d", "#f6cf47", "#ff5c7a", "#5cc8cd"]


def slug_de(t):
    import unicodedata
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def descubrir():
    """CURSOS más lo nuevo del LMS: un grupo nuevo se suma a su curso (mismo agenda.nombre); un curso nuevo tiene su página."""
    cursos = [dict(c, grupos=[g for g in c["grupos"] if (LMS / g / "course.yaml").exists()]) for c in CURSOS]
    conocidos = {g for c in cursos for g in c["grupos"]}
    por_nombre = {}
    for c in cursos:
        for g in c["grupos"]:
            n = ((yaml.safe_load(open(LMS / g / "course.yaml")) or {}).get("agenda") or {}).get("nombre")
            if n:
                por_nombre.setdefault(n, c)
    nuevos = {}
    for f in sorted(LMS.glob("*/course.yaml")):
        cid = f.parent.name
        if cid in conocidos or cid.startswith("web-") or cid.startswith(EXCLUIR):
            continue
        n = ((yaml.safe_load(open(f)) or {}).get("agenda") or {}).get("nombre")
        if not n:
            continue  # sin agenda no es un curso en vivo con horario
        _, ses = leer_curso(cid)
        if not ses or ses[-1]["ini"] <= HOY:
            continue
        if n in por_nombre:
            por_nombre[n]["grupos"].append(cid)
            print(f"+ grupo nuevo {cid} → {por_nombre[n]['slug']}")
        elif ses[0]["ini"] > HOY:  # curso nuevo: solo si aún no empieza (no se crean páginas de cursos ya en marcha)
            e = nuevos.setdefault(n, dict(slug=slug_de(n), grupos=[], br=None, precio=None,
                                          acento=ACENTOS[len(nuevos) % len(ACENTOS)]))
            e["grupos"].append(cid)
    for n, e in nuevos.items():
        print(f"+ curso nuevo {e['slug']} ({', '.join(e['grupos'])}): precio por WhatsApp")
    return cursos + list(nuevos.values())


if __name__ == "__main__":
    WEB.mkdir(parents=True, exist_ok=True)
    res = []
    todos = descubrir()
    for c in todos:
        pagina(c, res)
    indice(res)
    if os.environ.get("GRUPOS_JSON"):  # para el catálogo de códigos de inscripcion-web
        pathlib.Path(os.environ["GRUPOS_JSON"]).write_text(json.dumps([g for c in todos for g in c["grupos"]]))
