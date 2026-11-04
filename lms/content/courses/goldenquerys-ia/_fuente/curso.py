#!/usr/bin/env python3
"""Genera el curso «GoldenQuerys con IA» del LMS: course.yaml, la lección gq-01 y sus escenas LIVE.

    python3 _fuente/curso.py

Las escenas reutilizan la plantilla del modo LIVE (programacion-agentica-g6/live/_plantilla/escena.html): mismos
tokens, cielo y animaciones; aquí solo cambian título, fase, número, contenido y estilos propios. Las bases y el kit
los arma _fuente/sembrar.py + _fuente/empaquetar.sh (materials/goldenquerys-kit.zip).
"""
import json
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent
CURSO = AQUI.parent
PLANTILLA = CURSO.parent / "programacion-agentica-g6" / "live" / "_plantilla" / "escena.html"
CURSO_ID = "goldenquerys-ia"
COHORTE = "goldenquerys-1"
LECCION = "gq-01"
INICIO = "2026-11-03T21:35:00-05:00"
KIT_URL = "https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/goldenquerys-ia/materials/goldenquerys-kit.zip"
CMD_KIT = (f"curl -fsSL -o /tmp/gq.zip {KIT_URL} && unzip -oq /tmp/gq.zip -d /trabajo "
           "&& sh /trabajo/goldenquerys/arrancar.sh")

GIROS = [
    ("botica", "Botica", "4 sedes en Lima · stock, recetas y vencimientos", "#0b8a5f"),
    ("polleria", "Pollería", "salón y delivery · fines de semana de fuego", "#c2410c"),
    ("ferreteria", "Ferretería", "crédito a maestros de obra · cobranzas", "#475569"),
    ("academia", "Academia", "matrículas, pensiones y morosidad", "#5a49d6"),
    ("courier", "Courier", "envíos por zona · tiempos e incidencias", "#a4185c"),
]

FASES = {"experiencia": ("ec", "Experiencia"), "reflexion": ("or", "Reflexión"),
         "conceptualizacion": ("ca", "Conceptos"), "experimentacion": ("ea", "Aplicación")}

ORO = """
:root { --oro: #b07a00; --oro-2: #e3a91a; --oro-bg: rgba(176,122,0,.12); }
:root[data-tema="dark"] { --oro: #f2c14e; --oro-2: #ffd978; --oro-bg: rgba(242,193,78,.14); }
@media (prefers-color-scheme: dark) { :root:not([data-tema="light"]) { --oro: #f2c14e; --oro-2: #ffd978; --oro-bg: rgba(242,193,78,.14); } }
.esc-titulo em.oro { background: linear-gradient(100deg, var(--oro), var(--oro-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.gq-giros { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1vw; }
.gq-giro { background: var(--s1); border: 1px solid var(--line); border-top: .35em solid var(--c); border-radius: .9em; padding: .8em .9em; box-shadow: var(--card-shadow); }
.gq-giro b { display: block; font-size: 1em; }
.gq-giro span { display: block; color: var(--muted); font-size: .66em; margin-top: .25em; line-height: 1.35; }
.gq-giro code { display: block; margin-top: .55em; font: 600 .6em var(--mono); color: var(--c); }
.gq-pasos { display: grid; gap: .8vh; counter-reset: p; margin: 0; padding: 0; list-style: none; }
.gq-pasos li { counter-increment: p; display: grid; grid-template-columns: 2.1em 1fr; gap: .7em; align-items: start; background: var(--s1); border: 1px solid var(--line); border-radius: .8em; padding: .6em .9em; font-size: .86em; }
.gq-pasos li::before { content: counter(p); display: grid; place-items: center; width: 1.8em; height: 1.8em; border-radius: 50%; background: var(--oro-bg); color: var(--oro); font-weight: 800; }
.gq-pasos small { display: block; color: var(--muted); font-size: .82em; margin-top: .15em; }
.gq-pedido { background: #14122b; color: #f3eedc; border: 1px solid rgba(242,193,78,.35); border-radius: .9em; padding: .9em 1.1em; font: 500 .74em/1.55 var(--mono); }
.gq-pedido::before { content: "Pídele a DeepSeek Harness"; display: block; font: 800 .8em system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #f2c14e; margin-bottom: .45em; }
.gq-flujo { display: flex; align-items: stretch; gap: .6vw; }
.gq-flujo > div { flex: 1; background: var(--s1); border: 1px solid var(--line); border-radius: .9em; padding: .7em .8em; text-align: center; box-shadow: var(--card-shadow); }
.gq-flujo > i { align-self: center; color: var(--oro); font-style: normal; font-weight: 800; font-size: 1.3em; }
.gq-flujo b { display: block; font-size: .9em; }
.gq-flujo span { display: block; color: var(--muted); font-size: .64em; margin-top: .2em; }
.gq-tec { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1vw; }
.gq-tec .esc-card h3 { color: var(--oro); }
.gq-tec code { font: 600 .7em var(--mono); display: block; margin-top: .5em; color: var(--fg); background: var(--s2); border-radius: .5em; padding: .35em .5em; overflow-wrap: anywhere; }
.gq-grande { font-size: 1.35em; font-weight: 700; line-height: 1.3; max-width: 34em; margin: 0; }
.gq-grande em { font-style: normal; color: var(--oro); }
.gq-reto { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1vw; }
.gq-reto .esc-card { border-top: .3em solid var(--oro); }
"""


def plantilla():
    return PLANTILLA.read_text(encoding="utf-8")


def escena_html(titulo, fase, numero, cuerpo, nota, propio=""):
    html = plantilla()
    ph, nombre = FASES[fase]
    html = re.sub(r"<title>.*?</title>", f"<title>Escena · {titulo}</title>", html, count=1, flags=re.S)
    html = re.sub(r"<!--\s*PLANTILLA DE ESCENA.*?-->", "<!-- Escena del modo LIVE: GoldenQuerys con IA (gq-01). -->", html, count=1, flags=re.S)
    html = html.replace("/* Estilos propios de esta escena (solo aquí). */", ORO + propio)
    html = html.replace('<span class="esc-fase" data-ph="ec">Experiencia</span>', f'<span class="esc-fase" data-ph="{ph}">{nombre}</span>')
    html = html.replace('<span class="esc-num">Grupo 5 · E00</span>', f'<span class="esc-num">GoldenQuerys · E{numero:02d}</span>')
    i = html.index('<main class="esc-cuerpo">')
    j = html.index("</main>", i)
    html = html[:i] + '<main class="esc-cuerpo">\n' + cuerpo + "\n  " + html[j:]
    html = html.replace('<span class="esc-nota">Pulsa «Lo logré» en el panel cuando termines</span>', f'<span class="esc-nota">{nota}</span>')
    return html


def giros_html(con_archivo=True):
    out = ['<div class="gq-giros">']
    for i, (slug, nombre, desc, color) in enumerate(GIROS):
        archivo = f"<code>{slug}.sqlite</code>" if con_archivo else ""
        out.append(f'<div class="gq-giro a-in" style="--c:{color};--d:{.15 + i * .08:.2f}s"><b>{nombre}</b><span>{desc}</span>{archivo}</div>')
    out.append("</div>")
    return "\n".join(out)


PEDIDOS = {
    "03": f"Ejecuta este comando y dime qué imprimió: {CMD_KIT} . Luego lee /trabajo/goldenquerys/LEEME.md y explícame en 5 líneas qué negocio hay en cada una de las 5 bases.",
    "04": "Lee /trabajo/goldenquerys/AGENTS.md. Con la base botica.sqlite responde: ¿qué 10 productos dejaron más soles en 2026 y en qué sede se vendieron más? Escribe la consulta SQL, pruébala con curl contra http://127.0.0.1:8766/api/consulta y guárdala en /trabajo/goldenquerys/consultas/top10-botica.sql con un comentario que explique la pregunta.",
    "05": "Lee /trabajo/goldenquerys/AGENTS.md. Crea /trabajo/goldenquerys/reportes/tablero-polleria.html: un tablero dinámico de polleria.sqlite con filtros de rango de fechas y sede, 3 indicadores (ventas en soles, ticket promedio, % de pedidos delivery) y 2 gráficos con Chart.js que se recalculan al cambiar los filtros llamando a /api/consulta. Pruébalo y dime qué abrir en el visor.",
    "06": "Toma /trabajo/goldenquerys/consultas/top10-botica.sql y renderízala en 3 tecnologías con los renderers de /trabajo/goldenquerys/renderers: Python (HTML con gráfico SVG), Bun (Markdown y CSV) y Node (JSON). Dime en qué archivo quedó cada salida y qué tecnología usarías para enviarle el reporte a un gerente.",
    "07": "Soy dueño de una ferretería (ferreteria.sqlite). Propón 3 preguntas de oro que mi negocio debería hacerse esta semana y que la base pueda responder, respóndelas con SQL y arma /trabajo/goldenquerys/reportes/reto.html con un indicador y un gráfico por pregunta. Al final dame 3 decisiones concretas que tomarías con esos números.",
}

ESCENAS = [
    dict(id="01-bienvenida", titulo="Tus datos ya saben la respuesta", fase="experiencia", dur=5, lo_logre=True, compuerta="presentes", umbral=100,
         cuerpo=f"""    <h1 class="esc-titulo a-in">Tus datos ya saben la respuesta.<br><em class="oro">Hoy aprendes a preguntarles.</em></h1>
    <p class="esc-sub a-in" style="--d:.12s">Cinco negocios reales, cinco bases SQLite y una IA que convierte tu pregunta en español en un reporte que se actualiza solo. En 85 minutos sales con tu propio tablero.</p>
{giros_html(False)}
    <div class="gq-flujo a-in" style="--d:.6s"><div><b>Pregunta</b><span>«¿qué producto me deja más?»</span></div><i>→</i><div><b>SQL</b><span>lo escribe la IA, tú lo verificas</span></div><i>→</i><div><b>Reporte</b><span>tabla, gráfico, Excel, Python, Bun, Node</span></div><i>→</i><div><b>Decisión</b><span>la parte que vale oro</span></div></div>""",
         nota="Pulsa «Lo logré» para marcar tu asistencia"),
    dict(id="02-cinco-bases", titulo="Cinco negocios, cinco bases", fase="conceptualizacion", dur=5,
         cuerpo=f"""    <h1 class="esc-titulo a-in">Una <em class="oro">golden query</em> es la pregunta que cambia una decisión</h1>
    <p class="esc-sub a-in" style="--d:.1s">No es la consulta más larga: es la que el dueño necesitaba y nadie le respondía. Cada base trae ventas de enero 2025 a octubre 2026, con temporadas y algún dato sucio a propósito.</p>
{giros_html(True)}
    <ul class="esc-lista a-in" style="--d:.6s"><li>Solo lectura: la IA consulta, nunca borra ni modifica una base.</li><li>Cada número que veas debe poder explicarse con su SQL.</li><li>Si un dato se ve raro, puede ser un dato sucio: pregúntale a la IA por qué.</li></ul>""",
         nota="Mira las cinco y elige el negocio que más se parece al tuyo"),
    dict(id="03-preparar", titulo="Prepara tu estudio de reportes", fase="experiencia", dur=10, lo_logre=True, compuerta="lo_logre", umbral=80, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["03"]), ("Terminal · bajar y arrancar el kit", CMD_KIT),
                   ("Comprobar que el servidor responde", "curl -s localhost:8766/api/salud"), ("Abrir en el visor: goldenquerys/index.html", "")],
         cuerpo=f"""    <h1 class="esc-titulo a-in">Tu estudio de reportes, <em class="oro">listo en un minuto</em></h1>
    <ol class="gq-pasos a-in" style="--d:.12s">
      <li><span><b>Abre DeepSeek Harness</b> (el panel se abre solo a la derecha). En «Choose workspace» toca <b>trabajo</b> y luego <b>Open</b>.</span></li>
      <li><span><b>Copia el pedido de esta escena</b> con el botón de la barra y pégalo en el chat.<small>La IA baja el kit, descomprime las 5 bases y arranca el servidor de reportes.</small></span></li>
      <li><span><b>Mira el visor:</b> escribe <code>goldenquerys/index.html</code> en su barra.<small>¿Sin IA? Pega el comando «Terminal · bajar y arrancar el kit» en la pestaña Terminal.</small></span></li>
    </ol>
    <div class="gq-pedido a-in" style="--d:.4s">Ejecuta el comando del kit y explícame en 5 líneas qué negocio hay en cada una de las 5 bases.</div>""",
         nota="Pulsa «Lo logré» cuando el visor muestre GoldenQuerys"),
    dict(id="04-primera-golden-query", titulo="Tu primera golden query", fase="experiencia", dur=15, lo_logre=True, compuerta="lo_logre", umbral=70, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["04"]),
                   ("Probar una consulta a mano", "curl -s 'localhost:8766/api/consulta?db=botica&sql=SELECT%20name%20FROM%20sqlite_master%20WHERE%20type%3D%27table%27'")],
         cuerpo="""    <h1 class="esc-titulo a-in">Pregunta en español, <em class="oro">verifica en SQL</em></h1>
    <div class="esc-grid-2 a-in" style="--d:.1s">
      <ol class="gq-pasos">
        <li><span><b>En el estudio</b> elige <b>Botica</b> y pulsa una pregunta de ejemplo.<small>Mira cómo la misma respuesta sale en tabla y en gráfico.</small></span></li>
        <li><span><b>Pídele a la IA</b> los 10 productos que más soles dejaron en 2026.<small>Copia el pedido de la escena desde la barra del panel.</small></span></li>
        <li><span><b>Desconfía con método:</b> pega su SQL en el estudio y comprueba el total.<small>Si no cuadra, pídele que te explique cada JOIN.</small></span></li>
      </ol>
      <div class="gq-pedido">¿Qué 10 productos dejaron más soles en 2026 y en qué sede se vendieron más? Escribe la SQL, pruébala con curl y guárdala en consultas/top10-botica.sql.</div>
    </div>
    <p class="gq-grande a-in" style="--d:.5s">La IA escribe la consulta. <em>Tú firmas el número.</em></p>""",
         nota="Pulsa «Lo logré» cuando tu consulta corra en el estudio"),
    dict(id="05-reporte-dinamico", titulo="Un reporte que se arma solo", fase="experimentacion", dur=20, lo_logre=True, compuerta="lo_logre", umbral=70, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["05"]), ("Abrir en el visor: goldenquerys/reportes/tablero-polleria.html", ""),
                   ("Ver lo que pide el tablero al servidor", "tail -n 15 /trabajo/goldenquerys.log")],
         cuerpo="""    <h1 class="esc-titulo a-in">De consulta a <em class="oro">tablero dinámico</em></h1>
    <div class="gq-flujo a-in" style="--d:.1s"><div><b>Filtros</b><span>fechas · sede</span></div><i>→</i><div><b>/api/consulta</b><span>SQL de solo lectura</span></div><i>→</i><div><b>3 indicadores</b><span>ventas · ticket · % delivery</span></div><i>→</i><div><b>2 gráficos</b><span>Chart.js, se recalculan</span></div></div>
    <div class="gq-pedido a-in" style="--d:.35s">Crea reportes/tablero-polleria.html con filtros de fechas y sede, 3 indicadores y 2 gráficos que se recalculan al cambiar los filtros llamando a /api/consulta.</div>
    <ul class="esc-lista a-in" style="--d:.55s"><li>Mira el visor mientras la IA trabaja: se refresca solo cuando termina de guardar.</li><li>Cambia un filtro y mira el log: cada cambio es una consulta nueva.</li><li>Pídele una mejora más: «agrega el Día del Padre como línea vertical».</li></ul>""",
         nota="Pulsa «Lo logré» cuando tu tablero cambie con los filtros"),
    dict(id="06-cuatro-tecnologias", titulo="El mismo dato, cuatro tecnologías", fase="reflexion", dur=10, lo_logre=True, compuerta="lo_logre", umbral=60, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["06"]),
                   ("Python · HTML con gráfico SVG", "cd /trabajo/goldenquerys && python3 renderers/reporte.py botica"),
                   ("Bun · Markdown y CSV", "cd /trabajo/goldenquerys && bun renderers/reporte.ts botica"),
                   ("Node · JSON", "cd /trabajo/goldenquerys && node renderers/reporte.mjs botica")],
         cuerpo="""    <h1 class="esc-titulo a-in">Una consulta, <em class="oro">muchas salidas</em></h1>
    <div class="gq-tec a-in" style="--d:.1s">
      <div class="esc-card"><h3>Navegador</h3><p>Tabla, Chart.js, Excel (SheetJS), CSV y Markdown desde el estudio.</p><code>goldenquerys/index.html</code></div>
      <div class="esc-card"><h3>Python</h3><p>Reporte HTML autónomo con gráfico SVG: se manda por correo tal cual.</p><code>python3 renderers/reporte.py botica</code></div>
      <div class="esc-card"><h3>Bun y Node</h3><p>Markdown, CSV y JSON para otra app, un bot o una API.</p><code>bun renderers/reporte.ts botica</code></div>
    </div>
    <p class="gq-grande a-in" style="--d:.45s">¿Qué le mandarías al gerente, al contador y a otra app? <em>Elige la salida por quien la va a leer.</em></p>""",
         nota="Pulsa «Lo logré» cuando tengas dos salidas distintas del mismo dato"),
    dict(id="07-reto-de-oro", titulo="Reto: tres preguntas de oro", fase="experimentacion", dur=15, lo_logre=True, compuerta="lo_logre", umbral=60, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido (cambia el giro si quieres)", PEDIDOS["07"]), ("Abrir en el visor: goldenquerys/reportes/reto.html", "")],
         cuerpo="""    <h1 class="esc-titulo a-in">Reto: <em class="oro">tres preguntas que valen oro</em></h1>
    <div class="gq-reto a-in" style="--d:.1s">
      <div class="esc-card"><h3>1 · Pregunta</h3><p>Elige un giro y pide a la IA tres preguntas que el dueño debería hacerse esta semana.</p></div>
      <div class="esc-card"><h3>2 · Responde</h3><p>Cada pregunta con su SQL, un indicador y un gráfico en reportes/reto.html.</p></div>
      <div class="esc-card"><h3>3 · Decide</h3><p>Tres decisiones concretas con esos números. Sin decisión, no hay oro.</p></div>
    </div>
    <p class="gq-grande a-in" style="--d:.4s">Los mejores tableros se muestran en pantalla al final. <em>Tu instructor está mirando el tuyo.</em></p>""",
         nota="Pulsa «Lo logré» cuando tu reto muestre las tres respuestas"),
    dict(id="08-cierre", titulo="Lo que te llevas hoy", fase="experimentacion", dur=5,
         cuerpo="""    <h1 class="esc-titulo a-in">Hoy pasaste de <em class="oro">tener datos</em> a <em class="oro">tener respuestas</em></h1>
    <ul class="esc-lista a-in" style="--d:.12s">
      <li>5 bases de negocios reales y un servidor de reportes de solo lectura.</li>
      <li>Consultas escritas por IA y verificadas por ti.</li>
      <li>Un tablero dinámico y el mismo dato en navegador, Python, Bun y Node.</li>
      <li>Tres preguntas de oro con sus decisiones.</li>
    </ul>
    <p class="gq-grande a-in" style="--d:.4s">Mañana hazle la misma pregunta a los datos de tu trabajo. <em>Ese es el verdadero reto.</em></p>""",
         nota="Guarda tu carpeta goldenquerys: es tu portafolio de reportes"),
]


def escribir_escenas():
    base = CURSO / "live" / LECCION
    for n, e in enumerate(ESCENAS, 1):
        d = base / e["id"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "escena.html").write_text(escena_html(e["titulo"], e["fase"], n, e["cuerpo"], e["nota"]), encoding="utf-8")
        y = [f"id: {e['id']}", f"titulo: {json.dumps(e['titulo'], ensure_ascii=False)}", f"fase: {e['fase']}", 'paso: ""',
             f"duracion_min: {e['dur']}", f"lo_logre: {'true' if e.get('lo_logre') else 'false'}", "evidencia: ninguna"]
        if e.get("umbral"):
            y.append(f"umbral_pct: {e['umbral']}")
        y.append(f"compuerta: {e.get('compuerta', 'ninguna')}")
        if e.get("dsh"):
            y.append("dsh: true")
        if e.get("comandos"):
            y.append("comandos:")
            for t, c in e["comandos"]:
                y.append(f"  - titulo: {json.dumps(t, ensure_ascii=False)}")
                y.append(f"    cmd: {json.dumps(c, ensure_ascii=False)}")
        (d / "escena.yaml").write_text("\n".join(y) + "\n", encoding="utf-8")


def escribir_curso():
    (CURSO / "course.yaml").write_text(f"""id: {CURSO_ID}
title: "GoldenQuerys con IA: genera reportes dinámicamente"
description: >
  Pregúntale a tus datos en español y obtén reportes que se actualizan solos. Trabajas con cinco bases
  SQLite de negocios peruanos (botica, pollería, ferretería, academia y courier), una IA que escribe y
  explica el SQL, y un estudio de reportes que muestra el mismo resultado en tabla, gráfico, Excel, CSV,
  Markdown, Python, Bun y Node. Todo en tu navegador, sin instalar nada.
cohorts: [{COHORTE}]
proyecto_final: >
  Un tablero dinámico con tres preguntas de oro de un negocio, cada una con su SQL verificada, su
  indicador, su gráfico y la decisión que tomarías.
requisitos:
  - Una laptop con Chrome o Edge (todo corre en tu aula del LMS)
  - Ganas de preguntarle cosas a los datos; no hace falta saber SQL
dedicacion: "1 sesión en vivo de 85 minutos"
modules:
  - id: gq
    title: "GoldenQuerys · reportes dinámicos con IA"
    lessons: [{LECCION}]
agenda: {{nombre: "GoldenQuerys con IA", grupo: "Grupo 1", area: datos, minutos: 85}}
""", encoding="utf-8")


def escribir_leccion():
    d = CURSO / "lessons"
    d.mkdir(exist_ok=True)
    (d / f"{LECCION}-reportes-dinamicos.md").write_text(f"""---
id: {LECCION}
starts_at: {INICIO}
duration: 85
title: "GoldenQuerys con IA: genera reportes dinámicamente"
published: true
objectives:
  - id: {LECCION}-o1
    title: Preguntar en español a cinco bases SQLite de negocios reales y verificar el SQL que escribe la IA
  - id: {LECCION}-o2
    title: Construir con IA un tablero dinámico con filtros, indicadores y gráficos
  - id: {LECCION}-o3
    title: Renderizar el mismo resultado en navegador, Excel, Python, Bun y Node y elegir la salida según quién la lee
recording:
  url: ""
  passcode: ""
materials:
  - id: {LECCION}-kit
    title: goldenquerys-kit.zip · las 5 bases, el servidor de reportes, el estudio y los renderers
    kind: zip
    file: materials/goldenquerys-kit.zip
    objective_ids: [{LECCION}-o1, {LECCION}-o2, {LECCION}-o3]
  - id: {LECCION}-chartjs
    title: Chart.js · documentación
    kind: doc
    url: https://www.chartjs.org/docs/latest/
    objective_ids: [{LECCION}-o2]
  - id: {LECCION}-sqlite
    title: SQLite · funciones de fecha
    kind: doc
    url: https://www.sqlite.org/lang_datefunc.html
    objective_ids: [{LECCION}-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo al LIVE o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: preparar
    title: Preparar el estudio
    tool: lms
    phase: experiencia
    description: Desde el LIVE, pide a DeepSeek Harness que baje y arranque el kit; abre goldenquerys/index.html en el visor.
    check: El visor muestra el estudio GoldenQuerys con las 5 bases
  - id: tablero
    title: Tablero dinámico
    tool: lms
    phase: experimentacion
    description: Construye con la IA un tablero con filtros que se recalcula llamando a /api/consulta.
    check: reportes/tablero-polleria.html cambia al mover los filtros
  - id: reto
    title: Tres preguntas de oro
    tool: lms
    phase: experimentacion
    description: Elige un giro, responde tres preguntas con SQL verificada y escribe la decisión que tomarías.
    check: reportes/reto.html muestra las tres respuestas y sus decisiones
---

## Avance de la clase

Tus datos ya saben la respuesta: hoy aprendes a preguntarles.
Trabajas con cinco bases SQLite de negocios peruanos y una IA que escribe el SQL por ti.
Tú haces lo que una IA no puede: decidir qué pregunta vale oro y comprobar que el número es correcto.

### Bloques (85 minutos)

- 0:00 a 0:10 · Bienvenida y las cinco bases.
- 0:10 a 0:20 · Preparar el estudio en tu aula.
- 0:20 a 0:35 · Tu primera golden query.
- 0:35 a 0:55 · Un tablero dinámico.
- 0:55 a 1:05 · El mismo dato en cuatro tecnologías.
- 1:05 a 1:20 · Reto: tres preguntas de oro.
- 1:20 a 1:25 · Cierre.

## 1. Preparar el estudio · Experiencia

En una frase: bajas el kit a tu aula y arrancas el servidor de reportes.

**Qué vas a hacer**
1. En el LIVE, abre **DeepSeek Harness** (se abre solo en el panel). En «Choose workspace» toca **trabajo** y luego **Open**.
2. Pulsa «Copiar el pedido de esta escena» y pégalo en el chat.
3. Si prefieres la terminal:
   ```sh
   {CMD_KIT}
   ```
4. En el visor escribe `goldenquerys/index.html`.

**Qué vas a ver:** el estudio GoldenQuerys con cinco bases: botica, pollería, ferretería, academia y courier.

**Si falla:** `curl -s localhost:8766/api/salud` debe responder `"ok": true`. Si no, corre otra vez `sh /trabajo/goldenquerys/arrancar.sh`.

## 2. Tu primera golden query · Experiencia

En una frase: la IA escribe la consulta y tú firmas el número.

**Qué vas a hacer**
1. En el estudio elige Botica y ejecuta una pregunta de ejemplo.
2. Pide a la IA los 10 productos que más soles dejaron en 2026.
3. Pega su SQL en el estudio y comprueba el total.

## 3. Tablero dinámico · Aplicación

En una frase: un reporte con filtros que consulta la base cada vez que lo mueves.

Pide a la IA `reportes/tablero-polleria.html` con filtros de fecha y sede, tres indicadores y dos gráficos.

## 4. Cuatro tecnologías · Reflexión

```sh
cd /trabajo/goldenquerys
python3 renderers/reporte.py botica
bun renderers/reporte.ts botica
node renderers/reporte.mjs botica
```

¿Qué salida le mandarías al gerente, al contador y a otra app?

## Tarea · Aplicación

Elige un giro y entrega `reportes/reto.html` con tres preguntas de oro, su SQL, un gráfico por pregunta y la decisión que tomarías.
""", encoding="utf-8")


if __name__ == "__main__":
    escribir_curso()
    escribir_leccion()
    escribir_escenas()
    print("curso, lección y", len(ESCENAS), "escenas escritos en", CURSO)
