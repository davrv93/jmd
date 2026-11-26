// Pruebas de los controles elegidos por el alumno (motor/controles.js).  node --test controles.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { accionesDe, basicasDe, defectoDe, esquemasDe, mapaDe, limpiarControles, textoControles, nombreTecla } from './web/motor/controles.js';
import { conPropios } from './web/motores/nucleo/entrada.js';

const META = JSON.parse(fs.readFileSync(new URL('./web/plantillas/meta.json', import.meta.url)));
const COMUN = fs.readFileSync(new URL('./web/plantillas/comun.js', import.meta.url), 'utf8');

test('cada juego tiene teclas de fábrica para lo básico, y pocas cosas básicas', () => {
  for (const { id } of META) {
    const d = defectoDe(id);
    for (const a of accionesDe(id)) assert.ok(Array.isArray(d[a]), `${id}: «${a}» sin lista de teclas`);
    for (const a of basicasDe(id)) assert.ok(d[a].length, `${id}: «${a}» es básica y no tiene tecla`);
    assert.ok(basicasDe(id).length <= 7, `${id}: demasiados controles básicos (${basicasDe(id).length})`);
    assert.ok(textoControles(id).length > 10, `${id}: sin leyenda`);
    for (const e of esquemasDe(id)) assert.deepEqual(Object.keys(e.m).sort(), accionesDe(id).slice().sort(), `${id}: esquema ${e.id} incompleto`);
  }
});

test('el esquema «de fábrica» es exactamente lo de fábrica', () => {
  for (const { id } of META) assert.deepEqual(esquemasDe(id).find((e) => e.id === 'fabrica').m, defectoDe(id), id);
});

test('lo del alumno reemplaza solo sus acciones', () => {
  const m = mapaDe('plataformas', { golpe: ['KeyK'], inventada: ['KeyZ'] });
  assert.deepEqual(m.golpe, ['KeyK']);
  assert.deepEqual(m.izq, defectoDe('plataformas').izq);
  assert.equal(m.inventada, undefined);
});

test('limpiarControles descarta lo que no es una tecla', () => {
  const c = limpiarControles({ futbol: { golpe: ['KeyJ', '<script>', 3, 'Space', 'KeyA', 'KeyB', 'KeyC'], 'Mal-Nombre': ['KeyA'] }, '../x': { izq: ['KeyA'] }, runner: {} });
  assert.deepEqual(c, { futbol: { golpe: ['KeyJ', 'Space', 'KeyA', 'KeyB'] } });
});

test('las plantillas Phaser conocen todas sus acciones (Forja.TECLAS en comun.js)', () => {
  for (const { id } of META.filter((m) => !m.motor || m.motor === 'phaser')) for (const a of accionesDe(id)) assert.match(COMUN, new RegExp(`\\b${a}: \\[`), `${id}: comun.js no trae «${a}»`);
});

test('los motores aplican DATOS.controles solo a las acciones que tienen', () => {
  const m = conPropios({ izq: ['KeyA'], ligero: ['KeyJ'] }, { ligero: ['KeyZ'], otra: ['KeyQ'] });
  assert.deepEqual(m, { izq: ['KeyA'], ligero: ['KeyZ'] });
});

test('nombres de teclas legibles', () => {
  assert.equal(nombreTecla('ArrowLeft'), '←'); assert.equal(nombreTecla('KeyJ'), 'J'); assert.equal(nombreTecla('Space'), 'Espacio'); assert.equal(nombreTecla('Digit3'), '3');
});

test('el menú de cada juego trae descripción, controles y ayuda', async () => {
  const { menuDe } = await import('./web/motor/ayuda.js');
  const { catalogoDe, porDefecto } = await import('./web/motor/juegos/index.js');
  for (const { id } of META) {
    const cat = await catalogoDe(id), reglas = porDefecto(cat.reglas);
    const m = menuDe(id, { ficha: cat.ficha, catalogo: cat.reglas, reglas, controles: defectoDe(id) });
    assert.ok(m.ficha?.objetivo, `${id}: sin objetivo`);
    const conTecla = accionesDe(id).filter((x) => defectoDe(id)[x].length).length;
    assert.ok(m.controles.filter((x) => x.accion !== 'extra').length === conTecla, `${id}: faltan controles`);
    assert.ok(m.controles.some((x) => x.basica) && m.controles.some((x) => x.basica === false), `${id}: sin separar lo básico`);
    assert.ok(m.ayuda.length >= 3, `${id}: poca ayuda`);
    assert.deepEqual(m.tusReglas, [], `${id}: con reglas de fábrica no hay «tus reglas»`);
  }
  const cat = await catalogoDe('runner'), k = cat.reglas.find((r) => !r.defecto);
  const m = menuDe('runner', { ficha: cat.ficha, catalogo: cat.reglas, reglas: { ...porDefecto(cat.reglas), [k.clave]: k.valor } });
  assert.deepEqual(m.tusReglas, [{ ajuste: k.ajuste, nombre: k.nombre }]);
});

test('anime: un solo botón de golpe arma el combo ligero → medio → fuerte', async () => {
  const { crearGolpeUnico } = await import('./web/motores/anime/juego.js');
  const g = crearGolpeUnico(28), paso = (golpe) => g({ recien: new Set(golpe ? ['golpe'] : []), abajo: new Set(golpe ? ['golpe'] : []) });
  const golpes = [];
  for (let n = 0; n < 120; n++) { const s = paso(n === 0 || n === 15 || n === 30 || n === 45 || n === 110); for (const a of ['ligero', 'medio', 'fuerte']) if (s.recien.has(a)) golpes.push(`${n}:${a}`); }
  assert.deepEqual(golpes, ['0:ligero', '15:medio', '30:fuerte', '45:ligero', '110:ligero']);
  const d = defectoDe('duelo-anime');
  assert.deepEqual([d.golpe, d.ligero, d.medio, d.fuerte], [['KeyJ'], [], [], []]);
  assert.deepEqual(conPropios({ golpe: [], ligero: ['KeyJ'] }, { golpe: ['KeyJ'], ligero: [] }), { golpe: ['KeyJ'], ligero: [] });
});
