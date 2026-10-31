/*
 * Transportes Andes Cargo · Control de viajes y flota (Arequipa)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «transportes». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC, DNI, licencias y placas de ejemplo) y no
 * corresponden a personas, empresas ni vehículos reales. Todo el código es ES5.
 *
 * Idea del negocio: el despachador programa un viaje (ruta, vehículo, conductor,
 * cliente y carga); al emitirlo sale «En ruta». Cada viaje cuesta combustible,
 * peajes, viáticos y la depreciación del camión por kilómetro; la diferencia
 * con el flete pactado es el margen. Además se controlan los mantenimientos y
 * los vencimientos de documentos (SOAT, revisión técnica y licencias).
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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

  function enRango(fecha, desde, hasta) { return (!desde || fecha >= desde) && (!hasta || fecha <= hasta); }

  /* Un viaje «realizado» es el que ya llegó a destino; sus costos e ingresos son definitivos. */
  function viajesEntregados(ctx, desde, hasta) {
    return ctx.datos.listar('viajes', function (v) { return v.estado === 'Entregado' && enRango(v.fecha, desde, hasta); });
  }

  /* Depreciación por km = (valor de compra menos el valor residual) ÷ vida útil en km. */
  function depreciacionKm(v, ctx) {
    if (!v || !v.vidaUtilKm || v.vidaUtilKm <= 0) { return 0; }
    return (v.valorCompra || 0) * (1 - ctx.param('valorResidual') / 100) / v.vidaUtilKm;
  }

  /* Km que faltan para el próximo mantenimiento (negativo = ya pasó). */
  function kmRestantes(v) { return (v.ultimoMantKm || 0) + v.intervaloMantKm - v.kmActual; }

  function situacionMant(v, ctx) {
    var resta = kmRestantes(v);
    if (resta <= 0) { return 'Vencido'; }
    return resta <= ctx.param('avisoKm') ? 'Por vencer' : 'Al día';
  }

  /* Estado de un documento con fecha de vencimiento: «Vencido» antes de hoy, «Por vencer» dentro del aviso. */
  function estadoDocumento(vence, ctx) {
    var dias;
    if (!vence) { return 'Sin dato'; }
    dias = ctx.diasEntre(ctx.hoy(), vence);
    if (dias < 0) { return 'Vencido'; }
    return dias <= ctx.param('avisoDias') ? 'Por vencer' : 'Vigente';
  }

  /*
   * Vencimientos de flota y personal: SOAT, revisión técnica, licencia de conducir y mantenimiento por km.
   * Devuelve filas { tipo, elemento, detalle, vence, dias, km, estado }.
   * Los documentos aparecen si vencen hasta `hasta`; el mantenimiento, si está vencido o por vencer.
   */
  function vencimientos(ctx, hasta, soloVencidos) {
    var r = [], hoy = ctx.hoy(), vehs = ctx.datos.listar('vehiculos', function (v) { return v.estado !== 'Inactivo'; }), conds = ctx.datos.listar('conductores', function (c) { return c.activo !== false; }), i;
    function doc(tipo, elemento, detalle, vence) {
      var est = estadoDocumento(vence, ctx);
      if (!vence || vence > hasta) { return; }
      if (soloVencidos && est !== 'Vencido') { return; }
      r.push({ tipo: tipo, elemento: elemento, detalle: detalle, vence: vence, dias: ctx.diasEntre(hoy, vence), km: null, estado: est === 'Vigente' ? 'Por vencer' : est });
    }
    for (i = 0; i < vehs.length; i++) {
      doc('SOAT', vehs[i].placa, vehs[i].marca + ' ' + vehs[i].modelo, vehs[i].soatVence);
      doc('Revisión técnica', vehs[i].placa, vehs[i].marca + ' ' + vehs[i].modelo, vehs[i].revTecVence);
      if (situacionMant(vehs[i], ctx) !== 'Al día' && !(soloVencidos && situacionMant(vehs[i], ctx) !== 'Vencido')) {
        r.push({ tipo: 'Mantenimiento', elemento: vehs[i].placa, detalle: vehs[i].marca + ' ' + vehs[i].modelo, vence: null, dias: null, km: kmRestantes(vehs[i]), estado: situacionMant(vehs[i], ctx) });
      }
    }
    for (i = 0; i < conds.length; i++) { doc('Licencia de conducir', conds[i].nombre, 'Categoría ' + conds[i].categoria, conds[i].licenciaVence); }
    return r;
  }

  /*
   * Costos de un viaje. Un viaje redondo duplica kilómetros y peajes de la ruta.
   * costo total = combustible + peajes + viáticos + depreciación del vehículo.
   */
  function costosViaje(doc, ctx) {
    var ruta = doc.ruta ? ctx.datos.obtener('rutas', doc.ruta) : null, veh = doc.vehiculo ? ctx.datos.obtener('vehiculos', doc.vehiculo) : null, factor = doc.idaYVuelta ? 2 : 1;
    var km = ruta ? ruta.km * factor : 0;
    var peajes = ruta ? ctx.redondear((ruta.peajes || 0) * factor) : 0;
    var combustible = ctx.redondear((doc.galones || 0) * ctx.param('precioGalon'));
    var viaticos = ctx.redondear(doc.viaticos || 0);
    var depreciacion = ctx.redondear(km * depreciacionKm(veh, ctx));
    return { km: km, peajes: peajes, combustible: combustible, viaticos: viaticos, depreciacion: depreciacion, total: ctx.redondear(combustible + peajes + viaticos + depreciacion), capacidad: veh ? veh.capacidadKg : 0 };
  }

  /* ---------- Datos de demostración (todo inventado) ---------- */

  var VEHICULOS = [
    { id: 'VEH-0001', placa: 'A1F-345', tipo: 'Tracto camión', marca: 'Volvo', modelo: 'FH 460', anio: 2020, capacidadKg: 32000, valorCompra: 420000, vidaUtilKm: 1000000, kmActual: 410300, intervaloMantKm: 20000, ultimoMantKm: 400200, soatVence: '@150', revTecVence: '@200', estado: 'Operativo' },
    { id: 'VEH-0002', placa: 'B2G-678', tipo: 'Tracto camión', marca: 'Scania', modelo: 'R450', anio: 2019, capacidadKg: 32000, valorCompra: 395000, vidaUtilKm: 1000000, kmActual: 498500, intervaloMantKm: 20000, ultimoMantKm: 481000, soatVence: '@95', revTecVence: '@140', estado: 'Operativo' },
    { id: 'VEH-0003', placa: 'C3H-912', tipo: 'Tracto camión', marca: 'Mercedes-Benz', modelo: 'Actros 2646', anio: 2018, capacidadKg: 30000, valorCompra: 365000, vidaUtilKm: 1000000, kmActual: 612400, intervaloMantKm: 20000, ultimoMantKm: 595000, soatVence: '@210', revTecVence: '@62', estado: 'Operativo' },
    { id: 'VEH-0004', placa: 'D4J-246', tipo: 'Tracto camión', marca: 'Freightliner', modelo: 'Cascadia', anio: 2017, capacidadKg: 31000, valorCompra: 340000, vidaUtilKm: 1000000, kmActual: 733800, intervaloMantKm: 20000, ultimoMantKm: 712000, soatVence: '@120', revTecVence: '@18', estado: 'Operativo' },
    { id: 'VEH-0005', placa: 'E5K-581', tipo: 'Camión baranda', marca: 'Hino', modelo: '500 GH', anio: 2019, capacidadKg: 8000, valorCompra: 168000, vidaUtilKm: 700000, kmActual: 288900, intervaloMantKm: 10000, ultimoMantKm: 281000, soatVence: '@77', revTecVence: '@240', estado: 'Operativo' },
    { id: 'VEH-0006', placa: 'F6L-137', tipo: 'Camión furgón', marca: 'Isuzu', modelo: 'FVR', anio: 2021, capacidadKg: 6500, valorCompra: 152000, vidaUtilKm: 650000, kmActual: 143200, intervaloMantKm: 10000, ultimoMantKm: 135500, soatVence: '@300', revTecVence: '@110', estado: 'Operativo' },
    { id: 'VEH-0007', placa: 'G7M-470', tipo: 'Camión furgón', marca: 'Hino', modelo: '300 616', anio: 2022, capacidadKg: 3500, valorCompra: 118000, vidaUtilKm: 500000, kmActual: 94700, intervaloMantKm: 10000, ultimoMantKm: 90000, soatVence: '@260', revTecVence: '@330', estado: 'Operativo' },
    { id: 'VEH-0008', placa: 'H8N-804', tipo: 'Volquete', marca: 'Volvo', modelo: 'FMX 440', anio: 2016, capacidadKg: 15000, valorCompra: 310000, vidaUtilKm: 800000, kmActual: 523100, intervaloMantKm: 15000, ultimoMantKm: 515000, soatVence: '@12', revTecVence: '@150', estado: 'Operativo' },
    { id: 'VEH-0009', placa: 'J9P-219', tipo: 'Camión baranda', marca: 'Mercedes-Benz', modelo: 'Atego 1726', anio: 2018, capacidadKg: 9000, valorCompra: 205000, vidaUtilKm: 700000, kmActual: 331400, intervaloMantKm: 10000, ultimoMantKm: 322000, soatVence: '@185', revTecVence: '@41', estado: 'Operativo' },
    { id: 'VEH-0010', placa: 'K1Q-653', tipo: 'Camión furgón', marca: 'JAC', modelo: 'N120', anio: 2023, capacidadKg: 3000, valorCompra: 98000, vidaUtilKm: 450000, kmActual: 61200, intervaloMantKm: 10000, ultimoMantKm: 55000, soatVence: '@220', revTecVence: '@360', estado: 'Operativo' },
    { id: 'VEH-0011', placa: 'L2R-390', tipo: 'Camión furgón', marca: 'Hyundai', modelo: 'HD78', anio: 2020, capacidadKg: 3500, valorCompra: 112000, vidaUtilKm: 500000, kmActual: 118400, intervaloMantKm: 10000, ultimoMantKm: 111500, soatVence: '@58', revTecVence: '@-9', estado: 'Operativo' },
    { id: 'VEH-0012', placa: 'M3S-725', tipo: 'Tracto camión', marca: 'Volvo', modelo: 'FH 540', anio: 2021, capacidadKg: 33000, valorCompra: 455000, vidaUtilKm: 1000000, kmActual: 289700, intervaloMantKm: 20000, ultimoMantKm: 280000, soatVence: '@270', revTecVence: '@310', estado: 'Operativo' },
    { id: 'VEH-0013', placa: 'N4T-168', tipo: 'Camión baranda', marca: 'Scania', modelo: 'P360', anio: 2017, capacidadKg: 12000, valorCompra: 245000, vidaUtilKm: 750000, kmActual: 402600, intervaloMantKm: 15000, ultimoMantKm: 391000, soatVence: '@90', revTecVence: '@25', estado: 'En mantenimiento' }
  ];
  var POR_VEH = {};

  var RUTAS = [
    { id: 'RUT-0001', codigo: 'AQP-LIM', nombre: 'Arequipa → Lima', origen: 'Arequipa', destino: 'Lima', km: 1010, peajes: 285, tiempoHoras: 16 },
    { id: 'RUT-0002', codigo: 'AQP-CUS', nombre: 'Arequipa → Cusco', origen: 'Arequipa', destino: 'Cusco', km: 520, peajes: 118, tiempoHoras: 10 },
    { id: 'RUT-0003', codigo: 'AQP-JUL', nombre: 'Arequipa → Juliaca', origen: 'Arequipa', destino: 'Juliaca', km: 270, peajes: 54, tiempoHoras: 5 },
    { id: 'RUT-0004', codigo: 'AQP-TAC', nombre: 'Arequipa → Tacna', origen: 'Arequipa', destino: 'Tacna', km: 370, peajes: 80, tiempoHoras: 6.5 },
    { id: 'RUT-0005', codigo: 'AQP-ILO', nombre: 'Arequipa → Ilo', origen: 'Arequipa', destino: 'Ilo', km: 165, peajes: 22, tiempoHoras: 3 },
    { id: 'RUT-0006', codigo: 'LIM-AQP', nombre: 'Lima → Arequipa', origen: 'Lima', destino: 'Arequipa', km: 1010, peajes: 285, tiempoHoras: 16 },
    { id: 'RUT-0007', codigo: 'AQP-PUN', nombre: 'Arequipa → Puno', origen: 'Arequipa', destino: 'Puno', km: 300, peajes: 62, tiempoHoras: 5.5 },
    { id: 'RUT-0008', codigo: 'CUS-AQP', nombre: 'Cusco → Arequipa', origen: 'Cusco', destino: 'Arequipa', km: 520, peajes: 118, tiempoHoras: 10 }
  ];

  /* Precio del galón con el que se arman los costos de las semillas (el sistema usa el parámetro de Configuración). */
  var GALON_SEMILLA = 17.5;

  /*
   * Fila de viaje: [días atrás, ruta (1–8), vehículo (1–13), conductor (1–12), cliente (1–12), redondo (0/1),
   *                 peso kg, km por galón, margen objetivo, estado]
   * El combustible se deduce de los km y del rendimiento; el flete, del costo y del margen objetivo (redondeado a 10).
   */
  var VIAJES = [
    [178, 1, 1, 1, 1, 0, 28500, 6.4, 0.30, 'Entregado'],
    [174, 2, 5, 4, 4, 0, 7600, 8.6, 0.26, 'Entregado'],
    [170, 5, 8, 6, 8, 0, 14000, 4.4, 0.14, 'Entregado'],
    [166, 4, 2, 2, 2, 0, 29800, 6.1, 0.33, 'Entregado'],
    [161, 6, 3, 5, 3, 0, 26000, 6.6, 0.22, 'Entregado'],
    [157, 3, 6, 9, 5, 0, 5200, 11.2, 0.27, 'Entregado'],
    [152, 1, 4, 7, 6, 0, 30500, 6.0, 0.35, 'Entregado'],
    [148, 7, 9, 8, 7, 0, 8400, 8.8, 0.12, 'Entregado'],
    [143, 2, 13, 11, 9, 0, 11200, 8.1, 0.18, 'Entregado'],
    [139, 8, 5, 3, 10, 0, 2400, 8.9, -0.06, 'Entregado'],
    [134, 5, 7, 12, 11, 0, 3100, 11.8, 0.21, 'Entregado'],
    [130, 6, 1, 1, 1, 0, 31000, 6.2, 0.24, 'Entregado'],
    [125, 4, 10, 9, 2, 0, 2700, 11.5, 0.16, 'Entregado'],
    [121, 2, 3, 5, 12, 1, 27000, 6.5, 0.29, 'Entregado'],
    [116, 3, 11, 12, 4, 0, 3300, 11.0, 0.20, 'Entregado'],
    [112, 1, 12, 8, 8, 0, 32500, 6.7, 0.32, 'Entregado'],
    [107, 8, 9, 8, 6, 0, 3000, 8.4, -0.03, 'Entregado'],
    [103, 7, 6, 11, 7, 0, 5800, 10.9, 0.19, 'Entregado'],
    [98, 6, 2, 2, 1, 0, 28000, 6.3, 0.27, 'Entregado'],
    [94, 5, 8, 6, 8, 0, 13500, 4.5, 0.13, 'Entregado'],
    [89, 2, 5, 4, 9, 0, 7900, 8.7, 0.25, 'Entregado'],
    [85, 1, 4, 7, 3, 0, 29000, 5.9, 0.34, 'Entregado'],
    [80, 4, 3, 5, 2, 0, 25500, 6.4, 0.23, 'Entregado'],
    [76, 3, 10, 9, 5, 0, 2900, 11.4, 0.08, 'Entregado'],
    [71, 7, 13, 3, 10, 0, 10400, 7.9, 0.17, 'Entregado'],
    [66, 1, 1, 1, 1, 0, 30200, 6.5, 0.31, 'Entregado'],
    [61, 8, 3, 5, 12, 0, 5000, 6.9, -0.02, 'Entregado'],
    [56, 5, 11, 12, 4, 0, 3400, 11.1, 0.22, 'Entregado'],
    [51, 2, 12, 8, 6, 0, 31500, 6.4, 0.28, 'Entregado'],
    [46, 6, 2, 2, 3, 0, 27500, 6.2, 0.21, 'Entregado'],
    [41, 4, 7, 12, 11, 0, 3300, 11.6, 0.24, 'Entregado'],
    [36, 3, 9, 8, 9, 0, 8600, 8.9, 0.15, 'Entregado'],
    [31, 1, 4, 7, 6, 1, 29500, 5.8, 0.27, 'Entregado'],
    [26, 2, 5, 4, 10, 0, 7300, 8.5, 0.20, 'Entregado'],
    [21, 5, 8, 6, 8, 0, 14500, 4.4, 0.12, 'Entregado'],
    [17, 1, 1, 1, 2, 0, 30800, 6.4, 0.30, 'Entregado'],
    [13, 4, 6, 11, 5, 0, 5600, 11.3, 0.26, 'Entregado'],
    [9, 6, 3, 5, 1, 0, 28800, 6.5, 0.22, 'Entregado'],
    [6, 2, 13, 11, 7, 0, 11800, 8.0, 0.19, 'Entregado'],
    [3, 7, 9, 8, 12, 0, 8100, 8.7, 0.10, 'Entregado'],
    [2, 1, 12, 8, 1, 0, 32000, 6.6, 0.30, 'En ruta'],
    [0, 3, 10, 12, 4, 0, 3000, 11.2, 0.22, 'En ruta'],
    [0, 2, 6, 9, 9, 0, 5000, 10.9, 0.20, 'Programado'],
    [0, 1, 2, 2, 3, 0, 29000, 6.4, 0.30, 'Programado'],
    [48, 1, 4, 7, 6, 0, 30000, 6.0, 0.30, 'Anulado'],
    [22, 5, 8, 6, 8, 0, 14000, 4.4, 0.12, 'Anulado']
  ];

  /* Fila de mantenimiento: [días atrás, vehículo, tipo, taller, km del servicio, mano de obra, repuestos, estado] */
  var MANTENIMIENTOS = [
    [186, 4, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 712000, 2100, 4600, 'Realizado'],
    [165, 1, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 380100, 1800, 3200, 'Realizado'],
    [150, 11, 'Preventivo', 'Taller Hino Arequipa', 111500, 700, 1250, 'Realizado'],
    [124, 10, 'Preventivo', 'Taller Hino Arequipa', 55000, 700, 1100, 'Realizado'],
    [120, 8, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 515000, 1500, 3100, 'Realizado'],
    [118, 9, 'Preventivo', 'Mecánica Diésel del Sur', 322000, 1100, 2100, 'Realizado'],
    [110, 2, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 481000, 1900, 3980, 'Realizado'],
    [100, 13, 'Preventivo', 'Mecánica Diésel del Sur', 391000, 1300, 2600, 'Realizado'],
    [97, 12, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 280000, 1900, 4400, 'Realizado'],
    [92, 3, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 595000, 1900, 4150, 'Realizado'],
    [88, 7, 'Preventivo', 'Taller Hino Arequipa', 90000, 700, 1200, 'Realizado'],
    [75, 1, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 400200, 1800, 3650, 'Realizado'],
    [72, 9, 'Cambio de llantas', 'Llantera del Sur S.R.L.', 328000, 600, 4800, 'Realizado'],
    [64, 5, 'Preventivo', 'Taller Hino Arequipa', 281000, 950, 1820, 'Realizado'],
    [58, 10, 'Preventivo', 'Taller Hino Arequipa', 55000, 700, 1100, 'Anulado'],
    [53, 6, 'Preventivo', 'Taller Hino Arequipa', 135500, 800, 1480, 'Realizado'],
    [40, 11, 'Correctivo', 'Taller Frenos Total', 117000, 650, 1280, 'Realizado'],
    [1, 13, 'Correctivo', 'Servicio Pesado Andino S.A.C.', 402600, 1400, 2900, 'Programado'],
    [0, 4, 'Preventivo', 'Servicio Pesado Andino S.A.C.', 733800, 2100, 4700, 'Programado']
  ];

  function dosDigitos(n, ancho) { var s = String(n); while (s.length < ancho) { s = '0' + s; } return s; }

  (function indexar() { var i; for (i = 0; i < VEHICULOS.length; i++) { POR_VEH[VEHICULOS[i].id] = VEHICULOS[i]; } })();

  function armarViajes() {
    var r = [], i, f, v, ruta, factor, km, galones, peajes, viaticos, deprec, costo, flete, doc;
    for (i = 0; i < VIAJES.length; i++) {
      f = VIAJES[i];
      v = POR_VEH['VEH-' + dosDigitos(f[2], 4)];
      ruta = RUTAS[f[1] - 1];
      factor = f[5] === 1 ? 2 : 1;
      km = ruta.km * factor;
      galones = Math.round(km / f[7] * 10) / 10;
      peajes = ruta.peajes * factor;
      viaticos = Math.round(km * 0.17 / 10) * 10;
      deprec = km * v.valorCompra * 0.8 / v.vidaUtilKm;
      costo = galones * GALON_SEMILLA + peajes + viaticos + deprec;
      flete = Math.round(costo * (1 + f[8]) / 10) * 10;
      doc = {
        id: 'VIA-' + dosDigitos(i + 1, 4), fecha: '@-' + f[0], cliente: 'CLI-' + dosDigitos(f[4], 4), ruta: ruta.id, vehiculo: v.id, conductor: 'CON-' + dosDigitos(f[3], 4),
        idaYVuelta: f[5] === 1, pesoKg: f[6], flete: flete, galones: galones, viaticos: viaticos, estado: f[9]
      };
      if (f[9] !== 'Programado') { doc.guia = 'EG07-' + dosDigitos(1200 + i * 7, 6); }
      if (f[9] === 'Anulado') { doc.motivoAnulacion = 'El cliente reprogramó la carga y pidió otra fecha.'; }
      r.push(doc);
    }
    return r;
  }

  function armarMantenimientos() {
    var r = [], i, f, doc;
    for (i = 0; i < MANTENIMIENTOS.length; i++) {
      f = MANTENIMIENTOS[i];
      doc = { id: 'MNT-' + dosDigitos(i + 1, 4), fecha: '@-' + f[0], vehiculo: 'VEH-' + dosDigitos(f[1], 4), tipo: f[2], taller: f[3], kmServicio: f[4], manoObra: f[5], repuestos: f[6], estado: f[7] };
      if (f[7] === 'Anulado') { doc.motivoAnulacion = 'Registro duplicado del mismo servicio.'; }
      r.push(doc);
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'transportes',
    nombre: 'Transportes Andes Cargo',
    rubro: 'Transporte de carga por carretera',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#0f6b6e', acento: '#f08a24', siglas: 'AC' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma al flete y a los mantenimientos.' },
      { id: 'precioGalon', etiqueta: 'Precio del galón de diésel', tipo: 'moneda', valor: 17.5, ayuda: 'Se multiplica por los galones consumidos para costear el combustible del viaje.' },
      { id: 'valorResidual', etiqueta: 'Valor residual del vehículo', tipo: 'porcentaje', valor: 20, ayuda: 'Parte del valor de compra que se supone que conserva el vehículo al final de su vida útil; no se deprecia.' },
      { id: 'margenObjetivo', etiqueta: 'Margen objetivo por viaje', tipo: 'porcentaje', valor: 15, ayuda: 'Las rutas por debajo de este margen aparecen como «Bajo la meta» en el reporte de rentabilidad.' },
      { id: 'avisoDias', etiqueta: 'Aviso de vencimientos (días de anticipación)', tipo: 'entero', valor: 30, ayuda: 'SOAT, revisión técnica y licencias figuran como «Por vencer» dentro de este plazo.' },
      { id: 'avisoKm', etiqueta: 'Aviso de mantenimiento (km de anticipación)', tipo: 'entero', valor: 2000, ayuda: 'Un vehículo figura como «Por vencer» cuando le faltan estos kilómetros o menos.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 0,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: true,
      confirmarEliminar: false,
      exigirCambioClave: true,
      ayudaLogin: false,
      exportaRespetaPermisos: true,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, viajes, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'gerente', nombre: 'Gerente de operaciones', descripcion: 'Ve toda la operación y la rentabilidad, administra flota, conductores y rutas, y puede anular viajes. No programa ni despacha.' },
      { id: 'despachador', nombre: 'Despachador', descripcion: 'Programa y despacha viajes y registra mantenimientos; administra clientes. No ve costos de la flota ni sueldos.' },
      { id: 'conductor', nombre: 'Conductor', descripcion: 'Consulta los vehículos y las rutas. No ve viajes, costos ni datos de otros conductores.' },
      { id: 'contabilidad', nombre: 'Contabilidad', descripcion: 'Consulta viajes, mantenimientos, costos y rentabilidad y actualiza las condiciones de pago de los clientes. No programa viajes.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de toda la operación y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Rolando Valdivia Cáceres', rol: 'admin', clave: 'Cargo#2026ad' },
      { usuario: 'gerente', nombre: 'Sonia Gutiérrez Medina', rol: 'gerente', clave: 'Cargo#2026gr' },
      { usuario: 'despachador', nombre: 'Marcos Huamaní Ortiz', rol: 'despachador', clave: 'Cargo#2026dp' },
      { usuario: 'conductor', nombre: 'Abel Mamani Quispe', rol: 'conductor', clave: 'Cargo#2026cn' },
      { usuario: 'contabilidad', nombre: 'Yolanda Peralta Núñez', rol: 'contabilidad', clave: 'Cargo#2026ct' },
      { usuario: 'auditor', nombre: 'Aldo Zúñiga Barreda', rol: 'auditor', clave: 'Cargo#2026au' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'vehiculos', nombre: 'Vehículo', plural: 'Vehículos', prefijo: 'VEH',
        campos: [
          { id: 'placa', etiqueta: 'Placa', tipo: 'texto', requerido: true, unico: true, max: 7, patron: '^[A-Z0-9]{3}-?[A-Z0-9]{3}$', mensajePatron: 'La placa lleva 6 caracteres en mayúscula, por ejemplo ABC-123.' },
          { id: 'tipo', etiqueta: 'Tipo de vehículo', tipo: 'lista', requerido: true, opciones: ['Tracto camión', 'Camión baranda', 'Camión furgón', 'Volquete'] },
          { id: 'marca', etiqueta: 'Marca', tipo: 'lista', requerido: true, opciones: ['Volvo', 'Scania', 'Mercedes-Benz', 'Freightliner', 'Hino', 'Isuzu', 'JAC', 'Hyundai'] },
          { id: 'modelo', etiqueta: 'Modelo', tipo: 'texto', requerido: true, max: 40 },
          { id: 'anio', etiqueta: 'Año de fabricación', tipo: 'entero', requerido: true, min: 2005, max: 2027 },
          { id: 'capacidadKg', etiqueta: 'Capacidad de carga (kg)', tipo: 'entero', requerido: true, min: 500, max: 60000 },
          { id: 'valorCompra', etiqueta: 'Valor de compra', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'gerente', 'contabilidad', 'auditor'], ayuda: 'Base de la depreciación por kilómetro.' },
          { id: 'vidaUtilKm', etiqueta: 'Vida útil estimada (km)', tipo: 'entero', requerido: true, min: 50000, max: 3000000, defecto: 800000 },
          { id: 'kmActual', etiqueta: 'Kilometraje actual', tipo: 'entero', requerido: true, min: 0, ayuda: 'Sube solo al emitir un viaje o un mantenimiento.' },
          { id: 'intervaloMantKm', etiqueta: 'Intervalo de servicio (km)', tipo: 'entero', requerido: true, min: 1000, max: 60000, defecto: 15000 },
          { id: 'ultimoMantKm', etiqueta: 'Km del último preventivo', tipo: 'entero', min: 0, defecto: 0 },
          { id: 'soatVence', etiqueta: 'SOAT vence', tipo: 'fecha', requerido: true },
          { id: 'revTecVence', etiqueta: 'Revisión técnica vence', tipo: 'fecha', requerido: true },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', requerido: true, opciones: ['Operativo', 'En mantenimiento', 'Inactivo'], defecto: 'Operativo', ayuda: 'Solo un vehículo operativo puede salir en un viaje.' }
        ],
        lista: ['placa', 'tipo', 'marca', 'capacidadKg', 'kmActual', 'situacionMant', 'estado'],
        buscar: ['placa', 'marca', 'modelo', 'tipo'],
        calculados: [
          {
            id: 'depreciacionKm', etiqueta: 'Depreciación por km', tipo: 'numero', ver: ['admin', 'gerente', 'contabilidad', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(depreciacionKm(r, ctx)); }
          },
          {
            id: 'proximoMant', etiqueta: 'Próximo mantenimiento (km)', tipo: 'entero',
            formula: function (r) { return (r.ultimoMantKm || 0) + r.intervaloMantKm; }
          },
          {
            id: 'situacionMant', etiqueta: 'Mantenimiento', tipo: 'texto',
            formula: function (r, ctx) { return situacionMant(r, ctx); }
          },
          {
            id: 'documentos', etiqueta: 'SOAT y revisión técnica', tipo: 'texto',
            formula: function (r, ctx) {
              var a = estadoDocumento(r.soatVence, ctx), b = estadoDocumento(r.revTecVence, ctx);
              if (a === 'Vencido' || b === 'Vencido') { return 'Vencido'; }
              return a === 'Por vencer' || b === 'Por vencer' ? 'Por vencer' : 'Vigentes';
            }
          }
        ],
        reglas: [
          {
            id: 'mant-coherente', mensaje: 'El kilometraje del último mantenimiento no puede superar el kilometraje actual.',
            validar: function (r) { return !((r.ultimoMantKm || 0) > r.kmActual); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'despachador', 'conductor', 'contabilidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'conductores', nombre: 'Conductor', plural: 'Conductores', prefijo: 'CON',
        campos: [
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'licencia', etiqueta: 'N.º de licencia', tipo: 'texto', requerido: true, unico: true, max: 9, patron: '^[A-Z]?[0-9]{8,9}$', mensajePatron: 'Una letra opcional seguida de 8 o 9 dígitos, por ejemplo Q40125873.' },
          { id: 'categoria', etiqueta: 'Categoría de licencia', tipo: 'lista', requerido: true, opciones: ['A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc'] },
          { id: 'licenciaVence', etiqueta: 'La licencia vence', tipo: 'fecha', requerido: true },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' },
          { id: 'sueldoBase', etiqueta: 'Sueldo base mensual', tipo: 'moneda', min: 0, ver: ['admin', 'gerente', 'contabilidad', 'auditor'] },
          { id: 'activo', etiqueta: 'Conductor activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['nombre', 'licencia', 'categoria', 'licenciaVence', 'estadoLicencia', 'viajes'],
        buscar: ['nombre', 'dni', 'licencia'],
        calculados: [
          {
            id: 'estadoLicencia', etiqueta: 'Licencia', tipo: 'texto',
            formula: function (r, ctx) { var e = estadoDocumento(r.licenciaVence, ctx); return e === 'Vigente' ? 'Vigente' : e; }
          },
          {
            id: 'viajes', etiqueta: 'Viajes realizados', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('viajes', function (v) { return v.conductor === r.id && v.estado === 'Entregado'; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'despachador', 'contabilidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^[0-9]{11}$', mensajePatron: 'El RUC tiene 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', max: 60 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'ciudad', etiqueta: 'Ciudad', tipo: 'lista', opciones: ['Arequipa', 'Lima', 'Cusco', 'Juliaca', 'Tacna', 'Ilo', 'Puno'] },
          { id: 'condicion', etiqueta: 'Condición de pago', tipo: 'lista', requerido: true, opciones: ['Contado', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 45 días'], defecto: 'Contado' }
        ],
        lista: ['ruc', 'nombre', 'ciudad', 'condicion', 'fletes'],
        buscar: ['ruc', 'nombre', 'ciudad', 'contacto'],
        calculados: [
          {
            id: 'fletes', etiqueta: 'Fletes entregados', tipo: 'moneda', ver: ['admin', 'gerente', 'contabilidad', 'auditor'],
            formula: function (r, ctx) {
              var vs = ctx.datos.listar('viajes', function (v) { return v.cliente === r.id && v.estado === 'Entregado'; });
              return ctx.redondear(ctx.suma(vs, function (v) { return v.totales ? v.totales.flete : 0; }));
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'despachador', 'contabilidad', 'auditor'], crear: ['admin', 'gerente', 'despachador'], editar: ['admin', 'gerente', 'despachador', 'contabilidad'], eliminar: ['admin'] }
      },
      {
        id: 'rutas', nombre: 'Ruta', plural: 'Rutas', prefijo: 'RUT',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 12, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre de la ruta', tipo: 'texto', requerido: true, max: 60, ayuda: 'Por ejemplo: Arequipa → Lima.' },
          { id: 'origen', etiqueta: 'Origen', tipo: 'lista', requerido: true, opciones: ['Arequipa', 'Lima', 'Cusco', 'Juliaca', 'Tacna', 'Ilo', 'Puno'] },
          { id: 'destino', etiqueta: 'Destino', tipo: 'lista', requerido: true, opciones: ['Arequipa', 'Lima', 'Cusco', 'Juliaca', 'Tacna', 'Ilo', 'Puno'] },
          { id: 'km', etiqueta: 'Distancia (km, solo ida)', tipo: 'entero', requerido: true, min: 1, max: 3000 },
          { id: 'peajes', etiqueta: 'Peajes (solo ida)', tipo: 'moneda', min: 0, requerido: true, defecto: 0 },
          { id: 'tiempoHoras', etiqueta: 'Tiempo estimado (horas)', tipo: 'numero', min: 0.5, max: 80 }
        ],
        lista: ['codigo', 'nombre', 'km', 'peajes', 'tiempoHoras'],
        buscar: ['codigo', 'nombre', 'origen', 'destino'],
        permisos: { ver: ['admin', 'gerente', 'despachador', 'conductor', 'contabilidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'viajes', nombre: 'Viaje', plural: 'Viajes', prefijo: 'VIA', serie: 'GT01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de salida', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'ruta', etiqueta: 'Ruta', tipo: 'ref', entidad: 'rutas', mostrar: 'nombre', requerido: true },
          { id: 'vehiculo', etiqueta: 'Vehículo (placa)', tipo: 'ref', entidad: 'vehiculos', mostrar: 'placa', requerido: true },
          { id: 'conductor', etiqueta: 'Conductor', tipo: 'ref', entidad: 'conductores', mostrar: 'nombre', requerido: true },
          { id: 'idaYVuelta', etiqueta: 'Viaje redondo (ida y vuelta)', tipo: 'booleano', defecto: false, ayuda: 'Duplica los kilómetros y los peajes de la ruta.' },
          { id: 'pesoKg', etiqueta: 'Peso de la carga (kg)', tipo: 'entero', requerido: true, min: 1, max: 60000 },
          { id: 'flete', etiqueta: 'Flete pactado (sin IGV)', tipo: 'moneda', requerido: true, min: 0 },
          { id: 'galones', etiqueta: 'Combustible (galones)', tipo: 'numero', requerido: true, min: 0, max: 2000 },
          { id: 'viaticos', etiqueta: 'Viáticos del conductor', tipo: 'moneda', min: 0, defecto: 0 },
          { id: 'guia', etiqueta: 'Guía de remisión', tipo: 'texto', max: 20 },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'ruta', 'vehiculo', 'conductor'],
        estados: ['Programado', 'En ruta', 'Entregado', 'Anulado'],
        calcular: function (doc, ctx) {
          var c = costosViaje(doc, ctx);
          var flete = ctx.redondear(doc.flete || 0);
          var igv = ctx.redondear(flete * ctx.param('igv') / 100);
          var margen = ctx.redondear(flete - c.total);
          return {
            flete: flete, igv: igv, total: ctx.redondear(flete + igv),
            combustible: c.combustible, peajes: c.peajes, viaticos: c.viaticos, depreciacion: c.depreciacion, costoTotal: c.total,
            margen: margen, margenPct: flete > 0 ? ctx.redondear(margen / flete * 100) : 0,
            km: c.km, costoKm: c.km > 0 ? ctx.redondear(c.total / c.km) : 0,
            rendimiento: doc.galones > 0 ? ctx.redondear(c.km / doc.galones) : 0,
            ocupacion: c.capacidad > 0 ? ctx.redondear((doc.pesoKg || 0) / c.capacidad * 100) : 0
          };
        },
        totales: [
          { id: 'flete', etiqueta: 'Flete (sin IGV)' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total a facturar', fuerte: true },
          { id: 'combustible', etiqueta: 'Costo de combustible' },
          { id: 'peajes', etiqueta: 'Peajes' },
          { id: 'viaticos', etiqueta: 'Viáticos' },
          { id: 'depreciacion', etiqueta: 'Depreciación del vehículo' },
          { id: 'costoTotal', etiqueta: 'Costo total del viaje' },
          { id: 'margen', etiqueta: 'Margen del viaje' },
          { id: 'costoKm', etiqueta: 'Costo por km' },
          { id: 'rendimiento', etiqueta: 'Rendimiento (km por galón)', tipo: 'numero' },
          { id: 'ocupacion', etiqueta: 'Ocupación de la carga', tipo: 'porcentaje' }
        ],
        reglas: [
          {
            id: 'carga-dentro-de-capacidad', mensaje: 'El peso de la carga supera la capacidad del vehículo.',
            validar: function (d, ctx) { var v = ctx.datos.obtener('vehiculos', d.vehiculo); return !!v && d.pesoKg <= v.capacidadKg; }
          }
        ],
        alEmitir: function (doc, ctx) {
          var v = ctx.datos.obtener('vehiculos', doc.vehiculo), c = ctx.datos.obtener('conductores', doc.conductor), ocupados, km;
          if (v.estado !== 'Operativo') { throw new Error('El vehículo ' + v.placa + ' está «' + v.estado + '» y no puede salir.'); }
          if (v.soatVence < doc.fecha) { throw new Error('El SOAT del vehículo ' + v.placa + ' venció el ' + ctx.fmt.fecha(v.soatVence) + '.'); }
          if (v.revTecVence < doc.fecha) { throw new Error('La revisión técnica del vehículo ' + v.placa + ' venció el ' + ctx.fmt.fecha(v.revTecVence) + '.'); }
          if (c.activo === false) { throw new Error('El conductor ' + c.nombre + ' no está activo.'); }
          if (c.licenciaVence < doc.fecha) { throw new Error('La licencia de ' + c.nombre + ' venció el ' + ctx.fmt.fecha(c.licenciaVence) + '.'); }
          ocupados = ctx.datos.listar('viajes', function (x) { return x.id !== doc.id && x.estado === 'En ruta' && (x.vehiculo === doc.vehiculo || x.conductor === doc.conductor); });
          if (ocupados.length) { throw new Error('El vehículo o el conductor ya están en ruta en el viaje ' + (ocupados[0].numero || ocupados[0].id) + '.'); }
          km = costosViaje(doc, ctx).km;
          ctx.datos.actualizar('vehiculos', doc.vehiculo, { kmActual: v.kmActual + km });
        },
        alAnular: function (doc, ctx) {
          var v = ctx.datos.obtener('vehiculos', doc.vehiculo), km = costosViaje(doc, ctx).km;
          try {
            ctx.datos.actualizar('vehiculos', doc.vehiculo, { kmActual: Math.max(0, v.kmActual - km) });
          } catch (e) {
            throw new Error('No se puede anular: el vehículo ya tiene un mantenimiento registrado después de este viaje.');
          }
        },
        permisos: { ver: ['admin', 'gerente', 'despachador', 'contabilidad', 'auditor'], crear: ['admin', 'despachador'], editar: ['admin', 'despachador'], emitir: ['admin', 'despachador'], anular: ['admin', 'gerente'] }
      },
      {
        id: 'mantenimientos', nombre: 'Mantenimiento', plural: 'Mantenimientos', prefijo: 'MNT', serie: 'MN01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha del servicio', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'vehiculo', etiqueta: 'Vehículo (placa)', tipo: 'ref', entidad: 'vehiculos', mostrar: 'placa', requerido: true },
          { id: 'tipo', etiqueta: 'Tipo de mantenimiento', tipo: 'lista', requerido: true, opciones: ['Preventivo', 'Correctivo', 'Cambio de llantas', 'Otro'], defecto: 'Preventivo', ayuda: 'Solo el preventivo reinicia el conteo de kilómetros para el próximo mantenimiento.' },
          { id: 'taller', etiqueta: 'Taller', tipo: 'texto', max: 60 },
          { id: 'kmServicio', etiqueta: 'Kilometraje del servicio', tipo: 'entero', requerido: true, min: 0 },
          { id: 'manoObra', etiqueta: 'Mano de obra (sin IGV)', tipo: 'moneda', requerido: true, min: 0 },
          { id: 'repuestos', etiqueta: 'Repuestos y materiales', tipo: 'moneda', min: 0, defecto: 0, ayuda: 'Sin IGV.' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'vehiculo', 'tipo'],
        estados: ['Programado', 'Realizado', 'Anulado'],
        calcular: function (doc, ctx) {
          var sub = ctx.redondear((doc.manoObra || 0) + (doc.repuestos || 0));
          var igv = ctx.redondear(sub * ctx.param('igv') / 100);
          return { subtotal: sub, igv: igv, total: ctx.redondear(sub + igv) };
        },
        totales: [
          { id: 'subtotal', etiqueta: 'Subtotal' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total del servicio', fuerte: true }
        ],
        alEmitir: function (doc, ctx) {
          var v = ctx.datos.obtener('vehiculos', doc.vehiculo), parche = {};
          if (doc.kmServicio > v.kmActual) { parche.kmActual = doc.kmServicio; }
          if (doc.tipo === 'Preventivo' && doc.kmServicio >= (v.ultimoMantKm || 0)) { parche.ultimoMantKm = doc.kmServicio; }
          if (v.estado === 'En mantenimiento') { parche.estado = 'Operativo'; }
          if (parche.kmActual !== undefined || parche.ultimoMantKm !== undefined || parche.estado !== undefined) { ctx.datos.actualizar('vehiculos', doc.vehiculo, parche); }
        },
        alAnular: function (doc, ctx) {
          var otros = ctx.datos.listar('mantenimientos', function (m) { return m.id !== doc.id && m.vehiculo === doc.vehiculo && m.tipo === 'Preventivo' && m.estado === 'Realizado'; }), mejor = 0, i;
          if (doc.tipo !== 'Preventivo') { return; }
          for (i = 0; i < otros.length; i++) { if (otros[i].kmServicio > mejor) { mejor = otros[i].kmServicio; } }
          ctx.datos.actualizar('vehiculos', doc.vehiculo, { ultimoMantKm: mejor });
        },
        permisos: { ver: ['admin', 'gerente', 'despachador', 'contabilidad', 'auditor'], crear: ['admin', 'despachador'], editar: ['admin', 'despachador'], emitir: ['admin', 'despachador'], anular: ['admin'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'rentabilidad-ruta', titulo: 'Rentabilidad por ruta',
        descripcion: 'Viajes entregados agrupados por ruta: flete, costo total (combustible, peajes, viáticos y depreciación), margen y su comparación con el margen objetivo.',
        roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var viajes = viajesEntregados(ctx, p.desde, p.hasta), g = ctx.agrupar(viajes, function (v) { return v.ruta; }), claves = [], k, i, rt, lista, flete, costo, margen, pct, filas = [], etiquetas = [], valores = [], tFlete = 0, tMargen = 0;
          for (k in g) { if (g.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort(function (a, b) {
            return ctx.suma(g[b], function (v) { return v.totales.margen; }) - ctx.suma(g[a], function (v) { return v.totales.margen; });
          });
          for (i = 0; i < claves.length; i++) {
            lista = g[claves[i]];
            rt = ctx.datos.obtener('rutas', claves[i]);
            flete = ctx.suma(lista, function (v) { return v.totales.flete; });
            costo = ctx.suma(lista, function (v) { return v.totales.costoTotal; });
            margen = flete - costo;
            pct = flete > 0 ? ctx.redondear(margen / flete * 100) : 0;
            filas.push([rt ? rt.nombre : claves[i], lista.length, ctx.redondear(ctx.suma(lista, function (v) { return v.totales.km; })), ctx.redondear(flete), ctx.redondear(costo), ctx.redondear(margen), pct, pct >= ctx.param('margenObjetivo') ? 'Cumple la meta' : 'Bajo la meta']);
            etiquetas.push(rt ? rt.nombre : claves[i]);
            valores.push(ctx.redondear(margen));
            tFlete += flete;
            tMargen += margen;
          }
          return {
            columnas: ['Ruta', 'Viajes', 'Km recorridos', 'Flete', 'Costo total', 'Margen', 'Margen %', 'Meta'],
            tipos: ['texto', 'entero', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Flete del periodo', valor: ctx.redondear(tFlete), tipo: 'moneda' },
              { etiqueta: 'Margen del periodo', valor: ctx.redondear(tMargen), tipo: 'moneda' },
              { etiqueta: 'Margen sobre flete', valor: tFlete > 0 ? ctx.redondear(tMargen / tFlete * 100) : 0, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'costo-km-vehiculo', titulo: 'Costo por km por vehículo',
        descripcion: 'Para cada vehículo: combustible, peajes, viáticos y depreciación de sus viajes entregados, costo por kilómetro y rendimiento en km por galón.',
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var viajes = viajesEntregados(ctx, p.desde, p.hasta), g = ctx.agrupar(viajes, function (v) { return v.vehiculo; }), claves = [], k, i, veh, lista, km, galones, costo, filas = [], etiquetas = [], valores = [], tCosto = 0, tKm = 0, tGalones = 0;
          for (k in g) { if (g.hasOwnProperty(k)) { claves.push(k); } }
          for (i = 0; i < claves.length; i++) {
            lista = g[claves[i]];
            veh = ctx.datos.obtener('vehiculos', claves[i]);
            km = ctx.suma(lista, function (v) { return v.totales.km; });
            galones = ctx.suma(lista, function (v) { return v.galones; });
            costo = ctx.suma(lista, function (v) { return v.totales.costoTotal; });
            filas.push([veh ? veh.placa : claves[i], veh ? veh.tipo : '', lista.length, ctx.redondear(km),
              ctx.redondear(ctx.suma(lista, function (v) { return v.totales.combustible; })), ctx.redondear(ctx.suma(lista, function (v) { return v.totales.peajes; })),
              ctx.redondear(ctx.suma(lista, function (v) { return v.totales.viaticos; })), ctx.redondear(ctx.suma(lista, function (v) { return v.totales.depreciacion; })),
              ctx.redondear(costo), km > 0 ? ctx.redondear(costo / km) : 0, galones > 0 ? ctx.redondear(km / galones) : 0]);
            tCosto += costo;
            tKm += km;
            tGalones += galones;
          }
          filas.sort(function (a, b) { return b[9] - a[9]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][9]); }
          return {
            columnas: ['Placa', 'Tipo', 'Viajes', 'Km', 'Combustible', 'Peajes', 'Viáticos', 'Depreciación', 'Costo total', 'Costo por km', 'Km por galón'],
            tipos: ['texto', 'texto', 'entero', 'entero', 'moneda', 'moneda', 'moneda', 'moneda', 'moneda', 'moneda', 'numero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Costo por km de la flota', valor: tKm > 0 ? ctx.redondear(tCosto / tKm) : 0, tipo: 'moneda' },
              { etiqueta: 'Km por galón de la flota', valor: tGalones > 0 ? ctx.redondear(tKm / tGalones) : 0, tipo: 'numero' },
              { etiqueta: 'Km recorridos', valor: ctx.redondear(tKm), tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'vencimientos', titulo: 'Vencimientos de mantenimiento y documentos',
        descripcion: 'SOAT, revisión técnica y licencias que vencen hasta la fecha elegida, y vehículos con el mantenimiento vencido o por vencer según su kilometraje.',
        roles: ['admin', 'gerente', 'despachador', 'auditor'],
        parametros: [
          { id: 'hasta', etiqueta: 'Documentos que vencen hasta', tipo: 'fecha', requerido: true, defecto: '@30' },
          { id: 'filtro', etiqueta: 'Mostrar', tipo: 'lista', opciones: ['Vencidos y por vencer', 'Solo vencidos'], defecto: 'Vencidos y por vencer' }
        ],
        ejecutar: function (p, ctx) {
          var lista = vencimientos(ctx, p.hasta || ctx.hoy(), p.filtro === 'Solo vencidos'), filas = [], i, x, cuenta = { 'SOAT': 0, 'Revisión técnica': 0, 'Licencia de conducir': 0, 'Mantenimiento': 0 }, vencidos = 0;
          lista.sort(function (a, b) {
            var ra = a.estado === 'Vencido' ? 0 : 1, rb = b.estado === 'Vencido' ? 0 : 1;
            if (ra !== rb) { return ra - rb; }
            return (a.dias === null ? 99999 : a.dias) - (b.dias === null ? 99999 : b.dias);
          });
          for (i = 0; i < lista.length; i++) {
            x = lista[i];
            cuenta[x.tipo] += 1;
            if (x.estado === 'Vencido') { vencidos += 1; }
            filas.push([x.tipo, x.elemento, x.detalle, x.vence, x.dias, x.km, x.estado]);
          }
          return {
            columnas: ['Tipo', 'Vehículo o conductor', 'Detalle', 'Vence', 'Días', 'Km restantes', 'Estado'],
            tipos: ['texto', 'texto', 'texto', 'fecha', 'entero', 'entero', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: ['SOAT', 'Revisión técnica', 'Licencia de conducir', 'Mantenimiento'], valores: [cuenta['SOAT'], cuenta['Revisión técnica'], cuenta['Licencia de conducir'], cuenta['Mantenimiento']], formato: 'entero' },
            resumen: [
              { etiqueta: 'Vencidos', valor: vencidos, tipo: 'entero' },
              { etiqueta: 'Por vencer', valor: filas.length - vencidos, tipo: 'entero' },
              { etiqueta: 'Total de alertas', valor: filas.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'viajes-conductor', titulo: 'Viajes por conductor',
        descripcion: 'Viajes entregados por conductor: kilómetros, rendimiento de combustible, ocupación promedio de la carga y viáticos. Los viajes en ruta no cuentan hasta llegar a destino.',
        roles: ['admin', 'gerente', 'despachador', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var viajes = viajesEntregados(ctx, p.desde, p.hasta), g = ctx.agrupar(viajes, function (v) { return v.conductor; }), k, c, lista, km, gal, filas = [], etiquetas = [], valores = [], i, total = 0;
          for (k in g) {
            if (!g.hasOwnProperty(k)) { continue; }
            lista = g[k];
            c = ctx.datos.obtener('conductores', k);
            km = ctx.suma(lista, function (v) { return v.totales.km; });
            gal = ctx.suma(lista, function (v) { return v.galones; });
            filas.push([c ? c.nombre : k, lista.length, ctx.redondear(km), gal > 0 ? ctx.redondear(km / gal) : 0, ctx.redondear(ctx.suma(lista, function (v) { return v.totales.ocupacion; }) / lista.length), ctx.redondear(ctx.suma(lista, function (v) { return v.totales.viaticos; }))]);
            total += lista.length;
          }
          filas.sort(function (a, b) { return b[1] - a[1] || b[2] - a[2]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][1]); }
          return {
            columnas: ['Conductor', 'Viajes', 'Km', 'Km por galón', 'Ocupación %', 'Viáticos'], tipos: ['texto', 'entero', 'entero', 'numero', 'porcentaje', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Viajes entregados', valor: total, tipo: 'entero' },
              { etiqueta: 'Conductores con viajes', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Viajes por conductor', valor: filas.length ? ctx.redondear(total / filas.length) : 0, tipo: 'numero' }
            ]
          };
        }
      },
      {
        id: 'ocupacion-flota', titulo: 'Ocupación de la flota',
        descripcion: 'Qué tanto de su capacidad llevó cada vehículo: kilos transportados ÷ (capacidad × viajes). Una ocupación baja significa camiones que salen casi vacíos.',
        roles: ['admin', 'gerente', 'despachador', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var viajes = viajesEntregados(ctx, p.desde, p.hasta), g = ctx.agrupar(viajes, function (v) { return v.vehiculo; }), k, veh, lista, kilos, cap, filas = [], etiquetas = [], valores = [], i, tKilos = 0, tCap = 0;
          for (k in g) {
            if (!g.hasOwnProperty(k)) { continue; }
            lista = g[k];
            veh = ctx.datos.obtener('vehiculos', k);
            kilos = ctx.suma(lista, function (v) { return v.pesoKg; });
            cap = veh ? veh.capacidadKg * lista.length : 0;
            filas.push([veh ? veh.placa : k, veh ? veh.tipo : '', veh ? veh.capacidadKg : 0, lista.length, kilos, cap > 0 ? ctx.redondear(kilos / cap * 100) : 0]);
            tKilos += kilos;
            tCap += cap;
          }
          filas.sort(function (a, b) { return a[5] - b[5]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][5]); }
          return {
            columnas: ['Placa', 'Tipo', 'Capacidad (kg)', 'Viajes', 'Kg transportados', 'Ocupación %'], tipos: ['texto', 'texto', 'entero', 'entero', 'entero', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Ocupación de la flota', valor: tCap > 0 ? ctx.redondear(tKilos / tCap * 100) : 0, tipo: 'porcentaje' },
              { etiqueta: 'Toneladas transportadas', valor: ctx.redondear(tKilos / 1000), tipo: 'numero' },
              { etiqueta: 'Vehículos con viajes', valor: filas.length, tipo: 'entero' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Fletes de los últimos 30 días (sin IGV)', tipo: 'moneda', roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(viajesEntregados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (v) { return v.totales.flete; }));
        }
      },
      {
        titulo: 'Margen de los últimos 30 días', tipo: 'moneda', roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        nota: 'Flete menos costo total del viaje',
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(viajesEntregados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (v) { return v.totales.margen; }));
        }
      },
      {
        titulo: 'Viajes en ruta ahora', tipo: 'entero', roles: ['admin', 'gerente', 'despachador', 'auditor'],
        calcular: function (ctx) { return ctx.datos.listar('viajes', function (v) { return v.estado === 'En ruta'; }).length; }
      },
      {
        titulo: 'Ocupación de la carga (30 días)', tipo: 'porcentaje', roles: ['admin', 'gerente', 'despachador', 'auditor'],
        nota: 'Kilos transportados ÷ capacidad',
        calcular: function (ctx) {
          var vs = viajesEntregados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), kilos = ctx.suma(vs, function (v) { return v.pesoKg; }), cap = ctx.suma(vs, function (v) { var x = ctx.datos.obtener('vehiculos', v.vehiculo); return x ? x.capacidadKg : 0; });
          return cap > 0 ? ctx.redondear(kilos / cap * 100) : null;
        }
      },
      {
        titulo: 'Costo por km de la flota (30 días)', tipo: 'moneda', roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        nota: 'Combustible, peajes, viáticos y depreciación',
        calcular: function (ctx) {
          var vs = viajesEntregados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), km = ctx.suma(vs, function (v) { return v.totales.km; });
          return km > 0 ? ctx.redondear(ctx.suma(vs, function (v) { return v.totales.costoTotal; }) / km) : null;
        }
      },
      {
        titulo: 'Alertas de vencimiento', tipo: 'entero', roles: ['admin', 'gerente', 'despachador', 'conductor', 'auditor'],
        nota: 'Documentos y mantenimientos vencidos o por vencer',
        calcular: function (ctx) { return vencimientos(ctx, ctx.fechaMas(ctx.hoy(), ctx.param('avisoDias')), false).length; }
      }
    ],

    tableroGrafico: {
      titulo: 'Kilómetros recorridos por mes (viajes entregados)', tipo: 'columnas', formato: 'entero',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), vs = viajesEntregados(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(vs, function (v) { return ctx.mes(v.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(Math.round(ctx.suma(g[meses[i]] || [], function (v) { return v.totales.km; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      vehiculos: VEHICULOS,
      conductores: [
        { id: 'CON-0001', dni: '29876541', nombre: 'Abel Mamani Quispe', licencia: 'Q29876541', categoria: 'A-IIIc', licenciaVence: '@400', telefono: '954 110 223', fechaIngreso: '2016-02-01', sueldoBase: 2600, activo: true },
        { id: 'CON-0002', dni: '30412876', nombre: 'Benigno Condori Huanca', licencia: 'Q30412876', categoria: 'A-IIIc', licenciaVence: '@210', telefono: '954 118 334', fechaIngreso: '2015-06-15', sueldoBase: 2650, activo: true },
        { id: 'CON-0003', dni: '41208763', nombre: 'César Apaza Flores', licencia: 'Q41208763', categoria: 'A-IIIc', licenciaVence: '@-12', telefono: '954 227 118', fechaIngreso: '2018-09-03', sueldoBase: 2500, activo: true },
        { id: 'CON-0004', dni: '42517390', nombre: 'Dante Zegarra Paredes', licencia: 'Q42517390', categoria: 'A-IIIb', licenciaVence: '@90', telefono: '954 309 441', fechaIngreso: '2019-03-11', sueldoBase: 2300, activo: true },
        { id: 'CON-0005', dni: '29318450', nombre: 'Edgar Quispe Nina', licencia: 'Q29318450', categoria: 'A-IIIc', licenciaVence: '@25', telefono: '954 411 092', fechaIngreso: '2014-11-24', sueldoBase: 2700, activo: true },
        { id: 'CON-0006', dni: '40671283', nombre: 'Fidel Cutipa Mendoza', licencia: 'Q40671283', categoria: 'A-IIIc', licenciaVence: '@300', telefono: '954 502 217', fechaIngreso: '2017-05-08', sueldoBase: 2550, activo: true },
        { id: 'CON-0007', dni: '43095127', nombre: 'Germán Llerena Bustamante', licencia: 'Q43095127', categoria: 'A-IIIb', licenciaVence: '@520', telefono: '954 603 880', fechaIngreso: '2020-01-20', sueldoBase: 2350, activo: true },
        { id: 'CON-0008', dni: '31526049', nombre: 'Hilario Tapia Chambi', licencia: 'Q31526049', categoria: 'A-IIIc', licenciaVence: '@60', telefono: '954 704 556', fechaIngreso: '2013-08-12', sueldoBase: 2800, activo: true },
        { id: 'CON-0009', dni: '44017382', nombre: 'Iván Salas Ccama', licencia: 'Q44017382', categoria: 'A-IIIa', licenciaVence: '@180', telefono: '954 805 119', fechaIngreso: '2021-04-05', sueldoBase: 2200, activo: true },
        { id: 'CON-0010', dni: '28740615', nombre: 'Julio Pari Condori', licencia: 'Q28740615', categoria: 'A-IIIc', licenciaVence: '@365', telefono: '954 906 773', fechaIngreso: '2012-10-01', sueldoBase: 2750, activo: false },
        { id: 'CON-0011', dni: '45203968', nombre: 'Kevin Álvarez Huamaní', licencia: 'Q45203968', categoria: 'A-IIb', licenciaVence: '@270', telefono: '955 017 228', fechaIngreso: '2022-07-18', sueldoBase: 2100, activo: true },
        { id: 'CON-0012', dni: '40382751', nombre: 'Luis Aguilar Cáceres', licencia: 'Q40382751', categoria: 'A-IIIc', licenciaVence: '@140', telefono: '955 128 905', fechaIngreso: '2018-02-26', sueldoBase: 2450, activo: true }
      ],
      clientes: [
        { id: 'CLI-0001', ruc: '20512340011', nombre: 'Agroexportadora Majes S.A.C.', contacto: 'Carla Benavides', telefono: '054 281 100', email: 'logistica@agromajes.example.pe', ciudad: 'Arequipa', condicion: 'Crédito 30 días' },
        { id: 'CLI-0002', ruc: '20512340022', nombre: 'Minera Altiplano Sur S.A.', contacto: 'Ricardo Vizcarra', telefono: '054 243 770', email: 'compras@mineraaltiplano.example.pe', ciudad: 'Arequipa', condicion: 'Crédito 45 días' },
        { id: 'CLI-0003', ruc: '20512340033', nombre: 'Cementera Los Volcanes S.A.', contacto: 'Pilar Quiroz', telefono: '054 251 884', email: 'despachos@losvolcanes.example.pe', ciudad: 'Arequipa', condicion: 'Crédito 30 días' },
        { id: 'CLI-0004', ruc: '20512340044', nombre: 'Lácteos del Sur S.A.', contacto: 'Mauricio Neyra', telefono: '054 270 515', email: 'transporte@lacteosdelsur.example.pe', ciudad: 'Arequipa', condicion: 'Crédito 15 días' },
        { id: 'CLI-0005', ruc: '20512340055', nombre: 'Textil Alpaca Premium S.A.C.', contacto: 'Verónica Delgado', telefono: '054 233 906', email: 'envios@alpacapremium.example.pe', ciudad: 'Arequipa', condicion: 'Contado' },
        { id: 'CLI-0006', ruc: '20512340066', nombre: 'Distribuidora Nevado S.R.L.', contacto: 'Hernán Zeballos', telefono: '084 232 415', email: 'pedidos@distnevado.example.pe', ciudad: 'Cusco', condicion: 'Crédito 15 días' },
        { id: 'CLI-0007', ruc: '20512340077', nombre: 'Pesquera Ilo Mar S.A.C.', contacto: 'Janet Sosa', telefono: '053 481 220', email: 'flota@pesquerailomar.example.pe', ciudad: 'Ilo', condicion: 'Crédito 30 días' },
        { id: 'CLI-0008', ruc: '20512340088', nombre: 'Constructora Sillar S.A.', contacto: 'Fabián Cuadros', telefono: '054 265 904', email: 'obras@constructorasillar.example.pe', ciudad: 'Arequipa', condicion: 'Crédito 30 días' },
        { id: 'CLI-0009', ruc: '20512340099', nombre: 'Agroindustria Colca E.I.R.L.', contacto: 'Nelly Huarca', telefono: '054 238 266', email: 'ventas@agrocolca.example.pe', ciudad: 'Arequipa', condicion: 'Contado' },
        { id: 'CLI-0010', ruc: '20512340100', nombre: 'Comercial Titicaca S.A.C.', contacto: 'Percy Mamani', telefono: '051 321 640', email: 'compras@comtiticaca.example.pe', ciudad: 'Juliaca', condicion: 'Crédito 15 días' },
        { id: 'CLI-0011', ruc: '20512340111', nombre: 'Ferretería Industrial Andina S.A.C.', contacto: 'Olga Rivas', telefono: '052 242 118', email: 'logistica@ferreandina.example.pe', ciudad: 'Tacna', condicion: 'Crédito 30 días' },
        { id: 'CLI-0012', ruc: '20512340122', nombre: 'Cervecera del Misti S.A.', contacto: 'Álvaro Pinto', telefono: '054 255 330', email: 'distribucion@cervecerasur.example.pe', ciudad: 'Arequipa', condicion: 'Crédito 45 días' }
      ],
      rutas: RUTAS,
      viajes: armarViajes(),
      mantenimientos: armarMantenimientos()
    }
  };
})();
