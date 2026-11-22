import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoAnuncio, formatearFecha, dibujarAnuncio, descargarTexto, compartirAnuncio, copiarAnuncio } from '../web/static/exportar.js';
import { formatearTiempo } from '../web/static/cronometro.js';

// Fecha local fija para que dd/mm/aaaa no dependa de la zona horaria del entorno
const FIN = new Date(2026, 10, 22, 15, 30, 0).toISOString();

const ganadora = {
  id: 'p-1',
  jugador: 'Ana Pérez',
  semilla: 'K7Q2ZP',
  inicio: FIN,
  fin: FIN,
  duracionMs: 134500,
  completada: true,
  correctas: 10,
  total: 10,
  revisiones: 1,
  respuestas: null,
};

test('textoAnuncio incluye nombre, tiempo, semilla, aciertos, fecha y hashtag', () => {
  const texto = textoAnuncio(ganadora);
  const lineas = texto.split('\n');
  assert.equal(lineas[0], '🏆 ¡Ganador del Crucigrama IA!');
  assert.ok(texto.includes('Ana Pérez'));
  assert.ok(texto.includes(`Tiempo: ${formatearTiempo(134500)}`));
  assert.ok(texto.includes('02:14.5'));
  assert.ok(texto.includes('Semilla: K7Q2ZP'));
  assert.ok(texto.includes('10/10 palabras'));
  assert.ok(texto.includes('22/11/2026'));
  assert.match(texto, /\b\d{2}\/\d{2}\/\d{4}\b/);
  assert.equal(lineas.at(-1), '#JMDLearning');
  assert.equal(lineas.length, 6);
});

test('textoAnuncio: variante no completada cambia el título', () => {
  const texto = textoAnuncio({ ...ganadora, completada: false, correctas: 7 });
  const lineas = texto.split('\n');
  assert.ok(lineas[0].includes('Partida del Crucigrama IA'));
  assert.ok(!lineas[0].includes('Ganador'));
  assert.ok(texto.includes('7/10 palabras'));
  assert.ok(texto.includes('Ana Pérez'));
});

test('textoAnuncio: extra.titulo y extra.hashtag', () => {
  const texto = textoAnuncio(ganadora, { titulo: 'Campeón del taller', hashtag: 'TallerIA' });
  const lineas = texto.split('\n');
  assert.equal(lineas[0], 'Campeón del taller');
  assert.equal(lineas.at(-1), '#TallerIA');
});

test('textoAnuncio tolera datos faltantes', () => {
  const texto = textoAnuncio({});
  assert.ok(texto.includes('Jugador anónimo'));
  assert.ok(texto.includes('Tiempo: 00:00.0'));
  assert.ok(texto.includes('0/0 palabras'));
  assert.match(texto, /📅 \d{2}\/\d{2}\/\d{4}/);
});

test('formatearFecha da dd/mm/aaaa', () => {
  assert.equal(formatearFecha(new Date(2026, 0, 5).toISOString()), '05/01/2026');
  assert.equal(formatearFecha(FIN), '22/11/2026');
});

test('dibujarAnuncio pinta 1080×1080 con los colores y textos esperados (canvas simulado)', () => {
  const llamadas = { fillText: [], fillRect: [], fillStyles: new Set(), fonts: [] };
  const ctx = {
    _fillStyle: '',
    set fillStyle(v) { this._fillStyle = v; llamadas.fillStyles.add(v); },
    get fillStyle() { return this._fillStyle; },
    set font(v) { llamadas.fonts.push(v); this._font = v; },
    get font() { return this._font; },
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect: (...a) => llamadas.fillRect.push(a),
    fillText: (t, x, y) => llamadas.fillText.push({ t, x, y }),
    measureText: (t) => ({ width: t.length * (Number((/(\d+)px/.exec(ctx._font) || [])[1]) || 16) * 0.6 }),
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const nombreLargo = 'María de los Ángeles Fernández de la Torre y Gutiérrez';
  const devuelto = dibujarAnuncio(canvas, { ...ganadora, jugador: nombreLargo });
  assert.equal(devuelto, canvas);
  assert.equal(canvas.width, 1080);
  assert.equal(canvas.height, 1080);
  assert.deepEqual(llamadas.fillRect[0], [0, 0, 1080, 1080]);
  assert.ok(llamadas.fillStyles.has('#fbf8f3'));
  assert.ok(llamadas.fillStyles.has('#d97757'));
  assert.ok(llamadas.fillStyles.has('#1b1310'));
  const textos = llamadas.fillText.map((l) => l.t);
  assert.ok(textos.some((t) => t.startsWith('María de los Ángeles')), 'nombre pintado');
  assert.ok(textos.includes('02:14.5'));
  assert.ok(textos.includes('K7Q2ZP'));
  assert.ok(textos.includes('10/10 palabras'));
  assert.ok(textos.includes('22/11/2026'));
  assert.ok(textos.includes('JMD Learning · Crucigrama IA'));
  assert.ok(textos.includes('#JMDLearning'));
  // el nombre largo se dibujó con una fuente menor al máximo de 96px
  const fuenteNombre = llamadas.fonts.filter((f) => f.startsWith('800 ')).at(-1);
  assert.ok(parseInt(fuenteNombre.split(' ')[1], 10) < 96, `fuente ajustada: ${fuenteNombre}`);
  // sin canvas válido lanza error
  assert.throws(() => dibujarAnuncio(null, ganadora), Error);
});

test('funciones de navegador devuelven false en Node en vez de fallar', async () => {
  assert.equal(descargarTexto('x.txt', 'hola'), false);
  assert.equal(await compartirAnuncio(ganadora), false);
  assert.equal(await copiarAnuncio(ganadora), false);
});
