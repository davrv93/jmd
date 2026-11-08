# -*- coding: utf-8 -*-
"""Construye el curso «Excel + IA para Contabilidad, Tributación y Tesorería» desde los datos de contenido_m*.py.

Escribe: course.yaml, lessons/ex-NN-*.md, assignments/ex-mN-evidencia.md, materials/plan-modulos-kolb.md y
live/ex-NN/{01-contexto,02-juego,03-demo,04-caso,05-cierre}/escena.{yaml,html} (+ hoja-EXX.json y escenario.json del reto).
Uso:  python3 _fuente/construir.py
No toca materials/casos (los .xlsx los genera el generador del instructor, fuera del repo): los lee para la Hoja JMD.
"""
import html
import importlib
import re
import json
import os
import shutil
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
CURSO = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)
import hoja_jmd  # noqa: E402
EMPRESAS = json.load(open(os.path.join(AQUI, "empresas.json"), encoding="utf-8"))
CURSO_ID = "excel-ia-contabilidad"

# Plan de formación (Plan_6_Modulos_Excel_Ciclo_Kolb): 6 módulos de 2 horas, 20 clases, 12 horas.
MODULOS = [
    ("m1", "Módulo 1 · Registros contables y tributación (2 h)", [1, 2, 3, 4]),
    ("m2", "Módulo 2 · Gestión laboral y remuneraciones (2 h)", [5, 6, 7]),
    ("m3", "Módulo 3 · Inventarios y activos empresariales (2 h)", [8, 9, 10]),
    ("m4", "Módulo 4 · Cuentas y control bancario (2 h)", [11, 12, 13]),
    ("m5", "Módulo 5 · Planificación financiera y presupuesto (2 h)", [14, 15]),
    ("m6", "Módulo 6 · Estados financieros, auditoría y reportes (2 h)", [16, 17, 18, 19, 20]),
]
MINUTOS_MODULO = 120

# El ciclo de Kolb de cada módulo y su evidencia, tal como los pide el plan.
KOLB = {
    "m1": {"proposito": "Organizar compras y ventas en tablas de Excel, identificar los componentes de los comprobantes y calcular la base imponible, el IGV y el Impuesto a la Renta con fines didácticos, según el régimen y los supuestos definidos en clase.",
           "experiencia": "Revisar comprobantes y registros desordenados de la empresa e intentar determinar sus compras, ventas e impuestos.",
           "reflexion": "Publicar en el foro los errores encontrados y explicar cómo afectan los resultados.",
           "conceptos": "Lección breve y demostración sobre tablas inteligentes, comprobantes, débito y crédito fiscal y fórmulas de cálculo.",
           "aplicacion": "Resolver un caso nuevo con un registro de compras y ventas con fórmulas y validaciones.",
           "evidencia": "Archivo Excel con registros y hoja de cálculo tributario.",
           "integrador": "tu empresa abre su libro: registros de ventas y compras, IGV y renta."},
    "m2": {"proposito": "Elaborar una planilla con remuneraciones, asignaciones, descuentos y sueldo neto, y calcular gratificaciones y CTS con los datos y criterios laborales del caso.",
           "experiencia": "Examinar datos de trabajadores y una planilla que contiene errores de cálculo.",
           "reflexion": "Comparar resultados e identificar cómo el tiempo de servicio y los conceptos remunerativos afectan los pagos.",
           "conceptos": "Revisar los criterios laborales del caso y las fórmulas de Excel mediante ejemplos guiados.",
           "aplicacion": "Elaborar una nueva planilla y calcular los beneficios solicitados, explicando los supuestos utilizados.",
           "evidencia": "Archivo Excel con planilla, gratificaciones y CTS.",
           "integrador": "agregas la planilla, la gratificación y la CTS de los trabajadores de tu empresa."},
    "m3": {"proposito": "Controlar entradas, salidas, existencias y alertas de reposición; construir un kardex con promedio ponderado móvil y calcular la depreciación lineal para interpretar costo y valor en libros.",
           "experiencia": "Explorar movimientos de un almacén con diferencias de stock y una relación de activos.",
           "reflexion": "Explicar en el foro las posibles causas de faltantes y errores de valorización.",
           "conceptos": "Control de existencias, promedio ponderado móvil, vida útil, valor residual y depreciación lineal.",
           "aplicacion": "Construir el inventario, actualizar el kardex con nuevas operaciones y elaborar el cuadro de depreciación.",
           "evidencia": "Archivo Excel con inventario, kardex y depreciación.",
           "integrador": "sumas el inventario, el kardex y la depreciación de los activos de tu empresa."},
    "m4": {"proposito": "Administrar vencimientos, abonos y saldos pendientes, y comparar los movimientos contables con los bancarios para identificar diferencias, priorizar pagos y elaborar una conciliación.",
           "experiencia": "Revisar facturas pendientes, pagos parciales, registros internos y un estado de cuenta bancario.",
           "reflexion": "Identificar deudas vencidas, duplicados y movimientos sin correspondencia, y discutir sus causas.",
           "conceptos": "Calcular saldos y antigüedad de vencimientos, cruzar datos con BUSCARX y clasificar diferencias bancarias.",
           "aplicacion": "Resolver un caso nuevo con controles de cobros y pagos y una conciliación sustentada.",
           "evidencia": "Archivo Excel con cuentas pendientes y conciliación bancaria.",
           "integrador": "controlas los cobros, los pagos y el banco de tu empresa."},
    "m5": {"proposito": "Proyectar ingresos y egresos para anticipar necesidades de efectivo, elaborar un presupuesto, comparar lo planificado con lo ejecutado y analizar desviaciones para proponer decisiones.",
           "experiencia": "Examinar una empresa que registra ventas, pero tiene dificultades para pagar sus obligaciones.",
           "reflexion": "Debatir por qué vender no garantiza efectivo disponible y reconocer los periodos de mayor presión de pagos.",
           "conceptos": "Flujo de caja, saldos iniciales y finales, presupuesto y desviaciones mediante un ejemplo guiado.",
           "aplicacion": "Diseñar una proyección y probar escenarios con cambios en ventas, plazos de cobro y gastos.",
           "evidencia": "Archivo Excel con flujo de caja, presupuesto y escenarios comentados.",
           "integrador": "proyectas la caja de tu empresa y comparas su presupuesto con lo ejecutado."},
    "m6": {"proposito": "Elaborar estados financieros, interpretar indicadores, detectar inconsistencias y presentar los resultados en un dashboard con tablas dinámicas, gráficos, indicadores y segmentadores.",
           "experiencia": "Revisar datos financieros con duplicados, omisiones y reportes difíciles de interpretar.",
           "reflexion": "Determinar qué errores afectan la información y qué necesita conocer la gerencia.",
           "conceptos": "Estados financieros, análisis horizontal y vertical, indicadores, controles y herramientas de visualización.",
           "aplicacion": "Preparar estados financieros, documentar hallazgos y presentar un dashboard con conclusiones sustentadas.",
           "evidencia": "Estados financieros, reporte de hallazgos y dashboard en Excel.",
           "integrador": "cierras el libro de tu empresa con estados financieros, auditoría y el dashboard final."},
}

# Paso 1 de la ruta: el primer intento, antes de la explicación.
CASO_INICIAL = {
    1: "Mira la hoja Ventas de tu empresa: ¿cuántas ventas son gravadas y cuánto IGV crees que se cobró en el mes? Anota tu cálculo antes de la demo.",
    2: "Mira las facturas de compra: el importe ya trae el IGV. Separa a mano la base de una factura y anota cómo lo hiciste.",
    3: "Con ventas y compras de tres meses, intenta decir si en octubre se paga IGV o queda saldo a favor. ¿Qué datos te faltan?",
    4: "Mira los ingresos del año y los gastos: ¿qué gasto no debería restarse para la renta? Anota tu primera idea.",
    5: "Revisa la planilla: ¿quién debería recibir asignación familiar y cuánto se le descuenta de pensión a cada uno?",
    6: "Mira las fechas de ingreso: ¿todos cobran la gratificación completa? Señala a quién le toca menos y por qué.",
    7: "Con la remuneración y la fecha de ingreso, estima cuántos meses y días de CTS le corresponden a un trabajador.",
    8: "Revisa los movimientos del almacén: elige un producto y calcula su stock final a mano. ¿Coincide con lo esperado?",
    9: "En el kardex, después de una compra a otro precio, ¿a qué costo sale la siguiente venta? Anota tu respuesta.",
    10: "Mira la relación de activos: ¿cuál pierde más valor cada año y cuál vale menos hoy? Ordénalos a ojo.",
    11: "Revisa las facturas por cobrar y los pagos parciales: ¿qué clientes están vencidos y cuánto deben de verdad?",
    12: "Con las deudas y la caja disponible, ¿qué pagarías esta semana y qué dejarías para después?",
    13: "Compara el libro bancos con el estado de cuenta: busca una operación que esté solo en un lado y una que se repita.",
    14: "La empresa vende bien, pero en algún mes no le alcanza la caja. Mira ingresos y egresos e intenta ubicar ese mes.",
    15: "Compara lo presupuestado con lo ejecutado de una cuenta: ¿la diferencia es buena o mala noticia? Depende del tipo.",
    16: "Con los saldos de las cuentas, intenta armar la utilidad del año. ¿Qué cuentas restan y en qué orden?",
    17: "Hay cuentas sin grupo en el balance. Ubica cada una en activo, pasivo o patrimonio y mira si cuadra.",
    18: "Compara dos años de balance y resultados: ¿la empresa está mejor o peor? Elige un número que lo demuestre.",
    19: "Revisa el registro de ventas: busca un duplicado, un IGV mal calculado y un comprobante que falta.",
    20: "Con un año de ventas, ¿qué le dirías a la gerencia en una frase? Busca el mes y el canal más fuertes.",
}
# Paso 2: la pregunta del foro de reflexión (intervención propia + comentario a un compañero).
FORO = {
    1: "¿Qué error encontraste en las ventas (operación mal clasificada, IGV donde no va…) y cómo cambia el IGV del mes?",
    2: "¿Qué compra te costó clasificar y qué pasa con el crédito fiscal si la clasificas mal?",
    3: "¿Por qué un mes puede quedar con saldo a favor aunque la empresa haya vendido? Explícalo con un número de tu caso.",
    4: "¿Qué gasto no deducible encontraste y cómo afecta al impuesto a la renta?",
    5: "¿Qué error de cálculo es más fácil cometer en la planilla y a quién perjudica?",
    6: "¿Cómo cambia la gratificación con el tiempo de servicio? Usa el caso de un trabajador de tu empresa.",
    7: "¿Qué concepto entra en la remuneración computable de la CTS y cuál no? ¿Por qué importa?",
    8: "¿Qué puede causar un faltante de stock en tu almacén? Propón una causa y un control.",
    9: "¿Qué pasa con el costo de ventas si el kardex usa el precio de la última compra en vez del promedio?",
    10: "¿Por qué el valor en libros no es lo que vale el activo en el mercado?",
    11: "¿A qué cliente cobrarías primero y por qué? Usa la antigüedad de tu caso.",
    12: "¿Qué criterio usaste para priorizar pagos y qué riesgo corres con lo que dejaste para después?",
    13: "¿Qué diferencia entre el libro y el banco te sorprendió y cuál es su causa más probable?",
    14: "¿Por qué vender no garantiza tener efectivo? Señala el mes de mayor presión de pagos en tu caso.",
    15: "¿Qué desviación del presupuesto le explicarías primero a la gerencia y qué decisión propones?",
    16: "¿Qué rubro del estado de resultados se lleva la mayor parte de las ventas en tu empresa?",
    17: "¿Qué pasa si una cuenta queda en el grupo equivocado? ¿Qué indicador se distorsiona?",
    18: "¿Qué indicador cambió más entre los dos años y qué decisión tomarías con eso?",
    19: "¿Qué hallazgo de la auditoría tiene más impacto y qué control propones para que no se repita?",
    20: "¿Qué tiene que saber la gerencia en 30 segundos al ver tu dashboard?",
}
RUTA = [("contexto", "Caso inicial"), ("juego", "Foro de reflexión"), ("demo", "Lección y demostración"), ("caso", "Reto de aplicación"),
        ("cierre", "Retroalimentación y cierre")]
PESOS = [7, 4, 14, 30, 5]  # reparto de los minutos de cada clase entre los cinco pasos de la ruta


def minutos_clase(n):
    mid = modulo_de(n)[0]
    return MINUTOS_MODULO // len(next(s for m, _, s in MODULOS if m == mid))


def minutos_pasos(n):
    total = minutos_clase(n)
    mins = [max(1, round(total * p / sum(PESOS))) for p in PESOS]
    mins[3] += total - sum(mins)
    return mins


def modulo_de(n):
    for mid, titulo, ses in MODULOS:
        if n in ses:
            return mid, titulo
    raise KeyError(n)


def numero_modulo(mid):
    return int(mid[1:])


def siguiente_de(s):
    """La próxima clase; si cambia de módulo, lo dice (los textos de contenido_m*.py traen la numeración antigua)."""
    sig = re.sub(r"^Módulo [IVX\d]+ · ", "", s["cierre"].get("siguiente") or "")
    n = s["n"]
    if n < 20 and modulo_de(n + 1)[0] != modulo_de(n)[0]:
        mid, tit = modulo_de(n + 1)
        return tit.split(" · ")[0] + " · " + sig
    return sig


def sesiones():
    out = {}
    for m in ("contenido_m1", "contenido_m2", "contenido_m3", "contenido_m4", "contenido_m5"):
        try:
            mod = importlib.import_module(m)
        except ImportError:
            continue
        for s in mod.SESIONES:
            out[s["n"]] = s
    return out


def yaml_str(s):
    return json.dumps(s, ensure_ascii=False)


PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo_html}</title>
<!--
  Escena del modo LIVE · Excel + IA para Contabilidad (sesión {leccion}, {tipo}). Generada por _fuente/construir.py:
  edita los datos en _fuente/contenido_m*.py y vuelve a construir. Sin recursos externos; el motor está en
  live/_comun (ex.js dibuja la escena, juegos.js los minijuegos, dsh.js el botón de DeepSeek Harness y, en el reto,
  hoja-motor.js + hoja-xlsx.js + hoja.js + reto.js la Hoja JMD editable).
  El movimiento se apaga con prefers-reduced-motion (ver escena.css y ex.css).
-->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/ex.css">
{css}<style>@media (prefers-reduced-motion: reduce) {{ .a-in {{ animation: none !important; }} }}</style>
</head>
<body>
<div id="esc"></div>
{extra}<script type="application/json" id="ex-datos">{datos}</script>
<script src="../../comun/ex.js"></script>
{scripts}</body>
</html>
"""


def escribir_escena(leccion, carpeta, yml, datos, extra="", juegos=False, dsh=False, hoja=False):
    d = os.path.join(CURSO, "live", leccion, carpeta)
    os.makedirs(d, exist_ok=True)
    lineas = [f"id: {carpeta}"]
    for k in ("titulo", "fase", "paso", "duracion_min", "lo_logre", "evidencia", "umbral_pct", "compuerta", "dsh"):
        if k not in yml:
            continue
        v = yml[k]
        if isinstance(v, bool):
            v = "true" if v else "false"
        elif isinstance(v, str) and k == "titulo":
            v = yaml_str(v)
        lineas.append(f"{k}: {v}")
    open(os.path.join(d, "escena.yaml"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")
    scripts, css = "", ""
    if juegos:
        scripts += '<script src="../../comun/juegos.js"></script>\n'
    if hoja:
        css = '<link rel="stylesheet" href="../../comun/hoja.css">\n'
        for js in ("hoja-motor.js", "hoja-xlsx.js", "hoja.js", "reto.js"):
            scripts += f'<script src="../../comun/{js}"></script>\n'
    if dsh:
        scripts += '<script src="../../comun/dsh.js"></script>\n'
    js = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
    titulo_html = html.escape("Escena · " + yml["titulo"])
    open(os.path.join(d, "escena.html"), "w", encoding="utf-8").write(
        PLANTILLA.format(titulo_html=titulo_html, leccion=leccion, tipo=datos["tipo"], datos=js, scripts=scripts, extra=extra, css=css))


def construir_hoja(n, lec, previas):
    """Hoja JMD del reto: un hoja-EXX.json por empresa y el esquema del escenario (escenario.json)."""
    dest = os.path.join(CURSO, "live", lec, "04-caso")
    libros = {}
    for e in EMPRESAS:
        nombre = f"{lec}-{e['id']}-{e['slug']}"
        enunciado = os.path.join(CURSO, "materials", "casos", lec, nombre + ".xlsx")
        if not os.path.exists(enunciado):
            continue
        solucion = os.path.join(hoja_jmd.SOLUCIONES, lec, nombre + "-SOLUCION.xlsx")
        libro = hoja_jmd.libro_jmd(enunciado, solucion if os.path.exists(solucion) else None, previas.get(e["id"]))
        libros[e["id"]] = (hoja_jmd.leer_xlsx(enunciado), libro)
        with open(os.path.join(dest, f"hoja-{e['id']}.json"), "w", encoding="utf-8") as f:
            json.dump(libro, f, ensure_ascii=False, separators=(",", ":"))
    if libros:
        esq = hoja_jmd.esquema_escenario(libros, hoja_jmd.AJUSTES.get(n, {}))
        with open(os.path.join(dest, "escenario.json"), "w", encoding="utf-8") as f:
            json.dump(esq, f, ensure_ascii=False, indent=1)
    return len(libros), sum(len(l["revisar"]) for _, l in libros.values())


def construir_sesion(s):
    n = s["n"]
    lec = f"ex-{n:02d}"
    mid, mtit = modulo_de(n)
    k_mod = KOLB[mid]
    mins = minutos_pasos(n)
    base = {"leccion": lec, "sesion": n, "tema": s["titulo"], "modulo": mtit.split(" (")[0].split(" · ")[0], "ruta_min": mins}
    destino = os.path.join(CURSO, "live", lec)
    # La revisión de la Hoja JMD sale de las soluciones del instructor; sin ellas se conserva la de la versión anterior.
    previas = {}
    if not os.path.isdir(os.path.join(hoja_jmd.SOLUCIONES, lec)):
        for e in EMPRESAS:
            r = hoja_jmd.revision_de(os.path.join(destino, "04-caso", f"hoja-{e['id']}.json"))
            if r:
                previas[e["id"]] = r
    if os.path.isdir(destino):
        shutil.rmtree(destino)
    c = s["contexto"]
    escribir_escena(lec, "01-contexto", {"titulo": "Caso inicial · " + c["corto"], "fase": "experiencia", "paso": "contexto", "duracion_min": mins[0], "lo_logre": False,
                                         "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "ninguna"},
                    dict(base, escena="01-contexto", tipo="contexto", fase="ec", ruta=0, titulo=c["titulo"], idea=c["idea"], hoy=c.get("hoy"), diagrama=c["diagrama"],
                         caso_inicial=CASO_INICIAL[n]))
    j1 = dict(s["juego1"], id=f"{lec}-j1")
    foro = {"id": f"{lec}-foro", "titulo": "Foro de reflexión", "pregunta": FORO[n],
            "guia": "Escribe tu intervención aquí. Después, en «Preguntas» de la sesión, comenta con un argumento la de un compañero."}
    escribir_escena(lec, "02-juego", {"titulo": "Foro de reflexión · " + j1["titulo"], "fase": "reflexion", "paso": "juego", "duracion_min": mins[1], "lo_logre": True,
                                      "evidencia": "automatica", "umbral_pct": 70, "compuerta": "evidencia"},
                    dict(base, escena="02-juego", tipo="juego", fase="or", ruta=1, titulo="Reflexiona jugando: __" + j1["titulo"] + "__",
                         intro=s.get("intro1"), juego=j1, foro=foro), juegos=True)
    d = s["demo"]
    escribir_escena(lec, "03-demo", {"titulo": "Lección y demostración · " + d["corto"], "fase": "conceptualizacion", "paso": "demo", "duracion_min": mins[2], "lo_logre": False,
                                     "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "ninguna"},
                    dict(base, escena="03-demo", tipo="demo", fase="ca", ruta=2, titulo=d["titulo"], pasos=d["pasos"]))
    k = s["caso"]
    emp = [{x: e[x] for x in ("id", "slug", "corto", "razon", "ruc", "regimen", "rubro", "icono", "trab")} for e in EMPRESAS]
    marcador = f'<div data-jmd-dsh data-prompt="{html.escape(k["prompt"], quote=True)}"></div>\n'
    tareas = [t for t in k["tareas"] if not t.lower().startswith("pide a la ia")] + [
        "Pulsa **✔ Revisar**: lo verde está bien; corrige lo rojo y vuelve a revisar.",
        "Practica con **Simula tu escenario con IA** (otra empresa, otro periodo u otro régimen).",
        "Descarga tu archivo con **⬇ Excel**: es parte de la evidencia del módulo."]
    escribir_escena(lec, "04-caso", {"titulo": "Reto de aplicación · " + k["corto"], "fase": "experimentacion", "paso": "caso", "duracion_min": mins[3], "lo_logre": True,
                                     "evidencia": "automatica", "umbral_pct": 80, "compuerta": "lo_logre", "dsh": True},
                    dict(base, escena="04-caso", tipo="caso", fase="ea", ruta=3, titulo=k["titulo"], reto=k["corto"], tareas=tareas, consejo=k.get("consejo"),
                         integrador=k_mod["integrador"][0].upper() + k_mod["integrador"][1:], empresas=emp, curso=CURSO_ID), extra=marcador, dsh=True, hoja=True)
    hojas = construir_hoja(n, lec, previas)
    z = s["cierre"]
    j2 = dict(s["juego2"], id=f"{lec}-j2")
    cierre_foro = {"id": f"{lec}-cierre", "titulo": "Reflexión final",
                   "pregunta": "¿Qué aprendiste hoy, qué corregiste en tu hoja y cómo lo usarías en tu trabajo?",
                   "guia": "Una o dos frases. El instructor comenta los aciertos y lo que falta en la retroalimentación."}
    escribir_escena(lec, "05-cierre", {"titulo": "Retroalimentación y cierre · " + j2["titulo"], "fase": "reflexion", "paso": "cierre", "duracion_min": mins[4], "lo_logre": True,
                                       "evidencia": "automatica", "umbral_pct": 70, "compuerta": "evidencia"},
                    dict(base, escena="05-cierre", tipo="cierre", fase="or", ruta=4, titulo=z["titulo"], checklist=z["checklist"], siguiente=siguiente_de(s), juego=j2,
                         foro=cierre_foro),
                    juegos=True)
    escribir_leccion(s, lec, mid)
    return hojas


def es_ultima(n):
    mid = modulo_de(n)[0]
    return n == max(next(ses for m, _, ses in MODULOS if m == mid))


def escribir_leccion(s, lec, mid):
    n = s["n"]
    k_mod = KOLB[mid]
    mtit = modulo_de(n)[1]
    mins = minutos_pasos(n)
    obj = [{"id": f"{lec}-o{i + 1}", "title": t} for i, t in enumerate(s["objetivos"])]
    mats = [{"id": f"{lec}-plan", "title": "Plan del curso: 6 módulos con el ciclo de Kolb", "kind": "doc", "file": "materials/plan-modulos-kolb.md",
             "objective_ids": [obj[0]["id"]]},
            {"id": f"{lec}-empresas", "title": "Las 10 empresas ficticias del curso (fichas)", "kind": "doc", "file": "materials/empresas-ficticias.md",
             "objective_ids": [obj[0]["id"]]}]
    if s.get("guia"):
        mats.append({"id": f"{lec}-guia", "title": s["guia"][0], "kind": "doc", "file": s["guia"][1], "objective_ids": [o["id"] for o in obj]})
    gv = f"materials/guia-visual-{mid}"
    if os.path.isdir(os.path.join(CURSO, gv)) and os.listdir(os.path.join(CURSO, gv)):
        mats.append({"id": f"{lec}-guia-visual", "title": "Guía visual del módulo (la idea y la demo de cada clase)", "kind": "slides", "slides_dir": gv,
                     "objective_ids": [o["id"] for o in obj]})
    for e in EMPRESAS:
        f = f"materials/casos/{lec}/{lec}-{e['id']}-{e['slug']}.xlsx"
        if os.path.exists(os.path.join(CURSO, f)):
            mats.append({"id": f"{lec}-{e['id'].lower()}", "title": f"Caso · {e['id']} {e['corto']} (Excel)", "kind": "file", "file": f,
                         "objective_ids": [o["id"] for o in obj]})
    fm = ["---", f"id: {lec}", f"title: {yaml_str(f'Clase {n} · ' + s['titulo'])}", "published: true", f"duration: {minutos_clase(n)}", "objectives:"]
    for o in obj:
        fm += [f"  - id: {o['id']}", f"    title: {yaml_str(o['title'])}"]
    fm += ["recording:", '  url: ""', '  passcode: ""', "materials:"]
    for m in mats:
        fm += [f"  - id: {m['id']}", f"    title: {yaml_str(m['title'])}", f"    kind: {m['kind']}",
               f"    slides_dir: {m['slides_dir']}" if m.get("slides_dir") else f"    file: {m['file']}",
               f"    objective_ids: [{', '.join(m['objective_ids'])}]"]
    ciclo = [
        ("contexto", "1 · Caso inicial", "lms", "experiencia", f"Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. {CASO_INICIAL[n]}",
         "Hiciste tu primer intento y anotaste qué no cuadra"),
        ("juego", "2 · Foro de reflexión", "lms", "reflexion", f"Escena 2: juego «{s['juego1']['titulo']}» y muro con tu reflexión: {FORO[n]} Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero.",
         "Publicaste tu reflexión y comentaste la de un compañero"),
        ("demo", "3 · Lección y demostración", "lms", "conceptualizacion", "Escena 3: explicación breve y demostración paso a paso. Repásala en la guía visual del módulo.",
         "Viste todos los pasos y puedes decir qué hace cada fórmula"),
        ("caso", "4 · Reto de aplicación", "lms", "experimentacion", "Escena 4: un caso de tu empresa en la Hoja JMD. Escribe las fórmulas, pulsa «Revisar», simula un escenario con IA y descarga tu Excel.",
         "La revisión de la Hoja JMD sale en verde y descargaste tu Excel"),
        ("cierre", "5 · Retroalimentación y cierre", "lms", "reflexion", "Escena 5: lista de comprobación, juego de repaso «" + s["juego2"]["titulo"] + "» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo.",
         "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"),
    ]
    if es_ultima(n):
        ciclo.append(("evidencia", f"Evidencia del {mtit.split(' (')[0].split(' · ')[0]}", "lms", "experimentacion",
                      f"Entrega en «Tareas» la evidencia del módulo: {k_mod['evidencia']} Incluye una breve explicación de tus decisiones. Puedes corregir y volver a entregar después de la retroalimentación.",
                      "Entregaste la evidencia del módulo"))
    fm.append("cycle:")
    for cid, tit, tool, ph, desc, chk in ciclo:
        fm += [f"  - id: {cid}", f"    title: {yaml_str(tit)}", f"    tool: {tool}", f"    phase: {ph}", f"    description: {yaml_str(desc)}", f"    check: {yaml_str(chk)}"]
    fm.append("---")
    k = s["caso"]
    cuerpo = [
        "", f"## {s['titulo']}", "", s["resumen"], "",
        f"**{mtit}** · clase {MODULOS[numero_modulo(mid) - 1][2].index(n) + 1} de {len(MODULOS[numero_modulo(mid) - 1][2])} · {minutos_clase(n)} minutos", "",
        "| Paso de la ruta | Minutos | Qué haces |", "|---|---|---|",
        f"| 1 · Caso inicial | {mins[0]} | {CASO_INICIAL[n]} |",
        f"| 2 · Foro de reflexión | {mins[1]} | Juego «{s['juego1']['titulo']}» y tu reflexión en el muro |",
        f"| 3 · Lección y demostración | {mins[2]} | {s['demo']['corto']} |",
        f"| 4 · Reto de aplicación | {mins[3]} | {k['corto']} en la Hoja JMD con tu empresa |",
        f"| 5 · Retroalimentación y cierre | {mins[4]} | Lista de comprobación, juego «{s['juego2']['titulo']}» y reflexión final |", "",
        "### El reto de aplicación (Hoja JMD)", "",
    ] + [f"{i + 1}. {t}" for i, t in enumerate(k["tareas"])] + [
        "",
        "La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español "
        "(SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo "
        "con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu "
        "trabajo como .xlsx, con tus fórmulas.", "",
        "### Pide ayuda a la IA (DeepSeek Harness)", "", "> " + k["prompt"], "",
        "La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.", "",
        f"### {mtit.split(' (')[0]} en el ciclo de Kolb", "",
        f"- **Experiencia concreta:** {k_mod['experiencia']}",
        f"- **Observación reflexiva:** {k_mod['reflexion']}",
        f"- **Conceptualización abstracta:** {k_mod['conceptos']}",
        f"- **Experimentación activa:** {k_mod['aplicacion']}",
        f"- **Evidencia de aprendizaje:** {k_mod['evidencia']}", "",
        f"**Proyecto integrador:** {k_mod['integrador'][0].upper() + k_mod['integrador'][1:]} Usas la misma empresa en los seis módulos, hasta el dashboard final.", "",
    ]
    if s.get("nota_legal"):
        cuerpo += [f"*{s['nota_legal']}*", ""]
    cuerpo += ["*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. "
               "Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.", ""]
    nombre = f"{lec}-{s['slug']}.md"
    for viejo in os.listdir(os.path.join(CURSO, "lessons")):
        if viejo.startswith(lec + "-") and viejo != nombre:
            os.remove(os.path.join(CURSO, "lessons", viejo))
    open(os.path.join(CURSO, "lessons", nombre), "w", encoding="utf-8").write("\n".join(fm + cuerpo))


CRITERIOS = [
    ("Exactitud de los cálculos · los resultados coinciden con la revisión de la Hoja JMD y con los supuestos del caso",
     ["Ausente (resultados sin calcular o con errores en la mayoría)", "Parcial (errores en una columna o en un total)", "Logrado (todo cuadra y la revisión sale en verde)"]),
    ("Organización y trazabilidad · datos ordenados en tablas, celdas de supuestos separadas y se puede seguir de dónde sale cada número",
     ["Ausente", "Parcial (hay números escritos a mano dentro de los cálculos)", "Logrado (cada resultado se rastrea hasta sus datos)"]),
    ("Uso pertinente de fórmulas y herramientas · la función adecuada para cada cálculo, referencias absolutas donde corresponde, validaciones y formatos",
     ["Ausente (valores escritos a mano)", "Parcial (funciona, pero con fórmulas repetidas o sin $)", "Logrado"]),
    ("Interpretación de los resultados · explica qué significan las cifras para la empresa",
     ["Ausente", "Parcial (describe sin interpretar)", "Logrado (interpreta con un dato del caso)"]),
    ("Justificación de las decisiones · explica los supuestos usados y las decisiones tomadas, y corrige con la retroalimentación",
     ["Ausente", "Parcial (decisiones sin sustento)", "Logrado (decisiones sustentadas y corrección aplicada)"]),
]


def escribir_tareas(ss):
    """Una tarea (evidencia de aprendizaje) por módulo, con la rúbrica de los criterios de evaluación del plan."""
    d = os.path.join(CURSO, "assignments")
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.startswith("ex-m") and f.endswith("-evidencia.md"):
            os.remove(os.path.join(d, f))
    for mid, titulo, nums in MODULOS:
        if not all(x in ss for x in nums):
            continue
        k = KOLB[mid]
        ult = max(nums)
        objs = [f"ex-{x:02d}-o1" for x in nums]
        fm = ["---", f"id: ex-{mid}-evidencia", f"title: {yaml_str('Evidencia · ' + titulo.split(' (')[0])}", f"lesson: ex-{ult:02d}", "max_score: 20", "autograde: false",
              f"objective_ids: [{', '.join(objs)}]", "rubric:"]
        for crit, niveles in CRITERIOS:
            fm += [f"  - criterion: {yaml_str(crit)}", "    levels:"]
            for niv, pts in zip(niveles, (0, 2, 4)):
                fm.append(f"      - {{title: {yaml_str(niv)}, points: {pts}}}")
        fm.append("---")
        clases = ", ".join(f"{x}. {ss[x]['titulo']}" for x in nums)
        cuerpo = ["", f"## {titulo.split(' (')[0]}", "", f"**Clases:** {clases}. **Duración:** 2 horas.", "", k["proposito"], "",
                  "### Qué entregas", "", f"**{k['evidencia']}**", "",
                  "1. El libro de Excel de **tu empresa** (la misma de todo el curso) con los retos de las clases del módulo resueltos con fórmulas. "
                  "Puedes descargarlo desde la Hoja JMD con **⬇ Excel** o trabajar el archivo del caso en tu computadora.",
                  "2. Una breve explicación (5 a 8 líneas) de tus decisiones: los supuestos que usaste, qué revisaste y qué corregiste.",
                  "3. Opcional: un escenario simulado con IA resuelto, con una línea sobre qué cambió en los resultados.", "",
                  "### La ruta del módulo", "",
                  f"1. **Caso inicial** (experiencia concreta): {k['experiencia']}",
                  f"2. **Foro de reflexión** (observación reflexiva): {k['reflexion']} Una intervención propia y un comentario fundamentado a un compañero.",
                  f"3. **Lección y demostración** (conceptualización abstracta): {k['conceptos']}",
                  f"4. **Reto de aplicación** (experimentación activa): {k['aplicacion']}",
                  "5. **Retroalimentación y cierre:** el instructor comenta aciertos y aspectos por mejorar; corriges y vuelves a entregar, y escribes una reflexión final "
                  "sobre lo aprendido, lo corregido y su aplicación laboral.", "",
                  f"**Proyecto integrador:** {k['integrador'][0].upper() + k['integrador'][1:]}", "",
                  "*Datos ficticios. Periodo, régimen y supuestos tributarios o laborales: los de la hoja «Instrucciones» de cada caso.*", ""]
        open(os.path.join(d, f"ex-{mid}-evidencia.md"), "w", encoding="utf-8").write("\n".join(fm + cuerpo))


def escribir_plan(ss):
    """materials/plan-modulos-kolb.md: el plan del curso para el alumno (módulos, ruta, proyecto integrador y criterios)."""
    md = ["# Plan de formación en Excel contable y financiero", "",
          "Seis módulos con el ciclo de Kolb · 12 horas · 20 clases. Cada módulo dura 2 horas y sigue cuatro etapas: experimentar, reflexionar, "
          "comprender los conceptos y aplicar lo aprendido en una situación nueva.", "",
          "## La ruta de cada módulo en la plataforma", "",
          "1. **Caso inicial.** La situación de la empresa, el archivo de datos y una consigna exploratoria. Haces un primer intento antes de la explicación.",
          "2. **Foro de reflexión.** Preguntas sobre lo observado, los errores encontrados y las decisiones tomadas: una intervención propia y un comentario fundamentado a un compañero.",
          "3. **Lección y demostración.** Explicación breve, demostración del procedimiento y práctica guiada, con la guía visual y las fórmulas clave.",
          "4. **Reto de aplicación.** Un caso diferente al demostrado, en la Hoja JMD o en tu Excel. Entregas tu archivo con fórmulas, resultados y una breve explicación de tus decisiones.",
          "5. **Retroalimentación y cierre.** Comentarios sobre aciertos y aspectos por mejorar, una corrección y una reflexión final sobre lo aprendido, lo corregido y su aplicación laboral.", ""]
    for mid, titulo, nums in MODULOS:
        k = KOLB[mid]
        md += [f"## {titulo.split(' (')[0]}", "", f"**Clases:** " + " · ".join(f"{x}. {ss[x]['titulo']}" for x in nums if x in ss) + " | **Duración:** 2 horas", "",
               k["proposito"], "",
               f"- **Experiencia concreta.** {k['experiencia']}", f"- **Observación reflexiva.** {k['reflexion']}",
               f"- **Conceptualización abstracta.** {k['conceptos']}", f"- **Experimentación activa.** {k['aplicacion']}",
               f"- **Evidencia de aprendizaje:** {k['evidencia']}", ""]
    md += ["## Proyecto integrador", "",
           "Usas una misma empresa ficticia (elige una de las 10 de «Las empresas ficticias del curso») a lo largo de los seis módulos. Construyes paso a paso sus "
           "registros, planillas, controles y reportes hasta presentar un dashboard final que explique la situación del negocio y sustente propuestas de mejora.", "",
           "## Criterios de evaluación", "",
           "Se valora la exactitud de los cálculos, la organización y trazabilidad de los datos, el uso pertinente de fórmulas y herramientas, la interpretación de los "
           "resultados y la justificación de las decisiones. La retroalimentación se relaciona con la evidencia de cada módulo (rúbrica de 20 puntos en «Tareas»).", "",
           "## Preparación de los casos", "",
           "Antes de cada actividad, el docente define el periodo, el régimen y los supuestos tributarios o laborales aplicables; en los archivos van en la hoja "
           "«Instrucciones». Los materiales usan datos ficticios y criterios explícitos para que los ejercicios se puedan resolver y verificar. Los escenarios que "
           "generas con IA siguen el mismo formato del caso y también son ficticios.", ""]
    open(os.path.join(CURSO, "materials", "plan-modulos-kolb.md"), "w", encoding="utf-8").write("\n".join(md))


def escribir_curso(hechas):
    lineas = [
        f"id: {CURSO_ID}",
        "title: Excel + IA para Contabilidad, Tributación y Tesorería",
        "description: >",
        "  Plan de formación en Excel contable y financiero: 6 módulos de 2 horas (12 horas, 20 clases) con el ciclo de Kolb.",
        "  Cada módulo sigue la misma ruta en la plataforma (caso inicial, foro de reflexión, lección y demostración, reto de",
        "  aplicación, retroalimentación y cierre) y termina en una evidencia con rúbrica. El reto se resuelve en la Hoja JMD, una",
        "  hoja de cálculo editable dentro del sistema que revisa tus fórmulas, exporta a Excel y genera escenarios nuevos con IA.",
        "  Proyecto integrador: la misma empresa ficticia en los seis módulos, de los registros al dashboard final.",
        "cohorts: [atelecom-1]",
        "proyecto_final: >",
        "  Proyecto integrador: el libro de Excel de tu empresa, construido módulo a módulo (registros y tributos, planilla y",
        "  beneficios, inventarios y activos, cuentas y conciliación, flujo y presupuesto, estados financieros y auditoría) hasta",
        "  un dashboard que explica la situación del negocio y sustenta propuestas de mejora.",
        "requisitos:",
        '  - "Excel 2021 o Microsoft 365 (BUSCARX necesita una de esas versiones; en otras se usa BUSCARV)"',
        '  - "Manejo básico de Excel: abrir un archivo, escribir en una celda y guardar"',
        '  - "Una cuenta en jmd-learn.online (inscripción del grupo atelecom-1)"',
        'dedicacion: "6 módulos de 2 horas · 12 horas · 20 clases · 80 % práctica"',
        "",
        "modules:",
    ]
    for mid, titulo, ses in MODULOS:
        ids = [f"ex-{n:02d}" for n in ses if n in hechas]
        if not ids:
            continue
        lineas += [f"  - id: {mid}", f"    title: {yaml_str(titulo)}", f"    lessons: [{', '.join(ids)}]"]
    open(os.path.join(CURSO, "course.yaml"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")


def main():
    ss = sesiones()
    escribir_plan(ss)
    total = [0, 0]
    for n in sorted(ss):
        a, b = construir_sesion(ss[n])
        total[0] += a
        total[1] += b
    escribir_tareas(ss)
    escribir_curso(set(ss))
    print(f"{len(ss)} sesiones construidas: {', '.join(f'ex-{n:02d}' for n in sorted(ss))}")
    print(f"Hoja JMD: {total[0]} libros, {total[1]} celdas con revisión (soluciones: {'sí' if os.path.isdir(hoja_jmd.SOLUCIONES) else 'no, se reutilizó la revisión anterior'})")


if __name__ == "__main__":
    main()
