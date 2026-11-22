// Pruebas de semilla.js y generador.js con node:test (Node 20+, sin dependencias).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizarSemilla, semillaAleatoria, rngDesdeSemilla } from '../web/static/semilla.js';
import { BANCO, generarCrucigrama, validarCrucigrama } from '../web/static/generador.js';

// ---------------------------------------------------------------------------
// semilla.js
// ---------------------------------------------------------------------------

test('normalizarSemilla recorta, pasa a mayúsculas y filtra caracteres', () => {
  assert.equal(normalizarSemilla('  k7q2-zp! '), 'K7Q2ZP');
  assert.equal(normalizarSemilla('ñandú con tildes áéí'), 'ANDCONTILDES');
  assert.equal(normalizarSemilla('abcdefghijklmnopqrstuvwxyz'), 'ABCDEFGHIJKL');
  assert.equal(normalizarSemilla(''), '');
  assert.equal(normalizarSemilla(null), '');
  assert.equal(normalizarSemilla(undefined), '');
  assert.equal(normalizarSemilla(12345), '12345');
  assert.equal(normalizarSemilla('---'), '');
});

test('semillaAleatoria devuelve 6 caracteres [A-Z0-9]', () => {
  for (let i = 0; i < 50; i++) {
    const s = semillaAleatoria();
    assert.match(s, /^[A-Z0-9]{6}$/);
  }
  const distintas = new Set(Array.from({ length: 20 }, () => semillaAleatoria()));
  assert.ok(distintas.size > 1, 'debería variar entre llamadas');
});

test('rngDesdeSemilla es reproducible y devuelve valores en [0,1)', () => {
  const a = rngDesdeSemilla('PRUEBA');
  const b = rngDesdeSemilla('prueba '); // se normaliza igual
  const secuenciaA = Array.from({ length: 200 }, () => a());
  const secuenciaB = Array.from({ length: 200 }, () => b());
  assert.deepEqual(secuenciaA, secuenciaB);
  for (const x of secuenciaA) {
    assert.equal(typeof x, 'number');
    assert.ok(x >= 0 && x < 1, `valor fuera de rango: ${x}`);
  }
  assert.ok(new Set(secuenciaA).size > 190, 'la secuencia no debería repetirse casi nunca');

  const c = rngDesdeSemilla('OTRA');
  const secuenciaC = Array.from({ length: 200 }, () => c());
  assert.notDeepEqual(secuenciaA, secuenciaC);
});

// ---------------------------------------------------------------------------
// BANCO
// ---------------------------------------------------------------------------

test('BANCO tiene ≥ 60 entradas con formato válido y sin duplicados', () => {
  assert.ok(BANCO.length >= 60, `solo hay ${BANCO.length} entradas`);
  const vistas = new Set();
  for (const entrada of BANCO) {
    assert.equal(typeof entrada.palabra, 'string');
    assert.match(entrada.palabra, /^[A-ZÑ]{3,12}$/, `palabra inválida: ${entrada.palabra}`);
    assert.equal(typeof entrada.pista, 'string');
    assert.ok(entrada.pista.trim().length > 0, `pista vacía para ${entrada.palabra}`);
    assert.ok(!vistas.has(entrada.palabra), `palabra repetida: ${entrada.palabra}`);
    vistas.add(entrada.palabra);
  }
});

// ---------------------------------------------------------------------------
// generarCrucigrama
// ---------------------------------------------------------------------------

test('generarCrucigrama es determinista: misma semilla ⇒ mismo JSON', () => {
  const a = generarCrucigrama('K7Q2ZP');
  const b = generarCrucigrama('k7q2zp');
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.semilla, 'K7Q2ZP');

  const c = generarCrucigrama('K7Q2ZP', { filas: 15, columnas: 15, maxPalabras: 12, minPalabras: 8 });
  const d = generarCrucigrama('K7Q2ZP', { filas: 15, columnas: 15, maxPalabras: 12, minPalabras: 8 });
  assert.equal(JSON.stringify(c), JSON.stringify(d));
});

test('semillas distintas producen crucigramas distintos', () => {
  const a = generarCrucigrama('ALFA');
  const b = generarCrucigrama('BETA');
  assert.notEqual(JSON.stringify(a), JSON.stringify(b));
  const vistos = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(generarCrucigrama('Z' + i).celdas)));
  assert.ok(vistos.size >= 19, 'casi todas las semillas deberían dar grillas distintas');
});

test('la forma del puzzle respeta el contrato', () => {
  const p = generarCrucigrama('FORMA');
  assert.equal(p.filas, 13);
  assert.equal(p.columnas, 13);
  assert.equal(p.celdas.length, 13);
  for (const fila of p.celdas) {
    assert.equal(fila.length, 13);
    for (const c of fila) assert.ok(c === null || /^[A-ZÑ]$/.test(c));
  }
  for (const w of p.palabras) {
    assert.deepEqual(Object.keys(w).sort(), ['col', 'dir', 'fila', 'id', 'largo', 'numero', 'palabra', 'pista'].sort());
    assert.equal(w.id, w.dir.toLowerCase() + w.numero);
    assert.equal(w.largo, w.palabra.length);
    assert.ok(BANCO.some((e) => e.palabra === w.palabra && e.pista === w.pista));
  }
  // Orden: numero ascendente y H antes de V.
  for (let i = 1; i < p.palabras.length; i++) {
    const a = p.palabras[i - 1];
    const b = p.palabras[i];
    assert.ok(a.numero < b.numero || (a.numero === b.numero && a.dir === 'H' && b.dir === 'V'));
  }
});

test('validarCrucigrama ok y ≥ minPalabras para 50 semillas distintas', () => {
  const semillas = Array.from({ length: 44 }, (_, i) => 'A' + i);
  for (let i = 0; i < 6; i++) semillas.push(semillaAleatoria());
  assert.equal(new Set(semillas).size, 50);
  for (const semilla of semillas) {
    const p = generarCrucigrama(semilla);
    const v = validarCrucigrama(p);
    assert.ok(v.ok, `semilla ${semilla}: ${v.errores.join(' | ')}`);
    assert.ok(p.palabras.length >= 6, `semilla ${semilla}: solo ${p.palabras.length} palabras`);
    assert.ok(p.palabras.length <= 10, `semilla ${semilla}: ${p.palabras.length} palabras supera maxPalabras`);
  }
});

test('respeta opciones de tamaño y cantidad de palabras', () => {
  const p = generarCrucigrama('OPCIONES', { filas: 9, columnas: 11, maxPalabras: 5, minPalabras: 4 });
  assert.equal(p.filas, 9);
  assert.equal(p.columnas, 11);
  assert.equal(p.celdas.length, 9);
  assert.ok(p.celdas.every((f) => f.length === 11));
  assert.ok(p.palabras.length >= 4 && p.palabras.length <= 5);
  assert.ok(validarCrucigrama(p).ok);

  const g = generarCrucigrama('GRANDE', { filas: 17, columnas: 17, maxPalabras: 16, minPalabras: 12 });
  assert.ok(g.palabras.length >= 12, `solo ${g.palabras.length} palabras`);
  assert.ok(validarCrucigrama(g).ok);
});

// ---------------------------------------------------------------------------
// validarCrucigrama · detección de errores
// ---------------------------------------------------------------------------

function clonar(p) {
  return JSON.parse(JSON.stringify(p));
}

test('validarCrucigrama detecta letras inválidas', () => {
  const p = clonar(generarCrucigrama('ERRORES'));
  const w = p.palabras[0];
  p.celdas[w.fila][w.col] = 'á';
  const v = validarCrucigrama(p);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /Letra inválida/.test(e)));
});

test('validarCrucigrama detecta celdas que no coinciden con la palabra', () => {
  const p = clonar(generarCrucigrama('ERRORES'));
  const w = p.palabras[0];
  const f = w.dir === 'H' ? w.fila : w.fila + 1;
  const c = w.dir === 'H' ? w.col + 1 : w.col;
  p.celdas[f][c] = p.celdas[f][c] === 'X' ? 'Y' : 'X';
  const v = validarCrucigrama(p);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /no coincide con la celda/.test(e)));
});

test('validarCrucigrama detecta secuencias no declaradas', () => {
  const p = clonar(generarCrucigrama('ERRORES'));
  // Buscar una celda negra que esté junto a una letra y pintarle una letra.
  let hecho = false;
  for (let f = 0; f < p.filas && !hecho; f++) {
    for (let c = 0; c < p.columnas && !hecho; c++) {
      if (p.celdas[f][c] === null && c + 1 < p.columnas && p.celdas[f][c + 1] !== null) {
        p.celdas[f][c] = 'Q';
        hecho = true;
      }
    }
  }
  assert.ok(hecho);
  const v = validarCrucigrama(p);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /no declarada|no corresponde|pegada/.test(e)));
});

test('validarCrucigrama detecta palabras duplicadas e ids duplicados', () => {
  const p = clonar(generarCrucigrama('ERRORES'));
  p.palabras.push({ ...p.palabras[0] });
  const v = validarCrucigrama(p);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /Palabra duplicada/.test(e)));
  assert.ok(v.errores.some((e) => /Id duplicado/.test(e)));
});

test('validarCrucigrama detecta grafo desconectado', () => {
  // Puzzle armado a mano: dos palabras correctas pero sin ninguna celda en común.
  const n = null;
  const p = {
    semilla: 'MANO',
    filas: 3,
    columnas: 7,
    celdas: [
      ['B', 'I', 'T', n, n, n, n],
      [n, n, n, n, n, n, n],
      [n, n, n, n, 'A', 'P', 'I'],
    ],
    palabras: [
      { id: 'h1', numero: 1, palabra: 'BIT', pista: 'Unidad mínima.', fila: 0, col: 0, dir: 'H', largo: 3 },
      { id: 'h2', numero: 2, palabra: 'API', pista: 'Interfaz.', fila: 2, col: 4, dir: 'H', largo: 3 },
    ],
  };
  const v = validarCrucigrama(p);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /desconectadas/.test(e)));
  assert.equal(v.errores.length, 1, v.errores.join(' | '));
});

test('validarCrucigrama detecta numeración inconsistente y orden incorrecto', () => {
  const p = clonar(generarCrucigrama('ERRORES'));
  p.palabras[0].numero = 42;
  let v = validarCrucigrama(p);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /tiene número 42/.test(e)));

  const q = clonar(generarCrucigrama('ERRORES'));
  q.palabras.reverse();
  v = validarCrucigrama(q);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /Orden incorrecto/.test(e)));

  const r = clonar(generarCrucigrama('ERRORES'));
  r.palabras[0].id = 'zz';
  v = validarCrucigrama(r);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => /tiene id/.test(e)));
});
