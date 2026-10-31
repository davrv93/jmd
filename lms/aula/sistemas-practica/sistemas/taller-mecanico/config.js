/*
 * Taller Automotriz Los Andes · Órdenes de trabajo (Huancayo)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «taller-mecanico». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC, DNI y placas de ejemplo) y no corresponden a
 * personas, empresas ni vehículos reales. Todo el código es ES5.
 *
 * Idea del negocio: el cliente deja su vehículo, el asesor abre una orden de
 * trabajo (OT) con el servicio, el mecánico y los repuestos; al emitirla pasa a
 * «En proceso» y se descuenta el stock. La mano de obra se cobra por TIEMPO
 * ESTÁNDAR del servicio × tarifa por hora del mecánico.
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

  /* Una orden «facturable» ya está terminada o entregada; «En proceso» es trabajo en curso. */
  function esCerrada(o) { return o.estado === 'Terminada' || o.estado === 'Entregada'; }
  function consumioStock(o) { return o.estado === 'En proceso' || esCerrada(o); }

  function enRango(o, desde, hasta) { return (!desde || o.fecha >= desde) && (!hasta || o.fecha <= hasta); }

  function ordenesCerradas(ctx, desde, hasta) {
    return ctx.datos.listar('ordenes', function (o) { return esCerrada(o) && enRango(o, desde, hasta); });
  }

  /* Servicios de una orden: el principal y, si es distinto, el adicional. */
  function serviciosDe(doc, ctx) {
    var r = [], s1 = doc.servicio ? ctx.datos.obtener('servicios', doc.servicio) : null;
    var s2 = doc.servicio2 && doc.servicio2 !== doc.servicio ? ctx.datos.obtener('servicios', doc.servicio2) : null;
    if (s1) { r.push(s1); }
    if (s2) { r.push(s2); }
    return r;
  }

  /*
   * Mano de obra = tiempo estándar de los servicios × tarifa por hora del mecánico.
   * Si la atención es urgente se suma un recargo (parámetro) sobre esa mano de obra.
   * La comisión del técnico es un % de la mano de obra facturada; si terminó en
   * menos horas que el estándar gana además un bono de eficiencia (parámetro).
   */
  function manoDeObra(doc, ctx) {
    var servicios = serviciosDe(doc, ctx), horas = ctx.suma(servicios, function (s) { return s.tiempoEstandar; });
    var mec = doc.mecanico ? ctx.datos.obtener('mecanicos', doc.mecanico) : null;
    var tarifa = mec ? mec.tarifaHora : 0;
    var base = ctx.redondear(horas * tarifa);
    var recargo = doc.urgente ? ctx.redondear(base * ctx.param('recargoUrgente') / 100) : 0;
    var pct = mec && mec.comisionPct !== undefined ? mec.comisionPct : 0;
    if (mec && doc.horasReales > 0 && doc.horasReales <= horas) { pct = pct + ctx.param('bonoEficiencia'); }
    return { horas: horas, base: base, recargo: recargo, pctComision: pct, comision: ctx.redondear((base + recargo) * pct / 100) };
  }

  /* Kilómetros que faltan para el próximo mantenimiento (negativo = ya pasó). */
  function kmRestantes(v) { return (v.ultimoMantKm || 0) + v.intervaloKm - v.kmActual; }

  function situacionMant(v, ctx) {
    var resta = kmRestantes(v);
    if (resta <= 0) { return 'Vencido'; }
    return resta <= ctx.param('avisoKm') ? 'Próximo' : 'Al día';
  }

  function repuestoBajo(r) { return r.activo !== false && r.stock <= r.stockMin; }

  /* ---------- Datos de demostración ---------- */

  var VEHICULOS = [
    { id: 'VEH-0001', placa: 'BHK-412', cliente: 'CLI-0001', marca: 'Toyota', modelo: 'Hilux 4x4', anio: 2019, color: 'Blanco', combustible: 'Diésel', kmActual: 86400, intervaloKm: 10000, ultimoMantKm: 80200 },
    { id: 'VEH-0002', placa: 'C4T-708', cliente: 'CLI-0002', marca: 'Hyundai', modelo: 'H100 furgón', anio: 2017, color: 'Blanco', combustible: 'Diésel', kmActual: 142300, intervaloKm: 5000, ultimoMantKm: 136800 },
    { id: 'VEH-0003', placa: 'D2M-155', cliente: 'CLI-0002', marca: 'Kia', modelo: 'K2700 baranda', anio: 2018, color: 'Plata', combustible: 'Diésel', kmActual: 118900, intervaloKm: 5000, ultimoMantKm: 115200 },
    { id: 'VEH-0004', placa: 'B7R-930', cliente: 'CLI-0002', marca: 'Hyundai', modelo: 'Porter', anio: 2020, color: 'Blanco', combustible: 'Diésel', kmActual: 97650, intervaloKm: 5000, ultimoMantKm: 92100 },
    { id: 'VEH-0005', placa: 'AXE-246', cliente: 'CLI-0003', marca: 'Toyota', modelo: 'Hiace', anio: 2021, color: 'Blanco', combustible: 'Diésel', kmActual: 74200, intervaloKm: 10000, ultimoMantKm: 70100 },
    { id: 'VEH-0006', placa: 'F3P-518', cliente: 'CLI-0003', marca: 'Nissan', modelo: 'Frontier', anio: 2016, color: 'Gris', combustible: 'Diésel', kmActual: 168800, intervaloKm: 10000, ultimoMantKm: 158000 },
    { id: 'VEH-0007', placa: 'H9L-377', cliente: 'CLI-0004', marca: 'Suzuki', modelo: 'Swift', anio: 2020, color: 'Rojo', combustible: 'Gasolina', kmActual: 41200, intervaloKm: 5000, ultimoMantKm: 38600 },
    { id: 'VEH-0008', placa: 'CBA-621', cliente: 'CLI-0005', marca: 'Isuzu', modelo: 'NPR', anio: 2015, color: 'Blanco', combustible: 'Diésel', kmActual: 203500, intervaloKm: 10000, ultimoMantKm: 194000 },
    { id: 'VEH-0009', placa: 'J5N-084', cliente: 'CLI-0006', marca: 'Chevrolet', modelo: 'Sail', anio: 2018, color: 'Plata', combustible: 'Gasolina', kmActual: 78900, intervaloKm: 5000, ultimoMantKm: 74000 },
    { id: 'VEH-0010', placa: 'E8V-452', cliente: 'CLI-0007', marca: 'Kia', modelo: 'Rio', anio: 2019, color: 'Azul', combustible: 'Gasolina', kmActual: 55300, intervaloKm: 7500, ultimoMantKm: 47000 },
    { id: 'VEH-0011', placa: 'K2D-799', cliente: 'CLI-0008', marca: 'Mitsubishi', modelo: 'L200', anio: 2018, color: 'Negro', combustible: 'Diésel', kmActual: 131200, intervaloKm: 10000, ultimoMantKm: 125000 },
    { id: 'VEH-0012', placa: 'G6W-163', cliente: 'CLI-0008', marca: 'Toyota', modelo: 'Hilux 4x4', anio: 2022, color: 'Gris', combustible: 'Diésel', kmActual: 52800, intervaloKm: 10000, ultimoMantKm: 50500 },
    { id: 'VEH-0013', placa: 'M1Z-840', cliente: 'CLI-0009', marca: 'Mazda', modelo: 'CX-5', anio: 2020, color: 'Rojo', combustible: 'Gasolina', kmActual: 62100, intervaloKm: 10000, ultimoMantKm: 59000 },
    { id: 'VEH-0014', placa: 'L7S-205', cliente: 'CLI-0010', marca: 'Volkswagen', modelo: 'Gol', anio: 2014, color: 'Plata', combustible: 'Gasolina', kmActual: 189000, intervaloKm: 5000, ultimoMantKm: 183500 },
    { id: 'VEH-0015', placa: 'N4C-611', cliente: 'CLI-0012', marca: 'Hino', modelo: 'Serie 300', anio: 2019, color: 'Blanco', combustible: 'Diésel', kmActual: 112300, intervaloKm: 10000, ultimoMantKm: 104800 },
    { id: 'VEH-0016', placa: 'P9Y-370', cliente: 'CLI-0012', marca: 'JAC', modelo: 'X200', anio: 2021, color: 'Blanco', combustible: 'Diésel', kmActual: 68900, intervaloKm: 10000, ultimoMantKm: 61000 },
    { id: 'VEH-0017', placa: 'Q3B-926', cliente: 'CLI-0013', marca: 'Hyundai', modelo: 'Tucson', anio: 2021, color: 'Blanco', combustible: 'Gasolina', kmActual: 38700, intervaloKm: 10000, ultimoMantKm: 30400 },
    { id: 'VEH-0018', placa: 'R8E-148', cliente: 'CLI-0014', marca: 'Toyota', modelo: 'Yaris', anio: 2017, color: 'Gris', combustible: 'Gasolina', kmActual: 96300, intervaloKm: 5000, ultimoMantKm: 90200 }
  ];

  var POR_VEH = {};
  (function () { var i; for (i = 0; i < VEHICULOS.length; i++) { POR_VEH[VEHICULOS[i].id] = VEHICULOS[i]; } })();

  var REPUESTOS = [
    { id: 'REP-0001', codigo: 'FIL-ACE-01', nombre: 'Filtro de aceite universal', categoria: 'Filtros', marca: 'Bosch', costo: 11.5, precio: 19, stock: 40, stockMin: 10, ubicacion: 'A-01', activo: true },
    { id: 'REP-0002', codigo: 'ACE-5W30', nombre: 'Aceite sintético 5W-30 (litro)', categoria: 'Lubricantes', marca: 'Mobil', costo: 29, precio: 45, stock: 80, stockMin: 24, ubicacion: 'B-02', activo: true },
    { id: 'REP-0003', codigo: 'ACE-15W40', nombre: 'Aceite 15W-40 diésel (litro)', categoria: 'Lubricantes', marca: 'Shell', costo: 21, precio: 34, stock: 90, stockMin: 24, ubicacion: 'B-01', activo: true },
    { id: 'REP-0004', codigo: 'FIL-AIR-02', nombre: 'Filtro de aire de motor', categoria: 'Filtros', marca: 'Bosch', costo: 18, precio: 32, stock: 22, stockMin: 6, ubicacion: 'A-02', activo: true },
    { id: 'REP-0005', codigo: 'FIL-COM-03', nombre: 'Filtro de combustible diésel', categoria: 'Filtros', marca: 'Donaldson', costo: 26, precio: 45, stock: 14, stockMin: 5, ubicacion: 'A-03', activo: true },
    { id: 'REP-0006', codigo: 'PAS-DEL-01', nombre: 'Pastillas de freno delanteras', categoria: 'Frenos', marca: 'Bendix', costo: 78, precio: 135, stock: 12, stockMin: 4, ubicacion: 'C-01', activo: true },
    { id: 'REP-0007', codigo: 'PAS-TRA-01', nombre: 'Pastillas de freno traseras', categoria: 'Frenos', marca: 'Bendix', costo: 64, precio: 110, stock: 9, stockMin: 4, ubicacion: 'C-02', activo: true },
    { id: 'REP-0008', codigo: 'DIS-FRE-01', nombre: 'Disco de freno ventilado', categoria: 'Frenos', marca: 'Brembo', costo: 145, precio: 240, stock: 6, stockMin: 2, ubicacion: 'C-03', activo: true },
    { id: 'REP-0009', codigo: 'AMO-DEL-01', nombre: 'Amortiguador delantero', categoria: 'Suspensión', marca: 'Monroe', costo: 190, precio: 310, stock: 5, stockMin: 2, ubicacion: 'D-01', activo: true },
    { id: 'REP-0010', codigo: 'BUJ-IRI-04', nombre: 'Bujía de iridio (unidad)', categoria: 'Encendido', marca: 'NGK', costo: 24, precio: 42, stock: 36, stockMin: 12, ubicacion: 'E-01', activo: true },
    { id: 'REP-0011', codigo: 'BAT-12V-60', nombre: 'Batería 12V 60Ah', categoria: 'Eléctrico', marca: 'Etna', costo: 310, precio: 470, stock: 4, stockMin: 2, ubicacion: 'F-01', activo: true },
    { id: 'REP-0012', codigo: 'COR-DIS-01', nombre: 'Kit de correa de distribución', categoria: 'Motor', marca: 'Gates', costo: 260, precio: 420, stock: 3, stockMin: 2, ubicacion: 'G-01', activo: true },
    { id: 'REP-0013', codigo: 'EMB-KIT-01', nombre: 'Kit de embrague', categoria: 'Transmisión', marca: 'Sachs', costo: 520, precio: 840, stock: 2, stockMin: 1, ubicacion: 'G-02', activo: true },
    { id: 'REP-0014', codigo: 'REF-ANT-01', nombre: 'Refrigerante concentrado (galón)', categoria: 'Motor', marca: 'Prestone', costo: 32, precio: 55, stock: 15, stockMin: 5, ubicacion: 'B-03', activo: true },
    { id: 'REP-0015', codigo: 'NEU-185-65', nombre: 'Neumático 185/65 R15', categoria: 'Neumáticos', marca: 'Bridgestone', costo: 245, precio: 380, stock: 8, stockMin: 4, ubicacion: 'H-01', activo: true },
    { id: 'REP-0016', codigo: 'LIQ-FRE-D4', nombre: 'Líquido de frenos DOT 4 (500 ml)', categoria: 'Frenos', marca: 'Castrol', costo: 14, precio: 26, stock: 18, stockMin: 6, ubicacion: 'B-04', activo: true },
    { id: 'REP-0017', codigo: 'ESC-LIM-01', nombre: 'Escobillas limpiaparabrisas (par)', categoria: 'Eléctrico', marca: 'Bosch', costo: 22, precio: 38, stock: 3, stockMin: 5, ubicacion: 'F-02', activo: true },
    { id: 'REP-0018', codigo: 'FOC-LED-H4', nombre: 'Foco LED H4 (par)', categoria: 'Eléctrico', marca: 'Philips', costo: 48, precio: 85, stock: 2, stockMin: 4, ubicacion: 'F-03', activo: true },
    { id: 'REP-0019', codigo: 'CON-BAL-01', nombre: 'Contrapesos adhesivos de balanceo (juego)', categoria: 'Neumáticos', marca: 'Hofmann', costo: 9, precio: 18, stock: 30, stockMin: 8, ubicacion: 'H-02', activo: true },
    { id: 'REP-0020', codigo: 'INS-TAL-01', nombre: 'Consumibles de taller (kit)', categoria: 'Lubricantes', marca: 'Taller', costo: 6, precio: 12, stock: 200, stockMin: 40, ubicacion: 'B-05', activo: true }
  ];

  var PRECIOS = {};
  (function () { var i; for (i = 0; i < REPUESTOS.length; i++) { PRECIOS[REPUESTOS[i].id] = REPUESTOS[i].precio; } })();

  /* Falla o motivo de ingreso según el servicio principal. */
  var MOTIVOS = {
    'SRV-0001': 'Cambio de aceite y filtro por kilometraje.',
    'SRV-0002': 'Mantenimiento preventivo completo según manual.',
    'SRV-0003': 'Frenos con ruido y pedal largo.',
    'SRV-0004': 'Vibración al frenar; se revisan discos.',
    'SRV-0005': 'Rebote excesivo en pistas irregulares.',
    'SRV-0006': 'Cambio preventivo de correa por kilometraje.',
    'SRV-0007': 'Luz de motor encendida; requiere lectura de códigos.',
    'SRV-0008': 'No arranca por las mañanas.',
    'SRV-0009': 'El volante vibra a más de 80 km/h.',
    'SRV-0010': 'El embrague patina en subida.',
    'SRV-0011': 'Consumo alto de combustible y marcha irregular.'
  };

  /*
   * Fila de orden: [días atrás, vehículo, servicio, servicio adicional, mecánico, urgente (0/1),
   *                 horas reales (0 = sin dato), estado, [[repuesto, cantidad]]]
   */
  var ORDENES = [
    [176, 'VEH-0001', 'SRV-0001', '', 'MEC-0002', 0, 0.8, 'Entregada', [['REP-0001', 1], ['REP-0003', 8]]],
    [172, 'VEH-0007', 'SRV-0001', '', 'MEC-0004', 0, 1.0, 'Entregada', [['REP-0001', 1], ['REP-0002', 4]]],
    [168, 'VEH-0002', 'SRV-0002', '', 'MEC-0001', 0, 2.4, 'Entregada', [['REP-0001', 1], ['REP-0003', 7], ['REP-0004', 1], ['REP-0005', 1]]],
    [163, 'VEH-0009', 'SRV-0003', 'SRV-0001', 'MEC-0002', 0, 2.6, 'Entregada', [['REP-0006', 1], ['REP-0016', 1], ['REP-0001', 1], ['REP-0002', 4]]],
    [158, 'VEH-0005', 'SRV-0009', '', 'MEC-0004', 0, 1.3, 'Entregada', [['REP-0019', 4], ['REP-0020', 1]]],
    [154, 'VEH-0006', 'SRV-0010', '', 'MEC-0006', 0, 7.5, 'Entregada', [['REP-0013', 1], ['REP-0020', 1]]],
    [149, 'VEH-0013', 'SRV-0002', '', 'MEC-0003', 0, 2.5, 'Entregada', [['REP-0001', 1], ['REP-0002', 5], ['REP-0004', 1], ['REP-0010', 4]]],
    [145, 'VEH-0014', 'SRV-0005', '', 'MEC-0002', 0, 3.1, 'Entregada', [['REP-0009', 2], ['REP-0020', 1]]],
    [140, 'VEH-0011', 'SRV-0003', '', 'MEC-0002', 1, 1.4, 'Entregada', [['REP-0006', 1], ['REP-0016', 1]]],
    [136, 'VEH-0003', 'SRV-0001', '', 'MEC-0005', 0, 1.1, 'Entregada', [['REP-0001', 1], ['REP-0003', 7]]],
    [131, 'VEH-0010', 'SRV-0007', '', 'MEC-0003', 0, 1.0, 'Entregada', [['REP-0020', 1]]],
    [127, 'VEH-0015', 'SRV-0002', '', 'MEC-0001', 0, 2.7, 'Entregada', [['REP-0001', 1], ['REP-0003', 8], ['REP-0004', 1], ['REP-0005', 1]]],
    [122, 'VEH-0008', 'SRV-0004', 'SRV-0003', 'MEC-0006', 0, 3.4, 'Entregada', [['REP-0008', 2], ['REP-0006', 1], ['REP-0016', 2]]],
    [118, 'VEH-0016', 'SRV-0001', '', 'MEC-0004', 0, 0.8, 'Entregada', [['REP-0001', 1], ['REP-0003', 8]]],
    [113, 'VEH-0018', 'SRV-0008', '', 'MEC-0003', 1, 0.9, 'Entregada', [['REP-0011', 1]]],
    [109, 'VEH-0012', 'SRV-0001', '', 'MEC-0002', 0, 0.8, 'Entregada', [['REP-0001', 1], ['REP-0003', 8]]],
    [104, 'VEH-0004', 'SRV-0002', '', 'MEC-0001', 0, 3.0, 'Entregada', [['REP-0001', 1], ['REP-0003', 7], ['REP-0004', 1]]],
    [100, 'VEH-0017', 'SRV-0001', 'SRV-0009', 'MEC-0004', 0, 2.2, 'Entregada', [['REP-0001', 1], ['REP-0002', 4], ['REP-0019', 4]]],
    [96, 'VEH-0001', 'SRV-0003', '', 'MEC-0002', 0, 1.5, 'Entregada', [['REP-0006', 1], ['REP-0016', 1]]],
    [91, 'VEH-0009', 'SRV-0009', '', 'MEC-0005', 0, 1.4, 'Anulada', [['REP-0019', 4]]],
    [88, 'VEH-0006', 'SRV-0006', '', 'MEC-0001', 0, 5.0, 'Entregada', [['REP-0012', 1], ['REP-0014', 2], ['REP-0020', 1]]],
    [83, 'VEH-0013', 'SRV-0003', 'SRV-0009', 'MEC-0002', 0, 2.7, 'Entregada', [['REP-0006', 1], ['REP-0007', 1], ['REP-0016', 1], ['REP-0019', 4]]],
    [78, 'VEH-0002', 'SRV-0003', '', 'MEC-0005', 1, 1.8, 'Entregada', [['REP-0006', 1], ['REP-0016', 1]]],
    [73, 'VEH-0007', 'SRV-0011', '', 'MEC-0001', 0, 3.2, 'Entregada', [['REP-0010', 4], ['REP-0004', 1], ['REP-0020', 1]]],
    [68, 'VEH-0011', 'SRV-0001', '', 'MEC-0004', 0, 0.7, 'Entregada', [['REP-0001', 1], ['REP-0003', 8]]],
    [63, 'VEH-0015', 'SRV-0005', '', 'MEC-0006', 0, 2.6, 'Entregada', [['REP-0009', 2], ['REP-0020', 1]]],
    [58, 'VEH-0005', 'SRV-0001', '', 'MEC-0002', 0, 0.8, 'Entregada', [['REP-0001', 1], ['REP-0003', 8]]],
    [53, 'VEH-0014', 'SRV-0003', '', 'MEC-0002', 0, 1.6, 'Entregada', [['REP-0006', 1], ['REP-0016', 1]]],
    [47, 'VEH-0010', 'SRV-0001', '', 'MEC-0005', 0, 0.9, 'Anulada', [['REP-0001', 1], ['REP-0002', 4]]],
    [42, 'VEH-0018', 'SRV-0001', 'SRV-0009', 'MEC-0004', 0, 2.1, 'Entregada', [['REP-0001', 1], ['REP-0002', 4], ['REP-0019', 4]]],
    [36, 'VEH-0003', 'SRV-0005', '', 'MEC-0006', 0, 2.8, 'Entregada', [['REP-0009', 2], ['REP-0020', 1]]],
    [30, 'VEH-0012', 'SRV-0002', '', 'MEC-0003', 0, 2.4, 'Entregada', [['REP-0001', 1], ['REP-0003', 8], ['REP-0004', 1], ['REP-0005', 1]]],
    [24, 'VEH-0008', 'SRV-0008', '', 'MEC-0003', 1, 0.7, 'Entregada', [['REP-0011', 1]]],
    [19, 'VEH-0016', 'SRV-0003', '', 'MEC-0002', 0, 1.5, 'Entregada', [['REP-0006', 1], ['REP-0016', 1]]],
    [14, 'VEH-0001', 'SRV-0007', '', 'MEC-0003', 0, 1.2, 'Entregada', [['REP-0020', 1]]],
    [9, 'VEH-0017', 'SRV-0009', '', 'MEC-0004', 0, 1.3, 'Entregada', [['REP-0019', 4]]],
    [6, 'VEH-0004', 'SRV-0001', '', 'MEC-0005', 0, 1.0, 'Terminada', [['REP-0001', 1], ['REP-0003', 7]]],
    [5, 'VEH-0018', 'SRV-0003', '', 'MEC-0002', 0, 1.6, 'Terminada', [['REP-0006', 1], ['REP-0016', 1]]],
    [3, 'VEH-0006', 'SRV-0004', '', 'MEC-0006', 0, 0, 'En proceso', [['REP-0008', 2], ['REP-0016', 1]]],
    [2, 'VEH-0002', 'SRV-0002', '', 'MEC-0001', 1, 0, 'En proceso', [['REP-0001', 1], ['REP-0003', 7], ['REP-0004', 1]]],
    [1, 'VEH-0014', 'SRV-0001', '', 'MEC-0004', 0, 0, 'En proceso', [['REP-0001', 1], ['REP-0002', 4]]],
    [1, 'VEH-0009', 'SRV-0001', '', 'MEC-0002', 0, 0, 'Recibida', [['REP-0001', 1], ['REP-0002', 4]]],
    [0, 'VEH-0013', 'SRV-0007', '', 'MEC-0003', 0, 0, 'Recibida', [['REP-0020', 1]]]
  ];

  /* Fila de compra: [días atrás, proveedor, condición, referencia, estado, [[repuesto, cantidad, costo unitario]]] */
  var COMPRAS = [
    [174, 'Lubricantes del Centro S.A.C.', 'Crédito 30 días', 'F-2201', 'Emitida', [['REP-0002', 60, 28.5], ['REP-0003', 80, 20.5]]],
    [150, 'Frenos y Embragues Andinos S.R.L.', 'Contado', 'F-0877', 'Emitida', [['REP-0006', 12, 77], ['REP-0007', 8, 63], ['REP-0008', 6, 144]]],
    [126, 'Filtros Perú Import E.I.R.L.', 'Crédito 30 días', 'GR-3340', 'Emitida', [['REP-0001', 40, 11.2], ['REP-0004', 20, 17.5], ['REP-0005', 12, 25.5]]],
    [101, 'Suspensión Total S.A.', 'Crédito 60 días', 'F-5512', 'Emitida', [['REP-0009', 6, 188], ['REP-0013', 2, 515], ['REP-0012', 3, 258]]],
    [77, 'Baterías Etna Huancayo', 'Contado', 'F-0231', 'Emitida', [['REP-0011', 4, 305]]],
    [55, 'Lubricantes del Centro S.A.C.', 'Crédito 30 días', 'F-2288', 'Emitida', [['REP-0002', 40, 29.5], ['REP-0003', 50, 21.5], ['REP-0014', 12, 31.5]]],
    [34, 'Neumáticos del Valle S.A.C.', 'Crédito 30 días', 'F-9019', 'Emitida', [['REP-0015', 8, 243]]],
    [18, 'Autopartes Eléctricas Junín', 'Contado', 'F-1450', 'Emitida', [['REP-0017', 12, 21.5], ['REP-0018', 8, 47], ['REP-0010', 24, 23.5]]],
    [4, 'Filtros Perú Import E.I.R.L.', 'Crédito 30 días', 'GR-3412', 'Borrador', [['REP-0001', 30, 11.4], ['REP-0004', 12, 17.8]]]
  ];

  function dosDigitos(n) { return n < 10 ? '0' + n : String(n); }

  function armarOrdenes() {
    var r = [], i, f, v, ls, j, km, doc;
    for (i = 0; i < ORDENES.length; i++) {
      f = ORDENES[i];
      v = POR_VEH[f[1]];
      ls = [];
      for (j = 0; j < f[8].length; j++) { ls.push({ item: f[8][j][0], cantidad: f[8][j][1], precio: PRECIOS[f[8][j][0]] }); }
      km = Math.max(1000, Math.round((v.kmActual - f[0] * 28) / 10) * 10);
      doc = { id: 'OTR-00' + dosDigitos(i + 1), fecha: '@-' + f[0], cliente: v.cliente, vehiculo: f[1], servicio: f[2], mecanico: f[4], kilometraje: km, urgente: f[5] === 1, falla: MOTIVOS[f[2]], estado: f[7], lineas: ls };
      if (f[3]) { doc.servicio2 = f[3]; }
      if (f[6] > 0) { doc.horasReales = f[6]; }
      if (f[7] === 'Anulada') { doc.motivoAnulacion = 'El cliente retiró el vehículo antes de iniciar el trabajo.'; }
      r.push(doc);
    }
    return r;
  }

  function armarCompras() {
    var r = [], i, f, ls, j;
    for (i = 0; i < COMPRAS.length; i++) {
      f = COMPRAS[i];
      ls = [];
      for (j = 0; j < f[5].length; j++) { ls.push({ item: f[5][j][0], cantidad: f[5][j][1], precio: f[5][j][2] }); }
      r.push({ id: 'CPR-000' + (i + 1), fecha: '@-' + f[0], proveedor: f[1], condicion: f[2], referencia: f[3], estado: f[4], lineas: ls });
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'taller-mecanico',
    nombre: 'Taller Automotriz Los Andes',
    rubro: 'Taller mecánico y venta de repuestos',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#1f3a5f', acento: '#f2a900', siglas: 'LA' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma a órdenes y compras.' },
      { id: 'recargoUrgente', etiqueta: 'Recargo por atención urgente', tipo: 'porcentaje', valor: 25, ayuda: 'Se suma a la mano de obra cuando el cliente pide que el vehículo salga el mismo día.' },
      { id: 'bonoEficiencia', etiqueta: 'Bono de eficiencia del técnico (puntos de comisión)', tipo: 'porcentaje', valor: 2, ayuda: 'Puntos extra de comisión si el mecánico termina en un tiempo igual o menor al estándar.' },
      { id: 'avisoKm', etiqueta: 'Aviso de mantenimiento (km de anticipación)', tipo: 'entero', valor: 500, ayuda: 'Un vehículo figura como «Próximo» cuando le faltan estos kilómetros o menos.' },
      { id: 'margenMinimo', etiqueta: 'Margen mínimo sobre costo de los repuestos', tipo: 'porcentaje', valor: 25, ayuda: 'Al comprar, el precio de venta sube si queda por debajo de este margen sobre el nuevo costo.' }
    ],

    seguridad: {
      minClave: 6,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: false,
      exportaRespetaPermisos: true,
      cspMeta: false
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, órdenes, compras, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'jefe', nombre: 'Jefe de taller', descripcion: 'Ve todo el taller, administra mecánicos y servicios, avanza las órdenes y consulta productividad y márgenes. No anula ni elimina.' },
      { id: 'asesor', nombre: 'Asesor de servicio', descripcion: 'Atiende al cliente: registra clientes y vehículos, abre órdenes de trabajo y las entrega. No ve costos ni comisiones.' },
      { id: 'mecanico', nombre: 'Mecánico', descripcion: 'Consulta vehículos, repuestos y órdenes, y hace avanzar el estado de las órdenes que atiende. No crea ni edita nada más.' },
      { id: 'almacen', nombre: 'Encargado de almacén', descripcion: 'Administra el inventario de repuestos y registra las compras que suben el stock. Ve costos, no ve clientes.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el taller y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Carmen Huaranga Lozano', rol: 'admin', clave: 'Andes#2026ad' },
      { usuario: 'jefe', nombre: 'Marco Tello Cárdenas', rol: 'jefe', clave: 'Andes#2026jf' },
      { usuario: 'asesor', nombre: 'Lucero Sedano Meza', rol: 'asesor', clave: 'Andes#2026as' },
      { usuario: 'mecanico', nombre: 'Teófilo Rojas Aguilar', rol: 'mecanico', clave: 'Andes#2026mc' },
      { usuario: 'almacen', nombre: 'Pedro Cusi Alarcón', rol: 'almacen', clave: 'Andes#2026al' },
      { usuario: 'auditor', nombre: 'Nelly Baldeón Cerrón', rol: 'auditor', clave: 'Andes#2026au' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'documento', etiqueta: 'DNI o RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^([0-9]{8}|[0-9]{11})$', mensajePatron: 'Escribe un DNI de 8 dígitos o un RUC de 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre o razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'tipo', etiqueta: 'Tipo de cliente', tipo: 'lista', requerido: true, opciones: ['Particular', 'Flota empresarial'], defecto: 'Particular' },
          { id: 'distrito', etiqueta: 'Distrito', tipo: 'lista', opciones: ['Huancayo', 'El Tambo', 'Chilca', 'Pilcomayo', 'San Agustín de Cajas', 'Sapallanga', 'Hualhuas', 'Chupaca'] },
          { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto', max: 120 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 }
        ],
        lista: ['documento', 'nombre', 'tipo', 'distrito', 'telefono', 'facturado'],
        buscar: ['documento', 'nombre', 'distrito', 'email'],
        calculados: [
          {
            id: 'facturado', etiqueta: 'Facturado en órdenes', tipo: 'moneda',
            formula: function (r, ctx) {
              var ordenes = ctx.datos.listar('ordenes', function (o) { return o.cliente === r.id && esCerrada(o); });
              return ctx.redondear(ctx.suma(ordenes, function (o) { return o.totales ? o.totales.total : 0; }));
            }
          }
        ],
        permisos: { ver: ['admin', 'jefe', 'asesor', 'auditor'], crear: ['admin', 'asesor'], editar: ['admin', 'asesor'], eliminar: ['admin'] }
      },
      {
        id: 'vehiculos', nombre: 'Vehículo', plural: 'Vehículos', prefijo: 'VEH',
        campos: [
          { id: 'placa', etiqueta: 'Placa', tipo: 'texto', requerido: true, unico: true, max: 7, patron: '^[A-Z0-9]{3}-?[A-Z0-9]{3}$', mensajePatron: 'La placa lleva 6 caracteres en mayúscula, por ejemplo ABC-123.' },
          { id: 'cliente', etiqueta: 'Propietario', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'marca', etiqueta: 'Marca', tipo: 'lista', requerido: true, opciones: ['Toyota', 'Hyundai', 'Kia', 'Nissan', 'Suzuki', 'Chevrolet', 'Mitsubishi', 'Volkswagen', 'Mazda', 'Isuzu', 'Hino', 'JAC', 'Otra'] },
          { id: 'modelo', etiqueta: 'Modelo', tipo: 'texto', requerido: true, max: 40 },
          { id: 'anio', etiqueta: 'Año de fabricación', tipo: 'entero', requerido: true, min: 1990, max: 2027 },
          { id: 'color', etiqueta: 'Color', tipo: 'texto', max: 20 },
          { id: 'combustible', etiqueta: 'Combustible', tipo: 'lista', opciones: ['Gasolina', 'Diésel', 'GLP', 'GNV', 'Híbrido'], defecto: 'Gasolina' },
          { id: 'kmActual', etiqueta: 'Kilometraje actual', tipo: 'entero', requerido: true, min: 0, ayuda: 'Se actualiza solo al emitir una orden con un kilometraje mayor.' },
          { id: 'intervaloKm', etiqueta: 'Intervalo de servicio (km)', tipo: 'entero', requerido: true, min: 1000, max: 30000, defecto: 5000, ayuda: 'Cada cuántos kilómetros toca el mantenimiento preventivo.' },
          { id: 'ultimoMantKm', etiqueta: 'Km del último mantenimiento', tipo: 'entero', min: 0, defecto: 0, ayuda: 'Se actualiza al emitir una orden con un servicio que reinicia el mantenimiento.' }
        ],
        lista: ['placa', 'cliente', 'marca', 'modelo', 'kmActual', 'proximoMant', 'situacion'],
        buscar: ['placa', 'marca', 'modelo'],
        calculados: [
          {
            id: 'proximoMant', etiqueta: 'Próximo mantenimiento (km)', tipo: 'entero',
            formula: function (r) { return (r.ultimoMantKm || 0) + r.intervaloKm; }
          },
          {
            id: 'situacion', etiqueta: 'Mantenimiento', tipo: 'texto',
            formula: function (r, ctx) { return situacionMant(r, ctx); }
          }
        ],
        reglas: [
          {
            id: 'mant-coherente', mensaje: 'El kilometraje del último mantenimiento no puede superar el kilometraje actual.',
            validar: function (r) { return !((r.ultimoMantKm || 0) > r.kmActual); }
          }
        ],
        permisos: { ver: ['admin', 'jefe', 'asesor', 'mecanico', 'auditor'], crear: ['admin', 'asesor'], editar: ['admin', 'asesor'], eliminar: ['admin'] }
      },
      {
        id: 'repuestos', nombre: 'Repuesto', plural: 'Repuestos', prefijo: 'REP',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Descripción', tipo: 'texto', requerido: true, max: 80 },
          { id: 'categoria', etiqueta: 'Categoría', tipo: 'lista', requerido: true, opciones: ['Lubricantes', 'Filtros', 'Frenos', 'Suspensión', 'Encendido', 'Eléctrico', 'Motor', 'Transmisión', 'Neumáticos'] },
          { id: 'marca', etiqueta: 'Marca', tipo: 'texto', max: 30 },
          { id: 'costo', etiqueta: 'Costo (sin IGV)', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'jefe', 'almacen', 'auditor'], ayuda: 'Último costo de compra; cambia al emitir una compra.' },
          { id: 'precio', etiqueta: 'Precio de venta (sin IGV)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'stock', etiqueta: 'Stock actual', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'entero', min: 0, requerido: true, defecto: 2, ayuda: 'En o por debajo de esta cantidad el repuesto aparece como stock bajo.' },
          { id: 'ubicacion', etiqueta: 'Ubicación en almacén', tipo: 'texto', max: 10 },
          { id: 'activo', etiqueta: 'Repuesto activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'categoria', 'precio', 'stock', 'situacion'],
        buscar: ['codigo', 'nombre', 'categoria', 'marca'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r) { return r.stock <= 0 ? 'Agotado' : (r.stock <= r.stockMin ? 'Stock bajo' : 'Normal'); }
          },
          {
            id: 'margenCosto', etiqueta: 'Margen sobre costo', tipo: 'porcentaje', ver: ['admin', 'jefe', 'almacen', 'auditor'],
            formula: function (r, ctx) { return r.costo > 0 ? ctx.redondear((r.precio - r.costo) / r.costo * 100) : null; }
          }
        ],
        reglas: [
          {
            id: 'precio-cubre-costo', mensaje: 'El precio de venta no puede ser menor al costo.',
            validar: function (r) { return !(r.costo !== undefined && r.precio < r.costo); }
          }
        ],
        permisos: { ver: ['admin', 'jefe', 'asesor', 'mecanico', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'mecanicos', nombre: 'Mecánico', plural: 'Mecánicos', prefijo: 'MEC',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'categoria', etiqueta: 'Categoría', tipo: 'lista', requerido: true, opciones: ['Maestro', 'Oficial', 'Ayudante'] },
          { id: 'especialidad', etiqueta: 'Especialidad', tipo: 'lista', opciones: ['Motor', 'Frenos y suspensión', 'Eléctrico y diagnóstico', 'Transmisión', 'Mantenimiento general'] },
          { id: 'tarifaHora', etiqueta: 'Tarifa por hora al cliente', tipo: 'moneda', min: 0, requerido: true, ayuda: 'Se multiplica por el tiempo estándar del servicio para cobrar la mano de obra.' },
          { id: 'comisionPct', etiqueta: 'Comisión sobre mano de obra', tipo: 'porcentaje', min: 0, max: 20, requerido: true, defecto: 6, ver: ['admin', 'jefe', 'auditor'] },
          { id: 'sueldoBase', etiqueta: 'Sueldo base mensual', tipo: 'moneda', min: 0, ver: ['admin', 'jefe', 'auditor'] },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' },
          { id: 'activo', etiqueta: 'Mecánico activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['nombre', 'categoria', 'especialidad', 'tarifaHora', 'comisionPct', 'activo'],
        buscar: ['nombre', 'dni', 'especialidad'],
        permisos: { ver: ['admin', 'jefe', 'asesor', 'auditor'], crear: ['admin', 'jefe'], editar: ['admin', 'jefe'], eliminar: ['admin'] }
      },
      {
        id: 'servicios', nombre: 'Servicio', plural: 'Servicios', prefijo: 'SRV',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre del servicio', tipo: 'texto', requerido: true, unico: true, max: 70 },
          { id: 'tipo', etiqueta: 'Tipo', tipo: 'lista', requerido: true, opciones: ['Mantenimiento', 'Frenos', 'Suspensión', 'Motor', 'Eléctrico', 'Transmisión', 'Neumáticos', 'Diagnóstico'] },
          { id: 'tiempoEstandar', etiqueta: 'Tiempo estándar (horas)', tipo: 'numero', requerido: true, min: 0.25, max: 40, ayuda: 'Tiempo de manual: es la base para cobrar la mano de obra, sin importar cuánto demore realmente.' },
          { id: 'reiniciaMant', etiqueta: 'Reinicia el mantenimiento', tipo: 'booleano', defecto: false, ayuda: 'Si está marcado, al emitir la orden el vehículo queda con su último mantenimiento en ese kilometraje.' }
        ],
        lista: ['nombre', 'tipo', 'tiempoEstandar', 'reiniciaMant'],
        buscar: ['nombre', 'tipo'],
        permisos: { ver: ['admin', 'jefe', 'asesor', 'mecanico', 'auditor'], crear: ['admin', 'jefe'], editar: ['admin', 'jefe'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'ordenes', nombre: 'Orden de trabajo', plural: 'Órdenes de trabajo', prefijo: 'OTR', serie: 'OT01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de ingreso', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'vehiculo', etiqueta: 'Vehículo (placa)', tipo: 'ref', entidad: 'vehiculos', mostrar: 'placa', requerido: true },
          { id: 'servicio', etiqueta: 'Servicio principal', tipo: 'ref', entidad: 'servicios', mostrar: 'nombre', requerido: true },
          { id: 'servicio2', etiqueta: 'Servicio adicional', tipo: 'ref', entidad: 'servicios', mostrar: 'nombre', ayuda: 'Opcional. Si repites el principal no se cobra dos veces.' },
          { id: 'mecanico', etiqueta: 'Mecánico asignado', tipo: 'ref', entidad: 'mecanicos', mostrar: 'nombre', requerido: true },
          { id: 'kilometraje', etiqueta: 'Kilometraje al ingresar', tipo: 'entero', requerido: true, min: 0 },
          { id: 'urgente', etiqueta: 'Atención urgente', tipo: 'booleano', defecto: false, ayuda: 'Suma el recargo por urgencia a la mano de obra.' },
          { id: 'horasReales', etiqueta: 'Horas reales (opcional)', tipo: 'numero', min: 0, max: 80, ayuda: 'Horas que marcó el técnico. Solo mide eficiencia: no cambia lo que se cobra.' },
          { id: 'falla', etiqueta: 'Falla reportada', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'vehiculo', 'mecanico'],
        estados: ['Recibida', 'En proceso', 'Terminada', 'Entregada', 'Anulada'],
        lineas: {
          entidad: 'repuestos', mostrar: 'nombre', precio: 'precio',
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 }],
          info: function (item) { return 'Stock disponible: ' + item.stock + ' · Precio: S/ ' + item.precio.toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var mo = manoDeObra(doc, ctx);
          var repuestos = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var costoRepuestos = ctx.redondear(ctx.suma(doc.lineas, function (l) {
            var r = ctx.datos.obtener('repuestos', l.item);
            return l.cantidad * (r && r.costo ? r.costo : 0);
          }));
          var subtotal = ctx.redondear(mo.base + mo.recargo + repuestos);
          var igv = ctx.redondear(subtotal * ctx.param('igv') / 100);
          return {
            manoObra: mo.base, recargo: mo.recargo, repuestos: repuestos, subtotal: subtotal, igv: igv, total: ctx.redondear(subtotal + igv),
            horasEstandar: mo.horas, comision: mo.comision, costoRepuestos: costoRepuestos,
            margen: ctx.redondear(subtotal - costoRepuestos - mo.comision)
          };
        },
        totales: [
          { id: 'manoObra', etiqueta: 'Mano de obra' },
          { id: 'recargo', etiqueta: 'Recargo por urgencia' },
          { id: 'repuestos', etiqueta: 'Repuestos' },
          { id: 'subtotal', etiqueta: 'Subtotal' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total a pagar', fuerte: true }
        ],
        reglas: [
          {
            id: 'vehiculo-del-cliente', mensaje: 'El vehículo elegido no pertenece a ese cliente.',
            validar: function (d, ctx) {
              var v = ctx.datos.obtener('vehiculos', d.vehiculo);
              return !!v && v.cliente === d.cliente;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var i, l, r, mec = ctx.datos.obtener('mecanicos', doc.mecanico), v = ctx.datos.obtener('vehiculos', doc.vehiculo), parche = {}, servicios, reinicia = false;
          if (!mec || mec.activo === false) { throw new Error('El mecánico asignado no está activo. Elige otro antes de emitir.'); }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            r = ctx.datos.obtener('repuestos', l.item);
            if (r.stock < l.cantidad) { throw new Error('Stock insuficiente de «' + r.nombre + '»: hay ' + r.stock + ' y la orden pide ' + l.cantidad + '.'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            r = ctx.datos.obtener('repuestos', l.item);
            ctx.datos.actualizar('repuestos', l.item, { stock: r.stock - l.cantidad });
          }
          /* El vehículo guarda el kilometraje más alto que se le conoce y, si el servicio lo pide, reinicia su mantenimiento. */
          servicios = serviciosDe(doc, ctx);
          for (i = 0; i < servicios.length; i++) { if (servicios[i].reiniciaMant) { reinicia = true; } }
          if (doc.kilometraje > v.kmActual) { parche.kmActual = doc.kilometraje; }
          if (reinicia && doc.kilometraje >= (v.ultimoMantKm || 0)) { parche.ultimoMantKm = doc.kilometraje; }
          if (parche.kmActual !== undefined || parche.ultimoMantKm !== undefined) { ctx.datos.actualizar('vehiculos', v.id, parche); }
        },
        alAnular: function (doc, ctx) {
          var i, l, r;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            r = ctx.datos.obtener('repuestos', l.item);
            ctx.datos.actualizar('repuestos', l.item, { stock: r.stock + l.cantidad });
          }
        },
        permisos: { ver: ['admin', 'jefe', 'asesor', 'mecanico', 'almacen', 'auditor'], crear: ['admin', 'asesor'], editar: ['admin', 'asesor'], emitir: ['admin', 'jefe', 'asesor', 'mecanico'], anular: ['admin'] }
      },
      {
        id: 'compras', nombre: 'Compra de repuestos', plural: 'Compras de repuestos', prefijo: 'CPR', serie: 'CR01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'texto', requerido: true, max: 70 },
          { id: 'condicion', etiqueta: 'Condición de pago', tipo: 'lista', requerido: true, opciones: ['Contado', 'Crédito 30 días', 'Crédito 60 días'], defecto: 'Contado' },
          { id: 'referencia', etiqueta: 'Guía o factura del proveedor', tipo: 'texto', max: 30 },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'proveedor', 'condicion'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'repuestos', mostrar: 'nombre', precio: 'costo', precioEditable: true,
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 }],
          info: function (item) { return 'Stock actual: ' + item.stock + ' · Último costo: S/ ' + (item.costo || 0).toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var sub = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var igv = ctx.redondear(sub * ctx.param('igv') / 100);
          return { subtotal: sub, igv: igv, total: ctx.redondear(sub + igv) };
        },
        totales: [
          { id: 'subtotal', etiqueta: 'Subtotal' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total de la compra', fuerte: true }
        ],
        alEmitir: function (doc, ctx) {
          var i, l, r, precioMinimo, parche;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            r = ctx.datos.obtener('repuestos', l.item);
            /* El costo pasa a ser el de esta compra; el precio de venta sube si el margen mínimo ya no se cumple. */
            precioMinimo = ctx.redondear(l.precio * (1 + ctx.param('margenMinimo') / 100));
            parche = { stock: r.stock + l.cantidad, costo: l.precio, precio: Math.max(r.precio, precioMinimo) };
            ctx.datos.actualizar('repuestos', l.item, parche);
          }
        },
        alAnular: function (doc, ctx) {
          var i, l, r;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            r = ctx.datos.obtener('repuestos', l.item);
            if (r.stock < l.cantidad) { throw new Error('No se puede anular: ya se usó parte de «' + r.nombre + '» (stock ' + r.stock + ', la compra trajo ' + l.cantidad + ').'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            r = ctx.datos.obtener('repuestos', l.item);
            ctx.datos.actualizar('repuestos', l.item, { stock: r.stock - l.cantidad });
          }
        },
        permisos: { ver: ['admin', 'jefe', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], emitir: ['admin', 'almacen'], anular: ['admin'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ingresos-servicio', titulo: 'Ingresos de mano de obra por servicio',
        descripcion: 'Mano de obra facturada por servicio en órdenes terminadas o entregadas: horas estándar × tarifa del mecánico, con el recargo por urgencia si lo hubo.',
        roles: ['admin', 'jefe', 'asesor', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ordenes = ordenesCerradas(ctx, p.desde, p.hasta), acum = {}, claves = [], i, j, o, servs, mec, factor, s, k, filas = [], etiquetas = [], valores = [], total = 0, horas = 0;
          for (i = 0; i < ordenes.length; i++) {
            o = ordenes[i];
            servs = serviciosDe(o, ctx);
            mec = ctx.datos.obtener('mecanicos', o.mecanico);
            factor = o.urgente ? 1 + ctx.param('recargoUrgente') / 100 : 1;
            for (j = 0; j < servs.length; j++) {
              s = servs[j];
              if (!acum[s.id]) { acum[s.id] = { nombre: s.nombre, tipo: s.tipo, ordenes: 0, horas: 0, importe: 0 }; claves.push(s.id); }
              acum[s.id].ordenes += 1;
              acum[s.id].horas += s.tiempoEstandar;
              acum[s.id].importe += s.tiempoEstandar * (mec ? mec.tarifaHora : 0) * factor;
            }
          }
          claves.sort(function (a, b) { return acum[b].importe - acum[a].importe; });
          for (k = 0; k < claves.length; k++) {
            s = acum[claves[k]];
            filas.push([s.nombre, s.tipo, s.ordenes, ctx.redondear(s.horas), ctx.redondear(s.importe)]);
            etiquetas.push(s.nombre);
            valores.push(ctx.redondear(s.importe));
            total += s.importe;
            horas += s.horas;
          }
          return {
            columnas: ['Servicio', 'Tipo', 'Órdenes', 'Horas estándar', 'Mano de obra'], tipos: ['texto', 'texto', 'entero', 'numero', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Mano de obra facturada', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Horas estándar vendidas', valor: ctx.redondear(horas), tipo: 'numero' },
              { etiqueta: 'Órdenes del periodo', valor: ordenes.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'productividad-mecanico', titulo: 'Productividad y comisión por mecánico',
        descripcion: 'Horas estándar facturadas, eficiencia (horas estándar ÷ horas reales marcadas), mano de obra y comisión de cada técnico en órdenes terminadas o entregadas.',
        roles: ['admin', 'jefe', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ordenes = ordenesCerradas(ctx, p.desde, p.hasta), mecs = ctx.datos.listar('mecanicos'), filas = [], i, m, mias, hEst, hReal, hEstMedidas, mo, com, efic, totalCom = 0, totalEst = 0, totalReal = 0, totalMedidas = 0, etiquetas = [], valores = [];
          for (i = 0; i < mecs.length; i++) {
            m = mecs[i];
            mias = ordenes.filter(function (o) { return o.mecanico === m.id; });
            if (!mias.length) { continue; }
            hEst = ctx.suma(mias, function (o) { return o.totales.horasEstandar; });
            hReal = ctx.suma(mias, function (o) { return o.horasReales > 0 ? o.horasReales : 0; });
            hEstMedidas = ctx.suma(mias, function (o) { return o.horasReales > 0 ? o.totales.horasEstandar : 0; });
            mo = ctx.suma(mias, function (o) { return o.totales.manoObra + o.totales.recargo; });
            com = ctx.suma(mias, function (o) { return o.totales.comision; });
            efic = hReal > 0 ? ctx.redondear(hEstMedidas / hReal * 100) : 0;
            filas.push([m.nombre, m.categoria, mias.length, ctx.redondear(hEst), ctx.redondear(hReal), efic, ctx.redondear(mo), ctx.redondear(com)]);
            totalCom += com;
            totalEst += hEst;
            totalReal += hReal;
            totalMedidas += hEstMedidas;
          }
          filas.sort(function (a, b) { return b[3] - a[3]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][3]); }
          return {
            columnas: ['Mecánico', 'Categoría', 'Órdenes', 'Horas estándar', 'Horas reales', 'Eficiencia %', 'Mano de obra', 'Comisión'],
            tipos: ['texto', 'texto', 'entero', 'numero', 'numero', 'porcentaje', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'numero' },
            resumen: [
              { etiqueta: 'Comisiones del periodo', valor: ctx.redondear(totalCom), tipo: 'moneda' },
              { etiqueta: 'Horas estándar facturadas', valor: ctx.redondear(totalEst), tipo: 'numero' },
              { etiqueta: 'Eficiencia del taller', valor: totalReal > 0 ? ctx.redondear(totalMedidas / totalReal * 100) : 0, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'repuestos-usados', titulo: 'Repuestos más usados',
        descripcion: 'Unidades, ingreso y margen de cada repuesto en las órdenes que ya descontaron stock (en proceso, terminadas o entregadas).',
        roles: ['admin', 'jefe', 'almacen', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'top', etiqueta: 'Cantidad de repuestos', tipo: 'entero', min: 1, max: 50, requerido: true, defecto: 10 }
        ],
        ejecutar: function (p, ctx) {
          var ordenes = ctx.datos.listar('ordenes', function (o) { return consumioStock(o) && enRango(o, p.desde, p.hasta); }), acum = {}, lista = [], i, j, l, r, k, filas = [], etiquetas = [], valores = [], ingreso = 0, unidades = 0;
          for (i = 0; i < ordenes.length; i++) {
            for (j = 0; j < ordenes[i].lineas.length; j++) {
              l = ordenes[i].lineas[j];
              if (!acum[l.item]) { acum[l.item] = { id: l.item, unidades: 0, ingreso: 0 }; lista.push(acum[l.item]); }
              acum[l.item].unidades += l.cantidad;
              acum[l.item].ingreso += l.cantidad * l.precio;
            }
          }
          lista.sort(function (a, b) { return b.unidades - a.unidades; });
          lista = lista.slice(0, p.top || 10);
          for (k = 0; k < lista.length; k++) {
            r = ctx.datos.obtener('repuestos', lista[k].id);
            filas.push([r ? r.codigo : lista[k].id, r ? r.nombre : lista[k].id, r ? r.categoria : '', lista[k].unidades, ctx.redondear(lista[k].ingreso), r && r.costo ? ctx.redondear(lista[k].ingreso - lista[k].unidades * r.costo) : 0, r ? r.stock : 0]);
            etiquetas.push(r ? r.nombre : lista[k].id);
            valores.push(lista[k].unidades);
            ingreso += lista[k].ingreso;
            unidades += lista[k].unidades;
          }
          return {
            columnas: ['Código', 'Repuesto', 'Categoría', 'Unidades', 'Ingreso', 'Margen', 'Stock actual'], tipos: ['texto', 'texto', 'texto', 'entero', 'moneda', 'moneda', 'entero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Unidades de estos repuestos', valor: unidades, tipo: 'entero' },
              { etiqueta: 'Ingreso de estos repuestos', valor: ctx.redondear(ingreso), tipo: 'moneda' },
              { etiqueta: 'Órdenes consideradas', valor: ordenes.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'mantenimiento-vencido', titulo: 'Vehículos con mantenimiento vencido',
        descripcion: 'Vehículos cuyo kilometraje ya pasó (o está por pasar) el próximo mantenimiento: kilometraje actual, último mantenimiento, intervalo y teléfono del propietario para avisarle.',
        roles: ['admin', 'jefe', 'asesor', 'auditor'],
        parametros: [
          { id: 'filtro', etiqueta: 'Mostrar', tipo: 'lista', opciones: ['Vencidos y próximos', 'Solo vencidos', 'Todos los vehículos'], defecto: 'Vencidos y próximos' }
        ],
        ejecutar: function (p, ctx) {
          var vehs = ctx.datos.listar('vehiculos'), filas = [], i, v, cli, sit, cuenta = { 'Vencido': 0, 'Próximo': 0, 'Al día': 0 };
          for (i = 0; i < vehs.length; i++) {
            v = vehs[i];
            sit = situacionMant(v, ctx);
            cuenta[sit] += 1;
            if (p.filtro === 'Solo vencidos' && sit !== 'Vencido') { continue; }
            if (p.filtro !== 'Todos los vehículos' && p.filtro !== 'Solo vencidos' && sit === 'Al día') { continue; }
            cli = ctx.datos.obtener('clientes', v.cliente);
            filas.push([v.placa, v.marca + ' ' + v.modelo, cli ? cli.nombre : '', cli && cli.telefono ? cli.telefono : '', v.kmActual, v.ultimoMantKm || 0, v.intervaloKm, kmRestantes(v), sit]);
          }
          filas.sort(function (a, b) { return a[7] - b[7]; });
          return {
            columnas: ['Placa', 'Vehículo', 'Propietario', 'Teléfono', 'Km actual', 'Km último mant.', 'Intervalo', 'Km restantes', 'Situación'],
            tipos: ['texto', 'texto', 'texto', 'texto', 'entero', 'entero', 'entero', 'entero', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: ['Vencido', 'Próximo', 'Al día'], valores: [cuenta['Vencido'], cuenta['Próximo'], cuenta['Al día']], formato: 'entero' },
            resumen: [
              { etiqueta: 'Vencidos', valor: cuenta['Vencido'], tipo: 'entero' },
              { etiqueta: 'Próximos a vencer', valor: cuenta['Próximo'], tipo: 'entero' },
              { etiqueta: 'Vehículos registrados', valor: vehs.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'margen-orden', titulo: 'Margen por orden de trabajo',
        descripcion: 'Ingreso sin IGV de cada orden terminada o entregada, menos el costo de los repuestos y la comisión del técnico. Sirve para detectar órdenes que dejan poco.',
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ordenes = ordenesCerradas(ctx, p.desde, p.hasta), filas = [], i, o, v, mec, t, g, claves = [], porMes = {}, etiquetas = [], valores = [], ingreso = 0, margen = 0;
          ordenes.sort(function (a, b) { return a.fecha < b.fecha ? 1 : (a.fecha > b.fecha ? -1 : 0); });
          for (i = 0; i < ordenes.length; i++) {
            o = ordenes[i];
            t = o.totales;
            v = ctx.datos.obtener('vehiculos', o.vehiculo);
            mec = ctx.datos.obtener('mecanicos', o.mecanico);
            filas.push([o.numero || o.id, o.fecha, v ? v.placa : '', mec ? mec.nombre : '', t.subtotal, t.costoRepuestos, t.comision, t.margen, t.subtotal > 0 ? ctx.redondear(t.margen / t.subtotal * 100) : 0]);
            ingreso += t.subtotal;
            margen += t.margen;
            g = ctx.mes(o.fecha);
            if (porMes[g] === undefined) { porMes[g] = 0; claves.push(g); }
            porMes[g] += t.margen;
          }
          claves.sort();
          for (i = 0; i < claves.length; i++) { etiquetas.push(nombreMes(claves[i])); valores.push(ctx.redondear(porMes[claves[i]])); }
          return {
            columnas: ['Orden', 'Fecha', 'Placa', 'Mecánico', 'Ingreso', 'Costo repuestos', 'Comisión', 'Margen', 'Margen %'],
            tipos: ['texto', 'fecha', 'texto', 'texto', 'moneda', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Margen total', valor: ctx.redondear(margen), tipo: 'moneda' },
              { etiqueta: 'Margen sobre ingresos', valor: ingreso > 0 ? ctx.redondear(margen / ingreso * 100) : 0, tipo: 'porcentaje' },
              { etiqueta: 'Órdenes del periodo', valor: ordenes.length, tipo: 'entero' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Ingresos de los últimos 30 días (con IGV)', tipo: 'moneda',
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(ordenesCerradas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (o) { return o.totales.total; }));
        }
      },
      {
        titulo: 'Órdenes en proceso', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('ordenes', function (o) { return o.estado === 'En proceso'; }).length; }
      },
      {
        titulo: 'Ticket promedio por orden (30 días)', tipo: 'moneda',
        calcular: function (ctx) {
          var o = ordenesCerradas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy());
          return o.length ? ctx.redondear(ctx.suma(o, function (x) { return x.totales.total; }) / o.length) : 0;
        }
      },
      {
        titulo: 'Repuestos con stock bajo', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('repuestos', repuestoBajo).length; }
      },
      {
        titulo: 'Vehículos con mantenimiento vencido', tipo: 'entero', roles: ['admin', 'jefe', 'asesor', 'auditor'],
        nota: 'Pasaron su kilometraje de mantenimiento',
        calcular: function (ctx) { return ctx.datos.listar('vehiculos', function (v) { return situacionMant(v, ctx) === 'Vencido'; }).length; }
      },
      {
        titulo: 'Margen de los últimos 30 días', tipo: 'moneda', roles: ['admin', 'jefe', 'auditor'],
        nota: 'Sin IGV, menos repuestos y comisiones',
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(ordenesCerradas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (o) { return o.totales.margen; }));
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Ingresos por órdenes de los últimos 6 meses (con IGV)', tipo: 'columnas', formato: 'moneda',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), ordenes = ordenesCerradas(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(ordenes, function (o) { return ctx.mes(o.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(ctx.redondear(ctx.suma(g[meses[i]] || [], function (o) { return o.totales.total; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      clientes: [
        { id: 'CLI-0001', documento: '40512367', nombre: 'Hugo Vilcapoma Rojas', tipo: 'Particular', distrito: 'El Tambo', direccion: 'Jr. Ancash 340', telefono: '964 120 331', email: 'hugo.vilcapoma@correo.example.pe' },
        { id: 'CLI-0002', documento: '20601122334', nombre: 'Transportes Mantaro S.A.C.', tipo: 'Flota empresarial', distrito: 'Huancayo', direccion: 'Av. Ferrocarril 1180', telefono: '064 231 905', email: 'flota@mantaro.example.pe' },
        { id: 'CLI-0003', documento: '20602233445', nombre: 'Agroandina del Centro S.R.L.', tipo: 'Flota empresarial', distrito: 'Chilca', direccion: 'Carretera Central km 5', telefono: '064 245 770', email: 'logistica@agroandina.example.pe' },
        { id: 'CLI-0004', documento: '20987654', nombre: 'Marleny Cóndor Huamán', tipo: 'Particular', distrito: 'Huancayo', direccion: 'Calle Real 812', telefono: '964 552 018', email: 'marleny.condor@correo.example.pe' },
        { id: 'CLI-0005', documento: '20603344556', nombre: 'Distribuidora Valle Sagrado E.I.R.L.', tipo: 'Flota empresarial', distrito: 'El Tambo', direccion: 'Av. Mariscal Castilla 2210', telefono: '064 253 346', email: 'compras@vallesagrado.example.pe' },
        { id: 'CLI-0006', documento: '44123987', nombre: 'Edwin Poma Callupe', tipo: 'Particular', distrito: 'Pilcomayo', direccion: 'Psje. Los Pinos 25', telefono: '963 118 740', email: 'edwin.poma@correo.example.pe' },
        { id: 'CLI-0007', documento: '41876520', nombre: 'Rocío Ñaupari Gutiérrez', tipo: 'Particular', distrito: 'Huancayo', direccion: 'Jr. Cusco 156', telefono: '962 330 215', email: 'rocio.naupari@correo.example.pe' },
        { id: 'CLI-0008', documento: '20604455667', nombre: 'Constructora Tres Cumbres S.A.', tipo: 'Flota empresarial', distrito: 'Chilca', direccion: 'Av. Los Incas 905', telefono: '064 247 118', email: 'maquinaria@trescumbres.example.pe' },
        { id: 'CLI-0009', documento: '46012233', nombre: 'Jhon Meza Paucar', tipo: 'Particular', distrito: 'San Agustín de Cajas', direccion: 'Calle Progreso 41', telefono: '961 774 902', email: 'jhon.meza@correo.example.pe' },
        { id: 'CLI-0010', documento: '43901276', nombre: 'Silvia Canchari Ortiz', tipo: 'Particular', distrito: 'El Tambo', direccion: 'Av. Daniel A. Carrión 620', telefono: '960 221 483', email: 'silvia.canchari@correo.example.pe' },
        { id: 'CLI-0011', documento: '40235589', nombre: 'Wilfredo Ramos Quispe', tipo: 'Particular', distrito: 'Sapallanga', direccion: 'Jr. Bolívar 77', telefono: '959 664 310', email: 'wilfredo.ramos@correo.example.pe' },
        { id: 'CLI-0012', documento: '20605566778', nombre: 'Lácteos Junín S.A.C.', tipo: 'Flota empresarial', distrito: 'Hualhuas', direccion: 'Km 12 Carretera a Jauja', telefono: '064 237 665', email: 'transporte@lacteosjunin.example.pe' },
        { id: 'CLI-0013', documento: '47220318', nombre: 'Daniela Arroyo Salvatierra', tipo: 'Particular', distrito: 'Huancayo', direccion: 'Calle Piura 238', telefono: '958 412 906', email: 'daniela.arroyo@correo.example.pe' },
        { id: 'CLI-0014', documento: '45568120', nombre: 'Cristian Bonilla Yupanqui', tipo: 'Particular', distrito: 'Chupaca', direccion: 'Jr. Grau 19', telefono: '957 880 126', email: 'cristian.bonilla@correo.example.pe' }
      ],
      vehiculos: VEHICULOS,
      repuestos: REPUESTOS,
      mecanicos: [
        { id: 'MEC-0001', nombre: 'Teófilo Rojas Aguilar', dni: '20457812', categoria: 'Maestro', especialidad: 'Motor', tarifaHora: 80, comisionPct: 8, sueldoBase: 2900, fechaIngreso: '2018-04-02', activo: true },
        { id: 'MEC-0002', nombre: 'Alberto Mayta Soto', dni: '41203958', categoria: 'Oficial', especialidad: 'Frenos y suspensión', tarifaHora: 60, comisionPct: 6, sueldoBase: 2100, fechaIngreso: '2020-09-14', activo: true },
        { id: 'MEC-0003', nombre: 'Gladys Quinto Lazo', dni: '44850172', categoria: 'Oficial', especialidad: 'Eléctrico y diagnóstico', tarifaHora: 65, comisionPct: 7, sueldoBase: 2300, fechaIngreso: '2021-02-01', activo: true },
        { id: 'MEC-0004', nombre: 'Víctor Hinostroza Paucar', dni: '42776015', categoria: 'Oficial', especialidad: 'Mantenimiento general', tarifaHora: 55, comisionPct: 6, sueldoBase: 2000, fechaIngreso: '2022-06-20', activo: true },
        { id: 'MEC-0005', nombre: 'Jean Pierre Bendezú Cano', dni: '71230845', categoria: 'Ayudante', especialidad: 'Mantenimiento general', tarifaHora: 40, comisionPct: 4, sueldoBase: 1500, fechaIngreso: '2025-03-10', activo: true },
        { id: 'MEC-0006', nombre: 'Raúl Espinoza Castro', dni: '19884230', categoria: 'Maestro', especialidad: 'Transmisión', tarifaHora: 75, comisionPct: 8, sueldoBase: 2800, fechaIngreso: '2017-11-06', activo: true },
        { id: 'MEC-0007', nombre: 'Dante Ccanto Ríos', dni: '40917736', categoria: 'Oficial', especialidad: 'Motor', tarifaHora: 58, comisionPct: 6, sueldoBase: 2000, fechaIngreso: '2019-01-15', activo: false }
      ],
      servicios: [
        { id: 'SRV-0001', nombre: 'Cambio de aceite y filtro', tipo: 'Mantenimiento', tiempoEstandar: 0.8, reiniciaMant: true },
        { id: 'SRV-0002', nombre: 'Mantenimiento preventivo completo', tipo: 'Mantenimiento', tiempoEstandar: 2.5, reiniciaMant: true },
        { id: 'SRV-0003', nombre: 'Cambio de pastillas de freno', tipo: 'Frenos', tiempoEstandar: 1.5, reiniciaMant: false },
        { id: 'SRV-0004', nombre: 'Rectificado de discos y purga de frenos', tipo: 'Frenos', tiempoEstandar: 3, reiniciaMant: false },
        { id: 'SRV-0005', nombre: 'Cambio de amortiguadores (un eje)', tipo: 'Suspensión', tiempoEstandar: 2.5, reiniciaMant: false },
        { id: 'SRV-0006', nombre: 'Cambio de correa de distribución', tipo: 'Motor', tiempoEstandar: 4.5, reiniciaMant: false },
        { id: 'SRV-0007', nombre: 'Diagnóstico con scanner', tipo: 'Diagnóstico', tiempoEstandar: 1, reiniciaMant: false },
        { id: 'SRV-0008', nombre: 'Cambio de batería y prueba de alternador', tipo: 'Eléctrico', tiempoEstandar: 0.75, reiniciaMant: false },
        { id: 'SRV-0009', nombre: 'Alineamiento y balanceo', tipo: 'Neumáticos', tiempoEstandar: 1.25, reiniciaMant: false },
        { id: 'SRV-0010', nombre: 'Cambio de kit de embrague', tipo: 'Transmisión', tiempoEstandar: 7, reiniciaMant: false },
        { id: 'SRV-0011', nombre: 'Afinamiento de motor', tipo: 'Motor', tiempoEstandar: 3, reiniciaMant: true }
      ],
      ordenes: armarOrdenes(),
      compras: armarCompras()
    }
  };
})();
