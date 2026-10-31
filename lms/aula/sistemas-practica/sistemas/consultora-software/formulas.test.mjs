/*
 * formulas.test.mjs · Prueba sin navegador de las fórmulas de «consultora-software»
 * ----------------------------------------------------------------------------
 *   node sistemas/consultora-software/formulas.test.mjs
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

/* Los objetos del config nacen en otro contexto de vm: se normalizan antes de comparar. */
const igual = (real, esperado, msg) => assert.deepEqual(JSON.parse(JSON.stringify(real)), esperado, msg);

let n = 0;
function prueba(nombre, fn) {
  try { fn(); n += 1; } catch (e) { console.error('✗ ' + nombre + '\n  ' + (e && e.message ? e.message : e)); process.exitCode = 1; throw e; }
}

/* ---------- Costo hora cargado ---------- */
prueba('costo hora cargado = sueldo × (1 + carga) / horas productivas', () => {
  const ctx = crearCtx({});
  assert.equal(calc('consultores', 'costoHora', { sueldoMensual: 9800 }, ctx), 115.5);     // 9800 × 1,65 / 140
  assert.equal(calc('consultores', 'costoHora', { sueldoMensual: 5600 }, ctx), 66);
  assert.equal(calc('consultores', 'costoHora', { sueldoMensual: 3200 }, ctx), 37.71);     // 5280 / 140 = 37,7142…
  assert.equal(calc('consultores', 'costoHora', { sueldoMensual: 6000 }, crearCtx({}, { params: { factorCarga: 50, horasProductivas: 120 } })), 75);
  assert.equal(calc('consultores', 'costoHora', { sueldoMensual: 6000 }, crearCtx({}, { params: { horasProductivas: 0 } })), 0, 'sin horas productivas no se divide por cero');
  assert.equal(calc('consultores', 'costoHora', {}, ctx), 0, 'sin sueldo, costo cero');
});

/* ---------- Plazo transcurrido y valor planificado ---------- */
prueba('PV = costo presupuestado × % del plazo transcurrido (con bordes)', () => {
  const p = { costoBase: 100000, fechaInicio: '2026-10-01', fechaFin: '2026-10-31', avancePct: 0, presupuesto: 150000 };
  const pv = (hoy, proy = p) => calc('proyectos', 'pv', Object.assign({ id: 'X' }, proy), crearCtx({ partes: [] }, { hoy }));
  assert.equal(pv('2026-09-30'), 0, 'antes del inicio');
  assert.equal(pv('2026-10-01'), 0, 'el día de inicio no hay plazo transcurrido');
  assert.equal(pv('2026-10-16'), 50000, '15 de 30 días');
  assert.equal(pv('2026-10-31'), 100000, 'el día del fin');
  assert.equal(pv('2026-12-01'), 100000, 'después del fin no pasa del 100 %');
  assert.equal(pv('2026-10-02', { costoBase: 1000, fechaInicio: '2026-10-01', fechaFin: '2026-10-04' }), 333.3, '1/3 del plazo = 33,33 %');
  assert.equal(pv('2026-10-05', { costoBase: 1000, fechaInicio: '2026-10-05', fechaFin: '2026-10-05' }), 1000, 'proyecto de un solo día, sin dividir por cero');
  assert.equal(pv('2026-10-04', { costoBase: 1000, fechaInicio: '2026-10-05', fechaFin: '2026-10-05' }), 0);
  assert.equal(pv('2026-10-16', { costoBase: 1000 }), 0, 'sin fechas no hay plan');
});

prueba('EV = costo presupuestado × avance real', () => {
  const ctx = crearCtx({ partes: [] });
  assert.equal(calc('proyectos', 'ev', { id: 'X', costoBase: 80000, avancePct: 25, fechaInicio: '2026-10-01', fechaFin: '2026-12-01' }, ctx), 20000);
  assert.equal(calc('proyectos', 'ev', { id: 'X', costoBase: 80000, avancePct: 0 }, ctx), 0);
  assert.equal(calc('proyectos', 'ev', { id: 'X', costoBase: 33333, avancePct: 33 }, ctx), 10999.89);
});

/* ---------- CPI, SPI, EAC y margen ---------- */
prueba('CPI, SPI y margen proyectado con partes aprobados', () => {
  const datos = {
    partes: [
      { id: 'PAR-1', estado: 'Emitida', fecha: '2026-10-10', totales: { costoHora: 50 }, lineas: [{ item: 'P1', horas: 60, facturable: true }, { item: 'P1', horas: 20, facturable: false }, { item: 'P2', horas: 500, facturable: true }] },
      { id: 'PAR-2', estado: 'Borrador', fecha: '2026-10-11', totales: { costoHora: 50 }, lineas: [{ item: 'P1', horas: 999, facturable: true }] },
      { id: 'PAR-3', estado: 'Anulada', fecha: '2026-10-11', totales: { costoHora: 50 }, lineas: [{ item: 'P1', horas: 999, facturable: true }] }
    ]
  };
  const ctx = crearCtx(datos, { hoy: '2026-10-11' });
  const p = { id: 'P1', costoBase: 10000, presupuesto: 12000, avancePct: 50, fechaInicio: '2026-10-01', fechaFin: '2026-10-21' };
  /* AC = (60 + 20) × 50 = 4000 (el borrador, el anulado y el otro proyecto no cuentan); EV = 5000; PV = 10/20 × 10000 = 5000 */
  assert.equal(calc('proyectos', 'costoReal', p, ctx), 4000);
  assert.equal(calc('proyectos', 'horasReales', p, ctx), 80);
  assert.equal(calc('proyectos', 'cpi', p, ctx), 1.25);
  assert.equal(calc('proyectos', 'spi', p, ctx), 1);
  /* EAC = BAC × AC / EV = 10000 × 4000 / 5000 = 8000 → margen = (12000 − 8000) / 12000 = 33,33 % */
  assert.equal(calc('proyectos', 'margen', p, ctx), 33.33);
  /* sobrecosto: AC 4000 con EV 2000 → CPI 0,5, EAC 20000 → margen (12000 − 20000) / 12000 = −66,67 % */
  assert.equal(calc('proyectos', 'cpi', Object.assign({}, p, { avancePct: 20 }), ctx), 0.5);
  assert.equal(calc('proyectos', 'margen', Object.assign({}, p, { avancePct: 20 }), ctx), -66.67);
  /* sin avance todavía: el margen es el planificado (BAC) y el CPI es 0 porque ya hay costo */
  assert.equal(calc('proyectos', 'margen', Object.assign({}, p, { avancePct: 0 }), ctx), 16.67);
  assert.equal(calc('proyectos', 'cpi', Object.assign({}, p, { avancePct: 0 }), ctx), 0);
  /* sin horas cargadas: CPI indefinido, no se divide por cero */
  const q = { id: 'P9', costoBase: 10000, presupuesto: 12000, avancePct: 10, fechaInicio: '2026-10-01', fechaFin: '2026-10-21' };
  assert.equal(calc('proyectos', 'cpi', q, ctx), null);
  assert.equal(calc('proyectos', 'margen', q, ctx), 16.67);
  /* proyecto que aún no empieza: SPI indefinido */
  assert.equal(calc('proyectos', 'spi', { id: 'P9', costoBase: 10000, presupuesto: 12000, avancePct: 0, fechaInicio: '2026-11-01', fechaFin: '2026-12-01' }, ctx), null);
  assert.equal(calc('proyectos', 'margen', { id: 'P9', costoBase: 10000, presupuesto: 0, avancePct: 0 }, ctx), null, 'sin precio no hay margen');
});

/* ---------- Utilización ---------- */
prueba('utilización del consultor en 30 días', () => {
  const datos = {
    partes: [
      { id: 'A', estado: 'Emitida', consultor: 'C1', fecha: '2026-10-31', lineas: [{ item: 'P1', horas: 50, facturable: true }, { item: 'P2', horas: 20, facturable: true }, { item: 'P3', horas: 30, facturable: false }] },
      { id: 'B', estado: 'Emitida', consultor: 'C1', fecha: '2026-10-02', lineas: [{ item: 'P1', horas: 14, facturable: true }] },   // hoy − 29 días: entra
      { id: 'C', estado: 'Emitida', consultor: 'C1', fecha: '2026-10-01', lineas: [{ item: 'P1', horas: 99, facturable: true }] },   // hoy − 30 días: fuera
      { id: 'D', estado: 'Emitida', consultor: 'C2', fecha: '2026-10-31', lineas: [{ item: 'P1', horas: 99, facturable: true }] },
      { id: 'E', estado: 'Borrador', consultor: 'C1', fecha: '2026-10-31', lineas: [{ item: 'P1', horas: 99, facturable: true }] }
    ]
  };
  const ctx = crearCtx(datos);
  /* facturables = 50 + 20 + 14 = 84 de 140 productivas → 60 % */
  assert.equal(calc('consultores', 'utilizacion', { id: 'C1' }, ctx), 60);
  assert.equal(calc('consultores', 'utilizacion', { id: 'C9' }, ctx), 0);
  assert.equal(calc('consultores', 'utilizacion', { id: 'C1' }, crearCtx(datos, { params: { horasProductivas: 0 } })), 0, 'capacidad cero → 0 %, no Infinity');
});

/* ---------- Propuestas ---------- */
prueba('valor ponderado y días abierta de una propuesta', () => {
  const ctx = crearCtx({});
  assert.equal(calc('propuestas', 'valorPonderado', { monto: 100000, probabilidad: 35 }, ctx), 35000);
  assert.equal(calc('propuestas', 'valorPonderado', { monto: 33333.33, probabilidad: 15 }, ctx), 5000);   // 4999,9995 → 5000
  assert.equal(calc('propuestas', 'valorPonderado', { monto: 100000 }, ctx), 0);
  assert.equal(calc('propuestas', 'diasAbierta', { etapa: 'Negociación', fechaEnvio: '2026-10-21' }, ctx), 10);
  assert.equal(calc('propuestas', 'diasAbierta', { etapa: 'Ganada', fechaEnvio: '2026-10-21' }, ctx), null);
  assert.equal(calc('propuestas', 'diasAbierta', { etapa: 'Perdida', fechaEnvio: '2026-10-21' }, ctx), null);
  assert.equal(calc('propuestas', 'diasAbierta', { etapa: 'Prospecto', fechaEnvio: '2026-11-05' }, ctx), 0, 'una fecha futura no da días negativos');
});

/* ---------- Parte de horas ---------- */
prueba('totales del parte de horas', () => {
  const datos = { consultores: [{ id: 'C1', sueldoMensual: 8400 }] };
  const ctx = crearCtx(datos);
  const t = op('partes').calcular({ consultor: 'C1', lineas: [{ item: 'P1', precio: 150, horas: 10, facturable: true }, { item: 'P2', precio: 150, horas: 6, facturable: false }] }, ctx);
  /* costo hora = 8400 × 1,65 / 140 = 99 · costo = 16 × 99 = 1584 · valor facturable = 10 × 150 = 1500 */
  igual(t, { horas: 16, horasFacturables: 10, costoHora: 99, costo: 1584, total: 1500 });
  const media = op('partes').calcular({ consultor: 'C1', lineas: [{ item: 'P1', precio: 133.33, horas: 7.5, facturable: true }] }, ctx);
  assert.equal(media.total, 999.98);                  // 7,5 × 133,33 = 999,975 → 999,98
  assert.equal(media.horas, 7.5);
  assert.equal(op('partes').calcular({ lineas: [] }, ctx).costoHora, 0, 'sin consultor');
  assert.equal(op('partes').calcular({ consultor: 'C1', lineas: [] }, ctx).total, 0, 'sin líneas');
  assert.equal(op('partes').calcular({ consultor: 'C1', lineas: [] }, crearCtx(datos, { params: { horasProductivas: 0 } })).costoHora, 0, 'sin horas productivas');
  /* el importe de cada línea ignora lo no facturable */
  assert.equal(op('partes').lineas.importe({ horas: 4, precio: 100, facturable: false }), 0);
  assert.equal(op('partes').lineas.importe({ horas: 4, precio: 100, facturable: true }), 400);
});

prueba('reglas del parte de horas', () => {
  const datos = { proyectos: [{ id: 'A', estado: 'En ejecución' }, { id: 'B', estado: 'Planificado' }, { id: 'C', estado: 'Cerrado' }, { id: 'D', estado: 'Cancelado' }] };
  const ctx = crearCtx(datos);
  const tope = regla(op('partes'), 'tope-horas'), vigente = regla(op('partes'), 'proyecto-vigente');
  assert.equal(tope({ lineas: [{ horas: 100 }, { horas: 100 }] }, ctx), true, '200 horas justas');
  assert.equal(tope({ lineas: [{ horas: 100 }, { horas: 100.5 }] }, ctx), false);
  assert.equal(vigente({ lineas: [{ item: 'A' }, { item: 'B' }] }, ctx), true);
  assert.equal(vigente({ lineas: [{ item: 'A' }, { item: 'C' }] }, ctx), false);
  assert.equal(vigente({ lineas: [{ item: 'D' }] }, ctx), false);
  assert.equal(vigente({ lineas: [{ item: 'ZZZ' }] }, ctx), false, 'proyecto inexistente');
});

/* ---------- Factura por hito ---------- */
prueba('totales de la factura por hito: IGV, detracción y neto', () => {
  const datos = { proyectos: [{ id: 'P1', presupuesto: 100000 }, { id: 'P2', presupuesto: 33333 }, { id: 'P3', presupuesto: 500 }] };
  const ctx = crearCtx(datos);
  const calcular = op('facturas').calcular;
  igual(calcular({ proyecto: 'P1', porcentajeHito: 30 }, ctx), { base: 30000, igv: 5400, total: 35400, detraccion: 4248, neto: 31152 });
  /* redondeo: 33333 × 33 % = 10999,89 · IGV 1979,98 · total 12979,87 · detracción 1557,58 · neto 11422,29 */
  igual(calcular({ proyecto: 'P2', porcentajeHito: 33 }, ctx), { base: 10999.89, igv: 1979.98, total: 12979.87, detraccion: 1557.58, neto: 11422.29 });
  /* debajo del tope de detracción no hay detracción: 500 + 90 = 590 */
  igual(calcular({ proyecto: 'P3', porcentajeHito: 100 }, ctx), { base: 500, igv: 90, total: 590, detraccion: 0, neto: 590 });
  /* borde exacto: el total 590 NO supera un tope de 590 y SÍ supera uno de 589,99 */
  assert.equal(calcular({ proyecto: 'P3', porcentajeHito: 100 }, crearCtx(datos, { params: { topeDetraccion: 590 } })).detraccion, 0);
  assert.equal(calcular({ proyecto: 'P3', porcentajeHito: 100 }, crearCtx(datos, { params: { topeDetraccion: 589.99 } })).detraccion, 70.8);   // 590 × 12 %
  igual(calcular({ proyecto: 'P1', porcentajeHito: 0 }, ctx), { base: 0, igv: 0, total: 0, detraccion: 0, neto: 0 });
  igual(calcular({ porcentajeHito: 50 }, ctx), { base: 0, igv: 0, total: 0, detraccion: 0, neto: 0 }, 'sin proyecto');
  assert.equal(calcular({ proyecto: 'P1', porcentajeHito: 30 }, crearCtx(datos, { params: { igv: 10, detraccion: 0 } })).total, 33000, 'el IGV sale del parámetro');
});

prueba('reglas y efectos de la factura por hito', () => {
  const datos = {
    proyectos: [{ id: 'P1', nombre: 'Proyecto uno', estado: 'En ejecución', avancePct: 85 }, { id: 'P2', nombre: 'Proyecto dos', estado: 'Cancelado', avancePct: 100 }],
    facturas: [
      { id: 'F1', proyecto: 'P1', estado: 'Cobrada', porcentajeHito: 50 },
      { id: 'F2', proyecto: 'P1', estado: 'Emitida', porcentajeHito: 30 },
      { id: 'F3', proyecto: 'P1', estado: 'Anulada', porcentajeHito: 40 },
      { id: 'F4', proyecto: 'P1', estado: 'Borrador', porcentajeHito: 40 }
    ]
  };
  const ctx = crearCtx(datos), o = op('facturas');
  const tope = regla(o, 'tope-contrato'), facturable = regla(o, 'proyecto-facturable');
  assert.equal(tope({ id: 'F9', proyecto: 'P1', porcentajeHito: 20 }, ctx), true, '50 + 30 + 20 = 100');
  assert.equal(tope({ id: 'F9', proyecto: 'P1', porcentajeHito: 21 }, ctx), false);
  assert.equal(tope({ id: 'F2', proyecto: 'P1', porcentajeHito: 50 }, ctx), true, 'al editar no se cuenta a sí misma');
  assert.equal(facturable({ proyecto: 'P1' }, ctx), true);
  assert.equal(facturable({ proyecto: 'P2' }, ctx), false);
  /* acumulado 80 ≤ avance 85: emite */
  o.alEmitir({ id: 'F2', proyecto: 'P1' }, ctx);
  datos.facturas.push({ id: 'F5', proyecto: 'P1', estado: 'Emitida', porcentajeHito: 10 });
  assert.throws(() => o.alEmitir({ id: 'F5', proyecto: 'P1' }, ctx), /por encima del avance/);   // 90 > 85
  /* al llegar a 100 % facturado con avance 100, el proyecto se cierra; al anular, se reabre */
  datos.proyectos[0].avancePct = 100;
  datos.facturas.push({ id: 'F6', proyecto: 'P1', estado: 'Emitida', porcentajeHito: 10 });
  o.alEmitir({ id: 'F6', proyecto: 'P1' }, ctx);
  assert.equal(datos.proyectos[0].estado, 'Cerrado');
  datos.facturas.find((f) => f.id === 'F6').estado = 'Anulada';
  o.alAnular({ id: 'F6', proyecto: 'P1' }, ctx);
  assert.equal(datos.proyectos[0].estado, 'En ejecución');
});

/* ---------- Reglas de las entidades ---------- */
prueba('reglas de proyectos y propuestas', () => {
  const ctx = crearCtx({});
  const pr = ent('proyectos');
  assert.equal(regla(pr, 'fechas-coherentes')({ fechaInicio: '2026-10-05', fechaFin: '2026-10-05' }), true);
  assert.equal(regla(pr, 'fechas-coherentes')({ fechaInicio: '2026-10-05', fechaFin: '2026-10-04' }), false);
  assert.equal(regla(pr, 'costo-menor-precio')({ costoBase: 100, presupuesto: 100 }), true);
  assert.equal(regla(pr, 'costo-menor-precio')({ costoBase: 100.01, presupuesto: 100 }), false);
  assert.equal(regla(pr, 'cerrado-al-cien')({ estado: 'Cerrado', avancePct: 99 }), false);
  assert.equal(regla(pr, 'cerrado-al-cien')({ estado: 'Cerrado', avancePct: 100 }), true);
  assert.equal(regla(pr, 'cerrado-al-cien')({ estado: 'En pausa', avancePct: 10 }), true);
  const pp = ent('propuestas');
  assert.equal(regla(pp, 'probabilidad-etapa')({ etapa: 'Ganada', probabilidad: 100 }), true);
  assert.equal(regla(pp, 'probabilidad-etapa')({ etapa: 'Ganada', probabilidad: 90 }), false);
  assert.equal(regla(pp, 'probabilidad-etapa')({ etapa: 'Perdida', probabilidad: 0 }), true);
  assert.equal(regla(pp, 'probabilidad-etapa')({ etapa: 'Perdida', probabilidad: 5 }), false);
  assert.equal(regla(pp, 'probabilidad-etapa')({ etapa: 'Negociación', probabilidad: 55 }), true);
  assert.equal(regla(pp, 'cierre-posterior')({ fechaEnvio: '2026-10-05', fechaCierre: '2026-10-04' }), false);
  void ctx;
});

prueba('facturado por cliente suma solo hitos emitidos o cobrados', () => {
  const datos = {
    proyectos: [{ id: 'P1', cliente: 'CLI-1' }, { id: 'P2', cliente: 'CLI-1' }, { id: 'P3', cliente: 'CLI-2' }],
    facturas: [
      { id: 'F1', proyecto: 'P1', estado: 'Cobrada', totales: { base: 1000.5 } },
      { id: 'F2', proyecto: 'P2', estado: 'Emitida', totales: { base: 2000.25 } },
      { id: 'F3', proyecto: 'P2', estado: 'Anulada', totales: { base: 9999 } },
      { id: 'F4', proyecto: 'P2', estado: 'Borrador', totales: { base: 9999 } },
      { id: 'F5', proyecto: 'P3', estado: 'Cobrada', totales: { base: 500 } }
    ]
  };
  const ctx = crearCtx(datos);
  assert.equal(calc('clientes', 'facturado', { id: 'CLI-1' }, ctx), 3000.75);
  assert.equal(calc('clientes', 'facturado', { id: 'CLI-2' }, ctx), 500);
  assert.equal(calc('clientes', 'facturado', { id: 'CLI-3' }, ctx), 0);
});

/* ---------- Reportes y tablero ---------- */
prueba('reportes: utilización, pipeline y facturación mensual', () => {
  const datos = {
    consultores: [{ id: 'C1', nombre: 'Ana', cargo: 'Analista QA', activo: true }, { id: 'C2', nombre: 'Beto', cargo: 'Analista QA', activo: false }],
    partes: [
      { id: 'A', estado: 'Emitida', consultor: 'C1', fecha: '2026-10-15', lineas: [{ item: 'P1', horas: 105, facturable: true }, { item: 'P1', horas: 20, facturable: false }] },
      { id: 'B', estado: 'Emitida', consultor: 'C2', fecha: '2026-10-15', lineas: [{ item: 'P1', horas: 10, facturable: true }] }
    ],
    propuestas: [
      { id: 'X1', etapa: 'Negociación', monto: 100000, probabilidad: 50, fechaEnvio: '2026-10-01' },
      { id: 'X2', etapa: 'Ganada', monto: 40000, probabilidad: 100, fechaEnvio: '2026-10-02' },
      { id: 'X3', etapa: 'Perdida', monto: 60000, probabilidad: 0, fechaEnvio: '2026-10-03' },
      { id: 'X4', etapa: 'Ganada', monto: 1, probabilidad: 100, fechaEnvio: '2026-01-01' }
    ],
    facturas: [
      { id: 'F1', estado: 'Emitida', fecha: '2026-10-05', totales: { base: 1000, igv: 180, total: 1180, detraccion: 141.6, neto: 1038.4 } },
      { id: 'F2', estado: 'Cobrada', fecha: '2026-10-20', totales: { base: 500, igv: 90, total: 590, detraccion: 0, neto: 590 } },
      { id: 'F3', estado: 'Anulada', fecha: '2026-10-20', totales: { base: 9999, igv: 0, total: 9999, detraccion: 0, neto: 9999 } }
    ]
  };
  const ctx = crearCtx(datos);
  /* 30 días: capacidad = 140 h; Ana facturó 105 h → 75 % (en meta); Beto está inactivo y no aparece */
  const u = rep('utilizacion').ejecutar({ desde: '2026-10-02', hasta: '2026-10-31' }, ctx);
  assert.equal(u.filas.length, 1);
  igual(u.filas[0].slice(2), [125, 105, 140, 75, 'En meta']);
  assert.equal(u.resumen[1].valor, 1);
  const pl = rep('pipeline').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  assert.equal(pl.resumen[0].valor, 50000, 'abierto ponderado = 100000 × 50 %');
  assert.equal(pl.resumen[1].valor, 40000);
  assert.equal(pl.resumen[2].valor, 50, '1 ganada de 2 cerradas');
  assert.equal(rep('pipeline').ejecutar({ desde: '2026-10-04', hasta: '2026-10-31' }, ctx).resumen[2].valor, null, 'sin propuestas cerradas la tasa es indefinida');
  const f = rep('facturacion-hitos').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  igual(f.filas[0].slice(1), [2, 1500, 270, 1770, 141.6, 1038.4]);
  assert.equal(f.resumen[2].valor, 1038.4, 'solo lo emitido está por cobrar');
});

prueba('tablero: indicadores con datos mínimos', () => {
  const datos = {
    proyectos: [{ id: 'P1', estado: 'En ejecución', costoBase: 1000, presupuesto: 2000, avancePct: 10, fechaInicio: '2026-10-01', fechaFin: '2026-10-21' }, { id: 'P2', estado: 'Cerrado' }],
    consultores: [{ id: 'C1', activo: true }, { id: 'C2', activo: true }],
    partes: [{ id: 'A', estado: 'Emitida', consultor: 'C1', fecha: '2026-10-25', totales: { costoHora: 10, horasFacturables: 140 }, lineas: [{ item: 'P1', horas: 140, facturable: true }] }],
    propuestas: [{ id: 'X', etapa: 'Prospecto', monto: 1000, probabilidad: 10 }],
    facturas: []
  };
  const ctx = crearCtx(datos);
  const ind = (t) => C.tablero.find((x) => x.titulo.indexOf(t) === 0).calcular(ctx);
  assert.equal(ind('Proyectos en ejecución'), 1);
  assert.equal(ind('Horas facturables'), 140);
  assert.equal(ind('Utilización'), 50, '140 h facturables entre 2 consultores × 140 h');
  assert.equal(ind('Facturado'), 0);
  assert.equal(ind('Pipeline'), 100);
  /* P1 a mitad del plazo con 10 % de avance: SPI = 100 / 500 = 0,2 → en riesgo */
  assert.equal(ind('Proyectos en riesgo'), 1);
});

console.log('consultora-software · formulas.test.mjs · ' + n + ' pruebas OK');
