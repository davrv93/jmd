#!/usr/bin/env node
/*
 * formulas.test.mjs · Prueba de las fórmulas de «papeleria» SIN navegador
 * ----------------------------------------------------------------------------
 *   node sistemas/papeleria/formulas.test.mjs
 * Carga config.js en node:vm con un `window` falso, arma un `ctx` mínimo (param,
 * redondear, suma, fechas, datos en memoria) y verifica con resultados calculados
 * a mano cada fórmula propia del rubro: descuento por volumen, margen por
 * categoría, punto de reposición, compra sugerida, combos, ABC y reglas.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const HOY = '2026-10-31';

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

/* ============================ Descuento por volumen ============================ */
console.log('Descuento escalonado por volumen (ventas.calcular)');
const ventas = operacion('ventas');
const venta1 = (cant, precio, extra) => Object.assign({ lineas: [{ item: 'X', cantidad: cant, precio }] }, extra || {});

prueba('11 unidades: sin descuento (justo debajo del 1.er tramo)', () => {
  const t = ventas.calcular(venta1(11, 10), crearCtx());
  assert.equal(t.bruto, 110); assert.equal(t.descuento, 0); assert.equal(t.subtotal, 110);
  assert.equal(t.igv, 19.8); assert.equal(t.total, 129.8);
});
prueba('12 unidades: 3 % (límite inferior del 1.er tramo)', () => {
  const t = ventas.calcular(venta1(12, 10), crearCtx());
  assert.equal(t.bruto, 120); assert.equal(t.descuento, 3.6); assert.equal(t.subtotal, 116.4);
  assert.equal(t.igv, 20.95); assert.equal(t.total, 137.35);
});
prueba('47 y 48 unidades: 3 % y 7 % (límite del 2.º tramo)', () => {
  const a = ventas.calcular(venta1(47, 2), crearCtx());
  assert.equal(a.descuento, 2.82); assert.equal(a.subtotal, 91.18);
  const b = ventas.calcular(venta1(48, 2), crearCtx());
  assert.equal(b.descuento, 6.72); assert.equal(b.subtotal, 89.28); assert.equal(b.igv, 16.07); assert.equal(b.total, 105.35);
});
prueba('119 y 120 unidades: 7 % y 12 % (límite del 3.er tramo)', () => {
  const a = ventas.calcular(venta1(119, 1), crearCtx());
  assert.equal(a.descuento, 8.33); assert.equal(a.subtotal, 110.67);
  const b = ventas.calcular(venta1(120, 1), crearCtx());
  assert.equal(b.descuento, 14.4); assert.equal(b.subtotal, 105.6); assert.equal(b.igv, 19.01); assert.equal(b.total, 124.61);
});
prueba('el descuento se decide línea por línea, no por el total del documento', () => {
  const d = { lineas: [{ item: 'A', cantidad: 100, precio: 1 }, { item: 'B', cantidad: 100, precio: 1 }] };
  const t = ventas.calcular(d, crearCtx());
  assert.equal(t.bruto, 200); assert.equal(t.descuento, 14); assert.equal(t.subtotal, 186);
});
prueba('lineas.importe aplica el mismo descuento que los totales', () => {
  const ctx = crearCtx();
  assert.equal(redondear(ventas.lineas.importe({ cantidad: 120, precio: 1 }, ctx)), 105.6);
  assert.equal(redondear(ventas.lineas.importe({ cantidad: 5, precio: 1.2 }, ctx)), 6);
});
prueba('si el administrador cambia los tramos en Configuración, el cálculo los sigue', () => {
  const ctx = crearCtx({ params: { tramo1: 20, dto1: 5 } });
  assert.equal(ventas.calcular(venta1(12, 10), ctx).descuento, 0);
  assert.equal(ventas.calcular(venta1(20, 10), ctx).descuento, 10);
});
prueba('IGV de la venta sale del parámetro', () => {
  const t = ventas.calcular(venta1(1, 100), crearCtx({ params: { igv: 10 } }));
  assert.equal(t.igv, 10); assert.equal(t.total, 110);
});
prueba('documento sin líneas: todo en cero y sin NaN', () => {
  const t = ventas.calcular({ lineas: [] }, crearCtx());
  igual(t, { bruto: 0, descuento: 0, subtotal: 0, igv: 0, total: 0, costoVenta: 0 });
});
prueba('costo de la venta = costo del producto × cantidad (para la utilidad)', () => {
  const ctx = crearCtx({ datos: { productos: [{ id: 'X', costo: 0.7, precio: 1.2 }] } });
  assert.equal(ventas.calcular(venta1(10, 1.2), ctx).costoVenta, 7);
});

/* ============================ Combos ============================ */
console.log('Combos y kits');
const productosFix = [
  { id: 'P1', precio: 6.5, costo: 4.2 }, { id: 'P2', precio: 0.9, costo: 0.5 }, { id: 'P3', precio: 7.5, costo: 4.8 }
];
const combo1 = { id: 'C1', producto1: 'P1', cantidad1: 4, producto2: 'P2', cantidad2: 6, producto3: 'P3', cantidad3: 1, precio: 35.9 };
prueba('precio de los productos sueltos, ahorro y margen del combo', () => {
  const ctx = crearCtx({ datos: { productos: productosFix } });
  assert.equal(calculado('combos', 'precioSueltos')(combo1, ctx), 38.9);
  assert.equal(calculado('combos', 'ahorroPct')(combo1, ctx), 7.71);
  assert.equal(calculado('combos', 'margenCombo')(combo1, ctx), 31.48);
});
prueba('combo de dos productos (el 3.º es opcional)', () => {
  const ctx = crearCtx({ datos: { productos: productosFix } });
  const c = { producto1: 'P1', cantidad1: 2, producto2: 'P3', cantidad2: 2, precio: 25 };
  assert.equal(calculado('combos', 'precioSueltos')(c, ctx), 28);
  assert.equal(calculado('combos', 'ahorroPct')(c, ctx), 10.71);
});
prueba('combo con precio cero o sin componentes: margen y ahorro nulos, sin error', () => {
  const ctx = crearCtx({ datos: { productos: productosFix } });
  assert.equal(calculado('combos', 'margenCombo')({ precio: 0 }, ctx), null);
  assert.equal(calculado('combos', 'ahorroPct')({ precio: 10 }, ctx), null);
});
prueba('regla: el combo no puede costar menos que sus componentes', () => {
  const ctx = crearCtx({ datos: { productos: productosFix } });
  const r = regla(entidad('combos'), 'combo-no-bajo-costo');
  assert.equal(r(combo1, ctx), true);
  assert.equal(r(Object.assign({}, combo1, { precio: 24.6 }), ctx), true, 'justo en el costo (4×4.2 + 6×0.5 + 4.8 = 24.6)');
  assert.equal(r(Object.assign({}, combo1, { precio: 24.59 }), ctx), false);
});
prueba('la venta de combos suma su precio sin descuento por volumen y descuenta cada componente', () => {
  const ctx = crearCtx({ datos: { productos: productosFix, combos: [combo1] } });
  const d = { combo: 'C1', combosCantidad: 20, lineas: [{ item: 'P1', cantidad: 1, precio: 6.5 }] };
  const t = ventas.calcular(d, ctx);
  assert.equal(t.bruto, 724.5); assert.equal(t.descuento, 0); assert.equal(t.subtotal, 724.5);
  assert.equal(t.costoVenta, 20 * 24.6 + 4.2);
});

/* ============================ Margen por categoría ============================ */
console.log('Margen por categoría');
const catFix = [{ id: 'CAT-A', margenObjetivo: 28 }, { id: 'CAT-B', margenObjetivo: 20 }];
prueba('margen sobre el precio y brecha frente al objetivo de la categoría', () => {
  const ctx = crearCtx({ datos: { categorias: catFix } });
  const p = { precio: 16.5, costo: 12.4, categoria: 'CAT-A' };
  assert.equal(calculado('productos', 'margen')(p, ctx), 24.85);
  assert.equal(calculado('productos', 'estadoMargen')(p, ctx), 'Bajo el objetivo (-3.15 pts)');
  assert.equal(calculado('productos', 'estadoMargen')(Object.assign({}, p, { categoria: 'CAT-B' }), ctx), 'En el objetivo');
});
prueba('margen exactamente igual al objetivo cuenta como «en el objetivo»', () => {
  const ctx = crearCtx({ datos: { categorias: [{ id: 'CAT-A', margenObjetivo: 25 }] } });
  assert.equal(calculado('productos', 'estadoMargen')({ precio: 100, costo: 75, categoria: 'CAT-A' }, ctx), 'En el objetivo');
});
prueba('precio cero: sin margen y sin error de división', () => {
  const ctx = crearCtx({ datos: { categorias: catFix } });
  assert.equal(calculado('productos', 'margen')({ precio: 0, costo: 5 }, ctx), null);
  assert.equal(calculado('productos', 'estadoMargen')({ precio: 0, costo: 5, categoria: 'CAT-A' }, ctx), 'Sin datos');
});
prueba('regla: el precio no puede ser menor al costo (igual sí) y el máximo no menor al de seguridad', () => {
  const pe = entidad('productos');
  assert.equal(regla(pe, 'precio-coherente')({ precio: 5, costo: 5 }), true);
  assert.equal(regla(pe, 'precio-coherente')({ precio: 4.99, costo: 5 }), false);
  assert.equal(regla(pe, 'maximo-coherente')({ stockMin: 10, stockMax: 10 }), true);
  assert.equal(regla(pe, 'maximo-coherente')({ stockMin: 10, stockMax: 9 }), false);
});

/* ============================ Reposición ============================ */
console.log('Punto de reposición y compra sugerida');
function datosRepos(unidadesPorDia, extra) {
  /* una venta emitida por día en los últimos `dias` días con `unidadesPorDia` unidades del producto P */
  const dias = 90, ventasFix = [], c = crearCtx();
  for (let i = 0; i < dias; i++) { ventasFix.push({ id: 'V' + i, estado: 'Emitida', fecha: c.fechaMas(HOY, -i), lineas: [{ item: 'P', cantidad: unidadesPorDia, precio: 1 }] }); }
  return Object.assign({ ventas: ventasFix, proveedores: [{ id: 'PV', diasEntrega: 4 }], combos: [] }, extra || {});
}
const prodRepos = (o) => Object.assign({ id: 'P', proveedor: 'PV', stock: 20, stockMin: 10, stockMax: 100, multiploCompra: 1, activo: true }, o || {});
prueba('demanda de 1 u. por día y 4 días de entrega: punto = 4 + stock de seguridad 10 = 14', () => {
  const ctx = crearCtx({ datos: datosRepos(1) });
  assert.equal(calculado('productos', 'demandaDiaria')(prodRepos(), ctx), 1);
  assert.equal(calculado('productos', 'puntoReposicion')(prodRepos(), ctx), 14);
});
prueba('el punto se redondea hacia arriba: 2.25 u./día × 4 días = 9 → 19', () => {
  /* 9 unidades cada 4 días ≈ no entero por día: usamos 90 días con 202.5 → armamos 45 ventas de 4.5 */
  const c = crearCtx(), vs = [];
  for (let i = 0; i < 45; i++) { vs.push({ id: 'V' + i, estado: 'Emitida', fecha: c.fechaMas(HOY, -i), lineas: [{ item: 'P', cantidad: 4.5, precio: 1 }] }); }
  const ctx = crearCtx({ datos: { ventas: vs, proveedores: [{ id: 'PV', diasEntrega: 4 }] } });
  assert.equal(calculado('productos', 'demandaDiaria')(prodRepos(), ctx), 2.25);
  assert.equal(calculado('productos', 'puntoReposicion')(prodRepos(), ctx), 19);
  const ctx2 = crearCtx({ datos: { ventas: vs, proveedores: [{ id: 'PV', diasEntrega: 3 }] } });
  assert.equal(calculado('productos', 'puntoReposicion')(prodRepos(), ctx2), 17, '6.75 sube a 7; 7 + 10');
});
prueba('sin error de coma flotante: 30 u. en 90 días × 9 días de entrega = 3 exactos (no 4)', () => {
  const c = crearCtx(), vs = [{ id: 'V', estado: 'Emitida', fecha: HOY, lineas: [{ item: 'P', cantidad: 30, precio: 1 }] }];
  const ctx = crearCtx({ datos: { ventas: vs, proveedores: [{ id: 'PV', diasEntrega: 9 }] } });
  assert.equal(calculado('productos', 'puntoReposicion')(prodRepos({ stockMin: 0 }), ctx), 3);
  assert.ok(c);
});
prueba('sin proveedor o sin ventas: el punto es solo el stock de seguridad', () => {
  const ctx = crearCtx({ datos: { ventas: [], proveedores: [] } });
  assert.equal(calculado('productos', 'puntoReposicion')(prodRepos({ proveedor: undefined }), ctx), 10);
  assert.equal(calculado('productos', 'demandaDiaria')(prodRepos(), ctx), 0);
});
prueba('la ventana de 90 días incluye hoy−89 y excluye hoy−90', () => {
  const c = crearCtx();
  const vs = [
    { id: 'A', estado: 'Emitida', fecha: c.fechaMas(HOY, -89), lineas: [{ item: 'P', cantidad: 90, precio: 1 }] },
    { id: 'B', estado: 'Emitida', fecha: c.fechaMas(HOY, -90), lineas: [{ item: 'P', cantidad: 900, precio: 1 }] },
    { id: 'C', estado: 'Anulada', fecha: HOY, lineas: [{ item: 'P', cantidad: 900, precio: 1 }] },
    { id: 'D', estado: 'Borrador', fecha: HOY, lineas: [{ item: 'P', cantidad: 900, precio: 1 }] }
  ];
  const ctx = crearCtx({ datos: { ventas: vs, proveedores: [] } });
  assert.equal(calculado('productos', 'demandaDiaria')(prodRepos(), ctx), 1);
});
prueba('los componentes de los combos vendidos también cuentan como demanda', () => {
  const vs = [{ id: 'A', estado: 'Emitida', fecha: HOY, combo: 'C1', combosCantidad: 10, lineas: [{ item: 'Q', cantidad: 1, precio: 1 }] }];
  const combos = [{ id: 'C1', producto1: 'P', cantidad1: 9, producto2: 'Q', cantidad2: 1 }];
  const ctx = crearCtx({ datos: { ventas: vs, combos, proveedores: [] } });
  assert.equal(calculado('productos', 'demandaDiaria')(prodRepos(), ctx), 1, '90 u. de P en 90 días');
});
prueba('compra sugerida: stock en el punto (14) → llega al máximo 100: 86 u.', () => {
  const ctx = crearCtx({ datos: datosRepos(1) });
  assert.equal(calculado('productos', 'compraSugerida')(prodRepos({ stock: 14 }), ctx), 86);
});
prueba('compra sugerida: un poco sobre el punto (15) → no se compra', () => {
  const ctx = crearCtx({ datos: datosRepos(1) });
  assert.equal(calculado('productos', 'compraSugerida')(prodRepos({ stock: 15 }), ctx), 0);
});
prueba('compra sugerida en múltiplos: faltan 86 y se vende de a 12 → 96; faltan 84 → 84', () => {
  const ctx = crearCtx({ datos: datosRepos(1) });
  assert.equal(calculado('productos', 'compraSugerida')(prodRepos({ stock: 14, multiploCompra: 12 }), ctx), 96);
  assert.equal(calculado('productos', 'compraSugerida')(prodRepos({ stock: 14, stockMax: 98, multiploCompra: 12 }), ctx), 84);
});
prueba('compra sugerida: stock agotado pide el máximo; stock ≥ máximo pide cero; inactivo pide cero', () => {
  const ctx = crearCtx({ datos: datosRepos(1) });
  assert.equal(calculado('productos', 'compraSugerida')(prodRepos({ stock: 0 }), ctx), 100);
  assert.equal(calculado('productos', 'compraSugerida')(prodRepos({ stock: 100, stockMin: 200 }), ctx), 0);
  assert.equal(calculado('productos', 'compraSugerida')(prodRepos({ stock: 0, activo: false }), ctx), 0);
});
prueba('situación: Agotado, Reponer y Normal', () => {
  const ctx = crearCtx({ datos: datosRepos(1) });
  const f = calculado('productos', 'situacion');
  assert.equal(f(prodRepos({ stock: 0 }), ctx), 'Agotado');
  assert.equal(f(prodRepos({ stock: 14 }), ctx), 'Reponer');
  assert.equal(f(prodRepos({ stock: 15 }), ctx), 'Normal');
});
prueba('si cambia la ventana de demanda en Configuración, cambia la demanda', () => {
  const ctx = crearCtx({ datos: datosRepos(1), params: { ventanaDemanda: 30 } });
  assert.equal(calculado('productos', 'demandaDiaria')(prodRepos(), ctx), 1);
  const ctx0 = crearCtx({ datos: datosRepos(1), params: { ventanaDemanda: 0 } });
  assert.equal(calculado('productos', 'demandaDiaria')(prodRepos(), ctx0), 1, 'una ventana en 0 se trata como 1 día (sin dividir entre cero)');
});

/* ============================ Reglas y efectos de las ventas ============================ */
console.log('Reglas y efectos de ventas y compras');
const cliFix = [
  { id: 'E1', tipo: 'Empresa', limiteCredito: 1000, nombre: 'Empresa Uno' },
  { id: 'E2', tipo: 'Empresa', limiteCredito: 0, nombre: 'Empresa Dos' },
  { id: 'P1', tipo: 'Persona', limiteCredito: 500, nombre: 'Persona Uno' }
];
prueba('reglas de pedido corporativo: orden de compra, solo empresas y no en caja', () => {
  const ctx = crearCtx({ datos: { clientes: cliFix }, usuario: { rol: 'gerente' } });
  const co = 'Pedido corporativo', mo = 'Venta de mostrador';
  assert.equal(regla(ventas, 'corporativo-con-orden')({ tipoVenta: co }, ctx), false);
  assert.equal(regla(ventas, 'corporativo-con-orden')({ tipoVenta: co, ordenCompra: 'OC-1' }, ctx), true);
  assert.equal(regla(ventas, 'corporativo-con-orden')({ tipoVenta: mo }, ctx), true);
  assert.equal(regla(ventas, 'corporativo-empresa')({ tipoVenta: co, cliente: 'P1' }, ctx), false);
  assert.equal(regla(ventas, 'corporativo-empresa')({ tipoVenta: co, cliente: 'E1' }, ctx), true);
  assert.equal(regla(ventas, 'corporativo-con-gerencia')({ tipoVenta: co }, ctx), true);
  const caja = crearCtx({ usuario: { rol: 'cajero' } });
  assert.equal(regla(ventas, 'corporativo-con-gerencia')({ tipoVenta: co }, caja), false);
  assert.equal(regla(ventas, 'corporativo-con-gerencia')({ tipoVenta: mo }, caja), true);
});
prueba('regla de crédito: solo corporativo y con línea de crédito', () => {
  const ctx = crearCtx({ datos: { clientes: cliFix } });
  const r = regla(ventas, 'credito-con-linea');
  assert.equal(r({ formaPago: 'Efectivo', cliente: 'E2', tipoVenta: 'Venta de mostrador' }, ctx), true);
  assert.equal(r({ formaPago: 'Crédito 30 días', cliente: 'E1', tipoVenta: 'Pedido corporativo' }, ctx), true);
  assert.equal(r({ formaPago: 'Crédito 30 días', cliente: 'E2', tipoVenta: 'Pedido corporativo' }, ctx), false, 'línea en cero');
  assert.equal(r({ formaPago: 'Crédito 30 días', cliente: 'E1', tipoVenta: 'Venta de mostrador' }, ctx), false, 'en mostrador no hay crédito');
});
prueba('regla de combos: cantidad sin combo es inválida', () => {
  const r = regla(ventas, 'combo-y-cantidad');
  assert.equal(r({ combosCantidad: 2 }), false);
  assert.equal(r({ combosCantidad: 2, combo: 'C1' }), true);
  assert.equal(r({ combosCantidad: 0 }), true);
});
function ctxVenta(stock, extra) {
  return crearCtx({
    datos: Object.assign({
      productos: [{ id: 'P1', nombre: 'Lapicero', stock, costo: 1, precio: 2 }, { id: 'P2', nombre: 'Folder', stock: 50, costo: 1, precio: 2 }],
      combos: [{ id: 'C1', producto1: 'P1', cantidad1: 3, producto2: 'P2', cantidad2: 1 }],
      clientes: [{ id: 'E1', nombre: 'Empresa Uno', tipo: 'Empresa', limiteCredito: 1000 }],
      ventas: []
    }, extra || {})
  });
}
prueba('alEmitir descuenta líneas y componentes de combos; alAnular lo devuelve', () => {
  const ctx = ctxVenta(100);
  const doc = { id: 'V1', estado: 'Emitida', formaPago: 'Efectivo', combo: 'C1', combosCantidad: 4, lineas: [{ item: 'P1', cantidad: 5, precio: 2 }] };
  ventas.alEmitir(doc, ctx);
  assert.equal(ctx.datos.obtener('productos', 'P1').stock, 100 - 5 - 12);
  assert.equal(ctx.datos.obtener('productos', 'P2').stock, 46);
  ventas.alAnular(doc, ctx);
  assert.equal(ctx.datos.obtener('productos', 'P1').stock, 100);
  assert.equal(ctx.datos.obtener('productos', 'P2').stock, 50);
});
prueba('alEmitir rechaza si el stock no alcanza (sumando línea + combo) y no toca nada', () => {
  const ctx = ctxVenta(16);
  const doc = { id: 'V1', estado: 'Emitida', formaPago: 'Efectivo', combo: 'C1', combosCantidad: 4, lineas: [{ item: 'P1', cantidad: 5, precio: 2 }] };
  assert.throws(() => ventas.alEmitir(doc, ctx), /Stock insuficiente de «Lapicero»: hay 16 y se necesitan 17/);
  assert.equal(ctx.calls.length, 0);
  const ok = ctxVenta(17);
  ventas.alEmitir(doc, ok);
  assert.equal(ok.datos.obtener('productos', 'P1').stock, 0, 'justo al límite pasa');
});
prueba('alEmitir a crédito: exposición de 30 días contra la línea de crédito', () => {
  const previas = [{ id: 'V0', cliente: 'E1', estado: 'Emitida', formaPago: 'Crédito 30 días', fecha: '2026-10-10', totales: { total: 700 } },
    { id: 'V00', cliente: 'E1', estado: 'Emitida', formaPago: 'Crédito 30 días', fecha: '2026-09-20', totales: { total: 9999 } }];
  const doc = { id: 'V1', cliente: 'E1', estado: 'Emitida', formaPago: 'Crédito 30 días', fecha: HOY, totales: { total: 300 }, lineas: [{ item: 'P2', cantidad: 1, precio: 2 }] };
  const dentro = ctxVenta(10, { ventas: previas.concat([doc]) });
  ventas.alEmitir(doc, dentro);
  const fuera = ctxVenta(10, { ventas: previas.concat([Object.assign({}, doc, { totales: { total: 300.01 } })]) });
  assert.throws(() => ventas.alEmitir(doc, fuera), /supera la línea de crédito de Empresa Uno/);
});
const compras = operacion('compras');
prueba('compras: subtotal, IGV y total', () => {
  const t = compras.calcular({ lineas: [{ item: 'X', cantidad: 100, precio: 12.4 }, { item: 'Y', cantidad: 10, precio: 30.5 }] }, crearCtx());
  assert.equal(t.subtotal, 1545); assert.equal(t.igv, 278.1); assert.equal(t.total, 1823.1);
  igual(compras.calcular({ lineas: [] }, crearCtx()), { subtotal: 0, igv: 0, total: 0 });
});
prueba('compras: al emitir sube el stock y el producto queda con el último costo; al anular baja el stock', () => {
  const ctx = crearCtx({ datos: { productos: [{ id: 'X', nombre: 'Resma', stock: 10, costo: 12.4 }] } });
  const doc = { lineas: [{ item: 'X', cantidad: 100, precio: 12.6 }] };
  compras.alEmitir(doc, ctx);
  assert.equal(ctx.datos.obtener('productos', 'X').stock, 110);
  assert.equal(ctx.datos.obtener('productos', 'X').costo, 12.6);
  compras.alAnular(doc, ctx);
  assert.equal(ctx.datos.obtener('productos', 'X').stock, 10);
});
prueba('compras: no se puede anular si ya se vendió parte de lo comprado', () => {
  const ctx = crearCtx({ datos: { productos: [{ id: 'X', nombre: 'Resma', stock: 99, costo: 12.4 }] } });
  assert.throws(() => compras.alAnular({ lineas: [{ item: 'X', cantidad: 100, precio: 12.6 }] }, ctx), /No se puede anular/);
  assert.equal(ctx.calls.length, 0);
});

/* ============================ Reportes ============================ */
console.log('Reportes sobre las semillas');
const ctxS = ctxSemillas();
const rango = { desde: ctxS.fechaMas(HOY, -190), hasta: HOY };
prueba('las semillas son coherentes: ventas con total > 0, fechas no futuras, stock no negativo', () => {
  ctxS.datos.listar('ventas').forEach((v) => { assert.ok(v.fecha <= HOY, v.id + ' en el futuro'); assert.ok(v.totales.total > 0, v.id + ' sin total'); assert.ok(isFinite(v.totales.total)); });
  ctxS.datos.listar('compras').forEach((v) => { assert.ok(v.fecha <= HOY); assert.ok(v.totales.total > 0); });
  ctxS.datos.listar('productos').forEach((p) => { assert.ok(p.stock >= 0); assert.ok(p.precio >= p.costo, p.id); });
});
prueba('ventas por mes: el total del reporte = suma de los totales de las ventas emitidas', () => {
  const r = reporte('ventas-mes').ejecutar(rango, ctxS);
  const esperado = redondear(ctxS.datos.listar('ventas', (v) => v.estado === 'Emitida').reduce((t, v) => t + v.totales.total, 0));
  assert.equal(r.resumen[0].valor, esperado);
  assert.equal(r.filas.length, r.grafico.etiquetas.length);
  r.filas.forEach((f) => assert.equal(redondear(f[2] + f[3]), f[5], 'mostrador + corporativo = total'));
});
prueba('utilidad por categoría: ingreso − costo = utilidad y el margen global es coherente', () => {
  const r = reporte('utilidad-categoria').ejecutar(rango, ctxS);
  r.filas.forEach((f) => { assert.equal(redondear(f[2] - f[3]), f[4]); assert.ok(f[5] > 0 && f[5] < 100, f[0]); });
  assert.ok(r.filas.some((f) => f[0] === 'Combos y kits'));
  const ing = r.filas.reduce((t, f) => t + f[2], 0);
  assert.ok(Math.abs(r.resumen[0].valor - ing) < 0.05, 'el resumen suma lo mismo que las filas (salvo redondeo)');
});
prueba('ABC: el acumulado llega a 100 %, el 1.º es clase A y las clases no se saltan', () => {
  const r = reporte('abc').ejecutar(rango, ctxS);
  assert.equal(r.filas[0][6], 'A');
  assert.ok(Math.abs(r.filas[r.filas.length - 1][5] - 100) < 0.05);
  const orden = r.filas.map((f) => f[6]).join('');
  assert.ok(/^A+B*C*$/.test(orden), orden);
});
prueba('ABC: el producto que cruza el corte del 80 % sigue en la clase A; el siguiente es B', () => {
  /* tres productos con 78 %, 18 % y 4 % del ingreso, ya ordenados: acumulados 78, 96 y 100 */
  const c = crearCtx({ datos: { productos: [{ id: 'A' }, { id: 'B' }, { id: 'C' }], ventas: [{ id: 'V', estado: 'Emitida', fecha: HOY, lineas: [{ item: 'A', cantidad: 1, precio: 78 }, { item: 'B', cantidad: 1, precio: 4 }, { item: 'C', cantidad: 1, precio: 18 }] }] } });
  const r = reporte('abc').ejecutar({ desde: '2026-01-01', hasta: HOY }, c);
  assert.equal(r.filas.map((f) => f[6]).join(''), 'AAC', 'A=78 (antes 0 → A), C=18 (antes 78 → A), B=4 (antes 96 → C)');
});
prueba('ABC: los cortes salen de Configuración (80 % / 95 %)', () => {
  const datos = { productos: [{ id: 'A' }, { id: 'B' }, { id: 'C' }], ventas: [{ id: 'V', estado: 'Emitida', fecha: HOY, lineas: [{ item: 'A', cantidad: 1, precio: 80 }, { item: 'B', cantidad: 1, precio: 15 }, { item: 'C', cantidad: 1, precio: 5 }] }] };
  const r = reporte('abc').ejecutar({ desde: '2026-01-01', hasta: HOY }, crearCtx({ datos }));
  assert.equal(r.filas.map((f) => f[6]).join(''), 'ABC', 'antes de B = 80 (no < 80 → B); antes de C = 95 (no < 95 → C)');
  const r2 = reporte('abc').ejecutar({ desde: '2026-01-01', hasta: HOY }, crearCtx({ datos, params: { corteA: 90, corteB: 99 } }));
  assert.equal(r2.filas.map((f) => f[6]).join(''), 'AAB');
});
prueba('ABC sin ventas: sin filas y sin NaN', () => {
  const r = reporte('abc').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctxS);
  assert.equal(r.filas.length, 0);
});
prueba('productos a reponer (semillas): hay filas, la compra respeta el múltiplo y la inversión suma', () => {
  const r = reporte('reponer').ejecutar({ desde: ctxS.fechaMas(HOY, -89), hasta: HOY }, ctxS);
  assert.ok(r.filas.length >= 3, 'filas: ' + r.filas.length);
  r.filas.forEach((f) => {
    const p = ctxS.datos.listar('productos', (x) => x.codigo === f[0])[0];
    assert.equal(f[7] % p.multiploCompra, 0, f[0]);
    assert.ok(f[3] <= f[6], f[0] + ' debería estar en o bajo el punto');
  });
  assert.equal(r.resumen[0].valor, r.filas.length);
});
prueba('ventas por cliente corporativo: solo pedidos corporativos emitidos, ordenados de mayor a menor', () => {
  const r = reporte('ventas-corporativas').ejecutar(rango, ctxS);
  assert.ok(r.filas.length >= 5);
  for (let i = 1; i < r.filas.length; i++) { assert.ok(r.filas[i - 1][4] >= r.filas[i][4]); }
  assert.equal(r.resumen[2].valor, ctxS.datos.listar('ventas', (v) => v.tipoVenta === 'Pedido corporativo' && v.estado === 'Emitida').length);
});
prueba('tablero: ningún indicador da NaN ni lanza error', () => {
  CFG.tablero.forEach((t) => { const v = t.calcular(ctxS); assert.ok(v === null || (typeof v === 'number' && isFinite(v)), t.titulo + ' → ' + v); });
  const g = CFG.tableroGrafico.calcular(ctxS);
  assert.equal(g.etiquetas.length, 6); assert.equal(g.valores.length, 6);
});

console.log('\n' + n + ' pruebas correctas' + (process.exitCode ? ' · HAY FALLOS' : ''));
