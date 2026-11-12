#!/usr/bin/env python3
"""Material de las rutas: un flyer por ruta (1080x1350 PNG) y el dossier para proponer un convenio de educación
continua a una universidad o al CIP (PDF). Ambos salen de los datos de armar.py.

Uso:  ~/Downloads/OpenMontage/.venv/bin/python material.py
Salida: ~/Downloads/rutas-jmd/flyer-<slug>.png y ~/Downloads/rutas-jmd/propuesta-convenio-jmd-learning.pdf
"""
import base64
import json
import pathlib
import subprocess
import sys

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import armar as ra  # noqa: E402

SAL = pathlib.Path.home() / "Downloads/rutas-jmd"
SAL.mkdir(parents=True, exist_ok=True)
esc = ra.esc

FUENTES = ('<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@500;700&family=Inter:wght@400;600;800'
           '&display=swap" rel="stylesheet">')


def flyer(r, info):
    qr = base64.b64encode((ra.WEB / r["slug"] / "qr.svg").read_bytes()).decode()
    def cursos(ks):
        return "".join("<p>" + esc(ra.C[k]["nombre"]) + "</p>" for k in ks)
    filas = "".join(
        f'<div class="nv"><span>{n}</span><div>{cursos(ks)}</div></div>'
        for (n, _), ks in zip(ra.NIVELES, r["niveles"]))
    return f"""<!doctype html><html><head><meta charset="utf-8">{FUENTES}<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1080px;height:1350px;background:radial-gradient(120% 70% at 50% 0%,#2c2219 0%,#0f0c0a 60%);color:#fbf5ec;
 font-family:Inter,sans-serif;padding:70px 76px;display:flex;flex-direction:column;gap:30px;border-top:18px solid {r['acento']}}}
.marca{{font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:#c8baa6;font-weight:600}}
.chip{{align-self:flex-start;background:{r['acento']};color:#140d08;font-weight:800;font-size:26px;padding:10px 22px;border-radius:99px}}
h1{{font-family:"EB Garamond",serif;font-size:96px;line-height:.98}}
.baj{{font-size:30px;color:#c8baa6;line-height:1.35}}
.nv{{display:grid;grid-template-columns:190px 1fr;gap:20px;border-top:1px solid #33291f;padding-top:16px}}
.nv span{{color:{r['acento']};font-weight:800;font-size:30px}}
.nv p{{font-size:27px;font-weight:600;line-height:1.35}}
.pie{{margin-top:auto;display:flex;gap:34px;align-items:center;justify-content:space-between}}
.pie b{{display:block;font-size:34px}} .pie small{{font-size:24px;color:#c8baa6;display:block;margin-top:6px}}
.qr{{background:#fff;border-radius:22px;padding:14px;width:230px;flex:0 0 230px}} .qr img{{width:100%;display:block}}
</style></head><body>
<p class="marca">✦ JMD Learning · Ruta profesional</p>
<p class="chip">{esc(r['puesto'])}</p>
<h1>{esc(r['nombre'])}</h1>
<p class="baj">{info['n']} cursos en vivo · 3 niveles · proyecto final · certificado de especialidad verificable</p>
<div style="display:grid;gap:14px">{filas}</div>
<div class="pie"><div><b>Ruta completa: 20 % menos</b><small>Empieza por cualquier curso · WhatsApp 986 149 476</small>
<small>jmd-learn.online/rutas/{r['slug']}/</small></div><div class="qr"><img src="data:image/svg+xml;base64,{qr}"></div></div>
</body></html>"""


def dossier(res):
    rutas = ""
    for r in res:
        niveles = "".join(
            f"<tr><td><b>{n}</b><br><small>{s}</small></td><td>" + "<br>".join(esc(ra.C[k]["nombre"]) for k in ks) + "</td></tr>"
            for (n, s), ks in zip(ra.NIVELES, r["niveles"]))
        logras = "".join(f"<li>{esc(x)}</li>" for x in r["logras"])
        rutas += f"""<section class="ruta"><h2>{esc(r['nombre'])}</h2>
<p><b>Perfil de egreso:</b> {esc(r['puesto'])}. <b>Dirigido a:</b> {esc(r['para'])}</p>
<p><b>Horas:</b> {round(r['horas'])} h lectivas en vivo + práctica guiada en el aula virtual · {r['n']} cursos.</p>
<table><tr><th>Nivel</th><th>Cursos</th></tr>{niveles}</table>
<p><b>Competencias de salida</b></p><ul>{logras}</ul>
<p><b>Proyecto final (evaluación sumativa):</b> {esc(r['proyecto'])}</p></section>"""
    return f"""<!doctype html><html lang="es-PE"><head><meta charset="utf-8">{FUENTES}<style>
@page{{size:A4;margin:18mm 18mm 20mm}}
body{{font-family:Inter,sans-serif;font-size:10.5pt;line-height:1.5;color:#1d1406}}
h1{{font-family:"EB Garamond",serif;font-size:30pt;line-height:1.05;margin:0 0 6pt}}
h2{{font-family:"EB Garamond",serif;font-size:17pt;margin:16pt 0 4pt;color:#7a3b0c}}
h3{{font-size:11.5pt;margin:12pt 0 3pt}}
.sub{{color:#6b5a48;font-size:12pt}} .marca{{letter-spacing:.16em;text-transform:uppercase;font-size:8.5pt;color:#6b5a48;font-weight:600}}
table{{border-collapse:collapse;width:100%;margin:6pt 0}} td,th{{border:1px solid #e3d7c6;padding:5pt 7pt;vertical-align:top;text-align:left}}
th{{background:#f6efe4}} small{{color:#6b5a48}} .ruta{{break-inside:avoid-page}} .portada{{break-after:page}}
.caja{{background:#f6efe4;border-radius:8pt;padding:8pt 11pt;margin:6pt 0}} .pend{{background:#fff4c2;padding:0 3pt}}
</style></head><body>
<div class="portada">
<p class="marca">JMD Learning · jmd-learn.online</p>
<h1>Propuesta de convenio de educación continua</h1>
<p class="sub">Rutas profesionales con inteligencia artificial: cinco especialidades prácticas, en vivo, con proyecto final y certificación verificable.</p>
<h2>1. Qué proponemos</h2>
<p>Ofrecer en conjunto, bajo el área de educación continua o extensión de la institución, las rutas profesionales de JMD Learning. La institución revisa y aprueba el sílabo, el perfil docente y la evaluación; JMD Learning dicta, opera el aula virtual y emite la certificación con el respaldo de ambas partes.</p>
<p>Las rutas se ofrecen como <b>programas de especialización / cursos de extensión</b>. No se ofrecen como diplomado de posgrado (Ley 30220, art. 43: mínimo 24 créditos) salvo que la institución decida ampliarlas a esa escala.</p>
<h2>2. Modelo educativo</h2>
<ul>
<li><b>Credenciales apilables</b> (modelo MicroMasters, MIT/edX): cada curso tiene certificado propio; los cursos aprobados se suman en un certificado de especialidad.</li>
<li><b>Niveles de logro</b> tomados del Marco de competencias en IA para estudiantes de UNESCO (2024): Comprende, Aplica, Crea.</li>
<li><b>Evaluación por evidencia</b> (educación basada en competencias): cada nivel se aprueba con un producto publicado y evaluado con rúbrica; la ruta cierra con un proyecto final real.</li>
<li><b>Clase activa en vivo</b>: sesiones por Zoom con escenas interactivas en el aula virtual (ejercicios, retos y concursos en tiempo real).</li>
</ul>
<h2>3. Certificación y verificación</h2>
<ul>
<li>Certificado por curso y certificado de especialidad con horas lectivas, código único y QR.</li>
<li>Verificación pública en jmd-learn.online/verificar, con lista de revocados.</li>
<li>Insignia digital por certificado según el modelo de datos Open Badges 3.0 (1EdTech), firmada (Ed25519).</li>
<li>Con convenio: el certificado incluye el logo y la firma de la autoridad de la institución.</li>
</ul>
<h2>4. Responsable académico</h2>
<div class="caja"><p><b>David Roncal</b> · Director e instructor, JMD Learning</p>
<p>Grado y título: <span class="pend">[completar]</span> · Certificaciones: <span class="pend">[completar]</span></p>
<p>Experiencia demostrable: sistemas en producción (facturación electrónica SUNAT, aula virtual propia con certificación verificable, despliegues en AWS); grupos dictados en programación agéntica, agentes de IA, datos, diseño y seguridad: <span class="pend">[N grupos · N alumnos]</span></p></div>
<h2>5. Qué aporta cada parte</h2>
<table><tr><th>Institución</th><th>JMD Learning</th></tr>
<tr><td>Revisión y aprobación académica del sílabo y docentes · respaldo en el certificado · difusión a su comunidad · aula física opcional</td>
<td>Dictado en vivo · aula virtual, materiales y grabaciones · evaluación con rúbrica · emisión y verificación de certificados · soporte por WhatsApp</td></tr></table>
<p><b>Modelo económico sugerido:</b> reparto de ingresos por alumno inscrito vía la institución, o tarifa por grupo cerrado. <span class="pend">[definir]</span></p>
</div>
<h1 style="font-size:24pt">Anexo: sílabo de las rutas</h1>
<p class="sub">Tronco común recomendado: {", ".join(esc(ra.C[k]["nombre"]) for k in ra.TRONCO)}.</p>
{rutas}
</body></html>"""


def main():
    res = []
    for r in ra.RUTAS:
        n, horas = 0, 0.0
        for ks in r["niveles"]:
            for k in ks:
                horas += ra.info_curso(k)["horas"]
                n += 1
        res.append(dict(r, n=n, horas=horas))
    trabajos = []
    for r in res:
        p = SAL / f"flyer-{r['slug']}.html"
        p.write_text(flyer(r, r), encoding="utf-8")
        trabajos.append(dict(html=str(p), png=str(SAL / f"flyer-{r['slug']}.png")))
    d = SAL / "propuesta-convenio-jmd-learning.html"
    d.write_text(dossier(res), encoding="utf-8")
    js = """
const { chromium } = require("/Users/david.roncal/Documents/jmd/lms/web/node_modules/playwright-core");
const [trab, html, pdf] = [JSON.parse(process.argv[1]), process.argv[2], process.argv[3]];
(async () => {
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const t of trab) { await p.goto("file://" + t.html); await p.waitForTimeout(900); await p.screenshot({ path: t.png }); }
  const q = await b.newPage(); await q.goto("file://" + html); await q.waitForTimeout(900);
  await q.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
})();"""
    subprocess.run(["node", "-e", js, json.dumps(trabajos), str(d), str(SAL / "propuesta-convenio-jmd-learning.pdf")], check=True)
    for t in trabajos:
        pathlib.Path(t["html"]).unlink()
    print("listo:", SAL)


if __name__ == "__main__":
    main()
