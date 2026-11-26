// Pruebas del Anime Battle Engine (§35) y de la integración con Forja.  cd forja && node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearCombate } from './web/motores/anime/combate.js';
import { PERSONAJES, CINEMATICAS } from './web/motores/anime/personajes.js';
import { ESTADOS, NOMBRES, permitida } from './web/motores/anime/estados.js';
import { crearBuffer, parsearComando, cumple } from './web/motores/anime/buffer.js';
import { barrido } from './web/motores/anime/fisica.js';
import { crearIA } from './web/motores/anime/ia.js';
import { crearDirector } from './web/motores/anime/director.js';
import { crearPartida, MODOS } from './web/motores/anime/modos.js';
import { crearJefe, JEFES } from './web/motores/anime/jefe.js';
import { poseDe, POSES } from './web/motores/anime/esqueleto.js';
import { ESQUEMA, defecto, personajesCon } from './web/motores/anime/config.js';
import { traducir } from './web/motores/anime/agente.js';
import { crearBucle } from './web/motores/nucleo/bucle.js';
import { validar, leerConfig } from './web/motores/nucleo/esquema.js';
import { semillaDe, crearPRNG, hashTexto } from './web/motores/nucleo/semilla.js';
import { importsDe, dependencias } from './web/motores/forja/proyecto.js';

const E = (o = {}) => ({ x: o.x || 0, y: o.y || 0, recien: new Set(o.r || []), abajo: new Set([...(o.a || []), ...(o.r || [])]) });
const duelo = (extra = {}) => crearCombate({ luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -25 }, { def: PERSONAJES.mako, eq: 1, x: 40 }], ...extra });
function correr(c, guion, n, otro = () => E()) { const ev = []; for (let f = 0; f < n; f++) ev.push(...c.paso([guion(f), otro(f)]).map((e) => ({ ...e }))); return ev; }
const golpes = (ev) => ev.filter((e) => e.tipo === 'golpe');

test('los 27 estados de la especificación existen y cada transición automática está en la tabla', () => {
  assert.equal(Object.keys(ESTADOS).length, 27);
  for (const n of ['Idle', 'Walk', 'Run', 'Dash', 'Jump', 'Fall', 'Landing', 'Crouch', 'AttackLight', 'AttackMedium', 'AttackHeavy', 'AirAttack', 'Combo', 'Block', 'Parry', 'Dodge', 'Charge', 'SpecialAttack', 'UltimateAttack', 'Transformation', 'HitStun', 'BlockStun', 'Knockback', 'Knockdown', 'Recovery', 'Victory', 'Defeat'])
    assert.ok(Object.values(NOMBRES).includes(n), n);
  for (const [k, e] of Object.entries(ESTADOS)) for (const a of e.a) assert.ok(ESTADOS[a], `${k} → ${a}`);
  assert.ok(!permitida('derribado', 'ataqueLigero') && !permitida('victoria', 'derrota') && permitida('reposo', 'aturdido', true));
});

test('colisiones coherentes: lejos no hay golpe; cerca el ligero conecta una sola vez', () => {
  let c = duelo({ luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -400 }, { def: PERSONAJES.mako, eq: 1, x: 400 }] });
  assert.equal(golpes(correr(c, (f) => (f === 2 ? E({ r: ['ligero'] }) : E()), 40)).length, 0);
  c = duelo(); const ev = correr(c, (f) => (f === 2 ? E({ r: ['ligero'] }) : E()), 40);
  const g = golpes(ev); assert.equal(g.length, 1, 'un golpe ligero = un impacto aunque dure 3 cuadros activos');
  assert.equal(c.luchadores[1].vida, c.luchadores[1].vidaMax - g[0].dano);
});

test('hitboxes sincronizadas con la pose: la caja solo existe en los cuadros activos y la pose está extendida justo ahí', () => {
  const c = duelo({ luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -400 }, { def: PERSONAJES.mako, eq: 1, x: 400 }] }), L = c.luchadores[0], m = PERSONAJES.ren.movimientos.fuerte;
  c.paso([E({ r: ['fuerte'] }), E()]);
  const vistos = [];
  for (let f = 0; f < 40 && L.mov; f++) { vistos.push([L.movF, !!c.hitbox(L), poseDe(L, 0).hC]); c.paso([E(), E()]); }
  for (const [k, caja, brazo] of vistos) {
    const activo = k >= m.arranque && k < m.arranque + m.activo;
    assert.equal(caja, activo, `cuadro ${k}`);
    if (activo) assert.equal(brazo, POSES.fuerte[1].hC ?? POSES.guardia.hC, 'pose de golpe en los cuadros activos');
  }
});

test('combos reproducibles y con escalado: la misma entrada da el mismo resultado', () => {
  const guion = (f) => (f === 2 ? E({ r: ['ligero'] }) : f === 10 ? E({ r: ['ligero'] }) : f === 19 ? E({ r: ['fuerte'] }) : E());
  const a = duelo(), b = duelo(); const ea = correr(a, guion, 90), eb = correr(b, guion, 90);
  assert.equal(a.instantanea(), b.instantanea());
  const g = golpes(ea); assert.equal(g.length, 3, 'ligero → ligero → fuerte'); assert.deepEqual(g.map((x) => x.combo), [1, 2, 3]);
  assert.equal(JSON.stringify(golpes(ea)), JSON.stringify(golpes(eb)));
  // escalado: el 3.er golpe rinde menos que el mismo golpe suelto
  const solo = duelo(); const g1 = golpes(correr(solo, (f) => (f === 2 ? E({ r: ['fuerte'] }) : E()), 60))[0];
  assert.ok(g[2].dano < g1.dano, `${g[2].dano} < ${g1.dano}`);
});

test('cancelación: con contacto se cancela dentro de la ventana; si falla, no', () => {
  const c = duelo(); const ev = correr(c, (f) => (f === 2 ? E({ r: ['ligero'] }) : f === 9 ? E({ r: ['fuerte'] }) : E()), 60);
  assert.ok(ev.some((e) => e.tipo === 'estado' && e.estado === 'combo' && e.id === 1), 'pasó a Combo');
  const lejos = duelo({ luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -400 }, { def: PERSONAJES.mako, eq: 1, x: 400 }] });
  const ev2 = correr(lejos, (f) => (f === 2 ? E({ r: ['ligero'] }) : f === 9 ? E({ r: ['fuerte'] }) : E()), 60);
  assert.ok(!ev2.some((e) => e.tipo === 'estado' && e.estado === 'combo'), 'sin contacto no hay cancelación');
  // recovery cancel con energía
  const r = duelo({ reglas: { energiaInicial: 50 } }); const ev3 = correr(r, (f) => (f === 2 ? E({ r: ['fuerte'] }) : f === 32 ? E({ r: ['esquiva'] }) : E()), 50);
  assert.ok(ev3.some((e) => e.tipo === 'cancelRecuperacion')); assert.equal(r.luchadores[0].energia < 50, true);
});

test('sin daño duplicado: multigolpe respeta su número de golpes y un proyectil no pega dos veces', () => {
  const c = duelo({ reglas: { energiaInicial: 100 }, luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -300 }, { def: PERSONAJES.mako, eq: 1, x: 200 }] });
  const ev = correr(c, (f) => (f < 45 ? E({ a: ['carga'] }) : f === 45 ? E({ r: ['especial'], a: ['carga'] }) : E()), 120);
  const g = golpes(ev).filter((e) => e.mov === 'cargado'); assert.ok(g.length >= 1 && g.length <= PERSONAJES.ren.movimientos.cargado.golpes, `rayo cargado: ${g.length} golpes`);
  const p = duelo({ reglas: { energiaInicial: 100 }, luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -300 }, { def: PERSONAJES.mako, eq: 1, x: 200 }] });
  const evp = correr(p, (f) => [E({ y: 1 }), E({ y: 1, x: 1 }), E({ x: 1, r: ['especial'] })][f] || E(), 140);
  assert.equal(golpes(evp).filter((e) => e.mov === 'especial').length, 1);
});

test('límites del escenario: nadie sale por más empujones que reciba', () => {
  const c = duelo({ reglas: { danoMul: 0.05 }, luchadores: [{ def: PERSONAJES.ren, eq: 0, x: 500 }, { def: PERSONAJES.mako, eq: 1, x: 600 }] });
  const ia = crearIA(c.luchadores[1], c, { nivel: 'experto', semilla: 3 });
  for (let f = 0; f < 3000; f++) { c.paso([E({ x: 1, r: f % 9 ? [] : ['fuerte'] }), ia.entrada()]); for (const L of c.luchadores) { assert.ok(L.x - L.ancho / 2 >= c.limites.izq - 1e-6 && L.x + L.ancho / 2 <= c.limites.der + 1e-6, `x=${L.x}`); assert.ok(L.y >= 0); } }
});

test('estados válidos y CPU: CPU contra CPU 6000 cuadros sin transiciones inválidas, con bloqueos, golpes y final', () => {
  const c = duelo({ semilla: 11 }); const a = crearIA(c.luchadores[0], c, { nivel: 'experto', semilla: 1 }), b = crearIA(c.luchadores[1], c, { nivel: 'avanzado', semilla: 2 });
  const t = {};
  for (let f = 0; f < 6000 && !c.terminado; f++) { const ev = c.paso([a.entrada(), b.entrada()]); a.observar(ev); b.observar(ev); for (const e of ev) t[e.tipo] = (t[e.tipo] || 0) + 1; for (const L of c.luchadores) assert.ok(ESTADOS[L.estado], L.estado); }
  assert.equal(c.transicionesRechazadas, 0); assert.ok(t.golpe > 10, 'hubo pelea'); assert.ok((t.bloqueo || 0) + (t.parada || 0) > 0, 'la CPU se defiende');
  assert.ok(c.terminado, 'alguien ganó o se acabó el tiempo');
});

test('la CPU percibe con retraso humano y se adapta: experta bloquea más que principiante', () => {
  const bloqueos = (nivel) => { const c = duelo({ semilla: 4, reglas: { danoMul: 0.01, tiempoRonda: 999 } }); const ia = crearIA(c.luchadores[1], c, { nivel, semilla: 9 }); let n = 0;
    for (let f = 0; f < 2400; f++) { const ev = c.paso([E({ x: c.luchadores[0].x < c.luchadores[1].x - 60 ? 1 : 0, r: f % 40 === 0 ? ['medio'] : [] }), ia.entrada()]); ia.observar(ev); n += ev.filter((e) => e.tipo === 'bloqueo' && e.id === 2).length; if (c.terminado) break; } return n; };
  const p = bloqueos('principiante'), x = bloqueos('experto'); assert.ok(x > p, `experto ${x} > principiante ${p}`);
  // adaptación: si el jugador abusa del salto, sube su tendencia
  const c = duelo(); const ia = crearIA(c.luchadores[1], c, { nivel: 'experto' });
  for (let f = 0; f < 600; f++) { const ev = c.paso([E({ r: f % 30 === 0 ? ['salto'] : [] }), E()]); ia.observar(ev); }
  assert.ok(ia.patrones.salto > 3);
});

test('victoria, derrota y desempate', () => {
  const c = duelo({ reglas: { danoMul: 30 } }); correr(c, (f) => (f % 30 === 2 ? E({ r: ['fuerte'] }) : E()), 600);
  assert.equal(c.terminado?.ganador, 0); assert.equal(c.luchadores[0].estado, 'victoria'); assert.equal(c.luchadores[1].estado, 'derrota');
  const t = duelo({ reglas: { tiempoRonda: 2, desempate: 'empate' }, luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -400 }, { def: PERSONAJES.mako, eq: 1, x: 400 }] }); correr(t, () => E(), 200);
  assert.deepEqual([t.terminado?.motivo, t.terminado?.ganador], ['tiempo', null]);
});

test('independencia del framerate: 30, 60, 144 Hz y cuadros irregulares dan la misma simulación', () => {
  const sim = (msPorCuadro) => {
    const c = duelo({ semilla: 5 }); const ia = crearIA(c.luchadores[1], c, { nivel: 'avanzado', semilla: 5 });
    const guion = (k) => E({ x: k % 50 < 25 ? 1 : 0, r: k % 23 === 0 ? ['ligero'] : k % 37 === 0 ? ['fuerte'] : [] });
    let t = 0; const b = crearBucle({ actualizar: (dt, k) => { if (k < 1200) c.paso([guion(k), ia.entrada()]); }, ahora: () => 0 });
    b.tick(0); let i = 0; while (b.pasos < 1200) { t += typeof msPorCuadro === 'function' ? msPorCuadro(i++) : msPorCuadro; b.tick(t); }
    return c.instantanea();
  };
  const ref = sim(1000 / 60);
  assert.equal(sim(1000 / 30), ref); assert.equal(sim(1000 / 144), ref); assert.equal(sim((i) => [5, 33, 12, 17, 40, 8][i % 6]), ref);
});

test('definitivo con cinemática: omitir, pausar o cámara lenta dan los mismos impactos y el mismo daño (sin duplicar)', () => {
  const preparar = () => {
    const c = duelo({ reglas: { energiaInicial: 100 } }); const d = crearDirector(c, { cinematicas: CINEMATICAS });
    for (let f = 0; f < 40 && !c.cinematica; f++) { const ev = c.paso([f === 1 ? E({ r: ['definitivo'] }) : E(), E()]); for (const e of ev) if (e.tipo === 'cinematica') d.iniciar(e.id, { atacante: c.buscar(e.atacante), objetivo: c.buscar(e.objetivo) }); }
    assert.ok(d.activa, 'arrancó la cinemática'); return { c, d };
  };
  const impactos = (c) => c.eventos;
  const registro = (c, d, avanzar) => { const ev = []; let n = 0; while (d.activa && n++ < 5000) { ev.push(...avanzar(d).filter((e) => e.tipo === 'impacto').map((e) => e.golpe)); c.paso([]); } return { golpes: ev, vida: c.luchadores[1].vida, cine: c.cinematica }; };
  const { c: c1, d: d1 } = preparar(); const normal = registro(c1, d1, (d) => d.avanzar(1000 / 60));
  const { c: c2, d: d2 } = preparar(); d2.avanzar(500); const omitida = { golpes: d2.omitir().filter((e) => e.tipo === 'impacto').map((e) => e.golpe), vida: c2.luchadores[1].vida };
  const { c: c3, d: d3 } = preparar(); const lenta = registro(c3, d3, (d) => d.avanzar(1000 / 60 * 0.25));
  const { c: c4, d: d4 } = preparar(); let k = 0; const pausada = registro(c4, d4, (d) => (k++ % 3 ? d.avanzar(0) : d.avanzar(1000 / 60)));
  const total = PERSONAJES.ren.movimientos.definitivo.golpesCine.length;
  assert.deepEqual(normal.golpes, [...Array(total).keys()]);
  for (const r of [omitida, lenta, pausada]) assert.equal(r.vida, normal.vida, 'mismo daño');
  assert.deepEqual([...new Set([...d2.actual ? [] : [], ...omitida.golpes])].sort(), omitida.golpes.slice(0, 3).concat(omitida.golpes.slice(3)).sort());
  assert.equal(c1.impactoCinematica(0), false, 'un impacto ya aplicado no se vuelve a aplicar'); assert.equal(c1.cinematica, null);
  void impactos;
  // sin cinemáticas: el mismo daño al instante
  const s = duelo({ reglas: { energiaInicial: 100, cinematicas: false } }); correr(s, (f) => (f === 1 ? E({ r: ['definitivo'] }) : E()), 40);
  assert.equal(s.luchadores[1].vida, normal.vida);
});

test('jefe: avisa antes de golpear, cambia de fase y su núcleo expuesto recibe más daño', () => {
  const c = crearCombate({ luchadores: [{ def: PERSONAJES.ren, eq: 0, x: -300 }], escenario: { limites: { izq: -620, der: 620 } } });
  const J = crearJefe(c, JEFES.gaiaron, { x: 430 }); J.despertar();
  let primerAviso = null, primerGolpe = null;
  for (let f = 0; f < 1500; f++) { const ev = c.paso([E()]); for (const e of ev) { if (e.tipo === 'jefeAviso' && primerAviso == null) primerAviso = c.cuadro; if (e.tipo === 'golpe' && e.de === J.id && primerGolpe == null) primerGolpe = c.cuadro; } if (J.ataque && J.t < J.ataque.avisoF) assert.equal(J.hitboxes().length, 0, 'durante el aviso no hay hitbox'); }
  assert.ok(primerAviso != null && (primerGolpe == null || primerGolpe - primerAviso >= 20), `aviso ${primerAviso}, golpe ${primerGolpe}`);
  J.vida = Math.round(J.vidaMax * 0.55); c.paso([E()]); assert.equal(J.fase, 1);
  J.agotado = 100; const n = J.hurtboxes().find((h) => h.zona === 'nucleo'); assert.ok(n.mul > 1.5);
  assert.equal(c.transicionesRechazadas, 0);
});

test('todos los modos corren con CPU sin errores ni transiciones inválidas', () => {
  for (const modo of Object.keys(MODOS)) {
    const p = crearPartida({ modo, semilla: 3, nivel: 'experto', sinIntro: true });
    for (let f = 0; f < 2500 && p.fase !== 'fin'; f++) p.paso([E({ r: f % 45 === 0 ? ['ligero'] : [] })]);
    assert.equal(p.combate.transicionesRechazadas, 0, modo);
  }
});

test('buffer de entrada: ↓↘→, doble toque, simultáneos y carga', () => {
  const b = crearBuffer(); const reg = (x, y, r = [], a = []) => b.registrar({ x, y, recien: new Set(r), abajo: new Set([...a, ...r]) }, 1);
  reg(0, 1); reg(1, 1); reg(1, 0, ['especial']); assert.ok(cumple(b, parsearComando('236+especial'), {}));
  b.reiniciar(); reg(0, 0, ['ligero']); reg(0, 0, ['medio']); assert.ok(b.simultaneo('ligero', 'medio'));
  b.reiniciar(); for (let i = 0; i < 45; i++) reg(0, 0, [], ['carga']); reg(0, 0, ['especial']); assert.ok(cumple(b, parsearComando('carga>40+especial'), {}));
  assert.ok(barrido({ x: 0, y: 0, w: 10, h: 10 }, 500, 0, { x: 200, y: 0, w: 4, h: 10 }) >= 0, 'swept AABB no deja pasar un proyectil rápido');
});

test('semillas: texto, número y PRNG deterministas', () => {
  assert.equal(semillaDe('ANDES-2026'), semillaDe('andes-2026')); assert.equal(semillaDe(42), 42); assert.equal(hashTexto('a'), hashTexto('a'));
  const a = crearPRNG(9), b = crearPRNG(9); for (let i = 0; i < 100; i++) assert.equal(a.u32(), b.u32());
});

test('configuración: el esquema acepta los valores de fábrica y rechaza código y claves peligrosas', () => {
  for (const p of ['duelo-anime', 'jefe-titan']) assert.deepEqual(validar(defecto(p), ESQUEMA), []);
  assert.ok(validar({ ...defecto('duelo-anime'), titulo: () => 1 }, ESQUEMA).length);
  assert.ok(!leerConfig('{"__proto__":{"x":1}}', ESQUEMA).ok);
  assert.ok(!leerConfig('{"modo":"cpu","extra":1}', ESQUEMA).ok);
  assert.ok(!leerConfig('{"personajes":{"ren":{"salud":"alert(1)"}}}', ESQUEMA).ok);
  const p = personajesCon({ personajes: { ren: { salud: 2000, movimientos: { ligero: { dano: 99 } } } } }); assert.equal(p.ren.salud, 2000); assert.equal(p.ren.movimientos.ligero.dano, 99); assert.equal(PERSONAJES.ren.salud, 950);
});

test('agente: la descripción del ejemplo se traduce a una configuración válida', () => {
  const r = traducir('crea un juego de lucha anime con dos personajes, combate rapido, ataques electricos, arena nocturna y transformacion especial', defecto('duelo-anime'), 'duelo-anime');
  assert.equal(r.config.velocidad, 1.25); assert.equal(r.config.escenario.tema, 'noche'); assert.equal(r.config.jugador, 'ren'); assert.ok(r.config.personajes.ren.transformacion);
  assert.deepEqual(validar(r.config, ESQUEMA), []); assert.ok(r.entendido.length >= 4);
});

test('catálogos anime: válidos, más de 300 reglas y cada clave se lee en su plantilla', async () => {
  const { catalogoDe, revisar, claves } = await import('./web/motor/juegos/index.js');
  for (const id of ['duelo-anime', 'jefe-titan']) {
    const { reglas, ficha } = await catalogoDe(id);
    assert.ok(ficha); assert.deepEqual(revisar(reglas), []); assert.ok(reglas.length >= 300, `${id}: ${reglas.length}`);
    const src = fs.readFileSync(new URL(`./web/plantillas/${id}.js`, import.meta.url), 'utf8');
    assert.deepEqual(claves(reglas).filter((k) => !src.includes(`'${k.clave}'`)).map((k) => k.clave), [], id);
  }
});

test('proyecto: las dependencias de cada plantilla existen y no salen de web/', async () => {
  const leer = async (r) => fs.readFileSync(new URL('./web/' + r, import.meta.url), 'utf8');
  assert.deepEqual(importsDe("import a from 'motores/x.js'; import('./y.js'); new Worker(new URL('./t.js', import.meta.url))", 'motores/v/z.js').sort(), ['motores/v/t.js', 'motores/v/y.js', 'motores/x.js']);
  const meta = JSON.parse(fs.readFileSync(new URL('./web/plantillas/meta.json', import.meta.url)));
  for (const p of meta.filter((m) => m.motor)) {
    const deps = await dependencias(`plantillas/${p.id}.js`, leer);
    assert.ok(deps.length > 5, p.id);
    for (const d of deps) { assert.ok(!d.startsWith('..') && !d.includes('://'), d); assert.ok(fs.existsSync(new URL('./web/' + d, import.meta.url)), `${p.id}: falta ${d}`); }
    assert.ok(deps.includes('vendor/anime.esm.min.js') || p.motor === 'voxel', `${p.id} usa Anime.js`);
    if (p.motor === 'voxel') assert.ok(deps.some((d) => /trabajador/.test(d)), 'el Worker viaja como archivo aparte');
  }
});
