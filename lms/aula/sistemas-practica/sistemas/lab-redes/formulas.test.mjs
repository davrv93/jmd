/*
 * formulas.test.mjs · Prueba sin navegador de las fórmulas de «lab-redes»
 * ----------------------------------------------------------------------------
 *   node sistemas/lab-redes/formulas.test.mjs
 * Carga config.js en node:vm con un `window` falso, arma un `ctx` mínimo (param, redondear, suma,
 * agrupar, fechas y un almacén en memoria) y verifica con resultados calculados a mano.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const caja = { window: {} };
vm.createContext(caja);
vm.runInContext(fs.readFileSync(path.join(AQUI, 'config.js'), 'utf8'), caja, { filename: 'config.js' });
const C = caja.window.SISTEMA;

/* ---------- ctx de pruebas ---------- */
const parse = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)); };
const iso = (d) => d.toISOString().slice(0, 10);
const fechaMas = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const diasEntre = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const redondear = (n) => (typeof n !== 'number' || !isFinite(n) ? 0 : (n < 0 ? -1 : 1) * Math.round(Math.abs(n) * 100 + 1e-7) / 100);

function crearCtx(datos, opciones = {}) {
  const params = {};
  C.parametros.forEach((p) => { params[p.id] = p.valor; });
  Object.assign(params, opciones.params || {});
  const copia = (x) => JSON.parse(JSON.stringify(x));
  return {
    datos: {
      listar: (e, f) => (datos[e] || []).filter((r) => !f || f(r)).map(copia),
      obtener: (e, id) => { const r = (datos[e] || []).find((x) => x.id === id); return r ? copia(r) : null; },
      contar: (e) => (datos[e] || []).length,
      actualizar: (e, id, parche) => { const r = datos[e].find((x) => x.id === id); Object.assign(r, parche); return copia(r); }
    },
    param: (id) => (params[id] === undefined ? 0 : params[id]),
    hoy: () => opciones.hoy || '2026-10-31',
    redondear,
    suma: (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0),
    agrupar: (a, f) => { const g = {}; a.forEach((x) => { const k = f(x); (g[k] = g[k] || []).push(x); }); return g; },
    fmt: { moneda: (n) => 'S/ ' + n.toFixed(2), fecha: (s) => s },
    fechaMas, mes: (s) => String(s || '').slice(0, 7), diasEntre
  };
}

const ent = (id) => C.entidades.find((e) => e.id === id);
const op = (id) => C.operaciones.find((o) => o.id === id);
const rep = (id) => C.reportes.find((r) => r.id === id);
const calc = (entidad, campo, r, ctx) => ent(entidad).calculados.find((k) => k.id === campo).formula(r, ctx);
const regla = (obj, id) => obj.reglas.find((k) => k.id === id).validar;
const igual = (real, esperado, msg) => assert.deepEqual(JSON.parse(JSON.stringify(real)), esperado, msg);

let n = 0;
function prueba(nombre, fn) {
  try { fn(); n += 1; } catch (e) { console.error('✗ ' + nombre + '\n  ' + (e && e.message ? e.message : e)); process.exitCode = 1; throw e; }
}

/* ---------- Cálculo de subred ---------- */
const campos = ['cidr', 'red', 'mascara', 'broadcast', 'primerHost', 'ultimoHost', 'hostsUtiles'];
function subred(ip, prefijo) {
  const [a, b, c, d] = ip.split('.').map(Number), r = { ip1: a, ip2: b, ip3: c, ip4: d, prefijo }, ctx = crearCtx({});
  const o = {};
  campos.forEach((k) => { o[k] = calc('subredes', k, r, ctx); });
  return o;
}

prueba('subred /25 con la IP en la segunda mitad', () => {
  igual(subred('192.168.1.130', 25), { cidr: '192.168.1.128/25', red: '192.168.1.128', mascara: '255.255.255.128', broadcast: '192.168.1.255', primerHost: '192.168.1.129', ultimoHost: '192.168.1.254', hostsUtiles: 126 });
});

prueba('subredes /8, /16 y /24', () => {
  igual(subred('10.0.0.1', 8), { cidr: '10.0.0.0/8', red: '10.0.0.0', mascara: '255.0.0.0', broadcast: '10.255.255.255', primerHost: '10.0.0.1', ultimoHost: '10.255.255.254', hostsUtiles: 16777214 });
  igual(subred('172.16.45.9', 16), { cidr: '172.16.0.0/16', red: '172.16.0.0', mascara: '255.255.0.0', broadcast: '172.16.255.255', primerHost: '172.16.0.1', ultimoHost: '172.16.255.254', hostsUtiles: 65534 });
  igual(subred('172.16.5.77', 24), { cidr: '172.16.5.0/24', red: '172.16.5.0', mascara: '255.255.255.0', broadcast: '172.16.5.255', primerHost: '172.16.5.1', ultimoHost: '172.16.5.254', hostsUtiles: 254 });
});

prueba('subredes pequeñas: /26, /28 y /30', () => {
  igual(subred('10.10.30.1', 26), { cidr: '10.10.30.0/26', red: '10.10.30.0', mascara: '255.255.255.192', broadcast: '10.10.30.63', primerHost: '10.10.30.1', ultimoHost: '10.10.30.62', hostsUtiles: 62 });
  igual(subred('10.30.10.200', 28), { cidr: '10.30.10.192/28', red: '10.30.10.192', mascara: '255.255.255.240', broadcast: '10.30.10.207', primerHost: '10.30.10.193', ultimoHost: '10.30.10.206', hostsUtiles: 14 });
  igual(subred('172.16.0.1', 30), { cidr: '172.16.0.0/30', red: '172.16.0.0', mascara: '255.255.255.252', broadcast: '172.16.0.3', primerHost: '172.16.0.1', ultimoHost: '172.16.0.2', hostsUtiles: 2 });
});

prueba('/31 sigue la RFC 3021: dos hosts y sin difusión', () => {
  igual(subred('172.16.0.5', 31), { cidr: '172.16.0.4/31', red: '172.16.0.4', mascara: '255.255.255.254', broadcast: 'No aplica (/31)', primerHost: '172.16.0.4', ultimoHost: '172.16.0.5', hostsUtiles: 2 });
  igual(subred('10.0.0.0', 31), { cidr: '10.0.0.0/31', red: '10.0.0.0', mascara: '255.255.255.254', broadcast: 'No aplica (/31)', primerHost: '10.0.0.0', ultimoHost: '10.0.0.1', hostsUtiles: 2 });
});

prueba('/32 es un solo host', () => {
  igual(subred('172.16.255.1', 32), { cidr: '172.16.255.1/32', red: '172.16.255.1', mascara: '255.255.255.255', broadcast: 'No aplica (/32)', primerHost: '172.16.255.1', ultimoHost: '172.16.255.1', hostsUtiles: 1 });
});

prueba('bordes del espacio de 32 bits', () => {
  igual(subred('255.255.255.255', 32), { cidr: '255.255.255.255/32', red: '255.255.255.255', mascara: '255.255.255.255', broadcast: 'No aplica (/32)', primerHost: '255.255.255.255', ultimoHost: '255.255.255.255', hostsUtiles: 1 });
  igual(subred('255.255.255.254', 31), { cidr: '255.255.255.254/31', red: '255.255.255.254', mascara: '255.255.255.254', broadcast: 'No aplica (/31)', primerHost: '255.255.255.254', ultimoHost: '255.255.255.255', hostsUtiles: 2 });
  igual(subred('200.1.1.1', 1), { cidr: '128.0.0.0/1', red: '128.0.0.0', mascara: '128.0.0.0', broadcast: '255.255.255.255', primerHost: '128.0.0.1', ultimoHost: '255.255.255.254', hostsUtiles: 2147483646 });
  igual(subred('8.8.8.8', 0), { cidr: '0.0.0.0/0', red: '0.0.0.0', mascara: '0.0.0.0', broadcast: '255.255.255.255', primerHost: '0.0.0.1', ultimoHost: '255.255.255.254', hostsUtiles: 4294967294 });
  igual(subred('192.168.0.255', 24), { cidr: '192.168.0.0/24', red: '192.168.0.0', mascara: '255.255.255.0', broadcast: '192.168.0.255', primerHost: '192.168.0.1', ultimoHost: '192.168.0.254', hostsUtiles: 254 });
});

prueba('datos inválidos no producen una subred', () => {
  const ctx = crearCtx({});
  [{ ip1: 256, ip2: 0, ip3: 0, ip4: 1, prefijo: 24 }, { ip1: 10, ip2: -1, ip3: 0, ip4: 1, prefijo: 24 }, { ip1: 10, ip2: 0, ip3: 0.5, ip4: 1, prefijo: 24 },
    { ip1: 10, ip2: 0, ip3: 0, ip4: 1, prefijo: 33 }, { ip1: 10, ip2: 0, ip3: 0, ip4: 1, prefijo: -1 }, { ip1: 10, ip2: 0, ip3: 0, ip4: 1, prefijo: 24.5 }, { ip1: 10, ip2: 0, ip3: 0, prefijo: 24 }, {}].forEach((r) => {
    assert.equal(calc('subredes', 'cidr', r, ctx), null, JSON.stringify(r));
    assert.equal(calc('subredes', 'hostsUtiles', r, ctx), null);
    assert.equal(calc('subredes', 'ocupacionPct', r, ctx), null);
  });
});

prueba('ocupación de la subred', () => {
  const ctx = crearCtx({});
  assert.equal(calc('subredes', 'ocupacionPct', { ip1: 10, ip2: 10, ip3: 20, ip4: 1, prefijo: 25, hostsPrevistos: 96 }, ctx), 76.19);       // 96 / 126
  assert.equal(calc('subredes', 'ocupacionPct', { ip1: 172, ip2: 16, ip3: 0, ip4: 5, prefijo: 31, hostsPrevistos: 2 }, ctx), 100);
  assert.equal(calc('subredes', 'ocupacionPct', { ip1: 172, ip2: 16, ip3: 255, ip4: 1, prefijo: 32, hostsPrevistos: 1 }, ctx), 100);
  assert.equal(calc('subredes', 'ocupacionPct', { ip1: 10, ip2: 0, ip3: 0, ip4: 1, prefijo: 24 }, ctx), 0, 'sin equipos previstos');
});

prueba('reglas de la subred: capacidad, solapamiento y VLAN', () => {
  const base = { ip1: 10, ip2: 10, ip3: 20, ip4: 1, prefijo: 25, laboratorio: 'L1', vlan: 20 };
  const caben = regla(ent('subredes'), 'caben-los-equipos'), solapa = regla(ent('subredes'), 'sin-solapamiento'), vlanUnica = regla(ent('subredes'), 'vlan-unica');
  const ctx0 = crearCtx({ subredes: [] });
  assert.equal(caben(Object.assign({}, base, { hostsPrevistos: 126 }), ctx0), true, 'caben justo');
  assert.equal(caben(Object.assign({}, base, { hostsPrevistos: 127 }), ctx0), false);
  assert.equal(caben({ ip1: 172, ip2: 16, ip3: 0, ip4: 5, prefijo: 31, hostsPrevistos: 2 }, ctx0), true, '/31: 2 hosts');
  assert.equal(caben({ ip1: 172, ip2: 16, ip3: 0, ip4: 5, prefijo: 31, hostsPrevistos: 3 }, ctx0), false);
  assert.equal(caben({ ip1: 172, ip2: 16, ip3: 255, ip4: 1, prefijo: 32, hostsPrevistos: 2 }, ctx0), false, '/32: solo 1 host');
  const existentes = [
    { id: 'S1', ip1: 10, ip2: 10, ip3: 20, ip4: 1, prefijo: 25, laboratorio: 'L1', vlan: 20 },           // 10.10.20.0 – 10.10.20.127
    { id: 'S2', ip1: 172, ip2: 16, ip3: 0, ip4: 5, prefijo: 31, laboratorio: 'L2', vlan: 101 }           // 172.16.0.4 – 172.16.0.5
  ];
  const ctx = crearCtx({ subredes: existentes });
  assert.equal(solapa({ id: 'N', ip1: 10, ip2: 10, ip3: 0, ip4: 1, prefijo: 16 }, ctx), false, 'una /16 contiene a la /25');
  assert.equal(solapa({ id: 'N', ip1: 10, ip2: 10, ip3: 20, ip4: 127, prefijo: 32 }, ctx), false, 'el último host de la /25 está ocupado');
  assert.equal(solapa({ id: 'N', ip1: 10, ip2: 10, ip3: 20, ip4: 130, prefijo: 25 }, ctx), true, 'la mitad contigua no choca');
  assert.equal(solapa({ id: 'N', ip1: 10, ip2: 10, ip3: 19, ip4: 255, prefijo: 24 }, ctx), true, 'la red anterior no choca');
  assert.equal(solapa({ id: 'S1', ip1: 10, ip2: 10, ip3: 20, ip4: 1, prefijo: 25 }, ctx), true, 'al editar no choca consigo misma');
  assert.equal(solapa({ id: 'N', ip1: 172, ip2: 16, ip3: 0, ip4: 4, prefijo: 32 }, ctx), false, 'un /32 dentro del /31');
  assert.equal(solapa({ id: 'N', ip1: 172, ip2: 16, ip3: 0, ip4: 6, prefijo: 31 }, ctx), true, 'el /31 siguiente');
  assert.equal(solapa({ id: 'N', ip1: 300, ip2: 1, ip3: 1, ip4: 1, prefijo: 24 }, ctx), true, 'una IP inválida la rechaza el campo, no esta regla');
  assert.equal(vlanUnica({ id: 'N', laboratorio: 'L1', vlan: 20 }, ctx), false);
  assert.equal(vlanUnica({ id: 'N', laboratorio: 'L2', vlan: 20 }, ctx), true, 'otra sede puede repetir la VLAN');
  assert.equal(vlanUnica({ id: 'S1', laboratorio: 'L1', vlan: 20 }, ctx), true);
});

/* ---------- Depreciación lineal ---------- */
prueba('depreciación lineal de un lote', () => {
  const ctx = crearCtx({});    // hoy = 2026-10-31
  const lote = (extra) => Object.assign({ valorCompra: 6000, valorResidual: 600, vidaUtilAnios: 5, unidades: 1, fechaCompra: '2024-10-31' }, extra);
  /* 730 días = 2 años · base 5400 · anual 1080 · acumulada 2160 · libros 3840 */
  assert.equal(calc('equipos', 'antiguedad', lote(), ctx), 2);
  assert.equal(calc('equipos', 'depreciacionAnual', lote(), ctx), 1080);
  assert.equal(calc('equipos', 'depreciacionAcumulada', lote(), ctx), 2160);
  assert.equal(calc('equipos', 'valorLibros', lote(), ctx), 3840);
  /* un lote de 3 unidades triplica todo */
  assert.equal(calc('equipos', 'depreciacionAnual', lote({ unidades: 3 }), ctx), 3240);
  assert.equal(calc('equipos', 'depreciacionAcumulada', lote({ unidades: 3 }), ctx), 6480);
  assert.equal(calc('equipos', 'valorLibros', lote({ unidades: 3 }), ctx), 11520);
  /* recién comprado */
  assert.equal(calc('equipos', 'depreciacionAcumulada', lote({ fechaCompra: '2026-10-31' }), ctx), 0);
  assert.equal(calc('equipos', 'valorLibros', lote({ fechaCompra: '2026-10-31' }), ctx), 6000);
  /* vida útil agotada: queda en el valor residual, nunca por debajo */
  assert.equal(calc('equipos', 'depreciacionAcumulada', lote({ fechaCompra: '2016-10-31' }), ctx), 5400);
  assert.equal(calc('equipos', 'valorLibros', lote({ fechaCompra: '2016-10-31' }), ctx), 600);
  /* justo al cumplir la vida útil (1826 días con un año bisiesto) */
  assert.equal(calc('equipos', 'valorLibros', lote({ fechaCompra: '2021-10-31' }), ctx), 600);
  /* fecha futura: no hay antigüedad negativa */
  assert.equal(calc('equipos', 'antiguedad', lote({ fechaCompra: '2026-12-01' }), ctx), 0);
  assert.equal(calc('equipos', 'valorLibros', lote({ fechaCompra: '2026-12-01' }), ctx), 6000);
  /* sin residual */
  assert.equal(calc('equipos', 'depreciacionAcumulada', lote({ valorResidual: 0, vidaUtilAnios: 10, valorCompra: 1000, fechaCompra: '2025-10-31' }), ctx), 100);
  /* residual mayor que el valor: no hay base que depreciar, el libro conserva el valor de compra */
  assert.equal(calc('equipos', 'depreciacionAcumulada', lote({ valorResidual: 7000 }), ctx), 0);
  assert.equal(calc('equipos', 'valorLibros', lote({ valorResidual: 7000 }), ctx), 6000);
  /* vida útil cero: sin división por cero */
  assert.equal(calc('equipos', 'depreciacionAnual', lote({ vidaUtilAnios: 0 }), ctx), 0);
  assert.equal(calc('equipos', 'valorLibros', lote({ vidaUtilAnios: 0 }), ctx), 6000);
  /* decimales: 1 año de 7 sobre 4999,99 */
  assert.equal(calc('equipos', 'depreciacionAnual', lote({ valorCompra: 4999.99, valorResidual: 0, vidaUtilAnios: 7 }), ctx), 714.28);   // 714,2842…
  assert.equal(regla(ent('equipos'), 'residual-menor')({ valorCompra: 100, valorResidual: 100 }), true);
  assert.equal(regla(ent('equipos'), 'residual-menor')({ valorCompra: 100, valorResidual: 100.01 }), false);
});

/* ---------- Reservas: sesiones, ocupación y uso ---------- */
const reserva = (extra) => Object.assign({ id: 'R', estado: 'Reservada', laboratorio: 'L1', docente: 'D1', practica: 'P1', fecha: '2026-10-05', sesiones: 5, horaInicio: 8, horaFin: 11, alumnos: 20, lineas: [] }, extra);

prueba('ocupación del laboratorio en una ventana de 30 días', () => {
  /* Sesiones cada lunes desde el 5/10: 5, 12, 19, 26 de octubre y 2 de noviembre; en la ventana [3/10, 31/10] caen 4 → 12 horas */
  const datos = { reservas: [reserva(), reserva({ id: 'C', estado: 'Cancelada' }), reserva({ id: 'B', estado: 'Borrador' }), reserva({ id: 'O', laboratorio: 'L2' })] };
  const ctx = crearCtx(datos);
  /* 12 / (60 × 30 / 7) = 12 / 257,142… = 4,67 % */
  assert.equal(calc('laboratorios', 'ocupacion', { id: 'L1', horasSemana: 60 }, ctx), 4.67);
  assert.equal(calc('laboratorios', 'ocupacion', { id: 'L9', horasSemana: 60 }, ctx), 0);
  assert.equal(calc('laboratorios', 'ocupacion', { id: 'L1', horasSemana: 0 }, ctx), 0, 'sin horas de apertura no se divide por cero');
  /* 7 sesiones cada lunes desde el 5/10: en la ventana caen 4 (12 h) de 42 × 30 / 7 = 180 h → 6,67 % */
  assert.equal(calc('laboratorios', 'ocupacion', { id: 'L1', horasSemana: 42 }, crearCtx({ reservas: [reserva({ fecha: '2026-10-05', sesiones: 7, horaInicio: 8, horaFin: 11 })] })), 6.67);
  /* bordes de la ventana: la sesión del día hoy − 29 entra y la de hoy − 30 no */
  const borde = crearCtx({ reservas: [reserva({ fecha: '2026-10-02', sesiones: 1 }), reserva({ id: 'X', fecha: '2026-10-01', sesiones: 1 })] });
  assert.equal(calc('laboratorios', 'ocupacion', { id: 'L1', horasSemana: 0.7 }, borde), 100, 'una sola sesión de 3 horas llena las 3 horas disponibles (0,7 h/semana × 30 / 7)');
});

prueba('horas de uso y mantenimiento de un lote de equipos', () => {
  const datos = {
    reservas: [
      reserva({ fecha: '2026-10-10', sesiones: 4, lineas: [{ item: 'E1', cantidad: 2 }, { item: 'E2', cantidad: 1 }] }),            // 10/10, 17/10, 24/10, 31/10 → 4 × 3 h × 2 = 24
      reserva({ id: 'R2', fecha: '2026-10-24', sesiones: 4, lineas: [{ item: 'E1', cantidad: 1 }] }),                                 // 24/10 y 31/10 hoy → 2 × 3 h × 1 = 6
      reserva({ id: 'R3', estado: 'Cancelada', fecha: '2026-10-10', lineas: [{ item: 'E1', cantidad: 50 }] })
    ]
  };
  const ctx = crearCtx(datos);
  assert.equal(calc('equipos', 'horasUso', { id: 'E1' }, ctx), 30);
  assert.equal(calc('equipos', 'horasUso', { id: 'E2' }, ctx), 12);
  assert.equal(calc('equipos', 'horasUso', { id: 'E9' }, ctx), 0);
  assert.equal(calc('equipos', 'horasMantenimiento', { id: 'E1' }, ctx), 370, '400 − 30');
  assert.equal(calc('equipos', 'horasMantenimiento', { id: 'E9' }, ctx), 400);
  assert.equal(calc('equipos', 'horasMantenimiento', { id: 'E1' }, crearCtx(datos, { params: { mantenimientoCadaHoras: 20 } })), 10, '30 horas de un ciclo de 20 → faltan 10');
  assert.equal(calc('equipos', 'horasMantenimiento', { id: 'E1' }, crearCtx(datos, { params: { mantenimientoCadaHoras: 0 } })), null);
  assert.equal(calc('equipos', 'horasMantenimiento', { id: 'E1' }, crearCtx(datos, { params: { mantenimientoCadaHoras: 30 } })), 30, 'justo al cumplir el ciclo vuelve a empezar');
});

prueba('totales de la reserva', () => {
  const ctx = crearCtx({});
  const t = op('reservas').calcular({ fecha: '2026-11-02', horaInicio: 8, horaFin: 11, sesiones: 4, alumnos: 20, lineas: [{ item: 'A', cantidad: 2, precio: 5.5 }, { item: 'B', cantidad: 1, precio: 3 }] }, ctx);
  /* por hora: 2 × 5,5 + 1 × 3 = 14 · horas: 3 × 4 = 12 · total 168 · alumnos-hora 240 */
  igual(t, { sesiones: 4, horas: 12, equipos: 3, alumnoHoras: 240, total: 168 });
  igual(op('reservas').calcular({ horaInicio: 10, horaFin: 10, lineas: [{ item: 'A', cantidad: 2, precio: 5.5 }] }, ctx), { sesiones: 1, horas: 0, equipos: 2, alumnoHoras: 0, total: 0 });
  igual(op('reservas').calcular({ horaInicio: 12, horaFin: 10, lineas: [] }, ctx), { sesiones: 1, horas: 0, equipos: 0, alumnoHoras: 0, total: 0 });
  assert.equal(op('reservas').calcular({ horaInicio: 7, horaFin: 8, sesiones: 1, lineas: [{ item: 'A', cantidad: 3, precio: 0.33 }] }, ctx).total, 0.99);
  assert.equal(op('reservas').lineas.info({ unidades: 6, estado: 'Operativo' }).indexOf('6') > 0, true);
});

prueba('reglas de la reserva: horario, aforo, cruces, equipos y práctica', () => {
  const o = op('reservas');
  const datos = {
    laboratorios: [{ id: 'L1', aforo: 20, activo: true }, { id: 'L2', aforo: 20, activo: false }],
    equipos: [{ id: 'E1', unidades: 4, estado: 'Operativo' }, { id: 'E2', unidades: 4, estado: 'De baja' }],
    practicas: [{ id: 'P1', equiposPorGrupo: 3 }],
    reservas: [
      reserva({ id: 'X', fecha: '2026-11-03', sesiones: 4, horaInicio: 8, horaFin: 11, lineas: [{ item: 'E1', cantidad: 3 }] }),               // 3/11, 10/11, 17/11, 24/11
      reserva({ id: 'Y', estado: 'Cancelada', fecha: '2026-11-03', sesiones: 4, horaInicio: 8, horaFin: 11, lineas: [{ item: 'E1', cantidad: 4 }] }),
      reserva({ id: 'Z', estado: 'Borrador', fecha: '2026-11-03', sesiones: 4, horaInicio: 8, horaFin: 11, lineas: [{ item: 'E1', cantidad: 4 }] })
    ]
  };
  const ctx = crearCtx(datos);
  const nueva = (extra) => Object.assign({ id: 'N', laboratorio: 'L1', fecha: '2026-11-17', sesiones: 1, horaInicio: 10, horaFin: 12, alumnos: 20, lineas: [] }, extra);
  assert.equal(regla(o, 'horario-valido')(nueva({ horaInicio: 9, horaFin: 10 })), true);
  assert.equal(regla(o, 'horario-valido')(nueva({ horaInicio: 10, horaFin: 10 })), false);
  assert.equal(regla(o, 'horario-valido')(nueva({ horaInicio: 11, horaFin: 9 })), false);
  assert.equal(regla(o, 'aforo-del-laboratorio')(nueva({ alumnos: 20 }), ctx), true, 'aforo justo');
  assert.equal(regla(o, 'aforo-del-laboratorio')(nueva({ alumnos: 21 }), ctx), false);
  assert.equal(regla(o, 'laboratorio-activo')(nueva(), ctx), true);
  assert.equal(regla(o, 'laboratorio-activo')(nueva({ laboratorio: 'L2' }), ctx), false);
  const libre = regla(o, 'laboratorio-libre');
  assert.equal(libre(nueva(), ctx), false, '17/11 de 10 a 12 cae en la tercera sesión de X (8 a 11)');
  assert.equal(libre(nueva({ fecha: '2026-11-18' }), ctx), true, 'otro día');
  assert.equal(libre(nueva({ horaInicio: 11, horaFin: 13 }), ctx), true, 'empieza cuando X termina');
  assert.equal(libre(nueva({ horaInicio: 7, horaFin: 8 }), ctx), true, 'termina cuando X empieza');
  assert.equal(libre(nueva({ horaInicio: 7, horaFin: 9 }), ctx), false);
  assert.equal(libre(nueva({ fecha: '2026-10-27', sesiones: 1 }), ctx), true, 'una semana antes del inicio de X');
  assert.equal(libre(nueva({ fecha: '2026-10-27', sesiones: 2 }), ctx), false, 'la segunda sesión llega al 3/11');
  assert.equal(libre(nueva({ fecha: '2026-12-01' }), ctx), true, 'después de la última sesión de X (24/11)');
  assert.equal(libre(nueva({ laboratorio: 'L2' }), ctx), true, 'otro laboratorio');
  assert.equal(libre(nueva({ id: 'X', fecha: '2026-11-03' }), ctx), true, 'al editar no choca consigo misma');
  assert.equal(libre(nueva({ fecha: '2026-11-04' }), ctx), true, 'un día después no es la misma semana');
  const aptos = regla(o, 'equipos-aptos');
  assert.equal(aptos(nueva({ lineas: [{ item: 'E1', cantidad: 1 }] }), ctx), true, 'queda 1 de las 4 unidades');
  assert.equal(aptos(nueva({ lineas: [{ item: 'E1', cantidad: 2 }] }), ctx), false);
  assert.equal(aptos(nueva({ fecha: '2026-11-18', lineas: [{ item: 'E1', cantidad: 4 }] }), ctx), true, 'otro día están libres');
  assert.equal(aptos(nueva({ lineas: [{ item: 'E2', cantidad: 1 }] }), ctx), false, 'de baja');
  assert.equal(aptos(nueva({ lineas: [{ item: 'ZZ', cantidad: 1 }] }), ctx), false, 'inexistente');
  assert.equal(aptos(nueva({ lineas: [{ item: 'E1', cantidad: 5 }], fecha: '2026-12-01' }), ctx), false, 'más que las unidades del lote');
  const cubre = regla(o, 'cubre-la-practica');
  assert.equal(cubre(nueva({ practica: 'P1', lineas: [{ item: 'E1', cantidad: 2 }, { item: 'E2', cantidad: 1 }] }), ctx), true, '3 unidades para 3 por grupo');
  assert.equal(cubre(nueva({ practica: 'P1', lineas: [{ item: 'E1', cantidad: 2 }] }), ctx), false);
  assert.equal(cubre(nueva({ practica: 'P1', lineas: [] }), ctx), false);
});

/* ---------- Incidencias ---------- */
prueba('costo de la incidencia y reglas', () => {
  const o = op('incidencias');
  const ctx = crearCtx({ equipos: [{ id: 'E1', unidades: 4, estado: 'Operativo' }, { id: 'E2', unidades: 2, estado: 'De baja' }] });
  igual(o.calcular({ horasTecnico: 2.5, costoRepuestos: 120.4 }, ctx), { manoObra: 87.5, repuestos: 120.4, total: 207.9 });
  igual(o.calcular({ horasTecnico: 2.5, costoRepuestos: 120.4 }, crearCtx({}, { params: { tarifaTecnicoHora: 40 } })), { manoObra: 100, repuestos: 120.4, total: 220.4 });
  igual(o.calcular({ horasTecnico: 0.333, costoRepuestos: 0 }, ctx), { manoObra: 11.66, repuestos: 0, total: 11.66 });           // 0,333 × 35 = 11,655 → 11,66
  igual(o.calcular({}, ctx), { manoObra: 0, repuestos: 0, total: 0 });
  assert.equal(regla(o, 'unidades-del-lote')({ equipo: 'E1', unidadesAfectadas: 4 }, ctx), true);
  assert.equal(regla(o, 'unidades-del-lote')({ equipo: 'E1', unidadesAfectadas: 5 }, ctx), false);
  assert.equal(regla(o, 'equipo-en-servicio')({ equipo: 'E1' }, ctx), true);
  assert.equal(regla(o, 'equipo-en-servicio')({ equipo: 'E2' }, ctx), false);
});

prueba('emitir y anular una incidencia cambia el inventario', () => {
  const o = op('incidencias');
  const datos = { equipos: [{ id: 'E1', unidades: 6, estado: 'Operativo' }, { id: 'E2', unidades: 2, estado: 'Operativo' }, { id: 'E3', unidades: 1, estado: 'En mantenimiento' }] };
  const ctx = crearCtx(datos);
  /* robo parcial: salen 2 de 6 unidades */
  o.alEmitir({ equipo: 'E1', tipo: 'Robo o pérdida', prioridad: 'Media', unidadesAfectadas: 2 }, ctx);
  assert.equal(datos.equipos[0].unidades, 4);
  o.alAnular({ equipo: 'E1', tipo: 'Robo o pérdida', prioridad: 'Media', unidadesAfectadas: 2 }, ctx);
  assert.equal(datos.equipos[0].unidades, 6);
  /* robo total: el lote queda de baja y al anular vuelve a operar */
  o.alEmitir({ equipo: 'E2', tipo: 'Robo o pérdida', prioridad: 'Alta', unidadesAfectadas: 2 }, ctx);
  assert.equal(datos.equipos[1].estado, 'De baja');
  assert.equal(datos.equipos[1].unidades, 2);
  o.alAnular({ equipo: 'E2', tipo: 'Robo o pérdida', prioridad: 'Alta', unidadesAfectadas: 2 }, ctx);
  assert.equal(datos.equipos[1].estado, 'Operativo');
  /* falla crítica: pasa a mantenimiento; una prioridad menor no cambia nada */
  o.alEmitir({ equipo: 'E1', tipo: 'Falla de hardware', prioridad: 'Alta', unidadesAfectadas: 1 }, ctx);
  assert.equal(datos.equipos[0].estado, 'Operativo');
  o.alEmitir({ equipo: 'E1', tipo: 'Falla de hardware', prioridad: 'Crítica', unidadesAfectadas: 1 }, ctx);
  assert.equal(datos.equipos[0].estado, 'En mantenimiento');
  o.alAnular({ equipo: 'E1', tipo: 'Falla de hardware', prioridad: 'Crítica', unidadesAfectadas: 1 }, ctx);
  assert.equal(datos.equipos[0].estado, 'Operativo');
  o.alEmitir({ equipo: 'E3', tipo: 'Energía', prioridad: 'Crítica', unidadesAfectadas: 1 }, ctx);
  assert.equal(datos.equipos[2].estado, 'En mantenimiento', 'no se toca un equipo que ya no estaba operativo');
  o.alEmitir({ equipo: 'NO-EXISTE', tipo: 'Robo o pérdida', prioridad: 'Crítica', unidadesAfectadas: 1 }, ctx);
});

prueba('situación del equipo según sus incidencias abiertas', () => {
  const datos = { incidencias: [{ id: 'I1', equipo: 'E1', estado: 'Abierta' }, { id: 'I2', equipo: 'E2', estado: 'Resuelta' }, { id: 'I3', equipo: 'E3', estado: 'En reparación' }] };
  const ctx = crearCtx(datos);
  assert.equal(calc('equipos', 'situacion', { id: 'E1', estado: 'Operativo' }, ctx), 'Con incidencia abierta');
  assert.equal(calc('equipos', 'situacion', { id: 'E2', estado: 'Operativo' }, ctx), 'Operativo');
  assert.equal(calc('equipos', 'situacion', { id: 'E3', estado: 'En mantenimiento' }, ctx), 'Con incidencia abierta');
  assert.equal(calc('equipos', 'situacion', { id: 'E3', estado: 'De baja' }, ctx), 'De baja');
});

/* ---------- Reglas de prácticas ---------- */
prueba('una práctica avanzada exige al menos tres equipos por grupo', () => {
  const r = regla(ent('practicas'), 'avanzada-con-equipos');
  assert.equal(r({ nivel: 'Avanzado', equiposPorGrupo: 3 }), true);
  assert.equal(r({ nivel: 'Avanzado', equiposPorGrupo: 2 }), false);
  assert.equal(r({ nivel: 'Básico', equiposPorGrupo: 1 }), true);
});

/* ---------- Reportes y tablero ---------- */
prueba('reporte de ocupación por laboratorio', () => {
  const datos = {
    laboratorios: [{ id: 'L1', nombre: 'Lab 1', sede: 'Campus Arequipa', horasSemana: 42 }, { id: 'L2', nombre: 'Lab 2', sede: 'Campus Cusco', horasSemana: 42 }],
    reservas: [reserva({ fecha: '2026-10-05', sesiones: 5, horaInicio: 8, horaFin: 14, alumnos: 10 }), reserva({ id: 'F', fecha: '2026-11-09', sesiones: 3 })]
  };
  const ctx = crearCtx(datos);
  /* ventana 4/10 – 31/10 (28 días): lunes 5, 12, 19 y 26 → 4 sesiones × 6 h = 24 h · disponibles 42 × 28 / 7 = 168 · 14,29 % */
  const r = rep('ocupacion').ejecutar({ desde: '2026-10-04', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 1);
  igual(r.filas[0].slice(0, 7), ['Lab 1', 'Campus Arequipa', 1, 24, 168, 14.29, 240]);
  assert.equal(r.filas[0][7], 'Bajo la meta');
  assert.equal(r.resumen[0].valor, 14.29, 'con un solo laboratorio activo la ocupación global es la suya');
  assert.equal(rep('ocupacion').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx).filas.length, 0);
  /* una ocupación igual a la meta cuenta como «En meta»: 10 h reservadas de 25 abiertas (35 h/semana × 5 días / 7) = 40 % */
  const justa = crearCtx({ laboratorios: [{ id: 'L1', nombre: 'Lab 1', sede: 'S', horasSemana: 35 }], reservas: [reserva({ fecha: '2026-10-05', sesiones: 1, horaInicio: 8, horaFin: 18 })] });
  const fj = rep('ocupacion').ejecutar({ desde: '2026-10-05', hasta: '2026-10-09' }, justa).filas[0];
  assert.equal(fj[5], 40);
  assert.equal(fj[7], 'En meta');
});

prueba('reporte de equipos por antigüedad y valor depreciado', () => {
  const datos = {
    laboratorios: [{ id: 'L1', nombre: 'Lab 1' }],
    equipos: [
      { id: 'E1', codigo: 'A-1', nombre: 'Router A', tipo: 'Router', laboratorio: 'L1', fechaCompra: '2024-10-31', unidades: 2, valorCompra: 6000, valorResidual: 600, vidaUtilAnios: 5 },
      { id: 'E2', codigo: 'A-2', nombre: 'Switch B', tipo: 'Switch', laboratorio: 'L1', fechaCompra: '2016-10-31', unidades: 1, valorCompra: 1000, valorResidual: 100, vidaUtilAnios: 5 }
    ]
  };
  const ctx = crearCtx(datos);
  const r = rep('antiguedad-equipos').ejecutar({ desde: '2000-01-01', hasta: '2026-10-31', tipo: 'Todos' }, ctx);
  /* Router: 2 años · lote de 2 → compra 12000 · acumulada 4320 · libros 7680 · 36 % — Switch: agotado → compra 1000, acumulada 900, libros 100 */
  igual(r.filas.map((f) => f[0]), ['A-2', 'A-1'], 'del más antiguo al más nuevo');
  igual(r.filas[1].slice(5), [2, 2, 12000, 4320, 7680, 36]);
  igual(r.filas[0].slice(5), [10.01, 1, 1000, 900, 100, 90]);
  assert.equal(r.resumen[0].valor, 13000);
  assert.equal(r.resumen[1].valor, 7780);
  assert.equal(r.resumen[2].valor, 40.15);   // 5220 / 13000
  assert.equal(rep('antiguedad-equipos').ejecutar({ desde: '2000-01-01', hasta: '2026-10-31', tipo: 'Switch' }, ctx).filas.length, 1);
  assert.equal(rep('antiguedad-equipos').ejecutar({ desde: '2020-01-01', hasta: '2026-10-31', tipo: 'Todos' }, ctx).filas.length, 1, 'el filtro de fechas aplica a la compra');
  assert.equal(rep('antiguedad-equipos').ejecutar({ desde: '2000-01-01', hasta: '2026-10-31', tipo: 'Todos' }, crearCtx({ equipos: [], laboratorios: [] })).resumen[2].valor, null);
});

prueba('reporte de uso de VLAN y subredes y su alerta de saturación', () => {
  const sub = (id, nombre, vlan, ip, prefijo, uso, previstos, extra) => Object.assign({ id, nombre, laboratorio: 'L1', vlan, ip1: ip[0], ip2: ip[1], ip3: ip[2], ip4: ip[3], prefijo, uso, hostsPrevistos: previstos, fechaAlta: '2026-09-01' }, extra);
  const datos = {
    laboratorios: [{ id: 'L1', nombre: 'Lab 1' }],
    subredes: [
      sub('S1', 'Justo en el umbral', 10, [10, 0, 0, 1], 27, 'Gestión', 24),        // 24 / 30 = 80 %
      sub('S2', 'Un host menos', 20, [10, 0, 1, 1], 27, 'Gestión', 23),             // 76,67 %
      sub('S3', 'Enlace lleno', 30, [172, 16, 0, 1], 30, 'Enlace punto a punto', 2),
      sub('S4', 'Loopback', 30, [172, 16, 255, 1], 32, 'Loopback', 1),
      sub('S5', 'Muy vieja', 40, [10, 0, 2, 1], 24, 'Gestión', 100, { fechaAlta: '2020-01-01' })
    ]
  };
  const ctx = crearCtx(datos);
  const r = rep('uso-vlan').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 4, 'el filtro de fechas aplica a la fecha de alta');
  const porNombre = {};
  r.filas.forEach((f) => { porNombre[f[0]] = f; });
  igual(porNombre['Justo en el umbral'].slice(2), [10, '10.0.0.0/27', '255.255.255.224', 30, 24, 80, 'Saturada']);
  assert.equal(porNombre['Un host menos'][7], 76.67);
  assert.equal(porNombre['Un host menos'][8], 'Con holgura');
  assert.equal(porNombre['Enlace lleno'][8], 'Con holgura', 'un enlace punto a punto nace lleno');
  assert.equal(porNombre['Loopback'][5], 1);
  assert.equal(r.resumen[0].valor, 4);
  assert.equal(r.resumen[1].valor, 3, 'VLAN 10, 20 y 30 (dos subredes comparten la 30)');
  assert.equal(r.resumen[2].valor, 1, 'solo la del umbral está saturada');
});

prueba('tablero: indicadores con datos mínimos', () => {
  const datos = {
    laboratorios: [{ id: 'L1', activo: true, horasSemana: 42 }, { id: 'L2', activo: false, horasSemana: 99 }],
    reservas: [reserva({ fecha: '2026-10-05', sesiones: 4, horaInicio: 8, horaFin: 14 })],
    equipos: [
      { id: 'E1', estado: 'Operativo', unidades: 10, valorCompra: 1000, valorResidual: 0, vidaUtilAnios: 10, fechaCompra: '2025-10-31' },
      { id: 'E2', estado: 'En mantenimiento', unidades: 5, valorCompra: 100, valorResidual: 0, vidaUtilAnios: 5, fechaCompra: '2026-10-31' },
      { id: 'E3', estado: 'De baja', unidades: 99, valorCompra: 1, valorResidual: 0, vidaUtilAnios: 5, fechaCompra: '2026-10-31' }
    ],
    incidencias: [{ id: 'I1', equipo: 'E1', estado: 'Abierta', unidadesAfectadas: 3 }, { id: 'I2', equipo: 'E1', estado: 'Resuelta', unidadesAfectadas: 9 }],
    subredes: [
      { id: 'S1', ip1: 10, ip2: 0, ip3: 0, ip4: 1, prefijo: 30, hostsPrevistos: 2, uso: 'Gestión' },
      { id: 'S2', ip1: 10, ip2: 0, ip3: 1, ip4: 1, prefijo: 24, hostsPrevistos: 10, uso: 'Gestión' },
      { id: 'S3', ip1: 10, ip2: 0, ip3: 2, ip4: 1, prefijo: 30, hostsPrevistos: 2, uso: 'Enlace punto a punto' }
    ]
  };
  const ctx = crearCtx(datos);
  const ind = (t) => C.tablero.find((x) => x.titulo.indexOf(t) === 0).calcular(ctx);
  assert.equal(ind('Sesiones'), 4);
  /* 4 sesiones × 6 h = 24 h de 42 × 30 / 7 = 180 → 13,33 % */
  assert.equal(ind('Ocupación'), 13.33);
  assert.equal(ind('Incidencias abiertas'), 1);
  /* operativas: 10 − 3 afectadas = 7 de 15 unidades no dadas de baja → 46,67 % */
  assert.equal(ind('Equipos operativos'), 46.67);
  /* E1: 1 año de 10 sobre 1000 × 10 unidades = 9000; E2: nuevo, 100 × 5 = 500; el equipo de baja no cuenta */
  assert.equal(ind('Valor en libros'), 9500);
  assert.equal(ind('Subredes saturadas'), 1, 'S1 al 100 %; S3 es un enlace y S2 está al 3,9 %');
  const g = C.tableroGrafico.calcular(ctx);
  assert.equal(g.etiquetas.length, 6);
  assert.equal(g.valores[5], 24, 'las cuatro sesiones de octubre');
  assert.equal(g.valores[0], 0);
});

console.log('lab-redes · formulas.test.mjs · ' + n + ' pruebas OK');
