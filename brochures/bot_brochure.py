"""Brochure propio del curso «Tu bot de WhatsApp con IA»: una página con tres teléfonos grandes.

Reemplaza la versión de plantilla de generar.py para este curso (mismo nombre de archivo).
Uso: .venv/bin/python bot_brochure.py   →  salida/html/17-bot-whatsapp-ia.html   (luego: node imprimir.mjs)
"""
import base64, os
from generar import AQUI, LOGO, WHATSAPP, WHATSAPP_VISTO, qr_svg
from urllib.parse import quote


def b64(nombre, tipo):
    return f"data:image/{tipo};base64," + base64.b64encode(open(os.path.join(AQUI, "recursos", nombre), "rb").read()).decode()


AVATAR, TORTUGA, ELEFANTE = b64("avatar-asistente.png", "png"), b64("bot-tortuga-chica.jpg", "jpeg"), b64("bot-elefante-chica.jpg", "jpeg")
QR = qr_svg(f"https://wa.me/{WHATSAPP}?text=" + quote("Hola, quiero consultar la disponibilidad del curso Bot de WhatsApp con IA (JMD Learning)."))

yo = lambda t, h: f'<div class="b yo">{t}<small>{h} ✓✓</small></div>'
bot = lambda t, h: f'<div class="b bot">{t}<small>{h}</small></div>'
audio = lambda d, h: f'<div class="b yo"><div class="audio"><i></i><u></u><span>{d}</span></div><small>{h} ✓✓</small></div>'
ok = lambda t: f'<div class="ok">{t}</div>'

TELEFONOS = [
    ("Responde y escucha", "Atiende solo, a toda hora",
     yo("Hola, ¿hasta qué hora atienden hoy?", "9:41 p. m.") + bot("¡Hola! Hoy hasta las 8:00 p. m. ¿Te separo un turno para mañana?", "9:41 p. m.")
     + audio("0:12", "9:42 p. m.") + bot("<em>Te escuché: «Sí, a las diez. ¿Cuánto cuesta el corte?»</em>Listo: mañana 10:00 a. m. El corte cuesta S/ 25.", "9:42 p. m.")
     + yo("Perfecto, gracias 🙌", "9:43 p. m.") + bot("¡A ti! Te espero mañana. Te escribo una hora antes para recordártelo.", "9:43 p. m.")),
    ("Crea imágenes", "Tus publicaciones, en segundos",
     yo("Genera una imagen de una tortuga en el bosque 🐢", "4:15 p. m.") + f'<div class="b bot foto"><img src="{TORTUGA}" alt=""><p>¡Aquí está tu tortuga! 🎨</p><small>4:15 p. m.</small></div>'
     + yo("Ahora un elefante en la sabana", "4:16 p. m.") + f'<div class="b bot foto"><img src="{ELEFANTE}" alt=""><small>4:17 p. m.</small></div>'),
    ("Hace tareas", "Lo repetitivo, en automático",
     yo("Agenda una cita con Rosa el lunes a las 4", "8:05 a. m.") + bot(ok("Cita agendada: lunes, 4:00 p. m. Te aviso 30 minutos antes."), "8:05 a. m.")
     + yo("Anota un gasto: taxi, 18 soles", "8:07 a. m.") + bot(ok("Anotado. Esta semana llevas S/ 142 en transporte."), "8:07 a. m.")
     + yo("Recuérdame pagar la luz mañana", "8:08 a. m.") + bot(ok("Recordatorio listo: mañana, 9:00 a. m."), "8:08 a. m.")
     + yo("Gracias, Lumi", "8:09 a. m.")),
]
CAMBIOS = [
    ("Respondes cuando te desocupas", "Responde al instante, también de noche"),
    ("Anotas citas y gastos de memoria", "Todo queda agendado y guardado solo"),
    ("Repites lo mismo todos los días", "Lo repetitivo lo hace tu bot"),
]
SESIONES = [
    ("Tu asistente responde", "Lo conectas a tu WhatsApp y le enseñas lo que debe saber de ti o de tu negocio."),
    ("Escucha y crea", "Entiende tus notas de voz y genera imágenes cuando se las pides."),
    ("Hace tareas por ti", "Agenda, recuerda y anota pedidos y gastos. Todo queda guardado."),
]
PARA = ["Mejorar tu negocio", "Ordenar tu vida", "Automatizar tareas repetitivas", "Optimizar tu tiempo"]

CSS = """
@page { size: 210mm 297mm; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0 }
:root { --tinta: #141a46; --verde: #0f9d63; --verde-2: #0b6b4f; --menta: #7ef0b5; --oro: #f2c14e; --papel: #f4fbf6 }
body { position: relative; width: 794px; height: 1123px; overflow: hidden; background: var(--papel); color: var(--tinta);
  font-family: "Avenir Next", "Avenir", "Helvetica Neue", Arial, sans-serif; line-height: 1.3; -webkit-font-smoothing: antialiased }
.cab { position: absolute; inset: 0 0 auto 0; height: 420px; padding: 28px 44px; color: #fff; overflow: hidden;
  background: radial-gradient(520px 380px at 92% 8%, rgba(126,240,181,.55), rgba(126,240,181,0) 70%),
              radial-gradient(420px 320px at 4% 96%, rgba(123,108,240,.55), rgba(123,108,240,0) 70%),
              linear-gradient(125deg, #141a46 0%, #1c2a72 46%, #0e7a58 100%) }
.marca { display: flex; align-items: center; gap: 10px }
.marca svg { width: 38px; height: 38px; color: #fff }
.marca b { font-size: 15px; font-weight: 700 }
.chip { margin-left: auto; padding: 6px 13px; border-radius: 999px; background: var(--oro); color: var(--tinta); font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase }
h1 { margin-top: 20px; font-size: 47px; line-height: 1; font-weight: 700; letter-spacing: -.03em }
h1 span { color: var(--menta) }
.bajada { margin-top: 10px; max-width: 590px; font: italic 15.5px/1.38 "Charter", "Iowan Old Style", Georgia, serif; color: #e2f7ec }
.telefonos { position: absolute; left: 0; right: 0; top: 196px; display: flex; justify-content: center; gap: 20px; padding: 0 30px }
.col { width: 226px; text-align: center }
.col:nth-child(1) { transform: rotate(-2.2deg) translateY(10px) } .col:nth-child(3) { transform: rotate(2.2deg) translateY(10px) }
.rot { display: inline-block; margin-bottom: 9px; padding: 5px 12px; border-radius: 999px; background: #fff; color: var(--verde-2); font-size: 11.5px; font-weight: 700; box-shadow: 0 6px 16px -8px rgba(0,0,0,.5) }
.rot b { color: var(--tinta) }
.tel { height: 452px; border-radius: 32px; background: #0d1512; padding: 8px; box-shadow: 0 28px 50px -22px rgba(9,40,30,.75), 0 0 0 1.5px rgba(255,255,255,.14) }
.pan { height: 100%; border-radius: 25px; overflow: hidden; background: #efe7dd; text-align: left }
.tc { display: flex; align-items: center; gap: 8px; height: 50px; padding: 12px 12px 0; background: var(--verde-2); color: #fff }
.tc img { width: 27px; height: 27px; border-radius: 50%; background: #e8dcff }
.tc b { display: block; font-size: 11.5px; font-weight: 600; line-height: 1.15 } .tc span { font-size: 8.5px; opacity: .85 }
.chat { display: flex; flex-direction: column; gap: 6px; padding: 10px 9px }
.b { max-width: 88%; padding: 6px 8px 4px; border-radius: 10px; font-size: 10.6px; line-height: 1.3; box-shadow: 0 1px 1px rgba(0,0,0,.10) }
.b small { display: block; margin-top: 1px; text-align: right; font-size: 7px; color: #6b7c75 }
.b em { display: block; margin-bottom: 3px; font-size: 8.6px; color: #6b7c75 }
.yo { align-self: flex-end; background: #d9fdd3; border-top-right-radius: 3px } .bot { align-self: flex-start; background: #fff; border-top-left-radius: 3px }
.audio { display: flex; align-items: center; gap: 6px; width: 132px }
.audio i { position: relative; flex: none; width: 19px; height: 19px; border-radius: 50%; background: var(--verde) }
.audio i::after { content: ""; position: absolute; left: 7.5px; top: 5px; border: 4.5px solid transparent; border-left: 7px solid #fff }
.audio u { flex: 1; height: 16px; background: repeating-linear-gradient(90deg, var(--verde) 0 2px, transparent 2px 4.5px);
  clip-path: polygon(0 40%,6% 15%,12% 55%,18% 8%,24% 45%,30% 22%,36% 60%,42% 5%,48% 40%,54% 20%,60% 58%,66% 12%,72% 46%,78% 26%,84% 62%,90% 10%,96% 42%,100% 30%,100% 70%,96% 58%,90% 90%,84% 38%,78% 74%,72% 54%,66% 88%,60% 42%,54% 80%,48% 60%,42% 95%,36% 40%,30% 78%,24% 55%,18% 92%,12% 45%,6% 85%,0 60%) }
.audio span { font-size: 7.5px; color: #6b7c75 }
.foto { padding: 3px 3px 4px } .foto img { display: block; width: 160px; height: 112px; object-fit: cover; border-radius: 7px } .foto p { padding: 4px 5px 0 }
.ok { display: flex; gap: 5px } .ok::before { content: "✓"; flex: none; display: grid; place-items: center; width: 13px; height: 13px; margin-top: 1px; border-radius: 50%; background: var(--verde); color: #fff; font-size: 8.5px; font-weight: 700 }
.rayo { margin-top: 10px; font-size: 12px; font-weight: 700; color: var(--verde-2) }
.rayo::before { content: "⚡ "; }
.cambios { position: absolute; left: 44px; right: 44px; top: 726px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px }
.cambio { padding: 11px 13px 12px; border-radius: 14px; background: #fff; box-shadow: 0 10px 24px -18px rgba(20,26,70,.6), 0 0 0 1px rgba(20,26,70,.08) }
.cambio s { display: block; font-size: 11px; color: #7a8192; text-decoration-color: #c9ccd6 }
.cambio b { display: block; margin-top: 4px; padding-left: 20px; position: relative; font-size: 13.2px; line-height: 1.22; color: var(--verde-2) }
.cambio b::before { content: "→"; position: absolute; left: 0; top: -1px; font-size: 15px; color: var(--verde) }
.temario { position: absolute; left: 44px; right: 44px; top: 824px }
h2 { margin-bottom: 9px; font-size: 11.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #5a49d6 }
.pasos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px }
.paso { position: relative; padding: 12px 13px 13px 50px; border-radius: 14px; color: #fff; min-height: 86px }
.paso:nth-child(1) { background: linear-gradient(135deg, #2a2f8f, #5a49d6) } .paso:nth-child(2) { background: linear-gradient(135deg, #0b6b4f, #12a56a) } .paso:nth-child(3) { background: linear-gradient(135deg, #b9770e, #e9a92f) }
.paso i { position: absolute; left: 12px; top: 10px; font: 700 34px/1 "Avenir Next", sans-serif; font-style: normal; opacity: .92 }
.paso b { display: block; font-size: 14px; line-height: 1.15 } .paso span { display: block; margin-top: 4px; font-size: 10.8px; line-height: 1.32; opacity: .95 }
.para { position: absolute; left: 44px; right: 44px; top: 964px; display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: 11.6px; font-weight: 600 }
.para span { padding: 5px 10px; border-radius: 999px; background: #dcf4e5; color: var(--verde-2); font-weight: 700 }
.pie { position: absolute; left: 0; right: 0; bottom: 0; height: 116px; display: flex; align-items: center; gap: 22px; padding: 0 44px; color: #fff;
  background: linear-gradient(110deg, #141a46 0%, #1c2a72 60%, #0e7a58 130%) }
.precio b { display: block; font-size: 46px; line-height: .95; font-weight: 700; color: var(--oro); letter-spacing: -.02em } .precio span { font-size: 11.5px; opacity: .9 }
.sep { width: 1px; height: 62px; background: rgba(255,255,255,.25) }
.consulta { flex: 1 } .consulta span { display: block; font-size: 12px; opacity: .9 } .consulta b { display: block; font-size: 23px; line-height: 1.15; letter-spacing: -.01em } .consulta small { font-size: 11px; opacity: .85 }
.qr-caja { padding: 7px; border-radius: 12px; background: #fff } .qr { display: block; width: 78px; height: 78px; color: var(--tinta) }
"""

telefonos = "".join(f'''<div class="col"><span class="rot"><b>0{i}</b> · {nombre}</span><div class="tel"><div class="pan">
<div class="tc"><img src="{AVATAR}" alt=""><div><b>Lumi · tu asistente</b><span>en línea</span></div></div><div class="chat">{chat}</div></div></div><p class="rayo">{rayo}</p></div>'''
                    for i, (nombre, rayo, chat) in enumerate(TELEFONOS, 1))
html = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tu bot de WhatsApp con IA · JMD Learning</title><style>{CSS}</style></head><body data-fijo>
<header class="cab"><div class="marca">{LOGO}<b>JMD Learning</b><span class="chip">Consulta disponibilidad</span></div>
<h1>Tu bot de WhatsApp <span>con IA</span></h1>
<p class="bajada">Un asistente que vive en tu WhatsApp y trabaja por ti: responde, escucha tus audios, crea imágenes y hace tus tareas. No necesitas saber programar.</p></header>
<section class="telefonos">{telefonos}</section>
<section class="cambios">{''.join(f'<div class="cambio"><s>Antes: {a}</s><b>{b}</b></div>' for a, b in CAMBIOS)}</section>
<section class="temario"><h2>Temario · 3 sesiones en vivo</h2><div class="pasos">{''.join(f'<div class="paso"><i>{n}</i><b>{a}</b><span>{b}</span></div>' for n, (a, b) in enumerate(SESIONES, 1))}</div></section>
<p class="para">Para ti si quieres: {''.join(f'<span>{x}</span>' for x in PARA)}</p>
<footer class="pie"><div class="precio"><b>S/ 100</b><span>curso completo · 3 sesiones en vivo</span></div><i class="sep"></i>
<div class="consulta"><span>Consulta la disponibilidad e inscríbete</span><b>WhatsApp {WHATSAPP_VISTO}</b><small>jmd-learn.online</small></div><div class="qr-caja">{QR}</div></footer>
</body></html>"""
open(os.path.join(AQUI, "salida", "html", "17-bot-whatsapp-ia.html"), "w", encoding="utf-8").write(html)
print("brochure del bot escrito")
