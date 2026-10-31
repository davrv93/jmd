/*
 * Sabores del Colca · Restaurante (Arequipa)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «restaurante». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (DNI y teléfonos de ejemplo) y no corresponden a personas
 * ni negocios reales. Todo el código es ES5 (sin flechas, let, const ni plantillas).
 *
 * Idea del negocio: cada plato tiene una receta de insumos; el costo del plato sale de la receta
 * (con el rendimiento de cada insumo, porque al limpiar o cocinar se pierde parte). Las comandas
 * descuentan los insumos al servirse y el cierre de caja compara lo cobrado con lo contado.
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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

  function redondeo2(n) { return Math.round(n * 100 + 1e-7) / 100; }

  /* Un precio de la carta ya trae el IGV: el neto es el precio dividido entre (1 + IGV). */
  function sinIgv(monto, ctx) { return monto / (1 + ctx.param('igv') / 100); }

  /* Costo de una cantidad NETA de un insumo: lo que se paga por lo comprado para obtener esa cantidad aprovechable. */
  function costoIngrediente(cantidad, ins) {
    var rend = ins.rendimientoPct > 0 ? ins.rendimientoPct : 100;
    return cantidad * (ins.costo || 0) / (rend / 100);
  }

  /* Costo de una porción de un plato según su receta. */
  function costoPlato(platoId, ctx) {
    var filas = ctx.datos.listar('recetas', function (r) { return r.plato === platoId; }), i, ins, total = 0;
    for (i = 0; i < filas.length; i++) {
      ins = ctx.datos.obtener('insumos', filas[i].insumo);
      if (ins) { total += costoIngrediente(filas[i].cantidad, ins); }
    }
    return total;
  }

  /* Mapa { platoId: costo de la porción } para los reportes (evita recalcular la receta por cada línea). */
  function costosDePlatos(ctx) {
    var platos = ctx.datos.listar('platos'), mapa = {}, i;
    for (i = 0; i < platos.length; i++) { mapa[platos[i].id] = costoPlato(platos[i].id, ctx); }
    return mapa;
  }

  /* Comandas ya servidas (servidas o cobradas) dentro de un rango: las que generaron consumo. */
  function comandasServidas(ctx, desde, hasta) {
    return ctx.datos.listar('comandas', function (c) {
      return (c.estado === 'Servida' || c.estado === 'Cobrada') && (!desde || c.fecha >= desde) && (!hasta || c.fecha <= hasta);
    });
  }

  function insumoBajo(i) { return i.stock <= i.stockMin; }

  /* Insumos que consume una comanda: { insumoId: cantidad comprada necesaria }, contando el rendimiento. */
  function necesidadesDe(doc, ctx) {
    var need = {}, i, j, filas, ins;
    for (i = 0; i < (doc.lineas || []).length; i++) {
      filas = ctx.datos.listar('recetas', function (r) { return r.plato === doc.lineas[i].item; });
      for (j = 0; j < filas.length; j++) {
        ins = ctx.datos.obtener('insumos', filas[j].insumo);
        if (!ins) { continue; }
        need[ins.id] = (need[ins.id] || 0) + doc.lineas[i].cantidad * filas[j].cantidad / ((ins.rendimientoPct > 0 ? ins.rendimientoPct : 100) / 100);
      }
    }
    return need;
  }

  /* ---------- Datos de demostración ---------- */

  /* [código, nombre, unidad, costo, rendimiento %, stock, mínimo, proveedor] */
  var INSUMOS = [
    ['ACE-VEG', 'Aceite vegetal', 'litro', 8.5, 100, 40, 10, 'Distribuidora Andina S.A.C.'],
    ['AGU-625', 'Agua mineral 625 ml', 'unid', 1.2, 100, 240, 60, 'Bebidas del Sur S.A.'],
    ['AJI-AMA', 'Ají amarillo', 'kg', 9, 85, 18, 5, 'Mercado Zonal San Camilo'],
    ['ALP-LOM', 'Alpaca (lomo)', 'kg', 38, 80, 26, 8, 'Carnes Altiplano E.I.R.L.'],
    ['ARR-COS', 'Arroz', 'kg', 4.2, 100, 80, 20, 'Distribuidora Andina S.A.C.'],
    ['AZU-RUB', 'Azúcar', 'kg', 3.6, 100, 60, 15, 'Distribuidora Andina S.A.C.'],
    ['CAM-RIO', 'Camarón de río', 'kg', 58, 40, 14, 5, 'Camarones de Camaná S.R.L.'],
    ['CEB-ROJ', 'Cebolla roja', 'kg', 3.2, 88, 45, 12, 'Mercado Zonal San Camilo'],
    ['CHO-DES', 'Choclo desgranado', 'kg', 6.5, 55, 22, 6, 'Mercado Zonal San Camilo'],
    ['CHU-NEG', 'Chuño', 'kg', 12, 100, 15, 4, 'Productores del Colca'],
    ['CUY-ENT', 'Cuy entero', 'unid', 14.5, 90, 8, 8, 'Granja Los Andes E.I.R.L.'],
    ['HUE-FRE', 'Huevo', 'unid', 0.55, 100, 300, 90, 'Avícola Yanahuara S.A.C.'],
    ['LEC-EVA', 'Leche evaporada', 'unid', 4.1, 100, 60, 20, 'Distribuidora Andina S.A.C.'],
    ['LIM-SUT', 'Limón', 'kg', 5.5, 45, 14, 5, 'Mercado Zonal San Camilo'],
    ['LOM-RES', 'Lomo de res', 'kg', 36, 82, 30, 10, 'Carnes Altiplano E.I.R.L.'],
    ['MAI-MOR', 'Maíz morado', 'kg', 6.8, 100, 25, 8, 'Productores del Colca'],
    ['MOT-PEL', 'Mote', 'kg', 7, 100, 20, 6, 'Productores del Colca'],
    ['PAP-AMA', 'Papa amarilla', 'kg', 3.8, 88, 90, 25, 'Productores del Colca'],
    ['QUE-FRE', 'Queso fresco', 'kg', 24, 100, 4, 5, 'Lácteos Chivay S.A.C.'],
    ['QUI-NOA', 'Quinua', 'kg', 11, 100, 22, 6, 'Productores del Colca'],
    ['ROC-ARE', 'Rocoto', 'kg', 8, 80, 12, 4, 'Mercado Zonal San Camilo'],
    ['TRU-CAP', 'Trucha', 'kg', 16, 52, 25, 8, 'Truchas del Colca S.A.C.']
  ];

  /* [código, nombre, categoría, precio con IGV, minutos de preparación, receta: [[insumo (1…), cantidad neta por porción]]] */
  var PLATOS = [
    ['BEB-AGU', 'Agua mineral 625 ml', 'Bebidas', 5, 1, [[2, 1]]],
    ['BEB-CHI', 'Chicha morada (jarra de 1 litro)', 'Bebidas', 14, 3, [[16, 0.25], [6, 0.12], [14, 0.05]]],
    ['ENT-OCO', 'Ocopa arequipeña', 'Entradas', 18, 12, [[18, 0.25], [19, 0.06], [3, 0.04], [12, 1], [1, 0.01]]],
    ['ENT-SOL', 'Solterito de queso', 'Entradas', 16, 8, [[9, 0.12], [19, 0.08], [8, 0.05], [21, 0.02], [14, 0.02]]],
    ['SOP-CHU', 'Chupe de camarones', 'Sopas', 42, 25, [[7, 0.06], [18, 0.2], [19, 0.05], [12, 1], [13, 0.5], [3, 0.03], [5, 0.04]]],
    ['SOP-QUI', 'Sopa de quinua', 'Sopas', 15, 15, [[20, 0.08], [18, 0.12], [19, 0.04], [1, 0.01]]],
    ['FON-ROC', 'Rocoto relleno con pastel de papa', 'Platos de fondo', 29, 30, [[21, 0.2], [15, 0.08], [19, 0.06], [12, 0.5], [18, 0.25], [8, 0.05]]],
    ['FON-CUY', 'Cuy chactado', 'Platos de fondo', 58, 40, [[11, 1], [18, 0.3], [1, 0.12]]],
    ['FON-LSA', 'Lomo saltado de alpaca', 'Platos de fondo', 42, 18, [[4, 0.2], [8, 0.08], [18, 0.25], [5, 0.15], [1, 0.03]]],
    ['FON-TRU', 'Trucha frita del Colca', 'Platos de fondo', 38, 20, [[22, 0.3], [18, 0.25], [5, 0.12], [1, 0.1], [14, 0.02]]],
    ['ENT-TAM', 'Tamal de choclo con queso', 'Entradas', 14, 6, [[9, 0.2], [19, 0.05], [12, 0.5], [1, 0.02]]],
    ['PAR-ALP', 'Alpaca a la parrilla', 'Parrillas', 54, 25, [[4, 0.25], [18, 0.3], [17, 0.08], [3, 0.02]]],
    ['PAR-LOM', 'Lomo fino a la parrilla', 'Parrillas', 48, 22, [[15, 0.25], [18, 0.3], [8, 0.04], [17, 0.08]]],
    ['POS-QUE', 'Queso helado', 'Postres', 14, 5, [[13, 0.6], [6, 0.06]]],
    ['POS-MAZ', 'Mazamorra morada', 'Postres', 10, 5, [[16, 0.1], [6, 0.06], [14, 0.01]]],
    ['BEB-LIM', 'Limonada frozen', 'Bebidas', 12, 4, [[14, 0.15], [6, 0.08]]]
  ];

  /* Porciones disponibles de cada plato (mismo orden que PLATOS): lo que cocina tiene listo para servir hoy. */
  var PORCIONES = [120, 30, 25, 25, 20, 25, 20, 12, 22, 24, 30, 18, 20, 20, 30, 40];

  /* [código, zona, capacidad, activa] */
  var MESAS = [
    ['M01', 'Salón principal', 2, true], ['M02', 'Salón principal', 4, true], ['M03', 'Salón principal', 4, true], ['M04', 'Salón principal', 6, true],
    ['M05', 'Salón principal', 4, true], ['M06', 'Salón principal', 2, true], ['M07', 'Terraza', 4, true], ['M08', 'Terraza', 4, true],
    ['M09', 'Terraza', 6, false], ['M10', 'Patio', 8, true], ['M11', 'Patio', 6, true], ['M12', 'Reservado', 10, true]
  ];

  /* [nombre, DNI, cargo, turno, ingreso (días atrás), activo, teléfono] */
  var PERSONAL = [
    ['Aldo Huamaní Ccasa', '43120587', 'Mozo', 'Completo', 1450, true, '959100201'],
    ['Brenda Mayta Quispe', '45871203', 'Mozo', 'Mediodía', 980, true, '958223344'],
    ['Carlos Ayala Ticona', '41236587', 'Mozo', 'Noche', 760, true, '957334455'],
    ['Diana Cutipa Mamani', '46728190', 'Cajero', 'Completo', 1200, true, '956445566'],
    ['Edgar Llerena Paz', '29876543', 'Administrador', 'Completo', 2400, true, '955556677'],
    ['Flor Condori Huanca', '47023981', 'Mozo', 'Mediodía', 600, false, '954667788'],
    ['Gladys Ccama Apaza', '40562318', 'Cocinero', 'Completo', 2100, true, '953778899'],
    ['Hugo Salazar Pinto', '42310975', 'Cocinero', 'Noche', 840, true, '952889900'],
    ['Irma Pacheco Soncco', '48120936', 'Ayudante de cocina', 'Mediodía', 300, true, '951990011'],
    ['Julio Vera Mamani', '44190275', 'Mozo', 'Noche', 410, true, '950001122']
  ];

  function id4(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : (n < 100 ? '00' : '0')) + n; }

  var semilla = 31415;
  function azar() { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; }

  /* Totales de una comanda con la misma regla que `calcular` (para que los cierres sembrados cuadren con las comandas). */
  function totalComanda(consumo, conServicio, propina) {
    var c = redondeo2(consumo), s = conServicio ? redondeo2(c * 0.10) : 0;
    return { consumo: c, servicio: s, total: redondeo2(c + s + propina) };
  }

  /* Arma las comandas de 30 días de servicio repartidos en seis meses y el cierre de caja de cada día pasado. */
  function simular() {
    var dias = [], k, d, n, i, j, mesasActivas = [], mozos = [], comandas = [], cierres = [], r, comensales, lineas, usados, p, mesa, cap, t, pago, serv, prop, estado, c, g, fondo, delta, gastos, ef, tj, dg, resp, cuenta = 0;
    var PRINC = [5, 7, 8, 9, 10, 12, 13], ENTR = [3, 4, 11, 6], BEB = [1, 2, 16], POST = [14, 15];
    for (i = 0; i < MESAS.length; i++) { if (MESAS[i][3]) { mesasActivas.push(i + 1); } }
    for (i = 0; i < PERSONAL.length; i++) { if (PERSONAL[i][2] === 'Mozo' && PERSONAL[i][5]) { mozos.push(i + 1); } }
    for (k = 0; k < 24; k++) { dias.push(186 - Math.round(k * 7.5)); }
    dias.push(1, 0);
    dias.sort(function (a, b) { return b - a; });
    for (k = 0; k < dias.length; k++) {
      d = dias[k];
      n = d === 0 ? 3 : 8 + Math.floor(azar() * 4);
      for (i = 0; i < n; i++) {
        mesa = mesasActivas[Math.floor(azar() * mesasActivas.length)];
        cap = MESAS[mesa - 1][2];
        comensales = 1 + Math.floor(azar() * Math.min(cap, 6));
        usados = {};
        lineas = [];
        for (j = 0; j < comensales; j++) {
          if (azar() < 0.75) { p = PRINC[Math.floor(azar() * PRINC.length)]; usados[p] = (usados[p] || 0) + 1; }
          if (azar() < 0.4) { p = ENTR[Math.floor(azar() * ENTR.length)]; usados[p] = (usados[p] || 0) + 1; }
          if (azar() < 0.65) { p = BEB[Math.floor(azar() * BEB.length)]; usados[p] = (usados[p] || 0) + 1; }
          if (azar() < 0.25) { p = POST[Math.floor(azar() * POST.length)]; usados[p] = (usados[p] || 0) + 1; }
        }
        for (p in usados) { if (usados.hasOwnProperty(p)) { lineas.push([parseInt(p, 10), usados[p]]); } }
        if (!lineas.length) { lineas.push([9, 1]); }
        lineas.sort(function (a, b) { return a[0] - b[0]; });
        t = 0;
        for (j = 0; j < lineas.length; j++) { t += lineas[j][1] * PLATOS[lineas[j][0] - 1][3]; }
        r = azar();
        pago = r < 0.4 ? 'Efectivo' : (r < 0.75 ? 'Tarjeta' : 'Yape o Plin');
        serv = azar() < 0.85;
        prop = azar() < 0.4 ? Math.round(t * 0.05) : 0;
        cuenta += 1;
        estado = 'Cobrada';
        if (cuenta % 37 === 0) { estado = 'Anulada'; }
        if (d === 0) { estado = i === 0 ? 'Servida' : 'Abierta'; }
        comandas.push({
          dias: d, mesa: mesa, mozo: mozos[Math.floor(azar() * mozos.length)], comensales: comensales, duracion: 28 + comensales * 9 + Math.floor(azar() * 32),
          pago: pago, servicio: serv, propina: prop, lineas: lineas, estado: estado, consumo: t
        });
      }
    }
    /* Cierre de caja de cada día pasado con comandas cobradas */
    for (k = 0; k < dias.length; k++) {
      d = dias[k];
      if (d === 0) { continue; }
      g = { Efectivo: 0, Tarjeta: 0, 'Yape o Plin': 0 };
      for (i = 0; i < comandas.length; i++) {
        c = comandas[i];
        if (c.dias === d && c.estado === 'Cobrada') { g[c.pago] += totalComanda(c.consumo, c.servicio, c.propina).total; }
      }
      fondo = k % 5 === 4 ? 150 : 200;
      gastos = k % 6 === 2 ? 15 + (k % 4) * 8 : 0;
      r = azar();
      delta = r < 0.6 ? 0 : (r < 0.8 ? -5 : (r < 0.92 ? 2.5 : -12.5));
      ef = redondeo2(fondo + g.Efectivo - gastos + delta);
      tj = redondeo2(g.Tarjeta);
      dg = redondeo2(g['Yape o Plin']);
      resp = k % 7 === 3 ? 5 : 4;
      cierres.push({ dias: d, responsable: resp, fondo: fondo, efectivo: ef, tarjeta: tj, digital: dg, gastos: gastos });
    }
    return { comandas: comandas, cierres: cierres };
  }

  var SIM = simular();

  function armarInsumos() {
    var r = [], i, f;
    for (i = 0; i < INSUMOS.length; i++) {
      f = INSUMOS[i];
      r.push({ id: id4('INS', i + 1), codigo: f[0], nombre: f[1], unidad: f[2], costo: f[3], rendimientoPct: f[4], stock: f[5], stockMin: f[6], proveedor: f[7] });
    }
    return r;
  }

  function armarPlatos() {
    var r = [], i, f;
    for (i = 0; i < PLATOS.length; i++) {
      f = PLATOS[i];
      r.push({ id: id4('PLA', i + 1), codigo: f[0], nombre: f[1], categoria: f[2], precio: f[3], tiempoPrepMin: f[4], stock: PORCIONES[i], activo: true });
    }
    return r;
  }

  function armarRecetas() {
    var r = [], i, j, n = 0, f;
    for (i = 0; i < PLATOS.length; i++) {
      for (j = 0; j < PLATOS[i][5].length; j++) {
        f = PLATOS[i][5][j];
        n += 1;
        r.push({ id: id4('REC', n), plato: id4('PLA', i + 1), insumo: id4('INS', f[0]), cantidad: f[1] });
      }
    }
    return r;
  }

  function armarMesas() {
    var r = [], i, f;
    for (i = 0; i < MESAS.length; i++) {
      f = MESAS[i];
      r.push({ id: id4('MES', i + 1), codigo: f[0], zona: f[1], capacidad: f[2], activa: f[3] });
    }
    return r;
  }

  function armarPersonal() {
    var r = [], i, f;
    for (i = 0; i < PERSONAL.length; i++) {
      f = PERSONAL[i];
      r.push({ id: id4('PER', i + 1), nombre: f[0], dni: f[1], cargo: f[2], turno: f[3], fechaIngreso: '@-' + f[4], activo: f[5], telefono: f[6] });
    }
    return r;
  }

  function armarComandas() {
    var r = [], i, c, ls, j, doc;
    for (i = 0; i < SIM.comandas.length; i++) {
      c = SIM.comandas[i];
      ls = [];
      for (j = 0; j < c.lineas.length; j++) { ls.push({ item: id4('PLA', c.lineas[j][0]), cantidad: c.lineas[j][1], precio: PLATOS[c.lineas[j][0] - 1][3] }); }
      doc = {
        id: id4('CMD', i + 1), fecha: '@-' + c.dias, mesa: id4('MES', c.mesa), mozo: id4('PER', c.mozo), comensales: c.comensales, duracionMin: c.duracion,
        formaPago: c.pago, conServicio: c.servicio, estado: c.estado, lineas: ls
      };
      if (c.propina > 0) { doc.propina = c.propina; }
      r.push(doc);
    }
    return r;
  }

  function armarCierres() {
    var r = [], i, c, doc;
    for (i = 0; i < SIM.cierres.length; i++) {
      c = SIM.cierres[i];
      doc = {
        id: id4('CCJ', i + 1), fecha: '@-' + c.dias, responsable: id4('PER', c.responsable), fondoInicial: c.fondo, efectivoContado: c.efectivo,
        tarjetaVouchers: c.tarjeta, digitalContado: c.digital, gastosCaja: c.gastos, estado: 'Emitido'
      };
      if (c.gastos > 0) { doc.observaciones = 'Gastos de caja: compra de hielo y gas.'; }
      r.push(doc);
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'restaurante',
    nombre: 'Sabores del Colca · Restaurante',
    rubro: 'Restaurante de comida arequipeña',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#8a3b12', acento: '#e8a317', siglas: 'SC' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Los precios de la carta ya incluyen el IGV; se muestra desglosado en cada comanda.' },
      { id: 'servicioPct', etiqueta: 'Cargo por servicio', tipo: 'porcentaje', min: 0, max: 20, valor: 10, ayuda: 'Porcentaje sobre el consumo cuando la comanda lleva servicio.' },
      { id: 'foodCostMeta', etiqueta: 'Meta de food cost', tipo: 'porcentaje', min: 1, max: 100, valor: 32, ayuda: 'Costo de la receta sobre el precio sin IGV que la casa quiere como máximo.' },
      { id: 'horasServicio', etiqueta: 'Horas de servicio por día', tipo: 'entero', min: 1, max: 24, valor: 10, ayuda: 'Para medir cuánto de su tiempo está ocupada cada mesa.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 0,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: true,
      exportaRespetaPermisos: true,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador del sistema', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros del restaurante.' },
      { id: 'gerente', nombre: 'Administrador del restaurante', descripcion: 'Maneja carta, mesas, personal y compras de insumos, anula comandas y cierres y ve todos los reportes con costos.' },
      { id: 'mozo', nombre: 'Mozo', descripcion: 'Abre y edita comandas de sus mesas y las envía a cocina. Ve la carta con precios (sin costos) y las mesas. No cobra ni ve reportes.' },
      { id: 'cocina', nombre: 'Jefe de cocina', descripcion: 'Mantiene las recetas, ajusta existencias de insumos, marca comandas como servidas y ve el food cost. No maneja dinero.' },
      { id: 'cajero', nombre: 'Cajero', descripcion: 'Cobra las comandas servidas, registra los cierres de caja diarios y consulta carta y mesas. No ve costos ni recetas.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    permisosSistema: {
      bitacora: ['admin', 'gerente', 'auditor']
    },

    usuarios: [
      { usuario: 'admin', nombre: 'Edgar Llerena Paz', rol: 'admin', clave: 'Admin#2026r' },
      { usuario: 'gerente', nombre: 'Marcelo Paredes Gutiérrez', rol: 'gerente', clave: 'Gerente#2026r' },
      { usuario: 'mozo', nombre: 'Aldo Huamaní Ccasa', rol: 'mozo', clave: 'Mozo#2026rx' },
      { usuario: 'cocina', nombre: 'Gladys Ccama Apaza', rol: 'cocina', clave: 'Cocina#2026r' },
      { usuario: 'cajero', nombre: 'Diana Cutipa Mamani', rol: 'cajero', clave: 'Caja#2026rx' },
      { usuario: 'auditor', nombre: 'Iván Zegarra Bellido', rol: 'auditor', clave: 'Audita#2026r' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'platos', nombre: 'Plato', plural: 'Platos', prefijo: 'PLA',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del plato', tipo: 'texto', requerido: true, max: 80 },
          { id: 'categoria', etiqueta: 'Categoría', tipo: 'lista', requerido: true, opciones: ['Entradas', 'Sopas', 'Platos de fondo', 'Parrillas', 'Postres', 'Bebidas'] },
          { id: 'precio', etiqueta: 'Precio en carta (con IGV)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'tiempoPrepMin', etiqueta: 'Tiempo de preparación (min)', tipo: 'entero', min: 1, max: 90, requerido: true, defecto: 15 },
          { id: 'stock', etiqueta: 'Porciones disponibles hoy', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'Lo que cocina tiene listo para servir. Baja al servir una comanda y sube al anularla; cocina lo repone cada día.' },
          { id: 'activo', etiqueta: 'Plato en carta', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'categoria', 'precio', 'stock', 'foodCostPct'],
        buscar: ['codigo', 'nombre', 'categoria'],
        calculados: [
          {
            id: 'costoReceta', etiqueta: 'Costo de la receta', tipo: 'moneda', ver: ['admin', 'gerente', 'cocina', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(costoPlato(r.id, ctx)); }
          },
          {
            id: 'foodCostPct', etiqueta: 'Food cost %', tipo: 'porcentaje', ver: ['admin', 'gerente', 'cocina', 'auditor'],
            formula: function (r, ctx) {
              var neto = sinIgv(r.precio || 0, ctx);
              return neto > 0 ? ctx.redondear(costoPlato(r.id, ctx) / neto * 100) : null;
            }
          },
          {
            id: 'margenPlato', etiqueta: 'Margen por porción (sin IGV)', tipo: 'moneda', ver: ['admin', 'gerente', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(sinIgv(r.precio || 0, ctx) - costoPlato(r.id, ctx)); }
          },
          {
            id: 'metaFoodCost', etiqueta: 'Frente a la meta', tipo: 'texto', ver: ['admin', 'gerente', 'cocina', 'auditor'],
            formula: function (r, ctx) {
              var neto = sinIgv(r.precio || 0, ctx), fc;
              if (!(neto > 0)) { return 'Sin precio'; }
              fc = costoPlato(r.id, ctx) / neto * 100;
              return fc > ctx.param('foodCostMeta') ? 'Sobre la meta' : 'Dentro de la meta';
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'mozo', 'cocina', 'cajero', 'auditor'], crear: ['admin', 'gerente', 'cocina'], editar: ['admin', 'gerente', 'cocina'], eliminar: ['admin'] }
      },
      {
        id: 'insumos', nombre: 'Insumo', plural: 'Insumos', prefijo: 'INS',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del insumo', tipo: 'texto', requerido: true, max: 60 },
          { id: 'unidad', etiqueta: 'Unidad de compra', tipo: 'lista', requerido: true, opciones: ['kg', 'litro', 'unid'] },
          { id: 'costo', etiqueta: 'Costo por unidad de compra', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'gerente', 'auditor'] },
          { id: 'rendimientoPct', etiqueta: 'Rendimiento %', tipo: 'porcentaje', min: 1, max: 100, requerido: true, defecto: 100, ayuda: 'Lo aprovechable después de limpiar o cocinar: de 1 kg comprado con 85 % salen 0,85 kg netos.' },
          { id: 'stock', etiqueta: 'Stock actual', tipo: 'numero', min: 0, requerido: true, defecto: 0, ayuda: 'Baja al servir una comanda y sube al anularla.' },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'numero', min: 0, requerido: true, defecto: 0 },
          { id: 'proveedor', etiqueta: 'Proveedor habitual', tipo: 'texto', max: 60 }
        ],
        lista: ['codigo', 'nombre', 'unidad', 'stock', 'stockMin', 'situacion'],
        buscar: ['codigo', 'nombre', 'proveedor'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r) { return r.stock <= 0 ? 'Agotado' : (insumoBajo(r) ? 'Bajo el mínimo' : 'Normal'); }
          },
          {
            id: 'costoNeto', etiqueta: 'Costo por unidad neta', tipo: 'moneda', ver: ['admin', 'gerente', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(costoIngrediente(1, r)); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'cocina', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente', 'cocina'], eliminar: ['admin'] }
      },
      {
        id: 'recetas', nombre: 'Ingrediente de receta', plural: 'Recetas (ingredientes)', prefijo: 'REC',
        campos: [
          { id: 'plato', etiqueta: 'Plato', tipo: 'ref', entidad: 'platos', mostrar: 'nombre', requerido: true },
          { id: 'insumo', etiqueta: 'Insumo', tipo: 'ref', entidad: 'insumos', mostrar: 'nombre', requerido: true },
          { id: 'cantidad', etiqueta: 'Cantidad neta por porción', tipo: 'numero', min: 0.001, max: 5, requerido: true, ayuda: 'Cantidad que llega al plato, en la unidad de compra del insumo (el rendimiento se aplica aparte).' }
        ],
        lista: ['plato', 'insumo', 'cantidad', 'costoIngrediente'],
        buscar: ['plato', 'insumo'],
        calculados: [
          {
            id: 'costoIngrediente', etiqueta: 'Costo por porción', tipo: 'moneda', ver: ['admin', 'gerente', 'cocina', 'auditor'],
            formula: function (r, ctx) {
              var ins = ctx.datos.obtener('insumos', r.insumo);
              return ins ? ctx.redondear(costoIngrediente(r.cantidad, ins)) : 0;
            }
          }
        ],
        reglas: [
          {
            id: 'ingrediente-no-repetido', mensaje: 'Ese insumo ya está en la receta del plato: edita la fila existente.',
            validar: function (r, ctx) {
              return ctx.datos.listar('recetas', function (x) { return x.plato === r.plato && x.insumo === r.insumo && x.id !== r.id; }).length === 0;
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'cocina', 'auditor'], crear: ['admin', 'cocina'], editar: ['admin', 'cocina'], eliminar: ['admin'] }
      },
      {
        id: 'mesas', nombre: 'Mesa', plural: 'Mesas', prefijo: 'MES',
        campos: [
          { id: 'codigo', etiqueta: 'Código de mesa', tipo: 'texto', requerido: true, unico: true, max: 10, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones (por ejemplo M01).' },
          { id: 'zona', etiqueta: 'Zona', tipo: 'lista', requerido: true, opciones: ['Salón principal', 'Terraza', 'Patio', 'Reservado'] },
          { id: 'capacidad', etiqueta: 'Capacidad (personas)', tipo: 'entero', min: 1, max: 20, requerido: true, defecto: 4 },
          { id: 'activa', etiqueta: 'Mesa habilitada', tipo: 'booleano', defecto: true, ayuda: 'Una mesa deshabilitada no recibe comandas.' }
        ],
        lista: ['codigo', 'zona', 'capacidad', 'activa', 'atenciones'],
        buscar: ['codigo', 'zona'],
        calculados: [
          {
            id: 'atenciones', etiqueta: 'Comandas atendidas', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('comandas', function (c) { return c.mesa === r.id && (c.estado === 'Servida' || c.estado === 'Cobrada'); }).length; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'mozo', 'cajero', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'personal', nombre: 'Personal', plural: 'Personal', prefijo: 'PER',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'cargo', etiqueta: 'Cargo', tipo: 'lista', requerido: true, opciones: ['Mozo', 'Cajero', 'Cocinero', 'Ayudante de cocina', 'Administrador'] },
          { id: 'turno', etiqueta: 'Turno', tipo: 'lista', requerido: true, opciones: ['Mediodía', 'Noche', 'Completo'], defecto: 'Completo' },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'activo', etiqueta: 'En planilla', tipo: 'booleano', defecto: true }
        ],
        lista: ['nombre', 'cargo', 'turno', 'fechaIngreso', 'activo'],
        buscar: ['nombre', 'dni', 'cargo'],
        permisos: { ver: ['admin', 'gerente', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'comandas', nombre: 'Comanda', plural: 'Comandas', prefijo: 'CMD', serie: 'C001',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'mesa', etiqueta: 'Mesa', tipo: 'ref', entidad: 'mesas', mostrar: 'codigo', requerido: true },
          { id: 'mozo', etiqueta: 'Mozo', tipo: 'ref', entidad: 'personal', mostrar: 'nombre', requerido: true },
          { id: 'comensales', etiqueta: 'Comensales', tipo: 'entero', min: 1, max: 20, requerido: true, defecto: 2 },
          { id: 'duracionMin', etiqueta: 'Tiempo de ocupación (min)', tipo: 'entero', min: 5, max: 300, requerido: true, defecto: 60, ayuda: 'Desde que se sientan hasta que dejan la mesa. Alimenta el reporte de rotación.' },
          { id: 'formaPago', etiqueta: 'Forma de pago', tipo: 'lista', requerido: true, opciones: ['Efectivo', 'Tarjeta', 'Yape o Plin'], defecto: 'Efectivo' },
          { id: 'conServicio', etiqueta: 'Cobrar cargo por servicio', tipo: 'booleano', defecto: true },
          { id: 'propina', etiqueta: 'Propina voluntaria', tipo: 'moneda', min: 0, defecto: 0, ayuda: 'Monto que el cliente deja para el personal; no lleva IGV.' }
        ],
        lista: ['fecha', 'mesa', 'mozo'],
        estados: ['Abierta', 'Servida', 'Cobrada', 'Anulada'],
        lineas: {
          entidad: 'platos', mostrar: 'nombre', precio: 'precio',
          campos: [
            { id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 },
            { id: 'nota', etiqueta: 'Nota para cocina', tipo: 'texto', max: 60 }
          ],
          info: function (item) { return item.categoria + ' · quedan ' + item.stock + ' porciones · prepara en ' + item.tiempoPrepMin + ' min' + (item.activo === false ? ' · FUERA DE CARTA' : ''); }
        },
        calcular: function (doc, ctx) {
          var consumo = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var servicio = doc.conServicio ? ctx.redondear(consumo * 0.10) : 0;
          var propina = ctx.redondear(doc.propina || 0);
          var gravado = consumo + servicio, base = ctx.redondear(sinIgv(gravado, ctx)), costo = 0, i;
          for (i = 0; i < (doc.lineas || []).length; i++) { costo += doc.lineas[i].cantidad * costoPlato(doc.lineas[i].item, ctx); }
          return {
            consumo: consumo, servicio: servicio, propina: propina, igv: ctx.redondear(gravado - base), total: ctx.redondear(consumo + servicio + propina),
            costo: ctx.redondear(costo), foodCost: consumo > 0 ? ctx.redondear(costo / sinIgv(consumo, ctx) * 100) : 0,
            porComensal: doc.comensales > 0 ? ctx.redondear((consumo + servicio) / doc.comensales) : 0
          };
        },
        totales: [
          { id: 'consumo', etiqueta: 'Consumo (con IGV)' },
          { id: 'servicio', etiqueta: 'Cargo por servicio' },
          { id: 'propina', etiqueta: 'Propina' },
          { id: 'igv', etiqueta: 'IGV incluido' },
          { id: 'porComensal', etiqueta: 'Consumo por comensal' },
          { id: 'total', etiqueta: 'Total a cobrar', fuerte: true }
        ],
        reglas: [
          {
            id: 'mesa-habilitada', mensaje: 'La mesa elegida no está habilitada.',
            validar: function (d, ctx) { var m = ctx.datos.obtener('mesas', d.mesa); return !!m && m.activa !== false; }
          },
          {
            id: 'cabe-en-la-mesa', mensaje: 'Hay más comensales que la capacidad de la mesa.',
            validar: function (d, ctx) { var m = ctx.datos.obtener('mesas', d.mesa); return !m || d.comensales <= m.capacidad; }
          },
          {
            id: 'platos-en-carta', mensaje: 'La comanda incluye un plato que está fuera de carta.',
            validar: function (d, ctx) {
              var i, pl;
              for (i = 0; i < (d.lineas || []).length; i++) {
                pl = ctx.datos.obtener('platos', d.lineas[i].item);
                if (pl && pl.activo === false) { return false; }
              }
              return true;
            }
          },
          {
            id: 'atiende-un-mozo', mensaje: 'La comanda debe atenderla un mozo en planilla.',
            validar: function (d, ctx) { var p = ctx.datos.obtener('personal', d.mozo); return !!p && p.cargo === 'Mozo' && p.activo !== false; }
          }
        ],
        alEmitir: function (doc, ctx) {
          var need = necesidadesDe(doc, ctx), k, ins, i, pl, l;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            pl = ctx.datos.obtener('platos', l.item);
            if (pl.stock < l.cantidad) { throw new Error('Solo quedan ' + pl.stock + ' porciones de «' + pl.nombre + '» y la comanda pide ' + l.cantidad + '.'); }
          }
          for (k in need) {
            if (!need.hasOwnProperty(k)) { continue; }
            ins = ctx.datos.obtener('insumos', k);
            if (ins.stock < ctx.redondear(need[k])) { throw new Error('Falta «' + ins.nombre + '»: la comanda necesita ' + ctx.redondear(need[k]) + ' ' + ins.unidad + ' y quedan ' + ins.stock + '.'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            pl = ctx.datos.obtener('platos', l.item);
            ctx.datos.actualizar('platos', pl.id, { stock: pl.stock - l.cantidad });
          }
          for (k in need) {
            if (!need.hasOwnProperty(k)) { continue; }
            ins = ctx.datos.obtener('insumos', k);
            ctx.datos.actualizar('insumos', k, { stock: ctx.redondear(ins.stock - need[k]) });
          }
        },
        alAnular: function (doc, ctx) {
          var need = necesidadesDe(doc, ctx), k, ins, i, pl, l;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            pl = ctx.datos.obtener('platos', l.item);
            ctx.datos.actualizar('platos', pl.id, { stock: pl.stock + l.cantidad });
          }
          for (k in need) {
            if (!need.hasOwnProperty(k)) { continue; }
            ins = ctx.datos.obtener('insumos', k);
            ctx.datos.actualizar('insumos', k, { stock: ctx.redondear(ins.stock + need[k]) });
          }
        },
        permisos: {
          ver: ['admin', 'gerente', 'mozo', 'cocina', 'cajero', 'auditor'],
          crear: ['admin', 'mozo'], editar: ['admin', 'mozo'], emitir: ['admin', 'mozo', 'cocina', 'cajero'], anular: ['admin', 'gerente'], eliminar: ['admin', 'mozo']
        }
      },
      {
        id: 'cierres', nombre: 'Cierre de caja', plural: 'Cierres de caja', prefijo: 'CCJ', serie: 'CJ01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de la jornada', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'responsable', etiqueta: 'Responsable de caja', tipo: 'ref', entidad: 'personal', mostrar: 'nombre', requerido: true },
          { id: 'fondoInicial', etiqueta: 'Fondo inicial de caja', tipo: 'moneda', min: 0, requerido: true, defecto: 200 },
          { id: 'efectivoContado', etiqueta: 'Efectivo contado (incluye el fondo)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'tarjetaVouchers', etiqueta: 'Vouchers de tarjeta', tipo: 'moneda', min: 0, requerido: true, defecto: 0 },
          { id: 'digitalContado', etiqueta: 'Yape o Plin recibido', tipo: 'moneda', min: 0, requerido: true, defecto: 0 },
          { id: 'gastosCaja', etiqueta: 'Gastos pagados de caja', tipo: 'moneda', min: 0, defecto: 0 },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'responsable'],
        estados: ['Borrador', 'Emitido', 'Anulado'],
        calcular: function (doc, ctx) {
          var cobradas = ctx.datos.listar('comandas', function (c) { return c.estado === 'Cobrada' && c.fecha === doc.fecha; }), i, c, ef = 0, tj = 0, dg = 0, propinas = 0, total = 0, serv = 0;
          for (i = 0; i < cobradas.length; i++) {
            c = cobradas[i];
            total += c.totales ? c.totales.total : 0;
            propinas += c.totales ? c.totales.propina : 0;
            serv += c.totales ? c.totales.servicio : 0;
            if (c.formaPago === 'Efectivo') { ef += c.totales ? c.totales.total : 0; }
            else if (c.formaPago === 'Tarjeta') { tj += c.totales ? c.totales.total : 0; }
            else { dg += c.totales ? c.totales.total : 0; }
          }
          var esperadoEf = (doc.fondoInicial || 0) + ef - (doc.gastosCaja || 0);
          var contado = (doc.efectivoContado || 0) + (doc.tarjetaVouchers || 0) + (doc.digitalContado || 0);
          var esperado = esperadoEf + tj + dg;
          return {
            comandas: cobradas.length, ventas: ctx.redondear(total), propinas: ctx.redondear(propinas), servicio: ctx.redondear(serv),
            ticket: cobradas.length ? ctx.redondear(total / cobradas.length) : 0,
            difEfectivo: ctx.redondear((doc.efectivoContado || 0) - esperadoEf), difTarjeta: ctx.redondear((doc.tarjetaVouchers || 0) - tj), difDigital: ctx.redondear((doc.digitalContado || 0) - dg),
            esperado: ctx.redondear(esperado), diferencia: ctx.redondear(contado - esperado), total: ctx.redondear(contado)
          };
        },
        totales: [
          { id: 'comandas', etiqueta: 'Comandas cobradas del día', tipo: 'entero' },
          { id: 'ventas', etiqueta: 'Cobrado según las comandas' },
          { id: 'esperado', etiqueta: 'Esperado en caja' },
          { id: 'diferencia', etiqueta: 'Diferencia (sobrante + / faltante −)' },
          { id: 'total', etiqueta: 'Total contado', fuerte: true }
        ],
        alEmitir: function (doc, ctx) {
          var otros = ctx.datos.listar('cierres', function (x) { return x.fecha === doc.fecha && x.id !== doc.id && x.estado === 'Emitido'; });
          if (otros.length) { throw new Error('Ya hay un cierre de caja emitido para el ' + ctx.fmt.fecha(doc.fecha) + ' (' + (otros[0].numero || otros[0].id) + '). Anúlalo primero si hay que rehacerlo.'); }
        },
        permisos: { ver: ['admin', 'gerente', 'cajero', 'auditor'], crear: ['admin', 'cajero'], editar: ['admin', 'cajero'], emitir: ['admin', 'cajero'], anular: ['admin', 'gerente'], eliminar: ['admin', 'cajero'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ventas-plato', titulo: 'Ventas por plato',
        descripcion: 'Unidades vendidas, ingreso (con IGV) y margen de cada plato en las comandas servidas del periodo. No cuentan las abiertas ni las anuladas.',
        roles: ['admin', 'gerente', 'cocina', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var cmds = comandasServidas(ctx, p.desde, p.hasta), costos = costosDePlatos(ctx), acum = {}, i, j, l, k, filas = [], etiquetas = [], valores = [], pl, totalIng = 0, uni = 0;
          for (i = 0; i < cmds.length; i++) {
            for (j = 0; j < cmds[i].lineas.length; j++) {
              l = cmds[i].lineas[j];
              if (!acum[l.item]) { acum[l.item] = { unidades: 0, ingreso: 0 }; }
              acum[l.item].unidades += l.cantidad;
              acum[l.item].ingreso += l.cantidad * l.precio;
              totalIng += l.cantidad * l.precio;
              uni += l.cantidad;
            }
          }
          for (k in acum) {
            if (!acum.hasOwnProperty(k)) { continue; }
            pl = ctx.datos.obtener('platos', k);
            filas.push([pl ? pl.nombre : k, pl ? pl.categoria : '', acum[k].unidades, ctx.redondear(acum[k].ingreso), ctx.redondear(sinIgv(acum[k].ingreso, ctx) - acum[k].unidades * (costos[k] || 0)), ctx.redondear(pct(acum[k].ingreso, totalIng))]);
          }
          filas.sort(function (a, b) { return b[3] - a[3]; });
          for (i = 0; i < filas.length && i < 10; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][3]); }
          return {
            columnas: ['Plato', 'Categoría', 'Unidades', 'Ingreso', 'Margen (sin IGV)', '% del ingreso'], tipos: ['texto', 'texto', 'entero', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Ingreso por platos', valor: ctx.redondear(totalIng), tipo: 'moneda' },
              { etiqueta: 'Platos vendidos', valor: uni, tipo: 'entero' },
              { etiqueta: 'Plato más vendido', valor: filas.length ? filas.slice(0).sort(function (a, b) { return b[2] - a[2]; })[0][0] : 'Sin ventas', tipo: 'texto' }
            ]
          };
        }
      },
      {
        id: 'food-cost', titulo: 'Food cost por plato',
        descripcion: 'Costo de la receta sobre el precio sin IGV de cada plato vendido en el periodo, comparado con la meta de la casa, y el food cost ponderado por lo realmente vendido.',
        roles: ['admin', 'gerente', 'cocina', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var platos = ctx.datos.listar('platos'), costos = costosDePlatos(ctx), cmds = comandasServidas(ctx, p.desde, p.hasta), vendidos = {}, i, j, l, pl, neto, fc, filas = [], etiquetas = [], valores = [], meta = ctx.param('foodCostMeta'), sobre = 0, costoVend = 0, netoVend = 0;
          for (i = 0; i < cmds.length; i++) {
            for (j = 0; j < cmds[i].lineas.length; j++) {
              l = cmds[i].lineas[j];
              vendidos[l.item] = (vendidos[l.item] || 0) + l.cantidad;
              costoVend += l.cantidad * (costos[l.item] || 0);
              netoVend += sinIgv(l.cantidad * l.precio, ctx);
            }
          }
          for (i = 0; i < platos.length; i++) {
            pl = platos[i];
            if (!vendidos[pl.id]) { continue; }
            neto = sinIgv(pl.precio, ctx);
            fc = pct(costos[pl.id] || 0, neto);
            if (fc > meta) { sobre += 1; }
            filas.push([pl.nombre, ctx.redondear(neto), ctx.redondear(costos[pl.id] || 0), ctx.redondear(fc), fc > meta ? 'Sobre la meta' : 'Dentro de la meta', vendidos[pl.id] || 0]);
          }
          filas.sort(function (a, b) { return b[3] - a[3]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][3]); }
          return {
            columnas: ['Plato', 'Precio sin IGV', 'Costo de la receta', 'Food cost %', 'Frente a la meta', 'Vendidos en el periodo'], tipos: ['texto', 'moneda', 'moneda', 'porcentaje', 'texto', 'entero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Food cost ponderado por ventas', valor: ctx.redondear(pct(costoVend, netoVend)), tipo: 'porcentaje' },
              { etiqueta: 'Meta de food cost', valor: meta, tipo: 'porcentaje' },
              { etiqueta: 'Platos sobre la meta', valor: sobre, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'rotacion-mesa', titulo: 'Rotación por mesa',
        descripcion: 'Cuántas veces al día se sirve cada mesa (comandas por día de servicio), cuánto dura cada ocupación y qué parte del horario de servicio está ocupada.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var cmds = comandasServidas(ctx, p.desde, p.hasta), mesas = ctx.datos.listar('mesas'), fechas = {}, dias = 0, k, i, mias, minutos, filas = [], etiquetas = [], valores = [], total = 0, disp;
          for (i = 0; i < cmds.length; i++) { fechas[cmds[i].fecha] = true; }
          for (k in fechas) { if (fechas.hasOwnProperty(k)) { dias += 1; } }
          disp = dias * ctx.param('horasServicio') * 60;
          for (i = 0; i < mesas.length; i++) {
            mias = cmds.filter(function (c) { return c.mesa === mesas[i].id; });
            if (!mias.length) { continue; }
            minutos = ctx.suma(mias, function (c) { return c.duracionMin; });
            total += mias.length;
            filas.push([mesas[i].codigo, mesas[i].zona, mesas[i].capacidad, mias.length, ctx.suma(mias, function (c) { return c.comensales; }), dias > 0 ? ctx.redondear(mias.length / dias) : 0, ctx.redondear(minutos / mias.length), ctx.redondear(pct(minutos, disp))]);
          }
          filas.sort(function (a, b) { return b[5] - a[5]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][5]); }
          return {
            columnas: ['Mesa', 'Zona', 'Capacidad', 'Comandas', 'Comensales', 'Rotación (comandas por día)', 'Minutos por ocupación', 'Ocupación %'], tipos: ['texto', 'texto', 'entero', 'entero', 'entero', 'numero', 'numero', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'numero' },
            resumen: [
              { etiqueta: 'Días de servicio', valor: dias, tipo: 'entero' },
              { etiqueta: 'Comandas servidas', valor: total, tipo: 'entero' },
              { etiqueta: 'Rotación media por mesa', valor: filas.length && dias > 0 ? ctx.redondear(total / dias / filas.length) : 0, tipo: 'numero' }
            ]
          };
        }
      },
      {
        id: 'ventas-mozo', titulo: 'Ventas por mozo',
        descripcion: 'Comandas, comensales, consumo, cargo por servicio y propinas de cada mozo, con el ticket promedio y el consumo por comensal.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var cmds = comandasServidas(ctx, p.desde, p.hasta), grupos = ctx.agrupar(cmds, function (c) { return c.mozo; }), k, g, per, filas = [], etiquetas = [], valores = [], i, consumo, comensales, totCons = 0, totProp = 0;
          for (k in grupos) {
            if (!grupos.hasOwnProperty(k)) { continue; }
            g = grupos[k];
            per = ctx.datos.obtener('personal', k);
            consumo = ctx.suma(g, function (c) { return c.totales.consumo; });
            comensales = ctx.suma(g, function (c) { return c.comensales; });
            totCons += consumo;
            totProp += ctx.suma(g, function (c) { return c.totales.propina; });
            filas.push([per ? per.nombre : k, g.length, comensales, ctx.redondear(consumo), ctx.redondear(ctx.suma(g, function (c) { return c.totales.servicio; })), ctx.redondear(ctx.suma(g, function (c) { return c.totales.propina; })), ctx.redondear(consumo / g.length), comensales > 0 ? ctx.redondear(consumo / comensales) : 0]);
          }
          filas.sort(function (a, b) { return b[3] - a[3]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][3]); }
          return {
            columnas: ['Mozo', 'Comandas', 'Comensales', 'Consumo', 'Servicio', 'Propinas', 'Ticket promedio', 'Por comensal'], tipos: ['texto', 'entero', 'entero', 'moneda', 'moneda', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Consumo total', valor: ctx.redondear(totCons), tipo: 'moneda' },
              { etiqueta: 'Propinas', valor: ctx.redondear(totProp), tipo: 'moneda' },
              { etiqueta: 'Ticket promedio', valor: cmds.length ? ctx.redondear(totCons / cmds.length) : 0, tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'cierre-diario', titulo: 'Cierre de caja diario',
        descripcion: 'Cada cierre emitido en el periodo: comandas cobradas, lo esperado según el sistema, lo contado en caja y la diferencia (sobrante o faltante).',
        roles: ['admin', 'gerente', 'cajero', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var cierres = ctx.datos.listar('cierres', function (c) { return c.estado === 'Emitido' && c.fecha >= p.desde && c.fecha <= p.hasta; }), filas = [], etiquetas = [], valores = [], i, c, t, totVentas = 0, totDif = 0, faltantes = 0;
          cierres.sort(function (a, b) { return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : (a.id < b.id ? -1 : 1)); });
          for (i = 0; i < cierres.length; i++) {
            c = cierres[i];
            t = c.totales || {};
            filas.push([c.fecha, c.numero || c.id, t.comandas || 0, t.ventas || 0, t.esperado || 0, t.total || 0, t.diferencia || 0, t.ticket || 0]);
            etiquetas.push(c.fecha.slice(5));
            valores.push(t.ventas || 0);
            totVentas += t.ventas || 0;
            totDif += t.diferencia || 0;
            if ((t.diferencia || 0) < 0) { faltantes += 1; }
          }
          return {
            columnas: ['Fecha', 'Cierre', 'Comandas', 'Cobrado según comandas', 'Esperado en caja', 'Contado', 'Diferencia', 'Ticket promedio'], tipos: ['fecha', 'texto', 'entero', 'moneda', 'moneda', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'linea', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Cobrado en el periodo', valor: ctx.redondear(totVentas), tipo: 'moneda' },
              { etiqueta: 'Diferencia acumulada', valor: ctx.redondear(totDif), tipo: 'moneda' },
              { etiqueta: 'Cierres con faltante', valor: faltantes, tipo: 'entero' }
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
          return ctx.redondear(ctx.suma(comandasServidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (c) { return c.totales.consumo + c.totales.servicio; }));
        }
      },
      {
        titulo: 'Ticket promedio por comanda (30 días)', tipo: 'moneda',
        calcular: function (ctx) {
          var c = comandasServidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy());
          return c.length ? ctx.redondear(ctx.suma(c, function (x) { return x.totales.consumo; }) / c.length) : 0;
        }
      },
      {
        titulo: 'Food cost real (30 días)', tipo: 'porcentaje', roles: ['admin', 'gerente', 'cocina', 'auditor'],
        calcular: function (ctx) {
          var c = comandasServidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), costo = ctx.suma(c, function (x) { return x.totales.costo; }), neto = ctx.suma(c, function (x) { return sinIgv(x.totales.consumo, ctx); });
          return ctx.redondear(pct(costo, neto));
        }
      },
      {
        titulo: 'Comandas por cobrar', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('comandas', function (c) { return c.estado === 'Servida'; }).length; }
      },
      {
        titulo: 'Insumos bajo el mínimo', tipo: 'entero', roles: ['admin', 'gerente', 'cocina', 'auditor'],
        calcular: function (ctx) { return ctx.datos.listar('insumos', insumoBajo).length; }
      },
      {
        titulo: 'Propinas de los últimos 30 días', tipo: 'moneda', roles: ['admin', 'gerente', 'mozo', 'cajero', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(comandasServidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (c) { return c.totales.propina; }));
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Ventas de los últimos 6 meses (consumo y servicio)', tipo: 'columnas', formato: 'moneda',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), c = comandasServidas(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(c, function (x) { return ctx.mes(x.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(ctx.redondear(ctx.suma(g[meses[i]] || [], function (x) { return x.totales.consumo + x.totales.servicio; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      platos: armarPlatos(),
      insumos: armarInsumos(),
      recetas: armarRecetas(),
      mesas: armarMesas(),
      personal: armarPersonal(),
      comandas: armarComandas(),
      cierres: armarCierres()
    }
  };
})();
