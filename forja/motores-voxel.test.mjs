// Pruebas del Infinite Voxel Engine (node --test). Todo lo determinista: semillas, chunks, mallas, física, rayos,
// persistencia delta, memoria acotada, catálogos de reglas, esquema y traductor. Lo visual va en motores/pruebas/voxel.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semillaDe, hashTexto, crearPRNG } from './web/motores/nucleo/semilla.js';
import { crearRuido } from './web/motores/nucleo/ruido.js';
import { crearGenerador, VERSION_GENERADOR } from './web/motores/voxel/generador.js';
import { mallar, volumenConBorde, triangulosIngenuos } from './web/motores/voxel/malla.js';
import { crearEjecutor } from './web/motores/voxel/ejecutor.js';
import { crearMundo } from './web/motores/voxel/mundo.js';
import { crearCuerpo, pasoCuerpo, dentroDelCuerpo } from './web/motores/voxel/fisica.js';
import { lanzarRayo } from './web/motores/voxel/rayo.js';
import { ID, T } from './web/motores/voxel/bloques.js';
import { BIOMAS } from './web/motores/voxel/biomas.js';
import { serializar, deserializar, guardarPartida, cargarPartida, almacenMemoria, migrar, codificarDeltas, decodificarDeltas, rle, unrle } from './web/motores/voxel/persistencia.js';
import { ESQUEMA, defecto } from './web/motores/voxel/config.js';
import { validar, leerConfig } from './web/motores/nucleo/esquema.js';
import { traducir } from './web/motores/voxel/agente.js';
import { crearSupervivencia } from './web/motores/voxel/supervivencia.js';
import { aEstrella } from './web/motores/voxel/criaturas.js';
import { lsistema, arbol } from './web/motores/voxel/arboles.js';

const VOXEL = ['mundo-voxel', 'supervivencia-voxel', 'creativo-voxel', 'aventura-voxel'];
const H = 128;
const igualBytes = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
// mundo de prueba en el mismo hilo (sin Workers): misma API y misma salida que con Workers
async function mundoListo(semilla = 1234, radio = 2, x = 0, z = 0, extra = {}) {
  const ej = crearEjecutor({ semilla, opciones: {}, forzarLocal: true });
  const mallas = [];
  const m = crearMundo({ ejecutor: ej, H, radio, alMalla: (c) => mallas.push(c.k), ...extra });
  assert.ok(await m.completar(x, z), 'el mundo terminó de cargar'); return { m, mallas, ej };
}

test('semillas: números, palabras, frases y azar; hash estable', () => {
  assert.equal(semillaDe(42), 42); assert.equal(semillaDe('42'), 42);
  assert.equal(semillaDe('ANDES-2026'), semillaDe('andes-2026')); assert.equal(semillaDe('un valle  con niebla'), semillaDe('Un valle con niebla'));
  assert.notEqual(semillaDe('ANDES-2026'), semillaDe('ANDES-2027'));
  assert.equal(hashTexto('ANDES-2026'), 3400458450, 'valor fijo: el mismo en cualquier máquina y versión de Node/navegador');
  const a = semillaDe('aleatoria'), b = semillaDe('aleatoria'); assert.ok(a > 0 && b > 0);
  const p = crearPRNG(7), q = crearPRNG(7); for (let i = 0; i < 1000; i++) assert.equal(p.u32(), q.u32());
  const r = crearRuido(99), r2 = crearRuido(99); for (let i = 0; i < 200; i++) assert.equal(r.s3(i * 0.37, -i * 0.11, i * 0.05), r2.s3(i * 0.37, -i * 0.11, i * 0.05));
});

test('determinismo: misma semilla, mismo chunk; otra semilla, otro chunk; versión del generador', () => {
  const g1 = crearGenerador(semillaDe('ANDES-2026')), g2 = crearGenerador(semillaDe('ANDES-2026')), g3 = crearGenerador(semillaDe('OTRA'));
  for (const [cx, cz] of [[0, 0], [5, -3], [-40, 17]]) assert.ok(igualBytes(g1.generarChunk(cx, cz).bloques, g2.generarChunk(cx, cz).bloques));
  assert.ok(!igualBytes(g1.generarChunk(3, 3).bloques, g3.generarChunk(3, 3).bloques));
  assert.ok(Number.isInteger(VERSION_GENERADOR) && VERSION_GENERADOR >= 1);
});

test('el orden de exploración no importa y regenerar no cambia el terreno', () => {
  const s = 777, a = crearGenerador(s), b = crearGenerador(s);
  const orden1 = [[0, 0], [1, 0], [0, 1], [-1, -1]], orden2 = [...orden1].reverse();
  const r1 = Object.fromEntries(orden1.map(([x, z]) => [x + ',' + z, a.generarChunk(x, z).bloques]));
  for (const [x, z] of orden2) assert.ok(igualBytes(b.generarChunk(x, z).bloques, r1[x + ',' + z]), `chunk ${x},${z}`);
  assert.ok(igualBytes(a.generarChunk(0, 0).bloques, r1['0,0']), 'regenerar da lo mismo');
});

test('continuidad entre chunks vecinos y coordenadas negativas', () => {
  const g = crearGenerador(4242);
  let saltos = 0, n = 0;
  for (const cx of [-3, -2, -1, 0, 1]) for (let z = -40; z < 40; z += 3) {
    const a = g.columna(cx * 16 + 15, z).h, b = g.columna(cx * 16 + 16, z).h; n++;
    if (Math.abs(a - b) > 6) saltos++;
  }
  assert.ok(saltos / n < 0.05, `saltos bruscos en bordes de chunk: ${saltos}/${n}`);
  // el bloque (x, y, z) es el mismo pidiendo el chunk que lo contiene, también con coordenadas negativas
  for (const [x, y, z] of [[-1, 40, -1], [-17, 30, 5], [-33, 45, -129], [15, 50, -16]]) {
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16), c = g.generarChunk(cx, cz);
    assert.equal(c.bloques[(x - cx * 16) + (z - cz * 16) * 16 + y * 256], g.bloqueEn(x, y, z));
  }
  // árboles y estructuras que cruzan el borde: el bloque del borde sale igual aunque se genere desde el otro lado
  const g2 = crearGenerador(4242);
  for (const [cx, cz] of [[-1, 0], [0, -1], [-2, -2]]) assert.ok(igualBytes(g.generarChunk(cx, cz).bloques, g2.generarChunk(cx, cz).bloques));
});

test('los 15 biomas existen y las transiciones son suaves (sin saltos de altura en la frontera)', () => {
  assert.equal(BIOMAS.length, 15);
  const g = crearGenerador(semillaDe('ANDES-2026')), vistos = new Set();
  // fronteras entre biomas de tierra (las costas y los cañones son abruptos a propósito)
  const agua = new Set(['oceano', 'playa', 'canon']);
  let fronteras = 0, bruscas = 0;
  for (let x = -6000; x < 6000; x += 41) for (let z = -6000; z < 6000; z += 41) {
    const a = g.columna(x, z), b = g.columna(x + 1, z); vistos.add(a.bioma.id);
    if (a.bioma.id !== b.bioma.id && !agua.has(a.bioma.id) && !agua.has(b.bioma.id)) { fronteras++; if (Math.abs(a.h - b.h) > 4) bruscas++; }
  }
  assert.equal(vistos.size, 15, `biomas vistos: ${[...vistos].join(', ')}`);
  assert.ok(fronteras > 50 && bruscas / fronteras < 0.05, `fronteras ${fronteras}, bruscas ${bruscas}`);
  // y el cambio de bioma no es una línea recta: el borde se deshilacha (ruido fino en el clima)
  let cambios = 0; for (let z = 0; z < 400; z++) { let antes = null; for (let x = 0; x < 400; x += 2) { const id = g.columna(x, z).bioma.id; if (antes && id !== antes) cambios++; antes = id; } }
  assert.ok(cambios > 0);
});

test('cuevas: hay túneles bajo tierra y casi no perforan la superficie', () => {
  const g = crearGenerador(31337);
  let aire = 0, total = 0, agujeros = 0, columnas = 0;
  for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) {
    const c = g.generarChunk(cx, cz);
    for (let i = 0; i < 256; i++) {
      const top = c.alturas[i]; if (top <= g.MAR + 2) continue; columnas++;
      for (let y = 8; y < top - 8; y++) { total++; if (c.bloques[i + y * 256] === 0) aire++; }
      if (c.bloques[i + (top - 1) * 256] === 0 && c.bloques[i + (top - 2) * 256] === 0) agujeros++;
    }
  }
  assert.ok(aire / total > 0.01, `fracción de cueva ${(aire / total).toFixed(4)}`);
  assert.ok(agujeros / columnas < 0.03, `agujeros en superficie ${agujeros}/${columnas}`);
  const sin = crearGenerador(31337, { cuevas: 0, cavernas: 0 }), c = sin.generarChunk(0, 0);
  let huecos = 0; for (let i = 0; i < 256; i++) for (let y = 8; y < c.alturas[i] - 8; y++) if (!c.bloques[i + y * 256]) huecos++;
  assert.equal(huecos, 0, 'con cuevas en 0 no hay huecos');
});

test('minerales según profundidad: el oro y los cristales solo aparecen hondo', () => {
  const g = crearGenerador(5, { minerales: 3 });
  let oro = 0, oroAlto = 0, carbon = 0;
  for (let cx = 0; cx < 4; cx++) { const c = g.generarChunk(cx, 0); for (let i = 0; i < c.bloques.length; i++) { const y = (i / 256) | 0; if (c.bloques[i] === ID.oro) { oro++; if (y >= 26) oroAlto++; } if (c.bloques[i] === ID.carbon) carbon++; } }
  assert.ok(carbon > 0 && oro > 0 && oroAlto === 0, `carbón ${carbon}, oro ${oro}, oro alto ${oroAlto}`);
});

test('L-system y árboles deterministas', () => {
  assert.equal(lsistema('A', { A: 'AB', B: 'A' }, 4), 'ABAABABA');
  assert.deepEqual(arbol('roble', 12345), arbol('roble', 12345));
  assert.ok(arbol('pino', 99).length > 20);
});

test('greedy meshing: menos triángulos que el ingenuo y geometría válida', () => {
  const g = crearGenerador(12345), ch = {};
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) ch[x + ',' + z] = g.generarChunk(x, z).bloques;
  const vec = []; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) vec.push(ch[dx + ',' + dz]);
  const vol = volumenConBorde(ch['0,0'], vec, H), m = mallar(vol, H), ing = triangulosIngenuos(vol, H), sinAO = mallar(vol, H, { ao: false });
  assert.ok(m.tris < ing * 0.8, `greedy ${m.tris} vs ingenuo ${ing}`);
  assert.ok(sinAO.tris <= m.tris, 'sin AO se funden más caras');
  for (const gg of [m.opaco, m.transp]) { assert.equal(gg.idx.length, gg.nt * 3); for (let i = 0; i < gg.idx.length; i++) assert.ok(gg.idx[i] < gg.nv); for (const v of gg.pos) assert.ok(Number.isFinite(v)); }
  // un cubo solo en el aire: 6 caras = 12 triángulos, con normales hacia afuera (antihorario visto desde fuera)
  const v1 = new Uint8Array(18 * 18 * 16); v1[(8 + 1) + (8 + 1) * 18 + 8 * 324] = ID.piedra;
  const c1 = mallar(v1, 16); assert.equal(c1.tris, 12);
  const N = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]], P = c1.opaco.pos, I = c1.opaco.idx, F = c1.opaco.nor;
  for (let t = 0; t < c1.opaco.nt; t++) {
    const [a, b, c] = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]], p = (k) => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], [A, B, C] = [p(a), p(b), p(c)];
    const u = B.map((x, i) => x - A[i]), w = C.map((x, i) => x - A[i]), n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const esperada = N[F[a * 3]]; assert.ok(n[0] * esperada[0] + n[1] * esperada[1] + n[2] * esperada[2] > 0, `triángulo ${t} mira hacia adentro`);
  }
});

test('chunk manager: carga, prioridad, descarga y memoria acotada en exploración prolongada', async () => {
  const quitados = [];
  const { m } = await mundoListo(99, 2, 0, 0, { cacheMax: 40, alQuitar: (c) => quitados.push(c.k) });
  const radio = 2, tope = (2 * (radio + 2) + 1) ** 2;
  for (let x = 0; x <= 2400; x += 48) { await m.completar(x, -x * 0.5); assert.ok(m.chunks.size <= tope, `chunks cargados ${m.chunks.size} > ${tope}`); assert.ok(m.cache.size <= 40); }
  assert.ok(quitados.length > 100, 'se descargan los lejanos');
  assert.ok(m.stats.generados > 200 && m.pendientes === 0);
});

test('destruir y colocar: delta guardado, malla parcial (solo el chunk y su vecino de borde)', async () => {
  const { m, mallas } = await mundoListo(2024, 2);
  const x = 5, z = 6; let y = H - 1; while (y > 0 && !m.bloque(x, y, z)) y--;
  mallas.length = 0;
  assert.equal(m.poner(x, y, z, 0), m.chunk(0, 0).crudo.bloques[x + z * 16 + y * 256]);
  await m.completar(0, 0);
  assert.equal(m.bloque(x, y, z), 0);
  assert.deepEqual([...new Set(mallas)], ['0,0'], 'un bloque interior rehace solo su chunk');
  mallas.length = 0; m.poner(15, y + 1, 15, ID.ladrillos); await m.completar(0, 0);
  assert.deepEqual([...new Set(mallas)].sort(), ['0,0', '0,1', '1,0', '1,1'].sort(), 'la esquina rehace sus vecinos (también la diagonal, por el AO)');
  const d = m.exportarDeltas(); assert.equal(Object.keys(d).length, 1); assert.equal(d['0,0'].length, 2);
  // volver a poner el bloque original borra el delta
  m.poner(15, y + 1, 15, m.chunk(0, 0).crudo.bloques[15 + 15 * 16 + (y + 1) * 256]);
  assert.equal(m.exportarDeltas()['0,0'].length, 1);
});

test('persistencia delta: binario comprimido, guardar y recuperar, migración de formato', async () => {
  const { m } = await mundoListo(55, 2);
  for (let i = 0; i < 300; i++) m.poner(i % 16, 70 + (i >> 8), (i >> 4) % 16, ID.vidrio);
  m.poner(-3, 60, -7, ID.oro);
  const deltas = m.exportarDeltas();
  assert.deepEqual(decodificarDeltas(codificarDeltas(deltas)), deltas);
  const b = new Uint8Array([1, 1, 1, 2, 3, 3, 3, 3, 0]); assert.deepEqual([...unrle(rle(b))], [...b]);
  const almacen = almacenMemoria(), estado = { semilla: 55, semillaTexto: '55', plantilla: 'mundo-voxel', jugador: { x: 1.5, y: 70, z: -2.5, yaw: 1 }, inventario: { inv: [{ it: 'piedra', n: 5 }] }, entidades: [], juego: { hora: 0.4 } };
  const o = await guardarPartida(almacen, 'p1', estado, deltas);
  assert.ok(o.deltas.length < 2000, `partida compacta: ${o.deltas.length} caracteres para ${o.cambios} cambios`);
  assert.ok(!('bloques' in o) && JSON.stringify(o).length < 4000, 'no se guarda el mundo generado');
  const r = await cargarPartida(almacen, 'p1');
  assert.deepEqual(r.deltas, deltas); assert.equal(r.jugador.z, -2.5); assert.equal(r.generador, VERSION_GENERADOR); assert.equal(r.avisoVersion, null);
  // recuperar en un mundo nuevo: los cambios vuelven, el resto se regenera igual
  const { m: m2 } = await mundoListo(55, 2); m2.importarDeltas(r.deltas); await m2.completar(0, 0);
  assert.equal(m2.bloque(-3, 60, -7), ID.oro); assert.equal(m2.bloque(3, 70, 3), ID.vidrio);
  // formato 1 (JSON plano) → 2
  const viejo = migrar({ formato: 1, semilla: 9, bloques: { '0,0': [[10, 3], [11, 4]] } });
  assert.equal(viejo.formato, 2); const dv = await deserializar(viejo); assert.deepEqual(dv.deltas['0,0'].map(([i, id]) => [i, id]), [[10, 3], [11, 4]]);
  assert.match((await deserializar({ ...o, generador: 1 })).avisoVersion, /v1/);
});

test('física: gravedad, suelo, paredes, sin atravesar a alta velocidad, agua y caída controlada', () => {
  const blo = new Map(), k = (x, y, z) => `${x},${y},${z}`;
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) blo.set(k(x, 10, z), ID.piedra);
  for (let y = 11; y <= 14; y++) for (let z = -10; z <= 10; z++) blo.set(k(4, y, z), ID.piedra);   // pared en x = 4
  const mundo = { bloque: (x, y, z) => blo.get(k(x, y, z)) ?? 0 };
  const c = crearCuerpo(0.5, 15, 0.5);
  for (let i = 0; i < 120; i++) pasoCuerpo(c, 1 / 60, { x: 0, z: 0 }, mundo);
  assert.ok(Math.abs(c.y - 11) < 1e-6 && c.enSuelo, `aterriza en y=11 (está en ${c.y})`);
  for (let i = 0; i < 240; i++) pasoCuerpo(c, 1 / 60, { x: 1, z: 0, carrera: true }, mundo);
  assert.ok(c.x <= 4 - 0.3 + 1e-6, `no atraviesa la pared (x=${c.x})`);
  const r = crearCuerpo(0.5, 11, 0.5); r.vx = 400;   // bala: 400 bloques/s
  pasoCuerpo(r, 1 / 60, { x: 0, z: 0 }, mundo); assert.ok(r.x < 4, `a alta velocidad tampoco (x=${r.x})`);
  // agacharse en el borde: no se cae
  const b2 = crearCuerpo(10.2, 11, 0.5); for (let i = 0; i < 120; i++) pasoCuerpo(b2, 1 / 60, { x: 1, z: 0, agachar: true }, mundo);
  assert.ok(b2.x <= 11.3 + 1e-6 && b2.y === 11, `caída controlada: el borde del cuerpo no pasa del borde del bloque (x=${b2.x}, y=${b2.y})`);
  // agua: se hunde despacio y flota con salto
  const agua = { bloque: (x, y, z) => (y < 20 ? ID.agua : 0) }, n = crearCuerpo(0, 15, 0);
  for (let i = 0; i < 60; i++) pasoCuerpo(n, 1 / 60, { x: 0, z: 0 }, agua);
  assert.ok(n.enAgua && n.y > 11, `en el agua cae lento (sin agua habría caído ~14 bloques; y=${n.y.toFixed(2)})`);
  for (let i = 0; i < 120; i++) pasoCuerpo(n, 1 / 60, { x: 0, z: 0, salto: true }, agua); assert.ok(n.y > 15, 'nadando sube');
  assert.ok(dentroDelCuerpo(c, Math.floor(c.x), 11, Math.floor(c.z)) && !dentroDelCuerpo(c, Math.floor(c.x), 13, Math.floor(c.z)));
});

test('rayo DDA: primer bloque, cara y coordenadas negativas', () => {
  const m = (x, y, z) => (x === -5 && y === 3 && z === -2 ? ID.piedra : 0);
  const r = lanzarRayo(m, -1.5, 3.5, -0.5, -1, 0, 0, 10);
  assert.equal(r, null, 'no lo toca si pasa al lado');
  const r2 = lanzarRayo(m, -0.5, 3.5, -1.5, -1, 0, -0.1, 10); assert.ok(r2 && r2.x === -5 && r2.nx === 1, JSON.stringify(r2));
  assert.equal(lanzarRayo(m, 0.5, 3.5, -1.5, -1, 0, 0, 3), null, 'respeta la distancia máxima');
});

test('A* de criaturas: rodea un muro y se limita a la región', () => {
  const blo = (x, y, z) => (y === 9 ? ID.piedra : y >= 10 && y <= 11 && x === 3 && z > -6 && z < 6 ? ID.piedra : 0);
  const r = aEstrella({ bloque: blo }, [0, 10, 0], [6, 10, 0]); assert.ok(r.ruta && r.ruta.length > 7, `ruta ${r.ruta?.length}`);
  assert.ok(!r.ruta.some(([x, , z]) => x === 3 && z > -6 && z < 6), 'no cruza el muro');
  assert.equal(aEstrella({ bloque: blo }, [0, 10, 0], [200, 10, 0], { radio: 20 }).ruta, null);
});

test('supervivencia: inventario, fabricar, herramientas por nivel, misiones', () => {
  const cfg = defecto('supervivencia-voxel'), s = crearSupervivencia(cfg); s.inicial('vacio');
  s.meter('madera', 2); const r = { sale: ['tablas', 4], usa: { madera: 1 } };
  assert.ok(s.fabricar(r, new Set())); assert.equal(s.cuantos('tablas'), 4);
  assert.equal(s.minado(ID.hierro).suelta, false, 'el hierro sin pico de piedra no suelta nada');
  s.inv[0] = { it: 'pico_piedra', n: 1, dur: 130 }; s.mano = 0; assert.equal(s.minado(ID.hierro).suelta, true);
  assert.ok(s.minado(ID.piedra).segundos < crearSupervivencia(cfg).minado(ID.piedra).segundos, 'el pico acelera');
  s.prepararMisiones(); assert.ok(s.misiones.length >= 3);
  s.meter('madera', 6); assert.ok(s.revisarMisiones({ mar: 48, maxAltura: 0, minAltura: 0, distancia: 0, maxPuesto: 0 }).some((m) => m.id === 'madera'));
});

test('catálogos de reglas voxel: contrato, ≥ 300 reglas y cada clave leída en su plantilla', async () => {
  const { catalogoDe, revisar } = await import('./web/motor/juegos/index.js');
  for (const id of VOXEL) {
    const { reglas, ficha } = await catalogoDe(id);
    assert.ok(ficha && ficha.objetivo && ficha.gana, `${id}: ficha`);
    assert.deepEqual(revisar(reglas), [], `${id}: catálogo con errores`);
    assert.ok(reglas.length >= 300, `${id}: ${reglas.length} reglas`);
    const src = fs.readFileSync(new URL(`./web/plantillas/${id}.js`, import.meta.url), 'utf8');
    for (const k of new Set(reglas.map((r) => r.clave))) assert.ok(src.includes(`'${k}'`), `${id}: la plantilla no lee '${k}'`);
    // cada valor de cada regla es válido para el esquema del motor (la regla cambia la configuración de verdad)
    const base = defecto(id);
    for (const r of reglas) {
      const c = structuredClone(base), p = r.clave.split('.'); let a = c; for (let i = 0; i < p.length - 1; i++) a = a[p[i]]; a[p[p.length - 1]] = r.valor;
      assert.deepEqual(validar(c, ESQUEMA), [], `${id}: ${r.id} da una configuración inválida`);
    }
  }
});

test('las rutas de configuración que fijan las reglas existen en el motor', () => {
  const fuentes = fs.readdirSync(new URL('./web/motores/voxel/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(new URL(`./web/motores/voxel/${f}`, import.meta.url), 'utf8')).join('\n');
  const c = defecto('mundo-voxel'), hojas = [];
  const rec = (o, p) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object' && !Array.isArray(v)) rec(v, p + k + '.'); else hojas.push(p + k); } };
  rec(c, '');
  for (const h of hojas) {
    if (h === 'version') continue;
    const [g, k] = h.includes('.') ? h.split('.') : [null, h];
    const usado = g === 'mundo' || g === 'estructuras' ? true /* van enteros al generador (opcionesGenerador) */ : new RegExp(`\\.${k}\\b`).test(fuentes);
    assert.ok(usado, `nadie lee config.${h}`);
  }
  const gen = fs.readFileSync(new URL('./web/motores/voxel/generador.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('./web/motores/voxel/estructuras.js', import.meta.url), 'utf8');
  for (const k of Object.keys(c.mundo)) if (!['altura', 'mar', 'biomas', 'borde'].includes(k)) assert.ok(new RegExp(`o\\.${k}\\b|opciones\\.${k}\\b`).test(gen), `el generador no usa mundo.${k}`);
});

test('esquema: rechaza código, claves prohibidas y valores fuera de rango', () => {
  for (const id of VOXEL) assert.deepEqual(validar(defecto(id), ESQUEMA), [], id);
  const c = defecto('mundo-voxel');
  assert.ok(validar({ ...c, mundo: { ...c.mundo, relieve: 99 } }, ESQUEMA).length);
  assert.ok(validar({ ...c, jugador: { ...c.jugador, camara: 'cenital' } }, ESQUEMA).length);
  assert.ok(validar({ ...c, alAtacar: () => 1 }, ESQUEMA).length, 'una función no entra');
  assert.ok(!leerConfig('{"__proto__": {"x": 1}, "semilla": "A"}', ESQUEMA).ok, '__proto__ prohibido');
  assert.ok(!leerConfig('{"semilla": "A", "codigo": "alert(1)"}', ESQUEMA).ok, 'clave desconocida');
  assert.ok(!leerConfig('no es json', ESQUEMA).ok);
});

test('agente: «mundo voxel con semilla ANDES-2026, montañas elevadas, lagos, bosques, cuevas y aldeas»', () => {
  const texto = 'Crea un mundo voxel infinito con semilla ANDES-2026, montañas elevadas, lagos, bosques, cuevas y aldeas.';
  const norm = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const r = traducir(norm, defecto('mundo-voxel'), 'mundo-voxel', texto);
  assert.equal(r.config.semilla, 'ANDES-2026');
  assert.ok(r.config.mundo.montanas > 1.5 && r.config.mundo.lagos > 1 && r.config.mundo.cuevas > 1 && r.config.estructuras.aldea > 1 && r.config.mundo.vegetacion > 1);
  assert.deepEqual(validar(r.config, ESQUEMA), []);
  assert.ok(r.entendido.length >= 6, r.entendido.join(', '));
});

test('las plantillas voxel solo importan por el importmap y los Workers por URL relativa', () => {
  for (const id of VOXEL) {
    const src = fs.readFileSync(new URL(`./web/plantillas/${id}.js`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/from\s+'([^']+)'/g)) assert.ok(m[1].startsWith('motores/') || m[1] === 'animejs', `${id}: ${m[1]}`);
  }
  const ej = fs.readFileSync(new URL('./web/motores/voxel/ejecutor.js', import.meta.url), 'utf8');
  assert.match(ej, /new Worker\(new URL\('\.\/trabajador\.js', import\.meta\.url\), \{ type: 'module' \}\)/);
  const tr = fs.readFileSync(new URL('./web/motores/voxel/trabajador.js', import.meta.url), 'utf8');
  for (const m of tr.matchAll(/from\s+'([^']+)'/g)) assert.ok(m[1].startsWith('./') || m[1].startsWith('../'), 'el Worker no ve el importmap');
});
