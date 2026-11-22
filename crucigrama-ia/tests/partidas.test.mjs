import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LLAVE_PARTIDAS, LLAVE_EN_CURSO, MAX_PARTIDAS,
  configurarAlmacen, guardarPartida, listarPartidas, partidasDeSemilla, mejorPartida,
  borrarPartida, borrarTodo, guardarEnCurso, cargarEnCurso, borrarEnCurso,
  exportarPartidasJson, importarPartidasJson,
} from '../web/static/partidas.js';

function almacenEnMemoria() {
  const mapa = new Map();
  return {
    mapa,
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => { mapa.set(k, String(v)); },
    removeItem: (k) => { mapa.delete(k); },
  };
}

let almacen;
beforeEach(() => {
  almacen = almacenEnMemoria();
  configurarAlmacen(almacen);
});

function partida(sobre = {}) {
  const fin = sobre.fin ?? '2026-11-22T10:00:00.000Z';
  return {
    jugador: 'Ana',
    semilla: 'K7Q2ZP',
    inicio: '2026-11-22T09:55:00.000Z',
    fin,
    duracionMs: 134500,
    completada: true,
    correctas: 10,
    total: 10,
    revisiones: 1,
    respuestas: [['A', null], ['B', 'C']],
    ...sobre,
  };
}

test('llaves del contrato', () => {
  assert.equal(LLAVE_PARTIDAS, 'crucigrama-ia:partidas');
  assert.equal(LLAVE_EN_CURSO, 'crucigrama-ia:en-curso');
  assert.equal(MAX_PARTIDAS, 200);
});

test('guardarPartida asigna id, persiste y conserva un id dado', () => {
  const guardada = guardarPartida(partida());
  assert.match(guardada.id, /^p-[0-9a-z]+-[0-9a-z]{6}$/);
  assert.equal(guardada.jugador, 'Ana');
  assert.equal(listarPartidas().length, 1);
  assert.ok(almacen.mapa.has(LLAVE_PARTIDAS), 'se escribió en el almacén inyectado');

  const otra = guardarPartida(partida({ id: 'p-fijo-abc123', jugador: 'Luis' }));
  assert.equal(otra.id, 'p-fijo-abc123');
  // reemplaza por id sin duplicar
  guardarPartida(partida({ id: 'p-fijo-abc123', jugador: 'Luis B' }));
  const lista = listarPartidas();
  assert.equal(lista.length, 2);
  assert.equal(lista.find((p) => p.id === 'p-fijo-abc123').jugador, 'Luis B');
});

test('listarPartidas ordena por fin descendente', () => {
  guardarPartida(partida({ id: 'a', fin: '2026-01-01T00:00:00.000Z' }));
  guardarPartida(partida({ id: 'c', fin: '2026-03-01T00:00:00.000Z' }));
  guardarPartida(partida({ id: 'b', fin: '2026-02-01T00:00:00.000Z' }));
  assert.deepEqual(listarPartidas().map((p) => p.id), ['c', 'b', 'a']);
});

test('límite de 200 partidas: se descartan las más antiguas por fin', () => {
  const base = Date.parse('2026-01-01T00:00:00.000Z');
  for (let i = 0; i < 205; i++) {
    guardarPartida(partida({ id: `p-${i}`, fin: new Date(base + i * 60000).toISOString() }));
  }
  const lista = listarPartidas();
  assert.equal(lista.length, 200);
  assert.equal(lista[0].id, 'p-204');
  assert.equal(lista[199].id, 'p-5');
  for (let i = 0; i < 5; i++) assert.ok(!lista.some((p) => p.id === `p-${i}`), `p-${i} fue descartada`);
});

test('partidasDeSemilla filtra sin distinguir mayúsculas', () => {
  guardarPartida(partida({ id: '1', semilla: 'AAA111' }));
  guardarPartida(partida({ id: '2', semilla: 'bbb222' }));
  guardarPartida(partida({ id: '3', semilla: 'AAA111' }));
  assert.deepEqual(partidasDeSemilla('aaa111').map((p) => p.id).sort(), ['1', '3']);
  assert.deepEqual(partidasDeSemilla('BBB222').map((p) => p.id), ['2']);
  assert.deepEqual(partidasDeSemilla('ZZZ'), []);
});

test('mejorPartida ignora las no completadas y acepta semilla opcional', () => {
  assert.equal(mejorPartida(), undefined);
  guardarPartida(partida({ id: 'rapida-incompleta', duracionMs: 1000, completada: false }));
  assert.equal(mejorPartida(), undefined);
  guardarPartida(partida({ id: 'lenta', duracionMs: 90000 }));
  guardarPartida(partida({ id: 'media', duracionMs: 60000 }));
  guardarPartida(partida({ id: 'otra-semilla', semilla: 'XYZ', duracionMs: 5000 }));
  assert.equal(mejorPartida().id, 'otra-semilla');
  assert.equal(mejorPartida('K7Q2ZP').id, 'media');
  assert.equal(mejorPartida('NOEXISTE'), undefined);
});

test('borrarPartida y borrarTodo', () => {
  guardarPartida(partida({ id: 'x' }));
  guardarPartida(partida({ id: 'y' }));
  assert.equal(borrarPartida('x'), true);
  assert.equal(borrarPartida('x'), false);
  assert.deepEqual(listarPartidas().map((p) => p.id), ['y']);
  borrarTodo();
  assert.deepEqual(listarPartidas(), []);
  assert.equal(almacen.mapa.has(LLAVE_PARTIDAS), false);
});

test('partida en curso: guardar, cargar y borrar', () => {
  assert.equal(cargarEnCurso(), null);
  const estado = { jugador: 'Ana', semilla: 'K7Q2ZP', inicio: '2026-11-22T09:55:00.000Z', transcurridoMs: 4200, respuestas: [['A', null]], revisiones: 0 };
  guardarEnCurso(estado);
  assert.deepEqual(cargarEnCurso(), estado);
  assert.ok(almacen.mapa.has(LLAVE_EN_CURSO));
  borrarEnCurso();
  assert.equal(cargarEnCurso(), null);
});

test('exportar e importar ida y vuelta, fusionando por id', () => {
  guardarPartida(partida({ id: 'e1', fin: '2026-02-01T00:00:00.000Z' }));
  guardarPartida(partida({ id: 'e2', fin: '2026-03-01T00:00:00.000Z', jugador: 'Luis' }));
  const texto = exportarPartidasJson();
  const datos = JSON.parse(texto);
  assert.equal(datos.version, 1);
  assert.ok(Number.isFinite(Date.parse(datos.exportado)));
  assert.equal(datos.partidas.length, 2);
  assert.equal(datos.partidas[0].id, 'e2');

  // almacén nuevo y vacío → importa todas
  configurarAlmacen(almacenEnMemoria());
  assert.equal(importarPartidasJson(texto), 2);
  assert.deepEqual(listarPartidas(), datos.partidas);

  // segunda importación no duplica
  assert.equal(importarPartidasJson(texto), 0);
  assert.equal(listarPartidas().length, 2);

  // una nueva junto a una ya conocida → solo importa la nueva
  const mixto = JSON.stringify({ version: 1, exportado: new Date().toISOString(), partidas: [datos.partidas[0], { ...datos.partidas[1], id: 'e3' }] });
  assert.equal(importarPartidasJson(mixto), 1);
  assert.equal(listarPartidas().length, 3);

  // también acepta un arreglo directo
  assert.equal(importarPartidasJson(JSON.stringify([{ ...datos.partidas[0], id: 'e4' }])), 1);
});

test('importar rechaza basura con Error en español', () => {
  assert.throws(() => importarPartidasJson('esto no es json'), { name: 'Error', message: /JSON/ });
  assert.throws(() => importarPartidasJson(''), Error);
  assert.throws(() => importarPartidasJson('{"hola":1}'), { message: /partidas/ });
  assert.throws(() => importarPartidasJson('42'), Error);
  // partida sin campos obligatorios
  assert.throws(() => importarPartidasJson(JSON.stringify({ partidas: [{ id: 'z' }] })), { message: /partida 1/i });
  // tipos incorrectos
  const mala = { ...partida({ id: 'm' }), duracionMs: 'rápido' };
  assert.throws(() => importarPartidasJson(JSON.stringify({ partidas: [mala] })), { message: /duracionMs/ });
  const otraMala = { ...partida({ id: 'n' }), completada: 'sí' };
  assert.throws(() => importarPartidasJson(JSON.stringify([otraMala])), { message: /completada/ });
  // nada se importó
  assert.deepEqual(listarPartidas(), []);
});

test('funciona en memoria si el almacén falla', () => {
  configurarAlmacen({
    getItem: () => { throw new Error('bloqueado'); },
    setItem: () => { throw new Error('bloqueado'); },
    removeItem: () => { throw new Error('bloqueado'); },
  });
  borrarTodo();
  const g = guardarPartida(partida({ id: 'mem' }));
  assert.equal(g.id, 'mem');
  assert.deepEqual(listarPartidas().map((p) => p.id), ['mem']);
  borrarTodo();
  assert.deepEqual(listarPartidas(), []);
});
