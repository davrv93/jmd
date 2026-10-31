/*
 * Prueba de las fórmulas de «colegio» SIN navegador.
 *   node sistemas/colegio/formulas.test.mjs
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
        Object.keys(parche).forEach((k) => { if (parche[k] === null) { delete r[k]; } else { r[k] = parche[k]; } });
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
const regla = (e, id) => ent(e).reglas.filter((r) => r.id === id)[0].validar;
const rep = (id) => SIS.reportes.filter((r) => r.id === id)[0];
/* Las matrices vienen de otro contexto (node:vm): se comparan por su JSON. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, (msg || '') + ' esperado ' + b + ', salió ' + a);

/* ---------- datos mínimos ---------- */
function base() {
  return {
    apoderados: [{ id: 'AP1', nombre: 'Rosa Inventada' }, { id: 'AP2', nombre: 'Luis Inventado' }],
    alumnos: [
      { id: 'A1', nombre: 'Alumno Uno', grado: '5° Primaria', seccion: 'A', apoderado: 'AP1', pensionMensual: 400, becaPct: 0, estado: 'Matriculado', anioMatricula: 2026 },
      { id: 'A2', nombre: 'Alumna Dos', grado: '5° Primaria', seccion: 'A', apoderado: 'AP2', pensionMensual: 400, becaPct: 25, estado: 'Matriculado', anioMatricula: 2026 },
      { id: 'A3', nombre: 'Alumno Tres', grado: '6° Primaria', seccion: 'A', apoderado: 'AP2', pensionMensual: 380, becaPct: 0, estado: 'Matriculado', anioMatricula: 2026 }
    ],
    cursos: [
      { id: 'C1', nombre: 'Matemática 5P', grado: '5° Primaria', seccion: 'A', horasSemanales: 6, docente: 'D1' },
      { id: 'C2', nombre: 'Comunicación 5P', grado: '5° Primaria', seccion: 'A', horasSemanales: 4, docente: 'D1' },
      { id: 'C3', nombre: 'Matemática 6P', grado: '6° Primaria', seccion: 'A', horasSemanales: 4, docente: 'D1' }
    ],
    docentes: [{ id: 'D1', nombre: 'Docente Inventado' }],
    notas: [], pensiones: [], matriculas: []
  };
}
const nota = (id, fecha, alumno, curso, bim, t, p, e, dias, faltas) => ({ id, fecha, alumno, curso, bimestre: bim, tareas: t, practica: p, examen: e, diasClase: dias, faltas });

let n = 0;
function prueba(nombre, fn) { fn(); n++; console.log('  ok  ' + nombre); }

/* ================= Notas: promedio ponderado, escala literal, asistencia ================= */
prueba('Nota del bimestre: pesos 25/25/50 → (16×25 + 14×25 + 12×50) ÷ 100 = 13.5', () => {
  const ctx = crearCtx(base());
  cerca(cal('notas', 'promedio')({ tareas: 16, practica: 14, examen: 12 }, ctx), 13.5);
  cerca(cal('notas', 'promedio')({ tareas: 20, practica: 20, examen: 20 }, ctx), 20);
  cerca(cal('notas', 'promedio')({ tareas: 0, practica: 0, examen: 0 }, ctx), 0);
  cerca(cal('notas', 'promedio')({ tareas: 11, practica: 13, examen: 15 }, ctx), 13.5, '(275 + 325 + 750) ÷ 100');
});

prueba('La nota sigue los pesos de Configuración (si suman distinto de 100 se usan como proporción)', () => {
  const ctx = crearCtx(base());
  ctx.params.pesoTareas = 10; ctx.params.pesoPractica = 10; ctx.params.pesoExamen = 20;   // suma 40
  cerca(cal('notas', 'promedio')({ tareas: 16, practica: 14, examen: 12 }, ctx), 13.5, '(160 + 140 + 240) ÷ 40');
  ctx.params.pesoTareas = 0; ctx.params.pesoPractica = 0; ctx.params.pesoExamen = 0;
  assert.equal(cal('notas', 'promedio')({ tareas: 16, practica: 14, examen: 12 }, ctx), 0, 'sin pesos no hay división por cero');
});

prueba('Escala literal AD/A/B/C con sus límites exactos', () => {
  const ctx = crearCtx(base());
  const lit = (x) => cal('notas', 'literal')({ tareas: x, practica: x, examen: x }, ctx);
  assert.equal(lit(0), 'C');
  assert.equal(lit(10.99), 'C');
  assert.equal(lit(11), 'B');
  assert.equal(lit(13.99), 'B');
  assert.equal(lit(14), 'A');
  assert.equal(lit(17.99), 'A');
  assert.equal(lit(18), 'AD');
  assert.equal(lit(20), 'AD');
});

prueba('Asistencia % = (días de clase − faltas) ÷ días de clase; sin días de clase no divide por cero', () => {
  const ctx = crearCtx(base());
  const as = cal('notas', 'asistencia');
  cerca(as({ diasClase: 40, faltas: 4 }, ctx), 90);
  cerca(as({ diasClase: 40, faltas: 3 }, ctx), 92.5);
  cerca(as({ diasClase: 40, faltas: 40 }, ctx), 0);
  cerca(as({ diasClase: 40 }, ctx), 100, 'sin faltas');
  assert.equal(as({ diasClase: 0, faltas: 0 }, ctx), 0);
});

prueba('Reglas de notas: curso del alumno, faltas posibles y un registro por bimestre', () => {
  const d = base(), ctx = crearCtx(d);
  const rc = regla('notas', 'curso-del-alumno'), rf = regla('notas', 'faltas-posibles'), ru = regla('notas', 'un-registro-por-bimestre');
  assert.equal(rc({ alumno: 'A1', curso: 'C1' }, ctx), true);
  assert.equal(rc({ alumno: 'A1', curso: 'C3' }, ctx), false, 'curso de otro grado');
  assert.equal(rc({ alumno: 'A1', curso: 'NO' }, ctx), false);
  assert.equal(rf({ faltas: 40, diasClase: 40 }, ctx), true);
  assert.equal(rf({ faltas: 41, diasClase: 40 }, ctx), false);
  d.notas.push(nota('N1', '2026-05-10', 'A1', 'C1', 'I Bimestre', 10, 10, 10, 40, 0));
  assert.equal(ru({ alumno: 'A1', curso: 'C1', bimestre: 'I Bimestre' }, ctx), false, 'duplicado');
  assert.equal(ru({ id: 'N1', alumno: 'A1', curso: 'C1', bimestre: 'I Bimestre' }, ctx), true, 'al editar el mismo registro');
  assert.equal(ru({ alumno: 'A1', curso: 'C1', bimestre: 'II Bimestre' }, ctx), true);
});

/* ================= Alumnos ================= */
function conNotas() {
  const d = base();
  // A1: C1 todo 16 (40 días, 0 faltas), C2 todo 10 (40 días, 4 faltas)  → (16×6 + 10×4) ÷ 10 = 13.6 ; asistencia 76/80 = 95 %
  d.notas.push(nota('N1', '2026-05-10', 'A1', 'C1', 'I Bimestre', 16, 16, 16, 40, 0));
  d.notas.push(nota('N2', '2026-05-10', 'A1', 'C2', 'I Bimestre', 10, 10, 10, 40, 4));
  // A2: 12 en ambos cursos, 20 faltas de 40 en cada uno → promedio 12 ; asistencia 50 %
  d.notas.push(nota('N3', '2026-05-11', 'A2', 'C1', 'I Bimestre', 12, 12, 12, 40, 20));
  d.notas.push(nota('N4', '2026-05-11', 'A2', 'C2', 'I Bimestre', 12, 12, 12, 40, 20));
  // A3: 9 y 16 faltas de 40 → promedio 9 ; asistencia 60 %
  d.notas.push(nota('N5', '2026-05-12', 'A3', 'C3', 'I Bimestre', 9, 9, 9, 40, 16));
  return d;
}

prueba('Alumno: promedio ponderado por horas del curso y asistencia global', () => {
  const ctx = crearCtx(conNotas());
  const al = (id) => ctx.datos.obtener('alumnos', id);
  cerca(cal('alumnos', 'promedio')(al('A1'), ctx), 13.6);
  cerca(cal('alumnos', 'asistencia')(al('A1'), ctx), 95);
  cerca(cal('alumnos', 'promedio')(al('A2'), ctx), 12);
  cerca(cal('alumnos', 'asistencia')(al('A2'), ctx), 50);
});

prueba('Alumno sin notas: promedio y asistencia vacíos (null), no 0 ni NaN', () => {
  const ctx = crearCtx(base());
  assert.equal(cal('alumnos', 'promedio')(ctx.datos.obtener('alumnos', 'A1'), ctx), null);
  assert.equal(cal('alumnos', 'asistencia')(ctx.datos.obtener('alumnos', 'A1'), ctx), null);
});

prueba('Edad: cumpleaños ya pasado, de hoy y por llegar', () => {
  const ctx = crearCtx(base(), '2026-10-31');
  const e = cal('alumnos', 'edad');
  assert.equal(e({ fechaNacimiento: '2014-05-08' }, ctx), 12);
  assert.equal(e({ fechaNacimiento: '2014-10-31' }, ctx), 12, 'cumple años hoy');
  assert.equal(e({ fechaNacimiento: '2014-11-01' }, ctx), 11, 'cumple mañana');
});

prueba('Regla de beca: no supera el máximo de Configuración (50 %)', () => {
  const ctx = crearCtx(base());
  const r = regla('alumnos', 'beca-con-tope');
  assert.equal(r({ becaPct: 50 }, ctx), true);
  assert.equal(r({ becaPct: 50.5 }, ctx), false);
  assert.equal(r({ becaPct: 0 }, ctx), true);
  assert.equal(r({}, ctx), true, 'sin beca');
});

prueba('Apoderado: hijos matriculados; Docente: cursos a cargo', () => {
  const d = base(), ctx = crearCtx(d);
  assert.equal(cal('apoderados', 'hijos')({ id: 'AP2' }, ctx), 2);
  d.alumnos[2].estado = 'Retirado';
  assert.equal(cal('apoderados', 'hijos')({ id: 'AP2' }, ctx), 1);
  assert.equal(cal('docentes', 'cursos')({ id: 'D1' }, ctx), 3);
});

/* ================= Pensiones: beca y mora ================= */
const PEN = op('pensiones');
const pen = (alumno, venc, pago) => PEN.calcular({ alumno, vencimiento: venc, fechaPago: pago }, crearCtx(base(), '2026-10-31'));

prueba('Pensión pagada dentro del plazo de gracia (3 días) no paga mora', () => {
  const t = pen('A1', '2026-10-05', '2026-10-05');
  cerca(t.pension, 400); cerca(t.mora, 0); cerca(t.total, 400); assert.equal(t.diasAtraso, 0);
  const g = pen('A1', '2026-10-05', '2026-10-08');
  cerca(g.mora, 0, 'justo en el último día de gracia'); cerca(g.total, 400);
});

prueba('Mora: 1.5 % mensual prorrateado por días sobre la pensión neta (4 días y 30 días de atraso)', () => {
  const t4 = pen('A1', '2026-10-05', '2026-10-09');
  cerca(t4.mora, 0.8, '400 × 1.5 % × 4/30'); cerca(t4.total, 400.8); assert.equal(t4.diasAtraso, 4);
  const t30 = pen('A1', '2026-10-05', '2026-11-04');
  cerca(t30.mora, 6, '400 × 1.5 % × 30/30'); cerca(t30.total, 406);
});

prueba('Beca 25 %: la mora se calcula sobre la pensión neta', () => {
  const t = pen('A2', '2026-10-05', '2026-11-04');
  cerca(t.pension, 400); cerca(t.descuento, 100); cerca(t.neto, 300);
  cerca(t.mora, 4.5, '300 × 1.5 %'); cerca(t.total, 304.5);
});

prueba('Pensión sin fecha de pago: la mora corre hasta hoy (26 días de atraso al 31-10)', () => {
  const t = PEN.calcular({ alumno: 'A1', vencimiento: '2026-10-05' }, crearCtx(base(), '2026-10-31'));
  assert.equal(t.diasAtraso, 26);
  cerca(t.mora, 5.2, '400 × 1.5 % × 26/30'); cerca(t.total, 405.2);
});

prueba('Pensión pagada antes del vencimiento, sin alumno o sin vencimiento: sin mora y sin NaN', () => {
  cerca(pen('A1', '2026-10-05', '2026-09-30').mora, 0);
  const sin = PEN.calcular({ alumno: 'NO', vencimiento: '2026-10-05', fechaPago: '2026-10-20' }, crearCtx(base()));
  cerca(sin.total, 0); cerca(sin.mora, 0);
  const sv = PEN.calcular({ alumno: 'A1' }, crearCtx(base()));
  cerca(sv.total, 400);
  Object.keys(sv).forEach((k) => assert.ok(isFinite(sv[k]), k + ' finito'));
});

prueba('Regla: no se cobra a un alumno retirado', () => {
  const d = base(), ctx = crearCtx(d);
  const r = PEN.reglas.filter((x) => x.id === 'alumno-activo')[0].validar;
  assert.equal(r({ alumno: 'A1' }, ctx), true);
  d.alumnos[0].estado = 'Retirado';
  assert.equal(r({ alumno: 'A1' }, ctx), false);
  assert.equal(r({ alumno: 'NO' }, ctx), false);
});

prueba('alEmitir de pensión: exige fecha de pago, evita cobrar dos veces el mismo mes y guarda el último pago', () => {
  const d = base(), ctx = crearCtx(d);
  assert.throws(() => PEN.alEmitir({ id: 'P1', alumno: 'A1', mes: 'Octubre', vencimiento: '2026-10-05' }, ctx), /fecha de pago/);
  d.pensiones.push({ id: 'P0', alumno: 'A1', mes: 'Octubre', vencimiento: '2026-10-05', fechaPago: '2026-10-06', estado: 'Pagada', numero: 'REC1-00000001' });
  assert.throws(() => PEN.alEmitir({ id: 'P1', alumno: 'A1', mes: 'Octubre', vencimiento: '2026-10-05', fechaPago: '2026-10-20' }, ctx), /ya fue cobrada \(REC1-00000001\)/);
  PEN.alEmitir({ id: 'P2', alumno: 'A1', mes: 'Noviembre', vencimiento: '2026-11-05', fechaPago: '2026-10-30' }, ctx);
  assert.equal(d.alumnos[0].ultimoPago, '2026-10-30');
  PEN.alEmitir({ id: 'P3', alumno: 'A1', mes: 'Octubre', vencimiento: '2025-10-05', fechaPago: '2025-10-06' }, ctx);   // otro año: se permite
});

prueba('alAnular de pensión: el último pago vuelve al más reciente de los pagos que quedan (o se borra)', () => {
  const d = base(), ctx = crearCtx(d);
  d.pensiones.push({ id: 'P0', alumno: 'A1', estado: 'Pagada', fechaPago: '2026-09-06' });
  d.pensiones.push({ id: 'P1', alumno: 'A1', estado: 'Pagada', fechaPago: '2026-10-06' });
  d.alumnos[0].ultimoPago = '2026-10-06';
  PEN.alAnular({ id: 'P1', alumno: 'A1' }, ctx);
  assert.equal(d.alumnos[0].ultimoPago, '2026-09-06');
  d.pensiones = [];
  PEN.alAnular({ id: 'P0', alumno: 'A1' }, ctx);
  assert.equal(d.alumnos[0].ultimoPago, undefined);
});

/* ================= Matrículas ================= */
const MAT = op('matriculas');

prueba('Matrícula: derecho 350 + seguro 35; los hermanos matriculados dan 15 % de descuento sobre el derecho', () => {
  const ctx = crearCtx(base());
  const sola = MAT.calcular({ alumno: 'A1', tipo: 'Ratificación' }, ctx);
  cerca(sola.derecho, 350); cerca(sola.descuento, 0); cerca(sola.ingreso, 0); cerca(sola.seguro, 35); cerca(sola.total, 385);
  const herm = MAT.calcular({ alumno: 'A2', tipo: 'Ratificación' }, ctx);      // A2 y A3 comparten apoderado
  cerca(herm.descuento, 52.5, '350 × 15 %'); cerca(herm.total, 332.5, '350 − 52.5 + 35');
  assert.equal(herm.hermanos, 1);
});

prueba('Matrícula de nuevo ingreso suma la cuota de ingreso (400); un hermano retirado no da descuento', () => {
  const d = base(), ctx = crearCtx(d);
  cerca(MAT.calcular({ alumno: 'A1', tipo: 'Nuevo ingreso' }, ctx).total, 785, '350 + 400 + 35');
  cerca(MAT.calcular({ alumno: 'A2', tipo: 'Nuevo ingreso' }, ctx).total, 732.5, '350 − 52.5 + 400 + 35');
  d.alumnos[2].estado = 'Retirado';
  cerca(MAT.calcular({ alumno: 'A2', tipo: 'Ratificación' }, ctx).total, 385);
  const sin = MAT.calcular({ alumno: 'NO', tipo: 'Ratificación' }, ctx);
  cerca(sin.total, 385); assert.equal(sin.hermanos, 0);
});

prueba('Regla: una sola matrícula confirmada por alumno y año', () => {
  const d = base(), ctx = crearCtx(d);
  const r = MAT.reglas[0].validar;
  d.matriculas.push({ id: 'M1', alumno: 'A1', anio: '2027', estado: 'Matriculada' });
  assert.equal(r({ alumno: 'A1', anio: '2027' }, ctx), false);
  assert.equal(r({ id: 'M1', alumno: 'A1', anio: '2027' }, ctx), true, 'la misma matrícula');
  assert.equal(r({ alumno: 'A1', anio: '2026' }, ctx), true);
  d.matriculas[0].estado = 'Anulada';
  assert.equal(r({ alumno: 'A1', anio: '2027' }, ctx), true);
});

prueba('alEmitir de matrícula: bloquea con pensiones vencidas o alumno retirado y, si procede, actualiza el año', () => {
  const d = base(), ctx = crearCtx(d);
  d.pensiones.push({ id: 'P1', alumno: 'A1', estado: 'Por cobrar', vencimiento: '2026-10-05' });
  assert.throws(() => MAT.alEmitir({ alumno: 'A1', anio: '2027' }, ctx), /1 pensión\(es\) vencida\(s\)/);
  d.pensiones[0].vencimiento = '2026-11-05';
  MAT.alEmitir({ alumno: 'A1', anio: '2027' }, ctx);
  assert.equal(d.alumnos[0].anioMatricula, 2027, 'una pensión aún no vencida no bloquea');
  MAT.alEmitir({ alumno: 'A1', anio: '2026' }, ctx);
  assert.equal(d.alumnos[0].anioMatricula, 2027, 'no retrocede');
  d.alumnos[1].estado = 'Retirado';
  assert.throws(() => MAT.alEmitir({ alumno: 'A2', anio: '2027' }, ctx), /retirado/);
});

prueba('alAnular de matrícula: vuelve al año anterior o a la matrícula confirmada que quede', () => {
  const d = base(), ctx = crearCtx(d);
  d.alumnos[0].anioMatricula = 2027;
  MAT.alAnular({ id: 'M2', alumno: 'A1', anio: '2027' }, ctx);
  assert.equal(d.alumnos[0].anioMatricula, 2026);
  d.alumnos[0].anioMatricula = 2027;
  d.matriculas.push({ id: 'M0', alumno: 'A1', anio: '2026', estado: 'Matriculada' });
  MAT.alAnular({ id: 'M2', alumno: 'A1', anio: '2027' }, ctx);
  assert.equal(d.alumnos[0].anioMatricula, 2026);
  d.alumnos[0].anioMatricula = 2026;
  MAT.alAnular({ id: 'M0', alumno: 'A1', anio: '2027' }, ctx);
  assert.equal(d.alumnos[0].anioMatricula, 2026, 'si no era su año vigente no cambia');
});

/* ================= Reportes ================= */
prueba('Reporte promedios por sección: promedio, literal, asistencia y % aprobados', () => {
  const d = conNotas(), ctx = crearCtx(d);
  const r = rep('promedios-seccion').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 2);
  igual(r.filas[0].slice(0, 3), ['5° Primaria A', 2, 2]);
  cerca(r.filas[0][3], 12.8, '(13.6 + 12) ÷ 2'); assert.equal(r.filas[0][4], 'B');
  cerca(r.filas[0][5], 72.5, '(95 + 50) ÷ 2'); cerca(r.filas[0][6], 100);
  assert.equal(r.filas[1][0], '6° Primaria A');
  cerca(r.filas[1][3], 9); assert.equal(r.filas[1][4], 'C'); cerca(r.filas[1][6], 0);
  cerca(r.resumen[0].valor, 11.53, '(13.6 + 12 + 9) ÷ 3');
  const vacio = rep('promedios-seccion').ejecutar({ desde: '2000-01-01', hasta: '2000-01-31' }, ctx);
  assert.equal(vacio.filas.length, 0); cerca(vacio.resumen[0].valor, 0);
});

prueba('Reporte alumnos en riesgo: motivo por notas, por asistencia o por ambas', () => {
  const ctx = crearCtx(conNotas());
  const r = rep('alumnos-riesgo').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 2);
  assert.equal(r.filas[0][0], 'Alumno Tres'); assert.equal(r.filas[0][5], 'Notas e inasistencias');
  assert.equal(r.filas[1][0], 'Alumna Dos'); assert.equal(r.filas[1][5], 'Inasistencias');
  igual(r.grafico.valores, [0, 1, 1]);
  assert.equal(r.resumen[0].valor, 2);
});

prueba('Límites del riesgo: nota 11 y asistencia 70 % exactas NO son riesgo', () => {
  const d = base(), ctx = crearCtx(d);
  d.notas.push(nota('N1', '2026-05-10', 'A1', 'C1', 'I Bimestre', 11, 11, 11, 40, 12));   // 70 % exacto
  const r = rep('alumnos-riesgo').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 0);
  d.notas[0].faltas = 13;   // 67.5 %
  assert.equal(rep('alumnos-riesgo').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx).filas.length, 1);
});

prueba('Reporte morosidad: deuda neta, mora hasta hoy, atraso máximo y alumnos con deuda', () => {
  const d = base(), ctx = crearCtx(d, '2026-10-31');
  d.pensiones.push({ id: 'P1', alumno: 'A1', estado: 'Por cobrar', vencimiento: '2026-10-05' });   // 26 días
  d.pensiones.push({ id: 'P2', alumno: 'A1', estado: 'Por cobrar', vencimiento: '2026-09-05' });   // 56 días
  d.pensiones.push({ id: 'P3', alumno: 'A2', estado: 'Por cobrar', vencimiento: '2026-10-29' });   // 2 días (gracia)
  d.pensiones.push({ id: 'P4', alumno: 'A2', estado: 'Por cobrar', vencimiento: '2026-11-05' });   // aún no vence
  d.pensiones.push({ id: 'P5', alumno: 'A3', estado: 'Pagada', vencimiento: '2026-09-05' });
  const r = rep('morosidad').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 2);
  assert.equal(r.filas[0][0], 'Alumno Uno');
  assert.equal(r.filas[0][3], 2); cerca(r.filas[0][4], 800); cerca(r.filas[0][5], 16.4, '5.2 + 11.2'); cerca(r.filas[0][6], 816.4); assert.equal(r.filas[0][7], 56);
  assert.equal(r.filas[1][0], 'Alumna Dos');
  cerca(r.filas[1][4], 300); cerca(r.filas[1][5], 0); assert.equal(r.filas[1][7], 0);
  cerca(r.resumen[0].valor, 1116.4); cerca(r.resumen[1].valor, 16.4); assert.equal(r.resumen[2].valor, 2);
});

function conCobros() {
  const d = base(), ctx = crearCtx(d, '2026-10-31');
  const pago = (id, alumno, venc, pago) => { const doc = { id, alumno, estado: 'Pagada', vencimiento: venc, fechaPago: pago }; doc.totales = PEN.calcular(doc, ctx); d.pensiones.push(doc); };
  pago('P1', 'A1', '2026-09-05', '2026-09-05');   // 400
  pago('P2', 'A1', '2026-10-05', '2026-10-30');   // 25 días de atraso: mora 400 × 1.5 % × 25/30 = 5
  const m = { id: 'M1', alumno: 'A1', anio: '2027', tipo: 'Ratificación', estado: 'Matriculada', fecha: '2026-10-10' };
  m.totales = MAT.calcular(m, ctx);
  d.matriculas.push(m);
  return d;
}

prueba('Reporte recaudación mensual: pensiones, mora y matrículas por mes de cobro', () => {
  const d = conCobros(), ctx = crearCtx(d, '2026-10-31');
  const r = rep('recaudacion-mensual').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31' }, ctx);
  assert.equal(r.filas.length, 2);
  igual(r.filas[0], ['sep 2026', 1, 400, 0, 0, 400]);
  igual(r.filas[1], ['oct 2026', 1, 400, 5, 385, 790]);
  cerca(r.resumen[0].valor, 1190); cerca(r.resumen[1].valor, 5); assert.equal(r.resumen[2].valor, 2);
  const solo = rep('recaudacion-mensual').ejecutar({ desde: '2026-10-01', hasta: '2026-10-31' }, ctx);
  assert.equal(solo.filas.length, 1);
});

prueba('Reporte cuadro de méritos: primeros puestos por grado, orden y filtros', () => {
  const d = conNotas(), ctx = crearCtx(d);
  const r = rep('cuadro-meritos').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31', top: 3, grado: 'Todos los grados' }, ctx);
  igual(r.filas.map((f) => [f[0], f[1], f[2]]), [['5° Primaria', 1, 'Alumno Uno'], ['5° Primaria', 2, 'Alumna Dos'], ['6° Primaria', 1, 'Alumno Tres']]);
  cerca(r.filas[0][4], 13.6); assert.equal(r.filas[0][5], 'B'); cerca(r.resumen[0].valor, 13.6);
  const uno = rep('cuadro-meritos').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31', top: 1, grado: '5° Primaria' }, ctx);
  assert.equal(uno.filas.length, 1);
  assert.equal(uno.filas[0][2], 'Alumno Uno');
});

prueba('Cuadro de méritos: el empate de promedio se resuelve por asistencia', () => {
  const d = base(), ctx = crearCtx(d);
  d.notas.push(nota('N1', '2026-05-10', 'A1', 'C1', 'I Bimestre', 15, 15, 15, 40, 8));
  d.notas.push(nota('N2', '2026-05-10', 'A2', 'C1', 'I Bimestre', 15, 15, 15, 40, 2));
  const r = rep('cuadro-meritos').ejecutar({ desde: '2026-01-01', hasta: '2026-10-31', top: 3 }, ctx);
  assert.equal(r.filas[0][2], 'Alumna Dos');
  assert.equal(r.filas[1][2], 'Alumno Uno');
});

/* ================= Tablero ================= */
prueba('Tablero: indicadores con datos de prueba', () => {
  const d = conCobros(), ctx = crearCtx(d, '2026-10-31');
  d.notas = conNotas().notas;
  d.pensiones.push({ id: 'P3', alumno: 'A1', estado: 'Por cobrar', vencimiento: '2026-10-05' });
  const ind = (i) => SIS.tablero[i].calcular(ctx);
  assert.equal(ind(0), 3);
  cerca(ind(1), 405, 'cobrado desde el 2026-10-02: solo P2');
  cerca(ind(2), 405.2, 'deuda vencida: 400 + 5.2');
  cerca(ind(3), 11.53);
  assert.equal(ind(4), 2);
  assert.equal(ind(5), 1, 'una matrícula 2027 confirmada');
  const g = SIS.tableroGrafico.calcular(ctx);
  igual(g.etiquetas, ['I']);
  cerca(g.valores[0], 12.17, 'ponderado por horas sobre todas las notas del bimestre: 292 ÷ 24');
});

prueba('Tablero sin datos: ceros y vacíos, sin errores', () => {
  const ctx = crearCtx({ alumnos: [], cursos: [], notas: [], pensiones: [], matriculas: [] });
  assert.equal(SIS.tablero[0].calcular(ctx), 0);
  assert.equal(SIS.tablero[1].calcular(ctx), 0);
  assert.equal(SIS.tablero[2].calcular(ctx), 0);
  assert.equal(SIS.tablero[3].calcular(ctx), null);
  assert.equal(SIS.tablero[4].calcular(ctx), 0);
  igual(SIS.tableroGrafico.calcular(ctx), { etiquetas: [], valores: [] });
});

console.log('\n' + n + ' pruebas de fórmulas de colegio: todas correctas.');
