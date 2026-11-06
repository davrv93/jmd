#!/usr/bin/env python3
"""Genera las escenas LIVE de la charla 2 (cs-02) y live/_comun/. Uso: python3 _fuente/escenas_cs02.py
No toca cs-01: esa charla sale de _fuente/escenas.py y lleva su estilo dentro de cada escena.
Los datos de las maquetas salen de correr la demo de verdad: charla-seguridad-2-gateway, npm run comparar."""
import base64
import shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent
LIVE = AQUI.parent / "live"
ESCENAS_DIR = LIVE / "cs-02"

# La CSP de las escenas solo deja cargar fuentes desde data:, así que Outfit va dentro del CSS.
fuente = base64.b64encode((AQUI / "outfit.woff2").read_bytes()).decode()
(LIVE / "_comun").mkdir(parents=True, exist_ok=True)
(LIVE / "_comun" / "escena.css").write_text(
    '@font-face{font-family:Outfit;font-style:normal;font-weight:100 900;font-display:swap;'
    f'src:url(data:font/woff2;base64,{fuente}) format("woff2")}}\n' + (AQUI / "estilo-cs02.css").read_text(encoding="utf-8"), encoding="utf-8")
shutil.copyfile(AQUI / "escena-cs02.js", LIVE / "_comun" / "escena.js")

ICONOS = {
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "x": '<path d="M6 6l12 12M18 6L6 18"/>',
    "flecha": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "alerta": '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
}


def ic(n):
    return f'<svg class="i" viewBox="0 0 24 24" aria-hidden="true">{ICONOS[n]}</svg>'


def lista(*items, no=False, clase="a a3"):
    icono = ic("x") if no else ic("check")
    return f'<ul class="lista {"no " if no else ""}{clase}">' + "".join(f"<li>{icono}<span>{t}</span></li>" for t in items) + "</ul>"


def demo(texto):
    return f'<p class="demo a a4"><b>Pasa a la demo</b><span>{texto}</span></p>'


def ventana(titulo, cuerpo, etiqueta):
    return f'<div class="win a a2" role="img" aria-label="{etiqueta}"><div class="win-b"><i></i><i></i><i></i><span>{titulo}</span></div><div class="win-c">{cuerpo}</div></div>'


FL = f'<div class="fl" aria-hidden="true">{ic("flecha")}</div>'

PUNTOS = [
    ("Ninguna clave en el código ni en git", "Tu proceso"),
    ("Toda entrada validada en el servidor", "Gateway y servicio"),
    ("Consultas preparadas, sin texto armado a mano", "Servicio"),
    ("Cada ruta comprueba quién pide y qué pide", "Gateway y servicio"),
    ("Errores genéricos en pantalla", "Gateway"),
    ("Auditoría de dependencias sin pendientes", "Tu proceso"),
]

ETAPAS = [
    ("Tamaño", "Corta el cuerpo gigante antes de leerlo."),
    ("Límite", "Frena la ráfaga antes de gastar CPU en descifrar."),
    ("Sesión", "Sin cookie válida no hay nada que conversar."),
    ("Ruta", "Si la ruta no es de esta sesión, para afuera no existe."),
    ("Descifrar", "AES-GCM detecta cualquier cambio en el mensaje."),
    ("Anti-repetición", "Tiempo y nonce: cada petición sirve una sola vez."),
    ("Validar", "Solo pasan los campos del esquema. Un monto de más se rechaza."),
    ("Permiso", "El gateway mira el rol. El backend mira si la factura es tuya."),
    ("Traducir", "Del código opaco a la ruta real, que el cliente nunca ve."),
    ("Filtrar", "Solo salen los campos de la lista blanca."),
    ("Registrar", "Quién, qué y por qué se rechazó. Sin datos sensibles."),
]


def ataque(n, titulo, pregunta, mal, bien, motivo):
    return f"""<div class="c a a2"><h3>{titulo}</h3><p>{pregunta}</p>
<button class="sec" type="button" data-revelar="#r{n}">Ver qué pasó</button>
<div id="r{n}" class="col" hidden><p><span class="chip paso">Sin gateway · 200</span><br>{mal}</p><p><span class="chip freno">Con gateway · {bien}</span><br>{motivo}</p></div></div>"""


PEDIDO = ("Revisa esta API como atacante, con el OWASP API Security Top 10 (2023). Por cada ruta dime qué pasa si cambio el id, "
          "si repito la petición y si mando un campo de más. Dame archivo y línea, la corrección y una prueba que demuestre "
          "que quedó cerrado. Si no estás seguro, dilo.")

ESCENAS = [
    ("01-bienvenida", "Payloads y rutas ofuscadas, con patrón gateway", "experiencia", "ver", 1, f"""<main class="s">
<p class="k a">JMD Learning · Charla 2 de la serie de seguridad</p>
<h1 class="a a2">Payloads y rutas ofuscadas, con <em>patrón gateway</em></h1>
<p class="sub a a3">Hoy viernes 6 de noviembre · 4:30 p. m. · 35 minutos</p>
<ol class="agenda a a3"><li><b>1</b> Repaso de conceptos</li><li><b>2</b> Simulaciones en vivo</li><li><b>3</b> Cómo llevarlo a tu empresa</li></ol>
<p class="remate a a4">Ofuscar no es seguridad. Hoy vemos <em>qué sí lo es</em>.</p>
</main>"""),
    ("02-repaso-charla-1", "De la charla 1 a hoy", "reflexion", "ver", 2, f"""<main class="s">
<p class="k a">Repaso · Charla 1</p><h2 class="a a2">¿Dónde vive cada punto de <em>tu lista</em>?</h2>
<div class="puntos a a3">""" + "".join(f'<div><span>{t}</span><span class="chip dato lugar" hidden>{l}</span></div>' for t, l in PUNTOS) + """</div>
<div class="fila a a4"><button type="button" data-revelar=".lugar">Ver dónde va</button><span class="sub">Piénsalo primero: ¿gateway, servicio o tu proceso?</span></div>
<p class="remate a a4">El gateway <em>concentra</em>. No reemplaza.</p>
</main>"""),
    ("03-sin-gateway", "Demo 1 · Sin gateway", "experiencia", "ver", 3, f"""<main class="s dos">
<div class="col"><p class="k a">Demo 1 · Sin gateway</p><h2 class="a a2">Lo que le <em>regalas</em> a quien mira</h2>
<p class="a a3">Cuenta las pistas en 30 segundos.</p>
<ul class="pistas a a3"><li>cliente: 1042</li><li>factura: F-2001</li><li>versión: v1</li><li>monto</li><li>costo_interno</li><li>margen_pct</li><li>dni</li><li>X-Powered-By</li><li>X-Backend</li></ul>
{demo('Cliente 1 · Sin gateway. F12, pestaña Red.')}</div>
{ventana('Red · herramientas del navegador', '''<pre>POST <mark>/api/v1/clientes/1042/facturas/F-2001/pagar</mark>
Authorization: Bearer …
{ "<mark>monto</mark>": 120.5, "moneda": "PEN" }</pre>
<pre>GET /api/v1/facturas/F-2003  → 200
X-Powered-By: <mark>DemoFramework/1.0</mark>
X-Backend: <mark>api-01.interna.bodega-demo</mark>
{ "<mark>costo_interno</mark>": 240, "<mark>margen_pct</mark>": 22.8,
  "cliente": { "nombre": "Beto Demo", "<mark>dni</mark>": "00000002" } }</pre>''', 'Maqueta del tráfico sin gateway: ruta descriptiva, monto, cabeceras y campos internos a la vista')}
</main>"""),
    ("04-ofuscar-cifrar", "Ofuscar, cifrar y proteger", "conceptualizacion", "ver", 3, f"""<main class="s dos">
<div class="col"><p class="k a">Conceptos</p><h2 class="a a2">Tres palabras que <em>no</em> son lo mismo</h2>
<div class="col a a3"><p><b>Ofuscar:</b> esconde el sentido. No hay clave. Sube el costo de entender.</p>
<p><b>Cifrar:</b> sin la clave no se lee. El secreto es la clave, no el método.</p>
<p><b>Proteger:</b> el servidor decide quién puede hacer qué.</p></div></div>
<div class="c lab a a2" data-lab><h3>Pruébalo aquí: AES-GCM de verdad</h3>
<input type="text" value="Pagar F-2001" aria-label="Mensaje" maxlength="40">
<div class="fila"><button type="button" data-accion="cifrar">Cifrar</button><button type="button" class="sec" data-accion="tocar" disabled>Cambiar un bit</button><button type="button" class="sec" data-accion="abrir" disabled>Abrir</button><button type="button" class="sec" data-accion="base64">Solo Base64</button></div>
<pre aria-live="polite">Escribe y cifra</pre><p class="res" role="status"></p></div>
</main>"""),
    ("05-no-es-seguridad", "Ofuscar no es seguridad", "conceptualizacion", "ver", 3, f"""<main class="s">
<p class="k a">Lo más importante de hoy</p><h2 class="a a2">Ofuscar <em>no</em> es seguridad</h2>
<div class="flujo a a2"><div class="n alerta">Navegador<span>Clave, mensaje y ruta, antes de cifrar</span></div>{FL}<div class="n">Red<span>Con TLS, cifrada. Se ve IP, hora y tamaño</span></div>{FL}<div class="n top">Servidor<span>Aquí se decide de verdad</span></div></div>
<div class="tri">
<div class="c mal a a3"><h3>Quien controla el navegador</h3><p>Ve la clave y el payload antes de cifrar. También puede llamar a tu API con ellos.</p></div>
<div class="c a a3"><h3>Lo que ofuscar sí da</h3><p>Sube el costo y reduce la información que regalas. Nada más.</p></div>
<div class="c ok a a3"><h3>Lo que protege</h3><p>Autenticación, autorización en el servidor, validación, TLS, límites y registro.</p></div></div>
{demo('Pega el gancho del panel en la consola y paga una factura.')}
<p class="fuente a a4">«System security should not depend on the secrecy of the implementation or its components.» NIST SP 800-123, sección 2.4.</p>
</main>"""),
    ("06-patron-gateway", "El patrón gateway", "conceptualizacion", "ver", 3, f"""<main class="s">
<p class="k a">El patrón</p><h2 class="a a2">Una sola puerta, <em>de lo barato a lo caro</em></h2>
<div class="flujo a a2"><div class="n">Cliente<span>Conoce una ruta opaca</span></div>{FL}<div class="n top">Gateway<span>Revisa y traduce</span></div>{FL}<div class="n">Backend interno<span>Red privada, no expuesto</span></div></div>
<div class="etapas a a3">""" + "".join(f'<button class="sec" type="button" data-etapa="{d}">{n}</button>' for n, d in ETAPAS) + """</div>
<div class="detalle a a3" data-detalle role="status">Toca una etapa. ¿Qué ataque frena?</div>
<p class="fuente a a4">Patrón Gateway Routing y Gateway Offloading: Azure Architecture Center (learn.microsoft.com/azure/architecture/patterns).</p>
</main>"""),
    ("07-con-gateway", "Demo 2 · Con gateway", "experiencia", "simular", 3, f"""<main class="s dos">
<div class="col"><p class="k a">Demo 2 · Con gateway</p><h2 class="a a2">La misma compra, <em>sin regalar pistas</em></h2>
{lista('La ruta no cuenta el negocio', 'El payload va cifrado', 'Los campos internos no salen', 'El error lleva solo una referencia')}
<p class="sub a a3">Sigue visible: IP, hora, tamaño y frecuencia.</p>
{demo('Cliente 2 · Con gateway, y el panel lado a lado.')}</div>
<div class="col">{ventana('Red · herramientas del navegador', '''<pre>POST /d/O_sit3Pvt61Fxgu9Ii0cjd
Cookie: sid=…
{ "v":1, "i":"J6l9Czuuw5jtx_mI",
  "c":"Wk1E2eK8KpdEjolaKG_MUB8AGjNag…" }</pre>
<pre>← 200
{ "v":1, "i":"p1Xq8Zt0mYcR3uVa",
  "c":"Hn2vQ7sLw0dTjK9xUe4Rb…" }</pre>''', 'Maqueta del tráfico con gateway: ruta opaca y cuerpo cifrado')}
<div class="c a a3"><h3>Dentro del gateway</h3><pre>k4 → /interno/v1/clientes/:sesion/facturas
q2 → /interno/v1/facturas/:id/pagos
aceptado · ana · pagar-factura · F-2001</pre></div></div>
</main>"""),
    ("08-simulaciones", "Simulaciones · Predice antes de ver", "experimentacion", "simular", 4, f"""<main class="s">
<p class="k a">Simulación · Vota antes de ver</p><h2 class="a a2">¿Pasa o <em>no pasa</em>?</h2>
<div class="tri">{ataque(1, 'Manipulada', 'Alguien cambia el mensaje en el camino.', 'Pagó con un centavo.', '400', 'Cambió 1 bit y el sello GCM falló.')}
{ataque(2, 'Repetida', 'Se reenvía la misma petición.', 'Dos pagos registrados.', '400', 'Nonce repetido. Un solo pago.')}
{ataque(3, 'Sin permiso', 'Ana pide la factura de Beto.', 'Vio la factura y el DNI.', '403', 'El backend comprobó al dueño.')}</div>
{demo('Panel, grupo Atacar. Corre cada botón después de votar.')}
<p class="nota a a4">Resultados de la demo con datos ficticios. La API sin gateway está mal a propósito: esos fallos también se corrigen sin gateway.</p>
</main>"""),
    ("09-solo-ofuscar", "Con la clave en la mano", "reflexion", "simular", 3, f"""<main class="s">
<p class="k a">La prueba honesta</p><h2 class="a a2">Ana tiene la clave. Apagamos <em>la autorización</em>.</h2>
<p class="a a3">Ruta opaca y cifrado siguen encendidos. ¿Ve la factura de Beto?</p>
<div class="fila a a3"><button type="button" data-revelar="#verdad">Ver qué pasó</button></div>
<div id="verdad" class="col" hidden><div class="par"><div class="c ok"><h3>Autorización encendida</h3><pre>403 {{ "error":"sin permiso" }}</pre><p>Lo frenó el servidor.</p></div>
<div class="c mal"><h3>Autorización apagada</h3><pre>200 {{ "factura":{{ "id":"F-2003", "total":310.75 }} }}</pre><p>El tráfico se veía igual de cifrado.</p></div></div>
<p class="remate">Lo frenó <em>la autorización</em>, no el cifrado.</p></div>
{demo('Panel, botón «Gateway que solo ofusca».')}
</main>"""),
    ("10-cookies-y-rutas", "Cookies HttpOnly y rutas dinámicas", "conceptualizacion", "simular", 4, f"""<main class="s">
<p class="k a">Dos capas más</p><h2 class="a a2">Cookies HttpOnly y <em>rutas dinámicas</em></h2>
<div class="par">
<div class="c a a2"><h3>Cookie HttpOnly</h3><pre>Set-Cookie: sid=…; HttpOnly; Secure; SameSite=Strict</pre>
{lista('JavaScript no puede leer el token', 'SameSite: no viaja desde otro sitio', 'Secure: solo por HTTPS', clase='')}
{lista('Un script inyectado igual pide cosas desde tu página', no=True, clase='')}</div>
<div class="c a a2"><h3>Ruta dinámica</h3><pre>/d/O_sit3Pvt61…  firmada por sesión y tiempo</pre>
{lista('Una ruta capturada caduca: 404', 'Una ruta de otra sesión no existe: 404', 'Los scripts con ruta fija se rompen', clase='')}
{lista('Con la cookie se pide la ruta vigente. Y depurar cuesta más', no=True, clase='')}</div></div>
<p class="remate a a3">Reducen el daño y suben el costo. <em>No hacen imposible</em> robar credenciales.</p>
{demo('Panel, grupo Sesión. En la consola: document.cookie.')}
</main>"""),
    ("11-beneficios-y-costos", "Beneficios y costos", "reflexion", "ver", 3, f"""<main class="s">
<p class="k a">Sin vender humo</p><h2 class="a a2">Lo que ganas y <em>lo que pagas</em></h2>
<div class="tri">
<div class="c ok a a2"><h3>Beneficios</h3>{lista('Un solo punto de entrada', 'Backend oculto', 'Límites en un sitio', 'Auditoría central', 'Versiones sin romper clientes', clase='')}</div>
<div class="c mal a a2"><h3>Costos</h3>{lista('Punto único de fallo', 'Más latencia: un salto más', 'Depurar es más difícil', 'Otra pieza que operar', no=True, clase='')}</div>
<div class="c a a2"><h3>Dónde no conviene</h3>{lista('App simple, con uno o dos servicios', 'Equipo sin quién opere la pieza', 'Si aún te falta autorización y TLS: empieza por ahí', no=True, clase='')}</div></div>
{demo('Panel: «Migrar a v2», «Se cae el gateway» y «Medir la latencia».')}
<p class="fuente a a4">Azure Architecture Center, Gateway Routing: punto único de fallo, cuello de botella y apps simples. microservices.io, API Gateway: complejidad y salto de red adicional.</p>
</main>"""),
    ("12-en-tu-empresa", "Llévalo a tu empresa", "experimentacion", "aplicar", 3, f"""<main class="s dos">
<div class="col"><p class="k a">En tu empresa · En este orden</p><h2 class="a a2">Primero lo que <em>protege</em></h2>
<div class="check a a3">""" + "".join(f'<label><input type="checkbox">{t}</label>' for t in ["TLS en todo y cookies HttpOnly, Secure y SameSite", "Autorización en cada ruta, comprobando al dueño", "Validación con lista de campos permitidos", "Límites por IP y por sesión", "Registro con referencia, sin datos sensibles", "Backend accesible solo desde el gateway", "Recién ahí, ofusca si suma"]) + f"""</div></div>
<div class="col"><div class="c a a2"><h3>Pídele a la IA que ataque tu API</h3><p id="pedido">{PEDIDO}</p><button type="button" data-copiar="#pedido">Copiar pedido</button></div>
<p class="sub a a3">Simula solo en sistemas tuyos o con permiso escrito.</p>
<p class="fuente a a4">OWASP API Security Top 10 2023: API1 autorización por objeto, API2 autenticación, API4 consumo de recursos, API5 autorización por función, API8 mala configuración, API9 inventario.</p></div>
</main>"""),
]

ESCENAS_DIR.mkdir(parents=True, exist_ok=True)
for ident, titulo, fase, paso, minutos, cuerpo in ESCENAS:
    d = ESCENAS_DIR / ident
    d.mkdir(exist_ok=True)
    (d / "escena.yaml").write_text(
        f'id: {ident}\ntitulo: "{titulo}"\nfase: {fase}\npaso: {paso}\nduracion_min: {minutos}\n'
        "lo_logre: false\nevidencia: ninguna\numbral_pct: 80\ncompuerta: ninguna\n", encoding="utf-8")
    (d / "escena.html").write_text(
        f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<title>Escena · {titulo}</title>\n<link rel="stylesheet" href="../../comun/escena.css">\n</head>\n'
        f'<body>\n{cuerpo}\n<script src="../../comun/escena.js"></script>\n</body>\n</html>\n', encoding="utf-8")
print(len(ESCENAS), "escenas,", sum(e[4] for e in ESCENAS), "minutos")
