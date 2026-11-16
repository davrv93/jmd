#!/opt/homebrew/bin/python3.13
"""LIVE ipt-01 (IA para todos · sesión 1), rehecho el 15-11-2026: simple, minimalista y con ejemplos útiles.
Cada pedido tiene un botón que lo copia y abre DeepSeek Harness al lado de la escena (mensaje «abrir-dsh» al LMS):
el alumno solo pega (Ctrl+V) y presiona Enter. Los comandos del aula (aula sistema …) los ejecuta el propio agente.
Escribe live/ipt-01/<escena>/ y live/_comun/ipt.css + ipt.js. Uso: python3 _fuente/ipt01.py
"""
import html, json, shutil
from pathlib import Path

CURSO = Path(__file__).resolve().parent.parent
LIVE = CURSO / "live/ipt-01"
COMUN = CURSO / "live/_comun"
SISTEMAS = json.loads((Path(__file__).parent / "sistemas.json").read_text(encoding="utf-8"))
e = html.escape

CSS = """/* IA para todos · sesión 1: estilo mínimo de las escenas (lo escribe _fuente/ipt01.py). */
html, body { margin: 0; background: var(--bg); color: var(--fg); height: auto; min-height: 100%; }
/* escena.css fija body { height: 100%; overflow: hidden } para slides de una pantalla: aquí la escena hace scroll normal */
body { font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; overflow-y: auto; overflow-x: hidden; }
.ipt { max-width: 1080px; margin: 0 auto; padding: clamp(20px, 4vw, 48px) clamp(16px, 4vw, 40px) 72px; }
.ipt-paso { font: 600 13px/1 system-ui, sans-serif; color: var(--muted); margin: 0 0 14px; }
.ipt h1 { font: 800 clamp(28px, 4.2vw, 46px)/1.08 system-ui, sans-serif; letter-spacing: -.02em; margin: 0 0 12px; text-wrap: balance; }
.ipt h1 em { font-style: normal; color: var(--accent); }
.ipt-sub { font-size: clamp(16px, 1.6vw, 19px); color: var(--muted); margin: 0 0 28px; max-width: 62ch; text-wrap: pretty; }
.rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.rejilla.tres { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.tarjeta { background: var(--s1); border: 1px solid var(--line); border-radius: 18px; padding: 20px 22px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 10px; }
.tarjeta h2 { font: 700 19px/1.25 system-ui, sans-serif; margin: 0; }
.tarjeta p { margin: 0; color: var(--muted); }
.tarjeta .para { font-size: 15px; }
.tarjeta .rubro { font: 600 12px/1 system-ui, sans-serif; color: var(--accent); text-transform: uppercase; letter-spacing: .06em; }
.num { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-bg); color: var(--accent); font: 800 16px/1 system-ui, sans-serif; flex: none; }
.pedido { font: 14px/1.5 var(--mono); background: var(--s2); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin: 0; white-space: pre-wrap; color: var(--fg); }
.dir { font: 700 15px/1 var(--mono); background: var(--s2); border-radius: 8px; padding: 4px 8px; color: var(--fg); }
.boton { margin-top: auto; align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 12px; padding: 12px 16px;
  background: var(--accent); color: var(--on-accent); font: 700 15px/1 system-ui, sans-serif; cursor: pointer; transition: transform .15s, filter .15s; }
.boton:hover { filter: brightness(1.06); } .boton:active { transform: translateY(1px); }
.boton.sec { background: var(--accent-bg); color: var(--accent); }
.boton.grande { font-size: 18px; padding: 16px 22px; border-radius: 14px; }
.boton.ok { background: var(--ok); color: #fff; }
.boton svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.lista { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
.lista li { display: flex; gap: 14px; align-items: flex-start; background: var(--s1); border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
.lista li b { display: block; font-size: 17px; margin-bottom: 2px; }
.lista li span { color: var(--muted); }
.calma { margin: 26px 0 0; padding: 16px 18px; border-radius: 14px; background: var(--ok-bg); color: var(--fg); font-size: 15px; }
.cuidado { margin: 18px 0 0; padding: 14px 18px; border-radius: 14px; background: var(--warn-bg); font-size: 15px; }
.fila { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.ipt-toast { position: fixed; left: 50%; bottom: 22px; transform: translate(-50%, 16px); opacity: 0; pointer-events: none; z-index: 9;
  background: #16151d; color: #fff; border-radius: 12px; padding: 12px 16px; font: 600 15px/1.35 system-ui, sans-serif; max-width: min(92vw, 560px);
  box-shadow: 0 10px 30px -10px rgba(0,0,0,.5); transition: opacity .2s, transform .2s; text-align: center; }
.ipt-toast.ver { opacity: 1; transform: translate(-50%, 0); }
@media (prefers-color-scheme: dark) { .ipt-toast { background: #ecebf7; color: #14122b; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
"""

JS = """// IA para todos · sesión 1: un clic copia el pedido y abre DeepSeek Harness al lado de la escena.
// El LMS escucha {tipo: "abrir-dsh"} (pestaña DeepSeek Harness) y {tipo: "dsh-clave"} (guardar tu clave).
window.IPT = (() => {
  const toast = document.getElementById('ipt-toast');
  let t = null;
  const avisar = (txt) => { if (!toast) return; toast.textContent = txt; toast.classList.add('ver'); clearTimeout(t); t = setTimeout(() => toast.classList.remove('ver'), 5200); };
  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) { /* abajo */ }
    try { await window.parent.navigator.clipboard.writeText(txt); return true; } catch (e) { /* abajo */ }
    const a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* sin portapapeles */ } a.remove(); return ok;
  }
  const aLMS = (msg) => { try { window.parent.postMessage(msg, location.origin); } catch (e) { /* fuera del LMS */ } };
  async function abrir(txt) {
    const ok = await copiar(txt);
    aLMS({ tipo: 'abrir-dsh' });
    avisar(ok ? 'Listo: pégalo en DeepSeek Harness (Ctrl+V o ⌘V) y presiona Enter.' : 'Abrí DeepSeek Harness: copia el texto de la tarjeta y pégalo ahí.');
  }
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pedido], [data-pedido-de]');
    if (b) {
      const txt = b.dataset.pedido || (document.getElementById(b.dataset.pedidoDe) || {}).textContent || '';
      abrir(txt.trim()); b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 2400); return;
    }
    if (ev.target.closest('[data-abrir-dsh]')) { aLMS({ tipo: 'abrir-dsh' }); avisar('DeepSeek Harness está abierto al lado.'); return; }
    if (ev.target.closest('[data-clave]')) { aLMS({ tipo: 'dsh-clave' }); avisar('Se abrió una pestaña para guardar tu clave. Vuelve aquí cuando termines.'); }
  });
  return { abrir, copiar };
})();
"""

ICONO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6"/></svg>'


def boton_pedido(id_pre, texto="Usar en DeepSeek", clase=""):
    return f'<button class="boton {clase}" type="button" data-pedido-de="{id_pre}">{texto} {ICONO}</button>'


def pagina(n, titulo, h1, sub, cuerpo):
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(titulo)} · IA para todos</title>
<!-- Generada por _fuente/ipt01.py: edita ahí y vuelve a correrlo. -->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/ipt.css">
<style>@media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; }} }}</style>
</head>
<body>
<main class="ipt">
  <p class="ipt-paso">Sesión 1 · {n} de 6</p>
  <h1>{h1}</h1>
  <p class="ipt-sub">{sub}</p>
{cuerpo}
</main>
<div class="ipt-toast" id="ipt-toast" role="status" aria-live="polite"></div>
<script src="../../comun/ipt.js"></script>
</body>
</html>
"""


def tarjeta_pedido(i, titulo, para, pedido):
    return f"""    <article class="tarjeta">
      <h2>{e(titulo)}</h2>
      <p class="para">{e(para)}</p>
      <pre class="pedido" id="p{i}">{e(pedido)}</pre>
      {boton_pedido(f"p{i}")}
    </article>"""


ESCENAS = []

# 1 · Hoy
ESCENAS.append(("01-hoy", dict(titulo="Hoy, en tres pasos", fase="experiencia", paso="ver", duracion_min=5, compuerta="presentes"), pagina(
    1, "Hoy, en tres pasos", "Hoy, en <em>tres pasos</em>",
    "Tú pides en español; el agente lee, escribe y ejecuta por ti. No necesitas saber programar.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Tu clave de DeepSeek</b><span>Creas tu cuenta, recargas un poco y guardas tu clave.</span></div></li>
    <li><span class="num">2</span><div><b>Abres DeepSeek Harness</b><span>Tu asistente aparece al lado de esta pantalla, listo para trabajar.</span></div></li>
    <li><span class="num">3</span><div><b>Eliges un sistema y le pides cosas útiles</b><span>Que te lo explique, que haga un manual, un mapa y «la foto» del sistema.</span></div></li>
  </ol>
  <p class="calma">Vamos juntos y a tu ritmo. Si algo no sale a la primera, es normal: levanta la mano y lo vemos.</p>""")))

# 2 · Tu clave
ESCENAS.append(("02-tu-clave", dict(titulo="Tu cuenta y tu clave", fase="experiencia", paso="ver", duracion_min=15, compuerta="lo_logre"), pagina(
    2, "Tu cuenta y tu clave", "Tu cuenta y tu <em>clave</em>",
    "Una sola vez. Con tu clave, DeepSeek Harness trabaja con tu propio saldo.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Entra a <span class="dir">platform.deepseek.com</span></b><span>Escríbelo tú en el navegador. Es la plataforma para desarrolladores, distinta del chat de DeepSeek.</span></div></li>
    <li><span class="num">2</span><div><b>Recarga un monto pequeño en «Top Up»</b><span>Antes de pagar, mira en pantalla el monto mínimo y las comisiones. El saldo recargado no caduca.</span></div></li>
    <li><span class="num">3</span><div><b>Crea tu clave en «API keys» y cópiala</b><span>Solo se muestra una vez: guárdala en un lugar seguro, como un gestor de contraseñas.</span></div></li>
    <li><span class="num">4</span><div><b>Guárdala en el LMS</b><span>Se abre una pestaña: pega tu clave, guarda y vuelve aquí.</span>
      <div class="fila" style="margin-top:10px"><button class="boton" type="button" data-clave>Guardar mi clave """ + ICONO + """</button></div></div></li>
  </ol>
  <p class="cuidado">Tu clave es como una contraseña: no la pegues en el chat de Zoom ni en WhatsApp.</p>""")))

# 3 · Abrir DeepSeek Harness
ESCENAS.append(("03-abrir-dsh", dict(titulo="Abre DeepSeek Harness", fase="experiencia", paso="dsh", duracion_min=10, compuerta="lo_logre", dsh=True), pagina(
    3, "Abre DeepSeek Harness", "Abre <em>DeepSeek Harness</em>",
    "Aparece al lado de esta pantalla. La primera vez, elige tu carpeta de trabajo.",
    """  <div class="fila" style="margin-bottom:22px"><button class="boton grande" type="button" data-abrir-dsh>Abrir DeepSeek Harness """ + ICONO + """</button></div>
  <ol class="lista">
    <li><span class="num">1</span><div><b>Toca «Choose workspace»</b><span>Es el botón para elegir dónde trabajará el asistente.</span></div></li>
    <li><span class="num">2</span><div><b>Elige la carpeta «trabajo» y toca «Open»</b><span>Ahí quedará todo lo que hagas hoy.</span></div></li>
    <li><span class="num">3</span><div><b>Salúdalo</b><span>Copia este saludo con el botón, pégalo y presiona Enter.</span></div></li>
  </ol>
  <div class="tarjeta" style="margin-top:16px">
    <pre class="pedido" id="saludo">Hola. En una línea, dime qué puedes hacer por mí en esta carpeta.</pre>
    """ + boton_pedido("saludo", "Copiar y abrir") + """
  </div>
  <p class="calma">Si te pide una clave, vuelve al paso anterior y guárdala. No pasa nada: se arregla en un minuto.</p>""")))

# 4 · Elige tu sistema (15)
tarjetas = []
for i, s in enumerate(SISTEMAS):
    pedido = (f"Ejecuta en la terminal: aula sistema {s['id']}\n"
              f"Cuando termine, lee el sistema «{s['nombre']}» que quedó en /trabajo/sistema y cuéntame en 5 líneas simples, "
              "sin tecnicismos: qué negocio atiende, quién lo usa y las 3 cosas más importantes que hace.")
    negocio = s["negocio"].split(":")[0].split(".")[0]
    tarjetas.append(f"""    <article class="tarjeta">
      <span class="rubro">{e(s['rubro'])}</span>
      <h2>{e(s['nombre'])}</h2>
      <p class="para">{e(negocio)}.</p>
      <button class="boton sec" type="button" data-pedido="{e(pedido)}">Usar este {ICONO}</button>
    </article>""")
ESCENAS.append(("04-tu-sistema", dict(titulo="Elige tu sistema", fase="experimentacion", paso="dsh", duracion_min=10, compuerta="lo_logre", dsh=True), pagina(
    4, "Elige tu sistema", "Elige <em>tu sistema</em>",
    "Son 15 negocios de práctica, con sus usuarios y reportes. Elige el que más se parezca a tu trabajo: el asistente lo prepara y te lo explica.",
    '  <div class="rejilla">\n' + "\n".join(tarjetas) + "\n  </div>")))

# 5 · Ejemplos útiles
EJEMPLOS = [
    ("Explícamelo como a mi jefe", "Entiende en un minuto un sistema que no conoces.",
     "Lee el sistema de /trabajo/sistema y explícamelo como a un gerente que no programa: para qué sirve, quién lo usa y qué problema resuelve. Máximo 8 líneas, en español sencillo."),
    ("¿Quién puede hacer qué?", "Los usuarios y sus permisos, en una tabla clara.",
     "En /trabajo/sistema busca los roles de usuario y arma una tabla: rol, qué puede hacer y qué no. Al lado de cada fila pon dónde lo viste (archivo:línea). Guárdala en docs/roles.md."),
    ("Un manual de una página", "Una guía para quien recién empieza a usarlo.",
     "Escribe un manual de una página para el rol que más usa el sistema de /trabajo/sistema: su tarea diaria en pasos numerados, en lenguaje simple, con un consejo útil al final. Guárdalo en docs/manual.md."),
    ("El mapa del sistema", "Un dibujo de cómo se conectan sus partes.",
     "Dibuja el mapa de /trabajo/sistema con un diagrama Mermaid: pantallas, datos principales y cómo se conectan. Guárdalo en docs/mapa.md con una explicación de 5 líneas."),
    ("La foto del sistema", "El registro de cómo está hoy, para comparar en la próxima clase.",
     "Ejecuta en la terminal: aula sistema foto\nLuego resúmeme en 6 viñetas lo que dice FOTO/FOTO.md y dime qué archivos quedaron en la carpeta FOTO."),
    ("Comprueba 5 afirmaciones", "Separa lo que dice el código de lo que falta confirmar.",
     "Elige 5 afirmaciones de FOTO/FOTO.md y compruébalas en el código de /trabajo/sistema. Para cada una pon «confirmada» o «por verificar», con archivo:línea. Guárdalo en docs/verificacion.md."),
    ("Mejoras de seguridad", "Tres mejoras concretas, de la más importante a la menos.",
     "Revisa con calma la seguridad de /trabajo/sistema y dame las 3 mejoras más importantes: dónde está (archivo:línea), por qué importa y cómo se arregla, en 2 líneas cada una."),
    ("Un correo claro para tu cliente", "Para tu día a día: un mensaje profesional en segundos.",
     "Escribe un correo breve y amable para un cliente: su pedido llegará 2 días tarde y le ofrecemos envío gratis en su próxima compra. Dame dos versiones: una formal y una cercana."),
]
ESCENAS.append(("05-ejemplos", dict(titulo="Pídele cosas útiles", fase="experimentacion", paso="dsh", duracion_min=30, compuerta="lo_logre", dsh=True), pagina(
    5, "Pídele cosas útiles", "Pídele <em>cosas útiles</em>",
    "Toca un ejemplo: se copia y se abre DeepSeek Harness. Pega con Ctrl+V (⌘V en Mac) y presiona Enter. Puedes cambiar el texto antes de enviarlo.",
    '  <div class="rejilla">\n' + "\n".join(tarjeta_pedido(i, *x) for i, x in enumerate(EJEMPLOS)) + "\n  </div>")))

# 6 · Cierre
ESCENAS.append(("06-cierre", dict(titulo="Tu tarea y lo que sigue", fase="reflexion", paso="ver", duracion_min=5, compuerta="presentes"), pagina(
    6, "Tu tarea y lo que sigue", "Tu tarea, en <em>tres cosas</em>",
    "Lo que hiciste hoy ya es la mayor parte. Termínalo con calma esta semana.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>La foto de tu sistema</b><span>La carpeta FOTO (ejemplo «La foto del sistema»).</span></div></li>
    <li><span class="num">2</span><div><b>Tus 5 afirmaciones comprobadas</b><span>El archivo docs/verificacion.md (ejemplo «Comprueba 5 afirmaciones»).</span></div></li>
    <li><span class="num">3</span><div><b>Un documento que te sirva</b><span>El manual, el mapa o la tabla de roles: el que más te guste.</span></div></li>
  </ol>
  <div class="tarjeta" style="margin-top:16px">
    <h2>Empaca tu entrega</h2>
    <pre class="pedido" id="entrega">Empaqueta mi entrega: crea entrega-s1.zip con las carpetas FOTO y docs de /trabajo/sistema, y dime qué archivos incluiste.</pre>
    """ + boton_pedido("entrega", "Copiar y abrir") + """
  </div>
  <p class="calma">Próxima clase, domingo 22 a las 7:30 p. m.: medimos cuánto gasta el asistente y aprendemos a gastar menos. ¡Buen trabajo hoy!</p>""")))


def yaml(id_, m):
    lineas = [f"id: {id_}", f'titulo: "{m["titulo"]}"', f"fase: {m['fase']}", f"paso: {m['paso']}", f"duracion_min: {m['duracion_min']}",
              "lo_logre: true", "evidencia: ninguna", "umbral_pct: 80", f"compuerta: {m['compuerta']}"]
    if m.get("dsh"):
        lineas.append("dsh: true")
    return "\n".join(lineas) + "\n"


if __name__ == "__main__":
    (COMUN / "ipt.css").write_text(CSS, encoding="utf-8")
    (COMUN / "ipt.js").write_text(JS, encoding="utf-8")
    nuevas = {id_ for id_, _, _ in ESCENAS}
    for d in sorted(LIVE.iterdir()):
        if d.is_dir() and d.name not in nuevas:
            shutil.rmtree(d)                       # las escenas viejas siguen en el historial de git
    for id_, meta, pag in ESCENAS:
        d = LIVE / id_; d.mkdir(parents=True, exist_ok=True)
        (d / "escena.html").write_text(pag, encoding="utf-8")
        (d / "escena.yaml").write_text(yaml(id_, meta), encoding="utf-8")
        print("ok", id_)
