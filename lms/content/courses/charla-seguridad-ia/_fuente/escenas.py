#!/usr/bin/env python3
"""Genera las escenas del LIVE de la charla de seguridad (cs-01). Uso: python3 _fuente/escenas.py"""
from pathlib import Path

AQUI = Path(__file__).resolve().parent
LIVE = AQUI.parent / "live" / "cs-01"
QR = (AQUI / "qr.txt").read_text()

ESTILO = """
:root{color-scheme:dark;--noche:#0f1020;--panel:#191a33;--oro:#f2c14e;--crema:#f2f0e6;--gris:#c9c5b6;--coral:#ff9c88}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;background:var(--noche);color:var(--crema);font:400 clamp(17px,2.2vw,22px)/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;padding:clamp(20px,5vw,56px);display:flex;flex-direction:column;justify-content:center;gap:20px}
h1{font-size:clamp(36px,7vw,72px);line-height:1.05;letter-spacing:-.02em}
h2{font-size:clamp(28px,5vw,48px);line-height:1.1;letter-spacing:-.01em}
.k{color:var(--oro);font-weight:700}
.sub{color:var(--gris)}
.par{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.c{background:var(--panel);border-radius:14px;padding:18px;border-top:6px solid var(--oro)}
.c.mal{border-top-color:#e0664f}
.c h3{font-size:1em;margin-bottom:8px;color:var(--oro)}
.c.mal h3{color:var(--coral)}
pre{font:500 .85em/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word}
ol,ul{padding-left:1.2em;display:grid;gap:8px}
label{display:flex;gap:12px;align-items:center;padding:10px 12px;background:var(--panel);border-radius:10px;cursor:pointer}
input{width:22px;height:22px;accent-color:var(--oro)}
button,a.b{font:700 1em system-ui,sans-serif;padding:13px 18px;border:0;border-radius:10px;background:var(--oro);color:var(--noche);cursor:pointer;text-decoration:none;align-self:flex-start;display:inline-block}
.qr{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;align-items:center}
.qr img{width:100%;max-width:340px;background:#fff;border-radius:16px;padding:12px}
"""

def bloque(titulo, mal, bien, nota, tm="Lo que escribe la IA", tb="Lo que debe quedar"):
    return f"""<p class="k">Fallo</p><h2>{titulo}</h2>
<div class="par"><div class="c mal"><h3>{tm}</h3><pre>{mal}</pre></div><div class="c"><h3>{tb}</h3><pre>{bien}</pre></div></div>
<p class="sub">{nota}</p>"""

PEDIDO = "Revisa este código como atacante. Usa el OWASP Top 10. Por cada fallo dime archivo y línea, cómo lo explotarías, la corrección y una prueba que demuestre que quedó cerrado. Si no estás seguro, dilo."

ESCENAS = [
    ("01-bienvenida", "Seguridad en codificación con IA", "experiencia", 5, """<p class="k">JMD Learning · Charla gratuita</p>
<h1>Seguridad en codificación con IA</h1><p class="k">Lo que muchos olvidan</p>
<p class="sub">Que funcione no significa que sea seguro. La IA escribe código que corre a la primera, y por eso nadie lo revisa.</p>"""),
    ("02-claves", "Claves dentro del código", "conceptualizacion", 6, bloque("Claves dentro del código", 'const clave =\n  "sk-live-123…";\npagar(clave, monto);', "const clave =\n  process.env.PAGOS_KEY;\npagar(clave, monto);", "Si una clave llegó a git, cámbiala. Borrarla no alcanza.")),
    ("03-entradas", "Entradas sin validar", "conceptualizacion", 6, bloque("Entradas sin validar", '$sql = "SELECT * FROM\n  ventas WHERE id = "\n  . $_GET[\'id\'];', '$q = $pdo-&gt;prepare(\n  "SELECT * FROM ventas\n   WHERE id = ?");\n$q-&gt;execute([$id]);', "Todo lo que llega del usuario es sospechoso hasta validarlo.")),
    ("04-permisos", "Permisos de más", "conceptualizacion", 6, bloque("Permisos de más", 'app.get("/ventas/:id",\n  sesion, (req, res) =&gt;\n  res.json(buscar(\n    req.params.id)));', "const v = buscar(id);\nif (v.dueno !== req.user.id)\n  return res.sendStatus(403);\nres.json(v);", "Prueba: cambia el número en la URL. ¿Ves datos de otra persona?", "Solo mira si hay sesión", "Comprueba al dueño")),
    ("05-errores-y-dependencias", "Errores y dependencias", "conceptualizacion", 6, """<p class="k">Fallos 4 y 5</p><h2>Errores que cuentan demasiado y dependencias olvidadas</h2>
<div class="par"><div class="c mal"><h3>En pantalla, nunca</h3><pre>SQLSTATE[42S02]: tabla clientes
no existe en /var/www/app/db.php:42</pre></div><div class="c"><h3>Audita lo que instalaste</h3><pre>npm audit
composer audit
pip-audit</pre></div></div><p class="sub">El detalle va al registro del servidor. Las librerías también se revisan.</p>"""),
    ("06-pide-a-la-ia", "Pídele a la IA que ataque tu código", "experimentacion", 6, f"""<p class="k">Tu turno</p><h2>Pídele a la IA que ataque tu código</h2>
<div class="c"><p id="pedido">{PEDIDO}</p></div>
<button id="copiar" type="button">Copiar pedido</button>
<p class="sub">Luego comprueba: reproduce el fallo, corrígelo y repite el ataque. Debe fallar.</p>
<script>document.getElementById("copiar").onclick=function(){{var b=this;navigator.clipboard.writeText(document.getElementById("pedido").textContent).then(function(){{b.textContent="Copiado"}})}}</script>"""),
    ("07-lista", "Antes de publicar", "reflexion", 4, """<p class="k">Para llevar</p><h2>Antes de publicar, revisa esto</h2>
<div style="display:grid;gap:8px">""" + "".join(f'<label><input type="checkbox">{t}</label>' for t in ["Ninguna clave en el código ni en git", "Toda entrada validada en el servidor", "Consultas preparadas, sin texto armado a mano", "Cada ruta comprueba quién pide y qué pide", "Errores genéricos en pantalla", "Auditoría de dependencias sin pendientes"]) + "</div>"),
    ("08-ruleta", "Gira la ruleta", "experimentacion", 6, f"""<div class="qr"><div style="display:grid;gap:14px"><p class="k">Solo por hoy</p><h1>Gira la ruleta</h1>
<p>De 30 a 90 % de descuento en todos los cursos. Un giro por celular.</p>
<a class="b" href="https://jmd-learn.online/sorteo-seguridad/" target="_blank" rel="noopener">Abrir la ruleta</a>
<p class="sub">Curso completo: miércoles 18 y 25 de noviembre y 2 de diciembre, 7:30–9:00 p. m. WhatsApp 986 149 476.</p></div>
<img src="{QR}" alt="Código QR que abre la ruleta"></div>"""),
]

for i, titulo, fase, minutos, cuerpo in ESCENAS:
    d = LIVE / i
    d.mkdir(parents=True, exist_ok=True)
    (d / "escena.yaml").write_text(f'id: {i}\ntitulo: "{titulo}"\nfase: {fase}\npaso: ""\nduracion_min: {minutos}\nlo_logre: false\nevidencia: ninguna\numbral_pct: 80\ncompuerta: ninguna\n', encoding="utf-8")
    (d / "escena.html").write_text(f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Escena · {titulo}</title>\n<style>{ESTILO}</style>\n</head>\n<body>\n{cuerpo}\n</body>\n</html>\n', encoding="utf-8")
print(len(ESCENAS), "escenas")
