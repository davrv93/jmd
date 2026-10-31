#!/usr/bin/env node
/*
 * formulas.test.mjs · Prueba de las fórmulas de «abogados» SIN navegador
 * ----------------------------------------------------------------------------
 *   node sistemas/abogados/formulas.test.mjs
 * Carga config.js en node:vm con un `window` falso, arma un `ctx` mínimo (param,
 * redondear, suma, fechas, datos en memoria) y verifica con resultados calculados
 * a mano cada fórmula propia del rubro: horas facturables y su fracción, valor de
 * la actuación (tarifa, recargo, convenio), plazos en días hábiles, cuota litis,
 * saldo de la provisión de fondos, reglas y reportes.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const HOY = '2026-10-31'; /* es sábado */

/* ---------- Carga del config ---------- */
function cargar() {
  const caja = { window: {} };
  vm.createContext(caja);
  vm.runInContext(fs.readFileSync(path.join(AQUI, 'config.js'), 'utf8'), caja, { filename: 'config.js' });
  return caja.window.SISTEMA;
}
const CFG = cargar();
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/* ---------- ctx falso (réplica mínima del núcleo) ---------- */
const aFecha = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)); };
const deFecha = (d) => d.toISOString().slice(0, 10);
const redondear = (n) => { if (typeof n !== 'number' || !isFinite(n)) { return 0; } const s = n < 0 ? -1 : 1; return s * Math.round(Math.abs(n) * 100 + 1e-7) / 100; };

function crearCtx(opts = {}) {
  const params = {};
  CFG.parametros.forEach((p) => { params[p.id] = p.valor; });
  Object.assign(params, opts.params || {});
  const datos = opts.datos || {};
  const calls = [];
  const ctx = {
    calls,
    datos: {
      listar: (ent, fn) => (datos[ent] || []).filter((r) => !fn || fn(r)),
      obtener: (ent, id) => (datos[ent] || []).filter((r) => r.id === id)[0] || null,
      contar: (ent) => (datos[ent] || []).length,
      crear: (ent, o) => { (datos[ent] = datos[ent] || []).push(o); return o; },
      actualizar: (ent, id, parche) => {
        const r = (datos[ent] || []).filter((x) => x.id === id)[0];
        if (!r) { throw new Error('no existe ' + id); }
        Object.assign(r, parche);
        calls.push([ent, id, parche]);
        return r;
      },
      eliminar: () => true
    },
    param: (id) => (params[id] === undefined ? 0 : params[id]),
    hoy: () => opts.hoy || HOY,
    usuario: () => (opts.usuario === undefined ? null : opts.usuario),
    redondear,
    suma: (arr, fn) => (arr || []).reduce((t, x) => t + (fn ? fn(x) : x), 0),
    agrupar: (arr, fn) => { const g = {}; arr.forEach((x) => { const k = fn(x); (g[k] = g[k] || []).push(x); }); return g; },
    fmt: { moneda: (n) => 'S/ ' + n.toFixed(2), fecha: (s) => s, num: (n) => String(n), pct: (n) => n + ' %' },
    fechaMas: (s, dias) => { const d = aFecha(s); d.setUTCDate(d.getUTCDate() + dias); return deFecha(d); },
    mes: (s) => s.slice(0, 7),
    diasEntre: (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000)
  };
  return ctx;
}

/* ctx con TODAS las semillas (fechas resueltas y totales calculados), como en el primer arranque */
function ctxSemillas() {
  const sem = JSON.parse(JSON.stringify(CFG.semillas));
  const ctx0 = crearCtx();
  const resolver = (v) => {
    if (typeof v === 'string') { const m = /^@(-?\d+)$/.exec(v); return m ? ctx0.fechaMas(HOY, parseInt(m[1], 10)) : v; }
    if (Array.isArray(v)) { return v.map(resolver); }
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach((k) => { o[k] = resolver(v[k]); }); return o; }
    return v;
  };
  const datos = resolver(sem);
  const ctx = crearCtx({ datos });
  CFG.operaciones.forEach((op) => datos[op.id].forEach((d) => { d.totales = op.calcular(d, ctx); }));
  return ctx;
}

const entidad = (id) => CFG.entidades.filter((e) => e.id === id)[0];
const operacion = (id) => CFG.operaciones.filter((o) => o.id === id)[0];
const reporte = (id) => CFG.reportes.filter((r) => r.id === id)[0];
const calculado = (ent, id) => entidad(ent).calculados.filter((c) => c.id === id)[0].formula;
const regla = (lista, id) => lista.reglas.filter((r) => r.id === id)[0].validar;

let n = 0;
function prueba(nombre, fn) {
  try { fn(); n += 1; console.log('  ✓ ' + nombre); }
  catch (e) { console.error('  ✗ ' + nombre + '\n    ' + (e && e.message ? e.message : e)); process.exitCode = 1; }
}


/* El núcleo redondea cada total a 2 decimales (Calc.totales): lo repetimos aquí. */
function tot(op, doc, ctx) {
  const t = op.calcular(doc, ctx), r = {};
  Object.keys(t).forEach((k) => { r[k] = redondear(t[k]); });
  return r;
}

/* ============================ Horas facturables y valor de la actuación ============================ */
console.log('Horas facturables y valor de la actuación (actuaciones.calcular)');
const actu = operacion('actuaciones');
const datosAct = (extra) => Object.assign({
  tarifas: [{ id: 'T3', tarifaHora: 280 }, { id: 'T1', tarifaHora: 480 }],
  abogados: [{ id: 'A1', tarifa: 'T3' }, { id: 'A2', tarifa: 'T1' }],
  expedientes: [{ id: 'E1', cliente: 'C1' }],
  clientes: [{ id: 'C1', descuentoConvenio: 0 }]
}, extra || {});
const parte = (horas, noCob, extra) => Object.assign({ abogado: 'A1', expediente: 'E1', actividad: 'Redacción de escritos', horas, horasNoCobrables: noCob }, extra || {});

prueba('1 hora exacta: 1 hora facturable × 280 = 280', () => {
  const t = tot(actu, parte(1, 0), crearCtx({ datos: datosAct() }));
  assert.equal(t.horasFacturables, 1); assert.equal(t.tarifa, 280); assert.equal(t.total, 280);
});
prueba('1.1 horas suben al siguiente cuarto: 1.25 h × 280 = 350', () => {
  const t = tot(actu, parte(1.1, 0), crearCtx({ datos: datosAct() }));
  assert.equal(t.horasFacturables, 1.25); assert.equal(t.total, 350);
});
prueba('0.25 h es el mínimo y 0.26 h sube a 0.5 h', () => {
  assert.equal(tot(actu, parte(0.25, 0), crearCtx({ datos: datosAct() })).total, 70);
  const t = tot(actu, parte(0.26, 0), crearCtx({ datos: datosAct() }));
  assert.equal(t.horasFacturables, 0.5); assert.equal(t.total, 140);
});
prueba('3.75 h ya es múltiplo del cuarto: no sube (3.75 × 280 = 1050)', () => {
  const t = tot(actu, parte(3.75, 0), crearCtx({ datos: datosAct() }));
  assert.equal(t.horasFacturables, 3.75); assert.equal(t.total, 1050);
});
prueba('error de coma flotante: 2.2 − 0.7 = 1.5000000000000002 no debe subir a 1.75', () => {
  const t = tot(actu, parte(2.2, 0.7), crearCtx({ datos: datosAct() }));
  assert.equal(t.horasFacturables, 1.5); assert.equal(t.total, 420);
});
prueba('horas no cobrables mayores o iguales a las trabajadas: cero facturable y sin NaN', () => {
  const t = tot(actu, parte(2, 3), crearCtx({ datos: datosAct() }));
  assert.equal(t.horasFacturables, 0); assert.equal(t.total, 0);
  assert.equal(tot(actu, parte(2, 2), crearCtx({ datos: datosAct() })).total, 0);
});
prueba('la fracción sale de Configuración: 0.5 → 1.1 h pasa a 1.5 h; fracción 0 → sin redondeo', () => {
  const a = tot(actu, parte(1.1, 0), crearCtx({ datos: datosAct(), params: { fraccionHoras: 0.5 } }));
  assert.equal(a.horasFacturables, 1.5); assert.equal(a.total, 420);
  const b = tot(actu, parte(1.1, 0), crearCtx({ datos: datosAct(), params: { fraccionHoras: 0 } }));
  assert.equal(b.horasFacturables, 1.1); assert.equal(b.total, 308);
});
prueba('cada abogado usa la tarifa de su categoría (socio 480, asociado senior 280)', () => {
  assert.equal(tot(actu, parte(2, 0, { abogado: 'A2' }), crearCtx({ datos: datosAct() })).total, 960);
  assert.equal(tot(actu, parte(2, 0, { abogado: 'A1' }), crearCtx({ datos: datosAct() })).total, 560);
});
prueba('audiencia: recargo del 20 % (1.5 h × 280 = 420 + 84 = 504)', () => {
  const t = tot(actu, parte(1.5, 0, { actividad: 'Audiencia' }), crearCtx({ datos: datosAct() }));
  assert.equal(t.recargo, 84); assert.equal(t.total, 504);
  assert.equal(tot(actu, parte(1.5, 0, { actividad: 'Audiencia' }), crearCtx({ datos: datosAct(), params: { recargoAudiencia: 0 } })).total, 420);
});
prueba('descuento por convenio del cliente: audiencia con 10 % → 504 − 50.40 = 453.60', () => {
  const t = tot(actu, parte(1.5, 0, { actividad: 'Audiencia' }), crearCtx({ datos: datosAct({ clientes: [{ id: 'C1', descuentoConvenio: 10 }] }) }));
  assert.equal(t.descuento, 50.4); assert.equal(t.total, 453.6);
  const u = tot(actu, parte(2, 0), crearCtx({ datos: datosAct({ clientes: [{ id: 'C1', descuentoConvenio: 30 }] }) }));
  assert.equal(u.total, 392);
});
prueba('sin abogado o sin expediente: total cero, sin NaN ni error', () => {
  const t = tot(actu, { horas: 2, actividad: 'Audiencia' }, crearCtx({ datos: datosAct() }));
  assert.equal(t.total, 0); assert.equal(t.tarifa, 0);
});

/* ============================ Reglas y efectos de las actuaciones ============================ */
console.log('Reglas y efectos de las actuaciones');
prueba('regla: horas no cobrables ≤ horas trabajadas (igual sí, mayor no)', () => {
  const r = regla(actu, 'no-cobrables-menor');
  assert.equal(r({ horas: 2, horasNoCobrables: 2 }), true);
  assert.equal(r({ horas: 2, horasNoCobrables: 2.25 }), false);
  assert.equal(r({ horas: 2 }), true);
});
prueba('regla: solo expedientes activos y desde su fecha de apertura', () => {
  const r = regla(actu, 'expediente-abierto');
  const ctx = crearCtx({ datos: { expedientes: [{ id: 'E1', estado: 'Activo', fechaApertura: '2026-10-01' }, { id: 'E2', estado: 'Suspendido', fechaApertura: '2026-01-01' }] } });
  assert.equal(r({ expediente: 'E1', fecha: '2026-10-01' }, ctx), true, 'el mismo día de la apertura');
  assert.equal(r({ expediente: 'E1', fecha: '2026-09-30' }, ctx), false, 'un día antes de abrir');
  assert.equal(r({ expediente: 'E2', fecha: '2026-10-15' }, ctx), false, 'suspendido');
  assert.equal(r({ expediente: 'ZZ', fecha: '2026-10-15' }, ctx), false, 'no existe');
});
prueba('regla: abogado inactivo no puede registrar horas', () => {
  const r = regla(actu, 'abogado-en-actividad');
  const ctx = crearCtx({ datos: { abogados: [{ id: 'A1', activo: true }, { id: 'A2', activo: false }, { id: 'A3' }] } });
  assert.equal(r({ abogado: 'A1' }, ctx), true); assert.equal(r({ abogado: 'A2' }, ctx), false);
  assert.equal(r({ abogado: 'A3' }, ctx), true, 'sin la marca se asume activo'); assert.equal(r({ abogado: 'A9' }, ctx), false);
});
prueba('alEmitir: la última actuación del expediente solo avanza, nunca retrocede', () => {
  const ctx = crearCtx({ datos: { expedientes: [{ id: 'E1', fechaApertura: '2026-01-01', ultimaActuacion: '2026-10-10' }] } });
  actu.alEmitir({ expediente: 'E1', fecha: '2026-09-01' }, ctx);
  assert.equal(ctx.calls.length, 0);
  actu.alEmitir({ expediente: 'E1', fecha: '2026-10-20' }, ctx);
  assert.equal(ctx.datos.obtener('expedientes', 'E1').ultimaActuacion, '2026-10-20');
  const vacio = crearCtx({ datos: { expedientes: [{ id: 'E1', fechaApertura: '2026-01-01' }] } });
  actu.alEmitir({ expediente: 'E1', fecha: '2026-03-03' }, vacio);
  assert.equal(vacio.datos.obtener('expedientes', 'E1').ultimaActuacion, '2026-03-03');
});
prueba('alAnular: la última actuación vuelve a la anterior vigente (o a la apertura)', () => {
  const datos = {
    expedientes: [{ id: 'E1', fechaApertura: '2026-01-01', ultimaActuacion: '2026-10-20' }],
    actuaciones: [{ id: 'X1', expediente: 'E1', estado: 'Registrada', fecha: '2026-10-20' }, { id: 'X2', expediente: 'E1', estado: 'Facturada', fecha: '2026-09-15' }, { id: 'X3', expediente: 'E1', estado: 'Anulada', fecha: '2026-10-25' }]
  };
  const ctx = crearCtx({ datos });
  actu.alAnular({ id: 'X1', expediente: 'E1' }, ctx);
  assert.equal(ctx.datos.obtener('expedientes', 'E1').ultimaActuacion, '2026-09-15');
  datos.actuaciones = [];
  actu.alAnular({ id: 'X2', expediente: 'E1' }, ctx);
  assert.equal(ctx.datos.obtener('expedientes', 'E1').ultimaActuacion, '2026-01-01');
});

/* ============================ Plazos en días hábiles ============================ */
console.log('Plazos procesales en días hábiles (expedientes)');
const vence = (notif, plazo, hoy, extra) => {
  const ctx = crearCtx({ hoy: hoy || HOY, params: (extra && extra.params) || {} });
  const e = Object.assign({ estado: 'Activo', fechaNotificacion: notif, plazoDias: plazo }, (extra && extra.e) || {});
  return { vence: calculado('expedientes', 'vencePlazo')(e, ctx), dias: calculado('expedientes', 'diasRestantes')(e, ctx), alerta: calculado('expedientes', 'alerta')(e, ctx) };
};
prueba('notificado viernes 30/10 con 1 día hábil: vence el lunes 02/11 (se salta el fin de semana)', () => {
  assert.equal(vence('2026-10-30', 1).vence, '2026-11-02');
});
prueba('notificado miércoles 28/10 con 5 días hábiles: vence el miércoles 04/11', () => {
  assert.equal(vence('2026-10-28', 5).vence, '2026-11-04');
});
prueba('notificado en sábado o domingo con 1 día: el primer día hábil es el lunes', () => {
  assert.equal(vence('2026-10-31', 1).vence, '2026-11-02');
  assert.equal(vence('2026-11-01', 1).vence, '2026-11-02');
});
prueba('plazo de 0 días vence el mismo día; 10 días desde el lunes 26/10 vencen el lunes 09/11', () => {
  assert.equal(vence('2026-10-28', 0).vence, '2026-10-28');
  assert.equal(vence('2026-10-26', 10).vence, '2026-11-09');
});
prueba('15 días hábiles desde un lunes son tres semanas justas', () => {
  assert.equal(vence('2026-10-26', 15).vence, '2026-11-16');
});
prueba('borde de año bisiesto: viernes 25/02/2028 + 3 hábiles = miércoles 01/03/2028 (pasa por el 29/02)', () => {
  assert.equal(vence('2028-02-25', 3).vence, '2028-03-01');
});
prueba('borde de año: miércoles 30/12/2026 + 3 hábiles = lunes 04/01/2027', () => {
  assert.equal(vence('2026-12-30', 3).vence, '2027-01-04');
});
prueba('sin notificación o sin plazo: sin vencimiento, sin días y «Sin plazo»', () => {
  const a = vence(undefined, 5), b = vence('2026-10-28', undefined);
  assert.equal(a.vence, null); assert.equal(a.dias, null); assert.equal(a.alerta, 'Sin plazo');
  assert.equal(b.vence, null); assert.equal(b.alerta, 'Sin plazo');
});
prueba('alertas: vencido hace 3 días, hace 1 día, hoy, en 1 día, en 5 días (por vencer) y en 6 (en plazo)', () => {
  const v3 = vence('2026-10-23', 3);
  assert.equal(v3.vence, '2026-10-28'); assert.equal(v3.dias, -3); assert.equal(v3.alerta, 'Vencido hace 3 días');
  assert.equal(vence('2026-10-29', 1).alerta, 'Vencido hace 1 día');
  assert.equal(vence('2026-10-30', 1, '2026-11-02').alerta, 'Vence hoy');
  assert.equal(vence('2026-10-30', 1, '2026-11-01').alerta, 'Vence en 1 día');
  const v5 = vence('2026-10-29', 5);
  assert.equal(v5.vence, '2026-11-05'); assert.equal(v5.dias, 5); assert.equal(v5.alerta, 'Vence en 5 días');
  assert.equal(vence('2026-10-30', 5).alerta, 'En plazo');
});
prueba('el umbral de alerta sale de Configuración', () => {
  assert.equal(vence('2026-10-30', 5, HOY, { params: { diasAlertaPlazo: 10 } }).alerta, 'Vence en 6 días');
  assert.equal(vence('2026-10-30', 5, HOY, { params: { diasAlertaPlazo: 0 } }).alerta, 'En plazo');
});
prueba('expediente suspendido o concluido: «No aplica»', () => {
  assert.equal(vence('2026-10-29', 1, HOY, { e: { estado: 'Suspendido' } }).alerta, 'No aplica');
  assert.equal(vence('2026-10-29', 1, HOY, { e: { estado: 'Concluido' } }).alerta, 'No aplica');
});
prueba('reglas del expediente: la notificación no antecede a la apertura y el plazo exige notificación', () => {
  const ee = entidad('expedientes');
  assert.equal(regla(ee, 'notificacion-posterior-apertura')({ fechaApertura: '2026-05-01', fechaNotificacion: '2026-05-01' }), true);
  assert.equal(regla(ee, 'notificacion-posterior-apertura')({ fechaApertura: '2026-05-01', fechaNotificacion: '2026-04-30' }), false);
  assert.equal(regla(ee, 'plazo-con-notificacion')({ plazoDias: 5 }), false);
  assert.equal(regla(ee, 'plazo-con-notificacion')({ plazoDias: 5, fechaNotificacion: '2026-05-01' }), true);
  assert.equal(regla(ee, 'plazo-con-notificacion')({}), true);
});

/* ============================ Honorarios, cuota litis y provisiones ============================ */
console.log('Honorarios, cuota litis y provisión de fondos (honorarios.calcular)');
const hon = operacion('honorarios');
const baseHon = (o) => Object.assign({ expediente: 'E1', concepto: 'Honorarios fijos por etapa', monto: 0 }, o);
prueba('cuota litis: 20 % de 80 000 = 16 000 + IGV 2 880 = 18 880', () => {
  const t = tot(hon, baseHon({ concepto: 'Cuota litis (éxito)', montoRecuperado: 80000, porcentajeLitis: 20 }), crearCtx());
  igual(t, { honorarios: 16000, igv: 2880, total: 18880, aplicado: 0, porCobrar: 18880 });
});
prueba('cuota litis sin porcentaje o sin monto: cero, sin NaN', () => {
  assert.equal(tot(hon, baseHon({ concepto: 'Cuota litis (éxito)', montoRecuperado: 80000 }), crearCtx()).total, 0);
  assert.equal(tot(hon, baseHon({ concepto: 'Cuota litis (éxito)', porcentajeLitis: 20 }), crearCtx()).total, 0);
});
prueba('honorario fijo 5 000: IGV 900, total 5 900; aplicando 1 200 de provisión quedan 4 700 por cobrar', () => {
  igual(tot(hon, baseHon({ monto: 5000 }), crearCtx()), { honorarios: 5000, igv: 900, total: 5900, aplicado: 0, porCobrar: 5900 });
  const t = tot(hon, baseHon({ monto: 5000, aplicarProvision: 1200 }), crearCtx());
  assert.equal(t.aplicado, 1200); assert.equal(t.porCobrar, 4700);
});
prueba('redondeo del IGV: 33.33 × 18 % = 5.9994 → 6.00; total 39.33', () => {
  const t = tot(hon, baseHon({ monto: 33.33 }), crearCtx());
  assert.equal(t.igv, 6); assert.equal(t.total, 39.33);
});
prueba('el IGV sale de Configuración', () => {
  assert.equal(tot(hon, baseHon({ monto: 1000 }), crearCtx({ params: { igv: 10 } })).total, 1100);
});
prueba('provisión de fondos y gastos: sin IGV, el total es el monto y no admiten provisión aplicada', () => {
  const p = tot(hon, baseHon({ concepto: 'Provisión de fondos', monto: 3000, aplicarProvision: 500 }), crearCtx());
  igual(p, { honorarios: 0, igv: 0, total: 3000, aplicado: 0, porCobrar: 3000 });
  const g = tot(hon, baseHon({ concepto: 'Gastos y tasas judiciales', monto: 450 }), crearCtx());
  assert.equal(g.total, 450); assert.equal(g.igv, 0);
});
const actFix = (id, fecha, total, extra) => Object.assign({ id, expediente: 'E1', fecha, estado: 'Registrada', totales: { total } }, extra || {});
prueba('honorarios por horas: suma las actuaciones vigentes del periodo, con los bordes incluidos', () => {
  const datos = { actuaciones: [
    actFix('A', '2026-03-01', 100), actFix('B', '2026-03-15', 200, { estado: 'Facturada' }), actFix('C', '2026-03-31', 400),
    actFix('D', '2026-02-28', 1000), actFix('E', '2026-04-01', 1000), actFix('F', '2026-03-10', 1000, { estado: 'Anulada' }),
    actFix('G', '2026-03-10', 1000, { estado: 'Borrador' }), actFix('H', '2026-03-10', 1000, { expediente: 'E2' })
  ] };
  const t = tot(hon, baseHon({ concepto: 'Honorarios por horas', periodoDesde: '2026-03-01', periodoHasta: '2026-03-31' }), crearCtx({ datos }));
  assert.equal(t.honorarios, 700); assert.equal(t.igv, 126); assert.equal(t.total, 826);
  assert.equal(tot(hon, baseHon({ concepto: 'Honorarios por horas', periodoDesde: '2026-03-01' }), crearCtx({ datos })).total, 0, 'sin fecha final no suma nada');
});
prueba('regla: la cuota litis se pacta dentro del rango 10 %–35 %', () => {
  const r = regla(hon, 'litis-en-rango'), ctx = crearCtx(), L = 'Cuota litis (éxito)';
  assert.equal(r({ concepto: L, porcentajeLitis: 9.99 }, ctx), false);
  assert.equal(r({ concepto: L, porcentajeLitis: 10 }, ctx), true);
  assert.equal(r({ concepto: L, porcentajeLitis: 35 }, ctx), true);
  assert.equal(r({ concepto: L, porcentajeLitis: 35.01 }, ctx), false);
  assert.equal(r({ concepto: L }, ctx), false);
  assert.equal(r({ concepto: 'Honorarios fijos por etapa' }, ctx), true);
  assert.equal(r({ concepto: L, porcentajeLitis: 40 }, crearCtx({ params: { cuotaLitisMax: 40 } })), true);
});
prueba('regla: el periodo de honorarios por horas debe estar completo y en orden', () => {
  const r = regla(hon, 'periodo-valido'), H = 'Honorarios por horas';
  assert.equal(r({ concepto: H, periodoDesde: '2026-03-01', periodoHasta: '2026-03-01' }), true);
  assert.equal(r({ concepto: H, periodoDesde: '2026-03-02', periodoHasta: '2026-03-01' }), false);
  assert.equal(r({ concepto: H, periodoDesde: '2026-03-02' }), false);
  assert.equal(r({ concepto: 'Cuota litis (éxito)' }), true);
});
prueba('regla: la provisión se aplica solo a honorarios y sin superar el total del documento', () => {
  const r = regla(hon, 'aplicar-solo-honorarios'), ctx = crearCtx();
  assert.equal(r({ concepto: 'Honorarios fijos por etapa', monto: 1000, aplicarProvision: 1180 }, ctx), true, 'justo el total (1 000 + IGV)');
  assert.equal(r({ concepto: 'Honorarios fijos por etapa', monto: 1000, aplicarProvision: 1180.01 }, ctx), false);
  assert.equal(r({ concepto: 'Provisión de fondos', monto: 1000, aplicarProvision: 10 }, ctx), false);
  assert.equal(r({ concepto: 'Gastos y tasas judiciales', monto: 1000, aplicarProvision: 10 }, ctx), false);
  assert.equal(r({ concepto: 'Provisión de fondos', monto: 1000, aplicarProvision: 0 }, ctx), true);
});

console.log('Saldo de la provisión de fondos y efectos al emitir o anular');
const hDoc = (id, concepto, estado, totales, extra) => Object.assign({ id, expediente: 'E1', concepto, estado, totales }, extra || {});
const honFix = () => [
  hDoc('P1', 'Provisión de fondos', 'Cobrado', { total: 3000 }),
  hDoc('P2', 'Provisión de fondos', 'Emitido', { total: 1500 }),
  hDoc('P3', 'Provisión de fondos', 'Anulado', { total: 9999 }),
  hDoc('G1', 'Gastos y tasas judiciales', 'Emitido', { total: 450 }),
  hDoc('G2', 'Gastos y tasas judiciales', 'Borrador', { total: 800 }),
  hDoc('H1', 'Honorarios fijos por etapa', 'Cobrado', { total: 5900, aplicado: 1200 }),
  hDoc('H2', 'Honorarios fijos por etapa', 'Anulado', { total: 5900, aplicado: 500 }),
  hDoc('X1', 'Provisión de fondos', 'Cobrado', { total: 777 }, { expediente: 'E2' })
];
prueba('saldo = provisiones cobradas (3 000) − gastos emitidos (450) − provisión aplicada (1 200) = 1 350', () => {
  const ctx = crearCtx({ datos: { honorarios: honFix() } });
  assert.equal(calculado('expedientes', 'saldoProvision')({ id: 'E1' }, ctx), 1350);
  assert.equal(calculado('expedientes', 'saldoProvision')({ id: 'E2' }, ctx), 777);
  assert.equal(calculado('expedientes', 'saldoProvision')({ id: 'E3' }, ctx), 0);
});
prueba('el saldo puede quedar negativo cuando el estudio adelanta gastos', () => {
  const ctx = crearCtx({ datos: { honorarios: [hDoc('P1', 'Provisión de fondos', 'Cobrado', { total: 100 }), hDoc('G1', 'Gastos y tasas judiciales', 'Emitido', { total: 250.5 })] } });
  assert.equal(calculado('expedientes', 'saldoProvision')({ id: 'E1' }, ctx), -150.5);
});
prueba('alEmitir con provisión aplicada: pasa justo al límite del saldo y falla un centavo después', () => {
  const doc = hDoc('N1', 'Honorarios fijos por etapa', 'Emitido', { honorarios: 2000, total: 2360, aplicado: 1350 }, { monto: 2000, aplicarProvision: 1350 });
  const ok = crearCtx({ datos: { honorarios: honFix().concat([doc]) } });
  hon.alEmitir(doc, ok);
  const doc2 = hDoc('N1', 'Honorarios fijos por etapa', 'Emitido', { honorarios: 2000, total: 2360, aplicado: 1350.01 }, { monto: 2000, aplicarProvision: 1350.01 });
  const mal = crearCtx({ datos: { honorarios: honFix().concat([doc2]) } });
  assert.throws(() => hon.alEmitir(doc2, mal), /supera el saldo del expediente \(faltan S\/ 0\.01\)/);
});
prueba('alEmitir: honorario fijo o provisión con monto cero, o cuota litis sin recuperado, se rechazan', () => {
  assert.throws(() => hon.alEmitir(baseHon({ monto: 0 }), crearCtx()), /monto base debe ser mayor que cero/);
  assert.throws(() => hon.alEmitir(baseHon({ concepto: 'Provisión de fondos', monto: 0 }), crearCtx()), /monto base/);
  assert.throws(() => hon.alEmitir(baseHon({ concepto: 'Cuota litis (éxito)', porcentajeLitis: 20, montoRecuperado: 0 }), crearCtx()), /monto recuperado/);
  hon.alEmitir(baseHon({ concepto: 'Cuota litis (éxito)', porcentajeLitis: 20, montoRecuperado: 1000 }), crearCtx());
});
prueba('alEmitir por horas: sin actuaciones en el periodo se rechaza', () => {
  assert.throws(() => hon.alEmitir(baseHon({ concepto: 'Honorarios por horas', periodoDesde: '2026-03-01', periodoHasta: '2026-03-31' }), crearCtx({ datos: { actuaciones: [], honorarios: [] } })), /No hay actuaciones registradas/);
});
prueba('alEmitir por horas: no se cobra dos veces un periodo que cruza otro ya emitido (los bordes cuentan)', () => {
  const previo = hDoc('H0', 'Honorarios por horas', 'Cobrado', { total: 1 }, { periodoDesde: '2026-01-01', periodoHasta: '2026-01-31' });
  const datos = (nuevo) => ({ actuaciones: [actFix('A', '2026-02-05', 500), actFix('B', '2026-01-31', 500)], honorarios: [previo, nuevo] });
  const sinCruce = hDoc('N', 'Honorarios por horas', 'Emitido', { total: 1 }, { periodoDesde: '2026-02-01', periodoHasta: '2026-02-28' });
  hon.alEmitir(sinCruce, crearCtx({ datos: datos(sinCruce) }));
  const cruce = hDoc('N', 'Honorarios por horas', 'Emitido', { total: 1 }, { periodoDesde: '2026-01-31', periodoHasta: '2026-02-10' });
  assert.throws(() => hon.alEmitir(cruce, crearCtx({ datos: datos(cruce) })), /cruzan este periodo.*H0|H0.*cruzan este periodo/);
  const anulado = Object.assign({}, previo, { estado: 'Anulado' });
  hon.alEmitir(cruce, crearCtx({ datos: { actuaciones: [actFix('A', '2026-02-05', 500)], honorarios: [anulado, cruce] } }));
});
prueba('alAnular una provisión ya consumida se rechaza; una libre o un honorario se anulan sin problema', () => {
  const anulada = hDoc('P1', 'Provisión de fondos', 'Anulado', { total: 3000 });
  const consumida = crearCtx({ datos: { honorarios: [anulada, hDoc('G1', 'Gastos y tasas judiciales', 'Emitido', { total: 450 })] } });
  assert.throws(() => hon.alAnular(anulada, consumida), /No se puede anular: la provisión ya se usó/);
  const libre = crearCtx({ datos: { honorarios: [anulada] } });
  hon.alAnular(anulada, libre);
  hon.alAnular(hDoc('H1', 'Honorarios fijos por etapa', 'Anulado', { total: 1 }), consumida);
});

/* ============================ Calculados de abogados y clientes ============================ */
console.log('Calculados de abogados y clientes');
prueba('horas del mes y cumplimiento de la meta: solo este mes, solo registradas o facturadas', () => {
  const acts = [
    actFix('A', '2026-10-05', 0, { abogado: 'A1', totales: { horasFacturables: 40, total: 1 } }),
    actFix('B', '2026-10-31', 0, { abogado: 'A1', estado: 'Facturada', totales: { horasFacturables: 20, total: 1 } }),
    actFix('C', '2026-09-30', 0, { abogado: 'A1', totales: { horasFacturables: 99, total: 1 } }),
    actFix('D', '2026-10-10', 0, { abogado: 'A1', estado: 'Anulada', totales: { horasFacturables: 99, total: 1 } }),
    actFix('E', '2026-10-10', 0, { abogado: 'A1', estado: 'Borrador', totales: { horasFacturables: 99, total: 1 } }),
    actFix('F', '2026-10-10', 0, { abogado: 'A2', totales: { horasFacturables: 99, total: 1 } })
  ];
  const ctx = crearCtx({ datos: { actuaciones: acts } });
  assert.equal(calculado('abogados', 'horasMes')({ id: 'A1' }, ctx), 60);
  assert.equal(calculado('abogados', 'cumplimiento')({ id: 'A1', horasMeta: 120 }, ctx), 50);
  assert.equal(calculado('abogados', 'cumplimiento')({ id: 'A1', horasMeta: 0 }, ctx), null);
  assert.equal(calculado('abogados', 'tarifaHora')({ tarifa: 'T3' }, crearCtx({ datos: { tarifas: [{ id: 'T3', tarifaHora: 280 }] } })), 280);
  assert.equal(calculado('abogados', 'tarifaHora')({ tarifa: 'ZZ' }, crearCtx()), 0);
});
prueba('clientes: honorarios facturados (sin IGV) de sus expedientes y expedientes activos', () => {
  const datos = {
    expedientes: [{ id: 'E1', cliente: 'C1', estado: 'Activo' }, { id: 'E2', cliente: 'C1', estado: 'Concluido' }, { id: 'E3', cliente: 'C2', estado: 'Activo' }],
    honorarios: [
      hDoc('H1', 'Honorarios fijos por etapa', 'Cobrado', { honorarios: 1000, total: 1180 }, { fecha: '2026-05-01' }),
      hDoc('H2', 'Honorarios por horas', 'Emitido', { honorarios: 500, total: 590 }, { fecha: '2026-06-01', expediente: 'E2' }),
      hDoc('H3', 'Provisión de fondos', 'Cobrado', { honorarios: 0, total: 3000 }, { fecha: '2026-06-01' }),
      hDoc('H4', 'Honorarios fijos por etapa', 'Anulado', { honorarios: 9999, total: 9999 }, { fecha: '2026-06-01' }),
      hDoc('H5', 'Honorarios fijos por etapa', 'Cobrado', { honorarios: 700, total: 826 }, { fecha: '2026-06-01', expediente: 'E3' })
    ]
  };
  const ctx = crearCtx({ datos });
  assert.equal(calculado('clientes', 'facturado')({ id: 'C1' }, ctx), 1500);
  assert.equal(calculado('clientes', 'expedientesActivos')({ id: 'C1' }, ctx), 1);
});
prueba('tarifario: cuenta cuántos abogados tienen cada tarifa', () => {
  const ctx = crearCtx({ datos: { abogados: [{ tarifa: 'T1' }, { tarifa: 'T1' }, { tarifa: 'T2' }] } });
  assert.equal(calculado('tarifas', 'abogados')({ id: 'T1' }, ctx), 2);
});

/* ============================ Reportes sobre las semillas ============================ */
console.log('Reportes y tablero sobre las semillas');
const ctxS = ctxSemillas();
const rango = { desde: ctxS.fechaMas(HOY, -190), hasta: HOY };
prueba('semillas coherentes: totales finitos, fechas no futuras, saldos de provisión ≥ 0', () => {
  ctxS.datos.listar('actuaciones').forEach((a) => { assert.ok(a.fecha <= HOY); assert.ok(isFinite(a.totales.total) && a.totales.total > 0, a.id); });
  ctxS.datos.listar('honorarios').forEach((h) => { assert.ok(h.fecha <= HOY); assert.ok(isFinite(h.totales.total) && h.totales.total > 0, h.id + ' ' + JSON.stringify(h.totales)); });
  ctxS.datos.listar('expedientes').forEach((e) => { assert.ok(calculado('expedientes', 'saldoProvision')(e, ctxS) >= 0, e.id + ' saldo negativo'); });
  ctxS.datos.listar('expedientes').forEach((e) => { assert.ok(e.fechaApertura <= (e.fechaNotificacion || HOY)); });
});
prueba('seed: un honorario de cada concepto y estado (incluye por horas con actuaciones del periodo)', () => {
  const hs = ctxS.datos.listar('honorarios');
  ['Honorarios por horas', 'Honorarios fijos por etapa', 'Cuota litis (éxito)', 'Provisión de fondos', 'Gastos y tasas judiciales'].forEach((c) => assert.ok(hs.some((h) => h.concepto === c), c));
  ['Borrador', 'Emitido', 'Cobrado', 'Anulado'].forEach((s) => assert.ok(hs.some((h) => h.estado === s), s));
  hs.filter((h) => h.concepto === 'Honorarios por horas').forEach((h) => assert.ok(h.totales.honorarios > 0, h.id));
});
prueba('horas por abogado: el total de horas facturables del resumen = suma de las actuaciones vigentes', () => {
  const r = reporte('horas-abogado').ejecutar(rango, ctxS);
  const esperado = ctxS.datos.listar('actuaciones', (a) => a.estado === 'Registrada' || a.estado === 'Facturada').reduce((t, a) => t + a.totales.horasFacturables, 0);
  assert.ok(Math.abs(r.resumen[0].valor - esperado) < 0.05);
  r.filas.forEach((f) => { assert.ok(f[4] <= f[2] + 1e-9 + 0.25 * f[1], 'facturables ≤ trabajadas + fracción'); assert.ok(f[6] >= 0); });
  for (let i = 1; i < r.filas.length; i++) { assert.ok(r.filas[i - 1][4] >= r.filas[i][4]); }
});
prueba('honorarios facturados vs. cobrados: cobrado ≤ facturado y por cobrar = facturado − cobrado', () => {
  const r = reporte('honorarios-cobranza').ejecutar(rango, ctxS);
  assert.ok(r.filas.length >= 3);
  r.filas.forEach((f) => { assert.ok(f[3] <= f[2]); assert.ok(Math.abs(f[4] - (f[2] - f[3])) < 0.011); assert.ok(f[5] >= 0 && f[5] <= 100); });
  assert.ok(r.resumen[2].valor > 0 && r.resumen[2].valor < 100);
});
prueba('expedientes por etapa: solo etapas con casos y el total coincide con el filtro de estado', () => {
  const act = reporte('expedientes-etapa').ejecutar({ desde: '2000-01-01', hasta: HOY, estado: 'Activo' }, ctxS);
  assert.equal(act.resumen[0].valor, ctxS.datos.listar('expedientes', (e) => e.estado === 'Activo').length);
  const todos = reporte('expedientes-etapa').ejecutar({ desde: '2000-01-01', hasta: HOY, estado: 'Todos' }, ctxS);
  assert.equal(todos.resumen[0].valor, ctxS.datos.contar('expedientes'));
  todos.filas.forEach((f) => assert.ok(f[1] > 0));
  assert.equal(reporte('expedientes-etapa').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31', estado: 'Todos' }, ctxS).filas.length, 0);
});
prueba('plazos por vencer: ordenados por urgencia, con vencidos y por vencer, y respetan el horizonte', () => {
  const r = reporte('plazos').ejecutar({ desde: ctxS.fechaMas(HOY, -90), hasta: HOY, horizonte: 30 }, ctxS);
  assert.ok(r.filas.length >= 5);
  for (let i = 1; i < r.filas.length; i++) { assert.ok(r.filas[i - 1][7] <= r.filas[i][7]); }
  assert.ok(r.filas.every((f) => f[7] <= 30));
  assert.ok(r.resumen[1].valor >= 1, 'al menos un plazo vencido para el ejemplo');
  const corto = reporte('plazos').ejecutar({ desde: ctxS.fechaMas(HOY, -90), hasta: HOY, horizonte: 0 }, ctxS);
  assert.ok(corto.filas.every((f) => f[7] <= 0));
});
prueba('rentabilidad por cliente: margen = honorarios − costo y el margen del estudio es la suma', () => {
  const r = reporte('rentabilidad-cliente').ejecutar(rango, ctxS);
  assert.ok(r.filas.length >= 5);
  r.filas.forEach((f) => assert.ok(Math.abs(f[4] - (f[2] - f[3])) < 0.011, f[0]));
  assert.ok(Math.abs(r.resumen[2].valor - (r.resumen[0].valor - r.resumen[1].valor)) < 0.011);
});
prueba('tablero: ningún indicador da NaN ni lanza error; el gráfico tiene 6 meses', () => {
  CFG.tablero.forEach((t) => { const v = t.calcular(ctxS); assert.ok(v === null || (typeof v === 'number' && isFinite(v)), t.titulo + ' → ' + v); });
  const g = CFG.tableroGrafico.calcular(ctxS);
  assert.equal(g.etiquetas.length, 6); assert.equal(g.valores.length, 6);
  assert.ok(g.valores.some((v) => v > 0));
});

console.log('\n' + n + ' pruebas correctas' + (process.exitCode ? ' · HAY FALLOS' : ''));
