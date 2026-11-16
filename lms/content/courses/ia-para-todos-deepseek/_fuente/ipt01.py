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
    const v = ev.target.closest('[data-visor]');
    if (v) { aLMS({ tipo: 'abrir-visor', ruta: v.dataset.visor }); avisar('Abrí el Visor. Si sale vacío, espera a que DeepSeek Harness termine y toca de nuevo.'); return; }
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


# Escenas hechas a mano (no las escribe este script): no se borran al regenerar.
# 05b-en-tu-oficio: landing estilo Apple con GSAP y fotos de los cuatro oficios.
A_MANO = {"05b-en-tu-oficio"}

ESCENAS = []

# 1 · Hoy
ESCENAS.append(("01-hoy", dict(titulo="Hoy, en tres pasos", fase="experiencia", paso="ver", duracion_min=5, compuerta="presentes"), pagina(
    1, "Hoy, en tres pasos", "Hoy, en <em>tres pasos</em>",
    "Tú pides en español; el agente lee, escribe y ejecuta por ti. No necesitas saber programar.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Tu clave de DeepSeek</b><span>Creas tu cuenta, recargas un poco y guardas tu clave.</span></div></li>
    <li><span class="num">2</span><div><b>Abres DeepSeek Harness</b><span>Tu asistente aparece al lado de esta pantalla, listo para trabajar.</span></div></li>
    <li><span class="num">3</span><div><b>Le pides cosas de tu día a día</b><span>Un mensaje difícil, un resumen, una lista de compras o una calculadora de precios: lo que te sirva.</span></div></li>
  </ol>
  <p class="calma">Vamos juntos y a tu ritmo. Si algo no sale a la primera, es normal: levanta la mano y lo vemos.</p>""")))

# 2 · Tu clave
ESCENAS.append(("02-tu-clave", dict(titulo="Tu cuenta y tu clave", fase="experiencia", paso="cuenta", duracion_min=15, compuerta="lo_logre"), pagina(
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

# 4 · Pídele ayuda al instante (respuestas en el chat)
AYUDA = [
    ("Un mensaje difícil por WhatsApp", "Para decir algo incómodo sin sonar mal.",
     "Ayúdame a escribir un mensaje amable por WhatsApp para recordarle a un cliente que me debe S/ 150 desde hace dos semanas. Que no suene a reclamo. Dame dos versiones cortas."),
    ("Corrige mi texto", "Ortografía y redacción, sin cambiar lo que quieres decir.",
     "Corrige la ortografía y la redacción de este texto sin cambiar lo que quiero decir, y dime en una lista qué corregiste:\n[pega aquí tu texto]"),
    ("Explícamelo fácil", "Cualquier tema, con un ejemplo de la vida diaria.",
     "Explícame qué es la inflación como si tuviera 12 años, con un ejemplo de compras en el mercado. Máximo 6 líneas."),
    ("Resume un texto largo", "Lo importante en 5 puntos y qué te toca hacer.",
     "Resume este texto en 5 viñetas y dime al final las 2 cosas que tengo que hacer:\n[pega aquí el texto]"),
    ("Ideas para vender más", "Para tu negocio o emprendimiento.",
     "Tengo una pequeña bodega en mi barrio. Dame 5 ideas sencillas y baratas para vender más este mes, con un ejemplo concreto de cada una."),
    ("Publicaciones para redes", "Textos listos para Facebook o Instagram.",
     "Escribe 3 publicaciones para Facebook de una pastelería casera que vende tortas por pedido: una de lanzamiento, una de oferta y una de agradecimiento. Tono cercano, con algunos emojis."),
    ("Prepárame para una entrevista", "Practica antes de ir.",
     "Voy a una entrevista de trabajo para asistente administrativo. Hazme 5 preguntas que me podrían hacer y dime cómo responder cada una de forma natural y segura."),
    ("Una receta con lo que tengo", "Cocina con lo que hay en casa.",
     "Tengo arroz, huevos, cebolla, tomate y atún. Dame una receta fácil para 3 personas en 30 minutos, paso a paso."),
]
ESCENAS.append(("04-ayuda-al-instante", dict(titulo="Pídele ayuda al instante", fase="experimentacion", paso="ayuda", duracion_min=20, compuerta="lo_logre", dsh=True), pagina(
    4, "Pídele ayuda al instante", "Pídele ayuda <em>al instante</em>",
    "Toca un ejemplo: se copia y se abre DeepSeek Harness. Pega con Ctrl+V (⌘V en Mac) y presiona Enter. Cambia los datos por los tuyos cuando quieras.",
    '  <div class="rejilla">\n' + "\n".join(tarjeta_pedido(f"a{i}", *x) for i, x in enumerate(AYUDA)) + "\n  </div>")))

# 5 · Crea algo que puedas usar (archivos que se ven en el Visor)
CREA = [
    ("Lista de compras con casillas", "Marca lo que ya compraste desde tu celular.", "compras",
     "Crea una página web sencilla en la carpeta compras (compras/index.html) con mi lista de compras de la semana agrupada por secciones (frutas y verduras, abarrotes, limpieza), con casillas para marcar lo que ya compré y un botón para borrar lo marcado. Que se vea bonita en el celular y que guarde las marcas en el navegador."),
    ("Calculadora de precios", "Cuánto cobrar para ganar lo que quieres.", "precios",
     "Crea en la carpeta precios (precios/index.html) una calculadora simple: escribo cuánto me cuesta un producto y qué ganancia quiero en %, y me dice el precio de venta sin IGV y con IGV (18 %). Letras grandes y claras."),
    ("Mi semana organizada", "Pendientes de lunes a domingo.", "semana",
     "Crea en la carpeta semana (semana/index.html) un planificador de lunes a domingo con mañana, tarde y noche, donde pueda escribir mis pendientes y que se guarden en el navegador. Sencillo y bonito."),
    ("Control de gastos del mes", "Anota y mira en qué se va tu dinero.", "gastos",
     "Crea en la carpeta gastos (gastos/index.html) una página para anotar mis gastos del mes (fecha, en qué, cuánto y categoría) que me muestre el total y cuánto gasté en cada categoría, y que guarde todo en el navegador."),
    ("Tarjeta de presentación digital", "Para compartir por WhatsApp.", "tarjeta",
     "Crea en la carpeta tarjeta (tarjeta/index.html) una tarjeta de presentación digital elegante con mi nombre, a qué me dedico, mi WhatsApp y un botón para escribirme. Usa datos de ejemplo que yo pueda cambiar después."),
    ("La carta de un restaurante", "Bonita para mostrar en el celular.", "carta",
     "Crea en la carpeta carta (carta/index.html) la carta de un restaurante de comida criolla con 3 entradas, 4 platos de fondo y 2 postres, con precios en soles. Sin fotos, pero que se vea elegante en el celular."),
]
def tarjeta_crea(i, titulo, para, carpeta, pedido):
    return f"""    <article class="tarjeta">
      <h2>{e(titulo)}</h2>
      <p class="para">{e(para)}</p>
      <pre class="pedido" id="c{i}">{e(pedido)}</pre>
      <div class="fila">{boton_pedido(f"c{i}")}<button class="boton sec" type="button" data-visor="{carpeta}/index.html">Ver el resultado</button></div>
    </article>"""
ESCENAS.append(("05-crea-algo-util", dict(titulo="Crea algo que puedas usar", fase="experimentacion", paso="crear", duracion_min=30, compuerta="lo_logre", dsh=True), pagina(
    5, "Crea algo que puedas usar", "Crea algo que <em>puedas usar</em>",
    "DeepSeek Harness también hace páginas que funcionan. Pide una, espera a que termine y toca «Ver el resultado»: se abre en el Visor, al lado.",
    '  <div class="rejilla">\n' + "\n".join(tarjeta_crea(i, *x) for i, x in enumerate(CREA)) + "\n  </div>")))

# 6 · Cierre
ESCENAS.append(("06-cierre", dict(titulo="Tu tarea y lo que sigue", fase="reflexion", paso="ver", duracion_min=5, compuerta="presentes"), pagina(
    6, "Tu tarea y lo que sigue", "Tu tarea: hazlo <em>tuyo</em>",
    "Lo mejor de hoy es que ya sabes pedir. Esta semana, úsalo para algo real.",
    """  <ol class="lista">
    <li><span class="num">1</span><div><b>Una ayuda real</b><span>Usa un ejemplo de «Pídele ayuda» con tu caso de verdad: tu mensaje, tu texto, tu negocio.</span></div></li>
    <li><span class="num">2</span><div><b>Una herramienta para ti</b><span>Pide una de «Crea algo» con tus datos: tu lista, tus precios o tus gastos.</span></div></li>
    <li><span class="num">3</span><div><b>Comparte tu favorito</b><span>Sube una captura a la tarea del curso y cuéntanos para qué te sirvió.</span></div></li>
  </ol>
  <div class="tarjeta" style="margin-top:16px">
    <h2>¿Qué hiciste hoy?</h2>
    <pre class="pedido" id="repaso">Dime qué carpetas y archivos creamos hoy en esta carpeta de trabajo y para qué sirve cada uno, en una lista corta.</pre>
    """ + boton_pedido("repaso", "Copiar y abrir") + """
  </div>
  <p class="calma">Próxima clase, domingo 22 a las 7:30 p. m.: aprendemos a pedir mejor y a gastar menos saldo. ¡Buen trabajo hoy!</p>""")))


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
        if d.is_dir() and d.name not in nuevas and d.name not in A_MANO:
            shutil.rmtree(d)                       # las escenas viejas siguen en el historial de git
    for id_, meta, pag in ESCENAS:
        d = LIVE / id_; d.mkdir(parents=True, exist_ok=True)
        (d / "escena.html").write_text(pag, encoding="utf-8")
        (d / "escena.yaml").write_text(yaml(id_, meta), encoding="utf-8")
        print("ok", id_)
