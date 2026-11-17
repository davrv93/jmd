#!/usr/bin/env python3
"""De un modelo.json a toda la documentación del sistema.

  python3 generar.py                 lee  $DOC_DIR/modelo.json  y escribe en  $DOC_DIR
  python3 generar.py --comprobar     revisa que estén todos los entregables y que sean válidos
  python3 generar.py --prueba        autoprueba con el modelo de ejemplo, en /tmp (no toca tu trabajo)

DOC_DIR es /trabajo/documentacion salvo que la variable de entorno diga otra cosa.

Entregables:
  01-proceso.bpmn (+ .svg y .png)   proceso del caso en BPMN 2.0
  02-clases.mmd   (+ .svg y .png)   diagrama de clases (Mermaid)
  03-roles-y-acciones.md (+ .csv)   matriz de quién puede hacer qué
  04-flujos.md    (+ flujo-*.mmd/.svg/.png)   flujos paso a paso
  pantalla-*.jpg                    captura real de la pantalla (si el modelo trae «captura»)
  pantalla-*.svg/.png               esquema de la pantalla, cuando no hay captura
  manual.md y manual.pdf            el manual
  index.html                        todo junto, para el Visor
"""
from __future__ import annotations

import csv
import datetime
import html
import json
import os
import re
import shutil
import sys
import xml.dom.minidom

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.dont_write_bytecode = True

DOC_DIR = os.environ.get("DOC_DIR", "/trabajo/documentacion")
PERMISOS = {"si": "Sí", "no": "No", "lectura": "Solo lectura", "por-verificar": "Por verificar"}
CLAVE_PROHIBIDA = re.compile(r"^(clave|password|contrasena|contraseña|passwd|token|secreto|api_key|apikey)$", re.I)
OBLIGATORIOS = ["01-proceso.bpmn", "01-proceso.svg", "02-clases.mmd", "02-clases.svg", "03-roles-y-acciones.md",
                "03-roles-y-acciones.csv", "04-flujos.md", "manual.md", "manual.pdf", "index.html"]


class ErrorModelo(Exception):
    pass


def _ident(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(texto).lower()).strip("-") or "x"


def _celda(v) -> str:
    return str(v if v is not None else "").replace("|", "/").replace("\n", " ").strip()


# ───────────────────────── validación del modelo ─────────────────────────

def _claves_prohibidas(valor, ruta="modelo") -> list[str]:
    malas = []
    if isinstance(valor, dict):
        for k, v in valor.items():
            if CLAVE_PROHIBIDA.match(str(k)):
                malas.append(f"{ruta}.{k}")
            malas += _claves_prohibidas(v, f"{ruta}.{k}")
    elif isinstance(valor, list):
        for i, v in enumerate(valor):
            malas += _claves_prohibidas(v, f"{ruta}[{i}]")
    return malas


def validar(m: dict) -> list[str]:
    """Devuelve la lista de problemas del modelo, en español y con el sitio exacto."""
    p: list[str] = []
    if not isinstance(m, dict):
        return ["modelo.json debe ser un objeto { … }."]
    sis = m.get("sistema") or {}
    for k in ("nombre", "caso"):
        if not str(sis.get(k, "")).strip():
            p.append(f"Falta sistema.{k}.")
    roles = m.get("roles") or []
    ids_rol = [r.get("id") for r in roles if isinstance(r, dict)]
    if not ids_rol:
        p.append("Falta «roles»: al menos un rol con id y nombre.")
    acciones = m.get("acciones") or []
    if not acciones:
        p.append("Falta «acciones»: lo que cada rol puede hacer.")
    for i, a in enumerate(acciones):
        if not str(a.get("nombre", "")).strip():
            p.append(f"acciones[{i}] no tiene nombre.")
        per = a.get("permisos") or {}
        for rol, val in per.items():
            if rol not in ids_rol:
                p.append(f"acciones[{i}] («{a.get('nombre', '')}») nombra el rol «{rol}», que no está en «roles» ({', '.join(map(str, ids_rol))}).")
            if val not in PERMISOS:
                p.append(f"acciones[{i}].permisos.{rol} = «{val}»: usa si, no, lectura o por-verificar.")
        for rol in ids_rol:
            if rol not in per:
                p.append(f"acciones[{i}] («{a.get('nombre', '')}») no dice nada del rol «{rol}»: pon si, no, lectura o por-verificar.")
    pr = m.get("proceso") or {}
    if not pr.get("nodos") or not pr.get("flujos"):
        p.append("Falta «proceso» con nodos y flujos (el BPMN sale de ahí).")
    else:
        tipos = [n.get("tipo") for n in pr["nodos"]]
        if "inicio" not in tipos:
            p.append("proceso.nodos no tiene ningún nodo de tipo «inicio».")
        if "fin" not in tipos:
            p.append("proceso.nodos no tiene ningún nodo de tipo «fin».")
        for n in pr["nodos"]:
            if n.get("tipo") not in ("inicio", "fin", "tarea", "decision"):
                p.append(f"proceso.nodos «{n.get('id')}»: tipo «{n.get('tipo')}» no vale; usa inicio, tarea, decision o fin.")
        for n in pr["nodos"]:
            if n.get("tipo") == "decision" and sum(1 for f in pr["flujos"] if f.get("de") == n.get("id")) < 2:
                p.append(f"La decisión «{n.get('id')}» necesita al menos dos salidas con nombre (por ejemplo «Sí» y «No»).")
    if not m.get("clases"):
        p.append("Falta «clases»: las cosas que el sistema guarda (con sus atributos).")
    if not m.get("flujos"):
        p.append("Falta «flujos»: al menos un flujo con sus pasos (pantalla, accion, resultado).")
    for i, f in enumerate(m.get("flujos") or []):
        if not f.get("pasos"):
            p.append(f"flujos[{i}] («{f.get('nombre', '')}») no tiene pasos.")
    for i, pa in enumerate(m.get("pantallas") or []):
        cap = pa.get("captura")
        if cap and (not isinstance(cap, str) or cap.startswith(("/", "..")) or ".." in cap.split("/") or not cap.lower().endswith((".jpg", ".jpeg", ".png"))):
            p.append(f"pantallas[{i}].captura = «{cap}»: debe ser una ruta dentro de la documentación, como capturas/catalogo.jpg.")
    malas = _claves_prohibidas(m)
    if malas:
        p.append("El modelo no puede guardar credenciales. Quita: " + ", ".join(malas) + ".")
    secreto = os.environ.get("DOC_CLAVE", "")
    if secreto and len(secreto) >= 4 and secreto in json.dumps(m, ensure_ascii=False):
        p.append("La clave de la cuenta de prueba aparece escrita dentro de modelo.json. Bórrala: las credenciales no van en ningún archivo.")
    return p


# ───────────────────────── capturas ─────────────────────────

def preparar_captura(carpeta: str, ruta_rel: str, destino: str) -> bool:
    """Copia reducida de una captura real para el manual: JPEG de hasta 1100 px de ancho y alto acotado."""
    origen = os.path.join(carpeta, ruta_rel)
    if not os.path.isfile(origen):
        return False
    try:
        from PIL import Image
        with Image.open(origen) as im:
            im = im.convert("RGB")
            if im.width > 1100:
                im = im.resize((1100, max(1, round(im.height * 1100 / im.width))), Image.LANCZOS)
            if im.height > im.width * 1.45:  # captura de página entera: en el manual va la parte de arriba
                im = im.crop((0, 0, im.width, int(im.width * 1.45)))
            im.save(destino, "JPEG", quality=80, optimize=True)
        return True
    except Exception:  # noqa: BLE001 - una imagen dañada no debe tumbar el manual
        return False


# ───────────────────────── piezas de texto ─────────────────────────

def matriz_md(m: dict) -> str:
    roles = m.get("roles") or []
    cab = "| Módulo | Acción | " + " | ".join(_celda(r.get("nombre") or r.get("id")) for r in roles) + " | Evidencia |"
    sep = "|---|---|" + "---|" * len(roles) + "---|"
    filas = []
    for a in m.get("acciones") or []:
        per = a.get("permisos") or {}
        filas.append(f"| {_celda(a.get('modulo', ''))} | {_celda(a.get('nombre', ''))} | "
                     + " | ".join(PERMISOS.get(per.get(r.get("id")), "Por verificar") for r in roles)
                     + f" | {_celda(a.get('evidencia', '') or 'sin evidencia')} |")
    return "\n".join([cab, sep] + filas)


def escribir_matriz(m: dict, carpeta: str) -> None:
    roles = m.get("roles") or []
    sis = m.get("sistema") or {}
    md = [f"# Roles y acciones · {sis.get('nombre', '')}", "",
          "**Sí** = lo hace · **Solo lectura** = lo ve pero no lo cambia · **No** = el sistema se lo niega · "
          "**Por verificar** = no se comprobó en el recorrido.", "", "## Roles", "", "| Rol | Qué hace |", "|---|---|"]
    md += [f"| {_celda(r.get('nombre') or r.get('id'))} | {_celda(r.get('descripcion', ''))} |" for r in roles]
    md += ["", "## Matriz", "", matriz_md(m), ""]
    with open(os.path.join(carpeta, "03-roles-y-acciones.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    with open(os.path.join(carpeta, "03-roles-y-acciones.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Módulo", "Acción"] + [r.get("nombre") or r.get("id") for r in roles] + ["Evidencia"])
        for a in m.get("acciones") or []:
            per = a.get("permisos") or {}
            w.writerow([a.get("modulo", ""), a.get("nombre", "")] + [PERMISOS.get(per.get(r.get("id")), "Por verificar") for r in roles]
                       + [a.get("evidencia", "")])


def escribir_flujos(m: dict, carpeta: str, ids: list[str]) -> None:
    md = [f"# Flujos · {(m.get('sistema') or {}).get('nombre', '')}", ""]
    for f, fid in zip(m.get("flujos") or [], ids):
        md += [f"## {f.get('nombre', fid)}", "", f"Rol: **{f.get('rol', '—')}**", "", "| N.º | Pantalla | Acción | Resultado |", "|---|---|---|---|"]
        md += [f"| {i} | {_celda(x.get('pantalla', ''))} | {_celda(x.get('accion', ''))} | {_celda(x.get('resultado', ''))} |"
               for i, x in enumerate(f.get("pasos") or [], 1)]
        ruta = os.path.join(carpeta, f"flujo-{fid}.mmd")
        if os.path.exists(ruta):
            md += ["", "```mermaid", open(ruta, encoding="utf-8").read().strip(), "```"]
        md.append("")
    with open(os.path.join(carpeta, "04-flujos.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))


def manual_md(m: dict, carpeta: str, ids_flujo: list[str], ids_pant: list[str], con_captura: set | None = None) -> str:
    sis = m.get("sistema") or {}
    roles = m.get("roles") or []
    pr = m.get("proceso") or {}
    con_captura = con_captura or set()
    hoy = sis.get("fecha") or datetime.date.today().strftime("%d-%m-%Y")
    carriles = {c.get("id"): c.get("nombre") or c.get("id") for c in pr.get("carriles") or []}
    tipos = {"inicio": "Inicio", "fin": "Fin", "tarea": "Tarea", "decision": "Decisión"}
    L = [f"# Manual del sistema · {sis.get('nombre', '')}", "",
         f"**Caso documentado:** {sis.get('caso', '')}", "",
         f"Dirección: {sis.get('url', '—')}", f"Fecha: {hoy}", f"Elaborado por: {sis.get('autor', 'alumno de JMD Learning')} con DeepSeek Harness", "",
         "Documento generado a partir de un recorrido real con una cuenta de prueba. No contiene credenciales.", "",
         "## 1. Alcance", "", sis.get("alcance") or sis.get("caso", ""), "",
         "> Cómo leer este manual: lo que dice «Por verificar» no se comprobó en el recorrido. "
         + ("Las pantallas con captura son imágenes reales tomadas con la cuenta de prueba; las demás son esquemas." if con_captura
            else "Los dibujos de pantalla son esquemas, no capturas."), "",
         "## 2. Roles", "", "| Rol | Qué hace en el sistema |", "|---|---|"]
    L += [f"| {_celda(r.get('nombre') or r.get('id'))} | {_celda(r.get('descripcion', ''))} |" for r in roles]
    L += ["", "---", "", f"## 3. Proceso: {pr.get('nombre', '')}", "", "![Proceso del caso en notación BPMN](01-proceso.png)", "",
          "| N.º | Paso | Quién | Tipo |", "|---|---|---|---|"]
    L += [f"| {i} | {_celda(n.get('nombre', ''))} | {_celda(carriles.get(n.get('carril'), n.get('carril', '')))} | {tipos.get(n.get('tipo'), '')} |"
          for i, n in enumerate(pr.get("nodos") or [], 1)]
    L += ["", "El archivo `01-proceso.bpmn` se puede abrir y editar en cualquier modelador BPMN 2.0.", "", "---", "", "## 4. Paso a paso", ""]
    for f, fid in zip(m.get("flujos") or [], ids_flujo):
        L += [f"### {f.get('nombre', fid)}", "", f"Rol: **{f.get('rol', '—')}**", ""]
        for i, x in enumerate(f.get("pasos") or [], 1):
            L.append(f"{i}. En **{x.get('pantalla', '')}**: {x.get('accion', '')} Resultado: {x.get('resultado', '')}")
        L += ["", f"![Flujo: {f.get('nombre', fid)}](flujo-{fid}.png)", ""]
    if m.get("pantallas"):
        L += ["---", "", "## 5. Pantallas", ""]
        for pa, pid in zip(m["pantallas"], ids_pant):
            L += [f"### {pa.get('nombre', pid)}", "",
                  f"Dirección: `{pa.get('url', '—')}` · Roles que la usan: {', '.join(pa.get('roles') or []) or 'por verificar'}", ""]
            if pa.get("campos"):
                L.append("- Campos: " + ", ".join(map(str, pa["campos"])))
            if pa.get("botones"):
                L.append("- Botones: " + ", ".join(map(str, pa["botones"])))
            if pa.get("nota"):
                L.append("- Nota: " + str(pa["nota"]))
            if pid in con_captura:
                L += ["", f"![Pantalla «{pa.get('nombre', pid)}»: captura real tomada con la cuenta de prueba](pantalla-{pid}.jpg)", ""]
            else:
                L += ["", f"![Esquema de «{pa.get('nombre', pid)}» (no es una captura)](pantalla-{pid}.png)", ""]
    L += ["---", "", "## 6. Roles y acciones", "",
          "**Sí** = lo hace · **Solo lectura** = lo ve · **No** = el sistema se lo niega · **Por verificar** = no se comprobó.", "", matriz_md(m), "",
          "---", "", "## 7. Datos que maneja el sistema", "", "![Diagrama de clases](02-clases.png)", "",
          "| Clase | Atributos | Operaciones |", "|---|---|---|"]
    L += [f"| {_celda(c.get('nombre', ''))} | {_celda(', '.join(map(str, c.get('atributos') or [])))} | {_celda(', '.join(map(str, c.get('operaciones') or [])))} |"
          for c in m.get("clases") or []]
    L += ["", "## 8. Por verificar", ""]
    pend = list(m.get("por_verificar") or [])
    pend += [f"Permiso de «{a.get('nombre')}» para el rol {r}" for a in m.get("acciones") or [] for r, v in (a.get("permisos") or {}).items() if v == "por-verificar"]
    L += [f"- {x}" for x in pend] or ["- Nada pendiente en este recorrido."]
    if m.get("glosario"):
        L += ["", "## 9. Glosario", "", "| Término | Significado |", "|---|---|"]
        L += [f"| {_celda(g.get('termino', ''))} | {_celda(g.get('definicion', ''))} |" for g in m["glosario"]]
    bit = os.path.join(carpeta, "evidencia", "bitacora.md")
    if os.path.exists(bit):
        filas = [x for x in open(bit, encoding="utf-8").read().splitlines() if x.startswith("| ") and not x.startswith("| Hora") and "---" not in x]
        L += ["", "## Anexo. Cómo se obtuvo", "",
              f"El agente hizo {len(filas)} peticiones al sistema con la cuenta de prueba. El detalle está en `evidencia/bitacora.md`.", ""]
    return "\n".join(L) + "\n"


def indice_html(m: dict, carpeta: str, ids_flujo: list[str], ids_pant: list[str], con_captura: set | None = None) -> str:
    sis = m.get("sistema") or {}
    e = html.escape
    con_captura = con_captura or set()

    def tabla(md: str) -> str:
        filas = [[c.strip() for c in x.strip().strip("|").split("|")] for x in md.splitlines() if x.startswith("|")]
        filas = [f for f in filas if not all(set(c) <= set("-: ") for c in f)]
        if not filas:
            return ""
        cuerpo = "".join("<tr>" + "".join(f"<td class='{'v-' + _ident(c)}'>{e(c)}</td>" for c in f) + "</tr>" for f in filas[1:])
        return "<div class='t'><table><thead><tr>" + "".join(f"<th>{e(c)}</th>" for c in filas[0]) + f"</tr></thead><tbody>{cuerpo}</tbody></table></div>"

    def texto(nombre: str) -> str:
        r = os.path.join(carpeta, nombre)
        return e(open(r, encoding="utf-8").read()) if os.path.exists(r) else ""

    flujos = "".join(f"<h3>{e(f.get('nombre', fid))} <small>· {e(str(f.get('rol', '')))}</small></h3><img src='flujo-{fid}.svg' alt='Flujo {e(f.get('nombre', fid))}'>"
                     for f, fid in zip(m.get("flujos") or [], ids_flujo))
    pants = "".join(
        (f"<figure><a href='{e(str(p.get('captura')))}'><img src='{e(str(p.get('captura')))}' alt='Captura de {e(p.get('nombre', pid))}'></a><figcaption>{e(p.get('nombre', pid))} · captura real</figcaption></figure>"
         if pid in con_captura else
         f"<figure><img src='pantalla-{pid}.svg' alt='Esquema de {e(p.get('nombre', pid))}'><figcaption>{e(p.get('nombre', pid))} · esquema, no captura</figcaption></figure>")
        for p, pid in zip(m.get("pantallas") or [], ids_pant))
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documentación · {e(sis.get('nombre', ''))}</title>
<style>
:root{{--bg:#f7f5ef;--fg:#1f2937;--card:#fff;--line:#d9d5c8;--ac:#2563eb;--mut:#5b6472}}
@media (prefers-color-scheme: dark){{:root{{--bg:#12141a;--fg:#e8eaf0;--card:#1b1e27;--line:#333847;--ac:#8ab4ff;--mut:#a3acbd}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
main{{max-width:1100px;margin:0 auto;padding:24px 16px 64px}}h1{{font-size:1.7rem;margin:0 0 4px}}h2{{margin:36px 0 10px;font-size:1.25rem;border-bottom:2px solid var(--line);padding-bottom:6px}}
h3{{font-size:1rem;margin:18px 0 8px}}small,.m{{color:var(--mut);font-weight:400}}
nav{{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}}nav a,.b{{display:inline-block;padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ac);text-decoration:none;font-weight:600;font-size:.9rem}}
img{{max-width:100%;height:auto;background:#fff;border:1px solid var(--line);border-radius:10px}}
.t{{overflow-x:auto}}table{{border-collapse:collapse;width:100%;background:var(--card);font-size:.92rem}}th,td{{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}}th{{background:rgba(127,127,127,.12)}}
.v-s,.v-si{{color:#15803d;font-weight:700}}.v-no{{color:#b91c1c;font-weight:700}}.v-por-verificar{{color:#b45309;font-weight:700}}
pre{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;overflow:auto;font-size:.82rem}}
.g{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}}figure{{margin:0}}figcaption{{font-size:.82rem;color:var(--mut);margin-top:4px}}
.caso{{background:var(--card);border-left:4px solid var(--ac);padding:10px 14px;border-radius:8px}}
</style></head><body><main>
<h1>{e(sis.get('nombre', 'Sistema'))} <small>· documentación</small></h1>
<p class="caso"><b>Caso:</b> {e(sis.get('caso', ''))}</p>
<nav><a href="manual.pdf">Manual en PDF</a><a href="01-proceso.bpmn" download>Proceso .bpmn</a><a href="02-clases.mmd" download>Clases .mmd</a><a href="03-roles-y-acciones.csv" download>Matriz .csv</a><a href="evidencia/bitacora.md">Bitácora</a></nav>
<h2>1 · Proceso (BPMN)</h2><img src="01-proceso.svg" alt="Proceso en BPMN">
<p class="m">El archivo .bpmn se abre y se edita en cualquier modelador BPMN 2.0.</p>
<h2>2 · Diagrama de clases</h2><img src="02-clases.svg" alt="Diagrama de clases">
<details><summary>Ver el texto Mermaid</summary><pre>{texto('02-clases.mmd')}</pre></details>
<h2>3 · Roles y acciones</h2>{tabla(matriz_md(m))}
<h2>4 · Flujos</h2>{flujos}
<h2>5 · Pantallas</h2><div class="g">{pants or '<p class="m">Sin esquemas de pantalla.</p>'}</div>
<h2>6 · Por verificar</h2><ul>{''.join(f'<li>{e(str(x))}</li>' for x in (m.get('por_verificar') or ['Nada pendiente en este recorrido.']))}</ul>
<p class="m">Generado con el skill documenta-sistema. Sin credenciales. Las pantallas marcadas «captura real» son imágenes del sistema; las marcadas «esquema» son dibujos.</p>
</main></body></html>
"""


# ───────────────────────── generar ─────────────────────────

def generar(carpeta: str) -> int:
    import diagramas
    import pdf

    ruta = os.path.join(carpeta, "modelo.json")
    if not os.path.exists(ruta):
        print(f"No existe {ruta}. Escríbelo siguiendo el ejemplo: {os.path.join(os.path.dirname(AQUI), 'ejemplo', 'modelo.json')}")
        return 1
    try:
        with open(ruta, encoding="utf-8") as f:
            m = json.load(f)
    except ValueError as e:
        print(f"modelo.json no es JSON válido: {e}. Corrige esa línea y vuelve a correr.")
        return 1
    problemas = validar(m)
    if problemas:
        print("El modelo tiene problemas. Corrige y vuelve a correr:\n" + "\n".join("  - " + x for x in problemas))
        return 1
    try:
        diagramas.diagrama_proceso(m["proceso"], os.path.join(carpeta, "01-proceso"))
        diagramas.diagrama_clases(m["clases"], m.get("relaciones") or [], os.path.join(carpeta, "02-clases"))
        ids_flujo, ids_pant = [], []
        con_captura: set = set()
        for i, f in enumerate(m.get("flujos") or [], 1):
            fid = _ident(f.get("id") or i)
            fid = fid if fid not in ids_flujo else f"{fid}-{i}"
            ids_flujo.append(fid)
            diagramas.diagrama_flujo(f, os.path.join(carpeta, f"flujo-{fid}"))
        for i, pa in enumerate(m.get("pantallas") or [], 1):
            pid = _ident(pa.get("id") or i)
            pid = pid if pid not in ids_pant else f"{pid}-{i}"
            ids_pant.append(pid)
            if pa.get("captura") and preparar_captura(carpeta, pa["captura"], os.path.join(carpeta, f"pantalla-{pid}.jpg")):
                con_captura.add(pid)
            else:
                if pa.get("captura"):
                    print(f"AVISO: la pantalla «{pa.get('nombre', pid)}» nombra {pa['captura']}, que no existe o no se pudo leer: sale con esquema.")
                diagramas.diagrama_pantalla(pa, os.path.join(carpeta, f"pantalla-{pid}"))
    except ValueError as e:
        print(f"El modelo no se puede dibujar: {e}\nCorrige modelo.json y vuelve a correr.")
        return 1
    escribir_matriz(m, carpeta)
    escribir_flujos(m, carpeta, ids_flujo)
    md = manual_md(m, carpeta, ids_flujo, ids_pant, con_captura)
    with open(os.path.join(carpeta, "manual.md"), "w", encoding="utf-8") as f:
        f.write(md)
    paginas = pdf.md_a_pdf(md, os.path.join(carpeta, "manual.pdf"), base_dir=carpeta, pie="Manual · " + str((m.get("sistema") or {}).get("nombre", "")))
    with open(os.path.join(carpeta, "index.html"), "w", encoding="utf-8") as f:
        f.write(indice_html(m, carpeta, ids_flujo, ids_pant, con_captura))
    print(f"GENERADO en {carpeta}: BPMN, clases, matriz, {len(ids_flujo)} flujo(s), {len(ids_pant)} pantalla(s) ({len(con_captura)} con captura real) y manual.pdf de {paginas} páginas.")
    return comprobar(carpeta)


def comprobar(carpeta: str) -> int:
    fallos, avisos = [], []
    for n in OBLIGATORIOS:
        r = os.path.join(carpeta, n)
        if not os.path.exists(r) or os.path.getsize(r) == 0:
            fallos.append(f"falta {n}")
    if not fallos:
        for n in ("01-proceso.bpmn", "01-proceso.svg", "02-clases.svg"):
            try:
                xml.dom.minidom.parse(os.path.join(carpeta, n))
            except Exception as e:  # noqa: BLE001
                fallos.append(f"{n} no es XML válido ({e})")
        bp = open(os.path.join(carpeta, "01-proceso.bpmn"), encoding="utf-8").read()
        for pieza in ("startEvent", "endEvent", "sequenceFlow", "BPMNShape", "BPMNEdge"):
            if pieza not in bp:
                fallos.append(f"el BPMN no tiene {pieza}")
        with open(os.path.join(carpeta, "manual.pdf"), "rb") as f:
            cab = f.read(5)
            f.seek(max(0, os.path.getsize(os.path.join(carpeta, "manual.pdf")) - 64))
            if cab != b"%PDF-" or b"%%EOF" not in f.read():
                fallos.append("manual.pdf no es un PDF completo")
        if not open(os.path.join(carpeta, "02-clases.mmd"), encoding="utf-8").read().lstrip().startswith("classDiagram"):
            fallos.append("02-clases.mmd no empieza con classDiagram")
    # Ninguna credencial en ningún archivo de texto de la documentación.
    secreto = os.environ.get("DOC_CLAVE", "")
    patron = re.compile(r"(Bearer\s+[A-Za-z0-9._\-]{16,}|\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.|(?:contrase[ñn]a|password|clave)\s*[:=]\s*\S{4,})", re.I)
    for raiz, _, archivos in os.walk(carpeta):
        for n in archivos:
            if not n.endswith((".md", ".json", ".txt", ".csv", ".html", ".mmd", ".bpmn", ".svg")):
                continue
            try:
                t = open(os.path.join(raiz, n), encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            rel = os.path.relpath(os.path.join(raiz, n), carpeta)
            if secreto and len(secreto) >= 4 and secreto in t:
                fallos.append(f"la clave de la cuenta de prueba aparece en {rel}: bórrala de ahí")
            elif patron.search(t) and "evidencia" not in rel:
                avisos.append(f"{rel} parece nombrar una clave o un token: revísalo y bórralo si es una credencial")
    if not os.path.exists(os.path.join(carpeta, "evidencia", "bitacora.md")):
        avisos.append("no hay evidencia/bitacora.md: la documentación no viene de un recorrido con navega.py")
    try:
        m = json.load(open(os.path.join(carpeta, "modelo.json"), encoding="utf-8"))
        pend = len(m.get("por_verificar") or []) + sum(1 for a in m.get("acciones") or [] for v in (a.get("permisos") or {}).values() if v == "por-verificar")
        sin_ev = sum(1 for a in m.get("acciones") or [] if not a.get("evidencia"))
        if sin_ev:
            avisos.append(f"{sin_ev} acción(es) de la matriz no citan evidencia")
        usadas = {str(pa.get("captura")) for pa in m.get("pantallas") or [] if pa.get("captura")}
        dir_cap = os.path.join(carpeta, "capturas")
        hay = sorted("capturas/" + n for n in os.listdir(dir_cap) if n.lower().endswith((".jpg", ".jpeg", ".png"))) if os.path.isdir(dir_cap) else []
        sueltas = [c for c in hay if c not in usadas]
        if sueltas:
            avisos.append("hay capturas que ninguna pantalla del modelo usa: " + ", ".join(sueltas[:6]) + ". Ponlas en «captura» de su pantalla y regenera")
        for c in usadas:
            if not os.path.isfile(os.path.join(carpeta, c)):
                avisos.append(f"el modelo nombra {c}, que no existe: esa pantalla salió con esquema")
    except (OSError, ValueError):
        pend = 0
    for a in avisos:
        print("AVISO: " + a)
    if fallos:
        print("COMPROBACIÓN: FALLÓ\n" + "\n".join("  - " + x for x in fallos))
        return 1
    print(f"COMPROBACIÓN: todo en orden · {len(OBLIGATORIOS)} entregables válidos · {pend} punto(s) por verificar.")
    print("Míralo en el Visor: documentacion/index.html · Manual: documentacion/manual.pdf")
    return 0


def prueba() -> int:
    destino = "/tmp/documenta-prueba"
    shutil.rmtree(destino, ignore_errors=True)
    os.makedirs(destino)
    try:
        import httpx  # noqa: F401
        from PIL import Image
    except ImportError as e:
        print(f"NO LISTO: falta {e.name}. Corre los scripts con «python3» (el de /opt/venv).")
        return 1
    # El ejemplo más una captura de mentira, para probar también el camino de las capturas reales.
    with open(os.path.join(os.path.dirname(AQUI), "ejemplo", "modelo.json"), encoding="utf-8") as f:
        m = json.load(f)
    os.makedirs(os.path.join(destino, "capturas"))
    Image.new("RGB", (1280, 800), "#e8eef7").save(os.path.join(destino, "capturas", "ingresar.jpg"), "JPEG")
    m["pantallas"][0]["captura"] = "capturas/ingresar.jpg"
    with open(os.path.join(destino, "modelo.json"), "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False)
    rc = generar(destino)
    shutil.rmtree(destino, ignore_errors=True)
    print("LISTO: el skill documenta-sistema funciona en esta aula." if rc == 0 else "NO LISTO: copia el mensaje completo y avisa al instructor.")
    return rc


def main(argv: list[str]) -> int:
    if "--prueba" in argv:
        return prueba()
    carpeta = next((a for a in argv[1:] if not a.startswith("--")), DOC_DIR)
    if "--comprobar" in argv:
        return comprobar(carpeta)
    return generar(carpeta)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
