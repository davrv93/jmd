#!/usr/bin/env python3
"""Escenas LIVE de «Design Thinking con Claude» (dtc-01, dtc-02 y dtc-03): el Laboratorio de ideas.

Una idea del alumno madura en tres movimientos (Entender, Imaginar, Probar) y 13 estaciones. El laboratorio
(_comun/lab.js + lab.css, escritos a mano) guarda todo en el navegador y sigue de una sesión a otra.
Este generador escribe dos tipos de escena:
  - escenas del laboratorio: <body data-estacion="…">, abren el laboratorio en esa estación («ficha» = la idea
    consolidada en una página). Lo que se escribe, los pedidos para Claude y la galería están en lab.js;
  - láminas: bienvenida, principios, cómo pensamos, clips del webinar, repaso y simulador.

Fuentes de los clips: Klebahn, P. y Utley, J. (2021, 3 de septiembre). «Design Thinking: What is it and why should
I care?». Webinar de Stanford Online, Hasso Plattner Institute of Design (d.school). Los tiempos (hh:mm:ss) son los
del archivo ~/Downloads/videoplayback.mp4. El video se proyecta en vivo; no se publica.

Uso: python3 _fuente/dtc.py
"""
import html
import shutil
from pathlib import Path

CURSO = Path(__file__).resolve().parent.parent
LIVE = CURSO / "live"
e = html.escape

WEBINAR = ("Klebahn, P. y Utley, J. (2021, 3 de septiembre). <i>Design Thinking: What is it and why should I care?</i> "
           "Webinar de Stanford Online, Hasso Plattner Institute of Design (d.school), Stanford University. Los clips se proyectan en vivo; el video no se publica.")
PRACTICA = "Preguntas de práctica escritas para este curso: no son preguntas oficiales del examen DTPC®."
FASES = {"emp": "Empatizar", "def": "Definir", "ide": "Idear", "pro": "Prototipar", "eva": "Evaluar", "met": "El método"}
FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>'
H2 = 'class="seccion"'


# ------------------------------------------------------------------ piezas de las láminas
def clip(inicio, fin, titulo, texto):
    """Los tiempos quedan solo en un comentario (la guía del profe es ANALISIS-3-sesiones.md); el alumno ve la duración."""
    a = [int(x) for x in inicio.split(":")]; z = [int(x) for x in fin.split(":")]
    minutos = max(1, round(((z[0] - a[0]) * 3600 + (z[1] - a[1]) * 60 + z[2] - a[2]) / 60))
    return f'<!-- clip {inicio} → {fin} --><div class="clip"><span class="tc">Clip · {minutos} min</span><b>{titulo}</b><p>{texto}</p></div>'


def revela(rid, pregunta, respuesta, boton="Ver la respuesta"):
    return f'''<section class="revela" id="{rid}" data-oculto>
  <p><b>{pregunta}</b></p>
  <div class="dentro">{respuesta}</div>
  <div class="fila" style="margin-top:12px"><button class="boton sec" type="button" data-revelar="{rid}">{boton}</button></div>
</section>'''


def apuesta(k, rotulo, ph, boton):
    return f'''<div class="campo"><label for="c-{k}">{rotulo}</label><input id="c-{k}" type="text" data-campo="{k}" maxlength="80" placeholder="{e(ph)}"></div>
<section class="galeria" data-muro="{k}">
  <div class="fila"><button class="boton" type="button" data-publicar>{boton} {FLECHA}</button><span class="quieto">Mira lo que apostó el grupo.</span></div>
</section>'''


def camino(hoy):
    li = []
    for c, sub in [("emp", "entender a alguien"), ("def", "el problema real"), ("ide", "muchas ideas"),
                   ("pro", "algo que se toca"), ("eva", "probar con gente")]:
        li.append(f'<li class="{c}{" hoy" if c in hoy else ""}"><b>{FASES[c]}</b><span>{sub}</span></li>')
    return '<ol class="camino" aria-label="Las cinco fases">' + "".join(li) + "</ol>"


def dxd(hoy):
    orden = ["dp", "cp", "ds", "cs"]
    txt = {"dp": ("Entender", "entrevistas y mapa de empatía · S1"), "cp": ("Definir", "punto de vista y pregunta · S1"),
           "ds": ("Idear", "lluvia de ideas y Crazy 8 · S2"), "cs": ("Elegir, prototipar y probar", "finalistas, MVP y prueba · S2 y S3")}
    primero = min(orden.index(h) for h in hoy)

    def celda(k):
        cls = "hoy" if k in hoy else ("hecho" if orden.index(k) < primero else "")
        return f'<div class="c {cls}">{txt[k][0]}<small>{txt[k][1]}</small></div>'
    return ('<div class="dxd" role="table" aria-label="Problema y solución, divergir y converger">'
            '<span></span><b>Divergir · abrir opciones</b><b>Converger · decidir</b>'
            f'<b class="lado">Problema</b>{celda("dp")}{celda("cp")}<b class="lado">Solución</b>{celda("ds")}{celda("cs")}</div>')


def reloj(seg, titulo, texto):
    return f'''<section class="reloj-caja" data-reloj="{seg}"><div><h2 class="h3">{titulo}</h2><p class="quieto">{texto}</p></div>
  <div class="reloj" aria-live="off">0:00</div>
  <div class="fila"><button class="boton" type="button" data-reloj-ir>Empezar</button><button class="boton texto" type="button" data-reloj-cero>Reiniciar</button></div></section>'''


def quiz(preguntas, modo="repaso"):
    out = [f'<form class="quiz" data-quiz="{modo}">']
    for n, (enun, ops, ok, porque) in enumerate(preguntas, 1):
        out.append(f'<div class="preg"><fieldset data-ok="{ok}"><legend>{n}. {enun}</legend>')
        for letra, op in zip("abcd", ops):
            out.append(f'<label><input type="radio" name="q{n}" value="{letra}"> <span>{op}</span></label>')
        out.append(f'<p class="porque">{porque}</p></fieldset></div>')
    out.append('<div class="fila" style="margin-top:14px"><button class="boton" type="submit">Corregir</button><span data-quiz-res></span></div></form>')
    return "\n".join(out)


def pasos(items):
    return '<ol class="pasos">' + "".join(f"<li><div><b>{b}</b><span>{s}</span></div></li>" for b, s in items) + "</ol>"


def fuentes(*refs):
    return "Fuentes:<ol>" + "".join(f"<li>{r}</li>" for r in refs) + "</ol>"


# ------------------------------------------------------------------ escritura
def yaml(d, sid, titulo, fase_lms, paso, minutos, lo_logre, evidencia):
    (d / "escena.yaml").write_text(
        f'id: {sid}\ntitulo: "{titulo}"\nfase: {fase_lms}\npaso: "{paso}"\nduracion_min: {minutos}\n'
        f'lo_logre: {"true" if lo_logre else "false"}\nevidencia: {evidencia}\numbral_pct: 70\n'
        f'compuerta: {"lo_logre" if lo_logre else "ninguna"}\n', encoding="utf-8")


CABEZA = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} · Laboratorio de ideas</title>
<!-- Generada por _fuente/dtc.py: edita ahí y vuelve a correrlo. Laboratorio: ../../comun/lab.js y lab.css -->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/lab.css">
</head>
'''


def lamina(leccion, n, total, sid, titulo, fase_lms, paso, minutos, fase_dt, h1, sub, cuerpo, *, sesion,
           lo_logre=True, evidencia="ninguna", fuente=WEBINAR):
    d = LIVE / leccion / sid
    d.mkdir(parents=True, exist_ok=True)
    yaml(d, sid, titulo, fase_lms, paso, minutos, lo_logre, evidencia)
    (d / "escena.html").write_text(CABEZA.format(titulo=e(titulo)) + f'''<body data-escena="{sid}">
<main class="dt">
  <header class="cab"><h1>{h1}</h1><p class="dt-sub">{sub}</p></header>
{cuerpo}
  <div class="fuente">{fuente}</div>
</main>
<script src="../../comun/lab.js"></script>
</body>
</html>
''', encoding="utf-8")


def laboratorio(leccion, sid, titulo, fase_lms, paso, minutos, estacion, *, anexo="", lo_logre=True, evidencia="ninguna"):
    d = LIVE / leccion / sid
    d.mkdir(parents=True, exist_ok=True)
    yaml(d, sid, titulo, fase_lms, paso, minutos, lo_logre, evidencia)
    extra = f'<section data-anexo hidden>\n{anexo}\n</section>\n' if anexo else ""
    (d / "escena.html").write_text(CABEZA.format(titulo=e(titulo)) + f'''<body data-escena="{sid}" data-estacion="{estacion}">
<div id="lab"></div>
{extra}<noscript><p style="padding:24px">El laboratorio necesita JavaScript.</p></noscript>
<script src="../../comun/lab.js"></script>
</body>
</html>
''', encoding="utf-8")


def limpiar(leccion):
    d = LIVE / leccion
    if d.exists():
        for x in d.iterdir():
            if x.is_dir() and not x.name.startswith("_"):
                shutil.rmtree(x)


# ================================================================== SESIÓN 1 · Entender
def sesion1():
    L, T = "dtc-01", 9
    limpiar(L)
    lamina(L, 1, T, "00-bienvenida", "Bienvenida · el laboratorio", "experiencia", "", 3, "met",
           "Un laboratorio para que tu idea <em>se vuelva concreta</em>",
           "En tres sesiones, una idea tuya pasa de semilla a algo que una persona puede tocar y probar. El método es Design Thinking; Claude te acompaña en cada estación.",
           f'''<div class="rej cuatro">
  <article class="tarjeta"><h2 class="h3">Semilla</h2><p>Un problema que te importa y alguien a quien le duele.</p></article>
  <article class="tarjeta"><h2 class="h3">Brote</h2><p>Entiendes a una persona real: lo que dice, hace y siente.</p></article>
  <article class="tarjeta"><h2 class="h3">Toma forma</h2><p>Una pregunta bien planteada y una idea elegida entre muchas.</p></article>
  <article class="tarjeta fuerte"><h2 class="h3">Concreta</h2><p>Un MVP probado con gente, y lo que aprendiste.</p></article>
</div>
{camino(["emp", "def"])}
{pasos([("Abre claude.ai en otra pestaña", "Inicia sesión y crea un chat nuevo. Usa ese mismo chat en las tres sesiones: así Claude recuerda tu idea. La versión gratuita basta."),
        ("Ten a mano a alguien a quien entrevistar", "Un compañero, un familiar o un cliente por WhatsApp. Hoy hablas con una persona real."),
        ("Todo se guarda solo", "En este navegador. Al final de cada sesión descargas tu idea en un archivo.")])}''',
           sesion=1, lo_logre=False, fuente="Laboratorio de ideas · Design Thinking con Claude · JMD Learning.")

    lamina(L, 2, T, "01-principios", "Los principios, de la fuente", "conceptualizacion", "ver", 9, "met",
           "Tres fuentes, <em>una misma idea:</em> primero la persona",
           "La d.school de Stanford, IDEO y el Design Council británico describen el método con palabras distintas. Las tres empiezan por entender a alguien, y ninguna es una receta.",
           f'''{revela("r-variable", "Antes del clip: según la investigación que citan, ¿qué variable influye más en lo buenas que son tus ideas?",
        "<p><b>Cuántas ideas tienes</b>. «Para tener una buena idea, necesitas muchas», dice Utley citando a Linus Pauling.</p>")}
{clip("00:00:56", "00:05:00", "Qué es y por qué te importa", "Jeremy Utley: «una manera de generar ideas y ver si sirven», para cualquier rol. Las cinco fases, y el aviso: no es una receta de pastel.")}
<div class="rej">
  <article class="tarjeta"><h2 class="h3">Cinco modos, siete mentalidades</h2><p>Empatizar, definir, idear, prototipar y evaluar. Las mentalidades: los valores humanos primero, colaboración radical, experimentar, mostrar en vez de contar, saber en qué parte del proceso estás, claridad y sesgo a la acción.</p><span class="de">d.school · Stanford</span></article>
  <article class="tarjeta"><h2 class="h3">Deseable, factible, viable</h2><p>Une lo que las personas necesitan con lo que la tecnología permite y lo que un negocio puede sostener. Pide empatía, optimismo, experimentación y colaboración.</p><span class="de">IDEO · Tim Brown, 2008</span></article>
  <article class="tarjeta"><h2 class="h3">El doble diamante</h2><p>Descubrir, definir, desarrollar y entregar: abrir y cerrar dos veces. El primer diamante es «diseñar lo correcto»; el segundo, «diseñar bien lo correcto».</p><span class="de">Design Council · 2005</span></article>
</div>
<p class="calma">Las tres coinciden en que se vuelve atrás cuando hace falta. El Design Council lo dice así: «no es un proceso lineal».</p>''',
           sesion=1, fuente=fuentes(
               WEBINAR,
               "Hasso Plattner Institute of Design at Stanford (d.school). <i>Bootcamp Bootleg</i> (CC BY-NC-SA 3.0) y <i>Design Thinking Bootleg</i> (2018).",
               "Brown, T. (2008). Design Thinking. <i>Harvard Business Review</i>, 86(6), 84–92.",
               "Design Council (2005, 2007). <i>The Double Diamond</i> y <i>Eleven lessons: managing design in eleven global brands</i>. Londres."))

    lamina(L, 3, T, "02-como-pensamos", "Cómo pensamos, y dónde ayuda la IA", "conceptualizacion", "ver", 7, "met",
           "Tu cerebro quiere <em>saltar a la solución</em>",
           "El método existe porque pensamos con atajos. Aquí van cuatro atajos que el Design Thinking frena y, en la tabla, dónde Claude ayuda de verdad y dónde no.",
           f'''<div class="rej dos">
  <article class="tarjeta"><h2 class="h3">Saltamos a la primera respuesta</h2><p>El «sistema 1» es rápido y automático, y da por hecho que lo que ve es todo lo que hay (Kahneman, 2011). <b>Freno:</b> empatizar antes de idear.</p></article>
  <article class="tarjeta"><h2 class="h3">Nos pegamos a lo primero que vemos</h2><p>Con un ejemplo delante, los diseñadores copian sus rasgos sin notarlo: es la fijación de diseño (Jansson y Smith, 1991). <b>Freno:</b> muchas ideas, y las tuyas primero.</p></article>
  <article class="tarjeta"><h2 class="h3">Abrir y cerrar a la vez no funciona</h2><p>Generar opciones y elegir entre ellas son dos modos distintos de pensar (Guilford, 1950). Una lluvia de ideas típica de empresa deja dos ideas (Utley). <b>Freno:</b> separar generar de decidir.</p></article>
  <article class="tarjeta"><h2 class="h3">Lo que decimos no es lo que hacemos</h2><p>En el centro comercial Westfield, 850 de 1000 personas dijeron que irían al jardín cervecero, y casi nadie subió (Utley). <b>Freno:</b> prototipar y observar.</p></article>
</div>
<h2 {H2}>Dónde mejora la IA, y dónde no</h2>
<table class="tabla-ia">
  <thead><tr><th>Fase</th><th class="th-tuyo">Sigue siendo tuyo</th><th class="th-claude">Claude mejora</th></tr></thead>
  <tbody>
    <tr><td>Empatizar</td><td class="tuyo">Entrevistar, observar y sentir con la persona.</td><td class="mas">Un guion de preguntas abiertas en un minuto. Ordena tus notas y marca lo que supones.</td></tr>
    <tr><td>Definir</td><td class="tuyo">Elegir la que refleja lo que viste.</td><td class="mas">Varias formas de plantear la pregunta, para comparar.</td></tr>
    <tr><td>Idear</td><td class="tuyo">Pensar primero. La IA hace que las ideas se parezcan entre sí y puede fijarte en las suyas.<small>Doshi y Hauser, 2024 · CHI 2024</small></td><td class="mas">Volumen y variedad: la IA generativa da ideas más rápidas y baratas, con mayor intención de compra promedio.<small>Girotra et al., 2023 (con GPT-4)</small></td></tr>
    <tr><td>Prototipar</td><td class="tuyo">Que sea barato y se pueda tirar.</td><td class="mas">Una pantalla que se puede tocar, en minutos. En tareas creativas: 12,2 % más tareas, 25,1 % más rápido y más de 40 % de mejor calidad.<small>Dell'Acqua et al., 2023</small></td></tr>
    <tr><td>Evaluar</td><td class="tuyo">Probar con personas y decidir. Fuera del alcance de la IA, quienes la usaron acertaron 19 puntos menos.<small>Dell'Acqua et al., 2023</small></td><td class="mas">El guion de prueba y la lectura de resultados.</td></tr>
  </tbody>
</table>
<p class="calma"><b>La regla del laboratorio:</b> primero tú, después Claude. Y la decisión siempre es tuya.</p>''',
           sesion=1, fuente=fuentes(
               "Kahneman, D. (2011). <i>Thinking, Fast and Slow</i>. Farrar, Straus and Giroux.",
               "Jansson, D. G. y Smith, S. M. (1991). Design fixation. <i>Design Studies</i>, 12(1), 3–11.",
               "Guilford, J. P. (1950). Creativity. <i>American Psychologist</i>, 5(9), 444–454.",
               "Girotra, K., Meincke, L., Terwiesch, C. y Ulrich, K. T. (2023). <i>Ideas are dimes a dozen: Large language models for idea generation in innovation</i>. Wharton School, SSRN 4526071.",
               "Doshi, A. R. y Hauser, O. P. (2024). Generative AI enhances individual creativity but reduces the collective diversity of novel content. <i>Science Advances</i>, 10(28).",
               "Wadinambiarachchi, S. et al. (2024). The effects of generative AI on design fixation and divergent thinking. <i>CHI 2024</i>, ACM.",
               "Dell'Acqua, F., McFowland, E., Mollick, E. et al. (2023). <i>Navigating the jagged technological frontier</i>. HBS Working Paper 24-013; <i>Organization Science</i> (2026).",
               WEBINAR))

    lamina(L, 4, T, "03-caso-cybex", "El caso Cybex: una emoción", "reflexion", "ver", 10, ["emp", "def"],
           "Bill no midió nada: <em>miró caras</em>",
           "Un ingeniero de Cybex, una de las grandes marcas de caminadoras, fue a un gimnasio con su cuaderno. Lo que vio cambió el producto.",
           f'''{clip("00:07:58", "00:09:54", "Observar en el gimnasio", "Perry Klebahn cuenta cómo Bill Pacheco se sentó a mirar. La gente se agarraba de las pantallas «como si su vida dependiera de ello».")}
<h2 class="h3">Antes de seguir: ¿qué emoción vio Bill?</h2>
{apuesta("adivina", "Mi apuesta, en una palabra", "Por ejemplo: aburrimiento", "Publicar mi apuesta")}
<section class="revela" id="r-bill" data-oculto>
  <p><b>Cuando todos hayan publicado, el profe sigue con el video.</b></p>
  <div class="dentro">
{clip("00:09:54", "00:14:55", "Miedo, tubos de PVC y un jefe que dice no", "La emoción era el miedo. Bill hizo dibujos y un prototipo con tubos de PVC. Su jefe respondió: «No me gusta nada de esta presentación». Bill soldó barras a dos máquinas y las puso en el gimnasio de un hotel.")}
<div class="rej">
  <article class="tarjeta"><h2 class="h3 con-punto f-emp">Empatizar</h2><p>Miró caras, no tiempos de uso.</p></article>
  <article class="tarjeta"><h2 class="h3 con-punto f-def">Definir</h2><p>Pasó de «¿cómo vendemos más?» a «la gente siente miedo en la máquina».</p></article>
  <article class="tarjeta"><h2 class="h3 con-punto f-ide">Idear</h2><p>Dibujos rápidos y muchas formas de dar dónde agarrarse.</p></article>
  <article class="tarjeta"><h2 class="h3 con-punto f-pro">Prototipar</h2><p>Tubos de PVC y barras soldadas: feo, rápido y barato.</p></article>
  <article class="tarjeta"><h2 class="h3 con-punto f-eva">Evaluar</h2><p>Dos máquinas lado a lado. ¿Cuántos eligieron la nueva? <b>Lo vemos en la sesión 3.</b></p></article>
</div>
<p class="calma">En la diapositiva del webinar, una usuaria dice: «Elegí esta máquina porque se siente más segura». El producto final fue la Cybex 770T (patente D625,372), con «20 % de crecimiento, dos años seguidos».</p>
  </div>
  <div class="fila" style="margin-top:12px"><button class="boton sec" type="button" data-revelar="r-bill">Ver qué vio Bill</button></div>
</section>''', sesion=1)

    laboratorio(L, "04-tu-reto", "Estación 1 · Tu reto", "experiencia", "reto", 5, "reto")
    laboratorio(L, "05-tu-entrevista", "Estación 2 · Entrevista", "experimentacion", "entrevistar", 13, "entrevista")
    laboratorio(L, "06-mapa-de-empatia", "Estación 3 · Mapa de empatía", "experimentacion", "mapa", 11, "mapa")
    laboratorio(L, "07-tu-pregunta", "Estación 4 · Tu pregunta", "experimentacion", "definir", 12, "pregunta", evidencia="hallazgo")
    laboratorio(L, "08-cierre", "Cierre · la ficha de tu idea", "reflexion", "", 5, "ficha", anexo=f'''<h2 {H2}>Para el viernes 4 de diciembre</h2>
{pasos([("Entrevista a dos personas más", "Con el mismo guion. Si algo contradice tu punto de vista, ajústalo: eso es iterar."),
        ("Trae papel y un plumón", "En la sesión 2 dibujas 8 ideas en 8 minutos.")])}
<h2 {H2}>Tres preguntas de práctica</h2>
{quiz([
    ("¿Qué fase busca entender las emociones y necesidades de las personas?", ["Idear", "Empatizar", "Prototipar", "Evaluar"], "b",
     "Empatizar: observar, entrevistar y sentir con la persona, como Bill en el gimnasio o Doug Dietz con la niña."),
    ("¿Cuál es una buena pregunta de entrevista de empatía?", ["¿Te gustaría una app para tus citas?", "¿Usarías un recordatorio por WhatsApp?",
     "Cuéntame la última vez que faltaste a una cita.", "¿Verdad que es molesto olvidar las citas?"], "c",
     "Pide una historia concreta y no sugiere la respuesta ni la solución."),
    ("¿Qué produce la fase Definir?", ["Un prototipo", "Un punto de vista y una pregunta «¿Cómo podríamos…?»", "Una lista de 50 ideas", "Un informe de ventas"], "b",
     "Definir convierte lo que aprendiste en un problema accionable, centrado en la persona."),
])}
<p class="fuente">{PRACTICA}</p>''')


# ================================================================== SESIÓN 2 · Imaginar
def sesion2():
    L, T = "dtc-02", 8
    limpiar(L)
    lamina(L, 1, T, "00-repaso", "Repaso · tu pregunta", "experiencia", "", 4, ["ide", "pro"],
           "Hoy, de una pregunta a <em>algo que se toca</em>",
           "Tu pregunta de la sesión 1 es el punto de partida. Si las entrevistas de la semana te enseñaron algo, ajústala en el laboratorio.",
           f'''{camino(["ide", "pro"])}
<div class="rej dos">
  <article class="tarjeta"><h2 class="h3">Mi reto</h2><p data-ver="reto" data-vacio="Aún sin escribir"></p></article>
  <article class="tarjeta fuerte"><h2 class="h3">¿Cómo podríamos…?</h2><p data-ver="hmw" data-vacio="Aún sin escribir: complétala en la estación «Tu pregunta»"></p></article>
</div>
<p class="nota-profe"><b>Abre tu chat de Claude de la sesión 1.</b> Si no lo tienes, abre la ficha del laboratorio, cópiala para Claude y pégala en un chat nuevo junto con el pedido del coach.</p>''',
           sesion=2, lo_logre=False, fuente="Laboratorio de ideas · Design Thinking con Claude.")

    lamina(L, 2, T, "01-diverger-antes", "Diverger antes de converger", "conceptualizacion", "ver", 8, "ide",
           "Abre muchas puertas <em>antes</em> de elegir una",
           "En la solución convencional, el jefe da una idea y tú la ejecutas. El Design Thinking agrega dos pasos: generar muchas opciones antes de decidir, y hacerlo con el problema y también con la solución.",
           f'''{revela("r-dos", "Antes del clip: ¿cuántas ideas deja, en promedio, una lluvia de ideas en una empresa?",
        "<p><b>Dos. Solo dos</b>, según Jeremy Utley. El video no cita el estudio. Por eso hoy la meta es cantidad: 15 ideas tuyas antes de juzgar.</p>")}
{clip("00:19:04", "00:23:30", "Dos avances sobre la solución convencional", "Diverger antes de converger, y separar «encontrar el problema» de «resolverlo». «Un problema bien planteado está medio resuelto» (John Dewey). El 2×2: ¿trabajas en el problema o en la solución? ¿Abres opciones o decides?")}
{dxd(["ds"])}
<p class="calma">Es el mismo doble diamante del Design Council: en la sesión 1 abriste y cerraste el problema; hoy abres la solución y la cierras.</p>''',
           sesion=2, fuente=fuentes(WEBINAR, "Design Council (2005). <i>The Double Diamond</i>."))

    laboratorio(L, "02-lluvia-de-ideas", "Estación 5 · Ideas", "experimentacion", "idear", 14, "ideas")
    laboratorio(L, "03-crazy-8", "Estación 6 · Crazy 8", "experimentacion", "idear", 10, "crazy8")
    laboratorio(L, "04-elige", "Estación 7 · Elegir", "experimentacion", "elegir", 10, "elegir")
    laboratorio(L, "05-tu-mvp", "Estación 8 · MVP", "experimentacion", "prototipar", 20, "mvp")
    laboratorio(L, "06-tu-incognita", "Estación 9 · Incógnita", "conceptualizacion", "aprender", 6, "incognita")
    laboratorio(L, "07-cierre", "Cierre · la ficha de tu idea", "reflexion", "", 3, "ficha", anexo=f'''<h2 {H2}>Para el viernes 11 de diciembre</h2>
{pasos([("Termina tu MVP", "Solo lo necesario para que alguien lo use cinco minutos."),
        ("Consigue dos personas para probarlo", "Del perfil de tu reto. Una puede ser por videollamada.")])}
<h2 {H2}>Tres preguntas de práctica</h2>
{quiz([
    ("En una sesión de ideación, ¿qué conviene hacer?", ["Evaluar cada idea apenas aparece", "Generar muchas ideas y aplazar el juicio", "Quedarse con la primera idea viable", "Que solo opine quien más sabe"], "b",
     "Idear es divergir: volumen primero, juicio después."),
    ("¿Para qué sirve un prototipo de baja fidelidad?", ["Para vender el producto terminado", "Para impresionar a los inversionistas", "Para reemplazar la prueba con usuarios", "Para aprender rápido y barato si una idea funciona"], "d",
     "Se construye para aprender: barato, rápido y desechable."),
    ("¿Qué significa converger?", ["Generar más opciones", "Entrevistar a más personas", "Elegir y decidir entre opciones", "Volver a empezar"], "c",
     "Converger es cerrar: elegir con criterios entre lo que se abrió al diverger."),
])}
<p class="fuente">{PRACTICA}</p>''')


# ================================================================== SESIÓN 3 · Probar
PREGUNTAS_DTPC = [
    ("¿Qué describe mejor al Design Thinking?", ["Un método lineal de cinco pasos que siempre se sigue en orden", "Una técnica de diseño gráfico",
     "Un enfoque centrado en las personas para encontrar problemas y probar soluciones de forma iterativa", "Un método para reducir costos de producción"], "c",
     "Es centrado en las personas e iterativo: se vuelve a fases anteriores cuando hace falta."),
    ("En la fase Empatizar, ¿qué técnica es la más adecuada?", ["Observación y entrevistas abiertas", "Una encuesta cerrada de satisfacción", "Un análisis de precios de la competencia", "Un estudio de factibilidad financiera"], "a",
     "Empatizar busca entender emociones y motivos: se observa y se escuchan historias."),
    ("Un mapa de empatía organiza…", ["el presupuesto del proyecto", "las funciones del producto", "el cronograma del equipo", "lo que la persona dice, piensa, hace y siente"], "d",
     "Sus cuadrantes clásicos son dice, piensa, hace y siente."),
    ("¿Qué es un insight?", ["Un dato estadístico de mercado", "Una revelación sobre la persona que explica su conducta y abre oportunidades", "Una idea de producto", "Un requisito técnico"], "b",
     "El insight explica el porqué: el miedo en la caminadora, el susto de la niña ante el resonador."),
    ("Una buena pregunta «¿Cómo podríamos…?»…", ["ya incluye la solución", "es tan amplia que sirve para cualquier problema", "abre espacio a muchas ideas y se centra en la necesidad de la persona", "se responde con sí o no"], "c",
     "Ni tan amplia que no oriente ni tan estrecha que traiga la respuesta."),
    ("Durante una lluvia de ideas conviene…", ["buscar cantidad y aplazar el juicio", "criticar cada idea al instante", "que hable solo el jefe", "quedarse con la idea más segura"], "a",
     "Cantidad antes que calidad: el juicio llega al converger."),
    ("Según IDEO (Brown, 2008), una buena solución es…", ["la más barata", "la que más le gusta al equipo", "la más innovadora técnicamente", "deseable para las personas, factible y viable para el negocio"], "d",
     "Las tres lentes: deseabilidad, factibilidad y viabilidad."),
    ("Al evaluar un prototipo con usuarios, lo mejor es…", ["explicar en detalle cómo funciona antes de que lo usen", "observar lo que hacen y preguntar por qué", "preguntar si les gusta", "defender la idea ante las críticas"], "b",
     "Lo que la persona hace es más confiable que lo que dice que haría."),
    ("Si la prueba muestra que el problema no era el que pensabas, ¿qué haces?", ["Lanzar igual", "Cambiar de usuarios de prueba", "Volver a una fase anterior, como empatizar o definir", "Abandonar el proyecto"], "c",
     "Iterar es parte del método: volver atrás con lo aprendido."),
    ("¿Por qué la encuesta de Westfield (850 de 1000 dijeron que sí) no predijo lo que pasó?", ["Porque la muestra era pequeña", "Porque decir que sí no cuesta nada: la gente no imagina la verdad o no quiere decir que no", "Porque preguntaron en el piso equivocado", "Porque la idea era mala desde el inicio"], "b",
     "Utley: diseña pruebas que den datos más creíbles que una encuesta."),
]


def sesion3():
    L, T = "dtc-03", 9
    limpiar(L)
    lamina(L, 1, T, "00-repaso", "Repaso · tu MVP", "experiencia", "", 3, "eva",
           "Hoy tu idea <em>se enfrenta a personas</em>",
           "Esto traes de la sesión 2. Si lo cambiaste en la semana, actualízalo en el laboratorio antes de probar.",
           f'''{camino(["eva"])}
<div class="rej">
  <article class="tarjeta"><h2 class="h3">La idea</h2><p data-ver="idea" data-vacio="Aún sin elegir"></p></article>
  <article class="tarjeta"><h2 class="h3">Mi MVP</h2><p data-ver="mvp" data-vacio="Aún sin describir"></p></article>
  <article class="tarjeta fuerte"><h2 class="h3">Mi gran incógnita</h2><p data-ver="supuesto" data-vacio="Aún sin escribir"></p></article>
</div>
{dxd(["cs"])}''', sesion=3, lo_logre=False, fuente="Laboratorio de ideas · Design Thinking con Claude.")

    lamina(L, 2, T, "01-crear-datos", "Crea tus propios datos", "conceptualizacion", "ver", 8, "eva",
           "El jefe opinaba; Bill <em>trajo datos</em>",
           "En la sesión 1 quedó una pregunta: Bill puso dos caminadoras lado a lado en un hotel. ¿Cuántas personas eligieron la nueva?",
           f'''{apuesta("apuesta_cybex", "De 30 personas, ¿cuántas eligieron la nueva?", "Por ejemplo: 18 de 30", "Publicar mi apuesta")}
<section class="revela" id="r-28" data-oculto>
  <p><b>Cuando todos hayan publicado, el profe pone el clip.</b></p>
  <div class="dentro">
{clip("00:15:03", "00:18:34", "Crear tus propios datos", "Jeremy Utley: el jefe reaccionaba a una idea sin información. Los diseñadores «encuentran maneras ingeniosas de crear datos nuevos».")}
<div class="rej">
  <article class="tarjeta fuerte"><h2 class="h3">28 de 30</h2><p>eligieron la máquina nueva. La gente «votó con los pies».</p></article>
  <article class="tarjeta"><h2 class="h3">El jefe opinaba sin datos</h2><p>«Reacciona a una idea, pero no tiene información», dice Utley.</p></article>
  <article class="tarjeta"><h2 class="h3">Menos del 27 %</h2><p>de los niños necesitó sedación para la resonancia en UPMC con la GE Adventure Series. Antes se sedaba a casi todos los menores de 9 años.</p></article>
</div>
  </div>
  <div class="fila" style="margin-top:12px"><button class="boton sec" type="button" data-revelar="r-28">Ver la respuesta</button></div>
</section>''', sesion=3, fuente=fuentes(WEBINAR, "All.Can (2019). GE Healthcare Adventure Series; Milwaukee Journal Sentinel (21-01-2016)."))

    lamina(L, 3, T, "02-la-gente-miente", "Lo que dicen y lo que hacen", "reflexion", "ver", 8, "eva",
           "Preguntar «¿vendrías?» <em>no es probar</em>",
           "Un centro comercial preguntó a mil personas si subirían a un jardín cervecero en el cuarto piso. 850 dijeron que sí.",
           f'''{revela("r-westfield", "Antes del clip: construyeron el jardín cervecero. ¿Qué pasó con la gente en el cuarto piso?",
        "<p><b>Casi nada cambió.</b> No subió más gente, las rentas siguieron cayendo y los locatarios se iban. La gente «no miente por malicia»: no puede imaginar la verdad o no quiere decirle que no a quien pregunta.</p>")}
{clip("00:35:34", "00:40:33", "Westfield, San Francisco, 2016", "La reunión de emergencia, la encuesta y el fracaso. La prueba que debieron hacer: cortinas, un practicante, una jarra de cerveza y un cactus, y contar quién sube al cuarto piso.")}
<div class="rej dos">
  <article class="tarjeta"><h2 class="h3">Lo que dicen: «¿Vendrías?», «¿Te gusta?», «¿Lo comprarías?»</h2><p>Responder que sí no cuesta nada.</p></article>
  <article class="tarjeta fuerte"><h2 class="h3">Lo que hacen: ¿subieron?, ¿eligieron la máquina?</h2><p>Mide una acción: un clic, un paso, un pago, un mensaje.</p></article>
</div>
<p class="cuidado">En el video aparece la frase del «caballo más rápido» atribuida a Henry Ford. No hay registro de que Ford la dijera: úsala como dicho, no como cita.</p>''', sesion=3)

    laboratorio(L, "03-guion-de-prueba", "Estación 10 · Guion de prueba", "experimentacion", "preparar", 8, "guion")
    laboratorio(L, "04-prueba-en-vivo", "Estación 11 · La prueba", "experimentacion", "probar", 15, "prueba")
    laboratorio(L, "05-iterar", "Estación 12 · Iterar", "conceptualizacion", "iterar", 8, "iterar")

    lamina(L, 7, T, "06-simulador-dtpc", "Simulador DTPC®", "experimentacion", "simulador", 15, "met",
           "Práctica del examen: <em>10 preguntas, 15 minutos</em>",
           "El examen DTPC® de CertiProf tiene 40 preguntas en 60 minutos y se aprueba con 32 (80 %). Aquí practicas el formato con 10 preguntas al mismo ritmo.",
           f'''{reloj(900, "15 minutos", "El ritmo del examen: un minuto y medio por pregunta.")}
{quiz(PREGUNTAS_DTPC, "examen")}''', sesion=3, evidencia="hallazgo",
           fuente=PRACTICA + " Escritas a partir de la d.school, IDEO (Brown, 2008), el Design Council y el webinar de Klebahn y Utley (2021). Formato del examen según certiprof.com, consultado en noviembre de 2026.")

    laboratorio(L, "07-tu-pitch", "Estación 13 · Tu proyecto", "experiencia", "presentar", 8, "pitch", evidencia="hallazgo")
    laboratorio(L, "08-cierre", "Cierre · tu idea, concreta", "reflexion", "", 2, "ficha", anexo=pasos([
        ("Sigue iterando", "Una prueba más con otra persona vale más que una semana de planes."),
        ("Repasa con tu ficha", "Cada concepto del examen tiene un ejemplo tuyo: tu insight, tu pregunta, tu MVP.")]))


if __name__ == "__main__":
    sesion1()
    sesion2()
    sesion3()
    for l in ("dtc-01", "dtc-02", "dtc-03"):
        print(l, sorted(p.name for p in (LIVE / l).iterdir()))
