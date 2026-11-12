#!/usr/bin/env python3
"""Rutas profesionales de JMD Learning: https://jmd-learn.online/rutas/ (índice) y /rutas/<slug>/ (una por ruta).

Cada ruta agrupa cursos que ya existen en el LMS en tres niveles (Comprende, Aplica, Crea; tomados del marco de
competencias en IA de UNESCO para estudiantes, 2024) y cierra con un proyecto final evaluado con rúbrica. Los cursos
sueltos siguen siendo la puerta de entrada; la ruta completa se paga con 20 % de descuento sobre la suma.

Vocabulario: «Ruta», «Especialidad práctica», «Certificado de especialidad». Nunca «diplomado», «carrera profesional»,
«posgrado» ni «título»: JMD Learning es educación continua, no universidad ni instituto licenciado.

Uso:  ~/Downloads/OpenMontage/.venv/bin/python armar.py      (reusa el diseño y el lector de cursos-web/armar.py)
      LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
"""
import datetime as dt
import importlib.util
import pathlib
import urllib.parse

AQUI = pathlib.Path(__file__).resolve().parent
# cursos-web/armar.py: CSS, CABEZA, leer_curso, qr_svg, fecha_corta, esc (se carga con otro nombre: este también es armar)
_spec = importlib.util.spec_from_file_location("cursos_armar", AQUI.parent / "cursos-web" / "armar.py")
cw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cw)

WEB = AQUI / "web"
HOY = dt.datetime.now()
esc = cw.esc

# id del LMS (el grupo más reciente), página pública si existe, una línea de qué logras.
C = {
    "ia-para-todos": dict(lms="ia-para-todos-deepseek", nombre="IA para todos: DeepSeek Harness", link=None,
                          que="Usa un asistente de IA en tu trabajo diario sin gastar de más."),
    "vibecoding": dict(lms="programacion-agentica-g10", nombre="Programación agéntica (vibecoding)", link="/cursos/programacion-agentica/",
                       que="Construye y publica una aplicación dándole instrucciones a un agente."),
    "seguridad": dict(lms="seguridad-codificacion-ia", nombre="Seguridad en codificación con IA", link="/cursos/seguridad-con-ia/",
                      que="Detecta y corrige los fallos de seguridad que la IA deja en el código."),
    "python": dict(lms="python-api", nombre="Python: de cero a tu API", link=None,
                   que="Escribe tu primera API en Python, con pruebas y documentación."),
    "requerimientos": dict(lms="diseno-de-requerimientos-3", nombre="Ingeniería de requerimientos con IA", link="/cursos/ingenieria-de-requerimientos/",
                           que="Pasa de un pedido del cliente a un módulo implementado y validado."),
    "claude-pro": dict(lms="claude-code-pro-2", nombre="Claude Code PRO", link="/cursos/claude-code-pro/",
                       que="Domina skills, hooks, subagentes y flujos profesionales con Claude Code."),
    "qa": dict(lms="pruebas-qa-ia-2", nombre="Automatización de pruebas y QA con IA", link="/cursos/pruebas-y-qa-con-ia/",
               que="Automatiza pruebas de interfaz y de API que corren solas."),
    "potencia": dict(lms="potencia-agentes-2", nombre="Potencia tus agentes", link="/cursos/potencia-tus-agentes/",
                     que="Menos tokens, más poder: mide y recorta el consumo de tus agentes."),
    "deepseek": dict(lms="deepseek-harness-3", nombre="DeepSeek Harness", link="/cursos/deepseek-harness/",
                     que="Optimiza recursos y documenta sistemas enteros con un modelo económico."),
    "qwen": dict(lms="orquestacion-qwen-coder", nombre="Orquestación con Qwen Coder", link=None,
                 que="Coordina varios agentes que se reparten un proyecto grande."),
    "docker": dict(lms="docker-vs-podman", nombre="Docker vs Podman: el versus DevOps", link=None,
                   que="Empaqueta y despliega tus aplicaciones en contenedores."),
    "bot": dict(lms="bot-whatsapp-avanzado-2", nombre="Bot de WhatsApp avanzado", link="/cursos/bot-whatsapp-avanzado/",
                que="Un bot de WhatsApp con IA que atiende, recuerda y deriva a una persona."),
    "scraping": dict(lms="web-scraping-etico-2", nombre="Web scraping ético con IA", link="/cursos/web-scraping-etico/",
                     que="Recoge datos públicos de la web con permiso, orden y sin bloquear a nadie."),
    "cerebros": dict(lms="maestro-cerebros-ia", nombre="Maestro de cerebros de IA", link=None,
                     que="Dale memoria y conocimiento propio a tus asistentes (embeddings y RAG)."),
    "golden": dict(lms="goldenquerys-ia", nombre="GoldenQuerys con IA", link=None,
                   que="Genera reportes dinámicos en SQL pidiéndolos en español."),
    "bi": dict(lms="bi-clickhouse", nombre="Dashboards y BI con IA", link="/cursos/dashboards-bi-con-ia/",
               que="Tableros rápidos sobre millones de filas con ClickHouse y Claude."),
    "excel": dict(lms="excel-ia-contabilidad", nombre="Excel + IA para Contabilidad, Tributación y Tesorería", link=None,
                  que="Cierres, conciliaciones e impuestos en Excel con ayuda de la IA."),
    "excel-int": dict(lms="excel-ia-intensivo", nombre="Excel + IA para Contabilidad · Intensivo", link=None,
                      que="El mismo programa en formato intensivo, con casos de tu empresa."),
    "negocio": dict(lms="potencia-tu-negocio", nombre="Potencia tu negocio: tienda virtual con WhatsApp", link=None,
                    que="Tu catálogo en internet con pedidos directos a tu WhatsApp."),
    "tienda": dict(lms="tienda-web-facturacion-2", nombre="Tienda web con facturación electrónica", link="/cursos/tienda-web-facturacion/",
                   que="Una tienda que cobra y emite boletas y facturas electrónicas."),
    "interfaces": dict(lms="diseno-interfaces", nombre="Diseño de interfaces", link="/cursos/diseno-de-interfaces/",
                       que="Pantallas que se entienden solas, diseñadas y probadas con IA."),
    "pwa": dict(lms="pwa-app-movil", nombre="PWA: app móvil ágil", link=None,
                que="Convierte tu web en una app instalable que funciona sin conexión."),
    "diseno": dict(lms="dificil-de-explicar-domingo-manana", nombre="¿Difícil de explicar? ¡No! Diseño y edición con IA",
                   link="/cursos/diseno-y-edicion-con-ia/", que="Explica ideas complejas con piezas gráficas y video editados con IA."),
    "openmontage": dict(lms="crea-contenido-openmontage", nombre="Crea contenido con OpenMontage", link="/openmontage/",
                        que="Produce videos para tu marca con un agente de IA."),
    "tutoriales": dict(lms="tutoriales-en-video", nombre="Elaboración de tutoriales en video", link=None,
                       que="Tutoriales claros: guion, pantalla, voz y edición."),
    "gsap": dict(lms="gsap-avanzado", nombre="GSAP avanzado: animaciones web", link=None,
                 que="Animaciones web profesionales con línea de tiempo y scroll."),
    "videojuegos": dict(lms="ready-set-go-2", nombre="Ready Set Go! Videojuegos con IA", link="/readysetgo/",
                        que="Haz y publica tu videojuego con IA, con hackathon al final."),
}

TRONCO = ["ia-para-todos", "vibecoding", "seguridad"]

RUTAS = [
    dict(slug="desarrollo-de-software-con-ia", nombre="Desarrollo de software con IA", puesto="Desarrollador de software con IA",
         acento="#ff8a3d",
         bajada="Para quien quiere construir sistemas reales con agentes de IA: del requerimiento al despliegue, con pruebas y seguridad.",
         para="Estudiantes y egresados de computación, programadores que quieren rendir el doble y técnicos que ya automatizan cosas.",
         niveles=[["vibecoding", "python"], ["requerimientos", "claude-pro", "qa"], ["potencia", "deepseek", "qwen", "docker"]],
         logras=["Convertir un pedido en un requerimiento claro y en un módulo que funciona.",
                 "Dirigir agentes de código sin perder el control de la calidad ni del gasto.",
                 "Probar, asegurar y desplegar en contenedores lo que construyes."],
         proyecto="Un módulo real (por ejemplo, de un negocio de tu entorno) con requerimiento escrito, pruebas automáticas, "
                  "revisión de seguridad, despliegue en contenedor y documentación generada."),
    dict(slug="agentes-y-automatizacion", nombre="Agentes y automatización", puesto="Arquitecto de agentes de IA",
         acento="#7cc6ff",
         bajada="Para quien quiere que la IA trabaje sola: bots que atienden, agentes que buscan datos y asistentes con memoria propia.",
         para="Emprendedores, áreas de atención al cliente, analistas y desarrolladores que automatizan procesos.",
         niveles=[["vibecoding", "bot"], ["scraping", "cerebros"], ["potencia", "qwen"]],
         logras=["Diseñar un agente con herramientas, memoria y límites claros.",
                 "Conectarlo a WhatsApp y a fuentes de datos de forma ética.",
                 "Medir su costo y coordinar varios agentes en un mismo flujo."],
         proyecto="Un agente funcionando para un caso real: atiende por WhatsApp, consulta tu base de conocimiento, "
                  "registra lo que hace y escala a una persona cuando no sabe."),
    dict(slug="datos-y-bi-con-ia", nombre="Datos y BI con IA", puesto="Analista de datos con IA",
         acento="#f6cf47",
         bajada="Para quien vive entre hojas de cálculo y reportes: consultas en español, tableros rápidos y datos que se actualizan solos.",
         para="Contadores, analistas, administradores y jefes de área que necesitan números confiables a tiempo.",
         niveles=[["excel"], ["golden", "scraping"], ["bi"]],
         logras=["Pedir reportes a la base de datos en español y verificar lo que devuelve.",
                 "Armar tableros que se actualizan solos sobre datos grandes.",
                 "Documentar de dónde sale cada número."],
         proyecto="Un tablero con datos reales de tu trabajo (ventas, cobranzas o inventario) que se actualiza solo, "
                  "con sus consultas documentadas y una lectura escrita de lo que muestra.",
         sublinea=dict(nombre="Sublínea Finanzas y tributación con IA",
                       texto="Para contadores: Excel + IA para Contabilidad, Tributación y Tesorería (regular o intensivo) más GoldenQuerys con IA.",
                       cursos=["excel", "excel-int", "golden"])),
    dict(slug="producto-digital-y-negocio", nombre="Producto digital y negocio en línea", puesto="Creador de productos digitales",
         acento="#9be37d",
         bajada="Para quien quiere vender en internet con su propia plataforma: tienda, facturación electrónica y app en el celular del cliente.",
         para="Emprendedores, negocios familiares y desarrolladores que atienden a pymes.",
         niveles=[["negocio"], ["tienda", "interfaces"], ["pwa"]],
         logras=["Publicar una tienda que cobra y emite comprobantes electrónicos.",
                 "Diseñar pantallas que el cliente entiende sin ayuda.",
                 "Llevar tu tienda al celular como app instalable."],
         proyecto="Tu tienda o app publicada en internet, con catálogo, cobro, comprobante electrónico de prueba "
                  "y una versión instalable en el celular."),
    dict(slug="medios-interactivos-y-contenido", nombre="Medios interactivos y contenido con IA", puesto="Creador de contenido y medios interactivos",
         acento="#ff5c7a",
         bajada="Para quien comunica: videos, tutoriales, animaciones web y videojuegos hechos con IA y publicados.",
         para="Docentes, comunicadores, diseñadores, marketeros y creadores de contenido.",
         niveles=[["diseno", "tutoriales"], ["openmontage", "gsap"], ["videojuegos"]],
         logras=["Explicar algo complejo en una pieza corta y clara.",
                 "Producir video y animación con agentes, sin depender de un estudio.",
                 "Publicar una experiencia interactiva propia: web animada o videojuego."],
         proyecto="Una pieza publicada para un público real (video, web animada o videojuego), con su guion, "
                  "sus fuentes y lo que midió al publicarla."),
]

NIVELES = [("Comprende", "Bases y primeros resultados"), ("Aplica", "Resuelves casos reales"), ("Crea", "Diseñas y diriges soluciones propias")]

WA, WA_TXT = cw.WA, cw.WA_TXT

EXTRA = """
  .niveles { display:grid; gap:14px; }
  .nivel { background:var(--tarjeta); border:1px solid var(--linea); border-left:4px solid var(--acento); border-radius:18px; padding:16px 18px; }
  .nivel h3 { font-size:19px; display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; }
  .nivel h3 small { color:var(--suave); font-weight:600; font-size:14px; }
  .cursos-n { display:grid; gap:10px; margin-top:10px; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); }
  .cn { display:grid; gap:4px; text-decoration:none; border:1px solid var(--linea); border-radius:14px; padding:12px 14px; }
  a.cn:hover, a.cn:focus-visible { border-color:var(--acento); outline:none; }
  .cn b { font-size:16px; line-height:1.3; }
  .cn p { color:var(--suave); font-size:14px; }
  .cn .cuando { font-size:13px; font-weight:800; color:var(--acento); }
  .cn .cuando.gris { color:var(--suave); font-weight:600; }
  .letra { color:var(--suave); font-size:13px; margin-top:10px; }
  .rutas { display:grid; gap:14px; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); margin-top:20px; }
  .ruta { display:grid; align-content:start; gap:6px; text-decoration:none; background:var(--tarjeta); border:1px solid var(--linea); border-top:4px solid var(--acento); border-radius:18px; padding:18px; }
  .ruta:hover, .ruta:focus-visible { border-color:var(--acento); outline:none; }
  .ruta .puesto { color:var(--acento); font-weight:800; font-size:13px; text-transform:uppercase; letter-spacing:.06em; }
  .ruta b { font-size:21px; line-height:1.2; font-family:"EB Garamond", Georgia, serif; }
  .ruta p { color:var(--suave); font-size:14px; }
  .ruta .pie { font-weight:700; font-size:14px; }
  .tronco { display:flex; flex-wrap:wrap; gap:10px; margin-top:8px; }
  .tronco a, .tronco span { text-decoration:none; border:1px solid var(--linea); border-radius:99px; padding:8px 14px; font-weight:600; font-size:15px; }
  .tronco a:hover { border-color:var(--acento); }
  .modelo { display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); }
"""


def info_curso(k):
    c = C[k]
    try:
        _, ses = cw.leer_curso(c["lms"])
    except FileNotFoundError:
        ses = []
    futuras = [s for s in ses if s["ini"] > HOY]
    horas = sum((s["fin"] - s["ini"]).total_seconds() for s in ses) / 3600 if ses else 0
    proxima = futuras[0]["ini"] if futuras and ses and ses[0]["ini"] > HOY else None
    return dict(**c, horas=horas, proxima=proxima)


def tarjeta_curso(k):
    i = info_curso(k)
    cuando = (f'<span class="cuando">Próximo grupo: {esc(cw.fecha_corta(i["proxima"]))}</span>' if i["proxima"]
              else '<span class="cuando gris">Próximo grupo: pregunta por WhatsApp</span>')
    cuerpo = f'{cuando}<b>{esc(i["nombre"])}</b><p>{esc(i["que"])}</p>'
    return (f'<a class="cn" href="{esc(i["link"])}">{cuerpo}</a>' if i["link"] else f'<div class="cn">{cuerpo}</div>'), i


def bloque_certificacion():
    return """<h2>Cómo se certifica</h2>
  <div class="modelo">
    <div class="caja"><b>Por cada curso</b><p class="sub" style="margin:6px 0 0">Certificado con horas lectivas, código único y QR. Cualquiera lo comprueba en jmd-learn.online/verificar. Incluye insignia digital Open Badges 3.0 para LinkedIn.</p></div>
    <div class="caja"><b>Por la ruta completa</b><p class="sub" style="margin:6px 0 0">Certificado de especialidad al aprobar todos los cursos de la ruta y el proyecto final, evaluado con una rúbrica que conoces desde el primer día.</p></div>
    <div class="caja"><b>Por evidencia, no por asistencia</b><p class="sub" style="margin:6px 0 0">Cada nivel se aprueba con algo que construyes y publicas. Al terminar tienes un portafolio, no solo un papel.</p></div>
  </div>
  <p class="letra">JMD Learning ofrece capacitación de educación continua. Sus certificados acreditan horas y competencias trabajadas; no son grados ni títulos académicos.</p>"""


def bloque_inscripcion(wa, titulo):
    return f"""<section class="inscripcion">
    <div>
      <h2>Empieza por un curso o toma la ruta</h2>
      <ol class="pasos">
        <li>Escanea el código o toca el botón: se abre WhatsApp con tu mensaje listo.</li>
        <li>Elige: un curso suelto, o la ruta completa con 20 % de descuento sobre la suma de sus cursos.</li>
        <li>Recibes tu acceso al aula virtual y las fechas de cada curso.</li>
      </ol>
      <a class="boton wa" href="{esc(wa)}">WhatsApp {WA_TXT}</a>
    </div>
    <div class="qr"><img src="qr.svg" alt="Código QR que abre WhatsApp para preguntar por {esc(titulo)}"><p>Escanea para inscribirte</p></div>
  </section>"""


def pagina(r, resumen):
    carpeta = WEB / r["slug"]
    carpeta.mkdir(parents=True, exist_ok=True)
    msg = f"Hola, quiero información de la ruta {r['nombre']} de JMD Learning"
    wa = f"https://wa.me/{WA}?text={urllib.parse.quote(msg)}"
    cw.qr_svg(wa, carpeta / "qr.svg")
    horas, n = 0.0, 0
    bloques = []
    for (nom, sub), ks in zip(NIVELES, r["niveles"]):
        tarjetas = []
        for k in ks:
            t, i = tarjeta_curso(k)
            tarjetas.append(t)
            horas += i["horas"]
            n += 1
        bloques.append(f'<div class="nivel"><h3>{nom} <small>{sub}</small></h3><div class="cursos-n">{"".join(tarjetas)}</div></div>')
    sub_html = ""
    if r.get("sublinea"):
        s = r["sublinea"]
        sub_html = (f'<h2>{esc(s["nombre"])}</h2><p class="sub">{esc(s["texto"])}</p><div class="cursos-n">'
                    + "".join(tarjeta_curso(k)[0] for k in s["cursos"]) + "</div>")
    tronco = "".join(
        (f'<a href="{esc(C[k]["link"])}">{esc(C[k]["nombre"])}</a>' if C[k]["link"] else f'<span>{esc(C[k]["nombre"])}</span>') for k in TRONCO)
    horas_txt = f"{round(horas)} h en vivo" if horas else "En vivo por Zoom"
    titulo = f"Ruta {r['nombre']}"
    desc = f"{r['bajada']} {n} cursos en vivo en tres niveles y un proyecto final. Certificado de especialidad verificable."
    h = cw.CABEZA.format(titulo=esc(titulo), desc=esc(desc[:300]), css=cw.CSS.replace("ACENTO", r["acento"]) + EXTRA) + f"""<body>
<div class="envoltura">
  <a class="marca" href="../">✦ JMD Learning · Rutas profesionales</a>
  <header>
    <p class="chip">Ruta · {esc(r["puesto"])}</p>
    <h1>{esc(r["nombre"])}</h1>
    <p class="bajada">{esc(r["bajada"])}</p>
    <div class="datos">
      <div class="dato"><span>Cursos</span><b>{n} cursos en 3 niveles</b></div>
      <div class="dato"><span>Duración</span><b>{esc(horas_txt)} + práctica</b></div>
      <div class="dato"><span>Cierre</span><b>Proyecto final con rúbrica</b></div>
      <div class="dato"><span>Ruta completa</span><b class="precio" style="font-size:24px">20 % menos</b></div>
    </div>
    <div class="acciones">
      <a class="boton wa" href="{esc(wa)}">Pregunta por la ruta</a>
      <a class="boton sec" href="#niveles">Ver los cursos</a>
    </div>
  </header>
  <h2>Para quién es</h2>
  <p class="sub">{esc(r["para"])}</p>
  <h2>Al terminar podrás</h2>
  <ul class="lista">{"".join(f"<li>{esc(x)}</li>" for x in r["logras"])}</ul>
  <h2 id="niveles">Los cursos, en orden</h2>
  <p class="sub">Puedes entrar por cualquier curso. Para la ruta completa, conviene seguir el orden de los niveles.</p>
  <div class="niveles">{"".join(bloques)}</div>
  {sub_html}
  <h2>Tronco común recomendado</h2>
  <p class="sub">Sirve para todas las rutas. Si ya llevaste alguno, cuenta para tu avance.</p>
  <div class="tronco">{tronco}</div>
  <h2>Proyecto final</h2>
  <div class="caja"><p>{esc(r["proyecto"])}</p></div>
  {bloque_certificacion()}
  {bloque_inscripcion(wa, titulo)}
  <footer>JMD Learning · <a href="../">Todas las rutas</a> · <a href="/cursos/">Próximos cursos</a> · jmd-learn.online</footer>
</div>
</body>
</html>
"""
    (carpeta / "index.html").write_text(h, encoding="utf-8")
    resumen.append(dict(r, n=n, horas=horas))
    print(f"ok {r['slug']:34s} {n} cursos, {horas:.1f} h en vivo")


def indice(res):
    WEB.mkdir(parents=True, exist_ok=True)
    wa = f"https://wa.me/{WA}?text={urllib.parse.quote('Hola, quiero información de las rutas de JMD Learning')}"
    cw.qr_svg(wa, WEB / "qr.svg")
    tarjetas = "".join(
        f'<a class="ruta" href="{r["slug"]}/" style="--acento:{r["acento"]}"><span class="puesto">{esc(r["puesto"])}</span>'
        f'<b>{esc(r["nombre"])}</b><p>{esc(r["bajada"])}</p><span class="pie">{r["n"]} cursos · 3 niveles · proyecto final</span></a>'
        for r in res)
    tronco = "".join(
        (f'<a href="{esc(C[k]["link"])}">{esc(C[k]["nombre"])}</a>' if C[k]["link"] else f'<span>{esc(C[k]["nombre"])}</span>') for k in TRONCO)
    h = cw.CABEZA.format(titulo="Rutas profesionales",
                         desc="Cinco rutas de especialidad práctica con IA: software, agentes, datos, producto digital y contenido. Cursos en vivo, proyecto final y certificado verificable.",
                         css=cw.CSS.replace("ACENTO", "#f3c45a") + EXTRA) + f"""<body>
<div class="envoltura">
  <p class="marca">✦ JMD Learning</p>
  <header>
    <p class="chip">Especialidades prácticas con IA</p>
    <h1>Elige tu ruta profesional</h1>
    <p class="bajada">Cursos cortos en vivo que se suman en una especialidad. Avanzas en tres niveles —Comprende, Aplica, Crea—, cierras con un proyecto real y te llevas un certificado verificable y un portafolio.</p>
    <div class="acciones"><a class="boton wa" href="{esc(wa)}">WhatsApp {WA_TXT}</a><a class="boton sec" href="/cursos/">Ver próximos cursos</a></div>
  </header>
  <div class="rutas">{tarjetas}</div>
  <h2>Tronco común</h2>
  <p class="sub">Tres cursos que sirven para cualquier ruta.</p>
  <div class="tronco">{tronco}</div>
  <h2>Cómo funciona</h2>
  <div class="modelo">
    <div class="caja"><b>1 · Entra por un curso</b><p class="sub" style="margin:6px 0 0">Cada curso dura pocas sesiones en vivo y tiene su propio certificado. No necesitas comprometerte con todo de golpe.</p></div>
    <div class="caja"><b>2 · Súmalos en una ruta</b><p class="sub" style="margin:6px 0 0">Los cursos que apruebas cuentan para tu ruta. Si pagas la ruta completa, tienes 20 % de descuento sobre la suma.</p></div>
    <div class="caja"><b>3 · Cierra con un proyecto</b><p class="sub" style="margin:6px 0 0">Un proyecto real evaluado con rúbrica. Al aprobarlo recibes tu certificado de especialidad.</p></div>
  </div>
  {bloque_certificacion()}
  <footer>JMD Learning · jmd-learn.online · WhatsApp {WA_TXT}</footer>
</div>
</body>
</html>
"""
    (WEB / "index.html").write_text(h, encoding="utf-8")


if __name__ == "__main__":
    res = []
    for r in RUTAS:
        pagina(r, res)
    indice(res)
