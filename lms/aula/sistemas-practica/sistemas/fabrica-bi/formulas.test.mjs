/*
 * formulas.test.mjs · Prueba sin navegador de las fórmulas de «fabrica-bi»
 * ----------------------------------------------------------------------------
 *   node sistemas/fabrica-bi/formulas.test.mjs
 * Carga config.js en node:vm con un `window` falso, arma un `ctx` mínimo (param, redondear, suma,
 * agrupar, fechas y un almacén en memoria) y verifica con resultados calculados a mano.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const caja = { window: {} };
vm.createContext(caja);
vm.runInContext(fs.readFileSync(path.join(AQUI, 'config.js'), 'utf8'), caja, { filename: 'config.js' });
const C = caja.window.SISTEMA;

/* ---------- ctx de pruebas ---------- */
const parse = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)); };
const iso = (d) => d.toISOString().slice(0, 10);
const fechaMas = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const diasEntre = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const redondear = (n) => (typeof n !== 'number' || !isFinite(n) ? 0 : (n < 0 ? -1 : 1) * Math.round(Math.abs(n) * 100 + 1e-7) / 100);

function crearCtx(datos, opciones = {}) {
  const params = {};
  C.parametros.forEach((p) => { params[p.id] = p.valor; });
  Object.assign(params, opciones.params || {});
  const copia = (x) => JSON.parse(JSON.stringify(x));
  return {
    datos: {
      listar: (e, f) => (datos[e] || []).filter((r) => !f || f(r)).map(copia),
      obtener: (e, id) => { const r = (datos[e] || []).find((x) => x.id === id); return r ? copia(r) : null; },
      contar: (e) => (datos[e] || []).length,
      actualizar: (e, id, parche) => { const r = datos[e].find((x) => x.id === id); Object.assign(r, parche); return copia(r); }
    },
    param: (id) => (params[id] === undefined ? 0 : params[id]),
    hoy: () => opciones.hoy || '2026-10-31',
    redondear,
    suma: (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0),
    agrupar: (a, f) => { const g = {}; a.forEach((x) => { const k = f(x); (g[k] = g[k] || []).push(x); }); return g; },
    fmt: { moneda: (n) => 'S/ ' + n.toFixed(2), fecha: (s) => s },
    fechaMas, mes: (s) => String(s || '').slice(0, 7), diasEntre
  };
}

const ent = (id) => C.entidades.find((e) => e.id === id);
const op = (id) => C.operaciones.find((o) => o.id === id);
const rep = (id) => C.reportes.find((r) => r.id === id);
const calc = (entidad, campo, r, ctx) => ent(entidad).calculados.find((k) => k.id === campo).formula(r, ctx);
const regla = (obj, id) => obj.reglas.find((k) => k.id === id).validar;
const igual = (real, esperado, msg) => assert.deepEqual(JSON.parse(JSON.stringify(real)), esperado, msg);

let n = 0;
function prueba(nombre, fn) {
  try { fn(); n += 1; } catch (e) { console.error('✗ ' + nombre + '\n  ' + (e && e.message ? e.message : e)); process.exitCode = 1; throw e; }
}

/* ---------- Calidad de datos ---------- */
const fuente = (extra) => Object.assign({ id: 'F1', frecuencia: 'Diaria', registros: 200, registrosIncompletos: 10, registrosDuplicados: 3, ultimaActualizacion: '2026-10-28' }, extra);

prueba('completitud y unicidad', () => {
  const ctx = crearCtx({});
  assert.equal(calc('fuentes', 'completitud', fuente(), ctx), 95);             // 1 − 10/200
  assert.equal(calc('fuentes', 'unicidad', fuente(), ctx), 98.5);              // 1 − 3/200
  assert.equal(calc('fuentes', 'completitud', fuente({ registrosIncompletos: 0 }), ctx), 100);
  assert.equal(calc('fuentes', 'completitud', fuente({ registrosIncompletos: 200 }), ctx), 0);
  assert.equal(calc('fuentes', 'unicidad', fuente({ registrosDuplicados: 1 }), ctx), 99.5);
  assert.equal(calc('fuentes', 'completitud', fuente({ registros: 3, registrosIncompletos: 1 }), ctx), 66.67);
  assert.equal(calc('fuentes', 'completitud', fuente({ registros: 0 }), ctx), 0, 'sin registros no se divide por cero');
  assert.equal(calc('fuentes', 'unicidad', fuente({ registros: 0 }), ctx), 0);
  assert.equal(calc('fuentes', 'completitud', { frecuencia: 'Diaria' }, ctx), 0);
});

prueba('vigencia según la frecuencia de carga', () => {
  const ctx = crearCtx({});      // hoy = 2026-10-31
  const vig = (frecuencia, edad) => calc('fuentes', 'vigencia', fuente({ frecuencia, ultimaActualizacion: fechaMas('2026-10-31', -edad) }), ctx);
  /* Diaria: tolerancia 2 días; baja 25 puntos por día hasta 0 a los 6 */
  [[0, 100], [1, 100], [2, 100], [3, 75], [4, 50], [5, 25], [6, 0], [30, 0]].forEach(([edad, esperado]) => assert.equal(vig('Diaria', edad), esperado, 'diaria, ' + edad + ' días'));
  /* Tiempo real y cada hora: tolerancia 1 día → 0 a los 3 */
  assert.equal(vig('Tiempo real', 1), 100);
  assert.equal(vig('Tiempo real', 2), 50);
  assert.equal(vig('Tiempo real', 3), 0);
  assert.equal(vig('Cada hora', 2), 50);
  /* Semanal: tolerancia 9 días; a los 12 pierde 3/18 */
  assert.equal(vig('Semanal', 9), 100);
  assert.equal(vig('Semanal', 12), 83.33);
  assert.equal(vig('Semanal', 27), 0);
  /* Mensual: tolerancia 35 días */
  assert.equal(vig('Mensual', 35), 100);
  assert.equal(vig('Mensual', 70), 50);
  assert.equal(vig('Mensual', 105), 0);
  /* frecuencia desconocida usa la tolerancia diaria */
  assert.equal(vig('Quincenal', 3), 75);
  /* fecha futura: no hay edad negativa; sin fecha, vigencia cero */
  assert.equal(calc('fuentes', 'vigencia', fuente({ ultimaActualizacion: '2026-11-15' }), ctx), 100);
  assert.equal(calc('fuentes', 'vigencia', fuente({ ultimaActualizacion: undefined }), ctx), 0);
});

prueba('puntaje de calidad ponderado y situación', () => {
  const ctx = crearCtx({});     // pesos 40 / 30 / 30 y mínimo 85
  /* completitud 95, unicidad 98,5, vigencia 75 (3 días de edad): (95×40 + 98,5×30 + 75×30) / 100 = 90,05 */
  const f = fuente({ ultimaActualizacion: '2026-10-28' });
  assert.equal(calc('fuentes', 'puntaje', f, ctx), 90.05);
  assert.equal(calc('fuentes', 'calidad', f, ctx), 'Cumple');
  /* los pesos mandan: 50 / 50 / 0 → (95 + 98,5) / 2 = 96,75; todos en cero → 0 */
  assert.equal(calc('fuentes', 'puntaje', f, crearCtx({}, { params: { pesoCompletitud: 50, pesoUnicidad: 50, pesoVigencia: 0 } })), 96.75);
  assert.equal(calc('fuentes', 'puntaje', f, crearCtx({}, { params: { pesoCompletitud: 0, pesoUnicidad: 0, pesoVigencia: 0 } })), 0);
  /* los pesos no necesitan sumar 100: 2 / 1 / 1 → completitud 90, unicidad 98,5, vigencia 100: (180 + 98,5 + 100) / 4 = 94,625 */
  assert.equal(calc('fuentes', 'puntaje', fuente({ ultimaActualizacion: '2026-10-29', registrosIncompletos: 20 }), crearCtx({}, { params: { pesoCompletitud: 2, pesoUnicidad: 1, pesoVigencia: 1 } })), 94.63);
  /* el mínimo es inclusivo: 85 cumple y 84,5 no */
  const solo = { pesoCompletitud: 50, pesoUnicidad: 50, pesoVigencia: 0 };
  assert.equal(calc('fuentes', 'calidad', fuente({ registros: 100, registrosIncompletos: 15, registrosDuplicados: 15 }), crearCtx({}, { params: solo })), 'Cumple');
  assert.equal(calc('fuentes', 'calidad', fuente({ registros: 100, registrosIncompletos: 16, registrosDuplicados: 15 }), crearCtx({}, { params: solo })), 'Bajo el mínimo');
  /* una fuente con datos viejos cae por vigencia aunque esté completa: 100/100/0 → 70 */
  assert.equal(calc('fuentes', 'puntaje', fuente({ registrosIncompletos: 0, registrosDuplicados: 0, ultimaActualizacion: '2026-10-20' }), ctx), 70);
  assert.equal(calc('fuentes', 'calidad', fuente({ registrosIncompletos: 0, registrosDuplicados: 0, ultimaActualizacion: '2026-10-20' }), ctx), 'Bajo el mínimo');
});

prueba('reglas de las fuentes', () => {
  const e = ent('fuentes');
  assert.equal(regla(e, 'incompletos-validos')({ registros: 5, registrosIncompletos: 5 }), true);
  assert.equal(regla(e, 'incompletos-validos')({ registros: 5, registrosIncompletos: 6 }), false);
  assert.equal(regla(e, 'duplicados-validos')({ registros: 5, registrosDuplicados: 5 }), true);
  assert.equal(regla(e, 'duplicados-validos')({ registros: 5, registrosDuplicados: 6 }), false);
  assert.equal(regla(e, 'actualizacion-posterior')({ fechaAlta: '2026-05-01', ultimaActualizacion: '2026-05-01' }), true);
  assert.equal(regla(e, 'actualizacion-posterior')({ fechaAlta: '2026-05-02', ultimaActualizacion: '2026-05-01' }), false);
});

/* ---------- Ejecución: costo de cómputo, SLA de entrega y rechazos ---------- */
const pipes = [{ id: 'P1', fuente: 'F1', nodos: 4, slaHoras: 2, activo: true }, { id: 'P2', fuente: 'F1', nodos: 1, slaHoras: 6, activo: false }, { id: 'P3', fuente: 'F2', nodos: 3, slaHoras: 1, activo: true }];

prueba('costo de cómputo = duración / 60 × nodos × tarifa', () => {
  const ctx = crearCtx({ pipelines: pipes });     // tarifa 3,6
  const calcular = op('ejecuciones').calcular;
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 90 }, ctx).total, 21.6);           // 1,5 h × 4 × 3,6
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 60 }, ctx).total, 14.4);
  assert.equal(calcular({ pipeline: 'P2', duracionMin: 1 }, ctx).total, 0.06);            // 3,6 / 60
  assert.equal(calcular({ pipeline: 'P3', duracionMin: 7 }, ctx).total, 1.26);            // 7/60 × 3 × 3,6
  assert.equal(calcular({ pipeline: 'P2', duracionMin: 10 }, crearCtx({ pipelines: pipes }, { params: { tarifaNodoHora: 1.85 } })).total, 0.31);   // 0,30833…
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 90 }, crearCtx({ pipelines: pipes }, { params: { tarifaNodoHora: 0 } })).total, 0);
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 0 }, ctx).total, 0);
  assert.equal(calcular({ duracionMin: 90 }, ctx).total, 0, 'sin pipeline no hay nodos');
  assert.equal(calcular({ pipeline: 'P1' }, ctx).total, 0);
});

prueba('tiempo de entrega, SLA y tasa de rechazo', () => {
  const ctx = crearCtx({ pipelines: pipes });
  const calcular = op('ejecuciones').calcular;
  /* espera 15 + duración 90 = 105 min frente a 2 h de SLA = 120 → 15 minutos de holgura */
  igual(calcular({ pipeline: 'P1', duracionMin: 90, esperaMin: 15, filasProcesadas: 1000, filasRechazadas: 25 }, ctx), { total: 21.6, entregaMin: 105, slaMin: 120, holguraMin: 15, tasaRechazo: 2.5 });
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 90, esperaMin: 30 }, ctx).holguraMin, 0, 'justo en el SLA');
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 90, esperaMin: 31 }, ctx).holguraMin, -1);
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 5 }, ctx).entregaMin, 5, 'sin espera registrada');
  assert.equal(calcular({ pipeline: 'P1', duracionMin: 5, filasProcesadas: 0, filasRechazadas: 0 }, ctx).tasaRechazo, 0, 'sin filas no se divide por cero');
  assert.equal(calcular({ pipeline: 'P3', duracionMin: 5, filasProcesadas: 3, filasRechazadas: 1 }, ctx).tasaRechazo, 33.33);
  assert.equal(calcular({ duracionMin: 5 }, ctx).slaMin, 0);
});

prueba('reglas de la ejecución', () => {
  const o = op('ejecuciones'), ctx = crearCtx({ pipelines: pipes });
  assert.equal(regla(o, 'rechazos-validos')({ filasProcesadas: 10, filasRechazadas: 10 }), true);
  assert.equal(regla(o, 'rechazos-validos')({ filasProcesadas: 10, filasRechazadas: 11 }), false);
  assert.equal(regla(o, 'pipeline-activo')({ pipeline: 'P1' }, ctx), true);
  assert.equal(regla(o, 'pipeline-activo')({ pipeline: 'P2' }, ctx), false);
  assert.equal(regla(ent('pipelines'), 'ventana-del-dia')({ horaInicio: 22, slaHoras: 2 }), true, 'termina a medianoche justo');
  assert.equal(regla(ent('pipelines'), 'ventana-del-dia')({ horaInicio: 23, slaHoras: 2 }), false);
  assert.equal(regla(ent('pipelines'), 'ventana-del-dia')({ horaInicio: 0, slaHoras: 24 }), true);
});

prueba('emitir y anular una ejecución actualiza la frescura de la fuente', () => {
  const datos = {
    pipelines: pipes,
    fuentes: [{ id: 'F1', ultimaActualizacion: '2026-10-20' }, { id: 'F2', ultimaActualizacion: '2026-10-30' }],
    ejecuciones: [
      { id: 'E0', pipeline: 'P1', fecha: '2026-10-25', estado: 'Exitosa' },
      { id: 'E1', pipeline: 'P2', fecha: '2026-10-28', estado: 'Con advertencias' },
      { id: 'E2', pipeline: 'P1', fecha: '2026-10-29', estado: 'Fallida' }
    ]
  };
  const ctx = crearCtx(datos), o = op('ejecuciones');
  o.alEmitir({ id: 'E3', pipeline: 'P1', fecha: '2026-10-30' }, ctx);
  assert.equal(datos.fuentes[0].ultimaActualizacion, '2026-10-30');
  o.alEmitir({ id: 'E4', pipeline: 'P3', fecha: '2026-10-25' }, ctx);
  assert.equal(datos.fuentes[1].ultimaActualizacion, '2026-10-30', 'una ejecución anterior no atrasa la fecha');
  /* al anular E3 la fecha vuelve a la última ejecución buena de esa fuente (E1, del 28; la fallida del 29 no cuenta) */
  datos.ejecuciones.push({ id: 'E3', pipeline: 'P1', fecha: '2026-10-30', estado: 'Anulada' });
  o.alAnular({ id: 'E3', pipeline: 'P1', fecha: '2026-10-30' }, ctx);
  assert.equal(datos.fuentes[0].ultimaActualizacion, '2026-10-28');
  /* anular una ejecución que no era la última no cambia nada */
  o.alAnular({ id: 'E0', pipeline: 'P1', fecha: '2026-10-25' }, ctx);
  assert.equal(datos.fuentes[0].ultimaActualizacion, '2026-10-28');
  /* si no queda otra ejecución buena, la fecha se conserva */
  datos.fuentes[1].ultimaActualizacion = '2026-10-25';
  o.alAnular({ id: 'E4', pipeline: 'P3', fecha: '2026-10-25' }, ctx);
  assert.equal(datos.fuentes[1].ultimaActualizacion, '2026-10-25');
});

/* ---------- Tickets y SLA de soporte ---------- */
prueba('costo y SLA de un ticket por prioridad', () => {
  const ctx = crearCtx({});      // 48 por hora · SLA 4 / 8 / 24 / 72
  const calcular = op('tickets').calcular;
  igual(calcular({ prioridad: 'Crítica', horasResolucion: 3.5, horasTrabajo: 3.5 }, ctx), { total: 168, slaHoras: 4, holguraHoras: 0.5, cumple: 1 });
  igual(calcular({ prioridad: 'Crítica', horasResolucion: 4, horasTrabajo: 2 }, ctx), { total: 96, slaHoras: 4, holguraHoras: 0, cumple: 1 });
  igual(calcular({ prioridad: 'Crítica', horasResolucion: 4.01, horasTrabajo: 2 }, ctx), { total: 96, slaHoras: 4, holguraHoras: -0.01, cumple: 0 });
  assert.equal(calcular({ prioridad: 'Alta', horasResolucion: 9, horasTrabajo: 1 }, ctx).slaHoras, 8);
  assert.equal(calcular({ prioridad: 'Alta', horasResolucion: 9, horasTrabajo: 1 }, ctx).cumple, 0);
  assert.equal(calcular({ prioridad: 'Media', horasResolucion: 24, horasTrabajo: 1 }, ctx).cumple, 1);
  assert.equal(calcular({ prioridad: 'Baja', horasResolucion: 72, horasTrabajo: 1 }, ctx).cumple, 1);
  assert.equal(calcular({ prioridad: 'Baja', horasResolucion: 72.5, horasTrabajo: 1 }, ctx).holguraHoras, -0.5);
  assert.equal(calcular({ prioridad: 'Urgente', horasResolucion: 25, horasTrabajo: 1 }, ctx).slaHoras, 24, 'una prioridad desconocida usa la media');
  assert.equal(calcular({ prioridad: 'Media', horasResolucion: 5, horasTrabajo: 0.333 }, ctx).total, 15.98);        // 15,984
  assert.equal(calcular({ prioridad: 'Media', horasResolucion: 5, horasTrabajo: 2 }, crearCtx({}, { params: { tarifaSoporteHora: 60, slaMedia: 3 } })).total, 120);
  assert.equal(calcular({ prioridad: 'Media', horasResolucion: 5, horasTrabajo: 2 }, crearCtx({}, { params: { slaMedia: 3 } })).cumple, 0, 'el SLA sale del parámetro');
  assert.equal(calcular({}, ctx).total, 0);
  assert.equal(regla(op('tickets'), 'respuesta-antes')({ horasRespuesta: 3, horasResolucion: 3 }), true);
  assert.equal(regla(op('tickets'), 'respuesta-antes')({ horasRespuesta: 3.1, horasResolucion: 3 }), false);
});

prueba('un ticket por error de datos pone el tablero en revisión y al anular se repone', () => {
  const datos = {
    tableros: [{ id: 'T1', estado: 'En producción' }, { id: 'T2', estado: 'En desarrollo' }],
    tickets: [{ id: 'K1', tablero: 'T1', tipo: 'Error en datos', estado: 'Atendido' }]
  };
  const ctx = crearCtx(datos), o = op('tickets');
  o.alEmitir({ id: 'K2', tablero: 'T1', tipo: 'Consulta' }, ctx);
  assert.equal(datos.tableros[0].estado, 'En producción', 'una consulta no lo afecta');
  o.alEmitir({ id: 'K3', tablero: 'T2', tipo: 'Error en datos' }, ctx);
  assert.equal(datos.tableros[1].estado, 'En desarrollo', 'solo un tablero en producción pasa a revisión');
  o.alEmitir({ id: 'K4', tablero: 'T1', tipo: 'Error en datos' }, ctx);
  assert.equal(datos.tableros[0].estado, 'En revisión');
  o.alEmitir({ id: 'K5', tipo: 'Error en datos' }, ctx);
  /* con otro ticket de error atendido sigue en revisión; sin ninguno, vuelve a producción */
  datos.tickets.push({ id: 'K4', tablero: 'T1', tipo: 'Error en datos', estado: 'Anulado' });
  o.alAnular({ id: 'K4', tablero: 'T1', tipo: 'Error en datos' }, ctx);
  assert.equal(datos.tableros[0].estado, 'En revisión', 'queda K1');
  datos.tickets[0].estado = 'Anulado';
  o.alAnular({ id: 'K1', tablero: 'T1', tipo: 'Error en datos' }, ctx);
  assert.equal(datos.tableros[0].estado, 'En producción');
});

/* ---------- Pipelines, tableros y clientes ---------- */
prueba('tasa de éxito del pipeline y datos derivados', () => {
  const datos = {
    fuentes: [{ id: 'F1', cliente: 'C1' }],
    clientes: [{ id: 'C1', nombre: 'Cliente uno' }],
    ejecuciones: [
      { id: 'E1', pipeline: 'P1', estado: 'Exitosa' }, { id: 'E2', pipeline: 'P1', estado: 'Exitosa' }, { id: 'E3', pipeline: 'P1', estado: 'Con advertencias' }, { id: 'E4', pipeline: 'P1', estado: 'Fallida' },
      { id: 'E5', pipeline: 'P1', estado: 'Anulada' }, { id: 'E6', pipeline: 'P1', estado: 'Programada' }, { id: 'E7', pipeline: 'P2', estado: 'Programada' }
    ],
    tickets: [{ id: 'K1', tablero: 'T1', estado: 'Atendido' }, { id: 'K2', tablero: 'T1', estado: 'Anulado' }, { id: 'K3', tablero: 'T1', estado: 'Borrador' }, { id: 'K4', tablero: 'T1', estado: 'Escalado a ingeniería' }]
  };
  const ctx = crearCtx(datos);
  assert.equal(calc('pipelines', 'tasaExito', { id: 'P1' }, ctx), 50);                // 2 de 4 ejecutadas
  assert.equal(calc('pipelines', 'tasaExito', { id: 'P2' }, ctx), null, 'solo programadas');
  assert.equal(calc('pipelines', 'cliente', { fuente: 'F1' }, ctx), 'Cliente uno');
  assert.equal(calc('pipelines', 'cliente', { fuente: 'XX' }, ctx), '');
  assert.equal(calc('tableros', 'diasEnProduccion', { estado: 'En producción', fechaEntrega: '2026-10-01' }, ctx), 30);
  assert.equal(calc('tableros', 'diasEnProduccion', { estado: 'En producción', fechaEntrega: '2026-11-05' }, ctx), 0);
  assert.equal(calc('tableros', 'diasEnProduccion', { estado: 'Retirado', fechaEntrega: '2026-10-01' }, ctx), null);
  assert.equal(calc('tableros', 'ticketsAbiertos', { id: 'T1' }, ctx), 2);
});

prueba('cómputo de 30 días del cliente y su peso sobre la mensualidad', () => {
  const datos = {
    fuentes: [{ id: 'F1', cliente: 'C1' }, { id: 'F2', cliente: 'C2' }],
    pipelines: [{ id: 'P1', fuente: 'F1' }, { id: 'P2', fuente: 'F2' }],
    ejecuciones: [
      { id: 'E1', pipeline: 'P1', estado: 'Exitosa', fecha: '2026-10-02', totales: { total: 100.5 } },   // hoy − 29: entra
      { id: 'E2', pipeline: 'P1', estado: 'Fallida', fecha: '2026-10-31', totales: { total: 49.5 } },
      { id: 'E3', pipeline: 'P1', estado: 'Exitosa', fecha: '2026-10-01', totales: { total: 999 } },    // hoy − 30: fuera
      { id: 'E4', pipeline: 'P1', estado: 'Anulada', fecha: '2026-10-15', totales: { total: 999 } },
      { id: 'E5', pipeline: 'P2', estado: 'Exitosa', fecha: '2026-10-15', totales: { total: 70 } }
    ]
  };
  const ctx = crearCtx(datos);
  assert.equal(calc('clientes', 'costoComputo', { id: 'C1' }, ctx), 150);
  assert.equal(calc('clientes', 'costoComputo', { id: 'C2' }, ctx), 70);
  assert.equal(calc('clientes', 'costoComputo', { id: 'C3' }, ctx), 0);
  assert.equal(calc('clientes', 'pesoComputo', { id: 'C1', mensualidad: 5000 }, ctx), 3);
  assert.equal(calc('clientes', 'pesoComputo', { id: 'C2', mensualidad: 3100 }, ctx), 2.26);
  assert.equal(calc('clientes', 'pesoComputo', { id: 'C1' }, ctx), null, 'sin mensualidad no hay porcentaje');
});

/* ---------- Reportes y tablero ---------- */
const ej = (id, pipeline, fecha, estado, duracion, espera, nodosCosto) => ({ id, pipeline, fecha, estado, duracionMin: duracion, filasProcesadas: 1000, totales: { total: nodosCosto, entregaMin: duracion + espera, slaMin: 120 } });

prueba('reportes de ejecuciones, SLA y costo con datos mínimos', () => {
  const datos = {
    clientes: [{ id: 'C1', nombre: 'Cliente uno' }, { id: 'C2', nombre: 'Cliente dos' }],
    fuentes: [{ id: 'F1', cliente: 'C1' }, { id: 'F2', cliente: 'C2' }],
    pipelines: [{ id: 'P1', nombre: 'Pipeline 1', fuente: 'F1', nodos: 2 }, { id: 'P2', nombre: 'Pipeline 2', fuente: 'F2', nodos: 4 }],
    ejecuciones: [
      ej('E1', 'P1', '2026-09-10', 'Exitosa', 60, 0, 7.2),
      ej('E2', 'P1', '2026-09-20', 'Con advertencias', 100, 20, 12),      // 120 = SLA: a tiempo
      ej('E3', 'P1', '2026-10-05', 'Exitosa', 100, 21, 12),                // 121: tarde
      ej('E4', 'P2', '2026-10-06', 'Fallida', 30, 0, 7.2),
      ej('E5', 'P2', '2026-10-07', 'Exitosa', 60, 0, 14.4),
      ej('E6', 'P2', '2026-10-08', 'Anulada', 60, 0, 99),
      ej('E7', 'P2', '2026-10-09', 'Programada', 60, 0, 99)
    ],
    tickets: [
      { id: 'K1', cliente: 'C1', estado: 'Atendido', fecha: '2026-10-01', prioridad: 'Alta', horasResolucion: 8, horasTrabajo: 2, totales: { total: 96 } },
      { id: 'K2', cliente: 'C1', estado: 'Atendido', fecha: '2026-10-02', prioridad: 'Alta', horasResolucion: 8.5, horasTrabajo: 3, totales: { total: 144 } },
      { id: 'K3', cliente: 'C2', estado: 'Escalado a ingeniería', fecha: '2026-10-03', prioridad: 'Crítica', horasResolucion: 3, horasTrabajo: 1, totales: { total: 48 } },
      { id: 'K4', cliente: 'C2', estado: 'Anulado', fecha: '2026-10-03', prioridad: 'Crítica', horasResolucion: 99, horasTrabajo: 1, totales: { total: 48 } }
    ]
  };
  const ctx = crearCtx(datos);
  const rango = { desde: '2026-01-01', hasta: '2026-10-31' };
  const r1 = rep('ejecuciones-pipeline').ejecutar(rango, ctx);
  /* P1: 3 ejecuciones, 2 exitosas (66,67 %), duración media 86,67 · P2: 2 ejecutadas (la anulada y la programada no cuentan), 1 exitosa (50 %) */
  igual(r1.filas.map((f) => f.slice(0, 6)), [['Pipeline 2', 2, 1, 0, 1, 50], ['Pipeline 1', 3, 2, 1, 0, 66.67]]);
  assert.equal(r1.filas[1][7], 86.67);
  assert.equal(r1.resumen[1].valor, 60, '3 exitosas de 5');
  assert.equal(r1.resumen[3].valor, 5000);
  assert.equal(rep('ejecuciones-pipeline').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx).filas.length, 0);
  assert.equal(rep('ejecuciones-pipeline').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx).resumen[1].valor, null);
  const r2 = rep('sla-cliente').ejecutar(rango, ctx);
  /* Cliente uno: 3 entregas, 2 a tiempo (66,67 %); 2 tickets, 1 en SLA (50 %) — Cliente dos: 2 entregas, 1 a tiempo (la fallida no entrega) = 50 %; 1 ticket en SLA (100 %) */
  const porNombre = {};
  r2.filas.forEach((f) => { porNombre[f[0]] = f; });
  igual(porNombre['Cliente uno'].slice(1), [3, 2, 66.67, 2, 1, 50]);
  igual(porNombre['Cliente dos'].slice(1), [2, 1, 50, 1, 1, 100]);
  assert.equal(r2.resumen[0].valor, 60, '3 de 5 entregas');
  assert.equal(r2.resumen[1].valor, 66.67, '2 de 3 tickets');
  assert.equal(r2.resumen[2].valor, 2);
  const r3 = rep('costo-computo').ejecutar(rango, ctx);
  /* septiembre: E1 + E2 = 19,2 (2 ejecuciones, nodos-hora 1 × 2 + 1,6667 × 2 = 5,33); octubre: E3 + E4 + E5 = 33,6 */
  igual(r3.filas.map((f) => [f[0], f[1], f[3], f[4]]), [['sep 2026', 2, 19.2, 9.6], ['oct 2026', 3, 33.6, 11.2]]);
  assert.equal(r3.filas[0][2], 5.33);
  assert.equal(r3.resumen[0].valor, 52.8);
  assert.equal(r3.resumen[2].valor, 10.56);
  const r4 = rep('tickets-prioridad').ejecutar(rango, ctx);
  igual(r4.filas.map((f) => f.slice(0, 5)), [['Crítica', 1, 1, 100, 4], ['Alta', 2, 1, 50, 8]]);
  assert.equal(r4.filas[1][5], 8.25);
  assert.equal(r4.resumen[2].valor, 288);
});

prueba('reporte de calidad por fuente y su filtro', () => {
  const datos = {
    clientes: [{ id: 'C1', nombre: 'Cliente uno' }],
    fuentes: [
      fuente({ id: 'F1', nombre: 'Buena', cliente: 'C1', endpoint: 'srv1:5432', fechaAlta: '2026-03-01', ultimaActualizacion: '2026-10-31', registrosIncompletos: 0, registrosDuplicados: 0 }),
      fuente({ id: 'F2', nombre: 'Mala', cliente: 'C1', endpoint: 'srv2:1433', fechaAlta: '2026-04-01', ultimaActualizacion: '2026-10-01', registrosIncompletos: 100 })
    ]
  };
  const ctx = crearCtx(datos);
  const todo = rep('calidad-fuentes').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31', filtro: 'Todas las fuentes' }, ctx);
  igual(todo.filas.map((f) => [f[0], f[2], f[6], f[7]]), [['Mala', 'srv2:1433', 49.55, 'Bajo el mínimo'], ['Buena', 'srv1:5432', 100, 'Cumple']]);
  assert.equal(todo.resumen[0].valor, 74.78);   // (49,55 + 100) / 2
  assert.equal(todo.resumen[1].valor, 1);
  const malas = rep('calidad-fuentes').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31', filtro: 'Solo bajo el mínimo' }, ctx);
  assert.equal(malas.filas.length, 1);
  assert.equal(malas.resumen[1].valor, 1, 'el conteo no depende del filtro');
  assert.equal(rep('calidad-fuentes').ejecutar({ desde: '2026-03-15', hasta: '2026-10-31', filtro: 'Todas las fuentes' }, ctx).filas.length, 1, 'el filtro de fechas aplica a la incorporación');
  assert.equal(rep('calidad-fuentes').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx).resumen[0].valor, null);
});

prueba('tablero: indicadores con datos mínimos', () => {
  const datos = {
    clientes: [], fuentes: [fuente({ id: 'F1', ultimaActualizacion: '2026-10-31', registrosIncompletos: 0, registrosDuplicados: 0 }), fuente({ id: 'F2', ultimaActualizacion: '2026-09-01' })],
    pipelines: [], tableros: [],
    ejecuciones: [
      ej('E1', 'P1', '2026-10-30', 'Exitosa', 60, 0, 10),
      ej('E2', 'P1', '2026-10-29', 'Con advertencias', 60, 90, 5),     // 150 > 120: tarde
      ej('E3', 'P1', '2026-10-28', 'Fallida', 10, 0, 1),
      ej('E4', 'P1', '2026-10-01', 'Exitosa', 10, 0, 999)               // fuera de los 30 días
    ],
    tickets: [
      { id: 'K1', estado: 'Atendido', fecha: '2026-10-20', prioridad: 'Baja', horasResolucion: 80 },
      { id: 'K2', estado: 'Atendido', fecha: '2026-10-21', prioridad: 'Baja', horasResolucion: 10 },
      { id: 'K3', estado: 'Atendido', fecha: '2026-08-01', prioridad: 'Baja', horasResolucion: 500 }
    ]
  };
  const ctx = crearCtx(datos);
  const ind = (t) => C.tablero.find((x) => x.titulo.indexOf(t) === 0).calcular(ctx);
  assert.equal(ind('Ejecuciones'), 3);
  assert.equal(ind('Tasa de éxito'), 33.33);
  assert.equal(ind('Entregas dentro del SLA'), 33.33, 'solo E1 llega a tiempo');
  assert.equal(ind('Costo de cómputo'), 16);
  assert.equal(ind('Fuentes bajo el mínimo'), 1);
  assert.equal(ind('Tickets fuera de SLA'), 1);
  const g = C.tableroGrafico.calcular(ctx);
  igual(g.valores.slice(-2), [0, 4]);   // las cuatro ejecuciones de octubre (E4 incluida)
});

console.log('fabrica-bi · formulas.test.mjs · ' + n + ' pruebas OK');
