#!/usr/bin/env python3
"""Navegador de texto con sesión para documentar un sistema web desde el aula.

En el aula no hay Chromium ni Playwright. Este script es lo que el agente usa
para «entrar y mirar»: guarda la sesión (cookies y token), sigue redirecciones,
envía el formulario de ingreso o el JSON de la API de ingreso, y resume cada
pantalla en texto: título, menú, formularios, botones, tablas, scripts y las
rutas de API que nombra el código de la página.

No ejecuta JavaScript y no saca capturas. Solo usa httpx (ya instalado) y la
biblioteca estándar. Respeta HTTPS_PROXY y NO_PROXY del aula.

Órdenes (todas aceptan --sesion NOMBRE; por defecto «principal»):

  navega.py abrir URL                 primera página; fija la dirección base
  navega.py ver RUTA                  otra página o archivo (html, js, json)
  navega.py entrar                    ingresa con el formulario de la página actual
  navega.py entrar --api RUTA [--campos usuario,clave]
                                      ingresa por la API (JSON)
  navega.py api GET RUTA              llama a la API con la sesión
  navega.py api POST RUTA '{"a":1}' --escribir
                                      solo si el caso lo pide y es ambiente de prueba
  navega.py matriz RUTA [RUTA…]       misma ruta con cada sesión guardada: quién puede
  navega.py sesiones                  qué sesiones hay
  navega.py salir [--todas]           borra la sesión (cookies y token)

La cuenta de prueba se pasa por el entorno, nunca en archivos:

  DOC_USUARIO=cajero DOC_CLAVE='…' python3 navega.py entrar --sesion cajero

Variables: DOC_DIR (carpeta de la documentación; por defecto /trabajo/documentacion),
DOC_SESIONES (dónde viven las sesiones; por defecto /tmp/documenta-sesiones).
"""
from __future__ import annotations

import datetime
import json
import os
import re
import stat
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit

try:
    import httpx
except ImportError:  # pragma: no cover
    sys.exit("Falta httpx. En el aula ya viene en /opt/venv: corre este script con «python3».")

DOC_DIR = os.environ.get("DOC_DIR", "/trabajo/documentacion")
SES_DIR = os.environ.get("DOC_SESIONES", "/tmp/documenta-sesiones")
AGENTE = "documenta-sistema/1.0 (alumno JMD Learning; cuenta de prueba; solo lectura)"
SECRETO = re.compile(r"(token|clave|password|passwd|contrase|secret|authorization|jwt|api[_-]?key|session|cookie)", re.I)
OCULTO = "«oculto»"
MAX_TEXTO = 6000


# ───────────────────────── sesión ─────────────────────────

def _ruta_sesion(nombre: str) -> str:
    nombre = re.sub(r"[^a-zA-Z0-9_-]", "-", nombre) or "principal"
    return os.path.join(SES_DIR, nombre + ".json")


def cargar(nombre: str) -> dict:
    try:
        with open(_ruta_sesion(nombre), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"nombre": nombre, "base": "", "actual": "", "cookies": [], "token": "", "usuario": ""}


def guardar(nombre: str, s: dict) -> None:
    os.makedirs(SES_DIR, mode=0o700, exist_ok=True)
    ruta = _ruta_sesion(nombre)
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(s, f)
    os.chmod(ruta, stat.S_IRUSR | stat.S_IWUSR)


def cliente(s: dict) -> httpx.Client:
    c = httpx.Client(follow_redirects=True, timeout=25, headers={"User-Agent": AGENTE, "Accept-Language": "es-PE,es;q=0.9"})
    for k in s.get("cookies", []):
        c.cookies.set(k["n"], k["v"], domain=k.get("d", ""), path=k.get("p", "/"))
    return c


def recoger_cookies(c: httpx.Client, s: dict) -> None:
    s["cookies"] = [{"n": k.name, "v": k.value, "d": k.domain, "p": k.path} for k in c.cookies.jar]


def cabeceras(s: dict, extra: dict | None = None) -> dict:
    h = dict(extra or {})
    if s.get("token"):
        h["Authorization"] = "Bearer " + s["token"]
    return h


def absoluta(s: dict, ruta: str) -> str:
    if re.match(r"^https?://", ruta):
        return ruta
    base = s.get("actual") or s.get("base")
    if not base:
        sys.exit("Todavía no hay dirección base. Empieza con: navega.py abrir https://…")
    if ruta.startswith("/"):
        # Ruta desde la raíz del SISTEMA (su base), no desde la raíz del dominio, si la base tiene carpeta.
        b = urlsplit(s["base"])
        carpeta = b.path if b.path.endswith("/") else b.path.rsplit("/", 1)[0] + "/"
        if ruta.startswith(carpeta):
            return urlunsplit((b.scheme, b.netloc, ruta, "", ""))
        return urlunsplit((b.scheme, b.netloc, carpeta.rstrip("/") + ruta, "", ""))
    return urljoin(base, ruta)


def pedir_ruta(nombre: str, s: dict, metodo: str, ruta: str, **kw):
    """Pide una ruta; si empieza con «/» y da 404 colgada de la carpeta del sistema, prueba desde la raíz del dominio."""
    url = absoluta(s, ruta)
    r = pedir(nombre, s, metodo, url, **kw)
    if r.status_code == 404 and ruta.startswith("/") and not re.match(r"^https?://", ruta):
        b = urlsplit(s["base"])
        raiz = urlunsplit((b.scheme, b.netloc, ruta, "", ""))
        if raiz != url:
            r2 = pedir(nombre, s, metodo, raiz, **kw)
            if r2.status_code != 404:
                return r2
    return r


def mismo_sitio(s: dict, url: str) -> bool:
    return not s.get("base") or urlsplit(url).netloc == urlsplit(s["base"]).netloc


# ───────────────────────── lectura de HTML ─────────────────────────

class Pagina(HTMLParser):
    """Saca de una página lo que sirve para documentarla."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titulo = ""
        self.encabezados: list[str] = []
        self.enlaces: list[tuple[str, str]] = []
        self.forms: list[dict] = []
        self.botones: list[str] = []
        self.tablas: list[list[str]] = []
        self.scripts: list[str] = []
        self.codigo: list[str] = []
        self.textos: list[str] = []
        self._pila: list[str] = []
        self._buf: list[str] = []
        self._form: dict | None = None
        self._href = ""
        self._etiquetas: dict[str, str] = {}
        self._label_for = ""
        self._tabla: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self._pila.append(tag)
        if tag in ("title", "h1", "h2", "h3", "a", "button", "label", "th", "option", "script", "legend", "summary"):
            self._buf = []
        if tag == "a":
            self._href = a.get("href", "") or ""
        elif tag == "form":
            self._form = {"id": a.get("id", ""), "accion": a.get("action", ""), "metodo": (a.get("method") or "GET").upper(), "campos": []}
            self.forms.append(self._form)
        elif tag in ("input", "select", "textarea"):
            tipo = (a.get("type") or ("select" if tag == "select" else "textarea" if tag == "textarea" else "text")).lower()
            campo = {"nombre": a.get("name", ""), "id": a.get("id", ""), "tipo": tipo, "valor": a.get("value", "") or "",
                     "obligatorio": "required" in a, "rotulo": a.get("aria-label") or a.get("placeholder") or ""}
            if tipo in ("submit", "button"):
                if campo["valor"]:
                    self.botones.append(campo["valor"])
            else:
                (self._form["campos"] if self._form is not None else self._sueltos()).append(campo)
        elif tag == "label":
            self._label_for = a.get("for", "")
        elif tag == "table":
            self._tabla = []
            self.tablas.append(self._tabla)
        elif tag == "script":
            if a.get("src"):
                self.scripts.append(a["src"])

    def _sueltos(self) -> list:
        if not self.forms or self.forms[-1].get("id") != "(campos sueltos)":
            self.forms.append({"id": "(campos sueltos)", "accion": "", "metodo": "", "campos": []})
        return self.forms[-1]["campos"]

    def handle_endtag(self, tag):
        txt = " ".join("".join(self._buf).split())
        if tag == "title":
            self.titulo = txt
        elif tag in ("h1", "h2", "h3") and txt:
            self.encabezados.append(f"{tag}: {txt}")
        elif tag == "a" and (txt or self._href):
            self.enlaces.append((txt, self._href))
        elif tag in ("button", "summary") and txt:
            self.botones.append(txt)
        elif tag == "label" and txt:
            self._etiquetas[self._label_for] = txt
        elif tag == "th" and txt and self._tabla is not None:
            self._tabla.append(txt)
        elif tag == "script":
            if "".join(self._buf).strip():
                self.codigo.append("".join(self._buf))
        elif tag == "form":
            self._form = None
        elif tag == "table":
            self._tabla = None
        if tag in self._pila:
            while self._pila and self._pila.pop() != tag:
                pass
        if tag in ("title", "h1", "h2", "h3", "a", "button", "label", "th", "script", "summary"):
            self._buf = []

    def handle_data(self, data):
        self._buf.append(data)
        if self._pila and self._pila[-1] in ("p", "li", "td", "span", "div", "strong", "em", "small", "legend") and data.strip():
            if "script" not in self._pila and "style" not in self._pila:
                self.textos.append(" ".join(data.split()))

    def cerrar(self):
        for f in self.forms:
            for c in f["campos"]:
                if not c["rotulo"]:
                    c["rotulo"] = self._etiquetas.get(c["id"], "") or c["nombre"] or c["id"]


RUTA_API = re.compile(r"""['"`]((?:/|\.{1,2}/)?[A-Za-z0-9_\-./${}]*\b(?:api|rest|graphql|v[0-9]+|auth|login|oauth)\b[A-Za-z0-9_\-./${}?=&]*)['"`]""")
METODO = re.compile(r"""method\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]""", re.I)


def rutas_en_codigo(texto: str) -> list[str]:
    vistas, salida = set(), []
    for m in RUTA_API.finditer(texto):
        r = m.group(1)
        if len(r) < 4 or r in vistas or r.endswith((".js", ".css", ".png", ".svg")):
            continue
        vistas.add(r)
        cerca = texto[m.end(): m.end() + 160]
        met = METODO.search(cerca)
        salida.append(f"{(met.group(1).upper() if met else 'GET?'):6} {r}")
    return salida[:60]


def tapar(valor):
    """Oculta valores de claves con nombre de secreto, en cualquier profundidad."""
    if isinstance(valor, dict):
        return {k: (OCULTO if SECRETO.search(str(k)) and not isinstance(v, (dict, list)) else tapar(v)) for k, v in valor.items()}
    if isinstance(valor, list):
        return [tapar(v) for v in valor[:40]] + ([f"… y {len(valor) - 40} más"] if len(valor) > 40 else [])
    return valor


def tapar_texto(texto: str) -> str:
    for secreto in (os.environ.get("DOC_CLAVE", ""),):
        if secreto and len(secreto) >= 4:
            texto = texto.replace(secreto, OCULTO)
    texto = re.sub(r"(Bearer\s+)[A-Za-z0-9._\-]{12,}", r"\1" + OCULTO, texto)
    return re.sub(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]*", OCULTO, texto)


def forma(valor, nivel=0) -> str:
    """Describe la FORMA de un JSON (claves y tipos), útil para el diagrama de clases."""
    sangria = "  " * nivel
    if isinstance(valor, dict):
        return "\n".join(f"{sangria}{k}: " + (("\n" + forma(v, nivel + 1)) if isinstance(v, (dict, list)) and v else _tipo(v)) for k, v in list(valor.items())[:40])
    if isinstance(valor, list):
        if not valor:
            return sangria + "(lista vacía)"
        return f"{sangria}lista de {len(valor)} · cada elemento:\n" + forma(valor[0], nivel + 1) if isinstance(valor[0], (dict, list)) else f"{sangria}lista de {len(valor)} {_tipo(valor[0])}"
    return sangria + _tipo(valor)


def _tipo(v) -> str:
    if isinstance(v, bool):
        return "sí/no"
    if isinstance(v, int):
        return "número entero"
    if isinstance(v, float):
        return "número decimal"
    if v is None:
        return "vacío"
    if isinstance(v, str):
        return "fecha" if re.match(r"^\d{4}-\d{2}-\d{2}", v) else "texto"
    return "objeto" if isinstance(v, dict) else "lista"


# ───────────────────────── evidencia ─────────────────────────

def _evidencia(nombre_sesion: str, metodo: str, url: str, estado: int, cuerpo: str) -> str:
    carpeta = os.path.join(DOC_DIR, "evidencia")
    os.makedirs(carpeta, exist_ok=True)
    n = len([f for f in os.listdir(carpeta) if re.match(r"^\d{2,3}-", f)]) + 1
    p = urlsplit(url)
    lema = re.sub(r"[^a-z0-9]+", "-", (p.path.rstrip("/").rsplit("/", 1)[-1] or "inicio").lower()).strip("-")[:30] or "pagina"
    archivo = f"{n:02d}-{nombre_sesion}-{metodo.lower()}-{lema}.txt"
    limpia = urlunsplit((p.scheme, p.netloc, p.path, "", ""))
    with open(os.path.join(carpeta, archivo), "w", encoding="utf-8") as f:
        f.write(f"{metodo} {limpia}\nsesión: {nombre_sesion} · estado: {estado}\n\n{tapar_texto(cuerpo)}\n")
    nueva = not os.path.exists(os.path.join(carpeta, "bitacora.md"))
    with open(os.path.join(carpeta, "bitacora.md"), "a", encoding="utf-8") as f:
        if nueva:
            f.write("# Bitácora de navegación\n\nCada fila es una petición real hecha con la cuenta de prueba. No hay claves aquí.\n\n| Hora | Sesión | Método | Dirección | Estado | Evidencia |\n|---|---|---|---|---|---|\n")
        hora = datetime.datetime.now().strftime("%H:%M:%S")
        f.write(f"| {hora} | {nombre_sesion} | {metodo} | {limpia} | {estado} | {archivo} |\n")
    return "evidencia/" + archivo


def resumen_respuesta(r: httpx.Response) -> str:
    tipo = r.headers.get("content-type", "")
    partes = [f"Estado: {r.status_code} · tipo: {tipo.split(';')[0] or 'desconocido'} · {len(r.content)} bytes"]
    if r.history:
        partes.append("Redirecciones: " + " → ".join(str(h.status_code) for h in r.history) + f" → {urlsplit(str(r.url)).path}")
    if "json" in tipo:
        try:
            dato = r.json()
        except ValueError:
            return "\n".join(partes + [r.text[:MAX_TEXTO]])
        partes.append("FORMA DE LA RESPUESTA (claves y tipos):\n" + forma(tapar(dato)))
        texto = json.dumps(tapar(dato), ensure_ascii=False, indent=1)
        partes.append("MUESTRA:\n" + texto[:2500] + ("\n… (recortado)" if len(texto) > 2500 else ""))
    elif "html" in tipo:
        pg = Pagina()
        pg.feed(r.text)
        pg.cerrar()
        partes.append(f"TÍTULO: {pg.titulo or '(sin título)'}")
        if pg.encabezados:
            partes.append("ENCABEZADOS:\n" + "\n".join("  " + e for e in pg.encabezados[:25]))
        if pg.enlaces:
            partes.append("ENLACES Y MENÚ:\n" + "\n".join(f"  [{t or '(sin texto)'}] → {h}" for t, h in pg.enlaces[:50]))
        for f in pg.forms:
            cab = f"FORMULARIO {f['id'] or '(sin id)'} · envía {f['metodo'] or '—'} a {f['accion'] or '(lo maneja JavaScript: mira los scripts y usa «entrar --api» o «api»)'}"
            campos = [f"  - {c['rotulo']} · nombre «{c['nombre'] or c['id']}» · tipo {c['tipo']}" + (" · obligatorio" if c["obligatorio"] else "")
                      + (" · valor oculto" if c["tipo"] == "hidden" else "") for c in f["campos"]]
            partes.append(cab + "\n" + "\n".join(campos))
        if pg.botones:
            partes.append("BOTONES: " + " · ".join(dict.fromkeys(pg.botones)))
        if pg.tablas:
            partes.append("TABLAS (cabeceras):\n" + "\n".join("  " + " | ".join(t) for t in pg.tablas if t))
        if pg.scripts:
            partes.append("SCRIPTS (léelos con «ver» para conocer la API):\n" + "\n".join("  " + x for x in pg.scripts[:20]))
        rutas = rutas_en_codigo("\n".join(pg.codigo))
        if rutas:
            partes.append("RUTAS QUE NOMBRA EL CÓDIGO DE LA PÁGINA:\n" + "\n".join("  " + x for x in rutas))
        texto = " · ".join(dict.fromkeys(t for t in pg.textos if len(t) > 2))
        if texto:
            partes.append("TEXTO VISIBLE: " + texto[:1500])
        if not (pg.encabezados or pg.forms or pg.enlaces) and pg.scripts:
            partes.append("AVISO: la página casi no trae contenido; se arma con JavaScript (SPA). Lee sus scripts con «ver» y trabaja con «api».")
    else:
        cuerpo = r.text
        rutas = rutas_en_codigo(cuerpo)
        if rutas:
            partes.append("RUTAS QUE NOMBRA ESTE ARCHIVO:\n" + "\n".join("  " + x for x in rutas))
        partes.append("CONTENIDO:\n" + cuerpo[:MAX_TEXTO] + ("\n… (recortado)" if len(cuerpo) > MAX_TEXTO else ""))
    return "\n".join(partes)


def pedir(nombre: str, s: dict, metodo: str, url: str, **kw) -> httpx.Response:
    if not mismo_sitio(s, url):
        sys.exit(f"Fuera del sistema: {urlsplit(url).netloc} no es {urlsplit(s['base']).netloc}. Solo se navega el sistema autorizado.")
    with cliente(s) as c:
        try:
            r = c.request(metodo, url, headers=cabeceras(s, kw.pop("headers", None)), **kw)
        except httpx.HTTPError as e:
            sys.exit(f"No se pudo conectar con {urlsplit(url).netloc}: {type(e).__name__}. Revisa la dirección; en el aula solo salen los puertos 80 y 443.")
        recoger_cookies(c, s)
    return r


def mostrar(nombre: str, s: dict, metodo: str, r: httpx.Response) -> None:
    texto = resumen_respuesta(r)
    ev = _evidencia(nombre, metodo, str(r.url), r.status_code, texto)
    print(tapar_texto(f"{metodo} {urlunsplit(urlsplit(str(r.url))._replace(query='', fragment=''))}\n{texto}\n\nGuardado en {ev}"))


# ───────────────────────── órdenes ─────────────────────────

def _token_en(dato) -> str:
    if isinstance(dato, dict):
        for k in ("token", "access_token", "accessToken", "jwt", "id_token", "auth_token"):
            if isinstance(dato.get(k), str) and len(dato[k]) >= 8:
                return dato[k]
        for v in dato.values():
            t = _token_en(v)
            if t:
                return t
    return ""


def orden_entrar(nombre: str, s: dict, args: list[str]) -> None:
    usuario, clave = os.environ.get("DOC_USUARIO", ""), os.environ.get("DOC_CLAVE", "")
    if not usuario or not clave:
        sys.exit("Falta la cuenta de prueba. Pásala por el entorno, sin escribirla en archivos:\n  DOC_USUARIO=… DOC_CLAVE='…' python3 navega.py entrar …")
    campos = ["", ""]
    ruta_api = ""
    if "--api" in args:
        ruta_api = args[args.index("--api") + 1]
    if "--campos" in args:
        campos = (args[args.index("--campos") + 1].split(",") + [""])[:2]
    if ruta_api:
        cuerpo = {campos[0] or "usuario": usuario, campos[1] or "clave": clave}
        r = pedir_ruta(nombre, s, "POST", ruta_api, json=cuerpo)
    else:
        actual = s.get("actual") or s.get("base")
        if not actual:
            sys.exit("Primero abre la página de ingreso: navega.py abrir https://…")
        r0 = pedir(nombre, s, "GET", actual)
        pg = Pagina()
        pg.feed(r0.text)
        pg.cerrar()
        form = next((f for f in pg.forms if any(c["tipo"] == "password" for c in f["campos"])), None)
        if form is None:
            sys.exit("Esta página no tiene un formulario con contraseña. Abre la página de ingreso o usa «entrar --api RUTA».")
        if not form["accion"] and form["metodo"] == "GET":
            sys.exit("El formulario de ingreso lo maneja JavaScript (no tiene «action»). Lee los scripts de la página con «ver», "
                     "busca la ruta de ingreso (por ejemplo /api/login) y usa:\n  navega.py entrar --api RUTA --campos usuario,clave")
        datos = {}
        for c in form["campos"]:
            if not c["nombre"]:
                continue
            if c["tipo"] == "password":
                datos[c["nombre"]] = clave
            elif c["tipo"] in ("text", "email", "tel") and (campos[0] in ("", c["nombre"])) and usuario not in datos.values():
                datos[c["nombre"]] = usuario
            elif c["tipo"] in ("hidden", "checkbox") and c["valor"]:
                datos[c["nombre"]] = c["valor"]
        r = pedir(nombre, s, form["metodo"] if form["metodo"] != "GET" else "POST", urljoin(str(r0.url), form["accion"] or str(r0.url)), data=datos)
    token = ""
    if "json" in r.headers.get("content-type", ""):
        try:
            token = _token_en(r.json())
        except ValueError:
            pass
    if token:
        s["token"] = token
    entro = r.status_code < 400 and (bool(token) or bool(s.get("cookies")))
    if entro and not token and "html" in r.headers.get("content-type", ""):
        # Muchos sistemas responden 200 y vuelven a mostrar el formulario cuando la clave no vale.
        pg2 = Pagina()
        pg2.feed(r.text)
        if any(c["tipo"] == "password" for f in pg2.forms for c in f["campos"]):
            entro = False
    if entro:
        s["usuario"] = usuario
        if "html" in r.headers.get("content-type", ""):
            s["actual"] = str(r.url)
    guardar(nombre, s)
    mostrar(nombre, s, "POST", r)
    print("\nINGRESO: " + (f"dentro como «{usuario}» (sesión «{nombre}»; " + ("con token" if token else "con cookie de sesión") + "). La clave no se guardó."
                           if entro else "NO entró. Revisa usuario, clave, la ruta y los nombres de los campos (mira el mensaje de arriba)."))
    if not entro:
        sys.exit(1)


def orden_matriz(rutas: list[str]) -> None:
    nombres = sorted(f[:-5] for f in os.listdir(SES_DIR) if f.endswith(".json")) if os.path.isdir(SES_DIR) else []
    if not nombres:
        sys.exit("No hay sesiones. Entra primero con cada rol: … navega.py entrar --sesion <rol>")
    print("Misma petición GET con cada sesión. 200 = puede ver · 401/403 = no puede · 404 = no existe.\n")
    print("| Ruta | " + " | ".join(nombres) + " |\n|---|" + "---|" * len(nombres))
    lineas = []
    for ruta in rutas:
        fila = []
        for n in nombres:
            s = cargar(n)
            r = pedir_ruta(n, s, "GET", ruta)
            guardar(n, s)
            fila.append(str(r.status_code))
            _evidencia(n, "GET", str(r.url), r.status_code, resumen_respuesta(r))
        lineas.append(f"| {ruta} | " + " | ".join(fila) + " |")
        print(lineas[-1])
    print("\nUsa estos estados para llenar «permisos» en modelo.json: 200 → si (o lectura), 401/403 → no. Lo que no probaste va «por-verificar».")


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] in ("-h", "--help", "ayuda"):
        print(__doc__)
        return 0
    orden, args = argv[1], argv[2:]
    nombre = "principal"
    if "--sesion" in args:
        i = args.index("--sesion")
        nombre = args[i + 1]
        del args[i:i + 2]
    s = cargar(nombre)

    if orden == "abrir":
        if not args or not re.match(r"^https?://", args[0]):
            sys.exit("Uso: navega.py abrir https://direccion-del-sistema/")
        s["base"] = ""
        r = pedir(nombre, s, "GET", args[0])
        s["base"] = s["actual"] = str(r.url)
        guardar(nombre, s)
        mostrar(nombre, s, "GET", r)
        print(f"\nDirección base del sistema: {s['base']}")
    elif orden == "ver":
        if not args:
            sys.exit("Uso: navega.py ver RUTA")
        r = pedir_ruta(nombre, s, "GET", args[0])
        if "html" in r.headers.get("content-type", ""):
            s["actual"] = str(r.url)
        guardar(nombre, s)
        mostrar(nombre, s, "GET", r)
    elif orden == "entrar":
        orden_entrar(nombre, s, args)
    elif orden == "api":
        escribir = "--escribir" in args
        args = [a for a in args if a != "--escribir"]
        if len(args) < 2:
            sys.exit("Uso: navega.py api GET RUTA   |   navega.py api POST RUTA '{json}' --escribir")
        metodo, ruta = args[0].upper(), args[1]
        if metodo not in ("GET", "HEAD") and not escribir:
            sys.exit(f"{metodo} cambia datos del sistema y este skill solo navega y lee. Hazlo solo si el caso lo pide de forma explícita "
                     "y es un ambiente de prueba: repite la orden con --escribir y anótalo en «por_verificar» o en el manual.")
        kw = {}
        if len(args) > 2:
            try:
                kw["json"] = json.loads(args[2])
            except ValueError:
                sys.exit("El cuerpo no es JSON válido.")
        r = pedir_ruta(nombre, s, metodo, ruta, **kw)
        guardar(nombre, s)
        mostrar(nombre, s, metodo, r)
        if escribir:
            print("\nAVISO: esta petición pudo cambiar datos. Quedó en la bitácora.")
    elif orden == "matriz":
        if not args:
            sys.exit("Uso: navega.py matriz RUTA [RUTA…]")
        orden_matriz(args)
    elif orden == "sesiones":
        if os.path.isdir(SES_DIR):
            for f in sorted(os.listdir(SES_DIR)):
                x = cargar(f[:-5])
                print(f"- {f[:-5]}: usuario «{x.get('usuario') or '—'}» · {'token' if x.get('token') else 'cookie' if x.get('cookies') else 'sin ingresar'} · {x.get('base', '')}")
        else:
            print("No hay sesiones.")
    elif orden == "salir":
        if os.path.isdir(SES_DIR):
            for f in os.listdir(SES_DIR):
                if "--todas" in args or f == os.path.basename(_ruta_sesion(nombre)):
                    os.remove(os.path.join(SES_DIR, f))
        print("Sesión borrada: no quedan cookies ni token.")
    else:
        sys.exit(f"No conozco la orden «{orden}». Mira: navega.py ayuda")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
