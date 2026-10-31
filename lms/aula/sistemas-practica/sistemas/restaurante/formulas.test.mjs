#!/usr/bin/env node
/*
 * formulas.test.mjs · Prueba de las fórmulas de «restaurante» sin navegador.
 *   node sistemas/restaurante/formulas.test.mjs
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
const regla = (o, id) => o.reglas.filter((r) => r.id === id)[0].validar;
const plano = (x) => JSON.parse(JSON.stringify(x));
const cerca = (real, esperado, msg, tol = 0.005) => assert.ok(Math.abs(real - esperado) <= tol, `${msg}: esperado ${esperado} y salió ${real}`);

let n = 0;
const prueba = (nombre, fn) => { fn(); n++; console.log('  ✓ ' + nombre); };

/* Hoy = 2026-10-31. IGV 18 %, servicio 10 %, meta de food cost 32 %, 10 horas de servicio al día. */
const BASE = {
  insumos: [
    { id: 'INS-1', nombre: 'Lomo', unidad: 'kg', costo: 40, rendimientoPct: 80, stock: 10, stockMin: 3 },
    { id: 'INS-2', nombre: 'Papa', unidad: 'kg', costo: 3, rendimientoPct: 100, stock: 20, stockMin: 5 },
    { id: 'INS-3', nombre: 'Aceite', unidad: 'litro', costo: 8, rendimientoPct: 100, stock: 4, stockMin: 4 }
  ],
  platos: [
    { id: 'PLA-1', nombre: 'Lomo saltado', categoria: 'Platos de fondo', precio: 47.2, tiempoPrepMin: 18, stock: 10, activo: true },
    { id: 'PLA-2', nombre: 'Bebida', categoria: 'Bebidas', precio: 5.9, tiempoPrepMin: 1, stock: 100, activo: true },
    { id: 'PLA-3', nombre: 'Sin precio', categoria: 'Postres', precio: 0, tiempoPrepMin: 5, stock: 5, activo: true },
    { id: 'PLA-4', nombre: 'Retirado de la carta', categoria: 'Postres', precio: 10, tiempoPrepMin: 5, stock: 5, activo: false }
  ],
  /* Lomo saltado: 0,2 kg netos de lomo (rendimiento 80 % → se compran 0,25 kg → S/ 10,00) + 0,3 kg de papa (0,90) + 0,05 l de aceite (0,40) = 11,30 */
  recetas: [
    { id: 'REC-1', plato: 'PLA-1', insumo: 'INS-1', cantidad: 0.2 },
    { id: 'REC-2', plato: 'PLA-1', insumo: 'INS-2', cantidad: 0.3 },
    { id: 'REC-3', plato: 'PLA-1', insumo: 'INS-3', cantidad: 0.05 }
  ],
  mesas: [
    { id: 'MES-1', codigo: 'M01', zona: 'Salón principal', capacidad: 4, activa: true },
    { id: 'MES-2', codigo: 'M02', zona: 'Terraza', capacidad: 6, activa: false },
    { id: 'MES-3', codigo: 'M03', zona: 'Patio', capacidad: 8, activa: true }
  ],
  personal: [
    { id: 'PER-1', nombre: 'Mozo Uno', cargo: 'Mozo', activo: true },
    { id: 'PER-2', nombre: 'Mozo Dos', cargo: 'Mozo', activo: true },
    { id: 'PER-3', nombre: 'Mozo Retirado', cargo: 'Mozo', activo: false },
    { id: 'PER-4', nombre: 'Cajera', cargo: 'Cajero', activo: true }
  ],
  comandas: [], cierres: []
};

const ctxCon = (extra) => crearCtx(Object.assign({ datos: BASE }, extra || {}));

console.log('restaurante · fórmulas');

/* Rendimiento: de lo comprado solo se aprovecha una parte. 0,2 kg netos con 80 % → 0,25 kg comprados × S/ 40 = S/ 10. */
prueba('costo del plato por receta con el rendimiento de cada insumo', () => {
  const ctx = ctxCon();
  assert.strictEqual(calc('platos', 'costoReceta')(BASE.platos[0], ctx), 11.3);
  assert.strictEqual(calc('platos', 'costoReceta')(BASE.platos[1], ctx), 0, 'sin receta cuesta 0');
  assert.strictEqual(calc('recetas', 'costoIngrediente')(BASE.recetas[0], ctx), 10);
  assert.strictEqual(calc('recetas', 'costoIngrediente')(BASE.recetas[1], ctx), 0.9);
  assert.strictEqual(calc('recetas', 'costoIngrediente')({ insumo: 'NO-EXISTE', cantidad: 1 }, ctx), 0);
  assert.strictEqual(calc('insumos', 'costoNeto')(BASE.insumos[0], ctx), 50, '40 / 0,80');
  assert.strictEqual(calc('insumos', 'costoNeto')({ costo: 7.77, rendimientoPct: 45 }, ctx), 17.27, '7,77 / 0,45 = 17,2666');
  assert.strictEqual(calc('insumos', 'costoNeto')({ costo: 10, rendimientoPct: 0 }, ctx), 10, 'un rendimiento 0 se trata como 100 %');
});

prueba('food cost % sobre el precio SIN IGV, margen por porción y frente a la meta', () => {
  const ctx = ctxCon();
  /* 47,20 / 1,18 = 40,00 · 11,30 / 40 = 28,25 % · margen 28,70 */
  assert.strictEqual(calc('platos', 'foodCostPct')(BASE.platos[0], ctx), 28.25);
  assert.strictEqual(calc('platos', 'margenPlato')(BASE.platos[0], ctx), 28.7);
  assert.strictEqual(calc('platos', 'metaFoodCost')(BASE.platos[0], ctx), 'Dentro de la meta');
  assert.strictEqual(calc('platos', 'foodCostPct')(BASE.platos[1], ctx), 0);
  assert.strictEqual(calc('platos', 'foodCostPct')(BASE.platos[2], ctx), null, 'precio 0 no divide por cero');
  assert.strictEqual(calc('platos', 'metaFoodCost')(BASE.platos[2], ctx), 'Sin precio');
  const estricto = crearCtx({ datos: BASE, parametros: { foodCostMeta: 28.25 } });
  assert.strictEqual(calc('platos', 'metaFoodCost')(BASE.platos[0], estricto), 'Dentro de la meta', 'justo en la meta no se pasa');
  const mas = crearCtx({ datos: BASE, parametros: { foodCostMeta: 28 } });
  assert.strictEqual(calc('platos', 'metaFoodCost')(BASE.platos[0], mas), 'Sobre la meta');
});

prueba('situación del insumo (en el mínimo ya es bajo) y regla de ingrediente no repetido', () => {
  const ctx = ctxCon();
  const sit = calc('insumos', 'situacion');
  assert.strictEqual(sit({ stock: 0, stockMin: 3 }), 'Agotado');
  assert.strictEqual(sit({ stock: 3, stockMin: 3 }), 'Bajo el mínimo');
  assert.strictEqual(sit({ stock: 3.01, stockMin: 3 }), 'Normal');
  const f = ent('recetas').reglas[0].validar;
  assert.strictEqual(f({ plato: 'PLA-1', insumo: 'INS-1' }, ctx), false);
  assert.strictEqual(f({ id: 'REC-1', plato: 'PLA-1', insumo: 'INS-1' }, ctx), true);
  assert.strictEqual(f({ plato: 'PLA-2', insumo: 'INS-1' }, ctx), true);
});

/* ---------- Comandas ---------- */
/* 2 lomos (94,40) + 1 bebida (5,90) = consumo 100,30 · servicio 10 % = 10,03 · propina 5 · total 115,33
   gravado 110,33 → base 93,50 → IGV 16,83 · costo 2 × 11,30 = 22,60 · food cost 22,60 / (100,30 / 1,18 = 85) = 26,59 %
   por comensal (3): 110,33 / 3 = 36,78 */
const CMD = { fecha: '2026-10-20', mesa: 'MES-1', mozo: 'PER-1', comensales: 3, conServicio: true, propina: 5, lineas: [{ item: 'PLA-1', cantidad: 2, precio: 47.2 }, { item: 'PLA-2', cantidad: 1, precio: 5.9 }] };

prueba('totales de la comanda: consumo, servicio, propina, IGV incluido, costo y food cost', () => {
  const t = op('comandas').calcular(CMD, ctxCon());
  assert.deepStrictEqual(plano(t), { consumo: 100.3, servicio: 10.03, propina: 5, igv: 16.83, total: 115.33, costo: 22.6, foodCost: 26.59, porComensal: 36.78 });
});

prueba('comanda sin servicio, sin propina, sin comensales y vacía', () => {
  const ctx = ctxCon();
  const sin = op('comandas').calcular(Object.assign({}, CMD, { conServicio: false, propina: 0 }), ctx);
  assert.strictEqual(sin.servicio, 0);
  assert.strictEqual(sin.total, 100.3);
  assert.strictEqual(sin.igv, 15.3, '100,30 − 100,30 / 1,18 = 15,30');
  assert.strictEqual(op('comandas').calcular(Object.assign({}, CMD, { comensales: 0 }), ctx).porComensal, 0, 'sin comensales no divide por cero');
  const v = op('comandas').calcular({ comensales: 2, conServicio: true, lineas: [] }, ctx);
  assert.strictEqual(v.total, 0);
  assert.strictEqual(v.foodCost, 0);
  const u = op('comandas').calcular({ comensales: 1, conServicio: true, lineas: [{ item: 'PLA-2', cantidad: 1, precio: 33.35 }] }, ctx);
  assert.strictEqual(u.servicio, 3.34, '3,335 → 3,34 (medio centavo hacia arriba)');
});

prueba('reglas de la comanda: mesa habilitada, capacidad, plato en carta y mozo en planilla', () => {
  const ctx = ctxCon();
  const o = op('comandas');
  assert.strictEqual(regla(o, 'mesa-habilitada')({ mesa: 'MES-1' }, ctx), true);
  assert.strictEqual(regla(o, 'mesa-habilitada')({ mesa: 'MES-2' }, ctx), false);
  assert.strictEqual(regla(o, 'mesa-habilitada')({ mesa: 'NO-EXISTE' }, ctx), false);
  assert.strictEqual(regla(o, 'cabe-en-la-mesa')({ mesa: 'MES-1', comensales: 4 }, ctx), true, 'justo la capacidad');
  assert.strictEqual(regla(o, 'cabe-en-la-mesa')({ mesa: 'MES-1', comensales: 5 }, ctx), false);
  assert.strictEqual(regla(o, 'platos-en-carta')({ lineas: [{ item: 'PLA-1' }] }, ctx), true);
  assert.strictEqual(regla(o, 'platos-en-carta')({ lineas: [{ item: 'PLA-1' }, { item: 'PLA-4' }] }, ctx), false);
  assert.strictEqual(regla(o, 'atiende-un-mozo')({ mozo: 'PER-1' }, ctx), true);
  assert.strictEqual(regla(o, 'atiende-un-mozo')({ mozo: 'PER-3' }, ctx), false, 'mozo fuera de planilla');
  assert.strictEqual(regla(o, 'atiende-un-mozo')({ mozo: 'PER-4' }, ctx), false, 'una cajera no atiende mesas');
});

prueba('servir una comanda descuenta porciones e insumos según la receta y el rendimiento; anular lo devuelve', () => {
  const ctx = ctxCon();
  const doc = Object.assign({ numero: 'C001-00000001' }, CMD);
  op('comandas').alEmitir(doc, ctx);
  /* 2 lomos: lomo 2 × 0,2 / 0,8 = 0,5 kg · papa 0,6 kg · aceite 0,1 l · porciones 10 − 2 = 8 y 100 − 1 = 99 */
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-1').stock, 9.5);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-2').stock, 19.4);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-3').stock, 3.9);
  assert.strictEqual(ctx.datos.obtener('platos', 'PLA-1').stock, 8);
  assert.strictEqual(ctx.datos.obtener('platos', 'PLA-2').stock, 99);
  op('comandas').alAnular(doc, ctx);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-1').stock, 10);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-2').stock, 20);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-3').stock, 4);
  assert.strictEqual(ctx.datos.obtener('platos', 'PLA-1').stock, 10);
});

prueba('servir rechaza la falta de porciones o de insumos sin tocar nada', () => {
  const ctx = ctxCon();
  const pide = (cant) => ({ numero: 'X', lineas: [{ item: 'PLA-1', cantidad: cant, precio: 47.2 }] });
  assert.throws(() => op('comandas').alEmitir(pide(11), ctx), /Solo quedan 10 porciones de «Lomo saltado» y la comanda pide 11/);
  /* el aceite alcanza para 4 / 0,05 = 80 platos, pero el lomo (10 kg) solo para 10 / 0,25 = 40: subimos las porciones para llegar al insumo */
  ctx.datos.actualizar('platos', 'PLA-1', { stock: 100 });
  assert.throws(() => op('comandas').alEmitir(pide(41), ctx), /Falta «Lomo»: la comanda necesita 10.25 kg y quedan 10/);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-2').stock, 20, 'no se descontó nada');
  assert.strictEqual(ctx.datos.obtener('platos', 'PLA-1').stock, 100);
  op('comandas').alEmitir(pide(40), ctx);
  assert.strictEqual(ctx.datos.obtener('insumos', 'INS-1').stock, 0, '40 × 0,25 kg = 10 kg justos');
  /* una comanda con platos sin receta solo mueve porciones */
  const c2 = ctxCon();
  op('comandas').alEmitir({ numero: 'Y', lineas: [{ item: 'PLA-2', cantidad: 3, precio: 5.9 }] }, c2);
  assert.strictEqual(c2.datos.obtener('platos', 'PLA-2').stock, 97);
  assert.strictEqual(c2.datos.obtener('insumos', 'INS-1').stock, 10);
});

/* ---------- Cierres de caja ---------- */
function ctxConComandas() {
  const ctx = ctxCon();
  const mk = (id, fecha, mesa, mozo, comensales, duracion, pago, estado, lineas, extra) => {
    const d = Object.assign({ id, numero: 'C001-' + id, fecha, mesa, mozo, comensales, duracionMin: duracion, formaPago: pago, conServicio: true, estado, lineas }, extra || {});
    d.totales = op('comandas').calcular(d, ctx);
    return d;
  };
  ctx.col.comandas = [
    mk('C1', '2026-10-20', 'MES-1', 'PER-1', 3, 60, 'Efectivo', 'Cobrada', CMD.lineas, { propina: 5 }),
    mk('C2', '2026-10-20', 'MES-1', 'PER-1', 2, 90, 'Tarjeta', 'Cobrada', [{ item: 'PLA-1', cantidad: 1, precio: 47.2 }], { propina: 0 }),
    mk('C3', '2026-10-21', 'MES-3', 'PER-2', 4, 30, 'Yape o Plin', 'Servida', [{ item: 'PLA-2', cantidad: 4, precio: 5.9 }], { propina: 2 }),
    mk('C4', '2026-10-21', 'MES-3', 'PER-2', 2, 40, 'Efectivo', 'Abierta', [{ item: 'PLA-2', cantidad: 9, precio: 5.9 }]),
    mk('C5', '2026-10-21', 'MES-3', 'PER-2', 2, 40, 'Efectivo', 'Anulada', [{ item: 'PLA-2', cantidad: 9, precio: 5.9 }]),
    mk('C6', '2026-03-01', 'MES-1', 'PER-1', 2, 40, 'Efectivo', 'Cobrada', [{ item: 'PLA-2', cantidad: 2, precio: 5.9 }])
  ];
  return ctx;
}

prueba('cierre de caja: esperado por canal, contado y diferencia', () => {
  const ctx = ctxConComandas();
  /* 20/oct cobradas: C1 efectivo 115,33 · C2 tarjeta 47,20 + 4,72 = 51,92. Total 167,25 · ticket 83,63 (167,25 / 2)
     esperado en efectivo = fondo 200 + 115,33 − gastos 20 = 295,33 · contado: efectivo 290,33, tarjeta 51,92, digital 1 (no hubo Yape ese día)
     contado 343,25 · esperado 295,33 + 51,92 = 347,25 · diferencia −4 */
  const t = op('cierres').calcular({ fecha: '2026-10-20', fondoInicial: 200, efectivoContado: 290.33, tarjetaVouchers: 51.92, digitalContado: 1, gastosCaja: 20 }, ctx);
  assert.strictEqual(t.comandas, 2);
  assert.strictEqual(t.ventas, 167.25);
  assert.strictEqual(t.esperado, 347.25);
  assert.strictEqual(t.total, 343.25);
  assert.strictEqual(t.diferencia, -4);
  assert.strictEqual(t.difEfectivo, -5);
  assert.strictEqual(t.difTarjeta, 0);
  assert.strictEqual(t.difDigital, 1);
  assert.strictEqual(t.ticket, 83.63, '167,25 / 2 = 83,625 → 83,63');
  assert.strictEqual(t.propinas, 5);
  assert.strictEqual(t.servicio, 14.75);
});

prueba('cierre de caja: solo cuentan las cobradas de ese día; día sin ventas y sobrante', () => {
  const ctx = ctxConComandas();
  const vacio = op('cierres').calcular({ fecha: '2026-10-22', fondoInicial: 200, efectivoContado: 200, tarjetaVouchers: 0, digitalContado: 0, gastosCaja: 0 }, ctx);
  assert.strictEqual(vacio.comandas, 0);
  assert.strictEqual(vacio.ticket, 0, 'sin comandas no divide por cero');
  assert.strictEqual(vacio.diferencia, 0);
  const d21 = op('cierres').calcular({ fecha: '2026-10-21', fondoInicial: 100, efectivoContado: 100.5, tarjetaVouchers: 0, digitalContado: 0, gastosCaja: 0 }, ctx);
  assert.strictEqual(d21.ventas, 0, 'la servida, la abierta y la anulada no están cobradas');
  assert.strictEqual(d21.diferencia, 0.5, 'sobrante');
  assert.strictEqual(op('cierres').calcular({ fecha: '2026-10-20' }, ctx).total, 0, 'sin montos no hay NaN');
});

prueba('emitir un cierre exige que no haya otro emitido el mismo día', () => {
  const ctx = ctxCon();
  ctx.col.cierres = [
    { id: 'CCJ-1', numero: 'CJ01-00000001', fecha: '2026-10-20', estado: 'Emitido' },
    { id: 'CCJ-2', fecha: '2026-10-21', estado: 'Anulado' },
    { id: 'CCJ-3', fecha: '2026-10-22', estado: 'Borrador' }
  ];
  assert.throws(() => op('cierres').alEmitir({ id: 'CCJ-9', fecha: '2026-10-20' }, ctx), /Ya hay un cierre de caja emitido para el 2026-10-20 \(CJ01-00000001\)/);
  op('cierres').alEmitir({ id: 'CCJ-9', fecha: '2026-10-21' }, ctx);
  op('cierres').alEmitir({ id: 'CCJ-9', fecha: '2026-10-22' }, ctx);
  op('cierres').alEmitir({ id: 'CCJ-1', fecha: '2026-10-20' }, ctx);
});

/* ---------- Reportes ---------- */
const RANGO = { desde: '2026-10-01', hasta: '2026-10-31' };

prueba('ventas por plato: solo comandas servidas o cobradas, con ingreso, margen y participación', () => {
  const r = rep('ventas-plato').ejecutar(RANGO, ctxConComandas());
  /* lomo: 2 + 1 = 3 uds · 141,60 · margen 141,60 / 1,18 − 3 × 11,30 = 120 − 33,90 = 86,10 · bebida: 1 + 4 = 5 uds · 29,50 · margen 25 */
  const l = r.filas.filter((f) => f[0] === 'Lomo saltado')[0], b = r.filas.filter((f) => f[0] === 'Bebida')[0];
  assert.strictEqual(r.filas.length, 2);
  assert.strictEqual(l[2], 3);
  assert.strictEqual(l[3], 141.6);
  assert.strictEqual(l[4], 86.1);
  assert.strictEqual(l[5], 82.76);
  assert.strictEqual(b[2], 5);
  assert.strictEqual(b[4], 25);
  assert.strictEqual(r.resumen[0].valor, 171.1);
  assert.strictEqual(r.resumen[1].valor, 8);
  assert.strictEqual(r.resumen[2].valor, 'Bebida');
  assert.strictEqual(r.filas[0][0], 'Lomo saltado', 'ordenado por ingreso');
  const vacio = rep('ventas-plato').ejecutar({ desde: '2000-01-01', hasta: '2000-02-01' }, ctxConComandas());
  assert.strictEqual(vacio.filas.length, 0);
  assert.strictEqual(vacio.resumen[2].valor, 'Sin ventas');
});

prueba('food cost por plato vendido y ponderado por ventas', () => {
  const ctx = ctxConComandas();
  const r = rep('food-cost').ejecutar(RANGO, ctx);
  /* ponderado: costo 3 × 11,30 = 33,90 sobre venta neta (141,60 + 29,50) / 1,18 = 145 → 23,38 % */
  assert.strictEqual(r.filas.length, 2, 'solo los platos que se vendieron');
  assert.strictEqual(r.filas[0][0], 'Lomo saltado');
  assert.strictEqual(r.filas[0][1], 40);
  assert.strictEqual(r.filas[0][2], 11.3);
  assert.strictEqual(r.filas[0][3], 28.25);
  assert.strictEqual(r.filas[0][4], 'Dentro de la meta');
  assert.strictEqual(r.filas[0][5], 3);
  assert.strictEqual(r.resumen[0].valor, 23.38);
  assert.strictEqual(r.resumen[2].valor, 0);
  const estricto = rep('food-cost').ejecutar(RANGO, crearCtx({ datos: ctx.col, parametros: { foodCostMeta: 25 } }));
  assert.strictEqual(estricto.resumen[2].valor, 1);
  assert.strictEqual(rep('food-cost').ejecutar({ desde: '2000-01-01', hasta: '2000-02-01' }, ctx).resumen[0].valor, 0, 'sin ventas no divide por cero');
});

prueba('rotación por mesa: comandas por día de servicio, minutos por ocupación y % de ocupación', () => {
  const r = rep('rotacion-mesa').ejecutar(RANGO, ctxConComandas());
  /* días con servicio: 20 y 21 de octubre = 2 · M01: C1 + C2 = 2 comandas, 150 min · M03: C3 = 1 comanda, 30 min
     tiempo disponible 2 días × 10 h × 60 = 1200 min · M01: 2 / 2 = 1,00 por día · 75 min · 12,5 % · M03: 0,5 por día · 2,5 % */
  const m1 = r.filas.filter((f) => f[0] === 'M01')[0], m3 = r.filas.filter((f) => f[0] === 'M03')[0];
  assert.strictEqual(r.filas.length, 2, 'las mesas sin atenciones no salen');
  assert.strictEqual(m1[3], 2);
  assert.strictEqual(m1[4], 5);
  assert.strictEqual(m1[5], 1);
  assert.strictEqual(m1[6], 75);
  assert.strictEqual(m1[7], 12.5);
  assert.strictEqual(m3[5], 0.5);
  assert.strictEqual(m3[7], 2.5);
  assert.strictEqual(r.resumen[0].valor, 2);
  assert.strictEqual(r.resumen[1].valor, 3);
  assert.strictEqual(r.resumen[2].valor, 0.75, '3 comandas / 2 días / 2 mesas');
  const vacio = rep('rotacion-mesa').ejecutar({ desde: '2000-01-01', hasta: '2000-02-01' }, ctxConComandas());
  assert.strictEqual(vacio.resumen[2].valor, 0);
});

prueba('ventas por mozo: consumo, servicio, propinas, ticket y consumo por comensal', () => {
  const r = rep('ventas-mozo').ejecutar(RANGO, ctxConComandas());
  /* Mozo Uno: C1 + C2 = 2 comandas, 5 comensales, consumo 147,50, servicio 14,75, propinas 5, ticket 73,75, por comensal 29,50
     Mozo Dos: C3 = 1 comanda, 4 comensales, consumo 23,60, servicio 2,36, propina 2, ticket 23,60, por comensal 5,90 */
  const u = r.filas.filter((f) => f[0] === 'Mozo Uno')[0], d = r.filas.filter((f) => f[0] === 'Mozo Dos')[0];
  assert.strictEqual(r.filas.length, 2);
  assert.deepStrictEqual(plano(u.slice(1)), [2, 5, 147.5, 14.75, 5, 73.75, 29.5]);
  assert.deepStrictEqual(plano(d.slice(1)), [1, 4, 23.6, 2.36, 2, 23.6, 5.9]);
  assert.strictEqual(r.resumen[0].valor, 171.1);
  assert.strictEqual(r.resumen[1].valor, 7);
  assert.strictEqual(r.resumen[2].valor, 57.03, '171,10 / 3');
});

prueba('reporte de cierres: solo emitidos, con diferencia acumulada y cierres con faltante', () => {
  const ctx = ctxConComandas();
  const mk = (id, fecha, estado, dif, ventas) => ({ id, numero: 'CJ01-' + id, fecha, estado, totales: { comandas: 2, ventas, esperado: ventas, total: ventas + dif, diferencia: dif, ticket: ventas / 2 } });
  ctx.col.cierres = [mk('1', '2026-10-05', 'Emitido', -5, 100), mk('2', '2026-10-06', 'Emitido', 2.5, 200), mk('3', '2026-10-07', 'Anulado', -50, 300), mk('4', '2026-10-08', 'Borrador', -50, 300), mk('5', '2026-08-08', 'Emitido', -1, 50)];
  const r = rep('cierre-diario').ejecutar(RANGO, ctx);
  assert.strictEqual(r.filas.length, 2);
  assert.strictEqual(r.filas[0][0], '2026-10-05');
  assert.strictEqual(r.resumen[0].valor, 300);
  assert.strictEqual(r.resumen[1].valor, -2.5);
  assert.strictEqual(r.resumen[2].valor, 1);
  assert.strictEqual(r.grafico.etiquetas[0], '10-05');
});

prueba('indicadores del tablero', () => {
  const ctx = ctxConComandas();
  const por = (t) => S.tablero.filter((x) => x.titulo.indexOf(t) === 0)[0].calcular(ctx);
  /* últimos 30 días (desde 2026-10-02): C1 100,30 + 10,03 · C2 47,20 + 4,72 · C3 23,60 + 2,36 = 188,21 */
  assert.strictEqual(por('Ventas de los últimos 30 días'), 188.21);
  /* ticket por comanda sobre el consumo: (100,30 + 47,20 + 23,60) / 3 = 57,03 */
  assert.strictEqual(por('Ticket promedio'), 57.03);
  /* costo 3 × 11,30 = 33,90 sobre neto (171,10 / 1,18 = 145) */
  assert.strictEqual(por('Food cost real'), 23.38);
  assert.strictEqual(por('Comandas por cobrar'), 1);
  assert.strictEqual(por('Insumos bajo el mínimo'), 1, 'el aceite está justo en el mínimo');
  assert.strictEqual(por('Propinas'), 7);
  const g = S.tableroGrafico.calcular(ctx);
  assert.strictEqual(g.etiquetas.length, 6);
  assert.strictEqual(g.valores[5], 188.21);
});

prueba('las semillas son coherentes: recetas, mozos, capacidad y cierres que cuadran con las comandas', () => {
  const sem = S.semillas, ctx = crearCtx({ datos: sem });
  const vistos = {};
  sem.recetas.forEach((r) => { const k = r.plato + '|' + r.insumo; assert.ok(!vistos[k], 'receta repetida ' + k); vistos[k] = 1; });
  sem.platos.forEach((p) => { assert.ok(sem.recetas.some((r) => r.plato === p.id), 'receta de ' + p.codigo); });
  sem.comandas.forEach((c) => {
    const mesa = sem.mesas.filter((m) => m.id === c.mesa)[0], mozo = sem.personal.filter((x) => x.id === c.mozo)[0];
    assert.ok(mesa.activa && c.comensales <= mesa.capacidad, 'mesa de ' + c.id);
    assert.ok(mozo.cargo === 'Mozo' && mozo.activo, 'mozo de ' + c.id);
    c.totales = op('comandas').calcular(c, ctx);
  });
  ctx.col.comandas = sem.comandas;
  sem.cierres.forEach((c) => {
    const t = op('cierres').calcular(c, ctx);
    assert.ok(t.comandas > 0, 'comandas del cierre ' + c.id);
    assert.ok(t.difTarjeta === 0, 'tarjeta del cierre ' + c.id);
    assert.ok(t.difDigital === 0, 'digital del cierre ' + c.id);
    assert.ok([0, -5, 2.5, -12.5].some((v) => v === t.difEfectivo), 'efectivo del cierre ' + c.id + ' (' + t.difEfectivo + ')');
  });
  const dias = {};
  sem.cierres.forEach((c) => { assert.ok(!dias[c.fecha], 'dos cierres el ' + c.fecha); dias[c.fecha] = 1; });
});

console.log(`\n${n} pruebas de fórmulas correctas.`);
