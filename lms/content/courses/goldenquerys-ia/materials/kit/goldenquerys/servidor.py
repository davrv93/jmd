#!/usr/bin/env python3
"""GoldenQuerys — servidor de consultas SOLO LECTURA (biblioteca estándar).

    python3 servidor.py            # escucha en 127.0.0.1:8766 (GQ_PUERTO lo cambia)

Endpoints (JSON):
  GET  /api/salud
  GET  /api/bases
  GET  /api/esquema?db=botica
  GET  /api/consulta?db=botica&sql=SELECT...     (o POST JSON {"db": "...", "sql": "..."})
  GET  /api/reportes
Fuera de /api/ sirve los archivos estáticos de esta carpeta (útil para probar en local).
"""
import json
import mimetypes
import os
import re
import sqlite3
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

AQUI = os.path.dirname(os.path.abspath(__file__))
BASES = os.path.join(AQUI, 'bases')
MAX_FILAS = 5000
MAX_SEGUNDOS = 5.0
PUERTO = int(os.environ.get('GQ_PUERTO', '8766'))
HOST = os.environ.get('GQ_HOST', '127.0.0.1')


class ErrorConsulta(Exception):
    pass


def bases_disponibles():
    return sorted(f[:-7] for f in os.listdir(BASES) if f.endswith('.sqlite'))


def preguntas():
    try:
        with open(os.path.join(BASES, 'preguntas.json'), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def abrir(db):
    if not db or db not in bases_disponibles():
        raise ErrorConsulta(f'Base desconocida: «{db}». Usa una de: {", ".join(bases_disponibles())}.')
    ruta = os.path.join(BASES, db + '.sqlite')
    con = sqlite3.connect(f'file:{urllib.parse.quote(ruta)}?mode=ro', uri=True, check_same_thread=False)
    con.execute('PRAGMA query_only=1')
    return con


def limpiar_sql(sql):
    """Quita comentarios y el ; final; exige UNA sola sentencia SELECT/WITH."""
    if not sql or not sql.strip():
        raise ErrorConsulta('La consulta está vacía.')
    salida, i, n = [], 0, len(sql)
    while i < n:
        c = sql[i]
        if c in ("'", '"', '`', '['):
            fin = ']' if c == '[' else c
            j = i + 1
            while j < n:
                if sql[j] == fin:
                    if fin != ']' and j + 1 < n and sql[j + 1] == fin:
                        j += 2
                        continue
                    break
                j += 1
            salida.append(sql[i:j + 1])
            i = j + 1
        elif sql.startswith('--', i):
            j = sql.find('\n', i)
            i = n if j < 0 else j
            salida.append(' ')
        elif sql.startswith('/*', i):
            j = sql.find('*/', i + 2)
            i = n if j < 0 else j + 2
            salida.append(' ')
        elif c == ';':
            salida.append('\0')
            i += 1
        else:
            salida.append(c)
            i += 1
    texto = ''.join(salida).strip().rstrip('\0 \t\r\n').strip()
    if '\0' in texto:
        raise ErrorConsulta('Solo se permite UNA sentencia por consulta (hay más de un «;»).')
    primera = re.match(r'\s*(\w+)', texto)
    if not primera or primera.group(1).upper() not in ('SELECT', 'WITH'):
        palabra = primera.group(1).upper() if primera else '?'
        raise ErrorConsulta(f'Solo lectura: la consulta debe empezar con SELECT o WITH (empieza con {palabra}).')
    return texto


def ejecutar(db, sql):
    texto = limpiar_sql(sql)
    con = abrir(db)
    inicio = time.monotonic()
    con.set_progress_handler(lambda: 1 if time.monotonic() - inicio > MAX_SEGUNDOS else 0, 10000)
    try:
        cur = con.execute(texto)
        columnas = [d[0] for d in cur.description] if cur.description else []
        filas = cur.fetchmany(MAX_FILAS + 1)
    except sqlite3.OperationalError as e:
        if 'interrupted' in str(e):
            raise ErrorConsulta(f'La consulta superó el límite de {MAX_SEGUNDOS:.0f} s y se canceló. '
                                'Agrega filtros, LIMIT o agrupa.')
        if 'readonly' in str(e) or 'query_only' in str(e):
            raise ErrorConsulta('Solo lectura: no se puede modificar la base.')
        raise ErrorConsulta(f'Error de SQLite: {e}')
    except sqlite3.Error as e:
        raise ErrorConsulta(f'Error de SQLite: {e}')
    finally:
        ms = round((time.monotonic() - inicio) * 1000, 1)
        con.close()
    truncado = len(filas) > MAX_FILAS
    filas = [[v.hex() if isinstance(v, bytes) else v for v in f] for f in filas[:MAX_FILAS]]
    return {'db': db, 'columnas': columnas, 'filas': filas, 'total': len(filas), 'ms': ms, 'truncado': truncado,
            'limite': MAX_FILAS}


def info_bases():
    pq = preguntas()
    out = []
    for b in bases_disponibles():
        ruta = os.path.join(BASES, b + '.sqlite')
        con = abrir(b)
        n_t = con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0]
        n_v = con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='view'").fetchone()[0]
        con.close()
        out.append({'nombre': b, 'giro': pq.get(b, {}).get('giro', ''), 'tablas': n_t, 'vistas': n_v,
                    'tamano_kb': round(os.path.getsize(ruta) / 1024), 'preguntas': pq.get(b, {}).get('preguntas', [])})
    return out


def esquema(db):
    con = abrir(db)
    objetos = []
    for nombre, tipo in con.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') "
                                    "AND name NOT LIKE 'sqlite_%' ORDER BY type, name").fetchall():
        fks = {f[3]: f'{f[2]}.{f[4]}' for f in con.execute(f'PRAGMA foreign_key_list("{nombre}")')}
        cols = [{'nombre': c[1], 'tipo': c[2] or '', 'pk': bool(c[5]), 'fk': fks.get(c[1])}
                for c in con.execute(f'PRAGMA table_info("{nombre}")')]
        filas = con.execute(f'SELECT COUNT(*) FROM "{nombre}"').fetchone()[0]
        objetos.append({'nombre': nombre, 'tipo': 'vista' if tipo == 'view' else 'tabla', 'filas': filas,
                        'columnas': cols})
    con.close()
    return {'db': db, 'objetos': objetos}


def titulo_de(ruta):
    try:
        with open(ruta, encoding='utf-8', errors='replace') as f:
            cabeza = f.read(4000)
    except OSError:
        return ''
    if ruta.endswith('.html'):
        m = re.search(r'<title>(.*?)</title>', cabeza, re.S | re.I)
        return m.group(1).strip() if m else ''
    for linea in cabeza.splitlines():
        if linea.strip().startswith('--'):
            return linea.strip().lstrip('-').strip()
    return ''


def reportes():
    out = []
    for carpeta, ext in (('reportes', '.html'), ('consultas', '.sql')):
        d = os.path.join(AQUI, carpeta)
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if f.endswith(ext):
                    out.append({'tipo': carpeta[:-1], 'archivo': f'{carpeta}/{f}', 'titulo': titulo_de(os.path.join(d, f))})
    return out


class Manejador(BaseHTTPRequestHandler):
    server_version = 'GoldenQuerys/1.0'

    def log_message(self, fmt, *args):
        pass  # usamos nuestro propio log (una línea por petición)

    def _log(self, codigo, extra=''):
        ruta = urllib.parse.urlsplit(self.path).path
        print(f'{time.strftime("%H:%M:%S")} {self.command} {ruta} {codigo} {extra}'.rstrip(), flush=True)

    def _json(self, codigo, datos, extra=''):
        cuerpo = json.dumps(datos, ensure_ascii=False, default=str).encode('utf-8')
        self.send_response(codigo)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(cuerpo)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(cuerpo)
        self._log(codigo, extra)

    def _api(self, ruta, params):
        if ruta == '/api/salud':
            return self._json(200, {'ok': True, 'bases': bases_disponibles()})
        if ruta == '/api/bases':
            return self._json(200, {'bases': info_bases()})
        if ruta == '/api/esquema':
            return self._json(200, esquema(params.get('db', '')))
        if ruta == '/api/reportes':
            return self._json(200, {'reportes': reportes()})
        if ruta == '/api/consulta':
            r = ejecutar(params.get('db', ''), params.get('sql', ''))
            return self._json(200, r, f'db={r["db"]} filas={r["total"]} {r["ms"]}ms')
        return self._json(404, {'error': f'Ruta desconocida: {ruta}'})

    def _atender(self, params):
        ruta = urllib.parse.urlsplit(self.path).path
        try:
            if ruta.startswith('/api/'):
                return self._api(ruta.rstrip('/') or ruta, params)
            return self._estatico(ruta)
        except ErrorConsulta as e:
            return self._json(400, {'error': str(e)}, 'error')
        except Exception as e:  # noqa: BLE001
            return self._json(500, {'error': f'Error interno: {e.__class__.__name__}: {e}'}, 'error')

    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        self._atender({k: v[0] for k, v in q.items()})

    def do_POST(self):
        largo = int(self.headers.get('Content-Length') or 0)
        try:
            datos = json.loads(self.rfile.read(largo) or b'{}') if largo else {}
            if not isinstance(datos, dict):
                raise ValueError
        except ValueError:
            return self._json(400, {'error': 'El cuerpo debe ser JSON: {"db": "...", "sql": "..."}'}, 'error')
        self._atender({k: str(v) for k, v in datos.items()})

    def _estatico(self, ruta):
        rel = urllib.parse.unquote(ruta).lstrip('/') or 'index.html'
        destino = os.path.realpath(os.path.join(AQUI, rel))
        if os.path.isdir(destino):
            destino = os.path.join(destino, 'index.html')
        if not destino.startswith(AQUI + os.sep) or not os.path.isfile(destino) or destino.endswith('.sqlite'):
            return self._json(404, {'error': f'No existe: /{rel}'})
        with open(destino, 'rb') as f:
            cuerpo = f.read()
        tipo = mimetypes.guess_type(destino)[0] or 'application/octet-stream'
        if tipo.startswith('text/') or tipo in ('application/javascript', 'application/json'):
            tipo += '; charset=utf-8'
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(cuerpo)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(cuerpo)
        self._log(200)


def main():
    if not os.path.isdir(BASES) or not bases_disponibles():
        sys.exit(f'No encuentro bases en {BASES}. Corre primero: python3 _fuente/sembrar.py')
    srv = ThreadingHTTPServer((HOST, PUERTO), Manejador)
    print(f'GoldenQuerys escuchando en http://{HOST}:{PUERTO}  bases: {", ".join(bases_disponibles())}', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
