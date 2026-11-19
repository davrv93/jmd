#!/usr/bin/env python3
"""Genera las escenas LIVE de oq3-02 (Orquestación con Qwen Coder · Grupo 3 · Sesión 2).  python3 _fuente/oq302.py
Mismo motor y estilo que oq301.py: láminas de teoría del skill teoria-animada (live/_comun: teoria.js,
teoria.css, gsap.min.js), sin recursos externos.
Datos: la orquesta local de ~/Downloads/qwen-orquesta (tienda de camisetas, 4 módulos, 12 tareas) y las
mediciones de ~/Downloads/qwen-velocidad, tomadas el 18 y el 19-11-2026 en la Mac del instructor.
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(AQUI, '..', 'live', 'oq3-02')
COMUN = '../../comun/'
FUENTE = ('Fuente: trabajo propio de JMD Learning, 18 y 19-11-2026. Orquestador en Node sin dependencias; '
          'Qwen2.5-Coder 14b en una MacBook M4 Pro de 24 GB (Ollama al inicio, luego llama.cpp).')


def escena(id_, titulo, fase, paso, minutos, html):
    d = os.path.join(LIVE, id_)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'escena.yaml'), 'w').write(
        f'id: {id_}\ntitulo: "{titulo}"\nfase: {fase}\npaso: "{paso}"\nduracion_min: {minutos}\nlo_logre: false\n'
        'evidencia: ninguna\numbral_pct: 80\ncompuerta: ninguna\n')
    open(os.path.join(d, 'escena.html'), 'w').write(html)


# Ajustes comunes a todas las láminas (los mismos de la Sesión 1).
CSS_CURSO = """
  .teo-ceja, .nt .k, .cita small, .rot, .pastilla { text-transform: none !important; letter-spacing: .02em !important; }
  .nt.oro { background: #E9C25A; box-shadow: 0 0 0 2px #8A6A00 inset, var(--sombra); }
  .nt .t.mono { hyphens: none; overflow-wrap: anywhere; }
  .nt .t small { display: block; font-weight: 500; opacity: .85; margin-top: .2em; }
  #punto { fill: var(--acento); filter: drop-shadow(0 0 6px var(--acento)); }
  .sello.ok { color: #1F7A3E; border-color: #1F7A3E; }
  .rot { font-size: 14px; }
"""

JS_COMUN = """
  var $ = TEO.$, puntas = {};
  function puntasDe(ids) { ids.forEach(function (id) { puntas[id] = TEO.punta($("#" + id)); }); }
  function flecha(tl, id, pos) {
    TEO.trazar(tl, "#" + id, { duration: .5 }, pos);
    tl.from(puntas[id], { autoAlpha: 0, duration: .2 }, "-=.1");
  }
  function sello(tl, sel, pos) {
    return tl.fromTo(sel, { autoAlpha: 0, scale: 2.4 }, { autoAlpha: 1, scale: 1, duration: .35, ease: "back.out(2.2)" }, pos);
  }
"""


def lamina(titulo, ceja, h1, aria, svg, notas, relato, js, css='', fuente=FUENTE):
    lis = '\n'.join(f'        <li><b>{r[0]}</b>{"".join(r[1:])}</li>' for r in relato)
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} · Orquestación con Qwen Coder</title>
<link rel="stylesheet" href="{COMUN}teoria.css">
<style>{CSS_CURSO}{css}</style>
</head>
<body>
<main class="teo">
  <header>
    <p class="teo-ceja">{ceja}</p>
    <h1>{h1}</h1>
  </header>
  <div class="teo-cuerpo">
    <figure class="teo-fig" role="img" aria-label="{aria}">
      <svg viewBox="0 0 800 520" aria-hidden="true">
{svg}
      </svg>
{notas}
    </figure>
    <aside class="teo-relato" aria-live="polite">
      <ol>
{lis}
      </ol>
    </aside>
  </div>
  <footer class="teo-pie">
    <div class="teo-ctrl">
      <button type="button" class="teo-btn" id="ant">← Anterior</button>
      <div class="teo-puntos"></div>
      <button type="button" class="teo-btn pri" id="sig">Siguiente →</button>
      <button type="button" class="teo-btn" id="rep" title="Repetir este paso">↺</button>
      <button type="button" class="teo-btn" id="todo">Ver todo</button>
      <span class="teo-tecla">← → o espacio</span>
    </div>
    <p class="teo-fuente">{fuente}</p>
  </footer>
</main>
<script src="{COMUN}gsap.min.js"></script>
<script src="{COMUN}teoria.js"></script>
<script>
(function () {{
{JS_COMUN}
{js}
}})();
</script>
</body>
</html>
'''


def P(*ps):
    return ''.join(f'<p>{p}</p>' for p in ps)


def aparte(t):
    return f'<p class="aparte">{t}</p>'


# ====================================================================== 00 portada
AGENDA = [
    ('El proyecto: una tienda de camisetas', 8),
    ('El oráculo oculto y sus tres atrapadas', 10),
    ('Reparar barato y sin ciclos', 10),
    ('Velocidad: adivinar y confirmar', 10),
    ('Una orquesta que aprende sola', 9),
    ('Práctica: ¿qué mejora lo arregló?', 7),
    ('Cinco corridas, una tabla', 9),
    ('Llévalo a tu proyecto', 8),
]
CORRIDAS = [  # (rótulo, segundos, tok/s, reparaciones, escaladas, observaciones del revisor)
    ('Ollama', 595, '12,1', 4, 1, 1),
    ('Rápida 1', 196, '30,8', 1, 0, 1),
    ('Rápida 5', 159, '19,8', 1, 0, 1),
    ('Rápida 6', 241, '19,5', 0, 0, 0),
    ('Rápida 7', 155, '32,3', 0, 0, 0),
]
barras_port = '\n'.join(
    f'      <rect class="fondo" x="96" y="{14 + 28 * k}" width="250" height="16" rx="3"/>'
    f'<rect class="bar b{k}" x="96" y="{14 + 28 * k}" width="{round(s / 595 * 250)}" height="16" rx="3"/>'
    f'<text class="lb" x="88" y="{27 + 28 * k}" text-anchor="end">{r}</text>'
    for k, (r, s, *_resto) in enumerate(CORRIDAS))

PORTADA = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portada · Orquestación con Qwen Coder</title>
<link rel="stylesheet" href="@@C@@teoria.css">
<style>
  body { display: flex; min-height: 100vh; }
  .port { margin: auto; width: min(1180px, 100%); padding: 5vh 5vw; display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 4vw; align-items: center; }
  .ceja { font: 700 .8em/1 var(--mono); color: var(--acento); margin: 0 0 1em; }
  h1 { margin: 0; font: 600 clamp(2.2em, 5.4vw, 4.2em)/1.03 var(--serif); letter-spacing: -.02em; }
  h1 em { color: var(--acento); }
  .sub { font-size: 1.12em; color: var(--gris); max-width: 31em; margin: 1em 0 1.4em; }
  .quien { font: 600 .85em/1.5 var(--mono); color: var(--gris); }
  .agenda { list-style: none; margin: 0; padding: 0; display: grid; gap: .4em; counter-reset: a; }
  .agenda li { counter-increment: a; display: grid; grid-template-columns: 2em 1fr auto; gap: .6em; align-items: baseline; border-bottom: 1px solid var(--linea); padding: .3em 0; }
  .agenda li::before { content: counter(a, decimal-leading-zero); font: 700 .8em var(--mono); color: var(--acento); }
  .agenda small { font: 600 .75em var(--mono); color: var(--gris); }
  svg.cor { width: 100%; height: auto; margin-bottom: 1em; overflow: visible; }
  .cor .fondo { fill: var(--papel2); }
  .cor .bar { fill: var(--acento); transform-box: fill-box; transform-origin: 0 50%; animation: crece 1.1s cubic-bezier(.2, .8, .2, 1) both; }
  .cor .b0 { fill: var(--papel3); stroke: var(--tinta); stroke-width: 1.2; }
  .cor .b1 { animation-delay: .25s; } .cor .b2 { animation-delay: .5s; } .cor .b3 { animation-delay: .75s; } .cor .b4 { animation-delay: 1s; }
  .cor .lb { font: 700 11px var(--mono); fill: var(--gris); }
  .cor .pie { font: 700 11px var(--mono); fill: var(--tinta); }
  @keyframes crece { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @media (prefers-reduced-motion: reduce) { .cor .bar { animation: none; } }
  @media (max-width: 860px) { .port { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main class="port">
  <section>
    <p class="ceja">JMD Learning · clase en vivo</p>
    <h1>Un proyecto real,<br><em>de punta a punta</em></h1>
    <p class="sub">Una orquesta local con Qwen Coder construyó la lógica de una tienda. Hoy vemos cómo se verificó, cómo se reparó sin dar vueltas en círculo y cómo bajó de 595 a 155 segundos sin perder una sola prueba.</p>
    <p class="quien">David Roncal · Grupo 3 · Sesión 2 · domingo 29 de noviembre de 2026 · 8:00&nbsp;a.&nbsp;m.</p>
  </section>
  <section>
    <svg class="cor" viewBox="0 0 360 160" aria-label="Tiempo total de cinco corridas: de 595 a 155 segundos">
@@BARRAS@@
      <text class="pie" x="8" y="156">595 s → 155 s · 17/17 pruebas ocultas en verde</text>
    </svg>
    <ol class="agenda">
@@AGENDA@@
    </ol>
  </section>
</main>
</body>
</html>
'''.replace('@@C@@', COMUN).replace('@@BARRAS@@', barras_port).replace(
    '@@AGENDA@@', '\n'.join(f'      <li>{t} <small>{m} min</small></li>' for t, m in AGENDA))
escena('00-portada', 'Orquestación con Qwen Coder · Sesión 2 · portada', 'experiencia', 'ver', 4, PORTADA)

# ====================================================================== 01 el proyecto
MODULOS = [
    ('sesion', 'Login y sesión'),
    ('ventas', 'Filtros y KPI'),
    ('excel', 'CSV para Excel'),
    ('pdf', 'PDF de una página'),
]
TAREAS = [('act', 'Construir', 'El programador escribe'),
          ('oro', 'Verificar', 'Oráculo oculto'),
          ('pol', 'Revisar', 'Revisión de pares')]
FILAS = [3, 21, 39, 57]
notas_proy = []
for f, (m, d) in enumerate(MODULOS):
    top = FILAS[f]
    notas_proy.append(f'      <div class="nt ficha s m" data-r="{-.6 if f % 2 else .6}" style="left:1%; top:{top}%; width:17%"><span class="k">módulo</span><span class="t mono">{m}.mjs</span></div>')
    for c, (cls, k, t) in enumerate(TAREAS):
        notas_proy.append(f'      <div class="nt {cls} c{c}" data-r="{(-1) ** (f + c) * .8}" style="left:{22 + 27 * c}%; top:{top}%; width:21%"><span class="k">{k}</span><span class="t">{t}</span></div>')
notas_proy += [
    '      <p class="pastilla" id="lMac" style="left:1%; top:79%; width:54%">MacBook M4 Pro · 24 GB · Qwen2.5-Coder 14b · todo en local</p>',
    '      <div class="nt hot" id="nPrim" data-r="1" style="left:57%; top:75%; width:41%"><span class="k">Primera corrida · Ollama</span><span class="t">595 s · 12,1 tok/s<small>4 reparaciones · 1 escalada a Claude</small></span></div>',
]
flechas_proy = []
for f in range(4):
    y = round((FILAS[f] + 6) * 5.2)
    flechas_proy.append(f'        <path id="x{f}a" class="trazo flecha c1f" d="M348 {y} L388 {y}"/>')
    flechas_proy.append(f'        <path id="x{f}b" class="trazo flecha c2f" d="M564 {y} L604 {y}"/>')

escena('01-el-proyecto', 'El proyecto: una tienda de camisetas', 'conceptualizacion', 'entender', 8, lamina(
    'El proyecto', 'Sesión 2 · El proyecto real',
    'Cuatro módulos, doce tareas, <em>una sola Mac</em>',
    'Cuadrícula de cuatro filas, una por módulo de la tienda de camisetas: sesion, ventas, excel y pdf. Cada fila tiene tres tareas en orden: construir, verificar con el oráculo oculto y revisión de pares; doce tareas en total. Abajo, la máquina (MacBook M4 Pro de 24 GB con Qwen2.5-Coder 14b) y la primera corrida: 595 segundos, 12,1 tokens por segundo, 4 reparaciones y 1 escalada a Claude.',
    '\n'.join(flechas_proy),
    '\n'.join(notas_proy),
    [
        ('El encargo', P('La lógica de una tienda de camisetas, partida en cuatro módulos sin dependencias: <b>sesion</b> (login y sesión), <b>ventas</b> (filtros e indicadores), <b>excel</b> (un CSV que Excel en español abre bien) y <b>pdf</b> (un PDF de una página).')),
        ('Primero, construir', P('Por cada módulo, una tarea de construcción. El programador recibe el enunciado y nada más: ni las pruebas ni el código de los otros módulos.')),
        ('Luego, verificar con el oráculo', P('La segunda tarea corre pruebas ocultas que ningún agente ve. Si falla, el módulo vuelve a repararse con el error concreto.')),
        ('Al final, la revisión de pares', P('Otro agente compara el código con el enunciado y anota observaciones. Cuatro módulos por tres tareas: doce tareas.')),
        ('Dónde corre', P('Todo en una MacBook M4 Pro de 24 GB, con Qwen2.5-Coder 14b. La primera corrida, con Ollama, tardó 595 segundos: 12,1 tok/s, 4 reparaciones y 1 escalada a Claude.'),
         aparte('Hoy vemos cómo esa corrida bajó a 155 segundos.')),
    ],
    '''  TEO.escena([
    function (tl) { TEO.pegar(tl, ".m"); },
    function (tl) { TEO.pegar(tl, ".c0"); },
    function (tl) { ["x0a", "x1a", "x2a", "x3a"].forEach(function (id, i) { flecha(tl, id, i ? "<" : undefined); }); TEO.pegar(tl, ".c1"); },
    function (tl) { ["x0b", "x1b", "x2b", "x3b"].forEach(function (id, i) { flecha(tl, id, i ? "<" : undefined); }); TEO.pegar(tl, ".c2"); },
    function (tl) { tl.from("#lMac", { autoAlpha: 0, y: 8, duration: .4 }); TEO.pegar(tl, "#nPrim"); }
  ], {
    preparar: function () { puntasDe(["x0a", "x1a", "x2a", "x3a", "x0b", "x1b", "x2b", "x3b"]); },
    textoFin: "Fin del proyecto"
  });''',
    css='''
  .nt .t small { font-size: .8em; }
'''))

# ====================================================================== 02 el oráculo
ATRAPADAS = [
    ('aE', 'excel · el cero', "if (typeof v !== 'string') return '';", 'El 0 salía como celda vacía', 3),
    ('aS', 'sesion · «nunca lanza»', 'sesion.usuario  // sesion = undefined', 'Lanzaba un error aunque el enunciado dice que nunca lanza', 35),
    ('aV', 'ventas · el nombre', 'const { totalAnterior } = datos;', 'La propiedad se llama total: el cálculo daba NaN', 67),
]
notas_or = [
    '      <div class="nt info" id="nEj" data-r="-1" style="left:1%; top:5%; width:30%"><span class="k">Ejemplos del enunciado</span><span class="t">Los ve el programador. Pasaban en verde.</span><span class="sello ok solo-anim" id="sEj">pasa</span></div>',
    '      <div class="nt oro" id="nOr" data-r="1" style="left:1%; top:40%; width:30%"><span class="k">Oráculo · capa oro</span><span class="t">17 pruebas ocultas<small>Ni el programador, ni el revisor las ven</small></span></div>',
    '      <p class="pastilla" id="lFin" style="left:1%; top:81%; width:30%">17/17 en las 5 corridas</p>',
]
for i, k, cod, que, top in ATRAPADAS:
    notas_or.append(f'      <div class="nt ficha r" id="{i}" style="left:39%; top:{top}%; width:59%"><span class="k">{k}</span><span class="t mono">{cod}</span><span class="t"><small>{que}</small></span><span class="sello solo-anim" id="s{i}">atrapado</span></div>')

escena('02-oraculo-oculto', 'El oráculo oculto y sus tres atrapadas', 'conceptualizacion', 'entender', 10, lamina(
    'El oráculo oculto', 'Sesión 2 · El oráculo oculto',
    'Los ejemplos pasaban; <em>el oráculo no se dejó convencer</em>',
    'A la izquierda, los ejemplos del enunciado, que pasaban en verde, y el oráculo: 17 pruebas ocultas que ningún agente ve. Al centro, un muro dorado. A la derecha, tres errores reales que el oráculo atrapó: en excel el 0 se volvía celda vacía por typeof v !== string; en sesion se leía usuario de undefined y lanzaba aunque el enunciado dice que nunca lanza; en ventas se desestructuraba totalAnterior cuando la propiedad es total, y daba NaN.',
    '''        <rect id="muro" x="276" y="16" width="14" height="470" rx="5" style="fill:#E9C25A; stroke:#8A6A00; stroke-width:2"/>''',
    '\n'.join(notas_or),
    [
        ('Los ejemplos pasan', P('El enunciado trae ejemplos y el programador los ve. Qwen escribía código que los cumplía. Si la verificación fuera solo eso, los tres módulos habrían salido «listos».')),
        ('El oráculo: 17 pruebas ocultas', P('El orquestador guarda 17 pruebas que ningún agente ve. No se pueden ajustar para «pasar»: solo miden si el código cumple el enunciado.')),
        ('Excel: el cero que desaparecía', P('Para convertir a texto, Qwen filtraba con <code>typeof v !== \'string\'</code>. Un número no es string, así que el 0 salía como celda vacía. Los ejemplos no tenían ningún 0.')),
        ('Sesión: «nunca lanza»', P('El enunciado decía que la función nunca lanza. El código leía <code>.usuario</code> de algo <code>undefined</code> y reventaba con un TypeError.')),
        ('Ventas: un nombre que no existe', P('El código desestructuraba <code>totalAnterior</code>, pero la propiedad se llama <code>total</code>. Llegaba <code>undefined</code> y el cálculo daba NaN.')),
        ('Por qué oculto', P('Si el agente ve la prueba, termina escribiendo para la prueba. Oculta, mide el enunciado. Las cinco corridas terminaron con 17 de 17 en verde, verificado aparte.')),
    ],
    '''  TEO.escena([
    function (tl) { TEO.pegar(tl, "#nEj"); sello(tl, "#sEj", "+=.2"); },
    function (tl) { tl.from("#muro", { scaleY: 0, transformOrigin: "50% 100%", duration: .8 }); TEO.pegar(tl, "#nOr"); },
    function (tl) { TEO.pegar(tl, "#aE"); sello(tl, "#saE", "+=.2"); },
    function (tl) { TEO.pegar(tl, "#aS"); sello(tl, "#saS", "+=.2"); },
    function (tl) { TEO.pegar(tl, "#aV"); sello(tl, "#saV", "+=.2"); },
    function (tl) { tl.from("#lFin", { autoAlpha: 0, y: 8, duration: .45 }); tl.to("#nEj", { opacity: .55, duration: .4 }, "<"); }
  ], {
    preparar: function () { gsap.set(["#sEj", "#saE", "#saS", "#saV"], { autoAlpha: 0 }); },
    textoFin: "Fin del oráculo"
  });''',
    css='''
  .nt.ficha .sello { top: -1.1em; right: -.5em; font-size: .95em; }
  .nt.ficha .t.mono { font-size: 1.05em; }
'''))

# ====================================================================== 03 reparar sin ciclos
escena('03-reparar-sin-ciclos', 'Reparar barato y sin ciclos', 'conceptualizacion', 'entender', 10, lamina(
    'Reparar sin ciclos', 'Sesión 2 · Parches y escalado',
    'Una reparación local, una con Claude <em>y se corta</em>',
    'Flujo de reparación: la verificación falla y Qwen repara en local con un parche BUSCAR y REEMPLAZAR. Si pasa, la tarea queda lista. Si falla, se hace una sola reparación con Claude, que usa claude -p sin herramientas. Si tampoco pasa, se corta: no hay tercer intento. Abajo, cómo se ve un parche y qué pasa si no calza.',
    '''        <path id="a1" class="trazo flecha" d="M140 240 L172 240"/>
        <path id="a2" class="trazo flecha" d="M316 240 L370 240"/>
        <path id="a3" class="trazo flecha" d="M246 204 C246 110 300 44 370 44"/>
        <path id="a4" class="trazo flecha" d="M456 204 L456 78"/>
        <path id="a5" class="trazo flecha" d="M540 240 L596 240"/>
        <text id="t3" class="rot" x="196" y="128">pasa</text>
        <text id="t2" class="rot" x="322" y="228">falla</text>
        <text id="t4" class="rot" x="466" y="146">pasa</text>
        <text id="t5" class="rot" x="547" y="228">falla</text>''',
    '''      <div class="nt hot" id="n0" data-r="-1" style="left:1%; top:40%; width:16%"><span class="k">Verificación</span><span class="t">Falla</span></div>
      <div class="nt act" id="n1" data-r="1" style="left:22%; top:40%; width:17%"><span class="k">1 · Qwen, en local</span><span class="t">Repara con un parche</span></div>
      <div class="nt info" id="nOk" data-r="-.6" style="left:47%; top:3%; width:20%"><span class="k">Tarea</span><span class="t">Lista</span></div>
      <div class="nt cmd" id="n3" data-r=".8" style="left:47%; top:40%; width:20%"><span class="k">2 · Claude, una vez</span><span class="t">claude -p, sin herramientas<small>parche de ~200 tokens en ~6 s</small></span></div>
      <div class="nt fantasma" id="n4" data-r="-1" style="left:75%; top:40%; width:23.5%"><span class="k">3 · Se corta</span><span class="t">Queda marcada; no hay tercer intento</span></div>
      <div class="nt ficha s" id="nPar" data-r="-.5" style="left:1%; top:66%; width:45%"><span class="k">Así se pide el parche</span><span class="t mono">&lt;&lt;&lt;&lt;&lt;&lt;&lt; BUSCAR<br>(líneas tal cual del archivo)<br>=======<br>(las líneas nuevas)<br>&gt;&gt;&gt;&gt;&gt;&gt;&gt; FIN</span></div>
      <div class="nt ficha p" id="nReg" data-r=".5" style="left:50%; top:66%; width:48%"><span class="k">Reglas del parche</span><span class="t"><small>60–220 tokens en vez de ~500 del archivo entero</small><small>Si no calza o es ambiguo, se pide el archivo completo</small><small>Qwen lo envolvía en ```js: ahora se quitan esas cercas</small></span></div>''',
    [
        ('Falla la verificación', P('Una prueba no pasa. Antes, Qwen reescribía el archivo entero para corregir una línea: unos 500 tokens cada vez.')),
        ('Reparar con un parche', P('Ahora devuelve solo lo que cambia, en bloques BUSCAR y REEMPLAZAR: entre 60 y 220 tokens. Mismos tok/s, mucho menos que generar.')),
        ('Si el parche no calza', P('Si el texto a buscar no está o aparece dos veces, no se aplica a medias: se pide el archivo completo. Y un hallazgo: los parches de Qwen fallaban porque los envolvía en ```js. Ahora esas cercas se quitan antes de aplicar.')),
        ('Si pasa, lista', P('La tarea vuelve a verificarse y, si pasa, queda lista. En la mayoría de los casos, aquí termina.')),
        ('Si falla, UNA vez con Claude', P('Tras una reparación local fallida, una sola reparación con Claude, por <code>claude -p</code> y sin herramientas. En la corrida con Ollama arregló con un parche de unos 200 tokens en unos 6 segundos.')),
        ('Si tampoco, se corta', P('No hay tercer intento ni bucle. La tarea queda marcada y el oráculo impide que llegue a «listo». Un ciclo infinito gasta tiempo y no garantiza nada.')),
    ],
    '''  TEO.escena([
    function (tl) { TEO.pegar(tl, "#n0"); flecha(tl, "a1"); TEO.pegar(tl, "#n1"); },
    function (tl) { TEO.pegar(tl, "#nPar"); },
    function (tl) { TEO.pegar(tl, "#nReg"); },
    function (tl) { flecha(tl, "a3"); tl.from("#t3", { autoAlpha: 0, duration: .3 }); TEO.pegar(tl, "#nOk"); },
    function (tl) {
      tl.to(["#nPar", "#nReg"], { opacity: .35, duration: .4 });
      flecha(tl, "a2"); tl.from("#t2", { autoAlpha: 0, duration: .3 }); TEO.pegar(tl, "#n3");
      flecha(tl, "a4"); tl.from("#t4", { autoAlpha: 0, duration: .3 });
    },
    function (tl) { flecha(tl, "a5"); tl.from("#t5", { autoAlpha: 0, duration: .3 }); TEO.pegar(tl, "#n4"); }
  ], {
    preparar: function () { puntasDe(["a1", "a2", "a3", "a4", "a5"]); },
    textoFin: "Fin de la reparación"
  });''',
    css='''
  #nReg .t small { font-size: .9em; font-weight: 600; opacity: 1; margin-top: .25em; }
  #nPar .t.mono { font-size: .88em; }
'''))

# ====================================================================== 04 velocidad
TOKENS = ['if', ' (v', ' ==', ' null)', ' return', " '';", ' return', ' String', '(v', ');']
ACEPTA = 7
tok_html = ''.join(f'<span class="tk" id="k{i}">{t.strip()}</span>' for i, t in enumerate(TOKENS))
escena('04-velocidad', 'Velocidad: adivinar y confirmar', 'conceptualizacion', 'entender', 10, lamina(
    'Velocidad', 'Sesión 2 · Decodificación especulativa',
    'Un modelo chico adivina, <em>el grande confirma</em>',
    'Arriba, el techo físico: 273 GB por segundo de memoria divididos entre 9 GB del modelo dan unos 30 tokens por segundo. Al centro, una fila de tokens: Qwen 0.5b propone hasta 24 y Qwen 14b los confirma en una sola pasada; acepta los primeros siete y corta en el octavo. Abajo, los resultados: por 2,2 en las mismas condiciones, 96 a 100 por ciento de acierto al reparar y cerca de 48 por ciento con código nuevo. A la derecha, la lección de hardware: con batería o modo de bajo consumo, de 33 a 14–16 tokens por segundo.',
    '',
    f'''      <p class="formula" id="fTecho" style="left:1%; top:1%">273 GB/s ÷ 9 GB ≈ 30<span class="que"><span>tok/s sin especular · cada token lee el modelo entero</span></span></p>
      <div class="nt cmd" id="nBor" data-r="-1" style="left:1%; top:36%; width:22%"><span class="k">Qwen 0.5b · borrador</span><span class="t">Adivina hasta 24 tokens</span></div>
      <div class="nt act" id="nCon" data-r="1" style="left:1%; top:56%; width:22%"><span class="k">Qwen 14b · confirma</span><span class="t">Todos en una pasada</span></div>
      <div class="fila-tk" id="fila" style="left:26%; top:46%; width:73%">{tok_html}</div>
      <div class="nt oro" id="r1" data-r="-1" style="left:1%; top:78%; width:30%"><span class="k">Mismas condiciones</span><span class="t">×2,2 · mismo modelo, misma calidad</span></div>
      <div class="nt info" id="r2" data-r="1" style="left:34%; top:78%; width:31%"><span class="k">Al reparar</span><span class="t">Acierta 96–100 %</span></div>
      <div class="nt ev" id="r3" data-r="-.8" style="left:68%; top:78%; width:30%"><span class="k">Con código nuevo</span><span class="t">Acierta ~48 %</span></div>
      <div class="nt hot" id="nBat" data-r="1.2" style="left:66%; top:4%; width:32%"><span class="k">Lección de hardware</span><span class="t">Batería o bajo consumo: 33 → 14–16 tok/s</span></div>''',
    [
        ('El techo físico', P('Para cada token, la GPU lee el modelo entero de la memoria. La M4 Pro mueve unos 273 GB/s y el 14b ocupa unos 9 GB: 273 ÷ 9 ≈ 30 tok/s. Generando de uno en uno, no hay truco que pase de ahí.')),
        ('Un borrador que adivina', P('Qwen 0.5b, un modelo diminuto, propone hasta 24 tokens de golpe. Es rápido porque pesa poco; y se equivoca, porque sabe poco.')),
        ('El grande confirma en una pasada', P('El 14b revisa todos los tokens propuestos en una sola lectura de memoria. Acepta los que él mismo habría escrito y corta en el primero distinto, donde pone el suyo.'),
         aparte('Con temperatura 0 el resultado es el mismo que sin borrador: mismo modelo, misma calidad.')),
        ('Cuánto rinde', P('×2,2 en las mismas condiciones. Al reparar acierta entre 96 y 100 %, porque el parche se parece al archivo que ya existe. Con código nuevo acierta cerca del 48 %: ahí ayuda menos.')),
        ('La lección de hardware', P('Con batería o en «modo de bajo consumo», la GPU cae de 33 a 14–16 tok/s. La Mac tenía activado el bajo consumo aun con el cargador puesto. Antes de medir, mira la máquina.')),
    ],
    f'''  var ks = TEO.$$(".tk");
  TEO.escena([
    function (tl) {{ tl.from("#fTecho", {{ autoAlpha: 0, y: 14, duration: .6 }}); tl.from("#fTecho .que", {{ autoAlpha: 0, duration: .4 }}); }},
    function (tl) {{ TEO.pegar(tl, "#nBor"); tl.from(ks, {{ autoAlpha: 0, x: -18, duration: .3, stagger: .07 }}); }},
    function (tl) {{
      TEO.pegar(tl, "#nCon");
      tl.to(ks.slice(0, {ACEPTA}), {{ backgroundColor: "#B9DFA3", borderColor: "#1F7A3E", duration: .25, stagger: .1 }});
      tl.to(ks[{ACEPTA}], {{ backgroundColor: "#E2546B", borderColor: "#B3261E", duration: .3 }});
      tl.to(ks.slice({ACEPTA + 1}), {{ opacity: .25, duration: .3 }});
    }},
    function (tl) {{ TEO.pegar(tl, ["#r1", "#r2", "#r3"]); }},
    function (tl) {{ TEO.pegar(tl, "#nBat"); }}
  ], {{ textoFin: "Fin de la velocidad" }});''',
    css='''
  .formula { font-size: 4.6cqw; }
  .formula .que { font-size: .3em; text-transform: none; letter-spacing: .04em; }
  .fila-tk { position: absolute; display: flex; flex-wrap: wrap; gap: .45em; font: 700 1.9cqw/1 var(--mono); }
  .tk { color: var(--n-tinta); background: var(--n-ficha); border: 2px solid var(--gris); border-radius: 6px; padding: .45em .5em; box-shadow: var(--sombra); white-space: pre; }
'''))

# ====================================================================== 05 aprende sola
escena('05-aprende-sola', 'Una orquesta que aprende sola', 'conceptualizacion', 'entender', 9, lamina(
    'Aprende sola', 'Sesión 2 · Reglas aprendidas y memoria del revisor',
    'Cada error corregido <em>deja una regla</em>',
    'Arriba, el ciclo de aprendizaje: una verificación falla, luego queda en verde, Claude Haiku escribe una regla y la regla entra en el prompt de las tareas siguientes. Debajo, las dos reglas reales: usar String(v) tras verificar null y nunca typeof v distinto de string; y usar los nombres exactos al desestructurar. Resultado: 4 de 4 módulos al primer intento. Abajo, la memoria del revisor: marcaba la misma falsa alarma en cada corrida; se anota no marques X porque el enunciado dice Y, y las observaciones bajan a cero.',
    '''        <path id="b1" class="trazo flecha" d="M188 50 L212 50"/>
        <path id="b2" class="trazo flecha" d="M388 50 L412 50"/>
        <path id="b3" class="trazo flecha" d="M588 50 L612 50"/>
        <path id="b4" class="trazo flecha" d="M236 362 L262 362"/>
        <path id="b5" class="trazo flecha" d="M590 362 L618 362"/>
        <path id="linea" class="trazo fino guion" d="M10 286 L790 286"/>''',
    '''      <div class="nt hot" id="c1" data-r="-1" style="left:1%; top:3%; width:22%"><span class="k">1</span><span class="t">Una verificación falla</span></div>
      <div class="nt info" id="c2" data-r="1" style="left:27%; top:3%; width:22%"><span class="k">2</span><span class="t">Se repara y queda en verde</span></div>
      <div class="nt cmd" id="c3" data-r="-1" style="left:52%; top:3%; width:21.5%"><span class="k">3 · Claude Haiku</span><span class="t">Escribe la regla</span></div>
      <div class="nt pol" id="c4" data-r="1" style="left:77%; top:3%; width:22%"><span class="k">4</span><span class="t">Entra al prompt de lo que sigue</span></div>
      <div class="nt ficha k" id="g1" data-r="-.5" style="left:1%; top:22%; width:48%"><span class="k">Regla real · de excel</span><span class="t">Para convertir a string, usa String(v) tras verificar null; nunca typeof v !== 'string', que descarta números.</span></div>
      <div class="nt ficha k" id="g2" data-r=".5" style="left:51%; top:22%; width:48%"><span class="k">Regla real · de ventas</span><span class="t">Al desestructurar, usa los nombres exactos de las propiedades; nunca otros nombres, que devuelven undefined y rompen cálculos.</span></div>
      <p class="pastilla" id="lRes" style="left:24%; top:47%; width:52%">4 de 4 módulos al primer intento</p>
      <div class="nt hot" id="v1" data-r="-1" style="left:1%; top:62%; width:28%"><span class="k">Revisor · Qwen</span><span class="t">La misma falsa alarma, corrida tras corrida</span><span class="sello solo-anim" id="sV">otra vez</span></div>
      <div class="nt ficha p" id="v2" data-r=".6" style="left:33%; top:58%; width:40%"><span class="k">Memoria del revisor · sesion</span><span class="t">No marques que validarLogin deba devolver «Datos incompletos» cuando usuarios no es un arreglo: el enunciado dice que devuelve «Usuario o contraseña incorrectos».</span></div>
      <div class="nt info" id="v3" data-r="-1" style="left:78%; top:63%; width:21%"><span class="k">Resultado</span><span class="t">0 observaciones</span></div>''',
    [
        ('Un error que se corrige', P('Una verificación falla, la tarea se repara y queda en verde. Ese par, el error y su arreglo, vale oro: dice exactamente qué no sabía el modelo.')),
        ('Haiku lo convierte en regla', P('Claude Haiku escribe una regla con la forma «Para X, usa A; nunca B». Sin valores de la prueba: así el oráculo sigue siendo independiente y no se filtra.')),
        ('La regla viaja', P('La regla entra en el prompt de todas las tareas siguientes. Estas son las dos que se escribieron solas el 19-11-2026, de excel y de ventas.')),
        ('Resultado', P('Con las reglas puestas, los 4 módulos pasaron al primer intento. Lo que costó una reparación en un módulo ya no se repite en el siguiente.')),
        ('El revisor también se equivoca', P('El revisor marcaba la misma falsa alarma corrida tras corrida: que validarLogin debía devolver «Datos incompletos» si usuarios no es un arreglo. El enunciado dice lo contrario.')),
        ('Memoria del revisor', P('Ahora se anota «No marques X: el enunciado dice Y». El revisor la lee antes de revisar y no la repite: 0 observaciones.')),
    ],
    '''  TEO.escena([
    function (tl) { TEO.pegar(tl, "#c1"); flecha(tl, "b1"); TEO.pegar(tl, "#c2"); },
    function (tl) { flecha(tl, "b2"); TEO.pegar(tl, "#c3"); },
    function (tl) { flecha(tl, "b3"); TEO.pegar(tl, "#c4"); TEO.pegar(tl, ["#g1", "#g2"]); },
    function (tl) { tl.from("#lRes", { autoAlpha: 0, scale: .8, duration: .45, ease: "back.out(2)" }); },
    function (tl) { TEO.trazar(tl, "#linea", { duration: .8 }); TEO.pegar(tl, "#v1"); sello(tl, "#sV", "+=.2"); },
    function (tl) { flecha(tl, "b4"); TEO.pegar(tl, "#v2"); flecha(tl, "b5"); TEO.pegar(tl, "#v3"); tl.to("#sV", { autoAlpha: 0, duration: .3 }); }
  ], {
    preparar: function () { puntasDe(["b1", "b2", "b3", "b4", "b5"]); gsap.set("#sV", { autoAlpha: 0 }); },
    textoFin: "Fin del aprendizaje"
  });''',
    css='''
  #g1 .t, #g2 .t, #v2 .t { font-size: .9em; font-weight: 600; }
  #lRes { font-size: 1.9cqw; }
  .nt .sello { font-size: .85em; }
'''))

# ====================================================================== 06 práctica: ¿qué mejora lo arregló?
MEJORAS = [
    ('esp', 'Decodificación especulativa', 'acelera la generación: no corrige ningún error'),
    ('par', 'Parches BUSCAR/REEMPLAZAR', 'reduce los tokens de cada reparación'),
    ('ora', 'Oráculo oculto', 'detecta errores con pruebas que nadie ve'),
    ('esc', 'Escalado sin ciclos', 'pone tope a las reparaciones: 1 local, 1 con Claude y se corta'),
    ('reg', 'Reglas aprendidas', 'evita que el mismo error vuelva en la tarea siguiente'),
    ('mem', 'Memoria del revisor', 'evita que el revisor repita una falsa alarma'),
    ('baj', 'Quitar el bajo consumo', 'devuelve a la GPU su velocidad normal'),
]
CASOS = [
    ('Para corregir una sola línea, Qwen reescribía el archivo entero: unos 500 tokens por reparación.', 'par',
     'Con parches pide solo lo que cambia: entre 60 y 220 tokens.'),
    ('El 0 salía como celda vacía en el CSV, y los ejemplos del enunciado no lo notaron.', 'ora',
     'Una de las 17 pruebas ocultas tenía un 0. Los ejemplos, no.'),
    ('El revisor anotaba en cada corrida que validarLogin debía devolver «Datos incompletos», cuando el enunciado dice otra cosa.', 'mem',
     'Se anota «No marques X: el enunciado dice Y» y la observación desaparece.'),
    ('Una reparación fallaba, se volvía a intentar y volvía a fallar, sin final.', 'esc',
     'Una reparación local, una con Claude y se corta: nunca hay un bucle.'),
    ('El 14b generaba unos 12 tok/s, lejos del techo físico de unos 30.', 'esp',
     'El 0.5b adivina y el 14b confirma en una pasada: ×2,2 con el mismo modelo.'),
    ('Tras arreglar la desestructuración en un módulo, el módulo siguiente podía caer en lo mismo.', 'reg',
     'Haiku escribió «usa los nombres exactos de las propiedades» y entró al prompt de lo que seguía.'),
    ('Con el cargador puesto, la GPU rendía 14–16 tok/s en lugar de 33.', 'baj',
     'La Mac tenía activado el modo de bajo consumo. Al quitarlo, la corrida 7 volvió a 32,3 tok/s.'),
]


def js_str(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


datos_mej = ',\n    '.join(f'{{ id: {js_str(i)}, nombre: {js_str(n)}, hace: {js_str(h)} }}' for i, n, h in MEJORAS)
datos_cas = ',\n    '.join(f'{{ texto: {js_str(t)}, ok: {js_str(o)}, por: {js_str(p)} }}' for t, o, p in CASOS)
sin_js = '\n'.join(f'      <li>{t} → <b>{dict((i, n) for i, n, _ in MEJORAS)[o]}</b></li>' for t, o, _ in CASOS)

PRACTICA = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>¿Qué mejora lo arregló? · Orquestación con Qwen Coder</title>
<link rel="stylesheet" href="@@C@@teoria.css">
<style>
  .jg { max-width: 1240px; min-height: 100vh; margin: 0 auto; padding: 4vh 4vw; display: grid; gap: 2.4vh; align-content: center; }
  .ceja { font: 700 .75em/1 var(--mono); color: var(--acento); margin: 0; }
  h1 { margin: 0; font: 600 clamp(1.6em, 3.2vw, 2.7em)/1.08 var(--serif); }
  h1 em { color: var(--acento); }
  .sub { margin: 0; color: var(--gris); max-width: 46em; }
  .tablero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2.4vw; align-items: start; }
  .caso { background: var(--n-act); color: var(--n-tinta); box-shadow: var(--sombra); padding: 1.1em 1.2em 1.3em; transform: rotate(-.6deg); display: grid; gap: .7em; min-height: 13em; align-content: start; }
  .num { margin: 0; font: 700 .72em/1 var(--mono); opacity: .8; }
  .prob { margin: 0; font: 650 1.25em/1.3 var(--serif); }
  .resp { margin: 0; font-size: .95em; min-height: 3em; }
  .resp b { display: block; font: 800 .8em/1.2 var(--mono); margin-bottom: .2em; }
  .resp.bien b { color: #1F7A3E; } .resp.mal b { color: #B3261E; }
  .ops { display: grid; gap: .5em; }
  .op { font: inherit; font-weight: 650; text-align: left; border-radius: 10px; padding: .6em .9em; border: 2px solid var(--linea); background: var(--papel2); color: var(--tinta); cursor: pointer; transition: background .2s, border-color .2s, transform .15s; }
  .op:hover:not([disabled]) { background: var(--papel3); transform: translateX(3px); }
  .op:focus-visible, .btn:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; }
  .op.bien { background: #B9DFA3; border-color: #1F7A3E; color: #16181D; }
  .op.mal { background: #F2C4D8; border-color: #B3261E; color: #16181D; }
  .op[disabled] { cursor: default; }
  .pie { display: flex; gap: .8em; align-items: center; flex-wrap: wrap; }
  .marcador { font: 700 .9em var(--mono); color: var(--gris); margin-right: auto; }
  .btn { font: 700 .9em var(--sans); border-radius: 999px; padding: .6em 1.2em; border: 1px solid var(--linea); background: var(--papel2); color: var(--tinta); cursor: pointer; }
  .btn.pri { background: var(--tinta); color: var(--papel); border-color: transparent; }
  .btn[disabled] { opacity: .38; cursor: default; }
  .sinjs { margin: 0; padding-left: 1.2em; display: grid; gap: .4em; }
  html.js .sinjs-caja { display: none; }
  html:not(.js) .tablero, html:not(.js) .pie { display: none; }
  @media (prefers-reduced-motion: reduce) { .op { transition: none; } .op:hover:not([disabled]) { transform: none; } }
  @media (max-width: 860px) { .tablero { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<script>document.documentElement.classList.add("js");</script>
<main class="jg">
  <p class="ceja">Práctica · 7 problemas reales de las corridas del 18 y 19-11-2026</p>
  <h1>¿Qué mejora <em>lo arregló</em>?</h1>
  <p class="sub">Lee el problema y elige la mejora que lo resolvió. Si fallas, te decimos qué hace esa mejora y vuelves a intentar. Cuenta solo el primer intento.</p>
  <section class="tablero">
    <div class="caso">
      <p class="num" id="num">Problema 1 de 7</p>
      <p class="prob" id="prob"></p>
      <p class="resp" id="resp" aria-live="polite"></p>
    </div>
    <div class="ops" id="ops" role="group" aria-label="Mejoras"></div>
  </section>
  <div class="pie">
    <span class="marcador" id="marcador">0 al primer intento</span>
    <button type="button" class="btn" id="otra">Empezar de nuevo</button>
    <button type="button" class="btn pri" id="sigc" disabled>Siguiente problema →</button>
  </div>
  <div class="sinjs-caja">
    <ol class="sinjs">
@@SINJS@@
    </ol>
  </div>
</main>
<script>
(function () {
  var MEJORAS = [
    @@MEJ@@
  ];
  var CASOS = [
    @@CAS@@
  ];
  var nombre = {}; MEJORAS.forEach(function (m) { nombre[m.id] = m; });
  var $ = function (id) { return document.getElementById(id); };
  var i = 0, aciertos = 0, primero = true, resuelto = false;
  MEJORAS.forEach(function (m) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "op"; b.textContent = m.nombre; b.setAttribute("data-id", m.id);
    b.addEventListener("click", function () { elegir(m.id, b); });
    $("ops").appendChild(b);
  });
  function botones() { return Array.prototype.slice.call(document.querySelectorAll(".op")); }
  function mostrar() {
    var c = CASOS[i]; primero = true; resuelto = false;
    $("num").textContent = "Problema " + (i + 1) + " de " + CASOS.length;
    $("prob").textContent = c.texto;
    $("resp").className = "resp"; $("resp").innerHTML = "";
    botones().forEach(function (b) { b.className = "op"; b.disabled = false; });
    $("sigc").disabled = true;
    $("sigc").textContent = i < CASOS.length - 1 ? "Siguiente problema →" : "Ver resultado";
  }
  function escribir(clase, titulo, texto) {
    var r = $("resp"); r.className = "resp " + clase; r.innerHTML = "";
    var b = document.createElement("b"); b.textContent = titulo; r.appendChild(b);
    r.appendChild(document.createTextNode(texto));
  }
  function elegir(id, b) {
    if (resuelto) return;
    var c = CASOS[i];
    if (id === c.ok) {
      resuelto = true; if (primero) aciertos++;
      b.classList.add("bien");
      botones().forEach(function (x) { x.disabled = true; });
      escribir("bien", primero ? "Correcto, al primer intento" : "Correcto", c.por);
      $("sigc").disabled = false; $("sigc").focus();
    } else {
      primero = false; b.classList.add("mal"); b.disabled = true;
      escribir("mal", "Esa no fue", "«" + nombre[id].nombre + "» " + nombre[id].hace + ". Prueba otra.");
    }
    $("marcador").textContent = aciertos + " al primer intento";
  }
  $("sigc").addEventListener("click", function () {
    if (i < CASOS.length - 1) { i++; mostrar(); return; }
    $("num").textContent = "Resultado";
    $("prob").textContent = aciertos + " de " + CASOS.length + " al primer intento.";
    escribir("bien", "Siete mejoras, siete problemas distintos", "Ninguna sola bastaba: la corrida bajó de 595 a 155 segundos porque se sumaron todas, y el oráculo cuidó que la calidad no bajara.");
    $("sigc").disabled = true;
  });
  $("otra").addEventListener("click", function () { i = 0; aciertos = 0; $("marcador").textContent = "0 al primer intento"; mostrar(); });
  mostrar();
})();
</script>
</body>
</html>
'''.replace('@@C@@', COMUN).replace('@@MEJ@@', datos_mej).replace('@@CAS@@', datos_cas).replace('@@SINJS@@', sin_js)
escena('06-que-mejora-lo-arreglo', 'Práctica: ¿qué mejora lo arregló?', 'experimentacion', 'practicar', 7, PRACTICA)

# ====================================================================== 07 las corridas
# Barras: base y = 440, 0,6 unidades por segundo (595 s → 357).
XS = [60, 145, 230, 315, 400]
svg_cor = ['        <path id="eje" class="trazo" d="M40 440 L490 440"/>']
notas_cor = []
for k, ((r, s, tks, rep, esc, obs), x) in enumerate(zip(CORRIDAS, XS)):
    h = round(s * .6)
    svg_cor.append(f'        <rect id="b{k}" class="barra {"bAntes" if k == 0 else "bDesp"}" x="{x}" y="{440 - h}" width="64" height="{h}"/>')
    notas_cor.append(f'      <p class="pastilla val" id="v{k}" style="left:{(x - 8) / 8:.2f}%; top:{(440 - h - 52) / 5.2:.1f}%; width:10%">{s} s<br><span>{tks} tok/s</span></p>')
    notas_cor.append(f'      <p class="pastilla lab" id="l{k}" style="left:{(x - 8) / 8:.2f}%; top:87%; width:10%">{r}</p>')
filas = '\n'.join(
    f'<span class="fl" id="f{k}"><b>{r}</b><i>{rep}</i><i>{esc}</i><i>{obs}</i></span>'
    for k, (r, s, tks, rep, esc, obs) in enumerate(CORRIDAS))
notas_cor += [
    f'      <div class="nt ficha s" id="tab" data-r=".4" style="left:64%; top:2%; width:35%"><span class="k">Reparaciones, escaladas a Claude y observaciones</span><span class="t tabla"><span class="fl cab"><b></b><i>rep.</i><i>esc.</i><i>obs.</i></span>{filas}</span></div>',
    '      <div class="nt oro" id="nFin" data-r="-1" style="left:64%; top:68%; width:35%"><span class="k">En las cinco corridas</span><span class="t">17/17 pruebas ocultas en verde<small>595 s → 155 s, con la misma calidad</small></span></div>',
]
escena('07-las-corridas', 'Cinco corridas, una tabla', 'reflexion', 'reflexionar', 9, lamina(
    'Las corridas', 'Sesión 2 · Medido el 19-11-2026',
    'De 595 a 155 segundos, <em>sin perder una prueba</em>',
    'Gráfico de barras con el tiempo total de cinco corridas: Ollama al inicio 595 segundos a 12,1 tok/s; rápida 1, con decodificación especulativa y parches, 196 s a 30,8; rápida 5, con reglas aprendidas, 159 s a 19,8; rápida 6, con memoria del revisor, 241 s a 19,5; rápida 7, sin modo de bajo consumo, 155 s a 32,3. A la derecha, una tabla: reparaciones 4, 1, 1, 0, 0; escaladas a Claude 1, 0, 0, 0, 0; observaciones del revisor 1, 1, 1, 0, 0. Las cinco terminaron con 17 de 17 pruebas ocultas en verde.',
    '\n'.join(svg_cor),
    '\n'.join(notas_cor),
    [
        ('Ollama, al inicio', P('595 segundos a 12,1 tok/s. Cuatro reparaciones y una escalada a Claude. Funcionaba, pero lento y con mucho ir y venir.')),
        ('Rápida 1: especulativa y parches', P('196 segundos a 30,8 tok/s. Una sola reparación y ninguna escalada. El mayor salto del día viene de dos cambios: adivinar y confirmar, y reparar con parches.')),
        ('Rápida 5: reglas aprendidas', P('159 segundos aunque bajó a 19,8 tok/s. ¿Cómo? Con las reglas hubo menos que generar: menos tokens, menos tiempo.')),
        ('Rápida 6: memoria del revisor', P('0 reparaciones, 0 escaladas y, por primera vez, 0 observaciones. Pero tardó 241 segundos: 19,5 tok/s. La calidad ya estaba; faltaba algo fuera del código.')),
        ('Rápida 7: sin bajo consumo', P('La Mac tenía el modo de bajo consumo activado. Al quitarlo, 32,3 tok/s y 155 segundos, con 0 reparaciones, 0 escaladas y 0 observaciones.')),
        ('Lo que no cambió', P('Las cinco corridas terminaron con 17 de 17 pruebas ocultas en verde, verificado aparte. Se ganó velocidad sin pagar con calidad, porque el oráculo no se movió.'),
         aparte('Lee la tabla completa: el tok/s solo no cuenta la historia.')),
    ],
    '''  function crecer(tl, k, pos) {
    tl.from("#b" + k, { scaleY: 0, transformOrigin: "50% 100%", duration: .8, ease: "power2.out" }, pos);
    tl.from(["#v" + k, "#l" + k], { autoAlpha: 0, y: 8, duration: .3 }, "-=.2");
    tl.from("#f" + k, { autoAlpha: 0, x: -10, duration: .35 }, "<");
  }
  TEO.escena([
    function (tl) { TEO.trazar(tl, "#eje", { duration: .6 }); TEO.pegar(tl, "#tab"); crecer(tl, 0); },
    function (tl) { crecer(tl, 1); },
    function (tl) { crecer(tl, 2); },
    function (tl) { crecer(tl, 3); },
    function (tl) { crecer(tl, 4); },
    function (tl) { TEO.pegar(tl, "#nFin"); }
  ], { textoFin: "Fin de las corridas" });''',
    css='''
  .bAntes { fill: var(--papel3); stroke: var(--tinta); stroke-width: 2; }
  .bDesp { fill: var(--acento); stroke: var(--tinta); stroke-width: 2; }
  .pastilla.val { font-size: 1.5cqw; padding: .3em .2em; line-height: 1.25; }
  .pastilla.val span { font-weight: 600; opacity: .75; font-size: .85em; }
  .pastilla.lab { font-size: 1.35cqw; padding: .35em .2em; }
  .tabla { display: grid; gap: .25em; margin-top: .2em; }
  .fl { display: grid; grid-template-columns: 1.7fr repeat(3, 1fr); gap: .3em; align-items: baseline; font: 600 .95em/1.2 var(--mono); border-bottom: 1px dashed rgba(22, 24, 29, .25); padding-bottom: .2em; }
  .fl b { font-weight: 700; } .fl i { font-style: normal; text-align: center; }
  .fl.cab { font-size: .75em; opacity: .7; }
'''))

# ====================================================================== 08 llévalo a tu proyecto
PASOS_LLEVAR = [
    ('oro', 'Oráculo primero', 'Escribe las pruebas ocultas antes que el código, y que ningún agente las vea.'),
    ('act', 'Repara con parches', 'Solo lo que cambia; si no calza, el archivo completo.'),
    ('cmd', 'Un tope, no un bucle', '1 reparación local, 1 con un modelo más fuerte, y se corta.'),
    ('info', 'Guarda lo aprendido', '«Para X, usa A; nunca B», sin valores de las pruebas.'),
    ('pol', 'Memoria del revisor', '«No marques X: el enunciado dice Y».'),
    ('ev', 'Mide la velocidad', 'Especulativa, temperatura 0, caché de prompt; y la máquina enchufada, sin bajo consumo.'),
    ('sis', 'Encierra la ejecución', 'Docker persistente sin red, solo lectura, tope de 60 s.'),
]
notas_ll = []
for k, (cls, t, d) in enumerate(PASOS_LLEVAR):
    col, fila = (0, k) if k < 4 else (1, k - 4)
    notas_ll.append(f'      <div class="nt {cls} pz" data-r="{(-1) ** k * .7}" style="left:{1 + 50 * col}%; top:{2 + 24 * fila}%; width:{47 if col == 0 else 48}%"><span class="k">{k + 1} · {t}</span><span class="t">{d}</span></div>')
notas_ll.append('      <div class="nt ficha k" id="nProy" data-r="-.5" style="left:51%; top:74%; width:48%"><span class="k">Tu proyecto final</span><span class="t">Un sistema de agentes con Qwen Coder que construye y verifica un módulo real, con su bitácora y sus métricas.</span></div>')
escena('08-llevalo-a-tu-proyecto', 'Llévalo a tu proyecto', 'reflexion', 'llevar', 8, lamina(
    'Llévalo a tu proyecto', 'Sesión 2 · Cierre',
    'Siete piezas que <em>puedes copiar el lunes</em>',
    'Siete notas con lo que se lleva a un proyecto propio: oráculo primero; reparar con parches; un tope de reparaciones en vez de un bucle; guardar lo aprendido como reglas; memoria del revisor; medir la velocidad con especulativa, temperatura 0, caché de prompt y la máquina sin bajo consumo; y encerrar la ejecución en Docker sin red. Abajo a la derecha, el proyecto final del curso.',
    '',
    '\n'.join(notas_ll),
    [
        ('Empieza por el oráculo', P('Antes del primer prompt, escribe las pruebas que deciden si algo está bien y escóndelas de los agentes. Es la pieza que hizo posible todo lo demás: sin ella, «más rápido» no significa nada.')),
        ('Repara barato y con tope', P('Parches en vez de archivos enteros, y una escalera corta: una reparación local, una con un modelo más fuerte, y se corta. Un bucle infinito solo gasta.')),
        ('Que la orquesta aprenda', P('Convierte cada error corregido en una regla y cada falsa alarma en una nota para el revisor. Sin valores de las pruebas, para que el oráculo siga siendo independiente.')),
        ('Mide, y mira la máquina', P('Decodificación especulativa, temperatura 0, caché de prompt y un sandbox persistente. Y antes de culpar al modelo, revisa la batería y el modo de bajo consumo.')),
        ('Tu proyecto final', P('Un sistema de agentes con Qwen Coder que construye y verifica un módulo real de punta a punta, con su bitácora de tareas y sus métricas. Empieza por un módulo pequeño y su oráculo.'),
         aparte('Gracias por estas dos sesiones. Dudas y avances, por el grupo del curso.')),
    ],
    '''  var pz = TEO.$$(".pz");
  TEO.escena([
    function (tl) { TEO.pegar(tl, pz[0]); },
    function (tl) { TEO.pegar(tl, [pz[1], pz[2]]); },
    function (tl) { TEO.pegar(tl, [pz[3], pz[4]]); },
    function (tl) { TEO.pegar(tl, [pz[5], pz[6]]); },
    function (tl) { TEO.pegar(tl, "#nProy"); }
  ], { textoFin: "Fin de la clase" });''',
    css='''
  .pz .t { font-size: .95em; }
'''))

print('escenas de oq3-02 generadas en', os.path.normpath(LIVE))
