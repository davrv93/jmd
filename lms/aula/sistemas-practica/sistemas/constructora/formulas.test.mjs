/*
 * Pruebas de las fórmulas del sistema «constructora», sin navegador.
 * Carga config.js en node:vm con un window falso y arma un ctx de pruebas con las
 * utilidades reales del núcleo (00-util.js), para que el redondeo y las fechas sean los de producción.
 * Uso:  node sistemas/constructora/formulas.test.mjs
 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const NUCLEO = path.join(AQUI, '..', '..', 'nucleo', 'js');

const caja = { window: {}, console };
caja.window.window = caja.window;
vm.createContext(caja);
vm.runInContext(fs.readFileSync(path.join(NUCLEO, '00-util.js'), 'utf8'), caja, { filename: '00-util.js' });
vm.runInContext(fs.readFileSync(path.join(AQUI, 'config.js'), 'utf8'), caja, { filename: 'config.js' });
const U = caja.window.U;
const S = caja.window.SISTEMA;

const clonar = (o) => JSON.parse(JSON.stringify(o));
/* Igualdad profunda de valores creados dentro del vm (sus prototipos son de otro reino). */
const deep = (real, esperado) => assert.deepStrictEqual(clonar(real), esperado);

function crearCtx(datos, params, hoy) {
  const col = (c) => datos[c] || [];
  return {
    datos: {
      listar: (c, f) => col(c).filter((x) => !f || f(clonar(x))).map(clonar),
      obtener: (c, id) => { const r = col(c).find((x) => x.id === id); return r ? clonar(r) : null; },
      contar: (c) => col(c).length,
      actualizar: (c, id, parche) => { const r = col(c).find((x) => x.id === id); Object.assign(r, parche); return clonar(r); },
      crear: () => { throw new Error('no se usa'); },
      eliminar: () => { throw new Error('no se usa'); }
    },
    param: (id) => (params[id] === undefined ? 0 : params[id]),
    hoy: () => hoy,
    usuario: () => null,
    redondear: U.redondear, suma: U.suma, agrupar: U.agrupar,
    fmt: U.fmt, fechaMas: U.fechaMas, mes: U.mes, diasEntre: U.diasEntre
  };
}

const PARAMS = { igv: 18, ggPct: 5, utilidadPct: 5, retencionGarantia: 5, diasPagoValorizacion: 30, toleranciaAtraso: 5 };
const HOY = '2026-10-31';

let n = 0;
function prueba(nombre, fn) {
  try { fn(); n += 1; console.log('  ok  ' + nombre); } catch (e) { console.log('  FALLA ' + nombre + '\n' + e.message); process.exitCode = 1; }
}

const ent = (id) => S.entidades.filter((e) => e.id === id)[0];
const opVal = S.operaciones[0];
const opReq = S.operaciones[1];
const regla = (op, id) => op.reglas.filter((r) => r.id === id)[0].validar;
const rep = (id) => S.reportes.filter((r) => r.id === id)[0];

/* Obra de pruebas: presupuesto 1000 (50 unidades a 20), 100 días desde el 1-ene-2026. */
function datosBase() {
  return {
    proyectos: [
      { id: 'O1', nombre: 'Obra Uno', codigo: 'OB-1', estado: 'En ejecución', fechaInicio: '2026-01-01', plazoDias: 100, presupuesto: 1000, ggPct: 10, utilidadPct: 8, adelantoPct: 10 },
      { id: 'O2', nombre: 'Obra Dos', codigo: 'OB-2', estado: 'En ejecución', fechaInicio: '2026-01-01', plazoDias: 100, presupuesto: 1000 },
      { id: 'O3', nombre: 'Obra Tres', codigo: 'OB-3', estado: 'Pausada', fechaInicio: '2026-01-01', plazoDias: 100, presupuesto: 1000 }
    ],
    partidas: [
      { id: 'P1', proyecto: 'O1', codigo: '01.01', nombre: 'Obra Uno · 01.01 Concreto', unidad: 'm3', metrado: 50, precioUnitario: 20, incidenciaMateriales: 50 },
      { id: 'P2', proyecto: 'O2', codigo: '01.01', nombre: 'Obra Dos · 01.01 Acero', unidad: 'kg', metrado: 100, precioUnitario: 10, incidenciaMateriales: 40 }
    ],
    insumos: [
      { id: 'I1', nombre: 'Cemento', unidad: 'bls', precio: 30, stock: 100.5, stockMin: 10 },
      { id: 'I2', nombre: 'Arena', unidad: 'm3', precio: 8, stock: 20, stockMin: 5 }
    ],
    valorizaciones: [],
    requisiciones: []
  };
}
const linea = (item, metrado, precio) => ({ item, metrado, precio });
function conTotales(d, doc) { doc.totales = opVal.calcular(doc, crearCtx(d, PARAMS, HOY)); return doc; }

console.log('Valorización · costo directo, gastos generales, utilidad, IGV, retención y neto');

prueba('obra con sus propios porcentajes: CD 200 + GG 10 % + utilidad 8 % = 236; IGV 42.48; retención 11.80; amortización 10 % = 23.60', () => {
  const t = opVal.calcular({ proyecto: 'O1', lineas: [linea('P1', 10, 20)] }, crearCtx(datosBase(), PARAMS, HOY));
  deep(t, { costoDirecto: 200, gastosGenerales: 20, utilidad: 16, subtotal: 236, igv: 42.48, total: 278.48, retencion: 11.8, amortizacion: 23.6, neto: 243.08 });
});

prueba('obra sin porcentajes propios usa los del negocio (5 % y 5 %): CD 200, subtotal 220, IGV 39.60, retención 11, sin adelanto', () => {
  const t = opVal.calcular({ proyecto: 'O2', lineas: [linea('P2', 20, 10)] }, crearCtx(datosBase(), PARAMS, HOY));
  deep(t, { costoDirecto: 200, gastosGenerales: 10, utilidad: 10, subtotal: 220, igv: 39.6, total: 259.6, retencion: 11, amortizacion: 0, neto: 248.6 });
});

prueba('un porcentaje propio de 0 % es válido y no cae al del negocio', () => {
  const d = datosBase();
  d.proyectos[0].ggPct = 0;
  d.proyectos[0].utilidadPct = 0;
  const t = opVal.calcular({ proyecto: 'O1', lineas: [linea('P1', 10, 20)] }, crearCtx(d, PARAMS, HOY));
  assert.equal(t.gastosGenerales, 0);
  assert.equal(t.utilidad, 0);
  assert.equal(t.subtotal, 200);
});

prueba('redondeo a centavos: 3 x 33.33 = 99.99 con GG 9.5 % (9.50), utilidad 7.5 % (7.50), IGV 21.06, retención 5.85', () => {
  const d = datosBase();
  d.proyectos[0].ggPct = 9.5;
  d.proyectos[0].utilidadPct = 7.5;
  d.proyectos[0].adelantoPct = 0;
  const t = opVal.calcular({ proyecto: 'O1', lineas: [linea('P1', 3, 33.33)] }, crearCtx(d, PARAMS, HOY));
  deep(t, { costoDirecto: 99.99, gastosGenerales: 9.5, utilidad: 7.5, subtotal: 116.99, igv: 21.06, total: 138.05, retencion: 5.85, amortizacion: 0, neto: 132.2 });
});

prueba('sin líneas todo es cero y no hay NaN; el IGV sigue el parámetro (10 % sobre 220 = 22)', () => {
  const t = opVal.calcular({ proyecto: 'O1', lineas: [] }, crearCtx(datosBase(), PARAMS, HOY));
  Object.keys(t).forEach((k) => assert.equal(t[k], 0, k));
  const t2 = opVal.calcular({ proyecto: 'O2', lineas: [linea('P2', 20, 10)] }, crearCtx(datosBase(), Object.assign({}, PARAMS, { igv: 10 }), HOY));
  assert.equal(t2.igv, 22);
});

prueba('importe de cada línea: metrado x precio unitario', () => {
  assert.equal(opVal.lineas.importe({ metrado: 12.5, precio: 8 }), 100);
});

console.log('Valorización · reglas');

prueba('metrado contratado: justo el saldo pasa, un centésimo más no; lo ya aprobado cuenta, los borradores y anuladas no, y el propio documento se excluye', () => {
  const d = datosBase();
  d.valorizaciones = [
    { id: 'V1', proyecto: 'O1', fecha: '2026-02-20', estado: 'Aprobada', lineas: [linea('P1', 40, 20)] },
    { id: 'V2', proyecto: 'O1', fecha: '2026-03-20', estado: 'Borrador', lineas: [linea('P1', 30, 20)] },
    { id: 'V3', proyecto: 'O1', fecha: '2026-03-21', estado: 'Anulada', lineas: [linea('P1', 30, 20)] }
  ];
  const v = regla(opVal, 'metrado-contratado');
  const ctx = crearCtx(d, PARAMS, HOY);
  assert.equal(v({ proyecto: 'O1', lineas: [linea('P1', 10, 20)] }, ctx), true, 'saldo exacto');
  assert.equal(v({ proyecto: 'O1', lineas: [linea('P1', 10.01, 20)] }, ctx), false, 'un centésimo de más');
  assert.equal(v({ id: 'V1', proyecto: 'O1', lineas: [linea('P1', 50, 20)] }, ctx), true, 'editar la misma aprobada con el total');
  assert.equal(v({ id: 'V2', proyecto: 'O1', lineas: [linea('P1', 10, 20)] }, ctx), true, 'el borrador no cuenta contra sí mismo');
});

prueba('una sola valorización aprobada por obra y por mes (ignora otras obras, borradores y anuladas)', () => {
  const d = datosBase();
  d.valorizaciones = [
    { id: 'V1', proyecto: 'O1', fecha: '2026-03-31', estado: 'Aprobada', lineas: [] },
    { id: 'V2', proyecto: 'O1', fecha: '2026-04-30', estado: 'Anulada', lineas: [] },
    { id: 'V3', proyecto: 'O1', fecha: '2026-05-15', estado: 'Borrador', lineas: [] }
  ];
  const v = regla(opVal, 'un-corte-por-mes');
  const ctx = crearCtx(d, PARAMS, HOY);
  assert.equal(v({ proyecto: 'O1', fecha: '2026-03-05' }, ctx), false);
  assert.equal(v({ proyecto: 'O1', fecha: '2026-04-01' }, ctx), true, 'otro mes');
  assert.equal(v({ proyecto: 'O1', fecha: '2026-04-15' }, ctx), true, 'la anulada no bloquea');
  assert.equal(v({ proyecto: 'O1', fecha: '2026-05-15' }, ctx), true, 'el borrador no bloquea');
  assert.equal(v({ proyecto: 'O2', fecha: '2026-03-05' }, ctx), true, 'otra obra');
  assert.equal(v({ id: 'V1', proyecto: 'O1', fecha: '2026-03-31' }, ctx), true, 'no choca consigo misma');
});

prueba('la obra debe estar en ejecución, la fecha no puede ser anterior al inicio y las partidas deben ser de la obra', () => {
  const ctx = crearCtx(datosBase(), PARAMS, HOY);
  assert.equal(regla(opVal, 'obra-en-ejecucion')({ proyecto: 'O1' }, ctx), true);
  assert.equal(regla(opVal, 'obra-en-ejecucion')({ proyecto: 'O3' }, ctx), false);
  assert.equal(regla(opVal, 'fecha-desde-el-inicio')({ proyecto: 'O1', fecha: '2026-01-01' }, ctx), true);
  assert.equal(regla(opVal, 'fecha-desde-el-inicio')({ proyecto: 'O1', fecha: '2025-12-31' }, ctx), false);
  assert.equal(regla(opVal, 'partidas-de-la-obra')({ proyecto: 'O1', lineas: [linea('P1', 1, 20)] }, ctx), true);
  assert.equal(regla(opVal, 'partidas-de-la-obra')({ proyecto: 'O1', lineas: [linea('P2', 1, 10)] }, ctx), false);
});

console.log('Obras · avance programado (curva S) y avance real');

prueba('curva S: 0 al empezar, 15.63 a un cuarto del plazo, 50 a la mitad, 84.38 a tres cuartos, 100 al final y después', () => {
  const f = ent('proyectos').calculados.filter((c) => c.id === 'avanceProgramado')[0].formula;
  const o = datosBase().proyectos[0];
  const en = (hoy) => f(o, crearCtx(datosBase(), PARAMS, hoy));
  assert.equal(en('2026-01-01'), 0);
  assert.equal(en('2026-01-26'), 15.63);
  assert.equal(en('2026-02-20'), 50);
  assert.equal(en('2026-03-17'), 84.38);
  assert.equal(en('2026-04-11'), 100);
  assert.equal(en('2027-01-01'), 100);
  assert.equal(en('2025-06-01'), 0, 'antes del inicio');
});

prueba('la curva S es creciente y simétrica: programado(t) + programado(1 - t) = 100', () => {
  const f = ent('proyectos').calculados.filter((c) => c.id === 'avanceProgramado')[0].formula;
  const o = datosBase().proyectos[0];
  let previo = -1;
  for (let dia = 0; dia <= 100; dia += 5) {
    const v = f(o, crearCtx(datosBase(), PARAMS, U.fechaMas('2026-01-01', dia)));
    assert.ok(v >= previo, 'creciente en el día ' + dia);
    previo = v;
  }
  [10, 30, 45].forEach((dia) => {
    const a = f(o, crearCtx(datosBase(), PARAMS, U.fechaMas('2026-01-01', dia)));
    const b = f(o, crearCtx(datosBase(), PARAMS, U.fechaMas('2026-01-01', 100 - dia)));
    assert.ok(Math.abs(a + b - 100) < 0.02, dia + ': ' + a + ' + ' + b);
  });
});

prueba('sin plazo la obra no tiene avance programado (sin dividir entre cero)', () => {
  const f = ent('proyectos').calculados.filter((c) => c.id === 'avanceProgramado')[0].formula;
  assert.equal(f({ fechaInicio: '2026-01-01', plazoDias: 0 }, crearCtx(datosBase(), PARAMS, HOY)), 0);
  assert.equal(f({ fechaInicio: '2026-01-01' }, crearCtx(datosBase(), PARAMS, HOY)), 0);
});

prueba('avance real: solo cuentan las valorizaciones aprobadas; presupuesto 0 no divide entre cero; fecha de término = inicio + plazo', () => {
  const d = datosBase();
  d.valorizaciones = [
    conTotales(d, { id: 'V1', proyecto: 'O1', fecha: '2026-02-20', estado: 'Aprobada', lineas: [linea('P1', 10, 20)] }),
    conTotales(d, { id: 'V2', proyecto: 'O1', fecha: '2026-03-20', estado: 'Aprobada', lineas: [linea('P1', 15, 20)] }),
    conTotales(d, { id: 'V3', proyecto: 'O1', fecha: '2026-04-20', estado: 'Borrador', lineas: [linea('P1', 25, 20)] }),
    conTotales(d, { id: 'V4', proyecto: 'O1', fecha: '2026-04-21', estado: 'Anulada', lineas: [linea('P1', 25, 20)] })
  ];
  const ctx = crearCtx(d, PARAMS, HOY);
  const calc = (id) => ent('proyectos').calculados.filter((c) => c.id === id)[0].formula;
  assert.equal(calc('avanceFisico')(d.proyectos[0], ctx), 50);
  assert.equal(calc('avanceFisico')(Object.assign({}, d.proyectos[0], { presupuesto: 0 }), ctx), 0);
  assert.equal(calc('fechaFin')(d.proyectos[0], ctx), '2026-04-11');
  assert.equal(calc('desvio')(d.proyectos[0], crearCtx(d, PARAMS, '2026-01-26')), 34.37, '50 real menos 15.63 programado');
  assert.equal(calc('desvio')(d.proyectos[0], crearCtx(d, PARAMS, '2026-02-20')), 0, 'justo en el programado');
});

prueba('partida: metrado ejecutado, avance %, y el metrado no puede bajar de lo ya valorizado', () => {
  const d = datosBase();
  d.valorizaciones = [conTotales(d, { id: 'V1', proyecto: 'O1', fecha: '2026-02-20', estado: 'Aprobada', lineas: [linea('P1', 12.5, 20)] })];
  const ctx = crearCtx(d, PARAMS, HOY);
  const calc = (id) => ent('partidas').calculados.filter((c) => c.id === id)[0].formula;
  assert.equal(calc('ejecutado')(d.partidas[0], ctx), 12.5);
  assert.equal(calc('avance')(d.partidas[0], ctx), 25);
  assert.equal(calc('costoTotal')(d.partidas[0], ctx), 1000);
  const r = ent('partidas').reglas.filter((x) => x.id === 'metrado-no-menor-al-ejecutado')[0].validar;
  assert.equal(r({ id: 'P1', metrado: 12.5 }, ctx), true);
  assert.equal(r({ id: 'P1', metrado: 12.49 }, ctx), false);
  assert.equal(r({ metrado: 1 }, ctx), true, 'una partida nueva no tiene ejecutado');
  const u = ent('partidas').reglas.filter((x) => x.id === 'codigo-unico-en-obra')[0].validar;
  assert.equal(u({ proyecto: 'O1', codigo: '01.01' }, ctx), false);
  assert.equal(u({ id: 'P1', proyecto: 'O1', codigo: '01.01' }, ctx), true);
  assert.equal(u({ proyecto: 'O1', codigo: '01.02' }, ctx), true);
});

console.log('Requisiciones · salida de almacén');

prueba('atender descuenta el stock (con decimales exactos) y anular lo devuelve', () => {
  const d = datosBase();
  const ctx = crearCtx(d, PARAMS, HOY);
  const req = { lineas: [{ item: 'I1', cantidad: 0.3, precio: 30 }, { item: 'I2', cantidad: 5, precio: 8 }] };
  opReq.alEmitir(req, ctx);
  assert.equal(d.insumos[0].stock, 100.2);
  assert.equal(d.insumos[1].stock, 15);
  opReq.alAnular(req, ctx);
  assert.equal(d.insumos[0].stock, 100.5);
  assert.equal(d.insumos[1].stock, 20);
});

prueba('sin stock suficiente no descuenta nada; pedir exactamente el stock lo deja en cero', () => {
  const d = datosBase();
  const ctx = crearCtx(d, PARAMS, HOY);
  assert.throws(() => opReq.alEmitir({ lineas: [{ item: 'I2', cantidad: 5, precio: 8 }, { item: 'I1', cantidad: 100.51, precio: 30 }] }, ctx), /Stock insuficiente de «Cemento»/);
  assert.equal(d.insumos[1].stock, 20);
  opReq.alEmitir({ lineas: [{ item: 'I1', cantidad: 100.5, precio: 30 }] }, ctx);
  assert.equal(d.insumos[0].stock, 0);
});

prueba('totales de la requisición: subtotal, IGV del parámetro y total; la partida debe ser de la obra', () => {
  const t = opReq.calcular({ lineas: [{ item: 'I1', cantidad: 10, precio: 30 }, { item: 'I2', cantidad: 5, precio: 8 }] }, crearCtx(datosBase(), PARAMS, HOY));
  deep(t, { subtotal: 340, igv: 61.2, total: 401.2 });
  const ctx = crearCtx(datosBase(), PARAMS, HOY);
  assert.equal(regla(opReq, 'partida-de-la-obra')({ proyecto: 'O1', partida: 'P1' }, ctx), true);
  assert.equal(regla(opReq, 'partida-de-la-obra')({ proyecto: 'O1', partida: 'P2' }, ctx), false);
  assert.equal(regla(opReq, 'obra-en-ejecucion')({ proyecto: 'O3' }, ctx), false);
});

console.log('Reportes');

function datosReportes() {
  const d = datosBase();
  d.valorizaciones = [
    conTotales(d, { id: 'V1', proyecto: 'O1', fecha: '2026-02-20', estado: 'Aprobada', lineas: [linea('P1', 15, 20)] }),
    conTotales(d, { id: 'V2', proyecto: 'O1', fecha: '2026-03-31', estado: 'Aprobada', lineas: [linea('P1', 10, 20)] }),
    conTotales(d, { id: 'V3', proyecto: 'O1', fecha: '2026-03-10', estado: 'Anulada', lineas: [linea('P1', 5, 20)] })
  ];
  return d;
}

prueba('totales de las valorizaciones de prueba (CD 300 y 200) con los porcentajes de la obra', () => {
  const d = datosReportes();
  deep(d.valorizaciones[0].totales, { costoDirecto: 300, gastosGenerales: 30, utilidad: 24, subtotal: 354, igv: 63.72, total: 417.72, retencion: 17.7, amortizacion: 35.4, neto: 364.62 });
  assert.equal(d.valorizaciones[1].totales.neto, 243.08);
});

prueba('avance físico y financiero: 50 % físico, 96.64 % programado al 31-mar, financiero = neto 607.70 / contrato 1392.40 = 43.64 %', () => {
  const d = datosReportes();
  const r = rep('avance-obra').ejecutar({ desde: '2026-01-01', hasta: '2026-03-31' }, crearCtx(d, PARAMS, HOY));
  deep(r.filas, [['Obra Uno', 'En ejecución', 1000, 500, 50, 96.64, -46.64, 607.7, 43.64]]);
  assert.equal(r.resumen[2].valor, 1, 'una obra en ejecución con atraso');
  const vacio = rep('avance-obra').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, crearCtx(d, PARAMS, HOY));
  assert.equal(vacio.filas.length, 0);
  vacio.resumen.forEach((x) => assert.ok(Number.isFinite(x.valor)));
});

prueba('valorizaciones por mes con curva S: real acumulado 30 % y 50 %, programado 61.90 % (al 28-feb) y 96.64 % (al 31-mar)', () => {
  const d = datosReportes();
  const r = rep('valorizaciones-mes').ejecutar({ desde: '2026-01-01', hasta: '2026-06-30' }, crearCtx(d, PARAMS, HOY));
  deep(r.filas, [['feb 2026', 1, 300, 354, 364.62, 30, 61.9], ['mar 2026', 1, 200, 236, 243.08, 50, 96.64]]);
  assert.equal(r.resumen[0].valor, 590);
  assert.equal(r.resumen[3].valor, 50);
  const solo = rep('valorizaciones-mes').ejecutar({ desde: '2026-01-01', hasta: '2026-06-30', obra: 'O2' }, crearCtx(d, PARAMS, HOY));
  assert.equal(solo.filas.length, 0, 'una obra sin valorizaciones no aparece');
  assert.equal(rep('valorizaciones-mes').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, crearCtx(d, PARAMS, HOY)).filas.length, 0);
});

prueba('flujo de pagos: cobro a 30 días (22-mar y 30-abr), retención acumulada 17.70 y luego 29.50', () => {
  const d = datosReportes();
  const r = rep('flujo-pagos').ejecutar({ desde: '2026-03-01', hasta: '2026-04-30' }, crearCtx(d, PARAMS, HOY));
  deep(r.filas, [['mar 2026', 1, 417.72, 17.7, 35.4, 364.62, 17.7], ['abr 2026', 1, 278.48, 11.8, 23.6, 243.08, 29.5]]);
  assert.equal(r.resumen[0].valor, 607.7);
  assert.equal(r.resumen[1].valor, 29.5);
  const solo = rep('flujo-pagos').ejecutar({ desde: '2026-04-01', hasta: '2026-04-30' }, crearCtx(d, PARAMS, HOY));
  assert.equal(solo.filas[0][6], 29.5, 'la retención acumulada incluye lo retenido antes del filtro');
  assert.equal(rep('flujo-pagos').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, crearCtx(d, PARAMS, HOY)).filas.length, 0);
});

prueba('sobrecosto de materiales: P1 presupuesta 25 x 20 x 50 % = 250 y recibió 300 (+20 %); P2 queda dentro del umbral', () => {
  const d = datosReportes();
  d.valorizaciones.push(conTotales(d, { id: 'V9', proyecto: 'O2', fecha: '2026-03-10', estado: 'Aprobada', lineas: [linea('P2', 10, 10)] }));
  const req = (id, partida, estado, lineas, fecha) => {
    const r = { id, fecha: fecha || '2026-03-15', proyecto: partida === 'P1' ? 'O1' : 'O2', partida, estado, lineas };
    r.totales = opReq.calcular(r, crearCtx(d, PARAMS, HOY));
    return r;
  };
  d.requisiciones = [
    req('R1', 'P1', 'Atendida', [{ item: 'I1', cantidad: 10, precio: 30 }]),
    req('R2', 'P2', 'Atendida', [{ item: 'I1', cantidad: 1, precio: 41 }]),
    req('R3', 'P2', 'Borrador', [{ item: 'I1', cantidad: 10, precio: 41 }])
  ];
  const r = rep('sobrecosto-partidas').ejecutar({ desde: '2026-01-01', hasta: '2026-06-30', umbral: 5 }, crearCtx(d, PARAMS, HOY));
  deep(r.filas, [['Obra Uno', '01.01 Concreto', 250, 300, 50, 20]]);
  assert.equal(r.resumen[1].valor, 50);
  const todos = rep('sobrecosto-partidas').ejecutar({ desde: '2026-01-01', hasta: '2026-06-30', umbral: 0 }, crearCtx(d, PARAMS, HOY));
  assert.equal(todos.filas.length, 2, 'con umbral 0 también aparece P2 (41 contra 40, +2.5 %)');
  assert.equal(todos.filas[1][5], 2.5);
  assert.equal(rep('sobrecosto-partidas').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31', umbral: 5 }, crearCtx(d, PARAMS, HOY)).filas.length, 0);
});

prueba('consumo de insumos: solo atendidas del rango, ordenado por importe y con su porcentaje', () => {
  const d = datosReportes();
  const req = (id, estado, lineas, fecha) => { const r = { id, fecha, proyecto: 'O1', partida: 'P1', estado, lineas }; r.totales = opReq.calcular(r, crearCtx(d, PARAMS, HOY)); return r; };
  d.requisiciones = [
    req('R1', 'Atendida', [{ item: 'I1', cantidad: 10, precio: 30 }, { item: 'I2', cantidad: 5, precio: 8 }], '2026-03-01'),
    req('R2', 'Atendida', [{ item: 'I1', cantidad: 2, precio: 30 }], '2026-03-20'),
    req('R3', 'Borrador', [{ item: 'I2', cantidad: 100, precio: 8 }], '2026-03-21'),
    req('R4', 'Atendida', [{ item: 'I2', cantidad: 100, precio: 8 }], '2025-01-01')
  ];
  const r = rep('consumo-insumos').ejecutar({ desde: '2026-01-01', hasta: '2026-06-30' }, crearCtx(d, PARAMS, HOY));
  deep(r.filas, [['Cemento', 'bls', 12, 360, 90], ['Arena', 'm3', 5, 40, 10]]);
  assert.equal(r.resumen[0].valor, 400);
  assert.equal(r.resumen[1].valor, 2);
});

prueba('indicadores del tablero: retención acumulada, obras con atraso y borradores por atender', () => {
  const d = datosReportes();
  d.requisiciones = [{ id: 'R1', estado: 'Borrador' }, { id: 'R2', estado: 'Atendida' }];
  const ctx = crearCtx(d, PARAMS, HOY);
  const t = (i) => S.tablero[i].calcular(ctx);
  assert.equal(t(0), 2, 'obras en ejecución');
  assert.equal(t(2), 29.5, 'retención acumulada');
  assert.equal(t(4), 2, 'O1 va a 50 % y debería ir al 100 %; O2 está sin avance: ambas atrasadas (la pausada no cuenta)');
  assert.equal(t(5), 1);
});

console.log('Coherencia de las semillas');

prueba('los metrados sembrados nunca superan lo contratado, cada documento usa partidas de su obra y los presupuestos cuadran con las partidas', () => {
  const sem = clonar(S.semillas);
  const partidas = {};
  sem.partidas.forEach((p) => { partidas[p.id] = p; });
  const acumulado = {};
  sem.valorizaciones.forEach((v) => {
    v.lineas.forEach((l) => {
      assert.equal(partidas[l.item].proyecto, v.proyecto, v.id + ' usa partida de otra obra');
      assert.equal(l.precio, partidas[l.item].precioUnitario, v.id + ' precio = precio unitario');
      if (v.estado === 'Aprobada') { acumulado[l.item] = (acumulado[l.item] || 0) + l.metrado; }
    });
  });
  Object.keys(acumulado).forEach((id) => assert.ok(acumulado[id] <= partidas[id].metrado + 1e-9, id + ' excede su metrado'));
  sem.requisiciones.forEach((r) => assert.equal(partidas[r.partida].proyecto, r.proyecto, r.id + ' partida de otra obra'));
  sem.proyectos.forEach((o) => {
    const mias = sem.partidas.filter((p) => p.proyecto === o.id);
    if (mias.length) { assert.ok(Math.abs(o.presupuesto - mias.reduce((s, p) => s + p.metrado * p.precioUnitario, 0)) < 0.01, o.codigo + ' presupuesto'); }
  });
  /* A lo sumo una valorización aprobada por obra y mes */
  const vistos = {};
  sem.valorizaciones.filter((v) => v.estado === 'Aprobada').forEach((v) => {
    const clave = v.proyecto + U.mes(U.resolverFecha(v.fecha));
    assert.ok(!vistos[clave], v.id + ' repite obra y mes');
    vistos[clave] = true;
  });
});

prueba('la primera obra y la primera partida por orden alfabético (las que elige la prueba de humo) están en ejecución y con saldo', () => {
  const sem = clonar(S.semillas);
  const orden = (a, b) => U.comparar(a, b);
  const obras = sem.proyectos.slice().sort((a, b) => orden(a.nombre, b.nombre));
  const parts = sem.partidas.slice().sort((a, b) => orden(a.nombre, b.nombre));
  assert.equal(obras[0].estado, 'En ejecución');
  assert.equal(parts[0].proyecto, obras[0].id);
  assert.equal(parts[1].proyecto, obras[0].id);
  [parts[0], parts[1]].forEach((p) => {
    const hecho = sem.valorizaciones.filter((v) => v.estado === 'Aprobada').reduce((s, v) => s + v.lineas.filter((l) => l.item === p.id).reduce((t, l) => t + l.metrado, 0), 0);
    assert.ok(p.metrado - hecho >= 2, p.id + ' necesita saldo');
  });
  /* y esa obra no tiene valorización aprobada en el mes en curso */
  const hoyMes = U.mes(U.hoy());
  sem.valorizaciones.filter((v) => v.proyecto === obras[0].id && v.estado === 'Aprobada').forEach((v) => assert.notEqual(U.mes(U.resolverFecha(v.fecha)), hoyMes));
});

console.log('\n' + n + ' pruebas correctas' + (process.exitCode ? ' (hay fallos)' : ''));
