#!/opt/homebrew/bin/python3.13
"""LIVE om-01 (Crea contenido con OpenMontage · sesión 1), 15-11-2026. Simple, con comandos y prompts listos para copiar.
Escribe live/om-01/<escena>/ y live/_comun/om.css/om.js. Uso: python3 _fuente/om01.py
"""
import html, shutil
from pathlib import Path
CURSO = Path(__file__).resolve().parent.parent
LIVE = CURSO / "live/om-01"
e = html.escape
ICONO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6"/></svg>'
CSS_EXTRA = """
.om-cmd { font: 700 15px/1.5 var(--mono); background: #14122b; color: #e9e6ff; border-radius: 12px; padding: 14px 16px; margin: 0; white-space: pre-wrap; word-break: break-word; }
.om-prompt { font: 500 17px/1.5 system-ui, sans-serif; background: var(--s2); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; margin: 0; white-space: pre-wrap; }
.om-pie { margin-top: 26px; color: var(--muted); font-size: 14px; }
"""
JS_SRC = ['<script src="../../comun/om.js"></script>']

def pagina(n, titulo, h1, sub, cuerpo):
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(titulo)} · OpenMontage</title>
<!-- Generada por _fuente/om01.py: edita ahí y vuelve a correrlo. -->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/om.css">
<style>{CSS_EXTRA}</style>
</head>
<body>
<main class="ipt">
  <p class="ipt-paso">Sesión 1 · {n} de 6</p>
  <h1>{h1}</h1>
  <p class="ipt-sub">{sub}</p>
{cuerpo}
</main>
<div class="ipt-toast" id="om-toast" role="status" aria-live="polite"></div>
{JS_SRC[0]}
</body>
</html>
"""

def bloque_cmd(id_, texto, etiqueta="Copiar"):
    return f"""<div class="tarjeta"><pre class="om-cmd" id="{id_}">{e(texto)}</pre><div class="fila"><button class="boton" type="button" data-copiar-de="{id_}">{etiqueta} {ICONO}</button></div></div>"""

ESC = []
# 1 · Bienvenida
ESC.append(("01-bienvenida", dict(titulo="Bienvenida", fase="experiencia", paso="ver", duracion_min=5, compuerta="presentes"), pagina(
    1, "Bienvenida", "Hoy haces tu primer <em>video con IA</em>",
    "OpenMontage convierte una idea en un video completo: guion, voz, música, imágenes y edición. Tú decides qué se hace; el asistente lo produce.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Instalar</b><span>Preparamos OpenMontage en tu computadora con un solo comando.</span></div></li>
    <li><span class="num">2</span><div><b>Entender el flujo</b><span>Investigación, guion, recursos, edición y render. Cada etapa deja archivos a la vista.</span></div></li>
    <li><span class="num">3</span><div><b>Hacer tu primer video</b><span>Un prompt en lenguaje simple y el asistente trabaja por etapas.</span></div></li>
  </ol>
  <p class="calma">Vamos a tu ritmo. Si algo no funciona a la primera, es normal: lo resolvemos juntos.</p>""")))

# 2 · Qué es OpenMontage
ESC.append(("02-que-es", dict(titulo="Qué es OpenMontage", fase="conceptualizacion", paso="flujo", duracion_min=10, compuerta="presentes"), pagina(
    2, "Qué es OpenMontage", "Qué es <em>OpenMontage</em>",
    "Un sistema de producción de video que corre dentro de tu asistente de IA (Claude Code, Codex, Cursor u otros).",
    """  <div class="rejilla tres">
    <article class="tarjeta"><span class="rubro">Tú</span><h2>Decides</h2><p class="para">La idea, el tono, la duración y qué te gusta o no.</p></article>
    <article class="tarjeta"><span class="rubro">El asistente</span><h2>Investiga y escribe</h2><p class="para">Busca información, arma el guion y elige los recursos.</p></article>
    <article class="tarjeta"><span class="rubro">El sistema</span><h2>Produce</h2><p class="para">Genera voz, imágenes, música y arma el video final.</p></article>
  </div>
  <div class="tarjeta" style="margin-top:16px"><h2>Pipelines: recetas de producción</h2><p class="para">Por ejemplo: un explicador animado, un video con presentador, un tutorial con pantalla o un montaje documental. Cada receta indica las etapas y las revisiones.</p></div>
  <p class="calma">Regla de oro: el asistente no inventa datos. Cada afirmación del video se revisa antes de publicarlo.</p>""")))

# 3 · Instalar
ESC.append(("03-instalar", dict(titulo="Instalar OpenMontage", fase="experimentacion", paso="instalar", duracion_min=20, compuerta="lo_logre"), pagina(
    3, "Instalar OpenMontage", "Instala <em>OpenMontage</em>",
    "Necesitas Python, Node.js y FFmpeg. Copia el comando, pégalo en la terminal dentro de la carpeta del proyecto y espera.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Verifica FFmpeg</b><span>Si no lo tienes, instálalo desde ffmpeg.org o con Homebrew.</span></div></li>
    <li><span class="num">2</span><div><b>Descarga el proyecto</b><span>Desde el repositorio oficial de OpenMontage.</span></div></li>
  </ol>
  <h2 style="margin:22px 0 8px;font-size:20px">Comando de instalación</h2>""" + bloque_cmd("c-instalar", "make setup") + """
  <h2 style="margin:22px 0 8px;font-size:20px">Si no tienes «make»</h2>""" + bloque_cmd("c-instalar2", "python3 -m venv .venv && source .venv/bin/activate && python -m pip install -r requirements.txt && cd remotion-composer && npm install && cd .. && python -m pip install piper-tts") + """
  <p class="cuidado">En Windows, el comando es distinto: pídele al asistente que lo adapte a PowerShell.</p>""")))

# 4 · Tu primer video
PROMPTS = [
    ("Explicador animado", "Make a 60-second animated explainer about how neural networks learn"),
    ("Montaje documental", "Make a 75-second documentary montage about city life in the rain. Use real footage only, no narration, elegiac tone, with music."),
]
ESC.append(("04-primer-video", dict(titulo="Tu primer video", fase="experimentacion", paso="prompt", duracion_min=30, compuerta="lo_logre"), pagina(
    4, "Tu primer video", "Tu <em>primer video</em>",
    "Pídele a tu asistente un video en lenguaje simple. Empieza corto: uno de 60 segundos.",
    "\n".join(f"""  <div class="tarjeta"><span class="rubro">{e(t)}</span><pre class="om-prompt" id="p{i}">{e(p)}</pre><div class="fila"><button class="boton" type="button" data-copiar-de="p{i}">Copiar este prompt {ICONO}</button></div></div>""" for i, (t, p) in enumerate(PROMPTS))
    + """
  <p class="calma">Cuando el asistente pregunte algo (duración, tono, voz), responde en una frase. Así avanza solo.</p>""")))

# 5 · El flujo
ESC.append(("05-el-flujo", dict(titulo="El flujo de producción", fase="reflexion", paso="flujo", duracion_min=15, compuerta="presentes"), pagina(
    5, "El flujo de producción", "Así se hace un <em>video</em>, paso a paso",
    "Cada etapa escribe sus archivos. Puedes abrirlos y corregirlos antes de seguir.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Investigación</b><span>Qué dice el tema y qué fuentes se usan.</span></div></li>
    <li><span class="num">2</span><div><b>Guion</b><span>Escenas, texto y tiempos. Tú lo apruebas antes de producir.</span></div></li>
    <li><span class="num">3</span><div><b>Recursos</b><span>Voz, imágenes, música y clips, con su origen anotado.</span></div></li>
    <li><span class="num">4</span><div><b>Edición y render</b><span>Se arma el video y se exporta el archivo final.</span></div></li>
  </ol>
  <div class="tarjeta" style="margin-top:16px"><h2>Backlot: el tablero del proyecto</h2><p class="para">Muestra en qué etapa va tu video y qué archivos ya existen. Ábrelo cuando el asistente empiece un proyecto.</p></div>""")))

# 6 · Cierre
ESC.append(("06-cierre", dict(titulo="Tu tarea y lo que sigue", fase="reflexion", paso="preguntar", duracion_min=5, compuerta="presentes"), pagina(
    6, "Tu tarea y lo que sigue", "Tu tarea, en <em>tres pasos</em>",
    "Lo que hiciste hoy es la base de todo lo que sigue.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Instala OpenMontage</b><span>Con el comando de la escena 3.</span></div></li>
    <li><span class="num">2</span><div><b>Haz tu primer video de 60 segundos</b><span>Con un tema tuyo, no el del ejemplo.</span></div></li>
    <li><span class="num">3</span><div><b>Sube el archivo final a la tarea</b><span>Y cuéntanos en el hilo qué te pareció el resultado.</span></div></li>
  </ol>
  <p class="calma">Próxima clase, domingo 22 a las 9:00 p. m.: guion, voz y música. ¡Buen trabajo hoy!</p>""")))

def yaml(id_, m):
    l = [f"id: {id_}", f'titulo: "{m["titulo"]}"', f"fase: {m['fase']}", f"paso: {m['paso']}", f"duracion_min: {m['duracion_min']}",
         "lo_logre: true", "evidencia: ninguna", "umbral_pct: 80", f"compuerta: {m['compuerta']}"]
    return "\n".join(l) + "\n"

if __name__ == "__main__":
    for id_, meta, pag in ESC:
        d = LIVE / id_; d.mkdir(parents=True, exist_ok=True)
        (d / "escena.html").write_text(pag, encoding="utf-8")
        (d / "escena.yaml").write_text(yaml(id_, meta), encoding="utf-8")
        print("ok", id_)
