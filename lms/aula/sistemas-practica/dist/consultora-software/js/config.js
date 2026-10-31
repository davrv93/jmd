/*
 * Nexa Soluciones TI · Consultora de software (Lima)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «consultora-software». Es lo ÚNICO que
 * cambia entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la
 * aplicación. Los datos son inventados (RUC y DNI de ejemplo) y no
 * corresponden a personas ni empresas reales. Todo el código es ES5.
 *
 * Cómo se mide un proyecto (valor ganado, sobre la línea base de COSTO):
 *   BAC = costo presupuestado · PV = BAC × % del plazo transcurrido
 *   EV  = BAC × % de avance real · AC = horas cargadas × costo hora cargado
 *   CPI = EV / AC · SPI = EV / PV · EAC = BAC / CPI
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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

  /* '@-45' (hace 45 días) o '@20' (dentro de 20 días) a partir de un entero. */
  function rel(n) { return n >= 0 ? '@-' + n : '@' + (-n); }

  /* Porcentaje del plazo transcurrido a una fecha de corte (0 antes de empezar, 100 al llegar al fin). */
  function porcentajePlan(inicio, fin, corte, ctx) {
    if (!inicio || !fin || !corte || corte < inicio) { return 0; }
    if (corte >= fin) { return 100; }
    return ctx.redondear(ctx.diasEntre(inicio, corte) / ctx.diasEntre(inicio, fin) * 100);
  }

  /* Utilización: horas facturables sobre la capacidad productiva del periodo (horas productivas por mes de 30 días). */
  function utilizacion(horasFacturables, horasProductivasMes, dias) {
    var capacidad = horasProductivasMes * dias / 30;
    return capacidad > 0 ? horasFacturables / capacidad * 100 : 0;
  }

  /* Costo hora cargado = sueldo × (1 + carga) / horas productivas. */
  function costoHoraCargado(sueldo, ctx) {
    var hp = ctx.param('horasProductivas');
    return hp > 0 ? ctx.redondear((sueldo || 0) * (1 + ctx.param('factorCarga') / 100) / hp) : 0;
  }

  /* Partes de horas aprobados (emitidos) dentro de un rango de fechas. */
  function partesEmitidos(ctx, desde, hasta) {
    return ctx.datos.listar('partes', function (d) {
      return d.estado === 'Emitida' && (!desde || d.fecha >= desde) && (!hasta || d.fecha <= hasta);
    });
  }

  /* Facturas por hito que ya se emitieron (cobradas o por cobrar). */
  function facturasVigentes(ctx, desde, hasta, filtro) {
    return ctx.datos.listar('facturas', function (f) {
      return (f.estado === 'Emitida' || f.estado === 'Cobrada') && (!desde || f.fecha >= desde) && (!hasta || f.fecha <= hasta) && (!filtro || filtro(f));
    });
  }

  /* Horas y costo cargado que un proyecto lleva acumulados en los partes aprobados. */
  function consumoProyecto(ctx, proyectoId, desde, hasta) {
    var docs = partesEmitidos(ctx, desde, hasta), horas = 0, facturables = 0, costo = 0, i, j, l, tasa;
    for (i = 0; i < docs.length; i++) {
      tasa = docs[i].totales && docs[i].totales.costoHora ? docs[i].totales.costoHora : 0;
      for (j = 0; j < (docs[i].lineas || []).length; j++) {
        l = docs[i].lineas[j];
        if (l.item !== proyectoId) { continue; }
        horas += Number(l.horas) || 0;
        if (l.facturable !== false) { facturables += Number(l.horas) || 0; }
        costo += (Number(l.horas) || 0) * tasa;
      }
    }
    return { horas: horas, facturables: facturables, costo: ctx.redondear(costo) };
  }

  /* Indicadores de valor ganado de un proyecto a una fecha de corte (por defecto, hoy). */
  function metricasProyecto(p, ctx, corte) {
    var ac = consumoProyecto(ctx, p.id).costo, bac = p.costoBase || 0, avance = p.avancePct || 0;
    var plan = porcentajePlan(p.fechaInicio, p.fechaFin, corte || ctx.hoy(), ctx);
    var pv = ctx.redondear(bac * plan / 100), ev = ctx.redondear(bac * avance / 100);
    var eac = ev > 0 && ac > 0 ? ctx.redondear(bac * ac / ev) : bac;
    return {
      plan: plan, avance: avance, bac: bac, pv: pv, ev: ev, ac: ac, eac: eac,
      cpi: ac > 0 ? ctx.redondear(ev / ac) : null,
      spi: pv > 0 ? ctx.redondear(ev / pv) : null,
      margen: p.presupuesto > 0 ? ctx.redondear((p.presupuesto - eac) / p.presupuesto * 100) : null
    };
  }

  function esProyectoActivo(p) { return p.estado === 'En ejecución'; }

  /* ---------- Datos de demostración ---------- */

  /* Cierres mensuales de los partes de horas: hace n días (el 0 es el más reciente). */
  var CIERRES = [4, 34, 64, 94, 124, 154];

  /* Proyecto: [id, código, nombre, cliente, jefe, tipo, modalidad, precio, costo base, horas estimadas, tarifa/hora, empezó hace (días),
     termina en (días; negativo = ya terminó), avance %, estado, factor de esfuerzo real, equipo [[consultor, peso, facturable]]] */
  var PROYECTOS = [
    ['PRY-0001', 'NXA-BNC-01', 'Plataforma de banca móvil', 'CLI-0001', 'CON-0001', 'Aplicación móvil', 'Precio fijo', 176400, 114700, 1260, 140, 170, 40, 82, 'En ejecución', 1.05, [['CON-0003', 2, 1], ['CON-0004', 2.5, 1], ['CON-0006', 3, 1], ['CON-0008', 1.5, 1], ['CON-0001', 1, 1], ['CON-0007', 1, 1]]],
    ['PRY-0002', 'NXA-MIN-02', 'Migración de datos a la nube', 'CLI-0002', 'CON-0002', 'Migración a la nube', 'Precio fijo', 147000, 94500, 980, 150, 150, 60, 58, 'En ejecución', 1.12, [['CON-0010', 2, 1], ['CON-0005', 2, 1], ['CON-0012', 2, 1], ['CON-0002', 1, 1], ['CON-0003', 0.5, 1]]],
    ['PRY-0003', 'NXA-RET-03', 'ERP de inventarios y compras', 'CLI-0003', 'CON-0001', 'Implementación de ERP', 'Precio fijo', 218400, 143500, 1680, 130, 185, 20, 88, 'En ejecución', 1.02, [['CON-0009', 3, 1], ['CON-0013', 3, 1], ['CON-0005', 1.5, 1], ['CON-0008', 2, 1], ['CON-0004', 1, 1], ['CON-0007', 1.5, 1], ['CON-0001', 1.5, 1]]],
    ['PRY-0004', 'NXA-SAL-04', 'Historia clínica electrónica', 'CLI-0004', 'CON-0002', 'Desarrollo a medida', 'Precio fijo', 189000, 124600, 1400, 135, 120, 100, 45, 'En ejecución', 1.2, [['CON-0003', 1.5, 1], ['CON-0005', 1.5, 0], ['CON-0007', 2.5, 1], ['CON-0011', 2, 1], ['CON-0013', 1.5, 1], ['CON-0002', 1, 1]]],
    ['PRY-0005', 'NXA-EDU-05', 'Campus virtual y matrículas', 'CLI-0005', 'CON-0001', 'Desarrollo a medida', 'Precio fijo', 122850, 79800, 910, 135, 90, 75, 52, 'En ejecución', 1, [['CON-0006', 2, 1], ['CON-0007', 1.5, 1], ['CON-0011', 1.5, 1], ['CON-0008', 0.5, 1], ['CON-0001', 0.8, 1]]],
    ['PRY-0006', 'NXA-GOB-06', 'Sistema de trámite documentario', 'CLI-0006', 'CON-0002', 'Desarrollo a medida', 'Precio fijo', 78750, 53200, 630, 125, 60, 120, 18, 'En ejecución', 1.3, [['CON-0013', 1, 0], ['CON-0005', 1, 1], ['CON-0002', 0.3, 1]]],
    ['PRY-0007', 'NXA-TEL-07', 'Portal de autoservicio de clientes', 'CLI-0007', 'CON-0001', 'Integración y APIs', 'Tiempo y materiales', 84000, 54600, 560, 150, 140, 10, 90, 'En ejecución', 0.97, [['CON-0004', 1.5, 1], ['CON-0006', 1.5, 1], ['CON-0008', 0.5, 1], ['CON-0001', 0.7, 1], ['CON-0010', 0.5, 1]]],
    ['PRY-0008', 'NXA-LOG-08', 'Tablero de control logístico', 'CLI-0008', 'CON-0002', 'Análisis de datos', 'Precio fijo', 58800, 38500, 420, 140, 100, 30, 70, 'En ejecución', 1.1, [['CON-0012', 2, 1], ['CON-0009', 1, 1], ['CON-0002', 0.4, 1]]],
    ['PRY-0009', 'NXA-SEG-09', 'Motor de cotización de seguros', 'CLI-0009', 'CON-0001', 'Desarrollo a medida', 'Precio fijo', 137200, 89600, 980, 140, 75, 105, 33, 'En ejecución', 1.15, [['CON-0003', 1.5, 1], ['CON-0004', 1, 1], ['CON-0005', 1.5, 1], ['CON-0009', 1, 1], ['CON-0001', 0.7, 1]]],
    ['PRY-0010', 'NXA-ENE-10', 'Monitoreo de planta solar', 'CLI-0010', 'CON-0002', 'Integración y APIs', 'Precio fijo', 98000, 64400, 700, 140, 30, 150, 15, 'En ejecución', 1.08, [['CON-0010', 1.5, 1], ['CON-0012', 0.5, 1], ['CON-0002', 0.3, 1]]],
    ['PRY-0011', 'NXA-AGR-11', 'Trazabilidad de exportaciones', 'CLI-0011', 'CON-0001', 'Desarrollo a medida', 'Precio fijo', 85050, 56000, 630, 135, -20, 160, 0, 'Planificado', 1, []],
    ['PRY-0012', 'NXA-CAN-12', 'Soporte evolutivo de canales digitales', 'CLI-0001', 'CON-0002', 'Soporte y mantenimiento', 'Tiempo y materiales', 46200, 30800, 420, 110, 180, 185, 49, 'En ejecución', 1, [['CON-0004', 0.5, 1], ['CON-0010', 1, 1]]],
    ['PRY-0013', 'NXA-COO-13', 'Rediseño del sitio institucional', 'CLI-0012', 'CON-0001', 'Desarrollo a medida', 'Precio fijo', 40600, 26200, 290, 140, 190, -35, 100, 'Cerrado', 1, [['CON-0011', 1.5, 1], ['CON-0006', 1.5, 1], ['CON-0001', 0.3, 1]]],
    ['PRY-0014', 'NXA-TEX-14', 'Integración con facturación electrónica', 'CLI-0013', 'CON-0002', 'Integración y APIs', 'Precio fijo', 56550, 36900, 390, 145, 190, -62, 100, 'Cerrado', 1.08, [['CON-0005', 1.5, 1], ['CON-0008', 0.7, 1], ['CON-0002', 0.4, 1], ['CON-0010', 0.5, 1]]],
    ['PRY-0015', 'NXA-MIN-15', 'Visor geográfico de concesiones', 'CLI-0002', 'CON-0001', 'Análisis de datos', 'Precio fijo', 63000, 41500, 450, 140, 110, -10, 70, 'En pausa', 1.1, [['CON-0012', 1.5, 1], ['CON-0003', 0.8, 1], ['CON-0001', 0.4, 1]]],
    ['PRY-0016', 'NXA-TEL-16', 'Zona de pagos con QR', 'CLI-0007', 'CON-0002', 'Desarrollo a medida', 'Precio fijo', 52500, 34300, 350, 150, 130, -20, 25, 'Cancelado', 1.2, [['CON-0004', 1, 1], ['CON-0006', 1, 1], ['CON-0002', 0.3, 1]]]
  ];

  function armarProyectos() {
    var r = [], i, f;
    for (i = 0; i < PROYECTOS.length; i++) {
      f = PROYECTOS[i];
      r.push({
        id: f[0], codigo: f[1], nombre: f[2], cliente: f[3], jefe: f[4], tipo: f[5], modalidad: f[6], presupuesto: f[7], costoBase: f[8],
        horasEstimadas: f[9], tarifaHora: f[10], fechaInicio: rel(f[11]), fechaFin: rel(-f[12]), avancePct: f[13], estado: f[14]
      });
    }
    return r;
  }

  /* Reparte las horas de cada proyecto (horas estimadas × avance × factor de esfuerzo) entre los cierres mensuales y el equipo. */
  function armarPartes() {
    var docs = {}, orden = [], i, k, j, p, activos, pesos, sumaPesos, totalH, horasCierre, h, equipo, clave, d, n, id, estado;
    for (i = 0; i < PROYECTOS.length; i++) {
      p = PROYECTOS[i];
      if (p[13] <= 0 || !p[16].length) { continue; }
      activos = [];
      for (k = CIERRES.length - 1; k >= 0; k--) {
        if (p[11] >= CIERRES[k] - 12 && (p[12] >= 0 || CIERRES[k] + p[12] >= -12)) { activos.push(k); }
      }
      if (!activos.length) { continue; }
      pesos = [];
      sumaPesos = 0;
      for (j = 0; j < activos.length; j++) {
        pesos.push(activos.length > 1 && j === 0 ? 0.5 : 1);
        sumaPesos += pesos[j];
      }
      totalH = p[9] * p[13] / 100 * p[15];
      equipo = p[16];
      n = 0;
      for (j = 0; j < equipo.length; j++) { n += equipo[j][1]; }
      for (j = 0; j < activos.length; j++) {
        horasCierre = totalH * pesos[j] / sumaPesos;
        for (k = 0; k < equipo.length; k++) {
          h = Math.round(horasCierre * equipo[k][1] / n);
          if (h < 4) { continue; }
          clave = activos[j] + '|' + equipo[k][0];
          if (!docs[clave]) { docs[clave] = { cierre: activos[j], consultor: equipo[k][0], lineas: [] }; orden.push(clave); }
          docs[clave].lineas.push({ item: p[0], precio: p[10], horas: h, facturable: equipo[k][2] === 1 });
        }
      }
    }
    orden.sort(function (a, b) {
      var x = docs[a], y = docs[b];
      if (x.cierre !== y.cierre) { return y.cierre - x.cierre; }
      return x.consultor < y.consultor ? -1 : 1;
    });
    var r = [];
    for (i = 0; i < orden.length; i++) {
      d = docs[orden[i]];
      n = i + 1;
      id = 'PAR-' + (n < 10 ? '000' : (n < 100 ? '00' : '0')) + n;
      /* El parte del último cierre de dos consultores sigue en borrador, esperando la aprobación del jefe de proyecto. */
      estado = d.cierre === 0 && (d.consultor === 'CON-0007' || d.consultor === 'CON-0012') ? 'Borrador' : 'Emitida';
      r.push({ id: id, fecha: '@-' + CIERRES[d.cierre], consultor: d.consultor, observaciones: 'Parte mensual de horas', estado: estado, lineas: d.lineas });
    }
    /* Un parte duplicado por error, anulado con motivo. */
    r.push({ id: 'PAR-' + (orden.length + 1 < 100 ? '00' : '0') + (orden.length + 1), fecha: '@-' + CIERRES[3], consultor: 'CON-0011', observaciones: 'Duplicado del cierre de ese mes', estado: 'Anulada', motivoAnulacion: 'Parte duplicado: ya se aprobó el del mismo mes', lineas: [{ item: 'PRY-0005', precio: 135, horas: 24, facturable: true }] });
    return r;
  }

  /* Factura por hito: [días atrás, proyecto, hito, % del contrato, estado] */
  var HITOS = [
    [165, 'PRY-0001', 'Hito 1 · Anticipo y arranque', 20, 'Cobrada'],
    [120, 'PRY-0001', 'Hito 2 · Diseño aprobado', 20, 'Cobrada'],
    [70, 'PRY-0001', 'Hito 3 · Módulo de transferencias', 25, 'Cobrada'],
    [25, 'PRY-0001', 'Hito 4 · Piloto con clientes', 15, 'Emitida'],
    [145, 'PRY-0002', 'Hito 1 · Anticipo', 30, 'Cobrada'],
    [60, 'PRY-0002', 'Hito 2 · Primera oleada migrada', 25, 'Emitida'],
    [180, 'PRY-0003', 'Hito 1 · Anticipo', 20, 'Cobrada'],
    [120, 'PRY-0003', 'Hito 2 · Maestros y compras', 30, 'Cobrada'],
    [55, 'PRY-0003', 'Hito 3 · Inventarios en producción', 25, 'Cobrada'],
    [12, 'PRY-0003', 'Hito 4 · Cierre contable integrado', 10, 'Emitida'],
    [115, 'PRY-0004', 'Hito 1 · Anticipo', 20, 'Cobrada'],
    [40, 'PRY-0004', 'Hito 2 · Módulo de consulta externa', 20, 'Cobrada'],
    [85, 'PRY-0005', 'Hito 1 · Anticipo y matrícula en línea', 30, 'Cobrada'],
    [55, 'PRY-0006', 'Hito 1 · Anticipo', 15, 'Emitida'],
    [135, 'PRY-0007', 'Hito 1 · Anticipo', 30, 'Cobrada'],
    [80, 'PRY-0007', 'Hito 2 · Integración con facturación', 30, 'Cobrada'],
    [30, 'PRY-0007', 'Hito 3 · Autoservicio en producción', 25, 'Cobrada'],
    [95, 'PRY-0008', 'Hito 1 · Anticipo', 30, 'Cobrada'],
    [35, 'PRY-0008', 'Hito 2 · Tableros operativos', 30, 'Emitida'],
    [70, 'PRY-0009', 'Hito 1 · Anticipo', 30, 'Cobrada'],
    [170, 'PRY-0013', 'Hito 1 · Anticipo', 40, 'Cobrada'],
    [40, 'PRY-0013', 'Hito 2 · Entrega final', 60, 'Cobrada'],
    [180, 'PRY-0014', 'Hito 1 · Anticipo', 50, 'Cobrada'],
    [62, 'PRY-0014', 'Hito 2 · Entrega final', 50, 'Cobrada'],
    [100, 'PRY-0015', 'Hito 1 · Anticipo', 30, 'Cobrada'],
    [50, 'PRY-0015', 'Hito 2 · Visor en producción', 20, 'Anulada'],
    [2, 'PRY-0010', 'Hito 1 · Anticipo', 15, 'Borrador']
  ];

  function armarFacturas() {
    var r = [], i, f, n;
    for (i = 0; i < HITOS.length; i++) {
      f = HITOS[i];
      n = i + 1;
      r.push({ id: 'FHI-' + (n < 10 ? '000' : '00') + n, fecha: '@-' + f[0], proyecto: f[1], hito: f[2], porcentajeHito: f[3], estado: f[4] });
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'consultora-software',
    nombre: 'Nexa Soluciones TI · Proyectos',
    rubro: 'Consultora de software',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#1d4e89', acento: '#f2a541', siglas: 'NX' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma a cada factura por hito.' },
      { id: 'factorCarga', etiqueta: 'Carga sobre el sueldo', tipo: 'porcentaje', valor: 65, ayuda: 'Gratificaciones, CTS, vacaciones, EsSalud, equipo, licencias y espacio de trabajo, como porcentaje del sueldo.' },
      { id: 'horasProductivas', etiqueta: 'Horas productivas por mes', tipo: 'entero', valor: 140, ayuda: 'Horas del mes en que un consultor puede cargar trabajo a proyectos (descontando feriados, capacitación y reuniones internas).' },
      { id: 'detraccion', etiqueta: 'Detracción', tipo: 'porcentaje', valor: 12, ayuda: 'Porcentaje del total de la factura que el cliente deposita en la cuenta de detracciones.' },
      { id: 'topeDetraccion', etiqueta: 'Monto desde el que rige la detracción', tipo: 'moneda', valor: 700, ayuda: 'Solo las facturas cuyo total supera este monto llevan detracción.' },
      { id: 'utilizacionMeta', etiqueta: 'Meta de utilización', tipo: 'porcentaje', valor: 75, ayuda: 'Porcentaje de las horas productivas que debe facturarse a clientes.' },
      { id: 'margenMinimo', etiqueta: 'Margen mínimo del proyecto', tipo: 'porcentaje', valor: 25, ayuda: 'Por debajo de este margen proyectado, el proyecto se marca como «Bajo el mínimo».' },
      { id: 'umbralIndice', etiqueta: 'Índice mínimo aceptable (CPI y SPI)', tipo: 'numero', valor: 0.9, ayuda: 'Un proyecto con CPI o SPI por debajo de este valor se considera en riesgo.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 0,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: false,
      ayudaLogin: false,
      exportaRespetaPermisos: true,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'gerente', nombre: 'Gerente general', descripcion: 'Ve toda la cartera, los costos y los sueldos; administra clientes, proyectos, consultores y propuestas; puede anular partes y facturas.' },
      { id: 'pm', nombre: 'Jefe de proyecto', descripcion: 'Planifica sus proyectos, aprueba los partes de horas del equipo y prepara las facturas por hito. No ve sueldos ni márgenes.' },
      { id: 'consultor', nombre: 'Consultor', descripcion: 'Registra sus partes de horas en los proyectos activos. No ve clientes, costos ni sueldos.' },
      { id: 'comercial', nombre: 'Ejecutivo comercial', descripcion: 'Administra clientes y propuestas y consulta los proyectos. No ve costos, partes ni facturación.' },
      { id: 'finanzas', nombre: 'Analista de finanzas', descripcion: 'Emite las facturas por hito, controla detracciones y cobranzas y consulta costos y sueldos. No modifica proyectos.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Rocío Valdivia Alarcón', rol: 'admin', clave: 'Admin#2026x' },
      { usuario: 'gerente', nombre: 'Gonzalo Benavides Ríos', rol: 'gerente', clave: 'Gerente#2026x' },
      { usuario: 'jefeproyecto', nombre: 'Valeria Quispe Huamán', rol: 'pm', clave: 'Proyectos#2026x' },
      { usuario: 'consultor', nombre: 'Sebastián Cárdenas Pinto', rol: 'consultor', clave: 'Horas#2026x' },
      { usuario: 'comercial', nombre: 'Lorena Medina Cáceres', rol: 'comercial', clave: 'Ventas#2026x' },
      { usuario: 'finanzas', nombre: 'Ernesto Palomino Quispe', rol: 'finanzas', clave: 'Cobros#2026x' },
      { usuario: 'auditor', nombre: 'Natalia Zegarra Linares', rol: 'auditor', clave: 'Audita#2026x' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^[0-9]{11}$', mensajePatron: 'El RUC tiene 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'sector', etiqueta: 'Sector', tipo: 'lista', requerido: true, opciones: ['Banca y finanzas', 'Minería', 'Retail', 'Salud', 'Educación', 'Gobierno', 'Telecomunicaciones', 'Logística', 'Seguros', 'Energía', 'Agroindustria', 'Manufactura'] },
          { id: 'ciudad', etiqueta: 'Ciudad', tipo: 'lista', opciones: ['Lima', 'Arequipa', 'Trujillo', 'Piura', 'Cusco', 'Chiclayo'], defecto: 'Lima' },
          { id: 'contacto', etiqueta: 'Contacto principal', tipo: 'texto', max: 60 },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'condicionPago', etiqueta: 'Condición de pago', tipo: 'lista', requerido: true, opciones: ['Contado', '15 días', '30 días', '45 días', '60 días'], defecto: '30 días' },
          { id: 'estado', etiqueta: 'Estado comercial', tipo: 'lista', requerido: true, opciones: ['Activo', 'Prospecto', 'Inactivo'], defecto: 'Activo' }
        ],
        lista: ['ruc', 'nombre', 'sector', 'ciudad', 'estado', 'facturado'],
        buscar: ['ruc', 'nombre', 'sector', 'contacto'],
        calculados: [
          {
            id: 'facturado', etiqueta: 'Facturado (sin IGV)', tipo: 'moneda',
            formula: function (r, ctx) {
              var mios = {}, ps = ctx.datos.listar('proyectos', function (p) { return p.cliente === r.id; }), i;
              for (i = 0; i < ps.length; i++) { mios[ps[i].id] = true; }
              return ctx.redondear(ctx.suma(facturasVigentes(ctx, null, null, function (f) { return mios[f.proyecto] === true; }), function (f) { return f.totales ? f.totales.base : 0; }));
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'pm', 'comercial', 'finanzas', 'auditor'], crear: ['admin', 'comercial'], editar: ['admin', 'gerente', 'comercial'], eliminar: ['admin'] }
      },
      {
        id: 'proyectos', nombre: 'Proyecto', plural: 'Proyectos', prefijo: 'PRY',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del proyecto', tipo: 'texto', requerido: true, max: 80 },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'jefe', etiqueta: 'Jefe de proyecto', tipo: 'ref', entidad: 'consultores', mostrar: 'nombre', requerido: true },
          { id: 'tipo', etiqueta: 'Tipo de servicio', tipo: 'lista', requerido: true, opciones: ['Desarrollo a medida', 'Implementación de ERP', 'Migración a la nube', 'Aplicación móvil', 'Integración y APIs', 'Análisis de datos', 'Soporte y mantenimiento'] },
          { id: 'modalidad', etiqueta: 'Modalidad de contrato', tipo: 'lista', requerido: true, opciones: ['Precio fijo', 'Tiempo y materiales'], defecto: 'Precio fijo' },
          { id: 'presupuesto', etiqueta: 'Precio del contrato (sin IGV)', tipo: 'moneda', min: 1, requerido: true },
          { id: 'costoBase', etiqueta: 'Costo presupuestado (línea base)', tipo: 'moneda', min: 1, requerido: true, ver: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'], ayuda: 'BAC: lo que se planea gastar en horas del equipo. Es la base del valor ganado.' },
          { id: 'horasEstimadas', etiqueta: 'Horas estimadas', tipo: 'entero', min: 1, requerido: true },
          { id: 'tarifaHora', etiqueta: 'Tarifa referencial (S/ por hora)', tipo: 'moneda', min: 1, requerido: true, ayuda: 'Se copia a cada línea de los partes de horas para valorizar lo facturable.' },
          { id: 'fechaInicio', etiqueta: 'Inicio', tipo: 'fecha', requerido: true },
          { id: 'fechaFin', etiqueta: 'Fin planificado', tipo: 'fecha', requerido: true },
          { id: 'avancePct', etiqueta: 'Avance real (%)', tipo: 'porcentaje', min: 0, max: 100, requerido: true, defecto: 0, ayuda: 'Lo actualiza el jefe de proyecto con el último hito aceptado.' },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', requerido: true, opciones: ['Planificado', 'En ejecución', 'En pausa', 'Cerrado', 'Cancelado'], defecto: 'Planificado' }
        ],
        lista: ['codigo', 'nombre', 'cliente', 'estado', 'avancePct', 'spi', 'cpi'],
        buscar: ['codigo', 'nombre', 'tipo', 'estado'],
        calculados: [
          { id: 'horasReales', etiqueta: 'Horas cargadas', tipo: 'numero', formula: function (r, ctx) { return ctx.redondear(consumoProyecto(ctx, r.id).horas); } },
          { id: 'costoReal', etiqueta: 'Costo real (AC)', tipo: 'moneda', ver: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'], formula: function (r, ctx) { return consumoProyecto(ctx, r.id).costo; } },
          { id: 'pv', etiqueta: 'Valor planificado (PV)', tipo: 'moneda', ver: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'], formula: function (r, ctx) { return metricasProyecto(r, ctx).pv; } },
          { id: 'ev', etiqueta: 'Valor ganado (EV)', tipo: 'moneda', ver: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'], formula: function (r, ctx) { return metricasProyecto(r, ctx).ev; } },
          { id: 'cpi', etiqueta: 'CPI (costo)', tipo: 'numero', ver: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'], formula: function (r, ctx) { return metricasProyecto(r, ctx).cpi; } },
          { id: 'spi', etiqueta: 'SPI (plazo)', tipo: 'numero', formula: function (r, ctx) { return metricasProyecto(r, ctx).spi; } },
          { id: 'margen', etiqueta: 'Margen proyectado', tipo: 'porcentaje', ver: ['admin', 'gerente', 'finanzas', 'auditor'], formula: function (r, ctx) { return metricasProyecto(r, ctx).margen; } }
        ],
        reglas: [
          { id: 'fechas-coherentes', mensaje: 'El fin planificado no puede ser anterior al inicio.', validar: function (r) { return !(r.fechaInicio && r.fechaFin && r.fechaFin < r.fechaInicio); } },
          { id: 'costo-menor-precio', mensaje: 'El costo presupuestado no puede superar el precio del contrato: el proyecto nacería con pérdida.', validar: function (r) { return !(r.costoBase !== undefined && r.presupuesto !== undefined && r.costoBase > r.presupuesto); } },
          { id: 'cerrado-al-cien', mensaje: 'Un proyecto cerrado debe tener el 100 % de avance.', validar: function (r) { return !(r.estado === 'Cerrado' && r.avancePct < 100); } }
        ],
        permisos: { ver: ['admin', 'gerente', 'pm', 'consultor', 'comercial', 'finanzas', 'auditor'], crear: ['admin', 'gerente', 'pm'], editar: ['admin', 'gerente', 'pm'], eliminar: ['admin'] }
      },
      {
        id: 'consultores', nombre: 'Consultor', plural: 'Consultores', prefijo: 'CON',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'cargo', etiqueta: 'Cargo', tipo: 'lista', requerido: true, opciones: ['Jefe de proyecto', 'Arquitecto de software', 'Desarrollador backend', 'Desarrollador frontend', 'Analista funcional', 'Analista QA', 'Diseñador UX', 'Ingeniero DevOps', 'Analista de datos'] },
          { id: 'nivel', etiqueta: 'Nivel', tipo: 'lista', requerido: true, opciones: ['Junior', 'Semisenior', 'Senior'], defecto: 'Semisenior' },
          { id: 'sueldoMensual', etiqueta: 'Sueldo mensual', tipo: 'moneda', min: 1130, max: 30000, requerido: true, ver: ['admin', 'gerente', 'finanzas', 'auditor'], ayuda: 'Sueldo bruto. Es confidencial: solo lo ve gerencia, finanzas y auditoría.' },
          { id: 'email', etiqueta: 'Correo corporativo', tipo: 'email', max: 80 },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' },
          { id: 'activo', etiqueta: 'Consultor activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['nombre', 'cargo', 'nivel', 'costoHora', 'utilizacion', 'activo'],
        buscar: ['nombre', 'dni', 'cargo', 'nivel'],
        calculados: [
          { id: 'costoHora', etiqueta: 'Costo hora cargado', tipo: 'moneda', ver: ['admin', 'gerente', 'finanzas', 'auditor'], formula: function (r, ctx) { return costoHoraCargado(r.sueldoMensual, ctx); } },
          {
            id: 'utilizacion', etiqueta: 'Utilización (30 días)', tipo: 'porcentaje',
            formula: function (r, ctx) {
              var docs = partesEmitidos(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), h = 0, i, j;
              for (i = 0; i < docs.length; i++) {
                if (docs[i].consultor !== r.id) { continue; }
                for (j = 0; j < docs[i].lineas.length; j++) { if (docs[i].lineas[j].facturable !== false) { h += Number(docs[i].lineas[j].horas) || 0; } }
              }
              return ctx.redondear(utilizacion(h, ctx.param('horasProductivas'), 30));
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'propuestas', nombre: 'Propuesta', plural: 'Propuestas', prefijo: 'PRP',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'titulo', etiqueta: 'Título de la propuesta', tipo: 'texto', requerido: true, max: 80 },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'responsable', etiqueta: 'Ejecutivo responsable', tipo: 'texto', max: 60 },
          { id: 'monto', etiqueta: 'Monto ofertado (sin IGV)', tipo: 'moneda', min: 1, requerido: true },
          { id: 'probabilidad', etiqueta: 'Probabilidad de cierre (%)', tipo: 'porcentaje', min: 0, max: 100, requerido: true, defecto: 20 },
          { id: 'etapa', etiqueta: 'Etapa', tipo: 'lista', requerido: true, opciones: ['Prospecto', 'Propuesta enviada', 'Negociación', 'Ganada', 'Perdida'], defecto: 'Prospecto' },
          { id: 'fechaEnvio', etiqueta: 'Fecha de envío', tipo: 'fecha', requerido: true },
          { id: 'fechaCierre', etiqueta: 'Cierre esperado', tipo: 'fecha', requerido: true }
        ],
        lista: ['codigo', 'titulo', 'cliente', 'etapa', 'monto', 'valorPonderado'],
        buscar: ['codigo', 'titulo', 'responsable', 'etapa'],
        calculados: [
          { id: 'valorPonderado', etiqueta: 'Valor ponderado', tipo: 'moneda', formula: function (r, ctx) { return ctx.redondear((r.monto || 0) * (r.probabilidad || 0) / 100); } },
          {
            id: 'diasAbierta', etiqueta: 'Días abierta', tipo: 'entero',
            formula: function (r, ctx) { return r.etapa === 'Ganada' || r.etapa === 'Perdida' || !r.fechaEnvio ? null : Math.max(0, ctx.diasEntre(r.fechaEnvio, ctx.hoy())); }
          }
        ],
        reglas: [
          { id: 'cierre-posterior', mensaje: 'El cierre esperado no puede ser anterior al envío.', validar: function (r) { return !(r.fechaEnvio && r.fechaCierre && r.fechaCierre < r.fechaEnvio); } },
          { id: 'probabilidad-etapa', mensaje: 'Una propuesta ganada tiene 100 % de probabilidad y una perdida, 0 %.', validar: function (r) { return !((r.etapa === 'Ganada' && r.probabilidad !== 100) || (r.etapa === 'Perdida' && r.probabilidad !== 0)); } }
        ],
        permisos: { ver: ['admin', 'gerente', 'pm', 'comercial', 'finanzas', 'auditor'], crear: ['admin', 'gerente', 'comercial'], editar: ['admin', 'gerente', 'comercial'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'partes', nombre: 'Parte de horas', plural: 'Partes de horas', prefijo: 'PAR', serie: 'PH01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de cierre del parte', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy', ayuda: 'Último día del periodo que cubre. Solo puede haber un parte aprobado por consultor y fecha de cierre.' },
          { id: 'consultor', etiqueta: 'Consultor', tipo: 'ref', entidad: 'consultores', mostrar: 'nombre', requerido: true },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'consultor'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'proyectos', mostrar: 'nombre', precio: 'tarifaHora',
          campos: [
            { id: 'horas', etiqueta: 'Horas', tipo: 'numero', min: 0.5, max: 200, requerido: true, defecto: 8 },
            { id: 'facturable', etiqueta: 'Facturable', tipo: 'booleano', defecto: true }
          ],
          importe: function (l) { return l.facturable === false ? 0 : (Number(l.horas) || 0) * (Number(l.precio) || 0); },
          info: function (item) { return 'Estado: ' + item.estado + ' · Avance: ' + item.avancePct + ' % · Tarifa referencial: S/ ' + item.tarifaHora.toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var cons = doc.consultor ? ctx.datos.obtener('consultores', doc.consultor) : null, hp = ctx.param('horasProductivas');
          var costoHora = cons && hp > 0 ? ctx.redondear(cons.sueldoMensual * 1.65 / hp) : 0;
          var horas = ctx.suma(doc.lineas, function (l) { return Number(l.horas) || 0; });
          var fact = ctx.suma(doc.lineas, function (l) { return l.facturable === false ? 0 : (Number(l.horas) || 0); });
          return {
            horas: ctx.redondear(horas), horasFacturables: ctx.redondear(fact), costoHora: costoHora, costo: ctx.redondear(horas * costoHora),
            total: ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.facturable === false ? 0 : (Number(l.horas) || 0) * (Number(l.precio) || 0); }))
          };
        },
        totales: [
          { id: 'horas', etiqueta: 'Horas del parte', tipo: 'numero' },
          { id: 'horasFacturables', etiqueta: 'Horas facturables', tipo: 'numero' },
          { id: 'total', etiqueta: 'Valor a tarifa referencial', fuerte: true }
        ],
        reglas: [
          {
            id: 'tope-horas', mensaje: 'Un parte mensual no puede superar las 200 horas.',
            validar: function (d, ctx) { return ctx.suma(d.lineas || [], function (l) { return Number(l.horas) || 0; }) <= 200; }
          },
          {
            id: 'proyecto-vigente', mensaje: 'Solo se cargan horas a proyectos Planificados o En ejecución.',
            validar: function (d, ctx) {
              var i, p;
              for (i = 0; i < (d.lineas || []).length; i++) {
                p = ctx.datos.obtener('proyectos', d.lineas[i].item);
                if (!p || (p.estado !== 'En ejecución' && p.estado !== 'Planificado')) { return false; }
              }
              return true;
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'pm', 'consultor', 'finanzas', 'auditor'], crear: ['admin', 'pm', 'consultor'], editar: ['admin', 'pm', 'consultor'], emitir: ['admin', 'pm'], anular: ['admin', 'gerente'] }
      },
      {
        id: 'facturas', nombre: 'Factura por hito', plural: 'Facturación por hitos', prefijo: 'FHI', serie: 'F001',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'proyecto', etiqueta: 'Proyecto', tipo: 'ref', entidad: 'proyectos', mostrar: 'nombre', requerido: true },
          { id: 'hito', etiqueta: 'Hito aceptado', tipo: 'texto', requerido: true, max: 80, defecto: 'Hito de avance' },
          { id: 'porcentajeHito', etiqueta: '% del contrato que se factura', tipo: 'porcentaje', min: 1, max: 100, requerido: true, ayuda: 'Se calcula sobre el precio del contrato, sin IGV.' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'proyecto', 'hito'],
        estados: ['Borrador', 'Emitida', 'Cobrada', 'Anulada'],
        calcular: function (doc, ctx) {
          var p = doc.proyecto ? ctx.datos.obtener('proyectos', doc.proyecto) : null;
          var base = ctx.redondear((p ? p.presupuesto : 0) * (doc.porcentajeHito || 0) / 100);
          var igv = ctx.redondear(base * ctx.param('igv') / 100);
          var total = ctx.redondear(base + igv);
          var detraccion = total > ctx.param('topeDetraccion') ? ctx.redondear(total * ctx.param('detraccion') / 100) : 0;
          return { base: base, igv: igv, total: total, detraccion: detraccion, neto: ctx.redondear(total - detraccion) };
        },
        totales: [
          { id: 'base', etiqueta: 'Valor del hito (sin IGV)' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total a facturar', fuerte: true },
          { id: 'detraccion', etiqueta: 'Detracción (al Banco de la Nación)' },
          { id: 'neto', etiqueta: 'Neto a cobrar' }
        ],
        reglas: [
          {
            id: 'tope-contrato', mensaje: 'Con este hito se factura más del 100 % del contrato.',
            validar: function (d, ctx) {
              var previos = facturasVigentes(ctx, null, null, function (f) { return f.proyecto === d.proyecto && f.id !== d.id; });
              return ctx.suma(previos, function (f) { return f.porcentajeHito; }) + (d.porcentajeHito || 0) <= 100;
            }
          },
          {
            id: 'proyecto-facturable', mensaje: 'No se factura un proyecto cancelado.',
            validar: function (d, ctx) { var p = d.proyecto ? ctx.datos.obtener('proyectos', d.proyecto) : null; return !p || p.estado !== 'Cancelado'; }
          }
        ],
        alEmitir: function (doc, ctx) {
          var p = ctx.datos.obtener('proyectos', doc.proyecto);
          var acumulado = ctx.suma(facturasVigentes(ctx, null, null, function (f) { return f.proyecto === doc.proyecto; }), function (f) { return f.porcentajeHito; });
          if (acumulado > p.avancePct) {
            throw new Error('No se puede facturar por encima del avance: «' + p.nombre + '» lleva ' + p.avancePct + ' % y con este hito se facturaría ' + acumulado + ' %.');
          }
          if (acumulado >= 100 && p.estado !== 'Cerrado') { ctx.datos.actualizar('proyectos', p.id, { estado: 'Cerrado' }); }
        },
        alAnular: function (doc, ctx) {
          var p = ctx.datos.obtener('proyectos', doc.proyecto);
          var acumulado = ctx.suma(facturasVigentes(ctx, null, null, function (f) { return f.proyecto === doc.proyecto; }), function (f) { return f.porcentajeHito; });
          if (p && p.estado === 'Cerrado' && acumulado < 100) { ctx.datos.actualizar('proyectos', p.id, { estado: 'En ejecución' }); }
        },
        permisos: { ver: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'], crear: ['admin', 'pm', 'finanzas'], editar: ['admin', 'pm', 'finanzas'], emitir: ['admin', 'finanzas'], anular: ['admin', 'gerente'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'rentabilidad', titulo: 'Rentabilidad por proyecto',
        descripcion: 'Compara, en el periodo, lo facturado por hitos (sin IGV) con el costo cargado de las horas aprobadas. Un hito se factura por tramos, así que el margen de un periodo puede ser negativo sin que el proyecto pierda dinero.',
        roles: ['admin', 'gerente', 'finanzas', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var proyectos = ctx.datos.listar('proyectos'), filas = [], i, py, c, cli, fact, margen, totFact = 0, totCosto = 0, etiquetas = [], valores = [];
          for (i = 0; i < proyectos.length; i++) {
            py = proyectos[i];
            c = consumoProyecto(ctx, py.id, p.desde, p.hasta);
            fact = ctx.redondear(ctx.suma(facturasVigentes(ctx, p.desde, p.hasta, function (f) { return f.proyecto === py.id; }), function (f) { return f.totales ? f.totales.base : 0; }));
            if (!c.horas && !fact) { continue; }
            cli = ctx.datos.obtener('clientes', py.cliente);
            margen = ctx.redondear(fact - c.costo);
            filas.push([py.nombre, cli ? cli.nombre : '', ctx.redondear(c.horas), c.costo, fact, margen, fact > 0 ? ctx.redondear(margen / fact * 100) : null]);
            totFact += fact;
            totCosto += c.costo;
          }
          filas.sort(function (a, b) { return b[5] - a[5]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][5]); }
          return {
            columnas: ['Proyecto', 'Cliente', 'Horas', 'Costo cargado', 'Facturado', 'Margen', 'Margen %'],
            tipos: ['texto', 'texto', 'numero', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Facturado en el periodo', valor: ctx.redondear(totFact), tipo: 'moneda' },
              { etiqueta: 'Costo cargado', valor: ctx.redondear(totCosto), tipo: 'moneda' },
              { etiqueta: 'Margen del periodo', valor: totFact > 0 ? ctx.redondear((totFact - totCosto) / totFact * 100) : null, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'utilizacion', titulo: 'Utilización por consultor',
        descripcion: 'Horas facturables sobre la capacidad productiva del periodo, comparadas con la meta de utilización. Más de 100 % indica sobreasignación.',
        roles: ['admin', 'gerente', 'pm', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-94' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var docs = partesEmitidos(ctx, p.desde, p.hasta), cons = ctx.datos.listar('consultores', function (c) { return c.activo !== false && (!c.fechaIngreso || c.fechaIngreso <= p.hasta); }), dias = ctx.diasEntre(p.desde, p.hasta) + 1;
          var filas = [], etiquetas = [], valores = [], i, j, k, h, hf, u, meta = ctx.param('utilizacionMeta'), enMeta = 0, totH = 0, totF = 0;
          for (i = 0; i < cons.length; i++) {
            h = 0;
            hf = 0;
            for (j = 0; j < docs.length; j++) {
              if (docs[j].consultor !== cons[i].id) { continue; }
              for (k = 0; k < docs[j].lineas.length; k++) {
                h += Number(docs[j].lineas[k].horas) || 0;
                if (docs[j].lineas[k].facturable !== false) { hf += Number(docs[j].lineas[k].horas) || 0; }
              }
            }
            u = ctx.redondear(utilizacion(hf, ctx.param('horasProductivas'), dias));
            filas.push([cons[i].nombre, cons[i].cargo, ctx.redondear(h), ctx.redondear(hf), ctx.redondear(ctx.param('horasProductivas') * dias / 30), u, u > 100 ? 'Sobreasignado' : (u >= meta ? 'En meta' : 'Bajo la meta')]);
            if (u >= meta) { enMeta += 1; }
            totH += h;
            totF += hf;
          }
          filas.sort(function (a, b) { return b[5] - a[5]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][5]); }
          return {
            columnas: ['Consultor', 'Cargo', 'Horas cargadas', 'Horas facturables', 'Capacidad', 'Utilización %', 'Situación'],
            tipos: ['texto', 'texto', 'numero', 'numero', 'numero', 'porcentaje', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Horas facturables', valor: ctx.redondear(totF), tipo: 'numero' },
              { etiqueta: 'Consultores en la meta', valor: enMeta, tipo: 'entero' },
              { etiqueta: 'Meta de utilización', valor: meta, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'valor-ganado', titulo: 'Avance contra plan (valor ganado)',
        descripcion: 'PV, EV, AC, CPI y SPI de los proyectos vigentes en el periodo. El valor planificado se mide a la fecha «Hasta»; el valor ganado usa el avance registrado hoy.',
        roles: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Proyectos vigentes desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Corte del valor planificado', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var proyectos = ctx.datos.listar('proyectos', function (x) { return x.fechaInicio <= p.hasta && x.fechaFin >= p.desde && x.estado !== 'Cancelado'; });
          var filas = [], etiquetas = [], valores = [], i, m, minimo = ctx.param('umbralIndice'), sumPv = 0, sumEv = 0, sumAc = 0, estado;
          for (i = 0; i < proyectos.length; i++) {
            m = metricasProyecto(proyectos[i], ctx, p.hasta);
            if (m.cpi !== null && m.cpi < minimo) { estado = 'Sobre costo'; }
            else if (m.spi !== null && m.spi < minimo) { estado = 'Atrasado'; }
            else if (m.margen !== null && m.margen < ctx.param('margenMinimo')) { estado = 'Margen bajo el mínimo'; }
            else { estado = 'Controlado'; }
            filas.push([proyectos[i].nombre, m.bac, m.plan, m.avance, m.pv, m.ev, m.ac, m.cpi, m.spi, estado]);
            sumPv += m.pv;
            sumEv += m.ev;
            sumAc += m.ac;
          }
          filas.sort(function (a, b) { return (a[8] === null ? 9 : a[8]) - (b[8] === null ? 9 : b[8]); });
          for (i = 0; i < filas.length; i++) { if (filas[i][8] !== null) { etiquetas.push(filas[i][0]); valores.push(filas[i][8]); } }
          return {
            columnas: ['Proyecto', 'Costo presupuestado', '% plan', '% real', 'PV', 'EV', 'AC', 'CPI', 'SPI', 'Situación'],
            tipos: ['texto', 'moneda', 'porcentaje', 'porcentaje', 'moneda', 'moneda', 'moneda', 'numero', 'numero', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'numero' },
            resumen: [
              { etiqueta: 'Valor planificado (PV)', valor: ctx.redondear(sumPv), tipo: 'moneda' },
              { etiqueta: 'Valor ganado (EV)', valor: ctx.redondear(sumEv), tipo: 'moneda' },
              { etiqueta: 'CPI de la cartera', valor: sumAc > 0 ? ctx.redondear(sumEv / sumAc) : null, tipo: 'numero' },
              { etiqueta: 'SPI de la cartera', valor: sumPv > 0 ? ctx.redondear(sumEv / sumPv) : null, tipo: 'numero' }
            ]
          };
        }
      },
      {
        id: 'facturacion-hitos', titulo: 'Facturación por hitos',
        descripcion: 'Facturas por hito emitidas por mes: valor, IGV, detracción y lo que sigue pendiente de cobro. Las anuladas y los borradores no cuentan.',
        roles: ['admin', 'gerente', 'finanzas', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var fs = facturasVigentes(ctx, p.desde, p.hasta), grupos = ctx.agrupar(fs, function (f) { return ctx.mes(f.fecha); }), claves = [], k, filas = [], etiquetas = [], valores = [], g, tot, totalDetr = 0, totalPend = 0, totalBase = 0;
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          for (k = 0; k < claves.length; k++) {
            g = grupos[claves[k]];
            tot = ctx.redondear(ctx.suma(g, function (f) { return f.totales.total; }));
            filas.push([nombreMes(claves[k]), g.length, ctx.redondear(ctx.suma(g, function (f) { return f.totales.base; })), ctx.redondear(ctx.suma(g, function (f) { return f.totales.igv; })), tot,
              ctx.redondear(ctx.suma(g, function (f) { return f.totales.detraccion; })), ctx.redondear(ctx.suma(g, function (f) { return f.estado === 'Emitida' ? f.totales.neto : 0; }))]);
            etiquetas.push(nombreMes(claves[k]));
            valores.push(ctx.redondear(ctx.suma(g, function (f) { return f.totales.base; })));
            totalBase += ctx.suma(g, function (f) { return f.totales.base; });
            totalDetr += ctx.suma(g, function (f) { return f.totales.detraccion; });
            totalPend += ctx.suma(g, function (f) { return f.estado === 'Emitida' ? f.totales.neto : 0; });
          }
          return {
            columnas: ['Mes', 'Facturas', 'Valor de hitos', 'IGV', 'Total facturado', 'Detracción', 'Neto por cobrar'],
            tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Valor facturado (sin IGV)', valor: ctx.redondear(totalBase), tipo: 'moneda' },
              { etiqueta: 'Detracciones', valor: ctx.redondear(totalDetr), tipo: 'moneda' },
              { etiqueta: 'Neto pendiente de cobro', valor: ctx.redondear(totalPend), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'pipeline', titulo: 'Pipeline de propuestas',
        descripcion: 'Propuestas enviadas en el periodo agrupadas por etapa, con su monto, su valor ponderado por la probabilidad de cierre y la tasa de cierre.',
        roles: ['admin', 'gerente', 'comercial', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Enviadas desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var props = ctx.datos.listar('propuestas', function (x) { return x.fechaEnvio >= p.desde && x.fechaEnvio <= p.hasta; }), etapas = ['Prospecto', 'Propuesta enviada', 'Negociación', 'Ganada', 'Perdida'];
          var grupos = ctx.agrupar(props, function (x) { return x.etapa; }), filas = [], etiquetas = [], valores = [], i, g, ganadas = 0, perdidas = 0, abierto = 0, montoGanado = 0;
          for (i = 0; i < etapas.length; i++) {
            g = grupos[etapas[i]] || [];
            if (!g.length) { continue; }
            filas.push([etapas[i], g.length, ctx.redondear(ctx.suma(g, function (x) { return x.monto; })), ctx.redondear(ctx.suma(g, function (x) { return x.probabilidad; }) / g.length), ctx.redondear(ctx.suma(g, function (x) { return x.monto * x.probabilidad / 100; }))]);
            etiquetas.push(etapas[i]);
            valores.push(ctx.redondear(ctx.suma(g, function (x) { return x.monto * x.probabilidad / 100; })));
            if (etapas[i] === 'Ganada') { ganadas = g.length; montoGanado = ctx.suma(g, function (x) { return x.monto; }); }
            else if (etapas[i] === 'Perdida') { perdidas = g.length; }
            else { abierto += ctx.suma(g, function (x) { return x.monto * x.probabilidad / 100; }); }
          }
          return {
            columnas: ['Etapa', 'Propuestas', 'Monto', 'Probabilidad promedio %', 'Valor ponderado'],
            tipos: ['texto', 'entero', 'moneda', 'porcentaje', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Pipeline abierto ponderado', valor: ctx.redondear(abierto), tipo: 'moneda' },
              { etiqueta: 'Monto ganado', valor: ctx.redondear(montoGanado), tipo: 'moneda' },
              { etiqueta: 'Tasa de cierre', valor: ganadas + perdidas > 0 ? ctx.redondear(ganadas / (ganadas + perdidas) * 100) : null, tipo: 'porcentaje' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Proyectos en ejecución', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('proyectos', esProyectoActivo).length; }
      },
      {
        titulo: 'Horas facturables (30 días)', tipo: 'numero',
        calcular: function (ctx) {
          var docs = partesEmitidos(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), h = 0, i, j;
          for (i = 0; i < docs.length; i++) { for (j = 0; j < docs[i].lineas.length; j++) { if (docs[i].lineas[j].facturable !== false) { h += Number(docs[i].lineas[j].horas) || 0; } } }
          return ctx.redondear(h);
        }
      },
      {
        titulo: 'Utilización del equipo (30 días)', tipo: 'porcentaje',
        calcular: function (ctx) {
          var docs = partesEmitidos(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), h = 0, i, j, n = ctx.datos.listar('consultores', function (c) { return c.activo !== false; }).length;
          for (i = 0; i < docs.length; i++) { for (j = 0; j < docs[i].lineas.length; j++) { if (docs[i].lineas[j].facturable !== false) { h += Number(docs[i].lineas[j].horas) || 0; } } }
          return n ? ctx.redondear(utilizacion(h, ctx.param('horasProductivas') * n, 30)) : null;
        }
      },
      {
        titulo: 'Facturado en 30 días (sin IGV)', tipo: 'moneda', roles: ['admin', 'gerente', 'finanzas', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(facturasVigentes(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (f) { return f.totales.base; }));
        }
      },
      {
        titulo: 'Pipeline ponderado', tipo: 'moneda', roles: ['admin', 'gerente', 'comercial', 'auditor'],
        calcular: function (ctx) {
          var abiertas = ctx.datos.listar('propuestas', function (x) { return x.etapa !== 'Ganada' && x.etapa !== 'Perdida'; });
          return ctx.redondear(ctx.suma(abiertas, function (x) { return x.monto * x.probabilidad / 100; }));
        }
      },
      {
        titulo: 'Proyectos en riesgo (CPI o SPI bajo el mínimo)', tipo: 'entero', roles: ['admin', 'gerente', 'pm', 'finanzas', 'auditor'],
        calcular: function (ctx) {
          var minimo = ctx.param('umbralIndice'), n = 0, ps = ctx.datos.listar('proyectos', esProyectoActivo), i, m;
          for (i = 0; i < ps.length; i++) {
            m = metricasProyecto(ps[i], ctx);
            if ((m.cpi !== null && m.cpi < minimo) || (m.spi !== null && m.spi < minimo)) { n += 1; }
          }
          return n;
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Horas facturables por mes (aprobadas)', tipo: 'columnas', formato: 'entero',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), docs = partesEmitidos(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(docs, function (d) { return ctx.mes(d.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(Math.round(ctx.suma(g[meses[i]] || [], function (d) { return d.totales ? d.totales.horasFacturables : 0; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      clientes: [
        { id: 'CLI-0001', ruc: '20512478951', nombre: 'Banco Andino del Sur S.A.', sector: 'Banca y finanzas', ciudad: 'Lima', contacto: 'Patricia Anaya Solís', email: 'tecnologia@bancoandino.example.pe', telefono: '01 612 3300', condicionPago: '30 días', estado: 'Activo' },
        { id: 'CLI-0002', ruc: '20523589062', nombre: 'Minera Cerro Alto S.A.C.', sector: 'Minería', ciudad: 'Arequipa', contacto: 'Julio Cornejo Bellido', email: 'sistemas@cerroalto.example.pe', telefono: '054 281 440', condicionPago: '45 días', estado: 'Activo' },
        { id: 'CLI-0003', ruc: '20534690173', nombre: 'Supermercados La Ñusta S.A.', sector: 'Retail', ciudad: 'Lima', contacto: 'Carolina Rengifo Paz', email: 'ti@lanusta.example.pe', telefono: '01 441 8820', condicionPago: '30 días', estado: 'Activo' },
        { id: 'CLI-0004', ruc: '20545701284', nombre: 'Clínica Santa Catalina S.A.C.', sector: 'Salud', ciudad: 'Lima', contacto: 'Dr. Marco Aliaga Núñez', email: 'gerencia@santacatalina.example.pe', telefono: '01 335 7710', condicionPago: '30 días', estado: 'Activo' },
        { id: 'CLI-0005', ruc: '20556812395', nombre: 'Universidad Técnica del Norte', sector: 'Educación', ciudad: 'Trujillo', contacto: 'Ing. Elena Burga Salas', email: 'ti@utnorte.example.pe', telefono: '044 262 105', condicionPago: '45 días', estado: 'Activo' },
        { id: 'CLI-0006', ruc: '20567923406', nombre: 'Gobierno Regional Valle Verde', sector: 'Gobierno', ciudad: 'Cusco', contacto: 'Abog. Hernán Quispe Ccori', email: 'informatica@valleverde.example.pe', telefono: '084 233 510', condicionPago: '60 días', estado: 'Activo' },
        { id: 'CLI-0007', ruc: '20578034517', nombre: 'Telecom Pacífico S.A.', sector: 'Telecomunicaciones', ciudad: 'Lima', contacto: 'Ricardo Montalvo Cruz', email: 'proyectos@telepacifico.example.pe', telefono: '01 710 4400', condicionPago: '30 días', estado: 'Activo' },
        { id: 'CLI-0008', ruc: '20589145628', nombre: 'Operadores Logísticos Sullana S.A.C.', sector: 'Logística', ciudad: 'Piura', contacto: 'Mónica Távara Ruiz', email: 'operaciones@olsullana.example.pe', telefono: '073 345 220', condicionPago: '30 días', estado: 'Activo' },
        { id: 'CLI-0009', ruc: '20590256739', nombre: 'Seguros Inti S.A.', sector: 'Seguros', ciudad: 'Lima', contacto: 'Fabiola Cárdenas Vera', email: 'tecnologia@segurosinti.example.pe', telefono: '01 421 9005', condicionPago: '30 días', estado: 'Activo' },
        { id: 'CLI-0010', ruc: '20601367840', nombre: 'Energía Solar Majes S.A.', sector: 'Energía', ciudad: 'Arequipa', contacto: 'Ing. Óscar Llerena Pinto', email: 'planta@solarmajes.example.pe', telefono: '054 442 118', condicionPago: '45 días', estado: 'Activo' },
        { id: 'CLI-0011', ruc: '20612478951', nombre: 'Agroexportadora Valle Dorado S.A.C.', sector: 'Agroindustria', ciudad: 'Chiclayo', contacto: 'Sonia Ramos Gil', email: 'comex@valledorado.example.pe', telefono: '074 270 330', condicionPago: '30 días', estado: 'Prospecto' },
        { id: 'CLI-0012', ruc: '20623589062', nombre: 'Cooperativa de Ahorro Kuntur', sector: 'Banca y finanzas', ciudad: 'Cusco', contacto: 'Walter Huamán Ttito', email: 'gerencia@kuntur.example.pe', telefono: '084 245 770', condicionPago: '15 días', estado: 'Activo' },
        { id: 'CLI-0013', ruc: '20634690173', nombre: 'Textiles Mochica S.A.', sector: 'Manufactura', ciudad: 'Chiclayo', contacto: 'Gladys Carrasco Neyra', email: 'sistemas@mochica.example.pe', telefono: '074 231 905', condicionPago: '30 días', estado: 'Inactivo' }
      ],
      consultores: [
        { id: 'CON-0001', nombre: 'Valeria Quispe Huamán', dni: '42180731', cargo: 'Jefe de proyecto', nivel: 'Senior', sueldoMensual: 9800, email: 'vquispe@nexa.example.pe', fechaIngreso: '2021-03-01', activo: true },
        { id: 'CON-0002', nombre: 'Renzo Bustamante Ochoa', dni: '43562819', cargo: 'Jefe de proyecto', nivel: 'Senior', sueldoMensual: 9200, email: 'rbustamante@nexa.example.pe', fechaIngreso: '2022-02-14', activo: true },
        { id: 'CON-0003', nombre: 'Camila Arce Mendoza', dni: '41905627', cargo: 'Arquitecto de software', nivel: 'Senior', sueldoMensual: 12500, email: 'carce@nexa.example.pe', fechaIngreso: '2020-08-03', activo: true },
        { id: 'CON-0004', nombre: 'Diego Salazar Yupanqui', dni: '44720158', cargo: 'Desarrollador backend', nivel: 'Senior', sueldoMensual: 8200, email: 'dsalazar@nexa.example.pe', fechaIngreso: '2021-06-21', activo: true },
        { id: 'CON-0005', nombre: 'Mariana Rojas Tello', dni: '46831204', cargo: 'Desarrollador backend', nivel: 'Semisenior', sueldoMensual: 6000, email: 'mrojas@nexa.example.pe', fechaIngreso: '2023-01-09', activo: true },
        { id: 'CON-0006', nombre: 'Sebastián Cárdenas Pinto', dni: '47295610', cargo: 'Desarrollador frontend', nivel: 'Semisenior', sueldoMensual: 5600, email: 'scardenas@nexa.example.pe', fechaIngreso: '2023-05-15', activo: true },
        { id: 'CON-0007', nombre: 'Fiorella Paredes Lazo', dni: '72148305', cargo: 'Desarrollador frontend', nivel: 'Junior', sueldoMensual: 3200, email: 'fparedes@nexa.example.pe', fechaIngreso: '2025-03-03', activo: true },
        { id: 'CON-0008', nombre: 'Jhon Cruz Mamani', dni: '45036172', cargo: 'Analista QA', nivel: 'Semisenior', sueldoMensual: 5200, email: 'jcruz@nexa.example.pe', fechaIngreso: '2022-10-10', activo: true },
        { id: 'CON-0009', nombre: 'Andrea Villanueva Ríos', dni: '43318924', cargo: 'Analista funcional', nivel: 'Senior', sueldoMensual: 7400, email: 'avillanueva@nexa.example.pe', fechaIngreso: '2021-09-06', activo: true },
        { id: 'CON-0010', nombre: 'Luis Alberto Cornejo Vega', dni: '40872593', cargo: 'Ingeniero DevOps', nivel: 'Senior', sueldoMensual: 9000, email: 'lcornejo@nexa.example.pe', fechaIngreso: '2022-07-18', activo: true },
        { id: 'CON-0011', nombre: 'Paola Neyra Soto', dni: '47610385', cargo: 'Diseñador UX', nivel: 'Semisenior', sueldoMensual: 5400, email: 'pneyra@nexa.example.pe', fechaIngreso: '2024-02-12', activo: true },
        { id: 'CON-0012', nombre: 'Kevin Huanca Delgado', dni: '73920461', cargo: 'Analista de datos', nivel: 'Junior', sueldoMensual: 3600, email: 'khuanca@nexa.example.pe', fechaIngreso: '2025-01-20', activo: true },
        { id: 'CON-0013', nombre: 'Rosa Elena Ticona Campos', dni: '44158076', cargo: 'Analista funcional', nivel: 'Semisenior', sueldoMensual: 5900, email: 'rticona@nexa.example.pe', fechaIngreso: '2023-11-06', activo: true }
      ],
      proyectos: armarProyectos(),
      propuestas: [
        { id: 'PRP-0001', codigo: 'NXA-P-101', titulo: 'Modernización del core de créditos', cliente: 'CLI-0001', responsable: 'Lorena Medina', monto: 520000, probabilidad: 40, etapa: 'Negociación', fechaEnvio: '@-30', fechaCierre: '@25' },
        { id: 'PRP-0002', codigo: 'NXA-P-102', titulo: 'App de pagos para tiendas', cliente: 'CLI-0003', responsable: 'Lorena Medina', monto: 280000, probabilidad: 25, etapa: 'Propuesta enviada', fechaEnvio: '@-18', fechaCierre: '@45' },
        { id: 'PRP-0003', codigo: 'NXA-P-103', titulo: 'Data lake y tableros gerenciales', cliente: 'CLI-0002', responsable: 'Gonzalo Benavides', monto: 340000, probabilidad: 60, etapa: 'Negociación', fechaEnvio: '@-40', fechaCierre: '@15' },
        { id: 'PRP-0004', codigo: 'NXA-P-104', titulo: 'Portal de proveedores', cliente: 'CLI-0008', responsable: 'Lorena Medina', monto: 95000, probabilidad: 100, etapa: 'Ganada', fechaEnvio: '@-70', fechaCierre: '@-45' },
        { id: 'PRP-0005', codigo: 'NXA-P-105', titulo: 'Historia clínica, fase 2', cliente: 'CLI-0004', responsable: 'Gonzalo Benavides', monto: 210000, probabilidad: 15, etapa: 'Prospecto', fechaEnvio: '@-6', fechaCierre: '@60' },
        { id: 'PRP-0006', codigo: 'NXA-P-106', titulo: 'Sistema de admisión en línea', cliente: 'CLI-0005', responsable: 'Lorena Medina', monto: 150000, probabilidad: 0, etapa: 'Perdida', fechaEnvio: '@-90', fechaCierre: '@-60' },
        { id: 'PRP-0007', codigo: 'NXA-P-107', titulo: 'Automatización de reportes regulatorios', cliente: 'CLI-0012', responsable: 'Lorena Medina', monto: 88000, probabilidad: 100, etapa: 'Ganada', fechaEnvio: '@-110', fechaCierre: '@-85' },
        { id: 'PRP-0008', codigo: 'NXA-P-108', titulo: 'Plataforma de recaudación municipal', cliente: 'CLI-0006', responsable: 'Gonzalo Benavides', monto: 410000, probabilidad: 30, etapa: 'Propuesta enviada', fechaEnvio: '@-25', fechaCierre: '@40' },
        { id: 'PRP-0009', codigo: 'NXA-P-109', titulo: 'Optimización de rutas de reparto', cliente: 'CLI-0008', responsable: 'Lorena Medina', monto: 130000, probabilidad: 50, etapa: 'Negociación', fechaEnvio: '@-12', fechaCierre: '@20' },
        { id: 'PRP-0010', codigo: 'NXA-P-110', titulo: 'Integración con pasarelas de pago', cliente: 'CLI-0011', responsable: 'Lorena Medina', monto: 76000, probabilidad: 20, etapa: 'Propuesta enviada', fechaEnvio: '@-9', fechaCierre: '@30' },
        { id: 'PRP-0011', codigo: 'NXA-P-111', titulo: 'Mesa de ayuda con inteligencia artificial', cliente: 'CLI-0007', responsable: 'Gonzalo Benavides', monto: 185000, probabilidad: 0, etapa: 'Perdida', fechaEnvio: '@-130', fechaCierre: '@-100' },
        { id: 'PRP-0012', codigo: 'NXA-P-112', titulo: 'Migración del ERP a la nube', cliente: 'CLI-0013', responsable: 'Lorena Medina', monto: 260000, probabilidad: 35, etapa: 'Propuesta enviada', fechaEnvio: '@-14', fechaCierre: '@50' }
      ],
      partes: armarPartes(),
      facturas: armarFacturas()
    }
  };
})();
