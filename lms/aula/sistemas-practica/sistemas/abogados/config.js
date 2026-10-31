/*
 * Estudio Jurídico Paredes & Asociados · Gestión de expedientes, horas y honorarios (Lima)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «abogados». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC, DNI, colegiatura y números de expediente de
 * ejemplo) y no corresponden a personas, empresas ni procesos reales.
 * Todo el código es ES5 (sin flechas, let, const ni plantillas).
 *
 * Reglas propias del rubro:
 *  - Horas facturables: lo trabajado menos lo no cobrable, redondeado hacia
 *    arriba a la fracción de facturación (por defecto, un cuarto de hora).
 *  - Valor de una actuación = horas facturables × tarifa del abogado, con
 *    recargo en audiencias y descuento por convenio del cliente.
 *  - Plazos procesales: se cuentan en días hábiles (sin sábados ni domingos)
 *    desde el día siguiente a la notificación.
 *  - Cuota litis: porcentaje del monto recuperado, dentro de un rango pactado.
 *  - Provisión de fondos: saldo = provisiones recibidas − gastos − lo aplicado a honorarios.
 */
(function () {
  'use strict';

  /* ---------- Constantes del negocio ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var C_HORAS = 'Honorarios por horas';
  var C_FIJO = 'Honorarios fijos por etapa';
  var C_LITIS = 'Cuota litis (éxito)';
  var C_PROV = 'Provisión de fondos';
  var C_GASTO = 'Gastos y tasas judiciales';
  var CONCEPTOS_HONORARIO = [C_HORAS, C_FIJO, C_LITIS];
  var ACTIVIDADES = ['Estudio del expediente', 'Redacción de escritos', 'Audiencia', 'Reunión con el cliente', 'Diligencia externa', 'Revisión de contratos', 'Consulta o informe'];
  var MATERIAS = ['Civil', 'Comercial', 'Laboral', 'Familia', 'Penal', 'Administrativo'];
  var JUZGADOS = ['1.º Juzgado Civil de Lima', '5.º Juzgado Civil de Lima', '12.º Juzgado Civil de Lima', '2.º Juzgado Comercial de Lima', '7.º Juzgado Laboral de Lima',
    '3.º Juzgado de Familia de Lima', '4.º Juzgado Penal Unipersonal de Lima', '1.º Juzgado Contencioso Administrativo de Lima', 'Sala Civil de la Corte Superior de Lima'];
  var ETAPAS = ['Postulatoria', 'Saneamiento', 'Probatoria', 'Alegatos', 'Sentencia', 'Apelación', 'Ejecución', 'Archivo'];
  var VER_ECONOMICO = ['admin', 'socio', 'contador', 'auditor'];

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  /* '2026-06' → 'jun 2026' */
  function nombreMes(clave) {
    return MESES[parseInt(clave.slice(5, 7), 10) - 1] + ' ' + clave.slice(0, 4);
  }

  /* Las últimas n claves 'AAAA-MM' hasta el mes de hoy, en orden cronológico. */
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

  /* Día de la semana de una fecha ISO: 0 = domingo … 6 = sábado. */
  function diaSemana(iso) {
    var p = String(iso).split('-');
    return new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10))).getUTCDay();
  }

  /* Suma n días HÁBILES (lunes a viernes) a una fecha: el día de la notificación no cuenta, el primero que cuenta es el siguiente hábil. */
  function sumarHabiles(ctx, fecha, n) {
    var f = fecha, cont = 0, d;
    while (cont < n && cont < 400) {
      f = ctx.fechaMas(f, 1);
      d = diaSemana(f);
      if (d !== 0 && d !== 6) { cont += 1; }
    }
    return f;
  }

  /* Fecha de vencimiento del plazo de un expediente, o '' si no tiene notificación o plazo. */
  function vencimientoPlazo(e, ctx) {
    if (!e.fechaNotificacion || e.plazoDias === undefined || e.plazoDias === null || e.plazoDias === '') { return ''; }
    return sumarHabiles(ctx, e.fechaNotificacion, e.plazoDias);
  }

  /* Días de calendario que faltan para el vencimiento (negativo = vencido). */
  function diasParaVencer(e, ctx) {
    var v = vencimientoPlazo(e, ctx);
    return v ? ctx.diasEntre(ctx.hoy(), v) : null;
  }

  /* Texto de alerta del plazo de un expediente. */
  function alertaPlazo(e, ctx) {
    var dias;
    if (e.estado !== 'Activo') { return 'No aplica'; }
    dias = diasParaVencer(e, ctx);
    if (dias === null) { return 'Sin plazo'; }
    if (dias < 0) { return 'Vencido hace ' + (-dias) + (dias === -1 ? ' día' : ' días'); }
    if (dias === 0) { return 'Vence hoy'; }
    if (dias <= ctx.param('diasAlertaPlazo')) { return 'Vence en ' + dias + (dias === 1 ? ' día' : ' días'); }
    return 'En plazo';
  }

  /* Horas facturables: (trabajadas − no cobrables), nunca negativas, subidas al siguiente múltiplo de la fracción de facturación. */
  function horasFacturables(horas, noCobrables, fraccion) {
    var h = Math.max(0, (horas || 0) - (noCobrables || 0));
    if (!(fraccion > 0)) { return h; }
    /* El redondeo a 3 decimales evita que 6.000000000000001 suba un escalón de más. */
    return Math.ceil(Math.round(h / fraccion * 1000) / 1000) * fraccion;
  }

  /* Tarifa por hora de un abogado (la de su categoría en el tarifario). */
  function tarifaDe(abogado, ctx) {
    var t = abogado && abogado.tarifa ? ctx.datos.obtener('tarifas', abogado.tarifa) : null;
    return t ? t.tarifaHora : 0;
  }

  /* Actuaciones que cuentan (registradas o ya facturadas), dentro de un rango de fechas. */
  function actuacionesVigentes(ctx, desde, hasta, filtro) {
    return ctx.datos.listar('actuaciones', function (a) {
      return (a.estado === 'Registrada' || a.estado === 'Facturada') && (!desde || a.fecha >= desde) && (!hasta || a.fecha <= hasta) && (!filtro || filtro(a));
    });
  }

  /* Honorarios que cuentan como facturados (emitidos o cobrados) y no son provisión ni gasto. */
  function honorariosFacturados(ctx, desde, hasta) {
    return ctx.datos.listar('honorarios', function (h) {
      return (h.estado === 'Emitido' || h.estado === 'Cobrado') && CONCEPTOS_HONORARIO.indexOf(h.concepto) !== -1 && (!desde || h.fecha >= desde) && (!hasta || h.fecha <= hasta);
    });
  }

  /* Valor de las horas de un expediente entre dos fechas (inclusive). */
  function horasValorizadas(ctx, expId, desde, hasta) {
    if (!expId || !desde || !hasta) { return 0; }
    return ctx.suma(actuacionesVigentes(ctx, desde, hasta, function (a) { return a.expediente === expId; }), function (a) { return a.totales ? a.totales.total : 0; });
  }

  /* Totales de un documento de honorarios o provisiones (los usa calcular y las reglas). */
  function totalesHonorario(doc, ctx) {
    var monto = doc.monto || 0, honorarios = 0, esHonorario = CONCEPTOS_HONORARIO.indexOf(doc.concepto) !== -1, igv, total, aplicado;
    if (doc.concepto === C_HORAS) { honorarios = horasValorizadas(ctx, doc.expediente, doc.periodoDesde, doc.periodoHasta); }
    else if (doc.concepto === C_LITIS) { honorarios = (doc.montoRecuperado || 0) * (doc.porcentajeLitis || 0) / 100; }
    else if (doc.concepto === C_FIJO) { honorarios = monto; }
    honorarios = ctx.redondear(honorarios);
    igv = esHonorario ? ctx.redondear(honorarios * ctx.param('igv') / 100) : 0;
    total = esHonorario ? ctx.redondear(honorarios + igv) : ctx.redondear(monto);
    aplicado = esHonorario ? ctx.redondear(doc.aplicarProvision || 0) : 0;
    return { honorarios: honorarios, igv: igv, total: total, aplicado: aplicado, porCobrar: ctx.redondear(total - aplicado) };
  }

  /* Saldo de la provisión de fondos de un expediente: lo recibido menos los gastos y lo aplicado a honorarios. */
  function saldoProvision(ctx, expId) {
    var docs = ctx.datos.listar('honorarios', function (h) { return h.expediente === expId; }), i, d, saldo = 0, t;
    for (i = 0; i < docs.length; i++) {
      d = docs[i];
      t = d.totales || {};
      if (d.concepto === C_PROV) { if (d.estado === 'Cobrado') { saldo += t.total || 0; } }
      else if (d.estado === 'Emitido' || d.estado === 'Cobrado') { saldo -= d.concepto === C_GASTO ? (t.total || 0) : (t.aplicado || 0); }
    }
    return ctx.redondear(saldo);
  }

  /* Lo que el cliente todavía debe de un documento de honorarios o provisión (los gastos se descuentan de la provisión). */
  function pendienteDeCobro(d) {
    if (d.estado !== 'Emitido' || d.concepto === C_GASTO) { return 0; }
    return d.totales ? d.totales.porCobrar || 0 : 0;
  }

  /* ---------- Datos de demostración ---------- */

  var ACT_LETRA = { E: ACTIVIDADES[0], R: ACTIVIDADES[1], A: ACTIVIDADES[2], C: ACTIVIDADES[3], D: ACTIVIDADES[4], V: ACTIVIDADES[5], I: ACTIVIDADES[6] };
  var ESTADO_ACT = { F: 'Facturada', R: 'Registrada', A: 'Anulada', B: 'Borrador' };
  var ESTADO_HON = { C: 'Cobrado', E: 'Emitido', B: 'Borrador', A: 'Anulado' };

  function id4(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : (n < 100 ? '00' : '0')) + n; }

  /* Fila de expediente: [n.º, número judicial, carátula, cliente, materia, juzgado, etapa, estado, responsable, apertura (días atrás), cuantía, modalidad, notificación (días atrás), plazo (días hábiles), acto con plazo] */
  var EXPEDIENTES_FILAS = [
    [1, '00123-2023-0-1801-JR-CO-02', 'Textiles Andinos c. Distribuidora Norte s/ pago de facturas', 1, 'Comercial', JUZGADOS[3], 'Probatoria', 'Activo', 3, 420, 185000, 'Por horas', 6, 10, 'Contestación de la reconvención'],
    [2, '00456-2024-0-1801-JR-CI-12', 'Inversiones Mirador c. Banco Regional s/ nulidad de cláusula', 2, 'Civil', JUZGADOS[2], 'Saneamiento', 'Activo', 6, 300, 92000, 'Por horas', 3, 5, 'Subsanación de observaciones'],
    [3, '00871-2022-0-1801-JR-LA-07', 'Medina Torres c. Textil Sur s/ pago de beneficios sociales', 10, 'Laboral', JUZGADOS[4], 'Alegatos', 'Activo', 4, 610, 48500, 'Cuota litis', 12, 3, 'Alegatos escritos'],
    [4, '01034-2023-0-1801-JR-FC-03', 'Delgado Paucar s/ divorcio por causal y liquidación de gananciales', 9, 'Familia', JUZGADOS[5], 'Sentencia', 'Activo', 2, 520, 120000, 'Honorario fijo', null, null, ''],
    [5, '01290-2025-0-1801-JR-CI-05', 'Valle Verde c. Transportes Cóndor s/ indemnización por daños', 5, 'Civil', JUZGADOS[1], 'Postulatoria', 'Activo', 1, 148, 310000, 'Por horas', 1, 15, 'Contestación de la demanda'],
    [6, '01377-2024-0-1801-JR-PE-04', 'Ministerio Público c. Bustamante Gil s/ estafa (defensa)', 11, 'Penal', JUZGADOS[6], 'Probatoria', 'Activo', 5, 340, 0, 'Honorario fijo', 8, 5, 'Ofrecimiento de medios probatorios'],
    [7, '01502-2025-0-1801-JR-CA-01', 'Colegio Nueva Esperanza c. UGEL s/ nulidad de resolución', 6, 'Administrativo', JUZGADOS[7], 'Postulatoria', 'Activo', 8, 118, 64000, 'Por horas', 20, 10, 'Absolución del traslado'],
    [8, '01688-2023-0-1801-JR-CO-09', 'Ferretero Los Álamos c. Importaciones Mar s/ resolución de contrato', 7, 'Comercial', JUZGADOS[8], 'Apelación', 'Activo', 7, 480, 76000, 'Por horas', 4, 10, 'Fundamentación de la apelación'],
    [9, '01722-2024-0-1801-JR-LA-02', 'Ramos Villacorta c. Servicios Generales s/ desnaturalización de contrato', 14, 'Laboral', JUZGADOS[4], 'Ejecución', 'Suspendido', 9, 380, 31000, 'Cuota litis', null, null, ''],
    [10, '01845-2022-0-1801-JR-CI-08', 'Asociación de Vivienda Los Jardines s/ prescripción adquisitiva', 8, 'Civil', JUZGADOS[0], 'Archivo', 'Concluido', 10, 700, 250000, 'Honorario fijo', null, null, ''],
    [11, '01901-2025-0-1801-JR-CO-11', 'Transportes Cóndor c. Aseguradora Pacífica s/ cobro de siniestro', 4, 'Comercial', JUZGADOS[3], 'Saneamiento', 'Activo', 3, 94, 140000, 'Por horas', 2, 5, 'Observaciones a la prueba'],
    [12, '02011-2024-0-1801-JR-FC-06', 'Quispe Huamán s/ alimentos', 13, 'Familia', JUZGADOS[5], 'Probatoria', 'Activo', 2, 258, 18000, 'Honorario fijo', 9, 5, 'Presentación de pruebas de ingresos'],
    [13, '02133-2025-0-1801-JR-CI-03', 'Mascotas Felices c. Arrendador s/ desalojo por vencimiento de contrato', 3, 'Civil', JUZGADOS[2], 'Postulatoria', 'Activo', 6, 68, 22000, 'Por horas', 2, 3, 'Subsanación de la demanda'],
    [14, '02250-2026-0-1801-JR-CI-01', 'Valdivia Cornejo s/ otorgamiento de escritura pública', 12, 'Civil', JUZGADOS[0], 'Postulatoria', 'Activo', 10, 38, 85000, 'Honorario fijo', 1, 5, 'Absolución de excepciones'],
    [15, '02302-2026-0-1801-JR-CA-01', 'Textiles Andinos s/ impugnación de multa administrativa', 1, 'Administrativo', JUZGADOS[7], 'Postulatoria', 'Activo', 8, 24, 38000, 'Por horas', 14, 15, 'Alegatos de la demanda']
  ];

  function armarExpedientes() {
    var r = [], i, j, f, e, ultima;
    for (i = 0; i < EXPEDIENTES_FILAS.length; i++) {
      f = EXPEDIENTES_FILAS[i];
      e = { id: id4('EXP', f[0]), numero: f[1], caratula: f[2], cliente: id4('CLI', f[3]), materia: f[4], juzgado: f[5], etapa: f[6], estado: f[7], responsable: id4('ABO', f[8]), fechaApertura: '@-' + f[9], cuantia: f[10], modalidad: f[11] };
      if (f[12] !== null) { e.fechaNotificacion = '@-' + f[12]; e.plazoDias = f[13]; e.actoProcesal = f[14]; }
      ultima = null;
      for (j = 0; j < ACTUACIONES.length; j++) {
        if (ACTUACIONES[j][1] === f[0] && (ACTUACIONES[j][6] === 'F' || ACTUACIONES[j][6] === 'R') && (ultima === null || ACTUACIONES[j][0] < ultima)) { ultima = ACTUACIONES[j][0]; }
      }
      if (ultima !== null) { e.ultimaActuacion = '@-' + ultima; }
      r.push(e);
    }
    return r;
  }

  /* Fila de actuación: [días atrás, expediente, abogado, actividad (letra), horas, no cobrables, estado (letra)] */
  var ACTUACIONES = [
    [178, 1, 3, 'E', 3.5, 0, 'F'], [172, 3, 4, 'R', 5, 0.5, 'F'], [168, 4, 2, 'C', 1.5, 0, 'F'], [165, 8, 7, 'R', 6, 1, 'F'], [160, 1, 9, 'V', 2.2, 0.7, 'F'],
    [156, 2, 6, 'E', 4, 0, 'F'], [150, 6, 5, 'A', 2, 0, 'F'], [147, 10, 10, 'R', 3.75, 0, 'F'], [143, 5, 1, 'C', 1, 0, 'F'], [140, 3, 4, 'A', 3, 0, 'F'],
    [135, 8, 3, 'A', 2.5, 0, 'F'], [130, 4, 2, 'R', 4, 0, 'F'], [126, 2, 6, 'D', 3, 0.5, 'F'], [121, 6, 5, 'C', 1.25, 0, 'F'], [115, 1, 7, 'A', 3, 0, 'F'],
    [110, 5, 6, 'R', 5.5, 0, 'F'], [104, 12, 2, 'E', 2, 0, 'F'], [99, 8, 7, 'R', 4.5, 0, 'F'], [94, 11, 3, 'E', 2.5, 0, 'F'], [88, 3, 9, 'I', 1, 0, 'F'],
    [82, 2, 6, 'R', 3.5, 0, 'F'], [76, 7, 8, 'E', 3, 0, 'R'], [70, 6, 5, 'A', 4, 0, 'R'], [64, 5, 1, 'R', 2.25, 0, 'R'], [58, 12, 2, 'A', 2, 0, 'R'],
    [52, 1, 3, 'R', 3.75, 0, 'R'], [47, 11, 10, 'R', 3, 0.5, 'R'], [41, 7, 8, 'R', 5, 0, 'R'], [36, 13, 6, 'E', 2.5, 0, 'R'], [31, 8, 7, 'A', 2, 0, 'R'],
    [27, 2, 6, 'V', 2, 0, 'R'], [22, 4, 2, 'C', 1, 0, 'R'], [18, 5, 1, 'A', 2.5, 0, 'R'], [14, 14, 10, 'E', 3, 0, 'R'], [10, 15, 8, 'R', 4.25, 0, 'R'],
    [7, 1, 3, 'D', 2, 0, 'R'], [4, 3, 4, 'R', 2.75, 0, 'R'], [3, 6, 5, 'I', 1.5, 0, 'A'], [1, 13, 6, 'R', 3.25, 0, 'B'], [0, 14, 10, 'C', 1.5, 0, 'B']
  ];

  function armarActuaciones() {
    var r = [], i, f, d;
    for (i = 0; i < ACTUACIONES.length; i++) {
      f = ACTUACIONES[i];
      d = { id: id4('ACT', i + 1), fecha: '@-' + f[0], expediente: id4('EXP', f[1]), abogado: id4('ABO', f[2]), actividad: ACT_LETRA[f[3]], horas: f[4], estado: ESTADO_ACT[f[6]] };
      if (f[5]) { d.horasNoCobrables = f[5]; }
      r.push(d);
    }
    return r;
  }

  /* Fila de honorario/provisión: [días atrás, expediente, concepto, monto, periodo desde (días atrás), periodo hasta, % litis, monto recuperado, provisión aplicada, estado (letra)] */
  var HONORARIOS = [
    [172, 1, C_PROV, 3000, 0, 0, 0, 0, 0, 'C'],
    [168, 3, C_PROV, 2500, 0, 0, 0, 0, 0, 'C'],
    [149, 5, C_PROV, 4000, 0, 0, 0, 0, 0, 'C'],
    [140, 1, C_GASTO, 450, 0, 0, 0, 0, 0, 'E'],
    [160, 4, C_FIJO, 6000, 0, 0, 0, 0, 0, 'C'],
    [118, 8, C_HORAS, 0, 170, 100, 0, 0, 0, 'C'],
    [112, 1, C_HORAS, 0, 180, 115, 0, 0, 1200, 'C'],
    [95, 3, C_HORAS, 0, 175, 135, 0, 0, 800, 'C'],
    [90, 5, C_GASTO, 1200, 0, 0, 0, 0, 0, 'E'],
    [80, 2, C_HORAS, 0, 156, 82, 0, 0, 0, 'C'],
    [60, 4, C_FIJO, 5500, 0, 0, 0, 0, 0, 'C'],
    [55, 11, C_FIJO, 2000, 0, 0, 0, 0, 0, 'A'],
    [45, 6, C_FIJO, 4000, 0, 0, 0, 0, 0, 'C'],
    [30, 3, C_LITIS, 0, 0, 0, 25, 30000, 0, 'C'],
    [20, 8, C_HORAS, 0, 98, 30, 0, 0, 0, 'E'],
    [12, 5, C_HORAS, 0, 149, 60, 0, 0, 2000, 'E'],
    [4, 7, C_PROV, 1500, 0, 0, 0, 0, 0, 'E'],
    [2, 2, C_FIJO, 3500, 0, 0, 0, 0, 0, 'B']
  ];

  function armarHonorarios() {
    var r = [], i, f, d;
    for (i = 0; i < HONORARIOS.length; i++) {
      f = HONORARIOS[i];
      d = { id: id4('HON', i + 1), fecha: '@-' + f[0], expediente: id4('EXP', f[1]), concepto: f[2], monto: f[3], estado: ESTADO_HON[f[9]] };
      if (f[4]) { d.periodoDesde = '@-' + f[4]; d.periodoHasta = '@-' + f[5]; }
      if (f[6]) { d.porcentajeLitis = f[6]; d.montoRecuperado = f[7]; }
      if (f[8]) { d.aplicarProvision = f[8]; }
      r.push(d);
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'abogados',
    nombre: 'Estudio Jurídico Paredes & Asociados · Gestión legal',
    rubro: 'Estudio jurídico: expedientes, horas y honorarios',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#5b1b2f', acento: '#b8923a', siglas: 'PA' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma a los honorarios (no a provisiones ni gastos).' },
      { id: 'fraccionHoras', etiqueta: 'Fracción de facturación (horas)', tipo: 'numero', min: 0, max: 8, valor: 0.25, ayuda: 'Las horas facturables se redondean hacia arriba a este múltiplo (0.25 = cuarto de hora).' },
      { id: 'recargoAudiencia', etiqueta: 'Recargo por audiencia', tipo: 'porcentaje', valor: 20, ayuda: 'Se suma al valor de las horas de las actuaciones tipo audiencia.' },
      { id: 'cuotaLitisMin', etiqueta: 'Cuota litis · porcentaje mínimo', tipo: 'porcentaje', valor: 10, ayuda: 'Límite inferior del porcentaje que se puede pactar sobre el monto recuperado.' },
      { id: 'cuotaLitisMax', etiqueta: 'Cuota litis · porcentaje máximo', tipo: 'porcentaje', valor: 35 },
      { id: 'diasAlertaPlazo', etiqueta: 'Alerta de plazos (días)', tipo: 'entero', min: 0, max: 60, valor: 5, ayuda: 'Un plazo que vence en este número de días o menos se marca como «por vencer».' }
    ],

    seguridad: {
      minClave: 6,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: false,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: false,
      exportaRespetaPermisos: false,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administración del estudio', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros del estudio.' },
      { id: 'socio', nombre: 'Socio', descripcion: 'Ve todo el estudio, incluidos tarifas, costos y rentabilidad; fija tarifas y convenios, factura honorarios y puede anular actuaciones y cobros.' },
      { id: 'abogado', nombre: 'Abogado', descripcion: 'Lleva sus expedientes y registra sus horas; consulta plazos y etapas. No ve tarifas ni honorarios.' },
      { id: 'asistente', nombre: 'Asistente legal', descripcion: 'Abre clientes y expedientes, registra notificaciones y plazos y carga horas en nombre de los abogados. No ve tarifas ni honorarios.' },
      { id: 'contador', nombre: 'Contador', descripcion: 'Emite honorarios y provisiones, marca los cobros y revisa tarifas y rentabilidad. No toca expedientes ni horas.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el estudio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Carla Benítez Lozano', rol: 'admin', clave: 'Estudio#Adm2026' },
      { usuario: 'socio', nombre: 'Ricardo Paredes Villanueva', rol: 'socio', clave: 'Estudio#Soc2026' },
      { usuario: 'abogado', nombre: 'Lorena Ávila Rojas', rol: 'abogado', clave: 'Estudio#Abo2026' },
      { usuario: 'asistente', nombre: 'Milagros Ccahuana Poma', rol: 'asistente', clave: 'Estudio#Asi2026' },
      { usuario: 'contador', nombre: 'Walter Zevallos Montes', rol: 'contador', clave: 'Estudio#Con2026' },
      { usuario: 'auditor', nombre: 'Gisela Montoya Arce', rol: 'auditor', clave: 'Estudio#Aud2026' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'documento', etiqueta: 'DNI o RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^([0-9]{8}|[0-9]{11})$', mensajePatron: 'Escribe un DNI de 8 dígitos o un RUC de 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre o razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'tipo', etiqueta: 'Tipo de cliente', tipo: 'lista', requerido: true, opciones: ['Persona natural', 'Persona jurídica'], defecto: 'Persona natural' },
          { id: 'distrito', etiqueta: 'Distrito', tipo: 'lista', opciones: ['Cercado de Lima', 'San Isidro', 'Miraflores', 'Santiago de Surco', 'La Molina', 'San Borja', 'Jesús María', 'Lince', 'San Miguel', 'Ate'] },
          { id: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', max: 60 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'descuentoConvenio', etiqueta: 'Descuento por convenio', tipo: 'porcentaje', min: 0, max: 30, defecto: 0, ver: VER_ECONOMICO, ayuda: 'Se descuenta del valor de las horas de este cliente.' },
          { id: 'fechaAlta', etiqueta: 'Cliente desde', tipo: 'fecha', max: 'hoy' }
        ],
        lista: ['documento', 'nombre', 'tipo', 'distrito', 'expedientesActivos', 'facturado'],
        buscar: ['documento', 'nombre', 'distrito', 'contacto'],
        calculados: [
          {
            id: 'expedientesActivos', etiqueta: 'Expedientes activos', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('expedientes', function (e) { return e.cliente === r.id && e.estado === 'Activo'; }).length; }
          },
          {
            id: 'facturado', etiqueta: 'Honorarios facturados', tipo: 'moneda', ver: VER_ECONOMICO,
            formula: function (r, ctx) {
              var exps = ctx.datos.listar('expedientes', function (e) { return e.cliente === r.id; }), ids = {}, i;
              for (i = 0; i < exps.length; i++) { ids[exps[i].id] = true; }
              return ctx.redondear(ctx.suma(honorariosFacturados(ctx), function (h) { return ids[h.expediente] ? h.totales.honorarios : 0; }));
            }
          }
        ],
        permisos: { ver: ['admin', 'socio', 'abogado', 'asistente', 'contador', 'auditor'], crear: ['admin', 'socio', 'asistente'], editar: ['admin', 'socio', 'asistente'], eliminar: ['admin'] }
      },
      {
        id: 'expedientes', nombre: 'Expediente', plural: 'Expedientes', prefijo: 'EXP',
        campos: [
          { id: 'numero', etiqueta: 'N.º de expediente', tipo: 'texto', requerido: true, unico: true, max: 30, patron: '^[0-9A-Z-]{8,30}$', mensajePatron: 'Usa mayúsculas, números y guiones (de 8 a 30 caracteres).' },
          { id: 'caratula', etiqueta: 'Carátula', tipo: 'texto', requerido: true, max: 120, ayuda: 'Las partes y la pretensión, por ejemplo «Pérez c. Constructora Sur s/ indemnización».' },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'materia', etiqueta: 'Materia', tipo: 'lista', requerido: true, opciones: MATERIAS },
          { id: 'juzgado', etiqueta: 'Juzgado o sala', tipo: 'lista', requerido: true, opciones: JUZGADOS },
          { id: 'etapa', etiqueta: 'Etapa procesal', tipo: 'lista', requerido: true, opciones: ETAPAS, defecto: 'Postulatoria' },
          { id: 'estado', etiqueta: 'Estado del expediente', tipo: 'lista', requerido: true, opciones: ['Activo', 'Suspendido', 'Concluido'], defecto: 'Activo' },
          { id: 'responsable', etiqueta: 'Abogado responsable', tipo: 'ref', entidad: 'abogados', mostrar: 'nombre', requerido: true },
          { id: 'fechaApertura', etiqueta: 'Fecha de apertura', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'cuantia', etiqueta: 'Cuantía de la pretensión', tipo: 'moneda', min: 0, defecto: 0 },
          { id: 'modalidad', etiqueta: 'Modalidad de cobro', tipo: 'lista', opciones: ['Por horas', 'Honorario fijo', 'Cuota litis'], defecto: 'Por horas', ver: VER_ECONOMICO },
          { id: 'actoProcesal', etiqueta: 'Acto procesal con plazo', tipo: 'texto', max: 80 },
          { id: 'fechaNotificacion', etiqueta: 'Fecha de notificación', tipo: 'fecha', max: 'hoy', ayuda: 'El plazo se cuenta desde el día siguiente.' },
          { id: 'plazoDias', etiqueta: 'Plazo en días hábiles', tipo: 'entero', min: 0, max: 90, ayuda: 'Sin sábados ni domingos. No descuenta feriados.' },
          { id: 'ultimaActuacion', etiqueta: 'Última actuación', tipo: 'fecha', max: 'hoy' }
        ],
        lista: ['numero', 'caratula', 'materia', 'etapa', 'estado', 'vencePlazo', 'alerta'],
        buscar: ['numero', 'caratula', 'materia', 'juzgado'],
        calculados: [
          {
            id: 'vencePlazo', etiqueta: 'Vence el plazo', tipo: 'fecha',
            formula: function (r, ctx) { return vencimientoPlazo(r, ctx) || null; }
          },
          {
            id: 'diasRestantes', etiqueta: 'Días para vencer', tipo: 'entero',
            formula: function (r, ctx) { return diasParaVencer(r, ctx); }
          },
          {
            id: 'alerta', etiqueta: 'Alerta de plazo', tipo: 'texto',
            formula: function (r, ctx) { return alertaPlazo(r, ctx); }
          },
          {
            id: 'horasFacturables', etiqueta: 'Horas facturables', tipo: 'numero',
            formula: function (r, ctx) {
              return ctx.redondear(ctx.suma(actuacionesVigentes(ctx, null, null, function (a) { return a.expediente === r.id; }), function (a) { return a.totales ? a.totales.horasFacturables : 0; }));
            }
          },
          {
            id: 'valorHoras', etiqueta: 'Valor de las horas', tipo: 'moneda', ver: VER_ECONOMICO,
            formula: function (r, ctx) { return ctx.redondear(horasValorizadas(ctx, r.id, '0000-01-01', '9999-12-31')); }
          },
          {
            id: 'saldoProvision', etiqueta: 'Saldo de provisión', tipo: 'moneda', ver: VER_ECONOMICO,
            formula: function (r, ctx) { return saldoProvision(ctx, r.id); }
          }
        ],
        reglas: [
          {
            id: 'notificacion-posterior-apertura', mensaje: 'La notificación no puede ser anterior a la apertura del expediente.',
            validar: function (r) { return !r.fechaNotificacion || !r.fechaApertura || r.fechaNotificacion >= r.fechaApertura; }
          },
          {
            id: 'plazo-con-notificacion', mensaje: 'Para calcular un plazo se necesita la fecha de notificación.',
            validar: function (r) { return !r.plazoDias || !!r.fechaNotificacion; }
          }
        ],
        permisos: { ver: ['admin', 'socio', 'abogado', 'asistente', 'contador', 'auditor'], crear: ['admin', 'socio', 'abogado', 'asistente'], editar: ['admin', 'socio', 'abogado', 'asistente'], eliminar: ['admin'] }
      },
      {
        id: 'abogados', nombre: 'Abogado', plural: 'Abogados', prefijo: 'ABO',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'cal', etiqueta: 'Colegiatura (CAL)', tipo: 'texto', unico: true, max: 6, patron: '^[0-9]{4,6}$', mensajePatron: 'El número de colegiatura tiene de 4 a 6 dígitos. Los practicantes no tienen.' },
          { id: 'especialidad', etiqueta: 'Especialidad', tipo: 'lista', requerido: true, opciones: MATERIAS },
          { id: 'tarifa', etiqueta: 'Categoría en el tarifario', tipo: 'ref', entidad: 'tarifas', mostrar: 'concepto', requerido: true, ver: ['admin', 'socio', 'abogado', 'contador', 'auditor'] },
          { id: 'costoHora', etiqueta: 'Costo interno por hora', tipo: 'moneda', min: 0, requerido: true, ver: VER_ECONOMICO, ayuda: 'Lo que le cuesta al estudio una hora de este abogado. Entra en la rentabilidad por cliente.' },
          { id: 'horasMeta', etiqueta: 'Meta de horas al mes', tipo: 'entero', min: 0, max: 220, requerido: true, defecto: 20 },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'activo', etiqueta: 'Abogado activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['nombre', 'especialidad', 'tarifaHora', 'horasMes', 'cumplimiento'],
        buscar: ['nombre', 'cal', 'especialidad'],
        calculados: [
          {
            id: 'tarifaHora', etiqueta: 'Tarifa por hora', tipo: 'moneda', ver: ['admin', 'socio', 'abogado', 'contador', 'auditor'],
            formula: function (r, ctx) { return tarifaDe(r, ctx); }
          },
          {
            id: 'horasMes', etiqueta: 'Horas facturables del mes', tipo: 'numero',
            formula: function (r, ctx) {
              var desde = ctx.hoy().slice(0, 8) + '01';
              return ctx.redondear(ctx.suma(actuacionesVigentes(ctx, desde, ctx.hoy(), function (a) { return a.abogado === r.id; }), function (a) { return a.totales ? a.totales.horasFacturables : 0; }));
            }
          },
          {
            id: 'cumplimiento', etiqueta: 'Cumplimiento de la meta', tipo: 'porcentaje',
            formula: function (r, ctx) {
              var desde = ctx.hoy().slice(0, 8) + '01', horas;
              if (!(r.horasMeta > 0)) { return null; }
              horas = ctx.suma(actuacionesVigentes(ctx, desde, ctx.hoy(), function (a) { return a.abogado === r.id; }), function (a) { return a.totales ? a.totales.horasFacturables : 0; });
              return ctx.redondear(horas / r.horasMeta * 100);
            }
          }
        ],
        permisos: { ver: ['admin', 'socio', 'abogado', 'asistente', 'contador', 'auditor'], crear: ['admin', 'socio'], editar: ['admin', 'socio'], eliminar: ['admin'] }
      },
      {
        id: 'tarifas', nombre: 'Tarifa', plural: 'Tarifario', prefijo: 'TRF',
        campos: [
          { id: 'concepto', etiqueta: 'Categoría o concepto', tipo: 'texto', requerido: true, unico: true, max: 50 },
          { id: 'tarifaHora', etiqueta: 'Tarifa por hora (sin IGV)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'descripcion', etiqueta: 'A quién se aplica', tipo: 'textarea', max: 200 },
          { id: 'vigenteDesde', etiqueta: 'Vigente desde', tipo: 'fecha', max: 'hoy' },
          { id: 'activa', etiqueta: 'Tarifa vigente', tipo: 'booleano', defecto: true }
        ],
        lista: ['concepto', 'tarifaHora', 'vigenteDesde', 'abogados'],
        buscar: ['concepto', 'descripcion'],
        calculados: [
          {
            id: 'abogados', etiqueta: 'Abogados con esta tarifa', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('abogados', function (a) { return a.tarifa === r.id; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'socio', 'contador', 'auditor'], crear: ['admin', 'socio'], editar: ['admin', 'socio'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'actuaciones', nombre: 'Actuación', plural: 'Actuaciones (partes de horas)', prefijo: 'ACT', serie: 'PH01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'expediente', etiqueta: 'Expediente', tipo: 'ref', entidad: 'expedientes', mostrar: 'numero', requerido: true },
          { id: 'abogado', etiqueta: 'Abogado', tipo: 'ref', entidad: 'abogados', mostrar: 'nombre', requerido: true },
          { id: 'actividad', etiqueta: 'Actividad', tipo: 'lista', requerido: true, opciones: ACTIVIDADES, defecto: ACTIVIDADES[1] },
          { id: 'horas', etiqueta: 'Horas trabajadas', tipo: 'numero', min: 0.25, max: 12, requerido: true, defecto: 1, ayuda: 'En decimales: 1.5 = una hora y media.' },
          { id: 'horasNoCobrables', etiqueta: 'Horas no cobrables', tipo: 'numero', min: 0, max: 12, defecto: 0, ayuda: 'Cortesía, error propio o tiempo de aprendizaje: no se cobran al cliente.' },
          { id: 'descripcion', etiqueta: 'Descripción del trabajo', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'expediente', 'abogado', 'actividad'],
        estados: ['Borrador', 'Registrada', 'Facturada', 'Anulada'],
        calcular: function (doc, ctx) {
          var abo = doc.abogado ? ctx.datos.obtener('abogados', doc.abogado) : null;
          var exp = doc.expediente ? ctx.datos.obtener('expedientes', doc.expediente) : null;
          var cli = exp ? ctx.datos.obtener('clientes', exp.cliente) : null;
          var tarifa = tarifaDe(abo, ctx);
          var hf = horasFacturables(doc.horas, doc.horasNoCobrables, ctx.param('fraccionHoras'));
          var base = hf * tarifa;
          var recargo = doc.actividad === 'Audiencia' ? base * ctx.param('recargoAudiencia') / 100 : 0;
          var descuento = (base + recargo) * (cli && cli.descuentoConvenio ? cli.descuentoConvenio : 0) / 100;
          return { horasFacturables: hf, tarifa: tarifa, recargo: recargo, descuento: descuento, total: base + recargo - descuento };
        },
        totales: [
          { id: 'horasFacturables', etiqueta: 'Horas facturables', tipo: 'numero' },
          { id: 'tarifa', etiqueta: 'Tarifa por hora del abogado' },
          { id: 'recargo', etiqueta: 'Recargo por audiencia' },
          { id: 'descuento', etiqueta: 'Descuento por convenio' },
          { id: 'total', etiqueta: 'Valor de las horas (sin IGV)', fuerte: true }
        ],
        reglas: [
          {
            id: 'no-cobrables-menor', mensaje: 'Las horas no cobrables no pueden superar las horas trabajadas.',
            validar: function (d) { return (d.horasNoCobrables || 0) <= (d.horas || 0); }
          },
          {
            id: 'expediente-abierto', mensaje: 'Solo se registran horas en expedientes activos y desde su fecha de apertura.',
            validar: function (d, ctx) {
              var e = ctx.datos.obtener('expedientes', d.expediente);
              return !!e && e.estado === 'Activo' && (!e.fechaApertura || d.fecha >= e.fechaApertura);
            }
          },
          {
            id: 'abogado-en-actividad', mensaje: 'El abogado elegido está inactivo.',
            validar: function (d, ctx) {
              var a = ctx.datos.obtener('abogados', d.abogado);
              return !!a && a.activo !== false;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var e = ctx.datos.obtener('expedientes', doc.expediente);
          /* La actuación ya figura como registrada: la última actuación del expediente es la más reciente. */
          if (!e.ultimaActuacion || doc.fecha > e.ultimaActuacion) { ctx.datos.actualizar('expedientes', doc.expediente, { ultimaActuacion: doc.fecha }); }
        },
        alAnular: function (doc, ctx) {
          var e = ctx.datos.obtener('expedientes', doc.expediente), otras = actuacionesVigentes(ctx, null, null, function (a) { return a.expediente === doc.expediente && a.id !== doc.id; }), ultima = e.fechaApertura, i;
          for (i = 0; i < otras.length; i++) { if (otras[i].fecha > ultima) { ultima = otras[i].fecha; } }
          ctx.datos.actualizar('expedientes', doc.expediente, { ultimaActuacion: ultima });
        },
        permisos: { ver: ['admin', 'socio', 'abogado', 'asistente', 'contador', 'auditor'], crear: ['admin', 'socio', 'abogado', 'asistente'], editar: ['admin', 'socio', 'abogado', 'asistente'], emitir: ['admin', 'socio', 'abogado', 'asistente', 'contador'], anular: ['admin', 'socio'] }
      },
      {
        id: 'honorarios', nombre: 'Cobro', plural: 'Honorarios y provisiones', prefijo: 'HON', serie: 'H001',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'expediente', etiqueta: 'Expediente', tipo: 'ref', entidad: 'expedientes', mostrar: 'numero', requerido: true },
          { id: 'concepto', etiqueta: 'Concepto', tipo: 'lista', requerido: true, opciones: [C_HORAS, C_FIJO, C_LITIS, C_PROV, C_GASTO], defecto: C_FIJO },
          { id: 'monto', etiqueta: 'Monto base', tipo: 'moneda', min: 0, requerido: true, ayuda: 'Honorario fijo, provisión o gasto. En honorarios por horas y cuota litis se calcula solo: deja 0.' },
          { id: 'periodoDesde', etiqueta: 'Horas desde', tipo: 'fecha', max: 'hoy', ayuda: 'Solo para honorarios por horas: se suman las actuaciones del periodo.' },
          { id: 'periodoHasta', etiqueta: 'Horas hasta', tipo: 'fecha', max: 'hoy' },
          { id: 'montoRecuperado', etiqueta: 'Monto recuperado', tipo: 'moneda', min: 0, defecto: 0, ayuda: 'Solo para cuota litis: lo que el cliente ganó o cobró.' },
          { id: 'porcentajeLitis', etiqueta: 'Porcentaje de cuota litis', tipo: 'porcentaje', min: 0, max: 100, ayuda: 'Dentro del rango permitido en Configuración.' },
          { id: 'aplicarProvision', etiqueta: 'Provisión aplicada', tipo: 'moneda', min: 0, defecto: 0, ayuda: 'Se descuenta del saldo de provisión de fondos del expediente.' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'expediente', 'concepto'],
        estados: ['Borrador', 'Emitido', 'Cobrado', 'Anulado'],
        calcular: function (doc, ctx) { return totalesHonorario(doc, ctx); },
        totales: [
          { id: 'honorarios', etiqueta: 'Honorarios (sin IGV)' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total del documento', fuerte: true },
          { id: 'aplicado', etiqueta: 'Provisión aplicada' },
          { id: 'porCobrar', etiqueta: 'Por cobrar al cliente' }
        ],
        reglas: [
          {
            id: 'litis-en-rango', mensaje: 'La cuota litis necesita un porcentaje dentro del rango permitido en Configuración.',
            validar: function (d, ctx) {
              if (d.concepto !== C_LITIS) { return true; }
              return d.porcentajeLitis !== undefined && d.porcentajeLitis >= ctx.param('cuotaLitisMin') && d.porcentajeLitis <= ctx.param('cuotaLitisMax');
            }
          },
          {
            id: 'periodo-valido', mensaje: 'Para honorarios por horas indica el periodo (desde y hasta) y que el inicio no sea posterior al final.',
            validar: function (d) { return d.concepto !== C_HORAS || (!!d.periodoDesde && !!d.periodoHasta && d.periodoDesde <= d.periodoHasta); }
          },
          {
            id: 'aplicar-solo-honorarios', mensaje: 'La provisión solo se aplica a documentos de honorarios, y no puede superar el total del documento.',
            validar: function (d, ctx) {
              var t;
              if (!d.aplicarProvision) { return true; }
              if (CONCEPTOS_HONORARIO.indexOf(d.concepto) === -1) { return false; }
              t = totalesHonorario(d, ctx);
              return d.aplicarProvision <= t.total;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var t = totalesHonorario(doc, ctx), cruzados, saldo;
          if (doc.concepto === C_HORAS) {
            if (!(t.honorarios > 0)) { throw new Error('No hay actuaciones registradas en ese periodo para este expediente.'); }
            cruzados = ctx.datos.listar('honorarios', function (h) {
              return h.id !== doc.id && h.expediente === doc.expediente && h.concepto === C_HORAS && (h.estado === 'Emitido' || h.estado === 'Cobrado') && h.periodoDesde <= doc.periodoHasta && doc.periodoDesde <= h.periodoHasta;
            });
            if (cruzados.length) { throw new Error('Ya hay honorarios por horas emitidos (' + cruzados[0].id + ') que cruzan este periodo: se cobrarían dos veces.'); }
          } else if (doc.concepto === C_LITIS) {
            if (!(doc.montoRecuperado > 0)) { throw new Error('La cuota litis necesita el monto recuperado.'); }
          } else if (!(doc.monto > 0)) {
            throw new Error('El monto base debe ser mayor que cero.');
          }
          if (t.aplicado > 0) {
            /* El documento ya figura como emitido: el saldo ya descuenta su propia provisión. */
            saldo = saldoProvision(ctx, doc.expediente);
            if (saldo < 0) { throw new Error('La provisión que se aplica supera el saldo del expediente (faltan ' + ctx.fmt.moneda(-saldo) + ').'); }
          }
        },
        alAnular: function (doc, ctx) {
          var saldo;
          if (doc.concepto !== C_PROV) { return; }
          /* El documento ya figura como anulado: si el saldo queda negativo, esa provisión ya se había consumido. */
          saldo = saldoProvision(ctx, doc.expediente);
          if (saldo < 0) { throw new Error('No se puede anular: la provisión ya se usó en gastos u honorarios (el saldo quedaría en ' + ctx.fmt.moneda(saldo) + ').'); }
        },
        permisos: { ver: ['admin', 'socio', 'contador', 'auditor'], crear: ['admin', 'socio', 'contador'], editar: ['admin', 'socio', 'contador'], emitir: ['admin', 'socio', 'contador'], anular: ['admin', 'socio'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'horas-abogado', titulo: 'Horas por abogado',
        descripcion: 'Horas trabajadas, no cobrables y facturables de cada abogado en el periodo, el valor de esas horas y su utilización frente a la meta mensual.',
        roles: VER_ECONOMICO,
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var acts = actuacionesVigentes(ctx, p.desde, p.hasta), abogados = ctx.datos.listar('abogados'), filas = [], etiquetas = [], valores = [], i, a, mias, hs, hn, hf, valor, meses, meta, totalHf = 0, totalValor = 0;
          meses = Math.max(1, ctx.diasEntre(p.desde, p.hasta) + 1) / 30;
          for (i = 0; i < abogados.length; i++) {
            a = abogados[i];
            mias = acts.filter(function (x) { return x.abogado === a.id; });
            if (!mias.length) { continue; }
            hs = ctx.suma(mias, function (x) { return x.horas; });
            hn = ctx.suma(mias, function (x) { return x.horasNoCobrables || 0; });
            hf = ctx.suma(mias, function (x) { return x.totales.horasFacturables; });
            valor = ctx.suma(mias, function (x) { return x.totales.total; });
            meta = a.horasMeta * meses;
            filas.push([a.nombre, mias.length, ctx.redondear(hs), ctx.redondear(hn), ctx.redondear(hf), ctx.redondear(valor), meta > 0 ? ctx.redondear(hf / meta * 100) : 0]);
            totalHf += hf;
            totalValor += valor;
          }
          filas.sort(function (x, y) { return y[4] - x[4]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][4]); }
          return {
            columnas: ['Abogado', 'Actuaciones', 'Horas trabajadas', 'No cobrables', 'Horas facturables', 'Valor de las horas', 'Utilización de la meta %'],
            tipos: ['texto', 'entero', 'numero', 'numero', 'numero', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'numero' },
            resumen: [
              { etiqueta: 'Horas facturables', valor: ctx.redondear(totalHf), tipo: 'numero' },
              { etiqueta: 'Valor de las horas', valor: ctx.redondear(totalValor), tipo: 'moneda' },
              { etiqueta: 'Abogados con horas', valor: filas.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'honorarios-cobranza', titulo: 'Honorarios facturados vs. cobrados',
        descripcion: 'Honorarios emitidos y cobrados por mes (con IGV), lo que queda por cobrar y el porcentaje de cobranza. No incluye provisiones de fondos ni gastos.',
        roles: VER_ECONOMICO,
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var docs = honorariosFacturados(ctx, p.desde, p.hasta), grupos = ctx.agrupar(docs, function (h) { return ctx.mes(h.fecha); }), claves = [], k, g, fact, cob, filas = [], etiquetas = [], valores = [], tf = 0, tc = 0;
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          for (k = 0; k < claves.length; k++) {
            g = grupos[claves[k]];
            fact = ctx.redondear(ctx.suma(g, function (h) { return h.totales.total; }));
            cob = ctx.redondear(ctx.suma(g, function (h) { return h.estado === 'Cobrado' ? h.totales.total : 0; }));
            filas.push([nombreMes(claves[k]), g.length, fact, cob, ctx.redondear(fact - cob), fact > 0 ? ctx.redondear(cob / fact * 100) : 0]);
            etiquetas.push(nombreMes(claves[k]));
            valores.push(fact);
            tf += fact;
            tc += cob;
          }
          return {
            columnas: ['Mes', 'Documentos', 'Facturado', 'Cobrado', 'Por cobrar', 'Cobranza %'], tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Facturado', valor: ctx.redondear(tf), tipo: 'moneda' },
              { etiqueta: 'Cobrado', valor: ctx.redondear(tc), tipo: 'moneda' },
              { etiqueta: 'Cobranza', valor: tf > 0 ? ctx.redondear(tc / tf * 100) : 0, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'expedientes-etapa', titulo: 'Expedientes por etapa procesal',
        descripcion: 'Cuántos expedientes hay en cada etapa del proceso, su cuantía y su antigüedad promedio, para los expedientes abiertos en el periodo.',
        roles: ['admin', 'socio', 'abogado', 'asistente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Abiertos desde', tipo: 'fecha', requerido: true, defecto: '@-1000' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', opciones: ['Todos', 'Activo', 'Suspendido', 'Concluido'], defecto: 'Activo' }
        ],
        ejecutar: function (p, ctx) {
          var exps = ctx.datos.listar('expedientes', function (e) { return e.fechaApertura >= p.desde && e.fechaApertura <= p.hasta && (!p.estado || p.estado === 'Todos' || e.estado === p.estado); });
          var grupos = ctx.agrupar(exps, function (e) { return e.etapa; }), filas = [], etiquetas = [], valores = [], i, g, cuantia = 0;
          for (i = 0; i < ETAPAS.length; i++) {
            g = grupos[ETAPAS[i]];
            if (!g) { continue; }
            filas.push([ETAPAS[i], g.length, ctx.redondear(ctx.suma(g, function (e) { return e.cuantia || 0; })), Math.round(ctx.suma(g, function (e) { return ctx.diasEntre(e.fechaApertura, ctx.hoy()); }) / g.length)]);
            etiquetas.push(ETAPAS[i]);
            valores.push(g.length);
            cuantia += ctx.suma(g, function (e) { return e.cuantia || 0; });
          }
          return {
            columnas: ['Etapa', 'Expedientes', 'Cuantía total', 'Antigüedad promedio (días)'], tipos: ['texto', 'entero', 'moneda', 'entero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Expedientes', valor: exps.length, tipo: 'entero' },
              { etiqueta: 'Cuantía total', valor: ctx.redondear(cuantia), tipo: 'moneda' },
              { etiqueta: 'Etapas con casos', valor: filas.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'plazos', titulo: 'Plazos procesales por vencer',
        descripcion: 'Expedientes activos con plazo en curso: fecha de vencimiento (en días hábiles), días que faltan y alerta. Incluye los ya vencidos.',
        roles: ['admin', 'socio', 'abogado', 'asistente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Notificados desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'horizonte', etiqueta: 'Mostrar los que vencen en los próximos (días)', tipo: 'entero', min: 0, max: 120, defecto: 30 }
        ],
        ejecutar: function (p, ctx) {
          var exps = ctx.datos.listar('expedientes', function (e) { return e.estado === 'Activo' && e.fechaNotificacion && e.fechaNotificacion >= p.desde && e.fechaNotificacion <= p.hasta && e.plazoDias !== undefined; });
          var filas = [], i, e, dias, abo, vencidos = 0, urgentes = 0, cuenta = { 'Vencidos': 0, 'Vencen hoy': 0, 'Por vencer': 0, 'En plazo': 0 }, horizonte = p.horizonte === undefined ? 30 : p.horizonte;
          for (i = 0; i < exps.length; i++) {
            e = exps[i];
            dias = diasParaVencer(e, ctx);
            if (dias > horizonte) { continue; }
            abo = ctx.datos.obtener('abogados', e.responsable);
            filas.push([e.numero, e.caratula, abo ? abo.nombre : '', e.actoProcesal || '', e.fechaNotificacion, e.plazoDias, vencimientoPlazo(e, ctx), dias, alertaPlazo(e, ctx)]);
            if (dias < 0) { vencidos += 1; cuenta['Vencidos'] += 1; }
            else if (dias === 0) { urgentes += 1; cuenta['Vencen hoy'] += 1; }
            else if (dias <= ctx.param('diasAlertaPlazo')) { urgentes += 1; cuenta['Por vencer'] += 1; }
            else { cuenta['En plazo'] += 1; }
          }
          filas.sort(function (a, b) { return a[7] - b[7]; });
          return {
            columnas: ['Expediente', 'Carátula', 'Responsable', 'Acto con plazo', 'Notificado', 'Plazo (días hábiles)', 'Vence', 'Días restantes', 'Alerta'],
            tipos: ['texto', 'texto', 'texto', 'texto', 'fecha', 'entero', 'fecha', 'entero', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: ['Vencidos', 'Vencen hoy', 'Por vencer', 'En plazo'], valores: [cuenta['Vencidos'], cuenta['Vencen hoy'], cuenta['Por vencer'], cuenta['En plazo']], formato: 'entero' },
            resumen: [
              { etiqueta: 'Plazos en la lista', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Vencidos', valor: vencidos, tipo: 'entero' },
              { etiqueta: 'Vencen hoy o pronto', valor: urgentes, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'rentabilidad-cliente', titulo: 'Rentabilidad por cliente',
        descripcion: 'Honorarios facturados (sin IGV) menos el costo interno de las horas trabajadas para el cliente, y el margen que queda. Solo cuenta lo emitido o cobrado y las actuaciones registradas en el periodo.',
        roles: VER_ECONOMICO,
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var clientes = ctx.datos.listar('clientes'), filas = [], etiquetas = [], valores = [], i, c, exps, ids, ingreso, costo, horas, margen, totalIng = 0, totalCosto = 0;
          function delCliente(x) { return ids[x.expediente]; }
          for (i = 0; i < clientes.length; i++) {
            c = clientes[i];
            exps = ctx.datos.listar('expedientes', function (e) { return e.cliente === c.id; });
            ids = {};
            exps.forEach(function (e) { ids[e.id] = true; });
            ingreso = ctx.suma(honorariosFacturados(ctx, p.desde, p.hasta).filter(delCliente), function (h) { return h.totales.honorarios; });
            horas = actuacionesVigentes(ctx, p.desde, p.hasta, delCliente);
            costo = ctx.suma(horas, function (a) { var abo = ctx.datos.obtener('abogados', a.abogado); return abo ? a.horas * abo.costoHora : 0; });
            if (ingreso === 0 && costo === 0) { continue; }
            margen = ingreso - costo;
            filas.push([c.nombre, ctx.redondear(ctx.suma(horas, function (a) { return a.horas; })), ctx.redondear(ingreso), ctx.redondear(costo), ctx.redondear(margen), ingreso > 0 ? ctx.redondear(margen / ingreso * 100) : null]);
            totalIng += ingreso;
            totalCosto += costo;
          }
          filas.sort(function (a, b) { return b[4] - a[4]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][4]); }
          return {
            columnas: ['Cliente', 'Horas trabajadas', 'Honorarios facturados', 'Costo de las horas', 'Margen', 'Margen %'], tipos: ['texto', 'numero', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Honorarios facturados', valor: ctx.redondear(totalIng), tipo: 'moneda' },
              { etiqueta: 'Costo de las horas', valor: ctx.redondear(totalCosto), tipo: 'moneda' },
              { etiqueta: 'Margen del estudio', valor: ctx.redondear(totalIng - totalCosto), tipo: 'moneda' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Horas facturables del mes', tipo: 'numero',
        calcular: function (ctx) {
          var desde = ctx.hoy().slice(0, 8) + '01';
          return ctx.redondear(ctx.suma(actuacionesVigentes(ctx, desde, ctx.hoy()), function (a) { return a.totales.horasFacturables; }));
        }
      },
      {
        titulo: 'Honorarios facturados (30 días, con IGV)', tipo: 'moneda', roles: VER_ECONOMICO,
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(honorariosFacturados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (h) { return h.totales.total; }));
        }
      },
      {
        titulo: 'Por cobrar a clientes', tipo: 'moneda', roles: VER_ECONOMICO,
        nota: 'Documentos emitidos y no cobrados',
        calcular: function (ctx) { return ctx.redondear(ctx.suma(ctx.datos.listar('honorarios'), pendienteDeCobro)); }
      },
      {
        titulo: 'Expedientes activos', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('expedientes', function (e) { return e.estado === 'Activo'; }).length; }
      },
      {
        titulo: 'Plazos que vencen en 7 días', tipo: 'entero', roles: ['admin', 'socio', 'abogado', 'asistente', 'auditor'],
        nota: 'Incluye los que vencen hoy',
        calcular: function (ctx) {
          return ctx.datos.listar('expedientes', function (e) { var d = e.estado === 'Activo' ? diasParaVencer(e, ctx) : null; return d !== null && d >= 0 && d <= 7; }).length;
        }
      },
      {
        titulo: 'Saldo de provisiones de fondos', tipo: 'moneda', roles: VER_ECONOMICO,
        nota: 'Dinero de clientes en custodia',
        calcular: function (ctx) { return ctx.redondear(ctx.suma(ctx.datos.listar('expedientes'), function (e) { return saldoProvision(ctx, e.id); })); }
      }
    ],

    tableroGrafico: {
      titulo: 'Horas facturables del estudio en los últimos 6 meses', tipo: 'columnas', formato: 'numero',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), acts = actuacionesVigentes(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(acts, function (a) { return ctx.mes(a.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(ctx.redondear(ctx.suma(g[meses[i]] || [], function (a) { return a.totales.horasFacturables; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      tarifas: [
        { id: 'TRF-0001', concepto: 'Socio', tarifaHora: 480, descripcion: 'Socios del estudio: dirección de casos, audiencias clave y negociaciones.', vigenteDesde: '2026-01-02', activa: true },
        { id: 'TRF-0002', concepto: 'Asociado principal', tarifaHora: 360, descripcion: 'Abogados con más de 12 años de ejercicio a cargo de áreas.', vigenteDesde: '2026-01-02', activa: true },
        { id: 'TRF-0003', concepto: 'Asociado senior', tarifaHora: 280, descripcion: 'Abogados con 7 a 12 años de ejercicio.', vigenteDesde: '2026-01-02', activa: true },
        { id: 'TRF-0004', concepto: 'Asociado', tarifaHora: 210, descripcion: 'Abogados con 3 a 6 años de ejercicio.', vigenteDesde: '2026-01-02', activa: true },
        { id: 'TRF-0005', concepto: 'Asociado junior', tarifaHora: 150, descripcion: 'Abogados con menos de 3 años de ejercicio.', vigenteDesde: '2026-01-02', activa: true },
        { id: 'TRF-0006', concepto: 'Practicante', tarifaHora: 80, descripcion: 'Estudiantes de derecho en prácticas preprofesionales.', vigenteDesde: '2026-01-02', activa: true }
      ],
      abogados: [
        { id: 'ABO-0001', nombre: 'Ricardo Paredes Villanueva', dni: '08123456', cal: '18452', especialidad: 'Civil', tarifa: 'TRF-0001', costoHora: 190, horasMeta: 8, fechaIngreso: '2004-03-01', email: 'rparedes@paredes.example.pe', activo: true },
        { id: 'ABO-0002', nombre: 'Marcela Paredes Ochoa', dni: '09234567', cal: '21377', especialidad: 'Familia', tarifa: 'TRF-0001', costoHora: 190, horasMeta: 8, fechaIngreso: '2008-06-16', email: 'mparedes@paredes.example.pe', activo: true },
        { id: 'ABO-0003', nombre: 'Gonzalo Benavides Lazo', dni: '07345678', cal: '19980', especialidad: 'Comercial', tarifa: 'TRF-0001', costoHora: 190, horasMeta: 8, fechaIngreso: '2006-02-10', email: 'gbenavides@paredes.example.pe', activo: true },
        { id: 'ABO-0004', nombre: 'Silvana Tello Cárdenas', dni: '10456789', cal: '30215', especialidad: 'Laboral', tarifa: 'TRF-0002', costoHora: 150, horasMeta: 12, fechaIngreso: '2012-09-03', email: 'stello@paredes.example.pe', activo: true },
        { id: 'ABO-0005', nombre: 'Eduardo Quispe Mendoza', dni: '41567890', cal: '31841', especialidad: 'Penal', tarifa: 'TRF-0003', costoHora: 115, horasMeta: 16, fechaIngreso: '2014-04-21', email: 'equispe@paredes.example.pe', activo: true },
        { id: 'ABO-0006', nombre: 'Lorena Ávila Rojas', dni: '42678901', cal: '33690', especialidad: 'Civil', tarifa: 'TRF-0003', costoHora: 115, horasMeta: 16, fechaIngreso: '2015-01-12', email: 'lavila@paredes.example.pe', activo: true },
        { id: 'ABO-0007', nombre: 'Hugo Salinas Medina', dni: '43789012', cal: '36122', especialidad: 'Comercial', tarifa: 'TRF-0004', costoHora: 85, horasMeta: 20, fechaIngreso: '2018-08-27', email: 'hsalinas@paredes.example.pe', activo: true },
        { id: 'ABO-0008', nombre: 'Patricia Neyra Campos', dni: '44890123', cal: '37455', especialidad: 'Administrativo', tarifa: 'TRF-0004', costoHora: 85, horasMeta: 20, fechaIngreso: '2019-03-18', email: 'pneyra@paredes.example.pe', activo: true },
        { id: 'ABO-0009', nombre: 'Fabián Cruz Aliaga', dni: '45901234', cal: '40918', especialidad: 'Laboral', tarifa: 'TRF-0005', costoHora: 60, horasMeta: 24, fechaIngreso: '2021-05-10', email: 'fcruz@paredes.example.pe', activo: true },
        { id: 'ABO-0010', nombre: 'Daniela Rivas Quiroga', dni: '46012345', cal: '41233', especialidad: 'Civil', tarifa: 'TRF-0005', costoHora: 60, horasMeta: 24, fechaIngreso: '2022-02-14', email: 'drivas@paredes.example.pe', activo: true },
        { id: 'ABO-0011', nombre: 'Jhon Alexis Carrasco Ñaupa', dni: '72123450', especialidad: 'Penal', tarifa: 'TRF-0006', costoHora: 30, horasMeta: 24, fechaIngreso: '2026-03-02', email: 'jcarrasco@paredes.example.pe', activo: true },
        { id: 'ABO-0012', nombre: 'Rocío Mamani Zela', dni: '73234561', especialidad: 'Laboral', tarifa: 'TRF-0006', costoHora: 30, horasMeta: 24, fechaIngreso: '2026-03-02', email: 'rmamani@paredes.example.pe', activo: true }
      ],
      clientes: [
        { id: 'CLI-0001', documento: '20512340011', nombre: 'Textiles Andinos Pachacútec S.A.C.', tipo: 'Persona jurídica', distrito: 'Ate', contacto: 'Gerente Beatriz Lozano', telefono: '01 354 2290', email: 'legal@textilesandinos.example.pe', descuentoConvenio: 10, fechaAlta: '2021-04-12' },
        { id: 'CLI-0002', documento: '20523451122', nombre: 'Inversiones y Servicios Mirador S.A.C.', tipo: 'Persona jurídica', distrito: 'San Isidro', contacto: 'Álvaro Peñaloza', telefono: '01 441 8800', email: 'administracion@mirador.example.pe', descuentoConvenio: 5, fechaAlta: '2022-08-03' },
        { id: 'CLI-0003', documento: '20534562233', nombre: 'Clínica Veterinaria Mascotas Felices E.I.R.L.', tipo: 'Persona jurídica', distrito: 'Santiago de Surco', contacto: 'Dra. Karen Olazábal', telefono: '01 275 1190', email: 'gerencia@mascotasfelices.example.pe', descuentoConvenio: 0, fechaAlta: '2025-07-21' },
        { id: 'CLI-0004', documento: '20545673344', nombre: 'Transportes Interprovinciales Cóndor S.A.', tipo: 'Persona jurídica', distrito: 'Cercado de Lima', contacto: 'Lic. Jorge Mendívil', telefono: '01 426 7703', email: 'legal@condortrans.example.pe', descuentoConvenio: 8, fechaAlta: '2020-11-30' },
        { id: 'CLI-0005', documento: '20556784455', nombre: 'Grupo Agroexportador Valle Verde S.A.C.', tipo: 'Persona jurídica', distrito: 'La Molina', contacto: 'Ing. Sofía Echegaray', telefono: '01 349 5521', email: 'contratos@valleverde.example.pe', descuentoConvenio: 15, fechaAlta: '2019-05-14' },
        { id: 'CLI-0006', documento: '20567895566', nombre: 'Colegio Particular Nueva Esperanza S.A.C.', tipo: 'Persona jurídica', distrito: 'San Miguel', contacto: 'Prof. Nelly Cabrera', telefono: '01 566 3320', email: 'direccion@nuevaesperanza.example.pe', descuentoConvenio: 0, fechaAlta: '2024-01-09' },
        { id: 'CLI-0007', documento: '20578906677', nombre: 'Comercial Ferretero Los Álamos E.I.R.L.', tipo: 'Persona jurídica', distrito: 'Lince', contacto: 'Víctor Aranda', telefono: '01 471 2208', email: 'ventas@losalamos.example.pe', descuentoConvenio: 0, fechaAlta: '2021-09-27' },
        { id: 'CLI-0008', documento: '20589017788', nombre: 'Asociación de Vivienda Los Jardines de Surco', tipo: 'Persona jurídica', distrito: 'Santiago de Surco', contacto: 'Presidente Hernán Tapia', telefono: '01 448 9012', email: 'junta@losjardines.example.pe', descuentoConvenio: 5, fechaAlta: '2018-03-19' },
        { id: 'CLI-0009', documento: '43215670', nombre: 'Rosa María Delgado Paucar', tipo: 'Persona natural', distrito: 'Jesús María', telefono: '959 120 331', email: 'rosa.delgado@correo.example.pe', descuentoConvenio: 0, fechaAlta: '2022-10-05' },
        { id: 'CLI-0010', documento: '29345611', nombre: 'Julio César Medina Torres', tipo: 'Persona natural', distrito: 'Ate', telefono: '958 440 217', descuentoConvenio: 0, fechaAlta: '2020-02-17' },
        { id: 'CLI-0011', documento: '40128760', nombre: 'Sandra Liliana Bustamante Gil', tipo: 'Persona natural', distrito: 'Miraflores', telefono: '957 301 882', email: 'sandra.bustamante@correo.example.pe', descuentoConvenio: 0, fechaAlta: '2024-06-24' },
        { id: 'CLI-0012', documento: '44587322', nombre: 'Ernesto Valdivia Cornejo', tipo: 'Persona natural', distrito: 'San Borja', telefono: '956 118 903', descuentoConvenio: 0, fechaAlta: '2026-03-11' },
        { id: 'CLI-0013', documento: '41236984', nombre: 'Mónica Elena Quispe Huamán', tipo: 'Persona natural', distrito: 'Cercado de Lima', telefono: '955 672 410', email: 'monica.quispe@correo.example.pe', descuentoConvenio: 0, fechaAlta: '2023-12-04' },
        { id: 'CLI-0014', documento: '45870123', nombre: 'Alberto Ramos Villacorta', tipo: 'Persona natural', distrito: 'Ate', telefono: '954 209 337', descuentoConvenio: 0, fechaAlta: '2023-08-28' }
      ],
      expedientes: armarExpedientes(),
      actuaciones: armarActuaciones(),
      honorarios: armarHonorarios()
    }
  };
})();
