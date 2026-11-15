#!/usr/bin/env python3
"""Sesión 1 del taller «¿Difícil de explicar? ¡No!» (grupos del domingo): FLUX, imagen base, fps, p5, Three.js,
GSAP y HyperFrames, con Willie (1928) solo como referencia. Escribe las escenas LIVE de dm-01 y dt-01 y copia los
archivos comunes (vivo.js, vivo.css, three, gsap, base-ejemplo.webp) al curso de la tarde.

Uso: python3 _fuente/sesion1.py   (desde la carpeta del curso de la mañana)
"""
import json, shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent.parent            # dificil-de-explicar-domingo-manana
CURSOS = {"dm-01": AQUI, "dt-01": AQUI.parent / "dificil-de-explicar-domingo-tarde"}
HORA = {"dm-01": "domingo 15 de noviembre, 10:00 a. m.", "dt-01": "domingo 15 de noviembre, 5:30 p. m."}
COMUNES = ["vivo.js", "vivo.css", "three.module.min.js", "gsap.min.js", "base-ejemplo.webp"] + [f"capa-{n}.svg" for n in
           ("1-cielo", "2-sol", "3-nubes", "4-montanas", "5-colinas", "6-mar", "7-barco", "8-olas", "9-gaviotas")]

ESCENAS = []


def escena(carpeta, yaml, titulo, fase, ph, num, cuerpo, css="", js="", vivo=False, pie="", libs=()):
    ESCENAS.append(dict(carpeta=carpeta, yaml=yaml, titulo=titulo, fase=fase, ph=ph, num=num, cuerpo=cuerpo, css=css, js=js, vivo=vivo, pie=pie, libs=libs))


def J(x):
    """JSON seguro dentro de <script>: «</» no puede cerrar la etiqueta."""
    return json.dumps(x, ensure_ascii=False).replace("</", "<\\/")


def html(e, leccion):
    vivo_css = '<link rel="stylesheet" href="../../comun/vivo.css">\n' if e["vivo"] else ""
    vivo_js = "".join(f'<script src="../../comun/{l}"></script>\n' for l in e["libs"])
    vivo_js += '<script src="../../comun/vivo.js"></script>\n' if e["vivo"] else ""
    cuerpo = e["cuerpo"].replace("{HORA}", HORA[leccion])
    js = e["js"].replace("{LECCION}", leccion)
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e['titulo']} · Taller S1</title>
<!-- Escena generada por _fuente/sesion1.py: edita ahí y vuelve a correrlo. -->
<link rel="stylesheet" href="../../comun/escena.css">
{vivo_css}<style id="esc-propio">
.nota {{ font-size: .7em; color: var(--muted); margin: 0; }}
.nota b {{ color: var(--fg); }}
{e['css']}
</style>
</head>
<body>
<div class="esc">
  <header class="esc-cab">
    <span class="esc-fase" data-ph="{e['ph']}">{e['fase']}</span>
    <span class="esc-num">Taller · S1 · {e['num']}</span>
  </header>
  <main class="esc-cuerpo">
{cuerpo}
  </main>
  <footer class="esc-pie">{e['pie']}</footer>
</div>
{vivo_js}<script>
{js}
</script>
</body>
</html>
"""


def yaml_texto(carpeta, d):
    out = [f"id: {carpeta}"]
    for k, v in d.items():
        if k == "comandos":
            out.append("comandos:")
            for c in v:
                out.append("  - { titulo: " + json.dumps(c[0], ensure_ascii=False) + ", cmd: " + json.dumps(c[1], ensure_ascii=False) + " }")
        elif isinstance(v, bool):
            out.append(f"{k}: {'true' if v else 'false'}")
        elif isinstance(v, int):
            out.append(f"{k}: {v}")
        else:
            out.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
    out.append("oculta: false")
    return "\n".join(out) + "\n"


def Y(titulo, fase, paso, minutos, logre=False, umbral=70, comandos=None):
    d = {"titulo": titulo, "fase": fase, "paso": paso, "duracion_min": minutos}
    if logre:
        d.update({"lo_logre": True, "evidencia": "captura", "umbral_pct": umbral, "compuerta": "lo_logre"})
    else:
        d.update({"lo_logre": False, "evidencia": "ninguna", "compuerta": "ninguna"})
    if comandos:
        d["comandos"] = comandos
    return d


# ════════════════════════════════════════ 01 · Bienvenida ════════════════════════════════════════
escena("01-bienvenida", Y("Bienvenida · ¿Difícil de explicar? ¡No!", "experiencia", "ver", 4),
       "Bienvenida", "Experiencia", "ec", "E01", """
    <h1 class="esc-titulo a-in">¿Difícil de explicar? <em>¡No!</em></h1>
    <p class="esc-sub a-in" style="--d:.1s">Sesión 1 · Imágenes con FLUX y animación en código · {HORA}</p>
    <ol class="mapa a-in" style="--d:.2s">
      <li><b>FLUX</b><span>qué es y cómo pasa del ruido a la imagen</span></li>
      <li><b>Imagen base</b><span>una sola, la eliges y ya no se regenera</span></li>
      <li><b>fps</b><span>cuántas imágenes por segundo ves</span></li>
      <li><b>p5.js</b><span>dibuja y anima tu imagen base</span></li>
      <li><b>Three.js</b><span>tu imagen en 3D</span></li>
      <li><b>GSAP</b><span>animación con línea de tiempo</span></li>
      <li><b>HyperFrames</b><span>de HTML a video MP4</span></li>
      <li><b>Tu pieza</b><span>el pedido a tu agente, en seis partes</span></li>
    </ol>
    <p class="nota a-in" style="--d:.3s">Todo corre aquí mismo, en el modo LIVE: editas el código, pulsas <b>Ejecutar</b> y lo ves. Willie (1928) queda como referencia al final.</p>""",
       css="""
.mapa { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .7em; counter-reset: m; }
.mapa li { counter-increment: m; background: var(--s1); border: 1px solid var(--line); border-radius: 1em; padding: .7em .9em; box-shadow: var(--card-shadow); display: grid; gap: .2em; }
.mapa li::before { content: counter(m); font: 800 .7em var(--mono); color: var(--accent); }
.mapa b { font-size: .95em; } .mapa span { font-size: .7em; color: var(--muted); }
@media (max-width: 900px) { .mapa { grid-template-columns: 1fr 1fr; } }""",
       pie="Ten abierta tu carpeta en VS Code y tu agente listo")

# ════════════════════════════════════════ 02 · Qué es FLUX ════════════════════════════════════════
escena("02-que-es-flux", Y("Qué son los modelos FLUX", "conceptualizacion", "", 8),
       "Qué son los modelos FLUX", "Conceptualización", "ca", "E02", """
    <h1 class="esc-titulo a-in">FLUX: del <em>ruido</em> a la imagen, en pocos pasos</h1>
    <section class="fx">
      <div class="esc-card a-in" style="--d:.1s">
        <canvas id="lienzo" width="768" height="432" aria-label="Del ruido a la imagen, paso a paso"></canvas>
        <div class="ve-fila"><span class="nota">pasos:</span><span id="pasos" class="chips"></span>
          <button type="button" id="ver" class="boton">▶ Ver los pasos</button><span class="nota" id="contador"></span></div>
        <div id="tira" class="tira"></div>
        <p class="nota">Ilustración de la idea. El modelo no pinta píxel por píxel: parte de <b>ruido</b> y en cada <b>paso</b> lo ordena un poco hacia lo que dice tu texto. FLUX hace ese trabajo en un espacio comprimido (latente) y al final lo convierte en píxeles.</p>
      </div>
      <div class="lado a-in" style="--d:.2s">
        <div class="esc-card"><h3>Quién lo hace</h3><p><b>Black Forest Labs</b> (Alemania), fundada por investigadores que crearon Stable Diffusion. FLUX.1 salió en agosto de 2024; FLUX.2, en noviembre de 2025.</p></div>
        <table class="familia">
          <tr class="aqui"><th>FLUX.1 [schnell]</th><td>«schnell» = rápido: 1 a 4 pasos. Licencia Apache 2.0 (sirve hasta para trabajos comerciales). <b>★ El de la clase</b></td></tr>
          <tr><th>FLUX.1 [dev]</th><td>Más pasos (unos 28 a 50), más detalle. Pesos abiertos, uso no comercial.</td></tr>
          <tr><th>[pro] · FLUX.2 [pro, flex, max]</th><td>La mejor calidad. Solo por API, de pago.</td></tr>
          <tr><th>Kontext</th><td>Edita una imagen que tú le das: «cambia el sombrero a rojo».</td></tr>
          <tr><th>FLUX.2 [klein] 4B</th><td>Pequeño y rápido (2026). Apache 2.0.</td></tr>
        </table>
        <div class="esc-card"><h3>Lo que tú controlas</h3><p><b>Texto</b> (el prompt) · <b>orientación</b> (horizontal, cuadrado, vertical) · <b>pasos</b> · <b>semilla</b>: el ruido de partida. Misma semilla + mismo texto = misma imagen.</p></div>
        <div class="esc-card"><h3>En el LMS</h3><p>FLUX.1 [schnell] en Cloudflare Workers AI (capa gratuita), a 2 pasos: unos 10 s por imagen y un cupo diario por persona.</p></div>
      </div>
    </section>""",
       css="""
.fx { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 1.2vw; align-items: start; }
.fx canvas { width: 100%; height: auto; display: block; border-radius: .7em; background: #101018; }
.ve-fila { display: flex; flex-wrap: wrap; gap: .4em; align-items: center; margin: .5em 0 .3em; }
.chips { display: inline-flex; gap: .3em; flex-wrap: wrap; }
.chips button, .boton { font: 600 .68em/1 system-ui, sans-serif; padding: .5em .8em; border-radius: 99px; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); cursor: pointer; }
.chips button[aria-pressed="true"], .boton { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.tira { display: flex; gap: .3em; overflow: hidden; margin-bottom: .4em; }
.tira canvas { width: 11%; flex: none; border-radius: .3em; outline: 2px solid transparent; }
.tira canvas.ya { outline-color: var(--accent); }
.lado { display: grid; gap: .55em; }
.lado .esc-card { padding: .6em .85em; } .lado .esc-card h3 { font-size: .8em; } .lado .esc-card p { font-size: .7em; }
.familia { width: 100%; border-collapse: separate; border-spacing: 0 .25em; font-size: .66em; }
.familia th { text-align: left; white-space: nowrap; padding: .35em .6em; background: var(--s2); border-radius: .5em 0 0 .5em; vertical-align: top; }
.familia td { padding: .35em .6em; background: var(--s1); border-radius: 0 .5em .5em 0; color: var(--muted); }
.familia tr.aqui th, .familia tr.aqui td { background: var(--accent-bg); color: var(--fg); }
@media (max-width: 900px) { .fx { grid-template-columns: 1fr; } }""",
       js="""
(() => {
  const BASE = new URL('../../comun/base-ejemplo.webp', location.href).href;
  let propia = null; try { propia = localStorage.getItem('flux-base-v1'); } catch (e) {}
  const lz = document.getElementById('lienzo'), g = lz.getContext('2d'), W = lz.width, H = lz.height;
  // ruido fijo (semilla 7): el mismo punto de partida cada vez, como una semilla de FLUX
  let s = 7; const azar = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ruido = document.createElement('canvas'); ruido.width = W / 4; ruido.height = H / 4;
  const rg = ruido.getContext('2d'), id = rg.createImageData(ruido.width, ruido.height);
  for (let i = 0; i < id.data.length; i += 4) { id.data[i] = azar() * 255; id.data[i + 1] = azar() * 255; id.data[i + 2] = azar() * 255; id.data[i + 3] = 255; }
  rg.putImageData(id, 0, 0);
  const img = new Image(); img.src = propia || BASE;
  let N = 2; const OPC = [1, 2, 4, 8, 28];
  function dibujar(ctx, w, h, p) {   // p = 0 (todo ruido) … 1 (imagen limpia)
    ctx.save(); ctx.clearRect(0, 0, w, h);
    ctx.filter = `blur(${((1 - p) * w / 32).toFixed(1)}px)`;
    if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none'; ctx.globalAlpha = Math.pow(1 - p, 1.25); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ruido, 0, 0, w, h); ctx.restore();
  }
  const pasosVisibles = () => { if (N <= 8) return Array.from({ length: N + 1 }, (_, k) => k); return [0, 1, 2, 4, 7, 12, 18, 24, 28]; };
  function tira(hasta) {
    const t = document.getElementById('tira'); t.innerHTML = '';
    for (const k of pasosVisibles()) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 72; c.title = k === 0 ? 'ruido' : 'paso ' + k;
      dibujar(c.getContext('2d'), 128, 72, k / N); if (k <= hasta) c.classList.add('ya'); t.appendChild(c);
    }
  }
  function chips() {
    const c = document.getElementById('pasos'); c.innerHTML = '';
    for (const n of OPC) { const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.setAttribute('aria-pressed', String(n === N)); b.onclick = () => { N = n; chips(); mostrar(N); }; c.appendChild(b); }
  }
  function mostrar(k) { dibujar(g, W, H, k / N); tira(k); document.getElementById('contador').textContent = k === 0 ? 'ruido de partida' : `paso ${k} de ${N}`; }
  let corriendo = null;
  document.getElementById('ver').onclick = () => {
    clearInterval(corriendo); const lista = pasosVisibles(); let i = 0; mostrar(0);
    corriendo = setInterval(() => { i++; if (i >= lista.length) { clearInterval(corriendo); return; } mostrar(lista[i]); }, N > 8 ? 380 : 700);
  };
  img.onload = () => mostrar(N); chips(); mostrar(N);
})();""",
       pie="Fuentes: bfl.ai · huggingface.co/black-forest-labs · developers.cloudflare.com/workers-ai")

# ════════════════════════════════════════ 03 · Imagen base ════════════════════════════════════════
escena("03-imagen-base", Y("Tu imagen base con FLUX", "experiencia", "flux", 11, logre=True, comandos=[
    ["Desde la terminal del aula (sin el LIVE)",
     "mkdir -p /trabajo/flux && cd /trabajo/flux && curl -s -X POST \"${IMAGEN_URL:-http://imagen:8000}/generar\" -H \"Authorization: Bearer $OSITO_TOKEN\" -H \"Content-Type: application/json\" -o base.png -d '{\"prompt\": \"un gato pirata con parche toca el ukelele en la cubierta de un barco, al amanecer, flat color cartoon, bold outlines, limited palette\", \"calidad\": \"maxima\", \"orientacion\": \"horizontal\"}' && ls -la base.png"]]),
       "Tu imagen base con FLUX", "Experiencia", "ec", "E03", """
    <h1 class="esc-titulo a-in">Tu <em>imagen base</em>: una sola, la eliges y ya no se regenera</h1>
    <section class="ib">
      <div class="sec a-in" style="--d:.1s">
        <div class="chips" id="ejemplos"><span class="t">Ejemplos:</span></div>
        <div class="receta">
          <label>Quién o qué<small>el sujeto</small></label><input id="sujeto" type="text" placeholder="un gato pirata con parche">
          <label>Qué hace<small>la acción</small></label><input id="accion" type="text" placeholder="toca el ukelele">
          <label>Dónde<small>el lugar y la hora</small></label><input id="lugar" type="text" placeholder="en la cubierta de un barco, al amanecer">
          <label>Cómo se ve<small>el estilo</small></label><div class="chips" id="estilos"></div>
          <label>Forma<small>orientación</small></label><div class="chips" id="formas"></div>
        </div>
        <pre class="prompt" id="prompt"></pre>
        <button id="generar" type="button" class="grande">Generar con FLUX (~10 s)</button>
        <p class="aviso" id="aviso" aria-live="polite"></p>
        <ul class="reglas">
          <li><b>Lo que no dices, el modelo lo inventa.</b> Concreto gana: «un gato naranja con sombrero rojo» &gt; «un gato bonito».</li>
          <li><b>Sin texto dentro de la imagen:</b> FLUX escribe mal las letras; el texto va en tu HTML.</li>
          <li><b>Una variación = cambia una sola parte</b> y genera otra vez. Así ves qué mueve cada palabra.</li>
        </ul>
      </div>
      <div class="sec a-in" style="--d:.2s">
        <div class="galeria" id="galeria"><div class="vacia">Tus imágenes aparecen aquí. Elige una con «Usar como base».</div></div>
        <div class="base-actual">
          <img id="base" alt="Tu imagen base">
          <div><h3>Tu imagen base</h3><p class="nota" id="base-txt"></p>
            <button type="button" id="olvidar" class="mini">Volver al ejemplo</button></div>
        </div>
        <p class="nota"><b>¿Por qué una sola?</b> FLUX no recuerda: cada vez que generas, cambian un poco la cara, el encuadre y los colores. Para animar no generas 24 imágenes por segundo: eliges <b>una base</b> y el movimiento lo pone el código (p5, Three.js, GSAP). Las variaciones sirven para <b>elegir</b>, no para animar.</p>
      </div>
    </section>""",
       css="""
.ib { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.2vw; align-items: start; }
.sec { display: grid; gap: .5em; min-width: 0; }
.receta { display: grid; grid-template-columns: auto 1fr; gap: .35em .6em; align-items: center; }
.receta label { font-size: .72em; font-weight: 700; } .receta label small { display: block; font-weight: 400; color: var(--muted); }
.receta input { width: 100%; font: .78em/1.3 inherit; padding: .4em .6em; border-radius: .6em; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); }
.chips { display: flex; flex-wrap: wrap; gap: .3em; }
.chips button, .mini { font: 600 .66em/1 system-ui, sans-serif; padding: .48em .75em; border-radius: 99px; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); cursor: pointer; }
.chips button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.chips .t { font-size: .66em; color: var(--muted); align-self: center; }
.prompt { font: .7em/1.5 var(--mono); background: var(--s2); border: 1px solid var(--line); border-radius: .8em; padding: .6em .8em; margin: 0; white-space: pre-wrap; word-break: break-word; }
.grande { width: 100%; font: 700 .9em/1 system-ui, sans-serif; padding: .8em; border: 0; border-radius: .8em; background: var(--accent); color: var(--on-accent); cursor: pointer; box-shadow: var(--card-shadow); }
.grande:disabled { opacity: .55; cursor: wait; }
.aviso { font-size: .7em; color: var(--bad); margin: 0; min-height: 1em; }
.reglas { margin: 0; padding-left: 1.1em; font-size: .68em; color: var(--muted); } .reglas b { color: var(--fg); }
.galeria { display: grid; grid-template-columns: 1fr 1fr; gap: .5em; }
.galeria figure { margin: 0; border: 1px solid var(--line); border-radius: .8em; overflow: hidden; background: var(--s2); display: grid; }
.galeria img { width: 100%; display: block; }
.galeria figcaption { display: flex; gap: .4em; align-items: center; justify-content: space-between; padding: .35em .5em; font-size: .6em; color: var(--muted); }
.galeria figcaption button { font: 700 .95em system-ui; padding: .35em .6em; border-radius: 99px; border: 0; background: var(--accent); color: var(--on-accent); cursor: pointer; white-space: nowrap; }
.galeria .vacia { grid-column: 1 / -1; display: grid; place-items: center; font-size: .7em; color: var(--muted); padding: 1.4em; border: 1px dashed var(--line2); border-radius: .8em; text-align: center; }
.base-actual { display: grid; grid-template-columns: 9em 1fr; gap: .7em; align-items: center; background: var(--s1); border: 2px solid var(--accent); border-radius: .9em; padding: .5em; }
.base-actual img { width: 100%; border-radius: .5em; display: block; }
.base-actual h3 { margin: 0 0 .2em; font-size: .85em; }
@media (max-width: 900px) { .ib { grid-template-columns: 1fr; } }""",
       js="""
(() => {
  const $ = (id) => document.getElementById(id);
  const EJEMPLOS = [
    ['gato pirata', 'un gato pirata con parche', 'toca el ukelele', 'en la cubierta de un barco, al amanecer', 0],
    ['robot panadero', 'un robot redondo de hojalata', 'saca pan del horno', 'en una panadería pequeña', 0],
    ['perro astronauta', 'un perro con traje de astronauta', 'flota con una pelota', 'en el espacio, con la Tierra detrás', 1],
    ['taza de café', 'una taza de café humeante', 'sobre una mesa de madera', 'junto a una ventana con lluvia', 2],
    ['pulpo músico', 'un pulpo sonriente', 'toca cuatro tambores', 'en el fondo del mar, con burbujas', 0],
  ];
  // estilos: etiqueta en español, cláusula en inglés (al modelo le rinde más)
  const ESTILOS = [
    ['color plano', 'flat color cartoon, bold outlines, limited palette, 1930s animation cel'],
    ['acuarela', 'soft watercolor illustration, paper texture, gentle light'],
    ['pixel art', '8-bit pixel art, 32 colors, crisp pixels'],
    ['línea clara', 'clean line art, ligne claire, flat pastel colors'],
    ['dibujo de 1928', '1928 black and white cartoon, rubber hose style, thick ink outlines, cream paper, film grain'],
    ['foto', 'photograph, 50mm lens, natural light, shallow depth of field'],
  ];
  const FORMAS = [['horizontal', 'horizontal'], ['cuadrado', 'cuadrado'], ['vertical', 'vertical']];
  const est = { sujeto: '', accion: '', lugar: '', estilo: 0, forma: 0 };
  try { Object.assign(est, JSON.parse(localStorage.getItem('s1-receta') || '{}')); } catch (e) {}
  const guardar = () => { try { localStorage.setItem('s1-receta', JSON.stringify(est)); } catch (e) {} };
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const lista = () => est.sujeto.trim() && est.accion.trim() && est.lugar.trim();
  const prompt = () => [est.sujeto, est.accion, est.lugar].map((t) => t.trim()).join(' ') + ', ' + ESTILOS[est.estilo][1] + ', no text';
  function chips(caja, items, activo, al, keep) {
    if (!keep) caja.innerHTML = ''; else caja.querySelectorAll('button').forEach((b) => b.remove());
    items.forEach((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = it[0]; b.setAttribute('aria-pressed', String(activo(i))); b.onclick = () => { al(i); pintar(); }; caja.appendChild(b); });
  }
  function pintar() {
    chips($('ejemplos'), EJEMPLOS, () => false, (i) => { const e = EJEMPLOS[i]; est.sujeto = e[1]; est.accion = e[2]; est.lugar = e[3]; est.estilo = e[4]; for (const k of ['sujeto', 'accion', 'lugar']) $(k).value = est[k]; }, true);
    chips($('estilos'), ESTILOS, (i) => i === est.estilo, (i) => { est.estilo = i; });
    chips($('formas'), FORMAS, (i) => i === est.forma, (i) => { est.forma = i; });
    $('prompt').innerHTML = lista() ? esc(prompt()) : '<span style="opacity:.6">(escribe quién, qué hace y dónde; aquí aparece tu prompt)</span>';
    if (!$('generar').dataset.ocupado) $('generar').disabled = !lista();
    const propia = Vivo.esPropia(); $('base').src = Vivo.base();
    $('base-txt').textContent = propia ? 'La tuya. Las escenas de p5, Three.js, GSAP y HyperFrames la usan desde ahora.' : 'Por ahora, el ejemplo (gato pirata hecho con FLUX en clase). Genera y elige la tuya.';
    $('olvidar').hidden = !propia; guardar();
  }
  function agregar(data, txt) {
    const gal = $('galeria'); const v = gal.querySelector('.vacia'); if (v) v.remove();
    const f = document.createElement('figure'); f.innerHTML = '<img alt=""><figcaption><span></span><button type="button">Usar como base</button></figcaption>';
    f.querySelector('img').src = data; f.querySelector('span').textContent = txt.slice(0, 48) + '…';
    f.querySelector('button').onclick = async (e) => {
      try { await Vivo.guardar(data); e.target.textContent = '✓ Es tu base'; pintar(); } catch (err) { $('aviso').textContent = err.message; }
    };
    gal.prepend(f); while (gal.children.length > 4) gal.lastElementChild.remove();
  }
  const leccion = (location.pathname.match(/\\/live\\/([^/]+)\\//) || [])[1] || '{LECCION}';
  async function generar() {
    const btn = $('generar'); if (!lista() || btn.dataset.ocupado) return;
    btn.dataset.ocupado = '1'; btn.disabled = true; btn.textContent = 'Generando con FLUX… (unos 10 s)'; $('aviso').textContent = '';
    const t0 = performance.now();
    try {
      const r = await fetch(`/api/v1/live/${leccion}/imagen`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt(), orientacion: FORMAS[est.forma][1] }) });
      if (!r.ok) {
        let msg = `error ${r.status}`; try { const j = await r.json(); msg = (j.error && (j.error.message || j.error.mensaje)) || j.message || msg; } catch (e) {}
        throw new Error(r.status === 429 ? 'Se acabó tu cupo de imágenes de hoy: elige entre las que ya tienes o usa el ejemplo.' : msg);
      }
      const blob = await r.blob();
      const data = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
      agregar(data, prompt()); btn.textContent = `✓ Lista en ${((performance.now() - t0) / 1000).toFixed(1)} s`;
    } catch (e) { $('aviso').textContent = e.message || 'No se pudo generar'; btn.textContent = 'No se pudo: prueba otra vez'; }
    setTimeout(() => { delete btn.dataset.ocupado; btn.textContent = 'Generar con FLUX (~10 s)'; pintar(); }, 2200);
  }
  $('generar').onclick = generar;
  $('olvidar').onclick = () => { Vivo.olvidar(); pintar(); };
  for (const k of ['sujeto', 'accion', 'lugar']) { $(k).value = est[k]; $(k).oninput = (e) => { est[k] = e.target.value; pintar(); }; }
  pintar();
})();""", vivo=True,
       pie="Lo logré = generaste al menos una imagen y elegiste tu base · se guarda en este navegador")

# ════════════════════════════════════════ 04 · fps ════════════════════════════════════════
escena("04-fps", Y("fps: imágenes por segundo", "conceptualizacion", "", 7),
       "fps: imágenes por segundo", "Conceptualización", "ca", "E04", """
    <h1 class="esc-titulo a-in">fps: cuántas <em>imágenes por segundo</em> ves</h1>
    <section class="fp">
      <div class="esc-card a-in" style="--d:.1s">
        <div class="pestanas"><button type="button" data-m="fps" aria-pressed="true">Comparar fps</button><button type="button" data-m="lag" aria-pressed="false">Por cuadro vs por tiempo</button></div>
        <canvas id="pista" width="960" height="540" aria-label="La misma animación a distintos fps"></canvas>
        <label class="nota" id="lag-l" hidden>Tu compu se atasca a <b id="lag-v">20</b> fps <input id="lag" type="range" min="6" max="60" value="20"></label>
        <p class="nota" id="pie-demo"></p>
      </div>
      <div class="lado a-in" style="--d:.2s">
        <div class="tabla">
          <div><b>24</b><span>cine</span></div><div><b>25 · 30</b><span>video y TV</span></div>
          <div><b>60 · 120</b><span>pantallas y juegos</span></div><div><b>12</b><span>dibujos clásicos «en dos»: cada dibujo dura 2 cuadros</span></div>
          <div><b>10 – 15</b><span>GIF livianos</span></div><div><b>30</b><span>lo que renderiza HyperFrames por defecto</span></div>
        </div>
        <div class="esc-card"><h3>Regla de oro: mueve por <em>tiempo</em>, no por cuadro</h3>
          <p>Si sumas «3 píxeles por cuadro», en una compu lenta todo va más lento. Si calculas la posición con el <b>tiempo</b> (segundos), se ve igual de rápido a 12 o a 60 fps: solo cambia lo suave.</p></div>
        <pre class="esc-cmd"><span class="c">// p5.js</span>
frameRate(24);                 <span class="c">// cuadros por segundo</span>
const t = millis() / 1000;     <span class="c">// tiempo en segundos</span>
x = 100 + 80 * t;              <span class="c">// por tiempo ✓</span>

<span class="c">// Three.js</span>
const t = performance.now() / 1000;

<span class="c">// GSAP / HyperFrames: todo se mide en segundos</span>
gsap.to(gato, { x: 300, duration: 2 });</pre>
      </div>
    </section>""",
       css="""
.fp { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 1.2vw; align-items: start; }
.fp canvas { width: 100%; height: auto; display: block; border-radius: .7em; background: #101018; margin: .4em 0; }
.pestanas { display: flex; gap: .3em; }
.pestanas button { font: 600 .68em/1 system-ui, sans-serif; padding: .5em .85em; border-radius: 99px; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); cursor: pointer; }
.pestanas button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.nota input { vertical-align: middle; accent-color: var(--accent); }
.lado { display: grid; gap: .55em; }
.tabla { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .4em; }
.tabla div { background: var(--s1); border: 1px solid var(--line); border-radius: .7em; padding: .45em .6em; display: grid; }
.tabla b { font: 800 1em var(--mono); color: var(--accent); } .tabla span { font-size: .62em; color: var(--muted); }
.lado .esc-card { padding: .6em .85em; } .lado .esc-card h3 { font-size: .8em; } .lado .esc-card p { font-size: .7em; }
.lado .esc-cmd { font-size: .6em; }
@media (max-width: 900px) { .fp { grid-template-columns: 1fr; } }""",
       js="""
(() => {
  const lz = document.getElementById('pista'), g = lz.getContext('2d'), W = lz.width, H = lz.height;
  const img = new Image(); let propia = null; try { propia = localStorage.getItem('flux-base-v1'); } catch (e) {}
  img.src = propia || new URL('../../comun/base-ejemplo.webp', location.href).href;
  let modo = 'fps'; const t0 = performance.now();
  const FPS = [6, 12, 24, 60];
  const tinta = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a99cff';
  // carril: la imagen va y vuelve en 3 s con un salto; la posición sale SOLO del tiempo (cuantizado a los fps del carril)
  function carril(y, h, t, etiqueta, color) {
    const lado = h * 0.82, iw = lado * (img.naturalWidth ? img.naturalWidth / img.naturalHeight : 16 / 9);
    const u = (t % 3) / 3, ida = u < .5 ? u * 2 : 2 - u * 2, x = 110 + ida * (W - 140 - iw);
    const salto = Math.abs(Math.sin(t * Math.PI * 2 / 1.5)) * h * 0.12;
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, y, W, h);
    if (img.complete && img.naturalWidth) g.drawImage(img, x, y + (h - lado) / 2 + h * 0.06 - salto, iw, lado);
    g.fillStyle = color; g.font = '700 22px ui-monospace, monospace'; g.fillText(etiqueta, 12, y + h / 2 + 8);
  }
  let lagX = 110, lagUlt = 0;
  function cuadro() {
    const t = (performance.now() - t0) / 1000; g.clearRect(0, 0, W, H);
    if (modo === 'fps') {
      const h = H / FPS.length;
      FPS.forEach((f, i) => carril(i * h, h, Math.floor(t * f) / f, f + ' fps', i === 3 ? '#7ee2a8' : tinta));
      document.getElementById('pie-demo').innerHTML = 'Misma animación, mismo tiempo: a <b>6 fps</b> salta, a <b>12</b> se ve «de dibujo», a <b>24</b> es cine y a <b>60</b> es seda.';
    } else {
      const lag = +document.getElementById('lag').value, h = H / 2;
      const tq = Math.floor(t * lag) / lag;
      // por cuadro: suma 4 px cada vez que dibuja, pensando que siempre son 60 fps
      if (tq !== lagUlt) { lagX += 4 * (lag > 0 ? 1 : 0); lagUlt = tq; }
      const iw = h * 0.7 * 16 / 9, ancho = W - 140 - iw;
      const porCuadro = 110 + (lagX - 110) % ancho, porTiempo = 110 + ((tq * 240) % ancho);
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, W, h); g.fillRect(0, h, W, h);
      if (img.complete && img.naturalWidth) { g.drawImage(img, porCuadro, h * .15, iw, h * .7); g.drawImage(img, porTiempo, h + h * .15, iw, h * .7); }
      g.font = '700 20px ui-monospace, monospace'; g.fillStyle = '#ff8a8a'; g.fillText('por cuadro', 10, h / 2); g.fillStyle = '#7ee2a8'; g.fillText('por tiempo', 10, h + h / 2);
      document.getElementById('pie-demo').innerHTML = `A ${lag} fps: <b>por cuadro</b> avanza ${(4 * lag).toFixed(0)} px/s (a 60 fps serían 240); <b>por tiempo</b> siempre 240 px/s.`;
    }
    requestAnimationFrame(cuadro);
  }
  document.querySelectorAll('.pestanas button').forEach((b) => b.onclick = () => {
    modo = b.dataset.m; document.querySelectorAll('.pestanas button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    document.getElementById('lag-l').hidden = modo !== 'lag'; lagX = 110;
  });
  document.getElementById('lag').oninput = (e) => { document.getElementById('lag-v').textContent = e.target.value; };
  requestAnimationFrame(cuadro);
})();""",
       pie="Willie (1928) se filmó a 24 fps con dibujos «en dos»: 12 dibujos por segundo")

# ════════════════════════════════════════ 05 · p5 en vivo ════════════════════════════════════════
# Las capas: la escena del gato pirata en 9 dibujos con fondo transparente (_fuente/capas.py). Cada una en su plano.
CAPAS_COMUN = r"""import * as THREE from 'three';

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
const render = new THREE.WebGLRenderer({ antialias: true });
render.setSize(innerWidth, innerHeight);
document.body.appendChild(render.domElement);

// distancia de cada capa a la cámara: cielo, sol, nubes, montañas, colinas, mar, barco, olas, gaviotas
const PROF = [60, 56, 42, 34, 26, 18, 10, 7, 30];
const carga = new THREE.TextureLoader();
const capa = CAPAS.map((url, i) => {
  const tex = carga.load(url); tex.colorSpace = THREE.SRGBColorSpace;
  // cada plano llena la pantalla a su distancia (+30 % para que el borde no se vea al moverse)
  const vis = 2 * PROF[i] * Math.tan(THREE.MathUtils.degToRad(20));
  const alto = Math.max(vis, vis * camara.aspect / (16 / 9)) * 1.3;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * 16 / 9, alto), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.position.z = -PROF[i];
  m.renderOrder = i === 8 ? 4.5 : i;     // de atrás hacia adelante (las gaviotas van en el cielo)
  escena.add(m);
  return m;
});
"""

CAPAS_PARALLAX = CAPAS_COMUN + r"""
let ultimo = 0;
render.setAnimationLoop((ms) => {
  if (ms - ultimo < 1000 / FPS) return;
  ultimo = ms;
  const t = ms / 1000;
  // la cámara se desliza sin girar: lo lejano se mueve poco y lo cercano mucho (eso es el parallax)
  camara.position.x = 1.0 * Math.sin(t * 0.45);         // más de ~1 y el borde de las capas cercanas se asoma
  camara.position.y = 0.25 * Math.sin(t * 0.3);
  render.render(escena, camara);
});
"""

CAPAS_VIVA = CAPAS_COMUN + r"""
// el barco se mece desde la línea de flotación (no desde el centro del plano)
const [, sol, nubes, , , mar, barco, olas, gaviotas] = capa;
const g = barco.geometry.parameters, px = (930 / 2048 - 0.5) * g.width, py = (0.5 - 1000 / 1152) * g.height;
barco.geometry.translate(-px, -py, 0); barco.position.x += px; barco.position.y += py;
const y0 = { mar: mar.position.y, olas: olas.position.y, barco: barco.position.y };

let ultimo = 0;
render.setAnimationLoop((ms) => {
  if (ms - ultimo < 1000 / FPS) return;
  ultimo = ms;
  const t = ms / 1000;
  camara.position.x = 0.8 * Math.sin(t * 0.35);           // parallax suave
  sol.scale.setScalar(1 + 0.02 * Math.sin(t * 1.5));      // el sol late
  nubes.position.x = -4 + ((t * 0.6) % 8);                // las nubes avanzan
  mar.position.y = y0.mar + 0.05 * Math.sin(t * 1.2);
  barco.rotation.z = 0.035 * Math.sin(t * 1.3);           // el barco se mece
  barco.position.y = y0.barco + 0.06 * Math.sin(t * 1.3 + 0.8);
  olas.position.x = 0.3 * Math.sin(t * 0.9);
  olas.position.y = y0.olas + 0.04 * Math.sin(t * 1.8);
  gaviotas.position.x = -6 + ((t * 1.2) % 12);            // las gaviotas cruzan
  gaviotas.position.y = 0.4 * Math.sin(t * 2);
  gaviotas.scale.y = 1 + 0.12 * Math.sin(t * 9);          // y aletean
  render.render(escena, camara);
});
"""

CAPAS_MOUSE = CAPAS_COMUN + r"""
// la cámara sigue al puntero: mueve el mouse sobre la vista previa
const meta = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { meta.x = (e.clientX / innerWidth - 0.5) * 2; meta.y = -(e.clientY / innerHeight - 0.5) * 0.6; });

let ultimo = 0;
render.setAnimationLoop((ms) => {
  if (ms - ultimo < 1000 / FPS) return;
  ultimo = ms;
  camara.position.x += (meta.x - camara.position.x) * 0.08;   // se acerca de a poco (suave)
  camara.position.y += (meta.y - camara.position.y) * 0.08;
  render.render(escena, camara);
});
"""

P5_CAPAS = r"""// Capas: 9 dibujos con fondo transparente. Cada uno se mueve según su profundidad (0 = lejos, 1 = cerca)
let capas = [];
const PROF = [0, 0.05, 0.15, 0.2, 0.35, 0.5, 0.8, 1, 0.25];
function preload() { capas = CAPAS.map((url) => loadImage(url)); }

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(FPS);
  imageMode(CENTER);
}

function draw() {
  background(16);
  const t = millis() / 1000;
  const k = max(width / 2048, height / 1152) * 1.15;      // un poco más grande: el borde no se ve
  const dx = 70 * sin(t * 0.5), dy = 12 * sin(t * 0.35);
  capas.forEach((c, i) => {
    push();
    translate(width / 2 + dx * PROF[i], height / 2 + dy * PROF[i]);
    if (i === 2) translate((t * 20) % 160 - 80, 0);          // las nubes avanzan
    if (i === 6) rotate(0.03 * sin(t * 1.3));                // el barco se mece
    image(c, 0, 0, 2048 * k, 1152 * k);
    pop();
  });
}
"""

GSAP_CAPAS = r"""// Capas con línea de tiempo: la cámara entra (cada capa crece según su profundidad) y luego todo vive en bucle
const PROF = [0, 0.05, 0.15, 0.2, 0.35, 0.5, 0.8, 1, 0.25];
document.body.innerHTML = CAPAS.map((url, i) =>
  `<img class="capa" id="c${i}" src="${url}" style="position:absolute;left:-6%;top:-6%;width:112%;height:112%;object-fit:cover">`).join('');
gsap.ticker.fps(FPS);

// entrada: de lejos a cerca; lo cercano se mueve y crece más
const tl = gsap.timeline();
PROF.forEach((p, i) => tl.from('#c' + i, { scale: 1 + 0.5 * p, yPercent: 12 * p, opacity: i ? 0 : 1, duration: 1.6, ease: 'power3.out' }, i * 0.08));

// después, en bucle: paneo suave, barco que se mece, nubes y gaviotas que cruzan
PROF.forEach((p, i) => gsap.to('#c' + i, { xPercent: -4 * p, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.8 }));
gsap.to('#c6', { rotation: 2, transformOrigin: '45% 87%', duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
gsap.fromTo('#c2', { x: -60 }, { x: 60, duration: 8, ease: 'none', yoyo: true, repeat: -1 });
gsap.fromTo('#c8', { xPercent: -40 }, { xPercent: 40, duration: 7, ease: 'none', repeat: -1 });
"""

P5 = {
    "respira": ("Respira", "La imagen crece y se encoge despacio", """// Respira: la imagen base crece y se encoge, un ciclo cada 3 segundos
let img;
function preload() { img = loadImage(BASE); }     // BASE = tu imagen de FLUX

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(FPS);                                 // cuadros por segundo
  imageMode(CENTER);
}

function draw() {
  background(16);
  const t = millis() / 1000;                      // tiempo en segundos
  const s = 1 + 0.04 * sin(t * TWO_PI / 3);       // 1 ± 4 %, cada 3 s
  const k = min(width / img.width, height / img.height);
  image(img, width / 2, height / 2, img.width * k * s, img.height * k * s);
}
"""),
    "flota": ("Flota", "Sube, baja y se mece como un barco", """// Flota: sube, baja y se mece como un barco en el agua
let img;
function preload() { img = loadImage(BASE); }

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(FPS);
  imageMode(CENTER);
}

function draw() {
  background(16);
  const t = millis() / 1000;
  const k = min(width / img.width, height / img.height) * 0.9;
  translate(width / 2, height / 2 + 12 * sin(t * 2));   // sube y baja
  rotate(0.03 * sin(t * 1.3));                           // se mece (radianes)
  image(img, 0, 0, img.width * k, img.height * k);
}
"""),
    "franjas": ("Parallax por franjas", "Cada franja horizontal se mueve a su velocidad", """// Parallax por franjas: arriba (lejos) se mueve poco, abajo (cerca) mucho
let img;
const FRANJAS = 6;
function preload() { img = loadImage(BASE); }

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(FPS);
}

function draw() {
  background(16);
  const t = millis() / 1000;
  const k = max(width / img.width, height / img.height) * 1.08;   // un poco más grande: el borde no se ve
  const w = img.width * k, h = img.height * k;
  const x0 = (width - w) / 2, y0 = (height - h) / 2;
  for (let i = 0; i < FRANJAS; i++) {
    const prof = (i + 1) / FRANJAS;                   // 0 = lejos, 1 = cerca
    const dx = 18 * prof * sin(t * 0.8);              // cuánto se desplaza
    const sy = img.height * i / FRANJAS, sh = img.height / FRANJAS + 1;
    image(img, x0 + dx, y0 + sy * k, w, sh * k, 0, sy, img.width, sh);
  }
}
"""),
    "agua": ("Agua", "Ondas en la mitad de abajo", """// Agua: la mitad de abajo ondula, línea por línea
let img;
function preload() { img = loadImage(BASE); }

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(FPS);
  noSmooth();
}

function draw() {
  background(16);
  const t = millis() / 1000;
  const k = max(width / img.width, height / img.height);
  const w = img.width * k, h = img.height * k, x0 = (width - w) / 2, y0 = (height - h) / 2;
  const mitad = img.height * 0.45;                    // desde dónde empieza el agua
  image(img, x0, y0, w, mitad * k, 0, 0, img.width, mitad);
  for (let y = mitad; y < img.height; y += 2) {
    const fuerza = (y - mitad) / (img.height - mitad); // más abajo, más ola
    const dx = 6 * fuerza * sin(y * 0.12 + t * 3);
    image(img, x0 + dx, y0 + y * k, w, 2 * k + 1, 0, y, img.width, 2);
  }
}
"""),
    "particulas": ("Partículas", "Polvo de luz que sube", """// Partículas: chispas que suben sobre tu imagen (con semilla: siempre igual)
let img, chispas = [];
function preload() { img = loadImage(BASE); }

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(FPS);
  randomSeed(7);                                      // misma semilla = mismas chispas
  for (let i = 0; i < 90; i++) chispas.push({ x: random(), y: random(), v: random(0.03, 0.12), r: random(2, 6) });
}

function draw() {
  const k = max(width / img.width, height / img.height);
  image(img, (width - img.width * k) / 2, (height - img.height * k) / 2, img.width * k, img.height * k);
  const t = millis() / 1000;
  noStroke();
  for (const c of chispas) {
    const y = 1 - ((c.y + t * c.v) % 1);              // sube y vuelve a empezar
    const x = c.x + 0.01 * sin(t * 2 + c.y * 10);
    fill(255, 230, 150, 160 + 90 * sin(t * 4 + c.x * 20));
    circle(x * width, y * height, c.r);
  }
}
"""),
    "capas": ("Capas (parallax real)", "La escena en 9 capas: cada una se mueve según su profundidad", P5_CAPAS),
}

THREE = {
    "postal": ("Postal 3D", "La imagen como una lámina que gira en el espacio", """// Postal 3D: tu imagen en una lámina que se mece en el espacio
import * as THREE from 'three';

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camara.position.z = 3;
const render = new THREE.WebGLRenderer({ antialias: true });
render.setSize(innerWidth, innerHeight);
document.body.appendChild(render.domElement);

const textura = new THREE.TextureLoader().load(BASE, (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  lamina.scale.x = t.image.width / t.image.height;    // respeta la forma de la imagen
});
const lamina = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: textura, side: THREE.DoubleSide }));
escena.add(lamina);

let ultimo = 0;
render.setAnimationLoop((ms) => {
  if (ms - ultimo < 1000 / FPS) return;               // dibuja solo FPS veces por segundo
  ultimo = ms;
  const t = ms / 1000;                                // tiempo en segundos
  lamina.rotation.y = 0.35 * Math.sin(t * 0.8);
  lamina.rotation.x = 0.12 * Math.sin(t * 0.6);
  render.render(escena, camara);
});
"""),
    "relieve": ("Relieve", "Lo claro sale hacia ti: la imagen se vuelve maqueta", """// Relieve: cada punto sale hacia la cámara según su brillo (lo claro, más cerca)
import * as THREE from 'three';

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
const render = new THREE.WebGLRenderer({ antialias: true });
render.setSize(innerWidth, innerHeight);
document.body.appendChild(render.domElement);

const img = new Image();
img.onload = () => {
  const asp = img.width / img.height, N = 220;
  const geo = new THREE.PlaneGeometry(2 * asp, 2, N, Math.round(N / asp));
  // leer el brillo de cada punto
  const c = document.createElement('canvas'); c.width = N + 1; c.height = Math.round(N / asp) + 1;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const px = g.getImageData(0, 0, c.width, c.height).data, pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const brillo = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 765;
    pos.setZ(i, brillo * 0.35);                        // cuánto sale (prueba 0.1 o 0.6)
  }
  const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
  escena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })));
};
img.src = BASE;

let ultimo = 0;
render.setAnimationLoop((ms) => {
  if (ms - ultimo < 1000 / FPS) return;
  ultimo = ms;
  const t = ms / 1000;
  camara.position.set(1.6 * Math.sin(t * 0.5), 0.5 * Math.sin(t * 0.3), 3.2);   // la cámara orbita
  camara.lookAt(0, 0, 0);
  render.render(escena, camara);
});
"""),
    "multiplano": ("Multiplano", "Tres franjas a distinta profundidad, como la cámara de Disney de 1937", """// Multiplano: tres franjas de tu imagen a distinta profundidad; la cámara se desliza y aparece la profundidad
import * as THREE from 'three';

const escena = new THREE.Scene();
escena.background = new THREE.Color('#101018');
const camara = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
const render = new THREE.WebGLRenderer({ antialias: true });
render.setSize(innerWidth, innerHeight);
document.body.appendChild(render.domElement);

const textura = new THREE.TextureLoader().load(BASE, (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  const asp = t.image.width / t.image.height;
  // [desde, hasta] en altura (0 = abajo) y su distancia: arriba lejos, abajo cerca
  [[0.62, 1, -1.2], [0.3, 0.62, -0.5], [0, 0.3, 0.3]].forEach(([a, b, z]) => {
    const tex = t.clone(); tex.needsUpdate = true;
    tex.offset.set(0, a); tex.repeat.set(1, b - a);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * asp, 2 * (b - a)), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    m.position.set(0, -1 + (a + b), z);
    escena.add(m);
  });
});

let ultimo = 0;
render.setAnimationLoop((ms) => {
  if (ms - ultimo < 1000 / FPS) return;
  ultimo = ms;
  const t = ms / 1000;
  camara.position.set(0.9 * Math.sin(t * 0.6), 0, 4);
  camara.lookAt(0, 0, -0.5);
  render.render(escena, camara);
});
"""),
    "cubo": ("Cubo", "Tu imagen en las seis caras de un cubo", """// Cubo: la imagen en las seis caras, girando con luz
import * as THREE from 'three';

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camara.position.z = 3.2;
const render = new THREE.WebGLRenderer({ antialias: true });
render.setSize(innerWidth, innerHeight);
document.body.appendChild(render.domElement);

const tex = new THREE.TextureLoader().load(BASE); tex.colorSpace = THREE.SRGBColorSpace;
const cubo = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), new THREE.MeshStandardMaterial({ map: tex }));
escena.add(cubo);
escena.add(new THREE.AmbientLight(0xffffff, 0.6));
const sol = new THREE.DirectionalLight(0xffffff, 2); sol.position.set(2, 3, 4); escena.add(sol);

let ultimo = 0;
render.setAnimationLoop((ms) => {
  if (ms - ultimo < 1000 / FPS) return;
  ultimo = ms;
  const t = ms / 1000;
  cubo.rotation.set(t * 0.4, t * 0.7, 0);
  render.render(escena, camara);
});
"""),
    "capas_parallax": ("Capas: parallax", "9 capas en planos a distinta distancia: profundidad real, sin deformar", CAPAS_PARALLAX),
    "capas_viva": ("Capas: escena viva", "El barco se mece, las nubes avanzan, las gaviotas cruzan y el sol late", CAPAS_VIVA),
    "capas_mouse": ("Capas: sigue el mouse", "La cámara sigue a tu puntero sobre la vista previa", CAPAS_MOUSE),
}

GSAP = {
    "entrada": ("Entrada", "La imagen y el título entran con una curva (ease)", """// Entrada: la imagen entra con zoom y el título sube; cada uno con su curva (ease)
document.body.innerHTML = `
  <img id="foto" src="${BASE}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <h1 id="titulo" style="position:absolute;left:6%;bottom:8%;margin:0;font:900 9vw/1 system-ui;color:#fff;text-shadow:0 .05em 0 #000">¡Hola!</h1>`;

gsap.ticker.fps(FPS);                       // cuadros por segundo

const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
tl.from('#foto', { scale: 1.3, opacity: 0, duration: 1.2, ease: 'power3.out' })
  .from('#titulo', { y: 80, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, '-=0.3')
  .to('#titulo', { scale: 1.1, duration: 0.4, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '+=0.5');
"""),
    "camara": ("Cámara: zoom y paneo", "Una línea de tiempo con tres movimientos de cámara", """// Cámara: tres movimientos en una línea de tiempo (acercar, panear, alejar)
document.body.innerHTML = `<img id="foto" src="${BASE}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
gsap.ticker.fps(FPS);

const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' } });
tl.to('#foto', { scale: 1.6, xPercent: 12, yPercent: 8, duration: 2 })      // acerca al personaje
  .to('#foto', { xPercent: -14, duration: 2.5 })                            // paneo a la derecha
  .to('#foto', { scale: 1, xPercent: 0, yPercent: 0, duration: 1.5 });      // vuelve al plano general
"""),
    "eases": ("Curvas (eases)", "La misma subida con cinco curvas distintas", """// Curvas: el mismo movimiento con cinco eases. Mira cuál «pesa» y cuál «rebota»
const EASES = ['none', 'power2.out', 'power4.inOut', 'back.out(2)', 'elastic.out(1, 0.4)', 'bounce.out'];
document.body.innerHTML = EASES.map((e, i) => `
  <div style="position:absolute;left:${4 + i * 16}%;bottom:6%;width:12%;text-align:center;color:#ccc;font:600 1.6vw system-ui">
    <img class="b" src="${BASE}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:50%;border:.3vw solid #fff">
    <div>${e}</div></div>`).join('');
gsap.ticker.fps(FPS);

gsap.utils.toArray('.b').forEach((b, i) => {
  gsap.fromTo(b, { y: 0 }, { y: -innerHeight * 0.55, duration: 1.6, ease: EASES[i], repeat: -1, yoyo: true, repeatDelay: 0.4 });
});
"""),
    "tifo": ("Tifo (stagger)", "La imagen se arma con cartulinas que se dan vuelta, una tras otra", """// Tifo: la imagen se arma con cartulinas que se dan vuelta, desde el centro (stagger)
const COL = 16, FIL = 9;
let html = '';
for (let f = 0; f < FIL; f++) for (let c = 0; c < COL; c++) {
  html += `<div class="carta" style="position:absolute;left:${c * 100 / COL}%;top:${f * 100 / FIL}%;width:${100 / COL}%;height:${100 / FIL}%;
    background:url(${BASE}) ${-c * 100}% ${-f * 100}% / ${COL * 100}% ${FIL * 100}%;outline:1px solid #0006"></div>`;
}
document.body.innerHTML = html;
gsap.ticker.fps(FPS);

gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
  .from('.carta', { rotationX: -90, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: { grid: [FIL, COL], from: 'center', amount: 1.2 } })
  .to('.carta', { scale: 0.92, duration: 0.3, yoyo: true, repeat: 1, stagger: { grid: [FIL, COL], from: 'edges', amount: 0.6 } }, '+=0.8');
"""),
    "capas": ("Capas (timeline)", "La cámara entra por las capas y todo queda vivo en bucle", GSAP_CAPAS),
}


def vivo_escena(carpeta, titulo, num, h1, cards, lib, presets, clave, paso, minutos, pie):
    pres = {k: {"titulo": t, "que": q, "codigo": c} for k, (t, q, c) in presets.items()}
    cuerpo = f"""
    <h1 class="esc-titulo a-in">{h1}</h1>
    <div class="explica a-in" style="--d:.05s">{''.join(f'<div class="esc-card"><h3>{a}</h3><p>{b}</p></div>' for a, b in cards)}</div>
    <section class="vivo a-in" style="--d:.15s" id="vivo"></section>"""
    js = f"""
(() => {{
  const PRESETS = {J(pres)};
  Vivo.editor(document.getElementById('vivo'), {{ lib: '{lib}', presets: PRESETS, clave: '{clave}' }});
}})();"""
    escena(carpeta, Y(titulo, "experiencia", paso, minutos, logre=True, umbral=60), titulo, "Experiencia", "ec", num, cuerpo,
           css=".esc-cuerpo { gap: 1.2vh; justify-content: flex-start; }", js=js, vivo=True, pie=pie)


vivo_escena("05-p5-en-vivo", "p5.js en vivo: anima tu imagen base", "E05",
            "p5.js: <em>dibuja y anima</em> tu imagen base",
            [("Qué es", "Una biblioteca de JavaScript para dibujar en un <code>canvas</code>, hecha para artistas y diseñadores (Processing Foundation, gratis)."),
             ("Cómo corre", "<code>setup()</code> una vez; <code>draw()</code> se repite <b>FPS</b> veces por segundo (<code>frameRate</code>)."),
             ("Hoy", "<code>preload</code> carga tu imagen base; <code>millis()</code> da el tiempo. Prueba también <b>Capas</b>: la escena en 9 dibujos separados.")],
            "p5", P5, "p5", "p5", 12, "Lo logré = tu imagen base se mueve con un ejemplo que cambiaste tú (un número basta)")

vivo_escena("06-three-en-vivo", "Three.js en vivo: tu imagen en 3D", "E06",
            "Three.js: tu imagen base en <em>3D</em>",
            [("Qué es", "La biblioteca más usada para 3D en el navegador, con WebGL (licencia MIT, gratis)."),
             ("Las piezas", "<b>Escena</b> + <b>cámara</b> + <b>malla</b> (geometría y material) + <b>renderer</b> que dibuja cada cuadro."),
             ("Hoy", "Con <b>una</b> imagen, el relieve y el multiplano la deforman. Con <b>capas</b> (9 dibujos con fondo transparente, cada uno en su plano) la profundidad es real.")],
            "three", THREE, "three", "three", 12, "Lo logré = tu imagen base en 3D con un número cambiado por ti (relieve, cámara o velocidad)")

vivo_escena("07-gsap-en-vivo", "GSAP en vivo: animación con línea de tiempo", "E07",
            "GSAP: animación con <em>línea de tiempo</em>",
            [("Qué es", "GreenSock Animation Platform: anima propiedades de HTML y SVG (x, y, escala, opacidad). Es de Webflow y desde 2025 es <b>gratis</b>, también para trabajos comerciales."),
             ("Las piezas", "<code>gsap.to / from / fromTo</code>, <code>duration</code> en segundos, <code>ease</code> (la curva) y <code>timeline</code> para encadenar."),
             ("Por qué importa", "Una línea de tiempo se puede <b>pausar y mover a cualquier segundo</b>: eso usa HyperFrames. Prueba <b>Capas</b> para una entrada de cámara.")],
            "gsap", GSAP, "gsap", "gsap", 10, "Lo logré = tu línea de tiempo corre con una duración o un ease cambiado por ti")

# ════════════════════════════════════════ 08 · HyperFrames ════════════════════════════════════════
PLANTILLA_HF = """<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
  <style>
    html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #101018; }
    #fondo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    #titulo { position: absolute; left: 120px; bottom: 120px; margin: 0; font: 900 140px/1 sans-serif; color: #fff; }
  </style>
</head>
<body>
  <!-- La composición: 6 segundos a 1920×1080. Cada elemento con tiempo lleva class="clip", data-start y data-duration -->
  <div id="main" data-composition-id="main" data-start="0" data-duration="6" data-width="1920" data-height="1080">
    <img id="fondo" class="clip" src="assets/base.webp" data-start="0" data-duration="6" />
    <h1 id="titulo" class="clip" data-start="1" data-duration="5">Mi pieza</h1>
  </div>
  <script>
    // Una línea de tiempo PAUSADA: HyperFrames la mueve cuadro a cuadro y toma una foto de cada uno
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#fondo", { scale: 1.15 }, { scale: 1, duration: 6, ease: "none" }, 0);
    tl.from("#titulo", { y: 80, opacity: 0, duration: 0.6, ease: "power3.out" }, 1);
    window.__timelines["main"] = tl;
  </script>
</body>
</html>
"""
escena("08-hyperframes", Y("HyperFrames: de HTML a video", "conceptualizacion", "hyperframes", 10, logre=True, umbral=60, comandos=[
    ["Crear un proyecto de video", "npx hyperframes init mi-video && cd mi-video"],
    ["Verlo y editarlo en el navegador", "npx hyperframes preview"],
    ["Revisar y renderizar a MP4", "npx hyperframes check && npx hyperframes render -o renders/mi-pieza.mp4"]]),
       "HyperFrames: de HTML a video", "Conceptualización", "ca", "E08", """
    <h1 class="esc-titulo a-in">HyperFrames: de <em>HTML a video</em>, cuadro por cuadro</h1>
    <section class="hf">
      <div class="a-in" style="--d:.1s">
        <div class="escenario" id="escenario">
          <img id="hf-fondo" alt="">
          <div id="hf-velo"></div>
          <h2 id="hf-titulo">Mi pieza</h2>
          <p id="hf-sub">hecha con FLUX + GSAP</p>
          <span id="hf-reloj"></span>
        </div>
        <div class="ctrl">
          <button type="button" id="hf-play">▶</button>
          <input type="range" id="hf-t" min="0" max="6" step="0.001" value="0" aria-label="Tiempo">
          <span class="chips" id="hf-fps"></span>
          <button type="button" id="hf-render" class="boton">Renderizar como HyperFrames</button>
        </div>
        <div class="tira" id="hf-tira" aria-hidden="true"></div>
        <p class="nota" id="hf-nota">Arrastra el tiempo: la línea de tiempo está <b>pausada</b> y salta a cualquier segundo. Eso es lo que hace HyperFrames: cuadro 0, 1, 2… una foto de cada uno.</p>
      </div>
      <div class="lado a-in" style="--d:.2s">
        <div class="esc-card"><h3>Qué es</h3><p>Un programa de <b>HeyGen</b>, de código abierto (Apache 2.0), que convierte una página HTML + CSS + GSAP en <b>video MP4</b>. Hecho para que un agente de IA escriba el video como código.</p></div>
        <div class="esc-card"><h3>Cómo funciona</h3><p>Abre tu <code>index.html</code> en Chrome sin pantalla, mueve la línea de tiempo al cuadro 0, 1, 2… a los fps que pidas (30 por defecto), toma una foto de cada uno y <b>FFmpeg</b> las une. Siempre sale igual: no depende de lo rápida que sea tu compu.</p></div>
        <div class="esc-card"><h3>Sus reglas</h3><p>Cada elemento con tiempo: <code>class="clip"</code>, <code>data-start</code> y <code>data-duration</code> (segundos). Una línea de tiempo GSAP <b>pausada</b> en <code>window.__timelines</code>. Nada de <code>Math.random()</code> sin semilla ni <code>Date.now()</code>.</p></div>
        <button type="button" id="hf-copiar" class="grande">Copiar plantilla (index.html con tu imagen)</button>
        <p class="nota">Guarda tu imagen base como <code>assets/base.webp</code>, pega la plantilla en <code>index.html</code> y corre los comandos del panel. En la sesión 3 lo usamos a fondo.</p>
      </div>
    </section>""",
       css="""
.hf { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1.2vw; align-items: start; }
.escenario { position: relative; aspect-ratio: 16 / 9; border-radius: .9em; overflow: hidden; background: #101018; box-shadow: var(--card-shadow); }
#hf-fondo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
#hf-velo { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,.55), transparent 55%); }
#hf-titulo { position: absolute; left: 5%; bottom: 17%; margin: 0; font: 900 2.6em/1 system-ui; color: #fff; }
#hf-sub { position: absolute; left: 5.3%; bottom: 9%; margin: 0; font: 600 .9em system-ui; color: #ffe49a; }
#hf-reloj { position: absolute; right: 2%; top: 3%; font: 700 .62em var(--mono); color: #fff; background: rgba(0,0,0,.55); padding: .3em .55em; border-radius: .4em; }
.ctrl { display: flex; gap: .45em; align-items: center; margin: .5em 0 .3em; flex-wrap: wrap; }
.ctrl input[type=range] { flex: 1; min-width: 8em; accent-color: var(--accent); }
.ctrl > button:first-child { width: 2.2em; height: 2.2em; border-radius: 50%; border: 0; background: var(--accent); color: var(--on-accent); cursor: pointer; }
.chips { display: inline-flex; gap: .25em; }
.chips button, .boton { font: 600 .64em/1 system-ui, sans-serif; padding: .48em .7em; border-radius: 99px; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); cursor: pointer; }
.chips button[aria-pressed="true"], .boton { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.tira { display: flex; gap: 2px; height: .9em; }
.tira i { flex: 1; background: var(--s3); border-radius: 2px; }
.tira i.ya { background: var(--accent); }
.lado { display: grid; gap: .5em; }
.lado .esc-card { padding: .55em .8em; } .lado .esc-card h3 { font-size: .8em; } .lado .esc-card p { font-size: .68em; }
.lado code { font: .95em var(--mono); color: var(--accent); }
.grande { width: 100%; font: 700 .85em/1 system-ui, sans-serif; padding: .8em; border: 0; border-radius: .8em; background: var(--accent); color: var(--on-accent); cursor: pointer; }
@media (max-width: 900px) { .hf { grid-template-columns: 1fr; } }""",
       js="""
(() => {
  const $ = (id) => document.getElementById(id);
  const PLANTILLA = """ + J(PLANTILLA_HF) + """;
  $('hf-fondo').src = Vivo.base();
  const DUR = 6; let fps = 30, jugando = false, t0 = 0, desde = 0;
  // la misma línea de tiempo que la plantilla, más un subtítulo; PAUSADA, como en HyperFrames
  const tl = gsap.timeline({ paused: true });
  tl.fromTo('#hf-fondo', { scale: 1.15 }, { scale: 1, duration: DUR, ease: 'none' }, 0)
    .from('#hf-titulo', { y: 60, opacity: 0, duration: 0.6, ease: 'power3.out' }, 1)
    .from('#hf-sub', { y: 30, opacity: 0, duration: 0.5, ease: 'power2.out' }, 1.4)
    .to('#hf-titulo', { scale: 1.06, transformOrigin: 'left bottom', duration: 0.4, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 3.2);
  function ir(t) {
    t = Math.max(0, Math.min(DUR, t)); tl.seek(t); $('hf-t').value = t;
    const f = Math.min(Math.round(t * fps), DUR * fps - 1);
    $('hf-reloj').textContent = `cuadro ${f} de ${DUR * fps} · ${t.toFixed(2)} s · ${fps} fps`;
    const tira = $('hf-tira'); const n = 60; if (tira.children.length !== n) tira.innerHTML = '<i></i>'.repeat(n);
    [...tira.children].forEach((c, i) => c.classList.toggle('ya', i / n <= t / DUR));
  }
  function bucle(ms) {
    if (!jugando) return;
    ir(desde + (ms - t0) / 1000); if ($('hf-t').value >= DUR) { jugando = false; $('hf-play').textContent = '▶'; return; }
    requestAnimationFrame(bucle);
  }
  $('hf-play').onclick = () => {
    jugando = !jugando; $('hf-play').textContent = jugando ? '❚❚' : '▶';
    if (jugando) { desde = +$('hf-t').value >= DUR ? 0 : +$('hf-t').value; t0 = performance.now(); requestAnimationFrame(bucle); }
  };
  $('hf-t').oninput = (e) => { jugando = false; $('hf-play').textContent = '▶'; ir(+e.target.value); };
  function chips() {
    const c = $('hf-fps'); c.innerHTML = '';
    for (const f of [12, 24, 30, 60]) { const b = document.createElement('button'); b.type = 'button'; b.textContent = f + ' fps'; b.setAttribute('aria-pressed', String(f === fps)); b.onclick = () => { fps = f; chips(); ir(+$('hf-t').value); }; c.appendChild(b); }
  }
  // «render» de mentira, igual que el de verdad: cuadro a cuadro, sin importar el reloj
  $('hf-render').onclick = () => {
    jugando = false; let f = 0; const total = DUR * fps; const b = $('hf-render'); b.disabled = true;
    const paso = () => { ir(f / fps); b.textContent = `Cuadro ${f + 1} / ${total}`; f++; if (f < total) setTimeout(paso, 1000 / 60); else { b.textContent = `✓ ${total} cuadros → MP4 (FFmpeg)`; setTimeout(() => { b.disabled = false; b.textContent = 'Renderizar como HyperFrames'; }, 2600); } };
    paso();
  };
  $('hf-copiar').onclick = async (e) => { const ok = await Vivo.copiar(PLANTILLA); e.target.textContent = ok ? '✓ Copiada: pégala en index.html' : 'No pude copiar'; setTimeout(() => { e.target.textContent = 'Copiar plantilla (index.html con tu imagen)'; }, 2600); };
  chips(); ir(0);
})();""", vivo=True,
       pie="HyperFrames: github.com/heygen-com/hyperframes · código abierto, Apache 2.0", libs=("gsap.min.js",))

# ════════════════════════════════════════ 09 · Referencia Willie ════════════════════════════════════════
escena("09-referencia-willie", Y("Referencia: Willie (1928)", "reflexion", "", 3),
       "Referencia: Willie (1928)", "Reflexión", "or", "E09", """
    <h1 class="esc-titulo a-in">Referencia: <em>Willie</em> (1928)</h1>
    <section class="wi">
      <div class="esc-card a-in" style="--d:.1s">
        <ul class="esc-lista">
          <li><span><b>Dominio público</b> desde el 1 de enero de 2024 (Estados Unidos): el Mickey de <i>Steamboat Willie</i>, no el de años después.</span></li>
          <li><span>Se filmó a <b>24 fps</b> con dibujos <b>«en dos»</b>: 12 dibujos por segundo, cada uno dura dos cuadros.</span></li>
          <li><span>Estilo «manguera»: brazos y piernas que se doblan como goma, <b>estirar y encoger</b>.</span></li>
          <li><span>Hoy no la construimos: la pieza «Willie, difícil de explicar» está en <b>Materiales</b> como ejemplo terminado. Ábrela y compara con lo que hiciste.</span></li>
        </ul>
      </div>
      <div class="esc-card a-in" style="--d:.2s">
        <canvas id="bote" width="640" height="360" aria-label="Una pelota en unos y en dos"></canvas>
        <p class="nota">Arriba, <b>en unos</b> (24 dibujos por segundo). Abajo, <b>en dos</b> (12): el salto es el mismo, cambia la textura del movimiento.</p>
      </div>
    </section>""",
       css="""
.wi { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.2vw; align-items: center; }
.wi canvas { width: 100%; height: auto; display: block; border-radius: .7em; background: #f3ead6; }
.wi .esc-lista { font-size: .82em; }
@media (max-width: 900px) { .wi { grid-template-columns: 1fr; } }""",
       js="""
(() => {
  const c = document.getElementById('bote'), g = c.getContext('2d'), W = c.width, H = c.height, t0 = performance.now();
  function pelota(y0, t) {
    const u = (t % 1.2) / 1.2, alto = Math.abs(Math.sin(u * Math.PI)), y = y0 + 120 - alto * 100;
    const aplasta = alto < 0.12 ? 1 + (0.12 - alto) * 4 : 1;          // estira y encoge al tocar el piso
    const x = 60 + ((t * 120) % (W - 120));
    g.fillStyle = '#16151d'; g.beginPath(); g.ellipse(x, y, 22 * aplasta, 22 / aplasta, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#16151d55'; g.beginPath(); g.moveTo(0, y0 + 144); g.lineTo(W, y0 + 144); g.stroke();
  }
  (function dibujar(ms) {
    const t = (ms - t0) / 1000; g.clearRect(0, 0, W, H);
    pelota(0, Math.floor(t * 24) / 24); pelota(170, Math.floor(t * 12) / 12);
    g.fillStyle = '#5c5966'; g.font = '600 16px system-ui'; g.fillText('en unos · 24', 10, 20); g.fillText('en dos · 12', 10, 190);
    requestAnimationFrame(dibujar);
  })(t0);
})();""",
       pie="Steamboat Willie (1928) en Wikimedia Commons · enlace en Materiales")

# ════════════════════════════════════════ 10 · Tu pieza ════════════════════════════════════════
escena("10-tu-pieza", Y("Tu pieza: el pedido en seis partes", "experimentacion", "aplicar", 10, logre=True, umbral=60),
       "Tu pieza: el pedido en seis partes", "Aplicación", "ea", "E10", """
    <h1 class="esc-titulo a-in">Tu pieza: pídela a tu agente en <em>seis partes</em></h1>
    <section class="tp">
      <div class="sec a-in" style="--d:.1s">
        <label class="campo">Tu idea en una frase<input id="idea" type="text" placeholder="El gato pirata toca al amanecer mientras el barco se mece"></label>
        <div class="grupo"><span>Herramienta</span><div class="chips" id="libs"></div></div>
        <div class="grupo"><span>Movimientos</span><div class="chips" id="efectos"></div></div>
        <div class="grupo"><span>fps</span><div class="chips" id="fpss"></div><span>ciclo</span><div class="chips" id="ciclos"></div></div>
        <div class="grupo"><span>Formato</span><div class="chips" id="formatos"></div></div>
        <ul class="reglas">
          <li><b>Entrega:</b> carpeta <code>mi-pieza/</code> con <code>index.html</code> y tu imagen base, <code>FICHA_PROMPTS.md</code> (la receta FLUX, este pedido y tu corrección) y <code>capturas/</code>.</li>
          <li><b>Si sale mal:</b> un segundo pedido con <b>el lugar</b>, <b>el cambio</b> y «no toques nada más».</li>
        </ul>
      </div>
      <div class="sec a-in" style="--d:.2s">
        <pre class="pedido" id="pedido"></pre>
        <button type="button" id="copiar" class="grande">Copiar el pedido</button>
      </div>
    </section>""",
       css="""
.tp { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 1.2vw; align-items: start; }
.sec { display: grid; gap: .55em; min-width: 0; }
.campo { display: grid; gap: .3em; font-size: .74em; font-weight: 700; }
.campo input { font: .95em/1.3 inherit; font-weight: 400; padding: .45em .65em; border-radius: .6em; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); }
.grupo { display: flex; flex-wrap: wrap; gap: .35em .5em; align-items: center; }
.grupo > span { font-size: .68em; font-weight: 700; color: var(--muted); min-width: 5.5em; }
.chips { display: flex; flex-wrap: wrap; gap: .3em; }
.chips button { font: 600 .64em/1 system-ui, sans-serif; padding: .48em .7em; border-radius: 99px; border: 1px solid var(--line2); background: var(--s1); color: var(--fg); cursor: pointer; }
.chips button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.reglas { margin: 0; padding-left: 1.1em; font-size: .66em; color: var(--muted); } .reglas b, .reglas code { color: var(--fg); }
.pedido { font: .64em/1.55 var(--mono); background: #14122b; color: #e9e6ff; border-radius: .8em; padding: .8em 1em; margin: 0; white-space: pre-wrap; max-height: 56vh; overflow: auto; }
.pedido b { color: #c3b9ff; }
.grande { width: 100%; font: 700 .9em/1 system-ui, sans-serif; padding: .8em; border: 0; border-radius: .8em; background: var(--accent); color: var(--on-accent); cursor: pointer; }
@media (max-width: 900px) { .tp { grid-template-columns: 1fr; } }""",
       js="""
(() => {
  const $ = (id) => document.getElementById(id);
  const LIBS = {
    p5: { n: 'p5.js', cdn: 'p5.js 1.11.1 desde jsDelivr', ef: ['respira', 'flota y se mece', 'parallax por franjas', 'ondas de agua abajo', 'partículas que suben'] },
    three: { n: 'Three.js', cdn: 'Three.js 0.169 (módulo ES) desde jsDelivr', ef: ['postal que se mece', 'relieve por brillo', 'multiplano en tres capas', 'cámara que orbita', 'cubo con la imagen'] },
    gsap: { n: 'GSAP', cdn: 'GSAP 3.15 desde jsDelivr', ef: ['entrada con zoom', 'zoom y paneo de cámara', 'título que rebota', 'tifo de cartulinas (stagger)', 'eases distintos'] },
    hyperframes: { n: 'HyperFrames (video MP4)', cdn: 'GSAP 3.15 y el formato de HyperFrames', ef: ['acercamiento lento', 'título que entra', 'paneo de cámara', 'subtítulo con mi frase', 'cierre con fundido'] },
  };
  const FORMATOS = [['vertical 1080×1920', 1080, 1920], ['horizontal 1920×1080', 1920, 1080], ['cuadrado 1080×1080', 1080, 1080]];
  const st = { lib: 'p5', ef: [0, 2], fps: 24, ciclo: 6, formato: 0, idea: '' };
  try { Object.assign(st, JSON.parse(localStorage.getItem('s1-pedido') || '{}')); } catch (e) {}
  function chips(caja, items, activo, al) {
    caja.innerHTML = '';
    items.forEach((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = it; b.setAttribute('aria-pressed', String(activo(i))); b.onclick = () => { al(i); pintar(); }; caja.appendChild(b); });
  }
  function pedido() {
    const L = LIBS[st.lib], F = FORMATOS[st.formato], ef = st.ef.map((i) => L.ef[i]).filter(Boolean);
    const idea = st.idea.trim() || '(escribe tu idea en una frase)';
    const video = st.lib === 'hyperframes';
    return [
      ['ROL', `Eres un desarrollador creativo que anima ilustraciones con ${L.n} en un solo index.html.`],
      ['CONTEXTO', `Tengo una imagen base hecha con FLUX: assets/base.webp. Mi idea: «${idea}». La imagen no se cambia ni se regenera: el movimiento lo pone el código.`],
      ['TAREA', `Anima la imagen base con: ${ef.join(', ') || 'un movimiento suave'}. Un ciclo de ${st.ciclo} s${video ? '' : ' que se repite sin salto'}, a ${st.fps} fps, en formato ${F[0]}.`],
      ['LÍMITES', `Un solo index.html + assets/base.webp. ${L.cdn} con versión fija. Mueve por tiempo (segundos), no por cuadro. Sin texto dentro de la imagen. Respeta «reducir movimiento» (prefers-reduced-motion): la imagen queda quieta.${video ? ' Cumple el formato de HyperFrames: class="clip" con data-start y data-duration, una línea de tiempo GSAP pausada en window.__timelines["main"], sin Math.random sin semilla ni Date.now.' : ''}`],
      ['FORMATO', `Devuelve el index.html completo y, en tres líneas, dónde cambio los fps, la velocidad y la amplitud.`],
      ['COMPROBACIÓN', video
        ? `npx hyperframes check sin errores y npx hyperframes render -o renders/mi-pieza.mp4 da un video de ${st.ciclo} s exactos a ${st.fps} fps.`
        : `Abro index.html: el ciclo dura ${st.ciclo} s exactos, a ${st.fps} fps se ve igual de rápido que a 60 y con «reducir movimiento» queda quieta.`],
    ];
  }
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function pintar() {
    const L = LIBS[st.lib];
    chips($('libs'), Object.values(LIBS).map((l) => l.n), (i) => Object.keys(LIBS)[i] === st.lib, (i) => { st.lib = Object.keys(LIBS)[i]; st.ef = [0, 2]; });
    chips($('efectos'), L.ef, (i) => st.ef.includes(i), (i) => { st.ef = st.ef.includes(i) ? st.ef.filter((x) => x !== i) : [...st.ef, i].slice(-3); });
    chips($('fpss'), ['12', '24', '30', '60'], (i) => [12, 24, 30, 60][i] === st.fps, (i) => { st.fps = [12, 24, 30, 60][i]; });
    chips($('ciclos'), ['4 s', '6 s', '8 s', '10 s'], (i) => [4, 6, 8, 10][i] === st.ciclo, (i) => { st.ciclo = [4, 6, 8, 10][i]; });
    chips($('formatos'), FORMATOS.map((f) => f[0]), (i) => i === st.formato, (i) => { st.formato = i; });
    $('pedido').innerHTML = pedido().map(([k, v]) => `<b>${k}:</b> ${esc(v)}`).join('\\n\\n');
    try { localStorage.setItem('s1-pedido', JSON.stringify(st)); } catch (e) {}
  }
  $('idea').value = st.idea; $('idea').oninput = (e) => { st.idea = e.target.value; pintar(); };
  $('copiar').onclick = async (e) => {
    const t = pedido().map(([k, v]) => `${k}: ${v}`).join('\\n\\n');
    let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (x) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { ok = document.execCommand('copy'); } catch (y) {} a.remove(); }
    e.target.textContent = ok ? '✓ Copiado: pégalo en tu agente' : 'Selecciona el texto y cópialo'; setTimeout(() => { e.target.textContent = 'Copiar el pedido'; }, 2600);
  };
  pintar();
})();""",
       pie="Lo logré = tu imagen base se mueve en tu propio index.html (captura antes y después del segundo pedido)")

# ════════════════════════════════════════ 11 · Cierre ════════════════════════════════════════
escena("11-cierre", Y("Cierre", "experimentacion", "entregar", 3),
       "Cierre", "Aplicación", "ea", "E11", """
    <h1 class="esc-titulo a-in">Cierre: <em>una imagen</em>, mil movimientos</h1>
    <section class="esc-grid-3 a-in" style="--d:.1s">
      <div class="esc-card"><h3>Hoy</h3><p>FLUX y tu imagen base · fps · p5, Three.js y GSAP en vivo · HyperFrames: de HTML a video. Entrega la <b>tarea 1</b> desde el LMS (URL + commit).</p></div>
      <div class="esc-card"><h3>Domingo 22 · Web y landing que funcionan</h3><p>Trae el texto de un negocio real. Tu imagen base puede ser la portada.</p></div>
      <div class="esc-card"><h3>Domingo 29 · Animación y video con HyperFrames</h3><p>Trae tu pieza de hoy: la volvemos video MP4.</p></div>
    </section>""",
       pie="Pulsa «Lo logré» en Mi ruta")


def main():
    for leccion, curso in CURSOS.items():
        live = curso / "live" / leccion
        comun = curso / "live" / "_comun"
        if curso != AQUI:
            for f in COMUNES:
                shutil.copy2(AQUI / "live" / "_comun" / f, comun / f)
            shutil.copy2(AQUI / "materials" / "recursos-capas.zip", curso / "materials" / "recursos-capas.zip")
        for e in ESCENAS:
            d = live / e["carpeta"]
            d.mkdir(parents=True, exist_ok=True)
            (d / "escena.html").write_text(html(e, leccion))
            (d / "escena.yaml").write_text(yaml_texto(e["carpeta"], e["yaml"]))
        nuevas = {e["carpeta"] for e in ESCENAS}
        viejas = sorted(p.name for p in live.iterdir() if p.is_dir() and p.name not in nuevas)
        print(leccion, len(ESCENAS), "escenas · sobran:", viejas)


main()
