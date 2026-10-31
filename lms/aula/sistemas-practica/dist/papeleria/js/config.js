/*
 * Papelería Útil · Útiles de escritorio, escolares y de oficina (Lima)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «papeleria». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC y DNI de ejemplo) y no corresponden a personas
 * ni empresas reales. Todo el código es ES5 (sin flechas, let, const ni plantillas).
 *
 * Reglas propias del rubro:
 *  - Descuento escalonado por volumen: cada línea de venta recibe un porcentaje
 *    según la cantidad de unidades de esa línea (tabla en Configuración).
 *  - Margen por categoría: cada categoría tiene un margen objetivo sobre el precio.
 *  - Reposición: punto de reposición = demanda diaria × días de entrega del
 *    proveedor + stock de seguridad; la compra sugerida llega hasta el stock máximo
 *    y se redondea al múltiplo de compra del producto.
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var TIPO_MOSTRADOR = 'Venta de mostrador';
  var TIPO_CORPORATIVO = 'Pedido corporativo';

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

  /* Ventas emitidas (no borradores ni anuladas) dentro de un rango de fechas. */
  function ventasEmitidas(ctx, desde, hasta) {
    return ctx.datos.listar('ventas', function (v) {
      return v.estado === 'Emitida' && (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta);
    });
  }

  /* Porcentaje de descuento que corresponde a una cantidad, según los tres tramos de Configuración. */
  function descuentoVolumen(cantidad, ctx) {
    if (cantidad >= ctx.param('tramo3')) { return ctx.param('dto3'); }
    if (cantidad >= ctx.param('tramo2')) { return ctx.param('dto2'); }
    if (cantidad >= ctx.param('tramo1')) { return ctx.param('dto1'); }
    return 0;
  }

  /* Importe de una línea ya con el descuento por volumen. */
  function importeLinea(l, ctx) {
    return l.cantidad * l.precio * (1 - descuentoVolumen(l.cantidad, ctx) / 100);
  }

  /* Componentes de un combo: [{ item, cantidad }] (el tercero es opcional). */
  function componentes(combo) {
    var r = [];
    if (!combo) { return r; }
    if (combo.producto1) { r.push({ item: combo.producto1, cantidad: combo.cantidad1 || 0 }); }
    if (combo.producto2) { r.push({ item: combo.producto2, cantidad: combo.cantidad2 || 0 }); }
    if (combo.producto3) { r.push({ item: combo.producto3, cantidad: combo.cantidad3 || 0 }); }
    return r;
  }

  /* Unidades que una venta saca de cada producto: sus líneas más los componentes de los combos. */
  function consumoDoc(doc, ctx) {
    var mapa = {}, i, l, comps, n = doc.combosCantidad || 0;
    for (i = 0; i < (doc.lineas || []).length; i++) {
      l = doc.lineas[i];
      mapa[l.item] = (mapa[l.item] || 0) + l.cantidad;
    }
    if (doc.combo && n > 0) {
      comps = componentes(ctx.datos.obtener('combos', doc.combo));
      for (i = 0; i < comps.length; i++) { mapa[comps[i].item] = (mapa[comps[i].item] || 0) + comps[i].cantidad * n; }
    }
    return mapa;
  }

  /* Unidades vendidas de un producto en un rango (ventas emitidas). */
  function unidadesVendidas(ctx, productoId, desde, hasta) {
    var ventas = ventasEmitidas(ctx, desde, hasta), total = 0, i, mapa;
    for (i = 0; i < ventas.length; i++) {
      mapa = consumoDoc(ventas[i], ctx);
      total += mapa[productoId] || 0;
    }
    return total;
  }

  /* Demanda diaria promedio sobre la ventana de Configuración (ventanaDemanda días hasta hoy). */
  function demandaDiaria(p, ctx) {
    var dias = Math.max(1, ctx.param('ventanaDemanda')), desde = ctx.fechaMas(ctx.hoy(), -(dias - 1));
    return unidadesVendidas(ctx, p.id, desde, ctx.hoy()) / dias;
  }

  /* Punto de reposición: lo que se vende mientras llega el pedido, más el stock de seguridad. */
  function puntoReposicionDe(p, ctx) {
    var prov = p.proveedor ? ctx.datos.obtener('proveedores', p.proveedor) : null;
    var plazo = prov && prov.diasEntrega !== undefined ? prov.diasEntrega : 0;
    return Math.ceil(ctx.redondear(demandaDiaria(p, ctx) * plazo)) + (p.stockMin || 0);
  }

  /* Compra sugerida: si el stock llegó al punto de reposición, lo que falta hasta el máximo, en múltiplos de compra. */
  function compraSugeridaDe(p, ctx) {
    var punto, falta, mult;
    if (p.activo === false) { return 0; }
    punto = puntoReposicionDe(p, ctx);
    if (p.stock > punto) { return 0; }
    falta = (p.stockMax || 0) - p.stock;
    if (falta <= 0) { return 0; }
    mult = p.multiploCompra || 1;
    return Math.ceil(falta / mult) * mult;
  }

  /* ¿Hay que reponer? */
  function porReponer(p, ctx) {
    return p.activo !== false && p.stock <= puntoReposicionDe(p, ctx);
  }

  /* ---------- Datos de demostración ---------- */

  /* [id, código, nombre, categoría, marca, proveedor, unidad, costo, precio, stock, mín., máx., múltiplo] */
  var PRODUCTOS_FILAS = [
    ['PRD-0001', 'ESC-LAP-AZ', 'Lapicero punta fina azul', 'CAT-0001', 'Colibrí', 'PRV-0001', 'Unidad', 0.70, 1.20, 480, 120, 1200, 50],
    ['PRD-0002', 'ESC-LAP-NG', 'Lapicero punta fina negro', 'CAT-0001', 'Colibrí', 'PRV-0001', 'Unidad', 0.70, 1.20, 310, 120, 1200, 50],
    ['PRD-0003', 'ESC-LAP-GEL', 'Lapicero de gel 0.7 mm', 'CAT-0001', 'Kuyay', 'PRV-0001', 'Unidad', 2.10, 3.50, 150, 60, 400, 12],
    ['PRD-0004', 'ESC-MAR-PER', 'Marcador permanente negro', 'CAT-0001', 'Inti', 'PRV-0001', 'Unidad', 1.70, 3.00, 96, 48, 300, 12],
    ['PRD-0005', 'ESC-RES-AM', 'Resaltador amarillo', 'CAT-0001', 'Inti', 'PRV-0001', 'Unidad', 1.60, 2.80, 36, 36, 240, 12],
    ['PRD-0006', 'ESC-LAP-HB', 'Lápiz grafito HB', 'CAT-0001', 'Colibrí', 'PRV-0001', 'Unidad', 0.50, 0.90, 520, 200, 1500, 50],
    ['PRD-0007', 'PAP-RES-A4', 'Resma de papel bond A4 75 g (500 hojas)', 'CAT-0002', 'PapelAndes', 'PRV-0002', 'Resma', 12.40, 16.50, 41, 40, 240, 10],
    ['PRD-0008', 'PAP-RES-A3', 'Resma de papel bond A3 75 g (500 hojas)', 'CAT-0002', 'PapelAndes', 'PRV-0002', 'Resma', 30.50, 38.00, 12, 10, 40, 5],
    ['PRD-0009', 'PAP-CUA-A4', 'Cuaderno A4 cuadriculado 100 hojas', 'CAT-0002', 'Kuyay', 'PRV-0003', 'Unidad', 4.20, 6.50, 96, 80, 600, 24],
    ['PRD-0010', 'PAP-BLO-NOT', 'Block de notas adhesivas 76 x 76 mm', 'CAT-0002', 'Pegadix', 'PRV-0003', 'Unidad', 2.80, 4.50, 130, 50, 400, 12],
    ['PRD-0011', 'PAP-FOT-100', 'Papel fotográfico brillante A4 (20 hojas)', 'CAT-0002', 'PapelAndes', 'PRV-0002', 'Paquete', 8.60, 12.00, 12, 12, 80, 5],
    ['PRD-0012', 'ARC-ARCH-A4', 'Archivador de palanca A4', 'CAT-0003', 'Ordenax', 'PRV-0003', 'Unidad', 6.40, 9.50, 140, 40, 400, 12],
    ['PRD-0013', 'ARC-FOL-MAN', 'Folder manila A4', 'CAT-0003', 'Ordenax', 'PRV-0006', 'Unidad', 0.35, 0.60, 900, 300, 3000, 100],
    ['PRD-0014', 'ARC-FAS-8', 'Fástener metálico 8 cm (caja de 50)', 'CAT-0003', 'Ordenax', 'PRV-0006', 'Caja', 2.50, 4.00, 60, 20, 200, 10],
    ['PRD-0015', 'ARC-CLI-32', 'Clips mariposa 32 mm (caja de 12)', 'CAT-0003', 'Ordenax', 'PRV-0006', 'Caja', 1.50, 2.50, 70, 24, 200, 12],
    ['PRD-0016', 'ARC-ENG-ESC', 'Engrapadora de escritorio', 'CAT-0003', 'Metalix', 'PRV-0007', 'Unidad', 11.20, 17.00, 22, 8, 60, 6],
    ['PRD-0017', 'ESO-COL-12', 'Colores largos x12', 'CAT-0004', 'Kuyay', 'PRV-0005', 'Caja', 4.80, 7.50, 35, 30, 240, 12],
    ['PRD-0018', 'ESO-TEM-12', 'Témperas x12 colores', 'CAT-0004', 'Pintín', 'PRV-0005', 'Caja', 7.50, 11.00, 34, 20, 120, 6],
    ['PRD-0019', 'ESO-GOM-BAR', 'Goma en barra 40 g', 'CAT-0004', 'Pegadix', 'PRV-0005', 'Unidad', 1.90, 3.20, 8, 24, 144, 12],
    ['PRD-0020', 'ESO-MOC-REF', 'Mochila escolar reforzada', 'CAT-0004', 'Trekito', 'PRV-0005', 'Unidad', 36.00, 55.00, 16, 10, 60, 4],
    ['PRD-0021', 'TEC-USB-32', 'Memoria USB 32 GB', 'CAT-0005', 'Datix', 'PRV-0004', 'Unidad', 17.50, 24.00, 11, 10, 80, 5],
    ['PRD-0022', 'TEC-CAL-CIE', 'Calculadora científica', 'CAT-0005', 'Datix', 'PRV-0004', 'Unidad', 35.00, 48.00, 9, 6, 40, 3],
    ['PRD-0023', 'TEC-MOU-OPT', 'Mouse óptico USB', 'CAT-0005', 'Datix', 'PRV-0004', 'Unidad', 12.50, 19.00, 25, 10, 60, 5],
    ['PRD-0024', 'LIM-GEL-500', 'Gel antibacterial 500 ml', 'CAT-0006', 'Limpiol', 'PRV-0008', 'Unidad', 6.20, 9.00, 50, 24, 150, 12]
  ];

  var productos = [], PRECIOS = {};
  (function () {
    var i, f;
    for (i = 0; i < PRODUCTOS_FILAS.length; i++) {
      f = PRODUCTOS_FILAS[i];
      productos.push({ id: f[0], codigo: f[1], nombre: f[2], categoria: f[3], marca: f[4], proveedor: f[5], unidad: f[6], costo: f[7], precio: f[8], stock: f[9], stockMin: f[10], stockMax: f[11], multiploCompra: f[12], activo: true });
      PRECIOS[f[0]] = f[8];
    }
  })();

  function pid(n) { return 'PRD-' + (n < 10 ? '000' : '00') + n; }

  /* Fila de venta: [días atrás, cliente, tipo (M/C), pago, orden de compra, estado (E/A/B), combo, cant. combos, [[producto, cantidad]]] */
  var VENTAS = [
    [177, 10, 'M', 'Efectivo', '', 'E', '', 0, [[9, 3], [6, 10], [17, 1]]],
    [172, 2, 'C', 'Crédito 30 días', 'OC-0231', 'E', '', 0, [[9, 150], [6, 300], [17, 60], [19, 48]]],
    [168, 1, 'M', 'Yape o Plin', '', 'E', '', 0, [[1, 4], [3, 2]]],
    [163, 4, 'C', 'Transferencia', 'OC-0118', 'E', '', 0, [[7, 24], [12, 12], [13, 200], [1, 100]]],
    [158, 11, 'M', 'Tarjeta', '', 'E', 'CMB-0001', 1, [[10, 1]]],
    [152, 12, 'M', 'Efectivo', '', 'E', '', 0, [[16, 1], [13, 25]]],
    [147, 3, 'C', 'Crédito 30 días', 'OC-0412', 'E', 'CMB-0001', 20, [[9, 60], [6, 120], [18, 24]]],
    [141, 13, 'M', 'Efectivo', '', 'E', '', 0, [[22, 1]]],
    [136, 5, 'C', 'Transferencia', 'OC-5530', 'E', '', 0, [[7, 10], [24, 12], [10, 12]]],
    [130, 1, 'M', 'Efectivo', '', 'A', '', 0, [[4, 2]]],
    [125, 6, 'C', 'Crédito 30 días', 'OC-0777', 'E', '', 0, [[7, 48], [12, 24], [16, 6], [21, 10]]],
    [119, 14, 'M', 'Yape o Plin', '', 'E', '', 0, [[20, 1], [9, 2]]],
    [114, 7, 'C', 'Transferencia', 'OC-0903', 'E', 'CMB-0002', 6, [[7, 30], [10, 24]]],
    [108, 1, 'M', 'Efectivo', '', 'E', '', 0, [[1, 6], [2, 6], [5, 2]]],
    [102, 2, 'C', 'Crédito 30 días', 'OC-0245', 'E', 'CMB-0006', 15, [[9, 120], [17, 48], [20, 10]]],
    [97, 10, 'M', 'Tarjeta', '', 'E', '', 0, [[11, 2], [7, 1]]],
    [92, 8, 'C', 'Transferencia', 'OC-0066', 'E', '', 0, [[7, 20], [13, 150], [14, 6]]],
    [86, 1, 'M', 'Efectivo', '', 'E', 'CMB-0001', 1, [[19, 2]]],
    [81, 3, 'C', 'Crédito 30 días', 'OC-0420', 'E', '', 0, [[9, 96], [6, 200], [1, 150], [2, 150]]],
    [75, 11, 'M', 'Efectivo', '', 'E', '', 0, [[10, 3], [4, 1]]],
    [70, 9, 'C', 'Transferencia', 'OC-1180', 'E', '', 0, [[7, 16], [9, 24], [4, 12]]],
    [64, 1, 'M', 'Yape o Plin', '', 'E', '', 0, [[23, 1], [21, 1]]],
    [58, 5, 'C', 'Crédito 30 días', 'OC-5602', 'E', 'CMB-0003', 4, [[24, 24], [10, 12]]],
    [52, 12, 'M', 'Efectivo', '', 'A', '', 0, [[17, 2]]],
    [47, 2, 'C', 'Crédito 30 días', 'OC-0288', 'E', 'CMB-0001', 30, [[9, 100], [6, 150], [5, 24]]],
    [41, 13, 'M', 'Tarjeta', '', 'E', '', 0, [[16, 1], [12, 2]]],
    [36, 4, 'C', 'Transferencia', 'OC-0131', 'E', '', 0, [[7, 30], [13, 100], [15, 12]]],
    [30, 1, 'M', 'Efectivo', '', 'E', '', 0, [[1, 5], [6, 5], [19, 1]]],
    [26, 14, 'M', 'Yape o Plin', '', 'E', 'CMB-0004', 1, [[10, 1]]],
    [21, 6, 'C', 'Crédito 30 días', 'OC-0790', 'E', '', 0, [[7, 36], [12, 12], [24, 24]]],
    [16, 7, 'C', 'Transferencia', 'OC-0911', 'E', 'CMB-0002', 4, [[9, 30]]],
    [12, 1, 'M', 'Efectivo', '', 'E', '', 0, [[3, 3], [10, 2], [5, 1]]],
    [8, 3, 'C', 'Crédito 30 días', 'OC-0455', 'E', '', 0, [[9, 60], [17, 24], [18, 12], [19, 24]]],
    [5, 10, 'M', 'Tarjeta', '', 'E', '', 0, [[7, 2], [13, 25]]],
    [2, 8, 'C', 'Transferencia', 'OC-0071', 'B', '', 0, [[7, 12], [13, 100]]],
    [0, 1, 'M', 'Efectivo', '', 'B', '', 0, [[9, 2]]]
  ];

  /* Fila de compra: [días atrás, proveedor, condición, referencia, estado (E/B), [[producto, cantidad, costo unitario]]] */
  var COMPRAS = [
    [175, 'PRV-0001', 'Crédito 30 días', 'F001-4412', 'E', [[1, 1000, 0.70], [2, 600, 0.70], [6, 1000, 0.50], [3, 200, 2.10]]],
    [160, 'PRV-0002', 'Crédito 30 días', 'F020-0981', 'E', [[7, 200, 12.40], [8, 30, 30.50], [11, 40, 8.60]]],
    [140, 'PRV-0003', 'Contado', 'F005-7743', 'E', [[9, 400, 4.20], [10, 200, 2.80], [12, 200, 6.40]]],
    [115, 'PRV-0004', 'Crédito 15 días', 'F301-1209', 'E', [[21, 40, 17.50], [22, 20, 35.00], [23, 40, 12.50]]],
    [95, 'PRV-0005', 'Crédito 30 días', 'F010-5566', 'E', [[17, 120, 4.80], [18, 60, 7.50], [19, 120, 1.90], [20, 24, 36.00]]],
    [70, 'PRV-0001', 'Contado', 'F001-4590', 'E', [[1, 600, 0.70], [4, 120, 1.70], [5, 120, 1.60]]],
    [45, 'PRV-0006', 'Crédito 15 días', 'F044-0310', 'E', [[13, 1500, 0.35], [14, 100, 2.50], [15, 120, 1.50], [16, 12, 11.20]]],
    [20, 'PRV-0008', 'Crédito 30 días', 'F002-0872', 'E', [[24, 60, 6.20], [7, 100, 12.40]]],
    [6, 'PRV-0002', 'Contado', 'F020-1044', 'B', [[7, 100, 12.60], [11, 30, 8.60]]]
  ];

  var ESTADO_VENTA = { E: 'Emitida', A: 'Anulada', B: 'Borrador' };

  function clienteId(n) { return 'CLI-' + (n < 10 ? '000' : '00') + n; }

  function armarVentas() {
    var r = [], i, f, ls, j, n;
    for (i = 0; i < VENTAS.length; i++) {
      f = VENTAS[i];
      ls = [];
      for (j = 0; j < f[8].length; j++) { ls.push({ item: pid(f[8][j][0]), cantidad: f[8][j][1], precio: PRECIOS[pid(f[8][j][0])] }); }
      n = i + 1;
      r.push({
        id: 'VTA-' + (n < 10 ? '000' : '00') + n, fecha: '@-' + f[0], cliente: clienteId(f[1]), tipoVenta: f[2] === 'C' ? TIPO_CORPORATIVO : TIPO_MOSTRADOR,
        formaPago: f[3], ordenCompra: f[4] || undefined, combo: f[6] || undefined, combosCantidad: f[7], estado: ESTADO_VENTA[f[5]], lineas: ls
      });
    }
    return r;
  }

  function armarCompras() {
    var r = [], i, f, ls, j;
    for (i = 0; i < COMPRAS.length; i++) {
      f = COMPRAS[i];
      ls = [];
      for (j = 0; j < f[5].length; j++) { ls.push({ item: pid(f[5][j][0]), cantidad: f[5][j][1], precio: f[5][j][2] }); }
      r.push({ id: 'CMP-000' + (i + 1), fecha: '@-' + f[0], proveedor: f[1], condicion: f[2], referencia: f[3], estado: f[4] === 'E' ? 'Emitida' : 'Borrador', lineas: ls });
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'papeleria',
    nombre: 'Papelería Útil · Ventas e inventario',
    rubro: 'Papelería y útiles de oficina',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#1d4f91', acento: '#f2b705', siglas: 'PU' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma a las ventas.' },
      { id: 'tramo1', etiqueta: 'Descuento por volumen · 1.er tramo (unidades)', tipo: 'entero', min: 1, valor: 12, ayuda: 'Desde esta cantidad en una línea se aplica el primer descuento.' },
      { id: 'dto1', etiqueta: 'Descuento del 1.er tramo', tipo: 'porcentaje', valor: 3 },
      { id: 'tramo2', etiqueta: 'Descuento por volumen · 2.º tramo (unidades)', tipo: 'entero', min: 1, valor: 48 },
      { id: 'dto2', etiqueta: 'Descuento del 2.º tramo', tipo: 'porcentaje', valor: 7 },
      { id: 'tramo3', etiqueta: 'Descuento por volumen · 3.er tramo (unidades)', tipo: 'entero', min: 1, valor: 120 },
      { id: 'dto3', etiqueta: 'Descuento del 3.er tramo', tipo: 'porcentaje', valor: 12 },
      { id: 'ventanaDemanda', etiqueta: 'Ventana para medir la demanda (días)', tipo: 'entero', min: 1, max: 365, valor: 90, ayuda: 'Se usa para el punto de reposición: unidades vendidas en estos días entre los días.' },
      { id: 'corteA', etiqueta: 'Corte de la clase A en el ABC (% acumulado)', tipo: 'porcentaje', valor: 80 },
      { id: 'corteB', etiqueta: 'Corte de la clase B en el ABC (% acumulado)', tipo: 'porcentaje', valor: 95 }
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
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, ventas, compras, usuarios, bitácora, respaldo y parámetros del negocio.' },
      { id: 'gerente', nombre: 'Gerente de tienda', descripcion: 'Ve todos los reportes, fija categorías y combos, registra pedidos corporativos y puede anular ventas.' },
      { id: 'cajero', nombre: 'Cajero', descripcion: 'Atiende el mostrador: registra clientes y ventas de mostrador. No ve costos, márgenes ni los pedidos corporativos.' },
      { id: 'almacen', nombre: 'Encargado de almacén', descripcion: 'Administra productos y proveedores, registra las compras que suben el stock y consulta lo que hay que reponer.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Marlene Quispe Arce', rol: 'admin', clave: 'Utiles#Adm2026' },
      { usuario: 'gerente', nombre: 'Julio Cárdenas Peña', rol: 'gerente', clave: 'Utiles#Ger2026' },
      { usuario: 'cajero', nombre: 'Ana Lucía Huamaní Rojas', rol: 'cajero', clave: 'Utiles#Caja2026' },
      { usuario: 'almacen', nombre: 'Pedro Quiroz Salazar', rol: 'almacen', clave: 'Utiles#Alm2026' },
      { usuario: 'auditor', nombre: 'Cecilia Vargas Mori', rol: 'auditor', clave: 'Utiles#Aud2026' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'documento', etiqueta: 'DNI o RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^([0-9]{8}|[0-9]{11})$', mensajePatron: 'Escribe un DNI de 8 dígitos o un RUC de 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre o razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'tipo', etiqueta: 'Tipo de cliente', tipo: 'lista', requerido: true, opciones: ['Persona', 'Empresa'], defecto: 'Persona' },
          { id: 'distrito', etiqueta: 'Distrito', tipo: 'lista', opciones: ['Cercado de Lima', 'Breña', 'Jesús María', 'Lince', 'Magdalena del Mar', 'Miraflores', 'San Borja', 'San Miguel', 'Santiago de Surco', 'Surquillo'] },
          { id: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', max: 60 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'limiteCredito', etiqueta: 'Línea de crédito', tipo: 'moneda', min: 0, defecto: 0, ver: ['admin', 'gerente', 'auditor'], ayuda: 'Cero significa que el cliente solo compra al contado. Solo las empresas pueden tener crédito.' }
        ],
        lista: ['documento', 'nombre', 'tipo', 'distrito', 'limiteCredito', 'comprado'],
        buscar: ['documento', 'nombre', 'distrito', 'contacto'],
        calculados: [
          {
            id: 'comprado', etiqueta: 'Compras acumuladas', tipo: 'moneda',
            formula: function (r, ctx) {
              var ventas = ctx.datos.listar('ventas', function (v) { return v.cliente === r.id && v.estado === 'Emitida'; });
              return ctx.redondear(ctx.suma(ventas, function (v) { return v.totales ? v.totales.total : 0; }));
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'cajero', 'auditor'], crear: ['admin', 'gerente', 'cajero'], editar: ['admin', 'gerente', 'cajero'], eliminar: ['admin'] }
      },
      {
        id: 'productos', nombre: 'Producto', plural: 'Productos', prefijo: 'PRD',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del producto', tipo: 'texto', requerido: true, max: 80 },
          { id: 'categoria', etiqueta: 'Categoría', tipo: 'ref', entidad: 'categorias', mostrar: 'nombre', requerido: true },
          { id: 'marca', etiqueta: 'Marca', tipo: 'texto', max: 30 },
          { id: 'proveedor', etiqueta: 'Proveedor habitual', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre', requerido: true },
          { id: 'unidad', etiqueta: 'Unidad de venta', tipo: 'lista', requerido: true, opciones: ['Unidad', 'Caja', 'Paquete', 'Resma', 'Docena'], defecto: 'Unidad' },
          { id: 'costo', etiqueta: 'Costo de la última compra', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'gerente', 'almacen', 'auditor'], ayuda: 'Se actualiza solo al emitir una compra (último costo).' },
          { id: 'precio', etiqueta: 'Precio de venta (sin IGV)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'stock', etiqueta: 'Stock actual', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'stockMin', etiqueta: 'Stock de seguridad', tipo: 'entero', min: 0, requerido: true, defecto: 5, ayuda: 'Lo que debe quedar en el estante cuando llega el pedido. Entra en el punto de reposición.' },
          { id: 'stockMax', etiqueta: 'Stock máximo', tipo: 'entero', min: 1, requerido: true, defecto: 50, ayuda: 'Hasta cuánto se repone. La compra sugerida es este valor menos el stock actual.' },
          { id: 'multiploCompra', etiqueta: 'Múltiplo de compra', tipo: 'entero', min: 1, max: 1000, requerido: true, defecto: 1, ayuda: 'El proveedor vende por cajas o paquetes de esta cantidad de unidades.' },
          { id: 'activo', etiqueta: 'Producto activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'categoria', 'precio', 'stock', 'puntoReposicion', 'compraSugerida', 'situacion'],
        buscar: ['codigo', 'nombre', 'marca'],
        calculados: [
          {
            id: 'margen', etiqueta: 'Margen sobre precio', tipo: 'porcentaje', ver: ['admin', 'gerente', 'almacen', 'auditor'],
            formula: function (r, ctx) { return r.precio > 0 && r.costo !== undefined ? ctx.redondear((r.precio - r.costo) / r.precio * 100) : null; }
          },
          {
            id: 'estadoMargen', etiqueta: 'Frente al objetivo', tipo: 'texto', ver: ['admin', 'gerente', 'almacen', 'auditor'],
            formula: function (r, ctx) {
              var cat = r.categoria ? ctx.datos.obtener('categorias', r.categoria) : null, margen;
              if (!cat || !(r.precio > 0) || r.costo === undefined) { return 'Sin datos'; }
              margen = ctx.redondear((r.precio - r.costo) / r.precio * 100);
              return margen >= cat.margenObjetivo ? 'En el objetivo' : 'Bajo el objetivo (' + ctx.redondear(margen - cat.margenObjetivo) + ' pts)';
            }
          },
          {
            id: 'demandaDiaria', etiqueta: 'Demanda diaria (u.)', tipo: 'numero',
            formula: function (r, ctx) { return ctx.redondear(demandaDiaria(r, ctx)); }
          },
          {
            id: 'puntoReposicion', etiqueta: 'Punto de reposición', tipo: 'entero',
            formula: function (r, ctx) { return puntoReposicionDe(r, ctx); }
          },
          {
            id: 'compraSugerida', etiqueta: 'Compra sugerida (u.)', tipo: 'entero',
            formula: function (r, ctx) { return compraSugeridaDe(r, ctx); }
          },
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r, ctx) { return r.stock <= 0 ? 'Agotado' : (porReponer(r, ctx) ? 'Reponer' : 'Normal'); }
          },
          {
            id: 'valorStock', etiqueta: 'Valor en stock (costo)', tipo: 'moneda', ver: ['admin', 'gerente', 'almacen', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear((r.costo || 0) * (r.stock || 0)); }
          }
        ],
        reglas: [
          {
            id: 'precio-coherente', mensaje: 'El precio de venta no puede ser menor al costo.',
            validar: function (r) { return !(r.costo !== undefined && r.precio < r.costo); }
          },
          {
            id: 'maximo-coherente', mensaje: 'El stock máximo no puede ser menor al stock de seguridad.',
            validar: function (r) { return r.stockMax >= r.stockMin; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'cajero', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'gerente', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'proveedores', nombre: 'Proveedor', plural: 'Proveedores', prefijo: 'PRV',
        campos: [
          { id: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^[0-9]{11}$', mensajePatron: 'El RUC tiene 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', max: 60 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', max: 40 },
          { id: 'diasEntrega', etiqueta: 'Días de entrega', tipo: 'entero', min: 0, max: 60, defecto: 3, ayuda: 'Tiempo desde el pedido hasta que llega a la tienda. Entra en el punto de reposición.' },
          { id: 'diasCredito', etiqueta: 'Días de crédito', tipo: 'entero', min: 0, max: 90, defecto: 30 }
        ],
        lista: ['ruc', 'nombre', 'ciudad', 'diasEntrega', 'diasCredito'],
        buscar: ['ruc', 'nombre', 'ciudad', 'contacto'],
        permisos: { ver: ['admin', 'gerente', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'combos', nombre: 'Combo', plural: 'Combos y kits', prefijo: 'CMB',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del combo', tipo: 'texto', requerido: true, max: 60 },
          { id: 'producto1', etiqueta: 'Producto 1', tipo: 'ref', entidad: 'productos', mostrar: 'nombre', requerido: true },
          { id: 'cantidad1', etiqueta: 'Cantidad del producto 1', tipo: 'entero', min: 1, max: 500, requerido: true, defecto: 1 },
          { id: 'producto2', etiqueta: 'Producto 2', tipo: 'ref', entidad: 'productos', mostrar: 'nombre', requerido: true },
          { id: 'cantidad2', etiqueta: 'Cantidad del producto 2', tipo: 'entero', min: 1, max: 500, requerido: true, defecto: 1 },
          { id: 'producto3', etiqueta: 'Producto 3 (opcional)', tipo: 'ref', entidad: 'productos', mostrar: 'nombre' },
          { id: 'cantidad3', etiqueta: 'Cantidad del producto 3', tipo: 'entero', min: 1, max: 500 },
          { id: 'precio', etiqueta: 'Precio del combo (sin IGV)', tipo: 'moneda', min: 0, requerido: true, ayuda: 'No lleva descuento por volumen: el precio del combo ya es promocional.' },
          { id: 'activo', etiqueta: 'Combo activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'precio', 'precioSueltos', 'ahorroPct', 'margenCombo'],
        buscar: ['codigo', 'nombre'],
        calculados: [
          {
            id: 'precioSueltos', etiqueta: 'Precio sueltos', tipo: 'moneda',
            formula: function (r, ctx) {
              var comps = componentes(r), total = 0, i, p;
              for (i = 0; i < comps.length; i++) { p = ctx.datos.obtener('productos', comps[i].item); total += p ? p.precio * comps[i].cantidad : 0; }
              return ctx.redondear(total);
            }
          },
          {
            id: 'ahorroPct', etiqueta: 'Ahorro para el cliente', tipo: 'porcentaje',
            formula: function (r, ctx) {
              var comps = componentes(r), total = 0, i, p;
              for (i = 0; i < comps.length; i++) { p = ctx.datos.obtener('productos', comps[i].item); total += p ? p.precio * comps[i].cantidad : 0; }
              return total > 0 ? ctx.redondear((total - r.precio) / total * 100) : null;
            }
          },
          {
            id: 'margenCombo', etiqueta: 'Margen del combo', tipo: 'porcentaje', ver: ['admin', 'gerente', 'almacen', 'auditor'],
            formula: function (r, ctx) {
              var comps = componentes(r), costo = 0, i, p;
              for (i = 0; i < comps.length; i++) { p = ctx.datos.obtener('productos', comps[i].item); costo += p ? (p.costo || 0) * comps[i].cantidad : 0; }
              return r.precio > 0 ? ctx.redondear((r.precio - costo) / r.precio * 100) : null;
            }
          }
        ],
        reglas: [
          {
            id: 'combo-no-bajo-costo', mensaje: 'El precio del combo no puede ser menor al costo de sus componentes.',
            validar: function (r, ctx) {
              var comps = componentes(r), costo = 0, i, p;
              for (i = 0; i < comps.length; i++) { p = ctx.datos.obtener('productos', comps[i].item); costo += p ? (p.costo || 0) * comps[i].cantidad : 0; }
              return r.precio >= costo;
            }
          },
          {
            id: 'tercer-producto', mensaje: 'Si eliges el producto 3, indica también su cantidad.',
            validar: function (r) { return !r.producto3 || !!r.cantidad3; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'cajero', 'almacen', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'categorias', nombre: 'Categoría', plural: 'Categorías', prefijo: 'CAT',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, unico: true, max: 40 },
          { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', max: 200 },
          { id: 'margenObjetivo', etiqueta: 'Margen objetivo', tipo: 'porcentaje', min: 0, max: 80, requerido: true, defecto: 30, ayuda: 'Margen mínimo que debería dejar cada producto de la categoría.' }
        ],
        lista: ['nombre', 'descripcion', 'margenObjetivo', 'productos'],
        buscar: ['nombre', 'descripcion'],
        calculados: [
          {
            id: 'productos', etiqueta: 'Productos', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('productos', function (p) { return p.categoria === r.id; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'cajero', 'almacen', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'ventas', nombre: 'Venta', plural: 'Ventas', prefijo: 'VTA', serie: 'V001',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'tipoVenta', etiqueta: 'Tipo de venta', tipo: 'lista', requerido: true, opciones: [TIPO_MOSTRADOR, TIPO_CORPORATIVO], defecto: TIPO_MOSTRADOR, ayuda: 'El pedido corporativo lo registra la gerencia, exige orden de compra y admite crédito.' },
          { id: 'formaPago', etiqueta: 'Forma de pago', tipo: 'lista', requerido: true, opciones: ['Efectivo', 'Tarjeta', 'Yape o Plin', 'Transferencia', 'Crédito 30 días'], defecto: 'Efectivo' },
          { id: 'ordenCompra', etiqueta: 'Orden de compra', tipo: 'texto', max: 20 },
          { id: 'combo', etiqueta: 'Combo (opcional)', tipo: 'ref', entidad: 'combos', mostrar: 'nombre' },
          { id: 'combosCantidad', etiqueta: 'Cantidad de combos', tipo: 'entero', min: 0, max: 200, defecto: 0, ayuda: 'Los combos descuentan del stock cada uno de sus componentes.' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'cliente', 'tipoVenta', 'formaPago'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'productos', mostrar: 'nombre', precio: 'precio',
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, max: 5000, requerido: true, defecto: 1 }],
          importe: function (l, ctx) { return importeLinea(l, ctx); },
          info: function (item, ctx) { return 'Stock disponible: ' + item.stock + ' · Precio de lista: ' + ctx.fmt.moneda(item.precio) + ' · Descuento desde ' + ctx.param('tramo1') + ' u.'; }
        },
        calcular: function (doc, ctx) {
          var bruto = 0, neto = 0, costo = 0, i, l, p, comps, c, n = doc.combosCantidad || 0, combo = doc.combo && n > 0 ? ctx.datos.obtener('combos', doc.combo) : null, subtotal, igv;
          for (i = 0; i < (doc.lineas || []).length; i++) {
            l = doc.lineas[i];
            bruto += l.cantidad * l.precio;
            neto += importeLinea(l, ctx);
            p = ctx.datos.obtener('productos', l.item);
            costo += p ? (p.costo || 0) * l.cantidad : 0;
          }
          if (combo) {
            bruto += combo.precio * n;
            neto += combo.precio * n;
            comps = componentes(combo);
            for (i = 0; i < comps.length; i++) {
              c = ctx.datos.obtener('productos', comps[i].item);
              costo += c ? (c.costo || 0) * comps[i].cantidad * n : 0;
            }
          }
          subtotal = ctx.redondear(neto);
          igv = ctx.redondear(subtotal * ctx.param('igv') / 100);
          return { bruto: ctx.redondear(bruto), descuento: ctx.redondear(bruto - neto), subtotal: subtotal, igv: igv, total: ctx.redondear(subtotal + igv), costoVenta: ctx.redondear(costo) };
        },
        totales: [
          { id: 'bruto', etiqueta: 'Importe a precio de lista' },
          { id: 'descuento', etiqueta: 'Descuento por volumen' },
          { id: 'subtotal', etiqueta: 'Subtotal' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total a pagar', fuerte: true }
        ],
        reglas: [
          {
            id: 'corporativo-con-orden', mensaje: 'El pedido corporativo exige el número de orden de compra del cliente.',
            validar: function (d) { return d.tipoVenta !== TIPO_CORPORATIVO || !!d.ordenCompra; }
          },
          {
            id: 'corporativo-empresa', mensaje: 'El pedido corporativo solo se hace a una empresa.',
            validar: function (d, ctx) {
              var cli;
              if (d.tipoVenta !== TIPO_CORPORATIVO) { return true; }
              cli = ctx.datos.obtener('clientes', d.cliente);
              return !!cli && cli.tipo === 'Empresa';
            }
          },
          {
            id: 'corporativo-con-gerencia', mensaje: 'Los pedidos corporativos los registra la gerencia; en caja solo se hacen ventas de mostrador.',
            validar: function (d, ctx) {
              var u = ctx.usuario();
              return d.tipoVenta !== TIPO_CORPORATIVO || !u || u.rol !== 'cajero';
            }
          },
          {
            id: 'credito-con-linea', mensaje: 'El crédito es solo para pedidos corporativos de clientes con línea de crédito.',
            validar: function (d, ctx) {
              var cli;
              if (d.formaPago !== 'Crédito 30 días') { return true; }
              cli = ctx.datos.obtener('clientes', d.cliente);
              return d.tipoVenta === TIPO_CORPORATIVO && !!cli && cli.limiteCredito > 0;
            }
          },
          {
            id: 'combo-y-cantidad', mensaje: 'Para vender combos elige el combo y una cantidad mayor que cero (o deja ambos vacíos).',
            validar: function (d) { return !d.combosCantidad || !!d.combo; }
          }
        ],
        alEmitir: function (doc, ctx) {
          var consumo = consumoDoc(doc, ctx), k, p, cli, desde, exposicion;
          for (k in consumo) {
            if (consumo.hasOwnProperty(k)) {
              p = ctx.datos.obtener('productos', k);
              if (p.stock < consumo[k]) { throw new Error('Stock insuficiente de «' + p.nombre + '»: hay ' + p.stock + ' y se necesitan ' + consumo[k] + '.'); }
            }
          }
          if (doc.formaPago === 'Crédito 30 días') {
            cli = ctx.datos.obtener('clientes', doc.cliente);
            desde = ctx.fechaMas(ctx.hoy(), -30);
            /* La venta ya figura como emitida cuando se llama a alEmitir, así que la exposición ya la incluye. */
            exposicion = ctx.suma(ctx.datos.listar('ventas', function (v) {
              return v.cliente === doc.cliente && v.estado === 'Emitida' && v.formaPago === 'Crédito 30 días' && v.fecha >= desde;
            }), function (v) { return v.totales ? v.totales.total : 0; });
            if (exposicion > cli.limiteCredito) {
              throw new Error('El pedido supera la línea de crédito de ' + cli.nombre + ' (' + ctx.fmt.moneda(cli.limiteCredito) + '). Crédito vigente: ' + ctx.fmt.moneda(ctx.redondear(exposicion)) + '.');
            }
          }
          for (k in consumo) {
            if (consumo.hasOwnProperty(k)) {
              p = ctx.datos.obtener('productos', k);
              ctx.datos.actualizar('productos', k, { stock: p.stock - consumo[k] });
            }
          }
        },
        alAnular: function (doc, ctx) {
          var consumo = consumoDoc(doc, ctx), k, p;
          for (k in consumo) {
            if (consumo.hasOwnProperty(k)) {
              p = ctx.datos.obtener('productos', k);
              ctx.datos.actualizar('productos', k, { stock: p.stock + consumo[k] });
            }
          }
        },
        permisos: { ver: ['admin', 'gerente', 'cajero', 'auditor'], crear: ['admin', 'gerente', 'cajero'], editar: ['admin', 'gerente', 'cajero'], emitir: ['admin', 'gerente', 'cajero'], anular: ['admin', 'gerente'] }
      },
      {
        id: 'compras', nombre: 'Compra', plural: 'Compras', prefijo: 'CMP', serie: 'OC01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre', requerido: true },
          { id: 'condicion', etiqueta: 'Condición de pago', tipo: 'lista', requerido: true, opciones: ['Contado', 'Crédito 15 días', 'Crédito 30 días'], defecto: 'Contado' },
          { id: 'referencia', etiqueta: 'Factura o guía', tipo: 'texto', max: 30 },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'proveedor', 'condicion', 'referencia'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'productos', mostrar: 'nombre', precio: 'costo', precioEditable: true,
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, max: 20000, requerido: true, defecto: 1 }],
          info: function (item) { return 'Stock actual: ' + item.stock + ' · Se compra de a ' + (item.multiploCompra || 1) + ' u. · Último costo: S/ ' + (item.costo || 0).toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var sub = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var igv = ctx.redondear(sub * 0.18);
          return { subtotal: sub, igv: igv, total: ctx.redondear(sub + igv) };
        },
        totales: [
          { id: 'subtotal', etiqueta: 'Subtotal' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total de la compra', fuerte: true }
        ],
        alEmitir: function (doc, ctx) {
          var i, l, p;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            /* Último costo: el producto queda valorizado con el precio de esta compra. */
            ctx.datos.actualizar('productos', l.item, { stock: p.stock + l.cantidad, costo: l.precio });
          }
        },
        alAnular: function (doc, ctx) {
          var i, l, p;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            if (p.stock < l.cantidad) { throw new Error('No se puede anular: ya se vendió parte de «' + p.nombre + '» (stock ' + p.stock + ', la compra trajo ' + l.cantidad + ').'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            ctx.datos.actualizar('productos', l.item, { stock: p.stock - l.cantidad });
          }
        },
        permisos: { ver: ['admin', 'gerente', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], emitir: ['admin', 'almacen'], anular: ['admin', 'gerente'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ventas-mes', titulo: 'Ventas por mes',
        descripcion: 'Ventas emitidas agrupadas por mes, separando mostrador y pedidos corporativos, con el descuento por volumen otorgado. Las anuladas y los borradores no cuentan.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), grupos = ctx.agrupar(ventas, function (v) { return ctx.mes(v.fecha); });
          var claves = [], k, filas = [], etiquetas = [], valores = [], total = 0, n = 0, dto = 0, g, mos, cor, tot, d;
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          for (k = 0; k < claves.length; k++) {
            g = grupos[claves[k]];
            mos = ctx.redondear(ctx.suma(g, function (v) { return v.tipoVenta === TIPO_MOSTRADOR ? v.totales.total : 0; }));
            cor = ctx.redondear(ctx.suma(g, function (v) { return v.tipoVenta === TIPO_CORPORATIVO ? v.totales.total : 0; }));
            tot = ctx.redondear(ctx.suma(g, function (v) { return v.totales.total; }));
            d = ctx.redondear(ctx.suma(g, function (v) { return v.totales.descuento; }));
            filas.push([nombreMes(claves[k]), g.length, mos, cor, d, tot]);
            etiquetas.push(nombreMes(claves[k]));
            valores.push(tot);
            total += tot;
            n += g.length;
            dto += d;
          }
          return {
            columnas: ['Mes', 'N.º de ventas', 'Mostrador', 'Corporativo', 'Descuento por volumen', 'Total con IGV'], tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Total del periodo', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Ventas emitidas', valor: n, tipo: 'entero' },
              { etiqueta: 'Descuento por volumen dado', valor: ctx.redondear(dto), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'utilidad-categoria', titulo: 'Utilidad por categoría',
        descripcion: 'Ingreso neto (con el descuento por volumen, sin IGV), costo y utilidad de cada categoría, y su margen real frente al margen objetivo. Los combos se muestran aparte.',
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), acum = {}, i, j, l, prod, combo, comps, n, k, cat, filas = [], etiquetas = [], valores = [], ing = 0, cost = 0, a, util, margen, obj;
          function sumar(clave, nombre, objetivo, unidades, ingreso, costo) {
            if (!acum[clave]) { acum[clave] = { nombre: nombre, objetivo: objetivo, unidades: 0, ingreso: 0, costo: 0 }; }
            acum[clave].unidades += unidades;
            acum[clave].ingreso += ingreso;
            acum[clave].costo += costo;
          }
          for (i = 0; i < ventas.length; i++) {
            for (j = 0; j < ventas[i].lineas.length; j++) {
              l = ventas[i].lineas[j];
              prod = ctx.datos.obtener('productos', l.item);
              cat = prod ? ctx.datos.obtener('categorias', prod.categoria) : null;
              sumar(cat ? cat.id : 'sin', cat ? cat.nombre : 'Sin categoría', cat ? cat.margenObjetivo : null, l.cantidad, importeLinea(l, ctx), prod ? (prod.costo || 0) * l.cantidad : 0);
            }
            n = ventas[i].combosCantidad || 0;
            combo = ventas[i].combo && n > 0 ? ctx.datos.obtener('combos', ventas[i].combo) : null;
            if (combo) {
              comps = componentes(combo);
              k = 0;
              for (j = 0; j < comps.length; j++) {
                prod = ctx.datos.obtener('productos', comps[j].item);
                k += prod ? (prod.costo || 0) * comps[j].cantidad * n : 0;
              }
              sumar('combos', 'Combos y kits', null, n, combo.precio * n, k);
            }
          }
          for (k in acum) {
            if (acum.hasOwnProperty(k)) {
              a = acum[k];
              util = a.ingreso - a.costo;
              margen = a.ingreso > 0 ? ctx.redondear(util / a.ingreso * 100) : 0;
              obj = a.objetivo === null ? null : a.objetivo;
              filas.push([a.nombre, a.unidades, ctx.redondear(a.ingreso), ctx.redondear(a.costo), ctx.redondear(util), margen, obj, obj === null ? null : ctx.redondear(margen - obj)]);
              ing += a.ingreso;
              cost += a.costo;
            }
          }
          filas.sort(function (x, y) { return y[4] - x[4]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][4]); }
          return {
            columnas: ['Categoría', 'Unidades', 'Ingreso neto', 'Costo', 'Utilidad', 'Margen real %', 'Margen objetivo %', 'Diferencia (pts)'],
            tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje', 'porcentaje', 'numero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Ingreso neto', valor: ctx.redondear(ing), tipo: 'moneda' },
              { etiqueta: 'Utilidad bruta', valor: ctx.redondear(ing - cost), tipo: 'moneda' },
              { etiqueta: 'Margen global', valor: ing > 0 ? ctx.redondear((ing - cost) / ing * 100) : 0, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'reponer', titulo: 'Productos a reponer',
        descripcion: 'Productos cuyo stock llegó al punto de reposición (demanda diaria × días de entrega del proveedor + stock de seguridad) y cuánto comprar para llegar al stock máximo, en múltiplos de compra. Solo entran los productos que se vendieron en el periodo: lo que no rota no se repone.',
        roles: ['admin', 'gerente', 'almacen', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Medir la demanda desde', tipo: 'fecha', requerido: true, defecto: '@-89' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var prods = ctx.datos.listar('productos', function (x) { return x.activo !== false; }), dias = Math.max(1, ctx.diasEntre(p.desde, p.hasta) + 1), filas = [], etiquetas = [], valores = [], i, x, demanda, prov, plazo, punto, sugerida, costoTotal = 0, unidades = 0, uds;
          for (i = 0; i < prods.length; i++) {
            x = prods[i];
            uds = unidadesVendidas(ctx, x.id, p.desde, p.hasta);
            demanda = uds / dias;
            prov = ctx.datos.obtener('proveedores', x.proveedor);
            plazo = prov ? prov.diasEntrega : 0;
            punto = Math.ceil(ctx.redondear(demanda * plazo)) + x.stockMin;
            if (uds === 0 || x.stock > punto) { continue; }
            sugerida = Math.max(0, x.stockMax - x.stock);
            sugerida = Math.ceil(sugerida / (x.multiploCompra || 1)) * (x.multiploCompra || 1);
            filas.push([x.codigo, x.nombre, prov ? prov.nombre : '', x.stock, ctx.redondear(demanda), plazo, punto, sugerida, ctx.redondear(sugerida * (x.costo || 0))]);
            costoTotal += sugerida * (x.costo || 0);
            unidades += sugerida;
          }
          filas.sort(function (a, b) { return b[8] - a[8]; });
          for (i = 0; i < filas.length && i < 10; i++) { etiquetas.push(filas[i][1]); valores.push(filas[i][7]); }
          return {
            columnas: ['Código', 'Producto', 'Proveedor', 'Stock', 'Demanda diaria', 'Días de entrega', 'Punto de reposición', 'Comprar (u.)', 'Inversión estimada'],
            tipos: ['texto', 'texto', 'texto', 'entero', 'numero', 'entero', 'entero', 'entero', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Productos a reponer', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Unidades a comprar', valor: unidades, tipo: 'entero' },
              { etiqueta: 'Inversión estimada', valor: ctx.redondear(costoTotal), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'ventas-corporativas', titulo: 'Ventas por cliente corporativo',
        descripcion: 'Pedidos corporativos emitidos por cliente: cuántos, unidades, descuento por volumen recibido y ticket promedio.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ctx.datos.listar('ventas', function (v) { return v.tipoVenta === TIPO_CORPORATIVO && v.estado === 'Emitida' && (!p.desde || v.fecha >= p.desde) && (!p.hasta || v.fecha <= p.hasta); });
          var grupos = ctx.agrupar(ventas, function (v) { return v.cliente; }), k, g, cli, filas = [], etiquetas = [], valores = [], total = 0, i, uds, tot;
          for (k in grupos) {
            if (grupos.hasOwnProperty(k)) {
              g = grupos[k];
              cli = ctx.datos.obtener('clientes', k);
              uds = 0;
              for (i = 0; i < g.length; i++) { uds += ctx.suma(g[i].lineas, function (l) { return l.cantidad; }) + (g[i].combosCantidad || 0); }
              tot = ctx.redondear(ctx.suma(g, function (v) { return v.totales.total; }));
              filas.push([cli ? cli.nombre : k, g.length, uds, ctx.redondear(ctx.suma(g, function (v) { return v.totales.descuento; })), tot, ctx.redondear(tot / g.length)]);
              total += tot;
            }
          }
          filas.sort(function (a, b) { return b[4] - a[4]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][4]); }
          return {
            columnas: ['Cliente', 'Pedidos', 'Unidades', 'Descuento por volumen', 'Total con IGV', 'Ticket promedio'],
            tipos: ['texto', 'entero', 'entero', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Ventas corporativas', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Clientes con pedidos', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Pedidos emitidos', valor: ventas.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'abc', titulo: 'Clasificación ABC de productos',
        descripcion: 'Ordena los productos por ingreso neto en el periodo y los clasifica por su porcentaje acumulado: A (los que más aportan), B y C, según los cortes de Configuración. No incluye los combos.',
        roles: ['admin', 'gerente', 'almacen', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), acum = {}, lista = [], i, j, l, k, prod, total = 0, ac = 0, pct, antes, clase, filas = [], conteo = { A: 0, B: 0, C: 0 }, etiquetas = ['Clase A', 'Clase B', 'Clase C'], valores, ingClase = { A: 0, B: 0, C: 0 };
          for (i = 0; i < ventas.length; i++) {
            for (j = 0; j < ventas[i].lineas.length; j++) {
              l = ventas[i].lineas[j];
              if (!acum[l.item]) { acum[l.item] = { id: l.item, unidades: 0, ingreso: 0 }; }
              acum[l.item].unidades += l.cantidad;
              acum[l.item].ingreso += importeLinea(l, ctx);
            }
          }
          for (k in acum) { if (acum.hasOwnProperty(k)) { lista.push(acum[k]); total += acum[k].ingreso; } }
          lista.sort(function (a, b) { return b.ingreso - a.ingreso; });
          for (i = 0; i < lista.length; i++) {
            ac += lista[i].ingreso;
            pct = total > 0 ? ac / total * 100 : 0;
            /* La clase se decide por el acumulado ANTES de sumar el producto: el que cruza el corte sigue en su clase. */
            antes = total > 0 ? (ac - lista[i].ingreso) / total * 100 : 0;
            clase = antes < ctx.param('corteA') ? 'A' : (antes < ctx.param('corteB') ? 'B' : 'C');
            prod = ctx.datos.obtener('productos', lista[i].id);
            conteo[clase] += 1;
            ingClase[clase] += lista[i].ingreso;
            filas.push([i + 1, prod ? prod.nombre : lista[i].id, lista[i].unidades, ctx.redondear(lista[i].ingreso), total > 0 ? ctx.redondear(lista[i].ingreso / total * 100) : 0, ctx.redondear(pct), clase]);
          }
          valores = [ctx.redondear(ingClase.A), ctx.redondear(ingClase.B), ctx.redondear(ingClase.C)];
          return {
            columnas: ['N.º', 'Producto', 'Unidades', 'Ingreso neto', '% del total', '% acumulado', 'Clase'],
            tipos: ['entero', 'texto', 'entero', 'moneda', 'porcentaje', 'porcentaje', 'texto'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Productos clase A', valor: conteo.A, tipo: 'entero' },
              { etiqueta: 'Productos clase B', valor: conteo.B, tipo: 'entero' },
              { etiqueta: 'Productos clase C', valor: conteo.C, tipo: 'entero' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Ventas de los últimos 30 días', tipo: 'moneda',
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(ventasEmitidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (v) { return v.totales.total; }));
        }
      },
      {
        titulo: 'Variación frente a los 30 días anteriores', tipo: 'porcentaje', roles: ['admin', 'gerente', 'auditor'],
        calcular: function (ctx) {
          var hoy = ctx.hoy();
          var actual = ctx.suma(ventasEmitidas(ctx, ctx.fechaMas(hoy, -29), hoy), function (v) { return v.totales.total; });
          var previo = ctx.suma(ventasEmitidas(ctx, ctx.fechaMas(hoy, -59), ctx.fechaMas(hoy, -30)), function (v) { return v.totales.total; });
          return previo > 0 ? ctx.redondear((actual - previo) / previo * 100) : null;
        }
      },
      {
        titulo: 'Pedidos corporativos (30 días)', tipo: 'entero', roles: ['admin', 'gerente', 'auditor'],
        calcular: function (ctx) {
          return ventasEmitidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()).filter(function (v) { return v.tipoVenta === TIPO_CORPORATIVO; }).length;
        }
      },
      {
        titulo: 'Productos por reponer', tipo: 'entero', roles: ['admin', 'gerente', 'almacen', 'auditor'],
        nota: 'Stock en o bajo el punto de reposición',
        calcular: function (ctx) { return ctx.datos.listar('productos', function (p) { return porReponer(p, ctx); }).length; }
      },
      {
        titulo: 'Valor del inventario al costo', tipo: 'moneda', roles: ['admin', 'gerente', 'almacen', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(ctx.datos.listar('productos'), function (p) { return (p.costo || 0) * p.stock; }));
        }
      },
      {
        titulo: 'Borradores por emitir', tipo: 'entero',
        calcular: function (ctx) {
          var sinEmitir = function (d) { return d.estado === 'Borrador'; };
          return ctx.datos.listar('ventas', sinEmitir).length + ctx.datos.listar('compras', sinEmitir).length;
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Ventas de los últimos 6 meses (con IGV)', tipo: 'columnas', formato: 'moneda',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), ventas = ventasEmitidas(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(ventas, function (v) { return ctx.mes(v.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(ctx.redondear(ctx.suma(g[meses[i]] || [], function (v) { return v.totales.total; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      categorias: [
        { id: 'CAT-0001', nombre: 'Escritura', descripcion: 'Lapiceros, lápices, marcadores y resaltadores.', margenObjetivo: 38 },
        { id: 'CAT-0002', nombre: 'Papel y cuadernos', descripcion: 'Resmas, cuadernos, blocks y papel fotográfico.', margenObjetivo: 28 },
        { id: 'CAT-0003', nombre: 'Archivo y organización', descripcion: 'Archivadores, folders, faster, clips y engrapadoras.', margenObjetivo: 33 },
        { id: 'CAT-0004', nombre: 'Escolar y arte', descripcion: 'Colores, témperas, gomas y mochilas.', margenObjetivo: 36 },
        { id: 'CAT-0005', nombre: 'Tecnología y accesorios', descripcion: 'Memorias USB, calculadoras y mouse.', margenObjetivo: 24 },
        { id: 'CAT-0006', nombre: 'Limpieza y cafetería', descripcion: 'Gel antibacterial y artículos de limpieza para oficina.', margenObjetivo: 27 }
      ],
      proveedores: [
        { id: 'PRV-0001', ruc: '20511223341', nombre: 'Distribuidora Colibrí Escritura S.A.C.', contacto: 'Hernán Salcedo', telefono: '01 331 2200', email: 'ventas@colibri.example.pe', ciudad: 'Lima', diasEntrega: 3, diasCredito: 30 },
        { id: 'PRV-0002', ruc: '20522334452', nombre: 'PapelAndes Industrial S.A.', contacto: 'Rosa Elvira Ticona', telefono: '01 441 5600', email: 'pedidos@papelandes.example.pe', ciudad: 'Lima', diasEntrega: 2, diasCredito: 30 },
        { id: 'PRV-0003', ruc: '20533445563', nombre: 'Cuadernos Kuyay E.I.R.L.', contacto: 'Mauricio Landa', telefono: '01 336 7788', email: 'comercial@kuyay.example.pe', ciudad: 'Lima', diasEntrega: 4, diasCredito: 15 },
        { id: 'PRV-0004', ruc: '20544556674', nombre: 'Datix Accesorios Tecnológicos S.A.C.', contacto: 'Verónica Pacheco', telefono: '01 612 9034', email: 'mayoristas@datix.example.pe', ciudad: 'Lima', diasEntrega: 5, diasCredito: 15 },
        { id: 'PRV-0005', ruc: '20555667785', nombre: 'Arte Escolar del Perú S.R.L.', contacto: 'Luis Alberto Meza', telefono: '01 575 4410', email: 'ventas@arteescolar.example.pe', ciudad: 'Callao', diasEntrega: 7, diasCredito: 30 },
        { id: 'PRV-0006', ruc: '20566778896', nombre: 'Ordenax Oficina y Archivo S.A.C.', contacto: 'Paola Zúñiga', telefono: '01 422 3188', email: 'info@ordenax.example.pe', ciudad: 'Lima', diasEntrega: 3, diasCredito: 15 },
        { id: 'PRV-0007', ruc: '20577889907', nombre: 'Metalix Herramientas de Oficina S.A.', contacto: 'Édgar Rivas', telefono: '01 478 2255', email: 'pedidos@metalix.example.pe', ciudad: 'Lima', diasEntrega: 6, diasCredito: 30 },
        { id: 'PRV-0008', ruc: '20588990018', nombre: 'Limpiol Higiene Total E.I.R.L.', contacto: 'Silvia Carrasco', telefono: '01 351 6620', email: 'contacto@limpiol.example.pe', ciudad: 'Lima', diasEntrega: 2, diasCredito: 0 },
        { id: 'PRV-0009', ruc: '20599001129', nombre: 'Imprenta y Etiquetas Sol Naciente S.A.C.', contacto: 'Gloria Yupanqui', telefono: '01 433 7090', email: 'pedidos@solnaciente.example.pe', ciudad: 'Lima', diasEntrega: 5, diasCredito: 30 },
        { id: 'PRV-0010', ruc: '20610112230', nombre: 'Importaciones Pegadix del Perú S.A.', contacto: 'Franco Medrano', telefono: '01 617 5521', email: 'ventas@pegadix.example.pe', ciudad: 'Callao', diasEntrega: 8, diasCredito: 45 },
        { id: 'PRV-0011', ruc: '20621223341', nombre: 'Mochilas y Maletines Trekito S.R.L.', contacto: 'Carolina Dueñas', telefono: '01 328 4467', email: 'mayorista@trekito.example.pe', ciudad: 'Lima', diasEntrega: 6, diasCredito: 30 },
        { id: 'PRV-0012', ruc: '20632334452', nombre: 'Distribuidora de Cartones Pacífico E.I.R.L.', contacto: 'Walter Ochoa', telefono: '01 452 9903', email: 'cartones@pacifico.example.pe', ciudad: 'Lima', diasEntrega: 4, diasCredito: 15 }
      ],
      clientes: [
        { id: 'CLI-0001', documento: '00000001', nombre: 'Clientes varios (boleta de mostrador)', tipo: 'Persona', distrito: 'Cercado de Lima', limiteCredito: 0 },
        { id: 'CLI-0002', documento: '20601112223', nombre: 'Colegio Santa Teresita del Rímac S.A.C.', tipo: 'Empresa', distrito: 'Cercado de Lima', contacto: 'Lic. Norma Bustíos', telefono: '01 481 2290', email: 'logistica@santateresita.example.pe', limiteCredito: 6000 },
        { id: 'CLI-0003', documento: '20602223334', nombre: 'I.E.P. Los Pinos del Sur E.I.R.L.', tipo: 'Empresa', distrito: 'Santiago de Surco', contacto: 'Prof. Raúl Quintanilla', telefono: '01 275 6310', email: 'compras@lospinos.example.pe', limiteCredito: 8000 },
        { id: 'CLI-0004', documento: '20603334445', nombre: 'Estudio Contable Valdez y Asociados S.C.', tipo: 'Empresa', distrito: 'Jesús María', contacto: 'CPC Marta Valdez', telefono: '01 463 7021', email: 'administracion@valdezcontables.example.pe', limiteCredito: 3000 },
        { id: 'CLI-0005', documento: '20604445556', nombre: 'Clínica Dental Sonríe Lima S.A.C.', tipo: 'Empresa', distrito: 'Miraflores', contacto: 'Karina Soto', telefono: '01 444 9180', email: 'gerencia@sonrie.example.pe', limiteCredito: 2500 },
        { id: 'CLI-0006', documento: '20605556667', nombre: 'Constructora Rímac Norte S.A.C.', tipo: 'Empresa', distrito: 'San Miguel', contacto: 'Ing. Jorge Alva', telefono: '01 566 4433', email: 'compras@rimacnorte.example.pe', limiteCredito: 10000 },
        { id: 'CLI-0007', documento: '20606667778', nombre: 'Academia Pre Cima S.A.C.', tipo: 'Empresa', distrito: 'Breña', contacto: 'Rodolfo Meneses', telefono: '01 424 8800', email: 'admin@precima.example.pe', limiteCredito: 4000 },
        { id: 'CLI-0008', documento: '20607778889', nombre: 'Inversiones Pachacámac E.I.R.L.', tipo: 'Empresa', distrito: 'Lince', contacto: 'Teresa Mogrovejo', telefono: '01 421 3377', email: 'oficina@pachacamac.example.pe', limiteCredito: 3500 },
        { id: 'CLI-0009', documento: '20608889990', nombre: 'Centro de Idiomas Linguas S.A.C.', tipo: 'Empresa', distrito: 'Magdalena del Mar', contacto: 'Daniela Prado', telefono: '01 460 5512', email: 'secretaria@linguas.example.pe', limiteCredito: 3000 },
        { id: 'CLI-0010', documento: '43215670', nombre: 'Carmen Rosa Delgado Flores', tipo: 'Persona', distrito: 'Breña', telefono: '959 120 331', email: 'carmen.delgado@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0011', documento: '29345611', nombre: 'Mario Antonio Cáceres Zevallos', tipo: 'Persona', distrito: 'Lince', telefono: '958 440 217', limiteCredito: 0 },
        { id: 'CLI-0012', documento: '40128760', nombre: 'Lucía Fernández Valdivia', tipo: 'Persona', distrito: 'Jesús María', telefono: '957 301 882', email: 'lucia.fernandez@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0013', documento: '44587322', nombre: 'José Luis Condori Mamani', tipo: 'Persona', distrito: 'Surquillo', telefono: '956 118 903', limiteCredito: 0 },
        { id: 'CLI-0014', documento: '41236984', nombre: 'Patricia Salas Ugarte', tipo: 'Persona', distrito: 'San Borja', telefono: '955 672 410', email: 'patricia.salas@correo.example.pe', limiteCredito: 0 }
      ],
      productos: productos,
      combos: [
        { id: 'CMB-0001', codigo: 'KIT-ESC-PRIM', nombre: 'Kit escolar primaria', producto1: 'PRD-0009', cantidad1: 4, producto2: 'PRD-0006', cantidad2: 6, producto3: 'PRD-0017', cantidad3: 1, precio: 35.90, activo: true },
        { id: 'CMB-0002', codigo: 'KIT-OFI-INI', nombre: 'Kit de oficina inicial', producto1: 'PRD-0007', cantidad1: 1, producto2: 'PRD-0001', cantidad2: 10, producto3: 'PRD-0013', cantidad3: 25, precio: 39.90, activo: true },
        { id: 'CMB-0003', codigo: 'KIT-ARCHIVO', nombre: 'Kit de archivo', producto1: 'PRD-0012', cantidad1: 3, producto2: 'PRD-0014', cantidad2: 1, producto3: 'PRD-0013', cantidad3: 50, precio: 56.90, activo: true },
        { id: 'CMB-0004', codigo: 'KIT-ARTE', nombre: 'Kit de arte', producto1: 'PRD-0018', cantidad1: 1, producto2: 'PRD-0017', cantidad2: 2, producto3: 'PRD-0019', cantidad3: 2, precio: 29.50, activo: true },
        { id: 'CMB-0005', codigo: 'KIT-TECNO', nombre: 'Kit de tecnología', producto1: 'PRD-0021', cantidad1: 1, producto2: 'PRD-0023', cantidad2: 1, precio: 39.00, activo: true },
        { id: 'CMB-0006', codigo: 'KIT-CLASES-PLUS', nombre: 'Kit regreso a clases plus', producto1: 'PRD-0020', cantidad1: 1, producto2: 'PRD-0009', cantidad2: 6, producto3: 'PRD-0017', cantidad3: 1, precio: 92.00, activo: true }
      ],
      ventas: armarVentas(),
      compras: armarCompras()
    }
  };
})();
