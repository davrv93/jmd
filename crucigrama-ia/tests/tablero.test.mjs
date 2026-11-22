import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarLetra, celdasDePalabra, esBlanca, respuestasVacias, palabraEn,
  siguienteCelda, siguientePalabra, primeraCeldaVacia, calcularEstado, montarTablero,
} from '../web/static/tablero.js';

// Puzzle 5×5 escrito a mano:
//   A R T E .
//   M . . . .
//   O . . . .
//   R E D . .
//   . . . . .
const _ = null;
const PUZZLE = {
  semilla: 'PRUEBA',
  filas: 5, columnas: 5,
  celdas: [
    ['A', 'R', 'T', 'E', _],
    ['M', _, _, _, _],
    ['O', _, _, _, _],
    ['R', 'E', 'D', _, _],
    [_, _, _, _, _],
  ],
  palabras: [
    { id: 'h1', numero: 1, palabra: 'ARTE', pista: 'Creación humana', fila: 0, col: 0, dir: 'H', largo: 4 },
    { id: 'v1', numero: 1, palabra: 'AMOR', pista: 'Sentimiento', fila: 0, col: 0, dir: 'V', largo: 4 },
    { id: 'h2', numero: 2, palabra: 'RED', pista: 'Neuronal o de datos', fila: 3, col: 0, dir: 'H', largo: 3 },
  ],
};

function conRespuestas(mapa) {
  const r = respuestasVacias(PUZZLE);
  for (const [clave, letra] of Object.entries(mapa)) {
    const [f, c] = clave.split(',').map(Number);
    r[f][c] = letra;
  }
  return r;
}

test('el módulo se importa sin DOM y expone montarTablero', () => {
  assert.equal(typeof document, 'undefined');
  assert.equal(typeof montarTablero, 'function');
});

test('normalizarLetra: mayúsculas, Ñ, ignora basura, toma la última válida', () => {
  assert.equal(normalizarLetra('a'), 'A');
  assert.equal(normalizarLetra('ñ'), 'Ñ');
  assert.equal(normalizarLetra('Z'), 'Z');
  assert.equal(normalizarLetra('1'), '');
  assert.equal(normalizarLetra('é'), '');
  assert.equal(normalizarLetra(' '), '');
  assert.equal(normalizarLetra(''), '');
  assert.equal(normalizarLetra(null), '');
  assert.equal(normalizarLetra('ab'), 'B'); // IME que acumula: queda la última
});

test('celdasDePalabra devuelve las coordenadas en orden', () => {
  assert.deepEqual(celdasDePalabra(PUZZLE.palabras[0]), [
    { fila: 0, col: 0 }, { fila: 0, col: 1 }, { fila: 0, col: 2 }, { fila: 0, col: 3 },
  ]);
  assert.deepEqual(celdasDePalabra(PUZZLE.palabras[1]), [
    { fila: 0, col: 0 }, { fila: 1, col: 0 }, { fila: 2, col: 0 }, { fila: 3, col: 0 },
  ]);
});

test('esBlanca y respuestasVacias respetan las negras', () => {
  assert.equal(esBlanca(PUZZLE, 0, 0), true);
  assert.equal(esBlanca(PUZZLE, 1, 1), false);
  assert.equal(esBlanca(PUZZLE, -1, 0), false);
  assert.equal(esBlanca(PUZZLE, 5, 0), false);
  const r = respuestasVacias(PUZZLE);
  assert.equal(r[0][0], '');
  assert.equal(r[1][1], null);
  assert.equal(r[3][2], '');
  assert.equal(r.flat().filter(x => x === '').length, 9);
});

test('palabraEn encuentra la palabra que pasa por una celda', () => {
  assert.equal(palabraEn(PUZZLE, 0, 2, 'H').id, 'h1');
  assert.equal(palabraEn(PUZZLE, 0, 2, 'V'), null);
  assert.equal(palabraEn(PUZZLE, 2, 0, 'V').id, 'v1');
  assert.equal(palabraEn(PUZZLE, 3, 0, 'H').id, 'h2');
  assert.equal(palabraEn(PUZZLE, 3, 0, 'V').id, 'v1');
  assert.equal(palabraEn(PUZZLE, 4, 4, 'H'), null);
});

test('siguienteCelda avanza, retrocede, salta negras y devuelve null al borde', () => {
  assert.deepEqual(siguienteCelda(PUZZLE, 0, 0, 'H'), { fila: 0, col: 1 });
  assert.deepEqual(siguienteCelda(PUZZLE, 0, 1, 'H', -1), { fila: 0, col: 0 });
  assert.deepEqual(siguienteCelda(PUZZLE, 0, 0, 'V'), { fila: 1, col: 0 });
  assert.equal(siguienteCelda(PUZZLE, 0, 3, 'H'), null);        // (0,4) es negra y luego fin
  assert.equal(siguienteCelda(PUZZLE, 3, 0, 'V'), null);        // (4,0) negra, fin
  assert.deepEqual(siguienteCelda(PUZZLE, 0, 1, 'V'), { fila: 3, col: 1 }); // salta (1,1) y (2,1)
  assert.equal(siguienteCelda(PUZZLE, 0, 0, 'H', -1), null);
});

test('siguientePalabra recorre en orden y da la vuelta', () => {
  assert.equal(siguientePalabra(PUZZLE, 'h1').id, 'v1');
  assert.equal(siguientePalabra(PUZZLE, 'v1').id, 'h2');
  assert.equal(siguientePalabra(PUZZLE, 'h2').id, 'h1');
  assert.equal(siguientePalabra(PUZZLE, 'h1', -1).id, 'h2');
  assert.equal(siguientePalabra(PUZZLE, null).id, 'h1');
  assert.equal(siguientePalabra({ palabras: [] }, 'x'), null);
});

test('primeraCeldaVacia salta las ya escritas', () => {
  const r = conRespuestas({ '0,0': 'A', '0,1': 'R' });
  assert.deepEqual(primeraCeldaVacia(PUZZLE.palabras[0], r), { fila: 0, col: 2 });
  const llena = conRespuestas({ '3,0': 'R', '3,1': 'E', '3,2': 'D' });
  assert.deepEqual(primeraCeldaVacia(PUZZLE.palabras[2], llena), { fila: 3, col: 0 });
});

test('calcularEstado: tablero vacío', () => {
  const e = calcularEstado(PUZZLE, respuestasVacias(PUZZLE));
  assert.deepEqual(e, {
    total: 9, llenas: 0, correctas: 0, incorrectas: 0, completo: false, perfecto: false,
    porPalabra: { h1: 'incompleta', v1: 'incompleta', h2: 'incompleta' },
  });
});

test('calcularEstado: parcial con una palabra correcta y otra con error', () => {
  const r = conRespuestas({ '0,0': 'A', '0,1': 'R', '0,2': 'T', '0,3': 'E', '3,0': 'R', '3,1': 'E', '3,2': 'X' });
  const e = calcularEstado(PUZZLE, r);
  assert.equal(e.total, 9);
  assert.equal(e.llenas, 7);
  assert.equal(e.correctas, 6);
  assert.equal(e.incorrectas, 1);
  assert.equal(e.completo, false);
  assert.equal(e.perfecto, false);
  assert.deepEqual(e.porPalabra, { h1: 'ok', v1: 'incompleta', h2: 'mal' });
});

test('calcularEstado: completo pero no perfecto', () => {
  const r = conRespuestas({
    '0,0': 'A', '0,1': 'R', '0,2': 'T', '0,3': 'E',
    '1,0': 'M', '2,0': 'O', '3,0': 'R', '3,1': 'E', '3,2': 'S',
  });
  const e = calcularEstado(PUZZLE, r);
  assert.equal(e.llenas, 9);
  assert.equal(e.completo, true);
  assert.equal(e.perfecto, false);
  assert.equal(e.incorrectas, 1);
  assert.equal(e.porPalabra.h2, 'mal');
  assert.equal(e.porPalabra.v1, 'ok');
});

test('calcularEstado: perfecto', () => {
  const r = PUZZLE.celdas.map(f => f.map(l => (l == null ? null : l)));
  const e = calcularEstado(PUZZLE, r);
  assert.equal(e.completo, true);
  assert.equal(e.perfecto, true);
  assert.equal(e.correctas, 9);
  assert.deepEqual(e.porPalabra, { h1: 'ok', v1: 'ok', h2: 'ok' });
});

test('calcularEstado tolera respuestas incompletas o con huecos', () => {
  const e = calcularEstado(PUZZLE, [['A']]);
  assert.equal(e.llenas, 1);
  assert.equal(e.correctas, 1);
  assert.equal(e.porPalabra.h1, 'incompleta');
});
