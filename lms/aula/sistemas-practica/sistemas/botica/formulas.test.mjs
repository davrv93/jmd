#!/usr/bin/env node
/*
 * formulas.test.mjs · Prueba de las fórmulas de «botica» sin navegador.
 *   node sistemas/botica/formulas.test.mjs
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
const cerca = (real, esperado, msg, tol = 0.005) => assert.ok(Math.abs(real - esperado) <= tol, `${msg}: esperado ${esperado} y salió ${real}`);

let n = 0;
const prueba = (nombre, fn) => { fn(); n++; console.log('  ✓ ' + nombre); };

const LIBRE = 'Venta libre', RECETA = 'Con receta médica', CONTROLADO = 'Receta retenida (controlado)';

/* Hoy = 2026-10-31. IGV 18 %. Tarjetas: Plata 3 %, Oro 5 %, Platino 8 %. Alerta roja ≤ 30 d, amarilla ≤ 90 d. */
const BASE = {
  productos: [
    { id: 'PRD-1', nombre: 'Paracetamol', categoria: 'Cuidado personal', condicionVenta: LIBRE, costo: 5, precio: 11.8, stock: 115, stockMin: 20 },
    { id: 'PRD-2', nombre: 'Clonazepam', categoria: 'Psicotrópicos y opioides', condicionVenta: CONTROLADO, costo: 10, precio: 23.6, stock: 40, stockMin: 8 },
    { id: 'PRD-3', nombre: 'Amoxicilina', categoria: 'Antibióticos', condicionVenta: RECETA, costo: 8, precio: 17, stock: 0, stockMin: 5 }
  ],
  clientes: [
    { id: 'CLI-1', nombre: 'Cliente Oro', tarjeta: 'Oro' },
    { id: 'CLI-2', nombre: 'Cliente Platino', tarjeta: 'Platino' },
    { id: 'CLI-3', nombre: 'Cliente sin tarjeta', tarjeta: 'Sin tarjeta' },
    { id: 'CLI-4', nombre: 'Cliente Plata', tarjeta: 'Plata' }
  ],
  /* PRD-1: G vence hoy (vale), B y A vencen el mismo día (sale primero el que entró antes: B), C lejano;
     D vencido, E en cuarentena y F sin stock no se pueden vender. */
  lotes: [
    { id: 'LOT-A', producto: 'PRD-1', numeroLote: 'A', fechaIngreso: '2026-01-01', vencimiento: '2026-11-10', cantidadInicial: 10, stock: 5, costoUnit: 5, estado: 'Disponible' },
    { id: 'LOT-B', producto: 'PRD-1', numeroLote: 'B', fechaIngreso: '2025-12-01', vencimiento: '2026-11-10', cantidadInicial: 10, stock: 7, costoUnit: 5, estado: 'Disponible' },
    { id: 'LOT-C', producto: 'PRD-1', numeroLote: 'C', fechaIngreso: '2026-06-01', vencimiento: '2027-03-01', cantidadInicial: 100, stock: 100, costoUnit: 5, estado: 'Disponible' },
    { id: 'LOT-D', producto: 'PRD-1', numeroLote: 'D', fechaIngreso: '2025-01-01', vencimiento: '2026-10-01', cantidadInicial: 50, stock: 50, costoUnit: 5, estado: 'Disponible' },
    { id: 'LOT-E', producto: 'PRD-1', numeroLote: 'E', fechaIngreso: '2026-05-01', vencimiento: '2026-12-01', cantidadInicial: 40, stock: 40, costoUnit: 5, estado: 'Cuarentena' },
    { id: 'LOT-F', producto: 'PRD-1', numeroLote: 'F', fechaIngreso: '2026-05-01', vencimiento: '2026-12-01', cantidadInicial: 40, stock: 0, costoUnit: 5, estado: 'Disponible' },
    { id: 'LOT-G', producto: 'PRD-1', numeroLote: 'G', fechaIngreso: '2026-02-01', vencimiento: '2026-10-31', cantidadInicial: 3, stock: 3, costoUnit: 5, estado: 'Disponible' },
    { id: 'LOT-H', producto: 'PRD-2', numeroLote: 'H', fechaIngreso: '2026-02-01', vencimiento: '2027-06-01', cantidadInicial: 40, stock: 40, costoUnit: 10, estado: 'Disponible' }
  ],
  ventas: [], movimientos: [], compras: []
};

const ctxCon = (usuarioRol, extra) => crearCtx(Object.assign({ datos: BASE, usuario: { usuario: 'u-' + usuarioRol, rol: usuarioRol } }, extra || {}));

console.log('botica · fórmulas');

/* Precio 11,80 con IGV → 10,00 sin IGV · costo 5 → margen 50 %. */
prueba('margen sobre el precio sin IGV', () => {
  const ctx = ctxCon('admin');
  const f = calc('productos', 'margen');
  assert.strictEqual(f({ precio: 11.8, costo: 5 }, ctx), 50);
  assert.strictEqual(f({ precio: 23.6, costo: 10 }, ctx), 50);
  assert.strictEqual(f({ precio: 11.8, costo: 11.8 }, ctx), -18, 'vender al costo con IGV da margen negativo: (10 − 11,8) / 10');
  assert.strictEqual(f({ precio: 0, costo: 5 }, ctx), null, 'precio 0 no divide por cero');
  assert.strictEqual(f({ precio: 11.8 }, ctx), null, 'sin costo no hay margen');
  const ctx2 = crearCtx({ datos: BASE, parametros: { igv: 0 } });
  assert.strictEqual(f({ precio: 10, costo: 5 }, ctx2), 50, 'sin IGV el precio es el neto');
});

prueba('situación del producto y cuadre con los lotes', () => {
  const ctx = ctxCon('admin');
  const sit = calc('productos', 'situacion');
  assert.strictEqual(sit({ stock: 0, stockMin: 5 }), 'Agotado');
  assert.strictEqual(sit({ stock: 5, stockMin: 5 }), 'Stock bajo');
  assert.strictEqual(sit({ stock: 6, stockMin: 5 }), 'Normal');
  /* PRD-1 tiene 5 + 7 + 100 + 50 + 40 + 0 + 3 = 205 unidades en lotes no retirados */
  assert.strictEqual(calc('productos', 'stockLotes')(BASE.productos[0], ctx), 205);
  assert.strictEqual(calc('productos', 'cuadre')({ id: 'PRD-1', stock: 205 }, ctx), 'Cuadra');
  assert.strictEqual(calc('productos', 'cuadre')({ id: 'PRD-1', stock: 115 }, ctx), 'Descuadre de -90');
  assert.strictEqual(calc('productos', 'cuadre')({ id: 'PRD-3', stock: 0 }, ctx), 'Cuadra', 'sin lotes y sin stock cuadra');
});

/* Alerta por colores: hoy 2026-10-31. Rojo hasta 30 días, amarillo hasta 90, verde después. */
prueba('días para vencer y alerta por colores, con los bordes de cada tramo', () => {
  const ctx = ctxCon('admin');
  const dias = calc('lotes', 'diasParaVencer'), alerta = calc('lotes', 'alerta');
  const l = (venc, extra) => Object.assign({ vencimiento: venc, stock: 10, estado: 'Disponible' }, extra || {});
  assert.strictEqual(dias(l('2026-11-30'), ctx), 30);
  assert.strictEqual(alerta(l('2026-10-30'), ctx), 'Vencido hace 1 d');
  assert.strictEqual(alerta(l('2026-10-31'), ctx), 'Rojo · vence en 0 d', 'vence hoy: todavía se puede vender, pero en rojo');
  assert.strictEqual(alerta(l('2026-11-30'), ctx), 'Rojo · vence en 30 d', '30 días exactos son rojo');
  assert.strictEqual(alerta(l('2026-12-01'), ctx), 'Amarillo · vence en 31 d');
  assert.strictEqual(alerta(l('2027-01-29'), ctx), 'Amarillo · vence en 90 d', '90 días exactos son amarillo');
  assert.strictEqual(alerta(l('2027-01-30'), ctx), 'Verde · vence en 91 d');
  assert.strictEqual(alerta(l('2026-10-01', { stock: 0 }), ctx), 'Sin stock');
  assert.strictEqual(alerta(l('2026-10-01', { estado: 'Retirado' }), ctx), 'Retirado');
  assert.strictEqual(dias({}, ctx), null);
  const ctx2 = crearCtx({ datos: BASE, parametros: { alertaRojaDias: 10, alertaAmarillaDias: 20 } });
  assert.strictEqual(alerta(l('2026-11-20'), ctx2), 'Amarillo · vence en 20 d', 'los umbrales salen de los parámetros');
  assert.strictEqual(alerta(l('2026-11-21'), ctx2), 'Verde · vence en 21 d');
  assert.strictEqual(calc('lotes', 'valorCosto')({ costoUnit: 2.35, stock: 3 }, ctx), 7.05);
});

prueba('reglas del lote: stock dentro de lo recibido, fechas y número no repetido', () => {
  const ctx = ctxCon('admin');
  assert.strictEqual(regla(ent('lotes'), 'stock-dentro-de-lo-recibido')({ stock: 10, cantidadInicial: 10 }), true);
  assert.strictEqual(regla(ent('lotes'), 'stock-dentro-de-lo-recibido')({ stock: 11, cantidadInicial: 10 }), false);
  assert.strictEqual(regla(ent('lotes'), 'vence-despues-de-ingresar')({ fechaIngreso: '2026-10-31', vencimiento: '2026-10-31' }), true);
  assert.strictEqual(regla(ent('lotes'), 'vence-despues-de-ingresar')({ fechaIngreso: '2026-10-31', vencimiento: '2026-10-30' }), false);
  assert.strictEqual(regla(ent('lotes'), 'lote-no-repetido')({ producto: 'PRD-1', numeroLote: 'A' }, ctx), false);
  assert.strictEqual(regla(ent('lotes'), 'lote-no-repetido')({ id: 'LOT-A', producto: 'PRD-1', numeroLote: 'A' }, ctx), true, 'editar el mismo lote');
  assert.strictEqual(regla(ent('lotes'), 'lote-no-repetido')({ producto: 'PRD-2', numeroLote: 'A' }, ctx), true, 'otro producto puede repetir el número');
});

prueba('descuento vigente y puntos de fidelidad (1 punto por cada S/ 20)', () => {
  const ctx = ctxCon('admin');
  const d = calc('clientes', 'descuento');
  assert.strictEqual(d(BASE.clientes[0], ctx), 5);
  assert.strictEqual(d(BASE.clientes[1], ctx), 8);
  assert.strictEqual(d(BASE.clientes[2], ctx), 0);
  assert.strictEqual(d(BASE.clientes[3], ctx), 3);
  ctx.col.ventas = [
    { id: 'V1', cliente: 'CLI-1', estado: 'Emitida', totales: { total: 59.99 } },
    { id: 'V2', cliente: 'CLI-1', estado: 'Emitida', totales: { total: 80.01 } },
    { id: 'V3', cliente: 'CLI-1', estado: 'Anulada', totales: { total: 500 } },
    { id: 'V4', cliente: 'CLI-1', estado: 'Borrador', totales: { total: 500 } },
    { id: 'V5', cliente: 'CLI-2', estado: 'Emitida', totales: { total: 19.99 } }
  ];
  assert.strictEqual(calc('clientes', 'comprado')(BASE.clientes[0], ctx), 140);
  assert.strictEqual(calc('clientes', 'puntos')(BASE.clientes[0], ctx), 7, '140 / 20 = 7 exacto');
  assert.strictEqual(calc('clientes', 'puntos')(BASE.clientes[1], ctx), 0, '19,99 no llega al primer punto');
  assert.strictEqual(calc('clientes', 'puntos')(BASE.clientes[2], ctx), 0);
});

/* ---------- Ventas ---------- */
/* Cliente Oro (5 %): 4 × 11,80 = 47,20 (con descuento 2,36) + 1 clonazepam 23,60 (controlado: sin descuento).
   Bruto 70,80 · descuento 2,36 · total 68,44 · base 68,44 / 1,18 = 58,00 · IGV 10,44 · costo 4 × 5 + 10 = 30 · utilidad 28. */
const VTA = { fecha: '2026-10-31', cliente: 'CLI-1', formaPago: 'Efectivo', lineas: [{ item: 'PRD-1', cantidad: 4, precio: 11.8 }, { item: 'PRD-2', cantidad: 1, precio: 23.6 }] };

prueba('totales de la venta: descuento de tarjeta solo en no controlados, IGV incluido en el precio', () => {
  const ctx = ctxCon('cajero');
  const t = op('ventas').calcular(VTA, ctx);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t)), { bruto: 70.8, descuento: 2.36, base: 58, igv: 10.44, total: 68.44, costo: 30, utilidad: 28 });
});

prueba('descuento por cada tarjeta, con redondeo', () => {
  const ctx = ctxCon('cajero');
  const doc = (cli) => ({ cliente: cli, lineas: [{ item: 'PRD-1', cantidad: 3, precio: 3.5 }] });
  /* 3 × 3,50 = 10,50 */
  assert.strictEqual(op('ventas').calcular(doc('CLI-2'), ctx).descuento, 0.84, 'Platino 8 %');
  assert.strictEqual(op('ventas').calcular(doc('CLI-1'), ctx).descuento, 0.53, 'Oro 5 % = 0,525 → 0,53');
  assert.strictEqual(op('ventas').calcular(doc('CLI-4'), ctx).descuento, 0.32, 'Plata 3 % = 0,315 → 0,32');
  assert.strictEqual(op('ventas').calcular(doc('CLI-3'), ctx).descuento, 0);
  assert.strictEqual(op('ventas').calcular(doc('NO-EXISTE'), ctx).descuento, 0, 'cliente inexistente');
  const t = op('ventas').calcular(doc('CLI-2'), ctx);
  /* total 9,66 · base 9,66 / 1,18 = 8,1864 → 8,19 · IGV 1,47 */
  assert.strictEqual(t.total, 9.66);
  assert.strictEqual(t.base, 8.19);
  assert.strictEqual(t.igv, 1.47);
  assert.strictEqual(t.base + t.igv, t.total, 'base + IGV = total siempre');
  const ctx2 = crearCtx({ datos: BASE, parametros: { descPlatino: 15 } });
  assert.strictEqual(op('ventas').calcular(doc('CLI-2'), ctx2).descuento, 1.58, '10,50 × 15 % = 1,575 → 1,58');
});

prueba('venta vacía o con producto inexistente no produce NaN', () => {
  const ctx = ctxCon('cajero');
  const t = op('ventas').calcular({ cliente: 'CLI-1', lineas: [] }, ctx);
  assert.strictEqual(t.total, 0);
  assert.strictEqual(t.utilidad, 0);
  const t2 = op('ventas').calcular({ cliente: 'CLI-1', lineas: [{ item: 'NO', cantidad: 2, precio: 1 }] }, ctx);
  assert.strictEqual(t2.bruto, 2);
  assert.strictEqual(t2.costo, 0);
});

prueba('reglas de la venta: receta, CMP de controlados y tope por receta', () => {
  const ctx = ctxCon('cajero');
  const v = op('ventas');
  const l = (item, cantidad) => ({ item: item, cantidad: cantidad, precio: 1 });
  assert.strictEqual(regla(v, 'receta-completa')({ lineas: [l('PRD-1', 1)] }, ctx), true, 'venta libre no exige receta');
  assert.strictEqual(regla(v, 'receta-completa')({ lineas: [l('PRD-3', 1)] }, ctx), false);
  assert.strictEqual(regla(v, 'receta-completa')({ lineas: [l('PRD-3', 1)], numeroReceta: 'RX-1' }, ctx), false, 'falta el médico');
  assert.strictEqual(regla(v, 'receta-completa')({ lineas: [l('PRD-3', 1)], numeroReceta: 'RX-1', medico: 'Dr. X' }, ctx), true);
  assert.strictEqual(regla(v, 'controlado-con-cmp')({ lineas: [l('PRD-2', 1)], numeroReceta: 'RX-1', medico: 'Dr. X' }, ctx), false);
  assert.strictEqual(regla(v, 'controlado-con-cmp')({ lineas: [l('PRD-2', 1)], cmp: '45231' }, ctx), true);
  assert.strictEqual(regla(v, 'controlado-con-cmp')({ lineas: [l('PRD-3', 1)] }, ctx), true, 'solo los controlados piden CMP');
  assert.strictEqual(regla(v, 'tope-controlado')({ lineas: [l('PRD-2', 5)] }, ctx), true, 'el tope (5) se puede usar completo');
  assert.strictEqual(regla(v, 'tope-controlado')({ lineas: [l('PRD-2', 6)] }, ctx), false);
  assert.strictEqual(regla(v, 'tope-controlado')({ lineas: [l('PRD-3', 99)] }, ctx), true, 'el tope es solo de controlados');
});

/* ---------- FEFO ---------- */
prueba('FEFO: sale primero el lote que vence antes; a igual fecha, el que entró antes; ignora vencidos, cuarentena y sin stock', () => {
  const ctx = ctxCon('cajero');
  const doc = { numero: 'B001-00000001', lineas: [{ item: 'PRD-1', cantidad: 20, precio: 11.8 }] };
  op('ventas').alEmitir(doc, ctx);
  const st = (id) => ctx.datos.obtener('lotes', id).stock;
  /* 20 = G (vence hoy) 3 + B 7 + A 5 + C 5 */
  assert.strictEqual(st('LOT-G'), 0);
  assert.strictEqual(st('LOT-B'), 0);
  assert.strictEqual(st('LOT-A'), 0);
  assert.strictEqual(st('LOT-C'), 95);
  assert.strictEqual(st('LOT-D'), 50, 'el vencido no se toca');
  assert.strictEqual(st('LOT-E'), 40, 'cuarentena no se toca');
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-1').stock, 95, '115 − 20');
  const movs = ctx.col.movimientos.map((m) => m.lote + ':' + m.cantidad + ':' + m.tipo);
  assert.deepStrictEqual(movs, ['LOT-G:3:Salida por venta', 'LOT-B:7:Salida por venta', 'LOT-A:5:Salida por venta', 'LOT-C:5:Salida por venta']);
  assert.strictEqual(ctx.col.movimientos[0].documento, 'B001-00000001');
});

prueba('FEFO: sin stock vigente suficiente la venta se rechaza sin descontar nada', () => {
  const ctx = ctxCon('cajero');
  /* vigente: 3 + 7 + 5 + 100 = 115 → pedir 116 falla */
  const doc = { numero: 'B001-00000002', lineas: [{ item: 'PRD-1', cantidad: 10, precio: 1 }, { item: 'PRD-1X', cantidad: 1, precio: 1 }] };
  assert.throws(() => op('ventas').alEmitir({ numero: 'X', lineas: [{ item: 'PRD-1', cantidad: 116, precio: 1 }] }, ctx), /solo hay 115 en lotes disponibles sin vencer/);
  assert.strictEqual(ctx.datos.obtener('lotes', 'LOT-C').stock, 100);
  assert.strictEqual(ctx.col.movimientos.length, 0);
  /* una segunda línea sin lotes vigentes (amoxicilina) hace fallar toda la venta antes de descontar la primera */
  assert.throws(() => op('ventas').alEmitir({ numero: 'X', lineas: [{ item: 'PRD-1', cantidad: 10, precio: 1 }, { item: 'PRD-3', cantidad: 1, precio: 1 }] }, ctx), /No hay stock vigente de «Amoxicilina»/);
  assert.strictEqual(ctx.datos.obtener('lotes', 'LOT-C').stock, 100, 'la primera línea no se descontó');
  /* 115 exactos sí se pueden vender */
  op('ventas').alEmitir({ numero: 'B001-3', lineas: [{ item: 'PRD-1', cantidad: 115, precio: 1 }] }, ctx);
  assert.strictEqual(ctx.datos.obtener('lotes', 'LOT-C').stock, 0);
  void doc;
});

prueba('los controlados solo los despacha el químico (o el administrador)', () => {
  const doc = { numero: 'B001-4', lineas: [{ item: 'PRD-2', cantidad: 2, precio: 23.6 }] };
  assert.throws(() => op('ventas').alEmitir(doc, ctxCon('cajero')), /solo los despacha el químico/);
  assert.throws(() => op('ventas').alEmitir(doc, crearCtx({ datos: BASE, usuario: null })), /solo los despacha el químico/);
  const q = ctxCon('quimico');
  op('ventas').alEmitir(doc, q);
  assert.strictEqual(q.datos.obtener('lotes', 'LOT-H').stock, 38);
  const a = ctxCon('admin');
  op('ventas').alEmitir(doc, a);
  assert.strictEqual(a.datos.obtener('productos', 'PRD-2').stock, 38);
});

prueba('anular una venta devuelve cada unidad a su lote y deja el rastro en el kardex', () => {
  const ctx = ctxCon('cajero');
  const doc = { numero: 'B001-00000005', lineas: [{ item: 'PRD-1', cantidad: 20, precio: 11.8 }] };
  op('ventas').alEmitir(doc, ctx);
  op('ventas').alAnular(doc, ctx);
  assert.strictEqual(ctx.datos.obtener('lotes', 'LOT-G').stock, 3);
  assert.strictEqual(ctx.datos.obtener('lotes', 'LOT-B').stock, 7);
  assert.strictEqual(ctx.datos.obtener('lotes', 'LOT-A').stock, 5);
  assert.strictEqual(ctx.datos.obtener('lotes', 'LOT-C').stock, 100);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-1').stock, 115);
  assert.strictEqual(ctx.col.movimientos.filter((m) => m.tipo === 'Anulación de venta').length, 4);
  assert.throws(() => op('ventas').alAnular({ numero: 'B001-NO-EXISTE', lineas: [] }, ctx), /No hay movimientos de lote/);
});

/* ---------- Compras ---------- */
const CMP = { fecha: '2026-10-31', proveedor: 'PRV-1', numero: 'OC01-00000012', lineas: [{ item: 'PRD-1', cantidad: 30, precio: 6.2, lote: 'NUEVO1', vencimiento: '2027-12-01' }, { item: 'PRD-3', cantidad: 10, precio: 8.4, vencimiento: '2027-12-01' }] };

prueba('totales de la compra: subtotal sin IGV, IGV del parámetro y total', () => {
  const ctx = ctxCon('almacen');
  /* 30 × 6,20 + 10 × 8,40 = 186 + 84 = 270 · IGV 48,60 · total 318,60 */
  const t = op('compras').calcular(CMP, ctx);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t)), { subtotal: 270, igv: 48.6, total: 318.6 });
  const t2 = op('compras').calcular({ lineas: [{ item: 'PRD-1', cantidad: 3, precio: 2.15 }] }, ctx);
  /* 6,45 · IGV 1,161 → 1,16 · total 7,61 */
  assert.strictEqual(t2.igv, 1.16);
  assert.strictEqual(t2.total, 7.61);
  assert.strictEqual(op('compras').calcular({ lineas: [] }, ctx).total, 0);
  assert.strictEqual(op('compras').calcular({ lineas: [{ item: 'PRD-1', cantidad: 1, precio: 10 }] }, crearCtx({ datos: BASE, parametros: { igv: 10 } })).igv, 1);
});

prueba('regla de vida útil mínima del lote recibido (180 días, bordes)', () => {
  const ctx = ctxCon('almacen');
  const f = regla(op('compras'), 'vida-util-minima');
  const d = (venc) => ({ fecha: '2026-10-31', lineas: [{ item: 'PRD-1', cantidad: 1, precio: 1, vencimiento: venc }] });
  assert.strictEqual(f(d('2027-04-29'), ctx), true, '180 días exactos');
  assert.strictEqual(f(d('2027-04-28'), ctx), false, '179 días');
  assert.strictEqual(f({ fecha: '2026-10-31', lineas: [{ item: 'PRD-1', cantidad: 1, precio: 1 }] }, ctx), true, 'sin fecha no se evalúa aquí');
});

prueba('recibir una compra crea un lote por línea, sube el stock y recalcula el costo promedio ponderado', () => {
  const ctx = ctxCon('almacen');
  op('compras').alEmitir(CMP, ctx);
  const lotes = ctx.col.lotes.filter((l) => l.id.indexOf('NUEVO') === 0);
  assert.strictEqual(lotes.length, 2);
  assert.strictEqual(lotes[0].numeroLote, 'NUEVO1');
  assert.strictEqual(lotes[0].stock, 30);
  assert.strictEqual(lotes[0].cantidadInicial, 30);
  assert.strictEqual(lotes[0].estado, 'Disponible');
  assert.strictEqual(lotes[1].numeroLote, 'INT-0012-2', 'sin código del proveedor se asigna uno interno');
  /* PRD-1: (115 × 5 + 30 × 6,20) / 145 = (575 + 186) / 145 = 5,2483 → 5,25 */
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-1').costo, 5.25);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-1').stock, 145);
  /* PRD-3: stock 0 → el costo pasa a ser el de la compra */
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-3').costo, 8.4);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-3').stock, 10);
  assert.strictEqual(ctx.col.movimientos.filter((m) => m.tipo === 'Entrada por compra').length, 2);
});

prueba('recibir sin fecha de vencimiento se rechaza', () => {
  const ctx = ctxCon('almacen');
  assert.throws(() => op('compras').alEmitir({ numero: 'OC01-1', lineas: [{ item: 'PRD-1', cantidad: 1, precio: 1 }] }, ctx), /Falta la fecha de vencimiento del lote de «Paracetamol»/);
});

prueba('anular una compra retira sus lotes si están intactos y se niega si ya se vendió parte', () => {
  const ctx = ctxCon('almacen');
  op('compras').alEmitir(CMP, ctx);
  op('compras').alAnular(CMP, ctx);
  const nuevo = ctx.col.lotes.filter((l) => l.numeroLote === 'NUEVO1')[0];
  assert.strictEqual(nuevo.estado, 'Retirado');
  assert.strictEqual(nuevo.stock, 0);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-1').stock, 115);
  assert.strictEqual(ctx.datos.obtener('productos', 'PRD-3').stock, 0);
  assert.strictEqual(ctx.col.movimientos.filter((m) => m.tipo === 'Anulación de compra').length, 2);
  /* nueva compra: se vende 1 del lote y ya no se puede anular */
  const c2 = ctxCon('almacen');
  op('compras').alEmitir(CMP, c2);
  const lote = c2.col.lotes.filter((l) => l.numeroLote === 'NUEVO1')[0];
  c2.datos.actualizar('lotes', lote.id, { stock: 29 });
  assert.throws(() => op('compras').alAnular(CMP, c2), /ya se vendió parte del lote «NUEVO1» \(quedan 29 de 30\)/);
  assert.strictEqual(c2.datos.obtener('productos', 'PRD-3').stock, 10, 'no se anuló nada de la segunda línea');
});

/* ---------- Reportes ---------- */
function ctxConVentas() {
  const ctx = ctxCon('admin');
  const mk = (id, fecha, cli, estado, lineas, extra) => {
    const d = Object.assign({ id, numero: 'B001-' + id, fecha, cliente: cli, estado, lineas }, extra || {});
    d.totales = op('ventas').calcular(d, ctx);
    return d;
  };
  ctx.col.ventas = [
    mk('V1', '2026-10-20', 'CLI-1', 'Emitida', VTA.lineas),
    mk('V2', '2026-10-25', 'CLI-3', 'Emitida', [{ item: 'PRD-3', cantidad: 2, precio: 17 }], { numeroReceta: 'RX-9', medico: 'Dr. Prueba' }),
    mk('V3', '2026-10-26', 'CLI-3', 'Anulada', [{ item: 'PRD-1', cantidad: 9, precio: 11.8 }]),
    mk('V4', '2026-10-27', 'CLI-3', 'Borrador', [{ item: 'PRD-1', cantidad: 9, precio: 11.8 }]),
    mk('V5', '2026-05-05', 'CLI-3', 'Emitida', [{ item: 'PRD-1', cantidad: 1, precio: 11.8 }])
  ];
  return ctx;
}

prueba('ventas por mes: solo emitidas, agrupadas por mes, con ticket promedio', () => {
  const ctx = ctxConVentas();
  const r = rep('ventas-mes').ejecutar({ desde: '2026-05-01', hasta: '2026-10-31' }, ctx);
  /* mayo: 1 venta de 11,80 · octubre: V1 68,44 + V2 34,00 = 102,44 en 2 ventas */
  assert.strictEqual(r.filas.length, 2);
  assert.strictEqual(r.filas[0][0], 'may 2026');
  assert.strictEqual(r.filas[0][6], 11.8);
  assert.strictEqual(r.filas[1][1], 2);
  assert.strictEqual(r.filas[1][2], 70.8 + 34);
  assert.strictEqual(r.filas[1][3], 2.36);
  assert.strictEqual(r.filas[1][6], 102.44);
  assert.strictEqual(r.resumen[0].valor, 114.24);
  assert.strictEqual(r.resumen[1].valor, 3);
  assert.strictEqual(r.resumen[2].valor, 38.08);
  assert.strictEqual(rep('ventas-mes').ejecutar({ desde: '2000-01-01', hasta: '2000-02-01' }, ctx).resumen[2].valor, 0, 'sin ventas el ticket es 0');
});

prueba('productos por vencer: rango, colores y valor al costo', () => {
  const ctx = ctxCon('cajero');
  const r = rep('por-vencer').ejecutar({ desde: '2026-09-01', hasta: '2026-12-31' }, ctx);
  /* con stock y sin retirar: G (vence hoy) 3 · A 5 · B 7 · E cuarentena 40 (Dic 1) · D vencido 50 ; F sin stock no sale */
  const lotes = r.filas.map((f) => f[1]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(lotes)), ['D', 'G', 'A', 'B', 'E']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r.filas.map((f) => f[4]))), ['Vencido', 'Rojo', 'Rojo', 'Rojo', 'Amarillo']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r.grafico.valores)), [50, 15, 40, 0]);
  /* 105 unidades × S/ 5 */
  assert.strictEqual(r.resumen[1].valor, 105);
  assert.strictEqual(r.resumen[2].valor, 525);
  assert.strictEqual(r.filas[0][3], -30, 'D venció el 1 de octubre');
  assert.strictEqual(rep('por-vencer').ejecutar({ desde: '2000-01-01', hasta: '2000-01-02' }, ctx).filas.length, 0);
});

prueba('stock por lote: recibido, stock, vendido y % vendido', () => {
  const ctx = ctxCon('almacen');
  const r = rep('stock-lote').ejecutar({ desde: '2026-01-01', hasta: '2026-12-31' }, ctx);
  const a = r.filas.filter((f) => f[1] === 'A')[0];
  /* A: recibido 10, stock 5, vendido 5, 50 % · valor 5 × 5 = 25 */
  assert.strictEqual(a[4], 10);
  assert.strictEqual(a[5], 5);
  assert.strictEqual(a[6], 5);
  assert.strictEqual(a[7], 50);
  assert.strictEqual(a[8], 25);
  assert.ok(!r.filas.some((f) => f[1] === 'B'), 'B ingresó en 2025: fuera del rango');
});

prueba('margen por categoría: venta neta sin IGV y con el descuento aplicado', () => {
  const ctx = ctxConVentas();
  const r = rep('margen-categoria').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  const por = (c) => r.filas.filter((f) => f[0] === c)[0];
  /* Cuidado personal: (47,20 − 2,36) / 1,18 = 38 · costo 20 · margen 18 · 47,37 % */
  assert.strictEqual(por('Cuidado personal')[2], 38);
  assert.strictEqual(por('Cuidado personal')[4], 18);
  cerca(por('Cuidado personal')[5], 47.37, '% margen');
  /* Controlado: sin descuento · 23,60 / 1,18 = 20 · costo 10 · 50 % */
  assert.strictEqual(por('Psicotrópicos y opioides')[2], 20);
  assert.strictEqual(por('Psicotrópicos y opioides')[5], 50);
  /* Antibióticos (cliente sin tarjeta): 2 × 17 = 34 / 1,18 = 28,81 · costo 16 */
  assert.strictEqual(por('Antibióticos')[2], 28.81);
  assert.strictEqual(por('Antibióticos')[3], 16);
  assert.strictEqual(r.filas.length, 3);
  assert.strictEqual(rep('margen-categoria').ejecutar({ desde: '2000-01-01', hasta: '2000-01-02' }, ctx).resumen[2].valor, 0, 'sin ventas no divide por cero');
});

prueba('ventas con receta: solo productos con receta o controlados, con el filtro de alcance', () => {
  const ctx = ctxConVentas();
  ctx.col.ventas[0].cmp = '45231';
  ctx.col.ventas[0].numeroReceta = 'RX-1';
  ctx.col.ventas[0].medico = 'Dr. Otro';
  const todos = rep('ventas-receta').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31', alcance: 'Todos los productos con receta' }, ctx);
  /* V1: clonazepam (controlado) 1 · V2: amoxicilina 2 · el paracetamol (venta libre) no sale */
  assert.strictEqual(todos.filas.length, 2);
  assert.strictEqual(todos.resumen[1].valor, 3);
  assert.strictEqual(todos.resumen[2].valor, 1);
  const solo = rep('ventas-receta').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31', alcance: 'Solo controlados' }, ctx);
  assert.strictEqual(solo.filas.length, 1);
  assert.strictEqual(solo.filas[0][3], 'Clonazepam');
  assert.strictEqual(solo.filas[0][8], '45231');
});

prueba('indicadores del tablero', () => {
  const ctx = ctxConVentas();
  const por = (t) => S.tablero.filter((x) => x.titulo.indexOf(t) === 0)[0].calcular(ctx);
  /* últimos 30 días (desde 2026-10-02): V1 68,44 + V2 34,00 */
  assert.strictEqual(por('Ventas de los últimos 30 días'), 102.44);
  assert.strictEqual(por('Ticket promedio'), 51.22);
  /* lotes con stock: vencido D · por vencer (≤ 90 d): G, A, B, E */
  assert.strictEqual(por('Lotes vencidos con stock'), 1);
  assert.strictEqual(por('Lotes por vencer'), 4);
  /* PRD-3: stock 0 ≤ 5 → bajo */
  assert.strictEqual(por('Productos con stock bajo'), 1);
  /* 205 + 40 = 245 unidades × costo... A5 B7 C100 D50 E40 G3 (costo 5) = 205 × 5 = 1025 · H 40 × 10 = 400 */
  assert.strictEqual(por('Valor del inventario'), 1425);
  const g = S.tableroGrafico.calcular(ctx);
  assert.strictEqual(g.etiquetas.length, 6);
  assert.strictEqual(g.valores[5], 102.44);
  assert.strictEqual(g.valores[0], 11.8, 'mayo');
});

prueba('las semillas cuadran: stock del producto = suma de sus lotes y cada venta tiene sus movimientos', () => {
  const sem = S.semillas;
  sem.productos.forEach((p) => {
    const s = sem.lotes.filter((l) => l.producto === p.id && l.estado !== 'Retirado').reduce((t, l) => t + l.stock, 0);
    assert.strictEqual(p.stock, s, 'stock de ' + p.codigo);
  });
  sem.lotes.forEach((l) => { assert.ok(l.stock >= 0 && l.stock <= l.cantidadInicial, 'lote ' + l.numeroLote); });
  /* lo que entró menos lo que salió (más lo anulado) es lo que queda en cada lote */
  sem.lotes.forEach((l) => {
    const m = sem.movimientos.filter((x) => x.lote === l.id);
    const neto = m.reduce((t, x) => t + (x.tipo === 'Salida por venta' ? -x.cantidad : (x.tipo === 'Anulación de venta' ? x.cantidad : 0)), 0);
    assert.strictEqual(l.stock, l.cantidadInicial + neto, 'kardex del lote ' + l.numeroLote);
  });
  sem.ventas.forEach((v) => {
    v.lineas.forEach((l) => {
      const p = sem.productos.filter((x) => x.id === l.item)[0];
      if (p.condicionVenta !== LIBRE) { assert.ok(v.numeroReceta && v.medico, 'receta de ' + v.id); }
      if (p.condicionVenta === CONTROLADO) { assert.ok(v.cmp, 'CMP de ' + v.id); assert.ok(l.cantidad <= 5, 'tope de ' + v.id); }
    });
  });
  /* las compras emitidas coinciden con los lotes que crearon */
  sem.compras.filter((c) => c.estado === 'Emitida').forEach((c) => {
    c.lineas.forEach((l) => { assert.ok(sem.lotes.some((x) => x.producto === l.item && x.numeroLote === l.lote && x.cantidadInicial === l.cantidad), 'lote de ' + c.id); });
  });
});

prueba('los movimientos sembrados llevan el número real de cada documento (numeración por fecha, un contador por operación)', () => {
  const sem = S.semillas;
  /* fecha sembrada '@-185' = hace 185 días: más días atrás = más antigua = número menor */
  const atras = (d) => -parseInt(d.fecha.slice(1), 10);
  const numerar = (docs, serie) => {
    const m = {};
    docs.filter((d) => d.estado !== 'Borrador').sort((a, b) => (atras(a) !== atras(b) ? atras(b) - atras(a) : (a.id < b.id ? -1 : 1))).forEach((d, i) => { m[d.id] = serie + '-' + ('00000000' + (i + 1)).slice(-8); });
    return m;
  };
  const nv = numerar(sem.ventas, 'B001'), nc = numerar(sem.compras, 'OC01');
  sem.ventas.filter((v) => v.estado !== 'Borrador').forEach((v) => {
    const salidas = sem.movimientos.filter((m) => m.documento === nv[v.id] && m.tipo === 'Salida por venta');
    assert.strictEqual(salidas.reduce((t, m) => t + m.cantidad, 0), v.lineas.reduce((t, l) => t + l.cantidad, 0), 'unidades de ' + v.id);
  });
  sem.compras.filter((c) => c.estado !== 'Borrador').forEach((c) => {
    const entradas = sem.movimientos.filter((m) => m.documento === nc[c.id] && m.tipo === 'Entrada por compra');
    assert.strictEqual(entradas.reduce((t, m) => t + m.cantidad, 0), c.lineas.reduce((t, l) => t + l.cantidad, 0), 'unidades de ' + c.id);
  });
  sem.movimientos.forEach((m) => { assert.ok(/^(B001|OC01)-\d{8}$/.test(m.documento), 'documento ' + m.id); });
});

console.log(`\n${n} pruebas de fórmulas correctas.`);
