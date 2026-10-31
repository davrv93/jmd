/*
 * Pruebas de las fórmulas del sistema «hotel», sin navegador.
 * Carga config.js en node:vm con un window falso y arma un ctx de pruebas con las
 * utilidades reales del núcleo (00-util.js), para que el redondeo y las fechas sean los de producción.
 * Uso:  node sistemas/hotel/formulas.test.mjs
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

/* ---------- ctx de pruebas ---------- */
const clonar = (o) => JSON.parse(JSON.stringify(o));
/* Igualdad profunda de valores creados dentro del vm (sus prototipos son de otro reino). */
const deep = (real, esperado) => assert.deepStrictEqual(clonar(real), esperado);
function crearCtx(datos, params, hoy) {
  const col = (c) => datos[c] || [];
  const ctx = {
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
  return ctx;
}

const PARAMS = { igv: 18, exoneraExtranjeros: 1, diasExoneracionMax: 60, nochesEstadiaLarga: 7, descEstadiaLargaPct: 10, nochesMax: 30 };
const HOY = '2026-10-31';

function tarifa(id, tipo, temporada, precio, desde) { return { id, tipoHabitacion: tipo, temporada, precio, vigenteDesde: desde }; }
function datosBase() {
  return {
    habitaciones: [
      { id: 'H1', numero: '101', tipo: 'Doble', capacidad: 2, estado: 'Operativa' },
      { id: 'H2', numero: '102', tipo: 'Suite', capacidad: 3, estado: 'Operativa' },
      { id: 'H3', numero: '103', tipo: 'Doble', capacidad: 2, estado: 'En mantenimiento' },
      { id: 'H4', numero: '104', tipo: 'Doble', capacidad: 2, estado: 'Fuera de servicio' }
    ],
    huespedes: [
      { id: 'G1', nombre: 'Ana Perú', nacionalidad: 'Perú', procedencia: 'Lima' },
      { id: 'G2', nombre: 'Hans Alemán', nacionalidad: 'Alemania', procedencia: 'Múnich' }
    ],
    servicios: [
      { id: 'S1', nombre: 'Agua', categoria: 'Bebidas', precio: 4, controlaStock: true, stock: 10, stockMin: 3 },
      { id: 'S2', nombre: 'Desayuno', categoria: 'Alimentos', precio: 18, controlaStock: false, stock: 0, stockMin: 0 }
    ],
    tarifas: [
      tarifa('T1', 'Doble', 'Baja', 100, '2026-01-01'), tarifa('T2', 'Doble', 'Alta', 140, '2026-01-01')
    ],
    reservas: []
  };
}

let n = 0;
function prueba(nombre, fn) {
  try { fn(); n += 1; console.log('  ok  ' + nombre); } catch (e) { console.log('  FALLA ' + nombre + '\n' + e.message); process.exitCode = 1; }
}

const op = S.operaciones[0];
const calcular = (doc, datos, params, hoy) => op.calcular(doc, crearCtx(datos || datosBase(), params || PARAMS, hoy || HOY));
const doc = (fecha, salida, extra) => Object.assign({ fecha, salida, habitacion: 'H1', huesped: 'G1', personas: 2, adelanto: 0, lineas: [] }, extra || {});
const regla = (id) => op.reglas.filter((r) => r.id === id)[0];

console.log('Reserva · noches, tarifa por temporada, descuento, IGV');

prueba('3 noches de temporada baja: 3 x 100 + IGV 18 %', () => {
  const t = calcular(doc('2026-10-10', '2026-10-13'));
  deep(t, { noches: 3, alojamiento: 300, descuento: 0, consumos: 0, subtotal: 300, igv: 54, total: 354, saldo: 354 });
});

prueba('una estadía que cruza de alta a baja cobra cada noche con su tarifa (29-sep al 2-oct: 140 + 140 + 100)', () => {
  const t = calcular(doc('2026-09-29', '2026-10-02'));
  assert.equal(t.noches, 3);
  assert.equal(t.alojamiento, 380);
  assert.equal(t.igv, 68.4);
  assert.equal(t.total, 448.4);
});

prueba('bordes de temporada: 30-sep es alta y 1-oct es baja; 31-may es baja y 1-jun es alta', () => {
  assert.equal(calcular(doc('2026-09-30', '2026-10-02')).alojamiento, 240);
  assert.equal(calcular(doc('2026-05-31', '2026-06-02')).alojamiento, 240);
});

prueba('fin de año: la alta empieza el 20-dic y termina el 6-ene', () => {
  assert.equal(calcular(doc('2026-12-19', '2026-12-22')).alojamiento, 380); /* 19 baja, 20 y 21 alta */
  assert.equal(calcular(doc('2027-01-05', '2027-01-08')).alojamiento, 380); /* 5 y 6 alta, 7 baja */
});

prueba('la noche de salida no se cobra (entrada 10, salida 11 = 1 noche)', () => {
  const t = calcular(doc('2026-10-10', '2026-10-11'));
  assert.equal(t.noches, 1);
  assert.equal(t.alojamiento, 100);
});

prueba('cruce de mes y de año bisiesto no rompe el conteo (28-feb-2028 al 1-mar-2028 = 2 noches)', () => {
  assert.equal(calcular(doc('2028-02-28', '2028-03-01')).noches, 2);
  assert.equal(calcular(doc('2027-02-28', '2027-03-01')).noches, 1);
});

prueba('0 noches (misma fecha) o salida anterior: todo en cero, sin errores', () => {
  const cero = { noches: 0, alojamiento: 0, descuento: 0, consumos: 0, subtotal: 0, igv: 0, total: 0, saldo: 0 };
  deep(calcular(doc('2026-10-10', '2026-10-10')), cero);
  deep(calcular(doc('2026-10-12', '2026-10-10')), cero);
});

prueba('la tarifa más reciente ya vigente reemplaza a la anterior desde su fecha (14-oct: 100; 15 y 16: 105)', () => {
  const d = datosBase();
  d.tarifas.push(tarifa('T3', 'Doble', 'Baja', 105, '2026-10-15'));
  assert.equal(calcular(doc('2026-10-14', '2026-10-17'), d).alojamiento, 310);
});

prueba('una tarifa futura no se usa antes de su vigencia', () => {
  const d = datosBase();
  d.tarifas.push(tarifa('T3', 'Doble', 'Baja', 500, '2027-01-01'));
  assert.equal(calcular(doc('2026-10-14', '2026-10-16'), d).alojamiento, 200);
});

prueba('sin tarifa para el tipo de habitación el alojamiento es 0 (la regla hay-tarifa lo impide al guardar)', () => {
  const t = calcular(doc('2026-10-10', '2026-10-13', { habitacion: 'H2' }));
  assert.equal(t.alojamiento, 0);
  assert.equal(regla('hay-tarifa').validar(doc('2026-10-10', '2026-10-13', { habitacion: 'H2' }), crearCtx(datosBase(), PARAMS, HOY)), false);
  assert.equal(regla('hay-tarifa').validar(doc('2026-10-10', '2026-10-13'), crearCtx(datosBase(), PARAMS, HOY)), true);
});

console.log('Descuento por estadía larga');

prueba('6 noches no reciben descuento; 7 noches sí (10 %): 700 - 70 = 630, IGV 113.40, total 743.40', () => {
  assert.equal(calcular(doc('2026-10-01', '2026-10-07')).descuento, 0);
  const t = calcular(doc('2026-10-01', '2026-10-08'));
  assert.equal(t.noches, 7);
  assert.equal(t.descuento, 70);
  assert.equal(t.alojamiento, 630);
  assert.equal(t.igv, 113.4);
  assert.equal(t.total, 743.4);
});

prueba('con el umbral en 0 nunca hay descuento, aunque la estadía sea larga', () => {
  const t = calcular(doc('2026-10-01', '2026-10-11'), null, Object.assign({}, PARAMS, { nochesEstadiaLarga: 0 }));
  assert.equal(t.descuento, 0);
  assert.equal(t.alojamiento, 1000);
});

prueba('redondeo a centavos: 3 x 99.99 = 299.97 con IGV 53.99; 7 x 33.33 con 10 % = 209.98, IGV 37.80', () => {
  const d = datosBase();
  d.tarifas = [tarifa('T1', 'Doble', 'Baja', 99.99, '2026-01-01'), tarifa('T2', 'Doble', 'Alta', 140, '2026-01-01')];
  const a = calcular(doc('2026-10-10', '2026-10-13'), d);
  assert.equal(a.alojamiento, 299.97);
  assert.equal(a.igv, 53.99);
  d.tarifas = [tarifa('T1', 'Doble', 'Baja', 33.33, '2026-01-01')];
  const b = calcular(doc('2026-10-01', '2026-10-08'), d);
  assert.equal(b.descuento, 23.33);
  assert.equal(b.alojamiento, 209.98);
  assert.equal(b.igv, 37.8);
  assert.equal(b.total, 247.78);
});

console.log('Consumos, adelanto y exoneración de IGV a extranjeros');

prueba('consumos de 26 (2 x 4 + 1 x 18) suman al subtotal y pagan IGV; el adelanto baja el saldo', () => {
  const t = calcular(doc('2026-10-10', '2026-10-13', { adelanto: 100, lineas: [{ item: 'S1', cantidad: 2, precio: 4 }, { item: 'S2', cantidad: 1, precio: 18 }] }));
  assert.equal(t.consumos, 26);
  assert.equal(t.subtotal, 326);
  assert.equal(t.igv, 58.68);
  assert.equal(t.total, 384.68);
  assert.equal(t.saldo, 284.68);
});

prueba('un extranjero no paga IGV por el alojamiento pero sí por los consumos', () => {
  const t = calcular(doc('2026-10-10', '2026-10-13', { huesped: 'G2', lineas: [{ item: 'S1', cantidad: 2, precio: 4 }, { item: 'S2', cantidad: 1, precio: 18 }] }));
  assert.equal(t.alojamiento, 300);
  assert.equal(t.igv, 4.68);
  assert.equal(t.total, 330.68);
});

prueba('límite de la exoneración: 60 noches exoneradas, 61 pagan IGV', () => {
  const sesenta = calcular(doc('2026-10-01', '2026-11-30', { huesped: 'G2' }));
  assert.equal(sesenta.noches, 60);
  assert.equal(sesenta.alojamiento, 5400); /* 6000 - 10 % */
  assert.equal(sesenta.igv, 0);
  assert.equal(sesenta.total, 5400);
  const sesentaYUna = calcular(doc('2026-10-01', '2026-12-01', { huesped: 'G2' }));
  assert.equal(sesentaYUna.noches, 61);
  assert.equal(sesentaYUna.alojamiento, 5490);
  assert.equal(sesentaYUna.igv, 988.2);
  assert.equal(sesentaYUna.total, 6478.2);
});

prueba('con el parámetro de exoneración en 0 el extranjero paga IGV completo', () => {
  const t = calcular(doc('2026-10-10', '2026-10-13', { huesped: 'G2' }), null, Object.assign({}, PARAMS, { exoneraExtranjeros: 0 }));
  assert.equal(t.igv, 54);
});

prueba('un cambio del parámetro IGV se refleja en el total (IGV 10 %: 30 de IGV sobre 300)', () => {
  const t = calcular(doc('2026-10-10', '2026-10-13'), null, Object.assign({}, PARAMS, { igv: 10 }));
  assert.equal(t.igv, 30);
  assert.equal(t.total, 330);
});

console.log('Reglas de la reserva');

const ctxR = (datos) => crearCtx(datos, PARAMS, HOY);
prueba('cruce de fechas: dormir una noche encima de otra reserva se rechaza; salir el día que otro entra es válido', () => {
  const d = datosBase();
  d.reservas = [
    { id: 'R1', habitacion: 'H1', fecha: '2026-11-10', salida: '2026-11-13', estado: 'Reservada' },
    { id: 'R2', habitacion: 'H1', fecha: '2026-11-20', salida: '2026-11-22', estado: 'Cancelada' }
  ];
  const v = regla('sin-cruce').validar;
  assert.equal(v(doc('2026-11-12', '2026-11-14'), ctxR(d)), false, 'se cruza una noche');
  assert.equal(v(doc('2026-11-08', '2026-11-11'), ctxR(d)), false, 'entra antes y se cruza');
  assert.equal(v(doc('2026-11-11', '2026-11-12'), ctxR(d)), false, 'queda dentro');
  assert.equal(v(doc('2026-11-08', '2026-11-10'), ctxR(d)), true, 'sale el día que entra la otra');
  assert.equal(v(doc('2026-11-13', '2026-11-15'), ctxR(d)), true, 'entra el día que sale la otra');
  assert.equal(v(doc('2026-11-20', '2026-11-22'), ctxR(d)), true, 'una cancelada no bloquea');
  assert.equal(v(doc('2026-11-12', '2026-11-14', { habitacion: 'H2' }), ctxR(d)), true, 'otra habitación');
  assert.equal(v(doc('2026-11-10', '2026-11-13', { id: 'R1' }), ctxR(d)), true, 'editar la misma reserva no choca consigo misma');
});

prueba('capacidad, habitación operativa, salida posterior y máximo de noches', () => {
  const d = datosBase();
  assert.equal(regla('capacidad-habitacion').validar(doc('2026-10-10', '2026-10-12', { personas: 3 }), ctxR(d)), false);
  assert.equal(regla('capacidad-habitacion').validar(doc('2026-10-10', '2026-10-12', { personas: 2 }), ctxR(d)), true);
  assert.equal(regla('habitacion-operativa').validar(doc('2026-10-10', '2026-10-12', { habitacion: 'H3' }), ctxR(d)), false);
  assert.equal(regla('habitacion-operativa').validar(doc('2026-10-10', '2026-10-12', { habitacion: 'H4' }), ctxR(d)), false);
  assert.equal(regla('habitacion-operativa').validar(doc('2026-10-10', '2026-10-12'), ctxR(d)), true);
  assert.equal(regla('salida-posterior').validar(doc('2026-10-10', '2026-10-10')), false);
  assert.equal(regla('salida-posterior').validar(doc('2026-10-10', '2026-10-11')), true);
  assert.equal(regla('estadia-maxima').validar(doc('2026-10-01', '2026-10-31'), ctxR(d)), true, '30 noches');
  assert.equal(regla('estadia-maxima').validar(doc('2026-10-01', '2026-11-01'), ctxR(d)), false, '31 noches');
});

console.log('Check-in (alEmitir) y cancelación (alAnular)');

prueba('el check-in descuenta el stock del frigobar y la cancelación lo devuelve', () => {
  const d = datosBase();
  const ctx = crearCtx(d, PARAMS, HOY);
  const reserva = doc('2026-10-31', '2026-11-02', { lineas: [{ item: 'S1', cantidad: 4, precio: 4 }, { item: 'S2', cantidad: 2, precio: 18 }] });
  op.alEmitir(reserva, ctx);
  assert.equal(d.servicios[0].stock, 6);
  assert.equal(d.servicios[1].stock, 0, 'un servicio sin control de stock no se toca');
  op.alAnular(reserva, ctx);
  assert.equal(d.servicios[0].stock, 10);
});

prueba('el check-in falla si no hay stock (y no descuenta nada), si es antes de la entrada o si la salida ya pasó', () => {
  const d = datosBase();
  const ctx = crearCtx(d, PARAMS, HOY);
  assert.throws(() => op.alEmitir(doc('2026-10-31', '2026-11-02', { lineas: [{ item: 'S1', cantidad: 11, precio: 4 }] }), ctx), /Stock insuficiente/);
  assert.equal(d.servicios[0].stock, 10);
  assert.throws(() => op.alEmitir(doc('2026-11-01', '2026-11-03'), ctx), /Todavía no es la fecha de entrada/);
  assert.throws(() => op.alEmitir(doc('2026-10-28', '2026-10-31'), ctx), /fecha de salida ya pasó/);
  op.alEmitir(doc('2026-10-30', '2026-11-01', { lineas: [{ item: 'S1', cantidad: 10, precio: 4 }] }), ctx);
  assert.equal(d.servicios[0].stock, 0, 'se puede consumir justo todo el stock');
});

console.log('Campos calculados de las entidades');

prueba('situación de la habitación: libre, ocupada, sale hoy o su estado si no es operativa', () => {
  const d = datosBase();
  d.reservas = [
    { id: 'R1', habitacion: 'H1', fecha: '2026-10-29', salida: '2026-11-02', estado: 'En casa' },
    { id: 'R2', habitacion: 'H2', fecha: '2026-10-29', salida: '2026-10-31', estado: 'En casa' }
  ];
  const f = S.entidades[0].calculados[0].formula;
  assert.equal(f(d.habitaciones[0], ctxR(d)), 'Ocupada');
  assert.equal(f(d.habitaciones[1], ctxR(d)), 'Sale hoy');
  assert.equal(f(d.habitaciones[2], ctxR(d)), 'En mantenimiento');
  d.reservas[0].estado = 'Finalizada';
  assert.equal(f(d.habitaciones[0], ctxR(d)), 'Libre');
});

prueba('situación del servicio: sin control, agotado, stock bajo (en el mínimo) y normal', () => {
  const f = S.entidades[2].calculados[0].formula;
  assert.equal(f({ controlaStock: false, stock: 0, stockMin: 0 }), 'Sin control');
  assert.equal(f({ controlaStock: true, stock: 0, stockMin: 3 }), 'Agotado');
  assert.equal(f({ controlaStock: true, stock: 3, stockMin: 3 }), 'Stock bajo');
  assert.equal(f({ controlaStock: true, stock: 4, stockMin: 3 }), 'Normal');
});

prueba('tarifa vigente: sí, reemplazada o futura', () => {
  const d = datosBase();
  d.tarifas.push(tarifa('T3', 'Doble', 'Baja', 105, '2026-10-15'), tarifa('T4', 'Doble', 'Baja', 120, '2026-12-01'));
  const f = S.entidades[3].calculados[0].formula;
  assert.equal(f(d.tarifas[0], ctxR(d)), 'Reemplazada');
  assert.equal(f(d.tarifas[2], ctxR(d)), 'Sí');
  assert.equal(f(d.tarifas[3], ctxR(d)), 'Futura');
  assert.equal(f(d.tarifas[1], ctxR(d)), 'Sí');
});

prueba('regla de tarifa única, DNI de 8 dígitos y capacidad mínima por tipo', () => {
  const d = datosBase();
  assert.equal(S.entidades[3].reglas[0].validar({ tipoHabitacion: 'Doble', temporada: 'Baja', vigenteDesde: '2026-01-01' }, ctxR(d)), false);
  assert.equal(S.entidades[3].reglas[0].validar({ tipoHabitacion: 'Doble', temporada: 'Baja', vigenteDesde: '2026-02-01' }, ctxR(d)), true);
  assert.equal(S.entidades[1].reglas[0].validar({ tipoDocumento: 'DNI', documento: '1234567' }), false);
  assert.equal(S.entidades[1].reglas[0].validar({ tipoDocumento: 'DNI', documento: '12345678' }), true);
  assert.equal(S.entidades[1].reglas[0].validar({ tipoDocumento: 'Pasaporte', documento: 'AB123456' }), true);
  assert.equal(S.entidades[0].reglas[0].validar({ tipo: 'Triple', capacidad: 2 }), false);
  assert.equal(S.entidades[0].reglas[0].validar({ tipo: 'Triple', capacidad: 3 }), true);
  assert.equal(S.entidades[0].reglas[0].validar({ tipo: 'Simple', capacidad: 1 }), true);
});

console.log('Ocupación, ADR y RevPAR');

function datosOcupacion() {
  const d = datosBase();
  /* Inventario: H1, H2 y H3 (H4 fuera de servicio no cuenta) = 3 habitaciones. */
  d.tarifas.push(tarifa('T5', 'Suite', 'Baja', 200, '2026-01-01'), tarifa('T6', 'Suite', 'Alta', 300, '2026-01-01'));
  d.reservas = [
    { id: 'A', habitacion: 'H1', huesped: 'G1', fecha: '2026-09-29', salida: '2026-10-02', estado: 'Finalizada', lineas: [] }, /* 29 y 30-sep alta (140), 1-oct baja (100) */
    { id: 'B', habitacion: 'H1', huesped: 'G2', fecha: '2026-10-10', salida: '2026-10-13', estado: 'Finalizada', lineas: [] }, /* 3 noches baja = 300 */
    { id: 'C', habitacion: 'H2', huesped: 'G1', fecha: '2026-10-20', salida: '2026-10-25', estado: 'En casa', lineas: [] }, /* 5 noches suite baja = 1000 */
    { id: 'D', habitacion: 'H1', huesped: 'G1', fecha: '2026-10-15', salida: '2026-10-17', estado: 'Cancelada', lineas: [] },
    { id: 'E', habitacion: 'H1', huesped: 'G1', fecha: '2026-11-05', salida: '2026-11-07', estado: 'Reservada', lineas: [] }
  ];
  d.reservas.forEach((r) => { r.totales = op.calcular(r, crearCtx(d, PARAMS, HOY)); });
  return d;
}
const rep = (id) => S.reportes.filter((r) => r.id === id)[0];

prueba('ocupación por mes: solo cuentan estadías realizadas, noche por noche y sobre 3 habitaciones disponibles', () => {
  const d = datosOcupacion();
  const r = rep('ocupacion-mes').ejecutar({ desde: '2026-09-01', hasta: '2026-10-31' }, crearCtx(d, PARAMS, HOY));
  /* Septiembre: 2 noches vendidas / (30 dias x 3) = 90 -> 2,22 %. Octubre: 1 + 3 + 5 = 9 noches / (31 x 3) = 93 -> 9,68 % */
  deep(r.filas, [['sep 2026', 2, 90, 2.22], ['oct 2026', 9, 93, 9.68]]);
  assert.equal(r.resumen[0].valor, 6.01); /* 11 / 183 */
  assert.equal(r.resumen[1].valor, 11);
  assert.equal(r.resumen[2].valor, 3);
});

prueba('ADR y RevPAR: sep 280 / 2 noches = 140; oct 100 + 300 + 1000 = 1400 / 9 = 155.56; RevPAR = ingreso / disponibles', () => {
  const d = datosOcupacion();
  const r = rep('adr-revpar').ejecutar({ desde: '2026-09-01', hasta: '2026-10-31' }, crearCtx(d, PARAMS, HOY));
  deep(r.filas[0], ['sep 2026', 280, 2, 140, 2.22, 3.11]);
  deep(r.filas[1], ['oct 2026', 1400, 9, 155.56, 9.68, 15.05]);
  assert.equal(r.resumen[0].valor, 152.73); /* 1680 / 11 */
  assert.equal(r.resumen[1].valor, 9.18); /* 1680 / 183 */
  /* identidad: RevPAR = ADR x ocupación (con tolerancia de centavos por el redondeo) */
  assert.ok(Math.abs(r.resumen[1].valor - r.resumen[0].valor * r.resumen[2].valor / 100) < 0.02);
});

prueba('el mes en curso solo cuenta los días transcurridos (hoy = 20-oct: 20 días x 3 = 60 disponibles)', () => {
  const d = datosOcupacion();
  const r = rep('ocupacion-mes').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, crearCtx(d, PARAMS, '2026-10-20'));
  /* Hasta el 20-oct: 1 (1-oct) + 3 (10 al 12) + 1 (20-oct de la estadía C) = 5 noches */
  deep(r.filas, [['oct 2026', 5, 60, 8.33]]);
});

prueba('un rango sin estadías devuelve cero filas (sin dividir entre cero)', () => {
  const d = datosOcupacion();
  ['ocupacion-mes', 'adr-revpar'].forEach((id) => {
    const r = rep(id).ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, crearCtx(d, PARAMS, HOY));
    assert.equal(r.filas.length, 0);
    r.resumen.forEach((x) => assert.ok(Number.isFinite(x.valor)));
  });
  const vacio = Object.assign(datosOcupacion(), { habitaciones: [] });
  const r2 = rep('ocupacion-mes').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, crearCtx(vacio, PARAMS, HOY));
  assert.equal(r2.filas[0][3], 0, 'sin inventario la ocupación es 0 y no hay división entre cero');
});

prueba('ingresos por tipo de habitación usan los totales guardados de las estadías con entrada en el rango', () => {
  const d = datosOcupacion();
  const r = rep('ingresos-tipo').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, crearCtx(d, PARAMS, HOY));
  /* B (Doble 300) y C (Suite 1000). A entró en septiembre; D está cancelada y E sin check-in */
  deep(r.filas, [['Doble', 1, 3, 300, 0, 300], ['Suite', 1, 5, 1000, 0, 1000]]);
  assert.equal(r.resumen[0].valor, 1300);
});

prueba('huéspedes por procedencia y consumos por servicio', () => {
  const d = datosOcupacion();
  d.reservas[1].lineas = [{ item: 'S1', cantidad: 3, precio: 4 }, { item: 'S2', cantidad: 2, precio: 18 }];
  const ctx = crearCtx(d, PARAMS, HOY);
  const p = rep('huespedes-procedencia').ejecutar({ desde: '2026-09-01', hasta: '2026-10-31' }, ctx);
  /* Lima: A y C (2 estadías, 3+5 = 8 noches); Múnich: B (1 estadía, 3 noches) */
  assert.equal(p.filas[0][0], 'Lima');
  assert.equal(p.filas[0][3], 2);
  assert.equal(p.filas[0][4], 8);
  assert.equal(p.filas[1][0], 'Múnich');
  assert.equal(p.resumen[1].valor, 33.33); /* 1 de 3 estadías es de un extranjero */
  const c = rep('consumos-servicio').ejecutar({ desde: '2026-09-01', hasta: '2026-10-31' }, ctx);
  deep(c.filas, [['Desayuno', 'Alimentos', 2, 36, 75], ['Agua', 'Bebidas', 3, 12, 25]]);
  assert.equal(c.resumen[0].valor, 48);
});

console.log('Coherencia de las semillas');

prueba('las reservas sembradas no se cruzan, caben en la habitación y sus estados concuerdan con las fechas', () => {
  const sem = clonar(S.semillas);
  const hoy = U.hoy();
  const res = sem.reservas.map((r) => Object.assign({}, r, { fecha: U.resolverFecha(r.fecha), salida: U.resolverFecha(r.salida) }));
  const hab = {};
  sem.habitaciones.forEach((h) => { hab[h.id] = h; });
  res.forEach((r) => {
    assert.ok(r.salida > r.fecha, r.id + ' salida posterior');
    assert.ok(r.personas <= hab[r.habitacion].capacidad, r.id + ' cabe en la habitación');
    if (r.estado === 'Finalizada') { assert.ok(r.salida <= hoy, r.id + ' finalizada ya salió'); }
    if (r.estado === 'En casa') { assert.ok(r.fecha <= hoy && r.salida >= hoy, r.id + ' en casa hoy'); }
    if (r.estado === 'Reservada') { assert.ok(r.salida >= hoy, r.id + ' reservada no es pasada'); }
  });
  res.filter((r) => r.estado !== 'Cancelada').forEach((a) => {
    res.filter((b) => b.estado !== 'Cancelada' && b.id > a.id && b.habitacion === a.habitacion).forEach((b) => {
      assert.ok(!(a.fecha < b.salida && b.fecha < a.salida), a.id + ' y ' + b.id + ' se cruzan en ' + a.habitacion);
    });
  });
  /* La primera habitación por orden alfabético (la que elige la prueba de humo) debe estar libre hoy y mañana. */
  res.filter((r) => r.habitacion === 'HAB-0001' && r.estado !== 'Cancelada').forEach((r) => assert.ok(r.salida <= hoy, 'HAB-0001 libre hoy'));
  assert.ok(res.length >= 30);
});

console.log('\n' + n + ' pruebas correctas' + (process.exitCode ? ' (hay fallos)' : ''));
