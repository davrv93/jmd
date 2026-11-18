#!/usr/bin/env python3
"""Genera las escenas LIVE de t2s-01 (Taller 2Shell).  python3 _fuente/t2s01.py
Las escenas de módulo incrustan el panel blindado jmd-learn.online/lab-2shell/ (sesión del LMS, solo lectura).
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.join(AQUI, '..', 'live', 't2s-01')

CSS = """:root{color-scheme:dark;--fondo:#070b12;--panel:#0e1726;--linea:#223449;--tinta:#e9eff6;--dim:#8b9bb0;--rojo:#ff3b47;--verde:#35d07f;--amber:#ffb02e;--cyan:#4fd6e6;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box;margin:0}
html,body{height:100%}
body{background:var(--fondo);color:var(--tinta);font:400 clamp(16px,1.9vw,20px)/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
.k{font:600 .8em var(--mono);letter-spacing:.22em;color:var(--cyan);text-transform:uppercase}
.r{color:var(--rojo)}.v{color:var(--verde)}.a{color:var(--amber)}.c{color:var(--cyan)}.d{color:var(--dim)}
code{font-family:var(--mono);font-size:.92em;background:#121d2e;padding:1px 6px;border-radius:6px}"""

def escena(id_, titulo, fase, paso, html):
    d = os.path.join(LIVE, id_)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'escena.yaml'), 'w').write(
        f'id: {id_}\ntitulo: "{titulo}"\nfase: {fase}\npaso: "{paso}"\nduracion_min: 10\nlo_logre: false\n'
        'evidencia: ninguna\numbral_pct: 80\ncompuerta: ninguna\n')
    open(os.path.join(d, 'escena.html'), 'w').write(html)

def pagina(titulo, cuerpo, extra_css=''):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} · Taller 2Shell</title>
<style>{CSS}
{extra_css}</style>
</head>
<body>
{cuerpo}
</body>
</html>
'''

# ---------------------------------------------------------------- 01 bienvenida
BIEN_CSS = """body{padding:clamp(20px,5vw,56px);display:flex;flex-direction:column;justify-content:center;gap:22px;min-height:100%}
h1{font-size:clamp(38px,7vw,76px);line-height:1.02;letter-spacing:-.02em;font-weight:800}
.tres{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.t{background:var(--panel);border:1px solid var(--linea);border-radius:16px;padding:18px;border-top:5px solid var(--rojo)}
.t h2{font-size:1.15em;margin-bottom:4px}.t p{color:var(--dim);font-size:.9em}
.t .cve{font:600 .78em var(--mono);color:var(--amber);margin-bottom:8px;display:block}
.reglas{display:flex;gap:10px;flex-wrap:wrap}.reglas span{font:600 .78em var(--mono);border:1px solid var(--linea);border-radius:999px;padding:7px 14px;color:var(--dim)}"""
escena('01-bienvenida', 'Taller 2Shell · bienvenida', 'experiencia', 'ver', pagina('Bienvenida', '''
<p class="k">JMD Learning · Taller de seguridad en Docker</p>
<h1>Tres «Shell» en <span class="r">un mes</span>.<br>Hoy aprendes a <span class="v">frenarlas</span>.</h1>
<div class="tres">
  <div class="t"><span class="cve">CVE-2026-109618 · 109619</span><h2>PHP2Shell</h2><p>RCE sin usuario ni contraseña en PHP 5.4–8.5. CVSS 9.2.</p></div>
  <div class="t"><span class="cve">CVE-2026-111497 · KEV de CISA</span><h2>Node2Shell</h2><p>El decodificador Brotli de Node.js. Ya se está explotando.</p></div>
  <div class="t"><span class="cve">CVE-2026-114938 · 17 nov 2026</span><h2>Java4Shell</h2><p>El Base64 de OpenJDK ≥ 17.0.6 sobre CPU con AVX-512. Keycloak, Jira, Jenkins…</p></div>
</div>
<p class="d">Para cada una vas a responder tres preguntas: <b class="c">¿estoy expuesto?</b>, <b class="a">¿cómo mitigo hoy?</b> y <b class="v">¿cómo detecto un ataque?</b></p>
<div class="reglas"><span>sin exploits</span><span>red aislada, sin Internet</span><span>solo lectura</span><span>solo con tu sesión</span></div>
''', BIEN_CSS))

# ---------------------------------------------------------------- módulos con el panel
MOD_CSS = """body{display:flex;flex-direction:column;height:100vh}
.top{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--linea)}
.top h1{font-size:1.25em;font-weight:800}.top p{color:var(--dim);font-size:.85em;flex:1;min-width:240px}
iframe{flex:1;width:100%;border:0;display:block;background:var(--fondo)}"""
MODS = [
  ('02-php2shell', 'php', 'PHP2Shell', 'CVE-2026-109618 · 109619',
   'Mira <code>session.upload_progress.enabled</code> y la versión de PHP en cada lado. Pulsa «Comprobar exposición» y busca la consulta en las consolas.'),
  ('03-node2shell', 'node', 'Node2Shell', 'CVE-2026-111497',
   'El riesgo es descomprimir Brotli que viene de afuera. Compara la versión de Node de cada lado: 22.20.0 contra 24.22.1.'),
  ('04-java4shell', 'java', 'Java4Shell', 'CVE-2026-114938',
   'Este servidor es un Intel Xeon con <b class="a">AVX-512</b>: aquí el «vulnerable» lo es de verdad. En una laptop sin AVX-512 saldría NO-EXPLOTABLE.'),
]
for id_, m, nombre, cve, guia in MODS:
    escena(id_, f'Laboratorio · {nombre}', 'experimentacion', 'comprobar', pagina(nombre, f'''
<div class="top"><h1>{nombre} <span class="d" style="font:600 .7em var(--mono)">{cve}</span></h1><p>{guia}</p></div>
<iframe src="/lab-2shell/?m={m}&embed=1" title="Laboratorio {nombre}: contenedor vulnerable y parchado con sus consolas"></iframe>
''', MOD_CSS))

# ---------------------------------------------------------------- 05 plan de acción
PLAN_CSS = """body{padding:clamp(20px,4vw,48px);display:flex;flex-direction:column;gap:18px}
h1{font-size:clamp(30px,5vw,52px);line-height:1.05;font-weight:800}
table{width:100%;border-collapse:collapse;font-size:.92em}
th,td{border-bottom:1px solid var(--linea);padding:10px 8px;text-align:left;vertical-align:top}
th{font:600 .75em var(--mono);color:var(--dim);letter-spacing:.08em;text-transform:uppercase}
td b{display:block}td small{color:var(--dim)}
label{display:flex;gap:8px;align-items:center;cursor:pointer}
input{width:20px;height:20px;accent-color:var(--verde)}"""
filas = [
  ('PHP2Shell', 'PHP 5.4–8.5 sin el punto de versión parchado', '<code>session.upload_progress.enabled = 0</code>', '8.3.27 · 8.4.14 · 8.5.1', 'FIM en el webroot, YARA de webshells, peticiones gigantes en access.log'),
  ('Node2Shell', 'Node &lt; 22.23.4 / 24.22.1 / 26.12.1; Node 20 o anterior', 'No descomprimir Brotli no confiable; límite de tamaño', '22.23.4 · 24.22.1 · 26.12.1 (Node 20: migrar)', 'Caídas de workers, <code>Content-Encoding: br</code> externo, salida anómala'),
  ('Java4Shell', 'OpenJDK ≥ 17.0.6 + CPU con AVX-512 + Base64 no confiable', '<code>-XX:-UseBASE64Intrinsics</code>', 'Parche del JDK de tu distribución', 'SIGSEGV de la JVM; inventario de JDK por host y por CPU'),
]
tr = ''.join(f'<tr><td><b>{n}</b></td><td><small>{a}</small></td><td>{m}</td><td><small>{p}</small></td><td><small>{d}</small></td>'
             f'<td><label><input type="checkbox"> listo</label></td></tr>' for n, a, m, p, d in filas)
escena('05-plan-de-accion', 'Tu plan de acción', 'reflexion', 'plan', pagina('Plan de acción', f'''
<p class="k">Para llevar a tu empresa</p>
<h1>Tu plan de acción</h1>
<table><thead><tr><th>Vulnerabilidad</th><th>¿Afectado si…?</th><th>Mitiga hoy</th><th>Parche</th><th>Detecta</th><th></th></tr></thead><tbody>{tr}</tbody></table>
<p class="d">Orden: inventaría versiones → comprueba la exposición → mitiga hoy → parchea → activa la detección.</p>
''', PLAN_CSS))
print('escenas de t2s-01 generadas en', os.path.normpath(LIVE))
