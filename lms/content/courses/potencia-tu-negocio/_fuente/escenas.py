#!/usr/bin/env python3
"""Genera las escenas LIVE del taller Potencia tu negocio (pn-01) y live/_comun/escena.css.
Uso: python3 _fuente/escenas.py
La URL de la demo NO vive aquí: está en live/_comun/demo-url.js."""
import base64
from pathlib import Path

AQUI = Path(__file__).resolve().parent
LIVE = AQUI.parent / "live"
ESCENAS_DIR = LIVE / "pn-01"
WHATSAPP = "https://wa.me/51986149476?text=Quiero%20mi%20tienda%20virtual"

# La CSP de las escenas solo deja cargar fuentes desde data:, así que Outfit va dentro del CSS.
fuente = base64.b64encode((AQUI / "outfit.woff2").read_bytes()).decode()
CSS = ('@font-face{font-family:Outfit;font-style:normal;font-weight:100 900;font-display:swap;'
       f'src:url(data:font/woff2;base64,{fuente}) format("woff2")}}\n' + (AQUI / "estilo.css").read_text(encoding="utf-8"))
(LIVE / "_comun" / "escena.css").write_text(CSS, encoding="utf-8")

ICONOS = {
    "laptop": '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    "teclado": '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    "mouse": '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/>',
    "chat": '<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.7A8 8 0 1 1 21 12z"/>',
    "cuaderno": '<path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z"/><path d="M6 3v18M3.5 7H6M3.5 12H6M3.5 17H6M10 8h6M10 12h6"/>',
    "calculadora": '<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="4" rx=".6"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>',
    "tienda": '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
    "plato": '<path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M18 21V3c-2.5 1-4 4.5-4 8.5 0 1.7 1.5 2.5 4 2.5"/>',
    "perfume": '<rect x="6" y="9" width="12" height="12" rx="2.5"/><path d="M10 9V6h4v3M12 6V3h4"/><circle cx="12" cy="15" r="2.4"/>',
    "martillo": '<path d="M13 9l-9 9a1.8 1.8 0 0 0 2.5 2.5l9-9"/><path d="M10 6l3-3h4l4 4-2.5 2.5-1.5-1-3.5 3.5-3-3z"/>',
    "polo": '<path d="M8 3L3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
    "botica": '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7.5v9M7.5 12h9"/>',
    "pedido": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
    "caja": '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    "grafico": '<path d="M4 20V4M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/>',
    "recibo": '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    "celular": '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    "persona": '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    "flecha": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "qr": '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h.01M18 21h3v-3"/>',
    "alerta": '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
}


def ic(nombre, clase=""):
    return f'<svg class="i {clase}" viewBox="0 0 24 24" aria-hidden="true">{ICONOS[nombre]}</svg>'


def puntos(*items):
    return '<ul class="pts a a3">' + "".join(f"<li>{ic('check')}<span>{t}</span></li>" for t in items) + "</ul>"


def numeros(*items):
    return '<ol class="num a a3">' + "".join(f"<li><b>{i}</b><span>{t}</span></li>" for i, t in enumerate(items, 1)) + "</ol>"


# Botón de demo. La dirección la ponen demo-url.js y escena.js.
DEMO = f"""<div class="demo a a4" data-enlace><a class="b" data-demo data-abrir href="#" target="_blank" rel="noopener">Abrir la demo {ic('flecha')}</a><span class="url" data-demo-texto></span><p class="aviso" role="status" hidden></p></div>"""
FICTICIO = '<p class="nota a a4">Nodo Mayorista es un negocio ficticio, creado para esta demo.</p>'


def ventana(titulo, cuerpo, etiqueta):
    return f'<div class="win a a2" role="img" aria-label="{etiqueta}"><div class="win-b"><i></i><i></i><i></i><span>{titulo}</span></div><div class="win-c">{cuerpo}</div></div>'


def producto(icono, nombre):
    return f'<div class="p">{ic(icono)}<span>{nombre}</span><span class="tag">Precio por mayor</span></div>'


CATALOGO = '<div class="prods">' + producto("laptop", "Computadoras") + producto("teclado", "Teclados") + producto("mouse", "Mouse") + "</div>"


def tarjeta(icono, titulo, texto):
    return f'<div class="c a a2">{ic(icono)}<h3>{titulo}</h3><p>{texto}</p></div>'


def fila(mensaje):
    return f'<div class="fila"><i>{ic("persona")}</i><span><b>Cliente</b>{mensaje}</span></div>'


def barra(nombre, valor):
    return f'<div class="barra"><span>{nombre}</span><i style="--v:{valor}%"></i></div>'


def nodo(icono, titulo, texto, clase=""):
    return f'<div class="n a a2 {clase}">{ic(icono)}{titulo}<span>{texto}</span></div>'


FLECHA = f'<div class="fl a a3">{ic("flecha")}</div>'

ESCENAS = [
    ("01-bienvenida", "Tu tienda virtual con WhatsApp, en internet", "experiencia", "ver", 3, False, f"""<main class="s dos">
<div class="txt"><p class="k a">Potencia tu negocio, la serie · Taller gratuito en vivo</p>
<h1 class="a a2">Tu tienda virtual con <em>WhatsApp</em>, en internet</h1>
<p class="sub a a3">Hoy viernes 6 de noviembre · 4:00 p. m.<br>No necesitas saber programar.</p>
<ol class="agenda a a4"><li><b>1</b> El problema</li><li><b>2</b> La tienda funcionando</li><li><b>3</b> Cómo tener la tuya</li></ol></div>
<div class="vis"><div class="tel a a2" role="img" aria-label="Celular con una tienda y un mensaje de WhatsApp"><div class="tel-p"><div class="tel-b">{ic('tienda')} Nodo Mayorista</div><div class="chat"><div class="m">Hola, ¿qué necesitas hoy?</div><div class="m yo">Quiero ver los teclados</div><div class="m">Aquí tienes el catálogo</div></div></div></div></div>
</main>"""),
    ("02-el-problema", "El problema", "reflexion", "ver", 4, False, f"""<main class="s">
<p class="k a">El problema</p><h2 class="a a2">Vender así <em>cansa</em></h2>
<div class="tres">{tarjeta('chat', 'Pedidos perdidos', 'Se quedan arriba en el chat de WhatsApp.')}{tarjeta('calculadora', 'Precios a mano', 'Uno por uno, cliente por cliente.')}{tarjeta('cuaderno', 'Todo en el cuaderno', 'Lo que vendiste y lo que te queda.')}</div>
<p class="remate a a4">Mientras atiendes a uno, otro se queda esperando.</p>
</main>"""),
    ("03-la-idea", "La idea", "conceptualizacion", "ver", 3, False, f"""<main class="s">
<p class="k a">La idea</p><h1 class="a a2">Una tienda que <em>trabaja sola</em></h1>
<div class="flujo">{nodo('persona', 'Tu cliente', 'Mira y pregunta')}{FLECHA}{nodo('tienda', 'Tu tienda', 'Muestra y responde', 'top')}{FLECHA}{nodo('pedido', 'Tú', 'Recibes el pedido ordenado')}</div>
</main>"""),
    ("04-demo-tienda", "Demo 1 · La tienda web", "experiencia", "ver", 5, True, f"""<main class="s dos">
<div class="txt"><p class="k a">Demo 1 · La tienda web</p><h2 class="a a2">Tu catálogo, con <em>precio por mayor</em></h2>
{puntos('Tus productos a la vista', 'Tu precio por mayor, sin calcular a mano', 'El cliente entra desde su celular')}{DEMO}{FICTICIO}</div>
<div class="vis">{ventana('Nodo Mayorista', CATALOGO, 'Tienda de muestra con computadoras, teclados y mouse a precio por mayor')}
<div class="conqr a a3"><div class="qr" data-qr="" role="img" aria-label="Código QR que abre la demo"></div><p>Míralo en tu celular</p></div></div>
</main>"""),
    ("05-demo-whatsapp", "Demo 2 · WhatsApp conectado", "experiencia", "ver", 5, False, f"""<main class="s dos">
<div class="txt"><p class="k a">Demo 2 · WhatsApp</p><h2 class="a a2">Conectas tu WhatsApp <em>con un QR</em></h2>
{numeros('Abres WhatsApp en tu celular', 'Escaneas el QR', 'Los mensajes llegan a una bandeja')}{DEMO}</div>
<div class="vis"><div class="pasos a a2" aria-hidden="true">{ic('qr')}{ic('flecha', 'f')}{ic('celular')}{ic('flecha', 'f')}{ic('chat')}</div>
{ventana('<i class="punto"></i> WhatsApp conectado · Bandeja', '<div class="bandeja">' + fila('¿Tienen teclados?') + fila('Quiero mouse por mayor') + fila('¿Cuánto cuesta esa computadora?') + '</div>', 'Bandeja de mensajes de muestra con tres clientes')}</div>
</main>"""),
    ("06-demo-bot", "Demo 3 · El bot que entiende", "experiencia", "ver", 5, False, f"""<main class="s dos">
<div class="txt"><p class="k a">Demo 3 · El bot</p><h2 class="a a2">Un bot que <em>entiende</em> lo que le preguntan</h2>
<p class="lead a a3">No busca la palabra exacta. Busca la idea.</p>
<div class="equi a a3"><div>«algo para escribir en la compu» {ic('flecha')} <b>Teclados</b></div><div>«el ratoncito» {ic('flecha')} <b>Mouse</b></div></div>{DEMO}</div>
<div class="vis"><div class="tel a a2" role="img" aria-label="Ejemplo de conversación con el bot en WhatsApp"><div class="tel-p"><div class="tel-b">{ic('chat')} Nodo Mayorista</div><div class="chat"><div class="m yo">Necesito algo para escribir en la compu</div><div class="m"><small>Bot</small>Tenemos teclados. ¿Te muestro?</div><div class="m yo">Sí, por mayor</div></div></div></div><p class="nota a a3">Conversación de ejemplo</p></div>
</main>"""),
    ("07-demo-panel", "Demo 4 · El panel de administración", "experiencia", "ver", 4, False, f"""<main class="s dos">
<div class="txt"><p class="k a">Demo 4 · El panel</p><h2 class="a a2">Tu negocio <em>en una pantalla</em></h2>
{puntos('Pedidos: quién pidió y qué', 'Stock: cuánto te queda', 'Ventas: cómo vas')}{DEMO}</div>
<div class="vis">{ventana('Panel · Nodo Mayorista', f'''<div class="panel3"><div class="pn"><h3>{ic('pedido')} Pedidos</h3><span class="est nuevo">Nuevo</span><span class="est">Preparando</span><span class="est listo">Entregado</span></div><div class="pn"><h3>{ic('caja')} Stock</h3>{barra('Computadoras', 40)}{barra('Teclados', 75)}{barra('Mouse', 60)}</div><div class="pn"><h3>{ic('grafico')} Ventas</h3><div class="cols"><i style="--v:35%"></i><i style="--v:55%"></i><i style="--v:45%"></i><i style="--v:70%"></i><i style="--v:90%"></i></div></div></div>''', 'Panel de muestra con pedidos, stock y ventas')}<p class="nota a a3">Pantalla de muestra, sin datos reales</p></div>
</main>"""),
    ("08-demo-sunat", "Demo 5 · Comprobante electrónico (PRUEBAS)", "experiencia", "ver", 4, False, f"""<main class="s dos">
<div class="txt"><p class="k a">Demo 5 · Comprobante electrónico</p><h2 class="a a2">De la venta <em>a SUNAT</em></h2>
<div class="alerta a a3">{ic('alerta')}<span>Hoy lo vemos en ambiente de <b>PRUEBAS</b>. No es un comprobante real.</span></div>
{puntos('Vendes', 'Sale el comprobante', 'Se envía a SUNAT')}{DEMO}</div>
<div class="vis"><div class="recibo a a2" role="img" aria-label="Comprobante de muestra con un sello que dice PRUEBAS"><h3>Comprobante electrónico</h3><span>Nodo Mayorista</span><u></u><u class="r2"></u><u class="r1"></u><u></u><u class="r2"></u><u class="r1"></u><div class="sello">PRUEBAS</div></div></div>
</main>"""),
    ("09-cualquier-negocio", "Funciona para cualquier negocio", "conceptualizacion", "ver", 3, False, f"""<main class="s">
<p class="k a">Y tu negocio</p><h2 class="a a2">Funciona para <em>cualquier negocio</em></h2>
<div class="seis a a3">""" + "".join(f"<div>{ic(i)}{n}</div>" for i, n in [("tienda", "Bodega"), ("plato", "Restaurante"), ("perfume", "Perfumería"), ("martillo", "Ferretería"), ("polo", "Ropa"), ("botica", "Botica")]) + """</div>
<p class="remate a a4">Hoy viste computadoras. Mañana, tus productos.</p>
</main>"""),
    ("10-gratis", "Tu tienda, gratis hasta por 6 meses", "experimentacion", "ver", 2, False, """<main class="s gratis">
<h1 class="a"><span>Tu tienda, gratis</span><span>hasta por</span><em>6 meses</em></h1>
</main>"""),
    ("11-proximo-paso", "Próximo paso", "experimentacion", "escribir", 2, True, f"""<main class="s dos">
<div class="txt"><p class="k a">Próximo paso</p><h2 class="a a2">Escríbenos por WhatsApp</h2>
<p class="tel-grande a a3">986 149 476</p>
<div class="demo a a4" data-enlace><a class="b" data-abrir href="{WHATSAPP}" target="_blank" rel="noopener">Abrir WhatsApp {ic('flecha')}</a><p class="aviso" role="status" hidden></p></div></div>
<div class="vis"><div class="qr qrgrande a a2" data-qr="{WHATSAPP}" role="img" aria-label="Código QR que abre WhatsApp con el 986 149 476"></div><p class="a a3">Escanea con tu celular</p></div>
</main>"""),
]

ESCENAS_DIR.mkdir(parents=True, exist_ok=True)
for ident, titulo, fase, paso, minutos, con_qr, cuerpo in ESCENAS:
    d = ESCENAS_DIR / ident
    d.mkdir(exist_ok=True)
    (d / "escena.yaml").write_text(
        f'id: {ident}\ntitulo: "{titulo}"\nfase: {fase}\npaso: {paso}\nduracion_min: {minutos}\n'
        "lo_logre: false\nevidencia: ninguna\numbral_pct: 80\ncompuerta: ninguna\n", encoding="utf-8")
    scripts = '<script src="../../comun/demo-url.js"></script>\n'
    if con_qr:
        scripts += '<script src="../../comun/qrcode.js"></script>\n'
    scripts += '<script src="../../comun/escena.js"></script>'
    (d / "escena.html").write_text(
        f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<title>Escena · {titulo}</title>\n<link rel="stylesheet" href="../../comun/escena.css">\n</head>\n'
        f'<body>\n{cuerpo}\n{scripts}\n</body>\n</html>\n', encoding="utf-8")
print(len(ESCENAS), "escenas,", sum(e[4] for e in ESCENAS), "minutos")
