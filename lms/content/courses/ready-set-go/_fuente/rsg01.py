#!/usr/bin/env python3
"""Genera las escenas LIVE de la Clase 1 de Ready Set Go (rsg-01): python3 _fuente/rsg01.py

Secuencia (112 min de 90: el profesor elige qué abreviar): 00 bienvenida · 01 carrera (Isla Gomita, hecha a mano) · 01c los que
cambiaron las reglas · 02 Forja: tu héroe · 03 de la mecánica a la tecnología · 03b y 03c láminas de la física de Sonic
(a mano: aceleración por cuadro; rampas, loop y salto con seno y coseno) · 04 movimiento y choques (con los números de Sonic
y una plataforma que flota con un seno) · 04b lámina «ningún rival piensa» (a mano) · 04c programa tu rival · 05 hoja de
sprites · 06 elige tu juego · 07 cierre.
Las escenas 01 y 05/heroe.png no se generan aquí. Reglas del modo LIVE: sin recursos externos, menos de 300 elementos
y 1 MB, animación solo CSS, todo se apaga con prefers-reduced-motion. Nada usa <form>: el marco no lo permite.
El campo «paso» va vacío: la lección rsg-01 no define un ciclo de pasos, y el LMS rechaza un paso que no exista ahí.
"""
import json
import pathlib

AQUI = pathlib.Path(__file__).resolve().parent.parent / "live" / "rsg-01"

CIELO = """<svg class="esc-cielo" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <path class="t" pathLength="1" d="M1180 92 L1252 130 L1318 104 L1384 168 L1440 146"/><path class="tb" pathLength="1" d="M92 640 L168 588 L236 626 L296 552"/>
  <g><circle class="e" cx="1180" cy="92" r="4"/><circle class="eo" cx="1252" cy="130" r="5"/><circle class="e" cx="1318" cy="104" r="3.5"/><circle class="eg" cx="1384" cy="168" r="4"/><circle class="e" cx="1440" cy="146" r="3"/><circle class="e" cx="92" cy="640" r="3.5"/><circle class="eg" cx="168" cy="588" r="4.5"/><circle class="e" cx="236" cy="626" r="3"/><circle class="eo" cx="296" cy="552" r="5"/></g>
</svg>"""

AYUDAS = """(function () { try { var t = new URLSearchParams(location.search).get("tema"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t); } catch (e) {} })();
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
// «Llevar a mi juego»: guarda lo que el alumno decidió en este navegador (mismo origen que /forja/). La Forja lo pone en
// el datos.js de SU juego, el que prueba en la escena «Elige tu juego» y el que descarga en el ZIP. Sin IA, sin servidor.
function llevarAMiJuego(nuevos) { try { var a = JSON.parse(localStorage.getItem("forja.ajustes") || "{}") || {}; for (var k in nuevos) a[k] = nuevos[k]; localStorage.setItem("forja.ajustes", JSON.stringify(a)); return true; } catch (e) { return false; } }"""

FASES = {"experiencia": ("ec", "Experiencia"), "reflexion": ("or", "Reflexión"), "conceptualizacion": ("ca", "Concepto"), "experimentacion": ("ea", "Práctica")}


def escena(id_, titulo, fase, paso, minutos, cuerpo, nota, js="", css="", compuerta="lo_logre", umbral=80, comentario="", logro=True):
    ph, nombre = FASES[fase]
    num = id_.split("-")[0]
    html = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Escena · {titulo}</title>
<!--
  Escena del modo LIVE (Ready Set Go, clase rsg-01). Generada por _fuente/rsg01.py: edita ahí, no aquí.
  Reglas: sin recursos externos, menos de 300 elementos y 1 MB, animación solo CSS, todo se apaga con prefers-reduced-motion.
  {comentario}
-->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/rsg.css">
<style id="esc-propio">
{css}
@media (prefers-reduced-motion: reduce) {{ * {{ animation: none !important; transition: none !important; }} }}
</style>
</head>
<body>
{CIELO}
<div class="esc">
  <header class="esc-cab"><span class="esc-fase" data-ph="{ph}">{nombre}</span><span class="esc-num">Ready Set Go · C1 · E{num}</span></header>
  <main class="esc-cuerpo">
{cuerpo}
  </main>
  <footer class="esc-pie"><span class="esc-nota">{nota}</span></footer>
</div>
<script>
{AYUDAS}
{js}
</script>
</body>
</html>
"""
    d = AQUI / id_
    d.mkdir(parents=True, exist_ok=True)
    (d / "escena.html").write_text(html, encoding="utf-8")
    logro = "true" if logro else "false"
    (d / "escena.yaml").write_text(
        f'id: {id_}\ntitulo: "{titulo}"\nfase: {fase}\npaso: ""\nduracion_min: {minutos}\nlo_logre: {logro}\nevidencia: ninguna\n'
        f"umbral_pct: {umbral}\ncompuerta: {compuerta}\n", encoding="utf-8")
    print(f"ok {id_:28s} {len(html) / 1024:5.1f} KB · {html.count('<') - html.count('</') - html.count('<!')} etiquetas aprox.")


# ---------------------------------------------------------------- 00 · bienvenida
escena("00-bienvenida", "Bienvenida: hoy tu héroe se mueve", "experiencia", "ver", 5, """
    <div class="x-fila"><h1 class="esc-titulo a-in">Tu primer juego con IA: <em>hoy tu héroe se mueve</em></h1><span class="esc-chip a-in">Clase 1 · jueves 19 de noviembre · 9:15 pm</span></div>
    <section class="esc-card a-in" style="--d:.15s" aria-label="Mapa de la clase">
      <span class="x-et">Mapa de la clase · toca un paso</span>
      <div class="x-mapa" id="mapa" role="tablist"></div>
      <p class="x-det" id="det" aria-live="polite"></p>
    </section>
    <div class="x-tres">
      <section class="esc-card x-regla a-in" style="--d:.3s"><span class="x-et">La regla del taller</span><strong>Tú describes la mecánica. La IA elige la tecnología.</strong><p>No necesitas saber cómo se llama cada cosa: necesitas decir con claridad qué quieres que pase en tu juego.</p></section>
      <section class="esc-card a-in" style="--d:.4s"><h2>Las 4 clases</h2><ul class="esc-lista" style="font-size:.86em"><li><b>Hoy:</b>&nbsp;tu héroe se mueve y choca</li><li>Rivales que piensan</li><li>Arte, animación y música</li><li>Tu juego publicado</li></ul></section>
      <section class="esc-card a-in" style="--d:.5s"><h2>Antes de empezar</h2><div class="x-col" id="lista" role="group" aria-label="Lista previa"></div></section>
    </div>""",
       "Pulsa «Lo logré» cuando tengas el navegador abierto, el sonido encendido y las manos en el teclado",
       js="""var PASOS = [
  ["Carrera", "6 min", "Jugamos todos una carrera de plataformas. Mientras juegas, fíjate: ¿qué cosas pasan en pantalla? Esas son las mecánicas."],
  ["Historia", "5 min", "Diez juegos que cambiaron las reglas: cada uno inventó una mecánica que hoy vas a usar."],
  ["Tu héroe", "15 min", "En Forja describes a tu héroe con una frase, lo afinas y lo publicas en la galería de la clase."],
  ["Mecánica → tecnología", "10 min", "Cada cosa que quieres que pase tiene una tecnología que la resuelve. Aprendes a pedirla con un buen prompt."],
  ["Física de Sonic", "12 min", "Dos láminas: Sonic acelera sumando un poquito cada cuadro, y en rampas y loops reparte su velocidad con seno y coseno."],
  ["Movimiento y choques", "15 min", "Gravedad, salto y paredes: pruebas los números de Sonic, eliges los tuyos y haces flotar una plataforma con un seno. Construyes tu primer nivel con clics."],
  ["Rivales con reglas", "14 min", "Lámina: ningún fantasma de Pac-Man piensa, solo cambia a dónde apunta. Luego programas a tu rival y lo llevas a tu juego."],
  ["Animación", "10 min", "Tu héroe camina porque pasan muchos dibujos muy rápido. Abres una hoja de sprites y la controlas."],
  ["Tu juego", "15 min", "Juegas TU juego con tus números y tu regla de rival (Plataformas o Laberinto), miras sus algoritmos con rayos X y descargas tu ZIP: tu entregable."],
  ["Cierre", "5 min", "Revisas lo que ya sabes hacer y qué traer para la próxima clase."]
];
var mapa = $("#mapa"), det = $("#det");
PASOS.forEach(function (p, i) {
  var b = el("button", "x-it"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", "false");
  b.appendChild(el("i", null, String(i + 1))); var t = el("span", null, p[0]); t.appendChild(el("small", null, p[1])); b.appendChild(t);
  b.onclick = function () { $$(".x-it", mapa).forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); }); det.textContent = p[2]; };
  mapa.appendChild(b);
});
mapa.firstChild.click();
["Navegador Chrome o Edge abierto", "Sonido encendido o audífonos puestos", "Teclado a la mano: flechas, espacio y X"].forEach(function (t) {
  var b = el("button", "x-it"); b.type = "button"; b.setAttribute("role", "checkbox"); b.setAttribute("aria-checked", "false"); b.appendChild(el("i", null, "✓")); b.appendChild(el("span", null, t));
  b.onclick = function () { b.setAttribute("aria-checked", b.getAttribute("aria-checked") === "true" ? "false" : "true"); }; $("#lista").appendChild(b);
});""",
       css=".x-mapa { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .4em; margin: .5em 0; } .x-mapa .x-it { grid-template-columns: 1fr; justify-items: start; gap: .3em; font-size: .8em; }\n@media (max-width: 900px) { .x-mapa { grid-template-columns: repeat(2, 1fr); } }",
       compuerta="presentes", umbral=100, comentario="Interacción: tocar un paso del mapa muestra qué se hace; lista previa con casillas. Nada se guarda.")

# ---------------------------------------------------------------- 01c · los que cambiaron las reglas
DIEZ = [
    ("Spacewar!", 1962, "El primer juego que se compartió entre computadoras"),
    ("Pong", 1972, "El primer gran éxito comercial"),
    ("Space Invaders", 1978, "Oleadas que aceleran y tabla de récords"),
    ("Pac-Man", 1980, "Enemigos que se comportan distinto entre sí"),
    ("Tetris", 1984, "Pura mecánica: piezas que caen"),
    ("Super Mario Bros.", 1985, "El nivel enseña sin palabras"),
    ("Doom", 1993, "Partidas en red y niveles hechos por jugadores"),
    ("Super Mario 64", 1996, "Moverse y mirar en 3D"),
    ("Pokémon", 1996, "Coleccionar e intercambiar con amigos"),
    ("Minecraft", 2011, "El juego es crear; el más vendido de la historia"),
]
PREGUNTAS = [
    ("¿Cuál popularizó la tabla de récords y la dificultad que sube sola?", 2),
    ("¿En cuál cada enemigo persigue a su manera? (Lo programarás en la Clase 2.)", 3),
    ("¿Cuál nació en la Unión Soviética y no tiene ni un personaje?", 4),
    ("¿Cuál permitió que los jugadores crearan y compartieran sus propios niveles?", 6),
    ("¿Cuál resolvió cómo moverse y mirar en tres dimensiones?", 7),
    ("¿Cuál es el videojuego más vendido de la historia?", 9),
]
escena("01c-los-que-cambiaron-las-reglas", "Diez juegos que cambiaron las reglas", "reflexion", "", 5, """
    <div class="x-fila"><h1 class="esc-titulo a-in">Diez que <em>cambiaron las reglas</em></h1><span class="esc-chip ok a-in" id="puntos" aria-live="polite">0 de 6</span></div>
    <section class="esc-card x-regla a-in" style="--d:.15s" aria-live="polite"><span class="x-et" id="nPreg"></span><strong id="pregunta"></strong><p id="pista"></p></section>
    <div class="x-diez" id="diez" role="group" aria-label="Diez juegos: elige la respuesta"></div>
    <p class="esc-sub a-in" style="--d:.5s;font-size:.8em">Es una selección para discutir, no un ranking oficial. ¿Cuál falta para ti? Dilo en el chat.</p>""",
       "Pulsa «Lo logré» cuando hayas respondido las seis preguntas. Lo importante no es acertar: es notar que cada juego famoso aportó UNA idea",
       js="var J = " + json.dumps([{"n": n, "a": a, "i": i} for n, a, i in DIEZ], ensure_ascii=False) + ", P = " + json.dumps([{"q": q, "r": r} for q, r in PREGUNTAS], ensure_ascii=False) + """;
var k = 0, buenas = 0, bloqueado = false, caja = $("#diez");
J.forEach(function (j, i) {
  var b = el("button", "x-carta a-in"); b.type = "button"; b.style.setProperty("--d", i * 0.04 + "s");
  b.appendChild(el("span", "x-anio", String(j.a))); b.appendChild(el("b", null, j.n)); b.appendChild(el("small", null, j.i));
  b.onclick = function () { responder(i, b); }; caja.appendChild(b);
});
function pregunta() {
  bloqueado = false; $$(".x-carta", caja).forEach(function (b) { b.classList.remove("bien", "mal"); });
  if (k >= P.length) { $("#nPreg").textContent = "Terminaste"; $("#pregunta").textContent = buenas + " de " + P.length + " aciertos."; $("#pista").textContent = "Cada uno aportó una sola idea nueva y la pulió hasta que fue divertida. Tu juego también empieza con una."; return; }
  $("#nPreg").textContent = "Pregunta " + (k + 1) + " de " + P.length + " · toca un juego"; $("#pregunta").textContent = P[k].q; $("#pista").textContent = "";
}
function responder(i, b) {
  if (bloqueado || k >= P.length) return;
  var ok = i === P[k].r, cartas = $$(".x-carta", caja);
  if (ok) { bloqueado = true; b.classList.add("bien"); if (!b.dataset.fallo) buenas++; $("#puntos").textContent = buenas + " de " + P.length; $("#pista").textContent = "¡Sí! " + J[i].n + " (" + J[i].a + "): " + J[i].i.charAt(0).toLowerCase() + J[i].i.slice(1) + "."; cartas.forEach(function (c) { delete c.dataset.fallo; }); k++; setTimeout(pregunta, 2200); }
  else { b.classList.add("mal"); cartas[P[k].r].dataset.fallo = "1"; $("#pista").textContent = J[i].n + " aportó otra cosa: " + J[i].i.charAt(0).toLowerCase() + J[i].i.slice(1) + ". Prueba otra vez."; }
}
pregunta();""",
       css=""".x-diez { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .8vw; }
.x-carta { display: grid; gap: .25em; justify-items: start; text-align: left; font: inherit; color: var(--fg); background: var(--s1); border: 1px solid var(--line); border-radius: .9em; padding: .6em .7em; cursor: pointer; box-shadow: var(--card-shadow); transition: transform .2s, border-color .2s, background .2s; }
.x-carta:hover { transform: translateY(-.2em); border-color: var(--accent); }
.x-carta b { font-size: .92em; line-height: 1.15; } .x-carta small { font-size: .66em; color: var(--muted); line-height: 1.25; }
.x-carta .x-anio { font: 800 .72em var(--mono); color: var(--accent); background: var(--accent-bg); border-radius: .5em; padding: .15em .4em; }
.x-carta.bien { background: var(--ok-bg); border-color: var(--ok); } .x-carta.mal { background: var(--bad-bg); border-color: var(--bad); }
#pista { min-height: 2.6em; }
@media (max-width: 900px) { .x-diez { grid-template-columns: repeat(2, 1fr); } }""",
       comentario="Interacción: seis preguntas; se responde tocando uno de los diez juegos. Solo texto: sin imágenes ni marcas gráficas.")

# ---------------------------------------------------------------- 02 · Forja: tu héroe
MARCO = """
    <ol class="x-pasos a-in">{pasos}</ol>
    <iframe class="x-marco" src="{src}" title="Forja, estudio de personajes" allow="autoplay"></iframe>"""
escena("02-forja-personajes", "Forja: crea tu héroe", "experiencia", "construir", 15,
       MARCO.format(src="/forja/?clase=rsg-01", pasos="<li>Describe tu héroe arriba y pulsa <b>Forjar</b></li><li>Afínalo con el muelle de la izquierda: <b>Cuerpo</b>, <b>Color</b>, <b>Cara</b></li><li>Guárdalo con el <b>corazón</b></li><li>Publícalo en la <b>Galería</b>, sala <b>rsg-01</b></li>"),
       "Pulsa «Lo logré» cuando tu héroe esté publicado en la galería de la sala rsg-01",
       css=".esc-cuerpo { gap: 1vh; } .esc { padding-top: 1.2vh; padding-bottom: 1.2vh; gap: 1vh; }", umbral=70,
       comentario="Incrusta el estudio Forja (mismo origen). Forja dibuja con reglas locales y no usa formularios ni ventanas nuevas.")

# ---------------------------------------------------------------- 03 · de la mecánica a la tecnología
escena("03-mecanica-a-tecnologia", "De la mecánica a la tecnología", "conceptualizacion", "contexto", 10, """
    <h1 class="esc-titulo a-in">De la <em>mecánica</em> a la tecnología</h1>
    <div class="x-dos">
      <section class="esc-card a-in" style="--d:.15s"><span class="x-et">Lo que quieres que pase · toca una</span><div class="x-col" id="mec" role="tablist" style="margin-top:.5em"></div></section>
      <div class="x-col">
        <section class="esc-card x-regla a-in" style="--d:.25s" aria-live="polite"><span class="x-et">La tecnología que lo resuelve</span><strong id="tec"></strong><p id="exp"></p><p style="margin-top:.5em"><span class="esc-chip" id="donde"></span> <span class="esc-chip ok" id="clave"></span></p></section>
        <section class="esc-card a-in" style="--d:.35s"><span class="x-et">Tu prompt · mecánica + contexto + límite + prueba</span>
          <div class="x-fila" id="juego" role="radiogroup" aria-label="Tu juego" style="margin:.4em 0"></div>
          <pre class="x-cod" id="prompt" tabindex="0"></pre>
          <div class="x-fila" style="margin-top:.5em"><button class="x-btn pri" id="copiar" type="button">Copiar prompt</button><span class="x-et" id="copiado" aria-live="polite"></span></div>
        </section>
      </div>
    </div>""",
       "Pulsa «Lo logré» cuando hayas tocado las seis mecánicas y copiado un prompt para tu juego",
       js="""var MEC = [
  ["El héroe cae y salta", "Gravedad y velocidad", "La gravedad tira hacia abajo en cada cuadro. Saltar es dar una velocidad hacia arriba de golpe.", "juego.js · «salto»", "Arcade Physics", "mi héroe salte al pulsar espacio y caiga solo", "el héroe sube, llega a un punto alto y vuelve al suelo"],
  ["No atraviesa el suelo ni las paredes", "Colisiones con cuerpos sólidos", "El nivel es una lista de datos. Cada loseta sólida se convierte en un cuerpo que no deja pasar.", "juego.js · «nivel»", "collider · tilemap", "mi héroe no atraviese el suelo ni las plataformas", "puedo pararme sobre una plataforma y no caigo a través de ella"],
  ["Camina moviendo las piernas", "Hoja de sprites y animación por cuadros", "Una sola imagen guarda todos los dibujos. Pasarlos rápido, uno tras otro, crea el movimiento.", "assets/heroe.png + heroe.json", "spritesheet · frameRate", "mi héroe muestre la animación de caminar cuando se mueve y la de quieto cuando para", "las piernas se mueven solo mientras avanzo"],
  ["La cámara lo sigue", "Cámara con seguimiento", "La cámara persigue al héroe con suavidad y no sale de los bordes del nivel.", "juego.js · «camara»", "startFollow", "la cámara siga a mi héroe sin mostrar fuera del nivel", "al llegar al borde del nivel la cámara se detiene"],
  ["El rival va y viene", "Patrulla", "Camina hasta un límite y da la vuelta: una variable y dos comparaciones.", "juego.js · «patrulla»", "estado simple", "un rival camine entre dos puntos y dé la vuelta en cada extremo", "el rival nunca se cae del borde"],
  ["El rival me busca por el laberinto", "Búsqueda de caminos (BFS)", "Se revisan las celdas a 1 paso, luego a 2, luego a 3… hasta tocar el destino. Lo veremos la próxima clase.", "Clase 2 · plantilla Laberinto", "pathfinding", "un rival encuentre el camino más corto hasta mi héroe esquivando muros", "con rayos X veo la ruta y siempre es la más corta"]
];
var sel = 0, juego = "plataformas", vistas = {};
function pinta() {
  var m = MEC[sel]; $("#tec").textContent = m[1]; $("#exp").textContent = m[2]; $("#donde").textContent = m[3]; $("#clave").textContent = m[4];
  $("#prompt").textContent = "Quiero que " + m[5] + ".\\nMi juego es de " + juego + ", hecho con Phaser 4 y Arcade Physics.\\nNo cambies los controles ni los archivos de assets/.\\nSabré que funciona cuando " + m[6] + ".";
  $$("#mec .x-it").forEach(function (b, i) { b.setAttribute("aria-selected", i === sel ? "true" : "false"); if (vistas[i]) b.firstChild.textContent = "✓"; });
}
MEC.forEach(function (m, i) { var b = el("button", "x-it"); b.type = "button"; b.setAttribute("role", "tab"); b.appendChild(el("i", null, String(i + 1))); b.appendChild(el("span", null, m[0])); b.onclick = function () { sel = i; vistas[i] = 1; pinta(); }; $("#mec").appendChild(b); });
["plataformas", "fútbol"].forEach(function (j) { var b = el("button", "x-btn", "Mi juego: " + j); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-pressed", j === juego ? "true" : "false"); b.onclick = function () { juego = j; $$("#juego .x-btn").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); pinta(); }; $("#juego").appendChild(b); });
$("#copiar").onclick = function () {
  var t = $("#prompt").textContent, ok = function () { $("#copiado").textContent = "Copiado"; setTimeout(function () { $("#copiado").textContent = ""; }, 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { seleccionar(); }); else seleccionar();
  function seleccionar() { var r = document.createRange(); r.selectNodeContents($("#prompt")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); $("#copiado").textContent = "Seleccionado: pulsa Ctrl+C"; }
};
vistas[0] = 1; pinta();""",
       comentario="Interacción: seis mecánicas; cada una muestra su tecnología, dónde vive en el proyecto y arma un prompt copiable.")

# ---------------------------------------------------------------- 04 · movimiento y choques
escena("04-movimiento-y-choques", "Movimiento y choques: mueve los números", "experimentacion", "demo", 15, """
    <h1 class="esc-titulo a-in">Movimiento y choques: <em>mueve los números</em></h1>
    <div class="x-dos">
      <section class="esc-card a-in" style="--d:.15s">
        <span class="x-et">Tu primer nivel · clic en una celda pone o quita un muro · <span class="x-k">←</span> <span class="x-k">→</span> moverte · <span class="x-k">espacio</span> saltar</span>
        <canvas id="sim" width="640" height="360" tabindex="0" aria-label="Simulador: un héroe con gravedad en un nivel de celdas"></canvas>
        <div class="x-fila"><button class="x-btn" data-k="izq" type="button">◀</button><button class="x-btn" data-k="der" type="button">▶</button><button class="x-btn" data-k="salto" type="button">⤒ Saltar</button>
          <button class="x-btn" id="caja" type="button" aria-pressed="false">Ver caja de choque</button><button class="x-btn" id="reinicio" type="button">Reiniciar nivel</button>
          <button class="x-btn pri" id="llevar" type="button">⇢ Llevar a mi juego</button></div>
        <p class="x-det" id="llevado" aria-live="polite" style="font-size:.82em;min-height:1.4em"></p>
      </section>
      <div class="x-col">
        <section class="esc-card a-in" style="--d:.25s"><div class="x-fila" style="justify-content:space-between"><span class="x-et">Tres números mandan</span><button class="x-btn" id="sonic" type="button" title="Los de Sonic the Hedgehog (Sega, 1991), pasados a segundos">Números de Sonic</button></div>
          <label class="x-campo">Gravedad<input id="g" type="range" min="0" max="2600" step="4" value="1700"><output id="og"></output></label>
          <label class="x-campo">Salto<input id="s" type="range" min="200" max="1100" step="10" value="700"><output id="os"></output></label>
          <label class="x-campo">Velocidad<input id="v" type="range" min="60" max="420" step="10" value="220"><output id="ov"></output></label>
          <p class="x-det" id="lee" aria-live="polite" style="font-size:.84em;min-height:3.2em"></p>
          <span class="x-et" style="margin-top:.5em">Plataforma que flota · y = base + A · sin(ω · t)</span>
          <label class="x-campo">A · cuánto<input id="amp" type="range" min="0" max="120" step="5" value="40"><output id="oamp"></output></label>
          <label class="x-campo">ω · rapidez<input id="w" type="range" min="0" max="4" step="0.1" value="1.5"><output id="ow"></output></label>
        </section>
        <section class="esc-card a-in" style="--d:.35s"><span class="x-et">Así está escrito en tu juego (juego.js)</span>
<pre class="x-cod"><span class="c">// la gravedad tira hacia abajo en cada cuadro; saltar es una velocidad hacia arriba</span>
h.setVelocityX(direccion * <span class="k">F.velocidad</span>);
if (salto &amp;&amp; enElPiso) h.setVelocityY(-<span class="k">F.salto</span>);
<span class="c">// la plataforma que flota: su altura es un seno</span>
p.y = base + <span class="k">A</span> * Math.sin(<span class="k">ω</span> * t);
<span class="c">// y el nivel es una lista: cada celda sólida es un cuerpo que no deja pasar</span>
this.physics.add.collider(heroe, suelo);</pre></section>
        <section class="esc-card a-in" style="--d:.45s"><span class="x-et">Retos</span><div class="x-col" id="retos" role="group" aria-label="Retos" style="margin-top:.4em"></div></section>
      </div>
    </div>""",
       "Pulsa «Lo logré» cuando hayas completado los cuatro retos",
       js=r"""var C = 40, COLS = 16, FILAS = 9, cv = $("#sim"), x = cv.getContext("2d"), K = {}, verCaja = false;
var BASE = ["................", "................", "................", "..........###...", "................", "......###.......", "................", "..##............", "################"];
var mapa, H;
function reiniciar() { mapa = BASE.map(function (f) { return f.split("").map(function (c) { return c === "#" ? 1 : 0; }); }); H = { x: 60, y: 200, vx: 0, vy: 0, w: 24, h: 32, piso: false, max: 0, enP: false }; }
// Plataforma que flota (cols 13-15): y = base + A·sin(ω·t). Se pisa desde arriba y te lleva; no choca de lado.
var P = { x: 520, w: 120, h: 14, base: 180, y: 180, t: 0 };
function sobreP(px) { return px + H.w / 2 > P.x && px - H.w / 2 < P.x + P.w; }
function solido(px, py) { var c = Math.floor(px / C), f = Math.floor(py / C); if (c < 0 || c >= COLS) return true; if (f < 0) return false; if (f >= FILAS) return true; return mapa[f][c] === 1; }
function choca(nx, ny) { return solido(nx - H.w / 2, ny - H.h) || solido(nx + H.w / 2 - 1, ny - H.h) || solido(nx - H.w / 2, ny - 1) || solido(nx + H.w / 2 - 1, ny - 1) || solido(nx - H.w / 2, ny - H.h / 2) || solido(nx + H.w / 2 - 1, ny - H.h / 2); }
reiniciar();
var G = $("#g"), S = $("#s"), V = $("#v"), A = $("#amp"), W = $("#w"), antes = performance.now(), cumplidos = {};
function leer() {
  var g = +G.value, s = +S.value, alto = g > 0 ? s * s / (2 * g) : Infinity;
  $("#og").textContent = g; $("#os").textContent = s; $("#ov").textContent = V.value;
  $("#lee").innerHTML = g > 0 ? "Altura del salto = salto² ÷ (2 × gravedad) = <b>" + Math.round(alto) + " px</b>, o sea <b>" + (alto / C).toFixed(1) + " celdas</b>." : "<b>Gravedad 0:</b> nada lo baja. Salta y mira cómo se va para siempre.";
  if (g > 0 && alto < 2 * C) reto(0); if (g === 0) reto(2);
  var a = +A.value, w = +W.value; $("#oamp").textContent = a + " px"; $("#ow").textContent = String(w).replace(".", ",");
}
function reto(i) { if (cumplidos[i]) return; cumplidos[i] = 1; var b = $$("#retos .x-it")[i]; if (b) b.setAttribute("aria-checked", "true"); }
["Baja el salto hasta que ya no alcance 2 celdas de alto", "Construye una escalera de 3 escalones y súbela", "Pon la gravedad en 0 y salta: ¿qué pasa?", "Súbete a la plataforma que flota y deja que te lleve"].forEach(function (t) { var b = el("div", "x-it"); b.setAttribute("role", "checkbox"); b.setAttribute("aria-checked", "false"); b.appendChild(el("i", null, "✓")); b.appendChild(el("span", null, t)); $("#retos").appendChild(b); });
function paso(dt) {
  P.t += dt; P.y = P.base + (+A.value) * Math.sin((+W.value) * P.t);
  if (H.enP) { if (sobreP(H.x)) H.y = P.y; else { H.enP = false; H.piso = false; } }   // la plataforma lo lleva
  var dir = (K.der ? 1 : 0) - (K.izq ? 1 : 0); H.vx = dir * +V.value;
  if (K.salto && H.piso) { H.vy = -S.value; H.piso = false; }
  H.vy += +G.value * dt;
  var nx = H.x + H.vx * dt; if (!choca(nx, H.y)) H.x = nx;
  var antesY = H.y, ny = H.y + H.vy * dt; H.enP = false;
  if (!choca(H.x, ny)) { H.y = ny; H.piso = false; } else { if (H.vy > 0) { H.y = Math.floor((ny - 1) / C) * C; H.piso = true; } H.vy = 0; }
  if (H.vy >= 0 && sobreP(H.x) && antesY <= P.y + 1 && H.y >= P.y) { H.y = P.y; H.vy = 0; H.piso = true; H.enP = true; if (+A.value > 0 && +W.value > 0) reto(3); }
  if (H.y < -400 || H.y > 600) { H.x = 60; H.y = 200; H.vy = 0; }
  if (H.piso && H.y <= (FILAS - 4) * C) reto(1);
}
function dibuja() {
  var e = getComputedStyle(document.documentElement), acento = e.getPropertyValue("--accent").trim(), linea = e.getPropertyValue("--line2").trim();
  x.clearRect(0, 0, 640, 360);
  for (var f = 0; f < FILAS; f++) for (var c = 0; c < COLS; c++) { if (mapa[f][c]) { x.fillStyle = acento; x.globalAlpha = .85; x.fillRect(c * C + 1, f * C + 1, C - 2, C - 2); x.globalAlpha = 1; } else { x.strokeStyle = linea; x.lineWidth = 1; x.strokeRect(c * C + .5, f * C + .5, C, C); } }
  var am = +A.value, cx = P.x + P.w / 2;   // recorrido de la plataforma: de base − A a base + A
  if (am > 0) { x.save(); x.setLineDash([4, 5]); x.strokeStyle = "#5fc28f"; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, P.base - am); x.lineTo(cx, P.base + am + P.h); x.stroke(); x.restore(); }
  x.fillStyle = "#5fc28f"; x.beginPath(); x.roundRect(P.x + 2, P.y, P.w - 4, P.h, 5); x.fill(); x.strokeStyle = "#14122b"; x.lineWidth = 2; x.stroke();
  x.fillStyle = "#ff8a3d"; x.beginPath(); x.roundRect(H.x - H.w / 2 - 3, H.y - H.h - 6, H.w + 6, H.h + 6, 9); x.fill();
  x.fillStyle = "#14122b"; x.beginPath(); x.arc(H.x - 4, H.y - H.h + 8, 3.4, 0, 6.283); x.arc(H.x + 6, H.y - H.h + 8, 3.4, 0, 6.283); x.fill();
  if (verCaja) { x.strokeStyle = "#c6ff4a"; x.lineWidth = 2; x.strokeRect(H.x - H.w / 2, H.y - H.h, H.w, H.h); x.fillStyle = "#c6ff4a"; x.font = "700 12px monospace"; x.fillText("vx " + Math.round(H.vx) + "  vy " + Math.round(H.vy) + (H.piso ? "  en el piso" : "  en el aire"), 8, 16); }
}
(function bucle(t) { requestAnimationFrame(bucle); var dt = Math.min(.04, (t - antes) / 1000); antes = t; for (; dt > 0; dt -= 1 / 120) paso(Math.min(dt, 1 / 120)); dibuja(); })(antes);
var TEC = { ArrowLeft: "izq", a: "izq", ArrowRight: "der", d: "der", " ": "salto", ArrowUp: "salto", w: "salto" };
addEventListener("keydown", function (e) { var k = TEC[e.key]; if (k) { e.preventDefault(); K[k] = true; } }); addEventListener("keyup", function (e) { var k = TEC[e.key]; if (k) K[k] = false; });
$$("[data-k]").forEach(function (b) { ["pointerdown", "pointerup", "pointerleave", "pointercancel"].forEach(function (ev, i) { b.addEventListener(ev, function (e) { e.preventDefault(); K[b.dataset.k] = i === 0; }); }); });
cv.addEventListener("pointerdown", function (e) { var r = cv.getBoundingClientRect(), c = Math.floor((e.clientX - r.left) / r.width * COLS), f = Math.floor((e.clientY - r.top) / r.height * FILAS); if (f >= 0 && f < FILAS - 1 && c >= 0 && c < COLS) { mapa[f][c] = mapa[f][c] ? 0 : 1; if (choca(H.x, H.y)) mapa[f][c] = 0; } cv.focus(); });
$("#caja").onclick = function () { verCaja = !verCaja; this.setAttribute("aria-pressed", String(verCaja)); };
$("#reinicio").onclick = reiniciar; [G, S, V, A, W].forEach(function (i) { i.oninput = leer; });
// Sonic Physics Guide, por cuadro a 60 cuadros por segundo: velocidad tope 6 → 360 px/s; salto 6,5 → 390 px/s; gravedad 0,21875 → 787,5 px/s² (el control va de 4 en 4: 788).
$("#sonic").onclick = function () { G.value = 788; S.value = 390; V.value = 360; leer(); $("#llevado").textContent = "Estos son los de Sonic (1991): corre a 360, salta a 390 y cae con 788. Pruébalos y luego elige los tuyos."; };
$("#llevar").onclick = function () {
  var g = +G.value, a = +A.value, w = +W.value, ok = llevarAMiJuego({ gravedad: g, salto: +S.value, velocidad: +V.value, oscilacion: { amp: a, vel: w } });
  $("#llevado").textContent = ok ? "✓ Guardado en tu juego: gravedad " + g + " · salto " + S.value + " · velocidad " + V.value + " · plataformas " + (a > 0 && w > 0 ? "que flotan (A " + a + " px · ω " + String(w).replace(".", ",") + ")" : "quietas") + ". Lo verás en «Elige tu juego» (Plataformas) y en tu ZIP." + (g < 300 ? " Ojo: en tu juego la gravedad mínima es 300, para que puedas aterrizar." : "") : "No se pudo guardar en este navegador.";
};
leer();""",
       css="#sim { width: 100%; height: auto; aspect-ratio: 16 / 9; display: block; margin: .5em 0; border-radius: .7em; background: var(--s2); border: 1px solid var(--line2); cursor: crosshair; touch-action: none; }",
       comentario="Interacción: simulador propio en lienzo (gravedad, salto, velocidad y choque con celdas) y una plataforma que flota con y = base + A·sin(ωt). Clic pone o quita muros. Botón con los números de Sonic. Cuatro retos que se marcan solos.")

# ---------------------------------------------------------------- 04c · programa tu rival (práctica de la lámina 04b)
# La teoría está en la lámina 04b-ningun-rival-piensa (formato teoria-animada, escrita a mano, no la genera este script).
escena("04c-programa-tu-rival", "Programa tu rival y llévalo a tu juego", "experimentacion", "", 8, """
    <h1 class="esc-titulo a-in">Programa tu rival: <em>elige su regla y llévala a tu juego</em></h1>
    <div class="x-dos">
      <section class="esc-card a-in" style="--d:.15s">
        <span class="x-et">Laberinto de reglas · <span class="x-k">←</span> <span class="x-k">↑</span> <span class="x-k">→</span> <span class="x-k">↓</span> moverte · come los puntos · el anillo es el objetivo de cada perseguidor y la línea, su camino</span>
        <canvas id="lab" width="608" height="352" tabindex="0" aria-label="Laberinto: tu héroe y cuatro perseguidores que siguen reglas"></canvas>
        <div class="x-fila"><button class="x-btn" data-d="u" type="button" aria-label="Arriba">▲</button><button class="x-btn" data-d="l" type="button" aria-label="Izquierda">◀</button><button class="x-btn" data-d="d" type="button" aria-label="Abajo">▼</button><button class="x-btn" data-d="r" type="button" aria-label="Derecha">▶</button>
          <button class="x-btn" id="modo" type="button" aria-pressed="false">Modo: perseguir</button><button class="x-btn" id="ver" type="button" aria-pressed="true">Objetivos y caminos</button><button class="x-btn" id="reset" type="button">Reiniciar</button></div>
        <div class="x-fila" role="group" aria-label="Velocidad"><span class="x-et" style="margin:0">Velocidad</span><button class="x-btn" data-vel="lento" type="button" aria-pressed="true">Lento</button><button class="x-btn" data-vel="normal" type="button" aria-pressed="false">Normal</button><button class="x-btn" data-vel="rapido" type="button" aria-pressed="false">Rápido</button></div>
        <p class="x-det" id="marcador" aria-live="polite">Pulsa una flecha para empezar. Antes de moverte, mira a dónde apunta cada uno.</p>
      </section>
      <div class="x-col">
        <section class="esc-card a-in" style="--d:.25s"><span class="x-et">Programa a tus perseguidores</span>
          <p class="pm-intro">Lo de la lámina: en cada cruce, la salida más cercana a su <b>objetivo</b>. Aquí cambias cómo calcula ese objetivo cada uno.</p>
          <div id="reglas" role="group" aria-label="Reglas de los perseguidores"></div>
          <div class="x-fila" style="margin-top:.4em"><button class="x-btn" id="orig" type="button">Volver a las reglas de 1980</button></div>
          <div class="x-fila" style="margin-top:.5em"><span style="font-size:.8em">Llevar a mi juego la regla del</span><select id="cual" aria-label="Qué regla llevar a tu juego" class="pm-cual"><option value="0">Rojo</option><option value="1" selected>Rosa</option><option value="2">Celeste</option><option value="3">Naranja</option></select><button class="x-btn pri" id="llevar" type="button">⇢ Llevar a mi juego</button></div>
          <p class="x-det" id="llevado" aria-live="polite" style="font-size:.8em;min-height:1.3em;margin:.3em 0 0"></p>
        </section>
        <section class="esc-card a-in" style="--d:.45s"><span class="x-et">Así se escribe en tu juego (rivales.js)</span><pre class="x-cod" id="cod"></pre></section>
        <section class="esc-card a-in" style="--d:.55s"><span class="x-et">Retos</span><div class="x-col" id="retos" role="group" aria-label="Retos" style="margin-top:.4em"></div></section>
      </div>
    </div>""",
       "Pulsa «Lo logré» cuando hayas cumplido los tres retos",
       js=r"""var M = ["###################", "#........#........#", "#.##.###.#.###.##.#", "#.................#", "#.##.#.#####.#.##.#", "#....#...#...#....#", "####.###.#.###.####", "#.................#", "#.##.###.#.###.##.#", "#........#........#", "###################"];
var C = 32, COLS = 19, FILAS = 11, cv = $("#lab"), x = cv.getContext("2d");
var DIR = { u: [0, -1], l: [-1, 0], d: [0, 1], r: [1, 0] }, ORDEN = ["u", "l", "d", "r"], OPUESTA = { u: "d", d: "u", l: "r", r: "l" };
var TIPOS = [["celda", "tu celda"], ["delante", "N celdas delante de ti"], ["pinza", "pinza con el rojo (N delante)"], ["indeciso", "te persigue si está a más de N"], ["esquina", "se queda en su esquina"], ["azar", "al azar"]];
var CON_N = { delante: 1, pinza: 1, indeciso: 1 };
var PERS = [
  { id: "rojo", nombre: "Rojo", color: "#E2546B", linea: "#B3261E", esq: [COLS - 1, -1], ini: [8, 3], orig: { tipo: "celda", n: 0 } },
  { id: "rosa", nombre: "Rosa", color: "#F2C4D8", linea: "#C2477F", esq: [0, -1], ini: [9, 3], orig: { tipo: "delante", n: 4 } },
  { id: "celeste", nombre: "Celeste", color: "#8DBBE8", linea: "#2B6CB0", esq: [COLS - 1, FILAS], ini: [10, 3], orig: { tipo: "pinza", n: 2 } },
  { id: "naranja", nombre: "Naranja", color: "#F5A04A", linea: "#C46A12", esq: [0, FILAS], ini: [11, 3], orig: { tipo: "indeciso", n: 8 } }
];
var J, corriendo = false, modo = "perseguir", verGuias = true, atrapado = 0, vivoDesde = 0, record = 0, cumplidos = {}, quiere = "l";
function libre(c, f) { return f >= 0 && f < FILAS && c >= 0 && c < COLS && M[f][c] !== "#"; }
function d2(a, b) { var dx = a[0] - b[0], dy = a[1] - b[1]; return dx * dx + dy * dy; }
function reiniciar() {
  J = { c: 9, f: 9, pc: 9, pf: 9, dir: "l" }; quiere = "l"; corriendo = false; vivoDesde = 0;
  PERS.forEach(function (p) { p.c = p.ini[0]; p.f = p.ini[1]; p.pc = p.c; p.pf = p.f; p.dir = "l"; if (!p.regla) p.regla = { tipo: p.orig.tipo, n: p.orig.n }; });
}
function objetivo(p) {
  if (modo === "dispersarse") return p.esq;
  var r = p.regla, d = DIR[J.dir], yo = [J.c, J.f];
  if (r.tipo === "celda") return yo;
  if (r.tipo === "delante") return [J.c + d[0] * r.n, J.f + d[1] * r.n];
  if (r.tipo === "pinza") { var t = [J.c + d[0] * r.n, J.f + d[1] * r.n], R = PERS[0]; return [2 * t[0] - R.c, 2 * t[1] - R.f]; }
  if (r.tipo === "indeciso") return d2([p.c, p.f], yo) > r.n * r.n ? yo : p.esq;
  if (r.tipo === "azar") { if (!p.azar || (p.c === p.azar[0] && p.f === p.azar[1]) || Math.random() < .08) p.azar = [Math.floor(Math.random() * COLS), Math.floor(Math.random() * FILAS)]; return p.azar; }
  return p.esq;
}
// En cada celda: la salida (sin media vuelta) que deja más cerca el objetivo; empate → arriba, izquierda, abajo, derecha.
function elegir(c, f, dir, obj) {
  var mejor = null, md = Infinity;
  ORDEN.forEach(function (k) { if (k === OPUESTA[dir]) return; var n = [c + DIR[k][0], f + DIR[k][1]]; if (!libre(n[0], n[1])) return; var dd = d2(n, obj); if (dd < md) { md = dd; mejor = k; } });
  return mejor || OPUESTA[dir];
}
function camino(p, obj) {
  var c = p.c, f = p.f, dir = p.dir, pts = [[c, f]];
  for (var i = 0; i < 14; i++) { dir = elegir(c, f, dir, obj); c += DIR[dir][0]; f += DIR[dir][1]; pts.push([c, f]); if (c === obj[0] && f === obj[1]) break; }
  return pts;
}
function pasoJugador() {
  J.pc = J.c; J.pf = J.f;
  if (libre(J.c + DIR[quiere][0], J.f + DIR[quiere][1])) J.dir = quiere;
  if (libre(J.c + DIR[J.dir][0], J.f + DIR[J.dir][1])) { J.c += DIR[J.dir][0]; J.f += DIR[J.dir][1]; }
  var k = J.c + "," + J.f;
  if (puntos[k]) { puntos[k] = 0; comidos++; if (!Object.keys(puntos).some(function (q) { return puntos[q]; })) llenarPuntos(); }
}
function pasoPerseguidores() {
  PERS.forEach(function (p) { p.pc = p.c; p.pf = p.f; p.dir = elegir(p.c, p.f, p.dir, objetivo(p)); p.c += DIR[p.dir][0]; p.f += DIR[p.dir][1]; });
}
function revisarCaptura(t) {
  var hit = PERS.some(function (p) { return (p.c === J.c && p.f === J.f) || (p.c === J.pc && p.f === J.pf && p.pc === J.c && p.pf === J.f); });
  if (!hit) return;
  atrapado++; var s = (t - vivoDesde) / 1000; record = Math.max(record, s);
  reiniciar(); marcador("¡Te atraparon! Duraste " + s.toFixed(1) + " s. Pulsa una flecha para seguir.");
}
function original() { return PERS.every(function (p) { return p.regla.tipo === p.orig.tipo && +p.regla.n === p.orig.n; }); }
function marcador(t) { $("#marcador").textContent = t + "  ·  Puntos " + comidos + "  ·  Atrapado " + atrapado + " " + (atrapado === 1 ? "vez" : "veces") + "  ·  Récord " + record.toFixed(1) + " s"; }
function reto(i) { if (cumplidos[i]) return; cumplidos[i] = 1; var b = $$("#retos .x-it")[i]; if (b) b.setAttribute("aria-checked", "true"); }
["Pon a los 4 con la regla «tu celda»: ¿por qué ahora se estorban y van en fila?", "Con las reglas de 1980, sobrevive 20 segundos", "Cambia el modo a «dispersarse»: ¿a dónde se va cada uno?"].forEach(function (t) { var b = el("div", "x-it"); b.setAttribute("role", "checkbox"); b.setAttribute("aria-checked", "false"); b.appendChild(el("i", null, "✓")); b.appendChild(el("span", null, t)); $("#retos").appendChild(b); });
function codigo() {
  var L = ["<span class=\"c\">// en cada cruce: la salida (sin media vuelta) que deja más cerca el objetivo</span>"];
  PERS.forEach(function (p) {
    var r = p.regla, v = p.id, e;
    if (r.tipo === "celda") e = "jugador.celda";
    else if (r.tipo === "delante") e = "delante(jugador, <span class=\"k\">" + r.n + "</span>)";
    else if (r.tipo === "pinza") e = "doble(delante(jugador, <span class=\"k\">" + r.n + "</span>), rojo)";
    else if (r.tipo === "indeciso") e = "distancia(" + v + ", jugador) > <span class=\"k\">" + r.n + "</span> ? jugador.celda : " + v + ".esquina";
    else if (r.tipo === "azar") e = "celdaAlAzar()";
    else e = v + ".esquina";
    L.push((v + ".objetivo").padEnd(17) + "= " + e + ";");
  });
  $("#cod").innerHTML = L.join("\n");
  if (PERS.every(function (p) { return p.regla.tipo === "celda"; })) reto(0);
}
PERS.forEach(function (p) {
  var fila = el("div", "pm-fila"), dot = el("i", "pm-p"), nom = el("b", null, p.nombre), sel = document.createElement("select"), num = document.createElement("input");
  dot.style.background = p.color; sel.setAttribute("aria-label", "Regla de " + p.nombre); num.type = "number"; num.min = "0"; num.max = "12"; num.setAttribute("aria-label", "N de " + p.nombre);
  TIPOS.forEach(function (t) { var o = document.createElement("option"); o.value = t[0]; o.textContent = t[1]; sel.appendChild(o); });
  p.sel = sel; p.num = num;
  function sync() { sel.value = p.regla.tipo; num.value = p.regla.n; num.disabled = !CON_N[p.regla.tipo]; }
  p.sync = sync;
  sel.onchange = function () { p.regla.tipo = sel.value; if (CON_N[sel.value] && !+p.regla.n) p.regla.n = sel.value === "indeciso" ? 8 : sel.value === "pinza" ? 2 : 4; sync(); codigo(); };
  num.oninput = function () { p.regla.n = Math.max(0, Math.min(12, Math.round(+num.value || 0))); codigo(); };
  fila.appendChild(dot); fila.appendChild(nom); fila.appendChild(sel); fila.appendChild(num); $("#reglas").appendChild(fila);
});
// ── Dibujo: lienzo a la resolución real de la pantalla, laberinto de neón pintado una sola vez ──
var DPR = Math.min(2, window.devicePixelRatio || 1), QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
cv.width = 608 * DPR; cv.height = 352 * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0);
var fondoLab = document.createElement("canvas"); fondoLab.width = cv.width; fondoLab.height = cv.height;
(function pintarLaberinto() {
  var g = fondoLab.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.fillStyle = "#F4F1EA"; g.fillRect(0, 0, 608, 352);   // papel, como las láminas de teoría
  // Los pasillos se trazan como una red de líneas gruesas: primero el borde de tinta, encima el piso de papel.
  function red(ancho, color, brillo) {
    g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = ancho; g.strokeStyle = color;
    if (brillo) { g.shadowColor = brillo; g.shadowBlur = 16; }
    g.beginPath();
    for (var f = 0; f < FILAS; f++) for (var c = 0; c < COLS; c++) if (libre(c, f)) {
      var cx = (c + .5) * C, cy = (f + .5) * C;
      g.moveTo(cx, cy); g.lineTo(cx + .01, cy);
      if (libre(c + 1, f)) { g.moveTo(cx, cy); g.lineTo(cx + C, cy); }
      if (libre(c, f + 1)) { g.moveTo(cx, cy); g.lineTo(cx, cy + C); }
    }
    g.stroke(); g.restore();
  }
  red(C * .9, "#16181D");
  red(C * .78, "#FBF8F1");
})();
var puntos = {}, comidos = 0;
function llenarPuntos() { puntos = {}; for (var f = 0; f < FILAS; f++) for (var c = 0; c < COLS; c++) if (libre(c, f) && !(f === 3 && c >= 8 && c <= 11)) puntos[c + "," + f] = 1; }
function ojos(px, py, dir, sep, r, rp, mira) {
  x.fillStyle = "#fff"; x.beginPath(); x.arc(px - sep, py, r, 0, 6.283); x.arc(px + sep, py, r, 0, 6.283); x.fill();
  x.fillStyle = "#1a1530"; x.beginPath(); x.arc(px - sep + DIR[dir][0] * mira, py + DIR[dir][1] * mira, rp, 0, 6.283); x.arc(px + sep + DIR[dir][0] * mira, py + DIR[dir][1] * mira, rp, 0, 6.283); x.fill();
}
function dibuja(fr, frP, t) {
  x.clearRect(0, 0, 608, 352); x.drawImage(fondoLab, 0, 0, 608, 352);
  x.fillStyle = "rgba(22,24,29,.38)"; x.beginPath();
  for (var k in puntos) { var a = k.split(","), px = (+a[0] + .5) * C, py = (+a[1] + .5) * C; x.moveTo(px + 2.3, py); x.arc(px, py, 2.3, 0, 6.283); }
  x.fill();
  function pos(o, k2) { return [((o.pc + (o.c - o.pc) * k2) + .5) * C, ((o.pf + (o.f - o.pf) * k2) + .5) * C]; }
  var pulso = QUIETO ? .5 : (Math.sin(t / 280) + 1) / 2;
  if (verGuias) PERS.forEach(function (p, i) {
    var obj = objetivo(p), pts = camino(p, obj), off = (i - 1.5) * 2.6;
    x.save(); x.strokeStyle = p.linea; x.lineCap = "round"; x.lineJoin = "round";
    x.globalAlpha = .85; x.lineWidth = 2.6; x.setLineDash([2, 6]); x.beginPath();
    pts.forEach(function (q, j) { var px = (q[0] + .5) * C + off, py = (q[1] + .5) * C + off; if (j) x.lineTo(px, py); else x.moveTo(px, py); });
    x.stroke(); x.setLineDash([]);
    var ox = Math.max(.5, Math.min(COLS - .5, obj[0] + .5)) * C, oy = Math.max(.5, Math.min(FILAS - .5, obj[1] + .5)) * C;
    x.globalAlpha = 1; x.lineWidth = 2.6; x.beginPath(); x.arc(ox, oy, 8 + pulso * 3, 0, 6.283); x.stroke();
    x.restore();
  });
  var h = pos(J, frP), salto = QUIETO ? 0 : Math.sin(t / 170) * 1.3;
  // Papel y tinta, como la lámina: colores planos y borde de tinta, sin brillos ni degradados.
  x.lineWidth = 2; x.strokeStyle = "#16181D";
  x.fillStyle = "#9A4F08"; x.beginPath(); x.roundRect(h[0] - 11, h[1] - 11 + salto, 22, 22, 7); x.fill(); x.stroke();
  ojos(h[0], h[1] - 2 + salto, J.dir, 4.3, 3.2, 1.8, 1.4);
  PERS.forEach(function (p, i) {
    var q = pos(p, fr), b = QUIETO ? 0 : Math.sin(t / 230 + i * 1.7) * 1.2;
    x.fillStyle = p.color; x.strokeStyle = "#16181D"; x.lineWidth = 2; x.beginPath(); x.arc(q[0], q[1] + b, 11.5, 0, 6.283); x.fill(); x.stroke();
    ojos(q[0], q[1] - 1.5 + b, p.dir, 4.2, 3.3, 1.8, 1.5);
  });
}
// Segundos por celda (tú, perseguidores). Empieza en «Lento» para poder explicar mientras se juega.
var VEL = { lento: [.5, .6], normal: [.32, .38], rapido: [.2, .24] }, PJ = VEL.lento[0], PP = VEL.lento[1], tJ = 0, tP = 0, antes = performance.now();
llenarPuntos(); reiniciar(); codigo(); PERS.forEach(function (p) { p.sync(); }); marcador("Pulsa una flecha para empezar");
(function bucle(t) {
  requestAnimationFrame(bucle);
  var dt = Math.min(.05, (t - antes) / 1000); antes = t;
  if (corriendo) {
    tJ += dt; tP += dt;
    while (tJ >= PJ) { tJ -= PJ; pasoJugador(); revisarCaptura(t); }
    while (corriendo && tP >= PP) { tP -= PP; pasoPerseguidores(); revisarCaptura(t); }
    if (corriendo) { var s = (t - vivoDesde) / 1000; if (s >= 20 && original() && modo === "perseguir") reto(1); if (Math.floor(s * 4) !== Math.floor((s - dt) * 4)) marcador("Sigues vivo: " + s.toFixed(1) + " s"); }
  }
  dibuja(corriendo ? tP / PP : 1, corriendo ? tJ / PJ : 1, t);
})(antes);
function mover(d) { quiere = d; if (!corriendo) { corriendo = true; vivoDesde = performance.now(); tJ = tP = 0; } }
var TEC = { ArrowUp: "u", w: "u", ArrowLeft: "l", a: "l", ArrowDown: "d", s: "d", ArrowRight: "r", d: "r" };
addEventListener("keydown", function (e) { var k = TEC[e.key]; if (k && document.activeElement && !/^(SELECT|INPUT)$/.test(document.activeElement.tagName)) { e.preventDefault(); mover(k); } });
$$("[data-d]").forEach(function (b) { b.addEventListener("pointerdown", function (e) { e.preventDefault(); mover(b.dataset.d); }); });
$("#modo").onclick = function () { modo = modo === "perseguir" ? "dispersarse" : "perseguir"; this.textContent = "Modo: " + modo; this.setAttribute("aria-pressed", String(modo === "dispersarse")); if (modo === "dispersarse") reto(2); };
$("#ver").onclick = function () { verGuias = !verGuias; this.setAttribute("aria-pressed", String(verGuias)); };
$("#reset").onclick = function () { llenarPuntos(); comidos = 0; reiniciar(); marcador("Pulsa una flecha para empezar"); };
$("#orig").onclick = function () { PERS.forEach(function (p) { p.regla = { tipo: p.orig.tipo, n: p.orig.n }; p.sync(); }); codigo(); };
$("#llevar").onclick = function () {
  var p = PERS[+$("#cual").value], r = { tipo: p.regla.tipo, n: +p.regla.n || 0 }, nombre = TIPOS.filter(function (t) { return t[0] === r.tipo; })[0][1].replace("N", r.n);
  $("#llevado").textContent = llevarAMiJuego({ rival: r }) ? "✓ Tus rivales usarán la regla del " + p.nombre + ": «" + nombre + "». Juégala en «Elige tu juego» → Laberinto, y va en tu ZIP." : "No se pudo guardar en este navegador.";
};
cv.addEventListener("pointerdown", function () { cv.focus(); });
$$("[data-vel]").forEach(function (b) { b.onclick = function () { PJ = VEL[b.dataset.vel][0]; PP = VEL[b.dataset.vel][1]; tJ = tP = 0; $$("[data-vel]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); }); }; });""",
       css="""#lab { width: 100%; height: auto; aspect-ratio: 19 / 11; display: block; margin: .5em 0; border-radius: .5em; background: #F4F1EA; border: 1px solid rgba(22,24,29,.3); box-shadow: 0 6px 18px rgba(22,24,29,.12); touch-action: none; }
.pm-intro { font-size: .84em; margin: .35em 0 .45em; }
.pm-p { display: inline-block; width: .8em; height: .8em; border-radius: 50%; margin-right: .5em; flex: none; vertical-align: -.08em; border: 2px solid #16181D; }
.pm-fila { display: grid; grid-template-columns: 1em 4.6em 1fr 3.6em; gap: .45em; align-items: center; font-size: .8em; margin: .3em 0; }
.pm-fila select, .pm-fila input { font: inherit; color: var(--fg); background: var(--s1); border: 1px solid var(--line2); border-radius: .5em; padding: .3em .4em; min-width: 0; }
.pm-fila input:disabled { opacity: .35; }
.pm-cual { font: inherit; font-size: .8em; color: var(--fg); background: var(--s1); border: 1px solid var(--line2); border-radius: .5em; padding: .3em .4em; }""",
       comentario="Interacción: laberinto propio en lienzo con 4 perseguidores. Cada uno elige en cada celda la salida (sin media vuelta) más cercana a su objetivo, como en Pac-Man (1980). El alumno cambia la regla de cada uno y ve su objetivo, su camino y el código.")

# ---------------------------------------------------------------- 05 · hoja de sprites
ANIMS = [("quieto", 6, 6), ("caminar", 8, 12), ("correr", 8, 16), ("saltar", 8, 10), ("golpe", 6, 14), ("dano", 4, 10), ("morir", 8, 10), ("celebrar", 8, 12), ("agachado", 4, 6)]
escena("05-spritesheet", "Animación: la hoja de sprites", "conceptualizacion", "demo", 10, """
    <h1 class="esc-titulo a-in">Animación: <em>muchos dibujos, muy rápido</em></h1>
    <div class="x-dos">
      <section class="esc-card a-in" style="--d:.15s"><span class="x-et">heroe.png · UNA imagen de 512 × 576 con 72 cuadros de 64 px · toca un cuadro</span>
        <canvas id="hoja" width="512" height="576" aria-label="Hoja de sprites completa con el cuadro actual resaltado"></canvas></section>
      <div class="x-col">
        <section class="esc-card a-in" style="--d:.25s"><span class="x-et">Lo que ve el jugador</span>
          <div class="x-fila" style="align-items:flex-start;flex-wrap:nowrap"><canvas id="vista" width="192" height="192" aria-label="Animación en marcha"></canvas>
            <div class="x-col" style="flex:1"><div class="x-fila" id="anims" role="radiogroup" aria-label="Animación"></div>
              <label class="x-campo">Velocidad<input id="fps" type="range" min="1" max="24" step="1" value="12"><output id="ofps"></output></label>
              <div class="x-fila"><button class="x-btn" id="pausa" type="button" aria-pressed="false">Pausa</button><button class="x-btn" id="sig" type="button">Cuadro siguiente</button></div></div></div>
        </section>
        <section class="esc-card a-in" style="--d:.35s"><span class="x-et">El atlas (heroe.json) dice dónde está cada cuadro</span><pre class="x-cod" id="atlas"></pre></section>
        <section class="esc-card x-regla a-in" style="--d:.45s"><strong>Con 1 cuadro por segundo es un pase de diapositivas. Con 12, camina.</strong><p>Baja la velocidad a 1 y súbela de a pocos: ¿desde qué número lo ves moverse de verdad?</p></section>
      </div>
    </div>""",
       "Pulsa «Lo logré» cuando hayas probado tres animaciones y encontrado desde qué velocidad se ve fluido",
       js="var ANIMS = " + repr([list(a) for a in ANIMS]).replace("'", '"') + """;
var img = new Image(), hoja = $("#hoja").getContext("2d"), vista = $("#vista").getContext("2d"), fila = 1, cuadro = 0, pausa = false, acum = 0, antes = performance.now(), probadas = {};
vista.imageSmoothingEnabled = false;
function pinta() {
  var e = getComputedStyle(document.documentElement), acento = e.getPropertyValue("--accent").trim(), linea = e.getPropertyValue("--line2").trim();
  hoja.clearRect(0, 0, 512, 576); hoja.drawImage(img, 0, 0);
  hoja.strokeStyle = linea; hoja.lineWidth = 1; for (var i = 0; i <= 8; i++) { hoja.beginPath(); hoja.moveTo(i * 64 + .5, 0); hoja.lineTo(i * 64 + .5, 576); hoja.stroke(); } for (var j = 0; j <= 9; j++) { hoja.beginPath(); hoja.moveTo(0, j * 64 + .5); hoja.lineTo(512, j * 64 + .5); hoja.stroke(); }
  hoja.fillStyle = acento; hoja.globalAlpha = .12; hoja.fillRect(0, fila * 64, ANIMS[fila][1] * 64, 64); hoja.globalAlpha = 1;
  hoja.strokeStyle = acento; hoja.lineWidth = 4; hoja.strokeRect(cuadro * 64 + 2, fila * 64 + 2, 60, 60);
  vista.clearRect(0, 0, 192, 192); vista.drawImage(img, cuadro * 64, fila * 64, 64, 64, 0, 0, 192, 192);
  $("#atlas").textContent = '"' + ANIMS[fila][0] + "_" + cuadro + '": { "x": ' + cuadro * 64 + ', "y": ' + fila * 64 + ', "w": 64, "h": 64 }\\n\\n// y así se crea la animación en Phaser:\\nanims.create({ key: "' + ANIMS[fila][0] + '", frames: [' + ANIMS[fila][1] + ' cuadros], frameRate: ' + $("#fps").value + " })";
  $("#ofps").textContent = $("#fps").value + " fps";
}
function elegir(i) { fila = i; cuadro = 0; probadas[i] = 1; $("#fps").value = ANIMS[i][2]; $$("#anims .x-btn").forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); }); pinta(); }
ANIMS.forEach(function (a, i) { var b = el("button", "x-btn", a[0] === "dano" ? "daño" : a[0]); b.type = "button"; b.setAttribute("role", "radio"); b.onclick = function () { elegir(i); }; $("#anims").appendChild(b); });
$("#fps").oninput = pinta; $("#pausa").onclick = function () { pausa = !pausa; this.setAttribute("aria-pressed", String(pausa)); };
$("#sig").onclick = function () { pausa = true; $("#pausa").setAttribute("aria-pressed", "true"); cuadro = (cuadro + 1) % ANIMS[fila][1]; pinta(); };
$("#hoja").addEventListener("pointerdown", function (e) { var r = this.getBoundingClientRect(), c = Math.floor((e.clientX - r.left) / r.width * 8), f = Math.floor((e.clientY - r.top) / r.height * 9); if (f >= 0 && f < 9) { if (f !== fila) elegir(f); cuadro = Math.min(c, ANIMS[f][1] - 1); pausa = true; $("#pausa").setAttribute("aria-pressed", "true"); pinta(); } });
img.onload = function () { elegir(1); (function bucle(t) { requestAnimationFrame(bucle); var dt = (t - antes) / 1000; antes = t; if (pausa) return; acum += dt * +$("#fps").value; if (acum >= 1) { cuadro = (cuadro + Math.floor(acum)) % ANIMS[fila][1]; acum %= 1; pinta(); } })(antes); };
img.src = "heroe.png";""",
       css="#hoja { width: auto; height: auto; max-width: 100%; max-height: 62vh; display: block; margin: .5em auto 0; border-radius: .6em; background: repeating-conic-gradient(var(--s2) 0% 25%, var(--s3) 0% 50%) 0 0 / 24px 24px; cursor: pointer; aspect-ratio: 512 / 576; }\n#vista { width: 9em; height: 9em; flex: none; border-radius: .8em; background: var(--s2); border: 1px solid var(--line2); image-rendering: pixelated; }\n#anims .x-btn { font-size: .66em; padding: .5em .8em; }",
       comentario="Interacción: hoja de sprites real (heroe.png, hermana de esta escena, sacada de Forja). Se elige animación, velocidad y cuadro; el atlas se actualiza.")

# ---------------------------------------------------------------- 06 · elige tu juego
escena("06-elige-tu-juego", "Tu juego: con tus números y tu regla", "experimentacion", "construir", 15,
       MARCO.format(src="/forja/?clase=rsg-01&abrir=juegos", pasos="<li>Lee <b>«De tu clase»</b>: tus números y tu regla</li><li><b>Plataformas</b> salta con tus números · en <b>Laberinto</b> los rivales usan tu regla</li><li>Pulsa <b>V</b>: rayos X, ves su objetivo y su ruta</li><li><b>Descargar este juego (ZIP)</b>: tu entregable</li>"),
       "Pulsa «Lo logré» cuando hayas jugado TU juego (con tus números o tu regla) y tengas el ZIP descargado",
       css=".esc-cuerpo { gap: 1vh; } .esc { padding-top: 1.2vh; padding-bottom: 1.2vh; gap: 1vh; }",
       comentario="Incrusta Forja abriendo directo las plantillas de juego (?abrir=juegos). El juego corre con Phaser 4 dentro del estudio.")

# ---------------------------------------------------------------- 07 · cierre
escena("07-cierre", "Cierre: tu héroe ya se mueve", "reflexion", "cierre", 5, """
    <div class="x-fila"><h1 class="esc-titulo a-in">Hoy tu héroe <em>ya se mueve</em></h1><span class="esc-chip ok a-in" id="cuenta" aria-live="polite">0 de 4</span></div>
    <div class="x-tres">
      <section class="esc-card a-in" style="--d:.15s"><h2>¿Qué puedes hacer ahora?</h2><div class="x-col" id="logros" role="group" aria-label="Lo que ya sabes hacer"></div></section>
      <section class="esc-card a-in" style="--d:.3s"><h2>Para la próxima clase</h2><ul class="esc-lista" style="font-size:.86em"><li>Guarda a tu héroe con el corazón</li><li>Crea 2 rivales y márcalos con ★: ese es tu elenco</li><li>Juega el Laberinto con rayos X (tecla V) y cuenta cuántas celdas visita el rival</li><li>Abre juego.js de tu ZIP y cambia un número</li></ul></section>
      <section class="esc-card x-regla a-in" style="--d:.45s"><span class="x-et">Clase 2 · jueves 26 de noviembre · 9:15 pm</span><strong>Rivales que piensan</strong><p>Tu rival dejará de ir y venir: te buscará por el camino más corto, cambiará de estado y sumarás puntos.</p></section>
    </div>
    <section class="esc-card a-in" style="--d:.6s"><span class="x-et">La regla del taller</span><p style="font-size:1em;color:var(--fg)"><b>Tú describes la mecánica. La IA elige la tecnología.</b> La galería de la sala <b>rsg-01</b> sigue abierta en jmd-learn.online/forja: vota por tus favoritos.</p></section>""",
       "Pulsa «Lo logré» cuando hayas marcado lo que ya sabes hacer",
       js="""var n = 0;
[["Pedirle a la IA una mecánica con un buen prompt", "mecánica + contexto + límite + prueba"], ["Mover a mi héroe con gravedad y hacerlo chocar con el nivel", "velocidad, salto y cuerpos sólidos"], ["Darle a mi rival una regla y llevarla a mi juego", "objetivo + camino más corto (BFS)"], ["Animar a mi héroe con su hoja de sprites", "cuadros, atlas y velocidad"]].forEach(function (t) {
  var b = el("button", "x-it"); b.type = "button"; b.setAttribute("role", "checkbox"); b.setAttribute("aria-checked", "false"); b.appendChild(el("i", null, "✓")); var s = el("span", null, t[0]); s.appendChild(el("small", null, t[1])); b.appendChild(s);
  b.onclick = function () { var v = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", String(v)); n += v ? 1 : -1; $("#cuenta").textContent = n + " de 4"; }; $("#logros").appendChild(b);
});""",
       compuerta="ninguna", comentario="Interacción: autoevaluación de los tres objetivos de la clase. Nada se guarda.")
