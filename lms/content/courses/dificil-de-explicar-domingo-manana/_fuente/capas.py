#!/usr/bin/env python3
"""Recursos en capas para el parallax de la sesión 1 (dibujados en código, SVG, sin IA de imágenes).
Una escena de amanecer con el gato pirata en su barco, partida en 9 capas con transparencia. Cada capa va en su propio
plano (Three.js), en su propio dibujo (p5) o en su propia <img> (GSAP): así la profundidad es real y nada se deforma.

Escribe live/_comun/capa-1-cielo.svg … capa-9-gaviotas.svg (las sirve el LMS en /live/<lección>/comun/) y
materials/recursos-capas.zip para que los alumnos se las lleven. Uso: python3 _fuente/capas.py
"""
import random, zipfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent.parent
COMUN = AQUI / "live" / "_comun"
W, H, HORIZONTE = 2048, 1152, 640


def svg(cuerpo, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<defs>{defs}</defs>{cuerpo}</svg>\n')


def onda(y, amp, largo, x0=0, x1=W):
    """Borde de olas suave (curvas cuadráticas encadenadas)."""
    d = f"M {x0} {y}"
    x, arriba = x0, True
    while x < x1:
        d += f" Q {x + largo / 2} {y - amp if arriba else y + amp} {x + largo} {y}"
        x += largo; arriba = not arriba
    return d


rnd = random.Random(7)
CAPAS = {}

# 1 · cielo de amanecer (opaco)
CAPAS["capa-1-cielo"] = svg(
    f'<rect width="{W}" height="{H}" fill="url(#c)"/>'
    + "".join(f'<rect x="0" y="{y}" width="{W}" height="6" fill="#fff6dc" opacity="{o}"/>' for y, o in [(470, .25), (520, .3), (575, .35)]),
    '<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2a97f"/><stop offset=".38" stop-color="#f9cf9c"/>'
    '<stop offset=".58" stop-color="#ffe6b8"/><stop offset="1" stop-color="#ffefcc"/></linearGradient>')

# 2 · sol con halo
CAPAS["capa-2-sol"] = svg(
    '<circle cx="1300" cy="540" r="430" fill="url(#h)"/><circle cx="1300" cy="540" r="150" fill="#ffd166"/>'
    '<circle cx="1300" cy="540" r="150" fill="none" stroke="#ffe39a" stroke-width="10" opacity=".7"/>',
    '<radialGradient id="h"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".75"/><stop offset=".45" stop-color="#ffe2a0" stop-opacity=".28"/>'
    '<stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>')


def nube(cx, cy, s):
    bolas = [(-1.0, .15, .55), (-.45, -.18, .72), (.2, -.28, .8), (.78, -.05, .62), (1.2, .2, .45), (.1, .2, .7)]
    sombra = "".join(f'<ellipse cx="{cx + dx * 100 * s:.0f}" cy="{cy + dy * 100 * s + 14 * s:.0f}" rx="{r * 110 * s:.0f}" ry="{r * 80 * s:.0f}" fill="#f3cfae"/>' for dx, dy, r in bolas)
    luz = "".join(f'<ellipse cx="{cx + dx * 100 * s:.0f}" cy="{cy + dy * 100 * s:.0f}" rx="{r * 110 * s:.0f}" ry="{r * 80 * s:.0f}" fill="#fff5e6"/>' for dx, dy, r in bolas)
    return f'<g opacity=".93">{sombra}{luz}</g>'


# 3 · nubes
CAPAS["capa-3-nubes"] = svg(nube(380, 230, 1.1) + nube(1650, 170, 1.25) + nube(980, 330, .7) + nube(1880, 420, .6) + nube(130, 450, .55))

# 4 · montañas lejanas (con bruma)
CAPAS["capa-4-montanas"] = svg(
    f'<path d="M 0 {HORIZONTE + 10} L 0 500 Q 90 430 180 470 Q 300 520 420 540 Q 560 400 700 430 Q 860 470 1000 560 '
    f'Q 1120 470 1250 500 Q 1420 420 1600 440 Q 1760 470 1900 520 Q 1980 480 {W} 480 L {W} {HORIZONTE + 10} Z" fill="#8ea7ba"/>'
    f'<path d="M 0 {HORIZONTE + 10} L 0 590 Q 260 560 520 600 Q 760 570 1000 610 Q 1300 575 1560 605 Q 1800 585 {W} 600 L {W} {HORIZONTE + 10} Z" fill="#a9bccb" opacity=".8"/>')

# 5 · colinas cercanas, a los lados (el centro queda libre para el barco)
CAPAS["capa-5-colinas"] = svg(
    f'<path d="M 0 {HORIZONTE + 14} L 0 560 Q 160 520 330 560 Q 520 600 700 {HORIZONTE + 14} Z" fill="#6f8ea1"/>'
    f'<path d="M 1480 {HORIZONTE + 14} Q 1640 580 1800 575 Q 1940 572 {W} 600 L {W} {HORIZONTE + 14} Z" fill="#6a889b"/>')

# 6 · mar con reflejos y el brillo del sol
rayas = []
for _ in range(34):
    y = rnd.uniform(HORIZONTE + 18, H - 40); prof = (y - HORIZONTE) / (H - HORIZONTE)
    w = rnd.uniform(60, 240) * (.5 + prof); x = rnd.uniform(-50, W)
    rayas.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{3 + 4 * prof:.0f}" rx="3" fill="#d4ece6" opacity="{.25 + .35 * (1 - prof):.2f}"/>')
reflejo = "".join(f'<rect x="{1300 - w / 2:.0f}" y="{HORIZONTE + 12 + i * 22}" width="{w:.0f}" height="7" rx="3.5" fill="#ffe7a6" opacity="{.75 - i * .045:.2f}"/>'
                  for i, w in enumerate([300, 260, 280, 220, 240, 180, 200, 150, 160, 110, 120, 80, 90, 60]))
CAPAS["capa-6-mar"] = svg(f'<rect x="0" y="{HORIZONTE}" width="{W}" height="{H - HORIZONTE}" fill="url(#m)"/>' + reflejo + "".join(rayas),
                          '<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86b9ba"/><stop offset="1" stop-color="#4b858c"/></linearGradient>')

# 7 · el barco con el gato pirata (el protagonista)
casco = ('<path d="M 470 812 L 1400 790 Q 1450 788 1436 812 L 1330 968 Q 1300 1000 1236 1000 L 650 1000 Q 590 1000 566 968 Z" fill="#7a4a2a"/>'
         '<path d="M 500 830 L 1400 808" stroke="#5e3720" stroke-width="10"/>'
         '<path d="M 540 880 L 1380 860 M 580 930 L 1350 912" stroke="#6a3f23" stroke-width="7" opacity=".8"/>'
         '<path d="M 470 812 L 1400 790" stroke="#9b6338" stroke-width="12" stroke-linecap="round"/>')
mastil = ('<rect x="1170" y="300" width="24" height="510" rx="8" fill="#6b4226"/>'
          '<path d="M 1166 330 Q 990 520 930 770 L 1166 776 Z" fill="#f3e6cc"/><path d="M 1166 330 Q 1060 560 1040 772 L 1166 776 Z" fill="#e3d3b3"/>'
          '<path d="M 1194 306 L 1290 330 L 1194 356 Z" fill="#d94f3d"/>')
gato = (
    # cola
    '<path d="M 770 820 Q 650 790 668 690 Q 680 640 726 650" fill="none" stroke="#e98323" stroke-width="30" stroke-linecap="round"/>'
    # cuerpo y pecho
    '<ellipse cx="850" cy="740" rx="98" ry="112" fill="#f08a24"/><path d="M 790 700 Q 800 690 812 702 M 800 760 Q 812 750 824 762" stroke="#d0701a" stroke-width="9" fill="none" stroke-linecap="round"/>'
    '<ellipse cx="872" cy="764" rx="52" ry="72" fill="#fbe3c4"/>'
    # patas
    '<ellipse cx="812" cy="842" rx="44" ry="22" fill="#e98323"/><ellipse cx="904" cy="846" rx="44" ry="22" fill="#e98323"/>'
    # ukelele
    '<g transform="rotate(-28 1000 730)"><rect x="985" y="720" width="190" height="20" rx="6" fill="#7a4a2a"/><rect x="1166" y="714" width="36" height="32" rx="6" fill="#5e3720"/>'
    '<circle cx="950" cy="732" r="50" fill="#c07f42"/><circle cx="1002" cy="730" r="38" fill="#c07f42"/><circle cx="975" cy="731" r="14" fill="#2a1d14"/>'
    '<path d="M 950 727 L 1180 727 M 950 735 L 1180 735" stroke="#f4e6cf" stroke-width="2"/></g>'
    # brazo sobre el ukelele y pata en el mástil
    '<ellipse cx="955" cy="748" rx="34" ry="19" fill="#f08a24"/><ellipse cx="1078" cy="668" rx="20" ry="16" fill="#f08a24"/>'
    # cabeza
    '<path d="M 800 548 L 792 448 L 862 512 Z" fill="#f08a24"/><path d="M 812 535 L 808 474 L 848 512 Z" fill="#f5a3a3"/>'
    '<path d="M 908 512 L 962 446 L 950 548 Z" fill="#f08a24"/><path d="M 918 512 L 952 470 L 944 532 Z" fill="#f5a3a3"/>'
    '<circle cx="874" cy="590" r="88" fill="#f08a24"/>'
    '<path d="M 812 560 Q 822 548 834 558 M 900 552 Q 914 540 926 552" stroke="#d0701a" stroke-width="8" fill="none" stroke-linecap="round"/>'
    '<ellipse cx="884" cy="628" rx="40" ry="28" fill="#fbe3c4"/>'
    '<path d="M 872 612 L 896 612 L 884 624 Z" fill="#e47a8a"/>'
    '<path d="M 872 636 Q 884 646 896 636" stroke="#2a1d14" stroke-width="4" fill="none" stroke-linecap="round"/>'
    # parche (con su cinta) y el ojo abierto
    '<path d="M 796 556 Q 870 530 960 548" stroke="#1d1b20" stroke-width="7" fill="none"/>'
    '<ellipse cx="842" cy="588" rx="28" ry="24" fill="#1d1b20"/>'
    '<ellipse cx="914" cy="588" rx="17" ry="19" fill="#ffffff"/><circle cx="917" cy="590" r="9" fill="#1d1b20"/><circle cx="920" cy="586" r="3" fill="#ffffff"/>'
    # bigotes
    '<path d="M 850 630 L 790 622 M 850 638 L 792 642 M 918 630 L 976 620 M 918 638 L 978 644" stroke="#2a1d14" stroke-width="3" stroke-linecap="round"/>'
)
CAPAS["capa-7-barco"] = svg(mastil + casco + gato)

# 8 · olas del frente
crestas = "".join(f'<path d="M {x} {1012 + (i % 2) * 8} q 30 -18 60 0" stroke="#a9d6d0" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>'
                  for i, x in enumerate(range(20, W, 128)))
CAPAS["capa-8-olas"] = svg(f'<path d="{onda(1010, 22, 128)} L {W} {H} L 0 {H} Z" fill="#3f7b82"/>'
                           f'<path d="{onda(1060, 16, 96, -40)} L {W} {H} L -40 {H} Z" fill="#336b72"/>' + crestas)

# 9 · gaviotas
def gaviota(x, y, s):
    return f'<path d="M {x - 40 * s} {y} Q {x - 20 * s} {y - 26 * s} {x} {y} Q {x + 20 * s} {y - 26 * s} {x + 40 * s} {y}" stroke="#3b3a45" stroke-width="{6 * s:.1f}" fill="none" stroke-linecap="round"/>'


CAPAS["capa-9-gaviotas"] = svg(gaviota(600, 260, 1.2) + gaviota(700, 315, .9) + gaviota(1560, 215, 1.0) + gaviota(1490, 260, .7))

if __name__ == "__main__":
    for n, s in CAPAS.items():
        (COMUN / f"{n}.svg").write_text(s)
    (AQUI / "materials").mkdir(exist_ok=True)
    with zipfile.ZipFile(AQUI / "materials" / "recursos-capas.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for n, s in CAPAS.items():
            z.writestr(f"recursos-capas/{n}.svg", s)
        z.writestr("recursos-capas/LEEME.txt",
                   "Escena de amanecer en 9 capas (SVG, 2048x1152, fondo transparente salvo el cielo), dibujada en código para el taller.\n"
                   "Orden de atrás hacia adelante: 1 cielo, 2 sol, 3 nubes, 4 montañas, 5 colinas, 6 mar, 7 barco con el gato, 8 olas, 9 gaviotas.\n"
                   "Para el parallax: pon cada capa en su propio plano (Three.js) o su propia imagen (p5, GSAP) y muévela según su profundidad:\n"
                   "lo lejano poco, lo cercano mucho. Uso libre en tus piezas del taller.\n")
    print("ok", len(CAPAS), "capas")
