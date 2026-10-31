/*
 * Prueba de las fórmulas de «transportes» SIN navegador.
 *   node sistemas/transportes/formulas.test.mjs
 * Carga config.js en un contexto aislado (node:vm) con un window falso, arma un ctx de
 * pruebas (parámetros, redondeo, suma, un almacén de datos en memoria) y compara con
 * resultados calculados a mano. Todos los datos son inventados.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const caja = { window: {} };
vm.createContext(caja);
vm.runInContext(fs.readFileSync(path.join(aqui, 'config.js'), 'utf8'), caja, { filename: 'config.js' });
const SIS = caja.window.SISTEMA;

/* ---------- ctx de pruebas (misma semántica que nucleo/js/45-calculos.js) ---------- */
function redondear(n) {
  const signo = n < 0 ? -1 : 1;
  if (typeof n !== 'number' || !isFinite(n)) { return 0; }
  return signo * Math.round(Math.abs(n) * 100 + 1e-7) / 100;
}
function crearCtx(datos, hoy) {
  const params = {};
  SIS.parametros.forEach((p) => { params[p.id] = p.valor; });
  const col = (e) => { if (!datos[e]) { datos[e] = []; } return datos[e]; };
  const ctx = {
    datos: {
      listar: (e, fn) => col(e).filter((r) => (fn ? fn(r) : true)).map((r) => JSON.parse(JSON.stringify(r))),
      obtener: (e, id) => { const r = col(e).filter((x) => x.id === id)[0]; return r ? JSON.parse(JSON.stringify(r)) : undefined; },
      actualizar: (e, id, parche) => {
        const r = col(e).filter((x) => x.id === id)[0];
        if (!r) { throw new Error('no existe ' + id); }
        const nuevo = Object.assign({}, r, parche);
        const def = SIS.entidades.filter((x) => x.id === e)[0];
        (def.reglas || []).forEach((rg) => { if (!rg.validar(nuevo, ctx)) { throw new Error(rg.mensaje); } });
        Object.assign(r, parche);
        return r;
      }
    },
    param: (id) => (params[id] === undefined ? 0 : params[id]),
    hoy: () => hoy || '2026-10-31',
    redondear,
    suma: (a, fn) => { let t = 0; (a || []).forEach((x, i) => { const v = fn ? fn(x, i) : x; if (typeof v === 'number' && isFinite(v)) { t += v; } }); return t; },
    agrupar: (a, fn) => { const g = {}; a.forEach((x, i) => { const k = String(fn(x, i)); (g[k] = g[k] || []).push(x); }); return g; },
    fmt: { moneda: (n) => 'S/ ' + n.toFixed(2), fecha: (s) => s, num: (n) => String(n) },
    fechaMas: (s, d) => { const f = new Date(s + 'T12:00:00'); f.setDate(f.getDate() + d); return f.toISOString().slice(0, 10); },
    mes: (s) => String(s).slice(0, 7),
    diasEntre: (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000),
    params
  };
  return ctx;
}
/* Las matrices vienen de otro contexto (node:vm): se comparan por su JSON. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const op = (id) => SIS.operaciones.filter((o) => o.id === id)[0];
const ent = (id) => SIS.entidades.filter((e) => e.id === id)[0];
const cal = (e, id) => ent(e).calculados.filter((c) => c.id === id)[0].formula;
const rep = (id) => SIS.reportes.filter((r) => r.id === id)[0];
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, (msg || '') + ' esperado ' + b + ', salió ' + a);

/* ---------- datos mínimos ---------- */
function base() {
  return {
    vehiculos: [
      { id: 'V1', placa: 'AAA-111', tipo: 'Tracto camión', marca: 'Volvo', modelo: 'FH', capacidadKg: 32000, valorCompra: 400000, vidaUtilKm: 1000000, kmActual: 100000, intervaloMantKm: 20000, ultimoMantKm: 90000, soatVence: '2027-01-01', revTecVence: '2027-01-01', estado: 'Operativo' },
      { id: 'V2', placa: 'BBB-222', tipo: 'Camión furgón', marca: 'Hino', modelo: '300', capacidadKg: 3500, valorCompra: 100000, vidaUtilKm: 500000, kmActual: 50000, intervaloMantKm: 10000, ultimoMantKm: 40000, soatVence: '2026-10-20', revTecVence: '2026-11-10', estado: 'Operativo' }
    ],
    conductores: [
      { id: 'C1', nombre: 'Conductor Uno', categoria: 'A-IIIc', licenciaVence: '2027-05-01', activo: true },
      { id: 'C2', nombre: 'Conductor Dos', categoria: 'A-IIIb', licenciaVence: '2026-11-15', activo: true },
      { id: 'C3', nombre: 'Conductor Tres', categoria: 'A-IIIc', licenciaVence: '2026-01-01', activo: false }
    ],
    clientes: [{ id: 'K1', nombre: 'Cliente Uno' }, { id: 'K2', nombre: 'Cliente Dos' }],
    rutas: [
      { id: 'R1', nombre: 'Arequipa → Cusco', km: 500, peajes: 100 },
      { id: 'R2', nombre: 'Arequipa → Ilo', km: 200, peajes: 40 }
    ],
    viajes: [], mantenimientos: []
  };
}

let n = 0;
function prueba(nombre, fn) { fn(); n++; console.log('  ok  ' + nombre); }

const VIA = op('viajes');
const viaje = (extra) => Object.assign({ ruta: 'R1', vehiculo: 'V1', conductor: 'C1', cliente: 'K1', idaYVuelta: false, pesoKg: 24000, flete: 2500, galones: 80, viaticos: 150 }, extra || {});

/* ================= Viaje: costos, margen, rendimiento y ocupación ================= */
prueba('Viaje de ida: combustible + peajes + viáticos + depreciación, margen, costo por km, km/galón y ocupación', () => {
  const t = VIA.calcular(viaje(), crearCtx(base()));
  cerca(t.combustible, 1400, '80 gal × S/ 17.50');
  cerca(t.peajes, 100);
  cerca(t.viaticos, 150);
  cerca(t.depreciacion, 160, '500 km × (400000 × 80 % ÷ 1000000) = 500 × 0.32');
  cerca(t.costoTotal, 1810);
  cerca(t.flete, 2500); cerca(t.igv, 450); cerca(t.total, 2950);
  cerca(t.margen, 690); cerca(t.margenPct, 27.6, '690 ÷ 2500');
  cerca(t.km, 500); cerca(t.costoKm, 3.62, '1810 ÷ 500');
  cerca(t.rendimiento, 6.25, '500 km ÷ 80 gal');
  cerca(t.ocupacion, 75, '24000 ÷ 32000');
});

prueba('Viaje redondo: duplica km y peajes de la ruta', () => {
  const t = VIA.calcular(viaje({ idaYVuelta: true, galones: 160 }), crearCtx(base()));
  cerca(t.km, 1000); cerca(t.peajes, 200); cerca(t.depreciacion, 320);
  cerca(t.combustible, 2800);
  cerca(t.costoTotal, 3470, '2800 + 200 + 150 + 320');
  cerca(t.costoKm, 3.47); cerca(t.rendimiento, 6.25);
});

prueba('Los parámetros mandan: precio del galón, valor residual e IGV', () => {
  const ctx = crearCtx(base());
  ctx.params.precioGalon = 20;
  cerca(VIA.calcular(viaje(), ctx).combustible, 1600, '80 × 20');
  ctx.params.valorResidual = 0;
  cerca(VIA.calcular(viaje(), ctx).depreciacion, 200, '500 × 0.40');
  ctx.params.igv = 10;
  cerca(VIA.calcular(viaje(), ctx).igv, 250);
});

prueba('Casos de borde del viaje: sin galones, sin flete, sin ruta, sin vehículo o sin vida útil', () => {
  const ctx = crearCtx(base());
  const sinGal = VIA.calcular(viaje({ galones: 0 }), ctx);
  cerca(sinGal.rendimiento, 0, 'sin galones no se divide'); cerca(sinGal.combustible, 0);
  const sinFlete = VIA.calcular(viaje({ flete: 0 }), ctx);
  cerca(sinFlete.margenPct, 0); cerca(sinFlete.igv, 0); cerca(sinFlete.margen, -1810, 'pérdida completa');
  const sinRuta = VIA.calcular(viaje({ ruta: 'NO' }), ctx);
  cerca(sinRuta.km, 0); cerca(sinRuta.costoKm, 0); cerca(sinRuta.rendimiento, 0, '0 km ÷ 80 gal');
  const sinVeh = VIA.calcular(viaje({ vehiculo: 'NO' }), ctx);
  cerca(sinVeh.depreciacion, 0); cerca(sinVeh.ocupacion, 0, 'sin capacidad no se divide');
  const d = base(); d.vehiculos[0].vidaUtilKm = 0;
  cerca(VIA.calcular(viaje(), crearCtx(d)).depreciacion, 0, 'vida útil cero');
  Object.keys(sinRuta).forEach((k) => assert.ok(isFinite(sinRuta[k]), k + ' finito'));
});

prueba('Pérdida: viaje con flete menor al costo da margen y margen % negativos', () => {
  const t = VIA.calcular(viaje({ ruta: 'R2', vehiculo: 'V2', conductor: 'C2', pesoKg: 1750, flete: 400, galones: 20, viaticos: 30 }, ), crearCtx(base()));
  // combustible 350 + peajes 40 + viáticos 30 + depreciación 200 × (100000 × 0.8 ÷ 500000 = 0.16) = 32
  cerca(t.costoTotal, 452); cerca(t.margen, -52); cerca(t.margenPct, -13);
  cerca(t.ocupacion, 50); cerca(t.rendimiento, 10);
});

prueba('Regla: la carga no supera la capacidad del vehículo (límite exacto permitido)', () => {
  const ctx = crearCtx(base());
  const r = VIA.reglas[0].validar;
  assert.equal(r({ vehiculo: 'V1', pesoKg: 32000 }, ctx), true);
  assert.equal(r({ vehiculo: 'V1', pesoKg: 32001 }, ctx), false);
  assert.equal(r({ vehiculo: 'NO', pesoKg: 1 }, ctx), false);
});

/* ================= Viaje: despacho ================= */
prueba('alEmitir: suma los km al vehículo (el viaje redondo, el doble)', () => {
  const d = base(), ctx = crearCtx(d);
  VIA.alEmitir(viaje({ fecha: '2026-10-31' }), ctx);
  assert.equal(d.vehiculos[0].kmActual, 100500);
  VIA.alEmitir(viaje({ fecha: '2026-10-31', idaYVuelta: true }), ctx);
  assert.equal(d.vehiculos[0].kmActual, 101500);
});

prueba('alEmitir: no deja salir con vehículo no operativo, SOAT o revisión vencidos (límite = el mismo día sí)', () => {
  const d = base(), ctx = crearCtx(d);
  d.vehiculos[0].estado = 'En mantenimiento';
  assert.throws(() => VIA.alEmitir(viaje({ fecha: '2026-10-31' }), ctx), /«En mantenimiento»/);
  d.vehiculos[0].estado = 'Operativo';
  d.vehiculos[0].soatVence = '2026-10-30';
  assert.throws(() => VIA.alEmitir(viaje({ fecha: '2026-10-31' }), ctx), /SOAT/);
  d.vehiculos[0].soatVence = '2026-10-31';
  VIA.alEmitir(viaje({ fecha: '2026-10-31' }), ctx);   // vence ese mismo día: todavía vale
  d.vehiculos[0].revTecVence = '2026-10-30';
  assert.throws(() => VIA.alEmitir(viaje({ fecha: '2026-10-31' }), ctx), /revisión técnica/);
});

prueba('alEmitir: conductor inactivo o con la licencia vencida no puede salir', () => {
  const d = base(), ctx = crearCtx(d);
  assert.throws(() => VIA.alEmitir(viaje({ conductor: 'C3', fecha: '2026-10-31' }), ctx), /no está activo/);
  d.conductores[0].licenciaVence = '2026-10-30';
  assert.throws(() => VIA.alEmitir(viaje({ fecha: '2026-10-31' }), ctx), /licencia de Conductor Uno venció/);
  d.conductores[0].licenciaVence = '2026-10-31';
  VIA.alEmitir(viaje({ fecha: '2026-10-31' }), ctx);
});

prueba('alEmitir: el vehículo o el conductor no pueden estar ya en ruta en otro viaje', () => {
  const d = base(), ctx = crearCtx(d);
  d.vehiculos[1].soatVence = '2027-01-01'; d.vehiculos[1].revTecVence = '2027-01-01';
  d.viajes.push({ id: 'X1', numero: 'GT01-00000007', estado: 'En ruta', vehiculo: 'V1', conductor: 'C2' });
  assert.throws(() => VIA.alEmitir(viaje({ id: 'X2', fecha: '2026-10-31' }), ctx), /GT01-00000007/);
  assert.throws(() => VIA.alEmitir(viaje({ id: 'X2', vehiculo: 'V2', conductor: 'C2', ruta: 'R2', fecha: '2026-10-31' }), ctx), /ya están en ruta/);
  d.viajes[0].estado = 'Entregado';
  VIA.alEmitir(viaje({ id: 'X2', fecha: '2026-10-31' }), ctx);
  d.viajes.push({ id: 'X3', estado: 'En ruta', vehiculo: 'V1', conductor: 'C1' });
  VIA.alEmitir(viaje({ id: 'X3', fecha: '2026-10-31' }), ctx);   // el propio viaje no cuenta contra sí mismo
});

prueba('alAnular: devuelve los km (sin bajar de cero) y avisa si ya hubo un mantenimiento posterior', () => {
  const d = base(), ctx = crearCtx(d);
  VIA.alAnular(viaje(), ctx);
  assert.equal(d.vehiculos[0].kmActual, 99500);
  d.vehiculos[1].kmActual = 100; d.vehiculos[1].ultimoMantKm = 0;
  VIA.alAnular(viaje({ vehiculo: 'V2', ruta: 'R1' }), ctx);
  assert.equal(d.vehiculos[1].kmActual, 0, 'no baja de cero');
  d.vehiculos[0].kmActual = 100000; d.vehiculos[0].ultimoMantKm = 99800;
  assert.throws(() => VIA.alAnular(viaje(), ctx), /mantenimiento registrado después/);
  assert.equal(d.vehiculos[0].kmActual, 100000, 'nada cambia si falla');
});

/* ================= Mantenimiento ================= */
const MNT = op('mantenimientos');

prueba('Mantenimiento: mano de obra + repuestos + IGV 18 %', () => {
  const t = MNT.calcular({ manoObra: 1000, repuestos: 500 }, crearCtx(base()));
  cerca(t.subtotal, 1500); cerca(t.igv, 270); cerca(t.total, 1770);
  cerca(MNT.calcular({ manoObra: 100 }, crearCtx(base())).total, 118, 'sin repuestos');
  cerca(MNT.calcular({}, crearCtx(base())).total, 0);
});

prueba('alEmitir de mantenimiento: preventivo reinicia el conteo; correctivo no; el km nunca retrocede', () => {
  const d = base(), ctx = crearCtx(d);
  MNT.alEmitir({ vehiculo: 'V1', tipo: 'Preventivo', kmServicio: 105000 }, ctx);
  assert.equal(d.vehiculos[0].kmActual, 105000);
  assert.equal(d.vehiculos[0].ultimoMantKm, 105000);
  MNT.alEmitir({ vehiculo: 'V1', tipo: 'Correctivo', kmServicio: 106000 }, ctx);
  assert.equal(d.vehiculos[0].kmActual, 106000);
  assert.equal(d.vehiculos[0].ultimoMantKm, 105000, 'el correctivo no reinicia');
  MNT.alEmitir({ vehiculo: 'V1', tipo: 'Preventivo', kmServicio: 1000 }, ctx);
  assert.equal(d.vehiculos[0].kmActual, 106000);
  assert.equal(d.vehiculos[0].ultimoMantKm, 105000, 'un km anterior al último mantenimiento no lo cambia');
});

prueba('alEmitir de mantenimiento: un vehículo «En mantenimiento» vuelve a «Operativo»', () => {
  const d = base(), ctx = crearCtx(d);
  d.vehiculos[0].estado = 'En mantenimiento';
  MNT.alEmitir({ vehiculo: 'V1', tipo: 'Correctivo', kmServicio: 100000 }, ctx);
  assert.equal(d.vehiculos[0].estado, 'Operativo');
});

prueba('alAnular de mantenimiento preventivo: vuelve al km del preventivo anterior (o a 0)', () => {
  const d = base(), ctx = crearCtx(d);
  d.mantenimientos.push({ id: 'M1', vehiculo: 'V1', tipo: 'Preventivo', estado: 'Realizado', kmServicio: 80000 });
  d.mantenimientos.push({ id: 'M2', vehiculo: 'V1', tipo: 'Preventivo', estado: 'Anulado', kmServicio: 95000 });
  d.mantenimientos.push({ id: 'M3', vehiculo: 'V1', tipo: 'Correctivo', estado: 'Realizado', kmServicio: 85000 });
  MNT.alAnular({ id: 'M4', vehiculo: 'V1', tipo: 'Preventivo', kmServicio: 90000 }, ctx);
  assert.equal(d.vehiculos[0].ultimoMantKm, 80000, 'ignora anulados y correctivos');
  d.mantenimientos = [];
  MNT.alAnular({ id: 'M4', vehiculo: 'V1', tipo: 'Preventivo', kmServicio: 80000 }, ctx);
  assert.equal(d.vehiculos[0].ultimoMantKm, 0);
  d.vehiculos[0].ultimoMantKm = 55;
  MNT.alAnular({ id: 'M5', vehiculo: 'V1', tipo: 'Correctivo', kmServicio: 100 }, ctx);
  assert.equal(d.vehiculos[0].ultimoMantKm, 55, 'anular un correctivo no toca el conteo');
});

/* ================= Entidades: calculados y reglas ================= */
prueba('Vehículo: depreciación por km, próximo mantenimiento y situación con límites exactos', () => {
  const ctx = crearCtx(base());
  cerca(cal('vehiculos', 'depreciacionKm')(base().vehiculos[0], ctx), 0.32);
  cerca(cal('vehiculos', 'depreciacionKm')(base().vehiculos[1], ctx), 0.16);
  assert.equal(cal('vehiculos', 'depreciacionKm')({ valorCompra: 100, vidaUtilKm: 0 }, ctx), 0);
  assert.equal(cal('vehiculos', 'proximoMant')({ ultimoMantKm: 90000, intervaloMantKm: 20000 }), 110000);
  assert.equal(cal('vehiculos', 'proximoMant')({ intervaloMantKm: 15000 }), 15000);
  const sit = (km) => cal('vehiculos', 'situacionMant')({ kmActual: km, ultimoMantKm: 0, intervaloMantKm: 10000 }, ctx);
  assert.equal(sit(12000), 'Vencido');
  assert.equal(sit(10000), 'Vencido', 'resta 0');
  assert.equal(sit(8000), 'Por vencer', 'restan 2000 = el aviso');
  assert.equal(sit(7999), 'Al día', 'restan 2001');
});

prueba('Documentos del vehículo y licencia: vencido, por vencer (hasta 30 días) y vigente', () => {
  const ctx = crearCtx(base(), '2026-10-31');
  const doc = cal('vehiculos', 'documentos');
  const v = (a, b) => ({ soatVence: a, revTecVence: b });
  assert.equal(doc(v('2026-10-30', '2027-06-01'), ctx), 'Vencido');
  assert.equal(doc(v('2027-06-01', '2026-10-30'), ctx), 'Vencido');
  assert.equal(doc(v('2026-10-31', '2027-06-01'), ctx), 'Por vencer', 'vence hoy');
  assert.equal(doc(v('2026-11-30', '2027-06-01'), ctx), 'Por vencer', '30 días');
  assert.equal(doc(v('2026-12-01', '2027-06-01'), ctx), 'Vigentes', '31 días');
  const lic = cal('conductores', 'estadoLicencia');
  assert.equal(lic({ licenciaVence: '2026-10-30' }, ctx), 'Vencido');
  assert.equal(lic({ licenciaVence: '2026-11-15' }, ctx), 'Por vencer');
  assert.equal(lic({ licenciaVence: '2027-11-15' }, ctx), 'Vigente');
  assert.equal(lic({}, ctx), 'Sin dato');
});

prueba('Regla del vehículo: el último mantenimiento no supera el km actual', () => {
  const r = ent('vehiculos').reglas[0].validar;
  assert.equal(r({ kmActual: 100, ultimoMantKm: 100 }), true);
  assert.equal(r({ kmActual: 100, ultimoMantKm: 101 }), false);
  assert.equal(r({ kmActual: 0 }), true);
});

/* ================= Reportes (con datos calculados por la propia operación) ================= */
function conViajes() {
  const d = base(), ctx = crearCtx(d, '2026-10-31');
  const mk = (id, fecha, estado, extra) => {
    const v = Object.assign(viaje(), { id, fecha, estado }, extra || {});
    v.totales = VIA.calcular(v, ctx);
    d.viajes.push(v);
  };
  mk('T1', '2026-10-10', 'Entregado');                                                              // costo 1810, margen 690
  mk('T2', '2026-09-20', 'Entregado', { idaYVuelta: true, galones: 160, pesoKg: 32000, flete: 5000 }); // costo 3470, margen 1530
  mk('T3', '2026-10-15', 'Entregado', { ruta: 'R2', vehiculo: 'V2', conductor: 'C2', cliente: 'K2', pesoKg: 1750, flete: 400, galones: 20, viaticos: 30 }); // margen −52
  mk('T4', '2026-10-28', 'En ruta');
  mk('T5', '2026-10-05', 'Anulado');
  return d;
}

prueba('Reporte rentabilidad por ruta: solo entregados, ordenado por margen y con la meta del 15 %', () => {
  const ctx = crearCtx(conViajes(), '2026-10-31');
  const r = rep('rentabilidad-ruta').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 2);
  igual(r.filas[0].slice(0, 3), ['Arequipa → Cusco', 2, 1500]);
  cerca(r.filas[0][3], 7500); cerca(r.filas[0][4], 5280); cerca(r.filas[0][5], 2220); cerca(r.filas[0][6], 29.6);
  assert.equal(r.filas[0][7], 'Cumple la meta');
  assert.equal(r.filas[1][0], 'Arequipa → Ilo');
  cerca(r.filas[1][5], -52); cerca(r.filas[1][6], -13); assert.equal(r.filas[1][7], 'Bajo la meta');
  cerca(r.resumen[0].valor, 7900); cerca(r.resumen[1].valor, 2168); cerca(r.resumen[2].valor, 27.44, '2168 ÷ 7900');
  const solo = rep('rentabilidad-ruta').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  assert.equal(solo.filas.length, 2); cerca(solo.filas[0][5], 690);
});

prueba('Rentabilidad: un margen exactamente igual a la meta cuenta como «Cumple la meta»', () => {
  const d = conViajes(), ctx = crearCtx(d, '2026-10-31');
  d.viajes = d.viajes.filter((v) => v.id === 'T3');
  d.viajes[0].totales.flete = 100; d.viajes[0].totales.costoTotal = 85;   // margen 15 %
  const r = rep('rentabilidad-ruta').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  cerca(r.filas[0][6], 15); assert.equal(r.filas[0][7], 'Cumple la meta');
});

prueba('Reporte costo por km por vehículo: desglose, costo por km y km por galón', () => {
  const ctx = crearCtx(conViajes(), '2026-10-31');
  const r = rep('costo-km-vehiculo').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 2);
  assert.equal(r.filas[0][0], 'AAA-111');
  assert.equal(r.filas[0][2], 2); assert.equal(r.filas[0][3], 1500);
  cerca(r.filas[0][4], 4200); cerca(r.filas[0][5], 300); cerca(r.filas[0][6], 300); cerca(r.filas[0][7], 480);
  cerca(r.filas[0][8], 5280); cerca(r.filas[0][9], 3.52); cerca(r.filas[0][10], 6.25);
  assert.equal(r.filas[1][0], 'BBB-222'); cerca(r.filas[1][9], 2.26, '452 ÷ 200'); cerca(r.filas[1][10], 10);
  cerca(r.resumen[0].valor, 3.37, '5732 ÷ 1700');
  const vacio = rep('costo-km-vehiculo').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx);
  assert.equal(vacio.filas.length, 0); cerca(vacio.resumen[0].valor, 0); cerca(vacio.resumen[1].valor, 0);
});

prueba('Reporte vencimientos: documentos hasta la fecha, mantenimiento por km, orden y filtros', () => {
  const ctx = crearCtx(base(), '2026-10-31');
  const r = rep('vencimientos').ejecutar({ hasta: '2026-11-30', filtro: 'Vencidos y por vencer' }, ctx);
  igual(r.filas.map((f) => [f[0], f[1], f[6]]), [['SOAT', 'BBB-222', 'Vencido'], ['Mantenimiento', 'BBB-222', 'Vencido'], ['Revisión técnica', 'BBB-222', 'Por vencer'], ['Licencia de conducir', 'Conductor Dos', 'Por vencer']]);
  assert.equal(r.filas[0][4], -11); assert.equal(r.filas[1][5], 0); assert.equal(r.filas[2][4], 10); assert.equal(r.filas[3][4], 15);
  assert.equal(r.resumen[0].valor, 2); assert.equal(r.resumen[1].valor, 2); assert.equal(r.resumen[2].valor, 4);
  igual(r.grafico.valores, [1, 1, 1, 1]);
  const venc = rep('vencimientos').ejecutar({ hasta: '2026-11-30', filtro: 'Solo vencidos' }, ctx);
  assert.equal(venc.filas.length, 2);
  const corto = rep('vencimientos').ejecutar({ hasta: '2026-10-31', filtro: 'Vencidos y por vencer' }, ctx);
  assert.equal(corto.filas.length, 2, 'solo lo que vence hasta el 31-10 (el SOAT) y el mantenimiento por km');
  const largo = rep('vencimientos').ejecutar({ hasta: '2027-12-31', filtro: 'Vencidos y por vencer' }, ctx);
  assert.equal(largo.filas.length, 7, 'ahora entran SOAT y revisión de V1 y la licencia de C1');
});

prueba('Reporte viajes por conductor: viajes, km, km por galón, ocupación media y viáticos', () => {
  const ctx = crearCtx(conViajes(), '2026-10-31');
  const r = rep('viajes-conductor').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 2);
  igual(r.filas[0].slice(0, 3), ['Conductor Uno', 2, 1500]);
  cerca(r.filas[0][3], 6.25); cerca(r.filas[0][4], 87.5, '(75 + 100) ÷ 2'); cerca(r.filas[0][5], 300);
  assert.equal(r.filas[1][0], 'Conductor Dos'); cerca(r.filas[1][3], 10); cerca(r.filas[1][4], 50);
  assert.equal(r.resumen[0].valor, 3); cerca(r.resumen[2].valor, 1.5);
});

prueba('Reporte ocupación de la flota: kilos ÷ (capacidad × viajes), de menor a mayor', () => {
  const ctx = crearCtx(conViajes(), '2026-10-31');
  const r = rep('ocupacion-flota').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas[0][0], 'BBB-222'); cerca(r.filas[0][5], 50);
  assert.equal(r.filas[1][0], 'AAA-111'); assert.equal(r.filas[1][4], 56000); cerca(r.filas[1][5], 87.5);
  cerca(r.resumen[0].valor, 85.56, '57750 ÷ 67500'); cerca(r.resumen[1].valor, 57.75);
  const vacio = rep('ocupacion-flota').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx);
  cerca(vacio.resumen[0].valor, 0);
});

/* ================= Cliente y tablero ================= */
prueba('Cliente: fletes entregados; Conductor: viajes realizados', () => {
  const ctx = crearCtx(conViajes(), '2026-10-31');
  cerca(cal('clientes', 'fletes')({ id: 'K1' }, ctx), 7500);
  cerca(cal('clientes', 'fletes')({ id: 'K2' }, ctx), 400);
  assert.equal(cal('conductores', 'viajes')({ id: 'C1' }, ctx), 2);
  assert.equal(cal('conductores', 'viajes')({ id: 'C3' }, ctx), 0);
});

prueba('Tablero: indicadores con datos y gráfico de km por mes', () => {
  const ctx = crearCtx(conViajes(), '2026-10-31');
  const ind = (i) => SIS.tablero[i].calcular(ctx);
  cerca(ind(0), 2900, 'fletes del 02-10 al 31-10: T1 + T3');
  cerca(ind(1), 638, '690 − 52');
  assert.equal(ind(2), 1, 'un viaje en ruta');
  cerca(ind(3), 72.54, '25750 ÷ 35500');
  cerca(ind(4), 3.23, '2262 ÷ 700');
  assert.equal(ind(5), 4, 'alertas hasta 30 días');
  const g = SIS.tableroGrafico.calcular(ctx);
  igual(g.etiquetas, ['may', 'jun', 'jul', 'ago', 'sep', 'oct']);
  igual(g.valores, [0, 0, 0, 0, 1000, 700]);
});

prueba('Tablero sin viajes: ceros y vacíos sin errores', () => {
  const ctx = crearCtx(base(), '2026-10-31');
  cerca(SIS.tablero[0].calcular(ctx), 0);
  assert.equal(SIS.tablero[3].calcular(ctx), null);
  assert.equal(SIS.tablero[4].calcular(ctx), null);
  igual(SIS.tableroGrafico.calcular(ctx).valores, [0, 0, 0, 0, 0, 0]);
});

console.log('\n' + n + ' pruebas de fórmulas de transportes: todas correctas.');
