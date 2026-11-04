#!/usr/bin/env python3
"""Renderer Python (solo biblioteca estándar): consulta → reporte HTML con gráfico SVG.

Uso:
    python3 renderers/reporte.py botica                       # «ventas por mes» (v_ventas_mensuales)
    python3 renderers/reporte.py botica consultas/botica-top-productos.sql
    python3 renderers/reporte.py botica consultas/x.sql --nombre mi-reporte
Escribe reportes/<nombre>.html (ábrelo en el visor). Abre la base en SOLO LECTURA.
"""
import datetime as dt
import html
import os
import re
import sqlite3
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_DEFECTO = 'SELECT * FROM v_ventas_mensuales;'
RE_SOLES = re.compile(r'(soles|total|monto|precio|importe|saldo|deuda|costo|subtotal|igv|tarifa|ticket|pagado|margen)', re.I)


def argumentos(argv):
    if not argv or argv[0] in ('-h', '--help'):
        sys.exit(__doc__)
    base, sql_file, nombre = argv[0], None, None
    resto = argv[1:]
    if '--nombre' in resto:
        i = resto.index('--nombre')
        nombre = resto[i + 1]
        resto = resto[:i] + resto[i + 2:]
    if resto:
        sql_file = resto[0]
    return base, sql_file, nombre


def leer_sql(sql_file):
    if not sql_file:
        return SQL_DEFECTO, 'Ventas por mes'
    for ruta in (sql_file, os.path.join(KIT, sql_file)):
        if os.path.isfile(ruta):
            with open(ruta, encoding='utf-8') as f:
                texto = f.read()
            titulo = next((l.lstrip('-').strip() for l in texto.splitlines() if l.startswith('--')
                           and not l.lower().lstrip('- ').startswith('base:')), os.path.basename(ruta))
            return texto, titulo
    sys.exit(f'No encuentro el archivo SQL: {sql_file}')


def soles(v):
    return f'S/ {v:,.2f}'


def fmt(col, v):
    if v is None:
        return '<span class="nulo">NULL</span>'
    if isinstance(v, (int, float)) and not re.search(r'(^id$|_id$)', col):
        return soles(v) if RE_SOLES.search(col) else f'{v:,.2f}'.rstrip('0').rstrip('.') if isinstance(v, float) else f'{v:,}'
    return html.escape(str(v))


def grafico_svg(columnas, filas):
    """Barras verticales: primera columna de texto = etiquetas, primera numérica = valores."""
    if not filas:
        return ''
    num = [i for i, c in enumerate(columnas) if all(isinstance(f[i], (int, float)) or f[i] is None for f in filas)
           and not re.search(r'(^id$|_id$)', c)]
    txt = [i for i in range(len(columnas)) if i not in num]
    if not num:
        return '<p>No hay columnas numéricas para graficar.</p>'
    iv = next((i for i in num if RE_SOLES.search(columnas[i])), num[0])
    ie = txt[0] if txt else None
    datos = [(str(f[ie]) if ie is not None else str(k + 1), f[iv] or 0) for k, f in enumerate(filas[:60])]
    ancho, alto, izq, abajo = 900, 320, 70, 70
    maximo = max(abs(v) for _, v in datos) or 1
    paso = (ancho - izq - 10) / len(datos)
    barra = max(2, paso * 0.72)
    partes = [f'<svg viewBox="0 0 {ancho} {alto + abajo}" role="img" aria-label="Gráfico de {html.escape(columnas[iv])}">']
    for k in range(5):
        y = 10 + (alto - 10) * k / 4
        val = maximo * (1 - k / 4)
        partes.append(f'<line x1="{izq}" x2="{ancho}" y1="{y:.1f}" y2="{y:.1f}" class="rej"/>'
                      f'<text x="{izq - 6}" y="{y + 4:.1f}" class="eje" text-anchor="end">{val:,.0f}</text>')
    for k, (et, v) in enumerate(datos):
        h = (alto - 10) * max(v, 0) / maximo
        x = izq + k * paso + (paso - barra) / 2
        partes.append(f'<rect x="{x:.1f}" y="{alto - h:.1f}" width="{barra:.1f}" height="{h:.1f}" rx="2">'
                      f'<title>{html.escape(et)}: {fmt(columnas[iv], v)}</title></rect>')
        if len(datos) <= 30 or k % max(1, len(datos) // 20) == 0:
            cx = x + barra / 2
            partes.append(f'<text x="{cx:.1f}" y="{alto + 14}" class="eje" text-anchor="end" '
                          f'transform="rotate(-40 {cx:.1f} {alto + 14})">{html.escape(et[:18])}</text>')
    partes.append('</svg>')
    return '\n'.join(partes) + f'<p class="pie">Barras: <b>{html.escape(columnas[iv])}</b>' + \
        (f' por <b>{html.escape(columnas[ie])}</b>' if ie is not None else '') + \
        (' (primeras 60 filas)' if len(filas) > 60 else '') + '</p>'


def main():
    base, sql_file, nombre = argumentos(sys.argv[1:])
    ruta_db = os.path.join(KIT, 'bases', base + '.sqlite')
    if not os.path.isfile(ruta_db):
        sys.exit(f'Base desconocida: {base}. Hay: ' +
                 ', '.join(f[:-7] for f in sorted(os.listdir(os.path.join(KIT, 'bases'))) if f.endswith('.sqlite')))
    sql, titulo = leer_sql(sql_file)
    nombre = nombre or (f'{base}-' + (os.path.splitext(os.path.basename(sql_file))[0].removeprefix(base + '-')
                                     if sql_file else 'ventas-por-mes'))
    con = sqlite3.connect(f'file:{ruta_db}?mode=ro', uri=True)
    con.execute('PRAGMA query_only=1')
    cur = con.execute(sql.strip().rstrip(';'))
    columnas = [d[0] for d in cur.description]
    filas = cur.fetchmany(5000)
    con.close()

    total_col = next((i for i, c in enumerate(columnas) if RE_SOLES.search(c)
                      and all(isinstance(f[i], (int, float)) or f[i] is None for f in filas)), None)
    resumen = f'{len(filas):,} filas'
    if total_col is not None:
        resumen += f' · suma de {columnas[total_col]}: {soles(sum(f[total_col] or 0 for f in filas))}'
    tabla = ['<table><thead><tr>' + ''.join(f'<th>{html.escape(c)}</th>' for c in columnas) + '</tr></thead><tbody>']
    for f in filas[:1000]:
        tabla.append('<tr>' + ''.join(
            f'<td class="{"num" if isinstance(v, (int, float)) else ""}">{fmt(c, v)}</td>' for c, v in zip(columnas, f)) + '</tr>')
    tabla.append('</tbody></table>')

    doc = f'''<!doctype html>
<html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(titulo)} · {html.escape(base)}</title>
<style>
 body{{margin:0;background:#0f1115;color:#e9e6df;font:14px/1.5 system-ui,sans-serif}}
 main{{max-width:1000px;margin:auto;padding:24px 16px}}
 h1{{color:#e0b44c;margin:0 0 4px;font-size:24px}} .meta{{color:#a3a6ae;margin:0 0 18px}}
 .tarjeta{{background:#171a21;border:1px solid #2b303b;border-radius:12px;padding:16px;margin-bottom:16px;overflow:auto}}
 svg{{width:100%;height:auto}} rect{{fill:#e0b44c}} rect:hover{{fill:#f3cf75}}
 .rej{{stroke:#2b303b}} .eje{{fill:#a3a6ae;font-size:11px}} .pie{{color:#a3a6ae;font-size:12px}}
 table{{border-collapse:collapse;width:100%;font-size:13px}} th,td{{padding:6px 10px;border-bottom:1px solid #2b303b;white-space:nowrap;text-align:left}}
 th{{color:#f3cf75;position:sticky;top:0;background:#1e222b}} td.num{{text-align:right;font-variant-numeric:tabular-nums}}
 .nulo{{color:#6f7380;font-style:italic}} pre{{white-space:pre-wrap;color:#d9d4c7;font-size:12px}}
</style></head><body><main>
<h1>{html.escape(titulo)}</h1>
<p class="meta">Base <b>{html.escape(base)}</b> · {resumen} · generado {dt.datetime.now():%Y-%m-%d %H:%M} con renderers/reporte.py</p>
<div class="tarjeta">{grafico_svg(columnas, filas)}</div>
<div class="tarjeta">{''.join(tabla)}</div>
<details class="tarjeta"><summary>SQL usado</summary><pre>{html.escape(sql.strip())}</pre></details>
</main></body></html>
'''
    os.makedirs(os.path.join(KIT, 'reportes'), exist_ok=True)
    salida = os.path.join(KIT, 'reportes', nombre + '.html')
    with open(salida, 'w', encoding='utf-8') as f:
        f.write(doc)
    print(f'Reporte listo: reportes/{nombre}.html ({len(filas)} filas). Ábrelo en el visor: goldenquerys/reportes/{nombre}.html')


if __name__ == '__main__':
    main()
