#!/usr/bin/env python3
"""Ready Set Go · clase 2 · «Tu juego en 8 preguntas»: genera las 8 escenas de pregunta del LIVE (06d…06k).

Cada escena es UNA pregunta que el profesor hace en voz alta. El alumno la contesta en Forja (incrustada, abierta en
esa pregunta con ?paso=<elemento>), pulsa «Aplicar y probar mi juego» y, en las preguntas 4 y 8, «Guardar en mi aula».
Los 8 elementos son los elementos formales de Fullerton (Game Design Workshop, 2014, cap. 3).

Uso:  python3 rsg02_taller.py      (escribe en ../live/rsg-02/; pisa solo sus propias carpetas 06d…06k)
"""
import html
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(AQUI, '..', 'live', 'rsg-02')

PREGUNTAS = [
    # carpeta, elemento (paso de Forja), nombre del elemento, pregunta, lo que pregunta el profe, ejemplos, guardar, minutos
    ('06d-quien-juega', 'jugadores', 'Jugadores', '¿Quién juega?',
     '¿Quién es tu héroe? ¿Por qué ese y no otro?',
     ['Un gato astronauta', 'Una ninja de fuego', 'Un robot que no sabe nadar'], False, 3),
    ('06e-que-tiene-que-lograr', 'objetivo', 'Objetivo', '¿Qué tiene que lograr?',
     '¿Qué quiere conseguir tu héroe: llegar, escapar, anotar, sobrevivir, construir?',
     ['Llegar a la meta', 'Escapar del laberinto', 'Ganar el duelo'], False, 3),
    ('06f-con-que-teclas', 'procedimientos', 'Procedimientos', '¿Con qué teclas lo controlas?',
     '¿Flechas o WASD? ¿Qué botón golpea? Elige un esquema o cambia tecla por tecla.',
     ['Solo flechas', 'WASD + J', 'Simple: J golpea, K especial'], False, 3),
    ('06g-que-se-puede', 'reglas', 'Reglas', '¿Qué se puede y qué no?',
     '¿Qué regla haría tu juego distinto a todos los demás?',
     ['Gravedad de la Luna', 'Doble salto', 'Sin golpes: solo esquivar'], True, 4),
    ('06h-que-vale', 'recursos', 'Recursos', '¿Qué vale y qué escasea?',
     '¿Qué tiene que cuidar el jugador para no perder?',
     ['Pocas vidas', 'Tiempo que se acaba', 'Monedas para comprar'], False, 3),
    ('06i-que-te-lo-impide', 'conflicto', 'Conflicto', '¿Qué te lo impide?',
     '¿Quién o qué se opone? ¿Cómo piensa tu rival? (Recuerda la clase de hoy: pathfinding.)',
     ['Un rival que te persigue', 'Trampas que salen del suelo', 'Un jefe gigante'], False, 3),
    ('06j-donde-ocurre', 'limites', 'Límites', '¿Dónde ocurre?',
     '¿En qué mundo pasa tu juego? ¿De día o de noche?',
     ['Bosque de noche', 'Desierto al atardecer', 'Nieve'], False, 3),
    ('06k-como-se-gana', 'resultado', 'Resultado', '¿Cómo se gana y cómo se pierde?',
     '¿Cuándo termina tu juego? Luego mira la prueba final: ¿ya es un juego?',
     ['Llegas a la meta', 'Te quedas sin vidas', 'Se acaba el reloj'], True, 4),
]

CORTA = ['¿Quién juega?', '¿Qué debe lograr?', '¿Con qué teclas?', '¿Qué se puede?', '¿Qué vale?', '¿Qué te lo impide?', '¿Dónde ocurre?', '¿Cómo se gana?']

YAML = '''id: {id}
titulo: "{titulo}"
fase: experimentacion
paso: ""
duracion_min: {min}
lo_logre: true
evidencia: ninguna
umbral_pct: 70
compuerta: lo_logre
'''

HTML = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Escena · {titulo_html}</title>
<!--
  Escena del modo LIVE (Ready Set Go, clase rsg-02). La genera _fuente/rsg02_taller.py: no la edites a mano.
  «Tu juego en 8 preguntas» · pregunta {n} de 8 · elemento formal «{elemento_nombre}» (Fullerton, Game Design Workshop, 2014).
  Incrusta Forja abierta en esa pregunta (?paso={paso}). Con la sesión del LMS, «Guardar en mi aula» escribe en /trabajo/juego-<plantilla>/.
-->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/rsg.css">
<link rel="stylesheet" href="../../comun/taller.css">
</head>
<body>
<div class="esc">
  <header class="esc-cab"><span class="esc-fase" data-ph="ea">Tu juego · pregunta {n} de 8</span><span class="esc-num">Ready Set Go · C2 · {codigo}</span></header>
  <main class="esc-cuerpo tl-cuerpo">
    <section class="tl-cab" aria-label="La pregunta">
      <div class="tl-preg">
        <p class="tl-elem"><b>{n}</b> {elemento_nombre} <span>· elemento formal de un juego</span></p>
        <h1>{pregunta_html}</h1>
        <p class="tl-profe"><span class="x-et">El profe pregunta</span> {profe_html}</p>
      </div>
      <div class="tl-lado">
        <ol class="tl-ruta" aria-label="Las 8 preguntas">{ruta}</ol>
        <p class="tl-ej"><span class="x-et">Por ejemplo</span> {ejemplos}</p>
      </div>
    </section>
    <iframe class="x-marco tl-marco" src="/forja/?clase=rsg-02&amp;paso={paso}" title="Forja: {pregunta_html}" allow="autoplay; fullscreen; gamepad"></iframe>
  </main>
  <footer class="esc-pie tl-pie"><ol class="x-pasos"><li>Responde en Forja</li><li>Pulsa <b>Aplicar y probar mi juego</b></li>{guardar}<li>Pulsa <b>Lo logré</b></li></ol></footer>
</div>
<script>
(function () {{ try {{ var t = new URLSearchParams(location.search).get("tema"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t); }} catch (e) {{}} }})();
</script>
</body>
</html>
'''


def ruta(actual):
    out = []
    for i, (_, _, nombre, *_r) in enumerate(PREGUNTAS):
        clase = 'hecha' if i < actual else 'ahora' if i == actual else ''
        aria = ' aria-current="step"' if i == actual else ''
        out.append(f'<li class="{clase}"{aria} title="{html.escape(nombre)}"><span>{i + 1}</span></li>')
    return ''.join(out)


def main():
    for i, (carpeta, paso, nombre, pregunta, profe, ejemplos, guardar, minutos) in enumerate(PREGUNTAS):
        d = os.path.join(LIVE, carpeta)
        os.makedirs(d, exist_ok=True)
        titulo = f'Pregunta {i + 1}/8 · {CORTA[i]}'   # corto: la lista de escenas del LIVE tiene alto fijo
        with open(os.path.join(d, 'escena.yaml'), 'w', encoding='utf-8') as f:
            f.write(YAML.format(id=carpeta, titulo=titulo.replace('"', '\\"'), min=minutos))
        pg = HTML.format(
            titulo_html=html.escape(titulo), n=i + 1, elemento_nombre=html.escape(nombre), paso=paso,
            codigo='E' + carpeta[:3].upper(), pregunta_html=html.escape(pregunta), profe_html=html.escape(profe),
            ruta=ruta(i), ejemplos=' '.join(f'<span class="tl-chip">{html.escape(e)}</span>' for e in ejemplos),
            guardar='<li class="tl-guarda">Pulsa <b>Guardar en mi aula</b></li>' if guardar else '')
        with open(os.path.join(d, 'escena.html'), 'w', encoding='utf-8') as f:
            f.write(pg)
        print('escrita', carpeta)


if __name__ == '__main__':
    main()
