// Pruebas de Forja: reglas compiladas, resolver determinista e intérprete léxico.  npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolver, sorpresa, mutar } from './web/motor/resolver.js';
import { interpretar } from './web/motor/interprete.js';

const R = JSON.parse(fs.readFileSync(new URL('./web/datos/reglas.json', import.meta.url)));
const LEX = JSON.parse(fs.readFileSync(new URL('./web/datos/lexico.json', import.meta.url)));
const cat = JSON.parse(fs.readFileSync(new URL('./web/datos/catalogo.json', import.meta.url)));

test('hay más de 10 000 reglas y al menos 800 tipos', () => {
  const total = Object.values(R.T).reduce((s, t) => s + Object.keys(t).length, 0);
  assert.equal(total, R.meta.total); assert.ok(total >= 10000, `reglas: ${total}`);
  assert.ok(cat.length >= 800); assert.equal(new Set(cat.map((c) => c.id)).size, cat.length);
});

test('los 1000 tipos se resuelven con medidas y colores válidos', () => {
  for (const c of cat) for (const extremos of [{}, { altura: 0, peso: 0 }, { altura: 1, peso: 1, cabeza: 1, ojos: 1 }]) {
    const s = resolver(R, c.familia, c.variante, extremos, 7);
    for (const [k, v] of Object.entries(s.dims)) assert.ok(Number.isFinite(v) && v >= 0, `${c.id} ${k}=${v}`);
    assert.ok(s.dims.escala > 0.3 && s.dims.escala < 2.2, `${c.id} escala ${s.dims.escala}`);
    for (const col of Object.values(s.colores)) assert.ok(col.l >= 0 && col.l <= 1 && col.s >= 0 && col.s <= 1);
    assert.ok(s.fisica.salto >= 260 && s.fisica.velocidad >= 90);
    assert.ok(s.reglas.length >= 12);
  }
});

test('misma semilla, mismo personaje; los accesorios respetan la compatibilidad', () => {
  const a = sorpresa(R, 4242), b = sorpresa(R, 4242);
  assert.deepEqual(a, b);
  for (let i = 1; i < 300; i++) {
    const s = sorpresa(R, i * 7919), sp = resolver(R, s.familia, s.variante, s.params, s.semilla);
    for (const acc of sp.accesorios) assert.equal(R.T.acc[`${s.familia}|${acc.id}`][0], 1, `${sp.id} lleva ${acc.id}`);
    assert.equal(R.T.patronFam[`${s.familia}|${sp.patron.tipo}`][0], 1);
    const m = mutar(R, s, i); assert.equal(m.familia, s.familia);
  }
});

test('el intérprete entiende español coloquial sin embeddings', () => {
  const t = (x) => interpretar(x, LEX, R.T.modificador);
  let r = t('un michi rechoncho de fuego con lentes');
  assert.equal(r.familia, 'gato'); assert.equal(r.variante, 'fuego'); assert.ok(r.cambios.peso > 0.8); assert.deepEqual(r.accesorios, ['lentes']);
  r = t('Dragón bebé de hielo con corona'); assert.deepEqual([r.familia, r.variante, r.accesorios[0]], ['dragon', 'bebe', 'corona']);
  r = t('fantasma travieso con sombrero de mago'); assert.equal(r.familia, 'fantasma'); assert.deepEqual(r.accesorios, ['sombrero_mago']); assert.equal(r.cambios.expresion, 'travieso');
  r = t('robots altos y flacos azul neón'); assert.equal(r.familia, 'robot'); assert.equal(r.cambios.tono, 222); assert.equal(r.cambios.animo, 'neon');
  r = t('gato guerrero'); assert.deepEqual([r.familia, r.variante], ['gato', 'armado']);
  r = t('xyzzy'); assert.equal(r.familia, null);
});
