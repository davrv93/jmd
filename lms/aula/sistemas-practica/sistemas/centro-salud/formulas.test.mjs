#!/usr/bin/env node
/*
 * formulas.test.mjs · Prueba de las fórmulas de «centro-salud» SIN navegador
 * ----------------------------------------------------------------------------
 *   node sistemas/centro-salud/formulas.test.mjs
 * Carga config.js en node:vm con un `window` falso, arma un `ctx` mínimo (param,
 * redondear, suma, fechas, datos en memoria) y verifica con resultados calculados
 * a mano cada fórmula propia del rubro: edad, IMC y su clasificación, grupo etario,
 * copago de la consulta, copago de medicamentos, tiempo de espera, dosis pediátrica
 * por peso, vencimiento de medicamentos, reglas, efectos sobre el stock y reportes.
 * Todos los datos de las pruebas son ficticios.
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



/* ctx de semillas con parámetros cambiados */
function ctxSemillasConParams(params) {
  const base = ctxSemillas();
  const ctx = crearCtx({ datos: null, params });
  ctx.datos = base.datos;
  return ctx;
}

/* El núcleo redondea cada total a 2 decimales (Calc.totales): lo repetimos aquí. */
function tot(op, doc, ctx) {
  const t = op.calcular(doc, ctx), r = {};
  Object.keys(t).forEach((k) => { r[k] = redondear(t[k]); });
  return r;
}
const campoOp = (op, id) => operacion(op).campos.filter((c) => c.id === id)[0];

/* ============================ Edad y grupo etario ============================ */
console.log('Edad y grupo etario (pacientes)');
const edadF = calculado('pacientes', 'edad');
const edadEnFecha = (nac, hoy) => edadF({ fechaNacimiento: nac }, crearCtx({ hoy }));
prueba('edad en años cumplidos: el día antes del cumpleaños, el día del cumpleaños y después', () => {
  assert.equal(edadEnFecha('2000-05-15', '2026-05-14'), 25);
  assert.equal(edadEnFecha('2000-05-15', '2026-05-15'), 26);
  assert.equal(edadEnFecha('2000-05-15', '2026-10-31'), 26);
});
prueba('nacido hoy: 0 años; nacido mañana (o en el futuro): sin edad', () => {
  assert.equal(edadEnFecha('2026-10-31', '2026-10-31'), 0);
  assert.equal(edadEnFecha('2026-11-01', '2026-10-31'), null);
  assert.equal(edadEnFecha('2027-01-01', '2026-10-31'), null);
  assert.equal(edadF({}, crearCtx()), null);
});
prueba('nacido un 29 de febrero: cumple el 1 de marzo en años no bisiestos y el 29/02 en bisiestos', () => {
  assert.equal(edadEnFecha('2020-02-29', '2027-02-28'), 6);
  assert.equal(edadEnFecha('2020-02-29', '2027-03-01'), 7);
  assert.equal(edadEnFecha('2020-02-29', '2028-02-28'), 7);
  assert.equal(edadEnFecha('2020-02-29', '2028-02-29'), 8);
});
prueba('lactante de 11 meses tiene 0 años; el primer cumpleaños pasa a 1', () => {
  assert.equal(edadEnFecha('2025-12-01', '2026-10-31'), 0);
  assert.equal(edadEnFecha('2025-10-31', '2026-10-31'), 1);
});
prueba('grupo etario: Lactante, Niño, Adolescente, Adulto y Adulto mayor con sus bordes', () => {
  const g = (nac) => calculado('pacientes', 'grupoEtario')({ fechaNacimiento: nac }, crearCtx());
  assert.equal(g('2026-01-01'), 'Lactante');
  assert.equal(g('2025-10-31'), 'Niño', '1 año');
  assert.equal(g('2014-11-01'), 'Niño', '11 años y 364 días');
  assert.equal(g('2014-10-31'), 'Adolescente', '12 años exactos (límite pediátrico)');
  assert.equal(g('2008-11-01'), 'Adolescente', '17 años');
  assert.equal(g('2008-10-31'), 'Adulto', '18 años');
  assert.equal(g('1967-11-01'), 'Adulto', '59 años');
  assert.equal(g('1966-10-31'), 'Adulto mayor', '60 años');
  assert.equal(calculado('pacientes', 'grupoEtario')({ fechaNacimiento: '2014-10-31' }, crearCtx({ params: { edadPediatrica: 14 } })), 'Niño');
});

/* ============================ IMC y su clasificación ============================ */
console.log('IMC y clasificación (OMS, solo adultos)');
const imcF = calculado('pacientes', 'imc'), claseF = calculado('pacientes', 'claseImc');
const adulto = (peso, talla, extra) => Object.assign({ fechaNacimiento: '1990-01-01', pesoKg: peso, tallaCm: talla }, extra || {});
prueba('IMC = peso / talla² con un decimal: 72.2 kg a 1.70 m = 24.98 → 25.0', () => {
  assert.equal(imcF(adulto(72.2, 170), crearCtx()), 25);
  assert.equal(imcF(adulto(61, 158), crearCtx()), 24.4);
  assert.equal(imcF(adulto(82, 168), crearCtx()), 29.1);
});
prueba('bordes de la clasificación (talla 1.70 m, denominador 2.89)', () => {
  const c = (peso) => claseF(adulto(peso, 170), crearCtx());
  assert.equal(c(53.2), 'Bajo peso', 'IMC 18.4');
  assert.equal(c(53.5), 'Normal', 'IMC 18.5');
  assert.equal(c(72.2), 'Sobrepeso', '24.98 se muestra como 25.0');
  assert.equal(c(72.0), 'Normal', 'IMC 24.9');
  assert.equal(c(86.2), 'Sobrepeso', 'IMC 29.8');
  assert.equal(c(86.7), 'Obesidad I', 'IMC 30.0');
  assert.equal(c(101.2), 'Obesidad II', 'IMC 35.0');
  assert.equal(c(115.6), 'Obesidad III', 'IMC 40.0');
});
prueba('la clase coincide con el IMC que se muestra: 29.97 se redondea a 30.0 → Obesidad I', () => {
  assert.equal(imcF(adulto(86.6, 170), crearCtx()), 30);
  assert.equal(claseF(adulto(86.6, 170), crearCtx()), 'Obesidad I');
});
prueba('menor de 18 años: hay IMC pero la clase no aplica; a los 18 sí aplica', () => {
  const nino = adulto(29, 132, { fechaNacimiento: '2017-08-01' });
  assert.equal(imcF(nino, crearCtx()), 16.6);
  assert.equal(claseF(nino, crearCtx()), 'No aplica (menor de 18 años)');
  assert.equal(claseF(adulto(53.5, 170, { fechaNacimiento: '2008-10-31' }), crearCtx()), 'Normal');
  assert.equal(claseF(adulto(53.5, 170, { fechaNacimiento: '2008-11-01' }), crearCtx()), 'No aplica (menor de 18 años)');
});
prueba('sin peso o sin talla (o en cero): sin IMC y «Sin datos», sin división por cero', () => {
  assert.equal(imcF(adulto(undefined, 170), crearCtx()), null);
  assert.equal(imcF(adulto(70, undefined), crearCtx()), null);
  assert.equal(imcF(adulto(70, 0), crearCtx()), null);
  assert.equal(claseF(adulto(70, 0), crearCtx()), 'Sin datos');
});

/* ============================ Copago de la consulta, espera y atenciones ============================ */
console.log('Copago de la consulta y tiempo de espera (atenciones.calcular)');
const atn = operacion('atenciones');
const segFix = [
  { id: 'S0', coberturaConsultaPct: 0, copagoFijo: 0 }, { id: 'S1', coberturaConsultaPct: 100, copagoFijo: 0 },
  { id: 'S2', coberturaConsultaPct: 80, copagoFijo: 15 }, { id: 'S3', coberturaConsultaPct: 70, copagoFijo: 0 }
];
const datosAtn = (tarifa, seguro, extra) => Object.assign({
  medicos: [{ id: 'M1', tarifaConsulta: tarifa, especialidad: 'Medicina general', activo: true }],
  pacientes: [{ id: 'P1', seguro, sexo: 'Femenino', fechaNacimiento: '1990-01-01' }],
  seguros: segFix
}, extra || {});
const cita = (extra) => Object.assign({ medico: 'M1', paciente: 'P1' }, extra || {});
prueba('sin seguro paga toda la tarifa; con cobertura del 100 % y sin copago fijo paga cero', () => {
  const a = tot(atn, cita(), crearCtx({ datos: datosAtn(60, 'S0') }));
  igual(a, { tarifa: 60, cobertura: 0, copago: 60, esperaMin: 0, total: 60 });
  const b = tot(atn, cita(), crearCtx({ datos: datosAtn(60, 'S1') }));
  assert.equal(b.copago, 0); assert.equal(b.cobertura, 60); assert.equal(b.total, 60);
});
prueba('plan con 80 % y copago fijo de 15: tarifa 60 → 15 + 12 = 27; el seguro cubre 33', () => {
  const t = tot(atn, cita(), crearCtx({ datos: datosAtn(60, 'S2') }));
  assert.equal(t.copago, 27); assert.equal(t.cobertura, 33);
});
prueba('el copago nunca pasa de la tarifa: tarifa 20 → 15 + 4 = 19; tarifa 15 → 18 se topa en 15', () => {
  assert.equal(tot(atn, cita(), crearCtx({ datos: datosAtn(20, 'S2') })).copago, 19);
  const t = tot(atn, cita(), crearCtx({ datos: datosAtn(15, 'S2') }));
  assert.equal(t.copago, 15); assert.equal(t.cobertura, 0);
});
prueba('redondeo: 33.33 con 70 % de cobertura → paga 10.00 (9.999) y el seguro 23.33', () => {
  const t = tot(atn, cita(), crearCtx({ datos: datosAtn(33.33, 'S3') }));
  assert.equal(t.copago, 10); assert.equal(t.cobertura, 23.33);
});
prueba('paciente sin seguro registrado, sin médico o con tarifa cero: sin NaN', () => {
  assert.equal(tot(atn, cita(), crearCtx({ datos: datosAtn(60, undefined) })).copago, 60);
  igual(tot(atn, { paciente: 'P1' }, crearCtx({ datos: datosAtn(60, 'S1') })), { tarifa: 0, cobertura: 0, copago: 0, esperaMin: 0, total: 0 });
});
prueba('tiempo de espera: 08:50 → 09:35 = 45 min; misma hora = 0; cruce de mediodía 11:50 → 12:10 = 20', () => {
  const e = (llegada, inicio) => tot(atn, cita({ horaLlegada: llegada, horaInicio: inicio }), crearCtx({ datos: datosAtn(60, 'S1') })).esperaMin;
  assert.equal(e('08:50', '09:35'), 45);
  assert.equal(e('09:00', '09:00'), 0);
  assert.equal(e('11:50', '12:10'), 20);
  assert.equal(e('00:00', '23:59'), 1439);
});
prueba('espera con datos faltantes o imposibles: cero en el total (y los reportes la ignoran)', () => {
  const e = (llegada, inicio) => tot(atn, cita({ horaLlegada: llegada, horaInicio: inicio }), crearCtx({ datos: datosAtn(60, 'S1') })).esperaMin;
  assert.equal(e('08:50', undefined), 0);
  assert.equal(e(undefined, '09:00'), 0);
  assert.equal(e('09:30', '09:00'), 0, 'inicio antes de la llegada');
  assert.equal(e('25:00', '26:00'), 0, 'horas inválidas');
});
prueba('el patrón de hora acepta 00:00 y 23:59 y rechaza 24:00, 9:05 y 08:60', () => {
  const re = new RegExp(campoOp('atenciones', 'horaLlegada').patron);
  ['00:00', '08:30', '23:59'].forEach((h) => assert.ok(re.test(h), h));
  ['24:00', '9:05', '08:60', '0830', '08:3'].forEach((h) => assert.ok(!re.test(h), h));
  const pa = new RegExp(campoOp('atenciones', 'presionArterial').patron);
  assert.ok(pa.test('120/80') && pa.test('95/60')); assert.ok(!pa.test('120-80'));
});
prueba('regla: la hora de inicio no antecede a la de llegada', () => {
  const r = regla(atn, 'espera-coherente');
  assert.equal(r({ horaLlegada: '09:00', horaInicio: '09:00' }), true);
  assert.equal(r({ horaLlegada: '09:01', horaInicio: '09:00' }), false);
  assert.equal(r({ horaLlegada: '09:00' }), true);
  assert.equal(r({}), true);
});
prueba('regla: médico inactivo no puede tener citas', () => {
  const ctx = crearCtx({ datos: { medicos: [{ id: 'M1', activo: true }, { id: 'M2', activo: false }, { id: 'M3' }] } });
  const r = regla(atn, 'medico-activo');
  assert.equal(r({ medico: 'M1' }, ctx), true); assert.equal(r({ medico: 'M2' }, ctx), false);
  assert.equal(r({ medico: 'M3' }, ctx), true); assert.equal(r({ medico: 'M9' }, ctx), false);
});
prueba('regla: Ginecología solo para mujeres; Pediatría solo para menores de 14 años (13 sí, 14 no)', () => {
  const r = regla(atn, 'especialidad-compatible');
  const ctx = crearCtx({ datos: {
    medicos: [{ id: 'G', especialidad: 'Ginecología y obstetricia' }, { id: 'O', especialidad: 'Obstetricia' }, { id: 'P', especialidad: 'Pediatría' }, { id: 'M', especialidad: 'Medicina general' }],
    pacientes: [{ id: 'H', sexo: 'Masculino', fechaNacimiento: '1990-01-01' }, { id: 'F', sexo: 'Femenino', fechaNacimiento: '1990-01-01' },
      { id: 'N13', sexo: 'Masculino', fechaNacimiento: '2013-11-01' }, { id: 'N14', sexo: 'Masculino', fechaNacimiento: '2012-10-31' }]
  } });
  assert.equal(r({ medico: 'G', paciente: 'H' }, ctx), false); assert.equal(r({ medico: 'G', paciente: 'F' }, ctx), true);
  assert.equal(r({ medico: 'O', paciente: 'H' }, ctx), false);
  assert.equal(r({ medico: 'P', paciente: 'N13' }, ctx), true);
  assert.equal(r({ medico: 'P', paciente: 'N14' }, ctx), false);
  assert.equal(r({ medico: 'P', paciente: 'F' }, ctx), false);
  assert.equal(r({ medico: 'M', paciente: 'H' }, ctx), true);
});
prueba('alEmitir (atender): exige diagnóstico y fecha no futura, y pasa el peso y la talla de hoy a la ficha', () => {
  const ctx = () => crearCtx({ datos: { pacientes: [{ id: 'P1', pesoKg: 60, tallaCm: 160 }] } });
  assert.throws(() => atn.alEmitir({ paciente: 'P1', fecha: HOY }, ctx()), /registrar el diagnóstico principal/);
  assert.throws(() => atn.alEmitir({ paciente: 'P1', fecha: '2026-11-01', diagnostico: 'D1' }, ctx()), /cita con fecha futura/);
  const a = ctx();
  atn.alEmitir({ paciente: 'P1', fecha: HOY, diagnostico: 'D1', pesoKg: 62.5, tallaCm: 161 }, a);
  assert.equal(a.datos.obtener('pacientes', 'P1').pesoKg, 62.5); assert.equal(a.datos.obtener('pacientes', 'P1').tallaCm, 161);
  const b = ctx();
  atn.alEmitir({ paciente: 'P1', fecha: HOY, diagnostico: 'D1' }, b);
  assert.equal(b.calls.length, 0, 'sin peso ni talla no toca la ficha');
  const c = ctx();
  atn.alEmitir({ paciente: 'P1', fecha: HOY, diagnostico: 'D1', pesoKg: 70 }, c);
  assert.equal(c.datos.obtener('pacientes', 'P1').pesoKg, 70); assert.equal(c.datos.obtener('pacientes', 'P1').tallaCm, 160);
});

/* ============================ Receta: copago de medicamentos y dosis pediátrica ============================ */
console.log('Recetas: copago de medicamentos, dosis pediátrica por peso y stock');
const rec = operacion('recetas');
const medsFix = () => [
  { id: 'M160', nombre: 'Paracetamol 160 mg', mgPorUnidad: 160, dosisMaxMgKgDia: 60, precio: 0.35, stock: 100, stockMin: 10, vencimiento: '2027-12-31' },
  { id: 'M500', nombre: 'Paracetamol 500 mg', mgPorUnidad: 500, dosisMaxMgKgDia: 60, precio: 0.2, stock: 100, stockMin: 10, vencimiento: '2027-12-31' },
  { id: 'MMET', nombre: 'Metformina 850 mg', mgPorUnidad: 850, dosisMaxMgKgDia: 0, precio: 0.35, stock: 100, stockMin: 10, vencimiento: '2027-12-31' }
];
const pacsFix = () => [
  { id: 'ADU', seguro: 'S1', fechaNacimiento: '1980-03-03', pesoKg: 80 },
  { id: 'N10', seguro: 'S3', fechaNacimiento: '2015-11-01', pesoKg: 18 },   /* 10 años (cumple 11 mañana) */
  { id: 'N12', seguro: 'S3', fechaNacimiento: '2014-10-31', pesoKg: 40 },
  { id: 'SINPESO', seguro: 'S3', fechaNacimiento: '2022-01-01' }
];
const ctxRec = (extra) => crearCtx({ datos: Object.assign({ medicamentos: medsFix(), pacientes: pacsFix(), seguros: [{ id: 'S1', coberturaMedicamentosPct: 100 }, { id: 'S3', coberturaMedicamentosPct: 70 }, { id: 'S0', coberturaMedicamentosPct: 0 }] }, extra || {}) });
const linea = (item, cantidad, dias, precio) => ({ item, cantidad, dias, precio: precio === undefined ? 1 : precio });
prueba('valor, cobertura y copago de los medicamentos según el seguro (70 % de 100 → paga 30)', () => {
  const ctx = ctxRec({ pacientes: [{ id: 'X', seguro: 'S3' }, { id: 'Y', seguro: 'S1' }, { id: 'Z' }] });
  const t = tot(rec, { paciente: 'X', lineas: [linea('M500', 100, 5, 1)] }, ctx);
  igual(t, { total: 100, cobertura: 70, copago: 30 });
  igual(tot(rec, { paciente: 'Y', lineas: [linea('M500', 10, 5, 1)] }, ctx), { total: 10, cobertura: 10, copago: 0 });
  igual(tot(rec, { paciente: 'Z', lineas: [linea('M500', 10, 5, 1)] }, ctx), { total: 10, cobertura: 0, copago: 10 });
});
prueba('redondeo de la cobertura: 33.33 al 70 % → cubre 23.33 y paga 10.00', () => {
  const ctx = ctxRec({ pacientes: [{ id: 'X', seguro: 'S3' }] });
  igual(tot(rec, { paciente: 'X', lineas: [linea('M500', 1, 1, 33.33)] }, ctx), { total: 33.33, cobertura: 23.33, copago: 10 });
  igual(tot(rec, { paciente: 'X', lineas: [] }, ctx), { total: 0, cobertura: 0, copago: 0 });
});
prueba('dosis pediátrica: Paracetamol 160 mg (60 mg/kg/día) a 18 kg → tope 1 080 mg/día = 6.75 tabletas/día', () => {
  const r = regla(rec, 'dosis-pediatrica'), ctx = ctxRec();
  /* paciente de 10 años: nace 2015-11-01 → a 2026-10-31 tiene 10 */
  const doc = (cant, dias, extra) => Object.assign({ paciente: 'N10', lineas: [linea('M160', cant, dias)] }, extra || {});
  assert.equal(r(doc(12, 2), ctx), true, '6 tab/día = 960 mg');
  assert.equal(r(doc(13, 2), ctx), true, '6.5 tab/día = 1 040 mg');
  assert.equal(r(doc(27, 4), ctx), true, '6.75 tab/día = 1 080 mg: justo el tope');
  assert.equal(r(doc(28, 4), ctx), false, '7 tab/día = 1 120 mg');
  assert.equal(r(doc(14, 2), ctx), false);
});
prueba('el peso del día de la receta manda sobre el de la ficha (24 kg → tope 1 440 = 9 tab/día)', () => {
  const r = regla(rec, 'dosis-pediatrica'), ctx = ctxRec();
  const doc = { paciente: 'N10', pesoKg: 24, lineas: [linea('M160', 18, 2)] };
  assert.equal(r(doc, ctx), true, '9 tab/día × 160 = 1 440, justo el tope');
  assert.equal(r(Object.assign({}, doc, { pesoKg: undefined }), ctx), false, 'con 18 kg de la ficha no pasa');
  assert.equal(r(Object.assign({}, doc, { lineas: [linea('M160', 19, 2)] }), ctx), false);
});
prueba('límite pediátrico de 12 años: a los 10 se valida por peso; a los 12 ya es adulto y no se valida', () => {
  const r = regla(rec, 'dosis-pediatrica'), ctx = ctxRec();
  const exagerada = [linea('M500', 100, 1)];
  assert.equal(r({ paciente: 'N10', lineas: exagerada }, ctx), false);
  assert.equal(r({ paciente: 'N12', lineas: exagerada }, ctx), true);
  assert.equal(r({ paciente: 'ADU', lineas: exagerada }, ctx), true);
  assert.equal(r({ paciente: 'N10', lineas: exagerada }, crearCtx({ datos: { medicamentos: medsFix(), pacientes: pacsFix(), seguros: [] }, params: { edadPediatrica: 10 } })), true, 'con límite de 10 años ya no es pediátrico');
});
prueba('un medicamento sin dosis pediátrica definida (0) no se receta a menores, pero sí a adultos', () => {
  const r = regla(rec, 'dosis-pediatrica'), ctx = ctxRec();
  assert.equal(r({ paciente: 'N10', lineas: [linea('MMET', 1, 1)] }, ctx), false);
  assert.equal(r({ paciente: 'ADU', lineas: [linea('MMET', 60, 30)] }, ctx), true);
});
prueba('regla: un menor sin peso (ni en la ficha ni en la receta) no se puede validar', () => {
  const r = regla(rec, 'menor-con-peso'), ctx = ctxRec();
  assert.equal(r({ paciente: 'SINPESO', lineas: [] }, ctx), false);
  assert.equal(r({ paciente: 'SINPESO', pesoKg: 12, lineas: [] }, ctx), true);
  assert.equal(r({ paciente: 'N10', lineas: [] }, ctx), true);
  assert.equal(r({ paciente: 'ADU', lineas: [] }, ctx), true);
  assert.equal(regla(rec, 'dosis-pediatrica')({ paciente: 'SINPESO', lineas: [linea('M160', 100, 1)] }, ctx), true, 'sin peso la otra regla no opina: la decide menor-con-peso');
});
prueba('alEmitir: baja el stock de cada línea; alAnular lo devuelve', () => {
  const ctx = ctxRec();
  const doc = { fecha: HOY, paciente: 'ADU', lineas: [linea('M500', 30, 10), linea('M160', 5, 5)] };
  rec.alEmitir(doc, ctx);
  assert.equal(ctx.datos.obtener('medicamentos', 'M500').stock, 70); assert.equal(ctx.datos.obtener('medicamentos', 'M160').stock, 95);
  rec.alAnular(doc, ctx);
  assert.equal(ctx.datos.obtener('medicamentos', 'M500').stock, 100); assert.equal(ctx.datos.obtener('medicamentos', 'M160').stock, 100);
});
prueba('alEmitir: justo el stock disponible pasa; uno más falla y no toca ningún medicamento (todo o nada)', () => {
  const ok = ctxRec();
  rec.alEmitir({ fecha: HOY, lineas: [linea('M500', 100, 10)] }, ok);
  assert.equal(ok.datos.obtener('medicamentos', 'M500').stock, 0);
  const mal = ctxRec();
  assert.throws(() => rec.alEmitir({ fecha: HOY, lineas: [linea('M160', 10, 5), linea('M500', 101, 10)] }, mal), /Stock insuficiente de «Paracetamol 500 mg»: hay 100 y se piden 101/);
  assert.equal(mal.calls.length, 0);
});
prueba('alEmitir: no dispensa medicamentos vencidos (venció ayer no; vence hoy sí)', () => {
  const meds = medsFix(); meds[1].vencimiento = '2026-10-30';
  assert.throws(() => rec.alEmitir({ fecha: HOY, lineas: [linea('M500', 1, 1)] }, ctxRec({ medicamentos: meds })), /está vencido \(venció el 2026-10-30\)/);
  const hoy = medsFix(); hoy[1].vencimiento = HOY;
  rec.alEmitir({ fecha: HOY, lineas: [linea('M500', 1, 1)] }, ctxRec({ medicamentos: hoy }));
});

/* ============================ Medicamentos y seguros ============================ */
console.log('Medicamentos: situación y vencimiento');
const sit = (m, params) => calculado('medicamentos', 'situacion')(Object.assign({ stock: 100, stockMin: 10, vencimiento: '2027-12-31' }, m), crearCtx({ params }));
prueba('situación: Normal, Stock bajo (en el mínimo), Agotado, Por vencer (a 60 días) y Vencido', () => {
  assert.equal(sit({}), 'Normal');
  assert.equal(sit({ stock: 10 }), 'Stock bajo');
  assert.equal(sit({ stock: 11 }), 'Normal');
  assert.equal(sit({ stock: 0 }), 'Agotado');
  assert.equal(sit({ vencimiento: '2026-12-30' }), 'Por vencer', 'vence en 60 días (30/12)');
  assert.equal(sit({ vencimiento: '2026-12-31' }), 'Normal', '61 días');
  assert.equal(sit({ vencimiento: '2026-10-31' }), 'Por vencer', 'vence hoy: todavía sirve');
  assert.equal(sit({ vencimiento: '2026-10-30' }), 'Vencido', 'venció ayer');
});
prueba('prioridad: vencido gana a agotado y a stock bajo; agotado/bajo ganan a por vencer', () => {
  assert.equal(sit({ vencimiento: '2026-10-01', stock: 0 }), 'Vencido');
  assert.equal(sit({ vencimiento: '2026-11-15', stock: 0 }), 'Agotado');
  assert.equal(sit({ vencimiento: '2026-11-15', stock: 5 }), 'Stock bajo');
});
prueba('la alerta de vencimiento sale de Configuración y los días para vencer cuentan en calendario', () => {
  assert.equal(sit({ vencimiento: '2027-01-15' }, { diasPorVencer: 90 }), 'Por vencer');
  assert.equal(calculado('medicamentos', 'diasParaVencer')({ vencimiento: '2026-12-30' }, crearCtx()), 60);
  assert.equal(calculado('medicamentos', 'diasParaVencer')({ vencimiento: '2026-10-30' }, crearCtx()), -1);
  assert.equal(calculado('medicamentos', 'diasParaVencer')({}, crearCtx()), null);
  assert.equal(calculado('medicamentos', 'valorStock')({ precio: 0.35, stock: 240 }, crearCtx()), 84);
});
prueba('seguros y diagnósticos: cuentan pacientes afiliados y casos atendidos', () => {
  const ctx = crearCtx({ datos: { pacientes: [{ seguro: 'S1' }, { seguro: 'S1' }, { seguro: 'S2' }],
    atenciones: [{ diagnostico: 'D1', estado: 'Atendida' }, { diagnostico: 'D1', estado: 'Derivada' }, { diagnostico: 'D1', estado: 'Anulada' }, { diagnostico: 'D1', estado: 'Programada' }, { diagnostico: 'D2', estado: 'Atendida' }] } });
  assert.equal(calculado('seguros', 'pacientes')({ id: 'S1' }, ctx), 2);
  assert.equal(calculado('diagnosticos', 'casos')({ id: 'D1' }, ctx), 2);
});

/* ============================ Reportes y tablero sobre las semillas ============================ */
console.log('Reportes y tablero sobre las semillas');
const ctxS = ctxSemillas();
const rango = { desde: ctxS.fechaMas(HOY, -190), hasta: HOY };
prueba('semillas coherentes: totales finitos, atendidas con diagnóstico, citas en el pasado no atendidas y stock ≥ 0', () => {
  ctxS.datos.listar('atenciones').forEach((a) => {
    assert.ok(isFinite(a.totales.total) && a.totales.total > 0, a.id);
    if (a.estado === 'Atendida' || a.estado === 'Derivada') { assert.ok(a.diagnostico, a.id + ' sin diagnóstico'); assert.ok(a.fecha <= HOY, a.id); assert.ok(a.horaLlegada && a.horaInicio, a.id); assert.ok(esperaOk(a), a.id + ' espera imposible'); }
    if (a.estado === 'Anulada') { assert.ok(a.motivoAnulacion, a.id); }
  });
  ctxS.datos.listar('medicamentos').forEach((m) => { assert.ok(m.stock >= 0 && m.precio > 0); });
  function esperaOk(a) { const f = (h) => parseInt(h.slice(0, 2), 10) * 60 + parseInt(h.slice(3), 10); return f(a.horaInicio) >= f(a.horaLlegada); }
});
prueba('seed: todas las reglas de las atenciones y recetas se cumplen en los datos de demostración', () => {
  atn.reglas.forEach((r) => ctxS.datos.listar('atenciones').forEach((a) => assert.ok(r.validar(a, ctxS), r.id + ' falla en ' + a.id)));
  rec.reglas.forEach((r) => ctxS.datos.listar('recetas').forEach((d) => assert.ok(r.validar(d, ctxS), r.id + ' falla en ' + d.id)));
  ctxS.datos.listar('recetas').forEach((d) => { assert.ok(isFinite(d.totales.total) && d.totales.total > 0, d.id); assert.equal(redondear(d.totales.cobertura + d.totales.copago), d.totales.total); });
});
prueba('seed: hay pacientes de todos los grupos etarios y de cada clase de IMC adulto relevante', () => {
  const grupos = {}, clases = {};
  ctxS.datos.listar('pacientes').forEach((p) => { grupos[calculado('pacientes', 'grupoEtario')(p, ctxS)] = 1; clases[calculado('pacientes', 'claseImc')(p, ctxS)] = 1; });
  ['Lactante', 'Niño', 'Adolescente', 'Adulto', 'Adulto mayor'].forEach((g) => assert.ok(grupos[g], g));
  ['Normal', 'Sobrepeso', 'Obesidad I', 'Obesidad II', 'No aplica (menor de 18 años)'].forEach((c) => assert.ok(clases[c], c));
});
prueba('seed: hay medicamentos normales, con stock bajo, por vencer y vencidos', () => {
  const s = {};
  ctxS.datos.listar('medicamentos').forEach((m) => { s[calculado('medicamentos', 'situacion')(m, ctxS)] = 1; });
  ['Normal', 'Stock bajo', 'Por vencer', 'Vencido'].forEach((x) => assert.ok(s[x], x));
});
prueba('atenciones por especialidad: el total del resumen = atenciones dadas y los copagos suman', () => {
  const r = reporte('atenciones-especialidad').ejecutar(rango, ctxS);
  const dadas = ctxS.datos.listar('atenciones', (a) => a.estado === 'Atendida' || a.estado === 'Derivada');
  assert.equal(r.resumen[0].valor, dadas.length);
  assert.equal(r.filas.reduce((t, f) => t + f[1], 0), dadas.length);
  r.filas.forEach((f) => { assert.ok(f[2] <= f[1]); assert.ok(Math.abs(f[3] - (f[4] + f[5])) < 0.02, f[0] + ': valor = pagado + cubierto'); });
  assert.ok(r.filas.length >= 4);
});
prueba('morbilidad: porcentajes suman 100 (con todos los diagnósticos) y los menores no exceden los casos', () => {
  const r = reporte('morbilidad').ejecutar({ desde: rango.desde, hasta: rango.hasta, top: 50 }, ctxS);
  assert.ok(Math.abs(r.filas.reduce((t, f) => t + f[4], 0) - 100) < 0.2);
  r.filas.forEach((f) => assert.ok(f[5] <= f[3]));
  for (let i = 1; i < r.filas.length; i++) { assert.ok(r.filas[i - 1][3] >= r.filas[i][3]); }
  assert.equal(reporte('morbilidad').ejecutar({ desde: rango.desde, hasta: rango.hasta, top: 3 }, ctxS).filas.length, 3);
});
prueba('consumo de medicamentos: unidades y valor coinciden con las recetas dispensadas; la cobertura = stock / consumo diario', () => {
  const r = reporte('consumo-medicamentos').ejecutar({ desde: ctxS.fechaMas(HOY, -99), hasta: HOY }, ctxS);
  const recs = ctxS.datos.listar('recetas', (d) => d.estado === 'Dispensada' && d.fecha >= ctxS.fechaMas(HOY, -99));
  const unidades = recs.reduce((t, d) => t + d.lineas.reduce((s, l) => s + l.cantidad, 0), 0);
  assert.equal(r.resumen[1].valor, unidades);
  assert.equal(r.resumen[0].valor, recs.length);
  r.filas.forEach((f) => { if (f[4] > 0) { assert.ok(f[5] === Math.floor(f[3] / (f[1] / 100)), f[0]); } });
});
prueba('tiempos de espera: promedio entre mínimo y máximo, el límite sale de Configuración y las filas se ordenan', () => {
  const r = reporte('tiempos-espera').ejecutar(rango, ctxS);
  assert.ok(r.filas.length >= 3);
  r.filas.forEach((f) => { assert.ok(f[2] <= f[3] && f[2] > 0, f[0]); assert.ok(f[4] <= f[1]); });
  for (let i = 1; i < r.filas.length; i++) { assert.ok(r.filas[i - 1][2] >= r.filas[i][2]); }
  const estricto = reporte('tiempos-espera').ejecutar(rango, ctxSemillasConParams({ esperaMaxMin: 0 }));
  assert.ok(estricto.resumen[2].valor === 100, 'con límite 0 todas las esperas lo superan');
  const holgado = reporte('tiempos-espera').ejecutar(rango, ctxSemillasConParams({ esperaMaxMin: 1000 }));
  assert.equal(holgado.resumen[1].valor, 0);
});
prueba('citas no atendidas: anuladas + programadas vencidas; las futuras y las de hoy no cuentan', () => {
  const r = reporte('citas-no-atendidas').ejecutar(rango, ctxS);
  const esperadas = ctxS.datos.listar('atenciones', (a) => a.estado === 'Anulada' || (a.estado === 'Programada' && a.fecha < HOY)).length;
  assert.equal(r.resumen[0].valor, esperadas);
  assert.equal(r.filas.length, esperadas);
  assert.ok(r.resumen[1].valor >= 1 && r.resumen[2].valor >= 1);
  assert.ok(r.filas.every((f) => f[0] < HOY));
  for (let i = 1; i < r.filas.length; i++) { assert.ok(r.filas[i - 1][0] >= r.filas[i][0]); }
});
prueba('tablero: ningún indicador da NaN ni lanza error; el gráfico tiene 6 meses con datos', () => {
  CFG.tablero.forEach((t) => { const v = t.calcular(ctxS); assert.ok(v === null || (typeof v === 'number' && isFinite(v)), t.titulo + ' → ' + v); });
  const g = CFG.tableroGrafico.calcular(ctxS);
  assert.equal(g.etiquetas.length, 6); assert.ok(g.valores.some((v) => v > 0));
  const pct = CFG.tablero[2].calcular(ctxS);
  assert.ok(pct >= 0 && pct <= 100);
});

console.log('\n' + n + ' pruebas correctas' + (process.exitCode ? ' · HAY FALLOS' : ''));
