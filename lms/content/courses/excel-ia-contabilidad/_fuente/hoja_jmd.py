# -*- coding: utf-8 -*-
"""Hoja JMD: convierte los Excel de los casos (materials/casos/ex-NN/*.xlsx) en los datos que la hoja editable del
reto (live/ex-NN/04-caso) carga en el navegador, y arma el esquema del «Simula tu escenario con IA».

Solo biblioteca estándar (zipfile + xml): construir.py corre con cualquier python3.

Qué escribe, por sesión:
  live/ex-NN/04-caso/hoja-E01.json … hoja-E10.json   el libro de cada empresa: hojas, celdas, estilos y la revisión
  live/ex-NN/04-caso/escenario.json                  el esquema del escenario (lo lee la escena y el LMS)

La revisión (botón «Revisar») necesita la fórmula de referencia de cada celda amarilla. Sale de las soluciones del
instructor, que NO están en el repo (EX_SOLUCIONES o ~/Documents/jmd-instructor/excel-ia-atelecom/soluciones), y se
guarda traducida al español y en base64 dentro de hoja-EXX.json. Si la carpeta no está, se reutiliza la revisión que ya
traían los hoja-EXX.json generados antes (por eso construir.py la lee antes de borrar live/ex-NN).
"""
import base64
import datetime as dt
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "pr": "http://schemas.openxmlformats.org/package/2006/relationships"}
AMARILLO = "FFF4C2"
SOLUCIONES = os.environ.get("EX_SOLUCIONES") or os.path.expanduser("~/Documents/jmd-instructor/excel-ia-atelecom/soluciones")

# Formatos de número integrados de Excel que usan los casos.
FMT_INTEGRADOS = {0: "", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 14: "dd/mm/yyyy", 22: "dd/mm/yyyy hh:mm"}

# Excel guarda las fórmulas en inglés; el alumno las ve en español (Excel en español de Perú: coma como separador).
EN_ES = {
    "SUM": "SUMA", "SUMIF": "SUMAR.SI", "SUMIFS": "SUMAR.SI.CONJUNTO", "COUNT": "CONTAR", "COUNTA": "CONTARA", "COUNTBLANK": "CONTAR.BLANCO",
    "COUNTIF": "CONTAR.SI", "COUNTIFS": "CONTAR.SI.CONJUNTO", "IF": "SI", "IFS": "SI.CONJUNTO", "AND": "Y", "OR": "O", "NOT": "NO",
    "IFERROR": "SI.ERROR", "ROUND": "REDONDEAR", "ROUNDUP": "REDONDEAR.MAS", "ROUNDDOWN": "REDONDEAR.MENOS", "INT": "ENTERO", "ABS": "ABS",
    "XLOOKUP": "BUSCARX", "VLOOKUP": "BUSCARV", "MATCH": "COINCIDIR", "INDEX": "INDICE", "AVERAGE": "PROMEDIO", "AVERAGEIF": "PROMEDIO.SI",
    "MAX": "MAX", "MIN": "MIN", "DATE": "FECHA", "DAYS": "DIAS", "YEAR": "AÑO", "MONTH": "MES", "DAY": "DIA", "EOMONTH": "FIN.MES",
    "EDATE": "FECHA.MES", "DATEDIF": "SIFECHA", "TODAY": "HOY", "LEN": "LARGO", "CONCATENATE": "CONCATENAR", "CONCAT": "CONCAT",
    "LEFT": "IZQUIERDA", "RIGHT": "DERECHA", "MID": "EXTRAE", "UPPER": "MAYUSC", "LOWER": "MINUSC", "TRIM": "ESPACIOS", "MOD": "RESIDUO",
    "SUMPRODUCT": "SUMAPRODUCTO", "ISBLANK": "ESBLANCO", "ISNUMBER": "ESNUMERO", "ISERROR": "ESERROR", "MAXIFS": "MAX.SI.CONJUNTO",
    "MINIFS": "MIN.SI.CONJUNTO", "AVERAGEIFS": "PROMEDIO.SI.CONJUNTO", "POWER": "POTENCIA", "VALUE": "VALOR", "TEXT": "TEXTO",
}
TOK = re.compile(r'"(?:[^"]|"")*"|\'(?:[^\']|\'\')*\'|[A-Za-z_][A-Za-z0-9_.]*\(?|.', re.S)


def formula_es(f):
    """=IF(G5="Gravada",ROUND(H5*$N$2,2),0) → =SI(G5="Gravada",REDONDEAR(H5*$N$2,2),0)."""
    out = []
    for t in TOK.findall(f):
        if t[0] in "\"'":
            out.append(t)
        elif t.endswith("("):
            nombre = t[:-1].upper()
            for pre in ("_XLFN._XLWS.", "_XLFN."):
                if nombre.startswith(pre):
                    nombre = nombre[len(pre):]
            out.append(EN_ES.get(nombre, nombre) + "(")
        elif t.upper() in ("TRUE", "FALSE"):
            out.append("VERDADERO" if t.upper() == "TRUE" else "FALSO")
        else:
            out.append(t)
    return "".join(out)


def col_num(letras):
    n = 0
    for ch in letras:
        n = n * 26 + ord(ch) - 64
    return n


def col_letras(n):
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def partir(ref):
    m = re.match(r"\$?([A-Z]+)\$?(\d+)$", ref)
    return col_num(m.group(1)), int(m.group(2))


def rango(ref):
    a, _, b = ref.partition(":")
    (c1, f1), (c2, f2) = partir(a), partir(b or a)
    return c1, f1, c2, f2


# ------------------------------------------------------------------------------------------------ lector de .xlsx
def _texto(el):
    """Texto de <is> o <si> (con o sin rich text)."""
    if el is None:
        return ""
    return "".join(t.text or "" for t in el.iter("{%s}t" % NS["m"]))


def _ruta_rel(desde, target):
    """Destino de una relación: absoluto («/xl/…») o relativo a la carpeta de la parte que la declara."""
    if target.startswith("/"):
        return target[1:]
    return os.path.normpath(os.path.join(os.path.dirname(desde), target)).replace("\\", "/")


def leer_xlsx(ruta):
    z = zipfile.ZipFile(ruta)
    nombres = set(z.namelist())
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    destino = {r.get("Id"): r.get("Target") for r in rels.findall("pr:Relationship", NS)}
    compartidas = []
    if "xl/sharedStrings.xml" in nombres:
        compartidas = [_texto(si) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]
    est = ET.fromstring(z.read("xl/styles.xml"))
    fmts = dict(FMT_INTEGRADOS)
    for nf in est.findall("m:numFmts/m:numFmt", NS):
        fmts[int(nf.get("numFmtId"))] = nf.get("formatCode")
    fuentes = []
    for f in est.findall("m:fonts/m:font", NS):
        d = {}
        if f.find("m:b", NS) is not None and f.find("m:b", NS).get("val", "1") != "0":
            d["b"] = 1
        if f.find("m:i", NS) is not None and f.find("m:i", NS).get("val", "1") != "0":
            d["i"] = 1
        c = f.find("m:color", NS)
        if c is not None and c.get("rgb"):
            d["c"] = c.get("rgb")[-6:]
        sz = f.find("m:sz", NS)
        if sz is not None and float(sz.get("val")) != 11:
            d["sz"] = float(sz.get("val"))
        fuentes.append(d)
    rellenos = []
    for f in est.findall("m:fills/m:fill", NS):
        p = f.find("m:patternFill", NS)
        fg = p.find("m:fgColor", NS) if p is not None else None
        rellenos.append(fg.get("rgb")[-6:] if (p is not None and p.get("patternType") == "solid" and fg is not None and fg.get("rgb")) else None)
    bordes = []
    for b in est.findall("m:borders/m:border", NS):
        bordes.append(1 if any(x.get("style") for x in b) else 0)
    xfs = []
    for x in est.findall("m:cellXfs/m:xf", NS):
        d = dict(fuentes[int(x.get("fontId", 0))])
        bg = rellenos[int(x.get("fillId", 0))]
        if bg:
            d["bg"] = bg
        fmt = fmts.get(int(x.get("numFmtId", 0)), "")
        if fmt:
            d["f"] = fmt
        if bordes[int(x.get("borderId", 0))]:
            d["bd"] = 1
        al = x.find("m:alignment", NS)
        if al is not None:
            if al.get("horizontal"):
                d["h"] = al.get("horizontal")
            if al.get("wrapText") == "1":
                d["wr"] = 1
        xfs.append(d)
    hojas = []
    for sh in wb.findall("m:sheets/m:sheet", NS):
        ruta_hoja = _ruta_rel("xl/workbook.xml", destino[sh.get("{%s}id" % NS["r"])])
        ws = ET.fromstring(z.read(ruta_hoja))
        celdas = {}
        for c in ws.iter("{%s}c" % NS["m"]):
            ref, t, s = c.get("r"), c.get("t"), int(c.get("s", 0))
            fe, ve = c.find("m:f", NS), c.find("m:v", NS)
            if t == "inlineStr":
                v = _texto(c.find("m:is", NS))
            elif t == "s":
                v = compartidas[int(ve.text)]
            elif t == "b":
                v = ve is not None and ve.text == "1"
            elif t in ("str", "e"):
                v = ve.text if ve is not None else ""
            else:
                v = None
                if ve is not None and ve.text not in (None, ""):
                    v = float(ve.text)
                    if v.is_integer() and "." not in ve.text and "E" not in ve.text.upper():
                        v = int(v)
            celdas[ref] = {"v": v, "f": ("=" + fe.text) if (fe is not None and fe.text) else None, "s": s}
        anchos = {}
        for col in ws.findall("m:cols/m:col", NS):
            for k in range(int(col.get("min")), int(col.get("max")) + 1):
                anchos[col_letras(k)] = float(col.get("width"))
        congelar = None
        pane = ws.find("m:sheetViews/m:sheetView/m:pane", NS)
        if pane is not None and pane.get("state") == "frozen":
            congelar = [int(float(pane.get("xSplit", 0))), int(float(pane.get("ySplit", 0)))]
        tablas = []
        rels_hoja = os.path.dirname(ruta_hoja) + "/_rels/" + os.path.basename(ruta_hoja) + ".rels"
        if rels_hoja in nombres:
            rh = ET.fromstring(z.read(rels_hoja))
            for r in rh.findall("pr:Relationship", NS):
                if r.get("Type", "").endswith("/table"):
                    tr = _ruta_rel(ruta_hoja, r.get("Target"))
                    tx = ET.fromstring(z.read(tr))
                    tablas.append({"n": tx.get("displayName") or tx.get("name"), "ref": tx.get("ref"),
                                   "cols": [tc.get("name") for tc in tx.findall("m:tableColumns/m:tableColumn", NS)]})
        hojas.append({"n": sh.get("name"), "celdas": celdas, "anchos": anchos, "congelar": congelar, "tablas": tablas})
    return {"hojas": hojas, "estilos": xfs}


# ------------------------------------------------------------------------------------------------ fechas
BASE_EXCEL = dt.date(1899, 12, 30)


def es_fecha(fmt):
    return bool(fmt) and bool(re.search(r"(^|[^\\])[dmy]", fmt.replace('"', ""))) and "0" not in fmt.replace("0%", "")


def serial_a_iso(n):
    return (BASE_EXCEL + dt.timedelta(days=int(n))).isoformat()


# ------------------------------------------------------------------------------------------------ libro para la hoja
def libro_jmd(ruta_enunciado, ruta_solucion=None, revision_previa=None):
    """El libro compacto de una empresa: estilos usados, hojas con sus celdas y la revisión de las celdas amarillas."""
    lx = leer_xlsx(ruta_enunciado)
    usados, estilos = {}, []

    def estilo(i):
        d = lx["estilos"][i] if i < len(lx["estilos"]) else {}
        k = json.dumps(d, sort_keys=True)
        if k not in usados:
            usados[k] = len(estilos)
            estilos.append(d)
        return usados[k]

    sol = leer_xlsx(ruta_solucion) if ruta_solucion and os.path.exists(ruta_solucion) else None
    sol_hojas = {h["n"]: h for h in sol["hojas"]} if sol else {}
    hojas, revisar = [], []
    for h in lx["hojas"]:
        celdas = []
        orden = sorted(h["celdas"].items(), key=lambda kv: (partir(kv[0])[1], partir(kv[0])[0]))
        for ref, c in orden:
            d = lx["estilos"][c["s"]] if c["s"] < len(lx["estilos"]) else {}
            v = c["f"] if c["f"] else c["v"]
            if c["f"]:
                v = formula_es(c["f"])
            fila = [ref, v, estilo(c["s"])]
            if v is None and not d.get("bg") and not d.get("bd"):
                continue
            celdas.append(fila)
            if d.get("bg") == AMARILLO and h["n"] != "Instrucciones":
                ref_sol = None
                if sol_hojas.get(h["n"]):
                    cs = sol_hojas[h["n"]]["celdas"].get(ref)
                    if cs is not None:
                        ref_sol = formula_es(cs["f"]) if cs["f"] else cs["v"]
                elif revision_previa is not None:
                    ref_sol = revision_previa.get((h["n"], ref))
                if ref_sol not in (None, ""):
                    revisar.append([h["n"], ref, ref_sol])
        dim = [0, 0]
        for ref in h["celdas"]:
            c_, f_ = partir(ref)
            dim = [max(dim[0], c_), max(dim[1], f_)]
        hojas.append({"n": h["n"], "dim": dim, "w": h["anchos"], "fz": h["congelar"], "c": celdas, "t": h["tablas"]})
    # La revisión viaja en base64: no se lee de un vistazo en la escena (no es secreto: lo mismo enseña la demo).
    rev = [[a, b, base64.b64encode(json.dumps(c, ensure_ascii=False).encode()).decode()] for a, b, c in revisar]
    activa = next((i for i, h in enumerate(hojas) if h["n"] != "Instrucciones" and any(
        x[0] == h["n"] for x in revisar)), 1 if len(hojas) > 1 else 0)
    return {"v": 1, "estilos": estilos, "hojas": hojas, "activa": activa, "revisar": rev}


def revision_de(ruta_json):
    """La revisión de un hoja-EXX.json ya generado: {(hoja, celda): referencia}."""
    try:
        d = json.load(open(ruta_json, encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return {(a, b): json.loads(base64.b64decode(c).decode()) for a, b, c in d.get("revisar", [])}


# ------------------------------------------------------------------------------------------------ esquema del escenario
def _tipo_columna(valores, fmt):
    vals = [v for v in valores if v not in (None, "")]
    if not vals:
        return {"tipo": "texto"}
    if all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in vals):
        if es_fecha(fmt):
            return {"tipo": "fecha"}
        if "%" in (fmt or ""):
            return {"tipo": "porcentaje", "min": 0, "max": 1}
        if all(float(v).is_integer() for v in vals) and "0.00" not in (fmt or ""):
            return {"tipo": "entero", "min": min(0, min(vals))}
        return {"tipo": "numero", "min": min(0, min(vals))}
    textos = sorted({str(v) for v in vals})
    if len(textos) <= 8 and len(vals) >= len(textos) * 2:
        return {"tipo": "lista", "opciones": textos}
    return {"tipo": "texto"}


def _tabla(lx, hoja, tabla):
    hh = next((x for x in lx["hojas"] if x["n"] == hoja), None)
    tt = next((x for x in hh["tablas"] if x["n"] == tabla), None) if hh else None
    return hh, tt


def esquema_escenario(libros, ajustes):
    """libros: {empresa: (lector xlsx, libro_jmd)}. ajustes: lo que no se deduce solo (tablas que no cambian,
    relaciones entre tablas, reglas para la IA). Devuelve el esquema que comparten la escena y el LMS."""
    primero = next(iter(libros.values()))[0]
    tablas = []
    no_tocar = set(ajustes.get("fijas", []))
    for h in primero["hojas"]:
        for t in h["tablas"]:
            if t["n"] in no_tocar:
                continue
            c1, f1, c2, f2 = rango(t["ref"])
            cols = []
            for k, nombre in enumerate(t["cols"]):
                letra = col_letras(c1 + k)
                amarilla, valores, fmt = False, [], ""
                for lx, _ in libros.values():
                    hh, tt = _tabla(lx, h["n"], t["n"])
                    if tt is None:
                        continue
                    a1, b1, a2, b2 = rango(tt["ref"])
                    for fila in range(b1 + 1, b2 + 1):
                        c = hh["celdas"].get(f"{letra}{fila}")
                        if c is None:
                            continue
                        e = lx["estilos"][c["s"]]
                        if e.get("bg") == AMARILLO:
                            amarilla = True
                        if c["f"]:
                            amarilla = amarilla or False
                        valores.append(c["v"])
                        fmt = fmt or e.get("f", "")
                col = {"col": letra, "nombre": nombre}
                if amarilla:
                    col["calc"] = True
                else:
                    col.update(_tipo_columna(valores, fmt))
                over = ajustes.get("columnas", {}).get(f"{t['n']}.{nombre}")
                if over:
                    col.update(over)
                cols.append(col)
            if all(c.get("calc") for c in cols):
                continue
            filas = [rango(x["ref"]) for x in (_tabla(lx, h["n"], t["n"])[1] for lx, _ in libros.values()) if x]
            n_filas = [b2 - b1 for _, b1, _, b2 in filas]
            fijo = t["n"] in ajustes.get("filas_fijas", [])
            desde = ajustes.get("desde", {}).get(t["n"], 0)
            cap = max(n_filas) - desde  # la escena lo ajusta a la tabla de cada empresa
            tt = {"tabla": t["n"], "hoja": h["n"], "columnas": cols, "min_filas": cap if fijo else ajustes.get("min_filas", {}).get(t["n"], 1),
                  "max_filas": cap, "filas_fijas": fijo}
            if desde:
                tt["desde"] = desde
            if t["n"] in ajustes.get("max_filas_ia", {}):
                tt["max_filas_ia"] = ajustes["max_filas_ia"][t["n"]]
            tablas.append(tt)
    # Parámetros: números y fechas sueltos (fuera de tablas, sin amarillo) con su etiqueta a la izquierda.
    params = []
    for h in primero["hojas"]:
        if h["n"] == "Instrucciones":
            continue
        dentro = [rango(t["ref"]) for t in h["tablas"]]
        for ref, c in sorted(h["celdas"].items(), key=lambda kv: (partir(kv[0])[1], partir(kv[0])[0])):
            col, fila = partir(ref)
            if c["f"] or not isinstance(c["v"], (int, float)) or isinstance(c["v"], bool):
                continue
            if any(a <= col <= b and f1 <= fila <= f2 for a, f1, b, f2 in dentro):
                continue
            e = primero["estilos"][c["s"]]
            if e.get("bg") == AMARILLO:
                continue
            def en_tabla(c_, f_):
                return any(a <= c_ <= b and f1 <= f_ <= f2 for a, f1, b, f2 in dentro)
            izq = arriba = ""
            for k in range(col - 1, 0, -1):
                v = h["celdas"].get(f"{col_letras(k)}{fila}")
                if v and isinstance(v["v"], str) and v["v"].strip():
                    izq = "" if en_tabla(k, fila) else v["v"].strip().rstrip(":")
                    break
            for k in range(fila - 1, max(0, fila - 8), -1):
                v = h["celdas"].get(f"{col_letras(col)}{k}")
                if v and isinstance(v["v"], str) and v["v"].strip():
                    arriba = v["v"].strip().rstrip(":")
                    break
            etiqueta = " · ".join(x for x in (izq, arriba if (not izq or len(arriba) <= 14) else "") if x) or izq or arriba
            p = {"celda": f"{h['n']}!{ref}", "etiqueta": etiqueta[:80]}
            p.update(_tipo_columna([c["v"]], e.get("f", "")))
            if p["tipo"] == "lista":
                p["tipo"] = "texto"
            params.append(p)
    params = [p for p in params if p["celda"] not in set(ajustes.get("parametros_fijos", []))][:60]
    # Título y nota de la hoja principal (A1 y A2 de la primera hoja con tablas o celdas amarillas): el escenario los cambia.
    titulo_celda = nota_celda = None
    for h in primero["hojas"]:
        if h["n"] == "Instrucciones":
            continue
        if isinstance((h["celdas"].get("A1") or {}).get("v"), str):
            titulo_celda = f"{h['n']}!A1"
            if isinstance((h["celdas"].get("A2") or {}).get("v"), str) and not any(p["celda"] == f"{h['n']}!B2" for p in params):
                nota_celda = f"{h['n']}!A2"
            break
    out = {"v": 1, "tablas": tablas, "parametros": params, "relaciones": ajustes.get("relaciones", []),
           "valores_por": ajustes.get("valores_por", {}), "reglas": ajustes.get("reglas", []), "ejemplos": ajustes.get("ejemplos", []),
           "ia": ajustes.get("ia", True), "titulo_celda": ajustes.get("titulo_celda", titulo_celda), "nota_celda": ajustes.get("nota_celda", nota_celda)}
    return out


# ------------------------------------------------------------------------------------------------ ajustes por sesión
# Lo que el esquema no deduce de los Excel: tablas que no cambian, columnas que se calculan solas, relaciones entre
# tablas y reglas para que la IA respete el formato del caso.
_FECHA_MES = "Fechas dentro del mes del caso, en orden."
_SOLES = "Remuneraciones siempre en soles (la RMV y la asignación familiar son en soles); si el pedido menciona otra moneda, úsala solo para las ventas en «nota»."
AJUSTES = {
    1: {"reglas": [_FECHA_MES, "Operación: Gravada en la mayoría; Exonerada o Exportación solo si el giro lo justifica.",
                   "Factura con RUC de 11 dígitos y serie F001-…; boleta con DNI de 8 dígitos y serie B001-…."],
        "columnas": {"Ventas.Serie-Número": {"nota": "F001-000123 o B001-003456"}, "Ventas.RUC / DNI": {"nota": "texto: RUC de 11 dígitos o DNI de 8"}},
        "ejemplos": ["una bodega en Huancayo con ventas de noviembre", "una agroexportadora con ventas en dólares", "un restaurante del RER con 15 comprobantes"]},
    2: {"valores_por": {"Compras.Clasificación": "Concepto"}, "reglas": [_FECHA_MES, "Importe total con IGV incluido."],
        "ejemplos": ["un taller mecánico que compra repuestos en noviembre", "una ferretería con 10 facturas de proveedores", "una clínica que compra un equipo grande"]},
    3: {"fijas": ["Liquidacion"], "max_filas_ia": {"VentasTrim": 30, "ComprasTrim": 24},
        "columnas": {"VentasTrim.Mes": {"derivar": "=MES(B{f})"}, "ComprasTrim.Mes": {"derivar": "=MES(B{f})"},
                     "VentasTrim.IGV": {"derivar": "=SI(E{f}=\"Gravada\",REDONDEAR(F{f}*0.18,2),0)"}, "ComprasTrim.IGV": {"derivar": "=REDONDEAR(F{f}*0.18,2)"}},
        "reglas": ["Fechas entre el 01/08/2026 y el 31/10/2026: la liquidación es de agosto, septiembre y octubre.",
                   "Al menos un mes con más compras que ventas, para que aparezca saldo a favor."],
        "ejemplos": ["una distribuidora con un trimestre flojo en septiembre", "una empresa que compra un activo fijo grande en agosto"]},
    4: {"filas_fijas": ["Ingresos"], "parametros_fijos": ["Renta!F3"], "columnas": {"Ingresos.Mes": {"fija": True}},
        "reglas": ["Ingresos netos de enero a diciembre (una fila por mes, en orden).", "Gastos con «¿Deducible?» Sí o No; algunos No (multas, gastos personales…)."],
        "ejemplos": ["una empresa del Régimen General con ventas que suben en diciembre", "un negocio MYPE con 3 gastos no deducibles"]},
    5: {"fijas": ["Tasas"], "parametros_fijos": ["Planilla!C2", "Planilla!F2"], "columnas": {"Planilla.Cód.": {"derivar": "seq:T:2"}},
        "reglas": [_SOLES, "Básico mayor o igual a la RMV (S/ 1 230).", "Bono 0 salvo en cargos de ventas u operación.", "Hijos de 0 a 3."],
        "ejemplos": ["una bodega con 3 trabajadores", "un taller con 5 mecánicos, dos con hijos", "una oficina con todos en AFP Integra"]},
    6: {"parametros_fijos": ["Gratificación!C2", "Gratificación!F2"], "columnas": {"Gratificacion.Cód.": {"derivar": "seq:T:2"}},
        "reglas": [_SOLES, "Básico mayor o igual a la RMV (S/ 1 230).", "Fechas de ingreso anteriores al 01/01/2027; algunas en 2026 para que los meses computables varíen."],
        "ejemplos": ["una bodega con 3 trabajadores, uno que entró en septiembre", "un restaurante con 6 mozos nuevos"]},
    7: {"parametros_fijos": ["CTS!C2", "CTS!F2"], "columnas": {"CTS.Cód.": {"derivar": "seq:T:2"}},
        "reglas": [_SOLES, "Asig. familiar: 123 o 0.", "Gratificación de julio coherente con el básico (o 0 si entró después de junio).", "Fechas de ingreso anteriores al fin del periodo."],
        "ejemplos": ["una empresa con 4 trabajadores, dos que ingresaron este año", "un colegio con 8 docentes"]},
    8: {"relaciones": [{"de": "Movimientos.Código", "a": "Inventario.Código"}],
        "columnas": {"Inventario.Código": {"nota": "I01, I02…"}},
        "reglas": ["Movimientos usa solo los códigos de Inventario.", "Las salidas de un producto no superan su stock inicial más sus entradas.", _FECHA_MES],
        "ejemplos": ["una ferretería con 5 productos y mucha rotación", "un minimarket con un producto bajo el stock mínimo"]},
    9: {"desde": {"Kardex": 1},
        "reglas": ["La primera fila (saldo inicial) no se toca: genera solo los movimientos siguientes.", "En cada fila hay entrada o salida, no ambas (la otra en 0).",
                   "Las salidas no dejan el saldo en negativo.", _FECHA_MES],
        "ejemplos": ["un producto que sube de costo cada compra", "un mes con muchas ventas y una sola compra"]},
    10: {"fijas": ["TasasDep"], "columnas": {"Activos.Código": {"derivar": "seq:AF:2"}},
         "reglas": ["Categoría: una de la hoja Tasas.", "Fecha de adquisición anterior a la fecha de cálculo."],
         "ejemplos": ["una empresa de transporte con 3 camiones", "un estudio contable con computadoras y muebles"]},
    11: {"relaciones": [{"de": "Pagos.Factura", "a": "Cobranzas.Factura"}],
         "reglas": ["Cada pago corresponde a una factura de Cobranzas (puede haber pagos parciales).", "Emisiones antes de la fecha de corte; algunas muy vencidas.",
                    "Factura con formato F001-000123."],
         "ejemplos": ["un mayorista con clientes que pagan tarde", "una empresa con 3 facturas vencidas hace más de 90 días"]},
    12: {"parametros_fijos": ["Pagos!J5", "Pagos!J6", "Pagos!J7", "Pagos!J8"],
         "reglas": ["Vencimientos alrededor de la fecha «Hoy»: algunos ya vencidos.", "Crítico Sí para impuestos, planilla y servicios básicos."],
         "ejemplos": ["una semana con poca caja y muchas deudas urgentes", "una constructora con pagos grandes a proveedores"]},
    13: {"reglas": ["Casi todas las operaciones están en las dos tablas con el mismo N.º de operación y el mismo monto.",
                    "Deja 1 o 2 operaciones duplicadas en el libro, 1 o 2 cheques que el banco aún no cobra y la comisión e ITF solo en el banco.", _FECHA_MES],
         "ejemplos": ["una empresa con dos cheques no cobrados", "un mes con una operación registrada dos veces"]},
    14: {"reglas": ["Montos mensuales de los seis meses de la proyección.", "Al menos un mes con saldo final bajo la caja mínima."],
         "ejemplos": ["una empresa que vende mucho pero cobra a 60 días", "un mes con la compra de un activo fijo grande"]},
    15: {"fijas": ["Desviaciones"], "filas_fijas": ["Presupuesto", "Ejecucion"],
         "columnas": {"Presupuesto.Cuenta": {"fija": True}, "Presupuesto.Tipo": {"fija": True}, "Ejecucion.Cuenta": {"fija": True}, "Ejecucion.Tipo": {"fija": True}},
         "reglas": ["Mismas cuentas y en el mismo orden en Presupuesto y Ejecución.", "Algunas desviaciones grandes (más de 10 %) para comentar."],
         "ejemplos": ["un semestre en que las ventas caen 15 %", "gastos de personal que se disparan en marzo"]},
    16: {"filas_fijas": ["Saldos"], "columnas": {"Saldos.Cuenta": {"fija": True}, "Saldos.Rubro del EERR": {"fija": True}},
         "reglas": ["Saldos positivos y coherentes: ventas mayores que el costo de ventas."],
         "ejemplos": ["un año con pérdida", "una empresa con gastos financieros altos"]},
    17: {"filas_fijas": ["CuentasBalance"], "columnas": {"CuentasBalance.Cuenta": {"fija": True}},
         "reglas": ["Total de activos igual a pasivo más patrimonio: ajusta la utilidad del ejercicio para que cuadre."],
         "ejemplos": ["una empresa muy endeudada", "una empresa con mucha caja y pocos activos fijos"]},
    18: {"filas_fijas": ["BalanceComp", "EERRComp"],
         "columnas": {"BalanceComp.Cuenta": {"fija": True}, "BalanceComp.Grupo": {"fija": True}, "EERRComp.Rubro": {"fija": True}},
         "reglas": ["Dos años comparables; el balance de cada año cuadra (activo = pasivo + patrimonio)."],
         "ejemplos": ["una empresa cuya liquidez empeora en 2025", "una empresa que crece 30 % en ventas"]},
    19: {"fijas": ["Correlativos"],
         "reglas": ["Usa los mismos números de factura de la hoja Correlativos (puedes omitir uno para que falte).",
                    "Siembra 1 o 2 duplicados, 1 IGV mal calculado, 1 total con error y 1 RUC de 10 dígitos.", "Fechas del mes del caso; una fuera de mes."],
         "ejemplos": ["un registro con muchos errores de digitación", "un mes casi limpio con un solo duplicado"]},
    20: {"fijas": ["PorMes", "PorCanal"], "max_filas_ia": {"Ventas2025": 48},
         "columnas": {"Ventas2025.Mes": {"derivar": "mescorto:A"}, "Ventas2025.N.º mes": {"derivar": "=MES(A{f})"}},
         "reglas": ["Fechas del año 2025, repartidas de enero a diciembre.", "Canal: uno de la lista."],
         "ejemplos": ["una tienda con ventas fuertes en diciembre", "un negocio que vende sobre todo por la web"]},
}
