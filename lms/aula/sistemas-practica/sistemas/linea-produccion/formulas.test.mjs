#!/usr/bin/env node
/*
 * formulas.test.mjs · Prueba de las fórmulas de «linea-produccion» sin navegador.
 *   node sistemas/linea-produccion/formulas.test.mjs
 * Carga config.js en node:vm con un window falso, arma un ctx mínimo (datos en memoria,
 * parámetros del config, redondeo igual al del núcleo) y verifica casos calculados a mano.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const caja = { window: {} };
vm.createContext(caja);
vm.runInContext(fs.readFileSync(path.join(aqui, 'config.js'), 'utf8'), caja, { filename: 'config.js' });
const S = caja.window.SISTEMA;

/* ---------- Contexto de pruebas (copia fiel de lo que ofrece el núcleo) ---------- */
const redondear = (n) => { if (typeof n !== 'number' || !isFinite(n)) { return 0; } return (n < 0 ? -1 : 1) * Math.round(Math.abs(n) * 100 + 1e-7) / 100; };
const aMs = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

function crearCtx({ hoy = '2026-10-31', datos = {}, parametros = {}, usuario = { usuario: 'prueba', rol: 'admin' } } = {}) {
  const P = {};
  S.parametros.forEach((p) => { P[p.id] = p.valor; });
  Object.assign(P, parametros);
  const col = JSON.parse(JSON.stringify(datos));
  let correlativo = 900;
  const lista = (e) => (col[e] = col[e] || []);
  return {
    col,
    datos: {
      listar: (e, fn) => lista(e).filter((r) => !fn || fn(r)).map((r) => JSON.parse(JSON.stringify(r))),
      obtener: (e, id) => { const r = lista(e).filter((x) => x.id === id)[0]; return r ? JSON.parse(JSON.stringify(r)) : null; },
      contar: (e) => lista(e).length,
      crear: (e, obj) => { const r = Object.assign({ id: 'NUEVO-' + (++correlativo) }, JSON.parse(JSON.stringify(obj))); lista(e).push(r); return r; },
      actualizar: (e, id, parche) => { const r = lista(e).filter((x) => x.id === id)[0]; Object.assign(r, parche); return r; },
      eliminar: (e, id) => { col[e] = lista(e).filter((x) => x.id !== id); return true; }
    },
    param: (id) => (P[id] === undefined ? 0 : P[id]),
    hoy: () => hoy,
    usuario: () => usuario,
    redondear,
    suma: (arr, fn) => (arr || []).reduce((t, x, i) => { const v = fn ? fn(x, i) : x; return t + (typeof v === 'number' && isFinite(v) ? v : 0); }, 0),
    agrupar: (arr, fn) => { const g = {}; (arr || []).forEach((x, i) => { const k = String(fn(x, i)); (g[k] = g[k] || []).push(x); }); return g; },
    fmt: { moneda: (n) => 'S/ ' + n.toFixed(2), fecha: (s) => s, num: (n, d) => n.toFixed(d), pct: (n) => n + ' %' },
    fechaMas: (s, d) => iso(aMs(s) + d * 86400000),
    mes: (s) => String(s || '').slice(0, 7),
    diasEntre: (a, b) => Math.round((aMs(b) - aMs(a)) / 86400000)
  };
}

const ent = (id) => S.entidades.filter((e) => e.id === id)[0];
const op = (id) => S.operaciones.filter((o) => o.id === id)[0];
const rep = (id) => S.reportes.filter((r) => r.id === id)[0];
const calc = (e, id) => ent(e).calculados.filter((c) => c.id === id)[0].formula;
const cerca = (real, esperado, msg, tol = 0.005) => assert.ok(Math.abs(real - esperado) <= tol, `${msg}: esperado ${esperado} y salió ${real}`);

let n = 0;
const prueba = (nombre, fn) => { fn(); n++; console.log('  ✓ ' + nombre); };

/* ---------- Datos mínimos con resultados calculados a mano ---------- */
const BASE = {
  insumos: [
    { id: 'INS-A', nombre: 'Hilo A', unidad: 'kg', costo: 10, stock: 100, stockMin: 20 },
    { id: 'INS-B', nombre: 'Etiqueta B', unidad: 'unid', costo: 2, stock: 300, stockMin: 50 }
  ],
  productos: [
    { id: 'PRO-1', nombre: 'Chompa de prueba', cicloIdealMin: 6, operarios: 2, demandaDiaria: 30, precioVenta: 20, stock: 20 },
    { id: 'PRO-2', nombre: 'Sin demanda', cicloIdealMin: 10, operarios: 1, demandaDiaria: 0, precioVenta: 5, stock: 0 }
  ],
  bom: [
    { id: 'BOM-1', producto: 'PRO-1', insumo: 'INS-A', cantidad: 0.5, mermaPct: 10 },
    { id: 'BOM-2', producto: 'PRO-1', insumo: 'INS-B', cantidad: 2, mermaPct: 0 }
  ],
  lineas: [
    { id: 'LIN-1', nombre: 'Línea 1', estado: 'Operativa', proximoMantenimiento: '2026-11-10' },
    { id: 'LIN-2', nombre: 'Línea 2', estado: 'En mantenimiento', proximoMantenimiento: '2026-10-20' }
  ]
};

console.log('linea-produccion · fórmulas');

/* Costo estándar de PRO-1: materiales 0,5 × 1,10 × 10 = 5,50 + 2 × 2 = 4,00 → 9,50.
   Mano de obra: 6 / 60 × 2 operarios × 8,50 = 1,70. Indirectos 35 % de 1,70 = 0,595. Total 11,795 → 11,80. */
prueba('costo de materiales según BOM con merma', () => {
  const ctx = crearCtx({ datos: BASE });
  assert.strictEqual(calc('productos', 'costoMateriales')(BASE.productos[0], ctx), 9.5);
  assert.strictEqual(calc('productos', 'costoMateriales')(BASE.productos[1], ctx), 0, 'sin BOM no hay materiales');
});

prueba('costo estándar = materiales + mano de obra + indirectos (redondeo de .5 hacia arriba)', () => {
  const ctx = crearCtx({ datos: BASE });
  assert.strictEqual(calc('productos', 'costoEstandar')(BASE.productos[0], ctx), 11.8);
  /* sin BOM: 10 / 60 × 1 × 8,5 = 1,41667 + 35 % = 1,9125 → 1,91 */
  assert.strictEqual(calc('productos', 'costoEstandar')(BASE.productos[1], ctx), 1.91);
  const ctx2 = crearCtx({ datos: BASE, parametros: { tarifaHoraMod: 12, cifPct: 0 } });
  /* 9,5 + 6 / 60 × 2 × 12 = 9,5 + 2,4 = 11,9 */
  assert.strictEqual(calc('productos', 'costoEstandar')(BASE.productos[0], ctx2), 11.9);
});

prueba('margen sobre el precio y división por cero', () => {
  const ctx = crearCtx({ datos: BASE });
  /* (20 − 11,80) / 20 = 41 % */
  assert.strictEqual(calc('productos', 'margen')(BASE.productos[0], ctx), 41);
  assert.strictEqual(calc('productos', 'margen')({ id: 'X', precioVenta: 0, cicloIdealMin: 5, operarios: 1 }, ctx), null);
});

/* Takt: (480 − 30) × 2 turnos = 900 min al día; 900 / 30 unidades = 30 min por unidad. */
prueba('takt time = tiempo disponible del día / demanda', () => {
  const ctx = crearCtx({ datos: BASE });
  assert.strictEqual(calc('productos', 'taktMin')(BASE.productos[0], ctx), 30);
  assert.strictEqual(calc('productos', 'taktMin')({ demandaDiaria: 7 }, ctx), 128.57, '900 / 7 = 128,571');
  assert.strictEqual(calc('productos', 'taktMin')(BASE.productos[1], ctx), null, 'demanda 0 → sin takt');
  const ctx3 = crearCtx({ datos: BASE, parametros: { turnosDia: 3, minutosTurno: 420 } });
  assert.strictEqual(calc('productos', 'taktMin')(BASE.productos[0], ctx3), 39, '(420 − 30) × 3 / 30');
});

/* Capacidad útil al día con la meta de OEE (65 %): 900 × 0,65 = 585 min de ciclo ideal. */
prueba('líneas necesarias para la demanda (redondeo hacia arriba, borde exacto)', () => {
  const ctx = crearCtx({ datos: BASE });
  const f = calc('productos', 'lineasNecesarias');
  assert.strictEqual(f({ demandaDiaria: 30, cicloIdealMin: 6 }, ctx), 1, '180 / 585 → 1');
  assert.strictEqual(f({ demandaDiaria: 150, cicloIdealMin: 6 }, ctx), 2, '900 / 585 = 1,54 → 2');
  assert.strictEqual(f({ demandaDiaria: 195, cicloIdealMin: 6 }, ctx), 2, '1170 / 585 = 2 exacto → 2');
  assert.strictEqual(f({ demandaDiaria: 196, cicloIdealMin: 6 }, ctx), 3, '1176 / 585 > 2 → 3');
  assert.strictEqual(f({ demandaDiaria: 0, cicloIdealMin: 6 }, ctx), 0);
  const sinMeta = crearCtx({ datos: BASE, parametros: { metaOee: 0 } });
  assert.strictEqual(f({ demandaDiaria: 10, cicloIdealMin: 6 }, sinMeta), 0, 'meta 0 no divide por cero');
});

prueba('regla: el precio no puede ser menor al costo estándar', () => {
  const ctx = crearCtx({ datos: BASE });
  const regla = ent('productos').reglas[0].validar;
  assert.strictEqual(regla({ id: 'PRO-1', precioVenta: 11.79, cicloIdealMin: 6, operarios: 2 }, ctx), false);
  assert.strictEqual(regla({ id: 'PRO-1', precioVenta: 11.8, cicloIdealMin: 6, operarios: 2 }, ctx), true, 'igual al costo se acepta');
});

prueba('calculados de insumos y de la lista de materiales', () => {
  const ctx = crearCtx({ datos: BASE });
  assert.strictEqual(calc('insumos', 'situacion')({ stock: 0, stockMin: 5 }), 'Agotado');
  assert.strictEqual(calc('insumos', 'situacion')({ stock: 5, stockMin: 5 }), 'Bajo el mínimo', 'igual al mínimo ya es bajo');
  assert.strictEqual(calc('insumos', 'situacion')({ stock: 6, stockMin: 5 }), 'Normal');
  assert.strictEqual(calc('insumos', 'valorStock')({ costo: 3.33, stock: 10.5 }, ctx), 34.97, '3,33 × 10,5 = 34,965 → 34,97');
  assert.strictEqual(calc('bom', 'costoLinea')(BASE.bom[0], ctx), 5.5);
  assert.strictEqual(calc('bom', 'costoLinea')({ insumo: 'NO-EXISTE', cantidad: 1 }, ctx), 0);
});

prueba('regla de BOM: un insumo no se repite en el mismo producto', () => {
  const ctx = crearCtx({ datos: BASE });
  const regla = ent('bom').reglas[0].validar;
  assert.strictEqual(regla({ producto: 'PRO-1', insumo: 'INS-A', cantidad: 1 }, ctx), false);
  assert.strictEqual(regla({ id: 'BOM-1', producto: 'PRO-1', insumo: 'INS-A', cantidad: 1 }, ctx), true, 'editar la misma fila es válido');
  assert.strictEqual(regla({ producto: 'PRO-2', insumo: 'INS-A', cantidad: 1 }, ctx), true);
});

prueba('alerta de mantenimiento de la línea (hoy = 2026-10-31)', () => {
  const ctx = crearCtx({ datos: BASE });
  const alerta = calc('lineas', 'alertaMantenimiento'), dias = calc('lineas', 'diasMantenimiento');
  assert.strictEqual(dias({ proximoMantenimiento: '2026-11-10' }, ctx), 10);
  assert.strictEqual(alerta({ proximoMantenimiento: '2026-11-10' }, ctx), 'Próximo');
  assert.strictEqual(alerta({ proximoMantenimiento: '2026-11-15' }, ctx), 'Próximo', '15 días exactos');
  assert.strictEqual(alerta({ proximoMantenimiento: '2026-11-16' }, ctx), 'Al día', '16 días');
  assert.strictEqual(alerta({ proximoMantenimiento: '2026-10-31' }, ctx), 'Próximo', 'hoy mismo no está vencido');
  assert.strictEqual(alerta({ proximoMantenimiento: '2026-10-30' }, ctx), 'Vencido');
  assert.strictEqual(alerta({}, ctx), 'Sin programar');
  assert.strictEqual(dias({}, ctx), null);
});

/* ---------- Órdenes de producción ---------- */
prueba('totales de la orden: materiales, horas y turnos con la meta de OEE, costo estándar', () => {
  const ctx = crearCtx({ datos: BASE });
  const t = op('ordenes').calcular({ producto: 'PRO-1', cantidad: 100 }, ctx);
  assert.strictEqual(t.costoMateriales, 950);
  /* 100 × 6 min = 600 min = 10 h; a 65 % → 15,3846 h */
  assert.strictEqual(t.horasEstimadas, 15.38);
  /* 15,3846 h = 923,08 min / 450 = 2,0513 turnos */
  assert.strictEqual(t.turnosEstimados, 2.05);
  assert.strictEqual(t.total, 1180);
  const vacio = op('ordenes').calcular({ producto: 'NO-EXISTE', cantidad: 5 }, ctx);
  assert.strictEqual(vacio.total, 0);
  const cero = op('ordenes').calcular({ producto: 'PRO-1', cantidad: 0 }, ctx);
  assert.strictEqual(cero.total, 0);
  assert.strictEqual(cero.horasEstimadas, 0);
  const sinMeta = op('ordenes').calcular({ producto: 'PRO-1', cantidad: 10 }, crearCtx({ datos: BASE, parametros: { metaOee: 0 } }));
  assert.strictEqual(sinMeta.horasEstimadas, 0, 'meta 0 no divide por cero');
});

prueba('regla de la orden: la entrega no puede ser anterior al inicio', () => {
  const regla = op('ordenes').reglas[0].validar;
  assert.strictEqual(regla({ fecha: '2026-10-10', fechaEntrega: '2026-10-09' }), false);
  assert.strictEqual(regla({ fecha: '2026-10-10', fechaEntrega: '2026-10-10' }), true);
});

prueba('liberar una orden descuenta los insumos de la BOM con su merma; anular los devuelve', () => {
  const ctx = crearCtx({ datos: BASE });
  const doc = { id: 'OPR-1', producto: 'PRO-1', linea: 'LIN-1', cantidad: 100 };
  op('ordenes').alEmitir(doc, ctx);
  /* hilo: 100 × 0,5 × 1,10 = 55 → 100 − 55 = 45 · etiquetas: 100 × 2 = 200 → 300 − 200 = 100 */
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-A').stock, 45);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-B').stock, 100);
  op('ordenes').alAnular(doc, ctx);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-A').stock, 100);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-B').stock, 300);
});

prueba('liberar rechaza línea en mantenimiento, producto sin BOM y falta de insumos (sin tocar el stock)', () => {
  const ctx = crearCtx({ datos: BASE });
  const emitir = op('ordenes').alEmitir;
  assert.throws(() => emitir({ producto: 'PRO-1', linea: 'LIN-2', cantidad: 1 }, ctx), /no está operativa/);
  assert.throws(() => emitir({ producto: 'PRO-2', linea: 'LIN-1', cantidad: 1 }, ctx), /lista de materiales/);
  /* 200 unidades necesitan 110 kg de hilo y hay 100 */
  assert.throws(() => emitir({ producto: 'PRO-1', linea: 'LIN-1', cantidad: 200 }, ctx), /Falta «Hilo A».*110.*100/);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-A').stock, 100);
  /* justo el límite: 181 unidades necesitan 99,55 kg y 362 etiquetas (hay 300) → falla por las etiquetas */
  assert.throws(() => emitir({ producto: 'PRO-1', linea: 'LIN-1', cantidad: 181 }, ctx), /Falta «Etiqueta B»/);
  /* 150 unidades: 82,5 kg y 300 etiquetas, justo lo que hay → pasa */
  emitir({ producto: 'PRO-1', linea: 'LIN-1', cantidad: 150 }, ctx);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-B').stock, 0);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-A').stock, 17.5);
});

/* ---------- Registros de producción ---------- */
/* PRO-1 (ciclo 6 min, 2 operarios), 60 producidas, 3 defectuosas, 2 a retrabajo, 45 min de parada:
   planificado 450 · operativo 405 · ideal 60 × 6 = 360 ·
   disponibilidad 405/450 = 90 % · rendimiento 360/405 = 88,89 % · calidad 57/60 = 95 % ·
   OEE = 0,90 × 0,8889 × 0,95 = 76 % · FPY = 55/60 = 91,67 % ·
   costo real = 60 × 9,50 + 450/60 × 2 × 8,50 × 1,35 = 570 + 127,5 + 44,625 = 742,125 · costo estándar = 57 × 11,80 = 672,60 */
const REG1 = { id: 'RPT-1', fecha: '2026-10-20', linea: 'LIN-1', producto: 'PRO-1', producido: 60, defectuosas: 3, retrabajo: 2, paradaMin: 45, causaParada: 'Falla de máquina', estado: 'Validado' };

prueba('registro: disponibilidad, rendimiento, calidad, OEE y FPY', () => {
  const ctx = crearCtx({ datos: BASE });
  const t = op('registros').calcular(REG1, ctx);
  cerca(t.disponibilidad, 90, 'disponibilidad');
  cerca(t.rendimiento, 88.8889, 'rendimiento', 0.001);
  cerca(t.calidad, 95, 'calidad');
  cerca(t.oee, 76, 'OEE', 0.001);
  cerca(t.fpy, 91.6667, 'FPY', 0.001);
  assert.strictEqual(t.tiempoPlan, 450);
  assert.strictEqual(t.tiempoOperativo, 405);
  assert.strictEqual(t.tiempoIdeal, 360);
  assert.strictEqual(t.buenas, 57);
});

prueba('registro: costo estándar de lo producido y costo real del turno', () => {
  const ctx = crearCtx({ datos: BASE });
  const t = op('registros').calcular(REG1, ctx);
  cerca(t.total, 672.6, 'costo estándar producido');
  cerca(t.costoReal, 742.125, 'costo real', 0.0001);
});

prueba('registro: bordes (sin producción, ritmo por encima del ideal, parada mayor al turno, producto inexistente)', () => {
  const ctx = crearCtx({ datos: BASE });
  const calcular = op('registros').calcular;
  const cero = calcular({ producto: 'PRO-1', producido: 0, defectuosas: 0, retrabajo: 0, paradaMin: 0 }, ctx);
  assert.strictEqual(cero.calidad, 0);
  assert.strictEqual(cero.fpy, 0);
  assert.strictEqual(cero.oee, 0);
  assert.strictEqual(cero.total, 0);
  /* 100 × 6 = 600 min de ciclo ideal en 450 min disponibles: el rendimiento se topa en 100 % */
  const rapido = calcular({ producto: 'PRO-1', producido: 100, defectuosas: 0, retrabajo: 0, paradaMin: 0 }, ctx);
  assert.strictEqual(rapido.tiempoIdeal, 450);
  assert.strictEqual(rapido.rendimiento, 100);
  assert.strictEqual(rapido.oee, 100);
  /* todo el turno parado */
  const parado = calcular({ producto: 'PRO-1', producido: 0, paradaMin: 450 }, ctx);
  assert.strictEqual(parado.disponibilidad, 0);
  assert.strictEqual(parado.rendimiento, 0, 'sin tiempo operativo no se divide');
  const exceso = calcular({ producto: 'PRO-1', producido: 10, paradaMin: 999 }, ctx);
  assert.strictEqual(exceso.tiempoOperativo, 0, 'la parada se topa en el tiempo planificado');
  const sinProducto = calcular({ producto: 'NO-EXISTE', producido: 10, defectuosas: 1 }, ctx);
  assert.strictEqual(sinProducto.total, 0);
  assert.strictEqual(sinProducto.buenas, 9);
});

prueba('registro: el descanso del parámetro cambia el tiempo planificado', () => {
  const ctx = crearCtx({ datos: BASE, parametros: { descansoMin: 60 } });
  const t = op('registros').calcular({ producto: 'PRO-1', producido: 10, paradaMin: 0 }, ctx);
  assert.strictEqual(t.tiempoPlan, 420);
});

prueba('reglas del registro: defectos, parada dentro del turno y causa obligatoria desde 5 min', () => {
  const ctx = crearCtx({ datos: BASE });
  const r = op('registros').reglas;
  const por = (id) => r.filter((x) => x.id === id)[0].validar;
  assert.strictEqual(por('defectos-no-exceden')({ producido: 10, defectuosas: 6, retrabajo: 4 }), true, 'justo 10 = 10');
  assert.strictEqual(por('defectos-no-exceden')({ producido: 10, defectuosas: 6, retrabajo: 5 }), false);
  assert.strictEqual(por('parada-en-turno')({ paradaMin: 450 }, ctx), true);
  assert.strictEqual(por('parada-en-turno')({ paradaMin: 451 }, ctx), false);
  assert.strictEqual(por('parada-con-causa')({ paradaMin: 4 }), true, 'menos de 5 min no exige causa');
  assert.strictEqual(por('parada-con-causa')({ paradaMin: 5 }), false);
  assert.strictEqual(por('parada-con-causa')({ paradaMin: 5, causaParada: 'Corte de energía' }), true);
});

prueba('validar un registro suma al producto terminado solo las unidades buenas; anular lo revierte', () => {
  const ctx = crearCtx({ datos: BASE });
  op('registros').alEmitir(REG1, ctx);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRO-1').stock, 77, '20 + 57');
  op('registros').alAnular(REG1, ctx);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRO-1').stock, 20);
  /* ya salieron unidades del almacén: no se puede anular */
  op('registros').alEmitir(REG1, ctx);
  ctx.datos.actualizar('productos', 'PRO-1', { stock: 56 });
  assert.throws(() => op('registros').alAnular(REG1, ctx), /ya salieron del almacén 1 unidades/);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRO-1').stock, 56, 'sin cambios');
});

/* ---------- Reportes y tablero ---------- */
/* Dos turnos validados de la línea 1: REG1 y REG2 (50 producidas sin paradas, ideal 300). */
function ctxConRegistros(extra) {
  const ctx = crearCtx({ datos: BASE });
  const REG2 = { id: 'RPT-2', fecha: '2026-10-25', linea: 'LIN-1', producto: 'PRO-1', producido: 50, defectuosas: 0, retrabajo: 0, paradaMin: 0, estado: 'Validado' };
  const REG3 = { id: 'RPT-3', fecha: '2026-10-26', linea: 'LIN-2', producto: 'PRO-1', producido: 40, defectuosas: 0, retrabajo: 0, paradaMin: 10, causaParada: 'Falla de máquina', estado: 'Validado' };
  const REG4 = { id: 'RPT-4', fecha: '2026-10-27', linea: 'LIN-1', producto: 'PRO-1', producido: 99, defectuosas: 9, retrabajo: 0, paradaMin: 0, estado: 'Borrador' };
  const REG0 = { id: 'RPT-0', fecha: '2026-01-05', linea: 'LIN-1', producto: 'PRO-1', producido: 99, defectuosas: 0, retrabajo: 0, paradaMin: 0, estado: 'Validado' };
  [REG1, REG2, REG3, REG4, REG0].concat(extra || []).forEach((r) => {
    r.totales = op('registros').calcular(r, ctx);
    ctx.col.registros = ctx.col.registros || [];
    ctx.col.registros.push(r);
  });
  return ctx;
}

prueba('reporte OEE por línea agrega tiempos, no promedia porcentajes', () => {
  const ctx = ctxConRegistros();
  const r = rep('oee-linea').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  const l1 = r.filas.filter((f) => f[0] === 'Línea 1')[0];
  /* planificado 900 · operativo 855 · ideal 660 · producidas 110 · buenas 107 */
  assert.strictEqual(l1[1], 2, 'dos turnos validados (el borrador y el de enero no cuentan)');
  assert.strictEqual(l1[2], 110);
  assert.strictEqual(l1[3], 107);
  cerca(l1[4], 95, 'disponibilidad');
  cerca(l1[5], 77.19, 'rendimiento');
  cerca(l1[6], 97.27, 'calidad');
  cerca(l1[7], 71.33, 'OEE');
  cerca(l1[8], 6.33, 'frente a la meta de 65');
  assert.strictEqual(r.grafico.etiquetas.length, r.filas.length);
});

prueba('reporte OEE por línea con rango vacío no falla', () => {
  const ctx = ctxConRegistros();
  const r = rep('oee-linea').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx);
  assert.strictEqual(r.filas.length, 0);
  assert.strictEqual(r.resumen[0].valor, 0);
});

prueba('reporte de defectos por producto: % de defecto, FPY y costo del desecho', () => {
  const ctx = ctxConRegistros();
  const r = rep('defectos-producto').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  const f = r.filas[0];
  /* producidas 150 · defectuosas 3 · retrabajo 2 · 3 / 150 = 2 % · FPY (150 − 5) / 150 = 96,67 % · desecho 3 × 11,80 = 35,40 */
  assert.strictEqual(r.filas.length, 1);
  assert.strictEqual(f[1], 150);
  assert.strictEqual(f[2], 3);
  assert.strictEqual(f[4], 2);
  cerca(f[5], 96.67, 'FPY');
  assert.strictEqual(f[6], 35.4);
});

prueba('reporte de paradas por causa: minutos, porcentaje y acumulado (Pareto)', () => {
  const ctx = ctxConRegistros();
  const r = rep('paradas-causa').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  /* Falla de máquina: 45 + 10 = 55 min en 2 veces (100 % de lo clasificado) */
  assert.strictEqual(r.filas.length, 1);
  assert.strictEqual(r.filas[0][0], 'Falla de máquina');
  assert.strictEqual(r.filas[0][1], 2);
  assert.strictEqual(r.filas[0][2], 55);
  assert.strictEqual(r.filas[0][3], 100);
  const ctx2 = ctxConRegistros([{ id: 'RPT-5', fecha: '2026-10-28', linea: 'LIN-1', producto: 'PRO-1', producido: 20, defectuosas: 0, retrabajo: 0, paradaMin: 30, causaParada: 'Corte de energía', estado: 'Validado' }]);
  const r2 = rep('paradas-causa').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx2);
  /* 55 + 30 = 85: 64,71 % y 100 % acumulado; la segunda fila 35,29 % */
  cerca(r2.filas[0][3], 64.71, 'porcentaje');
  cerca(r2.filas[1][3], 35.29, 'porcentaje');
  assert.strictEqual(r2.filas[1][4], 100);
  assert.strictEqual(r2.resumen[0].valor, 85);
  assert.strictEqual(r2.resumen[2].valor, 'Falla de máquina');
});

prueba('reporte costo estándar vs real: la variación es real − estándar', () => {
  const ctx = ctxConRegistros();
  const r = rep('costo-estandar-real').ejecutar({ desde: '2026-10-20', hasta: '2026-10-20' }, ctx);
  /* solo REG1 (día 20): estándar 672,60 · real 742,125 → 742,13 · variación 69,53 · 10,34 % */
  assert.strictEqual(r.filas.length, 1);
  assert.strictEqual(r.filas[0][2], 672.6);
  assert.strictEqual(r.filas[0][3], 742.13);
  cerca(r.filas[0][4], 69.53, 'variación');
  cerca(r.filas[0][5], 10.34, 'variación %');
});

prueba('reporte de cumplimiento del plan: ignora órdenes anuladas y planificadas y mide unidades buenas', () => {
  const ctx = ctxConRegistros();
  ctx.col.ordenes = [
    { id: 'OPR-1', fecha: '2026-10-05', producto: 'PRO-1', cantidad: 200, estado: 'Terminada' },
    { id: 'OPR-2', fecha: '2026-10-06', producto: 'PRO-1', cantidad: 500, estado: 'Anulada' },
    { id: 'OPR-3', fecha: '2026-08-06', producto: 'PRO-1', cantidad: 900, estado: 'Terminada' },
    { id: 'OPR-4', fecha: '2026-10-07', producto: 'PRO-1', cantidad: 300, estado: 'Planificada' }
  ];
  const r = rep('cumplimiento-plan').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  /* planificado 200 · buenas: 57 + 50 + 40 = 147 · 73,5 % */
  assert.strictEqual(r.filas[0][1], 200);
  assert.strictEqual(r.filas[0][2], 147);
  assert.strictEqual(r.filas[0][3], -53);
  assert.strictEqual(r.filas[0][4], 73.5);
  assert.strictEqual(r.resumen[2].valor, 73.5);
  const vacio = rep('cumplimiento-plan').ejecutar({ desde: '2000-01-01', hasta: '2000-01-02' }, ctx);
  assert.strictEqual(vacio.resumen[2].valor, 0, '0 planificado no divide por cero');
});

prueba('indicadores del tablero con 30 días de ventana', () => {
  const ctx = ctxConRegistros();
  const por = (t) => S.tablero.filter((x) => x.titulo.indexOf(t) === 0)[0].calcular(ctx);
  /* REG1 + REG2 + REG3 (REG0 es de enero, REG4 es borrador): buenas 57 + 50 + 40 */
  assert.strictEqual(por('Unidades buenas'), 147);
  assert.strictEqual(por('Minutos de parada'), 55);
  cerca(por('Rendimiento a la primera'), 96.67, 'FPY');
  assert.strictEqual(por('Órdenes abiertas'), 0);
  assert.strictEqual(por('Insumos bajo el mínimo'), 0);
  ctx.col.ordenes = [{ id: 'A', estado: 'Liberada' }, { id: 'B', estado: 'En proceso' }, { id: 'C', estado: 'Planificada' }];
  ctx.col.insumos[0].stock = 20;
  assert.strictEqual(por('Órdenes abiertas'), 2);
  assert.strictEqual(por('Insumos bajo el mínimo'), 1);
  const g = S.tableroGrafico.calcular(ctx);
  assert.strictEqual(g.etiquetas.length, 6);
  assert.strictEqual(g.etiquetas[5], 'oct');
  assert.ok(g.valores[5] > 0 && g.valores[4] === 0);
});

prueba('las semillas cumplen las reglas del propio negocio', () => {
  const sem = S.semillas, ctx = crearCtx({ datos: sem });
  sem.registros.forEach((r) => {
    assert.ok(r.defectuosas + r.retrabajo <= r.producido, 'defectos de ' + r.id);
    assert.ok(!(r.paradaMin >= 5 && !r.causaParada), 'causa de ' + r.id);
    assert.ok(r.paradaMin <= 450, 'parada de ' + r.id);
  });
  sem.productos.forEach((p) => {
    assert.ok(p.precioVenta >= calc('productos', 'costoEstandar')(p, ctx), 'precio de ' + p.codigo);
    assert.ok(sem.bom.some((b) => b.producto === p.id), 'BOM de ' + p.codigo);
  });
  const vistos = {};
  sem.bom.forEach((b) => { const k = b.producto + '|' + b.insumo; assert.ok(!vistos[k], 'BOM repetida ' + k); vistos[k] = 1; });
});

console.log(`\n${n} pruebas de fórmulas correctas.`);
