# -*- coding: utf-8 -*-
"""Construye el intensivo «Excel + IA aplicado a Contabilidad, Tributación y Tesorería» (4 sesiones de 60 min).

Toma del curso de 20 sesiones (../excel-ia-contabilidad/_fuente/contenido_m*.py) los juegos y los pasos de
demostración, y une sus Excel de caso: cada sesión del intensivo cubre varios temas del PDF y su libro junta
las hojas de esos temas, una por empresa ficticia.

Escribe: course.yaml, lessons/ei-NN-*.md, live/ei-NN/{01-contexto,…,05-cierre}/escena.{yaml,html} y
materials/casos/ei-NN/ei-NN-<empresa>.xlsx.
Uso:  python3 _fuente/construir.py   (necesita openpyxl)
"""
import html
import importlib
import json
import os
import re
import shutil
import sys
from copy import copy, deepcopy

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

AQUI = os.path.dirname(os.path.abspath(__file__))
CURSO = os.path.dirname(AQUI)
FUENTE = os.path.join(os.path.dirname(CURSO), "excel-ia-contabilidad")
sys.path.insert(0, os.path.join(FUENTE, "_fuente"))
EMPRESAS = json.load(open(os.path.join(AQUI, "empresas.json"), encoding="utf-8"))
CURSO_ID = "excel-ia-intensivo"
COHORTE = "excel-intensivo-1"


def originales():
    out = {}
    for m in ("contenido_m1", "contenido_m2", "contenido_m3", "contenido_m4", "contenido_m5"):
        for s in importlib.import_module(m).SESIONES:
            out[s["n"]] = s
    return out


EX = originales()


def pasos(*pares):
    """pasos((1, [0, 2]), (2, [3])) → pasos de demo de las sesiones originales, en ese orden."""
    return [EX[n]["demo"]["pasos"][i] for n, idx in pares for i in idx]


SESIONES = [
    {
        "n": 1, "slug": "ventas-compras-igv", "titulo": "Ventas, compras e IGV", "temas": "temas 1, 2 y 3",
        "resumen": "Armas el registro de ventas y el de compras como tablas que calculan solas el IGV, y liquidas el IGV del mes: "
                   "débito fiscal, crédito fiscal e IGV a pagar o saldo a favor.",
        "objetivos": ["Calcular IGV y total en un registro de ventas hecho tabla, con la tasa en una celda",
                      "Sacar la base y el IGV de las compras y clasificarlas",
                      "Liquidar el IGV del mes: débito, crédito y saldo a favor con MAX"],
        "nota_legal": EX[3]["nota_legal"] + " " + EX[1]["nota_legal"],
        "contexto": {"corto": "La idea: tres números y una resta", "titulo": "Tu IGV del mes es __una resta__",
                     "idea": ["Cada comprobante trae **valor venta**, **IGV** y **total**.",
                              "El IGV de tus ventas es **débito**; el de tus compras, **crédito**.",
                              "**Débito − crédito** = IGV a pagar o saldo a favor."],
                     "hoy": ["Registro de ventas", "Registro de compras", "Liquidación del IGV"],
                     "diagrama": {"tipo": "flujo", "titulo": "Octubre de Comercial Andina", "nodos": [
                         {"ic": "🧾", "t": "IGV de ventas", "s": "débito S/ 306.54"},
                         {"ic": "🛒", "t": "IGV de compras", "s": "crédito S/ 241.20"},
                         {"ic": "🏛️", "t": "IGV a pagar", "s": "S/ 65.34", "dest": True}],
                         "ops": ["−", "="], "nota": "Si el crédito supera al débito no pagas: queda saldo a favor para el mes siguiente."}},
        "juego1": EX[1]["juego1"], "intro1": EX[1]["intro1"],
        "demo": {"corto": "Tabla e IGV de ventas, base de compras y liquidación con MAX",
                 "titulo": "Demostración: del comprobante a __la liquidación__",
                 "pasos": pasos((1, [0, 2, 3]), (2, [2, 3]), (3, [1, 3]))},
        "libro": [("ex-01", {}), ("ex-02", {}), ("ex-03", {"Ventas": "Ventas 3 meses", "Compras": "Compras 3 meses"})],
        "caso": {"corto": "Ventas, compras e IGV de octubre", "titulo": "Caso práctico: __el IGV de tu empresa__",
                 "tareas": ["Hoja **Ventas**: fórmula del IGV (solo gravadas, tasa en N2) y del Total.",
                            "Hoja **Compras**: elige la clasificación y saca la base (total ÷ 1.18) y el IGV.",
                            "Hoja **Liquidación**: débito, crédito y saldo a favor de agosto a octubre (usa MAX).",
                            "Pide a la IA que revise tus tres hojas."],
                 "prompt": "Te paso mis hojas de ventas, compras y la liquidación del IGV de agosto a octubre (datos ficticios). Revisa si el IGV de "
                           "cada venta está bien (18 % solo en gravadas), si el crédito fiscal toma solo compras gravadas y si el saldo a favor pasa "
                           "bien al mes siguiente. Explícame en palabras simples, con las fórmulas de Excel en español.",
                 "consejo": "la IA revisa; **tú** escribes las fórmulas. Si te propone algo, pruébalo en una fila y compara."},
        "cierre": {"titulo": "Cierre: ¿tu IGV __cuadra__?",
                   "checklist": ["Ventas y compras son **tablas**, con la tasa en una sola celda.", "El IGV es 0.00 en exoneradas.",
                                 "El crédito fiscal suma solo compras gravadas.", "La liquidación usa **MAX**: nunca un IGV a pagar negativo.",
                                 "Guardé el archivo con mi nombre."],
                   "siguiente": "Planilla, gratificación, CTS y Kardex."},
        "juego2": EX[1]["juego2"],
    },
    {
        "n": 2, "slug": "planilla-beneficios-kardex", "titulo": "Planilla, gratificación, CTS y Kardex", "temas": "temas 5, 6, 7 y 9",
        "resumen": "Calculas el neto de la planilla, la gratificación y la CTS con los meses computables, y valorizas el almacén con un "
                   "Kardex de costo promedio ponderado móvil.",
        "objetivos": ["Calcular el neto de la planilla con SI y BUSCARX",
                      "Calcular la gratificación y la CTS con los meses computables",
                      "Valorizar las salidas con el costo promedio ponderado móvil"],
        "nota_legal": EX[5]["nota_legal"],
        "contexto": {"corto": "La idea: lo que cuesta tu gente y lo que vale tu almacén", "titulo": "De bruto a neto, y el costo __promedio__",
                     "idea": ["Sueldo + asignación familiar − pensión (ONP o AFP) = **neto**.",
                              "Gratificación y CTS salen de la **remuneración computable** y los meses trabajados.",
                              "En el Kardex, cada salida se valoriza al **costo promedio** del momento."],
                     "hoy": ["Planilla", "Gratificación y CTS", "Kardex"],
                     "diagrama": {"tipo": "flujo", "titulo": "Vendedor de Comercial Andina, con hijos y en la ONP", "nodos": [
                         {"ic": "💼", "t": "Sueldo", "s": "S/ 1,800.00"},
                         {"ic": "👨‍👩‍👧", "t": "Asig. familiar", "s": "S/ 123.00"},
                         {"ic": "🏛️", "t": "ONP 13 %", "s": "S/ 249.99"},
                         {"ic": "💵", "t": "Neto", "s": "S/ 1,673.01", "dest": True}],
                         "ops": ["+", "−", "="], "nota": "Asignación familiar = 10 % de la RMV (S/ 1 230). La ONP se calcula sobre S/ 1,923.00."}},
        "juego1": EX[5]["juego1"], "intro1": EX[5]["intro1"],
        "demo": {"corto": "Neto con SI y BUSCARX, gratificación, CTS y costo promedio",
                 "titulo": "Demostración: planilla, beneficios y __Kardex__",
                 "pasos": pasos((5, [0, 2, 3]), (6, [2]), (7, [4]), (9, [2, 3]))},
        "libro": [("ex-05", {}), ("ex-06", {}), ("ex-07", {}), ("ex-09", {})],
        "caso": {"corto": "Planilla, beneficios y Kardex", "titulo": "Caso práctico: __tu gente y tu almacén__",
                 "tareas": ["Hoja **Planilla**: asignación familiar con SI, tasa de pensión con BUSCARX (hoja Tasas) y neto.",
                            "Hoja **Gratificación**: meses computables y gratificación con su bonificación.",
                            "Hoja **CTS**: remuneración computable, meses y días.",
                            "Hoja **Kardex**: costo promedio después de cada compra y valor de cada salida.",
                            "Pide a la IA que revise un trabajador y un movimiento del Kardex."],
                 "prompt": "Te paso la planilla, la gratificación, la CTS y el Kardex de mi empresa (datos ficticios). Elige un trabajador y comprueba "
                           "paso a paso su neto, su gratificación y su CTS; luego revisa si el costo promedio del Kardex cambia bien después de cada "
                           "compra. Explícame con fórmulas de Excel en español.",
                 "consejo": "comprueba a mano **un** trabajador y **un** movimiento: si esos cuadran, la fórmula sirve para todos."},
        "cierre": {"titulo": "Cierre: ¿tu planilla y tu Kardex __cuadran__?",
                   "checklist": ["Neto = total remuneración − pensión.", "La tasa de pensión viene de la hoja **Tasas** con BUSCARX.",
                                 "La CTS incluye **1/6 de la gratificación**.", "En el Kardex, las salidas van al **costo promedio**.",
                                 "Guardé el archivo con mi nombre."],
                   "siguiente": "Tesorería: cobranzas, conciliación y flujo de caja."},
        "juego2": EX[9]["juego2"],
    },
    {
        "n": 3, "slug": "tesoreria", "titulo": "Cobranzas, conciliación y flujo de caja", "temas": "temas 11, 13 y 14",
        "resumen": "Clasificas las cuentas por cobrar por antigüedad, concilias el libro de bancos con el extracto usando BUSCARX y "
                   "proyectas el flujo de caja para ver si alcanza el efectivo.",
        "objetivos": ["Clasificar las cuentas por cobrar por antigüedad de vencimiento",
                      "Conciliar libro y banco: duplicados, BUSCARX y saldos ajustados",
                      "Proyectar el flujo de caja y detectar los meses sin liquidez"],
        "nota_legal": "",
        "contexto": {"corto": "La idea: vendido no es cobrado", "titulo": "¿Cuánto __efectivo__ tendrás el próximo mes?",
                     "idea": ["Una venta al crédito es **cuenta por cobrar** hasta que la pagan.",
                              "El **libro de bancos** y el **extracto** deben contar lo mismo.",
                              "El **flujo de caja** junta cobros y pagos para ver si alcanza."],
                     "hoy": ["Cobranzas por antigüedad", "Conciliación con BUSCARX", "Flujo de caja"],
                     "diagrama": {"tipo": "flujo", "titulo": "De la factura al efectivo", "nodos": [
                         {"ic": "📄", "t": "Por cobrar", "s": "0–30, 31–60, +60 días"},
                         {"ic": "🏦", "t": "Banco", "s": "libro = extracto"},
                         {"ic": "📅", "t": "Flujo", "s": "ingresos − egresos"},
                         {"ic": "✅", "t": "Decisión", "s": "¿alcanza la caja?", "dest": True}],
                         "ops": ["→", "→", "→"], "nota": "Cobrar a tiempo y conciliar cada mes es lo que hace confiable el flujo."}},
        "juego1": EX[13]["juego1"], "intro1": EX[13]["intro1"],
        "demo": {"corto": "Antigüedad, duplicados, BUSCARX y saldo de caja",
                 "titulo": "Demostración: del vencimiento a __la caja__",
                 "pasos": pasos((11, [2, 3]), (13, [0, 1, 4]), (14, [1, 3]))},
        "libro": [("ex-11", {}), ("ex-13", {}), ("ex-14", {})],
        "caso": {"corto": "Cobranzas, conciliación y flujo", "titulo": "Caso práctico: __la tesorería de tu empresa__",
                 "tareas": ["Hoja **Cobranzas**: vencimiento, saldo, días vencidos y tramo de antigüedad.",
                            "Hoja **Conciliación**: marca duplicados y cruza libro y banco con BUSCARX.",
                            "Comprueba que los saldos ajustados del libro y del banco cuadran.",
                            "Hoja **Flujo**: saldo final de cada mes y alerta si falta caja.",
                            "Pide a la IA que explique cada diferencia de la conciliación."],
                 "prompt": "Te paso mis cobranzas, la conciliación bancaria y el flujo de caja (datos ficticios). Revisa el tramo de antigüedad de "
                           "cada factura, explica cada partida que no cuadra entre el libro de bancos y el extracto, y dime en qué mes del flujo "
                           "falta caja y cuánto. Usa fórmulas de Excel en español.",
                 "consejo": "antes de cruzar con BUSCARX, **marca los duplicados**: si no, un movimiento repetido parece cuadrar."},
        "cierre": {"titulo": "Cierre: ¿tu banco __cuadra__?",
                   "checklist": ["Cada factura tiene su **tramo de antigüedad**.", "Marqué los duplicados antes de cruzar.",
                                 "BUSCARX dice «No está» cuando falta el movimiento.", "Los saldos ajustados del libro y del banco cuadran.",
                                 "El flujo encadena el saldo final al mes siguiente."],
                   "siguiente": "Estados financieros, auditoría y dashboard."},
        "juego2": EX[13]["juego2"],
    },
    {
        "n": 4, "slug": "estados-auditoria-dashboard", "titulo": "Estado de resultados, auditoría y dashboard", "temas": "temas 16, 18, 19 y 20",
        "resumen": "Armas el estado de resultados con sus márgenes, auditas un registro antes de reportar y presentas un dashboard con "
                   "KPI, tabla dinámica y segmentadores.",
        "objetivos": ["Armar el estado de resultados y calcular sus márgenes",
                      "Auditar un registro: duplicados, correlativos que faltan e IGV",
                      "Presentar un dashboard con KPI, tabla dinámica y segmentadores"],
        "nota_legal": EX[16].get("nota_legal", ""),
        "contexto": {"corto": "La idea: un tablero que se entiende en 10 segundos", "titulo": "De los datos __al tablero__",
                     "idea": ["**Estado de resultados**: ventas − costo − gastos = utilidad.",
                              "Antes de reportar, **audita**: duplicados, correlativos e IGV.",
                              "El **dashboard** muestra en KPI y gráficos solo lo que sirve para decidir."],
                     "hoy": ["Estado de resultados", "Auditoría de datos", "Dashboard con KPI"],
                     "diagrama": {"tipo": "flujo", "titulo": "Del registro a la decisión", "nodos": [
                         {"ic": "📚", "t": "Registros", "s": "ventas y gastos"},
                         {"ic": "🔍", "t": "Auditoría", "s": "datos limpios"},
                         {"ic": "📊", "t": "Resultados", "s": "utilidad y márgenes"},
                         {"ic": "📈", "t": "Dashboard", "s": "4 KPI · 2 gráficos", "dest": True}],
                         "ops": ["→", "→", "→"], "nota": "Si los datos tienen duplicados, el tablero más bonito da la cifra equivocada."}},
        "juego1": EX[16]["juego1"], "intro1": EX[16]["intro1"],
        "demo": {"corto": "Márgenes, análisis vertical, auditoría y KPI",
                 "titulo": "Demostración: resultados, auditoría y __tablero__",
                 "pasos": pasos((16, [1, 3]), (18, [1]), (19, [0, 3]), (20, [1, 3]))},
        "libro": [("ex-16", {}), ("ex-19", {}), ("ex-20", {})],
        "caso": {"corto": "Resultados, auditoría y tablero", "titulo": "Caso práctico: __el tablero de tu empresa__",
                 "tareas": ["Hoja **EERR**: trae los rubros desde Saldos y calcula utilidades y márgenes.",
                            "Hoja **Ventas**: audita duplicados, IGV esperado y correlativos que faltan.",
                            "Hoja **Resumen**: KPI, tabla dinámica y segmentadores sobre la hoja Datos.",
                            "Arma tu tablero: 4 KPI, 2 gráficos y 1 segmentador.",
                            "Pide a la IA que audite tu registro antes de presentar."],
                 "prompt": "Te paso mi estado de resultados, mi registro de ventas y el resumen para el dashboard (datos ficticios). Audita el "
                           "registro: duplicados, correlativos que faltan e IGV distinto de 18 % en gravadas. Luego dime qué 4 KPI y qué 2 gráficos "
                           "pondrías para la gerencia y por qué. Fórmulas de Excel en español.",
                 "consejo": "cada hallazgo de la IA se **confirma con una fórmula** antes de corregir el dato."},
        "cierre": {"titulo": "Cierre: ¿tu tablero se entiende __en 10 segundos__?",
                   "checklist": ["El estado de resultados cuadra con los saldos.", "Revisé duplicados, correlativos e IGV antes de reportar.",
                                 "Mi tablero tiene 4 KPI, 2 gráficos y 1 segmentador.", "Puedo explicar mi tablero en 1 minuto.",
                                 "Entregué el libro final con mi nombre."],
                   "siguiente": "Fin del intensivo: certificado e insignia."},
        "juego2": EX[20]["juego2"],
    },
]


def yaml_str(s):
    return json.dumps(s, ensure_ascii=False)


PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo_html}</title>
<!--
  Escena del modo LIVE · Excel + IA, intensivo de 4 sesiones (sesión {leccion}, {tipo}). Generada por _fuente/construir.py:
  edita los datos ahí y vuelve a construir. Sin recursos externos; el motor está en live/_comun (copia del de
  excel-ia-contabilidad: ex.js dibuja la escena, juegos.js los minijuegos, dsh.js el botón de DeepSeek Harness).
  El movimiento se apaga con prefers-reduced-motion (ver escena.css y ex.css).
-->
<link rel="stylesheet" href="../../comun/escena.css">
<link rel="stylesheet" href="../../comun/ex.css">
<style>@media (prefers-reduced-motion: reduce) {{ .a-in {{ animation: none !important; }} }}</style>
</head>
<body>
<div id="esc"></div>
{extra}<script type="application/json" id="ex-datos">{datos}</script>
<script src="../../comun/ex.js"></script>
{scripts}</body>
</html>
"""


def escribir_escena(leccion, carpeta, yml, datos, extra="", juegos=False, dsh=False):
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
    scripts = ""
    if juegos:
        scripts += '<script src="../../comun/juegos.js"></script>\n'
    if dsh:
        scripts += '<script src="../../comun/dsh.js"></script>\n'
    js = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
    titulo_html = html.escape("Escena · " + yml["titulo"])
    open(os.path.join(d, "escena.html"), "w", encoding="utf-8").write(
        PLANTILLA.format(titulo_html=titulo_html, leccion=leccion, tipo=datos["tipo"], datos=js, scripts=scripts, extra=extra))


# ---------- libros de Excel del caso: une las hojas de las sesiones originales ----------

def _renombrar_en_formula(v, cambios):
    if not isinstance(v, str) or not v.startswith("=") or not cambios:
        return v
    for viejo, nuevo in cambios.items():
        v = re.sub(r"(?<![\w'])'?" + re.escape(viejo) + r"'?!", "'" + nuevo.replace("\\", "\\\\") + "'!", v)
    return v


def _copiar_hoja(origen, destino, nombre, cambios, tablas_usadas):
    ws = destino.create_sheet(nombre)
    for fila in origen.iter_rows():
        for c in fila:
            if c.__class__.__name__ == "MergedCell":
                continue
            n = ws.cell(row=c.row, column=c.column, value=_renombrar_en_formula(c.value, cambios))
            if c.has_style:
                n.font, n.fill, n.border = copy(c.font), copy(c.fill), copy(c.border)
                n.alignment, n.protection, n.number_format = copy(c.alignment), copy(c.protection), c.number_format
    for k, dim in origen.column_dimensions.items():
        ws.column_dimensions[k].width = dim.width
        ws.column_dimensions[k].hidden = dim.hidden
    for k, dim in origen.row_dimensions.items():
        ws.row_dimensions[k].height = dim.height
    for r in origen.merged_cells.ranges:
        ws.merge_cells(str(r))
    for dv in origen.data_validations.dataValidation:
        ws.add_data_validation(deepcopy(dv))
    for rango in origen.conditional_formatting:
        for regla in rango.rules:
            ws.conditional_formatting.add(str(rango.sqref), deepcopy(regla))
    for t in origen.tables.values():
        if t.displayName in tablas_usadas:
            raise ValueError(f"tabla repetida al unir libros: {t.displayName}")
        tablas_usadas.add(t.displayName)
        ws.add_table(deepcopy(t))
    ws.freeze_panes = origen.freeze_panes
    ws.sheet_view.showGridLines = origen.sheet_view.showGridLines
    if origen.sheet_properties.tabColor is not None:
        ws.sheet_properties.tabColor = copy(origen.sheet_properties.tabColor)


def _instrucciones(wb, s, e):
    ws = wb.create_sheet("Instrucciones", 0)
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 110
    ws.sheet_view.showGridLines = False
    k = s["caso"]
    filas = [
        (f"Intensivo Excel + IA · Sesión {s['n']} de 4 · {s['titulo']}", Font(bold=True, size=14)),
        (f"{e['razon']} · RUC {e['ruc']} (ficticio) · {e['regimen']} · {e['rubro']}", Font(size=11, color="555555")),
        None,
        ("Qué vas a hacer (en orden):", Font(bold=True)),
    ] + [(f"{i + 1}. {t.replace('**', '')}", None) for i, t in enumerate(k["tareas"])] + [
        None,
        ("Las celdas amarillas son las que completas tú. Las demás ya traen datos.", Font(italic=True)),
        None,
    ]
    if s.get("nota_legal"):
        filas += [(s["nota_legal"], Font(size=10, color="555555")), None]
    filas += [("Pide ayuda a DeepSeek Harness (copia y pega):", Font(bold=True)), (k["prompt"], None), None,
              ("Datos 100 % ficticios para capacitación. El RUC empieza con 99: no existe en SUNAT.", Font(size=10, color="555555"))]
    for i, f in enumerate(filas, start=2):
        if f is None:
            continue
        c = ws.cell(row=i, column=2, value=f[0])
        c.alignment = Alignment(wrap_text=True, vertical="top")
        if f[1] is not None:
            c.font = f[1]
    ws["B2"].fill = PatternFill("solid", fgColor="E7F3EC")


def construir_libros(s, lec):
    carpeta = os.path.join(CURSO, "materials", "casos", lec)
    if os.path.isdir(carpeta):
        shutil.rmtree(carpeta)
    os.makedirs(carpeta)
    for e in EMPRESAS:
        wb = openpyxl.Workbook()
        wb.remove(wb.active)
        _instrucciones(wb, s, e)
        tablas = set()
        for ex, cambios in s["libro"]:
            src = openpyxl.load_workbook(os.path.join(FUENTE, "materials", "casos", ex, f"{ex}-{e['id']}-{e['slug']}.xlsx"))
            for ws in src.worksheets:
                if ws.title == "Instrucciones":
                    continue
                nombre = cambios.get(ws.title, ws.title)
                if nombre in wb.sheetnames:
                    raise ValueError(f"{lec}: hoja repetida «{nombre}» al unir {ex}")
                _copiar_hoja(ws, wb, nombre, cambios, tablas)
        wb.active = 1
        wb.save(os.path.join(carpeta, f"{lec}-{e['id']}-{e['slug']}.xlsx"))


# ---------- escenas y lecciones ----------

def construir_sesion(s):
    n = s["n"]
    lec = f"ei-{n:02d}"
    base = {"leccion": lec, "sesion": n, "tema": s["titulo"], "modulo": f"Sesión {n} de 4"}
    destino = os.path.join(CURSO, "live", lec)
    if os.path.isdir(destino):
        shutil.rmtree(destino)
    c = s["contexto"]
    escribir_escena(lec, "01-contexto", {"titulo": c["corto"], "fase": "experiencia", "paso": "contexto", "duracion_min": 7, "lo_logre": False,
                                         "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "ninguna"},
                    dict(base, escena="01-contexto", tipo="contexto", fase="ec", bloque=0, titulo=c["titulo"], idea=c["idea"], hoy=c.get("hoy"), diagrama=c["diagrama"]))
    j1 = dict(s["juego1"], id=f"{lec}-j1")
    escribir_escena(lec, "02-juego", {"titulo": "Juego · " + j1["titulo"], "fase": "reflexion", "paso": "juego", "duracion_min": 3, "lo_logre": True,
                                      "evidencia": "automatica", "umbral_pct": 70, "compuerta": "evidencia"},
                    dict(base, escena="02-juego", tipo="juego", fase="or", bloque=0, titulo="Juego de calentamiento: __" + j1["titulo"] + "__",
                         intro=s.get("intro1"), juego=j1), juegos=True)
    d = s["demo"]
    escribir_escena(lec, "03-demo", {"titulo": d["corto"], "fase": "conceptualizacion", "paso": "demo", "duracion_min": 15, "lo_logre": False,
                                     "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "ninguna"},
                    dict(base, escena="03-demo", tipo="demo", fase="ca", bloque=1, titulo=d["titulo"], pasos=d["pasos"]))
    k = s["caso"]
    emp = [{x: e[x] for x in ("id", "slug", "corto", "razon", "ruc", "regimen", "rubro", "icono", "trab")} for e in EMPRESAS]
    marcador = f'<div data-jmd-dsh data-prompt="{html.escape(k["prompt"], quote=True)}"></div>\n'
    escribir_escena(lec, "04-caso", {"titulo": "Caso práctico · " + k["corto"], "fase": "experimentacion", "paso": "caso", "duracion_min": 30, "lo_logre": True,
                                     "evidencia": "ninguna", "umbral_pct": 80, "compuerta": "lo_logre", "dsh": True},
                    dict(base, escena="04-caso", tipo="caso", fase="ea", bloque=2, titulo=k["titulo"], tareas=k["tareas"], consejo=k.get("consejo"),
                         empresas=emp, curso=CURSO_ID), extra=marcador, dsh=True)
    z = s["cierre"]
    j2 = dict(s["juego2"], id=f"{lec}-j2")
    escribir_escena(lec, "05-cierre", {"titulo": "Cierre y juego · " + j2["titulo"], "fase": "reflexion", "paso": "cierre", "duracion_min": 5, "lo_logre": True,
                                       "evidencia": "automatica", "umbral_pct": 70, "compuerta": "evidencia"},
                    dict(base, escena="05-cierre", tipo="cierre", fase="or", bloque=3, titulo=z["titulo"], checklist=z["checklist"], siguiente=z.get("siguiente"), juego=j2),
                    juegos=True)
    construir_libros(s, lec)
    escribir_leccion(s, lec)


def escribir_leccion(s, lec):
    n = s["n"]
    obj = [{"id": f"{lec}-o{i + 1}", "title": t} for i, t in enumerate(s["objetivos"])]
    todos = [o["id"] for o in obj]
    mats = [{"id": f"{lec}-empresas", "title": "Las 10 empresas ficticias del curso (fichas)", "kind": "doc", "file": "materials/empresas-ficticias.md",
             "objective_ids": [obj[0]["id"]]}]
    for e in EMPRESAS:
        mats.append({"id": f"{lec}-{e['id'].lower()}", "title": f"Caso práctico · {e['id']} {e['corto']} (Excel)", "kind": "file",
                     "file": f"materials/casos/{lec}/{lec}-{e['id']}-{e['slug']}.xlsx", "objective_ids": todos})
    fm = ["---", f"id: {lec}", f"title: {yaml_str(f'Sesión {n} · ' + s['titulo'])}", "published: true", "objectives:"]
    for o in obj:
        fm += [f"  - id: {o['id']}", f"    title: {yaml_str(o['title'])}"]
    fm += ["recording:", '  url: ""', '  passcode: ""', "materials:"]
    for m in mats:
        fm += [f"  - id: {m['id']}", f"    title: {yaml_str(m['title'])}", f"    kind: {m['kind']}", f"    file: {m['file']}",
               f"    objective_ids: [{', '.join(m['objective_ids'])}]"]
    ciclo = [
        ("contexto", "La idea del día", "experiencia", "Escena 1: la idea en tres frases y un diagrama.", "Puedes decir con tus palabras qué vas a construir"),
        ("juego", "Juego de calentamiento", "reflexion", "Escena 2: " + s["juego1"]["titulo"] + ".", "Terminaste el juego"),
        ("demo", "Demostración guiada", "conceptualizacion", "Escena 3: el instructor hace el ejercicio paso a paso; tú miras y preguntas.", "Viste todos los pasos de la demo"),
        ("caso", "Caso práctico con tu empresa", "experimentacion", "Escena 4: descarga el Excel de tu empresa, resuélvelo y revisa con DeepSeek Harness.",
         "Tu Excel tiene las celdas amarillas completas y los totales cuadran"),
        ("cierre", "Cierre y repaso", "reflexion", "Escena 5: lista de comprobación y juego de repaso: " + s["juego2"]["titulo"] + ".", "Marcaste la lista y terminaste el juego"),
    ]
    fm.append("cycle:")
    for cid, tit, ph, desc, chk in ciclo:
        fm += [f"  - id: {cid}", f"    title: {yaml_str(tit)}", "    tool: lms", f"    phase: {ph}", f"    description: {yaml_str(desc)}", f"    check: {yaml_str(chk)}"]
    fm.append("---")
    k = s["caso"]
    cuerpo = [
        "", f"## {s['titulo']}", "", s["resumen"], "",
        f"Cubre los {s['temas']} del temario de 20 sesiones.", "",
        "| Momento | Minutos | Qué haces |", "|---|---|---|",
        f"| Introducción | 10 | La idea del día y el juego «{s['juego1']['titulo']}» |",
        f"| Demostración guiada | 15 | {s['demo']['corto']} |",
        f"| Caso práctico | 30 | {k['corto']} con el Excel de tu empresa |",
        f"| Cierre | 5 | Lista de comprobación y juego «{s['juego2']['titulo']}» |", "",
        "### El caso práctico", "",
    ] + [f"{i + 1}. {t}" for i, t in enumerate(k["tareas"])] + [
        "", "### Pide ayuda a la IA (DeepSeek Harness)", "", "> " + k["prompt"], "",
        "La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.", "",
    ]
    if s.get("nota_legal"):
        cuerpo += [f"*{s['nota_legal']}*", ""]
    cuerpo += ["Elige tu empresa una sola vez (fichas en «Materiales») y úsala en las 4 sesiones.", ""]
    nombre = f"{lec}-{s['slug']}.md"
    os.makedirs(os.path.join(CURSO, "lessons"), exist_ok=True)
    for viejo in os.listdir(os.path.join(CURSO, "lessons")):
        if viejo.startswith(lec + "-") and viejo != nombre:
            os.remove(os.path.join(CURSO, "lessons", viejo))
    open(os.path.join(CURSO, "lessons", nombre), "w", encoding="utf-8").write("\n".join(fm + cuerpo))


def escribir_curso():
    lineas = [
        f"id: {CURSO_ID}",
        "title: Excel + IA para Contabilidad, Tributación y Tesorería · Intensivo",
        "description: >",
        "  Intensivo de 4 sesiones prácticas de 60 minutos (10 de introducción, 15 de demostración, 30 de caso práctico",
        "  y 5 de cierre) que condensa el temario de 20 sesiones: registros e IGV; planilla, gratificación, CTS y Kardex;",
        "  cobranzas, conciliación bancaria y flujo de caja; estado de resultados, auditoría y dashboard. Cada participante",
        "  elige una de 10 empresas peruanas ficticias y la usa en las 4 sesiones. La IA (DeepSeek Harness) es el ayudante:",
        "  revisa, explica fórmulas y sugiere el tablero.",
        f"cohorts: [{COHORTE}]",
        "proyecto_final: >",
        "  Un libro de Excel de tu empresa con los 4 casos resueltos: liquidación del IGV, planilla y beneficios, Kardex,",
        "  conciliación y flujo de caja, estado de resultados auditado y un dashboard con KPI y segmentadores.",
        "requisitos:",
        '  - "Excel 2021 o Microsoft 365 (BUSCARX necesita una de esas versiones; en otras se usa BUSCARV)"',
        '  - "Manejo básico de Excel: abrir un archivo, escribir en una celda y guardar"',
        "  - Una cuenta en jmd-learn.online",
        'dedicacion: "4 sesiones en vivo de 60 minutos · 4 horas · 80 % práctica"',
        "",
        "modules:",
    ]
    for s in SESIONES:
        lineas += [f"  - id: s{s['n']}", f"    title: {yaml_str('Sesión ' + str(s['n']) + ' · ' + s['titulo'])}", f"    lessons: [ei-{s['n']:02d}]"]
    open(os.path.join(CURSO, "course.yaml"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")


def main():
    for s in SESIONES:
        construir_sesion(s)
    escribir_curso()
    print(f"{len(SESIONES)} sesiones construidas: {', '.join(f'ei-{s[chr(110)]:02d}' for s in SESIONES)}")


if __name__ == "__main__":
    main()
