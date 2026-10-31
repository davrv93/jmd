/*
 * I.E. San Martín · Gestión académica y pensiones (Trujillo)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «colegio». Es lo ÚNICO que cambia entre
 * sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * TODOS los datos (alumnos menores de edad, apoderados, docentes, DNI, notas)
 * son inventados y no corresponden a personas reales. Todo el código es ES5.
 *
 * Idea del negocio: se matricula al alumno, los docentes registran las notas
 * de cada curso por bimestre (escala vigesimal con equivalencia literal
 * AD/A/B/C) y tesorería cobra la pensión mensual, con descuento por beca y
 * mora si se paga después del vencimiento.
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var GRADOS = ['1° Primaria', '2° Primaria', '3° Primaria', '4° Primaria', '5° Primaria', '6° Primaria', '1° Secundaria', '2° Secundaria', '3° Secundaria', '4° Secundaria', '5° Secundaria'];
  var BIMESTRES = ['I Bimestre', 'II Bimestre', 'III Bimestre', 'IV Bimestre'];

  function nombreMes(clave) {
    return MESES[parseInt(clave.slice(5, 7), 10) - 1] + ' ' + clave.slice(0, 4);
  }

  function ultimosMeses(ctx, n) {
    var hoy = ctx.hoy(), a = parseInt(hoy.slice(0, 4), 10), m = parseInt(hoy.slice(5, 7), 10), r = [], i, mm, aa;
    for (i = n - 1; i >= 0; i--) {
      mm = m - i;
      aa = a;
      while (mm < 1) { mm += 12; aa -= 1; }
      r.push(aa + '-' + (mm < 10 ? '0' : '') + mm);
    }
    return r;
  }

  /* Escala oficial: AD 18–20, A 14–17, B 11–13, C 0–10. */
  function escalaLiteral(nota) {
    if (nota >= 18) { return 'AD'; }
    if (nota >= 14) { return 'A'; }
    if (nota >= 11) { return 'B'; }
    return 'C';
  }

  /* Nota del bimestre = promedio ponderado de tareas, práctica y examen con los pesos de Configuración. */
  function promedioBimestre(n, ctx) {
    var pt = ctx.param('pesoTareas'), pp = ctx.param('pesoPractica'), pe = ctx.param('pesoExamen'), suma = pt + pp + pe;
    if (suma <= 0) { return 0; }
    return ctx.redondear(((n.tareas || 0) * pt + (n.practica || 0) * pp + (n.examen || 0) * pe) / suma);
  }

  /* % de asistencia = (días de clase − faltas) ÷ días de clase. */
  function asistenciaPct(n, ctx) {
    if (!n.diasClase || n.diasClase <= 0) { return 0; }
    return ctx.redondear((n.diasClase - (n.faltas || 0)) / n.diasClase * 100);
  }

  function enRango(fecha, desde, hasta) { return (!desde || fecha >= desde) && (!hasta || fecha <= hasta); }

  /* Horas semanales de cada curso, por id (los cursos con más horas pesan más en el promedio). */
  function mapaHoras(ctx) {
    var m = {}, cs = ctx.datos.listar('cursos'), i;
    for (i = 0; i < cs.length; i++) { m[cs[i].id] = cs[i].horasSemanales || 1; }
    return m;
  }

  /* Resumen académico de un conjunto de notas: promedio ponderado por horas del curso y asistencia global. */
  function resumenNotas(notas, ctx, horas) {
    var sumaPeso = 0, sumaNota = 0, clases = 0, faltas = 0, i, n, h;
    for (i = 0; i < notas.length; i++) {
      n = notas[i];
      h = horas[n.curso] || 1;
      sumaPeso += h;
      sumaNota += promedioBimestre(n, ctx) * h;
      clases += n.diasClase || 0;
      faltas += n.faltas || 0;
    }
    return {
      n: notas.length,
      promedio: sumaPeso > 0 ? ctx.redondear(sumaNota / sumaPeso) : null,
      asistencia: clases > 0 ? ctx.redondear((clases - faltas) / clases * 100) : null
    };
  }

  function notasDeAlumno(ctx, alumnoId, desde, hasta) {
    return ctx.datos.listar('notas', function (n) { return n.alumno === alumnoId && enRango(n.fecha, desde, hasta); });
  }

  /* Motivo de riesgo académico (o '' si no hay). */
  function motivoRiesgo(res, ctx) {
    var nota = res.promedio !== null && res.promedio < ctx.param('notaMinima'), asis = res.asistencia !== null && res.asistencia < ctx.param('asistenciaMinima');
    if (nota && asis) { return 'Notas e inasistencias'; }
    if (nota) { return 'Notas bajas'; }
    if (asis) { return 'Inasistencias'; }
    return '';
  }

  /* Mora de una pensión neta pagada (o vigente) en `ref`, con los parámetros de Configuración. */
  function moraPension(ctx, neto, vencimiento, ref) {
    var atraso = vencimiento ? ctx.diasEntre(vencimiento, ref) : 0;
    if (atraso <= ctx.param('diasGracia')) { return { dias: 0, mora: 0 }; }
    return { dias: atraso, mora: ctx.redondear(neto * ctx.param('moraMensual') / 100 * atraso / 30) };
  }

  /* Pensión bruta, descuento por beca y pensión neta del alumno. */
  function pensionDe(alumno, ctx) {
    var bruta = alumno && alumno.pensionMensual ? alumno.pensionMensual : 0, pct = alumno && alumno.becaPct ? alumno.becaPct : 0, desc = ctx.redondear(bruta * pct / 100);
    return { bruta: bruta, descuento: desc, neto: ctx.redondear(bruta - desc) };
  }

  /* Pensiones vencidas y no pagadas (estado «Por cobrar» con vencimiento anterior a hoy). */
  function vencidas(ctx, desde, hasta) {
    var hoy = ctx.hoy();
    return ctx.datos.listar('pensiones', function (p) { return p.estado === 'Por cobrar' && p.vencimiento < hoy && enRango(p.vencimiento, desde, hasta); });
  }

  function fechaDeNacimiento(anio, mes, dia) { return anio + '-' + (mes < 10 ? '0' : '') + mes + '-' + (dia < 10 ? '0' : '') + dia; }

  /* ---------- Datos de demostración (todo inventado) ---------- */

  var APODERADOS = [
    { id: 'APO-0001', dni: '18245631', nombre: 'Rosa Ríos Vásquez', parentesco: 'Madre', telefono: '944 120 331', email: 'rosa.rios@correo.example.pe', direccion: 'Jr. Orbegoso 540', distrito: 'Trujillo' },
    { id: 'APO-0002', dni: '17986420', nombre: 'César Alva Pretell', parentesco: 'Padre', telefono: '944 552 018', email: 'cesar.alva@correo.example.pe', direccion: 'Av. Larco 1120', distrito: 'Víctor Larco Herrera' },
    { id: 'APO-0003', dni: '40125873', nombre: 'Milagros Lingán Tello', parentesco: 'Madre', telefono: '943 118 740', email: 'milagros.lingan@correo.example.pe', direccion: 'Calle Los Laureles 88', distrito: 'La Esperanza' },
    { id: 'APO-0004', dni: '19650214', nombre: 'Jorge Castillo Rojas', parentesco: 'Padre', telefono: '942 330 215', email: 'jorge.castillo@correo.example.pe', direccion: 'Urb. San Andrés B-14', distrito: 'Trujillo' },
    { id: 'APO-0005', dni: '41782960', nombre: 'Fiorella Díaz Cumpa', parentesco: 'Madre', telefono: '941 774 902', email: 'fiorella.diaz@correo.example.pe', direccion: 'Av. España 350', distrito: 'Trujillo' },
    { id: 'APO-0006', dni: '42310987', nombre: 'Rubén Cruz Mostacero', parentesco: 'Padre', telefono: '940 221 483', email: 'ruben.cruz@correo.example.pe', direccion: 'Mz. C Lt. 12 Alto Trujillo', distrito: 'El Porvenir' },
    { id: 'APO-0007', dni: '43097521', nombre: 'Doris Rojas Santisteban', parentesco: 'Abuela', telefono: '939 664 310', email: 'doris.rojas@correo.example.pe', direccion: 'Jr. Pizarro 702', distrito: 'Trujillo' },
    { id: 'APO-0008', dni: '40536218', nombre: 'Luis Gil Plasencia', parentesco: 'Padre', telefono: '938 412 906', email: 'luis.gil@correo.example.pe', direccion: 'Calle Real 215', distrito: 'Huanchaco' },
    { id: 'APO-0009', dni: '18874402', nombre: 'Marisol Cabrera Chuquimango', parentesco: 'Madre', telefono: '937 880 126', email: 'marisol.cabrera@correo.example.pe', direccion: 'Av. Mansiche 960', distrito: 'Trujillo' },
    { id: 'APO-0010', dni: '41203395', nombre: 'Walter Iglesias Barrantes', parentesco: 'Padre', telefono: '936 505 774', email: 'walter.iglesias@correo.example.pe', direccion: 'Urb. Los Jardines C-3', distrito: 'Víctor Larco Herrera' },
    { id: 'APO-0011', dni: '45128870', nombre: 'Yesenia Mendoza Zelada', parentesco: 'Tutor legal', telefono: '935 217 640', email: 'yesenia.mendoza@correo.example.pe', direccion: 'Jr. Bolívar 433', distrito: 'Florencia de Mora' },
    { id: 'APO-0012', dni: '17724086', nombre: 'Gustavo Linares Paz', parentesco: 'Padre', telefono: '934 098 355', email: 'gustavo.linares@correo.example.pe', direccion: 'Av. Perú 1480', distrito: 'Moche' }
  ];

  var DOCENTES = [
    { id: 'DOC-0001', dni: '18006421', nombre: 'Patricia Cabanillas Arce', especialidad: 'Matemática', nivel: 'Secundaria', condicion: 'Nombrado', horasSemana: 30, fechaIngreso: '2014-03-03', remuneracion: 3650, telefono: '945 110 223', email: 'p.cabanillas@sanmartin.example.pe' },
    { id: 'DOC-0002', dni: '17895330', nombre: 'Julio César Becerra Lozano', especialidad: 'Comunicación', nivel: 'Secundaria', condicion: 'Nombrado', horasSemana: 30, fechaIngreso: '2011-03-07', remuneracion: 3800, telefono: '945 118 334', email: 'j.becerra@sanmartin.example.pe' },
    { id: 'DOC-0003', dni: '40218776', nombre: 'Marlene Sánchez Gutiérrez', especialidad: 'Ciencia y Tecnología', nivel: 'Secundaria', condicion: 'Contratado', horasSemana: 24, fechaIngreso: '2021-03-01', remuneracion: 2900, telefono: '945 227 118', email: 'm.sanchez@sanmartin.example.pe' },
    { id: 'DOC-0004', dni: '41570932', nombre: 'Walter Ríos Cieza', especialidad: 'Ciencias Sociales', nivel: 'Secundaria', condicion: 'Contratado', horasSemana: 24, fechaIngreso: '2022-03-07', remuneracion: 2850, telefono: '945 309 441', email: 'w.rios@sanmartin.example.pe' },
    { id: 'DOC-0005', dni: '18432007', nombre: 'Elsa Pretell Angulo', especialidad: 'Matemática', nivel: 'Primaria', condicion: 'Nombrado', horasSemana: 30, fechaIngreso: '2012-03-05', remuneracion: 3500, telefono: '945 411 092', email: 'e.pretell@sanmartin.example.pe' },
    { id: 'DOC-0006', dni: '19004785', nombre: 'Hugo Cerna Llamo', especialidad: 'Comunicación', nivel: 'Primaria', condicion: 'Nombrado', horasSemana: 30, fechaIngreso: '2009-03-02', remuneracion: 3900, telefono: '945 502 217', email: 'h.cerna@sanmartin.example.pe' },
    { id: 'DOC-0007', dni: '42906118', nombre: 'Nancy Burgos Terrones', especialidad: 'Ciencia y Tecnología', nivel: 'Primaria', condicion: 'Contratado', horasSemana: 24, fechaIngreso: '2023-03-06', remuneracion: 2750, telefono: '945 603 880', email: 'n.burgos@sanmartin.example.pe' },
    { id: 'DOC-0008', dni: '43318075', nombre: 'Óscar Rodríguez Vigo', especialidad: 'Personal Social', nivel: 'Primaria', condicion: 'Contratado', horasSemana: 24, fechaIngreso: '2020-03-02', remuneracion: 2800, telefono: '945 704 556', email: 'o.rodriguez@sanmartin.example.pe' },
    { id: 'DOC-0009', dni: '40871224', nombre: 'Liliana Zavaleta Horna', especialidad: 'Inglés', nivel: 'Ambos', condicion: 'Nombrado', horasSemana: 32, fechaIngreso: '2016-03-07', remuneracion: 3600, telefono: '945 805 119', email: 'l.zavaleta@sanmartin.example.pe' },
    { id: 'DOC-0010', dni: '18559340', nombre: 'Rafael Mendoza Cotrina', especialidad: 'Educación Física', nivel: 'Ambos', condicion: 'Nombrado', horasSemana: 30, fechaIngreso: '2010-03-01', remuneracion: 3550, telefono: '945 906 773', email: 'r.mendoza@sanmartin.example.pe' },
    { id: 'DOC-0011', dni: '44027651', nombre: 'Silvia Ugaz Aguilar', especialidad: 'Arte y Cultura', nivel: 'Ambos', condicion: 'Contratado', horasSemana: 20, fechaIngreso: '2024-03-04', remuneracion: 2300, telefono: '946 017 228', email: 's.ugaz@sanmartin.example.pe' },
    { id: 'DOC-0012', dni: '17630592', nombre: 'Teodoro Lezcano Ramos', especialidad: 'Educación Religiosa', nivel: 'Ambos', condicion: 'Nombrado', horasSemana: 16, fechaIngreso: '2008-03-03', remuneracion: 3100, telefono: '946 128 905', email: 't.lezcano@sanmartin.example.pe' },
    { id: 'DOC-0013', dni: '45683219', nombre: 'Ysabel Casas Montoya', especialidad: 'Tutoría', nivel: 'Ambos', condicion: 'Contratado', horasSemana: 20, fechaIngreso: '2025-03-03', remuneracion: 2400, telefono: '946 239 611', email: 'y.casas@sanmartin.example.pe' }
  ];

  /* Cursos: [área, abreviatura, horas semanales, docente primaria, docente secundaria] por grado y sección (todas «A»). */
  var AREAS = [
    ['Matemática', 'MAT', 6, 'DOC-0005', 'DOC-0001'],
    ['Comunicación', 'COM', 6, 'DOC-0006', 'DOC-0002'],
    ['Ciencia y Tecnología', 'CYT', 4, 'DOC-0007', 'DOC-0003'],
    ['Personal Social', 'PSO', 4, 'DOC-0008', 'DOC-0004']
  ];
  var SECCIONES = [['5° Primaria', '5P', 0], ['6° Primaria', '6P', 0], ['1° Secundaria', '1S', 1], ['2° Secundaria', '2S', 1]];

  function armarCursos() {
    var r = [], i, j, s, a, n = 0, area;
    for (i = 0; i < SECCIONES.length; i++) {
      s = SECCIONES[i];
      for (j = 0; j < AREAS.length; j++) {
        a = AREAS[j];
        n += 1;
        area = s[2] === 1 && a[1] === 'PSO' ? 'Ciencias Sociales' : a[0];
        r.push({ id: 'CUR-' + (n < 10 ? '000' : '00') + n, nombre: area + ' ' + s[0] + ' A', area: area, grado: s[0], seccion: 'A', docente: s[2] === 1 ? a[4] : a[3], horasSemanales: a[2] });
      }
    }
    return r;
  }
  var CURSOS = armarCursos();

  /* Alumno: [nombre, grado, apoderado, pensión mensual, beca %, nacimiento, nivel de rendimiento base, faltas habituales por bimestre] */
  var ALUMNOS_BASE = [
    ['Abanto Ríos, Camila', '1° Secundaria', 'APO-0001', 450, 0, fechaDeNacimiento(2013, 4, 17), 15.5, 1],
    ['Alva Chávez, Diego', '5° Primaria', 'APO-0002', 380, 0, fechaDeNacimiento(2015, 9, 3), 13.5, 2],
    ['Barboza Lingán, Valeria', '6° Primaria', 'APO-0003', 380, 25, fechaDeNacimiento(2014, 1, 28), 17, 0],
    ['Castillo Zavaleta, Mateo', '2° Secundaria', 'APO-0004', 450, 0, fechaDeNacimiento(2012, 11, 9), 12, 3],
    ['Castillo Zavaleta, Luciana', '5° Primaria', 'APO-0004', 380, 0, fechaDeNacimiento(2015, 6, 21), 14, 2],
    ['Chávarry Díaz, Sebastián', '1° Secundaria', 'APO-0005', 450, 0, fechaDeNacimiento(2013, 8, 30), 10, 6],
    ['Cruz Valverde, Ana Lucía', '6° Primaria', 'APO-0006', 380, 0, fechaDeNacimiento(2014, 3, 12), 16.5, 1],
    ['Esquivel Rojas, Jhosep', '2° Secundaria', 'APO-0007', 450, 0, fechaDeNacimiento(2012, 5, 25), 9.5, 5],
    ['Gil Alayo, Fabiana', '5° Primaria', 'APO-0008', 380, 50, fechaDeNacimiento(2015, 2, 14), 18, 0],
    ['Heredia Cabrera, Joaquín', '1° Secundaria', 'APO-0009', 450, 0, fechaDeNacimiento(2013, 12, 2), 13, 2],
    ['Heredia Cabrera, Emilia', '6° Primaria', 'APO-0009', 380, 0, fechaDeNacimiento(2014, 7, 19), 15, 1],
    ['Iglesias Torres, Renzo', '2° Secundaria', 'APO-0010', 450, 0, fechaDeNacimiento(2012, 10, 6), 14.5, 3],
    ['León Mendoza, Camila Fernanda', '6° Primaria', 'APO-0011', 380, 0, fechaDeNacimiento(2014, 5, 8), 14.5, 15],
    ['Linares Paredes, Gael', '5° Primaria', 'APO-0012', 380, 0, fechaDeNacimiento(2015, 10, 27), 12.5, 2],
    ['Linares Paredes, Alexandra', '2° Secundaria', 'APO-0012', 450, 0, fechaDeNacimiento(2012, 4, 1), 11.5, 4]
  ];

  /* Pensiones impagas: alumno (posición) → meses atrás sin pagar (0 = octubre, 1 = setiembre…). */
  var IMPAGAS = { 3: [0, 1, 2], 7: [0, 1, 2, 3], 10: [0, 1], 12: [0], 13: [0] };
  /* Pagos tardíos: «alumno:mes» → días de retraso. */
  var TARDIOS = { '2:2': 25, '5:3': 18, '9:1': 12, '11:2': 8, '1:4': 5, '6:0': 2, '4:5': 30 };

  var NOMBRES_MES = ['Octubre', 'Setiembre', 'Agosto', 'Julio', 'Junio', 'Mayo'];

  var alumnos = [], semillaAzar = 20260;

  function azar() { semillaAzar = (semillaAzar * 16807) % 2147483647; return semillaAzar / 2147483647; }
  function aMedio(x, tope) { var v = Math.round(x * 2) / 2; return Math.max(5, Math.min(tope || 20, v)); }
  function id4(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : (n < 100 ? '00' : '0')) + n; }

  (function armarAlumnos() {
    var i, b;
    for (i = 0; i < ALUMNOS_BASE.length; i++) {
      b = ALUMNOS_BASE[i];
      alumnos.push({
        id: id4('ALU', i + 1), codigo: 'SM-2026-' + (i + 1 < 10 ? '00' : '0') + (i + 1), dni: String(70000000 + (i + 1) * 123457), nombre: b[0], fechaNacimiento: b[5], sexo: /(Camila|Valeria|Luciana|Ana|Fabiana|Emilia|Alexandra)/.test(b[0]) ? 'Femenino' : 'Masculino',
        grado: b[1], seccion: 'A', apoderado: b[2], pensionMensual: b[3], becaPct: b[4], estado: 'Matriculado', anioMatricula: 2026
      });
    }
  })();

  /* Notas: tres bimestres completos para todos y el cuarto, apenas iniciado, para 6° de primaria. */
  function armarNotas() {
    var r = [], n = 0, i, c, b, base, curso, tipo, dias = [42, 38, 40, 12], fechas = ['@-168', '@-100', '@-22', '@-3'], tope, t, p, e, f, nota, alumno, jmax;
    for (i = 0; i < alumnos.length; i++) {
      alumno = alumnos[i];
      base = ALUMNOS_BASE[i][6];
      for (c = 0; c < CURSOS.length; c++) {
        curso = CURSOS[c];
        if (curso.grado !== alumno.grado) { continue; }
        for (b = 0; b < 4; b++) {
          if (b === 3 && alumno.grado !== '6° Primaria') { continue; }
          tipo = base + (azar() - 0.5) * 3;
          t = aMedio(tipo + 1 + azar());
          p = aMedio(tipo + (azar() - 0.5) * 2);
          e = aMedio(tipo - 1 + (azar() - 0.5) * 3);
          f = ALUMNOS_BASE[i][7] === 15 ? (b === 3 ? 4 : 14 + Math.round(azar() * 2)) : Math.max(0, ALUMNOS_BASE[i][7] - 1 + Math.round(azar() * 2));
          n += 1;
          r.push({ id: id4('NOT', n), fecha: fechas[b], alumno: alumno.id, curso: curso.id, bimestre: BIMESTRES[b], tareas: t, practica: p, examen: e, diasClase: dias[b], faltas: f });
        }
      }
    }
    return r;
  }

  /* Pensiones: seis meses (mayo a octubre) para cada alumno, más noviembre «por cobrar» de tres familias. */
  function armarPensiones() {
    var r = [], n = 0, i, j, venc, off, imp, atraso, doc, medios = ['Efectivo', 'Transferencia', 'Yape o Plin', 'Depósito en banco'], retraso, al;
    for (j = 5; j >= 0; j--) {
      for (i = 0; i < alumnos.length; i++) {
        al = alumnos[i];
        off = 26 + 30 * j;
        imp = IMPAGAS[i] && IMPAGAS[i].indexOf(j) !== -1;
        n += 1;
        doc = { id: id4('PEN', n), alumno: al.id, mes: NOMBRES_MES[j], vencimiento: '@-' + off, medioPago: medios[(i + j) % 4] };
        if (imp) {
          doc.fecha = '@-' + off;
          doc.estado = 'Por cobrar';
          delete doc.medioPago;
        } else {
          atraso = TARDIOS[i + ':' + j] !== undefined ? TARDIOS[i + ':' + j] : Math.floor(azar() * 4);
          retraso = Math.min(atraso, off);
          doc.fecha = '@-' + (off - retraso);
          doc.fechaPago = '@-' + (off - retraso);
          doc.estado = 'Pagada';
        }
        r.push(doc);
      }
    }
    /* Una pensión anulada (se cobró dos veces) y las de noviembre por cobrar. */
    r[7].estado = 'Anulada';
    r[7].motivoAnulacion = 'Recibo emitido por error al alumno equivocado; se corrigió con otro recibo.';
    [1, 4, 14].forEach(function (k) {
      n += 1;
      r.push({ id: id4('PEN', n), alumno: alumnos[k].id, mes: 'Noviembre', vencimiento: '@5', fecha: '@-1', estado: 'Por cobrar' });
    });
    return r;
  }

  /* Matrículas: [días atrás, alumno, año, tipo, grado que cursará, estado] */
  var MATRICULAS = [
    [172, 12, '2026', 'Traslado', '6° Primaria', 'Matriculada'],
    [168, 5, '2026', 'Nuevo ingreso', '1° Secundaria', 'Matriculada'],
    [58, 1, '2027', 'Ratificación', '6° Primaria', 'Matriculada'],
    [51, 2, '2027', 'Ratificación', '1° Secundaria', 'Matriculada'],
    [46, 4, '2027', 'Ratificación', '6° Primaria', 'Matriculada'],
    [40, 5, '2027', 'Ratificación', '2° Secundaria', 'Matriculada'],
    [33, 8, '2027', 'Ratificación', '6° Primaria', 'Matriculada'],
    [27, 9, '2027', 'Ratificación', '2° Secundaria', 'Matriculada'],
    [19, 11, '2027', 'Ratificación', '3° Secundaria', 'Matriculada'],
    [12, 14, '2027', 'Ratificación', '3° Secundaria', 'Matriculada'],
    [6, 6, '2027', 'Ratificación', '1° Secundaria', 'Solicitud'],
    [24, 13, '2027', 'Ratificación', '6° Primaria', 'Anulada']
  ];

  function armarMatriculas() {
    var r = [], i, f, doc;
    for (i = 0; i < MATRICULAS.length; i++) {
      f = MATRICULAS[i];
      doc = { id: id4('MAT', i + 1), fecha: '@-' + f[0], alumno: alumnos[f[1]].id, anio: f[2], tipo: f[3], grado: f[4], seccion: 'A', estado: f[5] };
      if (f[5] === 'Anulada') { doc.motivoAnulacion = 'La familia aún tenía pensiones pendientes y pidió esperar.'; }
      r.push(doc);
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'colegio',
    nombre: 'I.E. San Martín',
    rubro: 'Colegio · gestión académica y pensiones (datos ficticios de práctica)',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#8a1c2b', acento: '#e0b84a', siglas: 'SM' },

    parametros: [
      { id: 'pesoTareas', etiqueta: 'Peso de las tareas en la nota del bimestre', tipo: 'porcentaje', valor: 25, ayuda: 'Los tres pesos (tareas, práctica y examen) se usan como proporción: normalmente suman 100.' },
      { id: 'pesoPractica', etiqueta: 'Peso de la práctica en la nota del bimestre', tipo: 'porcentaje', valor: 25 },
      { id: 'pesoExamen', etiqueta: 'Peso del examen en la nota del bimestre', tipo: 'porcentaje', valor: 50 },
      { id: 'notaMinima', etiqueta: 'Nota mínima aprobatoria (0–20)', tipo: 'numero', valor: 11, ayuda: 'Por debajo de esta nota el alumno figura en riesgo académico.' },
      { id: 'asistenciaMinima', etiqueta: 'Asistencia mínima', tipo: 'porcentaje', valor: 70, ayuda: 'Por debajo de este porcentaje el alumno figura en riesgo por inasistencias.' },
      { id: 'moraMensual', etiqueta: 'Interés moratorio mensual', tipo: 'porcentaje', valor: 1.5, ayuda: 'Se cobra sobre la pensión neta, prorrateado por días de atraso, cuando se paga pasado el plazo de gracia.' },
      { id: 'diasGracia', etiqueta: 'Días de gracia para pagar la pensión', tipo: 'entero', valor: 3, ayuda: 'Hasta este número de días después del vencimiento no se cobra mora.' },
      { id: 'becaMaxima', etiqueta: 'Beca máxima permitida', tipo: 'porcentaje', valor: 50, ayuda: 'Ningún alumno puede tener una beca mayor a este porcentaje.' },
      { id: 'derechoMatricula', etiqueta: 'Derecho de matrícula', tipo: 'moneda', valor: 350 },
      { id: 'cuotaIngreso', etiqueta: 'Cuota de ingreso (nuevos alumnos)', tipo: 'moneda', valor: 400 },
      { id: 'seguroEscolar', etiqueta: 'Seguro escolar', tipo: 'moneda', valor: 35 },
      { id: 'descHermanos', etiqueta: 'Descuento en matrícula por hermanos', tipo: 'porcentaje', valor: 15, ayuda: 'Se aplica al derecho de matrícula si el apoderado ya tiene otro hijo matriculado.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: false,
      ayudaLogin: false,
      exportaRespetaPermisos: false,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'director', nombre: 'Director', descripcion: 'Ve toda la información académica y de pensiones, administra docentes y cursos y confirma las matrículas. No cobra ni registra notas.' },
      { id: 'docente', nombre: 'Docente', descripcion: 'Registra y corrige las notas de sus cursos y consulta alumnos, cursos y el cuadro de méritos. No ve datos de pensiones ni de apoderados.' },
      { id: 'secretaria', nombre: 'Secretaría', descripcion: 'Registra alumnos, apoderados y solicitudes de matrícula. No ve becas ni sueldos y no cobra pensiones.' },
      { id: 'tesoreria', nombre: 'Tesorería', descripcion: 'Registra y cobra pensiones, ve becas, deuda y la recaudación. No ve notas ni cursos.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el colegio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Gladys Salazar Rubio', rol: 'admin', clave: 'Smartin#2026a' },
      { usuario: 'director', nombre: 'Ernesto Villanueva Castro', rol: 'director', clave: 'Smartin#2026d' },
      { usuario: 'docente', nombre: 'Patricia Cabanillas Arce', rol: 'docente', clave: 'Smartin#2026o' },
      { usuario: 'secretaria', nombre: 'Karina Ñique Alva', rol: 'secretaria', clave: 'Smartin#2026s' },
      { usuario: 'tesoreria', nombre: 'Hilda Rosales Gamarra', rol: 'tesoreria', clave: 'Smartin#2026t' },
      { usuario: 'auditor', nombre: 'Segundo Carranza Pinedo', rol: 'auditor', clave: 'Smartin#2026u' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'alumnos', nombre: 'Alumno', plural: 'Alumnos', prefijo: 'ALU',
        campos: [
          { id: 'codigo', etiqueta: 'Código de matrícula', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.', ver: ['admin', 'director', 'secretaria', 'auditor'] },
          { id: 'nombre', etiqueta: 'Apellidos y nombres', tipo: 'texto', requerido: true, max: 80, ayuda: 'Formato: Apellido Apellido, Nombres. Todos los datos de práctica son ficticios.' },
          { id: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: true, max: 'hoy', min: '@-7300' },
          { id: 'sexo', etiqueta: 'Sexo', tipo: 'lista', requerido: true, opciones: ['Femenino', 'Masculino'] },
          { id: 'grado', etiqueta: 'Grado', tipo: 'lista', requerido: true, opciones: GRADOS },
          { id: 'seccion', etiqueta: 'Sección', tipo: 'lista', requerido: true, opciones: ['A', 'B', 'C'], defecto: 'A' },
          { id: 'apoderado', etiqueta: 'Apoderado', tipo: 'ref', entidad: 'apoderados', mostrar: 'nombre', requerido: true },
          { id: 'pensionMensual', etiqueta: 'Pensión mensual', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'director', 'secretaria', 'tesoreria', 'auditor'] },
          { id: 'becaPct', etiqueta: 'Beca (%)', tipo: 'porcentaje', min: 0, max: 100, defecto: 0, ver: ['admin', 'director', 'tesoreria', 'auditor'], ayuda: 'Descuento sobre la pensión. El tope lo fija el parámetro «Beca máxima».' },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', requerido: true, opciones: ['Matriculado', 'Retirado', 'Egresado'], defecto: 'Matriculado' },
          { id: 'anioMatricula', etiqueta: 'Año de la última matrícula', tipo: 'entero', min: 2020, max: 2030, defecto: 2026 },
          { id: 'ultimoPago', etiqueta: 'Fecha del último pago', tipo: 'fecha', max: 'hoy', ver: ['admin', 'director', 'secretaria', 'tesoreria', 'auditor'], ayuda: 'Se actualiza solo al registrar o anular un cobro.' }
        ],
        lista: ['codigo', 'nombre', 'grado', 'seccion', 'estado', 'promedio', 'asistencia'],
        buscar: ['codigo', 'nombre', 'grado'],
        calculados: [
          {
            id: 'edad', etiqueta: 'Edad (años)', tipo: 'entero',
            formula: function (r, ctx) {
              var hoy = ctx.hoy(), a = parseInt(hoy.slice(0, 4), 10) - parseInt(r.fechaNacimiento.slice(0, 4), 10);
              if (hoy.slice(5) < r.fechaNacimiento.slice(5)) { a -= 1; }
              return a;
            }
          },
          {
            id: 'promedio', etiqueta: 'Promedio ponderado', tipo: 'numero',
            formula: function (r, ctx) {
              var res = resumenNotas(notasDeAlumno(ctx, r.id), ctx, mapaHoras(ctx));
              return res.promedio;
            }
          },
          {
            id: 'asistencia', etiqueta: 'Asistencia', tipo: 'porcentaje',
            formula: function (r, ctx) {
              return resumenNotas(notasDeAlumno(ctx, r.id), ctx, mapaHoras(ctx)).asistencia;
            }
          },
          {
            id: 'deuda', etiqueta: 'Pensiones vencidas', tipo: 'moneda', ver: ['admin', 'director', 'secretaria', 'tesoreria', 'auditor'],
            formula: function (r, ctx) {
              var ps = ctx.datos.listar('pensiones', function (p) { return p.alumno === r.id && p.estado === 'Por cobrar' && p.vencimiento < ctx.hoy(); });
              return ctx.redondear(ctx.suma(ps, function (p) { return p.totales ? p.totales.neto : 0; }));
            }
          }
        ],
        reglas: [
          {
            id: 'beca-con-tope', mensaje: 'La beca supera el máximo permitido en Configuración.',
            validar: function (r, ctx) { return !(r.becaPct > ctx.param('becaMaxima')); }
          }
        ],
        permisos: { ver: ['admin', 'director', 'docente', 'secretaria', 'tesoreria', 'auditor'], crear: ['admin', 'secretaria'], editar: ['admin', 'secretaria'], eliminar: ['admin'] }
      },
      {
        id: 'apoderados', nombre: 'Apoderado', plural: 'Apoderados', prefijo: 'APO',
        campos: [
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'parentesco', etiqueta: 'Parentesco con el alumno', tipo: 'lista', requerido: true, opciones: ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tutor legal'] },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono', requerido: true },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto', max: 120 },
          { id: 'distrito', etiqueta: 'Distrito', tipo: 'lista', opciones: ['Trujillo', 'La Esperanza', 'El Porvenir', 'Víctor Larco Herrera', 'Huanchaco', 'Florencia de Mora', 'Moche', 'Salaverry'] }
        ],
        lista: ['dni', 'nombre', 'parentesco', 'telefono', 'distrito', 'hijos'],
        buscar: ['dni', 'nombre', 'telefono'],
        calculados: [
          {
            id: 'hijos', etiqueta: 'Hijos en el colegio', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('alumnos', function (a) { return a.apoderado === r.id && a.estado === 'Matriculado'; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'director', 'secretaria', 'tesoreria', 'auditor'], crear: ['admin', 'secretaria'], editar: ['admin', 'secretaria'], eliminar: ['admin'] }
      },
      {
        id: 'docentes', nombre: 'Docente', plural: 'Docentes', prefijo: 'DOC',
        campos: [
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'especialidad', etiqueta: 'Especialidad', tipo: 'lista', requerido: true, opciones: ['Matemática', 'Comunicación', 'Ciencia y Tecnología', 'Personal Social', 'Ciencias Sociales', 'Inglés', 'Educación Física', 'Arte y Cultura', 'Educación Religiosa', 'Tutoría'] },
          { id: 'nivel', etiqueta: 'Nivel', tipo: 'lista', requerido: true, opciones: ['Primaria', 'Secundaria', 'Ambos'] },
          { id: 'condicion', etiqueta: 'Condición laboral', tipo: 'lista', requerido: true, opciones: ['Nombrado', 'Contratado'], defecto: 'Contratado' },
          { id: 'horasSemana', etiqueta: 'Horas semanales', tipo: 'entero', min: 1, max: 40, requerido: true, defecto: 24 },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' },
          { id: 'remuneracion', etiqueta: 'Remuneración mensual', tipo: 'moneda', min: 0, ver: ['admin', 'director', 'auditor'] },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo institucional', tipo: 'email', max: 80 }
        ],
        lista: ['nombre', 'especialidad', 'nivel', 'condicion', 'horasSemana', 'cursos'],
        buscar: ['nombre', 'dni', 'especialidad'],
        calculados: [
          {
            id: 'cursos', etiqueta: 'Cursos a cargo', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('cursos', function (c) { return c.docente === r.id; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'director', 'secretaria', 'auditor'], crear: ['admin', 'director'], editar: ['admin', 'director'], eliminar: ['admin'] }
      },
      {
        id: 'cursos', nombre: 'Curso', plural: 'Cursos y secciones', prefijo: 'CUR',
        campos: [
          { id: 'nombre', etiqueta: 'Curso y sección', tipo: 'texto', requerido: true, unico: true, max: 60, ayuda: 'Por ejemplo: Matemática 5° Primaria A.' },
          { id: 'area', etiqueta: 'Área curricular', tipo: 'lista', requerido: true, opciones: ['Matemática', 'Comunicación', 'Ciencia y Tecnología', 'Personal Social', 'Ciencias Sociales', 'Inglés', 'Educación Física', 'Arte y Cultura', 'Educación Religiosa', 'Tutoría'] },
          { id: 'grado', etiqueta: 'Grado', tipo: 'lista', requerido: true, opciones: GRADOS },
          { id: 'seccion', etiqueta: 'Sección', tipo: 'lista', requerido: true, opciones: ['A', 'B', 'C'], defecto: 'A' },
          { id: 'docente', etiqueta: 'Docente a cargo', tipo: 'ref', entidad: 'docentes', mostrar: 'nombre', requerido: true },
          { id: 'horasSemanales', etiqueta: 'Horas semanales', tipo: 'entero', min: 1, max: 10, requerido: true, defecto: 4, ayuda: 'Los cursos con más horas pesan más en el promedio ponderado del alumno.' }
        ],
        lista: ['nombre', 'area', 'grado', 'seccion', 'docente', 'horasSemanales'],
        buscar: ['nombre', 'area', 'grado'],
        permisos: { ver: ['admin', 'director', 'docente', 'secretaria', 'auditor'], crear: ['admin', 'director'], editar: ['admin', 'director'], eliminar: ['admin'] }
      },
      {
        id: 'notas', nombre: 'Registro de notas', plural: 'Registro de notas', prefijo: 'NOT',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de registro', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'alumno', etiqueta: 'Alumno', tipo: 'ref', entidad: 'alumnos', mostrar: 'nombre', requerido: true },
          { id: 'curso', etiqueta: 'Curso', tipo: 'ref', entidad: 'cursos', mostrar: 'nombre', requerido: true },
          { id: 'bimestre', etiqueta: 'Bimestre', tipo: 'lista', requerido: true, opciones: BIMESTRES, defecto: 'IV Bimestre' },
          { id: 'tareas', etiqueta: 'Nota de tareas (0–20)', tipo: 'numero', min: 0, max: 20, requerido: true },
          { id: 'practica', etiqueta: 'Nota de práctica (0–20)', tipo: 'numero', min: 0, max: 20, requerido: true },
          { id: 'examen', etiqueta: 'Nota de examen (0–20)', tipo: 'numero', min: 0, max: 20, requerido: true },
          { id: 'diasClase', etiqueta: 'Días de clase del bimestre', tipo: 'entero', min: 1, max: 80, requerido: true, defecto: 40 },
          { id: 'faltas', etiqueta: 'Inasistencias', tipo: 'entero', min: 0, max: 80, requerido: true, defecto: 0 },
          { id: 'observacion', etiqueta: 'Observación', tipo: 'texto', max: 120 }
        ],
        lista: ['alumno', 'curso', 'bimestre', 'promedio', 'literal', 'asistencia'],
        buscar: ['bimestre', 'observacion'],
        calculados: [
          { id: 'promedio', etiqueta: 'Nota del bimestre', tipo: 'numero', formula: function (r, ctx) { return promedioBimestre(r, ctx); } },
          { id: 'literal', etiqueta: 'Literal', tipo: 'texto', formula: function (r, ctx) { return escalaLiteral(promedioBimestre(r, ctx)); } },
          { id: 'asistencia', etiqueta: 'Asistencia', tipo: 'porcentaje', formula: function (r, ctx) { return asistenciaPct(r, ctx); } }
        ],
        reglas: [
          {
            id: 'curso-del-alumno', mensaje: 'El curso no corresponde al grado y sección del alumno.',
            validar: function (r, ctx) {
              var a = ctx.datos.obtener('alumnos', r.alumno), c = ctx.datos.obtener('cursos', r.curso);
              return !!a && !!c && a.grado === c.grado && a.seccion === c.seccion;
            }
          },
          {
            id: 'faltas-posibles', mensaje: 'Las inasistencias no pueden superar los días de clase.',
            validar: function (r) { return !(r.faltas > r.diasClase); }
          },
          {
            id: 'un-registro-por-bimestre', mensaje: 'Ya existe un registro de ese alumno en ese curso y bimestre. Edítalo en vez de crear otro.',
            validar: function (r, ctx) {
              return ctx.datos.listar('notas', function (x) { return x.id !== r.id && x.alumno === r.alumno && x.curso === r.curso && x.bimestre === r.bimestre; }).length === 0;
            }
          }
        ],
        permisos: { ver: ['admin', 'director', 'docente', 'secretaria', 'auditor'], crear: ['admin', 'docente'], editar: ['admin', 'docente'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'pensiones', nombre: 'Pensión', plural: 'Pensiones', prefijo: 'PEN', serie: 'REC1',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de registro', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'alumno', etiqueta: 'Alumno', tipo: 'ref', entidad: 'alumnos', mostrar: 'nombre', requerido: true },
          { id: 'mes', etiqueta: 'Mes de la pensión', tipo: 'lista', requerido: true, opciones: ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'], defecto: 'Noviembre' },
          { id: 'vencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'fecha', requerido: true },
          { id: 'fechaPago', etiqueta: 'Fecha de pago', tipo: 'fecha', max: 'hoy', defecto: 'hoy', ayuda: 'Déjala vacía mientras la pensión sigue por cobrar. Con la fecha de pago se calcula la mora.' },
          { id: 'medioPago', etiqueta: 'Medio de pago', tipo: 'lista', opciones: ['Efectivo', 'Transferencia', 'Yape o Plin', 'Depósito en banco'] },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'alumno', 'mes'],
        estados: ['Por cobrar', 'Pagada', 'Anulada'],
        calcular: function (doc, ctx) {
          var al = doc.alumno ? ctx.datos.obtener('alumnos', doc.alumno) : null;
          var p = pensionDe(al, ctx);
          var referencia = doc.fechaPago || ctx.hoy();
          var atraso = doc.vencimiento ? ctx.diasEntre(doc.vencimiento, referencia) : 0;
          var dias = atraso > ctx.param('diasGracia') ? atraso : 0;
          var mora = ctx.redondear(p.neto * 0.015 * dias / 30);
          return { pension: p.bruta, descuento: p.descuento, mora: mora, total: ctx.redondear(p.neto + mora), neto: p.neto, diasAtraso: dias };
        },
        totales: [
          { id: 'pension', etiqueta: 'Pensión del mes' },
          { id: 'descuento', etiqueta: 'Descuento por beca' },
          { id: 'mora', etiqueta: 'Mora por pago tardío' },
          { id: 'total', etiqueta: 'Total a pagar', fuerte: true }
        ],
        reglas: [
          {
            id: 'alumno-activo', mensaje: 'No se cobran pensiones a un alumno retirado o egresado.',
            validar: function (d, ctx) { var a = ctx.datos.obtener('alumnos', d.alumno); return !!a && a.estado === 'Matriculado'; }
          }
        ],
        alEmitir: function (doc, ctx) {
          var anio = doc.vencimiento.slice(0, 4), otras;
          if (!doc.fechaPago) { throw new Error('Indica la fecha de pago antes de registrar el cobro.'); }
          otras = ctx.datos.listar('pensiones', function (p) {
            return p.id !== doc.id && p.alumno === doc.alumno && p.mes === doc.mes && p.vencimiento.slice(0, 4) === anio && p.estado === 'Pagada';
          });
          if (otras.length) { throw new Error('La pensión de ' + doc.mes + ' de este alumno ya fue cobrada (' + (otras[0].numero || otras[0].id) + ').'); }
          ctx.datos.actualizar('alumnos', doc.alumno, { ultimoPago: doc.fechaPago });
        },
        alAnular: function (doc, ctx) {
          var otras = ctx.datos.listar('pensiones', function (p) { return p.id !== doc.id && p.alumno === doc.alumno && p.estado === 'Pagada' && p.fechaPago; }), ultimo = '', i;
          for (i = 0; i < otras.length; i++) { if (otras[i].fechaPago > ultimo) { ultimo = otras[i].fechaPago; } }
          ctx.datos.actualizar('alumnos', doc.alumno, { ultimoPago: ultimo || null });
        },
        permisos: { ver: ['admin', 'director', 'secretaria', 'tesoreria', 'auditor'], crear: ['admin', 'tesoreria'], editar: ['admin', 'tesoreria'], emitir: ['admin', 'tesoreria'], anular: ['admin'] }
      },
      {
        id: 'matriculas', nombre: 'Matrícula', plural: 'Matrículas', prefijo: 'MAT', serie: 'MA01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de la solicitud', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'alumno', etiqueta: 'Alumno', tipo: 'ref', entidad: 'alumnos', mostrar: 'nombre', requerido: true },
          { id: 'anio', etiqueta: 'Año lectivo', tipo: 'lista', requerido: true, opciones: ['2026', '2027'], defecto: '2027' },
          { id: 'tipo', etiqueta: 'Tipo de matrícula', tipo: 'lista', requerido: true, opciones: ['Ratificación', 'Nuevo ingreso', 'Traslado'], defecto: 'Ratificación', ayuda: 'El nuevo ingreso paga además la cuota de ingreso.' },
          { id: 'grado', etiqueta: 'Grado que cursará', tipo: 'lista', requerido: true, opciones: GRADOS },
          { id: 'seccion', etiqueta: 'Sección', tipo: 'lista', requerido: true, opciones: ['A', 'B', 'C'], defecto: 'A' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'alumno', 'anio'],
        estados: ['Solicitud', 'Matriculada', 'Anulada'],
        calcular: function (doc, ctx) {
          var al = doc.alumno ? ctx.datos.obtener('alumnos', doc.alumno) : null;
          var derecho = ctx.param('derechoMatricula');
          var hermanos = al ? ctx.datos.listar('alumnos', function (a) { return a.apoderado === al.apoderado && a.id !== al.id && a.estado === 'Matriculado'; }).length : 0;
          var descuento = hermanos > 0 ? ctx.redondear(derecho * ctx.param('descHermanos') / 100) : 0;
          var ingreso = doc.tipo === 'Nuevo ingreso' ? ctx.param('cuotaIngreso') : 0;
          var seguro = ctx.param('seguroEscolar');
          return { derecho: ctx.redondear(derecho), descuento: descuento, ingreso: ctx.redondear(ingreso), seguro: ctx.redondear(seguro), total: ctx.redondear(derecho - descuento + ingreso + seguro), hermanos: hermanos };
        },
        totales: [
          { id: 'derecho', etiqueta: 'Derecho de matrícula' },
          { id: 'descuento', etiqueta: 'Descuento por hermanos' },
          { id: 'ingreso', etiqueta: 'Cuota de ingreso' },
          { id: 'seguro', etiqueta: 'Seguro escolar' },
          { id: 'total', etiqueta: 'Total a pagar', fuerte: true }
        ],
        reglas: [
          {
            id: 'una-matricula-por-anio', mensaje: 'El alumno ya tiene una matrícula confirmada para ese año lectivo.',
            validar: function (d, ctx) {
              return ctx.datos.listar('matriculas', function (m) { return m.id !== d.id && m.alumno === d.alumno && m.anio === d.anio && m.estado === 'Matriculada'; }).length === 0;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var al = ctx.datos.obtener('alumnos', doc.alumno), pendientes;
          if (al.estado === 'Retirado') { throw new Error('El alumno figura como retirado: reactívalo antes de matricularlo.'); }
          pendientes = ctx.datos.listar('pensiones', function (p) { return p.alumno === doc.alumno && p.estado === 'Por cobrar' && p.vencimiento < ctx.hoy(); }).length;
          if (pendientes > 0) { throw new Error('El alumno tiene ' + pendientes + ' pensión(es) vencida(s) sin pagar: regularízalas antes de matricular.'); }
          ctx.datos.actualizar('alumnos', doc.alumno, { anioMatricula: Math.max(al.anioMatricula || 0, parseInt(doc.anio, 10)) });
        },
        alAnular: function (doc, ctx) {
          var al = ctx.datos.obtener('alumnos', doc.alumno), anio = parseInt(doc.anio, 10), otras, mejor, i;
          if (al.anioMatricula !== anio) { return; }
          otras = ctx.datos.listar('matriculas', function (m) { return m.id !== doc.id && m.alumno === doc.alumno && m.estado === 'Matriculada'; });
          mejor = anio - 1;
          for (i = 0; i < otras.length; i++) { if (parseInt(otras[i].anio, 10) > mejor && parseInt(otras[i].anio, 10) < anio) { mejor = parseInt(otras[i].anio, 10); } }
          ctx.datos.actualizar('alumnos', doc.alumno, { anioMatricula: mejor });
        },
        permisos: { ver: ['admin', 'director', 'secretaria', 'tesoreria', 'auditor'], crear: ['admin', 'secretaria'], editar: ['admin', 'secretaria'], emitir: ['admin', 'director'], anular: ['admin'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'promedios-seccion', titulo: 'Promedios por sección',
        descripcion: 'Promedio ponderado por horas de curso, literal, asistencia y porcentaje de alumnos aprobados de cada grado y sección, con las notas registradas en el periodo.',
        roles: ['admin', 'director', 'docente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var horas = mapaHoras(ctx), als = ctx.datos.listar('alumnos'), grupos = {}, claves = [], i, k, a, res, g, filas = [], etiquetas = [], valores = [], aprobados, conNotas, notasSec, sumaProm, sumaAsis, total = 0, nTotal = 0;
          for (i = 0; i < als.length; i++) {
            a = als[i];
            k = a.grado + ' ' + a.seccion;
            if (!grupos[k]) { grupos[k] = []; claves.push(k); }
            grupos[k].push(a);
          }
          claves.sort();
          for (i = 0; i < claves.length; i++) {
            g = grupos[claves[i]];
            aprobados = 0; conNotas = 0; sumaProm = 0; sumaAsis = 0;
            g.forEach(function (al) {
              res = resumenNotas(notasDeAlumno(ctx, al.id, p.desde, p.hasta), ctx, horas);
              if (res.promedio === null) { return; }
              conNotas += 1;
              sumaProm += res.promedio;
              sumaAsis += res.asistencia;
              if (res.promedio >= ctx.param('notaMinima')) { aprobados += 1; }
            });
            if (!conNotas) { continue; }
            notasSec = ctx.redondear(sumaProm / conNotas);
            filas.push([claves[i], g.length, conNotas, notasSec, escalaLiteral(notasSec), ctx.redondear(sumaAsis / conNotas), ctx.redondear(aprobados / conNotas * 100)]);
            etiquetas.push(claves[i]);
            valores.push(notasSec);
            total += sumaProm;
            nTotal += conNotas;
          }
          return {
            columnas: ['Grado y sección', 'Alumnos', 'Con notas', 'Promedio', 'Literal', 'Asistencia %', 'Aprobados %'],
            tipos: ['texto', 'entero', 'entero', 'numero', 'texto', 'porcentaje', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'numero' },
            resumen: [
              { etiqueta: 'Promedio general', valor: nTotal ? ctx.redondear(total / nTotal) : 0, tipo: 'numero' },
              { etiqueta: 'Secciones con notas', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Alumnos con notas', valor: nTotal, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'alumnos-riesgo', titulo: 'Alumnos en riesgo',
        descripcion: 'Alumnos cuyo promedio ponderado está por debajo de la nota mínima o cuya asistencia está por debajo del mínimo, con el motivo. Se calcula con las notas registradas en el periodo.',
        roles: ['admin', 'director', 'docente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var horas = mapaHoras(ctx), als = ctx.datos.listar('alumnos', function (a) { return a.estado === 'Matriculado'; }), filas = [], i, a, res, motivo, cuenta = { 'Notas bajas': 0, 'Inasistencias': 0, 'Notas e inasistencias': 0 }, etiquetas = ['Notas bajas', 'Inasistencias', 'Notas e inasistencias'], valores = [];
          for (i = 0; i < als.length; i++) {
            a = als[i];
            res = resumenNotas(notasDeAlumno(ctx, a.id, p.desde, p.hasta), ctx, horas);
            motivo = res.n ? motivoRiesgo(res, ctx) : '';
            if (!motivo) { continue; }
            cuenta[motivo] += 1;
            filas.push([a.nombre, a.grado + ' ' + a.seccion, res.promedio, escalaLiteral(res.promedio), res.asistencia, motivo]);
          }
          filas.sort(function (x, y) { return x[2] - y[2]; });
          for (i = 0; i < etiquetas.length; i++) { valores.push(cuenta[etiquetas[i]]); }
          return {
            columnas: ['Alumno', 'Grado y sección', 'Promedio', 'Literal', 'Asistencia %', 'Motivo'], tipos: ['texto', 'texto', 'numero', 'texto', 'porcentaje', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Alumnos en riesgo', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Alumnos matriculados', valor: als.length, tipo: 'entero' },
              { etiqueta: 'Nota mínima vigente', valor: ctx.param('notaMinima'), tipo: 'numero' }
            ]
          };
        }
      },
      {
        id: 'morosidad', titulo: 'Morosidad de pensiones',
        descripcion: 'Pensiones vencidas y no pagadas por alumno, con la mora acumulada hasta hoy (interés moratorio mensual prorrateado por días, desde el vencimiento) y el atraso más antiguo.',
        roles: ['admin', 'director', 'tesoreria', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Vencidas desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Vencidas hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var pens = vencidas(ctx, p.desde, p.hasta), porAlumno = {}, claves = [], i, x, al, ap, m, filas = [], etiquetas = [], valores = [], deuda = 0, mora = 0, e;
          for (i = 0; i < pens.length; i++) {
            x = pens[i];
            al = ctx.datos.obtener('alumnos', x.alumno);
            if (!al) { continue; }
            if (!porAlumno[al.id]) { porAlumno[al.id] = { alumno: al, n: 0, neto: 0, mora: 0, dias: 0 }; claves.push(al.id); }
            e = porAlumno[al.id];
            m = moraPension(ctx, pensionDe(al, ctx).neto, x.vencimiento, ctx.hoy());
            e.n += 1;
            e.neto += pensionDe(al, ctx).neto;
            e.mora += m.mora;
            if (m.dias > e.dias) { e.dias = m.dias; }
          }
          claves.sort(function (a, b) { return (porAlumno[b].neto + porAlumno[b].mora) - (porAlumno[a].neto + porAlumno[a].mora); });
          for (i = 0; i < claves.length; i++) {
            e = porAlumno[claves[i]];
            ap = ctx.datos.obtener('apoderados', e.alumno.apoderado);
            filas.push([e.alumno.nombre, e.alumno.grado + ' ' + e.alumno.seccion, ap ? ap.nombre : '', e.n, ctx.redondear(e.neto), ctx.redondear(e.mora), ctx.redondear(e.neto + e.mora), e.dias]);
            etiquetas.push(e.alumno.nombre);
            valores.push(ctx.redondear(e.neto + e.mora));
            deuda += e.neto;
            mora += e.mora;
          }
          return {
            columnas: ['Alumno', 'Grado y sección', 'Apoderado', 'Vencidas', 'Deuda neta', 'Mora', 'Total adeudado', 'Atraso (días)'],
            tipos: ['texto', 'texto', 'texto', 'entero', 'moneda', 'moneda', 'moneda', 'entero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Total adeudado', valor: ctx.redondear(deuda + mora), tipo: 'moneda' },
              { etiqueta: 'Mora acumulada', valor: ctx.redondear(mora), tipo: 'moneda' },
              { etiqueta: 'Alumnos con deuda', valor: filas.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'recaudacion-mensual', titulo: 'Recaudación mensual',
        descripcion: 'Dinero cobrado por mes: pensiones pagadas (por fecha de pago), mora cobrada y matrículas confirmadas. Las anuladas no cuentan.',
        roles: ['admin', 'director', 'tesoreria', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var pagadas = ctx.datos.listar('pensiones', function (x) { return x.estado === 'Pagada' && x.fechaPago && enRango(x.fechaPago, p.desde, p.hasta); });
          var mats = ctx.datos.listar('matriculas', function (m) { return m.estado === 'Matriculada' && enRango(m.fecha, p.desde, p.hasta); });
          var meses = {}, claves = [], i, k, x, filas = [], etiquetas = [], valores = [], tPen = 0, tMora = 0, tMat = 0, fila;
          function mes(clave) { if (!meses[clave]) { meses[clave] = { recibos: 0, pension: 0, mora: 0, matricula: 0 }; claves.push(clave); } return meses[clave]; }
          for (i = 0; i < pagadas.length; i++) {
            x = pagadas[i];
            fila = mes(ctx.mes(x.fechaPago));
            fila.recibos += 1;
            fila.pension += x.totales.neto;
            fila.mora += x.totales.mora;
          }
          for (i = 0; i < mats.length; i++) { mes(ctx.mes(mats[i].fecha)).matricula += mats[i].totales.total; }
          claves.sort();
          for (k = 0; k < claves.length; k++) {
            fila = meses[claves[k]];
            filas.push([nombreMes(claves[k]), fila.recibos, ctx.redondear(fila.pension), ctx.redondear(fila.mora), ctx.redondear(fila.matricula), ctx.redondear(fila.pension + fila.mora + fila.matricula)]);
            etiquetas.push(nombreMes(claves[k]));
            valores.push(ctx.redondear(fila.pension + fila.mora + fila.matricula));
            tPen += fila.pension;
            tMora += fila.mora;
            tMat += fila.matricula;
          }
          return {
            columnas: ['Mes', 'Recibos', 'Pensiones', 'Mora', 'Matrículas', 'Total cobrado'], tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Total cobrado', valor: ctx.redondear(tPen + tMora + tMat), tipo: 'moneda' },
              { etiqueta: 'Mora cobrada', valor: ctx.redondear(tMora), tipo: 'moneda' },
              { etiqueta: 'Recibos emitidos', valor: pagadas.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'cuadro-meritos', titulo: 'Cuadro de méritos',
        descripcion: 'Los primeros puestos de cada grado según el promedio ponderado del periodo. En caso de empate gana la mayor asistencia.',
        roles: ['admin', 'director', 'docente', 'secretaria', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'grado', etiqueta: 'Grado', tipo: 'lista', opciones: ['Todos los grados'].concat(GRADOS), defecto: 'Todos los grados' },
          { id: 'top', etiqueta: 'Puestos por grado', tipo: 'entero', min: 1, max: 10, requerido: true, defecto: 3 }
        ],
        ejecutar: function (p, ctx) {
          var horas = mapaHoras(ctx), als = ctx.datos.listar('alumnos', function (a) { return a.estado === 'Matriculado' && (!p.grado || p.grado === 'Todos los grados' || a.grado === p.grado); });
          var porGrado = {}, grados = [], i, a, res, filas = [], etiquetas = [], valores = [], g, j, tope = p.top || 3;
          for (i = 0; i < als.length; i++) {
            a = als[i];
            res = resumenNotas(notasDeAlumno(ctx, a.id, p.desde, p.hasta), ctx, horas);
            if (res.promedio === null) { continue; }
            if (!porGrado[a.grado]) { porGrado[a.grado] = []; grados.push(a.grado); }
            porGrado[a.grado].push({ nombre: a.nombre, seccion: a.seccion, promedio: res.promedio, asistencia: res.asistencia });
          }
          grados.sort(function (x, y) { return GRADOS.indexOf(x) - GRADOS.indexOf(y); });
          for (i = 0; i < grados.length; i++) {
            g = porGrado[grados[i]];
            g.sort(function (x, y) { return y.promedio - x.promedio || y.asistencia - x.asistencia || (x.nombre < y.nombre ? -1 : 1); });
            for (j = 0; j < g.length && j < tope; j++) {
              filas.push([grados[i], j + 1, g[j].nombre, g[j].seccion, g[j].promedio, escalaLiteral(g[j].promedio), g[j].asistencia]);
              etiquetas.push(grados[i] + ' · ' + (j + 1) + '.º');
              valores.push(g[j].promedio);
            }
          }
          return {
            columnas: ['Grado', 'Puesto', 'Alumno', 'Sección', 'Promedio', 'Literal', 'Asistencia %'], tipos: ['texto', 'entero', 'texto', 'texto', 'numero', 'texto', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'numero' },
            resumen: [
              { etiqueta: 'Mejor promedio', valor: filas.length ? Math.max.apply(null, valores) : 0, tipo: 'numero' },
              { etiqueta: 'Grados con notas', valor: grados.length, tipo: 'entero' },
              { etiqueta: 'Puestos listados', valor: filas.length, tipo: 'entero' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Alumnos matriculados', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('alumnos', function (a) { return a.estado === 'Matriculado'; }).length; }
      },
      {
        titulo: 'Cobrado en los últimos 30 días', tipo: 'moneda', roles: ['admin', 'director', 'tesoreria', 'auditor'],
        nota: 'Pensiones pagadas, con mora',
        calcular: function (ctx) {
          var desde = ctx.fechaMas(ctx.hoy(), -29);
          return ctx.redondear(ctx.suma(ctx.datos.listar('pensiones', function (x) { return x.estado === 'Pagada' && x.fechaPago >= desde && x.fechaPago <= ctx.hoy(); }), function (x) { return x.totales.total; }));
        }
      },
      {
        titulo: 'Deuda vencida de pensiones', tipo: 'moneda', roles: ['admin', 'director', 'tesoreria', 'auditor'],
        nota: 'Pensión neta más mora hasta hoy',
        calcular: function (ctx) {
          var total = 0;
          vencidas(ctx).forEach(function (x) {
            var neto = pensionDe(ctx.datos.obtener('alumnos', x.alumno), ctx).neto;
            total += neto + moraPension(ctx, neto, x.vencimiento, ctx.hoy()).mora;
          });
          return ctx.redondear(total);
        }
      },
      {
        titulo: 'Promedio general del colegio', tipo: 'numero', roles: ['admin', 'director', 'docente', 'auditor'],
        nota: 'Promedio de los promedios ponderados de cada alumno',
        calcular: function (ctx) {
          var horas = mapaHoras(ctx), suma = 0, n = 0;
          ctx.datos.listar('alumnos', function (a) { return a.estado === 'Matriculado'; }).forEach(function (a) {
            var res = resumenNotas(notasDeAlumno(ctx, a.id), ctx, horas);
            if (res.promedio !== null) { suma += res.promedio; n += 1; }
          });
          return n ? ctx.redondear(suma / n) : null;
        }
      },
      {
        titulo: 'Alumnos en riesgo', tipo: 'entero', roles: ['admin', 'director', 'docente', 'auditor'],
        nota: 'Notas o asistencia bajo el mínimo',
        calcular: function (ctx) {
          var horas = mapaHoras(ctx), n = 0;
          ctx.datos.listar('alumnos', function (a) { return a.estado === 'Matriculado'; }).forEach(function (a) {
            var res = resumenNotas(notasDeAlumno(ctx, a.id), ctx, horas);
            if (res.n && motivoRiesgo(res, ctx)) { n += 1; }
          });
          return n;
        }
      },
      {
        titulo: 'Matrículas confirmadas para 2027', tipo: 'entero', roles: ['admin', 'director', 'secretaria', 'tesoreria', 'auditor'],
        calcular: function (ctx) { return ctx.datos.listar('matriculas', function (m) { return m.anio === '2027' && m.estado === 'Matriculada'; }).length; }
      }
    ],

    tableroGrafico: {
      titulo: 'Promedio de notas por bimestre (escala 0–20)', tipo: 'linea', formato: 'numero',
      calcular: function (ctx) {
        var horas = mapaHoras(ctx), todas = ctx.datos.listar('notas'), etiquetas = [], valores = [], i, res;
        for (i = 0; i < BIMESTRES.length; i++) {
          res = resumenNotas(todas.filter(function (n) { return n.bimestre === BIMESTRES[i]; }), ctx, horas);
          if (res.promedio === null) { continue; }
          etiquetas.push(BIMESTRES[i].replace(' Bimestre', ''));
          valores.push(res.promedio);
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      alumnos: alumnos,
      apoderados: APODERADOS,
      docentes: DOCENTES,
      cursos: CURSOS,
      notas: armarNotas(),
      pensiones: armarPensiones(),
      matriculas: armarMatriculas()
    }
  };
})();
