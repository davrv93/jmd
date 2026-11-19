#!/usr/bin/env python3
"""Genera las escenas LIVE de oq3-01 (Orquestación con Qwen Coder · Grupo 3 · Sesión 1).  python3 _fuente/oq301.py
Adaptado de menos-chat-mas-orquesta/_fuente/mco01.py (clase del 18-11-2026).
Láminas de teoría con el motor del skill teoria-animada (live/_comun: teoria.js, teoria.css, gsap.min.js).
Datos: la orquesta local de ~/Downloads/qwen-orquesta, medida el 18-11-2026 en la Mac del instructor.
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(AQUI, '..', 'live', 'oq3-01')
COMUN = '../../comun/'
FUENTE = ('Fuente: trabajo propio de JMD Learning, 18-11-2026. Orquestador en Node sin dependencias; '
          'qwen2.5-coder:14b en Ollama sobre una Mac M4 Pro de 24 GB.')


def escena(id_, titulo, fase, paso, minutos, html):
    d = os.path.join(LIVE, id_)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'escena.yaml'), 'w').write(
        f'id: {id_}\ntitulo: "{titulo}"\nfase: {fase}\npaso: "{paso}"\nduracion_min: {minutos}\nlo_logre: false\n'
        'evidencia: ninguna\numbral_pct: 80\ncompuerta: ninguna\n')
    open(os.path.join(d, 'escena.html'), 'w').write(html)


# Ajustes comunes a todas las láminas: sin mayúsculas forzadas y una nota «oro».
CSS_CURSO = """
  .teo-ceja, .nt .k, .cita small, .rot, .pastilla { text-transform: none !important; letter-spacing: .02em !important; }
  .nt.oro { background: #E9C25A; box-shadow: 0 0 0 2px #8A6A00 inset, var(--sombra); }
  .nt .t.mono { hyphens: none; overflow-wrap: anywhere; }
  .nt .t small { display: block; font-weight: 500; opacity: .85; margin-top: .2em; }
  #punto { fill: var(--acento); filter: drop-shadow(0 0 6px var(--acento)); }
  .sello.ok { color: #1F7A3E; border-color: #1F7A3E; }
  .nt.ficha .sello { top: -1.5em; right: -.8em; }
  .marco { fill: none; stroke: var(--gris); stroke-width: 1.6; stroke-dasharray: 6 7; }
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
PORTADA = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portada · Orquestación con Qwen Coder</title>
<link rel="stylesheet" href="{COMUN}teoria.css">
<style>
  body {{ display: flex; min-height: 100vh; }}
  .port {{ margin: auto; width: min(1180px, 100%); padding: 5vh 5vw; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 4vw; align-items: center; }}
  .ceja {{ font: 700 .8em/1 var(--mono); color: var(--acento); margin: 0 0 1em; }}
  h1 {{ margin: 0; font: 600 clamp(2.4em, 6vw, 4.6em)/1.02 var(--serif); letter-spacing: -.02em; }}
  h1 em {{ color: var(--acento); }}
  .sub {{ font-size: 1.15em; color: var(--gris); max-width: 30em; margin: 1em 0 1.4em; }}
  .quien {{ font: 600 .85em/1.5 var(--mono); color: var(--gris); }}
  .agenda {{ list-style: none; margin: 0; padding: 0; display: grid; gap: .5em; counter-reset: a; }}
  .agenda li {{ counter-increment: a; display: grid; grid-template-columns: 2em 1fr auto; gap: .6em; align-items: baseline; border-bottom: 1px solid var(--linea); padding: .35em 0; }}
  .agenda li::before {{ content: counter(a, decimal-leading-zero); font: 700 .8em var(--mono); color: var(--acento); }}
  .agenda small {{ font: 600 .75em var(--mono); color: var(--gris); }}
  svg.orq {{ width: 100%; height: auto; margin-bottom: 1.2em; }}
  .orq .b {{ fill: var(--papel2); stroke: var(--tinta); stroke-width: 2; }}
  .orq .q {{ fill: var(--n-act); stroke: var(--tinta); stroke-width: 1.5; }}
  .orq .c {{ fill: var(--n-cmd); stroke: var(--tinta); stroke-width: 1.5; }}
  .orq .g {{ fill: #E9C25A; stroke: var(--tinta); stroke-width: 1.5; }}
  .orq .l {{ fill: none; stroke: var(--tinta); stroke-width: 2; stroke-linecap: round; }}
  .orq .pulso {{ fill: var(--acento); animation: viaje 3.2s ease-in-out infinite; }}
  .orq .pulso.d2 {{ animation-delay: .5s; }} .orq .pulso.d3 {{ animation-delay: 1s; }}
  @keyframes viaje {{ 0% {{ transform: translateX(0); opacity: 0; }} 15% {{ opacity: 1; }} 85% {{ opacity: 1; }} 100% {{ transform: translateX(150px); opacity: 0; }} }}
  @media (prefers-reduced-motion: reduce) {{ .orq .pulso {{ animation: none; opacity: 0; }} }}
  @media (max-width: 860px) {{ .port {{ grid-template-columns: 1fr; }} }}
</style>
</head>
<body>
<main class="port">
  <section>
    <p class="ceja">JMD Learning · clase en vivo</p>
    <h1>Orquestación con<br><em>Qwen Coder</em></h1>
    <p class="sub">Chatear con un modelo no es lo mismo que orquestar varios agentes. El valor de una orquesta está en la verificación, no en el modelo.</p>
    <p class="quien">David Roncal · Grupo 3 · Sesión 1 · domingo 22 de noviembre de 2026 · 8:00 a. m.</p>
  </section>
  <section>
    <svg class="orq" viewBox="0 0 360 150" aria-hidden="true">
      <rect class="b" x="6" y="52" width="80" height="46" rx="8"/>
      <rect class="c" x="16" y="62" width="60" height="26" rx="4"/>
      <path class="l" d="M86 75 C110 75 110 30 132 30 M86 75 L132 75 M86 75 C110 75 110 120 132 120"/>
      <rect class="q" x="132" y="16" width="64" height="28" rx="4"/>
      <rect class="q" x="132" y="61" width="64" height="28" rx="4"/>
      <rect class="q" x="132" y="106" width="64" height="28" rx="4"/>
      <path class="l" d="M196 30 C226 30 226 75 252 75 M196 75 L252 75 M196 120 C226 120 226 75 252 75"/>
      <rect class="g" x="252" y="56" width="40" height="38" rx="4"/>
      <path class="l" d="M292 75 L330 75 M320 66 L330 75 L320 84"/>
      <circle class="pulso" cx="92" cy="75" r="5"/>
      <circle class="pulso d2" cx="92" cy="75" r="5"/>
      <circle class="pulso d3" cx="92" cy="75" r="5"/>
    </svg>
    <ol class="agenda">
      <li>Del chat a la orquesta <small>8 min</small></li>
      <li>Cómo se arma una orquesta <small>9 min</small></li>
      <li>Las capas y el oráculo oculto <small>10 min</small></li>
      <li>La orquesta en vivo <small>12 min</small></li>
      <li>Los números de una corrida real <small>8 min</small></li>
      <li>Lo que falló, y por qué es buena noticia <small>10 min</small></li>
      <li>Cómo mejorar en local <small>9 min</small></li>
    </ol>
  </section>
</main>
</body>
</html>
'''
escena('00-portada', 'Orquestación con Qwen Coder · portada', 'experiencia', 'ver', 4, PORTADA)

# ====================================================================== 01 del chat a la orquesta
escena('01-del-chat-a-la-orquesta', 'Del chat a la orquesta', 'conceptualizacion', 'entender', 8, lamina(
    'Del chat a la orquesta', 'Teoría 1 de 3 · Del chat a la orquesta',
    'Un chat responde; una orquesta <em>comprueba</em>',
    'A la izquierda, el chat: tú preguntas, un modelo responde y la respuesta queda sin revisar. Al centro, por qué no escala: un solo hilo, un solo modelo y tú como único control de calidad. A la derecha, la orquesta: un planificador, tres ejecutores, una verificación por capas y un gate.',
    '''        <path id="a1" class="trazo flecha" d="M120 92 L120 186"/>
        <path id="a2" class="trazo flecha" d="M120 262 L120 352"/>
        <rect id="marco" class="trazo fino guion" x="512" y="14" width="272" height="496" rx="14"/>
        <path id="o1" class="trazo flecha" d="M648 108 L648 168"/>
        <path id="o2" class="trazo flecha" d="M648 232 L648 292"/>
        <path id="o3" class="trazo flecha" d="M648 356 L648 416"/>''',
    '''      <div class="capa" id="capaChat">
        <div class="nt act" id="nTu" data-r="-1.2" style="left:3%; top:5%; width:26%"><span class="k">Tú</span><span class="t">Una pregunta en el chat</span></div>
        <div class="nt sis" id="nMod" data-r="1" style="left:3%; top:37%; width:26%"><span class="k">Un modelo</span><span class="t">Un solo hilo de conversación</span></div>
        <div class="nt ev" id="nResp" data-r="-.8" style="left:3%; top:69%; width:26%"><span class="k">Respuesta</span><span class="t">«Listo, ya funciona»</span><span class="sello solo-anim" id="sResp">sin revisar</span></div>
      </div>
      <div class="capa" id="capaPorque">
        <div class="nt fantasma" id="f1" data-r="1.4" style="left:35%; top:8%; width:26%"><span class="k">Un solo hilo</span><span class="t">El contexto crece y lo primero se olvida</span></div>
        <div class="nt fantasma" id="f2" data-r="-1.2" style="left:35%; top:38%; width:26%"><span class="k">Un solo modelo</span><span class="t">Escribe el código y decide si está bien</span></div>
        <div class="nt hot" id="f3" data-r="1" style="left:35%; top:68%; width:26%"><span class="k">Nadie verifica</span><span class="t">Tú eres el control de calidad, al final</span></div>
      </div>
      <div class="nt cmd" id="q1" data-r="-1" style="left:67%; top:7%; width:28%"><span class="k">Planificador</span><span class="t">Claude parte el trabajo</span></div>
      <div class="nt act" id="q2" data-r="1" style="left:67%; top:32%; width:28%"><span class="k">Tres ejecutores</span><span class="t">Qwen, en paralelo</span></div>
      <div class="nt pol" id="q3" data-r="-1" style="left:67%; top:57%; width:28%"><span class="k">Verificación</span><span class="t">Cinco capas de pruebas</span></div>
      <div class="nt info" id="q4" data-r="1" style="left:67%; top:81%; width:28%"><span class="k">Gate</span><span class="t">Nada entra sin revisar</span></div>''',
    [
        ('Tú preguntas, un modelo responde', P('Así trabaja casi todo el mundo hoy: una pregunta, un hilo, un modelo. Para una idea, un correo o un borrador funciona muy bien.')),
        ('La respuesta suena segura', P('El modelo dice «listo, ya funciona». Suena bien, pero nadie lo comprobó: el modelo no ejecutó nada y tú no tuviste tiempo de probarlo todo.')),
        ('Por qué un chat no escala', P('Un solo hilo que crece y olvida. Un solo modelo que escribe el código y también decide si está bien. Y tú, al final, como único control de calidad.')),
        ('El salto: orquestar', P('Una orquesta reparte el trabajo entre varios agentes y pone en medio algo que no se deja convencer: las pruebas. El valor no está en el modelo, está en la verificación.')),
    ],
    '''  TEO.escena([
    function (tl) { TEO.pegar(tl, "#nTu"); flecha(tl, "a1"); TEO.pegar(tl, "#nMod"); },
    function (tl) { flecha(tl, "a2"); TEO.pegar(tl, "#nResp"); sello(tl, "#sResp", "+=.2"); },
    function (tl) { TEO.pegar(tl, ["#f1", "#f2", "#f3"]); },
    function (tl) {
      tl.to(["#capaChat", "#capaPorque"], { opacity: .3, duration: .5 });
      TEO.trazar(tl, "#marco", { duration: 1 }, "<");
      TEO.pegar(tl, "#q1"); flecha(tl, "o1"); TEO.pegar(tl, "#q2"); flecha(tl, "o2");
      TEO.pegar(tl, "#q3"); flecha(tl, "o3"); TEO.pegar(tl, "#q4");
    }
  ], {
    preparar: function () { puntasDe(["a1", "a2", "o1", "o2", "o3"]); gsap.set("#sResp", { autoAlpha: 0 }); },
    textoFin: "Fin de la teoría 1"
  });'''))

# ====================================================================== 02 la orquesta
escena('02-la-orquesta', 'La orquesta: plan, ejecutores, verificación y gate', 'conceptualizacion', 'entender', 9, lamina(
    'La orquesta', 'Teoría 2 de 3 · Cómo se arma una orquesta',
    'Un plan, tres manos y <em>un juez que no se deja convencer</em>',
    'Diagrama de la orquesta: Claude como planificador reparte tareas a tres agentes Qwen (programador, tester y revisor); su trabajo pasa por un verificador de cinco capas, que devuelve lo que falla; lo que pasa llega al gate, donde Claude revisa antes de integrar. Todo corre dentro de Docker sin red.',
    '''        <rect id="caja" class="trazo fino guion" x="232" y="8" width="412" height="458" rx="14"/>
        <path id="p1" class="trazo flecha" d="M166 236 C200 236 205 62 244 62"/>
        <path id="p2" class="trazo flecha" d="M166 240 L244 240"/>
        <path id="p3" class="trazo flecha" d="M166 244 C200 244 205 404 244 404"/>
        <path id="e1" class="trazo flecha" d="M420 62 C455 62 452 226 484 226"/>
        <path id="e2" class="trazo flecha" d="M420 240 L484 240"/>
        <path id="e3" class="trazo flecha" d="M420 404 C455 404 452 254 484 254"/>
        <path id="r1" class="trazo fino guion flecha" d="M560 200 C560 120 520 112 424 108"/>
        <path id="g1" class="trazo flecha" d="M560 284 C560 340 600 360 646 376"/>
        <circle id="punto" class="solo-anim" cx="166" cy="236" r="9"/>''',
    '''      <div class="nt cmd" id="nPlan" data-r="-1.2" style="left:2%; top:38%; width:18.5%"><span class="k">Planificador</span><span class="t">Claude parte el trabajo en tareas</span></div>
      <div class="nt act" id="nProg" data-r="1" style="left:31%; top:5%; width:21%"><span class="k">Programador · Qwen</span><span class="t">Escribe el módulo</span></div>
      <div class="nt act" id="nTest" data-r="-1" style="left:31%; top:38%; width:21%"><span class="k">Tester · Qwen</span><span class="t">Pruebas sin ver el código</span></div>
      <div class="nt act" id="nRev" data-r="1.2" style="left:31%; top:70%; width:21%"><span class="k">Revisor · Qwen</span><span class="t">Código contra especificación</span></div>
      <div class="nt pol" id="nVer" data-r="-.8" style="left:61%; top:38%; width:18%"><span class="k">Verificador</span><span class="t">Cinco capas de comprobación</span></div>
      <div class="nt info" id="nGate" data-r="1" style="left:81%; top:68%; width:17.5%"><span class="k">Gate · Claude</span><span class="t">Revisa antes de integrar</span></div>
      <p class="pastilla solo-anim" id="lRep" style="left:54%; top:13%; width:30%">si falla, vuelve con el error</p>
      <p class="pastilla" id="lCaja" style="left:30%; top:92%; width:50%">Docker · sin red · solo lectura · sin capacidades</p>''',
    [
        ('El planificador parte el trabajo', P('Claude lee el objetivo y lo divide en tareas pequeñas, cada una con su especificación. Una tarea chica es una tarea que se puede comprobar.')),
        ('Tres ejecutores en paralelo', P('Tres agentes Qwen 2.5 Coder 14B corren en local, en Ollama, sobre una Mac M4 Pro de 24 GB. Cada uno tiene un rol: programador, tester y revisor. El tester nunca ve el código.')),
        ('Nada avanza sin pruebas', P('Lo que producen pasa por un verificador de cinco capas. Si algo falla, la tarea vuelve al agente con el error concreto, no con un «inténtalo otra vez».')),
        ('El gate: la última palabra', P('Lo que pasa todas las capas llega a Claude, que lo revisa antes de integrarlo. Sigue el punto: plan, código, verificación y gate.')),
        ('Todo dentro de una caja', P('Todo se ejecuta en Docker sin red, en solo lectura y sin capacidades. Si un agente escribe algo peligroso, no tiene a dónde llegar.')),
    ],
    '''  var punto = $("#punto");
  TEO.escena([
    function (tl) { TEO.pegar(tl, "#nPlan"); },
    function (tl) { flecha(tl, "p1"); flecha(tl, "p2", "<"); flecha(tl, "p3", "<"); TEO.pegar(tl, ["#nProg", "#nTest", "#nRev"]); },
    function (tl) {
      flecha(tl, "e1"); flecha(tl, "e2", "<"); flecha(tl, "e3", "<"); TEO.pegar(tl, "#nVer");
      flecha(tl, "r1", "+=.2"); tl.fromTo("#lRep", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .4 });
    },
    function (tl) {
      flecha(tl, "g1"); TEO.pegar(tl, "#nGate");
      tl.set(punto, { attr: { cx: 166, cy: 236 } });
      tl.fromTo(punto, { autoAlpha: 0 }, { autoAlpha: 1, duration: .25 });
      TEO.viajar(tl, punto, $("#p1"), .8); TEO.viajar(tl, punto, $("#e1"), .9); TEO.viajar(tl, punto, $("#g1"), .8);
      tl.to(punto, { autoAlpha: 0, duration: .3 }, "+=.3");
    },
    function (tl) { TEO.trazar(tl, "#caja", { duration: 1.4 }); tl.from("#lCaja", { autoAlpha: 0, y: 8, duration: .4 }); }
  ], {
    preparar: function () { puntasDe(["p1", "p2", "p3", "e1", "e2", "e3", "r1", "g1"]); gsap.set([punto, "#lRep"], { autoAlpha: 0 }); },
    textoFin: "Fin de la teoría 2"
  });'''))

# ====================================================================== 03 capas y oráculo
CAPAS = [
    ('c1', 'cmd', 'Capa 1 · sintaxis', '<code>node --check</code>: que el archivo se pueda leer', -0.6),
    ('c2', 'cmd', 'Capa 2 · estático', 'Prohíbe eval, child_process, red y process.env', 0.6),
    ('c3', 'act', 'Capa 3 · pruebas', 'Las escribe un tester que no ve el código', -0.6),
    ('c4', 'oro', 'Capa 4 · oro', 'Pruebas ocultas: ningún agente las ve', 0.6),
    ('c5', 'pol', 'Capa 5 · revisión de pares', 'Otro agente compara código y especificación', -0.6),
    ('c6', 'info', 'Gate · Claude', 'Revisa antes de integrar', 0.6),
]
notas_capas = '\n'.join(
    f'      <div class="nt {cls}" id="{i}" data-r="{r}" style="left:3%; top:{2 + 16.2 * k:.1f}%; width:45%"><span class="k">{kk}</span><span class="t">{t}</span></div>'
    for k, (i, cls, kk, t, r) in enumerate(CAPAS))
escena('03-capas-y-oraculo', 'Las capas, el oráculo oculto y el árbitro', 'conceptualizacion', 'entender', 10, lamina(
    'Capas y oráculo', 'Teoría 3 de 3 · Las capas de comprobación',
    'La prueba que el agente <em>nunca ve</em> es la que manda',
    'A la izquierda, seis capas apiladas: sintaxis, análisis estático, pruebas del tester, oro (pruebas ocultas), revisión de pares y gate. Un archivo, fechas.js, cae por las capas y se detiene en la de oro. A la derecha, el árbitro: si el oro pasa y las pruebas del tester fallan, se repara el tester, no el código.',
    '''        <path id="h1" class="trazo flecha" d="M556 128 L604 222"/>
        <path id="h2" class="trazo flecha" d="M708 128 L660 222"/>
        <path id="h3" class="trazo flecha" d="M632 292 L632 352"/>''',
    notas_capas + '''
      <div class="nt ficha s solo-anim" id="chipF" style="left:49%; top:2%; width:12%"><span class="t mono">fechas.js</span><span class="sello solo-anim" id="sF">detenido</span></div>
      <div class="nt ficha k solo-anim" id="chipC" style="left:49%; top:2%; width:12%"><span class="t mono">csv.js</span><span class="sello ok solo-anim" id="sC">listo</span></div>
      <div class="nt oro" id="aOro" data-r="-1.4" style="left:62%; top:12%; width:16%"><span class="k">Oro</span><span class="t">✓ pasa</span></div>
      <div class="nt hot" id="aTes" data-r="1.4" style="left:81%; top:12%; width:17%"><span class="k">Tester</span><span class="t">✗ falla</span></div>
      <div class="nt sis" id="aArb" data-r="-.6" style="left:66%; top:43%; width:26%"><span class="k">Árbitro</span><span class="t">¿Quién se equivocó?</span></div>
      <div class="nt info" id="aRep" data-r=".8" style="left:62%; top:69%; width:35%"><span class="k">Decisión</span><span class="t">Se repara el tester, no el código</span></div>''',
    [
        ('Primero, lo barato', P('Sintaxis con <code>node --check</code> y un análisis estático que prohíbe eval, child_process, la red y process.env. Cuestan milisegundos y descartan lo peor sin gastar un solo token.')),
        ('Un tester que no ve el código', P('Las pruebas las escribe otro agente, solo con la especificación. Así no se contagia de los errores del programador. Pero también puede equivocarse.')),
        ('El oráculo: la prueba oculta', P('El orquestador escribe pruebas de aceptación que ningún agente ve: la capa oro. No se pueden ajustar para «pasar». Aquí se detuvo fechas.js en las tres corridas.')),
        ('El árbitro: ¿quién se equivocó?', P('Si el oro pasa pero las pruebas del tester fallan, el código está bien y el tester está mal. Entonces se repara el tester, no el código.')),
        ('Pares y gate', P('Otro agente compara el código con la especificación y, al final, Claude revisa antes de integrar. csv.js pasó en verde por todas las capas.')),
    ],
    '''  TEO.escena([
    function (tl) { TEO.pegar(tl, ["#c1", "#c2"]); },
    function (tl) { TEO.pegar(tl, "#c3"); },
    function (tl) {
      TEO.pegar(tl, "#c4");
      tl.fromTo("#chipF", { autoAlpha: 0, top: "2%" }, { autoAlpha: 1, duration: .3 });
      tl.to("#chipF", { top: "50%", duration: 1.4, ease: "power1.in" });
      tl.to("#chipF", { x: -5, duration: .06, repeat: 5, yoyo: true, ease: "none" });
      sello(tl, "#sF");
    },
    function (tl) {
      TEO.pegar(tl, ["#aOro", "#aTes"]); flecha(tl, "h1"); flecha(tl, "h2", "<");
      TEO.pegar(tl, "#aArb"); flecha(tl, "h3"); TEO.pegar(tl, "#aRep");
    },
    function (tl) {
      TEO.pegar(tl, ["#c5", "#c6"]);
      tl.to("#chipF", { autoAlpha: 0, duration: .3 });
      tl.fromTo("#chipC", { autoAlpha: 0, top: "2%" }, { autoAlpha: 1, duration: .3 });
      tl.to("#chipC", { top: "83%", duration: 2, ease: "power1.inOut" });
      sello(tl, "#sC");
    }
  ], {
    preparar: function () { puntasDe(["h1", "h2", "h3"]); gsap.set(["#chipF", "#chipC", "#sF", "#sC"], { autoAlpha: 0 }); },
    textoFin: "Fin de la teoría 3"
  });'''))

# ====================================================================== 04 demo en vivo
DEMO = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>La orquesta en vivo · Orquestación con Qwen Coder</title>
<link rel="stylesheet" href="{COMUN}teoria.css">
<style>
  .demo {{ max-width: 1300px; min-height: 100vh; margin: 0 auto; padding: 4vh 4vw; display: grid; gap: 2.6vh; align-content: center; font-size: 1.15em; }}
  .ceja {{ font: 700 .75em/1 var(--mono); color: var(--acento); margin: 0; }}
  h1 {{ margin: 0; font: 600 clamp(1.6em, 3.2vw, 2.8em)/1.08 var(--serif); }}
  h1 em {{ color: var(--acento); }}
  .abrir {{ display: flex; gap: .8em; align-items: center; flex-wrap: wrap; }}
  .btn {{ font: 700 1em var(--sans); text-decoration: none; border-radius: 999px; padding: .7em 1.4em; background: var(--tinta); color: var(--papel); border: 0; cursor: pointer; }}
  .btn.sec {{ background: var(--papel2); color: var(--tinta); border: 1px solid var(--linea); }}
  .url {{ font: 600 1.05em var(--mono); }}
  .nota {{ font-size: .8em; color: var(--gris); margin: 0; }}
  .mirar {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.1em; }}
  .t {{ background: var(--papel2); border: 1px solid var(--linea); border-radius: 14px; padding: 1em 1.1em; display: grid; gap: .5em; align-content: start; }}
  .t h2 {{ margin: 0; font: 650 1.1em/1.2 var(--serif); }}
  .t p {{ margin: 0; color: var(--gris); font-size: .92em; }}
  .t svg {{ width: 100%; height: 90px; }}
  .anillo {{ fill: none; stroke-width: 9; stroke-linecap: round; transform: rotate(-90deg); transform-origin: center; transform-box: fill-box; }}
  .fondo {{ fill: none; stroke: var(--papel3); stroke-width: 9; }}
  .a1 {{ stroke: #2B6CB0; stroke-dasharray: 101 101; animation: llena 4s ease-in-out infinite alternate; }}
  .a2 {{ stroke: #1F7A3E; stroke-dasharray: 101 101; animation: llena 4s .6s ease-in-out infinite alternate; }}
  .a3 {{ stroke: #C99A1A; stroke-dasharray: 101 101; animation: llena 4s 1.2s ease-in-out infinite alternate; }}
  @keyframes llena {{ from {{ stroke-dashoffset: 95; }} to {{ stroke-dashoffset: 20; }} }}
  .tile {{ fill: var(--papel); stroke: var(--linea); }}
  .tok {{ font: 700 15px var(--mono); fill: var(--tinta); }}
  .tokl {{ font: 600 8.5px var(--mono); fill: var(--gris); }}
  .pill {{ font: 700 11px var(--mono); }}
  .pill rect {{ rx: 9; }}
  @media (prefers-reduced-motion: reduce) {{ .a1, .a2, .a3 {{ animation: none; stroke-dashoffset: 30; }} }}
</style>
</head>
<body>
<main class="demo">
  <p class="ceja">Demo en vivo · el visor de la orquesta</p>
  <h1>Mira la orquesta trabajar y <em>busca dónde se detiene</em></h1>
  <div class="abrir">
    <a class="btn" href="http://127.0.0.1:8797" target="_blank" rel="noopener">Abrir el visor</a>
    <button type="button" class="btn sec" id="copiar">Copiar la dirección</button>
    <span class="url" id="url">http://127.0.0.1:8797</span>
  </div>
  <p class="nota">El visor corre en la Mac del instructor (127.0.0.1 es «esta misma máquina»): el enlace solo abre ahí. Ustedes lo ven por la pantalla compartida de Zoom. Si el botón no abre, pega la dirección en una pestaña nueva.</p>
  <section class="mirar">
    <div class="t">
      <svg viewBox="0 0 240 74" aria-hidden="true">
        <circle class="fondo" cx="40" cy="37" r="16"/><circle class="anillo a1" cx="40" cy="37" r="16"/>
        <circle class="fondo" cx="120" cy="37" r="16"/><circle class="anillo a2" cx="120" cy="37" r="16"/>
        <circle class="fondo" cx="200" cy="37" r="16"/><circle class="anillo a3" cx="200" cy="37" r="16"/>
      </svg>
      <h2>1. Los anillos por etapa</h2>
      <p>Cada anillo es una etapa del plan. Se llenan a medida que las tareas pasan sus capas, como los anillos de actividad de un reloj.</p>
    </div>
    <div class="t">
      <svg viewBox="0 0 240 74" aria-hidden="true">
        <rect class="tile" x="4" y="10" width="72" height="54" rx="10"/><text class="tokl" x="12" y="28">programador</text><text class="tok" x="12" y="52">13,3</text>
        <rect class="tile" x="84" y="10" width="72" height="54" rx="10"/><text class="tokl" x="92" y="28">tester</text><text class="tok" x="92" y="52">13,3</text>
        <rect class="tile" x="164" y="10" width="72" height="54" rx="10"/><text class="tokl" x="172" y="28">revisor</text><text class="tok" x="172" y="52">13,3</text>
      </svg>
      <h2>2. Los tres agentes</h2>
      <p>Una ficha por agente con sus tokens por segundo en vivo. Si los tres se mueven a la vez, hay paralelismo de verdad; si se turnan, hay cola.</p>
    </div>
    <div class="t">
      <svg viewBox="0 0 250 74" aria-hidden="true">
        <g class="pill"><rect x="2" y="12" width="66" height="20" fill="#8DBBE8"/><text x="9" y="26" fill="#16181D">sintaxis</text></g>
        <g class="pill"><rect x="72" y="12" width="60" height="20" fill="#F6DC6B"/><text x="79" y="26" fill="#16181D">pruebas</text></g>
        <g class="pill"><rect x="136" y="12" width="34" height="20" fill="#E9C25A" stroke="#8A6A00" stroke-width="2"/><text x="143" y="26" fill="#16181D">oro</text></g>
        <g class="pill"><rect x="174" y="12" width="68" height="20" fill="#C3A6E0"/><text x="181" y="26" fill="#16181D">revisión</text></g>
        <text class="tokl" x="6" y="56">fechas.js · se detiene en oro</text>
      </svg>
      <h2>3. Las pastillas de capa</h2>
      <p>Cada tarea muestra las capas que ya pasó. La dorada es el oro, la prueba oculta: ahí se ve quién se detiene.</p>
    </div>
    <div class="t">
      <h2>4. Qué buscar en el visor</h2>
      <p>• Una tarea que avanza y una que vuelve con su error.<br>• fechas.js frenada en oro.<br>• Un tester reparado por el árbitro.<br>• Nada marcado «listo» sin todas sus capas.</p>
    </div>
  </section>
</main>
<script>
(function () {{
  var b = document.getElementById("copiar"), u = document.getElementById("url").textContent;
  b.addEventListener("click", function () {{
    function ok() {{ b.textContent = "Copiada"; setTimeout(function () {{ b.textContent = "Copiar la dirección"; }}, 1800); }}
    function plan() {{
      var r = document.createRange(); r.selectNodeContents(document.getElementById("url"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      try {{ document.execCommand("copy"); ok(); }} catch (e) {{ b.textContent = "Selecciónala y cópiala"; }}
    }}
    try {{ navigator.clipboard.writeText(u).then(ok, plan); }} catch (e) {{ plan(); }}
  }});
}})();
</script>
</body>
</html>
'''
escena('04-demo-en-vivo', 'La orquesta en vivo · el visor', 'experimentacion', 'mirar', 12, DEMO)

# ====================================================================== 05 los números
# Barras: base y = 440, 9 unidades por tok/s.
def barra(id_, x, v, cls):
    h = round(v * 9)
    return f'        <rect id="{id_}" class="{cls}" x="{x}" y="{440 - h}" width="70" height="{h}"/>'

def valor(id_, x, v, txt):
    h = round(v * 9)
    return f'      <p class="pastilla" id="{id_}" style="left:{x / 8:.2f}%; top:{(440 - h - 34) / 5.2:.1f}%; width:8.75%">{txt}</p>'

escena('05-los-numeros', 'Los números de una corrida real', 'conceptualizacion', 'entender', 8, lamina(
    'Los números de una corrida real', 'Medido el 18-11-2026 · tokens por segundo',
    'Tres agentes no corrían a la vez: <em>hacían cola</em>',
    'Gráfico de barras en tokens por segundo. Un agente solo: 14,6 antes del ajuste y 24,3 después. Tres agentes, en total: 16,2 antes y 38,8 después. A la derecha, la causa (Ollama atendía en cola por falta de RAM) y el ajuste aplicado.',
    '\n'.join([
        '        <path id="eje" class="trazo" d="M70 440 L520 440"/>',
        barra('bA1', 100, 14.6, 'bAntes'), barra('bD1', 180, 24.3, 'bDesp'),
        barra('bA3', 320, 16.2, 'bAntes'), barra('bD3', 400, 38.8, 'bDesp'),
    ]),
    '\n'.join([
        valor('vA1', 100, 14.6, '14,6'), valor('vD1', 180, 24.3, '24,3'),
        valor('vA3', 320, 16.2, '16,2'), valor('vD3', 400, 38.8, '38,8'),
        '      <p class="pastilla" id="g1" style="left:12.5%; top:87%; width:18.75%">1 agente</p>',
        '      <p class="pastilla" id="g3" style="left:40%; top:87%; width:18.75%">3 agentes, total</p>',
        '      <p class="pastilla" id="ley" style="left:9%; top:0%; width:48%"><span class="cuadro antes"></span> antes <span class="cuadro desp"></span> después · tok/s</p>',
        '      <div class="nt hot" id="nCola" data-r="1.2" style="left:68%; top:4%; width:30%"><span class="k">La causa</span><span class="t">Ollama los atendía en cola: eligió 1 en paralelo con 92 % de swap usado</span></div>',
        '      <div class="nt ficha s" id="nAj" data-r="-1" style="left:68%; top:38%; width:30%"><span class="k">El ajuste</span><span class="t mono">liberar RAM<br>OLLAMA_FLASH_ATTENTION=1<br>OLLAMA_KV_CACHE_TYPE=q8_0<br>OLLAMA_NUM_PARALLEL=3</span></div>',
        '      <div class="nt info" id="nRes" data-r=".8" style="left:68%; top:74%; width:30%"><span class="k">Resultado</span><span class="t">+66 % un agente · 2,4× los tres · 13,3 tok/s cada uno</span></div>',
    ]),
    [
        ('Un agente solo: 14,6 tok/s', P('Antes de tocar nada, un agente Qwen 14B generaba 14,6 tokens por segundo. Esa es la línea base.')),
        ('Tres a la vez: 16,2 en total', P('Con tres agentes «en paralelo», el total apenas subió a 16,2. Casi lo mismo que uno solo: no trabajaban a la vez, hacían cola.')),
        ('La causa: la máquina sin aire', P('Ollama decide solo cuántas conversaciones atiende a la vez. Con la RAM apretada, 92 % de swap usado, eligió una. Las otras dos esperaban su turno.')),
        ('El ajuste', P('Liberar RAM, activar flash attention, guardar la caché KV en q8_0 (ocupa menos memoria por conversación) y pedir tres en paralelo de forma explícita.')),
        ('Después: paralelo de verdad', P('Un agente pasó a 24,3 tok/s (+66 %). Los tres juntos, a 38,8 en total (2,4×), unos 13,3 cada uno.'),
         aparte('Configurar «tres en paralelo» no garantiza paralelismo. Hay que medirlo.')),
    ],
    '''  function crecer(tl, bar, val, pos) {
    tl.from(bar, { scaleY: 0, transformOrigin: "50% 100%", duration: .9, ease: "power2.out" }, pos);
    tl.from(val, { autoAlpha: 0, y: 8, duration: .3 }, "-=.2");
  }
  TEO.escena([
    function (tl) { TEO.trazar(tl, "#eje", { duration: .6 }); tl.from(["#ley", "#g1"], { autoAlpha: 0, duration: .4 }); crecer(tl, "#bA1", "#vA1"); },
    function (tl) { tl.from("#g3", { autoAlpha: 0, duration: .4 }); crecer(tl, "#bA3", "#vA3"); },
    function (tl) { TEO.pegar(tl, "#nCola"); },
    function (tl) { TEO.pegar(tl, "#nAj"); },
    function (tl) { crecer(tl, "#bD1", "#vD1"); crecer(tl, "#bD3", "#vD3", "-=.3"); TEO.pegar(tl, "#nRes"); }
  ], { textoFin: "Fin de los números" });''',
    css='''
  .bAntes { fill: var(--papel3); stroke: var(--tinta); stroke-width: 2; }
  .bDesp { fill: var(--acento); stroke: var(--tinta); stroke-width: 2; }
  .cuadro { display: inline-block; width: .9em; height: .9em; vertical-align: -.1em; border: 1.5px solid var(--tinta); margin-left: .3em; }
  .cuadro.antes { background: var(--papel3); } .cuadro.desp { background: var(--acento); }
  #vA1, #vD1, #vA3, #vD3 { font-size: 1.9cqw; padding: .25em .2em; }
'''))

# ====================================================================== 06 lo que falló
escena('06-lo-que-fallo', 'Lo que falló y por qué es buena noticia', 'reflexion', 'reflexionar', 10, lamina(
    'Lo que falló', 'Lo que falló el 18-11-2026 · corrida 3',
    'Lo que falló <em>no llegó a «listo»</em>',
    'A la izquierda, tres fallos: fechas.js sumaba mal los meses en fin de mes, el tester inventó números de RUC inválidos y las reparaciones se cortaban a los 200 segundos. Al centro, el muro del oráculo, la capa oro. A la derecha, lo que llegó a listo: csv.js en verde y ruc.js correcto; fechas.js no está.',
    '''        <rect id="muro" x="356" y="16" width="14" height="456" rx="5" style="fill:#E9C25A; stroke:#8A6A00; stroke-width:2"/>
        <rect id="zona" class="trazo fino guion" x="420" y="16" width="370" height="456" rx="14"/>''',
    '''      <div class="nt ev" id="nF" data-r="-1" style="left:2%; top:4%; width:38%"><span class="k">fechas.js · tres corridas</span><span class="t mono">2026-10-31 + 4 meses<br>→ 2027-03-31<br>esperado 2027-02-28</span></div>
      <div class="nt ev" id="nR" data-r="1" style="left:2%; top:39%; width:38%"><span class="k">El tester de ruc.js</span><span class="t">Inventó 5 RUC «válidos»: 4 no lo eran</span></div>
      <div class="nt ev" id="nT" data-r="-.8" style="left:2%; top:69%; width:38%"><span class="k">Reparaciones</span><span class="t">Cortadas a los 200 s: el contexto no paraba de crecer</span></div>
      <div class="nt ficha s solo-anim" id="chip" style="left:30%; top:12%; width:14%"><span class="t mono">fechas.js</span><span class="sello solo-anim" id="sD">detenido</span></div>
      <p class="pastilla" id="lMuro" style="left:33%; top:93%; width:28%">oráculo · capa oro</p>
      <p class="pastilla" id="lListo" style="left:60%; top:5%; width:26%">listo</p>
      <div class="nt info" id="nCsv" data-r="1" style="left:56%; top:17%; width:41%"><span class="k">csv.js</span><span class="t">Verde en todas las capas</span></div>
      <div class="nt info" id="nRuc" data-r="-1" style="left:56%; top:43%; width:41%"><span class="k">ruc.js</span><span class="t">Código correcto; falló su tester</span></div>
      <div class="nt fantasma" id="nNo" data-r=".8" style="left:56%; top:69%; width:41%"><span class="k">fechas.js</span><span class="t">No está: nunca pasó el oro</span></div>''',
    [
        ('Corrida 3: 21 minutos, 2 de 3', P('Tres módulos pequeños: validar DNI y RUC con dígito verificador, sumar meses a una fecha y pasar un horario a CSV. Tras el ajuste, la corrida tardó 21 minutos y dejó dos módulos usables.')),
        ('fechas.js: la trampa del fin de mes', P('31 de octubre más 4 meses debe dar 28 de febrero, porque febrero no tiene 31. Qwen devolvía 31 de marzo. En las tres corridas, el oro lo detuvo.')),
        ('RUC inventados', P('El tester escribió de memoria cinco RUC «válidos»: cuatro no lo eran. Un modelo no calcula un dígito verificador de memoria. El árbitro culpó al tester, no al código.')),
        ('Reparaciones que no terminan', P('Cada reparación arrastraba toda la conversación anterior. El contexto crecía, el modelo se hacía más lento y las reparaciones se cortaban a los 200 segundos.')),
        ('La buena noticia', P('Ningún código malo llegó a «listo». Fallar no es el problema; el problema es fallar sin enterarse. Aquí el oráculo hizo su trabajo las tres veces.')),
    ],
    '''  TEO.escena([
    function (tl) {
      tl.from("#muro", { scaleY: 0, transformOrigin: "50% 100%", duration: .8 });
      tl.from("#lMuro", { autoAlpha: 0, duration: .3 });
      TEO.trazar(tl, "#zona", { duration: 1 }, "<");
      tl.from("#lListo", { autoAlpha: 0, duration: .3 });
      TEO.pegar(tl, ["#nCsv", "#nRuc"]);
    },
    function (tl) {
      TEO.pegar(tl, "#nF");
      tl.fromTo("#chip", { autoAlpha: 0, left: "28%" }, { autoAlpha: 1, duration: .3 });
      tl.to("#chip", { left: "42%", top: "27%", duration: .7, ease: "power2.in" });
      tl.to("#chip", { left: "30%", duration: .5, ease: "bounce.out" });
      sello(tl, "#sD");
    },
    function (tl) { TEO.pegar(tl, "#nR"); },
    function (tl) { TEO.pegar(tl, "#nT"); },
    function (tl) { TEO.pegar(tl, "#nNo"); }
  ], {
    preparar: function () { gsap.set(["#chip", "#sD"], { autoAlpha: 0 }); },
    textoFin: "Fin"
  });''',
    css='''
  #chip { z-index: 2; }
  #lListo { font-size: 1.8cqw; }
'''))

# ====================================================================== 07 mejorar y cierre
escena('07-mejorar-y-cierre', 'Cómo mejorar en local y cierre', 'reflexion', 'llevar', 9, lamina(
    'Cómo mejorar en local', 'Veredicto y próximos pasos',
    'El andamiaje vale; <em>el modelo se cambia</em>',
    'Arriba, la comparación: Qwen 14B en local tardó 21 minutos y dejó 2 de 3 módulos; Claude directo, uno o dos minutos y 31 de 31 pruebas. Abajo, el andamiaje que se queda: oráculo, árbitro, sandbox y visor, con un modelo intercambiable en el centro. Tres versiones del mismo archivo compiten en el oro (mejor de 3). A la derecha, las lecciones y el curso Orquestación con Qwen Coder.',
    '''        <path id="riel" class="trazo" d="M40 380 L760 380"/>
        <path id="poste" class="trazo" d="M400 334 L400 380"/>''',
    '''      <div class="capa" id="capaArriba">
        <div class="nt hot" id="nLento" data-r="-1" style="left:2%; top:3%; width:30%"><span class="k">Qwen 14B · local</span><span class="t">21 min · 2 de 3 módulos</span></div>
        <div class="nt info" id="nRap" data-r="1" style="left:35%; top:3%; width:30%"><span class="k">Claude · directo</span><span class="t">~1–2 min · 31/31 a la primera</span></div>
      </div>
      <div class="nt ficha p" id="nLec" data-r=".6" style="left:68%; top:2%; width:31%"><span class="k">Lecciones · modelos pequeños</span><span class="t"><small>1. Tope a los tokens de salida</small><small>2. Un timeout cuenta como un intento</small><small>3. El tester no hace cuentas de memoria</small><small>4. Reparaciones con contexto compacto</small><small>5. Revertir solo a una versión verde</small></span></div>
      <div class="nt ficha s" id="nMod" data-r="-.6" style="left:36%; top:44%; width:28%"><span class="k">El modelo · se cambia</span><div class="capas t mono"><span class="m1">qwen2.5-coder:14b</span><span class="m2 solo-anim">gpt-oss:20b · razona</span></div></div>
      <div class="nt oro" id="s1" data-r="-1" style="left:2%; top:78%; width:22%"><span class="k">Oráculo</span><span class="t">Pruebas ocultas</span></div>
      <div class="nt sis" id="s2" data-r="1" style="left:26%; top:78%; width:22%"><span class="k">Árbitro</span><span class="t">¿Código o tester?</span></div>
      <div class="nt cmd" id="s3" data-r="-1" style="left:51%; top:78%; width:22%"><span class="k">Sandbox</span><span class="t">Docker sin red</span></div>
      <div class="nt pol" id="s4" data-r="1" style="left:76%; top:78%; width:22%"><span class="k">Visor</span><span class="t">La orquesta a la vista</span></div>
      <div class="nt ficha k solo-anim" id="v1" style="left:3%; top:44%; width:8%"><span class="t mono">v1</span><span class="sello solo-anim" id="x1">✗</span></div>
      <div class="nt ficha k solo-anim" id="v2" style="left:13%; top:44%; width:8%"><span class="t mono">v2</span><span class="sello ok solo-anim" id="x2">✓</span></div>
      <div class="nt ficha k solo-anim" id="v3" style="left:23%; top:44%; width:8%"><span class="t mono">v3</span></div>
      <div class="nt act" id="nCurso" data-r="-.8" style="left:66%; top:43%; width:33%"><span class="k">Curso · Orquestación con Qwen Coder</span><span class="t">Domingos 22 y 29 de noviembre, 8:00 a. m. · S/ 50<small>WhatsApp 986 149 476</small></span></div>''',
    [
        ('El veredicto honesto', P('Para lógica precisa, un modelo local de 14B no es productivo: 21 minutos frente a uno o dos de Claude directo, cuyas implementaciones de referencia pasaron 31 de 31 pruebas a la primera.')),
        ('Lo que sí vale: el andamiaje', P('Oráculo, árbitro, sandbox y visor funcionan con cualquier modelo. El modelo es la pieza que se cambia; la verificación es la que se queda.')),
        ('Lo que aprendimos de los modelos pequeños', P('Ponles tope a los tokens de salida o se quedan en bucle. Un timeout es un intento, no el fin de la tarea. Y nunca le pidas al tester que haga cuentas de memoria.')),
        ('Mejor de 3', P('Los tres espacios en paralelo pueden generar tres versiones del mismo archivo difícil. Se queda la primera que pasa el oro; las otras se descartan.'),
         aparte('En curso: todavía no está medido.')),
        ('Un modelo que razona y recetas', P('gpt-oss:20b es un modelo de razonamiento MoE: 13 GB, unos 3,6 B de parámetros activos (ya instalado). Las recetas dan un ejemplo correcto de la trampa conocida, como el fin de mes.')),
        ('Sigue en el curso', P('«Orquestación con Qwen Coder»: los domingos 22 y 29 de noviembre a las 8:00 a. m. S/ 50. Inscríbete por WhatsApp al 986 149 476.')),
    ],
    '''  TEO.escena([
    function (tl) { TEO.pegar(tl, ["#nLento", "#nRap"]); },
    function (tl) {
      TEO.trazar(tl, ["#riel", "#poste"], { duration: .8 });
      TEO.pegar(tl, ["#s1", "#s2", "#s3", "#s4"]); TEO.pegar(tl, "#nMod");
    },
    function (tl) { tl.to("#capaArriba", { opacity: .35, duration: .4 }); TEO.pegar(tl, "#nLec"); },
    function (tl) {
      tl.fromTo(["#v1", "#v2", "#v3"], { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0, duration: .4, stagger: .15 });
      tl.to(["#v1", "#v2", "#v3"], { top: "62%", duration: .8, stagger: .2, ease: "power1.in" });
      sello(tl, "#x1"); sello(tl, "#x2", "+=.2");
      tl.to(["#v1", "#v3"], { opacity: .25, duration: .4 });
    },
    function (tl) {
      tl.to("#nMod", { rotationY: 90, duration: .22, ease: "power1.in" });
      tl.set("#nMod .m1", { autoAlpha: 0 }); tl.set("#nMod .m2", { autoAlpha: 1 });
      tl.to("#nMod", { rotationY: 0, duration: .32, ease: "power2.out" });
    },
    function (tl) { TEO.pegar(tl, "#nCurso"); }
  ], {
    preparar: function () {
      gsap.set(["#v1", "#v2", "#v3", "#x1", "#x2", "#nMod .m2"], { autoAlpha: 0 });
      gsap.set("#nMod", { transformPerspective: 700 });
    },
    textoFin: "Fin de la clase"
  });''',
    css='''
  #nLec .t small { font-size: .82em; font-weight: 600; opacity: 1; margin: 0; }
  #nLec { gap: .25em; }
  #nCurso .t small { font-size: .95em; font-weight: 700; }
  #x1, #x2 { right: -.6em; top: -.7em; font-size: 1em; }
'''))

print('escenas de oq3-01 generadas en', os.path.normpath(LIVE))
