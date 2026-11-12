#!/usr/bin/env python3
"""Genera las escenas LIVE de la Clase 1 de Ready Set Go (rsg-01): python3 _fuente/rsg01.py

Secuencia (81 min de 90): 00 bienvenida · 01 carrera (Isla Gomita, hecha a mano) · 02 Forja: tu héroe · 03 de la mecánica
a la tecnología · 04 movimiento y choques · 05 hoja de sprites · 06 elige tu juego · 07 cierre.
Las escenas 01 y 05/heroe.png no se generan aquí. Reglas del modo LIVE: sin recursos externos, menos de 300 elementos
y 1 MB, animación solo CSS, todo se apaga con prefers-reduced-motion. Nada usa <form>: el marco no lo permite.
"""
import pathlib

AQUI = pathlib.Path(__file__).resolve().parent.parent / "live" / "rsg-01"

CIELO = """<svg class="esc-cielo" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <path class="t" pathLength="1" d="M1180 92 L1252 130 L1318 104 L1384 168 L1440 146"/><path class="tb" pathLength="1" d="M92 640 L168 588 L236 626 L296 552"/>
  <g><circle class="e" cx="1180" cy="92" r="4"/><circle class="eo" cx="1252" cy="130" r="5"/><circle class="e" cx="1318" cy="104" r="3.5"/><circle class="eg" cx="1384" cy="168" r="4"/><circle class="e" cx="1440" cy="146" r="3"/><circle class="e" cx="92" cy="640" r="3.5"/><circle class="eg" cx="168" cy="588" r="4.5"/><circle class="e" cx="236" cy="626" r="3"/><circle class="eo" cx="296" cy="552" r="5"/></g>
</svg>"""

AYUDAS = """(function () { try { var t = new URLSearchParams(location.search).get("tema"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t); } catch (e) {} })();
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }"""

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
        f'id: {id_}\ntitulo: "{titulo}"\nfase: {fase}\npaso: {paso}\nduracion_min: {minutos}\nlo_logre: {logro}\nevidencia: ninguna\n'
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
  ["Tu héroe", "15 min", "En Forja describes a tu héroe con una frase, lo afinas y lo publicas en la galería de la clase."],
  ["Mecánica → tecnología", "10 min", "Cada cosa que quieres que pase tiene una tecnología que la resuelve. Aprendes a pedirla con un buen prompt."],
  ["Movimiento y choques", "15 min", "Gravedad, salto y paredes: mueves los números y ves qué cambia. Construyes tu primer nivel con clics."],
  ["Animación", "10 min", "Tu héroe camina porque pasan muchos dibujos muy rápido. Abres una hoja de sprites y la controlas."],
  ["Tu juego", "15 min", "Eliges fútbol o plataformas, lo juegas con tu héroe, miras sus algoritmos con rayos X y te lo llevas."],
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
       css=".x-mapa { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .5em; margin: .5em 0; } .x-mapa .x-it { grid-template-columns: 1fr; justify-items: start; gap: .3em; font-size: .8em; }\n@media (max-width: 900px) { .x-mapa { grid-template-columns: repeat(2, 1fr); } }",
       compuerta="presentes", umbral=100, comentario="Interacción: tocar un paso del mapa muestra qué se hace; lista previa con casillas. Nada se guarda.")

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
          <button class="x-btn" id="caja" type="button" aria-pressed="false">Ver caja de choque</button><button class="x-btn" id="reinicio" type="button">Reiniciar nivel</button></div>
      </section>
      <div class="x-col">
        <section class="esc-card a-in" style="--d:.25s"><span class="x-et">Tres números mandan</span>
          <label class="x-campo">Gravedad<input id="g" type="range" min="0" max="2600" step="50" value="1700"><output id="og"></output></label>
          <label class="x-campo">Salto<input id="s" type="range" min="200" max="1100" step="10" value="700"><output id="os"></output></label>
          <label class="x-campo">Velocidad<input id="v" type="range" min="60" max="420" step="10" value="220"><output id="ov"></output></label>
          <p class="x-det" id="lee" aria-live="polite" style="font-size:.84em;min-height:3.2em"></p>
        </section>
        <section class="esc-card a-in" style="--d:.35s"><span class="x-et">Así está escrito en tu juego (juego.js)</span>
<pre class="x-cod"><span class="c">// la gravedad tira hacia abajo en cada cuadro; saltar es una velocidad hacia arriba</span>
h.setVelocityX(direccion * <span class="k">F.velocidad</span>);
if (salto &amp;&amp; enElPiso) h.setVelocityY(-<span class="k">F.salto</span>);
<span class="c">// y el nivel es una lista: cada celda sólida es un cuerpo que no deja pasar</span>
this.physics.add.collider(heroe, suelo);</pre></section>
        <section class="esc-card a-in" style="--d:.45s"><span class="x-et">Retos</span><div class="x-col" id="retos" role="group" aria-label="Retos" style="margin-top:.4em"></div></section>
      </div>
    </div>""",
       "Pulsa «Lo logré» cuando hayas completado los tres retos",
       js=r"""var C = 40, COLS = 16, FILAS = 9, cv = $("#sim"), x = cv.getContext("2d"), K = {}, verCaja = false;
var BASE = ["................", "................", "................", "..........###...", "................", "......###.......", "................", "..##............", "################"];
var mapa, H;
function reiniciar() { mapa = BASE.map(function (f) { return f.split("").map(function (c) { return c === "#" ? 1 : 0; }); }); H = { x: 60, y: 200, vx: 0, vy: 0, w: 24, h: 32, piso: false, max: 0 }; }
function solido(px, py) { var c = Math.floor(px / C), f = Math.floor(py / C); if (c < 0 || c >= COLS) return true; if (f < 0) return false; if (f >= FILAS) return true; return mapa[f][c] === 1; }
function choca(nx, ny) { return solido(nx - H.w / 2, ny - H.h) || solido(nx + H.w / 2 - 1, ny - H.h) || solido(nx - H.w / 2, ny - 1) || solido(nx + H.w / 2 - 1, ny - 1) || solido(nx - H.w / 2, ny - H.h / 2) || solido(nx + H.w / 2 - 1, ny - H.h / 2); }
reiniciar();
var G = $("#g"), S = $("#s"), V = $("#v"), antes = performance.now(), cumplidos = {};
function leer() {
  var g = +G.value, s = +S.value, alto = g > 0 ? s * s / (2 * g) : Infinity;
  $("#og").textContent = g; $("#os").textContent = s; $("#ov").textContent = V.value;
  $("#lee").innerHTML = g > 0 ? "Altura del salto = salto² ÷ (2 × gravedad) = <b>" + Math.round(alto) + " px</b>, o sea <b>" + (alto / C).toFixed(1) + " celdas</b>." : "<b>Gravedad 0:</b> nada lo baja. Salta y mira cómo se va para siempre.";
  if (g > 0 && alto < 2 * C) reto(0); if (g === 0) reto(2);
}
function reto(i) { if (cumplidos[i]) return; cumplidos[i] = 1; var b = $$("#retos .x-it")[i]; if (b) b.setAttribute("aria-checked", "true"); }
["Baja el salto hasta que ya no alcance 2 celdas de alto", "Construye una escalera de 3 escalones y súbela", "Pon la gravedad en 0 y salta: ¿qué pasa?"].forEach(function (t) { var b = el("div", "x-it"); b.setAttribute("role", "checkbox"); b.setAttribute("aria-checked", "false"); b.appendChild(el("i", null, "✓")); b.appendChild(el("span", null, t)); $("#retos").appendChild(b); });
function paso(dt) {
  var dir = (K.der ? 1 : 0) - (K.izq ? 1 : 0); H.vx = dir * +V.value;
  if (K.salto && H.piso) { H.vy = -S.value; H.piso = false; }
  H.vy += +G.value * dt;
  var nx = H.x + H.vx * dt; if (!choca(nx, H.y)) H.x = nx;
  var ny = H.y + H.vy * dt;
  if (!choca(H.x, ny)) { H.y = ny; H.piso = false; } else { if (H.vy > 0) { H.y = Math.floor((ny - 1) / C) * C; H.piso = true; } H.vy = 0; }
  if (H.y < -400 || H.y > 600) { H.x = 60; H.y = 200; H.vy = 0; }
  if (H.piso && H.y <= (FILAS - 4) * C) reto(1);
}
function dibuja() {
  var e = getComputedStyle(document.documentElement), acento = e.getPropertyValue("--accent").trim(), linea = e.getPropertyValue("--line2").trim();
  x.clearRect(0, 0, 640, 360);
  for (var f = 0; f < FILAS; f++) for (var c = 0; c < COLS; c++) { if (mapa[f][c]) { x.fillStyle = acento; x.globalAlpha = .85; x.fillRect(c * C + 1, f * C + 1, C - 2, C - 2); x.globalAlpha = 1; } else { x.strokeStyle = linea; x.lineWidth = 1; x.strokeRect(c * C + .5, f * C + .5, C, C); } }
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
$("#reinicio").onclick = reiniciar; [G, S, V].forEach(function (i) { i.oninput = leer; });
leer();""",
       css="#sim { width: 100%; height: auto; aspect-ratio: 16 / 9; display: block; margin: .5em 0; border-radius: .7em; background: var(--s2); border: 1px solid var(--line2); cursor: crosshair; touch-action: none; }",
       comentario="Interacción: simulador propio en lienzo (gravedad, salto, velocidad y choque con celdas). Clic pone o quita muros. Tres retos que se marcan solos.")

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
escena("06-elige-tu-juego", "Elige tu juego: fútbol o plataformas", "experimentacion", "construir", 15,
       MARCO.format(src="/forja/?clase=rsg-01&abrir=juegos", pasos="<li>Elige <b>Plataformas</b> o <b>Fútbol</b> y juega con tu héroe</li><li>Pulsa <b>V</b>: rayos X</li><li>Abre un <b>algoritmo</b> y lee su código</li><li><b>Descargar este juego (ZIP)</b></li>"),
       "Pulsa «Lo logré» cuando tu héroe se mueva en tu juego y tengas el ZIP descargado",
       css=".esc-cuerpo { gap: 1vh; } .esc { padding-top: 1.2vh; padding-bottom: 1.2vh; gap: 1vh; }",
       comentario="Incrusta Forja abriendo directo las plantillas de juego (?abrir=juegos). El juego corre con Phaser 4 dentro del estudio.")

# ---------------------------------------------------------------- 07 · cierre
escena("07-cierre", "Cierre: tu héroe ya se mueve", "reflexion", "cierre", 5, """
    <div class="x-fila"><h1 class="esc-titulo a-in">Hoy tu héroe <em>ya se mueve</em></h1><span class="esc-chip ok a-in" id="cuenta" aria-live="polite">0 de 3</span></div>
    <div class="x-tres">
      <section class="esc-card a-in" style="--d:.15s"><h2>¿Qué puedes hacer ahora?</h2><div class="x-col" id="logros" role="group" aria-label="Lo que ya sabes hacer"></div></section>
      <section class="esc-card a-in" style="--d:.3s"><h2>Para la próxima clase</h2><ul class="esc-lista" style="font-size:.86em"><li>Guarda a tu héroe con el corazón</li><li>Crea 2 rivales y márcalos con ★: ese es tu elenco</li><li>Juega el Laberinto con rayos X (tecla V) y cuenta cuántas celdas visita el rival</li><li>Abre juego.js de tu ZIP y cambia un número</li></ul></section>
      <section class="esc-card x-regla a-in" style="--d:.45s"><span class="x-et">Clase 2 · jueves 26 de noviembre · 9:15 pm</span><strong>Rivales que piensan</strong><p>Tu rival dejará de ir y venir: te buscará por el camino más corto, cambiará de estado y sumarás puntos.</p></section>
    </div>
    <section class="esc-card a-in" style="--d:.6s"><span class="x-et">La regla del taller</span><p style="font-size:1em;color:var(--fg)"><b>Tú describes la mecánica. La IA elige la tecnología.</b> La galería de la sala <b>rsg-01</b> sigue abierta en jmd-learn.online/forja: vota por tus favoritos.</p></section>""",
       "Pulsa «Lo logré» cuando hayas marcado lo que ya sabes hacer",
       js="""var n = 0;
[["Pedirle a la IA una mecánica con un buen prompt", "mecánica + contexto + límite + prueba"], ["Mover a mi héroe con gravedad y hacerlo chocar con el nivel", "velocidad, salto y cuerpos sólidos"], ["Animar a mi héroe con su hoja de sprites", "cuadros, atlas y velocidad"]].forEach(function (t) {
  var b = el("button", "x-it"); b.type = "button"; b.setAttribute("role", "checkbox"); b.setAttribute("aria-checked", "false"); b.appendChild(el("i", null, "✓")); var s = el("span", null, t[0]); s.appendChild(el("small", null, t[1])); b.appendChild(s);
  b.onclick = function () { var v = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", String(v)); n += v ? 1 : -1; $("#cuenta").textContent = n + " de 3"; }; $("#logros").appendChild(b);
});""",
       compuerta="ninguna", comentario="Interacción: autoevaluación de los tres objetivos de la clase. Nada se guarda.")
