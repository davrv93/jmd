#!/usr/bin/env python3
"""Genera el curso «GoldenQuerys con IA» del LMS: course.yaml, la lección gq-01 y sus escenas LIVE.

    python3 _fuente/curso.py

Las escenas reutilizan la plantilla del modo LIVE (programacion-agentica-g6/live/_plantilla/escena.html): mismos
tokens, cielo y animaciones; aquí solo cambian título, fase, número, contenido y estilos propios. Las bases y el kit
los arma _fuente/sembrar.py + _fuente/empaquetar.sh (materials/goldenquerys-kit.zip).
"""
import base64
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
def cmd_kit(negocio="botica"):
    return (f"curl -fsSL -o /tmp/gq.zip {KIT_URL} && unzip -oq /tmp/gq.zip -d /trabajo "
            f"&& echo {negocio} > /trabajo/goldenquerys/MI_NEGOCIO.txt && sh /trabajo/goldenquerys/arrancar.sh")

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
.gq-elige .gq-giro { font: inherit; color: inherit; text-align: left; cursor: pointer; transition: transform .15s ease-out, box-shadow .15s ease-out; }
.gq-elige .gq-giro:hover, .gq-elige .gq-giro:focus-visible { transform: translateY(-.4vh); outline: 2px solid var(--c); outline-offset: 2px; }
.gq-elige .gq-giro[aria-pressed="true"] { outline: 3px solid var(--c); background: color-mix(in srgb, var(--c) 10%, var(--s1)); }
.gq-aviso { margin: 0; font-size: .82em; color: var(--muted); }
.gq-aviso b { color: var(--fg); }
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


def pedido_inicio(slug, nombre):
    return (f"Mi negocio es: {nombre} (base {slug}). Ejecuta este comando y dime qué imprimió: {cmd_kit(slug)} . "
            f"Luego lee goldenquerys/AGENTS.md y goldenquerys/skill-dashboard/SKILL.md, consulta "
            f"curl -s \"localhost:8766/api/esquema?db={slug}\" y explícame en 4 líneas qué datos tiene mi negocio.")


PEDIDOS = {
    "plan": "Lee goldenquerys/MI_NEGOCIO.txt y goldenquerys/skill-dashboard/SKILL.md. Completa goldenquerys/PLAN_TRABAJO.md con mi negocio (reemplaza <<NEGOCIO>>) y haz solo la tarea T1: explora mi base con /api/esquema y dime las 3 tablas clave y cómo se relacionan. Ejecuta su criterio y márcala hecha.",
    "preguntas": "Tarea T2 del plan. Propónme 5 preguntas de negocio que mi base pueda responder, numeradas y en una línea cada una. No escribas SQL todavía: espera a que yo elija 3.",
    "preguntas2": "Elijo las preguntas __ , __ y __. Escribe su SQL, pruébala con curl contra /api/consulta, explícame cada consulta en una línea y guárdalas en goldenquerys/consultas/. Marca T2 hecha solo si las 3 devuelven filas.",
    "dashboard": "Tareas T3, T4 y T4b del plan: construye goldenquerys/dashboard/index.html siguiendo la receta del skill, con mis 3 preguntas de oro como base de los 3 KPI y los 2 gráficos, filtros de fechas que vuelven a consultar y la caja de pregunta en español (GET /api/pregunta, tarea T4b) que muestra el SQL generado, la tabla y un gráfico. Al terminar dime qué abrir en el visor.",
    "verificar": "Tarea T5: elige un KPI del dashboard, repítelo con curl y compáralo con lo que muestra el visor con los mismos filtros. Si no coincide, encuentra por qué y corrígelo. Luego marca T5 hecha y muéstrame el plan completo.",
}

GIROS_JS = json.dumps({slug: pedido_inicio(slug, nombre) for slug, nombre, _, _ in GIROS}, ensure_ascii=False)

ELEGIR = """    <h1 class="esc-titulo a-in">Elige <em class="oro">tu negocio</em>. Uno solo, para toda la clase.</h1>
    <p class="esc-sub a-in" style="--d:.1s">Toca una tarjeta: se copia tu primer pedido y se abre DeepSeek Harness. Pégalo con Ctrl+V y la IA prepara tu base.</p>
    <div class="gq-giros gq-elige a-in" style="--d:.2s">
""" + "\n".join(
    f'      <button type="button" class="gq-giro" data-negocio="{slug}" style="--c:{color}"><b>{nombre}</b><span>{desc}</span><code>{slug}.sqlite</code></button>'
    for slug, nombre, desc, color in GIROS) + """
    </div>
    <p class="gq-aviso a-in" style="--d:.4s" role="status" aria-live="polite" id="gq-aviso">Primera vez en DeepSeek: «Choose workspace» → <b>trabajo</b> → <b>Open</b>.</p>
  </main>
  <script>
  (function () {
    var P = """ + GIROS_JS + """;
    var aviso = document.getElementById("gq-aviso");
    document.querySelectorAll("[data-negocio]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = b.getAttribute("data-negocio");
        document.querySelectorAll("[data-negocio]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        try { localStorage.setItem("gq.negocio", n); } catch (e) {}
        var listo = function () { aviso.innerHTML = "<b>Copiado.</b> Pégalo en el chat de DeepSeek Harness con Ctrl+V (en Mac, Cmd+V) y envíalo."; };
        if (navigator.clipboard) navigator.clipboard.writeText(P[n]).then(listo, function () { aviso.textContent = P[n]; });
        else aviso.textContent = P[n];
        try { parent.postMessage({ tipo: "abrir-dsh" }, location.origin); } catch (e) {}
      });
    });
  })();
  </script>
  <main hidden>"""

FECHA_CURSO = "martes 10 y 17 de noviembre, de 6:30 a 7:15 p. m."

def sorteo_html():
    """La escena del sorteo es un documento propio (también se publica en /sorteo-goldenquerys): sin la plantilla."""
    d = AQUI / "sorteo"

    def uri(nombre, tipo):
        return f"data:{tipo};base64," + base64.b64encode((d / nombre).read_bytes()).decode()

    html = (d / "sorteo.html").read_text(encoding="utf-8")
    for marca, valor in {"{{ESTADIO}}": uri("estadio.webp", "image/webp"), "{{ARQUERO_LISTO}}": uri("arquero-listo.webp", "image/webp"),
                         "{{ARQUERO_TIRADA}}": uri("arquero-tirada.webp", "image/webp"), "{{FUENTE_TITULO}}": uri("BarlowCondensed-800.woff2", "font/woff2"),
                         "{{FUENTE_TEXTO}}": uri("Barlow-500.woff2", "font/woff2"), "{{FUENTE_FUERTE}}": uri("Barlow-700.woff2", "font/woff2"),
                         "{{FECHA_JSON}}": json.dumps(FECHA_CURSO, ensure_ascii=False), "{{FECHA}}": FECHA_CURSO}.items():
        html = html.replace(marca, valor)
    return html


def fuga_html(archivo="caja.json", video="/fuga-goldenquerys/video.mp4"):
    """Página de la caja fuerte: el texto cifrado sale de caja.json; las palabras nunca pasan por aquí."""
    d = AQUI / "caja"
    caja = json.loads((d / archivo).read_text(encoding="utf-8"))
    fuentes = AQUI / "sorteo"

    def uri(nombre):
        return "data:font/woff2;base64," + base64.b64encode((fuentes / nombre).read_bytes()).decode()

    html = (d / "fuga.html").read_text(encoding="utf-8")
    estadio = "data:image/webp;base64," + base64.b64encode((d / "estadio-fuga.webp").read_bytes()).decode()
    luces = json.loads((d / "luces.json").read_text(encoding="utf-8"))
    for marca, valor in {"{{ESTADIO}}": estadio, "{{LUZ_A}}": luces["a"], "{{LUZ_B}}": luces["b"], "{{VIDEO_URL}}": video, "{{FUENTE_TITULO}}": uri("BarlowCondensed-800.woff2"), "{{FUENTE_TEXTO}}": uri("Barlow-500.woff2"), "{{FUENTE_FUERTE}}": uri("Barlow-700.woff2"),
                         "{{CAJA}}": json.dumps(caja)}.items():
        html = html.replace(marca, valor)
    return html


ESCENAS = [
    dict(id="01-bienvenida", titulo="Tus datos ya saben la respuesta", fase="experiencia", dur=5, lo_logre=True, compuerta="presentes", umbral=100,
         cuerpo=f"""    <h1 class="esc-titulo a-in">Tus datos ya saben la respuesta.<br><em class="oro">Hoy aprendes a preguntarles.</em></h1>
    <p class="esc-sub a-in" style="--d:.12s">Eliges un negocio, le haces preguntas de oro y construyes con una IA el dashboard que su dueño necesita. Tú decides qué preguntar y compruebas cada número; la IA escribe el SQL y el código.</p>
{giros_html(False)}
    <div class="gq-flujo a-in" style="--d:.6s"><div><b>Pregunta</b><span>la decides tú</span></div><i>→</i><div><b>SQL</b><span>la escribe la IA, tú la pruebas</span></div><i>→</i><div><b>Dashboard</b><span>KPI, gráficos y filtros</span></div><i>→</i><div><b>Decisión</b><span>la parte que vale oro</span></div></div>""",
         nota="Pulsa «Lo logré» para marcar tu asistencia"),
    dict(id="02-elige-tu-negocio", titulo="Elige tu negocio", fase="experiencia", dur=5, lo_logre=True, compuerta="lo_logre", umbral=80, dsh=True,
         comandos=[(f"{n} · pedido para pegar en DeepSeek Harness", pedido_inicio(sl, n)) for sl, n, _, _ in GIROS] +
                  [("Terminal · lo mismo sin IA (cambia botica por tu negocio)", cmd_kit("botica"))],
         cuerpo=ELEGIR, nota="Pulsa «Lo logré» cuando la IA te explique qué datos tiene tu negocio"),
    dict(id="03-como-se-pregunta", titulo="Cómo se le pregunta a una base", fase="conceptualizacion", dur=5,
         cuerpo="""    <h1 class="esc-titulo a-in">La IA no adivina: <em class="oro">sigue una receta y un plan</em></h1>
    <div class="gq-tec a-in" style="--d:.1s">
      <div class="esc-card"><h3>El skill</h3><p>Una ficha con la receta del dashboard: qué API usar, cómo probar cada SQL y cómo se ve terminado. Tu agente la lee antes de escribir.</p><code>skill-dashboard/SKILL.md</code></div>
      <div class="esc-card"><h3>El plan de trabajo</h3><p>Cinco tareas cortas, cada una con un criterio de sí o no. Ninguna se marca hecha sin probarla.</p><code>PLAN_TRABAJO.md</code></div>
      <div class="esc-card"><h3>La API</h3><p>Tu base responde por HTTP y solo deja leer: puedes equivocarte sin romper nada.</p><code>/api/esquema · /api/consulta</code></div>
    </div>
    <p class="gq-grande a-in" style="--d:.4s">Tú pones las preguntas y el criterio. <em>La IA pone las manos.</em></p>""",
         nota="Escucha y prepárate: en la siguiente escena trabajas tú"),
    dict(id="04-plan-de-trabajo", titulo="Tu plan de trabajo", fase="experiencia", dur=8, lo_logre=True, compuerta="lo_logre", umbral=70, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["plan"]), ("Ver el plan en la terminal", "cat /trabajo/goldenquerys/PLAN_TRABAJO.md")],
         cuerpo="""    <h1 class="esc-titulo a-in">Primero el plan, <em class="oro">después el código</em></h1>
    <ol class="gq-pasos a-in" style="--d:.12s">
      <li><span><b>Copia el pedido</b> con el botón «Copiar el pedido de esta escena» del panel y pégalo en DeepSeek.</span></li>
      <li><span><b>Lee lo que encontró:</b> las 3 tablas clave de tu negocio y cómo se unen.<small>Si no entiendes una relación, pregúntale: «¿por qué esa columna une esas tablas?».</small></span></li>
      <li><span><b>Abre el plan</b> y revisa que T1 diga <code>hecha</code> y las demás <code>pendiente</code>.</span></li>
    </ol>""",
         nota="Pulsa «Lo logré» cuando T1 esté hecha"),
    dict(id="05-preguntas-de-oro", titulo="Tus tres preguntas de oro", fase="experiencia", dur=15, lo_logre=True, compuerta="lo_logre", umbral=70, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["preguntas"]), ("Segundo pedido (completa los números que elegiste)", PEDIDOS["preguntas2"]),
                   ("Ver tus consultas", "ls /trabajo/goldenquerys/consultas/")],
         cuerpo="""    <h1 class="esc-titulo a-in">La IA propone. <em class="oro">Tú eliges y compruebas.</em></h1>
    <div class="esc-grid-2 a-in" style="--d:.1s">
      <ol class="gq-pasos">
        <li><span><b>Pide 5 preguntas</b> para tu negocio (pedido de la escena).</span></li>
        <li><span><b>Elige 3</b> pensando como el dueño: ¿cuál cambia una decisión de esta semana?</span></li>
        <li><span><b>Segundo pedido:</b> escribe tus 3 números y la IA hace el SQL, lo prueba y lo explica.<small>Está en la ayuda de la escena: «Segundo pedido».</small></span></li>
      </ol>
      <div class="gq-pedido">Elijo las preguntas 1, 3 y 4. Escribe su SQL, pruébala con curl, explícamela en una línea y guárdala en consultas/.</div>
    </div>
    <p class="gq-grande a-in" style="--d:.45s">Una pregunta de oro no es la más difícil: <em>es la que cambia una decisión.</em></p>""",
         nota="Pulsa «Lo logré» cuando tus 3 consultas devuelvan filas"),
    dict(id="06-tu-dashboard", titulo="Construye tu dashboard", fase="experimentacion", dur=25, lo_logre=True, compuerta="lo_logre", umbral=70, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["dashboard"]), ("Abrir en el visor: goldenquerys/dashboard/index.html", ""),
                   ("Si el visor no muestra datos: ver el log de la API", "tail -n 20 /trabajo/goldenquerys.log")],
         cuerpo="""    <h1 class="esc-titulo a-in">Tu dashboard, <em class="oro">en vivo en el visor</em></h1>
    <div class="gq-flujo a-in" style="--d:.1s"><div><b>Filtros</b><span>fecha desde · hasta</span></div><i>→</i><div><b>/api/consulta</b><span>tus 3 preguntas de oro</span></div><i>→</i><div><b>3 KPI</b><span>en soles o en cantidades</span></div><i>→</i><div><b>2 gráficos</b><span>tiempo y ranking</span></div></div>
    <ol class="gq-pasos a-in" style="--d:.3s">
      <li><span><b>Pega el pedido</b> y pulsa «Ocultar escena» en la barra de DeepSeek: tendrás agente y visor a pantalla completa.</span></li>
      <li><span><b>En el visor</b> escribe <code>goldenquerys/dashboard/index.html</code>: se refresca solo cada vez que la IA guarda.</span></li>
      <li><span><b>Pide un cambio a la vez</b> y míralo aparecer: «el ranking como barras horizontales», «el KPI en verde si sube».</span></li>
    </ol>""",
         nota="Pulsa «Lo logré» cuando cambiar las fechas cambie tus números"),
    dict(id="07-verifica", titulo="Verifica y mejora", fase="reflexion", dur=12, lo_logre=True, compuerta="lo_logre", umbral=60, dsh=True,
         comandos=[("DeepSeek Harness · pega este pedido", PEDIDOS["verificar"])],
         cuerpo="""    <h1 class="esc-titulo a-in">Un número sin comprobar <em class="oro">no vale oro</em></h1>
    <div class="gq-reto a-in" style="--d:.1s">
      <div class="esc-card"><h3>1 · Repite</h3><p>Un KPI del dashboard, con curl y los mismos filtros.</p></div>
      <div class="esc-card"><h3>2 · Compara</h3><p>¿Coincide? Si no, la IA busca el porqué: un JOIN que duplica, ventas anuladas, fechas como texto.</p></div>
      <div class="esc-card"><h3>3 · Mejora</h3><p>Pide UNA mejora tuya: la que haría que el dueño lo abra cada mañana.</p></div>
    </div>""",
         nota="Pulsa «Lo logré» cuando tu plan tenga las 5 tareas hechas"),
    dict(id="08-muestra", titulo="Muéstralo", fase="experimentacion", dur=10,
         cuerpo="""    <h1 class="esc-titulo a-in">Hoy pasaste de <em class="oro">tener datos</em> a <em class="oro">tener respuestas</em></h1>
    <ul class="esc-lista a-in" style="--d:.12s">
      <li>Elegiste un negocio y lo exploraste con una API de solo lectura.</li>
      <li>Escogiste tres preguntas de oro y comprobaste su SQL.</li>
      <li>Construiste con IA un dashboard con filtros, y lo verificaste.</li>
      <li>Trabajaste como se trabaja con agentes: skill, plan y criterio.</li>
    </ul>
    <p class="gq-grande a-in" style="--d:.4s">Mañana hazle la misma pregunta a los datos de tu trabajo. <em>Ese es el verdadero reto.</em></p>""",
         nota="El instructor muestra algunos dashboards en pantalla"),
    dict(id="09-sorteo", titulo="Sorteo: patea tu penal", fase="experimentacion", dur=5,
         html_propio=sorteo_html),
    dict(id="10-fuga", titulo="La fuga del estadio", fase="experimentacion", dur=5, oculta=True, html_propio=fuga_html),
    dict(id="11-fuga-yape", titulo="La fuga del estadio", fase="experimentacion", dur=5, oculta=True,
         html_propio=lambda: fuga_html("caja-yape.json", "/fuga-yape/video.mp4")),
]


def escribir_escenas():
    base = CURSO / "live" / LECCION
    for n, e in enumerate(ESCENAS, 1):
        d = base / e["id"]
        d.mkdir(parents=True, exist_ok=True)
        html = e["html_propio"]() if e.get("html_propio") else escena_html(e["titulo"], e["fase"], n, e["cuerpo"], e["nota"])
        (d / "escena.html").write_text(html, encoding="utf-8")
        y = [f"id: {e['id']}", f"titulo: {json.dumps(e['titulo'], ensure_ascii=False)}", f"fase: {e['fase']}", 'paso: ""',
             f"duracion_min: {e['dur']}", f"lo_logre: {'true' if e.get('lo_logre') else 'false'}", "evidencia: ninguna"]
        if e.get("umbral"):
            y.append(f"umbral_pct: {e['umbral']}")
        y.append(f"compuerta: {e.get('compuerta', 'ninguna')}")
        if e.get("oculta"):
            y.append("oculta: true")
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
  Pregúntale a tus datos en español y construye con IA un dashboard que se actualiza solo. Eliges un
  negocio peruano (botica, pollería, ferretería, academia o courier), escoges tres preguntas de oro y
  DeepSeek Harness escribe el SQL y el código siguiendo un skill y un plan de trabajo que tú verificas.
  Todo en tu navegador, sin instalar nada.
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
    title: Trabajar con un agente como un profesional, con un skill y un plan de trabajo de criterios verificables
recording:
  url: ""
  passcode: ""
materials:
  - id: {LECCION}-kit
    title: goldenquerys-kit.zip · las 5 bases, la API de solo lectura, el skill del dashboard y el plan de trabajo
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
    title: Elegir el negocio
    tool: lms
    phase: experiencia
    description: En el LIVE toca tu negocio, pega el pedido en DeepSeek Harness y deja que baje tu base y arranque la API.
    check: La IA te explica qué datos tiene tu negocio
  - id: tablero
    title: Tablero dinámico
    tool: lms
    phase: experimentacion
    description: Construye con la IA tu dashboard con 3 KPI, 2 gráficos y filtros de fecha, siguiendo el skill y el plan.
    check: goldenquerys/dashboard/index.html cambia al mover las fechas
  - id: reto
    title: Tres preguntas de oro
    tool: lms
    phase: experimentacion
    description: Repite un KPI con curl y compáralo con el dashboard; termina las 5 tareas del plan.
    check: PLAN_TRABAJO.md con las 5 tareas hechas
---

## Avance de la clase

Tus datos ya saben la respuesta: hoy aprendes a preguntarles.
Eliges un negocio, le haces tres preguntas de oro y construyes con DeepSeek Harness el dashboard que su dueño necesita.
La IA escribe el SQL y el código; tú decides qué preguntar y compruebas cada número.

### Bloques (85 minutos)

- 0:00 a 0:05 · Bienvenida.
- 0:05 a 0:10 · Elige tu negocio: la IA baja tu base y la arranca.
- 0:10 a 0:15 · Cómo se le pregunta a una base: skill, plan y API.
- 0:15 a 0:23 · Tu plan de trabajo (T1).
- 0:23 a 0:38 · Tus tres preguntas de oro (T2).
- 0:38 a 1:03 · Tu dashboard en el visor (T3 y T4).
- 1:03 a 1:15 · Verifica y mejora (T5).
- 1:15 a 1:25 · Muéstralo.

## 1. Elige tu negocio · Experiencia

En una frase: tocas un negocio en la escena y tu primer pedido queda copiado.

**Qué vas a hacer**
1. En la escena «Elige tu negocio» toca una tarjeta: botica, pollería, ferretería, academia o courier.
2. Se abre DeepSeek Harness. Primera vez: «Choose workspace» → **trabajo** → **Open**.
3. Pega el pedido (Ctrl+V) y envíalo. La IA baja el kit, guarda tu negocio en `MI_NEGOCIO.txt` y arranca la API.

Sin IA, en la terminal (cambia `botica` por tu negocio):
```sh
{cmd_kit("botica")}
```

**Qué vas a ver:** la IA te explica en 4 líneas qué datos tiene tu negocio.

**Si falla:** `curl -s localhost:8766/api/salud` debe responder `"ok": true`; si no, `sh /trabajo/goldenquerys/arrancar.sh`.

## 2. El skill y el plan · Conceptos

- `skill-dashboard/SKILL.md`: la receta del dashboard que tu agente sigue (API, cómo probar el SQL, cómo se ve terminado).
- `PLAN_TRABAJO.md`: cinco tareas, cada una con un criterio de sí o no.

## 3. Preguntas de oro y dashboard · Aplicación

1. T1: explorar la base. 2. T2: la IA propone 5 preguntas, tú eliges 3 y compruebas su SQL.
3. T3 y T4: `dashboard/index.html` con 3 KPI, 2 gráficos y filtros de fecha. Ábrelo en el visor.
4. T5: repite un KPI con curl y compáralo con el dashboard.

## Tarea · Aplicación

Entrega tu carpeta `goldenquerys` con el plan completo, tus 3 consultas y tu dashboard, y una línea con la decisión que tomaría el dueño.
""", encoding="utf-8")


if __name__ == "__main__":
    escribir_curso()
    escribir_leccion()
    escribir_escenas()
    print("curso, lección y", len(ESCENAS), "escenas escritos en", CURSO)
