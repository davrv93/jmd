// Laboratorio Python · trabajador. Python corre aquí, en el navegador del alumno (Pyodide = CPython en WebAssembly).
// Nada se envía a un servidor para ejecutarse. Si el programa se cuelga, la página mata este trabajador y crea otro.
importScripts('pyodide/pyodide.js');

const CORREDOR = `
import sys, io, json, traceback, builtins

def _correr(codigo, pruebas, entradas):
    buf = io.StringIO()
    ns = {'__name__': '__main__'}
    cola = list(entradas)
    def _input(mensaje=''):
        buf.write(str(mensaje))
        if not cola:
            raise EOFError('input() pidió un dato y no quedaba ninguno')
        dato = cola.pop(0)
        buf.write(dato + '\\n')
        return dato
    viejo = sys.stdout
    sys.stdout = buf
    builtins.input = _input
    error = None
    try:
        exec(compile(codigo, 'tu_codigo.py', 'exec'), ns)
    except SyntaxError as e:
        error = {'tipo': type(e).__name__, 'msg': e.msg, 'linea': e.lineno}
    except BaseException as e:
        marcos = [m for m in traceback.extract_tb(e.__traceback__) if m.filename == 'tu_codigo.py']
        error = {'tipo': type(e).__name__, 'msg': str(e), 'linea': marcos[-1].lineno if marcos else None}
    salida = buf.getvalue()
    resultados = []
    if error is None:
        for nombre, expresion in pruebas:
            try:
                ok = bool(eval(expresion, {**ns, 'salida': salida, 'codigo': codigo}))
                resultados.append([nombre, ok, ''])
            except BaseException as e:
                resultados.append([nombre, False, f'{type(e).__name__}: {e}'])
    sys.stdout = viejo
    return json.dumps({'salida': salida[:20000], 'error': error, 'pruebas': resultados})
`;

const listo = (async () => {
  const py = await loadPyodide({ indexURL: 'pyodide/', stdout: () => {}, stderr: () => {} });
  py.runPython(CORREDOR);
  postMessage({ tipo: 'listo', version: py.runPython('import sys; sys.version.split()[0]') });
  return py;
})().catch((e) => postMessage({ tipo: 'fallo', msg: String(e && e.message || e) }));

onmessage = async (e) => {
  const py = await listo; if (!py) return;
  const { id, codigo, pruebas, entradas } = e.data;
  try {
    const correr = py.globals.get('_correr');
    const r = correr(codigo, py.toPy(pruebas || []), py.toPy(entradas || []));
    postMessage({ tipo: 'resultado', id, ...JSON.parse(r) });
  } catch (err) { postMessage({ tipo: 'resultado', id, salida: '', error: { tipo: 'Error', msg: String(err && err.message || err), linea: null }, pruebas: [] }); }
};
