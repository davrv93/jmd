/*
 * DataFactory · Fábrica de inteligencia de negocios (Lima)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «fabrica-bi». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC y DNI de ejemplo) y no corresponden a personas
 * ni empresas reales. Todo el código es ES5 (sin flechas, let, const ni plantillas).
 *
 * Reglas de medición del rubro:
 *   Costo de cómputo   = (duración en minutos / 60) × nodos del pipeline × tarifa por nodo-hora
 *   Entrega a tiempo   = espera en cola + duración ≤ SLA del pipeline (y la ejecución no falló)
 *   Calidad de una fuente = promedio ponderado de completitud, unicidad y vigencia
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

  /* Días de tolerancia antes de que los datos de una fuente se consideren viejos, según su frecuencia de carga. */
  function toleranciaDias(frecuencia) {
    var t = { 'Tiempo real': 1, 'Cada hora': 1, 'Diaria': 2, 'Semanal': 9, 'Mensual': 35 };
    return t[frecuencia] || 2;
  }

  /* Vigencia (0–100): 100 mientras la edad no pase la tolerancia y baja en línea recta hasta 0 a las tres tolerancias. */
  function vigenciaPct(edadDias, tolerancia) {
    if (edadDias <= tolerancia) { return 100; }
    if (edadDias >= tolerancia * 3) { return 0; }
    return 100 - (edadDias - tolerancia) / (tolerancia * 2) * 100;
  }

  /* Costo de cómputo de una ejecución. */
  function costoComputo(duracionMin, nodos, tarifaNodoHora) {
    return (duracionMin || 0) / 60 * (nodos || 0) * (tarifaNodoHora || 0);
  }

  /* Métricas de calidad de una fuente (todas en porcentaje). */
  function calidadFuente(f, ctx) {
    var reg = f.registros || 0, completitud = reg > 0 ? (1 - (f.registrosIncompletos || 0) / reg) * 100 : 0, unicidad = reg > 0 ? (1 - (f.registrosDuplicados || 0) / reg) * 100 : 0;
    var edad = f.ultimaActualizacion ? Math.max(0, ctx.diasEntre(f.ultimaActualizacion, ctx.hoy())) : null;
    var vigencia = edad === null ? 0 : vigenciaPct(edad, toleranciaDias(f.frecuencia));
    var wc = ctx.param('pesoCompletitud'), wu = ctx.param('pesoUnicidad'), wv = ctx.param('pesoVigencia'), suma = wc + wu + wv;
    return {
      completitud: ctx.redondear(completitud), unicidad: ctx.redondear(unicidad), vigencia: ctx.redondear(vigencia), edad: edad,
      puntaje: suma > 0 ? ctx.redondear((completitud * wc + unicidad * wu + vigencia * wv) / suma) : 0
    };
  }

  /* SLA de resolución (horas) de una prioridad de ticket. */
  function slaTicketHoras(prioridad, ctx) {
    var id = { 'Crítica': 'slaCritica', 'Alta': 'slaAlta', 'Media': 'slaMedia', 'Baja': 'slaBaja' }[prioridad];
    return id ? ctx.param(id) : ctx.param('slaMedia');
  }

  /* Ejecuciones que ya terminaron (exitosas, con advertencias o fallidas) dentro de un rango. */
  function ejecutadas(ctx, desde, hasta) {
    return ctx.datos.listar('ejecuciones', function (e) {
      return (e.estado === 'Exitosa' || e.estado === 'Con advertencias' || e.estado === 'Fallida') && (!desde || e.fecha >= desde) && (!hasta || e.fecha <= hasta);
    });
  }

  /* Tickets atendidos (incluye los escalados) dentro de un rango. */
  function ticketsAtendidos(ctx, desde, hasta) {
    return ctx.datos.listar('tickets', function (t) {
      return (t.estado === 'Atendido' || t.estado === 'Escalado a ingeniería') && (!desde || t.fecha >= desde) && (!hasta || t.fecha <= hasta);
    });
  }

  /* ¿La ejecución entregó los datos dentro del SLA del pipeline? Una ejecución fallida nunca entrega. */
  function entregoATiempo(e) {
    return e.estado !== 'Fallida' && !!e.totales && e.totales.entregaMin <= e.totales.slaMin;
  }

  function ticketEnSla(t, ctx) { return t.horasResolucion <= slaTicketHoras(t.prioridad, ctx); }

  /* Mapas pipeline → cliente, para no recorrer las tres entidades por cada ejecución. */
  function clientePorPipeline(ctx) {
    var fuentes = ctx.datos.listar('fuentes'), pipes = ctx.datos.listar('pipelines'), fc = {}, r = {}, i;
    for (i = 0; i < fuentes.length; i++) { fc[fuentes[i].id] = fuentes[i].cliente; }
    for (i = 0; i < pipes.length; i++) { r[pipes[i].id] = fc[pipes[i].fuente]; }
    return r;
  }

  function nombreCliente(ctx, id) { var c = ctx.datos.obtener('clientes', id); return c ? c.nombre : '(sin cliente)'; }

  /* ---------- Datos de demostración ---------- */

  /* Generador pseudoaleatorio fijo: las semillas son siempre las mismas. */
  function aleatorio(semilla) {
    var s = semilla;
    return function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  /* Pipeline: [id, código, nombre, fuente, destino, hora de inicio, nodos, SLA (h), activo, responsable, [filas típicas, minutos típicos, prob. de falla, prob. de advertencia, espera típica (min)]] */
  var PIPELINES = [
    ['PIP-0001', 'DF-AGR-ACO', 'Acopio diario de fruta', 'FUE-0001', 'Data warehouse (PostgreSQL)', 2, 4, 4, true, 'Brenda Llanos', [42000, 38, 0.024, 0.048, 6]],
    ['PIP-0002', 'DF-AGR-SEN', 'Sensores de cámaras de frío', 'FUE-0002', 'Data lake (S3)', 0, 2, 2, true, 'Brenda Llanos', [310000, 14, 0.018, 0.03, 2]],
    ['PIP-0003', 'DF-FAR-POS', 'Ventas de botica (incremental)', 'FUE-0003', 'Snowflake', 1, 8, 3, true, 'Iván Cuba', [520000, 52, 0.036, 0.06, 10]],
    ['PIP-0004', 'DF-FAR-INV', 'Inventario de almacenes', 'FUE-0004', 'Snowflake', 3, 4, 3, true, 'Iván Cuba', [86000, 41, 0.072, 0.072, 12]],
    ['PIP-0005', 'DF-BCO-CTA', 'Cuentas y saldos', 'FUE-0005', 'Azure Synapse', 1, 6, 4, true, 'Brenda Llanos', [210000, 66, 0.012, 0.036, 5]],
    ['PIP-0006', 'DF-BCO-PAG', 'Pagos con tarjeta', 'FUE-0006', 'Azure Synapse', 0, 8, 2, true, 'Iván Cuba', [960000, 92, 0.048, 0.072, 8]],
    ['PIP-0007', 'DF-RET-VEN', 'Ventas por tienda', 'FUE-0007', 'BigQuery', 2, 4, 4, true, 'Camila Ruelas', [330000, 58, 0.03, 0.048, 7]],
    ['PIP-0008', 'DF-RET-CAT', 'Catálogo de productos semanal', 'FUE-0008', 'BigQuery', 5, 2, 6, true, 'Camila Ruelas', [1500, 4, 0.09, 0.12, 3]],
    ['PIP-0009', 'DF-UNI-ACA', 'Sistema académico', 'FUE-0009', 'Data warehouse (PostgreSQL)', 3, 2, 6, true, 'Camila Ruelas', [48000, 22, 0.018, 0.03, 4]],
    ['PIP-0010', 'DF-MIN-MAN', 'Mantenimiento de flota', 'FUE-0010', 'Data lake (S3)', 1, 4, 4, true, 'Iván Cuba', [92000, 47, 0.03, 0.054, 9]],
    ['PIP-0011', 'DF-MIN-TEL', 'Telemetría de camiones', 'FUE-0011', 'Data lake (S3)', 0, 16, 2, true, 'Brenda Llanos', [4200000, 96, 0.054, 0.066, 15]],
    ['PIP-0012', 'DF-TEL-FAC', 'Facturación y cobranzas', 'FUE-0013', 'Azure Synapse', 2, 8, 4, true, 'Iván Cuba', [610000, 96, 0.024, 0.042, 10]],
    ['PIP-0013', 'DF-SEG-SIN', 'Siniestros', 'FUE-0014', 'Data warehouse (PostgreSQL)', 4, 2, 6, true, 'Camila Ruelas', [18000, 19, 0.042, 0.06, 5]],
    ['PIP-0014', 'DF-CLI-HCE', 'Historias clínicas (resumen)', 'FUE-0015', 'Data lake (S3)', 3, 4, 4, true, 'Brenda Llanos', [72000, 55, 0.06, 0.078, 8]],
    ['PIP-0015', 'DF-MUN-REC', 'Recaudación municipal', 'FUE-0016', 'Data warehouse (PostgreSQL)', 6, 2, 8, false, 'Camila Ruelas', [9000, 12, 0.2, 0.2, 3]]
  ];

  function armarPipelines() {
    var r = [], i, f;
    for (i = 0; i < PIPELINES.length; i++) {
      f = PIPELINES[i];
      r.push({ id: f[0], codigo: f[1], nombre: f[2], fuente: f[3], destino: f[4], horaInicio: f[5], nodos: f[6], slaHoras: f[7], activo: f[8], responsable: f[9] });
    }
    return r;
  }

  /* Diez ejecuciones por pipeline, cada 18 días, con resultados variados pero siempre iguales. */
  function armarEjecuciones() {
    var rnd = aleatorio(777), filas = [], f, i, k, p, sim, desplazo, d, u, estado, proc, rech, dur, espera, obs, r = [], n, id;
    for (i = 0; i < PIPELINES.length; i++) {
      p = PIPELINES[i];
      sim = p[10];
      desplazo = (i % 6) * 2;
      for (k = 0; k < 10; k++) {
        d = 3 + desplazo + 18 * k + Math.floor(rnd() * 4);
        if (d > 188 || (!p[8] && d < 60)) { continue; }
        u = rnd();
        estado = u < sim[2] ? 'Fallida' : (u < sim[2] + sim[3] ? 'Con advertencias' : 'Exitosa');
        proc = Math.round(sim[0] * (0.85 + rnd() * 0.3));
        dur = Math.max(1, Math.round(sim[1] * (0.8 + rnd() * 0.5)));
        espera = rnd() < 0.15 ? Math.round(20 + rnd() * 40) : Math.round(sim[4] * (0.3 + rnd() * 1.4));
        obs = '';
        if (estado === 'Fallida') {
          proc = Math.round(proc * rnd() * 0.3);
          dur = Math.max(1, Math.round(dur * (0.3 + rnd() * 0.4)));
          obs = rnd() < 0.5 ? 'Se perdió la conexión con la fuente antes de terminar.' : 'Cambió el esquema de origen y la carga se detuvo.';
        } else if (estado === 'Con advertencias') {
          obs = 'Filas rechazadas por formato de fecha o código inválido.';
        }
        rech = Math.round(proc * (estado === 'Con advertencias' ? 0.015 : 0.003) * (0.5 + rnd()));
        filas.push({ dias: d, pipeline: p[0], fecha: '@-' + d, filasProcesadas: proc, filasRechazadas: rech, duracionMin: dur, esperaMin: espera, observaciones: obs, estado: estado });
      }
    }
    filas.sort(function (a, b) { return b.dias - a.dias || (a.pipeline < b.pipeline ? -1 : 1); });
    for (i = 0; i < filas.length; i++) {
      n = i + 1;
      id = 'EJE-' + (n < 10 ? '000' : (n < 100 ? '00' : '0')) + n;
      f = filas[i];
      r.push({ id: id, fecha: f.fecha, pipeline: f.pipeline, filasProcesadas: f.filasProcesadas, filasRechazadas: f.filasRechazadas, duracionMin: f.duracionMin, esperaMin: f.esperaMin, observaciones: f.observaciones || undefined, estado: f.estado });
    }
    n = r.length;
    r.push({ id: 'EJE-0' + (n + 1), fecha: '@-2', pipeline: 'PIP-0003', filasProcesadas: 520000, filasRechazadas: 0, duracionMin: 52, esperaMin: 0, observaciones: 'Carga duplicada por reintento manual.', estado: 'Anulada', motivoAnulacion: 'Duplicada: el programador ya había ejecutado la carga' });
    r.push({ id: 'EJE-0' + (n + 2), fecha: 'hoy', pipeline: 'PIP-0001', filasProcesadas: 42000, filasRechazadas: 0, duracionMin: 38, esperaMin: 0, observaciones: 'Reproceso programado tras corregir el esquema.', estado: 'Programada' });
    r.push({ id: 'EJE-0' + (n + 3), fecha: 'hoy', pipeline: 'PIP-0007', filasProcesadas: 330000, filasRechazadas: 0, duracionMin: 58, esperaMin: 0, observaciones: 'Carga de cierre de mes programada.', estado: 'Programada' });
    return r;
  }

  /* Ticket: [días atrás, cliente, asunto, tipo, prioridad, tablero, horas hasta responder, horas hasta resolver, horas de trabajo, estado] */
  var TICKETS = [
    [176, 'CLI-0003', 'Saldos del tablero no coinciden con el core', 'Error en datos', 'Crítica', 'TAB-0005', 0.5, 3.5, 6, 'Atendido'],
    [168, 'CLI-0002', 'Nueva columna de lote en el inventario', 'Solicitud de cambio', 'Media', 'TAB-0004', 3, 20, 8, 'Atendido'],
    [160, 'CLI-0001', 'Alta de tres usuarios en el tablero de acopio', 'Acceso y permisos', 'Baja', 'TAB-0001', 6, 30, 1.5, 'Atendido'],
    [152, 'CLI-0004', 'El tablero de ventas tarda más de un minuto', 'Tablero lento', 'Alta', 'TAB-0007', 1, 11, 9, 'Atendido'],
    [143, 'CLI-0006', 'Telemetría con datos faltantes de dos camiones', 'Error en datos', 'Alta', 'TAB-0009', 2, 7, 5, 'Atendido'],
    [135, 'CLI-0008', 'Consulta: definición de morosidad a 30 días', 'Consulta', 'Baja', 'TAB-0011', 8, 26, 1, 'Atendido'],
    [128, 'CLI-0003', 'Pagos duplicados en el monitor', 'Error en datos', 'Crítica', 'TAB-0006', 0.5, 5.5, 8, 'Escalado a ingeniería'],
    [120, 'CLI-0005', 'Incorporar notas del ciclo anterior', 'Nueva fuente', 'Media', 'TAB-0008', 4, 60, 22, 'Atendido'],
    [112, 'CLI-0002', 'Tablero de ventas no abre en el celular', 'Tablero lento', 'Media', 'TAB-0003', 5, 18, 4, 'Atendido'],
    [104, 'CLI-0001', 'Cámara 3 sin lecturas desde la madrugada', 'Error en datos', 'Alta', 'TAB-0002', 1.5, 6, 3, 'Atendido'],
    [96, 'CLI-0009', 'Solicitud de filtro por ramo en siniestros', 'Solicitud de cambio', 'Baja', null, 10, 44, 6, 'Atendido'],
    [90, 'CLI-0006', 'Permisos para la nueva jefatura de mantenimiento', 'Acceso y permisos', 'Media', 'TAB-0009', 2, 9, 1, 'Atendido'],
    [84, 'CLI-0004', 'Cifras de abril distintas a las de contabilidad', 'Error en datos', 'Alta', 'TAB-0007', 3, 13, 10, 'Escalado a ingeniería'],
    [77, 'CLI-0003', 'Consulta sobre refresco horario del saldo', 'Consulta', 'Baja', 'TAB-0005', 4, 12, 0.5, 'Atendido'],
    [70, 'CLI-0008', 'Cobranzas: faltan facturas de la última semana', 'Error en datos', 'Crítica', 'TAB-0011', 0.5, 4, 7, 'Atendido'],
    [63, 'CLI-0002', 'Añadir sucursales nuevas al tablero', 'Solicitud de cambio', 'Media', 'TAB-0003', 6, 40, 12, 'Atendido'],
    [56, 'CLI-0011', 'Primer acceso al resumen de historias clínicas', 'Acceso y permisos', 'Media', null, 2, 5, 1, 'Atendido'],
    [49, 'CLI-0001', 'Tablero de acopio sin datos del lunes', 'Error en datos', 'Alta', 'TAB-0001', 1, 7.5, 4, 'Atendido'],
    [42, 'CLI-0006', 'Disponibilidad de flota carga lento', 'Tablero lento', 'Alta', 'TAB-0009', 2, 8, 7, 'Atendido'],
    [35, 'CLI-0002', 'Quiebres de stock con productos retirados', 'Error en datos', 'Media', 'TAB-0004', 3, 16, 5, 'Atendido'],
    [27, 'CLI-0004', 'Consulta: cómo se calcula la rotación', 'Consulta', 'Baja', 'TAB-0007', 5, 20, 0.5, 'Atendido'],
    [19, 'CLI-0003', 'Monitor de pagos con retraso de una hora', 'Tablero lento', 'Crítica', 'TAB-0006', 0.5, 3, 5, 'Atendido'],
    [11, 'CLI-0009', 'Carga de siniestros del mes anterior incompleta', 'Error en datos', 'Alta', 'TAB-0010', 2, 7, 6, 'Atendido'],
    [5, 'CLI-0008', 'Nueva fuente: contratos de arrendamiento', 'Nueva fuente', 'Media', null, 3, 28, 14, 'Atendido'],
    [1, 'CLI-0001', 'Alta de usuario de campo para acopio', 'Acceso y permisos', 'Baja', 'TAB-0001', 1, 6, 0.5, 'Borrador']
  ];

  function armarTickets() {
    var r = [], i, f, n, t;
    for (i = 0; i < TICKETS.length; i++) {
      f = TICKETS[i];
      n = i + 1;
      t = { id: 'TKT-' + (n < 10 ? '000' : '00') + n, fecha: '@-' + f[0], cliente: f[1], asunto: f[2], tipo: f[3], prioridad: f[4], horasRespuesta: f[6], horasResolucion: f[7], horasTrabajo: f[8], estado: f[9] };
      if (f[5]) { t.tablero = f[5]; }
      r.push(t);
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'fabrica-bi',
    nombre: 'DataFactory · Operaciones de datos',
    rubro: 'Fábrica de inteligencia de negocios',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#4b2e83', acento: '#2ec4b6', siglas: 'DF' },

    parametros: [
      { id: 'exitoMeta', etiqueta: 'Meta de tasa de éxito', tipo: 'porcentaje', valor: 98, ayuda: 'Porcentaje de ejecuciones que deben terminar sin advertencias ni fallas.' },
      { id: 'tarifaNodoHora', etiqueta: 'Tarifa de cómputo (S/ por nodo-hora)', tipo: 'moneda', valor: 3.6, ayuda: 'Costo de tener un nodo del clúster de procesamiento encendido una hora.' },
      { id: 'tarifaSoporteHora', etiqueta: 'Costo de la hora de soporte', tipo: 'moneda', valor: 48, ayuda: 'Costo interno de una hora de trabajo del equipo de soporte; valoriza cada ticket.' },
      { id: 'slaCritica', etiqueta: 'SLA de resolución · prioridad crítica (horas)', tipo: 'entero', valor: 4 },
      { id: 'slaAlta', etiqueta: 'SLA de resolución · prioridad alta (horas)', tipo: 'entero', valor: 8 },
      { id: 'slaMedia', etiqueta: 'SLA de resolución · prioridad media (horas)', tipo: 'entero', valor: 24 },
      { id: 'slaBaja', etiqueta: 'SLA de resolución · prioridad baja (horas)', tipo: 'entero', valor: 72 },
      { id: 'calidadMinima', etiqueta: 'Puntaje mínimo de calidad de datos', tipo: 'porcentaje', valor: 85, ayuda: 'Una fuente por debajo de este puntaje se marca como «Bajo el mínimo».' },
      { id: 'pesoCompletitud', etiqueta: 'Peso de la completitud en la calidad', tipo: 'porcentaje', valor: 40 },
      { id: 'pesoUnicidad', etiqueta: 'Peso de la unicidad en la calidad', tipo: 'porcentaje', valor: 30 },
      { id: 'pesoVigencia', etiqueta: 'Peso de la vigencia en la calidad', tipo: 'porcentaje', valor: 30 }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 0,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: false,
      exportaRespetaPermisos: true,
      cspMeta: false
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'lider', nombre: 'Líder de datos', descripcion: 'Ve todo el negocio, incluidas mensualidades y costos de cómputo; edita clientes, fuentes y tableros y puede anular ejecuciones y tickets.' },
      { id: 'ingeniero', nombre: 'Ingeniero de datos', descripcion: 'Diseña fuentes y pipelines y registra las ejecuciones. Ve los servidores de las fuentes; no ve mensualidades ni costos.' },
      { id: 'analista', nombre: 'Analista BI', descripcion: 'Construye los tableros y atiende los tickets de soporte. No ve servidores de las fuentes, ejecuciones de cómputo ni mensualidades.' },
      { id: 'cuenta', nombre: 'Ejecutivo de cuenta', descripcion: 'Administra clientes, abre tickets en su nombre y consulta SLA y tickets. Ve las mensualidades pero no la infraestructura.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Fabiola Rengifo Tapia', rol: 'admin', clave: 'Admin#2026x' },
      { usuario: 'lider', nombre: 'Alonso Meza Cáceres', rol: 'lider', clave: 'Datos#2026xyz' },
      { usuario: 'ingeniero', nombre: 'Brenda Llanos Quispe', rol: 'ingeniero', clave: 'Pipeline#2026x' },
      { usuario: 'analista', nombre: 'Mauricio Soto Benítez', rol: 'analista', clave: 'Tablero#2026x' },
      { usuario: 'cuenta', nombre: 'Daniela Arévalo Rojas', rol: 'cuenta', clave: 'Cartera#2026x' },
      { usuario: 'auditor', nombre: 'Hernán Tapia Cuadros', rol: 'auditor', clave: 'Audita#2026x' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^[0-9]{11}$', mensajePatron: 'El RUC tiene 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'sector', etiqueta: 'Sector', tipo: 'lista', requerido: true, opciones: ['Banca y finanzas', 'Retail', 'Salud', 'Educación', 'Minería', 'Logística', 'Telecomunicaciones', 'Agroindustria', 'Seguros', 'Gobierno'] },
          { id: 'plan', etiqueta: 'Plan contratado', tipo: 'lista', requerido: true, opciones: ['Esencial', 'Profesional', 'Empresarial'], defecto: 'Profesional' },
          { id: 'contacto', etiqueta: 'Contacto principal', tipo: 'texto', max: 60 },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'mensualidad', etiqueta: 'Mensualidad (sin IGV)', tipo: 'moneda', min: 1, requerido: true, ver: ['admin', 'lider', 'cuenta', 'auditor'] },
          { id: 'fechaContrato', etiqueta: 'Inicio del contrato', tipo: 'fecha', max: 'hoy' },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', requerido: true, opciones: ['Activo', 'Suspendido', 'Baja'], defecto: 'Activo' }
        ],
        lista: ['ruc', 'nombre', 'sector', 'plan', 'mensualidad', 'estado'],
        buscar: ['ruc', 'nombre', 'sector', 'contacto'],
        calculados: [
          {
            id: 'costoComputo', etiqueta: 'Cómputo de 30 días', tipo: 'moneda', ver: ['admin', 'lider', 'auditor'],
            formula: function (r, ctx) {
              var mapa = clientePorPipeline(ctx), desde = ctx.fechaMas(ctx.hoy(), -29);
              return ctx.redondear(ctx.suma(ejecutadas(ctx, desde, ctx.hoy()), function (e) { return mapa[e.pipeline] === r.id && e.totales ? e.totales.total : 0; }));
            }
          },
          {
            id: 'pesoComputo', etiqueta: 'Cómputo sobre la mensualidad', tipo: 'porcentaje', ver: ['admin', 'lider', 'auditor'],
            formula: function (r, ctx) {
              var mapa = clientePorPipeline(ctx), desde = ctx.fechaMas(ctx.hoy(), -29), costo;
              if (!r.mensualidad) { return null; }
              costo = ctx.suma(ejecutadas(ctx, desde, ctx.hoy()), function (e) { return mapa[e.pipeline] === r.id && e.totales ? e.totales.total : 0; });
              return ctx.redondear(costo / r.mensualidad * 100);
            }
          }
        ],
        permisos: { ver: ['admin', 'lider', 'ingeniero', 'analista', 'cuenta', 'auditor'], crear: ['admin', 'cuenta'], editar: ['admin', 'lider', 'cuenta'], eliminar: ['admin'] }
      },
      {
        id: 'fuentes', nombre: 'Fuente de datos', plural: 'Fuentes de datos', prefijo: 'FUE',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre de la fuente', tipo: 'texto', requerido: true, max: 80 },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'tipo', etiqueta: 'Tipo de fuente', tipo: 'lista', requerido: true, opciones: ['Base de datos relacional', 'API REST', 'Archivo plano (CSV)', 'Hoja de cálculo', 'ERP', 'Streaming de eventos'] },
          { id: 'sistema', etiqueta: 'Sistema de origen', tipo: 'texto', max: 60 },
          { id: 'frecuencia', etiqueta: 'Frecuencia de carga', tipo: 'lista', requerido: true, opciones: ['Tiempo real', 'Cada hora', 'Diaria', 'Semanal', 'Mensual'], defecto: 'Diaria' },
          { id: 'endpoint', etiqueta: 'Servidor o endpoint', tipo: 'texto', max: 100, ver: ['admin', 'lider', 'ingeniero', 'auditor'], ayuda: 'Dirección interna de conexión. Es información de infraestructura: no la ven analistas ni cuentas.' },
          { id: 'registros', etiqueta: 'Registros auditados', tipo: 'entero', min: 1, requerido: true },
          { id: 'registrosIncompletos', etiqueta: 'Registros con campos obligatorios vacíos', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'registrosDuplicados', etiqueta: 'Registros duplicados', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'ultimaActualizacion', etiqueta: 'Última actualización de datos', tipo: 'fecha', requerido: true, max: 'hoy' },
          { id: 'fechaAlta', etiqueta: 'Incorporada el', tipo: 'fecha', requerido: true, max: 'hoy' }
        ],
        lista: ['nombre', 'cliente', 'tipo', 'frecuencia', 'puntaje', 'calidad'],
        buscar: ['nombre', 'tipo', 'sistema'],
        calculados: [
          { id: 'completitud', etiqueta: 'Completitud', tipo: 'porcentaje', formula: function (r, ctx) { return calidadFuente(r, ctx).completitud; } },
          { id: 'unicidad', etiqueta: 'Unicidad', tipo: 'porcentaje', formula: function (r, ctx) { return calidadFuente(r, ctx).unicidad; } },
          { id: 'vigencia', etiqueta: 'Vigencia', tipo: 'porcentaje', formula: function (r, ctx) { return calidadFuente(r, ctx).vigencia; } },
          { id: 'puntaje', etiqueta: 'Puntaje de calidad', tipo: 'porcentaje', formula: function (r, ctx) { return calidadFuente(r, ctx).puntaje; } },
          { id: 'calidad', etiqueta: 'Calidad', tipo: 'texto', formula: function (r, ctx) { return calidadFuente(r, ctx).puntaje >= ctx.param('calidadMinima') ? 'Cumple' : 'Bajo el mínimo'; } }
        ],
        reglas: [
          { id: 'incompletos-validos', mensaje: 'Los registros incompletos no pueden superar a los registros auditados.', validar: function (r) { return !(r.registrosIncompletos > r.registros); } },
          { id: 'duplicados-validos', mensaje: 'Los registros duplicados no pueden superar a los registros auditados.', validar: function (r) { return !(r.registrosDuplicados > r.registros); } },
          { id: 'actualizacion-posterior', mensaje: 'La última actualización no puede ser anterior a la fecha en que se incorporó la fuente.', validar: function (r) { return !(r.ultimaActualizacion && r.fechaAlta && r.ultimaActualizacion < r.fechaAlta); } }
        ],
        permisos: { ver: ['admin', 'lider', 'ingeniero', 'analista', 'cuenta', 'auditor'], crear: ['admin', 'ingeniero'], editar: ['admin', 'lider', 'ingeniero'], eliminar: ['admin'] }
      },
      {
        id: 'pipelines', nombre: 'Pipeline', plural: 'Pipelines ETL', prefijo: 'PIP',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del pipeline', tipo: 'texto', requerido: true, max: 80 },
          { id: 'fuente', etiqueta: 'Fuente de datos', tipo: 'ref', entidad: 'fuentes', mostrar: 'nombre', requerido: true },
          { id: 'destino', etiqueta: 'Destino', tipo: 'lista', requerido: true, opciones: ['Data warehouse (PostgreSQL)', 'Data lake (S3)', 'BigQuery', 'Snowflake', 'Azure Synapse'] },
          { id: 'horaInicio', etiqueta: 'Hora de inicio (0–23)', tipo: 'entero', min: 0, max: 23, requerido: true, defecto: 2 },
          { id: 'nodos', etiqueta: 'Nodos de cómputo', tipo: 'entero', min: 1, max: 16, requerido: true, defecto: 2, ayuda: 'Cantidad de nodos que se encienden en cada ejecución; multiplica el costo.' },
          { id: 'slaHoras', etiqueta: 'SLA de entrega (horas)', tipo: 'entero', min: 1, max: 24, requerido: true, defecto: 4, ayuda: 'Tiempo máximo entre la hora de inicio y la entrega de los datos listos para el tablero.' },
          { id: 'responsable', etiqueta: 'Ingeniero responsable', tipo: 'texto', max: 60 },
          { id: 'activo', etiqueta: 'Pipeline activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'cliente', 'destino', 'slaHoras', 'tasaExito', 'activo'],
        buscar: ['codigo', 'nombre', 'destino', 'responsable'],
        calculados: [
          {
            id: 'cliente', etiqueta: 'Cliente', tipo: 'texto',
            formula: function (r, ctx) { var f = ctx.datos.obtener('fuentes', r.fuente); return f ? nombreCliente(ctx, f.cliente) : ''; }
          },
          {
            id: 'tasaExito', etiqueta: 'Tasa de éxito', tipo: 'porcentaje',
            formula: function (r, ctx) {
              var es = ctx.datos.listar('ejecuciones', function (e) { return e.pipeline === r.id && (e.estado === 'Exitosa' || e.estado === 'Con advertencias' || e.estado === 'Fallida'); }), ok = 0, i;
              for (i = 0; i < es.length; i++) { if (es[i].estado === 'Exitosa') { ok += 1; } }
              return es.length ? ctx.redondear(ok / es.length * 100) : null;
            }
          }
        ],
        reglas: [
          { id: 'ventana-del-dia', mensaje: 'La ventana de entrega no puede cruzar la medianoche: hora de inicio + SLA debe ser como máximo 24.', validar: function (r) { return !(r.horaInicio + r.slaHoras > 24); } }
        ],
        permisos: { ver: ['admin', 'lider', 'ingeniero', 'analista', 'auditor'], crear: ['admin', 'ingeniero'], editar: ['admin', 'ingeniero'], eliminar: ['admin'] }
      },
      {
        id: 'tableros', nombre: 'Tablero', plural: 'Tableros entregados', prefijo: 'TAB',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre del tablero', tipo: 'texto', requerido: true, max: 80 },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'pipeline', etiqueta: 'Pipeline que lo alimenta', tipo: 'ref', entidad: 'pipelines', mostrar: 'nombre', requerido: true },
          { id: 'herramienta', etiqueta: 'Herramienta', tipo: 'lista', requerido: true, opciones: ['Power BI', 'Tableau', 'Looker Studio', 'Metabase', 'Superset'] },
          { id: 'usuarios', etiqueta: 'Usuarios con acceso', tipo: 'entero', min: 1, requerido: true },
          { id: 'fechaEntrega', etiqueta: 'Fecha de entrega', tipo: 'fecha', requerido: true, max: 'hoy' },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', requerido: true, opciones: ['En desarrollo', 'En revisión', 'En producción', 'Retirado'], defecto: 'En desarrollo' }
        ],
        lista: ['nombre', 'cliente', 'herramienta', 'usuarios', 'estado', 'diasEnProduccion'],
        buscar: ['nombre', 'herramienta', 'estado'],
        calculados: [
          {
            id: 'diasEnProduccion', etiqueta: 'Días en producción', tipo: 'entero',
            formula: function (r, ctx) { return r.estado === 'En producción' && r.fechaEntrega ? Math.max(0, ctx.diasEntre(r.fechaEntrega, ctx.hoy())) : null; }
          },
          {
            id: 'ticketsAbiertos', etiqueta: 'Tickets de soporte', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('tickets', function (t) { return t.tablero === r.id && t.estado !== 'Anulado' && t.estado !== 'Borrador'; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'lider', 'ingeniero', 'analista', 'cuenta', 'auditor'], crear: ['admin', 'analista'], editar: ['admin', 'lider', 'analista'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'ejecuciones', nombre: 'Ejecución', plural: 'Ejecuciones de pipelines', prefijo: 'EJE', serie: 'EJ01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'pipeline', etiqueta: 'Pipeline', tipo: 'ref', entidad: 'pipelines', mostrar: 'nombre', requerido: true },
          { id: 'filasProcesadas', etiqueta: 'Filas procesadas', tipo: 'entero', min: 0, requerido: true },
          { id: 'filasRechazadas', etiqueta: 'Filas rechazadas', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'duracionMin', etiqueta: 'Duración (minutos)', tipo: 'entero', min: 1, requerido: true },
          { id: 'esperaMin', etiqueta: 'Espera en cola (minutos)', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'Tiempo entre la hora programada y el arranque real; cuenta para el SLA de entrega.' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'pipeline', 'duracionMin'],
        estados: ['Programada', 'Exitosa', 'Con advertencias', 'Fallida', 'Anulada'],
        calcular: function (doc, ctx) {
          var p = doc.pipeline ? ctx.datos.obtener('pipelines', doc.pipeline) : null, proc = doc.filasProcesadas || 0;
          var entrega = (doc.esperaMin || 0) + (doc.duracionMin || 0), sla = p ? p.slaHoras * 60 : 0;
          return {
            total: ctx.redondear(costoComputo(doc.duracionMin, p ? p.nodos : 0, ctx.param('tarifaNodoHora'))),
            entregaMin: entrega, slaMin: sla, holguraMin: sla - entrega,
            tasaRechazo: proc > 0 ? ctx.redondear((doc.filasRechazadas || 0) / proc * 100) : 0
          };
        },
        totales: [
          { id: 'total', etiqueta: 'Costo de cómputo', fuerte: true },
          { id: 'entregaMin', etiqueta: 'Tiempo de entrega (min)', tipo: 'entero' },
          { id: 'slaMin', etiqueta: 'SLA del pipeline (min)', tipo: 'entero' },
          { id: 'tasaRechazo', etiqueta: 'Filas rechazadas', tipo: 'porcentaje' }
        ],
        reglas: [
          { id: 'rechazos-validos', mensaje: 'Las filas rechazadas no pueden superar a las procesadas.', validar: function (d) { return !(d.filasRechazadas > d.filasProcesadas); } },
          {
            id: 'pipeline-activo', mensaje: 'No se registran ejecuciones de un pipeline inactivo.',
            validar: function (d, ctx) { var p = d.pipeline ? ctx.datos.obtener('pipelines', d.pipeline) : null; return !p || p.activo !== false; }
          }
        ],
        alEmitir: function (doc, ctx) {
          var p = ctx.datos.obtener('pipelines', doc.pipeline), f = p ? ctx.datos.obtener('fuentes', p.fuente) : null;
          /* La carga terminó: los datos de la fuente quedan al día hasta la fecha de la ejecución. */
          if (f && (!f.ultimaActualizacion || f.ultimaActualizacion < doc.fecha)) { ctx.datos.actualizar('fuentes', f.id, { ultimaActualizacion: doc.fecha }); }
        },
        alAnular: function (doc, ctx) {
          var p = ctx.datos.obtener('pipelines', doc.pipeline), f = p ? ctx.datos.obtener('fuentes', p.fuente) : null, ids = {}, otras, ultima = null, i;
          if (!f || f.ultimaActualizacion !== doc.fecha) { return; }
          otras = ctx.datos.listar('pipelines', function (x) { return x.fuente === f.id; });
          for (i = 0; i < otras.length; i++) { ids[otras[i].id] = true; }
          otras = ctx.datos.listar('ejecuciones', function (e) { return e.id !== doc.id && ids[e.pipeline] === true && (e.estado === 'Exitosa' || e.estado === 'Con advertencias'); });
          for (i = 0; i < otras.length; i++) { if (!ultima || otras[i].fecha > ultima) { ultima = otras[i].fecha; } }
          if (ultima && ultima < doc.fecha) { ctx.datos.actualizar('fuentes', f.id, { ultimaActualizacion: ultima }); }
        },
        permisos: { ver: ['admin', 'lider', 'ingeniero', 'analista', 'cuenta', 'auditor'], crear: ['admin', 'ingeniero'], editar: ['admin', 'ingeniero'], emitir: ['admin', 'ingeniero'], anular: ['admin', 'lider'] }
      },
      {
        id: 'tickets', nombre: 'Ticket', plural: 'Tickets de soporte', prefijo: 'TKT', serie: 'TK01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de apertura', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'asunto', etiqueta: 'Asunto', tipo: 'texto', requerido: true, max: 100 },
          { id: 'tipo', etiqueta: 'Tipo de solicitud', tipo: 'lista', requerido: true, opciones: ['Consulta', 'Error en datos', 'Tablero lento', 'Solicitud de cambio', 'Acceso y permisos', 'Nueva fuente'], defecto: 'Consulta' },
          { id: 'prioridad', etiqueta: 'Prioridad', tipo: 'lista', requerido: true, opciones: ['Crítica', 'Alta', 'Media', 'Baja'], defecto: 'Media' },
          { id: 'tablero', etiqueta: 'Tablero afectado', tipo: 'ref', entidad: 'tableros', mostrar: 'nombre' },
          { id: 'horasRespuesta', etiqueta: 'Horas hasta la primera respuesta', tipo: 'numero', min: 0, requerido: true },
          { id: 'horasResolucion', etiqueta: 'Horas hasta la resolución', tipo: 'numero', min: 0, requerido: true, ayuda: 'Tiempo transcurrido desde la apertura hasta resolver; es lo que se compara con el SLA.' },
          { id: 'horasTrabajo', etiqueta: 'Horas de trabajo del equipo', tipo: 'numero', min: 0, requerido: true, ayuda: 'Esfuerzo efectivo; valoriza el ticket con el costo de la hora de soporte.' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'cliente', 'asunto', 'prioridad'],
        estados: ['Borrador', 'Atendido', 'Escalado a ingeniería', 'Anulado'],
        calcular: function (doc, ctx) {
          var sla = slaTicketHoras(doc.prioridad, ctx), res = doc.horasResolucion || 0;
          return {
            total: ctx.redondear((doc.horasTrabajo || 0) * ctx.param('tarifaSoporteHora')),
            slaHoras: sla, holguraHoras: ctx.redondear(sla - res), cumple: res <= sla ? 1 : 0
          };
        },
        totales: [
          { id: 'total', etiqueta: 'Costo de atención', fuerte: true },
          { id: 'slaHoras', etiqueta: 'SLA de resolución (h)', tipo: 'numero' },
          { id: 'holguraHoras', etiqueta: 'Holgura frente al SLA (h)', tipo: 'numero' }
        ],
        reglas: [
          { id: 'respuesta-antes', mensaje: 'La primera respuesta no puede ser posterior a la resolución.', validar: function (d) { return !(d.horasRespuesta > d.horasResolucion); } }
        ],
        alEmitir: function (doc, ctx) {
          var t = doc.tablero ? ctx.datos.obtener('tableros', doc.tablero) : null;
          if (t && doc.tipo === 'Error en datos' && t.estado === 'En producción') { ctx.datos.actualizar('tableros', t.id, { estado: 'En revisión' }); }
        },
        alAnular: function (doc, ctx) {
          var t = doc.tablero ? ctx.datos.obtener('tableros', doc.tablero) : null, otros;
          if (!t || t.estado !== 'En revisión') { return; }
          otros = ctx.datos.listar('tickets', function (x) { return x.id !== doc.id && x.tablero === t.id && x.tipo === 'Error en datos' && (x.estado === 'Atendido' || x.estado === 'Escalado a ingeniería'); });
          if (!otros.length) { ctx.datos.actualizar('tableros', t.id, { estado: 'En producción' }); }
        },
        permisos: { ver: ['admin', 'lider', 'ingeniero', 'analista', 'cuenta', 'auditor'], crear: ['admin', 'analista', 'cuenta'], editar: ['admin', 'analista', 'cuenta'], emitir: ['admin', 'analista'], anular: ['admin', 'lider'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ejecuciones-pipeline', titulo: 'Ejecuciones por pipeline',
        descripcion: 'Cuántas veces corrió cada pipeline en el periodo, cómo terminó, cuántas filas movió y cuánto tardó. La tasa de éxito cuenta solo las ejecuciones sin advertencias ni fallas.',
        roles: ['admin', 'lider', 'ingeniero', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var es = ejecutadas(ctx, p.desde, p.hasta), pipes = ctx.datos.listar('pipelines'), filas = [], etiquetas = [], valores = [], i, g, ok, adv, fal, filasMov, totEj = 0, totOk = 0, totFilas = 0, mios;
          for (i = 0; i < pipes.length; i++) {
            mios = es.filter(function (e) { return e.pipeline === pipes[i].id; });
            if (!mios.length) { continue; }
            ok = mios.filter(function (e) { return e.estado === 'Exitosa'; }).length;
            adv = mios.filter(function (e) { return e.estado === 'Con advertencias'; }).length;
            fal = mios.filter(function (e) { return e.estado === 'Fallida'; }).length;
            filasMov = ctx.suma(mios, function (e) { return e.filasProcesadas; });
            g = ctx.suma(mios, function (e) { return e.duracionMin; }) / mios.length;
            filas.push([pipes[i].nombre, mios.length, ok, adv, fal, ctx.redondear(ok / mios.length * 100), filasMov, ctx.redondear(g)]);
            totEj += mios.length;
            totOk += ok;
            totFilas += filasMov;
          }
          filas.sort(function (a, b) { return a[5] - b[5]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][5]); }
          return {
            columnas: ['Pipeline', 'Ejecuciones', 'Exitosas', 'Con advertencias', 'Fallidas', 'Tasa de éxito %', 'Filas procesadas', 'Duración promedio (min)'],
            tipos: ['texto', 'entero', 'entero', 'entero', 'entero', 'porcentaje', 'entero', 'numero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Ejecuciones', valor: totEj, tipo: 'entero' },
              { etiqueta: 'Tasa de éxito global', valor: totEj ? ctx.redondear(totOk / totEj * 100) : null, tipo: 'porcentaje' },
              { etiqueta: 'Meta de éxito', valor: ctx.param('exitoMeta'), tipo: 'porcentaje' },
              { etiqueta: 'Filas procesadas', valor: totFilas, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'sla-cliente', titulo: 'SLA por cliente',
        descripcion: 'Cumplimiento del SLA de entrega de datos (la ejecución no falló y espera + duración no pasó el SLA del pipeline) y del SLA de resolución de tickets, por cliente.',
        roles: ['admin', 'lider', 'cuenta', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var es = ejecutadas(ctx, p.desde, p.hasta), ts = ticketsAtendidos(ctx, p.desde, p.hasta), mapa = clientePorPipeline(ctx), clientes = ctx.datos.listar('clientes'), filas = [], etiquetas = [], valores = [], i, ee, tt, aTiempo, enSla, totE = 0, totA = 0, totT = 0, totS = 0;
          for (i = 0; i < clientes.length; i++) {
            ee = es.filter(function (e) { return mapa[e.pipeline] === clientes[i].id; });
            tt = ts.filter(function (t) { return t.cliente === clientes[i].id; });
            if (!ee.length && !tt.length) { continue; }
            aTiempo = ee.filter(entregoATiempo).length;
            enSla = tt.filter(function (t) { return ticketEnSla(t, ctx); }).length;
            filas.push([clientes[i].nombre, ee.length, aTiempo, ee.length ? ctx.redondear(aTiempo / ee.length * 100) : null, tt.length, enSla, tt.length ? ctx.redondear(enSla / tt.length * 100) : null]);
            totE += ee.length;
            totA += aTiempo;
            totT += tt.length;
            totS += enSla;
          }
          filas.sort(function (a, b) { return (a[3] === null ? 101 : a[3]) - (b[3] === null ? 101 : b[3]); });
          for (i = 0; i < filas.length; i++) { if (filas[i][3] !== null) { etiquetas.push(filas[i][0]); valores.push(filas[i][3]); } }
          return {
            columnas: ['Cliente', 'Entregas', 'A tiempo', 'SLA de entrega %', 'Tickets', 'Dentro del SLA', 'SLA de soporte %'],
            tipos: ['texto', 'entero', 'entero', 'porcentaje', 'entero', 'entero', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'SLA de entrega', valor: totE ? ctx.redondear(totA / totE * 100) : null, tipo: 'porcentaje' },
              { etiqueta: 'SLA de soporte', valor: totT ? ctx.redondear(totS / totT * 100) : null, tipo: 'porcentaje' },
              { etiqueta: 'Entregas fuera de plazo o fallidas', valor: totE - totA, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'costo-computo', titulo: 'Costo de cómputo por mes',
        descripcion: 'Costo de las ejecuciones terminadas, agrupado por mes: nodos-hora consumidos, costo total y costo medio por ejecución.',
        roles: ['admin', 'lider', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var es = ejecutadas(ctx, p.desde, p.hasta), pipes = {}, ps = ctx.datos.listar('pipelines'), i, grupos, claves = [], k, filas = [], etiquetas = [], valores = [], g, nh, costo, total = 0, nEj = 0, totNh = 0;
          for (i = 0; i < ps.length; i++) { pipes[ps[i].id] = ps[i]; }
          grupos = ctx.agrupar(es, function (e) { return ctx.mes(e.fecha); });
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          for (k = 0; k < claves.length; k++) {
            g = grupos[claves[k]];
            nh = ctx.suma(g, function (e) { return (e.duracionMin / 60) * (pipes[e.pipeline] ? pipes[e.pipeline].nodos : 0); });
            costo = ctx.redondear(ctx.suma(g, function (e) { return e.totales ? e.totales.total : 0; }));
            filas.push([nombreMes(claves[k]), g.length, ctx.redondear(nh), costo, ctx.redondear(costo / g.length)]);
            etiquetas.push(nombreMes(claves[k]));
            valores.push(costo);
            total += costo;
            nEj += g.length;
            totNh += nh;
          }
          return {
            columnas: ['Mes', 'Ejecuciones', 'Nodos-hora', 'Costo de cómputo', 'Costo por ejecución'],
            tipos: ['texto', 'entero', 'numero', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Costo total del periodo', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Nodos-hora consumidos', valor: ctx.redondear(totNh), tipo: 'numero' },
              { etiqueta: 'Costo medio por ejecución', valor: nEj ? ctx.redondear(total / nEj) : null, tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'calidad-fuentes', titulo: 'Calidad de datos por fuente',
        descripcion: 'Completitud, unicidad y vigencia de cada fuente, el puntaje ponderado según los pesos del negocio y el servidor de origen para ubicarla.',
        parametros: [
          { id: 'desde', etiqueta: 'Incorporadas desde', tipo: 'fecha', requerido: true, defecto: '@-400' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'filtro', etiqueta: 'Mostrar', tipo: 'lista', opciones: ['Todas las fuentes', 'Solo bajo el mínimo'], defecto: 'Todas las fuentes' }
        ],
        ejecutar: function (p, ctx) {
          var fs = ctx.datos.listar('fuentes', function (f) { return f.fechaAlta >= p.desde && f.fechaAlta <= p.hasta; }), filas = [], etiquetas = [], valores = [], i, q, bajo = 0, suma = 0, n = 0;
          for (i = 0; i < fs.length; i++) {
            q = calidadFuente(fs[i], ctx);
            if (q.puntaje < ctx.param('calidadMinima')) { bajo += 1; }
            if (p.filtro === 'Solo bajo el mínimo' && q.puntaje >= ctx.param('calidadMinima')) { continue; }
            filas.push([fs[i].nombre, nombreCliente(ctx, fs[i].cliente), fs[i].endpoint || '', q.completitud, q.unicidad, q.vigencia, q.puntaje, q.puntaje >= ctx.param('calidadMinima') ? 'Cumple' : 'Bajo el mínimo']);
            suma += q.puntaje;
            n += 1;
          }
          filas.sort(function (a, b) { return a[6] - b[6]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][6]); }
          return {
            columnas: ['Fuente', 'Cliente', 'Servidor o endpoint', 'Completitud %', 'Unicidad %', 'Vigencia %', 'Puntaje', 'Situación'],
            tipos: ['texto', 'texto', 'texto', 'porcentaje', 'porcentaje', 'porcentaje', 'porcentaje', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Puntaje promedio', valor: n ? ctx.redondear(suma / n) : null, tipo: 'porcentaje' },
              { etiqueta: 'Fuentes bajo el mínimo', valor: bajo, tipo: 'entero' },
              { etiqueta: 'Mínimo exigido', valor: ctx.param('calidadMinima'), tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'tickets-prioridad', titulo: 'Tickets por prioridad',
        descripcion: 'Tickets atendidos en el periodo por prioridad: cuántos cumplieron el SLA de resolución, tiempos promedio y costo del esfuerzo del equipo.',
        roles: ['admin', 'lider', 'analista', 'cuenta', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ts = ticketsAtendidos(ctx, p.desde, p.hasta), prios = ['Crítica', 'Alta', 'Media', 'Baja'], filas = [], etiquetas = [], valores = [], i, g, enSla, tot = 0, totSla = 0, costo = 0;
          for (i = 0; i < prios.length; i++) {
            g = ts.filter(function (t) { return t.prioridad === prios[i]; });
            if (!g.length) { continue; }
            enSla = g.filter(function (t) { return ticketEnSla(t, ctx); }).length;
            filas.push([prios[i], g.length, enSla, ctx.redondear(enSla / g.length * 100), slaTicketHoras(prios[i], ctx), ctx.redondear(ctx.suma(g, function (t) { return t.horasResolucion; }) / g.length), ctx.redondear(ctx.suma(g, function (t) { return t.horasTrabajo; })), ctx.redondear(ctx.suma(g, function (t) { return t.totales ? t.totales.total : 0; }))]);
            etiquetas.push(prios[i]);
            valores.push(g.length);
            tot += g.length;
            totSla += enSla;
            costo += ctx.suma(g, function (t) { return t.totales ? t.totales.total : 0; });
          }
          return {
            columnas: ['Prioridad', 'Tickets', 'Dentro del SLA', 'Cumplimiento %', 'SLA (h)', 'Resolución promedio (h)', 'Horas de trabajo', 'Costo de atención'],
            tipos: ['texto', 'entero', 'entero', 'porcentaje', 'entero', 'numero', 'numero', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Tickets atendidos', valor: tot, tipo: 'entero' },
              { etiqueta: 'Cumplimiento del SLA', valor: tot ? ctx.redondear(totSla / tot * 100) : null, tipo: 'porcentaje' },
              { etiqueta: 'Costo de atención', valor: ctx.redondear(costo), tipo: 'moneda' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Ejecuciones (30 días)', tipo: 'entero',
        calcular: function (ctx) { return ejecutadas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()).length; }
      },
      {
        titulo: 'Tasa de éxito (30 días)', tipo: 'porcentaje',
        calcular: function (ctx) {
          var es = ejecutadas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), ok = es.filter(function (e) { return e.estado === 'Exitosa'; }).length;
          return es.length ? ctx.redondear(ok / es.length * 100) : null;
        }
      },
      {
        titulo: 'Entregas dentro del SLA (30 días)', tipo: 'porcentaje',
        calcular: function (ctx) {
          var es = ejecutadas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy());
          return es.length ? ctx.redondear(es.filter(entregoATiempo).length / es.length * 100) : null;
        }
      },
      {
        titulo: 'Costo de cómputo (30 días)', tipo: 'moneda', roles: ['admin', 'lider', 'auditor'],
        calcular: function (ctx) { return ctx.redondear(ctx.suma(ejecutadas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (e) { return e.totales ? e.totales.total : 0; })); }
      },
      {
        titulo: 'Fuentes bajo el mínimo de calidad', tipo: 'entero',
        calcular: function (ctx) {
          return ctx.datos.listar('fuentes').filter(function (f) { return calidadFuente(f, ctx).puntaje < ctx.param('calidadMinima'); }).length;
        }
      },
      {
        titulo: 'Tickets fuera de SLA (30 días)', tipo: 'entero',
        calcular: function (ctx) {
          return ticketsAtendidos(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()).filter(function (t) { return !ticketEnSla(t, ctx); }).length;
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Ejecuciones de pipelines por mes', tipo: 'columnas', formato: 'entero',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), es = ejecutadas(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(es, function (e) { return ctx.mes(e.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push((g[meses[i]] || []).length);
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      clientes: [
        { id: 'CLI-0001', ruc: '20511234561', nombre: 'Agroexportadora Valle Dorado S.A.C.', sector: 'Agroindustria', plan: 'Profesional', contacto: 'Sonia Ramos Gil', email: 'comex@valledorado.example.pe', telefono: '074 270 330', mensualidad: 6500, fechaContrato: '2025-11-03', estado: 'Activo' },
        { id: 'CLI-0002', ruc: '20522345672', nombre: 'Cadena de Farmacias Salud Sur S.A.', sector: 'Salud', plan: 'Empresarial', contacto: 'Marcos Valdez Pinto', email: 'datos@saludsur.example.pe', telefono: '054 255 880', mensualidad: 14000, fechaContrato: '2025-09-15', estado: 'Activo' },
        { id: 'CLI-0003', ruc: '20533456783', nombre: 'Banco Comercial del Altiplano S.A.', sector: 'Banca y finanzas', plan: 'Empresarial', contacto: 'Teresa Cornejo Lazo', email: 'bi@bancoaltiplano.example.pe', telefono: '051 351 200', mensualidad: 18500, fechaContrato: '2025-08-01', estado: 'Activo' },
        { id: 'CLI-0004', ruc: '20544567894', nombre: 'Retail Mercado Central S.A.C.', sector: 'Retail', plan: 'Profesional', contacto: 'Álvaro Sánchez Rey', email: 'analitica@mercadocentral.example.pe', telefono: '01 612 7700', mensualidad: 7800, fechaContrato: '2026-01-12', estado: 'Activo' },
        { id: 'CLI-0005', ruc: '20555678905', nombre: 'Universidad Nacional Tecnológica del Sur', sector: 'Educación', plan: 'Profesional', contacto: 'Ing. Pilar Quispe Anco', email: 'oti@untsur.example.pe', telefono: '054 288 540', mensualidad: 5200, fechaContrato: '2026-02-20', estado: 'Activo' },
        { id: 'CLI-0006', ruc: '20566789016', nombre: 'Minera Rumi Cóndor S.A.', sector: 'Minería', plan: 'Empresarial', contacto: 'Gustavo Delgado Paz', email: 'planeamiento@rumicondor.example.pe', telefono: '054 224 910', mensualidad: 16200, fechaContrato: '2025-07-07', estado: 'Activo' },
        { id: 'CLI-0007', ruc: '20577890127', nombre: 'Logística Nazca Express S.A.C.', sector: 'Logística', plan: 'Esencial', contacto: 'Rocío Huamaní Soto', email: 'sistemas@nazcaexpress.example.pe', telefono: '056 523 410', mensualidad: 3400, fechaContrato: '2026-03-09', estado: 'Activo' },
        { id: 'CLI-0008', ruc: '20588901238', nombre: 'Telecom Andina Móvil S.A.', sector: 'Telecomunicaciones', plan: 'Empresarial', contacto: 'Víctor Escobar Díaz', email: 'finanzas.bi@andinamovil.example.pe', telefono: '01 710 9000', mensualidad: 15000, fechaContrato: '2025-10-06', estado: 'Activo' },
        { id: 'CLI-0009', ruc: '20599012349', nombre: 'Seguros Pacífico Norte S.A.', sector: 'Seguros', plan: 'Profesional', contacto: 'Lucía Benavides Cruz', email: 'actuarial@pacificonorte.example.pe', telefono: '044 261 330', mensualidad: 8900, fechaContrato: '2026-04-13', estado: 'Activo' },
        { id: 'CLI-0010', ruc: '20600123450', nombre: 'Municipalidad Metropolitana de Valle Claro', sector: 'Gobierno', plan: 'Esencial', contacto: 'CPC Julio Mamani Ccori', email: 'rentas@vallecclaro.example.pe', telefono: '084 233 760', mensualidad: 3900, fechaContrato: '2026-01-26', estado: 'Activo' },
        { id: 'CLI-0011', ruc: '20611234561', nombre: 'Clínica Internacional San Gabriel', sector: 'Salud', plan: 'Profesional', contacto: 'Dra. Alicia Fuentes Rojas', email: 'gestion@sangabriel.example.pe', telefono: '01 440 2200', mensualidad: 7200, fechaContrato: '2026-05-18', estado: 'Activo' },
        { id: 'CLI-0012', ruc: '20622345672', nombre: 'Distribuidora Andes Foods S.A.C.', sector: 'Retail', plan: 'Esencial', contacto: 'Hugo Paredes Villa', email: 'ventas@andesfoods.example.pe', telefono: '054 243 620', mensualidad: 3100, fechaContrato: '2026-06-01', estado: 'Activo' },
        { id: 'CLI-0013', ruc: '20633456783', nombre: 'Cooperativa Agraria Tunari', sector: 'Agroindustria', plan: 'Esencial', contacto: 'Ernesto Colque Mayta', email: 'gerencia@tunari.example.pe', telefono: '051 365 140', mensualidad: 2800, fechaContrato: '2025-12-10', estado: 'Suspendido' }
      ],
      fuentes: [
        { id: 'FUE-0001', nombre: 'ERP de acopio y producción', cliente: 'CLI-0001', tipo: 'ERP', sistema: 'SAP Business One 10', frecuencia: 'Diaria', endpoint: 'sap-acopio.valledorado.example.pe:30015', registros: 1250000, registrosIncompletos: 18750, registrosDuplicados: 6250, ultimaActualizacion: '@-1', fechaAlta: '@-170' },
        { id: 'FUE-0002', nombre: 'Sensores de cámaras de frío', cliente: 'CLI-0001', tipo: 'Streaming de eventos', sistema: 'Broker MQTT', frecuencia: 'Tiempo real', endpoint: 'mqtt.valledorado.example.pe:8883', registros: 8400000, registrosIncompletos: 42000, registrosDuplicados: 8400, ultimaActualizacion: 'hoy', fechaAlta: '@-150' },
        { id: 'FUE-0003', nombre: 'Ventas de botica (punto de venta)', cliente: 'CLI-0002', tipo: 'Base de datos relacional', sistema: 'PostgreSQL 14', frecuencia: 'Cada hora', endpoint: 'pg-pos.saludsur.example.pe:5432', registros: 5600000, registrosIncompletos: 56000, registrosDuplicados: 11200, ultimaActualizacion: 'hoy', fechaAlta: '@-185' },
        { id: 'FUE-0004', nombre: 'Inventario de almacenes', cliente: 'CLI-0002', tipo: 'Base de datos relacional', sistema: 'SQL Server 2019', frecuencia: 'Diaria', endpoint: 'sql-alm.saludsur.example.pe:1433', registros: 940000, registrosIncompletos: 28200, registrosDuplicados: 9400, ultimaActualizacion: '@-3', fechaAlta: '@-160' },
        { id: 'FUE-0005', nombre: 'Core bancario · cuentas', cliente: 'CLI-0003', tipo: 'Base de datos relacional', sistema: 'Oracle 19c', frecuencia: 'Diaria', endpoint: 'ora-core.bancoaltiplano.example.pe:1521', registros: 3200000, registrosIncompletos: 16000, registrosDuplicados: 3200, ultimaActualizacion: '@-1', fechaAlta: '@-180' },
        { id: 'FUE-0006', nombre: 'Pagos con tarjeta', cliente: 'CLI-0003', tipo: 'API REST', sistema: 'API del procesador de pagos', frecuencia: 'Cada hora', endpoint: 'https://api.procpagos.example.pe/v2/transacciones', registros: 12500000, registrosIncompletos: 25000, registrosDuplicados: 62500, ultimaActualizacion: 'hoy', fechaAlta: '@-140' },
        { id: 'FUE-0007', nombre: 'Ventas por tienda', cliente: 'CLI-0004', tipo: 'Base de datos relacional', sistema: 'MySQL 8', frecuencia: 'Diaria', endpoint: 'mysql-ventas.mercadocentral.example.pe:3306', registros: 4100000, registrosIncompletos: 82000, registrosDuplicados: 20500, ultimaActualizacion: '@-1', fechaAlta: '@-120' },
        { id: 'FUE-0008', nombre: 'Catálogo de productos', cliente: 'CLI-0004', tipo: 'Hoja de cálculo', sistema: 'Hoja compartida en línea', frecuencia: 'Semanal', endpoint: 'https://hojas.example.pe/catalogo-mercadocentral', registros: 18500, registrosIncompletos: 1850, registrosDuplicados: 925, ultimaActualizacion: '@-12', fechaAlta: '@-120' },
        { id: 'FUE-0009', nombre: 'Sistema académico', cliente: 'CLI-0005', tipo: 'Base de datos relacional', sistema: 'PostgreSQL 13', frecuencia: 'Diaria', endpoint: 'pg-acad.untsur.example.pe:5432', registros: 760000, registrosIncompletos: 38000, registrosDuplicados: 3800, ultimaActualizacion: '@-2', fechaAlta: '@-100' },
        { id: 'FUE-0010', nombre: 'Mantenimiento de flota', cliente: 'CLI-0006', tipo: 'ERP', sistema: 'SAP S/4HANA', frecuencia: 'Diaria', endpoint: 'sap-flota.rumicondor.example.pe:30041', registros: 1900000, registrosIncompletos: 38000, registrosDuplicados: 9500, ultimaActualizacion: '@-1', fechaAlta: '@-175' },
        { id: 'FUE-0011', nombre: 'Telemetría de camiones', cliente: 'CLI-0006', tipo: 'Streaming de eventos', sistema: 'Apache Kafka', frecuencia: 'Tiempo real', endpoint: 'kafka.rumicondor.example.pe:9093', registros: 22000000, registrosIncompletos: 66000, registrosDuplicados: 22000, ultimaActualizacion: 'hoy', fechaAlta: '@-90' },
        { id: 'FUE-0012', nombre: 'Guías de remisión', cliente: 'CLI-0007', tipo: 'Archivo plano (CSV)', sistema: 'Carpeta SFTP', frecuencia: 'Diaria', endpoint: 'sftp.nazcaexpress.example.pe:22/guias', registros: 310000, registrosIncompletos: 31000, registrosDuplicados: 15500, ultimaActualizacion: '@-6', fechaAlta: '@-80' },
        { id: 'FUE-0013', nombre: 'Facturación y cobranzas', cliente: 'CLI-0008', tipo: 'Base de datos relacional', sistema: 'Oracle 19c', frecuencia: 'Diaria', endpoint: 'ora-fact.andinamovil.example.pe:1521', registros: 6800000, registrosIncompletos: 34000, registrosDuplicados: 6800, ultimaActualizacion: '@-1', fechaAlta: '@-130' },
        { id: 'FUE-0014', nombre: 'Siniestros', cliente: 'CLI-0009', tipo: 'Base de datos relacional', sistema: 'SQL Server 2019', frecuencia: 'Diaria', endpoint: 'sql-sin.pacificonorte.example.pe:1433', registros: 520000, registrosIncompletos: 41600, registrosDuplicados: 5200, ultimaActualizacion: '@-2', fechaAlta: '@-110' },
        { id: 'FUE-0015', nombre: 'Historias clínicas (resumen)', cliente: 'CLI-0011', tipo: 'API REST', sistema: 'Servicio HL7 FHIR', frecuencia: 'Diaria', endpoint: 'https://fhir.sangabriel.example.pe/api', registros: 880000, registrosIncompletos: 61600, registrosDuplicados: 8800, ultimaActualizacion: '@-1', fechaAlta: '@-70' },
        { id: 'FUE-0016', nombre: 'Recaudación municipal', cliente: 'CLI-0010', tipo: 'Archivo plano (CSV)', sistema: 'Exportación de hoja de cálculo', frecuencia: 'Semanal', endpoint: 'sftp.vallecclaro.example.pe:22/rentas', registros: 210000, registrosIncompletos: 25200, registrosDuplicados: 10500, ultimaActualizacion: '@-60', fechaAlta: '@-170' }
      ],
      pipelines: armarPipelines(),
      tableros: [
        { id: 'TAB-0001', nombre: 'Acopio y calidad de fruta', cliente: 'CLI-0001', pipeline: 'PIP-0001', herramienta: 'Power BI', usuarios: 18, fechaEntrega: '@-160', estado: 'En producción' },
        { id: 'TAB-0002', nombre: 'Cadena de frío', cliente: 'CLI-0001', pipeline: 'PIP-0002', herramienta: 'Power BI', usuarios: 9, fechaEntrega: '@-140', estado: 'En producción' },
        { id: 'TAB-0003', nombre: 'Ventas y márgenes por botica', cliente: 'CLI-0002', pipeline: 'PIP-0003', herramienta: 'Tableau', usuarios: 64, fechaEntrega: '@-175', estado: 'En producción' },
        { id: 'TAB-0004', nombre: 'Quiebres de stock', cliente: 'CLI-0002', pipeline: 'PIP-0004', herramienta: 'Tableau', usuarios: 22, fechaEntrega: '@-120', estado: 'En revisión' },
        { id: 'TAB-0005', nombre: 'Posición de cuentas', cliente: 'CLI-0003', pipeline: 'PIP-0005', herramienta: 'Power BI', usuarios: 31, fechaEntrega: '@-170', estado: 'En producción' },
        { id: 'TAB-0006', nombre: 'Monitor de pagos', cliente: 'CLI-0003', pipeline: 'PIP-0006', herramienta: 'Power BI', usuarios: 15, fechaEntrega: '@-90', estado: 'En producción' },
        { id: 'TAB-0007', nombre: 'Ventas por tienda', cliente: 'CLI-0004', pipeline: 'PIP-0007', herramienta: 'Looker Studio', usuarios: 40, fechaEntrega: '@-110', estado: 'En producción' },
        { id: 'TAB-0008', nombre: 'Seguimiento académico', cliente: 'CLI-0005', pipeline: 'PIP-0009', herramienta: 'Metabase', usuarios: 12, fechaEntrega: '@-60', estado: 'En producción' },
        { id: 'TAB-0009', nombre: 'Disponibilidad de flota', cliente: 'CLI-0006', pipeline: 'PIP-0010', herramienta: 'Superset', usuarios: 26, fechaEntrega: '@-150', estado: 'En producción' },
        { id: 'TAB-0010', nombre: 'Cuadro de siniestralidad', cliente: 'CLI-0009', pipeline: 'PIP-0013', herramienta: 'Power BI', usuarios: 11, fechaEntrega: '@-20', estado: 'En desarrollo' },
        { id: 'TAB-0011', nombre: 'Cobranzas y morosidad', cliente: 'CLI-0008', pipeline: 'PIP-0012', herramienta: 'Tableau', usuarios: 28, fechaEntrega: '@-125', estado: 'En producción' },
        { id: 'TAB-0012', nombre: 'Recaudación por zona', cliente: 'CLI-0010', pipeline: 'PIP-0015', herramienta: 'Metabase', usuarios: 5, fechaEntrega: '@-90', estado: 'Retirado' }
      ],
      ejecuciones: armarEjecuciones(),
      tickets: armarTickets()
    }
  };
})();
