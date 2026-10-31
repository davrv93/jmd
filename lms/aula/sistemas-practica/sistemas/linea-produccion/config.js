/*
 * Manufacturas Altiplano · Cadena de producción (Juliaca, Puno)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «linea-produccion». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC y DNI de ejemplo) y no corresponden a personas
 * ni empresas reales. Todo el código es ES5 (sin flechas, let, const ni plantillas).
 *
 * Idea del negocio: una fábrica de prendas y mantas de alpaca y lana. Cada producto
 * tiene una lista de materiales (BOM); las órdenes de producción reservan insumos
 * y los registros de producción por turno miden la eficiencia de cada línea (OEE).
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

  /* Porcentaje seguro: parte / todo × 100 (0 si el todo es 0). */
  function pct(parte, todo) { return todo > 0 ? parte / todo * 100 : 0; }

  /* Costo de materiales de UNA unidad según la lista de materiales (BOM), con merma incluida. */
  function costoMaterialesUnidad(productoId, ctx) {
    var filas, i, ins, total = 0;
    if (!productoId) { return 0; }
    filas = ctx.datos.listar('bom', function (b) { return b.producto === productoId; });
    for (i = 0; i < filas.length; i++) {
      ins = ctx.datos.obtener('insumos', filas[i].insumo);
      if (ins) { total += filas[i].cantidad * (1 + (filas[i].mermaPct || 0) / 100) * (ins.costo || 0); }
    }
    return total;
  }

  /* Mano de obra directa de una unidad: horas de línea × operarios × tarifa por hora. */
  function manoObraUnidad(p, ctx) {
    return (p.cicloIdealMin || 0) / 60 * (p.operarios || 0) * ctx.param('tarifaHoraMod');
  }

  /* Costo estándar de una unidad = materiales (BOM) + mano de obra directa + costos indirectos sobre la mano de obra. */
  function costoEstandar(p, ctx) {
    var mod = manoObraUnidad(p, ctx);
    return ctx.redondear(costoMaterialesUnidad(p.id, ctx) + mod + mod * ctx.param('cifPct') / 100);
  }

  /* Minutos planificados por turno para el cálculo de la capacidad y el takt (según el parámetro del negocio). */
  function minutosProductivos(ctx) { return ctx.param('minutosTurno') - ctx.param('descansoMin'); }

  /* Registros de producción validados (no borradores ni anulados) dentro de un rango. */
  function registrosValidados(ctx, desde, hasta) {
    return ctx.datos.listar('registros', function (r) {
      return r.estado === 'Validado' && (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta);
    });
  }

  /* Suma las magnitudes de varios registros validados (usa los totales guardados en cada uno). */
  function acumular(regs, ctx) {
    var a = { n: regs.length, plan: 0, operativo: 0, ideal: 0, producido: 0, buenas: 0, defectuosas: 0, retrabajo: 0, parada: 0, costoReal: 0, costoEstandar: 0 }, i, r, t;
    for (i = 0; i < regs.length; i++) {
      r = regs[i];
      t = r.totales || {};
      a.plan += t.tiempoPlan || 0;
      a.operativo += t.tiempoOperativo || 0;
      a.ideal += t.tiempoIdeal || 0;
      a.producido += r.producido || 0;
      a.buenas += t.buenas || 0;
      a.defectuosas += r.defectuosas || 0;
      a.retrabajo += r.retrabajo || 0;
      a.parada += r.paradaMin || 0;
      a.costoReal += t.costoReal || 0;
      a.costoEstandar += t.total || 0;
    }
    a.disponibilidad = pct(a.operativo, a.plan);
    a.rendimiento = pct(a.ideal, a.operativo);
    a.calidad = pct(a.buenas, a.producido);
    a.oee = a.disponibilidad * a.rendimiento * a.calidad / 10000;
    a.fpy = pct(a.producido - a.defectuosas - a.retrabajo, a.producido);
    return a;
  }

  /* ¿Insumo por debajo del mínimo? */
  function insumoBajo(i) { return i.stock <= i.stockMin; }

  /* ---------- Datos de demostración ---------- */

  /* [código, nombre, unidad, costo, stock, mínimo, proveedor] */
  var INSUMOS = [
    ['HIL-ALP', 'Hilo de alpaca 2/16', 'kg', 82, 380, 120, 'Hilandería Pomacanchi S.A.C.'],
    ['HIL-BAB', 'Hilo de baby alpaca 2/28', 'kg', 118, 95, 40, 'Hilandería Pomacanchi S.A.C.'],
    ['HIL-OVE', 'Hilo de lana de oveja 2/10', 'kg', 36, 520, 150, 'Lanas del Collao E.I.R.L.'],
    ['HIL-ALG', 'Hilo de algodón peinado 30/1', 'kg', 28, 210, 60, 'Textil Algodonera Sur S.A.'],
    ['HIL-COS', 'Hilo de coser poliéster', 'cono', 5.4, 240, 80, 'Hilos y Avíos Perú S.A.C.'],
    ['BOT-MAD', 'Botón de madera 20 mm', 'unid', 0.35, 4200, 1500, 'Avíos Wanka E.I.R.L.'],
    ['CIE-MET', 'Cierre metálico 40 cm', 'unid', 3.1, 310, 200, 'Hilos y Avíos Perú S.A.C.'],
    ['ETI-MAR', 'Etiqueta tejida de marca', 'unid', 0.28, 6400, 2500, 'Etiquetas Andinas S.R.L.'],
    ['ETI-COM', 'Etiqueta de composición', 'unid', 0.12, 7100, 2500, 'Etiquetas Andinas S.R.L.'],
    ['BOL-POL', 'Bolsa de polietileno 40 x 50', 'unid', 0.18, 2900, 1200, 'Plásticos del Sur S.A.C.'],
    ['CAJ-COR', 'Caja de cartón corrugado', 'unid', 2.9, 95, 100, 'Cartones Titicaca S.A.'],
    ['SUA-TEX', 'Suavizante textil', 'litro', 9.5, 160, 50, 'Químicos Industriales Juliaca S.R.L.'],
    ['CIN-EMB', 'Cinta de embalaje', 'rollo', 4.2, 70, 30, 'Plásticos del Sur S.A.C.'],
    ['TIN-REA', 'Tinte reactivo andino', 'kg', 46, 38, 20, 'Químicos Industriales Juliaca S.R.L.'],
    ['ACE-LUB', 'Aceite lubricante para tejedoras', 'litro', 18.5, 60, 20, 'Lubricantes Altiplano S.A.C.']
  ];

  /* [código, nombre, familia, unidad, ciclo ideal (min), operarios, demanda diaria, precio, stock terminado] */
  var PRODUCTOS = [
    ['CHO-AL1', 'Chompa de alpaca cuello alto', 'Prendas', 'Unidad', 24, 3, 40, 79.9, 86],
    ['CHO-AL2', 'Chompa de alpaca con cierre', 'Prendas', 'Unidad', 28, 3, 25, 94.9, 52],
    ['CAR-ALM', 'Cardigan de alpaca para mujer', 'Prendas', 'Unidad', 26, 3, 30, 89.9, 61],
    ['PON-LAN', 'Poncho de lana de oveja', 'Prendas', 'Unidad', 22, 2, 18, 54.9, 40],
    ['BUF-ALP', 'Bufanda de alpaca', 'Accesorios', 'Unidad', 8, 2, 80, 28.9, 210],
    ['CHU-AND', 'Chullo andino con orejeras', 'Accesorios', 'Unidad', 10, 2, 70, 21.9, 185],
    ['GUA-ALP', 'Guantes de alpaca', 'Accesorios', 'Par', 12, 2, 50, 19.9, 120],
    ['MED-ALP', 'Medias de alpaca', 'Accesorios', 'Par', 6, 2, 120, 15.9, 340],
    ['FRA-ALP', 'Frazada de alpaca 2 plazas', 'Hogar', 'Unidad', 32, 4, 14, 229, 18],
    ['MAN-LAN', 'Manta de lana 1.5 plazas', 'Hogar', 'Unidad', 26, 4, 20, 129, 33],
    ['CHA-BAB', 'Chal de baby alpaca', 'Accesorios', 'Unidad', 15, 2, 30, 49.9, 74],
    ['MAN-BEB', 'Manta de bebé de algodón y alpaca', 'Hogar', 'Unidad', 14, 2, 35, 49.9, 96],
    ['ALF-LAN', 'Alfombra de lana tejida', 'Hogar', 'Unidad', 40, 4, 8, 179, 12],
    ['PUL-INF', 'Pullover infantil de algodón', 'Prendas', 'Unidad', 18, 3, 45, 42.9, 130]
  ];

  /* Lista de materiales: índice de producto (1…) → [índice de insumo (1…), cantidad por unidad, merma %] */
  var BOM = [
    [1, [[1, 0.45, 6], [8, 1, 0], [9, 1, 0], [10, 1, 0], [5, 0.04, 10], [11, 0.167, 0]]],
    [2, [[1, 0.5, 6], [7, 1, 1], [8, 1, 0], [9, 1, 0], [10, 1, 0], [5, 0.06, 10], [11, 0.167, 0]]],
    [3, [[1, 0.48, 6], [6, 6, 2], [8, 1, 0], [9, 1, 0], [10, 1, 0], [5, 0.05, 10]]],
    [4, [[3, 0.7, 5], [14, 0.02, 5], [8, 1, 0], [9, 1, 0], [10, 1, 0]]],
    [5, [[1, 0.18, 5], [8, 1, 0], [9, 1, 0], [10, 1, 0], [12, 0.01, 0]]],
    [6, [[1, 0.12, 5], [8, 1, 0], [9, 1, 0], [10, 1, 0]]],
    [7, [[1, 0.09, 6], [8, 1, 0], [9, 1, 0], [10, 1, 0]]],
    [8, [[4, 0.03, 4], [1, 0.08, 5], [9, 1, 0], [10, 1, 0]]],
    [9, [[1, 1.6, 4], [8, 1, 0], [9, 1, 0], [10, 1, 0], [11, 0.25, 0], [13, 0.05, 0]]],
    [10, [[3, 1.8, 4], [8, 1, 0], [9, 1, 0], [10, 1, 0], [13, 0.05, 0]]],
    [11, [[2, 0.22, 5], [8, 1, 0], [9, 1, 0], [10, 1, 0], [12, 0.01, 0]]],
    [12, [[4, 0.35, 4], [1, 0.2, 5], [8, 1, 0], [9, 1, 0], [10, 1, 0]]],
    [13, [[3, 2.4, 6], [14, 0.06, 5], [8, 1, 0], [10, 1, 0], [11, 0.5, 0]]],
    [14, [[4, 0.12, 5], [1, 0.16, 5], [6, 3, 2], [8, 1, 0], [9, 1, 0], [10, 1, 0]]]
  ];

  function id4(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : (n < 100 ? '00' : '0')) + n; }

  function armarInsumos() {
    var r = [], i, f;
    for (i = 0; i < INSUMOS.length; i++) {
      f = INSUMOS[i];
      r.push({ id: id4('INS', i + 1), codigo: f[0], nombre: f[1], unidad: f[2], costo: f[3], stock: f[4], stockMin: f[5], proveedor: f[6] });
    }
    return r;
  }

  function armarProductos() {
    var r = [], i, f;
    for (i = 0; i < PRODUCTOS.length; i++) {
      f = PRODUCTOS[i];
      r.push({ id: id4('PRO', i + 1), codigo: f[0], nombre: f[1], familia: f[2], unidad: f[3], cicloIdealMin: f[4], operarios: f[5], demandaDiaria: f[6], precioVenta: f[7], stock: f[8], activo: true });
    }
    return r;
  }

  function armarBom() {
    var r = [], i, j, n = 0, fila;
    for (i = 0; i < BOM.length; i++) {
      for (j = 0; j < BOM[i][1].length; j++) {
        fila = BOM[i][1][j];
        n += 1;
        r.push({ id: id4('BOM', n), producto: id4('PRO', BOM[i][0]), insumo: id4('INS', fila[0]), cantidad: fila[1], mermaPct: fila[2] });
      }
    }
    return r;
  }

  /* Fila de orden: [días atrás, producto (1…), línea (1…), cantidad, días hasta la entrega, prioridad, destino, estado] */
  var ORDENES = [
    [180, 1, 1, 60, 14, 'Normal', 'Tiendas Altiplano · Cusco', 'Terminada'],
    [174, 8, 3, 300, 10, 'Normal', 'Distribuidora Textil Sur S.A.C.', 'Terminada'],
    [168, 9, 4, 40, 18, 'Normal', 'Hoteles Sol Andino S.A.C.', 'Terminada'],
    [161, 3, 2, 60, 14, 'Alta', 'Exportadora Qori S.A.C. (Milán)', 'Terminada'],
    [155, 5, 3, 220, 8, 'Normal', 'Stock de almacén', 'Terminada'],
    [148, 11, 5, 90, 12, 'Normal', 'Tiendas Altiplano · Arequipa', 'Terminada'],
    [141, 2, 1, 50, 12, 'Normal', 'Tiendas Altiplano · Cusco', 'Terminada'],
    [135, 13, 4, 18, 20, 'Normal', 'Hoteles Sol Andino S.A.C.', 'Terminada'],
    [128, 6, 3, 260, 9, 'Alta', 'Distribuidora Textil Sur S.A.C.', 'Terminada'],
    [121, 12, 5, 110, 12, 'Normal', 'Stock de almacén', 'Terminada'],
    [114, 1, 2, 70, 12, 'Normal', 'Exportadora Qori S.A.C. (Milán)', 'Terminada'],
    [108, 10, 4, 55, 16, 'Normal', 'Distribuidora Textil Sur S.A.C.', 'Anulada'],
    [102, 14, 2, 120, 12, 'Normal', 'Tiendas Altiplano · Arequipa', 'Terminada'],
    [96, 7, 3, 180, 9, 'Normal', 'Stock de almacén', 'Terminada'],
    [89, 4, 1, 75, 10, 'Normal', 'Tiendas Altiplano · Cusco', 'Terminada'],
    [84, 9, 4, 35, 18, 'Alta', 'Hoteles Sol Andino S.A.C.', 'Terminada'],
    [78, 3, 1, 60, 14, 'Normal', 'Exportadora Qori S.A.C. (Milán)', 'Terminada'],
    [72, 8, 3, 280, 10, 'Normal', 'Distribuidora Textil Sur S.A.C.', 'Terminada'],
    [66, 11, 5, 120, 12, 'Normal', 'Tiendas Altiplano · Arequipa', 'Terminada'],
    [60, 1, 2, 70, 12, 'Urgente', 'Exportadora Qori S.A.C. (Milán)', 'Terminada'],
    [54, 5, 3, 150, 8, 'Normal', 'Stock de almacén', 'Terminada'],
    [48, 13, 4, 22, 20, 'Normal', 'Hoteles Sol Andino S.A.C.', 'Terminada'],
    [43, 12, 5, 100, 12, 'Normal', 'Tiendas Altiplano · Cusco', 'Terminada'],
    [38, 2, 1, 100, 12, 'Normal', 'Tiendas Altiplano · Arequipa', 'Terminada'],
    [33, 14, 2, 110, 12, 'Normal', 'Distribuidora Textil Sur S.A.C.', 'Anulada'],
    [30, 14, 2, 55, 10, 'Normal', 'Tiendas Altiplano · Arequipa', 'Terminada'],
    [28, 6, 3, 120, 9, 'Alta', 'Distribuidora Textil Sur S.A.C.', 'Terminada'],
    [22, 10, 4, 42, 16, 'Normal', 'Hoteles Sol Andino S.A.C.', 'Terminada'],
    [16, 3, 1, 50, 12, 'Normal', 'Tiendas Altiplano · Cusco', 'En proceso'],
    [11, 7, 3, 130, 9, 'Normal', 'Stock de almacén', 'En proceso'],
    [7, 1, 2, 40, 12, 'Alta', 'Exportadora Qori S.A.C. (Milán)', 'Liberada'],
    [4, 8, 3, 60, 10, 'Normal', 'Distribuidora Textil Sur S.A.C.', 'Liberada'],
    [2, 11, 5, 95, 12, 'Normal', 'Tiendas Altiplano · Arequipa', 'Planificada'],
    [1, 9, 4, 30, 20, 'Normal', 'Hoteles Sol Andino S.A.C.', 'Planificada'],
    [0, 12, 5, 110, 14, 'Normal', 'Stock de almacén', 'Planificada']
  ];

  function armarOrdenes() {
    var r = [], i, f;
    for (i = 0; i < ORDENES.length; i++) {
      f = ORDENES[i];
      r.push({
        id: id4('OPR', i + 1), fecha: '@-' + f[0], producto: id4('PRO', f[1]), linea: id4('LIN', f[2]), cantidad: f[3],
        fechaEntrega: '@' + (f[4] - f[0]), prioridad: f[5], destino: f[6], estado: f[7]
      });
    }
    return r;
  }

  /* Combinaciones línea-producto con su perfil: [línea, producto, % de rendimiento base, minutos de parada promedio, % defectos base, causas probables] */
  var COMBOS = [
    [1, 1, 0.9, 24, 1.4, ['Cambio de formato', 'Falta de material']],
    [1, 2, 0.88, 28, 1.6, ['Cambio de formato', 'Ajuste de calidad']],
    [1, 3, 0.9, 22, 1.5, ['Cambio de formato', 'Falta de material']],
    [1, 4, 0.92, 20, 1.2, ['Falta de material']],
    [2, 1, 0.82, 42, 2.4, ['Falla de máquina', 'Cambio de formato']],
    [2, 3, 0.8, 46, 2.6, ['Falla de máquina', 'Ajuste de calidad']],
    [2, 14, 0.84, 38, 2.2, ['Falla de máquina', 'Falta de personal']],
    [2, 2, 0.8, 44, 2.5, ['Falla de máquina', 'Cambio de formato']],
    [3, 5, 0.76, 66, 3.4, ['Cambio de formato', 'Falla de máquina', 'Falta de material']],
    [3, 6, 0.74, 70, 3.6, ['Cambio de formato', 'Falta de personal']],
    [3, 7, 0.75, 62, 3.2, ['Cambio de formato', 'Falla de máquina']],
    [3, 8, 0.78, 58, 3, ['Cambio de formato', 'Corte de energía']],
    [4, 9, 0.7, 92, 4, ['Falla de máquina', 'Mantenimiento preventivo', 'Falta de material']],
    [4, 10, 0.72, 88, 3.8, ['Falla de máquina', 'Corte de energía']],
    [4, 13, 0.68, 96, 4.2, ['Falla de máquina', 'Mantenimiento preventivo']],
    [5, 11, 0.86, 34, 2, ['Falta de personal', 'Cambio de formato']],
    [5, 12, 0.85, 36, 2.1, ['Falta de material', 'Cambio de formato']]
  ];

  var SUPERVISORES = ['Julio Mamani Ccori', 'Rosa Apaza Cutipa', 'Hilda Quispe Maquera'];
  var TURNOS = ['Mañana', 'Tarde', 'Mañana', 'Tarde', 'Noche'];

  /* Generador determinista (misma secuencia siempre): los registros de demostración no cambian entre cargas. */
  function armarRegistros() {
    var r = [], semilla = 20260, i, c, dias, plan = 450, parada, operativo, producido, defectos, retrab, causa, azar, turno, n = 150, estado, ciclo;
    azar = function () { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
    for (i = 0; i < n; i++) {
      c = COMBOS[(i * 7 + Math.floor(i / 4)) % COMBOS.length];
      dias = 190 - Math.round(i * 1.26);
      if (dias < 0) { dias = 0; }
      ciclo = PRODUCTOS[c[1] - 1][4];
      parada = Math.round(c[3] * (0.3 + azar() * 1.4));
      if (parada < 6) { parada = 0; }
      causa = parada >= 5 ? c[5][Math.floor(azar() * c[5].length)] : undefined;
      operativo = plan - parada;
      producido = Math.max(5, Math.round(operativo / ciclo * (c[2] - 0.08 + azar() * 0.14)));
      defectos = Math.round(producido * c[4] / 100 * (0.4 + azar() * 1.3));
      retrab = Math.round(producido * (c[4] + 1.5) / 100 * (0.4 + azar() * 1.3));
      turno = TURNOS[Math.floor(azar() * TURNOS.length)];
      estado = 'Validado';
      if (i === n - 1 || i === n - 2) { estado = 'Borrador'; }
      if (i === 31 || i === 97) { estado = 'Anulado'; }
      r.push({
        id: id4('RPT', i + 1), fecha: '@-' + dias, turno: turno, linea: id4('LIN', c[0]), producto: id4('PRO', c[1]),
        producido: producido, defectuosas: defectos, retrabajo: retrab, paradaMin: parada, causaParada: causa,
        responsable: SUPERVISORES[i % SUPERVISORES.length], estado: estado
      });
      if (causa === undefined) { delete r[r.length - 1].causaParada; }
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'linea-produccion',
    nombre: 'Manufacturas Altiplano · Producción',
    rubro: 'Cadena de producción textil',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#1f5f5b', acento: '#e0a526', siglas: 'MA' },

    parametros: [
      { id: 'minutosTurno', etiqueta: 'Minutos por turno', tipo: 'entero', min: 120, max: 720, valor: 480, ayuda: 'Duración bruta de un turno de trabajo (8 horas). Se usa para la capacidad y el takt time.' },
      { id: 'descansoMin', etiqueta: 'Descanso no productivo por turno (min)', tipo: 'entero', min: 0, max: 120, valor: 30, ayuda: 'Refrigerio y cambio de guardia: no cuenta como tiempo planificado de producción.' },
      { id: 'turnosDia', etiqueta: 'Turnos por día', tipo: 'entero', min: 1, max: 3, valor: 2, ayuda: 'Cuántos turnos trabaja la planta al día (para el takt time).' },
      { id: 'tarifaHoraMod', etiqueta: 'Tarifa de mano de obra directa (S/ por hora)', tipo: 'moneda', min: 0, max: 200, valor: 8.5, ayuda: 'Costo hora cargado de un operario, para el costo estándar y el real.' },
      { id: 'cifPct', etiqueta: 'Costos indirectos sobre la mano de obra', tipo: 'porcentaje', valor: 35, ayuda: 'Energía, depreciación y supervisión repartidas sobre la mano de obra directa.' },
      { id: 'metaOee', etiqueta: 'Meta de OEE de la planta', tipo: 'porcentaje', min: 1, max: 100, valor: 65, ayuda: 'Valor de referencia para estimar los turnos que necesita una orden y comparar las líneas.' },
      { id: 'metaFpy', etiqueta: 'Meta de rendimiento a la primera', tipo: 'porcentaje', valor: 92, ayuda: 'Por debajo de esta cifra el indicador de calidad se considera deficiente.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: false,
      confirmarEliminar: false,
      exigirCambioClave: true,
      ayudaLogin: false,
      exportaRespetaPermisos: true,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador del sistema', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros de la planta.' },
      { id: 'gerente', nombre: 'Gerente de planta', descripcion: 'Define productos y listas de materiales, libera y anula órdenes y ve todos los reportes, incluidos los costos.' },
      { id: 'supervisor', nombre: 'Supervisor de producción', descripcion: 'Programa y libera órdenes, registra y valida la producción de los turnos y corrige existencias de insumos. No ve costos.' },
      { id: 'operador', nombre: 'Operador de línea', descripcion: 'Captura los registros de producción de su turno y consulta órdenes, productos y líneas. No emite ni ve costos.' },
      { id: 'calidad', nombre: 'Control de calidad', descripcion: 'Valida los registros de producción (lo que mueve el producto terminado) y consulta defectos, productos y listas de materiales.' },
      { id: 'mantenimiento', nombre: 'Técnico de mantenimiento', descripcion: 'Actualiza el estado y el próximo mantenimiento de las líneas y consulta el reporte de paradas por causa.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    permisosSistema: {
      bitacora: ['admin', 'gerente', 'auditor']
    },

    usuarios: [
      { usuario: 'admin', nombre: 'Marco Calla Quispe', rol: 'admin', clave: 'Admin#2026p' },
      { usuario: 'gerente', nombre: 'Lucía Apaza Flores', rol: 'gerente', clave: 'Gerente#2026p' },
      { usuario: 'supervisor', nombre: 'Julio Mamani Ccori', rol: 'supervisor', clave: 'Super#2026p' },
      { usuario: 'operador', nombre: 'Nelly Condori Huanca', rol: 'operador', clave: 'Opera#2026p' },
      { usuario: 'calidad', nombre: 'Ernesto Villca Choque', rol: 'calidad', clave: 'Calidad#2026p' },
      { usuario: 'mantenimiento', nombre: 'Walter Ticona Pari', rol: 'mantenimiento', clave: 'Mantto#2026p' },
      { usuario: 'auditor', nombre: 'Silvia Roque Turpo', rol: 'auditor', clave: 'Audita#2026p' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'productos', nombre: 'Producto', plural: 'Productos', prefijo: 'PRO',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del producto', tipo: 'texto', requerido: true, max: 80 },
          { id: 'familia', etiqueta: 'Familia', tipo: 'lista', requerido: true, opciones: ['Prendas', 'Accesorios', 'Hogar'] },
          { id: 'unidad', etiqueta: 'Unidad de medida', tipo: 'lista', requerido: true, opciones: ['Unidad', 'Par'], defecto: 'Unidad' },
          { id: 'cicloIdealMin', etiqueta: 'Tiempo de ciclo ideal (min por unidad)', tipo: 'numero', min: 0.5, max: 240, requerido: true, ayuda: 'Minutos que tarda la línea en producir una unidad a ritmo ideal, sin paradas.' },
          { id: 'operarios', etiqueta: 'Operarios por línea', tipo: 'entero', min: 1, max: 12, requerido: true, defecto: 2, ayuda: 'Dotación estándar que atiende la línea para este producto.' },
          { id: 'demandaDiaria', etiqueta: 'Demanda diaria (unidades)', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'Unidades que el mercado pide por día; con ella se calcula el takt time.' },
          { id: 'precioVenta', etiqueta: 'Precio de venta (sin IGV)', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'gerente', 'auditor'] },
          { id: 'stock', etiqueta: 'Stock de producto terminado', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'Sube al validar un registro de producción y baja al anularlo.' },
          { id: 'activo', etiqueta: 'Producto activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'familia', 'cicloIdealMin', 'costoEstandar', 'taktMin', 'stock'],
        buscar: ['codigo', 'nombre', 'familia'],
        calculados: [
          {
            id: 'costoMateriales', etiqueta: 'Costo de materiales (BOM)', tipo: 'moneda', ver: ['admin', 'gerente', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(costoMaterialesUnidad(r.id, ctx)); }
          },
          {
            id: 'costoEstandar', etiqueta: 'Costo estándar por unidad', tipo: 'moneda', ver: ['admin', 'gerente', 'auditor'],
            formula: function (r, ctx) { return costoEstandar(r, ctx); }
          },
          {
            id: 'margen', etiqueta: 'Margen sobre el precio', tipo: 'porcentaje', ver: ['admin', 'gerente', 'auditor'],
            formula: function (r, ctx) { return r.precioVenta > 0 ? ctx.redondear((r.precioVenta - costoEstandar(r, ctx)) / r.precioVenta * 100) : null; }
          },
          {
            id: 'taktMin', etiqueta: 'Takt time (min por unidad)', tipo: 'numero',
            formula: function (r, ctx) {
              var disponible = minutosProductivos(ctx) * ctx.param('turnosDia');
              return r.demandaDiaria > 0 ? ctx.redondear(disponible / r.demandaDiaria) : null;
            }
          },
          {
            id: 'lineasNecesarias', etiqueta: 'Líneas necesarias para la demanda', tipo: 'entero',
            formula: function (r, ctx) {
              var util = minutosProductivos(ctx) * ctx.param('turnosDia') * ctx.param('metaOee') / 100;
              if (!(r.demandaDiaria > 0) || !(util > 0)) { return 0; }
              return Math.ceil(r.demandaDiaria * r.cicloIdealMin / util - 1e-9);
            }
          }
        ],
        reglas: [
          {
            id: 'precio-cubre-costo', mensaje: 'El precio de venta no puede ser menor al costo estándar.',
            validar: function (r, ctx) { return !(r.precioVenta !== undefined && r.precioVenta < costoEstandar(r, ctx)); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'supervisor', 'operador', 'calidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'insumos', nombre: 'Insumo', plural: 'Insumos', prefijo: 'INS',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del insumo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'unidad', etiqueta: 'Unidad de medida', tipo: 'lista', requerido: true, opciones: ['kg', 'unid', 'cono', 'litro', 'rollo'] },
          { id: 'costo', etiqueta: 'Costo por unidad', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'gerente', 'auditor'] },
          { id: 'stock', etiqueta: 'Stock actual', tipo: 'numero', min: 0, requerido: true, defecto: 0, ayuda: 'Baja al liberar una orden de producción y sube al anularla.' },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'numero', min: 0, requerido: true, defecto: 0, ayuda: 'Por debajo de esta cantidad el insumo aparece como bajo el mínimo.' },
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
            id: 'valorStock', etiqueta: 'Valor en stock', tipo: 'moneda', ver: ['admin', 'gerente', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear((r.costo || 0) * (r.stock || 0)); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'supervisor', 'calidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente', 'supervisor'], eliminar: ['admin'] }
      },
      {
        id: 'bom', nombre: 'Material de la lista (BOM)', plural: 'Lista de materiales (BOM)', prefijo: 'BOM',
        campos: [
          { id: 'producto', etiqueta: 'Producto', tipo: 'ref', entidad: 'productos', mostrar: 'nombre', requerido: true },
          { id: 'insumo', etiqueta: 'Insumo', tipo: 'ref', entidad: 'insumos', mostrar: 'nombre', requerido: true },
          { id: 'cantidad', etiqueta: 'Cantidad por unidad', tipo: 'numero', min: 0.001, max: 50, requerido: true, ayuda: 'En la unidad de medida del insumo, por cada unidad de producto terminado.' },
          { id: 'mermaPct', etiqueta: 'Merma %', tipo: 'porcentaje', min: 0, max: 30, defecto: 0, ayuda: 'Porcentaje que se pierde en el proceso y hay que reponer.' }
        ],
        lista: ['producto', 'insumo', 'cantidad', 'mermaPct', 'costoLinea'],
        buscar: ['producto', 'insumo'],
        calculados: [
          {
            id: 'costoLinea', etiqueta: 'Costo por unidad de producto', tipo: 'moneda', ver: ['admin', 'gerente', 'auditor'],
            formula: function (r, ctx) {
              var ins = ctx.datos.obtener('insumos', r.insumo);
              return ins ? ctx.redondear(r.cantidad * (1 + (r.mermaPct || 0) / 100) * (ins.costo || 0)) : 0;
            }
          }
        ],
        reglas: [
          {
            id: 'insumo-no-repetido', mensaje: 'Ese insumo ya está en la lista de materiales del producto: edita la fila existente.',
            validar: function (r, ctx) {
              var otros = ctx.datos.listar('bom', function (b) { return b.producto === r.producto && b.insumo === r.insumo && b.id !== r.id; });
              return otros.length === 0;
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'supervisor', 'calidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente', 'calidad'], eliminar: ['admin'] }
      },
      {
        id: 'lineas', nombre: 'Línea de producción', plural: 'Líneas de producción', prefijo: 'LIN',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 12, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre de la línea', tipo: 'texto', requerido: true, max: 60 },
          { id: 'tipoProducto', etiqueta: 'Producto que fabrica', tipo: 'lista', requerido: true, opciones: ['Prendas', 'Accesorios', 'Hogar'] },
          { id: 'maquinas', etiqueta: 'Estaciones o máquinas', tipo: 'entero', min: 1, max: 40, requerido: true, defecto: 1 },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', requerido: true, opciones: ['Operativa', 'En mantenimiento', 'Detenida'], defecto: 'Operativa' },
          { id: 'proximoMantenimiento', etiqueta: 'Próximo mantenimiento preventivo', tipo: 'fecha' },
          { id: 'responsable', etiqueta: 'Jefe de línea', tipo: 'texto', max: 60 }
        ],
        lista: ['codigo', 'nombre', 'tipoProducto', 'maquinas', 'estado', 'alertaMantenimiento'],
        buscar: ['codigo', 'nombre', 'responsable'],
        calculados: [
          {
            id: 'diasMantenimiento', etiqueta: 'Días al próximo mantenimiento', tipo: 'entero',
            formula: function (r, ctx) { return r.proximoMantenimiento ? ctx.diasEntre(ctx.hoy(), r.proximoMantenimiento) : null; }
          },
          {
            id: 'alertaMantenimiento', etiqueta: 'Alerta de mantenimiento', tipo: 'texto',
            formula: function (r, ctx) {
              var d;
              if (!r.proximoMantenimiento) { return 'Sin programar'; }
              d = ctx.diasEntre(ctx.hoy(), r.proximoMantenimiento);
              return d < 0 ? 'Vencido' : (d <= 15 ? 'Próximo' : 'Al día');
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'supervisor', 'operador', 'calidad', 'mantenimiento', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente', 'mantenimiento'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'ordenes', nombre: 'Orden de producción', plural: 'Órdenes de producción', prefijo: 'OPR', serie: 'OP01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de inicio', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'producto', etiqueta: 'Producto', tipo: 'ref', entidad: 'productos', mostrar: 'nombre', requerido: true },
          { id: 'linea', etiqueta: 'Línea de producción', tipo: 'ref', entidad: 'lineas', mostrar: 'nombre', requerido: true },
          { id: 'cantidad', etiqueta: 'Cantidad a producir', tipo: 'entero', min: 1, requerido: true, defecto: 1 },
          { id: 'fechaEntrega', etiqueta: 'Fecha de entrega', tipo: 'fecha', requerido: true },
          { id: 'prioridad', etiqueta: 'Prioridad', tipo: 'lista', requerido: true, opciones: ['Normal', 'Alta', 'Urgente'], defecto: 'Normal' },
          { id: 'destino', etiqueta: 'Cliente o destino', tipo: 'texto', max: 60 }
        ],
        lista: ['fecha', 'producto', 'linea', 'cantidad'],
        estados: ['Planificada', 'Liberada', 'En proceso', 'Terminada', 'Anulada'],
        calcular: function (doc, ctx) {
          var p = doc.producto ? ctx.datos.obtener('productos', doc.producto) : null, cant = doc.cantidad || 0, meta = ctx.param('metaOee') / 100, util = minutosProductivos(ctx), horas, turnos;
          if (!p) { return { costoMateriales: 0, horasEstimadas: 0, turnosEstimados: 0, total: 0 }; }
          /* Horas de línea al ritmo ideal, corregidas por la meta de OEE (no se produce al 100 % del tiempo). */
          horas = meta > 0 ? cant * p.cicloIdealMin / 60 / meta : 0;
          turnos = util > 0 ? horas * 60 / util : 0;
          return {
            costoMateriales: ctx.redondear(costoMaterialesUnidad(p.id, ctx) * cant),
            horasEstimadas: ctx.redondear(horas),
            turnosEstimados: ctx.redondear(turnos),
            total: ctx.redondear(costoEstandar(p, ctx) * cant)
          };
        },
        totales: [
          { id: 'costoMateriales', etiqueta: 'Materiales según BOM' },
          { id: 'horasEstimadas', etiqueta: 'Horas de línea estimadas', tipo: 'numero' },
          { id: 'turnosEstimados', etiqueta: 'Turnos estimados', tipo: 'numero' },
          { id: 'total', etiqueta: 'Costo estándar de la orden', fuerte: true }
        ],
        reglas: [
          {
            id: 'entrega-posterior', mensaje: 'La fecha de entrega no puede ser anterior a la fecha de inicio.',
            validar: function (d) { return !(d.fecha && d.fechaEntrega && d.fechaEntrega < d.fecha); }
          }
        ],
        alEmitir: function (doc, ctx) {
          var lin = ctx.datos.obtener('lineas', doc.linea), filas, i, ins, necesidades = [], need;
          if (!lin || lin.estado !== 'Operativa') { throw new Error('La línea «' + (lin ? lin.nombre : doc.linea) + '» no está operativa (' + (lin ? lin.estado : 'no existe') + '). Elige otra o espera su mantenimiento.'); }
          filas = ctx.datos.listar('bom', function (b) { return b.producto === doc.producto; });
          if (!filas.length) { throw new Error('El producto no tiene lista de materiales (BOM): no se puede liberar la orden.'); }
          for (i = 0; i < filas.length; i++) {
            ins = ctx.datos.obtener('insumos', filas[i].insumo);
            need = ctx.redondear(doc.cantidad * filas[i].cantidad * (1 + (filas[i].mermaPct || 0) / 100));
            if (ins.stock < need) { throw new Error('Falta «' + ins.nombre + '»: la orden necesita ' + need + ' ' + ins.unidad + ' y hay ' + ins.stock + '.'); }
            necesidades.push({ id: ins.id, stock: ins.stock, need: need });
          }
          for (i = 0; i < necesidades.length; i++) {
            ctx.datos.actualizar('insumos', necesidades[i].id, { stock: ctx.redondear(necesidades[i].stock - necesidades[i].need) });
          }
        },
        alAnular: function (doc, ctx) {
          var filas = ctx.datos.listar('bom', function (b) { return b.producto === doc.producto; }), i, ins;
          for (i = 0; i < filas.length; i++) {
            ins = ctx.datos.obtener('insumos', filas[i].insumo);
            if (ins) {
              ctx.datos.actualizar('insumos', ins.id, { stock: ctx.redondear(ins.stock + doc.cantidad * filas[i].cantidad * (1 + (filas[i].mermaPct || 0) / 100)) });
            }
          }
        },
        permisos: {
          ver: ['admin', 'gerente', 'supervisor', 'operador', 'calidad', 'mantenimiento', 'auditor'],
          crear: ['admin', 'gerente', 'supervisor'], editar: ['admin', 'gerente', 'supervisor'], emitir: ['admin', 'gerente', 'supervisor'], anular: ['admin', 'gerente'],
          eliminar: ['admin', 'supervisor']
        }
      },
      {
        id: 'registros', nombre: 'Registro de producción', plural: 'Registros de producción', prefijo: 'RPT', serie: 'RT01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha del turno', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'turno', etiqueta: 'Turno', tipo: 'lista', requerido: true, opciones: ['Mañana', 'Tarde', 'Noche'], defecto: 'Mañana' },
          { id: 'linea', etiqueta: 'Línea de producción', tipo: 'ref', entidad: 'lineas', mostrar: 'nombre', requerido: true },
          { id: 'producto', etiqueta: 'Producto fabricado', tipo: 'ref', entidad: 'productos', mostrar: 'nombre', requerido: true },
          { id: 'producido', etiqueta: 'Unidades producidas', tipo: 'entero', min: 5, requerido: true, ayuda: 'Total que salió de la línea en el turno, buenas y defectuosas.' },
          { id: 'defectuosas', etiqueta: 'Unidades defectuosas (desecho)', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'No recuperables: se pierden.' },
          { id: 'retrabajo', etiqueta: 'Unidades a retrabajo', tipo: 'entero', min: 0, requerido: true, defecto: 0, ayuda: 'Salieron mal a la primera pero se recuperan; no cuentan en el rendimiento a la primera.' },
          { id: 'paradaMin', etiqueta: 'Minutos de parada', tipo: 'entero', min: 0, max: 480, requerido: true, defecto: 0 },
          { id: 'causaParada', etiqueta: 'Causa principal de la parada', tipo: 'lista', opciones: ['Falla de máquina', 'Cambio de formato', 'Falta de material', 'Falta de personal', 'Ajuste de calidad', 'Mantenimiento preventivo', 'Corte de energía'] },
          { id: 'responsable', etiqueta: 'Supervisor del turno', tipo: 'texto', max: 60 }
        ],
        lista: ['fecha', 'turno', 'linea', 'producido'],
        estados: ['Borrador', 'Validado', 'Anulado'],
        calcular: function (doc, ctx) {
          var p = doc.producto ? ctx.datos.obtener('productos', doc.producto) : null, producido = doc.producido || 0, defect = doc.defectuosas || 0, retr = doc.retrabajo || 0;
          var plan = 480 - ctx.param('descansoMin'), parada = Math.min(doc.paradaMin || 0, plan), operativo = plan - parada, ciclo = p ? p.cicloIdealMin : 0;
          var ideal = Math.min(producido * ciclo, operativo), buenas = Math.max(producido - defect, 0);
          var disp = pct(operativo, plan), rend = pct(ideal, operativo), cal = pct(buenas, producido), mod, matUnit, costoReal;
          mod = p ? plan / 60 * p.operarios * ctx.param('tarifaHoraMod') : 0;
          matUnit = p ? costoMaterialesUnidad(p.id, ctx) : 0;
          costoReal = producido * matUnit + mod + mod * ctx.param('cifPct') / 100;
          return {
            disponibilidad: disp, rendimiento: rend, calidad: cal, oee: disp * rend * cal / 10000, fpy: pct(producido - defect - retr, producido),
            tiempoPlan: plan, tiempoOperativo: operativo, tiempoIdeal: ideal, buenas: buenas, costoReal: costoReal,
            total: p ? buenas * costoEstandar(p, ctx) : 0
          };
        },
        totales: [
          { id: 'disponibilidad', etiqueta: 'Disponibilidad', tipo: 'porcentaje' },
          { id: 'rendimiento', etiqueta: 'Rendimiento', tipo: 'porcentaje' },
          { id: 'calidad', etiqueta: 'Calidad', tipo: 'porcentaje' },
          { id: 'oee', etiqueta: 'OEE del turno', tipo: 'porcentaje', fuerte: true },
          { id: 'fpy', etiqueta: 'Rendimiento a la primera (FPY)', tipo: 'porcentaje' },
          { id: 'total', etiqueta: 'Costo estándar de lo producido' }
        ],
        reglas: [
          {
            id: 'defectos-no-exceden', mensaje: 'Las unidades defectuosas y a retrabajo no pueden superar lo producido.',
            validar: function (d) { return (d.defectuosas || 0) + (d.retrabajo || 0) <= (d.producido || 0); }
          },
          {
            id: 'parada-en-turno', mensaje: 'Los minutos de parada no pueden superar el tiempo planificado del turno.',
            validar: function (d, ctx) { return (d.paradaMin || 0) <= ctx.param('minutosTurno') - ctx.param('descansoMin'); }
          },
          {
            id: 'parada-con-causa', mensaje: 'Toda parada de 5 minutos o más debe indicar su causa principal.',
            validar: function (d) { return !((d.paradaMin || 0) >= 5 && !d.causaParada); }
          }
        ],
        alEmitir: function (doc, ctx) {
          var p = ctx.datos.obtener('productos', doc.producto), buenas = Math.max((doc.producido || 0) - (doc.defectuosas || 0), 0);
          ctx.datos.actualizar('productos', p.id, { stock: p.stock + buenas });
        },
        alAnular: function (doc, ctx) {
          var p = ctx.datos.obtener('productos', doc.producto), buenas = Math.max((doc.producido || 0) - (doc.defectuosas || 0), 0);
          if (p.stock < buenas) { throw new Error('No se puede anular: de este registro ya salieron del almacén ' + (buenas - p.stock) + ' unidades de «' + p.nombre + '».'); }
          ctx.datos.actualizar('productos', p.id, { stock: p.stock - buenas });
        },
        permisos: {
          ver: ['admin', 'gerente', 'supervisor', 'operador', 'calidad', 'mantenimiento', 'auditor'],
          crear: ['admin', 'supervisor', 'operador'], editar: ['admin', 'supervisor', 'operador'], emitir: ['admin', 'supervisor', 'calidad'], anular: ['admin', 'gerente'],
          eliminar: ['admin', 'supervisor']
        }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'oee-linea', titulo: 'OEE por línea',
        descripcion: 'Disponibilidad × rendimiento × calidad de cada línea con los turnos validados del periodo, comparado con la meta de OEE de la planta.',
        roles: ['admin', 'gerente', 'supervisor', 'calidad', 'mantenimiento', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var regs = registrosValidados(ctx, p.desde, p.hasta), lineas = ctx.datos.listar('lineas'), filas = [], etiquetas = [], valores = [], i, a, meta = ctx.param('metaOee'), total = acumular(regs, ctx);
          for (i = 0; i < lineas.length; i++) {
            a = acumular(regs.filter(function (r) { return r.linea === lineas[i].id; }), ctx);
            if (!a.n) { continue; }
            filas.push([lineas[i].nombre, a.n, a.producido, a.buenas, ctx.redondear(a.disponibilidad), ctx.redondear(a.rendimiento), ctx.redondear(a.calidad), ctx.redondear(a.oee), ctx.redondear(a.oee - meta)]);
          }
          filas.sort(function (x, y) { return y[7] - x[7]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][7]); }
          return {
            columnas: ['Línea', 'Turnos', 'Producidas', 'Buenas', 'Disponibilidad %', 'Rendimiento %', 'Calidad %', 'OEE %', 'Frente a la meta (pts)'],
            tipos: ['texto', 'entero', 'entero', 'entero', 'porcentaje', 'porcentaje', 'porcentaje', 'porcentaje', 'numero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'OEE de la planta', valor: ctx.redondear(total.oee), tipo: 'porcentaje' },
              { etiqueta: 'Meta de OEE', valor: meta, tipo: 'porcentaje' },
              { etiqueta: 'Turnos validados', valor: total.n, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'defectos-producto', titulo: 'Defectos por producto',
        descripcion: 'Unidades defectuosas y a retrabajo por producto, porcentaje de defecto y rendimiento a la primera (FPY), con el costo estándar de lo desechado.',
        roles: ['admin', 'gerente', 'supervisor', 'calidad', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var regs = registrosValidados(ctx, p.desde, p.hasta), grupos = ctx.agrupar(regs, function (r) { return r.producto; }), filas = [], etiquetas = [], valores = [], k, prod, a, costoDesecho = 0, desecho, tot = acumular(regs, ctx), meta = ctx.param('metaFpy');
          for (k in grupos) {
            if (!grupos.hasOwnProperty(k)) { continue; }
            prod = ctx.datos.obtener('productos', k);
            a = acumular(grupos[k], ctx);
            desecho = prod ? ctx.redondear(a.defectuosas * costoEstandar(prod, ctx)) : 0;
            costoDesecho += desecho;
            filas.push([prod ? prod.nombre : k, a.producido, a.defectuosas, a.retrabajo, ctx.redondear(pct(a.defectuosas, a.producido)), ctx.redondear(a.fpy), desecho]);
          }
          filas.sort(function (x, y) { return y[4] - x[4]; });
          for (k = 0; k < filas.length; k++) { etiquetas.push(filas[k][0]); valores.push(filas[k][4]); }
          return {
            columnas: ['Producto', 'Producidas', 'Defectuosas', 'A retrabajo', '% defecto', 'FPY %', 'Costo del desecho'],
            tipos: ['texto', 'entero', 'entero', 'entero', 'porcentaje', 'porcentaje', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'FPY de la planta', valor: ctx.redondear(tot.fpy), tipo: 'porcentaje' },
              { etiqueta: 'Meta de FPY', valor: meta, tipo: 'porcentaje' },
              { etiqueta: 'Costo del desecho', valor: ctx.redondear(costoDesecho), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'paradas-causa', titulo: 'Paradas por causa',
        descripcion: 'Minutos perdidos por causa, ordenados de mayor a menor con el porcentaje acumulado (Pareto). Las paradas menores de 5 minutos no se clasifican.',
        roles: ['admin', 'gerente', 'supervisor', 'mantenimiento', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var regs = registrosValidados(ctx, p.desde, p.hasta), grupos = ctx.agrupar(regs, function (r) { return r.causaParada || 'Sin clasificar (menores de 5 min)'; }), filas = [], etiquetas = [], valores = [], k, g, min, total = 0, acumulado = 0, i;
          for (k in grupos) {
            if (!grupos.hasOwnProperty(k)) { continue; }
            g = grupos[k];
            min = ctx.suma(g, function (r) { return r.paradaMin || 0; });
            if (min <= 0) { continue; }
            filas.push([k, g.length, min, 0, 0]);
            total += min;
          }
          filas.sort(function (x, y) { return y[2] - x[2]; });
          for (i = 0; i < filas.length; i++) {
            acumulado += filas[i][2];
            filas[i][3] = ctx.redondear(pct(filas[i][2], total));
            filas[i][4] = ctx.redondear(pct(acumulado, total));
            etiquetas.push(filas[i][0]);
            valores.push(filas[i][2]);
          }
          return {
            columnas: ['Causa de la parada', 'Veces', 'Minutos perdidos', '% del total', '% acumulado'],
            tipos: ['texto', 'entero', 'entero', 'porcentaje', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Minutos perdidos', valor: total, tipo: 'entero' },
              { etiqueta: 'Horas perdidas', valor: ctx.redondear(total / 60), tipo: 'numero' },
              { etiqueta: 'Causa principal', valor: filas.length ? filas[0][0] : 'Sin paradas', tipo: 'texto' }
            ]
          };
        }
      },
      {
        id: 'costo-estandar-real', titulo: 'Costo estándar vs real',
        descripcion: 'Compara, por producto, el costo estándar de las unidades buenas con el costo real del turno (materiales de todo lo producido y mano de obra de todo el tiempo planificado). La variación mide lo que cuestan las paradas y los defectos.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var regs = registrosValidados(ctx, p.desde, p.hasta), grupos = ctx.agrupar(regs, function (r) { return r.producto; }), filas = [], etiquetas = [], valores = [], k, prod, a, est, real, totEst = 0, totReal = 0;
          for (k in grupos) {
            if (!grupos.hasOwnProperty(k)) { continue; }
            prod = ctx.datos.obtener('productos', k);
            a = acumular(grupos[k], ctx);
            est = ctx.redondear(a.costoEstandar);
            real = ctx.redondear(a.costoReal);
            totEst += est;
            totReal += real;
            filas.push([prod ? prod.nombre : k, a.buenas, est, real, ctx.redondear(real - est), est > 0 ? ctx.redondear((real - est) / est * 100) : 0]);
          }
          filas.sort(function (x, y) { return y[4] - x[4]; });
          for (k = 0; k < filas.length; k++) { etiquetas.push(filas[k][0]); valores.push(filas[k][4]); }
          return {
            columnas: ['Producto', 'Unidades buenas', 'Costo estándar', 'Costo real', 'Variación', 'Variación %'],
            tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Costo estándar', valor: ctx.redondear(totEst), tipo: 'moneda' },
              { etiqueta: 'Costo real', valor: ctx.redondear(totReal), tipo: 'moneda' },
              { etiqueta: 'Variación total', valor: ctx.redondear(totReal - totEst), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'cumplimiento-plan', titulo: 'Cumplimiento del plan',
        descripcion: 'Unidades de las órdenes del periodo que ya se liberaron (sin las planificadas ni las anuladas) frente a las unidades buenas validadas en los turnos del mismo periodo, por producto.',
        roles: ['admin', 'gerente', 'supervisor', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ordenes = ctx.datos.listar('ordenes', function (o) { return o.estado !== 'Anulada' && o.estado !== 'Planificada' && o.fecha >= p.desde && o.fecha <= p.hasta; }), regs = registrosValidados(ctx, p.desde, p.hasta);
          var plan = {}, real = {}, k, filas = [], etiquetas = [], valores = [], i, prod, totPlan = 0, totReal = 0;
          for (i = 0; i < ordenes.length; i++) { plan[ordenes[i].producto] = (plan[ordenes[i].producto] || 0) + ordenes[i].cantidad; }
          for (i = 0; i < regs.length; i++) { real[regs[i].producto] = (real[regs[i].producto] || 0) + (regs[i].totales ? regs[i].totales.buenas : 0); }
          for (k in plan) {
            if (!plan.hasOwnProperty(k)) { continue; }
            prod = ctx.datos.obtener('productos', k);
            filas.push([prod ? prod.nombre : k, plan[k], real[k] || 0, (real[k] || 0) - plan[k], ctx.redondear(pct(real[k] || 0, plan[k]))]);
            totPlan += plan[k];
            totReal += real[k] || 0;
          }
          filas.sort(function (x, y) { return y[4] - x[4]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][4]); }
          return {
            columnas: ['Producto', 'Planificado', 'Producido bueno', 'Diferencia', 'Cumplimiento %'],
            tipos: ['texto', 'entero', 'entero', 'entero', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Planificado', valor: totPlan, tipo: 'entero' },
              { etiqueta: 'Producido bueno', valor: totReal, tipo: 'entero' },
              { etiqueta: 'Cumplimiento global', valor: ctx.redondear(pct(totReal, totPlan)), tipo: 'porcentaje' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'OEE de la planta (30 días)', tipo: 'porcentaje',
        calcular: function (ctx) { return ctx.redondear(acumular(registrosValidados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), ctx).oee); }
      },
      {
        titulo: 'Rendimiento a la primera (30 días)', tipo: 'porcentaje',
        calcular: function (ctx) { return ctx.redondear(acumular(registrosValidados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), ctx).fpy); }
      },
      {
        titulo: 'Unidades buenas (30 días)', tipo: 'entero',
        calcular: function (ctx) { return acumular(registrosValidados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), ctx).buenas; }
      },
      {
        titulo: 'Minutos de parada (30 días)', tipo: 'entero',
        calcular: function (ctx) { return acumular(registrosValidados(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), ctx).parada; }
      },
      {
        titulo: 'Órdenes abiertas', tipo: 'entero',
        calcular: function (ctx) {
          return ctx.datos.listar('ordenes', function (o) { return o.estado === 'Liberada' || o.estado === 'En proceso'; }).length;
        }
      },
      {
        titulo: 'Insumos bajo el mínimo', tipo: 'entero', roles: ['admin', 'gerente', 'supervisor', 'calidad', 'auditor'],
        calcular: function (ctx) { return ctx.datos.listar('insumos', insumoBajo).length; }
      }
    ],

    tableroGrafico: {
      titulo: 'OEE mensual de la planta', tipo: 'columnas', formato: 'porcentaje',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), regs = registrosValidados(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(regs, function (r) { return ctx.mes(r.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(ctx.redondear(acumular(g[meses[i]] || [], ctx).oee));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      productos: armarProductos(),
      insumos: armarInsumos(),
      bom: armarBom(),
      lineas: [
        { id: 'LIN-0001', codigo: 'LIN-A', nombre: 'Línea A · Prendas (tejido plano)', tipoProducto: 'Prendas', maquinas: 8, estado: 'Operativa', proximoMantenimiento: '@22', responsable: 'Julio Mamani Ccori' },
        { id: 'LIN-0002', codigo: 'LIN-B', nombre: 'Línea B · Prendas (tejido plano)', tipoProducto: 'Prendas', maquinas: 8, estado: 'Operativa', proximoMantenimiento: '@-6', responsable: 'Rosa Apaza Cutipa' },
        { id: 'LIN-0003', codigo: 'LIN-C', nombre: 'Línea C · Accesorios (tejido circular)', tipoProducto: 'Accesorios', maquinas: 12, estado: 'Operativa', proximoMantenimiento: '@9', responsable: 'Hilda Quispe Maquera' },
        { id: 'LIN-0004', codigo: 'LIN-D', nombre: 'Línea D · Mantas y alfombras', tipoProducto: 'Hogar', maquinas: 4, estado: 'En mantenimiento', proximoMantenimiento: '@40', responsable: 'Rosa Apaza Cutipa' },
        { id: 'LIN-0005', codigo: 'LIN-E', nombre: 'Línea E · Chales y mantas de bebé', tipoProducto: 'Accesorios', maquinas: 6, estado: 'Operativa', proximoMantenimiento: '@31', responsable: 'Julio Mamani Ccori' }
      ],
      ordenes: armarOrdenes(),
      registros: armarRegistros()
    }
  };
})();
