/*
 * Botica Salud Total · Ventas y lotes (Huancayo, Junín)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «botica». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC, DNI, CMP y recetas de ejemplo) y no corresponden a
 * personas, médicos ni empresas reales. NO hay datos de salud de nadie: solo productos
 * y movimientos de una botica ficticia. Todo el código es ES5.
 *
 * Idea del negocio: cada producto se guarda en lotes con fecha de vencimiento. Las ventas
 * descuentan del lote que vence primero (FEFO), las compras crean lotes, y los
 * medicamentos con receta (o controlados) exigen datos de la receta.
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var COND_LIBRE = 'Venta libre';
  var COND_RECETA = 'Con receta médica';
  var COND_CONTROLADO = 'Receta retenida (controlado)';

  function nombreMes(clave) { return MESES[parseInt(clave.slice(5, 7), 10) - 1] + ' ' + clave.slice(0, 4); }

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

  function pct(parte, todo) { return todo > 0 ? parte / todo * 100 : 0; }

  /* Precio sin IGV a partir de un precio de venta al público (que ya incluye el IGV). */
  function sinIgv(monto, ctx) { return monto / (1 + ctx.param('igv') / 100); }

  /* Porcentaje de descuento que da la tarjeta de fidelidad del cliente. */
  function pctTarjeta(cli, ctx) {
    if (!cli) { return 0; }
    if (cli.tarjeta === 'Plata') { return ctx.param('descPlata'); }
    if (cli.tarjeta === 'Oro') { return ctx.param('descOro'); }
    if (cli.tarjeta === 'Platino') { return ctx.param('descPlatino'); }
    return 0;
  }

  /* Alerta de vencimiento por colores a partir de los días que faltan. */
  function colorVencimiento(dias, ctx) {
    if (dias < 0) { return 'Vencido'; }
    if (dias <= ctx.param('alertaRojaDias')) { return 'Rojo'; }
    if (dias <= ctx.param('alertaAmarillaDias')) { return 'Amarillo'; }
    return 'Verde';
  }

  /* Texto de la alerta de un lote: «Rojo · vence en 12 d», «Vencido hace 40 d»… */
  function alertaLote(l, ctx) {
    var d;
    if (l.estado === 'Retirado') { return 'Retirado'; }
    if (!(l.stock > 0)) { return 'Sin stock'; }
    d = ctx.diasEntre(ctx.hoy(), l.vencimiento);
    if (d < 0) { return 'Vencido hace ' + (-d) + ' d'; }
    return colorVencimiento(d, ctx) + ' · vence en ' + d + ' d';
  }

  /*
   * Lotes de un producto de los que se puede vender, en orden FEFO (first expired, first out):
   * disponibles, con stock y sin vencer; primero el que vence antes y, a igual fecha, el que entró antes.
   */
  function lotesFefo(productoId, ctx) {
    var hoy = ctx.hoy(), lista = ctx.datos.listar('lotes', function (x) {
      return x.producto === productoId && x.estado === 'Disponible' && x.stock > 0 && x.vencimiento >= hoy;
    });
    lista.sort(function (a, b) {
      if (a.vencimiento !== b.vencimiento) { return a.vencimiento < b.vencimiento ? -1 : 1; }
      if (a.fechaIngreso !== b.fechaIngreso) { return a.fechaIngreso < b.fechaIngreso ? -1 : 1; }
      return a.id < b.id ? -1 : 1;
    });
    return lista;
  }

  /* Reparte una cantidad entre los lotes FEFO: devuelve { asignaciones: [{lote, cantidad}], faltante }. */
  function asignarFefo(productoId, cantidad, ctx) {
    var lotes = lotesFefo(productoId, ctx), pendiente = cantidad, r = [], i, tomar;
    for (i = 0; i < lotes.length && pendiente > 0; i++) {
      tomar = Math.min(lotes[i].stock, pendiente);
      r.push({ lote: lotes[i], cantidad: tomar });
      pendiente -= tomar;
    }
    return { asignaciones: r, faltante: pendiente };
  }

  /* Descuento de tarjeta de una línea de venta: no se aplica a medicamentos controlados. */
  function descuentoLinea(l, prod, cli, ctx) {
    if (!prod || prod.condicionVenta === COND_CONTROLADO) { return 0; }
    return l.cantidad * l.precio * pctTarjeta(cli, ctx) / 100;
  }

  /* Ventas emitidas (no borradores ni anuladas) dentro de un rango de fechas. */
  function ventasEmitidas(ctx, desde, hasta) {
    return ctx.datos.listar('ventas', function (v) {
      return v.estado === 'Emitida' && (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta);
    });
  }

  /* Lotes con existencias que todavía están en la botica (no retirados). */
  function lotesEnStock(ctx) {
    return ctx.datos.listar('lotes', function (l) { return l.estado !== 'Retirado' && l.stock > 0; });
  }

  function stockBajo(p) { return p.activo !== false && p.stock <= p.stockMin; }

  function movimiento(ctx, doc, lote, tipo, cantidad) {
    var u = ctx.usuario();
    ctx.datos.crear('movimientos', {
      fecha: ctx.hoy(), producto: lote.producto, lote: lote.id, tipo: tipo, cantidad: cantidad,
      documento: doc.numero || doc.id, usuario: u ? u.usuario : 'sistema'
    });
  }

  /* Código de lote cuando el proveedor no lo indicó: interno, único por documento y línea. */
  function loteInterno(doc, i) { return 'INT-' + String(doc.numero || doc.id).slice(-4) + '-' + (i + 1); }

  /* ---------- Datos de demostración ---------- */

  var CATEGORIAS = ['Analgésicos y antiinflamatorios', 'Antibióticos', 'Antialérgicos', 'Gastrointestinales', 'Cardiovasculares y diabetes', 'Psicotrópicos y opioides', 'Vitaminas y suplementos', 'Antisépticos y curación', 'Cuidado personal', 'Antiparasitarios'];

  /* [código, nombre, categoría (0…), presentación, laboratorio, condición, costo, precio con IGV, stock mínimo] */
  var PRODUCTOS = [
    ['AGU-OXI', 'Agua oxigenada 120 vol', 7, 'Frasco de 120 ml', 'Genéricos Perú', COND_LIBRE, 1.8, 3.5, 10],
    ['ALB-400', 'Albendazol 400 mg', 9, 'Caja de 2 tabletas', 'Vida Pharma', COND_LIBRE, 2.4, 5.5, 12],
    ['ALC-70', 'Alcohol medicinal 70°', 7, 'Frasco de 250 ml', 'Genéricos Perú', COND_LIBRE, 2.8, 5.5, 10],
    ['AMX-500', 'Amoxicilina 500 mg', 1, 'Caja de 21 cápsulas', 'Farmacéutica del Sur', COND_RECETA, 8.5, 16.9, 15],
    ['AZI-500', 'Azitromicina 500 mg', 1, 'Caja de 3 tabletas', 'Laboratorio Mantaro', COND_RECETA, 6.5, 14.9, 15],
    ['CLO-2', 'Clonazepam 2 mg', 5, 'Caja de 30 tabletas', 'Laboratorios Andinos', COND_CONTROLADO, 9.5, 19.9, 8],
    ['DIA-10', 'Diazepam 10 mg', 5, 'Caja de 20 tabletas', 'Laboratorios Andinos', COND_CONTROLADO, 7.5, 16.9, 8],
    ['TRA-50', 'Tramadol 50 mg', 5, 'Caja de 20 cápsulas', 'Farmacéutica del Sur', COND_CONTROLADO, 9, 19.5, 20],
    ['PAR-500', 'Paracetamol 500 mg', 0, 'Caja de 100 tabletas', 'Genéricos Perú', COND_LIBRE, 8, 17.9, 25],
    ['IBU-400', 'Ibuprofeno 400 mg', 0, 'Caja de 100 tabletas', 'Genéricos Perú', COND_LIBRE, 11, 22.9, 20],
    ['NAP-550', 'Naproxeno 550 mg', 0, 'Caja de 30 tabletas', 'Laboratorio Mantaro', COND_RECETA, 9.5, 19.9, 12],
    ['LOR-10', 'Loratadina 10 mg', 2, 'Caja de 100 tabletas', 'Vida Pharma', COND_LIBRE, 8.5, 18.5, 15],
    ['OME-20', 'Omeprazol 20 mg', 3, 'Caja de 30 cápsulas', 'Vida Pharma', COND_LIBRE, 5.5, 12.9, 15],
    ['LOS-50', 'Losartán 50 mg', 4, 'Caja de 30 tabletas', 'Laboratorio Mantaro', COND_RECETA, 6, 13.9, 15],
    ['MET-850', 'Metformina 850 mg', 4, 'Caja de 60 tabletas', 'Farmacéutica del Sur', COND_RECETA, 7, 15.9, 15],
    ['VTC-1G', 'Vitamina C 1 g efervescente', 6, 'Tubo de 10 tabletas', 'Laboratorios Andinos', COND_LIBRE, 7.5, 13.9, 10],
    ['SUE-ORA', 'Suero oral', 3, 'Sobre', 'Genéricos Perú', COND_LIBRE, 1.1, 2.5, 30],
    ['PRO-SOL', 'Protector solar FPS 50', 8, 'Frasco de 120 ml', 'Laboratorios Andinos', COND_LIBRE, 18, 34.9, 6],
    ['JER-5', 'Jeringa descartable 5 ml', 7, 'Caja de 100 unidades', 'Genéricos Perú', COND_LIBRE, 22, 39.9, 5],
    ['MAS-50', 'Mascarilla quirúrgica', 7, 'Caja de 50 unidades', 'Genéricos Perú', COND_LIBRE, 6.5, 12.9, 10]
  ];

  /* [código, razón social, contacto, teléfono, correo, ciudad, días de crédito] */
  var PROVEEDORES = [
    ['20512340011', 'Droguería Mantaro S.A.C.', 'Julio Arce', '064 231 100', 'ventas@mantaro.example.pe', 'Huancayo', 30],
    ['20523450022', 'Distribuidora Farmacéutica Andina S.A.', 'Mónica Reyes', '01 441 2200', 'pedidos@farmandina.example.pe', 'Lima', 30],
    ['20534560033', 'Laboratorios Andinos S.A.', 'Víctor Huamán', '01 336 5500', 'comercial@labandinos.example.pe', 'Lima', 45],
    ['20545670044', 'Genéricos Perú E.I.R.L.', 'Rocío Paredes', '01 575 8800', 'ventas@genericosperu.example.pe', 'Lima', 15],
    ['20556780055', 'Droguería Sierra Central S.R.L.', 'Edgar Poma', '064 247 310', 'sierra@drogcentral.example.pe', 'Huancayo', 0],
    ['20567890066', 'Vida Pharma S.A.C.', 'Lorena Castro', '01 612 7700', 'mayorista@vidapharma.example.pe', 'Lima', 30],
    ['20578900077', 'Farmacéutica del Sur S.A.', 'Néstor Quispe', '054 285 640', 'pedidos@farmasur.example.pe', 'Arequipa', 30],
    ['20589010088', 'Insumos Médicos Wanka S.A.C.', 'Ángela Soto', '064 233 405', 'info@insumoswanka.example.pe', 'Huancayo', 15],
    ['20590120099', 'Laboratorio Mantaro S.A.', 'Raúl Cóndor', '064 252 980', 'ventas@labmantaro.example.pe', 'Huancayo', 30]
  ];

  /* [DNI o RUC, nombre, tarjeta, distrito, teléfono, afiliación (días atrás)] */
  var CLIENTES = [
    ['00000000', 'Clientes varios (venta de mostrador)', 'Sin tarjeta', 'Huancayo', '', 0],
    ['43215678', 'Carmen Rosa Delgado Flores', 'Oro', 'El Tambo', '959120331', 720],
    ['29345612', 'Mario Antonio Cáceres Zevallos', 'Plata', 'Huancayo', '958440217', 410],
    ['40128765', 'Lucía Fernández Valdivia', 'Platino', 'Chilca', '957301882', 900],
    ['44587321', 'José Luis Condori Mamani', 'Sin tarjeta', 'El Tambo', '956118903', 0],
    ['41236987', 'Patricia Salas Ugarte', 'Plata', 'Huancayo', '955672410', 380],
    ['45870123', 'Rodrigo Medina Bellido', 'Sin tarjeta', 'Chilca', '954209337', 0],
    ['42319854', 'Ana María Quispe Huanca', 'Oro', 'Huancayo', '953884120', 530],
    ['46721039', 'Fernando Cuadros Linares', 'Plata', 'El Tambo', '952316774', 260],
    ['47015682', 'Gabriela Núñez Paredes', 'Sin tarjeta', 'Huancayo', '951450628', 0],
    ['20493827561', 'Hogar de Ancianos San José', 'Platino', 'Huancayo', '064 231 450', 610],
    ['48120567', 'Walter Ayala Rojas', 'Sin tarjeta', 'Chilca', '950772119', 0],
    ['49230671', 'Sofía Manrique Torres', 'Oro', 'El Tambo', '949881026', 340],
    ['40873215', 'Elías Gutarra Poma', 'Plata', 'Huancayo', '948660312', 200]
  ];

  var MEDICOS = [['Dr. Ricardo Salcedo Ponce', '45231'], ['Dra. Verónica Mallma Campos', '51872'], ['Dr. Alfredo Zárate Bonilla', '38410'], ['Dra. Cecilia Rojas Ñahui', '60235']];

  /*
   * Lotes: [producto (1…), código de lote, proveedor (1…), ingreso (días atrás), vencimiento (días desde hoy), cantidad inicial, ubicación, estado].
   * Los de ingreso 215 son existencia inicial (sin compra en el periodo); los demás nacen de una compra.
   */
  var LOTES = [
    [1, 'AO2509', 4, 215, 330, 40, 'Estante A-1', 'Disponible'],
    [2, 'AL2507', 6, 215, 420, 60, 'Estante B-2', 'Disponible'],
    [3, 'AM2510', 4, 215, 560, 50, 'Estante A-1', 'Disponible'],
    [4, 'AX2405', 7, 215, -12, 60, 'Estante C-1', 'Disponible'],
    [4, 'AX2509', 7, 100, 500, 90, 'Estante C-1', 'Disponible'],
    [5, 'AZ2506', 9, 170, 11, 40, 'Estante C-2', 'Disponible'],
    [6, 'CL2601', 3, 145, 380, 30, 'Vitrina de controlados', 'Disponible'],
    [7, 'DZ2602', 3, 145, 410, 30, 'Vitrina de controlados', 'Disponible'],
    [8, 'TR2511', 7, 98, 290, 24, 'Vitrina de controlados', 'Disponible'],
    [9, 'PA2505', 4, 215, 18, 70, 'Estante D-1', 'Disponible'],
    [9, 'PA2601', 4, 98, 400, 120, 'Estante D-1', 'Disponible'],
    [10, 'IB2507', 4, 120, 55, 70, 'Estante D-2', 'Disponible'],
    [10, 'IB2603', 4, 33, 520, 100, 'Estante D-2', 'Disponible'],
    [11, 'NA2512', 9, 98, 470, 60, 'Estante C-3', 'Disponible'],
    [12, 'LO2504', 6, 215, 26, 60, 'Estante B-1', 'Disponible'],
    [12, 'LO2605', 6, 52, 600, 100, 'Estante B-1', 'Disponible'],
    [13, 'OM2508', 6, 120, 72, 60, 'Estante B-3', 'Disponible'],
    [13, 'OM2606', 6, 14, 640, 100, 'Estante B-3', 'Disponible'],
    [14, 'LS2509', 9, 120, 85, 70, 'Estante C-4', 'Disponible'],
    [14, 'LS2604', 9, 52, 540, 90, 'Estante C-4', 'Disponible'],
    [15, 'ME2510', 7, 75, 450, 80, 'Estante C-4', 'Disponible'],
    [16, 'VC2403', 3, 215, -40, 14, 'Estante E-1', 'Cuarentena'],
    [16, 'VC2606', 3, 52, 360, 40, 'Estante E-1', 'Disponible'],
    [17, 'SO2507', 1, 170, 29, 180, 'Estante E-2', 'Disponible'],
    [17, 'SO2608', 1, 14, 480, 200, 'Estante E-2', 'Disponible'],
    [18, 'PS2512', 3, 52, 620, 24, 'Vitrina de cuidado personal', 'Disponible'],
    [19, 'JE2601', 8, 75, 900, 30, 'Estante F-1', 'Disponible'],
    [20, 'MQ2510', 8, 75, 64, 40, 'Estante F-2', 'Disponible'],
    [1, 'AO2606', 4, 5, 700, 60, 'Estante A-1', 'Disponible'],
    [2, 'AL2608', 6, 5, 640, 60, 'Estante B-2', 'Disponible'],
    [3, 'AM2607', 4, 5, 580, 50, 'Estante A-1', 'Disponible'],
    [18, 'PS2701', 3, 33, 700, 20, 'Vitrina de cuidado personal', 'Disponible'],
    [20, 'MQ2701', 8, 33, 760, 40, 'Estante F-2', 'Disponible']
  ];

  /* Generador determinista (misma secuencia siempre): los datos de demostración no cambian entre cargas. */
  var semilla = 7117;
  function azar() { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; }

  function id4(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : (n < 100 ? '00' : '0')) + n; }
  function redondeo2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  /* Cantidad típica de envases por línea según el precio del producto. */
  function cantidadTipica(prod) {
    if (prod[7] < 5) { return 1 + Math.floor(azar() * 4); }
    if (prod[7] < 20) { return 1 + Math.floor(azar() * 3); }
    return 1 + Math.floor(azar() * 2);
  }

  /*
   * Arma las ventas, sus movimientos de lote y las existencias de cada lote simulando el FEFO día por día,
   * de modo que los datos iniciales ya cuadran: stock del producto = suma de sus lotes.
   */
  function simular() {
    var LIBRES = [1, 2, 3, 9, 10, 12, 13, 16, 17, 18, 19, 20], RECETAS = [4, 5, 11, 14, 15], CONTROLADOS = [6, 7, 8];
    var N = 120, filas = [], i, j, k, f, dias, cli, pago, nl, lineas, usados, p, r, q, tipo;
    var lotes = [], stocks = [], compras = [], movs = [], grupos = {}, claves = [], g, cont = 0, cands, pendiente, usadoEnLinea, tomar;
    for (i = 0; i < LOTES.length; i++) { lotes.push({ idx: i, prod: LOTES[i][0], ing: LOTES[i][3], ven: LOTES[i][4] }); stocks.push(LOTES[i][5]); }

    /* 1. Ventas pedidas (antes de saber qué lotes les tocan) */
    for (i = 0; i < N; i++) {
      dias = 188 - Math.round(i * 1.55);
      if (dias < 0) { dias = 0; }
      cli = azar() < 0.5 ? 1 : 2 + Math.floor(azar() * (CLIENTES.length - 1));
      r = azar();
      pago = r < 0.55 ? 'Efectivo' : (r < 0.85 ? 'Yape o Plin' : 'Tarjeta');
      nl = 1 + Math.floor(azar() * 4);
      lineas = [];
      usados = {};
      for (j = 0; j < nl; j++) {
        r = azar();
        tipo = r < 0.68 ? LIBRES : (r < 0.93 ? RECETAS : CONTROLADOS);
        p = tipo[Math.floor(azar() * tipo.length)];
        if (usados[p]) { continue; }
        usados[p] = true;
        q = tipo === CONTROLADOS ? 1 + Math.floor(azar() * 2) : cantidadTipica(PRODUCTOS[p - 1]);
        lineas.push([p, q]);
      }
      if (!lineas.length) { lineas.push([9, 1]); }
      filas.push({ dias: dias, cli: cli, pago: pago, lineas: lineas, estado: (i === 37 || i === 91) ? 'Anulada' : (i >= N - 2 ? 'Borrador' : 'Emitida') });
    }

    /* 2. Compras: un documento por (día de ingreso, proveedor) con los lotes que entraron ese día */
    for (i = 0; i < LOTES.length; i++) {
      if (LOTES[i][3] >= 200) { continue; }
      k = LOTES[i][3] + '|' + LOTES[i][2];
      if (!grupos[k]) { grupos[k] = []; claves.push(k); }
      grupos[k].push(i);
    }
    claves.sort(function (a, b) { return parseInt(b, 10) - parseInt(a, 10); });
    for (i = 0; i < claves.length; i++) {
      g = grupos[claves[i]];
      compras.push({ id: id4('CMP', i + 1), dias: LOTES[g[0]][3], prov: LOTES[g[0]][2], lotes: g, estado: 'Emitida' });
    }

    /* 3. Simulación día a día, de la más antigua a la más reciente; los documentos se numeran como lo hace el núcleo (por fecha, un contador por operación) */
    filas.sort(function (a, b) { return b.dias - a.dias; });
    for (i = 0; i < filas.length; i++) {
      f = filas[i];
      f.id = id4('VTA', i + 1);
      f.numero = '';
      f.final = [];
      if (f.estado === 'Borrador') { f.final = f.lineas.slice(0); continue; }
      for (j = 0; j < f.lineas.length; j++) {
        p = f.lineas[j][0];
        q = f.lineas[j][1];
        cands = [];
        for (k = 0; k < lotes.length; k++) {
          if (lotes[k].prod === p && lotes[k].ing >= f.dias && lotes[k].ven >= -f.dias && stocks[k] > 0 && LOTES[k][7] === 'Disponible') { cands.push(lotes[k]); }
        }
        cands.sort(function (a, b) { return a.ven !== b.ven ? a.ven - b.ven : (a.ing !== b.ing ? b.ing - a.ing : a.idx - b.idx); });
        pendiente = q;
        usadoEnLinea = 0;
        for (k = 0; k < cands.length && pendiente > 0; k++) {
          tomar = Math.min(stocks[cands[k].idx], pendiente);
          stocks[cands[k].idx] -= tomar;
          pendiente -= tomar;
          usadoEnLinea += tomar;
          movs.push({ dias: f.dias, prod: p, lote: cands[k].idx + 1, tipo: 'Salida por venta', cant: tomar, ref: f });
          if (f.estado === 'Anulada') {
            stocks[cands[k].idx] += tomar;
            movs.push({ dias: f.dias, prod: p, lote: cands[k].idx + 1, tipo: 'Anulación de venta', cant: tomar, ref: f });
          }
        }
        if (usadoEnLinea > 0) { f.final.push([p, usadoEnLinea]); }
      }
    }
    /* Numeración de las ventas que de verdad existirán (con líneas y no borradores), en orden cronológico */
    for (i = 0; i < filas.length; i++) {
      if (filas[i].estado !== 'Borrador' && filas[i].final.length) { cont += 1; filas[i].numero = 'B001-' + ('00000000' + cont).slice(-8); }
    }
    /* Compras: entrada de cada lote en su fecha */
    for (i = 0; i < compras.length; i++) {
      compras[i].numero = 'OC01-' + ('00000000' + (i + 1)).slice(-8);
      for (j = 0; j < compras[i].lotes.length; j++) {
        k = compras[i].lotes[j];
        movs.push({ dias: compras[i].dias, prod: LOTES[k][0], lote: k + 1, tipo: 'Entrada por compra', cant: LOTES[k][5], ref: compras[i] });
      }
    }
    return { filas: filas, compras: compras, movs: movs, stocks: stocks };
  }

  var SIM = simular();

  function armarLotes() {
    var r = [], i, f, costo;
    for (i = 0; i < LOTES.length; i++) {
      f = LOTES[i];
      costo = PRODUCTOS[f[0] - 1][6];
      r.push({
        id: id4('LOT', i + 1), producto: id4('PRD', f[0]), numeroLote: f[1], proveedor: id4('PRV', f[2]), fechaIngreso: '@-' + f[3], vencimiento: '@' + f[4],
        cantidadInicial: f[5], stock: SIM.stocks[i], costoUnit: costo, ubicacion: f[6], estado: f[7]
      });
    }
    return r;
  }

  function armarProductos() {
    var r = [], i, f, stock, k;
    for (i = 0; i < PRODUCTOS.length; i++) {
      f = PRODUCTOS[i];
      stock = 0;
      for (k = 0; k < LOTES.length; k++) { if (LOTES[k][0] === i + 1) { stock += SIM.stocks[k]; } }
      r.push({
        id: id4('PRD', i + 1), codigo: f[0], nombre: f[1], categoria: CATEGORIAS[f[2]], presentacion: f[3], laboratorio: f[4], condicionVenta: f[5],
        costo: f[6], precio: f[7], stock: stock, stockMin: f[8], activo: true
      });
    }
    return r;
  }

  function armarProveedores() {
    var r = [], i, f;
    for (i = 0; i < PROVEEDORES.length; i++) {
      f = PROVEEDORES[i];
      r.push({ id: id4('PRV', i + 1), ruc: f[0], nombre: f[1], contacto: f[2], telefono: f[3], email: f[4], ciudad: f[5], diasCredito: f[6] });
    }
    return r;
  }

  function armarClientes() {
    var r = [], i, f, c;
    for (i = 0; i < CLIENTES.length; i++) {
      f = CLIENTES[i];
      c = { id: id4('CLI', i + 1), documento: f[0], nombre: f[1], tarjeta: f[2], distrito: f[3] };
      if (f[4]) { c.telefono = f[4]; }
      if (f[2] !== 'Sin tarjeta') { c.fechaAfiliacion = '@-' + f[5]; }
      r.push(c);
    }
    return r;
  }

  function armarVentas() {
    var r = [], i, f, ls, j, n = 0, m, receta, doc, usaReceta, usaControlado, p;
    for (i = 0; i < SIM.filas.length; i++) {
      f = SIM.filas[i];
      ls = [];
      usaReceta = false;
      usaControlado = false;
      for (j = 0; j < f.final.length; j++) {
        p = PRODUCTOS[f.final[j][0] - 1];
        ls.push({ item: id4('PRD', f.final[j][0]), cantidad: f.final[j][1], precio: p[7] });
        if (p[5] !== COND_LIBRE) { usaReceta = true; }
        if (p[5] === COND_CONTROLADO) { usaControlado = true; }
      }
      if (!ls.length) { continue; }
      doc = { id: f.id, fecha: '@-' + f.dias, cliente: id4('CLI', f.cli), formaPago: f.pago, estado: f.estado, lineas: ls };
      if (usaReceta) {
        n += 1;
        m = MEDICOS[n % MEDICOS.length];
        doc.numeroReceta = 'RX-' + (20400 + n * 37);
        doc.medico = m[0];
        if (usaControlado) { doc.cmp = m[1]; }
      }
      r.push(doc);
    }
    return r;
  }

  function armarCompras() {
    var r = [], i, c, ls, j, k, condiciones = ['Contado', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 45 días'], prov;
    for (i = 0; i < SIM.compras.length; i++) {
      c = SIM.compras[i];
      ls = [];
      for (j = 0; j < c.lotes.length; j++) {
        k = LOTES[c.lotes[j]];
        ls.push({ item: id4('PRD', k[0]), cantidad: k[5], precio: PRODUCTOS[k[0] - 1][6], lote: k[1], vencimiento: '@' + k[4] });
      }
      prov = PROVEEDORES[c.prov - 1];
      r.push({
        id: c.id, fecha: '@-' + c.dias, proveedor: id4('PRV', c.prov), condicion: prov[6] === 0 ? 'Contado' : (prov[6] === 15 ? 'Crédito 15 días' : (prov[6] === 45 ? 'Crédito 45 días' : 'Crédito 30 días')),
        factura: 'F' + ('00' + (1 + i % 4)).slice(-3) + '-' + (4100 + i * 53), estado: 'Emitida', lineas: ls
      });
    }
    /* un pedido en borrador, todavía sin recibir */
    r.push({ id: id4('CMP', SIM.compras.length + 1), fecha: 'hoy', proveedor: 'PRV-0001', condicion: 'Crédito 30 días', factura: '', estado: 'Borrador', lineas: [{ item: 'PRD-0009', cantidad: 2000, precio: 0.08, lote: 'PA2610', vencimiento: '@620' }, { item: 'PRD-0010', cantidad: 1500, precio: 0.12, lote: 'IB2611', vencimiento: '@610' }] });
    return r;
  }

  function armarMovimientos() {
    var m = SIM.movs.slice(0), r = [], i, x;
    m.sort(function (a, b) { return b.dias - a.dias; });
    for (i = 0; i < m.length; i++) {
      x = m[i];
      r.push({ id: id4('MOV', i + 1), fecha: '@-' + x.dias, producto: id4('PRD', x.prod), lote: id4('LOT', x.lote), tipo: x.tipo, cantidad: x.cant, documento: x.ref.numero, usuario: 'sistema' });
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'botica',
    nombre: 'Botica Salud Total',
    rubro: 'Botica con control de lotes y vencimientos',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#0f766e', acento: '#c0392b', siglas: 'ST' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Los precios de venta al público ya incluyen el IGV; las compras lo suman.' },
      { id: 'descPlata', etiqueta: 'Descuento tarjeta Plata', tipo: 'porcentaje', min: 0, max: 20, valor: 3, ayuda: 'Se aplica a todo producto que no sea controlado.' },
      { id: 'descOro', etiqueta: 'Descuento tarjeta Oro', tipo: 'porcentaje', min: 0, max: 20, valor: 5, ayuda: 'Se aplica a todo producto que no sea controlado.' },
      { id: 'descPlatino', etiqueta: 'Descuento tarjeta Platino', tipo: 'porcentaje', min: 0, max: 20, valor: 8, ayuda: 'Se aplica a todo producto que no sea controlado.' },
      { id: 'alertaRojaDias', etiqueta: 'Alerta roja: vence en (días)', tipo: 'entero', min: 1, max: 365, valor: 30, ayuda: 'Un lote que vence en este plazo o menos se marca en rojo.' },
      { id: 'alertaAmarillaDias', etiqueta: 'Alerta amarilla: vence en (días)', tipo: 'entero', min: 1, max: 720, valor: 90, ayuda: 'Un lote que vence en este plazo o menos (y más que el rojo) se marca en amarillo.' },
      { id: 'vidaMinimaDias', etiqueta: 'Vida útil mínima al recibir un lote (días)', tipo: 'entero', min: 0, max: 720, valor: 180, ayuda: 'La botica no recibe lotes que venzan antes de este plazo.' },
      { id: 'maxControlado', etiqueta: 'Máximo de envases de un controlado por venta', tipo: 'entero', min: 1, max: 50, valor: 5, ayuda: 'Tope por producto controlado en una misma receta.' },
      { id: 'solesPorPunto', etiqueta: 'Soles por punto de fidelidad', tipo: 'moneda', min: 1, max: 1000, valor: 20, ayuda: 'Cada cliente suma un punto por este monto comprado.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 0,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: false,
      exportaRespetaPermisos: false,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros de la botica.' },
      { id: 'quimico', nombre: 'Químico farmacéutico', descripcion: 'Director técnico: define productos y su condición de venta, controla lotes y vencimientos, despacha controlados y anula ventas. No ve cajas ni clientes.' },
      { id: 'cajero', nombre: 'Cajero', descripcion: 'Registra y emite ventas, atiende a clientes y consulta productos. No ve costos, lotes ni compras; los controlados los despacha el químico.' },
      { id: 'almacen', nombre: 'Encargado de almacén', descripcion: 'Recibe compras (crean lotes), administra lotes, productos y proveedores y consulta el kardex. No vende ni ve clientes.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    permisosSistema: {
      bitacora: ['admin', 'quimico', 'auditor']
    },

    usuarios: [
      { usuario: 'admin', nombre: 'Patricia Gómez Rivas', rol: 'admin', clave: 'Admin#2026b' },
      { usuario: 'quimico', nombre: 'Rodrigo Valdez Soto', rol: 'quimico', clave: 'Quimi#2026b' },
      { usuario: 'cajero', nombre: 'Carla Mendoza Ríos', rol: 'cajero', clave: 'Caja#2026bx' },
      { usuario: 'almacen', nombre: 'Hugo Ramos Pariona', rol: 'almacen', clave: 'Almacen#2026b' },
      { usuario: 'auditor', nombre: 'Elena Salazar Cóndor', rol: 'auditor', clave: 'Audita#2026b' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'productos', nombre: 'Producto', plural: 'Productos', prefijo: 'PRD',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre y concentración', tipo: 'texto', requerido: true, max: 80 },
          { id: 'categoria', etiqueta: 'Categoría', tipo: 'lista', requerido: true, opciones: CATEGORIAS },
          { id: 'presentacion', etiqueta: 'Presentación', tipo: 'texto', max: 40 },
          { id: 'laboratorio', etiqueta: 'Laboratorio', tipo: 'texto', max: 40 },
          { id: 'condicionVenta', etiqueta: 'Condición de venta', tipo: 'lista', requerido: true, opciones: [COND_LIBRE, COND_RECETA, COND_CONTROLADO], defecto: COND_LIBRE, ayuda: 'Con receta se exige el número y el médico; los controlados además el CMP y los despacha el químico.' },
          { id: 'costo', etiqueta: 'Costo promedio por unidad (sin IGV)', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'quimico', 'almacen', 'auditor'], ayuda: 'Se recalcula solo al emitir una compra.' },
          { id: 'precio', etiqueta: 'Precio de venta al público (con IGV)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'stock', etiqueta: 'Stock total', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'Suma de los lotes. Sube con las compras y baja con las ventas.' },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'activo', etiqueta: 'Producto activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'categoria', 'condicionVenta', 'precio', 'stock', 'situacion'],
        buscar: ['codigo', 'nombre', 'categoria', 'laboratorio'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r) { return r.stock <= 0 ? 'Agotado' : (r.stock <= r.stockMin ? 'Stock bajo' : 'Normal'); }
          },
          {
            id: 'margen', etiqueta: 'Margen sobre el precio sin IGV', tipo: 'porcentaje', ver: ['admin', 'quimico', 'almacen', 'auditor'],
            formula: function (r, ctx) {
              var neto = sinIgv(r.precio || 0, ctx);
              return neto > 0 && r.costo !== undefined ? ctx.redondear((neto - r.costo) / neto * 100) : null;
            }
          },
          {
            id: 'stockLotes', etiqueta: 'Suma de lotes', tipo: 'entero',
            formula: function (r, ctx) {
              return ctx.suma(ctx.datos.listar('lotes', function (l) { return l.producto === r.id && l.estado !== 'Retirado'; }), function (l) { return l.stock; });
            }
          },
          {
            id: 'cuadre', etiqueta: 'Cuadre con los lotes', tipo: 'texto',
            formula: function (r, ctx) {
              var s = ctx.suma(ctx.datos.listar('lotes', function (l) { return l.producto === r.id && l.estado !== 'Retirado'; }), function (l) { return l.stock; });
              return s === r.stock ? 'Cuadra' : 'Descuadre de ' + (r.stock - s);
            }
          }
        ],
        reglas: [
          {
            id: 'precio-coherente', mensaje: 'El precio de venta no puede ser menor al costo.',
            validar: function (r) { return !(r.costo !== undefined && r.precio < r.costo); }
          }
        ],
        permisos: { ver: ['admin', 'quimico', 'cajero', 'almacen', 'auditor'], crear: ['admin', 'quimico'], editar: ['admin', 'quimico', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'lotes', nombre: 'Lote', plural: 'Lotes', prefijo: 'LOT',
        campos: [
          { id: 'producto', etiqueta: 'Producto', tipo: 'ref', entidad: 'productos', mostrar: 'nombre', requerido: true },
          { id: 'numeroLote', etiqueta: 'N.º de lote', tipo: 'texto', requerido: true, max: 24 },
          { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre' },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'vencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'fecha', requerido: true },
          { id: 'cantidadInicial', etiqueta: 'Cantidad recibida', tipo: 'entero', min: 1, requerido: true },
          { id: 'stock', etiqueta: 'Stock disponible', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'Baja con las ventas según el orden de vencimiento (FEFO).' },
          { id: 'costoUnit', etiqueta: 'Costo por unidad', tipo: 'moneda', min: 0, ver: ['admin', 'quimico', 'almacen', 'auditor'] },
          { id: 'ubicacion', etiqueta: 'Ubicación', tipo: 'texto', max: 30 },
          { id: 'estado', etiqueta: 'Estado del lote', tipo: 'lista', requerido: true, opciones: ['Disponible', 'Cuarentena', 'Retirado'], defecto: 'Disponible', ayuda: 'Solo los lotes disponibles y sin vencer salen en una venta.' }
        ],
        lista: ['producto', 'numeroLote', 'vencimiento', 'stock', 'diasParaVencer', 'alerta'],
        buscar: ['producto', 'numeroLote', 'ubicacion'],
        calculados: [
          {
            id: 'diasParaVencer', etiqueta: 'Días para vencer', tipo: 'entero',
            formula: function (r, ctx) { return r.vencimiento ? ctx.diasEntre(ctx.hoy(), r.vencimiento) : null; }
          },
          {
            id: 'alerta', etiqueta: 'Alerta de vencimiento', tipo: 'texto',
            formula: function (r, ctx) { return r.vencimiento ? alertaLote(r, ctx) : ''; }
          },
          {
            id: 'valorCosto', etiqueta: 'Valor al costo', tipo: 'moneda', ver: ['admin', 'quimico', 'almacen', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear((r.costoUnit || 0) * (r.stock || 0)); }
          }
        ],
        reglas: [
          {
            id: 'stock-dentro-de-lo-recibido', mensaje: 'El stock disponible no puede superar la cantidad recibida.',
            validar: function (r) { return !(r.stock > r.cantidadInicial); }
          },
          {
            id: 'vence-despues-de-ingresar', mensaje: 'El vencimiento no puede ser anterior a la fecha de ingreso.',
            validar: function (r) { return !(r.fechaIngreso && r.vencimiento && r.vencimiento < r.fechaIngreso); }
          },
          {
            id: 'lote-no-repetido', mensaje: 'Ese producto ya tiene un lote con el mismo número.',
            validar: function (r, ctx) {
              return ctx.datos.listar('lotes', function (l) { return l.producto === r.producto && l.numeroLote === r.numeroLote && l.id !== r.id; }).length === 0;
            }
          }
        ],
        permisos: { ver: ['admin', 'quimico', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'quimico', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'documento', etiqueta: 'DNI o RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^([0-9]{8}|[0-9]{11})$', mensajePatron: 'Escribe un DNI de 8 dígitos o un RUC de 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre o razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'tarjeta', etiqueta: 'Tarjeta de fidelidad', tipo: 'lista', requerido: true, opciones: ['Sin tarjeta', 'Plata', 'Oro', 'Platino'], defecto: 'Sin tarjeta', ayuda: 'Da un descuento en toda compra, salvo en medicamentos controlados.' },
          { id: 'fechaAfiliacion', etiqueta: 'Fecha de afiliación', tipo: 'fecha', max: 'hoy' },
          { id: 'distrito', etiqueta: 'Distrito', tipo: 'lista', opciones: ['Huancayo', 'El Tambo', 'Chilca', 'Sapallanga', 'Pilcomayo'] },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 }
        ],
        lista: ['documento', 'nombre', 'tarjeta', 'descuento', 'comprado', 'puntos'],
        buscar: ['documento', 'nombre', 'distrito'],
        calculados: [
          {
            id: 'descuento', etiqueta: 'Descuento vigente', tipo: 'porcentaje',
            formula: function (r, ctx) { return pctTarjeta(r, ctx); }
          },
          {
            id: 'comprado', etiqueta: 'Compras acumuladas', tipo: 'moneda',
            formula: function (r, ctx) {
              var v = ctx.datos.listar('ventas', function (x) { return x.cliente === r.id && x.estado === 'Emitida'; });
              return ctx.redondear(ctx.suma(v, function (x) { return x.totales ? x.totales.total : 0; }));
            }
          },
          {
            id: 'puntos', etiqueta: 'Puntos de fidelidad', tipo: 'entero',
            formula: function (r, ctx) {
              var v = ctx.datos.listar('ventas', function (x) { return x.cliente === r.id && x.estado === 'Emitida'; });
              var por = ctx.param('solesPorPunto');
              return por > 0 ? Math.floor(ctx.suma(v, function (x) { return x.totales ? x.totales.total : 0; }) / por + 1e-9) : 0;
            }
          }
        ],
        permisos: { ver: ['admin', 'cajero', 'auditor'], crear: ['admin', 'cajero'], editar: ['admin', 'cajero'], eliminar: ['admin'] }
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
          { id: 'diasCredito', etiqueta: 'Días de crédito que otorga', tipo: 'entero', min: 0, max: 90, defecto: 30 }
        ],
        lista: ['ruc', 'nombre', 'ciudad', 'contacto', 'diasCredito'],
        buscar: ['ruc', 'nombre', 'ciudad', 'contacto'],
        permisos: { ver: ['admin', 'quimico', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'movimientos', nombre: 'Movimiento de lote', plural: 'Kardex de lotes', prefijo: 'MOV',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
          { id: 'producto', etiqueta: 'Producto', tipo: 'ref', entidad: 'productos', mostrar: 'nombre', requerido: true },
          { id: 'lote', etiqueta: 'Lote', tipo: 'ref', entidad: 'lotes', mostrar: 'numeroLote', requerido: true },
          { id: 'tipo', etiqueta: 'Tipo de movimiento', tipo: 'lista', requerido: true, opciones: ['Entrada por compra', 'Salida por venta', 'Anulación de venta', 'Anulación de compra'] },
          { id: 'cantidad', etiqueta: 'Cantidad', tipo: 'entero', min: 1, requerido: true },
          { id: 'documento', etiqueta: 'Documento', tipo: 'texto', max: 30 },
          { id: 'usuario', etiqueta: 'Registrado por', tipo: 'texto', max: 30 }
        ],
        lista: ['fecha', 'producto', 'lote', 'tipo', 'cantidad', 'documento'],
        buscar: ['producto', 'lote', 'documento', 'tipo'],
        permisos: { ver: ['admin', 'quimico', 'almacen', 'auditor'], crear: [], editar: [], eliminar: [] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'ventas', nombre: 'Venta', plural: 'Ventas', prefijo: 'VTA', serie: 'B001',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'formaPago', etiqueta: 'Forma de pago', tipo: 'lista', requerido: true, opciones: ['Efectivo', 'Yape o Plin', 'Tarjeta'], defecto: 'Efectivo' },
          { id: 'numeroReceta', etiqueta: 'N.º de receta', tipo: 'texto', max: 20, ayuda: 'Obligatorio si hay productos con receta.' },
          { id: 'medico', etiqueta: 'Médico que prescribe', tipo: 'texto', max: 60 },
          { id: 'cmp', etiqueta: 'CMP del médico', tipo: 'texto', max: 8, patron: '^[0-9]{4,6}$', mensajePatron: 'El CMP tiene de 4 a 6 dígitos.', ayuda: 'Obligatorio si hay medicamentos controlados.' }
        ],
        lista: ['fecha', 'cliente', 'formaPago'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'productos', mostrar: 'nombre', precio: 'precio',
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 }],
          info: function (item, ctx) {
            var primero = lotesFefo(item.id, ctx)[0];
            return 'Stock: ' + item.stock + ' · ' + item.condicionVenta + (primero ? ' · Sale primero el lote ' + primero.numeroLote + ' (vence ' + ctx.fmt.fecha(primero.vencimiento) + ')' : ' · Sin lote vigente para vender');
          }
        },
        calcular: function (doc, ctx) {
          var cli = doc.cliente ? ctx.datos.obtener('clientes', doc.cliente) : null, bruto = 0, desc = 0, costo = 0, i, l, p, total, base;
          for (i = 0; i < (doc.lineas || []).length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            bruto += l.cantidad * l.precio;
            desc += descuentoLinea(l, p, cli, ctx);
            costo += l.cantidad * (p && p.costo ? p.costo : 0);
          }
          bruto = ctx.redondear(bruto);
          desc = ctx.redondear(desc);
          total = ctx.redondear(bruto - desc);
          base = ctx.redondear(sinIgv(total, ctx));
          return { bruto: bruto, descuento: desc, base: base, igv: ctx.redondear(total - base), total: total, costo: ctx.redondear(costo), utilidad: ctx.redondear(base - costo) };
        },
        totales: [
          { id: 'bruto', etiqueta: 'Importe a precio de lista' },
          { id: 'descuento', etiqueta: 'Descuento por tarjeta' },
          { id: 'base', etiqueta: 'Base imponible' },
          { id: 'igv', etiqueta: 'IGV incluido' },
          { id: 'total', etiqueta: 'Total a pagar', fuerte: true }
        ],
        reglas: [
          {
            id: 'receta-completa', mensaje: 'La venta incluye productos con receta: registra el N.º de receta y el médico que prescribe.',
            validar: function (d, ctx) {
              var i, p;
              for (i = 0; i < (d.lineas || []).length; i++) {
                p = ctx.datos.obtener('productos', d.lineas[i].item);
                if (p && p.condicionVenta !== COND_LIBRE && (!d.numeroReceta || !d.medico)) { return false; }
              }
              return true;
            }
          },
          {
            id: 'controlado-con-cmp', mensaje: 'Un medicamento controlado exige el CMP del médico.',
            validar: function (d, ctx) {
              var i, p;
              for (i = 0; i < (d.lineas || []).length; i++) {
                p = ctx.datos.obtener('productos', d.lineas[i].item);
                if (p && p.condicionVenta === COND_CONTROLADO && !d.cmp) { return false; }
              }
              return true;
            }
          },
          {
            id: 'tope-controlado', mensaje: 'Se supera el máximo de unidades de un medicamento controlado por venta (ver parámetros).',
            validar: function (d, ctx) {
              var i, p;
              for (i = 0; i < (d.lineas || []).length; i++) {
                p = ctx.datos.obtener('productos', d.lineas[i].item);
                if (p && p.condicionVenta === COND_CONTROLADO && d.lineas[i].cantidad > ctx.param('maxControlado')) { return false; }
              }
              return true;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var i, j, l, p, u = ctx.usuario(), plan = [], a, controlado = false;
          for (i = 0; i < doc.lineas.length; i++) {
            p = ctx.datos.obtener('productos', doc.lineas[i].item);
            if (p.condicionVenta === COND_CONTROLADO) { controlado = true; }
          }
          if (controlado && (!u || (u.rol !== 'quimico' && u.rol !== 'admin'))) {
            throw new Error('Los medicamentos controlados solo los despacha el químico farmacéutico.');
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            a = asignarFefo(l.item, l.cantidad, ctx);
            if (a.faltante > 0) {
              throw new Error('No hay stock vigente de «' + p.nombre + '»: se piden ' + l.cantidad + ' y solo hay ' + (l.cantidad - a.faltante) + ' en lotes disponibles sin vencer.');
            }
            plan.push({ prod: p, linea: l, asignaciones: a.asignaciones });
          }
          for (i = 0; i < plan.length; i++) {
            for (j = 0; j < plan[i].asignaciones.length; j++) {
              a = plan[i].asignaciones[j];
              ctx.datos.actualizar('lotes', a.lote.id, { stock: a.lote.stock - a.cantidad });
              movimiento(ctx, doc, a.lote, 'Salida por venta', a.cantidad);
            }
            ctx.datos.actualizar('productos', plan[i].prod.id, { stock: plan[i].prod.stock - plan[i].linea.cantidad });
          }
        },
        alAnular: function (doc, ctx) {
          var movs = ctx.datos.listar('movimientos', function (m) { return m.documento === doc.numero && m.tipo === 'Salida por venta'; }), i, lote, p;
          if (!movs.length) { throw new Error('No hay movimientos de lote registrados para esta venta: no se puede devolver el stock automáticamente.'); }
          for (i = 0; i < movs.length; i++) {
            lote = ctx.datos.obtener('lotes', movs[i].lote);
            ctx.datos.actualizar('lotes', lote.id, { stock: lote.stock + movs[i].cantidad });
            p = ctx.datos.obtener('productos', movs[i].producto);
            ctx.datos.actualizar('productos', p.id, { stock: p.stock + movs[i].cantidad });
            movimiento(ctx, doc, lote, 'Anulación de venta', movs[i].cantidad);
          }
        },
        permisos: { ver: ['admin', 'quimico', 'cajero', 'auditor'], crear: ['admin', 'cajero'], editar: ['admin', 'cajero'], emitir: ['admin', 'cajero', 'quimico'], anular: ['admin', 'quimico'], eliminar: ['admin', 'cajero'] }
      },
      {
        id: 'compras', nombre: 'Compra', plural: 'Compras', prefijo: 'CMP', serie: 'OC01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre', requerido: true },
          { id: 'condicion', etiqueta: 'Condición de pago', tipo: 'lista', requerido: true, opciones: ['Contado', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 45 días'], defecto: 'Contado' },
          { id: 'factura', etiqueta: 'Factura o guía del proveedor', tipo: 'texto', max: 30 },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'proveedor', 'condicion'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'productos', mostrar: 'nombre', precio: 'costo', precioEditable: true,
          campos: [
            { id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 },
            { id: 'lote', etiqueta: 'Lote del proveedor', tipo: 'texto', max: 24, ayuda: 'Si queda vacío, el sistema asigna un código interno.' },
            { id: 'vencimiento', etiqueta: 'Vencimiento', tipo: 'fecha', defecto: '@540' }
          ],
          info: function (item) { return 'Stock actual: ' + item.stock + ' · Costo promedio: S/ ' + (item.costo || 0).toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var sub = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var igv = ctx.redondear(sub * ctx.param('igv') / 100);
          return { subtotal: sub, igv: igv, total: ctx.redondear(sub + igv) };
        },
        totales: [
          { id: 'subtotal', etiqueta: 'Subtotal (sin IGV)' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total de la compra', fuerte: true }
        ],
        reglas: [
          {
            id: 'vida-util-minima', mensaje: 'Algún lote vence antes de la vida útil mínima que acepta la botica (ver parámetros).',
            validar: function (d, ctx) {
              var i, l;
              for (i = 0; i < (d.lineas || []).length; i++) {
                l = d.lineas[i];
                if (l.vencimiento && ctx.diasEntre(d.fecha || ctx.hoy(), l.vencimiento) < ctx.param('vidaMinimaDias')) { return false; }
              }
              return true;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var i, l, p, codigo, nuevoCosto, lote, ext;
          for (i = 0; i < doc.lineas.length; i++) {
            if (!doc.lineas[i].vencimiento) { throw new Error('Falta la fecha de vencimiento del lote de «' + ctx.datos.obtener('productos', doc.lineas[i].item).nombre + '».'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            codigo = l.lote || loteInterno(doc, i);
            lote = ctx.datos.crear('lotes', {
              producto: l.item, numeroLote: codigo, proveedor: doc.proveedor, fechaIngreso: doc.fecha, vencimiento: l.vencimiento,
              cantidadInicial: l.cantidad, stock: l.cantidad, costoUnit: l.precio, estado: 'Disponible'
            });
            /* Costo promedio ponderado: mezcla lo que ya hay con lo que entra. */
            ext = p.stock + l.cantidad;
            nuevoCosto = ext > 0 ? ctx.redondear((p.stock * (p.costo || 0) + l.cantidad * l.precio) / ext) : l.precio;
            ctx.datos.actualizar('productos', p.id, { stock: p.stock + l.cantidad, costo: nuevoCosto });
            movimiento(ctx, doc, lote, 'Entrada por compra', l.cantidad);
          }
        },
        alAnular: function (doc, ctx) {
          var i, l, p, codigo, lotes, lote, hechos = [];
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            codigo = l.lote || loteInterno(doc, i);
            lotes = ctx.datos.listar('lotes', function (x) { return x.producto === l.item && x.numeroLote === codigo; });
            lote = lotes[0];
            if (!lote) { throw new Error('No se encontró el lote «' + codigo + '» de esta compra.'); }
            if (lote.stock !== lote.cantidadInicial) {
              throw new Error('No se puede anular: ya se vendió parte del lote «' + codigo + '» (quedan ' + lote.stock + ' de ' + lote.cantidadInicial + ').');
            }
            hechos.push({ lote: lote, linea: l });
          }
          for (i = 0; i < hechos.length; i++) {
            p = ctx.datos.obtener('productos', hechos[i].linea.item);
            ctx.datos.actualizar('lotes', hechos[i].lote.id, { stock: 0, estado: 'Retirado' });
            ctx.datos.actualizar('productos', p.id, { stock: p.stock - hechos[i].linea.cantidad });
            movimiento(ctx, doc, hechos[i].lote, 'Anulación de compra', hechos[i].linea.cantidad);
          }
        },
        permisos: { ver: ['admin', 'quimico', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], emitir: ['admin', 'almacen'], anular: ['admin', 'quimico'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ventas-mes', titulo: 'Ventas por mes',
        descripcion: 'Ventas emitidas agrupadas por mes: importe a precio de lista, descuento por tarjeta, base imponible, IGV y total. Las anuladas y los borradores no cuentan.',
        roles: ['admin', 'quimico', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), grupos = ctx.agrupar(ventas, function (v) { return ctx.mes(v.fecha); }), claves = [], k, filas = [], etiquetas = [], valores = [], total = 0, n = 0, g, tot;
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          for (k = 0; k < claves.length; k++) {
            g = grupos[claves[k]];
            tot = ctx.redondear(ctx.suma(g, function (v) { return v.totales.total; }));
            filas.push([nombreMes(claves[k]), g.length, ctx.redondear(ctx.suma(g, function (v) { return v.totales.bruto; })), ctx.redondear(ctx.suma(g, function (v) { return v.totales.descuento; })), ctx.redondear(ctx.suma(g, function (v) { return v.totales.base; })), ctx.redondear(ctx.suma(g, function (v) { return v.totales.igv; })), tot]);
            etiquetas.push(nombreMes(claves[k]));
            valores.push(tot);
            total += tot;
            n += g.length;
          }
          return {
            columnas: ['Mes', 'N.º de ventas', 'A precio de lista', 'Descuento tarjeta', 'Base imponible', 'IGV incluido', 'Total'], tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Total del periodo', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Ventas emitidas', valor: n, tipo: 'entero' },
              { etiqueta: 'Ticket promedio', valor: n ? ctx.redondear(total / n) : 0, tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'por-vencer', titulo: 'Productos por vencer',
        descripcion: 'Lotes con existencias cuyo vencimiento cae dentro del rango, con la alerta por colores (verde, amarillo, rojo) y el valor al costo que está en riesgo. Incluye los ya vencidos si el rango los alcanza.',
        parametros: [
          { id: 'desde', etiqueta: 'Vence desde', tipo: 'fecha', requerido: true, defecto: '@-60' },
          { id: 'hasta', etiqueta: 'Vence hasta', tipo: 'fecha', requerido: true, defecto: '@90' }
        ],
        ejecutar: function (p, ctx) {
          var lotes = lotesEnStock(ctx).filter(function (l) { return l.vencimiento >= p.desde && l.vencimiento <= p.hasta; }), filas = [], i, l, prod, dias, color, valor, porColor = { 'Vencido': 0, 'Rojo': 0, 'Amarillo': 0, 'Verde': 0 }, totalValor = 0, unidades = 0;
          lotes.sort(function (a, b) { return a.vencimiento < b.vencimiento ? -1 : (a.vencimiento > b.vencimiento ? 1 : (a.id < b.id ? -1 : 1)); });
          for (i = 0; i < lotes.length; i++) {
            l = lotes[i];
            prod = ctx.datos.obtener('productos', l.producto);
            dias = ctx.diasEntre(ctx.hoy(), l.vencimiento);
            color = colorVencimiento(dias, ctx);
            valor = ctx.redondear((l.costoUnit || 0) * l.stock);
            porColor[color] += l.stock;
            totalValor += valor;
            unidades += l.stock;
            filas.push([prod ? prod.nombre : l.producto, l.numeroLote, l.vencimiento, dias, color, l.stock, valor]);
          }
          return {
            columnas: ['Producto', 'Lote', 'Vence', 'Días', 'Alerta', 'Stock', 'Valor al costo'], tipos: ['texto', 'texto', 'fecha', 'entero', 'texto', 'entero', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: ['Vencido', 'Rojo', 'Amarillo', 'Verde'], valores: [porColor['Vencido'], porColor['Rojo'], porColor['Amarillo'], porColor['Verde']], formato: 'entero' },
            resumen: [
              { etiqueta: 'Lotes en el rango', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Unidades', valor: unidades, tipo: 'entero' },
              { etiqueta: 'Valor al costo', valor: ctx.redondear(totalValor), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'stock-lote', titulo: 'Stock por lote',
        descripcion: 'Existencias de cada lote ingresado en el rango: cuánto entró, cuánto queda, cuánto se vendió y su valor al costo. El gráfico suma el stock de lotes por producto.',
        roles: ['admin', 'quimico', 'almacen', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Ingresados desde', tipo: 'fecha', requerido: true, defecto: '@-400' },
          { id: 'hasta', etiqueta: 'Ingresados hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var lotes = ctx.datos.listar('lotes', function (l) { return l.estado !== 'Retirado' && l.fechaIngreso >= p.desde && l.fechaIngreso <= p.hasta; }), filas = [], i, l, prod, porProd = {}, k, lista = [], etiquetas = [], valores = [], totalValor = 0, unidades = 0, valor;
          lotes.sort(function (a, b) { return a.vencimiento < b.vencimiento ? -1 : (a.vencimiento > b.vencimiento ? 1 : (a.id < b.id ? -1 : 1)); });
          for (i = 0; i < lotes.length; i++) {
            l = lotes[i];
            prod = ctx.datos.obtener('productos', l.producto);
            valor = ctx.redondear((l.costoUnit || 0) * l.stock);
            filas.push([prod ? prod.nombre : l.producto, l.numeroLote, l.fechaIngreso, l.vencimiento, l.cantidadInicial, l.stock, l.cantidadInicial - l.stock, ctx.redondear(pct(l.cantidadInicial - l.stock, l.cantidadInicial)), valor]);
            porProd[prod ? prod.nombre : l.producto] = (porProd[prod ? prod.nombre : l.producto] || 0) + l.stock;
            totalValor += valor;
            unidades += l.stock;
          }
          for (k in porProd) { if (porProd.hasOwnProperty(k)) { lista.push([k, porProd[k]]); } }
          lista.sort(function (a, b) { return b[1] - a[1]; });
          lista = lista.slice(0, 10);
          for (i = 0; i < lista.length; i++) { etiquetas.push(lista[i][0]); valores.push(lista[i][1]); }
          return {
            columnas: ['Producto', 'Lote', 'Ingreso', 'Vence', 'Recibido', 'Stock', 'Vendido', '% vendido', 'Valor al costo'], tipos: ['texto', 'texto', 'fecha', 'fecha', 'entero', 'entero', 'entero', 'porcentaje', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Lotes', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Unidades en stock', valor: unidades, tipo: 'entero' },
              { etiqueta: 'Valor al costo', valor: ctx.redondear(totalValor), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'margen-categoria', titulo: 'Margen por categoría',
        descripcion: 'Venta neta (sin IGV y con el descuento de tarjeta aplicado), costo y margen de cada categoría de producto en el periodo.',
        roles: ['admin', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), acum = {}, i, j, v, l, prod, cli, cat, neto, k, filas = [], etiquetas = [], valores = [], totNeto = 0, totCosto = 0;
          for (i = 0; i < ventas.length; i++) {
            v = ventas[i];
            cli = ctx.datos.obtener('clientes', v.cliente);
            for (j = 0; j < v.lineas.length; j++) {
              l = v.lineas[j];
              prod = ctx.datos.obtener('productos', l.item);
              cat = prod ? prod.categoria : 'Sin categoría';
              neto = sinIgv(l.cantidad * l.precio - descuentoLinea(l, prod, cli, ctx), ctx);
              if (!acum[cat]) { acum[cat] = { neto: 0, costo: 0, unidades: 0 }; }
              acum[cat].neto += neto;
              acum[cat].costo += l.cantidad * (prod && prod.costo ? prod.costo : 0);
              acum[cat].unidades += l.cantidad;
            }
          }
          for (k in acum) {
            if (!acum.hasOwnProperty(k)) { continue; }
            filas.push([k, acum[k].unidades, ctx.redondear(acum[k].neto), ctx.redondear(acum[k].costo), ctx.redondear(acum[k].neto - acum[k].costo), ctx.redondear(pct(acum[k].neto - acum[k].costo, acum[k].neto))]);
            totNeto += acum[k].neto;
            totCosto += acum[k].costo;
          }
          filas.sort(function (a, b) { return b[4] - a[4]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][5]); }
          return {
            columnas: ['Categoría', 'Unidades', 'Venta neta', 'Costo', 'Margen', 'Margen %'], tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Venta neta', valor: ctx.redondear(totNeto), tipo: 'moneda' },
              { etiqueta: 'Margen', valor: ctx.redondear(totNeto - totCosto), tipo: 'moneda' },
              { etiqueta: 'Margen %', valor: ctx.redondear(pct(totNeto - totCosto, totNeto)), tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'ventas-receta', titulo: 'Ventas con receta (controlados)',
        descripcion: 'Detalle de cada producto vendido con receta médica o con receta retenida: documento, cliente, receta, médico y CMP. Sirve para el libro de controlados.',
        roles: ['admin', 'quimico', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'alcance', etiqueta: 'Mostrar', tipo: 'lista', opciones: ['Todos los productos con receta', 'Solo controlados'], defecto: 'Todos los productos con receta' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), filas = [], i, j, v, l, prod, cli, porProd = {}, k, lista = [], etiquetas = [], valores = [], unidades = 0, controlados = 0, docs = {};
          ventas.sort(function (a, b) { return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : (a.id < b.id ? -1 : 1)); });
          for (i = 0; i < ventas.length; i++) {
            v = ventas[i];
            cli = ctx.datos.obtener('clientes', v.cliente);
            for (j = 0; j < v.lineas.length; j++) {
              l = v.lineas[j];
              prod = ctx.datos.obtener('productos', l.item);
              if (!prod || prod.condicionVenta === COND_LIBRE) { continue; }
              if (p.alcance === 'Solo controlados' && prod.condicionVenta !== COND_CONTROLADO) { continue; }
              filas.push([v.fecha, v.numero, cli ? cli.nombre : v.cliente, prod.nombre, prod.condicionVenta, l.cantidad, v.numeroReceta || '', v.medico || '', v.cmp || '']);
              porProd[prod.nombre] = (porProd[prod.nombre] || 0) + l.cantidad;
              unidades += l.cantidad;
              docs[v.id] = true;
              if (prod.condicionVenta === COND_CONTROLADO) { controlados += l.cantidad; }
            }
          }
          for (k in porProd) { if (porProd.hasOwnProperty(k)) { lista.push([k, porProd[k]]); } }
          lista.sort(function (a, b) { return b[1] - a[1]; });
          for (i = 0; i < lista.length; i++) { etiquetas.push(lista[i][0]); valores.push(lista[i][1]); }
          return {
            columnas: ['Fecha', 'Venta', 'Cliente', 'Producto', 'Condición', 'Cantidad', 'N.º de receta', 'Médico', 'CMP'], tipos: ['fecha', 'texto', 'texto', 'texto', 'texto', 'entero', 'texto', 'texto', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Ventas con receta', valor: contarClaves(docs), tipo: 'entero' },
              { etiqueta: 'Unidades despachadas', valor: unidades, tipo: 'entero' },
              { etiqueta: 'Unidades de controlados', valor: controlados, tipo: 'entero' }
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
        titulo: 'Ticket promedio (30 días)', tipo: 'moneda',
        calcular: function (ctx) {
          var v = ventasEmitidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy());
          return v.length ? ctx.redondear(ctx.suma(v, function (x) { return x.totales.total; }) / v.length) : 0;
        }
      },
      {
        titulo: 'Lotes vencidos con stock', tipo: 'entero',
        calcular: function (ctx) {
          return lotesEnStock(ctx).filter(function (l) { return l.vencimiento < ctx.hoy(); }).length;
        }
      },
      {
        titulo: 'Lotes por vencer (alerta roja o amarilla)', tipo: 'entero',
        calcular: function (ctx) {
          return lotesEnStock(ctx).filter(function (l) { var d = ctx.diasEntre(ctx.hoy(), l.vencimiento); return d >= 0 && d <= ctx.param('alertaAmarillaDias'); }).length;
        }
      },
      {
        titulo: 'Productos con stock bajo', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('productos', stockBajo).length; }
      },
      {
        titulo: 'Valor del inventario al costo', tipo: 'moneda', roles: ['admin', 'quimico', 'almacen', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(lotesEnStock(ctx), function (l) { return (l.costoUnit || 0) * l.stock; }));
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
      productos: armarProductos(),
      lotes: armarLotes(),
      clientes: armarClientes(),
      proveedores: armarProveedores(),
      movimientos: armarMovimientos(),
      ventas: armarVentas(),
      compras: armarCompras()
    }
  };

  /* Cuenta las claves de un objeto usado como conjunto. */
  function contarClaves(obj) {
    var k, n = 0;
    for (k in obj) { if (obj.hasOwnProperty(k)) { n += 1; } }
    return n;
  }
})();
