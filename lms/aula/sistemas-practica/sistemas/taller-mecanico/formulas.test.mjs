/*
 * Prueba de las fórmulas de «taller-mecanico» SIN navegador.
 *   node sistemas/taller-mecanico/formulas.test.mjs
 * Carga config.js en un contexto aislado (node:vm) con un window falso, arma un ctx de
 * pruebas (parámetros, redondeo, suma, un almacén de datos en memoria) y compara con
 * resultados calculados a mano.
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
const op = (id) => SIS.operaciones.filter((o) => o.id === id)[0];
const ent = (id) => SIS.entidades.filter((e) => e.id === id)[0];
const cal = (e, id) => ent(e).calculados.filter((c) => c.id === id)[0].formula;
const rep = (id) => SIS.reportes.filter((r) => r.id === id)[0];
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, (msg || '') + ' esperado ' + b + ', salió ' + a);

/* ---------- datos mínimos ---------- */
function base() {
  return {
    clientes: [{ id: 'CLI-1', nombre: 'Ana', telefono: '999' }, { id: 'CLI-2', nombre: 'Beto' }],
    vehiculos: [
      { id: 'VEH-1', placa: 'AAA-111', cliente: 'CLI-1', marca: 'Toyota', modelo: 'Hilux', kmActual: 90000, intervaloKm: 10000, ultimoMantKm: 80000 },
      { id: 'VEH-2', placa: 'BBB-222', cliente: 'CLI-2', marca: 'Kia', modelo: 'Rio', kmActual: 10000, intervaloKm: 5000, ultimoMantKm: 0 }
    ],
    servicios: [
      { id: 'S1', nombre: 'Aceite', tipo: 'Mantenimiento', tiempoEstandar: 0.8, reiniciaMant: true },
      { id: 'S2', nombre: 'Frenos', tipo: 'Frenos', tiempoEstandar: 1.25, reiniciaMant: false }
    ],
    mecanicos: [
      { id: 'M1', nombre: 'Maestro', categoria: 'Maestro', tarifaHora: 80, comisionPct: 8, activo: true },
      { id: 'M2', nombre: 'Inactivo', categoria: 'Oficial', tarifaHora: 60, comisionPct: 6, activo: false }
    ],
    repuestos: [
      { id: 'R1', codigo: 'R1', nombre: 'Filtro', categoria: 'Filtros', costo: 10, precio: 20, stock: 5, stockMin: 2, activo: true },
      { id: 'R2', codigo: 'R2', nombre: 'Pastillas', categoria: 'Frenos', costo: 100, precio: 130, stock: 1, stockMin: 2, activo: true }
    ],
    ordenes: [],
    compras: []
  };
}
const lineas = (...x) => x.map((p) => ({ item: p[0], cantidad: p[1], precio: p[2] }));

let n = 0;
function prueba(nombre, fn) { fn(); n++; console.log('  ok  ' + nombre); }

/* ================= Orden de trabajo: calcular ================= */
const OT = op('ordenes');

prueba('OT sencilla: 0.8 h × S/ 80 + repuestos, IGV 18 %, comisión 8 % y margen', () => {
  const t = OT.calcular({ servicio: 'S1', mecanico: 'M1', urgente: false, lineas: lineas(['R1', 3, 20]) }, crearCtx(base()));
  cerca(t.manoObra, 64, 'mano de obra');      // 0.8 × 80
  cerca(t.recargo, 0, 'recargo');
  cerca(t.repuestos, 60, 'repuestos');        // 3 × 20
  cerca(t.subtotal, 124, 'subtotal');
  cerca(t.igv, 22.32, 'igv');                 // 124 × 0.18
  cerca(t.total, 146.32, 'total');
  cerca(t.horasEstandar, 0.8, 'horas');
  cerca(t.comision, 5.12, 'comisión');        // 64 × 8 %
  cerca(t.costoRepuestos, 30, 'costo repuestos'); // 3 × 10
  cerca(t.margen, 88.88, 'margen');           // 124 − 30 − 5.12
});

prueba('OT urgente: recargo del 25 % sobre la mano de obra y comisión sobre mano de obra + recargo', () => {
  const t = OT.calcular({ servicio: 'S1', mecanico: 'M1', urgente: true, lineas: lineas(['R1', 3, 20]) }, crearCtx(base()));
  cerca(t.recargo, 16, 'recargo');            // 64 × 25 %
  cerca(t.subtotal, 140, 'subtotal');         // 64 + 16 + 60
  cerca(t.igv, 25.2, 'igv');
  cerca(t.total, 165.2, 'total');
  cerca(t.comision, 6.4, 'comisión');         // 80 × 8 %
  cerca(t.margen, 103.6, 'margen');           // 140 − 30 − 6.4
});

prueba('OT con dos servicios distintos suma sus tiempos (0.8 + 1.25 = 2.05 h)', () => {
  const t = OT.calcular({ servicio: 'S1', servicio2: 'S2', mecanico: 'M1', lineas: lineas(['R1', 1, 20]) }, crearCtx(base()));
  cerca(t.horasEstandar, 2.05, 'horas');
  cerca(t.manoObra, 164, 'mano de obra');     // 2.05 × 80
  cerca(t.subtotal, 184, 'subtotal');
});

prueba('OT con el mismo servicio repetido no cobra dos veces', () => {
  const t = OT.calcular({ servicio: 'S1', servicio2: 'S1', mecanico: 'M1', lineas: lineas(['R1', 1, 20]) }, crearCtx(base()));
  cerca(t.horasEstandar, 0.8, 'horas');
  cerca(t.manoObra, 64, 'mano de obra');
});

prueba('Bono de eficiencia: horas reales ≤ estándar suma 2 puntos; mayores o sin dato, no', () => {
  const ctx = crearCtx(base());
  const igual = OT.calcular({ servicio: 'S1', mecanico: 'M1', horasReales: 0.8, lineas: lineas(['R1', 1, 20]) }, ctx);
  cerca(igual.comision, 6.4, 'justo en el estándar: 10 % de 64');
  const menos = OT.calcular({ servicio: 'S1', mecanico: 'M1', horasReales: 0.5, lineas: lineas(['R1', 1, 20]) }, ctx);
  cerca(menos.comision, 6.4, 'por debajo del estándar');
  const mas = OT.calcular({ servicio: 'S1', mecanico: 'M1', horasReales: 0.9, lineas: lineas(['R1', 1, 20]) }, ctx);
  cerca(mas.comision, 5.12, 'por encima: sin bono (8 % de 64)');
  const sinDato = OT.calcular({ servicio: 'S1', mecanico: 'M1', horasReales: 0, lineas: lineas(['R1', 1, 20]) }, ctx);
  cerca(sinDato.comision, 5.12, 'cero horas = sin dato, sin bono');
});

prueba('Si cambia el parámetro del IGV o del recargo, la OT lo sigue (usa ctx.param)', () => {
  const ctx = crearCtx(base());
  ctx.params.igv = 10;
  ctx.params.recargoUrgente = 50;
  const t = OT.calcular({ servicio: 'S1', mecanico: 'M1', urgente: true, lineas: lineas(['R1', 3, 20]) }, ctx);
  cerca(t.recargo, 32, 'recargo 50 %');
  cerca(t.subtotal, 156, 'subtotal');
  cerca(t.igv, 15.6, 'igv 10 %');
});

prueba('Casos de borde: sin mecánico o sin líneas no hay NaN ni división por cero', () => {
  const t = OT.calcular({ servicio: 'S1', lineas: [] }, crearCtx(base()));
  cerca(t.manoObra, 0); cerca(t.repuestos, 0); cerca(t.total, 0); cerca(t.comision, 0); cerca(t.margen, 0);
  Object.keys(t).forEach((k) => assert.ok(isFinite(t[k]), k + ' debe ser finito'));
});

prueba('Regla: el vehículo debe ser del cliente', () => {
  const ctx = crearCtx(base());
  const r = OT.reglas.filter((x) => x.id === 'vehiculo-del-cliente')[0].validar;
  assert.equal(r({ cliente: 'CLI-1', vehiculo: 'VEH-1' }, ctx), true);
  assert.equal(r({ cliente: 'CLI-2', vehiculo: 'VEH-1' }, ctx), false);
  assert.equal(r({ cliente: 'CLI-1', vehiculo: 'NO-EXISTE' }, ctx), false);
});

/* ================= Orden de trabajo: emitir / anular ================= */
prueba('alEmitir descuenta stock, sube el km del vehículo y reinicia el mantenimiento', () => {
  const d = base(), ctx = crearCtx(d);
  OT.alEmitir({ servicio: 'S1', mecanico: 'M1', vehiculo: 'VEH-1', kilometraje: 91500, lineas: lineas(['R1', 2, 20]) }, ctx);
  assert.equal(d.repuestos[0].stock, 3);
  assert.equal(d.vehiculos[0].kmActual, 91500);
  assert.equal(d.vehiculos[0].ultimoMantKm, 91500);
});

prueba('alEmitir con un servicio que no reinicia solo actualiza el km; un km menor no lo baja', () => {
  const d = base(), ctx = crearCtx(d);
  OT.alEmitir({ servicio: 'S2', mecanico: 'M1', vehiculo: 'VEH-1', kilometraje: 91000, lineas: lineas(['R1', 1, 20]) }, ctx);
  assert.equal(d.vehiculos[0].kmActual, 91000);
  assert.equal(d.vehiculos[0].ultimoMantKm, 80000);
  OT.alEmitir({ servicio: 'S1', mecanico: 'M1', vehiculo: 'VEH-1', kilometraje: 500, lineas: lineas(['R1', 1, 20]) }, ctx);
  assert.equal(d.vehiculos[0].kmActual, 91000, 'no retrocede');
  assert.equal(d.vehiculos[0].ultimoMantKm, 80000, 'un km anterior al último mantenimiento no lo reinicia');
});

prueba('alEmitir rechaza stock insuficiente (sin tocar nada) y mecánico inactivo', () => {
  const d = base(), ctx = crearCtx(d);
  assert.throws(() => OT.alEmitir({ servicio: 'S1', mecanico: 'M1', vehiculo: 'VEH-1', kilometraje: 90000, lineas: lineas(['R1', 1, 20], ['R2', 2, 130]) }, ctx), /Stock insuficiente de «Pastillas»/);
  assert.equal(d.repuestos[0].stock, 5, 'la validación ocurre antes de descontar');
  assert.throws(() => OT.alEmitir({ servicio: 'S1', mecanico: 'M2', vehiculo: 'VEH-1', kilometraje: 90000, lineas: lineas(['R1', 1, 20]) }, ctx), /no está activo/);
});

prueba('alAnular devuelve el stock', () => {
  const d = base(), ctx = crearCtx(d);
  OT.alAnular({ lineas: lineas(['R1', 2, 20], ['R2', 1, 130]) }, ctx);
  assert.equal(d.repuestos[0].stock, 7);
  assert.equal(d.repuestos[1].stock, 2);
});

/* ================= Compras ================= */
const CP = op('compras');

prueba('Compra: subtotal, IGV 18 % y total', () => {
  const t = CP.calcular({ lineas: lineas(['R1', 2, 100], ['R2', 1, 50.5]) }, crearCtx(base()));
  cerca(t.subtotal, 250.5);
  cerca(t.igv, 45.09);
  cerca(t.total, 295.59);
  const v = CP.calcular({ lineas: [] }, crearCtx(base()));
  cerca(v.total, 0);
});

prueba('alEmitir de compra: stock sube, costo pasa a ser el nuevo y el precio respeta el margen mínimo (25 %)', () => {
  const d = base(), ctx = crearCtx(d);
  // R1: precio 20 y costo nuevo 18 → mínimo 22.5 > 20 → el precio sube a 22.5
  // R2: precio 130 y costo nuevo 100 → mínimo 125 < 130 → el precio se queda en 130
  CP.alEmitir({ lineas: lineas(['R1', 10, 18], ['R2', 4, 100]) }, ctx);
  assert.equal(d.repuestos[0].stock, 15);
  assert.equal(d.repuestos[0].costo, 18);
  cerca(d.repuestos[0].precio, 22.5);
  assert.equal(d.repuestos[1].stock, 5);
  assert.equal(d.repuestos[1].costo, 100);
  assert.equal(d.repuestos[1].precio, 130);
});

prueba('alEmitir de compra: el margen mínimo exacto no cambia el precio (límite)', () => {
  const d = base(), ctx = crearCtx(d);
  CP.alEmitir({ lineas: lineas(['R2', 1, 104]) }, ctx);  // 104 × 1.25 = 130 = precio actual
  assert.equal(d.repuestos[1].precio, 130);
});

prueba('alAnular de compra: resta el stock o se niega si ya se usó', () => {
  const d = base(), ctx = crearCtx(d);
  CP.alAnular({ lineas: lineas(['R1', 5, 10]) }, ctx);
  assert.equal(d.repuestos[0].stock, 0);
  assert.throws(() => CP.alAnular({ lineas: lineas(['R2', 3, 100]) }, ctx), /ya se usó parte de «Pastillas»/);
  assert.equal(d.repuestos[1].stock, 1, 'nada cambia si falla');
});

/* ================= Entidades: calculados ================= */
prueba('Próximo mantenimiento y situación (vencido / próximo / al día) con sus límites', () => {
  const ctx = crearCtx(base());
  const prox = cal('vehiculos', 'proximoMant'), sit = cal('vehiculos', 'situacion');
  assert.equal(prox({ ultimoMantKm: 80000, intervaloKm: 10000 }), 90000);
  assert.equal(prox({ intervaloKm: 5000 }), 5000, 'sin último mantenimiento cuenta desde cero');
  const v = (km) => ({ kmActual: km, ultimoMantKm: 80000, intervaloKm: 10000 });
  assert.equal(sit(v(95000), ctx), 'Vencido', 'pasado');
  assert.equal(sit(v(90000), ctx), 'Vencido', 'justo en el próximo = vencido (0 km restantes)');
  assert.equal(sit(v(89500), ctx), 'Próximo', 'faltan 500 = aviso');
  assert.equal(sit(v(89000), ctx), 'Al día', 'faltan 1000');
});

prueba('Situación: 501 km restantes es «Al día»', () => {
  const ctx = crearCtx(base());
  assert.equal(cal('vehiculos', 'situacion')({ kmActual: 89499, ultimoMantKm: 80000, intervaloKm: 10000 }, ctx), 'Al día');
});

prueba('Repuesto: situación de stock y margen sobre costo (sin dividir por cero)', () => {
  const ctx = crearCtx(base());
  const s = cal('repuestos', 'situacion'), m = cal('repuestos', 'margenCosto');
  assert.equal(s({ stock: 0, stockMin: 2 }), 'Agotado');
  assert.equal(s({ stock: 2, stockMin: 2 }), 'Stock bajo');
  assert.equal(s({ stock: 3, stockMin: 2 }), 'Normal');
  cerca(m({ costo: 10, precio: 15 }, ctx), 50);
  cerca(m({ costo: 29, precio: 45 }, ctx), 55.17);
  assert.equal(m({ costo: 0, precio: 15 }, ctx), null);
});

prueba('Regla del vehículo: el último mantenimiento no supera el km actual; regla del repuesto: precio ≥ costo', () => {
  const rv = ent('vehiculos').reglas[0].validar, rr = ent('repuestos').reglas[0].validar;
  assert.equal(rv({ kmActual: 100, ultimoMantKm: 100 }), true);
  assert.equal(rv({ kmActual: 100, ultimoMantKm: 101 }), false);
  assert.equal(rr({ costo: 10, precio: 10 }), true);
  assert.equal(rr({ costo: 10, precio: 9.99 }), false);
});

/* ================= Reportes ================= */
function conOrdenes() {
  const d = base();
  const ctx0 = crearCtx(d);
  const mk = (id, fecha, estado, extra) => {
    const doc = Object.assign({ id, numero: 'OT01-' + id, fecha, estado, cliente: 'CLI-1', vehiculo: 'VEH-1', servicio: 'S1', mecanico: 'M1', lineas: lineas(['R1', 3, 20]) }, extra || {});
    doc.totales = OT.calcular(doc, ctx0);
    d.ordenes.push(doc);
  };
  mk('O1', '2026-09-10', 'Entregada', { horasReales: 0.64 });                 // estándar 0.8, reales 0.64
  mk('O2', '2026-09-20', 'Terminada', { servicio2: 'S2', horasReales: 0 });   // estándar 2.05, sin dato
  mk('O3', '2026-09-25', 'En proceso');                                       // no cuenta como facturable
  mk('O4', '2026-09-26', 'Anulada');
  mk('O5', '2026-01-05', 'Entregada');                                        // fuera del rango
  return d;
}

prueba('Reporte ingresos por servicio: solo órdenes terminadas/entregadas del rango', () => {
  const d = conOrdenes(), ctx = crearCtx(d);
  const r = rep('ingresos-servicio').ejecutar({ desde: '2026-09-01', hasta: '2026-09-30' }, ctx);
  // S1 en O1 y O2: 2 × 0.8 h × 80 = 128 ; S2 en O2: 1.25 × 80 = 100
  assert.equal(r.filas.length, 2);
  assert.equal(r.filas[0][0], 'Aceite'); cerca(r.filas[0][4], 128); assert.equal(r.filas[0][2], 2);
  assert.equal(r.filas[1][0], 'Frenos'); cerca(r.filas[1][4], 100);
  cerca(r.resumen[0].valor, 228);
  cerca(r.resumen[1].valor, 2.85, 'horas estándar vendidas (0.8×2 + 1.25)');
  assert.equal(r.resumen[2].valor, 2);
});

prueba('Reporte ingresos por servicio: el recargo urgente entra en el importe y un rango vacío no falla', () => {
  const d = conOrdenes(), ctx = crearCtx(d);
  d.ordenes[0].urgente = true;
  const r = rep('ingresos-servicio').ejecutar({ desde: '2026-09-01', hasta: '2026-09-30' }, ctx);
  cerca(r.filas[0][4], 144, 'S1: 0.8×80×1.25 + 0.8×80');
  const vacio = rep('ingresos-servicio').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx);
  assert.equal(vacio.filas.length, 0);
  cerca(vacio.resumen[0].valor, 0);
});

prueba('Reporte productividad: eficiencia = horas estándar ÷ horas reales (solo órdenes con dato)', () => {
  const d = conOrdenes(), ctx = crearCtx(d);
  const r = rep('productividad-mecanico').ejecutar({ desde: '2026-09-01', hasta: '2026-09-30' }, ctx);
  assert.equal(r.filas.length, 1);
  assert.equal(r.filas[0][0], 'Maestro');
  assert.equal(r.filas[0][2], 2);
  cerca(r.filas[0][3], 2.85, 'horas estándar');
  cerca(r.filas[0][4], 0.64, 'horas reales');
  cerca(r.filas[0][5], 125, 'eficiencia 0.8 / 0.64');
  // O1: 64 × (8 + 2 puntos de bono) = 6.4 ; O2: 164 × 8 % = 13.12
  cerca(r.filas[0][7], 19.52, 'comisión');
  cerca(r.resumen[2].valor, 125, 'eficiencia del taller');
});

prueba('Reporte productividad: sin horas reales la eficiencia es 0, no una división por cero', () => {
  const d = conOrdenes(), ctx = crearCtx(d);
  d.ordenes[0].horasReales = 0;
  const r = rep('productividad-mecanico').ejecutar({ desde: '2026-09-01', hasta: '2026-09-30' }, ctx);
  assert.equal(r.filas[0][5], 0);
  assert.equal(r.resumen[2].valor, 0);
});

prueba('Reporte repuestos más usados: cuenta órdenes en proceso, terminadas y entregadas', () => {
  const d = conOrdenes(), ctx = crearCtx(d);
  const r = rep('repuestos-usados').ejecutar({ desde: '2026-09-01', hasta: '2026-09-30', top: 10 }, ctx);
  assert.equal(r.filas.length, 1);
  assert.equal(r.filas[0][3], 9, '3 unidades × 3 órdenes (O1, O2, O3)');
  cerca(r.filas[0][4], 180, 'ingreso 9 × 20');
  cerca(r.filas[0][5], 90, 'margen 180 − 9 × 10');
  assert.equal(r.resumen[2].valor, 3);
});

prueba('Reporte mantenimiento vencido: filtros y orden por km restantes', () => {
  const d = base(), ctx = crearCtx(d);
  d.vehiculos[0].kmActual = 91000;   // restantes −1000 → Vencido
  d.vehiculos[1].kmActual = 4600;    // restantes 400 → Próximo (aviso 500)
  const todos = rep('mantenimiento-vencido').ejecutar({ filtro: 'Todos los vehículos' }, ctx);
  assert.equal(todos.filas.length, 2);
  assert.equal(todos.filas[0][0], 'AAA-111');
  assert.equal(todos.filas[0][7], -1000);
  const solo = rep('mantenimiento-vencido').ejecutar({ filtro: 'Solo vencidos' }, ctx);
  assert.equal(solo.filas.length, 1);
  const def = rep('mantenimiento-vencido').ejecutar({ filtro: 'Vencidos y próximos' }, ctx);
  assert.equal(def.filas.length, 2);
  assert.equal(def.resumen[0].valor, 1);
  assert.equal(def.resumen[1].valor, 1);
});

prueba('Reporte margen por orden: ingreso − repuestos − comisión, y margen % sin dividir por cero', () => {
  const d = conOrdenes(), ctx = crearCtx(d);
  const r = rep('margen-orden').ejecutar({ desde: '2026-09-01', hasta: '2026-09-30' }, ctx);
  assert.equal(r.filas.length, 2);
  assert.equal(r.filas[0][0], 'OT01-O2', 'la más reciente primero');
  // O2: subtotal 164 + 60 = 224 ; costo 30 ; comisión 13.12 → margen 180.88
  cerca(r.filas[0][7], 180.88);
  cerca(r.filas[0][8], 80.75, 'margen % = 180.88 / 224');
  // O1: subtotal 124 ; costo 30 ; comisión 6.4 → 87.6
  cerca(r.filas[1][7], 87.6);
  cerca(r.resumen[0].valor, 268.48);
  d.ordenes.forEach((o) => { o.totales.subtotal = 0; o.totales.margen = 0; });
  const cero = rep('margen-orden').ejecutar({ desde: '2026-09-01', hasta: '2026-09-30' }, ctx);
  assert.equal(cero.filas[0][8], 0);
  assert.equal(cero.resumen[1].valor, 0);
});

/* ================= Tablero ================= */
prueba('Tablero: indicadores con datos y sin datos', () => {
  const d = conOrdenes(), ctx = crearCtx(d, '2026-09-30');
  const ind = (i) => SIS.tablero[i].calcular(ctx);
  // últimos 30 días hasta 2026-09-30: O1 (09-10) y O2 (09-20)
  cerca(ind(0), d.ordenes[0].totales.total + d.ordenes[1].totales.total);
  assert.equal(ind(1), 1, 'una orden en proceso');
  assert.equal(ind(3), 1, 'R2 está por debajo del mínimo');
  const vacio = crearCtx(base(), '2026-09-30');
  assert.equal(SIS.tablero[2].calcular(vacio), 0, 'ticket promedio sin órdenes');
  const g = SIS.tableroGrafico.calcular(ctx);
  assert.equal(g.etiquetas.length, 6);
  assert.equal(g.valores.length, 6);
});

console.log('\n' + n + ' pruebas de fórmulas de taller-mecanico: todas correctas.');
